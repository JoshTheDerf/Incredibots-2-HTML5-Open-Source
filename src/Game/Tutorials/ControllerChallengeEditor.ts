import { b2Contact } from "../Box2D";
import { ShapePart, JointPart, Thrusters, RevoluteJoint, Rectangle, Circle, Triangle, FixedJoint, TextPart, LSOManager, ScoreWindow, ControllerChallenge, ControllerGameGlobals } from "../../imports";

export class ControllerChallengeEditor extends ControllerChallenge
{
	private clickedBuildBox:boolean = false;
	private builtBuildBox:boolean = false;
	private clickedConditions:boolean = false;
	private addingCondition:boolean = false;
	private addedWinCondition:boolean = false;
	private addingLossCondition1:boolean = false;
	private addedLossCondition1:boolean = false;
	private addingLossCondition2:boolean = false;
	private addedLossCondition2:boolean = false;
	private clickedRestrictions:boolean = false;
	private excludedStuff:boolean = false;
	private disallowedControl:boolean = false;

	private wheel1:ShapePart;
	private wheel2:ShapePart;
	private garage:ShapePart;
	private balloonJoint1:JointPart;
	private balloonJoint2:JointPart;
	private balloonJoint3:JointPart;
	private th1:Thrusters;
	private th2:Thrusters;
	private th3:Thrusters;

	private balloonTime:number = -1;

	constructor()
	{
		super()
		if (!ControllerGameGlobals.playingReplay) this.LoadParts();
		ControllerChallengeEditor.playChallengeMode = false;
		ControllerChallengeEditor.playOnlyMode = false;
	}

	private LoadParts():void {
		this.draw.m_drawXOff = -480;
		this.draw.m_drawYOff = -200;
		this.m_physScale = 16.875;

		var p:ShapePart = new Rectangle(-30, 10, 20, 5, false);
		p.isStatic = true;
		p.red = 100;
		p.green = 210;
		p.blue = 80;
		this.allParts.push(p);
		p = new Rectangle(5, 10, 30, 5, false);
		p.isStatic = true;
		p.red = 100;
		p.green = 210;
		p.blue = 80;
		this.allParts.push(p);

		p = new Rectangle(20, 6, 4, 4.1);
		p.blue = 200;
		p.green = 200;
		p.red = 200;
		p.collide = false;
		p.isStatic = true;
		p.terrain = true;
		this.allParts.push(p);
		p = new Rectangle(21, 7, 3, 3.1);
		p.blue = 30;
		p.green = 30;
		p.red = 30;
		p.collide = false;
		p.isStatic = true;
		this.allParts.push(p);

		var car:ShapePart = new Rectangle(-25, 8.8, 3, 1);
		car.isCameraFocus = true;
		car.blue = 40;
		car.green = 50;
		car.red = 245;
		this.allParts.push(car);
		this.wheel1 = new Circle(-24.5, 9.3, 0.7);
		this.wheel1.blue = 80;
		this.wheel1.green = 80;
		this.wheel1.red = 80;
		this.allParts.push(this.wheel1);
		this.wheel2 = new Circle(-22.5, 9.3, 0.7);
		this.wheel2.blue = 80;
		this.wheel2.green = 80;
		this.wheel2.red = 80;
		this.allParts.push(this.wheel2);

		var j:RevoluteJoint = new RevoluteJoint(car, this.wheel1, -24.5, 9.3);
		j.enableMotor = true;
		this.allParts.push(j);
		j = new RevoluteJoint(car, this.wheel2, -22.5, 9.3);
		j.enableMotor = true;
		this.allParts.push(j);

		p = new Rectangle(24, 6, 6, 4.1);
		p.blue = 200;
		p.green = 200;
		p.red = 200;
		p.collide = false;
		p.isStatic = true;
		p.terrain = true;
		this.allParts.push(p);
		this.garage = new Rectangle(29.95, 7, 0.2, 4.1);
		this.garage.opacity = 0;
		this.garage.outline = false;
		this.garage.isStatic = true;
		this.allParts.push(this.garage);

		p = new Rectangle(24.65, 7.5, 0.8, 0.8);
		p.blue = 200;
		p.green = 100;
		p.red = 20;
		p.collide = false;
		p.isStatic = true;
		p.outline = false;
		this.allParts.push(p);
		p = new Rectangle(25.95, 7.5, 0.8, 0.8);
		p.blue = 200;
		p.green = 100;
		p.red = 20;
		p.collide = false;
		p.isStatic = true;
		p.outline = false;
		this.allParts.push(p);
		p = new Rectangle(27.25, 7.5, 0.8, 0.8);
		p.blue = 200;
		p.green = 100;
		p.red = 20;
		p.collide = false;
		p.isStatic = true;
		p.outline = false;
		this.allParts.push(p);
		p = new Rectangle(28.55, 7.5, 0.8, 0.8);
		p.blue = 200;
		p.green = 100;
		p.red = 20;
		p.collide = false;
		p.isStatic = true;
		p.outline = false;
		this.allParts.push(p);

		p = new Rectangle(31.2, 7.9, 0.1, 0.6);
		p.blue = 230;
		p.green = 230;
		p.red = 230;
		this.allParts.push(p);
		p = new Rectangle(31.2, 8.4, 0.1, 0.6);
		p.blue = 230;
		p.green = 230;
		p.red = 230;
		this.allParts.push(p);
		p = new Rectangle(31.2, 8.9, 0.1, 0.6);
		p.blue = 230;
		p.green = 230;
		p.red = 230;
		this.allParts.push(p);
		p = new Rectangle(31.2, 9.4, 0.1, 0.61);
		p.blue = 230;
		p.green = 230;
		p.red = 230;
		this.allParts.push(p);

		p = new Rectangle(32.7, 7.9, 0.1, 0.6);
		p.blue = 230;
		p.green = 230;
		p.red = 230;
		this.allParts.push(p);
		p = new Rectangle(32.7, 8.4, 0.1, 0.6);
		p.blue = 230;
		p.green = 230;
		p.red = 230;
		this.allParts.push(p);
		p = new Rectangle(32.7, 8.9, 0.1, 0.6);
		p.blue = 230;
		p.green = 230;
		p.red = 230;
		this.allParts.push(p);
		p = new Rectangle(32.7, 9.4, 0.1, 0.61);
		p.blue = 230;
		p.green = 230;
		p.red = 230;
		this.allParts.push(p);

		p = new Rectangle(34.2, 7.9, 0.1, 0.6);
		p.blue = 230;
		p.green = 230;
		p.red = 230;
		this.allParts.push(p);
		p = new Rectangle(34.2, 8.4, 0.1, 0.6);
		p.blue = 230;
		p.green = 230;
		p.red = 230;
		this.allParts.push(p);
		p = new Rectangle(34.2, 8.9, 0.1, 0.6);
		p.blue = 230;
		p.green = 230;
		p.red = 230;
		this.allParts.push(p);
		p = new Rectangle(34.2, 9.4, 0.1, 0.61);
		p.blue = 230;
		p.green = 230;
		p.red = 230;
		this.allParts.push(p);

		p = new Triangle(31, 8, 31.5, 8, 31.25, 7.7);
		p.blue = 80;
		p.green = 230;
		p.red = 230;
		p.density = 1;
		this.allParts.push(p);
		p = new Triangle(32.5, 8, 33, 8, 32.75, 7.7);
		p.blue = 80;
		p.green = 230;
		p.red = 80;
		p.density = 1;
		this.allParts.push(p);
		p = new Triangle(34, 8, 34.5, 8, 34.25, 7.7);
		p.blue = 80;
		p.green = 80;
		p.red = 230;
		p.density = 1;
		this.allParts.push(p);
		p = new Circle(31.25, 7.2, 0.7);
		p.blue = 80;
		p.green = 230;
		p.red = 230;
		p.density = 1;
		p.terrain = true;
		this.allParts.push(p);
		p = new Circle(32.75, 7.2, 0.7);
		p.blue = 80;
		p.green = 230;
		p.red = 80;
		p.density = 1;
		p.terrain = true;
		this.allParts.push(p);
		p = new Circle(34.25, 7.2, 0.7);
		p.blue = 80;
		p.green = 80;
		p.red = 230;
		p.density = 1;
		p.terrain = true;
		this.allParts.push(p);

		var f:FixedJoint = new FixedJoint(this.allParts[this.allParts.length - 6], this.allParts[this.allParts.length - 3], 31.25, 7.8);
		this.allParts.push(f);
		f = new FixedJoint(this.allParts[this.allParts.length - 6], this.allParts[this.allParts.length - 3], 32.75, 7.8);
		this.allParts.push(f);
		f = new FixedJoint(this.allParts[this.allParts.length - 6], this.allParts[this.allParts.length - 3], 34.25, 7.8);
		this.allParts.push(f);

		j = new RevoluteJoint(this.allParts[this.allParts.length - 9], this.allParts[this.allParts.length - 21], 31.25, 7.95);
		this.allParts.push(j);
		j = new RevoluteJoint(this.allParts[this.allParts.length - 22], this.allParts[this.allParts.length - 21], 31.25, 8.45);
		this.allParts.push(j);
		j = new RevoluteJoint(this.allParts[this.allParts.length - 22], this.allParts[this.allParts.length - 21], 31.25, 8.95);
		this.allParts.push(j);
		j = new RevoluteJoint(this.allParts[this.allParts.length - 22], this.allParts[this.allParts.length - 21], 31.25, 9.45);
		this.allParts.push(j);
		this.balloonJoint1 = new RevoluteJoint(this.allParts[this.allParts.length - 22], this.allParts[this.allParts.length - 39], 31.25, 10.005);
		this.allParts.push(this.balloonJoint1);

		j = new RevoluteJoint(this.allParts[this.allParts.length - 13], this.allParts[this.allParts.length - 22], 32.75, 7.95);
		this.allParts.push(j);
		j = new RevoluteJoint(this.allParts[this.allParts.length - 23], this.allParts[this.allParts.length - 22], 32.75, 8.45);
		this.allParts.push(j);
		j = new RevoluteJoint(this.allParts[this.allParts.length - 23], this.allParts[this.allParts.length - 22], 32.75, 8.95);
		this.allParts.push(j);
		j = new RevoluteJoint(this.allParts[this.allParts.length - 23], this.allParts[this.allParts.length - 22], 32.75, 9.45);
		this.allParts.push(j);
		this.balloonJoint2 = new RevoluteJoint(this.allParts[this.allParts.length - 23], this.allParts[this.allParts.length - 44], 32.75, 10.005);
		this.allParts.push(this.balloonJoint2);

		j = new RevoluteJoint(this.allParts[this.allParts.length - 17], this.allParts[this.allParts.length - 23], 34.25, 7.95);
		this.allParts.push(j);
		j = new RevoluteJoint(this.allParts[this.allParts.length - 24], this.allParts[this.allParts.length - 23], 34.25, 8.45);
		this.allParts.push(j);
		j = new RevoluteJoint(this.allParts[this.allParts.length - 24], this.allParts[this.allParts.length - 23], 34.25, 8.95);
		this.allParts.push(j);
		j = new RevoluteJoint(this.allParts[this.allParts.length - 24], this.allParts[this.allParts.length - 23], 34.25, 9.45);
		this.allParts.push(j);
		this.balloonJoint3 = new RevoluteJoint(this.allParts[this.allParts.length - 24], this.allParts[this.allParts.length - 49], 34.25, 10.005);
		this.allParts.push(this.balloonJoint3);

		this.th1 = new Thrusters(this.allParts[this.allParts.length - 21], 31.25, 7.2);
		this.th1.autoOn = true;
		this.th1.strength = 2;
		this.th1.isBalloon = true;
		this.allParts.push(this.th1);
		this.th2 = new Thrusters(this.allParts[this.allParts.length - 21], 32.75, 7.2);
		this.th2.autoOn = true;
		this.th2.strength = 2;
		this.th2.isBalloon = true;
		this.allParts.push(this.th2);
		this.th3 = new Thrusters(this.allParts[this.allParts.length - 21], 34.25, 7.2);
		this.th3.autoOn = true;
		this.th3.strength = 2;
		this.th3.isBalloon = true;
		this.allParts.push(this.th3);
	}

	public Init(e:Event):void {
		super.Init(e);
		var t:TextPart = new TextPart(this, 21.3, 6.2, 3, 1, "GARAGE");
		this.allParts.push(t);
		if (!ControllerGameGlobals.playingReplay) this.ShowTutorialDialog(90, true);
	}

	public CloseTutorialDialog(num:number):void {
		if (num == 90) {
			this.ShowTutorialDialog(91, true);
		} else if (num == 91) {
			this.ShowTutorialDialog(92);
		} else if (num == 97) {
			this.ShowTutorialWindow(98, 0, 160);
		} else if (num == 103) {
			this.ShowTutorialWindow(104, 0, 220);
		} else {
			if (num == 106) {
				LSOManager.SetLevelDone(9);
				this.m_fader.visible = true;
				if (this.m_scoreWindow) {
					try {
						this.removeChild(this.m_scoreWindow);
					} catch (type) {

					}
				}
				this.m_scoreWindow = new ScoreWindow(this, this.GetScore());
				ControllerGameGlobals.winSound.play();
				this.addChild(this.m_scoreWindow);
			}
			super.CloseTutorialDialog(num);
		}
	}

	public Update():void {
		super.Update();
		if (!ControllerGameGlobals.playingReplay) {
			if (!this.clickedBuildBox && this.curAction == ControllerGameGlobals.DRAWING_BUILD_BOX) {
				this.clickedBuildBox = true;
				this.ShowTutorialDialog(93);
			} else if (this.clickedBuildBox && !this.builtBuildBox && this.NumBuildingAreas() == 1) {
				this.builtBuildBox = true;
				this.ShowTutorialDialog(94);
			} else if (this.builtBuildBox && !this.clickedConditions && this.m_conditionsDialog && this.m_conditionsDialog.visible) {
				this.clickedConditions = true;
				this.ShowTutorialWindow(95, 276, 130);
			} else if (this.clickedConditions && !this.addingCondition && !this.m_conditionsDialog.visible && this.curAction == ControllerGameGlobals.SELECTING_SHAPE) {
				this.addingCondition = true;
				this.ShowTutorialDialog(96);
			} else if (this.addingCondition && !this.addedWinCondition && ControllerChallengeEditor.challenge.winConditions.length == 1) {
				this.addedWinCondition = true;
				this.ShowTutorialWindow(97, 0, 160, true);
			} else if (this.addedWinCondition && !this.addingLossCondition1 && !this.m_conditionsDialog.visible && this.curAction == ControllerGameGlobals.DRAWING_HORIZONTAL_LINE) {
				this.addingLossCondition1 = true;
				this.ShowTutorialDialog(99);
			} else if (this.addingLossCondition1 && !this.addedLossCondition1 && ControllerChallengeEditor.challenge.lossConditions.length == 1) {
				this.addedLossCondition1 = true;
				this.ShowTutorialWindow(100, 276, 130);
			} else if (this.addedLossCondition1 && !this.addingLossCondition2 && !this.m_conditionsDialog.visible && this.curAction == ControllerGameGlobals.SELECTING_SHAPE) {
				this.addingLossCondition2 = true;
				this.ShowTutorialDialog(101);
			} else if (this.addingLossCondition2 && !this.addedLossCondition2 && ControllerChallengeEditor.challenge.lossConditions.length == 2) {
				this.addedLossCondition2 = true;
				this.ShowTutorialWindow(102, 276, 130);
			} else if (this.addedLossCondition2 && !this.clickedRestrictions && this.m_restrictionsDialog && this.m_restrictionsDialog.visible) {
				this.clickedRestrictions = true;
				this.ShowTutorialWindow(103, 0, 220, true);
			} else if (this.clickedRestrictions && !this.excludedStuff && this.m_restrictionsDialog.fjBox.selected && this.m_restrictionsDialog.sjBox.selected && this.m_restrictionsDialog.thrustersBox.selected) {
				this.excludedStuff = true;
				this.ShowTutorialWindow(105, 0, 220);
			} else if (this.excludedStuff && !this.disallowedControl && !ControllerChallengeEditor.challenge.botControlAllowed && !this.m_restrictionsDialog.visible) {
				this.disallowedControl = true;
				this.ShowTutorialWindow(106, 276, 180);
			}
		}

		if (!ControllerGameGlobals.playingReplay && this.simStarted && !this.paused) {
			this.balloonTime--;
			if (this.balloonTime == 5) {
				this.m_world.DestroyJoint(this.balloonJoint1.m_joint);
				this.balloonJoint1.m_joint = null;
			} else if (this.balloonTime == 0) {
				this.m_world.DestroyJoint(this.balloonJoint3.m_joint);
				this.balloonJoint3.m_joint = null;
			}
		}
	}

	public ContactAdded(point:b2Contact):void {
		super.ContactAdded(point);

		if ((point.GetFixtureA().GetShape() == this.wheel1.GetShape() && point.GetFixtureB().GetShape() == this.garage.GetShape()) ||
			(point.GetFixtureA().GetShape() == this.wheel2.GetShape() && point.GetFixtureB().GetShape() == this.garage.GetShape()) ||
			(point.GetFixtureB().GetShape() == this.wheel1.GetShape() && point.GetFixtureA().GetShape() == this.garage.GetShape()) ||
			(point.GetFixtureB().GetShape() == this.wheel2.GetShape() && point.GetFixtureA().GetShape() == this.garage.GetShape())) {
				this.m_world.DestroyJoint(this.balloonJoint2.m_joint);
				this.balloonJoint2.m_joint = null;
				this.balloonTime = 10;
			}
	}

	private ShowTutorialDialog(num:number, moreButton:boolean = false):void {
		this.ShowTutorialWindow(num, this.World2ScreenX(-10), this.World2ScreenY(-10), moreButton);
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

	public submitButton():void {
		this.ShowDisabledDialog();
		if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
	}

	public viewReplayButton():void {
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
