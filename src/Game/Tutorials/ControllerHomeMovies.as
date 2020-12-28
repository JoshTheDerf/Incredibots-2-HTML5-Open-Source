package Game.Tutorials
{
	import Game.ControllerSandbox;
	import Game.Graphics.*;
	
	import General.*;
	import Gui.ScoreWindow;
	
	import Parts.*;
	
	import flash.display.*;
	import flash.events.*;

	public class ControllerHomeMovies extends ControllerSandbox
	{
		private var face:ShapePart;
		private var neck:ShapePart;
		private var hair1:ShapePart;
		private var hair2:ShapePart;
		private var hair3:ShapePart;
		private var nose:ShapePart;
		private var mouth:ShapePart;
		private var leftEye:ShapePart;
		private var rightEye:ShapePart;
		private var leftPupil:ShapePart;
		private var rightPupil:ShapePart;
		private var upperTorso:ShapePart;
		private var lowerTorso:ShapePart;
		private var leftHand:ShapePart;
		private var rightHand:ShapePart;
		private var leftFoot:ShapePart;
		private var rightFoot:ShapePart;
		private var upperLeftArm:ShapePart;
		private var lowerLeftArm:ShapePart;
		private var upperRightArm:ShapePart;
		private var lowerRightArm:ShapePart;
		private var upperLeftLeg:ShapePart;
		private var lowerLeftLeg:ShapePart;
		private var upperRightLeg:ShapePart;
		private var lowerRightLeg:ShapePart;
		private var upperSkirt:ShapePart;
		private var lowerSkirt:ShapePart;
		private var shoulderJoint1:RevoluteJoint;
		private var shoulderJoint2:RevoluteJoint;
		
		private var dialog:TextPart = null;
		private var tutorialPart:Part;
		
		private var wasPasting:Boolean = false;
		private var wasSaveWindowVisible:Boolean = false;
		
		private var colouredFace:Boolean = false;
		private var unoutlinedStuff:Boolean = false;
		private var movedLegsBack:Boolean = false;
		private var createdRect:Boolean = false;
		private var fixated:Boolean = false;
		private var invisiblised:Boolean = false;
		private var enabledShoulder:Boolean = false;
		private var copiedRagdoll:Boolean = false;
		private var pastedRagdoll:Boolean = false;
		private var madeText:Boolean = false;
		private var enteredText:Boolean = false;
		private var uncheckedAlwaysDisplay:Boolean = false;
		
		public function ControllerHomeMovies()
		{
			draw.m_drawXOff = 100;
			draw.m_drawYOff = -150;
			
			if (!playingReplay) LoadParts();
		}
		
		private function LoadParts():void {
			hair1 = new Circle(9.5, 1.0, 0.7);
			hair1.red = 255;
			hair1.green = 209;
			hair1.blue = 59;
			allParts.push(hair1);
			neck = new Rectangle(9.6, 2.8, 0.8, 1);
			neck.red = 255;
			neck.green = 216;
			neck.blue = 136;
			allParts.push(neck);
			face = new Circle(10, 2, 1.1);
			face.red = 180;
			face.green = 180;
			face.blue = 180;
			face.density = 5;
			allParts.push(face);
			hair2 = new Triangle(9.1, 0.8, 10.6, 0.75, 8.8, 1.9);
			hair2.red = 255;
			hair2.green = 209;
			hair2.blue = 59;
			allParts.push(hair2);
			hair3 = new Triangle(9.1, 0.8, 10.6, 0.75, 11.3, 1.9);
			hair3.red = 255;
			hair3.green = 209;
			hair3.blue = 59;
			allParts.push(hair3);
			leftEye = new Circle(9.6, 1.8, 0.2);
			leftEye.red = 244;
			leftEye.green = 243;
			leftEye.blue = 238;
			leftEye.outline = false;
			allParts.push(leftEye);
			rightEye = new Circle(10.4, 1.8, 0.2);
			rightEye.red = 244;
			rightEye.green = 243;
			rightEye.blue = 238;
			rightEye.outline = false;
			allParts.push(rightEye);
			leftPupil = new Circle(9.6, 1.8, 0.1);
			leftPupil.red = 124;
			leftPupil.green = 141;
			leftPupil.blue = 233;
			leftPupil.outline = false;
			allParts.push(leftPupil);
			rightPupil = new Circle(10.4, 1.8, 0.1);
			rightPupil.red = 124;
			rightPupil.green = 141;
			rightPupil.blue = 233;
			rightPupil.outline = false;
			allParts.push(rightPupil);
			nose = new Triangle(9.95, 1.9, 10.18, 2.2, 9.9, 2.3);
			nose.red = 255;
			nose.green = 216;
			nose.blue = 136;
			allParts.push(nose);
			mouth = new Triangle(9.5, 2.5, 10.4, 2.5, 10.1, 2.85);
			mouth.red = 244;
			mouth.green = 243;
			mouth.blue = 238;
			allParts.push(mouth);
			
			lowerSkirt = new Triangle(10, 6.3, 8.2, 8.7, 11.8, 8.7);
			lowerSkirt.red = 120;
			lowerSkirt.green = 108;
			lowerSkirt.blue = 110;
			allParts.push(lowerSkirt);
			upperSkirt = new Triangle(10, 5.3, 8.4, 7.7, 11.6, 7.7);
			upperSkirt.red = 120;
			upperSkirt.green = 108;
			upperSkirt.blue = 110;
			allParts.push(upperSkirt);
			
			// torso
			upperTorso = new Rectangle(8.9, 3.6, 2.2, 1.8);
			upperTorso.red = 255;
			upperTorso.green = 133;
			upperTorso.blue = 74;
			allParts.push(upperTorso);
			lowerTorso = new Rectangle(9.1, 5.3, 1.8, 1.5);
			lowerTorso.red = 255;
			lowerTorso.green = 133;
			lowerTorso.blue = 74;
			allParts.push(lowerTorso);
			
			// arms
			upperLeftArm = new Rectangle(7.35, 4.05, 2, 0.5);
			upperLeftArm.angle = -0.6;
			upperLeftArm.red = 255;
			upperLeftArm.green = 216;
			upperLeftArm.blue = 136;
			allParts.push(upperLeftArm);
			lowerLeftArm = new Rectangle(7.25, 5.1, 2, 0.5);
			lowerLeftArm.angle = 0.8;
			lowerLeftArm.red = 255;
			lowerLeftArm.green = 216;
			lowerLeftArm.blue = 136;
			allParts.push(lowerLeftArm);
			leftHand = new Circle(8.75, 5.85, 0.4);
			leftHand.red = 255;
			leftHand.green = 216;
			leftHand.blue = 136;
			allParts.push(leftHand);
			upperRightArm = new Rectangle(10.85, 3.65, 0.5, 2);
			upperRightArm.angle = -0.1;
			upperRightArm.red = 255;
			upperRightArm.green = 216;
			upperRightArm.blue = 136;
			allParts.push(upperRightArm);
			lowerRightArm = new Rectangle(10.95, 5.3, 0.5, 2);
			lowerRightArm.red = 255;
			lowerRightArm.green = 216;
			lowerRightArm.blue = 136;
			allParts.push(lowerRightArm);
			rightHand = new Circle(11.2, 7.2, 0.4);
			rightHand.red = 255;
			rightHand.green = 216;
			rightHand.blue = 136;
			allParts.push(rightHand);
			
			leftFoot = new Triangle(9, 12, 9.6, 11.2, 10.2, 12);
			leftFoot.red = 174;
			leftFoot.green = 134;
			leftFoot.blue = 174;
			allParts.push(leftFoot);
			rightFoot = new Triangle(10.25, 12, 10.85, 11.2, 11.45, 12);
			rightFoot.red = 174;
			rightFoot.green = 134;
			rightFoot.blue = 174;
			allParts.push(rightFoot);
			
			// legs
			upperLeftLeg = new Rectangle(9.2, 7.5, 0.6, 2.2);
			upperLeftLeg.angle = 0.1;
			upperLeftLeg.red = 255;
			upperLeftLeg.green = 216;
			upperLeftLeg.blue = 136;
			allParts.push(upperLeftLeg);
			lowerLeftLeg = new Rectangle(9.2, 9.4, 0.6, 2.2);
			lowerLeftLeg.angle = -0.1;
			lowerLeftLeg.red = 255;
			lowerLeftLeg.green = 216;
			lowerLeftLeg.blue = 136;
			allParts.push(lowerLeftLeg);
			upperRightLeg = new Rectangle(10.2, 7.5, 0.6, 2.2);
			upperRightLeg.angle = -0.05;
			upperRightLeg.red = 255;
			upperRightLeg.green = 216;
			upperRightLeg.blue = 136;
			allParts.push(upperRightLeg);
			lowerRightLeg = new Rectangle(10.4, 9.4, 0.6, 2.2);
			lowerRightLeg.angle = -0.15;
			lowerRightLeg.red = 255;
			lowerRightLeg.green = 216;
			lowerRightLeg.blue = 136;
			allParts.push(lowerRightLeg);
			
			var fj:FixedJoint = new FixedJoint(face, hair1, 10, 0.9);
			allParts.push(fj);
			fj = new FixedJoint(face, hair2, 10, 0.9);
			allParts.push(fj);
			fj = new FixedJoint(face, hair3, 10, 0.9);
			allParts.push(fj);
			fj = new FixedJoint(face, leftEye, 10, 0.9);
			allParts.push(fj);
			fj = new FixedJoint(face, leftPupil, 10, 0.9);
			allParts.push(fj);
			fj = new FixedJoint(face, rightEye, 10, 0.9);
			allParts.push(fj);
			fj = new FixedJoint(face, rightPupil, 10, 0.9);
			allParts.push(fj);
			fj = new FixedJoint(face, nose, 10, 0.9);
			allParts.push(fj);
			fj = new FixedJoint(face, mouth, 10, 0.9);
			allParts.push(fj);
			fj = new FixedJoint(lowerLeftArm, leftHand, 10, 0.9);
			allParts.push(fj);
			fj = new FixedJoint(lowerRightArm, rightHand, 10, 0.9);
			allParts.push(fj);
			fj = new FixedJoint(face, neck, 10, 0.9);
			allParts.push(fj);
			
			var rj:RevoluteJoint = new RevoluteJoint(neck, upperTorso, 10, 3.7);
			rj.motorLowerLimit = -10;
			rj.motorUpperLimit = 10;
			allParts.push(rj);
			rj = new RevoluteJoint(lowerTorso, upperTorso, 10, 5.35);
			rj.motorLowerLimit = -5;
			rj.motorUpperLimit = 5;
			allParts.push(rj);
			rj = new RevoluteJoint(lowerTorso, upperSkirt, 10, 6.5);
			rj.motorLowerLimit = -10;
			rj.motorUpperLimit = 10;
			allParts.push(rj);
			rj = new RevoluteJoint(lowerSkirt, upperSkirt, 10, 7.2);
			rj.motorLowerLimit = -10;
			rj.motorUpperLimit = 10;
			allParts.push(rj);
			rj = new RevoluteJoint(lowerSkirt, upperLeftLeg, 9.6, 7.6);
			rj.motorLowerLimit = -40;
			rj.motorUpperLimit = 40;
			allParts.push(rj);
			rj = new RevoluteJoint(lowerSkirt, upperRightLeg, 10.4, 7.6);
			rj.motorLowerLimit = -40;
			rj.motorUpperLimit = 40;
			allParts.push(rj);
			rj = new RevoluteJoint(lowerLeftLeg, upperLeftLeg, 9.4, 9.55);
			rj.motorLowerLimit = -20;
			rj.motorUpperLimit = 20;
			allParts.push(rj);
			rj = new RevoluteJoint(lowerRightLeg, upperRightLeg, 10.6, 9.55);
			rj.motorLowerLimit = -20;
			rj.motorUpperLimit = 20;
			allParts.push(rj);
			rj = new RevoluteJoint(lowerLeftLeg, leftFoot, 9.6, 11.4);
			rj.motorLowerLimit = -10;
			rj.motorUpperLimit = 10;
			allParts.push(rj);
			rj = new RevoluteJoint(lowerRightLeg, rightFoot, 10.85, 11.4);
			rj.motorLowerLimit = -10;
			rj.motorUpperLimit = 10;
			allParts.push(rj);
			shoulderJoint1 = new RevoluteJoint(upperTorso, upperLeftArm, 9, 3.7);
			shoulderJoint1.motorLowerLimit = -90;
			shoulderJoint1.motorUpperLimit = 90;
			allParts.push(shoulderJoint1);
			shoulderJoint2 = new RevoluteJoint(upperTorso, upperRightArm, 11, 3.7);
			shoulderJoint2.motorLowerLimit = -130;
			shoulderJoint2.motorUpperLimit = 50;
			allParts.push(shoulderJoint2);
			rj = new RevoluteJoint(upperLeftArm, lowerLeftArm, 7.7, 4.8);
			rj.motorLowerLimit = -100;
			rj.motorUpperLimit = 50;
			allParts.push(rj);
			rj = new RevoluteJoint(upperRightArm, lowerRightArm, 11.2, 5.4);
			rj.motorLowerLimit = -140;
			rj.motorUpperLimit = 10;
			allParts.push(rj);
		}
		
		public override function Init(e:Event):void {
			super.Init(e);
			if (!playingReplay) ShowTutorialDialog(38, true);
		}
		
		public override function CloseTutorialDialog(num:int):void {
			if (num == 38) {
				ShowTutorialDialog(39, true);
			} else if (num == 39) {
				ShowTutorialDialog(40);
			} else if (num == 50) {
				m_loginWindow.HideFader();
				m_tutorialDialog.visible = false;
			} else if (num == 51) {
				m_newUserWindow.HideFader();
				m_tutorialDialog.visible = false;
			} else if (num == 52) {
				ShowTutorialDialog(54);
			} else {
				if (num == 54) {
					LSOManager.SetLevelDone(6);
					m_fader.visible = true;
					if (m_scoreWindow) {
						try {
							removeChild(m_scoreWindow);
						} catch (type:Error) {
							
						}
					}
					m_scoreWindow = new ScoreWindow(this, GetScore());
					musicChannel = winSound.play();
					addChild(m_scoreWindow);
				}
				super.CloseTutorialDialog(num);
			}
		}
		
		public override function Update():void {
			super.Update();
			m_sidePanel.DisableStuffForHomeMoviesLevel();
			if (!playingReplay) {
				if (!colouredFace && face.red == 255 && face.green == 216 && face.blue == 136) {
					colouredFace = true;
					ShowTutorialDialog(41);
				}
				if (colouredFace && !unoutlinedStuff && hair1.outline == false && hair2.outline == false && hair3.outline == false) {
					unoutlinedStuff = true;
					ShowTutorialDialog(42);
				}
				if (unoutlinedStuff && !movedLegsBack) {
					var foundLeg1:Boolean = false;
					var foundLeg2:Boolean = false;
					var len:int = allParts.length;
					for (var i:int = 0; i < len; i++) {
						if (allParts[i] == upperLeftLeg) foundLeg1 = true;
						if (allParts[i] == upperRightLeg) foundLeg2 = true;
						if (allParts[i] == lowerSkirt && foundLeg1 && foundLeg2) {
							movedLegsBack = true;
							ShowTutorialDialog(56);
							tutorialPart = new Rectangle(7.6, 5.8, 4.8, 0.5);
							tutorialPart.isEditable = false;
							tutorialPart.isStatic = true;
							(tutorialPart as ShapePart).drawAnyway = true;
							(tutorialPart as ShapePart).collide = false;
							(tutorialPart as ShapePart).red = 75;
							(tutorialPart as ShapePart).green = 185;
							(tutorialPart as ShapePart).blue = 75;
							(tutorialPart as ShapePart).opacity = 0;
							allParts.push(tutorialPart);
							redrawRobot = true;
						}
					}
				}
				if (movedLegsBack && !createdRect && allParts[allParts.length - 1] is FixedJoint && allParts[allParts.length - 2] is Rectangle) {
					createdRect = true;
					ShowTutorialDialog(59);
					allParts = Util.RemoveFromArray(tutorialPart, allParts);
					redrawRobot = true;
				}
				if (createdRect && !fixated && allParts[allParts.length - 2] is Rectangle && allParts[allParts.length - 2].isStatic) {
					fixated = true;
					ShowTutorialDialog(60);
				}
				if (fixated && !invisiblised && allParts[allParts.length - 2] is Rectangle && allParts[allParts.length - 2].isStatic && allParts[allParts.length - 2].opacity == 0 && allParts[allParts.length - 2].outline == false) {
					invisiblised = true;
					ShowTutorialDialog(43);
				}
				if (invisiblised && !enabledShoulder && (shoulderJoint1.enableMotor || shoulderJoint2.enableMotor)) {
					enabledShoulder = true;
					ShowTutorialDialog(44);
				}
				if (copiedRagdoll && !pastedRagdoll && wasPasting && curAction != PASTE) {
					pastedRagdoll = true;
					ShowTutorialDialog(46);
				}
				if (pastedRagdoll && !madeText && allParts[allParts.length - 1] is TextPart) {
					dialog = allParts[allParts.length - 1];
					madeText = true;
					ShowTutorialDialog(47);
				}
				if (madeText && !enteredText && curAction != RESIZING_TEXT && ((dialog.text != "New Text" && (dialog.w != 4 || dialog.h != 2)) || (allParts[allParts.length - 1] is TextPart && allParts[allParts.length - 1].text != "New Text" && (allParts[allParts.length - 1].w != 4 || allParts[allParts.length - 1].h != 2)))) {
					enteredText = true;
					ShowTutorialDialog(48);
				}
				if (enteredText && !uncheckedAlwaysDisplay && (!dialog.alwaysVisible || (allParts[allParts.length - 1] is TextPart && !allParts[allParts.length - 1].alwaysVisible))) {
					uncheckedAlwaysDisplay = true;
					ShowTutorialDialog(52, true);
				}
			}
			
			wasPasting = (curAction == PASTE);
			wasSaveWindowVisible = (m_chooserWindow && m_chooserWindow.visible);
		}
		
		public override function copyButton(e:MouseEvent):void {
			super.copyButton(e);
			if (enabledShoulder && !copiedRagdoll && Util.ObjectInArray(face, selectedParts) && Util.ObjectInArray(lowerSkirt, selectedParts) && Util.ObjectInArray(shoulderJoint1, selectedParts) && Util.ObjectInArray(shoulderJoint1, selectedParts) && Util.ObjectInArray(lowerLeftArm, selectedParts) && Util.ObjectInArray(upperRightArm, selectedParts) && Util.ObjectInArray(upperLeftLeg, selectedParts) && Util.ObjectInArray(lowerRightLeg, selectedParts)) {
				copiedRagdoll = true;
				ShowTutorialDialog(45);
			}
		}
		
		private function ShowTutorialDialog(num:int, moreButton:Boolean = false):void {
			ShowTutorialWindow(num, World2ScreenX(18), World2ScreenY(0.5), moreButton);
		}
		
		protected override function ChallengeOver():Boolean {
			return false;
		}
		
		public override function GetScore():int {
			return 1000;
		}
		
		public override function saveButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function loadButton(e:MouseEvent, makeThemRate:Boolean = true):void {
			ShowDisabledDialog();
		}
		
		public override function saveReplayButton(e:MouseEvent):void {
			ShowDisabledDialog();
			if (m_scoreWindow && m_scoreWindow.visible) m_scoreWindow.ShowFader();
		}

		public override function submitButton(e:MouseEvent):void {
			ShowDisabledDialog();
			if (m_scoreWindow && m_scoreWindow.visible) m_scoreWindow.ShowFader();
		}

		public override function viewReplayButton(e:MouseEvent):void {
			ShowDisabledDialog();
			if (m_scoreWindow && m_scoreWindow.visible) m_scoreWindow.ShowFader();
		}

		public override function loadRobotButton(e:MouseEvent, makeThemRate:Boolean = true):void {
			ShowDisabledDialog();
		}

		public override function loadReplayButton(e:MouseEvent, makeThemRate:Boolean = true):void {
			ShowDisabledDialog();
		}

		public override function loadChallengeButton(e:MouseEvent, makeThemRate:Boolean = true):void {
			ShowDisabledDialog();
		}

		public override function commentButton(e:MouseEvent, robotID:String = "", robotPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function linkButton(e:MouseEvent, robotID:String = "", robotPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function embedButton(e:MouseEvent, robotID:String = "", robotPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function commentReplayButton(e:MouseEvent, replayID:String = "", replayPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function linkReplayButton(e:MouseEvent, replayID:String = "", replayPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function embedReplayButton(e:MouseEvent, replayID:String = "", replayPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
	}
}