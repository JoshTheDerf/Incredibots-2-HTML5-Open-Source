package Game
{
	import Box2D.Collision.*;
	
	import General.Database;
	import Parts.TextPart;
	
	import flash.events.*;
	
	public class ControllerChallenge extends ControllerSandbox
	{
		public static var challenge:Challenge;
		public static var playChallengeMode:Boolean = false;
		public static var playOnlyMode:Boolean = false;
		
		public function ControllerChallenge()
		{
			if (!challenge) challenge = new Challenge(settings);
			BuildBuildArea();
		}
		
		public override function Update():void {
			super.Update();
			
			if (simStarted && !paused) {
				for (var i:int = 0; i < challenge.winConditions.length; i++) {
					challenge.winConditions[i].Update(allParts, cannonballs);
				}
				for (i = 0; i < challenge.lossConditions.length; i++) {
					challenge.lossConditions[i].Update(allParts, cannonballs);
				}
			}
			
			if (playChallengeMode) {
				m_guiPanel.ShowEditButton();
			} else {
				m_guiPanel.HideEditButton();
			}
		}
		
		public override function playButton(e:MouseEvent, maybeShowAd:Boolean = true):void {
			if (!playChallengeMode) {
				challenge.allParts = allParts.filter(PartIsEditable);
				playChallengeMode = true;
				for (var i:int = 0; i < challenge.allParts.length; i++) {
					challenge.allParts[i].isEditable = false;
				}
				m_sidePanel.visible = false;
				CheckIfPartsFit();
				selectedParts = new Array();
				actions = new Array();
				lastAction = -1;
			} else {
				if (!simStarted) {
					for (i = 0; i < challenge.winConditions.length; i++) {
						challenge.winConditions[i].isSatisfied = false;
					}
					for (i = 0; i < challenge.lossConditions.length; i++) {
						challenge.lossConditions[i].isSatisfied = false;
					}
				}
				super.playButton(e, maybeShowAd);
			}
		}
		
		public override function editButton(e:MouseEvent, confirmed:Boolean = false):void {
			if (confirmed) {
				m_fader.visible = false;
				m_progressDialog.visible = false;
				playChallengeMode = false;
				allParts = new Array();
				RefreshSandboxSettings();
				for (var i:int = 0; i < challenge.allParts.length; i++) {
					allParts.push(challenge.allParts[i]);
					challenge.allParts[i].isEditable = true;
					if (challenge.allParts[i] is TextPart) {
						if (challenge.allParts[i].inFront) {
							addChildAt(challenge.allParts[i].m_textField, getChildIndex(m_canvas) + 1);
						} else {
							addChildAt(challenge.allParts[i].m_textField, getChildIndex(m_canvas));
						}
					}
				}
			} else {
				m_fader.visible = true;
				if (playOnlyMode) {
					ShowDialog3("This challenge is uneditable!");
					m_progressDialog.ShowOKButton();
					m_progressDialog.StopTimer();
				} else {
					ShowConfirmDialog("Are you sure you want to edit this challenge?          (Your current robot will be lost)", 11);
				}
			}
		}
		
		public override function circleButton(e:MouseEvent):void {
			if (playChallengeMode && !challenge.circlesAllowed) {
				m_fader.visible = true;
				ShowDialog3("Circles are not allowed in this challenge!");
				m_progressDialog.ShowOKButton();
				m_progressDialog.StopTimer();
			} else {
				super.circleButton(e);
			}
		}
		
		public override function rectButton(e:MouseEvent):void {
			if (playChallengeMode && !challenge.rectanglesAllowed) {
				m_fader.visible = true;
				ShowDialog3("Rectangles are not allowed in this challenge!");
				m_progressDialog.ShowOKButton();
				m_progressDialog.StopTimer();
			} else {
				super.rectButton(e);
			}
		}
		
		public override function triangleButton(e:MouseEvent):void {
			if (playChallengeMode && !challenge.trianglesAllowed) {
				m_fader.visible = true;
				ShowDialog3("Triangles are not allowed in this challenge!");
				m_progressDialog.ShowOKButton();
				m_progressDialog.StopTimer();
			} else {
				super.triangleButton(e);
			}
		}
		
		public override function fjButton(e:MouseEvent):void {
			if (playChallengeMode && !challenge.fixedJointsAllowed) {
				m_fader.visible = true;
				ShowDialog3("Fixed Joints are not allowed in this challenge!");
				m_progressDialog.ShowOKButton();
				m_progressDialog.StopTimer();
			} else {
				super.fjButton(e);
			}
		}
		
		public override function rjButton(e:MouseEvent):void {
			if (playChallengeMode && !challenge.rotatingJointsAllowed) {
				m_fader.visible = true;
				ShowDialog3("Rotating Joints are not allowed in this challenge!");
				m_progressDialog.ShowOKButton();
				m_progressDialog.StopTimer();
			} else {
				super.rjButton(e);
			}
		}
		
		public override function pjButton(e:MouseEvent):void {
			if (playChallengeMode && !challenge.slidingJointsAllowed) {
				m_fader.visible = true;
				ShowDialog3("Sliding Joints are not allowed in this challenge!");
				m_progressDialog.ShowOKButton();
				m_progressDialog.StopTimer();
			} else {
				super.pjButton(e);
			}
		}
		
		public override function thrustersButton(e:MouseEvent):void {
			if (playChallengeMode && !challenge.thrustersAllowed) {
				m_fader.visible = true;
				ShowDialog3("Thrusters are not allowed in this challenge!");
				m_progressDialog.ShowOKButton();
				m_progressDialog.StopTimer();
			} else {
				super.thrustersButton(e);
			}
		}		
		
		public override function cannonButton(e:MouseEvent):void {
			if (playChallengeMode && !challenge.cannonsAllowed) {
				m_fader.visible = true;
				ShowDialog3("Cannons are not allowed in this challenge!");
				m_progressDialog.ShowOKButton();
				m_progressDialog.StopTimer();
			} else {
				super.cannonButton(e);
			}
		}	
		
		protected override function GetBuildingArea():b2AABB {
			return challenge.buildAreas[0];
		}
		
		protected override function GetBuildingAreaNumber(i:int):b2AABB {
			return challenge.buildAreas[i];
		}
		
		protected override function NumBuildingAreas():int {
			return challenge.buildAreas.length;
		}
		
		public function DeleteBuildBoxes(e:Event):void {
			m_fader.visible = false;
			m_progressDialog.visible = false;
			for (var i:int = 0; i < m_buildAreas.length; i++) {
				removeChild(m_buildAreas[i]);
				removeChild(m_badBuildAreas[i]);
				removeChild(m_selectedBuildAreas[i]);
			}
			m_buildAreas = new Array();
			m_badBuildAreas = new Array();
			m_selectedBuildAreas = new Array();
			challenge.buildAreas = new Array();
			redrawBuildArea = true;
		}
		
		public virtual override function ContactAdded(point:b2ContactPoint):void {
			for (var i:int = 0; i < challenge.winConditions.length; i++) {
				challenge.winConditions[i].ContactAdded(point, allParts, cannonballs);
			}
			for (i = 0; i < challenge.lossConditions.length; i++) {
				challenge.lossConditions[i].ContactAdded(point, allParts, cannonballs);
			}
		}
		
		protected override function ChallengeOver():Boolean {
			return (WonChallenge() || LostChallenge());
		}
				
		protected override function WonChallenge():Boolean {
			if (challenge.winConditions.length == 0) return false;
			for (var i:int = 0; i < challenge.lossConditions.length; i++) {
				if (challenge.lossConditions[i].isSatisfied) return false;
			}
			if (challenge.winConditionsAnded) {
				for (i = 0; i < challenge.winConditions.length; i++) {
					if (!challenge.winConditions[i].isSatisfied) return false;
				}
				return true;
			} else {
				for (i = 0; i < challenge.winConditions.length; i++) {
					if (challenge.winConditions[i].isSatisfied) return true;
				}
				return false;
			}
		}
		
		protected override function LostChallenge():Boolean {
			for (var i:int = 0; i < challenge.lossConditions.length; i++) {
				if (challenge.lossConditions[i].isSatisfied && challenge.lossConditions[i].immediate) {
					return true;
				}
			}
			return false;
		}

		public virtual override function GetScore():int {
			return 10000 - frameCounter;
		}

		public override function submitButton(e:MouseEvent):void {
			if (Main.inIFrame) {
				m_fader.visible = true;
				ShowConfirmDialog("Redirect to incredibots2.com?", 7);
			} else {
				if (!curRobotEditable) return;
				if (curChallengeID == "") {
					m_scoreWindow.ShowFader();
					ShowDialog2("You must save your challenge publicly first!");
				} else {
					if (userName != "_Public") {
						AddSyncPoint();
						if (viewingUnsavedReplay) Database.SaveReplay(userName, password, replay, "_ScoreReplay", "This replay is saved for a score", curRobotID, new Robot(allParts, ControllerSandbox.settings), (ChallengeOver() ? GetScore() : -1), curChallengeID, 1, finishSavingReplay);
						else Database.SaveReplay(userName, password, new Replay(cameraMovements, syncPoints, keyPresses, frameCounter, Database.VERSION_STRING_FOR_REPLAYS), "_ScoreReplay", "This replay is saved for a score", curRobotID, new Robot(allParts, ControllerSandbox.settings), (ChallengeOver() ? GetScore() : -1), curChallengeID, 1, finishSavingReplay);
						m_scoreWindow.ShowFader();
						ShowDialog("Submitting score...");
						clickedSubmitScore = true;
					} else {
						clickedSubmitScore = true;
						loginButton(e, true, false);
					}
				}
			}
		}
	}
}