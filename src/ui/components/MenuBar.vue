<script setup lang="ts">
// Top menu bar — mirrors the old Pixi DropDownMenu (File / Edit / View / Help /
// Challenge). Items that map to REAL, implemented GameCore commands dispatch
// directly (New Robot → newRobot, Undo/Redo, Delete Selected → deleteParts).
// Items that open a ported panel emit an `open` event carrying the panel key;
// App.vue owns the modal state and mounts the panels. Everything else stays a
// placeholder click (no-op) until its command lands in GameCore.
import { useGameStore } from "../gameStore";
import { frameTextures } from "../assets";
import type { DropdownMenuItem } from "@nuxt/ui";

const logoSrc = frameTextures.logo;

const game = useGameStore();

/** Panel keys App.vue knows how to open as modals. */
export type PanelKey =
	| "import"
	| "export"
	| "sandboxSettings"
	| "conditions"
	| "restrictions"
	| "colour";

const emit = defineEmits<{ open: [panel: PanelKey] }>();

function open(panel: PanelKey): void {
	emit("open", panel);
}

const fileMenu: DropdownMenuItem[][] = [
	[
		// Real command: newRobot (safe-warns if not yet migrated).
		{ label: "New Robot", icon: "i-lucide-file-plus", onSelect: () => game.dispatch({ type: "newRobot" }) },
	],
	[
		// Open the ported Import / Export panels as modals.
		{ label: "Import...", icon: "i-lucide-clipboard-paste", onSelect: () => open("import") },
		{ label: "Export...", icon: "i-lucide-share", onSelect: () => open("export") },
	],
	[
		// UI-layer navigation back to the main menu screen (gameStore.appMode).
		{ label: "Main Menu", icon: "i-lucide-home", onSelect: () => game.goToMenu() },
	],
];

const editMenu: DropdownMenuItem[][] = [
	[
		// Real commands.
		{ label: "Undo", icon: "i-lucide-undo-2", onSelect: () => game.dispatch({ type: "undo" }) },
		{ label: "Redo", icon: "i-lucide-redo-2", onSelect: () => game.dispatch({ type: "redo" }) },
	],
	[
		// Real command: deleteParts on the current selection.
		{
			label: "Delete Selected",
			icon: "i-lucide-trash-2",
			onSelect: () => game.dispatch({ type: "deleteParts", partIds: game.edit.selection }),
		},
		// Real command (setColour) lives inside the ColorPickerPanel modal.
		{ label: "Colour...", icon: "i-lucide-palette", onSelect: () => open("colour") },
	],
];

const viewMenu: DropdownMenuItem[][] = [
	[
		// Opens the ported Advanced Sandbox Setup panel.
		{ label: "Sandbox Settings...", icon: "i-lucide-sliders-horizontal", onSelect: () => open("sandboxSettings") },
	],
];

const challengeMenu: DropdownMenuItem[][] = [
	[
		{ label: "Conditions...", icon: "i-lucide-flag", onSelect: () => open("conditions") },
		{ label: "Restrictions...", icon: "i-lucide-ban", onSelect: () => open("restrictions") },
	],
];

const helpMenu: DropdownMenuItem[][] = [
	[
		{ label: "Incredibots Help", icon: "i-lucide-life-buoy" },
		{ label: "Forums", icon: "i-lucide-message-circle" },
	],
	[{ label: "About / Credits", icon: "i-lucide-info" }],
];
</script>

<template>
	<div class="menu-bar">
		<img :src="logoSrc" alt="Incredibots 2" class="logo" />

		<UDropdownMenu :items="fileMenu" :content="{ align: 'start' }">
			<UButton label="File" color="neutral" variant="ghost" size="sm" class="menu-trigger" />
		</UDropdownMenu>
		<UDropdownMenu :items="editMenu" :content="{ align: 'start' }">
			<UButton label="Edit" color="neutral" variant="ghost" size="sm" class="menu-trigger" />
		</UDropdownMenu>
		<UDropdownMenu :items="viewMenu" :content="{ align: 'start' }">
			<UButton label="View" color="neutral" variant="ghost" size="sm" class="menu-trigger" />
		</UDropdownMenu>
		<UDropdownMenu :items="challengeMenu" :content="{ align: 'start' }">
			<UButton label="Challenge" color="neutral" variant="ghost" size="sm" class="menu-trigger" />
		</UDropdownMenu>
		<UDropdownMenu :items="helpMenu" :content="{ align: 'start' }">
			<UButton label="Help" color="neutral" variant="ghost" size="sm" class="menu-trigger" />
		</UDropdownMenu>

		<div class="spacer" />
		<span class="build-tag">editor chrome — frame only</span>
	</div>
</template>

<style scoped>
.menu-bar {
	display: flex;
	align-items: center;
	gap: 2px;
	height: 40px;
	padding: 0 12px;
	/* Original PIXI dark chrome menu strip: dark fill, purple bottom edge,
	   thin bevel highlight along the top. */
	background: #242930;
	border-bottom: 3px solid #43366f;
	box-shadow: inset 0 1px 0 rgba(183, 170, 227, 0.18);
	font-family: Arial, Helvetica, sans-serif;
}

.logo {
	height: 24px;
	width: auto;
	margin-right: 16px;
	image-rendering: auto;
}

.menu-trigger {
	font-family: Arial, Helvetica, sans-serif;
	font-weight: bold;
	color: #fdf9ea;
}

.spacer {
	flex: 1;
}

.build-tag {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 10px;
	color: #a08ed2;
}
</style>
