<script setup lang="ts">
// Visual port of PartEditWindow.ts ShowTextPanel (m_textEditPanel) — the
// TextPart property editor: text content, size, colour, display key,
// always-visible, and scale-with-zoom ("in front" behaviour follows from
// Move to Front/Back, shared with the base part actions).
//
// Live-wired: colour Apply -> setColour(edit.selection).
// Flagged: text content, size, display key, always-visible, scale-with-zoom
// all need commands: setTextContent, setTextSize, setTextDisplayKey,
// setTextAlwaysVisible, setTextScaleWithZoom.
import { ref } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";
import IbTodo from "../IbTodo.vue";

const game = useGameStore();

const text = ref(""); // m_textArea
const size = ref(12); // m_sizeArea
const colourHex = ref("#242930");
const opacity = ref(100);
const displayKey = ref("T"); // m_textKeyArea
const alwaysVisible = ref(false); // m_alwaysVisibleBox
const scaleWithZoom = ref(true); // m_scaleWithZoomBox

function applyColour(): void {
	if (game.edit.selection.length === 0) return;
	const hex = colourHex.value.replace("#", "");
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	game.dispatch({
		type: "setColour",
		partIds: game.edit.selection,
		r,
		g,
		b,
		opacity: opacity.value / 100,
	});
}
</script>

<template>
	<div class="text-props">
		<UFormField label="Text" class="field">
			<UTextarea v-model="text" :rows="3" size="xs" class="text-area" />
			<IbTodo label="setTextContent" />
		</UFormField>

		<UFormField label="Text Size" class="field">
			<UInput v-model="size" type="number" size="xs" class="num-input" />
			<IbTodo label="setTextSize" />
		</UFormField>

		<div class="checkboxes">
			<UCheckbox v-model="scaleWithZoom" label="Scale with Zoom" />
			<IbTodo label="setTextScaleWithZoom" />
		</div>
		<div class="checkboxes">
			<UCheckbox v-model="alwaysVisible" label="Always Display" />
			<IbTodo label="setTextAlwaysVisible" />
		</div>

		<UFormField label="Display Text Key" class="field">
			<UInput v-model="displayKey" size="xs" :disabled="alwaysVisible" class="key-input" />
			<IbTodo label="setTextDisplayKey" />
		</UFormField>

		<UFormField label="Color" class="field">
			<div class="colour-row">
				<input v-model="colourHex" type="color" class="colour-swatch" />
				<UFormField label="Opacity" class="opacity-field">
					<USlider v-model="opacity" :min="0" :max="100" :step="1" size="sm" />
				</UFormField>
			</div>
			<IbButton family="blue" label="Change Color" class="colour-apply" @click="applyColour" />
		</UFormField>
	</div>
</template>

<style scoped>
.text-props {
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

.text-area {
	width: 100%;
}

.num-input,
.key-input {
	width: 64px;
}

.checkboxes {
	display: flex;
	align-items: center;
	gap: 8px;
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
</style>
