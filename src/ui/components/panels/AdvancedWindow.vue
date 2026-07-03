<script setup lang="ts">
// Faithful port of Jaybit's pop-up Advanced windows (Gui/AdvancedPropertiesWindow.as
// + Gui/AdvancedCannonWindow.as), opened by the "Advanced" button in each part
// panel. Replaces the old inline collapsible AdvancedProps/TriggerProps sections.
//
// Four layout variants, matching the legacy window's shapeAdv / slidingAdv /
// jointAdv sub-sprites + the separate AdvancedCannonWindow:
//   - "shape"   (Circle/Rectangle/Triangle): two side-by-side trigger columns,
//               each = "Trigger Names" input + action combo (None/Destroy/
//               Rotate CW/Rotate CCW/Expand/Contract/Fire) + "Same name hit" +
//               "On ground hit"; then Collision Groups (A-D + Self-collision).
//               (Shape friction/restitution are NOT here — Jaybit put those
//               sliders in the main PartEditWindow object panel, so ours live in
//               ShapeProps now.)
//   - "cannon"  (Cannon): a single "Trigger Names" textarea (the triggerList),
//               Friction + Restitution sliders, then Collision Groups.
//   - "sliding" (PrismaticJoint): the big "Trigger Names" textarea + Collision
//               Groups (slidingAdv carries collA-D/subColl).
//   - "target"  (RevoluteJoint/FixedJoint/Thrusters/TextPart): the big "Trigger
//               Names" textarea only (jointAdv).
//
// APPLY SEMANTICS (matching Jaybit): the legacy window applied on OK via a single
// cont.triggerText(...) submit and DISCARDED on Cancel. We reproduce that by
// BUFFERING every edit in plain local reactive state (seeded once when the modal
// opens) and dispatching one { type: "batch" } of the per-property commands on
// OK — a single undo step. Cancel just closes.
//
// This buffering also fixes the reported bug where the action dropdown and the
// two checkboxes were not editable: the old inline TriggerProps bound those
// controls to `computed`s whose getter read a NON-reactive live Part via
// game.parts.find(). Because that read returned the same object reference across
// state emits, the getter never re-evaluated after a dispatch, so Nuxt UI's
// controlled v-model instantly reverted the control to the stale value (the text
// input escaped this only because it used a decoupled local ref). Plain local
// buffer state is editable regardless of any live-part reactivity.
import { computed, reactive } from "vue";
import { useGameStore } from "../../gameStore";
import type { Command } from "../../../core";
import {
	TRIGGER_NONE,
	TRIGGER_DESTROY,
	TRIGGER_ROTATECW,
	TRIGGER_ROTATECCW,
	TRIGGER_EXPAND,
	TRIGGER_CONTRACT,
	TRIGGER_FIRE,
} from "../../../Parts/partDefaults";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";

const emit = defineEmits<{ close: [] }>();

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

const game = useGameStore();
const sel = computed(() => game.edit.selectedPart);
const ids = computed(() => game.edit.selection);

// --- variant from the selected part kind (mirrors legacy SetVals branches) ---
type Variant = "shape" | "cannon" | "sliding" | "target";
const variant = computed<Variant>(() => {
	const k = sel.value?.kind;
	if (k === "Cannon") return "cannon";
	if (k === "PrismaticJoint") return "sliding";
	if (k === "Circle" || k === "Rectangle" || k === "Triangle") return "shape";
	return "target"; // RevoluteJoint / FixedJoint / Thrusters / TextPart
});
const showCollisionGroups = computed(() => variant.value !== "target");
const showMaterial = computed(() => variant.value === "cannon"); // Friction/Restitution
const headerTitle = computed(() => {
	switch (sel.value?.kind) {
		case "Cannon": return "Cannon";
		case "PrismaticJoint": return "Sliding Joint";
		case "RevoluteJoint": return "Rotating Joint";
		case "FixedJoint": return "Fixed Joint";
		case "Thrusters": return "Thrusters";
		case "TextPart": return "Text";
		default: return sel.value?.kind ?? "Part";
	}
});

// --- challenge gating (AdvancedPropertiesWindow.as:943-976) ------------------
// Triggers hidden in a challenge PLAY session that forbids them. The A-D
// collision-group boxes and the subColl box are disabled INDEPENDENTLY
// (m_collABox..m_collDBox on !collisionGroupsAllowed; m_subCollBox on
// !subCollisionsAllowed — :960-975). The core refuses the blocked halves too.
const triggersDisallowed = computed(() => !!(game.challenge?.playMode && !game.challenge.restrictions.triggers));
const collGroupsDisallowed = computed(() => !!(game.challenge?.playMode && !game.challenge.restrictions.collisionGroups));
const subCollDisallowed = computed(() => !!(game.challenge?.playMode && !game.challenge.restrictions.subCollisions));

// --- action combo (AdvancedPropertiesWindow.as:157-163) ----------------------
// {label, value} pairs over the TRIGGER_* constants — no positional index math.
const ACTION_ITEMS = [
	{ label: "None", value: TRIGGER_NONE },
	{ label: "Destroy", value: TRIGGER_DESTROY },
	{ label: "Rotate CW", value: TRIGGER_ROTATECW },
	{ label: "Rotate CCW", value: TRIGGER_ROTATECCW },
	{ label: "Expand", value: TRIGGER_EXPAND },
	{ label: "Contract", value: TRIGGER_CONTRACT },
	{ label: "Fire", value: TRIGGER_FIRE },
];

// --- friction / restitution ranges (honour challenge restrictions) -----------
const restr = computed(() => game.challenge?.restrictions);
const frictionMin = computed(() => restr.value?.minFriction ?? 1);
const frictionMax = computed(() => restr.value?.maxFriction ?? 30);
const restitutionMin = computed(() => restr.value?.minRestitution ?? 1);
const restitutionMax = computed(() => restr.value?.maxRestitution ?? 30);
const frictionLocked = computed(() => frictionMin.value >= frictionMax.value);
const restitutionLocked = computed(() => restitutionMin.value >= restitutionMax.value);

// --- local edit buffer (seeded ONCE at open; edited freely; applied on OK) ----
// The component mounts fresh each time the modal opens (v-if in PartInspectorFull),
// so setup-time seeding from the reactive snapshot is correct and decoupled.
const s = sel.value;
const buf = reactive({
	// shape source, two slots
	name1: s?.triggerName ?? "",
	name2: s?.triggerName_2 ?? "",
	action1: s?.triggerAction ?? TRIGGER_NONE,
	action2: s?.triggerAction_2 ?? TRIGGER_NONE,
	sameName1: s?.onSameName ?? false,
	sameName2: s?.onSameName_2 ?? false,
	groundHit1: s?.onGroundHit ?? false,
	groundHit2: s?.onGroundHit_2 ?? false,
	// target listen list
	list: s?.triggerList ?? "",
	// material (cannon)
	friction: s?.friction ?? 11,
	restitution: s?.restitution ?? 7,
	// collision groups
	collA: s?.collA ?? true,
	collB: s?.collB ?? true,
	collC: s?.collC ?? true,
	collD: s?.collD ?? true,
	subColl: s?.subColl ?? false,
});

function ok(): void {
	const idv = ids.value;
	const cmds: Command[] = [];
	if (idv.length > 0) {
		// Triggers (skipped entirely when disallowed — the core refuses them too).
		if (!triggersDisallowed.value) {
			if (variant.value === "shape") {
				cmds.push({
					type: "setShapeTrigger", partIds: idv, slot: 1,
					name: buf.name1, action: buf.action1,
					onSameName: buf.sameName1, onGroundHit: buf.groundHit1,
				});
				cmds.push({
					type: "setShapeTrigger", partIds: idv, slot: 2,
					name: buf.name2, action: buf.action2,
					onSameName: buf.sameName2, onGroundHit: buf.groundHit2,
				});
			} else {
				cmds.push({ type: "setTriggerList", partIds: idv, value: buf.list });
			}
		}
		if (showMaterial.value) {
			cmds.push({ type: "setFriction", partIds: idv, value: Number(buf.friction) });
			cmds.push({ type: "setRestitution", partIds: idv, value: Number(buf.restitution) });
		}
		if (showCollisionGroups.value) {
			cmds.push({
				type: "setCollisionGroups", partIds: idv,
				collA: buf.collA, collB: buf.collB, collC: buf.collC, collD: buf.collD,
				subColl: buf.subColl, collide: s?.collide ?? true,
			});
		}
	}
	if (cmds.length > 0) game.dispatch(cmds.length === 1 ? cmds[0] : { type: "batch", commands: cmds });
	emit("close");
}
</script>

<template>
	<div class="adv-window ib-panel" :style="panelStyle" role="dialog" aria-label="Advanced properties">
		<p class="title">Advanced</p>
		<p class="subtitle">{{ headerTitle }}</p>

		<div class="adv-body">
			<!-- Triggers disallowed by the active challenge -->
			<p v-if="triggersDisallowed" class="note">Triggers are not allowed in this challenge.</p>

			<!-- SHAPE: two side-by-side trigger columns -->
			<div v-else-if="variant === 'shape'" class="trigger-columns">
				<div class="trigger-col">
					<span class="col-label">Trigger Names</span>
					<UInput v-model="buf.name1" size="xs" :maxlength="255" class="full" />
					<USelect v-model="buf.action1" :items="ACTION_ITEMS" value-key="value" size="xs" class="full" />
					<UCheckbox v-model="buf.sameName1" label="Same name hit" />
					<UCheckbox v-model="buf.groundHit1" label="On ground hit" />
				</div>
				<div class="trigger-col">
					<span class="col-label">Trigger Names</span>
					<UInput v-model="buf.name2" size="xs" :maxlength="255" class="full" />
					<USelect v-model="buf.action2" :items="ACTION_ITEMS" value-key="value" size="xs" class="full" />
					<UCheckbox v-model="buf.sameName2" label="Same name hit" />
					<UCheckbox v-model="buf.groundHit2" label="On ground hit" />
				</div>
			</div>

			<!-- CANNON / SLIDING / TARGET: single big Trigger Names textarea -->
			<div v-else class="trigger-list">
				<span class="col-label">Trigger Names</span>
				<UTextarea v-model="buf.list" :rows="4" size="xs" class="full" />
				<p class="caption">Comma-separated names this part responds to.</p>
			</div>

			<!-- CANNON: Friction / Restitution sliders -->
			<div v-if="showMaterial" class="material">
				<UFormField label="Friction" class="field">
					<div class="slider-row">
						<USlider v-model="buf.friction" :min="frictionMin" :max="frictionMax" :step="1" size="sm" :disabled="frictionLocked" class="slider" />
						<UInput v-model.number="buf.friction" type="number" size="xs" :disabled="frictionLocked" class="num-input" />
					</div>
				</UFormField>
				<UFormField label="Restitution" class="field">
					<div class="slider-row">
						<USlider v-model="buf.restitution" :min="restitutionMin" :max="restitutionMax" :step="1" size="sm" :disabled="restitutionLocked" class="slider" />
						<UInput v-model.number="buf.restitution" type="number" size="xs" :disabled="restitutionLocked" class="num-input" />
					</div>
				</UFormField>
			</div>

			<!-- Collision Groups (shape / cannon / sliding) -->
			<div v-if="showCollisionGroups" class="groups">
				<span class="groups-label">Collision Groups</span>
				<!-- A-D and Self-collision are disallowed INDEPENDENTLY by the active
				     challenge (AdvancedPropertiesWindow.as:960-975); the core refuses
				     the blocked halves too. -->
				<p v-if="collGroupsDisallowed || subCollDisallowed" class="note">
					{{ collGroupsDisallowed && subCollDisallowed
						? "Collision group changes are not allowed in this challenge."
						: collGroupsDisallowed
							? "Collision group (A-D) changes are not allowed in this challenge."
							: "Self-collision changes are not allowed in this challenge." }}
				</p>
				<div class="groups-row">
					<UCheckbox v-model="buf.collA" label="A" :disabled="collGroupsDisallowed" />
					<UCheckbox v-model="buf.collB" label="B" :disabled="collGroupsDisallowed" />
					<UCheckbox v-model="buf.collC" label="C" :disabled="collGroupsDisallowed" />
					<UCheckbox v-model="buf.collD" label="D" :disabled="collGroupsDisallowed" />
				</div>
				<UCheckbox v-model="buf.subColl" label="Self-collision" :disabled="subCollDisallowed" />
			</div>
		</div>

		<div class="actions">
			<IbButton family="purple" label="OK" class="act-btn" @click="ok" />
			<IbButton family="purple" label="Cancel" class="act-btn" @click="$emit('close')" />
		</div>
	</div>
</template>

<style scoped>
.adv-window {
	width: 300px;
	max-width: calc(100vw - 24px);
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	font-family: Arial, Helvetica, sans-serif;
	color: var(--ib-dark);
	padding: 10px 12px 8px;
}

.title {
	margin: 2px 0 0;
	font-size: 16px;
	font-weight: bold;
	text-align: center;
	color: var(--ib-purple);
}

.subtitle {
	margin: 0 0 8px;
	font-size: 11px;
	text-align: center;
	color: var(--ib-muted);
}

.adv-body {
	display: flex;
	flex-direction: column;
	gap: 12px;
	/* Fit small screens: scroll the body, keep OK/Cancel visible. */
	max-height: 60vh;
	max-height: 60dvh;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
}

.trigger-columns {
	display: flex;
	gap: 10px;
}

.trigger-col {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.trigger-list {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.col-label {
	font-size: 11px;
	font-weight: bold;
	color: var(--ib-purple);
	text-align: center;
}

.caption {
	font-size: 10px;
	color: var(--ib-muted);
	margin: 0;
	line-height: 1.3;
}

.full {
	width: 100%;
}

.material {
	display: flex;
	flex-direction: column;
	gap: 8px;
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

.groups {
	display: flex;
	flex-direction: column;
	gap: 6px;
	border-top: 1px solid color-mix(in srgb, var(--ib-purple) 25%, transparent);
	padding-top: 8px;
}

.groups-label {
	font-size: 12px;
	font-weight: bold;
	color: var(--ib-dark);
}

.groups-row {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
}

.note {
	font-size: 11px;
	color: var(--ib-muted);
	margin: 0;
	line-height: 1.4;
}

.actions {
	display: flex;
	justify-content: center;
	gap: 12px;
	margin-top: 12px;
}

.act-btn {
	min-width: 90px;
}
</style>
