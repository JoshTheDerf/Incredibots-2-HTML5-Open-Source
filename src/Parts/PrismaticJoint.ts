import { b2Body, b2Fixture, b2PolygonShape, b2PrismaticJoint, b2PrismaticJointDef, b2Vec2, b2World } from "@box2d/core";
import { ControllerGameGlobals, JointPart, ShapePart, Util } from "../imports";

export class PrismaticJoint extends JointPart {
  public axis: b2Vec2;
  public initLength: number;
  public enablePiston: boolean;
  public pistonUpKey: number;
  public pistonDownKey: number;
  public pistonStrength: number;
  public pistonSpeed: number;
  public isStiff: boolean;
  public autoOscillate: boolean;
  public red: number;
  public green: number;
  public blue: number;
  public opacity: number;
  public outline: boolean;
  public collide: boolean = true;

  public initInitLength: number;
  public arrayIndex: number = -1;
  private isKeyDown1: boolean = false;
  private isKeyDown2: boolean = false;
  private wasKeyDown1: boolean = false;
  private wasKeyDown2: boolean = false;
  private expanding: boolean = true;
  private targetJointDisp: number;
  private prevJointDisp: number;
  private m_shapes: Array<b2PolygonShape> = [];
  private m_fixtures: Array<b2Fixture> = [];

  public static jbTutorial: boolean = false;

  constructor(p1: ShapePart, p2: ShapePart, x1: number, y1: number, x2: number, y2: number) {
    super(p1, p2);
    if (PrismaticJoint.jbTutorial && p1.centerY > p2.centerY) {
      var temp: ShapePart = p2;
      p2 = p1;
      p1 = temp;
      var tem: number = x2;
      x2 = x1;
      x1 = tem;
      tem = y2;
      y2 = y1;
      y1 = tem;
      PrismaticJoint.jbTutorial = false;
    }
    // Reassign part1 and part2 with new values even though we set them in the constructor.
    this.part1 = p1;
    this.part2 = p2;
    this.anchorX = (x1 + x2) / 2.0;
    this.anchorY = (y1 + y2) / 2.0;
    this.axis = new b2Vec2(x2 - x1, y2 - y1);
    this.axis.Normalize();
    this.enablePiston = false;
    this.isStiff = false;
    this.autoOscillate = false;
    this.pistonUpKey = 38;
    this.pistonDownKey = 40;
    if (ControllerGameGlobals.maxSJStrength < 15.0) {
      this.pistonStrength = ControllerGameGlobals.maxSJStrength;
    } else {
      this.pistonStrength = 15.0;
    }
    if (ControllerGameGlobals.maxSJSpeed < 15.0) {
      this.pistonSpeed = ControllerGameGlobals.maxSJSpeed;
    } else {
      this.pistonSpeed = 15.0;
    }
    this.red = ControllerGameGlobals.defaultR;
    this.green = ControllerGameGlobals.defaultG;
    this.blue = ControllerGameGlobals.defaultB;
    this.opacity = ControllerGameGlobals.defaultO;
    this.outline = true;
    this.initLength = Util.GetDist(x1, y1, x2, y2);
    this.type = "PrismaticJoint";
  }

  public SetJointProperties(other: PrismaticJoint): void {
    this.enablePiston = other.enablePiston;
    this.pistonUpKey = other.pistonUpKey;
    this.pistonDownKey = other.pistonDownKey;
    this.pistonStrength = other.pistonStrength;
    this.pistonSpeed = other.pistonSpeed;
    this.isStiff = other.isStiff;
    this.autoOscillate = other.autoOscillate;
    this.red = other.red;
    this.green = other.green;
    this.blue = other.blue;
    this.opacity = other.opacity;
    this.outline = other.outline;
    this.collide = other.collide;
  }

  public RotateAround(xVal: number, yVal: number, curAngle: number): void {
    super.RotateAround(xVal, yVal, curAngle);
    var newAngle: number = curAngle + this.rotateOrientation;
    this.axis = new b2Vec2(Math.cos(newAngle), Math.sin(newAngle));
  }

  public MakeCopy(p1: ShapePart, p2: ShapePart): JointPart {
    var x1: number = this.anchorX - (this.axis.x * this.initLength) / 2;
    var y1: number = this.anchorY - (this.axis.y * this.initLength) / 2;
    var x2: number = this.anchorX + (this.axis.x * this.initLength) / 2;
    var y2: number = this.anchorY + (this.axis.y * this.initLength) / 2;
    var j: PrismaticJoint = new PrismaticJoint(p1, p2, x1, y1, x2, y2);
    j.enablePiston = this.enablePiston;
    j.pistonUpKey = this.pistonUpKey;
    j.pistonDownKey = this.pistonDownKey;
    j.pistonStrength = this.pistonStrength;
    j.pistonSpeed = this.pistonSpeed;
    j.isStiff = this.isStiff;
    j.autoOscillate = this.autoOscillate;
    j.red = this.red;
    j.green = this.green;
    j.blue = this.blue;
    j.opacity = this.opacity;
    j.outline = this.outline;
    j.collide = this.collide;
    return j;
  }

  public InsideShape(xVal: number, yVal: number, scale: number): boolean {
    var allOnRightSide: boolean = true;

    var verts: Array<any> = new Array();
    var x1: number = this.anchorX - (this.axis.x * this.initLength) / 2;
    var y1: number = this.anchorY - (this.axis.y * this.initLength) / 2;
    var x2: number = this.anchorX + (this.axis.x * this.initLength) / 2;
    var y2: number = this.anchorY + (this.axis.y * this.initLength) / 2;

    var angle: number = Math.atan2(this.axis.y, this.axis.x) + Math.PI / 2;
    verts[0] = new b2Vec2(x1 - 0.25 * Math.cos(angle), y1 - 0.25 * Math.sin(angle));
    verts[1] = new b2Vec2(x1 + 0.25 * Math.cos(angle), y1 + 0.25 * Math.sin(angle));
    verts[2] = new b2Vec2(x2 + 0.25 * Math.cos(angle), y2 + 0.25 * Math.sin(angle));
    verts[3] = new b2Vec2(x2 - 0.25 * Math.cos(angle), y2 - 0.25 * Math.sin(angle));

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

  public Init(world: b2World, body: b2Body = null): void {
    if (this.isInitted || !this.part1.isInitted || !this.part2.isInitted) return;
    super.Init(world);
    this.expanding = true;

    this.m_shapes = [];
    this.m_fixtures = [];
    if (this.part1.GetBody() != this.part2.GetBody()) {
      var collisionGroup: number = ControllerGameGlobals.collisionGroup;
      this.part1.GetFixture().SetFilterData({
        ...this.part1.GetFixture().GetFilterData(),
        categoryBits: collisionGroup,
      });
      this.part2.GetFixture().SetFilterData({
        ...this.part2.GetFixture().GetFilterData(),
        categoryBits: collisionGroup,
      });

      var x1: number = this.anchorX - (this.axis.x * this.initLength) / 2;
      var y1: number = this.anchorY - (this.axis.y * this.initLength) / 2;
      var x2: number = this.anchorX + (this.axis.x * this.initLength) / 2;
      var y2: number = this.anchorY + (this.axis.y * this.initLength) / 2;

      var angle: number = Math.atan2(this.axis.y, this.axis.x);
      var sd = new b2PolygonShape();

      const userData: any = new Object();
      userData.red = this.red;
      userData.green = this.green;
      userData.blue = this.blue;
      userData.outline = this.outline;
      userData.collide = this.collide;
      userData.editable = this.isEditable;
      userData.isPiston = collisionGroup;

      const part1FixtureDef = {
        friction: 0.4,
        restitution: 0.3,
        density: 5.0,
        filter: {
          maskBits: 0xffff ^ collisionGroup,
          groupIndex: this.part1.GetFixture().GetFilterData().groupIndex,
        },
        userData,
      };

      const part2FixtureDef = {
        friction: 0.4,
        restitution: 0.3,
        density: 5.0,
        filter: {
          maskBits: 0xffff ^ collisionGroup,
          groupIndex: this.part2.GetFixture().GetFilterData().groupIndex,
        },
        userData,
      };

      var verts: Array<any> = new Array();
      verts[0] = new b2Vec2(x1 - 0.25, y1 - 0.05);
      verts[1] = new b2Vec2(x1 + 0.25, y1 - 0.05);
      verts[2] = new b2Vec2(x1 + 0.25, y1 + 0.05);
      verts[3] = new b2Vec2(x1 - 0.25, y1 + 0.05);
      var dist: number = Math.sqrt(0.25 * 0.25 + 0.05 * 0.05);
      for (var i: number = 0; i < 4; i++) {
        var vertAngle: number = Math.atan2(verts[i].y - y1, verts[i].x - x1);
        vertAngle = Util.NormalizeAngle(angle + vertAngle + Math.PI / 2);
        verts[i].x = x1 + dist * Math.cos(vertAngle) - this.part1.GetBody().GetPosition().x;
        verts[i].y = y1 + dist * Math.sin(vertAngle) - this.part1.GetBody().GetPosition().y;
      }
      sd.Set(verts);
      this.m_fixtures.push(this.part1.GetBody().CreateFixture({ ...part1FixtureDef, shape: sd }));
      this.m_shapes.push(sd);

      sd = new b2PolygonShape();
      dist = Math.sqrt(0.2 * 0.2 + (this.initLength * this.initLength) / 4);
      var centerX: number = x1 + dist * Math.cos(Math.atan2(-this.initLength / 2, -0.2) + angle + Math.PI / 2);
      var centerY: number = y1 + dist * Math.sin(Math.atan2(-this.initLength / 2, -0.2) + angle + Math.PI / 2);
      verts[0] = new b2Vec2(x1 - 0.05, y1 - this.initLength / 2);
      verts[1] = new b2Vec2(x1 + 0.05, y1 - this.initLength / 2);
      verts[2] = new b2Vec2(x1 + 0.05, y1 + this.initLength / 2);
      verts[3] = new b2Vec2(x1 - 0.05, y1 + this.initLength / 2);
      dist = Math.sqrt(0.05 * 0.05 + (this.initLength * this.initLength) / 4);
      for (i = 0; i < 4; i++) {
        vertAngle = Math.atan2(verts[i].y - y1, verts[i].x - x1);
        vertAngle = Util.NormalizeAngle(angle + vertAngle + Math.PI / 2);
        verts[i].x = centerX + dist * Math.cos(vertAngle) - this.part1.GetBody().GetPosition().x;
        verts[i].y = centerY + dist * Math.sin(vertAngle) - this.part1.GetBody().GetPosition().y;
      }
      sd.Set(verts);
      this.m_fixtures.push(this.part1.GetBody().CreateFixture({ ...part1FixtureDef, shape: sd }));
      this.m_shapes.push(sd);

      sd = new b2PolygonShape();
      dist = Math.sqrt(0.2 * 0.2 + (this.initLength * this.initLength) / 4);
      centerX = x1 + dist * Math.cos(Math.atan2(-this.initLength / 2, 0.2) + angle + Math.PI / 2);
      centerY = y1 + dist * Math.sin(Math.atan2(-this.initLength / 2, 0.2) + angle + Math.PI / 2);
      verts[0] = new b2Vec2(x1 - 0.05, y1 - this.initLength / 2);
      verts[1] = new b2Vec2(x1 + 0.05, y1 - this.initLength / 2);
      verts[2] = new b2Vec2(x1 + 0.05, y1 + this.initLength / 2);
      verts[3] = new b2Vec2(x1 - 0.05, y1 + this.initLength / 2);
      dist = Math.sqrt(0.05 * 0.05 + (this.initLength * this.initLength) / 4);
      for (i = 0; i < 4; i++) {
        vertAngle = Math.atan2(verts[i].y - y1, verts[i].x - x1);
        vertAngle = Util.NormalizeAngle(angle + vertAngle + Math.PI / 2);
        verts[i].x = centerX + dist * Math.cos(vertAngle) - this.part1.GetBody().GetPosition().x;
        verts[i].y = centerY + dist * Math.sin(vertAngle) - this.part1.GetBody().GetPosition().y;
      }
      sd.Set(verts);
      this.m_fixtures.push(this.part1.GetBody().CreateFixture({ ...part1FixtureDef, shape: sd }));
      this.m_shapes.push(sd);

      sd = new b2PolygonShape();
      dist = Math.sqrt(0.15 * 0.15 + this.initLength * this.initLength);
      centerX = x1 + dist * Math.cos(Math.atan2(-this.initLength, -0.15) + angle + Math.PI / 2);
      centerY = y1 + dist * Math.sin(Math.atan2(-this.initLength, -0.15) + angle + Math.PI / 2);
      verts[0] = new b2Vec2(x1 - 0.095, y1 - 0.05);
      verts[1] = new b2Vec2(x1 + 0.095, y1 - 0.05);
      verts[2] = new b2Vec2(x1 + 0.095, y1 + 0.05);
      verts[3] = new b2Vec2(x1 - 0.095, y1 + 0.05);
      dist = Math.sqrt(0.095 * 0.095 + 0.05 * 0.05);
      for (i = 0; i < 4; i++) {
        vertAngle = Math.atan2(verts[i].y - y1, verts[i].x - x1);
        vertAngle = Util.NormalizeAngle(angle + vertAngle + Math.PI / 2);
        verts[i].x = centerX + dist * Math.cos(vertAngle) - this.part1.GetBody().GetPosition().x;
        verts[i].y = centerY + dist * Math.sin(vertAngle) - this.part1.GetBody().GetPosition().y;
      }
      sd.Set(verts);
      this.m_fixtures.push(this.part1.GetBody().CreateFixture({ ...part1FixtureDef, shape: sd }));
      this.m_shapes.push(sd);

      sd = new b2PolygonShape();
      dist = Math.sqrt(0.15 * 0.15 + this.initLength * this.initLength);
      centerX = x1 + dist * Math.cos(Math.atan2(-this.initLength, 0.15) + angle + Math.PI / 2);
      centerY = y1 + dist * Math.sin(Math.atan2(-this.initLength, 0.15) + angle + Math.PI / 2);
      verts[0] = new b2Vec2(x1 - 0.095, y1 - 0.05);
      verts[1] = new b2Vec2(x1 + 0.095, y1 - 0.05);
      verts[2] = new b2Vec2(x1 + 0.095, y1 + 0.05);
      verts[3] = new b2Vec2(x1 - 0.095, y1 + 0.05);
      dist = Math.sqrt(0.095 * 0.095 + 0.05 * 0.05);
      for (i = 0; i < 4; i++) {
        vertAngle = Math.atan2(verts[i].y - y1, verts[i].x - x1);
        vertAngle = Util.NormalizeAngle(angle + vertAngle + Math.PI / 2);
        verts[i].x = centerX + dist * Math.cos(vertAngle) - this.part1.GetBody().GetPosition().x;
        verts[i].y = centerY + dist * Math.sin(vertAngle) - this.part1.GetBody().GetPosition().y;
      }
      sd.Set(verts);
      this.m_fixtures.push(this.part1.GetBody().CreateFixture({ ...part1FixtureDef, shape: sd }));
      this.m_shapes.push(sd);

      sd = new b2PolygonShape();
      dist = this.initLength / 2 - 0.1;
      centerX = x2 + dist * Math.cos(Math.atan2(this.initLength / 2 - 0.1, 0) + angle + Math.PI / 2);
      centerY = y2 + dist * Math.sin(Math.atan2(this.initLength / 2 - 0.1, 0) + angle + Math.PI / 2);
      verts[0] = new b2Vec2(x2 - 0.05, y2 - this.initLength / 2);
      verts[1] = new b2Vec2(x2 + 0.05, y2 - this.initLength / 2);
      verts[2] = new b2Vec2(x2 + 0.05, y2 + this.initLength / 2);
      verts[3] = new b2Vec2(x2 - 0.05, y2 + this.initLength / 2);
      dist = Math.sqrt(0.05 * 0.05 + (this.initLength * this.initLength) / 4);
      for (i = 0; i < 4; i++) {
        vertAngle = Math.atan2(verts[i].y - y2, verts[i].x - x2);
        vertAngle = Util.NormalizeAngle(angle + vertAngle + Math.PI / 2);
        verts[i].x = centerX + dist * Math.cos(vertAngle) - this.part2.GetBody().GetPosition().x;
        verts[i].y = centerY + dist * Math.sin(vertAngle) - this.part2.GetBody().GetPosition().y;
      }
      sd.Set(verts);
      this.m_fixtures.push(this.part2.GetBody().CreateFixture({ ...part2FixtureDef, shape: sd }));
      this.m_shapes.push(sd);

      sd = new b2PolygonShape();
      dist = this.initLength - 0.1;
      centerX = x2 + dist * Math.cos(Math.atan2(this.initLength - 0.1, 0) + angle + Math.PI / 2);
      centerY = y2 + dist * Math.sin(Math.atan2(this.initLength - 0.1, 0) + angle + Math.PI / 2);
      // NOTE: Values changed from 0.14 to 0.13 here due to 0.14 causing prismatic joints to occasionally "stick" on this newer version of Box2D.
      // I'm not sure if there's a better magical value, as the sticking still happens occasionally and I'm not 100% sure what is causing it.
      verts[0] = new b2Vec2(x2 - 0.13, y2 - 0.05);
      verts[1] = new b2Vec2(x2 + 0.13, y2 - 0.05);
      verts[2] = new b2Vec2(x2 + 0.13, y2 + 0.05);
      verts[3] = new b2Vec2(x2 - 0.13, y2 + 0.05);
      dist = Math.sqrt(0.05 * 0.05 + 0.13 * 0.13);
      for (i = 0; i < 4; i++) {
        vertAngle = Math.atan2(verts[i].y - y2, verts[i].x - x2);
        vertAngle = Util.NormalizeAngle(angle + vertAngle + Math.PI / 2);
        verts[i].x = centerX + dist * Math.cos(vertAngle) - this.part2.GetBody().GetPosition().x;
        verts[i].y = centerY + dist * Math.sin(vertAngle) - this.part2.GetBody().GetPosition().y;
      }
      sd.Set(verts);
      this.m_fixtures.push(this.part2.GetBody().CreateFixture({ ...part2FixtureDef, shape: sd }));
      this.m_shapes.push(sd);

      var jd: b2PrismaticJointDef = new b2PrismaticJointDef();
      jd.enableMotor = this.enablePiston;

      //CE PROBLEM
      //jd.maxMotorForce = Math.max(1, Math.min(30, pistonStrength)) * 30;

      //CE FIX
      jd.maxMotorForce = this.pistonStrength * 30;

      jd.enableLimit = true;
      jd.lowerTranslation = 0;
      jd.upperTranslation = this.initLength - 0.2;
      jd.collideConnected = true;
      jd.Initialize(this.part1.GetBody(), this.part2.GetBody(), new b2Vec2(this.anchorX, this.anchorY), this.axis);

      jd.userData = new Object();
      jd.userData.localPoint1 = new b2Vec2(x1 - this.part1.centerX, y1 - this.part1.centerY);
      jd.userData.localPoint2 = new b2Vec2(x2 - this.part2.centerX, y2 - this.part2.centerY);
      this.m_joint = world.CreateJoint(jd);
      this.targetJointDisp = 0;

      if (!this.part1.WillBeStatic()) this.part1.GetBody().ResetMassData();
      if (!this.part2.WillBeStatic()) this.part2.GetBody().ResetMassData();

      if (!this.part1.isStatic && !this.part2.isStatic) this.part2.GetBody().SetBullet(true);

      this.isKeyDown1 = false;
      this.isKeyDown2 = false;
      this.wasKeyDown1 = false;
      this.wasKeyDown2 = false;
    }
  }

  /// Get the perpendicular joint translation, i.e. the translation against its constraints.
  // BUG: Not working if one of the parts connected to this joint instanceof connected to another body with a fixed joint
  public GetJointPerpTranslation(): number {
    var b1: b2Body = this.part1.GetBody();
    var b2: b2Body = this.part2.GetBody();

    const p1 = new b2Vec2();
    const p2 = new b2Vec2();
    const axis = new b2Vec2();
    const axisPoint = new b2Vec2();
    b1.GetWorldPoint((this.m_joint as b2PrismaticJoint).GetLocalAnchorA(), p1);
    b2.GetWorldPoint((this.m_joint as b2PrismaticJoint).GetLocalAnchorB(), p2);
    b1.GetWorldVector((this.m_joint as b2PrismaticJoint).GetLocalAxisA(), axis);
    b1.GetWorldPoint((this.m_joint as b2PrismaticJoint).GetUserData().localPoint1, axisPoint);

    var d1: number = Util.DistanceFromPointToLine(p1, axisPoint, axis);
    var d2: number = Util.DistanceFromPointToLine(p2, axisPoint, axis);

    return Math.max(d1, d2);
  }

  public CheckForBreakage(world: b2World): void {
    if (this.m_joint) {
      var joint: b2PrismaticJoint = this.m_joint as b2PrismaticJoint;

      // Check joint constraints to see if the joint should break
      var angleApart: number = Math.abs(joint.GetBodyA().GetAngle() - joint.GetBodyA().GetAngle());
      if (angleApart > (90 * Math.PI) / 180 /* || GetJointPerpTranslation() > 3.0*/) {
        world.DestroyJoint(this.m_joint);
        this.m_joint = null;
      }
    }
  }

  public Update(world: b2World): void {
    if (this.m_joint && this.enablePiston) {
      var joint: b2PrismaticJoint = this.m_joint as b2PrismaticJoint;
      if (this.isKeyDown1 || this.isKeyDown2) {
        joint.EnableMotor(true);

        //CE PROBLEM
        //joint.m_maxMotorForce = Math.max(1, Math.min(30, pistonStrength)) * 30;

        //CE FIX
        joint.SetMaxMotorForce(this.pistonStrength * 30);

        this.part1.GetBody().SetAwake(true);
        this.part2.GetBody().SetAwake(true);
      }
      if ((this.isKeyDown1 && !(this.autoOscillate && !this.expanding)) || (this.autoOscillate && this.expanding)) {
        //CE PROBLEM
        //joint.SetMotorSpeed(Math.max(1, Math.min(30, pistonSpeed)) * 0.4);

        //CE FIX
        joint.SetMotorSpeed(this.pistonSpeed * 0.4);

        if (this.isStiff && this.wasKeyDown1 && joint.GetJointTranslation() < this.prevJointDisp) {
          joint.SetMotorSpeed(0 /*(prevJointDisp - joint.GetJointTranslation()) * 2*/);

          //CE PROBLEM
          //joint.m_maxMotorForce = Math.max(1, Math.min(30, pistonStrength)) * 3000;

          //CE FIX
          joint.SetMaxMotorForce(this.pistonStrength * 3000);
        }
        if (joint.GetJointTranslation() > this.initLength - 0.4) this.expanding = false;
      } else if (this.isKeyDown2 || (this.autoOscillate && !this.expanding)) {
        //CE PROBLEM
        //joint.SetMotorSpeed(-Math.max(1, Math.min(30, pistonSpeed)) * 0.4);

        //CE FIX
        joint.SetMotorSpeed((0.0 - this.pistonSpeed) * 0.4);

        if (this.isStiff && this.wasKeyDown2 && joint.GetJointTranslation() > this.prevJointDisp) {
          joint.SetMotorSpeed(0 /*(prevJointDisp - joint.GetJointTranslation()) * 2*/);

          //CE PROBLEM
          //joint.m_maxMotorForce = Math.max(1, Math.min(30, pistonStrength)) * 3000;

          //CE FIX
          joint.SetMaxMotorForce(this.pistonStrength * 3000);
        }
        if (joint.GetJointTranslation() < 0.1) this.expanding = true;
      } else {
        if (this.wasKeyDown1 || this.wasKeyDown2) {
          this.targetJointDisp = joint.GetJointTranslation();
        }
        joint.EnableMotor(this.isStiff);
        joint.SetMotorSpeed(0 /*(targetJointDisp - joint.GetJointTranslation()) * 2*/);

        //CE PROBLEM
        //joint.m_maxMotorForce = Math.max(1, Math.min(30, pistonStrength)) * 3000;

        //CE FIX
        joint.SetMaxMotorForce(this.pistonStrength * 3000);
      }
      this.wasKeyDown1 = this.isKeyDown1;
      this.wasKeyDown2 = this.isKeyDown2;
      this.prevJointDisp = joint.GetJointTranslation();
    }
  }

  public GetShapes(): Array<b2PolygonShape> {
    return this.m_shapes;
  }

  public GetFixtures(): Array<b2Fixture> {
    return this.m_fixtures;
  }

  public KeyInput(key: number, up: boolean, replay: boolean): void {
    if (key == this.pistonUpKey) this.isKeyDown1 = !up;
    if (key == this.pistonDownKey) this.isKeyDown2 = !up;
  }

  public PrepareForResizing(): void {
    this.initInitLength = this.initLength;
  }

  public ToString(): string {
    return (
      "PrismaticJoint: axis=(" +
      this.axis.x +
      "," +
      this.axis.y +
      "), initLength=" +
      this.initLength +
      ", enablePiston=" +
      this.enablePiston +
      ", pistonUpKey=" +
      this.pistonUpKey +
      ", pistonDownKey=" +
      this.pistonDownKey +
      ", pistonStrength=" +
      this.pistonStrength +
      ", pistonSpeed=" +
      this.pistonSpeed +
      ", isStiff=" +
      this.isStiff +
      ", " +
      super.ToString()
    );
  }
}
