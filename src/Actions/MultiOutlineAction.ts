import { Action } from "./Action";

export class MultiOutlineAction extends Action
{
	private outline:boolean;
	private partsAffected:Array<any>;

	constructor(parts:Array<any>, outlineVal:boolean)
	{
		super(parts[0]);
		this.partsAffected = parts;
		this.outline = outlineVal;
	}

	public UndoAction():void {
		for (var i:number = 0; i < this.partsAffected.length; i++) {
			this.partsAffected[i].outline = !this.outline;
		}
	}

	public RedoAction():void {
		for (var i:number = 0; i < this.partsAffected.length; i++) {
			this.partsAffected[i].outline = this.outline;
		}
	}
}
