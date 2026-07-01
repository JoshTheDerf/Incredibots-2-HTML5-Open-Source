<script setup lang="ts">
// Port of the legacy Gui/TutorialSelectWindow.ts — the "Choose a Level:" grid.
//
// Wired to the real GameCore tutorial system: the level grid comes from
// TUTORIAL_LEVELS (src/core/tutorials.ts, the faithful level → controllerType →
// levelDone mapping), and clicking a level dispatches loadTutorial(levelIndex) —
// the equivalent of the legacy tankButton()/shapeButton()/... which set
// Main.nextControllerType (and a SandboxSettings preset). `done` mirrors
// LSOManager.IsLevelDone(n); until a persistence adapter lands it reflects the
// core's in-memory levelsDone (set on tutorial win).
import { computed } from "vue";
import { storeToRefs } from "pinia";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";
import { useGameStore } from "../../gameStore";
import { TUTORIAL_LEVELS } from "../../../core";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

const store = useGameStore();
const { tutorial } = storeToRefs(store);

const emit = defineEmits<{ back: [] }>();

// The 14 levels + their done flags (from the core's levelsDone when available).
const levels = computed(() =>
	TUTORIAL_LEVELS.map((l) => ({
		label: l.label,
		levelIndex: l.levelIndex,
		done: tutorial.value?.levelsDone?.[l.levelIndex] ?? false,
	})),
);

// tankButton()/shapeButton()/... -> loadTutorial(levelIndex). Entering the
// editor is owned by the parent shell (goToEditor); we load the tutorial then
// signal the parent to switch screens via `back` semantics upstream.
function selectLevel(levelIndex: number): void {
	store.dispatch({ type: "loadTutorial", levelIndex });
	store.goToEditor();
	emit("back"); // close the level-select modal, revealing the editor
}

// backButton() -> hide the window (parent owns the visibility/fader).
function goBack(): void {
	emit("back");
}
</script>

<template>
	<div class="tutorial-select-window ib-panel" :style="panelStyle">
		<div class="header">Choose a Level:</div>

		<div class="level-grid">
			<div v-for="level in levels" :key="level.label" class="level-cell">
				<IbButton
					family="orange"
					:label="level.label"
					class="level-btn"
					@click="selectLevel(level.levelIndex)"
				/>
				<span v-if="level.done" class="done-check" title="Completed">&#10003;</span>
			</div>
		</div>

		<div class="footer">
			<IbButton family="purple" label="Back" class="back-btn" @click="goBack" />
		</div>
	</div>
</template>

<style scoped>
.tutorial-select-window {
	width: 312px;
	min-height: 434px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	font-family: Arial, Helvetica, sans-serif;
	padding: 4px 10px 10px;
}

.header {
	margin-top: 6px;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 20px;
	font-weight: bold;
	text-align: center;
	color: var(--ib-purple);
}

.level-grid {
	margin-top: 16px;
	width: 100%;
	display: grid;
	grid-template-columns: repeat(2, 145px);
	column-gap: 10px;
	row-gap: 14px;
	justify-content: center;
}

.level-cell {
	position: relative;
	width: 145px;
	height: 50px;
}

.level-btn {
	width: 100%;
	height: 50px;
	font-size: 12px;
	white-space: pre-line;
}

.done-check {
	position: absolute;
	top: -6px;
	right: -6px;
	width: 18px;
	height: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--ib-purple-light);
	color: var(--ib-cream);
	border-radius: 50%;
	font-size: 11px;
	font-weight: bold;
	box-shadow: 0 0 0 2px var(--ib-cream);
}

.footer {
	margin-top: 18px;
}

.back-btn {
	width: 100px;
}

.todo-row {
	margin-top: 10px;
}
</style>
