<script setup lang="ts">
// Pixi renderer mounted inside the editor stage. Drawing is delegated to the
// ORIGINAL renderer (src/Game/Draw.ts, a b2DebugDraw subclass) so shapes get
// their real look — fills, outlines, colours, joints, selection highlight,
// text, challenge zones — in both the pre-sim (edit) and running (body) states.
//
// Mouse INTERACTION (click-select, shift multi-select, drag-to-move, marquee
// box-select) is ported here from ControllerGame's MouseDrag()/mouseClick()
// (ControllerGame.ts:1254 / :1991) but re-expressed as pointer events driving
// the GameCore command layer instead of mutating parts directly.
//
// DEFERRED: rotate & resize gestures. ControllerGame handles those in the same
// MouseDrag() (rotatingPart branch ~:1527, RESIZING_SHAPES ~:1620), but the
// matching GameCore handlers (rotateParts/resizeParts) currently throw, so
// those interactions are a follow-up once those command handlers land.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Application, Graphics } from "pixi.js";
import { Draw } from "../Game/Draw";
import { useGameStore } from "./gameStore";
import { screenToWorld, worldToScreen, hitTestPart, partsInBox } from "./renderer/sceneRenderer";
import type { ToolMode } from "../core";
import type { Part } from "../Parts/Part";

const game = useGameStore();

const container = ref<HTMLDivElement | null>(null);

let app: Application | null = null;
let draw: Draw | null = null;
let drawSprite: Graphics | null = null;
// Lightweight overlay Graphics for the marquee rectangle — kept separate from
// the Draw sprite so it never fights Draw.ts's per-frame clear/repaint.
let overlay: Graphics | null = null;
let resizeObserver: ResizeObserver | null = null;
let tickerFn: (() => void) | null = null;

// --- interaction state -----------------------------------------------------
// A gesture begins on pointer-down and ends on pointer-up. Exactly one of
// `dragging` / `marquee` is active at a time.
type Gesture =
	| { kind: "none" }
	// Drag the current selection. `lastWorld` tracks the cursor position at the
	// previous move so we can dispatch moveParts with the incremental delta
	// (world units) — matching ControllerGame's per-frame Part.Move to
	// mouseWorld - dragOff (ControllerGame.ts:1517).
	| { kind: "drag"; lastWorld: { x: number; y: number } }
	// Marquee box-select. `origin` is the world-space anchor (first corner).
	| { kind: "marquee"; origin: { x: number; y: number }; current: { x: number; y: number } };

let gesture: Gesture = { kind: "none" };

const toolToShapeKind: Partial<Record<ToolMode, "circle" | "rect" | "triangle">> = {
	newCircle: "circle",
	newRect: "rect",
	newTriangle: "triangle",
};

/** Canvas-relative screen coords + current canvas size for an event. */
function screenOf(event: PointerEvent): { x: number; y: number; w: number; h: number } {
	const rect = container.value!.getBoundingClientRect();
	return {
		x: event.clientX - rect.left,
		y: event.clientY - rect.top,
		w: rect.width,
		h: rect.height,
	};
}

function onPointerDown(event: PointerEvent): void {
	if (!app || !container.value) return;
	// Editing is disabled while the simulation runs (matches ControllerGame's
	// `if (!this.simStarted)` guard around MouseDrag, ControllerGame.ts:1255).
	if (game.sim.phase !== "editing") return;

	const s = screenOf(event);
	const camera = game.camera;
	const world = screenToWorld(s.x, s.y, camera, s.w, s.h);

	const tool = game.edit.tool;
	const shapeKind = toolToShapeKind[tool as ToolMode];

	// A "new*" shape tool places a shape on press, as before.
	if (shapeKind) {
		game.dispatch({ type: "createShape", kind: shapeKind, x: world.x, y: world.y });
		return;
	}

	if (tool !== "select") return;

	const additive = event.shiftKey || event.ctrlKey || event.metaKey;
	const hit = hitTestPart(game.parts, world.x, world.y, camera.scale);
	const selection = game.edit.selection;

	if (hit) {
		// Pointer-down on a part. ControllerGame.ts:1289-1302: if the part is
		// already selected, keep the whole selection and just start dragging;
		// with shift held, toggle it into the selection; otherwise select it
		// alone. Then begin a drag of the (now) selected parts.
		const alreadySelected = selection.includes(hit.id);
		if (additive) {
			// Additive add. (De-selecting a shift-clicked selected part — the
			// Util.RemoveFromArray branch at :1298 — needs a remove/toggle that
			// the `select` command can't express additively; treated as add.)
			game.dispatch({ type: "select", partIds: [hit.id], additive: true });
		} else if (!alreadySelected) {
			game.dispatch({ type: "select", partIds: [hit.id] });
		}
		// Begin dragging. Delta is measured incrementally from here.
		gesture = { kind: "drag", lastWorld: { x: world.x, y: world.y } };
		container.value.setPointerCapture(event.pointerId);
		return;
	}

	// Pointer-down on empty space. ControllerGame.ts:1466-1486: clears the
	// selection; a marquee box-select begins (the original gated this behind
	// shift; here empty-drag always marquees, matching the spec).
	if (!additive) game.dispatch({ type: "clearSelection" });
	gesture = { kind: "marquee", origin: { x: world.x, y: world.y }, current: { x: world.x, y: world.y } };
	container.value.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
	if (!app || !container.value) return;
	if (gesture.kind === "none") return;
	if (game.sim.phase !== "editing") return;

	const s = screenOf(event);
	const world = screenToWorld(s.x, s.y, game.camera, s.w, s.h);

	if (gesture.kind === "drag") {
		// Incremental world-space delta since the last move. moveParts is
		// relative (adds dx/dy to each part's current position), so feeding it
		// the per-move delta keeps the selection tracking the cursor 1:1 —
		// equivalent to ControllerGame's Part.Move(mouseWorld - dragOff) at
		// :1517. Skip zero-delta moves to avoid redundant dispatches.
		const dx = world.x - gesture.lastWorld.x;
		const dy = world.y - gesture.lastWorld.y;
		if (dx !== 0 || dy !== 0) {
			const partIds = [...game.edit.selection];
			if (partIds.length > 0) {
				game.dispatch({ type: "moveParts", partIds, dx, dy });
			}
			gesture.lastWorld = { x: world.x, y: world.y };
		}
		return;
	}

	if (gesture.kind === "marquee") {
		gesture.current = { x: world.x, y: world.y };
		drawMarquee();
	}
}

function onPointerUp(event: PointerEvent): void {
	if (!container.value) return;
	if (gesture.kind === "marquee") {
		// Select every part intersecting the marquee box, in a single select
		// dispatch. Mirrors ControllerGame.ts:2407 (BOX_SELECTING on up).
		const { origin, current } = gesture;
		const hits = partsInBox(game.parts, origin.x, origin.y, current.x, current.y);
		if (hits.length > 0) {
			game.dispatch({ type: "select", partIds: hits.map((p) => p.id) });
		}
		clearMarquee();
	}
	gesture = { kind: "none" };
	try {
		container.value.releasePointerCapture(event.pointerId);
	} catch {
		// pointer may not have been captured; ignore.
	}
}

/** Paint the marquee rectangle into the overlay (world -> screen each frame). */
function drawMarquee(): void {
	if (!overlay || !app || gesture.kind !== "marquee" || !container.value) return;
	const rect = container.value.getBoundingClientRect();
	const cam = game.camera;
	const a = worldToScreen(gesture.origin.x, gesture.origin.y, cam, rect.width, rect.height);
	const b = worldToScreen(gesture.current.x, gesture.current.y, cam, rect.width, rect.height);
	const x = Math.min(a.x, b.x);
	const y = Math.min(a.y, b.y);
	const w = Math.abs(a.x - b.x);
	const h = Math.abs(a.y - b.y);
	overlay.clear();
	overlay.lineStyle(1, 0x3399ff, 0.9);
	overlay.beginFill(0x3399ff, 0.12);
	overlay.drawRect(x, y, w, h);
	overlay.endFill();
}

function clearMarquee(): void {
	overlay?.clear();
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

	// Marquee overlay lives above the Draw sprite; Draw never touches it.
	overlay = new Graphics();
	app.stage.addChild(overlay);

	tickerFn = () => drawFrame();
	app.ticker.add(tickerFn);

	container.value.addEventListener("pointerdown", onPointerDown);
	container.value.addEventListener("pointermove", onPointerMove);
	container.value.addEventListener("pointerup", onPointerUp);
	container.value.addEventListener("pointercancel", onPointerUp);

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
	if (container.value) {
		container.value.removeEventListener("pointerdown", onPointerDown);
		container.value.removeEventListener("pointermove", onPointerMove);
		container.value.removeEventListener("pointerup", onPointerUp);
		container.value.removeEventListener("pointercancel", onPointerUp);
	}
	resizeObserver?.disconnect();
	resizeObserver = null;
	if (app && tickerFn) app.ticker.remove(tickerFn);
	tickerFn = null;
	draw = null;
	drawSprite = null;
	overlay = null;
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
