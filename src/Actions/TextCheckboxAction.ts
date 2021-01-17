import { Part } from "../imports";
import { TextPart } from "../imports";
import { Action } from "../imports";

export class TextCheckboxAction extends Action
{
	public static SCALE_TYPE:number = 0;
	public static DISPLAY_TYPE:number = 1;

	private type:number;
	private isChecked:boolean;

	constructor(p:Part, checkboxType:number, checked:boolean)
	{
		super(p);
		this.type = checkboxType;
		this.isChecked = checked;
	}

	public UndoAction():void {
		if (this.type == TextCheckboxAction.SCALE_TYPE) {
			(this.partAffected as TextPart).scaleWithZoom = !this.isChecked;
		} else {
			(this.partAffected as TextPart).alwaysVisible = !this.isChecked;
		}
	}

	public RedoAction():void {
		if (this.type == TextCheckboxAction.SCALE_TYPE) {
			(this.partAffected as TextPart).scaleWithZoom = this.isChecked;
		} else {
			(this.partAffected as TextPart).alwaysVisible = this.isChecked;
		}
	}
}
