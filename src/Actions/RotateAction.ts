import { Util } from "../imports";
import { Part } from "../imports";
import { PrismaticJoint } from "../imports";
import { ShapePart } from "../imports";
import { Thrusters } from "../imports";
import { Action } from "../imports";

export class RotateAction extends Action
{
	private angle:number;
	private rotatedParts:Array<any>;

	constructor(p:Part, attachedParts:Array<any>, deltaAngle:number) {
		super(p);
		this.angle = deltaAngle;
		this.rotatedParts = attachedParts;
	}

	public UndoAction():void {
		for (var i:number = 0; i < this.rotatedParts.length; i++) {
			if (this.rotatedParts[i] instanceof ShapePart || this.rotatedParts[i] instanceof Thrusters) {
				this.rotatedParts[i].rotateAngle = Math.atan2(this.rotatedParts[i].centerY - (this.partAffected as Object).centerY, this.rotatedParts[i].centerX - (this.partAffected as Object).centerX);
				this.rotatedParts[i].rotateOrientation = this.rotatedParts[i].angle;
			} else {
				this.rotatedParts[i].rotateAngle = Math.atan2(this.rotatedParts[i].anchorY - (this.partAffected as Object).centerY, this.rotatedParts[i].anchorX - (this.partAffected as Object).centerX);
				if (this.rotatedParts[i] instanceof PrismaticJoint) {
					this.rotatedParts[i].rotateOrientation = Util.GetAngle(this.rotatedParts[i].axis);
				}
			}
			this.rotatedParts[i].RotateAround((this.partAffected as Object).centerX, (this.partAffected as Object).centerY, -this.angle);
		}
	}

	public RedoAction():void {
		for (var i:number = 0; i < this.rotatedParts.length; i++) {
			if (this.rotatedParts[i] instanceof ShapePart || this.rotatedParts[i] instanceof Thrusters) {
				this.rotatedParts[i].rotateAngle = Math.atan2(this.rotatedParts[i].centerY - (this.partAffected as Object).centerY, this.rotatedParts[i].centerX - (this.partAffected as Object).centerX);
				this.rotatedParts[i].rotateOrientation = this.rotatedParts[i].angle;
			} else {
				this.rotatedParts[i].rotateAngle = Math.atan2(this.rotatedParts[i].anchorY - (this.partAffected as Object).centerY, this.rotatedParts[i].anchorX - (this.partAffected as Object).centerX);
				if (this.rotatedParts[i] instanceof PrismaticJoint) {
					this.rotatedParts[i].rotateOrientation = Util.GetAngle(this.rotatedParts[i].axis);
				}
			}
			this.rotatedParts[i].RotateAround((this.partAffected as Object).centerX, (this.partAffected as Object).centerY, this.angle);
		}
	}
}
