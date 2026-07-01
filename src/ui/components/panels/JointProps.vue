<script setup lang="ts">
// Visual port of PartEditWindow.ts ShowJointPanel (m_jointEditPanel) —
// covers both RevoluteJoint ("Rotating Joint") and PrismaticJoint
// ("Sliding Joint") property editors, toggled by joint kind since both
// share most of the same layout in the original (strength/speed sliders,
// control keys, motor/piston enable, limits for revolute only).
//
// Entirely flagged: no joint-property commands exist in GameCore yet.
// Needs: setJointMotor(enabled), setJointStrength, setJointSpeed,
// setJointLimits(lower, upper), setJointControlKey(cw/ccw or up/down),
// setJointAutoOn(cw/ccw or oscillate), setJointStiff (Floppy Joint),
// setJointInitialLength (prismatic only), setOutline, setCollide.
import { ref, computed } from "vue";
import IbButton from "../IbButton.vue";
import IbTodo from "../IbTodo.vue";

type JointKind = "revolute" | "prismatic";
const jointKind = ref<JointKind>("revolute");
const jointKindOptions: { label: string; value: JointKind }[] = [
	{ label: "Revolute (Rotating Joint)", value: "revolute" },
	{ label: "Prismatic (Sliding Joint)", value: "prismatic" },
];

const isRevolute = computed(() => jointKind.value === "revolute");

// -- Shared motor/piston controls --
const motorEnabled = ref(false); // m_enableMotorBox
const floppyJoint = ref(true); // m_rigidJointBox ("Floppy Joint" = !isStiff)
const strength = ref(15); // m_strengthSlider / m_strengthArea
const speed = ref(15); // m_speedSlider / m_speedArea

// -- Revolute-only: rotation limits + CW/CCW --
const lowerLimit = ref<string>("None"); // m_minDispArea
const upperLimit = ref<string>("None"); // m_maxDispArea
const autoOnCW = ref(false); // m_autoBox1 (revolute)
const autoOnCCW = ref(false); // m_autoBox2 (revolute)
const rotateCWKey = ref("W");
const rotateCCWKey = ref("S");

// -- Prismatic-only: initial length + expand/contract --
const initialLength = ref(50);
const autoOscillate = ref(false); // m_autoBox1 (prismatic, relabeled)
const expandKey = ref("W");
const contractKey = ref("S");
const outline = ref(false); // m_outlineBox2 (prismatic only)
const collides = ref(true); // m_collisionBox3 (prismatic only)

const strengthLabel = computed(() => (isRevolute.value ? "Motor Strength" : "Piston Strength"));
const speedLabel = computed(() => (isRevolute.value ? "Motor Speed" : "Piston Speed"));
</script>

<template>
	<div class="joint-props">
		<div class="header-row">
			<USelect v-model="jointKind" :items="jointKindOptions" size="xs" class="kind-select" />
			<IbTodo label="needs selected-part data" />
		</div>

		<div class="checkboxes">
			<UCheckbox v-model="motorEnabled" :label="isRevolute ? 'Enable Motor' : 'Enable Piston'" />
			<IbTodo label="setJointMotor" />
		</div>

		<UFormField :label="strengthLabel" class="field">
			<div class="slider-row">
				<USlider v-model="strength" :min="1" :max="30" :step="1" size="sm" :disabled="!motorEnabled" class="slider" />
				<UInput v-model="strength" type="number" size="xs" :disabled="!motorEnabled" class="num-input" />
			</div>
			<IbTodo label="setJointStrength" />
		</UFormField>

		<UFormField :label="speedLabel" class="field">
			<div class="slider-row">
				<USlider v-model="speed" :min="1" :max="30" :step="1" size="sm" :disabled="!motorEnabled" class="slider" />
				<UInput v-model="speed" type="number" size="xs" :disabled="!motorEnabled" class="num-input" />
			</div>
			<IbTodo label="setJointSpeed" />
		</UFormField>

		<template v-if="isRevolute">
			<UFormField label="Rotate CW key" class="field">
				<UInput v-model="rotateCWKey" size="xs" :disabled="!motorEnabled" class="key-input" />
				<IbTodo label="setJointControlKey" />
			</UFormField>
			<UFormField label="Rotate CCW key" class="field">
				<UInput v-model="rotateCCWKey" size="xs" :disabled="!motorEnabled" class="key-input" />
				<IbTodo label="setJointControlKey" />
			</UFormField>
			<UFormField label="Lower Limit (degrees)" class="field">
				<UInput v-model="lowerLimit" size="xs" class="key-input" />
				<IbTodo label="setJointLimits" />
			</UFormField>
			<UFormField label="Upper Limit (degrees)" class="field">
				<UInput v-model="upperLimit" size="xs" class="key-input" />
				<IbTodo label="setJointLimits" />
			</UFormField>
			<div class="checkboxes">
				<UCheckbox v-model="autoOnCW" label="Auto-On CW" :disabled="!motorEnabled" />
				<IbTodo label="setJointAutoOn" />
			</div>
			<div class="checkboxes">
				<UCheckbox v-model="autoOnCCW" label="Auto-On CCW" :disabled="!motorEnabled" />
				<IbTodo label="setJointAutoOn" />
			</div>
		</template>

		<template v-else>
			<UFormField label="Expand key" class="field">
				<UInput v-model="expandKey" size="xs" :disabled="!motorEnabled" class="key-input" />
				<IbTodo label="setJointControlKey" />
			</UFormField>
			<UFormField label="Contract key" class="field">
				<UInput v-model="contractKey" size="xs" :disabled="!motorEnabled" class="key-input" />
				<IbTodo label="setJointControlKey" />
			</UFormField>
			<UFormField label="Initial Length" class="field">
				<UInput v-model="initialLength" type="number" size="xs" class="key-input" />
				<IbTodo label="setJointInitialLength" />
			</UFormField>
			<div class="checkboxes">
				<UCheckbox v-model="autoOscillate" label="Auto Oscillate" :disabled="!motorEnabled" />
				<IbTodo label="setJointAutoOn" />
			</div>
			<div class="checkboxes">
				<UCheckbox v-model="outline" label="Show Outlines" />
				<IbTodo label="setOutline" />
			</div>
			<div class="checkboxes">
				<UCheckbox v-model="collides" label="Collides" />
				<IbTodo label="setCollide" />
			</div>
			<IbButton family="blue" label="Change Color" class="colour-apply" />
			<IbTodo label="setColour supports partIds but joint colour path unverified" />
		</template>

		<div class="checkboxes">
			<UCheckbox v-model="floppyJoint" label="Floppy Joint" :disabled="!motorEnabled" />
			<IbTodo label="setJointStiff" />
		</div>
	</div>
</template>

<style scoped>
.joint-props {
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

.kind-select {
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

.num-input,
.key-input {
	width: 64px;
}

.checkboxes {
	display: flex;
	align-items: center;
	gap: 8px;
}

.colour-apply {
	align-self: flex-start;
}
</style>
