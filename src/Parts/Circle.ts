import { b2World, b2Body, b2CircleDef, b2Vec2, b2BodyDef, b2MassData } from "../Box2D";
import { Util } from "../General/Util";
import { FixedJoint } from "./FixedJoint";
import { ShapePart } from "./ShapePart";

export class Circle extends ShapePart
{
	public radius:number;

	public initRadius:number;

	public static MIN_RADIUS:number = 0.1;
	public static MAX_RADIUS:number = 5.0;

	constructor(x:number, y:number, rad:number, checkLimits:boolean = true)
	{
		super(x, y);

		if (checkLimits) {
			if (rad < Circle.MIN_RADIUS) rad = Circle.MIN_RADIUS;
			if (rad > Circle.MAX_RADIUS) rad = Circle.MAX_RADIUS;
		}

		this.radius = rad;
		this.type = "Circle";
	}

	public InsideShape(xVal:number, yVal:number, scale:number):boolean {
		return (Util.GetDist(this.centerX, this.centerY, xVal, yVal) <= this.radius);
	}

	public GetArea():number {
		return Math.PI * this.radius * this.radius;
	}

	public MakeCopy():ShapePart {
		var circ:Circle = new Circle(this.centerX, this.centerY, this.radius);
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
		return circ;
	}

	public Init(world:b2World, body:b2Body = null):void {
		if (this.isInitted) return;
		super.Init(world);

		var circ:b2CircleDef = new b2CircleDef();
		circ.radius = this.radius;
		circ.friction = 0.4;
		circ.restitution = 0.3;

		//CE PROBLEM
		//circ.density = (Math.max(1, Math.min(30, density)) + 5.0) / 10.0;

		//CE FIX
		circ.density = (this.density + 5.0) / 10.0;

		if (this.m_collisionGroup != Number.MIN_VALUE) circ.filter.groupIndex = this.m_collisionGroup;

		var bodyStatic:boolean = false;

		if (body) {
			circ.localPosition = new b2Vec2(this.centerX - body.GetPosition().x, this.centerY - body.GetPosition().y);
			this.m_body = body;
			bodyStatic = body.IsStatic();
		} else {
			var bd:b2BodyDef = new b2BodyDef();
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
		circ.userData.editable = this.isEditable;
		circ.userData.red = this.red;
		circ.userData.green = this.green;
		circ.userData.blue = this.blue;
		circ.userData.outline = this.outline;
		circ.userData.terrain = this.terrain;
		circ.userData.undragable = this.undragable;
		circ.userData.isPiston = -1;
		circ.userData.isSandbox = this.isSandbox;
		this.m_shape = this.m_body.CreateShape(circ);
		if (this.isStatic || bodyStatic) this.m_body.SetMass(new b2MassData());
		else this.m_body.SetMassFromShapes();

		for (var i:number = 0; i < this.m_joints.length; i++) {
			if (this.m_joints[i].isEnabled && this.m_joints[i] instanceof FixedJoint) {
				var connectedPart:ShapePart = this.m_joints[i].GetOtherPart(this);
				if (connectedPart.isEnabled) connectedPart.Init(world, this.m_body);
			}
		}
	}

	public IntersectsBox(boxX:number, boxY:number, boxW:number, boxH:number):boolean {
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

	public PrepareForResizing():void {
		this.initRadius = this.radius;
	}

	public equals(other:ShapePart):boolean {
		return (other instanceof Circle && this.NumbersEqual(this.radius, (other as Circle).radius) && super.equals(other));
	}

	public ToString():string {
		return "Circle: radius=" + this.radius + ", " + super.ToString();
	}
}
