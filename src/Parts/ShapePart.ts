import { b2Body, b2Shape, b2World, b2Vec2 } from "../Box2D";
import { ControllerGame } from "../Game/ControllerGame";
import { ControllerGameGlobals } from "../Game/Globals/ControllerGameGlobals";
import { Util } from "../General/Util";
import { FixedJoint } from "./FixedJoint";
import { JointPart } from "./JointPart";
import { IllegalOperationError, Part } from "./Part";
import { Thrusters } from "./Thrusters";

export class ShapePart extends Part
{
	public centerX:number;
	public centerY:number;
	public density:number;
	public angle:number;
	public collide:boolean = true;
	public isCameraFocus:boolean = false;
	public m_collisionGroup:number = Number.MIN_SAFE_INTEGER;
	public highlightForJoint:boolean = false;
	public isBullet:boolean = false;
	public red:number;
	public green:number;
	public blue:number;
	public opacity:number;
	public outline:boolean;
	public terrain:boolean;
	public undragable:boolean;
	protected m_body:b2Body = null;
	protected m_shape:b2Shape = null;
	protected m_joints:Array<any>;
	protected m_thrusters:Array<any>;

	constructor(x:number, y:number)
	{
		super()
		this.centerX = x;
		this.centerY = y;
		if (ControllerGameGlobals.minDensity > 15.0) {
			this.density = ControllerGameGlobals.minDensity;
		} else if (ControllerGameGlobals.maxDensity < 15.0) {
			this.density = ControllerGameGlobals.maxDensity;
		} else {
			this.density = 15.0;
		}
		this.angle = 0;
		this.red = ControllerGameGlobals.defaultR;
		this.green = ControllerGameGlobals.defaultG;
		this.blue = ControllerGameGlobals.defaultB;
		this.opacity = ControllerGameGlobals.defaultO;
		this.outline = true;
		this.terrain = false;
		this.undragable = false;
		this.m_joints = new Array();
		this.m_thrusters = new Array();
	}

	public GetBody():b2Body {
		return this.m_body;
	}

	public GetShape():b2Shape {
		return this.m_shape;
	}

	public AddJoint(j:JointPart):void {
		this.m_joints.push(j);
	}

	public AddThrusters(t:Thrusters):void {
		this.m_thrusters.push(t);
	}

	public Move(xVal:number, yVal:number):void {
		this.centerX = xVal;
		this.centerY = yVal;
	}

	public RotateAround(xVal:number, yVal:number, curAngle:number):void {
		var dist:number = Util.GetDist(this.centerX, this.centerY, xVal, yVal);
		var absoluteAngle:number = this.rotateAngle + curAngle;
		this.Move(xVal + dist * Math.cos(absoluteAngle), yVal + dist * Math.sin(absoluteAngle));
		this.angle = curAngle + this.rotateOrientation;
	}

	public MakeCopy():ShapePart {
		throw new IllegalOperationError("abstract ShapePart.MakeCopy() called");
	}

	public HeavierThan(other:ShapePart):boolean {
		return (this.m_body.GetMass() > other.GetBody().GetMass());
	}

	public GetMass():number {
		if (this.m_body) return this.m_body.GetMass();
		return this.GetArea() * (this.density + 5.0) / 10.0;
	}

	public GetArea():number {
		throw new IllegalOperationError("abstract ShapePart.GetArea() called");
	}

	public UnInit(world:b2World):void {
		if (!this.isInitted) return;
		super.UnInit(world);
		if (this.m_body) {
			if (!this.m_body.m_userData || !this.m_body.m_userData.deleted) {
				world.DestroyBody(this.m_body);
				if (!this.m_body.m_userData) this.m_body.m_userData = new Object();
				this.m_body.m_userData.deleted = true;
			}
			this.m_body = null;
		}
	}

	public Update(world:b2World):void {
		// do nothing
	}

	public KeyInput(key:number, up:boolean, replay:boolean):void {
		// do nothing
	}

	public SetCollisionGroup(grp:number):void {
		if (!this.checkedCollisionGroup) {
			this.checkedCollisionGroup = true;
			this.m_collisionGroup = grp;
			for (var i:number = 0; i < this.m_joints.length; i++) {
				if (this.m_joints[i].isEnabled) {
					this.m_joints[i].GetOtherPart(this).SetCollisionGroup(grp);
				}
			}
		}
	}

	public GetActiveJoints():Array<any> {
		return this.m_joints.filter(this.IsEnabled);
	}

	public GetActiveThrusters():Array<any> {
		return this.m_thrusters.filter(this.IsEnabled);
	}

	public WillBeStatic(shapeList:Array<any> = null):boolean {
		if (this.isStatic) return true;
		if (shapeList == null) shapeList = new Array();
		shapeList.push(this);
		for (var i:number = 0; i < this.m_joints.length; i++) {
			if (this.m_joints[i] instanceof FixedJoint) {
				var otherShape:ShapePart = this.m_joints[i].GetOtherPart(this);
				if (!Util.ObjectInArray(otherShape, shapeList) && otherShape.WillBeStatic(shapeList)) return true;
			}
		}
		return false;
	}

	public GetAttachedParts(partList:Array<any> = null):Array<any> {
		if (partList == null) partList = new Array();
		partList.push(this);

		for (var i:number = 0; i < this.m_joints.length; i++) {
			if (this.m_joints[i].isEnabled) {
				var alreadyThere:boolean = false;
				for (var j:number = 0; j < partList.length; j++) {
					if (this.m_joints[i] == partList[j]) alreadyThere = true;
				}

				if (!alreadyThere) partList.concat(this.m_joints[i].GetAttachedParts(partList));
			}
		}

		for (i = 0; i < this.m_thrusters.length; i++) {
			if (this.m_thrusters[i].isEnabled) {
				alreadyThere = false;
				for (j = 0; j < partList.length; j++) {
					if (this.m_thrusters[i] == partList[j]) alreadyThere = true;
				}

				if (!alreadyThere) partList.concat(this.m_thrusters[i].GetAttachedParts(partList));
			}
		}

		return partList;
	}

	public static GetOutlineVertices(verts:Array<any>, numVerts:number, thickness:number):Array<any> {
		var newVerts:Array<any> = new Array();
		if (numVerts == 3) {
			var center:b2Vec2 = Util.Vector((verts[0].x + verts[1].x + verts[2].x) / 3, (verts[0].y + verts[1].y + verts[2].y) / 3);
			var length1:number = Util.GetDist(verts[0].x, verts[0].y, verts[1].x, verts[1].y);
			var length2:number = Util.GetDist(verts[0].x, verts[0].y, verts[2].x, verts[2].y);
			var length3:number = Util.GetDist(verts[1].x, verts[1].y, verts[2].x, verts[2].y);
			var avgLength:number = (length1 + length2 + length3) / 3;
			var a1:number = Util.NormalizeAngle(Math.acos((length1 * length1 + length2 * length2 - length3 * length3) / (2 * length1 * length2)));
			var a2:number = Util.NormalizeAngle(Math.acos((length1 * length1 + length3 * length3 - length2 * length2) / (2 * length1 * length3)));
			var a3:number = Util.NormalizeAngle(Math.acos((length2 * length2 + length3 * length3 - length1 * length1) / (2 * length2 * length3)));
			var minAngle:number = Math.min(a1, a2, a3) * 180 / Math.PI;
			var angleFactor:number = (minAngle < 30 ? 30 / minAngle : 1)
			var scaleFactor:number = 1 + 2.5 * thickness / avgLength * angleFactor;
			newVerts.push(Util.Vector(center.x + (verts[0].x - center.x) * scaleFactor, center.y + (verts[0].y - center.y) * scaleFactor));
			newVerts.push(Util.Vector(center.x + (verts[1].x - center.x) * scaleFactor, center.y + (verts[1].y - center.y) * scaleFactor));
			newVerts.push(Util.Vector(center.x + (verts[2].x - center.x) * scaleFactor, center.y + (verts[2].y - center.y) * scaleFactor));
		} else {
			for (var i:number = 0; i < numVerts; i++) {
				var prev:b2Vec2 = (i == 0 ? verts[numVerts - 1] : verts[i - 1]);
				var cur:b2Vec2 = verts[i];
				var next:b2Vec2 = (i == numVerts - 1 ? verts[0] : verts[i + 1]);
				var angle1:number = Math.atan2(prev.y - cur.y, prev.x - cur.x);
				var angle2:number = Math.atan2(next.y - cur.y, next.x - cur.x);
				var bisectorAngle:number = Util.NormalizeAngle((angle1 + angle2) / 2 + (Math.max(angle1, angle2) - Math.min(angle1, angle2) < Math.PI ? Math.PI : 0));
				newVerts.push(Util.Vector(cur.x + Math.cos(bisectorAngle) * thickness * 1.1, cur.y + Math.sin(bisectorAngle) * thickness * 1.1));
			}
		}

		return newVerts;
	}

	public equals(other:ShapePart):boolean {
		return (this.isStatic == other.isStatic && this.NumbersEqual(this.centerX, other.centerX) && this.NumbersEqual(this.centerY, other.centerY) && this.NumbersEqual(this.density, other.density) && this.NumbersEqual(this.angle, other.angle) && this.collide == other.collide && this.red == other.red && this.green == other.green && this.blue == other.blue && this.opacity == other.opacity && this.outline == other.outline && this.terrain == other.terrain && this.undragable == other.undragable);
	}

	public NumbersEqual(n1:number, n2:number):boolean {
		return (Math.abs(n1 - n2) < 0.0001);
	}

	public ToString():string {
		return "centerX=" + this.centerX + ", " + "centerY=" + this.centerY + ", " + "density=" + this.density + ", " + "angle=" + this.angle + ", " + "collide=" + this.collide + ", " + super.ToString();
	}
}
