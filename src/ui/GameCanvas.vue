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
import { Polygon } from "../Parts/Polygon";
import { JointPart } from "../Parts/JointPart";
import { useGameStore } from "./gameStore";
import { useUiPrefs } from "./uiPrefs";
import {
	RestrictToSquares,
	FifteenAngleIncrements,
	MaxTriangle,
	SnapToCommonTriangles,
	SnapToGrid,
} from "./snapping";
import { screenToWorld, worldToScreen, hitTestPart, partsInBox } from "./renderer/sceneRenderer";
import { RenderInterpolator } from "./renderer/interpolation";
import { ShapePart } from "../Parts/ShapePart";
import { getPhysicsBackend } from "../Parts/partGlobals";
import { SkyRenderer } from "./renderer/skyRenderer";
import { GroundRenderer } from "./renderer/groundRenderer";
import { TutorialGroundRenderer } from "./renderer/tutorialGroundRenderer";
import { ChallengeGroundRenderer } from "./renderer/challengeGroundRenderer";
import { GridRenderer } from "./renderer/gridRenderer";
import { WaterRenderer } from "./renderer/waterRenderer";
import type { ToolMode } from "../core";
import type { Part } from "../Parts/Part";

type ShapeKind = "circle" | "rect" | "triangle" | "bomb";

// Map a shape kind to the Draw.DrawTempShape `creatingItem` code so the in-
// progress preview uses the ORIGINAL renderer's look (fills, outline, default
// colour). Values mirror ControllerGameGlobals.NEW_CIRCLE/NEW_RECT/NEW_TRIANGLE.
// A bomb draws exactly like a circle (press = centre, drag = radius — IB3
// GameControl.CreateBomb), so it reuses the circle preview.
const shapeKindToCreatingItem: Record<ShapeKind, number> = {
	circle: ControllerGameGlobals.NEW_CIRCLE,
	rect: ControllerGameGlobals.NEW_RECT,
	triangle: ControllerGameGlobals.NEW_TRIANGLE,
	bomb: ControllerGameGlobals.NEW_CIRCLE,
};

const game = useGameStore();
const uiPrefs = useUiPrefs();

// --- draw-gesture modifier state (Jaybit polls Input.isKeyDown(16/17); we track
// shift/ctrl here). Kept as plain module vars — the live preview reads them every
// ticker frame (drawFrame), where no DOM event is available, so reactivity isn't
// needed. Updated from every pointer AND key event. `ctrl` folds in metaKey for
// macOS. Beware: we only preventDefault where necessary (ctrl+arrows for pan),
// never on plain ctrl+key, so browser shortcuts keep working.
let shiftDown = false;
let ctrlDown = false;
function updateMods(e: PointerEvent | KeyboardEvent): void {
	shiftDown = e.shiftKey;
	ctrlDown = e.ctrlKey || e.metaKey;
}

// Arrow keys currently held for editing-phase camera pan (Ctrl = fast). Applied
// per ticker frame in drawFrame so pan speed is frame-based like the legacy
// per-frame m_drawXOff step (ControllerGame.as:6795-6835).
const heldArrows = new Set<number>();

// Reset the condition pick's first-click + preview whenever a pick starts,
// finalizes, or is cancelled (the draft's awaiting field changes). Prevents a
// stale first corner from leaking between picks.
watch(
	() => game.conditionDraft?.awaiting ?? null,
	() => {
		conditionFirstClick = null;
		overlay?.clear();
	},
);

// Cancel an in-progress triangle (base committed, apex not yet placed) whenever
// the tool changes or the sim leaves editing — mirrors ControllerGame resetting
// curAction/actionStep when a new tool button is pressed.
watch(
	() => [game.edit.tool, game.sim.phase],
	() => {
		triangleBase = null;
		// Abort an in-progress polygon (some vertices placed, ring not yet closed)
		// when the tool changes or the sim leaves editing — same reset as the
		// triangle base above.
		if (polygonPoints.length > 0) {
			polygonPoints = [];
			overlay?.clear();
		}
		// Abort an in-progress prismatic two-click / joint disambiguation when the
		// tool changes or the sim leaves editing (legacy resets curAction/actionStep
		// + clears highlightForJoint on a new tool button).
		if (game.jointGesture) {
			game.dispatch({ type: "cancelJointGesture" });
			jointDisambiguateStart = null;
			overlay?.clear();
		}
	},
);

const container = ref<HTMLDivElement | null>(null);

let app: Application | null = null;
let draw: Draw | null = null;
let drawSprite: Graphics | null = null;
// Renderer-only sky/background (gradient + clouds/stars), a faithful port of
// Sky.ts. Mounted BEHIND the Draw sprite so the world draws over it.
let sky: SkyRenderer | null = null;
// Renderer-only static terrain visual (grass/dirt gradient + rocks + end-cap
// outline circles), a faithful port of ControllerSandbox's sGround. Mounted
// ABOVE the sky but BELOW the Draw sprite, matching the legacy display order
// (sSky behind, sGround over it, the world/robot on top).
let ground: GroundRenderer | null = null;
// Renderer-only static tutorial-terrain visual (grass/dirt/rock landscape), a
// faithful port of ControllerTutorial's sGround1/2/3. Mounted ABOVE the sandbox
// ground but BELOW the Draw sprite. Only visible when a base-terrain tutorial
// (Tank/Shapes/Car/Jumpbot/Dumpbot/Catapult, levelIndex 0-5) is active.
let tutorialGround: TutorialGroundRenderer | null = null;
let challengeGround: ChallengeGroundRenderer | null = null;
// Renderer-only editor grid (IB3 GridControl.as port). Mounted ABOVE the
// terrain visuals but BELOW the Draw sprite so parts render over the grid;
// drawn only while editing with the gridEnabled pref on.
let grid: GridRenderer | null = null;
// Water layer (IB3 WaterControl draw port). Mounted ABOVE the Draw sprite —
// IB3 draws the water in front of the parts (SandboxControl.Init addChild
// order) so submerged parts show through the translucent fill.
let water: WaterRenderer | null = null;
// Lightweight overlay Graphics for the marquee rectangle — kept separate from
// the Draw sprite so it never fights Draw.ts's per-frame clear/repaint.
let overlay: Graphics | null = null;
let resizeObserver: ResizeObserver | null = null;
let tickerFn: (() => void) | null = null;

// The sim advances at a FIXED 30 steps/sec — IncrediBots' native stage rate. Each
// `step` runs two 1/60s Box2D sub-steps (= 1/30s of simulation), so it must be
// dispatched 30x/sec for real-time physics. The pixi ticker fires at the DISPLAY
// refresh rate (60/120/144Hz), so stepping once per tick ran the sim 2x+ too fast;
// we accumulate elapsed ticker time and step at 30Hz regardless of refresh rate.
const SIM_FRAME_MS = 1000 / 30;
let simAccMs = 0;

// Render interpolation between the fixed 30fps sim steps: drawFrame snapshots
// every body's pose BEFORE each step and draws at prev + alpha*(curr - prev),
// alpha being the accumulator leftover (0..1). Physics stepping is untouched
// (replay determinism); this is purely how the in-between render frames look.
// Cleared whenever the sim isn't running so nothing lerps from stale poses
// after reset/play/load.
const interpolator = new RenderInterpolator();

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
	// `lastAngle` is the cursor's previous angle about the pivot (for unwrapped
	// delta accumulation); `rawTotal` is the total rotation since the grab (matches
	// the legacy delta from initRotatingAngle); `appliedTotal` is how much we've
	// already dispatched. Shift snaps rawTotal to 15° multiples RELATIVE TO THE GRAB
	// (ControllerGame.as:7997-8002) and we dispatch the difference to the snapped
	// target so the parts land on exact 15° offsets from where they started.
	| { kind: "rotate"; pivot: { x: number; y: number }; lastAngle: number; rawTotal: number; appliedTotal: number }
	// Resize the selection's ATTACHED CLUSTER about selectedParts[0]'s anchor.
	// Faithful to ControllerGame's RESIZING_SHAPES: the core captured the pivot +
	// per-part baseline on `resizeStart`; here we only track the horizontal world
	// distance from the initial press (firstClickWorldX) and map it to the TOTAL
	// from-baseline scale factor the same way the original does (mouseXWorld −
	// firstClickX, ControllerGame.ts:1555-1562).
	| { kind: "resize"; firstClickWorldX: number }
	// Marquee box-select. `origin` is the world-space anchor (first corner).
	| { kind: "marquee"; origin: { x: number; y: number }; current: { x: number; y: number } }
	// Pan the editor camera by dragging empty world space with the Select tool
	// (ControllerGame "dragging the world around" :1834-1835). `lastScreen` tracks
	// the cursor's canvas-pixel position at the previous move so we dispatch
	// panCamera with the incremental screen-pixel delta (the core subtracts it from
	// camera.offset and clamps to the sandbox bounds).
	| { kind: "pan"; lastScreen: { x: number; y: number } }
	// Create a Circle/Rectangle/Triangle by dragging. `start` is the press point
	// (world), `current` the live cursor point. Ports ControllerGame's
	// NEW_CIRCLE/NEW_RECT/NEW_TRIANGLE press-drag-release (mouseClick :2190-2380);
	// pointer-move repaints the preview via Draw.DrawTempShape and pointer-up
	// dispatches createShape with the final geometry.
	| { kind: "create"; shape: ShapeKind; start: { x: number; y: number }; current: { x: number; y: number } };

let gesture: Gesture = { kind: "none" };

// Whether a running-sim mouse-joint drag is in progress (pointer-down over a
// body during play). Kept separate from `gesture` since it lives entirely in the
// running phase, driving the core's b2MouseJoint via mouseJointMove/End.
let mouseJointActive = false;

// Triangle is a TWO-STEP gesture in the original (ControllerGame :2282): the
// first press-drag-release fixes the BASE edge (v1→v2, length-clamped), then a
// second click places the APEX (v3). Between those two the base is committed
// here while the apex tracks the cursor for a live preview. Null when no
// triangle is mid-construction.
let triangleBase: { v1: { x: number; y: number }; v2: { x: number; y: number } } | null = null;
// Last known cursor position in world units — drives the triangle apex preview
// while `triangleBase` is set (the cursor moves with no button held down).
let pointerWorld: { x: number; y: number } | null = null;

// Polygon is a MULTI-CLICK gesture (new IB2/Jaybit editor tool — IB3 v0.00.33b
// has no interactive polygon draw, polygons only arrive via import/copy). Each
// click appends a grid-snapped vertex here (kept convex + within
// [3, Polygon.MAX_VERTICES] + minimum side length as we go); the ring closes by
// clicking near the first vertex, double-clicking, or pressing Enter, and
// Escape cancels. Empty when no polygon is mid-construction. `pointerWorld`
// (shared with the triangle preview) drives the rubber-band edge to the cursor.
let polygonPoints: { x: number; y: number }[] = [];

// Pointer-down anchor of a >2-overlap joint/thruster DISAMBIGUATION interaction
// (ControllerGame FINALIZING_JOINT). Set on pointer-down while the core's
// jointGesture.phase === "disambiguate"; on pointer-up, a small move (< the legacy
// 0.5*30/scale threshold) CYCLES the candidate pick (cycleJointCandidate) and a
// larger drag FINALIZES it (finalizeJoint). Null when no such interaction is live.
let jointDisambiguateStart: { x: number; y: number } | null = null;

// --- Challenge-condition stage picking (self-contained) --------------------
// When game.conditionDraft.awaiting is a box/hline/vline, the author draws the
// region as a TWO-CLICK gesture (faithful to ControllerGame :2079-2118): the
// first click records a corner (conditionFirstClick), the cursor then previews
// the box/line, and the second click (if moved > 0.1 world units, matching the
// legacy threshold) dispatches conditionPickBox. When awaiting shape1/shape2, a
// single click hit-tests a shape and dispatches conditionPickShape
// (FinishSelectingForCondition :316-336). These are gated entirely behind the
// `game.conditionDraft?.awaiting` check at the TOP of each pointer handler so
// they never interfere with the select/create/rotate/resize gestures.
let conditionFirstClick: { x: number; y: number } | null = null;

// --- Two-finger pan + pinch-zoom (additive touch navigation) ----------------
// Every live pointer's last canvas-relative position, keyed by pointerId. Kept
// in sync on pointerdown/move/up/cancel. When exactly TWO pointers are down we
// enter PINCH mode: a two-finger drag pans (midpoint screen delta) and pinch
// zooms about the midpoint (zoomCamera). This is pure VIEW navigation, so it
// works in both editing and running phases. Single-pointer behaviour is
// unchanged — the onPointerDown gesture logic only runs when there is exactly
// one active pointer and we're not in pinch mode.
const activePointers = new Map<number, { x: number; y: number }>();
// Non-null only while a two-finger pinch is in progress. Records the last
// midpoint (canvas px) + finger distance so each move can dispatch the
// incremental pan delta and the zoom scale ratio.
let pinch: { lastMidX: number; lastMidY: number; lastDist: number } | null = null;

/** Midpoint + distance of the two active pointers (assumes exactly 2). */
function pinchMetrics(): { midX: number; midY: number; dist: number } {
	const pts = [...activePointers.values()];
	const [a, b] = pts;
	const midX = (a.x + b.x) / 2;
	const midY = (a.y + b.y) / 2;
	const dist = Math.hypot(a.x - b.x, a.y - b.y);
	return { midX, midY, dist };
}

/**
 * Cleanly abort any in-progress single-pointer gesture when a second finger
 * lands. Ends a running-sim mouse-joint grab (so the robot isn't dragged while
 * pinching), clears the editing gesture + any overlay preview, and releases
 * pointer capture for both pointers so subsequent moves reach the container.
 */
function abortSinglePointerGesture(): void {
	if (mouseJointActive) {
		game.dispatch({ type: "mouseJointEnd" });
		mouseJointActive = false;
	}
	if (gesture.kind === "resize") {
		// Commit/clear the core's resize baseline so it isn't left dangling.
		game.dispatch({ type: "resizeEnd" });
	}
	gesture = { kind: "none" };
	// Abort in-progress joint disambiguation / condition previews cleanly.
	jointDisambiguateStart = null;
	overlay?.clear();
	// Release capture for whatever pointers were captured by the aborted gesture.
	if (container.value) {
		for (const id of activePointers.keys()) {
			try {
				container.value.releasePointerCapture(id);
			} catch {
				// not captured; ignore.
			}
		}
	}
}

const toolToShapeKind: Partial<Record<ToolMode, "circle" | "rect" | "triangle" | "bomb">> = {
	newCircle: "circle",
	newRect: "rect",
	newTriangle: "triangle",
	newBomb: "bomb",
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
/**
 * Grid-snap a world-space gesture point when grid snapping is active (grid
 * shown + "Snap to Grid" pref on — IB3 keyed its snapToGrid flag
 * (GameControl.as:269) to the grid the same way, and the grid itself only
 * exists in the editor). Applied at the same FINAL-geometry funnel as the
 * Shift-modifier helpers: shape create anchors/cursors and part drags, before
 * GameCore.dispatch. Joint/thruster placement is NOT grid-snapped — IB3 never
 * grid-snapped those (they use snap-to-center, handled in the core).
 */
function snapGesturePoint(p: { x: number; y: number }): { x: number; y: number } {
	if (!uiPrefs.gridEnabled.value || !uiPrefs.gridSnap.value) return p;
	const spacing = uiPrefs.gridSpacing.value;
	return { x: SnapToGrid(p.x, spacing), y: SnapToGrid(p.y, spacing) };
}

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
	updateMods(event);

	const s = screenOf(event);

	// Track this pointer. When a SECOND pointer lands, ENTER pinch mode: abort
	// any in-progress single-pointer gesture and seed the pinch midpoint/distance.
	activePointers.set(event.pointerId, { x: s.x, y: s.y });
	if (activePointers.size === 2) {
		event.preventDefault();
		abortSinglePointerGesture();
		const m = pinchMetrics();
		pinch = { lastMidX: m.midX, lastMidY: m.midY, lastDist: m.dist };
		return;
	}
	// With more than 2 pointers we're already pinching — ignore extras.
	if (activePointers.size !== 1 || pinch) return;

	const camera = game.camera;
	const world = screenToWorld(s.x, s.y, camera, s.w, s.h);

	// --- Condition stage-picking (gated; runs only while a pick is awaited) ---
	// Faithful to ControllerGame :2079-2118 / :1537-1550. Takes priority over and
	// short-circuits the normal select/create gestures. Only active while editing.
	const awaiting = game.conditionDraft?.awaiting;
	if (awaiting && game.sim.phase === "editing") {
		if (awaiting === "shape1" || awaiting === "shape2") {
			// Single click: hit-test a shape, feed its id (:1537-1549).
			const hit = hitTestPart(game.parts, world.x, world.y, camera.scale);
			if (hit) game.dispatch({ type: "conditionPickShape", shapeId: hit.id });
			return;
		}
		// Box / line: TWO clicks. First records the corner; second finalizes if the
		// cursor moved > 0.1 world units (:2100-2103).
		if (!conditionFirstClick) {
			conditionFirstClick = { x: world.x, y: world.y };
		} else {
			const moved =
				Math.abs(conditionFirstClick.x - world.x) > 0.1 || Math.abs(conditionFirstClick.y - world.y) > 0.1;
			if (moved) {
				game.dispatch({
					type: "conditionPickBox",
					x1: conditionFirstClick.x,
					y1: conditionFirstClick.y,
					x2: world.x,
					y2: world.y,
				});
				conditionFirstClick = null;
				overlay?.clear();
			}
		}
		return;
	}

	// During the running sim, a pointer-down grabs a body with a b2MouseJoint
	// (ControllerGame.MouseDrag play-mode block, :1782-1794): editing is disabled,
	// but the player can drag their robot around. The core no-ops the grab if the
	// cursor misses a draggable body. Pointer-move retargets, pointer-up releases.
	if (game.sim.phase === "running") {
		game.dispatch({ type: "mouseJointStart", worldX: world.x, worldY: world.y });
		mouseJointActive = true;
		container.value.setPointerCapture(event.pointerId);
		return;
	}
	// Editing gestures are disabled while paused (matches ControllerGame's
	// `if (!this.simStarted)` guard around MouseDrag, ControllerGame.ts:1255).
	if (game.sim.phase !== "editing") return;

	const tool = game.edit.tool;
	const shapeKind = toolToShapeKind[tool as ToolMode];

	// Triangle SECOND step: the base edge is already committed (triangleBase set),
	// so this click places the APEX and creates the triangle (ControllerGame
	// mouseClick NEW_TRIANGLE actionStep==2, :2322-2381). We dispatch on this
	// press (the apex is a click, not a drag); GameCore validates side/angle
	// limits and no-ops the create if the point makes a degenerate triangle.
	if (tool === "newTriangle" && triangleBase) {
		const { v1, v2 } = triangleBase;
		// Resolve the apex: MaxTriangle clamp (always) + Shift snapping. The core
		// still validates side/angle limits and no-ops a degenerate triangle, but
		// MaxTriangle guarantees the clamped apex is legal.
		const apex = resolveTriangleApex(v1, v2, world);
		game.dispatch({
			type: "createShape",
			kind: "triangle",
			x1: v1.x,
			y1: v1.y,
			x2: v2.x,
			y2: v2.y,
			x3: apex.x,
			y3: apex.y,
		});
		triangleBase = null;
		return;
	}

	// Polygon MULTI-CLICK gesture: each press places one vertex (grid-snapped,
	// convexity + vertex-cap + min-side enforced in handlePolygonClick). The ring
	// closes by clicking near the first vertex or double-clicking; Enter also
	// commits and Escape cancels (both in onKeyDown). No drag — vertices are
	// point clicks, like the triangle apex.
	if (tool === "newPolygon") {
		handlePolygonClick(world, event.detail >= 2);
		return;
	}

	// A "new*" shape tool BEGINS a click-drag-release creation gesture: press
	// records the start point, pointer-move shows a live preview, pointer-up
	// dispatches createShape with the dragged geometry. Ports ControllerGame's
	// NEW_CIRCLE/NEW_RECT/NEW_TRIANGLE press-drag-release (mouseClick :2190-2380).
	// For a triangle this first press-drag-release fixes the BASE edge only.
	if (shapeKind) {
		// Grid snapping (IB3 grid port): anchor the create gesture on the nearest
		// grid intersection when the grid + snap prefs are on.
		const anchor = snapGesturePoint({ x: world.x, y: world.y });
		gesture = {
			kind: "create",
			shape: shapeKind,
			start: { x: anchor.x, y: anchor.y },
			current: { x: anchor.x, y: anchor.y },
		};
		container.value.setPointerCapture(event.pointerId);
		return;
	}

	// --- >2-overlap joint/thruster DISAMBIGUATION cycle (ControllerGame
	// FINALIZING_JOINT, :2435-2473 click-to-cycle + :1667-1765 drag-to-finalize).
	// While the core is in a disambiguation gesture (jointGesture.phase ==
	// "disambiguate"), the pointer-DOWN begins a small gesture: if it ends as a
	// CLICK (no drag past the legacy 0.5*30/scale threshold) it cycles the pick; a
	// DRAG past the threshold finalizes with the current highlighted pick. We
	// capture the pointer and resolve on up/move in the disambiguation branch.
	if (game.jointGesture?.phase === "disambiguate") {
		jointDisambiguateStart = { x: world.x, y: world.y };
		container.value.setPointerCapture(event.pointerId);
		return;
	}

	// Creation tools that place a part at the click point. Joints/thrusters
	// hit-test the shapes under the click inside the core (they no-op if the
	// click misses; joints need two overlapping shapes). Mirrors
	// ControllerGame.mouseClick's MaybeCreate* dispatch (:2389-2510). When
	// snapToCenter is on the core snaps the point to the nearest shape centre.
	if (tool === "newThrusters") {
		game.dispatch({ type: "createThrusters", x: world.x, y: world.y });
		return;
	}
	if (tool === "newCannon") {
		game.dispatch({ type: "createCannon", x: world.x, y: world.y });
		return;
	}
	if (tool === "newFixedJoint" || tool === "newRevoluteJoint") {
		const kind = tool === "newFixedJoint" ? "fixed" : "revolute";
		game.dispatch({ type: "createJoint", kind, x: world.x, y: world.y });
		return;
	}
	if (tool === "newPrismaticJoint") {
		// Two-click gesture (ControllerGame MaybeStart/FinishCreatingPrismaticJoint
		// :6844/:6884). Click 1 (no axis pending) records shape #1 + axis start; click
		// 2 (axis pending) finalizes with shape #2 + axis end. The awaiting-second-
		// click state is the core's jointGesture.phase === "prismaticAxis" (its
		// axisStart drives the preview line); the >1-overlap first-click path is
		// intercepted by the disambiguation branch above.
		if (game.jointGesture?.phase === "prismaticAxis") {
			// Shift held → snap the slide-axis endpoint to 15° increments about the
			// recorded axis-start AND bypass the core's snap-to-center, so the axis
			// keeps the snapped angle (ui-hotkeys §4.4 / MaybeFinishCreatingPrismaticJoint).
			const axisStart = game.jointGesture.axisStart;
			let ex = world.x;
			let ey = world.y;
			if (event.shiftKey && axisStart) {
				[ex, ey] = FifteenAngleIncrements(world.x, world.y, axisStart.x, axisStart.y);
			}
			game.dispatch({ type: "finishPrismaticJoint", x: ex, y: ey, bypassSnap: event.shiftKey });
			overlay?.clear();
		} else {
			// Shift held → bypass the core's snap-to-center on the FIRST click too,
			// so the axis start stays at the raw point (same modifier source as the
			// second click above).
			game.dispatch({ type: "startPrismaticJoint", x: world.x, y: world.y, bypassSnap: event.shiftKey });
		}
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
		if (tool === "rotate") {
			const pivot = selectionCentroidScreen(s.w, s.h);
			if (!pivot) return;
			gesture = {
				kind: "rotate",
				pivot,
				lastAngle: Math.atan2(s.y - pivot.y, s.x - pivot.x),
				rawTotal: 0,
				appliedTotal: 0,
			};
		} else {
			// Begin the legacy resize gesture: the core snapshots the pivot
			// (selectedParts[0]'s anchor), the attached cluster, per-part dragOff and
			// PrepareForResizing() baseline (ControllerGame.scaleButton :3975). We
			// record the press point's world X as firstClickX (:3992) and drive the
			// TOTAL scale factor from the horizontal drag on move.
			game.dispatch({ type: "resizeStart", partIds: [...game.edit.selection] });
			gesture = { kind: "resize", firstClickWorldX: world.x };
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
			// Additive shift-click TOGGLES membership (ControllerGame :1291-1293): an
			// unselected part is added, an already-selected part is REMOVED
			// (Util.RemoveFromArray). The core `select {additive}` now toggles for a
			// single id, so we dispatch it either way.
			game.dispatch({ type: "select", partIds: [hit.id], additive: true });
			if (alreadySelected) {
				// The part was just DESELECTED — don't begin a drag of it.
				return;
			}
		} else if (!alreadySelected) {
			game.dispatch({ type: "select", partIds: [hit.id] });
		}
		// Begin dragging. Delta is measured incrementally from here. With grid
		// snapping active the reference point is grid-quantized (as every move
		// point is), so the drag proceeds in whole grid steps and the parts keep
		// their offset relative to the grid.
		const dragFrom = snapGesturePoint({ x: world.x, y: world.y });
		gesture = { kind: "drag", lastWorld: { x: dragFrom.x, y: dragFrom.y } };
		container.value.setPointerCapture(event.pointerId);
		return;
	}

	// Pointer-down on empty space (ControllerGame.ts:1466-1486). The legacy splits
	// on the shift key: with SHIFT held it begins a BOX_SELECTING marquee
	// (:1466-1469); with NO modifier it PANS the world by dragging (:1471-1476).
	// Either way the current selection is cleared (:1479). We mirror that split
	// exactly — a plain empty-drag pans the camera; a shift empty-drag marquees.
	game.dispatch({ type: "clearSelection" });
	if (additive) {
		gesture = { kind: "marquee", origin: { x: world.x, y: world.y }, current: { x: world.x, y: world.y } };
	} else {
		gesture = { kind: "pan", lastScreen: { x: s.x, y: s.y } };
	}
	container.value.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
	if (!app || !container.value) return;
	updateMods(event);

	// --- Two-finger pinch: pan + zoom about the midpoint --------------------
	// Update the moved pointer, then (while pinching) dispatch the incremental
	// pan (midpoint screen delta) + zoom (distance ratio) about the midpoint.
	if (activePointers.has(event.pointerId)) {
		const sp = screenOf(event);
		activePointers.set(event.pointerId, { x: sp.x, y: sp.y });
	}
	if (pinch && activePointers.size >= 2) {
		event.preventDefault();
		const s = screenOf(event);
		const m = pinchMetrics();
		// Pan by the midpoint delta since the last move — same sign convention as
		// the single-finger pan (panCamera subtracts the screen delta from
		// camera.offset, so content follows the fingers).
		const dx = m.midX - pinch.lastMidX;
		const dy = m.midY - pinch.lastMidY;
		if (dx !== 0 || dy !== 0) {
			game.dispatch({ type: "panCamera", dx, dy, viewW: s.w, viewH: s.h });
		}
		// Zoom about the midpoint. Guard against divide-by-zero (dist 0).
		if (pinch.lastDist > 0 && m.dist > 0) {
			const scaleFactor = m.dist / pinch.lastDist;
			if (scaleFactor !== 1) {
				game.dispatch({
					type: "zoomCamera",
					scaleFactor,
					focusX: m.midX,
					focusY: m.midY,
					viewW: s.w,
					viewH: s.h,
				});
			}
		}
		pinch.lastMidX = m.midX;
		pinch.lastMidY = m.midY;
		pinch.lastDist = m.dist;
		return;
	}

	// --- Condition box/line live preview (gated) ---
	// After the first corner click, paint the box/line being drawn to the cursor
	// (faithful to the legacy redrawRobot preview while DRAWING_BOX/LINE).
	if (game.conditionDraft?.awaiting && conditionFirstClick) {
		const s = screenOf(event);
		const world = screenToWorld(s.x, s.y, game.camera, s.w, s.h);
		drawConditionPreview(conditionFirstClick, world);
		return;
	}

	// Running-sim mouse-joint drag: retarget the grabbed body to the cursor
	// (ControllerGame.MouseDrag :1798-1801).
	if (mouseJointActive) {
		const s = screenOf(event);
		const world = screenToWorld(s.x, s.y, game.camera, s.w, s.h);
		game.dispatch({ type: "mouseJointMove", worldX: world.x, worldY: world.y });
		return;
	}

	if (game.sim.phase !== "editing") return;

	const s = screenOf(event);
	const world = screenToWorld(s.x, s.y, game.camera, s.w, s.h);

	// Track the cursor unconditionally so the triangle apex preview (drawn from
	// `triangleBase` + `pointerWorld` in drawFrame) follows the mouse between the
	// base-edge and apex clicks, when no pointer button is held.
	pointerWorld = { x: world.x, y: world.y };

	// Prismatic axis preview: while awaiting the SECOND click (core jointGesture.
	// phase === "prismaticAxis"), draw the slide-axis line from the recorded
	// axis-start to the cursor (ControllerGame draws the in-progress prismatic axis
	// while actionStep == 1). No button is held between the two clicks.
	if (game.jointGesture?.phase === "prismaticAxis" && game.jointGesture.axisStart) {
		// Shift held → preview the axis snapped to 15° increments (matches the
		// committed axis on the second click; ui-hotkeys §4.4 preview :2411-2414).
		const start = game.jointGesture.axisStart;
		let end = world;
		if (event.shiftKey) {
			const [sx, sy] = FifteenAngleIncrements(world.x, world.y, start.x, start.y);
			end = { x: sx, y: sy };
		}
		drawPrismaticAxisPreview(start, end);
		return;
	}

	if (gesture.kind === "none") return;

	if (gesture.kind === "pan") {
		// Empty-space world drag (ControllerGame :1834-1835). Dispatch the incremental
		// SCREEN-pixel delta; the core subtracts it from camera.offset and clamps to
		// the sandbox bounds. viewW/viewH are the current canvas size.
		const dx = s.x - gesture.lastScreen.x;
		const dy = s.y - gesture.lastScreen.y;
		if (dx !== 0 || dy !== 0) {
			game.dispatch({ type: "panCamera", dx, dy, viewW: s.w, viewH: s.h });
			gesture.lastScreen = { x: s.x, y: s.y };
		}
		return;
	}

	if (gesture.kind === "drag") {
		// Incremental world-space delta since the last move. moveParts is
		// relative (adds dx/dy to each part's current position), so feeding it
		// the per-move delta keeps the selection tracking the cursor 1:1 —
		// equivalent to ControllerGame's Part.Move(mouseWorld - dragOff) at
		// :1517. Skip zero-delta moves to avoid redundant dispatches.
		// Grid snapping: quantize the cursor to the grid so the deltas come out
		// in whole grid steps (the pointer-down reference was quantized the same
		// way) — parts move grid cell by grid cell, keeping their grid offset.
		const dragWorld = snapGesturePoint({ x: world.x, y: world.y });
		const dx = dragWorld.x - gesture.lastWorld.x;
		const dy = dragWorld.y - gesture.lastWorld.y;
		if (dx !== 0 || dy !== 0) {
			const partIds = [...game.edit.selection];
			if (partIds.length > 0) {
				game.dispatch({ type: "moveParts", partIds, dx, dy });
			}
			gesture.lastWorld = { x: dragWorld.x, y: dragWorld.y };
		}
		return;
	}

	if (gesture.kind === "rotate") {
		// Accumulate the UNWRAPPED total rotation since the grab, then (with Shift)
		// snap that total to 15° multiples relative to the grab and dispatch only the
		// difference to the snapped target. Matches ControllerGame.as:7997-8002 where
		// the snap is round((angle - initRotatingAngle) / 15°) * 15° + initRotatingAngle.
		const angle = Math.atan2(s.y - gesture.pivot.y, s.x - gesture.pivot.x);
		let d = angle - gesture.lastAngle;
		while (d > Math.PI) d -= 2 * Math.PI;
		while (d < -Math.PI) d += 2 * Math.PI;
		gesture.lastAngle = angle;
		gesture.rawTotal += d;
		const step = Math.PI / 12; // 15°
		const target = shiftDown ? Math.round(gesture.rawTotal / step) * step : gesture.rawTotal;
		const delta = target - gesture.appliedTotal;
		if (delta !== 0) {
			const partIds = [...game.edit.selection];
			if (partIds.length > 0) game.dispatch({ type: "rotateParts", partIds, angle: delta });
			gesture.appliedTotal += delta;
		}
		return;
	}

	if (gesture.kind === "resize") {
		// Map the horizontal world drag to the TOTAL from-baseline scale factor the
		// way the original does (ControllerGame.ts:1555-1562): rightward (≥0) grows
		// via sf/75 + 1; leftward shrinks via −1 / (sf/25 − 1).
		let sf = world.x - gesture.firstClickWorldX;
		if (sf >= 0) {
			sf = sf / 75 + 1;
		} else {
			sf = sf / 25 - 1;
			sf = -1 / sf;
		}
		game.dispatch({ type: "resizeParts", scaleFactor: sf });
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
	updateMods(event);

	const wasActive = activePointers.delete(event.pointerId);

	// --- Two-finger pinch teardown ------------------------------------------
	// While pinching (or if a lifted finger drops the count below 2), do NOT run
	// any single-pointer up logic. Exiting pinch requires a FRESH pointerdown to
	// start a new single-pointer gesture, so a lingering finger can't suddenly
	// begin dragging/creating.
	if (pinch) {
		event.preventDefault();
		try {
			container.value.releasePointerCapture(event.pointerId);
		} catch {
			// not captured; ignore.
		}
		if (activePointers.size < 2) pinch = null;
		return;
	}
	// A stray pointer lifting while a single-pointer gesture ran (but we were not
	// pinching) falls through to the normal gesture-end logic below only when it
	// was one of the tracked pointers driving that gesture.
	void wasActive;

	// Release a running-sim mouse-joint grab (ControllerGame.MouseDrag :1804-1808).
	if (mouseJointActive) {
		game.dispatch({ type: "mouseJointEnd" });
		mouseJointActive = false;
		try {
			container.value.releasePointerCapture(event.pointerId);
		} catch {
			// pointer may not have been captured; ignore.
		}
		return;
	}

	// Resolve a >2-overlap DISAMBIGUATION interaction (ControllerGame
	// FINALIZING_JOINT): a small move is a CLICK → cycle the candidate pick
	// (:2435-2473); a drag past the legacy 0.5*30/scale threshold FINALIZES with the
	// current pick (:1668-1676). The threshold is in world units, so scale it by the
	// camera scale to compare against the screen-pixel move.
	if (jointDisambiguateStart) {
		const s = screenOf(event);
		const world = screenToWorld(s.x, s.y, game.camera, s.w, s.h);
		const dist = Math.hypot(world.x - jointDisambiguateStart.x, world.y - jointDisambiguateStart.y);
		const threshold = (0.5 * 30) / game.camera.scale;
		if (dist > threshold) {
			game.dispatch({ type: "finalizeJoint", x: world.x, y: world.y });
		} else {
			game.dispatch({ type: "cycleJointCandidate" });
		}
		jointDisambiguateStart = null;
		try {
			container.value.releasePointerCapture(event.pointerId);
		} catch {
			// ignore
		}
		return;
	}

	if (gesture.kind === "resize") {
		// Commit the resize gesture (ControllerGame commit-on-up :2070-2078): the
		// core runs the fit check and clears its baseline.
		game.dispatch({ type: "resizeEnd" });
		gesture = { kind: "none" };
		try {
			container.value.releasePointerCapture(event.pointerId);
		} catch {
			// pointer may not have been captured; ignore.
		}
		return;
	}

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
		const { shape, start } = gesture;
		// Resolve the release point with the held modifiers (rect square / triangle
		// base 15°) so the finalize matches the preview.
		const current = resolveCreateCurrent(shape, start, gesture.current);
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

// --- live keyboard control (running sim) -----------------------------------
// While the sim runs, held/pressed keys drive the robot: revolute/prismatic
// motors, thrusters, cannons, text displays. A faithful port of the legacy key
// path (Input.keyPress/keyRelease -> ControllerGame.keyPress -> keyInput,
// :1885-1888 / :1868-1883): keydown feeds keyInput(key, up=false), keyup feeds
// keyInput(key, up=true). The core forwards each to every part's KeyInput (which
// sets the per-part control flags its per-step Update reads) and records only
// text/cannon keys. Keys held down repeat browser keydown events, but the part
// flags are idempotent (isKeyDown = !up), so repeats are harmless. We track the
// pressed set so a browser key-repeat only fires one keydown per physical press.
const pressedKeys = new Set<number>();

// True when the event originates from a text field, so global editor hotkeys
// don't hijack typing (legacy gated on m_sidePanel.EnteringInput(), :1890).
function isTypingTarget(event: KeyboardEvent): boolean {
	const t = event.target as HTMLElement | null;
	if (!t) return false;
	const tag = t.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

/** Clear held-key state when the window loses focus (no keyup fires otherwise). */
function onWindowBlur(): void {
	heldArrows.clear();
	pressedKeys.clear();
	shiftDown = false;
	ctrlDown = false;
}

function onKeyDown(event: KeyboardEvent): void {
	updateMods(event);
	// Polygon multi-click gesture: Enter (13) commits the ring, Escape (27)
	// cancels it. Handled here (not App's Escape cascade, which owns modals /
	// condition-pick / joint gestures — none active during a polygon draw) since
	// the in-progress vertices live in this component. Only while editing with
	// vertices placed; skip while typing in a form field.
	if (game.sim.phase === "editing" && polygonPoints.length > 0 && !isTypingTarget(event)) {
		if (event.keyCode === 13) {
			commitPolygon();
			event.preventDefault();
			return;
		}
		if (event.keyCode === 27) {
			polygonPoints = [];
			overlay?.clear();
			event.preventDefault();
			return;
		}
	}
	const arrowKey = event.keyCode;
	// Editing-phase fast camera pan (Ctrl = 3x): track held arrows; drawFrame does
	// the per-frame pan (ControllerGame.as:6795-6835). preventDefault so the arrows
	// don't scroll the page. Skipped while typing in a form field.
	if (
		game.sim.phase === "editing" &&
		!isTypingTarget(event) &&
		(arrowKey === 37 || arrowKey === 38 || arrowKey === 39 || arrowKey === 40)
	) {
		heldArrows.add(arrowKey);
		event.preventDefault();
		return;
	}
	if (game.sim.phase !== "running") return;
	// keyCode is the code space the legacy parts compare against (motorCWKey etc.).
	const key = event.keyCode;
	if (pressedKeys.has(key)) return; // ignore auto-repeat
	pressedKeys.add(key);
	game.dispatch({ type: "keyInput", key, up: false });
	// Arrow keys / space would otherwise scroll the page while driving.
	if (key === 37 || key === 38 || key === 39 || key === 40 || key === 32) event.preventDefault();
}

function onKeyUp(event: KeyboardEvent): void {
	updateMods(event);
	const key = event.keyCode;
	heldArrows.delete(key);
	pressedKeys.delete(key);
	if (game.sim.phase === "running") {
		game.dispatch({ type: "keyInput", key, up: true });
		return;
	}
	// Editing-phase shortcuts. Faithful port of ControllerGame.keyPress's
	// `!simStarted` block (ControllerGame.ts:1890-1927): the legacy fires these on
	// key-UP, so we do too. Skipped while typing in a form field (legacy gated on
	// m_sidePanel.EnteringInput()). Escape (key 27) is handled in App.vue, which
	// owns the modal state + condition-pick cancel.
	if (game.sim.phase !== "editing") return;
	if (isTypingTarget(event)) return;
	editingHotkey(key);
}

/**
 * Dispatch the editing-phase action for a key-up, mirroring the legacy per-key
 * cascade at ControllerGame.ts:1891-1926. keyCode values match the legacy.
 */
function editingHotkey(key: number): void {
	const selection = [...game.edit.selection];
	switch (key) {
		// Tool hotkeys 1–7 → the same tools legacy's 1-7 buttons select
		// (circle/rect/triangle/fixed/revolute/prismatic/text, :1891-1904).
		case 49: // 1
			game.dispatch({ type: "setTool", tool: "newCircle" });
			return;
		case 50: // 2
			game.dispatch({ type: "setTool", tool: "newRect" });
			return;
		case 51: // 3
			game.dispatch({ type: "setTool", tool: "newTriangle" });
			return;
		case 52: // 4
			game.dispatch({ type: "setTool", tool: "newFixedJoint" });
			return;
		case 53: // 5
			game.dispatch({ type: "setTool", tool: "newRevoluteJoint" });
			return;
		case 54: // 6
			game.dispatch({ type: "setTool", tool: "newPrismaticJoint" });
			return;
		case 55: // 7
			game.dispatch({ type: "setTool", tool: "newText" });
			return;
		// R → rotateButton, which enters ROTATE mode (:1905, ControllerGame:3434).
		case 82: // R
			if (selection.length > 0) game.dispatch({ type: "setTool", tool: "rotate" });
			return;
		// X / C / V → cut / copy / paste on the current selection (:1907-1912).
		case 88: // X
			if (selection.length > 0) game.dispatch({ type: "cutParts", partIds: selection });
			return;
		case 67: // C
			if (selection.length > 0) game.dispatch({ type: "copyParts", partIds: selection });
			return;
		case 86: // V
			game.dispatch({ type: "pasteParts" });
			return;
		// Backspace (8) / Delete (46) → delete the selection (:1913-1915).
		case 8:
		case 46:
			if (selection.length > 0) game.dispatch({ type: "deleteParts", partIds: selection });
			return;
		// Y → redo, Z → undo (bare keys — no ctrl in legacy, :1916-1919).
		case 89: // Y
			game.dispatch({ type: "redo" });
			return;
		case 90: // Z
			game.dispatch({ type: "undo" });
			return;
		// + / = (107 numpad-plus, 187 equals) → zoom in;
		// - (109 numpad-minus, 189 dash) → zoom out (:1920-1923).
		case 107:
		case 187:
			game.dispatch({ type: "zoomIn" });
			return;
		case 109:
		case 189:
			game.dispatch({ type: "zoomOut" });
			return;
		// P → play (:1924).
		case 80:
			game.dispatch({ type: "play" });
			return;
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

/**
 * Paint the in-progress PRISMATIC slide axis into the overlay (world → screen):
 * a line from the recorded axis-start (first click) to the cursor. Faithful to
 * ControllerGame drawing the prismatic axis while actionStep == 1 (between the
 * two clicks of MaybeStart/FinishCreatingPrismaticJoint).
 */
function drawPrismaticAxisPreview(start: { x: number; y: number }, cur: { x: number; y: number }): void {
	if (!overlay || !app || !container.value) return;
	const rect = container.value.getBoundingClientRect();
	const cam = game.camera;
	const a = worldToScreen(start.x, start.y, cam, rect.width, rect.height);
	const b = worldToScreen(cur.x, cur.y, cam, rect.width, rect.height);
	overlay.clear();
	overlay.moveTo(a.x, a.y);
	overlay.lineTo(b.x, b.y);
	overlay.stroke({ width: 2, color: 0xffaa00, alpha: 0.9 });
	overlay.circle(a.x, a.y, 3);
	overlay.fill({ color: 0xffaa00, alpha: 0.9 });
}

/**
 * Paint the in-progress POLYGON into the overlay (world → screen): the placed
 * vertices as handles (the first, the close target, drawn larger/gold), the
 * edges between them, and a rubber-band from the last vertex to the cursor. Once
 * there are ≥ 2 placed vertices the closing edge back to the first is previewed
 * too so the author sees the shape that will be created. Cursor snaps the same
 * way placement does, so the preview matches the committed geometry.
 */
function drawPolygonPreview(): void {
	if (!overlay || !app || !container.value || polygonPoints.length === 0) return;
	const rect = container.value.getBoundingClientRect();
	const cam = game.camera;
	const toS = (p: { x: number; y: number }) => worldToScreen(p.x, p.y, cam, rect.width, rect.height);
	overlay.clear();
	const pts = polygonPoints.map(toS);
	const cursorWorld = pointerWorld ? snapGesturePoint(pointerWorld) : null;
	const cur = cursorWorld ? toS(cursorWorld) : null;
	// The previewed ring: placed vertices + the rubber-band cursor point.
	const ring = cur ? [...pts, cur] : pts;
	if (ring.length >= 3) {
		overlay.moveTo(ring[0].x, ring[0].y);
		for (let i = 1; i < ring.length; i++) overlay.lineTo(ring[i].x, ring[i].y);
		overlay.lineTo(ring[0].x, ring[0].y);
		overlay.fill({ color: 0x33aaff, alpha: 0.12 });
		overlay.stroke({ width: 2, color: 0x33aaff, alpha: 0.9 });
	} else {
		overlay.moveTo(ring[0].x, ring[0].y);
		for (let i = 1; i < ring.length; i++) overlay.lineTo(ring[i].x, ring[i].y);
		overlay.stroke({ width: 2, color: 0x33aaff, alpha: 0.9 });
	}
	// Vertex handles; the first vertex (the click-to-close target) is larger + gold.
	for (let i = 0; i < pts.length; i++) {
		overlay.circle(pts[i].x, pts[i].y, i === 0 ? 5 : 3);
		overlay.fill({ color: i === 0 ? 0xffcc00 : 0x33aaff, alpha: 0.95 });
	}
}

/**
 * Paint the condition box/line being drawn into the overlay (world → screen).
 * Faithful to the FinishDrawingCondition geometry the pick will commit: obj-0
 * draws the full box; obj-1/2 a horizontal segment at the first-click Y; obj-3/4
 * a vertical segment at the first-click X.
 */
function drawConditionPreview(first: { x: number; y: number }, cur: { x: number; y: number }): void {
	if (!overlay || !app || !container.value) return;
	const awaiting = game.conditionDraft?.awaiting;
	const rect = container.value.getBoundingClientRect();
	const cam = game.camera;
	const a = worldToScreen(first.x, first.y, cam, rect.width, rect.height);
	const b = worldToScreen(cur.x, cur.y, cam, rect.width, rect.height);
	overlay.clear();
	if (awaiting === "box") {
		const x = Math.min(a.x, b.x);
		const y = Math.min(a.y, b.y);
		overlay.rect(x, y, Math.abs(a.x - b.x), Math.abs(a.y - b.y));
		overlay.fill({ color: 0x33cc33, alpha: 0.12 });
		overlay.stroke({ width: 2, color: 0x33cc33, alpha: 0.9 });
	} else if (awaiting === "hline") {
		overlay.moveTo(a.x, a.y);
		overlay.lineTo(b.x, a.y);
		overlay.stroke({ width: 2, color: 0x33cc33, alpha: 0.9 });
	} else if (awaiting === "vline") {
		overlay.moveTo(a.x, a.y);
		overlay.lineTo(a.x, b.y);
		overlay.stroke({ width: 2, color: 0x33cc33, alpha: 0.9 });
	}
}

/** Draw a single frame via the original Draw renderer. */
function drawFrame(): void {
	if (!app || !draw) return;
	let state = game.state;

	// While running, advance the physics at a FIXED 30 steps/sec (the legacy stage
	// rate) via a wall-time accumulator, so playback speed is independent of the
	// monitor's refresh rate — stepping once per render frame ran the sim 2x+ too
	// fast on 60Hz+ displays. Catch up at most a few steps per frame after a hitch.
	if (state.sim.phase === "running") {
		simAccMs += app.ticker.deltaMS;
		let steps = 0;
		while (simAccMs >= SIM_FRAME_MS && steps < 4) {
			// Snapshot every body's pose BEFORE the step — the "previous" state the
			// interpolated draw blends from. On multi-step catch-up frames only the
			// last capture survives, i.e. prev is always exactly one step behind.
			if (state.world) interpolator.snapshot(state.world, getPhysicsBackend());
			game.dispatch({ type: "step" });
			simAccMs -= SIM_FRAME_MS;
			steps++;
		}
		// Re-read the state: stepping replaced the core's immutable snapshot
		// (sim frame, camera follow, challenge outcome...).
		state = game.state;
	} else {
		// Not running: drop any accumulated time so the next play starts fresh, and
		// drop the interpolation snapshots so nothing lerps from stale poses after
		// a reset/play/load (edit + paused draw raw body transforms).
		simAccMs = 0;
		interpolator.clear();
	}

	// Blend factor for this render frame: the accumulator leftover after stepping,
	// 0 = previous step's pose, 1 = current. Clamped for post-hitch frames where
	// the 4-step catch-up cap leaves more than one sim frame accumulated. Only
	// interpolate while running AND a pre-step snapshot exists; otherwise draw raw
	// (edit/paused, and the very first frame of a run).
	const running = state.sim.phase === "running";
	const alpha = Math.min(1, Math.max(0, simAccMs / SIM_FRAME_MS));
	draw.getRenderXForm =
		running && interpolator.hasSnapshot() ? (body) => interpolator.getXForm(body, alpha) : null;

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

	// Editing-phase fast camera pan (ControllerGame.as:6795-6835). Per frame while
	// an arrow key is held: base 10 px/frame, Ctrl = 30 (3x). NOTE: shipped Jaybit
	// had a decompiled quirk where LEFT panned 30 but RIGHT/UP/DOWN panned 40 (an
	// unconditional +10 with no `else`); we port the clear INTENT — a uniform 30 with
	// Ctrl. panCamera subtracts the screen delta from camera.offset (content follows),
	// so LEFT/UP use +step and RIGHT/DOWN use -step to scroll the view that way.
	if (state.sim.phase === "editing" && heldArrows.size > 0) {
		const step = ctrlDown ? 30 : 10;
		let dx = 0;
		let dy = 0;
		if (heldArrows.has(37)) dx += step; // LEFT
		if (heldArrows.has(39)) dx -= step; // RIGHT
		if (heldArrows.has(38)) dy += step; // UP
		if (heldArrows.has(40)) dy -= step; // DOWN
		if (dx !== 0 || dy !== 0) game.dispatch({ type: "panCamera", dx, dy, viewW: w, viewH: h });
	} else if (state.sim.phase !== "editing" && heldArrows.size > 0) {
		// Leaving the editor (e.g. play pressed with an arrow held) drops the pan.
		heldArrows.clear();
	}

	// Draw's screen transform is `worldX * m_drawScale - m_drawXOff` (no implicit
	// canvas-center offset). To centre the world origin the way the editor camera
	// expects — screen = canvas/2 + world*scale - offset — set the offsets so the
	// two transforms are identical. This keeps hit-testing (screenToWorld, which
	// uses the canvas/2 convention) aligned with what Draw paints.
	//
	// Camera-follow smoothing: the core's handleCamera re-centres the camera on
	// the focused part once per 30fps STEP, which stutters when rendering at the
	// display rate. While running (and not replaying — the replay owns the camera
	// stream then), derive the follow offset RENDER-side each frame from the SAME
	// interpolated body pose the shapes are drawn at, so the pan is exactly as
	// smooth as the robot. Zoom/limits and the core's camera commands are intact —
	// this only re-derives the per-frame follow offset from the focus part.
	let camera = state.camera;
	if (running && !state.replay.playing) {
		// Same pick as GameCore.cameraFocusPart: the LAST enabled focus ShapePart.
		let focus: ShapePart | null = null;
		for (const p of state.parts) {
			if (p instanceof ShapePart && p.isCameraFocus && p.isEnabled) focus = p;
		}
		const body = focus?.GetBody();
		if (body) {
			const c = interpolator.worldCenter(body, alpha);
			const nx = c.x * camera.scale;
			const ny = c.y * camera.scale;
			// NaN guard mirrors GameCore.handleCamera (:3183).
			if (!isNaN(nx) && !isNaN(ny)) camera = { ...camera, offsetX: nx, offsetY: ny };
		}
	}
	draw.m_drawScale = camera.scale;
	draw.m_drawXOff = camera.offsetX - w / 2;
	draw.m_drawYOff = camera.offsetY - h / 2;
	// Feed the live viewport size to Draw's on-screen culling. The base
	// b2DebugDraw hardcodes an 800x600 stage (legacy Flash), which clips every
	// shape drawn past ~800x600; Draw overrides the cull to use these instead so
	// the whole responsive canvas is drawable, not just the top-left 800x600.
	draw.m_screenWidth = w;
	draw.m_screenHeight = h;
	// View-menu flag: colourBox -> Draw.drawColours (ControllerGame.ts:590).
	draw.drawColours = state.edit.showColours;

	// Sky/background: build for the current sandbox settings (cheap no-op unless
	// they changed) then reposition/drift each frame. Cloud drift is gated on the
	// sim NOT running-paused, mirroring Sky.Update's !IsPaused() (Sky.ts:126).
	if (sky) {
		sky.build(state.sandbox);
		sky.update(camera, state.sandbox.bounds, w, h, state.sim.phase === "paused");
	}

	// Sandbox terrain visual (sGround port): build for the current sandbox settings
	// (cheap no-op unless terrainType/size/theme changed) then rescale/reposition to
	// the world each frame. The sandbox ground's collision bodies (isSandbox) are
	// excluded from DrawWorld below so they don't double-draw over this; CUSTOM
	// challenge/tutorial terrain (not isSandbox) IS drawn by DrawWorld.
	if (ground) {
		ground.build(state.sandbox);
		ground.update(camera, w, h);
	}

	// Tutorial terrain visual (sGround1/2/3 port): built once, repositioned each
	// frame. Only shown for the base-terrain tutorials — Tank/Shapes/Car/Jumpbot/
	// Dumpbot/Catapult (levelIndex 0-5, which load buildBaseTerrain via
	// getTutorialSetup in src/core/tutorials.ts). Hidden for the sandbox tutorials
	// (6-8), the challenge-editor tutorial (9), the built-in challenges (10-13),
	// and any non-tutorial session.
	if (tutorialGround) {
		tutorialGround.build();
		tutorialGround.update(camera, w, h);
		const tut = state.tutorial;
		tutorialGround.view.visible = !!tut && tut.active && tut.levelIndex >= 0 && tut.levelIndex <= 5;
	}

	// Built-in challenge terrain visual (Climb / Monkey Bars sGround port): built
	// once per active built-in (rebuilt when it changes), repositioned each frame.
	// Only shown for the two hardcoded challenges with bespoke sGround geometry;
	// Race/Spaceship draw their terrain via the sandbox GroundRenderer above.
	if (challengeGround) {
		const builtIn = state.challenge?.builtIn ?? null;
		challengeGround.build(builtIn);
		challengeGround.update(camera, w, h);
		challengeGround.view.visible = builtIn === "climb" || builtIn === "monkeyBars";
	}

	// Editor grid: redraw for the current camera each frame. Edit-mode only —
	// IB3 only ever shows the grid in the editor (GameControl.gridButton
	// :4235-4241; the sim screens never enable it).
	if (grid) {
		grid.update(
			camera,
			w,
			h,
			uiPrefs.gridEnabled.value && state.sim.phase === "editing",
			uiPrefs.gridSpacing.value,
		);
	}

	// Water layer: translucent quad + animated surface (tide offset/tilt or
	// wave profile) from the core's read-model; static surface at
	// sandbox.water.height while editing (state.water is null then).
	if (water) {
		water.update(camera, w, h, state.sandbox.water, state.water);
	}

	// Map selection ids -> live Part instances for highlight.
	const selected = new Set(state.edit.selection);
	const selectedParts: Part[] = state.parts.filter((p) => selected.has(p.id));

	// Joint visualization (Jaybit HighlightForJoint, ControllerGame.as:2632-2645):
	// when exactly one JOINT is selected, blink the two shapes it connects (±0.1
	// fill alpha, applied in Draw). Render-derived, NOT a flag on parts. Gated behind
	// the "Highlight Parts for Joint" pref (default on).
	let jvIds: Set<number> | null = null;
	if (uiPrefs.highlightPartsForJoint.value && selectedParts.length === 1) {
		const j = selectedParts[0];
		if (j instanceof JointPart) {
			jvIds = new Set<number>();
			if (j.part1) jvIds.add(j.part1.id);
			if (j.part2) jvIds.add(j.part2.id);
		}
	}

	const notStarted = state.sim.phase !== "running";
	// drawStatic=false — faithful to ControllerGame.ts:640. Static NON-EDITABLE
	// terrain (both the sandbox ground AND custom challenge/tutorial terrain) has
	// drawAnyway=false collision bodies that are NEVER drawn by DrawWorld; in the
	// legacy the VISIBLE terrain is a separate decorative sGround visual (the sandbox
	// GroundRenderer, and — for tutorials/challenges — the per-level sGround1/2/3
	// grass/dirt/rock geometry, ControllerTutorial.ts:285+). Drawing the raw collision
	// parts here would show uncoloured red triangles, so we don't. Editable static
	// parts and drawAnyway=true parts still draw via the gate in Draw.DrawWorld.
	// DrawWorld(allParts, selectedParts, world, notStarted, drawStatic,
	//           showJoints, showOutlines, challenge)  — see Draw.ts:75.
	draw.DrawWorld(
		state.parts as Part[],
		selectedParts,
		state.world,
		notStarted,
		/* drawStatic */ false,
		// View-menu flags (ControllerGame.ts:641-642 pass showJoints/showOutlines).
		/* showJoints */ state.edit.showJoints,
		/* showOutlines */ state.edit.showOutlines,
		// Live Challenge (or null): Draw paints win/loss condition zones when the
		// sim is not started, or always if showConditions is set (Draw.ts:129-164).
		/* challenge */ game.liveChallenge() as any,
		// Joint-visualization highlight set (the two shapes of the selected joint).
		/* highlightForJVIds */ jvIds as any
	);

	// While a shape-creation drag is in progress, paint the in-progress shape
	// over the world using the ORIGINAL renderer's DrawTempShape so the preview
	// matches the finished shape's look (Draw.ts:819). It reuses the same Draw
	// sprite DrawWorld just painted into, so it must run each frame after it.
	drawShapePreview();

	// Polygon multi-click preview: the placed vertices + rubber-band edge to the
	// cursor, painted into the OVERLAY (not the Draw sprite — it's an N-vertex
	// in-progress shape DrawTempShape can't express). Only touches the overlay
	// while a polygon is mid-construction, so it never fights the marquee /
	// prismatic-axis / condition previews (all on mutually-exclusive tools).
	if (polygonPoints.length > 0) drawPolygonPreview();
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

	// Triangle, second step: base committed, apex tracks the cursor. Resolve the
	// apex with the same MaxTriangle/Shift-snapping the finalize uses so the preview
	// shows exactly the triangle that will be created.
	if (triangleBase && pointerWorld) {
		const { v1, v2 } = triangleBase;
		const apex = resolveTriangleApex(v1, v2, pointerWorld);
		draw.DrawTempShape(ControllerGameGlobals.NEW_TRIANGLE, 2, v1.x, v1.y, v2.x, v2.y, apex.x, apex.y);
		return;
	}

	if (gesture.kind !== "create") return;
	const { shape, start } = gesture;
	// Resolve the live cursor with the held modifiers (rect square / triangle base
	// 15°) so the preview matches the finalize.
	const current = resolveCreateCurrent(shape, start, gesture.current);
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

/**
 * Resolve the live cursor point for a circle/rect/triangle-BASE create gesture,
 * applying the held modifiers (Jaybit ControllerGame.as:10392 rect square /
 * :10463 triangle base 15°). Circle is unaffected. Used by both the finalize
 * dispatch and the preview so they always match.
 *   - rect + Shift → Util.RestrictToSquares on the (dx,dy) from the anchor.
 *   - triangle base + Shift → Util.FifteenAngleIncrements about the anchor.
 */
function resolveCreateCurrent(
	shape: ShapeKind,
	start: { x: number; y: number },
	current: { x: number; y: number },
): { x: number; y: number } {
	// Grid snapping first (IB3 grid port): quantize the raw cursor to the grid,
	// then let the explicit Shift modifiers act on the snapped point — the
	// square restriction preserves grid alignment (grid-multiple deltas stay
	// grid multiples); the 15° base snap intentionally wins over the grid.
	current = snapGesturePoint(current);
	if (!shiftDown) return current;
	if (shape === "rect") {
		const [dx, dy] = RestrictToSquares(current.x - start.x, current.y - start.y);
		return { x: start.x + dx, y: start.y + dy };
	}
	if (shape === "triangle") {
		const [x, y] = FifteenAngleIncrements(current.x, current.y, start.x, start.y);
		return { x, y };
	}
	return current;
}

/**
 * Resolve a triangle APEX from the raw cursor point (Jaybit ControllerGame.as:
 * 10496-10500). MaxTriangle clamp is ALWAYS applied (3rd click lands the largest
 * legal triangle in the cursor direction instead of being rejected). With Shift,
 * SnapToCommonTriangles overrides it: perpendicular-constrained right/isosceles
 * (+0.5-unit common-height snap when the "Triangle Snapping" pref is on), or
 * equilateral with Shift+Ctrl. Uses the committed base (v1,v2) and RAW mouse.
 */
function resolveTriangleApex(
	v1: { x: number; y: number },
	v2: { x: number; y: number },
	mouse: { x: number; y: number },
): { x: number; y: number } {
	// Grid snapping (IB3 grid port): quantize the raw cursor before the
	// legality clamp/modifier snaps, so an in-range apex lands on the grid while
	// MaxTriangle/SnapToCommonTriangles keep the final say on legal geometry.
	mouse = snapGesturePoint(mouse);
	let [ax, ay] = MaxTriangle(
		mouse.x,
		mouse.y,
		v1.x,
		v1.y,
		v2.x,
		v2.y,
		Triangle.MAX_SIDE_LENGTH,
		Triangle.MIN_SIDE_LENGTH,
		Triangle.MIN_TRIANGLE_ANGLE,
	);
	if (shiftDown) {
		[ax, ay] = SnapToCommonTriangles(
			mouse.x,
			mouse.y,
			v1.x,
			v1.y,
			v2.x,
			v2.y,
			game.camera.scale, // physScale — unused inside, kept for signature fidelity.
			ctrlDown, // Shift+Ctrl → equilateral.
			uiPrefs.triangleSnapping.value, // gates the common-triangle height snaps.
			Triangle.MAX_SIDE_LENGTH,
			Triangle.MIN_SIDE_LENGTH,
			Triangle.MIN_TRIANGLE_ANGLE,
		);
	}
	return { x: ax, y: ay };
}

/**
 * Handle one click of the polygon multi-click gesture. `world` is the raw cursor
 * (grid-snapped here at the same FINAL-geometry funnel as the other create
 * gestures); `closeRequested` is true for a double-click. Closing (>= 3 verts):
 * a click near the FIRST vertex or a double-click commits the ring. Otherwise
 * the click APPENDS a vertex, but only if it keeps the closed ring convex
 * (b2PolygonShape requires convex — it doesn't validate), stays within
 * Polygon.MAX_VERTICES, and is at least Polygon.MIN_SIDE_LENGTH from the previous
 * vertex; a click that would violate any of these is IGNORED (rejected).
 */
function handlePolygonClick(world: { x: number; y: number }, closeRequested: boolean): void {
	const snapped = snapGesturePoint(world);
	const n = polygonPoints.length;
	// Close threshold in world units: a small screen distance scaled by the camera
	// (same world-from-pixels convention as screenToWorld / the joint threshold).
	const closeThresh = 12 / game.camera.scale;
	if (n >= 3) {
		const first = polygonPoints[0];
		const distToFirst = Math.hypot(snapped.x - first.x, snapped.y - first.y);
		if (closeRequested || distToFirst <= closeThresh) {
			commitPolygon();
			return;
		}
	}
	// At the vertex cap only the close action (handled above) is possible.
	if (n >= Polygon.MAX_VERTICES) return;
	// Minimum side length: ignore a vertex too close to the previous one
	// (accidental double placement / noise) — PolygonPart.SIDE_MIN_LENGTH.
	if (n > 0) {
		const prev = polygonPoints[n - 1];
		if (Math.hypot(snapped.x - prev.x, snapped.y - prev.y) < Polygon.MIN_SIDE_LENGTH) return;
	}
	// Convexity: reject a vertex that would make the CLOSED ring non-convex.
	// isConvex is winding-agnostic and treats the list as a closed ring (so it
	// tests the wrap-around edges too), matching what the b2PolygonShape will be.
	const candidate = [...polygonPoints, { x: snapped.x, y: snapped.y }];
	if (candidate.length >= 3 && !Polygon.isConvex(candidate)) return;
	polygonPoints = candidate;
}

/**
 * Commit the in-progress polygon: dispatch createPolygon with the accumulated
 * ring (only when it is a valid convex 3..MAX_VERTICES polygon — the gesture
 * keeps it so, but re-check defensively) and reset the gesture. GameCore builds,
 * adds and selects the Polygon part through the same undoable history path as
 * every other create.
 */
function commitPolygon(): void {
	if (polygonPoints.length >= 3 && polygonPoints.length <= Polygon.MAX_VERTICES && Polygon.isConvex(polygonPoints)) {
		game.dispatch({ type: "createPolygon", verts: polygonPoints.map((p) => ({ x: p.x, y: p.y })) });
	}
	polygonPoints = [];
	overlay?.clear();
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
	// Sky/background sits at the BOTTOM of the stage so the world draws over it.
	sky = new SkyRenderer();
	app.stage.addChild(sky.view);
	// Preload cloud textures; the next drawFrame rebuilds the sky with them.
	void sky.preload();

	// Static terrain visual, above the sky and below the world Draw sprite.
	ground = new GroundRenderer();
	app.stage.addChild(ground.view);

	// Tutorial terrain visual, above the sandbox ground and below the world Draw
	// sprite (so the world/robot draws over it). Its view.visible is toggled per
	// frame in drawFrame based on the active tutorial level.
	tutorialGround = new TutorialGroundRenderer();
	app.stage.addChild(tutorialGround.view);

	// Built-in challenge terrain visual (Climb / Monkey Bars), same layer as the
	// tutorial ground: above the sandbox ground, below the world Draw sprite.
	challengeGround = new ChallengeGroundRenderer();
	app.stage.addChild(challengeGround.view);

	// Editor grid (IB3 GridControl.as port), above the terrain visuals and below
	// the world Draw sprite so parts render over the grid lines. Drawn per frame
	// in drawFrame, only while editing with the gridEnabled pref on.
	grid = new GridRenderer();
	app.stage.addChild(grid.view);

	drawSprite = new Graphics();
	app.stage.addChild(drawSprite);
	draw = new Draw();
	draw.m_sprite = drawSprite;

	// Water layer, in FRONT of the world Draw sprite (IB3 SandboxControl.Init
	// puts waterControl above the parts) and below the marquee overlay.
	water = new WaterRenderer();
	app.stage.addChild(water.view);

	// Marquee overlay lives above the Draw sprite; Draw never touches it.
	overlay = new Graphics();
	app.stage.addChild(overlay);

	tickerFn = () => drawFrame();
	app.ticker.add(tickerFn);

	container.value.addEventListener("pointerdown", onPointerDown);
	container.value.addEventListener("pointermove", onPointerMove);
	container.value.addEventListener("pointerup", onPointerUp);
	container.value.addEventListener("pointercancel", onPointerUp);
	// Live keyboard control during the running sim. Bound on window (like the
	// legacy global Input listeners) so the robot is drivable without the canvas
	// having to hold focus; the handlers no-op unless the sim is running.
	window.addEventListener("keydown", onKeyDown);
	window.addEventListener("keyup", onKeyUp);
	// If focus leaves the window while a key is held, the matching keyup never
	// fires — clear the held-arrow / modifier state so pan doesn't get stuck.
	window.addEventListener("blur", onWindowBlur);

	// Keep the Pixi renderer exactly the size of its container. We read the
	// container's LIVE clientWidth/clientHeight (border-box content area) rather
	// than the observer's contentRect: drawFrame derives its world transform from
	// clientWidth/clientHeight, so sizing the renderer from the same source keeps
	// the drawn world, the pointer math, and the backing store in lockstep — no
	// gray band from a renderer sized smaller than the (now full-bleed) container.
	const resizeToContainer = (): void => {
		if (!app || !container.value) return;
		const cw = Math.max(1, Math.floor(container.value.clientWidth));
		const ch = Math.max(1, Math.floor(container.value.clientHeight));
		if (app.renderer.width !== cw || app.renderer.height !== ch) {
			app.renderer.resize(cw, ch);
		}
	};
	resizeObserver = new ResizeObserver(() => resizeToContainer());
	resizeObserver.observe(container.value);
	// The container may have grown to its full-bleed size while Application.init()
	// was awaiting (the observer is only attached now, so it would otherwise miss
	// that first layout). Force one resize to the current size immediately.
	resizeToContainer();
});

onBeforeUnmount(() => {
	if (container.value) {
		container.value.removeEventListener("pointerdown", onPointerDown);
		container.value.removeEventListener("pointermove", onPointerMove);
		container.value.removeEventListener("pointerup", onPointerUp);
		container.value.removeEventListener("pointercancel", onPointerUp);
	}
	window.removeEventListener("keydown", onKeyDown);
	window.removeEventListener("keyup", onKeyUp);
	window.removeEventListener("blur", onWindowBlur);
	resizeObserver?.disconnect();
	resizeObserver = null;
	if (app && tickerFn) app.ticker.remove(tickerFn);
	tickerFn = null;
	draw = null;
	drawSprite = null;
	overlay = null;
	sky = null;
	ground?.destroy();
	ground = null;
	tutorialGround?.destroy();
	tutorialGround = null;
	challengeGround?.destroy();
	challengeGround = null;
	grid?.destroy();
	grid = null;
	water?.destroy();
	water = null;
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
