import { Challenge } from "./Challenge";
import { SandboxSettings } from "./SandboxSettings";

export class Robot
{
	public allParts:Array<any>;
	public settings:SandboxSettings = null;
	public challenge:Challenge = null;

	public cameraX:number = Number.MAX_VALUE;
	public cameraY:number = Number.MAX_VALUE;
	public zoomLevel:number = Number.MAX_VALUE;

	constructor(parts:Array<any>, s:SandboxSettings = null, x:number = Number.MAX_VALUE, y:number = Number.MAX_VALUE, zoom:number = Number.MAX_VALUE)
	{
		this.allParts = parts;
		this.settings = s;
		this.cameraX = x;
		this.cameraY = y;
		this.zoomLevel = zoom;
	}
}
