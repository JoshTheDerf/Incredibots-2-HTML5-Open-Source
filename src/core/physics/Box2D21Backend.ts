// Box2D21Backend — engine 1 (Box2DFlash 2.1alpha TS port in src/Box2D21).
//
// P1.5b-2a. Implements the PhysicsBackend seam over the FIXTURE-based 2.1a
// engine. Parts + GameCore build from the SAME plain-data b2*Def objects they
// pass to engine 0 (from src/Box2D); this adapter READS those 2.0 defs and
// mechanically translates them into 2.1a bodies/fixtures/joints. All unit
// conversions (density (v+5)/10, friction/restitution v/40, motor torque/force,
// deg->rad limits) already happened in the shared part code before the def
// reached here, so this adapter copies the converted values verbatim — it does
// NOT re-convert. See the IB3 decompiled Parts/*.as for the ground-truth 2.1a
// build (cited inline); the shared TS part code mirrors that build's SHAPE, and
// this adapter supplies the 2.1a API calls.
//
// KEY 2.1a-vs-2.0 differences handled here:
//  - World: `new b2World(gravity, doSleep)` (no world AABB bounds; 2.1a uses a
//    dynamic tree). Step takes SEPARATE velocity/position iteration counts and
//    does not auto-clear forces, so step() clears them (IB3/2.1a convention;
//    box2d21-smoke.test.ts ClearForces after each Step).
//  - Bodies are typed (b2_staticBody/b2_dynamicBody) at creation. The 2.0 model
//    infers static-ness from a later zero-mass assignment, so createBody makes
//    every body DYNAMIC and setMass(zero) flips it static (IB3 ShapePart
//    AddToBody :211-231: static -> SetMassData(empty); dynamic -> ResetMassData).
//  - Shapes attach as b2Fixtures (b2FixtureDef density/friction/restitution/
//    filter/isSensor/userData) via body.CreateFixture; a b2Fixture IS the shape
//    handle S (so contact fixtures compare == a part's stored GetShape()).
//  - Fixed-joint welds need no joint object: the shared part code re-inits the
//    welded partner onto the SAME body, so createShape simply adds a second
//    fixture (IB3 FixedJoint.as:47-51 stores no physics object; the weld IS the
//    shared body). A TRIGGERED fixed joint still arrives here as a revolute def
//    with zero limits (a locked hinge) so TRIGGER_DESTROY can break it.

import { b2Joint as b2Joint20, b2Shape as b2Shape20 } from "../../Box2D";
import type {
	b2BodyDef,
	b2CircleDef,
	b2JointDef,
	b2MassData,
	b2MouseJointDef,
	b2PolygonDef,
	b2PrismaticJointDef,
	b2RevoluteJointDef,
	b2ShapeDef,
} from "../../Box2D";
import {
	b2AABB,
	b2Body,
	b2BodyDef as b2BodyDef21,
	b2CircleShape,
	b2FixtureDef,
	b2MouseJointDef as b2MouseJointDef21,
	b2PolygonShape,
	b2PrismaticJointDef as b2PrismaticJointDef21,
	b2RayCastInput,
	b2RayCastOutput,
	b2RevoluteJointDef as b2RevoluteJointDef21,
	b2Vec2,
	b2World,
} from "../../Box2D21";
import type { b2Contact, b2Fixture, b2Joint, b2MassData as b2MassData21 } from "../../Box2D21";
import { installBox2D21Contacts } from "./Box2D21Contacts";
import type { BodyTransform, ContactHooks, PhysicsBackend, SegmentHit, Vec2Like, WorldDef } from "./PhysicsBackend";

export class Box2D21Backend implements PhysicsBackend<b2World, b2Body, b2Fixture, b2Joint> {
	createWorld(def: WorldDef): b2World {
		// 2.1a b2World takes gravity + doSleep only — the world AABB bounds (used
		// by 2.0's fixed broad-phase) are obsolete; the dynamic tree grows freely.
		return new b2World(new b2Vec2(def.gravityX, def.gravityY), def.doSleep);
	}

	step(world: b2World, dt: number, iterations: number): void {
		// 2.1a splits velocity/position iterations; feed the single 2.0 count to
		// both (matches box2d21-smoke.test.ts). Clear forces after the step: 2.1a
		// does not auto-clear, and parts re-apply thruster/bomb forces each frame.
		world.Step(dt, iterations, iterations);
		world.ClearForces();
	}

	createBody(world: b2World, bodyDef: b2BodyDef): b2Body {
		const bd = new b2BodyDef21();
		bd.position.Set(bodyDef.position.x, bodyDef.position.y);
		bd.angle = bodyDef.angle;
		bd.fixedRotation = bodyDef.fixedRotation;
		bd.bullet = bodyDef.isBullet; // 2.0 isBullet -> 2.1a bullet
		// Static-ness is unknown at creation in the 2.0 model — it arrives via a
		// later setMass(zero). Create dynamic; setMass flips to static.
		bd.type = b2Body.b2_dynamicBody;
		if (bodyDef.userData != null) bd.userData = bodyDef.userData;
		return world.CreateBody(bd)!;
	}

	createShape(body: b2Body, shapeDef: b2ShapeDef): b2Fixture {
		const fd = new b2FixtureDef();
		// density/friction/restitution are ALREADY converted to Box2D units by the
		// shared part code (Util.Convert*ToBox2D) — copy verbatim, do not re-scale.
		fd.density = shapeDef.density;
		fd.friction = shapeDef.friction;
		fd.restitution = shapeDef.restitution;
		fd.isSensor = shapeDef.isSensor;
		fd.filter.categoryBits = shapeDef.filter.categoryBits;
		fd.filter.maskBits = shapeDef.filter.maskBits;
		fd.filter.groupIndex = shapeDef.filter.groupIndex;
		if (shapeDef.userData != null) fd.userData = shapeDef.userData;

		if (shapeDef.type === b2Shape20.e_circleShape) {
			// IB3 CirclePart.as:47-70 — b2CircleShape(radius) + m_p = local offset.
			const cd = shapeDef as b2CircleDef;
			const circle = new b2CircleShape(cd.radius);
			circle.m_p.Set(cd.localPosition.x, cd.localPosition.y);
			fd.shape = circle;
		} else {
			// IB3 PolygonPart.as:33-64 — b2PolygonShape.SetAsVector(verts, count).
			// The shared part code already re-based the verts against the body
			// origin, exactly as IB3's param2!=null (shared-body) branch does.
			const pd = shapeDef as b2PolygonDef;
			const poly = new b2PolygonShape();
			const verts: b2Vec2[] = [];
			for (let i = 0; i < pd.vertexCount; i++) verts.push(new b2Vec2(pd.vertices[i].x, pd.vertices[i].y));
			poly.SetAsVector(verts, pd.vertexCount);
			fd.shape = poly;
		}
		// CreateFixture auto-computes mass when density>0 AND the body is dynamic
		// (IB3 b2Body.as:183-207); setMass/setMassFromShapes finalize below.
		return body.CreateFixture(fd)!;
	}

	destroyShape(body: b2Body, shape: b2Fixture): void {
		body.DestroyFixture(shape);
	}

	setMass(body: b2Body, massData: b2MassData): void {
		// The 2.0 parts call setMass only to make a body STATIC (a fresh zero-mass
		// b2MassData). 2.1a expresses that as a type change (IB3 AddToBody :219 ->
		// SetType(static), which zeroes mass + velocity internally). A non-zero
		// mass (not used by the current parts) is applied as-is for completeness.
		if (!massData.mass) {
			body.SetType(b2Body.b2_staticBody);
			return;
		}
		const md = massData as unknown as b2MassData21;
		body.SetMassData(md);
	}

	setMassFromShapes(body: b2Body): void {
		// 2.0 SetMassFromShapes == 2.1a ResetMassData (recompute from fixtures).
		body.ResetMassData();
	}

	createJoint(world: b2World, jointDef: b2JointDef): b2Joint {
		const type = jointDef.type;
		if (type === b2Joint20.e_revoluteJoint) {
			// IB3 RotatingJoint.as:78-133. The shared part code already called the
			// 2.0 def's Initialize (localAnchor1/2 + referenceAngle via the bodies'
			// GetLocalPoint/GetAngle, which the 2.1a bodies also expose) — copy the
			// computed anchors straight across (2.0 "1/2" -> 2.1a "A/B").
			const s = jointDef as b2RevoluteJointDef;
			const d = new b2RevoluteJointDef21();
			d.bodyA = s.body1 as unknown as b2Body;
			d.bodyB = s.body2 as unknown as b2Body;
			d.localAnchorA.Set(s.localAnchor1.x, s.localAnchor1.y);
			d.localAnchorB.Set(s.localAnchor2.x, s.localAnchor2.y);
			d.referenceAngle = s.referenceAngle;
			d.enableMotor = s.enableMotor;
			d.maxMotorTorque = s.maxMotorTorque;
			d.motorSpeed = s.motorSpeed;
			d.enableLimit = s.enableLimit;
			d.lowerAngle = s.lowerAngle;
			d.upperAngle = s.upperAngle;
			d.collideConnected = s.collideConnected;
			return world.CreateJoint(d);
		}
		if (type === b2Joint20.e_prismaticJoint) {
			// IB3 SlidingJoint.as:187-324 sets bodyA/bodyB/localAnchorA/B/localAxisA
			// directly (no Initialize); the shared part code's Initialize populated
			// the same fields on the 2.0 def, so mirror them.
			const s = jointDef as b2PrismaticJointDef;
			const d = new b2PrismaticJointDef21();
			d.bodyA = s.body1 as unknown as b2Body;
			d.bodyB = s.body2 as unknown as b2Body;
			d.localAnchorA.Set(s.localAnchor1.x, s.localAnchor1.y);
			d.localAnchorB.Set(s.localAnchor2.x, s.localAnchor2.y);
			d.localAxisA.Set(s.localAxis1.x, s.localAxis1.y);
			d.referenceAngle = s.referenceAngle;
			d.enableMotor = s.enableMotor;
			d.maxMotorForce = s.maxMotorForce;
			d.motorSpeed = s.motorSpeed;
			d.enableLimit = s.enableLimit;
			d.lowerTranslation = s.lowerTranslation;
			d.upperTranslation = s.upperTranslation;
			d.collideConnected = s.collideConnected;
			return world.CreateJoint(d);
		}
		if (type === b2Joint20.e_mouseJoint) {
			// User-drag mouse joint. 2.1a is a soft constraint (frequencyHz +
			// dampingRatio, no timeStep) — the 2.0 def carries both, so copy them.
			const s = jointDef as b2MouseJointDef;
			const d = new b2MouseJointDef21();
			d.bodyA = s.body1 as unknown as b2Body;
			d.bodyB = s.body2 as unknown as b2Body;
			d.target.Set(s.target.x, s.target.y);
			d.maxForce = s.maxForce;
			d.frequencyHz = s.frequencyHz;
			d.dampingRatio = s.dampingRatio;
			return world.CreateJoint(d);
		}
		throw new Error(`Box2D21Backend: unsupported joint type ${type}`);
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
		out: b2Fixture[],
		maxCount: number,
	): number {
		// 2.1a QueryAABB is callback-based (fixture -> continue?); collect into
		// `out` (fixtures ARE the shape handles) until maxCount, like 2.0's
		// world.Query filling a shape array.
		const aabb = new b2AABB();
		aabb.lowerBound.Set(lowerX, lowerY);
		aabb.upperBound.Set(upperX, upperY);
		let count = 0;
		world.QueryAABB((fixture: b2Fixture): boolean => {
			if (count >= maxCount) return false;
			out[count++] = fixture;
			return true;
		}, aabb);
		return count;
	}

	applyForce(body: b2Body, force: Vec2Like, point: Vec2Like): void {
		body.ApplyForce(new b2Vec2(force.x, force.y), new b2Vec2(point.x, point.y));
	}

	applyImpulse(body: b2Body, impulse: Vec2Like, point: Vec2Like): void {
		body.ApplyImpulse(new b2Vec2(impulse.x, impulse.y), new b2Vec2(point.x, point.y));
	}

	bodyVelocity(body: b2Body): Vec2Like {
		const v = body.GetLinearVelocity();
		return { x: v.x, y: v.y };
	}

	bodyTransform(body: b2Body): BodyTransform {
		const p = body.GetPosition();
		return { x: p.x, y: p.y, angle: body.GetAngle() };
	}

	wakeBody(body: b2Body): void {
		body.SetAwake(true);
	}

	bodyIsStatic(body: b2Body): boolean {
		return body.GetType() === b2Body.b2_staticBody;
	}

	shapeTestPoint(shape: b2Fixture, _body: b2Body, point: Vec2Like): boolean {
		// b2Fixture.TestPoint reads its own body transform (b2Fixture.as:137-139).
		return shape.TestPoint(new b2Vec2(point.x, point.y));
	}

	shapeTestSegment(
		shape: b2Fixture,
		_body: b2Body,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		maxFraction: number,
	): SegmentHit | null {
		// 2.1a b2Fixture.RayCast(output, input) replaces 2.0 b2Shape.TestSegment.
		const input = new b2RayCastInput(new b2Vec2(x1, y1), new b2Vec2(x2, y2), maxFraction);
		const output = new b2RayCastOutput();
		if (!shape.RayCast(output, input)) return null;
		return { lambda: output.fraction, nx: output.normal.x, ny: output.normal.y };
	}

	jointAnchorA(joint: b2Joint): Vec2Like {
		const v = (joint as unknown as { GetAnchorA(): Vec2Like }).GetAnchorA();
		return { x: v.x, y: v.y };
	}

	jointAnchorB(joint: b2Joint): Vec2Like {
		const v = (joint as unknown as { GetAnchorB(): Vec2Like }).GetAnchorB();
		return { x: v.x, y: v.y };
	}

	jointBodyA(joint: b2Joint): b2Body {
		return joint.GetBodyA();
	}

	jointBodyB(joint: b2Joint): b2Body {
		return joint.GetBodyB();
	}

	installContactHandlers(world: b2World, hooks: ContactHooks): void {
		installBox2D21Contacts(world, hooks);
	}
}

/** Expose the concrete b2Contact type for the contact port. */
export type Box2D21Contact = b2Contact;

/** The process-wide engine-1 backend singleton (stateless; safe to share). */
export const box2d21Backend = new Box2D21Backend();
