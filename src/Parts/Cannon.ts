import { b2Body, b2BodyDef, b2CircleDef, b2CircleShape, b2MassData, b2PolygonDef, b2Vec2, b2World } from "../Box2D";
import { getCannonballs, getMainMenuCannonballs, getPhysicsBackend } from "./partGlobals"
import { Util } from "../General/Util"
import { COLLISION_GROUP_UNSET, TRIGGER_DESTROY, TRIGGER_FIRE } from "./partDefaults"
import { ShapePart } from "./ShapePart"

export class Cannon extends ShapePart {
  public x: number;
  public y: number;
  public w: number;
  public fireKey: number;
  public strength: number;
  /**
   * Comma-separated trigger names this cannon LISTENS to (Jaybit
   * Cannon.as:26-32; persisted — a Cannon is a trigger TARGET, not a source,
   * so it does not read the inherited triggerName/Action fields).
   */
  public triggerList: string = "";
  /** Runtime trigger-contact counter (Jaybit Cannon.as:26; NOT persisted). */
  public triggerTouches: number = 0;
  /** Runtime destroyed flag set by TRIGGER_DESTROY (Cannon.as:22; NOT persisted). */
  public isDestroyed: boolean = false;

  private createCannonball: boolean = false;
  public initW!: number;
  private relativeCannonPos!: b2Vec2;

  public cannonballs: Array<any> = new Array();
  private cannonballCounters: Array<any> = new Array();

  public static MIN_WIDTH: number = 0.5;
  public static MAX_WIDTH: number = 10.0;

  constructor(nx: number, ny: number, nw: number, checkLimits: boolean = true) {
    // FIXME: Change super call as it must be before everything else but we do extra position calcs after it.
    super(0, 0);
    var rotated: boolean = false;
    if (checkLimits) {
      if (nw < 0) {
        nx += Math.max(-Cannon.MAX_WIDTH, nw);
        ny += Math.max(-Cannon.MAX_WIDTH / 2, nw / 2);
        nw = -nw;
        rotated = true;
      }
      if (nw < Cannon.MIN_WIDTH) nw = Cannon.MIN_WIDTH;
      if (nw > Cannon.MAX_WIDTH) nw = Cannon.MAX_WIDTH;
    }

    this.x = nx;
    this.y = ny;
    this.w = nw;
    this.centerX = nx + nw / 2;
    this.centerY = ny + nw / 4;

    this.fireKey = 40;
    this.strength = 15;

    if (rotated) this.angle = Math.PI;
    this.type = "Cannon";
  }

  public GetArea(): number {
    return (this.w * this.w) / 2;
  }

  public Move(xVal: number, yVal: number): void {
    this.x = xVal - this.w / 2;
    this.y = yVal - this.w / 4;
    super.Move(xVal, yVal);
  }

  public GetVertices(): Array<any> {
    var verts: Array<any> = new Array(4);
    verts[0] = new b2Vec2(this.x, this.y);
    verts[1] = new b2Vec2(this.x + this.w, this.y);
    verts[2] = new b2Vec2(this.x + this.w, this.y + this.w / 2);
    verts[3] = new b2Vec2(this.x, this.y + this.w / 2);
    var dist: number = Math.sqrt((5 * this.w * this.w) / 16);
    for (var i: number = 0; i < 4; i++) {
      var vertAngle: number = Math.atan2((verts[i]).y - this.centerY, (verts[i]).x - this.centerX);
      vertAngle = Util.NormalizeAngle(this.angle + vertAngle);
      verts[i].x = this.centerX + dist * Math.cos(vertAngle);
      verts[i].y = this.centerY + dist * Math.sin(vertAngle);
    }
    return verts;
  }

  public GetSpawnPoint() {
    return Util.Vector(
      this.centerX + (Math.cos(this.angle) * 2 * this.w) / 3,
      this.centerY + (Math.sin(this.angle) * 2 * this.w) / 3
    );
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

  public MakeCopy(): ShapePart {
    var c: Cannon = new Cannon(this.x, this.y, this.w);
    c.density = this.density;
    c.angle = this.angle;
    c.collide = this.collide;
    c.isStatic = this.isStatic;
    c.red = this.red;
    c.green = this.green;
    c.blue = this.blue;
    c.opacity = this.opacity;
    c.outline = this.outline;
    c.terrain = this.terrain;
    c.undragable = this.undragable;
    c.fireKey = this.fireKey;
    c.strength = this.strength;
    c.triggerList = this.triggerList;
    this.CopyJaybitFieldsTo(c);
    return c;
  }

  /**
   * TRIGGER_DESTROY (add only) marks the cannon destroyed (fires once);
   * TRIGGER_FIRE counts touches then routes through KeyInput via
   * DetermineTriggered (Jaybit Cannon.as:76-95).
   */
  public DoTriggerAction(action: number, world: b2World | null = null, isAdd: boolean = true): boolean {
    if (action == TRIGGER_DESTROY && world && isAdd) {
      return this.DestroyCannon(world);
    }
    if (action == TRIGGER_FIRE) {
      if (isAdd) ++this.triggerTouches;
      else if (this.triggerTouches > 0) --this.triggerTouches;
      this.DetermineTriggered();
    }
    return false;
  }

  /** Destroy-once: sets isDestroyed, true only the first time (Cannon.as:97-104). */
  public DestroyCannon(world: b2World): boolean {
    if (!this.isDestroyed) {
      this.isDestroyed = true;
      return true;
    }
    return false;
  }

  /**
   * Route the trigger state through KeyInput (Jaybit Cannon.as:354-364).
   * Since KeyInput arms createCannonball only on up==true, a triggered cannon
   * FIRES WHEN ITS LAST TOUCHING TRIGGER CONTACT ENDS (touch-and-release) —
   * intended legacy behaviour, not a bug.
   */
  public DetermineTriggered(): void {
    if (this.triggerTouches > 0) {
      this.KeyInput(this.fireKey, false, false);
    } else {
      this.KeyInput(this.fireKey, true, false);
    }
  }

  public Init(world: b2World, body: b2Body | null = null): void {
    // Per-play trigger runtime reset BEFORE the isInitted guard (Jaybit
    // Cannon.as Init :112-113 resets unconditionally).
    this.triggerTouches = 0;
    this.isDestroyed = false;
    if (this.isInitted) return;
    super.Init(world);

    var sd:b2PolygonDef = new b2PolygonDef();
    // Jaybit adjustable material (Cannon.as:137-139): defaults 11/7 convert to
    // CE's hardcoded 0.4/0.3 exactly.
    sd.friction = Util.ConvertFrictionToBox2D(this.friction);
    sd.restitution = Util.ConvertRestitutionToBox2D(this.restitution);

    //CE PROBLEM
    //sd.density = (Math.max(1, Math.min(30, density)) + 5.0) / 10.0;

    //CE FIX
    sd.density = (this.density + 5.0) / 10.0;

    sd.vertexCount = 4;
    // Collision layers A-D -> category == mask bits (see ShapePart.CollisionBits).
    var bits: number = this.GetCollisionBits();
    sd.filter.categoryBits = bits;
    sd.filter.maskBits = 0xffff & bits;
    if (this.m_collisionGroup != COLLISION_GROUP_UNSET) sd.filter.groupIndex = this.m_collisionGroup;
    sd.vertices = this.GetVertices();

    var bodyStatic:boolean = false;
    var i:number;
    if (body) {
      for (i = 0; i < 4; i++) {
        sd.vertices[i].x -= body.GetPosition().x;
        sd.vertices[i].y -= body.GetPosition().y;
      }
      this.m_body = body;
      bodyStatic = body.IsStatic();
    } else {
      for (i = 0; i < 4; i++) {
        sd.vertices[i].x -= this.centerX;
        sd.vertices[i].y -= this.centerY;
      }
      var bd:b2BodyDef = new b2BodyDef();
      bd.position.Set(this.centerX, this.centerY);
      // IB3 fixedRotation locks body angle (IB3 ShapePart.MakeBody :238).
      bd.fixedRotation = this.fixedRotation;
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
    this.m_shape = getPhysicsBackend().createShape(this.m_body, sd);

    if (this.isStatic || bodyStatic) getPhysicsBackend().setMass(this.m_body, new b2MassData());
    else getPhysicsBackend().setMassFromShapes(this.m_body);

    this.cannonballs.length = 0;
    this.cannonballCounters.length = 0;

    // Weld/lock fixed-joint partners (Jaybit Cannon.as:195 CheckFixedJoints —
    // replaces CE's inline merge loop; untriggered joints still body-merge).
    this.CheckFixedJoints(world);
    this.createCannonball = false;

    this.relativeCannonPos = Util.Vector(this.centerX, this.centerY);
    this.relativeCannonPos.Subtract(this.m_body.GetPosition());
}

  /**
   * Jaybit Cannon.as:428-433 (no CE equivalent — this is the "cannonballs
   * leaking into saves" fix): clear the fired-ball arrays on sim stop so the
   * live b2Body references never survive into an AMF export (and are freed).
   * Our writer also excludes `cannonballs` by field name (AMF3.js
   * RUNTIME_ONLY_KEYS) — belt and braces per the port spec §6.
   */
  public UnInit(world: b2World): void {
    this.cannonballs.length = 0;
    this.cannonballCounters.length = 0;
    super.UnInit(world);
  }

  public KeyInput(key: number, up: boolean, replay: boolean): void {
    if (key == this.fireKey && up) this.createCannonball = true;
  }

  public Update(world: b2World): void {
    // A trigger-destroyed cannon no longer fires (Jaybit Cannon.as:332).
    if (this.isInitted && this.createCannonball && this.cannonballs.length < 50 && !this.isDestroyed) {
      this.CreateCannonball(world);
    }
    this.createCannonball = false;

    for (var i = 0; i < this.cannonballCounters.length; i++) {
      this.cannonballCounters[i]--;
      if (this.cannonballCounters[i] == 0) this.cannonballs[i].GetShapeList().m_filter.groupIndex = 0;
    }
}

  private CreateCannonball(world: b2World): void {
    var circ = new b2CircleDef();
    circ.radius = this.w / 6;
    // Cannonballs inherit the CANNON's material (Cannon.as:242-244) — CE
    // hardcoded 0.4/0.3 here.
    circ.friction = Util.ConvertFrictionToBox2D(this.friction);
    circ.restitution = Util.ConvertRestitutionToBox2D(this.restitution);

    //CE PROBLEM
    //circ.density = (Math.max(1, Math.min(30, density)) + 5.0) / 10.0;

    //CE FIX
    circ.density = (this.density + 5.0) / 10.0;

    // The ball copies the cannon's layer bits, EXCEPT all-four-off makes the
    // ball collide with every layer (bits = 0xFFFF, Cannon.as:214-243) — a
    // no-layer cannon still fires solid balls.
    var bits: number = this.GetCollisionBits();
    if (!this.collA && !this.collB && !this.collC && !this.collD) bits = 65535;
    circ.filter.categoryBits = bits;
    circ.filter.maskBits = 0xffff & bits;
    if (this.m_collisionGroup != COLLISION_GROUP_UNSET) circ.filter.groupIndex = this.m_collisionGroup;
    var bd:b2BodyDef = new b2BodyDef();
    var localPoint:b2Vec2 = this.GetSpawnPoint();
    localPoint.Subtract(Util.Vector(this.centerX, this.centerY));
    localPoint.Add(this.relativeCannonPos);
    bd.position.SetV(this.m_body!.GetWorldPoint(localPoint));
    bd.isBullet = true;
    var body:b2Body = getPhysicsBackend().createBody(world, bd);
    this.cannonballs.push(body);
    circ.userData = new Object();
    circ.userData.collide = true;
    circ.userData.editable = this.isEditable;
    circ.userData.red = this.red;
    circ.userData.green = this.green;
    circ.userData.blue = this.blue;
    circ.userData.outline = this.outline;
    circ.userData.terrain = false;
    circ.userData.undragable = true;
    circ.userData.isPiston = -1;
    getPhysicsBackend().createShape(body, circ);
    getPhysicsBackend().setMassFromShapes(body);

    var forceAngle:number = this.angle + this.m_body!.GetAngle();

    //CE PROBLEM
    //var forceStrength:Number = 0.15 * w * w * circ.density * (4 + 2 * Math.max(1, Math.min(30, strength)));

    //CE FIX
    var forceStrength:number = 0.15 * this.w * this.w * circ.density * (4 + 2 * this.strength);

    var forceVector:b2Vec2 = Util.Vector(Math.cos(forceAngle) * forceStrength, Math.sin(forceAngle) * forceStrength);
    var positionVector:b2Vec2 = this.m_body!.GetWorldPoint(this.relativeCannonPos);
    getPhysicsBackend().applyImpulse(body, forceVector, body.GetWorldCenter());
    forceVector = forceVector.Negative();
    getPhysicsBackend().applyImpulse(this.m_body!, forceVector, positionVector);
    const sink = getCannonballs();
    if (sink) sink.push(body);
    const mainMenuSink = getMainMenuCannonballs();
    if (mainMenuSink) mainMenuSink.push(body);

    this.cannonballCounters.push(5);
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

  public PrepareForResizing(): void {
    this.initW = this.w;
  }

  public GetVerticesForOutline(thickness: number): Array<any> {
    return Cannon.GetOutlineVertices(this.GetVertices(), 4, thickness);
  }

  public equals(other: ShapePart): boolean {
    return (
      other instanceof Cannon &&
      this.x == (other as Cannon).x &&
      this.y == (other as Cannon).y &&
      this.w == (other as Cannon).w &&
      this.fireKey == (other as Cannon).fireKey &&
      this.strength == (other as Cannon).strength &&
      this.triggerList == (other as Cannon).triggerList &&
      super.equals(other)
    );
  }

  public ToString(): string {
    return (
      "Cannon: x=" +
      this.x +
      ", " +
      "y=" +
      this.y +
      ", " +
      "w=" +
      this.w +
      ", " +
      "fireKey=" +
      this.fireKey +
      ", " +
      "strength=" +
      this.strength +
      super.ToString()
    );
  }
}
