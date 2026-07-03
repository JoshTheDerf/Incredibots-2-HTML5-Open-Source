<script setup lang="ts">
// Top menu bar — a faithful port of the legacy Gui/DropDownMenu.ts strip.
// The original is a thin (21px) bar at the very top of the game frame with the
// text items File / Edit / View / Share! / Help / Extras laid out left-to-right
// and About pinned to the far right (DropDownMenu.ts: fileText x=0, editText
// x=40, viewText x=80, commentText/"Share!" x=120, helpText x=180, extrasText
// x=225, aboutText x=750). We reproduce that ordering and the right-pinned
// About here.
//
// Items that map to REAL, implemented GameCore commands dispatch directly
// (New Robot → newRobot, Undo/Redo, Delete → deleteParts). Items that open a
// ported panel emit an `open` event carrying the panel key; App.vue owns the
// modal state and mounts the panels. Everything else stays a placeholder click
// (no-op) — mirroring the legacy items that were browser redirects.
import { computed } from "vue";
import { useGameStore } from "../gameStore";
import { frameTextures } from "../assets";
import { soundService } from "../sound";
import { useIsMobile } from "../useIsMobile";
import { useUiPrefs } from "../uiPrefs";
import type { DropdownMenuItem } from "@nuxt/ui";

const logoSrc = frameTextures.logo;

const game = useGameStore();
// UI-local view prefs (Jaybit "Highlight Parts for Joint" / "Triangle Snapping"
// View-menu toggles). These are presentation/gesture flags, not core state.
const uiPrefs = useUiPrefs();

// On mobile the six text menu triggers won't fit a narrow strip, so they
// collapse into a single ⋯ button opening one grouped dropdown that preserves
// every item + its emit/dispatch. Desktop keeps the individual triggers.
const isMobile = useIsMobile();

/** Panel keys App.vue knows how to open as modals. */
export type PanelKey =
	| "import"
	| "importInsert"
	| "convert"
	| "export"
	| "importReplay"
	| "exportReplay"
	| "exportChallenge"
	| "sandboxSettings"
	| "conditions"
	| "restrictions"
	| "colour";

const emit = defineEmits<{ open: [panel: PanelKey] }>();

function open(panel: PanelKey): void {
	emit("open", panel);
}

// File menu — legacy BuildFileMenu (Main Menu / Save / Load* / Log In / High
// Scores / Report / Sound). We wire the items that have real commands or ported
// panels; New Robot maps to the "New" flow.
//
// The Sound toggle mirrors the legacy File-menu "Enable/Disable Sound" item
// (ControllerMainMenu sets Main.enableSound; the in-game menu offered the same
// switch). This is the ONLY place sound is reachable once the user is in the
// editor — the MainMenu toggle is out of reach in Sandbox mode. The click is a
// user gesture, so browser autoplay policy is satisfied. Label + icon reflect
// soundService.enabled reactively (the service state is a Vue ref), so it stays
// in sync with the MainMenu toggle. Computed for that reactivity.
const fileMenu = computed<DropdownMenuItem[][]>(() => [
	[{ label: "New Robot", icon: "i-lucide-file-plus", onSelect: () => game.dispatch({ type: "newRobot" }) }],
	[
		{ label: "Save...", icon: "i-lucide-share", onSelect: () => open("export") },
		{ label: "Load Robot...", icon: "i-lucide-clipboard-paste", onSelect: () => open("import") },
		// Jaybit "Import And Insert" (DropDownMenu.as:828) — append a loaded robot's
		// parts to the current robot instead of replacing (importRobotInsert).
		{ label: "Import And Insert...", icon: "i-lucide-file-input", onSelect: () => open("importInsert") },
	],
	// Replay transport (legacy BuildFileMenu Load Replay / Import Replay). Load
	// Replay opens ImportPanel in replay mode; importReplay decodes + plays back.
	[{ label: "Load Replay...", icon: "i-lucide-clapperboard", onSelect: () => open("importReplay") }],
	// Jaybit Convert window (code <-> file conversion; serialization-compat §4).
	[{ label: "Convert...", icon: "i-lucide-repeat", onSelect: () => open("convert") }],
	[
		{
			label: soundService.enabled ? "Disable Sound" : "Enable Sound",
			icon: soundService.enabled ? "i-lucide-volume-2" : "i-lucide-volume-x",
			onSelect: () => soundService.setEnabled(!soundService.enabled),
		},
	],
	[{ label: "Main Menu", icon: "i-lucide-home", onSelect: () => game.goToMenu() }],
]);

// Edit menu — legacy BuildEditMenu (Change Settings / Clear All / Undo / Redo /
// Cut / Copy / Paste / Delete / Move to Front / Move to Back).
const editMenu: DropdownMenuItem[][] = [
	[{ label: "Change Settings...", icon: "i-lucide-sliders-horizontal", onSelect: () => open("sandboxSettings") }],
	[{ label: "Clear All", icon: "i-lucide-eraser", onSelect: () => game.dispatch({ type: "clearAll" }) }],
	[
		{ label: "Undo", icon: "i-lucide-undo-2", onSelect: () => game.dispatch({ type: "undo" }) },
		{ label: "Redo", icon: "i-lucide-redo-2", onSelect: () => game.dispatch({ type: "redo" }) },
	],
	[
		{
			label: "Cut",
			icon: "i-lucide-scissors",
			onSelect: () => game.dispatch({ type: "cutParts", partIds: game.edit.selection }),
		},
		{
			label: "Copy",
			icon: "i-lucide-copy",
			onSelect: () => game.dispatch({ type: "copyParts", partIds: game.edit.selection }),
		},
		{
			label: "Paste",
			icon: "i-lucide-clipboard-paste",
			onSelect: () => game.dispatch({ type: "pasteParts" }),
		},
	],
	[
		{
			label: "Delete",
			icon: "i-lucide-trash-2",
			onSelect: () => game.dispatch({ type: "deleteParts", partIds: game.edit.selection }),
		},
		{ label: "Change Color...", icon: "i-lucide-palette", onSelect: () => open("colour") },
	],
	[
		{
			label: "Move to Front",
			icon: "i-lucide-bring-to-front",
			onSelect: () => game.dispatch({ type: "movePartsToFront", partIds: game.edit.selection }),
		},
		{
			label: "Move to Back",
			icon: "i-lucide-send-to-back",
			onSelect: () => game.dispatch({ type: "movePartsToBack", partIds: game.edit.selection }),
		},
	],
];

// View menu — legacy BuildViewMenu (Zoom In/Out + display toggles). Zoom adjusts
// camera.scale (ControllerGame.Zoom); the toggles flip the edit-view flags
// (jointBox/colourBox/globalOutlineBox/centerBox). Checkbox-style items reflect
// the current flag via a leading check icon; computed so they stay reactive.
const viewMenu = computed<DropdownMenuItem[][]>(() => {
	const check = (on: boolean) => (on ? "i-lucide-check" : "i-lucide-square");
	const e = game.edit;
	return [
		[
			{ label: "Zoom In", icon: "i-lucide-zoom-in", onSelect: () => game.dispatch({ type: "zoomIn" }) },
			{ label: "Zoom Out", icon: "i-lucide-zoom-out", onSelect: () => game.dispatch({ type: "zoomOut" }) },
		],
		[
			{ label: "Snap to Center", icon: check(e.snapToCenter), onSelect: () => game.dispatch({ type: "toggleSnapToCenter" }) },
			{ label: "Show Joints", icon: check(e.showJoints), onSelect: () => game.dispatch({ type: "toggleShowJoints" }) },
			{ label: "Show Colors", icon: check(e.showColours), onSelect: () => game.dispatch({ type: "toggleShowColours" }) },
			{ label: "Show Outlines", icon: check(e.showOutlines), onSelect: () => game.dispatch({ type: "toggleShowOutlines" }) },
		],
		// Jaybit View-menu additions (DropDownMenu.as:420/423). UI-local prefs, not
		// core state — highlightForJointBox / triangleSnappingBox.
		[
			{
				label: "Highlight Parts for Joint",
				icon: check(uiPrefs.highlightPartsForJoint.value),
				onSelect: () => uiPrefs.toggleHighlightPartsForJoint(),
			},
			{
				label: "Triangle Snapping",
				icon: check(uiPrefs.triangleSnapping.value),
				onSelect: () => uiPrefs.toggleTriangleSnapping(),
			},
		],
		// Center on Selection (legacy DropDownMenu.ts:277-286 → centerOnSelectedBox).
		[
			{
				label: "Center on Selection",
				icon: "i-lucide-crosshair",
				onSelect: () => game.dispatch({ type: "centerOnSelection" }),
			},
		],
	];
});

// Share! menu — legacy BuildCommentMenu (Comment / Link / Embed). No sharing
// backend in the new stack; placeholders like the original redirects.
const shareMenu: DropdownMenuItem[][] = [
	[
		{ label: "Comment on this Robot", icon: "i-lucide-message-square" },
		{ label: "Link to this Robot", icon: "i-lucide-link" },
		{ label: "Embed this Robot", icon: "i-lucide-code" },
	],
];

// Help menu — legacy BuildHelpMenu (Incredibots Help / Forums).
const helpMenu: DropdownMenuItem[][] = [
	[
		{ label: "Incredibots Help", icon: "i-lucide-life-buoy" },
		{ label: "Forums", icon: "i-lucide-message-circle" },
	],
];

// Extras menu — legacy BuildExtrasMenu (Mirror H/V / Scale / Thrusters /
// Cannon). Mirror/Scale aren't migrated; Conditions/Restrictions are ported
// panels folded in here (they belong to the challenge flow the sandbox extras
// menu shares).
// The Conditions/Restrictions items are challenge-authoring only: in the legacy
// app they lived on the ControllerChallenge controller, not the plain sandbox.
// Here their core handlers early-return when `game.challenge` is null, so we
// only SHOW them when a challenge is active (challengeEditor mode / a loaded
// challenge). Computed so the gate stays reactive to appMode/challenge changes.
const extrasMenu = computed<DropdownMenuItem[][]>(() => {
	const groups: DropdownMenuItem[][] = [
		[
			{
				label: "Mirror Horizontal",
				icon: "i-lucide-flip-horizontal",
				onSelect: () => game.dispatch({ type: "mirrorParts", partIds: game.edit.selection, axis: "horizontal" }),
			},
			{
				label: "Mirror Vertical",
				icon: "i-lucide-flip-vertical",
				onSelect: () => game.dispatch({ type: "mirrorParts", partIds: game.edit.selection, axis: "vertical" }),
			},
			{ label: "Scale...", icon: "i-lucide-scaling" },
		],
	];
	if (game.challenge != null) {
		groups.push([
			{ label: "Set Conditions...", icon: "i-lucide-flag", onSelect: () => open("conditions") },
			{ label: "Restrictions...", icon: "i-lucide-ban", onSelect: () => open("restrictions") },
			{ label: "Export Challenge...", icon: "i-lucide-share", onSelect: () => open("exportChallenge") },
		]);
	}
	return groups;
});

// About menu — legacy BuildAboutMenu (Credits / GrubbyGames.com), pinned right.
const aboutMenu: DropdownMenuItem[][] = [
	[
		{ label: "Credits", icon: "i-lucide-info" },
		{ label: "GrubbyGames.com", icon: "i-lucide-external-link" },
	],
];

// Mobile — collapse all six menus (plus About) into ONE dropdown whose top-level
// entries are the menu names, each carrying the original groups as submenu
// `children`. Same item objects (same onSelect/emit wiring) are reused, so no
// behaviour changes; only the presentation is compacted. Nuxt UI expects
// children as a flat array, so we flatten each menu's group array.
const mobileMenu = computed<DropdownMenuItem[][]>(() => [
	[
		{ label: "File", icon: "i-lucide-file", children: fileMenu.value.flat() },
		{ label: "Edit", icon: "i-lucide-pencil", children: editMenu.flat() },
		{ label: "View", icon: "i-lucide-eye", children: viewMenu.value.flat() },
		{ label: "Share!", icon: "i-lucide-share-2", children: shareMenu.flat() },
		{ label: "Help", icon: "i-lucide-life-buoy", children: helpMenu.flat() },
		{ label: "Extras", icon: "i-lucide-sparkles", children: extrasMenu.value.flat() },
		{ label: "About", icon: "i-lucide-info", children: aboutMenu.flat() },
	],
]);
</script>

<template>
	<div class="menu-bar">
		<img :src="logoSrc" alt="Incredibots 2" class="logo" />

		<!-- Mobile: one compact ⋯ button opening the grouped menu. -->
		<template v-if="isMobile">
			<div class="spacer" />
			<UDropdownMenu :items="mobileMenu" :content="{ align: 'end' }">
				<UButton
					icon="i-lucide-menu"
					color="neutral"
					variant="ghost"
					size="md"
					class="menu-trigger hamburger"
					aria-label="Menu"
				/>
			</UDropdownMenu>
		</template>

		<!-- Desktop: the original individual text triggers (unchanged). -->
		<template v-else>
		<div class="menu-items">
			<UDropdownMenu :items="fileMenu" :content="{ align: 'start' }">
				<UButton label="File" color="neutral" variant="ghost" size="xs" class="menu-trigger" />
			</UDropdownMenu>
			<UDropdownMenu :items="editMenu" :content="{ align: 'start' }">
				<UButton label="Edit" color="neutral" variant="ghost" size="xs" class="menu-trigger" />
			</UDropdownMenu>
			<UDropdownMenu :items="viewMenu" :content="{ align: 'start' }">
				<UButton label="View" color="neutral" variant="ghost" size="xs" class="menu-trigger" />
			</UDropdownMenu>
			<UDropdownMenu :items="shareMenu" :content="{ align: 'start' }">
				<UButton label="Share!" color="neutral" variant="ghost" size="xs" class="menu-trigger" />
			</UDropdownMenu>
			<UDropdownMenu :items="helpMenu" :content="{ align: 'start' }">
				<UButton label="Help" color="neutral" variant="ghost" size="xs" class="menu-trigger" />
			</UDropdownMenu>
			<UDropdownMenu :items="extrasMenu" :content="{ align: 'start' }">
				<UButton label="Extras" color="neutral" variant="ghost" size="xs" class="menu-trigger" />
			</UDropdownMenu>
		</div>

		<div class="spacer" />

		<UDropdownMenu :items="aboutMenu" :content="{ align: 'end' }">
			<UButton label="About" color="neutral" variant="ghost" size="xs" class="menu-trigger" />
		</UDropdownMenu>
		</template>
	</div>
</template>

<style scoped>
/* Thin top strip like the legacy 21px DropDownMenu bar: dark fill, purple
   bottom edge, faint top bevel. Items are compact and evenly spaced. */
.menu-bar {
	display: flex;
	align-items: center;
	height: 26px;
	padding: 0 8px;
	background: #242930;
	border-bottom: 2px solid #43366f;
	box-shadow: inset 0 1px 0 rgba(183, 170, 227, 0.18);
	font-family: Arial, Helvetica, sans-serif;
	flex-shrink: 0;
}

.logo {
	height: 18px;
	width: auto;
	margin-right: 14px;
	image-rendering: auto;
}

.menu-items {
	display: flex;
	align-items: center;
	gap: 0;
}

.menu-trigger {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	font-weight: bold;
	color: #e1e1ea;
	padding: 2px 10px;
}

/* The global theme paints `neutral`/`ghost` hover with the cream `bg-elevated`
   token, which reads wrong on the dark menu strip. Keep the trigger text light
   and give it a purple-tinted hover instead so it belongs to the dark chrome. */
.menu-trigger:hover,
.menu-trigger:focus-visible {
	color: #fff;
	background-color: rgba(160, 142, 210, 0.22) !important;
}

.spacer {
	flex: 1;
}

/* Mobile hamburger — a finger-sized tap target. The bar grows to fit it. */
.menu-bar:has(.hamburger) {
	height: 48px;
}

.hamburger {
	min-width: 44px;
	min-height: 44px;
	justify-content: center;
}
</style>
