// Regression test for the engine-1 (Box2D 2.1a) RENDER crash:
// "TypeError: body.GetXForm is not a function" thrown by src/Game/Draw.ts the
// first frame after Play when a design runs on physicsEngine=1.
//
// The physics SEAM made construction/sim/water engine-agnostic, but the pixi
// renderer (Draw.ts + b2DebugDraw base) reads LIVE physics handles using
// Box2D 2.0.2 method NAMES (GetXForm, joint GetBody1/GetAnchor1, body
// GetShapeList/GetWorldPoint) and treats a part's shape handle as a b2Shape.
// Under engine 1 those handles are src/Box2D21 objects (fixtures, 2.1a names),
// so the reads threw. The fix adds 2.0-compat read aliases to the Box2D21
// body/joint types and resolves a fixture handle to its b2Shape in Draw.
//
// This reproduces the EXACT reads the renderer makes, without pixi, and asserts
// none throw and the shapes are sane. It is the guard against the reported bug.

import { afterEach, describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import type { Part } from "../src/Parts/Part";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { setPhysicsBackend } from "../src/Parts/partGlobals";
import { box2d20Backend, box2d21Backend } from "../src/core/physics";
import { b2Shape } from "../src/Box2D";
import { b2Vec2 } from "../src/Box2D";

function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

// The same fixture->shape resolution Draw.resolveShape performs at the read
// boundary (a fixture has no m_type field but exposes GetShape()).
function resolveShape(handle: any): any {
	return handle && handle.m_type === undefined && typeof handle.GetShape === "function"
		? handle.GetShape()
		: handle;
}

describe("engine 1 (Box2D 2.1a) renderer reads do not throw", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	it("body.GetXForm() returns a {position,R} transform (the reported crash site)", () => {
		setPhysicsBackend(box2d21Backend);
		const box = new Circle(0, 0, 1, false);
		const core = coreWith([box]);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 5 });

		const body: any = box.GetBody();
		// RenderXForm's raw fallback: body.GetXForm() must exist and be b2XForm-shaped.
		const xf = body.GetXForm();
		expect(typeof body.GetXForm).toBe("function");
		expect(Number.isFinite(xf.position.x)).toBe(true);
		expect(Number.isFinite(xf.position.y)).toBe(true);
		expect(Number.isFinite(xf.R.col1.x)).toBe(true);
		expect(Number.isFinite(xf.R.col2.y)).toBe(true);
	});

	it("a part's shape handle resolves to a b2Shape the geometry readers understand", () => {
		setPhysicsBackend(box2d21Backend);
		const circle = new Circle(0, 0, 1.5, false);
		const rect = new Rectangle(5, 0, 2, 2);
		const core = coreWith([circle, rect]);
		core.dispatch({ type: "play" });

		// DrawShape path: GetShape() returns a fixture under engine 1; resolveShape
		// must yield a b2Shape exposing m_type + the per-type geometry Draw reads.
		const cShape = resolveShape(circle.GetShape());
		expect(cShape.m_type).toBe(b2Shape.e_circleShape);
		expect(Number.isFinite(cShape.GetRadius())).toBe(true);
		expect(Number.isFinite(cShape.GetLocalPosition().x)).toBe(true);

		const rShape = resolveShape(rect.GetShape());
		expect(rShape.m_type).toBe(b2Shape.e_polygonShape);
		expect(rShape.GetVertexCount()).toBeGreaterThanOrEqual(3);
		expect(rShape.GetVertices().length).toBeGreaterThanOrEqual(3);

		// DrawShape reads shape.GetUserData().outline/terrain/isBomb on the RESOLVED
		// shape. 2.1a keeps userData on the fixture (b2Shape has none), so without
		// the backend mirroring it onto the shape the renderer throws every frame
		// ("GetUserData is not a function", then null.outline) — freezing the sim.
		expect(typeof cShape.GetUserData).toBe("function");
		expect(cShape.GetUserData()).not.toBeNull();
		expect(typeof cShape.GetUserData()).toBe("object");
		expect(rShape.GetUserData()).not.toBeNull();
		expect(typeof rShape.GetUserData()).toBe("object");
	});

	it("body.GetShapeList() (cannonball path) resolves to a readable shape", () => {
		setPhysicsBackend(box2d21Backend);
		const box = new Circle(0, 0, 1, false);
		const core = coreWith([box]);
		core.dispatch({ type: "play" });

		const body: any = box.GetBody();
		const handle = body.GetShapeList(); // Draw passes this straight to DrawShape
		const shape = resolveShape(handle);
		expect(shape.m_type).toBe(b2Shape.e_circleShape);
		expect(Number.isFinite(shape.GetRadius())).toBe(true);
	});

	it("DrawJoint reads (GetBody1/2, GetAnchor1/2, GetType, GetWorldPoint out-param) do not throw", () => {
		setPhysicsBackend(box2d21Backend);
		const a = new Rectangle(0, 0, 2, 2);
		const b = new Rectangle(0, 3, 2, 2);
		const rj = new RevoluteJoint(a, b, 0, 1.5);
		const core = coreWith([a, b, rj]);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 3 });

		const joint: any = (rj as any).m_joint;
		expect(joint).toBeTruthy();
		// The exact reads DrawJoint performs on a live b2 joint under engine 1.
		const b1 = joint.GetBody1();
		const b2 = joint.GetBody2();
		expect(typeof b1.GetXForm).toBe("function");
		expect(Number.isFinite(b1.GetXForm().position.x)).toBe(true);
		expect(Number.isFinite(b2.GetXForm().position.y)).toBe(true);
		expect(Number.isFinite(joint.GetAnchor1().x)).toBe(true);
		expect(Number.isFinite(joint.GetAnchor2().y)).toBe(true);
		expect(typeof joint.GetType()).toBe("number");

		// GetWorldPoint must FILL the supplied out vector (2.0 signature the
		// prismatic-joint render path relies on), not just return a fresh one.
		const out = new b2Vec2();
		const ret = b1.GetWorldPoint(new b2Vec2(0.5, 0.5), out);
		expect(ret).toBe(out);
		expect(Number.isFinite(out.x)).toBe(true);
		expect(Number.isFinite(out.y)).toBe(true);
	});
});
