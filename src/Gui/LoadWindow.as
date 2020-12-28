package Gui
{
	import Game.ControllerGame;
	
	import flash.events.MouseEvent;
	import flash.text.*;
	
	public class LoadWindow extends GuiWindow
	{
		private var cont:ControllerGame;
		
		public function LoadWindow(contr:ControllerGame)
		{
			cont = contr;
			var header:TextField = new TextField();
			header.text = "Load What?";
			header.width = 140;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 7;
			header.y = 10;
			var format:TextFormat = new TextFormat();
			format.size = 14;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			header.setTextFormat(format);
			addChild(header);
			format = new TextFormat();
			format.size = 14;
			var button:GuiButton = new GuiButton("Load Robot", 7, 30, 140, 45, loadRobot, GuiButton.BLUE, format);
			addChild(button);
			button = new GuiButton("Load Replay", 7, 65, 140, 45, loadReplay, GuiButton.BLUE, format);
			addChild(button);
			button = new GuiButton("Load Challenge", 7, 100, 140, 45, loadChallenge, GuiButton.BLUE, format);
			addChild(button);
			button = new GuiButton("Import Robot", 7, 135, 140, 45, importRobot, GuiButton.ORANGE, format);
			addChild(button);
			button = new GuiButton("Import Replay", 7, 170, 140, 45, importReplay, GuiButton.ORANGE, format);
			addChild(button);
			button = new GuiButton("Import Challenge", 7, 205, 140, 45, importChallenge, GuiButton.ORANGE, format);
			addChild(button);
			format = new TextFormat();
			format.size = 12;
			button = new GuiButton("Cancel", 32, 245, 90, 35, cancel, GuiButton.PURPLE, format);
			addChild(button);
			super(323, 150, 154, 290);
		}
		
		private function loadRobot(e:MouseEvent):void {
			cancel(e);
			cont.loadRobotButton(e, false);
		}
		
		private function loadReplay(e:MouseEvent):void {
			cancel(e);
			cont.loadReplayButton(e, false);
		}
		
		private function loadChallenge(e:MouseEvent):void {
			cancel(e);
			cont.loadChallengeButton(e, false);
		}
		
		private function importRobot(e:MouseEvent):void {
			cancel(e);
			cont.ShowImportWindow(ImportWindow.TYPE_ROBOT);
		}
		
		private function importReplay(e:MouseEvent):void {
			cancel(e);
			cont.ShowImportWindow(ImportWindow.TYPE_REPLAY);
		}
		
		private function importChallenge(e:MouseEvent):void {
			cancel(e);
			cont.ShowImportWindow(ImportWindow.TYPE_CHALLENGE);
		}
		
		private function cancel(e:MouseEvent):void {
			visible = false;
			cont.m_fader.visible = false;
		}
	}
}