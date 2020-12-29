package Gui
{
	import Game.*;
	import Game.Tutorials.*;

	import General.*;

	import Parts.Part;

	import fl.controls.*;

	import flash.display.*;
	import flash.events.*;
	import flash.text.*;

	public class SaveLoadWindow extends GuiWindow
	{
		public var cont:Controller;
		public var dataType:int;

		private var curPage:int;
		private var reportWindow:ReportWindow = null;
		private var searchWindow:SearchWindow = null;

		public var header:TextField;
		public var yourRobotsBox:CheckBox = null;
		public var yourRobotsText:TextField = null;
		public var sortByText:TextField = null;
		public var sortPeriodText:TextField = null;
		public var sortByBox:ComboBox = null;
		public var sortPeriodBox:ComboBox = null;
		public var dataList:List;
		public var nameLabel:TextField;
		public var nameArea:TextInput;
		public var notesLabel:TextField;
		public var descArea:TextArea;
		public var saveOrLoadButton:Button;
		public var deleteButton:Button;
		public var loginButton:Button;
		public var cancelButton:Button;
		public var searchButton:Button;
		public var differentChallengeButton:Button;
		public var sharedBox:CheckBox;
		public var disableEditBox:CheckBox;
		public var propBox:CheckBox;
		public var m_commentButton:Button;
		public var m_linkButton:Button;
		public var m_embedButton:Button;
		public var scoreTypeText:TextField;
		public var m_scoreTypeBox:ComboBox;
		public var pageText:TextField;
		public var prevPageButton:Button;
		public var nextPageButton:Button;
		public var nameText:TextField;
		public var authorText:TextField;
		public var createdText:TextField;
		public var editedText:TextField;
		public var viewsText:TextField;
		public var ratingText:TextField;
		public var featuredButton:Button = null;
		public var exportButton:Button = null;

		public static const SAVE_ROBOT_TYPE:int = 0;
		public static const SAVE_REPLAY_TYPE:int = 1;
		public static const LOAD_ROBOT_TYPE:int = 2;
		public static const LOAD_REPLAY_TYPE:int = 3;
		public static const HIGH_SCORE_TYPE:int = 4;
		public static const SAVE_CHALLENGE_TYPE:int = 5;
		public static const LOAD_CHALLENGE_TYPE:int = 6;

		public function SaveLoadWindow(contr:Controller, type:int) {
			cont = contr;
			dataType = type;

			var isSaveType:Boolean = (type == SAVE_ROBOT_TYPE || type == SAVE_REPLAY_TYPE || type == SAVE_CHALLENGE_TYPE);
			var isLoadType:Boolean = (type == LOAD_ROBOT_TYPE || type == LOAD_REPLAY_TYPE || type == LOAD_CHALLENGE_TYPE);
			var isScoreType:Boolean = (type == HIGH_SCORE_TYPE);
			var isRobotType:Boolean = (type == SAVE_ROBOT_TYPE || type == LOAD_ROBOT_TYPE);
			var isReplayType:Boolean = (type == SAVE_REPLAY_TYPE || type == LOAD_REPLAY_TYPE);
			var isChallengeType:Boolean = (type == SAVE_CHALLENGE_TYPE || type == LOAD_CHALLENGE_TYPE);

			curPage = (isScoreType ? Database.curScorePage : (isRobotType ? Database.curRobotPage : (isReplayType ? Database.curReplayPage : Database.curChallengePage)));

			Main.ShowMouse();

			header = new TextField();
			if (dataType == SAVE_ROBOT_TYPE) header.text = "Export Robot";
			else if (dataType == SAVE_REPLAY_TYPE) header.text = "Export Replay";
			else if (dataType == SAVE_CHALLENGE_TYPE) header.text = "Export Challenge";
			else if (dataType == LOAD_ROBOT_TYPE) header.text = "Load Robot";
			else if (dataType == LOAD_REPLAY_TYPE) header.text = "Load Replay";
			else if (dataType == LOAD_CHALLENGE_TYPE) header.text = "Load Challenge";
			else header.text = "High Scores for " + Database.highScoresChallengeName;
			header.width = 120;
			if (isChallengeType) header.width = 160;
			if (dataType == SAVE_REPLAY_TYPE) header.width = 140;
			if (isScoreType) header.width = 460;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 214;
			if (isChallengeType) header.x = 194;
			if (isScoreType) header.x = 44;
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
			dataList.width = (isScoreType ? 509 : 210);
			dataList.height = (isScoreType ? 300 : (isSaveType ? 340 : 320));
			dataList.x = 20;
			dataList.y = (isScoreType ? 82 : (isSaveType ? 115 : 150));
			dataList.setRendererStyle("textFormat", format);
			if (isRobotType) {
				for (var i:int = 0; i < Database.robotList.length; i++) {
					var listItem:* = new Object();
					listItem.label = " " + Database.robotList[i].name;
					dataList.addItem(listItem);
				}
			} else if (isReplayType) {
				for (i = 0; i < Database.replayList.length; i++) {
					listItem = new Object();
					listItem.label = " " + Database.replayList[i].name;
					dataList.addItem(listItem);
				}
			} else if (isChallengeType) {
				for (i = 0; i < Database.challengeList.length; i++) {
					listItem = new Object();
					listItem.label = " " + Database.challengeList[i].name;
					dataList.addItem(listItem);
				}
			} else {
				for (i = 0; i < Database.scoreList.length; i++) {
					listItem = new Object();
					listItem.label = " " + Database.scoreList[i].user + ": " + Database.scoreList[i].score;
					dataList.addItem(listItem);
				}
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

			if (isLoadType) {
				format = new TextFormat();
				format.color = 0x242930;
				format.font = Main.GLOBAL_FONT;
				format.size = 12;
				yourRobotsBox = new GuiCheckBox();
				yourRobotsBox.label = (dataType == LOAD_ROBOT_TYPE ? "Your Robots Only " : (dataType == LOAD_REPLAY_TYPE ? "Your Replays Only " : "Your Challenges Only "));
				if ((isRobotType && Database.robotType == Database.NORMAL) || (isReplayType && Database.replayType == Database.NORMAL) || (isChallengeType && Database.challengeType == Database.NORMAL)) yourRobotsBox.selected = true;
				yourRobotsBox.x = 35;
				yourRobotsBox.y = 35;
				yourRobotsBox.width = 190;
				yourRobotsBox.setStyle("textFormat", format);
				yourRobotsBox.addEventListener(Event.CHANGE, boxChanged, false, 0, true);
				addChild(yourRobotsBox);
			}

			if (isScoreType) {
				format = new TextFormat();
				format.color = 0x242930;
				format.font = Main.GLOBAL_FONT;
				scoreTypeText = new TextField();
				scoreTypeText.text = "Score Type :";
				scoreTypeText.width = 80;
				scoreTypeText.height = 20;
				scoreTypeText.selectable = false;
				scoreTypeText.x = 35;
				scoreTypeText.y = 53;
				scoreTypeText.setTextFormat(format);
				addChild(scoreTypeText);

				m_scoreTypeBox = new GuiCombobox(105, 45, 135, 32);
				m_scoreTypeBox.addItem({label:"  All-time Scores"});
				m_scoreTypeBox.addItem({label:"  Today's Scores"});
				m_scoreTypeBox.addItem({label:"  Your Scores"});
				format = new TextFormat();
				format.font = Main.GLOBAL_FONT;
				format.size = 12;
				format.color = 0x573D40;
				m_scoreTypeBox.textField.setStyle("textFormat", format);
				format = new TextFormat();
				format.font = Main.GLOBAL_FONT;
				format.size = 10;
				format.color = 0x4C3D57;
				m_scoreTypeBox.dropdown.setRendererStyle("textFormat", format);
				m_scoreTypeBox.addEventListener(Event.CHANGE, reloadHighScoreData, false, 0, true);
				m_scoreTypeBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, refreshMouse, false, 0, true);
				m_scoreTypeBox.selectedIndex = Database.scoreType - 2;
				addChild(m_scoreTypeBox);
			} else {
				format = new TextFormat();
				format.size = 12;
				format.align = TextFormatAlign.CENTER;
				format.font = Main.GLOBAL_FONT;
				notesLabel = new TextField();
				notesLabel.text = "Notes:";
				notesLabel.x = 350;
				notesLabel.y = (isSaveType ? 213 : 160);
				notesLabel.width = 100;
				notesLabel.textColor = 0x242930;
				notesLabel.setTextFormat(format);
				addChild(notesLabel);
				format = new TextFormat();
				format.size = 12;
				format.font = Main.GLOBAL_FONT;
				descArea = new GuiTextArea(270, (isSaveType ? 233 : 180), 260, (type == SAVE_REPLAY_TYPE ? 155 : (type == SAVE_ROBOT_TYPE ? 135 : 145)), format);
				descArea.maxChars = 255;
				if (isLoadType) descArea.editable = false;
				addChild(descArea);

				format = new TextFormat();
				format.size = 12;
				format.font = Main.GLOBAL_FONT;
				format.color = 0x242930;
				nameText = new TextField();
				nameText.text = (isRobotType ? "Robot:" : (isReplayType ? "Replay:" : "Challenge:"));
				nameText.width = 100;
				nameText.height = 20;
				nameText.selectable = false;
				nameText.x = 275;
				nameText.y = (isSaveType ? 50 : 40);
				nameText.setTextFormat(format);
				addChild(nameText);
				authorText = new TextField();
				authorText.text = "Author:";
				authorText.width = 100;
				authorText.height = 20;
				authorText.selectable = false;
				authorText.x = 275;
				authorText.y = (isSaveType ? 80 : 70);
				authorText.setTextFormat(format);
				addChild(authorText);
				createdText = new TextField();
				createdText.text = "Date Created:";
				createdText.width = 100;
				createdText.height = 20;
				createdText.selectable = false;
				createdText.x = 275;
				createdText.y = (isSaveType ? 98 : 88);
				createdText.setTextFormat(format);
				addChild(createdText);
				editedText = new TextField();
				editedText.text = "Last Edited:";
				editedText.width = 100;
				editedText.height = 20;
				editedText.selectable = false;
				editedText.x = 275;
				editedText.y = (isSaveType ? 116 : 106);
				editedText.setTextFormat(format);
				addChild(editedText);
				viewsText = new TextField();
				viewsText.text = "Number of Views:";
				viewsText.width = 100;
				viewsText.height = 20;
				viewsText.selectable = false;
				viewsText.x = 275;
				viewsText.y = (isSaveType ? 134 : 124);
				viewsText.setTextFormat(format);
				addChild(viewsText);
				ratingText = new TextField();
				ratingText.text = "Rating:";
				ratingText.width = 100;
				ratingText.height = 20;
				ratingText.selectable = false;
				ratingText.x = 275;
				ratingText.y = (isSaveType ? 152 : 142);
				ratingText.setTextFormat(format);
				addChild(ratingText);
				nameText = new TextField();
				nameText.text = "";
				nameText.width = 160;
				nameText.height = 20;
				nameText.selectable = false;
				nameText.x = 385;
				nameText.y = (isSaveType ? 50 : 40);
				nameText.setTextFormat(format);
				addChild(nameText);
				authorText = new TextField();
				authorText.text = "";
				authorText.width = 160;
				authorText.height = 20;
				authorText.selectable = false;
				authorText.x = 385;
				authorText.y = (isSaveType ? 80 : 70);
				authorText.setTextFormat(format);
				authorText.addEventListener(MouseEvent.CLICK, userLink, false, 0, true);
				addChild(authorText);
				createdText = new TextField();
				createdText.text = "";
				createdText.width = 160;
				createdText.height = 20;
				createdText.selectable = false;
				createdText.x = 385;
				createdText.y = (isSaveType ? 98 : 88);
				createdText.setTextFormat(format);
				addChild(createdText);
				editedText = new TextField();
				editedText.text = "";
				editedText.width = 160;
				editedText.height = 20;
				editedText.selectable = false;
				editedText.x = 385;
				editedText.y = (isSaveType ? 116 : 106);
				editedText.setTextFormat(format);
				addChild(editedText);
				viewsText = new TextField();
				viewsText.text = "";
				viewsText.width = 160;
				viewsText.height = 20;
				viewsText.selectable = false;
				viewsText.x = 385;
				viewsText.y = (isSaveType ? 134 : 124);
				viewsText.setTextFormat(format);
				addChild(viewsText);
				ratingText = new TextField();
				ratingText.text = "";
				ratingText.width = 160;
				ratingText.height = 20;
				ratingText.selectable = false;
				ratingText.x = 385;
				ratingText.y = (isSaveType ? 152 : 142);
				ratingText.setTextFormat(format);
				addChild(ratingText);
			}

			format = new TextFormat();
			format.color = 0x242930;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			pageText = new TextField();
			pageText.text = "Page " + curPage + " of " + Database.numPages;
			pageText.width = 200;
			pageText.height = 20;
			pageText.selectable = false;
			pageText.x = (isScoreType ? 173 : 20);
			pageText.y = (isScoreType ? 392 : (isSaveType ? 458 : 475));
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
				pageText.x = (isScoreType ? 173 : 20);
				pageText.y = 490;
				pageText.setTextFormat(format);
				addChild(pageText);
			}
			format = new TextFormat();
			format.size = 12;
			prevPageButton = new GuiButton("Previous Page", (isScoreType ? 108 : 8), (isScoreType ? 380 : (isSaveType ? 473 : 500)), 120, 40, prevPageButtonPressed, GuiButton.PURPLE, format);
			addChild(prevPageButton);
			nextPageButton = new GuiButton("Next Page", (isScoreType ? 318 : 122), (isScoreType ? 380 : (isSaveType ? 473 : 500)), 120, 40, nextPageButtonPressed, GuiButton.PURPLE, format);
			addChild(nextPageButton);

			format = new TextFormat();
			format.color = 0x242930;
			format.font = Main.GLOBAL_FONT;
			sortByText = new TextField();
			sortByText.text = "Sort By :";
			sortByText.width = 60;
			sortByText.height = 20;
			sortByText.selectable = false;
			sortByText.x = (isScoreType ? 315 : 38);
			sortByText.y = (isScoreType ? 53 : (isSaveType ? 58 : 63));
			sortByText.setTextFormat(format);
			addChild(sortByText);

			if (!isScoreType) {
				sortPeriodText = new TextField();
				sortPeriodText.text = "Sort Filter :";
				sortPeriodText.width = 80;
				sortPeriodText.height = 20;
				sortPeriodText.selectable = false;
				sortPeriodText.x = 22;
				sortPeriodText.y = (isSaveType ? 88 : 93);
				sortPeriodText.setTextFormat(format);
				addChild(sortPeriodText);

				sortPeriodBox = new GuiCombobox(83, (isSaveType ? 80 : 85), 135, 32);
				sortPeriodBox.addItem({label:"  Featured"});
				sortPeriodBox.addItem({label:"  All Time"});
				sortPeriodBox.addItem({label:"  Today"});
				sortPeriodBox.addItem({label:"  Last 7 Days"});
				sortPeriodBox.addItem({label:"  Last 30 Days"});
				if (isRobotType) sortPeriodBox.addItem({label:"  Props"});
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
			}

			sortByBox = new GuiCombobox((isScoreType ? 362 : 83), (isScoreType ? 45 : (isSaveType ? 50 : 55)), 135, 32);
			if (isScoreType) sortByBox.addItem({label:"  Score"});
			sortByBox.addItem({label:"  Most Viewed"});
			if (isScoreType) {
				sortByBox.addItem({label:"  Score Date"});
				sortByBox.selectedIndex = Database.highScoresSortType + 1;
			} else {
				sortByBox.addItem({label:"  Creation Date"});
				sortByBox.addItem({label:"  Edit Date"});
				sortByBox.addItem({label:"  Alphabetical"});
				sortByBox.addItem({label:"  Rating"});
				sortByBox.selectedIndex = Database.curSortType;
			}
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

			if (isSaveType) {
				format = new TextFormat();
				format.color = 0x242930;
				format.align = TextFormatAlign.CENTER;
				format.font = Main.GLOBAL_FONT;
				yourRobotsText = new TextField();
				yourRobotsText.text = (dataType == SAVE_ROBOT_TYPE ? "Your Robots" : (dataType == SAVE_REPLAY_TYPE ? "Your Replays" : "Your Challenges"));
				yourRobotsText.width = 120;
				yourRobotsText.height = 20;
				yourRobotsText.selectable = false;
				yourRobotsText.x = 55;
				yourRobotsText.y = 33;
				yourRobotsText.setTextFormat(format);
				addChild(yourRobotsText);

				format = new TextFormat();
				format.size = 12;
				format.align = TextFormatAlign.CENTER;
				format.font = Main.GLOBAL_FONT;
				nameLabel = new TextField();
				nameLabel.text = "Name:";
				nameLabel.x = 350;
				nameLabel.y = 170;
				nameLabel.width = 100;
				nameLabel.textColor = 0x242930;
				nameLabel.setTextFormat(format);
				addChild(nameLabel);
				format = new TextFormat();
				format.size = 12;
				format.font = Main.GLOBAL_FONT;
				nameArea = new GuiTextInput(320, 188, 160, format);
				nameArea.maxChars = 20;
				addChild(nameArea);

				format = new TextFormat();
				format.color = 0x242930;
				format.font = Main.GLOBAL_FONT;
				format.size = 12;
				sharedBox = new GuiCheckBox();
				sharedBox.label = "Make Public";
				sharedBox.x = 330;
				sharedBox.y = (type == SAVE_REPLAY_TYPE ? 393 : (type == SAVE_CHALLENGE_TYPE ? 383 : 373));
				sharedBox.width = 120;
				sharedBox.selected = (!(cont is ControllerHomeMovies) && !(cont is ControllerRubeGoldberg));
				sharedBox.setStyle("textFormat", format);
				sharedBox.enabled = (ControllerGameGlobals.userName != "_Public" && !(cont is ControllerHomeMovies) && !(cont is ControllerRubeGoldberg));
				addChild(sharedBox);
				if (type == SAVE_ROBOT_TYPE || type == SAVE_CHALLENGE_TYPE) {
					sharedBox.addEventListener(Event.CHANGE, sharedBoxChanged, false, 0, true);
					disableEditBox = new GuiCheckBox();
					disableEditBox.label = "Allow Copies";
					disableEditBox.x = 330;
					disableEditBox.y = (type == SAVE_ROBOT_TYPE ? 393 : 403);
					disableEditBox.width = 145;
					disableEditBox.selected = (ControllerGameGlobals.userName != "_Public" && !(cont is ControllerHomeMovies) && !(cont is ControllerRubeGoldberg));
					if (cont is ControllerChallenge) disableEditBox.selected = false;
					disableEditBox.enabled = (ControllerGameGlobals.userName != "_Public" && !(cont is ControllerHomeMovies) && !(cont is ControllerRubeGoldberg));
					disableEditBox.setStyle("textFormat", format);
					addChild(disableEditBox);

					if (type == SAVE_ROBOT_TYPE) {
						propBox = new GuiCheckBox();
						propBox.label = "Make Prop";
						propBox.x = 330;
						propBox.y = 413;
						propBox.width = 145;
						propBox.selected = false;
						propBox.setStyle("textFormat", format);
						addChild(propBox);
					}
				}
			}

			if (isLoadType) {
				format = new TextFormat();
				format.color = 0x242930;
				format.font = Main.GLOBAL_FONT;
				var text:TextField = new TextField();
				text.text = "Inappropriate?";
				text.width = 85;
				text.height = 20;
				text.selectable = false;
				text.x = 305;
				text.y = 506;
				text.setTextFormat(format);
				addChild(text);
				text = new TextField();
				text.text = "to report!";
				text.width = 60;
				text.height = 20;
				text.selectable = false;
				text.x = 449;
				text.y = 506;
				text.setTextFormat(format);
				addChild(text);

				format = new TextFormat();
				format.color = 0x0000FF;
				format.underline = true;
				format.font = Main.GLOBAL_FONT;
				text = new TextField();
				text.text = "Click Here";
				text.width = 60;
				text.height = 20;
				text.selectable = false;
				text.x = 389;
				text.y = 506;
				text.setTextFormat(format);
				text.addEventListener(MouseEvent.CLICK, reportClicked, false, 0, true);
				addChild(text);
			}

			// Buttons
			format = new TextFormat();
			format.size = (isLoadType ? 12 : 13);
			var listener:Function;
			if (type == SAVE_ROBOT_TYPE) listener = saveRobotButtonPressed;
			if (type == SAVE_REPLAY_TYPE) listener = saveReplayButtonPressed;
			if (type == SAVE_CHALLENGE_TYPE) listener = saveChallengeButtonPressed;
			if (type == LOAD_ROBOT_TYPE) listener = loadRobotButtonPressed;
			if (type == LOAD_REPLAY_TYPE) listener = loadReplayButtonPressed;
			if (type == LOAD_CHALLENGE_TYPE) listener = loadChallengeButtonPressed;
			if (type == HIGH_SCORE_TYPE) listener = loadReplayForScoreButtonPressed;
			if (isScoreType) format.size = 15;
			saveOrLoadButton = new GuiButton((isScoreType ? "View Replay" : (isSaveType ? "Export" : "Load")), (isScoreType ? 188 : (isSaveType ? 335 : 298)), (isLoadType ? 325 : (isScoreType ? 410 : (isRobotType ? 435 : (isChallengeType ? 417 : 413)))), (isLoadType ? 105 : (isScoreType ? 170 : 130)), (isScoreType ? 50 : 40), listener, GuiButton.RED, format);
			addChild(saveOrLoadButton);
			if (isLoadType) {
				loginButton = new GuiButton("Login", 398, 325, 105, 40, logInButton, GuiButton.PURPLE, format);
				addChild(loginButton);
			}
			if (!isScoreType) {
				deleteButton = new GuiButton("Delete", (isSaveType ? (isRobotType ? 275 : 335) : 298), (isSaveType ? (isRobotType ? 468 : (isChallengeType ? 445 : 443)) : 355), (isLoadType ? 105 : 130), 40, (isRobotType ? deleteRobotButtonPressed : (isReplayType ? deleteReplayButtonPressed : deleteChallengeButtonPressed)), GuiButton.PURPLE, format);
				addChild(deleteButton);
			}
			if (isScoreType) {
				format = new TextFormat();
				format.size = 12;
				differentChallengeButton = new GuiButton("View Scores for Another Challenge", -3, 490, 250, 50, differentChallengeButtonPressed, GuiButton.BLUE, format);
				addChild(differentChallengeButton);
				format = new TextFormat();
				format.size = 13;
			}
			cancelButton = new GuiButton((isScoreType ? "Close" : "Cancel"), (isScoreType ? 415 : (isSaveType ? (isRobotType ? 395 : 335) : 398)), (isSaveType ? (isRobotType ? 468 : 473) : (isScoreType ? 495 : 355)), (isLoadType ? 105 : 130), 40, cancelButtonPressed, GuiButton.PURPLE, format);
			addChild(cancelButton);
			if (!isSaveType) {
				format = new TextFormat();
				format.size = 13;
				m_commentButton = new GuiButton((type == LOAD_ROBOT_TYPE ? "Comment on this Robot" : (type == LOAD_CHALLENGE_TYPE ? "Comment on this Challenge" : "Comment on this Replay")), (isScoreType ? 0 : (isChallengeType ? 293 : 298)), (isScoreType ? 453 : (isSaveType ? 395 : 390)), (isScoreType ? 195 : (isChallengeType ? 215 : 205)), 45, commentButton, GuiButton.ORANGE, format);
				addChild(m_commentButton);
				m_linkButton = new GuiButton((type == LOAD_ROBOT_TYPE ? "Link to this Robot" : (type == LOAD_CHALLENGE_TYPE ? "Link to this Challenge" : "Link to this Replay")), (isScoreType ? 175 : (isChallengeType ? 293 : 298)), (isScoreType ? 453 : (isSaveType ? 430 : 425)), (isScoreType ? 195 : (isChallengeType ? 215 : 205)), 45, linkButton, GuiButton.ORANGE, format);
				addChild(m_linkButton);
				m_embedButton = new GuiButton((type == LOAD_ROBOT_TYPE ? "Embed this Robot" : (type == LOAD_CHALLENGE_TYPE ? "Embed this Challenge" : "Embed this Replay")), (isScoreType ? 350 : (isChallengeType ? 293 : 298)), (isScoreType ? 453 : (isSaveType ? 465 : 460)), (isScoreType ? 195 : (isChallengeType ? 215 : 205)), 45, embedButton, GuiButton.ORANGE, format);
				addChild(m_embedButton);
			}

			if (isLoadType) {
				searchButton = new GuiButton("Search", 80, 113, 140, 35, searchClicked, GuiButton.BLUE, format);
				addChild(searchButton);
			}

			if (isLoadType && Util.ObjectInArray(ControllerGameGlobals.userName, ControllerGameGlobals.ADMIN_USERS)) {
				featuredButton = new GuiButton("Feature!", 445, 5, 90, 40, featureButton, GuiButton.PURPLE, format);
				addChild(featuredButton);
			}

			if (isLoadType || isScoreType) {
				exportButton = new GuiButton("Export to Text", (isScoreType ? 430 : 340), 5, 110, 40, exportButtonPressed, GuiButton.ORANGE, format);
				addChild(exportButton);
			}

			super(127, 30, 547, (isScoreType ? 545 : (isSaveType ? 520 : 550)));
		}

		private function featureButton(e:MouseEvent):void {
			ShowFader();
			if (dataList.selectedIndex >= 0) {
				if (dataType == LOAD_ROBOT_TYPE) {
					if (Database.robotList[dataList.selectedIndex].shared) {
						Database.FeatureRobot(Database.robotList[dataList.selectedIndex].id, !Database.robotList[dataList.selectedIndex].featured, finishFeaturing);
						cont.ShowDialog("Featuring...");
						Main.ShowHourglass();
					} else {
						cont.ShowDialog2("You can only feature public robots!");
					}
				} else if (dataType == LOAD_REPLAY_TYPE) {
					if (Database.replayList[dataList.selectedIndex].shared) {
						Database.FeatureReplay(Database.replayList[dataList.selectedIndex].id, !Database.replayList[dataList.selectedIndex].featured, finishFeaturing);
						cont.ShowDialog("Featuring...");
						Main.ShowHourglass();
					} else {
						cont.ShowDialog2("You can only feature public replays!");
					}
				} else {
					if (Database.challengeList[dataList.selectedIndex].shared) {
						Database.FeatureChallenge(Database.challengeList[dataList.selectedIndex].id, !Database.challengeList[dataList.selectedIndex].featured, finishFeaturing);
						cont.ShowDialog("Featuring...");
						Main.ShowHourglass();
					} else {
						cont.ShowDialog2("You can only feature public challenges!");
					}
				}
			} else {
				cont.ShowDialog2("You need to select a " + (dataType == LOAD_ROBOT_TYPE ? "robot" : (dataType == LOAD_REPLAY_TYPE ? "replay" : "challenge")) + " first!");
			}
		}

		private function finishFeaturing(e:Event):void {
			var retVal:Boolean = Database.FinishFeaturing(e);
			if (retVal) {
				ShowFader();
				Main.ShowMouse();
				if (dataType == LOAD_ROBOT_TYPE) {
					Database.robotList[dataList.selectedIndex].featured = !Database.robotList[dataList.selectedIndex].featured;
					featuredButton.label = (Database.robotList[dataList.selectedIndex].featured ? "Un-feature!" : "Feature!");
					cont.ShowDialog2("The selected robot has been " + (Database.robotList[dataList.selectedIndex].featured ? "" : "un-") + "featured.");
				} else if (dataType == LOAD_REPLAY_TYPE) {
					Database.replayList[dataList.selectedIndex].featured = !Database.replayList[dataList.selectedIndex].featured;
					featuredButton.label = (Database.replayList[dataList.selectedIndex].featured ? "Un-feature!" : "Feature!");
					cont.ShowDialog2("The selected replay has been " + (Database.replayList[dataList.selectedIndex].featured ? "" : "un-") + "featured.");
				} else {
					Database.challengeList[dataList.selectedIndex].featured = !Database.challengeList[dataList.selectedIndex].featured;
					featuredButton.label = (Database.challengeList[dataList.selectedIndex].featured ? "Un-feature!" : "Feature!");
					cont.ShowDialog2("The selected challenge has been " + (Database.challengeList[dataList.selectedIndex].featured ? "" : "un-") + "featured.");
				}
			}
		}

		private function commentButton(e:MouseEvent):void {
			if (dataList.selectedIndex >= 0 && dataType == LOAD_ROBOT_TYPE) {
				ShowFader();
				cont.commentButton(e, Database.robotList[dataList.selectedIndex].id, Database.robotList[dataList.selectedIndex].shared);
			} else if (dataList.selectedIndex >= 0 && dataType == LOAD_REPLAY_TYPE) {
				ShowFader();
				cont.commentReplayButton(e, Database.replayList[dataList.selectedIndex].id, Database.replayList[dataList.selectedIndex].shared);
			} else if (dataList.selectedIndex >= 0 && dataType == LOAD_CHALLENGE_TYPE) {
				ShowFader();
				cont.commentChallengeButton(e, Database.challengeList[dataList.selectedIndex].id, Database.challengeList[dataList.selectedIndex].shared);
			} else if (dataList.selectedIndex >= 0 && dataType == HIGH_SCORE_TYPE) {
				ShowFader();
				cont.commentReplayButton(e, Database.scoreList[dataList.selectedIndex].replayID, true);
			} else {
				ShowFader();
				cont.ShowDialog2("You need to select a " + (dataType == LOAD_ROBOT_TYPE || dataType == SAVE_ROBOT_TYPE ? "robot" : (dataType == LOAD_REPLAY_TYPE || dataType == SAVE_REPLAY_TYPE || dataType == HIGH_SCORE_TYPE ? "replay" : "challenge")) + " first!");
			}
		}

		private function linkButton(e:MouseEvent):void {
			if (dataList.selectedIndex >= 0 && dataType == LOAD_ROBOT_TYPE) {
				ShowFader();
				cont.linkButton(e, Database.robotList[dataList.selectedIndex].id, Database.robotList[dataList.selectedIndex].shared);
			} else if (dataList.selectedIndex >= 0 && dataType == LOAD_REPLAY_TYPE) {
				ShowFader();
				cont.linkReplayButton(e, Database.replayList[dataList.selectedIndex].id, Database.replayList[dataList.selectedIndex].shared);
			} else if (dataList.selectedIndex >= 0 && dataType == LOAD_CHALLENGE_TYPE) {
				ShowFader();
				cont.linkChallengeButton(e, Database.challengeList[dataList.selectedIndex].id, Database.challengeList[dataList.selectedIndex].shared);
			} else if (dataList.selectedIndex >= 0 && dataType == HIGH_SCORE_TYPE) {
				ShowFader();
				cont.linkReplayButton(e, Database.scoreList[dataList.selectedIndex].replayID, true);
			} else {
				ShowFader();
				cont.ShowDialog2("You need to select a " + (dataType == LOAD_ROBOT_TYPE || dataType == SAVE_ROBOT_TYPE ? "robot" : (dataType == LOAD_REPLAY_TYPE || dataType == SAVE_REPLAY_TYPE || dataType == HIGH_SCORE_TYPE ? "replay" : "challenge")) + " first!");
			}
		}

		private function embedButton(e:MouseEvent):void {
			if (dataList.selectedIndex >= 0 && dataType == LOAD_ROBOT_TYPE) {
				ShowFader();
				cont.embedButton(e, Database.robotList[dataList.selectedIndex].id, Database.robotList[dataList.selectedIndex].shared);
			} else if (dataList.selectedIndex >= 0 && dataType == LOAD_REPLAY_TYPE) {
				ShowFader();
				cont.embedReplayButton(e, Database.replayList[dataList.selectedIndex].id, Database.replayList[dataList.selectedIndex].shared);
			} else if (dataList.selectedIndex >= 0 && dataType == LOAD_CHALLENGE_TYPE) {
				ShowFader();
				cont.embedChallengeButton(e, Database.challengeList[dataList.selectedIndex].id, Database.challengeList[dataList.selectedIndex].shared);
			} else if (dataList.selectedIndex >= 0 && dataType == HIGH_SCORE_TYPE) {
				ShowFader();
				cont.embedReplayButton(e, Database.scoreList[dataList.selectedIndex].replayID, true);
			} else {
				ShowFader();
				cont.ShowDialog2("You need to select a " + (dataType == LOAD_ROBOT_TYPE || dataType == SAVE_ROBOT_TYPE ? "robot" : (dataType == LOAD_REPLAY_TYPE || dataType == SAVE_REPLAY_TYPE || dataType == HIGH_SCORE_TYPE ? "replay" : "challenge")) + " first!");
			}
		}

		private function cancelButtonPressed(e:MouseEvent):void {
			visible = false;
			if (cont is ControllerGame) {
				if (!(cont as ControllerGame).m_scoreWindow || !(cont as ControllerGame).m_scoreWindow.visible) (cont as ControllerGame).m_fader.visible = false;
				if ((cont as ControllerGame).m_scoreWindow && (cont as ControllerGame).m_scoreWindow.visible) (cont as ControllerGame).m_scoreWindow.HideFader();
			} else {
				(cont as ControllerMainMenu).fader2.visible = false;
			}
		}

		private function dataListClicked(e:MouseEvent):void {
			if (dataList.selectedIndex >= 0) {
				if (dataType == SAVE_ROBOT_TYPE) {
					nameArea.text = Database.robotList[dataList.selectedIndex].name;
				} else if (dataType == SAVE_REPLAY_TYPE)  {
					nameArea.text = Database.replayList[dataList.selectedIndex].name;
				} else if (dataType == SAVE_CHALLENGE_TYPE)  {
					nameArea.text = Database.challengeList[dataList.selectedIndex].name;
				}

				if (dataType == SAVE_ROBOT_TYPE || dataType == LOAD_ROBOT_TYPE) {
					descArea.text = Database.robotList[dataList.selectedIndex].description;
					nameText.text = Database.robotList[dataList.selectedIndex].name;
					authorText.text = Database.robotList[dataList.selectedIndex].user;
					createdText.text = Util.FormatDate(Database.robotList[dataList.selectedIndex].createTime);
					editedText.text = Util.FormatDate(Database.robotList[dataList.selectedIndex].editTime);
					viewsText.text = Database.robotList[dataList.selectedIndex].viewCount;
					ratingText.text = (isNaN(Database.robotList[dataList.selectedIndex].rating) ? 0 : Database.robotList[dataList.selectedIndex].rating.toPrecision(3)) + " (" + Database.robotList[dataList.selectedIndex].numRatings + " rating" + (Database.robotList[dataList.selectedIndex].numRatings == 1 ? "" : "s") + ")";
				} else if (dataType == SAVE_REPLAY_TYPE || dataType == LOAD_REPLAY_TYPE) {
					descArea.text = Database.replayList[dataList.selectedIndex].description;
					nameText.text = Database.replayList[dataList.selectedIndex].name;
					authorText.text = Database.replayList[dataList.selectedIndex].user;
					createdText.text = Util.FormatDate(Database.replayList[dataList.selectedIndex].createTime);
					editedText.text = Util.FormatDate(Database.replayList[dataList.selectedIndex].editTime);
					viewsText.text = Database.replayList[dataList.selectedIndex].viewCount;
					ratingText.text = (isNaN(Database.replayList[dataList.selectedIndex].rating) ? 0 : Database.replayList[dataList.selectedIndex].rating.toPrecision(3)) + " (" + Database.replayList[dataList.selectedIndex].numRatings + " rating" + (Database.replayList[dataList.selectedIndex].numRatings == 1 ? "" : "s") + ")";
				} else if (dataType == SAVE_CHALLENGE_TYPE || dataType == LOAD_CHALLENGE_TYPE) {
					descArea.text = Database.challengeList[dataList.selectedIndex].description;
					nameText.text = Database.challengeList[dataList.selectedIndex].name;
					authorText.text = Database.challengeList[dataList.selectedIndex].user;
					createdText.text = Util.FormatDate(Database.challengeList[dataList.selectedIndex].createTime);
					editedText.text = Util.FormatDate(Database.challengeList[dataList.selectedIndex].editTime);
					viewsText.text = Database.challengeList[dataList.selectedIndex].viewCount;
					ratingText.text = (isNaN(Database.challengeList[dataList.selectedIndex].rating) ? 0 : Database.challengeList[dataList.selectedIndex].rating.toPrecision(3)) + " (" + Database.challengeList[dataList.selectedIndex].numRatings + " rating" + (Database.challengeList[dataList.selectedIndex].numRatings == 1 ? "" : "s") + ")";
				}

				if (dataType == SAVE_ROBOT_TYPE) {
					sharedBox.selected = Database.robotList[dataList.selectedIndex].shared;
					disableEditBox.enabled = sharedBox.selected;
					disableEditBox.selected = false;
					propBox.selected = Database.robotList[dataList.selectedIndex].prop;
				} else if (dataType == SAVE_REPLAY_TYPE) {
					sharedBox.selected = Database.replayList[dataList.selectedIndex].shared;
				} else if (dataType == SAVE_CHALLENGE_TYPE) {
					sharedBox.selected = Database.challengeList[dataList.selectedIndex].shared;
					disableEditBox.enabled = sharedBox.selected;
					disableEditBox.selected = false;
				}

				if (dataType == LOAD_ROBOT_TYPE && featuredButton) {
					featuredButton.label = (Database.robotList[dataList.selectedIndex].featured ? "Un-feature!" : "Feature!");
				} else if (dataType == LOAD_REPLAY_TYPE && featuredButton) {
					featuredButton.label = (Database.replayList[dataList.selectedIndex].featured ? "Un-feature!" : "Feature!");
				} else if (dataType == LOAD_CHALLENGE_TYPE && featuredButton) {
					featuredButton.label = (Database.challengeList[dataList.selectedIndex].featured ? "Un-feature!" : "Feature!");
				}

				if (dataType != HIGH_SCORE_TYPE) {
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
		}

		private function boxChanged(e:Event):void {
			curPage = 1;
			Database.curSearch = "";
			if (!ControllerGameGlobals.clickedBox && yourRobotsBox && yourRobotsBox.selected) {
				ControllerGameGlobals.clickedBox = true;
				if (sortPeriodBox.selectedIndex == 0) sortPeriodBox.selectedIndex = 1;
			}
			if (dataType == HIGH_SCORE_TYPE) reloadHighScoreData(e);
			else reloadData(e);
		}

		public function Search(searchString:String):void {
			curPage = 1;
			Database.curSearch = searchString;
			reloadData(new Event(""));
		}

		public function saveRobotButtonPressed(e:MouseEvent, confirmed:Boolean = false):void {
			if (nameArea.text.length > 0) {
				var overwrite:Boolean = false;
				for (var i:int = 0; i < dataList.length; i++) {
					if (nameArea.text == Database.robotList[i].name) overwrite = true;
				}
				if (false && overwrite && !confirmed) {
					ShowFader();
					(cont as ControllerGame).ShowConfirmDialog("Overwrite " + nameArea.text + "?", 0)
				} else {
					Database.ExportRobot(new Robot((cont as ControllerGame).allParts.filter(PartIsEditable), ControllerSandbox.settings, (cont as ControllerGame).draw.m_drawXOff, (cont as ControllerGame).draw.m_drawYOff, (cont as ControllerGame).m_physScale), nameArea.text, descArea.text, (sharedBox.selected ? 1 : 0), (disableEditBox.selected ? 1 : 0), (propBox.selected ? 1 : 0), (cont as ControllerGame).finishExporting);
					/*ShowFader();
					(cont as ControllerGame).ShowDialog("Saving robot...");
					Main.ShowHourglass();*/
					ControllerGameGlobals.potentialRobotPublic = sharedBox.selected;
					ControllerGameGlobals.potentialRobotFeatured = false;
				}
			} else {
				ShowFader();
				(cont as ControllerGame).ShowDialog2("You must enter a name for your robot first!");
			}
		}

		private function loadRobotButtonPressed(e:MouseEvent):void {
			if (dataList.selectedIndex >= 0) {
				Database.LoadRobot(ControllerGameGlobals.userName, ControllerGameGlobals.password, dataList.selectedIndex, cont.finishLoading);
				ShowFader();
				cont.ShowDialog("Loading robot...");
				Main.ShowHourglass();
				ControllerGameGlobals.potentialRobotID = Database.robotList[dataList.selectedIndex].id;
				ControllerGameGlobals.potentialRobotEditable = Database.robotList[dataList.selectedIndex].editable;
				ControllerGameGlobals.potentialRobotPublic = Database.robotList[dataList.selectedIndex].shared;
				ControllerGameGlobals.potentialRobotFeatured = Database.robotList[dataList.selectedIndex].featured;
			} else {
				ShowFader();
				cont.ShowDialog2("You need to select a " + (dataType == LOAD_ROBOT_TYPE || dataType == SAVE_ROBOT_TYPE ? "robot" : "replay") + " first!");
			}
		}

		public function deleteRobotButtonPressed(e:MouseEvent, confirmed:Boolean = false):void {
			if (dataList.selectedIndex >= 0) {
				if (ControllerGameGlobals.userName == "_Public" || (ControllerGameGlobals.userName != Database.robotList[dataList.selectedIndex].user && !Util.ObjectInArray(ControllerGameGlobals.userName, ControllerGameGlobals.ADMIN_USERS))) {
					ShowFader();
					cont.ShowDialog2("You can only delete robots that you have created!");
				} else if (confirmed) {
					Database.DeleteRobot(ControllerGameGlobals.userName, ControllerGameGlobals.password, dataList.selectedIndex, cont.finishDeleting);
					ShowFader();
					cont.ShowDialog("Deleting robot...");
					Main.ShowHourglass();
				} else {
					ShowFader();
					cont.ShowConfirmDialog("Delete " + dataList.selectedItem.label + "?", 2);
				}
			} else {
				ShowFader();
				cont.ShowDialog2("You need to select a " + (dataType == LOAD_ROBOT_TYPE || dataType == SAVE_ROBOT_TYPE ? "robot" : "replay") + " first!");
			}
		}

		public function saveReplayButtonPressed(e:MouseEvent, confirmed:Boolean = false):void {
			if (nameArea.text.length > 0) {
				var overwrite:Boolean = false;
				for (var i:int = 0; i < dataList.length; i++) {
					if (nameArea.text == Database.replayList[i].name) overwrite = true;
				}
				if (false && overwrite && !confirmed) {
					ShowFader();
					cont.ShowConfirmDialog("Overwrite " + nameArea.text + "?", 1)
				} else {
					(cont as ControllerGame).AddSyncPoint();
					if (ControllerGameGlobals.viewingUnsavedReplay) Database.ExportReplay(ControllerGameGlobals.replay, nameArea.text, descArea.text, ControllerGameGlobals.curRobotID, new Robot((cont as ControllerGame).allParts, ControllerSandbox.settings), -1, "", (sharedBox.selected ? 1 : 0), (cont as ControllerGame).finishExporting);
					else Database.ExportReplay(new Replay((cont as ControllerGame).cameraMovements, (cont as ControllerGame).syncPoints, (cont as ControllerGame).keyPresses, (cont as ControllerGame).frameCounter, Database.VERSION_STRING_FOR_REPLAYS), nameArea.text, descArea.text, ControllerGameGlobals.curRobotID, new Robot((cont as ControllerGame).allParts, ControllerSandbox.settings), -1, "", (sharedBox.selected ? 1 : 0), (cont as ControllerGame).finishExporting);
					/*ShowFader();
					cont.ShowDialog("Saving replay...");
					Main.ShowHourglass();*/
				}
			} else {
				ShowFader();
				cont.ShowDialog2("You need to enter a name for your replay first!");
			}
		}

		private function loadReplayButtonPressed(e:MouseEvent):void {
			if (dataList.selectedIndex >= 0) {
				Database.LoadReplay(ControllerGameGlobals.userName, ControllerGameGlobals.password, dataList.selectedIndex, cont.finishLoadingReplay);
				ShowFader();
				cont.ShowDialog("Loading replay...");
				Main.ShowHourglass();
				ControllerGameGlobals.potentialRobotID = Database.replayList[dataList.selectedIndex].robotID;
				ControllerGameGlobals.potentialReplayID = Database.replayList[dataList.selectedIndex].id;
				ControllerGameGlobals.potentialReplayPublic = Database.replayList[dataList.selectedIndex].shared;
				ControllerGameGlobals.potentialReplayFeatured = Database.replayList[dataList.selectedIndex].featured;
			} else {
				ShowFader();
				cont.ShowDialog2("You need to select a " + (dataType == LOAD_ROBOT_TYPE || dataType == SAVE_ROBOT_TYPE ? "robot" : "replay") + " first!");
			}
		}

		private function loadReplayForScoreButtonPressed(e:MouseEvent):void {
			if (dataList.selectedIndex >= 0) {
				Database.LoadReplayFromScore(ControllerGameGlobals.userName, ControllerGameGlobals.password, dataList.selectedIndex, cont.finishLoadingReplay);
				ShowFader();
				cont.ShowDialog("Loading replay...");
				Main.ShowHourglass();
				ControllerGameGlobals.potentialRobotID = Database.scoreList[dataList.selectedIndex].robotID;
				ControllerGameGlobals.potentialReplayID = Database.scoreList[dataList.selectedIndex].replayID;
				ControllerGameGlobals.potentialReplayPublic = true;
				ControllerGameGlobals.potentialReplayFeatured = false;
			} else {
				ShowFader();
				cont.ShowDialog2("You need to select a " + (dataType == LOAD_ROBOT_TYPE || dataType == SAVE_ROBOT_TYPE ? "robot" : "replay") + " first!");
			}
		}

		public function deleteReplayButtonPressed(e:MouseEvent, confirmed:Boolean = false):void {
			if (dataList.selectedIndex >= 0) {
				if (ControllerGameGlobals.userName == "_Public" || (ControllerGameGlobals.userName != Database.replayList[dataList.selectedIndex].user && !Util.ObjectInArray(ControllerGameGlobals.userName, ControllerGameGlobals.ADMIN_USERS))) {
					ShowFader();
					cont.ShowDialog2("You can only delete replays that you have created!");
				} else if (confirmed) {
					Database.DeleteReplay(ControllerGameGlobals.userName, ControllerGameGlobals.password, dataList.selectedIndex, cont.finishDeletingReplay);
					ShowFader();
					cont.ShowDialog("Deleting replay...");
					Main.ShowHourglass();
				} else {
					ShowFader();
					cont.ShowConfirmDialog("Delete " + dataList.selectedItem.label + "?", 3);
				}
			} else {
				ShowFader();
				cont.ShowDialog2("You need to select a " + (dataType == LOAD_ROBOT_TYPE || dataType == SAVE_ROBOT_TYPE ? "robot" : "replay") + " first!");
			}
		}

		public function saveChallengeButtonPressed(e:MouseEvent, confirmed:Boolean = false):void {
			if (nameArea.text.length > 0) {
				var overwrite:Boolean = false;
				for (var i:int = 0; i < dataList.length; i++) {
					if (nameArea.text == Database.challengeList[i].name) overwrite = true;
				}
				if (overwrite && !confirmed) {
					ShowFader();
					cont.ShowConfirmDialog("Overwrite " + nameArea.text + "?", 9)
				} else {
					ControllerChallenge.challenge.cameraX = (cont as ControllerGame).draw.m_drawXOff;
					ControllerChallenge.challenge.cameraY = (cont as ControllerGame).draw.m_drawYOff;
					ControllerChallenge.challenge.zoomLevel = (cont as ControllerGame).m_physScale;
					ControllerChallenge.challenge.allParts = (cont as ControllerGame).allParts;
					Database.ExportChallenge(ControllerChallenge.challenge, nameArea.text, descArea.text, (sharedBox.selected ? 1 : 0), (disableEditBox.selected ? 1 : 0), (cont as ControllerGame).finishExporting);
					/*ShowFader();
					cont.ShowDialog("Saving challenge...");
					Main.ShowHourglass();*/
					ControllerGameGlobals.potentialChallengePublic = sharedBox.selected;
					ControllerGameGlobals.potentialChallengeFeatured = false;
					ControllerGameGlobals.potentialChallengeEditable = true;
				}
			} else {
				ShowFader();
				cont.ShowDialog2("You need to enter a name for your challenge first!");
			}
		}

		private function loadChallengeButtonPressed(e:MouseEvent):void {
			if (dataList.selectedIndex >= 0) {
				Database.LoadChallenge(ControllerGameGlobals.userName, ControllerGameGlobals.password, dataList.selectedIndex, cont.finishLoadingChallenge);
				ShowFader();
				cont.ShowDialog("Loading challenge...");
				Main.ShowHourglass();
				ControllerGameGlobals.potentialChallengeID = Database.challengeList[dataList.selectedIndex].id;
				ControllerGameGlobals.potentialChallengePublic = Database.challengeList[dataList.selectedIndex].shared;
				ControllerGameGlobals.potentialChallengeFeatured = Database.challengeList[dataList.selectedIndex].featured;
				ControllerGameGlobals.potentialChallengeEditable = Database.challengeList[dataList.selectedIndex].editable;
			} else {
				ShowFader();
				cont.ShowDialog2("You need to select a challenge first!");
			}
		}

		public function deleteChallengeButtonPressed(e:MouseEvent, confirmed:Boolean = false):void {
			if (dataList.selectedIndex >= 0) {
				if (ControllerGameGlobals.userName == "_Public" || (ControllerGameGlobals.userName != Database.challengeList[dataList.selectedIndex].user && !Util.ObjectInArray(ControllerGameGlobals.userName, ControllerGameGlobals.ADMIN_USERS))) {
					ShowFader();
					cont.ShowDialog2("You can only delete challenges that you have created!");
				} else if (confirmed) {
					Database.DeleteChallenge(ControllerGameGlobals.userName, ControllerGameGlobals.password, dataList.selectedIndex, cont.finishDeletingChallenge);
					ShowFader();
					cont.ShowDialog("Deleting challenge...");
					Main.ShowHourglass();
				} else {
					ShowFader();
					cont.ShowConfirmDialog("Delete " + dataList.selectedItem.label + "?", 10);
				}
			} else {
				ShowFader();
				cont.ShowDialog2("You need to select a challenge first!");
			}
		}

		public function searchClicked(e:MouseEvent):void {
			if (searchWindow) removeChild(searchWindow);
			searchWindow = new SearchWindow(this, false, (dataType == LOAD_ROBOT_TYPE ? "Robot" : (dataType == LOAD_REPLAY_TYPE ? "Replay" : "Challenge")));
			addChild(searchWindow);
			ShowFader();
		}

		public function reportClicked(e:MouseEvent):void {
			if (dataList.selectedIndex >= 0) {
				if (dataType == LOAD_ROBOT_TYPE) {
					if (Database.robotList[dataList.selectedIndex].shared) {
						if (ControllerGameGlobals.userName == "_Public") {
							cont.loginButton(new MouseEvent(""), true, true, true);
							ShowFader();
						} else {
							if (reportWindow) removeChild(reportWindow);
							reportWindow = new ReportWindow(this, 0, Database.robotList[dataList.selectedIndex].id);
							addChild(reportWindow);
							ShowFader();
						}
					} else {
						ShowFader();
						cont.ShowDialog2("You can only report public robots!");
					}
				} else if (dataType == LOAD_REPLAY_TYPE) {
					if (Database.replayList[dataList.selectedIndex].shared) {
						if (ControllerGameGlobals.userName == "_Public") {
							cont.loginButton(new MouseEvent(""), true, true, true);
							ShowFader();
						} else {
							if (reportWindow) removeChild(reportWindow);
							reportWindow = new ReportWindow(this, 1, Database.replayList[dataList.selectedIndex].id);
							addChild(reportWindow);
							ShowFader();
						}
					} else {
						ShowFader();
						cont.ShowDialog2("You can only report public replays!");
					}
				} else {
					if (Database.challengeList[dataList.selectedIndex].shared) {
						if (ControllerGameGlobals.userName == "_Public") {
							cont.loginButton(new MouseEvent(""), true, true, true);
							ShowFader();
						} else {
							if (reportWindow) removeChild(reportWindow);
							reportWindow = new ReportWindow(this, 2, Database.challengeList[dataList.selectedIndex].id);
							addChild(reportWindow);
							ShowFader();
						}
					} else {
						ShowFader();
						cont.ShowDialog2("You can only report public challenges!");
					}
				}
			} else {
				ShowFader();
				cont.ShowDialog2("You need to select a " + (dataType == LOAD_ROBOT_TYPE || dataType == SAVE_ROBOT_TYPE ? "robot" : (dataType == LOAD_REPLAY_TYPE || dataType == SAVE_REPLAY_TYPE ? "replay" : "challenge")) + " first!");
			}
		}

		public function finishReporting(e:Event):void {
			var threadID:int = Database.FinishReporting(e);
			if (threadID != -1) {
				ShowFader();
				cont.ShowDialog2("Thank you, the moderators have been notified.");
				Main.ShowMouse();
			}
		}

		private function differentChallengeButtonPressed(e:Event):void {
			visible = false;
			Database.GetChallengeData(ControllerGameGlobals.userName, ControllerGameGlobals.password, true, Database.curSortType, Database.curSortPeriod, 1, "", cont.finishGettingLoadChallengeForScoreData);
			cont.ShowDialog("Getting challenges...");
		}

		private function logInButton(e:MouseEvent):void {
			visible = false;
			cont.loginButton(e, false, true, true);
		}

		private function sharedBoxChanged(e:Event):void {
			disableEditBox.enabled = sharedBox.selected;
			if (!disableEditBox.enabled) disableEditBox.selected = false;
		}

		private function reloadData(e:Event):void {
			if ((dataType == LOAD_ROBOT_TYPE || dataType == LOAD_REPLAY_TYPE || dataType == LOAD_CHALLENGE_TYPE) && yourRobotsBox.selected && ControllerGameGlobals.userName == "_Public") {
				if (cont is ControllerGame) dataList.removeAll();
				visible = false;
				cont.loginButton(new MouseEvent(""), true, true, true);
			} else if (dataType == LOAD_ROBOT_TYPE || dataType == SAVE_ROBOT_TYPE) {
				dataList.removeAll();
				Database.GetRobotData(ControllerGameGlobals.userName, ControllerGameGlobals.password, (dataType == LOAD_ROBOT_TYPE && !yourRobotsBox.selected), sortByBox.selectedIndex, sortPeriodBox.selectedIndex - 1, curPage, Database.curSearch, (dataType == LOAD_ROBOT_TYPE ? cont.finishGettingLoadRobotData : (cont as ControllerGame).finishGettingSaveRobotData));
				ShowFader();
				cont.ShowDialog("Getting robots...");
				Main.ShowHourglass();
			} else if (dataType == LOAD_REPLAY_TYPE || dataType == SAVE_REPLAY_TYPE) {
				dataList.removeAll();
				Database.GetReplayData(ControllerGameGlobals.userName, ControllerGameGlobals.password, (dataType == LOAD_REPLAY_TYPE && !yourRobotsBox.selected), sortByBox.selectedIndex, sortPeriodBox.selectedIndex - 1, curPage, Database.curSearch, (dataType == LOAD_REPLAY_TYPE ? cont.finishGettingLoadReplayData : (cont as ControllerGame).finishGettingSaveReplayData));
				ShowFader();
				cont.ShowDialog("Getting replays...");
				Main.ShowHourglass();
			} else if (dataType == LOAD_CHALLENGE_TYPE || dataType == SAVE_CHALLENGE_TYPE) {
				dataList.removeAll();
				Database.GetChallengeData(ControllerGameGlobals.userName, ControllerGameGlobals.password, (dataType == LOAD_CHALLENGE_TYPE && !yourRobotsBox.selected), sortByBox.selectedIndex, sortPeriodBox.selectedIndex - 1, curPage, Database.curSearch, (dataType == LOAD_CHALLENGE_TYPE ? cont.finishGettingLoadChallengeData : (cont as ControllerGame).finishGettingSaveChallengeData));
				ShowFader();
				cont.ShowDialog("Getting challenges...");
				Main.ShowHourglass();
			}
		}

		private function reloadHighScoreData(e:Event):void {
			dataList.removeAll();
			if (m_scoreTypeBox.selectedIndex == 2 && ControllerGameGlobals.userName == "_Public") {
				visible = false;
				cont.loginButton(new MouseEvent(""), true, true);
			} else {
				Database.GetScoreData(ControllerGameGlobals.userName, ControllerGameGlobals.password, Database.highScoresChallenge, (m_scoreTypeBox.selectedIndex == 1), (m_scoreTypeBox.selectedIndex == 2), sortByBox.selectedIndex - 1, curPage, Database.curSearch, cont.finishGettingScoreData);
				ShowFader();
				cont.ShowDialog("Getting high scores...");
				Main.ShowHourglass();
			}
		}

		private function prevPageButtonPressed(e:Event):void {
			if (curPage > 1) {
				curPage--;
				if (dataType == HIGH_SCORE_TYPE) reloadHighScoreData(e);
				else reloadData(e);
			}
		}

		private function nextPageButtonPressed(e:Event):void {
			if (curPage < Database.numPages) {
				curPage++;
				if (dataType == HIGH_SCORE_TYPE) reloadHighScoreData(e);
				else reloadData(e);
			}
		}

		private function PartIsEditable(p:Part, index:int, array:Array):Boolean {
			return p.isEditable;
		}

		private function userLink(e:Event):void {
			if (dataList.selectedIndex >= 0) {
				if (dataType == SAVE_ROBOT_TYPE || dataType == LOAD_ROBOT_TYPE) {
					Main.BrowserRedirect("http://www.incredifriends.com/"/* + "users.php?user=" + escape(Database.robotList[dataList.selectedIndex].user)*/, true);
				} else if (dataType == SAVE_REPLAY_TYPE || dataType == LOAD_REPLAY_TYPE) {
					Main.BrowserRedirect("http://www.incredifriends.com/"/* + "users.php?user=" + escape(Database.replayList[dataList.selectedIndex].user)*/, true);
				} else {
					Main.BrowserRedirect("http://www.incredifriends.com/"/* + "users.php?user=" + escape(Database.challengeList[dataList.selectedIndex].user)*/, true);
				}
			}
		}

		private function exportButtonPressed(e:Event):void {
			if (dataList.selectedIndex >= 0) {
				if (dataType == LOAD_ROBOT_TYPE) {
					Database.LoadRobot(ControllerGameGlobals.userName, ControllerGameGlobals.password, dataList.selectedIndex, finishLoadingRobotForExport);
				} else if (dataType == LOAD_REPLAY_TYPE) {
					Database.LoadReplay(ControllerGameGlobals.userName, ControllerGameGlobals.password, dataList.selectedIndex, finishLoadingReplayForExport);
				} else if (dataType == LOAD_CHALLENGE_TYPE) {
					Database.LoadChallenge(ControllerGameGlobals.userName, ControllerGameGlobals.password, dataList.selectedIndex, finishLoadingChallengeForExport);
				} else if (dataType == HIGH_SCORE_TYPE) {
					Database.LoadReplayFromScore(ControllerGameGlobals.userName, ControllerGameGlobals.password, dataList.selectedIndex, finishLoadingScoreReplayForExport);
				}
				ShowFader();
				cont.ShowDialog("Exporting...");
				Main.ShowHourglass();
			} else {
				ShowFader();
				cont.ShowDialog2("You need to select a " + (dataType == LOAD_ROBOT_TYPE ? "robot" : (dataType == LOAD_REPLAY_TYPE ? "replay" : "challenge")) + " first!");
			}
		}

		private function finishLoadingRobotForExport(e:Event):void {
			cont.HideDialog(e);
			Database.ExportRobot(Database.FinishLoadingRobot(e), Database.robotList[dataList.selectedIndex].name, Database.robotList[dataList.selectedIndex].description, Database.robotList[dataList.selectedIndex].shared, Database.robotList[dataList.selectedIndex].editable, Database.robotList[dataList.selectedIndex].prop, cont.finishExporting);
			HideFader();
			Main.ShowMouse();
		}

		private function finishLoadingReplayForExport(e:Event):void {
			cont.HideDialog(e);
			var replayAndRobot:Array = Database.FinishLoadingReplay(e);
			Database.ExportReplay(replayAndRobot[0], Database.replayList[dataList.selectedIndex].name, Database.replayList[dataList.selectedIndex].description, Database.replayList[dataList.selectedIndex].robotID, replayAndRobot[1], -1, "", Database.replayList[dataList.selectedIndex].shared, cont.finishExporting);
			HideFader();
			Main.ShowMouse();
		}

		private function finishLoadingChallengeForExport(e:Event):void {
			cont.HideDialog(e);
			Database.ExportChallenge(Database.FinishLoadingChallenge(e), Database.challengeList[dataList.selectedIndex].name, Database.challengeList[dataList.selectedIndex].description, Database.challengeList[dataList.selectedIndex].shared, Database.challengeList[dataList.selectedIndex].editable, cont.finishExporting);
			HideFader();
			Main.ShowMouse();
		}

		private function finishLoadingScoreReplayForExport(e:Event):void {
			cont.HideDialog(e);
			var replayAndRobot:Array = Database.FinishLoadingReplay(e);
			Database.ExportReplay(replayAndRobot[0], "_ScoreReplay", "", Database.scoreList[dataList.selectedIndex].robotID, replayAndRobot[1], Database.scoreList[dataList.selectedIndex].score, "", 0, cont.finishExporting);
			HideFader();
			Main.ShowMouse();
		}

		private function refreshMouse(e:Event):void {
			if (sortPeriodBox && e.target == sortPeriodBox.dropdown && (dataType == SAVE_ROBOT_TYPE || dataType == LOAD_ROBOT_TYPE)) {
				e.target.height = 120;
			}
			Main.RefreshMouse(stage, (e.target as Sprite));
		}
	};
}
