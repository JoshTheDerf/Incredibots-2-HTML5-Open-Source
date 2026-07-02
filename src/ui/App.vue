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
import ImportPanel from "./components/panels/ImportPanel.vue";
import ExportPanel from "./components/panels/ExportPanel.vue";
import SandboxSettingsPanel from "./components/panels/SandboxSettingsPanel.vue";
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
const { replay, challenge } = storeToRefs(game);

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
const showScore = computed(
	() => !scoreDismissed.value && (challenge.value?.outcome === "won" || challenge.value?.outcome === "failed"),
);
watch(
	() => challenge.value?.outcome,
	(o) => {
		if (o !== "won" && o !== "failed") scoreDismissed.value = false;
	},
);

// Exactly one panel is open at a time; `null` means all modals closed. The
// MenuBar emits which panel to open.
const activePanel = ref<PanelKey | null>(null);

function openPanel(panel: PanelKey): void {
	activePanel.value = panel;
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
		<MainMenu v-if="game.appMode === 'menu'" />

		<div v-else-if="inEditor" class="editor-shell">
			<!-- Thin top menu strip (legacy DropDownMenu, 21px). -->
			<MenuBar @open="openPanel" />

			<!-- The play canvas fills the whole area below the menu bar; the
			     toolbar and the part-edit panel OVERLAY it, exactly like the
			     legacy MainEditPanel (top) and PartEditWindow (left) which are
			     drawn on top of the game view. -->
			<div class="workspace">
				<StagePlaceholder />

				<!-- Toolbar pinned to the top, overlaying the canvas. Save Replay
				     (running/paused) surfaces here; App opens ExportPanel in replay
				     mode. -->
				<div class="toolbar-overlay">
					<ToolPalette @save-replay="openPanel('exportReplay')" />
				</div>

				<!-- Part-edit panel pinned to the LEFT, under the toolbar,
				     overlaying the canvas (legacy PartEditWindow at x=0,y=90). -->
				<div class="inspector-overlay">
					<PartInspectorFull />
				</div>

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

		<UModal
			:open="activePanel === 'sandboxSettings'"
			:ui="{ content: 'ib-modal-content' }"
			@update:open="(v: boolean) => !v && closePanel()"
		>
			<template #content>
				<SandboxSettingsPanel @ok="closePanel" @cancel="closePanel" />
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
	height: 100vh;
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
   toolbar (legacy PartEditWindow y=90), running down the side. */
.inspector-overlay {
	position: absolute;
	top: 84px;
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
