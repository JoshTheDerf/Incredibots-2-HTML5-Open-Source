import { b2AABB } from '../../Box2D';
import { Text, TextStyle } from 'pixi.js'
import { Circle, ControllerGameGlobals, ControllerTutorial, FixedJoint, Main, Part, Rectangle, RevoluteJoint, ShapePart, Triangle, Util } from "../../imports";

export class ControllerDumpbot extends ControllerTutorial
{
	private object1:ShapePart;
	private object2:ShapePart;
	private object3:ShapePart;
	private controlText:Text;

	private tutorialPart:Part;
	private tutorialPart2:Part;

	private madeRectangle:boolean = false;
	private madeWheels:boolean = false;
	private madeJoints:boolean = false;
	private madeArm:boolean = false;
	private clickedJoint:boolean = false;
	private madeArmJoint:boolean = false;
	private solidifiedArmJoint:boolean = false;
	private changedControlKeys:boolean = false;
	private madeBucket:boolean = false;
	private fixedBucket:boolean = false;
	private fixedBucket2:boolean = false;
	private adjustedMotor:boolean = false;

	constructor()
	{
		super()
		this.draw.m_drawXOff = 360;
		this.draw.m_drawYOff = -220;

		// start platform
		this.sGround3.lineStyle(6, 0x9D8941);
		this.sGround3.beginFill(0xCEB456);
		this.sGround3.drawRect(6598, 1610, 650, 56);
		this.sGround3.endFill();

		this.object1 = new Rectangle(-0.5, 9, 1, 1);
		this.object1.red = 255;
		this.object1.green = 207;
		this.object1.blue = 94;
		this.object1.isEditable = false;
		this.object1.drawAnyway = false;
		this.allParts.push(this.object1);
		this.object2 = new Circle(0.9, 9.7, 0.3);
		this.object2.red = 255;
		this.object2.green = 207;
		this.object2.blue = 94;
		this.object2.isEditable = false;
		this.object2.drawAnyway = false;
		this.allParts.push(this.object2);
		this.object3 = new Triangle(-2, 9.9, -1, 9.9, -1.5, 8.9);
		this.object3.red = 255;
		this.object3.green = 207;
		this.object3.blue = 94;
		this.object3.isEditable = false;
		this.object3.drawAnyway = false;
		this.allParts.push(this.object3);

		if (!ControllerGameGlobals.playingReplay) {
			this.tutorialPart = new Rectangle(30, 7, 3.5, 1.5);
			this.tutorialPart.isEditable = false;
			this.tutorialPart.isStatic = true;
			(this.tutorialPart as ShapePart).drawAnyway = true;
			(this.tutorialPart as ShapePart).collide = false;
			(this.tutorialPart as ShapePart).red = 75;
			(this.tutorialPart as ShapePart).green = 185;
			(this.tutorialPart as ShapePart).blue = 75;
			(this.tutorialPart as ShapePart).opacity = 0;
			this.allParts.push(this.tutorialPart);
		}

		this.controlText = new Text('');
		this.controlText.x = 400;
		this.controlText.y = 102;
		this.controlText.anchor.set(0.5, 0);
		this.controlText.text = "Use the left/right arrow keys to rotate the wheels. Control the loading arm with the up/down arrow keys.\nDump the objects into the pit to the left.";
		this.controlText.selectable = false;
		this.controlText.visible = false;
		var format = new TextStyle();
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 14;
		format.leading = 1;
		this.controlText.style = format;
		this.addChild(this.controlText);
	}

	public Init(e:Event):void {
		super.Init(e);
		if (!ControllerGameGlobals.viewingUnsavedReplay) this.ShowTutorialDialog(21);
	}

	public Update():void {
		super.Update();
		if (!ControllerGameGlobals.viewingUnsavedReplay) this.controlText.visible = !this.paused;
		this.m_sidePanel.DisableStuffForDumpbotLevel();
		if (!ControllerGameGlobals.playingReplay) {
			if (!this.madeRectangle && this.allParts[this.allParts.length - 1] instanceof Rectangle && this.allParts[this.allParts.length - 1].isEditable) {
				this.madeRectangle = true;
				this.allParts = Util.RemoveFromArray(this.tutorialPart, this.allParts);
				this.tutorialPart = new Circle(30.5, 7.75, 1);
				this.tutorialPart.isEditable = false;
				this.tutorialPart.isStatic = true;
				(this.tutorialPart as ShapePart).drawAnyway = true;
				(this.tutorialPart as ShapePart).collide = false;
				(this.tutorialPart as ShapePart).red = 75;
				(this.tutorialPart as ShapePart).green = 185;
				(this.tutorialPart as ShapePart).blue = 75;
				(this.tutorialPart as ShapePart).opacity = 0;
				this.allParts.push(this.tutorialPart);
				this.tutorialPart2 = new Circle(33, 7.75, 1);
				this.tutorialPart2.isEditable = false;
				this.tutorialPart2.isStatic = true;
				(this.tutorialPart2 as ShapePart).drawAnyway = true;
				(this.tutorialPart2 as ShapePart).collide = false;
				(this.tutorialPart2 as ShapePart).red = 75;
				(this.tutorialPart2 as ShapePart).green = 185;
				(this.tutorialPart2 as ShapePart).blue = 75;
				(this.tutorialPart2 as ShapePart).opacity = 0;
				this.allParts.push(this.tutorialPart2);
				this.redrawRobot = true;
				this.ShowTutorialDialog(22);
			}
			if (this.madeRectangle && !this.madeWheels && this.allParts[this.allParts.length - 1] instanceof Circle && this.allParts[this.allParts.length - 2] instanceof Circle && this.allParts[this.allParts.length - 1].isEditable && this.allParts[this.allParts.length - 2].isEditable && this.allParts[this.allParts.length - 1].isEnabled && this.allParts[this.allParts.length - 2].isEnabled && this.curAction != ControllerGameGlobals.PASTE) {
				this.madeWheels = true;
				this.ShowTutorialDialog(23);
			}
			if (this.madeWheels && !this.madeJoints && this.allParts[this.allParts.length - 1] instanceof RevoluteJoint && this.allParts[this.allParts.length - 2] instanceof RevoluteJoint && this.allParts[this.allParts.length - 1].enableMotor && this.allParts[this.allParts.length - 2].enableMotor && this.allParts[this.allParts.length - 1].isEnabled && this.allParts[this.allParts.length - 2].isEnabled) {
				this.madeJoints = true;
				this.allParts = Util.RemoveFromArray(this.tutorialPart, this.allParts);
				this.allParts = Util.RemoveFromArray(this.tutorialPart2, this.allParts);
				this.tutorialPart = new Rectangle(28.5, 8, 2, 0.2);
				this.tutorialPart.isEditable = false;
				this.tutorialPart.isStatic = true;
				(this.tutorialPart as ShapePart).drawAnyway = true;
				(this.tutorialPart as ShapePart).collide = false;
				(this.tutorialPart as ShapePart).red = 75;
				(this.tutorialPart as ShapePart).green = 185;
				(this.tutorialPart as ShapePart).blue = 75;
				(this.tutorialPart as ShapePart).opacity = 0;
				this.allParts.push(this.tutorialPart);
				this.redrawRobot = true;
				this.ShowTutorialDialog(24);
			}
			if (this.madeJoints && !this.madeArm && this.allParts[this.allParts.length - 1] instanceof Rectangle && this.allParts[this.allParts.length - 1].isEditable && this.allParts[this.allParts.length - 1].isEnabled) {
				this.madeArm = true;
				this.allParts = Util.RemoveFromArray(this.tutorialPart, this.allParts);
				this.redrawRobot = true;
				this.ShowTutorialDialog(25);
			}
			if (this.madeArm && !this.clickedJoint && this.curAction == ControllerGameGlobals.NEW_REVOLUTE_JOINT) {
				this.clickedJoint = true;
				this.tutorialPart = new Circle(30.3, 8.1, 0.15);
				this.tutorialPart.isEditable = false;
				this.tutorialPart.isStatic = true;
				(this.tutorialPart as ShapePart).drawAnyway = true;
				(this.tutorialPart as ShapePart).collide = false;
				(this.tutorialPart as ShapePart).red = 75;
				(this.tutorialPart as ShapePart).green = 185;
				(this.tutorialPart as ShapePart).blue = 75;
				(this.tutorialPart as ShapePart).opacity = 0;
				this.allParts.push(this.tutorialPart);
				this.redrawRobot = true;
				this.ShowTutorialDialog(58);
				ControllerGameGlobals.snapToCenter = false;
			}
			if (this.clickedJoint && !this.madeArmJoint && this.allParts[this.allParts.length - 1] instanceof RevoluteJoint && this.allParts[this.allParts.length - 1].isEnabled) {
				this.madeArmJoint = true;
				this.allParts = Util.RemoveFromArray(this.tutorialPart, this.allParts);
				this.redrawRobot = true;
				this.ShowTutorialDialog(26);
			}
			if (this.madeArmJoint && !this.solidifiedArmJoint && this.allParts[this.allParts.length - 1] instanceof RevoluteJoint && this.allParts[this.allParts.length - 1].enableMotor && this.allParts[this.allParts.length - 1].isStiff) {
				this.solidifiedArmJoint = true;
				this.ShowTutorialDialog(57);
			}
			if (this.solidifiedArmJoint && !this.changedControlKeys && this.allParts[this.allParts.length - 1] instanceof RevoluteJoint && this.allParts[this.allParts.length - 1].motorCWKey == 38 && this.allParts[this.allParts.length - 1].motorCCWKey == 40) {
				this.changedControlKeys = true;
				this.tutorialPart = new Rectangle(28.5, 5.6, 1.5, 0.1);
				this.tutorialPart.isEditable = false;
				this.tutorialPart.isStatic = true;
				(this.tutorialPart as ShapePart).drawAnyway = true;
				(this.tutorialPart as ShapePart).collide = false;
				(this.tutorialPart as ShapePart).red = 75;
				(this.tutorialPart as ShapePart).green = 185;
				(this.tutorialPart as ShapePart).blue = 75;
				(this.tutorialPart as ShapePart).opacity = 0;
				this.allParts.push(this.tutorialPart);
				this.tutorialPart2 = new Rectangle(29.6, 4.5, 0.1, 1.2);
				this.tutorialPart2.isEditable = false;
				this.tutorialPart2.isStatic = true;
				(this.tutorialPart2 as ShapePart).drawAnyway = true;
				(this.tutorialPart2 as ShapePart).collide = false;
				(this.tutorialPart2 as ShapePart).red = 75;
				(this.tutorialPart2 as ShapePart).green = 185;
				(this.tutorialPart2 as ShapePart).blue = 75;
				(this.tutorialPart2 as ShapePart).opacity = 0;
				this.allParts.push(this.tutorialPart2);
				this.redrawRobot = true;
				this.ShowTutorialDialog(27);
			}
			if (this.changedControlKeys && !this.madeBucket && this.allParts[this.allParts.length - 1] instanceof Rectangle && this.allParts[this.allParts.length - 2] instanceof Rectangle && this.allParts[this.allParts.length - 1].isEditable && this.allParts[this.allParts.length - 2].isEditable && this.allParts[this.allParts.length - 1].isEnabled && this.allParts[this.allParts.length - 2].isEnabled) {
				this.madeBucket = true;
				this.allParts = Util.RemoveFromArray(this.tutorialPart, this.allParts);
				this.allParts = Util.RemoveFromArray(this.tutorialPart2, this.allParts);
				this.ShowTutorialDialog(28);
			}
			if (this.madeBucket && !this.fixedBucket && this.allParts[this.allParts.length - 1] instanceof FixedJoint && this.allParts[this.allParts.length - 1].isEnabled) {
				this.fixedBucket = true;
				this.ShowTutorialDialog(29);
			}
			if (this.fixedBucket && !this.fixedBucket2 && this.allParts[this.allParts.length - 1] instanceof FixedJoint && this.allParts[this.allParts.length - 2] instanceof FixedJoint && this.allParts[this.allParts.length - 1].isEnabled && this.allParts[this.allParts.length - 2].isEnabled) {
				this.fixedBucket2 = true;
				this.ShowTutorialDialog(30);
			}
			if (this.fixedBucket2 && !this.adjustedMotor && this.selectedParts.length == 1 && this.selectedParts[0] instanceof RevoluteJoint && this.selectedParts[0].motorSpeed < 15 && this.selectedParts[0].motorStrength > 15 && this.selectedParts[0].isStiff) {
				this.adjustedMotor = true;
				this.ShowTutorialDialog(31);
			}
		}
	}

	private ShowTutorialDialog(num:number, moreButton:boolean = false):void {
		this.ShowTutorialWindow(num, this.World2ScreenX(14.5), this.World2ScreenY(0.5), moreButton);
	}

	protected ChallengeOver():boolean {
		if (this.simStarted) {
			return (this.object1.GetBody().GetWorldCenter().x > -15 && this.object1.GetBody().GetWorldCenter().y > 12 && this.object1.GetBody().GetWorldCenter().x < -3 &&
					this.object2.GetBody().GetWorldCenter().x > -15 && this.object2.GetBody().GetWorldCenter().y > 12 && this.object2.GetBody().GetWorldCenter().x < -3 &&
					this.object3.GetBody().GetWorldCenter().x > -15 && this.object3.GetBody().GetWorldCenter().y > 12 && this.object3.GetBody().GetWorldCenter().x < -3);
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
