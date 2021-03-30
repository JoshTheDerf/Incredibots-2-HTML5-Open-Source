import { Text, TextStyle } from 'pixi.js'
import { Circle, ControllerGameGlobals, ControllerSandbox, FixedJoint, JointPart, LSOManager, Main, Rectangle, RevoluteJoint, ScoreWindow, ShapePart } from "../../imports";

export class ControllerNewFeatures extends ControllerSandbox
{
	private partsConnected:boolean = false;
	private outlinesBehinded:boolean = false;
	private simStopped:boolean = false;
	private shapesUndragabled:boolean = false;
	private botInBox:boolean = false;

	private wasPlaying:boolean = false;

	private goalText:Text;

	private middle:ShapePart;
	private leg1Circle1:ShapePart;
	private leg1Circle2:ShapePart;
	private leg2Circle1:ShapePart;
	private leg2Circle2:ShapePart;
	private neckCircle1:ShapePart;
	private neckCircle2:ShapePart;
	private tailCircle1:ShapePart;
	private tailCircle2:ShapePart;
	private leg1Rect:ShapePart;
	private leg2Rect:ShapePart;
	private neckRect:ShapePart;
	private tailRect:ShapePart;

	constructor()
	{
		super()
		this.draw.m_drawXOff = -100;
		this.draw.m_drawYOff = -290;
		this.m_physScale = 22.5;

		this.goalText = new Text('');
		this.goalText.x = 400;
		this.goalText.y = 102;
		this.goalText.anchor.set(0.5, 0);
		this.goalText.text = "Drag the balloon animal into the box on the left to complete the tutorial!";
		this.goalText.visible = false;
		var format:TextStyle = new TextStyle();
		format.align = 'center';
		format.fill = 0xDDDDDD;
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 14;
		format.leading = 1;
		this.goalText.style = format;
		this.addChild(this.goalText);

		if (!ControllerGameGlobals.playingReplay) this.LoadParts();
	}

	private LoadParts():void {
		var p:ShapePart = new Rectangle(-40, -10, 20, 0.5, false);
		p.red = 180;
		p.green = 200;
		p.blue = 50;
		p.isStatic = true;
		p.isEditable = false;
		this.allParts.push(p);
		p = new Rectangle(-40, -10, 0.5, 20, false);
		p.red = 180;
		p.green = 200;
		p.blue = 50;
		p.isStatic = true;
		p.isEditable = false;
		this.allParts.push(p);
		p = new Rectangle(-40, 9.5, 20, 0.5, false);
		p.red = 180;
		p.green = 200;
		p.blue = 50;
		p.isStatic = true;
		p.isEditable = false;
		this.allParts.push(p);


		var red:number = 245;
		var green:number = 50;
		var blue:number = 40;
		this.leg1Rect = new Rectangle(15.52, 4.96, 2.48, 2.9155);
		this.leg1Rect.angle = -0.48;
		this.leg1Rect.blue = blue;
		this.leg1Rect.green = green;
		this.leg1Rect.red = red;
		this.allParts.push(this.leg1Rect);
		this.leg2Rect = new Rectangle(6.0, 4.96, 2.48, 2.9155);
		this.leg2Rect.angle = 0.48;
		this.leg2Rect.blue = blue;
		this.leg2Rect.green = green;
		this.leg2Rect.red = red;
		this.allParts.push(this.leg2Rect);
		this.leg1Circle1 = new Circle(16.05, 5.04, 1.2);
		this.leg1Circle1.blue = blue;
		this.leg1Circle1.green = green;
		this.leg1Circle1.red = red;
		this.allParts.push(this.leg1Circle1);
		this.leg1Circle2 = new Circle(17.36, 7.58, 1.2);
		this.leg1Circle2.blue = blue;
		this.leg1Circle2.green = green;
		this.leg1Circle2.red = red;
		this.allParts.push(this.leg1Circle2);
		this.leg2Circle1 = new Circle(7.95, 5.04, 1.2);
		this.leg2Circle1.blue = blue;
		this.leg2Circle1.green = green;
		this.leg2Circle1.red = red;
		this.allParts.push(this.leg2Circle1);
		this.leg2Circle2 = new Circle(6.64, 7.58, 1.2);
		this.leg2Circle2.blue = blue;
		this.leg2Circle2.green = green;
		this.leg2Circle2.red = red;
		this.allParts.push(this.leg2Circle2);
		this.neckRect = new Rectangle(7.62, -2, 2.26, 2.26);
		this.neckRect.angle = -0.26;
		this.neckRect.blue = blue;
		this.neckRect.green = green;
		this.neckRect.red = red;
		this.allParts.push(this.neckRect);
		this.neckCircle1 = new Circle(9.03, 0.2, 1.1);
		this.neckCircle1.blue = blue;
		this.neckCircle1.green = green;
		this.neckCircle1.red = red;
		this.allParts.push(this.neckCircle1);
		this.neckCircle2 = new Circle(8.5, -1.8, 1.1);
		this.neckCircle2.blue = blue;
		this.neckCircle2.green = green;
		this.neckCircle2.red = red;
		this.allParts.push(this.neckCircle2);
		var tail:ShapePart = new Rectangle(16.8, -3.3, 7, 0.3);
		tail.angle = -0.6;
		tail.blue = blue;
		tail.green = green;
		tail.red = red;
		this.allParts.push(tail);
		this.tailRect = new Rectangle(15.8, -2.2, 3, 2.1);
		this.tailRect.angle = -0.6;
		this.tailRect.blue = blue;
		this.tailRect.green = green;
		this.tailRect.red = red;
		this.allParts.push(this.tailRect);
		this.tailCircle1 = new Circle(15.9, -0.2, 1.02);
		this.tailCircle1.blue = blue;
		this.tailCircle1.green = green;
		this.tailCircle1.red = red;
		this.allParts.push(this.tailCircle1);
		this.tailCircle2 = new Circle(18.5, -1.98, 1.02);
		this.tailCircle2.blue = blue;
		this.tailCircle2.green = green;
		this.tailCircle2.red = red;
		this.allParts.push(this.tailCircle2);
		p = new Rectangle(9.18, -5.12, 1.5, 2.08);
		p.blue = blue;
		p.green = green;
		p.red = red;
		p.angle = -0.52;
		this.allParts.push(p);
		var ears:ShapePart = new Circle(9.3, -3.7, 1);
		ears.blue = blue;
		ears.green = green;
		ears.red = red;
		ears.terrain = true;
		this.allParts.push(ears);
		p = new Circle(10.5, -4.4, 1);
		p.blue = blue;
		p.green = green;
		p.red = red;
		p.terrain = true;
		this.allParts.push(p);
		var j:JointPart = new FixedJoint(ears, this.allParts[this.allParts.length - 3], 9.3, -3.7);
		this.allParts.push(j);
		j = new FixedJoint(this.allParts[this.allParts.length - 4], this.allParts[this.allParts.length - 2], 10.5, -4.4);
		this.allParts.push(j);
		var head:ShapePart = new Circle(7.04, -3.18, 1.2);
		head.blue = blue;
		head.green = green;
		head.red = red;
		this.allParts.push(head);
		var nose:Circle = new Circle(5.85, -3.7, 0.2);
		nose.blue = blue;
		nose.green = green;
		nose.red = red;
		this.allParts.push(nose);
		var tailBob:ShapePart = new Circle(23.3, -5.2, 1);
		tailBob.blue = blue;
		tailBob.green = green;
		tailBob.red = red;
		this.allParts.push(tailBob);

		this.middle = new Circle(12, 2, 2);
		this.middle.blue = blue;
		this.middle.green = green;
		this.middle.red = red;
		this.allParts.push(this.middle);

		j = new FixedJoint(this.leg1Circle1, this.leg1Rect, 16.05, 5.04);
		this.allParts.push(j);
		j = new FixedJoint(this.leg1Circle2, this.leg1Rect, 17.36, 7.58);
		this.allParts.push(j);
		j = new FixedJoint(this.leg2Circle1, this.leg2Rect, 7.95, 5.04);
		this.allParts.push(j);
		j = new FixedJoint(this.leg2Circle2, this.leg2Rect, 6.64, 7.58);
		this.allParts.push(j);
		j = new FixedJoint(this.neckCircle1, this.neckRect, 9.03, 0.2);
		this.allParts.push(j);
		j = new FixedJoint(this.neckCircle2, this.neckRect, 8.5, -1.8);
		this.allParts.push(j);
		j = new FixedJoint(this.tailCircle1, this.tailRect, 15.9, -0.2);
		this.allParts.push(j);
		j = new FixedJoint(this.tailCircle2, this.tailRect, 18.5, -1.98);
		this.allParts.push(j);
		j = new FixedJoint(ears, this.neckCircle2, 9, -2.8);
		this.allParts.push(j);
		j = new FixedJoint(nose, head, 6, -3.7);
		this.allParts.push(j);
		j = new FixedJoint(this.neckCircle2, head, 7.7, -2.5);
		this.allParts.push(j);
		j = new FixedJoint(tail, tailBob, 23.3, -5.2);
		this.allParts.push(j);
		j = new FixedJoint(tail, this.tailCircle2, 18.5, -1.98);
		this.allParts.push(j);

		p = new Rectangle(-10, 8, 2.5, 0.4);
		p.red = 220;
		p.green = 220;
		p.blue = 220;
		p.density = 30;
		p.collide = false;
		this.allParts.push(p);
		p = new Rectangle(-7.6, 8, 2.5, 0.4);
		p.red = 220;
		p.green = 220;
		p.blue = 220;
		p.density = 30;
		p.collide = false;
		this.allParts.push(p);
		p = new Rectangle(-5.2, 8, 2.5, 0.4);
		p.red = 220;
		p.green = 220;
		p.blue = 220;
		p.density = 30;
		p.collide = false;
		this.allParts.push(p);
		p = new Rectangle(-2.8, 8, 2.5, 0.4);
		p.red = 220;
		p.green = 220;
		p.blue = 220;
		p.density = 30;
		p.collide = false;
		this.allParts.push(p);
		j = new RevoluteJoint(this.allParts[this.allParts.length - 4], this.allParts[this.allParts.length - 3], -7.55, 8.2);
		this.allParts.push(j);
		j = new RevoluteJoint(this.allParts[this.allParts.length - 4], this.allParts[this.allParts.length - 3], -5.15, 8.2);
		this.allParts.push(j);
		j = new RevoluteJoint(this.allParts[this.allParts.length - 4], this.allParts[this.allParts.length - 3], -2.75, 8.2);
		this.allParts.push(j);
	}

	public Init(e:Event):void {
		super.Init(e);
		if (!ControllerGameGlobals.playingReplay) this.ShowTutorialDialog(82, true);
	}

	public CloseTutorialDialog(num:number):void {
		if (num == 82) {
			this.ShowTutorialDialog(83, true);
		} else if (num == 83) {
			this.ShowTutorialDialog(84);
		} else {
			if (num == 89) {
				LSOManager.SetLevelDone(8);
				if (this.m_scoreWindow) {
					try {
						this.removeChild(this.m_scoreWindow);
					} catch (type:any) {

					}
				}
				this.m_scoreWindow = new ScoreWindow(this, this.GetScore());
				ControllerGameGlobals.winSound.play();
				this.addChild(this.m_scoreWindow);
				this.m_fader.visible = true;
			}
			super.CloseTutorialDialog(num);
		}
	}

	public Update():void {
		super.Update();
		if (!ControllerGameGlobals.playingReplay) {
			if (!this.partsConnected && this.allParts[this.allParts.length - 1] instanceof FixedJoint && this.allParts[this.allParts.length - 2] instanceof FixedJoint && this.allParts[this.allParts.length - 3] instanceof FixedJoint && this.allParts[this.allParts.length - 4] instanceof FixedJoint &&
				this.middle.GetActiveJoints().length == 4 && (this.leg1Circle1.GetActiveJoints().length == 2 || this.leg1Rect.GetActiveJoints().length == 3) && (this.leg2Circle1.GetActiveJoints().length == 2 || this.leg2Rect.GetActiveJoints().length == 3) && (this.neckCircle1.GetActiveJoints().length == 2 || this.neckRect.GetActiveJoints().length == 3) && (this.tailCircle1.GetActiveJoints().length == 2 || this.tailRect.GetActiveJoints().length == 3)) {
				this.partsConnected = true;
				this.ShowTutorialDialog(85);
			}
			if (this.partsConnected && !this.outlinesBehinded && this.leg1Circle1.terrain && this.leg1Circle2.terrain && this.leg2Circle1.terrain && this.leg2Circle2.terrain && this.neckCircle1.terrain && this.neckCircle2.terrain && this.tailCircle1.terrain && this.tailCircle2.terrain) {
				this.outlinesBehinded = true;
				this.ShowTutorialDialog(86);
			}
			if (this.outlinesBehinded && !this.simStopped && this.wasPlaying && !this.simStarted) {
				this.simStopped = true;
				this.ShowTutorialDialog(87);
			}
			if (this.simStopped && !this.shapesUndragabled && this.middle.undragable && this.leg1Circle1.undragable && this.leg1Circle2.undragable && this.leg2Circle1.undragable && this.leg2Circle2.undragable && this.neckCircle1.undragable && this.neckCircle2.undragable && this.tailCircle1.undragable && this.tailCircle2.undragable) {
				this.shapesUndragabled = true;
				this.ShowTutorialDialog(88);
			}
			if (this.shapesUndragabled && !this.botInBox && this.simStarted && this.middle.GetBody().GetWorldCenter().x < -25 && this.middle.GetBody().GetWorldCenter().y > -8) {
				this.botInBox = true;
				this.ShowTutorialDialog(89);
			}
		}

		this.goalText.visible = (!this.paused && this.shapesUndragabled);
		this.wasPlaying = this.simStarted;
	}

	private ShowTutorialDialog(num:number, moreButton:boolean = false):void {
		this.ShowTutorialWindow(num, this.World2ScreenX(-10), this.World2ScreenY(-10), moreButton);
	}

	protected ChallengeOver():boolean {
		return false;
	}

	public GetScore():number {
		return 1000;
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

	public saveButton():void {
		this.ShowDisabledDialog();
	}

	public loadButton(makeThemRate:boolean = true):void {
		this.ShowDisabledDialog();
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
