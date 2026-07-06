// IB3 Bomb part, ported into the IB2/Jaybit stack.
//
// Source of truth: ib3-decompiled/scripts/Parts/Bomb.as (v0.00.33b) plus the
// bomb helpers in General/Util.as (BO* consts/converters, :66-94/:222-244/
// :352-374) and the impact marking in Triggers/TriggerSystem.as (:37-50).
//
// IB3's Bomb is written against Box2D 2.1alpha (fixtures + b2RayCastInput);
// this port targets the EXISTING 2.0.2 engine (src/Box2D): world.QueryAABB ->
// world.Query(aabb, shapes, max), fixture.RayCast -> shape.TestSegment, and
// ApplyForce is unchanged. The bomb extends the concrete Circle part (IB3's
// Bomb extends CirclePart), so geometry / Init / hit-testing / resize are all
// inherited; only the bomb fields, arming state machine and explosion are new.
//
// DEVIATIONS (documented per plan conventions):
//  - IB3's TriggerSystem.SplitPart tears the exploded bomb's attached-body
//    cluster apart and re-inits every neighbour on fresh bodies. This port
//    destroys the bomb's own shape/body plus its attached joints/thrusters
//    (TriggerSystem.as SplitPart :146-162) but does NOT re-init neighbours —
//    a bomb welded into a larger single-body cluster leaves the cluster's
//    remaining shapes on their shared body.
//  - IB3 records DETONATE_* trigger presses into its replay stream
//    (Bomb.as:229/:253/:276). The IB2 replay format has no bomb channel;
//    bombs re-simulate from sync points instead (a mid-run body destroy can
//    degrade replay fidelity for later-recorded bodies).

import { b2Body, b2Shape, b2Vec2, b2World } from "../Box2D";
import { ContactFilter } from "../Game/ContactFilter";
import { Util } from "../General/Util";
import { Circle } from "./Circle";
import { JointPart } from "./JointPart";
import { getPhysicsBackend } from "./partGlobals";
import { ShapePart } from "./ShapePart";
import { Thrusters } from "./Thrusters";
import { TRIGGER_NONE } from "./partDefaults";

/**
 * Sim frame rate the ms-based bomb delays convert against. Each GameCore
 * handleStep frame advances two Step(1/60) sub-steps == 1/30 s of sim time
 * (GameCore.ts STEP_DT), so the IB2 logical frame rate is 30 — the same value
 * IB3's `Main.frameRate` feeds `delay / 1000 * Main.frameRate`
 * (Bomb.as:127-128).
 */
const FRAME_RATE = 30;

/** Contact filter used to skip non-colliding shapes in the blast query, like
 *  IB3's `physics.contactFilter.ShouldCollide(fixture, m_fixture)`
 *  (Bomb.as:395). */
const blastFilter = new ContactFilter();

/** Sentinel impactedWith identity for a contact whose other shape carries no
 *  userData (IB3 always has `.part`; our terrain edges may not). */
const NO_USERDATA_CONTACT = {};

export class Bomb extends Circle {
  // --- consts (Bomb.as:18-30 + Util.as:66-94) -----------------------------
  public static MINIMUM_NUM_BLASTS = 8; // Bomb.as:18
  public static MAXIMUM_DEFLECTIONS = 5; // Bomb.as:20
  /** 16448000 == 0xFAFA00 (Bomb.as:22). */
  public static COLOR_DEFAULT_R = 250;
  public static COLOR_DEFAULT_G = 250;
  public static COLOR_DEFAULT_B = 0;
  public static SENSITIVITY_MINUEND = 200; // Bomb.as:24
  public static SENSITIVITY_MULTIPLIER = 2; // Bomb.as:26
  public static SENSITIVITY_MINIMUM = Number.MIN_VALUE; // Bomb.as:28
  public static MIN_BLAST_RADIUS = 0; // Util.as BO_BRADIUS_MIN_DEF (:72)
  public static MAX_BLAST_RADIUS = 50; // Util.as BO_BRADIUS_MAX_DEF (:76)
  public static MIN_STRENGTH = 0; // Util.as BO_STRENGTH_MIN_DEF (:66)
  public static MAX_STRENGTH = 40; // Util.as BO_STRENGTH_MAX_DEF (:70)
  public static MIN_SENSITIVITY = 0; // Util.as BO_SENSITIVITY_MIN_DEF (:90)
  public static MAX_SENSITIVITY = 100; // Util.as BO_SENSITIVITY_MAX_DEF (:94)

  // --- persisted fields (Bomb.as:32-54; defaults from ctor :88-120) -------
  /** Blast reach in world units (ctor default 4; Util clamp 0..50). */
  public blastRadius: number;
  /** Blast strength, UI scale 0..40 (default Util.BOStrengthDefault() == 10). */
  public strength: number = 10;
  /** Arm-to-explode delay in MILLISECONDS (default Util.BODelayDefault() == 2000). */
  public delay: number = 2000;
  /** Restart the delay timer on each new trigger touch instead of shortcutting it (Bomb.as:99). */
  public delayAfterTrigger: boolean = false;
  /** Detonate on any physical impact (Bomb.as:103). */
  public explodeOnImpact: boolean = true;
  /** Honour the delay after an impact detonation (false == near-instant, Bomb.as:104). */
  public delayAfterImpact: boolean = true;
  /** Max number of re-explosions when repeatable (0 == unlimited; Util.BORepeatDefault()). */
  public repeat: number = 0;
  /** Re-arm after exploding instead of being destroyed (Bomb.as:101). */
  public repeatable: boolean = false;
  /** Detonate on velocity jolts (Bomb.as:105). */
  public sensitive: boolean = false;
  /** Jolt sensitivity 0..100 (default Util.BOSensitivityDefault() == 95). */
  public sensitivity: number = 95;
  /** Blast rays deflect off surfaces (up to MAXIMUM_DEFLECTIONS; Bomb.as:108). */
  public deflect: boolean = true;
  /** Comma-separated trigger names this bomb LISTENS to (detonate list; Bomb.as:96). */
  public triggerList: string = "";

  // --- runtime state (NOT persisted: m_* skipped by the AMF writer; -------
  // triggerTouches is in AMF3 RUNTIME_ONLY_KEYS) ---------------------------
  /** Trigger-contact counter (Bomb.as m_triggerDetonateTouches :40). */
  public triggerTouches: number = 0;
  private m_activateBomb: boolean = false;
  private m_delayCounter: number = 0;
  private m_delayInFrames: number = 0;
  private m_explosionDelay: number = 1000; // ms the explosion visual lingers (Bomb.as:112)
  private m_explosionCounter: number = 0;
  private m_explosionDelayInFrames: number = 0;
  private m_exploding: boolean = false;
  private m_destroyed: boolean = false;
  private m_lastPos: b2Vec2 | null = null;
  private m_lastExplosion: b2Vec2[][] = [];
  private m_repeatCount: number = 0;
  private m_previousLinearMagnitudeX: number = 0;
  private m_previousLinearMagnitudeY: number = 0;
  private m_actualSensitivity: number = 0;
  private m_activatedBeforeReInit: boolean = false;
  private m_initBlastRadius: number = 0;
  private m_lastImpactedWith: unknown = null;

  /** Bomb(x, y, radius, blastRadius=4, angle=0) — Bomb.as:88-120. */
  constructor(x: number, y: number, rad: number, blastRadius: number = 4, checkLimits: boolean = true) {
    super(x, y, rad, checkLimits);
    this.blastRadius = Bomb.ClampBlastRadius(blastRadius);
    this.type = "Bomb";
    // COLOR_DEFAULT = 0xFAFA00 (Bomb.as:119).
    this.red = Bomb.COLOR_DEFAULT_R;
    this.green = Bomb.COLOR_DEFAULT_G;
    this.blue = Bomb.COLOR_DEFAULT_B;
  }

  // --- Util.as BO* converters (:352-374) ----------------------------------
  public static ClampBlastRadius(v: number): number {
    // Util.BOBRadiusToBox2D (:357-360): a pure clamp, blast radius is already
    // in world units.
    return Math.max(Bomb.MIN_BLAST_RADIUS, Math.min(Bomb.MAX_BLAST_RADIUS, v));
  }

  public static StrengthToBox2D(v: number): number {
    // Util.BOStrengthToBox2D (:352-355): clamp * 100.
    return Math.max(Bomb.MIN_STRENGTH, Math.min(Bomb.MAX_STRENGTH, v)) * 100;
  }

  public static SensitivityToBox2D(v: number): number {
    // Util.BOSensitivityToBox2D (:372-375).
    const clamped = Math.max(Bomb.MIN_SENSITIVITY, Math.min(Bomb.MAX_SENSITIVITY, v));
    return -Math.pow(clamped / 10 - 10, 2) + 100;
  }

  // --- copy / equality -----------------------------------------------------
  /** Copy() + ApplyProperties() (Bomb.as:298-325) on top of Circle.MakeCopy. */
  public MakeCopy(): ShapePart {
    const b = new Bomb(this.centerX, this.centerY, this.radius, this.blastRadius);
    b.density = this.density;
    b.angle = this.angle;
    b.collide = this.collide;
    b.isStatic = this.isStatic;
    b.red = this.red;
    b.green = this.green;
    b.blue = this.blue;
    b.opacity = this.opacity;
    b.outline = this.outline;
    b.terrain = this.terrain;
    b.undragable = this.undragable;
    // Bomb.ApplyProperties (Bomb.as:305-325).
    b.strength = this.strength;
    b.triggerList = this.triggerList;
    b.delay = this.delay;
    b.delayAfterTrigger = this.delayAfterTrigger;
    b.explodeOnImpact = this.explodeOnImpact;
    b.delayAfterImpact = this.delayAfterImpact;
    b.repeat = this.repeat;
    b.repeatable = this.repeatable;
    b.sensitive = this.sensitive;
    b.sensitivity = this.sensitivity;
    b.deflect = this.deflect;
    this.CopyJaybitFieldsTo(b);
    return b;
  }

  public equals(other: ShapePart): boolean {
    return (
      other instanceof Bomb &&
      this.NumbersEqual(this.blastRadius, other.blastRadius) &&
      this.NumbersEqual(this.strength, other.strength) &&
      this.delay === other.delay &&
      this.delayAfterTrigger === other.delayAfterTrigger &&
      this.explodeOnImpact === other.explodeOnImpact &&
      this.delayAfterImpact === other.delayAfterImpact &&
      this.repeat === other.repeat &&
      this.repeatable === other.repeatable &&
      this.sensitive === other.sensitive &&
      this.NumbersEqual(this.sensitivity, other.sensitivity) &&
      this.deflect === other.deflect &&
      this.triggerList === other.triggerList &&
      super.equals(other)
    );
  }

  // --- lifecycle -----------------------------------------------------------
  /** Circle.Init + the bomb runtime reset of Bomb.as InitShape (:122-155). */
  public Init(world: b2World, body: b2Body | null = null): void {
    const firstInit = !this.isInitted;
    super.Init(world, body);
    if (!firstInit) return;

    // Bomb.as:127-144 — per-play runtime reset + unit conversions.
    this.m_delayInFrames = (this.delay / 1000) * FRAME_RATE;
    this.m_explosionDelayInFrames = (this.m_explosionDelay / 1000) * FRAME_RATE;
    this.m_delayCounter = 0;
    this.m_explosionCounter = this.m_explosionDelayInFrames;
    this.m_activateBomb = false;
    this.triggerTouches = 0;
    this.m_repeatCount = 0;
    this.m_previousLinearMagnitudeX = 0;
    this.m_previousLinearMagnitudeY = 0;
    this.m_destroyed = false;
    this.m_exploding = false;
    this.m_actualSensitivity =
      Bomb.SENSITIVITY_MINUEND - Bomb.SensitivityToBox2D(this.sensitivity) * Bomb.SENSITIVITY_MULTIPLIER;
    if (this.m_actualSensitivity < Bomb.SENSITIVITY_MINIMUM) this.m_actualSensitivity = Bomb.SENSITIVITY_MINIMUM;
    this.m_activatedBeforeReInit = false;
    this.m_initBlastRadius = Bomb.ClampBlastRadius(this.blastRadius);

    // Bomb fixture userData markers (Bomb.as:146-153); the shape userData bag
    // was created by Circle.Init. GameCore's contact listener flips
    // impacted/impactedWith on contact add/remove (TriggerSystem.as:37-50).
    const ud = this.m_shape ? (this.m_shape.GetUserData() as Record<string, unknown>) : null;
    if (ud) {
      ud.isBomb = true;
      ud.destroyedNextFrame = false;
      ud.impacted = false;
      ud.impactedWith = null;
      ud.impactedFromExplosion = false;
      this.m_lastImpactedWith = null;
    }
    this.m_activateBomb = this.m_activatedBeforeReInit || this.determineIfPreActivated();
  }

  /** Bomb.as UnInit (:157-171). */
  public UnInit(world: b2World): void {
    if (!this.isInitted) return;
    super.UnInit(world);
    this.m_delayCounter = 0;
    this.m_explosionCounter = 0;
    this.m_activateBomb = false;
    this.triggerTouches = 0;
    this.m_destroyed = false;
    this.m_exploding = false;
    this.m_activatedBeforeReInit = false;
    this.m_lastExplosion = [];
    this.m_lastPos = null;
  }

  // --- per-frame state machine (Bomb.as Update :173-211) -------------------
  public Update(world: b2World): void {
    if (!this.isInitted) return;
    if (!this.m_destroyed) {
      // The GameCore Update loop never runs during replay playback, so IB3's
      // `!physics.isReplay` guard (Bomb.as:180) is implicit here.
      this.CheckSensitiveDetonation();
      this.CheckTriggerDetonation();
      this.CheckImpactDetonation();
      if (this.m_activateBomb) {
        if (this.m_delayCounter < this.m_delayInFrames) ++this.m_delayCounter;
        if (this.m_delayCounter + 1 >= this.m_delayInFrames) {
          const ud = this.m_shape ? (this.m_shape.GetUserData() as Record<string, unknown>) : null;
          if (ud) ud.destroyedNextFrame = true;
        }
        if (this.m_delayCounter >= this.m_delayInFrames) this.Explode(world);
      }
    }
    // Explosion-visual timer (Bomb.as:202-209).
    if (this.m_exploding && this.m_explosionCounter < this.m_explosionDelayInFrames) {
      ++this.m_explosionCounter;
      if (this.m_explosionCounter >= this.m_explosionDelayInFrames) this.m_exploding = false;
    }
  }

  /** Velocity-jolt arming (Bomb.as CheckSensitiveDetonation :213-245). */
  public CheckSensitiveDetonation(): void {
    if (!this.isInitted || this.m_destroyed || !this.sensitive || !this.m_body) return;
    const vel = getPhysicsBackend().bodyVelocity(this.m_body);
    const vx = vel.x;
    const vy = vel.y;
    const dx = Math.abs(this.m_previousLinearMagnitudeX - vx);
    const dy = Math.abs(this.m_previousLinearMagnitudeY - vy);
    if (dx > this.m_actualSensitivity || dy > this.m_actualSensitivity) {
      this.m_activateBomb = true;
      this.m_activatedBeforeReInit = true;
      // "instant" mode shortcuts the timer to 2 frames out (Bomb.as:237-240).
      if (!this.delayAfterImpact && this.m_delayCounter < this.m_delayInFrames - 2) {
        this.m_delayCounter = this.m_delayInFrames - 2;
      }
    }
    this.m_previousLinearMagnitudeX = vx;
    this.m_previousLinearMagnitudeY = vy;
  }

  /** Trigger-list arming (Bomb.as CheckTriggerDetonation :247-266). */
  public CheckTriggerDetonation(): void {
    if (!this.isInitted || this.m_destroyed || this.triggerTouches <= 0) return;
    this.m_activateBomb = true;
    this.m_activatedBeforeReInit = true;
    if (!this.delayAfterTrigger && this.m_delayCounter < this.m_delayInFrames - 2) {
      this.m_delayCounter = this.m_delayInFrames - 2;
    }
  }

  /** Impact arming (Bomb.as CheckImpactDetonation :268-296). */
  public CheckImpactDetonation(): void {
    if (!this.isInitted || this.m_destroyed || !this.explodeOnImpact || !this.m_shape) return;
    const ud = this.m_shape.GetUserData() as Record<string, unknown>;
    if (ud.impacted && ud.impactedWith !== this.m_lastImpactedWith) {
      this.m_lastImpactedWith = ud.impactedWith;
      this.m_activateBomb = true;
      this.m_activatedBeforeReInit = true;
      // A blast-induced impact re-arms cleanly (Bomb.as:281-285).
      if (ud.impactedFromExplosion) {
        ud.impactedFromExplosion = false;
        this.m_lastImpactedWith = null;
      }
      if (!this.delayAfterImpact && this.m_delayCounter < this.m_delayInFrames - 2) {
        this.m_delayCounter = this.m_delayInFrames - 2;
      }
    } else if (ud.impactedWith == null) {
      this.m_lastImpactedWith = null;
    }
  }

  /** Pre-armed at init when no impact/trigger gate applies (Bomb.as:591-594). */
  private determineIfPreActivated(): boolean {
    return !this.explodeOnImpact && !this.delayAfterImpact && !this.delayAfterTrigger;
  }

  /**
   * Trigger TARGET hook (IB2 dispatcher contract, see Cannon.DoTriggerAction):
   * any wired source contact counts a detonate touch — the IB3 equivalent is
   * TriggerSystem routing DETONATE into m_triggerDetonateTouches, consumed by
   * CheckTriggerDetonation in Update (Bomb.as:596-615 ProcessTrigger).
   */
  public DoTriggerAction(action: number, world: b2World | null = null, isAdd: boolean = true): boolean {
    if (action === TRIGGER_NONE) return false;
    if (isAdd) ++this.triggerTouches;
    else if (this.triggerTouches > 0) --this.triggerTouches;
    return false;
  }

  // --- explosion (Bomb.as Explode :349-589) --------------------------------
  private Explode(world: b2World): void {
    if (!this.m_body || !this.m_shape) return;

    // Destroyed unless repeating with runs left (Bomb.as:401 — note the
    // repeat-count compare happens BEFORE the rearm increments it).
    const beingDestroyed =
      !this.repeatable || (this.repeatable && this.repeat > 0 && this.m_repeatCount >= this.repeat);

    this.m_lastExplosion = [];
    this.m_explosionCounter = 0;
    this.m_exploding = true;

    // World-space bomb centre (Bomb.as:405): body transform * circle local centre.
    // Read both through the engine seam — the raw 2.0.2 GetXForm()/GetLocalPosition()
    // don't exist on the 2.1a fixture (m_shape) or the v3 wrapper, so a bomb
    // exploding on engine 1/2 used to crash here (r.GetLocalPosition is not a fn).
    const backend = getPhysicsBackend();
    const xf = backend.bodyTransform(this.m_body);
    const local = backend.shapeLocalCenter(this.m_shape);
    const cos = Math.cos(xf.angle);
    const sin = Math.sin(xf.angle);
    const curPos = new b2Vec2(
      xf.x + cos * local.x - sin * local.y,
      xf.y + sin * local.x + cos * local.y,
    );
    this.m_lastPos = curPos.Copy();

    // AABB query for blast candidates (Bomb.as:408-413). The 2.0 engine has no
    // callback QueryAABB; world.Query fills a shape array. Filters mirror
    // GetFixturesCallback (Bomb.as:393-400): not the bomb's own shape, not a
    // shape flagged destroyedNextFrame, and only pairs the contact filter
    // would let collide.
    const useBlastRadius = this.m_initBlastRadius;
    const MAX_QUERY = 1000;
    const queried: b2Shape[] = new Array(MAX_QUERY);
    const count = getPhysicsBackend().queryAABB(
      world,
      curPos.x - useBlastRadius,
      curPos.y - useBlastRadius,
      curPos.x + useBlastRadius,
      curPos.y + useBlastRadius,
      queried,
      MAX_QUERY,
    );
    const shapes: b2Shape[] = [];
    for (let i = 0; i < count; i++) {
      const s = queried[i];
      if (s === this.m_shape) continue;
      const ud = s.GetUserData() as Record<string, unknown> | null;
      if (ud && ud.destroyedNextFrame) continue;
      if (!blastFilter.ShouldCollide(s, this.m_shape)) continue;
      shapes.push(s);
    }

    // Repeatable rearm (Bomb.as:414-425).
    if (this.repeatable) {
      const ud = this.m_shape.GetUserData() as Record<string, unknown>;
      ud.destroyedNextFrame = false;
      ud.impacted = false;
      this.m_activateBomb = this.determineIfPreActivated();
      this.m_activatedBeforeReInit = false;
      this.m_delayCounter = 0;
      ++this.m_repeatCount;
    }

    // Destroy the bomb's physics presence (Bomb.as:426-456). DEVIATION: see
    // the header comment — attached joints/thrusters are destroyed
    // (TriggerSystem.SplitPart :146-162) but welded neighbours are not
    // re-initted onto fresh bodies.
    if (beingDestroyed) {
      for (const j of this.m_joints) {
        if (j instanceof JointPart && j.isEnabled) j.DestroyJointPart(world);
      }
      for (const t of this.m_thrusters) {
        if (t instanceof Thrusters && t.isEnabled) t.DestroyThruster(world);
      }
      const body = this.m_body;
      if (getPhysicsBackend().bodyShapeCount(body) > 1) {
        // Welded cluster: remove only the bomb's own shape (the 2.0 equivalent
        // of destroying the bomb fixture off a multi-fixture body).
        getPhysicsBackend().destroyShape(body, this.m_shape);
        if (!getPhysicsBackend().bodyIsStatic(body)) getPhysicsBackend().setMassFromShapes(body);
      } else {
        // Free-standing bomb: destroy the whole body (Bomb.as:440-455).
        let bud = body.GetUserData() as Record<string, unknown> | null;
        if (!bud) {
          bud = {};
          body.SetUserData(bud);
        }
        if (!bud.deleted) {
          bud.deleted = true;
          getPhysicsBackend().destroyBody(world, body);
        }
      }
      this.m_shape = null;
      this.m_body = null;
    }

    // --- radial ray fan with deflection (Bomb.as:479-571) ---
    const forceStrength = Bomb.StrengthToBox2D(this.strength);
    let incrementAngle = Math.PI / (64 * (useBlastRadius / 10));
    const maxDeflections = this.deflect ? Bomb.MAXIMUM_DEFLECTIONS : 1;
    const PI2 = Math.PI * 2;
    if (incrementAngle > PI2 / Bomb.MINIMUM_NUM_BLASTS) incrementAngle = PI2 / Bomb.MINIMUM_NUM_BLASTS;

    const applyToShapes: b2Shape[] = [];
    const applyForceVectors: b2Vec2[] = [];
    const applyPositions: b2Vec2[] = [];
    const startPos = new b2Vec2();
    const endPos = new b2Vec2();
    const useForceVector = new b2Vec2();

    for (let forceAngle = 0; forceAngle < PI2; forceAngle += incrementAngle) {
      let fractionLeft = 1;
      let curAngle = forceAngle;
      let curAngleCos = Math.cos(curAngle);
      let curAngleSin = Math.sin(curAngle);
      let curForceStrength = forceStrength / 4; // Bomb.as:496
      startPos.Set(curPos.x + curAngleCos * (this.radius - 0.1), curPos.y + curAngleSin * (this.radius - 0.1));
      endPos.Set(useBlastRadius * curAngleCos + startPos.x, useBlastRadius * curAngleSin + startPos.y);
      const ray: b2Vec2[] = [];
      this.m_lastExplosion.push(ray);
      let addedVec = false;
      let deflections = 0;

      while (fractionLeft > 0 && deflections < maxDeflections) {
        // Nearest hit across all candidate shapes (Bomb.as:504-522), via the
        // 2.0 TestSegment API (maxLambda = fractionLeft mirrors
        // b2RayCastInput.maxFraction).
        let lowestRatio = 1;
        let nearestShape: b2Shape | null = null;
        let nearestNormal: b2Vec2 | null = null;
        for (const s of shapes) {
          const sBody = s.GetBody();
          if (!sBody) continue;
          // Nearest hit via the engine seam (2.0 shape.TestSegment / 2.1a
          // fixture.RayCast) — maxFraction = fractionLeft mirrors the 2.0 maxLambda.
          const hit = getPhysicsBackend().shapeTestSegment(s, sBody, startPos.x, startPos.y, endPos.x, endPos.y, fractionLeft);
          if (hit && hit.lambda < lowestRatio) {
            lowestRatio = hit.lambda;
            nearestShape = s;
            nearestNormal = new b2Vec2(hit.nx, hit.ny);
          }
        }
        fractionLeft -= lowestRatio;
        if (fractionLeft < 0) fractionLeft = 0;

        if (nearestShape && nearestNormal) {
          // Cosine falloff + deflection bookkeeping (Bomb.as:528-563).
          const lineDistance = Util.GetDist(startPos.x, startPos.y, endPos.x, endPos.y) * lowestRatio;
          const useForceStrength = curForceStrength * (1 - lowestRatio);
          useForceVector.Set(-nearestNormal.x, -nearestNormal.y);
          const useForceAngle = Math.atan2(useForceVector.y, useForceVector.x);
          const angleOfDeflection = curAngle - useForceAngle;
          const surfaceNormalAngle = Util.NormalizeAngle(useForceAngle + Math.PI);
          let deflectedForceStrength =
            Math.cos(angleOfDeflection < 0 ? -angleOfDeflection : angleOfDeflection) * useForceStrength;
          if (deflectedForceStrength < 0) deflectedForceStrength = 0;
          curForceStrength -= deflectedForceStrength;
          useForceVector.Multiply(deflectedForceStrength);
          applyForceVectors.push(useForceVector.Copy());
          applyToShapes.push(nearestShape);
          startPos.x += lineDistance * curAngleCos;
          startPos.y += lineDistance * curAngleSin;
          const nextAngle = surfaceNormalAngle - angleOfDeflection;
          curAngleCos = Math.cos(nextAngle);
          curAngleSin = Math.sin(nextAngle);
          curAngle = Math.atan2(curAngleSin, curAngleCos);
          applyPositions.push(startPos.Copy());
          if (!addedVec) {
            ray.push(startPos.Copy());
            addedVec = true;
          }
          endPos.x = useBlastRadius * curAngleCos + startPos.x;
          endPos.y = useBlastRadius * curAngleSin + startPos.y;
        }
        deflections++;
      }
      if (!addedVec) ray.push(endPos.Copy());
    }

    // Apply the accumulated forces + bomb-chain impact marking (Bomb.as:572-584).
    for (let i = 0; i < applyToShapes.length; i++) {
      const body = applyToShapes[i].GetBody();
      if (body) getPhysicsBackend().applyForce(body, applyForceVectors[i], applyPositions[i]);
      const ud = applyToShapes[i].GetUserData() as Record<string, unknown> | null;
      if (ud && ud.isBomb) {
        ud.impacted = true;
        ud.impactedWith = this;
        ud.impactedFromExplosion = true;
      }
    }

    if (beingDestroyed) this.m_destroyed = true;
  }

  // --- read accessors for the renderer / GameCore (Bomb.as:617-655) --------
  public IsDestroyed(): boolean {
    return this.m_destroyed;
  }

  public IsExploding(): boolean {
    return this.m_exploding;
  }

  public GetExplosionVectors(): b2Vec2[][] {
    return this.m_lastExplosion;
  }

  public GetExplosionCounter(): number {
    return this.m_explosionCounter;
  }

  public GetExplosionDelay(): number {
    return this.m_explosionDelayInFrames;
  }

  public GetDelayInFrames(): number {
    return this.m_delayInFrames;
  }

  public GetDelayCounter(): number {
    return this.m_delayCounter;
  }

  public GetLastPos(): b2Vec2 | null {
    return this.m_lastPos;
  }

  public GetInitBlastRadius(): number {
    return this.m_initBlastRadius;
  }

  public ToString(): string {
    return "Bomb: blastRadius=" + this.blastRadius + ", strength=" + this.strength + ", " + super.ToString();
  }
}

/**
 * Contact-listener hook GameCore calls on every contact Add/Remove: mirror of
 * IB3 TriggerSystem.Process (TriggerSystem.as:37-50) — a bomb shape's userData
 * records the live contact (impacted + the other party's identity) so
 * CheckImpactDetonation can arm on NEW impacts only. IB3 stores the other
 * fixture's `.part`; we use the other shape's userData bag as the identity
 * token (unique per shape), with a sentinel for bare terrain shapes.
 */
export function markBombImpact(ud1: unknown, ud2: unknown, isAdd: boolean): void {
  const pairs: Array<[unknown, unknown]> = [
    [ud1, ud2],
    [ud2, ud1],
  ];
  for (const [self, other] of pairs) {
    const ud = self as Record<string, unknown> | null | undefined;
    if (ud && ud.isBomb) {
      ud.impacted = isAdd;
      ud.impactedWith = isAdd ? (other ?? NO_USERDATA_CONTACT) : null;
    }
  }
}
