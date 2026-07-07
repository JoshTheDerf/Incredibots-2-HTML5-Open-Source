// Part edit operations — creation gestures, joints, geometry edits, deletion.
//
// Extracted from GameCore: the read-model projection (snapshotOf /
// deriveSelectedPart / editParts), the click-drag shape builders, the joint /
// thruster creation flows (incl. the >2-overlap disambiguation cycle and the
// two-click prismatic gesture), boolean subtract, rotate/resize/mirror,
// move/delete/select, and the clear-robot reset. Free functions over the
// CoreInternals seam; GameCore's command switch delegates here.

import { b2Vec2 } from "../Box2D";
import { Util } from "../General/Util";
import { Bomb } from "../Parts/Bomb";
import { Cannon } from "../Parts/Cannon";
import { Circle } from "../Parts/Circle";
import { FixedJoint } from "../Parts/FixedJoint";
import { JointPart } from "../Parts/JointPart";
import type { Part } from "../Parts/Part";
import { Polygon } from "../Parts/Polygon";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { Rectangle } from "../Parts/Rectangle";
import { RevoluteJoint } from "../Parts/RevoluteJoint";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import { Triangle } from "../Parts/Triangle";
import type { Command, ShapeKind } from "./Command";
import { type CreatePartKind, partTypeAllowed } from "./challenge";
import type { CoreInternals } from "./coreInternals";
import {
	applyResizeGesture,
	beginResizeGesture,
	buildMirroredParts,
	buildSubtractPolygon,
	cleanupJointsForSubtraction,
	currentXY,
	resizeAnchor,
	rotatePartAbout,
	selectionCentroid,
	shapeWorldRing,
} from "./geometryEdit";
import type { GameState, PartSnapshot } from "./GameState";
import { cascadeRemovalSet, clearRemovedConditionRefs } from "./historyOps";
import { clampPartToChallengeLimits } from "./importExport";
import { dedupeRing, polygonArea, polygonDifference } from "./polygonBoolean";
import type { Vec2 } from "./polygonBoolean";
import { buildTerrainParts } from "./sandboxEnvironment";

// Default sizes for shapes the headless create commands still place from a
// single point (text, cannon, prismatic-joint span). Circle/Rectangle/Triangle
// now derive their dimensions from the click-drag gesture (see
// buildDraggedShape), matching ControllerGame's NEW_CIRCLE/NEW_RECT/NEW_TRIANGLE
// flows; these defaults remain for the point-placed parts only.
const DEFAULT_RECT_SIZE = 2.0;
const DEFAULT_TEXT_W = 4.0;
const DEFAULT_TEXT_H = 2.0;

/**
 * Build a plain-data PartSnapshot from a live Part, branching on `type`.
 * Colour channels stay 0-255 (as stored on the Part); opacity is converted
 * from the Part's 0-255 storage to the 0-1 scale the view/commands use.
 */
export function snapshotOf(part: Part): PartSnapshot {
	const kind = part.type;

	// --- ShapePart family (Circle/Rectangle/Triangle/Cannon) ---
	// The common physical properties come from ShapePart; geometry and the
	// cannon-only strength/fireKey are layered on per concrete type. Fields
	// mirror the src/Actions/* handlers (ShapeCheckboxAction, CameraAction,
	// ChangeSliderAction density, ColourChangeAction).
	if (part instanceof ShapePart) {
		const snap: PartSnapshot = {
			id: part.id,
			kind,
			x: part.centerX,
			y: part.centerY,
			red: part.red,
			green: part.green,
			blue: part.blue,
			opacity: part.opacity / 255,
			angle: part.angle,
			density: part.density,
			fragility: part.fragility,
			friction: part.friction,
			restitution: part.restitution,
			collide: part.collide,
			collA: part.collA,
			collB: part.collB,
			collC: part.collC,
			collD: part.collD,
			subColl: part.subColl,
			cameraFocus: part.isCameraFocus,
			fixate: part.isStatic, // "Fixate" == Part.isStatic
			fixedRotation: part.fixedRotation, // IB3 ShapePart.fixedRotation
			outline: part.outline,
			outlineBehind: part.terrain, // "Outlines Behind" == terrain
			undragable: part.undragable,
			locked: part.locked, // IB3 superset: editor lock (pins the part)
			borderOpacity: part.borderOpacity, // IB3 superset: outline opacity 0..255
			// Trigger SOURCE fields (two symmetric slots) — read uniformly so the
			// group-edit UI can compute [varies] without touching live parts.
			triggerName: part.triggerName,
			triggerName_2: part.triggerName_2,
			triggerAction: part.triggerAction,
			triggerAction_2: part.triggerAction_2,
			onSameName: part.onSameName,
			onSameName_2: part.onSameName_2,
			onGroundHit: part.onGroundHit,
			onGroundHit_2: part.onGroundHit_2,
		};
		if (part instanceof Circle) snap.radius = part.radius;
		if (part instanceof Rectangle) {
			snap.w = part.w;
			snap.h = part.h;
		}
		if (part instanceof Polygon) {
			const worldVerts = part.GetVertices() as { x: number; y: number }[];
			snap.verts = worldVerts.map((v) => ({ x: v.x, y: v.y }));
			// Per-vertex bézier data (rotated world space) for the point-edit UI.
			const c = Math.cos(part.angle);
			const s = Math.sin(part.angle);
			snap.polyAngle = part.angle;
			snap.polyPoints = worldVerts.map((v, i) => {
				const hi = part.handlesIn[i];
				const ho = part.handlesOut[i];
				// Rotate the (baseline) handle offsets by the live angle, then anchor
				// to the rotated vertex so the UI gets absolute world endpoints.
				const inX = v.x + (hi.x * c - hi.y * s);
				const inY = v.y + (hi.x * s + hi.y * c);
				const outX = v.x + (ho.x * c - ho.y * s);
				const outY = v.y + (ho.x * s + ho.y * c);
				return { x: v.x, y: v.y, type: part.pointTypes[i], inX, inY, outX, outY };
			});
		}
		if (part instanceof Cannon) {
			snap.w = part.w;
			snap.strength = part.strength;
			snap.fireKey = part.fireKey;
			// Cannon is also a trigger TARGET (fires on a named trigger).
			snap.triggerList = part.triggerList;
		}
		if (part instanceof Bomb) {
			// Bomb fields (IB3 Bomb.as:32-54); radius came from the Circle branch.
			snap.strength = part.strength;
			snap.blastRadius = part.blastRadius;
			snap.bombDelay = part.delay;
			snap.delayAfterTrigger = part.delayAfterTrigger;
			snap.explodeOnImpact = part.explodeOnImpact;
			snap.delayAfterImpact = part.delayAfterImpact;
			snap.repeatable = part.repeatable;
			snap.repeat = part.repeat;
			snap.sensitive = part.sensitive;
			snap.sensitivity = part.sensitivity;
			snap.deflect = part.deflect;
			// Bomb is also a trigger TARGET (detonates on a named trigger).
			snap.triggerList = part.triggerList;
		}
		return snap;
	}

	// --- RevoluteJoint ("Rotating Joint") ---
	if (part instanceof RevoluteJoint) {
		return {
			id: part.id,
			kind,
			x: part.anchorX,
			y: part.anchorY,
			red: 0,
			green: 0,
			blue: 0,
			opacity: 1,
			motorOn: part.enableMotor,
			strength: part.motorStrength,
			speed: part.motorSpeed,
			// Limits stored in degrees; the ∓MAX_VALUE sentinel means "None".
			lowerLimit: part.motorLowerLimit === -Number.MAX_VALUE ? null : part.motorLowerLimit,
			upperLimit: part.motorUpperLimit === Number.MAX_VALUE ? null : part.motorUpperLimit,
			keyCW: part.motorCWKey,
			keyCCW: part.motorCCWKey,
			autoCW: part.autoCW,
			autoCCW: part.autoCCW,
			enableKeyCW: part.enableKeyCW,
			enableKeyCCW: part.enableKeyCCW,
			stiff: part.isStiff,
			visualInSim: part.visualInSim, // IB3 superset (no revolute sim graphic, but round-trips)
			scaleToZoom: part.scaleToZoom, // IB3 superset: marker scales with zoom
			// Rotating joint is a trigger TARGET (a triggerList drives/destroys it).
			triggerList: part.triggerList,
		};
	}

	// --- FixedJoint ("Fixed Joint") — minimal props; a trigger TARGET only ---
	// A fixed joint carries no motor/material; its only editable property is the
	// triggerList (a non-empty list makes it a breakable "triggered" joint —
	// FixedJoint.IsTriggered). Snapshotted so the FixedJoint inspector + group
	// edit read it uniformly (previously FixedJoint fell through to the empty
	// default, and the inspector mis-routed it to the shape panel).
	if (part instanceof FixedJoint) {
		return {
			id: part.id,
			kind,
			x: part.anchorX,
			y: part.anchorY,
			red: 0,
			green: 0,
			blue: 0,
			opacity: 1,
			triggerList: part.triggerList,
		};
	}

	// --- PrismaticJoint ("Sliding Joint") — carries its own colour/collide/outline ---
	if (part instanceof PrismaticJoint) {
		return {
			id: part.id,
			kind,
			x: part.anchorX,
			y: part.anchorY,
			red: part.red,
			green: part.green,
			blue: part.blue,
			opacity: part.opacity / 255,
			motorOn: part.enablePiston,
			strength: part.pistonStrength,
			speed: part.pistonSpeed,
			keyUp: part.pistonUpKey,
			keyDown: part.pistonDownKey,
			autoOscillate: part.autoOscillate,
			autoExpand: part.autoExpand,
			autoRetract: part.autoRetract,
			beginExpanded: part.beginExpanded,
			enableKeyExpand: part.enableKeyExpand,
			enableKeyRetract: part.enableKeyRetract,
			stiff: part.isStiff,
			initialLength: part.initLength,
			collide: part.collide,
			collA: part.collA,
			collB: part.collB,
			collC: part.collC,
			collD: part.collD,
			subColl: part.subColl,
			outline: part.outline,
			visualInSim: part.visualInSim, // IB3 superset: hide the shaft during sim
			scaleToZoom: part.scaleToZoom, // IB3 superset: shaft scales with zoom
			// Sliding joint is a trigger TARGET too.
			triggerList: part.triggerList,
		};
	}

	// --- Thrusters ---
	if (part instanceof Thrusters) {
		return {
			id: part.id,
			kind,
			x: part.centerX,
			y: part.centerY,
			red: 0,
			green: 0,
			blue: 0,
			opacity: 1,
			strength: part.strength,
			thrustKey: part.thrustKey,
			autoOn: part.autoOn,
			enableKey: part.enableKey, // IB3 Thrusters.enableKey
			visualInSim: part.visualInSim, // IB3 superset
			scaleToZoom: part.scaleToZoom, // IB3 superset: marker scales with zoom
			// Thrusters are a trigger TARGET (thrust while a named trigger touches).
			triggerList: part.triggerList,
		};
	}

	// --- TextPart (no opacity field on the part) ---
	if (part instanceof TextPart) {
		return {
			id: part.id,
			kind,
			x: part.x,
			y: part.y,
			red: part.red,
			green: part.green,
			blue: part.blue,
			opacity: 1,
			w: part.w,
			h: part.h,
			text: part.text,
			size: part.size,
			displayKey: part.displayKey,
			alwaysVisible: part.alwaysVisible,
			scaleWithZoom: part.scaleWithZoom,
			angle: part.angle, // IB3 TextPart.angle (radians)
			visibleOnStart: part.visibleOnStart, // IB3 TextPart.visibleOnStart
			// Text parts are a trigger TARGET (display while a named trigger touches).
			triggerList: part.triggerList,
		};
	}

	return { id: part.id, kind, x: 0, y: 0, red: 0, green: 0, blue: 0, opacity: 1 };
}

/** Derive the selectedPart snapshot from the FIRST selected id (null if none). */
export function deriveSelectedPart(core: CoreInternals, selection: number[]): PartSnapshot | null {
	if (selection.length === 0) return null;
	const first = core.findPart(selection[0]);
	return first ? snapshotOf(first) : null;
}

/**
 * Apply `mutate` to every part in `partIds` (a part may skip itself if the
 * mutation doesn't apply to its type), then publish a new state with a fresh
 * parts array and a recomputed selectedPart snapshot. Mirrors the legacy
 * per-property handlers in ControllerGame (each sets the field on the live
 * Part; see densitySlider/strengthSlider/*Checkbox), minus the undo-stack
 * bookkeeping that lands with the undo/redo migration.
 */
export function editParts(core: CoreInternals, partIds: number[], mutate: (p: Part) => void): void {
	const target = new Set(partIds);
	for (const p of core.state.parts) {
		if (target.has(p.id)) mutate(p);
	}
	core.state = {
		...core.state,
		parts: [...core.state.parts],
		edit: { ...core.state.edit, selectedPart: deriveSelectedPart(core, core.state.edit.selection) },
	};
	core.markChanged();
}

/**
 * A sensible default OUTGOING bézier handle offset for vertex `i` when a point
 * is toggled to a smooth (symmetric/asymmetric) type with no existing handles:
 * a quarter of the neighbour span, along the tangent from the previous to the
 * next vertex (the classic Catmull-Rom-ish smooth-spline seed). The incoming
 * handle is the negation of this for a symmetric seed.
 */
export function defaultPolyHandle(verts: { x: number; y: number }[], i: number): { x: number; y: number } {
	const n = verts.length;
	const prev = verts[(i - 1 + n) % n];
	const next = verts[(i + 1) % n];
	let tx = next.x - prev.x;
	let ty = next.y - prev.y;
	const len = Math.hypot(tx, ty) || 1;
	const mag = 0.25 * len;
	return { x: (tx / len) * mag, y: (ty / len) * mag };
}

// --- Boolean "Subtract Shape" ------------------------------------------
//
// The Part-aware geometry (world rings, result-Polygon building, joint
// re-pointing) lives in geometryEdit.ts; the pure ring maths (difference,
// dedupe, containment) in polygonBoolean.ts. The handler here orchestrates
// state: part resolution, condition-ref cleanup, z-order and selection.

/**
 * Replace TARGET with (target − ⋃ subtrahends) as a new Polygon and delete the
 * subtrahends (the `subtractShapes` command). The difference runs in world
 * space via src/core/polygonBoolean; the result may be concave (Polygon
 * ear-clips it) or multi-piece (the largest piece is kept, the rest dropped
 * with a warn). Edge cases: subtrahends fully covering the target delete it;
 * a no-overlap / interior-hole / degenerate result leaves the target
 * unchanged (warn). The new Polygon inherits the target's material +
 * appearance (density/friction/restitution, colour/opacity, outlines,
 * collision flags, and the IB3 superset fields via CopyJaybitFieldsTo) and
 * takes the target's slot in the parts array (z-order preserved).
 */
export function handleSubtractShapes(core: CoreInternals, targetId: number, subtrahendIds: number[]): void {
	const targetPart = core.findPart(targetId);
	if (!(targetPart instanceof ShapePart)) return;
	// A LOCKED part is pinned — don't rewrite it (mirrors moveParts).
	if (targetPart.locked) return;
	const targetRing = shapeWorldRing(targetPart);
	if (!targetRing || targetRing.length < 3) return;
	const originalArea = polygonArea(targetRing);

	// Resolve the subtrahends: subtractable shapes, excluding the target itself.
	const subs: ShapePart[] = [];
	for (const id of subtrahendIds) {
		if (id === targetId) continue;
		const p = core.findPart(id);
		if (p instanceof ShapePart && shapeWorldRing(p)) subs.push(p);
	}
	if (subs.length === 0) return;
	const subSet = new Set<ShapePart>(subs);

	// Subtract each subtrahend from EVERY current piece, accumulating ALL the
	// resulting loops (a cut can split a piece into several disjoint polygons —
	// every one is kept). `rings` is the running set of surviving world rings.
	let rings: Vec2[][] = [targetRing];
	let degenerateWarned = false;
	for (const s of subs) {
		if (rings.length === 0) break;
		const cutter = shapeWorldRing(s)!;
		const next: Vec2[][] = [];
		for (const r of rings) {
			const pieces = polygonDifference(r, cutter);
			if (pieces === null) {
				// An unrepairable degeneracy for this piece — keep it unchanged.
				if (!degenerateWarned) {
					console.warn("subtractShapes: a boolean difference was degenerate; that piece was left unchanged");
					degenerateWarned = true;
				}
				next.push(r);
				continue;
			}
			// [] == this piece is fully covered by the subtrahend → it disappears.
			for (const p of pieces) next.push(p);
		}
		rings = next;
	}

	const removeIds = new Set<number>(subs.map((s) => s.id));

	// Full cover: every piece was removed — delete the target + the subtrahends.
	if (rings.length === 0) {
		// No pieces remain, so every joint on the target has nowhere to re-point:
		// cleanup deletes all joints touching the target or a subtrahend.
		const jointRemoveIds = cleanupJointsForSubtraction(core.state.parts, targetPart, subSet, [], []);
		for (const jid of jointRemoveIds) removeIds.add(jid);
		removeIds.add(targetId);
		clearRemovedConditionRefs(core, removeIds);
		const parts = core.state.parts.filter((p) => !removeIds.has(p.id));
		const selection = core.state.edit.selection.filter((sid) => !removeIds.has(sid));
		core.state = {
			...core.state,
			parts,
			edit: { ...core.state.edit, selection, selectedPart: deriveSelectedPart(core, selection) },
		};
		core.markChanged();
		return;
	}

	// Clean + validate every surviving piece; keep all usable simple rings,
	// skip (and warn about) any degenerate one — largest first so the biggest
	// piece takes the target's z-order slot.
	const valid: Vec2[][] = [];
	for (const r of rings) {
		const clean = dedupeRing(r);
		if (clean.length >= 3 && Polygon.isSimple(clean)) valid.push(clean);
		else console.warn("subtractShapes: dropping a degenerate result piece");
	}
	if (valid.length === 0) {
		console.warn("subtractShapes: no usable result; leaving target unchanged");
		return;
	}
	valid.sort((a, b) => polygonArea(b) - polygonArea(a));

	// No-op fallback: nothing was actually removed (disjoint shapes, or a
	// subtrahend strictly interior to the target — an unrepresentable hole). A
	// real removal either splits into 2+ pieces or shrinks the single piece.
	if (valid.length === 1 && Math.abs(polygonArea(valid[0]) - originalArea) < 1e-6) {
		console.warn("subtractShapes: shapes do not overlap (or would leave a hole); leaving target unchanged");
		return;
	}

	// Build one Polygon per surviving piece, each carrying the target's material
	// + appearance, each with a fresh id.
	const built = valid.map((ring) => buildSubtractPolygon(ring, targetPart));
	for (const p of built) p.id = ++core.nextId;

	// Joint cleanup: delete joints on subtrahends, delete target-joints whose
	// anchor fell in a removed region, and re-point surviving target-joints to
	// the piece Polygon containing their anchor (so nothing dangles after the
	// target object is swapped out). Merge the deletions into removeIds so the
	// parts-array rebuild below drops them.
	const jointRemoveIds = cleanupJointsForSubtraction(core.state.parts, targetPart, subSet, valid, built);
	for (const jid of jointRemoveIds) removeIds.add(jid);
	// The target shape is swapped out for fresh Polygon pieces (different objects),
	// so any win/loss condition pointing at the target (or a removed subtrahend)
	// would dangle — clear those refs rather than leave a dead ShapePart.
	clearRemovedConditionRefs(core, new Set([targetId, ...removeIds]));

	// The largest piece replaces the target IN PLACE (z-order slot preserved);
	// the remaining pieces are appended (drawn on top). Subtrahends + deleted
	// joints are dropped. Every new piece is selected; revert to the Select tool.
	const primary = built[0];
	const extras = built.slice(1);
	const newParts: Part[] = [];
	for (const p of core.state.parts) {
		if (p.id === targetId) newParts.push(primary);
		else if (removeIds.has(p.id)) continue;
		else newParts.push(p);
	}
	for (const e of extras) newParts.push(e);
	const selection = built.map((p) => p.id);
	core.state = {
		...core.state,
		parts: newParts,
		edit: { ...core.state.edit, selection, selectedPart: snapshotOf(primary), tool: "select" },
	};
	core.markChanged();
	core.emitSound("shapeCreated");
}

// --- Rotate / resize geometry ------------------------------------------
//
// The per-part transform maths (rotate/resize/mirror against explicit
// inputs) lives in geometryEdit.ts; the handlers here keep the gesture
// fields (resizeGesture), history and state rebuilds.

/**
 * resizeStart — ControllerGame.scaleButton() (:3975-4021). The geometry
 * (pivot, attached cluster, dragOffs, PrepareForResizing baselines) is
 * captured by geometryEdit.beginResizeGesture.
 */
export function handleResizeStart(core: CoreInternals, partIds: number[]): void {
	const selected = partIds.map((id) => core.findPart(id)).filter((p): p is Part => p !== undefined);
	if (selected.length === 0) {
		core.resizeGesture = null;
		return;
	}
	core.resizeGesture = beginResizeGesture(selected);
	core.markChanged();
}

/**
 * resizeApply — the RESIZING_SHAPES branch of MouseDrag (:1553-1665). `sf` is
 * the TOTAL from-baseline scale factor (already mapped from the mouse delta by
 * the caller, :1555-1562). The clamp + apply passes against each part's init*
 * baseline live in geometryEdit.applyResizeGesture.
 */
export function handleResizeApply(core: CoreInternals, scaleFactor: number): void {
	const g = core.resizeGesture;
	if (!g) return;

	applyResizeGesture(g, scaleFactor);

	core.state = {
		...core.state,
		parts: [...core.state.parts],
		edit: { ...core.state.edit, selectedPart: deriveSelectedPart(core, core.state.edit.selection) },
	};
	core.markChanged();
	if (core.challenge) core.syncChallenge();
}

/**
 * resizeEnd — commit-on-up (:2070-2078). The legacy pushed a ResizeShapesAction
 * for undo and re-ran CheckIfPartsFit. The port's undo is snapshot-based
 * (resizeStart already pushed history capturing the pre-resize state), so we
 * only run the fit-check equivalent (syncChallenge → checkIfPartsFit) and clear
 * the gesture. DEVIATION: no ResizeShapesAction — snapshot undo supersedes it.
 */
export function handleResizeEnd(core: CoreInternals): void {
	if (!core.resizeGesture) return;
	core.resizeGesture = null;
	if (core.challenge) core.syncChallenge();
	core.markChanged();
}

/**
 * mirrorParts — faithful port of ControllerGame.mirrorHorizontal (:3489-3730)
 * and mirrorVertical (:3732-3973). The two-pass clone/rebind geometry lives
 * in geometryEdit.buildMirroredParts; this handler resolves the selection,
 * picks the pivot (the FIRST selected part's anchor) and finalizes the clones.
 *
 * DEVIATION: the legacy finishes by starting a PASTE mouse-drag of the clones
 * (:3692-3722). The port has no paste-drag; we place the clones at their
 * mirrored positions, append them with fresh ids, and select them.
 */
export function handleMirror(core: CoreInternals, partIds: number[], axis: "horizontal" | "vertical"): void {
	const h = axis === "horizontal";
	const selectedParts = partIds
		.map((id) => core.findPart(id))
		.filter((p): p is Part => p !== undefined);
	if (selectedParts.length === 0) return;

	const first = selectedParts[0];
	const pivot = resizeAnchor(first);
	const newParts = buildMirroredParts(selectedParts, pivot.x, pivot.y, h);

	if (newParts.length === 0) return;

	// Finalize: assign fresh ids, append the clones, select them (DEVIATION —
	// no PASTE drag; place at mirrored positions, :3693-3721 collapsed).
	for (const p of newParts) p.id = ++core.nextId;
	const selection = newParts.map((p) => p.id);
	core.state = {
		...core.state,
		parts: [...core.state.parts, ...newParts],
		edit: {
			...core.state.edit,
			selection,
			selectedPart: snapshotOf(newParts[0]),
		},
	};
	core.markChanged();
	if (core.challenge) core.syncChallenge();
}

/**
 * Every ShapePart whose geometry contains (x,y), topmost first. Used by the
 * joint / thruster creation flows (ControllerGame iterates allParts back to
 * front collecting InsideShape hits — MaybeCreateJoint :6747).
 */
export function shapesAt(core: CoreInternals, x: number, y: number): ShapePart[] {
	const hits: ShapePart[] = [];
	const scale = core.state.camera.scale;
	for (let i = core.state.parts.length - 1; i >= 0; i--) {
		const p = core.state.parts[i];
		// Legacy candidate filter: only EDITABLE + ENABLED shapes are joint /
		// thruster attachment candidates (ControllerGame MaybeCreateJoint :6743 /
		// MaybeCreateThrusters :6804 / MaybeStartCreatingPrismaticJoint :6856).
		// This excludes non-editable terrain and disabled shapes.
		if (p instanceof ShapePart && p.isEditable && p.isEnabled && p.InsideShape(x, y, scale)) hits.push(p);
	}
	return hits;
}

/**
 * The nearest EDITABLE shape's centre to (x,y), if within 12/scale world units;
 * else null. Faithful port of ControllerGame.FindPartToSnapTo (:6939-6962):
 * scans every ShapePart (excluding an optional part), keeps the closest by
 * centre distance, returns it only when inside DIST_THRESHHOLD = 12/physScale.
 */
export function findPartToSnapTo(core: CoreInternals, x: number, y: number, exclude: ShapePart | null = null): ShapePart | null {
	let closest: ShapePart | null = null;
	let closestDist = Number.MAX_VALUE;
	for (const p of core.state.parts) {
		if (p instanceof ShapePart && p !== exclude && p.isEditable) {
			const dist = Util.GetDist(x, y, p.centerX, p.centerY);
			if (dist < closestDist) {
				closestDist = dist;
				closest = p;
			}
		}
	}
	const DIST_THRESHHOLD = 12.0 / core.state.camera.scale;
	return closestDist < DIST_THRESHHOLD ? closest : null;
}

/**
 * Apply snap-to-center to a joint/thruster click point when the snapToCenter
 * view flag is on (ControllerGame MaybeCreateJoint :6737-6740 /
 * MaybeCreateThrusters :6798-6801 / MaybeStart/FinishCreatingPrismaticJoint
 * :6850/:6890): if the nearest editable shape's centre is within 12/scale, the
 * point snaps to that centre. Returns the (possibly snapped) point.
 */
export function snapJointPoint(core: CoreInternals, x: number, y: number, exclude: ShapePart | null = null): { x: number; y: number } {
	if (!core.state.edit.snapToCenter) return { x, y };
	const snap = findPartToSnapTo(core, x, y, exclude);
	return snap ? { x: snap.centerX, y: snap.centerY } : { x, y };
}

/**
 * Construct a ShapePart from a click-drag gesture, mirroring
 * ControllerGame.mouseClick's NEW_CIRCLE/NEW_RECT/NEW_TRIANGLE branches.
 * (x1,y1) is the press point, (x2,y2) the release point. Returns null for a
 * degenerate (zero-length) drag so the caller can skip creation. The Part
 * constructors clamp each dimension to the type's legal MIN/MAX range, so we
 * only guard the "no drag at all" case here.
 */
export function buildDraggedShape(core: CoreInternals, 
	kind: ShapeKind,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	x3?: number,
	y3?: number,
): Part | null {
	switch (kind) {
		case "circle": {
			// Press sets the CENTRE, drag sets the radius (ControllerGame :2196).
			const radius = Util.GetDist(x1, y1, x2, y2);
			if (radius <= 0) return null;
			// Circle(x, y, rad) clamps rad to [MIN_RADIUS, MAX_RADIUS] (:2204).
			return new Circle(x1, y1, radius);
		}
		case "rect": {
			// Press/release are opposite corners (ControllerGame :2228). The
			// Rectangle ctor clamps |w|,|h| to [MIN_WIDTH, MAX_WIDTH] and keeps the
			// sign so it can be dragged in any direction.
			if (x2 === x1 && y2 === y1) return null;
			return new Rectangle(x1, y1, x2 - x1, y2 - y1);
		}
		case "triangle": {
			// Faithful port of the original 3-click gesture (ControllerGame :2282).
			// (x1,y1)-(x2,y2) is the BASE edge (already length-clamped by the caller
			// exactly as the original clamps `secondClick` along the drag angle,
			// :2295-2316); (x3,y3) is the APEX from the second click. Validate the
			// same side-length + minimum-angle constraints the original enforces
			// before building (:2329-2360); reject the gesture otherwise.
			if (x3 === undefined || y3 === undefined) return null;
			if ((x3 === x1 && y3 === y1) || (x3 === x2 && y3 === y2)) return null;
			const sideLen1 = Util.GetDist(x1, y1, x3, y3);
			const sideLen2 = Util.GetDist(x2, y2, x3, y3);
			const sideLen0 = Util.GetDist(x1, y1, x2, y2);
			if (sideLen0 <= 0) return null;
			const angle1 = Util.NormalizeAngle(
				Math.acos((sideLen0 * sideLen0 + sideLen1 * sideLen1 - sideLen2 * sideLen2) / (2 * sideLen0 * sideLen1)),
			);
			const angle2 = Util.NormalizeAngle(
				Math.acos((sideLen0 * sideLen0 + sideLen2 * sideLen2 - sideLen1 * sideLen1) / (2 * sideLen0 * sideLen2)),
			);
			const angle3 = Util.NormalizeAngle(
				Math.acos((sideLen1 * sideLen1 + sideLen2 * sideLen2 - sideLen0 * sideLen0) / (2 * sideLen1 * sideLen2)),
			);
			if (
				sideLen1 <= Triangle.MAX_SIDE_LENGTH &&
				sideLen1 >= Triangle.MIN_SIDE_LENGTH &&
				sideLen2 <= Triangle.MAX_SIDE_LENGTH &&
				sideLen2 >= Triangle.MIN_SIDE_LENGTH &&
				angle1 >= Triangle.MIN_TRIANGLE_ANGLE &&
				angle2 >= Triangle.MIN_TRIANGLE_ANGLE &&
				angle3 >= Triangle.MIN_TRIANGLE_ANGLE
			) {
				return new Triangle(x1, y1, x2, y2, x3, y3);
			}
			return null;
		}
		case "bomb": {
			// IB3 GameControl.CreateBomb (:5546-5558): press sets the CENTRE, drag
			// sets the radius (like a circle), and the default blast radius derives
			// from the drawn radius — round(radius * 10, 2dp). The Bomb ctor clamps
			// radius (Circle range) and blastRadius (0..50).
			const radius = Util.GetDist(x1, y1, x2, y2);
			if (radius <= 0) return null;
			return new Bomb(x1, y1, radius, Math.round(radius * 10 * 100) / 100);
		}
		case "polygon":
			// Polygon carries an N-vertex list, not press/drag/apex points, so it
			// is created via the createPolygon command, not createShape.
			throw new Error(`GameCore: createShape "polygon" not supported — use createPolygon`);
		case "cannon":
			// Cannon is created via the createCannon command, not createShape.
			throw new Error(`GameCore: createShape "cannon" not supported — use createCannon`);
		default: {
			const _never: never = kind;
			throw new Error(`GameCore: unknown shape kind ${JSON.stringify(_never)}`);
		}
	}
}

/**
 * Push a freshly-created joint/thruster into the parts graph, select it, revert
 * to the Select tool, play the SFX + fire the tutorial trigger. Shared tail of
 * MaybeCreate* (:6755-6775 / :6820-6829 / :6914-6924). Also clears any pending
 * joint gesture state.
 */
export function commitJoint(core: CoreInternals, joint: Part): void {
	clearJointHighlights(core);
	core.pendingJoint = null;
	core.pendingPrismatic = null;
	syncJointGesture(core);
	joint.id = ++core.nextId;
	const selection = [joint.id];
	const createdKind = joint.type;
	core.state = {
		...core.state,
		parts: [...core.state.parts, joint],
		// A successful create reverts to Select (ControllerGame :6760/:6770/:6825/:6919).
		edit: { ...core.state.edit, selection, selectedPart: snapshotOf(joint), tool: "select" },
	};
	core.markChanged();
	// PlayJointSound at every joint/thruster create site.
	core.emitSound("jointCreated");
	if (core.tutorialMachine) {
		core.notifyTutorial({ type: "partCreated", partKind: createdKind });
		// Joint-creation milestones the machines await beyond a bare partCreated
		// (all cursor-gated, so emitting generously is safe):
		//   Dumpbot (ControllerDumpbot.Update): a RevoluteJoint (the arm joint) ->
		//     26 "armJoint" (:179); each FixedJoint of the bucket -> 29/30
		//     "fixed1"/"fixed2" by count (:220/:224).
		//   HomeMovies (ControllerHomeMovies.Update :392): the support rect's
		//     FixedJoint -> 59 "createdRect".
		//   NewFeatures (ControllerNewFeatures.Update :305): the 4th connecting
		//     FixedJoint -> 85 "partsConnected".
		if (createdKind === "RevoluteJoint") {
			core.notifyTutorial({ type: "progress", key: "armJoint" });
		} else if (createdKind === "FixedJoint") {
			core.notifyTutorial({ type: "progress", key: "createdRect" });
			const fixedCount = core.state.parts.filter((p) => p instanceof FixedJoint).length;
			if (fixedCount === 1) core.notifyTutorial({ type: "progress", key: "fixed1" });
			else if (fixedCount === 2) core.notifyTutorial({ type: "progress", key: "fixed2" });
			if (fixedCount >= 4) core.notifyTutorial({ type: "progress", key: "partsConnected" });
		}
	}
}

export function finalizeThrusters(core: CoreInternals, part: ShapePart, x: number, y: number): void {
	commitJoint(core, new Thrusters(part, x, y));
}

export function finalizeFixedOrRevolute(core: CoreInternals, kind: "fixed" | "revolute", p1: ShapePart, p2: ShapePart, x: number, y: number): void {
	const joint =
		kind === "revolute" ? new RevoluteJoint(p1, p2, x, y) : new FixedJoint(p1, p2, x, y);
	commitJoint(core, joint);
}

export function finalizePrismatic(core: CoreInternals, p1: ShapePart, p2: ShapePart, x1: number, y1: number, x2: number, y2: number): void {
	// PrismaticJoint(p1, p2, axisStart, axisEnd): the ctor derives anchor,
	// normalized slide axis, and initLength = dist(start,end) (:56-80).
	commitJoint(core, new PrismaticJoint(p1, p2, x1, y1, x2, y2));
}

/** Clear highlightForJoint on every currently-highlighted candidate. */
export function clearJointHighlights(core: CoreInternals): void {
	if (core.pendingJoint) for (const c of core.pendingJoint.candidates) c.highlightForJoint = false;
	if (core.pendingPrismatic) core.pendingPrismatic.part1.highlightForJoint = false;
}

/**
 * Enter the >2-overlap disambiguation cycle (ControllerGame FINALIZING_JOINT,
 * :6776-6785 / :6830-6837 / :6873-6881). Highlights the initial pick (the top
 * pair for a two-shape joint, the top single otherwise) and stores the
 * candidate list; the UI cycles via cycleJointCandidate + commits via
 * finalizeJoint. `x`/`y` is the (already-snapped) joint point.
 */
export function beginJointDisambiguation(core: CoreInternals, 
	kind: "fixed" | "revolute" | "thrusters" | "prismatic1" | "prismatic2",
	candidates: ShapePart[],
	x: number,
	y: number,
): void {
	const twoShape = kind === "fixed" || kind === "revolute";
	core.pendingJoint = { kind, candidates, i1: 0, i2: 1, x, y };
	candidates[0].highlightForJoint = true;
	if (twoShape) candidates[1].highlightForJoint = true;
	syncJointGesture(core);
	core.markChanged();
}

/**
 * Advance the highlighted candidate pick (ControllerGame FINALIZING_JOINT click
 * :2435-2473). For a single-shape gesture (thrusters / prismatic step) it steps
 * i1 through the candidates cyclically (:2441-2448). For a two-shape joint it
 * walks all ordered index pairs (i1<i2), wrapping back to (0,1) after the last
 * (:2452-2472). Toggles highlightForJoint accordingly.
 */
export function cycleJointCandidate(core: CoreInternals): void {
	const pj = core.pendingJoint;
	if (!pj) return;
	for (const c of pj.candidates) c.highlightForJoint = false;
	const n = pj.candidates.length;
	const twoShape = pj.kind === "fixed" || pj.kind === "revolute";
	if (!twoShape) {
		pj.i1 = (pj.i1 + 1) % n;
		pj.candidates[pj.i1].highlightForJoint = true;
	} else {
		if (pj.i1 === n - 2 && pj.i2 === n - 1) {
			pj.i1 = 0;
			pj.i2 = 1;
		} else {
			pj.i2++;
			if (pj.i2 === n) {
				pj.i1++;
				pj.i2 = pj.i1 + 1;
			}
		}
		pj.candidates[pj.i1].highlightForJoint = true;
		pj.candidates[pj.i2].highlightForJoint = true;
	}
	core.markChanged();
}

/**
 * Commit the currently-highlighted disambiguation pick (ControllerGame
 * FINALIZING_JOINT drag-to-finalize :1667-1765). `x`/`y` is the finalize point
 * (for prismatic step 2 it is the axis-END; for prismatic step 1 it seeds the
 * pending first-click, awaiting the second click).
 */
export function finalizePendingJoint(core: CoreInternals, x: number, y: number): void {
	const pj = core.pendingJoint;
	if (!pj) return;
	const p1 = pj.candidates[pj.i1];
	switch (pj.kind) {
		case "revolute":
		case "fixed":
			finalizeFixedOrRevolute(core, pj.kind, p1, pj.candidates[pj.i2], pj.x, pj.y);
			return;
		case "thrusters":
			finalizeThrusters(core, p1, pj.x, pj.y);
			return;
		case "prismatic1": {
			// Step-1 disambiguation resolved (:1736-1742): record shape #1 + axis
			// start, then await the second click.
			for (const c of pj.candidates) c.highlightForJoint = false;
			core.pendingJoint = null;
			core.pendingPrismatic = { part1: p1, x1: pj.x, y1: pj.y };
			syncJointGesture(core);
			core.markChanged();
			core.emitSound("jointCreated");
			return;
		}
		case "prismatic2": {
			// Step-2 disambiguation resolved (:1743-1764): bind shape #2 with the
			// pending first click as the axis start and (x,y) as the axis end.
			if (!core.pendingPrismatic) {
				core.pendingJoint = null;
				return;
			}
			finalizePrismatic(core, core.pendingPrismatic.part1, p1, core.pendingPrismatic.x1, core.pendingPrismatic.y1, x, y);
			return;
		}
	}
}

/**
 * Abort the whole joint/thruster gesture (tool change, empty-space click, or an
 * explicit cancel). Clears highlights + both pending states. Mirrors the legacy
 * curAction = -1 resets in the MaybeCreate* else branches.
 */
export function cancelJointGesture(core: CoreInternals): void {
	if (!core.pendingJoint && !core.pendingPrismatic) return;
	clearJointHighlights(core);
	core.pendingJoint = null;
	core.pendingPrismatic = null;
	syncJointGesture(core);
	core.markChanged();
}

/**
 * Project the private pendingJoint / pendingPrismatic gesture state into the
 * plain-data state.jointGesture read-model the UI reads. Called after any change
 * to either field. Does NOT markChanged itself (callers do).
 */
export function syncJointGesture(core: CoreInternals): void {
	let jg: GameState["jointGesture"] = null;
	if (core.pendingJoint) jg = { phase: "disambiguate" };
	else if (core.pendingPrismatic)
		jg = { phase: "prismaticAxis", axisStart: { x: core.pendingPrismatic.x1, y: core.pendingPrismatic.y1 } };
	if (jg === null && core.state.jointGesture === null) return;
	core.state = { ...core.state, jointGesture: jg };
}

/**
 * Drop all editable robot parts, keeping the sandbox terrain, and reset the
 * editor to a clean slate. Shared by the newRobot and clearAll commands —
 * a faithful port of ControllerGame.clearButton (:4845): delete every editable
 * ShapePart/TextPart (and their joints/thrusters), leaving the static terrain.
 * Selection -> [], tool -> "select", and the undo/redo history is cleared
 * (a fresh robot has no history). The terrain is rebuilt from the current
 * sandbox settings (as setSandboxSettings does) so the ground stays consistent.
 */
export function clearRobot(core: CoreInternals): void {
	// Rebuild the sandbox terrain bodies fresh (same as setSandboxSettings), so
	// no stale robot parts survive and terrain ids stay from our monotonic source.
	const terrainParts = buildTerrainParts(core.state.sandbox);
	for (const p of terrainParts) p.id = ++core.nextId;

	// Non-editable parts that aren't sandbox terrain (isEditable=false,
	// isSandbox=false — e.g. a built-in challenge course's parts) are STATIC
	// TERRAIN, not the user's robot: the legacy clear only deletes
	// PartIsEditable parts (ControllerGame.clearButton :4848), so keep them.
	// The sandbox terrain itself is rebuilt above, so drop the old copies.
	// Everything else is removed: cascade-detach + drop stale condition refs
	// like every other part-removal path (the cascade also pulls in any joint/
	// thruster attached to a removed shape, so keptParts is computed AFTER it).
	const removed = cascadeRemovalSet(core, 
		core.state.parts.filter((p) => p.isEditable || p.isSandbox).map((p) => p.id),
	);
	clearRemovedConditionRefs(core, removed);
	const keptParts = core.state.parts.filter((p) => !removed.has(p.id));

	// A new robot has no history.
	core.undoStack = [];
	core.redoStack = [];

	core.state = {
		...core.state,
		parts: [...terrainParts, ...keptParts],
		edit: {
			...core.state.edit,
			selection: [],
			selectedPart: null,
			tool: "select",
			...core.undoRedoFlags(),
		},
	};
	core.markChanged();
	// A cleared robot changes whether parts fit the challenge build area.
	if (core.challenge) core.syncChallenge();
}

export function handleSelect(core: CoreInternals, command: Extract<Command, { type: "select" }>): void {
	let selection: number[];
	if (command.additive) {
		// Additive select TOGGLES membership, faithful to the legacy shift-click:
		// an already-selected part is REMOVED (Util.RemoveFromArray branch,
		// ControllerGame :1292-1293), an unselected one is added (:1291). A
		// marquee add (multiple ids) still unions — a shift-marquee never
		// removes in the legacy (BOX_SELECTING pushes, :2407).
		const merged = new Set(core.state.edit.selection);
		if (command.partIds.length === 1) {
			const id = command.partIds[0];
			if (merged.has(id)) merged.delete(id);
			else merged.add(id);
		} else {
			for (const id of command.partIds) merged.add(id);
		}
		selection = [...merged];
	} else {
		selection = [...command.partIds];
	}
	core.state = {
		...core.state,
		edit: { ...core.state.edit, selection, selectedPart: deriveSelectedPart(core, selection) },
	};
	core.markChanged();
	// RubeGoldberg selection milestones (ControllerRubeGoldberg.Update
	// :685/:697): a single part selected -> 73 "rectSelected"; two parts
	// selected -> 76 "selectedRects". Cursor-gated, so emit both generously.
	if (core.tutorialMachine) {
		if (selection.length === 1) core.notifyTutorial({ type: "progress", key: "rectSelected" });
		else if (selection.length === 2) core.notifyTutorial({ type: "progress", key: "selectedRects" });
	}
	return;
}

export function handleCreateShape(core: CoreInternals, command: Extract<Command, { type: "createShape" }>): void {
	// Restriction gate (ControllerChallenge.circle/rect/triangleButton
	// :92-123): reject a disallowed part type in challenge play mode.
	const kindMap: Record<ShapeKind, CreatePartKind> = {
		circle: "circle",
		rect: "rect",
		triangle: "triangle",
		// Polygon isn't a distinct challenge restriction; gate it with the
		// triangle restriction (its N-vertex generalization), the way bomb
		// borrows the circle restriction below. (createShape never receives
		// "polygon" — createPolygon does — but the map must be exhaustive.)
		polygon: "triangle",
		cannon: "cannon",
		// Legacy challenges predate bombs (no bombsAllowed restriction
		// exists); gate them with the circle restriction, the family the
		// Bomb part extends.
		bomb: "circle",
	};
	if (core.challenge && !partTypeAllowed(core.challenge, kindMap[command.kind])) return;
	const part = buildDraggedShape(core, 
		command.kind,
		command.x1,
		command.y1,
		command.x2,
		command.y2,
		command.x3,
		command.y3,
	);
	// Ignore a zero-length (tiny-click) drag — the original required the
	// release point to differ from the press point before creating the
	// shape (circle: radius > 0 :2202; rect: end != start :2223; triangle:
	// end != start :2288). pushHistory already ran, but with no state
	// change undo just restores the identical graph, which is harmless.
	if (!part) return;
	// Challenge material limits clamp the new shape's friction/restitution
	// defaults (Jaybit ShapePart ctor vs ControllerGame.min/maxFriction).
	clampPartToChallengeLimits(core, part);
	// New shapes adopt the current default colour (ControllerGameGlobals.
	// defaultR/G/B/O, settable via colourButton makeDefault). The ShapePart
	// ctor seeds partDefaults; override with the live default here.
	if (part instanceof ShapePart) {
		part.red = core.defaultRed;
		part.green = core.defaultGreen;
		part.blue = core.defaultBlue;
		part.opacity = core.defaultOpacity;
	}
	// Tutorial part-created trigger (ControllerShapes.Update :28-40): the
	// new editable part type is Rectangle/Triangle/Circle.
	const createdKind = part.type;
	part.id = ++core.nextId;
	const selection = [part.id];
	core.state = {
		...core.state,
		parts: [...core.state.parts, part],
		// A SUCCESSFUL create reverts to the Select tool (curAction = -1 inline,
		// ControllerGame Circle :2203 / Rectangle :2227 / Triangle apex :2361).
		edit: { ...core.state.edit, selection, selectedPart: snapshotOf(part), tool: "select" },
	};
	core.markChanged();
	// Play the shape-create SFX (ControllerGame.PlayShapeSound call sites).
	core.emitSound("shapeCreated");
	if (core.tutorialMachine) {
		core.notifyTutorial({ type: "partCreated", partKind: createdKind });
		// Dumpbot shape-count milestones (ControllerDumpbot.Update :136/:157/
		// :214) — the whole bot is player-built. Emitting these generously is
		// safe: the machine's chain only advances on the key it expects next.
		//   two editable Circles -> 23 "wheels"           (:136)
		//   a Rectangle (the arm) -> 25 "arm"             (:157)
		//   two editable Rectangles (the bucket) -> 28 "bucket" (:214)
		const editableShapes = core.state.parts.filter((p) => p instanceof ShapePart && p.isEditable && p.isEnabled);
		const n = editableShapes.length;
		const last = editableShapes[n - 1];
		const prev = editableShapes[n - 2];
		if (last instanceof Circle && prev instanceof Circle) {
			core.notifyTutorial({ type: "progress", key: "wheels" });
		}
		if (last instanceof Rectangle) {
			core.notifyTutorial({ type: "progress", key: "arm" });
			if (prev instanceof Rectangle) core.notifyTutorial({ type: "progress", key: "bucket" });
		}
	}
	return;
}

export function handleCreatePolygon(core: CoreInternals, command: Extract<Command, { type: "createPolygon" }>): void {
	// Convex Polygon create from the multi-click gesture's ordered vertex
	// ring. Mirrors the createShape finalize path (challenge gate → build →
	// default colour/material → add → select → revert to Select tool) but
	// takes an N-vertex list. Restriction-gated with the triangle family
	// (its N-vertex generalization; there is no separate polygon restriction).
	if (core.challenge && !partTypeAllowed(core.challenge, "triangle")) return;
	const verts = command.verts;
	// Guard the degenerate inputs the gesture is supposed to prevent, so a
	// stray/programmatic dispatch can't build a bad polygon: need
	// 3..MAX_TOOL_VERTICES vertices and a SIMPLE (non-self-intersecting)
	// ring. Concave is fine — Polygon.Init ear-clips it into convex collision
	// fixtures — but a self-crossing bow-tie can't be triangulated, and
	// b2PolygonShape doesn't validate geometry (asserts compiled out). Undo
	// of a no-op create is harmless.
	if (!verts || verts.length < 3 || verts.length > Polygon.MAX_TOOL_VERTICES) return;
	// Simplicity is checked on the TESSELLATED ring so a bézier edge that
	// bows out into a self-crossing shape is refused (the ear-clip needs a
	// simple ring). For an all-VERTEX ring this is exactly isSimple(verts).
	const cpHandlesIn = command.handlesIn ? command.handlesIn.map((h) => (h ? { x: h.x, y: h.y } : { x: 0, y: 0 })) : verts.map(() => ({ x: 0, y: 0 }));
	const cpHandlesOut = command.handlesOut ? command.handlesOut.map((h) => (h ? { x: h.x, y: h.y } : { x: 0, y: 0 })) : verts.map(() => ({ x: 0, y: 0 }));
	const cpTess = Polygon.tessellateRing(verts, cpHandlesIn, cpHandlesOut, Polygon.BEZIER_SAMPLES);
	if (!Polygon.isSimple(cpTess)) return;
	const part = new Polygon(
		verts.map((v) => new b2Vec2(v.x, v.y)),
		0,
		command.pointTypes,
		cpHandlesIn,
		cpHandlesOut
	);
	// Challenge material limits clamp friction/restitution defaults, exactly
	// like createShape (Jaybit ShapePart ctor vs ControllerGame.min/maxFriction).
	clampPartToChallengeLimits(core, part);
	// Adopt the current default colour (ControllerGameGlobals.defaultR/G/B/O),
	// as every new shape does.
	part.red = core.defaultRed;
	part.green = core.defaultGreen;
	part.blue = core.defaultBlue;
	part.opacity = core.defaultOpacity;
	const createdKind = part.type;
	part.id = ++core.nextId;
	const selection = [part.id];
	core.state = {
		...core.state,
		parts: [...core.state.parts, part],
		// A successful create reverts to the Select tool, like createShape.
		edit: { ...core.state.edit, selection, selectedPart: snapshotOf(part), tool: "select" },
	};
	core.markChanged();
	core.emitSound("shapeCreated");
	if (core.tutorialMachine) core.notifyTutorial({ type: "partCreated", partKind: createdKind });
	return;
}

export function handleEditPolygonPoint(core: CoreInternals, command: Extract<Command, { type: "editPolygonPoint" }>): void {
	editParts(core, [command.partId], (p) => {
		if (!(p instanceof Polygon)) return;
		// Fold any rotation into the baseline so we edit in plain world space
		// (baseline == world once angle is 0). Appearance is unchanged.
		p.BakeRotation();
		const i = command.index;
		if (i < 0 || i >= p.vertices.length) return;
		// Work on copies so an edit that would break the ring is discarded.
		const verts = p.vertices.map((v) => ({ x: v.x, y: v.y }));
		const hIn = p.handlesIn.map((v) => ({ x: v.x, y: v.y }));
		const hOut = p.handlesOut.map((v) => ({ x: v.x, y: v.y }));
		const types = p.pointTypes.slice();
		if (command.x != null) verts[i].x = command.x;
		if (command.y != null) verts[i].y = command.y;
		let type = types[i];
		// Handle edits first (respecting the CURRENT symmetric invariant).
		if (command.handleIn !== undefined) {
			hIn[i] = command.handleIn ? { x: command.handleIn.x, y: command.handleIn.y } : { x: 0, y: 0 };
			if (type === Polygon.POINT_SYMMETRIC) hOut[i] = { x: -hIn[i].x, y: -hIn[i].y };
		}
		if (command.handleOut !== undefined) {
			hOut[i] = command.handleOut ? { x: command.handleOut.x, y: command.handleOut.y } : { x: 0, y: 0 };
			if (type === Polygon.POINT_SYMMETRIC) hIn[i] = { x: -hOut[i].x, y: -hOut[i].y };
		}
		// A type toggle then re-establishes the invariant for the new mode.
		if (command.pointType != null) {
			type = command.pointType;
			const nz = (h: { x: number; y: number }) => Math.abs(h.x) > 1e-12 || Math.abs(h.y) > 1e-12;
			if (type === Polygon.POINT_VERTEX) {
				hIn[i] = { x: 0, y: 0 };
				hOut[i] = { x: 0, y: 0 };
			} else if (type === Polygon.POINT_SYMMETRIC) {
				let src: { x: number; y: number } | null = nz(hOut[i])
					? hOut[i]
					: nz(hIn[i])
						? { x: -hIn[i].x, y: -hIn[i].y }
						: null;
				if (!src) src = defaultPolyHandle(verts, i);
				hOut[i] = { x: src.x, y: src.y };
				hIn[i] = { x: -src.x, y: -src.y };
			} else if (type === Polygon.POINT_ASYMMETRIC) {
				if (!nz(hIn[i]) && !nz(hOut[i])) {
					const src = defaultPolyHandle(verts, i);
					hOut[i] = { x: src.x, y: src.y };
					hIn[i] = { x: -src.x, y: -src.y };
				}
			}
		}
		// Reject an edit that self-crosses the tessellated ring (unbuildable).
		const tess = Polygon.tessellateRing(verts, hIn, hOut, Polygon.BEZIER_SAMPLES);
		if (!Polygon.isSimple(tess)) return;
		for (let k = 0; k < verts.length; k++) {
			p.vertices[k] = new b2Vec2(verts[k].x, verts[k].y);
			p.handlesIn[k] = new b2Vec2(hIn[k].x, hIn[k].y);
			p.handlesOut[k] = new b2Vec2(hOut[k].x, hOut[k].y);
		}
		p.pointTypes = types;
		p.pointTypes[i] = type;
		p.RecomputeCenter();
	});
	return;
}

export function handleAddPolygonPoint(core: CoreInternals, command: Extract<Command, { type: "addPolygonPoint" }>): void {
	editParts(core, [command.partId], (p) => {
		if (!(p instanceof Polygon)) return;
		if (p.vertices.length >= Polygon.MAX_TOOL_VERTICES) return;
		p.BakeRotation();
		const i = command.index;
		if (i < 0 || i >= p.vertices.length) return;
		const at = i + 1; // insert AFTER `index`
		const verts = p.vertices.map((v) => ({ x: v.x, y: v.y }));
		const hIn = p.handlesIn.map((v) => ({ x: v.x, y: v.y }));
		const hOut = p.handlesOut.map((v) => ({ x: v.x, y: v.y }));
		const types = p.pointTypes.slice();
		verts.splice(at, 0, { x: command.x, y: command.y });
		hIn.splice(at, 0, { x: 0, y: 0 });
		hOut.splice(at, 0, { x: 0, y: 0 });
		types.splice(at, 0, Polygon.POINT_VERTEX);
		const tess = Polygon.tessellateRing(verts, hIn, hOut, Polygon.BEZIER_SAMPLES);
		if (!Polygon.isSimple(tess)) return;
		p.vertices = verts.map((v) => new b2Vec2(v.x, v.y));
		p.handlesIn = hIn.map((v) => new b2Vec2(v.x, v.y));
		p.handlesOut = hOut.map((v) => new b2Vec2(v.x, v.y));
		p.pointTypes = types;
		p.RecomputeCenter();
	});
	return;
}

export function handleRemovePolygonPoint(core: CoreInternals, command: Extract<Command, { type: "removePolygonPoint" }>): void {
	editParts(core, [command.partId], (p) => {
		if (!(p instanceof Polygon)) return;
		if (p.vertices.length <= 3) return; // a polygon needs >= 3 vertices
		p.BakeRotation();
		const i = command.index;
		if (i < 0 || i >= p.vertices.length) return;
		const verts = p.vertices.map((v) => ({ x: v.x, y: v.y }));
		const hIn = p.handlesIn.map((v) => ({ x: v.x, y: v.y }));
		const hOut = p.handlesOut.map((v) => ({ x: v.x, y: v.y }));
		const types = p.pointTypes.slice();
		verts.splice(i, 1);
		hIn.splice(i, 1);
		hOut.splice(i, 1);
		types.splice(i, 1);
		const tess = Polygon.tessellateRing(verts, hIn, hOut, Polygon.BEZIER_SAMPLES);
		if (!Polygon.isSimple(tess)) return;
		p.vertices = verts.map((v) => new b2Vec2(v.x, v.y));
		p.handlesIn = hIn.map((v) => new b2Vec2(v.x, v.y));
		p.handlesOut = hOut.map((v) => new b2Vec2(v.x, v.y));
		p.pointTypes = types;
		p.RecomputeCenter();
	});
	return;
}

export function handleCreateText(core: CoreInternals, command: Extract<Command, { type: "createText" }>): void {
	// TextPart(cont, x, y, w, h, text). `cont` (the old Pixi container) is
	// unused in the headless core — pass null.
	const part = new TextPart(null, command.x, command.y, DEFAULT_TEXT_W, DEFAULT_TEXT_H, command.text);
	part.id = ++core.nextId;
	const selection = [part.id];
	core.state = {
		...core.state,
		parts: [...core.state.parts, part],
		// Successful create reverts to Select (ControllerGame Text :2500).
		edit: { ...core.state.edit, selection, selectedPart: snapshotOf(part), tool: "select" },
	};
	core.markChanged();
	// Tutorial milestone (ControllerHomeMovies.Update :414-417): a TextPart
	// was created -> dialog 47 (audit L3). TextPart.type is "text"; the
	// HomeMovies machine's chain step matches part "TextPart", so pass that.
	if (core.tutorialMachine) core.notifyTutorial({ type: "partCreated", partKind: "TextPart" });
	return;
}

export function handleDeleteParts(core: CoreInternals, command: Extract<Command, { type: "deleteParts" }>): void {
	// Deleting a shape also deletes its attached joints/thrusters, and
	// removed joints/thrusters are detached from surviving shapes (the
	// legacy DeletePart cascade — see cascadeRemovalSet).
	const remove = cascadeRemovalSet(core, command.partIds);
	clearRemovedConditionRefs(core, remove);
	const parts = core.state.parts.filter((p) => !remove.has(p.id));
	const selection = core.state.edit.selection.filter((id) => !remove.has(id));
	core.state = {
		...core.state,
		parts,
		edit: { ...core.state.edit, selection, selectedPart: deriveSelectedPart(core, selection) },
	};
	core.markChanged();
	return;
}

export function handleMoveParts(core: CoreInternals, command: Extract<Command, { type: "moveParts" }>): void {
	// Drag moves the CONNECTED CLUSTER, not just the selection: legacy
	// MouseDrag seeds draggingParts with the union of every selected part's
	// GetAttachedParts() — RemoveDuplicates over the concatenation
	// (ControllerGame.ts:1443-1449 / CE ControllerGame.as:6121-6127) — so a
	// shape drags its joints and everything jointed through them (a joint
	// drags both its shapes' clusters; a TextPart drags only itself). The
	// legacy computed the set at drag START; the parts graph cannot change
	// mid-drag, so expanding on each relative moveParts is equivalent.
	const selected = command.partIds
		.map((id) => core.findPart(id))
		.filter((p): p is Part => p !== undefined);
	// IB3 superset: a LOCKED part is pinned — it can't be dragged, and it
	// doesn't drag its cluster. Any locked part in the selection is skipped;
	// the rest still move. (Locked parts stay selectable so they can be
	// unlocked via the panel.)
	if (selected.some((p) => p.locked) && selected.every((p) => p.locked)) return;
	const cluster = new Set<Part>();
	for (const sel of selected) {
		if (sel.locked) continue;
		for (const p of sel.GetAttachedParts() as Part[]) cluster.add(p);
	}
	// Never move a locked part even if pulled in via a cluster.
	for (const p of [...cluster]) if (p.locked) cluster.delete(p);
	for (const p of core.state.parts) {
		if (!cluster.has(p)) continue;
		// ShapePart stores centerX/centerY; JointPart anchorX/anchorY;
		// TextPart x/y. currentXY reads back what each type's Move() sets.
		const cur = currentXY(p);
		p.Move(cur.x + command.dx, cur.y + command.dy);
	}
	core.state = {
		...core.state,
		parts: [...core.state.parts],
		edit: { ...core.state.edit, selectedPart: deriveSelectedPart(core, core.state.edit.selection) },
	};
	core.markChanged();
	// RubeGoldberg drag milestones (ControllerRubeGoldberg.Update :693/:701):
	// dragging a single rect -> 75 "draggedRect"; dragging the two
	// multi-selected rects together -> 77 "draggedRects". Cursor-gated.
	if (core.tutorialMachine) {
		if (command.partIds.length === 1) core.notifyTutorial({ type: "progress", key: "draggedRect" });
		else if (command.partIds.length >= 2) core.notifyTutorial({ type: "progress", key: "draggedRects" });
	}
	return;
}

// Rotate the selection about its centroid by `angle` radians. GameCanvas
// feeds the incremental delta since the last pointer move.
export function handleRotateParts(core: CoreInternals, command: Extract<Command, { type: "rotateParts" }>): void {
	if (command.angle === 0) return;
	const target = new Set(command.partIds);
	const selected = core.state.parts.filter((p) => target.has(p.id));
	if (selected.length === 0) return;
	// A locked part is pinned — it can't rotate and doesn't rotate its cluster
	// (mirrors moveParts). If every selected part is locked, nothing rotates.
	if (selected.some((p) => p.locked) && selected.every((p) => p.locked)) return;
	// Pivot on the SELECTION centroid, but rotate the whole ATTACHED cluster so
	// jointed/welded assemblies turn as one rigid body — legacy rotatingParts is
	// the union of every selected part's GetAttachedParts() (ControllerGame.ts:3460),
	// matching moveParts' cluster expansion. Rotating only the raw selection would
	// tear a joint's anchors / welded partners away from the shape.
	const c = selectionCentroid(selected);
	const cluster = new Set<Part>();
	for (const sel of selected) {
		if (sel.locked) continue;
		for (const p of sel.GetAttachedParts() as Part[]) cluster.add(p);
	}
	for (const p of [...cluster]) if (p.locked) cluster.delete(p);
	for (const p of cluster) rotatePartAbout(p, c.x, c.y, command.angle);
	core.state = {
		...core.state,
		parts: [...core.state.parts],
		edit: { ...core.state.edit, selectedPart: deriveSelectedPart(core, core.state.edit.selection) },
	};
	core.markChanged();
	// RubeGoldberg milestone (ControllerRubeGoldberg.Update :689): rotating
	// the straight rect -> dialog 74 "rotated". Cursor-gated.
	if (core.tutorialMachine) core.notifyTutorial({ type: "progress", key: "rotated" });
	return;
}

export function handleCreateThrusters(core: CoreInternals, command: Extract<Command, { type: "createThrusters" }>): void {
	// Restriction gate (ControllerChallenge.thrustersButton :158-167).
	if (core.challenge && !partTypeAllowed(core.challenge, "thrusters")) return;
	// Snap the click to a shape centre when snapToCenter is on (MaybeCreate
	// Thrusters :6798-6801), then collect overlapping candidates at that point.
	const pt = snapJointPoint(core, command.x, command.y);
	const hits = shapesAt(core, pt.x, pt.y);
	if (hits.length === 0) return;
	if (hits.length > 1) {
		// >1-overlap disambiguation (MaybeCreateThrusters :6830-6837): enter the
		// cycle; the UI advances the pick + finalizes.
		beginJointDisambiguation(core, "thrusters", hits, pt.x, pt.y);
		return;
	}
	finalizeThrusters(core, hits[0], pt.x, pt.y);
	return;
}

export function handleCreateCannon(core: CoreInternals, command: Extract<Command, { type: "createCannon" }>): void {
	// Restriction gate (ControllerChallenge.cannonButton :169-178).
	if (core.challenge && !partTypeAllowed(core.challenge, "cannon")) return;
	// A Cannon is a free-standing ShapePart (NEW_CANNON flow :2274); the
	// legacy drag sizes its width, the click-to-create core uses a default.
	const cannon = new Cannon(command.x, command.y, DEFAULT_RECT_SIZE);
	// Challenge material limits clamp the defaults (see createShape).
	clampPartToChallengeLimits(core, cannon);
	// New parts adopt the current default colour (see createShape).
	cannon.red = core.defaultRed;
	cannon.green = core.defaultGreen;
	cannon.blue = core.defaultBlue;
	cannon.opacity = core.defaultOpacity;
	cannon.id = ++core.nextId;
	const selection = [cannon.id];
	core.state = {
		...core.state,
		parts: [...core.state.parts, cannon],
		// Successful create reverts to Select (ControllerGame Cannon :2256).
		edit: { ...core.state.edit, selection, selectedPart: snapshotOf(cannon), tool: "select" },
	};
	core.markChanged();
	return;
}

export function handleCreateJoint(core: CoreInternals, command: Extract<Command, { type: "createJoint" }>): void {
	// A fixed/revolute joint attaches the two overlapping shapes under the
	// click (MaybeCreateJoint :6731). Restriction gate (ControllerChallenge.
	// fj/rjButton :125-156).
	if (core.challenge && !partTypeAllowed(core.challenge, command.kind)) return;
	// Snap the click to a shape centre when snapToCenter is on (:6737-6740),
	// then collect candidates at the (snapped) point.
	const pt = snapJointPoint(core, command.x, command.y);
	const hits = shapesAt(core, pt.x, pt.y);
	if (hits.length < 2) {
		// <2 candidates: nothing to join (MaybeCreateJoint else :6786-6788).
		return;
	}
	if (hits.length > 2) {
		// >2-overlap disambiguation (MaybeCreateJoint :6776-6785): enter the
		// cycle; the UI advances the pick + finalizes.
		beginJointDisambiguation(core, command.kind, hits, pt.x, pt.y);
		return;
	}
	// Exactly two: create immediately (MaybeCreateJoint :6751-6773).
	finalizeFixedOrRevolute(core, command.kind, hits[0], hits[1], pt.x, pt.y);
	return;
}

export function handleStartPrismaticJoint(core: CoreInternals, command: Extract<Command, { type: "startPrismaticJoint" }>): void {
	// Two-click prismatic, click 1 (MaybeStartCreatingPrismaticJoint :6844).
	if (core.challenge && !partTypeAllowed(core.challenge, "prismatic")) return;
	// Shift held (bypassSnap): use the raw point so the UI's 15° axis snap
	// isn't overridden by snap-to-center (ui-hotkeys §4.4).
	const pt = command.bypassSnap ? { x: command.x, y: command.y } : snapJointPoint(core, command.x, command.y);
	const hits = shapesAt(core, pt.x, pt.y);
	if (hits.length === 0) {
		// No shape under click 1 — abort (:6864-6866).
		cancelJointGesture(core);
		return;
	}
	if (hits.length > 1) {
		// >1-overlap: disambiguate which shape #1 binds (:6873-6881).
		beginJointDisambiguation(core, "prismatic1", hits, pt.x, pt.y);
		return;
	}
	// Record shape #1 + axis-start point; await click 2 (:6867-6872).
	core.pendingPrismatic = { part1: hits[0], x1: pt.x, y1: pt.y };
	syncJointGesture(core);
	core.markChanged();
	core.emitSound("jointCreated");
	return;
}

export function handleFinishPrismaticJoint(core: CoreInternals, command: Extract<Command, { type: "finishPrismaticJoint" }>): void {
	// Two-click prismatic, click 2 (MaybeFinishCreatingPrismaticJoint :6884).
	if (!core.pendingPrismatic) return;
	// Shift held (bypassSnap): use the raw point so the UI's 15° axis snap on
	// the second click isn't overridden by snap-to-center (ui-hotkeys §4.4).
	const pt = command.bypassSnap
		? { x: command.x, y: command.y }
		: snapJointPoint(core, command.x, command.y, core.pendingPrismatic.part1);
	// Candidates exclude shape #1 (:6896).
	const hits = shapesAt(core, pt.x, pt.y).filter((p) => p !== core.pendingPrismatic!.part1);
	if (hits.length === 0) {
		// No second shape — abort (:6933-6935).
		cancelJointGesture(core);
		return;
	}
	if (hits.length > 1) {
		// >1-overlap: disambiguate shape #2 (:6925-6932).
		beginJointDisambiguation(core, "prismatic2", hits, pt.x, pt.y);
		return;
	}
	finalizePrismatic(core, core.pendingPrismatic.part1, hits[0], core.pendingPrismatic.x1, core.pendingPrismatic.y1, pt.x, pt.y);
	return;
}
