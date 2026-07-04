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
  /**
   * Hard cap for a SINGLE convex b2PolygonShape (b2_maxPolygonVertices == 8).
   * A Polygon with more verts than this — or a concave one — is backed by
   * ear-clipped triangle fixtures instead (see Init), so this is only the
   * single-shape threshold, not the overall vertex limit.
   */
  public static MAX_VERTICES: number = b2Settings.b2_maxPolygonVertices;
  /**
   * Overall vertex cap for the interactive polygon tool / createPolygon command.
   * Because concave (and >8-vertex) polygons triangulate their COLLISION shape,
   * the b2PolygonShape 8-vertex limit no longer bounds the drawable ring; this
   * modest cap keeps the O(n^2) ear-clip + edit UI snappy.
   */
  public static MAX_TOOL_VERTICES: number = 16;

  /**
   * Body-local (relative to the body origin) vertices captured at Init, angle
   * already baked in — the renderer draws the true (possibly concave) outline
   * from these transformed by the live body xform, INDEPENDENT of how the
   * collision shape was triangulated (see Draw.DrawPolygonBody). Empty until Init.
   */
  protected m_localVertices: b2Vec2[] = [];

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

  /**
   * Point-in-polygon test on the rotated verts. IB3/PolygonPart.InsidePart
   * (:97-130) used a convex "all edges on one side" test; a Polygon can now be
   * CONCAVE (see Init), so this uses even-odd ray casting instead — correct for
   * any simple polygon and identical in result for convex ones. `scale` is kept
   * for the ShapePart signature (unused; the test is scale-invariant).
   */
  public InsideShape(xVal: number, yVal: number, scale: number): boolean {
    var verts: Array<any> = this.GetVertices();
    var n: number = verts.length;
    var inside: boolean = false;
    for (var i: number = 0, j: number = n - 1; i < n; j = i++) {
      var xi: number = verts[i].x;
      var yi: number = verts[i].y;
      var xj: number = verts[j].x;
      var yj: number = verts[j].y;
      if (yi > yVal != yj > yVal && xVal < ((xj - xi) * (yVal - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  /** Body-local outline vertices captured at Init, for the renderer (see field). */
  public GetLocalVertices(): b2Vec2[] {
    return this.m_localVertices;
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
    var bits: number = this.GetCollisionBits();

    // --- resolve/create the body FIRST, then derive body-local vertices ---
    var bodyStatic: boolean = false;
    if (body) {
      this.m_body = body;
      bodyStatic = getPhysicsBackend().bodyIsStatic(body);
    } else {
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

    // Angle-applied world verts shifted to the body origin (the passed body's
    // position when welded, our own centre otherwise). These body-local verts
    // are what BOTH the collision shape(s) and the renderer use.
    var originX: number = body ? body.GetPosition().x : this.centerX;
    var originY: number = body ? body.GetPosition().y : this.centerY;
    var world0: Array<any> = this.GetVertices();
    var local: b2Vec2[] = new Array(n);
    for (var i: number = 0; i < n; i++) {
      local[i] = new b2Vec2(world0[i].x - originX, world0[i].y - originY);
    }
    this.m_localVertices = local;

    // Fresh userData object per fixture (a concave polygon attaches several) —
    // identical to a single shape's userData, so each triangle's runtime trigger
    // arrays stay independent.
    var makeUserData = (): any => {
      var ud: any = new Object();
      ud.collide = this.collide;
      ud.isBuoyant = this.buoyant;
      ud.editable = this.isEditable;
      ud.red = this.red;
      ud.green = this.green;
      ud.blue = this.blue;
      ud.outline = this.outline;
      ud.terrain = this.terrain;
      ud.undragable = this.undragable;
      ud.isPiston = -1;
      ud.isSandbox = this.isSandbox;
      ud.triggerName = this.triggerName;
      ud.triggerName_2 = this.triggerName_2;
      ud.triggerList = this.triggerName.replace(/ /g, "").split(",");
      ud.triggerList_2 = this.triggerName_2.replace(/ /g, "").split(",");
      ud.triggerAction = this.triggerAction;
      ud.triggerAction_2 = this.triggerAction_2;
      ud.onGroundHit = this.onGroundHit;
      ud.onGroundHit_2 = this.onGroundHit_2;
      ud.onSameName = this.onSameName;
      ud.onSameName_2 = this.onSameName_2;
      ud.jointsToTrigger = new Array();
      ud.actionsToTrigger = new Array();
      ud.isFirstTrigger = new Array();
      return ud;
    };

    var makeDef = (verts: b2Vec2[]): any => {
      var sd = new b2PolygonDef();
      sd.friction = Util.ConvertFrictionToBox2D(this.friction);
      sd.restitution = Util.ConvertRestitutionToBox2D(this.restitution);
      sd.density = (this.density + 5.0) / 10.0;
      sd.vertexCount = verts.length;
      sd.filter.categoryBits = bits;
      sd.filter.maskBits = 0xffff & bits;
      if (this.m_collisionGroup != COLLISION_GROUP_UNSET) sd.filter.groupIndex = this.m_collisionGroup;
      // b2PolygonDef mutates its vertex objects (centroid shift) — hand it copies.
      sd.vertices = verts.map((v) => new b2Vec2(v.x, v.y));
      sd.userData = makeUserData();
      return sd;
    };

    // A convex ring that fits a single b2PolygonShape stays ONE shape (identical
    // to the pre-concave behaviour). Otherwise — concave, or more verts than
    // b2_maxPolygonVertices — ear-clip into convex triangle fixtures on the same
    // body so the (possibly concave) outline still collides correctly, since a
    // Box2D shape must be convex.
    if (Polygon.isConvex(local) && n <= b2Settings.b2_maxPolygonVertices) {
      this.m_shape = getPhysicsBackend().createShape(this.m_body, makeDef(local));
    } else {
      var tris: number[][] = Polygon.triangulate(local);
      for (var t: number = 0; t < tris.length; t++) {
        var tri: number[] = tris[t];
        var shape = getPhysicsBackend().createShape(
          this.m_body,
          makeDef([local[tri[0]], local[tri[1]], local[tri[2]]])
        );
        // The first triangle becomes m_shape (GetShape()!=null gate + cannonball
        // parity); the whole outline renders from m_localVertices regardless.
        if (!this.m_shape) this.m_shape = shape;
      }
    }

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

  /**
   * A polygon is SIMPLE if no two non-adjacent edges intersect (i.e. it does not
   * self-cross). Ear-clipping requires a simple ring, so the polygon tool /
   * createPolygon gate on this instead of the old convex-only test — a concave
   * ring is fine, a bow-tie is not. Winding-agnostic; treats the list as closed.
   */
  public static isSimple(verts: { x: number; y: number }[]): boolean {
    var n: number = verts.length;
    if (n < 3) return false;
    for (var i: number = 0; i < n; i++) {
      var a1 = verts[i];
      var a2 = verts[(i + 1) % n];
      for (var j: number = i + 1; j < n; j++) {
        // Skip edges that share a vertex with edge i (adjacent, incl. the wrap).
        if ((i + 1) % n === j || (j + 1) % n === i) continue;
        var b1 = verts[j];
        var b2 = verts[(j + 1) % n];
        if (Util.SegmentsIntersect(a1.x, a1.y, a2.x, a2.y, b1.x, b1.y, b2.x, b2.y)) return false;
      }
    }
    return true;
  }

  /** Static shoelace signed area (2x): positive == CCW-in-math winding. */
  private static signedAreaOf(verts: { x: number; y: number }[]): number {
    var a: number = 0;
    var n: number = verts.length;
    for (var i: number = 0; i < n; i++) {
      var j: number = (i + 1) % n;
      a += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
    }
    return a;
  }

  /** True iff p lies inside (or on) triangle abc (inclusive; robust to winding). */
  private static pointInTriangle(
    p: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number }
  ): boolean {
    var eps: number = 1e-9;
    var d1: number = (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
    var d2: number = (p.x - c.x) * (b.y - c.y) - (b.x - c.x) * (p.y - c.y);
    var d3: number = (p.x - a.x) * (c.y - a.y) - (c.x - a.x) * (p.y - a.y);
    var hasNeg: boolean = d1 < -eps || d2 < -eps || d3 < -eps;
    var hasPos: boolean = d1 > eps || d2 > eps || d3 > eps;
    return !(hasNeg && hasPos);
  }

  /**
   * Ear-clipping triangulation of a SIMPLE (possibly concave) polygon, returning
   * triangles as index triples into `verts`. Winding is normalized to CCW so the
   * emitted triangles are CCW (positive area) — the winding b2PolygonShape needs
   * for outward edge normals. O(n^2); trivial for the tool's vertex counts. A
   * degenerate ring that stalls the clip returns the triangles found so far.
   */
  public static triangulate(verts: { x: number; y: number }[]): number[][] {
    var n: number = verts.length;
    if (n < 3) return [];
    var idx: number[] = [];
    for (var k: number = 0; k < n; k++) idx.push(k);
    // Normalize to CCW so a convex corner is a LEFT turn (cross > 0).
    if (Polygon.signedAreaOf(verts) < 0) idx.reverse();

    var tris: number[][] = [];
    var guard: number = n * n + 1;
    while (idx.length > 3 && guard-- > 0) {
      var clipped: boolean = false;
      var m: number = idx.length;
      for (var i: number = 0; i < m; i++) {
        var i0: number = idx[(i + m - 1) % m];
        var i1: number = idx[i];
        var i2: number = idx[(i + 1) % m];
        var a = verts[i0];
        var b = verts[i1];
        var c = verts[i2];
        // Convex tip? (CCW ring => left turn => cross > 0). Reflex/straight: skip.
        var cross: number = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        if (cross <= 0) continue;
        // Ear only if no other vertex lies inside triangle a-b-c.
        var blocked: boolean = false;
        for (var p: number = 0; p < m; p++) {
          var vp: number = idx[p];
          if (vp === i0 || vp === i1 || vp === i2) continue;
          if (Polygon.pointInTriangle(verts[vp], a, b, c)) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;
        tris.push([i0, i1, i2]);
        idx.splice(i, 1);
        clipped = true;
        break;
      }
      if (!clipped) break; // degenerate — return what we have
    }
    if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
    return tris;
  }

  public ToString(): string {
    var s: string = "Polygon: verts=" + this.vertices.length + " [";
    for (var i: number = 0; i < this.vertices.length; i++) {
      s += "(" + this.vertices[i].x + "," + this.vertices[i].y + ")";
    }
    return s + "], " + super.ToString();
  }
}
