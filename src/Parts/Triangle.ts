import { b2Body, b2BodyDef, b2MassData, b2PolygonDef, b2Vec2, b2World } from "../Box2D";
import { Util } from "../General/Util"
import { COLLISION_GROUP_UNSET } from "./partDefaults"
import { getPhysicsBackend } from "./partGlobals"
import { ShapePart } from "./ShapePart"

export class Triangle extends ShapePart {
  public x1: number;
  public y1: number;
  public x2: number;
  public y2: number;
  public x3: number;
  public y3: number;

  public initX1!: number;
  public initY1!: number;
  public initX2!: number;
  public initY2!: number;
  public initX3!: number;
  public initY3!: number;

  public static MIN_SIDE_LENGTH: number = 0.1;
  public static MAX_SIDE_LENGTH: number = 10.0;
  public static MIN_TRIANGLE_ANGLE: number = (5.0 * Math.PI) / 180.0;

  constructor(nx1: number, ny1: number, nx2: number, ny2: number, nx3: number, ny3: number) {
    super(nx1, nx2);
    this.x1 = nx1;
    this.y1 = ny1;
    this.x2 = nx2;
    this.y2 = ny2;
    this.x3 = nx3;
    this.y3 = ny3;

    this.SwapVertices();

    var avgX: number = (this.x1 + this.x2 + this.x3) / 3.0;
    var avgY: number = (this.y1 + this.y2 + this.y3) / 3.0;
    this.centerX = avgX;
    this.centerY = avgY;

    this.type = "Triangle";
  }

  // makes sure vertices are in CW order, swaps them if necessary
  private SwapVertices(): void {
    var angle1: number = Util.NormalizeAngle(Math.atan2(this.y1 - this.y2, this.x2 - this.x1));
    var angle2: number = Util.NormalizeAngle(Math.atan2(this.y1 - this.y3, this.x3 - this.x1));
    if (angle2 < angle1) angle2 += 2 * Math.PI;
    if (angle2 - angle1 <= Math.PI) {
      var tempX: number = this.x2;
      var tempY: number = this.y2;
      this.x2 = this.x3;
      this.y2 = this.y3;
      this.x3 = tempX;
      this.y3 = tempY;
    }
  }

  public GetArea(): number {
    // Heron's formula
    var a: number = Util.GetDist(this.x1, this.y1, this.x2, this.y2);
    var b: number = Util.GetDist(this.x1, this.y1, this.x3, this.y3);
    var c: number = Util.GetDist(this.x2, this.y2, this.x3, this.y3);
    return Math.sqrt(Math.pow(a * a + b * b + c * c, 2) - 2 * (a * a * a * a + b * b * b * b + c * c * c * c)) / 4;
  }

  public GetVertices(): Array<any> {
    var verts: Array<any> = new Array(3);
    verts[0] = new b2Vec2(this.x1, this.y1);
    verts[1] = new b2Vec2(this.x2, this.y2);
    verts[2] = new b2Vec2(this.x3, this.y3);
    for (var i: number = 0; i < 3; i++) {
      var dist: number = Util.GetDist(this.centerX, this.centerY, (verts[i] as b2Vec2).x, (verts[i] as b2Vec2).y);
      var vertAngle: number = Math.atan2((verts[i] as b2Vec2).y - this.centerY, (verts[i] as b2Vec2).x - this.centerX);
      vertAngle = Util.NormalizeAngle(this.angle + vertAngle);
      verts[i].x = this.centerX + dist * Math.cos(vertAngle);
      verts[i].y = this.centerY + dist * Math.sin(vertAngle);
    }
    return verts;
  }

  public GetVerticesForOutline(thickness: number): Array<any> {
    return Triangle.GetOutlineVertices(this.GetVertices(), 3, thickness);
  }

  public InsideShape(xVal: number, yVal: number, scale: number): boolean {
    var allOnRightSide: boolean = true;
    var verts: Array<any> = this.GetVertices();
    for (var i: number = 0; i < 3; i++) {
      var slope: number;
      if (verts[(i + 1) % 3].x == verts[i].x) {
        if (verts[(i + 1) % 3].y >= verts[i].y) {
          slope = 100000000;
        } else {
          slope = -100000000;
        }
      } else {
        slope = (verts[(i + 1) % 3].y - verts[i].y) / (verts[(i + 1) % 3].x - verts[i].x);
      }
      var val1: number = yVal - verts[i].y - slope * (xVal - verts[i].x);
      var val2: number = verts[(i + 2) % 3].y - verts[i].y - slope * (verts[(i + 2) % 3].x - verts[i].x);
      if ((val1 < 0 && val2 > 0) || (val1 > 0 && val2 < 0)) allOnRightSide = false;
    }
    return allOnRightSide;
  }

  public Move(xVal: number, yVal: number): void {
    this.x1 = xVal + (this.x1 - this.centerX);
    this.y1 = yVal + (this.y1 - this.centerY);
    this.x2 = xVal + (this.x2 - this.centerX);
    this.y2 = yVal + (this.y2 - this.centerY);
    this.x3 = xVal + (this.x3 - this.centerX);
    this.y3 = yVal + (this.y3 - this.centerY);
    super.Move(xVal, yVal);
  }

  public MakeCopy(): ShapePart {
    var tri: Triangle = new Triangle(this.x1, this.y1, this.x2, this.y2, this.x3, this.y3);
    tri.density = this.density;
    tri.angle = this.angle;
    tri.collide = this.collide;
    tri.isStatic = this.isStatic;
    tri.red = this.red;
    tri.green = this.green;
    tri.blue = this.blue;
    tri.opacity = this.opacity;
    tri.outline = this.outline;
    tri.terrain = this.terrain;
    tri.undragable = this.undragable;
    this.CopyJaybitFieldsTo(tri);
    return tri;
  }

  public Init(world: b2World, body: b2Body | null = null): void {
    if (this.isInitted) return;
    super.Init(world);

    var sd = new b2PolygonDef();
    // Jaybit adjustable material (Triangle.as:266-267): defaults 11/7 convert
    // to CE's hardcoded 0.4/0.3 exactly.
    sd.friction = Util.ConvertFrictionToBox2D(this.friction);
    sd.restitution = Util.ConvertRestitutionToBox2D(this.restitution);

    //CE PROBLEM
    //sd.density = (Math.max(1, Math.min(30, density)) + 5.0) / 10.0;

    //CE FIX
    sd.density = (this.density + 5.0) / 10.0;

    sd.vertexCount = 3;
    // Collision layers A-D -> category == mask bits (see ShapePart.CollisionBits).
    var bits: number = this.GetCollisionBits();
    sd.filter.categoryBits = bits;
    sd.filter.maskBits = 0xffff & bits;
    if (this.m_collisionGroup != COLLISION_GROUP_UNSET) sd.filter.groupIndex = this.m_collisionGroup;
    sd.vertices = this.GetVertices();

    var bodyStatic:boolean = false;

    var i:number;
    if (body) {
      for (i = 0; i < 3; i++) {
        sd.vertices[i].x -= body.GetPosition().x;
        sd.vertices[i].y -= body.GetPosition().y;
      }
      this.m_body = body;
      bodyStatic = getPhysicsBackend().bodyIsStatic(body);
    } else {
      for (i = 0; i < 3; i++) {
        sd.vertices[i].x -= this.centerX;
        sd.vertices[i].y -= this.centerY;
      }
      var bd = new b2BodyDef();
      bd.position.Set(this.centerX, this.centerY);
      // IB3 fixedRotation locks body angle (IB3 ShapePart.MakeBody :238).
      bd.fixedRotation = this.fixedRotation;
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
      this.m_body = getPhysicsBackend().createBody(world, bd);
    }
    sd.userData = new Object();
    sd.userData.collide = this.collide;
    // Per-shape water opt-out (IB3 ShapePart.Init fixture userData isBuoyant).
    sd.userData.isBuoyant = this.buoyant;
    sd.userData.editable = this.isEditable;
    sd.userData.red = this.red;
    sd.userData.green = this.green;
    sd.userData.blue = this.blue;
    sd.userData.outline = this.outline;
    sd.userData.terrain = this.terrain;
    sd.userData.undragable = this.undragable;
    sd.userData.isPiston = -1;
    sd.userData.isSandbox = this.isSandbox;
    // Trigger snapshot (Jaybit Triangle.as, same block as Circle.as:168-182).
    sd.userData.triggerName = this.triggerName;
    sd.userData.triggerName_2 = this.triggerName_2;
    sd.userData.triggerList = this.triggerName.replace(/ /g, "").split(",");
    sd.userData.triggerList_2 = this.triggerName_2.replace(/ /g, "").split(",");
    sd.userData.triggerAction = this.triggerAction;
    sd.userData.triggerAction_2 = this.triggerAction_2;
    sd.userData.onGroundHit = this.onGroundHit;
    sd.userData.onGroundHit_2 = this.onGroundHit_2;
    sd.userData.onSameName = this.onSameName;
    sd.userData.onSameName_2 = this.onSameName_2;
    sd.userData.jointsToTrigger = new Array();
    sd.userData.actionsToTrigger = new Array();
    sd.userData.isFirstTrigger = new Array();
    this.m_shape = getPhysicsBackend().createShape(this.m_body, sd);
    if (this.isStatic || bodyStatic) getPhysicsBackend().setMass(this.m_body, new b2MassData());
    else getPhysicsBackend().setMassFromShapes(this.m_body);

    // Weld/lock fixed-joint partners (Jaybit Triangle.as:358 CheckFixedJoints
    // — replaces CE's inline merge loop; untriggered joints still body-merge).
    this.CheckFixedJoints(world);
  }

  public IntersectsBox(boxX: number, boxY: number, boxW: number, boxH: number): boolean {
    if (this.centerX >= boxX && this.centerX <= boxX + boxW && this.centerY >= boxY && this.centerY <= boxY + boxH) {
      return true;
    }

    var verts: Array<any> = this.GetVertices();
    for (var i: number = 0; i < 3; i++) {
      if (
        Util.SegmentsIntersect(
          verts[i].x,
          verts[i].y,
          verts[(i + 1) % 3].x,
          verts[(i + 1) % 3].y,
          boxX,
          boxY,
          boxX + boxW,
          boxY
        )
      )
        return true;
      if (
        Util.SegmentsIntersect(
          verts[i].x,
          verts[i].y,
          verts[(i + 1) % 3].x,
          verts[(i + 1) % 3].y,
          boxX + boxW,
          boxY,
          boxX + boxW,
          boxY + boxH
        )
      )
        return true;
      if (
        Util.SegmentsIntersect(
          verts[i].x,
          verts[i].y,
          verts[(i + 1) % 3].x,
          verts[(i + 1) % 3].y,
          boxX + boxW,
          boxY + boxH,
          boxX,
          boxY + boxH
        )
      )
        return true;
      if (
        Util.SegmentsIntersect(
          verts[i].x,
          verts[i].y,
          verts[(i + 1) % 3].x,
          verts[(i + 1) % 3].y,
          boxX,
          boxY + boxH,
          boxX,
          boxY
        )
      )
        return true;
    }
    return false;
  }

  public PrepareForResizing(): void {
    this.initX1 = this.x1 - this.centerX;
    this.initY1 = this.y1 - this.centerY;
    this.initX2 = this.x2 - this.centerX;
    this.initY2 = this.y2 - this.centerY;
    this.initX3 = this.x3 - this.centerX;
    this.initY3 = this.y3 - this.centerY;
  }

  public equals(other: ShapePart): boolean {
    return (
      other instanceof Triangle &&
      this.NumbersEqual(this.x1, (other as Triangle).x1) &&
      this.NumbersEqual(this.y1, (other as Triangle).y1) &&
      this.NumbersEqual(this.x2, (other as Triangle).x2) &&
      this.NumbersEqual(this.y2, (other as Triangle).y2) &&
      this.NumbersEqual(this.x3, (other as Triangle).x3) &&
      this.NumbersEqual(this.y3, (other as Triangle).y3) &&
      super.equals(other)
    );
  }

  public ToString(): string {
    return (
      "Triangle: x1=" +
      this.x1 +
      ", " +
      "y1=" +
      this.y1 +
      ", " +
      "x2=" +
      this.x2 +
      ", " +
      "y2=" +
      this.y2 +
      ", " +
      "x3=" +
      this.x3 +
      ", " +
      "y3=" +
      this.y3 +
      super.ToString()
    );
  }
}
