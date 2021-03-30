import { Circle, ControllerGameGlobals, ControllerSandbox, FixedJoint, LSOManager, Part, Rectangle, RevoluteJoint, ScoreWindow, ShapePart, TextPart, Triangle, Util } from "../../imports";

export class ControllerHomeMovies extends ControllerSandbox
{
	private face:ShapePart;
	private neck:ShapePart;
	private hair1:ShapePart;
	private hair2:ShapePart;
	private hair3:ShapePart;
	private nose:ShapePart;
	private mouth:ShapePart;
	private leftEye:ShapePart;
	private rightEye:ShapePart;
	private leftPupil:ShapePart;
	private rightPupil:ShapePart;
	private upperTorso:ShapePart;
	private lowerTorso:ShapePart;
	private leftHand:ShapePart;
	private rightHand:ShapePart;
	private leftFoot:ShapePart;
	private rightFoot:ShapePart;
	private upperLeftArm:ShapePart;
	private lowerLeftArm:ShapePart;
	private upperRightArm:ShapePart;
	private lowerRightArm:ShapePart;
	private upperLeftLeg:ShapePart;
	private lowerLeftLeg:ShapePart;
	private upperRightLeg:ShapePart;
	private lowerRightLeg:ShapePart;
	private upperSkirt:ShapePart;
	private lowerSkirt:ShapePart;
	private shoulderJoint1:RevoluteJoint;
	private shoulderJoint2:RevoluteJoint;

	private dialog:TextPart = null;
	private tutorialPart:Part;

	private wasPasting:boolean = false;
	private wasSaveWindowVisible:boolean = false;

	private colouredFace:boolean = false;
	private unoutlinedStuff:boolean = false;
	private movedLegsBack:boolean = false;
	private createdRect:boolean = false;
	private fixated:boolean = false;
	private invisiblised:boolean = false;
	private enabledShoulder:boolean = false;
	private copiedRagdoll:boolean = false;
	private pastedRagdoll:boolean = false;
	private madeText:boolean = false;
	private enteredText:boolean = false;
	private uncheckedAlwaysDisplay:boolean = false;

	constructor()
	{
		super()
		this.draw.m_drawXOff = 100;
		this.draw.m_drawYOff = -150;

		if (!ControllerGameGlobals.playingReplay) this.LoadParts();
	}

	private LoadParts():void {
		this.hair1 = new Circle(9.5, 1.0, 0.7);
		this.hair1.red = 255;
		this.hair1.green = 209;
		this.hair1.blue = 59;
		this.allParts.push(this.hair1);
		this.neck = new Rectangle(9.6, 2.8, 0.8, 1);
		this.neck.red = 255;
		this.neck.green = 216;
		this.neck.blue = 136;
		this.allParts.push(this.neck);
		this.face = new Circle(10, 2, 1.1);
		this.face.red = 180;
		this.face.green = 180;
		this.face.blue = 180;
		this.face.density = 5;
		this.allParts.push(this.face);
		this.hair2 = new Triangle(9.1, 0.8, 10.6, 0.75, 8.8, 1.9);
		this.hair2.red = 255;
		this.hair2.green = 209;
		this.hair2.blue = 59;
		this.allParts.push(this.hair2);
		this.hair3 = new Triangle(9.1, 0.8, 10.6, 0.75, 11.3, 1.9);
		this.hair3.red = 255;
		this.hair3.green = 209;
		this.hair3.blue = 59;
		this.allParts.push(this.hair3);
		this.leftEye = new Circle(9.6, 1.8, 0.2);
		this.leftEye.red = 244;
		this.leftEye.green = 243;
		this.leftEye.blue = 238;
		this.leftEye.outline = false;
		this.allParts.push(this.leftEye);
		this.rightEye = new Circle(10.4, 1.8, 0.2);
		this.rightEye.red = 244;
		this.rightEye.green = 243;
		this.rightEye.blue = 238;
		this.rightEye.outline = false;
		this.allParts.push(this.rightEye);
		this.leftPupil = new Circle(9.6, 1.8, 0.1);
		this.leftPupil.red = 124;
		this.leftPupil.green = 141;
		this.leftPupil.blue = 233;
		this.leftPupil.outline = false;
		this.allParts.push(this.leftPupil);
		this.rightPupil = new Circle(10.4, 1.8, 0.1);
		this.rightPupil.red = 124;
		this.rightPupil.green = 141;
		this.rightPupil.blue = 233;
		this.rightPupil.outline = false;
		this.allParts.push(this.rightPupil);
		this.nose = new Triangle(9.95, 1.9, 10.18, 2.2, 9.9, 2.3);
		this.nose.red = 255;
		this.nose.green = 216;
		this.nose.blue = 136;
		this.allParts.push(this.nose);
		this.mouth = new Triangle(9.5, 2.5, 10.4, 2.5, 10.1, 2.85);
		this.mouth.red = 244;
		this.mouth.green = 243;
		this.mouth.blue = 238;
		this.allParts.push(this.mouth);

		this.lowerSkirt = new Triangle(10, 6.3, 8.2, 8.7, 11.8, 8.7);
		this.lowerSkirt.red = 120;
		this.lowerSkirt.green = 108;
		this.lowerSkirt.blue = 110;
		this.allParts.push(this.lowerSkirt);
		this.upperSkirt = new Triangle(10, 5.3, 8.4, 7.7, 11.6, 7.7);
		this.upperSkirt.red = 120;
		this.upperSkirt.green = 108;
		this.upperSkirt.blue = 110;
		this.allParts.push(this.upperSkirt);

		// torso
		this.upperTorso = new Rectangle(8.9, 3.6, 2.2, 1.8);
		this.upperTorso.red = 255;
		this.upperTorso.green = 133;
		this.upperTorso.blue = 74;
		this.allParts.push(this.upperTorso);
		this.lowerTorso = new Rectangle(9.1, 5.3, 1.8, 1.5);
		this.lowerTorso.red = 255;
		this.lowerTorso.green = 133;
		this.lowerTorso.blue = 74;
		this.allParts.push(this.lowerTorso);

		// arms
		this.upperLeftArm = new Rectangle(7.35, 4.05, 2, 0.5);
		this.upperLeftArm.angle = -0.6;
		this.upperLeftArm.red = 255;
		this.upperLeftArm.green = 216;
		this.upperLeftArm.blue = 136;
		this.allParts.push(this.upperLeftArm);
		this.lowerLeftArm = new Rectangle(7.25, 5.1, 2, 0.5);
		this.lowerLeftArm.angle = 0.8;
		this.lowerLeftArm.red = 255;
		this.lowerLeftArm.green = 216;
		this.lowerLeftArm.blue = 136;
		this.allParts.push(this.lowerLeftArm);
		this.leftHand = new Circle(8.75, 5.85, 0.4);
		this.leftHand.red = 255;
		this.leftHand.green = 216;
		this.leftHand.blue = 136;
		this.allParts.push(this.leftHand);
		this.upperRightArm = new Rectangle(10.85, 3.65, 0.5, 2);
		this.upperRightArm.angle = -0.1;
		this.upperRightArm.red = 255;
		this.upperRightArm.green = 216;
		this.upperRightArm.blue = 136;
		this.allParts.push(this.upperRightArm);
		this.lowerRightArm = new Rectangle(10.95, 5.3, 0.5, 2);
		this.lowerRightArm.red = 255;
		this.lowerRightArm.green = 216;
		this.lowerRightArm.blue = 136;
		this.allParts.push(this.lowerRightArm);
		this.rightHand = new Circle(11.2, 7.2, 0.4);
		this.rightHand.red = 255;
		this.rightHand.green = 216;
		this.rightHand.blue = 136;
		this.allParts.push(this.rightHand);

		this.leftFoot = new Triangle(9, 12, 9.6, 11.2, 10.2, 12);
		this.leftFoot.red = 174;
		this.leftFoot.green = 134;
		this.leftFoot.blue = 174;
		this.allParts.push(this.leftFoot);
		this.rightFoot = new Triangle(10.25, 12, 10.85, 11.2, 11.45, 12);
		this.rightFoot.red = 174;
		this.rightFoot.green = 134;
		this.rightFoot.blue = 174;
		this.allParts.push(this.rightFoot);

		// legs
		this.upperLeftLeg = new Rectangle(9.2, 7.5, 0.6, 2.2);
		this.upperLeftLeg.angle = 0.1;
		this.upperLeftLeg.red = 255;
		this.upperLeftLeg.green = 216;
		this.upperLeftLeg.blue = 136;
		this.allParts.push(this.upperLeftLeg);
		this.lowerLeftLeg = new Rectangle(9.2, 9.4, 0.6, 2.2);
		this.lowerLeftLeg.angle = -0.1;
		this.lowerLeftLeg.red = 255;
		this.lowerLeftLeg.green = 216;
		this.lowerLeftLeg.blue = 136;
		this.allParts.push(this.lowerLeftLeg);
		this.upperRightLeg = new Rectangle(10.2, 7.5, 0.6, 2.2);
		this.upperRightLeg.angle = -0.05;
		this.upperRightLeg.red = 255;
		this.upperRightLeg.green = 216;
		this.upperRightLeg.blue = 136;
		this.allParts.push(this.upperRightLeg);
		this.lowerRightLeg = new Rectangle(10.4, 9.4, 0.6, 2.2);
		this.lowerRightLeg.angle = -0.15;
		this.lowerRightLeg.red = 255;
		this.lowerRightLeg.green = 216;
		this.lowerRightLeg.blue = 136;
		this.allParts.push(this.lowerRightLeg);

		var fj:FixedJoint = new FixedJoint(this.face, this.hair1, 10, 0.9);
		this.allParts.push(fj);
		fj = new FixedJoint(this.face, this.hair2, 10, 0.9);
		this.allParts.push(fj);
		fj = new FixedJoint(this.face, this.hair3, 10, 0.9);
		this.allParts.push(fj);
		fj = new FixedJoint(this.face, this.leftEye, 10, 0.9);
		this.allParts.push(fj);
		fj = new FixedJoint(this.face, this.leftPupil, 10, 0.9);
		this.allParts.push(fj);
		fj = new FixedJoint(this.face, this.rightEye, 10, 0.9);
		this.allParts.push(fj);
		fj = new FixedJoint(this.face, this.rightPupil, 10, 0.9);
		this.allParts.push(fj);
		fj = new FixedJoint(this.face, this.nose, 10, 0.9);
		this.allParts.push(fj);
		fj = new FixedJoint(this.face, this.mouth, 10, 0.9);
		this.allParts.push(fj);
		fj = new FixedJoint(this.lowerLeftArm, this.leftHand, 10, 0.9);
		this.allParts.push(fj);
		fj = new FixedJoint(this.lowerRightArm, this.rightHand, 10, 0.9);
		this.allParts.push(fj);
		fj = new FixedJoint(this.face, this.neck, 10, 0.9);
		this.allParts.push(fj);

		var rj:RevoluteJoint = new RevoluteJoint(this.neck, this.upperTorso, 10, 3.7);
		rj.motorLowerLimit = -10;
		rj.motorUpperLimit = 10;
		this.allParts.push(rj);
		rj = new RevoluteJoint(this.lowerTorso, this.upperTorso, 10, 5.35);
		rj.motorLowerLimit = -5;
		rj.motorUpperLimit = 5;
		this.allParts.push(rj);
		rj = new RevoluteJoint(this.lowerTorso, this.upperSkirt, 10, 6.5);
		rj.motorLowerLimit = -10;
		rj.motorUpperLimit = 10;
		this.allParts.push(rj);
		rj = new RevoluteJoint(this.lowerSkirt, this.upperSkirt, 10, 7.2);
		rj.motorLowerLimit = -10;
		rj.motorUpperLimit = 10;
		this.allParts.push(rj);
		rj = new RevoluteJoint(this.lowerSkirt, this.upperLeftLeg, 9.6, 7.6);
		rj.motorLowerLimit = -40;
		rj.motorUpperLimit = 40;
		this.allParts.push(rj);
		rj = new RevoluteJoint(this.lowerSkirt, this.upperRightLeg, 10.4, 7.6);
		rj.motorLowerLimit = -40;
		rj.motorUpperLimit = 40;
		this.allParts.push(rj);
		rj = new RevoluteJoint(this.lowerLeftLeg, this.upperLeftLeg, 9.4, 9.55);
		rj.motorLowerLimit = -20;
		rj.motorUpperLimit = 20;
		this.allParts.push(rj);
		rj = new RevoluteJoint(this.lowerRightLeg, this.upperRightLeg, 10.6, 9.55);
		rj.motorLowerLimit = -20;
		rj.motorUpperLimit = 20;
		this.allParts.push(rj);
		rj = new RevoluteJoint(this.lowerLeftLeg, this.leftFoot, 9.6, 11.4);
		rj.motorLowerLimit = -10;
		rj.motorUpperLimit = 10;
		this.allParts.push(rj);
		rj = new RevoluteJoint(this.lowerRightLeg, this.rightFoot, 10.85, 11.4);
		rj.motorLowerLimit = -10;
		rj.motorUpperLimit = 10;
		this.allParts.push(rj);
		this.shoulderJoint1 = new RevoluteJoint(this.upperTorso, this.upperLeftArm, 9, 3.7);
		this.shoulderJoint1.motorLowerLimit = -90;
		this.shoulderJoint1.motorUpperLimit = 90;
		this.allParts.push(this.shoulderJoint1);
		this.shoulderJoint2 = new RevoluteJoint(this.upperTorso, this.upperRightArm, 11, 3.7);
		this.shoulderJoint2.motorLowerLimit = -130;
		this.shoulderJoint2.motorUpperLimit = 50;
		this.allParts.push(this.shoulderJoint2);
		rj = new RevoluteJoint(this.upperLeftArm, this.lowerLeftArm, 7.7, 4.8);
		rj.motorLowerLimit = -100;
		rj.motorUpperLimit = 50;
		this.allParts.push(rj);
		rj = new RevoluteJoint(this.upperRightArm, this.lowerRightArm, 11.2, 5.4);
		rj.motorLowerLimit = -140;
		rj.motorUpperLimit = 10;
		this.allParts.push(rj);
	}

	public Init(e:Event):void {
		super.Init(e);
		if (!ControllerGameGlobals.playingReplay) this.ShowTutorialDialog(38, true);
	}

	public CloseTutorialDialog(num:number):void {
		if (num == 38) {
			this.ShowTutorialDialog(39, true);
		} else if (num == 39) {
			this.ShowTutorialDialog(40);
		} else if (num == 50) {
			this.m_loginWindow.HideFader();
			this.m_tutorialDialog.visible = false;
		} else if (num == 51) {
			this.m_newUserWindow.HideFader();
			this.m_tutorialDialog.visible = false;
		} else if (num == 52) {
			this.ShowTutorialDialog(54);
		} else {
			if (num == 54) {
				LSOManager.SetLevelDone(6);
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
		this.m_sidePanel.DisableStuffForHomeMoviesLevel();
		if (!ControllerGameGlobals.playingReplay) {
			if (!this.colouredFace && this.face.red == 255 && this.face.green == 216 && this.face.blue == 136) {
				this.colouredFace = true;
				this.ShowTutorialDialog(41);
			}
			if (this.colouredFace && !this.unoutlinedStuff && this.hair1.outline == false && this.hair2.outline == false && this.hair3.outline == false) {
				this.unoutlinedStuff = true;
				this.ShowTutorialDialog(42);
			}
			if (this.unoutlinedStuff && !this.movedLegsBack) {
				var foundLeg1:boolean = false;
				var foundLeg2:boolean = false;
				var len:number = this.allParts.length;
				for (var i:number = 0; i < len; i++) {
					if (this.allParts[i] == this.upperLeftLeg) foundLeg1 = true;
					if (this.allParts[i] == this.upperRightLeg) foundLeg2 = true;
					if (this.allParts[i] == this.lowerSkirt && foundLeg1 && foundLeg2) {
						this.movedLegsBack = true;
						this.ShowTutorialDialog(56);
						this.tutorialPart = new Rectangle(7.6, 5.8, 4.8, 0.5);
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
					}
				}
			}
			if (this.movedLegsBack && !this.createdRect && this.allParts[this.allParts.length - 1] instanceof FixedJoint && this.allParts[this.allParts.length - 2] instanceof Rectangle) {
				this.createdRect = true;
				this.ShowTutorialDialog(59);
				this.allParts = Util.RemoveFromArray(this.tutorialPart, this.allParts);
				this.redrawRobot = true;
			}
			if (this.createdRect && !this.fixated && this.allParts[this.allParts.length - 2] instanceof Rectangle && this.allParts[this.allParts.length - 2].isStatic) {
				this.fixated = true;
				this.ShowTutorialDialog(60);
			}
			if (this.fixated && !this.invisiblised && this.allParts[this.allParts.length - 2] instanceof Rectangle && this.allParts[this.allParts.length - 2].isStatic && this.allParts[this.allParts.length - 2].opacity == 0 && this.allParts[this.allParts.length - 2].outline == false) {
				this.invisiblised = true;
				this.ShowTutorialDialog(43);
			}
			if (this.invisiblised && !this.enabledShoulder && (this.shoulderJoint1.enableMotor || this.shoulderJoint2.enableMotor)) {
				this.enabledShoulder = true;
				this.ShowTutorialDialog(44);
			}
			if (this.copiedRagdoll && !this.pastedRagdoll && this.wasPasting && this.curAction != ControllerGameGlobals.PASTE) {
				this.pastedRagdoll = true;
				this.ShowTutorialDialog(46);
			}
			if (this.pastedRagdoll && !this.madeText && this.allParts[this.allParts.length - 1] instanceof TextPart) {
				this.dialog = this.allParts[this.allParts.length - 1];
				this.madeText = true;
				this.ShowTutorialDialog(47);
			}
			if (this.madeText && !this.enteredText && this.curAction != ControllerGameGlobals.RESIZING_TEXT && ((this.dialog.text != "New Text" && (this.dialog.w != 4 || this.dialog.h != 2)) || (this.allParts[this.allParts.length - 1] instanceof TextPart && this.allParts[this.allParts.length - 1].text != "New Text" && (this.allParts[this.allParts.length - 1].w != 4 || this.allParts[this.allParts.length - 1].h != 2)))) {
				this.enteredText = true;
				this.ShowTutorialDialog(48);
			}
			if (this.enteredText && !this.uncheckedAlwaysDisplay && (!this.dialog.alwaysVisible || (this.allParts[this.allParts.length - 1] instanceof TextPart && !this.allParts[this.allParts.length - 1].alwaysVisible))) {
				this.uncheckedAlwaysDisplay = true;
				this.ShowTutorialDialog(52, true);
			}
		}

		this.wasPasting = (this.curAction == ControllerGameGlobals.PASTE);
		this.wasSaveWindowVisible = (this.m_chooserWindow && this.m_chooserWindow.visible);
	}

	public copyButton():void {
		super.copyButton();
		if (this.enabledShoulder && !this.copiedRagdoll && Util.ObjectInArray(this.face, this.selectedParts) && Util.ObjectInArray(this.lowerSkirt, this.selectedParts) && Util.ObjectInArray(this.shoulderJoint1, this.selectedParts) && Util.ObjectInArray(this.shoulderJoint1, this.selectedParts) && Util.ObjectInArray(this.lowerLeftArm, this.selectedParts) && Util.ObjectInArray(this.upperRightArm, this.selectedParts) && Util.ObjectInArray(this.upperLeftLeg, this.selectedParts) && Util.ObjectInArray(this.lowerRightLeg, this.selectedParts)) {
			this.copiedRagdoll = true;
			this.ShowTutorialDialog(45);
		}
	}

	private ShowTutorialDialog(num:number, moreButton:boolean = false):void {
		this.ShowTutorialWindow(num, this.World2ScreenX(18), this.World2ScreenY(0.5), moreButton);
	}

	protected ChallengeOver():boolean {
		return false;
	}

	public GetScore():number {
		return 1000;
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
