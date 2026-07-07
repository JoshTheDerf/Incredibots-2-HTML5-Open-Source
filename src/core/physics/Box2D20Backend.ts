// Box2D20Backend — engine 0 (Box2DFlash 2.0.2 TS port in src/Box2D).
//
// A THIN wrapper: every method delegates 1:1 to the existing b2World/b2Body
// calls the parts + GameCore used to make directly, so routing through the
// backend is byte-identical to the pre-seam code (same bodies, same order,
// same fixtures/userData). Near-zero overhead. This is the ONLY backend wired
// in P1.5b-1; engines 1/2 land in later sub-phases.

import { b2AABB, b2BuoyancyController, b2ContactListener, b2Segment, b2TideController, b2Vec2, b2WaveController, b2World } from "../../Box2D";
import type { b2Body, b2BodyDef, b2JointDef, b2Joint, b2MassData, b2Shape, b2ShapeDef, b2XForm } from "../../Box2D";
import { ContactFilter } from "../../Game/ContactFilter";
import type {
	BodyTransform,
	ContactHooks,
	ContactPointLike,
	PhysicsBackend,
	SegmentHit,
	Vec2Like,
	WaterControllerDef,
	WaterSurfaceReadback,
	WorldDef,
} from "./PhysicsBackend";
import { impulseToSpeed, WATER_TYPE_WAVE } from "./PhysicsBackend";

/** The engine-0 water controllers (a tide or a wave; both extend b2BuoyancyController). */
type WaterController20 = b2BuoyancyController | b2WaveController;

export class Box2D20Backend implements PhysicsBackend<b2World, b2Body, b2Shape, b2Joint> {
	createWorld(def: WorldDef): b2World {
		const aabb = new b2AABB();
		aabb.lowerBound.Set(def.lowerX, def.lowerY);
		aabb.upperBound.Set(def.upperX, def.upperY);
		return new b2World(aabb, new b2Vec2(def.gravityX, def.gravityY), def.doSleep);
	}

	/** Engine 20 is pure JS — dropping the last reference is enough (see PhysicsBackend.destroyWorld). */
	destroyWorld(_world: b2World): void {}

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

	setBodyTransform(body: b2Body, x: number, y: number, angle: number): void {
		body.SetXForm(new b2Vec2(x, y), angle);
	}

	shapeLocalCenter(shape: b2Shape): Vec2Like {
		// 2.0.2 b2CircleShape exposes GetLocalPosition(); non-circles have none.
		const s = shape as unknown as { GetLocalPosition?: () => Vec2Like };
		const p = typeof s.GetLocalPosition === "function" ? s.GetLocalPosition() : null;
		return p ? { x: p.x, y: p.y } : { x: 0, y: 0 };
	}

	forEachBody(world: b2World, cb: (body: b2Body) => void): void {
		for (let b: b2Body | null = world.GetBodyList(); b; b = b.GetNext()) cb(b);
	}

	wakeBody(body: b2Body): void {
		body.WakeUp();
	}

	bodyShapeCount(body: b2Body): number {
		return body.m_shapeCount;
	}

	bodyIsStatic(body: b2Body): boolean {
		return body.IsStatic();
	}

	shapeTestPoint(shape: b2Shape, body: b2Body, point: Vec2Like): boolean {
		// 1:1 with the pre-seam bodyAtMouse call: shape.TestPoint(body.GetXForm(), p).
		return shape.TestPoint(body.GetXForm() as b2XForm, point as b2Vec2);
	}

	shapeTestSegment(
		shape: b2Shape,
		body: b2Body,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		maxFraction: number,
	): SegmentHit | null {
		// 1:1 with the pre-seam Bomb ray: shape.TestSegment(xf, lambda[], normal, seg, maxLambda).
		const segment = new b2Segment();
		segment.p1.Set(x1, y1);
		segment.p2.Set(x2, y2);
		const lambda: number[] = [0];
		const normal = new b2Vec2();
		const hit = shape.TestSegment(body.GetXForm() as b2XForm, lambda, normal, segment, maxFraction);
		if (!hit) return null;
		return { lambda: lambda[0], nx: normal.x, ny: normal.y };
	}

	jointAnchorA(joint: b2Joint): Vec2Like {
		const v = (joint as unknown as { GetAnchor1(): Vec2Like }).GetAnchor1();
		return { x: v.x, y: v.y };
	}

	jointAnchorB(joint: b2Joint): Vec2Like {
		const v = (joint as unknown as { GetAnchor2(): Vec2Like }).GetAnchor2();
		return { x: v.x, y: v.y };
	}

	jointBodyA(joint: b2Joint): b2Body {
		return joint.GetBody1();
	}

	jointBodyB(joint: b2Joint): b2Body {
		return joint.GetBody2();
	}

	installContactHandlers(world: b2World, hooks: ContactHooks): void {
		// Byte-identical to the pre-seam GameCore.createWorld wiring: the vendored
		// ContactFilter (honours collide/group flags) plus a b2ContactListener
		// whose Add/Remove hand the contact point straight to the shared hooks.
		// The 2.0 contact point already exposes shape1/shape2 with GetUserData(),
		// so it IS a ContactPointLike as-is.
		world.SetContactFilter(new ContactFilter());
		const listener = new b2ContactListener();
		listener.Add = (point: unknown): void => hooks.onAdd(point as ContactPointLike);
		listener.Remove = (point: unknown): void => hooks.onRemove(point as ContactPointLike);
		// Solved-contact impact report (fracturing). b2Island.Report -> Result gives
		// the world position + normalImpulse applied at each manifold point; convert
		// the impulse to a relative normal speed via the two bodies' reduced mass so
		// the fracture threshold is engine-neutral (see ContactImpact).
		if (hooks.onImpact) {
			const onImpact = hooks.onImpact;
			listener.Result = (cr: {
				shape1: b2Shape;
				shape2: b2Shape;
				position: b2Vec2;
				normalImpulse: number;
			}): void => {
				const speed = impulseToSpeed(cr.normalImpulse, cr.shape1.m_body.GetMass(), cr.shape2.m_body.GetMass());
				if (speed <= 0) return;
				onImpact({
					shape1: cr.shape1,
					shape2: cr.shape2,
					x: cr.position.x,
					y: cr.position.y,
					speed,
				});
			};
		}
		world.SetContactListener(listener);
	}

	// --- water / buoyancy (verbatim move of the pre-seam WaterSystem.init body:
	//     the src/Box2D controllers, built EXACTLY as before so engine-0 water is
	//     behaviour-identical; the tide/wave surface math + density scale arrive
	//     pre-computed on the def) ---
	createWaterController(world: b2World, def: WaterControllerDef): WaterController20 {
		let controller: WaterController20;
		if (def.type === WATER_TYPE_WAVE) {
			const wave = new b2WaveController();
			wave.useDensity = true;
			wave.density = def.density;
			wave.normal.Set(0, -1);
			wave.offset = def.surfaceOffset;
			wave.linearDrag = def.linearDrag;
			wave.angularDrag = def.angularDrag;
			// WaterControl.Init :132 — the fixed continuous generator.
			wave.ContinuousWaves(0, 0, 1, 5, 0.1, 0, "sin");
			controller = wave;
		} else {
			const tide = new b2TideController();
			tide.useDensity = true;
			tide.density = def.density;
			tide.normal.Set(0, -1);
			tide.offset = def.surfaceOffset;
			tide.linearDrag = def.linearDrag;
			tide.angularDrag = def.angularDrag;
			tide.tideFunc = def.tideFunc;
			tide.normalXFunc = def.normalXFunc;
			controller = tide;
		}
		world.AddController(controller);
		return controller;
	}

	addWaterBody(controller: WaterController20, body: b2Body): void {
		controller.AddBody(body);
	}

	waterSurface(controller: WaterController20): WaterSurfaceReadback {
		const waves =
			controller instanceof b2WaveController
				? controller.waves.map((w) => ({
						x: w.position.x,
						amplitude: w.amplitude,
						width: w.width,
						fn: (w.waveFunc === Math.cos ? "cos" : "sin") as "sin" | "cos",
					}))
				: [];
		return { offset: controller.offset, normalX: controller.normal.x, waves };
	}
}

/** The process-wide engine-0 backend singleton (stateless; safe to share). */
export const box2d20Backend = new Box2D20Backend();
