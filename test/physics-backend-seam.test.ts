// P1.5b-1 — the PhysicsBackend seam is real and swappable.
//
// These tests prove GameCore + Part construction genuinely route through a
// PhysicsBackend (not direct b2World/b2Body calls), by swapping in a SPY backend
// that wraps the real engine-0 backend and counting the calls. If the seam were
// bypassed anywhere in the play/step path, the spy would see zero calls.

import { afterEach, describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Rectangle } from "../src/Parts/Rectangle";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import type { Part } from "../src/Parts/Part";
import { getPhysicsBackend, setPhysicsBackend } from "../src/Parts/partGlobals";
import { Box2D20Backend, box2d20Backend } from "../src/core/physics";
import type { PhysicsBackend } from "../src/core/physics";
import type { b2Body, b2Joint, b2Shape, b2World } from "../src/Box2D";

type Backend = PhysicsBackend<b2World, b2Body, b2Shape, b2Joint>;

/** A pass-through spy over the real engine-0 backend that tallies calls. */
class SpyBackend implements Backend {
	readonly counts = { createWorld: 0, createBody: 0, createShape: 0, createJoint: 0, step: 0 };
	constructor(private readonly inner: Backend) {}
	createWorld(def: Parameters<Backend["createWorld"]>[0]) {
		this.counts.createWorld++;
		return this.inner.createWorld(def);
	}
	step(w: b2World, dt: number, it: number) {
		this.counts.step++;
		this.inner.step(w, dt, it);
	}
	createBody(w: b2World, def: Parameters<Backend["createBody"]>[1]) {
		this.counts.createBody++;
		return this.inner.createBody(w, def);
	}
	createShape(b: b2Body, def: Parameters<Backend["createShape"]>[1]) {
		this.counts.createShape++;
		return this.inner.createShape(b, def);
	}
	destroyShape(b: b2Body, s: b2Shape) {
		this.inner.destroyShape(b, s);
	}
	setMass(b: b2Body, m: Parameters<Backend["setMass"]>[1]) {
		this.inner.setMass(b, m);
	}
	setMassFromShapes(b: b2Body) {
		this.inner.setMassFromShapes(b);
	}
	createJoint(w: b2World, def: Parameters<Backend["createJoint"]>[1]) {
		this.counts.createJoint++;
		return this.inner.createJoint(w, def);
	}
	destroyBody(w: b2World, b: b2Body) {
		this.inner.destroyBody(w, b);
	}
	destroyJoint(w: b2World, j: b2Joint) {
		this.inner.destroyJoint(w, j);
	}
	queryAABB(...args: Parameters<Backend["queryAABB"]>) {
		return this.inner.queryAABB(...args);
	}
	applyForce(...args: Parameters<Backend["applyForce"]>) {
		this.inner.applyForce(...args);
	}
	applyImpulse(...args: Parameters<Backend["applyImpulse"]>) {
		this.inner.applyImpulse(...args);
	}
	bodyVelocity(b: b2Body) {
		return this.inner.bodyVelocity(b);
	}
	bodyTransform(b: b2Body) {
		return this.inner.bodyTransform(b);
	}
	// P1.5b-2a per-frame handle ops + contact wiring — plain pass-throughs (this
	// spy only tallies construction/step calls; these keep the interface satisfied).
	wakeBody(b: b2Body) {
		this.inner.wakeBody(b);
	}
	bodyIsStatic(b: b2Body) {
		return this.inner.bodyIsStatic(b);
	}
	shapeTestPoint(...args: Parameters<Backend["shapeTestPoint"]>) {
		return this.inner.shapeTestPoint(...args);
	}
	shapeTestSegment(...args: Parameters<Backend["shapeTestSegment"]>) {
		return this.inner.shapeTestSegment(...args);
	}
	installContactHandlers(...args: Parameters<Backend["installContactHandlers"]>) {
		this.inner.installContactHandlers(...args);
	}
	jointAnchorA(j: b2Joint) {
		return this.inner.jointAnchorA(j);
	}
	jointAnchorB(j: b2Joint) {
		return this.inner.jointAnchorB(j);
	}
	jointBodyA(j: b2Joint) {
		return this.inner.jointBodyA(j);
	}
	jointBodyB(j: b2Joint) {
		return this.inner.jointBodyB(j);
	}
}

function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

describe("PhysicsBackend seam", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	it("defaults to the engine-0 (Box2D 2.0.2) backend", () => {
		expect(getPhysicsBackend()).toBeInstanceOf(Box2D20Backend);
	});

	it("GameCore builds the world + bodies through the injected backend", () => {
		const spy = new SpyBackend(box2d20Backend);
		setPhysicsBackend(spy);

		const core = coreWith([new Rectangle(0, 0, 2, 2)]);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 3 });

		expect(spy.counts.createWorld).toBe(1); // world came from the backend seam
		expect(spy.counts.createBody).toBeGreaterThan(0); // the rect body did too
		expect(spy.counts.createShape).toBeGreaterThan(0);
		expect(spy.counts.step).toBe(6); // 3 frames * 2 sub-steps, all via the backend
	});

	it("joint construction routes through the backend createJoint", () => {
		const r1 = new Rectangle(0, 0, 2, 2);
		const r2 = new Rectangle(3, 0, 2, 2);
		const joint = new RevoluteJoint(r1, r2, 1.5, 1);
		joint.enableMotor = true;
		const spy = new SpyBackend(box2d20Backend);
		setPhysicsBackend(spy);

		const core = coreWith([r1, r2, joint]);
		core.dispatch({ type: "play" });

		expect(spy.counts.createJoint).toBeGreaterThan(0);
	});
});
