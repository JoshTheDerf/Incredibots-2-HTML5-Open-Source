<script setup lang="ts">
// Center stage — placeholder for where the Pixi game canvas will mount.
// Deliberately NOT embedding the real game here. This is a CLEAN, borderless,
// full-bleed region: no frame or border of any kind, just the classic
// light-periwinkle play-area fill, so the real canvas can later fill it
// edge-to-edge and resize with its container.
</script>

<template>
	<div class="stage-wrap">
		<div class="stage-inner">
			<span class="stage-label">Pixi game canvas mounts here</span>
			<span class="stage-dims">fills available space</span>
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
