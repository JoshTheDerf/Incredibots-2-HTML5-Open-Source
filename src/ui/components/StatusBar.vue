<script setup lang="ts">
// Status bar — reflects current tool, selection count, and sim phase from
// the store. Read-only.
import { computed } from "vue";
import { useGameStore } from "../gameStore";
import { useIsMobile } from "../useIsMobile";

const game = useGameStore();

// Shape counter (Jaybit DropDownMenu shapeCounter, ControllerGame.UpdateShapeCounter
// :6512-6519). Comes from the store's shapeCount getter, which delegates to the
// core's GameCore.getShapeCount (the legacy 750-shape play limit is removed;
// the count is informational only) and recomputes on every state emit.
const shapeCount = computed(() => game.shapeCount);

// On mobile the status line drops the lower-priority items (frame counter, the
// sim-status phrase) and wraps so it fits a narrow screen. Desktop is unchanged.
const isMobile = useIsMobile();

const currentTool = computed(() => game.edit.tool);
const selectionCount = computed(() => game.edit.selection.length);
const phase = computed(() => game.sim.phase);

// mm:ss elapsed timer, faithful to MainEditPanel.SetTimer (:657-676): the sim
// runs at 30 fps, so minutes = floor(frame / 1800), seconds = floor(rem / 30),
// clamped to 59:59 at 108000 frames. Shown only while running/paused.
const running = computed(() => phase.value !== "editing");
const timer = computed(() => {
	let f = game.sim.frame;
	if (f >= 108000) return "59:59";
	const mins = Math.floor(f / 1800);
	f %= 1800;
	const secs = Math.floor(f / 30);
	return `${mins}:${secs < 10 ? "0" + secs : secs}`;
});

// Sim-status header, matching the legacy strings (MainEditPanel.ts:297-302):
// "Replay in Progress"/"Replay Paused" when playing a replay, else
// "Simulation in Progress"/"Simulation Paused".
const simStatus = computed(() => {
	const isReplay = game.replay.playing;
	if (phase.value === "running") return isReplay ? "Replay in Progress" : "Simulation in Progress";
	if (phase.value === "paused") return isReplay ? "Replay Paused" : "Simulation Paused";
	return null;
});
</script>

<template>
	<div class="status-bar" :class="{ 'is-mobile': isMobile }">
		<span>Tool: <strong id="current-tool-value">{{ currentTool }}</strong></span>
		<span class="sep">|</span>
		<span>Selected: <strong id="selection-count-value">{{ selectionCount }}</strong></span>
		<span class="sep">|</span>
		<!-- Shape counter: full label on desktop, compact icon+count on mobile. -->
		<span v-if="!isMobile">Shapes: <strong id="shape-count-value">{{ shapeCount }}</strong></span>
		<span v-else title="Number of Shapes">▲ <strong id="shape-count-value">{{ shapeCount }}</strong></span>
		<span class="sep">|</span>
		<span>Phase: <strong id="sim-phase-value">{{ phase }}</strong></span>
		<!-- Frame counter is desktop-only detail; hidden on mobile to save room. -->
		<template v-if="!isMobile">
			<span class="sep">|</span>
			<span>Frame: <strong>{{ game.sim.frame }}</strong></span>
		</template>
		<template v-if="running">
			<!-- The verbose sim-status phrase is dropped on mobile; the timer stays. -->
			<template v-if="!isMobile">
				<span class="sep">|</span>
				<span class="sim-status"><strong>{{ simStatus }}</strong></span>
			</template>
			<span class="sep">|</span>
			<span>Time: <strong id="sim-timer-value">{{ timer }}</strong></span>
		</template>
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

/* Mobile: smaller text, tighter gaps, wrap so it never overflows the strip. */
.status-bar.is-mobile {
	height: auto;
	min-height: 28px;
	flex-wrap: wrap;
	gap: 4px 6px;
	padding: 3px 8px;
	font-size: 10px;
}
</style>
