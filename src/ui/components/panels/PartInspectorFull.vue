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
import { useIsMobile } from "../../useIsMobile";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";
import ShapeProps from "./ShapeProps.vue";
import JointProps from "./JointProps.vue";
import ThrusterProps from "./ThrusterProps.vue";
import CannonProps from "./CannonProps.vue";
import TextProps from "./TextProps.vue";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

const game = useGameStore();

// Mobile gate for the density pass. Desktop layout is unchanged; on mobile the
// bottom-sheet inspector must not dominate the screen, so the top action row
// collapses to a compact wrapping row and container paddings tighten.
const isMobile = useIsMobile();

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

// Header text mirrors the legacy m_shapeHeader/m_jointHeader/etc — the
// selected part's type name shown at the top of the panel.
const headerTitle = computed(() => {
	const k = game.edit.selectedPart?.kind;
	switch (k) {
		case "Circle":
			return "Circle";
		case "Rectangle":
			return "Rectangle";
		case "Triangle":
			return "Triangle";
		case "Cannon":
			return "Cannon";
		case "RevoluteJoint":
			return "Rotating Joint";
		case "PrismaticJoint":
			return "Sliding Joint";
		case "Thrusters":
			return "Thrusters";
		case "TextPart":
			return "Text";
		default:
			return k ? "Object" : "Part Editor";
	}
});

// Legacy per-panel action-button set (PartEditWindow constructor):
//  - Text panel: Delete only
//  - Cannon panel: Delete/Cut/Copy/Rotate (no Paste)
//  - all others: Delete/Cut/Copy/Paste/Rotate
const showClipboardActions = computed(() => panelKind.value !== "text");
const showPaste = computed(() => panelKind.value !== "cannon" && panelKind.value !== "text");
const showRotate = computed(() => panelKind.value !== "text");

function deleteSelected(): void {
	if (!hasSelection.value) return;
	game.dispatch({ type: "deleteParts", partIds: game.edit.selection });
}

function cutSelected(): void {
	if (!hasSelection.value) return;
	game.dispatch({ type: "cutParts", partIds: game.edit.selection });
}

function copySelected(): void {
	if (!hasSelection.value) return;
	game.dispatch({ type: "copyParts", partIds: game.edit.selection });
}

function pasteClipboard(): void {
	game.dispatch({ type: "pasteParts" });
}

// Legacy PartEditWindow Rotate button → ControllerGame.rotateButton
// (ControllerGame.ts:3434), which ENTERS rotate mode (curAction = ROTATE) rather
// than rotating by a fixed increment. In the port the rotate gesture lives on the
// "rotate" tool (GameCanvas onPointerDown rotate branch), so we faithfully enter
// that tool here — matching the `R` hotkey (key 82 → rotateButton, :1905).
function rotateSelected(): void {
	if (!hasSelection.value) return;
	game.dispatch({ type: "setTool", tool: "rotate" });
}

function clearSelection(): void {
	game.dispatch({ type: "clearSelection" });
}
</script>

<template>
	<aside class="inspector" :class="{ 'is-mobile': isMobile }">
		<div class="inspector-panel ib-panel" :style="panelStyle">
			<div class="inspector-header">
				<span class="title">{{ headerTitle }}</span>
				<span v-if="hasSelection" class="badge">{{ selectionCount }}</span>
			</div>

			<div class="inspector-body">
				<template v-if="!hasSelection">
					<p class="empty-state">Select a part on the stage to edit its properties.</p>
				</template>

				<template v-else>
					<!-- Legacy top action group (Delete/Cut/Copy/Paste/Rotate). -->
					<div class="top-actions">
						<IbButton family="orange" label="Delete" class="action-btn" @click="deleteSelected" />
						<template v-if="showClipboardActions">
							<IbButton family="orange" label="Cut" class="action-btn" @click="cutSelected" />
							<IbButton family="orange" label="Copy" class="action-btn" @click="copySelected" />
							<IbButton v-if="showPaste" family="orange" label="Paste" class="action-btn" @click="pasteClipboard" />
						</template>
						<IbButton v-if="showRotate" family="blue" label="Rotate" class="action-btn" @click="rotateSelected" />
					</div>

					<ShapeProps v-if="panelKind === 'shape'" />
					<JointProps v-else-if="panelKind === 'joint'" />
					<ThrusterProps v-else-if="panelKind === 'thruster'" />
					<CannonProps v-else-if="panelKind === 'cannon'" />
					<TextProps v-else-if="panelKind === 'text'" />

					<div class="actions">
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

.top-actions {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin: 4px 8px 10px;
	flex-shrink: 0;
}

.top-actions :deep(.ib-btn) {
	width: 100%;
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

/* ---- Mobile (<=768px / coarse pointer) — desktop above is unchanged ----
   The inspector is a bottom-sheet on mobile (see App.vue), so vertical space
   is precious. Pull in the container paddings, and lay the top action row out
   horizontally so Delete/Cut/Copy/Paste/Rotate wrap into one or two compact
   rows of auto-width pills instead of five full-width stacked buttons. */
.inspector.is-mobile .inspector-header {
	padding: 2px 4px 3px;
}

.inspector.is-mobile .inspector-body {
	padding: 0 2px 2px;
}

/* Top action row: horizontal + wrapping, tight gaps, buttons hug their labels
   (auto width) instead of spanning the full sheet width. */
.inspector.is-mobile .top-actions {
	flex-direction: row;
	flex-wrap: wrap;
	gap: 4px;
	margin: 2px 4px 6px;
}

.inspector.is-mobile .top-actions :deep(.ib-btn) {
	width: auto;
	flex: 1 1 auto;
	min-width: 0;
	height: 30px;
	padding: 0 8px;
	font-size: 10px;
}

/* Clear Selection stays full-width but sits in a tighter block. */
.inspector.is-mobile .actions {
	margin: 6px 6px 6px;
	padding-top: 4px;
	gap: 6px;
}

/* Sub-panels (ShapeProps/JointProps/…) render inside the body; on mobile pull
   in their generous 10px field gap + padding so more fits in the sheet. These
   class names are shared verbatim across all five sub-panels. */
.inspector.is-mobile :deep(.shape-props),
.inspector.is-mobile :deep(.joint-props),
.inspector.is-mobile :deep(.thruster-props),
.inspector.is-mobile :deep(.cannon-props),
.inspector.is-mobile :deep(.text-props) {
	gap: 6px;
	padding: 2px 6px 6px;
}

.inspector.is-mobile :deep(.checkboxes) {
	gap: 6px;
}
</style>
