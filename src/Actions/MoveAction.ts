import { Part } from "../Parts/Part";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import { Action } from "./Action";

export class MoveAction extends Action
{
	private movedParts:Array<any>;
	private xMove:number;
	private yMove:number;

	constructor(p:Part, attachedParts:Array<any>, deltaX:number, deltaY:number) {
		super(p);
		this.xMove = deltaX;
		this.yMove = deltaY;
		this.movedParts = attachedParts;
	}

	public UndoAction():void {
		for (var i:number = 0; i < this.movedParts.length; i++) {
			if (this.movedParts[i] instanceof ShapePart || this.movedParts[i] instanceof Thrusters) {
				this.movedParts[i].Move(this.movedParts[i].centerX - this.xMove, this.movedParts[i].centerY - this.yMove);
			} else if (this.movedParts[i] instanceof TextPart) {
				this.movedParts[i].Move(this.movedParts[i].x - this.xMove, this.movedParts[i].y - this.yMove);
			} else {
				this.movedParts[i].Move(this.movedParts[i].anchorX - this.xMove, this.movedParts[i].anchorY - this.yMove);
			}
		}
	}

	public RedoAction():void {
		for (var i:number = 0; i < this.movedParts.length; i++) {
			if (this.movedParts[i] instanceof ShapePart || this.movedParts[i] instanceof Thrusters) {
				this.movedParts[i].Move(this.movedParts[i].centerX + this.xMove, this.movedParts[i].centerY + this.yMove);
			} else if (this.movedParts[i] instanceof TextPart) {
				this.movedParts[i].Move(this.movedParts[i].x + this.xMove, this.movedParts[i].y + this.yMove);
			} else {
				this.movedParts[i].Move(this.movedParts[i].anchorX + this.xMove, this.movedParts[i].anchorY + this.yMove);
			}
		}
	}
}
