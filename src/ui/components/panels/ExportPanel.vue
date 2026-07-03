<script setup lang="ts">
// Save / Export window — a fold of the legacy Gui/SaveWindow.ts (name + desc +
// exposure combo + Save/Export) and Gui/ExportWindow.ts (the read-only code
// textarea + "Copy to Clipboard"). Since the IncrediBots servers are gone,
// server "Save" is dead; what remains is exporting a CODE (copy to clipboard)
// and saving to a FILE (.ibro/.ibre/.ibch download).
//
// The exposure combo mirrors SaveWindow's 5 values (SaveWindow.as:19-27), mapped
// to the EXPO_* constants and passed to export*(name, desc, expo). Picking an
// "Uneditable" option warns the user (Jaybit warned that uneditable saves can't
// be edited after loading).
//
// This is a LIVE feature: name/desc/exposure changes re-encode via GameCore (the
// store) and the resulting CODE is the single source of truth — the FILE is the
// byte-identical base64-decode of that code (serialization-compat §3).
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";
import { useGameStore } from "../../gameStore";
import { codeToFileBytes } from "../../../core";
import {
	EXPO_PUBLIC_UNEDITABLE,
	EXPO_PUBLIC_EDITABLE,
	EXPO_PRIVATE_UNEDITABLE,
	EXPO_PRIVATE_EDITABLE,
	EXPO_PRIVATE_NOSHARE,
} from "../../../core";
import { downloadBytes, saveFileName, type IbFileType } from "../../fileIo";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

const props = withDefaults(defineProps<{ exportStr?: string; robotStr?: string }>(), {
	exportStr: "",
	robotStr: "robot",
});

const emit = defineEmits<{ close: [] }>();

const game = useGameStore();

// Which save type this modal is exporting (robotStr === "replay"/"challenge"/robot).
const fileType = computed<IbFileType>(() =>
	props.robotStr === "replay" ? "replay" : props.robotStr === "challenge" ? "challenge" : "robot",
);
const typeLabel = computed(() => fileType.value);

// Save options (SaveWindow name/desc/expo). Defaults: empty name/desc, Public+Editable.
const name = ref("");
const desc = ref("");
const expo = ref<number>(EXPO_PUBLIC_EDITABLE);

// The 5 SaveWindow exposure combo values, in SaveWindow.as combo order (index ==
// the EXPO_* constant).
const EXPO_OPTIONS = [
	{ label: "Public, Uneditable", value: EXPO_PUBLIC_UNEDITABLE },
	{ label: "Public, Editable", value: EXPO_PUBLIC_EDITABLE },
	{ label: "Private, Uneditable", value: EXPO_PRIVATE_UNEDITABLE },
	{ label: "Private, Editable", value: EXPO_PRIVATE_EDITABLE },
	{ label: "Private, Unshareable", value: EXPO_PRIVATE_NOSHARE },
];

// Uneditable warning (Public/Private Uneditable): the loaded robot can't be edited.
const isUneditable = computed(() => expo.value === EXPO_PUBLIC_UNEDITABLE || expo.value === EXPO_PRIVATE_UNEDITABLE);

const linkText = ref(props.exportStr);
const errorMsg = ref("");
const textareaRef = ref<{ textareaRef?: HTMLTextAreaElement } | null>(null);

// Re-encode the export CODE from the current name/desc/expo. "replay" exports the
// recorded replay (+ its robot); "challenge" the live challenge session; else the
// robot. null (no recording / no challenge) shows as empty.
//
// Encoding is async (zlib compression), so concurrent regenerations can resolve
// out of order — a monotonically increasing token lets only the LATEST request
// land in linkText.
let encodeToken = 0;
async function regenerate(): Promise<void> {
	const token = ++encodeToken;
	try {
		let next: string;
		if (props.robotStr === "replay") {
			next = (await game.exportReplayString({ name: name.value, desc: desc.value, expo: expo.value })) ?? "";
		} else if (props.robotStr === "challenge") {
			next = (await game.exportChallengeString(name.value, desc.value, expo.value)) ?? "";
		} else {
			next = await game.exportRobot(name.value, desc.value, expo.value);
		}
		if (token !== encodeToken) return; // stale result — a newer encode is in flight
		errorMsg.value = "";
		linkText.value = next;
	} catch (err) {
		if (token !== encodeToken) return;
		linkText.value = "";
		console.warn("[ExportPanel] export failed:", err);
		errorMsg.value = `Could not export this ${typeLabel.value}.`;
	}
}

onMounted(regenerate);
// Re-encode when a save option changes (the code embeds name/desc/expo) —
// debounced so per-keystroke edits don't churn a full compress each.
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
watch([name, desc, expo], () => {
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => void regenerate(), 300);
});
onUnmounted(() => clearTimeout(debounceTimer));

function copyButtonPressed(): void {
	// Tutorial milestone (ControllerHomeMovies.copyButton -> 45 "copied"): fires
	// on the actual COPY action, not on every re-encode.
	game.notifyCodeCopied();
	const el = (textareaRef.value as unknown as { $el?: HTMLElement })?.$el?.querySelector("textarea");
	el?.select();
	if (navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(linkText.value).catch(() => {
			try {
				document.execCommand("copy");
			} catch {
				/* best-effort */
			}
		});
		return;
	}
	try {
		document.execCommand("copy");
	} catch {
		/* best-effort, matches legacy fallback-less behavior */
	}
}

// Save to File: the FILE is the byte-identical base64-decode of the CODE
// (serialization-compat §3), so we derive it from linkText and download it with
// the sanitized filename + extension.
function saveToFile(): void {
	if (linkText.value.trim().length === 0) return;
	try {
		const bytes = codeToFileBytes(linkText.value.trim());
		downloadBytes(bytes, saveFileName(name.value, fileType.value));
	} catch (err) {
		console.warn("[ExportPanel] save to file failed:", err);
		errorMsg.value = "Could not save that file.";
	}
}

function ok(): void {
	emit("close");
}
</script>

<template>
	<div class="export-window ib-panel" :style="panelStyle">
		<p class="title">Saving {{ typeLabel }}</p>

		<div class="field">
			<label class="field-label">{{ typeLabel }} name</label>
			<UInput v-model="name" size="sm" maxlength="150" :ui="{ root: 'w-full', base: 'w-full' }" />
		</div>

		<div class="field">
			<label class="field-label">Description</label>
			<UTextarea v-model="desc" :rows="2" :ui="{ root: 'w-full', base: 'w-full' }" class="desc-area" />
		</div>

		<div class="field">
			<label class="field-label">Sharing</label>
			<USelectMenu v-model="expo" :items="EXPO_OPTIONS" value-key="value" size="sm" class="expo-select" />
		</div>

		<p v-if="isUneditable" class="warn-msg">
			Warning: an "Uneditable" {{ typeLabel }} cannot be edited after it is loaded.
		</p>

		<div class="link-area-wrap">
			<UTextarea
				ref="textareaRef"
				v-model="linkText"
				class="link-area"
				:ui="{ root: 'w-full', base: 'w-full' }"
				:rows="6"
				readonly
			/>
		</div>

		<p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

		<div class="actions">
			<IbButton family="orange" label="Copy to Clipboard" class="action-btn copy-btn" @click="copyButtonPressed" />
			<IbButton family="orange" label="Save to File" class="action-btn copy-btn" @click="saveToFile" />
			<IbButton family="purple" label="OK" class="action-btn ok-btn" @click="ok" />
		</div>
	</div>
</template>

<style scoped>
.export-window {
	width: 312px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	font-family: Arial, Helvetica, sans-serif;
	padding: 10px 12px 6px;
}

.title {
	margin: 2px 0 10px;
	font-size: 16px;
	font-weight: bold;
	text-align: center;
	color: var(--ib-dark);
}

.field {
	display: flex;
	flex-direction: column;
	margin-bottom: 8px;
}

.field-label {
	font-size: 11px;
	font-weight: bold;
	color: var(--ib-dark);
	margin-bottom: 3px;
}

.desc-area :deep(textarea) {
	resize: none;
	font-size: 11px;
	font-family: Arial, Helvetica, sans-serif;
}

.expo-select {
	width: 100%;
}

.warn-msg {
	margin: 0 0 8px;
	font-size: 11px;
	line-height: 1.3;
	text-align: center;
	color: #a2600b;
}

.link-area-wrap {
	position: relative;
	width: 100%;
	margin-bottom: 10px;
}

.link-area-wrap :deep(textarea) {
	width: 100%;
	height: 96px;
	font-size: 10px;
	font-family: Arial, Helvetica, sans-serif;
	resize: none;
}

.error-msg {
	margin: 0 0 8px;
	font-size: 11px;
	line-height: 1.3;
	text-align: center;
	color: #a11;
}

.actions {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
}

.copy-btn {
	width: 150px;
}

.ok-btn {
	width: 60px;
}
</style>
