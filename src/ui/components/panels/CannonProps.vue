<script setup lang="ts">
// Visual port of PartEditWindow.ts ShowCannonPanel (m_cannonPanel) — a
// ShapePart-like set of physical properties (density/collide/fixate/
// outline/undragable/colour) plus cannon-specific strength and fire key.
//
// Live-wired: colour Apply -> setColour(edit.selection).
// Flagged: density, collide, fixate, outline, outline-behind, undragable
// (same missing commands as ShapeProps.vue), plus cannon-only
// setCannonStrength and setCannonFireKey.
import { ref } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";
import IbTodo from "../IbTodo.vue";

const game = useGameStore();

// -- Density (m_densitySlider7 / m_densityArea7) --
const density = ref(15);

// -- Checkboxes --
const collides = ref(true);
const fixate = ref(false);
const outline = ref(false);
const outlineBehind = ref(false);
const undragable = ref(false);

// -- Colour --
const colourHex = ref("#4a7dfc");
const opacity = ref(100);

// -- Cannon strength (m_strengthSlider7 / m_strengthArea7) --
const cannonStrength = ref(15);

// -- Fire key (m_fireKeyArea) --
const fireKey = ref("Space");

function applyColour(): void {
	if (game.edit.selection.length === 0) return;
	const hex = colourHex.value.replace("#", "");
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	game.dispatch({
		type: "setColour",
		partIds: game.edit.selection,
		r,
		g,
		b,
		opacity: opacity.value / 100,
	});
}
</script>

<template>
	<div class="cannon-props">
		<UFormField label="Density" class="field">
			<div class="slider-row">
				<USlider v-model="density" :min="1" :max="30" :step="1" size="sm" class="slider" />
				<UInput v-model="density" type="number" size="xs" class="num-input" />
			</div>
			<IbTodo label="setDensity" />
		</UFormField>

		<div class="checkboxes">
			<UCheckbox v-model="collides" label="Collides" />
			<IbTodo label="setCollide" />
		</div>
		<div class="checkboxes">
			<UCheckbox v-model="fixate" label="Fixate" />
			<IbTodo label="setFixate" />
		</div>

		<UFormField label="Color" class="field">
			<div class="colour-row">
				<input v-model="colourHex" type="color" class="colour-swatch" />
				<UFormField label="Opacity" class="opacity-field">
					<USlider v-model="opacity" :min="0" :max="100" :step="1" size="sm" />
				</UFormField>
			</div>
			<IbButton family="blue" label="Change Color" class="colour-apply" @click="applyColour" />
		</UFormField>

		<div class="checkboxes">
			<UCheckbox v-model="outline" label="Show Outlines" />
			<IbTodo label="setOutline" />
		</div>
		<div class="checkboxes">
			<UCheckbox v-model="outlineBehind" label="Outlines Behind" />
			<IbTodo label="setTerrain" />
		</div>
		<div class="checkboxes">
			<UCheckbox v-model="undragable" label="Undraggable" />
			<IbTodo label="setUndragable" />
		</div>

		<UFormField label="Cannon Strength" class="field">
			<div class="slider-row">
				<USlider v-model="cannonStrength" :min="1" :max="30" :step="1" size="sm" class="slider" />
				<UInput v-model="cannonStrength" type="number" size="xs" class="num-input" />
			</div>
			<IbTodo label="setCannonStrength" />
		</UFormField>

		<UFormField label="Fire key" class="field">
			<UInput v-model="fireKey" size="xs" class="key-input" />
			<IbTodo label="setCannonFireKey" />
		</UFormField>
	</div>
</template>

<style scoped>
.cannon-props {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 4px 8px 10px;
}

.field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.slider-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.slider {
	flex: 1;
}

.num-input,
.key-input {
	width: 64px;
}

.checkboxes {
	display: flex;
	align-items: center;
	gap: 8px;
}

.colour-row {
	display: flex;
	align-items: center;
	gap: 10px;
}

.colour-swatch {
	width: 28px;
	height: 28px;
	padding: 0;
	border: 1px solid var(--ib-purple);
	border-radius: 6px;
	background: none;
	cursor: pointer;
	flex-shrink: 0;
}

.opacity-field {
	flex: 1;
}

.colour-apply {
	margin-top: 4px;
	align-self: flex-start;
}
</style>
