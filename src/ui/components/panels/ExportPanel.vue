<script setup lang="ts">
// Visual port of the legacy Gui/ExportWindow.ts (312x434 parchment window).
// Original: a shutdown-notice message, a read-mostly text area pre-filled
// with the encoded export string (select-on-focus), a "Copy to Clipboard"
// (orange) button that does textInput.select() + document.execCommand("copy"),
// and an "OK" (purple) close button.
//
// This is a LIVE feature — on open we ask GameCore (via the store) to encode
// the current robot to the legacy-compatible export string and show it; the
// "Copy to Clipboard" button copies it.
import { ref, onMounted } from "vue";
import IbButton from "../IbButton.vue";
import { frameTextures } from "../../assets";
import { useGameStore } from "../../gameStore";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

const props = withDefaults(defineProps<{ exportStr?: string; robotStr?: string }>(), {
	exportStr: "",
	robotStr: "robot",
});

const emit = defineEmits<{ close: [] }>();

const game = useGameStore();
const linkText = ref(props.exportStr);
const textareaRef = ref<{ textareaRef?: HTMLTextAreaElement } | null>(null);

onMounted(async () => {
	try {
		linkText.value = await game.exportRobot();
	} catch (err) {
		linkText.value = "";
		console.warn("[ExportPanel] exportRobot failed:", err);
	}
});

function copyButtonPressed(): void {
	// Select the text area and copy. Prefer the async clipboard API, falling
	// back to the legacy execCommand("copy") path.
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

function ok(): void {
	emit("close");
}
</script>

<template>
	<div class="export-window ib-panel" :style="panelStyle">
		<p class="message">
			The IncrediBots servers are going to be shut down
			soon, thus saving to the servers has been disabled.

			Instead, you may export your {{ robotStr }} to a file.
			To do so, copy and paste the text below into a file;
			it can be restored by clicking "Load," then "Import."

			NOTE: Make sure to do this with all of your
			important robots, replays, and challenges, as
			soon this will be the only way to access them!
		</p>

		<div class="link-area-wrap">
			<UTextarea ref="textareaRef" v-model="linkText" class="link-area" :rows="9" readonly />
		</div>

		<div class="actions">
			<IbButton family="orange" label="Copy to Clipboard" class="action-btn copy-btn" @click="copyButtonPressed" />
			<IbButton family="purple" label="OK" class="action-btn ok-btn" @click="ok" />
		</div>
	</div>
</template>

<style scoped>
.export-window {
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
	margin: 4px 0 10px;
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
	height: 160px;
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

.copy-btn {
	width: 140px;
}

.ok-btn {
	width: 50px;
}
</style>
