<script setup lang="ts">
// Port of PartEditWindow.ts ShowJointPanel (m_jointEditPanel) — covers both
// RevoluteJoint ("Rotating Joint") and PrismaticJoint ("Sliding Joint").
// Fully wired to GameCore: reads edit.selectedPart, dispatches the joint
// commands ported from JointCheckboxAction / ChangeSliderAction /
// ControlKeyAction / LimitChangeAction.
import { computed, ref, watch } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";
import { keyToLabel, labelToKey } from "../../keyLabels";

const game = useGameStore();
const sel = computed(() => game.edit.selectedPart);
const ids = computed(() => game.edit.selection);

const isRevolute = computed(() => sel.value?.kind === "RevoluteJoint");

// -- Motor / piston enable (JointCheckboxAction ENABLE_TYPE) --
const motorEnabled = computed({
	get: () => sel.value?.motorOn ?? false,
	set: (v: boolean) => game.dispatch({ type: "setJointMotor", partIds: ids.value, value: v }),
});
// -- Floppy Joint == !isStiff (JointCheckboxAction RIGID_TYPE) --
const floppyJoint = computed({
	get: () => !(sel.value?.stiff ?? false),
	set: (v: boolean) => game.dispatch({ type: "setJointStiff", partIds: ids.value, value: !v }),
});
const strength = computed({
	get: () => sel.value?.strength ?? 15,
	set: (v: number) => game.dispatch({ type: "setJointStrength", partIds: ids.value, value: Number(v) }),
});
const speed = computed({
	get: () => sel.value?.speed ?? 15,
	set: (v: number) => game.dispatch({ type: "setJointSpeed", partIds: ids.value, value: Number(v) }),
});

// -- Revolute: CW/CCW keys, limits, auto-on --
const rotateCWKey = computed({
	get: () => keyToLabel(sel.value?.keyCW),
	set: (v: string) => setKey("cw", v),
});
const rotateCCWKey = computed({
	get: () => keyToLabel(sel.value?.keyCCW),
	set: (v: string) => setKey("ccw", v),
});
const autoOnCW = computed({
	get: () => sel.value?.autoCW ?? false,
	set: (v: boolean) => game.dispatch({ type: "setJointAutoOn", partIds: ids.value, which: "cw", value: v }),
});
const autoOnCCW = computed({
	get: () => sel.value?.autoCCW ?? false,
	set: (v: boolean) => game.dispatch({ type: "setJointAutoOn", partIds: ids.value, which: "ccw", value: v }),
});

// Limits are edited as text ("None" or a degree number), matching min/maxLimitText.
const lowerLimit = ref("None");
const upperLimit = ref("None");
watch(
	sel,
	() => {
		lowerLimit.value = sel.value?.lowerLimit == null ? "None" : String(sel.value.lowerLimit);
		upperLimit.value = sel.value?.upperLimit == null ? "None" : String(sel.value.upperLimit);
	},
	{ immediate: true },
);
function commitLimits(): void {
	const parse = (s: string): number | null => {
		const n = Number(s.trim());
		return s.trim() === "" || isNaN(n) ? null : n;
	};
	game.dispatch({
		type: "setJointLimits",
		partIds: ids.value,
		lower: parse(lowerLimit.value),
		upper: parse(upperLimit.value),
	});
}

// -- Prismatic: expand/contract keys, initial length, oscillate --
const expandKey = computed({
	get: () => keyToLabel(sel.value?.keyUp),
	set: (v: string) => setKey("up", v),
});
const contractKey = computed({
	get: () => keyToLabel(sel.value?.keyDown),
	set: (v: string) => setKey("down", v),
});
const autoOscillate = computed({
	get: () => sel.value?.autoOscillate ?? false,
	set: (v: boolean) => game.dispatch({ type: "setJointAutoOn", partIds: ids.value, which: "oscillate", value: v }),
});
const outline = computed({
	get: () => sel.value?.outline ?? true,
	set: (v: boolean) => game.dispatch({ type: "setOutline", partIds: ids.value, value: v }),
});
const collides = computed({
	get: () => sel.value?.collide ?? true,
	set: (v: boolean) => game.dispatch({ type: "setCollide", partIds: ids.value, value: v }),
});

function setKey(which: "cw" | "ccw" | "up" | "down", label: string): void {
	const key = labelToKey(label);
	if (key != null) game.dispatch({ type: "setJointControlKey", partIds: ids.value, which, key });
}

const strengthLabel = computed(() => (isRevolute.value ? "Motor Strength" : "Piston Strength"));
const speedLabel = computed(() => (isRevolute.value ? "Motor Speed" : "Piston Speed"));

// Prismatic colour (it carries its own colour, like a ShapePart).
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
	<div class="joint-props">
		<div class="checkboxes">
			<UCheckbox v-model="motorEnabled" :label="isRevolute ? 'Enable Motor' : 'Enable Piston'" />
		</div>

		<UFormField :label="strengthLabel" class="field">
			<div class="slider-row">
				<USlider v-model="strength" :min="1" :max="30" :step="1" size="sm" :disabled="!motorEnabled" class="slider" />
				<UInput v-model.number="strength" type="number" size="xs" :disabled="!motorEnabled" class="num-input" />
			</div>
		</UFormField>

		<UFormField :label="speedLabel" class="field">
			<div class="slider-row">
				<USlider v-model="speed" :min="1" :max="30" :step="1" size="sm" :disabled="!motorEnabled" class="slider" />
				<UInput v-model.number="speed" type="number" size="xs" :disabled="!motorEnabled" class="num-input" />
			</div>
		</UFormField>

		<div class="checkboxes">
			<UCheckbox v-model="floppyJoint" label="Floppy Joint" :disabled="!motorEnabled" />
		</div>

		<template v-if="isRevolute">
			<UFormField label="Rotate CW:" class="field">
				<UInput v-model="rotateCWKey" size="xs" :disabled="!motorEnabled" class="key-input" />
			</UFormField>
			<UFormField label="Rotate CCW:" class="field">
				<UInput v-model="rotateCCWKey" size="xs" :disabled="!motorEnabled" class="key-input" />
			</UFormField>
			<div class="checkboxes">
				<UCheckbox v-model="autoOnCW" label="Auto-On CW" :disabled="!motorEnabled" />
			</div>
			<div class="checkboxes">
				<UCheckbox v-model="autoOnCCW" label="Auto-On CCW" :disabled="!motorEnabled" />
			</div>
			<UFormField label="Lower Limit (degrees)" class="field">
				<UInput v-model="lowerLimit" size="xs" class="key-input" @blur="commitLimits" @keyup.enter="commitLimits" />
			</UFormField>
			<UFormField label="Upper Limit (degrees)" class="field">
				<UInput v-model="upperLimit" size="xs" class="key-input" @blur="commitLimits" @keyup.enter="commitLimits" />
			</UFormField>
		</template>

		<template v-else>
			<UFormField label="Expand:" class="field">
				<UInput v-model="expandKey" size="xs" :disabled="!motorEnabled" class="key-input" />
			</UFormField>
			<UFormField label="Contract:" class="field">
				<UInput v-model="contractKey" size="xs" :disabled="!motorEnabled" class="key-input" />
			</UFormField>
			<div class="checkboxes">
				<UCheckbox v-model="autoOscillate" label="Auto Oscillate" :disabled="!motorEnabled" />
			</div>
			<div class="checkboxes">
				<UCheckbox v-model="collides" label="Collides" />
			</div>
			<div class="colour-block">
				<input v-model="localColour" type="color" class="colour-swatch" />
				<IbButton family="blue" label="Change Color" class="colour-apply" @click="applyColour" />
			</div>
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
			<div class="checkboxes">
				<UCheckbox v-model="outline" label="Show Outlines" />
			</div>
		</template>
	</div>
</template>

<style scoped>
.joint-props {
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

.colour-block {
	display: flex;
	align-items: center;
	gap: 8px;
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

.colour-apply {
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
