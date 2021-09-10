import { b2AABB, b2Vec2 } from "../../Box2D";
import { Text, TextStyle } from 'pixi.js'
import { Circle, ControllerGameGlobals, ControllerTutorial, Main, Part, PrismaticJoint, Rectangle, RevoluteJoint, ShapePart, Triangle } from "../../imports";

export class ControllerJumpbot extends ControllerTutorial
{
	private madePiston:boolean = false;
	private enabledPiston:boolean = false;
	private hitReset:boolean = false;
	private increasedPower:boolean = false;
	private decreasedDensity:boolean = false;
	private controlText:Text;

	private carBody:ShapePart;

	constructor()
	{
		super()
		this.draw.m_drawXOff = -1880;
		this.draw.m_drawYOff = -220;

		ControllerGameGlobals.snapToCenter = true;

		// start platform
		this.sGround1.lineStyle(6, 0x9D8941);
		this.sGround1.beginFill(0xCEB456);
		this.sGround1.drawRect(1045, 1452, 681, 56);
		this.sGround1.endFill();

		if (!ControllerGameGlobals.playingReplay) this.LoadParts();

		this.controlText = new Text('');
		this.controlText.x = 400;
		this.controlText.y = 102;
		this.controlText.anchor.set(0.5, 0);
		this.controlText.text = "Use the left/right arrow keys to rotate the wheels. Control the sliding joint with the up/down arrow keys.\nTry to jump the gap to the right and fall into the pit.";
		this.controlText.visible = false;
		var format = new TextStyle();
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 14;
		format.leading = 1;
		this.controlText.style = format;
		this.addChild(this.controlText);
	}

	private LoadParts():void {
		this.carBody = new Rectangle(-58.25, 5, 3.5, 1);
		this.carBody.blue = 40;
		this.carBody.green = 50;
		this.carBody.red = 245;
		this.allParts.push(this.carBody);
		var p:Part = new Circle(-58, 5.9, 1);
		(p as ShapePart).blue = 80;
		(p as ShapePart).green = 80;
		(p as ShapePart).red = 80;
		(p as ShapePart).density = 1;
		this.allParts.push(p);
		p = new Circle(-55, 5.9, 1);
		(p as ShapePart).blue = 80;
		(p as ShapePart).green = 80;
		(p as ShapePart).red = 80;
		(p as ShapePart).density = 1;
		this.allParts.push(p);
		p = new RevoluteJoint(this.allParts[this.allParts.length - 3], this.allParts[this.allParts.length - 2], -58, 5.9);
		(p as RevoluteJoint).enableMotor = true;
		this.allParts.push(p);
		p = new RevoluteJoint(this.allParts[this.allParts.length - 4], this.allParts[this.allParts.length - 2], -55, 5.9);
		(p as RevoluteJoint).enableMotor = true;
		this.allParts.push(p);
		p = new Triangle(-56, 6.8, -57, 6.3, -57, 6.8);
		(p as ShapePart).blue = 150;
		(p as ShapePart).green = 240;
		(p as ShapePart).red = 130;
		this.allParts.push(p);
	}

	public Init(e:Event):void {
		super.Init(e);
		if (!ControllerGameGlobals.viewingUnsavedReplay) this.ShowTutorialDialog(15);
	}

	public Update():void {
		super.Update();
		if (!ControllerGameGlobals.viewingUnsavedReplay) this.controlText.visible = !this.paused;
		this.m_sidePanel.DisableStuffForJumpbotLevel();
		if (!ControllerGameGlobals.playingReplay) {
			if (!this.madePiston && this.allParts[this.allParts.length - 1] instanceof PrismaticJoint) {
				this.madePiston = true;
				this.ShowTutorialDialog(16);
			}
			if (!this.enabledPiston && this.allParts[this.allParts.length - 1] instanceof PrismaticJoint && this.allParts[this.allParts.length - 1].enablePiston) {
				this.enabledPiston = true;
				this.ShowTutorialDialog(17);
			}
			if (this.hitReset && !this.increasedPower && this.allParts[this.allParts.length - 1] instanceof PrismaticJoint && this.allParts[this.allParts.length - 1].pistonStrength > 15 && this.allParts[this.allParts.length - 1].pistonSpeed > 15) {
				this.increasedPower = true;
				this.ShowTutorialDialog(19);
			}
			if (this.increasedPower && !this.decreasedDensity && this.carBody.density < 15) {
				this.decreasedDensity = true;
				this.ShowTutorialDialog(20);
			}
		}

		if (!this.paused && this.carBody.GetBody().GetWorldCenter().y > 50) {
			this.resetButton();
		}
	}

	public resetButton(rateRobot:boolean = true):void {
		super.resetButton(rateRobot);
		if (this.enabledPiston && !this.hitReset) {
			this.hitReset = true;
			this.ShowTutorialDialog(18);
		}
	}

	private ShowTutorialDialog(num:number, moreButton:boolean = false):void {
		this.ShowTutorialWindow(num, this.World2ScreenX(-48), this.World2ScreenY(-1), moreButton);
	}

	protected ChallengeOver():boolean {
		if (this.simStarted) {
			for (var i:number = 0; i < this.allParts.length; i++) {
				if (this.allParts[i].isEditable && this.allParts[i] instanceof ShapePart && this.allParts[i].GetBody().GetWorldCenter().x > -15 && this.allParts[i].GetBody().GetWorldCenter().x < -3 && this.allParts[i].GetBody().GetWorldCenter().y > 11 && this.allParts[i].GetBody().GetWorldCenter().y < 18) {
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
		area.lowerBound.Set(-61, -1);
		area.upperBound.Set(-50.5, 7);
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

	public rjButton():void {
		this.ShowDisabledDialog();
	}

	public pjButton():void {
		PrismaticJoint.jbTutorial = true;
		super.pjButton();
	}

	public textButton():void {
		this.ShowDisabledDialog();
	}

	public deleteButton():void {
		if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof PrismaticJoint) {
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

	public commentButton(robotID:string = "", robotPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public linkButton(robotID:string = "", robotPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public embedButton(robotID:string = "", robotPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public commentReplayButton(replayID:string = "", replayPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public linkReplayButton(replayID:string = "", replayPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public embedReplayButton(replayID:string = "", replayPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public centerBox():void {
		this.ShowDisabledDialog();
	}

	protected GetGravity() {
		if (this.decreasedDensity) {
			return new b2Vec2(0.0, 12.0);
		} else {
			return new b2Vec2(0.0, 18.0);
		}
	}
}
