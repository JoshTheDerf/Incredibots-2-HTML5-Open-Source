import { Text, TextStyle, Graphics, utils } from "pixi.js";
import { ControllerGame } from "../Game/ControllerGame";
import { Main } from "../Main";
import { Part } from "../Parts/Part";
import { TextPart } from "../Parts/TextPart";
import { GuiButton } from "./GuiButton";
import { GuiCheckBox } from "./GuiCheckBox";
import { GuiCombobox } from "./GuiCombobox";
import { GuiTextInput } from "./GuiTextInput";
import { GuiWindow } from "./GuiWindow";
import { PartEditWindow } from "./PartEditWindow";

export class ColourChangeWindow extends GuiWindow
{
	private cont:ControllerGame;
	private m_sidePanel:PartEditWindow;

	private m_redLabel:Text;
	private m_greenLabel:Text;
	private m_blueLabel:Text;
	private m_opacityLabel:Text;
	private m_redArea:GuiTextInput;
	private m_greenArea:GuiTextInput;
	private m_blueArea:GuiTextInput;
	private m_opacityArea:GuiTextInput;
	private m_colourBox:GuiCombobox;
	private m_okButton:GuiButton;
	private m_cancelButton:GuiButton;
	private m_defaultBox:GuiCheckBox;

	private m_colourSelector: Graphics;

	constructor(contr:ControllerGame, sidePanel:PartEditWindow)
	{
		super(119, 0, 120, 260);
		this.cont = contr;
		this.m_sidePanel = sidePanel;
		this.m_colourSelector = new Graphics()
		this.addChild(this.m_colourSelector)

		var format:TextStyle = new TextStyle();
		format.fontFamily = Main.GLOBAL_FONT;
		format.fill = 0x242930;
		this.m_redLabel = new Text('');
		this.m_redLabel.text = "Red:";
		this.m_redLabel.width = 50;
		this.m_redLabel.height = 20;
		this.m_redLabel.x = 18;
		this.m_redLabel.y = 20;
		this.m_redLabel.style = format;
		this.addChild(this.m_redLabel);
		this.m_greenLabel = new Text('');
		this.m_greenLabel.text = "Green:";
		this.m_greenLabel.width = 50;
		this.m_greenLabel.height = 20;
		this.m_greenLabel.x = 18;
		this.m_greenLabel.y = 40;
		this.m_greenLabel.style = format;
		this.addChild(this.m_greenLabel);
		this.m_blueLabel = new Text('');
		this.m_blueLabel.text = "Blue:";
		this.m_blueLabel.width = 50;
		this.m_blueLabel.height = 20;
		this.m_blueLabel.x = 18;
		this.m_blueLabel.y = 60;
		this.m_blueLabel.style = format;
		this.addChild(this.m_blueLabel);
		this.m_opacityLabel = new Text('');
		this.m_opacityLabel.text = "Opacity:";
		this.m_opacityLabel.width = 50;
		this.m_opacityLabel.height = 20;
		this.m_opacityLabel.x = 18;
		this.m_opacityLabel.y = 80;
		this.m_opacityLabel.style = format;
		this.addChild(this.m_opacityLabel);
		format = new TextStyle();
		format.fontSize = 9;
		this.m_redArea = new GuiTextInput(67, 20, 30, 15, format);
		this.m_redArea.text = "253";
		this.m_redArea.maxLength = 3;
		this.m_redArea.on('click', (event: any) => this.redFocus(event));
		this.m_redArea.on('focus', (event: any) => this.m_sidePanel.TextAreaGotFocus(event));
		this.m_redArea.on('change', (event: any) => this.redText(event));
		this.m_redArea.on('blur', (event: any) => this.focusOut(event));
		this.addChild(this.m_redArea);
		this.m_greenArea = new GuiTextInput(67, 40, 30, 15, format);
		this.m_greenArea.text = "136";
		this.m_greenArea.maxLength = 3;
		this.m_greenArea.on('click', (event: any) => this.greenFocus(event));
		this.m_greenArea.on('focus', (event: any) => this.m_sidePanel.TextAreaGotFocus(event));
		this.m_greenArea.on('change', (event: any) => this.greenText(event));
		this.m_greenArea.on('blur', (event: any) => this.focusOut(event));
		this.addChild(this.m_greenArea);
		this.m_blueArea = new GuiTextInput(67, 60, 30, 15, format);
		this.m_blueArea.text = "92";
		this.m_blueArea.maxLength = 3;
		this.m_blueArea.on('click', (event: any) => this.blueFocus(event));
		this.m_blueArea.on('focus', (event: any) => this.m_sidePanel.TextAreaGotFocus(event));
		this.m_blueArea.on('change', (event: any) => this.blueText(event));
		this.m_blueArea.on('blur', (event: any) => this.focusOut(event));
		this.addChild(this.m_blueArea);
		this.m_opacityArea = new GuiTextInput(67, 80, 30, 15, format);
		this.m_opacityArea.text = "210";
		this.m_opacityArea.maxLength = 3;
		this.m_opacityArea.on('click', (event: any) => this.opacityFocus(event));
		this.m_opacityArea.on('focus', (event: any) => this.m_sidePanel.TextAreaGotFocus(event));
		this.m_opacityArea.on('change', (event: any) => this.opacityText(event));
		this.m_opacityArea.on('blur', (event: any) => this.focusOut(event));
		this.addChild(this.m_opacityArea);
		this.m_colourBox = new GuiCombobox(10, 95, 100, 30);
		this.m_colourBox.addItem({label:"  --"});
		this.m_colourBox.addItem({label:"  Red"});
		this.m_colourBox.addItem({label:"  Orange"});
		this.m_colourBox.addItem({label:"  Yellow"});
		this.m_colourBox.addItem({label:"  Green"});
		this.m_colourBox.addItem({label:"  Turquoise"});
		this.m_colourBox.addItem({label:"  Blue"});
		this.m_colourBox.addItem({label:"  Purple"});
		this.m_colourBox.addItem({label:"  Pink"});
		this.m_colourBox.addItem({label:"  Beige"});
		this.m_colourBox.addItem({label:"  Brown"});
		this.m_colourBox.addItem({label:"  White"});
		this.m_colourBox.addItem({label:"  Grey"});
		this.m_colourBox.addItem({label:"  Black"});
		// this.m_colourBox.addEventListener(Event.OPEN, this.m_sidePanel.sliderClicked, false, 0, true);
		// this.m_colourBox.addEventListener(Event.CLOSE, this.m_sidePanel.sliderReleased, false, 0, true);
		this.m_colourBox.on('change', (event: any) => this.colourBox(event));
		this.m_colourBox.on('close', (event: any) => this.colourBox(event));
		format = new TextStyle();
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 10;
		format.fill = 0x4C3D57;
		this.m_colourBox.label.style = format
		this.addChild(this.m_colourBox);
		this.redrawBox();
		format = new TextStyle();
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 10;
		format.fill = 0x242930;
		this.m_defaultBox = new GuiCheckBox(5, 160, 120);
		this.m_defaultBox.style = format;
		this.m_defaultBox.label = "Make Default";
		this.m_defaultBox.selected = false;
		this.addChild(this.m_defaultBox);

		this.m_okButton = new GuiButton("OK", 10, 180, 100, 35, this.okButton, GuiButton.PURPLE);
		this.addChild(this.m_okButton);
		this.m_cancelButton = new GuiButton("Cancel", 10, 210, 100, 35, this.cancelButton, GuiButton.PURPLE);
		this.addChild(this.m_cancelButton);
	}

	public SetVals():void {
		var selectedPart:Part = this.cont.selectedParts[0];
		this.m_redArea.text = selectedPart.red + "";
		this.m_greenArea.text = selectedPart.green + "";
		this.m_blueArea.text = selectedPart.blue + "";
		this.m_opacityArea.text = (selectedPart instanceof TextPart ? "255" : selectedPart.opacity + "");
		this.SetComboBoxIndex();
		this.redrawBox();
	}

	private SetComboBoxIndex():void {
		var red:number = parseInt(this.m_redArea.text);
		var green:number = parseInt(this.m_greenArea.text);
		var blue:number = parseInt(this.m_blueArea.text);
		if (red == 253 && green == 66 && blue == 42) {
			this.m_colourBox.selectedIndex = 1;
		} else if (red == 253 && green == 116 && blue == 10) {
			this.m_colourBox.selectedIndex = 2;
		} else if (red == 251 && green == 241 && blue == 56) {
			this.m_colourBox.selectedIndex = 3;
		} else if (red == 80 && green == 255 && blue == 72) {
			this.m_colourBox.selectedIndex = 4;
		} else if (red == 52 && green == 245 && blue == 227) {
			this.m_colourBox.selectedIndex = 5;
		} else if (red == 54 && green == 89 && blue == 255) {
			this.m_colourBox.selectedIndex = 6;
		} else if (red == 189 && green == 87 && blue == 255) {
			this.m_colourBox.selectedIndex = 7;
		} else if (red == 255 && green == 155 && blue == 152) {
			this.m_colourBox.selectedIndex = 8;
		} else if (red == 255 && green == 216 && blue == 136) {
			this.m_colourBox.selectedIndex = 9;
		} else if (red == 151 && green == 122 && blue == 46) {
			this.m_colourBox.selectedIndex = 10;
		} else if (red == 253 && green == 253 && blue == 253) {
			this.m_colourBox.selectedIndex = 11;
		} else if (red == 160 && green == 160 && blue == 160) {
			this.m_colourBox.selectedIndex = 12;
		} else if (red == 24 && green == 24 && blue == 24) {
			this.m_colourBox.selectedIndex = 13;
		} else {
			this.m_colourBox.selectedIndex = 0;
		}
	}

	private cancelButton(e:Event):void {
		this.visible = false;
	}

	public redFocus(e:MouseEvent):void {
		this.m_redArea.setSelection(0, 3);
	}

	public greenFocus(e:MouseEvent):void {
		this.m_greenArea.setSelection(0, 3);
	}

	public blueFocus(e:MouseEvent):void {
		this.m_blueArea.setSelection(0, 3);
	}

	public opacityFocus(e:MouseEvent):void {
		this.m_opacityArea.setSelection(0, 3);
	}

	public focusOut(e:Event):void {
		this.m_sidePanel.TextAreaLostFocus();
	}

	private redText(e:Event):void {
		var red:number = parseInt(e.target.text);
		if (red < 0) red = 0;
		if (red > 255) red = 255;
		if (isNaN(red)) red = 0;
		e.target.text = red + "";
		this.SetComboBoxIndex();
		this.redrawBox();
		this.cont.textEntered(e);
	}

	private greenText(e:Event):void {
		var green:number = parseInt(e.target.text);
		if (green < 0) green = 0;
		if (green > 255) green = 255;
		if (isNaN(green)) green = 0;
		e.target.text = green + "";
		this.SetComboBoxIndex();
		this.redrawBox();
		this.cont.textEntered(e);
	}

	private blueText(e:Event):void {
		var blue:number = parseInt(e.target.text);
		if (blue < 0) blue = 0;
		if (blue > 255) blue = 255;
		if (isNaN(blue)) blue = 0;
		e.target.text = blue + "";
		this.SetComboBoxIndex();
		this.redrawBox();
		this.cont.textEntered(e);
	}

	private opacityText(e:Event):void {
		var opacity:number = parseInt(e.target.text);
		if (opacity < 0) opacity = 0;
		if (opacity > 255) opacity = 255;
		if (isNaN(opacity)) opacity = 0;
		e.target.text = opacity + "";
		this.cont.textEntered(e);
	}

	private colourBox(e:Event):void {
		if (e.target.selectedIndex == 1) {
			this.m_redArea.text = "253";
			this.m_greenArea.text = "66";
			this.m_blueArea.text = "42";
		} else if (e.target.selectedIndex == 2) {
			this.m_redArea.text = "253";
			this.m_greenArea.text = "116";
			this.m_blueArea.text = "10";
		} else if (e.target.selectedIndex == 3) {
			this.m_redArea.text = "251";
			this.m_greenArea.text = "241";
			this.m_blueArea.text = "56";
		} else if (e.target.selectedIndex == 4) {
			this.m_redArea.text = "80";
			this.m_greenArea.text = "255";
			this.m_blueArea.text = "72";
		} else if (e.target.selectedIndex == 5) {
			this.m_redArea.text = "52";
			this.m_greenArea.text = "245";
			this.m_blueArea.text = "227";
		} else if (e.target.selectedIndex == 6) {
			this.m_redArea.text = "54";
			this.m_greenArea.text = "89";
			this.m_blueArea.text = "255";
		} else if (e.target.selectedIndex == 7) {
			this.m_redArea.text = "189";
			this.m_greenArea.text = "87";
			this.m_blueArea.text = "255";
		} else if (e.target.selectedIndex == 8) {
			this.m_redArea.text = "255";
			this.m_greenArea.text = "155";
			this.m_blueArea.text = "152";
		} else if (e.target.selectedIndex == 9) {
			this.m_redArea.text = "255";
			this.m_greenArea.text = "216";
			this.m_blueArea.text = "136";
		} else if (e.target.selectedIndex == 10) {
			this.m_redArea.text = "151";
			this.m_greenArea.text = "122";
			this.m_blueArea.text = "46";
		} else if (e.target.selectedIndex == 11) {
			this.m_redArea.text = "253";
			this.m_greenArea.text = "253";
			this.m_blueArea.text = "253";
		} else if (e.target.selectedIndex == 12) {
			this.m_redArea.text = "160";
			this.m_greenArea.text = "160";
			this.m_blueArea.text = "160";
		} else if (e.target.selectedIndex == 13) {
			this.m_redArea.text = "24";
			this.m_greenArea.text = "24";
			this.m_blueArea.text = "24";
		}
		this.redrawBox();
	}

	private okButton(e:Event):void {
		this.cancelButton(e);
		this.cont.colourButton(parseInt(this.m_redArea.text), parseInt(this.m_greenArea.text), parseInt(this.m_blueArea.text), parseInt(this.m_opacityArea.text), this.m_defaultBox.selected);
	}

	private redrawBox():void {
		this.m_colourSelector.beginFill(utils.rgb2hex([parseInt(this.m_redArea.text) / 255, parseInt(this.m_greenArea.text) / 255, parseInt(this.m_blueArea.text) / 255]), 1);
		this.m_colourSelector.lineStyle(1, 0x222222, 1.0);
		this.m_colourSelector.drawRect(40, 128, 40, 30);
		this.m_colourSelector.endFill();
	}
}
