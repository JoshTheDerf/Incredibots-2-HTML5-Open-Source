<script setup lang="ts">
// Port of PartEditWindow.ts ShowThrustersPanel (m_thrustersEditPanel). Fully
// wired: reads edit.selectedPart, dispatches setThrusterStrength /
// setThrusterKey / setThrusterAutoOn (ported from ChangeSliderAction STRENGTH,
// ControlKeyAction THRUSTERS_TYPE, JointCheckboxAction AUTO_ON_TYPE).
import { computed } from "vue";
import { useGameStore } from "../../gameStore";
import { keyToLabel, labelToKey } from "../../keyLabels";

const game = useGameStore();
const sel = computed(() => game.edit.selectedPart);
const ids = computed(() => game.edit.selection);

// Thruster strength max from the active challenge restriction (PartEditWindow
// :1370: maxValue = maxThrusterStrength). Min stays 1 (m_thrustSlider.minValue
// :654); falls back to 1..30 with no challenge / unset.
const strengthMax = computed(() => game.challenge?.restrictions.maxThrusterStrength ?? 30);

const strength = computed({
	get: () => sel.value?.strength ?? 15,
	set: (v: number) => game.dispatch({ type: "setThrusterStrength", partIds: ids.value, value: Number(v) }),
});
const thrustKey = computed({
	get: () => keyToLabel(sel.value?.thrustKey),
	set: (v: string) => {
		const key = labelToKey(v);
		if (key != null) game.dispatch({ type: "setThrusterKey", partIds: ids.value, key });
	},
});
const autoOn = computed({
	get: () => sel.value?.autoOn ?? false,
	set: (v: boolean) => game.dispatch({ type: "setThrusterAutoOn", partIds: ids.value, value: v }),
});
</script>

<template>
	<div class="thruster-props">
		<UFormField label="Thruster Strength" class="field">
			<div class="slider-row">
				<USlider v-model="strength" :min="1" :max="strengthMax" :step="1" size="sm" class="slider" />
				<UInput v-model.number="strength" type="number" size="xs" class="num-input" />
			</div>
		</UFormField>

		<UFormField label="Activate:" class="field">
			<UInput v-model="thrustKey" size="xs" class="key-input" />
		</UFormField>

		<div class="checkboxes">
			<UCheckbox v-model="autoOn" label="Auto-On" />
		</div>
	</div>
</template>

<style scoped>
.thruster-props {
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
</style>
