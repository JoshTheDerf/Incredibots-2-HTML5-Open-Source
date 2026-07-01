<script setup lang="ts">
// Visual port of PartEditWindow.ts ShowObjectPanel (m_objectEditPanel) —
// the property editor shown for ShapePart instances (Circle/Rect/Triangle).
//
// Live-wired: colour Apply -> setColour(edit.selection).
// Flagged (no GameCore command yet): density, collide, camera-focus, fixate,
// outline, outline-behind (terrain), undragable. These need setDensity,
// setCollide, setCameraFocus, setFixate, setOutline, setTerrain,
// setUndragable commands respectively.
import { ref, computed } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";
import IbTodo from "../IbTodo.vue";

const game = useGameStore();

// Header mirrors m_shapeHeader.text ("Circle" | "Rectangle" | "Triangle").
// No shape-type read model in GameCore yet, so this is a local dev toggle.
type ShapeKind = "Circle" | "Rectangle" | "Triangle";
const shapeKind = ref<ShapeKind>("Circle");
const shapeKindOptions: ShapeKind[] = ["Circle", "Rectangle", "Triangle"];

// -- Density (m_densitySlider / m_densityArea) --
const density = ref(15);

// -- Colour (ColourChangeWindow: RGBA + opacity slider) --
const colourHex = ref("#4a7dfc");
const opacity = ref(100);

// -- Checkboxes --
const collides = ref(true);
const cameraFocus = ref(false);
const fixate = ref(false);
const outline = ref(false);
const outlineBehind = ref(false); // "terrain" in source
const undragable = ref(false);

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
	<div class="shape-props">
		<div class="header-row">
			<USelect v-model="shapeKind" :items="shapeKindOptions" size="xs" class="shape-select" />
			<IbTodo label="needs selected-part data" />
		</div>

		<UFormField label="Density" class="field">
			<div class="slider-row">
				<USlider v-model="density" :min="1" :max="30" :step="1" size="sm" class="slider" />
				<UInput v-model="density" type="number" size="xs" class="num-input" />
			</div>
			<IbTodo label="setDensity not wired" />
		</UFormField>

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
			<UCheckbox v-model="collides" label="Collides" />
			<IbTodo label="setCollide" />
		</div>
		<div class="checkboxes">
			<UCheckbox v-model="cameraFocus" label="Camera Focus" />
			<IbTodo label="setCameraFocus" />
		</div>
		<div class="checkboxes">
			<UCheckbox v-model="fixate" label="Fixate" />
			<IbTodo label="setFixate" />
		</div>
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
	</div>
</template>

<style scoped>
.shape-props {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 4px 8px 10px;
}

.header-row {
	display: flex;
	align-items: center;
	gap: 6px;
}

.shape-select {
	flex: 1;
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

.num-input {
	width: 56px;
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

.checkboxes {
	display: flex;
	align-items: center;
	gap: 8px;
}
</style>
