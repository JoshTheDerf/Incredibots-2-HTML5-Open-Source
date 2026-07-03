<script setup lang="ts">
// Visual + behavioural port of the legacy PIXI AdvancedSandboxWindow
// (src/Gui/AdvancedSandboxWindow.ts). That window let players configure a
// sandbox before entering it: world size, terrain shape/theme, background (with
// a custom RGB solid-color option), and gravity. "Okay!" dispatches the
// GameCore `setSandboxSettings` command — the port of the legacy Apply flow
// (AdvancedSandboxWindow.okButtonPressed + ControllerSandbox.RefreshSandboxSettings):
// it stores the settings, rebuilds the terrain bodies + world bounds, and (for
// gravity) takes effect on the NEXT play, matching the original.
import { computed, ref } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

const game = useGameStore();

const emit = defineEmits<{
	(e: "ok"): void;
	(e: "cancel"): void;
}>();

// --- state, seeded from the current sandbox settings in GameState ---
// (mirrors AdvancedSandboxWindow reading ControllerGameGlobals.settings into the
// widgets on open). size 0-2, terrainType 0-2, terrainTheme 0-6, background 0-6.
const sb = game.state.sandbox;
const sizeIndex = ref(sb.size);
const shapeIndex = ref(sb.terrainType);
const themeIndex = ref(sb.terrainTheme);
const bgIndex = ref(sb.background);

// UI defaults 125/125/255 when the stored solid colour is the 0/0/0 default,
// matching AdvancedSandboxWindow's text-field defaults (:195,203,211).
const redValue = ref(sb.backgroundR || 125);
const greenValue = ref(sb.backgroundG || 125);
const blueValue = ref(sb.backgroundB || 255);

const gravity = ref(sb.gravity);

// Physics-engine selector (P1.5b-2b). 0 = IB2 (classic Box2DFlash 2.0.2, the
// default) | 1 = IB3 (2.1a). Box2D 3.x (engine 2) is RESERVED but not yet
// implemented, so it is OMITTED here (a disabled "coming soon" entry would need
// object-item USelect; the two-string list keeps this panel's existing pattern).
// Seeded from the current sandbox; applied on Okay, taking effect at the next
// play (like gravity). An engine-2 design opened here reads back as IB3 (its
// nearest real engine) so re-applying doesn't silently downgrade it to IB2.
const engineLabels = ["IB2 (classic · 2.0)", "IB3 (2.1a)"];
const engineIndex = ref(sb.physicsEngine >= 1 ? 1 : 0);
const engineLabel = computed({
	get: () => engineLabels[engineIndex.value] ?? engineLabels[0],
	set: (v: string) => (engineIndex.value = Math.max(0, engineLabels.indexOf(v))),
});

// Plain label lists paired with index refs — mirrors the ShapeProps.vue
// convention (USelect + separate index state) rather than object items,
// since these are purely cosmetic placeholders until a real command exists.
// Index-aligned with SandboxSettings.SIZE_*/TERRAIN_* enums (XLarge=3, Island=3).
const sizeLabels = ["Small", "Medium", "Large", "XLarge"];
const shapeLabels = ["Flat Land", "Box", "Empty", "Island"];
const themeLabels = ["Grass", "Dirt", "Sand", "Rock", "Snow", "Moon", "Mars"];
const bgLabels = ["Sky", "Space", "Night", "Dusk", "Mars", "Sunset", "Solid Color"];

const sizeLabel = computed({
	get: () => sizeLabels[sizeIndex.value],
	set: (v: string) => (sizeIndex.value = sizeLabels.indexOf(v)),
});
const shapeLabel = computed({
	get: () => shapeLabels[shapeIndex.value],
	set: (v: string) => (shapeIndex.value = shapeLabels.indexOf(v)),
});
const themeLabel = computed({
	get: () => themeLabels[themeIndex.value],
	set: (v: string) => (themeIndex.value = themeLabels.indexOf(v)),
});
const bgLabel = computed({
	get: () => bgLabels[bgIndex.value],
	set: (v: string) => (bgIndex.value = bgLabels.indexOf(v)),
});

// Only editable when "Solid Color" is selected, matching the legacy
// bgBoxChanged() enable/disable behaviour.
const isSolidColour = computed(() => bgIndex.value === 6);

function clampByte(n: number): number {
	if (Number.isNaN(n)) return 0;
	return Math.min(255, Math.max(0, Math.round(n)));
}

function clampGravity(n: number): number {
	if (Number.isNaN(n)) return 15;
	return Math.min(30, Math.max(0, n));
}

function onOk(): void {
	// Faithful port of AdvancedSandboxWindow.okButtonPressed: build a fresh
	// SandboxSettings from the widgets (with the legacy clamps) and apply it.
	game.dispatch({
		type: "setSandboxSettings",
		gravity: clampGravity(Number(gravity.value)),
		size: sizeIndex.value,
		terrainType: shapeIndex.value,
		terrainTheme: themeIndex.value,
		background: bgIndex.value,
		backgroundR: clampByte(Number(redValue.value)),
		backgroundG: clampByte(Number(greenValue.value)),
		backgroundB: clampByte(Number(blueValue.value)),
		physicsEngine: engineIndex.value,
	});
	emit("ok");
}

function onCancel(): void {
	emit("cancel");
}
</script>

<template>
	<div class="sandbox-settings ib-panel" :style="panelStyle">
		<h2 class="title">Advanced Sandbox<br />Setup</h2>

		<div class="body">
			<div class="field-row">
				<label class="field-label" for="sandbox-size">Sandbox Size:</label>
				<USelect id="sandbox-size" v-model="sizeLabel" :items="sizeLabels" size="sm" />
			</div>

			<div class="field-row">
				<label class="field-label" for="sandbox-shape">Terrain Shape:</label>
				<USelect id="sandbox-shape" v-model="shapeLabel" :items="shapeLabels" size="sm" />
			</div>

			<div class="field-row">
				<label class="field-label" for="sandbox-theme">Terrain Theme:</label>
				<USelect id="sandbox-theme" v-model="themeLabel" :items="themeLabels" size="sm" />
			</div>

			<div class="field-row">
				<label class="field-label" for="sandbox-bg">Background:</label>
				<USelect id="sandbox-bg" v-model="bgLabel" :items="bgLabels" size="sm" />
			</div>

			<div class="field-row">
				<label class="field-label" for="sandbox-engine">Physics:</label>
				<USelect id="sandbox-engine" v-model="engineLabel" :items="engineLabels" size="sm" />
			</div>
			<p class="engine-hint">Takes effect on the next play.</p>

			<div class="rgb-block">
				<div class="rgb-row">
					<label class="rgb-label" for="sandbox-red">Red:</label>
					<UInput
						id="sandbox-red"
						:model-value="redValue"
						type="number"
						size="xs"
						class="rgb-input"
						:disabled="!isSolidColour"
						@update:model-value="(v) => (redValue = clampByte(Number(v)))"
					/>
				</div>
				<div class="rgb-row">
					<label class="rgb-label" for="sandbox-green">Green:</label>
					<UInput
						id="sandbox-green"
						:model-value="greenValue"
						type="number"
						size="xs"
						class="rgb-input"
						:disabled="!isSolidColour"
						@update:model-value="(v) => (greenValue = clampByte(Number(v)))"
					/>
				</div>
				<div class="rgb-row">
					<label class="rgb-label" for="sandbox-blue">Blue:</label>
					<UInput
						id="sandbox-blue"
						:model-value="blueValue"
						type="number"
						size="xs"
						class="rgb-input"
						:disabled="!isSolidColour"
						@update:model-value="(v) => (blueValue = clampByte(Number(v)))"
					/>
				</div>
			</div>

			<div class="gravity-block">
				<label class="field-label gravity-label">Gravity:</label>
				<USlider
					:model-value="gravity"
					:min="0"
					:max="30"
					:step="0.1"
					size="sm"
					class="gravity-slider"
					@update:model-value="(v) => (gravity = clampGravity(Array.isArray(v) ? v[0] : v))"
				/>
				<UInput
					:model-value="gravity"
					type="number"
					size="xs"
					class="gravity-input"
					@update:model-value="(v) => (gravity = clampGravity(Number(v)))"
				/>
			</div>
		</div>

		<div class="actions">
			<IbButton family="purple" label="Okay!" class="ok-btn" @click="onOk" />
			<IbButton family="purple" label="Cancel" class="cancel-btn" @click="onCancel" />
		</div>
	</div>
</template>

<style scoped>
.sandbox-settings {
	width: 248px;
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

.engine-hint {
	margin: -4px 0 0;
	font-size: 10px;
	font-style: italic;
	color: var(--ib-dark);
	opacity: 0.7;
	text-align: right;
}

.rgb-block {
	border-radius: 4px;
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
	flex: 0 0 48px;
	font-size: 11px;
	font-weight: bold;
	color: var(--ib-dark);
	text-align: right;
}

.rgb-input {
	width: 56px;
}

.gravity-block {
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: center;
	gap: 8px 10px;
	padding: 8px 6px;
}

.gravity-label {
	flex: none;
	text-align: center;
}

.gravity-slider {
	min-width: 0;
}

.gravity-input {
	width: 60px;
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
