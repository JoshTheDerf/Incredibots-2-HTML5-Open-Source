import { Part } from "../Parts/Part";
import { Action } from "./Action";

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
