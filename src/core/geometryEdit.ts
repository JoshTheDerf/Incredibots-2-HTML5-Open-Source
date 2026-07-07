// Rotate / resize / mirror geometry — pure per-part transforms.
//
// Extracted from GameCore's "Rotate / resize geometry" section: the geometric
// computation (per-part scale/rotate/mirror maths against explicit inputs)
// lives here as free functions; GameCore keeps the thin command handlers
// (history, state rebuild, gesture fields like resizeGesture) that call in.

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
import { containingPieceIndex } from "./polygonBoolean";
import type { Vec2 } from "./polygonBoolean";
import { triggerDirectionSwitch } from "./triggers";

/** Current move anchor of a Part in world units, matching what each type's Move() sets. */
export function currentXY(part: Part): { x: number; y: number } {
	// Return the value each part type's Move() sets, so the play->reset restore
	// (handleReset: snap.part.Move(snap.x, snap.y)) is a no-op relative to the
	// pre-play position. JointPart.Move sets anchorX/anchorY; Thrusters.Move sets
	// centerX/centerY (Thrusters extends Part, NOT ShapePart, so check it before
	// ShapePart); ShapePart.Move sets centerX/centerY; TextPart.Move sets x/y.
	// Previously non-shape/text parts returned {0,0}, so reset dragged every
	// joint and thruster to the origin.
	if (part instanceof JointPart) return { x: part.anchorX, y: part.anchorY };
	if (part instanceof Thrusters) return { x: part.centerX, y: part.centerY };
	if (part instanceof ShapePart) return { x: part.centerX, y: part.centerY };
	if (part instanceof TextPart) return { x: part.x, y: part.y };
	return { x: 0, y: 0 };
}

/**
 * Selection centroid used as the pivot for both rotate and resize. The legacy
 * ControllerGame rotates about the highest-mass ShapePart's centre
 * (rotatingPart, :3449-3458) and resizes about selectedParts[0]'s centre
 * (initDragX/Y, :3985-3996). We use the mean of the parts' anchors, a stable
 * pivot independent of selection order that coincides with the single part's
 * own centre in the common one-part case.
 */
export function selectionCentroid(parts: Part[]): { x: number; y: number } {
	let sx = 0;
	let sy = 0;
	for (const p of parts) {
		const xy = currentXY(p);
		sx += xy.x;
		sy += xy.y;
	}
	const n = parts.length || 1;
	return { x: sx / n, y: sy / n };
}

/**
 * Rotate a part about (cx,cy) by `delta` radians, moving its anchor and (for
 * shapes/thrusters) advancing its own orientation. Incremental form of
 * ControllerGame's RotateAround path (MouseDrag :1533) — rotation composes
 * additively, so feeding the per-move delta equals the original's
 * `newAngle - initAngle`.
 */
export function rotatePartAbout(p: Part, cx: number, cy: number, delta: number): void {
	const anchor = currentXY(p);
	const dx = anchor.x - cx;
	const dy = anchor.y - cy;
	const cos = Math.cos(delta);
	const sin = Math.sin(delta);
	const nx = cx + dx * cos - dy * sin;
	const ny = cy + dx * sin + dy * cos;
	if (p instanceof ShapePart) {
		p.Move(nx, ny);
		p.angle += delta;
	} else if (p instanceof Thrusters) {
		p.centerX = nx;
		p.centerY = ny;
		p.angle += delta;
	} else if (p instanceof JointPart) {
		p.Move(nx, ny);
		if (p instanceof PrismaticJoint) {
			const ax = p.axis.x;
			const ay = p.axis.y;
			p.axis.x = ax * cos - ay * sin;
			p.axis.y = ax * sin + ay * cos;
		}
	}
}

/**
 * The resize/mirror pivot anchor of a Part (ControllerGame.scaleButton :3980
 * & mirror* :3495): JointPart → (anchorX,anchorY); TextPart → centre
 * (x+w/2, y+h/2); Thrusters → (centerX,centerY); ShapePart → (centerX,centerY).
 */
export function resizeAnchor(part: Part): { x: number; y: number } {
	if (part instanceof JointPart) return { x: part.anchorX, y: part.anchorY };
	if (part instanceof TextPart) return { x: part.x + part.w / 2, y: part.y + part.h / 2 };
	if (part instanceof Thrusters) return { x: part.centerX, y: part.centerY };
	if (part instanceof ShapePart) return { x: part.centerX, y: part.centerY };
	return { x: 0, y: 0 };
}

/**
 * Captured on `resizeStart`: the pivot (selectedParts[0]'s anchor), the whole
 * attached cluster (GetAttachedParts union), each part's dragOff from the pivot,
 * and each part's PrepareForResizing() snapshot. `resizeParts` applies the TOTAL
 * from-baseline factor against this; `resizeEnd` clears it. Holds live Part
 * references (persist across pushHistory, which only clones into the undo stack).
 */
export interface ResizeGesture {
	pivotX: number;
	pivotY: number;
	parts: Part[];
	dragXOff: number[];
	dragYOff: number[];
}

/**
 * resizeStart — ControllerGame.scaleButton() (:3975-4021). Pivot = the FIRST
 * selected part's anchor (:3980-3991), captured ONCE. The dragging set is the
 * union of every selected part's GetAttachedParts() — the whole connected
 * cluster (:3994-3997). Per part we record dragOff = anchor − pivot (:3998-4010)
 * and snapshot its immutable baseline via PrepareForResizing() (:4011).
 */
export function beginResizeGesture(selected: Part[]): ResizeGesture {
	const pivot = resizeAnchor(selected[0]);

	// Union of every selected part's attached cluster (Util.RemoveDuplicates
	// over concatenated GetAttachedParts, :3994-3997).
	const cluster: Part[] = [];
	const seen = new Set<Part>();
	for (const sel of selected) {
		for (const p of sel.GetAttachedParts() as Part[]) {
			if (!seen.has(p)) {
				seen.add(p);
				cluster.push(p);
			}
		}
	}

	const dragXOff: number[] = [];
	const dragYOff: number[] = [];
	for (const p of cluster) {
		const a = resizeAnchor(p);
		p.dragXOff = a.x - pivot.x;
		p.dragYOff = a.y - pivot.y;
		dragXOff.push(p.dragXOff);
		dragYOff.push(p.dragYOff);
		p.PrepareForResizing();
	}

	return { pivotX: pivot.x, pivotY: pivot.y, parts: cluster, dragXOff, dragYOff };
}

/**
 * resizeApply — the RESIZING_SHAPES branch of MouseDrag (:1553-1665). `sf` is
 * the TOTAL from-baseline scale factor (already mapped from the mouse delta by
 * the caller, :1555-1562). We clamp it against every part's init* baseline so
 * no shape leaves its legal size range (:1564-1620), then set geometry =
 * baseline × sf and reposition each part so anchor = pivot + dragOff × sf
 * (:1621-1663). Geometry is derived from the init* snapshot, NOT live geometry.
 */
export function applyResizeGesture(g: ResizeGesture, scaleFactor: number): void {
	let sf = scaleFactor;
	// Clamp pass (:1564-1620) — verbatim per part type against the init* baseline.
	for (const p of g.parts) {
		if (p instanceof Circle) {
			if (p.initRadius * sf > Circle.MAX_RADIUS) sf = Circle.MAX_RADIUS / p.initRadius;
			if (p.initRadius * sf < Circle.MIN_RADIUS) sf = Circle.MIN_RADIUS / p.initRadius;
		} else if (p instanceof Rectangle) {
			if (p.initW * sf > Rectangle.MAX_WIDTH) sf = Rectangle.MAX_WIDTH / p.initW;
			if (p.initW * sf < Rectangle.MIN_WIDTH) sf = Rectangle.MIN_WIDTH / p.initW;
			if (p.initH * sf > Rectangle.MAX_WIDTH) sf = Rectangle.MAX_WIDTH / p.initH;
			if (p.initH * sf < Rectangle.MIN_WIDTH) sf = Rectangle.MIN_WIDTH / p.initH;
		} else if (p instanceof Triangle) {
			const length1 = Util.GetDist(p.initX1, p.initY1, p.initX2, p.initY2);
			if (length1 * sf > Triangle.MAX_SIDE_LENGTH) sf = Triangle.MAX_SIDE_LENGTH / length1;
			if (length1 * sf < Triangle.MIN_SIDE_LENGTH) sf = Triangle.MIN_SIDE_LENGTH / length1;
			const length2 = Util.GetDist(p.initX1, p.initY1, p.initX3, p.initY3);
			if (length2 * sf > Triangle.MAX_SIDE_LENGTH) sf = Triangle.MAX_SIDE_LENGTH / length2;
			if (length2 * sf < Triangle.MIN_SIDE_LENGTH) sf = Triangle.MIN_SIDE_LENGTH / length2;
			const length3 = Util.GetDist(p.initX2, p.initY2, p.initX3, p.initY3);
			if (length3 * sf > Triangle.MAX_SIDE_LENGTH) sf = Triangle.MAX_SIDE_LENGTH / length3;
			if (length3 * sf < Triangle.MIN_SIDE_LENGTH) sf = Triangle.MIN_SIDE_LENGTH / length3;
		} else if (p instanceof Polygon) {
			// Clamp every edge to Polygon's legal side range (PolygonPart.as:219-247).
			const iv = p.initVertices;
			for (let k = 0; k < iv.length; k++) {
				const a = iv[k];
				const b = iv[(k + 1) % iv.length];
				const len = Util.GetDist(a.x, a.y, b.x, b.y);
				if (len * sf > Polygon.MAX_SIDE_LENGTH) sf = Polygon.MAX_SIDE_LENGTH / len;
				if (len * sf < Polygon.MIN_SIDE_LENGTH) sf = Polygon.MIN_SIDE_LENGTH / len;
			}
		} else if (p instanceof Cannon) {
			if (p.initW * sf > Cannon.MAX_WIDTH) sf = Cannon.MAX_WIDTH / p.initW;
			if (p.initW * sf < Cannon.MIN_WIDTH) sf = Cannon.MIN_WIDTH / p.initW;
		}
	}

	// Apply pass (:1621-1663) — verbatim.
	for (const p of g.parts) {
		const nx = g.pivotX + p.dragXOff * sf;
		const ny = g.pivotY + p.dragYOff * sf;
		if (p instanceof Circle) {
			p.radius = p.initRadius * sf;
			p.Move(nx, ny);
		} else if (p instanceof Rectangle) {
			p.w = p.initW * sf;
			p.h = p.initH * sf;
			p.Move(nx, ny);
		} else if (p instanceof Triangle) {
			p.centerX = nx;
			p.centerY = ny;
			p.x1 = p.centerX + p.initX1 * sf;
			p.y1 = p.centerY + p.initY1 * sf;
			p.x2 = p.centerX + p.initX2 * sf;
			p.y2 = p.centerY + p.initY2 * sf;
			p.x3 = p.centerX + p.initX3 * sf;
			p.y3 = p.centerY + p.initY3 * sf;
		} else if (p instanceof Polygon) {
			p.centerX = nx;
			p.centerY = ny;
			for (let k = 0; k < p.vertices.length; k++) {
				p.vertices[k].x = p.centerX + p.initVertices[k].x * sf;
				p.vertices[k].y = p.centerY + p.initVertices[k].y * sf;
				// Handles are offsets; scale by the same factor so a curved
				// polygon keeps its bezier shape when resized.
				if (p.initHandlesIn) {
					p.handlesIn[k].x = p.initHandlesIn[k].x * sf;
					p.handlesIn[k].y = p.initHandlesIn[k].y * sf;
					p.handlesOut[k].x = p.initHandlesOut[k].x * sf;
					p.handlesOut[k].y = p.initHandlesOut[k].y * sf;
				}
			}
		} else if (p instanceof Cannon) {
			p.w = p.initW * sf;
			p.Move(nx, ny);
		} else if (p instanceof JointPart) {
			p.Move(nx, ny);
			if (p instanceof PrismaticJoint) {
				p.initLength = p.initInitLength * sf;
			}
		} else if (p instanceof TextPart) {
			p.w = p.initW * sf;
			p.h = p.initH * sf;
			p.x = nx - p.w / 2;
			p.y = ny - p.h / 2;
		} else if (p instanceof Thrusters) {
			p.centerX = nx;
			p.centerY = ny;
		}
	}
}

/**
 * HORIZONTAL mirror swaps a shape's rotation-direction trigger actions
 * (CW<->CCW via TriggerDirectionSwitch, jaybit mirrorHorizontal :3798-3865);
 * vertical mirror copies the actions unchanged (:1443-1508). Applied to the
 * Circle/Rectangle/Triangle clones only — Cannon is not a trigger source.
 */
function mirrorTriggerActions(clone: ShapePart, horizontal: boolean): void {
	if (!horizontal) return;
	clone.triggerAction = triggerDirectionSwitch(clone.triggerAction);
	clone.triggerAction_2 = triggerDirectionSwitch(clone.triggerAction_2);
}

/**
 * mirrorParts — faithful port of ControllerGame.mirrorHorizontal (:3489-3730)
 * and mirrorVertical (:3732-3973), which are structurally identical and differ
 * only in the reflected axis. `h` = true for horizontal (reflect X about centerX,
 * angle → π − a), false for vertical (reflect Y about centerY, angle → 2π − a).
 *
 * Pass 1 clones each SELECTED shape and records a partMapping parallel to the
 * ORIGINAL selection (the clone for shapes, -1 for joints/thrusters/text).
 * Pass 2 rebinds each selected joint/thruster via the mapping; a joint/thruster
 * whose target is not in the selection is dropped (:3625-3641).
 *
 * Returns the mirrored clones (no ids assigned); GameCore finalizes — fresh
 * ids, append, select (its DEVIATION: no legacy PASTE mouse-drag, :3692-3722 —
 * clones are placed at their mirrored positions directly).
 */
export function buildMirroredParts(selectedParts: Part[], centerX: number, centerY: number, h: boolean): Part[] {
	const newParts: Part[] = [];
	// Parallel to selectedParts: the clone for a shape/text, or -1 for the
	// entries Pass 2 rebinds against (joints, thrusters). Note the legacy pushes
	// the TextPart CLONE into newParts but records -1 in the mapping (:3591-3608).
	const partMapping: (ShapePart | -1)[] = [];

	// --- Pass 1: shapes + text ---
	for (const sp of selectedParts) {
		if (sp instanceof Bomb) {
			// Bomb BEFORE the Circle branch (Bomb extends Circle) — the clone must
			// stay a Bomb. MakeCopy carries every bomb + Jaybit field; only the
			// mirrored position/angle differ (same maths as the Circle branch).
			const b = sp.MakeCopy() as Bomb;
			b.Move(h ? centerX - (sp.centerX - centerX) : sp.centerX, h ? sp.centerY : centerY - (sp.centerY - centerY));
			b.angle = h ? Math.PI - sp.angle : 2 * Math.PI - sp.angle;
			mirrorTriggerActions(b, h);
			newParts.push(b);
			partMapping.push(b);
		} else if (sp instanceof Circle) {
			const c = h
				? new Circle(centerX - (sp.centerX - centerX), sp.centerY, sp.radius)
				: new Circle(sp.centerX, centerY - (sp.centerY - centerY), sp.radius);
			c.angle = h ? Math.PI - sp.angle : 2 * Math.PI - sp.angle;
			c.isStatic = sp.isStatic;
			c.density = sp.density;
			c.collide = sp.collide;
			c.red = sp.red;
			c.green = sp.green;
			c.blue = sp.blue;
			c.opacity = sp.opacity;
			c.outline = sp.outline;
			c.terrain = sp.terrain;
			c.undragable = sp.undragable;
			// Jaybit mirror fix: material/collision-layer/trigger fields propagate
			// to the mirrored clone (centralized in ShapePart.CopyJaybitFieldsTo —
			// CE-mirrored parts silently reset any field not copied explicitly).
			sp.CopyJaybitFieldsTo(c);
			mirrorTriggerActions(c, h);
			newParts.push(c);
			partMapping.push(c);
		} else if (sp instanceof Rectangle) {
			const r = h
				? new Rectangle(centerX - (sp.x - centerX), sp.y, -sp.w, sp.h)
				: new Rectangle(sp.x, centerY - (sp.y - centerY), sp.w, -sp.h);
			r.angle = h ? Math.PI - sp.angle : 2 * Math.PI - sp.angle;
			r.isStatic = sp.isStatic;
			r.density = sp.density;
			r.collide = sp.collide;
			r.red = sp.red;
			r.green = sp.green;
			r.blue = sp.blue;
			r.opacity = sp.opacity;
			r.outline = sp.outline;
			r.terrain = sp.terrain;
			r.undragable = sp.undragable;
			sp.CopyJaybitFieldsTo(r); // Jaybit mirror fix (see Circle above)
			mirrorTriggerActions(r, h);
			newParts.push(r);
			partMapping.push(r);
		} else if (sp instanceof Triangle) {
			const verts = sp.GetVertices();
			const t = h
				? new Triangle(
						centerX - (verts[0].x - centerX),
						verts[0].y,
						centerX - (verts[1].x - centerX),
						verts[1].y,
						centerX - (verts[2].x - centerX),
						verts[2].y,
				  )
				: new Triangle(
						verts[0].x,
						centerY - (verts[0].y - centerY),
						verts[1].x,
						centerY - (verts[1].y - centerY),
						verts[2].x,
						centerY - (verts[2].y - centerY),
				  );
			t.isStatic = sp.isStatic;
			t.density = sp.density;
			t.collide = sp.collide;
			t.red = sp.red;
			t.green = sp.green;
			t.blue = sp.blue;
			t.opacity = sp.opacity;
			t.outline = sp.outline;
			t.terrain = sp.terrain;
			t.undragable = sp.undragable;
			sp.CopyJaybitFieldsTo(t); // Jaybit mirror fix (see Circle above)
			mirrorTriggerActions(t, h);
			newParts.push(t);
			partMapping.push(t);
		} else if (sp instanceof Polygon) {
			// Mirror every ROTATED vertex about the pivot axis (same maths as the
			// Triangle branch, N verts). The Polygon ctor re-normalizes winding
			// (mirroring flips it) so the b2PolygonShape still builds outward normals.
			const verts = (sp.GetVertices() as { x: number; y: number }[]).map((v) =>
				h ? new b2Vec2(centerX - (v.x - centerX), v.y) : new b2Vec2(v.x, centerY - (v.y - centerY)),
			);
			const pg = new Polygon(verts);
			pg.isStatic = sp.isStatic;
			pg.density = sp.density;
			pg.collide = sp.collide;
			pg.red = sp.red;
			pg.green = sp.green;
			pg.blue = sp.blue;
			pg.opacity = sp.opacity;
			pg.outline = sp.outline;
			pg.terrain = sp.terrain;
			pg.undragable = sp.undragable;
			sp.CopyJaybitFieldsTo(pg); // Jaybit mirror fix (see Circle above)
			mirrorTriggerActions(pg, h);
			newParts.push(pg);
			partMapping.push(pg);
		} else if (sp instanceof Cannon) {
			const ca = h
				? new Cannon(centerX - (sp.x - centerX) - sp.w, sp.y, sp.w)
				: new Cannon(sp.x, centerY - (sp.y - centerY) - sp.w / 2, sp.w);
			ca.angle = h ? Math.PI - sp.angle : 2 * Math.PI - sp.angle;
			ca.isStatic = sp.isStatic;
			ca.density = sp.density;
			ca.collide = sp.collide;
			ca.red = sp.red;
			ca.green = sp.green;
			ca.blue = sp.blue;
			ca.opacity = sp.opacity;
			ca.outline = sp.outline;
			ca.terrain = sp.terrain;
			ca.undragable = sp.undragable;
			ca.fireKey = sp.fireKey;
			ca.strength = sp.strength;
			ca.triggerList = sp.triggerList;
			sp.CopyJaybitFieldsTo(ca); // Jaybit mirror fix (see Circle above)
			newParts.push(ca);
			partMapping.push(ca);
		} else if (sp instanceof TextPart) {
			const te = h
				? new TextPart(null, centerX - (sp.x + sp.w / 2 - centerX), sp.y, sp.w, sp.h, sp.text, sp.inFront)
				: new TextPart(null, sp.x, centerY - (sp.y + sp.h / 2 - centerY), sp.w, sp.h, sp.text, sp.inFront);
			te.red = sp.red;
			te.green = sp.green;
			te.blue = sp.blue;
			te.size = sp.size;
			te.alwaysVisible = sp.alwaysVisible;
			te.inFront = sp.inFront;
			te.scaleWithZoom = sp.scaleWithZoom;
			te.displayKey = sp.displayKey;
			// Jaybit mirror fix: the data-only trigger listen list propagates.
			te.triggerList = sp.triggerList;
			newParts.push(te);
			partMapping.push(-1);
		} else if (sp instanceof JointPart || sp instanceof Thrusters) {
			partMapping.push(-1);
		}
	}

	// --- Pass 2: joints + thrusters ---
	for (const sp of selectedParts) {
		let index1 = -1;
		let index2 = -1;
		if (sp instanceof JointPart) {
			for (let j = 0; j < selectedParts.length; j++) {
				if (selectedParts[j] === sp.part1) index1 = j;
				if (selectedParts[j] === sp.part2) index2 = j;
			}
			if (index1 === -1 || index2 === -1) continue;
		} else if (sp instanceof Thrusters) {
			for (let j = 0; j < selectedParts.length; j++) {
				if (selectedParts[j] === sp.shape) index1 = j;
			}
			if (index1 === -1) continue;
		}

		if (sp instanceof FixedJoint) {
			const p1 = partMapping[index1];
			const p2 = partMapping[index2];
			if (p1 === -1 || p2 === -1) continue;
			const fj = h
				? new FixedJoint(p1, p2, centerX - (sp.anchorX - centerX), sp.anchorY)
				: new FixedJoint(p1, p2, sp.anchorX, centerY - (sp.anchorY - centerY));
			// Jaybit mirror fix: the data-only trigger listen list propagates.
			fj.triggerList = sp.triggerList;
			newParts.push(fj);
		} else if (sp instanceof RevoluteJoint) {
			const p1 = partMapping[index1];
			const p2 = partMapping[index2];
			if (p1 === -1 || p2 === -1) continue;
			const rj = h
				? new RevoluteJoint(p1, p2, centerX - (sp.anchorX - centerX), sp.anchorY)
				: new RevoluteJoint(p1, p2, sp.anchorX, centerY - (sp.anchorY - centerY));
			rj.enableMotor = sp.enableMotor;
			rj.motorCWKey = sp.motorCCWKey;
			rj.motorCCWKey = sp.motorCWKey;
			rj.motorStrength = sp.motorStrength;
			rj.motorSpeed = sp.motorSpeed;
			rj.motorLowerLimit = -sp.motorUpperLimit;
			rj.motorUpperLimit = -sp.motorLowerLimit;
			rj.isStiff = sp.isStiff;
			rj.autoCW = sp.autoCCW;
			rj.autoCCW = sp.autoCW;
			// Jaybit mirror fix: the data-only trigger listen list propagates.
			rj.triggerList = sp.triggerList;
			newParts.push(rj);
		} else if (sp instanceof PrismaticJoint) {
			const p1 = partMapping[index1];
			const p2 = partMapping[index2];
			if (p1 === -1 || p2 === -1) continue;
			const pj = new PrismaticJoint(p1, p2, 0, 0, 1, 1);
			pj.anchorX = h ? centerX - (sp.anchorX - centerX) : sp.anchorX;
			pj.anchorY = h ? sp.anchorY : centerY - (sp.anchorY - centerY);
			let axisAngle = Math.atan2(sp.axis.y, sp.axis.x);
			axisAngle = Util.NormalizeAngle(h ? Math.PI - axisAngle : 2 * Math.PI - axisAngle);
			pj.axis = new b2Vec2(Math.cos(axisAngle), Math.sin(axisAngle));
			pj.axis.Normalize();
			pj.initLength = sp.initLength;
			pj.enablePiston = sp.enablePiston;
			pj.pistonUpKey = sp.pistonUpKey;
			pj.pistonDownKey = sp.pistonDownKey;
			pj.pistonStrength = sp.pistonStrength;
			pj.pistonSpeed = sp.pistonSpeed;
			pj.isStiff = sp.isStiff;
			pj.autoOscillate = sp.autoOscillate;
			pj.red = sp.red;
			pj.green = sp.green;
			pj.blue = sp.blue;
			pj.opacity = sp.opacity;
			pj.outline = sp.outline;
			pj.collide = sp.collide;
			// Jaybit mirror fix: the piston's collision layers + subColl (+ the
			// data-only trigger list) propagate to the mirrored clone.
			pj.collA = sp.collA;
			pj.collB = sp.collB;
			pj.collC = sp.collC;
			pj.collD = sp.collD;
			pj.subColl = sp.subColl;
			pj.triggerList = sp.triggerList;
			newParts.push(pj);
		} else if (sp instanceof Thrusters) {
			const parent = partMapping[index1];
			if (parent === -1) continue;
			const th = h
				? new Thrusters(parent, centerX - (sp.centerX - centerX), sp.centerY)
				: new Thrusters(parent, sp.centerX, centerY - (sp.centerY - centerY));
			th.angle = h ? Math.PI - sp.angle : 2 * Math.PI - sp.angle;
			th.strength = sp.strength;
			th.thrustKey = sp.thrustKey;
			th.autoOn = sp.autoOn;
			// Jaybit mirror fix: the data-only trigger listen list propagates.
			th.triggerList = sp.triggerList;
			newParts.push(th);
		}
	}

	return newParts;
}

// --- Boolean "Subtract Shape" helpers ------------------------------------
//
// Part-aware geometry for the `subtractShapes` command. The pure ring maths
// (difference, dedupe, containment) lives in polygonBoolean.ts; GameCore keeps
// the orchestrating handler (state rebuild, selection, condition-ref cleanup).

/** Segments per circle when a Circle is sampled to a ring for boolean ops. */
const SUBTRACT_CIRCLE_SEGMENTS = 24;

/**
 * The WORLD-space outline ring of a shape for boolean geometry, or null when
 * the part isn't a meaningful subtraction operand. Rectangle/Triangle expose
 * angle-applied world vertices via GetVertices(); a (possibly curved/concave)
 * Polygon uses its dense tessellated ring; a Circle is sampled as a regular
 * N-gon. Cannon and Bomb (a Circle subclass carrying explosive behaviour, not
 * plain geometry) are excluded.
 */
export function shapeWorldRing(part: ShapePart): Vec2[] | null {
	if (part instanceof Cannon || part instanceof Bomb) return null;
	if (part instanceof Circle) {
		const n = SUBTRACT_CIRCLE_SEGMENTS;
		const ring: Vec2[] = [];
		for (let i = 0; i < n; i++) {
			const a = (i / n) * 2 * Math.PI;
			ring.push({ x: part.centerX + part.radius * Math.cos(a), y: part.centerY + part.radius * Math.sin(a) });
		}
		return ring;
	}
	if (part instanceof Polygon) {
		return (part.GetTessellatedVertices() as { x: number; y: number }[]).map((v) => ({ x: v.x, y: v.y }));
	}
	if (part instanceof Rectangle || part instanceof Triangle) {
		return (part.GetVertices() as { x: number; y: number }[]).map((v) => ({ x: v.x, y: v.y }));
	}
	return null;
}

/**
 * Build a result Polygon (world-space baseline, angle 0) for one piece of a
 * subtraction, carrying over the target shape's material + appearance
 * (mirrors Polygon.MakeCopy): density/friction/restitution, colour/opacity,
 * outlines, collision flags, and the IB3 superset fields (via
 * CopyJaybitFieldsTo). The id is assigned by the caller.
 */
export function buildSubtractPolygon(ring: Vec2[], targetPart: ShapePart): Polygon {
	const poly = new Polygon(
		ring.map((v) => new b2Vec2(v.x, v.y)),
		0,
	);
	poly.density = targetPart.density;
	poly.collide = targetPart.collide;
	poly.isStatic = targetPart.isStatic;
	poly.red = targetPart.red;
	poly.green = targetPart.green;
	poly.blue = targetPart.blue;
	poly.opacity = targetPart.opacity;
	poly.outline = targetPart.outline;
	poly.terrain = targetPart.terrain; // "Outlines Behind"
	poly.undragable = targetPart.undragable;
	poly.isCameraFocus = targetPart.isCameraFocus;
	// friction/restitution, collision layers A-D + subColl, triggers, buoyant,
	// fixedRotation, and the IB3 superset fields (graphicType/borderOpacity/
	// locked/visualInSim/scaleToZoom).
	targetPart.CopyJaybitFieldsTo(poly);
	return poly;
}

/**
 * World anchor point where `side` (1 == part1, 2 == part2) of a joint attaches.
 * Revolute/Fixed joints share a single pivot (anchorX/anchorY); a PrismaticJoint
 * attaches part1 at one axis endpoint and part2 at the other (anchor ∓ axis·L/2).
 */
function subtractJointAnchor(j: JointPart, side: 1 | 2): { x: number; y: number } {
	if (j instanceof PrismaticJoint) {
		const half = j.initLength / 2;
		const sign = side === 1 ? -1 : 1;
		return { x: j.anchorX + sign * j.axis.x * half, y: j.anchorY + sign * j.axis.y * half };
	}
	return { x: j.anchorX, y: j.anchorY };
}

/**
 * Joint bookkeeping for a subtraction. Returns the ids of joints to DELETE and,
 * as a side effect, RE-POINTS surviving target-joints onto the piece Polygon
 * that contains their anchor. Policy:
 *   - a joint connected to a deleted SUBTRAHEND is deleted;
 *   - a joint connected to the TARGET is re-pointed to the piece containing its
 *     (target-side) anchor, or deleted if that anchor fell in a removed region
 *     (no piece contains it — including the full-cover case where there are no
 *     pieces at all);
 *   - a joint touching neither is left untouched.
 * Deleted joints are also detached from any SURVIVING shape's m_joints so no
 * live shape keeps a reference to a gone joint.
 */
export function cleanupJointsForSubtraction(
	parts: Part[],
	targetPart: ShapePart,
	subSet: Set<ShapePart>,
	pieceRings: Vec2[][],
	piecePolys: Polygon[],
): Set<number> {
	const removeIds = new Set<number>();
	for (const p of parts) {
		if (!(p instanceof JointPart)) continue;
		const j = p as JointPart;
		// (1) Connected to a deleted subtrahend → delete the joint.
		if (subSet.has(j.part1) || subSet.has(j.part2)) {
			removeIds.add(j.id);
			continue;
		}
		const p1IsTarget = j.part1 === targetPart;
		const p2IsTarget = j.part2 === targetPart;
		if (!p1IsTarget && !p2IsTarget) continue; // unrelated joint — leave it alone
		// (2) Connected to the target → find the piece holding each target-side
		// anchor; delete if any target side has no containing piece.
		const idx1 = p1IsTarget ? containingPieceIndex(subtractJointAnchor(j, 1), pieceRings) : -1;
		const idx2 = p2IsTarget ? containingPieceIndex(subtractJointAnchor(j, 2), pieceRings) : -1;
		if ((p1IsTarget && idx1 < 0) || (p2IsTarget && idx2 < 0)) {
			removeIds.add(j.id);
			continue;
		}
		// Survives — re-point the target side(s) to the containing piece(s).
		const pieces = new Set<Polygon>();
		if (p1IsTarget) {
			j.part1 = piecePolys[idx1];
			pieces.add(piecePolys[idx1]);
		}
		if (p2IsTarget) {
			j.part2 = piecePolys[idx2];
			pieces.add(piecePolys[idx2]);
		}
		for (const pc of pieces) pc.AddJoint(j);
	}
	// Detach every deleted joint from any SURVIVING shape still referencing it
	// (the shapes being removed — target/subtrahends — need no cleanup).
	for (const p of parts) {
		if (!(p instanceof JointPart) || !removeIds.has(p.id)) continue;
		const j = p as JointPart;
		for (const side of [j.part1, j.part2]) {
			if (side === targetPart || subSet.has(side)) continue;
			side.RemoveJoint(j);
		}
	}
	return removeIds;
}
