// Core⇄view contract — COMMANDS
//
// Every mutation of game state flows through a Command. This mirrors the
// existing src/Actions/* undo/redo pattern (each editing Command will produce
// an Action pushed onto the undo stack), but gives the UI a single, serializable
// entry point that does not depend on ControllerGame or Pixi.
//
// The Vue + Nuxt UI layer dispatches these; the renderer never mutates — it only
// reads state. See docs/CONTRACT.md.

import type { WaterState } from "./waterSystem";

export type ToolMode =
	| "select"
	| "newCircle"
	| "newRect"
	| "newTriangle"
	| "newPolygon"
	| "newFixedJoint"
	| "newRevoluteJoint"
	| "newPrismaticJoint"
	| "newText"
	| "newThrusters"
	| "newCannon"
	| "newBomb"
	| "rotate"
	| "resize";

export type ShapeKind = "circle" | "rect" | "triangle" | "polygon" | "cannon" | "bomb";

/**
 * Discriminated union of everything the UI can ask the core to do.
 * Keep every payload plain-serializable (no class instances, no Pixi types) so
 * the contract can later be sent across a Web Worker boundary unchanged.
 */
export type Command =
	// --- simulation control ---
	| { type: "play" }
	| { type: "pause" }
	| { type: "reset" }
	| { type: "step"; frames?: number }
	// --- editing (each produces an undoable Action) ---
	| { type: "setTool"; tool: ToolMode }
	// Create a shape from the ORIGINAL click-drag gesture (ControllerGame.mouseClick
	// NEW_CIRCLE/NEW_RECT/NEW_TRIANGLE, :2190/:2217/:2282). Per kind:
	//   circle   — (x1,y1) is the CENTRE (press), radius = dist to (x2,y2) release  (:2196-2204)
	//   rect     — (x1,y1)..(x2,y2) are opposite corners (press..release)           (:2228-2232)
	//   triangle — (x1,y1)..(x2,y2) is the BASE edge (first press-drag-release, the
	//              base length clamped to Triangle's range :2295-2316) and (x3,y3)
	//              is the APEX (a second click, validated :2352-2360). x3/y3 are
	//              REQUIRED for triangle and ignored otherwise — matching the
	//              original's 3-click gesture faithfully.
	// GameCore clamps each dimension to the Part's legal size range and rejects a
	// degenerate (zero-length base / collinear apex) gesture. cannon is not created
	// via this command.
	| { type: "createShape"; kind: ShapeKind; x1: number; y1: number; x2: number; y2: number; x3?: number; y3?: number }
	// Create a convex Polygon (Polygon ShapePart) from an ORDERED vertex list.
	// Unlike createShape's fixed press/drag/apex points, a polygon carries N (3..8,
	// b2_maxPolygonVertices) vertices, so it gets its own command; the multi-click
	// gesture (GameCanvas newPolygon) enforces convexity + vertex-count + minimum
	// side length while placing them, then dispatches the accumulated ring here.
	// IB3 v0.00.33b has no interactive polygon draw tool (polygons only arrive via
	// import/copy — PolygonPart.as); this is a new IB2/Jaybit editor gesture whose
	// UX mirrors the existing triangle create (click-per-vertex, close by clicking
	// the first vertex / Enter, Escape cancels). GameCore re-validates convexity +
	// count and no-ops a degenerate ring, then builds + selects the part exactly
	// like createShape (default colour/material, undoable via the same history path).
	| { type: "createPolygon"; verts: { x: number; y: number }[] }
	| { type: "createText"; x: number; y: number; text: string }
	// Attach a Thrusters / Cannon at the click point. createThrusters snaps onto
	// the single shape under (x,y) (ControllerGame.MaybeCreateThrusters :6797);
	// createCannon places a free-standing Cannon ShapePart (NEW_CANNON flow :2251).
	| { type: "createThrusters"; x: number; y: number }
	| { type: "createCannon"; x: number; y: number }
	// Create a FIXED or REVOLUTE joint at the click point, attaching the two
	// overlapping shapes under (x,y). Mirrors ControllerGame.MaybeCreateJoint
	// (:6731). Needs ≥2 overlapping editable+enabled shapes. When exactly two
	// overlap, the joint is created immediately; when MORE than two overlap, the
	// core enters a >2-overlap DISAMBIGUATION cycle instead (pendingJoint) that the
	// UI drives with cycleJointCandidate / finalizeJoint. When snapToCenter is on,
	// (x,y) first snaps to the nearest editable shape centre (FindPartToSnapTo).
	// PRISMATIC joints use the two-click startPrismaticJoint / finishPrismaticJoint
	// gesture below, NOT this command.
	| { type: "createJoint"; kind: "fixed" | "revolute"; x: number; y: number }
	// Two-click PRISMATIC-joint gesture (ControllerGame
	// MaybeStartCreatingPrismaticJoint :6844 / MaybeFinishCreatingPrismaticJoint
	// :6884). Click 1 (startPrismaticJoint) picks shape #1 and the slide-axis START
	// point; click 2 (finishPrismaticJoint) picks shape #2 and the axis END point.
	// The slide axis + initLength derive from (p1→p2). Both snap to shape centres
	// when snapToCenter is on. start no-ops without an overlapping shape; if >1
	// shape overlaps start, it enters the disambiguation cycle (prismatic1). finish
	// no-ops without a second shape (excluding shape #1); >1 overlap enters the
	// cycle (prismatic2).
	//
	// `bypassSnap` (shift held, ui-hotkeys §4.4): skip the core's snap-to-center
	// (snapJointPoint) so the UI's 15° axis snap on the second click isn't
	// overridden — the raw (x,y) is used verbatim (MaybeFinishCreatingPrismaticJoint
	// :4754-4764). Omitted == snap-to-center as normal.
	| { type: "startPrismaticJoint"; x: number; y: number; bypassSnap?: boolean }
	| { type: "finishPrismaticJoint"; x: number; y: number; bypassSnap?: boolean }
	// >2-overlap disambiguation cycle (ControllerGame FINALIZING_JOINT click-cycle
	// :2435-2473 + drag-to-finalize :1668-1765). cycleJointCandidate advances which
	// candidate pair/single is highlighted; finalizeJoint commits the current pick;
	// cancelJointGesture aborts the whole joint gesture (also clears a pending
	// prismatic first click). No-ops when no joint gesture is active.
	| { type: "cycleJointCandidate" }
	| { type: "finalizeJoint"; x: number; y: number }
	| { type: "cancelJointGesture" }
	| { type: "deleteParts"; partIds: number[] }
	| { type: "moveParts"; partIds: number[]; dx: number; dy: number }
	| { type: "rotateParts"; partIds: number[]; angle: number }
	// --- resize gesture lifecycle (ControllerGame.scaleButton :3975 + RESIZING_SHAPES
	// MouseDrag :1553 + commit-on-up :2070). Unlike the per-move incremental
	// `resizeParts`, this mirrors the legacy gesture: resizeStart captures a
	// baseline (pivot = selectedParts[0]'s anchor, per-part dragOff + PrepareForResizing)
	// over the ATTACHED CLUSTER of the selection; resizeParts carries the TOTAL
	// from-baseline scale factor (mouseXWorld − firstClickX, mapped :1555-1562);
	// resizeEnd commits (fit check + clears the gesture). scaleFactor is the raw
	// legacy total factor already mapped by the caller.
	| { type: "resizeStart"; partIds: number[] }
	| { type: "resizeParts"; scaleFactor: number }
	| { type: "resizeEnd" }
	// Mirror the selected parts about selectedParts[0]'s pivot, cloning shapes and
	// rebinding joints/thrusters (ControllerGame.mirrorHorizontal :3489 /
	// mirrorVertical :3732). DEVIATION: the legacy begins a PASTE mouse-drag of the
	// clones; the port places them at their mirrored positions and selects them.
	| { type: "mirrorParts"; partIds: number[]; axis: "horizontal" | "vertical" }
	// --- clipboard (ControllerGame.copyButton :4966 / cutButton :4892 / pasteButton
	// :5023). copyParts snapshots the selected shapes + the joints/thrusters BETWEEN
	// them into GameCore's clipboard field (NOT render state). cutParts = copy +
	// delete. pasteParts clones the clipboard, offsets the clones, assigns fresh ids,
	// appends them and selects them. `dx`/`dy` optionally offset the paste (world
	// units); when omitted the port applies a fixed faithful delta.
	| { type: "copyParts"; partIds: number[] }
	| { type: "cutParts"; partIds: number[] }
	| { type: "pasteParts"; dx?: number; dy?: number }
	// --- z-order (ControllerGame.frontButton :4351 / backButton :4375). Reorder the
	// selected parts within the parts array: front = drawn last (on top), back =
	// drawn first (behind).
	| { type: "movePartsToFront"; partIds: number[] }
	| { type: "movePartsToBack"; partIds: number[] }
	// When `makeDefault` is set, the colour also becomes the default for newly
	// created parts (ControllerGame.colourButton's `defaultColour` flag, :4454-4461).
	| { type: "setColour"; partIds: number[]; r: number; g: number; b: number; opacity: number; makeDefault?: boolean }
	// --- per-property part edits (ported from ControllerGame + src/Actions/*) ---
	// Shape (ShapePart: Circle/Rectangle/Triangle/Cannon). Values are absolute
	// (the legacy sliders set the field directly; the Action only recorded a
	// delta for undo — see ControllerGame.densitySlider/strengthSlider).
	| { type: "setDensity"; partIds: number[]; value: number }
	// Friction / restitution: UI-scale 1..30 like density (Jaybit sliders,
	// ControllerGame.frictionSlider/restitutionSlider; text entry clamped via
	// CheckFriction/CheckRestitution against the challenge min/max). Converted
	// to Box2D values only at Init (Util.ConvertFriction/RestitutionToBox2D).
	| { type: "setFriction"; partIds: number[]; value: number }
	| { type: "setRestitution"; partIds: number[]; value: number }
	| { type: "setCollide"; partIds: number[]; value: boolean }
	// Collision layers A-D + "Self-collision" + "Collides", applied together as
	// the Jaybit Advanced-properties submit does (ControllerGame triggerText
	// handler :6985-7041). Applies to ShapeParts AND PrismaticJoints (which
	// carry their own collA-D/subColl/collide).
	| {
			type: "setCollisionGroups";
			partIds: number[];
			collA: boolean;
			collB: boolean;
			collC: boolean;
			collD: boolean;
			subColl: boolean;
			collide: boolean;
	  }
	// --- triggers (Jaybit; AdvancedPropertiesWindow OK -> ControllerGame.triggerText
	// :6920-7160). setShapeTrigger edits ONE slot (1 or 2) of a trigger SOURCE
	// shape (ShapePart, not Cannon); every field is optional so multi-edit can
	// leave "[varies]"/unresolved values unchanged. `name` is the comma-separated
	// trigger-name CSV (the "Trigger Names" input; `[`/`]` are stripped and the
	// value clamped to 255 chars, mirroring the input restrict/maxChars);
	// `action` is a TRIGGER_* constant (0-6, partDefaults). setTriggerList sets
	// the comma-separated listen list on trigger TARGETS (joints / thrusters /
	// cannons / text parts). Both are refused (with the legacy dialog) in a
	// challenge play session with !triggersAllowed.
	| {
			type: "setShapeTrigger";
			partIds: number[];
			slot: 1 | 2;
			name?: string;
			action?: number;
			onSameName?: boolean;
			onGroundHit?: boolean;
	  }
	| { type: "setTriggerList"; partIds: number[]; value: string }
	| { type: "setCameraFocus"; partIds: number[]; value: boolean }
	| { type: "setFixate"; partIds: number[]; value: boolean }
	| { type: "setFixedRotation"; partIds: number[]; value: boolean }
	| { type: "setOutline"; partIds: number[]; value: boolean }
	| { type: "setOutlineBehind"; partIds: number[]; value: boolean }
	| { type: "setUndragable"; partIds: number[]; value: boolean }
	// Joint (RevoluteJoint / PrismaticJoint). `which` selects which of the two
	// control keys / auto flags a joint carries (cw/ccw for revolute, up/down &
	// oscillate for prismatic). Limits are in DEGREES; use null for "None"
	// (stored as ∓Number.MAX_VALUE on the part — see minLimitText/maxLimitText).
	| { type: "setJointMotor"; partIds: number[]; value: boolean }
	| { type: "setJointStrength"; partIds: number[]; value: number }
	| { type: "setJointSpeed"; partIds: number[]; value: number }
	| { type: "setJointLimits"; partIds: number[]; lower: number | null; upper: number | null }
	| { type: "setJointControlKey"; partIds: number[]; which: "cw" | "ccw" | "up" | "down"; key: number }
	// autoExpand/autoRetract are INDEPENDENT prismatic auto directions (IB3
	// SlidingJoint.as:53-55); "oscillate" remains the both-directions shortcut.
	| { type: "setJointAutoOn"; partIds: number[]; which: "cw" | "ccw" | "oscillate" | "expand" | "retract"; value: boolean }
	// IB3 per-direction key enable (RotatingJoint enableKeyCW/CCW :37-39;
	// SlidingJoint enableKeyExpand/Retract :89-91).
	| { type: "setJointEnableKey"; partIds: number[]; which: "cw" | "ccw" | "expand" | "retract"; value: boolean }
	// IB3 SlidingJoint.beginExpanded (:57): piston starts fully expanded.
	| { type: "setJointBeginExpanded"; partIds: number[]; value: boolean }
	| { type: "setJointStiff"; partIds: number[]; value: boolean }
	| { type: "setJointInitialLength"; partIds: number[]; value: number }
	// Thruster
	| { type: "setThrusterStrength"; partIds: number[]; value: number }
	| { type: "setThrusterKey"; partIds: number[]; key: number }
	| { type: "setThrusterAutoOn"; partIds: number[]; value: boolean }
	// IB3 Thrusters.enableKey (:24): whether the thrust key is honored at all.
	| { type: "setThrusterEnableKey"; partIds: number[]; value: boolean }
	// Cannon
	| { type: "setCannonStrength"; partIds: number[]; value: number }
	| { type: "setCannonFireKey"; partIds: number[]; key: number }
	// Bomb (IB3 port). One command with optional fields, mirroring setShapeTrigger's
	// omitted-means-unchanged convention. Ranges from IB3 Util.as BO_* consts:
	// blastRadius 0..50 (world units), strength 0..40, delay ms >= 0,
	// repeat >= 0 (0 == unlimited when repeatable), sensitivity 0..100.
	| {
			type: "setBombProps";
			partIds: number[];
			blastRadius?: number;
			strength?: number;
			delay?: number;
			delayAfterTrigger?: boolean;
			explodeOnImpact?: boolean;
			delayAfterImpact?: boolean;
			repeatable?: boolean;
			repeat?: number;
			sensitive?: boolean;
			sensitivity?: number;
			deflect?: boolean;
	  }
	// Text
	| { type: "setTextContent"; partIds: number[]; text: string }
	| { type: "setTextSize"; partIds: number[]; value: number }
	| { type: "setTextDisplayKey"; partIds: number[]; key: number }
	| { type: "setTextAlwaysVisible"; partIds: number[]; value: boolean }
	| { type: "setTextScaleWithZoom"; partIds: number[]; value: boolean }
	// IB3 TextPart.angle (:30, radians) and visibleOnStart (:32).
	| { type: "setTextAngle"; partIds: number[]; value: number }
	| { type: "setTextVisibleOnStart"; partIds: number[]; value: boolean }
	// --- sandbox environment (ported from AdvancedSandboxWindow Apply flow) ---
	// Mirrors AdvancedSandboxWindow.okButtonPressed + ControllerSandbox.
	// RefreshSandboxSettings (ControllerSandbox.ts:570-678): store the new
	// settings, and while editing rebuild the isSandbox terrain bodies + world
	// bounds from the new terrainType/size WITHOUT touching robot parts or the
	// sim. Gravity is applied at the NEXT play (world creation), not live —
	// GetGravity() is read at world-creation time (spec §4). Enum axes match
	// SandboxSettings.* (size 0-2, terrainType 0-2, terrainTheme 0-6,
	// background 0-6, R/G/B 0-255).
	| {
			type: "setSandboxSettings";
			gravity: number;
			size: number;
			terrainType: number;
			terrainTheme: number;
			background: number;
			backgroundR: number;
			backgroundG: number;
			backgroundB: number;
			/**
			 * IB3 water settings (WaterWindow.as / P6 water panel). Optional so
			 * pre-water callers keep working: when absent the current sandbox
			 * water settings are preserved unchanged. Like gravity, water takes
			 * effect at the NEXT play (WaterSystem is built at world creation).
			 */
			water?: WaterState;
	  }
	// --- view menu (ControllerGame BuildViewMenu) ---
	// Display toggles + zoom, ported faithfully. The toggles flip the edit-view
	// flags (jointBox :5261 / colourBox :5271 / globalOutlineBox :5266 / centerBox
	// :5257 -> ControllerGameGlobals.showJoints/showColours/showOutlines/snapToCenter);
	// zoom adjusts camera.scale by the Zoom() factor (4/3 in, 3/4 out :6705) about
	// the view centre, clamped to [MIN_ZOOM_VAL, MAX_ZOOM_VAL] = [12, 75].
	| { type: "toggleShowJoints" }
	| { type: "toggleShowColours" }
	| { type: "toggleShowOutlines" }
	| { type: "toggleSnapToCenter" }
	| { type: "zoomIn" }
	| { type: "zoomOut" }
	// Center the camera on the current selection's bounding-box centroid (View menu
	// "Center on Selection" → ControllerGame.CenterOnSelected :2542-2564). No-op when
	// nothing is selected.
	| { type: "centerOnSelection" }
	// Pan the editor camera by dragging empty world space with the Select tool
	// (ControllerGame MouseDrag "dragging the world around" :1834-1835). `dx`/`dy`
	// are SCREEN-pixel deltas (the mouse move since the last event); the core
	// subtracts them from camera.offsetX/offsetY, then CLAMPS so the visible world
	// stays within state.sandbox.bounds (the legacy GetMinX/MaxX/MinY/MaxY clamp
	// :1846-1863). `viewW`/`viewH` are the current canvas size in CSS px, needed to
	// compute the visible world extent for the clamp. Not undoable (a view change).
	| { type: "panCamera"; dx: number; dy: number; viewW: number; viewH: number }
	// Pinch-zoom the editor/play camera ABOUT a focal screen point (two-finger
	// gesture, GameCanvas). `scaleFactor` multiplies camera.scale (clamped to
	// [MIN_ZOOM_VAL, MAX_ZOOM_VAL]); (focusX,focusY) is the focal point in canvas
	// CSS px and (viewW,viewH) the current canvas size. GameCore adjusts
	// camera.offsetX/offsetY so the WORLD point currently under the focal screen
	// point stays under it after the zoom (pinch-about-focal-point) — unlike
	// zoomIn/zoomOut which hold the view CENTRE fixed. Not undoable (a view change).
	| { type: "zoomCamera"; scaleFactor: number; focusX: number; focusY: number; viewW: number; viewH: number }
	// --- selection (view state, but routed through the core so it stays authoritative) ---
	| { type: "select"; partIds: number[]; additive?: boolean }
	| { type: "clearSelection" }
	// --- batch (group property edit) ---
	// Apply an ORDERED list of sub-commands as a SINGLE undoable step (the
	// MultiEditWindow "OK" equivalent — Actions/MultiActionsAction.as, which holds
	// an array of Actions and forwards Undo/Redo to each). GameCore pushes ONE
	// history snapshot for the whole batch and notifies subscribers once, so a group
	// edit of N fields across M parts collapses to one undo. Sub-commands run
	// through the same per-command handlers (each still clamps per part), so only
	// fields the UI actually resolved should be included ("[varies]" / half-checked
	// fields contribute nothing). Editing-phase only, like the mutations it wraps.
	// Nested batches are applied in order but do not create extra history steps.
	| { type: "batch"; commands: Command[] }
	// --- undo/redo ---
	| { type: "undo" }
	| { type: "redo" }
	// --- persistence (ByteArray under the hood; no network) ---
	| { type: "loadRobot"; data: Uint8Array }
	| { type: "newRobot" }
	// Clear All (Edit menu) — same effect as New Robot: drop all editable robot
	// parts, keep the sandbox terrain (ControllerGame.clearButton :4845).
	| { type: "clearAll" }
	// Start a completely fresh sandbox session (the menu's "Sandbox Mode" /
	// "Advanced Sandbox" — legacy sandboxButton -> new ControllerSandbox). Unlike
	// newRobot/clearAll (which only drop the robot within the CURRENT session),
	// this fully resets: it clears any challenge/tutorial/replay session, undo
	// history, and running sim, and restores the DEFAULT sandbox environment +
	// camera. Passes through even during a running sim (fresh-controller switch).
	| { type: "newSandbox" }
	// --- challenge mode (ported from ControllerChallenge + Conditions/RestrictionsWindow) ---
	// Start a new empty authoring challenge (creates ChallengeState) or load a
	// built-in one (Climb / MonkeyBars) with its baked terrain + conditions.
	| { type: "newChallenge" }
	// The two in-code challenges (Climb / MonkeyBars) bake their terrain + conditions
	// synchronously here. The two blob-loaded challenges (Race / Spaceship) instead
	// decode a compressed asset blob and are loaded via the async
	// GameCore.loadBuiltInChallengeBlob(name, bytes) method (like importRobot) — the
	// UI fetches resource/race.dat|spaceship.dat and hands the bytes in, keeping the
	// core node-clean (it never imports the pixi-bound Resource).
	| { type: "loadBuiltInChallenge"; name: "climb" | "monkeyBars" }
	| { type: "exitChallenge" }
	// Conditions (ConditionsWindow add/remove + AND flag). subject 0-4, object 0-6
	// (see Condition.ts). `region` sets the box/line extents; shape1Id/shape2Id
	// bind picked shapes for subject-0 / obj-5/6 conditions.
	| {
			type: "addWinCondition";
			name?: string;
			subject: number;
			object: number;
			region?: { minX: number; maxX: number; minY: number; maxY: number } | null;
			shape1Id?: number | null;
			shape2Id?: number | null;
	  }
	| {
			type: "addLossCondition";
			name?: string;
			subject: number;
			object: number;
			immediate: boolean;
			region?: { minX: number; maxX: number; minY: number; maxY: number } | null;
			shape1Id?: number | null;
			shape2Id?: number | null;
	  }
	| { type: "removeWinCondition"; index: number }
	| { type: "removeLossCondition"; index: number }
	| { type: "setWinConditionsAnded"; value: boolean }
	// --- interactive condition stage-picking (ConditionsWindow addWin/LossButtonPressed
	// + ControllerGame GetBox/HLine/VLine/ShapeForConditions :1088-1114) ---
	// The panel gathers the drafted condition (name/subject/object/immediate) and
	// dispatches `startConditionPick`; GameCore stores the draft on
	// state.conditionDraft and computes what pick to await from subject/object
	// (subject-0 needs shape1 FIRST, then the region/shape2; obj-0 box; obj-1/2
	// horizontal line; obj-3/4 vertical line; obj-5/6 a second shape). The canvas
	// then feeds the picks: `conditionPickBox` on the two-click box/line gesture
	// (two world points → FinishDrawingCondition index math), `conditionPickShape`
	// on a shape click (→ FinishSelectingForCondition). `cancelConditionPick`
	// aborts (re-shows the panel). Each pick either advances `awaiting` (subject-0
	// shape1 then the object pick) or finalizes the condition via the SAME add
	// path addWin/LossCondition uses.
	| {
			type: "startConditionPick";
			kind: "win" | "loss";
			name: string;
			subject: number;
			object: number;
			immediate: boolean;
	  }
	// Two-click box/line result (world/physics units). GameCore applies the
	// FinishDrawingCondition index rule for the drafted object and finalizes.
	| { type: "conditionPickBox"; x1: number; y1: number; x2: number; y2: number }
	// A shape was clicked during a shape1/shape2 pick.
	| { type: "conditionPickShape"; shapeId: number }
	| { type: "cancelConditionPick" }
	// Restrictions (RestrictionsWindow okButtonPressed). Panel stores "allowed"
	// (already un-inverted from the editor's "exclude" checkboxes).
	| {
			type: "setAllowedParts";
			circles: boolean;
			rects: boolean;
			tris: boolean;
			fixed: boolean;
			revolute: boolean;
			prismatic: boolean;
			thrusters: boolean;
			cannons: boolean;
			// Jaybit "Exclude Triggers" (RestrictionsWindow.as:302-310/:736 —
			// challenge.triggersAllowed = !box.selected). Optional so pre-Jaybit
			// dispatch sites keep compiling; omitted == leave unchanged.
			triggers?: boolean;
	  }
	| {
			type: "setBuildPermissions";
			mouseDrag: boolean;
			botControl: boolean;
			fixate: boolean;
			nonColliding: boolean;
			showConditions: boolean;
	  }
	// Numeric limits; null == the ∓Number.MAX_VALUE "no limit" sentinel. The
	// Jaybit friction/restitution limits are optional so pre-Jaybit dispatch
	// sites keep compiling; omitted == null == no limit.
	| {
			type: "setPartLimits";
			minDensity: number | null;
			maxDensity: number | null;
			minFriction?: number | null;
			maxFriction?: number | null;
			minRestitution?: number | null;
			maxRestitution?: number | null;
			maxRJStrength: number | null;
			maxRJSpeed: number | null;
			maxSJStrength: number | null;
			maxSJSpeed: number | null;
			maxThrusterStrength: number | null;
	  }
	// Build areas (b2AABB regions parts must fit inside).
	| { type: "addBuildArea"; minX: number; minY: number; maxX: number; maxY: number }
	| { type: "removeBuildArea"; index: number }
	// Play/edit transitions (ControllerChallenge.playButton first-press / editButton).
	| { type: "enterChallengePlay" }
	| { type: "editChallenge" }
	// --- replays (deterministic record + playback; see src/core/replay.ts) ---
	// Recording is automatic on `play` (during a normal sim); these drive playback.
	// playReplay begins sim-FREE playback of a decoded replay (splines precomputed,
	// world frozen); viewReplayAgain restarts the same replay from frame 0;
	// stopReplay ends playback and returns to editing.
	| { type: "playReplay"; data: import("./replay").ReplayData }
	| { type: "viewReplayAgain" }
	| { type: "stopReplay" }
	// Fire a text-display / cannon-fire key at the current frame. During a normal
	// sim this is recorded into the replay stream (ControllerGame.keyInput
	// :1868-1883, text/cannon keys only). During playback it is applied but never
	// recorded.
	| { type: "replayKey"; key: number }
	// Record a camera pan/zoom during a running sim (ControllerGame.ts:1837-1842).
	// Pushed as a CameraMovement into the recording stream.
	| { type: "moveCameraDuringSim"; drawXOff: number; drawYOff: number; scale: number }
	// --- live play-mode interaction (RUNNING sim only) ---
	// A keyboard event during the running sim, driving robot control: motors,
	// pistons, thrusters, cannons, text displays. Faithful port of
	// ControllerGame.keyInput (:1868-1883): forwards KeyInput(key, up, false) to
	// every part (setting each part's live control flags, which its per-step
	// Update reads) and records ONLY text-display / cannon-fire keys (on key up)
	// into the replay stream. `up` is false on key-down, true on key-up.
	| { type: "keyInput"; key: number; up: boolean }
	// Mouse-joint grab/drag of a body during the running sim (ControllerGame
	// MouseDrag :1782-1809). start creates a b2MouseJoint targeting the body under
	// (worldX,worldY); move retargets it to the cursor; end destroys it. World
	// units (screenToWorld already applied by the caller).
	| { type: "mouseJointStart"; worldX: number; worldY: number }
	| { type: "mouseJointMove"; worldX: number; worldY: number }
	| { type: "mouseJointEnd" }
	// --- tutorials (per-subclass dialog state machine; see src/core/tutorials.ts) ---
	// loadTutorial builds the tutorial's terrain + prebuilt parts and shows its
	// first dialog (TutorialSelectWindow.*Button + ControllerTutorial.Init).
	// advanceTutorial == TutorialWindow.closeWindow -> CloseTutorialDialog(num).
	// closeTutorial dismisses the tutorial session.
	| { type: "loadTutorial"; levelIndex: number }
	| { type: "advanceTutorial"; messageId: number }
	| { type: "closeTutorial" };

export type CommandType = Command["type"];
