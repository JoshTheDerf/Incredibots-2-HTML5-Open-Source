// P1.5a — standalone Box2DFlash 2.1alpha engine (src/Box2D21) smoke tests.
//
// Exercises ONLY the src/Box2D21 public API (barrel index) to prove the ported
// engine actually simulates:
//   A. gravity + contact/solver: a dynamic box dropped onto a static ground box
//      falls and comes to rest on top of it with near-zero velocity.
//   B. buoyancy controller: a dynamic box dropped into a fluid (no ground)
//      floats near the surface instead of falling through forever.
//
// Coordinate convention matches IncrediBots / Box2DFlash: +y is DOWN, gravity is
// (0, +g). A buoyancy surface normal of (0,-1) points up out of the fluid, so the
// submerged region is y > offset-plane (the deeper side).

import { describe, expect, it } from "vitest";
import {
	b2Body,
	b2BodyDef,
	b2BuoyancyController,
	b2FixtureDef,
	b2PolygonShape,
	b2Vec2,
	b2World,
} from "../src/Box2D21";

function makeBoxFixtureDef(halfW: number, halfH: number, density: number): b2FixtureDef {
	const shape = new b2PolygonShape();
	shape.SetAsBox(halfW, halfH);
	const fd = new b2FixtureDef();
	fd.shape = shape;
	fd.density = density;
	fd.friction = 0.3;
	fd.restitution = 0.0;
	return fd;
}

describe("Box2D 2.1a standalone engine", () => {
	it("A. a dynamic box falls under gravity and rests on the ground", () => {
		const world = new b2World(new b2Vec2(0, 10), true);

		// Static ground box centred at y=10, half-height 1 => top surface at y=9.
		const groundDef = new b2BodyDef();
		groundDef.type = b2Body.b2_staticBody;
		groundDef.position.Set(0, 10);
		const ground = world.CreateBody(groundDef)!;
		ground.CreateFixture(makeBoxFixtureDef(50, 1, 0));

		// Dynamic 1x1 box starting well above the ground (smaller y = higher up).
		const boxDef = new b2BodyDef();
		boxDef.type = b2Body.b2_dynamicBody;
		boxDef.position.Set(0, 0);
		const box = world.CreateBody(boxDef)!;
		box.CreateFixture(makeBoxFixtureDef(0.5, 0.5, 1));

		expect(box.GetMass()).toBeCloseTo(1, 5); // 1x1 area * density 1

		for (let i = 0; i < 180; i++) {
			world.Step(1 / 60, 10, 10);
			world.ClearForces();
		}

		const y = box.GetPosition().y;
		const vy = box.GetLinearVelocity().y;

		// Box bottom rests on ground top (y=9) => centre ~= 8.5.
		expect(y).toBeGreaterThan(8.0);
		expect(y).toBeLessThan(9.0);
		expect(Math.abs(vy)).toBeLessThan(0.05);
	});

	it("B. buoyancy makes a dynamic box float near the fluid surface", () => {
		const world = new b2World(new b2Vec2(0, 10), true);
		// NOTE: deliberately NO ground body. If buoyancy did nothing the box would
		// fall forever (y -> +inf), so a bounded resting y proves it floats.

		const boxDef = new b2BodyDef();
		boxDef.type = b2Body.b2_dynamicBody;
		boxDef.position.Set(0, -5); // start above the surface (y=0)
		const box = world.CreateBody(boxDef)!;
		box.CreateFixture(makeBoxFixtureDef(0.5, 0.5, 1)); // body density 1, mass 1

		// Fluid surface at y=0. normal (0,-1) up, offset 0 => submerged region y>0.
		// Fluid density 2 vs body density 1 => equilibrium at half-submerged, i.e.
		// box centre settles at the surface (y ~= 0).
		const bc = new b2BuoyancyController();
		bc.normal.Set(0, -1);
		bc.offset = 0;
		bc.density = 2;
		bc.linearDrag = 2;
		bc.angularDrag = 1;
		bc.useDensity = false;
		bc.useWorldGravity = true;
		world.AddController(bc); // IB3 WaterControl.as:135 uses AddController
		bc.AddBody(box);

		for (let i = 0; i < 600; i++) {
			world.Step(1 / 60, 10, 10);
			world.ClearForces();
		}

		const y = box.GetPosition().y;
		const vy = box.GetLinearVelocity().y;

		expect(Number.isFinite(y)).toBe(true);
		// Floats near the surface (half-submerged equilibrium ~= 0), and crucially
		// has NOT sunk far below it.
		expect(y).toBeGreaterThan(-1.0);
		expect(y).toBeLessThan(1.5);
		expect(Math.abs(vy)).toBeLessThan(0.2);
	});
});
