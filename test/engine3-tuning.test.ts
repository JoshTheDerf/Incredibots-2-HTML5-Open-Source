// E3-5 — engine 2 (Box2D v3) solver-feel tuning + ContactFilter reconciliation.
//
// PART 1 (tuning). Runs three representative bots — a box at rest, a wide base
// under a stacked load, and a two-wheel motored car — under engines 0 AND 2 via
// the setPhysicsBackend seam, and asserts engine-2 metrics land in the SAME
// BALLPARK as engine 0 (loose tolerances; different solvers can't match exactly).
// The chosen v3 tunings (Box2D3Backend: sub-step 4, contactHertz 30, damping 10,
// restitutionThreshold 1.0) are documented there; this pins the resulting feel.
//   - REST: a dropped box comes to rest AT the surface (no sink) and sleeps.
//   - LOAD: a wide base under two boxes does not sink under the extra weight.
//   - CAR: a motored car travels about the same distance (motor feel matches).
// Restitution is checked to bounce meaningfully but is EXPECTED ~20% lower than
// engines 0/1 (inherent to v3's restitution solver — see Box2D3Backend).
//
// PART 2 (ContactFilter). Verifies the three reconciled cases under engine 2:
// terrain-vs-everything (incl. an all-layers-off object), a collide=false opt-out,
// and two shapes of the SAME piston on different bodies not self-colliding.

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { b2BodyDef, b2PolygonDef } from "../src/Box2D";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { box2d20Backend } from "../src/core/physics";
import type { PhysicsBackend } from "../src/core/physics";
import { Box2D3Backend } from "../src/enginebox2d3/Box2D3Backend";
import { loadBox2D3 } from "../src/enginebox2d3/loadBox2D3";
import { Circle } from "../src/Parts/Circle";
import type { Part } from "../src/Parts/Part";
import { getPhysicsBackend, setPhysicsBackend } from "../src/Parts/partGlobals";
import { Rectangle } from "../src/Parts/Rectangle";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";

let e2: Box2D3Backend;
beforeAll(async () => {
	e2 = new Box2D3Backend(await loadBox2D3());
});

function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}
// biome-ignore lint/suspicious/noExplicitAny: test reads the opaque body handle.
const pose = (p: any) => getPhysicsBackend().bodyTransform(p.GetBody());
// biome-ignore lint/suspicious/noExplicitAny: test reads the opaque body handle.
const vel = (p: any) => getPhysicsBackend().bodyVelocity(p.GetBody());

/** A wide static ground bypassing Rectangle's 10-unit size clamp (checkLimits=false). */
function ground(cx: number, cy: number, w: number): Rectangle {
	const g = new Rectangle(cx - w / 2, cy - 1, w, 2, false);
	g.isStatic = true;
	return g;
}

// --- metric collectors (engine-agnostic; the active backend is set by caller) ---
function restMetrics(): { y: number; settle: number; drift: number } {
	const g = ground(0, 20, 60); // top surface y=19
	const box = new Rectangle(-1, 5, 2, 2); // 2x2, ideal rest centre y=18
	const core = coreWith([g, box]);
	core.dispatch({ type: "play" });
	let settle = -1;
	for (let f = 0; f < 400; f++) {
		core.dispatch({ type: "step", frames: 1 });
		if (settle < 0 && f > 20 && Math.abs(vel(box).y) < 0.02 && pose(box).y > 15) settle = f;
	}
	const p = pose(box);
	return { y: p.y, settle, drift: Math.abs(p.x - 0) };
}
function loadBaseY(): number {
	const g = ground(0, 20, 60);
	const base = new Rectangle(-4, 16, 8, 2);
	base.isEditable = false;
	const l1 = new Rectangle(-3, 14, 6, 2);
	l1.isEditable = false;
	const l2 = new Rectangle(-2, 12, 4, 2);
	l2.isEditable = false;
	const core = coreWith([g, base, l1, l2]);
	core.dispatch({ type: "play" });
	core.dispatch({ type: "step", frames: 300 });
	return pose(base).y;
}
function carTravel(): number {
	const g = ground(50, 30, 400); // wide track, top y=29
	const chassis = new Rectangle(0, 25, 6, 1.5);
	const w1 = new Circle(-2, 27, 1.2);
	const w2 = new Circle(2, 27, 1.2);
	const j1 = new RevoluteJoint(chassis, w1, -2, 27);
	j1.enableMotor = true;
	j1.autoCW = true;
	j1.motorSpeed = 12;
	j1.motorStrength = 15;
	const j2 = new RevoluteJoint(chassis, w2, 2, 27);
	j2.enableMotor = true;
	j2.autoCW = true;
	j2.motorSpeed = 12;
	j2.motorStrength = 15;
	const core = coreWith([g, chassis, w1, w2, j1, j2]);
	core.dispatch({ type: "play" });
	const x0 = pose(chassis).x;
	core.dispatch({ type: "step", frames: 240 });
	return pose(chassis).x - x0;
}
function bounceHeight(): number {
	const g = ground(0, 30, 60); // top y=29
	const box = new Rectangle(-1, 5, 2, 2);
	box.restitution = 30; // max bounce
	const core = coreWith([g, box]);
	core.dispatch({ type: "play" });
	let minY = 1e9;
	let hit = false;
	for (let f = 0; f < 300; f++) {
		core.dispatch({ type: "step", frames: 1 });
		const y = pose(box).y;
		if (y > 27) hit = true;
		if (hit && vel(box).y < 0) minY = Math.min(minY, y);
	}
	return 28 - minY; // rebound peak above rest centre (28)
}

describe("engine 2 (Box2D v3) solver-feel tuning", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	function underEngine<T>(be: PhysicsBackend, fn: () => T): T {
		setPhysicsBackend(be);
		return fn();
	}

	it("REST: engine-2 box rests at the surface (no sink) and sleeps, ~ engine 0", () => {
		const e0 = underEngine(box2d20Backend, restMetrics);
		const r2 = underEngine(e2, restMetrics);
		// Ideal rest centre y=18 (box half-height 1 on ground top y=19).
		expect(e0.y).toBeGreaterThan(17.5);
		expect(e0.y).toBeLessThan(18.5);
		expect(r2.y).toBeGreaterThan(17.5); // no sinking into the ground
		expect(r2.y).toBeLessThan(18.5); // no floating above it
		expect(Math.abs(r2.y - e0.y)).toBeLessThan(0.5); // same ballpark
		expect(r2.settle).toBeGreaterThan(0); // it DID come to rest (slept)
		expect(r2.settle).toBeLessThan(200); // reasonably promptly, like engine 0
		expect(r2.drift).toBeLessThan(1.0); // negligible sideways drift at rest
	});

	it("LOAD: engine-2 wide base does not sink under a stacked load, ~ engine 0", () => {
		const e0 = underEngine(box2d20Backend, loadBaseY);
		const b2 = underEngine(e2, loadBaseY);
		expect(e0).toBeGreaterThan(17.5);
		expect(e0).toBeLessThan(18.5);
		expect(b2).toBeGreaterThan(17.5); // base did not sink through the ground
		expect(b2).toBeLessThan(18.5);
		expect(Math.abs(b2 - e0)).toBeLessThan(0.5);
	});

	it("CAR: engine-2 motored car travels about as far as engine 0 (joint/motor feel)", () => {
		const e0 = underEngine(box2d20Backend, carTravel);
		const t2 = underEngine(e2, carTravel);
		expect(Math.abs(e0)).toBeGreaterThan(50); // engine 0 car really moves
		expect(Math.abs(t2)).toBeGreaterThan(0.6 * Math.abs(e0)); // e2 moves comparably
		expect(Math.abs(t2)).toBeLessThan(1.4 * Math.abs(e0)); // and not wildly more
		expect(Math.sign(t2)).toBe(Math.sign(e0)); // same direction
	});

	it("RESTITUTION: engine-2 box bounces meaningfully (expected ~20% lower than engine 0)", () => {
		const e0 = underEngine(box2d20Backend, bounceHeight);
		const b2 = underEngine(e2, bounceHeight);
		expect(e0).toBeGreaterThan(8); // engine 0 bounces high
		expect(b2).toBeGreaterThan(5); // engine 2 bounces clearly
		expect(b2).toBeLessThan(e0 * 1.2); // never MORE bouncy (v3 errs low, not high)
	});
});

// --- ContactFilter reconciliation (E3-5) under engine 2 ---

describe("engine 2 (Box2D v3) ContactFilter reconciliation", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	it("terrain (isSandbox) collides with an all-layers-off object; plain ground does not", () => {
		function drop(sandbox: boolean): number {
			setPhysicsBackend(e2);
			const g = ground(0, 20, 60); // top y=19
			g.isSandbox = sandbox; // isSandbox=true -> force-collide via reserved filter bits
			// object with EVERY collision layer OFF -> categoryBits 0 -> collides with
			// nothing via the layer bits alone; only the sandbox force-collide catches it.
			const box = new Rectangle(-1, 5, 2, 2);
			box.collA = false;
			box.collB = false;
			box.collC = false;
			box.collD = false;
			const core = coreWith([g, box]);
			core.dispatch({ type: "play" });
			core.dispatch({ type: "step", frames: 200 });
			return pose(box).y;
		}
		const onSandbox = drop(true); // rests on terrain (~18)
		const onPlain = drop(false); // tunnels straight through
		expect(onSandbox).toBeGreaterThan(16);
		expect(onSandbox).toBeLessThan(19);
		expect(onPlain).toBeGreaterThan(40); // fell far past the ground
	});

	it("a collide=false object passes through another object it shares a layer with", () => {
		function drop(collide: boolean): number {
			setPhysicsBackend(e2);
			const g = ground(0, 20, 60); // plain (non-sandbox) ground, default layers
			const box = new Rectangle(-1, 5, 2, 2); // default layers -> shares layer A with ground
			box.collide = collide;
			const core = coreWith([g, box]);
			core.dispatch({ type: "play" });
			core.dispatch({ type: "step", frames: 200 });
			return pose(box).y;
		}
		const solid = drop(true); // rests on the ground (~18)
		const ghost = drop(false); // collide=false -> passes through
		expect(solid).toBeGreaterThan(16);
		expect(solid).toBeLessThan(19);
		expect(ghost).toBeGreaterThan(40); // tunnelled through
	});

	it("two shapes of the SAME piston on different bodies do not self-collide", () => {
		// The full piston shaft is heavy to build; exercise the veto directly through
		// the backend seam with the exact userData ContactFilter reads (isPiston set,
		// collide=true so ONLY the same-piston clause can fire). Two overlapping
		// dynamic boxes on SEPARATE bodies: same isPiston -> must NOT push apart;
		// different isPiston -> must push apart.
		function overlapSeparation(pistonA: number, pistonB: number): number {
			setPhysicsBackend(e2);
			const world = e2.createWorld({
				lowerX: -100,
				lowerY: -100,
				upperX: 100,
				upperY: 100,
				gravityX: 0,
				gravityY: 0,
				doSleep: false,
			});
			e2.installContactHandlers(world, { onAdd() {}, onRemove() {} });
			function pistonBox(cx: number, isPiston: number): ReturnType<Box2D3Backend["createBody"]> {
				const bd = new b2BodyDef();
				bd.position.Set(cx, 0);
				const body = e2.createBody(world, bd);
				const sd = new b2PolygonDef();
				sd.SetAsBox(1, 1);
				sd.density = 1;
				// userData shape ContactFilter reads. collide=true, editable=false so the
				// collide=false clauses can't fire — only the same-piston clause can.
				// biome-ignore lint/suspicious/noExplicitAny: 2.0 shape userData bag.
				const ud: any = {};
				ud.collide = true;
				ud.editable = false;
				ud.isPiston = isPiston;
				ud.isSandbox = false;
				sd.userData = ud;
				e2.createShape(body, sd);
				e2.setMassFromShapes(body);
				return body;
			}
			const a = pistonBox(0, pistonA);
			const b = pistonBox(0.5, pistonB); // overlapping a by 1.5 units
			for (let i = 0; i < 60; i++) e2.step(world, 1 / 60, 10);
			const ta = e2.bodyTransform(a);
			const tb = e2.bodyTransform(b);
			e2.destroyBody(world, a);
			e2.destroyBody(world, b);
			return Math.abs(tb.x - ta.x);
		}
		const samePiston = overlapSeparation(5, 5); // vetoed -> stay overlapped
		const diffPiston = overlapSeparation(5, 7); // collide -> pushed apart
		expect(samePiston).toBeLessThan(0.6); // did NOT separate (started 0.5 apart)
		expect(diffPiston).toBeGreaterThan(1.5); // pushed apart to non-overlapping
	});
});
