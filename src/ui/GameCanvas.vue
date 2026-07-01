<script setup lang="ts">
// Minimal Pixi renderer mounted inside the editor stage. Editing-only (no
// physics yet): draws parts from GameCore state and turns pointer clicks into
// Commands per the tool contract (see docs/CONTRACT.md).
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Application } from "pixi.js";
import { useGameStore } from "./gameStore";
import { SceneRenderer, screenToWorld, hitTestPart } from "./renderer/sceneRenderer";
import type { ToolMode } from "../core";

const game = useGameStore();

const container = ref<HTMLDivElement | null>(null);

let app: Application | null = null;
let renderer: SceneRenderer | null = null;
let resizeObserver: ResizeObserver | null = null;

const toolToShapeKind: Partial<Record<ToolMode, "circle" | "rect" | "triangle">> = {
	newCircle: "circle",
	newRect: "rect",
	newTriangle: "triangle",
};

function onPointerDown(event: PointerEvent): void {
	if (!app || !container.value) return;
	const rect = container.value.getBoundingClientRect();
	const screenX = event.clientX - rect.left;
	const screenY = event.clientY - rect.top;
	const w = rect.width;
	const h = rect.height;

	const camera = game.camera;
	const world = screenToWorld(screenX, screenY, camera, w, h);

	const tool = game.edit.tool;
	const shapeKind = toolToShapeKind[tool as ToolMode];

	if (shapeKind) {
		game.dispatch({ type: "createShape", kind: shapeKind, x: world.x, y: world.y });
		return;
	}

	if (tool === "select") {
		const hit = hitTestPart(game.parts, world.x, world.y, camera.scale);
		if (hit) {
			game.dispatch({ type: "select", partIds: [hit.id] });
		} else {
			game.dispatch({ type: "clearSelection" });
		}
	}
}

onMounted(() => {
	if (!container.value) return;

	const w = container.value.clientWidth || 1;
	const h = container.value.clientHeight || 1;

	app = new Application({
		width: w,
		height: h,
		backgroundAlpha: 0,
		antialias: true,
		resolution: window.devicePixelRatio || 1,
		autoDensity: true,
	});

	container.value.appendChild(app.view as unknown as Node);
	(app.view as HTMLCanvasElement).style.display = "block";
	(app.view as HTMLCanvasElement).style.width = "100%";
	(app.view as HTMLCanvasElement).style.height = "100%";

	renderer = new SceneRenderer(app, () => game.state);

	container.value.addEventListener("pointerdown", onPointerDown);

	resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			const cw = Math.max(1, Math.floor(entry.contentRect.width));
			const ch = Math.max(1, Math.floor(entry.contentRect.height));
			app?.renderer.resize(cw, ch);
		}
	});
	resizeObserver.observe(container.value);
});

onBeforeUnmount(() => {
	if (container.value) container.value.removeEventListener("pointerdown", onPointerDown);
	resizeObserver?.disconnect();
	resizeObserver = null;
	renderer?.destroy();
	renderer = null;
	if (app) {
		app.destroy(true, { children: true });
		app = null;
	}
});
</script>

<template>
	<div ref="container" class="game-canvas-host" />
</template>

<style scoped>
.game-canvas-host {
	flex: 1;
	min-width: 0;
	min-height: 0;
	width: 100%;
	height: 100%;
	position: relative;
	overflow: hidden;
	touch-action: none;
}
</style>
