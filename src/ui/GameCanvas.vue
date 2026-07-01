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
// Rotate & resize gestures are ported here from ControllerGame's MouseDrag()
// (rotatingPart branch ~:1527, RESIZING_SHAPES ~:1620): with the Rotate/Resize
// tool active and a selection present, a pointer-drag reads the cursor's
// angle/distance about the selection centroid and dispatches the incremental
// rotateParts/resizeParts delta to the core. Creation tools (joints, thrusters,
// cannon, text) place their part on pointer-down via the matching create*
// command (ControllerGame.mouseClick MaybeCreate* dispatch, :2389-2510).
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Application, Graphics } from "pixi.js";
import { Draw } from "../Game/Draw";
import { ControllerGameGlobals } from "../Game/Globals/ControllerGameGlobals";
import { Triangle } from "../Parts/Triangle";
import { useGameStore } from "./gameStore";
import { screenToWorld, worldToScreen, hitTestPart, partsInBox } from "./renderer/sceneRenderer";
import type { ToolMode } from "../core";
import type { Part } from "../Parts/Part";

type ShapeKind = "circle" | "rect" | "triangle";

// Map a shape kind to the Draw.DrawTempShape `creatingItem` code so the in-
// progress preview uses the ORIGINAL renderer's look (fills, outline, default
// colour). Values mirror ControllerGameGlobals.NEW_CIRCLE/NEW_RECT/NEW_TRIANGLE.
const shapeKindToCreatingItem: Record<ShapeKind, number> = {
	circle: ControllerGameGlobals.NEW_CIRCLE,
	rect: ControllerGameGlobals.NEW_RECT,
	triangle: ControllerGameGlobals.NEW_TRIANGLE,
};

const game = useGameStore();

// Cancel an in-progress triangle (base committed, apex not yet placed) whenever
// the tool changes or the sim leaves editing — mirrors ControllerGame resetting
// curAction/actionStep when a new tool button is pressed.
watch(
	() => [game.edit.tool, game.sim.phase],
	() => {
		triangleBase = null;
	},
);

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
	// Rotate the selection. `pivot` is the selection centroid (screen px); we
	// track the cursor's last angle about it and dispatch the incremental delta,
	// mirroring ControllerGame's ROTATE branch which reads the mouse angle from
	// the part centre (ControllerGame.ts:1528).
	| { kind: "rotate"; pivot: { x: number; y: number }; lastAngle: number }
	// Resize the selection. `pivot` is the selection centroid (screen px); we
	// track the cursor's last distance from it and dispatch the incremental
	// scale ratio, mirroring ControllerGame's RESIZING_SHAPES distance-driven
	// scale (ControllerGame.ts:1558).
	| { kind: "resize"; pivot: { x: number; y: number }; lastDist: number }
	// Marquee box-select. `origin` is the world-space anchor (first corner).
	| { kind: "marquee"; origin: { x: number; y: number }; current: { x: number; y: number } }
	// Create a Circle/Rectangle/Triangle by dragging. `start` is the press point
	// (world), `current` the live cursor point. Ports ControllerGame's
	// NEW_CIRCLE/NEW_RECT/NEW_TRIANGLE press-drag-release (mouseClick :2190-2380);
	// pointer-move repaints the preview via Draw.DrawTempShape and pointer-up
	// dispatches createShape with the final geometry.
	| { kind: "create"; shape: ShapeKind; start: { x: number; y: number }; current: { x: number; y: number } };

let gesture: Gesture = { kind: "none" };

// Triangle is a TWO-STEP gesture in the original (ControllerGame :2282): the
// first press-drag-release fixes the BASE edge (v1→v2, length-clamped), then a
// second click places the APEX (v3). Between those two the base is committed
// here while the apex tracks the cursor for a live preview. Null when no
// triangle is mid-construction.
let triangleBase: { v1: { x: number; y: number }; v2: { x: number; y: number } } | null = null;
// Last known cursor position in world units — drives the triangle apex preview
// while `triangleBase` is set (the cursor moves with no button held down).
let pointerWorld: { x: number; y: number } | null = null;

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

/**
 * Screen-space centroid of the current selection's anchors. Matches the pivot
 * the GameCore rotate/resize handlers use (the mean of the parts' centres), so
 * the gesture reads angle/distance about the same point the core rotates around.
 * Returns null if nothing is selected.
 */
function selectionCentroidScreen(canvasW: number, canvasH: number): { x: number; y: number } | null {
	const sel = new Set(game.edit.selection);
	const parts = game.parts.filter((p) => sel.has(p.id));
	if (parts.length === 0) return null;
	let wx = 0;
	let wy = 0;
	for (const p of parts) {
		const anchor = p as unknown as { centerX?: number; centerY?: number; anchorX?: number; anchorY?: number; x?: number; y?: number };
		wx += anchor.centerX ?? anchor.anchorX ?? anchor.x ?? 0;
		wy += anchor.centerY ?? anchor.anchorY ?? anchor.y ?? 0;
	}
	wx /= parts.length;
	wy /= parts.length;
	return worldToScreen(wx, wy, game.camera, canvasW, canvasH);
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

	// Triangle SECOND step: the base edge is already committed (triangleBase set),
	// so this click places the APEX and creates the triangle (ControllerGame
	// mouseClick NEW_TRIANGLE actionStep==2, :2322-2381). We dispatch on this
	// press (the apex is a click, not a drag); GameCore validates side/angle
	// limits and no-ops the create if the point makes a degenerate triangle.
	if (tool === "newTriangle" && triangleBase) {
		const { v1, v2 } = triangleBase;
		game.dispatch({
			type: "createShape",
			kind: "triangle",
			x1: v1.x,
			y1: v1.y,
			x2: v2.x,
			y2: v2.y,
			x3: world.x,
			y3: world.y,
		});
		triangleBase = null;
		return;
	}

	// A "new*" shape tool BEGINS a click-drag-release creation gesture: press
	// records the start point, pointer-move shows a live preview, pointer-up
	// dispatches createShape with the dragged geometry. Ports ControllerGame's
	// NEW_CIRCLE/NEW_RECT/NEW_TRIANGLE press-drag-release (mouseClick :2190-2380).
	// For a triangle this first press-drag-release fixes the BASE edge only.
	if (shapeKind) {
		gesture = {
			kind: "create",
			shape: shapeKind,
			start: { x: world.x, y: world.y },
			current: { x: world.x, y: world.y },
		};
		container.value.setPointerCapture(event.pointerId);
		return;
	}

	// Creation tools that place a part at the click point. Joints/thrusters
	// hit-test the shapes under the click inside the core (they no-op if the
	// click misses; joints need two overlapping shapes). Mirrors
	// ControllerGame.mouseClick's MaybeCreate* dispatch (:2389-2510).
	if (tool === "newThrusters") {
		game.dispatch({ type: "createThrusters", x: world.x, y: world.y });
		return;
	}
	if (tool === "newCannon") {
		game.dispatch({ type: "createCannon", x: world.x, y: world.y });
		return;
	}
	if (tool === "newFixedJoint" || tool === "newRevoluteJoint" || tool === "newPrismaticJoint") {
		const kind = tool === "newFixedJoint" ? "fixed" : tool === "newRevoluteJoint" ? "revolute" : "prismatic";
		game.dispatch({ type: "createJoint", kind, x: world.x, y: world.y });
		return;
	}
	if (tool === "newText") {
		// The legacy editor drops a TextPart then opens its panel to enter text
		// (EnterTextAction). Headless, we prompt for the content up front.
		const text = window.prompt("Text:", "Text");
		if (text != null) game.dispatch({ type: "createText", x: world.x, y: world.y, text });
		return;
	}

	// Rotate / Resize tools: drag about the selection centroid. Requires a
	// current selection (ControllerGame.rotateButton/resizeButton no-op with an
	// empty selection, :3446/:3985). The gesture tracks the cursor's angle
	// (rotate) or distance (resize) from the centroid and dispatches the
	// incremental delta on each move.
	if (tool === "rotate" || tool === "resize") {
		if (game.edit.selection.length === 0) return;
		const pivot = selectionCentroidScreen(s.w, s.h);
		if (!pivot) return;
		if (tool === "rotate") {
			gesture = { kind: "rotate", pivot, lastAngle: Math.atan2(s.y - pivot.y, s.x - pivot.x) };
		} else {
			const d = Math.hypot(s.x - pivot.x, s.y - pivot.y);
			gesture = { kind: "resize", pivot, lastDist: Math.max(d, 1e-6) };
		}
		container.value.setPointerCapture(event.pointerId);
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
	if (game.sim.phase !== "editing") return;

	const s = screenOf(event);
	const world = screenToWorld(s.x, s.y, game.camera, s.w, s.h);

	// Track the cursor unconditionally so the triangle apex preview (drawn from
	// `triangleBase` + `pointerWorld` in drawFrame) follows the mouse between the
	// base-edge and apex clicks, when no pointer button is held.
	pointerWorld = { x: world.x, y: world.y };

	if (gesture.kind === "none") return;

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

	if (gesture.kind === "rotate") {
		// Angle of the cursor about the pivot; dispatch the incremental delta.
		const angle = Math.atan2(s.y - gesture.pivot.y, s.x - gesture.pivot.x);
		const delta = angle - gesture.lastAngle;
		if (delta !== 0) {
			const partIds = [...game.edit.selection];
			if (partIds.length > 0) game.dispatch({ type: "rotateParts", partIds, angle: delta });
			gesture.lastAngle = angle;
		}
		return;
	}

	if (gesture.kind === "resize") {
		// Ratio of the cursor's distance from the pivot vs. the last move;
		// dispatch it as the incremental scale factor.
		const dist = Math.max(Math.hypot(s.x - gesture.pivot.x, s.y - gesture.pivot.y), 1e-6);
		const factor = dist / gesture.lastDist;
		if (factor !== 1) {
			const partIds = [...game.edit.selection];
			if (partIds.length > 0) game.dispatch({ type: "resizeParts", partIds, scaleFactor: factor });
			gesture.lastDist = dist;
		}
		return;
	}

	if (gesture.kind === "marquee") {
		gesture.current = { x: world.x, y: world.y };
		drawMarquee();
		return;
	}

	if (gesture.kind === "create") {
		// Track the cursor; the preview is repainted from `gesture` inside the
		// per-frame drawFrame() (DrawTempShape shares the Draw sprite, which is
		// cleared/repainted every tick, so we must draw the preview there).
		gesture.current = { x: world.x, y: world.y };
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
	} else if (gesture.kind === "create") {
		const { shape, start, current } = gesture;
		if (shape === "triangle") {
			// FIRST triangle step: commit the base edge. The original clamps the
			// second point along the drag angle to Triangle's legal side length
			// (ControllerGame :2295-2316); we do the same so a too-short/too-long
			// drag still yields a valid base. The apex is placed by the NEXT click.
			const base = clampTriangleBase(start.x, start.y, current.x, current.y);
			if (base) triangleBase = { v1: { x: start.x, y: start.y }, v2: base };
		} else {
			// Circle/Rect finalize from the drag. GameCore ignores a zero-length
			// drag and clamps each dimension to the part's legal range, so we
			// dispatch unconditionally and let the core decide. Ports the on-`up`
			// creation in ControllerGame.mouseClick (:2195/:2222).
			game.dispatch({
				type: "createShape",
				kind: shape,
				x1: start.x,
				y1: start.y,
				x2: current.x,
				y2: current.y,
			});
		}
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
	overlay.rect(x, y, w, h);
	overlay.fill({ color: 0x3399ff, alpha: 0.12 });
	overlay.stroke({ width: 1, color: 0x3399ff, alpha: 0.9 });
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

	// Use the container's CSS-pixel size as the single source of truth for the
	// draw transform — the SAME size (getBoundingClientRect) the pointer math and
	// screenToWorld/worldToScreen use. Pixi's stage coordinate system is in CSS
	// pixels (autoDensity handles the devicePixelRatio scale internally), so
	// deriving canvas size from renderer.width/resolution is fragile across Pixi
	// versions and on HiDPI displays diverged from the CSS size — pushing the
	// world origin off-centre and confining drawing/interaction to a sub-region.
	// clientWidth/clientHeight are always CSS px and always match the pointer math.
	const w = container.value?.clientWidth || app.renderer.width / app.renderer.resolution;
	const h = container.value?.clientHeight || app.renderer.height / app.renderer.resolution;

	// Draw's screen transform is `worldX * m_drawScale - m_drawXOff` (no implicit
	// canvas-center offset). To centre the world origin the way the editor camera
	// expects — screen = canvas/2 + world*scale - offset — set the offsets so the
	// two transforms are identical. This keeps hit-testing (screenToWorld, which
	// uses the canvas/2 convention) aligned with what Draw paints.
	const camera = state.camera;
	draw.m_drawScale = camera.scale;
	draw.m_drawXOff = camera.offsetX - w / 2;
	draw.m_drawYOff = camera.offsetY - h / 2;
	// Feed the live viewport size to Draw's on-screen culling. The base
	// b2DebugDraw hardcodes an 800x600 stage (legacy Flash), which clips every
	// shape drawn past ~800x600; Draw overrides the cull to use these instead so
	// the whole responsive canvas is drawable, not just the top-left 800x600.
	draw.m_screenWidth = w;
	draw.m_screenHeight = h;
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

	// While a shape-creation drag is in progress, paint the in-progress shape
	// over the world using the ORIGINAL renderer's DrawTempShape so the preview
	// matches the finished shape's look (Draw.ts:819). It reuses the same Draw
	// sprite DrawWorld just painted into, so it must run each frame after it.
	drawShapePreview();
}

/**
 * Paint the live shape-creation preview via Draw.DrawTempShape, exactly matching
 * the original renderer's in-progress look (Draw.ts:819).
 *   circle/rect       — actionStep==1, firstClick=start, mouse=cursor.
 *   triangle step 1   — actionStep==1 (base-edge segment) while dragging the base.
 *   triangle step 2   — actionStep==2 (full triangle / fallback segment) once the
 *                       base is committed and the cursor sets the apex.
 * These are the same creatingItem/actionStep codes ControllerGame passes to
 * DrawTempShape in its render loop (:657-711).
 */
function drawShapePreview(): void {
	if (!draw) return;

	// Triangle, second step: base committed, apex tracks the cursor.
	if (triangleBase && pointerWorld) {
		const { v1, v2 } = triangleBase;
		draw.DrawTempShape(
			ControllerGameGlobals.NEW_TRIANGLE,
			2,
			v1.x,
			v1.y,
			v2.x,
			v2.y,
			pointerWorld.x,
			pointerWorld.y,
		);
		return;
	}

	if (gesture.kind !== "create") return;
	const { shape, start, current } = gesture;
	const creatingItem = shapeKindToCreatingItem[shape];
	// circle/rect (actionStep 1) and triangle first step (base-edge segment,
	// actionStep 1) all use firstClick=start, mouse=current.
	draw.DrawTempShape(creatingItem, 1, start.x, start.y, 0, 0, current.x, current.y);
}

/**
 * Commit the triangle BASE edge from the first press-drag-release. Returns the
 * second base vertex, clamped along the drag angle to Triangle's legal side
 * length exactly as ControllerGame does (:2295-2316): a too-short/too-long drag
 * snaps the base to MIN/MAX length in the drag direction. Returns null for a
 * zero-length drag (no base to build).
 */
function clampTriangleBase(x1: number, y1: number, x2: number, y2: number): { x: number; y: number } | null {
	const sideLen = Math.hypot(x2 - x1, y2 - y1);
	if (sideLen <= 0) return null;
	// atan2(y1 - y2, x2 - x1): the original's inverted-Y convention (:2303).
	if (sideLen < Triangle.MIN_SIDE_LENGTH) {
		const angle = Math.atan2(y1 - y2, x2 - x1);
		return { x: x1 + Triangle.MIN_SIDE_LENGTH * Math.cos(angle), y: y1 - Triangle.MIN_SIDE_LENGTH * Math.sin(angle) };
	}
	if (sideLen > Triangle.MAX_SIDE_LENGTH) {
		const angle = Math.atan2(y1 - y2, x2 - x1);
		return { x: x1 + Triangle.MAX_SIDE_LENGTH * Math.cos(angle), y: y1 - Triangle.MAX_SIDE_LENGTH * Math.sin(angle) };
	}
	return { x: x2, y: y2 };
}

onMounted(async () => {
	if (!container.value) return;

	const w = container.value.clientWidth || 1;
	const h = container.value.clientHeight || 1;

	const localApp = new Application();
	await localApp.init({
		width: w,
		height: h,
		backgroundAlpha: 0,
		antialias: true,
		resolution: window.devicePixelRatio || 1,
		autoDensity: true,
	});
	// The component may have been torn down while init() was awaiting.
	if (!container.value) {
		localApp.destroy(true, { children: true });
		return;
	}
	app = localApp;

	container.value.appendChild(app.canvas as unknown as Node);
	(app.canvas as HTMLCanvasElement).style.display = "block";
	(app.canvas as HTMLCanvasElement).style.width = "100%";
	(app.canvas as HTMLCanvasElement).style.height = "100%";

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
