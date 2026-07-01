<script setup lang="ts">
// Visual port of the legacy Gui/ImportWindow.ts (312x434 parchment window).
// Original: a message describing what to paste, a big text area for the
// encoded string, then "Import" (orange) / "Cancel" (purple) buttons.
//
// This is a LIVE feature in the original — Database.ImportRobot/ImportReplay/
// ImportChallenge decode the pasted string and hand it to
// Controller.processLoadedRobot/Replay/Challenge. GameCore has no equivalent
// commands yet (no "importRobot"/"importReplay"/"importChallenge"), so the
// Import action here is flagged with <IbTodo/> and only manipulates local
// component state.
import { ref, computed } from "vue";
import IbButton from "../IbButton.vue";
import IbTodo from "../IbTodo.vue";
import { frameTextures } from "../../assets";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

type ImportType = "robot" | "replay" | "challenge";

const props = withDefaults(defineProps<{ importType?: ImportType }>(), {
	importType: "robot",
});

const emit = defineEmits<{ close: [] }>();

const linkText = ref("");

const typeLabel = computed(() =>
	props.importType === "robot" ? "robot" : props.importType === "replay" ? "replay" : "challenge",
);

const message = computed(
	() =>
		`Copy and paste the text you got from exporting\nyour ${typeLabel.value} in the box below, then press "Import."`,
);

function doImport(): void {
	if (linkText.value.length === 0) return;
	// TODO(GameCore): needs importRobot / importReplay / importChallenge
	// commands (mirrors Database.ImportRobot/ImportReplay/ImportChallenge +
	// Controller.processLoadedRobot/Replay/Challenge in the original).
	emit("close");
}

function cancel(): void {
	emit("close");
}
</script>

<template>
	<div class="import-window ib-panel" :style="panelStyle">
		<p class="message">{{ message }}</p>

		<div class="link-area-wrap ib-todo">
			<UTextarea v-model="linkText" class="link-area" :rows="12" placeholder="Paste encoded string here..." />
			<IbTodo label="decode not wired" />
		</div>

		<div class="actions">
			<IbButton family="orange" label="Import" class="action-btn ib-todo" @click="doImport" />
			<IbButton family="purple" label="Cancel" class="action-btn" @click="cancel" />
		</div>
	</div>
</template>

<style scoped>
.import-window {
	width: 312px;
	height: 434px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	font-family: Arial, Helvetica, sans-serif;
	padding: 10px 8px 4px;
}

.message {
	margin: 6px 0 10px;
	font-size: 12px;
	line-height: 1.4;
	text-align: center;
	color: var(--ib-dark);
	white-space: pre-line;
}

.link-area-wrap {
	position: relative;
	width: 265px;
	margin-bottom: 12px;
}

.link-area-wrap :deep(textarea) {
	width: 100%;
	height: 260px;
	font-size: 10px;
	font-family: Arial, Helvetica, sans-serif;
	resize: none;
}

.link-area-wrap .ib-todo-badge {
	position: absolute;
	top: -8px;
	right: -4px;
}

.actions {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
}

.action-btn {
	width: 100px;
}
</style>
