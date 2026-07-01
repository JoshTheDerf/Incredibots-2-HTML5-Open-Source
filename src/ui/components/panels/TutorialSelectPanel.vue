<script setup lang="ts">
// Visual port of the legacy Gui/TutorialSelectWindow.ts — the "Choose a
// Level:" grid used to jump into any tutorial/level from the main menu.
//
// This is a VISUAL port with logic-wiring flags. GameCore has no concept of
// tutorials/levels or completion tracking (the original read/wrote
// LSOManager.IsLevelDone(n) and flipped Main.nextControllerType directly) —
// so this renders a placeholder list of levels with placeholder "done" flags
// and flags every button as unwired.
import { ref } from "vue";
import IbButton from "../IbButton.vue";
import IbTodo from "../IbTodo.vue";
import { frameTextures } from "../../assets";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

interface LevelEntry {
	label: string;
	done: boolean;
}

// Stand-in for the 14 GuiButton entries in TutorialSelectWindow.ts (levels
// 1-14, minus the numbering gap at #9 which the legacy code also skips over
// visually). `done` stands in for LSOManager.IsLevelDone(n).
const levels = ref<LevelEntry[]>([
	{ label: "1. Drive a Tank!", done: true },
	{ label: "2. Shape Up", done: true },
	{ label: "3. Car Creation", done: false },
	{ label: "4. JumpBot", done: false },
	{ label: "5. DumpBot", done: false },
	{ label: "6. Catapult", done: false },
	{ label: "7. Home Movies", done: false },
	{ label: "8. Rube Goldberg", done: false },
	{ label: "9. New in IB2", done: false },
	{ label: "10. Challenges", done: false },
	{ label: "11. Monkey Bars", done: false },
	{ label: "12. Climb", done: false },
	{ label: "13. Bike Race", done: false },
	{ label: "14. Spaceships", done: false },
]);

// Mirrors e.g. tankButton()/shapeButton()/... which each set
// Main.changeControllers + Main.nextControllerType (and sometimes a
// SandboxSettings preset) to jump straight into a level/challenge controller.
// GameCore command needed: loadTutorial(levelIndex: number).
function selectLevel(index: number): void {
	// TODO(wiring): needs a loadTutorial(levelIndex) GameCore command. No-op for now.
	void index;
}

// Mirrors backButton() -> this.visible = false; cont.fader2.visible = false.
// GameCore command needed: closeTutorialSelect() (or this can stay purely a
// local UI-visibility toggle owned by the parent, same as the legacy fader).
function goBack(): void {
	// TODO(wiring): needs a closeTutorialSelect command (or a parent visibility toggle). No-op for now.
}
</script>

<template>
	<div class="tutorial-select-window ib-panel" :style="panelStyle">
		<div class="header">Choose a Level:</div>

		<div class="level-grid">
			<div v-for="(level, i) in levels" :key="level.label" class="level-cell">
				<IbButton
					family="orange"
					:label="level.label"
					class="level-btn ib-todo"
					@click="selectLevel(i)"
				/>
				<span v-if="level.done" class="done-check" title="Completed">&#10003;</span>
			</div>
		</div>

		<div class="footer">
			<IbButton family="purple" label="Back" class="back-btn ib-todo" @click="goBack" />
		</div>

		<div class="todo-row">
			<IbTodo label="no tutorial/level commands in GameCore yet" />
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
