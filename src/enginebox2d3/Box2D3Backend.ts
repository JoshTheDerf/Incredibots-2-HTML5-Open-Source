// Box2D3Backend — engine 2 (Box2D v3 via box2d3-wasm, compat build).
//
// E3-1 (see .agents/ib3-merge/ENGINE-BOX2D3-PLAN.md §C1-C4). Implements the
// CORE of the PhysicsBackend seam over the v3 C-handle API: world / body /
// shape / step / transform+velocity read-back / queryAABB / force / impulse /
// mass. Parts + GameCore build from the SAME plain-data 2.0 b2*Def objects they
// pass to engines 0/1; this adapter READS those defs and maps them onto v3's
// value-handle create functions (b2CreateWorld / b2CreateBody /
// b2CreatePolygonShape / b2CreateCircleShape / b2World_Step / ...).
//
// Constructed FROM a resolved module (see loadBox2D3) so every method is
// synchronous, satisfying the sync PhysicsBackend interface despite the async
// wasm load. Lives outside the node-clean core (§C4).
//
// HOW v3 DIFFERS FROM THE 2.x PORTS (and how this adapter bridges it):
//  - HANDLES ARE VALUE STRUCTS. b2WorldId/b2BodyId/b2ShapeId/b2JointId are
//    plain {index1,world0,generation} objects, not OO wrappers. They are the
//    opaque W/B/S/J handles here. All ops are free functions taking an id.
//  - NO PER-HANDLE JS userData. The v3 binding exposes no b2Body_Set/GetUserData
//    or b2Shape_Set/GetUserData, so we keep userData in side maps keyed by the
//    id triple (contact/query consumers read it back through this adapter).
//  - EMBIND TEMPORARIES LEAK. Struct getters (b2Body_GetPosition, ...) and
//    `new` structs are ClassHandles backed by wasm heap; each getter call
//    returns a FRESH handle. Per-frame read-back MUST .delete() them or the
//    heap grows unbounded — so every transient created here is deleted.
//  - ROTATION is a b2Rot (cos/sin), not a scalar angle: build via b2MakeRot,
//    read via b2Rot_GetAngle.
//  - FRICTION/RESTITUTION live on shapeDef.material (b2SurfaceMaterial), not on
//    the shapeDef directly; density stays on the shapeDef.
//  - FORCES auto-clear each Step (modern Box2D), so step() does NOT ClearForces
//    (unlike the 2.1a backend).
//  - STATIC-NESS: the 2.0 model infers it from a later zero-mass setMass, so
//    createBody makes every body DYNAMIC and setMass(zero) flips it static via
//    b2Body_SetType (mirrors Box2D21Backend).
//
// DEFERRED (later sub-phases, throw/no-op with a clear marker until then):
//  - createJoint / destroyJoint / joint anchor+body accessors — E3-2 (v3 joints
//    use localFrameA/B transforms, not the 2.x localAnchor+referenceAngle; a
//    faithful mapping + a multi-part bot test is its own phase).
//  - installContactHandlers — E3-2 (v3 has no listener; contacts are polled via
//    b2World_GetContactEvents after each step). No-op here so a world can still
//    be created/stepped; engine 2 is not wired into GameCore until E3-4.
//  - createWaterController / addWaterBody / waterSurface — E3-3 (v3 has no
//    controller framework; buoyancy is manual per-step force application).
//
// TUNING (world hertz / sleep thresholds / length units / sub-step count) is a
// deliberate E3-5 pass; E3-1 uses v3 defaults + a fixed sub-step count that
// already produce sane resting behaviour (see test/box2d3-smoke.test.ts).

import { b2Shape } from "../Box2D";
import type { b2BodyDef, b2CircleDef, b2JointDef, b2MassData, b2PolygonDef, b2ShapeDef } from "../Box2D";
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
type WorldId = ReturnType<Box2D3Module["b2CreateWorld"]>;
type BodyId = ReturnType<Box2D3Module["b2CreateBody"]>;
type ShapeId = ReturnType<Box2D3Module["b2CreatePolygonShape"]>;
type JointId = ReturnType<Box2D3Module["b2CreateRevoluteJoint"]>;

/** An id triple, for building side-map keys + for typed handle access. */
interface IdHandle {
	index1: number;
	world0?: number;
	generation: number;
}

/**
 * v3's Step takes a single sub-step count (not the 2.x velocity/position
 * iteration split). 4 is the v3-recommended default and is what the smoke test
 * rests cleanly with; the incoming 2.0 `iterations` count is a different solver
 * concept and is intentionally not forwarded. Revisited in E3-5 tuning.
 */
const B2_SUB_STEP_COUNT = 4;

export class Box2D3Backend implements PhysicsBackend<WorldId, BodyId, ShapeId, JointId> {
	private readonly m: Box2D3Module;
	/** userData side maps (v3 binding has no per-handle JS userData). */
	private readonly bodyUserData = new Map<string, unknown>();
	private readonly shapeUserData = new Map<string, unknown>();

	constructor(module: Box2D3Module) {
		this.m = module;
	}

	// --- id <-> side-map key ---
	private static key(id: IdHandle): string {
		return `${id.index1}:${id.world0 ?? 0}:${id.generation}`;
	}

	/** Read a v3 b2Vec2 handle into a plain vector and free it. */
	private readVec(v: { x: number; y: number; delete(): void }): Vec2Like {
		const out = { x: v.x, y: v.y };
		v.delete();
		return out;
	}

	// --- world lifecycle ---
	createWorld(def: WorldDef): WorldId {
		const m = this.m;
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

	step(world: WorldId, dt: number, _iterations: number): void {
		// v3 auto-clears applied forces each step, so (unlike 2.1a) no ClearForces.
		this.m.b2World_Step(world, dt, B2_SUB_STEP_COUNT);
	}

	// --- construction / destruction ---
	createBody(world: WorldId, bodyDef: b2BodyDef): BodyId {
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
		const body = m.b2CreateBody(world, bd);
		pos.delete();
		rot.delete();
		bd.delete();
		if (bodyDef.userData != null) this.bodyUserData.set(Box2D3Backend.key(body as IdHandle), bodyDef.userData);
		return body;
	}

	createShape(body: BodyId, shapeDef: b2ShapeDef): ShapeId {
		const m = this.m;
		const sd = m.b2DefaultShapeDef();
		// density/friction/restitution are ALREADY converted to Box2D units by the
		// shared part code (Util.Convert*ToBox2D) — copy verbatim, do not re-scale.
		sd.density = shapeDef.density;
		sd.material.friction = shapeDef.friction;
		sd.material.restitution = shapeDef.restitution;
		sd.isSensor = shapeDef.isSensor;
		// Collision layers: our 2.0 category/mask/group bits map 1:1 onto v3's
		// b2Filter (same encoding ShapePart.CollisionBits already computes).
		sd.filter.categoryBits = shapeDef.filter.categoryBits;
		sd.filter.maskBits = shapeDef.filter.maskBits;
		sd.filter.groupIndex = shapeDef.filter.groupIndex;

		let shape: ShapeId;
		if (shapeDef.type === b2Shape.e_circleShape) {
			const cd = shapeDef as b2CircleDef;
			const circle = new m.b2Circle();
			const center = new m.b2Vec2(cd.localPosition.x, cd.localPosition.y);
			circle.center = center;
			circle.radius = cd.radius;
			shape = m.b2CreateCircleShape(body, sd, circle);
			center.delete();
			circle.delete();
		} else {
			// rect / triangle / polygon: build a convex hull from the (already
			// body-origin-rebased) local verts, then a b2Polygon (radius 0). This
			// preserves offset shapes (shared-body welds, cannon barrel).
			const pd = shapeDef as b2PolygonDef;
			const pts: Array<{ delete(): void }> = [];
			for (let i = 0; i < pd.vertexCount; i++) pts.push(new m.b2Vec2(pd.vertices[i].x, pd.vertices[i].y));
			const hull = m.b2ComputeHull(pts);
			const poly = m.b2MakePolygon(hull, 0);
			shape = m.b2CreatePolygonShape(body, sd, poly);
			for (const p of pts) p.delete();
			hull.delete();
			poly.delete();
		}
		sd.delete();
		if (shapeDef.userData != null) this.shapeUserData.set(Box2D3Backend.key(shape as IdHandle), shapeDef.userData);
		return shape;
	}

	destroyShape(_body: BodyId, shape: ShapeId): void {
		this.shapeUserData.delete(Box2D3Backend.key(shape as IdHandle));
		// updateBodyMass=true: recompute the owning body's mass after removal.
		this.m.b2DestroyShape(shape, true);
	}

	setMass(body: BodyId, massData: b2MassData): void {
		const m = this.m;
		// The 2.0 parts call setMass only to make a body STATIC (a fresh zero-mass
		// b2MassData). v3 expresses that as a type change (mirrors Box2D21Backend).
		if (!massData.mass) {
			m.b2Body_SetType(body, m.b2BodyType.b2_staticBody);
			return;
		}
		const md = new m.b2MassData();
		md.mass = massData.mass;
		const center = new m.b2Vec2(massData.center.x, massData.center.y);
		md.center = center;
		md.rotationalInertia = massData.I;
		m.b2Body_SetMassData(body, md);
		center.delete();
		md.delete();
	}

	setMassFromShapes(body: BodyId): void {
		// 2.0 SetMassFromShapes == v3 ApplyMassFromShapes (recompute from shapes).
		this.m.b2Body_ApplyMassFromShapes(body);
	}

	createJoint(_world: WorldId, jointDef: b2JointDef): JointId {
		// Deferred to E3-2: v3 joints are defined by localFrameA/localFrameB
		// transforms, not the 2.x localAnchor+referenceAngle the shared part code
		// Initializes; a faithful mapping (+ a multi-part bot test) is its own
		// phase. No E3-1 path constructs joints.
		throw new Error(`Box2D3Backend.createJoint: joints land in E3-2 (type ${jointDef.type})`);
	}

	destroyBody(_world: WorldId, body: BodyId): void {
		this.bodyUserData.delete(Box2D3Backend.key(body as IdHandle));
		this.m.b2DestroyBody(body);
	}

	destroyJoint(_world: WorldId, _joint: JointId): void {
		throw new Error("Box2D3Backend.destroyJoint: joints land in E3-2");
	}

	// --- spatial query ---
	queryAABB(
		world: WorldId,
		lowerX: number,
		lowerY: number,
		upperX: number,
		upperY: number,
		out: ShapeId[],
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
		// b2World_OverlapAABB invokes the callback with {shapeId} per overlap;
		// return true to continue. Fill `out` up to maxCount (our array-fill
		// contract), then stop.
		m.b2World_OverlapAABB(world, aabb, filter, (result: { shapeId: ShapeId }): boolean => {
			if (count >= maxCount) return false;
			out[count++] = result.shapeId;
			return true;
		});
		lower.delete();
		upper.delete();
		aabb.delete();
		filter.delete();
		return count;
	}

	// --- dynamics ---
	applyForce(body: BodyId, force: Vec2Like, point: Vec2Like): void {
		const m = this.m;
		const f = new m.b2Vec2(force.x, force.y);
		const p = new m.b2Vec2(point.x, point.y);
		m.b2Body_ApplyForce(body, f, p, true);
		f.delete();
		p.delete();
	}

	applyImpulse(body: BodyId, impulse: Vec2Like, point: Vec2Like): void {
		const m = this.m;
		const i = new m.b2Vec2(impulse.x, impulse.y);
		const p = new m.b2Vec2(point.x, point.y);
		m.b2Body_ApplyLinearImpulse(body, i, p, true);
		i.delete();
		p.delete();
	}

	// --- read-back ---
	bodyVelocity(body: BodyId): Vec2Like {
		return this.readVec(this.m.b2Body_GetLinearVelocity(body));
	}

	bodyTransform(body: BodyId): BodyTransform {
		const m = this.m;
		const p = m.b2Body_GetPosition(body);
		const pos = { x: p.x, y: p.y };
		p.delete();
		const rot = m.b2Body_GetRotation(body);
		const angle = m.b2Rot_GetAngle(rot);
		rot.delete();
		return { x: pos.x, y: pos.y, angle };
	}

	// --- per-frame handle ops ---
	wakeBody(body: BodyId): void {
		this.m.b2Body_SetAwake(body, true);
	}

	bodyIsStatic(body: BodyId): boolean {
		const type = this.m.b2Body_GetType(body);
		return type.value === this.m.b2BodyType.b2_staticBody.value;
	}

	shapeTestPoint(shape: ShapeId, _body: BodyId, point: Vec2Like): boolean {
		const m = this.m;
		const p = new m.b2Vec2(point.x, point.y);
		const hit = m.b2Shape_TestPoint(shape, p);
		p.delete();
		return hit;
	}

	shapeTestSegment(
		shape: ShapeId,
		_body: BodyId,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		maxFraction: number,
	): SegmentHit | null {
		const m = this.m;
		// v3 b2Shape_RayCast takes origin + translation (p2-p1) + maxFraction.
		const input = new m.b2RayCastInput();
		const origin = new m.b2Vec2(x1, y1);
		const translation = new m.b2Vec2(x2 - x1, y2 - y1);
		input.origin = origin;
		input.translation = translation;
		input.maxFraction = maxFraction;
		const output = m.b2Shape_RayCast(shape, input);
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

	// --- joint accessors (deferred to E3-2 with createJoint) ---
	jointAnchorA(_joint: JointId): Vec2Like {
		throw new Error("Box2D3Backend.jointAnchorA: joints land in E3-2");
	}

	jointAnchorB(_joint: JointId): Vec2Like {
		throw new Error("Box2D3Backend.jointAnchorB: joints land in E3-2");
	}

	jointBodyA(_joint: JointId): BodyId {
		throw new Error("Box2D3Backend.jointBodyA: joints land in E3-2");
	}

	jointBodyB(_joint: JointId): BodyId {
		throw new Error("Box2D3Backend.jointBodyB: joints land in E3-2");
	}

	// --- contact wiring (deferred to E3-2) ---
	installContactHandlers(_world: WorldId, _hooks: ContactHooks): void {
		// No-op for E3-1: v3 has no contact listener (contacts are polled via
		// b2World_GetContactEvents after each step). Wired in E3-2. Left as a
		// no-op (not a throw) so a world can be created + stepped meanwhile;
		// engine 2 is not reachable from GameCore until the E3-4 UI selector.
	}

	// --- userData read-back (v3 binding has no per-handle userData) ---
	/** The stored userData for a body handle, or undefined. */
	getBodyUserData(body: BodyId): unknown {
		return this.bodyUserData.get(Box2D3Backend.key(body as IdHandle));
	}

	/** The stored userData for a shape handle, or undefined. */
	getShapeUserData(shape: ShapeId): unknown {
		return this.shapeUserData.get(Box2D3Backend.key(shape as IdHandle));
	}

	// --- water / buoyancy (deferred to E3-3) ---
	createWaterController(_world: WorldId, _def: WaterControllerDef): unknown {
		// v3 has no controller framework; buoyancy becomes manual per-step force
		// application over bodies overlapping the fluid AABB. Lands in E3-3.
		throw new Error("Box2D3Backend.createWaterController: water lands in E3-3");
	}

	addWaterBody(_controller: unknown, _body: BodyId): void {
		throw new Error("Box2D3Backend.addWaterBody: water lands in E3-3");
	}

	waterSurface(_controller: unknown): WaterSurfaceReadback {
		throw new Error("Box2D3Backend.waterSurface: water lands in E3-3");
	}
}
