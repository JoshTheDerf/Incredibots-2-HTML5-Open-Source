package Gui
{
	import Game.ControllerGame;
	
	import fl.controls.*;
	
	import flash.events.Event;
	import flash.display.Sprite;
	import flash.text.*;
	
	public class SearchWindow extends GuiWindow
	{
		private var parentWindow:GuiWindow;
		private var isScores:Boolean;
		private var searchText:TextInput;
		private var searchTypeBox:ComboBox;
		
		public function SearchWindow(p:GuiWindow, scores:Boolean, type:String)
		{
			parentWindow = p;
			isScores = scores;
			
			var header:TextField = new TextField();
			header.text = "Search";
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
			header.text = "Search for: ";
			header.width = 120;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 64;
			header.y = 70;
			format = new TextFormat();
			format.size = 12;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			header.setTextFormat(format);
			addChild(header);
			
			format = new TextFormat();
			format.size = 12;
			format.font = Main.GLOBAL_FONT;
			searchText = new GuiTextInput(24, 90, 200, format);
			searchText.maxChars = 20;
			addChild(searchText);
			
			searchTypeBox = new GuiCombobox(15, 33, 220, 32);
			searchTypeBox.addItem({label:"   Search by " + type + " Name"});
			searchTypeBox.addItem({label:"   Search by User Name"});
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 12;
			format.color = 0x573D40;
			searchTypeBox.textField.setStyle("textFormat", format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 11;
			format.color = 0x4C3D57;
			searchTypeBox.dropdown.setRendererStyle("textFormat", format);
			searchTypeBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, refreshMouse, false, 0, true);
			addChild(searchTypeBox);
			
			header = new TextField();
			header.text = "Note that searches can only\nmatch the first part of the name.";
			header.width = 200;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 24;
			header.y = 115;
			format = new TextFormat();
			format.size = 10;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			header.setTextFormat(format);
			addChild(header);
			
			format = new TextFormat();
			format.size = 13;
			var button:Button = new GuiButton("Search!", 15, 140, 120, 45, searchClicked, GuiButton.RED, format);
			addChild(button);
			format = new TextFormat();
			format.size = 12;
			button = new GuiButton("Cancel", 135, 143, 100, 40, cancelClicked, GuiButton.PURPLE, format);
			addChild(button);
			
			var x:int = (parentWindow is ControllerGame ? 275 : 150);
			super(x, 140, 248, 200);
		}
		
		private function searchClicked(e:Event):void {
			visible = false;
			Main.ShowHourglass();
			if (parentWindow is SaveLoadWindow) {
				if (searchText.text == "") {
					(parentWindow as SaveLoadWindow).Search("");
				} else {
					(parentWindow as SaveLoadWindow).Search((isScores || searchTypeBox.selectedIndex == 1 ? "user:" : "name:") + searchText.text);
				}
			} else {
				if (searchText.text == "") {
					(parentWindow as ChooseChallengeWindow).Search("");
				} else {
					(parentWindow as ChooseChallengeWindow).Search((isScores || searchTypeBox.selectedIndex == 1 ? "user:" : "name:") + searchText.text);
				}
			}
		}
		
		private function cancelClicked(e:Event):void {
			visible = false;
			parentWindow.HideFader();
		}

		private function refreshMouse(e:Event):void {
			Main.RefreshMouse(stage, (e.target as Sprite));
		}
	}
}