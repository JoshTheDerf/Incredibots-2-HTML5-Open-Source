package Game.Tutorials
{
	import Box2D.Collision.b2AABB;
	
	import Game.Graphics.*;
	
	import General.Util;
	
	import Parts.*;
	
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;

	public class ControllerDumpbot extends ControllerTutorial
	{
		private var object1:ShapePart;
		private var object2:ShapePart;
		private var object3:ShapePart;
		private var controlText:TextField;
		
		private var tutorialPart:Part;
		private var tutorialPart2:Part;
		
		private var madeRectangle:Boolean = false;
		private var madeWheels:Boolean = false;
		private var madeJoints:Boolean = false;
		private var madeArm:Boolean = false;
		private var clickedJoint:Boolean = false;
		private var madeArmJoint:Boolean = false;
		private var solidifiedArmJoint:Boolean = false;
		private var changedControlKeys:Boolean = false;
		private var madeBucket:Boolean = false;
		private var fixedBucket:Boolean = false;
		private var fixedBucket2:Boolean = false;
		private var adjustedMotor:Boolean = false;
		
		public function ControllerDumpbot()
		{
			draw.m_drawXOff = 360;
			draw.m_drawYOff = -220;
			
			// start platform
			sGround3.graphics.lineStyle(6, 0x9D8941);
			sGround3.graphics.beginFill(0xCEB456);
			sGround3.graphics.drawRect(6598, 1610, 650, 56);
			sGround3.graphics.endFill();
			
			object1 = new Rectangle(-0.5, 9, 1, 1);
			object1.red = 255;
			object1.green = 207;
			object1.blue = 94;
			object1.isEditable = false;
			object1.drawAnyway = false;
			allParts.push(object1);
			object2 = new Circle(0.9, 9.7, 0.3);
			object2.red = 255;
			object2.green = 207;
			object2.blue = 94;
			object2.isEditable = false;
			object2.drawAnyway = false;
			allParts.push(object2);
			object3 = new Triangle(-2, 9.9, -1, 9.9, -1.5, 8.9);
			object3.red = 255;
			object3.green = 207;
			object3.blue = 94;
			object3.isEditable = false;
			object3.drawAnyway = false;
			allParts.push(object3);
			
			if (!playingReplay) {
				tutorialPart = new Rectangle(30, 7, 3.5, 1.5);
				tutorialPart.isEditable = false;
				tutorialPart.isStatic = true;
				(tutorialPart as ShapePart).drawAnyway = true;
				(tutorialPart as ShapePart).collide = false;
				(tutorialPart as ShapePart).red = 75;
				(tutorialPart as ShapePart).green = 185;
				(tutorialPart as ShapePart).blue = 75;
				(tutorialPart as ShapePart).opacity = 0;
				allParts.push(tutorialPart);
			}
			
			controlText = new TextField();
			controlText.x = 0;
			controlText.y = 102;
			controlText.width = 800;
			controlText.text = "Use the left/right arrow keys to rotate the wheels. Control the loading arm with the up/down arrow keys.\nDump the objects into the pit to the left.";
			controlText.selectable = false;
			controlText.visible = false;
			var format:TextFormat = new TextFormat();
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			format.size = 14;
			format.leading = 1;
			controlText.setTextFormat(format);
			addChild(controlText);
		}
		
		public override function Init(e:Event):void {
			super.Init(e);
			if (!viewingUnsavedReplay) ShowTutorialDialog(21);
		}
		
		public override function Update():void {
			super.Update();
			if (!viewingUnsavedReplay) controlText.visible = !paused;
			m_sidePanel.DisableStuffForDumpbotLevel();
			if (!playingReplay) {
				if (!madeRectangle && allParts[allParts.length - 1] is Rectangle && allParts[allParts.length - 1].isEditable) {
					madeRectangle = true;
					allParts = Util.RemoveFromArray(tutorialPart, allParts);
					tutorialPart = new Circle(30.5, 7.75, 1);
					tutorialPart.isEditable = false;
					tutorialPart.isStatic = true;
					(tutorialPart as ShapePart).drawAnyway = true;
					(tutorialPart as ShapePart).collide = false;
					(tutorialPart as ShapePart).red = 75;
					(tutorialPart as ShapePart).green = 185;
					(tutorialPart as ShapePart).blue = 75;
					(tutorialPart as ShapePart).opacity = 0;
					allParts.push(tutorialPart);
					tutorialPart2 = new Circle(33, 7.75, 1);
					tutorialPart2.isEditable = false;
					tutorialPart2.isStatic = true;
					(tutorialPart2 as ShapePart).drawAnyway = true;
					(tutorialPart2 as ShapePart).collide = false;
					(tutorialPart2 as ShapePart).red = 75;
					(tutorialPart2 as ShapePart).green = 185;
					(tutorialPart2 as ShapePart).blue = 75;
					(tutorialPart2 as ShapePart).opacity = 0;
					allParts.push(tutorialPart2);
					redrawRobot = true;
					ShowTutorialDialog(22);
				}
				if (madeRectangle && !madeWheels && allParts[allParts.length - 1] is Circle && allParts[allParts.length - 2] is Circle && allParts[allParts.length - 1].isEditable && allParts[allParts.length - 2].isEditable && allParts[allParts.length - 1].isEnabled && allParts[allParts.length - 2].isEnabled && curAction != PASTE) {
					madeWheels = true;
					ShowTutorialDialog(23);
				}
				if (madeWheels && !madeJoints && allParts[allParts.length - 1] is RevoluteJoint && allParts[allParts.length - 2] is RevoluteJoint && allParts[allParts.length - 1].enableMotor && allParts[allParts.length - 2].enableMotor && allParts[allParts.length - 1].isEnabled && allParts[allParts.length - 2].isEnabled) {
					madeJoints = true;
					allParts = Util.RemoveFromArray(tutorialPart, allParts);
					allParts = Util.RemoveFromArray(tutorialPart2, allParts);
					tutorialPart = new Rectangle(28.5, 8, 2, 0.2);
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
					ShowTutorialDialog(24);
				}
				if (madeJoints && !madeArm && allParts[allParts.length - 1] is Rectangle && allParts[allParts.length - 1].isEditable && allParts[allParts.length - 1].isEnabled) {
					madeArm = true;
					allParts = Util.RemoveFromArray(tutorialPart, allParts);
					redrawRobot = true;
					ShowTutorialDialog(25);
				}
				if (madeArm && !clickedJoint && curAction == NEW_REVOLUTE_JOINT) {
					clickedJoint = true;
					tutorialPart = new Circle(30.3, 8.1, 0.15);
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
					ShowTutorialDialog(58);
					snapToCenter = false;
				}
				if (clickedJoint && !madeArmJoint && allParts[allParts.length - 1] is RevoluteJoint && allParts[allParts.length - 1].isEnabled) {
					madeArmJoint = true;
					allParts = Util.RemoveFromArray(tutorialPart, allParts);
					redrawRobot = true;
					ShowTutorialDialog(26);
				}
				if (madeArmJoint && !solidifiedArmJoint && allParts[allParts.length - 1] is RevoluteJoint && allParts[allParts.length - 1].enableMotor && allParts[allParts.length - 1].isStiff) {
					solidifiedArmJoint = true;
					ShowTutorialDialog(57);
				}
				if (solidifiedArmJoint && !changedControlKeys && allParts[allParts.length - 1] is RevoluteJoint && allParts[allParts.length - 1].motorCWKey == 38 && allParts[allParts.length - 1].motorCCWKey == 40) {
					changedControlKeys = true;
					tutorialPart = new Rectangle(28.5, 5.6, 1.5, 0.1);
					tutorialPart.isEditable = false;
					tutorialPart.isStatic = true;
					(tutorialPart as ShapePart).drawAnyway = true;
					(tutorialPart as ShapePart).collide = false;
					(tutorialPart as ShapePart).red = 75;
					(tutorialPart as ShapePart).green = 185;
					(tutorialPart as ShapePart).blue = 75;
					(tutorialPart as ShapePart).opacity = 0;
					allParts.push(tutorialPart);
					tutorialPart2 = new Rectangle(29.6, 4.5, 0.1, 1.2);
					tutorialPart2.isEditable = false;
					tutorialPart2.isStatic = true;
					(tutorialPart2 as ShapePart).drawAnyway = true;
					(tutorialPart2 as ShapePart).collide = false;
					(tutorialPart2 as ShapePart).red = 75;
					(tutorialPart2 as ShapePart).green = 185;
					(tutorialPart2 as ShapePart).blue = 75;
					(tutorialPart2 as ShapePart).opacity = 0;
					allParts.push(tutorialPart2);
					redrawRobot = true;
					ShowTutorialDialog(27);
				}
				if (changedControlKeys && !madeBucket && allParts[allParts.length - 1] is Rectangle && allParts[allParts.length - 2] is Rectangle && allParts[allParts.length - 1].isEditable && allParts[allParts.length - 2].isEditable && allParts[allParts.length - 1].isEnabled && allParts[allParts.length - 2].isEnabled) {
					madeBucket = true;
					allParts = Util.RemoveFromArray(tutorialPart, allParts);
					allParts = Util.RemoveFromArray(tutorialPart2, allParts);
					ShowTutorialDialog(28);
				}
				if (madeBucket && !fixedBucket && allParts[allParts.length - 1] is FixedJoint && allParts[allParts.length - 1].isEnabled) {
					fixedBucket = true;
					ShowTutorialDialog(29);
				}
				if (fixedBucket && !fixedBucket2 && allParts[allParts.length - 1] is FixedJoint && allParts[allParts.length - 2] is FixedJoint && allParts[allParts.length - 1].isEnabled && allParts[allParts.length - 2].isEnabled) {
					fixedBucket2 = true;
					ShowTutorialDialog(30);
				}
				if (fixedBucket2 && !adjustedMotor && selectedParts.length == 1 && selectedParts[0] is RevoluteJoint && selectedParts[0].motorSpeed < 15 && selectedParts[0].motorStrength > 15 && selectedParts[0].isStiff) {
					adjustedMotor = true;
					ShowTutorialDialog(31);
				}
			}
		}
		
		private function ShowTutorialDialog(num:int, moreButton:Boolean = false):void {
			ShowTutorialWindow(num, World2ScreenX(14.5), World2ScreenY(0.5), moreButton);
		}
		
		protected override function ChallengeOver():Boolean {
			if (simStarted) {
				return (object1.GetBody().GetWorldCenter().x > -15 && object1.GetBody().GetWorldCenter().y > 12 && object1.GetBody().GetWorldCenter().x < -3 &&
						object2.GetBody().GetWorldCenter().x > -15 && object2.GetBody().GetWorldCenter().y > 12 && object2.GetBody().GetWorldCenter().x < -3 &&
						object3.GetBody().GetWorldCenter().x > -15 && object3.GetBody().GetWorldCenter().y > 12 && object3.GetBody().GetWorldCenter().x < -3);
			} else {
				return false;
			}
		}

		protected override function GetBuildingArea():b2AABB {
			var area:b2AABB = new b2AABB();
			area.lowerBound.Set(26, 2);
			area.upperBound.Set(36, 9.42);
			return area;
		}
		
		public override function textButton(e:MouseEvent):void {
			ShowDisabledDialog();
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