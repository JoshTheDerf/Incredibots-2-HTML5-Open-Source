import { Action } from "./Action";

export class MultiCollideAction extends Action
{
	private collide:boolean;
	private partsAffected:Array<any>;

	constructor(parts:Array<any>, collideVal:boolean)
	{
		super(parts[0]);
		this.partsAffected = parts;
		this.collide = collideVal;
	}

	public UndoAction():void {
		for (var i:number = 0; i < this.partsAffected.length; i++) {
			this.partsAffected[i].collide = !this.collide;
		}
	}

	public RedoAction():void {
		for (var i:number = 0; i < this.partsAffected.length; i++) {
			this.partsAffected[i].collide = this.collide;
		}
	}
}
