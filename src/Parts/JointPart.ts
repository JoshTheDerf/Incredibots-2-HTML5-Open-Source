import { b2Joint, b2World } from "../Box2D";
import { Util } from "../General/Util"
import { getPhysicsBackend } from "./partGlobals"
import { IllegalOperationError, Part } from "./Part"
import { ShapePart } from "./ShapePart"

export class JointPart extends Part {
  public part1: ShapePart;
  public part2: ShapePart;
  public part1Index: number = -1;
  public part2Index: number = -1;
  public anchorX: number;
  public anchorY: number;
  /**
   * Comma-separated trigger names this joint LISTENS to (Jaybit
   * JointPart.as:15-27; persisted).
   */
  public triggerList: string = "";
  /**
   * Runtime trigger-contact counters (Jaybit JointPart.as:15-27; NOT
   * persisted): triggerTouches counts the slot's "forward" action contacts
   * (ROTATECW / EXPAND), triggerTouches_2 the opposing ones (ROTATECCW /
   * CONTRACT). Reset per play in each subclass's Init.
   */
  public triggerTouches: number = 0;
  public triggerTouches_2: number = 0;
  public m_joint: b2Joint | null = null;

  constructor(p1: ShapePart, p2: ShapePart) {
    super();
    this.part1 = p1;
    this.part2 = p2;
    this.part1.AddJoint(this);
    this.part2.AddJoint(this);
    this.anchorX = 0;
    this.anchorY = 0;
  }

  public GetJoint(): b2Joint | null {
    return this.m_joint;
  }

  public GetOtherPart(p: ShapePart): ShapePart | null {
    if (p == this.part1) return this.part2;
    if (p == this.part2) return this.part1;
    return null;
  }

  public UnInit(world: b2World): void {
    if (!this.isInitted) return;
    super.UnInit(world);
    this.m_joint = null;
  }

  public Move(xVal: number, yVal: number): void {
    this.anchorX = xVal;
    this.anchorY = yVal;
  }

  public RotateAround(xVal: number, yVal: number, curAngle: number): void {
    var dist: number = Util.GetDist(this.anchorX, this.anchorY, xVal, yVal);
    var absoluteAngle: number = this.rotateAngle + curAngle;
    this.Move(xVal + dist * Math.cos(absoluteAngle), yVal + dist * Math.sin(absoluteAngle));
  }

  public MakeCopy(p1: ShapePart, p2: ShapePart): JointPart {
    throw new IllegalOperationError("abstract JointPart.MakeCopy() called");
  }

  /**
   * Recompute the joint's trigger-driven motor flags from the touch counters
   * (Jaybit JointPart.as:72 — base is a no-op; Revolute/Prismatic override).
   */
  public DetermineTriggered(): void {
    // do nothing (overridden)
  }

  /**
   * Apply a trigger action to this joint (Jaybit JointPart.as:99 — base
   * returns false). Returns true only when the part was DESTROYed, telling
   * ProcessTriggers to unregister the dispatch entry.
   */
  public DoTriggerAction(action: number, world: b2World | null = null, isAdd: boolean = true): boolean {
    return false;
  }

  /**
   * Destroy the live b2 joint (Jaybit JointPart.DestroyJointPart). The part
   * itself remains (for reset); only the physics constraint is removed.
   * Returns true if a joint was actually destroyed.
   */
  public DestroyJointPart(world: b2World): boolean {
    if (this.m_joint) {
      getPhysicsBackend().destroyJoint(world, this.m_joint);
      this.m_joint = null;
      return true;
    }
    return false;
  }

  public GetAttachedParts(partList: Array<any> | null = null): Array<any> {
    if (partList == null) partList = new Array();
    partList.push(this);

    var part1There: boolean = false;
    var part2There: boolean = false;
    for (var i: number = 0; i < partList.length; i++) {
      if (this.part1 == partList[i]) part1There = true;
      if (this.part2 == partList[i]) part2There = true;
    }
    if (!part1There) partList.concat(this.part1.GetAttachedParts(partList));
    if (!part2There) partList.concat(this.part2.GetAttachedParts(partList));

    return partList;
  }

  public IntersectsBox(boxX: number, boxY: number, boxW: number, boxH: number): boolean {
    return this.anchorX >= boxX && this.anchorX <= boxX + boxW && this.anchorY >= boxY && this.anchorY <= boxY + boxH;
  }

  public PrepareForResizing(): void {}

  public ToString(): string {
    return "anchorX=" + this.anchorX + ", " + "anchorY=" + this.anchorY + ", " + super.ToString();
  }
}
