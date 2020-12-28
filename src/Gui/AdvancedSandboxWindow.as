package Gui
{
	import Game.*;
	
	import fl.controls.*;
	import fl.events.SliderEvent;
	
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	
	public class AdvancedSandboxWindow extends GuiWindow
	{
		private var cont:Controller;
		
		private var sizeBox:ComboBox;
		private var shapeBox:ComboBox;
		private var themeBox:ComboBox;
		private var bgBox:ComboBox;
		private var redArea:TextInput;
		private var greenArea:TextInput;
		private var blueArea:TextInput;
		private var gravitySlider:Slider;
		private var gravityArea:TextInput;
		private var okButton:Button;
		private var cancelButton:Button;
		
		public function AdvancedSandboxWindow(contr:Controller, defaults:SandboxSettings = null)
		{
			cont = contr;
			var format:TextFormat = new TextFormat();
			
			var t:TextField = new TextField();
			t.text = "Advanced Sandbox\nSetup";
			t.width = 238;
			t.height = 50;
			t.textColor = 0x242930;
			t.selectable = false;
			t.x = 5;
			t.y = 15;
			format.size = 18;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			t.setTextFormat(format);
			addChild(t);
			
			t = new TextField();
			t.text = "Sandbox Size:";
			t.width = 180;
			t.height = 20;
			t.textColor = 0x242930;
			t.selectable = false;
			t.x = 20;
			t.y = 77;
			format.size = 12;
			format.align = TextFormatAlign.LEFT;
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			t.setTextFormat(format);
			addChild(t);
			
			t = new TextField();
			t.text = "Terrain Shape:";
			t.width = 180;
			t.height = 20;
			t.textColor = 0x242930;
			t.selectable = false;
			t.x = 20;
			t.y = 112;
			format.size = 12;
			format.align = TextFormatAlign.LEFT;
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			t.setTextFormat(format);
			addChild(t);
			
			t = new TextField();
			t.text = "Terrain Theme:";
			t.width = 180;
			t.height = 20;
			t.textColor = 0x242930;
			t.selectable = false;
			t.x = 20;
			t.y = 147;
			format.size = 12;
			format.align = TextFormatAlign.LEFT;
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			t.setTextFormat(format);
			addChild(t);
			
			t = new TextField();
			t.text = "Background:";
			t.width = 180;
			t.height = 20;
			t.textColor = 0x242930;
			t.selectable = false;
			t.x = 20;
			t.y = 182;
			format.size = 12;
			format.align = TextFormatAlign.LEFT;
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			t.setTextFormat(format);
			addChild(t);
			
			t = new TextField();
			t.text = "Red:";
			t.width = 180;
			t.height = 20;
			t.textColor = 0x242930;
			t.selectable = false;
			t.x = 130;
			t.y = 210;
			format.size = 11;
			format.align = TextFormatAlign.LEFT;
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			t.setTextFormat(format);
			addChild(t);
			
			t = new TextField();
			t.text = "Green:";
			t.width = 180;
			t.height = 20;
			t.textColor = 0x242930;
			t.selectable = false;
			t.x = 130;
			t.y = 230;
			format.size = 11;
			format.align = TextFormatAlign.LEFT;
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			t.setTextFormat(format);
			addChild(t);
			
			t = new TextField();
			t.text = "Blue:";
			t.width = 180;
			t.height = 20;
			t.textColor = 0x242930;
			t.selectable = false;
			t.x = 130;
			t.y = 250;
			format.size = 11;
			format.align = TextFormatAlign.LEFT;
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			t.setTextFormat(format);
			addChild(t);
			
			t = new TextField();
			t.text = "Gravity:";
			t.width = 148;
			t.height = 20;
			t.textColor = 0x242930;
			t.selectable = false;
			t.x = 45;
			t.y = 280;
			format.size = 12;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			t.setTextFormat(format);
			addChild(t);
			
			sizeBox = new GuiCombobox(110, 70, 130, 32);
			sizeBox.addItem({label:"  Small"});
			sizeBox.addItem({label:"  Medium"});
			sizeBox.addItem({label:"  Large"});
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 12;
			format.color = 0x573D40;
			sizeBox.textField.setStyle("textFormat", format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 10;
			format.color = 0x4C3D57;
			sizeBox.dropdown.setRendererStyle("textFormat", format);
			sizeBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, refreshMouse, false, 0, true);
			if (defaults) sizeBox.selectedIndex = defaults.size;
			addChild(sizeBox);
			
			shapeBox = new GuiCombobox(110, 105, 130, 32);
			shapeBox.addItem({label:"  Flat Land"});
			shapeBox.addItem({label:"  Box"});
			shapeBox.addItem({label:"  Empty"});
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 12;
			format.color = 0x573D40;
			shapeBox.textField.setStyle("textFormat", format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 10;
			format.color = 0x4C3D57;
			shapeBox.dropdown.setRendererStyle("textFormat", format);
			shapeBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, refreshMouse, false, 0, true);
			if (defaults) shapeBox.selectedIndex = defaults.terrainType;
			addChild(shapeBox);
			
			themeBox = new GuiCombobox(110, 140, 130, 32);
			themeBox.addItem({label:"  Grass"});
			themeBox.addItem({label:"  Dirt"});
			themeBox.addItem({label:"  Sand"});
			themeBox.addItem({label:"  Rock"});
			themeBox.addItem({label:"  Snow"});
			themeBox.addItem({label:"  Moon"});
			themeBox.addItem({label:"  Mars"});
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 12;
			format.color = 0x573D40;
			themeBox.textField.setStyle("textFormat", format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 10;
			format.color = 0x4C3D57;
			themeBox.dropdown.setRendererStyle("textFormat", format);
			themeBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, refreshMouse, false, 0, true);
			if (defaults) themeBox.selectedIndex = defaults.terrainTheme;
			addChild(themeBox);
			
			bgBox = new GuiCombobox(110, 175, 130, 32);
			bgBox.addItem({label:"  Sky"});
			bgBox.addItem({label:"  Space"});
			bgBox.addItem({label:"  Night"});
			bgBox.addItem({label:"  Dusk"});
			bgBox.addItem({label:"  Mars"});
			bgBox.addItem({label:"  Sunset"});
			bgBox.addItem({label:"  Solid Color"});
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 12;
			format.color = 0x573D40;
			bgBox.textField.setStyle("textFormat", format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 10;
			format.color = 0x4C3D57;
			bgBox.dropdown.setRendererStyle("textFormat", format);
			bgBox.dropdown.addEventListener(Event.CHANGE, bgBoxChanged, false, 0, true);
			bgBox.dropdown.addEventListener(Event.ADDED_TO_STAGE, refreshMouse, false, 0, true);
			if (defaults) bgBox.selectedIndex = defaults.background;
			addChild(bgBox);
			
			format = new TextFormat();
			format.size = 10;
			redArea = new GuiTextInput(170, 210, 30, format);
			redArea.text = "125";
			redArea.maxChars = 3;
			redArea.height = 15;
			redArea.addEventListener(MouseEvent.CLICK, redFocus, false, 0, true);
			redArea.addEventListener(Event.CHANGE, redText, false, 0, true);
			redArea.enabled = (bgBox.selectedIndex == 6);
			redArea.editable = (bgBox.selectedIndex == 6);
			redArea.focusEnabled = (bgBox.selectedIndex == 6);
			if (defaults && (bgBox.selectedIndex == 6)) redArea.text = defaults.backgroundR + "";
			addChild(redArea);
			greenArea = new GuiTextInput(170, 230, 30, format);
			greenArea.text = "125";
			greenArea.maxChars = 3;
			greenArea.height = 15;
			greenArea.addEventListener(MouseEvent.CLICK, greenFocus, false, 0, true);
			greenArea.addEventListener(Event.CHANGE, greenText, false, 0, true);
			greenArea.enabled = (bgBox.selectedIndex == 6);
			greenArea.editable = (bgBox.selectedIndex == 6);
			greenArea.focusEnabled = (bgBox.selectedIndex == 6);
			if (defaults && (bgBox.selectedIndex == 6)) greenArea.text = defaults.backgroundG + "";
			addChild(greenArea);
			blueArea = new GuiTextInput(170, 250, 30, format);
			blueArea.text = "255";
			blueArea.maxChars = 3;
			blueArea.height = 15;
			blueArea.addEventListener(MouseEvent.CLICK, blueFocus, false, 0, true);
			blueArea.addEventListener(Event.CHANGE, blueText, false, 0, true);
			blueArea.enabled = (bgBox.selectedIndex == 6);
			blueArea.editable = (bgBox.selectedIndex == 6);
			blueArea.focusEnabled = (bgBox.selectedIndex == 6);
			if (defaults && (bgBox.selectedIndex == 6)) blueArea.text = defaults.backgroundB + "";
			addChild(blueArea);
			
			gravitySlider = new Slider();
			gravitySlider.setStyle("sliderTrackSkin", MainEditPanel.sliderGroove());
			gravitySlider.setStyle("sliderTrackDisabledSkin", MainEditPanel.sliderGrooveDisabled());
			gravitySlider.x = 78;
			gravitySlider.y = 302;
			gravitySlider.minimum = 0.0;
			gravitySlider.maximum = 30.0;
			gravitySlider.value = 15.0;
			gravitySlider.addEventListener(SliderEvent.CHANGE, sliderChange, false, 0, true);
			if (defaults) gravitySlider.value = defaults.gravity;
			addChild(gravitySlider);
			format = new TextFormat();
			format.size = 10;
			gravityArea = new GuiTextInput(104, 316, 30, format);
			gravityArea.text = "15";
			if (defaults) gravityArea.text = (defaults.gravity as int) + "";
			gravityArea.maxChars = 5;
			gravityArea.height = 15;
			gravityArea.addEventListener(MouseEvent.CLICK, gravityFocus, false, 0, true);
			gravityArea.addEventListener(FocusEvent.FOCUS_OUT, gravityText, false, 0, true);
			addChild(gravityArea);
			
			format = new TextFormat();
			format.size = 15;
			okButton = new GuiButton("Okay!", 49, 340, 150, 50, okButtonPressed, GuiButton.PURPLE, format);
			addChild(okButton);
			format = new TextFormat();
			format.size = 13;
			cancelButton = new GuiButton("Cancel", 74, 385, 100, 35, cancelButtonPressed, GuiButton.PURPLE, format);
			addChild(cancelButton);
			
			super(276, 90, 248, 430);
		}
		
		private function cancelButtonPressed(e:MouseEvent):void {
			if (cont is ControllerMainMenu) (cont as ControllerMainMenu).fader2.visible = false;
			else (cont as ControllerGame).m_fader.visible = false;
			visible = false;
			cont.removeChild(this);
		}
		
		private function okButtonPressed(e:MouseEvent):void {
			var settings:SandboxSettings = new SandboxSettings(gravitySlider.value, sizeBox.selectedIndex, shapeBox.selectedIndex, themeBox.selectedIndex, bgBox.selectedIndex, parseInt(redArea.text), parseInt(greenArea.text), parseInt(blueArea.text));
			ControllerSandbox.settings = settings;
			if (cont is ControllerMainMenu) Main.changeControllers = true;
			else {
				if (cont is ControllerChallenge) ControllerChallenge.challenge.settings = settings;
				(cont as ControllerSandbox).RefreshSandboxSettings();
				(cont as ControllerSandbox).m_fader.visible = false;
			}
		}
		
		private function bgBoxChanged(e:Event):void {
			redArea.enabled = (bgBox.selectedIndex == 6);
			greenArea.enabled = (bgBox.selectedIndex == 6);
			blueArea.enabled = (bgBox.selectedIndex == 6);
			redArea.editable = (bgBox.selectedIndex == 6);
			greenArea.editable = (bgBox.selectedIndex == 6);
			blueArea.editable = (bgBox.selectedIndex == 6);
			redArea.focusEnabled = (bgBox.selectedIndex == 6);
			greenArea.focusEnabled = (bgBox.selectedIndex == 6);
			blueArea.focusEnabled = (bgBox.selectedIndex == 6);
		}
		
		private function gravityFocus(e:MouseEvent):void {
			gravityArea.setSelection(0, 5);
		}
		
		private function redFocus(e:MouseEvent):void {
			if (redArea.enabled) redArea.setSelection(0, 3);
		}
		
		private function greenFocus(e:MouseEvent):void {
			if (greenArea.enabled) greenArea.setSelection(0, 3);
		}
		
		private function blueFocus(e:MouseEvent):void {
			if (blueArea.enabled) blueArea.setSelection(0, 3);
		}
		
		private function redText(e:Event):void {
			var red:int = parseInt(e.target.text);
			if (red < 0) red = 0;
			if (red > 255) red = 255;
			if (isNaN(red)) red = 0;
			e.target.text = red + "";
		}
		
		private function greenText(e:Event):void {
			var green:int = parseInt(e.target.text);
			if (green < 0) green = 0;
			if (green > 255) green = 255;
			if (isNaN(green)) green = 0;
			e.target.text = green + "";
		}
		
		private function blueText(e:Event):void {
			var blue:int = parseInt(e.target.text);
			if (blue < 0) blue = 0;
			if (blue > 255) blue = 255;
			if (isNaN(blue)) blue = 0;
			e.target.text = blue + "";
		}
		
		private function gravityText(e:Event):void {
			var gravity:Number = Number(e.target.text);
			if (gravity < 0.0) gravity = 0.0;
			if (gravity > 30.0) gravity = 30.0;
			if (isNaN(gravity)) gravity = 15.0;
			gravitySlider.value = gravity;
		}
		
		private function sliderChange(e:Event):void {
			gravityArea.text = gravitySlider.value.toString();
		}
		
		private function refreshMouse(e:Event):void {
			if (e.target == bgBox.dropdown || e.target == themeBox.dropdown) {
				e.target.height = 140;
			}
			Main.RefreshMouse(stage, (e.target as Sprite));
		}
	}
}