<script setup lang="ts">
// Port of PartEditWindow.ts ShowCannonPanel (m_cannonPanel) — Cannon is a
// ShapePart, so it reuses the shape physical props (density/collide/fixate/
// outline/outline-behind/undragable/colour) plus cannon-only strength & fire
// key. Fully wired to GameCore.
import { computed, ref, watch } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";
import IbTodo from "../IbTodo.vue";
import { keyToLabel, labelToKey } from "../../keyLabels";

const game = useGameStore();
const sel = computed(() => game.edit.selectedPart);
const ids = computed(() => game.edit.selection);

const density = computed({
	get: () => sel.value?.density ?? 15,
	set: (v: number) => game.dispatch({ type: "setDensity", partIds: ids.value, value: Number(v) }),
});
const collides = computed({
	get: () => sel.value?.collide ?? true,
	set: (v: boolean) => game.dispatch({ type: "setCollide", partIds: ids.value, value: v }),
});
const fixate = computed({
	get: () => sel.value?.fixate ?? false,
	set: (v: boolean) => game.dispatch({ type: "setFixate", partIds: ids.value, value: v }),
});
const outline = computed({
	get: () => sel.value?.outline ?? true,
	set: (v: boolean) => game.dispatch({ type: "setOutline", partIds: ids.value, value: v }),
});
const outlineBehind = computed({
	get: () => sel.value?.outlineBehind ?? false,
	set: (v: boolean) => game.dispatch({ type: "setOutlineBehind", partIds: ids.value, value: v }),
});
const undragable = computed({
	get: () => sel.value?.undragable ?? false,
	set: (v: boolean) => game.dispatch({ type: "setUndragable", partIds: ids.value, value: v }),
});

// Cannon strength (m_strengthSlider7) & fire key (m_fireKeyArea).
const cannonStrength = computed({
	get: () => sel.value?.strength ?? 15,
	set: (v: number) => game.dispatch({ type: "setCannonStrength", partIds: ids.value, value: Number(v) }),
});
const fireKey = computed({
	get: () => keyToLabel(sel.value?.fireKey),
	set: (v: string) => {
		const key = labelToKey(v);
		if (key != null) game.dispatch({ type: "setCannonFireKey", partIds: ids.value, key });
	},
});

const localColour = ref("#4a7dfc");
const opacity = ref(100);
watch(
	sel,
	() => {
		localColour.value =
			"#" + [sel.value?.red ?? 0, sel.value?.green ?? 0, sel.value?.blue ?? 0]
				.map((c) => Math.round(c).toString(16).padStart(2, "0"))
				.join("");
		opacity.value = Math.round((sel.value?.opacity ?? 1) * 100);
	},
	{ immediate: true },
);
function applyColour(): void {
	if (ids.value.length === 0) return;
	const hex = localColour.value.replace("#", "");
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	game.dispatch({ type: "setColour", partIds: ids.value, r, g, b, opacity: opacity.value / 100 });
}
</script>

<template>
	<div class="cannon-props">
		<UFormField label="Density" class="field">
			<div class="slider-row">
				<USlider v-model="density" :min="1" :max="30" :step="1" size="sm" class="slider" />
				<UInput v-model.number="density" type="number" size="xs" class="num-input" />
			</div>
		</UFormField>

		<div class="checkboxes">
			<UCheckbox v-model="collides" label="Collides" />
		</div>
		<div class="checkboxes">
			<UCheckbox v-model="undragable" label="Undraggable" />
		</div>
		<div class="checkboxes">
			<UCheckbox v-model="fixate" label="Fixate" />
		</div>

		<UFormField label="Color" class="field">
			<div class="colour-row">
				<input v-model="localColour" type="color" class="colour-swatch" />
				<UFormField label="Opacity" class="opacity-field">
					<USlider v-model="opacity" :min="0" :max="100" :step="1" size="sm" />
				</UFormField>
			</div>
			<IbButton family="blue" label="Change Color" class="colour-apply" @click="applyColour" />
		</UFormField>

		<div class="order-buttons">
			<IbButton family="pink" label="Move to Front" class="order-btn" disabled />
			<IbButton family="pink" label="Move to Back" class="order-btn" disabled />
			<IbTodo label="no command" />
		</div>

		<div class="checkboxes">
			<UCheckbox v-model="outline" label="Show Outlines" />
		</div>
		<div class="checkboxes">
			<UCheckbox v-model="outlineBehind" label="Outlines Behind" />
		</div>

		<UFormField label="Fire:" class="field">
			<UInput v-model="fireKey" size="xs" class="key-input" />
		</UFormField>

		<UFormField label="Cannon Strength" class="field">
			<div class="slider-row">
				<USlider v-model="cannonStrength" :min="1" :max="30" :step="1" size="sm" class="slider" />
				<UInput v-model.number="cannonStrength" type="number" size="xs" class="num-input" />
			</div>
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

.order-buttons {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.order-buttons :deep(.ib-btn) {
	width: 100%;
}
</style>
