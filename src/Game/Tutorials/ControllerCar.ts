import { b2AABB } from "../../Box2D";
import { Text, TextStyle } from 'pixi.js'
import { Circle, ControllerGameGlobals, ControllerTutorial, FixedJoint, Main, Part, Rectangle, RevoluteJoint, ShapePart, Triangle } from "../../imports";

export class ControllerCar extends ControllerTutorial
{
	private controlText:Text;
	private madeFirstJoint:boolean = false;
	private madeSecondJoint:boolean = false;
	private hitPlay:boolean = false;
	private hitSnapToCenter:boolean = false;
	private enabledMotors:boolean = false;

	constructor()
	{
		super()
		this.draw.m_drawXOff = 360;
		this.draw.m_drawYOff = -220;
		this.partsFit = false;

		// start platform
		this.sGround3.lineStyle(6, 0x9D8941);
		this.sGround3.beginFill(0xCEB456);
		this.sGround3.drawRect(6598, 1610, 650, 56);
		this.sGround3.endFill();

		ControllerGameGlobals.snapToCenter = true;

		var p:Part = new Triangle(-2.5, 10.1, 3, 10.1, -2.5, 8);
		p.isEditable = false;
		(p as ShapePart).red = 220;
		(p as ShapePart).green = 220;
		(p as ShapePart).blue = 60;
		p.drawAnyway = false;
		this.allParts.push(p);
		// FIXME: Adding the fixed joint causes the triangle to jump above the ground. Not sure why.
		// p = new FixedJoint(this.allParts[this.allParts.length - 1], this.allParts[this.allParts.length - 4], -1, 10);
		// p.isEditable = false;
		// p.drawAnyway = false;
		// this.allParts.push(p);

		if (!ControllerGameGlobals.playingReplay) this.LoadParts();

		this.controlText = new Text('');
		this.controlText.x = 400;
		this.controlText.y = 102;
		this.controlText.text = "Use the left/right arrow keys to control the car.  Jump into the pit on the left to finish this level!";
		this.controlText.visible = false;
		this.controlText.anchor.set(0.5);
		var format:TextStyle = new TextStyle();
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 14;
		format.leading = 1;
		this.controlText.style = format;
		this.addChild(this.controlText);
	}

	private LoadParts():void {
		var p:Part = new Rectangle(20, 8, 3, 1);
		(p as ShapePart).blue = 40;
		(p as ShapePart).green = 50;
		(p as ShapePart).red = 245;
		this.allParts.push(p);
		p = new Circle(20.5, 8.5, 0.7);
		(p as ShapePart).blue = 80;
		(p as ShapePart).green = 80;
		(p as ShapePart).red = 80;
		this.allParts.push(p);
		p = new Circle(22.5, 8.5, 0.7);
		(p as ShapePart).blue = 80;
		(p as ShapePart).green = 80;
		(p as ShapePart).red = 80;
		this.allParts.push(p);
	}

	public Init(e:Event):void {
		super.Init(e);
		if (!ControllerGameGlobals.viewingUnsavedReplay) this.ShowTutorialDialog(8, true);
	}

	public CloseTutorialDialog(num:number):void {
		if (num == 8) {
			this.ShowTutorialDialog(9);
		} else {
			super.CloseTutorialDialog(num);
		}
	}

	public Update():void {
		super.Update();
		if (!ControllerGameGlobals.viewingUnsavedReplay) this.controlText.visible = !this.paused;
		this.m_sidePanel.DisableStuffForCarLevel();
		if (!ControllerGameGlobals.playingReplay) {
			if (!this.madeFirstJoint && this.allParts[this.allParts.length - 1] instanceof RevoluteJoint) {
				this.madeFirstJoint = true;
				this.ShowTutorialDialog(10);
			}
			if (!this.madeSecondJoint && this.allParts[this.allParts.length - 1] instanceof RevoluteJoint && this.allParts[this.allParts.length - 2] instanceof RevoluteJoint) {
				this.madeSecondJoint = true;
				this.ShowTutorialDialog(12);
			}
			if (!this.enabledMotors && this.allParts[this.allParts.length - 1] instanceof RevoluteJoint && this.allParts[this.allParts.length - 2] instanceof RevoluteJoint && this.allParts[this.allParts.length - 1].enableMotor && this.allParts[this.allParts.length - 2].enableMotor) {
				this.enabledMotors = true;
				this.ShowTutorialDialog(13);
			}
		}
	}

	public centerBox():void {
		super.centerBox();
		if (this.madeFirstJoint && !this.hitSnapToCenter) {
			this.hitSnapToCenter = true;
			this.ShowTutorialDialog(11);
		}
	}

	public HideDialog():void {
		super.HideDialog();
		if (!this.hitPlay && this.m_progressDialog.GetMessage().search("You must fit your robot") != -1) {
			this.hitPlay = true;
			this.ShowTutorialDialog(14, false);
		}
	}

	private ShowTutorialDialog(num:number, moreButton:boolean = false):void {
		this.ShowTutorialWindow(num, this.World2ScreenX(15), this.World2ScreenY(-1), moreButton);
	}

	protected ChallengeOver():boolean {
		if (this.simStarted) {
			for (var i:number = 0; i < this.allParts.length; i++) {
				if (this.allParts[i].isEditable && this.allParts[i] instanceof ShapePart && this.allParts[i].GetBody().GetWorldCenter().x < -7 && this.allParts[i].GetBody().GetWorldCenter().y > 12) {
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
		area.lowerBound.Set(26, 2);
		area.upperBound.Set(36, 9.42);
		return area;
	}

	public circleButton():void {
		this.ShowDisabledDialog();
	}

	public rectButton():void {
		this.ShowDisabledDialog();
	}

	public triangleButton():void {
		this.ShowDisabledDialog();
	}

	public fjButton():void {
		this.ShowDisabledDialog();
	}

	public pjButton():void {
		this.ShowDisabledDialog();
	}

	public textButton():void {
		this.ShowDisabledDialog();
	}

	public deleteButton():void {
		if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof RevoluteJoint) {
			super.deleteButton();
		} else {
			this.ShowDisabledDialog();
		}
	}

	public multiDeleteButton():void {
		this.ShowDisabledDialog();
	}

	public cutButton():void {
		this.ShowDisabledDialog();
	}

	public copyButton():void {
		this.ShowDisabledDialog();
	}

	public pasteButton():void {
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
