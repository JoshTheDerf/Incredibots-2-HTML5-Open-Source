package Gui
{
	import Game.*;
	import General.LSOManager;
	
	import fl.controls.*;
	import fl.events.*;
	
	import flash.events.*;
	import flash.text.*;
	
	public class TermsWindow extends GuiWindow
	{
		private var parentWindow:GuiWindow;
		private var loginFunction:Function;
		
		public var header:TextField;
		public var termsLink:TextField;
		public var okButton:Button;
		public var cancelButton:Button;

		public function TermsWindow(p:GuiWindow, l:Function) {
			parentWindow = p;
			loginFunction = l;
			
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			format.align = TextFormatAlign.CENTER;
			header = new TextField();
			header.text = "Note that by clicking OK\nyou acknowledge that\nyou have read and\nagree to the";
			header.x = 8;
			header.y = 15;
			header.width = 140;
			header.setTextFormat(format);
			header.selectable = false;
			addChild(header);
			
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x0000FF;
			format.align = TextFormatAlign.CENTER;			
			termsLink = new TextField();
			termsLink.text = "IncrediBots\nTERMS OF USE.";
			termsLink.x = 27;
			termsLink.y = 75;
			termsLink.width = 100;
			termsLink.setTextFormat(format);
			termsLink.selectable = false;
			termsLink.addEventListener(MouseEvent.CLICK, termsButton, false, 0, true);
			addChild(termsLink);
			
			okButton = new GuiButton("OK", 27, 112, 100, 35, okButtonPressed, GuiButton.PURPLE);
			addChild(okButton);
			cancelButton = new GuiButton("Cancel", 27, 142, 100, 35, cancelButtonPressed, GuiButton.PURPLE);
			addChild(cancelButton);
			
			super(0, 0, 154, 185);
		}
		
		private function okButtonPressed(e:MouseEvent):void {
			LSOManager.SetTermsRead();
			visible = false;
			loginFunction(e);
		}
		
		private function cancelButtonPressed(e:MouseEvent):void {
			visible = false;
			parentWindow.HideFader();
		}
		
		private function termsButton(e:MouseEvent):void {
			Main.BrowserRedirect("http://www.incredifriends.com/", true);
		}
	}
}