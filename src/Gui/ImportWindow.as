package Gui
{
	import Game.Controller;
	import Game.ControllerGame;
	
	import General.Database;
	
	import fl.controls.*;
	
	import flash.events.Event;
	import flash.text.*;
	
	public class ImportWindow extends GuiWindow
	{
		
		public static const TYPE_ROBOT:int = 0;
		public static const TYPE_REPLAY:int = 1;
		public static const TYPE_CHALLENGE:int = 2;
		
		private var cont:Controller;
		private var msgArea:TextField;
		private var linkArea:TextArea;
		private var importButton:Button;
		private var cancelButton:Button;
		private var type:int;
		
		public function ImportWindow(contr:Controller, iType:int)
		{
			cont = contr;
			type = iType;
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			msgArea = new TextField();
			msgArea.x = 0;
			msgArea.y = 25;
			msgArea.width = 300;
			msgArea.height = 100;
			msgArea.text = "Copy and paste the text you got from exporting\nyour " + (type == TYPE_ROBOT ? "robot" : (type == TYPE_REPLAY ? "replay" : "challenge")) + " in the box below, then press \"Import.\"";
			msgArea.selectable = false;
			format.size = 12;
			format.align = TextFormatAlign.CENTER;
			msgArea.setTextFormat(format);
			addChild(msgArea);
			
			format = new TextFormat();
			format.size = 10;
			linkArea = new GuiTextArea(15, 85, 265, 260, format);
			addChild(linkArea);
			
			importButton = new GuiButton("Import", 100, 345, 100, 35, doImport, GuiButton.ORANGE);
			addChild(importButton);
			cancelButton = new GuiButton("Cancel", 100, 375, 100, 35, cont.HideImportDialog, GuiButton.PURPLE);
			addChild(cancelButton);
			
			super(244, 83, 312, 434, false);
		}
		
		private function doImport(e:Event):void {
			if (linkArea.text.length > 0) {
				cont.HideImportDialog(e);
				if (type == TYPE_ROBOT) {
					cont.processLoadedRobot(Database.ImportRobot(linkArea.text));
				} else if (type == TYPE_REPLAY) {
					cont.processLoadedReplay(Database.ImportReplay(linkArea.text));
				} else if (type == TYPE_CHALLENGE) {
					cont.processLoadedChallenge(Database.ImportChallenge(linkArea.text));
				}
			}
		}
	}
}