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
import { ref } from "vue";
import { useGameStore } from "./gameStore";
import MainMenu from "./components/MainMenu.vue";
import MenuBar from "./components/MenuBar.vue";
import type { PanelKey } from "./components/MenuBar.vue";
import ToolPalette from "./components/ToolPalette.vue";
import StagePlaceholder from "./components/StagePlaceholder.vue";
import PartInspectorFull from "./components/panels/PartInspectorFull.vue";
import StatusBar from "./components/StatusBar.vue";
import ImportPanel from "./components/panels/ImportPanel.vue";
import ExportPanel from "./components/panels/ExportPanel.vue";
import SandboxSettingsPanel from "./components/panels/SandboxSettingsPanel.vue";
import ConditionsPanel from "./components/panels/ConditionsPanel.vue";
import RestrictionsPanel from "./components/panels/RestrictionsPanel.vue";
import ColorPickerPanel from "./components/panels/ColorPickerPanel.vue";

// Top-level screen switch. `appMode` is a UI-only ref in gameStore (NOT part of
// GameCore) — 'menu' shows the ported MainMenu, 'editor' shows the editor
// chrome below. Boots to 'menu', matching the original ControllerMainMenu flow.
const game = useGameStore();

// Exactly one panel is open at a time; `null` means all modals closed. The
// MenuBar emits which panel to open.
const activePanel = ref<PanelKey | null>(null);

function openPanel(panel: PanelKey): void {
	activePanel.value = panel;
}

function closePanel(): void {
	activePanel.value = null;
}
</script>

<template>
	<UApp>
		<MainMenu v-if="game.appMode === 'menu'" />

		<div v-else class="editor-shell">
			<MenuBar @open="openPanel" />
			<ToolPalette />
			<div class="workspace">
				<StagePlaceholder />
				<PartInspectorFull />
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

.workspace {
	flex: 1;
	display: flex;
	min-height: 0;
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
