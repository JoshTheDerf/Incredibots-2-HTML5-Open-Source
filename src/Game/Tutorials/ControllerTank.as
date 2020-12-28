package Game.Tutorials
{
	import Box2D.Collision.b2AABB;
	
	import Game.Graphics.*;
	
	import Parts.*;
	
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;

	public class ControllerTank extends ControllerTutorial
	{
		private var object:ShapePart;
		private var controlText:TextField;
		private var hasWon:Boolean = false;
		
		public function ControllerTank()
		{
			draw.m_drawYOff = -300;
			draw.m_drawXOff = 1520;
			
			// objects strewn around
			object = new Rectangle(0, 9, 1, 1);
			object.red = 22;
			object.green = 73;
			object.blue = 255;
			object.isEditable = false;
			object.drawAnyway = false;
			allParts.push(object);
			var p:Part = new Triangle(57.5, 2.4, 58.5, 2.4, 58, 1.6);
			(p as ShapePart).red = 255;
			(p as ShapePart).green = 207;
			(p as ShapePart).blue = 94;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(50.4, 4.6, 0.3);
			(p as ShapePart).red = 255;
			(p as ShapePart).green = 207;
			(p as ShapePart).blue = 94;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(51.4, 4.3, 0.35);
			(p as ShapePart).red = 255;
			(p as ShapePart).green = 207;
			(p as ShapePart).blue = 94;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(54, 3.5, 0.25);
			(p as ShapePart).red = 255;
			(p as ShapePart).green = 207;
			(p as ShapePart).blue = 94;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(54.8, 3.6, 0.3);
			(p as ShapePart).red = 255;
			(p as ShapePart).green = 207;
			(p as ShapePart).blue = 94;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(55.5, 3.7, 0.3);
			(p as ShapePart).red = 255;
			(p as ShapePart).green = 207;
			(p as ShapePart).blue = 94;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(56.1, 3.4, 0.35);
			(p as ShapePart).red = 255;
			(p as ShapePart).green = 207;
			(p as ShapePart).blue = 94;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(56.9, 2.8, 0.3);
			(p as ShapePart).red = 255;
			(p as ShapePart).green = 207;
			(p as ShapePart).blue = 94;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(60, 2.7, 0.25);
			(p as ShapePart).red = 255;
			(p as ShapePart).green = 207;
			(p as ShapePart).blue = 94;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(62, 3.2, 0.3);
			(p as ShapePart).red = 255;
			(p as ShapePart).green = 207;
			(p as ShapePart).blue = 94;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(63.8, 3.7, 0.3);
			(p as ShapePart).red = 255;
			(p as ShapePart).green = 207;
			(p as ShapePart).blue = 94;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			
			// tank w. lifter arm
			var tankBase:ShapePart = new Rectangle(70.4, 0.7, 2.2, 0.6);
			tankBase.red = 30;
			tankBase.green = 130;
			tankBase.blue = 60;
			tankBase.density = 20;
			tankBase.isCameraFocus = true;
			tankBase.isEditable = false;
			tankBase.drawAnyway = false;
			allParts.push(tankBase);
			p = new Circle(70.5, 1, 0.6);
			(p as ShapePart).red = 30;
			(p as ShapePart).green = 130;
			(p as ShapePart).blue = 60;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(71.5, 1, 0.6);
			(p as ShapePart).red = 30;
			(p as ShapePart).green = 130;
			(p as ShapePart).blue = 60;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(72.5, 1, 0.6);
			(p as ShapePart).red = 30;
			(p as ShapePart).green = 130;
			(p as ShapePart).blue = 60;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new RevoluteJoint(allParts[allParts.length - 3], tankBase, 70.5, 1);
			(p as RevoluteJoint).enableMotor = true;
			(p as RevoluteJoint).motorStrength = 30;
			(p as RevoluteJoint).motorSpeed = 15;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new RevoluteJoint(allParts[allParts.length - 3], tankBase, 71.5, 1);
			(p as RevoluteJoint).enableMotor = true;
			(p as RevoluteJoint).motorStrength = 30;
			(p as RevoluteJoint).motorSpeed = 15;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);	
			p = new RevoluteJoint(allParts[allParts.length - 3], tankBase, 72.5, 1);
			(p as RevoluteJoint).enableMotor = true;
			(p as RevoluteJoint).motorStrength = 30;
			(p as RevoluteJoint).motorSpeed = 15;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			for (var i:int = 0; i < 7; i++) {
				p = new Rectangle(70.1 + i * 0.4, 0.3, 0.4, 0.2);
				(p as ShapePart).red = 30;
				(p as ShapePart).green = 90;
				(p as ShapePart).blue = 50;
				(p as Rectangle).isTank = true;
				p.isEditable = false;
				p.drawAnyway = false;
				allParts.push(p);
			}
			for (i = 0; i < 3; i++) {
				p = new Rectangle(72.8, 0.4 + i * 0.4, 0.2, 0.4);
				(p as ShapePart).red = 30;
				(p as ShapePart).green = 90;
				(p as ShapePart).blue = 50;
				(p as Rectangle).isTank = true;
				p.isEditable = false;
				p.drawAnyway = false;
				allParts.push(p);
			}
			for (i = 0; i < 7; i++) {
				p = new Rectangle(72.5 - i * 0.4, 1.5, 0.4, 0.2);
				(p as ShapePart).red = 30;
				(p as ShapePart).green = 90;
				(p as ShapePart).blue = 50;
				(p as Rectangle).isTank = true;
				p.isEditable = false;
				p.drawAnyway = false;
				allParts.push(p);
			}
			for (i = 0; i < 3; i++) {
				p = new Rectangle(70, 1.2 - i * 0.4, 0.2, 0.4);
				(p as ShapePart).red = 30;
				(p as ShapePart).green = 90;
				(p as ShapePart).blue = 50;
				(p as Rectangle).isTank = true;
				p.isEditable = false;
				p.drawAnyway = false;
				allParts.push(p);
			}
			for (i = 0; i < 7; i++) {
				p = new RevoluteJoint(allParts[allParts.length - 20], allParts[allParts.length - 19], 70.5 + i * 0.4, 0.4);
				p.isEditable = false;
				p.drawAnyway = false;
				allParts.push(p);
			}
			for (i = 0; i < 3; i++) {
				p = new RevoluteJoint(allParts[allParts.length - 20], allParts[allParts.length - 19], 72.9, 0.8 + i * 0.4);
				p.isEditable = false;
				p.drawAnyway = false;
				allParts.push(p);
			}
			for (i = 0; i < 7; i++) {
				p = new RevoluteJoint(allParts[allParts.length - 20], allParts[allParts.length - 19], 72.5 - i * 0.4, 1.6);
				p.isEditable = false;
				p.drawAnyway = false;
				allParts.push(p);
			}
			for (i = 0; i < 3; i++) {
				p = new RevoluteJoint(allParts[allParts.length - 20], allParts[(i == 2 ? allParts.length - 39 : allParts.length - 19)], 70.1, 1.2 - i * 0.4);
				p.isEditable = false;
				p.drawAnyway = false;
				allParts.push(p);
			}
			p = new Rectangle(69.5, 1, 2, 0.1);
			(p as ShapePart).red = 30;
			(p as ShapePart).green = 90;
			(p as ShapePart).blue = 50;
			(p as ShapePart).collide = false;
			(p as ShapePart).density = 1;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Rectangle(69.5, 0, 0.1, 1.2);
			(p as ShapePart).red = 30;
			(p as ShapePart).green = 90;
			(p as ShapePart).blue = 50;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Rectangle(68.4, 1.1, 1.2, 0.1);
			(p as ShapePart).red = 30;
			(p as ShapePart).green = 90;
			(p as ShapePart).blue = 50;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new RevoluteJoint(allParts[allParts.length - 3], tankBase, 71.4, 1.05);
			p.isEditable = false;
			p.drawAnyway = false;
			(p as RevoluteJoint).isStiff = true;
			(p as RevoluteJoint).enableMotor = true;
			(p as RevoluteJoint).motorStrength = 20;
			(p as RevoluteJoint).motorSpeed = 2;
			(p as RevoluteJoint).motorCWKey = 38;
			(p as RevoluteJoint).motorCCWKey = 40;
			allParts.push(p);
			p = new FixedJoint(allParts[allParts.length - 3], allParts[allParts.length - 4], 69.55, 1.05);
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new FixedJoint(allParts[allParts.length - 3], allParts[allParts.length - 4], 69.55, 1.15);
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			
			controlText = new TextField();
			controlText.x = 0;
			controlText.y = 102;
			controlText.width = 800;
			controlText.text = "Use the left/right/up/down arrow keys to control the tank. Your goal is to descend the rocky slope, then lift the blue square\ninto the pit on the left.  If you get stuck, click \"Stop Simulation\" and try again.";
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
			if (!viewingUnsavedReplay) ShowTutorialDialog(0, true);
		}
		
		public override function CloseTutorialDialog(num:int):void {
			if (num == 0) {
				ShowTutorialDialog(1, true);
			} else if (num == 1) {
				ShowTutorialDialog(2);
			} else if (num == 3) {
				ShowTutorialWindow(55, 276, World2ScreenY(2));
			} else if (num == 55) {
				m_tutorialDialog.visible = false;
				if (m_scoreWindow.visible) m_scoreWindow.HideFader();
				else m_fader.visible = false;
			} else {
				super.CloseTutorialDialog(num);
			}
		}
		
		public override function Update():void {
			super.Update();
			if (!viewingUnsavedReplay) controlText.visible = !paused;
			if (wonChallenge && !hasWon && !playingReplay) {
				hasWon = true;
				m_scoreWindow.ShowFader();
				ShowTutorialWindow(3, 276, World2ScreenY(2), true);
			}
		}
		
		private function ShowTutorialDialog(num:int, moreButton:Boolean = false):void {
			ShowTutorialWindow(num, World2ScreenX(57), World2ScreenY(-5), moreButton);
		}
		
		protected override function ChallengeOver():Boolean {
			if (simStarted) {
				return (object.GetBody().GetWorldCenter().x > -15 && object.GetBody().GetWorldCenter().y > 12 && object.GetBody().GetWorldCenter().x < -3);
			} else {
				return false;
			}
		}
		
		protected override function GetBuildingArea():b2AABB {
			var area:b2AABB = new b2AABB();
			area.lowerBound.Set(67, -2);
			area.upperBound.Set(73.3, 5.2);
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
			ShowDisabledDialog();
		}
		
		public override function textButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function undoButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function redoButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function pasteButton(e:MouseEvent):void {
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