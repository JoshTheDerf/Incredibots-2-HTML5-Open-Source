import { Part } from "../Parts/Part";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { ShapePart } from "../Parts/ShapePart";
import { Action } from "./Action";

export class ShapeCheckboxAction extends Action
{
	public static COLLIDE_TYPE:number = 0;
	public static FIXATE_TYPE:number = 1;
	public static OUTLINE_TYPE:number = 2;
	public static TERRAIN_TYPE:number = 3;
	public static UNDRAGABLE_TYPE:number = 4;

	private type:number;
	private isChecked:boolean;

	constructor(p:Part, checkboxType:number, checked:boolean)
	{
		super(p);
		this.type = checkboxType;
		this.isChecked = checked;
	}

	public UndoAction():void {
		if (this.type == ShapeCheckboxAction.COLLIDE_TYPE) {
			if (this.partAffected instanceof ShapePart) (this.partAffected as ShapePart).collide = !this.isChecked;
			else (this.partAffected as PrismaticJoint).collide = !this.isChecked;
		} else if (this.type == ShapeCheckboxAction.FIXATE_TYPE) {
			(this.partAffected as ShapePart).isStatic = !this.isChecked;
		} else if (this.type == ShapeCheckboxAction.OUTLINE_TYPE) {
			if (this.partAffected instanceof ShapePart) (this.partAffected as ShapePart).outline = !this.isChecked;
			else (this.partAffected as PrismaticJoint).outline = !this.isChecked;
		} else if (this.type == ShapeCheckboxAction.TERRAIN_TYPE) {
			(this.partAffected as ShapePart).terrain = !this.isChecked;
		} else {
			(this.partAffected as ShapePart).undragable = !this.isChecked;
		}
	}

	public RedoAction():void {
		if (this.type == ShapeCheckboxAction.COLLIDE_TYPE) {
			if (this.partAffected instanceof ShapePart) (this.partAffected as ShapePart).collide = this.isChecked;
			else (this.partAffected as PrismaticJoint).collide = this.isChecked;
		} else if (this.type == ShapeCheckboxAction.FIXATE_TYPE) {
			(this.partAffected as ShapePart).isStatic = this.isChecked;
		} else if (this.type == ShapeCheckboxAction.OUTLINE_TYPE) {
			if (this.partAffected instanceof ShapePart) (this.partAffected as ShapePart).outline = this.isChecked;
			else (this.partAffected as PrismaticJoint).outline = this.isChecked;
		} else if (this.type == ShapeCheckboxAction.TERRAIN_TYPE) {
			(this.partAffected as ShapePart).terrain = this.isChecked;
		} else {
			(this.partAffected as ShapePart).undragable = !this.isChecked;
		}
	}
}
