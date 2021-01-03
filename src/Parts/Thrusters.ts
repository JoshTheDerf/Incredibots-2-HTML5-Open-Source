import { b2Vec2, b2World, b2Body } from "@box2d/core";
import { ControllerGame } from "../Game/ControllerGame";
import { Util } from "../General/Util";
import { Part } from "./Part";
import { ShapePart } from "./ShapePart";

	export class Thrusters extends Part
	{
		public shape:ShapePart;
		public centerX:number;
		public centerY:number;
		public strength:number;
		public angle:number;
		public thrustKey:number;
		public autoOn:boolean;

		public isBalloon:boolean = false;
		public shapeIndex:number = -1;
		private isKeyDown:boolean = false;
		private relativeThrusterPos:b2Vec2;

		constructor(p1:ShapePart, x:number, y:number)
		{
			super()
			this.shape = p1;
			this.centerX = x;
			this.centerY = y;
			this.type = "Thrusters";
			if (ControllerGameGlobals.maxThrusterStrength < 15.0) {
				this.strength = ControllerGameGlobals.maxThrusterStrength;
			} else {
				this.strength = 15.0;
			}
			this.angle = -Math.PI / 2;
			this.thrustKey = 38;
			this.autoOn = false;
			this.shape.AddThrusters(this);
		}

		public MakeCopy(p:ShapePart):Thrusters {
			var t:Thrusters = new Thrusters(p, this.centerX, this.centerY);
			t.strength = this.strength;
			t.autoOn = this.autoOn;
			t.thrustKey = this.thrustKey;
			t.angle = this.angle;
			return t;
		}

		public InsideShape(xVal:number, yVal:number, scale:number):boolean {
			return (Util.GetDist(this.centerX, this.centerY, xVal, yVal) < 0.25 * 30 / scale)
		}

		public Init(world:b2World, body:b2Body = null):void {
			if (this.isInitted || !this.shape.isInitted) return;
			super.Init(world);
			this.isKeyDown = false;
			this.relativeThrusterPos = Util.Vector(this.centerX, this.centerY);
			this.relativeThrusterPos.Subtract(this.shape.GetBody().GetPosition());
		}

		public KeyInput(key:number, up:boolean, replay:boolean):void {
			if (key == this.thrustKey) this.isKeyDown = !up;
		}

		public Update(world:b2World):void {
			if (this.isInitted && (this.isKeyDown || this.autoOn)) {
				var forceAngle:number = this.angle + this.shape.GetBody().GetAngle();
				if (this.isBalloon) forceAngle = -Math.PI / 2;

				//CE PROBLEM
				//var forceStrength:number = 10 + Math.max(1, Math.min(30, strength)) * Math.max(1, Math.min(30, strength)) * 10;

				//CE FIX
				var forceStrength:number = 10 + this.strength * this.strength * 10;

				var forceVector:b2Vec2 = Util.Vector(Math.cos(forceAngle) * forceStrength, Math.sin(forceAngle) * forceStrength);
				var positionVector:b2Vec2 = this.shape.GetBody().GetWorldPoint(this.relativeThrusterPos);
				this.shape.GetBody().ApplyForce(forceVector, positionVector);
			}
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

		public GetAttachedParts(partList:Array<any> = null):Array<any> {
			if (partList == null) partList = new Array();
			partList.push(this);

			var shapeThere:boolean = false;
			for (var i:number = 0; i < partList.length; i++) {
				if (this.shape == partList[i]) shapeThere = true;
			}
			if (!shapeThere) partList.concat(this.shape.GetAttachedParts(partList));

			return partList;
		}

		public IntersectsBox(boxX:number, boxY:number, boxW:number, boxH:number):boolean {
			return (this.centerX >= boxX && this.centerX <= boxX + boxW && this.centerY >= boxY && this.centerY <= boxY + boxH);
		}

		public PrepareForResizing():void {

		}

		public ToString():string {
			return "Thrusters: x=" + this.centerX + ", y=" + this.centerY + ", strength=" + this.strength + ", " + super.ToString();
		}
	}
}
