// CHARACTERIZATION — Mirroring (ControllerGame.mirrorHorizontal :3489 /
// mirrorVertical :3732), ported into GameCore's `mirrorParts` command.
//
// Mirror clones each selected shape reflected about selectedParts[0]'s pivot and
// rebinds selected joints/thrusters onto the clones, with a RevoluteJoint's
// CW/CCW keys swapped and its limits swapped-and-negated. DEVIATION: the port
// places the clones (no PASTE mouse-drag) and selects them.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Rectangle } from "../src/Parts/Rectangle";
import { Circle } from "../src/Parts/Circle";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import type { Part } from "../src/Parts/Part";

function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

/**
 * A Rectangle (pivot part) + a Circle offset to the right, joined by a motorised
 * RevoluteJoint with distinct CW/CCW keys and asymmetric limits. The rectangle is
 * selectedParts[0] so its centre (3, 2) is the mirror pivot.
 */
function rig(): {
	core: GameCore;
	rect: Rectangle;
	circle: Circle;
	joint: RevoluteJoint;
} {
	const rect = new Rectangle(2, 1, 2, 2); // centre (3, 2)
	const circle = new Circle(6, 2, 1); // centre (6, 2)
	const joint = new RevoluteJoint(rect, circle, 5, 2); // anchor (5, 2)
	joint.enableMotor = true;
	joint.motorCWKey = 65; // A
	joint.motorCCWKey = 68; // D
	joint.motorLowerLimit = -0.5;
	joint.motorUpperLimit = 1.5;
	joint.autoCW = true;
	joint.autoCCW = false;
	const core = coreWith([rect, circle, joint]);
	return { core, rect, circle, joint };
}

describe("mirrorParts — horizontal", () => {
	it("clones shapes reflected about selectedParts[0]'s centre and selects the clones", () => {
		const { core } = rig();
		core.dispatch({ type: "mirrorParts", partIds: [1, 2, 3], axis: "horizontal" });
		const s = core.getState();

		// 3 originals + 3 clones.
		expect(s.parts.length).toBe(6);
		const clones = s.parts.slice(3);
		expect(s.edit.selection).toEqual(clones.map((p) => p.id));

		// Pivot is the rectangle centre (3, 2). The circle at (6, 2) reflects to
		// (pivotX - (6 - pivotX), 2) = (0, 2). Y is unchanged for horizontal.
		const cloneCircle = clones.find((p) => p instanceof Circle) as Circle;
		expect(cloneCircle.centerX).toBeCloseTo(0, 9);
		expect(cloneCircle.centerY).toBeCloseTo(2, 9);
		expect(cloneCircle.radius).toBeCloseTo(1, 9);

		// The rectangle at x=2 reflects to x = pivotX - (2 - pivotX) = 4, width negated.
		const cloneRect = clones.find((p) => p instanceof Rectangle) as Rectangle;
		// centre = x + w/2 = 4 + (-2)/2 = 3 (the pivot maps to itself along X).
		expect(cloneRect.centerX).toBeCloseTo(3, 9);
		expect(cloneRect.centerY).toBeCloseTo(2, 9);
	});

	it("rebinds the RevoluteJoint, swaps CW/CCW keys, swaps+negates limits, swaps auto flags", () => {
		const { core } = rig();
		core.dispatch({ type: "mirrorParts", partIds: [1, 2, 3], axis: "horizontal" });
		const s = core.getState();
		const cloneJoint = s.parts.slice(3).find((p) => p instanceof RevoluteJoint) as RevoluteJoint;
		expect(cloneJoint).toBeTruthy();

		// anchor reflected about pivotX (3): 3 - (5 - 3) = 1; Y unchanged.
		expect(cloneJoint.anchorX).toBeCloseTo(1, 9);
		expect(cloneJoint.anchorY).toBeCloseTo(2, 9);

		// CW/CCW keys swapped (original CW=65, CCW=68).
		expect(cloneJoint.motorCWKey).toBe(68);
		expect(cloneJoint.motorCCWKey).toBe(65);

		// limits swapped-and-negated: newLower = -oldUpper, newUpper = -oldLower.
		expect(cloneJoint.motorLowerLimit).toBeCloseTo(-1.5, 9);
		expect(cloneJoint.motorUpperLimit).toBeCloseTo(0.5, 9);

		// auto flags swapped.
		expect(cloneJoint.autoCW).toBe(false);
		expect(cloneJoint.autoCCW).toBe(true);
		expect(cloneJoint.enableMotor).toBe(true);

		// The clone joint binds to the CLONED shapes, not the originals.
		expect(cloneJoint.part1).not.toBe(s.parts[0]);
		expect(cloneJoint.part2).not.toBe(s.parts[1]);
	});
});

describe("mirrorParts — vertical", () => {
	it("reflects Y about the pivot, leaves X unchanged", () => {
		const { core } = rig();
		core.dispatch({ type: "mirrorParts", partIds: [1, 2, 3], axis: "vertical" });
		const s = core.getState();
		const cloneCircle = s.parts.slice(3).find((p) => p instanceof Circle) as Circle;
		// Circle (6, 2), pivotY = 2 → Y = 2 - (2 - 2) = 2, X unchanged = 6.
		expect(cloneCircle.centerX).toBeCloseTo(6, 9);
		expect(cloneCircle.centerY).toBeCloseTo(2, 9);
	});
});

describe("mirrorParts — guards", () => {
	it("is a no-op with an empty selection", () => {
		const { core } = rig();
		core.dispatch({ type: "mirrorParts", partIds: [], axis: "horizontal" });
		expect(core.getState().parts.length).toBe(3);
	});

	it("drops a joint whose bound part is not in the selection", () => {
		const { core } = rig();
		// Select only the rectangle (1) and the joint (3); the joint's part2 (circle)
		// is not selected, so the joint must be dropped (partMapping -1 → skip).
		core.dispatch({ type: "mirrorParts", partIds: [1, 3], axis: "horizontal" });
		const s = core.getState();
		// Only the rectangle clone is added (no joint clone).
		expect(s.parts.length).toBe(4);
		expect(s.parts.slice(3).some((p) => p instanceof RevoluteJoint)).toBe(false);
	});
});
