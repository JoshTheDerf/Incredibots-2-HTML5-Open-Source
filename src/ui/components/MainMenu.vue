<script setup lang="ts">
// Full-viewport main menu — a faithful Vue port of the legacy
// ControllerMainMenu.ts "level select" screen (src/Game/ControllerMainMenu.ts,
// the `levelSelectGui` built in the constructor, lines ~207-395).
//
// The original laid out three parchment boxes over the logo:
//   Box 1 (top-left)  — four PINK GuiButtons in a 2x2 grid:
//       "Tutorial Levels", "Sandbox Mode", "Challenge Editor", "Advanced Sandbox"
//   Box 2 (middle)    — ORANGE import column + BLUE/RED load column:
//       "Import Challenge/Replay/Bot"  |  "Load Challenge/Replay/Bot", "High Scores"
//   Other box (br)    — three BLUE info buttons:
//       "Instructions", "Credits", "Suggestions?"
//   Plus: "Welcome, Guest" (top-left), Log In (top-right, BLUE),
//         Enable/Disable Sound (bottom-left, BLUE), version text.
// The demo-bot Box2D background and the animated logo stretch are intentionally
// skipped (optional per the port brief); button labels, families, order, and
// enabled/disabled state mirror the original exactly.
//
// appMode lives ONLY in the UI layer (gameStore.appMode) — GameCore has no
// screen concept. Sandbox Mode / Challenge Editor enter the editor with a fresh
// robot (goToEditor(true) -> dispatches `newRobot`), matching the original
// sandboxButton()/editorButton() which jump into the build controller. Options
// that need a mode GameCore lacks (tutorials, challenges, replays, high scores,
// online load) open a ported panel as a modal and/or carry an <IbTodo/> flag —
// exactly as the legacy buttons that were `disabled = true`.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Application, Graphics } from "pixi.js";
import { useGameStore } from "../gameStore";
import { frameTextures } from "../assets";
import { SkyRenderer } from "../renderer/skyRenderer";
import { GroundRenderer } from "../renderer/groundRenderer";
import { soundService } from "../sound";
import { GameCore } from "../../core/GameCore";
import { createInitialState } from "../../core/GameState";
import { Draw } from "../../Game/Draw";
import replayDatUrl from "../../../resource/replay.dat";
import robotDatUrl from "../../../resource/robot.dat";
import type { CameraState, SandboxState } from "../../core";
import type { Part } from "../../Parts/Part";
import IbButton from "./IbButton.vue";
import IbTodo from "./IbTodo.vue";
import TutorialSelectPanel from "./panels/TutorialSelectPanel.vue";
import ImportPanel from "./panels/ImportPanel.vue";

const game = useGameStore();

// --- Animated background (faithful to ControllerMainMenu's sSky + sGround) ----
// The legacy menu drew the SPACE sky (Sky type 1) over a SMALL "LAND" ground in
// the MARS palette (terrainTheme 6) — its gradient1/gradient2 literals are
// exactly groundRenderer's theme-6 colours (ControllerMainMenu.ts:109-152). We
// reuse the in-game SkyRenderer + GroundRenderer as-is (they are self-contained
// pixi Containers driven by plain SandboxState/CameraState), mounted in a small
// pixi Application behind the menu UI. The demo-bot Box2D animation stays out of
// scope (as it was in the prior port pass); the logo remains the <img> below.
const bgContainer = ref<HTMLDivElement | null>(null);

// SPACE sky + SMALL mars LAND — the menu's fixed backdrop settings.
const MENU_SANDBOX: SandboxState = {
	gravity: 15, // unused by the renderers; the canonical sandbox default.
	background: 1, // Sky type 1 = space/stars (ControllerMainMenu.ts:109)
	backgroundR: 0,
	backgroundG: 0,
	backgroundB: 0,
	terrainType: 0, // LAND
	size: 0, // SMALL
	terrainTheme: 6, // mars (matches the menu's gradient literals)
	bounds: { minX: -50, maxX: 50, minY: -30, maxY: 40 }, // computeBounds(SMALL/LAND)
};

let bgApp: Application | null = null;
let bgSky: SkyRenderer | null = null;
let bgGround: GroundRenderer | null = null;
let bgTicker: (() => void) | null = null;
let bgResizeObserver: ResizeObserver | null = null;

// --- Demo replay (faithful to ControllerMainMenu's looping demo bot) ---------
// The legacy menu played a looping DEMO replay of a robot driving over terrain
// (ControllerMainMenu.LoadReplay + Update, ControllerMainMenu.ts:407-457). We
// reproduce it headlessly: a private menu-only GameCore decodes the two RAW asset
// blobs (resource/replay.dat + resource/robot.dat) via loadDemoReplay and drives
// sim-FREE spline playback; a Draw sprite (the ORIGINAL renderer) paints the
// robot into the SAME background pixi app, above the ground. When playback ends
// we dispatch `viewReplayAgain` to loop, exactly as the legacy Update() does.
let demoCore: GameCore | null = null;
let demoDraw: Draw | null = null;
let demoSprite: Graphics | null = null;
// Fixed step rate so playback speed is independent of the display refresh rate
// (the pixi ticker runs at the monitor's Hz — 120/144 on high-refresh displays —
// which made the recorded-at-60fps replay play too fast). We accumulate elapsed
// ticker time and advance the replay at a fixed 60 steps/sec.
const DEMO_FRAME_MS = 1000 / 60;
let demoAccMs = 0;

/**
 * The shared menu-background camera. The legacy ControllerMainMenu follows the
 * demo's cameraPart (the isCameraFocus ShapePart) at a fixed scale and IGNORES the
 * replay's camera stream (MoveCameraForReplay is empty; HandleCamera :1540-1548).
 * We reproduce that: centre the camera on the cameraPart's world position so the
 * sky, ground, AND the demo robot all render through ONE camera and stay aligned.
 * Falls back to the static hill framing before the demo has loaded. Follow
 * convention matches the core (offset = worldCentre * scale; screen = canvas/2 +
 * world*scale - offset).
 */
const DEMO_SCALE = 23.73; // ControllerMainMenu.ts:407 fixed menu draw scale.
function demoCamera(w: number, h: number): CameraState {
	const parts = demoCore?.getState().parts;
	if (parts) {
		for (const p of parts) {
			const sp = p as unknown as { isCameraFocus?: boolean; GetBody?: () => { GetWorldCenter: () => { x: number; y: number } } | null };
			if (sp.isCameraFocus && sp.GetBody) {
				const body = sp.GetBody();
				if (body) {
					const wc = body.GetWorldCenter();
					return { scale: DEMO_SCALE, offsetX: wc.x * DEMO_SCALE, offsetY: wc.y * DEMO_SCALE };
				}
			}
		}
	}
	return menuCamera(w, h);
}

/**
 * Frame the mars hill along the bottom-centre of the (responsive) viewport.
 * Framing is a cosmetic tuning value — the legacy menu was a fixed 800x600 stage
 * (spec note: no faithfulness constraint here). We derive scale from the width so
 * the SMALL land's ~85-unit span slightly overflows into a domed hill, and set
 * offsetY so the ground surface (world y ~= 12) sits near the lower third.
 */
function menuCamera(w: number, h: number): CameraState {
	const scale = Math.max(16, w / 42);
	// screen = h/2 + world*scale - offsetY; want the y=12 surface at ~0.82h.
	const offsetY = 12 * scale - 0.32 * h;
	return { scale, offsetX: 0, offsetY };
}

const logoSrc = frameTextures.logo;
const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

// Which secondary screen (if any) is open on top of the menu.
type MenuModal = "tutorials" | "importRobot" | "importReplay" | "importChallenge" | "loadChallenge" | null;
const modal = ref<MenuModal>(null);
function closeModal(): void {
	modal.value = null;
}

// A successful robot/replay import from the menu must switch into the editor view
// so the imported robot (or the now-playing replay) is visible — the canvas isn't
// mounted on the menu. goToEditor(false) enters WITHOUT clearing (no newRobot), so
// the just-imported parts survive.
function onImported(): void {
	closeModal();
	game.goToEditor(false);
}

// Challenge Editor (legacy editorButton → straightToChallengeEditor): start a
// fresh authoring challenge and enter the challenge-editor screen.
function enterChallengeEditor(): void {
	game.goToChallengeEditor();
}

// Load a built-in challenge (Climb / Monkey Bars). loadBuiltInChallenge bakes
// the terrain + conditions and marks the session play-only; we then switch to
// the challengeEditor screen so the editor chrome + challenge panels are live.
// (The legacy Load Challenge picker had far more entries via the server; only
// the two in-code challenges exist here.)
function loadBuiltIn(name: "climb" | "monkeyBars"): void {
	game.dispatch({ type: "loadBuiltInChallenge", name });
	game.appMode = "challengeEditor";
	closeModal();
}

// Sound toggle — the original tracked Main.enableSound and swapped Enable/Disable
// buttons, starting/stopping the intro track (ControllerMainMenu.ts:112-116).
// Wired to the real UI sound service; enabling starts the looped intro music.
const soundEnabled = ref(soundService.enabled);
function toggleSound(): void {
	soundEnabled.value = !soundEnabled.value;
	soundService.setEnabled(soundEnabled.value);
	if (soundEnabled.value) soundService.playIntro();
	else soundService.stopIntro();
}

// sandboxButton()/editorButton(): jump into the build controller with a fresh
// robot. Both enter the editor in the new stack (no separate challenge-editor
// mode in GameCore yet).
function enterEditor(): void {
	game.goToEditor(true);
}

/**
 * Fetch the two RAW demo assets (Vite resolves the .dat imports to URL strings)
 * and load them into the menu-only GameCore. loadDemoReplay decodes the raw
 * replay+robot blobs and begins sim-free playback. Mirrors
 * ControllerMainMenu.LoadReplay (ControllerMainMenu.ts:443-457).
 */
async function loadDemo(): Promise<void> {
	try {
		const [replayBytes, robotBytes] = await Promise.all([
			fetch(replayDatUrl).then((r) => r.arrayBuffer()),
			fetch(robotDatUrl).then((r) => r.arrayBuffer()),
		]);
		// The component may have been torn down while awaiting.
		if (!bgApp) return;
		const core = new GameCore(createInitialState());
		await core.loadDemoReplay(replayBytes, robotBytes);
		if (!bgApp) return;
		demoCore = core;
	} catch {
		// A decode/fetch failure just leaves the demo bot absent — the sky+ground
		// backdrop still renders. Don't break the menu.
		demoCore = null;
	}
}

/**
 * Draw one demo-replay frame via the ORIGINAL Draw renderer, driven by the demo
 * core's replay camera (the camera-follow is baked into the replay's camera
 * stream). Mirrors GameCanvas.drawFrame's camera→Draw transform: advance the
 * replay one step, map the core camera to Draw's offsets/scale, paint the parts,
 * and dispatch `viewReplayAgain` to loop when playback finishes (the legacy
 * ControllerMainMenu.Update loop-on-end).
 */
function drawDemoFrame(w: number, h: number, camera: CameraState): void {
	if (!demoCore || !demoDraw) return;

	// Advance sim-free playback at a FIXED 60fps (accumulate ticker time), so the
	// recorded-at-60fps replay plays at real speed regardless of the monitor's
	// refresh rate. Loop when the recorded motion ends (ControllerMainMenu.Update).
	demoAccMs += bgApp?.ticker.deltaMS ?? DEMO_FRAME_MS;
	let steps = 0;
	while (demoAccMs >= DEMO_FRAME_MS && steps < 4) {
		if (demoCore.getState().sim.phase === "running") demoCore.dispatch({ type: "step" });
		if (demoCore.getState().replay.finished) demoCore.dispatch({ type: "viewReplayAgain" });
		demoAccMs -= DEMO_FRAME_MS;
		steps++;
	}

	// Draw through the SHARED follow camera (same one the sky/ground use), so the
	// robot stays aligned with the ground. screen = canvas/2 + world*scale - offset.
	demoDraw.m_drawScale = camera.scale;
	demoDraw.m_drawXOff = camera.offsetX - w / 2;
	demoDraw.m_drawYOff = camera.offsetY - h / 2;
	demoDraw.m_screenWidth = w;
	demoDraw.m_screenHeight = h;

	const after = demoCore.getState();

	// drawStatic=false (as GameCanvas / ControllerGame): the demo terrain is the
	// decorative ground; the dynamic robot draws. notStarted=false (playing).
	demoDraw.DrawWorld(
		after.parts as Part[],
		[],
		after.world,
		/* notStarted */ false,
		/* drawStatic */ false,
		/* showJoints */ true,
		/* showOutlines */ true,
		/* challenge */ null as any,
	);
}

onMounted(async () => {
	if (!bgContainer.value) return;
	const w0 = bgContainer.value.clientWidth || 1;
	const h0 = bgContainer.value.clientHeight || 1;

	const app = new Application();
	await app.init({
		width: w0,
		height: h0,
		backgroundAlpha: 0,
		antialias: true,
		resolution: window.devicePixelRatio || 1,
		autoDensity: true,
	});
	// Component may have been torn down while init() awaited.
	if (!bgContainer.value) {
		app.destroy(true, { children: true });
		return;
	}
	bgApp = app;
	bgContainer.value.appendChild(app.canvas as unknown as Node);
	(app.canvas as HTMLCanvasElement).style.display = "block";
	(app.canvas as HTMLCanvasElement).style.width = "100%";
	(app.canvas as HTMLCanvasElement).style.height = "100%";

	// Sky behind, ground over it — same display order as GameCanvas / the legacy.
	bgSky = new SkyRenderer();
	app.stage.addChild(bgSky.view);
	void bgSky.preload();
	bgGround = new GroundRenderer();
	app.stage.addChild(bgGround.view);

	// Demo-bot Draw sprite sits ABOVE the ground (matching the legacy display
	// order: sSky behind, sGround over it, the demo world/robot on top).
	demoSprite = new Graphics();
	app.stage.addChild(demoSprite);
	demoDraw = new Draw();
	demoDraw.m_sprite = demoSprite;

	// Kick off the demo-replay load (async); the ticker draws it once ready.
	void loadDemo();

	bgTicker = () => {
		if (!bgApp || !bgContainer.value) return;
		const w = bgContainer.value.clientWidth || 1;
		const h = bgContainer.value.clientHeight || 1;
		// One shared camera that follows the demo robot's cameraPart (falls back to
		// the static hill framing before the demo loads). Sky, ground, and the demo
		// robot all render through it, so they pan together and stay aligned.
		const cam = demoCamera(w, h);
		if (bgSky) {
			bgSky.build(MENU_SANDBOX);
			// Clouds don't drift on the menu (space background has none); paused=true.
			bgSky.update(cam, MENU_SANDBOX.bounds, w, h, true);
		}
		if (bgGround) {
			bgGround.build(MENU_SANDBOX);
			bgGround.update(cam, w, h);
		}
		drawDemoFrame(w, h, cam);
	};
	app.ticker.add(bgTicker);

	const resizeToContainer = (): void => {
		if (!bgApp || !bgContainer.value) return;
		const cw = Math.max(1, Math.floor(bgContainer.value.clientWidth));
		const ch = Math.max(1, Math.floor(bgContainer.value.clientHeight));
		if (bgApp.renderer.width !== cw || bgApp.renderer.height !== ch) {
			bgApp.renderer.resize(cw, ch);
		}
	};
	bgResizeObserver = new ResizeObserver(() => resizeToContainer());
	bgResizeObserver.observe(bgContainer.value);
	resizeToContainer();
});

onBeforeUnmount(() => {
	soundService.stopIntro();
	bgResizeObserver?.disconnect();
	bgResizeObserver = null;
	if (bgApp && bgTicker) bgApp.ticker.remove(bgTicker);
	bgTicker = null;
	demoCore = null;
	demoDraw = null;
	demoSprite = null;
	bgGround?.destroy();
	bgGround = null;
	bgSky = null;
	if (bgApp) {
		bgApp.destroy(true, { children: true });
		bgApp = null;
	}
});
</script>

<template>
	<div class="main-menu">
		<!-- Animated space-sky + mars-ground backdrop (pixi), behind the UI. -->
		<div ref="bgContainer" class="menu-bg" aria-hidden="true" />

		<!-- Top bar: "Welcome, Guest" (original x=10,y=20) on the left, Log In
		     (original x=675, top-right) on the right — laid out with flex, not
		     absolute coordinates. -->
		<div class="top-bar">
			<div class="welcome">Welcome, Guest</div>
			<IbButton family="blue" class="corner-btn login" disabled>
				Log In <IbTodo label="no accounts" />
			</IbButton>
		</div>

		<!-- Scaled-down logo near the top-centre, mirroring the
		     straightToLevelSelect logo (0.6 scale). -->
		<img :src="logoSrc" alt="IncrediBots 2" class="menu-logo" />

		<div class="level-select">
			<!-- BOX 1 — primary modes (PINK), 2x2 grid. -->
			<div class="ib-panel box box-modes" :style="panelStyle">
				<div class="modes-grid">
					<IbButton family="pink" class="mode-btn" @click="modal = 'tutorials'">
						Tutorial Levels <IbTodo label="preview" />
					</IbButton>
					<IbButton family="pink" class="mode-btn" label="Sandbox Mode" @click="enterEditor" />
					<IbButton family="pink" class="mode-btn" label="Challenge Editor" @click="enterChallengeEditor" />
					<IbButton family="pink" class="mode-btn" disabled>
						Advanced Sandbox <IbTodo label="not wired" />
					</IbButton>
				</div>
			</div>

			<!-- BOX 2 — import (ORANGE) + load (BLUE/RED) columns. -->
			<div class="ib-panel box box-loadsave" :style="panelStyle">
				<div class="loadsave-cols">
					<div class="loadsave-col">
						<IbButton family="orange" class="ls-btn" disabled>
							Import Challenge <IbTodo label="no challenges" />
						</IbButton>
						<IbButton family="orange" class="ls-btn" label="Import Replay" @click="modal = 'importReplay'" />
						<IbButton family="orange" class="ls-btn" label="Import Bot" @click="modal = 'importRobot'" />
					</div>
					<div class="loadsave-col">
						<IbButton family="blue" class="ls-btn" label="Load Challenge" @click="modal = 'loadChallenge'" />
						<IbButton family="blue" class="ls-btn" disabled>
							Load Replay <IbTodo label="no online" />
						</IbButton>
						<IbButton family="blue" class="ls-btn" disabled>
							Load Bot <IbTodo label="no online" />
						</IbButton>
						<IbButton family="red" class="ls-btn" disabled>
							High Scores <IbTodo label="no online" />
						</IbButton>
					</div>
				</div>
			</div>

			<!-- OTHER BOX — info buttons (BLUE). Enabled in the original. -->
			<div class="ib-panel box box-info" :style="panelStyle">
				<IbButton family="blue" class="info-btn" disabled>
					Instructions <IbTodo label="not wired" />
				</IbButton>
				<IbButton family="blue" class="info-btn" disabled>
					Credits <IbTodo label="not wired" />
				</IbButton>
				<IbButton family="blue" class="info-btn" disabled>
					Suggestions? <IbTodo label="not wired" />
				</IbButton>
			</div>
		</div>

		<!-- Bottom bar: Sound toggle (original bottom-left) on the left, version
		     text (original bottom-right) on the right — flex, not absolute. -->
		<div class="bottom-bar">
			<IbButton
				family="blue"
				class="corner-btn sound"
				:label="soundEnabled ? 'Disable Sound' : 'Enable Sound'"
				@click="toggleSound"
			/>
			<div class="version">IncrediBots 2 — Vue edition</div>
		</div>

		<!-- Tutorial select (ported Gui/TutorialSelectWindow.ts). -->
		<UModal
			:open="modal === 'tutorials'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closeModal()"
		>
			<template #content>
				<TutorialSelectPanel @back="closeModal" />
			</template>
		</UModal>

		<!-- Import Bot reuses the ported Import panel (paste an exported bot). -->
		<UModal
			:open="modal === 'importRobot'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closeModal()"
		>
			<template #content>
				<ImportPanel import-type="robot" @imported="onImported" @close="closeModal" />
			</template>
		</UModal>

		<!-- Import Replay reuses the Import panel in replay mode (paste an exported
		     replay string; importReplay loads the bundled robot + starts playback). -->
		<UModal
			:open="modal === 'importReplay'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closeModal()"
		>
			<template #content>
				<ImportPanel import-type="replay" @imported="onImported" @close="closeModal" />
			</template>
		</UModal>

		<!-- Load Challenge — a small picker of the two in-code built-in challenges
		     (Climb / Monkey Bars). Server-hosted challenges are gone, so this is the
		     full list. Selecting one bakes it + enters the challenge editor. -->
		<UModal
			:open="modal === 'loadChallenge'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closeModal()"
		>
			<template #content>
				<div class="ib-panel challenge-picker" :style="panelStyle">
					<h2 class="picker-title">Load Challenge</h2>
					<IbButton family="blue" class="picker-btn" label="Climb" @click="loadBuiltIn('climb')" />
					<IbButton family="blue" class="picker-btn" label="Monkey Bars" @click="loadBuiltIn('monkeyBars')" />
					<IbButton family="purple" class="picker-btn" label="Cancel" @click="closeModal" />
				</div>
			</template>
		</UModal>
	</div>
</template>

<style scoped>
.main-menu {
	position: relative;
	height: 100vh;
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	/* Dark space fallback behind the pixi backdrop (matches Sky type-1 base). */
	background: #05060a;
	font-family: Arial, Helvetica, sans-serif;
	color: var(--ib-dark);
	overflow: auto;
	padding: 14px 16px;
	box-sizing: border-box;
}

/* Full-bleed pixi backdrop (sky + ground) behind all menu content. */
.menu-bg {
	position: absolute;
	inset: 0;
	z-index: 0;
	overflow: hidden;
	pointer-events: none;
}

/* Menu content sits above the backdrop. */
.main-menu > *:not(.menu-bg) {
	position: relative;
	z-index: 1;
}

/* Top bar spans the full width: welcome text left, Log In right. */
.top-bar {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.menu-logo {
	width: min(420px, 70vw);
	height: auto;
	image-rendering: auto;
	filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
	margin: 8px 0 18px;
}

.welcome {
	font-size: 13px;
	font-weight: bold;
	color: var(--ib-cream);
}

/* Three-box layout, arranged like the original: modes top-left, load/save
   centre, info bottom-right. On a wide viewport they sit in a row; they wrap
   on narrow screens. */
.level-select {
	flex: 1 0 auto;
	display: flex;
	flex-wrap: wrap;
	gap: 22px;
	align-items: flex-start;
	justify-content: center;
	max-width: 1000px;
}

.box {
	box-sizing: border-box;
	padding: 18px;
}

.modes-grid {
	display: grid;
	grid-template-columns: repeat(2, 210px);
	gap: 12px;
}

.mode-btn {
	width: 210px;
	height: 56px;
	font-size: 15px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	text-align: center;
	white-space: nowrap;
}

.loadsave-cols {
	display: flex;
	gap: 14px;
}

.loadsave-col {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.ls-btn {
	width: 190px;
	height: 42px;
	font-size: 13px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	white-space: nowrap;
}

.box-info {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.info-btn {
	width: 190px;
	height: 40px;
	font-size: 13px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	white-space: nowrap;
}

/* Bottom bar spans the full width: sound toggle left, version right. */
.bottom-bar {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-top: 12px;
}

.corner-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	white-space: nowrap;
}

.sound {
	width: 150px;
	height: 40px;
	font-size: 13px;
}

.login {
	width: 150px;
	height: 40px;
	font-size: 13px;
	opacity: 0.7;
}

.version {
	font-size: 12px;
	color: var(--ib-cream);
	opacity: 0.7;
}

/* Built-in challenge picker — a compact cream panel with the challenge choices. */
.challenge-picker {
	box-sizing: border-box;
	width: 260px;
	padding: 18px 20px 20px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	font-family: Arial, Helvetica, sans-serif;
}

.picker-title {
	margin: 0 0 6px;
	font-size: 18px;
	font-weight: bold;
	color: var(--ib-dark);
}

.picker-btn {
	width: 180px;
	height: 42px;
	font-size: 14px;
}
</style>
