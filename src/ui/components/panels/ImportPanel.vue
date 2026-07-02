<script setup lang="ts">
// Visual port of the legacy Gui/ImportWindow.ts (312x434 parchment window).
// Original: a message describing what to paste, a big text area for the
// encoded string, then "Import" (orange) / "Cancel" (purple) buttons.
//
// This is a LIVE feature — the pasted string is decoded by GameCore (via the
// store). Faithful to ImportWindow.doImport (src/Gui/ImportWindow.ts:64-75),
// which branches on the window type: robot -> Database.ImportRobot,
// replay -> Database.ImportReplay, challenge -> Database.ImportChallenge. Here
// robot and replay are wired to game.importRobot / game.importReplay. Challenge
// STRING import has no backing GameCore command yet (only loadBuiltInChallenge
// / the blob loader exist), so it is flagged as an IbTodo gap.
import { ref, computed } from "vue";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";
import { useGameStore } from "../../gameStore";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

type ImportType = "robot" | "replay" | "challenge";

const props = withDefaults(defineProps<{ importType?: ImportType }>(), {
	importType: "robot",
});

// `imported` fires only on a SUCCESSFUL import (before close) so callers that
// need to navigate — e.g. the main menu, which must switch into the editor view
// for the imported robot/replay to become visible — can react. `close` fires on
// both success and cancel.
const emit = defineEmits<{ close: []; imported: [] }>();

const game = useGameStore();
const linkText = ref("");
const errorMsg = ref("");
const importing = ref(false);

const typeLabel = computed(() =>
	props.importType === "robot" ? "robot" : props.importType === "replay" ? "replay" : "challenge",
);

const message = computed(
	() =>
		`Copy and paste the text you got from exporting\nyour ${typeLabel.value} in the box below, then press "Import."`,
);

async function doImport(): Promise<void> {
	if (linkText.value.trim().length === 0 || importing.value) return;
	errorMsg.value = "";
	// Challenge string-import has no GameCore command (only loadBuiltInChallenge
	// + the async blob loader exist) — flag the gap faithfully instead of
	// inventing a dispatch.
	if (props.importType === "challenge") {
		errorMsg.value = "Challenge import is not available yet.";
		return;
	}
	importing.value = true;
	try {
		if (props.importType === "replay") {
			await game.importReplay(linkText.value.trim());
		} else {
			await game.importRobot(linkText.value.trim());
		}
		emit("imported");
		emit("close");
	} catch (err) {
		// Decode failures (bad/corrupt string) surface here instead of crashing.
		console.warn(`[ImportPanel] import ${props.importType} failed:`, err);
		errorMsg.value = `Could not import that ${typeLabel.value} — the text may be invalid or corrupt.`;
	} finally {
		importing.value = false;
	}
}

function cancel(): void {
	emit("close");
}
</script>

<template>
	<div class="import-window ib-panel" :style="panelStyle">
		<p class="message">{{ message }}</p>

		<div class="link-area-wrap">
			<UTextarea v-model="linkText" class="link-area" :rows="12" placeholder="Paste encoded string here..." />
		</div>

		<p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

		<div class="actions">
			<IbButton family="orange" label="Import" class="action-btn" @click="doImport" />
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

.error-msg {
	margin: 0 0 10px;
	font-size: 11px;
	line-height: 1.3;
	text-align: center;
	color: #a11;
	max-width: 265px;
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
