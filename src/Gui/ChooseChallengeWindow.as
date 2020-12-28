package Gui
{
	import Game.*;
	import Game.Tutorials.*;
	
	import General.*;
	
	import fl.controls.*;
	
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;

	public class ChooseChallengeWindow extends GuiWindow
	{
		private var cont:Controller;
		private var curPage:int;
		private var searchWindow:SearchWindow = null;

		public var header:TextField;
		public var sortByText:TextField = null;
		public var sortPeriodText:TextField = null;
		public var sortByBox:ComboBox = null;
		public var sortPeriodBox:ComboBox = null;
		public var dataList:List;
		public var notesLabel:TextField;
		public var descArea:TextArea;
		public var searchButton:Button;
		public var okButton:Button;
		public var cancelButton:Button;
		public var pageText:TextField;
		public var prevPageButton:Button;
		public var nextPageButton:Button;
		public var nameText:TextField;
		public var authorText:TextField;
		public var createdText:TextField;
		public var editedText:TextField;
		public var viewsText:TextField;
		public var ratingText:TextField;

		public function ChooseChallengeWindow(contr:Controller) {
			cont = contr;
			
			curPage = Database.curChallengePage;
			
			Main.ShowMouse();
			
			header = new TextField();
			header.text = "Choose a Challenge";
			header.width = 200;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 174;
			header.y = 10;
			var format:TextFormat = new TextFormat();
			format.size = 20;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			header.setTextFormat(format);
			addChild(header);

			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 12;
			format.color = 0x4C3D57;
			dataList = new List();
			dataList.width = 210;
			dataList.height = 280;
			dataList.x = 20;
			dataList.y = 140;
			dataList.setRendererStyle("textFormat", format);
			for (var i:int = 0; i < Database.challengeList.length; i++) {
				var listItem:Object = new Object();
				listItem.label = " " + Database.challengeList[i].name;
				dataList.addItem(listItem);
			}
			dataList.setStyle("cellRenderer", MyWideCellRenderer);
			dataList.setStyle("skin", GuiTextArea.textAreaBase());
			dataList.setStyle("trackDisabledSkin", MainEditPanel.scrollbarField());
			dataList.setStyle("trackDownSkin", MainEditPanel.scrollbarField());
			dataList.setStyle("trackOverSkin", MainEditPanel.scrollbarField());
			dataList.setStyle("trackUpSkin", MainEditPanel.scrollbarField());
			dataList.setStyle("thumbDisabledSkin", MainEditPanel.scrollbarTallBase());
			dataList.setStyle("thumbDownSkin", MainEditPanel.scrollbarTallClick());
			dataList.setStyle("thumbOverSkin", MainEditPanel.scrollbarTallRoll());
			dataList.setStyle("thumbUpSkin", MainEditPanel.scrollbarTallBase());
			dataList.setStyle("downArrowUpSkin", MainEditPanel.scrollbarButtonDownBase());
			dataList.setStyle("downArrowOverSkin", MainEditPanel.scrollbarButtonDownRoll());
			dataList.setStyle("downArrowDownSkin", MainEditPanel.scrollbarButtonDownClick());
			dataList.setStyle("downArrowDisabledSkin", MainEditPanel.scrollbarButtonDownBase());
			dataList.setStyle("upArrowUpSkin", MainEditPanel.scrollbarButtonUpBase());
			dataList.setStyle("upArrowOverSkin", MainEditPanel.scrollbarButtonUpRoll());
			dataList.setStyle("upArrowDownSkin", MainEditPanel.scrollbarButtonUpClick());
			dataList.setStyle("upArrowDisabledSkin", MainEditPanel.scrollbarButtonUpBase());
			dataList.addEventListener(MouseEvent.CLICK, dataListClicked, false, 0, true);
			addChild(dataList);
			
			format = new TextFormat();
			format.size = 12;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			notesLabel = new TextField();
			notesLabel.text = "Notes:";
			notesLabel.x = 350;
			notesLabel.y = 190;
			notesLabel.width = 100;
			notesLabel.textColor = 0x242930;
			notesLabel.setTextFormat(format);
			addChild(notesLabel);
			format = new TextFormat();
			format.size = 12;
			format.font = Main.GLOBAL_FONT;
			descArea = new GuiTextArea(270, 210, 260, 160, format);
			descArea.maxChars = 255;
			descArea.editable = false;
			addChild(descArea);

			format = new TextFormat();
			format.size = 12;
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			nameText = new TextField();
			nameText.text = "Challenge:";
			nameText.width = 100;
			nameText.height = 20;
			nameText.selectable = false;
			nameText.x = 275;
			nameText.y = 60;
			nameText.setTextFormat(format);
			addChild(nameText);
			authorText = new TextField();
			authorText.text = "Author:";
			authorText.width = 100;
			authorText.height = 20;
			authorText.selectable = false;
			authorText.x = 275;
			authorText.y = 90;
			authorText.setTextFormat(format);
			addChild(authorText);
			createdText = new TextField();
			createdText.text = "Date Created:";
			createdText.width = 100;
			createdText.height = 20;
			createdText.selectable = false;
			createdText.x = 275;
			createdText.y = 108;
			createdText.setTextFormat(format);
			addChild(createdText);
			editedText = new TextField();
			editedText.text = "Last Edited:";
			editedText.width = 100;
			editedText.height = 20;
			editedText.selectable = false;
			editedText.x = 275;
			editedText.y = 126;
			editedText.setTextFormat(format);
			addChild(editedText);
			viewsText = new TextField();
			viewsText.text = "Number of Views:";
			viewsText.width = 100;
			viewsText.height = 20;
			viewsText.selectable = false;
			viewsText.x = 275;
			viewsText.y = 144;
			viewsText.setTextFormat(format);
			addChild(viewsText);
			ratingText = new TextField();
			ratingText.text = "Rating:";
			ratingText.width = 100;
			ratingText.height = 20;
			ratingText.selectable = false;
			ratingText.x = 275;
			ratingText.y = 162;
			ratingText.setTextFormat(format);
			addChild(ratingText);
			nameText = new TextField();
			nameText.text = "";
			nameText.width = 160;
			nameText.height = 20;
			nameText.selectable = false;
			nameText.x = 385;
			nameText.y = 60;
			nameText.setTextFormat(format);
			addChild(nameText);
			authorText = new TextField();
			authorText.text = "";
			authorText.width = 160;
			authorText.height = 20;
			authorText.selectable = false;
			authorText.x = 385;
			authorText.y = 90;
			authorText.setTextFormat(format);
			authorText.addEventListener(MouseEvent.CLICK, userLink, false, 0, true);
			addChild(authorText);
			createdText = new TextField();
			createdText.text = "";
			createdText.width = 160;
			createdText.height = 20;
			createdText.selectable = false;
			createdText.x = 385;
			createdText.y = 108;
			createdText.setTextFormat(format);
			addChild(createdText);
			editedText = new TextField();
			editedText.text = "";
			editedText.width = 160;
			editedText.height = 20;
			editedText.selectable = false;
			editedText.x = 385;
			editedText.y = 126;
			editedText.setTextFormat(format);
			addChild(editedText);
			viewsText = new TextField();
			viewsText.text = "";
			viewsText.width = 160;
			viewsText.height = 20;
			viewsText.selectable = false;
			viewsText.x = 385;
			viewsText.y = 144;
			viewsText.setTextFormat(format);
			addChild(viewsText);
			ratingText = new TextField();
			ratingText.text = "";
			ratingText.width = 160;
			ratingText.height = 20;
			ratingText.selectable = false;
			ratingText.x = 385;
			ratingText.y = 162;
			ratingText.setTextFormat(format);
			addChild(ratingText);

			format = new TextFormat();
			format.color = 0x242930;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			pageText = new TextField();
			pageText.text = "Page " + curPage + " of " + Database.numPages;
			pageText.width = 100;
			pageText.height = 20;
			pageText.selectable = false;
			pageText.x = 70;
			pageText.y = 425;
			pageText.setTextFormat(format);
			addChild(pageText);
			if (Database.curSearch != "") {
				format = new TextFormat();
				format.color = 0x242930;
				format.align = TextFormatAlign.CENTER;
				format.font = Main.GLOBAL_FONT;
				format.size = 10;
				pageText = new TextField();
				pageText.text = "Search: " + Database.curSearch.substr(5);
				pageText.width = 200;
				pageText.height = 20;
				pageText.selectable = false;
				pageText.x = 20;
				pageText.y = 440;
				pageText.setTextFormat(format);
				addChild(pageText);
			}
			format = new TextFormat();
			format.size = 12;
			prevPageButton = new GuiButton("Previous Page", 8, 450, 120, 40, prevPageButtonPressed, GuiButton.PURPLE, format);
			addChild(prevPageButton);
			nextPageButton = new GuiButton("Next Page", 122, 450, 120, 40, nextPageButtonPressed, GuiButton.PURPLE, format);
			addChild(nextPageButton);

			format = new TextFormat();
			format.color = 0x242930;
			format.font = Main.GLOBAL_FONT;
			sortByText = new TextField();
			sortByText.text = "Sort By :";
			sortByText.width = 60;
			sortByText.height = 20;
			sortByText.selectable = false;
			sortByText.x = 29;
			sortByText.y = 53;
			sortByText.setTextFormat(format);
			addChild(sortByText);

			sortPeriodText = new TextField();
			sortPeriodText.text = "Sort Filter :";
			sortPeriodText.width = 80;
			sortPeriodText.height = 20;
			sortPeriodText.selectable = false;
			sortPeriodText.x = 15;
			sortPeriodText.y = 83;
			sortPeriodText.setTextFormat(format);
			addChild(sortPeriodText);
			
			sortPeriodBox = new GuiCombobox(83, 75, 135, 32);
			sortPeriodBox.addItem({label:"  Featured"});
			sortPeriodBox.addItem({label:"  All Time"});
			sortPeriodBox.addItem({label:"  Today"});
			sortPeriodBox.addItem({label:"  Last 7 Days"});
			sortPeriodBox.addItem({label:"  Last 30 Days"});
			sortPeriodBox.selectedIndex = Database.curSortPeriod + 1;
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 12;
			format.color = 0x573D40;
			sortPeriodBox.textField.setStyle("textFormat", format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 10;
			format.color = 0x4C3D57;
			sortPeriodBox.dropdown.setRendererStyle("textFormat", format);
			sortPeriodBox.addEventListener(Event.CHANGE, boxChanged, false, 0, true);
			sortPeriodBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, refreshMouse, false, 0, true);
			addChild(sortPeriodBox);
			
			sortByBox = new GuiCombobox(83, 45, 135, 32);
			sortByBox.addItem({label:"  Most Viewed"});
			sortByBox.addItem({label:"  Creation Date"});
			sortByBox.addItem({label:"  Edit Date"});
			sortByBox.addItem({label:"  Alphabetical"});
			sortByBox.addItem({label:"  Rating"});
			sortByBox.selectedIndex = Database.curSortType;
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 12;
			format.color = 0x573D40;
			sortByBox.textField.setStyle("textFormat", format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 10;
			format.color = 0x4C3D57;
			sortByBox.dropdown.setRendererStyle("textFormat", format);
			sortByBox.addEventListener(Event.CHANGE, boxChanged, false, 0, true);
			sortByBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, refreshMouse, false, 0, true);
			addChild(sortByBox);

			// Buttons
			format = new TextFormat();
			format.size = 13;
			okButton = new GuiButton("View Scores", 330, 370, 140, 50, okButtonPressed, GuiButton.RED, format);
			addChild(okButton);
			format = new TextFormat();
			format.size = 12;
			cancelButton = new GuiButton("Cancel", 345, 410, 110, 40, cancelButtonPressed, GuiButton.PURPLE, format);
			addChild(cancelButton);
			searchButton = new GuiButton("Search", 80, 105, 140, 35, searchButtonPressed, GuiButton.BLUE, format);
			addChild(searchButton);

			super(127, 50, 547, 505);
		}
		
		private function searchButtonPressed(e:MouseEvent):void {
			if (searchWindow) removeChild(searchWindow);
			searchWindow = new SearchWindow(this, false, "Challenge");
			addChild(searchWindow);
			ShowFader();
		}
		
		private function cancelButtonPressed(e:MouseEvent):void {
			visible = false;
			if (cont is ControllerGame) {
				(cont as ControllerGame).m_fader.visible = false;
			} else {
				(cont as ControllerMainMenu).fader2.visible = false;
			}
		}

		private function boxChanged(e:Event):void {
			curPage = 1;
			Database.curSearch = "";
			reloadData(e);
		}

		public function Search(searchString:String):void {
			curPage = 1;
			Database.curSearch = searchString;
			reloadData(new Event(""));
		}

		private function dataListClicked(e:MouseEvent):void {
			if (dataList.selectedIndex >= 0) {
				descArea.text = Database.challengeList[dataList.selectedIndex].description;
				nameText.text = Database.challengeList[dataList.selectedIndex].name;
				authorText.text = Database.challengeList[dataList.selectedIndex].user;
				createdText.text = Util.FormatDate(Database.challengeList[dataList.selectedIndex].createTime);
				editedText.text = Util.FormatDate(Database.challengeList[dataList.selectedIndex].editTime);
				viewsText.text = Database.challengeList[dataList.selectedIndex].viewCount;
				ratingText.text = (isNaN(Database.challengeList[dataList.selectedIndex].rating) ? 0 : Database.challengeList[dataList.selectedIndex].rating.toPrecision(3)) + " (" + Database.challengeList[dataList.selectedIndex].numRatings + " rating" + (Database.challengeList[dataList.selectedIndex].numRatings == 1 ? "" : "s") + ")";
				
				var format:TextFormat = new TextFormat();
				format.size = 12;
				format.font = Main.GLOBAL_FONT;
				format.color = 0x242930;
				nameText.setTextFormat(format);
				createdText.setTextFormat(format);
				editedText.setTextFormat(format);
				viewsText.setTextFormat(format);
				ratingText.setTextFormat(format);
				format = new TextFormat();
				format.size = 12;
				format.font = Main.GLOBAL_FONT;
				format.underline = true;
				format.color = 0x0000FF;
				authorText.setTextFormat(format);
			}
		}

		private function okButtonPressed(e:MouseEvent):void {
			if (dataList.selectedIndex >= 0) {
				visible = false;
				Database.GetScoreData(ControllerGame.userName, ControllerGame.password, Database.challengeList[dataList.selectedIndex].id, Database.highScoresDaily, Database.highScoresPersonal, Database.highScoresSortType, 1, "", cont.finishGettingScoreData);
				cont.ShowDialog("Getting scores...");
				Main.ShowHourglass();
			} else {
				ShowFader();
				cont.ShowDialog2("You need to select a challenge first!");
			}
		}
		
		private function reloadData(e:Event):void {
			dataList.removeAll();
			Database.GetChallengeData(ControllerGame.userName, ControllerGame.password, true, sortByBox.selectedIndex, sortPeriodBox.selectedIndex - 1, curPage, Database.curSearch, cont.finishGettingLoadChallengeForScoreData);
			ShowFader();
			cont.ShowDialog("Getting challenges...");
			Main.ShowHourglass();
		}

		private function prevPageButtonPressed(e:Event):void {
			if (curPage > 1) {
				curPage--;
				reloadData(e);
			}
		}
		
		private function nextPageButtonPressed(e:Event):void {
			if (curPage < Database.numPages) {
				curPage++;
				reloadData(e);
			}
		}
		
		private function userLink(e:Event):void {
			if (dataList.selectedIndex >= 0) {
				Main.BrowserRedirect("http://incredibots2.com/users.php?user=" + escape(Database.challengeList[dataList.selectedIndex].user), true);
			}
		}
		
		private function refreshMouse(e:Event):void {
			Main.RefreshMouse(stage, (e.target as Sprite));
		}
	};
}