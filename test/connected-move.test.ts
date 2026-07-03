// Characterization: editor drag moves the CONNECTED CLUSTER, not just the
// selection — faithful to legacy MouseDrag, which seeds draggingParts with the
// union of every selected part's GetAttachedParts() at drag start
// (ControllerGame.ts:1443-1449 / CE ControllerGame.as:6121-6127): a shape drags
// its joints and everything jointed through them (joint ANCHORS move too), a
// selected joint drags both its shapes' clusters, and a TextPart drags only
// itself. The rigs are built through GameCore.dispatch exactly as the UI does
// (createShape drags + createJoint click), then moved with the same relative
// moveParts the pointer drag dispatches.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { JointPart } from "../src/Parts/JointPart";
import { ShapePart } from "../src/Parts/ShapePart";

/** Two overlapping rects + a revolute joint in the overlap, via dispatch. */
function jointedRig() {
	const core = new GameCore();
	// Rect A spans (0,0)-(3,2); rect B spans (2.5,0)-(5.5,2): overlap x 2.5-3.
	core.dispatch({ type: "createShape", kind: "rect", x1: 0, y1: 0, x2: 3, y2: 2 });
	core.dispatch({ type: "createShape", kind: "rect", x1: 2.5, y1: 0, x2: 5.5, y2: 2 });
	const rects = core.getState().parts.filter((p) => p instanceof ShapePart && !(p as any).isSandbox);
	expect(rects.length).toBe(2);
	const [a, b] = rects as ShapePart[];
	// Revolute joint at a point inside BOTH rects (the overlap).
	core.dispatch({ type: "createJoint", kind: "revolute", x: 2.75, y: 1 });
	const joint = core.getState().parts.find((p) => p instanceof JointPart) as JointPart;
	expect(joint).toBeTruthy();
	expect([joint.part1, joint.part2]).toContain(a);
	expect([joint.part1, joint.part2]).toContain(b);
	return { core, a, b, joint };
}

const xyOf = (core: GameCore, id: number) => {
	const p = core.getState().parts.find((q) => q.id === id) as any;
	return { x: p.centerX ?? p.anchorX ?? p.x, y: p.centerY ?? p.anchorY ?? p.y };
};

describe("connected-set move (legacy GetAttachedParts drag semantics)", () => {
	it("dragging one jointed shape moves BOTH shapes and the joint anchor", () => {
		const { core, a, b, joint } = jointedRig();
		const a0 = xyOf(core, a.id);
		const b0 = xyOf(core, b.id);
		const j0 = { x: joint.anchorX, y: joint.anchorY };

		// The UI drag path: select shape A alone, then dispatch relative moveParts.
		core.dispatch({ type: "select", partIds: [a.id] });
		core.dispatch({ type: "moveParts", partIds: [a.id], dx: 1.5, dy: -0.5 });

		const a1 = xyOf(core, a.id);
		const b1 = xyOf(core, b.id);
		expect(a1.x).toBeCloseTo(a0.x + 1.5);
		expect(a1.y).toBeCloseTo(a0.y - 0.5);
		// The jointed partner follows (legacy: GetAttachedParts traversal)...
		expect(b1.x).toBeCloseTo(b0.x + 1.5);
		expect(b1.y).toBeCloseTo(b0.y - 0.5);
		// ...and the joint anchor moves with them (JointPart is in the cluster).
		expect(joint.anchorX).toBeCloseTo(j0.x + 1.5);
		expect(joint.anchorY).toBeCloseTo(j0.y - 0.5);
	});

	it("dragging the JOINT moves both connected shapes with it", () => {
		const { core, a, b, joint } = jointedRig();
		const a0 = xyOf(core, a.id);
		const b0 = xyOf(core, b.id);

		core.dispatch({ type: "select", partIds: [joint.id] });
		core.dispatch({ type: "moveParts", partIds: [joint.id], dx: -2, dy: 1 });

		expect(joint.anchorX).toBeCloseTo(2.75 - 2);
		expect(joint.anchorY).toBeCloseTo(1 + 1);
		expect(xyOf(core, a.id).x).toBeCloseTo(a0.x - 2);
		expect(xyOf(core, a.id).y).toBeCloseTo(a0.y + 1);
		expect(xyOf(core, b.id).x).toBeCloseTo(b0.x - 2);
		expect(xyOf(core, b.id).y).toBeCloseTo(b0.y + 1);
	});

	it("cluster expansion deduplicates: a multi-selection of both shapes moves each part exactly once", () => {
		const { core, a, b, joint } = jointedRig();
		const a0 = xyOf(core, a.id);
		const b0 = xyOf(core, b.id);
		const j0 = { x: joint.anchorX, y: joint.anchorY };

		// Both shapes selected (marquee) — their attached clusters overlap
		// completely; the union must still move every part by exactly one delta
		// (Util.RemoveDuplicates in the legacy drag start).
		core.dispatch({ type: "select", partIds: [a.id, b.id] });
		core.dispatch({ type: "moveParts", partIds: [a.id, b.id], dx: 1, dy: 1 });

		expect(xyOf(core, a.id).x).toBeCloseTo(a0.x + 1);
		expect(xyOf(core, b.id).x).toBeCloseTo(b0.x + 1);
		expect(joint.anchorX).toBeCloseTo(j0.x + 1);
		expect(joint.anchorY).toBeCloseTo(j0.y + 1);
	});

	it("an unconnected shape does NOT move when another shape is dragged", () => {
		const core = new GameCore();
		core.dispatch({ type: "createShape", kind: "rect", x1: 0, y1: 0, x2: 2, y2: 1 });
		core.dispatch({ type: "createShape", kind: "rect", x1: 10, y1: 0, x2: 12, y2: 1 });
		const [a, b] = core.getState().parts.filter((p) => !(p as any).isSandbox) as any[];

		const b0 = xyOf(core, b.id);
		core.dispatch({ type: "select", partIds: [a.id] });
		core.dispatch({ type: "moveParts", partIds: [a.id], dx: 3, dy: 0 });

		expect(xyOf(core, a.id).x).toBeCloseTo(1 + 3); // centerX was 1
		expect(xyOf(core, b.id).x).toBeCloseTo(b0.x); // untouched
	});

	it("undo restores the whole cluster (single history snapshot per moveParts)", () => {
		const { core, a, b, joint } = jointedRig();
		const a0 = xyOf(core, a.id);
		const b0 = xyOf(core, b.id);
		const j0 = { x: joint.anchorX, y: joint.anchorY };

		core.dispatch({ type: "moveParts", partIds: [a.id], dx: 4, dy: 4 });
		core.dispatch({ type: "undo" });

		expect(xyOf(core, a.id)).toEqual(a0);
		expect(xyOf(core, b.id)).toEqual(b0);
		const jNow = core.getState().parts.find((p) => p instanceof JointPart) as JointPart;
		expect(jNow.anchorX).toBeCloseTo(j0.x);
		expect(jNow.anchorY).toBeCloseTo(j0.y);
	});
});
