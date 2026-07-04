// E3-2 — engine 2 (Box2D v3, box2d3-wasm compat) SIMULATES a real bot.
//
// Proves a multi-part bot actually simulates under engine 2 by driving the SAME
// GameCore play/step path every engine-0 test uses, with the v3 backend injected
// via setPhysicsBackend (the test-only engine seam; default stays engine 0,
// restored in afterEach). Exercises the E3-2 surface end-to-end: v3 joints
// (weld-as-shared-body + a limit-locked/ motored revolute), the per-frame motor
// drive through the duck-typed joint wrapper, collision-layer filtering via
// b2Filter, and the polled contact events driving a trigger.
//
// Mirrors test/engine21-sim.test.ts (cases A-E) but with the async wasm load in
// beforeAll. Numbers need NOT match engines 0/1 (different solver) — each case
// only asserts sane/stable v3 behaviour.

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { box2d20Backend } from "../src/core/physics";
import type { PhysicsBackend } from "../src/core/physics";
import { Box2D3Backend } from "../src/enginebox2d3/Box2D3Backend";
import { loadBox2D3 } from "../src/enginebox2d3/loadBox2D3";
import { FixedJoint } from "../src/Parts/FixedJoint";
import type { Part } from "../src/Parts/Part";
import { getPhysicsBackend, setPhysicsBackend } from "../src/Parts/partGlobals";
import { TRIGGER_ROTATECW } from "../src/Parts/partDefaults";
import { Rectangle } from "../src/Parts/Rectangle";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";

let backend: Box2D3Backend;

beforeAll(async () => {
	backend = new Box2D3Backend(await loadBox2D3());
});

function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

function pose(part: { GetBody(): unknown | null }): { x: number; y: number; angle: number } {
	return getPhysicsBackend().bodyTransform(part.GetBody() as never);
}
function vel(part: { GetBody(): unknown | null }): { x: number; y: number } {
	return getPhysicsBackend().bodyVelocity(part.GetBody() as never);
}

describe("engine 2 (Box2D v3) simulates a bot", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	it("A. a dynamic box falls under gravity and rests on a static ground box", () => {
		setPhysicsBackend(backend);
		const ground = new Rectangle(-4, 10, 8, 2); // top surface at y=10
		ground.isStatic = true;
		const box = new Rectangle(0, 0, 2, 2);

		const core = coreWith([ground, box]);
		core.dispatch({ type: "play" });
		expect(getPhysicsBackend().bodyIsStatic(ground.GetBody() as never)).toBe(true);
		expect(getPhysicsBackend().bodyIsStatic(box.GetBody() as never)).toBe(false);

		core.dispatch({ type: "step", frames: 200 });

		const t = pose(box);
		expect(Number.isFinite(t.y)).toBe(true);
		expect(t.y).toBeGreaterThan(8.0);
		expect(t.y).toBeLessThan(9.5);
		expect(Math.abs(vel(box).y)).toBeLessThan(0.2);
	});

	it("B. a fixed joint welds two shapes into ONE rigid body that falls together", () => {
		setPhysicsBackend(backend);
		const a = new Rectangle(0, 0, 2, 2);
		const b = new Rectangle(2, 0, 2, 2);
		new FixedJoint(a, b, 2, 1); // untriggered -> same-body weld (no v3 joint)

		const core = coreWith([a, b]);
		core.dispatch({ type: "play" });

		// Plain weld: both shapes share ONE body (mirrors engines 0/1 — the weld IS
		// the shared body, so createJoint is never called for it).
		expect(a.GetBody()).not.toBeNull();
		expect(a.GetBody()).toBe(b.GetBody());

		const before = pose(a);
		core.dispatch({ type: "step", frames: 60 });
		const after = pose(a);
		expect(Number.isFinite(after.x)).toBe(true);
		expect(Number.isFinite(after.y)).toBe(true);
		expect(after.y).toBeGreaterThan(before.y); // free-falls as one rigid unit
	});

	it("C. a motored revolute joint drives the arm's rotation", () => {
		setPhysicsBackend(backend);
		const base = new Rectangle(0, 0, 2, 2);
		base.isStatic = true;
		const arm = new Rectangle(2, 0, 2, 2);
		const joint = new RevoluteJoint(base, arm, 2, 1);
		joint.enableMotor = true;
		joint.autoCW = true;
		joint.motorSpeed = 10;
		joint.motorStrength = 15;

		const core = coreWith([base, arm, joint]);
		core.dispatch({ type: "play" });
		expect(joint.GetJoint()).not.toBeNull(); // a real v3 revolute was created
		const a0 = pose(arm).angle;
		core.dispatch({ type: "step", frames: 90 });
		const a1 = pose(arm).angle;
		expect(Math.abs(a1 - a0)).toBeGreaterThan(1.0); // motor drove real rotation
	});

	it("D. collision layers filter contacts (mismatched pass through, matching rest)", () => {
		function drop(boxOnLayerA: boolean): number {
			setPhysicsBackend(backend);
			const ground = new Rectangle(-2, 12, 6, 2);
			ground.isStatic = true;
			ground.collA = false;
			ground.collB = true;
			ground.collC = false;
			ground.collD = false; // ground on layer B only
			const box = new Rectangle(0, 6, 2, 2);
			box.collA = boxOnLayerA;
			box.collB = !boxOnLayerA;
			box.collC = false;
			box.collD = false;
			const core = coreWith([ground, box]);
			core.dispatch({ type: "play" });
			core.dispatch({ type: "step", frames: 120 });
			return pose(box).y;
		}
		const mismatch = drop(true); // layer A box vs layer B ground -> tunnels through
		const match = drop(false); // layer B box vs layer B ground -> rests on top
		expect(mismatch).toBeGreaterThan(30);
		expect(match).toBeGreaterThan(9.5);
		expect(match).toBeLessThan(12);
	});

	it("E. a contact-driven trigger fires (emitter hit rotates a triggered joint)", () => {
		setPhysicsBackend(backend);
		const base = new Rectangle(0, 0, 2, 2);
		base.isStatic = true;
		const arm = new Rectangle(2, 0, 2, 2);
		const joint = new RevoluteJoint(base, arm, 2, 1);
		joint.enableMotor = true;
		joint.motorSpeed = 10;
		joint.motorStrength = 15;
		joint.triggerList = "go";

		const ground = new Rectangle(-2, 12, 6, 2);
		ground.isStatic = true;
		const emitter = new Rectangle(-1, 6, 1, 1);
		emitter.triggerName = "go";
		emitter.triggerAction = TRIGGER_ROTATECW;
		emitter.onGroundHit = true;

		const core = coreWith([base, arm, joint, ground, emitter]);
		core.dispatch({ type: "play" });
		const a0 = pose(arm).angle;
		core.dispatch({ type: "step", frames: 150 });
		const a1 = pose(arm).angle;
		// The polled begin-touch event fired the "go" trigger -> motor -> rotation.
		expect(Math.abs(a1 - a0)).toBeGreaterThan(1.0);
	});

	it("F. the same motored bot stays stable under BOTH engines (need not match numerically)", () => {
		function runArm(be: PhysicsBackend): number {
			setPhysicsBackend(be);
			const base = new Rectangle(0, 0, 2, 2);
			base.isStatic = true;
			const arm = new Rectangle(2, 0, 2, 2);
			const joint = new RevoluteJoint(base, arm, 2, 1);
			joint.enableMotor = true;
			joint.autoCW = true;
			joint.motorSpeed = 10;
			joint.motorStrength = 15;
			const core = coreWith([base, arm, joint]);
			core.dispatch({ type: "play" });
			core.dispatch({ type: "step", frames: 90 });
			return pose(arm).angle;
		}
		const e0 = runArm(box2d20Backend);
		const e2 = runArm(backend);
		expect(Number.isFinite(e0)).toBe(true);
		expect(Number.isFinite(e2)).toBe(true);
		expect(Math.abs(e0)).toBeGreaterThan(1.0);
		expect(Math.abs(e2)).toBeGreaterThan(1.0);
	});
});
