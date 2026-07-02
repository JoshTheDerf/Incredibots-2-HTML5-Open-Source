// CHARACTERIZATION — Scaling/resizing gesture (ControllerGame.scaleButton :3975
// + RESIZING_SHAPES MouseDrag :1553 + commit-on-up :2070), ported into GameCore's
// resizeStart / resizeParts / resizeEnd command lifecycle.
//
// The legacy model: on gesture start, pivot = selectedParts[0]'s anchor, the
// dragging set is the whole ATTACHED CLUSTER (every selected part's
// GetAttachedParts union), and each part snapshots an immutable init* baseline.
// Each move applies the TOTAL from-baseline factor: geometry = baseline × sf,
// anchor = pivot + dragOff × sf. `scaleFactor` here is that raw total factor.

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
 * A Rectangle (pivot part, centre (1, 1)) joined to a Circle (centre (5, 1))
 * by a RevoluteJoint. Only the rectangle is selected — the whole cluster must
 * still scale about the rectangle's anchor.
 */
function rig(): { core: GameCore; rect: Rectangle; circle: Circle; joint: RevoluteJoint } {
	const rect = new Rectangle(0, 0, 2, 2); // centre (1, 1)
	const circle = new Circle(5, 1, 1); // centre (5, 1)
	const joint = new RevoluteJoint(rect, circle, 3, 1); // anchor (3, 1)
	const core = coreWith([rect, circle, joint]);
	return { core, rect, circle, joint };
}

describe("resize gesture — attached cluster scales about selectedParts[0]'s anchor", () => {
	it("scales the WHOLE cluster (not just the selection) by baseline × 2 about the pivot", () => {
		const { core, rect, circle, joint } = rig();
		// Select ONLY the rectangle.
		core.dispatch({ type: "resizeStart", partIds: [1] });
		core.dispatch({ type: "resizeParts", scaleFactor: 2.0 });
		core.dispatch({ type: "resizeEnd" });

		// Pivot is the rectangle centre (1, 1).
		// Rectangle geometry doubles; its anchor stays at the pivot (dragOff 0).
		expect(rect.w).toBeCloseTo(4, 9);
		expect(rect.h).toBeCloseTo(4, 9);
		expect(rect.centerX).toBeCloseTo(1, 9);
		expect(rect.centerY).toBeCloseTo(1, 9);

		// Circle (in the cluster via the joint, though NOT selected): radius doubles,
		// and its centre = pivot + dragOff × 2. dragOff = (5-1, 1-1) = (4, 0), so
		// new centre = (1 + 8, 1) = (9, 1).
		expect(circle.radius).toBeCloseTo(2, 9);
		expect(circle.centerX).toBeCloseTo(9, 9);
		expect(circle.centerY).toBeCloseTo(1, 9);

		// Joint anchor: dragOff = (3-1, 1-1) = (2, 0) → new anchor = (1 + 4, 1) = (5, 1).
		expect(joint.anchorX).toBeCloseTo(5, 9);
		expect(joint.anchorY).toBeCloseTo(1, 9);
	});

	it("applies the TOTAL from-baseline factor per move (not compounded)", () => {
		const { core, rect } = rig();
		core.dispatch({ type: "resizeStart", partIds: [1] });
		// Two moves with different total factors — the second REPLACES the first
		// (geometry = baseline × sf), it does not compound.
		core.dispatch({ type: "resizeParts", scaleFactor: 2.0 });
		core.dispatch({ type: "resizeParts", scaleFactor: 3.0 });
		core.dispatch({ type: "resizeEnd" });
		// baseline w/h = 2, so final = 2 × 3 = 6 (NOT 2 × 2 × 3 = 12).
		expect(rect.w).toBeCloseTo(6, 9);
		expect(rect.h).toBeCloseTo(6, 9);
	});

	it("a SECOND gesture starts from the fresh baseline (not corrupted by the first)", () => {
		const { core, rect } = rig();
		// First gesture: ×2 → w = 4.
		core.dispatch({ type: "resizeStart", partIds: [1] });
		core.dispatch({ type: "resizeParts", scaleFactor: 2.0 });
		core.dispatch({ type: "resizeEnd" });
		expect(rect.w).toBeCloseTo(4, 9);

		// Second gesture: baseline is now w = 4, ×2 → w = 8.
		core.dispatch({ type: "resizeStart", partIds: [1] });
		core.dispatch({ type: "resizeParts", scaleFactor: 2.0 });
		core.dispatch({ type: "resizeEnd" });
		expect(rect.w).toBeCloseTo(8, 9);
	});

	it("clamps the factor against a part's legal size range", () => {
		const { core, rect } = rig();
		core.dispatch({ type: "resizeStart", partIds: [1] });
		// Rectangle baseline w = 2; MAX_WIDTH = 10, so ×100 clamps to 10.
		core.dispatch({ type: "resizeParts", scaleFactor: 100 });
		core.dispatch({ type: "resizeEnd" });
		expect(rect.w).toBeCloseTo(Rectangle.MAX_WIDTH, 9);
		expect(rect.h).toBeCloseTo(Rectangle.MAX_WIDTH, 9);
	});
});

describe("resize gesture — undo", () => {
	it("one undo reverts the whole gesture to the pre-resize geometry", () => {
		const { core, rect } = rig();
		core.dispatch({ type: "resizeStart", partIds: [1] });
		core.dispatch({ type: "resizeParts", scaleFactor: 2.0 });
		core.dispatch({ type: "resizeParts", scaleFactor: 3.0 });
		core.dispatch({ type: "resizeEnd" });
		expect(rect.w).toBeCloseTo(6, 9);

		core.dispatch({ type: "undo" });
		const restored = core.getState().parts.find((p) => p instanceof Rectangle) as Rectangle;
		expect(restored.w).toBeCloseTo(2, 9);
		expect(restored.h).toBeCloseTo(2, 9);
	});
});
