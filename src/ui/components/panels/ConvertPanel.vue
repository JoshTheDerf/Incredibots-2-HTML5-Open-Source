<script setup lang="ts">
// Convert window — a port of the Jaybit ConvertWindow / ControllerMainMenu
// code<->file conversion (serialization-compat §4). Two directions, both of which
// are literally the core's base64 one-liners (no re-encode, no decode of the body):
//
//   Code -> File:  bytes = codeToFileBytes(code); download as .ibro/.ibre/.ibch
//                  (ControllerMainMenu.SaveToFileConvert: fileLoader.save(
//                   Database.ImportDecode(code), name+ext) — the file is the
//                   verbatim base64-decode of the code).
//   File -> Code:  if the file already holds an "eN…" text code, pass it through;
//                  otherwise code = fileBytesToCode(bytes) (plain base64)
//                  (loadConvertBrowseComplete: code = Database.ExportEncode(bytes)).
import { ref } from "vue";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";
import { codeToFileBytes, fileBytesToCode, sniffFileBytes } from "../../../core";
import { downloadBytes, saveFileName, readFileBytes, type IbFileType } from "../../fileIo";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

defineEmits<{ close: [] }>();

const TYPE_OPTIONS = [
	{ label: "Robot (.ibro)", value: "robot" },
	{ label: "Replay (.ibre)", value: "replay" },
	{ label: "Challenge (.ibch)", value: "challenge" },
];

// Code -> File
const codeIn = ref("");
const convertType = ref<IbFileType>("robot");
const codeError = ref("");

function codeToFile(): void {
	codeError.value = "";
	const code = codeIn.value.trim();
	if (code.length === 0) return;
	try {
		const bytes = codeToFileBytes(code);
		downloadBytes(bytes, saveFileName("", convertType.value));
	} catch (err) {
		console.warn("[ConvertPanel] code->file failed:", err);
		codeError.value = "That does not look like a valid code.";
	}
}

// File -> Code
const codeOut = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const fileError = ref("");

function pickFile(): void {
	fileInput.value?.click();
}

async function onFileChosen(event: Event): Promise<void> {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = "";
	if (!file) return;
	fileError.value = "";
	try {
		const bytes = await readFileBytes(file);
		// A file already containing an "eN…" text code is passed through unchanged;
		// a raw compressed blob is base64-encoded into the code.
		const sniffed = sniffFileBytes(bytes);
		codeOut.value = sniffed.kind === "code" ? sniffed.code : fileBytesToCode(bytes);
	} catch (err) {
		console.warn("[ConvertPanel] file->code failed:", err);
		fileError.value = "Could not read that file.";
	}
}

function copyOut(): void {
	if (codeOut.value.length === 0) return;
	if (navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(codeOut.value).catch(() => {});
	}
}
</script>

<template>
	<div class="convert-window ib-panel" :style="panelStyle">
		<p class="title">Convert</p>

		<!-- Code -> File -->
		<section class="section">
			<h3 class="section-title">Code &rarr; File</h3>
			<p class="hint">Paste an exported code, choose its type, then save it as a file.</p>
			<UTextarea
				v-model="codeIn"
				:ui="{ root: 'w-full', base: 'w-full' }"
				:rows="4"
				placeholder="Paste code here..."
				class="area"
			/>
			<div class="row">
				<USelectMenu v-model="convertType" :items="TYPE_OPTIONS" value-key="value" size="sm" class="type-select" />
				<IbButton family="orange" label="Save as File" @click="codeToFile" />
			</div>
			<p v-if="codeError" class="error-msg">{{ codeError }}</p>
		</section>

		<!-- File -> Code -->
		<section class="section">
			<h3 class="section-title">File &rarr; Code</h3>
			<p class="hint">Pick a file to see its code, then copy it.</p>
			<input ref="fileInput" type="file" accept=".ibro,.ibre,.ibch,.ibrt,.ibry,.txt" class="file-input" @change="onFileChosen" />
			<div class="row">
				<IbButton family="orange" label="Choose File..." @click="pickFile" />
				<IbButton family="orange" label="Copy Code" @click="copyOut" />
			</div>
			<UTextarea v-model="codeOut" :ui="{ root: 'w-full', base: 'w-full' }" :rows="4" readonly class="area" />
			<p v-if="fileError" class="error-msg">{{ fileError }}</p>
		</section>

		<div class="actions">
			<IbButton family="purple" label="Close" class="close-btn" @click="$emit('close')" />
		</div>
	</div>
</template>

<style scoped>
.convert-window {
	width: 320px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	font-family: Arial, Helvetica, sans-serif;
	padding: 10px 12px 8px;
}

.title {
	margin: 2px 0 8px;
	font-size: 16px;
	font-weight: bold;
	text-align: center;
	color: var(--ib-dark);
}

.section {
	margin-bottom: 10px;
}

.section-title {
	font-size: 13px;
	font-weight: bold;
	color: var(--ib-dark);
	margin: 0 0 3px;
}

.hint {
	font-size: 11px;
	line-height: 1.3;
	color: var(--ib-dark);
	margin: 0 0 5px;
}

.area :deep(textarea) {
	width: 100%;
	font-size: 10px;
	font-family: Arial, Helvetica, sans-serif;
	resize: none;
}

.row {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 6px 0;
}

.type-select {
	flex: 1;
}

.file-input {
	display: none;
}

.error-msg {
	margin: 4px 0 0;
	font-size: 11px;
	text-align: center;
	color: #a11;
}

.actions {
	display: flex;
	justify-content: center;
	margin-top: 4px;
}

.close-btn {
	width: 80px;
}
</style>
