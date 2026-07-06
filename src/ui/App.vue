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
import IbButton from "./components/IbButton.vue";
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

// Whether the part inspector is showing. It is SELECTION-DRIVEN on both
// platforms: closed by default (no part selected), opens when a part is
// selected, closes when the selection is cleared — matching the legacy
// PartEditWindow which only appeared once a part was picked. On DESKTOP the X
// close button also hides it (without deselecting); re-selecting a part brings
// it back. On MOBILE the same open/closed state drives the bottom-sheet the
// drag handle animates.
const inspectorOpen = ref(false);

// Selecting a part reveals its editor; clearing the selection hides it. Watch
// the selection identity (not just length) so switching between two single
// parts still re-opens the panel after an X-close.
watch(
	() => game.edit.selection.join(","),
	(ids) => {
		inspectorOpen.value = ids.length > 0;
	},
);

// ---- Mobile bottom-sheet drag handle ----------------------------------------
// A pink IB button straddling the top edge of the sheet acts as the handle: the
// user flick-drags it — down to close, up to open. When closed the sheet is
// translated so only that button peeks above the bottom edge (CSS
// calc(100% - PEEK_H)), so it's always grabbable. During an active drag we
// track the finger with an inline transform (no transition); on release, flick
// velocity decides open/closed (falling back to position), then we hand the
// transform back to the CSS class so the snap animates. A near-stationary press
// (a tap, not a drag) just toggles.
const inspectorEl = ref<HTMLElement | null>(null);
const dragOffset = ref<number | null>(null); // px translateY while dragging; null = idle
const PEEK_H = 34; // visible strip when closed — must match the CSS closed transform
const FLICK = 0.4; // px/ms — above this the drag direction wins over position
const TAP_SLOP = 6; // px of movement under which the press counts as a tap

const dragStyle = computed(() =>
	dragOffset.value == null
		? undefined
		: { transform: `translateY(${dragOffset.value}px)`, transition: "none" },
);

let dragStartY = 0;
let dragBaseOffset = 0;
let dragMaxOffset = 0;
let dragMoved = 0;
let lastMoveY = 0;
let lastMoveT = 0;
let dragVelocity = 0;

function onHandlePointerDown(e: PointerEvent): void {
	const el = inspectorEl.value;
	if (!el) return;
	dragMaxOffset = Math.max(0, el.offsetHeight - PEEK_H);
	dragBaseOffset = inspectorOpen.value ? 0 : dragMaxOffset;
	dragStartY = e.clientY;
	lastMoveY = e.clientY;
	lastMoveT = e.timeStamp;
	dragVelocity = 0;
	dragMoved = 0;
	dragOffset.value = dragBaseOffset;
	(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
	window.addEventListener("pointermove", onHandlePointerMove);
	window.addEventListener("pointerup", onHandlePointerUp);
	window.addEventListener("pointercancel", onHandlePointerUp);
	e.preventDefault();
}

function onHandlePointerMove(e: PointerEvent): void {
	dragMoved = Math.max(dragMoved, Math.abs(e.clientY - dragStartY));
	let off = dragBaseOffset + (e.clientY - dragStartY);
	off = Math.min(dragMaxOffset, Math.max(0, off));
	const dt = e.timeStamp - lastMoveT;
	if (dt > 0) dragVelocity = (e.clientY - lastMoveY) / dt;
	lastMoveY = e.clientY;
	lastMoveT = e.timeStamp;
	dragOffset.value = off;
	e.preventDefault();
}

function onHandlePointerUp(): void {
	window.removeEventListener("pointermove", onHandlePointerMove);
	window.removeEventListener("pointerup", onHandlePointerUp);
	window.removeEventListener("pointercancel", onHandlePointerUp);
	const off = dragOffset.value ?? 0;
	let open: boolean;
	if (dragMoved < TAP_SLOP) open = !inspectorOpen.value; // tap toggles
	else if (dragVelocity <= -FLICK) open = true;
	else if (dragVelocity >= FLICK) open = false;
	else open = off < dragMaxOffset / 2;
	inspectorOpen.value = open;
	dragOffset.value = null; // CSS class transform takes over (animated snap)
}

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
					<ToolPalette @save-replay="openPanel('exportReplay')" @open="openPanel" />
				</div>

				<!-- Part-edit panel pinned to the LEFT, under the toolbar,
				     overlaying the canvas (legacy PartEditWindow at x=0,y=90). On
				     mobile it becomes a collapsible bottom-sheet (see .is-mobile
				     styles) toggled by the button below, so it doesn't cover the
				     canvas; desktop keeps the fixed left panel unchanged. -->
				<div
					v-if="editing"
					ref="inspectorEl"
					class="inspector-overlay"
					:class="{ open: inspectorOpen, 'is-mobile': isMobile }"
					:style="dragStyle"
				>
					<!-- Mobile: a pink IB button (3/4 screen width) straddling the top
					     edge of the sheet is the drag handle. Flick down to close, up to
					     open (tap toggles). Peeks above the bottom edge when closed. -->
					<IbButton
						v-if="isMobile"
						family="pink"
						label="⇕ Properties"
						class="sheet-handle"
						:aria-expanded="inspectorOpen"
						@pointerdown="onHandlePointerDown"
					/>
					<PartInspectorFull @close="inspectorOpen = false" />
				</div>

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

/* Toolbar overlay — the legacy MainEditPanel was a FULL-WIDTH bar pinned to the
   very top, tucked UNDER the menu strip. So span the full width and pull the top
   a few px up behind the menu bar (which is raised above it via z-index in
   MenuBar.vue) so the toolbar underlaps the menu instead of floating below it. */
.toolbar-overlay {
	position: absolute;
	top: -14px;
	left: 0;
	right: 0;
	z-index: 15;
	pointer-events: auto;
}

/* Part-edit panel overlay — pinned to the left edge, starting just below the
   toolbar (legacy PartEditWindow y=90), running down the side. top clears the
   now-shorter toolbar (pulled up to underlap the menu) with a small gap. Mobile
   overrides this below (.editor-shell.is-mobile .inspector-overlay). */
.inspector-overlay {
	position: absolute;
	top: 96px;
	left: 6px;
	bottom: 8px;
	z-index: 14;
	pointer-events: auto;
}

/* Desktop: no part selected (or X-closed) hides the panel entirely. */
.inspector-overlay:not(.is-mobile):not(.open) {
	display: none;
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

/* On mobile the palette wraps (no horizontal scroll needed); keep it full width
   and pulled up to underlap the menu strip, the same way desktop does. */
.editor-shell.is-mobile .toolbar-overlay {
	top: -14px;
	left: 0;
	right: 0;
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
	   not rise into the play area (dvh so it tracks the visible mobile viewport).
	   The pink handle straddles the top and adds a little height on top. */
	max-height: calc(40dvh + 30px);
	/* Closed: slide down until only the ~34px handle peeks above the bottom edge
	   (PEEK_H in the script — keep in sync). Open: fully up. During a drag an
	   inline transform overrides both (see dragStyle). */
	transform: translateY(calc(100% - 34px));
	transition: transform 0.2s ease;
	/* Column so the handle sits above the panel; centered so the 75vw button is
	   horizontally centered. overflow visible lets the handle overlap the panel
	   top — the panel scrolls internally (PartInspectorFull .inspector-body). */
	display: flex;
	flex-direction: column;
	align-items: center;
	overflow: visible;
	background: transparent;
}

.editor-shell.is-mobile .inspector-overlay.open {
	transform: translateY(0);
}

/* The panel fills the remaining sheet height and scrolls inside itself. */
.editor-shell.is-mobile .inspector-overlay :deep(.inspector) {
	align-self: stretch;
	flex: 1;
	min-height: 0;
}

/* Pink IB drag handle: 3/4 of the screen width, short, centered, overlapping
   the top edge of the panel (negative margin pulls the panel up under it). It
   owns the vertical drag, so disable browser touch panning on it. */
.editor-shell.is-mobile .sheet-handle {
	width: 75vw;
	height: 30px;
	min-height: 30px;
	padding: 0;
	/* Sit lower onto the panel so the button overlaps its top border more
	   (~8px more than the previous -12px). */
	margin-bottom: -20px;
	z-index: 2;
	font-size: 13px;
	touch-action: none;
	-webkit-tap-highlight-color: transparent;
}

/* On mobile the inspector aside should span the sheet width rather than the
   fixed 150px left strip. */
.editor-shell.is-mobile .inspector-overlay :deep(.inspector) {
	width: 100%;
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
