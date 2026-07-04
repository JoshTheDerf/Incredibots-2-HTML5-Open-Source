// Regression test for the engine-2 (Box2D v3 / box2d3-wasm) RENDER path.
//
// The E3 phase only ever exercised the headless SIM (drive parts through the
// backend); the pixi RENDERER was never run under engine 2. The renderer reads
// live physics handles with Box2D 2.0.2 method NAMES that the v3 value-handles
// don't have:
//   - RenderInterpolator.snapshot walks world.GetBodyList()/GetNext() — but v3's
//     world is a raw value-handle with NO body-enumeration API (the reported
//     "e.GetBodyList is not a function" crash on Play).
//   - Draw.DrawShape/DrawCannon read shape.m_type + GetRadius/GetLocalPosition/
//     GetVertexCount/GetVertices; Draw's cannonball path reads body.GetShapeList().
//
// The fix: enumerate bodies through the backend seam (forEachBody), and give the
// v3 body/shape wrappers the b2Shape/b2Body read surface Draw needs (geometry
// captured from the def, so it matches engines 0/1 verbatim).
//
// This reproduces the EXACT reads the renderer makes, without pixi, and asserts
// none throw and the geometry is sane. Guards the whole engine-2 render path.

import { beforeAll, afterEach, describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { box2d20Backend } from "../src/core/physics";
import { Box2D3Backend } from "../src/enginebox2d3/Box2D3Backend";
import { loadBox2D3 } from "../src/enginebox2d3/loadBox2D3";
import type { Part } from "../src/Parts/Part";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { Cannon } from "../src/Parts/Cannon";
import { getPhysicsBackend, setPhysicsBackend } from "../src/Parts/partGlobals";
import { b2Shape } from "../src/Box2D";

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

// The same fixture/shape resolution Draw.resolveShape performs at the read
// boundary: a handle with a defined m_type is a ready-to-read shape.
function resolveShape(handle: any): any {
	return handle && handle.m_type === undefined && typeof handle.GetShape === "function"
		? handle.GetShape()
		: handle;
}

describe("engine 2 (Box2D v3) renderer reads do not throw", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	it("backend.forEachBody enumerates live bodies (the GetBodyList crash site)", () => {
		setPhysicsBackend(backend);
		const box = new Circle(0, 0, 1, false);
		const ground = new Rectangle(-4, 10, 8, 2);
		ground.isStatic = true;
		const core = coreWith([box, ground]);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 5 });

		// RenderInterpolator.snapshot's exact enumeration — must NOT touch a
		// GetBodyList on the raw v3 world; forEachBody drives it instead.
		const seen: unknown[] = [];
		getPhysicsBackend().forEachBody(core.state.world as never, (b) => seen.push(b));
		expect(seen.length).toBe(2); // the two part bodies
		// The bodies enumerated are the SAME handles Draw passes to getXForm.
		expect(seen).toContain(box.GetBody());
		expect(seen).toContain(ground.GetBody());
	});

	it("body.GetXForm() returns a {position,R} transform for the interpolator fallback", () => {
		setPhysicsBackend(backend);
		const box = new Circle(0, 0, 1, false);
		const core = coreWith([box]);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 5 });

		const body: any = box.GetBody();
		expect(typeof body.GetXForm).toBe("function");
		const xf = body.GetXForm();
		expect(Number.isFinite(xf.position.x)).toBe(true);
		expect(Number.isFinite(xf.position.y)).toBe(true);
		expect(Number.isFinite(xf.R.col1.x)).toBe(true);
		expect(Number.isFinite(xf.R.col2.y)).toBe(true);
	});

	it("a circle shape resolves to a b2Shape the DrawShape circle path reads", () => {
		setPhysicsBackend(backend);
		const circle = new Circle(0, 0, 1.5, false);
		const core = coreWith([circle]);
		core.dispatch({ type: "play" });

		const s = resolveShape(circle.GetShape());
		expect(s.m_type).toBe(b2Shape.e_circleShape);
		expect(s.GetRadius()).toBeCloseTo(1.5, 5);
		expect(Number.isFinite(s.GetLocalPosition().x)).toBe(true);
		expect(Number.isFinite(s.GetLocalPosition().y)).toBe(true);
		expect(typeof s.GetUserData()).toBe("object");
	});

	it("a rectangle shape resolves to a b2Shape the DrawShape polygon path reads", () => {
		setPhysicsBackend(backend);
		const rect = new Rectangle(0, 0, 2, 2);
		const core = coreWith([rect]);
		core.dispatch({ type: "play" });

		const s = resolveShape(rect.GetShape());
		expect(s.m_type).toBe(b2Shape.e_polygonShape);
		const n = s.GetVertexCount();
		expect(n).toBeGreaterThanOrEqual(3);
		const verts = s.GetVertices();
		expect(verts.length).toBeGreaterThanOrEqual(n);
		for (let i = 0; i < n; i++) {
			expect(Number.isFinite(verts[i].x)).toBe(true);
			expect(Number.isFinite(verts[i].y)).toBe(true);
		}
	});

	it("a cannon's shape reads as a 4-vertex polygon (DrawCannon path)", () => {
		setPhysicsBackend(backend);
		const cannon = new Cannon(0, 0, 1);
		const core = coreWith([cannon]);
		core.dispatch({ type: "play" });

		const s = resolveShape(cannon.GetShape());
		expect(s.m_type).toBe(b2Shape.e_polygonShape);
		expect(s.GetVertexCount()).toBeGreaterThanOrEqual(4);
		expect(s.GetVertices().length).toBeGreaterThanOrEqual(4);
	});

	it("body.GetShapeList() resolves to a readable shape (cannonball render path)", () => {
		setPhysicsBackend(backend);
		const box = new Circle(0, 0, 1, false);
		const core = coreWith([box]);
		core.dispatch({ type: "play" });

		const body: any = box.GetBody();
		expect(typeof body.GetShapeList).toBe("function");
		const shape = resolveShape(body.GetShapeList());
		expect(shape.m_type).toBe(b2Shape.e_circleShape);
		expect(Number.isFinite(shape.GetRadius())).toBe(true);
	});
});
