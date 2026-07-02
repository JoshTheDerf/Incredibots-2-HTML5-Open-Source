<script setup lang="ts">
// Port of the legacy Pixi RestrictionsWindow (src/Gui/RestrictionsWindow.ts).
// Lets a challenge author toggle which part types/tools are allowed and set
// min/max limits on density, joint strength/speed, and thruster strength.
//
// Wired to GameCore: on open we seed from the live challenge read-model
// (game.challenge.restrictions), and on "Okay!" we dispatch setAllowedParts /
// setBuildPermissions / setPartLimits (see src/core/challenge.ts). The editor's
// checkboxes are phrased as "Exclude X" (disallow), so we un-invert them to the
// "allowed" flags the Challenge stores (RestrictionsWindow.ts:137 vs :348).
import { onMounted, ref, watch } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";

defineProps<{ visible?: boolean }>();
const emit = defineEmits<{ close: [] }>();

const game = useGameStore();

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

// --- Allowed parts / tools (checkboxes are phrased as "Exclude X" to match the original) ---
const excludeCircles = ref(false);
const excludeRectangles = ref(false);
const excludeTriangles = ref(false);
const excludeFixedJoints = ref(false);
const excludeRotatingJoints = ref(false);
const excludeSlidingJoints = ref(false);
const excludeThrusters = ref(false);
const excludeCannons = ref(false);

const allowUserConstruction = ref(true);

const excludeFlags = [
	excludeCircles,
	excludeRectangles,
	excludeTriangles,
	excludeFixedJoints,
	excludeRotatingJoints,
	excludeSlidingJoints,
	excludeThrusters,
	excludeCannons,
];

// If any "exclude" box is unchecked, construction must be allowed (mirrors boxChanged()).
function onExcludeChanged(value: boolean): void {
	if (!value) allowUserConstruction.value = true;
}

// If "Allow User Construction" is toggled, cascade to all exclude boxes (mirrors allowBuildingBoxChanged()).
watch(allowUserConstruction, (allowed) => {
	for (const flag of excludeFlags) flag.value = !allowed;
});

// --- Other permission checkboxes ---
const allowMouseDrag = ref(true);
const allowBotControl = ref(true);
const allowFixatedShapes = ref(true);
const allowNonColliding = ref(false);
const conditionsAlwaysVisible = ref(false);

// --- Numeric limits (each has a "No Limit" checkbox that disables its input) ---
const minDensityNoLimit = ref(false);
const minDensity = ref("15");
const maxDensityNoLimit = ref(false);
const maxDensity = ref("15");
const maxSJStrengthNoLimit = ref(false);
const maxSJStrength = ref("15");
const maxSJSpeedNoLimit = ref(false);
const maxSJSpeed = ref("15");
const maxRJStrengthNoLimit = ref(false);
const maxRJStrength = ref("15");
const maxRJSpeedNoLimit = ref(false);
const maxRJSpeed = ref("15");
const maxThrusterNoLimit = ref(false);
const maxThruster = ref("15");

function clampLimit(text: string): string {
	let num = Number(text);
	if (Number.isNaN(num)) num = 15;
	if (num < 1) num = 1;
	if (num > 30) num = 30;
	return num.toString();
}

/** A numeric limit field resolves to null ("no limit") or its clamped number. */
function limitValue(noLimit: boolean, text: string): number | null {
	return noLimit ? null : Number(clampLimit(text));
}

/** Seed the checkboxes/inputs from the live challenge read-model (open flow). */
function seedFromChallenge(): void {
	const r = game.challenge?.restrictions;
	if (!r) return;
	excludeCircles.value = !r.circles;
	excludeRectangles.value = !r.rects;
	excludeTriangles.value = !r.tris;
	excludeFixedJoints.value = !r.fixed;
	excludeRotatingJoints.value = !r.revolute;
	excludeSlidingJoints.value = !r.prismatic;
	excludeThrusters.value = !r.thrusters;
	excludeCannons.value = !r.cannons;
	allowUserConstruction.value = r.circles || r.rects || r.tris || r.fixed || r.revolute || r.prismatic || r.thrusters || r.cannons;
	allowMouseDrag.value = r.mouseDrag;
	allowBotControl.value = r.botControl;
	allowFixatedShapes.value = r.fixate;
	allowNonColliding.value = r.nonColliding;
	conditionsAlwaysVisible.value = r.showConditions;
	// Numeric limits: null (no limit) -> checkbox on + input left at default "15".
	minDensityNoLimit.value = r.minDensity === null;
	if (r.minDensity !== null) minDensity.value = String(r.minDensity);
	maxDensityNoLimit.value = r.maxDensity === null;
	if (r.maxDensity !== null) maxDensity.value = String(r.maxDensity);
	maxRJStrengthNoLimit.value = r.maxRJStrength === null;
	if (r.maxRJStrength !== null) maxRJStrength.value = String(r.maxRJStrength);
	maxRJSpeedNoLimit.value = r.maxRJSpeed === null;
	if (r.maxRJSpeed !== null) maxRJSpeed.value = String(r.maxRJSpeed);
	maxSJStrengthNoLimit.value = r.maxSJStrength === null;
	if (r.maxSJStrength !== null) maxSJStrength.value = String(r.maxSJStrength);
	maxSJSpeedNoLimit.value = r.maxSJSpeed === null;
	if (r.maxSJSpeed !== null) maxSJSpeed.value = String(r.maxSJSpeed);
	maxThrusterNoLimit.value = r.maxThrusterStrength === null;
	if (r.maxThrusterStrength !== null) maxThruster.value = String(r.maxThrusterStrength);
}

onMounted(seedFromChallenge);

// Inline validation message (min > max density guard). Faithful to
// RestrictionsWindow.backButtonPressed (:430-437) which pops ShowDialog2 with
// this exact string and blocks the apply.
const errorMsg = ref("");

function close(): void {
	emit("close");
}

/**
 * Apply all restriction state (setAllowedParts / setBuildPermissions /
 * setPartLimits) and return whether the apply succeeded. Both "Okay!" and
 * "Back" run this — mirrors RestrictionsWindow.backButtonPressed being the
 * shared writer that okButtonPressed calls first (:341/347). Returns false
 * (blocking) when minDensity > maxDensity, matching the legacy guard.
 */
function applyRestrictions(): boolean {
	// Guard: min density must be < max density (RestrictionsWindow.ts:430-445).
	// Only checked when both are actual limits (neither is "No Limit").
	if (!minDensityNoLimit.value && !maxDensityNoLimit.value) {
		const minD = Number(clampLimit(minDensity.value));
		const maxD = Number(clampLimit(maxDensity.value));
		if (minD > maxD) {
			errorMsg.value = "The minimum density must be less than the maximum density.";
			return false;
		}
	}
	errorMsg.value = "";
	game.dispatch({
		type: "setAllowedParts",
		circles: !excludeCircles.value,
		rects: !excludeRectangles.value,
		tris: !excludeTriangles.value,
		fixed: !excludeFixedJoints.value,
		revolute: !excludeRotatingJoints.value,
		prismatic: !excludeSlidingJoints.value,
		thrusters: !excludeThrusters.value,
		cannons: !excludeCannons.value,
	});
	game.dispatch({
		type: "setBuildPermissions",
		mouseDrag: allowMouseDrag.value,
		botControl: allowBotControl.value,
		fixate: allowFixatedShapes.value,
		nonColliding: allowNonColliding.value,
		showConditions: conditionsAlwaysVisible.value,
	});
	game.dispatch({
		type: "setPartLimits",
		minDensity: limitValue(minDensityNoLimit.value, minDensity.value),
		maxDensity: limitValue(maxDensityNoLimit.value, maxDensity.value),
		maxRJStrength: limitValue(maxRJStrengthNoLimit.value, maxRJStrength.value),
		maxRJSpeed: limitValue(maxRJSpeedNoLimit.value, maxRJSpeed.value),
		maxSJStrength: limitValue(maxSJStrengthNoLimit.value, maxSJStrength.value),
		maxSJSpeed: limitValue(maxSJSpeedNoLimit.value, maxSJSpeed.value),
		maxThrusterStrength: limitValue(maxThrusterNoLimit.value, maxThruster.value),
	});
	return true;
}

function okay(): void {
	if (applyRestrictions()) close();
}

// "Back" applies the same edits then closes (RestrictionsWindow.backButtonPressed
// :341/347 writes all state before hiding) — NOT a discard. Blocked (kept open)
// if the min>max density guard fails.
function back(): void {
	if (applyRestrictions()) close();
}
</script>

<template>
	<div v-if="visible !== false" class="restrictions-panel ib-panel" :style="panelStyle">
		<header class="header-row">
			<h2 class="title">Set Restrictions For This Challenge</h2>
		</header>

		<section class="allowed-grid">
			<UCheckbox v-model="excludeCircles" label="Exclude Circles" @change="onExcludeChanged(excludeCircles)" />
			<UCheckbox v-model="excludeRectangles" label="Exclude Rectangles" @change="onExcludeChanged(excludeRectangles)" />
			<UCheckbox v-model="excludeTriangles" label="Exclude Triangles" @change="onExcludeChanged(excludeTriangles)" />

			<UCheckbox v-model="excludeFixedJoints" label="Exclude Fixed Joints" @change="onExcludeChanged(excludeFixedJoints)" />
			<UCheckbox v-model="excludeRotatingJoints" label="Exclude Rotating Joints" @change="onExcludeChanged(excludeRotatingJoints)" />
			<UCheckbox v-model="excludeSlidingJoints" label="Exclude Sliding Joints" @change="onExcludeChanged(excludeSlidingJoints)" />

			<span class="grid-spacer" />
			<UCheckbox v-model="excludeThrusters" label="Exclude Thrusters" @change="onExcludeChanged(excludeThrusters)" />
			<UCheckbox v-model="excludeCannons" label="Exclude Cannons" @change="onExcludeChanged(excludeCannons)" />
		</section>

		<section class="permissions-grid">
			<UCheckbox v-model="allowNonColliding" label="Allow Non-colliding Shapes" />
			<UCheckbox v-model="allowMouseDrag" label="Allow Dragging With Mouse" />
			<UCheckbox v-model="allowFixatedShapes" label="Allow Fixated Shapes" />

			<span class="grid-spacer" />
			<UCheckbox v-model="allowBotControl" label="Allow User Control of Bot" />
			<UCheckbox v-model="allowUserConstruction" label="Allow User Construction" />

			<span class="grid-spacer" />
			<span class="grid-spacer" />
			<UCheckbox v-model="conditionsAlwaysVisible" label="Conditions Always Visible" />
		</section>

		<section class="limits-grid">
			<div class="limit-row">
				<label class="limit-label">Min Density:</label>
				<UInput
					v-model="minDensity"
					size="sm"
					class="limit-input"
					:disabled="minDensityNoLimit"
					maxlength="4"
					@blur="minDensity = clampLimit(minDensity)"
				/>
				<UCheckbox v-model="minDensityNoLimit" label="No Limit" />
			</div>
			<div class="limit-row">
				<label class="limit-label">Max Rotating Joint Strength:</label>
				<UInput
					v-model="maxRJStrength"
					size="sm"
					class="limit-input"
					:disabled="maxRJStrengthNoLimit"
					maxlength="4"
					@blur="maxRJStrength = clampLimit(maxRJStrength)"
				/>
				<UCheckbox v-model="maxRJStrengthNoLimit" label="No Limit" />
			</div>

			<div class="limit-row">
				<label class="limit-label">Max Density:</label>
				<UInput
					v-model="maxDensity"
					size="sm"
					class="limit-input"
					:disabled="maxDensityNoLimit"
					maxlength="4"
					@blur="maxDensity = clampLimit(maxDensity)"
				/>
				<UCheckbox v-model="maxDensityNoLimit" label="No Limit" />
			</div>
			<div class="limit-row">
				<label class="limit-label">Max Rotating Joint Speed:</label>
				<UInput
					v-model="maxRJSpeed"
					size="sm"
					class="limit-input"
					:disabled="maxRJSpeedNoLimit"
					maxlength="4"
					@blur="maxRJSpeed = clampLimit(maxRJSpeed)"
				/>
				<UCheckbox v-model="maxRJSpeedNoLimit" label="No Limit" />
			</div>

			<div class="limit-row">
				<label class="limit-label">Max Sliding Joint Strength:</label>
				<UInput
					v-model="maxSJStrength"
					size="sm"
					class="limit-input"
					:disabled="maxSJStrengthNoLimit"
					maxlength="4"
					@blur="maxSJStrength = clampLimit(maxSJStrength)"
				/>
				<UCheckbox v-model="maxSJStrengthNoLimit" label="No Limit" />
			</div>
			<div class="limit-row">
				<label class="limit-label">Max Thruster Strength:</label>
				<UInput
					v-model="maxThruster"
					size="sm"
					class="limit-input"
					:disabled="maxThrusterNoLimit"
					maxlength="4"
					@blur="maxThruster = clampLimit(maxThruster)"
				/>
				<UCheckbox v-model="maxThrusterNoLimit" label="No Limit" />
			</div>

			<div class="limit-row">
				<label class="limit-label">Max Sliding Joint Speed:</label>
				<UInput
					v-model="maxSJSpeed"
					size="sm"
					class="limit-input"
					:disabled="maxSJSpeedNoLimit"
					maxlength="4"
					@blur="maxSJSpeed = clampLimit(maxSJSpeed)"
				/>
				<UCheckbox v-model="maxSJSpeedNoLimit" label="No Limit" />
			</div>
			<span class="grid-spacer" />
		</section>

		<p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

		<footer class="footer-row">
			<div class="footer-buttons">
				<IbButton family="purple" label="Back" @click="back" />
				<IbButton family="blue" label="Okay!" @click="okay" />
			</div>
		</footer>
	</div>
</template>

<style scoped>
.restrictions-panel {
	width: 600px;
	max-width: 100%;
	box-sizing: border-box;
	font-family: Arial, Helvetica, sans-serif;
	color: var(--ib-dark);
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.header-row {
	display: flex;
	justify-content: center;
}

.title {
	margin: 0;
	font-size: 20px;
	font-weight: bold;
	text-align: center;
	color: var(--ib-dark);
}

.allowed-grid,
.permissions-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 8px 12px;
	padding: 8px;
	border-radius: 4px;
}

.grid-spacer {
	display: block;
}

.limits-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 10px 24px;
	padding: 8px;
	border-radius: 4px;
}

.limit-row {
	display: grid;
	grid-template-columns: 1fr 60px auto;
	align-items: center;
	gap: 6px;
}

.limit-label {
	font-size: 12px;
	font-weight: bold;
	color: var(--ib-dark);
	text-align: left;
}

.limit-input {
	width: 60px;
}

.error-msg {
	margin: 0;
	font-size: 12px;
	font-weight: bold;
	text-align: center;
	color: #a11;
}

.footer-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-top: 4px;
}

.footer-buttons {
	display: flex;
	gap: 10px;
}
</style>
