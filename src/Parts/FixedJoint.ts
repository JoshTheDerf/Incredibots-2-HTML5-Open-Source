import { b2Body, b2Joint, b2World } from "../Box2D";
import { Util } from "../General/Util"
import { JointPart } from "./JointPart"
import { TRIGGER_DESTROY } from "./partDefaults"
import { ShapePart } from "./ShapePart"

export class FixedJoint extends JointPart {
  // --- Runtime trigger state (Jaybit FixedJoint.as:12-16; NOT persisted). ---
  /** Set once ShapePart.CheckFixedJoints built this joint's locked revolute. */
  public triggerInitted: boolean = false;
  /** Set by TRIGGER_DESTROY (DestroyJointPart); guards the destroy-once. */
  public isDestroyed: boolean = false;
  /** Snapshot of IsTriggered() taken at Init. */
  public isTriggered: boolean = false;

  constructor(p1: ShapePart, p2: ShapePart, x: number, y: number) {
    super(p1, p2);
    this.anchorX = x;
    this.anchorY = y;
    this.type = "FixedJoint";
  }

  public Init(world: b2World, body: b2Body | null = null): void {
    if (this.isInitted || !this.part1.isInitted || !this.part2.isInitted) return;
    super.Init(world);
    this.isTriggered = this.IsTriggered();
  }

  public UnInit(world: b2World): void {
    // Reset the runtime trigger state BEFORE the isInitted guard (Jaybit
    // FixedJoint.as:80-91 clears these unconditionally).
    this.isTriggered = false;
    this.triggerInitted = false;
    this.isDestroyed = false;
    this.m_joint = null;
    if (!this.isInitted) return;
    super.UnInit(world);
  }

  /**
   * A fixed joint with a non-empty triggerList is "triggered": it gets its own
   * bodies plus a limit-locked b2RevoluteJoint instead of a body weld, so
   * TRIGGER_DESTROY can break it (Jaybit FixedJoint.as:56-59; the decompiled
   * regexp renders as `new RegExp("/, /","g")` — the intent is "non-empty
   * ignoring commas/spaces", matching the playButton source check's
   * replace(/[, ]/g,"")).
   */
  public IsTriggered(): boolean {
    return this.triggerList.replace(/[, ]/g, "") != "";
  }

  /** Store the locked b2RevoluteJoint CheckFixedJoints built (FixedJoint.as:76-79). */
  public MakeStiffFixedJoint(joint: b2Joint): void {
    this.m_joint = joint;
  }

  /**
   * Only DESTROY is meaningful, add-path only, once (guarded by isDestroyed) —
   * Jaybit FixedJoint.as:42-49.
   */
  public DoTriggerAction(action: number, world: b2World | null = null, isAdd: boolean = true): boolean {
    if (action == TRIGGER_DESTROY && !this.isDestroyed && isAdd && world) {
      return this.DestroyJointPart(world);
    }
    return false;
  }

  public DestroyJointPart(world: b2World): boolean {
    this.isDestroyed = true;
    return super.DestroyJointPart(world);
  }

  public SetJointProperties(other: FixedJoint): void {
    this.triggerList = other.triggerList;
  }

  public MakeCopy(p1: ShapePart, p2: ShapePart): JointPart {
    var j: FixedJoint = new FixedJoint(p1, p2, this.anchorX, this.anchorY);
    j.triggerList = this.triggerList;
    return j;
  }

  public Update(world: b2World): void {}

  public InsideShape(xVal: number, yVal: number, scale: number): boolean {
    return Util.GetDist(this.anchorX, this.anchorY, xVal, yVal) < (0.18 * 30) / scale;
  }

  public KeyInput(key: number, up: boolean, replay: boolean): void {
    // do nothing
  }

  public ToString(): string {
    return "FixedJoint: " + super.ToString();
  }
}
