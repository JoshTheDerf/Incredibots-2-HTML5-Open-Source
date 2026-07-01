<script setup lang="ts">
// Right-hand part-edit inspector — mirrors the old Pixi PartEditWindow.
// This is a structural frame: sliders/inputs are wired to local reactive
// state and, where a real Command exists (setColour), dispatched through the
// safe store wrapper. Density and joint params have no Command in the core
// contract yet, so they stay inert with a TODO — GameCore currently only
// tracks selection ids, not per-part properties.
import { computed, ref } from "vue";
import { useGameStore } from "../gameStore";
import IbButton from "./IbButton.vue";

const game = useGameStore();

const hasSelection = computed(() => game.edit.selection.length > 0);
const selectionCount = computed(() => game.edit.selection.length);

// TODO(core): GameCore has no per-part property read model yet (`parts` is
// still live Pixi/Part instances per the migration note in GameState.ts).
// These are local placeholders until a `getPart`/`selectedPartSnapshot`
// selector lands, at which point they should be driven from the store.
const density = ref(15);
const colour = ref("#4a7dfc");
const jointStrength = ref(15);
const jointSpeed = ref(15);

function applyColour(): void {
	if (!hasSelection.value) return;
	const hex = colour.value.replace("#", "");
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	game.dispatch({ type: "setColour", partIds: game.edit.selection, r, g, b, opacity: 1 });
}

function deleteSelected(): void {
	if (!hasSelection.value) return;
	game.dispatch({ type: "deleteParts", partIds: game.edit.selection });
}

function clearSelection(): void {
	game.dispatch({ type: "clearSelection" });
}
</script>

<template>
	<aside class="inspector">
		<div class="inspector-header">
			<span class="title">Inspector</span>
			<span class="badge">{{ selectionCount }} selected</span>
		</div>

		<template v-if="!hasSelection">
			<p class="empty-state">Select a part on the stage to edit its properties.</p>
		</template>

		<template v-else>
			<UCard variant="subtle" class="section">
				<template #header>
					<span class="section-title">Shape</span>
				</template>

				<div class="field">
					<label class="field-label">Density</label>
					<USlider v-model="density" :min="1" :max="30" :step="1" size="sm" />
					<span class="field-value">{{ density.toFixed(0) }}</span>
					<p class="field-todo">TODO: no per-part density Command in core yet — inert.</p>
				</div>

				<div class="field">
					<label class="field-label" for="colour-input">Color</label>
					<div class="colour-row">
						<input id="colour-input" v-model="colour" type="color" class="colour-swatch" />
						<IbButton family="blue" label="Change Color" @click="applyColour" />
					</div>
				</div>
			</UCard>

			<UCard variant="subtle" class="section">
				<template #header>
					<span class="section-title">Joint (placeholder)</span>
				</template>

				<div class="field">
					<label class="field-label">Motor Strength</label>
					<USlider v-model="jointStrength" :min="1" :max="30" :step="1" size="sm" />
					<span class="field-value">{{ jointStrength.toFixed(0) }}</span>
				</div>
				<div class="field">
					<label class="field-label">Motor Speed</label>
					<USlider v-model="jointSpeed" :min="1" :max="30" :step="1" size="sm" />
					<span class="field-value">{{ jointSpeed.toFixed(0) }}</span>
				</div>
				<p class="field-todo">TODO: joint params have no Command in core yet — inert.</p>
			</UCard>

			<div class="actions">
				<IbButton family="red" label="Delete" class="action-btn" @click="deleteSelected" />
				<IbButton family="purple" label="Clear Selection" class="action-btn" @click="clearSelection" />
			</div>
		</template>
	</aside>
</template>

<style scoped>
.inspector {
	width: 268px;
	flex-shrink: 0;
	/* Original PIXI window: dark chrome shell with a purple edge and a thin
	   inner bevel highlight down the seam against the canvas. */
	background: #242930;
	border-left: 3px solid #43366f;
	box-shadow: inset 1px 0 0 rgba(183, 170, 227, 0.18);
	padding: 0;
	display: flex;
	flex-direction: column;
	overflow-y: auto;
	font-family: Arial, Helvetica, sans-serif;
}

.inspector-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 12px;
	background: #43366f;
}

.title {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	font-weight: bold;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: #fdf9ea;
}

.badge {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 10px;
	font-weight: bold;
	color: #43366f;
	background: #b7aae3;
	border-radius: 999px;
	padding: 2px 8px;
}

.empty-state {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	color: #fdf9ea;
	line-height: 1.5;
	padding: 14px 12px;
	margin: 0;
}

/* Cream parchment content sections. UCard renders its own wrapper, so force
   the fill/border to the parchment palette via deep selectors. */
.section {
	margin: 12px;
}

.section :deep(> div),
.section:deep(.rounded-lg) {
	background: #fdf9ea !important;
	border: 1px solid #43366f !important;
	border-radius: 6px !important;
	box-shadow:
		inset 0 1px 0 #ffffff,
		0 1px 2px rgba(36, 41, 48, 0.4) !important;
}

.section :deep(*) {
	color: #573d40;
}

.section-title {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	font-weight: bold;
	color: #43366f;
}

.field {
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: center;
	gap: 4px 8px;
	margin-bottom: 10px;
}

.field-label {
	grid-column: 1 / -1;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 11px;
	font-weight: bold;
	color: #573d40;
}

.field-value {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 10px;
	font-weight: bold;
	color: #4c3d57;
	text-align: right;
	min-width: 20px;
}

.field-todo {
	grid-column: 1 / -1;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 10px;
	color: #8a7f70;
	font-style: italic;
	margin: 2px 0 0;
}

.colour-row {
	grid-column: 1 / -1;
	display: flex;
	align-items: center;
	gap: 8px;
}

.colour-swatch {
	width: 28px;
	height: 28px;
	padding: 0;
	border: 1px solid #43366f;
	border-radius: 6px;
	background: none;
	cursor: pointer;
}

.actions {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin: auto 12px 12px;
	padding-top: 8px;
}

.actions :deep(.ib-btn) {
	width: 100%;
}
</style>
