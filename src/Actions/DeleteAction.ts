import { Part } from "../Parts/Part";
import { Action } from "./Action";

export class DeleteAction extends Action
{
	private joints:Array<any>;

	constructor(p:Part, affectedJoints:Array<any>)
	{
		super(p);
		this.joints = affectedJoints;
	}

	public UndoAction():void {
		DeleteAction.m_controller.allParts.push(this.partAffected);
		for (var i:number = 0; i < this.joints.length; i++) {
			DeleteAction.m_controller.allParts.push(this.joints[i]);
			this.joints[i].isEnabled = true;
		}
		this.partAffected.isEnabled = true;
	}

	public RedoAction():void {
		DeleteAction.m_controller.DeletePart(this.partAffected, false);
	}
}
