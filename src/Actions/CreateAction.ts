import { Part } from "../imports";
import { Action } from "../imports";

export class CreateAction extends Action
{
	constructor(p:Part)
	{
		super(p);
	}

	public UndoAction():void {
		CreateAction.m_controller.DeletePart(this.partAffected, false);
	}

	public RedoAction():void {
		CreateAction.m_controller.allParts.push(this.partAffected);
		this.partAffected.isEnabled = true;
	}
}
