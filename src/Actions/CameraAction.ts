import { Part } from "../Parts/Part";
import { ShapePart } from "../Parts/ShapePart";
import { Action } from "./Action";

export class CameraAction extends Action
{
	private isChecked:boolean;
	private oldCameraPart:ShapePart|null

	constructor(p:Part, checked:boolean, oldPart:ShapePart|null = null)
	{
		super(p);
		this.isChecked = checked;
		this.oldCameraPart = oldPart;
	}

	public UndoAction():void {
		(this.partAffected as ShapePart).isCameraFocus = !this.isChecked;
		if (this.oldCameraPart) this.oldCameraPart.isCameraFocus = true;
	}

	public RedoAction():void {
		(this.partAffected as ShapePart).isCameraFocus = this.isChecked;
		if (this.oldCameraPart) this.oldCameraPart.isCameraFocus = false;
	}
}
