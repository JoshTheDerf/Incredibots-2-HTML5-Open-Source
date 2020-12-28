package Gui
{
	import Game.Controller;
	
	import General.Database;
	
	import fl.controls.*;
	
	import flash.events.Event;
	import flash.events.MouseEvent;
	import flash.system.System;
	import flash.text.*;
	
	public class ExportWindow extends GuiWindow
	{
		private var cont:Controller;
		private var msgArea:TextField;
		private var linkArea:TextArea;
		private var okButton:Button;
		private var copyButton:Button;
		
		public function ExportWindow(contr:Controller, exportStr:String, robotStr:String)
		{
			cont = contr;
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			msgArea = new TextField();
			msgArea.x = 0;
			msgArea.y = 25;
			msgArea.width = 300;
			msgArea.height = 200;
			msgArea.text = "The IncrediBots servers are going to be shut down\nsoon, thus saving to the servers has been disabled.\n\nInstead, you may export your " + robotStr + " to a file.\nTo do so, copy and paste the text below into a file;\nit can be restored by clicking \"Load\", then \"Import.\"\n\nNOTE: Make sure to do this with all of your\nimportant robots, replays, and challenges, as\nsoon this will be the only way to access them!";
			msgArea.selectable = false;
			format.size = 12;
			format.align = TextFormatAlign.CENTER;
			msgArea.setTextFormat(format);
			addChild(msgArea);
			
			format = new TextFormat();
			format.size = 10;
			linkArea = new GuiTextArea(15, 185, 265, 160, format);
			linkArea.text = exportStr;
			linkArea.editable = false;
			linkArea.addEventListener(MouseEvent.CLICK, linkAreaClicked, false, 0, true);
			addChild(linkArea);
			
			okButton = new GuiButton("OK", 125, 385, 50, 30, cont.HideExportDialog, GuiButton.PURPLE);
			addChild(okButton);
			copyButton = new GuiButton("Copy to Clipboard", 80, 350, 140, 35, copyButtonPressed, GuiButton.ORANGE);
			addChild(copyButton);
			
			super(244, 83, 312, 434, false);
		}
		
		private function copyButtonPressed(e:MouseEvent):void {
			System.setClipboard(linkArea.text);
		}
		
		private function linkAreaClicked(e:MouseEvent):void {
			linkArea.setSelection(0, 1000000);
		}
	}
}