package Gui
{
	import Box2D.Common.b2Color;
	
	import Game.ControllerGame;
	
	import Parts.*;
	
	import fl.controls.*;
	
	import flash.display.Sprite;
	import flash.events.*;
	import flash.text.*;
	
	public class ColourChangeWindow extends GuiWindow
	{
		private var cont:ControllerGame;
		private var m_sidePanel:PartEditWindow;
		
		private var m_redLabel:TextField;
		private var m_greenLabel:TextField;
		private var m_blueLabel:TextField;
		private var m_opacityLabel:TextField;
		private var m_redArea:TextInput;
		private var m_greenArea:TextInput;
		private var m_blueArea:TextInput;
		private var m_opacityArea:TextInput;
		private var m_colourBox:ComboBox;
		private var m_okButton:Button;
		private var m_cancelButton:Button;
		private var m_defaultBox:CheckBox;

		public function ColourChangeWindow(contr:ControllerGame, sidePanel:PartEditWindow)
		{
			cont = contr;
			m_sidePanel = sidePanel;
			super(119, 0, 120, 260);
			
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			m_redLabel = new TextField();
			m_redLabel.text = "Red:";
			m_redLabel.width = 50;
			m_redLabel.height = 20;
			m_redLabel.selectable = false;
			m_redLabel.x = 18;
			m_redLabel.y = 20;
			m_redLabel.setTextFormat(format);
			addChild(m_redLabel);
			m_greenLabel = new TextField();
			m_greenLabel.text = "Green:";
			m_greenLabel.width = 50;
			m_greenLabel.height = 20;
			m_greenLabel.selectable = false;
			m_greenLabel.x = 18;
			m_greenLabel.y = 40;
			m_greenLabel.setTextFormat(format);
			addChild(m_greenLabel);
			m_blueLabel = new TextField();
			m_blueLabel.text = "Blue:";
			m_blueLabel.width = 50;
			m_blueLabel.height = 20;
			m_blueLabel.selectable = false;
			m_blueLabel.x = 18;
			m_blueLabel.y = 60;
			m_blueLabel.setTextFormat(format);
			addChild(m_blueLabel);
			m_opacityLabel = new TextField();
			m_opacityLabel.text = "Opacity:";
			m_opacityLabel.width = 50;
			m_opacityLabel.height = 20;
			m_opacityLabel.selectable = false;
			m_opacityLabel.x = 18;
			m_opacityLabel.y = 80;
			m_opacityLabel.setTextFormat(format);
			addChild(m_opacityLabel);
			format = new TextFormat();
			format.size = 9;
			m_redArea = new GuiTextInput(67, 20, 30, format);
			m_redArea.text = "253";
			m_redArea.maxChars = 3;
			m_redArea.height = 15;
			m_redArea.addEventListener(MouseEvent.CLICK, redFocus, false, 0, true);
			m_redArea.addEventListener(FocusEvent.FOCUS_IN, m_sidePanel.TextAreaGotFocus, false, 0, true);
			m_redArea.addEventListener(Event.CHANGE, redText, false, 0, true);
			m_redArea.addEventListener(FocusEvent.FOCUS_OUT, focusOut, false, 0, true);
			addChild(m_redArea);
			m_greenArea = new GuiTextInput(67, 40, 30, format);
			m_greenArea.text = "136";
			m_greenArea.maxChars = 3;
			m_greenArea.height = 15;
			m_greenArea.addEventListener(MouseEvent.CLICK, greenFocus, false, 0, true);
			m_greenArea.addEventListener(FocusEvent.FOCUS_IN, m_sidePanel.TextAreaGotFocus, false, 0, true);
			m_greenArea.addEventListener(Event.CHANGE, greenText, false, 0, true);
			m_greenArea.addEventListener(FocusEvent.FOCUS_OUT, focusOut, false, 0, true);
			addChild(m_greenArea);
			m_blueArea = new GuiTextInput(67, 60, 30, format);
			m_blueArea.text = "92";
			m_blueArea.maxChars = 3;
			m_blueArea.height = 15;
			m_blueArea.addEventListener(MouseEvent.CLICK, blueFocus, false, 0, true);
			m_blueArea.addEventListener(FocusEvent.FOCUS_IN, m_sidePanel.TextAreaGotFocus, false, 0, true);
			m_blueArea.addEventListener(Event.CHANGE, blueText, false, 0, true);
			m_blueArea.addEventListener(FocusEvent.FOCUS_OUT, focusOut, false, 0, true);
			addChild(m_blueArea);
			m_opacityArea = new GuiTextInput(67, 80, 30, format);
			m_opacityArea.text = "210";
			m_opacityArea.maxChars = 3;
			m_opacityArea.height = 15;
			m_opacityArea.addEventListener(MouseEvent.CLICK, opacityFocus, false, 0, true);
			m_opacityArea.addEventListener(FocusEvent.FOCUS_IN, m_sidePanel.TextAreaGotFocus, false, 0, true);
			m_opacityArea.addEventListener(Event.CHANGE, opacityText, false, 0, true);
			m_opacityArea.addEventListener(FocusEvent.FOCUS_OUT, focusOut, false, 0, true);
			addChild(m_opacityArea);
			m_colourBox = new GuiCombobox(10, 95, 100, 30);
			m_colourBox.addItem({label:"  --"});
			m_colourBox.addItem({label:"  Red"});
			m_colourBox.addItem({label:"  Orange"});
			m_colourBox.addItem({label:"  Yellow"});
			m_colourBox.addItem({label:"  Green"});
			m_colourBox.addItem({label:"  Turquoise"});
			m_colourBox.addItem({label:"  Blue"});
			m_colourBox.addItem({label:"  Purple"});
			m_colourBox.addItem({label:"  Pink"});
			m_colourBox.addItem({label:"  Beige"});
			m_colourBox.addItem({label:"  Brown"});
			m_colourBox.addItem({label:"  White"});
			m_colourBox.addItem({label:"  Grey"});
			m_colourBox.addItem({label:"  Black"});
			m_colourBox.addEventListener(Event.OPEN, m_sidePanel.sliderClicked, false, 0, true);
			m_colourBox.addEventListener(Event.CLOSE, m_sidePanel.sliderReleased, false, 0, true);
			m_colourBox.addEventListener(Event.CHANGE, colourBox, false, 0, true);
			m_colourBox.addEventListener(Event.CLOSE, colourBox, false, 0, true);
			m_colourBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, refreshMouse, false, 0, true);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 10;
			format.color = 0x4C3D57;
			m_colourBox.dropdown.setRendererStyle("textFormat", format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x573D40;
			format.size = 12;
			m_colourBox.textField.setStyle("textFormat", format);
			addChild(m_colourBox);
			redrawBox();
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 10;
			format.color = 0x242930;
			m_defaultBox = new GuiCheckBox();
			m_defaultBox.setStyle("textFormat", format);
			m_defaultBox.label = "Make Default";
			m_defaultBox.x = 5;
			m_defaultBox.y = 160;
			m_defaultBox.width = 120;
			m_defaultBox.selected = false;
			addChild(m_defaultBox);
			
			m_okButton = new GuiButton("OK", 10, 180, 100, 35, okButton, GuiButton.PURPLE);
			addChild(m_okButton);
			m_cancelButton = new GuiButton("Cancel", 10, 210, 100, 35, cancelButton, GuiButton.PURPLE);
			addChild(m_cancelButton);
		}
		
		public function SetVals():void {
			var selectedPart:Object = cont.selectedParts[0];
			m_redArea.text = selectedPart.red + "";
			m_greenArea.text = selectedPart.green + "";
			m_blueArea.text = selectedPart.blue + "";
			m_opacityArea.text = (selectedPart is TextPart ? "255" : selectedPart.opacity + "");
			SetComboBoxIndex();
			redrawBox();
		}
		
		private function SetComboBoxIndex():void {
			var red:int = parseInt(m_redArea.text);
			var green:int = parseInt(m_greenArea.text);
			var blue:int = parseInt(m_blueArea.text);
			if (red == 253 && green == 66 && blue == 42) {
				m_colourBox.selectedIndex = 1;
			} else if (red == 253 && green == 116 && blue == 10) {
				m_colourBox.selectedIndex = 2;
			} else if (red == 251 && green == 241 && blue == 56) {
				m_colourBox.selectedIndex = 3;
			} else if (red == 80 && green == 255 && blue == 72) {
				m_colourBox.selectedIndex = 4;
			} else if (red == 52 && green == 245 && blue == 227) {
				m_colourBox.selectedIndex = 5;
			} else if (red == 54 && green == 89 && blue == 255) {
				m_colourBox.selectedIndex = 6;
			} else if (red == 189 && green == 87 && blue == 255) {
				m_colourBox.selectedIndex = 7;
			} else if (red == 255 && green == 155 && blue == 152) {
				m_colourBox.selectedIndex = 8;
			} else if (red == 255 && green == 216 && blue == 136) {
				m_colourBox.selectedIndex = 9;
			} else if (red == 151 && green == 122 && blue == 46) {
				m_colourBox.selectedIndex = 10;
			} else if (red == 253 && green == 253 && blue == 253) {
				m_colourBox.selectedIndex = 11;
			} else if (red == 160 && green == 160 && blue == 160) {
				m_colourBox.selectedIndex = 12;
			} else if (red == 24 && green == 24 && blue == 24) {
				m_colourBox.selectedIndex = 13;
			} else {
				m_colourBox.selectedIndex = 0;
			}
		}
		
		private function cancelButton(e:Event):void {
			visible = false;
		}
		
		public function redFocus(e:MouseEvent):void {
			m_redArea.setSelection(0, 3);
		}
		
		public function greenFocus(e:MouseEvent):void {
			m_greenArea.setSelection(0, 3);
		}
		
		public function blueFocus(e:MouseEvent):void {
			m_blueArea.setSelection(0, 3);
		}
		
		public function opacityFocus(e:MouseEvent):void {
			m_opacityArea.setSelection(0, 3);
		}
		
		public function focusOut(e:Event):void {
			m_sidePanel.TextAreaLostFocus();
		}
		
		private function redText(e:Event):void {
			var red:int = parseInt(e.target.text);
			if (red < 0) red = 0;
			if (red > 255) red = 255;
			if (isNaN(red)) red = 0;
			e.target.text = red + "";
			SetComboBoxIndex();
			redrawBox();
			cont.textEntered(e);
		}
		
		private function greenText(e:Event):void {
			var green:int = parseInt(e.target.text);
			if (green < 0) green = 0;
			if (green > 255) green = 255;
			if (isNaN(green)) green = 0;
			e.target.text = green + "";
			SetComboBoxIndex();
			redrawBox();
			cont.textEntered(e);
		}
		
		private function blueText(e:Event):void {
			var blue:int = parseInt(e.target.text);
			if (blue < 0) blue = 0;
			if (blue > 255) blue = 255;
			if (isNaN(blue)) blue = 0;
			e.target.text = blue + "";
			SetComboBoxIndex();
			redrawBox();
			cont.textEntered(e);
		}
		
		private function opacityText(e:Event):void {
			var opacity:int = parseInt(e.target.text);
			if (opacity < 0) opacity = 0;
			if (opacity > 255) opacity = 255;
			if (isNaN(opacity)) opacity = 0;
			e.target.text = opacity + "";
			cont.textEntered(e);
		}
		
		private function colourBox(e:Event):void {
			if (e.target.selectedIndex == 1) {
				m_redArea.text = "253";
				m_greenArea.text = "66";
				m_blueArea.text = "42";
			} else if (e.target.selectedIndex == 2) {
				m_redArea.text = "253";
				m_greenArea.text = "116";
				m_blueArea.text = "10";
			} else if (e.target.selectedIndex == 3) {
				m_redArea.text = "251";
				m_greenArea.text = "241";
				m_blueArea.text = "56";
			} else if (e.target.selectedIndex == 4) {
				m_redArea.text = "80";
				m_greenArea.text = "255";
				m_blueArea.text = "72";
			} else if (e.target.selectedIndex == 5) {
				m_redArea.text = "52";
				m_greenArea.text = "245";
				m_blueArea.text = "227";
			} else if (e.target.selectedIndex == 6) {
				m_redArea.text = "54";
				m_greenArea.text = "89";
				m_blueArea.text = "255";
			} else if (e.target.selectedIndex == 7) {
				m_redArea.text = "189";
				m_greenArea.text = "87";
				m_blueArea.text = "255";
			} else if (e.target.selectedIndex == 8) {
				m_redArea.text = "255";
				m_greenArea.text = "155";
				m_blueArea.text = "152";
			} else if (e.target.selectedIndex == 9) {
				m_redArea.text = "255";
				m_greenArea.text = "216";
				m_blueArea.text = "136";
			} else if (e.target.selectedIndex == 10) {
				m_redArea.text = "151";
				m_greenArea.text = "122";
				m_blueArea.text = "46";
			} else if (e.target.selectedIndex == 11) {
				m_redArea.text = "253";
				m_greenArea.text = "253";
				m_blueArea.text = "253";
			} else if (e.target.selectedIndex == 12) {
				m_redArea.text = "160";
				m_greenArea.text = "160";
				m_blueArea.text = "160";
			} else if (e.target.selectedIndex == 13) {
				m_redArea.text = "24";
				m_greenArea.text = "24";
				m_blueArea.text = "24";
			}
			redrawBox();
		}
		
		private function okButton(e:Event):void {
			cancelButton(e);
			cont.colourButton(parseInt(m_redArea.text), parseInt(m_greenArea.text), parseInt(m_blueArea.text), parseInt(m_opacityArea.text), m_defaultBox.selected);
		}
		
		private function redrawBox():void {
			var colour:b2Color = new b2Color(parseInt(m_blueArea.text) / 255.0, parseInt(m_greenArea.text) / 255.0, parseInt(m_redArea.text) / 255.0);
			graphics.beginFill(colour.color, 1);
			graphics.lineStyle(1, 0x222222, 1.0);
			graphics.drawRect(40, 128, 40, 30);
			graphics.endFill();
		}
		
		private function refreshMouse(e:Event):void {
			if (e.target == m_colourBox.dropdown) {
				e.target.height = 280;
			}
			Main.RefreshMouse(stage, (e.target as Sprite));
		}
	}
}