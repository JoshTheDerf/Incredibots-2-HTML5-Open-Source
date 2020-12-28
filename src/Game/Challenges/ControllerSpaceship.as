package Game.Challenges
{
	import Game.*;
	import General.Database;
	import flash.events.*;
	import flash.utils.ByteArray;
	import Game.Graphics.Resource;

	public class ControllerSpaceship extends ControllerChallenge
	{
		public function ControllerSpaceship()
		{
			playChallengeMode = true;
			playOnlyMode = true;
			
			if (!playingReplay) {
				var b:ByteArray = new Resource.cSpaceship();
				b.uncompress();
				challenge = Database.ExtractChallengeFromByteArray(b);
				loadedParts = challenge.allParts;
				ControllerSandbox.settings = challenge.settings;
			}

			draw.m_drawXOff = -10000;
			draw.m_drawYOff = 50;
			m_physScale = 24;
		}
		
		public override function Init(e:Event):void {
			super.Init(e);
			if (!viewingUnsavedReplay) ShowTutorialDialog(107, true);
		}
		
		public override function CloseTutorialDialog(num:int):void {
			if (num == 107) {
				ShowTutorialDialog(68);
			} else {
				super.CloseTutorialDialog(num);
			}
		}
		
		private function ShowTutorialDialog(num:int, moreButton:Boolean = false):void {
			ShowTutorialWindow(num, 276, 130, moreButton);
		}
		
		public override function saveButton(e:MouseEvent):void {
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