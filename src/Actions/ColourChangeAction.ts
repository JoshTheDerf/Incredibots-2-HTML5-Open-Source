import { Part } from "../imports";
import { PrismaticJoint } from "../imports";
import { ShapePart } from "../imports";
import { TextPart } from "../imports";
import { Action } from "../imports";

export class ColourChangeAction extends Action
{
	private red:number;
	private green:number;
	private blue:number;
	private opacity:number;

	constructor(p:Part, deltaRed:number, deltaGreen:number, deltaBlue:number, deltaOpacity:number)
	{
		super(p);
		this.red = deltaRed;
		this.green = deltaGreen;
		this.blue = deltaBlue;
		this.opacity = deltaOpacity;
	}

	public UndoAction():void {
		if (this.partAffected instanceof ShapePart || this.partAffected instanceof PrismaticJoint || this.partAffected instanceof TextPart) {
			(this.partAffected as Object).red -= this.red;
			(this.partAffected as Object).green -= this.green;
			(this.partAffected as Object).blue -= this.blue;
			if (!(this.partAffected instanceof TextPart)) (this.partAffected as Object).opacity -= this.opacity;
		}
	}

	public RedoAction():void {
		if (this.partAffected instanceof ShapePart || this.partAffected instanceof PrismaticJoint || this.partAffected instanceof TextPart) {
			(this.partAffected as Object).red += this.red;
			(this.partAffected as Object).green += this.green;
			(this.partAffected as Object).blue += this.blue;
			if (!(this.partAffected instanceof TextPart)) (this.partAffected as Object).opacity += this.opacity;
		}
	}
}
