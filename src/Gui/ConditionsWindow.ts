import { Text, TextStyle } from "pixi.js";
import { ControllerChallenge, ShapePart, Main, WinCondition, LossCondition, Util, Condition, GuiList } from "../imports";
import { GuiButton } from "./GuiButton";
import { GuiCheckBox } from "./GuiCheckBox";
import { GuiCombobox } from "./GuiCombobox";
import { GuiTextInput } from "./GuiTextInput";
import { GuiWindow } from "./GuiWindow";

export class ConditionsWindow extends GuiWindow
{
	private cont:ControllerChallenge;

	private is1:Text;
	private is2:Text;

	private allConditionsBox:GuiCheckBox;
	private immediateLossBox:GuiCheckBox;

	private winSubjectBox:GuiCombobox;
	private winObjectBox:GuiCombobox;
	private lossSubjectBox:GuiCombobox;
	private lossObjectBox:GuiCombobox;

	private winNameArea:GuiTextInput;
	private lossNameArea:GuiTextInput;

	private winConditions:GuiList;
	private lossConditions:GuiList;

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
		header.anchor.set(0.5, 0.5)
		header.x = 0 + 300 / 2;
		header.y = 28 + 30 / 2;
		var format = new TextStyle();
		format.fontSize = 18;
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		format.fill = 0x242930;
		header.style = format;
		this.addChild(header);

		header = new Text('');
		header.text = "All Existing Win Conditions:";
		header.anchor.set(0.5, 0.5)
		header.x = 10 + 300 / 2;
		header.y = 102 + 30 / 2;
		header.style = format;
		this.addChild(header);

		header = new Text('');
		header.text = "New Loss Condition:";
		header.anchor.set(0.5, 0.5)
		header.x = 5 + 300 / 2;
		header.y = 325 + 30 / 2;
		header.style = format;
		this.addChild(header);

		header = new Text('');
		header.text = "All Existing Loss Conditions:";
		header.anchor.set(0.5, 0.5)
		header.x = 12 + 300 / 2;
		header.y = 395 + 30 / 2;
		header.style = format;
		this.addChild(header);

		format = new TextStyle();
		format.fontSize = 12;
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		format.fill = 0x242930;

		this.is1 = new Text('');
		this.is1.text = "is";
		this.is1.anchor.set(0.5, 0.5)
		this.is1.x = 275 + 30 / 2;
		this.is1.y = 60 + 20 / 2;
		this.is1.style = format;
		this.addChild(this.is1);

		this.is2 = new Text('');
		this.is2.text = "is";
		this.is2.anchor.set(0.5, 0.5)
		this.is2.x = 275 + 30 / 2;
		this.is2.y = 355 + 20 / 2;
		this.is2.style = format;
		this.addChild(this.is2);

		this.winSubjectBox = new GuiCombobox(80, 52, 200, 35);
		for (var i:number = 0; i < ConditionsWindow.STRINGS_FOR_SUBJECTS.length; i++) {
			this.winSubjectBox.addItem({label:"   " + ConditionsWindow.STRINGS_FOR_SUBJECTS[i]});
		}
		this.winSubjectBox.selectedIndex = 0;
		this.winSubjectBox.on('change', () => this.winSubjectChanged());
		this.addChild(this.winSubjectBox);
		this.winObjectBox = new GuiCombobox(300, 52, 200, 35);
		for (i = 0; i < ConditionsWindow.STRINGS_FOR_OBJECTS.length; i++) {
			this.winObjectBox.addItem({label:"   " + ConditionsWindow.STRINGS_FOR_OBJECTS[i]});
		}
		this.winObjectBox.selectedIndex = 0;
		this.winObjectBox.on('change', () => this.winSubjectChanged());
		this.addChild(this.winObjectBox);
		this.lossSubjectBox = new GuiCombobox(80, 347, 200, 35);
		for (i = 0; i < ConditionsWindow.STRINGS_FOR_SUBJECTS.length; i++) {
			this.lossSubjectBox.addItem({label:"   " + ConditionsWindow.STRINGS_FOR_SUBJECTS[i]});
		}
		this.lossSubjectBox.selectedIndex = 0;
		this.lossSubjectBox.on('change', () => this.lossSubjectChanged());
		this.addChild(this.lossSubjectBox);
		this.lossObjectBox = new GuiCombobox(300, 347, 200, 35);
		for (i = 0; i < ConditionsWindow.STRINGS_FOR_OBJECTS.length; i++) {
			this.lossObjectBox.addItem({label:"   " + ConditionsWindow.STRINGS_FOR_OBJECTS[i]});
		}
		this.lossObjectBox.selectedIndex = 0;
		this.lossObjectBox.on('change', () => this.lossSubjectChanged());
		this.addChild(this.lossObjectBox);

		format = new TextStyle();
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 12;
		format.fill = 0x4C3D57;
		this.winConditions = new GuiList(628, 100, format);
		this.winConditions.x = 40;
		this.winConditions.y = 130;
		this.addChild(this.winConditions);
		this.lossConditions = new GuiList(628, 100, format);
		this.lossConditions.x = 40;
		this.lossConditions.y = 422;
		this.addChild(this.lossConditions);

		format = new TextStyle();
		format.fontSize = 12;
		format.fontFamily = Main.GLOBAL_FONT;
		this.winNameArea = new GuiTextInput(250, 29, 160, 20, format);
		this.winNameArea.text = "Condition 1";
		this.winNameArea.maxLength = 20;
		this.winNameArea.on('focus', () => {
			this.winNameArea.textInput.select()
		})
		this.addChild(this.winNameArea);
		this.lossNameArea = new GuiTextInput(250, 324, 160, 20, format);
		this.lossNameArea.text = "Condition 1";
		this.lossNameArea.maxLength = 20;
		this.lossNameArea.on('focus', () => {
			this.lossNameArea.textInput.select()
		})
		this.addChild(this.lossNameArea);

		format = new TextStyle();
		format.fontSize = 14;
		this.backButton = new GuiButton("Close", 570, 525, 100, 50, () => this.closeButtonPressed(), GuiButton.PURPLE, format);
		this.addChild(this.backButton);
		this.addWinConditionButton = new GuiButton("Add Condition", 510, 45, 140, 50, () => this.addWinButtonPressed(), GuiButton.ORANGE, format);
		this.addChild(this.addWinConditionButton);
		this.addLossConditionButton = new GuiButton("Add Condition", 510, 340, 140, 50, () => this.addLossButtonPressed(), GuiButton.ORANGE, format);
		this.addChild(this.addLossConditionButton);
		this.removeWinConditionButton = new GuiButton("Remove Selected Win Condition", 70, 230, 280, 55, () => this.removeWinButtonPressed(), GuiButton.RED, format);
		this.addChild(this.removeWinConditionButton);
		this.removeLossConditionButton = new GuiButton("Remove Selected Loss Condition", 70, 520, 280, 55, () => this.removeLossButtonPressed(), GuiButton.RED, format);
		this.addChild(this.removeLossConditionButton);

		format = new TextStyle();
		format.fill = 0x242930;
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 12;
		this.allConditionsBox = new GuiCheckBox(340, 245, 320);
		this.allConditionsBox.label = "All conditions must be satisfied simultaneously ";
		this.allConditionsBox.selected = ControllerChallenge.challenge.winConditionsAnded;
		this.allConditionsBox.style = format;
		this.addChild(this.allConditionsBox);
		this.immediateLossBox = new GuiCheckBox(420, 323, 300);
		this.immediateLossBox.label = "Immediate loss if condition met";
		this.immediateLossBox.selected = true;
		this.immediateLossBox.style = format;
		this.addChild(this.immediateLossBox);

		this.RefreshList(true);
		this.RefreshList(false);
	}

	private winSubjectChanged():void {
		var format:TextStyle = new TextStyle();
		format.fontSize = 12;
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		this.is1.text = (this.winObjectBox.selectedIndex == 6 ? (this.winSubjectBox.selectedIndex == 2 ? "have" : "has") : (this.winSubjectBox.selectedIndex == 2 ? "are" : "is"));
		this.is1.style = format;
	}

	private lossSubjectChanged():void {
		var format:TextStyle = new TextStyle();
		format.fontSize = 12;
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		this.is2.text = (this.lossObjectBox.selectedIndex == 6 ? (this.lossSubjectBox.selectedIndex == 2 ? "have" : "has") : (this.lossSubjectBox.selectedIndex == 2 ? "are" : "is"));
		this.is2.style = format;
	}

	private addWinButtonPressed(callback:boolean = true):void {
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

	private addLossButtonPressed(callback:boolean = true):void {
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
			if (this.addingWinCondition) this.addWinButtonPressed(false);
			else this.addLossButtonPressed(false);
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

	private removeWinButtonPressed():void {
		ControllerChallenge.challenge.winConditions = Util.RemoveFromArray(ControllerChallenge.challenge.winConditions[this.winConditions.selectedIndex], ControllerChallenge.challenge.winConditions);
		this.RefreshList(true);
	}

	private removeLossButtonPressed():void {
		ControllerChallenge.challenge.lossConditions = Util.RemoveFromArray(ControllerChallenge.challenge.lossConditions[this.lossConditions.selectedIndex], ControllerChallenge.challenge.lossConditions);
		this.RefreshList(false);
	}

	private RefreshList(win:boolean):void {
		var list = (win ? this.winConditions : this.lossConditions);
		var conditions:Array<Condition> = (win ? ControllerChallenge.challenge.winConditions : ControllerChallenge.challenge.lossConditions);
		list.clear();
		for (var i:number = 0; i < conditions.length; i++) {
			var listItem:any = new Object();
			listItem.label = " " + conditions[i].name + ":  " + ConditionsWindow.STRINGS_FOR_SUBJECTS[conditions[i].subject] + (conditions[i].object == 6 ? (conditions[i].subject == 2 ? " have " : " has ") : (conditions[i].subject == 2 ? " are " : " is ")) + ConditionsWindow.STRINGS_FOR_OBJECTS[conditions[i].object];
			list.push(listItem);
		}
		if (win) this.winNameArea.text = "Condition " + (this.winConditions.length + 1);
		else this.lossNameArea.text = "Condition " + (this.lossConditions.length + 1);
	}

	private closeButtonPressed():void {
		this.visible = false;
		this.cont.m_fader.visible = false;
		ControllerChallenge.challenge.winConditionsAnded = this.allConditionsBox.selected;
	}
}
