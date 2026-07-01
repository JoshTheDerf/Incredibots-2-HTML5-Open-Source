<script setup lang="ts">
// Top menu bar — mirrors the old Pixi DropDownMenu (File / Edit / View / Help).
// Items are placeholders; only a couple of real, implemented actions
// (New/Clear-ish select tool reset, etc.) are wired where the core supports it.
import { useGameStore } from "../gameStore";
import { frameTextures } from "../assets";
import type { DropdownMenuItem } from "@nuxt/ui";

const logoSrc = frameTextures.logo;

const game = useGameStore();

const fileMenu: DropdownMenuItem[][] = [
	[
		{ label: "New Robot", icon: "i-lucide-file-plus" },
		{ label: "Load...", icon: "i-lucide-folder-open" },
		{ label: "Save...", icon: "i-lucide-save" },
	],
	[{ label: "Main Menu", icon: "i-lucide-home" }],
];

const editMenu: DropdownMenuItem[][] = [
	[
		{ label: "Undo", icon: "i-lucide-undo-2", onSelect: () => game.dispatch({ type: "undo" }) },
		{ label: "Redo", icon: "i-lucide-redo-2", onSelect: () => game.dispatch({ type: "redo" }) },
	],
	[
		{ label: "Cut", icon: "i-lucide-scissors" },
		{ label: "Copy", icon: "i-lucide-copy" },
		{ label: "Paste", icon: "i-lucide-clipboard-paste" },
		{
			label: "Delete",
			icon: "i-lucide-trash-2",
			onSelect: () => game.dispatch({ type: "deleteParts", partIds: game.edit.selection }),
		},
	],
];

const viewMenu: DropdownMenuItem[][] = [
	[
		{ label: "Zoom In", icon: "i-lucide-zoom-in" },
		{ label: "Zoom Out", icon: "i-lucide-zoom-out" },
	],
	[
		{ label: "Show Joints", icon: "i-lucide-git-branch", type: "checkbox" as const },
		{ label: "Show Outlines", icon: "i-lucide-square-dashed", type: "checkbox" as const },
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
