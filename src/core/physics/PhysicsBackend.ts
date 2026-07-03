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

import type { b2BodyDef, b2JointDef, b2MassData, b2ShapeDef } from "../../Box2D";

/** A plain 2D vector — structural, so an engine-0 b2Vec2 satisfies it. */
export interface Vec2Like {
	x: number;
	y: number;
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
}
