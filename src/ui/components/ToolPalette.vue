<script setup lang="ts">
// Tool palette — a faithful port of the legacy Gui/MainEditPanel.ts toolbar.
//
// The original (MainEditPanel `super(0, 5, 800, 95)`) is a FULL-WIDTH, short
// parchment window pinned to the very top, tucked UNDER the DropDownMenu strip,
// overlaying the top of the play canvas. Its EDIT state lays the controls out in
// a two-row grid (MainEditPanel constructor x/y coordinates), grouped by column:
//   Row 1 (y=15): Circle · Rectangle · Triangle · Undo · Redo · Zoom In · Save… · Main Menu … Play!
//   Row 2 (y=45): Fixed Joint · Rotating Joint · Sliding Joint · Text · Paste · Zoom Out · Load… · Login/Logout
// with the tall "Play!" pinned far right spanning both rows. Each button had a
// specific width (Circle 105, Undo 60, Zoom 80, Save 95, Text 60, Paste 60…) so
// the two rows' columns line up — we reproduce that with a per-group CSS grid
// whose columns size to content (relative widths, aligned rows).
//
// When the sim is RUNNING/PAUSED the legacy panel swaps to m_gamePanel /
// m_pausePanel, which drop the build tools and show only Zoom + the transport
// (Pause/Resume · Stop · Save Replay). We mirror that: the editing tool groups
// are hidden mid-sim, leaving Zoom + transport — no stray editing buttons. We
// deliberately DON'T port the social contextual buttons (Rate/Comment/Link/
// Embed/Feature/Login) — there is no backend for them in this stack.
//
// Our stack also adds build tools the original lacked (Select pointer, Polygon,
// Thrusters, Bomb, Cannon, Rotate, Resize); they fold into the build/parts
// groups. Tool buttons dispatch {type:'setTool'} (active tool shown pressed);
// the file/edit/zoom/menu actions dispatch their commands or emit `open` so
// App.vue mounts the matching panel.
import { computed } from "vue";
import { useGameStore } from "../gameStore";
import IbButton from "./IbButton.vue";
import { frameTextures } from "../assets";
import { useIsMobile } from "../useIsMobile";
import type { ToolMode } from "../../core";
import type { ButtonFamily } from "../assets";
import type { PanelKey } from "./MenuBar.vue";

const game = useGameStore();

// On mobile the buttons collapse to icon-only (≥38px tap targets) and the bar
// wraps; desktop keeps the text labels + aligned grid.
const isMobile = useIsMobile();

const emit = defineEmits<{ saveReplay: []; open: [panel: PanelKey] }>();

// Original PIXI window frame (nine-patch) as this panel's background.
const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrame})` };

interface BarItem {
	key: string;
	label: string;
	family: ButtonFamily;
	icon: string; // shown INSTEAD of the label on mobile
	tool?: ToolMode; // present → a tool button (pressed state + setTool)
	onClick?: () => void; // present → an action button
}

interface BarGroup {
	key: string;
	cols: number; // grid columns = row-1 button count (rows align to it)
	items: BarItem[]; // row 1 first, then row 2
}

const phase = computed(() => game.sim.phase);
const editing = computed(() => phase.value === "editing");
const currentTool = computed(() => game.edit.tool);

function selectTool(tool: ToolMode): void {
	// Select is a TOGGLE: clicking it while already active drops to "pan" (a
	// single-pointer drag pans instead of marquee-selecting). Every other tool is
	// a plain set. See GameCanvas.onPointerDown.
	if (tool === "select" && game.edit.tool === "select") {
		game.dispatch({ type: "setTool", tool: "pan" });
		return;
	}
	game.dispatch({ type: "setTool", tool });
}

function onItem(item: BarItem): void {
	if (item.tool) selectTool(item.tool);
	else item.onClick?.();
}

const isPressed = (item: BarItem): boolean => (item.tool ? currentTool.value === item.tool : false);

// Action handlers (menu-bar parity: these live on the DropDownMenu too).
const undo = () => game.dispatch({ type: "undo" });
const redo = () => game.dispatch({ type: "redo" });
const paste = () => game.dispatch({ type: "pasteParts" });
const zoomIn = () => game.dispatch({ type: "zoomIn" });
const zoomOut = () => game.dispatch({ type: "zoomOut" });
const mainMenu = () => game.goToMenu();

// Build tool groups — hidden mid-sim (see template v-if="editing"). The edit
// group (undo/redo/paste) is kept SEPARATE below so it can cluster with the
// transport on mobile.
const toolGroups = computed<BarGroup[]>(() => {
	const groups: BarGroup[] = [
		{
			// Build tools — shapes (row 1) over joints + the powered parts (row 2).
			// Thrusters/Cannon/Bomb belong to the main part list, not a separate
			// horizontally-split group, so they live here in the build grid.
			key: "build",
			cols: 6,
			items: [
				{ key: "select", label: "Select", family: "blue", icon: "i-lucide-mouse-pointer-2", tool: "select" },
				{ key: "circle", label: "Circle", family: "blue", icon: "i-lucide-circle", tool: "newCircle" },
				{ key: "rect", label: "Rectangle", family: "blue", icon: "i-lucide-square", tool: "newRect" },
				{ key: "triangle", label: "Triangle", family: "blue", icon: "i-lucide-triangle", tool: "newTriangle" },
				{ key: "polygon", label: "Polygon", family: "blue", icon: "i-lucide-pentagon", tool: "newPolygon" },
				{ key: "text", label: "Text", family: "blue", icon: "i-lucide-type", tool: "newText" },
				// row 2
				{ key: "fj", label: "Fixed Joint", family: "blue", icon: "i-lucide-anchor", tool: "newFixedJoint" },
				{ key: "rj", label: "Rotating Joint", family: "blue", icon: "i-lucide-rotate-cw", tool: "newRevoluteJoint" },
				{ key: "pj", label: "Sliding Joint", family: "blue", icon: "i-lucide-move-horizontal", tool: "newPrismaticJoint" },
				{ key: "thrusters", label: "Thrusters", family: "blue", icon: "i-lucide-flame", tool: "newThrusters" },
				{ key: "cannon", label: "Cannon", family: "blue", icon: "i-lucide-crosshair", tool: "newCannon" },
				{ key: "bomb", label: "Bomb", family: "blue", icon: "i-lucide-bomb", tool: "newBomb" },
			],
		},
	];
	// Challenge authoring (Set Conditions / Restrictions) — legacy showed these
	// on the edit panel only when a challenge was active.
	if (game.challenge != null) {
		groups.push({
			key: "challenge",
			cols: 1,
			items: [
				{ key: "conditions", label: "Set Conditions", family: "blue", icon: "i-lucide-flag", onClick: () => emit("open", "conditions") },
				{ key: "restrictions", label: "Restrictions", family: "blue", icon: "i-lucide-ban", onClick: () => emit("open", "restrictions") },
			],
		});
	}
	return groups;
});

// Edit group (undo/redo/paste). On desktop it's a 2-row grid next to the tools;
// on mobile it collapses to a single inline row that shares one non-wrapping
// cluster with the Play transport (see .edit-cluster / .g-edit styles).
const editGroup: BarGroup = {
	key: "edit",
	cols: 2,
	items: [
		{ key: "undo", label: "Undo", family: "orange", icon: "i-lucide-undo-2", onClick: undo },
		{ key: "redo", label: "Redo", family: "orange", icon: "i-lucide-redo-2", onClick: redo },
		// row 2 (desktop grid); on mobile all three sit in one row
		{ key: "paste", label: "Paste", family: "orange", icon: "i-lucide-clipboard-paste", onClick: paste },
	],
};

// Zoom + Transform + File groups sit to the right of the tools. Zoom stays
// visible mid-sim (legacy kept Zoom In/Out on the game/pause panels); Transform
// (Rotate/Resize, in the same view area as Zoom) and File are edit-only. All
// three are hidden on mobile (see template) to keep the narrow bar uncluttered.
const zoomGroup: BarGroup = {
	key: "zoom",
	cols: 1,
	items: [
		{ key: "zoomIn", label: "Zoom In", family: "pink", icon: "i-lucide-zoom-in", onClick: zoomIn },
		{ key: "zoomOut", label: "Zoom Out", family: "pink", icon: "i-lucide-zoom-out", onClick: zoomOut },
	],
};

// Rotate/Resize live next to Zoom (the "view/transform" area), not with the
// build parts. Tool buttons (pressed state), so onItem routes them via setTool.
const transformGroup: BarGroup = {
	key: "transform",
	cols: 1,
	items: [
		{ key: "rotate", label: "Rotate", family: "pink", icon: "i-lucide-rotate-3d", tool: "rotate" },
		{ key: "resize", label: "Resize", family: "pink", icon: "i-lucide-scaling", tool: "resize" },
	],
};

const fileGroup = computed<BarGroup>(() => ({
	key: "file",
	cols: 2,
	items: [
		{ key: "save", label: "Save...", family: "purple", icon: "i-lucide-save", onClick: () => emit("open", "export") },
		{ key: "menu", label: "Main Menu", family: "purple", icon: "i-lucide-home", onClick: mainMenu },
		// row 2
		{ key: "load", label: "Load...", family: "purple", icon: "i-lucide-folder-open", onClick: () => emit("open", "import") },
	],
}));

function play(): void {
	game.dispatch({ type: "play" });
}
function pause(): void {
	game.dispatch({ type: "pause" });
}
function reset(): void {
	game.dispatch({ type: "reset" });
}
</script>

<template>
	<div class="tool-palette ib-panel" :class="{ 'is-mobile': isMobile }" :style="panelStyle">
		<!-- Build tool groups (build / challenge) — hidden mid-sim so no stray
		     editing buttons linger, matching the legacy game panel. -->
		<template v-if="editing">
			<div v-for="grp in toolGroups" :key="grp.key" class="group" :style="{ '--cols': grp.cols }">
				<IbButton
					v-for="item in grp.items"
					:key="item.key"
					:family="item.family"
					:pressed="isPressed(item)"
					:class="{ 'icon-btn': isMobile }"
					:title="item.label"
					:aria-label="item.label"
					@click="onItem(item)"
				>
					<UIcon v-if="isMobile" :name="item.icon" class="tool-icon" />
					<template v-else>{{ item.label }}</template>
				</IbButton>
			</div>
		</template>

		<!-- Edit actions + transport cluster. On MOBILE this is ONE inline,
		     non-wrapping row — undo / redo / paste / Play together (the edit grid
		     collapses to a single row via .g-edit). On DESKTOP the cluster is
		     display:contents, so the edit group sits with the tools (order 0) and the
		     transport is pushed to the far right (order 3 + margin-left:auto). -->
		<div class="edit-cluster">
			<div v-if="editing" class="group g-edit" :style="{ '--cols': editGroup.cols }">
				<IbButton
					v-for="item in editGroup.items"
					:key="item.key"
					:family="item.family"
					:class="{ 'icon-btn': isMobile }"
					:title="item.label"
					:aria-label="item.label"
					@click="onItem(item)"
				>
					<UIcon v-if="isMobile" :name="item.icon" class="tool-icon" />
					<template v-else>{{ item.label }}</template>
				</IbButton>
			</div>

			<!-- The tall play-texture button is Play! while editing and Stop during
			     the sim; Pause/Resume + Save Replay stack beside it mid-sim. -->
			<div class="transport">
				<IbButton
					family="play"
					play
					:class="{ 'icon-btn': isMobile }"
					:title="editing ? 'Play!' : 'Stop'"
					:aria-label="editing ? 'Play!' : 'Stop'"
					@click="editing ? play() : reset()"
				>
					<UIcon v-if="isMobile" :name="editing ? 'i-lucide-play' : 'i-lucide-square'" class="tool-icon" />
					<template v-else>{{ editing ? "Play!" : "Stop" }}</template>
				</IbButton>
				<div v-if="!editing" class="transport-secondary">
				<IbButton
					v-if="phase === 'running'"
					family="red"
					:class="{ 'icon-btn': isMobile }"
					title="Pause"
					aria-label="Pause"
					@click="pause"
				>
					<UIcon v-if="isMobile" name="i-lucide-pause" class="tool-icon" />
					<template v-else>Pause</template>
				</IbButton>
				<IbButton
					v-else
					family="red"
					play
					:class="{ 'icon-btn': isMobile }"
					title="Resume"
					aria-label="Resume"
					@click="play"
				>
					<UIcon v-if="isMobile" name="i-lucide-play" class="tool-icon" />
					<template v-else>Resume</template>
				</IbButton>
				<!-- Save Replay — shown while the sim is running/paused (legacy game
				     and pause panels both carried it). Disabled when the recording is
				     marked non-saveable (fracture / bomb detonation / replay caps):
				     exportReplay refuses it, so the button greys out instead. -->
				<IbButton
					family="purple"
					:class="{ 'icon-btn': isMobile }"
					:disabled="!game.replay.canSave"
					:title="game.replay.canSave ? 'Save Replay' : 'Replay can\'t be saved (the run isn\'t reproducible)'"
					aria-label="Save Replay"
					@click="emit('saveReplay')"
				>
					<UIcon v-if="isMobile" name="i-lucide-save" class="tool-icon" />
					<template v-else>Save Replay</template>
				</IbButton>
				</div>
			</div>
		</div>

		<!-- View/transform area (Zoom In/Out + Rotate/Resize) — desktop only; hidden
		     on mobile to keep the narrow bar to the essentials. Zoom shows in every
		     sim state; Rotate/Resize are edit-only. -->
		<template v-if="!isMobile">
			<div class="group view-group" :style="{ '--cols': zoomGroup.cols }">
				<IbButton
					v-for="item in zoomGroup.items"
					:key="item.key"
					:family="item.family"
					:title="item.label"
					:aria-label="item.label"
					@click="onItem(item)"
				>
					{{ item.label }}
				</IbButton>
			</div>
			<div v-if="editing" class="group view-group" :style="{ '--cols': transformGroup.cols }">
				<IbButton
					v-for="item in transformGroup.items"
					:key="item.key"
					:family="item.family"
					:pressed="isPressed(item)"
					:title="item.label"
					:aria-label="item.label"
					@click="onItem(item)"
				>
					{{ item.label }}
				</IbButton>
			</div>
		</template>

		<!-- File group (Save / Load / Main Menu) — edit-only, desktop only. Set apart
		     from the tool groups with extra horizontal space (no divider). -->
		<template v-if="editing && !isMobile">
			<div class="group group--spaced" :style="{ '--cols': fileGroup.cols }">
				<IbButton
					v-for="item in fileGroup.items"
					:key="item.key"
					:family="item.family"
					:title="item.label"
					:aria-label="item.label"
					@click="onItem(item)"
				>
					{{ item.label }}
				</IbButton>
			</div>
		</template>
	</div>
</template>

<style scoped>
/* Full-width, short toolbar overlaying the top of the canvas (the .ib-panel
   nine-patch frame supplies the parchment background/border). Tight inner
   padding + gaps so the dense original button set fits. */
.tool-palette {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 3px 8px;
}

/* Each functional group is a 2-row grid whose columns size to their content, so
   the two rows line up in columns AND each button is only as wide as its label
   needs (relative widths, faithful to the legacy per-button widths). --cols is
   the row-1 button count; row-2 buttons flow into the same columns beneath. */
.group {
	display: grid;
	grid-template-columns: repeat(var(--cols, 1), auto);
	grid-auto-rows: 1fr;
	gap: 3px;
}

/* Buttons fill their grid cell (= column width) so a column's two rows match. */
.group :deep(.ib-btn) {
	width: 100%;
	height: 28px;
	font-size: 11px;
	padding: 0 8px;
}

/* Extra horizontal space (not a divider) sets the file group apart. */
.group--spaced {
	margin-left: 16px;
}

.transport {
	display: flex;
	align-items: center;
	gap: 6px;
}

/* DESKTOP flex ordering: the transport sits FIRST in the DOM (so it groups with
   the edit tools on mobile), but visually it belongs at the far right after the
   view/file groups. order + margin-left:auto put it there, replacing the old
   spacer. Tool groups default to order 0. */
.tool-palette:not(.is-mobile) .view-group {
	order: 1;
}
.tool-palette:not(.is-mobile) .group--spaced {
	order: 2;
}
.tool-palette:not(.is-mobile) .transport {
	order: 3;
	margin-left: auto;
}

/* DESKTOP: the cluster is transparent to layout — its children (edit group +
   transport) act as direct flex items of the palette, honouring the order rules
   above (edit stays with the tools, transport goes far right). */
.edit-cluster {
	display: contents;
}

.transport-secondary {
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.transport-secondary :deep(.ib-btn) {
	height: 28px;
	font-size: 11px;
	padding: 0 10px;
}

/* ---- Mobile: icon-only buttons, wrapping bar. Desktop is unchanged. ----
   NO hard width: the .ib-btn nine-patch has 18px end-caps per side (36px total),
   so a fixed 38px width would leave only ~2px for the glyph and crush it. Let the
   button size to its content (icon + caps); we only fix the height for a
   consistent finger-sized row. Spacing between buttons is controlled by the gaps
   below, not by squeezing the buttons. */
.icon-btn.ib-btn,
.group :deep(.icon-btn.ib-btn),
.transport-secondary :deep(.icon-btn.ib-btn) {
	min-height: 38px;
	height: 38px;
	padding: 0 2px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.tool-icon {
	width: 22px;
	height: 22px;
}

/* Mobile: the palette WRAPS so every tool stays on-screen. Gaps are 0 — the
   nine-patch button textures already carry their own visual spacing — and each
   button gets a 1px padding instead. The transport keeps its DOM position (right
   after the edit tools), so Play lands in the undo/redo/paste set. */
.tool-palette.is-mobile {
	flex-wrap: wrap;
	gap: 0;
	/* Reduced bottom padding compensates for the taller 3px button padding below. */
	padding: 2px 3px 0;
	justify-content: center;
}

.tool-palette.is-mobile .group {
	gap: 0;
}

.tool-palette.is-mobile .transport {
	gap: 0;
}

.tool-palette.is-mobile .icon-btn.ib-btn {
	padding: 3px;
}

/* MOBILE: the edit group + transport become ONE inline, non-wrapping row so
   undo / redo / paste / Play sit together (wrapping as a single unit). */
.tool-palette.is-mobile .edit-cluster {
	display: flex;
	flex-wrap: nowrap;
	align-items: center;
	gap: 0;
}

/* The edit group collapses from its 2-row desktop grid to a single row here. */
.tool-palette.is-mobile .g-edit {
	display: flex;
	gap: 0;
}

/* In the flex row the buttons must size to content, not the grid's width:100%. */
.tool-palette.is-mobile .g-edit :deep(.ib-btn) {
	width: auto;
}
</style>
