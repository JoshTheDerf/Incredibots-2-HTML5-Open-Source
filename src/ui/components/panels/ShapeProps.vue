<script setup lang="ts">
// Port of PartEditWindow.ts ShowObjectPanel (m_objectEditPanel) — the property
// editor for ShapePart instances (Circle/Rect/Triangle). Now fully wired to
// GameCore: reads from edit.selectedPart, writes via the per-property commands
// (setDensity/setCollide/setCameraFocus/setFixate/setOutline/setOutlineBehind/
// setUndragable) ported from ControllerGame + src/Actions/*.
import { computed, ref, watch } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";
import {
	MAX_DENSITY,
	MAX_FRICTION,
	MAX_RESTITUTION,
	MIN_DENSITY,
	MIN_FRICTION,
	MIN_RESTITUTION,
} from "../../../Parts/partDefaults";

const game = useGameStore();

const sel = computed(() => game.edit.selectedPart);
const ids = computed(() => game.edit.selection);

// Density slider range from the active challenge restrictions (PartEditWindow
// :1050-1051: minValue = minDensity, maxValue = maxDensity). Falls back to the
// sandbox material range (partDefaults, widened for IB3) when no challenge / limit unset.
const densityMin = computed(() => game.challenge?.restrictions.minDensity ?? MIN_DENSITY);
const densityMax = computed(() => game.challenge?.restrictions.maxDensity ?? MAX_DENSITY);

// Density (m_densitySlider / m_densityArea) — ControllerGame.densitySlider.
const density = computed({
	get: () => sel.value?.density ?? 15,
	set: (v: number) => game.dispatch({ type: "setDensity", partIds: ids.value, value: Number(v) }),
});

// Friction / Restitution — Jaybit added these sliders to the main object panel
// (PartEditWindow diff: m_frictionSlider y=157 / m_restitutionSlider y=205), NOT
// to the Advanced window (shapeAdv has no material sliders). Ranges honour the
// active challenge restrictions; fall back to the 1..30 UI scale.
const restr = computed(() => game.challenge?.restrictions);
const frictionMin = computed(() => restr.value?.minFriction ?? MIN_FRICTION);
const frictionMax = computed(() => restr.value?.maxFriction ?? MAX_FRICTION);
const restitutionMin = computed(() => restr.value?.minRestitution ?? MIN_RESTITUTION);
const restitutionMax = computed(() => restr.value?.maxRestitution ?? MAX_RESTITUTION);
const frictionLocked = computed(() => frictionMin.value >= frictionMax.value);
const restitutionLocked = computed(() => restitutionMin.value >= restitutionMax.value);
const friction = computed({
	get: () => sel.value?.friction ?? 11,
	set: (v: number) => game.dispatch({ type: "setFriction", partIds: ids.value, value: Number(v) }),
});
const restitution = computed({
	get: () => sel.value?.restitution ?? 7,
	set: (v: number) => game.dispatch({ type: "setRestitution", partIds: ids.value, value: Number(v) }),
});

// Checkboxes (ShapeCheckboxAction / CameraAction).
const collides = computed({
	get: () => sel.value?.collide ?? true,
	set: (v: boolean) => game.dispatch({ type: "setCollide", partIds: ids.value, value: v }),
});
const cameraFocus = computed({
	get: () => sel.value?.cameraFocus ?? false,
	set: (v: boolean) => game.dispatch({ type: "setCameraFocus", partIds: ids.value, value: v }),
});
const fixate = computed({
	get: () => sel.value?.fixate ?? false,
	set: (v: boolean) => game.dispatch({ type: "setFixate", partIds: ids.value, value: v }),
});
// IB3 fixed rotation (locks the body angle) — ShapePart.fixedRotation.
const fixedRotation = computed({
	get: () => sel.value?.fixedRotation ?? false,
	set: (v: boolean) => game.dispatch({ type: "setFixedRotation", partIds: ids.value, value: v }),
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

// Colour (ColourChangeWindow: RGBA + opacity). Reads the part's current colour;
// applied on click via the already-wired setColour command.
const colourHex = computed(() =>
	"#" + [sel.value?.red ?? 0, sel.value?.green ?? 0, sel.value?.blue ?? 0].map((c) => Math.round(c).toString(16).padStart(2, "0")).join(""),
);
const localColour = ref(colourHex.value);
const opacity = ref(Math.round((sel.value?.opacity ?? 1) * 100));
watch(sel, () => {
	localColour.value = colourHex.value;
	opacity.value = Math.round((sel.value?.opacity ?? 1) * 100);
});

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
	<div class="shape-props">
		<UFormField label="Density" class="field">
			<div class="slider-row">
				<USlider v-model="density" :min="densityMin" :max="densityMax" :step="1" size="sm" class="slider" />
				<UInput v-model.number="density" type="number" size="xs" class="num-input" />
			</div>
		</UFormField>

		<UFormField label="Friction" class="field">
			<div class="slider-row">
				<USlider v-model="friction" :min="frictionMin" :max="frictionMax" :step="1" size="sm" :disabled="frictionLocked" class="slider" />
				<UInput v-model.number="friction" type="number" size="xs" :disabled="frictionLocked" class="num-input" />
			</div>
		</UFormField>

		<UFormField label="Restitution" class="field">
			<div class="slider-row">
				<USlider v-model="restitution" :min="restitutionMin" :max="restitutionMax" :step="1" size="sm" :disabled="restitutionLocked" class="slider" />
				<UInput v-model.number="restitution" type="number" size="xs" :disabled="restitutionLocked" class="num-input" />
			</div>
		</UFormField>

		<div class="checkboxes">
			<UCheckbox v-model="collides" label="Collides" />
		</div>
		<div class="checkboxes">
			<UCheckbox v-model="cameraFocus" label="Camera Focus" />
		</div>
		<div class="checkboxes">
			<UCheckbox v-model="undragable" label="Undraggable" />
		</div>
		<div class="checkboxes">
			<UCheckbox v-model="fixate" label="Fixate" />
		</div>
		<div class="checkboxes">
			<UCheckbox v-model="fixedRotation" label="Fixed Rotation" />
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
		<div class="checkboxes">
			<UCheckbox v-model="outlineBehind" label="Outlines Behind" />
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

.order-buttons {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.order-buttons :deep(.ib-btn) {
	width: 100%;
}
</style>
