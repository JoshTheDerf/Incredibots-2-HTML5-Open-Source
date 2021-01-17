import { ShapePart } from "../imports";
import { TextPart } from "../imports";
import { Action } from "../imports";

export class MassCreateAction extends Action
{
	private parts:Array<any>;

	constructor(createdParts:Array<any>)
	{
		super(createdParts[0]);
		this.parts = createdParts;
	}

	public UndoAction():void {
		for (var i:number = 0; i < this.parts.length; i++) {
			if (this.parts[i] instanceof ShapePart || this.parts[i] instanceof TextPart) {
				MassCreateAction.m_controller.DeletePart(this.parts[i], false);
			}
		}
	}

	public RedoAction():void {
		for (var i:number = 0; i < this.parts.length; i++) {
			MassCreateAction.m_controller.allParts.push(this.parts[i]);
			this.parts[i].isEnabled = true;
		}
	}
}
