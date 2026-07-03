// Regression: every part type must transition to a RUNNING sim under engine 1
// (Box2D 2.1a) through the full GameCore.handlePlay path. handlePlay has no
// try/catch and sets phase="running" only AFTER building the world + Init'ing
// every part, so ANY part-Init throw under engine 1 aborts the transition and
// leaves the sim stuck in "editing" (visible as "play does nothing, joints
// still drawn"). This guards against that class of bug — notably the prismatic
// (sliding) joint double-`super(def)` port artifact in Box2D21 b2PrismaticJoint,
// which engine21-sim (revolute-only) never exercised.

import { afterEach, describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import type { Part } from "../src/Parts/Part";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { Triangle } from "../src/Parts/Triangle";
import { Polygon } from "../src/Parts/Polygon";
import { Cannon } from "../src/Parts/Cannon";
import { FixedJoint } from "../src/Parts/FixedJoint";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { PrismaticJoint } from "../src/Parts/PrismaticJoint";
import { Thrusters } from "../src/Parts/Thrusters";
import { b2Vec2 } from "../src/Box2D";
import { setPhysicsBackend } from "../src/Parts/partGlobals";
import { box2d20Backend, box2d21Backend } from "../src/core/physics";

function playParts(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	const core = new GameCore(state);
	core.dispatch({ type: "play" }); // throws here (no try/catch) if any Init fails
	return core;
}

describe("engine 1 (Box2D 2.1a): every part type reaches a running sim on play", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	const cases: Array<[string, () => Part[]]> = [
		["circle", () => [new Circle(0, 0, 1, false)]],
		["rectangle", () => [new Rectangle(0, 0, 2, 2)]],
		["triangle", () => [new Triangle(0, 0, 2, 0, 1, 2)]],
		["polygon", () => [new Polygon([new b2Vec2(0, 0), new b2Vec2(2, 0), new b2Vec2(2, 2), new b2Vec2(0, 2)], false)]],
		["cannon", () => [new Cannon(0, 0, 1)]],
		["thruster", () => { const a = new Rectangle(0, 0, 2, 2); return [a, new Thrusters(a, 0, 0)]; }],
		["fixed joint", () => { const a = new Rectangle(0, 0, 2, 2); const b = new Rectangle(2, 0, 2, 2); return [a, b, new FixedJoint(a, b, 1, 0)]; }],
		["revolute joint", () => { const a = new Rectangle(0, 0, 2, 2); const b = new Rectangle(0, 3, 2, 2); return [a, b, new RevoluteJoint(a, b, 0, 1.5)]; }],
		["prismatic joint", () => { const a = new Rectangle(0, 0, 2, 2); const b = new Rectangle(0, 4, 2, 2); return [a, b, new PrismaticJoint(a, b, 0, 1, 0, 3)]; }],
	];

	for (const [name, make] of cases) {
		it(`${name} plays under engine 1`, () => {
			setPhysicsBackend(box2d21Backend as never);
			const core = playParts(make());
			expect(core.state.sim.phase).toBe("running");
			core.dispatch({ type: "step", frames: 10 });
			expect(core.state.sim.phase).toBe("running");
		});
	}
});
