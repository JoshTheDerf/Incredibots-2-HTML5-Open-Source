import { Controller } from "./Controller";

export class Replay
{
	public cameraMovements:Array<any>;
	public keyPresses:Array<any>;
	public syncPoints:Array<any>;
	public version:string;
	public numFrames:number;
	public cont:Controller = null;

	public syncPointIndex:number = 0;
	public cameraMovementIndex:number = 0;
	public keyPressIndex:number = 0;

	public constructor(m:Array<any>, s:Array<any>, k:Array<any>, f:number, v:string)
	{
		this.cameraMovements = m;
		this.syncPoints = s;
		this.keyPresses = k;
		this.numFrames = f;
		this.version = v;
	}

	public Update(frame:number):boolean {
		while (this.cameraMovementIndex < this.cameraMovements.length && this.cameraMovements[this.cameraMovementIndex].frame == frame) {
			if (this.cont) this.cont.MoveCameraForReplay(this.cameraMovements[this.cameraMovementIndex]);
			this.cameraMovementIndex++;
		}
		if (this.syncPointIndex < this.syncPoints.length) {
			if (frame >= this.syncPoints[this.syncPointIndex].frame) {
				var syncPoint:Object = this.syncPoints[this.syncPointIndex];
				if (this.cont) this.cont.SyncReplay(syncPoint);
				this.syncPointIndex++;
			} else {
				var syncPoint1:Object = this.syncPoints[this.syncPointIndex - 1];
				var syncPoint2:Object = this.syncPoints[this.syncPointIndex];
				if (this.cont) this.cont.SyncReplay2(syncPoint1, syncPoint2);
			}
		}
		while (this.keyPressIndex < this.keyPresses.length && this.keyPresses[this.keyPressIndex].frame == frame) {
			if (this.cont) this.cont.keyInput(this.keyPresses[this.keyPressIndex].key, true);
			this.keyPressIndex++;
		}
		return frame >= this.numFrames;
	}
}
