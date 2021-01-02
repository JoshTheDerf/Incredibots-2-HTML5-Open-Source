import { Action } from "./Action";

export class ClearAction extends Action
{
	private parts:Array<any>;

	constructor(clearedParts:Array<any>)
	{
		super(clearedParts[0]);
		this.parts = clearedParts;
	}

	public UndoAction():void {
		for (var i:number = 0; i < this.parts.length; i++) {
			ClearAction.m_controller.allParts.push(this.parts[i]);
			this.parts[i].isEnabled = true;
		}
	}

	public RedoAction():void {
		for (var i:number = 0; i < this.parts.length; i++) {
			ClearAction.m_controller.DeletePart(this.parts[i], false);
		}
	}
}
