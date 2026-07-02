// CHARACTERIZATION — editor-interaction faithfulness fixes (H5 / M3 / H3 / H4 / M1 / M2).
//
// Pins behaviours ported from the legacy ControllerGame:
//   H5  shapesAt (joint/thruster candidate scan) skips non-editable + disabled
//       shapes (MaybeCreateJoint :6743 / MaybeCreateThrusters :6804 / prismatic :6856).
//   M3  Additive (shift) select TOGGLES: an already-selected id is REMOVED
//       (Util.RemoveFromArray :1292-1293); a marquee-add still unions.
//   H3  panCamera adjusts camera.offset by the screen delta and CLAMPS the visible
//       world to state.sandbox.bounds (MouseDrag world-drag :1834-1863).
//   H4  Two-click prismatic derives the slide axis + initLength from the two world
//       points (MaybeStart/FinishCreatingPrismaticJoint :6844-6912).
//   M1  snapToCenter snaps the joint/thruster point to the nearest editable shape
//       centre within 12/scale (FindPartToSnapTo :6939-6962).
//   M2  >2-overlap disambiguation cycles the candidate pair and finalizes the pick
//       (FINALIZING_JOINT :2435-2473 / :1667-1765).

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Circle } from "../src/Parts/Circle";
import { PrismaticJoint } from "../src/Parts/PrismaticJoint";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { Thrusters } from "../src/Parts/Thrusters";
import type { Part } from "../src/Parts/Part";

/** A core seeded with the given parts (no terrain), ids assigned 1..n. */
function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

function joints(core: GameCore): Part[] {
	return core.getState().parts.filter((p) => p instanceof RevoluteJoint || p instanceof PrismaticJoint);
}

// --- H5: joint/thruster candidate filter -------------------------------------

describe("H5 — shapesAt skips non-editable / disabled shapes", () => {
	it("a joint refuses to bind to a non-editable shape (only 1 editable candidate)", () => {
		const editable = new Circle(0, 0, 3);
		const terrain = new Circle(0, 0, 3);
		terrain.isEditable = false; // e.g. sandbox / challenge terrain
		const core = coreWith([editable, terrain]);
		core.dispatch({ type: "createJoint", kind: "revolute", x: 0, y: 0 });
		// Only ONE editable candidate overlaps → no joint (needs two).
		expect(joints(core)).toHaveLength(0);
	});

	it("a joint refuses to bind to a disabled shape", () => {
		const a = new Circle(0, 0, 3);
		const b = new Circle(0, 0, 3);
		b.isEnabled = false;
		const core = coreWith([a, b]);
		core.dispatch({ type: "createJoint", kind: "revolute", x: 0, y: 0 });
		expect(joints(core)).toHaveLength(0);
	});

	it("a joint binds when two editable+enabled shapes overlap", () => {
		const core = coreWith([new Circle(0, 0, 3), new Circle(0, 0, 3)]);
		core.dispatch({ type: "createJoint", kind: "revolute", x: 0, y: 0 });
		expect(joints(core)).toHaveLength(1);
	});
});

// --- M3: shift-click toggle --------------------------------------------------

describe("M3 — additive select toggles membership", () => {
	it("shift-clicking an already-selected part REMOVES it", () => {
		const core = coreWith([new Circle(0, 0, 1), new Circle(10, 0, 1)]);
		core.dispatch({ type: "select", partIds: [1] });
		core.dispatch({ type: "select", partIds: [2], additive: true });
		expect(new Set(core.getState().edit.selection)).toEqual(new Set([1, 2]));
		// Toggle 1 off.
		core.dispatch({ type: "select", partIds: [1], additive: true });
		expect(core.getState().edit.selection).toEqual([2]);
		// Toggle 1 back on.
		core.dispatch({ type: "select", partIds: [1], additive: true });
		expect(new Set(core.getState().edit.selection)).toEqual(new Set([2, 1]));
	});

	it("an additive MARQUEE (multiple ids) still unions, never removes", () => {
		const core = coreWith([new Circle(0, 0, 1), new Circle(10, 0, 1), new Circle(20, 0, 1)]);
		core.dispatch({ type: "select", partIds: [1] });
		core.dispatch({ type: "select", partIds: [1, 2, 3], additive: true });
		expect(new Set(core.getState().edit.selection)).toEqual(new Set([1, 2, 3]));
	});
});

// --- H3: pan + bounds clamp --------------------------------------------------

describe("H3 — panCamera pans and clamps to sandbox bounds", () => {
	it("a small pan shifts camera.offset by the negated screen delta", () => {
		const core = coreWith([new Circle(0, 0, 1)]);
		const before = { ...core.getState().camera };
		// Small delta, large viewport so the clamp doesn't kick in.
		core.dispatch({ type: "panCamera", dx: 5, dy: -3, viewW: 100, viewH: 100 });
		const after = core.getState().camera;
		expect(after.offsetX).toBe(before.offsetX - 5);
		expect(after.offsetY).toBe(before.offsetY + 3);
	});

	it("clamps so the visible world never leaves the sandbox X bounds", () => {
		const core = coreWith([new Circle(0, 0, 1)]);
		const { scale } = core.getState().camera;
		const { minX, maxX } = core.getState().sandbox.bounds;
		const viewW = 400;
		const viewH = 400;
		// Pan hard right (positive dx moves the world left in view → pushes toward maxX).
		for (let i = 0; i < 200; i++) core.dispatch({ type: "panCamera", dx: 1000, dy: 0, viewW, viewH });
		const cam = core.getState().camera;
		// The right visible-world edge sits at maxX (or the view is wider than the
		// bounds and pinned). worldEdge = (viewW - viewW/2 + offsetX)/scale.
		const maxWorldX = (viewW - viewW / 2 + cam.offsetX) / scale;
		expect(maxWorldX).toBeLessThanOrEqual(maxX + 1e-6);

		// Pan hard left → left edge pinned at minX.
		for (let i = 0; i < 400; i++) core.dispatch({ type: "panCamera", dx: -1000, dy: 0, viewW, viewH });
		const cam2 = core.getState().camera;
		const minWorldX = (0 - viewW / 2 + cam2.offsetX) / scale;
		expect(minWorldX).toBeGreaterThanOrEqual(minX - 1e-6);
	});
});

// --- H4: two-click prismatic -------------------------------------------------

describe("H4 — prismatic axis + initLength come from the two click points", () => {
	it("start then finish builds a prismatic joint with the axis from p1→p2", () => {
		// Two overlapping shapes at each click point; the axis runs (0,0)→(6,0).
		const s1 = new Circle(0, 0, 4);
		const s2 = new Circle(6, 0, 4);
		const core = coreWith([s1, s2]);

		core.dispatch({ type: "startPrismaticJoint", x: 0, y: 0 });
		// First click recorded the axis start; awaiting the second click.
		expect(core.getState().jointGesture?.phase).toBe("prismaticAxis");
		expect(joints(core)).toHaveLength(0);

		core.dispatch({ type: "finishPrismaticJoint", x: 6, y: 0 });
		const js = joints(core);
		expect(js).toHaveLength(1);
		const pj = js[0] as PrismaticJoint;
		// Axis is the normalized (p1→p2) = (1,0); initLength = distance = 6.
		expect(pj.axis.x).toBeCloseTo(1, 6);
		expect(pj.axis.y).toBeCloseTo(0, 6);
		expect(pj.initLength).toBeCloseTo(6, 6);
		// The gesture is cleared after creation.
		expect(core.getState().jointGesture).toBeNull();
	});

	it("a vertical two-click gesture yields a vertical axis", () => {
		const s1 = new Circle(0, 0, 4);
		const s2 = new Circle(0, 5, 4);
		const core = coreWith([s1, s2]);
		core.dispatch({ type: "startPrismaticJoint", x: 0, y: 0 });
		core.dispatch({ type: "finishPrismaticJoint", x: 0, y: 5 });
		const pj = joints(core)[0] as PrismaticJoint;
		expect(Math.abs(pj.axis.x)).toBeCloseTo(0, 6);
		expect(Math.abs(pj.axis.y)).toBeCloseTo(1, 6);
		expect(pj.initLength).toBeCloseTo(5, 6);
	});

	it("finish with no second shape aborts the gesture (no joint)", () => {
		const s1 = new Circle(0, 0, 4);
		const core = coreWith([s1]);
		core.dispatch({ type: "startPrismaticJoint", x: 0, y: 0 });
		core.dispatch({ type: "finishPrismaticJoint", x: 100, y: 100 }); // empty space
		expect(joints(core)).toHaveLength(0);
		expect(core.getState().jointGesture).toBeNull();
	});
});

// --- M1: snap-to-center ------------------------------------------------------

describe("M1 — snapToCenter snaps the joint point to the nearest shape centre", () => {
	it("a thruster snaps onto the shape centre when snapToCenter is on", () => {
		// One editable shape centred at (5,5); default scale 30 → threshold 12/30=0.4.
		const shape = new Circle(5, 5, 3);
		const core = coreWith([shape]);
		// Toggle snapToCenter (default true; ensure ON).
		if (!core.getState().edit.snapToCenter) core.dispatch({ type: "toggleSnapToCenter" });
		// Click NEAR the centre but not on it (within 0.4 world units).
		core.dispatch({ type: "createThrusters", x: 5.2, y: 5.1 });
		const t = core.getState().parts.find((p) => p instanceof Thrusters) as Thrusters | undefined;
		expect(t).toBeTruthy();
		// The thruster's centre snapped to the shape centre (5,5).
		expect(t!.centerX).toBeCloseTo(5, 6);
		expect(t!.centerY).toBeCloseTo(5, 6);
	});

	it("with snapToCenter OFF the point is NOT snapped", () => {
		const shape = new Circle(5, 5, 3);
		const core = coreWith([shape]);
		if (core.getState().edit.snapToCenter) core.dispatch({ type: "toggleSnapToCenter" });
		core.dispatch({ type: "createThrusters", x: 5.2, y: 5.1 });
		const t = core.getState().parts.find((p) => p instanceof Thrusters) as Thrusters;
		expect(t.centerX).toBeCloseTo(5.2, 6);
		expect(t.centerY).toBeCloseTo(5.1, 6);
	});
});

// --- M2: >2-overlap disambiguation -------------------------------------------

describe("M2 — >2-overlap joint disambiguation cycles + finalizes", () => {
	it("three overlapping shapes enter the cycle; cycling then finalizing binds a pair", () => {
		const core = coreWith([new Circle(0, 0, 5), new Circle(0, 0, 5), new Circle(0, 0, 5)]);
		core.dispatch({ type: "createJoint", kind: "revolute", x: 0, y: 0 });
		// >2 candidates → disambiguation, not an immediate create.
		expect(core.getState().jointGesture?.phase).toBe("disambiguate");
		expect(joints(core)).toHaveLength(0);

		// Cycle the pick once (advances the highlighted pair), then finalize.
		core.dispatch({ type: "cycleJointCandidate" });
		core.dispatch({ type: "finalizeJoint", x: 0, y: 0 });
		expect(joints(core)).toHaveLength(1);
		expect(core.getState().jointGesture).toBeNull();
	});

	it("cancelJointGesture aborts the disambiguation without creating a joint", () => {
		const core = coreWith([new Circle(0, 0, 5), new Circle(0, 0, 5), new Circle(0, 0, 5)]);
		core.dispatch({ type: "createJoint", kind: "revolute", x: 0, y: 0 });
		expect(core.getState().jointGesture?.phase).toBe("disambiguate");
		core.dispatch({ type: "cancelJointGesture" });
		expect(core.getState().jointGesture).toBeNull();
		expect(joints(core)).toHaveLength(0);
	});
});
