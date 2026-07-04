// GameCore `subtractShapes` command — the "Subtract Shape" boolean-geometry
// editor feature. Verifies the command replaces the TARGET with a Polygon of the
// difference (carrying the target's material/appearance), deletes the
// subtrahends, is undoable, and handles the full-cover / no-overlap edge cases.

import { describe, expect, it, vi } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Rectangle } from "../src/Parts/Rectangle";
import { Circle } from "../src/Parts/Circle";
import { Polygon } from "../src/Parts/Polygon";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { JointPart } from "../src/Parts/JointPart";
import type { Part } from "../src/Parts/Part";

/** A fresh sandbox core with the given pre-built shapes appended (fresh ids). */
function coreWith(...shapes: Part[]): { core: GameCore; ids: number[] } {
	const state = createInitialState();
	const base = state.parts.length;
	state.parts = [...state.parts, ...shapes];
	const core = new GameCore(state);
	// The constructor assigns ids to the appended (id-0) parts after the terrain.
	const ids = core.getState().parts.slice(base).map((p) => p.id);
	return { core, ids };
}

function polygonsOf(core: GameCore): Polygon[] {
	return core.getState().parts.filter((p) => p instanceof Polygon) as Polygon[];
}

describe("subtractShapes", () => {
	it("replaces the target with a difference Polygon and deletes the subtrahend", () => {
		// 4x4 target rect at origin; a 2x2 cutter overlapping its top-right corner.
		const target = new Rectangle(0, 0, 4, 4);
		target.red = 123;
		target.green = 45;
		target.blue = 67;
		target.density = 20;
		target.friction = 9;
		const cutter = new Rectangle(3, 3, 2, 2);
		const { core, ids } = coreWith(target, cutter);
		const [targetId, cutterId] = ids;
		const partsBefore = core.getState().parts.length;

		core.dispatch({ type: "subtractShapes", targetId, subtrahendIds: [cutterId] });

		// The cutter is gone; the target rect is replaced by exactly one Polygon.
		expect(core.getState().parts.find((p) => p.id === cutterId)).toBeUndefined();
		expect(core.getState().parts.find((p) => p.id === targetId)).toBeUndefined();
		expect(core.getState().parts.length).toBe(partsBefore - 1); // -cutter, rect→poly
		const polys = polygonsOf(core);
		expect(polys.length).toBe(1);
		const poly = polys[0];
		// 16 − 1 (the overlapping corner) = 15.
		expect(poly.GetArea()).toBeCloseTo(15, 4);
		// Material + appearance carried over from the target.
		expect(poly.red).toBe(123);
		expect(poly.green).toBe(45);
		expect(poly.blue).toBe(67);
		expect(poly.density).toBe(20);
		expect(poly.friction).toBe(9);
		// The new polygon is selected.
		expect(core.getState().edit.selection).toEqual([poly.id]);
	});

	it("is undoable — undo restores the original two shapes", () => {
		const target = new Rectangle(0, 0, 4, 4);
		const cutter = new Rectangle(3, 3, 2, 2);
		const { core, ids } = coreWith(target, cutter);
		const [targetId, cutterId] = ids;
		const partsBefore = core.getState().parts.length;

		core.dispatch({ type: "subtractShapes", targetId, subtrahendIds: [cutterId] });
		expect(polygonsOf(core).length).toBe(1);

		core.dispatch({ type: "undo" });
		expect(core.getState().parts.length).toBe(partsBefore);
		expect(core.getState().parts.find((p) => p.id === cutterId)).toBeInstanceOf(Rectangle);
		expect(core.getState().parts.find((p) => p.id === targetId)).toBeInstanceOf(Rectangle);
		expect(polygonsOf(core).length).toBe(0);
	});

	it("deletes the target when a subtrahend fully covers it", () => {
		const target = new Rectangle(1, 1, 2, 2);
		const cutter = new Rectangle(-5, -5, 20, 20);
		const { core, ids } = coreWith(target, cutter);
		const [targetId, cutterId] = ids;

		core.dispatch({ type: "subtractShapes", targetId, subtrahendIds: [cutterId] });
		expect(core.getState().parts.find((p) => p.id === targetId)).toBeUndefined();
		expect(core.getState().parts.find((p) => p.id === cutterId)).toBeUndefined();
		expect(polygonsOf(core).length).toBe(0);
	});

	it("leaves the target unchanged (with a warning) when shapes do not overlap", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const target = new Rectangle(0, 0, 2, 2);
		const cutter = new Rectangle(10, 10, 2, 2);
		const { core, ids } = coreWith(target, cutter);
		const [targetId, cutterId] = ids;

		core.dispatch({ type: "subtractShapes", targetId, subtrahendIds: [cutterId] });
		// Both shapes still there; no polygon created.
		expect(core.getState().parts.find((p) => p.id === targetId)).toBeInstanceOf(Rectangle);
		expect(core.getState().parts.find((p) => p.id === cutterId)).toBeInstanceOf(Rectangle);
		expect(polygonsOf(core).length).toBe(0);
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it("subtracts a circle (sampled as an N-gon) from a rectangle", () => {
		const target = new Rectangle(0, 0, 4, 4);
		// A circle centred on the target's top-right corner removes ~a quarter disc.
		const cutter = new Circle(4, 4, 2);
		const { core, ids } = coreWith(target, cutter);
		const [targetId, cutterId] = ids;

		core.dispatch({ type: "subtractShapes", targetId, subtrahendIds: [cutterId] });
		const polys = polygonsOf(core);
		expect(polys.length).toBe(1);
		// 16 − (quarter of π·2² ≈ 3.14) ≈ 12.86 (N-gon approximation).
		expect(polys[0].GetArea()).toBeGreaterThan(12);
		expect(polys[0].GetArea()).toBeLessThan(13.2);
		expect(core.getState().parts.find((p) => p.id === cutterId)).toBeUndefined();
	});

	it("keeps BOTH pieces when a bar cut splits the target in two", () => {
		// A vertical bar cut across the middle of a wide short rectangle splits it
		// into a left piece and a right piece — both must survive as separate parts.
		const target = new Rectangle(0, 0, 6, 2); // area 12
		const cutter = new Rectangle(2, -1, 2, 4); // full-height bar x in [2,4]
		const { core, ids } = coreWith(target, cutter);
		const [targetId, cutterId] = ids;
		const partsBefore = core.getState().parts.length;

		core.dispatch({ type: "subtractShapes", targetId, subtrahendIds: [cutterId] });

		// Cutter gone; the target became TWO polygons (net +1 part vs. before).
		expect(core.getState().parts.find((p) => p.id === cutterId)).toBeUndefined();
		expect(core.getState().parts.find((p) => p.id === targetId)).toBeUndefined();
		const polys = polygonsOf(core);
		expect(polys.length).toBe(2);
		expect(core.getState().parts.length).toBe(partsBefore); // -cutter -rect +2 polys = net 0
		// Each half is a 2x2 square (area 4); total 8 = 12 − the middle 2x2 band.
		const areas = polys.map((p) => p.GetArea()).sort((a, b) => a - b);
		expect(areas[0]).toBeCloseTo(4, 4);
		expect(areas[1]).toBeCloseTo(4, 4);
		// Both pieces have distinct fresh ids and are both selected.
		expect(polys[0].id).not.toBe(polys[1].id);
		expect(core.getState().edit.selection.length).toBe(2);
		expect(new Set(core.getState().edit.selection)).toEqual(new Set(polys.map((p) => p.id)));
	});

	it("each split piece inherits the target's material/appearance", () => {
		const target = new Rectangle(0, 0, 6, 2);
		target.red = 10;
		target.green = 20;
		target.blue = 30;
		target.density = 22;
		const cutter = new Rectangle(2, -1, 2, 4);
		const { core, ids } = coreWith(target, cutter);
		const [targetId, cutterId] = ids;

		core.dispatch({ type: "subtractShapes", targetId, subtrahendIds: [cutterId] });
		const polys = polygonsOf(core);
		expect(polys.length).toBe(2);
		for (const p of polys) {
			expect(p.red).toBe(10);
			expect(p.green).toBe(20);
			expect(p.blue).toBe(30);
			expect(p.density).toBe(22);
		}
	});

	it("cleans up joints: deletes ones on subtrahends / in removed regions, re-points survivors", () => {
		// Split a 6x2 rect by a middle bar (removes x in [2,4]) → left + right pieces.
		const target = new Rectangle(0, 0, 6, 2);
		const cutter = new Rectangle(2, -1, 2, 4);
		// Partner shapes the joints connect the target/cutter TO (not subtracted).
		const anchorLeft = new Circle(1, 1, 0.3); // inside the surviving LEFT piece
		const anchorMid = new Circle(3, 1, 0.3); // in the REMOVED middle band
		const anchorSub = new Circle(3, 3, 0.3); // partner for the joint on the cutter
		// jSurvive: target-joint whose anchor (1,1) survives on the left piece.
		const jSurvive = new RevoluteJoint(target, anchorLeft, 1, 1);
		// jRemoved: target-joint whose anchor (3,1) falls in the subtracted-away band.
		const jRemoved = new RevoluteJoint(target, anchorMid, 3, 1);
		// jOnSub: joint attached to the (deleted) subtrahend cutter.
		const jOnSub = new RevoluteJoint(cutter, anchorSub, 3, 3);

		const { core, ids } = coreWith(target, cutter, anchorLeft, anchorMid, anchorSub, jSurvive, jRemoved, jOnSub);
		const [targetId, cutterId, , , , jSurviveId, jRemovedId, jOnSubId] = ids;

		core.dispatch({ type: "subtractShapes", targetId, subtrahendIds: [cutterId] });
		const parts = core.getState().parts;
		const byId = (id: number) => parts.find((p) => p.id === id);

		// Target replaced by two pieces; cutter gone.
		expect(byId(targetId)).toBeUndefined();
		expect(byId(cutterId)).toBeUndefined();
		expect(parts.filter((p) => p instanceof Polygon).length).toBe(2);

		// Joint on the subtrahend → deleted. Joint in the removed region → deleted.
		expect(byId(jOnSubId)).toBeUndefined();
		expect(byId(jRemovedId)).toBeUndefined();

		// Surviving joint kept and RE-POINTED: its target side is now a piece Polygon
		// (which is itself a live part), the other side is unchanged.
		const survivor = byId(jSurviveId) as RevoluteJoint | undefined;
		expect(survivor).toBeInstanceOf(RevoluteJoint);
		expect(survivor!.part1).toBeInstanceOf(Polygon);
		expect(parts).toContain(survivor!.part1);
		expect((survivor!.part1 as Polygon).InsideShape(1, 1, 1)).toBe(true);
		expect(survivor!.part2).toBe(anchorLeft);

		// Hard invariant: NO dangling joints — every joint in the graph references
		// parts that are still in the graph.
		const liveIds = new Set(parts.map((p) => p.id));
		for (const p of parts) {
			if (p instanceof JointPart) {
				expect(liveIds.has(p.part1.id)).toBe(true);
				expect(liveIds.has(p.part2.id)).toBe(true);
			}
		}

		// The deleted joints are detached from their surviving partner shapes'
		// m_joints too (no lingering reference): re-cloning the graph (which drops
		// any joint whose partner is missing) round-trips to the SAME joint set.
		const jointIds = parts.filter((p) => p instanceof JointPart).map((p) => p.id);
		expect(jointIds).toEqual([jSurviveId]);
	});

	it("subtracts multiple subtrahends in one command", () => {
		const target = new Rectangle(0, 0, 6, 2); // area 12
		const cutA = new Rectangle(0, 0, 1, 1); // removes 1 (bottom-left corner)
		const cutB = new Rectangle(5, 1, 1, 1); // removes 1 (top-right corner)
		const { core, ids } = coreWith(target, cutA, cutB);
		const [targetId, aId, bId] = ids;

		core.dispatch({ type: "subtractShapes", targetId, subtrahendIds: [aId, bId] });
		expect(core.getState().parts.find((p) => p.id === aId)).toBeUndefined();
		expect(core.getState().parts.find((p) => p.id === bId)).toBeUndefined();
		const polys = polygonsOf(core);
		expect(polys.length).toBe(1);
		expect(polys[0].GetArea()).toBeCloseTo(10, 4);
	});
});
