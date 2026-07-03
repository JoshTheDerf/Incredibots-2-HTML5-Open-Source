// E3-1 — Box2D v3 (box2d3-wasm compat build) engine-2 smoke test.
//
// Proves the async wasm module loads under vitest's node environment and that
// the Box2D3Backend adapter simulates through the SAME PhysicsBackend seam +
// SAME plain-data 2.0 b2*Def objects that engines 0/1 consume: a dynamic box
// dropped onto a static ground box falls under gravity and comes to rest on top
// of it with near-zero velocity. Mirrors test/box2d21-smoke.test.ts's shape A
// and tolerances (ground top at y=9, 1x1 box centre rests ~8.5).
//
// Coordinate convention matches IncrediBots / Box2DFlash: +y is DOWN, gravity
// is (0, +g). The module load is async (await in beforeAll); every backend call
// is then synchronous. Runs in the default vitest node environment (the config
// is node-wide) — the compat build resolves + instantiates its .wasm headless.

import { beforeAll, describe, expect, it } from "vitest";
import { b2BodyDef, b2MassData, b2PolygonDef } from "../src/Box2D";
import { Box2D3Backend } from "../src/enginebox2d3/Box2D3Backend";
import { loadBox2D3 } from "../src/enginebox2d3/loadBox2D3";

let backend: Box2D3Backend;

beforeAll(async () => {
	const module = await loadBox2D3();
	backend = new Box2D3Backend(module);
});

function boxDef(halfW: number, halfH: number, density: number): b2PolygonDef {
	const pd = new b2PolygonDef();
	pd.SetAsBox(halfW, halfH);
	pd.density = density;
	pd.friction = 0.3;
	pd.restitution = 0.0;
	return pd;
}

describe("Box2D v3 (engine 2) backend", () => {
	it("a dynamic box falls under gravity and rests on the ground", () => {
		const world = backend.createWorld({
			lowerX: -1000,
			lowerY: -1000,
			upperX: 1000,
			upperY: 1000,
			gravityX: 0,
			gravityY: 10,
			doSleep: true,
		});

		// Static ground box centred at y=10, half-height 1 => top surface at y=9.
		// Built as the 2.0 model does: dynamic body + zero-mass setMass -> static.
		const groundBd = new b2BodyDef();
		groundBd.position.Set(0, 10);
		const ground = backend.createBody(world, groundBd);
		backend.createShape(ground, boxDef(50, 1, 0));
		backend.setMass(ground, new b2MassData()); // mass 0 => static

		expect(backend.bodyIsStatic(ground)).toBe(true);

		// Dynamic 1x1 box starting well above the ground (smaller y = higher up).
		const boxBd = new b2BodyDef();
		boxBd.position.Set(0, 0);
		const box = backend.createBody(world, boxBd);
		backend.createShape(box, boxDef(0.5, 0.5, 1));
		backend.setMassFromShapes(box); // density 1 * 1x1 area => mass ~1

		for (let i = 0; i < 180; i++) backend.step(world, 1 / 60, 10);

		const t = backend.bodyTransform(box);
		const v = backend.bodyVelocity(box);

		// Box bottom rests on ground top (y=9) => centre ~= 8.5.
		expect(t.y).toBeGreaterThan(8.0);
		expect(t.y).toBeLessThan(9.0);
		expect(Math.abs(v.y)).toBeLessThan(0.05);

		// queryAABB over the whole world finds both shapes (array-fill contract).
		const out: ReturnType<typeof backend.createShape>[] = [];
		const found = backend.queryAABB(world, -100, -100, 100, 100, out, 16);
		expect(found).toBe(2);

		backend.destroyBody(world, box);
		backend.destroyBody(world, ground);
	});
});
