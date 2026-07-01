<script setup lang="ts">
// Tool palette / toolbar — mirrors the old Pixi MainEditPanel build-tool row
// plus sim transport controls (Play / Pause / Reset). Tool buttons dispatch
// `{type:'setTool', tool}`; the active tool is highlighted via the pressed
// (_click) texture from `store.edit.tool`. Play/Pause/Reset dispatch commands
// that are not yet migrated in GameCore — the store's safe dispatch wrapper
// keeps clicking them from crashing the page.
import { computed } from "vue";
import { useGameStore } from "../gameStore";
import IbButton from "./IbButton.vue";
import { frameTextures } from "../assets";
import type { ToolMode } from "../../core";
import type { ButtonFamily } from "../assets";

const game = useGameStore();

// Original PIXI window frame (nine-patch) as this panel's background.
const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrame})` };

interface ToolDef {
	tool: ToolMode;
	label: string;
	family: ButtonFamily;
}

// Original panel colored most build buttons blue; here the shape/parts rails
// are purple (the primary family) with joints in blue to keep a subtle
// category cue, matching the reference's "purple primary" guidance.
const shapeTools: ToolDef[] = [
	{ tool: "select", label: "Select", family: "purple" },
	{ tool: "newCircle", label: "Circle", family: "purple" },
	{ tool: "newRect", label: "Rectangle", family: "purple" },
	{ tool: "newTriangle", label: "Triangle", family: "purple" },
];

const jointTools: ToolDef[] = [
	{ tool: "newFixedJoint", label: "Fixed Joint", family: "blue" },
	{ tool: "newRevoluteJoint", label: "Rotating Joint", family: "blue" },
	{ tool: "newPrismaticJoint", label: "Sliding Joint", family: "blue" },
];

const miscTools: ToolDef[] = [
	{ tool: "newThrusters", label: "Thrusters", family: "purple" },
	{ tool: "newCannon", label: "Cannon", family: "purple" },
	{ tool: "newText", label: "Text", family: "purple" },
	{ tool: "rotate", label: "Rotate", family: "pink" },
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
		<div class="tool-group">
			<span class="group-label">Shapes</span>
			<div class="tool-row">
				<IbButton
					v-for="t in shapeTools"
					:key="t.tool"
					:family="t.family"
					:label="t.label"
					:pressed="currentTool === t.tool"
					@click="selectTool(t.tool)"
				/>
			</div>
		</div>

		<div class="divider" />

		<div class="tool-group">
			<span class="group-label">Joints</span>
			<div class="tool-row">
				<IbButton
					v-for="t in jointTools"
					:key="t.tool"
					:family="t.family"
					:label="t.label"
					:pressed="currentTool === t.tool"
					@click="selectTool(t.tool)"
				/>
			</div>
		</div>

		<div class="divider" />

		<div class="tool-group">
			<span class="group-label">Parts &amp; Tools</span>
			<div class="tool-row">
				<IbButton
					v-for="t in miscTools"
					:key="t.tool"
					:family="t.family"
					:label="t.label"
					:pressed="currentTool === t.tool"
					@click="selectTool(t.tool)"
				/>
			</div>
		</div>

		<div class="divider" />

		<div class="tool-group">
			<span class="group-label">Simulation</span>
			<div class="tool-row sim-row">
				<IbButton family="play" play label="Play!" :disabled="phase === 'running'" @click="play" />
				<IbButton family="purple" label="Pause" :disabled="phase !== 'running'" @click="pause" />
				<IbButton family="red" label="Reset" @click="reset" />
			</div>
		</div>
	</div>
</template>

<style scoped>
.tool-palette {
	display: flex;
	align-items: flex-start;
	gap: 14px;
	/* Background + border come from the `.ib-panel` nine-patch frame; keep the
	   inner padding modest since the frame already adds ~12–24px insets. */
	padding: 4px 6px 6px;
	flex-wrap: wrap;
}

.tool-group {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.group-label {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 10px;
	font-weight: bold;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: #b7aae3;
}

.tool-row {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
	align-items: center;
}

.sim-row {
	align-items: center;
}

.divider {
	width: 2px;
	align-self: stretch;
	background: #43366f;
	border-radius: 1px;
	margin-top: 16px;
	opacity: 0.6;
}
</style>
