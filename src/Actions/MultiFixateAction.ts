import { Action } from "../imports";

export class MultiFixateAction extends Action
{
	private fixate:boolean;
	private partsAffected:Array<any>;

	constructor(parts:Array<any>, fixateVal:boolean)
	{
		super(parts[0]);
		this.partsAffected = parts;
		this.fixate = fixateVal;
	}

	public UndoAction():void {
		for (var i:number = 0; i < this.partsAffected.length; i++) {
			this.partsAffected[i].isStatic = !this.fixate;
		}
	}

	public RedoAction():void {
		for (var i:number = 0; i < this.partsAffected.length; i++) {
			this.partsAffected[i].isStatic = this.fixate;
		}
	}
}
