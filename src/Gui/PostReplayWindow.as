package Gui
{
	import Game.ControllerGame;
	import Game.Tutorials.*;
	
	import fl.controls.Button;
	
	import flash.events.*;
	import flash.text.*;

	public class PostReplayWindow extends GuiWindow
	{
		private var cont:ControllerGame;
		private var m_header:TextField;
		private var m_viewReplayButton:Button;
		private var m_loadReplayButton:Button;
		private var m_stopButton:Button;
		private var m_rateButton:Button;
		private var m_mainMenuButton:Button;
		private var m_closeButton:Button;
		
		public function PostReplayWindow(contr:ControllerGame)
		{
			cont = contr;
			
			m_header = new TextField();
			m_header.text = "End of Replay";
			m_header.width = 100;
			m_header.height = 20;
			m_header.textColor = 0x242930;
			m_header.selectable = false;
			m_header.x = 27;
			m_header.y = 20;
			var format:TextFormat = new TextFormat();
			format.size = 14;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			m_header.setTextFormat(format);
			addChild(m_header);
			
			m_viewReplayButton = new GuiButton("View Again!", 22, 45, 110, 35, viewReplayButton, GuiButton.PURPLE);
			addChild(m_viewReplayButton);
			m_loadReplayButton = new GuiButton("Load Replay", 22, 75, 110, 35, loadReplayButton, GuiButton.PURPLE);
			addChild(m_loadReplayButton);
			m_stopButton = new GuiButton("Stop Replay", 22, 105, 110, 35, rewindButton, GuiButton.PURPLE);
			addChild(m_stopButton);
			if (ControllerGame.curReplayID != "") {
				m_rateButton = new GuiButton("Rate this Replay", 22, 135, 110, 35, rateButton, GuiButton.PURPLE);
				addChild(m_rateButton);
			}
			m_mainMenuButton = new GuiButton("Main Menu", 22, (ControllerGame.curReplayID == "" ? 135 : 165), 110, 35, mainMenuButton, GuiButton.PURPLE);
			addChild(m_mainMenuButton);
			m_closeButton = new GuiButton("Close", 22, (ControllerGame.curReplayID == "" ? 165 : 195), 110, 35, cancelButton, GuiButton.PURPLE);
			addChild(m_closeButton);
			
			super(323, 130, 154, (ControllerGame.curReplayID == "" ? 210 : 240));
		}
		
		private function rateButton(e:MouseEvent):void {
			ShowFader();
			cont.rateReplayButton(e);
		}
		
		private function viewReplayButton(e:MouseEvent):void {
			visible = false;
			cont.m_fader.visible = false;
			cont.resetButton(e);
		}
		
		private function loadReplayButton(e:MouseEvent):void {
			visible = false;
			cont.m_fader.visible = false;
			cont.loadReplayButton(e);
		}
		
		private function rewindButton(e:MouseEvent):void {
			visible = false;
			cont.m_fader.visible = false;
			cont.rewindButton(e);
		}
		
		private function mainMenuButton(e:MouseEvent):void {
			visible = false;
			cont.m_fader.visible = false;
			cont.newButton(e);
		}
		
		private function cancelButton(e:MouseEvent):void {
			visible = false;
			cont.m_fader.visible = false;
		}
	}
}