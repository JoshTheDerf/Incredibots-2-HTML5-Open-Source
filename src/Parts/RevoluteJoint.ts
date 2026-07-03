import { b2Body, b2RevoluteJoint, b2RevoluteJointDef, b2Vec2, b2World } from "../Box2D";
import { Util } from "../General/Util"
import { Circle } from "./Circle"
import { JointPart } from "./JointPart"
import {
  MAX_RJ_SPEED,
  MAX_RJ_STRENGTH,
  TRIGGER_DESTROY,
  TRIGGER_NONE,
  TRIGGER_ROTATECCW,
  TRIGGER_ROTATECW,
} from "./partDefaults"
import { ShapePart } from "./ShapePart"

export class RevoluteJoint extends JointPart {
  public enableMotor: boolean;
  public motorCWKey: number;
  public motorCCWKey: number;
  public motorStrength: number;
  public motorSpeed: number;
  public motorLowerLimit: number;
  public motorUpperLimit: number;
  public isStiff: boolean;
  public autoCW: boolean;
  public autoCCW: boolean;

  private isKeyDown1: boolean = false;
  private isKeyDown2: boolean = false;
  private wasKeyDown1: boolean = false;
  private wasKeyDown2: boolean = false;
  // Runtime trigger-driven motor flags (Jaybit RevoluteJoint.as:22/:36; NOT
  // persisted). Recomputed by DetermineTriggered from the touch counters.
  private triggerMotorCW: boolean = false;
  private triggerMotorCCW: boolean = false;
  private targetJointAngle!: number;
  private prevJointAngle!: number;

  constructor(p1: ShapePart, p2: ShapePart, x: number, y: number) {
    super(p1, p2);
    this.anchorX = x;
    this.anchorY = y;
    this.enableMotor = false;
    this.isStiff = false;
    this.autoCW = false;
    this.autoCCW = false;
    this.motorCWKey = 39;
    this.motorCCWKey = 37;
    if (MAX_RJ_STRENGTH < 15.0) {
      this.motorStrength = MAX_RJ_STRENGTH;
    } else {
      this.motorStrength = 15.0;
    }
    if (MAX_RJ_SPEED < 15.0) {
      this.motorSpeed = MAX_RJ_SPEED;
    } else {
      this.motorSpeed = 15.0;
    }
    this.motorLowerLimit = -Number.MAX_VALUE;
    this.motorUpperLimit = Number.MAX_VALUE;
    this.type = "RevoluteJoint";
  }

  public SetJointProperties(other: RevoluteJoint): void {
    this.enableMotor = other.enableMotor;
    this.motorCWKey = other.motorCWKey;
    this.motorCCWKey = other.motorCCWKey;
    this.motorStrength = other.motorStrength;
    this.motorSpeed = other.motorSpeed;
    this.motorLowerLimit = other.motorLowerLimit;
    this.motorUpperLimit = other.motorUpperLimit;
    this.isStiff = other.isStiff;
    this.autoCW = other.autoCW;
    this.autoCCW = other.autoCCW;
    this.triggerList = other.triggerList;
  }

  public MakeCopy(p1: ShapePart, p2: ShapePart): JointPart {
    var j: RevoluteJoint = new RevoluteJoint(p1, p2, this.anchorX, this.anchorY);
    j.enableMotor = this.enableMotor;
    j.motorCWKey = this.motorCWKey;
    j.motorCCWKey = this.motorCCWKey;
    j.motorStrength = this.motorStrength;
    j.motorSpeed = this.motorSpeed;
    j.motorLowerLimit = this.motorLowerLimit;
    j.motorUpperLimit = this.motorUpperLimit;
    j.isStiff = this.isStiff;
    j.autoCW = this.autoCW;
    j.autoCCW = this.autoCCW;
    j.triggerList = this.triggerList;
    return j;
  }

  /**
   * TRIGGER_DESTROY (add only) destroys the b2 joint; ROTATECW/CCW count
   * touches into the two counters then recompute the motor flags (Jaybit
   * RevoluteJoint.as:82-117).
   */
  public DoTriggerAction(action: number, world: b2World | null = null, isAdd: boolean = true): boolean {
    if (action == TRIGGER_NONE) return false;
    if (action == TRIGGER_DESTROY && world && isAdd) {
      return this.DestroyJointPart(world);
    }
    if (action == TRIGGER_ROTATECW) {
      if (isAdd) ++this.triggerTouches;
      else if (this.triggerTouches > 0) --this.triggerTouches;
      this.DetermineTriggered();
    } else if (action == TRIGGER_ROTATECCW) {
      if (isAdd) ++this.triggerTouches_2;
      else if (this.triggerTouches_2 > 0) --this.triggerTouches_2;
      this.DetermineTriggered();
    }
    return false;
  }

  /**
   * Recompute the trigger motor flags (Jaybit RevoluteJoint.as:155-170).
   * FAITHFUL QUIRK (port bug-for-bug for replay fidelity): the `>`/`<`
   * branches set one flag true WITHOUT clearing the other — only equality
   * clears both. E.g. touches 2/1 then 2/3 leaves BOTH flags true, and
   * Update()'s branch ordering makes CW win while a player key can override.
   */
  public DetermineTriggered(): void {
    if (this.triggerTouches == this.triggerTouches_2) {
      this.triggerMotorCW = false;
      this.triggerMotorCCW = false;
    } else if (this.triggerTouches > this.triggerTouches_2) {
      this.triggerMotorCW = true;
    } else if (this.triggerTouches < this.triggerTouches_2) {
      this.triggerMotorCCW = true;
    }
  }

  public Init(world: b2World, body: b2Body | null = null): void {
    if (this.isInitted || !this.part1.isInitted || !this.part2.isInitted) return;
    super.Init(world);
    // Per-play trigger runtime reset (Jaybit RevoluteJoint.as Init :279-282).
    this.triggerTouches = 0;
    this.triggerTouches_2 = 0;
    this.triggerMotorCW = false;
    this.triggerMotorCCW = false;

    if (this.part1.GetBody() != this.part2.GetBody()) {
      var jd = new b2RevoluteJointDef();
      jd.enableMotor = this.enableMotor;

      //CE PROBLEM
      //jd.maxMotorTorque = Math.max(1, Math.min(30, motorStrength)) * 30;

      //CE FIX
      jd.maxMotorTorque = this.motorStrength * 30;

      jd.enableLimit = (this.motorLowerLimit != -Number.MAX_VALUE || this.motorUpperLimit != Number.MAX_VALUE);
      if (this.motorLowerLimit == -Number.MAX_VALUE) jd.lowerAngle = -Number.MAX_VALUE;
      else jd.lowerAngle = this.motorLowerLimit * Math.PI / 180.0;
      if (this.motorUpperLimit == Number.MAX_VALUE) jd.upperAngle = Number.MAX_VALUE;
      else jd.upperAngle = this.motorUpperLimit * Math.PI / 180.0;
      if (this.part1 instanceof Circle && !(this.part2 instanceof Circle)) {
        jd.Initialize(this.part2.GetBody()!, this.part1.GetBody()!, new b2Vec2(this.anchorX, this.anchorY));
      } else if (this.part2 instanceof Circle && !(this.part1 instanceof Circle)) {
        jd.Initialize(this.part1.GetBody()!, this.part2.GetBody()!, new b2Vec2(this.anchorX, this.anchorY));
      } else if (this.part1.HeavierThan(this.part2)) {
        jd.Initialize(this.part1.GetBody()!, this.part2.GetBody()!, new b2Vec2(this.anchorX, this.anchorY));
      } else {
        jd.Initialize(this.part2.GetBody()!, this.part1.GetBody()!, new b2Vec2(this.anchorX, this.anchorY));
      }
      this.m_joint = world.CreateJoint(jd);
      this.targetJointAngle = 0;

      this.isKeyDown1 = false;
      this.isKeyDown2 = false;
      this.wasKeyDown1 = false;
      this.wasKeyDown2 = false;
    }
}

  public CheckForBreakage(world: b2World): void {
    if (this.m_joint) {
      var joint = (this.m_joint) as b2RevoluteJoint;

      // Check joint constraints to see if the joint should break
      var dist:number = Util.GetDist(joint.GetAnchor1().x, joint.GetAnchor1().y, joint.GetAnchor2().x, joint.GetAnchor2().y);
      if (dist > 3.0) {
        world.DestroyJoint(this.m_joint);
        this.m_joint = null;
      }
    }
  }

  /** Drive the motor clockwise (Jaybit RevoluteJoint.MotorCW; CE-FIX unclamped values kept). */
  private MotorCW(joint: b2RevoluteJoint): void {
    //CE PROBLEM
    //joint.SetMotorSpeed(Math.max(1, Math.min(30, motorSpeed)));

    //CE FIX
    joint.SetMotorSpeed(this.motorSpeed);

    if (this.isStiff && this.wasKeyDown1 && joint.GetJointAngle() < this.prevJointAngle) {
      joint.SetMotorSpeed(0/*(prevJointAngle - joint.GetJointAngle()) * 2*/);

      //CE PROBLEM
      //joint.m_maxMotorTorque = Math.max(1, Math.min(30, motorStrength)) * 3000;

      //CE FIX
      joint.m_maxMotorTorque = this.motorStrength * 3000;

    }
  }

  /** Drive the motor counter-clockwise (Jaybit RevoluteJoint.MotorCCW). */
  private MotorCCW(joint: b2RevoluteJoint): void {
    //CE PROBLEM
    //joint.SetMotorSpeed(-Math.max(1, Math.min(30, motorSpeed)));

    //CE FIX
    joint.SetMotorSpeed(0.0 - this.motorSpeed);

    if (this.isStiff && this.wasKeyDown2 && joint.GetJointAngle() > this.prevJointAngle) {
      joint.SetMotorSpeed(0/*(prevJointAngle - joint.GetJointAngle()) * 2*/);

      //CE PROBLEM
      //joint.m_maxMotorTorque = Math.max(1, Math.min(30, motorStrength)) * 3000;

      //CE FIX
      joint.m_maxMotorTorque = this.motorStrength * 3000;

    }
  }

  /**
   * Per-frame motor drive with the Jaybit "activation priorities" merge
   * (RevoluteJoint.as Update :187-228): player key OVERRIDES an opposing
   * trigger; a trigger overrides auto-spin (auto only runs when neither key
   * nor opposing trigger is active). The stiff-hold bookkeeping
   * (wasKeyDown1/2) includes the trigger flags.
   */
  public Update(world: b2World): void {
    if (this.m_joint && this.enableMotor) {
      var joint = (this.m_joint) as b2RevoluteJoint;
      if (this.isKeyDown1 || this.isKeyDown2 || this.triggerMotorCW || this.triggerMotorCCW) {
        joint.EnableMotor(true);

        //CE PROBLEM
        //joint.m_maxMotorTorque = Math.max(1, Math.min(30, motorStrength)) * 30;

        //CE FIX
        joint.m_maxMotorTorque = this.motorStrength * 30;

        this.part1.GetBody()!.WakeUp();
        this.part2.GetBody()!.WakeUp();
      }
      if (this.isKeyDown1 && this.triggerMotorCCW) {
        this.MotorCW(joint); // player key overrides the opposing trigger
      } else if (this.isKeyDown2 && this.triggerMotorCW) {
        this.MotorCCW(joint);
      } else if (this.isKeyDown1 || this.triggerMotorCW || (this.autoCW && !this.isKeyDown2 && !this.triggerMotorCCW)) {
        this.MotorCW(joint);
      } else if (this.isKeyDown2 || this.triggerMotorCCW || (this.autoCCW && !this.isKeyDown1 && !this.triggerMotorCW)) {
        this.MotorCCW(joint);
      } else {
        if (this.wasKeyDown1 || this.wasKeyDown2) {
          this.targetJointAngle = joint.GetJointAngle();
        }
        joint.EnableMotor(this.isStiff);
        joint.SetMotorSpeed(0/*(targetJointAngle - joint.GetJointAngle()) * 2*/);

        //CE PROBLEM
        //joint.m_maxMotorTorque = Math.max(1, Math.min(30, motorStrength)) * 3000;

        //CE FIX
        joint.m_maxMotorTorque = this.motorStrength * 3000;

      }
      this.wasKeyDown1 = this.isKeyDown1 || this.triggerMotorCW;
      this.wasKeyDown2 = this.isKeyDown2 || this.triggerMotorCCW;
      this.prevJointAngle = joint.GetJointAngle();
    }
  }

  public InsideShape(xVal: number, yVal: number, scale: number): boolean {
    return Util.GetDist(this.anchorX, this.anchorY, xVal, yVal) < (0.18 * 30) / scale;
  }

  public KeyInput(key: number, up: boolean, replay: boolean): void {
    if (key == this.motorCWKey) this.isKeyDown1 = !up;
    if (key == this.motorCCWKey) this.isKeyDown2 = !up;
  }

  public ToString(): string {
    return (
      "RevoluteJoint: enableMotor=" +
      this.enableMotor +
      ", motorCWKey=" +
      this.motorCWKey +
      ", motorCCWKey=" +
      this.motorCCWKey +
      ", motorStrength=" +
      this.motorStrength +
      ", motorSpeed=" +
      this.motorSpeed +
      ", motorLowerLimit=" +
      this.motorLowerLimit +
      ", motorUpperLimit=" +
      this.motorUpperLimit +
      ", isStiff=" +
      this.isStiff +
      ", " +
      super.ToString()
    );
  }
}
