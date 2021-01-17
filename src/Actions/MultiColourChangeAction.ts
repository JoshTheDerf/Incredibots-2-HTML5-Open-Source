import { TextPart } from "../imports";
import { Action } from "../imports";

export class MultiColourChangeAction extends Action
{
	private partsAffected:Array<any>;
	private red:number;
	private green:number;
	private blue:number;
	private opacity:number;
	private oldReds:Array<any>;
	private oldGreens:Array<any>;
	private oldBlues:Array<any>;
	private oldOpacitys:Array<any>;

	constructor(parts:Array<any>, r:number, g:number, b:number, o:number, oldRs:Array<any>, oldGs:Array<any>, oldBs:Array<any>, oldOs:Array<any>)
	{
		super(parts[0]);
		this.partsAffected = parts;
		this.red = r;
		this.green = g;
		this.blue = b;
		this.opacity = o;
		this.oldReds = oldRs;
		this.oldGreens = oldGs;
		this.oldBlues = oldBs;
		this.oldOpacitys = oldOs;
	}

	public UndoAction():void {
		for (var i:number = 0; i < this.partsAffected.length; i++) {
			this.partsAffected[i].red = this.oldReds[i];
			this.partsAffected[i].green = this.oldGreens[i];
			this.partsAffected[i].blue = this.oldBlues[i];
			if (!(this.partsAffected[i] instanceof TextPart)) this.partsAffected[i].opacity = this.oldOpacitys[i];
		}
	}

	public RedoAction():void {
		for (var i:number = 0; i < this.partsAffected.length; i++) {
			this.partsAffected[i].red = this.red;
			this.partsAffected[i].green = this.green;
			this.partsAffected[i].blue = this.blue;
			if (!(this.partsAffected[i] instanceof TextPart)) this.partsAffected[i].opacity = this.opacity;
		}
	}
}
