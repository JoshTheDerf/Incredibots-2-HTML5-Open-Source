import { b2Body, b2BodyDef, b2BodyType, b2MassData, b2PolygonShape, b2Vec2, b2World } from "@box2d/core";
import { FixedJoint, ShapePart, Util } from "../imports";

export class Rectangle extends ShapePart {
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  public initW: number;
  public initH: number;

  public isTank: boolean = false;

  public static MIN_WIDTH: number = 0.1;
  public static MAX_WIDTH: number = 10.0;

  constructor(nx: number, ny: number, nw: number, nh: number, checkLimits: boolean = true) {
    super(0, 0);

    if (checkLimits) {
      if (nw < 0) {
        nx += Math.max(-Rectangle.MAX_WIDTH, nw);
        nw = -nw;
      }
      if (nh < 0) {
        ny += Math.max(-Rectangle.MAX_WIDTH, nh);
        nh = -nh;
      }
      if (nw < Rectangle.MIN_WIDTH) nw = Rectangle.MIN_WIDTH;
      if (nh < Rectangle.MIN_WIDTH) nh = Rectangle.MIN_WIDTH;
      if (nw > Rectangle.MAX_WIDTH) nw = Rectangle.MAX_WIDTH;
      if (nh > Rectangle.MAX_WIDTH) nh = Rectangle.MAX_WIDTH;
    }

    this.x = nx;
    this.y = ny;
    this.w = nw;
    this.h = nh;

    this.centerX = nx + nw / 2;
    this.centerY = ny + nh / 2;

    this.type = "Rectangle";
  }

  public GetArea(): number {
    return this.w * this.h;
  }

  public GetVertices(): Array<any> {
    var verts: Array<any> = new Array(4);
    verts[0] = new b2Vec2(this.x, this.y);
    verts[1] = new b2Vec2(this.x + this.w, this.y);
    verts[2] = new b2Vec2(this.x + this.w, this.y + this.h);
    verts[3] = new b2Vec2(this.x, this.y + this.h);
    var dist: number = Math.sqrt((this.w * this.w) / 4 + (this.h * this.h) / 4);
    for (var i: number = 0; i < 4; i++) {
      var vertAngle: number = Math.atan2((verts[i] as b2Vec2).y - this.centerY, (verts[i] as b2Vec2).x - this.centerX);
      vertAngle = Util.NormalizeAngle(this.angle + vertAngle);
      verts[i].x = this.centerX + dist * Math.cos(vertAngle);
      verts[i].y = this.centerY + dist * Math.sin(vertAngle);
    }
    return verts;
  }

  public InsideShape(xVal: number, yVal: number, scale: number): boolean {
    var allOnRightSide: boolean = true;
    var verts: Array<any> = this.GetVertices();
    for (var i: number = 0; i < 4; i++) {
      var slope: number;
      if (verts[(i + 1) % 4].x == verts[i].x) {
        if (verts[(i + 1) % 4].y >= verts[i].y) {
          slope = 100000000;
        } else {
          slope = -100000000;
        }
      } else {
        slope = (verts[(i + 1) % 4].y - verts[i].y) / (verts[(i + 1) % 4].x - verts[i].x);
      }
      var val1: number = yVal - verts[i].y - slope * (xVal - verts[i].x);
      var val2: number = verts[(i + 2) % 4].y - verts[i].y - slope * (verts[(i + 2) % 4].x - verts[i].x);
      if ((val1 < 0 && val2 > 0) || (val1 > 0 && val2 < 0)) allOnRightSide = false;
    }
    return allOnRightSide;
  }

  public Move(xVal: number, yVal: number): void {
    this.x = xVal - this.w / 2;
    this.y = yVal - this.h / 2;
    super.Move(xVal, yVal);
  }

  public MakeCopy(): ShapePart {
    var rect: Rectangle = new Rectangle(this.x, this.y, this.w, this.h);
    rect.density = this.density;
    rect.angle = this.angle;
    rect.collide = this.collide;
    rect.isStatic = this.isStatic;
    rect.red = this.red;
    rect.green = this.green;
    rect.blue = this.blue;
    rect.opacity = this.opacity;
    rect.outline = this.outline;
    rect.terrain = this.terrain;
    rect.undragable = this.undragable;
    return rect;
  }

  public Init(world: b2World, body: b2Body | null = null): void {
    if (this.isInitted) return;
    super.Init(world);

    var sd = new b2PolygonShape();
    sd.Set(this.GetVertices(), 4);

    var bodyStatic: boolean = false;

    var i: number;
    if (body) {
      for (i = 0; i < 4; i++) {
        sd.m_vertices[i].x -= body.GetPosition().x;
        sd.m_vertices[i].y -= body.GetPosition().y;
      }
      this.m_body = body;
      bodyStatic = body.GetType() === b2BodyType.b2_staticBody;
    } else {
      for (i = 0; i < 4; i++) {
        sd.m_vertices[i].x -= this.centerX;
        sd.m_vertices[i].y -= this.centerY;
      }
      var bd: b2BodyDef = {
        position: { x: this.centerX, y: this.centerY },
        type: this.isStatic ? b2BodyType.b2_staticBody : b2BodyType.b2_dynamicBody,
      };
      if (this.isEditable) {
        var hasJoints: boolean = false;
        for (var j: number = 0; j < this.m_joints.length; j++) {
          if (this.m_joints[j].isEnabled) {
            hasJoints = true;
            break;
          }
        }
        if (!hasJoints) bd.bullet = true;
      }
      if (this.isBullet) bd.bullet = true;
      this.m_body = world.CreateBody(bd);
    }

    this.m_fixture = this.m_body.CreateFixture({
      shape: sd,
      friction: 0.4,
      restitution: 0.3,
      //CE PROBLEM
      // density: (Math.max(1, Math.min(30, this.density)) + 5.0) / 10.0;
      //CE FIX
      density: (this.density + 5.0) / 10.0,
    });

    if (this.m_collisionGroup != Number.MIN_VALUE) this.m_fixture.SetFilterData({ groupIndex: this.m_collisionGroup });

    const userData = new Object();
    userData.collide = this.collide;
    userData.editable = this.isEditable || this.isTank;
    userData.red = this.red;
    userData.green = this.green;
    userData.blue = this.blue;
    userData.outline = this.outline;
    userData.terrain = this.terrain;
    userData.undragable = this.undragable;
    userData.isPiston = -1;
    userData.isSandbox = this.isSandbox;

    this.m_body.SetUserData(userData);
    this.m_fixture.SetUserData(userData);
    this.m_shape = sd;

    if (this.isStatic || bodyStatic) this.m_body.SetMassData(new b2MassData());
    else this.m_body.ResetMassData();

    for (i = 0; i < this.m_joints.length; i++) {
      if (this.m_joints[i].isEnabled && this.m_joints[i] instanceof FixedJoint) {
        var connectedPart: ShapePart = this.m_joints[i].GetOtherPart(this);
        if (connectedPart.isEnabled) connectedPart.Init(world, this.m_body);
      }
    }
  }

  public IntersectsBox(boxX: number, boxY: number, boxW: number, boxH: number): boolean {
    if (this.centerX >= boxX && this.centerX <= boxX + boxW && this.centerY >= boxY && this.centerY <= boxY + boxH) {
      return true;
    }

    var verts: Array<any> = this.GetVertices();
    for (var i: number = 0; i < 4; i++) {
      if (
        Util.SegmentsIntersect(
          verts[i].x,
          verts[i].y,
          verts[(i + 1) % 4].x,
          verts[(i + 1) % 4].y,
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
          verts[(i + 1) % 4].x,
          verts[(i + 1) % 4].y,
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
          verts[(i + 1) % 4].x,
          verts[(i + 1) % 4].y,
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
          verts[(i + 1) % 4].x,
          verts[(i + 1) % 4].y,
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

  public GetVerticesForOutline(thickness: number): Array<any> {
    return Rectangle.GetOutlineVertices(this.GetVertices(), 4, thickness);
  }

  public PrepareForResizing(): void {
    this.initW = this.w;
    this.initH = this.h;
  }

  public equals(other: ShapePart): boolean {
    return (
      other instanceof Rectangle &&
      this.NumbersEqual(this.x, (other as Rectangle).x) &&
      this.NumbersEqual(this.y, (other as Rectangle).y) &&
      this.NumbersEqual(this.w, (other as Rectangle).w) &&
      this.NumbersEqual(this.h, (other as Rectangle).h) &&
      super.equals(other)
    );
  }

  public ToString(): string {
    return (
      "Rectangle: x=" +
      this.x +
      ", " +
      "y=" +
      this.y +
      ", " +
      "w=" +
      this.w +
      ", " +
      "h=" +
      this.h +
      ", " +
      super.ToString()
    );
  }
}
