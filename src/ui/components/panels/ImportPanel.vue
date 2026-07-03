<script setup lang="ts">
// Load / Import window — a port of Gui/ImportWindow.ts (paste an exported CODE
// and Import) extended with Jaybit's "Load from File" (.ibro/.ibre/.ibch) path
// and the "Import And Insert" variant (robot only).
//
// Paste path: the pasted string is decoded by GameCore (via the store), branching
// on the window type (robot -> importRobot, replay -> importReplay, challenge ->
// importChallenge; ImportWindow.doImport ImportWindow.as:64-75). The `insert`
// flag routes a robot import to importRobotInsert (APPEND, not replace).
//
// File path: the picked file's bytes go to importRobotFile/importChallengeFile/
// importReplayFile — the core sniffs the "eN" prefix and routes raw-blob vs
// pasted-text-code files itself (serialization-compat §3), so the UI just hands
// over the raw bytes.
import { ref, computed } from "vue";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";
import { useGameStore } from "../../gameStore";
import { readFileBytes, fileAccept, type IbFileType } from "../../fileIo";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

type ImportType = "robot" | "replay" | "challenge";

const props = withDefaults(defineProps<{ importType?: ImportType; insert?: boolean }>(), {
	importType: "robot",
	insert: false,
});

const emit = defineEmits<{ close: []; imported: [] }>();

const game = useGameStore();
const linkText = ref("");
const errorMsg = ref("");
const importing = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const typeLabel = computed(() => props.importType);
const title = computed(() => (props.insert ? "Import And Insert" : `Load ${typeLabel.value}`));

const message = computed(
	() =>
		props.insert
			? `Paste an exported robot below and press "Import" to INSERT\nits parts into your current robot, or load one from a file.`
			: `Copy and paste the text you got from exporting\nyour ${typeLabel.value} below then press "Import," or load a file.`,
);

/** Route a decoded CODE string to the right store import (honouring `insert`). */
async function importCode(code: string): Promise<void> {
	if (props.importType === "replay") {
		await game.importReplay(code);
	} else if (props.importType === "challenge") {
		await game.importChallenge(code);
	} else if (props.insert) {
		await game.importRobotInsert(code);
	} else {
		await game.importRobot(code);
	}
}

/** Route picked FILE bytes to the right store file-import (honouring `insert`). */
async function importBytes(bytes: Uint8Array): Promise<void> {
	if (props.importType === "replay") {
		await game.importReplayFile(bytes);
	} else if (props.importType === "challenge") {
		await game.importChallengeFile(bytes);
	} else if (props.insert) {
		await game.importRobotFileInsert(bytes);
	} else {
		await game.importRobotFile(bytes);
	}
}

async function doImport(): Promise<void> {
	if (linkText.value.trim().length === 0 || importing.value) return;
	errorMsg.value = "";
	importing.value = true;
	try {
		await importCode(linkText.value.trim());
		emit("imported");
		emit("close");
	} catch (err) {
		console.warn(`[ImportPanel] import ${props.importType} failed:`, err);
		errorMsg.value = `Could not import that ${typeLabel.value} — the text may be invalid or corrupt.`;
	} finally {
		importing.value = false;
	}
}

function pickFile(): void {
	fileInput.value?.click();
}

async function onFileChosen(event: Event): Promise<void> {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	// Reset so re-picking the same file fires change again.
	input.value = "";
	if (!file || importing.value) return;
	errorMsg.value = "";
	importing.value = true;
	try {
		const bytes = await readFileBytes(file);
		await importBytes(bytes);
		emit("imported");
		emit("close");
	} catch (err) {
		console.warn(`[ImportPanel] load ${props.importType} file failed:`, err);
		errorMsg.value = `Could not load that file — it may be invalid or corrupt.`;
	} finally {
		importing.value = false;
	}
}

const accept = computed(() => fileAccept(props.importType as IbFileType));

function cancel(): void {
	emit("close");
}
</script>

<template>
	<div class="import-window ib-panel" :style="panelStyle">
		<p class="title">{{ title }}</p>
		<p class="message">{{ message }}</p>

		<div class="link-area-wrap">
			<UTextarea
				v-model="linkText"
				class="link-area"
				:ui="{ root: 'w-full', base: 'w-full' }"
				:rows="10"
				placeholder="Paste encoded string here..."
			/>
		</div>

		<p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

		<!-- Hidden native file input driven by the Load from File button. -->
		<input ref="fileInput" type="file" :accept="accept" class="file-input" @change="onFileChosen" />

		<div class="actions">
			<IbButton family="orange" label="Import" class="action-btn" @click="doImport" />
			<IbButton family="orange" label="Load from File" class="action-btn wide" @click="pickFile" />
			<IbButton family="purple" label="Cancel" class="action-btn" @click="cancel" />
		</div>
	</div>
</template>

<style scoped>
.import-window {
	width: 312px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	font-family: Arial, Helvetica, sans-serif;
	padding: 10px 8px 6px;
}

.title {
	margin: 2px 0 6px;
	font-size: 16px;
	font-weight: bold;
	text-align: center;
	color: var(--ib-dark);
}

.message {
	margin: 0 0 10px;
	font-size: 12px;
	line-height: 1.4;
	text-align: center;
	color: var(--ib-dark);
	white-space: pre-line;
}

.link-area-wrap {
	position: relative;
	width: 100%;
	margin-bottom: 12px;
}

.link-area-wrap :deep(textarea) {
	width: 100%;
	height: 210px;
	font-size: 10px;
	font-family: Arial, Helvetica, sans-serif;
	resize: none;
}

.error-msg {
	margin: 0 0 10px;
	font-size: 11px;
	line-height: 1.3;
	text-align: center;
	color: #a11;
	max-width: 265px;
}

.file-input {
	display: none;
}

.actions {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
}

.action-btn {
	width: 110px;
}

.action-btn.wide {
	width: 140px;
}
</style>
