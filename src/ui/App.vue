<script setup lang="ts">
// Editor chrome frame — composes the top menu bar, tool palette, center
// stage placeholder, part inspector, and status bar around the Pinia
// binding to the headless GameCore. This is a structural frame, not a
// finished UI: the real Pixi canvas is not embedded, and several Commands
// are not yet migrated in GameCore (dispatch is a safe wrapper — see
// gameStore.ts).
//
// The MenuBar's real commands (newRobot / undo / redo / deleteParts) dispatch
// directly from MenuBar.vue. Menu items that open a ported panel emit an
// `open` event; here we own the single "which panel is showing" state and
// mount each ported panel inside a Nuxt UI UModal (parchment .ib-panel look is
// preserved because the panels are rendered bare in the modal `#content` slot,
// not editing the panel internals).
import { onMounted, onBeforeUnmount, ref, computed, watch } from "vue";
import { useGameStore } from "./gameStore";
import MainMenu from "./components/MainMenu.vue";
import MenuBar from "./components/MenuBar.vue";
import type { PanelKey } from "./components/MenuBar.vue";
import ToolPalette from "./components/ToolPalette.vue";
import StagePlaceholder from "./components/StagePlaceholder.vue";
import PartInspectorFull from "./components/panels/PartInspectorFull.vue";
import HintOverlay from "./components/HintOverlay.vue";
import StatusBar from "./components/StatusBar.vue";
import MobileControlPad from "./components/MobileControlPad.vue";
import { useIsMobile } from "./useIsMobile";
import ImportPanel from "./components/panels/ImportPanel.vue";
import ExportPanel from "./components/panels/ExportPanel.vue";
import ConvertPanel from "./components/panels/ConvertPanel.vue";
import SandboxSettingsPanel from "./components/panels/SandboxSettingsPanel.vue";
import WaterSettingsPanel from "./components/panels/WaterSettingsPanel.vue";
import ConditionsPanel from "./components/panels/ConditionsPanel.vue";
import RestrictionsPanel from "./components/panels/RestrictionsPanel.vue";
import ColorPickerPanel from "./components/panels/ColorPickerPanel.vue";
import TutorialPanel from "./components/panels/TutorialPanel.vue";
import PostReplayPanel from "./components/panels/PostReplayPanel.vue";
import ScorePanel from "./components/panels/ScorePanel.vue";
import { storeToRefs } from "pinia";

// Top-level screen switch. `appMode` is a UI-only ref in gameStore (NOT part of
// GameCore) — 'menu' shows the ported MainMenu, 'editor' shows the editor
// chrome below. Boots to 'menu', matching the original ControllerMainMenu flow.
const game = useGameStore();
const { replay, challenge, tutorial } = storeToRefs(game);

// Mobile gate for all layout/behaviour tweaks below the breakpoint. Desktop is
// untouched (isMobile === false).
const isMobile = useIsMobile();

// The on-screen key pad shows only on mobile while the sim is running (there is
// nothing to drive while editing). phase lives in the store's sim state.
const showControlPad = computed(() => isMobile.value && game.sim.phase === "running");

// The part-properties inspector is an EDIT-time control; the legacy PartEditWindow
// hid once the simulation started (simStarted). Show it only during the editing
// phase — a correctness fix that applies on desktop too (editing controls must
// not linger mid-simulation).
const editing = computed(() => game.sim.phase === "editing");

// The editor chrome renders for both the plain sandbox ("editor") and the
// challenge editor ("challengeEditor") — same canvas + toolbar + inspector. The
// only difference is that the challenge-authoring menus/panels light up when a
// challenge is active (gated in MenuBar on game.challenge). goToMenu/exitChallenge
// return to "menu"/"editor" cleanly (appMode is a plain UI ref in the store).
const inEditor = computed(() => game.appMode === "editor" || game.appMode === "challengeEditor");

// Score panel: shown when a challenge/tutorial run finishes (challenge.outcome
// is "won"/"failed"; ChallengeState.outcome in src/core/challenge.ts). Legacy
// ScoreWindow popped up on ControllerChallenge win/loss. `scoreDismissed` lets the
// panel's Close/Main-Menu/Retry buttons hide the overlay even in the modes where
// they don't dispatch a state change (HomeMovies/ChallengeEditor); it resets when
// a new run starts so the next win/loss shows the panel again.
const scoreDismissed = ref(false);
// A tutorial win (state.tutorial.won latches on the "won" event) shows the SAME
// congratulations panel the challenges use — legacy ControllerGame.Update popped a
// ScoreWindow on ChallengeOver for both ControllerTutorial and the built-in
// challenges (ControllerGame.as:2337-2360). ScorePanel's "Main Menu" button then
// returns to the menu, satisfying the "congrats popup -> main menu" tutorial flow.
const tutorialWon = computed(() => tutorial.value?.won === true);
const showScore = computed(
	() =>
		!scoreDismissed.value &&
		(challenge.value?.outcome === "won" || challenge.value?.outcome === "failed" || tutorialWon.value),
);
watch(
	[() => challenge.value?.outcome, tutorialWon],
	([o, tw]) => {
		// Re-arm the panel when a fresh run starts (outcome cleared AND not a
		// latched tutorial win) so the next win/loss shows it again.
		if (o !== "won" && o !== "failed" && !tw) scoreDismissed.value = false;
	},
);

// Exactly one panel is open at a time; `null` means all modals closed. The
// MenuBar emits which panel to open.
const activePanel = ref<PanelKey | null>(null);

// On mobile the left inspector is a collapsible bottom-sheet so it doesn't
// cover the canvas; this tracks whether that sheet is open. Desktop ignores it
// (the inspector is always shown as the fixed left panel).
const inspectorOpen = ref(false);

// Discoverability: on mobile the part-properties sheet is closed by default, so
// selecting a part on desktop shows its editor but on mobile nothing appeared
// (users couldn't find how to open properties). Auto-open the sheet when a part
// becomes selected, and auto-close it when the selection is cleared, so tapping a
// part reveals its properties — mirroring the desktop "select → inspector shows".
watch(
	() => game.edit.selection.length,
	(count) => {
		if (!isMobile.value) return;
		inspectorOpen.value = count > 0;
	},
);

function openPanel(panel: PanelKey): void {
	activePanel.value = panel;
}

// "Advanced Sandbox" (MainMenu): enter a fresh sandbox editor AND open the
// Sandbox Settings panel immediately, so the player configures gravity/size/
// terrain up front — the role of the legacy AdvancedSandboxWindow.
function onAdvancedSandbox(): void {
	game.goToEditor(true);
	openPanel("sandboxSettings");
}

function closePanel(): void {
	activePanel.value = null;
}

// Escape closes whatever modal/panel is open, mirroring ControllerGame.keyPress's
// Escape cascade (ControllerGame.ts:1929-1976), which hid whichever dialog was
// visible. Here App owns the single modal-panel state, so Escape closes it. If a
// challenge condition-pick is in progress (game.conditionDraft), Escape cancels
// it instead (dispatch cancelConditionPick), matching the legacy behaviour where
// Escape also aborts the in-progress condition selection. Legacy fires on key-UP
// (key 27), so we bind keyup.
function onWindowKeyUp(event: KeyboardEvent): void {
	if (event.keyCode !== 27) return; // Escape
	if (game.conditionDraft) {
		game.dispatch({ type: "cancelConditionPick" });
		return;
	}
	// Abort an in-progress joint/thruster gesture (prismatic two-click or >2-overlap
	// disambiguation) — part of the legacy Escape cascade that reset curAction.
	if (game.jointGesture) {
		game.dispatch({ type: "cancelJointGesture" });
		return;
	}
	if (activePanel.value !== null) {
		closePanel();
		return;
	}
	// Also dismiss a lingering core notice dialog on Escape.
	if (game.notice) game.dismissNotice();
}

onMounted(() => {
	window.addEventListener("keyup", onWindowKeyUp);
});

onBeforeUnmount(() => {
	window.removeEventListener("keyup", onWindowKeyUp);
});
</script>

<template>
	<UApp>
		<MainMenu v-if="game.appMode === 'menu'" @advanced-sandbox="onAdvancedSandbox" />

		<div v-else-if="inEditor" class="editor-shell" :class="{ 'is-mobile': isMobile }">
			<!-- Thin top menu strip (legacy DropDownMenu, 21px). -->
			<MenuBar @open="openPanel" />

			<!-- The play canvas fills the whole area below the menu bar; the
			     toolbar and the part-edit panel OVERLAY it, exactly like the
			     legacy MainEditPanel (top) and PartEditWindow (left) which are
			     drawn on top of the game view. -->
			<div class="workspace">
				<StagePlaceholder />

				<!-- Uneditable-robot banner (Wave 3a): a loaded robot saved with an
				     "Uneditable" exposure blocks every editing mutation at the core
				     funnel. Surface a persistent chip so the disabled edits are
				     explained rather than mysteriously inert. -->
				<div v-if="game.edit.editable === false" class="uneditable-banner">
					🔒 This robot cannot be edited
				</div>

				<!-- Toolbar pinned to the top, overlaying the canvas. Save Replay
				     (running/paused) surfaces here; App opens ExportPanel in replay
				     mode. -->
				<div class="toolbar-overlay">
					<ToolPalette @save-replay="openPanel('exportReplay')" />
				</div>

				<!-- Part-edit panel pinned to the LEFT, under the toolbar,
				     overlaying the canvas (legacy PartEditWindow at x=0,y=90). On
				     mobile it becomes a collapsible bottom-sheet (see .is-mobile
				     styles) toggled by the button below, so it doesn't cover the
				     canvas; desktop keeps the fixed left panel unchanged. -->
				<div v-if="editing" class="inspector-overlay" :class="{ open: !isMobile || inspectorOpen }">
					<PartInspectorFull />
				</div>

				<!-- Mobile-only toggle for the inspector bottom-sheet. -->
				<button
					v-if="isMobile && editing"
					type="button"
					class="inspector-toggle"
					:aria-expanded="inspectorOpen"
					@click="inspectorOpen = !inspectorOpen"
				>
					{{ inspectorOpen ? "Close Part Editor ▾" : "Part Editor ▴" }}
				</button>

				<!-- On-screen key controls (mobile + sim running only). -->
				<MobileControlPad v-if="showControlPad" />

				<!-- Tutorial dialog bubble (self-hides when no active message) and
				     the post-replay window (shown once a replay playback finishes).
				     Floated over the stage like the legacy draggable dialogs. -->
				<div class="tutorial-overlay">
					<TutorialPanel />
				</div>
				<div v-if="replay.finished" class="post-replay-overlay">
					<PostReplayPanel @close="game.dispatch({ type: 'stopReplay' })" />
				</div>

				<!-- Score / results panel — shown once a challenge or tutorial run
				     finishes (challenge.outcome won/failed). ScorePanel reads the
				     score off game.challenge itself (no props); we only mount it. -->
				<div v-if="showScore" class="score-overlay">
					<ScorePanel @close="scoreDismissed = true" />
				</div>

				<!-- Hint-text banners (rotate/resize/condition prompts) + the core
				     notice dialog (play-refused / limit messages). Overlaid over the
				     stage, non-interactive except the notice's OK button. -->
				<HintOverlay />
			</div>

			<StatusBar />
		</div>

		<!-- Ported panels mounted as modals. `#content` renders each panel bare
		     so its own .ib-panel parchment frame shows (no extra Nuxt header),
		     and its close/ok/cancel emits close the modal. `:ui` shrinks the
		     content wrapper to the panel's own fixed width. -->
		<UModal
			:open="activePanel === 'import'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closePanel()"
		>
			<template #content>
				<ImportPanel @close="closePanel" />
			</template>
		</UModal>

		<!-- Import And Insert — ImportPanel in robot insert mode (append the loaded
		     robot's parts to the current robot via game.importRobotInsert). -->
		<UModal
			:open="activePanel === 'importInsert'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closePanel()"
		>
			<template #content>
				<ImportPanel :insert="true" @close="closePanel" />
			</template>
		</UModal>

		<!-- Convert — code <-> file conversion (both directions). -->
		<UModal
			:open="activePanel === 'convert'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closePanel()"
		>
			<template #content>
				<ConvertPanel @close="closePanel" />
			</template>
		</UModal>

		<UModal
			:open="activePanel === 'export'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closePanel()"
		>
			<template #content>
				<ExportPanel @close="closePanel" />
			</template>
		</UModal>

		<!-- Import Replay — ImportPanel in replay mode (paste an exported replay;
		     the panel decodes + starts playback via game.importReplay). -->
		<UModal
			:open="activePanel === 'importReplay'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closePanel()"
		>
			<template #content>
				<ImportPanel import-type="replay" @close="closePanel" />
			</template>
		</UModal>

		<!-- Save Replay — ExportPanel in replay mode (robot-str "replay" makes it
		     encode the recorded replay via game.exportReplayString). -->
		<UModal
			:open="activePanel === 'exportReplay'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closePanel()"
		>
			<template #content>
				<ExportPanel robot-str="replay" @close="closePanel" />
			</template>
		</UModal>

		<!-- Export Challenge — ExportPanel in challenge mode (robot-str "challenge"
		     encodes the authored challenge via game.exportChallengeString). Opened
		     from Extras when a challenge is active. -->
		<UModal
			:open="activePanel === 'exportChallenge'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closePanel()"
		>
			<template #content>
				<ExportPanel robot-str="challenge" @close="closePanel" />
			</template>
		</UModal>

		<UModal
			:open="activePanel === 'sandboxSettings'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closePanel()"
		>
			<template #content>
				<SandboxSettingsPanel @ok="closePanel" @cancel="closePanel" />
			</template>
		</UModal>

		<!-- IB3 water settings (Gui/WaterWindow.as) — P6 water panel. -->
		<UModal
			:open="activePanel === 'waterSettings'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closePanel()"
		>
			<template #content>
				<WaterSettingsPanel @ok="closePanel" @cancel="closePanel" />
			</template>
		</UModal>

		<UModal
			:open="activePanel === 'conditions'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closePanel()"
		>
			<template #content>
				<ConditionsPanel @close="closePanel" />
			</template>
		</UModal>

		<UModal
			:open="activePanel === 'restrictions'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closePanel()"
		>
			<template #content>
				<RestrictionsPanel @close="closePanel" />
			</template>
		</UModal>

		<UModal
			:open="activePanel === 'colour'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closePanel()"
		>
			<template #content>
				<ColorPickerPanel @cancel="closePanel" />
			</template>
		</UModal>
	</UApp>
</template>

<style scoped>
.editor-shell {
	display: flex;
	flex-direction: column;
	/* Dynamic viewport height so the shell fits the *visible* area on mobile
	   (100vh includes the space behind the browser's dynamic address bar, which
	   overflows and forces page scroll). 100vh is kept as a fallback for
	   browsers without dvh support. */
	height: 100vh;
	height: 100dvh;
	background: #686d77;
	color: #fdf9ea;
	font-family: Arial, Helvetica, sans-serif;
}

/* The workspace is a positioned canvas region; the toolbar and inspector are
   absolutely-positioned overlays on top of it (matching the legacy game where
   the Pixi MainEditPanel / PartEditWindow are drawn over the play view). */
.workspace {
	flex: 1;
	display: flex;
	min-height: 0;
	position: relative;
}

/* StagePlaceholder (the real Pixi canvas host) fills the whole workspace. */
.workspace > :first-child {
	position: absolute;
	inset: 0;
}

/* Uneditable-robot banner — a persistent chip pinned to the top-center, above
   the toolbar, in the legacy purple/cream palette. */
.uneditable-banner {
	position: absolute;
	top: 8px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 40;
	padding: 4px 14px;
	border: 2px solid #43366f;
	border-radius: 10px;
	background: rgba(253, 249, 234, 0.95);
	color: #43366f;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	font-weight: bold;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
	pointer-events: none;
	white-space: nowrap;
}

/* Toolbar overlay — pinned across the top, overlaying the canvas. */
.toolbar-overlay {
	position: absolute;
	top: 6px;
	left: 6px;
	right: 6px;
	z-index: 15;
	pointer-events: auto;
}

/* Part-edit panel overlay — pinned to the left edge, starting just below the
   toolbar (legacy PartEditWindow y=90), running down the side.
   top clears the toolbar (top:6px + ToolPalette height) with an ~8-12px gap so
   the inspector no longer tucks under the toolbar on desktop. Mobile overrides
   this below (.editor-shell.is-mobile .inspector-overlay). */
.inspector-overlay {
	position: absolute;
	top: 124px;
	left: 6px;
	bottom: 8px;
	z-index: 14;
	pointer-events: auto;
}

.tutorial-overlay {
	position: absolute;
	top: 96px;
	left: 170px;
	z-index: 20;
	pointer-events: auto;
}

.post-replay-overlay {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 30;
}

.score-overlay {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 31;
}

/* ---- Mobile (<=768px / coarse pointer) — desktop above is unchanged ---- */

/* The toolbar overlay can be wide; on mobile let it scroll horizontally and hug
   the top edge without spilling under the menu. */
.editor-shell.is-mobile .toolbar-overlay {
	top: 2px;
	left: 2px;
	right: 2px;
	overflow-x: auto;
	-webkit-overflow-scrolling: touch;
}

/* Inspector becomes a bottom-sheet that slides up from the bottom edge, so it
   overlays the lower canvas instead of the tall left strip. Closed = slid off
   screen. Toggled via .open. */
.editor-shell.is-mobile .inspector-overlay {
	top: auto;
	left: 0;
	right: 0;
	bottom: 0;
	/* Keep the properties sheet low — it should cover roughly the bottom third,
	   not rise into the play area (dvh so it tracks the visible mobile viewport). */
	max-height: 40dvh;
	transform: translateY(100%);
	transition: transform 0.2s ease;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
	background: rgba(36, 41, 48, 0.35);
}

.editor-shell.is-mobile .inspector-overlay.open {
	transform: translateY(0);
}

/* On mobile the inspector aside should span the sheet width rather than the
   fixed 150px left strip. */
.editor-shell.is-mobile .inspector-overlay :deep(.inspector) {
	width: 100%;
}

/* Toggle button for the bottom-sheet — a small tab pinned bottom-left. */
.inspector-toggle {
	position: absolute;
	left: 8px;
	bottom: 8px;
	z-index: 26;
	min-height: 40px;
	padding: 0 14px;
	border: 2px solid rgba(183, 170, 227, 0.7);
	border-radius: 10px;
	background: rgba(36, 41, 48, 0.85);
	color: #fdf9ea;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 13px;
	font-weight: bold;
	touch-action: manipulation;
	-webkit-tap-highlight-color: transparent;
}

/* Move the tutorial bubble in from the desktop 170px left offset when narrow. */
.editor-shell.is-mobile .tutorial-overlay {
	left: 8px;
	right: 8px;
	top: 60px;
}
</style>

<style>
/* The modal content wrapper should hug the ported panel's own fixed-width
   parchment frame rather than stretch to Nuxt UI's default panel size. The
   panels already carry their own .ib-panel background/border, so strip the
   wrapper's chrome and let it size to content. */
.ib-modal-content {
	width: auto;
	max-width: none;
	background: transparent;
	border: none;
	box-shadow: none;
	padding: 0;
}
</style>
