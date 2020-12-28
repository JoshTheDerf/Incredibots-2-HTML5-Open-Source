package Gui
{
	import Game.*;
	
	import General.Util;
	
	import Parts.ShapePart;
	
	import fl.controls.*;
	
	import flash.display.Sprite;
	import flash.events.*;
	import flash.text.*;
	
	
	public class ConditionsWindow extends GuiWindow
	{
		private var cont:ControllerChallenge;
		
		private var is1:TextField;
		private var is2:TextField;
		
		private var allConditionsBox:CheckBox;
		private var immediateLossBox:CheckBox;
		
		private var winSubjectBox:ComboBox;
		private var winObjectBox:ComboBox;
		private var lossSubjectBox:ComboBox;
		private var lossObjectBox:ComboBox;
		
		private var winNameArea:TextInput;
		private var lossNameArea:TextInput;
		
		private var winConditions:List;
		private var lossConditions:List;
		
		private var backButton:GuiButton;
		private var addWinConditionButton:GuiButton;
		private var addLossConditionButton:GuiButton;
		private var removeWinConditionButton:GuiButton;
		private var removeLossConditionButton:GuiButton;
		
		private var addingWinCondition:Boolean;
		private var selectingForShape1:Boolean;
		public var shape1:ShapePart;
		
		private static const STRINGS_FOR_SUBJECTS:Array = ["A specific shape", "Any shape", "All user-created shapes", "Any pre-existing shape", "Any cannonball"];
		private static const STRINGS_FOR_OBJECTS:Array = ["within a box", "above a line", "below a line", "left of a line", "right of a line", "touching another shape", "touched another shape"];
		
		public function ConditionsWindow(contr:ControllerChallenge)
		{
			cont = contr;
			
			var header:TextField = new TextField();
			header.text = "New Win Condition:";
			header.width = 300;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 0;
			header.y = 28;
			var format:TextFormat = new TextFormat();
			format.size = 18;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			header.setTextFormat(format);
			addChild(header);

			header = new TextField();
			header.text = "All Existing Win Conditions:";
			header.width = 300;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 10;
			header.y = 102;
			header.setTextFormat(format);
			addChild(header);
			
			header = new TextField();
			header.text = "New Loss Condition:";
			header.width = 300;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 5;
			header.y = 325;
			header.setTextFormat(format);
			addChild(header);
			
			header = new TextField();
			header.text = "All Existing Loss Conditions:";
			header.width = 300;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 12;
			header.y = 395;
			header.setTextFormat(format);
			addChild(header);

			format = new TextFormat();
			format.size = 12;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;

			is1 = new TextField();
			is1.text = "is";
			is1.width = 30;
			is1.height = 20;
			is1.textColor = 0x242930;
			is1.selectable = false;
			is1.x = 275;
			is1.y = 60;
			is1.setTextFormat(format);
			addChild(is1);

			is2 = new TextField();
			is2.text = "is";
			is2.width = 30;
			is2.height = 20;
			is2.textColor = 0x242930;
			is2.selectable = false;
			is2.x = 275;
			is2.y = 355;
			is2.setTextFormat(format);
			addChild(is2);

			winSubjectBox = new GuiCombobox(80, 52, 200, 35);
			for (var i:int = 0; i < STRINGS_FOR_SUBJECTS.length; i++) {
				winSubjectBox.addItem({label:"   " + STRINGS_FOR_SUBJECTS[i]});
			}
			winSubjectBox.selectedIndex = 0;
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 13;
			format.color = 0x573D40;
			winSubjectBox.textField.setStyle("textFormat", format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 11;
			format.color = 0x4C3D57;
			winSubjectBox.dropdown.setRendererStyle("textFormat", format);
			winSubjectBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, refreshMouse, false, 0, true);
			winSubjectBox.addEventListener(Event.CHANGE, winSubjectChanged, false, 0, true);
			addChild(winSubjectBox);
			winObjectBox = new GuiCombobox(300, 52, 200, 35);
			for (i = 0; i < STRINGS_FOR_OBJECTS.length; i++) {
				winObjectBox.addItem({label:"   " + STRINGS_FOR_OBJECTS[i]});
			}
			winObjectBox.selectedIndex = 0;
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 13;
			format.color = 0x573D40;
			winObjectBox.textField.setStyle("textFormat", format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 11;
			format.color = 0x4C3D57;
			winObjectBox.dropdown.setRendererStyle("textFormat", format);
			winObjectBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, refreshMouse, false, 0, true);
			winObjectBox.addEventListener(Event.CHANGE, winSubjectChanged, false, 0, true);
			addChild(winObjectBox);
			lossSubjectBox = new GuiCombobox(80, 347, 200, 35);
			for (i = 0; i < STRINGS_FOR_SUBJECTS.length; i++) {
				lossSubjectBox.addItem({label:"   " + STRINGS_FOR_SUBJECTS[i]});
			}
			lossSubjectBox.selectedIndex = 0;
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 13;
			format.color = 0x573D40;
			lossSubjectBox.textField.setStyle("textFormat", format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 11;
			format.color = 0x4C3D57;
			lossSubjectBox.dropdown.setRendererStyle("textFormat", format);
			lossSubjectBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, refreshMouse, false, 0, true);
			lossSubjectBox.addEventListener(Event.CHANGE, lossSubjectChanged, false, 0, true);
			addChild(lossSubjectBox);
			lossObjectBox = new GuiCombobox(300, 347, 200, 35);
			for (i = 0; i < STRINGS_FOR_OBJECTS.length; i++) {
				lossObjectBox.addItem({label:"   " + STRINGS_FOR_OBJECTS[i]});
			}
			lossObjectBox.selectedIndex = 0;
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 13;
			format.color = 0x573D40;
			lossObjectBox.textField.setStyle("textFormat", format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 11;
			format.color = 0x4C3D57;
			lossObjectBox.dropdown.setRendererStyle("textFormat", format);
			lossObjectBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, refreshMouse, false, 0, true);
			lossObjectBox.addEventListener(Event.CHANGE, lossSubjectChanged, false, 0, true);
			addChild(lossObjectBox);
			
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 12;
			format.color = 0x4C3D57;
			winConditions = new List();
			winConditions.width = 628;
			winConditions.height = 100;
			winConditions.x = 40;
			winConditions.y = 130;
			winConditions.setRendererStyle("textFormat", format);
			winConditions.setStyle("cellRenderer", MyWideCellRenderer);
			winConditions.setStyle("skin", GuiTextArea.textAreaBase());
			winConditions.setStyle("trackDisabledSkin", MainEditPanel.scrollbarField());
			winConditions.setStyle("trackDownSkin", MainEditPanel.scrollbarField());
			winConditions.setStyle("trackOverSkin", MainEditPanel.scrollbarField());
			winConditions.setStyle("trackUpSkin", MainEditPanel.scrollbarField());
			winConditions.setStyle("thumbDisabledSkin", MainEditPanel.scrollbarTallBase());
			winConditions.setStyle("thumbDownSkin", MainEditPanel.scrollbarTallClick());
			winConditions.setStyle("thumbOverSkin", MainEditPanel.scrollbarTallRoll());
			winConditions.setStyle("thumbUpSkin", MainEditPanel.scrollbarTallBase());
			winConditions.setStyle("downArrowUpSkin", MainEditPanel.scrollbarButtonDownBase());
			winConditions.setStyle("downArrowOverSkin", MainEditPanel.scrollbarButtonDownRoll());
			winConditions.setStyle("downArrowDownSkin", MainEditPanel.scrollbarButtonDownClick());
			winConditions.setStyle("downArrowDisabledSkin", MainEditPanel.scrollbarButtonDownBase());
			winConditions.setStyle("upArrowUpSkin", MainEditPanel.scrollbarButtonUpBase());
			winConditions.setStyle("upArrowOverSkin", MainEditPanel.scrollbarButtonUpRoll());
			winConditions.setStyle("upArrowDownSkin", MainEditPanel.scrollbarButtonUpClick());
			winConditions.setStyle("upArrowDisabledSkin", MainEditPanel.scrollbarButtonUpBase());
			addChild(winConditions);
			lossConditions = new List();
			lossConditions.width = 628;
			lossConditions.height = 100;
			lossConditions.x = 40;
			lossConditions.y = 422;
			lossConditions.setRendererStyle("textFormat", format);
			lossConditions.setStyle("cellRenderer", MyWideCellRenderer);
			lossConditions.setStyle("skin", GuiTextArea.textAreaBase());
			lossConditions.setStyle("trackDisabledSkin", MainEditPanel.scrollbarField());
			lossConditions.setStyle("trackDownSkin", MainEditPanel.scrollbarField());
			lossConditions.setStyle("trackOverSkin", MainEditPanel.scrollbarField());
			lossConditions.setStyle("trackUpSkin", MainEditPanel.scrollbarField());
			lossConditions.setStyle("thumbDisabledSkin", MainEditPanel.scrollbarTallBase());
			lossConditions.setStyle("thumbDownSkin", MainEditPanel.scrollbarTallClick());
			lossConditions.setStyle("thumbOverSkin", MainEditPanel.scrollbarTallRoll());
			lossConditions.setStyle("thumbUpSkin", MainEditPanel.scrollbarTallBase());
			lossConditions.setStyle("downArrowUpSkin", MainEditPanel.scrollbarButtonDownBase());
			lossConditions.setStyle("downArrowOverSkin", MainEditPanel.scrollbarButtonDownRoll());
			lossConditions.setStyle("downArrowDownSkin", MainEditPanel.scrollbarButtonDownClick());
			lossConditions.setStyle("downArrowDisabledSkin", MainEditPanel.scrollbarButtonDownBase());
			lossConditions.setStyle("upArrowUpSkin", MainEditPanel.scrollbarButtonUpBase());
			lossConditions.setStyle("upArrowOverSkin", MainEditPanel.scrollbarButtonUpRoll());
			lossConditions.setStyle("upArrowDownSkin", MainEditPanel.scrollbarButtonUpClick());
			lossConditions.setStyle("upArrowDisabledSkin", MainEditPanel.scrollbarButtonUpBase());
			addChild(lossConditions);

			format = new TextFormat();
			format.size = 12;
			format.font = Main.GLOBAL_FONT;
			winNameArea = new GuiTextInput(250, 29, 160, format);
			winNameArea.text = "Condition 1";
			winNameArea.maxChars = 20;
			winNameArea.addEventListener(MouseEvent.CLICK, textFocus, false, 0, true);
			addChild(winNameArea);
			lossNameArea = new GuiTextInput(250, 324, 160, format);
			lossNameArea.text = "Condition 1";
			lossNameArea.maxChars = 20;
			lossNameArea.addEventListener(MouseEvent.CLICK, textFocus, false, 0, true);
			addChild(lossNameArea);

			format = new TextFormat();
			format.size = 14;
			backButton = new GuiButton("Close", 570, 525, 100, 50, closeButtonPressed, GuiButton.PURPLE, format);
			addChild(backButton);
			addWinConditionButton = new GuiButton("Add Condition", 510, 45, 140, 50, addWinButtonPressed, GuiButton.ORANGE, format);
			addChild(addWinConditionButton);
			addLossConditionButton = new GuiButton("Add Condition", 510, 340, 140, 50, addLossButtonPressed, GuiButton.ORANGE, format);
			addChild(addLossConditionButton);
			removeWinConditionButton = new GuiButton("Remove Selected Win Condition", 70, 230, 280, 55, removeWinButtonPressed, GuiButton.RED, format);
			addChild(removeWinConditionButton);
			removeLossConditionButton = new GuiButton("Remove Selected Loss Condition", 70, 520, 280, 55, removeLossButtonPressed, GuiButton.RED, format);
			addChild(removeLossConditionButton);

			format = new TextFormat();
			format.color = 0x242930;
			format.font = Main.GLOBAL_FONT;
			format.size = 12;
			allConditionsBox = new GuiCheckBox();
			allConditionsBox.label = "All conditions must be satisfied simultaneously ";
			allConditionsBox.x = 340;
			allConditionsBox.y = 245;
			allConditionsBox.width = 320;
			allConditionsBox.selected = ControllerChallenge.challenge.winConditionsAnded;
			allConditionsBox.setStyle("textFormat", format);
			addChild(allConditionsBox);
			immediateLossBox = new GuiCheckBox();
			immediateLossBox.label = "Immediate loss if condition met";
			immediateLossBox.x = 420;
			immediateLossBox.y = 323;
			immediateLossBox.width = 300;
			immediateLossBox.selected = true;
			immediateLossBox.setStyle("textFormat", format);
			addChild(immediateLossBox);

			RefreshList(true);
			RefreshList(false);

			super(45, 10, 720, 590);
		}
		
		private function textFocus(e:MouseEvent):void {
			e.target.setSelection(0, 20);
		}
		
		private function winSubjectChanged(e:Event):void {
			var format:TextFormat = new TextFormat();
			format.size = 12;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			is1.text = (winObjectBox.selectedIndex == 6 ? (winSubjectBox.selectedIndex == 2 ? "have" : "has") : (winSubjectBox.selectedIndex == 2 ? "are" : "is"));
			is1.setTextFormat(format);
		}
		
		private function lossSubjectChanged(e:Event):void {
			var format:TextFormat = new TextFormat();
			format.size = 12;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			is2.text = (lossObjectBox.selectedIndex == 6 ? (lossSubjectBox.selectedIndex == 2 ? "have" : "has") : (lossSubjectBox.selectedIndex == 2 ? "are" : "is"));
			is2.setTextFormat(format);
		}
		
		private function addWinButtonPressed(e:MouseEvent, callback:Boolean = true):void {
			if (CheckWinShapes()) {
				if (callback) shape1 = null;
				visible = false;
				cont.m_fader.visible = false;
				if (winSubjectBox.selectedIndex == 0 && callback) {
					selectingForShape1 = true;
					cont.GetShapeForConditions();
				} else if (winObjectBox.selectedIndex == 0) {
					cont.GetBoxForConditions();
				} else if (winObjectBox.selectedIndex < 3) {
					cont.GetHorizontalLineForConditions();
				} else if (winObjectBox.selectedIndex < 5) {
					cont.GetVerticalLineForConditions();
				} else {
					selectingForShape1 = false;
					cont.GetShapeForConditions();
				}
				addingWinCondition = true;
			}
		}
		
		private function addLossButtonPressed(e:MouseEvent, callback:Boolean = true):void {
			if (CheckLossShapes()) {
				if (callback) shape1 = null;
				visible = false;
				cont.m_fader.visible = false;
				if (lossSubjectBox.selectedIndex == 0 && callback) {
					selectingForShape1 = true;
					cont.GetShapeForConditions();
				} else if (lossObjectBox.selectedIndex == 0) {
					cont.GetBoxForConditions();
				} else if (lossObjectBox.selectedIndex < 3) {
					cont.GetHorizontalLineForConditions();
				} else if (lossObjectBox.selectedIndex < 5) {
					cont.GetVerticalLineForConditions();
				} else {
					selectingForShape1 = false;
					cont.GetShapeForConditions();
				}
				addingWinCondition = false;
			}
		}

		public function FinishDrawingCondition(x1:Number, y1:Number, x2:Number, y2:Number):void {
			if (addingWinCondition) {
				var cond:WinCondition = new WinCondition(winNameArea.text, winSubjectBox.selectedIndex, winObjectBox.selectedIndex);
				if (winObjectBox.selectedIndex == 0) {
					cond.minX = Math.min(x1, x2);
					cond.minY = Math.min(y1, y2);
					cond.maxX = Math.max(x1, x2);
					cond.maxY = Math.max(y1, y2);
				} else if (winObjectBox.selectedIndex < 3) {
					cond.minX = x1;
					cond.minY = y1;
					cond.maxX = x2;
					cond.maxY = y1;
				} else {
					cond.minX = x1;
					cond.minY = y1;
					cond.maxX = x1;
					cond.maxY = y2;
				}
				if (shape1) cond.shape1 = shape1;
				ControllerChallenge.challenge.winConditions.push(cond);
				RefreshList(true);
			} else {
				var con:LossCondition = new LossCondition(lossNameArea.text, lossSubjectBox.selectedIndex, lossObjectBox.selectedIndex, immediateLossBox.selected);
				if (lossObjectBox.selectedIndex == 0) {
					con.minX = Math.min(x1, x2);
					con.minY = Math.min(y1, y2);
					con.maxX = Math.max(x1, x2);
					con.maxY = Math.max(y1, y2);
				} else if (lossObjectBox.selectedIndex < 3) {
					con.minX = x1;
					con.minY = y1;
					con.maxX = x2;
					con.maxY = y1;
				} else {
					con.minX = x1;
					con.minY = y1;
					con.maxX = x1;
					con.maxY = y2;
				}
				if (shape1) con.shape1 = shape1;
				ControllerChallenge.challenge.lossConditions.push(con);
				RefreshList(false);
			}
		}

		public function FinishSelectingForCondition(shape:ShapePart):void {
			if (selectingForShape1) {
				shape1 = shape;
				if (addingWinCondition) addWinButtonPressed(new MouseEvent(""), false);
				else addLossButtonPressed(new MouseEvent(""), false);
			} else {
				if (addingWinCondition) {
					var cond:WinCondition = new WinCondition(winNameArea.text, winSubjectBox.selectedIndex, winObjectBox.selectedIndex);
					cond.shape2 = shape;
					if (shape1) cond.shape1 = shape1;
					ControllerChallenge.challenge.winConditions.push(cond);
					RefreshList(true);
				} else {
					var con:LossCondition = new LossCondition(lossNameArea.text, lossSubjectBox.selectedIndex, lossObjectBox.selectedIndex, immediateLossBox.selected);
					con.shape2 = shape;
					if (shape1) con.shape1 = shape1;
					ControllerChallenge.challenge.lossConditions.push(con);
					RefreshList(false);
				}
			}
		}

		private function CheckWinShapes():Boolean {
			var numShapesRequired:int = (winSubjectBox.selectedIndex == 0 ? 1 : 0) + (winObjectBox.selectedIndex >= 5 ? 1 : 0);
			if (numShapesRequired == 0) return true;
			var numShapes:int = 0;
			for (var i:int = 0; i < cont.allParts.length; i++) {
				if (cont.allParts[i] is ShapePart && cont.allParts[i].isEditable) {
					numShapes++;
					if (numShapes >= numShapesRequired) return true;
				}
			}
			ShowFader();
			cont.ShowDialog2("There aren't enough shapes in the world to use with that win condition.");
			return false;
		}

		private function CheckLossShapes():Boolean {
			var numShapesRequired:int = (lossSubjectBox.selectedIndex == 0 ? 1 : 0) + (lossObjectBox.selectedIndex >= 5 ? 1 : 0);
			if (numShapesRequired == 0) return true;
			var numShapes:int = 0;
			for (var i:int = 0; i < cont.allParts.length; i++) {
				if (cont.allParts[i] is ShapePart && cont.allParts[i].isEditable) {
					numShapes++;
					if (numShapes >= numShapesRequired) return true;
				}
			}
			ShowFader();
			cont.ShowDialog2("There aren't enough shapes in the world to use with that loss condition.");
			return false;
		}

		private function removeWinButtonPressed(e:MouseEvent):void {
			ControllerChallenge.challenge.winConditions = Util.RemoveFromArray(ControllerChallenge.challenge.winConditions[winConditions.selectedIndex], ControllerChallenge.challenge.winConditions);
			RefreshList(true);
		}
		
		private function removeLossButtonPressed(e:MouseEvent):void {
			ControllerChallenge.challenge.lossConditions = Util.RemoveFromArray(ControllerChallenge.challenge.lossConditions[lossConditions.selectedIndex], ControllerChallenge.challenge.lossConditions);
			RefreshList(false);
		}
		
		private function RefreshList(win:Boolean):void {
			var list:List = (win ? winConditions : lossConditions);
			var conditions:Array = (win ? ControllerChallenge.challenge.winConditions : ControllerChallenge.challenge.lossConditions);
			list.removeAll();
			for (var i:int = 0; i < conditions.length; i++) {
				var listItem:* = new Object();
				listItem.label = " " + conditions[i].name + ":  " + STRINGS_FOR_SUBJECTS[conditions[i].subject] + (conditions[i].object == 6 ? (conditions[i].subject == 2 ? " have " : " has ") : (conditions[i].subject == 2 ? " are " : " is ")) + STRINGS_FOR_OBJECTS[conditions[i].object];
				list.addItem(listItem);
			}
			if (win) winNameArea.text = "Condition " + (winConditions.length + 1);
			else lossNameArea.text = "Condition " + (lossConditions.length + 1);
		}
		
		private function closeButtonPressed(e:MouseEvent):void {
			visible = false;
			cont.m_fader.visible = false;
			ControllerChallenge.challenge.winConditionsAnded = allConditionsBox.selected;
		}
		
		private function refreshMouse(e:Event):void {
			if (e.target == winObjectBox.dropdown || e.target == lossObjectBox.dropdown) {
				e.target.height = 140;
			}
			Main.RefreshMouse(stage, (e.target as Sprite));
		}
	}
}