import { Action } from "./Action";

export class MultiUndragableAction extends Action
{
	private undragable:boolean;
	private partsAffected:Array<any>;

	constructor(parts:Array<any>, undragableVal:boolean)
	{
		super(parts[0]);
		this.partsAffected = parts;
		this.undragable = undragableVal;
	}

	public UndoAction():void {
		for (var i:number = 0; i < this.partsAffected.length; i++) {
			this.partsAffected[i].undragable = !this.undragable;
		}
	}

	public RedoAction():void {
		for (var i:number = 0; i < this.partsAffected.length; i++) {
			this.partsAffected[i].undragable = this.undragable;
		}
	}
}
