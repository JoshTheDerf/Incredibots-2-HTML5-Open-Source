import { Action } from "./Action";

export class MultiTerrainAction extends Action
{
	private terrain:boolean;
	private partsAffected:Array<any>;

	constructor(parts:Array<any>, terrainVal:boolean)
	{
		super(parts[0]);
		this.partsAffected = parts;
		this.terrain = terrainVal;
	}

	public UndoAction():void {
		for (var i:number = 0; i < this.partsAffected.length; i++) {
			this.partsAffected[i].terrain = !this.terrain;
		}
	}

	public RedoAction():void {
		for (var i:number = 0; i < this.partsAffected.length; i++) {
			this.partsAffected[i].terrain = this.terrain;
		}
	}
}
