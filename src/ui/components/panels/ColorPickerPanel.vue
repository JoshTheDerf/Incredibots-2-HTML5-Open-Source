<script setup lang="ts">
// Visual port of src/Gui/ColourChangeWindow.ts — the RGBA + opacity colour
// picker for shape parts. Original was a small 120x260 cream Pixi window with
// Red/Green/Blue/Opacity numeric fields, a live colour swatch, a named-colour
// dropdown that snaps R/G/B to preset values, a "Make Default" checkbox, and
// OK/Cancel buttons.
//
// Live-wired: R/G/B/Opacity sliders + the named-colour preset dropdown all
// drive local state and repaint the swatch exactly like the original
// redrawBox()/colourBox() logic. Additionally, every R/G/B change live-previews
// on the canvas by dispatching setColour immediately (faithful to
// ColourChangeWindow.redText/greenText/blueText -> cont.textEntered :221-243).
// "Apply" (legacy "OK") dispatches setColour with `makeDefault` set from the
// checkbox (setColour now supports makeDefault -> ControllerGame.colourButton's
// defaultColour flag).
import { computed, ref, watch } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

const game = useGameStore();

const hasSelection = computed(() => game.edit.selection.length > 0);

// Defaults match the original ColourChangeWindow's initial field values.
const red = ref(253);
const green = ref(136);
const blue = ref(92);
const opacity = ref(210);
const makeDefault = ref(false);

// Same named-colour presets as m_colourBox in the original, in the same order
// (index 0 is "--", i.e. no snap).
const colourPresets = [
	{ label: "--", r: null as number | null, g: null as number | null, b: null as number | null },
	{ label: "Red", r: 253, g: 66, b: 42 },
	{ label: "Orange", r: 253, g: 116, b: 10 },
	{ label: "Yellow", r: 251, g: 241, b: 56 },
	{ label: "Green", r: 80, g: 255, b: 72 },
	{ label: "Turquoise", r: 52, g: 245, b: 227 },
	{ label: "Blue", r: 54, g: 89, b: 255 },
	{ label: "Purple", r: 189, g: 87, b: 255 },
	{ label: "Pink", r: 255, g: 155, b: 152 },
	{ label: "Beige", r: 255, g: 216, b: 136 },
	{ label: "Brown", r: 151, g: 122, b: 46 },
	{ label: "White", r: 253, g: 253, b: 253 },
	{ label: "Grey", r: 160, g: 160, b: 160 },
	{ label: "Black", r: 24, g: 24, b: 24 },
];

const presetLabels = colourPresets.map((p) => (p.label === "--" ? "  --" : "  " + p.label));

// Mirrors SetComboBoxIndex(): derive which preset (if any) matches the
// current R/G/B so the dropdown stays in sync when sliders are dragged.
const selectedPresetLabel = computed<string>(() => {
	const match = colourPresets.findIndex(
		(p, i) => i > 0 && p.r === red.value && p.g === green.value && p.b === blue.value,
	);
	return presetLabels[match === -1 ? 0 : match];
});

function onPresetChange(label: string): void {
	const index = presetLabels.indexOf(label);
	const preset = colourPresets[index];
	if (preset && preset.r !== null && preset.g !== null && preset.b !== null) {
		red.value = preset.r;
		green.value = preset.g;
		blue.value = preset.b;
	}
}

// Live swatch preview — same colour math as redrawBox(), just rendered via
// CSS rgba() instead of a Pixi Graphics fill.
const swatchStyle = computed(() => ({
	backgroundColor: `rgba(${red.value}, ${green.value}, ${blue.value}, ${opacity.value / 255})`,
}));

function clamp255(n: number): number {
	if (Number.isNaN(n)) return 0;
	return Math.max(0, Math.min(255, Math.round(n)));
}

// Live preview: dispatch setColour (no makeDefault) on every R/G/B/opacity
// change so the canvas repaints as the sliders move, exactly like the legacy
// redText/greenText/blueText/opacityText each calling cont.textEntered()
// (:221-243). No-op when nothing is selected. Debounced lightly to coalesce
// rapid slider drags into one dispatch per tick (still per-change, faithful).
let previewTimer: ReturnType<typeof setTimeout> | null = null;
watch([red, green, blue, opacity], () => {
	if (!hasSelection.value) return;
	if (previewTimer) clearTimeout(previewTimer);
	previewTimer = setTimeout(() => {
		game.dispatch({
			type: "setColour",
			partIds: game.edit.selection,
			r: clamp255(red.value),
			g: clamp255(green.value),
			b: clamp255(blue.value),
			opacity: clamp255(opacity.value),
		});
	}, 0);
});

function apply(): void {
	game.dispatch({
		type: "setColour",
		partIds: game.edit.selection,
		r: clamp255(red.value),
		g: clamp255(green.value),
		b: clamp255(blue.value),
		opacity: clamp255(opacity.value),
		makeDefault: makeDefault.value,
	});
}

function cancel(): void {
	// Original just hid the window (this.visible = false). There is no
	// GameCore "close panel" concept here since visibility is owned by
	// whatever host renders this panel — left as a no-op emit for the host
	// to react to if it wants.
	emit("cancel");
}

const emit = defineEmits<{ cancel: [] }>();
</script>

<template>
	<div class="color-picker-panel ib-panel" :style="panelStyle">
		<div class="field">
			<label class="field-label" for="cp-red">Red:</label>
			<USlider id="cp-red" v-model="red" :min="0" :max="255" :step="1" size="sm" />
			<span class="field-value">{{ red }}</span>
		</div>
		<div class="field">
			<label class="field-label" for="cp-green">Green:</label>
			<USlider id="cp-green" v-model="green" :min="0" :max="255" :step="1" size="sm" />
			<span class="field-value">{{ green }}</span>
		</div>
		<div class="field">
			<label class="field-label" for="cp-blue">Blue:</label>
			<USlider id="cp-blue" v-model="blue" :min="0" :max="255" :step="1" size="sm" />
			<span class="field-value">{{ blue }}</span>
		</div>
		<div class="field">
			<label class="field-label" for="cp-opacity">Opacity:</label>
			<USlider id="cp-opacity" v-model="opacity" :min="0" :max="255" :step="1" size="sm" />
			<span class="field-value">{{ opacity }}</span>
		</div>

		<USelect
			:model-value="selectedPresetLabel"
			:items="presetLabels"
			size="xs"
			class="colour-select"
			@update:model-value="onPresetChange($event as string)"
		/>

		<div class="swatch-row">
			<div class="swatch" :style="swatchStyle" />
		</div>

		<div class="default-row">
			<UCheckbox v-model="makeDefault" label="Make Default" />
		</div>

		<div class="actions">
			<IbButton family="purple" label="Apply" :disabled="!hasSelection" @click="apply" />
			<IbButton family="purple" label="Cancel" @click="cancel" />
		</div>
		<p v-if="!hasSelection" class="hint">Select a part to apply a colour.</p>
	</div>
</template>

<style scoped>
.color-picker-panel {
	width: 150px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 4px 6px 8px;
	font-family: Arial, Helvetica, sans-serif;
}

.field {
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: center;
	gap: 2px 6px;
}

.field-label {
	grid-column: 1 / -1;
	font-size: 12px;
	font-weight: bold;
	color: var(--ib-dark);
}

.field-value {
	font-size: 10px;
	font-weight: bold;
	color: var(--ib-muted, #4c3d57);
	text-align: right;
	min-width: 24px;
}

.colour-select {
	width: 100%;
	height: 24px;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 10px;
	color: var(--ib-muted, #4c3d57);
	background: var(--ib-cream);
	border: 1px solid var(--ib-purple);
	border-radius: 3px;
	padding: 0 4px;
}

.swatch-row {
	display: flex;
	justify-content: center;
	padding: 4px 0;
}

.swatch {
	width: 60px;
	height: 30px;
	border: 1px solid #222222;
	background-image:
		linear-gradient(45deg, #ccc 25%, transparent 25%),
		linear-gradient(-45deg, #ccc 25%, transparent 25%),
		linear-gradient(45deg, transparent 75%, #ccc 75%),
		linear-gradient(-45deg, transparent 75%, #ccc 75%);
	background-size: 8px 8px;
	background-position:
		0 0,
		0 4px,
		4px -4px,
		-4px 0;
}

.default-row {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 3px 2px;
}

.actions {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin-top: 4px;
}

.actions :deep(.ib-btn) {
	width: 100%;
}

.hint {
	margin: 0;
	font-size: 10px;
	color: var(--ib-label);
	text-align: center;
}
</style>
