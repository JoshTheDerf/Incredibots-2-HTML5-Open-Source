<script setup lang="ts">
// Group property edit — port of Jaybit's MultiEditWindow / GuiMultiCheckBox /
// MultiActionsAction (ui-hotkeys spec §2 + §5). Shown by PartInspectorFull when
// >1 part is selected, replacing the four "Edit Shapes/Joints/Thrusters/Cannons"
// buttons + modal window with inline per-mode sections.
//
//   - Sections appear only for the part kinds actually present in the selection
//     (MultiEditWindow.SetVals predicate filters IsShape/IsJoint/IsThrusters/
//     IsCannon).
//   - Mixed values show "[varies]" (numeric inputs park empty) and tri-state
//     checkboxes render indeterminate (GuiMultiCheckBox IS_HALF_SELECTED). The
//     click cycle is the spec's accepted simplification indeterminate → checked →
//     unchecked (native checkbox behaviour; returning to indeterminate is not
//     offered).
//   - On "Apply" ONLY user-resolved fields are dispatched — a numeric field still
//     empty ("[varies]") or a checkbox still indeterminate contributes nothing
//     (multiEditApply's `if(text != "[varies]") ... if(!box.halfSelected)`).
//   - All resolved fields dispatch through the existing partIds[] commands wrapped
//     in ONE `batch` command, so the whole group edit is a single undo step
//     (MultiActionsAction). The core clamps each value per part.
//
// [varies] is computed by reading the live Part instances for the selection (the
// snapshot only projects selection[0]); the trigger fields those parts carry are
// also mirrored into PartSnapshot now (GameState.PartSnapshot) for uniform reads.
import { computed, reactive, ref, watch } from "vue";
import { useGameStore } from "../../gameStore";
import type { Command } from "../../../core";
import type { Part } from "../../../Parts/Part";
import IbButton from "../IbButton.vue";

const game = useGameStore();

// Live parts in the current selection (order follows the parts graph).
const selectedParts = computed<Part[]>(() => {
	const ids = new Set(game.edit.selection);
	return game.parts.filter((p) => ids.has(p.id));
});

// Per-kind partition (MultiEditWindow predicates). Shapes exclude cannons.
const shapes = computed(() => selectedParts.value.filter((p) => ["Circle", "Rectangle", "Triangle"].includes(p.type)));
const cannons = computed(() => selectedParts.value.filter((p) => p.type === "Cannon"));
const joints = computed(() => selectedParts.value.filter((p) => ["RevoluteJoint", "PrismaticJoint"].includes(p.type)));
const thrusters = computed(() => selectedParts.value.filter((p) => p.type === "Thrusters"));

// --- [varies] helpers --------------------------------------------------------
// A field's "common value" across a part list, or a sentinel when they disagree.
// Empty list -> sentinel too (no section rendered).
type AnyPart = Record<string, unknown>;
function commonNum(parts: Part[], key: string): number | null {
	if (parts.length === 0) return null;
	const first = (parts[0] as unknown as AnyPart)[key] as number;
	for (const p of parts) if ((p as unknown as AnyPart)[key] !== first) return null;
	return first;
}
function commonBool(parts: Part[], key: string, invert = false): boolean | "indeterminate" {
	if (parts.length === 0) return "indeterminate";
	const read = (p: Part) => {
		const v = Boolean((p as unknown as AnyPart)[key]);
		return invert ? !v : v;
	};
	const first = read(parts[0]);
	for (const p of parts) if (read(p) !== first) return "indeterminate";
	return first;
}

// --- Editable buffers --------------------------------------------------------
// Numeric fields are strings ("" == unresolved / "[varies]"); tri-state
// checkboxes are boolean | "indeterminate". Buffers are (re)seeded from the
// selection's common values whenever the SELECTION changes (not on every state
// emit, so in-progress edits aren't clobbered), and again after an Apply.
type Tri = boolean | "indeterminate";
const shapeF = reactive({
	density: "",
	friction: "",
	restitution: "",
	collide: "indeterminate" as Tri,
	fixate: "indeterminate" as Tri,
	undragable: "indeterminate" as Tri,
	outline: "indeterminate" as Tri,
	outlineBehind: "indeterminate" as Tri,
});
const cannonF = reactive({ density: "", friction: "", restitution: "", strength: "" });
const jointF = reactive({
	motorOn: "indeterminate" as Tri,
	strength: "",
	speed: "",
	floppy: "indeterminate" as Tri,
});
const thrusterF = reactive({ strength: "", autoOn: "indeterminate" as Tri });

function numStr(v: number | null): string {
	return v === null ? "" : String(v);
}

function reseed(): void {
	shapeF.density = numStr(commonNum(shapes.value, "density"));
	shapeF.friction = numStr(commonNum(shapes.value, "friction"));
	shapeF.restitution = numStr(commonNum(shapes.value, "restitution"));
	shapeF.collide = commonBool(shapes.value, "collide");
	shapeF.fixate = commonBool(shapes.value, "isStatic");
	shapeF.undragable = commonBool(shapes.value, "undragable");
	shapeF.outline = commonBool(shapes.value, "outline");
	shapeF.outlineBehind = commonBool(shapes.value, "terrain");

	cannonF.density = numStr(commonNum(cannons.value, "density"));
	cannonF.friction = numStr(commonNum(cannons.value, "friction"));
	cannonF.restitution = numStr(commonNum(cannons.value, "restitution"));
	cannonF.strength = numStr(commonNum(cannons.value, "strength"));

	// Joints carry the enable flag under two names (revolute enableMotor /
	// prismatic enablePiston); commonJointEnable reads the right one per part.
	jointF.motorOn = commonJointEnable(joints.value);
	jointF.strength = numStr(commonJointNum(joints.value, "motorStrength", "pistonStrength"));
	jointF.speed = numStr(commonJointNum(joints.value, "motorSpeed", "pistonSpeed"));
	jointF.floppy = commonBool(joints.value, "isStiff", /* invert */ true);

	thrusterF.strength = numStr(commonNum(thrusters.value, "strength"));
	thrusterF.autoOn = commonBool(thrusters.value, "autoOn");
}

// Joints carry the enable flag under two names (revolute enableMotor / prismatic
// enablePiston); read the right one per part for a unified common value.
function commonJointEnable(parts: Part[]): Tri {
	if (parts.length === 0) return "indeterminate";
	const read = (p: Part) =>
		p.type === "RevoluteJoint"
			? Boolean((p as unknown as AnyPart).enableMotor)
			: Boolean((p as unknown as AnyPart).enablePiston);
	const first = read(parts[0]);
	for (const p of parts) if (read(p) !== first) return "indeterminate";
	return first;
}
function commonJointNum(parts: Part[], rjKey: string, sjKey: string): number | null {
	if (parts.length === 0) return null;
	const read = (p: Part) =>
		(p as unknown as AnyPart)[p.type === "RevoluteJoint" ? rjKey : sjKey] as number;
	const first = read(parts[0]);
	for (const p of parts) if (read(p) !== first) return null;
	return first;
}

// Reseed on selection change (by id set) and once on mount.
watch(
	() => game.edit.selection.slice().sort((a, b) => a - b).join(","),
	() => reseed(),
	{ immediate: true },
);

// --- Apply -------------------------------------------------------------------
function ids(parts: Part[]): number[] {
	return parts.map((p) => p.id);
}
function pushNum(cmds: Command[], str: string, make: (v: number) => Command): void {
	const t = str.trim();
	if (t === "") return; // still "[varies]" — untouched
	const n = Number(t);
	if (!Number.isFinite(n)) return;
	cmds.push(make(n));
}
function pushBool(cmds: Command[], v: Tri, make: (b: boolean) => Command): void {
	if (v === "indeterminate") return; // still half — untouched
	cmds.push(make(v));
}

const canApply = computed(
	() => shapes.value.length + cannons.value.length + joints.value.length + thrusters.value.length > 0,
);

function apply(): void {
	const cmds: Command[] = [];

	if (shapes.value.length > 0) {
		const sid = ids(shapes.value);
		pushNum(cmds, shapeF.density, (v) => ({ type: "setDensity", partIds: sid, value: v }));
		pushNum(cmds, shapeF.friction, (v) => ({ type: "setFriction", partIds: sid, value: v }));
		pushNum(cmds, shapeF.restitution, (v) => ({ type: "setRestitution", partIds: sid, value: v }));
		pushBool(cmds, shapeF.collide, (b) => ({ type: "setCollide", partIds: sid, value: b }));
		pushBool(cmds, shapeF.fixate, (b) => ({ type: "setFixate", partIds: sid, value: b }));
		pushBool(cmds, shapeF.undragable, (b) => ({ type: "setUndragable", partIds: sid, value: b }));
		pushBool(cmds, shapeF.outline, (b) => ({ type: "setOutline", partIds: sid, value: b }));
		pushBool(cmds, shapeF.outlineBehind, (b) => ({ type: "setOutlineBehind", partIds: sid, value: b }));
	}

	if (cannons.value.length > 0) {
		const cid = ids(cannons.value);
		pushNum(cmds, cannonF.density, (v) => ({ type: "setDensity", partIds: cid, value: v }));
		pushNum(cmds, cannonF.friction, (v) => ({ type: "setFriction", partIds: cid, value: v }));
		pushNum(cmds, cannonF.restitution, (v) => ({ type: "setRestitution", partIds: cid, value: v }));
		pushNum(cmds, cannonF.strength, (v) => ({ type: "setCannonStrength", partIds: cid, value: v }));
	}

	if (joints.value.length > 0) {
		const jid = ids(joints.value);
		pushBool(cmds, jointF.motorOn, (b) => ({ type: "setJointMotor", partIds: jid, value: b }));
		pushNum(cmds, jointF.strength, (v) => ({ type: "setJointStrength", partIds: jid, value: v }));
		pushNum(cmds, jointF.speed, (v) => ({ type: "setJointSpeed", partIds: jid, value: v }));
		// Floppy is the inverse of isStiff (MultiEditWindow: isStiff = !floppyBox).
		pushBool(cmds, jointF.floppy, (b) => ({ type: "setJointStiff", partIds: jid, value: !b }));
	}

	if (thrusters.value.length > 0) {
		const tid = ids(thrusters.value);
		pushNum(cmds, thrusterF.strength, (v) => ({ type: "setThrusterStrength", partIds: tid, value: v }));
		pushBool(cmds, thrusterF.autoOn, (b) => ({ type: "setThrusterAutoOn", partIds: tid, value: b }));
	}

	if (cmds.length > 0) game.dispatch({ type: "batch", commands: cmds });
	reseed();
}

// --- tri-state checkbox cycle (indeterminate -> checked -> unchecked) ---------
function cycleTri(obj: Record<string, unknown>, key: string): void {
	const v = obj[key] as Tri;
	obj[key] = v === "indeterminate" ? true : v === true ? false : true;
}

// z-order group move (MultiMoveZAction) — the existing movePartsToFront/Back
// commands already preserve the selection's internal relative order.
function moveFront(): void {
	game.dispatch({ type: "movePartsToFront", partIds: game.edit.selection });
}
function moveBack(): void {
	game.dispatch({ type: "movePartsToBack", partIds: game.edit.selection });
}
</script>

<template>
	<div class="multi-edit">
		<p class="intro">Editing {{ game.edit.selection.length }} parts. Blank / dashed fields are left unchanged.</p>

		<!-- SHAPES -->
		<section v-if="shapes.length > 0" class="section">
			<h4 class="section-title">Shapes ({{ shapes.length }})</h4>
			<UFormField label="Density" class="field">
				<UInput v-model="shapeF.density" size="xs" placeholder="[varies]" />
			</UFormField>
			<UFormField label="Friction" class="field">
				<UInput v-model="shapeF.friction" size="xs" placeholder="[varies]" />
			</UFormField>
			<UFormField label="Restitution" class="field">
				<UInput v-model="shapeF.restitution" size="xs" placeholder="[varies]" />
			</UFormField>
			<label class="tri">
				<input type="checkbox" :checked="shapeF.collide === true" :indeterminate="shapeF.collide === 'indeterminate'" @change="cycleTri(shapeF, 'collide')" />
				<span>Collides</span>
			</label>
			<label class="tri">
				<input type="checkbox" :checked="shapeF.fixate === true" :indeterminate="shapeF.fixate === 'indeterminate'" @change="cycleTri(shapeF, 'fixate')" />
				<span>Fixate</span>
			</label>
			<label class="tri">
				<input type="checkbox" :checked="shapeF.undragable === true" :indeterminate="shapeF.undragable === 'indeterminate'" @change="cycleTri(shapeF, 'undragable')" />
				<span>Undraggable</span>
			</label>
			<label class="tri">
				<input type="checkbox" :checked="shapeF.outline === true" :indeterminate="shapeF.outline === 'indeterminate'" @change="cycleTri(shapeF, 'outline')" />
				<span>Show Outlines</span>
			</label>
			<label class="tri">
				<input type="checkbox" :checked="shapeF.outlineBehind === true" :indeterminate="shapeF.outlineBehind === 'indeterminate'" @change="cycleTri(shapeF, 'outlineBehind')" />
				<span>Outlines Behind</span>
			</label>
		</section>

		<!-- CANNONS -->
		<section v-if="cannons.length > 0" class="section">
			<h4 class="section-title">Cannons ({{ cannons.length }})</h4>
			<UFormField label="Density" class="field">
				<UInput v-model="cannonF.density" size="xs" placeholder="[varies]" />
			</UFormField>
			<UFormField label="Friction" class="field">
				<UInput v-model="cannonF.friction" size="xs" placeholder="[varies]" />
			</UFormField>
			<UFormField label="Restitution" class="field">
				<UInput v-model="cannonF.restitution" size="xs" placeholder="[varies]" />
			</UFormField>
			<UFormField label="Launch Power" class="field">
				<UInput v-model="cannonF.strength" size="xs" placeholder="[varies]" />
			</UFormField>
		</section>

		<!-- JOINTS -->
		<section v-if="joints.length > 0" class="section">
			<h4 class="section-title">Joints ({{ joints.length }})</h4>
			<label class="tri">
				<input type="checkbox" :checked="jointF.motorOn === true" :indeterminate="jointF.motorOn === 'indeterminate'" @change="cycleTri(jointF, 'motorOn')" />
				<span>Enable Motor / Piston</span>
			</label>
			<UFormField label="Strength" class="field">
				<UInput v-model="jointF.strength" size="xs" placeholder="[varies]" />
			</UFormField>
			<UFormField label="Speed" class="field">
				<UInput v-model="jointF.speed" size="xs" placeholder="[varies]" />
			</UFormField>
			<label class="tri">
				<input type="checkbox" :checked="jointF.floppy === true" :indeterminate="jointF.floppy === 'indeterminate'" @change="cycleTri(jointF, 'floppy')" />
				<span>Floppy Joint</span>
			</label>
		</section>

		<!-- THRUSTERS -->
		<section v-if="thrusters.length > 0" class="section">
			<h4 class="section-title">Thrusters ({{ thrusters.length }})</h4>
			<UFormField label="Strength" class="field">
				<UInput v-model="thrusterF.strength" size="xs" placeholder="[varies]" />
			</UFormField>
			<label class="tri">
				<input type="checkbox" :checked="thrusterF.autoOn === true" :indeterminate="thrusterF.autoOn === 'indeterminate'" @change="cycleTri(thrusterF, 'autoOn')" />
				<span>Auto-On</span>
			</label>
		</section>

		<div class="apply-row">
			<IbButton family="blue" label="Apply" class="apply-btn" :disabled="!canApply" @click="apply" />
		</div>

		<div class="order-buttons">
			<IbButton family="pink" label="Move to Front" class="order-btn" @click="moveFront" />
			<IbButton family="pink" label="Move to Back" class="order-btn" @click="moveBack" />
		</div>
	</div>
</template>

<style scoped>
.multi-edit {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 4px 8px 10px;
}

.intro {
	font-size: 11px;
	color: var(--ib-muted);
	line-height: 1.4;
	margin: 0;
}

.section {
	display: flex;
	flex-direction: column;
	gap: 6px;
	border-top: 1px solid color-mix(in srgb, var(--ib-purple) 20%, transparent);
	padding-top: 8px;
}

.section-title {
	font-size: 12px;
	font-weight: bold;
	color: var(--ib-purple);
	margin: 0;
}

.field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.tri {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 12px;
	color: var(--ib-dark);
	cursor: pointer;
}

.apply-row {
	margin-top: 4px;
}

.apply-btn {
	width: 100%;
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
