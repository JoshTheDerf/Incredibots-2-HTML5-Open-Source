package Game.Tutorials
{
	import Box2D.Collision.b2ContactPoint;
	
	import Game.*;
	import Game.Graphics.*;
	
	import General.*;
	import Gui.ScoreWindow;
	import Parts.*;
	
	import flash.display.*;
	import flash.events.*;

	public class ControllerChallengeEditor extends ControllerChallenge
	{
		private var clickedBuildBox:Boolean = false;
		private var builtBuildBox:Boolean = false;
		private var clickedConditions:Boolean = false;
		private var addingCondition:Boolean = false;
		private var addedWinCondition:Boolean = false;
		private var addingLossCondition1:Boolean = false;
		private var addedLossCondition1:Boolean = false;
		private var addingLossCondition2:Boolean = false;
		private var addedLossCondition2:Boolean = false;
		private var clickedRestrictions:Boolean = false;
		private var excludedStuff:Boolean = false;
		private var disallowedControl:Boolean = false;
		
		private var wheel1:ShapePart;
		private var wheel2:ShapePart;
		private var garage:ShapePart;
		private var balloonJoint1:JointPart;
		private var balloonJoint2:JointPart;
		private var balloonJoint3:JointPart;
		private var th1:Thrusters;
		private var th2:Thrusters;
		private var th3:Thrusters;
		
		private var balloonTime:int = -1;
		
		public function ControllerChallengeEditor()
		{
			if (!playingReplay) LoadParts();
			playChallengeMode = false;
			playOnlyMode = false;
		}

		private function LoadParts():void {
			draw.m_drawXOff = -480;
			draw.m_drawYOff = -200;
			m_physScale = 16.875;
			
			var p:ShapePart = new Rectangle(-30, 10, 20, 5, false);
			p.isStatic = true;
			p.red = 100;
			p.green = 210;
			p.blue = 80;
			allParts.push(p);
			p = new Rectangle(5, 10, 30, 5, false);
			p.isStatic = true;
			p.red = 100;
			p.green = 210;
			p.blue = 80;
			allParts.push(p);
			
			p = new Rectangle(20, 6, 4, 4.1);
			p.blue = 200;
			p.green = 200;
			p.red = 200;
			p.collide = false;
			p.isStatic = true;
			p.terrain = true;
			allParts.push(p);
			p = new Rectangle(21, 7, 3, 3.1);
			p.blue = 30;
			p.green = 30;
			p.red = 30;
			p.collide = false;
			p.isStatic = true;
			allParts.push(p);

			var car:ShapePart = new Rectangle(-25, 8.8, 3, 1);
			car.isCameraFocus = true;
			car.blue = 40;
			car.green = 50;
			car.red = 245;
			allParts.push(car);
			wheel1 = new Circle(-24.5, 9.3, 0.7);
			wheel1.blue = 80;
			wheel1.green = 80;
			wheel1.red = 80;
			allParts.push(wheel1);
			wheel2 = new Circle(-22.5, 9.3, 0.7);
			wheel2.blue = 80;
			wheel2.green = 80;
			wheel2.red = 80;
			allParts.push(wheel2);

			var j:RevoluteJoint = new RevoluteJoint(car, wheel1, -24.5, 9.3);
			j.enableMotor = true;
			allParts.push(j);
			j = new RevoluteJoint(car, wheel2, -22.5, 9.3);
			j.enableMotor = true;
			allParts.push(j);
			
			p = new Rectangle(24, 6, 6, 4.1);
			p.blue = 200;
			p.green = 200;
			p.red = 200;
			p.collide = false;
			p.isStatic = true;
			p.terrain = true;
			allParts.push(p);
			garage = new Rectangle(29.95, 7, 0.2, 4.1);
			garage.opacity = 0;
			garage.outline = false;
			garage.isStatic = true;
			allParts.push(garage);
			
			p = new Rectangle(24.65, 7.5, 0.8, 0.8);
			p.blue = 200;
			p.green = 100;
			p.red = 20;
			p.collide = false;
			p.isStatic = true;
			p.outline = false;
			allParts.push(p);
			p = new Rectangle(25.95, 7.5, 0.8, 0.8);
			p.blue = 200;
			p.green = 100;
			p.red = 20;
			p.collide = false;
			p.isStatic = true;
			p.outline = false;
			allParts.push(p);
			p = new Rectangle(27.25, 7.5, 0.8, 0.8);
			p.blue = 200;
			p.green = 100;
			p.red = 20;
			p.collide = false;
			p.isStatic = true;
			p.outline = false;
			allParts.push(p);
			p = new Rectangle(28.55, 7.5, 0.8, 0.8);
			p.blue = 200;
			p.green = 100;
			p.red = 20;
			p.collide = false;
			p.isStatic = true;
			p.outline = false;
			allParts.push(p);

			p = new Rectangle(31.2, 7.9, 0.1, 0.6);
			p.blue = 230;
			p.green = 230;
			p.red = 230;
			allParts.push(p);
			p = new Rectangle(31.2, 8.4, 0.1, 0.6);
			p.blue = 230;
			p.green = 230;
			p.red = 230;
			allParts.push(p);
			p = new Rectangle(31.2, 8.9, 0.1, 0.6);
			p.blue = 230;
			p.green = 230;
			p.red = 230;
			allParts.push(p);
			p = new Rectangle(31.2, 9.4, 0.1, 0.61);
			p.blue = 230;
			p.green = 230;
			p.red = 230;
			allParts.push(p);
			
			p = new Rectangle(32.7, 7.9, 0.1, 0.6);
			p.blue = 230;
			p.green = 230;
			p.red = 230;
			allParts.push(p);
			p = new Rectangle(32.7, 8.4, 0.1, 0.6);
			p.blue = 230;
			p.green = 230;
			p.red = 230;
			allParts.push(p);
			p = new Rectangle(32.7, 8.9, 0.1, 0.6);
			p.blue = 230;
			p.green = 230;
			p.red = 230;
			allParts.push(p);
			p = new Rectangle(32.7, 9.4, 0.1, 0.61);
			p.blue = 230;
			p.green = 230;
			p.red = 230;
			allParts.push(p);
			
			p = new Rectangle(34.2, 7.9, 0.1, 0.6);
			p.blue = 230;
			p.green = 230;
			p.red = 230;
			allParts.push(p);
			p = new Rectangle(34.2, 8.4, 0.1, 0.6);
			p.blue = 230;
			p.green = 230;
			p.red = 230;
			allParts.push(p);
			p = new Rectangle(34.2, 8.9, 0.1, 0.6);
			p.blue = 230;
			p.green = 230;
			p.red = 230;
			allParts.push(p);
			p = new Rectangle(34.2, 9.4, 0.1, 0.61);
			p.blue = 230;
			p.green = 230;
			p.red = 230;
			allParts.push(p);

			p = new Triangle(31, 8, 31.5, 8, 31.25, 7.7);
			p.blue = 80;
			p.green = 230;
			p.red = 230;
			p.density = 1;
			allParts.push(p);
			p = new Triangle(32.5, 8, 33, 8, 32.75, 7.7);
			p.blue = 80;
			p.green = 230;
			p.red = 80;
			p.density = 1;
			allParts.push(p);
			p = new Triangle(34, 8, 34.5, 8, 34.25, 7.7);
			p.blue = 80;
			p.green = 80;
			p.red = 230;
			p.density = 1;
			allParts.push(p);
			p = new Circle(31.25, 7.2, 0.7);
			p.blue = 80;
			p.green = 230;
			p.red = 230;
			p.density = 1;
			p.terrain = true;
			allParts.push(p);
			p = new Circle(32.75, 7.2, 0.7);
			p.blue = 80;
			p.green = 230;
			p.red = 80;
			p.density = 1;
			p.terrain = true;
			allParts.push(p);
			p = new Circle(34.25, 7.2, 0.7);
			p.blue = 80;
			p.green = 80;
			p.red = 230;
			p.density = 1;
			p.terrain = true;
			allParts.push(p);
			
			var f:FixedJoint = new FixedJoint(allParts[allParts.length - 6], allParts[allParts.length - 3], 31.25, 7.8);
			allParts.push(f);
			f = new FixedJoint(allParts[allParts.length - 6], allParts[allParts.length - 3], 32.75, 7.8);
			allParts.push(f);
			f = new FixedJoint(allParts[allParts.length - 6], allParts[allParts.length - 3], 34.25, 7.8);
			allParts.push(f);

			j = new RevoluteJoint(allParts[allParts.length - 9], allParts[allParts.length - 21], 31.25, 7.95);
			allParts.push(j);
			j = new RevoluteJoint(allParts[allParts.length - 22], allParts[allParts.length - 21], 31.25, 8.45);
			allParts.push(j);
			j = new RevoluteJoint(allParts[allParts.length - 22], allParts[allParts.length - 21], 31.25, 8.95);
			allParts.push(j);
			j = new RevoluteJoint(allParts[allParts.length - 22], allParts[allParts.length - 21], 31.25, 9.45);
			allParts.push(j);
			balloonJoint1 = new RevoluteJoint(allParts[allParts.length - 22], allParts[allParts.length - 39], 31.25, 10.005);
			allParts.push(balloonJoint1);
			
			j = new RevoluteJoint(allParts[allParts.length - 13], allParts[allParts.length - 22], 32.75, 7.95);
			allParts.push(j);
			j = new RevoluteJoint(allParts[allParts.length - 23], allParts[allParts.length - 22], 32.75, 8.45);
			allParts.push(j);
			j = new RevoluteJoint(allParts[allParts.length - 23], allParts[allParts.length - 22], 32.75, 8.95);
			allParts.push(j);
			j = new RevoluteJoint(allParts[allParts.length - 23], allParts[allParts.length - 22], 32.75, 9.45);
			allParts.push(j);
			balloonJoint2 = new RevoluteJoint(allParts[allParts.length - 23], allParts[allParts.length - 44], 32.75, 10.005);
			allParts.push(balloonJoint2);
			
			j = new RevoluteJoint(allParts[allParts.length - 17], allParts[allParts.length - 23], 34.25, 7.95);
			allParts.push(j);
			j = new RevoluteJoint(allParts[allParts.length - 24], allParts[allParts.length - 23], 34.25, 8.45);
			allParts.push(j);
			j = new RevoluteJoint(allParts[allParts.length - 24], allParts[allParts.length - 23], 34.25, 8.95);
			allParts.push(j);
			j = new RevoluteJoint(allParts[allParts.length - 24], allParts[allParts.length - 23], 34.25, 9.45);
			allParts.push(j);
			balloonJoint3 = new RevoluteJoint(allParts[allParts.length - 24], allParts[allParts.length - 49], 34.25, 10.005);
			allParts.push(balloonJoint3);
			
			th1 = new Thrusters(allParts[allParts.length - 21], 31.25, 7.2);
			th1.autoOn = true;
			th1.strength = 2;
			th1.isBalloon = true;
			allParts.push(th1);
			th2 = new Thrusters(allParts[allParts.length - 21], 32.75, 7.2);
			th2.autoOn = true;
			th2.strength = 2;
			th2.isBalloon = true;
			allParts.push(th2);
			th3 = new Thrusters(allParts[allParts.length - 21], 34.25, 7.2);
			th3.autoOn = true;
			th3.strength = 2;
			th3.isBalloon = true;
			allParts.push(th3);
		}

		public override function Init(e:Event):void {
			super.Init(e);
			var t:TextPart = new TextPart(this, 21.3, 6.2, 3, 1, "GARAGE");
			allParts.push(t);
			if (!playingReplay) ShowTutorialDialog(90, true);
		}
		
		public override function CloseTutorialDialog(num:int):void {
			if (num == 90) {
				ShowTutorialDialog(91, true);
			} else if (num == 91) {
				ShowTutorialDialog(92);
			} else if (num == 97) {
				ShowTutorialWindow(98, 0, 160);
			} else if (num == 103) {
				ShowTutorialWindow(104, 0, 220);
			} else {
				if (num == 106) {
					LSOManager.SetLevelDone(9);
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
			if (!playingReplay) {
				if (!clickedBuildBox && curAction == DRAWING_BUILD_BOX) {
					clickedBuildBox = true;
					ShowTutorialDialog(93);
				} else if (clickedBuildBox && !builtBuildBox && NumBuildingAreas() == 1) {
					builtBuildBox = true;
					ShowTutorialDialog(94);
				} else if (builtBuildBox && !clickedConditions && m_conditionsDialog && m_conditionsDialog.visible) {
					clickedConditions = true;
					ShowTutorialWindow(95, 276, 130);
				} else if (clickedConditions && !addingCondition && !m_conditionsDialog.visible && curAction == SELECTING_SHAPE) {
					addingCondition = true;
					ShowTutorialDialog(96);
				} else if (addingCondition && !addedWinCondition && challenge.winConditions.length == 1) {
					addedWinCondition = true;
					ShowTutorialWindow(97, 0, 160, true);
				} else if (addedWinCondition && !addingLossCondition1 && !m_conditionsDialog.visible && curAction == DRAWING_HORIZONTAL_LINE) {
					addingLossCondition1 = true;
					ShowTutorialDialog(99);
				} else if (addingLossCondition1 && !addedLossCondition1 && challenge.lossConditions.length == 1) {
					addedLossCondition1 = true;
					ShowTutorialWindow(100, 276, 130);
				} else if (addedLossCondition1 && !addingLossCondition2 && !m_conditionsDialog.visible && curAction == SELECTING_SHAPE) {
					addingLossCondition2 = true;
					ShowTutorialDialog(101);
				} else if (addingLossCondition2 && !addedLossCondition2 && challenge.lossConditions.length == 2) {
					addedLossCondition2 = true;
					ShowTutorialWindow(102, 276, 130);
				} else if (addedLossCondition2 && !clickedRestrictions && m_restrictionsDialog && m_restrictionsDialog.visible) {
					clickedRestrictions = true;
					ShowTutorialWindow(103, 0, 220, true);
				} else if (clickedRestrictions && !excludedStuff && m_restrictionsDialog.fjBox.selected && m_restrictionsDialog.sjBox.selected && m_restrictionsDialog.thrustersBox.selected) {
					excludedStuff = true;
					ShowTutorialWindow(105, 0, 220);
				} else if (excludedStuff && !disallowedControl && !challenge.botControlAllowed && !m_restrictionsDialog.visible) {
					disallowedControl = true;
					ShowTutorialWindow(106, 276, 180);
				}
			}
			
			if (!playingReplay && simStarted && !paused) {
				balloonTime--;
				if (balloonTime == 5) {
					m_world.DestroyJoint(balloonJoint1.m_joint);
					balloonJoint1.m_joint = null;
				} else if (balloonTime == 0) {
					m_world.DestroyJoint(balloonJoint3.m_joint);
					balloonJoint3.m_joint = null;
				}
			}
		}

		public override function ContactAdded(point:b2ContactPoint):void {
			super.ContactAdded(point);
			
			if ((point.shape1 == wheel1.GetShape() && point.shape2 == garage.GetShape()) ||
				(point.shape1 == wheel2.GetShape() && point.shape2 == garage.GetShape()) ||
				(point.shape2 == wheel1.GetShape() && point.shape1 == garage.GetShape()) ||
				(point.shape2 == wheel2.GetShape() && point.shape1 == garage.GetShape())) {
					m_world.DestroyJoint(balloonJoint2.m_joint);
					balloonJoint2.m_joint = null;
					balloonTime = 10;
				}
		}

		private function ShowTutorialDialog(num:int, moreButton:Boolean = false):void {
			ShowTutorialWindow(num, World2ScreenX(-10), World2ScreenY(-10), moreButton);
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