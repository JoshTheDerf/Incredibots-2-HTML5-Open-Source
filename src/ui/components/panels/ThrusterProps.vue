<script setup lang="ts">
// Visual port of PartEditWindow.ts ShowThrustersPanel (m_thrustersEditPanel).
//
// Entirely flagged: no thruster commands exist in GameCore yet.
// Needs: setThrusterStrength, setThrusterKey, setThrusterAutoOn.
import { ref } from "vue";
import IbTodo from "../IbTodo.vue";

const strength = ref(15); // m_thrustSlider / m_thrustArea
const thrustKey = ref("W"); // m_thrustKeyArea
const autoOn = ref(false); // m_autoBox3
</script>

<template>
	<div class="thruster-props">
		<UFormField label="Thruster Strength" class="field">
			<div class="slider-row">
				<USlider v-model="strength" :min="1" :max="30" :step="1" size="sm" class="slider" />
				<UInput v-model="strength" type="number" size="xs" class="num-input" />
			</div>
			<IbTodo label="setThrusterStrength" />
		</UFormField>

		<UFormField label="Activate key" class="field">
			<UInput v-model="thrustKey" size="xs" class="key-input" />
			<IbTodo label="setThrusterKey" />
		</UFormField>

		<div class="checkboxes">
			<UCheckbox v-model="autoOn" label="Auto-On" />
			<IbTodo label="setThrusterAutoOn" />
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
