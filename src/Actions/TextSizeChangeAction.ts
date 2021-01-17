import { Part } from "../imports";
import { TextPart } from "../imports";
import { Action } from "../imports";

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
