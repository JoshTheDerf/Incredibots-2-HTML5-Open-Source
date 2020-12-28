package Game.Tutorials
{
	import Box2D.Collision.b2AABB;
	
	import Game.Graphics.*;
	
	import Parts.*;
	
	import flash.display.*;
	import flash.events.*;

	public class ControllerShapes extends ControllerTutorial
	{
		private var madeTriangle:Boolean = false;
		private var madeRectangle:Boolean = false;
		private var madeCircle:Boolean = false;
		
		public function ControllerShapes()
		{
			draw.m_drawXOff = -950;
			draw.m_drawYOff = -180;
		}
		
		public override function Init(e:Event):void {
			super.Init(e);
			if (!viewingUnsavedReplay) ShowTutorialDialog(4, false);
		}
		
		public override function Update():void {
			super.Update();
			m_sidePanel.DisableStuffForShapesLevel();
			if (!playingReplay) {
				if (!madeRectangle && allParts[allParts.length - 1] is Rectangle && allParts[allParts.length - 1].isEditable) {
					madeRectangle = true;
					ShowTutorialDialog(5);
				}
				if (madeRectangle && !madeTriangle && allParts[allParts.length - 1] is Triangle && allParts[allParts.length - 1].isEditable) {
					madeTriangle = true;
					ShowTutorialDialog(6);
				}
				if (madeRectangle && madeTriangle && !madeCircle && allParts[allParts.length - 1] is Circle && allParts[allParts.length - 1].isEditable) {
					madeCircle = true;
					ShowTutorialDialog(7);
				}
			}
		}
		
		private function ShowTutorialDialog(num:int, moreButton:Boolean = false):void {
			ShowTutorialWindow(num, World2ScreenX(-14), World2ScreenY(1), moreButton);
		}
		
		protected override function ChallengeOver():Boolean {
			if (simStarted) {
				for (var i:int = 0; i < allParts.length; i++) {
					if (allParts[i].isEditable && allParts[i] is Circle && allParts[i].GetBody().GetWorldCenter().x > -15 && allParts[i].GetBody().GetWorldCenter().x < -3 && allParts[i].GetBody().GetWorldCenter().y > 10) {
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
			area.lowerBound.Set(-29, -1);
			area.upperBound.Set(-16, 9.5);
			return area;
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