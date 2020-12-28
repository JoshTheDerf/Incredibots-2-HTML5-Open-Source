import { b2Vec2, b2World, b2Body, b2BodyDef, b2MassData } from "@box2d/core";
import { ControllerGame } from "../Game/ControllerGame";
import { ControllerMainMenu } from "../Game/ControllerMainMenu";
import { Util } from "../General/Util";
import { FixedJoint } from "./FixedJoint";
import { ShapePart } from "./ShapePart";

	export class Cannon extends ShapePart
	{
		public x:number;
		public y:number;
		public w:number;
		public fireKey:number;
		public strength:number;

		private createCannonball:boolean = false;
		public initW:number;
		private relativeCannonPos:b2Vec2;

		public cannonballs:Array<any> = new Array();
		private cannonballCounters:Array<any> = new Array();

		public static const MIN_WIDTH:number = 0.5;
		public static const MAX_WIDTH:number = 10.0;

		constructor(nx:number, ny:number, nw:number, checkLimits:boolean = true)
		{
			// FIXME: Change super call as it must be before everything else but we do extra position calcs after it.
			super(nx + nw / 2, ny + nw / 4);
			var rotated:boolean = false;
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

			this.fireKey = 40;
			this.strength = 15;

			if (rotated) this.angle = Math.PI;
			this.type = "Cannon";
		}

		public GetArea():number {
			return this.w * this.w / 2;
		}

		public Move(xVal:number, yVal:number):void {
			this.x = xVal - this.w / 2;
			this.y = yVal - this.w / 4;
			super.Move(xVal, yVal);
		}

		public GetVertices():Array<any> {
			var verts:Array<any> = new Array(4);
			verts[0] = new b2Vec2(this.x, this.y);
			verts[1] = new b2Vec2(this.x + this.w, this.y);
			verts[2] = new b2Vec2(this.x + this.w, this.y + this.w / 2);
			verts[3] = new b2Vec2(this.x, this.y + this.w / 2);
			var dist:number = Math.sqrt(5 * this.w * this.w / 16);
			for (var i:number = 0; i < 4; i++) {
				var vertAngle:number = Math.atan2((verts[i] as b2Vec2).y - this.centerY, (verts[i] as b2Vec2).x - this.centerX);
				vertAngle = Util.NormalizeAngle(this.angle + vertAngle);
				verts[i].x = this.centerX + dist * Math.cos(vertAngle);
				verts[i].y = this.centerY + dist * Math.sin(vertAngle);
			}
			return verts;
		}

		public GetSpawnPoint():b2Vec2 {
			return Util.Vector(this.centerX + Math.cos(this.angle) * 2 * this.w / 3, this.centerY + Math.sin(this.angle) * 2 * this.w / 3);
		}

		public InsideShape(xVal:number, yVal:number, scale:number):boolean {
			var allOnRightSide:boolean = true;
			var verts:Array<any> = this.GetVertices();
			for (var i:number = 0; i < 4; i++) {
				var slope:number;
				if (verts[(i + 1) % 4].x == verts[i].x) {
					if (verts[(i + 1) % 4].y >= verts[i].y) {
						slope = 100000000;
					} else {
						slope = -100000000;
					}
				} else {
					slope = (verts[(i + 1) % 4].y - verts[i].y) / (verts[(i + 1) % 4].x - verts[i].x);
				}
				var val1:number = yVal - verts[i].y - slope * (xVal - verts[i].x);
				var val2:number = verts[(i + 2) % 4].y - verts[i].y - slope * (verts[(i + 2) % 4].x - verts[i].x);
				if ((val1 < 0 && val2 > 0) || (val1 > 0 && val2 < 0)) allOnRightSide = false;
			}
			return allOnRightSide;
		}

		public MakeCopy():ShapePart {
			var c:Cannon = new Cannon(this.x, this.y, this.w);
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
			return c;
		}

		public Init(world:b2World, body:b2Body = null):void {
			if (this.isInitted) return;
			super.Init(world);

			var sd:b2PolygonDef = new b2PolygonDef();
			sd.friction = 0.4;
			sd.restitution = 0.3;

			//CE PROBLEM
			//sd.density = (Math.max(1, Math.min(30, density)) + 5.0) / 10.0;

			//CE FIX
			sd.density = (this.density + 5.0) / 10.0;

			sd.vertexCount = 4;
			if (this.m_collisionGroup != int.MIN_VALUE) sd.filter.groupIndex = this.m_collisionGroup;
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
				this.m_body = world.CreateBody(bd);
			}
			sd.userData = new Object();
			sd.userData.collide = this.collide;
			sd.userData.editable = this.isEditable;
			sd.userData.red = this.red;
			sd.userData.green = this.green;
			sd.userData.blue = this.blue;
			sd.userData.outline = this.outline;
			sd.userData.terrain = this.terrain;
			sd.userData.undragable = this.undragable;
			sd.userData.isPiston = -1;
			this.m_shape = this.m_body.CreateShape(sd);

			if (this.isStatic || bodyStatic) this.m_body.SetMass(new b2MassData());
			else this.m_body.SetMassFromShapes();

			this.cannonballs.length = 0;
			this.cannonballCounters.length = 0;

			for (i = 0; i < this.m_joints.length; i++) {
				if (this.m_joints[i].isEnabled && this.m_joints[i] instanceof FixedJoint) {
					var connectedPart:ShapePart = this.m_joints[i].GetOtherPart(this);
					if (connectedPart.isEnabled) connectedPart.Init(world, this.m_body);
				}
			}

			this.relativeCannonPos = Util.Vector(this.centerX, this.centerY);
			this.relativeCannonPos.Subtract(this.m_body.GetPosition());
		}

		public KeyInput(key:number, up:boolean, replay:boolean):void {
			if (key == this.fireKey && up) this.createCannonball = true;
		}

		public Update(world:b2World):void {
			if (this.isInitted && this.createCannonball && this.cannonballs.length < 50) {
				this.CreateCannonball(world);
			}
			this.createCannonball = false;

			for (var i:number = 0; i < this.cannonballCounters.length; i++) {
				this.cannonballCounters[i]--;
				if (this.cannonballCounters[i] == 0) this.cannonballs[i].GetShapeList().m_filter.groupIndex = 0;
			}
		}

		private CreateCannonball(world:b2World):void {
			var circ:b2CircleDef = new b2CircleDef();
			circ.radius = this.w / 6;
			circ.friction = 0.4;
			circ.restitution = 0.3;

			//CE PROBLEM
			//circ.density = (Math.max(1, Math.min(30, density)) + 5.0) / 10.0;

			//CE FIX
			circ.density = (this.density + 5.0) / 10.0;

			if (this.m_collisionGroup != int.MIN_VALUE) circ.filter.groupIndex = this.m_collisionGroup;
			var bd:b2BodyDef = new b2BodyDef();
			var localPoint:b2Vec2 = this.GetSpawnPoint();
			localPoint.Subtract(Util.Vector(this.centerX, this.centerY));
			localPoint.Add(this.relativeCannonPos);
			bd.position.SetV(this.m_body.GetWorldPoint(localPoint));
			bd.isBullet = true;
			var body:b2Body = world.CreateBody(bd);
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
			body.CreateShape(circ);
			body.SetMassFromShapes();

			var forceAngle:number = this.angle + this.m_body.GetAngle();

			//CE PROBLEM
			//var forceStrength:number = 0.15 * w * w * circ.density * (4 + 2 * Math.max(1, Math.min(30, strength)));

			//CE FIX
			var forceStrength:number = 0.15 * this.w * this.w * circ.density * (4 + 2 * this.strength);

			var forceVector:b2Vec2 = Util.Vector(Math.cos(forceAngle) * forceStrength, Math.sin(forceAngle) * forceStrength);
			var positionVector:b2Vec2 = this.m_body.GetWorldPoint(this.relativeCannonPos);
			body.ApplyImpulse(forceVector, body.GetWorldCenter());
			forceVector = forceVector.Negative();
			this.m_body.ApplyImpulse(forceVector, positionVector);
			if (ControllerGame.cannonballs) ControllerGame.cannonballs.push(body);
			if (ControllerMainMenu.cannonballs) ControllerMainMenu.cannonballs.push(body);

			this.cannonballCounters.push(5);
		}

		public IntersectsBox(boxX:number, boxY:number, boxW:number, boxH:number):boolean {
			if (this.centerX >= boxX && this.centerX <= boxX + boxW && this.centerY >= boxY && this.centerY <= boxY + boxH) {
				return true;
			}

			var verts:Array<any> = this.GetVertices();
			for (var i:number = 0; i < 4; i++) {
				if (Util.SegmentsIntersect(verts[i].x, verts[i].y, verts[(i + 1) % 4].x, verts[(i + 1) % 4].y, boxX, boxY, boxX + boxW, boxY)) return true;
				if (Util.SegmentsIntersect(verts[i].x, verts[i].y, verts[(i + 1) % 4].x, verts[(i + 1) % 4].y, boxX + boxW, boxY, boxX + boxW, boxY + boxH)) return true;
				if (Util.SegmentsIntersect(verts[i].x, verts[i].y, verts[(i + 1) % 4].x, verts[(i + 1) % 4].y, boxX + boxW, boxY + boxH, boxX, boxY + boxH)) return true;
				if (Util.SegmentsIntersect(verts[i].x, verts[i].y, verts[(i + 1) % 4].x, verts[(i + 1) % 4].y, boxX, boxY + boxH, boxX, boxY)) return true;
			}
			return false;
		}

		public PrepareForResizing():void {
			this.initW = this.w;
		}

		public GetVerticesForOutline(thickness:number):Array<any> {
			return Cannon.GetOutlineVertices(this.GetVertices(), 4, thickness);
		}

		public equals(other:ShapePart):boolean {
			return (other instanceof Cannon && this.x == (other as Cannon).x && this.y == (other as Cannon).y && this.w == (other as Cannon).w && this.fireKey == (other as Cannon).fireKey && this.strength == (other as Cannon).strength && super.equals(other));
		}

		public ToString():string {
			return "Cannon: x=" + this.x + ", " + "y=" + this.y + ", " + "w=" + this.w + ", " + "fireKey=" + this.fireKey + ", " + "strength=" + this.strength + super.ToString();
		}
	}
}
