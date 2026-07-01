<script setup lang="ts">
// Fuller visual port of the legacy Gui/PartEditWindow.ts side panel.
//
// This is a VISUAL port with logic-wiring flags, built alongside (not
// replacing) the existing ../PartInspector.vue. GameCore's EditState only
// tracks selected part IDS (`edit.selection: number[]`) — it has no
// per-part-type read model yet, so there is no way to know whether the
// current selection is a ShapePart, a joint, a thruster, etc. Until a
// `readSelectedPart`/`selectedPartSnapshot` selector lands in GameCore, the
// sub-panel shown here is driven by a local dev toggle instead of real
// selection data.
import { computed } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";
import ShapeProps from "./ShapeProps.vue";
import JointProps from "./JointProps.vue";
import ThrusterProps from "./ThrusterProps.vue";
import CannonProps from "./CannonProps.vue";
import TextProps from "./TextProps.vue";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

const game = useGameStore();

const hasSelection = computed(() => game.edit.selection.length > 0);
const selectionCount = computed(() => game.edit.selection.length);

// Pick the sub-panel from the selected part's kind, mirroring PartEditWindow.ts
// ShowObjectPanel / ShowJointPanel / ShowThrustersPanel / ShowCannonPanel /
// ShowTextPanel. `kind` is the live Part's `type` string.
type PanelKind = "shape" | "joint" | "thruster" | "cannon" | "text" | null;
const panelKind = computed<PanelKind>(() => {
	const k = game.edit.selectedPart?.kind;
	switch (k) {
		case "Circle":
		case "Rectangle":
		case "Triangle":
			return "shape";
		case "Cannon":
			return "cannon";
		case "RevoluteJoint":
		case "PrismaticJoint":
			return "joint";
		case "Thrusters":
			return "thruster";
		case "TextPart":
			return "text";
		default:
			return k ? "shape" : null;
	}
});

function deleteSelected(): void {
	if (!hasSelection.value) return;
	game.dispatch({ type: "deleteParts", partIds: game.edit.selection });
}

function clearSelection(): void {
	game.dispatch({ type: "clearSelection" });
}
</script>

<template>
	<aside class="inspector">
		<div class="inspector-panel ib-panel" :style="panelStyle">
			<div class="inspector-header">
				<span class="title">Part Editor</span>
				<span v-if="hasSelection" class="badge">{{ selectionCount }}</span>
			</div>

			<div class="inspector-body">
				<template v-if="!hasSelection">
					<p class="empty-state">Select a part on the stage to edit its properties.</p>
				</template>

				<template v-else>
					<ShapeProps v-if="panelKind === 'shape'" />
					<JointProps v-else-if="panelKind === 'joint'" />
					<ThrusterProps v-else-if="panelKind === 'thruster'" />
					<CannonProps v-else-if="panelKind === 'cannon'" />
					<TextProps v-else-if="panelKind === 'text'" />

					<div class="actions">
						<IbButton family="orange" label="Delete" class="action-btn" @click="deleteSelected" />
						<IbButton family="purple" label="Clear Selection" class="action-btn" @click="clearSelection" />
					</div>
				</template>
			</div>
		</div>
	</aside>
</template>

<style scoped>
/* Narrow vertical panel matching the legacy Gui/PartEditWindow.ts
   (super(0, 90, 120, 500) — pinned to the LEFT edge under the toolbar,
   ~120px content wide, tall). App.vue positions it over the left of the
   canvas; here we just size it to the legacy width and let it fill height. */
.inspector {
	width: 150px;
	flex-shrink: 0;
	box-sizing: border-box;
	display: flex;
	font-family: Arial, Helvetica, sans-serif;
	height: 100%;
}

.inspector-panel {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.inspector-header {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 5px;
	padding: 2px 4px 6px;
	flex-shrink: 0;
}

.title {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	font-weight: bold;
	color: var(--ib-purple);
	text-align: center;
}

.badge {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 10px;
	font-weight: bold;
	color: var(--ib-cream);
	background: var(--ib-purple);
	border-radius: 999px;
	padding: 2px 8px;
}

.inspector-body {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	padding: 0 2px 2px;
}

.empty-state {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	color: var(--ib-muted);
	line-height: 1.5;
	padding: 6px 8px;
	margin: 0;
}

.actions {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin: 12px 12px 12px;
	padding-top: 8px;
	flex-shrink: 0;
}

.actions :deep(.ib-btn) {
	width: 100%;
}
</style>
