<script setup lang="ts">
// Visual + behavioural port of IB3's Gui/WaterWindow.as (v0.00.33b): the sandbox
// water-settings dialog. "Ok" dispatches the GameCore `setSandboxSettings`
// command with a fully-populated `water` slice (WaterState) and the current
// non-water sandbox fields passed through unchanged — matching
// WaterWindow.okButtonPressed (:371), which writes back onto the shared
// SandboxSettings. Like gravity, water takes effect on the NEXT play
// (WaterSystem is built at world creation — Command.ts:246-252).
//
// Frame/field styling mirrors the sibling SandboxSettingsPanel.vue (ib-panel +
// panelFrameCream, field-row layout, IbButton actions).
//
// FIDELITY NOTE — two controls here are NOT in the shipped WaterWindow.as, which
// only exposes tide-oriented settings (Enabled, Density, Linear/Angular Drag,
// Base Height, Height Osc., Osc Duration, colour combo + R/G/B/A):
//   * Water Type (Tide/Wave) — the ported core (waterSystem.ts) builds a
//     b2TideController or b2WaveController from WaterState.type, but the shipped
//     window has no type widget; exposed here so wave water is reachable.
//   * Tilt Osc. / Tilt Duration — WaterControl's normalXFunc tilt oscillation
//     (tiltOsc/tiltOscSpeed) exists in the model but has no window widget;
//     exposed here so surface tilt is reachable.
// Everything else is a line-for-line port of the WaterWindow controls, ranges,
// labels, sanitizers, and enable/disable behaviour (cited inline).
import { computed, ref } from "vue";
import { useGameStore } from "../../gameStore";
import type { WaterState } from "../../../core/waterSystem";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";
import {
	WATER_COLOR_LABELS,
	WATER_PRE_COLORS,
	WC_ANGULAR_MAX,
	WC_ANGULAR_MIN,
	WC_DENSITY_MAX,
	WC_DENSITY_MIN,
	WC_LINEAR_MAX,
	WC_LINEAR_MIN,
	blueFromHex,
	clamp,
	clampByte,
	greenFromHex,
	hexColor,
	presetIndexForColor,
	redFromHex,
	sanitizeAngularDrag,
	sanitizeDensity,
	sanitizeHeight,
	sanitizeHeightOsc,
	sanitizeLinearDrag,
	sanitizeSpeed,
} from "../../waterPresets";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

const game = useGameStore();

const emit = defineEmits<{
	(e: "ok"): void;
	(e: "cancel"): void;
}>();

// --- state, seeded from the current sandbox water settings (WaterWindow ctor
// reads sandboxSettings.waterXxx into each widget, :85-364). ---
const sb = game.state.sandbox;
const w = sb.water;

const enabled = ref<boolean>(w.enabled);
// Type (tide 0 / wave 1) — see FIDELITY NOTE. SandboxSettings.WATER_TYPE_*.
const typeLabels = ["Tide", "Wave"];
const typeLabel = ref<string>(typeLabels[w.type] ?? typeLabels[0]);

// Slider-backed numerics (WaterWindow density/linearDrag/angularDrag sliders,
// clamped live to the WC_* ranges). Kept as numbers; the paired input mirrors.
const density = ref<number>(clamp(w.density, WC_DENSITY_MIN, WC_DENSITY_MAX));
const linearDrag = ref<number>(clamp(w.linearDrag, WC_LINEAR_MIN, WC_LINEAR_MAX));
const angularDrag = ref<number>(clamp(w.angularDrag, WC_ANGULAR_MIN, WC_ANGULAR_MAX));

// Text-input numerics (sanitized on Okay, mirroring the FOCUS_OUT sanitizers).
const height = ref<number>(w.height);
const heightOsc = ref<number>(w.heightOsc);
const heightOscSpeed = ref<number>(w.heightOscSpeed);
const tiltOsc = ref<number>(w.tiltOsc);
const tiltOscSpeed = ref<number>(w.tiltOscSpeed);

// Colour: R/G/B derived from waterColor + separate opacity/alpha (WaterWindow
// :293-364 seeds waterR/G/B from Util.GetXFromHex(waterColor), waterA from
// waterOpacity). Presets set R/G/B; manual R/G/B edits re-derive the combo.
const redValue = ref<number>(redFromHex(w.color));
const greenValue = ref<number>(greenFromHex(w.color));
const blueValue = ref<number>(blueFromHex(w.color));
const alphaValue = ref<number>(clampByte(w.opacity));

// The combo label tracks the current R/G/B (WaterWindow.SetColorBoxIndex, :604):
// selecting a preset writes R/G/B; editing R/G/B re-selects the matching preset
// or "--". Selecting "--" zeroes R/G/B (colorComboChanged -> PRE_COLORS[0] = 0).
const currentColor = computed(() => hexColor(redValue.value, greenValue.value, blueValue.value));
const colorLabel = computed<string>({
	get: () => WATER_COLOR_LABELS[presetIndexForColor(currentColor.value)],
	set: (label: string) => {
		const idx = WATER_COLOR_LABELS.indexOf(label);
		const preset = WATER_PRE_COLORS[idx < 0 ? 0 : idx];
		redValue.value = redFromHex(preset);
		greenValue.value = greenFromHex(preset);
		blueValue.value = blueFromHex(preset);
	},
});

function setDensity(v: number | number[]): void {
	density.value = clamp(Number(Array.isArray(v) ? v[0] : v), WC_DENSITY_MIN, WC_DENSITY_MAX);
}
function setLinearDrag(v: number | number[]): void {
	linearDrag.value = clamp(Number(Array.isArray(v) ? v[0] : v), WC_LINEAR_MIN, WC_LINEAR_MAX);
}
function setAngularDrag(v: number | number[]): void {
	angularDrag.value = clamp(Number(Array.isArray(v) ? v[0] : v), WC_ANGULAR_MIN, WC_ANGULAR_MAX);
}

function onOk(): void {
	// Faithful port of WaterWindow.okButtonPressed (:371): sanitize every field
	// back to its WC_* range/default, pack R/G/B into waterColor, and apply.
	const water: WaterState = {
		enabled: enabled.value,
		type: Math.max(0, typeLabels.indexOf(typeLabel.value)),
		density: sanitizeDensity(density.value),
		linearDrag: sanitizeLinearDrag(linearDrag.value),
		angularDrag: sanitizeAngularDrag(angularDrag.value),
		height: sanitizeHeight(height.value),
		heightOsc: sanitizeHeightOsc(heightOsc.value),
		heightOscSpeed: sanitizeSpeed(heightOscSpeed.value),
		tiltOsc: sanitizeHeightOsc(tiltOsc.value),
		tiltOscSpeed: Number(tiltOscSpeed.value) || 0,
		color: hexColor(redValue.value, greenValue.value, blueValue.value),
		opacity: clampByte(alphaValue.value),
	};
	// Pass the current non-water sandbox fields through unchanged — the command
	// requires them and replaces only the water slice (Command.ts:246, GameCore
	// handleSetSandboxSettings :3745 water = command.water ?? current).
	game.dispatch({
		type: "setSandboxSettings",
		gravity: sb.gravity,
		size: sb.size,
		terrainType: sb.terrainType,
		terrainTheme: sb.terrainTheme,
		background: sb.background,
		backgroundR: sb.backgroundR,
		backgroundG: sb.backgroundG,
		backgroundB: sb.backgroundB,
		water,
	});
	emit("ok");
}

function onCancel(): void {
	emit("cancel");
}
</script>

<template>
	<div class="water-settings ib-panel" :style="panelStyle">
		<h2 class="title">Water Settings</h2>

		<div class="body">
			<div class="enabled-row">
				<UCheckbox v-model="enabled" label="Enabled" />
			</div>

			<!-- FIDELITY NOTE (script): not in shipped WaterWindow.as. -->
			<div class="field-row">
				<label class="field-label" for="water-type">Type:</label>
				<USelect id="water-type" v-model="typeLabel" :items="typeLabels" size="sm" :disabled="!enabled" />
			</div>

			<div class="slider-block">
				<label class="field-label">Density:</label>
				<USlider
					:model-value="density"
					:min="WC_DENSITY_MIN"
					:max="WC_DENSITY_MAX"
					:step="0.1"
					size="sm"
					class="s-slider"
					:disabled="!enabled"
					@update:model-value="setDensity"
				/>
				<UInput
					:model-value="density"
					type="number"
					size="xs"
					class="s-input"
					:disabled="!enabled"
					@update:model-value="setDensity"
				/>
			</div>

			<div class="slider-block">
				<label class="field-label">Linear Drag:</label>
				<USlider
					:model-value="linearDrag"
					:min="WC_LINEAR_MIN"
					:max="WC_LINEAR_MAX"
					:step="0.1"
					size="sm"
					class="s-slider"
					:disabled="!enabled"
					@update:model-value="setLinearDrag"
				/>
				<UInput
					:model-value="linearDrag"
					type="number"
					size="xs"
					class="s-input"
					:disabled="!enabled"
					@update:model-value="setLinearDrag"
				/>
			</div>

			<div class="slider-block">
				<label class="field-label">Angular Drag:</label>
				<USlider
					:model-value="angularDrag"
					:min="WC_ANGULAR_MIN"
					:max="WC_ANGULAR_MAX"
					:step="0.1"
					size="sm"
					class="s-slider"
					:disabled="!enabled"
					@update:model-value="setAngularDrag"
				/>
				<UInput
					:model-value="angularDrag"
					type="number"
					size="xs"
					class="s-input"
					:disabled="!enabled"
					@update:model-value="setAngularDrag"
				/>
			</div>

			<div class="field-row">
				<label class="field-label" for="water-height">Base Height:</label>
				<UInput
					id="water-height"
					:model-value="height"
					type="number"
					size="xs"
					class="num-input"
					:disabled="!enabled"
					@update:model-value="(v: string | number) => (height = Number(v))"
				/>
			</div>

			<div class="field-row">
				<label class="field-label" for="water-hosc">Height Osc.:</label>
				<UInput
					id="water-hosc"
					:model-value="heightOsc"
					type="number"
					size="xs"
					class="num-input"
					:disabled="!enabled"
					@update:model-value="(v: string | number) => (heightOsc = Number(v))"
				/>
			</div>

			<div class="field-row">
				<label class="field-label" for="water-hospeed">Osc Duration:</label>
				<UInput
					id="water-hospeed"
					:model-value="heightOscSpeed"
					type="number"
					size="xs"
					class="num-input"
					:disabled="!enabled"
					@update:model-value="(v: string | number) => (heightOscSpeed = Number(v))"
				/>
			</div>

			<!-- FIDELITY NOTE (script): tilt oscillation not in shipped WaterWindow.as. -->
			<div class="field-row">
				<label class="field-label" for="water-tosc">Tilt Osc.:</label>
				<UInput
					id="water-tosc"
					:model-value="tiltOsc"
					type="number"
					size="xs"
					class="num-input"
					:disabled="!enabled"
					@update:model-value="(v: string | number) => (tiltOsc = Number(v))"
				/>
			</div>

			<div class="field-row">
				<label class="field-label" for="water-tspeed">Tilt Duration:</label>
				<UInput
					id="water-tspeed"
					:model-value="tiltOscSpeed"
					type="number"
					size="xs"
					class="num-input"
					:disabled="!enabled"
					@update:model-value="(v: string | number) => (tiltOscSpeed = Number(v))"
				/>
			</div>

			<div class="field-row">
				<label class="field-label" for="water-color">Water color:</label>
				<USelect
					id="water-color"
					v-model="colorLabel"
					:items="WATER_COLOR_LABELS"
					size="sm"
					:disabled="!enabled"
				/>
			</div>

			<div class="rgb-block">
				<div class="rgb-row">
					<label class="rgb-label" for="water-red">Red:</label>
					<UInput
						id="water-red"
						:model-value="redValue"
						type="number"
						size="xs"
						class="rgb-input"
						:disabled="!enabled"
						@update:model-value="(v: string | number) => (redValue = clampByte(Number(v)))"
					/>
				</div>
				<div class="rgb-row">
					<label class="rgb-label" for="water-green">Green:</label>
					<UInput
						id="water-green"
						:model-value="greenValue"
						type="number"
						size="xs"
						class="rgb-input"
						:disabled="!enabled"
						@update:model-value="(v: string | number) => (greenValue = clampByte(Number(v)))"
					/>
				</div>
				<div class="rgb-row">
					<label class="rgb-label" for="water-blue">Blue:</label>
					<UInput
						id="water-blue"
						:model-value="blueValue"
						type="number"
						size="xs"
						class="rgb-input"
						:disabled="!enabled"
						@update:model-value="(v: string | number) => (blueValue = clampByte(Number(v)))"
					/>
				</div>
				<div class="rgb-row">
					<label class="rgb-label" for="water-alpha">Opacity:</label>
					<UInput
						id="water-alpha"
						:model-value="alphaValue"
						type="number"
						size="xs"
						class="rgb-input"
						:disabled="!enabled"
						@update:model-value="(v: string | number) => (alphaValue = clampByte(Number(v)))"
					/>
				</div>
			</div>
		</div>

		<div class="actions">
			<IbButton family="purple" label="Ok" class="ok-btn" @click="onOk" />
			<IbButton family="purple" label="Cancel" class="cancel-btn" @click="onCancel" />
		</div>
	</div>
</template>

<style scoped>
.water-settings {
	width: 260px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	font-family: Arial, Helvetica, sans-serif;
	color: var(--ib-dark);
}

.title {
	margin: 0 0 14px;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 18px;
	font-weight: bold;
	line-height: 1.2;
	text-align: center;
	color: var(--ib-dark);
}

.body {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.enabled-row {
	display: flex;
	justify-content: center;
}

.field-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.field-label {
	flex: 0 0 92px;
	font-size: 12px;
	font-weight: bold;
	color: var(--ib-dark);
}

.field-row > :global(.u-select),
.field-row select {
	flex: 1;
}

.num-input {
	width: 90px;
}

.slider-block {
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: center;
	gap: 8px 10px;
}

.s-slider {
	min-width: 0;
}

.s-input {
	width: 60px;
}

.rgb-block {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 6px;
}

.rgb-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.rgb-label {
	flex: 0 0 60px;
	font-size: 11px;
	font-weight: bold;
	color: var(--ib-dark);
	text-align: right;
}

.rgb-input {
	width: 56px;
}

.actions {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	margin-top: 16px;
}

.ok-btn {
	width: 150px;
	font-size: 15px;
}

.cancel-btn {
	width: 100px;
	font-size: 13px;
}
</style>
