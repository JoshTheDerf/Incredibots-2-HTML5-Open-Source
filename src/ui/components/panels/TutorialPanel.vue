<script setup lang="ts">
// Port of the legacy Gui/TutorialWindow.ts message bubble — the small dialog
// that pops up during in-game tutorials.
//
// Now wired to the real GameCore tutorial state machine (src/core/tutorials.ts):
// the message text + "More..."/"OK" button come from state.tutorial.currentMessage
// (resolved from the TUTORIAL_MESSAGES table), and the button dispatches
// advanceTutorial(currentMessageId) — the faithful equivalent of
// TutorialWindow.closeWindow() -> cont.CloseTutorialDialog(this.num). The panel
// only renders when a tutorial dialog is active.
import { computed } from "vue";
import { storeToRefs } from "pinia";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";
import { useGameStore } from "../../gameStore";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

const store = useGameStore();
const { tutorial } = storeToRefs(store);

// The active dialog message (null when no tutorial dialog is showing).
const message = computed(() => tutorial.value?.currentMessage ?? null);
const messageId = computed(() => tutorial.value?.currentMessageId ?? null);
// TutorialWindow's button label: "More..." when moreButton else "OK" (:102).
const buttonLabel = computed(() => (message.value?.hasMore ? "More..." : "OK"));

// TutorialWindow.closeWindow() -> cont.CloseTutorialDialog(this.num). The single
// button both advances (More...) and dismisses (OK) via the per-tutorial switch.
function advance(): void {
	if (messageId.value != null) store.dispatch({ type: "advanceTutorial", messageId: messageId.value });
}
</script>

<template>
	<div v-if="message" class="tutorial-window ib-panel" :style="panelStyle">
		<div class="msg-area">
			{{ message.text }}
		</div>

		<div class="controls">
			<IbButton family="purple" :label="buttonLabel" class="ok-btn" @click="advance" />
		</div>
	</div>
</template>

<style scoped>
.tutorial-window {
	width: 248px;
	min-height: 170px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	font-family: Arial, Helvetica, sans-serif;
	padding: 6px 10px 10px;
}

.msg-area {
	width: 228px;
	margin-top: 10px;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	line-height: 1.35;
	text-align: center;
	color: var(--ib-dark);
	white-space: pre-line;
}

.controls {
	margin-top: 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
}

.ok-btn {
	width: 70px;
}

.nav-btn {
	width: 60px;
	font-size: 10px;
}

.todo-row {
	margin-top: 8px;
}
</style>
