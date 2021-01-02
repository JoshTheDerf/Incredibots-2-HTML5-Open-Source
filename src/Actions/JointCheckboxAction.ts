import { Part } from "../Parts/Part";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { RevoluteJoint } from "../Parts/RevoluteJoint";
import { Thrusters } from "../Parts/Thrusters";
import { Action } from "./Action";

export class JointCheckboxAction extends Action
{
	public static ENABLE_TYPE:number = 0;
	public static RIGID_TYPE:number = 1;
	public static AUTO_CW_TYPE:number = 2;
	public static AUTO_CCW_TYPE:number = 3;
	public static AUTO_OSCILLATE_TYPE:number = 4;
	public static AUTO_ON_TYPE:number = 5;

	private type:number;
	private isChecked:boolean;
	private sideEffect:boolean;

	constructor(p:Part, checkboxType:number, checked:boolean, effect:boolean = false)
	{
		super(p);
		this.type = checkboxType;
		this.isChecked = checked;
		this.sideEffect = effect;
	}

	public UndoAction():void {
		if (this.type == JointCheckboxAction.ENABLE_TYPE && this.partAffected instanceof RevoluteJoint) {
			(this.partAffected as RevoluteJoint).enableMotor = !this.isChecked;
		} else if (this.type == JointCheckboxAction.ENABLE_TYPE && this.partAffected instanceof PrismaticJoint) {
			(this.partAffected as PrismaticJoint).enablePiston = !this.isChecked;
		} else if (this.type == JointCheckboxAction.RIGID_TYPE && this.partAffected instanceof RevoluteJoint) {
			(this.partAffected as RevoluteJoint).isStiff = this.isChecked;
		} else if (this.type == JointCheckboxAction.RIGID_TYPE && this.partAffected instanceof PrismaticJoint) {
			(this.partAffected as PrismaticJoint).isStiff = this.isChecked;
		} else if (this.type == JointCheckboxAction.AUTO_CW_TYPE) {
			(this.partAffected as RevoluteJoint).autoCW = !this.isChecked;
			if (this.sideEffect) (this.partAffected as RevoluteJoint).autoCCW = this.isChecked;
		} else if (this.type == JointCheckboxAction.AUTO_CCW_TYPE) {
			(this.partAffected as RevoluteJoint).autoCCW = !this.isChecked;
			if (this.sideEffect) (this.partAffected as RevoluteJoint).autoCW = this.isChecked;
		} else if (this.type == JointCheckboxAction.AUTO_ON_TYPE) {
			(this.partAffected as Thrusters).autoOn = !this.isChecked;
		} else {
			(this.partAffected as PrismaticJoint).autoOscillate = !this.isChecked;
		}
	}

	public RedoAction():void {
		if (this.type == JointCheckboxAction.ENABLE_TYPE && this.partAffected instanceof RevoluteJoint) {
			(this.partAffected as RevoluteJoint).enableMotor = this.isChecked;
		} else if (this.type == JointCheckboxAction.ENABLE_TYPE && this.partAffected instanceof PrismaticJoint) {
			(this.partAffected as PrismaticJoint).enablePiston = this.isChecked;
		} else if (this.type == JointCheckboxAction.RIGID_TYPE && this.partAffected instanceof RevoluteJoint) {
			(this.partAffected as RevoluteJoint).isStiff = !this.isChecked;
		} else if (this.type == JointCheckboxAction.RIGID_TYPE && this.partAffected instanceof PrismaticJoint) {
			(this.partAffected as PrismaticJoint).isStiff = !this.isChecked;
		} else if (this.type == JointCheckboxAction.AUTO_CW_TYPE) {
			(this.partAffected as RevoluteJoint).autoCW = this.isChecked;
			if (this.sideEffect) (this.partAffected as RevoluteJoint).autoCCW = !this.isChecked;
		} else if (this.type == JointCheckboxAction.AUTO_CCW_TYPE) {
			(this.partAffected as RevoluteJoint).autoCCW = this.isChecked;
			if (this.sideEffect) (this.partAffected as RevoluteJoint).autoCW = !this.isChecked;
		} else if (this.type == JointCheckboxAction.AUTO_ON_TYPE) {
			(this.partAffected as Thrusters).autoOn = this.isChecked;
		} else {
			(this.partAffected as PrismaticJoint).autoOscillate = this.isChecked;
		}
	}
}
