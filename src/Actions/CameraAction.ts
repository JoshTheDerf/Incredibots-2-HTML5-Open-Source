import { Part } from "../imports";
import { ShapePart } from "../imports";
import { Action } from "../imports";

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
