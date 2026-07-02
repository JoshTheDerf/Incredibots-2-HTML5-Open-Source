<script setup lang="ts">
// Tool palette — a faithful port of the legacy Gui/MainEditPanel.ts toolbar.
//
// The original is a wide, short parchment panel pinned just under the menu bar
// and OVERLAYING the top of the play canvas. Its build tools are laid out in
// TWO rows (MainEditPanel.ts constructor coordinates):
//   Row 1 (y=15): Circle, Rectangle, Triangle  |  (Undo, Redo)  |  Zoom In  ...
//   Row 2 (y=45): Fixed Joint, Rotating Joint, Sliding Joint  |  Text, Paste ...
// with the tall "Play!" button pinned to the far RIGHT (x=700, spanning both
// rows) and Zoom In/Out just left of the file/save cluster.
//
// We reproduce that two-row grouping and the right-pinned Play! transport.
// Tool buttons dispatch `{type:'setTool', tool}` (the active tool is shown via
// the pressed/`_click` texture from `store.edit.tool`); Undo/Redo/Save/Load/
// Zoom live in the menu bar (legacy DropDownMenu covers all of them), so here
// we keep the BUILD tools plus the sim transport (Play / Pause / Reset). All
// wiring is unchanged — this is a layout pass only.
import { computed } from "vue";
import { useGameStore } from "../gameStore";
import IbButton from "./IbButton.vue";
import { frameTextures } from "../assets";
import type { ToolMode } from "../../core";
import type { ButtonFamily } from "../assets";

const game = useGameStore();

// Save Replay lives on the running/paused sim panels in the legacy game
// (MainEditPanel.ts:270-290). App owns the modal state, so surface it via an
// event; App opens ExportPanel in replay mode.
const emit = defineEmits<{ saveReplay: [] }>();

// Original PIXI window frame (nine-patch) as this panel's background.
const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrame})` };

interface ToolDef {
	tool: ToolMode;
	label: string;
	family: ButtonFamily;
}

// Row 1 — shape build tools (legacy: Circle / Rectangle / Triangle, BLUE),
// preceded by the Select pointer.
const row1Tools: ToolDef[] = [
	{ tool: "select", label: "Select", family: "blue" },
	{ tool: "newCircle", label: "Circle", family: "blue" },
	{ tool: "newRect", label: "Rectangle", family: "blue" },
	{ tool: "newTriangle", label: "Triangle", family: "blue" },
];

// Row 2 — joint build tools (legacy: Fixed / Rotating / Sliding Joint, BLUE),
// then Text (legacy row 2 also carries Text).
const row2Tools: ToolDef[] = [
	{ tool: "newFixedJoint", label: "Fixed Joint", family: "blue" },
	{ tool: "newRevoluteJoint", label: "Rotating Joint", family: "blue" },
	{ tool: "newPrismaticJoint", label: "Sliding Joint", family: "blue" },
	{ tool: "newText", label: "Text", family: "blue" },
];

// Parts/transform tools that the legacy game reaches through the Extras menu
// (Thrusters/Cannon) and the part-edit panel (Rotate); they are palette-wired
// in the new stack, so keep them in a compact trailing group (one per row) to
// preserve wiring without disturbing the two build rows.
const partsRow1: ToolDef[] = [
	{ tool: "newThrusters", label: "Thrusters", family: "blue" },
	{ tool: "rotate", label: "Rotate", family: "pink" },
];
const partsRow2: ToolDef[] = [
	{ tool: "newCannon", label: "Cannon", family: "blue" },
	{ tool: "resize", label: "Resize", family: "pink" },
];

const currentTool = computed(() => game.edit.tool);

function selectTool(tool: ToolMode): void {
	game.dispatch({ type: "setTool", tool });
}

const phase = computed(() => game.sim.phase);

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
	<div class="tool-palette ib-panel" :style="panelStyle">
		<!-- Two build-tool rows (shapes over joints), matching the legacy
		     MainEditPanel two-row layout. -->
		<div class="tool-grid">
			<div class="tool-row">
				<IbButton
					v-for="t in row1Tools"
					:key="t.tool"
					:family="t.family"
					:label="t.label"
					:pressed="currentTool === t.tool"
					@click="selectTool(t.tool)"
				/>
			</div>
			<div class="tool-row">
				<IbButton
					v-for="t in row2Tools"
					:key="t.tool"
					:family="t.family"
					:label="t.label"
					:pressed="currentTool === t.tool"
					@click="selectTool(t.tool)"
				/>
			</div>
		</div>

		<div class="divider" />

		<!-- Extra parts / transform tools, one per row. -->
		<div class="tool-grid">
			<div class="tool-row">
				<IbButton
					v-for="t in partsRow1"
					:key="t.tool"
					:family="t.family"
					:label="t.label"
					:pressed="currentTool === t.tool"
					@click="selectTool(t.tool)"
				/>
			</div>
			<div class="tool-row">
				<IbButton
					v-for="t in partsRow2"
					:key="t.tool"
					:family="t.family"
					:label="t.label"
					:pressed="currentTool === t.tool"
					@click="selectTool(t.tool)"
				/>
			</div>
		</div>

		<div class="spacer" />

		<!-- Sim transport, pinned to the far right like the legacy tall Play!
		     button (Pause/Reset stack beside it). -->
		<div class="transport">
			<IbButton family="play" play label="Play!" :disabled="phase === 'running'" @click="play" />
			<div class="transport-secondary">
				<IbButton family="red" label="Pause" :disabled="phase !== 'running'" @click="pause" />
				<IbButton family="red" label="Reset" @click="reset" />
				<!-- Save Replay — shown while the sim is running/paused (legacy
				     MainEditPanel save-replay button on both sim panels). -->
				<IbButton
					v-if="phase !== 'editing'"
					family="blue"
					label="Save Replay"
					@click="emit('saveReplay')"
				/>
			</div>
		</div>
	</div>
</template>

<style scoped>
/* Wide, short toolbar that overlays the top of the canvas. The .ib-panel
   nine-patch frame supplies the background/border; keep inner padding modest. */
.tool-palette {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 2px 6px;
}

.tool-grid {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.tool-row {
	display: flex;
	gap: 5px;
	align-items: center;
}

/* Compact the pill buttons a touch so two rows fit the short legacy bar. */
.tool-row :deep(.ib-btn) {
	height: 30px;
	font-size: 11px;
	padding: 0 10px;
}

.divider {
	width: 2px;
	align-self: stretch;
	background: #43366f;
	border-radius: 1px;
	margin: 4px 0;
	opacity: 0.55;
}

.spacer {
	flex: 1;
}

.transport {
	display: flex;
	align-items: center;
	gap: 8px;
}

.transport-secondary {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.transport-secondary :deep(.ib-btn) {
	height: 30px;
	font-size: 11px;
	padding: 0 12px;
}
</style>
