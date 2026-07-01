<script setup lang="ts">
// Status bar — reflects current tool, selection count, and sim phase from
// the store. Read-only.
import { computed } from "vue";
import { useGameStore } from "../gameStore";

const game = useGameStore();

const currentTool = computed(() => game.edit.tool);
const selectionCount = computed(() => game.edit.selection.length);
const phase = computed(() => game.sim.phase);
</script>

<template>
	<div class="status-bar">
		<span>Tool: <strong id="current-tool-value">{{ currentTool }}</strong></span>
		<span class="sep">|</span>
		<span>Selected: <strong id="selection-count-value">{{ selectionCount }}</strong></span>
		<span class="sep">|</span>
		<span>Phase: <strong id="sim-phase-value">{{ phase }}</strong></span>
		<span class="sep">|</span>
		<span>Frame: <strong>{{ game.sim.frame }}</strong></span>
	</div>
</template>

<style scoped>
.status-bar {
	display: flex;
	align-items: center;
	gap: 8px;
	height: 28px;
	padding: 0 12px;
	/* Original PIXI dark chrome footer: dark fill, purple top edge, bevel. */
	background: #242930;
	border-top: 3px solid #43366f;
	box-shadow: inset 0 1px 0 rgba(183, 170, 227, 0.18);
	font-family: Arial, Helvetica, sans-serif;
	font-size: 11px;
	color: #b7aae3;
}

.status-bar strong {
	color: #fdf9ea;
	font-weight: bold;
}

.sep {
	color: #4c3d57;
}
</style>
