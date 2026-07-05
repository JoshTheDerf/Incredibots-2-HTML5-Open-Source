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

import { afterEach, describe, expect, it } from "vitest";
import { b2Vec2 } from "../src/Box2D";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { FRACTURE_TEST, shatter } from "../src/core/fractureSystem";
import { box2d20Backend, box2d21Backend } from "../src/core/physics";
import { decodeRobot, encodeRobot } from "../src/core/robotSerialization";
import { SandboxSettings } from "../src/Game/SandboxSettings";
import { Circle } from "../src/Parts/Circle";
import { FixedJoint } from "../src/Parts/FixedJoint";
import { Polygon } from "../src/Parts/Polygon";
import { Rectangle } from "../src/Parts/Rectangle";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { setPhysicsBackend } from "../src/Parts/partGlobals";
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

	it("a CONCAVE polygon shatters too (contact lands on a non-first triangle fixture)", () => {
		// A concave polygon Init's into several triangle fixtures; m_shape is only the
		// first, so the impact must be attributed via ALL fixtures (GetCollisionShapes),
		// else a contact on another triangle would never trigger a fracture.
		const verts = [
			new b2Vec2(-2, -23),
			new b2Vec2(2, -23),
			new b2Vec2(2, -19),
			new b2Vec2(0, -21), // reflex notch -> concave
			new b2Vec2(-2, -19),
		];
		const poly = new Polygon(verts);
		expect(Polygon.isConvex(verts)).toBe(false); // genuinely concave
		poly.fragility = 10;
		poly.id = 100000;
		const state = createInitialState();
		state.parts = [...state.parts, poly];
		const core = new GameCore(state);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 300 });
		expect(core.getSimFragments().length).toBeGreaterThanOrEqual(2);
	});

	it("a LARGE object only sheds a local chip — one bulk piece dominates, not full shatter", () => {
		// A big (20x3, area 60) fragile-but-tough (fragility 4) plank dropped tilted so
		// a CORNER strikes first: the impact scar is small relative to the object, so it
		// sheds a few shards near that corner while the large remainder survives as one
		// dominant piece (vs a full shatter, where no single piece would dominate).
		const plank = new Rectangle(-10, -13, 20, 3);
		plank.fragility = 4;
		plank.angle = 0.3; // tilt -> land on a corner, not flat
		plank.id = 100000;
		const state = createInitialState();
		state.parts = [...state.parts, plank];
		const core = new GameCore(state);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 150 });
		const frags = core.getSimFragments();
		expect(frags.length).toBeGreaterThanOrEqual(2); // bulk + at least one shard
		const areas = frags.map((f) => (f as { GetArea(): number }).GetArea());
		const maxArea = Math.max(...areas);
		const total = areas.reduce((s, a) => s + a, 0);
		// Localized: ONE piece holds the majority of the surviving mass (a full shatter
		// would spread it across many similar-sized shards, max/total well under half).
		expect(maxArea).toBeGreaterThan(total * 0.55);
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

	it("does not shatter without a real contact impact (a shape resting in mid-air)", () => {
		// Impact-driven: a fragile shape that hasn't touched anything yet (one frame
		// of free-fall, no contact) produces no impact report -> no shatter.
		const shape = new Rectangle(-1, -1, 2, 2);
		shape.fragility = 10;
		shape.id = 1;
		const state = createInitialState();
		state.parts = [...state.parts, shape];
		const core = new GameCore(state);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 1 });
		expect(core.getSimFragments().length).toBe(0);
	});
});

describe("fracture across engines + welded/jointed parts", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	function dropCore(fragility: number, extra: Part[] = []): { core: GameCore; id: number } {
		const shape = new Rectangle(-1, -21, 2, 2);
		shape.fragility = fragility;
		shape.id = 100000;
		const state = createInitialState();
		state.parts = [...state.parts, shape, ...extra];
		let n = 100001;
		for (const p of extra) p.id = n++;
		return { core: new GameCore(state), id: shape.id };
	}

	it("engine 1 (Box2D 2.1a) also shatters a fragile shape on hard impact", () => {
		setPhysicsBackend(box2d21Backend);
		const { core } = dropCore(8);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 260 });
		expect(core.getSimFragments().length).toBeGreaterThanOrEqual(2);
	});

	it("a WELDED fragile part shatters (previously joints excluded it)", () => {
		// Two rectangles welded into one rigid body; both fragile. Dropped hard, the
		// welded assembly shatters (welded parts are now eligible).
		const a = new Rectangle(-1, -21, 2, 2);
		a.fragility = 8;
		const b = new Rectangle(1, -21, 2, 2);
		b.fragility = 8;
		const fj = new FixedJoint(a, b, 0, -20); // untriggered weld -> shared body
		a.id = 100000;
		b.id = 100001;
		fj.id = 100002;
		const state = createInitialState();
		state.parts = [...state.parts, a, b, fj];
		const core = new GameCore(state);
		expect(a.GetBody).toBeTruthy();
		core.dispatch({ type: "play" });
		// Shared-body weld sanity: both parts share one body.
		expect(a.GetBody()).toBe(b.GetBody());
		core.dispatch({ type: "step", frames: 260 });
		expect(core.getSimFragments().length).toBeGreaterThanOrEqual(2);
	});

	it("a REVOLUTE-jointed fragile part shatters, leaving the base intact and no dangling joint", () => {
		// A fragile arm pinned to a (non-fragile) base by a revolute joint; both fall
		// and hit the ground. The arm shatters (jointed parts are now eligible) and
		// ConsumeForFracture splits off its joint — surviving 300 more frames without
		// a crash proves the joint (which referenced the arm's destroyed body) was
		// torn down (else the per-frame CheckForBreakage would throw).
		const base = new Rectangle(-1, -21, 2, 2); // fragility 0 (intact)
		const arm = new Rectangle(1, -21, 2, 2);
		arm.fragility = 8;
		const rj = new RevoluteJoint(base, arm, 0, -20);
		base.id = 100000;
		arm.id = 100001;
		rj.id = 100002;
		const state = createInitialState();
		state.parts = [...state.parts, base, arm, rj];
		const core = new GameCore(state);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 300 });
		expect(core.getSimFragments().length).toBeGreaterThanOrEqual(2);
		// The non-fragile base is untouched (separate body from the shattered arm).
		expect(base.GetShape()).not.toBeNull();
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
