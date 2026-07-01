<script setup lang="ts">
// Visual port of the legacy Gui/LoadWindow.ts (154x290 parchment window) —
// the "Load What?" menu shown when the user clicks "Load" in the main bar.
//
// Original layout: header "Load What?", then six blue/orange buttons —
// "Load Robot" / "Load Replay" / "Load Challenge" (blue, DISABLED in the
// original because server-side saving/loading had already been shut down)
// and "Import Robot" / "Import Replay" / "Import Challenge" (orange, live —
// these open ImportWindow), then a "Cancel" (purple) button.
//
// Since the disabled Load buttons had no working destination even in the
// original, and the surrounding task calls for a loading/progress affordance,
// this panel also includes a progress bar standing in for an in-flight
// load/import operation. GameCore has no loadRobot(remote)/loadReplay/
// loadChallenge/importRobot/importReplay/importChallenge commands yet, so
// every action is flagged with <IbTodo/> and only emits a local event.
import IbButton from "../IbButton.vue";
import IbTodo from "../IbTodo.vue";
import { frameTextures } from "../../assets";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

const emit = defineEmits<{
	loadRobot: [];
	loadReplay: [];
	loadChallenge: [];
	importRobot: [];
	importReplay: [];
	importChallenge: [];
	cancel: [];
}>();

// Placeholder progress state for an in-flight load — stands in for a real
// loading/progress indicator until GameCore exposes async load status.
const loading = false;
const progress = 45;
</script>

<template>
	<div class="load-window ib-panel" :style="panelStyle">
		<div class="header">Load What?</div>

		<div class="actions">
			<IbButton family="blue" label="Load Robot" disabled class="action-btn ib-todo" @click="emit('loadRobot')" />
			<IbButton family="blue" label="Load Replay" disabled class="action-btn ib-todo" @click="emit('loadReplay')" />
			<IbButton
				family="blue"
				label="Load Challenge"
				disabled
				class="action-btn ib-todo"
				@click="emit('loadChallenge')"
			/>
			<IbButton family="orange" label="Import Robot" class="action-btn ib-todo" @click="emit('importRobot')" />
			<IbButton family="orange" label="Import Replay" class="action-btn ib-todo" @click="emit('importReplay')" />
			<IbButton
				family="orange"
				label="Import Challenge"
				class="action-btn ib-todo"
				@click="emit('importChallenge')"
			/>
		</div>

		<div v-if="loading" class="progress-wrap ib-todo">
			<UProgress :model-value="progress" size="sm" />
			<span class="progress-label">Loading...</span>
			<IbTodo label="progress not wired" />
		</div>

		<IbButton family="purple" label="Cancel" class="cancel-btn" @click="emit('cancel')" />
	</div>
</template>

<style scoped>
.load-window {
	width: 154px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	font-family: Arial, Helvetica, sans-serif;
	padding: 10px 7px 8px;
}

.header {
	font-size: 14px;
	font-weight: bold;
	text-align: center;
	color: var(--ib-dark);
	margin-bottom: 8px;
}

.actions {
	display: flex;
	flex-direction: column;
	gap: 3px;
	width: 140px;
}

.action-btn {
	width: 140px;
	height: 45px;
	font-size: 12px;
}

.progress-wrap {
	width: 140px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	margin-top: 8px;
	padding: 6px;
}

.progress-label {
	font-size: 10px;
	color: var(--ib-dark);
}

.cancel-btn {
	width: 90px;
	height: 35px;
	font-size: 11px;
	margin-top: 10px;
}
</style>
