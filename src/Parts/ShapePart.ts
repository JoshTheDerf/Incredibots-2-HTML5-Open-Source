import { b2Body, b2RevoluteJointDef, b2Shape, b2Vec2, b2World } from "../Box2D";
import { Util } from "../General/Util"
import { FixedJoint } from "./FixedJoint"
import { JointPart } from "./JointPart"
import { IllegalOperationError, Part } from "./Part"
import {
  COLLISION_GROUP_UNSET,
  DEFAULT_B,
  DEFAULT_FRICTION,
  DEFAULT_G,
  DEFAULT_O,
  DEFAULT_R,
  DEFAULT_RESTITUTION,
  MAX_DENSITY,
  MAX_FRICTION,
  MAX_RESTITUTION,
  MIN_DENSITY,
  MIN_FRICTION,
  MIN_RESTITUTION,
  TRIGGER_NONE,
} from "./partDefaults"
import { Thrusters } from "./Thrusters"

export class ShapePart extends Part {
  public centerX: number;
  public centerY: number;
  public density: number;
  public friction: number;
  public restitution: number;
  public angle: number;
  public collide: boolean = true;
  // Collision layers A-D (Jaybit ShapePart.as; "Advanced" panel checkboxes).
  // Encoded into 4-bit category==mask groups at Init — see GetCollisionBits().
  public collA: boolean = true;
  public collB: boolean = true;
  public collC: boolean = true;
  public collD: boolean = true;
  // "Self-collision": SetCollisionGroup assigns groupIndex 0 instead of the
  // structure's negative group, so the shape collides with its own robot per
  // the layer bits (Jaybit ShapePart.as:430-455).
  public subColl: boolean = false;
  // --- Trigger fields (Jaybit ShapePart.as:22-80). DATA ONLY this wave:
  // declared/defaulted/copied for serialization; the trigger runtime lands in
  // the triggers wave. Two independent slots ("_2" suffix = slot 2).
  public triggerAction: number = TRIGGER_NONE;
  public triggerAction_2: number = TRIGGER_NONE;
  /** comma-separated names this shape EMITS (parsed as a CSV list despite the singular name). */
  public triggerName: string = "";
  public triggerName_2: string = "";
  public onGroundHit: boolean = false;
  public onGroundHit_2: boolean = false;
  public onSameName: boolean = false;
  public onSameName_2: boolean = false;
  public isCameraFocus: boolean = false;
  public m_collisionGroup: number = COLLISION_GROUP_UNSET;
  public highlightForJoint: boolean = false;
  public isBullet: boolean = false;
  public red: number;
  public green: number;
  public blue: number;
  public opacity: number;
  public outline: boolean;
  public terrain: boolean;
  public undragable: boolean;
  protected m_body: b2Body | null = null;
  protected m_shape: b2Shape | null = null;
  protected m_fixture: any = null;
  protected m_joints: Array<any>;
  protected m_thrusters: Array<any>;

  constructor(x: number, y: number) {
    super();
    this.centerX = x;
    this.centerY = y;
    if (MIN_DENSITY > 15.0) {
      this.density = MIN_DENSITY;
    } else if (MAX_DENSITY < 15.0) {
      this.density = MAX_DENSITY;
    } else {
      this.density = 15.0;
    }
    // Friction/restitution default-clamps mirror density's (Jaybit
    // ShapePart.as ctor clamps against ControllerGame.minFriction etc.; the
    // core applies the live challenge limits in GameCore — see
    // clampFriction/clampRestitution).
    if (MIN_FRICTION > DEFAULT_FRICTION) {
      this.friction = MIN_FRICTION;
    } else if (MAX_FRICTION < DEFAULT_FRICTION) {
      this.friction = MAX_FRICTION;
    } else {
      this.friction = DEFAULT_FRICTION;
    }
    if (MIN_RESTITUTION > DEFAULT_RESTITUTION) {
      this.restitution = MIN_RESTITUTION;
    } else if (MAX_RESTITUTION < DEFAULT_RESTITUTION) {
      this.restitution = MAX_RESTITUTION;
    } else {
      this.restitution = DEFAULT_RESTITUTION;
    }
    this.angle = 0;
    this.red = DEFAULT_R;
    this.green = DEFAULT_G;
    this.blue = DEFAULT_B;
    this.opacity = DEFAULT_O;
    this.outline = true;
    this.terrain = false;
    this.undragable = false;
    this.m_joints = new Array();
    this.m_thrusters = new Array();
  }

  public GetBody() {
    return this.m_body;
  }

  public GetShape() {
    return this.m_shape;
  }

  public GetFixture() {
    return this.m_fixture;
  }

  public GetUserData(): any {
    return this.m_body!.GetUserData() || {};
  }

  public AddJoint(j: JointPart): void {
    this.m_joints.push(j);
  }

  public AddThrusters(t: Thrusters): void {
    this.m_thrusters.push(t);
  }

  public Move(xVal: number, yVal: number): void {
    this.centerX = xVal;
    this.centerY = yVal;
  }

  public RotateAround(xVal: number, yVal: number, curAngle: number): void {
    var dist: number = Util.GetDist(this.centerX, this.centerY, xVal, yVal);
    var absoluteAngle: number = this.rotateAngle + curAngle;
    this.Move(xVal + dist * Math.cos(absoluteAngle), yVal + dist * Math.sin(absoluteAngle));
    this.angle = curAngle + this.rotateOrientation;
  }

  public MakeCopy(): ShapePart {
    throw new IllegalOperationError("abstract ShapePart.MakeCopy() called");
  }

  public HeavierThan(other: ShapePart): boolean {
    return this.m_body!.GetMass() > other.GetBody()!.GetMass();
  }

  public GetMass(): number {
    if (this.m_body) return this.m_body.GetMass();
    return (this.GetArea() * (this.density + 5.0)) / 10.0;
  }

  public GetArea(): number {
    throw new IllegalOperationError("abstract ShapePart.GetArea() called");
  }

  public UnInit(world: b2World): void {
    if (!this.isInitted) return;
    super.UnInit(world);
    if (this.m_body) {
      if (!this.m_body.GetUserData() || !this.m_body.GetUserData().deleted) {
        world.DestroyBody(this.m_body);
        if (!this.m_body.GetUserData()) this.m_body.SetUserData({});
        this.m_body.GetUserData().deleted = true;
      }
      this.m_body = null;
    }
  }

  public Update(world: b2World): void {
    // do nothing
  }

  public KeyInput(key: number, up: boolean, replay: boolean): void {
    // do nothing
  }

  public SetCollisionGroup(grp: number): void {
    if (!this.checkedCollisionGroup) {
      this.checkedCollisionGroup = true;
      // subColl ("Self-collision"): this shape opts out of the structure's
      // shared negative group — groupIndex 0 defers to the layer bits, so it
      // collides with its own robot. The flood-fill still propagates the
      // ORIGINAL id so one subColl shape doesn't break the rest of the
      // structure (Jaybit ShapePart.as:430-455).
      if (!this.subColl) this.m_collisionGroup = grp;
      else this.m_collisionGroup = 0;
      for (var i: number = 0; i < this.m_joints.length; i++) {
        if (this.m_joints[i].isEnabled) {
          this.m_joints[i].GetOtherPart(this).SetCollisionGroup(grp);
          // NEW in Jaybit: also stamp the PrismaticJoint itself so its shaft
          // segments can carry the group. Duck-typed (only PrismaticJoint has
          // SetCollisionGroup) to avoid a ShapePart->PrismaticJoint import cycle.
          if (typeof this.m_joints[i].SetCollisionGroup === "function") {
            this.m_joints[i].SetCollisionGroup(grp);
          }
        }
      }
    }
  }

  /**
   * Encode collision layers A-D into Box2D filter bits, 4 bits per layer
   * (Jaybit Circle.as:96-118 — identical pattern in every ShapePart Init and
   * PrismaticJoint.Init). Every shape sets category == mask == these bits, so
   * Box2D's (cat1 & mask2) && (cat2 & mask1) reduces to "collide iff the two
   * shapes share at least one enabled layer". All-off => 0 => collides with
   * nothing via the filter (sandbox terrain still hits via the ContactFilter
   * isSandbox short-circuit).
   */
  public static CollisionBits(collA: boolean, collB: boolean, collC: boolean, collD: boolean): number {
    var bits: number = 0;
    if (collA) bits += 15; // 0x000F
    if (collB) bits += 240; // 0x00F0
    if (collC) bits += 3840; // 0x0F00
    if (collD) bits += 61440; // 0xF000
    return bits;
  }

  /** This shape's layer bits (see CollisionBits). */
  public GetCollisionBits(): number {
    return ShapePart.CollisionBits(this.collA, this.collB, this.collC, this.collD);
  }

  /**
   * Copy the Jaybit-added persisted ShapePart fields (material, collision
   * layers, trigger slots) onto `other`. Centralized so every clone path —
   * each subclass MakeCopy AND GameCore's mirrorParts handlers — inherits
   * them; this is the root-cause fix for Jaybit's mirror/copy-paste
   * collision-group bugs (mirrored parts silently reset to defaults for any
   * field not copied explicitly).
   */
  public CopyJaybitFieldsTo(other: ShapePart): void {
    other.friction = this.friction;
    other.restitution = this.restitution;
    other.collA = this.collA;
    other.collB = this.collB;
    other.collC = this.collC;
    other.collD = this.collD;
    other.subColl = this.subColl;
    other.triggerAction = this.triggerAction;
    other.triggerAction_2 = this.triggerAction_2;
    other.triggerName = this.triggerName;
    other.triggerName_2 = this.triggerName_2;
    other.onGroundHit = this.onGroundHit;
    other.onGroundHit_2 = this.onGroundHit_2;
    other.onSameName = this.onSameName;
    other.onSameName_2 = this.onSameName_2;
  }

  /**
   * Init this shape's fixed-joint-welded partners (Jaybit
   * ShapePart.as CheckFixedJoints, diff lines 290-363) — called at the end of
   * every concrete shape Init, replacing CE's inline merge loop. Normally a
   * FixedJoint welds the two shapes into ONE b2Body (`other.Init(world,
   * this.m_body)`). A TRIGGERED fixed joint (non-empty triggerList) instead
   * gets its own bodies plus a limit-locked b2RevoluteJoint, so that
   * TRIGGER_DESTROY can break it at runtime.
   *
   * First pass pairs up duplicate fixed joints: if two enabled FixedJoints
   * connect the same part pair and NOT BOTH are triggered, both are "excluded"
   * — a redundant weld forces the stiff-body path (you can't break one of two
   * welds). Untriggered joints take the classic same-body weld, keeping the
   * shared-body origins (and therefore replays) identical to before.
   */
  public CheckFixedJoints(world: b2World): void {
    var excluded: boolean[] = new Array(this.m_joints.length);
    for (var i: number = 0; i < excluded.length; i++) excluded[i] = false;

    for (i = 0; i < this.m_joints.length - 1; i++) {
      if (this.m_joints[i].isEnabled && this.m_joints[i] instanceof FixedJoint) {
        var fj1: FixedJoint = this.m_joints[i] as FixedJoint;
        for (var j: number = i + 1; j < this.m_joints.length; j++) {
          if (this.m_joints[j].isEnabled && this.m_joints[j] instanceof FixedJoint) {
            var fj2: FixedJoint = this.m_joints[j] as FixedJoint;
            if (
              ((fj1.part1 == fj2.part1 && fj1.part2 == fj2.part2) ||
                (fj1.part1 == fj2.part2 && fj1.part2 == fj2.part1)) &&
              (!fj1.IsTriggered() || !fj2.IsTriggered())
            ) {
              excluded[i] = excluded[j] = true;
            }
          }
        }
      }
    }

    for (i = 0; i < this.m_joints.length; i++) {
      if (this.m_joints[i].isEnabled && this.m_joints[i] instanceof FixedJoint) {
        var connectedPart: ShapePart = this.m_joints[i].GetOtherPart(this);
        if (connectedPart.isEnabled) {
          var fj: FixedJoint = this.m_joints[i] as FixedJoint;
          if (!excluded[i] && fj.IsTriggered()) {
            if (!fj.triggerInitted) {
              fj.triggerInitted = true;
              if (!connectedPart.isInitted) connectedPart.Init(world);
              var def: b2RevoluteJointDef = new b2RevoluteJointDef();
              def.enableMotor = false;
              def.maxMotorTorque = 0;
              def.enableLimit = true;
              def.lowerAngle = 0;
              def.upperAngle = 0;
              def.Initialize(this.m_body!, connectedPart.GetBody()!, new b2Vec2(fj.anchorX, fj.anchorY));
              fj.MakeStiffFixedJoint(world.CreateJoint(def));
            }
          } else {
            connectedPart.Init(world, this.m_body);
          }
        }
      }
    }
  }

  public GetActiveJoints(): Array<any> {
    return this.m_joints.filter(() => this.IsEnabled());
  }

  public GetActiveThrusters(): Array<any> {
    return this.m_thrusters.filter(() => this.IsEnabled());
  }

  public WillBeStatic(shapeList: Array<any> | null = null): boolean {
    if (this.isStatic) return true;
    if (shapeList == null) shapeList = new Array();
    shapeList.push(this);
    for (var i: number = 0; i < this.m_joints.length; i++) {
      if (this.m_joints[i] instanceof FixedJoint) {
        var otherShape: ShapePart = this.m_joints[i].GetOtherPart(this);
        if (!Util.ObjectInArray(otherShape, shapeList) && otherShape.WillBeStatic(shapeList)) return true;
      }
    }
    return false;
  }

  public GetAttachedParts(partList: Array<any> | null = null): Array<any> {
    if (partList == null) partList = new Array();
    partList.push(this);

    for (var i: number = 0; i < this.m_joints.length; i++) {
      if (this.m_joints[i].isEnabled) {
        var alreadyThere: boolean = false;
        for (var j: number = 0; j < partList.length; j++) {
          if (this.m_joints[i] == partList[j]) alreadyThere = true;
        }

        if (!alreadyThere) partList.concat(this.m_joints[i].GetAttachedParts(partList));
      }
    }

    for (i = 0; i < this.m_thrusters.length; i++) {
      if (this.m_thrusters[i].isEnabled) {
        alreadyThere = false;
        for (j = 0; j < partList.length; j++) {
          if (this.m_thrusters[i] == partList[j]) alreadyThere = true;
        }

        if (!alreadyThere) partList.concat(this.m_thrusters[i].GetAttachedParts(partList));
      }
    }

    return partList;
  }

  public static GetOutlineVertices(verts: Array<any>, numVerts: number, thickness: number): Array<any> {
    var newVerts: Array<any> = new Array();
    if (numVerts == 3) {
      var center = Util.Vector(
        (verts[0].x + verts[1].x + verts[2].x) / 3,
        (verts[0].y + verts[1].y + verts[2].y) / 3
      );
      var length1: number = Util.GetDist(verts[0].x, verts[0].y, verts[1].x, verts[1].y);
      var length2: number = Util.GetDist(verts[0].x, verts[0].y, verts[2].x, verts[2].y);
      var length3: number = Util.GetDist(verts[1].x, verts[1].y, verts[2].x, verts[2].y);
      var avgLength: number = (length1 + length2 + length3) / 3;
      var a1: number = Util.NormalizeAngle(
        Math.acos((length1 * length1 + length2 * length2 - length3 * length3) / (2 * length1 * length2))
      );
      var a2: number = Util.NormalizeAngle(
        Math.acos((length1 * length1 + length3 * length3 - length2 * length2) / (2 * length1 * length3))
      );
      var a3: number = Util.NormalizeAngle(
        Math.acos((length2 * length2 + length3 * length3 - length1 * length1) / (2 * length2 * length3))
      );
      var minAngle: number = (Math.min(a1, a2, a3) * 180) / Math.PI;
      var angleFactor: number = minAngle < 30 ? 30 / minAngle : 1;
      var scaleFactor: number = 1 + ((2.5 * thickness) / avgLength) * angleFactor;
      newVerts.push(
        Util.Vector(center.x + (verts[0].x - center.x) * scaleFactor, center.y + (verts[0].y - center.y) * scaleFactor)
      );
      newVerts.push(
        Util.Vector(center.x + (verts[1].x - center.x) * scaleFactor, center.y + (verts[1].y - center.y) * scaleFactor)
      );
      newVerts.push(
        Util.Vector(center.x + (verts[2].x - center.x) * scaleFactor, center.y + (verts[2].y - center.y) * scaleFactor)
      );
    } else {
      for (var i: number = 0; i < numVerts; i++) {
        var prev = i == 0 ? verts[numVerts - 1] : verts[i - 1];
        var cur = verts[i];
        var next = i == numVerts - 1 ? verts[0] : verts[i + 1];
        var angle1: number = Math.atan2(prev.y - cur.y, prev.x - cur.x);
        var angle2: number = Math.atan2(next.y - cur.y, next.x - cur.x);
        var bisectorAngle: number = Util.NormalizeAngle(
          (angle1 + angle2) / 2 + (Math.max(angle1, angle2) - Math.min(angle1, angle2) < Math.PI ? Math.PI : 0)
        );
        newVerts.push(
          Util.Vector(
            cur.x + Math.cos(bisectorAngle) * thickness * 1.1,
            cur.y + Math.sin(bisectorAngle) * thickness * 1.1
          )
        );
      }
    }

    return newVerts;
  }

  public equals(other: ShapePart): boolean {
    return (
      this.isStatic == other.isStatic &&
      this.NumbersEqual(this.centerX, other.centerX) &&
      this.NumbersEqual(this.centerY, other.centerY) &&
      this.NumbersEqual(this.density, other.density) &&
      this.NumbersEqual(this.friction, other.friction) &&
      this.NumbersEqual(this.restitution, other.restitution) &&
      this.NumbersEqual(this.angle, other.angle) &&
      this.collide == other.collide &&
      this.collA == other.collA &&
      this.collB == other.collB &&
      this.collC == other.collC &&
      this.collD == other.collD &&
      this.subColl == other.subColl &&
      this.triggerAction == other.triggerAction &&
      this.triggerAction_2 == other.triggerAction_2 &&
      this.triggerName == other.triggerName &&
      this.triggerName_2 == other.triggerName_2 &&
      this.onGroundHit == other.onGroundHit &&
      this.onGroundHit_2 == other.onGroundHit_2 &&
      this.onSameName == other.onSameName &&
      this.onSameName_2 == other.onSameName_2 &&
      this.red == other.red &&
      this.green == other.green &&
      this.blue == other.blue &&
      this.opacity == other.opacity &&
      this.outline == other.outline &&
      this.terrain == other.terrain &&
      this.undragable == other.undragable
    );
  }

  public NumbersEqual(n1: number, n2: number): boolean {
    return Math.abs(n1 - n2) < 0.0001;
  }

  public ToString(): string {
    return (
      "centerX=" +
      this.centerX +
      ", " +
      "centerY=" +
      this.centerY +
      ", " +
      "density=" +
      this.density +
      ", " +
      "angle=" +
      this.angle +
      ", " +
      "collide=" +
      this.collide +
      ", " +
      super.ToString()
    );
  }
}
