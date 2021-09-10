import { b2AABB } from "../../Box2D";
import { Text, TextStyle } from "pixi.js";
import { Circle, ControllerGameGlobals, ControllerTutorial, FixedJoint, Main, Part, Rectangle, RevoluteJoint, ShapePart } from "../../imports";

export class ControllerCatapult extends ControllerTutorial
{
	private controlText:Text;
	private motor:RevoluteJoint;
	private ball:ShapePart;

	private limitedMotor:boolean = false;
	private limitedMotor2:boolean = false;
	private focusedBall:boolean = false;

	constructor()
	{
		super()
		this.draw.m_drawXOff = -1880;
		this.draw.m_drawYOff = -220;

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
		this.controlText.text = "Use the left/right arrow keys to rotate the catapult's arm. Try to launch the ball into the pit to the right.\nWhen finished, click \"Stop Simulation\" to continue the tutorial.";
		this.controlText.visible = false;
		var format:TextStyle = new TextStyle();
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 14;
		format.leading = 1;
		this.controlText.style = format;
		this.addChild(this.controlText);
	}

	private LoadParts():void {
		var p:Part = new Rectangle(-57, 3.9, 5, 3);
		(p as ShapePart).red = 160;
		(p as ShapePart).green = 120;
		(p as ShapePart).blue = 70;
		this.allParts.push(p);
		p = new Rectangle(-60, 4.9, 4, 0.2);
		(p as ShapePart).red = 160;
		(p as ShapePart).green = 120;
		(p as ShapePart).blue = 70;
		this.allParts.push(p);
		p = new Rectangle(-60, 4.7, 0.1, 0.4);
		(p as ShapePart).red = 160;
		(p as ShapePart).green = 120;
		(p as ShapePart).blue = 70;
		this.allParts.push(p);
		p = new Rectangle(-59.5, 4.7, 0.1, 0.4);
		(p as ShapePart).red = 160;
		(p as ShapePart).green = 120;
		(p as ShapePart).blue = 70;
		this.allParts.push(p);
		p = new FixedJoint(this.allParts[this.allParts.length - 3], this.allParts[this.allParts.length - 2], -59.95, 5);
		this.allParts.push(p);
		p = new FixedJoint(this.allParts[this.allParts.length - 4], this.allParts[this.allParts.length - 2], -59.45, 5);
		this.allParts.push(p);
		this.motor = new RevoluteJoint(this.allParts[this.allParts.length - 6], this.allParts[this.allParts.length - 5], -56.5, 5);
		this.motor.enableMotor = true;
		this.motor.motorSpeed = 10;
		this.motor.motorStrength = 10;
		this.allParts.push(this.motor);
		this.ball = new Circle(-59.7, 4.8, 0.1);
		this.ball.red = 100;
		this.ball.green = 255;
		this.ball.blue = 40;
		this.allParts.push(this.ball);
	}

	public Init(e:Event):void {
		super.Init(e);
		if (!ControllerGameGlobals.viewingUnsavedReplay) this.ShowTutorialDialog(32, true);
	}

	public CloseTutorialDialog(num:number):void {
		if (num == 32) {
			this.ShowTutorialDialog(33, true);
		} else if (num == 33) {
			this.ShowTutorialDialog(34);
		} else {
			super.CloseTutorialDialog(num);
		}
	}

	public Update():void {
		super.Update();
		if (!ControllerGameGlobals.viewingUnsavedReplay) this.controlText.visible = !this.paused;
		this.m_sidePanel.DisableStuffForCatapultLevel();
		if (!ControllerGameGlobals.playingReplay) {
			if (!this.limitedMotor && this.motor.motorLowerLimit == -10) {
				this.limitedMotor = true;
				this.ShowTutorialDialog(35);
			}
			if (this.limitedMotor && !this.limitedMotor2 && this.motor.motorUpperLimit == 50) {
				this.limitedMotor2 = true;
				this.ShowTutorialDialog(36);
			}
		}
	}

	public resetButton(rateRobot:boolean = true):void {
		super.resetButton(rateRobot);
		if (this.limitedMotor2 && !this.focusedBall) {
			this.controlText.text = "Use the left/right arrow keys to rotate the catapult's arm. Try to launch the ball into the pit to the right.";
			var format:TextStyle = new TextStyle();
			format.align = 'center';
			format.fontFamily = Main.GLOBAL_FONT;
			format.fontSize = 13;
			format.leading = 1;
			this.controlText.style = format;
			this.focusedBall = true;
			this.ShowTutorialDialog(37);
		}
	}

	private ShowTutorialDialog(num:number, moreButton:boolean = false):void {
		this.ShowTutorialWindow(num, this.World2ScreenX(-48), this.World2ScreenY(-1), moreButton);
	}

	protected ChallengeOver():boolean {
		if (this.simStarted) {
			return (this.focusedBall && this.ball.GetBody().GetWorldCenter().x > -15 && this.ball.GetBody().GetWorldCenter().x < -3 && this.ball.GetBody().GetWorldCenter().y > 12.5);
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

	public textButton():void {
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
}
