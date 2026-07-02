<script setup lang="ts">
// Port of the legacy Pixi ConditionsWindow (src/Gui/ConditionsWindow.ts). Lets a
// challenge author define WIN and LOSS conditions plus the AND-vs-OR win flag and
// the immediate-loss toggle.
//
// Wired to GameCore: the condition lists come from the live challenge read-model
// (game.challenge.winConditions / lossConditions), and add/remove/AND dispatch
// addWinCondition / addLossCondition / removeWinCondition / removeLossCondition /
// setWinConditionsAnded (see src/core/challenge.ts). "Add Condition" now starts
// the interactive stage-picking flow (startConditionPick): the panel hides so the
// author can draw the box/line region or click the subject/object shape on the
// canvas, exactly like the legacy ConditionsWindow (which set `visible=false` and
// showed a boxText/horizLineText/vertLineText/shapeText hint). When the pick
// finalizes in the core, the draft clears and the condition appears in the list.
import { computed, ref, watch } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";
import { ShapePart } from "../../../Parts/ShapePart";

defineProps<{ visible?: boolean }>();
const emit = defineEmits<{ close: [] }>();

const game = useGameStore();

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

const SUBJECTS = ["A specific shape", "Any shape", "All user-created shapes", "Any pre-existing shape", "Any cannonball"];
const OBJECTS = [
	"within a box",
	"above a line",
	"below a line",
	"left of a line",
	"right of a line",
	"touching another shape",
	"touched another shape",
];

interface ConditionRow {
	name: string;
	subject: number;
	object: number;
}

// Live condition lists from the challenge read-model (empty when no challenge).
const winConditions = computed<ConditionRow[]>(() => game.challenge?.winConditions ?? []);
const lossConditions = computed<ConditionRow[]>(() => game.challenge?.lossConditions ?? []);

const winSubject = ref(0);
const winObject = ref(0);
const lossSubject = ref(0);
const lossObject = ref(0);

const winName = ref("Condition 1");
const lossName = ref("Condition 1");

const selectedWinIndex = ref<number | null>(null);
const selectedLossIndex = ref<number | null>(null);

// Reflect / drive the AND-vs-OR flag through the core (winConditionsAnded).
const allConditionsAnded = ref(game.challenge?.winConditionsAnded ?? true);
watch(
	() => game.challenge?.winConditionsAnded,
	(v) => {
		if (v != null) allConditionsAnded.value = v;
	},
);
watch(allConditionsAnded, (v) => {
	if (game.challenge && v !== game.challenge.winConditionsAnded) {
		game.dispatch({ type: "setWinConditionsAnded", value: v });
	}
});

const immediateLoss = ref(true);

function verbFor(subject: number, object: number, have: boolean): string {
	if (object === 6) return subject === 2 ? "have" : "has";
	return subject === 2 ? (have ? "are" : "are") : "is";
}

function describe(row: ConditionRow): string {
	const verb = row.object === 6 ? (row.subject === 2 ? "have" : "has") : row.subject === 2 ? "are" : "is";
	return `${row.name}:  ${SUBJECTS[row.subject]} ${verb} ${OBJECTS[row.object]}`;
}

// The in-progress stage-picking draft (null when not picking). While set, the
// panel hides itself + shows the pick hint, mirroring the legacy dialog going
// invisible while boxText/shapeText prompts on the stage.
const conditionDraft = computed(() => game.conditionDraft);

// Pick prompt strings, faithful to ConditionsWindow's boxText / horizLineText /
// vertLineText / shapeText.
const HINTS: Record<string, string> = {
	box: "Draw a box on the stage (click one corner, then the opposite corner).",
	hline: "Draw a horizontal line on the stage (click a start point, then an end point).",
	vline: "Draw a vertical line on the stage (click a start point, then an end point).",
	shape1: "Click the specific shape this condition applies to.",
	shape2: "Click the other shape this condition refers to.",
};
const pickHint = computed(() => {
	const a = conditionDraft.value?.awaiting;
	return a ? (HINTS[a] ?? "") : "";
});

// Inline validation message for the not-enough-shapes guard (ConditionsWindow
// CheckWinShapes / CheckLossShapes :338-366 pop ShowDialog2 with these strings).
const errorMsg = ref("");

/** Count of editable ShapeParts currently in the world (mirrors the legacy loop
 * over cont.allParts filtering `instanceof ShapePart && isEditable`). */
function editableShapeCount(): number {
	let n = 0;
	for (const p of game.parts) {
		if (p instanceof ShapePart && (p as ShapePart).isEditable) n++;
	}
	return n;
}

/** Faithful port of CheckWinShapes/CheckLossShapes: subject 0 ("A specific
 * shape") needs 1 shape; object >= 5 ("touching/touched another shape") needs 1
 * more. Blocks + shows the exact dialog string when there aren't enough. */
function checkShapes(subject: number, object: number, kind: "win" | "loss"): boolean {
	const required = (subject === 0 ? 1 : 0) + (object >= 5 ? 1 : 0);
	if (required === 0) return true;
	if (editableShapeCount() >= required) {
		errorMsg.value = "";
		return true;
	}
	errorMsg.value = `There aren't enough shapes in the world to use with that ${kind} condition.`;
	return false;
}

function addWinCondition(): void {
	if (!checkShapes(winSubject.value, winObject.value, "win")) return;
	// Start the interactive pick; GameCore computes which pick(s) are needed from
	// subject/object and finalizes the condition when the last pick lands.
	game.dispatch({
		type: "startConditionPick",
		kind: "win",
		name: winName.value,
		subject: winSubject.value,
		object: winObject.value,
		immediate: false,
	});
	winName.value = `Condition ${winConditions.value.length + 1}`;
}

function addLossCondition(): void {
	if (!checkShapes(lossSubject.value, lossObject.value, "loss")) return;
	game.dispatch({
		type: "startConditionPick",
		kind: "loss",
		name: lossName.value,
		subject: lossSubject.value,
		object: lossObject.value,
		immediate: immediateLoss.value,
	});
	lossName.value = `Condition ${lossConditions.value.length + 1}`;
}

function cancelPick(): void {
	game.dispatch({ type: "cancelConditionPick" });
}

function removeSelectedWin(): void {
	if (selectedWinIndex.value === null) return;
	game.dispatch({ type: "removeWinCondition", index: selectedWinIndex.value });
	selectedWinIndex.value = null;
	winName.value = `Condition ${winConditions.value.length + 1}`;
}

function removeSelectedLoss(): void {
	if (selectedLossIndex.value === null) return;
	game.dispatch({ type: "removeLossCondition", index: selectedLossIndex.value });
	selectedLossIndex.value = null;
	lossName.value = `Condition ${lossConditions.value.length + 1}`;
}

function close(): void {
	emit("close");
}
</script>

<template>
	<!-- While a stage pick is awaited the full editor hides and a hint banner
	     prompts the author to draw/click on the canvas (legacy boxText/shapeText). -->
	<div v-if="visible !== false && conditionDraft" class="conditions-pick-hint ib-panel" :style="panelStyle">
		<p class="pick-hint-text">{{ pickHint }}</p>
		<IbButton family="red" label="Cancel" @click="cancelPick" />
	</div>

	<div v-else-if="visible !== false" class="conditions-panel ib-panel" :style="panelStyle">
		<header class="header-row">
			<h2 class="title">Win / Loss Conditions</h2>
			<IbButton family="purple" label="Close" class="close-btn" @click="close" />
		</header>

		<p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

		<div class="columns">
			<!-- WIN CONDITIONS -->
			<section class="col">
				<h3 class="section-title">New Win Condition:</h3>
				<div class="builder-row">
					<USelectMenu
						v-model="winSubject"
						:items="SUBJECTS.map((label, value) => ({ label, value }))"
						value-key="value"
						size="sm"
						class="subject-select"
					/>
					<span class="is-word">{{ verbFor(winSubject, winObject, false) }}</span>
					<USelectMenu
						v-model="winObject"
						:items="OBJECTS.map((label, value) => ({ label, value }))"
						value-key="value"
						size="sm"
						class="object-select"
					/>
				</div>
				<div class="name-row">
					<UFormField label="Name" size="xs">
						<UInput v-model="winName" maxlength="20" size="sm" />
					</UFormField>
					<IbButton family="orange" label="Add Condition" @click="addWinCondition" />
				</div>

				<h3 class="section-title">All Existing Win Conditions:</h3>
				<div class="list-box">
					<ul class="condition-list">
						<li
							v-for="(row, i) in winConditions"
							:key="i"
							:class="{ selected: selectedWinIndex === i }"
							@click="selectedWinIndex = i"
						>
							{{ describe(row) }}
						</li>
						<li v-if="winConditions.length === 0" class="empty-row">(none yet)</li>
					</ul>
				</div>
				<IbButton
					family="red"
					label="Remove Selected Win Condition"
					class="remove-btn"
					:disabled="selectedWinIndex === null"
					@click="removeSelectedWin"
				/>

				<div class="check-row">
					<UCheckbox v-model="allConditionsAnded" label="All conditions must be satisfied simultaneously" />
				</div>
			</section>

			<!-- LOSS CONDITIONS -->
			<section class="col">
				<h3 class="section-title">New Loss Condition:</h3>
				<div class="builder-row">
					<USelectMenu
						v-model="lossSubject"
						:items="SUBJECTS.map((label, value) => ({ label, value }))"
						value-key="value"
						size="sm"
						class="subject-select"
					/>
					<span class="is-word">{{ verbFor(lossSubject, lossObject, false) }}</span>
					<USelectMenu
						v-model="lossObject"
						:items="OBJECTS.map((label, value) => ({ label, value }))"
						value-key="value"
						size="sm"
						class="object-select"
					/>
				</div>
				<div class="name-row">
					<UFormField label="Name" size="xs">
						<UInput v-model="lossName" maxlength="20" size="sm" />
					</UFormField>
					<IbButton family="orange" label="Add Condition" @click="addLossCondition" />
				</div>

				<h3 class="section-title">All Existing Loss Conditions:</h3>
				<div class="list-box">
					<ul class="condition-list">
						<li
							v-for="(row, i) in lossConditions"
							:key="i"
							:class="{ selected: selectedLossIndex === i }"
							@click="selectedLossIndex = i"
						>
							{{ describe(row) }}
						</li>
						<li v-if="lossConditions.length === 0" class="empty-row">(none yet)</li>
					</ul>
				</div>
				<IbButton
					family="red"
					label="Remove Selected Loss Condition"
					class="remove-btn"
					:disabled="selectedLossIndex === null"
					@click="removeSelectedLoss"
				/>

				<div class="check-row">
					<UCheckbox v-model="immediateLoss" label="Immediate loss if condition met" />
				</div>
			</section>
		</div>
	</div>
</template>

<style scoped>
.conditions-panel {
	width: 720px;
	max-width: 100%;
	box-sizing: border-box;
	font-family: Arial, Helvetica, sans-serif;
	color: var(--ib-dark);
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.header-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.title {
	margin: 0;
	font-size: 18px;
	font-weight: bold;
	text-align: center;
	flex: 1;
	color: var(--ib-dark);
}

.close-btn {
	flex-shrink: 0;
}

.error-msg {
	margin: 0;
	font-size: 12px;
	font-weight: bold;
	text-align: center;
	color: #a11;
}

.columns {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16px;
}

.col {
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
}

.section-title {
	margin: 6px 0 2px;
	font-size: 12px;
	font-weight: bold;
	color: var(--ib-dark);
	text-align: center;
}

.builder-row {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px;
	border-radius: 4px;
}

.subject-select,
.object-select {
	flex: 1;
	min-width: 0;
}

.is-word {
	font-size: 12px;
	font-weight: bold;
	color: var(--ib-dark);
	flex-shrink: 0;
	width: 24px;
	text-align: center;
}

.name-row {
	display: flex;
	align-items: flex-end;
	gap: 8px;
	padding: 4px;
	border-radius: 4px;
}

.name-row :deep(.ib-btn) {
	flex-shrink: 0;
}

.list-box {
	min-height: 90px;
	max-height: 110px;
	overflow-y: auto;
	background: rgba(255, 255, 255, 0.55);
	border: 1px solid var(--ib-purple-light);
	border-radius: 4px;
	padding: 2px;
}

.condition-list {
	list-style: none;
	margin: 0;
	padding: 0;
	font-size: 11px;
	color: var(--ib-muted, #4c3d57);
}

.condition-list li {
	padding: 3px 6px;
	cursor: pointer;
	border-radius: 3px;
}

.condition-list li:hover {
	background: rgba(160, 142, 210, 0.25);
}

.condition-list li.selected {
	background: var(--ib-purple-light);
	color: #242930;
}

.empty-row {
	font-style: italic;
	opacity: 0.6;
	cursor: default !important;
}

.remove-btn {
	align-self: center;
	width: 100%;
}

.check-row {
	padding: 6px;
	border-radius: 4px;
	margin-top: 2px;
}

.footer-row {
	display: flex;
	justify-content: center;
	padding-top: 4px;
}

.conditions-pick-hint {
	width: 420px;
	max-width: 100%;
	box-sizing: border-box;
	font-family: Arial, Helvetica, sans-serif;
	color: var(--ib-dark);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	text-align: center;
}

.pick-hint-text {
	margin: 0;
	font-size: 14px;
	font-weight: bold;
}
</style>
