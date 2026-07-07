// Pointer / gesture handling for the game canvas, extracted from GameCanvas.vue
// (behavior-preserving).
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
//
// All pixi handles (app / Draw / the overlay Graphics) are read LIVE off the
// RendererStack, which is initialized asynchronously after mount — every
// handler already null-guards them, exactly as GameCanvas did.

import { watch, type Ref } from "vue";
import { ControllerGameGlobals } from "../../Game/Globals/ControllerGameGlobals";
import { Triangle } from "../../Parts/Triangle";
import { Polygon } from "../../Parts/Polygon";
import { selectedPolyPoint } from "../polygonEditState";
import {
	RestrictToSquares,
	FifteenAngleIncrements,
	MaxTriangle,
	SnapToCommonTriangles,
	SnapToGrid,
} from "../snapping";
import { screenToWorld, worldToScreen, hitTestPart, partsInBox } from "../renderer/sceneRenderer";
import type { ToolMode } from "../../core";
import type { RendererStack } from "../renderer/rendererStack";
import type { ModifierState } from "./modifierState";
import type { useGameStore } from "../gameStore";
import type { useUiPrefs } from "../uiPrefs";

type GameStore = ReturnType<typeof useGameStore>;
type UiPrefs = ReturnType<typeof useUiPrefs>;

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

const toolToShapeKind: Partial<Record<ToolMode, "circle" | "rect" | "triangle" | "bomb">> = {
	newCircle: "circle",
	newRect: "rect",
	newTriangle: "triangle",
	newBomb: "bomb",
};

export function useCanvasPointer(deps: {
	game: GameStore;
	uiPrefs: UiPrefs;
	container: Ref<HTMLDivElement | null>;
	stack: RendererStack;
	mods: ModifierState;
}) {
	const { game, uiPrefs, container, stack, mods } = deps;

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
		| { kind: "create"; shape: ShapeKind; start: { x: number; y: number }; current: { x: number; y: number } }
		// Pen-tool polygon CREATE drag: after a pointer-down places a new vertex, a
		// drag (before release) pulls out SYMMETRIC bézier handles for it — like a
		// vector pen tool. `index` is the just-placed polygonPoints entry; `anchor` is
		// its vertex (world). On move the outgoing handle tracks the cursor and the
		// incoming handle mirrors it; on release, a negligible drag stays a corner.
		| { kind: "polyPen"; index: number; anchor: { x: number; y: number } }
		// Post-creation Polygon point edit: drag a control vertex or one of its bézier
		// handle endpoints. `part` selects which element; `live` is its current world
		// position (updated on move for the overlay preview) and is committed to the
		// core via editPolygonPoint on release (one undo step per drag).
		| { kind: "polyPoint"; partId: number; index: number; part: "vertex" | "in" | "out"; live: { x: number; y: number }; moved: boolean };

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
	// Each entry carries its vertex plus its cubic-bézier handle ENDPOINTS (absolute
	// world coords; equal to the vertex for a plain corner) and its smoothing `type`
	// (Polygon.POINT_*). A plain click leaves the handles at the vertex (VERTEX); a
	// click-drag pulls them out symmetric (SYMMETRIC). commitPolygon converts the
	// endpoints to per-vertex offsets for the createPolygon command.
	type PenPoint = { x: number; y: number; inX: number; inY: number; outX: number; outY: number; type: number };
	let polygonPoints: PenPoint[] = [];

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

	// Reset the condition pick's first-click + preview whenever a pick starts,
	// finalizes, or is cancelled (the draft's awaiting field changes). Prevents a
	// stale first corner from leaking between picks.
	watch(
		() => game.conditionDraft?.awaiting ?? null,
		() => {
			conditionFirstClick = null;
			stack.overlay?.clear();
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
				stack.overlay?.clear();
			}
			// Abort an in-progress prismatic two-click / joint disambiguation when the
			// tool changes or the sim leaves editing (legacy resets curAction/actionStep
			// + clears highlightForJoint on a new tool button).
			if (game.jointGesture) {
				game.dispatch({ type: "cancelJointGesture" });
				jointDisambiguateStart = null;
				stack.overlay?.clear();
			}
		},
	);

	// Reset the active polygon control-point selection whenever the selected part
	// changes (a different part / nothing selected) or the tool leaves select, so
	// the point-edit UI + handles don't refer to a stale index.
	watch(
		() => [game.edit.selectedPart?.id ?? null, game.edit.selectedPart?.kind ?? null, game.edit.tool],
		() => {
			if (game.edit.selectedPart?.kind !== "Polygon" || game.edit.tool !== "select") {
				selectedPolyPoint.value = null;
			}
		},
	);

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
		stack.overlay?.clear();
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
		if (!stack.app || !container.value) return;
		mods.update(event);

		const s = screenOf(event);

		// Track this pointer. When a SECOND pointer lands, ENTER pinch mode: abort
		// any in-progress single-pointer gesture and seed the pinch midpoint/distance.
		activePointers.set(event.pointerId, { x: s.x, y: s.y });
		// Capture EVERY pointer up front (not just gesture-starting branches): the
		// pointerup/cancel must always reach this container so activePointers is
		// pruned. Click-tools that return early below (thruster/cannon/joint/text/
		// triangle apex/condition pick) used to skip capture, so a release OUTSIDE
		// the container leaked the entry and a later pen/touch contact saw size===2
		// and falsely entered pinch mode. All pointer listeners live on this
		// container, so capturing here changes delivery for no one else.
		container.value.setPointerCapture(event.pointerId);
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
					stack.overlay?.clear();
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
			return;
		}
		// Editing gestures are disabled while paused (matches ControllerGame's
		// `if (!this.simStarted)` guard around MouseDrag, ControllerGame.ts:1255).
		if (game.sim.phase !== "editing") return;

		const tool = game.edit.tool;
		const shapeKind = toolToShapeKind[tool as ToolMode];

		// SHIFT-drag ALWAYS marquee-selects, regardless of the active tool — the
		// desktop power gesture from the original editor (ControllerGame's shift =
		// BOX_SELECTING, :1466-1469). Holding shift on EMPTY space overrides the
		// tool's normal drag (pan in "pan" mode, create in a create tool, rotate/
		// resize/joint placement) and starts a box multi-select instead. Guards:
		//   • single-pointer only — a second finger already returned above (pinch),
		//     so shift-marquee can never fight the two-finger pinch-zoom.
		//   • EMPTY space only (no part under the cursor) so it never hijacks a
		//     part-drag or the select tool's shift-click-toggle (which lands ON a part).
		//   • not while a multi-step tool gesture is mid-flight (triangle apex,
		//     polygon ring, prismatic axis, >2-overlap joint disambiguation) — there
		//     shift keeps its per-step meaning (angle snap / etc), so we don't steal it.
		// The Select tool marquees on an empty-space drag even WITHOUT shift (handled
		// in the empty-space branch below); this block adds the shift path for every
		// OTHER tool.
		if (
			mods.shift &&
			!triangleBase &&
			polygonPoints.length === 0 &&
			game.jointGesture?.phase !== "disambiguate" &&
			game.jointGesture?.phase !== "prismaticAxis" &&
			!hitTestPart(game.parts, world.x, world.y, camera.scale)
		) {
			game.dispatch({ type: "clearSelection" });
			gesture = { kind: "marquee", origin: { x: world.x, y: world.y }, current: { x: world.x, y: world.y } };
			return;
		}

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
			const placed = handlePolygonClick(world, event.detail >= 2);
			// A newly-placed (non-closing) vertex begins a pen-tool drag: holding and
			// dragging before release pulls out its symmetric bézier handles.
			if (placed >= 0) {
				const v = polygonPoints[placed];
				gesture = { kind: "polyPen", index: placed, anchor: { x: v.x, y: v.y } };
			}
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
				stack.overlay?.clear();
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
			return;
		}

		// "pan" is the DESELECTED tool (Select toggled off; see Command.ts ToolMode):
		// there is no active editing tool, so a single-pointer drag simply PANS the
		// world — no select, no marquee, no part-drag. This is the mode a user drops
		// into to navigate the sandbox. (Two-finger pinch is handled upstream and is
		// unaffected; it aborts any single-pointer gesture on the second pointer.)
		if (tool === "pan") {
			gesture = { kind: "pan", lastScreen: { x: s.x, y: s.y } };
			return;
		}

		if (tool !== "select") return;

		// Post-creation Polygon point editing: when exactly one Polygon is selected,
		// a press near one of its control vertices or (for the active point) its
		// bézier handle endpoints begins a drag of that element. Takes priority over
		// the normal part select/drag so points on top of the shape are grabbable.
		const polyHit = hitPolygonEditElement(s.x, s.y);
		if (polyHit) {
			if (polyHit.part === "vertex") selectedPolyPoint.value = polyHit.index;
			const sp = game.edit.selectedPart;
			const pt = sp?.polyPoints?.[polyHit.index];
			const live =
				polyHit.part === "vertex"
					? { x: pt!.x, y: pt!.y }
					: polyHit.part === "in"
						? { x: pt!.inX, y: pt!.inY }
						: { x: pt!.outX, y: pt!.outY };
			gesture = { kind: "polyPoint", partId: sp!.id, index: polyHit.index, part: polyHit.part, live, moved: false };
			return;
		}

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
			return;
		}

		// Pointer-down on empty space while the SELECT tool is active
		// (ControllerGame.ts:1466-1486). The legacy editor split on the shift key:
		// SHIFT held → BOX_SELECTING marquee (:1466-1469); no modifier → PAN by
		// dragging (:1471-1476). We DEVIATE deliberately: with the Select tool active
		// the marquee TAKES PRECEDENCE and an empty-space drag ALWAYS draws it,
		// suppressing pan. This is what makes box multi-select work on touch, where
		// there is no shift key to hold; panning now lives in the deselected "pan"
		// tool (handled above — toggle Select off to pan). The current selection is
		// still cleared first, matching the legacy empty-down (:1479); a modifier no
		// longer changes the gesture (marquee commit replaces the selection either
		// way).
		game.dispatch({ type: "clearSelection" });
		gesture = { kind: "marquee", origin: { x: world.x, y: world.y }, current: { x: world.x, y: world.y } };
	}

	function onPointerMove(event: PointerEvent): void {
		if (!stack.app || !container.value) return;
		mods.update(event);

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
			const target = mods.shift ? Math.round(gesture.rawTotal / step) * step : gesture.rawTotal;
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

		if (gesture.kind === "polyPen") {
			// Pull out SYMMETRIC handles for the just-placed vertex: the outgoing handle
			// follows the cursor, the incoming handle mirrors it about the vertex.
			const p = polygonPoints[gesture.index];
			if (p) {
				p.outX = world.x;
				p.outY = world.y;
				p.inX = 2 * gesture.anchor.x - world.x;
				p.inY = 2 * gesture.anchor.y - world.y;
				p.type = Math.hypot(world.x - gesture.anchor.x, world.y - gesture.anchor.y) > 0.05 ? Polygon.POINT_SYMMETRIC : Polygon.POINT_VERTEX;
				if (p.type === Polygon.POINT_VERTEX) {
					p.inX = p.x; p.inY = p.y; p.outX = p.x; p.outY = p.y;
				}
			}
			return;
		}

		if (gesture.kind === "polyPoint") {
			// Track the dragged vertex/handle for the overlay preview; the commit to the
			// core happens on release (editPolygonPoint). Vertex drags are grid-snapped.
			const w = gesture.part === "vertex" ? snapGesturePoint({ x: world.x, y: world.y }) : { x: world.x, y: world.y };
			gesture.live = { x: w.x, y: w.y };
			gesture.moved = true;
			return;
		}
	}

	function onPointerUp(event: PointerEvent): void {
		if (!container.value) return;
		mods.update(event);

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
		} else if (gesture.kind === "polyPen") {
			// The pen drag ended: the vertex + its handles are already recorded in
			// polygonPoints (updated live on move). Nothing to commit until the ring
			// closes; just end the gesture (drawFrame keeps previewing the ring).
			gesture = { kind: "none" };
			try {
				container.value.releasePointerCapture(event.pointerId);
			} catch {
				// ignore
			}
			return;
		} else if (gesture.kind === "polyPoint") {
			// Commit the point/handle drag through the undoable command. Only dispatch
			// when the cursor actually moved (a plain click just (re)selects the point).
			if (gesture.moved) {
				const g = gesture;
				const sp = game.edit.selectedPart;
				const pt = sp?.polyPoints?.[g.index];
				if (pt) {
					if (g.part === "vertex") {
						game.dispatch({ type: "editPolygonPoint", partId: g.partId, index: g.index, x: g.live.x, y: g.live.y });
					} else {
						// Handle endpoint → offset relative to the (rotated) vertex. The core
						// bakes rotation, so pass the world offset; for an unrotated polygon
						// (the common case) world == baseline.
						const off = { x: g.live.x - pt.x, y: g.live.y - pt.y };
						if (g.part === "in") game.dispatch({ type: "editPolygonPoint", partId: g.partId, index: g.index, handleIn: off });
						else game.dispatch({ type: "editPolygonPoint", partId: g.partId, index: g.index, handleOut: off });
					}
				}
			}
			gesture = { kind: "none" };
			try {
				container.value.releasePointerCapture(event.pointerId);
			} catch {
				// ignore
			}
			return;
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
		const overlay = stack.overlay;
		if (!overlay || !stack.app || gesture.kind !== "marquee" || !container.value) return;
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
		stack.overlay?.clear();
	}

	/**
	 * Paint the in-progress PRISMATIC slide axis into the overlay (world → screen):
	 * a line from the recorded axis-start (first click) to the cursor. Faithful to
	 * ControllerGame drawing the prismatic axis while actionStep == 1 (between the
	 * two clicks of MaybeStart/FinishCreatingPrismaticJoint).
	 */
	function drawPrismaticAxisPreview(start: { x: number; y: number }, cur: { x: number; y: number }): void {
		const overlay = stack.overlay;
		if (!overlay || !stack.app || !container.value) return;
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
		const overlay = stack.overlay;
		if (!overlay || !stack.app || !container.value || polygonPoints.length === 0) return;
		const rect = container.value.getBoundingClientRect();
		const cam = game.camera;
		const toS = (p: { x: number; y: number }) => worldToScreen(p.x, p.y, cam, rect.width, rect.height);
		overlay.clear();
		// Control ring (world) + per-vertex handle OFFSETS from the pen points, plus a
		// rubber-band cursor as a temporary trailing corner.
		const ctrl = polygonPoints.map((p) => ({ x: p.x, y: p.y }));
		const hIn = polygonPoints.map((p) => ({ x: p.inX - p.x, y: p.inY - p.y }));
		const hOut = polygonPoints.map((p) => ({ x: p.outX - p.x, y: p.outY - p.y }));
		const cursorWorld = pointerWorld ? snapGesturePoint(pointerWorld) : null;
		if (cursorWorld) {
			ctrl.push({ x: cursorWorld.x, y: cursorWorld.y });
			hIn.push({ x: 0, y: 0 });
			hOut.push({ x: 0, y: 0 });
		}
		// Tessellate the (possibly curved) preview ring and map to screen.
		const ringS = Polygon.tessellateRing(ctrl, hIn, hOut, Polygon.BEZIER_SAMPLES).map(toS);
		if (ringS.length >= 3) {
			overlay.moveTo(ringS[0].x, ringS[0].y);
			for (let i = 1; i < ringS.length; i++) overlay.lineTo(ringS[i].x, ringS[i].y);
			overlay.lineTo(ringS[0].x, ringS[0].y);
			overlay.fill({ color: 0x33aaff, alpha: 0.12 });
			overlay.stroke({ width: 2, color: 0x33aaff, alpha: 0.9 });
		} else {
			overlay.moveTo(ringS[0].x, ringS[0].y);
			for (let i = 1; i < ringS.length; i++) overlay.lineTo(ringS[i].x, ringS[i].y);
			overlay.stroke({ width: 2, color: 0x33aaff, alpha: 0.9 });
		}
		// Handle guides for any curved pen point (line vertex→handle + a small dot).
		for (let i = 0; i < polygonPoints.length; i++) {
			const p = polygonPoints[i];
			if (p.type === Polygon.POINT_VERTEX) continue;
			const v = toS(p);
			for (const h of [{ x: p.inX, y: p.inY }, { x: p.outX, y: p.outY }]) {
				const hs = toS(h);
				overlay.moveTo(v.x, v.y);
				overlay.lineTo(hs.x, hs.y);
				overlay.stroke({ width: 1, color: 0x22dd88, alpha: 0.85 });
				overlay.circle(hs.x, hs.y, 3);
				overlay.fill({ color: 0x22dd88, alpha: 0.9 });
			}
		}
		// Vertex dots; the first vertex (the click-to-close target) is larger + gold.
		for (let i = 0; i < polygonPoints.length; i++) {
			const v = toS(polygonPoints[i]);
			overlay.circle(v.x, v.y, i === 0 ? 5 : 3);
			overlay.fill({ color: i === 0 ? 0xffcc00 : 0x33aaff, alpha: 0.95 });
		}
	}

	// Whether the post-creation polygon point-edit overlay should be shown this frame.
	function shouldShowPolyEdit(): boolean {
		return (
			game.sim.phase === "editing" &&
			game.edit.tool === "select" &&
			game.edit.selection.length === 1 &&
			game.edit.selectedPart?.kind === "Polygon" &&
			!!game.edit.selectedPart?.polyPoints &&
			polygonPoints.length === 0 &&
			gesture.kind !== "marquee" &&
			gesture.kind !== "pan"
		);
	}

	let polyEditOverlayActive = false;

	/**
	 * Paint the selected Polygon's editable control points (and the active point's
	 * bézier handles) into the overlay, plus the live drag preview of a point/handle
	 * being moved. Screen-space; repainted each frame while a single Polygon is
	 * selected with the Select tool.
	 */
	function drawPolygonEditOverlay(): void {
		const overlay = stack.overlay;
		if (!overlay || !stack.app || !container.value) return;
		const sp = game.edit.selectedPart;
		if (!sp || !sp.polyPoints) return;
		const rect = container.value.getBoundingClientRect();
		const cam = game.camera;
		const toS = (x: number, y: number) => worldToScreen(x, y, cam, rect.width, rect.height);
		overlay.clear();

		// A live drag overrides the dragged element's position for the preview.
		const drag = gesture.kind === "polyPoint" ? gesture : null;
		const pts = sp.polyPoints.map((pt, i) => {
			let x = pt.x;
			let y = pt.y;
			let inX = pt.inX;
			let inY = pt.inY;
			let outX = pt.outX;
			let outY = pt.outY;
			if (drag && drag.index === i) {
				if (drag.part === "vertex") {
					const dx = drag.live.x - pt.x;
					const dy = drag.live.y - pt.y;
					x += dx; y += dy; inX += dx; inY += dy; outX += dx; outY += dy;
				} else if (drag.part === "in") {
					inX = drag.live.x; inY = drag.live.y;
					if (pt.type === Polygon.POINT_SYMMETRIC) { outX = 2 * x - inX; outY = 2 * y - inY; }
				} else {
					outX = drag.live.x; outY = drag.live.y;
					if (pt.type === Polygon.POINT_SYMMETRIC) { inX = 2 * x - outX; inY = 2 * y - outY; }
				}
			}
			return { x, y, inX, inY, outX, outY, type: pt.type };
		});

		// The previewed (curved) outline from the live control points.
		const ctrl = pts.map((p) => ({ x: p.x, y: p.y }));
		const hIn = pts.map((p) => ({ x: p.inX - p.x, y: p.inY - p.y }));
		const hOut = pts.map((p) => ({ x: p.outX - p.x, y: p.outY - p.y }));
		const ringS = Polygon.tessellateRing(ctrl, hIn, hOut, Polygon.BEZIER_SAMPLES).map((p) => toS(p.x, p.y));
		if (ringS.length >= 2) {
			overlay.moveTo(ringS[0].x, ringS[0].y);
			for (let i = 1; i < ringS.length; i++) overlay.lineTo(ringS[i].x, ringS[i].y);
			overlay.lineTo(ringS[0].x, ringS[0].y);
			overlay.stroke({ width: 1.5, color: 0xffaa22, alpha: 0.8 });
		}

		const active = selectedPolyPoint.value;
		// Handle guides for the ACTIVE point (only it shows draggable handles).
		if (active != null && active >= 0 && active < pts.length && pts[active].type !== Polygon.POINT_VERTEX) {
			const p = pts[active];
			const v = toS(p.x, p.y);
			for (const h of [{ x: p.inX, y: p.inY }, { x: p.outX, y: p.outY }]) {
				const hs = toS(h.x, h.y);
				overlay.moveTo(v.x, v.y);
				overlay.lineTo(hs.x, hs.y);
				overlay.stroke({ width: 1, color: 0x22dd88, alpha: 0.9 });
				overlay.circle(hs.x, hs.y, 4);
				overlay.fill({ color: 0x22dd88, alpha: 0.95 });
			}
		}
		// Control vertices; the active one is highlighted.
		for (let i = 0; i < pts.length; i++) {
			const v = toS(pts[i].x, pts[i].y);
			const isActive = i === active;
			overlay.circle(v.x, v.y, isActive ? 5 : 4);
			overlay.fill({ color: isActive ? 0xffcc00 : 0xffaa22, alpha: 0.95 });
		}
	}

	/**
	 * Paint the condition box/line being drawn into the overlay (world → screen).
	 * Faithful to the FinishDrawingCondition geometry the pick will commit: obj-0
	 * draws the full box; obj-1/2 a horizontal segment at the first-click Y; obj-3/4
	 * a vertical segment at the first-click X.
	 */
	function drawConditionPreview(first: { x: number; y: number }, cur: { x: number; y: number }): void {
		const overlay = stack.overlay;
		if (!overlay || !stack.app || !container.value) return;
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
		const draw = stack.draw;
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
	 * Per-frame gesture previews, called by drawFrame AFTER DrawWorld repainted the
	 * Draw sprite: the in-progress shape (DrawTempShape shares the Draw sprite, so
	 * it must repaint after the world) and the polygon draw / point-edit overlays.
	 */
	function drawGesturePreviews(): void {
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
		if (polygonPoints.length > 0) {
			drawPolygonPreview();
			polyEditOverlayActive = false;
		} else if (shouldShowPolyEdit()) {
			drawPolygonEditOverlay();
			polyEditOverlayActive = true;
		} else if (polyEditOverlayActive) {
			// Just stopped showing the edit overlay (deselected / tool changed): clear
			// it once so it doesn't linger, without fighting other overlay previews.
			stack.overlay?.clear();
			polyEditOverlayActive = false;
		}
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
		if (!mods.shift) return current;
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
		if (mods.shift) {
			[ax, ay] = SnapToCommonTriangles(
				mouse.x,
				mouse.y,
				v1.x,
				v1.y,
				v2.x,
				v2.y,
				game.camera.scale, // physScale — unused inside, kept for signature fidelity.
				mods.ctrl, // Shift+Ctrl → equilateral.
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
	function handlePolygonClick(world: { x: number; y: number }, closeRequested: boolean): number {
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
				return -1;
			}
		}
		// At the vertex cap only the close action (handled above) is possible.
		if (n >= Polygon.MAX_TOOL_VERTICES) return -1;
		// Minimum side length: ignore a vertex too close to the previous one
		// (accidental double placement / noise) — PolygonPart.SIDE_MIN_LENGTH.
		if (n > 0) {
			const prev = polygonPoints[n - 1];
			if (Math.hypot(snapped.x - prev.x, snapped.y - prev.y) < Polygon.MIN_SIDE_LENGTH) return -1;
		}
		// Simplicity: reject a vertex that would make the CLOSED CONTROL ring
		// self-intersect. Concave IS allowed (Polygon.Init ear-clips it); only a
		// self-crossing (bow-tie) ring is rejected. (Bézier handles can still bow a
		// curve into a crossing — the core re-checks the TESSELLATED ring on commit.)
		const candidate = [...polygonPoints.map((p) => ({ x: p.x, y: p.y })), { x: snapped.x, y: snapped.y }];
		if (candidate.length >= 3 && !Polygon.isSimple(candidate)) return -1;
		// Append a plain corner (handles at the vertex); a pen drag may pull them out.
		polygonPoints = [
			...polygonPoints,
			{ x: snapped.x, y: snapped.y, inX: snapped.x, inY: snapped.y, outX: snapped.x, outY: snapped.y, type: Polygon.POINT_VERTEX },
		];
		return polygonPoints.length - 1;
	}

	/**
	 * Commit the in-progress polygon: dispatch createPolygon with the accumulated
	 * ring (only when it is a valid simple 3..MAX_TOOL_VERTICES polygon — concave
	 * allowed, self-crossing not — the gesture keeps it so, but re-check defensively)
	 * and reset the gesture. GameCore builds,
	 * adds and selects the Polygon part through the same undoable history path as
	 * every other create.
	 */
	function commitPolygon(): void {
		const ctrl = polygonPoints.map((p) => ({ x: p.x, y: p.y }));
		if (polygonPoints.length >= 3 && polygonPoints.length <= Polygon.MAX_TOOL_VERTICES && Polygon.isSimple(ctrl)) {
			// Convert absolute handle endpoints to per-vertex OFFSETS (relative to the
			// vertex) for the createPolygon command; the core re-validates the
			// tessellated ring is simple.
			game.dispatch({
				type: "createPolygon",
				verts: ctrl,
				pointTypes: polygonPoints.map((p) => p.type),
				handlesIn: polygonPoints.map((p) => ({ x: p.inX - p.x, y: p.inY - p.y })),
				handlesOut: polygonPoints.map((p) => ({ x: p.outX - p.x, y: p.outY - p.y })),
			});
		}
		polygonPoints = [];
		stack.overlay?.clear();
	}

	/** Cancel the in-progress polygon (Escape) — drop the ring + its preview. */
	function cancelPolygonDraft(): void {
		polygonPoints = [];
		stack.overlay?.clear();
	}

	// --- Post-creation Polygon point-edit hit testing --------------------------
	const POLY_HANDLE_HIT_PX = 9;

	/**
	 * Hit-test the selected Polygon's editable elements at a canvas point: the
	 * active point's bézier handle endpoints first (they sit off the shape), then
	 * any control vertex. Returns null when no single Polygon is selected or nothing
	 * is near. Screen-space so the hit radius is constant regardless of zoom.
	 */
	function hitPolygonEditElement(sx: number, sy: number): { index: number; part: "vertex" | "in" | "out" } | null {
		if (!container.value) return null;
		if (game.edit.selection.length !== 1) return null;
		const sp = game.edit.selectedPart;
		if (!sp || sp.kind !== "Polygon" || !sp.polyPoints) return null;
		const rect = container.value.getBoundingClientRect();
		const toS = (wx: number, wy: number) => worldToScreen(wx, wy, game.camera, rect.width, rect.height);
		const near = (ax: number, ay: number) => Math.hypot(ax - sx, ay - sy) <= POLY_HANDLE_HIT_PX;
		// Handle endpoints are only shown/grabbable for the currently active point.
		const active = selectedPolyPoint.value;
		if (active != null && active >= 0 && active < sp.polyPoints.length) {
			const pt = sp.polyPoints[active];
			if (pt.type !== Polygon.POINT_VERTEX) {
				const inS = toS(pt.inX, pt.inY);
				if (near(inS.x, inS.y)) return { index: active, part: "in" };
				const outS = toS(pt.outX, pt.outY);
				if (near(outS.x, outS.y)) return { index: active, part: "out" };
			}
		}
		for (let i = 0; i < sp.polyPoints.length; i++) {
			const v = toS(sp.polyPoints[i].x, sp.polyPoints[i].y);
			if (near(v.x, v.y)) return { index: i, part: "vertex" };
		}
		return null;
	}

	return {
		onPointerDown,
		onPointerMove,
		onPointerUp,
		drawGesturePreviews,
		// The keyboard composable's window into the in-progress polygon ring
		// (Enter commits, Escape cancels, any vertices suppress editor hotkeys).
		polygonDraft: {
			active: () => polygonPoints.length > 0,
			commit: commitPolygon,
			cancel: cancelPolygonDraft,
		},
	};
}
