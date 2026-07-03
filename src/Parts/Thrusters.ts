import { b2Body, b2Vec2, b2World } from "../Box2D";
import { Util } from "../General/Util"
import { Part } from "./Part"
import { MAX_THRUSTER_STRENGTH, TRIGGER_DESTROY, TRIGGER_FIRE, TRIGGER_NONE } from "./partDefaults"
import { getPhysicsBackend } from "./partGlobals"
import { ShapePart } from "./ShapePart"

export class Thrusters extends Part {
  public shape: ShapePart;
  public centerX: number;
  public centerY: number;
  public strength: number;
  public angle: number;
  public thrustKey: number;
  public autoOn: boolean;
  // IB3 Thrusters.enableKey (IB3 Thrusters.as:24, default true :54): when false
  // the thrust key is ignored entirely (KeyInput :96-102) — the thruster then
  // only fires via auto-on or a trigger. Persisted optional-guarded (-> true).
  public enableKey: boolean = true;

  /**
   * Comma-separated trigger names this thruster LISTENS to (Jaybit
   * Thrusters.as:16-38; persisted).
   */
  public triggerList: string = "";
  /** Runtime trigger-contact counter (Jaybit Thrusters.as:16; NOT persisted). */
  public triggerTouches: number = 0;
  /** Runtime "thrust while touched" flag = triggerTouches > 0 (Thrusters.as:20). */
  private triggerThruster: boolean = false;

  public isBalloon: boolean = false;
  public shapeIndex: number = -1;
  private isKeyDown: boolean = false;
  private relativeThrusterPos!: b2Vec2;

  constructor(p1: ShapePart, x: number, y: number) {
    super();
    this.shape = p1;
    this.centerX = x;
    this.centerY = y;
    this.type = "Thrusters";
    if (MAX_THRUSTER_STRENGTH < 15.0) {
      this.strength = MAX_THRUSTER_STRENGTH;
    } else {
      this.strength = 15.0;
    }
    this.angle = -Math.PI / 2;
    this.thrustKey = 38;
    this.autoOn = false;
    this.shape.AddThrusters(this);
  }

  public MakeCopy(p: ShapePart): Thrusters {
    var t: Thrusters = new Thrusters(p, this.centerX, this.centerY);
    t.strength = this.strength;
    t.autoOn = this.autoOn;
    t.thrustKey = this.thrustKey;
    t.angle = this.angle;
    t.enableKey = this.enableKey;
    t.triggerList = this.triggerList;
    return t;
  }

  public InsideShape(xVal: number, yVal: number, scale: number): boolean {
    return Util.GetDist(this.centerX, this.centerY, xVal, yVal) < (0.25 * 30) / scale;
  }

  /**
   * TRIGGER_DESTROY (add only) UnInits the thruster; FIRE counts touches then
   * recomputes triggerThruster (Jaybit Thrusters.as:61-84).
   */
  public DoTriggerAction(action: number, world: b2World | null = null, isAdd: boolean = true): boolean {
    if (action == TRIGGER_NONE) return false;
    if (action == TRIGGER_DESTROY && world && isAdd) {
      return this.DestroyThruster(world);
    }
    if (action == TRIGGER_FIRE) {
      if (isAdd) ++this.triggerTouches;
      else if (this.triggerTouches > 0) --this.triggerTouches;
      this.DetermineTriggered();
    }
    return false;
  }

  /** Thrust while any trigger contact is live (Jaybit Thrusters.as:155-158). */
  public DetermineTriggered(): void {
    this.triggerThruster = this.triggerTouches > 0;
  }

  /**
   * TRIGGER_DESTROY effect: UnInit the thruster so it stops applying force
   * for the rest of the run (Jaybit Thrusters.as:201-208).
   */
  public DestroyThruster(world: b2World): boolean {
    if (this.isInitted) {
      this.UnInit(world);
      return true;
    }
    return false;
  }

  public Init(world: b2World, body: b2Body | null = null): void {
    if (this.isInitted || !this.shape.isInitted) return;
    super.Init(world);
    // Per-play trigger runtime reset (Jaybit Thrusters.as Init :170-175).
    this.triggerThruster = false;
    this.triggerTouches = 0;
    this.isKeyDown = false;
    this.relativeThrusterPos = Util.Vector(this.centerX, this.centerY);
    this.relativeThrusterPos.Subtract(this.shape.GetBody()!.GetPosition());
  }

  public KeyInput(key: number, up: boolean, replay: boolean): void {
    // IB3 Thrusters.KeyInput (:96-102): the thrust key only registers while
    // enableKey is set (auto-on / triggers still fire it).
    if (this.enableKey && key == this.thrustKey) this.isKeyDown = !up;
  }

  public Update(world: b2World): void {
    // Thrust while the key is held, a trigger contact is live, or auto-on
    // (Jaybit Thrusters.as Update :141).
    if (this.isInitted && (this.isKeyDown || this.triggerThruster || this.autoOn)) {
      var forceAngle: number = this.angle + this.shape.GetBody()!.GetAngle();
      if (this.isBalloon) forceAngle = -Math.PI / 2;

      //CE PROBLEM
      //var forceStrength:number = 10 + Math.max(1, Math.min(30, strength)) * Math.max(1, Math.min(30, strength)) * 10;

      //CE FIX
      var forceStrength: number = 10 + this.strength * this.strength * 10;

      var forceVector = Util.Vector(Math.cos(forceAngle) * forceStrength, Math.sin(forceAngle) * forceStrength);
      var positionVector = this.shape.GetBody()!.GetWorldPoint(this.relativeThrusterPos);
      getPhysicsBackend().applyForce(this.shape.GetBody()!, forceVector, positionVector);
    }
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

  public GetAttachedParts(partList: Array<any> | null = null): Array<any> {
    if (partList == null) partList = new Array();
    partList.push(this);

    var shapeThere: boolean = false;
    for (var i: number = 0; i < partList.length; i++) {
      if (this.shape == partList[i]) shapeThere = true;
    }
    if (!shapeThere) partList.concat(this.shape.GetAttachedParts(partList));

    return partList;
  }

  public IntersectsBox(boxX: number, boxY: number, boxW: number, boxH: number): boolean {
    return this.centerX >= boxX && this.centerX <= boxX + boxW && this.centerY >= boxY && this.centerY <= boxY + boxH;
  }

  public PrepareForResizing(): void {}

  public ToString(): string {
    return (
      "Thrusters: x=" + this.centerX + ", y=" + this.centerY + ", strength=" + this.strength + ", " + super.ToString()
    );
  }
}
