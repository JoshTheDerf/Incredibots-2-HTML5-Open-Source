// Render interpolation helpers (src/ui/renderer/interpolation.ts): the pure
// lerp/lerpAngle math the 30fps-sim / display-rate-render blend uses, plus the
// RenderInterpolator's snapshot/fallback contract against real b2Bodies.

import { describe, expect, it } from "vitest";
import { lerp, lerpAngle, RenderInterpolator } from "../src/ui/renderer/interpolation";
import { b2AABB, b2BodyDef, b2Vec2, b2World } from "../src/Box2D";
import { box2d20Backend } from "../src/core/physics";
import type { PhysicsBackend } from "../src/core/physics";

describe("lerp", () => {
	it("blends linearly between endpoints", () => {
		expect(lerp(0, 10, 0)).toBe(0);
		expect(lerp(0, 10, 1)).toBe(10);
		expect(lerp(0, 10, 0.25)).toBeCloseTo(2.5);
		expect(lerp(-4, 4, 0.5)).toBeCloseTo(0);
	});
});

describe("lerpAngle (shortest arc)", () => {
	it("interpolates plainly when no wrap is involved", () => {
		expect(lerpAngle(0, 1, 0.5)).toBeCloseTo(0.5);
		expect(lerpAngle(1, 0, 0.25)).toBeCloseTo(0.75);
	});
	it("takes the short way across the +PI/-PI wrap", () => {
		// +179deg -> -179deg is 2deg the short way (through PI), not 358deg back.
		const a = Math.PI - 0.01;
		const b = -Math.PI + 0.01;
		const mid = lerpAngle(a, b, 0.5);
		// Midpoint is at the wrap: PI (equivalently -PI).
		expect(Math.abs(Math.abs(mid) - Math.PI)).toBeLessThan(1e-9);
		// A quarter of the way moves only a quarter of the 0.02 rad gap.
		expect(lerpAngle(a, b, 0.25)).toBeCloseTo(a + 0.005);
	});
	it("takes the short way in the other direction too", () => {
		const a = -Math.PI + 0.01;
		const b = Math.PI - 0.01;
		expect(lerpAngle(a, b, 0.25)).toBeCloseTo(a - 0.005);
	});
	it("handles multi-revolution deltas via normalization", () => {
		// 0 -> 3PI: the normalized shortest delta is PI (or -PI); halfway must be
		// a quarter-turn's worth of |PI/2| from 0.
		const half = lerpAngle(0, 3 * Math.PI, 0.5);
		expect(Math.abs(half)).toBeCloseTo(Math.PI / 2);
	});
	it("t=0 / t=1 return the endpoints (mod 2PI)", () => {
		const a = 2.9;
		const b = -2.9;
		expect(lerpAngle(a, b, 0)).toBeCloseTo(a);
		// Endpoint at t=1 equals b up to a full revolution.
		const end = lerpAngle(a, b, 1);
		const wrapped = Math.atan2(Math.sin(end), Math.cos(end));
		expect(wrapped).toBeCloseTo(b);
	});
});

/** A minimal world with one dynamic-capable body at (x, y, angle). */
function worldWithBody(x: number, y: number, angle: number): { world: b2World; body: import("../src/Box2D").b2Body } {
	const aabb = new b2AABB();
	aabb.lowerBound.Set(-100, -100);
	aabb.upperBound.Set(100, 100);
	const world = new b2World(aabb, new b2Vec2(0, 10), true);
	const bd = new b2BodyDef();
	bd.position.Set(x, y);
	bd.angle = angle;
	const body = world.CreateBody(bd);
	return { world, body };
}

describe("RenderInterpolator", () => {
	it("interpolates a snapshotted body between prev and current pose", () => {
		const { world, body } = worldWithBody(1, 2, 0.5);
		const interp = new RenderInterpolator();
		interp.snapshot(world, box2d20Backend);
		// "Step": move the body.
		body.SetXForm(new b2Vec2(3, 6), 1.0);

		const xf = interp.getXForm(body, 0.5);
		expect(xf.position.x).toBeCloseTo(2);
		expect(xf.position.y).toBeCloseTo(4);
		// R.Set(angle) => col1 = (cos, sin).
		expect(Math.atan2(xf.R.col1.y, xf.R.col1.x)).toBeCloseTo(0.75);

		// alpha=0 is the previous pose; alpha=1 the current one.
		expect(interp.getXForm(body, 0).position.x).toBeCloseTo(1);
		expect(interp.getXForm(body, 1).position.x).toBeCloseTo(3);
	});

	it("draws bodies with no snapshot raw (e.g. cannonballs created mid-step)", () => {
		const { world, body } = worldWithBody(0, 0, 0);
		const interp = new RenderInterpolator();
		interp.snapshot(world, box2d20Backend);
		// A body created AFTER the snapshot (mid-step cannonball).
		const bd = new b2BodyDef();
		bd.position.Set(7, 8);
		const newcomer = world.CreateBody(bd);
		const xf = interp.getXForm(newcomer, 0.5);
		expect(xf.position.x).toBeCloseTo(7);
		expect(xf.position.y).toBeCloseTo(8);
		void body;
	});

	it("clear() drops snapshots so everything draws raw", () => {
		const { world, body } = worldWithBody(1, 1, 0);
		const interp = new RenderInterpolator();
		interp.snapshot(world, box2d20Backend);
		expect(interp.hasSnapshot()).toBe(true);
		interp.clear();
		expect(interp.hasSnapshot()).toBe(false);
		body.SetXForm(new b2Vec2(5, 5), 0);
		expect(interp.getXForm(body, 0).position.x).toBeCloseTo(5);
	});

	it("worldCenter interpolates the mass centre used by the camera follow", () => {
		const { world, body } = worldWithBody(0, 0, 0);
		const interp = new RenderInterpolator();
		interp.snapshot(world, box2d20Backend);
		body.SetXForm(new b2Vec2(10, 0), 0);
		const c = interp.worldCenter(body, 0.25);
		expect(c.x).toBeCloseTo(2.5);
		expect(c.y).toBeCloseTo(0);
	});

	// Regression for the engine-2 (Box2D v3) crash: "e.GetBodyList is not a
	// function" thrown by snapshot the first frame after Play. Engine 2's world is
	// a raw v3 value-handle with NO GetBodyList()/GetNext() (v3 has no body-
	// enumeration API), so snapshot MUST enumerate through the backend's
	// forEachBody — never off the world handle directly. This stands in a v3-style
	// world (a bare object) + a backend that iterates its own tracked bodies.
	it("snapshots a v3-style world with no GetBodyList via backend.forEachBody", () => {
		// A duck-typed b2Body: only the reads snapshot/getXForm make.
		const mkBody = (x: number, y: number, angle: number) => {
			let px = x;
			let py = y;
			let a = angle;
			return {
				GetPosition: () => ({ x: px, y: py }),
				GetWorldCenter: () => ({ x: px, y: py }),
				GetAngle: () => a,
				GetXForm: () => ({ position: { x: px, y: py }, R: { col1: { x: Math.cos(a), y: Math.sin(a) }, col2: { x: -Math.sin(a), y: Math.cos(a) } } }),
				move: (nx: number, ny: number, na: number) => {
					px = nx;
					py = ny;
					a = na;
				},
			};
		};
		const tracked = [mkBody(1, 2, 0)];
		// The v3-style world: deliberately has NO GetBodyList — touching it throws.
		const rawWorld = { __v3: true } as unknown as b2World;
		const backend = {
			forEachBody(_world: unknown, cb: (b: unknown) => void) {
				for (const b of tracked) cb(b);
			},
		} as unknown as PhysicsBackend;

		const interp = new RenderInterpolator();
		// Must NOT throw (the reported crash) even though rawWorld has no GetBodyList.
		expect(() => interp.snapshot(rawWorld, backend)).not.toThrow();
		expect(interp.hasSnapshot()).toBe(true);

		// The SAME body handle Draw later passes to getXForm interpolates correctly.
		const body = tracked[0] as unknown as import("../src/Box2D").b2Body;
		(tracked[0] as ReturnType<typeof mkBody>).move(3, 6, 0);
		const xf = interp.getXForm(body, 0.5);
		expect(xf.position.x).toBeCloseTo(2);
		expect(xf.position.y).toBeCloseTo(4);
	});
});
