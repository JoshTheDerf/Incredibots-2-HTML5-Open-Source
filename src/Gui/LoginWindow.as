package Gui
{
	import Game.*;
	
	import General.*;
	
	import fl.controls.*;
	import fl.events.*;
	
	import flash.events.*;
	import flash.text.*;
	
	public class LoginWindow extends GuiWindow
	{
		private var cont:Controller;
		private var m_termsWindow:TermsWindow;
		
		public var header:TextField;
		public var nameLabel:TextField;
		public var pwLabel:TextField;
		public var nameArea:TextInput;
		public var pwArea:TextInput;
		public var loginButton:Button;
		public var cancelButton:Button;
		public var newUserButton:Button;

		public function LoginWindow(contr:Controller) {
			cont = contr;
			
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			header = new TextField();
			header.text = "Log In";
			header.x = 57;
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
			
			format = new TextFormat();
			nameArea = new GuiTextInput(27, 57, 100, format);
			addChild(nameArea);
			
			pwArea = new GuiTextInput(27, 107, 100, format);
			pwArea.displayAsPassword = true;
			pwArea.addEventListener(KeyboardEvent.KEY_DOWN, keyPressed, false, 0, true);
			addChild(pwArea);
			
			loginButton = new GuiButton("Login", 27, 142, 100, 35, loginButtonPressed, GuiButton.PURPLE);
			addChild(loginButton);
			cancelButton = new GuiButton("Cancel", 27, 172, 100, 35, cancelButtonPressed, GuiButton.PURPLE);
			addChild(cancelButton);
			newUserButton = new GuiButton("New User", 27, 202, 100, 35, newUserButtonPressed, GuiButton.PURPLE);
			addChild(newUserButton);
			
			super(323, 116, 154, 244);
		}
		
		public function cancelButtonPressed(e:MouseEvent):void {
			visible = false;
			if (cont is ControllerGame) {
				var clickedReport:Boolean = ((cont as ControllerGame).m_chooserWindow && (cont as ControllerGame).m_chooserWindow.visible);
				if (!(cont as ControllerGame).m_scoreWindow || !(cont as ControllerGame).m_scoreWindow.visible) (cont as ControllerGame).m_fader.visible = false;
				(cont as ControllerGame).clickedSave = false;
				(cont as ControllerGame).clickedSaveReplay = false;
				(cont as ControllerGame).clickedSaveChallenge = false;
				(cont as ControllerGame).clickedSubmitScore = false;
				(cont as ControllerGame).clickedReport = false;
				if (!clickedReport && (cont as ControllerGame).backToSaveWindow && (cont as ControllerGame).m_chooserWindow && ((cont as ControllerGame).m_chooserWindow.dataType == SaveLoadWindow.LOAD_ROBOT_TYPE || (cont as ControllerGame).m_chooserWindow.dataType == SaveLoadWindow.LOAD_REPLAY_TYPE || (cont as ControllerGame).m_chooserWindow.dataType == SaveLoadWindow.LOAD_CHALLENGE_TYPE)) {
					(cont as ControllerGame).m_chooserWindow.yourRobotsBox.selected = false;
				} else if (!clickedReport && (cont as ControllerGame).backToSaveWindow && (cont as ControllerGame).m_chooserWindow && ((cont as ControllerGame).m_chooserWindow.dataType == SaveLoadWindow.HIGH_SCORE_TYPE)) {
					(cont as ControllerGame).m_chooserWindow.m_scoreTypeBox.selectedIndex = 0;
				}
				(cont as ControllerGame).loginHidden(e, false);
			} else {
				if ((cont as ControllerMainMenu).m_loadWindow && (cont as ControllerMainMenu).backToSaveWindow) {
					(cont as ControllerMainMenu).backToSaveWindow = false;
					if ((cont as ControllerMainMenu).m_loadWindow.dataType == SaveLoadWindow.HIGH_SCORE_TYPE) {
						(cont as ControllerMainMenu).m_loadWindow.m_scoreTypeBox.selectedIndex = 0;
						(cont as ControllerMainMenu).ReloadLoadWindow();
					} else {
						(cont as ControllerMainMenu).m_loadWindow.yourRobotsBox.selected = false;
					}
					(cont as ControllerMainMenu).m_loadWindow.visible = true;
					(cont as ControllerMainMenu).m_loadWindow.HideFader();
				} else {
					(cont as ControllerMainMenu).fader2.visible = false;
				}
			}
		}
		
		private function loginButtonPressed(e:MouseEvent):void {
			if (LSOManager.HasReadTerms()) {
				if (nameArea.text.length > 0 && pwArea.text.length > 0) {
					Database.Login(nameArea.text, pwArea.text, cont.finishLoggingIn);
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
		
		private function newUserButtonPressed(e:MouseEvent):void {
			ShowFader();
			if (cont is ControllerGame) {
				if ((cont as ControllerGame).m_newUserWindow) (cont as ControllerGame).removeChild((cont as ControllerGame).m_newUserWindow);
				(cont as ControllerGame).m_newUserWindow = new NewUserWindow(cont);
				(cont as ControllerGame).addChild((cont as ControllerGame).m_newUserWindow);
			} else {
				if ((cont as ControllerMainMenu).m_newUserWindow) (cont as ControllerMainMenu).removeChild((cont as ControllerMainMenu).m_newUserWindow);
				(cont as ControllerMainMenu).m_newUserWindow = new NewUserWindow(cont);
				(cont as ControllerMainMenu).addChild((cont as ControllerMainMenu).m_newUserWindow);
			}
		}
		
		public function displayMessage():void {
			header.x = 12;
			header.width = 130;
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			header.text = "You need to log in first!";
			header.setTextFormat(format);
		}
	}
}