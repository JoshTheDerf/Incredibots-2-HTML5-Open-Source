<script setup lang="ts">
// Bomb edit panel (IB3 Bomb port, P2). Mirrors the CannonProps pattern: the
// shared ShapePart physical props (density/collide/fixate/outline/colour) plus
// the bomb-only fields, with ranges from IB3 Util.as BO_* consts
// (strength 0..40, blast radius 0..50, sensitivity 0..100; delay in ms).
import { computed, ref, watch } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";

const game = useGameStore();
const sel = computed(() => game.edit.selectedPart);
const ids = computed(() => game.edit.selection);

const densityMin = computed(() => game.challenge?.restrictions.minDensity ?? 1);
const densityMax = computed(() => game.challenge?.restrictions.maxDensity ?? 30);

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
const undragable = computed({
	get: () => sel.value?.undragable ?? false,
	set: (v: boolean) => game.dispatch({ type: "setUndragable", partIds: ids.value, value: v }),
});

// --- Bomb fields (setBombProps; omitted fields stay unchanged) ---
const blastRadius = computed({
	get: () => sel.value?.blastRadius ?? 4,
	set: (v: number) => game.dispatch({ type: "setBombProps", partIds: ids.value, blastRadius: Number(v) }),
});
const bombStrength = computed({
	get: () => sel.value?.strength ?? 10,
	set: (v: number) => game.dispatch({ type: "setBombProps", partIds: ids.value, strength: Number(v) }),
});
const bombDelay = computed({
	get: () => sel.value?.bombDelay ?? 2000,
	set: (v: number) => game.dispatch({ type: "setBombProps", partIds: ids.value, delay: Number(v) }),
});
const explodeOnImpact = computed({
	get: () => sel.value?.explodeOnImpact ?? true,
	set: (v: boolean) => game.dispatch({ type: "setBombProps", partIds: ids.value, explodeOnImpact: v }),
});
const delayAfterImpact = computed({
	get: () => sel.value?.delayAfterImpact ?? true,
	set: (v: boolean) => game.dispatch({ type: "setBombProps", partIds: ids.value, delayAfterImpact: v }),
});
const delayAfterTrigger = computed({
	get: () => sel.value?.delayAfterTrigger ?? false,
	set: (v: boolean) => game.dispatch({ type: "setBombProps", partIds: ids.value, delayAfterTrigger: v }),
});
const sensitive = computed({
	get: () => sel.value?.sensitive ?? false,
	set: (v: boolean) => game.dispatch({ type: "setBombProps", partIds: ids.value, sensitive: v }),
});
const sensitivity = computed({
	get: () => sel.value?.sensitivity ?? 95,
	set: (v: number) => game.dispatch({ type: "setBombProps", partIds: ids.value, sensitivity: Number(v) }),
});
const deflect = computed({
	get: () => sel.value?.deflect ?? true,
	set: (v: boolean) => game.dispatch({ type: "setBombProps", partIds: ids.value, deflect: v }),
});
const repeatable = computed({
	get: () => sel.value?.repeatable ?? false,
	set: (v: boolean) => game.dispatch({ type: "setBombProps", partIds: ids.value, repeatable: v }),
});
const repeat = computed({
	get: () => sel.value?.repeat ?? 0,
	set: (v: number) => game.dispatch({ type: "setBombProps", partIds: ids.value, repeat: Number(v) }),
});

// Detonate trigger list (a bomb is a trigger TARGET like a cannon).
const triggerList = computed({
	get: () => sel.value?.triggerList ?? "",
	set: (v: string) => game.dispatch({ type: "setTriggerList", partIds: ids.value, value: v }),
});

const localColour = ref("#fafa00");
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
	<div class="bomb-props">
		<UFormField label="Density" class="field">
			<div class="slider-row">
				<USlider v-model="density" :min="densityMin" :max="densityMax" :step="1" size="sm" class="slider" />
				<UInput v-model.number="density" type="number" size="xs" class="num-input" />
			</div>
		</UFormField>

		<UFormField label="Blast Radius" class="field">
			<div class="slider-row">
				<USlider v-model="blastRadius" :min="0" :max="50" :step="0.5" size="sm" class="slider" />
				<UInput v-model.number="blastRadius" type="number" size="xs" class="num-input" />
			</div>
		</UFormField>

		<UFormField label="Bomb Strength" class="field">
			<div class="slider-row">
				<USlider v-model="bombStrength" :min="0" :max="40" :step="1" size="sm" class="slider" />
				<UInput v-model.number="bombStrength" type="number" size="xs" class="num-input" />
			</div>
		</UFormField>

		<UFormField label="Delay (ms)" class="field">
			<UInput v-model.number="bombDelay" type="number" :min="0" :step="100" size="xs" class="num-input" />
		</UFormField>

		<div class="checkboxes"><UCheckbox v-model="explodeOnImpact" label="Explode on Impact" /></div>
		<div class="checkboxes"><UCheckbox v-model="delayAfterImpact" label="Delay after Impact" /></div>
		<div class="checkboxes"><UCheckbox v-model="delayAfterTrigger" label="Delay after Trigger" /></div>
		<div class="checkboxes"><UCheckbox v-model="deflect" label="Deflect Blast" /></div>

		<div class="checkboxes"><UCheckbox v-model="sensitive" label="Sensitive" /></div>
		<UFormField v-if="sensitive" label="Sensitivity" class="field">
			<div class="slider-row">
				<USlider v-model="sensitivity" :min="0" :max="100" :step="1" size="sm" class="slider" />
				<UInput v-model.number="sensitivity" type="number" size="xs" class="num-input" />
			</div>
		</UFormField>

		<div class="checkboxes"><UCheckbox v-model="repeatable" label="Repeatable" /></div>
		<UFormField v-if="repeatable" label="Repeat (0 = unlimited)" class="field">
			<UInput v-model.number="repeat" type="number" :min="0" size="xs" class="num-input" />
		</UFormField>

		<UFormField label="Detonate Triggers" class="field">
			<UInput v-model="triggerList" placeholder="trigger names, comma-separated" size="xs" />
		</UFormField>

		<div class="checkboxes"><UCheckbox v-model="collides" label="Collides" /></div>
		<div class="checkboxes"><UCheckbox v-model="undragable" label="Undraggable" /></div>
		<div class="checkboxes"><UCheckbox v-model="fixate" label="Fixate" /></div>
		<div class="checkboxes"><UCheckbox v-model="outline" label="Show Outlines" /></div>

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
			<IbButton
				family="pink"
				label="Move to Front"
				class="order-btn"
				@click="game.dispatch({ type: 'movePartsToFront', partIds: ids })"
			/>
			<IbButton
				family="pink"
				label="Move to Back"
				class="order-btn"
				@click="game.dispatch({ type: 'movePartsToBack', partIds: ids })"
			/>
		</div>
	</div>
</template>

<style scoped>
.bomb-props {
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

.num-input {
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
