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
import { frameTextures } from "../assets";

// Cream parchment window frame (nine-patch) for the inspector shell, and the
// periwinkle frame for the inner content sections — both from the original
// PIXI box### panel textures.
const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };
const sectionStyle = { "--ib-panel-src": `url(${frameTextures.panelFrame})` };

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
		<div class="inspector-panel ib-panel" :style="panelStyle">
			<div class="inspector-header">
				<span class="title">Inspector</span>
				<span class="badge">{{ selectionCount }} selected</span>
			</div>

			<div class="inspector-body">
				<template v-if="!hasSelection">
					<p class="empty-state">Select a part on the stage to edit its properties.</p>
				</template>

				<template v-else>
					<div class="section ib-panel" :style="sectionStyle">
						<span class="section-title">Shape</span>

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
					</div>

					<div class="section ib-panel" :style="sectionStyle">
						<span class="section-title">Joint (placeholder)</span>

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
					</div>

					<div class="actions">
						<IbButton family="red" label="Delete" class="action-btn" @click="deleteSelected" />
						<IbButton family="purple" label="Clear Selection" class="action-btn" @click="clearSelection" />
					</div>
				</template>
			</div>
		</div>
	</aside>
</template>

<style scoped>
.inspector {
	width: 272px;
	flex-shrink: 0;
	padding: 10px 10px 10px 0;
	box-sizing: border-box;
	display: flex;
	font-family: Arial, Helvetica, sans-serif;
}

/* Cream parchment window (nine-patch frame from the original box### panel). */
.inspector-panel {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.inspector-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 4px 6px 8px;
	flex-shrink: 0;
}

.inspector-body {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	padding: 0 2px 2px;
}

.title {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	font-weight: bold;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: #43366f;
}

.badge {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 10px;
	font-weight: bold;
	color: #fdf9ea;
	background: #43366f;
	border-radius: 999px;
	padding: 2px 8px;
}

.empty-state {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	color: #4c3d57;
	line-height: 1.5;
	padding: 6px 8px;
	margin: 0;
}

/* Content sections use the periwinkle nine-patch window frame. */
.section {
	margin: 4px 2px 8px;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.section-title {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	font-weight: bold;
	color: #fdf9ea;
	margin-bottom: 4px;
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
