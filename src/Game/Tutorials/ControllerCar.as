package Game.Tutorials
{
	import Box2D.Collision.b2AABB;
	
	import Game.Graphics.*;
	
	import Parts.*;
	
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;

	public class ControllerCar extends ControllerTutorial
	{
		private var controlText:TextField;
		private var madeFirstJoint:Boolean = false;
		private var madeSecondJoint:Boolean = false;
		private var hitPlay:Boolean = false;
		private var hitSnapToCenter:Boolean = false;
		private var enabledMotors:Boolean = false;
		
		public function ControllerCar()
		{
			draw.m_drawXOff = 360;
			draw.m_drawYOff = -220;
			partsFit = false;
			
			// start platform
			sGround3.graphics.lineStyle(6, 0x9D8941);
			sGround3.graphics.beginFill(0xCEB456);
			sGround3.graphics.drawRect(6598, 1610, 650, 56);
			sGround3.graphics.endFill();
			
			snapToCenter = true;
			
			var p:Part = new Triangle(-2.5, 10.1, 3, 10.1, -2.5, 8);
			p.isEditable = false;
			(p as ShapePart).red = 220;
			(p as ShapePart).green = 220;
			(p as ShapePart).blue = 60;
			p.drawAnyway = false;
			allParts.push(p);
			p = new FixedJoint(allParts[allParts.length - 1], allParts[allParts.length - 4], -1, 10);
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			
			if (!playingReplay) LoadParts();
			
			controlText = new TextField();
			controlText.x = 0;
			controlText.y = 102;
			controlText.width = 800;
			controlText.text = "Use the left/right arrow keys to control the car.  Jump into the pit on the left to finish this level!";
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
		
		private function LoadParts():void {
			var p:Part = new Rectangle(20, 8, 3, 1);
			(p as ShapePart).blue = 40;
			(p as ShapePart).green = 50;
			(p as ShapePart).red = 245;
			allParts.push(p);
			p = new Circle(20.5, 8.5, 0.7);
			(p as ShapePart).blue = 80;
			(p as ShapePart).green = 80;
			(p as ShapePart).red = 80;
			allParts.push(p);
			p = new Circle(22.5, 8.5, 0.7);
			(p as ShapePart).blue = 80;
			(p as ShapePart).green = 80;
			(p as ShapePart).red = 80;
			allParts.push(p);
		}
		
		public override function Init(e:Event):void {
			super.Init(e);
			if (!viewingUnsavedReplay) ShowTutorialDialog(8, true);
		}
		
		public override function CloseTutorialDialog(num:int):void {
			if (num == 8) {
				ShowTutorialDialog(9);
			} else {
				super.CloseTutorialDialog(num);
			}
		}
		
		public override function Update():void {
			super.Update();
			if (!viewingUnsavedReplay) controlText.visible = !paused;
			m_sidePanel.DisableStuffForCarLevel();
			if (!playingReplay) {
				if (!madeFirstJoint && allParts[allParts.length - 1] is RevoluteJoint) {
					madeFirstJoint = true;
					ShowTutorialDialog(10);
				}
				if (!madeSecondJoint && allParts[allParts.length - 1] is RevoluteJoint && allParts[allParts.length - 2] is RevoluteJoint) {
					madeSecondJoint = true;
					ShowTutorialDialog(12);
				}
				if (!enabledMotors && allParts[allParts.length - 1] is RevoluteJoint && allParts[allParts.length - 2] is RevoluteJoint && allParts[allParts.length - 1].enableMotor && allParts[allParts.length - 2].enableMotor) {
					enabledMotors = true;
					ShowTutorialDialog(13);
				}
			}
		}
		
		public override function centerBox(e:MouseEvent):void {
			super.centerBox(e);
			if (madeFirstJoint && !hitSnapToCenter) {
				hitSnapToCenter = true;
				ShowTutorialDialog(11);
			}			
		}
		
		public override function HideDialog(e:Event):void {
			super.HideDialog(e);
			if (!hitPlay && m_progressDialog.GetMessage().search("You must fit your robot") != -1) {
				hitPlay = true;
				ShowTutorialDialog(14, false);
			}
		}
		
		private function ShowTutorialDialog(num:int, moreButton:Boolean = false):void {
			ShowTutorialWindow(num, World2ScreenX(15), World2ScreenY(-1), moreButton);
		}
		
		protected override function ChallengeOver():Boolean {
			if (simStarted) {
				for (var i:int = 0; i < allParts.length; i++) {
					if (allParts[i].isEditable && allParts[i] is ShapePart && allParts[i].GetBody().GetWorldCenter().x < -7 && allParts[i].GetBody().GetWorldCenter().y > 12) {
						return true;
					}
				}
				return false;
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
		
		public override function circleButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function rectButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function triangleButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function fjButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function pjButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function textButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function deleteButton(e:MouseEvent):void {
			if (selectedParts.length == 1 && selectedParts[0] is RevoluteJoint) {
				super.deleteButton(e);
			} else {
				ShowDisabledDialog();
			}
		}
		
		public override function multiDeleteButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function cutButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function copyButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function pasteButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function rotateButton(e:MouseEvent):void {
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