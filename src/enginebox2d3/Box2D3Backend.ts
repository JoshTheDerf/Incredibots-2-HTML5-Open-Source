// Box2D3Backend — engine 2 (Box2D v3 via box2d3-wasm, compat build).
//
// E3-1 built the CORE of the PhysicsBackend seam over the v3 C-handle API
// (world / body / shape / step / read-back / query / force). E3-2 (this pass,
// see .agents/ib3-merge/ENGINE-BOX2D3-PLAN.md §E3-2) adds JOINTS, per-frame
// joint ops, and CONTACT event handling so a full multi-part bot runs through
// GameCore under engine 2.
//
// THE CENTRAL E3-2 REALIZATION — HANDLES MUST BE METHOD-BEARING.
// E3-1 returned RAW v3 value-handles (b2BodyId/b2ShapeId, plain {index1,...}
// structs) and only ever drove them THROUGH this backend (the smoke test never
// touched the parts). But the shared Part code calls b2Body / b2*Joint METHODS
// DIRECTLY on whatever GetBody()/m_joint holds — duck-typed, because engines
// 0/1 store the real b2Body/b2Joint OBJECTS (see PhysicsBackend.ts: "a stored
// handle is already engine-agnostic under duck typing"). Examples the joint
// build + per-frame drive rely on:
//   - b2RevoluteJointDef.Initialize(bodyA, bodyB, anchor) -> bodyA.GetLocalPoint
//     / GetAngle  (ShapePart.CheckFixedJoints, RevoluteJoint.Init)
//   - Rectangle.Init shared-body weld -> body.GetPosition()
//   - ShapePart.HeavierThan -> body.GetMass(); UnInit -> body.Get/SetUserData()
//   - RevoluteJoint.Update -> joint.SetMotorSpeed / EnableMotor / GetJointAngle
//     / (settable) m_maxMotorTorque
//   - PrismaticJoint.Update -> joint.GetJointTranslation / SetMaxMotorForce / ...
// v3 value-handles have NO such methods. So createBody/createShape/createJoint
// here return small WRAPPER objects (Box2D3Body / Box2D3Shape / Box2D3Joint)
// that hold the raw v3 id + the module and expose exactly that duck-typed
// b2Body/b2*Joint surface, plus per-handle userData (v3 has no native userData).
// Every backend method that RECEIVES a handle unwraps `.id` to call the v3 free
// function. The seam's opaque-handle contract is unchanged — callers still treat
// B/S/J as opaque; only THIS adapter knows they carry methods.
//
// v3 JOINT MAPPING (localFrameA/B, not 2.x localAnchor+referenceAngle).
// v3 defines a joint by two b2Transform "frames" (b2JointDef.localFrameA/B on
// the def's `base`), one per body. The joint constraint drives the two frames
// together (revolute: shared origin, free relative rotation; prismatic: shared
// axis). We map from the plain 2.x def the parts already populated via
// def.Initialize (localAnchor1/2 = each body's local anchor, referenceAngle =
// bodyB.angle-bodyA.angle at build, localAxis1 = bodyA-local axis):
//   frame.p  = localAnchorN                              (the pivot, per body)
//   revolute:  frameA.q = 0 rad, frameB.q = -referenceAngle
//   prismatic: axisAng = atan2(localAxis1.y, localAxis1.x);
//              frameA.q = axisAng, frameB.q = axisAng - referenceAngle
// Chosen so the two frames COINCIDE in world space at creation (relative angle /
// translation = 0), which reproduces 2.x reference-angle semantics: v3's
// GetAngle/GetTranslation and the [lower,upper] limits are then measured from
// that same zero the 2.x joint used. Verified empirically (frame writes persist
// through Embind; motor drives rotation; b2Joint_GetLocalFrameA -> world anchor
// reads back correctly). API: b2Default{Revolute,Prismatic}JointDef,
// b2Create{Revolute,Prismatic}Joint, b2Transform{p,q}, b2MakeRot.
// FIXED joints: MIRROR engines 0/1 — a PLAIN fixed weld emits NO joint (the
// shared part code re-inits the partner onto the SAME body via createShape, so
// the weld IS one rigid body); only a TRIGGERED fixed joint reaches createJoint,
// as a limit-locked b2RevoluteJointDef (lower=upper=0), so TRIGGER_DESTROY can
// break it. So b2CreateWeldJoint is intentionally unused.
//
// CONTACTS — v3 POLLS, it has no listener. After each b2World_Step we drain
// b2World_GetContactEvents (begin/end touch, PER SHAPE-PAIR) + b2World_GetSensor
// Events and drive the SAME engine-neutral ContactHooks (onAdd/onRemove) that
// engines 0/1 feed to GameCore's condition + trigger + bomb logic. Each event's
// shape id is resolved back to the exact Box2D3Shape wrapper the part stored
// (shapesById), so identity comparisons (point.shapeN === part.GetShape()) and
// GetUserData() hold across engines. DOCUMENTED semantic difference: like engine
// 1 (2.1a) — and UNLIKE engine 0 (2.0.2, per-manifold-point) — v3 fires begin/
// end ONCE per shape-pair, so trigger touch-COUNT magnitudes differ from engine
// 0, but every begin has a matching end so the sign-based CW/CCW decision and
// boolean touching latches are equivalent (replays are per-engine anyway).
//
// COLLISION FILTERING verified: our 4-layer A-D category==mask encoding
// (ShapePart.CollisionBits) and self-collision groupIndex map 1:1 onto v3's
// b2Filter{categoryBits,maskBits,groupIndex} with IDENTICAL semantics to
// Box2DFlash 2.0/2.1a — negative groupIndex = never collide (robot self-collide
// opt-out), positive = always collide, 0 = defer to category/mask. E3-1's
// mapping is correct as-is. DEFERRED: the shipped ContactFilter custom
// short-circuits (isSandbox force-collide; per-shape collide=false / same-piston
// opt-outs) are NOT yet ported — v3's custom-filter callback is veto-only (can
// further restrict but cannot force-collide across a b2Filter reject), and none
// of the required semantics are exercisable by the standard filter alone; the
// piston self-collision is already handled by the shared negative groupIndex.
// (Follow-up; engine 2 is not user-reachable until E3-4.)
//
// DEFERRED to later sub-phases (throw with a clear marker):
//   - createWaterController / addWaterBody / waterSurface — E3-3 (manual buoyancy).
//
// EMBIND: v3 struct getters + `new` structs are heap-backed ClassHandles; each
// getter returns a FRESH handle. Every transient created here is .delete()d.
// Value-object returns (b2*Id triples, contact-event shape ids) are plain JS
// objects and are NOT deleted.

import { b2Joint, b2Shape } from "../Box2D";
import type { b2BodyDef, b2CircleDef, b2JointDef, b2MassData, b2PolygonDef, b2PrismaticJointDef, b2RevoluteJointDef, b2ShapeDef } from "../Box2D";
import type {
	BodyTransform,
	ContactHooks,
	PhysicsBackend,
	SegmentHit,
	Vec2Like,
	WaterControllerDef,
	WaterSurfaceReadback,
	WorldDef,
} from "../core/physics";
import type { Box2D3Module } from "./loadBox2D3";

// v3 value-handle types, pulled structurally from the module's own function
// signatures so we needn't deep-import the package's (exports-gated) .d.ts.
type RawWorldId = ReturnType<Box2D3Module["b2CreateWorld"]>;
type RawBodyId = ReturnType<Box2D3Module["b2CreateBody"]>;
type RawShapeId = ReturnType<Box2D3Module["b2CreatePolygonShape"]>;
type RawJointId = ReturnType<Box2D3Module["b2CreateRevoluteJoint"]>;

/** An id triple, for building side-map keys. */
interface IdTriple {
	index1: number;
	world0?: number;
	generation: number;
}

function keyOf(id: IdTriple): string {
	return `${id.index1}:${id.world0 ?? 0}:${id.generation}`;
}

/** Read a v3 b2Vec2 handle into a plain vector and free it. */
function readVec(v: { x: number; y: number; delete(): void }): Vec2Like {
	const out = { x: v.x, y: v.y };
	v.delete();
	return out;
}

// ---------------------------------------------------------------------------
// Handle wrappers — the method-bearing objects GetBody()/GetShape()/m_joint hold.
// ---------------------------------------------------------------------------

/**
 * A v3 body wrapper duck-typing the b2Body methods the shared Part code calls
 * directly (engines 0/1 hand out the real b2Body). Holds the raw v3 id + the
 * userData record (v3 has no per-handle userData).
 */
export class Box2D3Body {
	public userData: unknown = null;
	constructor(
		private readonly m: Box2D3Module,
		public readonly id: RawBodyId,
	) {}

	// biome-ignore lint/suspicious/noExplicitAny: matches the 2.0 b2Body.GetUserData() any.
	public GetUserData(): any {
		return this.userData;
	}
	public SetUserData(u: unknown): void {
		this.userData = u;
	}
	public GetMass(): number {
		return this.m.b2Body_GetMass(this.id);
	}
	/** World position (parts read `.GetPosition().x`). */
	public GetPosition(): Vec2Like {
		return readVec(this.m.b2Body_GetPosition(this.id));
	}
	public GetAngle(): number {
		const rot = this.m.b2Body_GetRotation(this.id);
		const a = this.m.b2Rot_GetAngle(rot);
		rot.delete();
		return a;
	}
	/** World centre of mass (2.0 GetWorldCenter -> v3 world centre of mass). */
	public GetWorldCenter(): Vec2Like {
		return readVec(this.m.b2Body_GetWorldCenterOfMass(this.id));
	}
	public GetLocalPoint(worldPoint: Vec2Like): Vec2Like {
		const p = new this.m.b2Vec2(worldPoint.x, worldPoint.y);
		const out = readVec(this.m.b2Body_GetLocalPoint(this.id, p));
		p.delete();
		return out;
	}
	public GetWorldPoint(localPoint: Vec2Like): Vec2Like {
		const p = new this.m.b2Vec2(localPoint.x, localPoint.y);
		const out = readVec(this.m.b2Body_GetWorldPoint(this.id, p));
		p.delete();
		return out;
	}
	public GetLocalVector(worldVector: Vec2Like): Vec2Like {
		const v = new this.m.b2Vec2(worldVector.x, worldVector.y);
		const out = readVec(this.m.b2Body_GetLocalVector(this.id, v));
		v.delete();
		return out;
	}
	public GetWorldVector(localVector: Vec2Like): Vec2Like {
		const v = new this.m.b2Vec2(localVector.x, localVector.y);
		const out = readVec(this.m.b2Body_GetWorldVector(this.id, v));
		v.delete();
		return out;
	}
	public SetBullet(flag: boolean): void {
		this.m.b2Body_SetBullet(this.id, flag);
	}
	/** 2.0 SetXForm(position, angle) -> v3 b2Body_SetTransform(pos, rot). */
	public SetXForm(position: Vec2Like, angle: number): void {
		const p = new this.m.b2Vec2(position.x, position.y);
		const r = this.m.b2MakeRot(angle);
		this.m.b2Body_SetTransform(this.id, p, r);
		p.delete();
		r.delete();
	}
}

/** A v3 shape wrapper: userData + the filter used at creation (parts read m_filter.groupIndex). */
export class Box2D3Shape {
	public userData: unknown = null;
	public readonly m_filter: { categoryBits: number; maskBits: number; groupIndex: number };
	constructor(
		private readonly m: Box2D3Module,
		public readonly id: RawShapeId,
		filter: { categoryBits: number; maskBits: number; groupIndex: number },
	) {
		this.m_filter = filter;
	}
	// biome-ignore lint/suspicious/noExplicitAny: matches the 2.0 shape.GetUserData() any.
	public GetUserData(): any {
		return this.userData;
	}
	/** Owning body (2.0 fixture.GetBody()); a throwaway wrapper is fine (reads only). */
	public GetBody(): Box2D3Body {
		return new Box2D3Body(this.m, this.m.b2Shape_GetBody(this.id));
	}
}

/** Revolute vs prismatic, so the wrapper's duck-typed ops dispatch to the right v3 fns. */
type JointKind = "revolute" | "prismatic";

/**
 * A v3 joint wrapper duck-typing the b2RevoluteJoint / b2PrismaticJoint surface
 * RevoluteJoint.Update / PrismaticJoint.Update drive each frame. m_maxMotorTorque
 * / m_maxMotorForce are settable PROPERTIES in the 2.x classes, so they're
 * getter/setters here that push straight into v3.
 */
export class Box2D3Joint {
	public userData: unknown = null;
	constructor(
		private readonly m: Box2D3Module,
		public readonly id: RawJointId,
		public readonly kind: JointKind,
	) {}

	public EnableMotor(flag: boolean): void {
		if (this.kind === "revolute") this.m.b2RevoluteJoint_EnableMotor(this.id, flag);
		else this.m.b2PrismaticJoint_EnableMotor(this.id, flag);
	}
	public SetMotorSpeed(speed: number): void {
		if (this.kind === "revolute") this.m.b2RevoluteJoint_SetMotorSpeed(this.id, speed);
		else this.m.b2PrismaticJoint_SetMotorSpeed(this.id, speed);
	}
	/** Revolute relative angle (2.0 GetJointAngle). */
	public GetJointAngle(): number {
		return this.m.b2RevoluteJoint_GetAngle(this.id);
	}
	/** Prismatic translation along the axis (2.0 GetJointTranslation). */
	public GetJointTranslation(): number {
		return this.m.b2PrismaticJoint_GetTranslation(this.id);
	}
	public SetMaxMotorForce(force: number): void {
		this.m.b2PrismaticJoint_SetMaxMotorForce(this.id, force);
	}
	// biome-ignore lint/suspicious/noExplicitAny: matches the 2.0 joint.GetUserData() any.
	public GetUserData(): any {
		return this.userData;
	}
	/** Settable in RevoluteJoint.Update; pushes into v3 on assign. */
	public get m_maxMotorTorque(): number {
		return this.m.b2RevoluteJoint_GetMaxMotorTorque(this.id);
	}
	public set m_maxMotorTorque(v: number) {
		this.m.b2RevoluteJoint_SetMaxMotorTorque(this.id, v);
	}
	/** Settable in PrismaticJoint.Update; pushes into v3 on assign. */
	public get m_maxMotorForce(): number {
		return this.m.b2PrismaticJoint_GetMaxMotorForce(this.id);
	}
	public set m_maxMotorForce(v: number) {
		this.m.b2PrismaticJoint_SetMaxMotorForce(this.id, v);
	}
}

/**
 * v3 Step takes a single sub-step count (not the 2.x velocity/position split). 4
 * is the v3-recommended default and rests cleanly (box2d3-smoke.test.ts); the
 * incoming 2.0 `iterations` is a different solver concept, not forwarded.
 */
const B2_SUB_STEP_COUNT = 4;

/** ±MAX_VALUE "no limit" sentinels from the 2.x defs -> a large finite bound
 * (v3 SetLimits with 1.79e308 risks NaN); ~5730 turns is effectively unlimited. */
const LIMIT_INF = 1e5;

export class Box2D3Backend implements PhysicsBackend<RawWorldId, Box2D3Body, Box2D3Shape, Box2D3Joint> {
	private readonly m: Box2D3Module;
	/** Resolve a v3 shape id (from a contact/sensor event) back to its wrapper. */
	private shapesById = new Map<string, Box2D3Shape>();
	/** Engine-neutral contact hooks, drained after each step (v3 has no listener). */
	private contactHooks: ContactHooks | null = null;

	constructor(module: Box2D3Module) {
		this.m = module;
	}

	// --- world lifecycle ---
	createWorld(def: WorldDef): RawWorldId {
		const m = this.m;
		// A fresh world starts a fresh sim: drop any stale shape map / hooks from a
		// previous play (the backend is a process-wide singleton).
		this.shapesById = new Map();
		this.contactHooks = null;
		const wd = m.b2DefaultWorldDef();
		const g = new m.b2Vec2(def.gravityX, def.gravityY);
		wd.gravity = g;
		wd.enableSleep = def.doSleep;
		// v3 uses a dynamic tree; the 2.0 world AABB bounds are obsolete (as in 2.1a).
		const world = m.b2CreateWorld(wd);
		g.delete();
		wd.delete();
		return world;
	}

	step(world: RawWorldId, dt: number, _iterations: number): void {
		// v3 auto-clears applied forces each step, so (unlike 2.1a) no ClearForces.
		this.m.b2World_Step(world, dt, B2_SUB_STEP_COUNT);
		// v3 has no contact listener: poll begin/end touch events now and drive the
		// shared hooks. Called after EACH step (GameCore steps twice per frame) so
		// every begin/end is seen; v3 only reports NEW transitions, so no dupes.
		this.drainContactEvents(world);
	}

	// --- construction / destruction ---
	createBody(world: RawWorldId, bodyDef: b2BodyDef): Box2D3Body {
		const m = this.m;
		const bd = m.b2DefaultBodyDef();
		// Static-ness is unknown at creation in the 2.0 model — it arrives via a
		// later setMass(zero). Create dynamic; setMass flips to static.
		bd.type = m.b2BodyType.b2_dynamicBody;
		const pos = new m.b2Vec2(bodyDef.position.x, bodyDef.position.y);
		bd.position = pos;
		const rot = m.b2MakeRot(bodyDef.angle);
		bd.rotation = rot;
		bd.isBullet = bodyDef.isBullet;
		if (bodyDef.fixedRotation) {
			// 2.0 fixedRotation -> v3 locks angular motion.
			const locks = new m.b2MotionLocks();
			locks.angularZ = true;
			bd.motionLocks = locks;
			locks.delete();
		}
		const raw = m.b2CreateBody(world, bd);
		pos.delete();
		rot.delete();
		bd.delete();
		const body = new Box2D3Body(m, raw);
		if (bodyDef.userData != null) body.userData = bodyDef.userData;
		return body;
	}

	createShape(body: Box2D3Body, shapeDef: b2ShapeDef): Box2D3Shape {
		const m = this.m;
		const sd = m.b2DefaultShapeDef();
		// density/friction/restitution are ALREADY converted to Box2D units by the
		// shared part code (Util.Convert*ToBox2D) — copy verbatim, do not re-scale.
		sd.density = shapeDef.density;
		sd.material.friction = shapeDef.friction;
		sd.material.restitution = shapeDef.restitution;
		sd.isSensor = shapeDef.isSensor;
		// v3 only reports begin/end touch for shapes that opt in — enable so the
		// contact/sensor poll drives the trigger + condition hooks.
		sd.enableContactEvents = true;
		sd.enableSensorEvents = true;
		// Collision layers: our 2.0 category/mask/group bits map 1:1 onto v3's
		// b2Filter (same encoding ShapePart.CollisionBits computes; same negative=
		// never / positive=always / 0=defer semantics as Box2DFlash 2.0/2.1a).
		const filter = { categoryBits: shapeDef.filter.categoryBits, maskBits: shapeDef.filter.maskBits, groupIndex: shapeDef.filter.groupIndex };
		sd.filter.categoryBits = filter.categoryBits;
		sd.filter.maskBits = filter.maskBits;
		sd.filter.groupIndex = filter.groupIndex;

		let raw: RawShapeId;
		if (shapeDef.type === b2Shape.e_circleShape) {
			const cd = shapeDef as b2CircleDef;
			const circle = new m.b2Circle();
			const center = new m.b2Vec2(cd.localPosition.x, cd.localPosition.y);
			circle.center = center;
			circle.radius = cd.radius;
			raw = m.b2CreateCircleShape(body.id, sd, circle);
			center.delete();
			circle.delete();
		} else {
			// rect / triangle / polygon: build a convex hull from the (already
			// body-origin-rebased) local verts, then a b2Polygon (radius 0).
			const pd = shapeDef as b2PolygonDef;
			const pts: Array<{ delete(): void }> = [];
			for (let i = 0; i < pd.vertexCount; i++) pts.push(new m.b2Vec2(pd.vertices[i].x, pd.vertices[i].y));
			const hull = m.b2ComputeHull(pts);
			const poly = m.b2MakePolygon(hull, 0);
			raw = m.b2CreatePolygonShape(body.id, sd, poly);
			for (const p of pts) p.delete();
			hull.delete();
			poly.delete();
		}
		sd.delete();
		const shape = new Box2D3Shape(m, raw, filter);
		if (shapeDef.userData != null) shape.userData = shapeDef.userData;
		this.shapesById.set(keyOf(raw as IdTriple), shape);
		return shape;
	}

	destroyShape(_body: Box2D3Body, shape: Box2D3Shape): void {
		this.shapesById.delete(keyOf(shape.id as IdTriple));
		// updateBodyMass=true: recompute the owning body's mass after removal.
		this.m.b2DestroyShape(shape.id, true);
	}

	setMass(body: Box2D3Body, massData: b2MassData): void {
		const m = this.m;
		// The 2.0 parts call setMass only to make a body STATIC (a fresh zero-mass
		// b2MassData). v3 expresses that as a type change (mirrors Box2D21Backend).
		if (!massData.mass) {
			m.b2Body_SetType(body.id, m.b2BodyType.b2_staticBody);
			return;
		}
		const md = new m.b2MassData();
		md.mass = massData.mass;
		const center = new m.b2Vec2(massData.center.x, massData.center.y);
		md.center = center;
		md.rotationalInertia = massData.I;
		m.b2Body_SetMassData(body.id, md);
		center.delete();
		md.delete();
	}

	setMassFromShapes(body: Box2D3Body): void {
		// 2.0 SetMassFromShapes == v3 ApplyMassFromShapes (recompute from shapes).
		this.m.b2Body_ApplyMassFromShapes(body.id);
	}

	createJoint(world: RawWorldId, jointDef: b2JointDef): Box2D3Joint {
		const type = jointDef.type;
		if (type === b2Joint.e_revoluteJoint) return this.createRevolute(world, jointDef as b2RevoluteJointDef);
		if (type === b2Joint.e_prismaticJoint) return this.createPrismatic(world, jointDef as b2PrismaticJointDef);
		// Mouse joints (user drag) + weld (plain fixed welds don't reach here —
		// they're a shared body, mirroring engines 0/1) are not needed for the sim.
		throw new Error(`Box2D3Backend.createJoint: unsupported joint type ${type}`);
	}

	/**
	 * Build a v3 joint frame (a b2Transform: position `p` + rotation `q`) and hand
	 * it to `assign` (which copies it by value into the def's base), then free the
	 * transients. b2JointDef has no localAnchor/axis fields — the anchor + axis
	 * ride entirely in this frame.
	 */
	private withFrame(px: number, py: number, angle: number, assign: (t: unknown) => void): void {
		const m = this.m;
		const t = new m.b2Transform();
		const p = new m.b2Vec2(px, py);
		const q = m.b2MakeRot(angle);
		t.p = p;
		t.q = q;
		assign(t);
		p.delete();
		q.delete();
		t.delete();
	}

	private createRevolute(world: RawWorldId, s: b2RevoluteJointDef): Box2D3Joint {
		const m = this.m;
		const jd = m.b2DefaultRevoluteJointDef();
		const base = jd.base;
		base.bodyIdA = (s.body1 as unknown as Box2D3Body).id;
		base.bodyIdB = (s.body2 as unknown as Box2D3Body).id;
		base.collideConnected = s.collideConnected;
		// Frames coincide in world at build (see file header): frameA angle 0,
		// frameB angle -referenceAngle -> relative angle 0 == 2.x reference zero.
		this.withFrame(s.localAnchor1.x, s.localAnchor1.y, 0, (t) => {
			base.localFrameA = t as typeof base.localFrameA;
		});
		this.withFrame(s.localAnchor2.x, s.localAnchor2.y, -s.referenceAngle, (t) => {
			base.localFrameB = t as typeof base.localFrameB;
		});
		jd.enableMotor = s.enableMotor;
		jd.maxMotorTorque = s.maxMotorTorque;
		jd.motorSpeed = s.motorSpeed;
		jd.enableLimit = s.enableLimit;
		if (s.enableLimit) {
			jd.lowerAngle = clampLimit(s.lowerAngle);
			jd.upperAngle = clampLimit(s.upperAngle);
		}
		const raw = m.b2CreateRevoluteJoint(world, jd);
		jd.delete();
		return new Box2D3Joint(m, raw, "revolute");
	}

	private createPrismatic(world: RawWorldId, s: b2PrismaticJointDef): Box2D3Joint {
		const m = this.m;
		const jd = m.b2DefaultPrismaticJointDef();
		const base = jd.base;
		base.bodyIdA = (s.body1 as unknown as Box2D3Body).id;
		base.bodyIdB = (s.body2 as unknown as Box2D3Body).id;
		base.collideConnected = s.collideConnected;
		// Axis rides in the frame rotation (v3 has no localAxis field): the joint
		// axis is frameA's x-axis. Frames coincide in world at build -> translation 0.
		const axisAngle = Math.atan2(s.localAxis1.y, s.localAxis1.x);
		this.withFrame(s.localAnchor1.x, s.localAnchor1.y, axisAngle, (t) => {
			base.localFrameA = t as typeof base.localFrameA;
		});
		this.withFrame(s.localAnchor2.x, s.localAnchor2.y, axisAngle - s.referenceAngle, (t) => {
			base.localFrameB = t as typeof base.localFrameB;
		});
		jd.enableMotor = s.enableMotor;
		jd.maxMotorForce = s.maxMotorForce;
		jd.motorSpeed = s.motorSpeed;
		jd.enableLimit = s.enableLimit;
		if (s.enableLimit) {
			jd.lowerTranslation = clampLimit(s.lowerTranslation);
			jd.upperTranslation = clampLimit(s.upperTranslation);
		}
		const raw = m.b2CreatePrismaticJoint(world, jd);
		jd.delete();
		const joint = new Box2D3Joint(m, raw, "prismatic");
		if (s.userData != null) joint.userData = s.userData;
		return joint;
	}

	destroyBody(_world: RawWorldId, body: Box2D3Body): void {
		this.m.b2DestroyBody(body.id);
	}

	destroyJoint(_world: RawWorldId, joint: Box2D3Joint): void {
		// wakeBodies=true: the two bodies wake when the constraint is removed (2.x
		// DestroyJoint wakes them; matters for a joint broken by CheckForBreakage).
		this.m.b2DestroyJoint(joint.id, true);
	}

	// --- spatial query ---
	queryAABB(
		world: RawWorldId,
		lowerX: number,
		lowerY: number,
		upperX: number,
		upperY: number,
		out: Box2D3Shape[],
		maxCount: number,
	): number {
		const m = this.m;
		const aabb = new m.b2AABB();
		const lower = new m.b2Vec2(lowerX, lowerY);
		const upper = new m.b2Vec2(upperX, upperY);
		aabb.lowerBound = lower;
		aabb.upperBound = upper;
		const filter = m.b2DefaultQueryFilter();
		let count = 0;
		m.b2World_OverlapAABB(world, aabb, filter, (result: { shapeId: RawShapeId }): boolean => {
			if (count >= maxCount) return false;
			// Resolve to the stored wrapper so callers get GetUserData()/identity;
			// fall back to a bare wrapper for any shape we didn't create.
			const existing = this.shapesById.get(keyOf(result.shapeId as IdTriple));
			out[count++] = existing ?? new Box2D3Shape(m, result.shapeId, { categoryBits: 0, maskBits: 0, groupIndex: 0 });
			return true;
		});
		lower.delete();
		upper.delete();
		aabb.delete();
		filter.delete();
		return count;
	}

	// --- dynamics ---
	applyForce(body: Box2D3Body, force: Vec2Like, point: Vec2Like): void {
		const m = this.m;
		const f = new m.b2Vec2(force.x, force.y);
		const p = new m.b2Vec2(point.x, point.y);
		m.b2Body_ApplyForce(body.id, f, p, true);
		f.delete();
		p.delete();
	}

	applyImpulse(body: Box2D3Body, impulse: Vec2Like, point: Vec2Like): void {
		const m = this.m;
		const i = new m.b2Vec2(impulse.x, impulse.y);
		const p = new m.b2Vec2(point.x, point.y);
		m.b2Body_ApplyLinearImpulse(body.id, i, p, true);
		i.delete();
		p.delete();
	}

	// --- read-back ---
	bodyVelocity(body: Box2D3Body): Vec2Like {
		return readVec(this.m.b2Body_GetLinearVelocity(body.id));
	}

	bodyTransform(body: Box2D3Body): BodyTransform {
		const m = this.m;
		const p = m.b2Body_GetPosition(body.id);
		const pos = { x: p.x, y: p.y };
		p.delete();
		const rot = m.b2Body_GetRotation(body.id);
		const angle = m.b2Rot_GetAngle(rot);
		rot.delete();
		return { x: pos.x, y: pos.y, angle };
	}

	// --- per-frame handle ops ---
	wakeBody(body: Box2D3Body): void {
		this.m.b2Body_SetAwake(body.id, true);
	}

	bodyIsStatic(body: Box2D3Body): boolean {
		const type = this.m.b2Body_GetType(body.id);
		return type.value === this.m.b2BodyType.b2_staticBody.value;
	}

	shapeTestPoint(shape: Box2D3Shape, _body: Box2D3Body, point: Vec2Like): boolean {
		const m = this.m;
		const p = new m.b2Vec2(point.x, point.y);
		const hit = m.b2Shape_TestPoint(shape.id, p);
		p.delete();
		return hit;
	}

	shapeTestSegment(
		shape: Box2D3Shape,
		_body: Box2D3Body,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		maxFraction: number,
	): SegmentHit | null {
		const m = this.m;
		const input = new m.b2RayCastInput();
		const origin = new m.b2Vec2(x1, y1);
		const translation = new m.b2Vec2(x2 - x1, y2 - y1);
		input.origin = origin;
		input.translation = translation;
		input.maxFraction = maxFraction;
		const output = m.b2Shape_RayCast(shape.id, input);
		const hit = output.hit;
		const result: SegmentHit | null = hit
			? { lambda: output.fraction, nx: output.normal.x, ny: output.normal.y }
			: null;
		origin.delete();
		translation.delete();
		input.delete();
		output.delete();
		return result;
	}

	// --- joint accessors (used by the per-frame CheckForBreakage checks) ---
	/** World anchor on body A = bodyA transform applied to localFrameA.p. */
	jointAnchorA(joint: Box2D3Joint): Vec2Like {
		return this.jointWorldAnchor(joint, true);
	}

	jointAnchorB(joint: Box2D3Joint): Vec2Like {
		return this.jointWorldAnchor(joint, false);
	}

	private jointWorldAnchor(joint: Box2D3Joint, sideA: boolean): Vec2Like {
		const m = this.m;
		const frame = sideA ? m.b2Joint_GetLocalFrameA(joint.id) : m.b2Joint_GetLocalFrameB(joint.id);
		const bodyRaw = sideA ? m.b2Joint_GetBodyA(joint.id) : m.b2Joint_GetBodyB(joint.id);
		// frame.p is the anchor in the body's local frame; map to world.
		const out = readVec(m.b2Body_GetWorldPoint(bodyRaw, frame.p));
		frame.delete();
		return out;
	}

	jointBodyA(joint: Box2D3Joint): Box2D3Body {
		// A throwaway wrapper (callers only read its transform via bodyTransform).
		return new Box2D3Body(this.m, this.m.b2Joint_GetBodyA(joint.id));
	}

	jointBodyB(joint: Box2D3Joint): Box2D3Body {
		return new Box2D3Body(this.m, this.m.b2Joint_GetBodyB(joint.id));
	}

	// --- contact wiring ---
	installContactHandlers(_world: RawWorldId, hooks: ContactHooks): void {
		// v3 has NO listener — just remember the hooks; step() drains the polled
		// begin/end touch events into them after each b2World_Step.
		this.contactHooks = hooks;
	}

	/** Poll v3's per-step begin/end touch events (contacts + sensors) into the hooks. */
	private drainContactEvents(world: RawWorldId): void {
		const hooks = this.contactHooks;
		if (!hooks) return;
		const m = this.m;

		const ce = m.b2World_GetContactEvents(world);
		const beginCount = ce.beginCount;
		for (let i = 0; i < beginCount; i++) {
			const ev = ce.GetBeginEvent(i);
			this.fireContact(ev.shapeIdA, ev.shapeIdB, hooks, true);
			deleteHandle(ev);
		}
		const endCount = ce.endCount;
		for (let i = 0; i < endCount; i++) {
			const ev = ce.GetEndEvent(i);
			this.fireContact(ev.shapeIdA, ev.shapeIdB, hooks, false);
			deleteHandle(ev);
		}
		deleteHandle(ce);

		// Sensors report on a SEPARATE channel in v3 (isSensor shapes emit no
		// contact-touch events). Route sensor begin/end through the same hooks so
		// sensor-driven triggers/conditions behave like engines 0/1.
		const se = m.b2World_GetSensorEvents(world);
		const sBegin = se.beginCount;
		for (let i = 0; i < sBegin; i++) {
			const ev = se.GetBeginEvent(i);
			this.fireContact(ev.sensorShapeId, ev.visitorShapeId, hooks, true);
			deleteHandle(ev);
		}
		const sEnd = se.endCount;
		for (let i = 0; i < sEnd; i++) {
			const ev = se.GetEndEvent(i);
			this.fireContact(ev.sensorShapeId, ev.visitorShapeId, hooks, false);
			deleteHandle(ev);
		}
		deleteHandle(se);
	}

	private fireContact(shapeIdA: RawShapeId, shapeIdB: RawShapeId, hooks: ContactHooks, add: boolean): void {
		const s1 = this.shapesById.get(keyOf(shapeIdA as IdTriple));
		const s2 = this.shapesById.get(keyOf(shapeIdB as IdTriple));
		if (!s1 || !s2) return; // a shape we didn't create (shouldn't happen)
		const point = { shape1: s1, shape2: s2 };
		if (add) hooks.onAdd(point);
		else hooks.onRemove(point);
	}

	// --- water / buoyancy (deferred to E3-3) ---
	createWaterController(_world: RawWorldId, _def: WaterControllerDef): unknown {
		throw new Error("Box2D3Backend.createWaterController: water lands in E3-3");
	}

	addWaterBody(_controller: unknown, _body: Box2D3Body): void {
		throw new Error("Box2D3Backend.addWaterBody: water lands in E3-3");
	}

	waterSurface(_controller: unknown): WaterSurfaceReadback {
		throw new Error("Box2D3Backend.waterSurface: water lands in E3-3");
	}
}

/** ±MAX_VALUE "no limit" -> a large finite bound (v3 SetLimits dislikes 1.79e308). */
function clampLimit(v: number): number {
	if (v >= Number.MAX_VALUE) return LIMIT_INF;
	if (v <= -Number.MAX_VALUE) return -LIMIT_INF;
	return v;
}

/** Free an Embind ClassHandle if it exposes delete() (event handles do). */
function deleteHandle(h: unknown): void {
	if (h && typeof (h as { delete?: unknown }).delete === "function") (h as { delete(): void }).delete();
}
