import { Circle, Rectangle } from "pixi.js";
import { Cannon } from "../Parts/Cannon";
import { JointPart } from "../Parts/JointPart";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import { Triangle } from "../Parts/Triangle";
import { Action } from "./Action";

export class ResizeShapesAction extends Action
{
	private partsAffected:Array<any>;
	private scaleFactor:number;

	constructor(parts:Array<any>, s:number)
	{
		super(parts[0]);
		this.partsAffected = parts;
		this.scaleFactor = s;
	}

	public UndoAction():void {
		var initDragX:number = (this.partsAffected[0] instanceof JointPart ? this.partsAffected[0].anchorX : (this.partsAffected[0] instanceof TextPart ? this.partsAffected[0].x + this.partsAffected[0].w / 2 : this.partsAffected[0].centerX));
		var initDragY:number = (this.partsAffected[0] instanceof JointPart ? this.partsAffected[0].anchorY : (this.partsAffected[0] instanceof TextPart ? this.partsAffected[0].y + this.partsAffected[0].h / 2 : this.partsAffected[0].centerY));
		for (i = 0; i < this.partsAffected.length; i++) {
			this.partsAffected[i].dragXOff = (this.partsAffected[i] instanceof JointPart ? this.partsAffected[i].anchorX : (this.partsAffected[i] instanceof TextPart ? this.partsAffected[i].x + this.partsAffected[i].w / 2 : this.partsAffected[i].centerX)) - initDragX;
			this.partsAffected[i].dragYOff = (this.partsAffected[i] instanceof JointPart ? this.partsAffected[i].anchorY : (this.partsAffected[i] instanceof TextPart ? this.partsAffected[i].y + this.partsAffected[i].h / 2 : this.partsAffected[i].centerY)) - initDragY;
			this.partsAffected[i].PrepareForResizing();
		}
		for (var i:number = 0; i < this.partsAffected.length; i++) {
			if (this.partsAffected[i] instanceof Circle) {
				this.partsAffected[i].radius = this.partsAffected[i].radius / this.scaleFactor;
				this.partsAffected[i].Move(initDragX + this.partsAffected[i].dragXOff / this.scaleFactor, initDragY + this.partsAffected[i].dragYOff / this.scaleFactor);
			} else if (this.partsAffected[i] instanceof Rectangle) {
				this.partsAffected[i].w = this.partsAffected[i].w / this.scaleFactor;
				this.partsAffected[i].h = this.partsAffected[i].h / this.scaleFactor;
				this.partsAffected[i].Move(initDragX + this.partsAffected[i].dragXOff / this.scaleFactor, initDragY + this.partsAffected[i].dragYOff / this.scaleFactor);
			} else if (this.partsAffected[i] instanceof Triangle) {
				this.partsAffected[i].centerX = initDragX + this.partsAffected[i].dragXOff / this.scaleFactor;
				this.partsAffected[i].centerY = initDragY + this.partsAffected[i].dragYOff / this.scaleFactor;
				this.partsAffected[i].x1 = this.partsAffected[i].centerX + this.partsAffected[i].initX1 / this.scaleFactor;
				this.partsAffected[i].y1 = this.partsAffected[i].centerY + this.partsAffected[i].initY1 / this.scaleFactor;
				this.partsAffected[i].x2 = this.partsAffected[i].centerX + this.partsAffected[i].initX2 / this.scaleFactor;
				this.partsAffected[i].y2 = this.partsAffected[i].centerY + this.partsAffected[i].initY2 / this.scaleFactor;
				this.partsAffected[i].x3 = this.partsAffected[i].centerX + this.partsAffected[i].initX3 / this.scaleFactor;
				this.partsAffected[i].y3 = this.partsAffected[i].centerY + this.partsAffected[i].initY3 / this.scaleFactor;
			} else if (this.partsAffected[i] instanceof Cannon) {
				this.partsAffected[i].w = this.partsAffected[i].w / this.scaleFactor;
				this.partsAffected[i].Move(initDragX + this.partsAffected[i].dragXOff / this.scaleFactor, initDragY + this.partsAffected[i].dragYOff / this.scaleFactor);
			} else if (this.partsAffected[i] instanceof JointPart) {
				this.partsAffected[i].Move(initDragX + this.partsAffected[i].dragXOff / this.scaleFactor, initDragY + this.partsAffected[i].dragYOff / this.scaleFactor);
				if (this.partsAffected[i] instanceof PrismaticJoint) {
					this.partsAffected[i].initLength = this.partsAffected[i].initInitLength / this.scaleFactor;
				}
			} else if (this.partsAffected[i] instanceof TextPart) {
				this.partsAffected[i].w = this.partsAffected[i].w / this.scaleFactor;
				this.partsAffected[i].h = this.partsAffected[i].h / this.scaleFactor;
				this.partsAffected[i].x = initDragX + this.partsAffected[i].dragXOff / this.scaleFactor - this.partsAffected[i].w / 2;
				this.partsAffected[i].y = initDragY + this.partsAffected[i].dragYOff / this.scaleFactor - this.partsAffected[i].h / 2;
			} else if (this.partsAffected[i] instanceof Thrusters) {
				this.partsAffected[i].Move(initDragX + this.partsAffected[i].dragXOff / this.scaleFactor, initDragY + this.partsAffected[i].dragYOff / this.scaleFactor);
			}
		}
	}

	public RedoAction():void {
		var initDragX:number = (this.partsAffected[0] instanceof JointPart ? this.partsAffected[0].anchorX : (this.partsAffected[0] instanceof TextPart ? this.partsAffected[0].x + this.partsAffected[0].w / 2 : this.partsAffected[0].centerX));
		var initDragY:number = (this.partsAffected[0] instanceof JointPart ? this.partsAffected[0].anchorY : (this.partsAffected[0] instanceof TextPart ? this.partsAffected[0].y + this.partsAffected[0].h / 2 : this.partsAffected[0].centerY));
		for (i = 0; i < this.partsAffected.length; i++) {
			this.partsAffected[i].dragXOff = (this.partsAffected[i] instanceof JointPart ? this.partsAffected[i].anchorX : (this.partsAffected[i] instanceof TextPart ? this.partsAffected[i].x + this.partsAffected[i].w / 2 : this.partsAffected[i].centerX)) - initDragX;
			this.partsAffected[i].dragYOff = (this.partsAffected[i] instanceof JointPart ? this.partsAffected[i].anchorY : (this.partsAffected[i] instanceof TextPart ? this.partsAffected[i].y + this.partsAffected[i].h / 2 : this.partsAffected[i].centerY)) - initDragY;
			this.partsAffected[i].PrepareForResizing();
		}
		for (var i:number = 0; i < this.partsAffected.length; i++) {
			if (this.partsAffected[i] instanceof Circle) {
				this.partsAffected[i].radius = this.partsAffected[i].radius * this.scaleFactor;
				this.partsAffected[i].Move(initDragX + this.partsAffected[i].dragXOff * this.scaleFactor, initDragY + this.partsAffected[i].dragYOff * this.scaleFactor);
			} else if (this.partsAffected[i] instanceof Rectangle) {
				this.partsAffected[i].w = this.partsAffected[i].w * this.scaleFactor;
				this.partsAffected[i].h = this.partsAffected[i].h * this.scaleFactor;
				this.partsAffected[i].Move(initDragX + this.partsAffected[i].dragXOff * this.scaleFactor, initDragY + this.partsAffected[i].dragYOff * this.scaleFactor);
			} else if (this.partsAffected[i] instanceof Triangle) {
				this.partsAffected[i].centerX = initDragX + this.partsAffected[i].dragXOff * this.scaleFactor;
				this.partsAffected[i].centerY = initDragY + this.partsAffected[i].dragYOff * this.scaleFactor;
				this.partsAffected[i].x1 = this.partsAffected[i].centerX + this.partsAffected[i].initX1 * this.scaleFactor;
				this.partsAffected[i].y1 = this.partsAffected[i].centerY + this.partsAffected[i].initY1 * this.scaleFactor;
				this.partsAffected[i].x2 = this.partsAffected[i].centerX + this.partsAffected[i].initX2 * this.scaleFactor;
				this.partsAffected[i].y2 = this.partsAffected[i].centerY + this.partsAffected[i].initY2 * this.scaleFactor;
				this.partsAffected[i].x3 = this.partsAffected[i].centerX + this.partsAffected[i].initX3 * this.scaleFactor;
				this.partsAffected[i].y3 = this.partsAffected[i].centerY + this.partsAffected[i].initY3 * this.scaleFactor;
			} else if (this.partsAffected[i] instanceof Cannon) {
				this.partsAffected[i].w = this.partsAffected[i].w * this.scaleFactor;
				this.partsAffected[i].Move(initDragX + this.partsAffected[i].dragXOff * this.scaleFactor, initDragY + this.partsAffected[i].dragYOff * this.scaleFactor);
			} else if (this.partsAffected[i] instanceof JointPart) {
				this.partsAffected[i].Move(initDragX + this.partsAffected[i].dragXOff * this.scaleFactor, initDragY + this.partsAffected[i].dragYOff * this.scaleFactor);
				if (this.partsAffected[i] instanceof PrismaticJoint) {
					this.partsAffected[i].initLength = this.partsAffected[i].initInitLength * this.scaleFactor;
				}
			} else if (this.partsAffected[i] instanceof TextPart) {
				this.partsAffected[i].w = this.partsAffected[i].w * this.scaleFactor;
				this.partsAffected[i].h = this.partsAffected[i].h * this.scaleFactor;
				this.partsAffected[i].x = initDragX + this.partsAffected[i].dragXOff * this.scaleFactor - this.partsAffected[i].w / 2;
				this.partsAffected[i].y = initDragY + this.partsAffected[i].dragYOff * this.scaleFactor - this.partsAffected[i].h / 2;
			} else if (this.partsAffected[i] instanceof Thrusters) {
				this.partsAffected[i].Move(initDragX + this.partsAffected[i].dragXOff / this.scaleFactor, initDragY + this.partsAffected[i].dragYOff / this.scaleFactor);
			}
		}
	}
}
