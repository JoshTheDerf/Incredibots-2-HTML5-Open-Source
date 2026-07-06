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
// opt-out), positive = always collide, 0 = defer to category/mask.
// CONTACTFILTER RECONCILIATION (E3-5): the shipped Game/ContactFilter.ShouldCollide
// custom short-circuits are now fully ported. Split by nature:
//   - isSandbox FORCE-collide: v3's custom filter is VETO-ONLY (can restrict but
//     cannot force-collide across a b2Filter reject), so this is encoded in the
//     b2FILTER BITS instead — createShape overlays reserved OBJECT_BIT/SANDBOX_BIT
//     (bits 16/17, above the 4 layer nibbles) so sandbox/terrain collides with
//     every object incl. an all-layers-off object that the layer bits alone would
//     make collide with nothing. See the OBJECT_BIT/SANDBOX_BIT constants.
//   - collide=false opt-outs + same-piston-different-body: these are RESTRICTIONS,
//     so they ARE expressible in the veto-only callback — ported verbatim in
//     shouldCollide(), wired via b2World_SetCustomFilterCallback + per-shape
//     enableCustomFiltering. (The negative-groupIndex piston/robot self-collide is
//     still handled by v3's built-in group check, as before.)
// Verified (test/engine3-tuning.test.ts) for terrain-vs-all-off, collide=false,
// and same-piston-two-bodies. Nothing in ContactFilter is left un-portable.
//
// WATER / BUOYANCY (E3-3) — v3 has NO controller framework, so createWaterController
// builds a PLAIN-JS controller (def + registered bodies + animated surface state)
// and step() applies the buoyancy/tide/wave forces MANUALLY before b2World_Step,
// porting the b2BuoyancyController/b2TideController/b2WaveController math (src/Box2D21)
// adapted to v3 shape geometry. Bomb.Explode (engine-agnostic ray fan) runs unchanged
// through the queryAABB / shapeTestSegment / applyForce seam; the only additions this
// phase needed were the duck-typed b2Body.GetXForm()/m_shapeCount and b2Shape.
// GetLocalPosition()/GetFilterData() the shared bomb + ContactFilter code calls.
//
// EMBIND: v3 struct getters + `new` structs are heap-backed ClassHandles; each
// getter returns a FRESH handle. Every transient created here is .delete()d.
// Value-object returns (b2*Id triples, contact-event shape ids) are plain JS
// objects and are NOT deleted.

import { b2Joint, b2Shape } from "../Box2D";
import type { b2BodyDef, b2CircleDef, b2JointDef, b2MassData, b2MouseJointDef, b2PolygonDef, b2PrismaticJointDef, b2RevoluteJointDef, b2ShapeDef } from "../Box2D";
import { WATER_TYPE_WAVE } from "../core/physics/PhysicsBackend";
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
	/**
	 * The shapes created on this body, in creation order. v3 has no cheap
	 * per-body shape enumeration off a raw id, so createShape tracks them here
	 * (populated only on the REAL createBody wrapper; throwaway GetBody()
	 * wrappers stay empty). Used by (a) the manual buoyancy pass, which iterates
	 * each registered body's shapes, and (b) Bomb.Explode's `m_shapeCount` weld
	 * check (b2Body.m_shapeCount in engines 0/1).
	 */
	public readonly shapes: Box2D3Shape[] = [];
	constructor(
		private readonly m: Box2D3Module,
		public readonly id: RawBodyId,
	) {}

	/** 2.0 b2Body.m_shapeCount — used by Bomb.Explode's welded-cluster branch. */
	public get m_shapeCount(): number {
		return this.shapes.length;
	}

	/**
	 * 2.0 b2Body.GetShapeList() — the FIRST shape on this body (2.0 returns the
	 * head of the body's shape list). Draw's cannonball path passes it straight to
	 * DrawShape; a cannonball body has exactly one shape. Returns null if none
	 * (e.g. a throwaway GetBody() wrapper, whose shapes are never populated).
	 */
	public GetShapeList(): Box2D3Shape | null {
		return this.shapes.length ? this.shapes[0] : null;
	}

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
	/** 2.0 b2Body.m_mass field — GameCore reads it to size the mouse-joint maxForce. */
	public get m_mass(): number {
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
	/**
	 * 2.0 b2Body.GetXForm() -> a b2XForm { position, R: b2Mat22 } reconstructed
	 * from the v3 position + rotation. Bomb.Explode reads xf.position / xf.R.colN
	 * to map its local circle centre to world; the 2.0 column-major rotation is
	 * R.col1 = (cos, sin), R.col2 = (-sin, cos).
	 */
	public GetXForm(): { position: Vec2Like; R: { col1: Vec2Like; col2: Vec2Like } } {
		const position = readVec(this.m.b2Body_GetPosition(this.id));
		const a = this.GetAngle();
		const c = Math.cos(a);
		const s = Math.sin(a);
		return { position, R: { col1: { x: c, y: s }, col2: { x: -s, y: c } } };
	}
}

/**
 * Render geometry captured from the plain shape def at creation — the EXACT
 * local verts / radius (and ORDER) engines 0/1 keep on their b2Shape. Draw's
 * geometry readers (m_type / GetRadius / GetLocalPosition / GetVertexCount /
 * GetVertices) return this verbatim, so a shape draws identically on all three
 * engines. Capturing the DEF (not querying v3) is deliberate: v3's b2ComputeHull
 * may REORDER/drop polygon vertices, which would skew cannon vertex order and
 * polygon winding vs engines 0/1.
 */
interface ShapeGeom {
	/** b2Shape.e_circleShape / e_polygonShape. */
	type: number;
	/** Circle radius (0 for polygons). */
	radius: number;
	/** Circle body-local centre (origin for polygons). */
	localPosition: Vec2Like;
	/** Polygon local verts in def order (empty for circles). */
	vertices: Vec2Like[];
}

/**
 * Live collision-filter handle duck-typing the 2.0 b2FilterData fields
 * (categoryBits/maskBits/groupIndex) that engines 0/1 hand back on a real shape.
 *
 * WHY A PROXY (not a plain object): game code MUTATES this in place — e.g.
 * Cannon.Update does `shape.m_filter.groupIndex = 0` to re-enable a fired
 * cannonball's collision after it clears the barrel. On engines 0/1 that write
 * lands on the live fixture filter the contact filter reads; a v3 shape's filter
 * is an OPAQUE snapshot inside the wasm, so a bare object would drift out of sync
 * (the cannonball would pass through its own robot forever). Each setter here
 * re-pushes the current bits to the v3 shape via b2Shape_SetFilter.
 *
 * Reads return the UN-augmented game bits (what GetFilterData / PrismaticJoint /
 * the bomb base-filter expect); the v3 shape's filter additionally carries the
 * reserved OBJECT_BIT/SANDBOX_BIT overlay (see createShape + the constants), which
 * every commit re-applies so the ContactFilter isSandbox force-collide survives a
 * mid-sim filter mutation.
 */
class Box2D3ShapeFilter {
	constructor(
		private readonly m: Box2D3Module,
		private readonly shapeId: RawShapeId,
		private readonly isSandbox: boolean,
		private categoryBits_: number,
		private maskBits_: number,
		private groupIndex_: number,
	) {}

	public get categoryBits(): number {
		return this.categoryBits_;
	}
	public set categoryBits(v: number) {
		this.categoryBits_ = v;
		this.commit();
	}
	public get maskBits(): number {
		return this.maskBits_;
	}
	public set maskBits(v: number) {
		this.maskBits_ = v;
		this.commit();
	}
	public get groupIndex(): number {
		return this.groupIndex_;
	}
	public set groupIndex(v: number) {
		this.groupIndex_ = v;
		this.commit();
	}

	/** Rebuild the v3 b2Filter (game bits + isSandbox overlay) and push it live. */
	private commit(): void {
		const f = new this.m.b2Filter();
		if (this.isSandbox) {
			// Sandbox/terrain collides with EVERY object (any layer, even all-off).
			f.categoryBits = this.categoryBits_ | SANDBOX_BIT;
			f.maskBits = this.maskBits_ | OBJECT_BIT;
		} else {
			f.categoryBits = this.categoryBits_ | OBJECT_BIT;
			f.maskBits = this.maskBits_ | SANDBOX_BIT;
		}
		f.groupIndex = this.groupIndex_;
		this.m.b2Shape_SetFilter(this.shapeId, f);
		f.delete();
	}
}

/**
 * A v3 shape wrapper: userData + the filter used at creation (parts read
 * m_filter.groupIndex) + the render geometry (see ShapeGeom). It duck-types the
 * b2Shape read surface the shared Part code AND the pixi renderer (Draw.DrawShape
 * / DrawCannon via resolveShape) call directly — engines 0/1 hand out the real
 * b2Shape, so these must answer identically.
 */
export class Box2D3Shape {
	public userData: unknown = null;
	/**
	 * Live filter handle: writes (e.g. Cannon's groupIndex = 0) propagate to the v3
	 * shape via b2Shape_SetFilter; reads return the un-augmented game bits.
	 */
	public readonly m_filter: Box2D3ShapeFilter;
	/**
	 * b2Shape.e_circleShape / e_polygonShape. Draw.resolveShape treats a handle
	 * with a defined m_type as a ready-to-read b2Shape (and its switch keys off
	 * this), so exposing it is what lets engine-2 shapes render through the shared
	 * Draw path unchanged.
	 */
	public readonly m_type: number;
	private readonly geom: ShapeGeom;
	constructor(
		private readonly m: Box2D3Module,
		public readonly id: RawShapeId,
		filter: { categoryBits: number; maskBits: number; groupIndex: number },
		geom: ShapeGeom,
		isSandbox: boolean,
	) {
		this.m_filter = new Box2D3ShapeFilter(m, id, isSandbox, filter.categoryBits, filter.maskBits, filter.groupIndex);
		this.geom = geom;
		this.m_type = geom.type;
	}
	// biome-ignore lint/suspicious/noExplicitAny: matches the 2.0 shape.GetUserData() any.
	public GetUserData(): any {
		return this.userData;
	}
	/** 2.0 shape.GetFilterData() — the base b2ContactFilter.ShouldCollide reads this. */
	public GetFilterData(): { categoryBits: number; maskBits: number; groupIndex: number } {
		return this.m_filter;
	}
	/**
	 * 2.0 b2CircleShape.GetLocalPosition() — the circle's body-local centre. Read
	 * by Bomb.Explode + Draw's bomb/circle paths. Backed by the captured def geom.
	 */
	public GetLocalPosition(): Vec2Like {
		return this.geom.localPosition;
	}
	/** 2.0 b2CircleShape.GetRadius() — Draw's circle path. */
	public GetRadius(): number {
		return this.geom.radius;
	}
	/** 2.0 b2PolygonShape.GetVertexCount() — Draw's polygon path. */
	public GetVertexCount(): number {
		return this.geom.vertices.length;
	}
	/** 2.0 b2PolygonShape.GetVertices() — local verts in def order (Draw maps each by the body xform). */
	public GetVertices(): Vec2Like[] {
		return this.geom.vertices;
	}
	/** Owning body (2.0 fixture.GetBody()); a throwaway wrapper is fine (reads only). */
	public GetBody(): Box2D3Body {
		return new Box2D3Body(this.m, this.m.b2Shape_GetBody(this.id));
	}
}

/**
 * revolute / prismatic dispatch the wrapper's duck-typed motor ops to the right
 * v3 fns; "mouse" is the user-drag joint (2.x b2MouseJoint), which v3 dropped —
 * we back it with a v3 MOTOR joint (see createMouse) and expose only SetTarget.
 */
type JointKind = "revolute" | "prismatic" | "mouse";

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

	/**
	 * 2.0 b2MouseJoint.SetTarget — retarget the user-drag joint to a new world
	 * point. Our v3 mouse joint is a motor joint anchored on the (origin, identity)
	 * ground body, so frameA.p is the target in WORLD == ground-local coords; move
	 * it and wake the bodies so the spring drags the grabbed point along.
	 */
	public SetTarget(target: Vec2Like): void {
		if (this.kind !== "mouse") return;
		const m = this.m;
		const t = new m.b2Transform();
		const p = new m.b2Vec2(target.x, target.y);
		const q = m.b2MakeRot(0);
		t.p = p;
		t.q = q;
		m.b2Joint_SetLocalFrameA(this.id, t);
		m.b2Joint_WakeBodies(this.id);
		p.delete();
		q.delete();
		t.delete();
	}

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

// ---------------------------------------------------------------------------
// SOLVER-FEEL TUNING (E3-5). v3's soft-step solver differs from Box2DFlash
// 2.0.2/2.1a, so these are set + PINNED so engine-2 feel tracks engines 0/1 and
// doesn't drift if box2d3-wasm changes its defaults. Chosen by a cross-engine
// metric sweep (test/engine3-tuning.test.ts + the E3-5 report); values that
// equal the v3 default are pinned deliberately, not left implicit.
//
// UNIT SCALE: our physics world is ALREADY ~1 unit = 1 metre — the "30" in the
// codebase (ControllerMainMenu.m_physScale / Draw.m_drawScale) is a RENDER
// px/unit multiplier, NOT a physics scale; bodies are built in metre-ish units
// (a 2x2 part is ~2 m, gravity ~15 m/s^2). So v3's length-based tuning constants
// (contact speculative distance, sleep/restitution thresholds — all calibrated
// for 1 unit == 1 m) already match us at b2_lengthUnitsPerMeter == 1. NB
// box2d3-wasm does NOT bind b2SetLengthUnitsPerMeter anyway, so 1 is forced; this
// is fine precisely because our world is metre-scale.

/**
 * v3 Step takes a single sub-step count (not the 2.x velocity/position split). 4
 * is the v3-recommended default; the E3-5 sweep found 8/16 give NO measurable
 * gain on our bots (rest sink, settle time, stacking under load, car travel were
 * already indistinguishable from engines 0/1 at 4), so 4 stays — extra sub-steps
 * would only cost CPU. The incoming 2.0 `iterations` is a different solver
 * concept, not forwarded.
 */
const B2_SUB_STEP_COUNT = 4;

/**
 * Contact-constraint stiffness (Hz). v3 default 30; kept. Must stay <= 0.25 * the
 * sub-step rate (4 sub-steps * 60 fps = 240 Hz -> cap 60) to avoid contact
 * jitter; 30 is stiff enough that bodies rest AT the surface with no visible
 * sink (measured rest y == ideal to <1 mm, matching engines 0/1) and no jitter.
 */
const CONTACT_HERTZ = 30;

/**
 * Contact damping ratio. v3 default 10; kept. High damping = contacts settle
 * without bouncing out (near-critically damped), which is what the rigid
 * Box2DFlash contacts effectively did. Lowering it did not recover v3's slightly
 * lower restitution (see below) and risks lively contacts, so 10 stays.
 */
const CONTACT_DAMPING_RATIO = 10;

/**
 * Relative normal speed below which restitution (bounce) is suppressed. v3
 * default 1.0 (in length-units/s) == Box2DFlash 2.0.2/2.1a b2_velocityThreshold
 * (1.0) at our 1-unit==1-m scale, so a bounce triggers under the same impact
 * speed on all three engines. Pinned to 1.0 to keep that parity.
 *
 * KNOWN RESIDUAL: for the SAME restitution coefficient, v3's split-solver
 * restitution rebounds ~20% lower than Box2DFlash (measured: a max-restitution
 * box rebounds ~9.8 units under engine 2 vs ~12.5/12.9 under engines 0/1). The
 * E3-5 sweep confirmed this is INHERENT to v3's restitution model — it does not
 * respond to contactHertz/damping/sub-step tuning — and it errs on the SAFE side
 * (slightly less bounce, never excessive). Left as-is rather than faked by
 * inflating the per-shape restitution.
 */
const RESTITUTION_THRESHOLD = 1.0;
// Approach speed (world units/sec) above which v3 emits a contact HIT event, used
// by the fracture system. Kept low so any impact the fracture threshold could
// care about is reported; the fracture consumer filters non-fragile pairs.
const HIT_EVENT_THRESHOLD = 1.0;

// Reserved collision-filter bits for the ContactFilter reconciliation (E3-5).
// Layers A-D occupy bits 0-15 (ShapePart.CollisionBits); bits 16/17 are free and
// within the 32-bit `b2Filter.categoryBits` field (the 64-bit getters/setters are
// avoided — we never need >18 bits). These encode the ContactFilter `isSandbox`
// FORCE-collide that a veto-only custom callback cannot express (see the filter
// block in installContactHandlers + createShape). OBJECT_BIT tags every real
// shape; SANDBOX_BIT tags sandbox/terrain. A sandbox shape's mask carries
// OBJECT_BIT and its category SANDBOX_BIT, and every object's mask carries
// SANDBOX_BIT + category OBJECT_BIT, so sandbox collides with EVERY object —
// even an all-layers-off object (categoryBits 0) that would otherwise collide
// with nothing — exactly matching ContactFilter's isSandbox short-circuit. The
// bits never make two OBJECTS collide (OBJECT_BIT is only ever in a mask via
// SANDBOX_BIT and vice-versa; object-vs-object still reduces to shared layers).
const OBJECT_BIT = 1 << 16; // 0x10000
const SANDBOX_BIT = 1 << 17; // 0x20000

/** ±MAX_VALUE "no limit" sentinels from the 2.x defs -> a large finite bound
 * (v3 SetLimits with 1.79e308 risks NaN); ~5730 turns is effectively unlimited. */
const LIMIT_INF = 1e5;

/**
 * User-drag (mouse) joint spring tuning. v3 dropped the b2MouseJoint, so the drag
 * is a motor joint's LINEAR spring; these give the same soft, slightly-damped pull
 * the 2.x mouse joint had (2.x default frequencyHz 5 / dampingRatio 0.7). The
 * force is capped by the 2.x maxForce (300 * body mass) at the call site, so the
 * spring stiffness here only sets the FEEL, not the strength ceiling.
 */
const MOUSE_JOINT_HERTZ = 5;
const MOUSE_JOINT_DAMPING_RATIO = 0.7;

export class Box2D3Backend implements PhysicsBackend<RawWorldId, Box2D3Body, Box2D3Shape, Box2D3Joint> {
	private readonly m: Box2D3Module;
	/** Resolve a v3 shape id (from a contact/sensor event) back to its wrapper. */
	private shapesById = new Map<string, Box2D3Shape>();
	/**
	 * Every live body wrapper this backend created, in creation order. v3 has NO
	 * body-enumeration API off a raw world id, so we track them here to serve the
	 * render interpolator's forEachBody snapshot (engines 0/1 walk world.GetBodyList
	 * instead). Only the REAL createBody wrappers land here (throwaway GetBody()/
	 * joint-body wrappers don't), so identity matches the bodies parts hand to the
	 * renderer. Reset with the world; entries removed on destroyBody.
	 */
	private bodies = new Set<Box2D3Body>();
	/**
	 * A static body at the world origin, created lazily as bodyA for the user-drag
	 * (mouse) joint — v3, unlike 2.x, has no implicit world ground body. NOT added
	 * to `bodies` (it's not a part body; static, so the interpolator ignores it).
	 * Reset with the world.
	 */
	private groundBody: RawBodyId | null = null;
	/** Engine-neutral contact hooks, drained after each step (v3 has no listener). */
	private contactHooks: ContactHooks | null = null;
	/**
	 * Active water controllers for the current world. v3 has NO controller
	 * framework, so buoyancy/tide/wave are applied MANUALLY here at the top of
	 * each step() (see the E3-3 block below). Reset with the world.
	 */
	private waterControllers: Box2D3WaterController[] = [];

	constructor(module: Box2D3Module) {
		this.m = module;
	}

	// --- world lifecycle ---
	createWorld(def: WorldDef): RawWorldId {
		const m = this.m;
		// A fresh world starts a fresh sim: drop any stale shape map / hooks from a
		// previous play (the backend is a process-wide singleton).
		this.shapesById = new Map();
		this.bodies = new Set();
		this.groundBody = null;
		this.contactHooks = null;
		this.waterControllers = [];
		const wd = m.b2DefaultWorldDef();
		const g = new m.b2Vec2(def.gravityX, def.gravityY);
		wd.gravity = g;
		wd.enableSleep = def.doSleep;
		// E3-5 solver-feel tuning (pinned; see the constants above).
		wd.contactHertz = CONTACT_HERTZ;
		wd.contactDampingRatio = CONTACT_DAMPING_RATIO;
		wd.restitutionThreshold = RESTITUTION_THRESHOLD;
		// v3 uses a dynamic tree; the 2.0 world AABB bounds are obsolete (as in 2.1a).
		const world = m.b2CreateWorld(wd);
		// Fracture hit events: fire once a contact's approach speed exceeds this
		// (world units/sec). Low enough to catch any impact the fracture threshold
		// (FRACTURE_BASE_SPEED / fragility) could care about; the fracture consumer
		// filters the rest. See drainContactEvents' hit-event loop.
		m.b2World_SetHitEventThreshold(world, HIT_EVENT_THRESHOLD);
		g.delete();
		wd.delete();
		return world;
	}

	step(world: RawWorldId, dt: number, _iterations: number): void {
		// v3 has NO controller framework: engines 0/1 step their buoyancy/tide/wave
		// controllers INSIDE world.Solve (top of the step); we mirror that by
		// applying the same forces MANUALLY here, BEFORE integration.
		for (const c of this.waterControllers) this.applyWaterController(c, dt);
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
		this.bodies.add(body);
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
		// Hit events surface high-speed impacts (point + approachSpeed) for the
		// fracture system — the v3 equivalent of engine 0/1's Result/PostSolve.
		// The per-world hit threshold (set in createWorld) gates which fire.
		sd.enableHitEvents = true;
		// ContactFilter reconciliation (E3-5): the veto-only custom callback (wired
		// in installContactHandlers) handles the collide=false / same-piston OPT-OUTS
		// but CANNOT force-collide across a b2Filter reject, so it can't express
		// ContactFilter's isSandbox force-collide alone. Opt every shape into the
		// custom callback and encode the sandbox force-collide directly in the filter
		// bits below.
		sd.enableCustomFiltering = true;
		// Collision layers: our 2.0 category/mask/group bits map 1:1 onto v3's
		// b2Filter (same encoding ShapePart.CollisionBits computes; same negative=
		// never / positive=always / 0=defer semantics as Box2DFlash 2.0/2.1a). We
		// KEEP the un-augmented game bits on the wrapper's m_filter (what parts +
		// the bomb's base-filter read via GetFilterData()); only the v3 shape's
		// filter gets the reserved OBJECT_BIT/SANDBOX_BIT overlay (see the constants)
		// that encodes ContactFilter's isSandbox force-collide.
		const filter = { categoryBits: shapeDef.filter.categoryBits, maskBits: shapeDef.filter.maskBits, groupIndex: shapeDef.filter.groupIndex };
		const ud = shapeDef.userData as { isSandbox?: boolean } | null;
		const isSandbox = !!(ud && ud.isSandbox);
		if (isSandbox) {
			// Sandbox/terrain collides with EVERY object (any layer, even all-off).
			sd.filter.categoryBits = filter.categoryBits | SANDBOX_BIT;
			sd.filter.maskBits = filter.maskBits | OBJECT_BIT;
		} else {
			sd.filter.categoryBits = filter.categoryBits | OBJECT_BIT;
			sd.filter.maskBits = filter.maskBits | SANDBOX_BIT;
		}
		sd.filter.groupIndex = filter.groupIndex;

		let raw: RawShapeId;
		let geom: ShapeGeom;
		if (shapeDef.type === b2Shape.e_circleShape) {
			const cd = shapeDef as b2CircleDef;
			// Capture the render geom from the def (see ShapeGeom): exact centre + radius.
			geom = { type: b2Shape.e_circleShape, radius: cd.radius, localPosition: { x: cd.localPosition.x, y: cd.localPosition.y }, vertices: [] };
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
			// Capture the render geom from the def IN ORIGINAL ORDER — NOT from the v3
			// hull, whose vertex order/count b2ComputeHull may change (see ShapeGeom).
			const verts: Vec2Like[] = [];
			for (let i = 0; i < pd.vertexCount; i++) verts.push({ x: pd.vertices[i].x, y: pd.vertices[i].y });
			geom = { type: b2Shape.e_polygonShape, radius: 0, localPosition: { x: 0, y: 0 }, vertices: verts };
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
		const shape = new Box2D3Shape(m, raw, filter, geom, isSandbox);
		if (shapeDef.userData != null) shape.userData = shapeDef.userData;
		this.shapesById.set(keyOf(raw as IdTriple), shape);
		body.shapes.push(shape);
		return shape;
	}

	destroyShape(body: Box2D3Body, shape: Box2D3Shape): void {
		this.shapesById.delete(keyOf(shape.id as IdTriple));
		const idx = body.shapes.indexOf(shape);
		if (idx >= 0) body.shapes.splice(idx, 1);
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
		// b2MouseJoint (user drag during the sim). v3 REMOVED the mouse joint, so we
		// back it with a motor joint (see createMouse). Weld isn't reached — plain
		// fixed welds are a shared body (mirroring engines 0/1).
		if (type === b2Joint.e_mouseJoint) return this.createMouse(world, jointDef as b2MouseJointDef);
		throw new Error(`Box2D3Backend.createJoint: unsupported joint type ${type}`);
	}

	/**
	 * The v3 static ground body (bodyA for the mouse joint), created once per world.
	 * v3 has no implicit world ground body like 2.x's world.m_groundBody.
	 */
	private ensureGroundBody(world: RawWorldId): RawBodyId {
		if (this.groundBody) return this.groundBody;
		const m = this.m;
		const bd = m.b2DefaultBodyDef();
		bd.type = m.b2BodyType.b2_staticBody;
		const g = m.b2CreateBody(world, bd);
		bd.delete();
		this.groundBody = g;
		return g;
	}

	/**
	 * User-drag "mouse" joint. v3 has no b2MouseJoint, so this is a v3 MOTOR joint:
	 * a soft LINEAR spring dragging the grabbed body point toward the cursor, with
	 * NO angular constraint (the body pivots freely under the off-centre pull, just
	 * like a 2.x mouse joint). bodyA is the origin/identity ground body, so the
	 * frameA point IS the world target (and SetTarget just moves frameA.p).
	 *   frameA.p = target (world)                     — where we drag TO
	 *   frameB.p = target mapped into bodyB-local      — the grabbed point
	 * maxForce (2.x = 300 * mass) maps to both the spring + velocity force caps.
	 */
	private createMouse(world: RawWorldId, s: b2MouseJointDef): Box2D3Joint {
		const m = this.m;
		const bodyB = (s.body2 as unknown as Box2D3Body).id;
		const ground = this.ensureGroundBody(world);
		const jd = m.b2DefaultMotorJointDef();
		const base = jd.base;
		base.bodyIdA = ground;
		base.bodyIdB = bodyB;
		base.collideConnected = false;
		// frameA on ground (origin, identity) => its point is the world target.
		this.withFrame(s.target.x, s.target.y, 0, (t) => {
			base.localFrameA = t as typeof base.localFrameA;
		});
		// frameB on bodyB = the grabbed point, i.e. the target in bodyB-local coords.
		const wp = new m.b2Vec2(s.target.x, s.target.y);
		const localP = readVec(m.b2Body_GetLocalPoint(bodyB, wp));
		wp.delete();
		this.withFrame(localP.x, localP.y, 0, (t) => {
			base.localFrameB = t as typeof base.localFrameB;
		});
		// Soft LINEAR spring toward frameA — this IS the drag. Its own damping ratio
		// gives the settle; maxSpringForce bounds it at the 2.x maxForce (300*mass).
		jd.linearHertz = MOUSE_JOINT_HERTZ;
		jd.linearDampingRatio = MOUSE_JOINT_DAMPING_RATIO;
		jd.maxSpringForce = s.maxForce;
		// The VELOCITY motor (target velocity 0) is DISABLED: with a non-zero cap it
		// drives the relative velocity to zero and cancels the spring, so a
		// centre-grabbed body only creeps. The spring + damping ratio alone give the
		// mouse-joint feel.
		jd.maxVelocityForce = 0;
		// NO angular constraint — a mouse joint never rotates the body to a target.
		jd.angularHertz = 0;
		jd.maxSpringTorque = 0;
		jd.maxVelocityTorque = 0;
		const raw = m.b2CreateMotorJoint(world, jd);
		jd.delete();
		return new Box2D3Joint(m, raw, "mouse");
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
		this.bodies.delete(body);
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
			out[count++] =
				existing ??
				// A shape we didn't create (never drawn): benign empty geom, unknown type
				// so it matches no Draw switch case if it ever reached the renderer.
				new Box2D3Shape(m, result.shapeId, { categoryBits: 0, maskBits: 0, groupIndex: 0 }, { type: b2Shape.e_unknownShape, radius: 0, localPosition: { x: 0, y: 0 }, vertices: [] }, false);
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

	setBodyTransform(body: Box2D3Body, x: number, y: number, angle: number): void {
		// Box2D3Body.SetXForm wraps v3 b2Body_SetTransform(pos, rot).
		body.SetXForm({ x, y }, angle);
	}

	shapeLocalCenter(shape: Box2D3Shape): Vec2Like {
		// The wrapper carries the circle's body-local centre (geom.localPosition).
		const p = shape.GetLocalPosition();
		return { x: p.x, y: p.y };
	}

	forEachBody(_world: RawWorldId, cb: (body: Box2D3Body) => void): void {
		// v3 has no world body list; iterate the wrappers we tracked at createBody.
		for (const b of this.bodies) cb(b);
	}

	// --- per-frame handle ops ---
	wakeBody(body: Box2D3Body): void {
		this.m.b2Body_SetAwake(body.id, true);
	}

	bodyShapeCount(body: Box2D3Body): number {
		return this.m.b2Body_GetShapeCount(body.id);
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
	installContactHandlers(world: RawWorldId, hooks: ContactHooks): void {
		// v3 has NO listener — just remember the hooks; step() drains the polled
		// begin/end touch events into them after each b2World_Step.
		this.contactHooks = hooks;
		// ContactFilter reconciliation (E3-5). v3's custom filter is VETO-ONLY: it
		// runs AFTER the built-in b2Filter (category/mask/group) passes and can only
		// FURTHER restrict a pair (return false = don't collide) — it can't force a
		// pair to collide across a b2Filter reject. So we split the shipped
		// Game/ContactFilter.ShouldCollide:
		//   - isSandbox FORCE-collide  -> encoded in the b2Filter bits at createShape
		//     (OBJECT_BIT/SANDBOX_BIT), so those pairs already pass the built-in
		//     filter and reach this callback; here we simply DON'T veto them.
		//   - collide=false opt-outs + same-piston-different-body -> the veto clauses
		//     below, a 1:1 port of ContactFilter.ShouldCollide's restriction clauses
		//     (the base super.ShouldCollide == category/mask/group is v3's built-in
		//     check, already applied before we're called).
		// Negative-groupIndex self-collision (robot/piston) is handled by v3's
		// built-in group check, exactly as in engines 0/1 — nothing to do here.
		this.m.b2World_SetCustomFilterCallback(world, (idA: RawShapeId, idB: RawShapeId): boolean =>
			this.shouldCollide(idA, idB),
		);
	}

	/**
	 * Veto-only custom filter (E3-5): a direct port of Game/ContactFilter.
	 * ShouldCollide MINUS the base category/mask/group check (v3 already did it) and
	 * MINUS the isSandbox force-collide (now in the filter bits). Returns true to
	 * allow the collision v3's filter already accepted, false to veto it.
	 */
	private shouldCollide(idA: RawShapeId, idB: RawShapeId): boolean {
		const s1 = this.shapesById.get(keyOf(idA as IdTriple));
		const s2 = this.shapesById.get(keyOf(idB as IdTriple));
		if (!s1 || !s2) return true; // unknown shape: don't restrict
		// biome-ignore lint/suspicious/noExplicitAny: userData is the 2.0 shape any.
		const u1 = s1.userData as any;
		// biome-ignore lint/suspicious/noExplicitAny: userData is the 2.0 shape any.
		const u2 = s2.userData as any;
		// isSandbox short-circuit -> never veto (matches ContactFilter returning true).
		if ((u1 && u1.isSandbox) || (u2 && u2.isSandbox)) return true;
		if (u1 && u2) {
			// collide=false opt-outs (ContactFilter.ts:11-15).
			if (!u1.collide && (!u1.editable || u2.editable) && (u1.isPiston === -1 || u2.isPiston === -1)) return false;
			if (!u2.collide && (!u2.editable || u1.editable) && (u1.isPiston === -1 || u2.isPiston === -1)) return false;
			if (u1.isPiston !== -1 && u2.isPiston !== -1 && !u1.collide && (!u1.editable || u2.editable)) return false;
			if (u1.isPiston !== -1 && u2.isPiston !== -1 && !u2.collide && (!u2.editable || u1.editable)) return false;
			// Two shaft segments of the SAME piston on DIFFERENT bodies never collide
			// (ContactFilter.ts:26). Compare body ids via the raw v3 handle.
			if (
				u1.isPiston !== -1 &&
				u2.isPiston !== -1 &&
				u1.isPiston === u2.isPiston &&
				keyOf(this.m.b2Shape_GetBody(idA) as IdTriple) !== keyOf(this.m.b2Shape_GetBody(idB) as IdTriple)
			) {
				return false;
			}
		}
		return true;
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
		// Hit events → fracture impact reports. NORMALIZED to the engines-0/1
		// severity metric so the fracture threshold compares the SAME quantity across
		// all three backends. Engines 0/1 feed impulseToSpeed(J, m1, m2) = J/reducedMass,
		// which is the relative normal Δv the solver applied = (1 + e)·approachSpeed
		// (mass-independent). v3's hit event only gives the PRE-impact approachSpeed, so
		// scale it by (1 + combined restitution) to report that post-impulse Δv rather
		// than the raw closing speed (which underreported by the (1+e) factor and tripped
		// the threshold at a different real impact than engines 0/1). Restitution is
		// combined with Box2D's default b2MixRestitution = max(eA, eB).
		if (hooks.onImpact) {
			const hitCount = ce.hitCount;
			for (let i = 0; i < hitCount; i++) {
				const ev = ce.GetHitEvent(i);
				const s1 = this.shapesById.get(keyOf(ev.shapeIdA as IdTriple));
				const s2 = this.shapesById.get(keyOf(ev.shapeIdB as IdTriple));
				if (s1 && s2 && ev.approachSpeed > 0) {
					const e = Math.max(m.b2Shape_GetRestitution(ev.shapeIdA), m.b2Shape_GetRestitution(ev.shapeIdB));
					const speed = ev.approachSpeed * (1 + e);
					hooks.onImpact({ shape1: s1, shape2: s2, x: ev.point.x, y: ev.point.y, speed });
				}
				deleteHandle(ev);
			}
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

	// --- water / buoyancy (E3-3: MANUAL per-step force application) ---
	//
	// v3 has no b2*Controller framework, so instead of newing a native controller
	// (engines 0/1) we build a plain JS controller object and apply the ported
	// b2BuoyancyController / b2TideController / b2WaveController math ourselves in
	// step() (see applyWaterController). WaterSystem still owns the density scale +
	// surface-animation closures on the def; this backend only stores the def, the
	// registered bodies, and the animated surface state. The density is already
	// Util.DensityToBox2D-scaled (same as engines 0/1).
	createWaterController(world: RawWorldId, def: WaterControllerDef): Box2D3WaterController {
		const controller: Box2D3WaterController = {
			world,
			def,
			bodies: new Set<Box2D3Body>(),
			// 2.1a b2TideController.stepTracker: accumulated sim seconds, feeds
			// tideFunc/normalXFunc. Starts at 0 (first Step captures origOffset).
			time: 0,
			// Current (tide-animated) surface plane. normal is (normalX, -1).
			origOffset: def.surfaceOffset,
			offset: def.surfaceOffset,
			normalX: 0,
			// Wave state (2.1a b2WaveController). The wave type builds the fixed
			// ContinuousWaves generator WaterControl.Init used: sin, amp 1, width 5,
			// speed 0.1 (WaterControl.as :132; box2d21 Backend createWaterController).
			waves: [],
			waveGenBase:
				def.type === WATER_TYPE_WAVE
					? { x: 0, amplitude: 1, width: 5, speed: 0.1, decay: 0, cos: false, fromGenerator: true }
					: null,
			// b2WaveController.ContinuousWaves: waveGenCounter = waveGenBase.width.
			waveGenCounter: def.type === WATER_TYPE_WAVE ? 5 : 0,
		};
		this.waterControllers.push(controller);
		return controller;
	}

	addWaterBody(controller: Box2D3WaterController, body: Box2D3Body): void {
		controller.bodies.add(body); // Set dedups (WaterSystem also guards).
	}

	waterSurface(controller: Box2D3WaterController): WaterSurfaceReadback {
		// Mirror Box2D21Backend.waterSurface: current offset + normal.x, plus any
		// live travelling waves (wave type only) for the renderer's surface profile.
		const waves: WaterSurfaceReadback["waves"] = controller.waves.map((w) => ({
			x: w.x,
			amplitude: w.amplitude,
			width: w.width,
			fn: w.cos ? ("cos" as const) : ("sin" as const),
		}));
		return { offset: controller.offset, normalX: controller.normalX, waves };
	}

	/**
	 * Apply one step of buoyancy/drag for a water controller BEFORE b2World_Step,
	 * PORTED from src/Box2D21 b2TideController.Step + b2BuoyancyController.Step
	 * (tide) and b2WaveController.Step (wave). Advances the controller's sim-time
	 * so tide/wave animate. The submerged area + centroid per shape is computed by
	 * the ported b2*Shape.ComputeSubmergedArea math against the current surface.
	 */
	private applyWaterController(c: Box2D3WaterController, dt: number): void {
		const m = this.m;
		const g = m.b2World_GetGravity(c.world);
		const gx = g.x;
		const gy = g.y;
		g.delete();
		const isWave = c.def.type === WATER_TYPE_WAVE;

		if (isWave) {
			this.stepWaveGenerator(c);
		} else {
			// b2TideController.Step: offset/normal.x = func(stepTracker) + orig.
			c.offset = (c.def.tideFunc ? c.def.tideFunc(c.time) : 0) + c.origOffset;
			c.normalX = c.def.normalXFunc ? c.def.normalXFunc(c.time) : 0;
		}

		for (const body of c.bodies) {
			// Skip static bodies (forces are no-ops; WaterSystem already excludes them).
			if (this.bodyIsStatic(body)) continue;
			// Per-body surface plane: tide uses the shared animated plane; wave
			// derives a per-body normal/offset from the waves under the body's x.
			let nx: number;
			let ny: number;
			let offset: number;
			if (isWave) {
				const px = m.b2Body_GetPosition(body.id);
				const bx = px.x;
				px.delete();
				const wave = this.waveSurfaceAt(c, body, bx);
				nx = wave.nx;
				ny = wave.ny;
				offset = wave.offset;
			} else {
				nx = c.normalX;
				ny = -1;
				offset = c.offset;
			}
			this.applyBuoyancyToBody(c, body, nx, ny, offset, gx, gy);
		}

		c.time += dt;
	}

	/** b2WaveController generator: spawn a wave from the base every width/speed steps. */
	private stepWaveGenerator(c: Box2D3WaterController): void {
		const base = c.waveGenBase;
		if (!base) return;
		c.waveGenCounter += base.speed;
		if (c.waveGenCounter > base.width || c.waveGenCounter < -base.width) {
			c.waves.push({ ...base });
			c.waveGenCounter = 0;
		}
	}

	/**
	 * b2WaveController.StepAndCheckForWave + waveNormal/waveOffset derivation: step
	 * every wave once (decay + travel, cull off-screen), then sum the value/normalX
	 * of the waves overlapping the body's x, and fold into a per-body surface plane.
	 */
	private waveSurfaceAt(
		c: Box2D3WaterController,
		body: Box2D3Body,
		bx: number,
	): { nx: number; ny: number; offset: number } {
		const MAX_AMP = 500;
		let val = 0;
		let normalX = 0;
		for (let i = c.waves.length - 1; i >= 0; i--) {
			const w = c.waves[i];
			if (w.amplitude > MAX_AMP) w.amplitude = MAX_AMP;
			// b2Wave.Step: decay amplitude, travel by speed.
			if (w.amplitude > 0) w.amplitude -= w.decay;
			if (w.amplitude < 0) w.amplitude = 0;
			w.x += w.speed;
			if (w.amplitude <= 0) {
				c.waves.splice(i, 1);
				continue;
			}
			const dist = bx - w.x;
			const half = w.width / 2;
			if (dist > -half && dist < half) {
				val += waveValueAt(w, dist);
				normalX += waveNormalXAt(w, dist);
			}
		}
		if (val > MAX_AMP) val = MAX_AMP;
		else if (val < -MAX_AMP) val = -MAX_AMP;
		if (normalX > 1) normalX = 1;
		else if (normalX < -1) normalX = -1;
		// waveNormal = (normalX, -1) normalized; waveOffset per b2WaveController.Step.
		let wnx = normalX;
		let wny = -1;
		const len = Math.hypot(wnx, wny) || 1;
		wnx /= len;
		wny /= len;
		const offset = val - (-wnx / wny) * normalX + c.def.surfaceOffset;
		return { nx: wnx, ny: wny, offset };
	}

	/**
	 * b2BuoyancyController.Step body loop: sum submerged area + centroid over the
	 * body's shapes against the surface plane (nx,ny · p = offset), then apply the
	 * buoyancy force (density·area·-gravity at the submerged centroid), linear drag
	 * (-linearDrag·area·relativeVel) and angular drag (-I/m·area·ω·angularDrag).
	 */
	private applyBuoyancyToBody(
		c: Box2D3WaterController,
		body: Box2D3Body,
		nx: number,
		ny: number,
		offset: number,
		gx: number,
		gy: number,
	): void {
		const m = this.m;
		// Body transform (origin + angle) for the local->world shape geometry.
		const pos = m.b2Body_GetPosition(body.id);
		const px = pos.x;
		const py = pos.y;
		pos.delete();
		const angle = body.GetAngle();
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);

		let area = 0;
		let acx = 0;
		let acy = 0;
		for (const shape of body.shapes) {
			// Mixed welded groups: skip a shape explicitly flagged non-buoyant
			// (b2BuoyancyController.Step: !(ud && !ud.isBuoyant)).
			const ud = shape.userData as { isBuoyant?: boolean } | null;
			if (ud && ud.isBuoyant === false) continue;
			const sub = this.shapeSubmergedArea(shape, px, py, cos, sin, nx, ny, offset);
			if (!sub) continue;
			area += sub.area;
			acx += sub.area * sub.cx;
			acy += sub.area * sub.cy;
		}
		if (area < Number.MIN_VALUE) return;
		acx /= area;
		acy /= area;

		// Buoyancy: -gravity * (density * area) at the submerged centroid.
		const bf = { x: -gx * c.def.density * area, y: -gy * c.def.density * area };
		this.applyForce(body, bf, { x: acx, y: acy });

		// Linear drag: -linearDrag * area * velocityAtCentroid (controller velocity 0).
		const cp = new m.b2Vec2(acx, acy);
		const vpt = m.b2Body_GetWorldPointVelocity(body.id, cp);
		const dragScale = -c.def.linearDrag * area;
		const df = { x: vpt.x * dragScale, y: vpt.y * dragScale };
		vpt.delete();
		cp.delete();
		this.applyForce(body, df, { x: acx, y: acy });

		// Angular drag: -I/m * area * angularVelocity * angularDrag.
		const mass = m.b2Body_GetMass(body.id);
		if (mass > 0) {
			const inertia = m.b2Body_GetRotationalInertia(body.id);
			const omega = m.b2Body_GetAngularVelocity(body.id);
			const torque = (-inertia / mass) * area * omega * c.def.angularDrag;
			m.b2Body_ApplyTorque(body.id, torque, true);
		}
	}

	/**
	 * ComputeSubmergedArea for one v3 shape against the world surface plane
	 * (nx,ny · p = offset), returning submerged area + WORLD centroid, or null if
	 * dry. PORTS b2CircleShape / b2PolygonShape.ComputeSubmergedArea (src/Box2D21).
	 */
	private shapeSubmergedArea(
		shape: Box2D3Shape,
		px: number,
		py: number,
		cos: number,
		sin: number,
		nx: number,
		ny: number,
		offset: number,
	): { area: number; cx: number; cy: number } | null {
		const m = this.m;
		const type = m.b2Shape_GetType(shape.id);
		const isCircle = type.value === m.b2ShapeType.b2_circleShape.value;
		if (isCircle) {
			const circle = m.b2Shape_GetCircle(shape.id);
			const center = circle.center;
			const lx = center.x;
			const ly = center.y;
			const r = circle.radius;
			center.delete();
			circle.delete();
			// World circle centre.
			const wx = px + cos * lx - sin * ly;
			const wy = py + sin * lx + cos * ly;
			return circleSubmergedArea(wx, wy, r, nx, ny, offset);
		}
		// polygon
		const poly = m.b2Shape_GetPolygon(shape.id);
		const count = poly.count;
		const verts: Vec2Like[] = [];
		for (let i = 0; i < count; i++) {
			const v = poly.GetVertex(i);
			verts.push({ x: v.x, y: v.y });
			v.delete();
		}
		poly.delete();
		return polygonSubmergedArea(verts, px, py, cos, sin, nx, ny, offset);
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

// ---------------------------------------------------------------------------
// E3-3 water: the plain-JS controller + the ported submerged-area / wave math.
// v3 has no controller framework, so this is applied manually in step() — see
// Box2D3Backend.applyWaterController. All math is a direct port of the src/
// Box2D21 controllers (b2BuoyancyController / b2TideController / b2WaveController
// + b2*Shape.ComputeSubmergedArea + b2Wave).
// ---------------------------------------------------------------------------

/** One live travelling wave (2.1a b2Wave), plain data. cos == waveFunc is Math.cos. */
interface Box2D3Wave {
	x: number;
	amplitude: number;
	width: number;
	speed: number;
	decay: number;
	cos: boolean;
	fromGenerator: boolean;
}

/** The engine-2 manual water controller (analogue of the 2.1a b2*Controller). */
interface Box2D3WaterController {
	readonly world: RawWorldId;
	readonly def: WaterControllerDef;
	readonly bodies: Set<Box2D3Body>;
	/** Accumulated sim seconds (2.1a b2TideController.stepTracker). */
	time: number;
	/** Initial (un-animated) offset — 2.1a b2TideController.origOffset. */
	readonly origOffset: number;
	/** Current animated surface offset (tide) / static offset (wave). */
	offset: number;
	/** Current animated surface normal.x (tide); 0 for wave (per-body instead). */
	normalX: number;
	/** Live travelling waves (wave type). */
	readonly waves: Box2D3Wave[];
	/** The continuous-wave generator template (wave type), else null. */
	readonly waveGenBase: Box2D3Wave | null;
	/** 2.1a b2WaveController.waveGenCounter. */
	waveGenCounter: number;
}

/** b2Wave.valueAt (src/Box2D21 .../WaveController/b2Wave.ts). */
function waveValueAt(w: Box2D3Wave, x: number): number {
	const half = w.width / 2;
	if (x > half || x < -half) return 0;
	const f = w.cos ? Math.cos : Math.sin;
	return w.amplitude * f((Math.PI / half) * x) + (w.cos ? w.amplitude : 0);
}

/** b2Wave.normalXAt (src/Box2D21 .../WaveController/b2Wave.ts). */
function waveNormalXAt(w: Box2D3Wave, x: number): number {
	const half = w.width / 2;
	// waveFunc cos -> derivative uses sin; sin -> uses cos.
	const f = w.cos ? Math.sin : Math.cos;
	const val = w.amplitude * f((Math.PI / half) * x);
	if (!Number.isFinite(val)) return val > 0 ? 0.1 : -0.2;
	return val * (val > 0 ? 0.1 : 0.2);
}

/**
 * b2CircleShape.ComputeSubmergedArea — the world-space circle centre (wx,wy) +
 * radius against the plane (nx,ny)·p = offset. Returns submerged area + world
 * centroid, or null if dry.
 */
function circleSubmergedArea(
	wx: number,
	wy: number,
	r: number,
	nx: number,
	ny: number,
	offset: number,
): { area: number; cx: number; cy: number } | null {
	const l = -(nx * wx + ny * wy - offset);
	if (l < -r + Number.MIN_VALUE) return null; // fully dry
	if (l > r) return { area: Math.PI * r * r, cx: wx, cy: wy }; // fully submerged
	const r2 = r * r;
	const l2 = l * l;
	const area = r2 * (Math.asin(l / r) + Math.PI / 2) + l * Math.sqrt(r2 - l2);
	const com = ((-2 / 3) * (r2 - l2) ** 1.5) / area;
	return { area, cx: wx + nx * com, cy: wy + ny * com };
}

/**
 * b2PolygonShape.ComputeSubmergedArea — clip the body-local polygon (verts) at
 * the transform (px,py,cos,sin) against the plane (nx,ny)·p = offset. Returns
 * submerged area + world centroid, or null if dry.
 */
function polygonSubmergedArea(
	verts: Vec2Like[],
	px: number,
	py: number,
	cos: number,
	sin: number,
	nx: number,
	ny: number,
	offset: number,
): { area: number; cx: number; cy: number } | null {
	const count = verts.length;
	// normalL = MulTMV(R, normal) — rotate the world normal by -angle.
	const nlx = cos * nx + sin * ny;
	const nly = -sin * nx + cos * ny;
	const offsetL = offset - (nx * px + ny * py);
	const toWorld = (lx: number, ly: number) => ({ x: px + cos * lx - sin * ly, y: py + sin * lx + cos * ly });

	const depths: number[] = new Array(count);
	let diveCount = 0;
	let intoIndex = -1;
	let outoIndex = -1;
	let lastSubmerged = false;
	for (let i = 0; i < count; i++) {
		depths[i] = nlx * verts[i].x + nly * verts[i].y - offsetL;
		const isSubmerged = depths[i] < -Number.MIN_VALUE;
		if (i > 0) {
			if (isSubmerged) {
				if (!lastSubmerged) {
					intoIndex = i - 1;
					diveCount++;
				}
			} else if (lastSubmerged) {
				outoIndex = i - 1;
				diveCount++;
			}
		}
		lastSubmerged = isSubmerged;
	}
	switch (diveCount) {
		case 0:
			if (lastSubmerged) {
				// Fully submerged: whole polygon area + centroid (shoelace).
				const full = polygonAreaCentroid(verts);
				const w = toWorld(full.cx, full.cy);
				return { area: full.area, cx: w.x, cy: w.y };
			}
			return null;
		case 1:
			if (intoIndex === -1) intoIndex = count - 1;
			else outoIndex = count - 1;
			break;
	}
	const intoIndex2 = (intoIndex + 1) % count;
	const outoIndex2 = (outoIndex + 1) % count;
	const intoLambda = (0 - depths[intoIndex]) / (depths[intoIndex2] - depths[intoIndex]);
	const outoLambda = (0 - depths[outoIndex]) / (depths[outoIndex2] - depths[outoIndex]);
	const intoVec = {
		x: verts[intoIndex].x * (1 - intoLambda) + verts[intoIndex2].x * intoLambda,
		y: verts[intoIndex].y * (1 - intoLambda) + verts[intoIndex2].y * intoLambda,
	};
	const outoVec = {
		x: verts[outoIndex].x * (1 - outoLambda) + verts[outoIndex2].x * outoLambda,
		y: verts[outoIndex].y * (1 - outoLambda) + verts[outoIndex2].y * outoLambda,
	};
	let area = 0;
	let cx = 0;
	let cy = 0;
	let p2 = verts[intoIndex2];
	let i = intoIndex2;
	while (i !== outoIndex2) {
		i = (i + 1) % count;
		const p3 = i === outoIndex2 ? outoVec : verts[i];
		const triangleArea =
			0.5 * ((p2.x - intoVec.x) * (p3.y - intoVec.y) - (p2.y - intoVec.y) * (p3.x - intoVec.x));
		area += triangleArea;
		cx += (triangleArea * (intoVec.x + p2.x + p3.x)) / 3;
		cy += (triangleArea * (intoVec.y + p2.y + p3.y)) / 3;
		p2 = p3;
	}
	if (area < Number.MIN_VALUE) return null;
	cx /= area;
	cy /= area;
	const w = toWorld(cx, cy);
	return { area, cx: w.x, cy: w.y };
}

/** Local polygon area + centroid (shoelace), for the fully-submerged branch. */
function polygonAreaCentroid(verts: Vec2Like[]): { area: number; cx: number; cy: number } {
	let area = 0;
	let cx = 0;
	let cy = 0;
	const n = verts.length;
	for (let i = 0; i < n; i++) {
		const a = verts[i];
		const b = verts[(i + 1) % n];
		const cross = a.x * b.y - b.x * a.y;
		area += cross;
		cx += (a.x + b.x) * cross;
		cy += (a.y + b.y) * cross;
	}
	area *= 0.5;
	const denom = 6 * area;
	return { area: Math.abs(area), cx: cx / denom, cy: cy / denom };
}
