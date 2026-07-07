// The pixi rendering stack behind GameCanvas.vue: the Application plus the
// layered renderer set (sky, sandbox/tutorial/challenge ground, grid, the
// original Draw world sprite, water, and the gesture overlay), in the legacy
// display order. Plain TS (not a composable) — none of this is reactive; the
// per-frame render is driven by GameCanvas's ticker callback calling
// renderWorld() with the already-resolved state/camera/viewport.

import { Application, Graphics } from "pixi.js";
import type { Ref } from "vue";
import { Draw } from "../../Game/Draw";
import { JointPart } from "../../Parts/JointPart";
import type { Part } from "../../Parts/Part";
import type { CameraState } from "../../core";
import { SkyRenderer } from "./skyRenderer";
import { GroundRenderer } from "./groundRenderer";
import { TutorialGroundRenderer } from "./tutorialGroundRenderer";
import { ChallengeGroundRenderer } from "./challengeGroundRenderer";
import { GridRenderer } from "./gridRenderer";
import { WaterRenderer } from "./waterRenderer";
import type { useGameStore } from "../gameStore";
import type { useUiPrefs } from "../uiPrefs";

type GameStore = ReturnType<typeof useGameStore>;
type UiPrefs = ReturnType<typeof useUiPrefs>;
type CoreState = GameStore["state"];

export class RendererStack {
	// Public handles the pointer composable / GameCanvas game loop read live.
	app: Application | null = null;
	draw: Draw | null = null;
	// Lightweight overlay Graphics for the marquee rectangle (and the other
	// gesture previews) — kept separate from the Draw sprite so it never fights
	// Draw.ts's per-frame clear/repaint.
	overlay: Graphics | null = null;

	// The Graphics that Draw paints into (its m_sprite).
	private drawSprite: Graphics | null = null;
	// Renderer-only sky/background (gradient + clouds/stars), a faithful port of
	// Sky.ts. Mounted BEHIND the Draw sprite so the world draws over it.
	private sky: SkyRenderer | null = null;
	// Renderer-only static terrain visual (grass/dirt gradient + rocks + end-cap
	// outline circles), a faithful port of ControllerSandbox's sGround. Mounted
	// ABOVE the sky but BELOW the Draw sprite, matching the legacy display order
	// (sSky behind, sGround over it, the world/robot on top).
	private ground: GroundRenderer | null = null;
	// Renderer-only static tutorial-terrain visual (grass/dirt/rock landscape), a
	// faithful port of ControllerTutorial's sGround1/2/3. Mounted ABOVE the sandbox
	// ground but BELOW the Draw sprite. Only visible when a base-terrain tutorial
	// (Tank/Shapes/Car/Jumpbot/Dumpbot/Catapult, levelIndex 0-5) is active.
	private tutorialGround: TutorialGroundRenderer | null = null;
	private challengeGround: ChallengeGroundRenderer | null = null;
	// Renderer-only editor grid (IB3 GridControl.as port). Mounted ABOVE the
	// terrain visuals but BELOW the Draw sprite so parts render over the grid;
	// drawn only while editing with the gridEnabled pref on.
	private grid: GridRenderer | null = null;
	// Water layer (IB3 WaterControl draw port). Mounted ABOVE the Draw sprite —
	// IB3 draws the water in front of the parts (SandboxControl.Init addChild
	// order) so submerged parts show through the translucent fill.
	private water: WaterRenderer | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private tickerFn: (() => void) | null = null;

	constructor(
		private readonly game: GameStore,
		private readonly uiPrefs: UiPrefs,
		private readonly container: Ref<HTMLDivElement | null>,
	) {}

	/**
	 * Create the pixi Application inside the container, mount the layer set in
	 * display order, start the per-frame ticker (`onFrame`), and keep the
	 * renderer sized to the container. No-ops (leaving `app` null) if the
	 * component tore down while Application.init() was awaiting.
	 */
	async init(onFrame: () => void): Promise<void> {
		const container = this.container;
		if (!container.value) return;

		const w = container.value.clientWidth || 1;
		const h = container.value.clientHeight || 1;

		const localApp = new Application();
		await localApp.init({
			width: w,
			height: h,
			backgroundAlpha: 0,
			antialias: true,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true,
		});
		// The component may have been torn down while init() was awaiting.
		if (!container.value) {
			localApp.destroy(true, { children: true });
			return;
		}
		const app = localApp;
		this.app = app;

		container.value.appendChild(app.canvas as unknown as Node);
		(app.canvas as HTMLCanvasElement).style.display = "block";
		(app.canvas as HTMLCanvasElement).style.width = "100%";
		(app.canvas as HTMLCanvasElement).style.height = "100%";

		// The Graphics that Draw paints into (its m_sprite). Draw's text containers
		// attach relative to this sprite's parent, so it must live on the stage.
		// Sky/background sits at the BOTTOM of the stage so the world draws over it.
		this.sky = new SkyRenderer();
		app.stage.addChild(this.sky.view);
		// Preload cloud textures; the next drawFrame rebuilds the sky with them.
		void this.sky.preload();

		// Static terrain visual, above the sky and below the world Draw sprite.
		this.ground = new GroundRenderer();
		app.stage.addChild(this.ground.view);

		// Tutorial terrain visual, above the sandbox ground and below the world Draw
		// sprite (so the world/robot draws over it). Its view.visible is toggled per
		// frame in renderWorld based on the active tutorial level.
		this.tutorialGround = new TutorialGroundRenderer();
		app.stage.addChild(this.tutorialGround.view);

		// Built-in challenge terrain visual (Climb / Monkey Bars), same layer as the
		// tutorial ground: above the sandbox ground, below the world Draw sprite.
		this.challengeGround = new ChallengeGroundRenderer();
		app.stage.addChild(this.challengeGround.view);

		// Editor grid (IB3 GridControl.as port), above the terrain visuals and below
		// the world Draw sprite so parts render over the grid lines. Drawn per frame
		// in renderWorld, only while editing with the gridEnabled pref on.
		this.grid = new GridRenderer();
		app.stage.addChild(this.grid.view);

		this.drawSprite = new Graphics();
		app.stage.addChild(this.drawSprite);
		this.draw = new Draw();
		this.draw.m_sprite = this.drawSprite;

		// Water layer, in FRONT of the world Draw sprite (IB3 SandboxControl.Init
		// puts waterControl above the parts) and below the marquee overlay.
		this.water = new WaterRenderer();
		app.stage.addChild(this.water.view);

		// Marquee overlay lives above the Draw sprite; Draw never touches it.
		this.overlay = new Graphics();
		app.stage.addChild(this.overlay);

		this.tickerFn = onFrame;
		app.ticker.add(this.tickerFn);

		// Keep the Pixi renderer exactly the size of its container. We read the
		// container's LIVE clientWidth/clientHeight (border-box content area) rather
		// than the observer's contentRect: drawFrame derives its world transform from
		// clientWidth/clientHeight, so sizing the renderer from the same source keeps
		// the drawn world, the pointer math, and the backing store in lockstep — no
		// gray band from a renderer sized smaller than the (now full-bleed) container.
		const resizeToContainer = (): void => {
			if (!this.app || !container.value) return;
			const cw = Math.max(1, Math.floor(container.value.clientWidth));
			const ch = Math.max(1, Math.floor(container.value.clientHeight));
			if (this.app.renderer.width !== cw || this.app.renderer.height !== ch) {
				this.app.renderer.resize(cw, ch);
			}
		};
		this.resizeObserver = new ResizeObserver(() => resizeToContainer());
		this.resizeObserver.observe(container.value);
		// The container may have grown to its full-bleed size while Application.init()
		// was awaiting (the observer is only attached now, so it would otherwise miss
		// that first layout). Force one resize to the current size immediately.
		resizeToContainer();
	}

	/**
	 * Per-frame world render: point Draw's screen transform at the (possibly
	 * follow-adjusted) camera, refresh every environment layer for the current
	 * state, and paint the world through the ORIGINAL Draw renderer. Called from
	 * GameCanvas.drawFrame after it has stepped the sim / resolved interpolation.
	 */
	renderWorld(state: CoreState, camera: Readonly<CameraState>, w: number, h: number): void {
		const draw = this.draw;
		if (!draw) return;

		draw.m_drawScale = camera.scale;
		draw.m_drawXOff = camera.offsetX - w / 2;
		draw.m_drawYOff = camera.offsetY - h / 2;
		// Feed the live viewport size to Draw's on-screen culling. The base
		// b2DebugDraw hardcodes an 800x600 stage (legacy Flash), which clips every
		// shape drawn past ~800x600; Draw overrides the cull to use these instead so
		// the whole responsive canvas is drawable, not just the top-left 800x600.
		draw.m_screenWidth = w;
		draw.m_screenHeight = h;
		// View-menu flag: colourBox -> Draw.drawColours (ControllerGame.ts:590).
		draw.drawColours = state.edit.showColours;

		// Sky/background: build for the current sandbox settings (cheap no-op unless
		// they changed) then reposition/drift each frame. Cloud drift is gated on the
		// sim NOT running-paused, mirroring Sky.Update's !IsPaused() (Sky.ts:126).
		if (this.sky) {
			this.sky.build(state.sandbox);
			this.sky.update(camera, state.sandbox.bounds, w, h, state.sim.phase === "paused");
		}

		// Sandbox terrain visual (sGround port): build for the current sandbox settings
		// (cheap no-op unless terrainType/size/theme changed) then rescale/reposition to
		// the world each frame. The sandbox ground's collision bodies (isSandbox) are
		// excluded from DrawWorld below so they don't double-draw over this; CUSTOM
		// challenge/tutorial terrain (not isSandbox) IS drawn by DrawWorld.
		if (this.ground) {
			this.ground.build(state.sandbox);
			this.ground.update(camera, w, h);
		}

		// Tutorial terrain visual (sGround1/2/3 port): built once, repositioned each
		// frame. Only shown for the base-terrain tutorials — Tank/Shapes/Car/Jumpbot/
		// Dumpbot/Catapult (levelIndex 0-5, which load buildBaseTerrain via
		// getTutorialSetup in src/core/tutorials.ts). Hidden for the sandbox tutorials
		// (6-8), the challenge-editor tutorial (9), the built-in challenges (10-13),
		// and any non-tutorial session.
		if (this.tutorialGround) {
			this.tutorialGround.build();
			this.tutorialGround.update(camera, w, h);
			const tut = state.tutorial;
			this.tutorialGround.view.visible = !!tut && tut.active && tut.levelIndex >= 0 && tut.levelIndex <= 5;
		}

		// Built-in challenge terrain visual (Climb / Monkey Bars sGround port): built
		// once per active built-in (rebuilt when it changes), repositioned each frame.
		// Only shown for the two hardcoded challenges with bespoke sGround geometry;
		// Race/Spaceship draw their terrain via the sandbox GroundRenderer above.
		if (this.challengeGround) {
			const builtIn = state.challenge?.builtIn ?? null;
			this.challengeGround.build(builtIn);
			this.challengeGround.update(camera, w, h);
			this.challengeGround.view.visible = builtIn === "climb" || builtIn === "monkeyBars";
		}

		// Editor grid: redraw for the current camera each frame. Edit-mode only —
		// IB3 only ever shows the grid in the editor (GameControl.gridButton
		// :4235-4241; the sim screens never enable it).
		if (this.grid) {
			this.grid.update(
				camera,
				w,
				h,
				this.uiPrefs.gridEnabled.value && state.sim.phase === "editing",
				this.uiPrefs.gridSpacing.value,
			);
		}

		// Water layer: translucent quad + animated surface (tide offset/tilt or
		// wave profile) from the core's read-model; static surface at
		// sandbox.water.height while editing (state.water is null then).
		if (this.water) {
			this.water.update(camera, w, h, state.sandbox.water, state.water);
		}

		// Map selection ids -> live Part instances for highlight.
		const selected = new Set(state.edit.selection);
		const selectedParts: Part[] = state.parts.filter((p) => selected.has(p.id));

		// Joint visualization (Jaybit HighlightForJoint, ControllerGame.as:2632-2645):
		// when exactly one JOINT is selected, blink the two shapes it connects (±0.1
		// fill alpha, applied in Draw). Render-derived, NOT a flag on parts. Gated behind
		// the "Highlight Parts for Joint" pref (default on).
		let jvIds: Set<number> | null = null;
		if (this.uiPrefs.highlightPartsForJoint.value && selectedParts.length === 1) {
			const j = selectedParts[0];
			if (j instanceof JointPart) {
				jvIds = new Set<number>();
				if (j.part1) jvIds.add(j.part1.id);
				if (j.part2) jvIds.add(j.part2.id);
			}
		}

		const notStarted = state.sim.phase !== "running";
		// drawStatic=false — faithful to ControllerGame.ts:640. Static NON-EDITABLE
		// terrain (both the sandbox ground AND custom challenge/tutorial terrain) has
		// drawAnyway=false collision bodies that are NEVER drawn by DrawWorld; in the
		// legacy the VISIBLE terrain is a separate decorative sGround visual (the sandbox
		// GroundRenderer, and — for tutorials/challenges — the per-level sGround1/2/3
		// grass/dirt/rock geometry, ControllerTutorial.ts:285+). Drawing the raw collision
		// parts here would show uncoloured red triangles, so we don't. Editable static
		// parts and drawAnyway=true parts still draw via the gate in Draw.DrawWorld.
		// DrawWorld(allParts, selectedParts, world, notStarted, drawStatic,
		//           showJoints, showOutlines, challenge)  — see Draw.ts:75.
		// Superset/prototype: append live shatter fragments (transient sim-only bodies
		// held outside the edit model) so they render with their inherited material.
		// game.liveFragments() is empty except while a fragile shape is shattering.
		const fragments = this.game.liveFragments() as Part[];
		const drawParts = fragments.length > 0 ? [...(state.parts as Part[]), ...fragments] : (state.parts as Part[]);
		draw.DrawWorld(
			drawParts,
			selectedParts,
			state.world,
			notStarted,
			/* drawStatic */ false,
			// View-menu flags (ControllerGame.ts:641-642 pass showJoints/showOutlines).
			/* showJoints */ state.edit.showJoints,
			/* showOutlines */ state.edit.showOutlines,
			// Live Challenge (or null): Draw paints win/loss condition zones when the
			// sim is not started, or always if showConditions is set (Draw.ts:129-164).
			/* challenge */ this.game.liveChallenge() as any,
			// Joint-visualization highlight set (the two shapes of the selected joint).
			/* highlightForJVIds */ jvIds as any
		);
	}

	/** Tear the whole stack down (unmount). Safe to call after a failed init. */
	destroy(): void {
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		if (this.app && this.tickerFn) this.app.ticker.remove(this.tickerFn);
		this.tickerFn = null;
		this.draw = null;
		this.drawSprite = null;
		this.overlay = null;
		this.sky?.destroy();
		this.sky = null;
		this.ground?.destroy();
		this.ground = null;
		this.tutorialGround?.destroy();
		this.tutorialGround = null;
		this.challengeGround?.destroy();
		this.challengeGround = null;
		this.grid?.destroy();
		this.grid = null;
		this.water?.destroy();
		this.water = null;
		if (this.app) {
			this.app.destroy(true, { children: true });
			this.app = null;
		}
	}
}
