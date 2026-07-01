<script setup lang="ts">
// Visual port of the legacy Gui/TutorialWindow.ts message bubble — the small
// dialog that pops up during in-game tutorials with instructional text and
// next/prev/close controls.
//
// This is a VISUAL port with logic-wiring flags. GameCore currently has no
// tutorial concept at all (no step index, no message table, no "close
// tutorial" command) — TutorialWindow.ts drove everything off a local
// `TUTORIAL_MESSAGES` string array and a direct callback into
// ControllerGame.CloseTutorialDialog(id). Until GameCore grows an equivalent
// (see TODOs below), this panel renders placeholder copy and flags every
// control that would need wiring.
import { ref } from "vue";
import IbButton from "../IbButton.vue";
import IbTodo from "../IbTodo.vue";
import { frameTextures } from "../../assets";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

// Stand-in for TutorialWindow's `this.num` (the tutorial message id) and the
// message lookup that used to index into TUTORIAL_MESSAGES[id].
const stepIndex = ref(0);
const totalSteps = 5;

const placeholderMessages = [
	"Welcome to the world of IncrediBots 2!\n\nThis is the robot building screen, where you'll learn to construct amazing robots like this tank... or anything else you can imagine!",
	"These introductory levels will teach you the game's basics. Later, for a real test of your skill, go to one of the \"Challenges\" from the main menu.",
	"For now, click and drag the world around to explore, and click \"Zoom In\" and \"Zoom Out\" as necessary.",
	"Good job!\n\nYou can watch or save a replay using the menu that appears after playing a level.",
	"Now you'll learn some of the game's tools so you can make your own creations...",
];

const canGoPrev = ref(true);
const canGoNext = ref(true);

// Mirrors TutorialWindow.closeWindow() -> cont.CloseTutorialDialog(this.num).
// GameCore command needed: closeTutorial(step: number).
function closeWindow(): void {
	// TODO(wiring): needs a closeTutorial(step) GameCore command. No-op for now.
}

// Not present as a literal button in TutorialWindow.ts (it only ever showed a
// single "OK"/"More..." button), but the panel is expected to support
// stepping back and forth through tutorial messages once GameCore tracks a
// step cursor. GameCore command needed: prevTutorialStep().
function prevStep(): void {
	// TODO(wiring): needs a prevTutorialStep GameCore command. No-op for now.
	if (stepIndex.value > 0) stepIndex.value--;
}

// GameCore command needed: nextTutorialStep().
function nextStep(): void {
	// TODO(wiring): needs a nextTutorialStep GameCore command. No-op for now.
	if (stepIndex.value < totalSteps - 1) stepIndex.value++;
}
</script>

<template>
	<div class="tutorial-window ib-panel" :style="panelStyle">
		<div class="msg-area">
			{{ placeholderMessages[stepIndex] }}
		</div>

		<div class="controls">
			<IbButton
				family="purple"
				label="< Prev"
				class="nav-btn ib-todo"
				:disabled="!canGoPrev"
				@click="prevStep"
			/>
			<IbButton family="purple" label="OK" class="ok-btn ib-todo" @click="closeWindow" />
			<IbButton
				family="purple"
				label="Next >"
				class="nav-btn ib-todo"
				:disabled="!canGoNext"
				@click="nextStep"
			/>
		</div>

		<div class="todo-row">
			<IbTodo label="no tutorial commands in GameCore yet" />
		</div>
	</div>
</template>

<style scoped>
.tutorial-window {
	width: 248px;
	min-height: 170px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	font-family: Arial, Helvetica, sans-serif;
	padding: 6px 10px 10px;
}

.msg-area {
	width: 228px;
	margin-top: 10px;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	line-height: 1.35;
	text-align: center;
	color: var(--ib-dark);
	white-space: pre-line;
}

.controls {
	margin-top: 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
}

.ok-btn {
	width: 70px;
}

.nav-btn {
	width: 60px;
	font-size: 10px;
}

.todo-row {
	margin-top: 8px;
}
</style>
