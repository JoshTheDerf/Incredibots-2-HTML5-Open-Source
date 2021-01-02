import { Part } from "../Parts/Part";
import { RevoluteJoint } from "../Parts/RevoluteJoint";
import { Action } from "./Action";

export class LimitChangeAction extends Action
{
	public static MIN_TYPE:number = 0;
	public static MAX_TYPE:number = 1;

	private type:number;
	private oldLimit:number;
	private newLimit:number;

	constructor(p:Part, limitType:number, oldVal:number, newVal:number)
	{
		super(p);
		this.type = limitType;
		this.oldLimit = oldVal;
		this.newLimit = newVal;
	}

	public UndoAction():void {
		if (this.type == LimitChangeAction.MIN_TYPE) {
			(this.partAffected as RevoluteJoint).motorLowerLimit = this.oldLimit;
		} else {
			(this.partAffected as RevoluteJoint).motorUpperLimit = this.oldLimit;
		}
	}

	public RedoAction():void {
		if (this.type == LimitChangeAction.MIN_TYPE) {
			(this.partAffected as RevoluteJoint).motorLowerLimit = this.newLimit;
		} else {
			(this.partAffected as RevoluteJoint).motorUpperLimit = this.newLimit;
		}
	}
}
