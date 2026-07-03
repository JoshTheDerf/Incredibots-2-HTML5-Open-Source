// Box2D20Backend — engine 0 (Box2DFlash 2.0.2 TS port in src/Box2D).
//
// A THIN wrapper: every method delegates 1:1 to the existing b2World/b2Body
// calls the parts + GameCore used to make directly, so routing through the
// backend is byte-identical to the pre-seam code (same bodies, same order,
// same fixtures/userData). Near-zero overhead. This is the ONLY backend wired
// in P1.5b-1; engines 1/2 land in later sub-phases.

import { b2AABB, b2Vec2, b2World } from "../../Box2D";
import type { b2Body, b2BodyDef, b2JointDef, b2Joint, b2MassData, b2Shape, b2ShapeDef } from "../../Box2D";
import type { BodyTransform, PhysicsBackend, Vec2Like, WorldDef } from "./PhysicsBackend";

export class Box2D20Backend implements PhysicsBackend<b2World, b2Body, b2Shape, b2Joint> {
	createWorld(def: WorldDef): b2World {
		const aabb = new b2AABB();
		aabb.lowerBound.Set(def.lowerX, def.lowerY);
		aabb.upperBound.Set(def.upperX, def.upperY);
		return new b2World(aabb, new b2Vec2(def.gravityX, def.gravityY), def.doSleep);
	}

	step(world: b2World, dt: number, iterations: number): void {
		world.Step(dt, iterations);
	}

	createBody(world: b2World, bodyDef: b2BodyDef): b2Body {
		return world.CreateBody(bodyDef);
	}

	createShape(body: b2Body, shapeDef: b2ShapeDef): b2Shape {
		return body.CreateShape(shapeDef);
	}

	destroyShape(body: b2Body, shape: b2Shape): void {
		body.DestroyShape(shape);
	}

	setMass(body: b2Body, massData: b2MassData): void {
		body.SetMass(massData);
	}

	setMassFromShapes(body: b2Body): void {
		body.SetMassFromShapes();
	}

	createJoint(world: b2World, jointDef: b2JointDef): b2Joint {
		return world.CreateJoint(jointDef);
	}

	destroyBody(world: b2World, body: b2Body): void {
		world.DestroyBody(body);
	}

	destroyJoint(world: b2World, joint: b2Joint): void {
		world.DestroyJoint(joint);
	}

	queryAABB(
		world: b2World,
		lowerX: number,
		lowerY: number,
		upperX: number,
		upperY: number,
		out: b2Shape[],
		maxCount: number,
	): number {
		const aabb = new b2AABB();
		aabb.lowerBound.Set(lowerX, lowerY);
		aabb.upperBound.Set(upperX, upperY);
		return world.Query(aabb, out, maxCount);
	}

	applyForce(body: b2Body, force: Vec2Like, point: Vec2Like): void {
		body.ApplyForce(force as b2Vec2, point as b2Vec2);
	}

	applyImpulse(body: b2Body, impulse: Vec2Like, point: Vec2Like): void {
		body.ApplyImpulse(impulse as b2Vec2, point as b2Vec2);
	}

	bodyVelocity(body: b2Body): Vec2Like {
		const v = body.GetLinearVelocity();
		return { x: v.x, y: v.y };
	}

	bodyTransform(body: b2Body): BodyTransform {
		const p = body.GetPosition();
		return { x: p.x, y: p.y, angle: body.GetAngle() };
	}
}

/** The process-wide engine-0 backend singleton (stateless; safe to share). */
export const box2d20Backend = new Box2D20Backend();
