package Game.Tutorials
{
	import Box2D.Collision.b2AABB;
	import Box2D.Common.Math.b2Vec2;
	
	import Game.Graphics.*;
	
	import Parts.*;
	
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;

	public class ControllerJumpbot extends ControllerTutorial
	{
		private var madePiston:Boolean = false;
		private var enabledPiston:Boolean = false;
		private var hitReset:Boolean = false;
		private var increasedPower:Boolean = false;
		private var decreasedDensity:Boolean = false;
		private var controlText:TextField;
		
		private var carBody:ShapePart;
		
		public function ControllerJumpbot()
		{
			draw.m_drawXOff = -1880;
			draw.m_drawYOff = -220;
			
			snapToCenter = true;
			
			// start platform
			sGround1.graphics.lineStyle(6, 0x9D8941);
			sGround1.graphics.beginFill(0xCEB456);
			sGround1.graphics.drawRect(1045, 1452, 681, 56);
			sGround1.graphics.endFill();
			
			if (!playingReplay) LoadParts();
			
			controlText = new TextField();
			controlText.x = 0;
			controlText.y = 102;
			controlText.width = 800;
			controlText.text = "Use the left/right arrow keys to rotate the wheels. Control the sliding joint with the up/down arrow keys.\nTry to jump the gap to the right and fall into the pit.";
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
			carBody = new Rectangle(-58.25, 5, 3.5, 1);
			carBody.blue = 40;
			carBody.green = 50;
			carBody.red = 245;
			allParts.push(carBody);
			var p:Part = new Circle(-58, 5.9, 1);
			(p as ShapePart).blue = 80;
			(p as ShapePart).green = 80;
			(p as ShapePart).red = 80;
			(p as ShapePart).density = 1;
			allParts.push(p);
			p = new Circle(-55, 5.9, 1);
			(p as ShapePart).blue = 80;
			(p as ShapePart).green = 80;
			(p as ShapePart).red = 80;
			(p as ShapePart).density = 1;
			allParts.push(p);
			p = new RevoluteJoint(allParts[allParts.length - 3], allParts[allParts.length - 2], -58, 5.9);
			(p as RevoluteJoint).enableMotor = true;
			allParts.push(p);
			p = new RevoluteJoint(allParts[allParts.length - 4], allParts[allParts.length - 2], -55, 5.9);
			(p as RevoluteJoint).enableMotor = true;
			allParts.push(p);
			p = new Triangle(-56, 6.8, -57, 6.3, -57, 6.8);
			(p as ShapePart).blue = 150;
			(p as ShapePart).green = 240;
			(p as ShapePart).red = 130;
			allParts.push(p);
		}
		
		public override function Init(e:Event):void {
			super.Init(e);
			if (!viewingUnsavedReplay) ShowTutorialDialog(15);
		}
		
		public override function Update():void {
			super.Update();
			if (!viewingUnsavedReplay) controlText.visible = !paused;
			m_sidePanel.DisableStuffForJumpbotLevel();
			if (!playingReplay) {
				if (!madePiston && allParts[allParts.length - 1] is PrismaticJoint) {
					madePiston = true;
					ShowTutorialDialog(16);
				}
				if (!enabledPiston && allParts[allParts.length - 1] is PrismaticJoint && allParts[allParts.length - 1].enablePiston) {
					enabledPiston = true;
					ShowTutorialDialog(17);
				}
				if (hitReset && !increasedPower && allParts[allParts.length - 1] is PrismaticJoint && allParts[allParts.length - 1].pistonStrength > 15 && allParts[allParts.length - 1].pistonSpeed > 15) {
					increasedPower = true;
					ShowTutorialDialog(19);
				}
				if (increasedPower && !decreasedDensity && carBody.density < 15) {
					decreasedDensity = true;
					ShowTutorialDialog(20);
				}
			}
			
			if (!paused && carBody.GetBody().GetWorldCenter().y > 50) {
				resetButton(new MouseEvent(""));
			}
		}
		
		public override function resetButton(e:MouseEvent, rateRobot:Boolean = true):void {
			super.resetButton(e, rateRobot);
			if (enabledPiston && !hitReset) {
				hitReset = true;
				ShowTutorialDialog(18);
			}
		}
		
		private function ShowTutorialDialog(num:int, moreButton:Boolean = false):void {
			ShowTutorialWindow(num, World2ScreenX(-48), World2ScreenY(-1), moreButton);
		}
		
		protected override function ChallengeOver():Boolean {
			if (simStarted) {
				for (var i:int = 0; i < allParts.length; i++) {
					if (allParts[i].isEditable && allParts[i] is ShapePart && allParts[i].GetBody().GetWorldCenter().x > -15 && allParts[i].GetBody().GetWorldCenter().x < -3 && allParts[i].GetBody().GetWorldCenter().y > 11 && allParts[i].GetBody().GetWorldCenter().y < 18) {
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
			area.lowerBound.Set(-61, -1);
			area.upperBound.Set(-50.5, 7);
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
		
		public override function rjButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function pjButton(e:MouseEvent):void {
			PrismaticJoint.jbTutorial = true;
			super.pjButton(e);
		}
		
		public override function textButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function deleteButton(e:MouseEvent):void {
			if (selectedParts.length == 1 && selectedParts[0] is PrismaticJoint) {
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
		
		public override function centerBox(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		protected override function GetGravity():b2Vec2 {
			if (decreasedDensity) {
				return new b2Vec2(0.0, 12.0);
			} else {
				return new b2Vec2(0.0, 18.0);
			}
		}
	}
}