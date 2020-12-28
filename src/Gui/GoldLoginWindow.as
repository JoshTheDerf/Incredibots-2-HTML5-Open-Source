package Gui
{
	import Game.*;
	
	import General.*;
	
	import fl.controls.*;
	import fl.events.*;
	
	import flash.events.*;
	import flash.text.*;
	
	public class GoldLoginWindow extends GuiWindow
	{
		private var cont:ControllerMainMenu;
		private var m_termsWindow:TermsWindow;
		
		public var header:TextField;
		public var nameLabel:TextField;
		public var pwLabel:TextField;
		public var nameArea:TextInput;
		public var pwArea:TextInput;
		public var loginButton:Button;
		public var subscribeButton:Button;

		public function GoldLoginWindow(contr:ControllerMainMenu) {
			cont = contr;
			
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			format.align = TextFormatAlign.CENTER;
			header = new TextField();
			header.text = "Please log in as an\nIncrediBots supporter.";
			header.x = 8;
			header.y = 15;
			header.width = 140;
			header.setTextFormat(format);
			header.selectable = false;
			addChild(header);
			
			nameLabel = new TextField();
			nameLabel.text = "User Name:";
			nameLabel.x = 27;
			nameLabel.y = 53;
			nameLabel.width = 100;
			nameLabel.setTextFormat(format);
			nameLabel.selectable = false;
			addChild(nameLabel);
			
			pwLabel = new TextField();
			pwLabel.text = "Password:";
			pwLabel.x = 27;
			pwLabel.y = 103;
			pwLabel.width = 100;
			pwLabel.setTextFormat(format);
			pwLabel.selectable = false;
			addChild(pwLabel);
			
			format = new TextFormat();
			nameArea = new GuiTextInput(27, 72, 100, format);
			addChild(nameArea);
			
			pwArea = new GuiTextInput(27, 122, 100, format);
			pwArea.displayAsPassword = true;
			pwArea.addEventListener(KeyboardEvent.KEY_DOWN, keyPressed, false, 0, true);
			addChild(pwArea);
			
			loginButton = new GuiButton("Login", 27, 152, 100, 35, loginButtonPressed, GuiButton.PURPLE);
			addChild(loginButton);
			subscribeButton = new GuiButton("Subscribe", 27, 182, 100, 35, subscribeButtonPressed, GuiButton.PURPLE);
			addChild(subscribeButton);
			
			super(323, 116, 154, 224);
		}
		
		private function loginButtonPressed(e:MouseEvent):void {
			if (LSOManager.HasReadTerms()) {
				if (nameArea.text.length > 0 && pwArea.text.length > 0) {
					Database.LoginGold(nameArea.text, pwArea.text, cont.finishLoggingInGold);
					ShowFader();
					cont.ShowDialog("Authenticating...");
					Main.ShowHourglass();
				} else if (nameArea.text.length == 0) {
					ShowFader();
					cont.ShowDialog2("Enter your user name in the corresponding text field.");
				} else {
					ShowFader();
					cont.ShowDialog2("Enter your password in the corresponding text field.");
				}
			} else {
				if (m_termsWindow) removeChild(m_termsWindow);
				m_termsWindow = new TermsWindow(this, loginButtonPressed);
				ShowFader();
				addChild(m_termsWindow);
			}
		}
		
		private function keyPressed(e:KeyboardEvent):void {
			if (e.keyCode == 13) loginButtonPressed(new MouseEvent(""));
		}
		
		private function subscribeButtonPressed(e:MouseEvent):void {
			Main.BrowserRedirect("http://www.incredifriends.com/", true);
		}
	}
}