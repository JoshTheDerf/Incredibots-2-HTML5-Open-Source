package Game.Tutorials
{
	import Box2D.Collision.b2AABB;
	
	import Game.Graphics.*;
	
	import Parts.*;
	
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;

	public class ControllerCatapult extends ControllerTutorial
	{
		private var controlText:TextField;
		private var motor:RevoluteJoint;
		private var ball:ShapePart;
		
		private var limitedMotor:Boolean = false;
		private var limitedMotor2:Boolean = false;
		private var focusedBall:Boolean = false;
		
		public function ControllerCatapult()
		{
			draw.m_drawXOff = -1880;
			draw.m_drawYOff = -220;
			
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
			controlText.text = "Use the left/right arrow keys to rotate the catapult's arm. Try to launch the ball into the pit to the right.\nWhen finished, click \"Stop Simulation\" to continue the tutorial.";
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
			var p:Part = new Rectangle(-57, 3.9, 5, 3);
			(p as ShapePart).red = 160;
			(p as ShapePart).green = 120;
			(p as ShapePart).blue = 70;
			allParts.push(p);
			p = new Rectangle(-60, 4.9, 4, 0.2);
			(p as ShapePart).red = 160;
			(p as ShapePart).green = 120;
			(p as ShapePart).blue = 70;
			allParts.push(p);
			p = new Rectangle(-60, 4.7, 0.1, 0.4);
			(p as ShapePart).red = 160;
			(p as ShapePart).green = 120;
			(p as ShapePart).blue = 70;
			allParts.push(p);
			p = new Rectangle(-59.5, 4.7, 0.1, 0.4);
			(p as ShapePart).red = 160;
			(p as ShapePart).green = 120;
			(p as ShapePart).blue = 70;
			allParts.push(p);
			p = new FixedJoint(allParts[allParts.length - 3], allParts[allParts.length - 2], -59.95, 5);
			allParts.push(p);
			p = new FixedJoint(allParts[allParts.length - 4], allParts[allParts.length - 2], -59.45, 5);
			allParts.push(p);
			motor = new RevoluteJoint(allParts[allParts.length - 6], allParts[allParts.length - 5], -56.5, 5);
			motor.enableMotor = true;
			motor.motorSpeed = 10;
			motor.motorStrength = 10;
			allParts.push(motor);
			ball = new Circle(-59.7, 4.8, 0.1);
			ball.red = 100;
			ball.green = 255;
			ball.blue = 40;
			allParts.push(ball);
		}
		
		public override function Init(e:Event):void {
			super.Init(e);
			if (!viewingUnsavedReplay) ShowTutorialDialog(32, true);
		}
		
		public override function CloseTutorialDialog(num:int):void {
			if (num == 32) {
				ShowTutorialDialog(33, true);
			} else if (num == 33) {
				ShowTutorialDialog(34);
			} else {
				super.CloseTutorialDialog(num);
			}
		}
		
		public override function Update():void {
			super.Update();
			if (!viewingUnsavedReplay) controlText.visible = !paused;
			m_sidePanel.DisableStuffForCatapultLevel();
			if (!playingReplay) {
				if (!limitedMotor && motor.motorLowerLimit == -10) {
					limitedMotor = true;
					ShowTutorialDialog(35);
				}
				if (limitedMotor && !limitedMotor2 && motor.motorUpperLimit == 50) {
					limitedMotor2 = true;
					ShowTutorialDialog(36);
				}
			}
		}
		
		public override function resetButton(e:MouseEvent, rateRobot:Boolean = true):void {
			super.resetButton(e, rateRobot);
			if (limitedMotor2 && !focusedBall) {
				controlText.text = "Use the left/right arrow keys to rotate the catapult's arm. Try to launch the ball into the pit to the right.";
				var format:TextFormat = new TextFormat();
				format.align = TextFormatAlign.CENTER;
				format.font = Main.GLOBAL_FONT;
				format.size = 13;
				format.leading = 1;
				controlText.setTextFormat(format);
				focusedBall = true;
				ShowTutorialDialog(37);
			}
		}
		
		private function ShowTutorialDialog(num:int, moreButton:Boolean = false):void {
			ShowTutorialWindow(num, World2ScreenX(-48), World2ScreenY(-1), moreButton);
		}
		
		protected override function ChallengeOver():Boolean {
			if (simStarted) {
				return (focusedBall && ball.GetBody().GetWorldCenter().x > -15 && ball.GetBody().GetWorldCenter().x < -3 && ball.GetBody().GetWorldCenter().y > 12.5);
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