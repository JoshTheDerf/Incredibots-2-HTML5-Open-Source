// Regression: the user-drag "mouse" joint works under engine 2 (Box2D v3).
//
// v3 REMOVED b2MouseJoint, so Box2D3Backend.createJoint used to THROW on the
// b2MouseJointDef GameCore builds for pointer-drag — clicking a body during a
// running engine-2 sim did nothing (the dispatch threw). This drives the exact
// mouseJointStart/Move/End command path GameCanvas feeds from pointer events and
// asserts the grabbed body is dragged toward the cursor (our v3 mouse joint is a
// motor joint's linear spring; see Box2D3Backend.createMouse).

import { beforeAll, afterEach, describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { box2d20Backend } from "../src/core/physics";
import { Box2D3Backend } from "../src/enginebox2d3/Box2D3Backend";
import { loadBox2D3 } from "../src/enginebox2d3/loadBox2D3";
import type { Part } from "../src/Parts/Part";
import { Rectangle } from "../src/Parts/Rectangle";
import { getPhysicsBackend, setPhysicsBackend } from "../src/Parts/partGlobals";

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

/** The body's current world centre — the grab point bodyAtMouse's TestPoint accepts. */
function centre(part: { GetBody(): unknown }): { x: number; y: number } {
	const t = getPhysicsBackend().bodyTransform(part.GetBody() as never);
	return { x: t.x, y: t.y };
}

describe("engine 2 (Box2D v3) user-drag mouse joint", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	it("grabs a body and drags it toward the cursor without throwing", () => {
		setPhysicsBackend(backend);
		const box = new Rectangle(0, 0, 2, 2); // body centre ends up at (1,1)
		const core = coreWith([box]);
		core.dispatch({ type: "play" });
		expect(core.state.sim.phase).toBe("running");

		const start = centre(box);
		// Grab at the body centre, then drag far to +x.
		expect(() => core.dispatch({ type: "mouseJointStart", worldX: start.x, worldY: start.y })).not.toThrow();
		const targetX = start.x + 6;
		for (let i = 0; i < 60; i++) {
			core.dispatch({ type: "mouseJointMove", worldX: targetX, worldY: start.y });
			core.dispatch({ type: "step" });
		}

		const draggedX = centre(box).x;
		expect(Number.isFinite(draggedX)).toBe(true);
		// The soft spring pulls the box a long way toward the cursor at +x.
		expect(draggedX).toBeGreaterThan(start.x + 3);

		expect(() => core.dispatch({ type: "mouseJointEnd" })).not.toThrow();
		// After release it is no longer dragged; stepping must stay finite/stable.
		expect(() => core.dispatch({ type: "step", frames: 10 })).not.toThrow();
		expect(Number.isFinite(centre(box).x)).toBe(true);
	});

	it("a second grab after release works (ground body + joint are reusable)", () => {
		setPhysicsBackend(backend);
		const box = new Rectangle(0, 0, 2, 2);
		const core = coreWith([box]);
		core.dispatch({ type: "play" });

		const c0 = centre(box);
		core.dispatch({ type: "mouseJointStart", worldX: c0.x, worldY: c0.y });
		core.dispatch({ type: "mouseJointEnd" });

		// Re-grab at the (unmoved) centre and drag toward -x this time.
		const c1 = centre(box);
		expect(() => core.dispatch({ type: "mouseJointStart", worldX: c1.x, worldY: c1.y })).not.toThrow();
		for (let i = 0; i < 60; i++) {
			core.dispatch({ type: "mouseJointMove", worldX: c1.x - 6, worldY: c1.y });
			core.dispatch({ type: "step" });
		}
		expect(centre(box).x).toBeLessThan(c1.x - 3);
	});
});
