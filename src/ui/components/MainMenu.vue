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
import { ref } from "vue";
import { useGameStore } from "../gameStore";
import { frameTextures } from "../assets";
import IbButton from "./IbButton.vue";
import IbTodo from "./IbTodo.vue";
import TutorialSelectPanel from "./panels/TutorialSelectPanel.vue";
import ImportPanel from "./panels/ImportPanel.vue";

const game = useGameStore();

const logoSrc = frameTextures.logo;
const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

// Which secondary screen (if any) is open on top of the menu.
type MenuModal = "tutorials" | "importRobot" | "importReplay" | "importChallenge" | null;
const modal = ref<MenuModal>(null);
function closeModal(): void {
	modal.value = null;
}

// Sound toggle — the original tracked Main.enableSound and swapped
// Enable/Disable buttons. UI-only mirror here (no audio in the new stack yet).
const soundEnabled = ref(false);

// sandboxButton()/editorButton(): jump into the build controller with a fresh
// robot. Both enter the editor in the new stack (no separate challenge-editor
// mode in GameCore yet).
function enterEditor(): void {
	game.goToEditor(true);
}
</script>

<template>
	<div class="main-menu">
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
					<IbButton family="pink" class="mode-btn" disabled>
						Challenge Editor <IbTodo label="no challenge mode" />
					</IbButton>
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
						<IbButton family="orange" class="ls-btn" disabled>
							Import Replay <IbTodo label="no replays" />
						</IbButton>
						<IbButton family="orange" class="ls-btn" label="Import Bot" @click="modal = 'importRobot'" />
					</div>
					<div class="loadsave-col">
						<IbButton family="blue" class="ls-btn" disabled>
							Load Challenge <IbTodo label="no online" />
						</IbButton>
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
				@click="soundEnabled = !soundEnabled"
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
				<TutorialSelectPanel />
			</template>
		</UModal>

		<!-- Import Bot reuses the ported Import panel (paste an exported bot). -->
		<UModal
			:open="modal === 'importRobot'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closeModal()"
		>
			<template #content>
				<ImportPanel import-type="robot" @close="closeModal" />
			</template>
		</UModal>
	</div>
</template>

<style scoped>
.main-menu {
	height: 100vh;
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	/* Classic periwinkle page background from the original index.html. */
	background: #686d77;
	font-family: Arial, Helvetica, sans-serif;
	color: var(--ib-dark);
	overflow: auto;
	padding: 14px 16px;
	box-sizing: border-box;
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
</style>
