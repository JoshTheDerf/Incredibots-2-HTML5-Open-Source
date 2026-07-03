// PhysicsBackend — the engine seam (P1.5b-1).
//
// A minimal, node-clean abstraction over the physics engine that GameCore and
// the Part classes drive. Introduced so the two planned Box2DFlash TS engines
// (0 = 2.0.2 in src/Box2D, 1 = 2.1a in src/Box2D21) AND a future handle-based
// WASM engine (2 = box2d3-wasm) can all sit behind one interface instead of an
// if/else between class trees. See .agents/ib3-merge/ENGINE-BOX2D3-PLAN.md §C1.
//
// DESIGN CONTRACT (why this shape works for a handle-based WASM engine too):
//
//  - HANDLES ARE OPAQUE. The four handle type params (W/B/S/J = world/body/
//    shape/joint) default to `unknown`. Consumers MUST NOT assume a handle has
//    any structure. The 2.0 adapter (Box2D20Backend) makes them the actual
//    b2World/b2Body/b2Shape/b2Joint objects; a WASM adapter makes them numeric
//    id wrappers. Nothing in this interface returns/accepts a handle it then
//    calls methods on.
//
//  - DEFS ARE PLAIN DATA. createBody/createShape/createJoint take the existing
//    b2*Def objects, but the contract is that an adapter only READS their
//    fields (position, angle, fixedRotation, isBullet; radius/vertices/filter/
//    density/friction/restitution/userData; the post-Initialize joint anchors)
//    — never calls methods on them. A WASM adapter reads those same fields and
//    calls its C-style create functions. Filter bits (category/mask/group) and
//    per-shape userData ride ON the shape def, so they need no separate call.
//
// BOUNDARY (what this seam covers, and what it deliberately does not):
//  covered  — world lifecycle (create/step), body/shape/joint construction and
//             destruction, mass assignment, AABB queries, force/impulse
//             application, and velocity/transform read-back.
//  NOT here — the 2.0-specific ContactFilter and the trigger/condition
//             ContactListener are wired by GameCore onto the returned world
//             handle (contact-event semantics differ per engine; engines 1/2
//             wire their own). Per-frame reads/writes on a live handle that
//             engines 1/2 re-path in their own Init/Update (joint motor
//             SetMotorSpeed/EnableMotor/GetJointAngle, shape TestSegment/
//             TestPoint, body GetXForm/WakeUp/GetWorldPoint, runtime userData
//             get/set) stay direct on the concrete handle for engine 0, which
//             is the only exercised backend in this sub-phase.

//
//  EXTENDED IN P1.5b-2a. Added: the handful of per-frame handle ops whose
//  METHOD NAMES differ across the two Box2DFlash ports (wakeBody = WakeUp vs
//  SetAwake; bodyIsStatic = IsStatic vs GetType; shapeTestPoint/shapeTestSegment
//  = b2Shape.TestPoint/TestSegment vs b2Fixture.TestPoint/RayCast), plus
//  installContactHandlers so each engine wires its OWN contact filter + listener
//  and translates its native contact event into a neutral ContactPointLike for
//  engine-shared hooks (challenge conditions + trigger dispatch stay in
//  GameCore). Joint motor ops (SetMotorSpeed/EnableMotor/GetJointAngle/limits)
//  and body world-space reads (GetWorldPoint/GetWorldCenter/GetAngle) are NOT
//  abstracted: those method names + signatures are byte-identical in both ports,
//  so a stored handle is already engine-agnostic under duck typing.

import type { b2BodyDef, b2JointDef, b2MassData, b2ShapeDef } from "../../Box2D";

/** A plain 2D vector — structural, so an engine-0 b2Vec2 satisfies it. */
export interface Vec2Like {
	x: number;
	y: number;
}

/**
 * The engine-neutral view of a contact event handed to the shared hooks. Each
 * `shapeN` is the engine's touching shape/fixture handle — the SAME object a
 * ShapePart stored via GetShape(), so Condition.ContactAdded can compare it by
 * identity — and answers GetUserData() with that shape's userData record.
 */
export interface ContactPointLike {
	shape1: { GetUserData(): unknown };
	shape2: { GetUserData(): unknown };
}

/**
 * Engine-neutral contact hooks. installContactHandlers invokes onAdd when a new
 * contact begins and onRemove when one ends, passing the neutral point. The hook
 * bodies (condition matching + trigger dispatch) live in GameCore and are
 * identical across engines.
 */
export interface ContactHooks {
	onAdd(point: ContactPointLike): void;
	onRemove(point: ContactPointLike): void;
}

/** Result of a segment/ray cast against one shape: hit fraction + surface normal. */
export interface SegmentHit {
	/** Fraction along the segment where the hit occurred (0..1), like b2RayCastOutput.fraction. */
	lambda: number;
	/** Hit surface normal x. */
	nx: number;
	/** Hit surface normal y. */
	ny: number;
}

/** World construction parameters (bounds + gravity + sleep), as plain data. */
export interface WorldDef {
	lowerX: number;
	lowerY: number;
	upperX: number;
	upperY: number;
	gravityX: number;
	gravityY: number;
	doSleep: boolean;
}

/** Body pose read-back (for rendering / replay). */
export interface BodyTransform {
	x: number;
	y: number;
	angle: number;
}

/**
 * The physics engine seam. Generic over its four opaque handle types so a
 * concrete adapter can pin them to its own representation (engine 0: the b2*
 * objects; engine 2: WASM id wrappers) while callers treat them as opaque.
 */
export interface PhysicsBackend<W = unknown, B = unknown, S = unknown, J = unknown> {
	// --- world lifecycle ---
	/** Build a fresh world. Contact filter/listener are wired by the caller. */
	createWorld(def: WorldDef): W;
	/** Advance the world one solver pass (dt seconds, `iterations` velocity/position iters). */
	step(world: W, dt: number, iterations: number): void;

	// --- construction / destruction (def = plain data, read-only to the adapter) ---
	createBody(world: W, bodyDef: b2BodyDef): B;
	createShape(body: B, shapeDef: b2ShapeDef): S;
	destroyShape(body: B, shape: S): void;
	setMass(body: B, massData: b2MassData): void;
	setMassFromShapes(body: B): void;
	createJoint(world: W, jointDef: b2JointDef): J;
	destroyBody(world: W, body: B): void;
	destroyJoint(world: W, joint: J): void;

	// --- spatial query ---
	/** Fill `out` with up to `maxCount` shape handles overlapping the AABB; return the count. */
	queryAABB(world: W, lowerX: number, lowerY: number, upperX: number, upperY: number, out: S[], maxCount: number): number;

	// --- dynamics ---
	applyForce(body: B, force: Vec2Like, point: Vec2Like): void;
	applyImpulse(body: B, impulse: Vec2Like, point: Vec2Like): void;

	// --- read-back ---
	bodyVelocity(body: B): Vec2Like;
	bodyTransform(body: B): BodyTransform;

	// --- per-frame handle ops whose method names differ across the ports ---
	/** Wake a sleeping body (2.0 WakeUp / 2.1a SetAwake(true)). */
	wakeBody(body: B): void;
	/** True iff the body is static (2.0 IsStatic() / 2.1a GetType()===static). */
	bodyIsStatic(body: B): boolean;
	/**
	 * True iff `point` (world coords) is inside `shape`. The body is passed so
	 * the adapter can supply the transform (2.0 shape.TestPoint(body.GetXForm(),
	 * p); 2.1a fixture.TestPoint(p), which reads its own body transform).
	 */
	shapeTestPoint(shape: S, body: B, point: Vec2Like): boolean;
	/**
	 * Cast the segment (x1,y1)->(x2,y2) against `shape`, clipped to `maxFraction`
	 * of its length. Returns the nearest hit (fraction + normal) or null on miss.
	 * 2.0 shape.TestSegment(body.GetXForm(), lambda, normal, seg, maxFraction);
	 * 2.1a fixture.RayCast(output, input).
	 */
	shapeTestSegment(
		shape: S,
		body: B,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		maxFraction: number,
	): SegmentHit | null;

	// --- contact wiring (each engine installs its own filter + listener) ---
	/** Wire this engine's contact filter + a listener that drives `hooks`. */
	installContactHandlers(world: W, hooks: ContactHooks): void;
}
