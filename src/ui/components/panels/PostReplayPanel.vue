<script setup lang="ts">
// Visual port of the legacy Gui/PostReplayWindow.ts (154x210/240 parchment
// window), shown after a replay finishes playing.
//
// Original buttons (all purple): "View Again!" (replay the same run again),
// "Load Replay", "Stop Replay" (rewind to start), "Rate this Replay" (only
// shown when ControllerGameGlobals.curReplayID is set — i.e. this was a
// server-loaded replay, not a local one), "Main Menu", "Close".
//
// GameCore has no replay-session concept yet (no curReplayID, no
// rateReplayButton/resetButton/loadReplayButton/rewindButton/newButton
// equivalents), so every action here is flagged with <IbTodo/> and only
// emits a local event.
import { computed } from "vue";
import IbButton from "../IbButton.vue";
import IbTodo from "../IbTodo.vue";
import { frameTextures } from "../../assets";

const panelStyle = { "--ib-panel-src": `url(${frameTextures.panelFrameCream})` };

const props = withDefaults(defineProps<{ hasReplayId?: boolean }>(), {
	// Placeholder stand-in for ControllerGameGlobals.curReplayID != "".
	hasReplayId: false,
});

const emit = defineEmits<{
	viewReplay: [];
	loadReplay: [];
	stopReplay: [];
	rate: [];
	mainMenu: [];
	close: [];
}>();

const panelHeight = computed(() => (props.hasReplayId ? 240 : 210));
</script>

<template>
	<div class="post-replay-window ib-panel" :style="[panelStyle, { height: panelHeight + 'px' }]">
		<div class="header">End of Replay</div>

		<div class="actions">
			<IbButton family="purple" label="View Again!" class="action-btn ib-todo" @click="emit('viewReplay')" />
			<IbButton family="purple" label="Load Replay" class="action-btn ib-todo" @click="emit('loadReplay')" />
			<IbButton family="purple" label="Stop Replay" class="action-btn ib-todo" @click="emit('stopReplay')" />
			<IbButton
				v-if="hasReplayId"
				family="purple"
				label="Rate this Replay"
				class="action-btn ib-todo"
				@click="emit('rate')"
			/>
			<IbButton family="purple" label="Main Menu" class="action-btn ib-todo" @click="emit('mainMenu')" />
			<IbButton family="purple" label="Close" class="action-btn" @click="emit('close')" />
		</div>

		<IbTodo label="replay session not wired" class="footer-flag" />
	</div>
</template>

<style scoped>
.post-replay-window {
	width: 154px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	font-family: Arial, Helvetica, sans-serif;
	padding: 6px 10px 4px;
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
	gap: 4px;
	width: 110px;
}

.action-btn {
	width: 110px;
	height: 35px;
	font-size: 11px;
}

.footer-flag {
	margin-top: 6px;
}
</style>
