package Gui
{
	import Game.*;
	
	import General.*;
	
	import fl.controls.*;
	
	import flash.events.*;
	import flash.text.*;
	
	public class NewUserWindow extends GuiWindow
	{
		private var cont:Controller;
		private var m_termsWindow:TermsWindow;
		
		public var header:TextField;
		public var nameLabel:TextField;
		public var pwLabel:TextField;
		public var cpwLabel:TextField;
		public var nameArea:TextInput;
		public var pwArea:TextInput;
		public var cpwArea:TextInput;
		public var loginButton:Button;
		public var cancelButton:Button;

		public function NewUserWindow(contr:Controller) {
			cont = contr;
			
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			header = new TextField();
			header.text = "Add New User";
			header.x = 40;
			header.y = 15;
			header.width = 100;
			header.setTextFormat(format);
			header.selectable = false;
			addChild(header);
			
			nameLabel = new TextField();
			nameLabel.text = "User Name:";
			nameLabel.x = 27;
			nameLabel.y = 38;
			nameLabel.width = 100;
			nameLabel.setTextFormat(format);
			nameLabel.selectable = false;
			addChild(nameLabel);
			
			pwLabel = new TextField();
			pwLabel.text = "Password:";
			pwLabel.x = 27;
			pwLabel.y = 88;
			pwLabel.width = 100;
			pwLabel.setTextFormat(format);
			pwLabel.selectable = false;
			addChild(pwLabel);
			
			cpwLabel = new TextField();
			cpwLabel.text = "Confirm Password:";
			cpwLabel.x = 27;
			cpwLabel.y = 138;
			cpwLabel.width = 110;
			cpwLabel.setTextFormat(format);
			cpwLabel.selectable = false;
			addChild(cpwLabel);
			
			format = new TextFormat();
			nameArea = new GuiTextInput(27, 57, 100, format);
			nameArea.maxChars = 25;
			addChild(nameArea);
			
			pwArea = new GuiTextInput(27, 107, 100, format);
			pwArea.displayAsPassword = true;
			addChild(pwArea);
			
			cpwArea = new GuiTextInput(27, 157, 100, format);
			cpwArea.displayAsPassword = true;
			cpwArea.addEventListener(KeyboardEvent.KEY_DOWN, keyPressed, false, 0, true);
			addChild(cpwArea);
			
			loginButton = new GuiButton("Register", 27, 177, 100, 35, loginButtonPressed, GuiButton.PURPLE);
			addChild(loginButton);
			cancelButton = new GuiButton("Cancel", 27, 207, 100, 35, cancelButtonPressed, GuiButton.PURPLE);
			addChild(cancelButton);
			
			super(323, 116, 154, 254);
		}
		
		public function cancelButtonPressed(e:MouseEvent):void {
			visible = false;
			if (cont is ControllerGame) {
				if ((cont as ControllerGame).m_loginWindow && (cont as ControllerGame).m_loginWindow.visible) (cont as ControllerGame).m_loginWindow.HideFader();
				else (cont as ControllerGame).m_fader.visible = false;
			} else {
				(cont as ControllerMainMenu).m_loginWindow.HideFader();
			}
		}
		
		private function keyPressed(e:KeyboardEvent):void {
			if (e.keyCode == 13) loginButtonPressed(new MouseEvent(""));
		}
		
		private function loginButtonPressed(e:MouseEvent):void {
			if (LSOManager.HasReadTerms()) {
				if (nameArea.text.length > 0 && pwArea.text.length > 3 && pwArea.text == cpwArea.text) {
					Database.AddUser(nameArea.text, pwArea.text, cont.finishAddingUser);
					ShowFader();
					cont.ShowDialog("Adding User...");
				} else if (nameArea.text.length == 0) {
					ShowFader();
					cont.ShowDialog2("Enter a user name in the corresponding text field.");
				} else if (pwArea.text != cpwArea.text) {
					ShowFader();
					cont.ShowDialog2("The password and confirm password fields must match.");
				} else {
					ShowFader();
					cont.ShowDialog2("Your password must be at least 4 characters in length.");
				}
			} else {
				if (m_termsWindow) removeChild(m_termsWindow);
				m_termsWindow = new TermsWindow(this, loginButtonPressed);
				ShowFader();
				addChild(m_termsWindow);
			}
		}
	}
}