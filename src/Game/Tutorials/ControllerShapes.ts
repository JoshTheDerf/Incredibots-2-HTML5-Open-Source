import { b2AABB } from "../../Box2D";
import { Rectangle, Circle } from "pixi.js";
import { ControllerGameGlobals, Triangle } from "../../imports";
import { ControllerTutorial } from "./ControllerTutorial";

export class ControllerShapes extends ControllerTutorial
{
	private madeTriangle:boolean = false;
	private madeRectangle:boolean = false;
	private madeCircle:boolean = false;

	constructor()
	{
		super();
		this.draw.m_drawXOff = -950;
		this.draw.m_drawYOff = -180;
	}

	public Init(e:Event):void {
		super.Init(e);
		if (!ControllerGameGlobals.viewingUnsavedReplay) this.ShowTutorialDialog(4, false);
	}

	public Update():void {
		super.Update();
		this.m_sidePanel.DisableStuffForShapesLevel();
		if (!ControllerGameGlobals.playingReplay) {
			if (!this.madeRectangle && this.allParts[this.allParts.length - 1] instanceof Rectangle && this.allParts[this.allParts.length - 1].isEditable) {
				this.madeRectangle = true;
				this.ShowTutorialDialog(5);
			}
			if (this.madeRectangle && !this.madeTriangle && this.allParts[this.allParts.length - 1] instanceof Triangle && this.allParts[this.allParts.length - 1].isEditable) {
				this.madeTriangle = true;
				this.ShowTutorialDialog(6);
			}
			if (this.madeRectangle && this.madeTriangle && !this.madeCircle && this.allParts[this.allParts.length - 1] instanceof Circle && this.allParts[this.allParts.length - 1].isEditable) {
				this.madeCircle = true;
				this.ShowTutorialDialog(7);
			}
		}
	}

	private ShowTutorialDialog(num:number, moreButton:boolean = false):void {
		this.ShowTutorialWindow(num, this.World2ScreenX(-14), this.World2ScreenY(1), moreButton);
	}

	protected ChallengeOver():boolean {
		if (this.simStarted) {
			for (var i:number = 0; i < this.allParts.length; i++) {
				if (this.allParts[i].isEditable && this.allParts[i] instanceof Circle && this.allParts[i].GetBody().GetWorldCenter().x > -15 && this.allParts[i].GetBody().GetWorldCenter().x < -3 && this.allParts[i].GetBody().GetWorldCenter().y > 10) {
					return true;
				}
			}
			return false;
		} else {
			return false;
		}
	}

	protected GetBuildingArea():b2AABB {
		var area:b2AABB = new b2AABB();
		area.lowerBound.Set(-29, -1);
		area.upperBound.Set(-16, 9.5);
		return area;
	}

	public fjButton():void {
		this.ShowDisabledDialog();
	}

	public rjButton():void {
		this.ShowDisabledDialog();
	}

	public pjButton():void {
		this.ShowDisabledDialog();
	}

	public textButton():void {
		this.ShowDisabledDialog();
	}

	public rotateButton():void {
		this.ShowDisabledDialog();
	}

	public saveButton():void {
		this.ShowDisabledDialog();
	}

	public loadButton(makeThemRate:boolean = true):void {
		this.ShowDisabledDialog();
	}

	public saveReplayButton():void {
		this.ShowDisabledDialog();
		if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
	}

	public loadRobotButton(makeThemRate:boolean = true):void {
		this.ShowDisabledDialog();
	}

	public loadReplayButton(makeThemRate:boolean = true):void {
		this.ShowDisabledDialog();
	}

	public loadChallengeButton(makeThemRate:boolean = true):void {
		this.ShowDisabledDialog();
	}

	public commentButton(robotID:String = "", robotPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public linkButton(robotID:String = "", robotPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public embedButton(robotID:String = "", robotPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public commentReplayButton(replayID:String = "", replayPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public linkReplayButton(replayID:String = "", replayPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public embedReplayButton(replayID:String = "", replayPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}
}
