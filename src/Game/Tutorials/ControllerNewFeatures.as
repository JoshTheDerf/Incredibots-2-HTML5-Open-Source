package Game.Tutorials
{
	import Game.ControllerSandbox;
	import Game.Graphics.*;
	
	import General.*;
	
	import Gui.ScoreWindow;
	
	import Parts.*;
	
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;

	public class ControllerNewFeatures extends ControllerSandbox
	{
		private var partsConnected:Boolean = false;
		private var outlinesBehinded:Boolean = false;
		private var simStopped:Boolean = false;
		private var shapesUndragabled:Boolean = false;
		private var botInBox:Boolean = false;
		
		private var wasPlaying:Boolean = false;
		
		private var goalText:TextField;
		
		private var middle:ShapePart;
		private var leg1Circle1:ShapePart;
		private var leg1Circle2:ShapePart;
		private var leg2Circle1:ShapePart;
		private var leg2Circle2:ShapePart;
		private var neckCircle1:ShapePart;
		private var neckCircle2:ShapePart;
		private var tailCircle1:ShapePart;
		private var tailCircle2:ShapePart;
		private var leg1Rect:ShapePart;
		private var leg2Rect:ShapePart;
		private var neckRect:ShapePart;
		private var tailRect:ShapePart;

		public function ControllerNewFeatures()
		{
			draw.m_drawXOff = -100;
			draw.m_drawYOff = -290;
			m_physScale = 22.5;
			
			goalText = new TextField();
			goalText.x = 0;
			goalText.y = 102;
			goalText.width = 800;
			goalText.text = "Drag the balloon animal into the box on the left to complete the tutorial!";
			goalText.selectable = false;
			goalText.visible = false;
			var format:TextFormat = new TextFormat();
			format.align = TextFormatAlign.CENTER;
			format.color = 0xDDDDDD;
			format.font = Main.GLOBAL_FONT;
			format.size = 14;
			format.leading = 1;
			goalText.setTextFormat(format);
			addChild(goalText);
			
			if (!playingReplay) LoadParts();
		}

		private function LoadParts():void {
			var p:ShapePart = new Rectangle(-40, -10, 20, 0.5, false);
			p.red = 180;
			p.green = 200;
			p.blue = 50;
			p.isStatic = true;
			p.isEditable = false;
			allParts.push(p);
			p = new Rectangle(-40, -10, 0.5, 20, false);
			p.red = 180;
			p.green = 200;
			p.blue = 50;
			p.isStatic = true;
			p.isEditable = false;
			allParts.push(p);
			p = new Rectangle(-40, 9.5, 20, 0.5, false);
			p.red = 180;
			p.green = 200;
			p.blue = 50;
			p.isStatic = true;
			p.isEditable = false;
			allParts.push(p);

			
			var red:Number = 245;
			var green:Number = 50;
			var blue:Number = 40;
			leg1Rect = new Rectangle(15.52, 4.96, 2.48, 2.9155);
			leg1Rect.angle = -0.48;
			leg1Rect.blue = blue;
			leg1Rect.green = green;
			leg1Rect.red = red;
			allParts.push(leg1Rect);
			leg2Rect = new Rectangle(6.0, 4.96, 2.48, 2.9155);
			leg2Rect.angle = 0.48;
			leg2Rect.blue = blue;
			leg2Rect.green = green;
			leg2Rect.red = red;
			allParts.push(leg2Rect);
			leg1Circle1 = new Circle(16.05, 5.04, 1.2);
			leg1Circle1.blue = blue;
			leg1Circle1.green = green;
			leg1Circle1.red = red;
			allParts.push(leg1Circle1);
			leg1Circle2 = new Circle(17.36, 7.58, 1.2);
			leg1Circle2.blue = blue;
			leg1Circle2.green = green;
			leg1Circle2.red = red;
			allParts.push(leg1Circle2);
			leg2Circle1 = new Circle(7.95, 5.04, 1.2);
			leg2Circle1.blue = blue;
			leg2Circle1.green = green;
			leg2Circle1.red = red;
			allParts.push(leg2Circle1);
			leg2Circle2 = new Circle(6.64, 7.58, 1.2);
			leg2Circle2.blue = blue;
			leg2Circle2.green = green;
			leg2Circle2.red = red;
			allParts.push(leg2Circle2);
			neckRect = new Rectangle(7.62, -2, 2.26, 2.26);
			neckRect.angle = -0.26;
			neckRect.blue = blue;
			neckRect.green = green;
			neckRect.red = red;
			allParts.push(neckRect);
			neckCircle1 = new Circle(9.03, 0.2, 1.1);
			neckCircle1.blue = blue;
			neckCircle1.green = green;
			neckCircle1.red = red;
			allParts.push(neckCircle1);
			neckCircle2 = new Circle(8.5, -1.8, 1.1);
			neckCircle2.blue = blue;
			neckCircle2.green = green;
			neckCircle2.red = red;
			allParts.push(neckCircle2);
			var tail:ShapePart = new Rectangle(16.8, -3.3, 7, 0.3);
			tail.angle = -0.6;
			tail.blue = blue;
			tail.green = green;
			tail.red = red;
			allParts.push(tail);
			tailRect = new Rectangle(15.8, -2.2, 3, 2.1);
			tailRect.angle = -0.6;
			tailRect.blue = blue;
			tailRect.green = green;
			tailRect.red = red;
			allParts.push(tailRect);
			tailCircle1 = new Circle(15.9, -0.2, 1.02);
			tailCircle1.blue = blue;
			tailCircle1.green = green;
			tailCircle1.red = red;
			allParts.push(tailCircle1);
			tailCircle2 = new Circle(18.5, -1.98, 1.02);
			tailCircle2.blue = blue;
			tailCircle2.green = green;
			tailCircle2.red = red;
			allParts.push(tailCircle2);
			p = new Rectangle(9.18, -5.12, 1.5, 2.08);
			p.blue = blue;
			p.green = green;
			p.red = red;
			p.angle = -0.52;
			allParts.push(p);
			var ears:ShapePart = new Circle(9.3, -3.7, 1);
			ears.blue = blue;
			ears.green = green;
			ears.red = red;
			ears.terrain = true;
			allParts.push(ears);
			p = new Circle(10.5, -4.4, 1);
			p.blue = blue;
			p.green = green;
			p.red = red;
			p.terrain = true;
			allParts.push(p);
			var j:JointPart = new FixedJoint(ears, allParts[allParts.length - 3], 9.3, -3.7);
			allParts.push(j);
			j = new FixedJoint(allParts[allParts.length - 4], allParts[allParts.length - 2], 10.5, -4.4);
			allParts.push(j);
			var head:ShapePart = new Circle(7.04, -3.18, 1.2);
			head.blue = blue;
			head.green = green;
			head.red = red;
			allParts.push(head);
			var nose:Circle = new Circle(5.85, -3.7, 0.2);
			nose.blue = blue;
			nose.green = green;
			nose.red = red;
			allParts.push(nose);
			var tailBob:ShapePart = new Circle(23.3, -5.2, 1);
			tailBob.blue = blue;
			tailBob.green = green;
			tailBob.red = red;
			allParts.push(tailBob);
			
			middle = new Circle(12, 2, 2);
			middle.blue = blue;
			middle.green = green;
			middle.red = red;
			allParts.push(middle);
			
			j = new FixedJoint(leg1Circle1, leg1Rect, 16.05, 5.04);
			allParts.push(j);
			j = new FixedJoint(leg1Circle2, leg1Rect, 17.36, 7.58);
			allParts.push(j);
			j = new FixedJoint(leg2Circle1, leg2Rect, 7.95, 5.04);
			allParts.push(j);
			j = new FixedJoint(leg2Circle2, leg2Rect, 6.64, 7.58);
			allParts.push(j);
			j = new FixedJoint(neckCircle1, neckRect, 9.03, 0.2);
			allParts.push(j);
			j = new FixedJoint(neckCircle2, neckRect, 8.5, -1.8);
			allParts.push(j);
			j = new FixedJoint(tailCircle1, tailRect, 15.9, -0.2);
			allParts.push(j);
			j = new FixedJoint(tailCircle2, tailRect, 18.5, -1.98);
			allParts.push(j);
			j = new FixedJoint(ears, neckCircle2, 9, -2.8);
			allParts.push(j);
			j = new FixedJoint(nose, head, 6, -3.7);
			allParts.push(j);
			j = new FixedJoint(neckCircle2, head, 7.7, -2.5);
			allParts.push(j);
			j = new FixedJoint(tail, tailBob, 23.3, -5.2);
			allParts.push(j);
			j = new FixedJoint(tail, tailCircle2, 18.5, -1.98);
			allParts.push(j);
			
			p = new Rectangle(-10, 8, 2.5, 0.4);
			p.red = 220;
			p.green = 220;
			p.blue = 220;
			p.density = 30;
			p.collide = false;
			allParts.push(p);
			p = new Rectangle(-7.6, 8, 2.5, 0.4);
			p.red = 220;
			p.green = 220;
			p.blue = 220;
			p.density = 30;
			p.collide = false;
			allParts.push(p);
			p = new Rectangle(-5.2, 8, 2.5, 0.4);
			p.red = 220;
			p.green = 220;
			p.blue = 220;
			p.density = 30;
			p.collide = false;
			allParts.push(p);
			p = new Rectangle(-2.8, 8, 2.5, 0.4);
			p.red = 220;
			p.green = 220;
			p.blue = 220;
			p.density = 30;
			p.collide = false;
			allParts.push(p);
			j = new RevoluteJoint(allParts[allParts.length - 4], allParts[allParts.length - 3], -7.55, 8.2);
			allParts.push(j);
			j = new RevoluteJoint(allParts[allParts.length - 4], allParts[allParts.length - 3], -5.15, 8.2);
			allParts.push(j);
			j = new RevoluteJoint(allParts[allParts.length - 4], allParts[allParts.length - 3], -2.75, 8.2);
			allParts.push(j);
		}

		public override function Init(e:Event):void {
			super.Init(e);
			if (!playingReplay) ShowTutorialDialog(82, true);
		}
		
		public override function CloseTutorialDialog(num:int):void {
			if (num == 82) {
				ShowTutorialDialog(83, true);
			} else if (num == 83) {
				ShowTutorialDialog(84);
			} else {
				if (num == 89) {
					LSOManager.SetLevelDone(8);
					if (m_scoreWindow) {
						try {
							removeChild(m_scoreWindow);
						} catch (type:Error) {
							
						}
					}
					m_scoreWindow = new ScoreWindow(this, GetScore());
					musicChannel = winSound.play();
					addChild(m_scoreWindow);
					m_fader.visible = true;
				}
				super.CloseTutorialDialog(num);
			}
		}
		
		public override function Update():void {
			super.Update();
			if (!playingReplay) {
				if (!partsConnected && allParts[allParts.length - 1] is FixedJoint && allParts[allParts.length - 2] is FixedJoint && allParts[allParts.length - 3] is FixedJoint && allParts[allParts.length - 4] is FixedJoint &&
					middle.GetActiveJoints().length == 4 && (leg1Circle1.GetActiveJoints().length == 2 || leg1Rect.GetActiveJoints().length == 3) && (leg2Circle1.GetActiveJoints().length == 2 || leg2Rect.GetActiveJoints().length == 3) && (neckCircle1.GetActiveJoints().length == 2 || neckRect.GetActiveJoints().length == 3) && (tailCircle1.GetActiveJoints().length == 2 || tailRect.GetActiveJoints().length == 3)) {
					partsConnected = true;
					ShowTutorialDialog(85);
				}
				if (partsConnected && !outlinesBehinded && leg1Circle1.terrain && leg1Circle2.terrain && leg2Circle1.terrain && leg2Circle2.terrain && neckCircle1.terrain && neckCircle2.terrain && tailCircle1.terrain && tailCircle2.terrain) {
					outlinesBehinded = true;
					ShowTutorialDialog(86);
				}
				if (outlinesBehinded && !simStopped && wasPlaying && !simStarted) {
					simStopped = true;
					ShowTutorialDialog(87);
				}
				if (simStopped && !shapesUndragabled && middle.undragable && leg1Circle1.undragable && leg1Circle2.undragable && leg2Circle1.undragable && leg2Circle2.undragable && neckCircle1.undragable && neckCircle2.undragable && tailCircle1.undragable && tailCircle2.undragable) {
					shapesUndragabled = true;
					ShowTutorialDialog(88);
				}
				if (shapesUndragabled && !botInBox && simStarted && middle.GetBody().GetWorldCenter().x < -25 && middle.GetBody().GetWorldCenter().y > -8) {
					botInBox = true;
					ShowTutorialDialog(89);
				}
			}
			
			goalText.visible = (!paused && shapesUndragabled);
			wasPlaying = simStarted;
		}

		private function ShowTutorialDialog(num:int, moreButton:Boolean = false):void {
			ShowTutorialWindow(num, World2ScreenX(-10), World2ScreenY(-10), moreButton);
		}

		protected override function ChallengeOver():Boolean {
			return false;
		}
		
		public override function GetScore():int {
			return 1000;
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
		
		public override function saveButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function loadButton(e:MouseEvent, makeThemRate:Boolean = true):void {
			ShowDisabledDialog();
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