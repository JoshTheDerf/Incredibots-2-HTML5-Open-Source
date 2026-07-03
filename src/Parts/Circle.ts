import { b2Body, b2BodyDef, b2CircleDef, b2MassData, b2Vec2, b2World } from "../Box2D";
import { Util } from "../General/Util"
import { COLLISION_GROUP_UNSET } from "./partDefaults"
import { ShapePart } from "./ShapePart"

export class Circle extends ShapePart {
  public radius: number;

  public initRadius!: number;

  public static MIN_RADIUS: number = 0.1;
  public static MAX_RADIUS: number = 5.0;

  constructor(x: number, y: number, rad: number, checkLimits: boolean = true) {
    super(x, y);

    if (checkLimits) {
      if (rad < Circle.MIN_RADIUS) rad = Circle.MIN_RADIUS;
      if (rad > Circle.MAX_RADIUS) rad = Circle.MAX_RADIUS;
    }

    this.radius = rad;
    this.type = "Circle";
  }

  public InsideShape(xVal: number, yVal: number, scale: number): boolean {
    return Util.GetDist(this.centerX, this.centerY, xVal, yVal) <= this.radius;
  }

  public GetArea(): number {
    return Math.PI * this.radius * this.radius;
  }

  public MakeCopy(): ShapePart {
    var circ: Circle = new Circle(this.centerX, this.centerY, this.radius);
    circ.density = this.density;
    circ.angle = this.angle;
    circ.collide = this.collide;
    circ.isStatic = this.isStatic;
    circ.red = this.red;
    circ.green = this.green;
    circ.blue = this.blue;
    circ.opacity = this.opacity;
    circ.outline = this.outline;
    circ.terrain = this.terrain;
    circ.undragable = this.undragable;
    this.CopyJaybitFieldsTo(circ);
    return circ;
  }

  public Init(world: b2World, body: b2Body | null = null): void {
    if (this.isInitted) return;
    super.Init(world);

    var circ = new b2CircleDef();
    circ.radius = this.radius;
    // Jaybit adjustable material (Circle.as:115-117): defaults 11/7 convert to
    // CE's hardcoded 0.4/0.3 exactly.
    circ.friction = Util.ConvertFrictionToBox2D(this.friction);
    circ.restitution = Util.ConvertRestitutionToBox2D(this.restitution);

    //CE PROBLEM
    //circ.density = (Math.max(1, Math.min(30, density)) + 5.0) / 10.0;

    //CE FIX
    circ.density = (this.density + 5.0) / 10.0;

    // Collision layers A-D -> category == mask bits (Circle.as:96-118).
    var bits: number = this.GetCollisionBits();
    circ.filter.categoryBits = bits;
    circ.filter.maskBits = 0xffff & bits;
    if (this.m_collisionGroup != COLLISION_GROUP_UNSET) circ.filter.groupIndex = this.m_collisionGroup;

    var bodyStatic:boolean = false;

    if (body) {
      circ.localPosition = new b2Vec2(this.centerX - body.GetPosition().x, this.centerY - body.GetPosition().y);
      this.m_body = body;
      bodyStatic = body.IsStatic();
    } else {
      var bd = new b2BodyDef();
      bd.position.Set(this.centerX, this.centerY);
      if (this.isEditable) {
        var hasJoints:boolean = false;
        for (var j:number = 0; j < this.m_joints.length; j++) {
          if (this.m_joints[j].isEnabled) {
            hasJoints = true;
            break;
          }
        }
        if (!hasJoints) bd.isBullet = true;
      }
      if (this.isBullet) bd.isBullet = true;
      this.m_body = world.CreateBody(bd);
    }
    circ.userData = new Object();
    circ.userData.collide = this.collide;
    // Per-shape water opt-out (IB3 ShapePart.Init sets fixture userData
    // isBuoyant from part.buoyant; read by the water controllers).
    circ.userData.isBuoyant = this.buoyant;
    circ.userData.editable = this.isEditable;
    circ.userData.red = this.red;
    circ.userData.green = this.green;
    circ.userData.blue = this.blue;
    circ.userData.outline = this.outline;
    circ.userData.terrain = this.terrain;
    circ.userData.undragable = this.undragable;
    circ.userData.isPiston = -1;
    circ.userData.isSandbox = this.isSandbox;
    // Trigger snapshot (Jaybit Circle.as:168-182): the source shape's trigger
    // config plus the parsed CSV token lists and the empty dispatch arrays the
    // play-start wiring pass (wireTriggers) fills.
    circ.userData.triggerName = this.triggerName;
    circ.userData.triggerName_2 = this.triggerName_2;
    circ.userData.triggerList = this.triggerName.replace(/ /g, "").split(",");
    circ.userData.triggerList_2 = this.triggerName_2.replace(/ /g, "").split(",");
    circ.userData.triggerAction = this.triggerAction;
    circ.userData.triggerAction_2 = this.triggerAction_2;
    circ.userData.onGroundHit = this.onGroundHit;
    circ.userData.onGroundHit_2 = this.onGroundHit_2;
    circ.userData.onSameName = this.onSameName;
    circ.userData.onSameName_2 = this.onSameName_2;
    circ.userData.jointsToTrigger = new Array();
    circ.userData.actionsToTrigger = new Array();
    circ.userData.isFirstTrigger = new Array();
    this.m_shape = this.m_body.CreateShape(circ);
    if (this.isStatic || bodyStatic) this.m_body.SetMass(new b2MassData());
    else this.m_body.SetMassFromShapes();

    // Weld/lock fixed-joint partners (Jaybit Circle.as:192 CheckFixedJoints —
    // replaces CE's inline merge loop; untriggered joints still body-merge).
    this.CheckFixedJoints(world);
  }

  public IntersectsBox(boxX: number, boxY: number, boxW: number, boxH: number): boolean {
    if (this.centerX >= boxX && this.centerX <= boxX + boxW && this.centerY >= boxY && this.centerY <= boxY + boxH) {
      return true;
    }
    if (this.centerX >= boxX && this.centerX <= boxX + boxW) {
      if (Math.abs(boxY - this.centerY) <= this.radius) return true;
      if (Math.abs(boxY + boxH - this.centerY) <= this.radius) return true;
    }
    if (this.centerY >= boxY && this.centerY <= boxY + boxH) {
      if (Math.abs(boxX - this.centerX) <= this.radius) return true;
      if (Math.abs(boxX + boxW - this.centerX) <= this.radius) return true;
    }
    if (Util.GetDist(this.centerX, this.centerY, boxX, boxY) < this.radius) return true;
    if (Util.GetDist(this.centerX, this.centerY, boxX + boxW, boxY) < this.radius) return true;
    if (Util.GetDist(this.centerX, this.centerY, boxX + boxW, boxY + boxH) < this.radius) return true;
    if (Util.GetDist(this.centerX, this.centerY, boxX, boxY + boxH) < this.radius) return true;

    return false;
  }

  public PrepareForResizing(): void {
    this.initRadius = this.radius;
  }

  public equals(other: ShapePart): boolean {
    return other instanceof Circle && this.NumbersEqual(this.radius, (other as Circle).radius) && super.equals(other);
  }

  public ToString(): string {
    return "Circle: radius=" + this.radius + ", " + super.ToString();
  }
}
