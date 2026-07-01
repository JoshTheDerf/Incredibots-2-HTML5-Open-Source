<script setup lang="ts">
// Center stage — hosts the real Pixi game canvas (GameCanvas.vue). This is a
// CLEAN, borderless, full-bleed region: no frame or border of any kind, just
// the classic light-periwinkle play-area fill, with the canvas filling it
// edge-to-edge and resizing with its container.
import GameCanvas from "../GameCanvas.vue";
</script>

<template>
	<div class="stage-wrap">
		<div class="stage-inner">
			<GameCanvas />
		</div>
	</div>
</template>

<style scoped>
.stage-wrap {
	flex: 1;
	min-height: 0;
	min-width: 0;
	display: flex;
}

/* Fluid, borderless canvas region — the real Pixi canvas mounts here and
   fills the container edge-to-edge. Only a plain background fill, no frame. */
.stage-inner {
	flex: 1;
	min-height: 0;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 6px;
	/* The classic light-periwinkle play-area background. */
	background: #9ea2c2;
}

.stage-label {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 14px;
	font-weight: bold;
	color: #43366f;
}

.stage-dims {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 12px;
	color: #4c3d57;
}
</style>
