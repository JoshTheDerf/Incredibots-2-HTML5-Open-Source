// CHARACTERIZATION — clipboard (cut/copy/paste) + z-order (move to front/back),
// ported into GameCore from ControllerGame.copyButton (:4966) / cutButton (:4892)
// / pasteButton (:5023) and frontButton (:4351) / backButton (:4375).
//
// Copy snapshots the selected shapes + the joints/thrusters BETWEEN them into the
// core's clipboard (independent clones). Cut = copy + delete. Paste clones the
// clipboard again (survives repeated pastes), offsets the clones, mints fresh ids,
// appends and selects them, re-binding joints onto the cloned shapes. Front/back
// reorder the selected parts within the parts array (front last / back first).

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Rectangle } from "../src/Parts/Rectangle";
import { Circle } from "../src/Parts/Circle";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { JointPart } from "../src/Parts/JointPart";
import type { Part } from "../src/Parts/Part";

/** A GameCore over a fresh state with the given parts (no sandbox terrain). */
function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

/** Rectangle + Circle joined by a RevoluteJoint whose endpoints are both selected. */
function rig(): { core: GameCore; rect: Rectangle; circle: Circle; joint: RevoluteJoint } {
	const rect = new Rectangle(2, 1, 2, 2); // centre (3, 2)
	const circle = new Circle(6, 2, 1); // centre (6, 2)
	const joint = new RevoluteJoint(rect, circle, 5, 2); // anchor (5, 2)
	joint.enableMotor = true;
	joint.motorCWKey = 65;
	const core = coreWith([rect, circle, joint]);
	return { core, rect, circle, joint };
}

describe("copyParts / pasteParts", () => {
	it("copy snapshots the selection and paste clones + offsets + selects the clones", () => {
		const { core, rect, circle } = rig();
		core.dispatch({ type: "copyParts", partIds: [1, 2, 3] });
		// Copy does not mutate the graph.
		expect(core.getState().parts.length).toBe(3);

		core.dispatch({ type: "pasteParts" });
		const s = core.getState();
		// 3 originals + 3 pasted clones.
		expect(s.parts.length).toBe(6);
		const clones = s.parts.slice(3);
		// The pasted clones are selected.
		expect(s.edit.selection).toEqual(clones.map((p) => p.id));
		// The clones are distinct object instances from the originals.
		expect(clones).not.toContain(rect);
		expect(clones).not.toContain(circle);

		// The pasted circle is the original (centre 6,2) offset by +1,+1.
		const cloneCircle = clones.find((p) => p instanceof Circle) as Circle;
		expect(cloneCircle.centerX).toBeCloseTo(7, 9);
		expect(cloneCircle.centerY).toBeCloseTo(3, 9);

		// The pasted joint is re-bound onto the CLONED shapes (not the originals).
		const cloneJoint = clones.find((p) => p instanceof JointPart) as RevoluteJoint;
		expect(cloneJoint).toBeInstanceOf(RevoluteJoint);
		expect(clones).toContain(cloneJoint.part1);
		expect(clones).toContain(cloneJoint.part2);
		expect(cloneJoint.enableMotor).toBe(true);
		expect(cloneJoint.motorCWKey).toBe(65);
		// Joint anchor offset too (original anchor 5,2 -> 6,3).
		expect(cloneJoint.anchorX).toBeCloseTo(6, 9);
		expect(cloneJoint.anchorY).toBeCloseTo(3, 9);
	});

	it("paste honours an explicit dx/dy offset", () => {
		const { core } = rig();
		core.dispatch({ type: "copyParts", partIds: [1, 2, 3] });
		core.dispatch({ type: "pasteParts", dx: 10, dy: -5 });
		const clones = core.getState().parts.slice(3);
		const cloneCircle = clones.find((p) => p instanceof Circle) as Circle;
		expect(cloneCircle.centerX).toBeCloseTo(16, 9);
		expect(cloneCircle.centerY).toBeCloseTo(-3, 9);
	});

	it("paste can be repeated — the clipboard survives (fresh independent clones each time)", () => {
		const { core } = rig();
		core.dispatch({ type: "copyParts", partIds: [1, 2, 3] });
		core.dispatch({ type: "pasteParts" });
		core.dispatch({ type: "pasteParts" });
		// 3 originals + 3 + 3.
		expect(core.getState().parts.length).toBe(9);
	});

	it("a joint whose endpoint is NOT in the selection is dropped from the clipboard", () => {
		const { core } = rig();
		// Select only rect + joint (circle excluded).
		core.dispatch({ type: "copyParts", partIds: [1, 3] });
		core.dispatch({ type: "pasteParts" });
		const clones = core.getState().parts.slice(3);
		// Only the rectangle clone; the joint is dropped (endpoint circle missing).
		expect(clones.length).toBe(1);
		expect(clones[0]).toBeInstanceOf(Rectangle);
	});

	it("paste with an empty clipboard is a no-op", () => {
		const { core } = rig();
		core.dispatch({ type: "pasteParts" });
		expect(core.getState().parts.length).toBe(3);
	});
});

describe("cutParts", () => {
	it("copies then deletes the selection; paste then restores clones", () => {
		const { core } = rig();
		core.dispatch({ type: "cutParts", partIds: [1, 2, 3] });
		// The selection is gone from the graph.
		expect(core.getState().parts.length).toBe(0);
		expect(core.getState().edit.selection).toEqual([]);

		core.dispatch({ type: "pasteParts" });
		expect(core.getState().parts.length).toBe(3);
	});

	it("cut is undoable (restores the pre-cut graph)", () => {
		const { core } = rig();
		core.dispatch({ type: "cutParts", partIds: [1, 2, 3] });
		expect(core.getState().parts.length).toBe(0);
		core.dispatch({ type: "undo" });
		expect(core.getState().parts.length).toBe(3);
	});
});

describe("movePartsToFront / movePartsToBack", () => {
	it("front moves the selected part to the END of the array (drawn on top)", () => {
		const { core } = rig();
		core.dispatch({ type: "movePartsToFront", partIds: [1] }); // the rectangle
		const ids = core.getState().parts.map((p) => p.id);
		// Rectangle (id 1) now last.
		expect(ids).toEqual([2, 3, 1]);
	});

	it("back moves the selected part to the FRONT of the array (drawn behind)", () => {
		const { core } = rig();
		core.dispatch({ type: "movePartsToBack", partIds: [2] }); // the circle
		const ids = core.getState().parts.map((p) => p.id);
		// Circle (id 2) now first.
		expect(ids).toEqual([2, 1, 3]);
	});

	it("back keeps a robot part ABOVE non-editable terrain (backButton :4389 guard)", () => {
		// Terrain rect (non-editable / isSandbox) + a robot circle on top.
		const terrain = new Rectangle(-10, 10, 20, 2);
		terrain.isEditable = false;
		(terrain as unknown as { isSandbox: boolean }).isSandbox = true;
		const robot = new Circle(0, 0, 1);
		const core = coreWith([terrain, robot]); // ids 1 (terrain), 2 (robot)

		core.dispatch({ type: "movePartsToBack", partIds: [2] });
		const ids = core.getState().parts.map((p) => p.id);
		// The robot stays AFTER the leading terrain run — it does not sink below ground.
		expect(ids).toEqual([1, 2]);
	});

	it("front/back preserve relative order of a multi-part selection", () => {
		const { core } = rig();
		core.dispatch({ type: "movePartsToBack", partIds: [2, 3] });
		// 2 then 3 (relative order preserved), then the rest (1).
		expect(core.getState().parts.map((p) => p.id)).toEqual([2, 3, 1]);
	});

	it("front/back are undoable", () => {
		const { core } = rig();
		core.dispatch({ type: "movePartsToFront", partIds: [1] });
		expect(core.getState().parts.map((p) => p.id)).toEqual([2, 3, 1]);
		core.dispatch({ type: "undo" });
		expect(core.getState().parts.map((p) => p.id)).toEqual([1, 2, 3]);
	});
});
