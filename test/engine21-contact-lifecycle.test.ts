// Regression: engine 1 (Box2D 2.1a) must survive contacts being CREATED and
// DESTROYED during a sim — the path a real robot/terrain collision drives every
// frame, but which the headless engine-1 sim tests (single resting body) never
// exercised. Two bugs made engine 1 crash/stall the instant a poly/circle (or
// poly/edge) contact was destroyed and pooled:
//
//   b2ContactFactory.Destroy calls contact.Reset() with NO fixtures to clear a
//   pooled contact. b2Contact.Reset guards null, but the b2PolyAndCircleContact /
//   b2PolyAndEdgeContact overrides evaluated `fixtureA.GetType()` inside a
//   b2Assert (the ARGUMENT is always evaluated) -> "Cannot read properties of
//   undefined (reading 'GetType')" thrown inside world.Step. GameCore caught it,
//   so the sim silently stopped advancing (the reported "IB3 stalls out").
//
// This drives a dynamic body onto static terrain through GameCore on the REAL
// engine-1 backend (physicsEngine=1, so applyPlayBackend selects it) and steps
// long enough to fall, collide, rest and sleep — churning the contact pool.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { buildTerrainParts } from "../src/core/sandboxEnvironment";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import type { Part } from "../src/Parts/Part";

function engine1CoreWith(dynamic: Part[]): GameCore {
	const state = createInitialState();
	// physicsEngine=1 -> GameCore.applyPlayBackend selects the 2.1a backend at play.
	state.sandbox = { ...state.sandbox, physicsEngine: 1 };
	const parts = [...buildTerrainParts(state.sandbox), ...dynamic];
	parts.forEach((p, i) => (p.id = i + 1));
	state.parts = parts;
	return new GameCore(state);
}

describe("engine 1 (Box2D 2.1a) contact create/destroy lifecycle", () => {
	it("a dynamic circle colliding with terrain steps hundreds of frames without throwing", () => {
		const core = engine1CoreWith([new Circle(0, -30, 2, false)]);
		core.dispatch({ type: "play" });
		expect(core.getState().sim.phase).toBe("running");
		// Poly(terrain rect)/Circle(ball) contacts get created then destroyed as the
		// ball settles & sleeps; before the fix the first destroy threw in Step.
		expect(() => {
			for (let i = 0; i < 400; i++) core.dispatch({ type: "step" });
		}).not.toThrow();
		expect(core.getState().sim.frame).toBeGreaterThan(300);
	});

	it("a dynamic rectangle (poly/poly + poly/circle contacts) also survives", () => {
		const core = engine1CoreWith([new Rectangle(0, -30, 3, 3)]);
		core.dispatch({ type: "play" });
		expect(() => {
			for (let i = 0; i < 400; i++) core.dispatch({ type: "step" });
		}).not.toThrow();
		expect(core.getState().sim.frame).toBeGreaterThan(300);
	});
});
