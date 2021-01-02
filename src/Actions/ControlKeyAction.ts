import { Cannon } from "../Parts/Cannon";
import { Part } from "../Parts/Part";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { RevoluteJoint } from "../Parts/RevoluteJoint";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import { Action } from "./Action";

export class ControlKeyAction extends Action
{
	public static CW_TYPE:number = 0;
	public static CCW_TYPE:number = 1;
	public static EXPAND_TYPE:number = 2;
	public static CONTRACT_TYPE:number = 3;
	public static TEXT_TYPE:number = 4;
	public static THRUSTERS_TYPE:number = 5;
	public static CANNON_TYPE:number = 6;

	private type:number;
	private oldKey:number;
	private newKey:number;

	constructor(p:Part, keyType:number, oldVal:number, newVal:number)
	{
		super(p);
		this.type = keyType;
		this.oldKey = oldVal;
		this.newKey = newVal;
	}

	public UndoAction():void {
		if (this.type == ControlKeyAction.CW_TYPE) {
			(this.partAffected as RevoluteJoint).motorCWKey = this.oldKey;
		} else if (this.type == ControlKeyAction.CCW_TYPE) {
			(this.partAffected as RevoluteJoint).motorCCWKey = this.oldKey;
		} else if (this.type == ControlKeyAction.EXPAND_TYPE) {
			(this.partAffected as PrismaticJoint).pistonUpKey = this.oldKey;
		} else if (this.type == ControlKeyAction.CONTRACT_TYPE) {
			(this.partAffected as PrismaticJoint).pistonDownKey = this.oldKey;
		} else if (this.type == ControlKeyAction.TEXT_TYPE) {
			(this.partAffected as TextPart).displayKey = this.oldKey;
		} else if (this.type == ControlKeyAction.THRUSTERS_TYPE) {
			(this.partAffected as Thrusters).thrustKey = this.oldKey;
		} else if (this.type == ControlKeyAction.CANNON_TYPE) {
			(this.partAffected as Cannon).fireKey = this.oldKey;
		}
	}

	public RedoAction():void {
		if (this.type == ControlKeyAction.CW_TYPE) {
			(this.partAffected as RevoluteJoint).motorCWKey = this.newKey;
		} else if (this.type == ControlKeyAction.CCW_TYPE) {
			(this.partAffected as RevoluteJoint).motorCCWKey = this.newKey;
		} else if (this.type == ControlKeyAction.EXPAND_TYPE) {
			(this.partAffected as PrismaticJoint).pistonUpKey = this.newKey;
		} else if (this.type == ControlKeyAction.CONTRACT_TYPE) {
			(this.partAffected as PrismaticJoint).pistonDownKey = this.newKey;
		} else if (this.type == ControlKeyAction.TEXT_TYPE) {
			(this.partAffected as TextPart).displayKey = this.newKey;
		} else if (this.type == ControlKeyAction.THRUSTERS_TYPE) {
			(this.partAffected as Thrusters).thrustKey = this.newKey;
		} else if (this.type == ControlKeyAction.CANNON_TYPE) {
			(this.partAffected as Cannon).fireKey = this.oldKey;
		}
	}
}
