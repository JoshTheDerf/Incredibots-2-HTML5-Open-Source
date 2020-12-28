package Gui
{
	import Game.*;
	
	import fl.controls.*;
	
	import flash.display.Sprite;
	import flash.events.*;
	import flash.text.*;
	
	public class RateWindow extends GuiWindow
	{
		private var cont:ControllerGame;
		private var msgArea:TextField;
		private var ratingBox:ComboBox;
		private var cancelButton:Button;
		private var redirect:int;
		
		public function RateWindow(contr:ControllerGame, type:int, redirectTo:int = 0, forced:Boolean = true)
		{
			cont = contr;
			redirect = redirectTo;
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			format.align = TextFormatAlign.CENTER;
			msgArea = new TextField();
			msgArea.x = 15;
			msgArea.y = 25;
			msgArea.width = 180;
			msgArea.text = (redirectTo != 0 || forced ? "Please rate this " : "Enter a rating for this ") + (type == 2 ? "challenge" : (type == 1 ? "replay" : "robot")) + ":";
			msgArea.selectable = false;
			msgArea.setTextFormat(format);
			addChild(msgArea);
			
			ratingBox = new GuiCombobox(50, 40, 100, 35);
			ratingBox.addItem({label:"  --"});
			ratingBox.addItem({label:"  1"});
			ratingBox.addItem({label:"  2"});
			ratingBox.addItem({label:"  3"});
			ratingBox.addItem({label:"  4"});
			ratingBox.addItem({label:"  5"});
			ratingBox.addItem({label:"  6"});
			ratingBox.addItem({label:"  7"});
			ratingBox.addItem({label:"  8"});
			ratingBox.addItem({label:"  9"});
			ratingBox.addItem({label:"  10"});
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 12;
			format.color = 0x573D40;
			ratingBox.textField.setStyle("textFormat", format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 10;
			format.color = 0x4C3D57;
			ratingBox.dropdown.setRendererStyle("textFormat", format);
			ratingBox.addEventListener(Event.CHANGE, ratingChanged, false, 0, true);
			ratingBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, refreshMouse, false, 0, true);
			addChild(ratingBox);
			
			cancelButton = new GuiButton("Cancel", 60, 80, 80, 30, cancelPressed, GuiButton.PURPLE);
			addChild(cancelButton);
			
			super(300, 170, 200, 120);
		}
		
		private function cancelPressed(e:Event):void {
			visible = false;
			if (cont.m_postReplayWindow && cont.m_postReplayWindow.visible) cont.m_postReplayWindow.HideFader();
			else cont.m_fader.visible = false;
			if (redirect == 1) {
				cont.loadButton(new MouseEvent(""), false);
			} else if (redirect == 2) {
				cont.loadRobotButton(new MouseEvent(""), false);
			} else if (redirect == 3) {
				cont.loadReplayButton(new MouseEvent(""), false);
			} else if (redirect == 4) {
				cont.loadChallengeButton(new MouseEvent(""), false);
			} else if (redirect == 5) {
				cont.rewindButton(new MouseEvent(""), false);
			}
		}
		
		private function ratingChanged(e:Event):void {
			cont.rateWindowClosed(ratingBox.selectedIndex, redirect);
			stage.focus = null;
		}
		
		private function refreshMouse(e:Event):void {
			e.target.height = 220;
			Main.RefreshMouse(stage, (e.target as Sprite));
		}
	}
}