<script setup lang="ts">
// Pixi renderer mounted inside the editor stage. Drawing is delegated to the
// ORIGINAL renderer (src/Game/Draw.ts, a b2DebugDraw subclass) so shapes get
// their real look — fills, outlines, colours, joints, selection highlight,
// text, challenge zones — in both the pre-sim (edit) and running (body) states.
//
// This component is the thin lifecycle + game-loop host; the heavy lifting is
// decomposed into:
//   • renderer/rendererStack.ts — the pixi Application + layered renderer set
//     (sky/ground/tutorial/challenge/grid/Draw/water/overlay) and the per-frame
//     world render (DrawWorld + environment layers).
//   • composables/useCanvasPointer.ts — every pointer gesture: select/drag/
//     marquee/rotate/resize, shape/polygon/joint creation, condition picking,
//     two-finger pinch pan/zoom, and the overlay previews.
//   • composables/useCanvasKeyboard.ts — running-sim key input, editor hotkeys
//     (single keyDOWN path), held-arrow camera pan, window-blur key release.
// What REMAINS here is the per-frame game loop (fixed 30Hz sim stepping, render
// interpolation, arrow-key pan, camera follow) and the mount/unmount wiring.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useGameStore } from "./gameStore";
import { useUiPrefs } from "./uiPrefs";
import { RenderInterpolator } from "./renderer/interpolation";
import { RendererStack } from "./renderer/rendererStack";
import { ShapePart } from "../Parts/ShapePart";
import { getPhysicsBackend } from "../Parts/partGlobals";
import { createModifierState } from "./composables/modifierState";
import { useCanvasPointer } from "./composables/useCanvasPointer";
import { useCanvasKeyboard } from "./composables/useCanvasKeyboard";

const game = useGameStore();
const uiPrefs = useUiPrefs();

const container = ref<HTMLDivElement | null>(null);

// Shift/Ctrl tracked from every pointer AND key event (see modifierState.ts) —
// drawFrame reads `mods.ctrl` per frame for the fast arrow pan.
const mods = createModifierState();

// The pixi Application + layered renderer set (created async on mount; the
// pointer composable reads its app/draw/overlay handles live, null-guarded).
const stack = new RendererStack(game, uiPrefs, container);

// Pointer gestures + overlay previews; keyboard input (needs the pointer
// composable's polygon draft for Enter-commit / Escape-cancel / hotkey gating).
const pointer = useCanvasPointer({ game, uiPrefs, container, stack, mods });
const keyboard = useCanvasKeyboard({ game, mods, polygonDraft: pointer.polygonDraft });
const { heldArrows } = keyboard;

// The sim advances at a FIXED 30 steps/sec — IncrediBots' native stage rate. Each
// `step` runs two 1/60s Box2D sub-steps (= 1/30s of simulation), so it must be
// dispatched 30x/sec for real-time physics. The pixi ticker fires at the DISPLAY
// refresh rate (60/120/144Hz), so stepping once per tick ran the sim 2x+ too fast;
// we accumulate elapsed ticker time and step at 30Hz regardless of refresh rate.
const SIM_FRAME_MS = 1000 / 30;
let simAccMs = 0;

// Render interpolation between the fixed 30fps sim steps: drawFrame snapshots
// every body's pose BEFORE each step and draws at prev + alpha*(curr - prev),
// alpha being the accumulator leftover (0..1). Physics stepping is untouched
// (replay determinism); this is purely how the in-between render frames look.
// Cleared whenever the sim isn't running so nothing lerps from stale poses
// after reset/play/load.
const interpolator = new RenderInterpolator();

/** Draw a single frame via the original Draw renderer. */
function drawFrame(): void {
	const app = stack.app;
	const draw = stack.draw;
	if (!app || !draw) return;
	let state = game.state;

	// While running, advance the physics at a FIXED 30 steps/sec (the legacy stage
	// rate) via a wall-time accumulator, so playback speed is independent of the
	// monitor's refresh rate — stepping once per render frame ran the sim 2x+ too
	// fast on 60Hz+ displays. Catch up at most a few steps per frame after a hitch.
	if (state.sim.phase === "running") {
		simAccMs += app.ticker.deltaMS;
		let steps = 0;
		while (simAccMs >= SIM_FRAME_MS && steps < 4) {
			// Snapshot every body's pose BEFORE the step — the "previous" state the
			// interpolated draw blends from. On multi-step catch-up frames only the
			// last capture survives, i.e. prev is always exactly one step behind.
			if (state.world) interpolator.snapshot(state.world, getPhysicsBackend());
			game.dispatch({ type: "step" });
			simAccMs -= SIM_FRAME_MS;
			steps++;
		}
		// Re-read the state: stepping replaced the core's immutable snapshot
		// (sim frame, camera follow, challenge outcome...).
		state = game.state;
	} else {
		// Not running: drop any accumulated time so the next play starts fresh, and
		// drop the interpolation snapshots so nothing lerps from stale poses after
		// a reset/play/load (edit + paused draw raw body transforms).
		simAccMs = 0;
		interpolator.clear();
	}

	// Blend factor for this render frame: the accumulator leftover after stepping,
	// 0 = previous step's pose, 1 = current. Clamped for post-hitch frames where
	// the 4-step catch-up cap leaves more than one sim frame accumulated. Only
	// interpolate while running AND a pre-step snapshot exists; otherwise draw raw
	// (edit/paused, and the very first frame of a run).
	const running = state.sim.phase === "running";
	const alpha = Math.min(1, Math.max(0, simAccMs / SIM_FRAME_MS));
	draw.getRenderXForm =
		running && interpolator.hasSnapshot() ? (body) => interpolator.getXForm(body, alpha) : null;

	// Use the container's CSS-pixel size as the single source of truth for the
	// draw transform — the SAME size (getBoundingClientRect) the pointer math and
	// screenToWorld/worldToScreen use. Pixi's stage coordinate system is in CSS
	// pixels (autoDensity handles the devicePixelRatio scale internally), so
	// deriving canvas size from renderer.width/resolution is fragile across Pixi
	// versions and on HiDPI displays diverged from the CSS size — pushing the
	// world origin off-centre and confining drawing/interaction to a sub-region.
	// clientWidth/clientHeight are always CSS px and always match the pointer math.
	const w = container.value?.clientWidth || app.renderer.width / app.renderer.resolution;
	const h = container.value?.clientHeight || app.renderer.height / app.renderer.resolution;

	// Editing-phase fast camera pan (ControllerGame.as:6795-6835). Per frame while
	// an arrow key is held: base 10 px/frame, Ctrl = 30 (3x). NOTE: shipped Jaybit
	// had a decompiled quirk where LEFT panned 30 but RIGHT/UP/DOWN panned 40 (an
	// unconditional +10 with no `else`); we port the clear INTENT — a uniform 30 with
	// Ctrl. panCamera subtracts the screen delta from camera.offset (content follows),
	// so LEFT/UP use +step and RIGHT/DOWN use -step to scroll the view that way.
	if (state.sim.phase === "editing" && heldArrows.size > 0) {
		const step = mods.ctrl ? 30 : 10;
		let dx = 0;
		let dy = 0;
		if (heldArrows.has(37)) dx += step; // LEFT
		if (heldArrows.has(39)) dx -= step; // RIGHT
		if (heldArrows.has(38)) dy += step; // UP
		if (heldArrows.has(40)) dy -= step; // DOWN
		if (dx !== 0 || dy !== 0) game.dispatch({ type: "panCamera", dx, dy, viewW: w, viewH: h });
	} else if (state.sim.phase !== "editing" && heldArrows.size > 0) {
		// Leaving the editor (e.g. play pressed with an arrow held) drops the pan.
		heldArrows.clear();
	}

	// Draw's screen transform is `worldX * m_drawScale - m_drawXOff` (no implicit
	// canvas-center offset). To centre the world origin the way the editor camera
	// expects — screen = canvas/2 + world*scale - offset — the stack sets the
	// offsets so the two transforms are identical. This keeps hit-testing
	// (screenToWorld, which uses the canvas/2 convention) aligned with what Draw
	// paints.
	//
	// Camera-follow smoothing: the core's handleCamera re-centres the camera on
	// the focused part once per 30fps STEP, which stutters when rendering at the
	// display rate. While running (and not replaying — the replay owns the camera
	// stream then), derive the follow offset RENDER-side each frame from the SAME
	// interpolated body pose the shapes are drawn at, so the pan is exactly as
	// smooth as the robot. Zoom/limits and the core's camera commands are intact —
	// this only re-derives the per-frame follow offset from the focus part.
	let camera = state.camera;
	if (running && !state.replay.playing) {
		// Same pick as GameCore.cameraFocusPart: the LAST enabled focus ShapePart.
		let focus: ShapePart | null = null;
		for (const p of state.parts) {
			if (p instanceof ShapePart && p.isCameraFocus && p.isEnabled) focus = p;
		}
		const body = focus?.GetBody();
		if (body) {
			const c = interpolator.worldCenter(body, alpha);
			const nx = c.x * camera.scale;
			const ny = c.y * camera.scale;
			// NaN guard mirrors GameCore.handleCamera (:3183).
			if (!isNaN(nx) && !isNaN(ny)) camera = { ...camera, offsetX: nx, offsetY: ny };
		}
	}

	// Environment layers + the world itself, through the ORIGINAL Draw renderer.
	stack.renderWorld(state, camera, w, h);

	// In-progress gesture previews (temp shape on the Draw sprite, polygon ring /
	// point-edit handles on the overlay) — must repaint AFTER DrawWorld each frame.
	pointer.drawGesturePreviews();
}

onMounted(async () => {
	// Build the pixi Application + renderer layers inside the container and start
	// the per-frame ticker. No-ops (leaving stack.app null) if the component was
	// torn down while Application.init() was awaiting.
	await stack.init(drawFrame);
	if (!stack.app || !container.value) return;

	container.value.addEventListener("pointerdown", pointer.onPointerDown);
	container.value.addEventListener("pointermove", pointer.onPointerMove);
	container.value.addEventListener("pointerup", pointer.onPointerUp);
	container.value.addEventListener("pointercancel", pointer.onPointerUp);
	// Live keyboard control during the running sim. Bound on window (like the
	// legacy global Input listeners) so the robot is drivable without the canvas
	// having to hold focus; the handlers no-op unless the sim is running.
	window.addEventListener("keydown", keyboard.onKeyDown);
	window.addEventListener("keyup", keyboard.onKeyUp);
	// If focus leaves the window while a key is held, the matching keyup never
	// fires — clear the held-arrow / modifier state so pan doesn't get stuck.
	window.addEventListener("blur", keyboard.onWindowBlur);
});

onBeforeUnmount(() => {
	if (container.value) {
		container.value.removeEventListener("pointerdown", pointer.onPointerDown);
		container.value.removeEventListener("pointermove", pointer.onPointerMove);
		container.value.removeEventListener("pointerup", pointer.onPointerUp);
		container.value.removeEventListener("pointercancel", pointer.onPointerUp);
	}
	window.removeEventListener("keydown", keyboard.onKeyDown);
	window.removeEventListener("keyup", keyboard.onKeyUp);
	window.removeEventListener("blur", keyboard.onWindowBlur);
	stack.destroy();
});
</script>

<template>
	<div ref="container" class="game-canvas-host" />
</template>

<style scoped>
.game-canvas-host {
	flex: 1;
	min-width: 0;
	min-height: 0;
	width: 100%;
	height: 100%;
	position: relative;
	overflow: hidden;
	touch-action: none;
}
</style>
