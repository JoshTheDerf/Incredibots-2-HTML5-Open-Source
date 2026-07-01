<script setup lang="ts">
// Visual port of the legacy Pixi ConditionsWindow (src/Gui/ConditionsWindow.ts).
// Lets a challenge author define WIN and LOSS conditions (e.g. "A specific
// shape is within a box", "Any cannonball is touching another shape") plus a
// couple of global flags (AND vs OR win conditions, immediate-loss toggle).
//
// GameCore has no concept of challenge conditions yet (no Condition/WinCondition/
// LossCondition model, no "pick a shape/box/line on the stage" flow) — every
// control here is local placeholder state, flagged with <IbTodo/>. See the
// GameCore commands list in the component-level TODO block below.
import { reactive, ref } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";
import IbTodo from "../IbTodo.vue";
import { frameTextures } from "../../assets";

// TODO(core): none of this is wired. GameCore would need something like:
//   { type: "addWinCondition"; name: string; subject: number; object: number; region?: {...}; shape1Id?: number; shape2Id?: number }
//   { type: "addLossCondition"; name: string; subject: number; object: number; region?: {...}; shape1Id?: number; shape2Id?: number; immediate: boolean }
//   { type: "removeWinCondition"; index: number }
//   { type: "removeLossCondition"; index: number }
//   { type: "setWinConditionsAnded"; anded: boolean }
//   { type: "beginPickShapeForCondition" } / { type: "beginPickRegionForCondition" } (stage-picking mode, mirrors
//     ControllerChallenge.GetShapeForConditions / GetBoxForConditions / Get{Horizontal,Vertical}LineForConditions)
// plus read-model access to challenge.winConditions / lossConditions (currently only exist on the legacy
// ControllerGameGlobals.challenge object).

defineProps<{ visible?: boolean }>();
const emit = defineEmits<{ close: [] }>();

const game = useGameStore();
void game; // store is wired for future dispatches; no condition commands exist yet.

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

// Local placeholder lists — mirrors ControllerGameGlobals.challenge.winConditions / lossConditions.
const winConditions = reactive<ConditionRow[]>([]);
const lossConditions = reactive<ConditionRow[]>([]);

const winSubject = ref(0);
const winObject = ref(0);
const lossSubject = ref(0);
const lossObject = ref(0);

const winName = ref("Condition 1");
const lossName = ref("Condition 1");

const selectedWinIndex = ref<number | null>(null);
const selectedLossIndex = ref<number | null>(null);

const allConditionsAnded = ref(false);
const immediateLoss = ref(true);

function verbFor(subject: number, object: number, have: boolean): string {
	if (object === 6) return subject === 2 ? "have" : "has";
	return subject === 2 ? (have ? "are" : "are") : "is";
}

function describe(row: ConditionRow): string {
	const verb = row.object === 6 ? (row.subject === 2 ? "have" : "has") : row.subject === 2 ? "are" : "is";
	return `${row.name}:  ${SUBJECTS[row.subject]} ${verb} ${OBJECTS[row.object]}`;
}

function addWinCondition(): void {
	winConditions.push({ name: winName.value, subject: winSubject.value, object: winObject.value });
	winName.value = `Condition ${winConditions.length + 1}`;
}

function addLossCondition(): void {
	lossConditions.push({ name: lossName.value, subject: lossSubject.value, object: lossObject.value });
	lossName.value = `Condition ${lossConditions.length + 1}`;
}

function removeSelectedWin(): void {
	if (selectedWinIndex.value === null) return;
	winConditions.splice(selectedWinIndex.value, 1);
	selectedWinIndex.value = null;
	winName.value = `Condition ${winConditions.length + 1}`;
}

function removeSelectedLoss(): void {
	if (selectedLossIndex.value === null) return;
	lossConditions.splice(selectedLossIndex.value, 1);
	selectedLossIndex.value = null;
	lossName.value = `Condition ${lossConditions.length + 1}`;
}

function close(): void {
	emit("close");
}
</script>

<template>
	<div v-if="visible !== false" class="conditions-panel ib-panel" :style="panelStyle">
		<header class="header-row">
			<h2 class="title">Win / Loss Conditions</h2>
			<IbButton family="purple" label="Close" class="close-btn" @click="close" />
		</header>

		<div class="columns">
			<!-- WIN CONDITIONS -->
			<section class="col">
				<h3 class="section-title">New Win Condition:</h3>
				<div class="builder-row ib-todo">
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
				<div class="name-row ib-todo">
					<UFormField label="Name" size="xs">
						<UInput v-model="winName" maxlength="20" size="sm" />
					</UFormField>
					<IbButton family="orange" label="Add Condition" @click="addWinCondition" />
				</div>

				<h3 class="section-title">All Existing Win Conditions:</h3>
				<div class="list-box ib-todo">
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

				<div class="check-row ib-todo">
					<UCheckbox v-model="allConditionsAnded" label="All conditions must be satisfied simultaneously" />
				</div>
			</section>

			<!-- LOSS CONDITIONS -->
			<section class="col">
				<h3 class="section-title">New Loss Condition:</h3>
				<div class="builder-row ib-todo">
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
				<div class="name-row ib-todo">
					<UFormField label="Name" size="xs">
						<UInput v-model="lossName" maxlength="20" size="sm" />
					</UFormField>
					<IbButton family="orange" label="Add Condition" @click="addLossCondition" />
				</div>

				<h3 class="section-title">All Existing Loss Conditions:</h3>
				<div class="list-box ib-todo">
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

				<div class="check-row ib-todo">
					<UCheckbox v-model="immediateLoss" label="Immediate loss if condition met" />
				</div>
			</section>
		</div>

		<footer class="footer-row">
			<IbTodo label="no conditions Command in core" />
		</footer>
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
</style>
