import { b2Body, b2BodyDef, b2MassData, b2PolygonDef, b2Settings, b2Vec2, b2World } from "../Box2D";
import { Util } from "../General/Util"
import { COLLISION_GROUP_UNSET } from "./partDefaults"
import { getPhysicsBackend } from "./partGlobals"
import { ShapePart } from "./ShapePart"

/**
 * A convex polygon ShapePart backed by a single b2PolygonShape — the direct
 * IB2/Jaybit target for IB3 PolygonPart (ib3-decompiled/scripts/Parts/PolygonPart.as)
 * and non-rectangular IB3 "Rectangle" quads. It generalizes Triangle.ts (a fixed
 * 3-vertex polygon) to an ordered N-vertex list, 3..b2_maxPolygonVertices (8).
 *
 * Vertex convention mirrors Triangle EXACTLY (Triangle.ts:27-42, :67-80): the
 * `vertices` are the ANGLE-0 baseline world positions and `centerX/centerY` is
 * their average (rotation pivot / body origin). The live `angle` field is applied
 * on top in GetVertices() by rotating each baseline vertex around the centre, so
 * rotating a polygon only mutates `angle` (never the stored baseline) — identical
 * to how Triangle/Rectangle rotate. That keeps serialization lossless (store
 * baseline verts + angle) and the RotateAround machinery reusable from ShapePart.
 */
export class Polygon extends ShapePart {
  /** Ordered baseline (angle-0) world-space vertices; wound CCW-in-math like Triangle. */
  public vertices: b2Vec2[];
  /** Resize baseline, captured by PrepareForResizing (mirrors PolygonPart.as:219-247). */
  public initVertices!: b2Vec2[];

  public static MIN_SIDE_LENGTH: number = 0.1; // PolygonPart.as:14
  public static MAX_SIDE_LENGTH: number = 10.0; // PolygonPart.as:12
  /** Hard cap from the physics engine (b2PolygonShape). */
  public static MAX_VERTICES: number = b2Settings.b2_maxPolygonVertices;

  constructor(verts: b2Vec2[], nAngle: number = 0) {
    super(0, 0);
    // Own a private copy so callers can't mutate our geometry behind our back.
    this.vertices = verts.map((v) => new b2Vec2(v.x, v.y));

    var avgX: number = 0;
    var avgY: number = 0;
    for (var i: number = 0; i < this.vertices.length; i++) {
      avgX += this.vertices[i].x;
      avgY += this.vertices[i].y;
    }
    this.centerX = avgX / this.vertices.length;
    this.centerY = avgY / this.vertices.length;
    this.angle = nAngle;

    this.CheckVertices();

    this.type = "Polygon";
  }

  public numVertices(): number {
    return this.vertices.length;
  }

  /**
   * Enforce a consistent winding so the b2PolygonShape edge normals point
   * outward. IB2's b2PolygonShape (Triangle/Rectangle) is fed positively-wound
   * (CCW-in-math) vertices — Triangle.SwapVertices (Triangle.ts:44-57) and
   * Rectangle.GetVertices (Rectangle.ts:53-67) both produce a POSITIVE signed
   * (shoelace) area. We generalize that to N verts: if the signed area is
   * negative, reverse. Equivalent in intent to PolygonPart.CheckVertices
   * (PolygonPart.as:267-279), which reverses on the wrong turn direction.
   */
  public CheckVertices(): void {
    if (this.SignedArea() < 0) this.vertices.reverse();
  }

  /** Standard signed polygon area (2x); positive == CCW-in-math winding. */
  private SignedArea(): number {
    var a: number = 0;
    var n: number = this.vertices.length;
    for (var i: number = 0; i < n; i++) {
      var j: number = (i + 1) % n;
      a += this.vertices[i].x * this.vertices[j].y - this.vertices[j].x * this.vertices[i].y;
    }
    return a / 2;
  }

  public GetArea(): number {
    // Shoelace (PolygonPart.GetArea :132-143). Winding-normalized in the ctor, so
    // this is positive; abs() guards resize/mirror transients.
    return Math.abs(this.SignedArea());
  }

  /**
   * Baseline vertices rotated around the centre by `angle` (verbatim generalization
   * of Triangle.GetVertices :67-80 from 3 to N verts).
   */
  public GetVertices(): Array<any> {
    var verts: Array<any> = new Array(this.vertices.length);
    for (var i: number = 0; i < this.vertices.length; i++) {
      var dist: number = Util.GetDist(this.centerX, this.centerY, this.vertices[i].x, this.vertices[i].y);
      var vertAngle: number = Math.atan2(this.vertices[i].y - this.centerY, this.vertices[i].x - this.centerX);
      vertAngle = Util.NormalizeAngle(this.angle + vertAngle);
      verts[i] = new b2Vec2(this.centerX + dist * Math.cos(vertAngle), this.centerY + dist * Math.sin(vertAngle));
    }
    return verts;
  }

  public GetVerticesForOutline(thickness: number): Array<any> {
    return Polygon.GetOutlineVertices(this.GetVertices(), this.vertices.length, thickness);
  }

  /** Point-in-polygon (port of PolygonPart.InsidePart :97-130, using rotated verts). */
  public InsideShape(xVal: number, yVal: number, scale: number): boolean {
    var allOnRightSide: boolean = true;
    var verts: Array<any> = this.GetVertices();
    var n: number = verts.length;
    for (var i: number = 0; i < n; i++) {
      var slope: number;
      if (verts[(i + 1) % n].x == verts[i].x) {
        if (verts[(i + 1) % n].y >= verts[i].y) {
          slope = 100000000;
        } else {
          slope = -100000000;
        }
      } else {
        slope = (verts[(i + 1) % n].y - verts[i].y) / (verts[(i + 1) % n].x - verts[i].x);
      }
      var val1: number = yVal - verts[i].y - slope * (xVal - verts[i].x);
      var val2: number = verts[(i + 2) % n].y - verts[i].y - slope * (verts[(i + 2) % n].x - verts[i].x);
      if ((val1 < 0 && val2 > 0) || (val1 > 0 && val2 < 0)) allOnRightSide = false;
    }
    return allOnRightSide;
  }

  public Move(xVal: number, yVal: number): void {
    for (var i: number = 0; i < this.vertices.length; i++) {
      this.vertices[i].x = xVal + (this.vertices[i].x - this.centerX);
      this.vertices[i].y = yVal + (this.vertices[i].y - this.centerY);
    }
    super.Move(xVal, yVal);
  }

  public MakeCopy(): ShapePart {
    var poly: Polygon = new Polygon(this.vertices, this.angle);
    poly.density = this.density;
    poly.collide = this.collide;
    poly.isStatic = this.isStatic;
    poly.red = this.red;
    poly.green = this.green;
    poly.blue = this.blue;
    poly.opacity = this.opacity;
    poly.outline = this.outline;
    poly.terrain = this.terrain;
    poly.undragable = this.undragable;
    this.CopyJaybitFieldsTo(poly);
    return poly;
  }

  public Init(world: b2World, body: b2Body | null = null): void {
    if (this.isInitted) return;
    super.Init(world);

    var n: number = this.vertices.length;
    var sd = new b2PolygonDef();
    sd.friction = Util.ConvertFrictionToBox2D(this.friction);
    sd.restitution = Util.ConvertRestitutionToBox2D(this.restitution);
    sd.density = (this.density + 5.0) / 10.0;
    sd.vertexCount = n;
    var bits: number = this.GetCollisionBits();
    sd.filter.categoryBits = bits;
    sd.filter.maskBits = 0xffff & bits;
    if (this.m_collisionGroup != COLLISION_GROUP_UNSET) sd.filter.groupIndex = this.m_collisionGroup;
    sd.vertices = this.GetVertices();

    var bodyStatic: boolean = false;

    var i: number;
    if (body) {
      for (i = 0; i < n; i++) {
        sd.vertices[i].x -= body.GetPosition().x;
        sd.vertices[i].y -= body.GetPosition().y;
      }
      this.m_body = body;
      bodyStatic = body.IsStatic();
    } else {
      for (i = 0; i < n; i++) {
        sd.vertices[i].x -= this.centerX;
        sd.vertices[i].y -= this.centerY;
      }
      var bd = new b2BodyDef();
      bd.position.Set(this.centerX, this.centerY);
      // IB3 fixedRotation locks body angle (IB3 ShapePart.MakeBody :238).
      bd.fixedRotation = this.fixedRotation;
      if (this.isEditable) {
        var hasJoints: boolean = false;
        for (var j: number = 0; j < this.m_joints.length; j++) {
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

    this.CheckFixedJoints(world);
  }

  public IntersectsBox(boxX: number, boxY: number, boxW: number, boxH: number): boolean {
    if (this.centerX >= boxX && this.centerX <= boxX + boxW && this.centerY >= boxY && this.centerY <= boxY + boxH) {
      return true;
    }
    // Port of PolygonPart.IntersectsBox :66-95 (edges vs. the 4 box sides).
    var verts: Array<any> = this.GetVertices();
    var n: number = verts.length;
    for (var i: number = 0; i < n; i++) {
      var ax = verts[i].x;
      var ay = verts[i].y;
      var bx = verts[(i + 1) % n].x;
      var by = verts[(i + 1) % n].y;
      if (Util.SegmentsIntersect(ax, ay, bx, by, boxX, boxY, boxX + boxW, boxY)) return true;
      if (Util.SegmentsIntersect(ax, ay, bx, by, boxX + boxW, boxY, boxX + boxW, boxY + boxH)) return true;
      if (Util.SegmentsIntersect(ax, ay, bx, by, boxX + boxW, boxY + boxH, boxX, boxY + boxH)) return true;
      if (Util.SegmentsIntersect(ax, ay, bx, by, boxX, boxY + boxH, boxX, boxY)) return true;
    }
    return false;
  }

  public PrepareForResizing(): void {
    // Baseline verts relative to the centre (PolygonPart.PrepareForResizing :219-247);
    // handleResizeApply scales these around the pivot.
    this.initVertices = this.vertices.map((v) => new b2Vec2(v.x - this.centerX, v.y - this.centerY));
  }

  public equals(other: ShapePart): boolean {
    if (!(other instanceof Polygon)) return false;
    var o: Polygon = other as Polygon;
    if (o.vertices.length !== this.vertices.length) return false;
    for (var i: number = 0; i < this.vertices.length; i++) {
      if (!this.NumbersEqual(this.vertices[i].x, o.vertices[i].x)) return false;
      if (!this.NumbersEqual(this.vertices[i].y, o.vertices[i].y)) return false;
    }
    return super.equals(other);
  }

  /**
   * Convexity test for a candidate vertex list — used by the IB3 importer to
   * decide direct-import vs. triangulation fallback. b2PolygonShape does NOT
   * validate convexity (its asserts are compiled out), so a concave list would
   * simulate incorrectly; callers must gate on this. Winding-agnostic: every
   * consecutive edge cross-product must share one sign (zero/collinear allowed).
   */
  public static isConvex(verts: { x: number; y: number }[]): boolean {
    var n: number = verts.length;
    if (n < 3) return false;
    var sign: number = 0;
    for (var i: number = 0; i < n; i++) {
      var a = verts[i];
      var b = verts[(i + 1) % n];
      var c = verts[(i + 2) % n];
      var cross: number = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (cross > 1e-9) {
        if (sign < 0) return false;
        sign = 1;
      } else if (cross < -1e-9) {
        if (sign > 0) return false;
        sign = -1;
      }
    }
    return true;
  }

  public ToString(): string {
    var s: string = "Polygon: verts=" + this.vertices.length + " [";
    for (var i: number = 0; i < this.vertices.length; i++) {
      s += "(" + this.vertices[i].x + "," + this.vertices[i].y + ")";
    }
    return s + "], " + super.ToString();
  }
}
