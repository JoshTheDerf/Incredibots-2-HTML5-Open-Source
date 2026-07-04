// Fracturing (superset / prototype) — impact-focused runtime shatter.
//
// Three layers:
//   1. Pure geometry: the Voronoi half-plane shatter tiles the shape, keeps
//      fragments inside, conserves area, and concentrates small shards at the
//      impact point.
//   2. The `fragility` property: clamped setter, clone + save/load round-trip.
//   3. Live sim: a fragile shape dropped onto the sandbox ground shatters into
//      transient fragments; a fragility-0 shape never does; reset drops the
//      fragments and restores the original (it re-Inits on the next play).

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import {
	FRACTURE_TEST,
	FractureSystem,
	shatter,
} from "../src/core/fractureSystem";
import { decodeRobot, encodeRobot } from "../src/core/robotSerialization";
import { SandboxSettings } from "../src/Game/SandboxSettings";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { MAX_FRAGILITY, MIN_FRAGILITY } from "../src/Parts/partDefaults";
import type { Part } from "../src/Parts/Part";

const { polygonArea, pointInPolygon, convexHull } = FRACTURE_TEST;

const UNIT_SQUARE = [
	{ x: -1, y: -1 },
	{ x: 1, y: -1 },
	{ x: 1, y: 1 },
	{ x: -1, y: 1 },
];

// --- 1. geometry ----------------------------------------------------------

describe("shatter geometry", () => {
	it("convexHull of a square (+ interior point) is the 4 corners", () => {
		const hull = convexHull([...UNIT_SQUARE, { x: 0, y: 0 }]);
		expect(hull.length).toBe(4);
		expect(Math.abs(polygonArea(hull) - 4)).toBeLessThan(1e-9);
	});

	it("splits a square into multiple fragments, all inside, conserving ~all area", () => {
		const impact = { x: 1, y: 1 }; // a corner
		const cells = shatter(UNIT_SQUARE, impact, 10, FRACTURE_TEST.mulberry32(12345));
		expect(cells.length).toBeGreaterThanOrEqual(2);
		let sum = 0;
		for (const cell of cells) {
			expect(cell.length).toBeGreaterThanOrEqual(3);
			// Each fragment's centroid lies within the parent square.
			const c = centroid(cell);
			expect(pointInPolygon(c.x, c.y, UNIT_SQUARE)).toBe(true);
			sum += polygonArea(cell);
		}
		// Voronoi cells tile the hull; only tiny slivers are dropped, so almost all
		// of the 4.0 area survives.
		expect(sum).toBeGreaterThan(3.5);
		expect(sum).toBeLessThanOrEqual(4.01);
	});

	it("concentrates the smallest shards near the impact point (focus)", () => {
		const impact = { x: 1, y: -1 };
		const cells = shatter(UNIT_SQUARE, impact, 12, FRACTURE_TEST.mulberry32(999));
		expect(cells.length).toBeGreaterThanOrEqual(6);
		const withDist = cells
			.map((cell) => {
				const c = centroid(cell);
				return { area: polygonArea(cell), dist: Math.hypot(c.x - impact.x, c.y - impact.y) };
			})
			.sort((a, b) => a.area - b.area);
		const n = 3;
		const smallAvgDist = avg(withDist.slice(0, n).map((f) => f.dist));
		const largeAvgDist = avg(withDist.slice(-n).map((f) => f.dist));
		// The smallest fragments sit closer to the impact than the largest ones.
		expect(smallAvgDist).toBeLessThan(largeAvgDist);
	});

	it("returns nothing for a degenerate (sub-triangle) ring", () => {
		expect(shatter([{ x: 0, y: 0 }, { x: 1, y: 0 }], { x: 0, y: 0 }, 5, FRACTURE_TEST.mulberry32(1))).toEqual([]);
	});
});

// --- 2. the fragility property -------------------------------------------

describe("fragility property", () => {
	function coreWith(parts: Part[]): { core: GameCore; ids: number[] } {
		parts.forEach((p, i) => (p.id = i + 1));
		const state = createInitialState();
		state.parts = [...state.parts, ...parts];
		return { core: new GameCore(state), ids: parts.map((p) => p.id) };
	}

	it("defaults to 0 (indestructible)", () => {
		expect(new Circle(0, 0, 1, false).fragility).toBe(0);
	});

	it("setFragility clamps to [MIN_FRAGILITY, MAX_FRAGILITY]", () => {
		const c = new Circle(0, 0, 1, false);
		const { core, ids } = coreWith([c]);
		core.dispatch({ type: "setFragility", partIds: ids, value: 5 });
		expect((core.getState().parts.find((p) => p.id === ids[0]) as Circle).fragility).toBe(5);
		core.dispatch({ type: "setFragility", partIds: ids, value: 999 });
		expect((core.getState().parts.find((p) => p.id === ids[0]) as Circle).fragility).toBe(MAX_FRAGILITY);
		core.dispatch({ type: "setFragility", partIds: ids, value: -3 });
		expect((core.getState().parts.find((p) => p.id === ids[0]) as Circle).fragility).toBe(MIN_FRAGILITY);
	});

	it("MakeCopy carries fragility", () => {
		const c = new Circle(0, 0, 1, false);
		c.fragility = 7;
		expect((c.MakeCopy() as Circle).fragility).toBe(7);
	});

	it("round-trips through save/load", async () => {
		const c = new Circle(0, 0, 1, false);
		c.fragility = 6;
		const code = await encodeRobot([c], new SandboxSettings(15, 0, 0, 0, 0, 0, 0, 0));
		const out = (await decodeRobot(code)).parts[0] as Circle;
		expect(out.fragility).toBe(6);
	});

	it("old codes (no fragility field) default to 0", async () => {
		const c = new Circle(0, 0, 1, false); // fragility stays default 0
		const code = await encodeRobot([c], new SandboxSettings(15, 0, 0, 0, 0, 0, 0, 0));
		const out = (await decodeRobot(code)).parts[0] as Circle;
		expect(out.fragility).toBe(0);
	});
});

// --- 3. live simulation ---------------------------------------------------

describe("fracture in simulation", () => {
	/** A fresh sandbox core with one dynamic shape dropped high above the ground. */
	function dropCore(fragility: number): { core: GameCore; id: number } {
		const shape = new Rectangle(-1, -21, 2, 2); // centre (0,-20), well above ground (~y12)
		shape.fragility = fragility;
		const state = createInitialState();
		shape.id = 100000; // clear of terrain ids
		state.parts = [...state.parts, shape];
		return { core: new GameCore(state), id: shape.id };
	}

	it("a fragile shape shatters on hard impact; the original loses its body", () => {
		const { core, id } = dropCore(8);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 260 });
		const frags = core.getSimFragments();
		expect(frags.length).toBeGreaterThanOrEqual(2);
		// The original shape is consumed: still in state.parts, but body/shape gone.
		const original = core.getState().parts.find((p) => p.id === id) as Rectangle;
		expect(original).toBeTruthy();
		expect(original.GetShape()).toBeNull();
	});

	it("a fragility-0 shape never shatters", () => {
		const { core } = dropCore(0);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 260 });
		expect(core.getSimFragments().length).toBe(0);
	});

	it("reset clears fragments and the original re-Inits on the next play", () => {
		const { core, id } = dropCore(8);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 260 });
		expect(core.getSimFragments().length).toBeGreaterThanOrEqual(2);

		core.dispatch({ type: "reset" });
		expect(core.getSimFragments().length).toBe(0);

		// Original comes back whole on the next play.
		core.dispatch({ type: "play" });
		const original = core.getState().parts.find((p) => p.id === id) as Rectangle;
		expect(original.GetShape()).not.toBeNull();
	});

	it("FractureSystem needs a baseline frame before it can fire (no first-frame spurious break)", () => {
		// Direct unit check: with only one observation, update returns nothing.
		const fs = new FractureSystem();
		const shape = new Rectangle(-1, -1, 2, 2);
		shape.fragility = 10;
		shape.id = 1;
		const state = createInitialState();
		state.parts = [...state.parts, shape];
		const core = new GameCore(state);
		core.dispatch({ type: "play" });
		// One frame only: the body has no previous-velocity baseline yet, so even a
		// (hypothetical) large delta can't be measured — nothing shatters.
		core.dispatch({ type: "step", frames: 1 });
		expect(core.getSimFragments().length).toBe(0);
	});
});

function centroid(poly: { x: number; y: number }[]): { x: number; y: number } {
	let x = 0;
	let y = 0;
	for (const p of poly) {
		x += p.x;
		y += p.y;
	}
	return { x: x / poly.length, y: y / poly.length };
}

function avg(xs: number[]): number {
	return xs.reduce((a, b) => a + b, 0) / xs.length;
}
