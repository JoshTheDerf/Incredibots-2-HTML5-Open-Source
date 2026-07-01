<script setup lang="ts">
// Visual port of src/Gui/ScoreWindow.ts — the challenge-results / score panel
// shown after finishing a challenge or sandbox run. Original was a 200px-wide
// cream Pixi window with a "Congratulations" header sprite, an optional score
// line (hidden for Tutorial/HomeMovies/RubeGoldberg/NewFeatures/ChallengeEditor
// modes), and a stack of purple buttons (View Replay, Save Replay, Submit
// Score, Main Menu, Retry/Close), plus a blue "Next Level" button that only
// appears in the tutorial-like modes.
//
// GameCore has no score/replay/challenge-mode command surface yet (no
// viewReplay / saveReplay / submitScore / next-level concept, and no score
// read-model), so the whole panel renders placeholder data and every button
// is flagged with <IbTodo/> rather than wired — matches the task's directive
// that ScorePanel has no command to wire.
import { ref } from "vue";
import IbButton from "../IbButton.vue";
import IbTodo from "../IbTodo.vue";
import { frameTextures } from "../../assets";
import congratsHeader from "../../../../resource/Incredibots_Congratulations_1.png";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

// Placeholder data standing in for ControllerGame's mode flags + score,
// since GameCore doesn't yet expose challenge mode or score state.
const placeholderScore = ref(1420);
const isTutorialLikeMode = ref(false); // Tutorial/HomeMovies/RubeGoldberg/NewFeatures
const hidesScoreField = ref(false); // also includes ChallengeEditor
const isHomeMoviesOrChallengeEditor = ref(false); // affects the close/retry label
const viewingUnsavedReplay = ref(false); // affects the view-replay label
</script>

<template>
	<div class="score-panel ib-panel" :style="panelStyle">
		<img class="header" :src="congratsHeader" alt="Congratulations!" />

		<p v-if="!hidesScoreField" class="score-line">Your score is: {{ placeholderScore }}</p>

		<div class="actions">
			<IbButton
				family="purple"
				:label="viewingUnsavedReplay ? 'View Again!' : 'View Replay'"
				class="action-btn ib-todo"
			/>
			<IbButton family="purple" label="Save Replay" class="action-btn ib-todo" />
			<IbButton family="purple" label="Submit Score" class="action-btn ib-todo" />
			<IbButton family="purple" label="Main Menu" class="action-btn ib-todo" />
			<IbButton
				family="purple"
				:label="isHomeMoviesOrChallengeEditor ? 'Close' : 'Retry'"
				class="action-btn ib-todo"
			/>
			<IbButton v-if="isTutorialLikeMode" family="blue" label="Next Level" class="action-btn ib-todo" />
		</div>

		<IbTodo label="score/replay/challenge state not wired" class="footer-flag" />
	</div>
</template>

<style scoped>
.score-panel {
	width: 200px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 10px;
	padding: 6px 8px 10px;
	font-family: Arial, Helvetica, sans-serif;
}

.header {
	width: 175px;
	height: auto;
	align-self: center;
	display: block;
}

.score-line {
	margin: 0;
	text-align: center;
	font-size: 12px;
	font-weight: bold;
	color: var(--ib-dark);
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	flex-wrap: wrap;
}

.actions {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.action-btn {
	width: 100%;
	height: 35px;
	font-size: 11px;
}

.footer-flag {
	align-self: center;
	margin-top: 2px;
}
</style>
