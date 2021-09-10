import { b2AABB } from "../../Box2D";
import { Text, TextStyle } from "pixi.js";
import { Circle, ControllerGameGlobals, ControllerTutorial, FixedJoint, Main, Part, Rectangle, RevoluteJoint, ShapePart, Triangle } from "../../imports";

export class ControllerTank extends ControllerTutorial
{
	private object:ShapePart;
	private controlText:Text;
	private hasWon:Boolean = false;

	constructor()
	{
		super()
		this.draw.m_drawYOff = -300;
		this.draw.m_drawXOff = 1520;

		// objects strewn around
		this.object = new Rectangle(0, 9, 1, 1);
		this.object.red = 22;
		this.object.green = 73;
		this.object.blue = 255;
		this.object.isEditable = false;
		this.object.drawAnyway = false;
		this.allParts.push(this.object);
		var p:Part = new Triangle(57.5, 2.4, 58.5, 2.4, 58, 1.6);
		(p as ShapePart).red = 255;
		(p as ShapePart).green = 207;
		(p as ShapePart).blue = 94;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new Circle(50.4, 4.6, 0.3);
		(p as ShapePart).red = 255;
		(p as ShapePart).green = 207;
		(p as ShapePart).blue = 94;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new Circle(51.4, 4.3, 0.35);
		(p as ShapePart).red = 255;
		(p as ShapePart).green = 207;
		(p as ShapePart).blue = 94;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new Circle(54, 3.5, 0.25);
		(p as ShapePart).red = 255;
		(p as ShapePart).green = 207;
		(p as ShapePart).blue = 94;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new Circle(54.8, 3.6, 0.3);
		(p as ShapePart).red = 255;
		(p as ShapePart).green = 207;
		(p as ShapePart).blue = 94;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new Circle(55.5, 3.7, 0.3);
		(p as ShapePart).red = 255;
		(p as ShapePart).green = 207;
		(p as ShapePart).blue = 94;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new Circle(56.1, 3.4, 0.35);
		(p as ShapePart).red = 255;
		(p as ShapePart).green = 207;
		(p as ShapePart).blue = 94;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new Circle(56.9, 2.8, 0.3);
		(p as ShapePart).red = 255;
		(p as ShapePart).green = 207;
		(p as ShapePart).blue = 94;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new Circle(60, 2.7, 0.25);
		(p as ShapePart).red = 255;
		(p as ShapePart).green = 207;
		(p as ShapePart).blue = 94;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new Circle(62, 3.2, 0.3);
		(p as ShapePart).red = 255;
		(p as ShapePart).green = 207;
		(p as ShapePart).blue = 94;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new Circle(63.8, 3.7, 0.3);
		(p as ShapePart).red = 255;
		(p as ShapePart).green = 207;
		(p as ShapePart).blue = 94;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);

		// tank w. lifter arm
		var tankBase:ShapePart = new Rectangle(70.4, 0.7, 2.2, 0.6);
		tankBase.red = 30;
		tankBase.green = 130;
		tankBase.blue = 60;
		tankBase.density = 20;
		tankBase.isCameraFocus = true;
		tankBase.isEditable = false;
		tankBase.drawAnyway = false;
		this.allParts.push(tankBase);
		p = new Circle(70.5, 1, 0.6);
		(p as ShapePart).red = 30;
		(p as ShapePart).green = 130;
		(p as ShapePart).blue = 60;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new Circle(71.5, 1, 0.6);
		(p as ShapePart).red = 30;
		(p as ShapePart).green = 130;
		(p as ShapePart).blue = 60;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new Circle(72.5, 1, 0.6);
		(p as ShapePart).red = 30;
		(p as ShapePart).green = 130;
		(p as ShapePart).blue = 60;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new RevoluteJoint(this.allParts[this.allParts.length - 3], tankBase, 70.5, 1);
		(p as RevoluteJoint).enableMotor = true;
		(p as RevoluteJoint).motorStrength = 30;
		(p as RevoluteJoint).motorSpeed = 15;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new RevoluteJoint(this.allParts[this.allParts.length - 3], tankBase, 71.5, 1);
		(p as RevoluteJoint).enableMotor = true;
		(p as RevoluteJoint).motorStrength = 30;
		(p as RevoluteJoint).motorSpeed = 15;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new RevoluteJoint(this.allParts[this.allParts.length - 3], tankBase, 72.5, 1);
		(p as RevoluteJoint).enableMotor = true;
		(p as RevoluteJoint).motorStrength = 30;
		(p as RevoluteJoint).motorSpeed = 15;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		for (var i:number = 0; i < 7; i++) {
			p = new Rectangle(70.1 + i * 0.4, 0.3, 0.4, 0.2);
			(p as ShapePart).red = 30;
			(p as ShapePart).green = 90;
			(p as ShapePart).blue = 50;
			(p as Rectangle).isTank = true;
			p.isEditable = false;
			p.drawAnyway = false;
			this.allParts.push(p);
		}
		for (i = 0; i < 3; i++) {
			p = new Rectangle(72.8, 0.4 + i * 0.4, 0.2, 0.4);
			(p as ShapePart).red = 30;
			(p as ShapePart).green = 90;
			(p as ShapePart).blue = 50;
			(p as Rectangle).isTank = true;
			p.isEditable = false;
			p.drawAnyway = false;
			this.allParts.push(p);
		}
		for (i = 0; i < 7; i++) {
			p = new Rectangle(72.5 - i * 0.4, 1.5, 0.4, 0.2);
			(p as ShapePart).red = 30;
			(p as ShapePart).green = 90;
			(p as ShapePart).blue = 50;
			(p as Rectangle).isTank = true;
			p.isEditable = false;
			p.drawAnyway = false;
			this.allParts.push(p);
		}
		for (i = 0; i < 3; i++) {
			p = new Rectangle(70, 1.2 - i * 0.4, 0.2, 0.4);
			(p as ShapePart).red = 30;
			(p as ShapePart).green = 90;
			(p as ShapePart).blue = 50;
			(p as Rectangle).isTank = true;
			p.isEditable = false;
			p.drawAnyway = false;
			this.allParts.push(p);
		}
		for (i = 0; i < 7; i++) {
			p = new RevoluteJoint(this.allParts[this.allParts.length - 20], this.allParts[this.allParts.length - 19], 70.5 + i * 0.4, 0.4);
			p.isEditable = false;
			p.drawAnyway = false;
			this.allParts.push(p);
		}
		for (i = 0; i < 3; i++) {
			p = new RevoluteJoint(this.allParts[this.allParts.length - 20], this.allParts[this.allParts.length - 19], 72.9, 0.8 + i * 0.4);
			p.isEditable = false;
			p.drawAnyway = false;
			this.allParts.push(p);
		}
		for (i = 0; i < 7; i++) {
			p = new RevoluteJoint(this.allParts[this.allParts.length - 20], this.allParts[this.allParts.length - 19], 72.5 - i * 0.4, 1.6);
			p.isEditable = false;
			p.drawAnyway = false;
			this.allParts.push(p);
		}
		for (i = 0; i < 3; i++) {
			p = new RevoluteJoint(this.allParts[this.allParts.length - 20], this.allParts[(i == 2 ? this.allParts.length - 39 : this.allParts.length - 19)], 70.1, 1.2 - i * 0.4);
			p.isEditable = false;
			p.drawAnyway = false;
			this.allParts.push(p);
		}
		p = new Rectangle(69.5, 1, 2, 0.1);
		(p as ShapePart).red = 30;
		(p as ShapePart).green = 90;
		(p as ShapePart).blue = 50;
		(p as ShapePart).collide = false;
		(p as ShapePart).density = 1;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new Rectangle(69.5, 0, 0.1, 1.2);
		(p as ShapePart).red = 30;
		(p as ShapePart).green = 90;
		(p as ShapePart).blue = 50;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new Rectangle(68.4, 1.1, 1.2, 0.1);
		(p as ShapePart).red = 30;
		(p as ShapePart).green = 90;
		(p as ShapePart).blue = 50;
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new RevoluteJoint(this.allParts[this.allParts.length - 3], tankBase, 71.4, 1.05);
		p.isEditable = false;
		p.drawAnyway = false;
		(p as RevoluteJoint).isStiff = true;
		(p as RevoluteJoint).enableMotor = true;
		(p as RevoluteJoint).motorStrength = 20;
		(p as RevoluteJoint).motorSpeed = 2;
		(p as RevoluteJoint).motorCWKey = 38;
		(p as RevoluteJoint).motorCCWKey = 40;
		this.allParts.push(p);
		p = new FixedJoint(this.allParts[this.allParts.length - 3], this.allParts[this.allParts.length - 4], 69.55, 1.05);
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);
		p = new FixedJoint(this.allParts[this.allParts.length - 3], this.allParts[this.allParts.length - 4], 69.55, 1.15);
		p.isEditable = false;
		p.drawAnyway = false;
		this.allParts.push(p);

		this.controlText = new Text('');
		this.controlText.x = 400;
		this.controlText.y = 102;
		this.controlText.text = "Use the left/right/up/down arrow keys to control the tank. Your goal is to descend the rocky slope, then lift the blue square\ninto the pit on the left.  If you get stuck, click \"Stop Simulation\" and try again.";
		this.controlText.visible = false;
		this.controlText.anchor.set(0.5, 0);
		var format:TextStyle = new TextStyle();
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 13;
		format.leading = 1;
		this.controlText.style = format;
		this.addChild(this.controlText);
	}

	public Init(e:Event):void {
		super.Init(e);
		if (!ControllerGameGlobals.viewingUnsavedReplay) this.ShowTutorialDialog(0, true);
	}

	public CloseTutorialDialog(num:number):void {
		if (num == 0) {
			this.ShowTutorialDialog(1, true);
		} else if (num == 1) {
			this.ShowTutorialDialog(2);
		} else if (num == 3) {
			this.ShowTutorialWindow(55, 276, this.World2ScreenY(2));
		} else if (num == 55) {
			this.m_tutorialDialog.visible = false;
			if (this.m_scoreWindow.visible) this.m_scoreWindow.HideFader();
			else this.m_fader.visible = false;
		} else {
			super.CloseTutorialDialog(num);
		}
	}

	public Update():void {
		super.Update();
		if (!ControllerGameGlobals.viewingUnsavedReplay) this.controlText.visible = !this.paused;
		if (this.wonChallenge && !this.hasWon && !ControllerGameGlobals.playingReplay) {
			this.hasWon = true;
			this.m_scoreWindow.ShowFader();
			this.ShowTutorialWindow(3, 276, this.World2ScreenY(2), true);
		}
	}

	private ShowTutorialDialog(num:number, moreButton:boolean = false):void {
		this.ShowTutorialWindow(num, this.World2ScreenX(57), this.World2ScreenY(-5), moreButton);
	}

	protected ChallengeOver():boolean {
		if (this.simStarted) {
			return (this.object.GetBody().GetWorldCenter().x > -15 && this.object.GetBody().GetWorldCenter().y > 12 && this.object.GetBody().GetWorldCenter().x < -3);
		} else {
			return false;
		}
	}

	protected GetBuildingArea():b2AABB {
		var area:b2AABB = new b2AABB();
		area.lowerBound.Set(67, -2);
		area.upperBound.Set(73.3, 5.2);
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
		this.ShowDisabledDialog();
	}

	public textButton():void {
		this.ShowDisabledDialog();
	}

	public undoButton():void {
		this.ShowDisabledDialog();
	}

	public redoButton():void {
		this.ShowDisabledDialog();
	}

	public pasteButton():void {
		this.ShowDisabledDialog();
	}

	public saveButton():void {
		this.ShowDisabledDialog();
	}

	public loadButton(makeThemRate:Boolean = true):void {
		this.ShowDisabledDialog();
	}

	public saveReplayButton():void {
		this.ShowDisabledDialog();
		if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
	}

	public loadRobotButton(makeThemRate:Boolean = true):void {
		this.ShowDisabledDialog();
	}

	public loadReplayButton(makeThemRate:Boolean = true):void {
		this.ShowDisabledDialog();
	}

	public loadChallengeButton(makeThemRate:Boolean = true):void {
		this.ShowDisabledDialog();
	}

	public commentButton(robotID:String = "", robotPublic:Boolean = false):void {
		this.ShowDisabledDialog();
	}

	public linkButton(robotID:String = "", robotPublic:Boolean = false):void {
		this.ShowDisabledDialog();
	}

	public embedButton(robotID:String = "", robotPublic:Boolean = false):void {
		this.ShowDisabledDialog();
	}

	public commentReplayButton(replayID:String = "", replayPublic:Boolean = false):void {
		this.ShowDisabledDialog();
	}

	public linkReplayButton(replayID:String = "", replayPublic:Boolean = false):void {
		this.ShowDisabledDialog();
	}

	public embedReplayButton(replayID:String = "", replayPublic:Boolean = false):void {
		this.ShowDisabledDialog();
	}
}
