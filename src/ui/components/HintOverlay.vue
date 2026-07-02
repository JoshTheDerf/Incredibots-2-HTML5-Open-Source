<script setup lang="ts">
// On-screen hint-text + notice layer — a faithful port of ControllerGame's
// centered Pixi Text overlays (ControllerGame.ts:227-290, toggled at :564-567).
//
// The legacy game rendered several centered Text objects near the top of the
// stage (y=102, anchored centre) that were made visible per editor state:
//   - rotatingText  (rotate tool active)              :244
//   - scalingText   (resize tool active)              :252
//   - boxText       (condition awaiting a box)        :260
//   - horizLineText (condition awaiting a h-line)     :270
//   - vertLineText  (condition awaiting a v-line)     :279
//   - shapeText     (condition awaiting a shape pick) :288
//   - uneditableText (hovering an uneditable part)    :231  — NOT ported: the
//     port has no hover / uneditable-part read model, so this hint is omitted.
//
// Here they become a single absolutely-positioned, non-interactive centered
// banner driven by store state. Also renders `game.notice` (the play-refused /
// limit dialogs the core emits via onMessage) as a small dismissible dialog with
// an OK button that calls game.dismissNotice() — surfacing M1's messages.
import { computed } from "vue";
import { useGameStore } from "../gameStore";
import IbButton from "./IbButton.vue";
import { frameTextures } from "../assets";

const game = useGameStore();

// Supply the parchment frame texture the .ib-panel border-image needs (same
// pattern as PartInspectorFull), so the notice dialog matches the other panels.
const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

// Exact legacy hint strings (ControllerGame.ts:244/252/260/270/279/288).
const ROTATING_TEXT = "Move the mouse around to rotate the shape, and click when you're done.";
const SCALING_TEXT = "Move the mouse to the right to increase the shape's size, and left to decrease it.";
const BOX_TEXT =
	"Use the mouse to click and drag a box for the given condition.  You can use the arrow keys to scroll.";
const HORIZ_LINE_TEXT =
	"Use the mouse to draw a horizontal line for the given condition.  You can use the arrow keys to scroll.";
const VERT_LINE_TEXT =
	"Use the mouse to draw a vertical line for the given condition.  You can use the arrow keys to scroll.";
const SHAPE_TEXT = "Select a shape for the given condition.  You can use the arrow keys to scroll.";

// The active hint text (or null). Condition-pick prompts take priority over the
// tool prompts, matching the legacy visibility gating (a pick suppresses the
// normal edit gestures). Only shown while editing.
const hintText = computed<string | null>(() => {
	if (game.sim.phase !== "editing") return null;

	const awaiting = game.conditionDraft?.awaiting;
	if (awaiting) {
		switch (awaiting) {
			case "box":
				return BOX_TEXT;
			case "hline":
				return HORIZ_LINE_TEXT;
			case "vline":
				return VERT_LINE_TEXT;
			case "shape1":
			case "shape2":
				return SHAPE_TEXT;
		}
	}

	const tool = game.edit.tool;
	if (tool === "rotate") return ROTATING_TEXT;
	if (tool === "resize") return SCALING_TEXT;
	return null;
});

const notice = computed(() => game.notice);

function dismiss(): void {
	game.dismissNotice();
}
</script>

<template>
	<div class="hint-overlay">
		<!-- Centered hint banner near the top of the stage (legacy y≈102). -->
		<div v-if="hintText" class="hint-banner">{{ hintText }}</div>

		<!-- Core message / play-refused dialog. Interactive (OK button). -->
		<div v-if="notice" class="notice-dialog ib-panel" :style="panelStyle">
			<p class="notice-text">{{ notice }}</p>
			<IbButton family="blue" label="OK" class="notice-ok" @click="dismiss" />
		</div>
	</div>
</template>

<style scoped>
/* Full-stage, non-interactive layer. Children re-enable pointer events only
   where needed (the notice dialog). */
.hint-overlay {
	position: absolute;
	inset: 0;
	pointer-events: none;
	z-index: 25;
}

/* Centered banner near the top — mirrors the legacy centred Text at y≈102. */
.hint-banner {
	position: absolute;
	top: 96px;
	left: 50%;
	transform: translateX(-50%);
	max-width: 640px;
	padding: 6px 14px;
	text-align: center;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	line-height: 1.4;
	color: var(--ib-cream, #fdf9ea);
	background: rgba(36, 41, 48, 0.82);
	border: 1px solid var(--ib-purple, #43366f);
	border-radius: 4px;
	pointer-events: none;
}

/* Small centered dialog for core messages (play-refused / limits). */
.notice-dialog {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	pointer-events: auto;
	min-width: 260px;
	max-width: 380px;
	padding: 18px 20px 16px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 14px;
	box-sizing: border-box;
}

.notice-text {
	margin: 0;
	text-align: center;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 13px;
	line-height: 1.5;
	color: var(--ib-purple, #43366f);
	font-weight: bold;
}

.notice-ok {
	min-width: 90px;
}
</style>
