import { Part } from "../Parts/Part";
import { TextPart } from "../Parts/TextPart";
import { Action } from "./Action";

export class ResizeTextAction extends Action
{
	private changeX:number;
	private changeY:number;
	private changeW:number;
	private changeH:number;

	constructor(p:Part, deltaX:number, deltaY:number, deltaW:number, deltaH:number)
	{
		super(p);
		this.changeX = deltaX;
		this.changeY = deltaY;
		this.changeW = deltaW;
		this.changeH = deltaH;
	}

	public UndoAction():void {
		(this.partAffected as TextPart).x -= this.changeX;
		(this.partAffected as TextPart).y -= this.changeY;
		(this.partAffected as TextPart).w -= this.changeW;
		(this.partAffected as TextPart).h -= this.changeH;
	}

	public RedoAction():void {
		(this.partAffected as TextPart).x += this.changeX;
		(this.partAffected as TextPart).y += this.changeY;
		(this.partAffected as TextPart).w += this.changeW;
		(this.partAffected as TextPart).h += this.changeH;
	}
}
