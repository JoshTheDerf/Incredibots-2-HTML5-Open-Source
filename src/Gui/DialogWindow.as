package Gui
{
	import Game.*;
	
	import fl.controls.Button;
	
	import flash.events.*;
	import flash.text.*;
	import flash.utils.Timer;

	public class DialogWindow extends GuiWindow
	{
		private var cont:Controller;
		private var msgArea:TextField;
		private var timer:Timer;
		
		public function DialogWindow(contr:Controller, msg:String, center:Boolean = false, okButton:Boolean = false, big:Boolean = false) {
			cont = contr;
			
			super(300, 200, 200, 100 + (big ? 20 : 0));
			
			var numChars:int = msg.length;
			var i:int = 0;
			while (numChars > 31) {
				var spaceIndex:int = msg.substring(0, i + 31).lastIndexOf(" ");
				msg = msg.substring(0, spaceIndex) + "\n" + msg.substring(spaceIndex + 1);
				if (big) {
					numChars = msg.length - spaceIndex;
					i = spaceIndex;
				} else {
					numChars -= spaceIndex;
					i += spaceIndex;
				}
			}
			
			msgArea = new TextField();
			msgArea.x = 13;
			msgArea.y = 15;
			msgArea.width = 178;
			msgArea.text = msg;
			msgArea.textColor = 0x242930;
			msgArea.selectable = false;
			var format:TextFormat = new TextFormat();
			if (center) format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			msgArea.setTextFormat(format);
			addChild(msgArea);
			
			if (okButton) {
				var b:Button = new GuiButton("OK", 75, 57, 50, 30, cont.DialogOK, GuiButton.PURPLE);
				addChild(b);
			} else {
				timer = new Timer(1000, 15);
				timer.addEventListener(TimerEvent.TIMER, TimerDotHandler);
				timer.start();
			}
		}
		
		private function TimerDotHandler(e:Event):void {
			msgArea.appendText(".");
		}
		
		private function TimerHideHandler(e:Event):void {
			StopTimer();
			visible = false;
		}
		
		public function StopTimer():void {
			if (timer) {
				timer.stop();
				timer.removeEventListener(TimerEvent.TIMER, TimerHideHandler);
				timer.removeEventListener(TimerEvent.TIMER, TimerDotHandler);
			}
		}
		
		public function ShowOKButton():void {
			var b:Button = new GuiButton("OK", 75, 57, 50, 30, cont.HideDialog, GuiButton.PURPLE);
			addChild(b);
		}
		
		public function ShowOKAndCancelButton(type:int):void {
			var b:Button = new GuiButton("OK", 40, 57 + (type == 8 ? 20 : 0), 50, 30, (type == 0 ? (cont as ControllerGame).ConfirmSaveRobot : (type == 1 ? (cont as ControllerGame).ConfirmSaveReplay : (type == 2 ? cont.ConfirmDeleteRobot : (type == 3 ? cont.ConfirmDeleteReplay : (type == 4 ? (cont as ControllerGame).ConfirmNewRobot : (type == 5 ? BrowserRedirect : (type == 6 ? BrowserRedirect2 : (type == 7 ? BrowserRedirect3 : (type == 8 ? BrowserRedirect4 : (type == 9 ? (cont as ControllerGame).ConfirmSaveChallenge : (type == 10 ? cont.ConfirmDeleteChallenge : (type == 11 ? editButton : cont.ConfirmLogout)))))))))))), GuiButton.PURPLE);
			addChild(b);
			b = new GuiButton("Cancel", 100, 57 + (type == 8 ? 20 : 0), 60, 30, cont.HideConfirmDialog, GuiButton.PURPLE);
			addChild(b);
			timer.stop();
		}
		
		public function ShowBuildBoxButtons():void {
			var b:Button = new GuiButton("Keep", 25, 80, 70, 35, cont.HideConfirmDialog, GuiButton.PURPLE);
			addChild(b);
			b = new GuiButton("Delete", 95, 80, 80, 35, (cont as ControllerChallenge).DeleteBuildBoxes, GuiButton.PURPLE);
			addChild(b);
			timer.stop();
		}
		
		public function SetMessage(msg:String, isError:Boolean = false):void {
			msgArea.text = msg;
			if (isError) {
				var format:TextFormat = new TextFormat();
				format.size = 10;
				msgArea.setTextFormat(format);
				msgArea.wordWrap = true;
				msgArea.multiline = true;
			}
		}
		
		private function editButton(e:Event):void {
			(cont as ControllerGame).editButton(new MouseEvent(""), true);
		}
		
		public function GetMessage():String {
			return msgArea.text;
		}
		
		public function HideInXSeconds(secs:Number):void {
			StopTimer();
			timer = new Timer(1000 * secs);
			timer.addEventListener(TimerEvent.TIMER, TimerHideHandler);
			timer.start();
		}
		
		private function BrowserRedirect(e:Event):void {
			Main.BrowserRedirect();
		}
		
		private function BrowserRedirect2(e:Event):void {
			if (Main.inIFrame) Main.BrowserRedirect("http://incredibots.com/old/" + ControllerGame.replay.version + "/incredibots.php?replayID=" + ControllerGame.potentialReplayID);
			else Main.BrowserRedirect("http://incredibots.com/old/" + ControllerGame.replay.version + "/?replayID=" + ControllerGame.potentialReplayID);
		}
		
		private function BrowserRedirect3(e:Event):void {
			Main.BrowserRedirect(null, false, true);
		}
		
		private function BrowserRedirect4(e:Event):void {
			Main.BrowserRedirect("http://www.incredifriends.com/", true);
			cont.HideConfirmDialog(e);
		}
	}
}