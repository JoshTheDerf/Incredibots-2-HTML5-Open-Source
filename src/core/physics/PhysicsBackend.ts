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
 * Convert a Box2D normal impulse (mass·velocity units) into the engine-neutral
 * relative NORMAL impact speed used by ContactImpact.speed: J / reducedMass,
 * which equals the relative normal Δv of the two bodies. A static body (mass 0)
 * is treated as infinite mass, so the reduced mass collapses to the dynamic
 * body's mass (a dynamic body hitting the ground gets speed == its own Δv).
 * Used by the 2.0.2 / 2.1a backends (v3 reports approachSpeed directly).
 */
export function impulseToSpeed(normalImpulse: number, mass1: number, mass2: number): number {
	const reduced = mass1 > 0 && mass2 > 0 ? (mass1 * mass2) / (mass1 + mass2) : Math.max(mass1, mass2);
	return reduced > 0 ? Math.abs(normalImpulse) / reduced : 0;
}

/**
 * A solved-contact impact report (superset/prototype fracturing). Unlike the
 * begin/end ContactPointLike, this carries the SEVERITY and LOCATION of a live
 * collision, surfaced once per step from each engine's solver:
 *   - engine 0 (2.0.2): b2ContactListener.Result -> b2ContactResult
 *   - engine 1 (2.1a):  b2ContactListener.PostSolve -> b2ContactImpulse
 *   - engine 2 (v3):    b2ContactHitEvent (enableHitEvents + hit threshold)
 * `speed` is the engine-NEUTRAL metric: the relative NORMAL impact speed in
 * world units/sec. Engines 0/1 derive it from the normal impulse and the two
 * bodies' reduced mass (J/reducedMass == the relative normal Δv); engine 2 scales
 * the hit event's approachSpeed by (1 + combined restitution) to report that SAME
 * post-impulse Δv (v3 exposes no solved impulse on the hit event). This lets the
 * fracture threshold be a single speed value (FRACTURE_BASE_SPEED / fragility)
 * across all three engines.
 * `shape1`/`shape2` are the SAME shape/fixture handles a ShapePart stored via
 * GetShape() (identity-comparable, like ContactPointLike) — the fracture
 * consumer resolves them to parts by identity, which also pinpoints WHICH part
 * of a welded body was hit.
 */
export interface ContactImpact {
	shape1: { GetUserData(): unknown };
	shape2: { GetUserData(): unknown };
	/** Contact point in world coordinates. */
	x: number;
	y: number;
	/** Relative normal impact speed (world units/sec) — engine-neutral severity. */
	speed: number;
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
	/**
	 * OPTIONAL per-step impact report (fracturing). Backends that can surface a
	 * solved contact's impulse/approach speed call this during step(); backends
	 * that can't simply never call it (the consumer no-ops). See ContactImpact.
	 */
	onImpact?(impact: ContactImpact): void;
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
	/**
	 * Restitution combine mode (IB3 superset — b2Settings.useRestitution). Optional;
	 * engines that support it (engine 1 / Box2D 2.1a) apply it at world creation,
	 * others ignore it. 0 = RES_HIGHEST (the default / IB2 behaviour).
	 */
	restitutionType?: number;
}

/** Body pose read-back (for rendering / replay). */
export interface BodyTransform {
	x: number;
	y: number;
	angle: number;
}

// --- water / buoyancy controllers ---
//
// The two Box2DFlash ports (engines 0/1) both ship the 2.1a buoyancy/tide/wave
// controller framework (src/Box2D + src/Box2D21 /Dynamics/Controllers), and both
// worlds Step every registered controller at the top of Solve. WaterSystem owns
// the WaterState -> controller-params projection (density scale, surface offset,
// the tide/wave surface-animation closures) and the buoyant-flag / addedToWater
// bookkeeping; the backend only CREATES the engine's controller, REGISTERS a body
// on it, and reads the live surface back for the renderer — the three ops whose
// concrete classes/handles differ per engine. Water type ints mirror
// SandboxSettings.WATER_TYPE_* / IB3 WaterControl.TYPE_* (Control/WaterControl.as
// :19-21).

/** Water surface type: a tide controller (animated height/tilt). */
export const WATER_TYPE_TIDE = 0;
/** Water surface type: a continuous-wave controller. */
export const WATER_TYPE_WAVE = 1;

/**
 * Plain-data description of a water controller, projected from WaterState by
 * WaterSystem (the single owner of the surface-animation math + unit scaling).
 * Mirrors IB3 WaterControl.Init (Control/WaterControl.as :99-136): TYPE_TIDE ->
 * b2TideController with tideFunc/normalXFunc closures; TYPE_WAVE ->
 * b2WaveController with the fixed continuous generator.
 */
export interface WaterControllerDef {
	/** WATER_TYPE_TIDE (0) / WATER_TYPE_WAVE (1). */
	type: number;
	/** Fluid density, ALREADY Box2D-scaled (Util.DensityToBox2D) by WaterSystem. */
	density: number;
	/** Surface offset along the (0,-1) normal = -height (WaterControl.Init :116/129). */
	surfaceOffset: number;
	/** Linear drag co-efficient (WaterControl.Init :117/130). */
	linearDrag: number;
	/** Angular drag co-efficient (WaterControl.Init :118/131). */
	angularDrag: number;
	/**
	 * Tide-only: offset delta as a function of accumulated sim seconds (the
	 * b2TideController stepTracker). null for wave. WaterSystem supplies the
	 * closed-form closure so the math has one home for BOTH engines.
	 */
	tideFunc: ((t: number) => number) | null;
	/** Tide-only: normal.x delta as a function of accumulated sim seconds. null for wave. */
	normalXFunc: ((t: number) => number) | null;
}

/** One live travelling wave, for the renderer's surface profile (wave type only). */
export interface WaterWaveSample {
	x: number;
	amplitude: number;
	width: number;
	fn: "sin" | "cos";
}

/** Live water-surface read-back for the renderer, refreshed after each step. */
export interface WaterSurfaceReadback {
	/** Current controller offset (tide-animated; -height when static). */
	offset: number;
	/** Current surface normal.x (tilt); 0 = level. */
	normalX: number;
	/** Live travelling waves (wave type only). */
	waves: WaterWaveSample[];
}

/**
 * The physics engine seam. Generic over its four opaque handle types so a
 * concrete adapter can pin them to its own representation (engine 0: the b2*
 * objects; engine 2: WASM id wrappers) while callers treat them as opaque.
 */
export interface PhysicsBackend<W = unknown, B = unknown, S = unknown, J = unknown, C = unknown> {
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

	/**
	 * Hard-set a body's world transform — the replay playback WRITE path (sim-free
	 * sync-point application). The method NAME differs across ports (2.0.2
	 * b2Body.SetXForm / 2.1a b2Body.SetPositionAndAngle / v3 b2Body_SetTransform),
	 * so it must go through the seam rather than a duck-typed handle call — that's
	 * why native engine-1 replays used to crash on a raw SetXForm.
	 */
	setBodyTransform(body: B, x: number, y: number, angle: number): void;

	// --- render-side body enumeration ---
	/**
	 * Invoke `cb` for every live body in the world — the render interpolator's
	 * pre-step pose snapshot needs the full body list. Engines 0/1 walk the
	 * world's native b2Body list (world.GetBodyList()/GetNext()); engine 2 (Box2D
	 * v3, which has NO body-enumeration API off a raw world id) iterates the
	 * bodies it tracks itself. Render-only — never touches the deterministic sim.
	 */
	forEachBody(world: W, cb: (body: B) => void): void;

	// --- per-frame handle ops whose method names differ across the ports ---
	/** Wake a sleeping body (2.0 WakeUp / 2.1a SetAwake(true)). */
	wakeBody(body: B): void;
	/**
	 * Number of shapes/fixtures currently attached to the body. Used by the
	 * fracture runtime (like Bomb.Explode) to decide whether a shattering shape
	 * shares its body with welded neighbours (>1 => remove only its own shape and
	 * keep the body for the neighbours) or owns it alone (destroy the body).
	 */
	bodyShapeCount(body: B): number;
	/**
	 * A shape's body-LOCAL centre. 2.0 exposes b2CircleShape.GetLocalPosition() on
	 * the shape itself, but 2.1a stores it as m_p on the b2CircleShape BEHIND the
	 * fixture (the stored shape handle is the fixture, which has no
	 * GetLocalPosition), and v3 keeps it on the wrapper — so this must go through
	 * the seam. Non-circle shapes return (0,0). Used by Bomb.Explode to find a
	 * (possibly welded) bomb's blast centre on any engine.
	 */
	shapeLocalCenter(shape: S): Vec2Like;
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

	// --- joint accessors whose method names differ across the ports (used by
	//     the per-frame CheckForBreakage checks) ---
	/** World anchor on body A of the joint (2.0 GetAnchor1 / 2.1a GetAnchorA). */
	jointAnchorA(joint: J): Vec2Like;
	/** World anchor on body B of the joint (2.0 GetAnchor2 / 2.1a GetAnchorB). */
	jointAnchorB(joint: J): Vec2Like;
	/** Body A the joint connects (2.0 GetBody1 / 2.1a GetBodyA). */
	jointBodyA(joint: J): B;
	/** Body B the joint connects (2.0 GetBody2 / 2.1a GetBodyB). */
	jointBodyB(joint: J): B;

	// --- contact wiring (each engine installs its own filter + listener) ---
	/** Wire this engine's contact filter + a listener that drives `hooks`. */
	installContactHandlers(world: W, hooks: ContactHooks): void;

	// --- water / buoyancy (controllers stepped by this engine's world.Step) ---
	/**
	 * Build + register a buoyancy/tide/wave controller on the world from the
	 * WaterState-derived def. The returned controller is an OPAQUE handle
	 * (engine 0: the src/Box2D controller; engine 1: the src/Box2D21 controller);
	 * callers pass it back to addWaterBody / waterSurface only.
	 */
	createWaterController(world: W, def: WaterControllerDef): C;
	/** Register a body with the water controller (once — WaterSystem dedups). */
	addWaterBody(controller: C, body: B): void;
	/** Read the live surface (tide offset/tilt + any live waves) for the renderer. */
	waterSurface(controller: C): WaterSurfaceReadback;
}
