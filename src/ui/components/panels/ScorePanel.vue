<script setup lang="ts">
// Visual port of src/Gui/ScoreWindow.ts — the challenge-results / score panel
// shown after finishing a challenge or sandbox run. Original was a 200px-wide
// cream Pixi window with a "Congratulations" header sprite, an optional score
// line (hidden for Tutorial/HomeMovies/RubeGoldberg/NewFeatures/ChallengeEditor
// modes), and a stack of purple buttons (View Replay, Save Replay, Submit
// Score, Main Menu, Retry/Close), plus a blue "Next Level" button that only
// appears in the tutorial-like modes.
//
// The score comes from the live challenge read-model (game.challenge.score =
// 10000 - frame at win; ControllerChallenge.GetScore). The outcome (won/failed)
// is game.challenge.outcome. "Main Menu" (ScoreWindow.m_mainMenuButton ->
// cont.newButton :60) and "Retry" (cancelButton -> cont.resetButton :62/78) are
// wired to goToMenu() / reset. The replay / submit / next-level buttons remain
// unwired (dead cloud path + no replay-session model here) and stay flagged.
import { computed, ref } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";
import IbTodo from "../IbTodo.vue";
import { frameTextures } from "../../assets";
import congratsHeader from "../../../../resource/Incredibots_Congratulations_1.png";

const game = useGameStore();

const emit = defineEmits<{ close: [] }>();

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

// Live challenge outcome + score. Score is null until a win (ScoreWindow hides
// the score line for tutorial-like modes and when there is no score).
const outcome = computed(() => game.challenge?.outcome ?? null);
const score = computed<number | null>(() => game.challenge?.score ?? null);
const hidesScoreField = computed(() => score.value === null);

const isTutorialLikeMode = ref(false); // Tutorial/HomeMovies/RubeGoldberg/NewFeatures
const isHomeMoviesOrChallengeEditor = ref(false); // affects the close/retry label
const viewingUnsavedReplay = ref(false); // affects the view-replay label

// ScoreWindow always shows the "Congratulations" header (it's the win/completion
// window; loss is surfaced elsewhere). When the outcome is a failure we still
// render the panel but adjust the heading text accordingly.
const didWin = computed(() => outcome.value !== "failed");

// "Main Menu" -> cont.newButton (return to the menu screen).
function mainMenu(): void {
	game.goToMenu();
	emit("close");
}

// "Retry" (or "Close" for HomeMovies/ChallengeEditor) -> cancelButton, which
// calls cont.resetButton() except in those two modes (:78).
function retryOrClose(): void {
	if (!isHomeMoviesOrChallengeEditor.value) game.dispatch({ type: "reset" });
	emit("close");
}
</script>

<template>
	<div class="score-panel ib-panel" :style="panelStyle">
		<img v-if="didWin" class="header" :src="congratsHeader" alt="Congratulations!" />
		<p v-else class="fail-header">Challenge Failed</p>

		<p v-if="!hidesScoreField" class="score-line">Your score is: {{ score }}</p>

		<div class="actions">
			<IbButton
				family="purple"
				:label="viewingUnsavedReplay ? 'View Again!' : 'View Replay'"
				class="action-btn ib-todo"
			/>
			<IbButton family="purple" label="Save Replay" class="action-btn ib-todo" />
			<IbButton family="purple" label="Submit Score" class="action-btn ib-todo" />
			<IbButton family="purple" label="Main Menu" class="action-btn" @click="mainMenu" />
			<IbButton
				family="purple"
				:label="isHomeMoviesOrChallengeEditor ? 'Close' : 'Retry'"
				class="action-btn"
				@click="retryOrClose"
			/>
			<IbButton v-if="isTutorialLikeMode" family="blue" label="Next Level" class="action-btn ib-todo" />
		</div>

		<IbTodo label="replay/submit-score not wired" class="footer-flag" />
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

.fail-header {
	margin: 0;
	text-align: center;
	font-size: 18px;
	font-weight: bold;
	color: var(--ib-dark);
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
