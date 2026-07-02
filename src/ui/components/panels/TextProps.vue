<script setup lang="ts">
// Port of PartEditWindow.ts ShowTextPanel (m_textEditPanel) — TextPart editor.
// Fully wired to GameCore: reads edit.selectedPart, dispatches setTextContent /
// setTextSize / setTextDisplayKey / setTextAlwaysVisible / setTextScaleWithZoom
// (ported from EnterTextAction / TextSizeChangeAction / TextCheckboxAction /
// ControlKeyAction TEXT_TYPE) plus the shared setColour.
import { computed, ref, watch } from "vue";
import { useGameStore } from "../../gameStore";
import IbButton from "../IbButton.vue";
import IbTodo from "../IbTodo.vue";
import { keyToLabel, labelToKey } from "../../keyLabels";

const game = useGameStore();
const sel = computed(() => game.edit.selectedPart);
const ids = computed(() => game.edit.selection);

// Text content is committed on blur so we don't dispatch on every keystroke.
const text = ref("");
watch(sel, () => (text.value = sel.value?.text ?? ""), { immediate: true });
function commitText(): void {
	game.dispatch({ type: "setTextContent", partIds: ids.value, text: text.value });
}

const size = computed({
	get: () => sel.value?.size ?? 14,
	set: (v: number) => game.dispatch({ type: "setTextSize", partIds: ids.value, value: Number(v) }),
});
const displayKey = computed({
	get: () => keyToLabel(sel.value?.displayKey),
	set: (v: string) => {
		const key = labelToKey(v);
		if (key != null) game.dispatch({ type: "setTextDisplayKey", partIds: ids.value, key });
	},
});
const alwaysVisible = computed({
	get: () => sel.value?.alwaysVisible ?? false,
	set: (v: boolean) => game.dispatch({ type: "setTextAlwaysVisible", partIds: ids.value, value: v }),
});
const scaleWithZoom = computed({
	get: () => sel.value?.scaleWithZoom ?? true,
	set: (v: boolean) => game.dispatch({ type: "setTextScaleWithZoom", partIds: ids.value, value: v }),
});

const localColour = ref("#242930");
watch(
	sel,
	() => {
		localColour.value =
			"#" + [sel.value?.red ?? 0, sel.value?.green ?? 0, sel.value?.blue ?? 0]
				.map((c) => Math.round(c).toString(16).padStart(2, "0"))
				.join("");
	},
	{ immediate: true },
);
function applyColour(): void {
	if (ids.value.length === 0) return;
	const hex = localColour.value.replace("#", "");
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	// TextPart has no opacity field; setColour ignores opacity for text.
	game.dispatch({ type: "setColour", partIds: ids.value, r, g, b, opacity: 1 });
}
</script>

<template>
	<div class="text-props">
		<UFormField label="Text:" class="field">
			<UTextarea v-model="text" :rows="3" size="xs" class="text-area" @blur="commitText" />
		</UFormField>

		<UFormField label="Text Size:" class="field">
			<UInput v-model.number="size" type="number" size="xs" class="num-input" />
		</UFormField>

		<div class="checkboxes">
			<UCheckbox v-model="scaleWithZoom" label="Scale with Zoom" />
		</div>
		<div class="checkboxes">
			<UCheckbox v-model="alwaysVisible" label="Always Display" />
		</div>

		<UFormField label="Display Text Key:" class="field">
			<UInput v-model="displayKey" size="xs" :disabled="alwaysVisible" class="key-input" />
		</UFormField>

		<UFormField label="Color" class="field">
			<div class="colour-row">
				<input v-model="localColour" type="color" class="colour-swatch" />
			</div>
			<IbButton family="blue" label="Change Color" class="colour-apply" @click="applyColour" />
		</UFormField>

		<div class="order-buttons">
			<IbButton family="pink" label="Move to Front" class="order-btn" disabled />
			<IbButton family="pink" label="Move to Back" class="order-btn" disabled />
			<IbTodo label="no command" />
		</div>
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

.colour-apply {
	margin-top: 4px;
	align-self: flex-start;
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
