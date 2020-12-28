package Gui
{
	import Game.*;
	import Game.Tutorials.*;
	import Game.Graphics.Resource;
	
	import fl.controls.Button;
	
	import flash.events.*;
	import flash.text.*;

	import mx.core.BitmapAsset;

	public class ScoreWindow extends GuiWindow
	{
		private var cont:ControllerGame;
		private var m_header:BitmapAsset;
		private var m_scoreField:TextField;
		private var m_viewReplayButton:Button;
		private var m_saveReplayButton:Button;
		private var m_submitScoreButton:Button;
		private var m_mainMenuButton:Button;
		private var m_cancelButton:Button;
		private var m_nextLevelButton:Button;
		
		public function ScoreWindow(contr:ControllerGame, score:int)
		{
			cont = contr;
			
			m_header = new Resource.cCongrats();
			m_header.smoothing = true;
			m_header.width = 175;
			m_header.scaleY = m_header.scaleX;
			m_header.x = 13;
			m_header.y = 15;
			addChild(m_header);
			
			var y:int = 40;
			
			if (!(cont is ControllerTutorial || cont is ControllerHomeMovies || cont is ControllerRubeGoldberg || cont is ControllerNewFeatures || cont is ControllerChallengeEditor)) {
				m_scoreField = new TextField();
				m_scoreField.text = "Your score is: " + score;
				m_scoreField.width = 120;
				m_scoreField.height = 20;
				m_scoreField.textColor = 0x242930;
				m_scoreField.selectable = false;
				m_scoreField.x = 40;
				m_scoreField.y = 44;
				var format:TextFormat = new TextFormat();
				format.align = TextFormatAlign.CENTER;
				format.font = Main.GLOBAL_FONT;
				m_scoreField.setTextFormat(format);
				addChild(m_scoreField);
				y = 60;
			}
			
			m_viewReplayButton = new GuiButton((ControllerGame.viewingUnsavedReplay ? "View Again!" : "View Replay"), 45, y, 110, 35, viewReplayButton, GuiButton.PURPLE);
			addChild(m_viewReplayButton);
			m_saveReplayButton = new GuiButton("Save Replay", 45, y + 30, 110, 35, saveReplayButton, GuiButton.PURPLE);
			addChild(m_saveReplayButton);
			m_submitScoreButton = new GuiButton("Submit Score", 45, y + 60, 110, 35, cont.submitButton, GuiButton.PURPLE);
			addChild(m_submitScoreButton);
			m_mainMenuButton = new GuiButton("Main Menu", 45, y + 90, 110, 35, cont.newButton, GuiButton.PURPLE);
			addChild(m_mainMenuButton);
			m_cancelButton = new GuiButton((cont is ControllerHomeMovies || cont is ControllerChallengeEditor ? "Close" : "Retry"), 45, y + 120, 110, 35, cancelButton, GuiButton.PURPLE);
			addChild(m_cancelButton);
			if (cont is ControllerTutorial || cont is ControllerHomeMovies || cont is ControllerRubeGoldberg || cont is ControllerNewFeatures) {
				m_nextLevelButton = new GuiButton("Next Level", 45, y + 150, 110, 35, nextButton, GuiButton.BLUE);
				addChild(m_nextLevelButton);
			}
			
			super(323, 130, 200, (cont is ControllerTutorial || cont is ControllerHomeMovies || cont is ControllerRubeGoldberg || cont is ControllerNewFeatures ? y + 200 : y + 170));
		}
		
		private function viewReplayButton(e:MouseEvent):void  {
			cont.viewReplayButton(e);
		}
		
		private function saveReplayButton(e:MouseEvent):void {
			cont.saveReplayButton(e);
		}
		
		private function cancelButton(e:MouseEvent):void {
			visible = false;
			cont.m_fader.visible = false;
			if (!(cont is ControllerHomeMovies || cont is ControllerChallengeEditor)) cont.resetButton(e);
		}
		
		private function nextButton(e:MouseEvent):void {
			Main.changeControllers = true;
			Main.nextControllerType++;
			if (Main.nextControllerType > 15) {
				var settings:SandboxSettings = new SandboxSettings(15.0, 1, 0, 0, 0);
				if (Main.nextControllerType == 18) settings = new SandboxSettings(1.0, 0, 1, 5, 1);
				if (Main.nextControllerType == 19) settings = new SandboxSettings(15.0, 0, 2, 0, 5);
				ControllerSandbox.settings = settings;
			}
			ControllerGame.playingReplay = false;
			ControllerGame.viewingUnsavedReplay = false;
		}
	}
}