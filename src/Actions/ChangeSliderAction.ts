import { Cannon } from "../Parts/Cannon";
import { Part } from "../Parts/Part";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { RevoluteJoint } from "../Parts/RevoluteJoint";
import { ShapePart } from "../Parts/ShapePart";
import { Thrusters } from "../Parts/Thrusters";
import { Action } from "./Action";

export class ChangeSliderAction extends Action
{
	public static DENSITY_TYPE:number = 0;
	public static STRENGTH_TYPE:number = 1;
	public static SPEED_TYPE:number = 2;

	private change:number;
	private type:number;

	constructor(p:Part, sliderType:number, deltaVal:number)
	{
		super(p);
		this.type = sliderType;
		this.change = deltaVal;
	}

	public UndoAction():void {
		if (this.type == ChangeSliderAction.DENSITY_TYPE) {
			(this.partAffected as ShapePart).density -= this.change;
		} else if (this.type == ChangeSliderAction.STRENGTH_TYPE && this.partAffected instanceof RevoluteJoint) {
			(this.partAffected as RevoluteJoint).motorStrength -= this.change;
		} else if (this.type == ChangeSliderAction.STRENGTH_TYPE && this.partAffected instanceof PrismaticJoint) {
			(this.partAffected as PrismaticJoint).pistonStrength -= this.change;
		} else if (this.type == ChangeSliderAction.STRENGTH_TYPE && this.partAffected instanceof Thrusters) {
			(this.partAffected as Thrusters).strength -= this.change;
		} else if (this.type == ChangeSliderAction.STRENGTH_TYPE && this.partAffected instanceof Cannon) {
			(this.partAffected as Cannon).strength -= this.change;
		} else if (this.type == ChangeSliderAction.SPEED_TYPE && this.partAffected instanceof RevoluteJoint) {
			(this.partAffected as RevoluteJoint).motorSpeed -= this.change;
		} else {
			(this.partAffected as PrismaticJoint).pistonSpeed -= this.change;
		}
	}

	public RedoAction():void {
		if (this.type == ChangeSliderAction.DENSITY_TYPE) {
			(this.partAffected as ShapePart).density += this.change;
		} else if (this.type == ChangeSliderAction.STRENGTH_TYPE && this.partAffected instanceof RevoluteJoint) {
			(this.partAffected as RevoluteJoint).motorStrength += this.change;
		} else if (this.type == ChangeSliderAction.STRENGTH_TYPE && this.partAffected instanceof PrismaticJoint) {
			(this.partAffected as PrismaticJoint).pistonStrength += this.change;
		} else if (this.type == ChangeSliderAction.STRENGTH_TYPE && this.partAffected instanceof Thrusters) {
			(this.partAffected as Thrusters).strength += this.change;
		} else if (this.type == ChangeSliderAction.STRENGTH_TYPE && this.partAffected instanceof Cannon) {
			(this.partAffected as Cannon).strength += this.change;
		} else if (this.type == ChangeSliderAction.SPEED_TYPE && this.partAffected instanceof RevoluteJoint) {
			(this.partAffected as RevoluteJoint).motorSpeed += this.change;
		} else {
			(this.partAffected as PrismaticJoint).pistonSpeed += this.change;
		}
	}
}
