<script setup lang="ts">
// Reusable visual port of the legacy PIXI DialogWindow (src/Gui/DialogWindow.ts).
// The original was a generic parchment popup used for confirmations, save/load
// prompts, error messages, and "please wait..." progress dialogs (animated
// trailing dots via a 1s interval, auto-hiding OK-less "busy" dialogs). This
// component is a pure visual/slot shell — callers own all navigation logic
// (ConfirmSaveRobot, HideDialog, BrowserRedirect, etc. from the legacy
// Controller); this component only renders chrome and emits button clicks.
import { computed, onBeforeUnmount, ref, watch } from "vue";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";
import type { ButtonFamily } from "../../assets";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

export interface IbDialogButton {
	label: string;
	family?: ButtonFamily;
}

const props = withDefaults(
	defineProps<{
		title?: string;
		message?: string;
		buttons?: IbDialogButton[];
		/** Mirrors the legacy "no OK button" busy dialog: animates trailing dots. */
		progress?: boolean;
	}>(),
	{
		title: "",
		message: "",
		buttons: () => [],
		progress: false,
	},
);

const emit = defineEmits<{
	(e: "button", label: string, index: number): void;
}>();

// --- legacy "please wait..." trailing-dot animation ---
// Original: setInterval every 1000ms appending "." to the message, stopping
// after 15 dots (TimerDotHandler / StopTimer in DialogWindow.ts).
const dots = ref("");
let timer: ReturnType<typeof setInterval> | null = null;

function stopTimer(): void {
	if (timer) {
		clearInterval(timer);
		timer = null;
	}
}

function startTimer(): void {
	stopTimer();
	dots.value = "";
	let count = 0;
	timer = setInterval(() => {
		count++;
		if (count >= 15) {
			stopTimer();
			return;
		}
		dots.value += ".";
	}, 1000);
}

watch(
	() => props.progress,
	(isProgress) => {
		if (isProgress) startTimer();
		else stopTimer();
	},
	{ immediate: true },
);

onBeforeUnmount(stopTimer);

const displayMessage = computed(() => (props.progress ? props.message + dots.value : props.message));

function onButtonClick(label: string, index: number): void {
	emit("button", label, index);
}
</script>

<template>
	<div class="ib-dialog ib-panel" :style="panelStyle" role="dialog" :aria-label="title || 'Dialog'">
		<h2 v-if="title" class="ib-dialog-title">{{ title }}</h2>

		<p v-if="displayMessage" class="ib-dialog-message">{{ displayMessage }}</p>

		<div class="ib-dialog-body">
			<slot />
		</div>

		<div v-if="buttons.length" class="ib-dialog-buttons">
			<IbButton
				v-for="(btn, i) in buttons"
				:key="i"
				:family="btn.family ?? 'purple'"
				:label="btn.label"
				class="ib-dialog-btn"
				@click="onButtonClick(btn.label, i)"
			/>
		</div>
	</div>
</template>

<style scoped>
.ib-dialog {
	width: 300px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	font-family: Arial, Helvetica, sans-serif;
	color: var(--ib-dark);
}

.ib-dialog-title {
	margin: 0 0 10px;
	font-size: 16px;
	font-weight: bold;
	line-height: 1.2;
	text-align: center;
	color: var(--ib-dark);
}

.ib-dialog-message {
	margin: 0 0 12px;
	font-size: 12px;
	line-height: 1.4;
	color: var(--ib-dark);
	white-space: pre-line;
	word-wrap: break-word;
}

.ib-dialog-body {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.ib-dialog-buttons {
	display: flex;
	justify-content: center;
	gap: 12px;
	margin-top: 14px;
}

.ib-dialog-btn {
	min-width: 60px;
}
</style>
