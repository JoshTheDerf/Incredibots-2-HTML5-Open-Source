package Gui
{
	import Game.ControllerGame;
	
	import General.Database;
	
	import fl.controls.*;
	
	import flash.display.Sprite;
	import flash.events.Event;
	import flash.text.*;
	
	public class ReportWindow extends GuiWindow
	{
		private var parentWindow:Sprite;
		private var dataType:int;
		private var id:String;
		private var descArea:TextArea;
		
		public function ReportWindow(p:Sprite, type:int, ID:String)
		{
			parentWindow = p;
			dataType = type;
			id = ID;
			
			var header:TextField = new TextField();
			header.text = "Report a " + (type == 0 ? "Robot" : (type == 1 ? "Replay" : "Challenge"));
			header.width = 180;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 33;
			header.y = 10;
			var format:TextFormat = new TextFormat();
			format.size = 18;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			header.setTextFormat(format);
			addChild(header);
			
			header = new TextField();
			header.text = "Reason for reporting: ";
			header.width = 120;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 64;
			header.y = 50;
			format = new TextFormat();
			format.size = 12;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			header.setTextFormat(format);
			addChild(header);
			
			format = new TextFormat();
			format.size = 12;
			format.font = Main.GLOBAL_FONT;
			descArea = new GuiTextArea(24, 70, 200, 100, format);
			descArea.maxChars = 255;
			addChild(descArea);
			
			header = new TextField();
			header.text = "Please note that repeated false\nreports may result in a ban.";
			header.width = 200;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 24;
			header.y = 180;
			format = new TextFormat();
			format.size = 10;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			header.setTextFormat(format);
			addChild(header);
			
			format = new TextFormat();
			format.size = 13;
			var button:Button = new GuiButton("Report", 15, 200, 120, 45, reportClicked, GuiButton.RED, format);
			addChild(button);
			format = new TextFormat();
			format.size = 12;
			button = new GuiButton("Cancel", 135, 203, 100, 40, cancelClicked, GuiButton.PURPLE, format);
			addChild(button);
			
			var x:int = (parentWindow is ControllerGame ? 275 : 150);
			super(x, 140, 248, 250);
		}
		
		private function reportClicked(e:Event):void {
			visible = false;
			Main.ShowHourglass();
			if (parentWindow is SaveLoadWindow) {
				var p:SaveLoadWindow = (parentWindow as SaveLoadWindow);
				p.cont.ShowDialog("Reporting...");
				if (dataType == 0) {
					Database.ReportRobot(id, ControllerGame.userName, descArea.text, p.finishReporting);
				} else if (dataType == 1) {
					Database.ReportReplay(id, ControllerGame.userName, descArea.text, p.finishReporting);
				} else {
					Database.ReportChallenge(id, ControllerGame.userName, descArea.text, p.finishReporting);
				}
			} else {
				var pa:ControllerGame = (parentWindow as ControllerGame);
				pa.ShowDialog("Reporting...");
				if (dataType == 0) {
					Database.ReportRobot(id, ControllerGame.userName, descArea.text, pa.finishReporting);
				} else if (dataType == 1) {
					Database.ReportReplay(id, ControllerGame.userName, descArea.text, pa.finishReporting);
				} else {
					Database.ReportChallenge(id, ControllerGame.userName, descArea.text, pa.finishReporting);
				}
			}
		}
		
		private function cancelClicked(e:Event):void {
			visible = false;
			if (parentWindow is SaveLoadWindow) {
				(parentWindow as SaveLoadWindow).HideFader();
			} else {
				(parentWindow as ControllerGame).m_fader.visible = false;
			}
		}
	}
}