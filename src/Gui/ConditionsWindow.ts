import { CheckBox, TextInput } from "@puxi/core";
import { Sprite, Text, TextStyle } from "pixi.js";
import { ControllerChallenge, ShapePart, Main, WinCondition, LossCondition, Util, Condition } from "../imports";
import { GuiButton } from "./GuiButton";
import { GuiCheckBox } from "./GuiCheckBox";
import { GuiCombobox } from "./GuiCombobox";
import { GuiTextArea } from "./GuiTextArea";
import { GuiTextInput } from "./GuiTextInput";
import { GuiWindow } from "./GuiWindow";
import { MainEditPanel } from "./MainEditPanel";

export class ConditionsWindow extends GuiWindow
{
	private cont:ControllerChallenge;

	private is1:Text;
	private is2:Text;

	private allConditionsBox:CheckBox;
	private immediateLossBox:CheckBox;

	private winSubjectBox:GuiCombobox;
	private winObjectBox:GuiCombobox;
	private lossSubjectBox:GuiCombobox;
	private lossObjectBox:GuiCombobox;

	private winNameArea:TextInput;
	private lossNameArea:TextInput;

	private winConditions:Array<any>;
	private lossConditions:Array<any>;

	private backButton:GuiButton;
	private addWinConditionButton:GuiButton;
	private addLossConditionButton:GuiButton;
	private removeWinConditionButton:GuiButton;
	private removeLossConditionButton:GuiButton;

	private addingWinCondition:boolean;
	private selectingForShape1:boolean;
	public shape1:ShapePart;

	private static STRINGS_FOR_SUBJECTS:Array<string> = ["A specific shape", "Any shape", "All user-created shapes", "Any pre-existing shape", "Any cannonball"];
	private static STRINGS_FOR_OBJECTS:Array<string> = ["within a box", "above a line", "below a line", "left of a line", "right of a line", "touching another shape", "touched another shape"];

	constructor(contr:ControllerChallenge)
	{
		super(45, 10, 720, 590);

		this.cont = contr;

		var header = new Text('');
		header.text = "New Win Condition:";
		header.width = 300;
		header.height = 30;
		header.x = 0;
		header.y = 28;
		var format = new TextStyle();
		format.fontSize = 18;
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		format.fill = 0x242930;
		header.style = format;
		this.addChild(header);

		header = new Text('');
		header.text = "All Existing Win Conditions:";
		header.width = 300;
		header.height = 30;
		header.x = 10;
		header.y = 102;
		header.style = format;
		this.addChild(header);

		header = new Text('');
		header.text = "New Loss Condition:";
		header.width = 300;
		header.height = 30;
		header.x = 5;
		header.y = 325;
		header.style = format;
		this.addChild(header);

		header = new Text('');
		header.text = "All Existing Loss Conditions:";
		header.width = 300;
		header.height = 30;
		header.x = 12;
		header.y = 395;
		header.style = format;
		this.addChild(header);

		format = new TextStyle();
		format.fontSize = 12;
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		format.fill = 0x242930;

		this.is1 = new Text('');
		this.is1.text = "is";
		this.is1.width = 30;
		this.is1.height = 20;
		this.is1.x = 275;
		this.is1.y = 60;
		this.is1.style = format;
		this.addChild(this.is1);

		this.is2 = new Text('');
		this.is2.text = "is";
		this.is2.width = 30;
		this.is2.height = 20;
		this.is2.x = 275;
		this.is2.y = 355;
		this.is2.style = format;
		this.addChild(this.is2);

		this.winSubjectBox = new GuiCombobox(80, 52, 200, 35);
		for (var i:number = 0; i < ConditionsWindow.STRINGS_FOR_SUBJECTS.length; i++) {
			this.winSubjectBox.addItem({label:"   " + ConditionsWindow.STRINGS_FOR_SUBJECTS[i]});
		}
		this.winSubjectBox.selectedIndex = 0;
		format = new TextStyle();
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 13;
		format.fill = 0x573D40;
		this.winSubjectBox.textField.setStyle("textFormat", format);
		format = new TextStyle();
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 11;
		format.fill = 0x4C3D57;
		this.winSubjectBox.dropdown.setRendererStyle("textFormat", format);
		this.winSubjectBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, this.refreshMouse, false, 0, true);
		this.winSubjectBox.addEventListener(Event.CHANGE, this.winSubjectChanged, false, 0, true);
		this.addChild(this.winSubjectBox);
		this.winObjectBox = new GuiCombobox(300, 52, 200, 35);
		for (i = 0; i < ConditionsWindow.STRINGS_FOR_OBJECTS.length; i++) {
			this.winObjectBox.addItem({label:"   " + ConditionsWindow.STRINGS_FOR_OBJECTS[i]});
		}
		this.winObjectBox.selectedIndex = 0;
		format = new TextStyle();
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 13;
		format.fill = 0x573D40;
		this.winObjectBox.textField.setStyle("textFormat", format);
		format = new TextStyle();
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 11;
		format.fill = 0x4C3D57;
		this.winObjectBox.dropdown.setRendererStyle("textFormat", format);
		this.winObjectBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, this.refreshMouse, false, 0, true);
		this.winObjectBox.addEventListener(Event.CHANGE, this.winSubjectChanged, false, 0, true);
		this.addChild(this.winObjectBox);
		this.lossSubjectBox = new GuiCombobox(80, 347, 200, 35);
		for (i = 0; i < ConditionsWindow.STRINGS_FOR_SUBJECTS.length; i++) {
			this.lossSubjectBox.addItem({label:"   " + ConditionsWindow.STRINGS_FOR_SUBJECTS[i]});
		}
		this.lossSubjectBox.selectedIndex = 0;
		format = new TextStyle();
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 13;
		format.fill = 0x573D40;
		this.lossSubjectBox.textField.setStyle("textFormat", format);
		format = new TextStyle();
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 11;
		format.fill = 0x4C3D57;
		this.lossSubjectBox.dropdown.setRendererStyle("textFormat", format);
		this.lossSubjectBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, this.refreshMouse, false, 0, true);
		this.lossSubjectBox.addEventListener(Event.CHANGE, this.lossSubjectChanged, false, 0, true);
		this.addChild(this.lossSubjectBox);
		this.lossObjectBox = new GuiCombobox(300, 347, 200, 35);
		for (i = 0; i < ConditionsWindow.STRINGS_FOR_OBJECTS.length; i++) {
			this.lossObjectBox.addItem({label:"   " + ConditionsWindow.STRINGS_FOR_OBJECTS[i]});
		}
		this.lossObjectBox.selectedIndex = 0;
		format = new TextStyle();
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 13;
		format.fill = 0x573D40;
		this.lossObjectBox.textField.setStyle("textFormat", format);
		format = new TextStyle();
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 11;
		format.fill = 0x4C3D57;
		this.lossObjectBox.dropdown.setRendererStyle("textFormat", format);
		this.lossObjectBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, this.refreshMouse, false, 0, true);
		this.lossObjectBox.addEventListener(Event.CHANGE, this.lossSubjectChanged, false, 0, true);
		this.addChild(this.lossObjectBox);

		format = new TextStyle();
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 12;
		format.fill = 0x4C3D57;
		this.winConditions = new List();
		this.winConditions.width = 628;
		this.winConditions.height = 100;
		this.winConditions.x = 40;
		this.winConditions.y = 130;
		this.winConditions.setRendererStyle("textFormat", format);
		this.winConditions.setStyle("cellRenderer", MyWideCellRenderer);
		this.winConditions.setStyle("skin", GuiTextArea.textAreaBase());
		this.winConditions.setStyle("trackDisabledSkin", MainEditPanel.scrollbarField());
		this.winConditions.setStyle("trackDownSkin", MainEditPanel.scrollbarField());
		this.winConditions.setStyle("trackOverSkin", MainEditPanel.scrollbarField());
		this.winConditions.setStyle("trackUpSkin", MainEditPanel.scrollbarField());
		this.winConditions.setStyle("thumbDisabledSkin", MainEditPanel.scrollbarTallBase());
		this.winConditions.setStyle("thumbDownSkin", MainEditPanel.scrollbarTallClick());
		this.winConditions.setStyle("thumbOverSkin", MainEditPanel.scrollbarTallRoll());
		this.winConditions.setStyle("thumbUpSkin", MainEditPanel.scrollbarTallBase());
		this.winConditions.setStyle("downArrowUpSkin", MainEditPanel.scrollbarButtonDownBase());
		this.winConditions.setStyle("downArrowOverSkin", MainEditPanel.scrollbarButtonDownRoll());
		this.winConditions.setStyle("downArrowDownSkin", MainEditPanel.scrollbarButtonDownClick());
		this.winConditions.setStyle("downArrowDisabledSkin", MainEditPanel.scrollbarButtonDownBase());
		this.winConditions.setStyle("upArrowUpSkin", MainEditPanel.scrollbarButtonUpBase());
		this.winConditions.setStyle("upArrowOverSkin", MainEditPanel.scrollbarButtonUpRoll());
		this.winConditions.setStyle("upArrowDownSkin", MainEditPanel.scrollbarButtonUpClick());
		this.winConditions.setStyle("upArrowDisabledSkin", MainEditPanel.scrollbarButtonUpBase());
		this.addChild(this.winConditions);
		this.lossConditions = new List();
		this.lossConditions.width = 628;
		this.lossConditions.height = 100;
		this.lossConditions.x = 40;
		this.lossConditions.y = 422;
		this.lossConditions.setRendererStyle("textFormat", format);
		this.lossConditions.setStyle("cellRenderer", MyWideCellRenderer);
		this.lossConditions.setStyle("skin", GuiTextArea.textAreaBase());
		this.lossConditions.setStyle("trackDisabledSkin", MainEditPanel.scrollbarField());
		this.lossConditions.setStyle("trackDownSkin", MainEditPanel.scrollbarField());
		this.lossConditions.setStyle("trackOverSkin", MainEditPanel.scrollbarField());
		this.lossConditions.setStyle("trackUpSkin", MainEditPanel.scrollbarField());
		this.lossConditions.setStyle("thumbDisabledSkin", MainEditPanel.scrollbarTallBase());
		this.lossConditions.setStyle("thumbDownSkin", MainEditPanel.scrollbarTallClick());
		this.lossConditions.setStyle("thumbOverSkin", MainEditPanel.scrollbarTallRoll());
		this.lossConditions.setStyle("thumbUpSkin", MainEditPanel.scrollbarTallBase());
		this.lossConditions.setStyle("downArrowUpSkin", MainEditPanel.scrollbarButtonDownBase());
		this.lossConditions.setStyle("downArrowOverSkin", MainEditPanel.scrollbarButtonDownRoll());
		this.lossConditions.setStyle("downArrowDownSkin", MainEditPanel.scrollbarButtonDownClick());
		this.lossConditions.setStyle("downArrowDisabledSkin", MainEditPanel.scrollbarButtonDownBase());
		this.lossConditions.setStyle("upArrowUpSkin", MainEditPanel.scrollbarButtonUpBase());
		this.lossConditions.setStyle("upArrowOverSkin", MainEditPanel.scrollbarButtonUpRoll());
		this.lossConditions.setStyle("upArrowDownSkin", MainEditPanel.scrollbarButtonUpClick());
		this.lossConditions.setStyle("upArrowDisabledSkin", MainEditPanel.scrollbarButtonUpBase());
		this.addChild(this.lossConditions);

		format = new TextStyle();
		format.fontSize = 12;
		format.fontFamily = Main.GLOBAL_FONT;
		this.winNameArea = new GuiTextInput(250, 29, 160, 20, format);
		this.winNameArea.text = "Condition 1";
		this.winNameArea.maxChars = 20;
		this.winNameArea.addEventListener(MouseEvent.CLICK, this.textFocus, false, 0, true);
		this.addChild(this.winNameArea);
		this.lossNameArea = new GuiTextInput(250, 324, 160, 20, format);
		this.lossNameArea.text = "Condition 1";
		this.lossNameArea.maxChars = 20;
		this.lossNameArea.addEventListener(MouseEvent.CLICK, this.textFocus, false, 0, true);
		this.addChild(this.lossNameArea);

		format = new TextStyle();
		format.fontSize = 14;
		this.backButton = new GuiButton("Close", 570, 525, 100, 50, this.closeButtonPressed, GuiButton.PURPLE, format);
		this.addChild(this.backButton);
		this.addWinConditionButton = new GuiButton("Add Condition", 510, 45, 140, 50, this.addWinButtonPressed, GuiButton.ORANGE, format);
		this.addChild(this.addWinConditionButton);
		this.addLossConditionButton = new GuiButton("Add Condition", 510, 340, 140, 50, this.addLossButtonPressed, GuiButton.ORANGE, format);
		this.addChild(this.addLossConditionButton);
		this.removeWinConditionButton = new GuiButton("Remove Selected Win Condition", 70, 230, 280, 55, this.removeWinButtonPressed, GuiButton.RED, format);
		this.addChild(this.removeWinConditionButton);
		this.removeLossConditionButton = new GuiButton("Remove Selected Loss Condition", 70, 520, 280, 55, this.removeLossButtonPressed, GuiButton.RED, format);
		this.addChild(this.removeLossConditionButton);

		format = new TextStyle();
		format.fill = 0x242930;
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 12;
		this.allConditionsBox = new GuiCheckBox(340, 245, 320);
		this.allConditionsBox.label = "All conditions must be satisfied simultaneously ";
		this.allConditionsBox.selected = ControllerChallenge.challenge.winConditionsAnded;
		this.allConditionsBox.setStyle("textFormat", format);
		this.addChild(this.allConditionsBox);
		this.immediateLossBox = new GuiCheckBox(420, 323, 300);
		this.immediateLossBox.label = "Immediate loss if condition met";
		this.immediateLossBox.selected = true;
		this.immediateLossBox.setStyle("textFormat", format);
		this.addChild(this.immediateLossBox);

		this.RefreshList(true);
		this.RefreshList(false);
	}

	private textFocus(e:MouseEvent):void {
		e.target.setSelection(0, 20);
	}

	private winSubjectChanged(e:Event):void {
		var format:TextStyle = new TextStyle();
		format.fontSize = 12;
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		this.is1.text = (this.winObjectBox.selectedIndex == 6 ? (this.winSubjectBox.selectedIndex == 2 ? "have" : "has") : (this.winSubjectBox.selectedIndex == 2 ? "are" : "is"));
		this.is1.style = format;
	}

	private lossSubjectChanged(e:Event):void {
		var format:TextStyle = new TextStyle();
		format.fontSize = 12;
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		this.is2.text = (this.lossObjectBox.selectedIndex == 6 ? (this.lossSubjectBox.selectedIndex == 2 ? "have" : "has") : (this.lossSubjectBox.selectedIndex == 2 ? "are" : "is"));
		this.is2.style = format;
	}

	private addWinButtonPressed(e:MouseEvent, callback:boolean = true):void {
		if (this.CheckWinShapes()) {
			if (callback) this.shape1 = null;
			this.visible = false;
			this.cont.m_fader.visible = false;
			if (this.winSubjectBox.selectedIndex == 0 && callback) {
				this.selectingForShape1 = true;
				this.cont.GetShapeForConditions();
			} else if (this.winObjectBox.selectedIndex == 0) {
				this.cont.GetBoxForConditions();
			} else if (this.winObjectBox.selectedIndex < 3) {
				this.cont.GetHorizontalLineForConditions();
			} else if (this.winObjectBox.selectedIndex < 5) {
				this.cont.GetVerticalLineForConditions();
			} else {
				this.selectingForShape1 = false;
				this.cont.GetShapeForConditions();
			}
			this.addingWinCondition = true;
		}
	}

	private addLossButtonPressed(e:MouseEvent, callback:boolean = true):void {
		if (this.CheckLossShapes()) {
			if (callback) this.shape1 = null;
			this.visible = false;
			this.cont.m_fader.visible = false;
			if (this.lossSubjectBox.selectedIndex == 0 && callback) {
				this.selectingForShape1 = true;
				this.cont.GetShapeForConditions();
			} else if (this.lossObjectBox.selectedIndex == 0) {
				this.cont.GetBoxForConditions();
			} else if (this.lossObjectBox.selectedIndex < 3) {
				this.cont.GetHorizontalLineForConditions();
			} else if (this.lossObjectBox.selectedIndex < 5) {
				this.cont.GetVerticalLineForConditions();
			} else {
				this.selectingForShape1 = false;
				this.cont.GetShapeForConditions();
			}
			this.addingWinCondition = false;
		}
	}

	public FinishDrawingCondition(x1:number, y1:number, x2:number, y2:number):void {
		if (this.addingWinCondition) {
			var cond:WinCondition = new WinCondition(this.winNameArea.text, this.winSubjectBox.selectedIndex, this.winObjectBox.selectedIndex);
			if (this.winObjectBox.selectedIndex == 0) {
				cond.minX = Math.min(x1, x2);
				cond.minY = Math.min(y1, y2);
				cond.maxX = Math.max(x1, x2);
				cond.maxY = Math.max(y1, y2);
			} else if (this.winObjectBox.selectedIndex < 3) {
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
			if (this.shape1) cond.shape1 = this.shape1;
			ControllerChallenge.challenge.winConditions.push(cond);
			this.RefreshList(true);
		} else {
			var con:LossCondition = new LossCondition(this.lossNameArea.text, this.lossSubjectBox.selectedIndex, this.lossObjectBox.selectedIndex, this.immediateLossBox.selected);
			if (this.lossObjectBox.selectedIndex == 0) {
				con.minX = Math.min(x1, x2);
				con.minY = Math.min(y1, y2);
				con.maxX = Math.max(x1, x2);
				con.maxY = Math.max(y1, y2);
			} else if (this.lossObjectBox.selectedIndex < 3) {
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
			if (this.shape1) con.shape1 = this.shape1;
			ControllerChallenge.challenge.lossConditions.push(con);
			this.RefreshList(false);
		}
	}

	public FinishSelectingForCondition(shape:ShapePart):void {
		if (this.selectingForShape1) {
			this.shape1 = shape;
			if (this.addingWinCondition) this.addWinButtonPressed(new MouseEvent(""), false);
			else this.addLossButtonPressed(new MouseEvent(""), false);
		} else {
			if (this.addingWinCondition) {
				var cond:WinCondition = new WinCondition(this.winNameArea.text, this.winSubjectBox.selectedIndex, this.winObjectBox.selectedIndex);
				cond.shape2 = shape;
				if (this.shape1) cond.shape1 = this.shape1;
				ControllerChallenge.challenge.winConditions.push(cond);
				this.RefreshList(true);
			} else {
				var con:LossCondition = new LossCondition(this.lossNameArea.text, this.lossSubjectBox.selectedIndex, this.lossObjectBox.selectedIndex, this.immediateLossBox.selected);
				con.shape2 = shape;
				if (this.shape1) con.shape1 = this.shape1;
				ControllerChallenge.challenge.lossConditions.push(con);
				this.RefreshList(false);
			}
		}
	}

	private CheckWinShapes():boolean {
		var numShapesRequired:number = (this.winSubjectBox.selectedIndex == 0 ? 1 : 0) + (this.winObjectBox.selectedIndex >= 5 ? 1 : 0);
		if (numShapesRequired == 0) return true;
		var numShapes:number = 0;
		for (var i:number = 0; i < this.cont.allParts.length; i++) {
			if (this.cont.allParts[i] instanceof ShapePart && this.cont.allParts[i].isEditable) {
				numShapes++;
				if (numShapes >= numShapesRequired) return true;
			}
		}
		this.ShowFader();
		this.cont.ShowDialog2("There aren't enough shapes in the world to use with that win condition.");
		return false;
	}

	private CheckLossShapes():boolean {
		var numShapesRequired:number = (this.lossSubjectBox.selectedIndex == 0 ? 1 : 0) + (this.lossObjectBox.selectedIndex >= 5 ? 1 : 0);
		if (numShapesRequired == 0) return true;
		var numShapes:number = 0;
		for (var i:number = 0; i < this.cont.allParts.length; i++) {
			if (this.cont.allParts[i] instanceof ShapePart && this.cont.allParts[i].isEditable) {
				numShapes++;
				if (numShapes >= numShapesRequired) return true;
			}
		}
		this.ShowFader();
		this.cont.ShowDialog2("There aren't enough shapes in the world to use with that loss condition.");
		return false;
	}

	private removeWinButtonPressed(e:MouseEvent):void {
		ControllerChallenge.challenge.winConditions = Util.RemoveFromArray(ControllerChallenge.challenge.winConditions[this.winConditions.selectedIndex], ControllerChallenge.challenge.winConditions);
		this.RefreshList(true);
	}

	private removeLossButtonPressed(e:MouseEvent):void {
		ControllerChallenge.challenge.lossConditions = Util.RemoveFromArray(ControllerChallenge.challenge.lossConditions[this.lossConditions.selectedIndex], ControllerChallenge.challenge.lossConditions);
		this.RefreshList(false);
	}

	private RefreshList(win:boolean):void {
		var list = (win ? this.winConditions : this.lossConditions);
		var conditions:Array<Condition> = (win ? ControllerChallenge.challenge.winConditions : ControllerChallenge.challenge.lossConditions);
		list = [];
		for (var i:number = 0; i < conditions.length; i++) {
			var listItem:any = new Object();
			listItem.label = " " + conditions[i].name + ":  " + ConditionsWindow.STRINGS_FOR_SUBJECTS[conditions[i].subject] + (conditions[i].object == 6 ? (conditions[i].subject == 2 ? " have " : " has ") : (conditions[i].subject == 2 ? " are " : " instanceof ")) + ConditionsWindow.STRINGS_FOR_OBJECTS[conditions[i].object];
			list.push(listItem);
		}
		if (win) this.winNameArea.text = "Condition " + (this.winConditions.length + 1);
		else this.lossNameArea.text = "Condition " + (this.lossConditions.length + 1);
	}

	private closeButtonPressed(e:MouseEvent):void {
		this.visible = false;
		this.cont.m_fader.visible = false;
		ControllerChallenge.challenge.winConditionsAnded = this.allConditionsBox.checked;
	}

	private refreshMouse(e:Event):void {
		// if (e.target == this.winObjectBox.dropdown || e.target == this.lossObjectBox.dropdown) {
		// 	e.target.height = 140;
		// }
	}
}
