<script setup lang="ts">
// Pixi renderer mounted inside the editor stage. Drawing is delegated to the
// ORIGINAL renderer (src/Game/Draw.ts, a b2DebugDraw subclass) so shapes get
// their real look — fills, outlines, colours, joints, selection highlight,
// text, challenge zones — in both the pre-sim (edit) and running (body) states.
//
// Pointer clicks are still turned into Commands per the tool contract; the full
// MouseDrag/rotate/resize interaction port is a separate follow-up.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Application, Graphics } from "pixi.js";
import { Draw } from "../Game/Draw";
import { useGameStore } from "./gameStore";
import { screenToWorld, hitTestPart } from "./renderer/sceneRenderer";
import type { ToolMode } from "../core";
import type { Part } from "../Parts/Part";

const game = useGameStore();

const container = ref<HTMLDivElement | null>(null);

let app: Application | null = null;
let draw: Draw | null = null;
let drawSprite: Graphics | null = null;
let resizeObserver: ResizeObserver | null = null;
let tickerFn: (() => void) | null = null;

const toolToShapeKind: Partial<Record<ToolMode, "circle" | "rect" | "triangle">> = {
	newCircle: "circle",
	newRect: "rect",
	newTriangle: "triangle",
};

function onPointerDown(event: PointerEvent): void {
	if (!app || !container.value) return;
	// Editing is disabled while the simulation runs (matches ControllerGame).
	if (game.sim.phase !== "editing") return;

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

/** Draw a single frame via the original Draw renderer. */
function drawFrame(): void {
	if (!app || !draw) return;
	const state = game.state;

	// While running, advance the physics world one frame before drawing so the
	// bodies Draw reads are up to date. Capped at the ticker's ~60fps.
	if (state.sim.phase === "running") {
		game.dispatch({ type: "step" });
	}

	const w = app.renderer.width / app.renderer.resolution;
	const h = app.renderer.height / app.renderer.resolution;

	// Draw's screen transform is `worldX * m_drawScale - m_drawXOff` (no implicit
	// canvas-center offset). To centre the world origin the way the editor camera
	// expects — screen = canvas/2 + world*scale - offset — set the offsets so the
	// two transforms are identical. This keeps hit-testing (screenToWorld, which
	// uses the canvas/2 convention) aligned with what Draw paints.
	const camera = state.camera;
	draw.m_drawScale = camera.scale;
	draw.m_drawXOff = camera.offsetX - w / 2;
	draw.m_drawYOff = camera.offsetY - h / 2;
	draw.drawColours = true;

	// Map selection ids -> live Part instances for highlight.
	const selected = new Set(state.edit.selection);
	const selectedParts: Part[] = state.parts.filter((p) => selected.has(p.id));

	const notStarted = state.sim.phase !== "running";
	// DrawWorld(allParts, selectedParts, world, notStarted, drawStatic,
	//           showJoints, showOutlines, challenge)  — see Draw.ts:75.
	draw.DrawWorld(
		state.parts as Part[],
		selectedParts,
		state.world,
		notStarted,
		/* drawStatic */ true,
		/* showJoints */ true,
		/* showOutlines */ true,
		/* challenge */ undefined as any
	);
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

	// The Graphics that Draw paints into (its m_sprite). Draw's text containers
	// attach relative to this sprite's parent, so it must live on the stage.
	drawSprite = new Graphics();
	app.stage.addChild(drawSprite);
	draw = new Draw();
	draw.m_sprite = drawSprite;

	tickerFn = () => drawFrame();
	app.ticker.add(tickerFn);

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
	if (app && tickerFn) app.ticker.remove(tickerFn);
	tickerFn = null;
	draw = null;
	drawSprite = null;
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
