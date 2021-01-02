import { Part } from "../Parts/Part";
import { TextPart } from "../Parts/TextPart";
import { Action } from "./Action";

export class TextSizeChangeAction extends Action
{
	private type:number;
	private change:number;

	constructor(p:Part, delta:number)
	{
		super(p);
		this.change = delta;
	}

	public UndoAction():void {
		(this.partAffected as TextPart).size -= this.change;
	}

	public RedoAction():void {
		(this.partAffected as TextPart).size += this.change;
	}
}
