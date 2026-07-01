<script setup lang="ts">
// Editor chrome frame — composes the top menu bar, tool palette, center
// stage placeholder, part inspector, and status bar around the Pinia
// binding to the headless GameCore. This is a structural frame, not a
// finished UI: the real Pixi canvas is not embedded, and several Commands
// are not yet migrated in GameCore (dispatch is a safe wrapper — see
// gameStore.ts).
import MenuBar from "./components/MenuBar.vue";
import ToolPalette from "./components/ToolPalette.vue";
import StagePlaceholder from "./components/StagePlaceholder.vue";
import PartInspectorFull from "./components/panels/PartInspectorFull.vue";
import StatusBar from "./components/StatusBar.vue";
</script>

<template>
	<UApp>
		<div class="editor-shell">
			<MenuBar />
			<ToolPalette />
			<div class="workspace">
				<StagePlaceholder />
				<PartInspectorFull />
			</div>
			<StatusBar />
		</div>
	</UApp>
</template>

<style scoped>
.editor-shell {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: #686d77;
	color: #fdf9ea;
	font-family: Arial, Helvetica, sans-serif;
}

.workspace {
	flex: 1;
	display: flex;
	min-height: 0;
}
</style>
