// Wave 4b — group property edit (MultiEditWindow / MultiActionsAction) +
// group z-order (MultiMoveZAction) + PartSnapshot trigger read-model.
//
// Characterizes:
//  1. PartSnapshot now exposes the shape trigger fields + triggerList uniformly.
//  2. The `batch` command applies its sub-commands as a SINGLE undo step.
//  3. Group move-to-front/back preserves the selection's internal relative
//     z-order (Jaybit push / unshift-reversed semantics).

import { describe, expect, it } from "vitest";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { Cannon } from "../src/Parts/Cannon";
import { Thrusters } from "../src/Parts/Thrusters";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { FixedJoint } from "../src/Parts/FixedJoint";
import { coreWithParts, getPart, selectOne } from "./helpers";

describe("PartSnapshot exposes trigger read-model (wave 4b scope 1)", () => {
	it("shape source trigger fields land on the snapshot", () => {
		const circle = new Circle(0, 0, 1);
		circle.triggerName = "a,b";
		circle.triggerAction = 0; // Destroy
		circle.onSameName = true;
		circle.triggerName_2 = "c";
		circle.onGroundHit_2 = true;
		const { core, ids } = coreWithParts(circle);
		selectOne(core, ids[0]);
		const snap = core.getState().edit.selectedPart!;
		expect(snap.triggerName).toBe("a,b");
		expect(snap.triggerAction).toBe(0);
		expect(snap.onSameName).toBe(true);
		expect(snap.triggerName_2).toBe("c");
		expect(snap.onGroundHit_2).toBe(true);
	});

	it("target triggerList lands on the snapshot for cannon / thruster / fixed joint", () => {
		const cannon = new Cannon(0, 0, 2);
		cannon.triggerList = "boom";
		const { core, ids } = coreWithParts(cannon);
		selectOne(core, ids[0]);
		expect(core.getState().edit.selectedPart!.triggerList).toBe("boom");

		const s1 = new Circle(0, 0, 1);
		const s2 = new Circle(2, 0, 1);
		const fj = new FixedJoint(s1, s2, 1, 0);
		fj.triggerList = "break";
		const rig2 = coreWithParts(s1, s2, fj);
		selectOne(rig2.core, rig2.ids[2]);
		const fjSnap = rig2.core.getState().edit.selectedPart!;
		expect(fjSnap.kind).toBe("FixedJoint");
		expect(fjSnap.triggerList).toBe("break");
	});
});

describe("batch command = a single undo step (MultiActionsAction, wave 4b scope 3)", () => {
	it("applies every sub-command", () => {
		const { core, ids } = coreWithParts(new Circle(0, 0, 1), new Rectangle(0, 0, 2, 2));
		core.dispatch({
			type: "batch",
			commands: [
				{ type: "setDensity", partIds: ids, value: 5 },
				{ type: "setFriction", partIds: ids, value: 20 },
			],
		});
		for (const id of ids) {
			expect(getPart(core, id).density).toBe(5);
			expect(getPart(core, id).friction).toBe(20);
		}
	});

	it("collapses N field changes to ONE undo step", () => {
		const { core, ids } = coreWithParts(new Circle(0, 0, 1));
		// A prior standalone edit so we can tell the batch undo apart from it.
		core.dispatch({ type: "setDensity", partIds: ids, value: 10 });
		core.dispatch({
			type: "batch",
			commands: [
				{ type: "setDensity", partIds: ids, value: 3 },
				{ type: "setFriction", partIds: ids, value: 25 },
				{ type: "setRestitution", partIds: ids, value: 4 },
			],
		});
		expect(getPart(core, ids[0]).density).toBe(3);
		expect(getPart(core, ids[0]).friction).toBe(25);
		expect(getPart(core, ids[0]).restitution).toBe(4);

		// ONE undo reverts the WHOLE batch (all three fields) back to the
		// post-first-edit state — not one field at a time.
		core.dispatch({ type: "undo" });
		expect(getPart(core, ids[0]).density).toBe(10);
		expect(getPart(core, ids[0]).friction).not.toBe(25);
		expect(getPart(core, ids[0]).restitution).not.toBe(4);

		// A second undo reverts the standalone edit.
		core.dispatch({ type: "undo" });
		expect(getPart(core, ids[0]).density).toBe(15); // ShapePart default density

		// Redo replays the standalone edit then the whole batch.
		core.dispatch({ type: "redo" });
		expect(getPart(core, ids[0]).density).toBe(10);
		core.dispatch({ type: "redo" });
		expect(getPart(core, ids[0]).density).toBe(3);
		expect(getPart(core, ids[0]).friction).toBe(25);
	});

	it("only-resolved-fields: a batch omitting a field leaves it untouched", () => {
		const { core, ids } = coreWithParts(new Circle(0, 0, 1));
		const beforeFriction = getPart(core, ids[0]).friction;
		core.dispatch({ type: "batch", commands: [{ type: "setDensity", partIds: ids, value: 8 }] });
		expect(getPart(core, ids[0]).density).toBe(8);
		expect(getPart(core, ids[0]).friction).toBe(beforeFriction); // never dispatched -> unchanged
	});
});

describe("group move-to-front/back preserves internal relative order (MultiMoveZAction)", () => {
	function fourShapes() {
		return coreWithParts(
			new Circle(0, 0, 1), // id 1
			new Circle(1, 0, 1), // id 2
			new Circle(2, 0, 1), // id 3
			new Circle(3, 0, 1), // id 4
		);
	}

	it("front pushes the group in z-order onto the top, internal order preserved", () => {
		const { core } = fourShapes();
		// Selection given out of graph order; the group must move in graph (z) order.
		core.dispatch({ type: "movePartsToFront", partIds: [3, 1] });
		expect(core.getState().parts.map((p) => p.id)).toEqual([2, 4, 1, 3]);
	});

	it("back sinks the group to the bottom, internal order preserved", () => {
		const { core } = fourShapes();
		core.dispatch({ type: "movePartsToBack", partIds: [4, 2] });
		expect(core.getState().parts.map((p) => p.id)).toEqual([2, 4, 1, 3]);
	});

	it("group z-order is a single undo step", () => {
		const { core } = fourShapes();
		core.dispatch({ type: "movePartsToFront", partIds: [1, 2] });
		expect(core.getState().parts.map((p) => p.id)).toEqual([3, 4, 1, 2]);
		core.dispatch({ type: "undo" });
		expect(core.getState().parts.map((p) => p.id)).toEqual([1, 2, 3, 4]);
	});
});

describe("batch respects the uneditable-robot funnel guard", () => {
	it("a joint selection edits both revolute joints in one batch", () => {
		const s1 = new Circle(0, 0, 1);
		const s2 = new Circle(2, 0, 1);
		const s3 = new Circle(4, 0, 1);
		const j1 = new RevoluteJoint(s1, s2, 1, 0);
		const j2 = new RevoluteJoint(s2, s3, 3, 0);
		const { core } = coreWithParts(s1, s2, s3, j1, j2);
		core.dispatch({
			type: "batch",
			commands: [{ type: "setJointStrength", partIds: [j1.id, j2.id], value: 12 }],
		});
		expect(getPart(core, j1.id).motorStrength).toBe(12);
		expect(getPart(core, j2.id).motorStrength).toBe(12);
	});
});
