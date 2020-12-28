package Gui
{
	import Game.*;
	
	import General.Input;
	
	import Parts.*;
	
	import fl.controls.*;
	import fl.events.*;
	
	import flash.display.Sprite;
	import flash.events.*;
	import flash.text.*;
	
	public class PartEditWindow extends GuiWindow
	{
		private var cont:ControllerGame;
		private var enteringInput:Boolean = false;
		public var sliderDown:Boolean = false;
		
		private var m_colourWindow:ColourChangeWindow;
		
		private var m_objectEditPanel:Sprite;
		private var m_textEditPanel:Sprite;
		private var m_fixedJointPanel:Sprite;
		private var m_jointEditPanel:Sprite;
		private var m_thrustersEditPanel:Sprite;
		private var m_multiEditPanel:Sprite;
		private var m_buildBoxPanel:Sprite;
		private var m_cannonPanel:Sprite;

		private var m_shapeHeader:TextField;
		private var m_jointHeader:TextField;
		private var m_thrustersHeader:TextField;
		private var m_cannonHeader:TextField;
		private var m_rotateButton:Button;
		private var m_deleteButton:Button;
		private var m_cutButton:Button;
		private var m_copyButton:Button;
		private var m_pasteButton:Button;
		private var m_collisionBox:CheckBox;
		private var m_cameraBox:CheckBox;
		private var m_fixateBox:CheckBox = null;
		private var m_densityLabel:TextField;
		private var m_densitySlider:Slider;
		private var m_densityArea:TextInput;
		private var m_backButton:Button;
		private var m_frontButton:Button;
		private var m_colourButton:Button;
		private var m_outlineBox:CheckBox;
		private var m_terrainBox:CheckBox;
		private var m_undragableBox:CheckBox;
		private var m_terrainBox3:CheckBox;
		private var m_outlineBox3:CheckBox;
		private var m_collisionBox3:CheckBox;
		private var m_collisionBox2:CheckBox;
		private var m_fixateBox2:CheckBox = null;
		private var m_undragableBox2:CheckBox;

		private var m_alwaysVisibleBox:CheckBox;
		private var m_scaleWithZoomBox:CheckBox;
		private var m_textLabel:TextField;
		private var m_textArea:TextArea;
		private var m_textKeyArea:TextInput;
		private var m_textKeyLabel:TextField;
		private var m_sizeLabel:TextField;
		private var m_sizeArea:TextInput;

		private var m_minDispArea:TextInput;
		private var m_maxDispArea:TextInput;
		private var m_enableMotorBox:CheckBox;
		private var m_rigidJointBox:CheckBox;
		private var m_strengthLabel:TextField;
		private var m_speedLabel:TextField;
		private var m_strengthSlider:Slider;
		private var m_strengthArea:TextInput;
		private var m_speedSlider:Slider;
		private var m_speedArea:TextInput;
		private var m_controlKeyArea1:TextInput;
		private var m_controlKeyArea2:TextInput;
		private var m_limitLabel1:TextField;
		private var m_limitLabel2:TextField;
		private var m_inputLabel1:TextField;
		private var m_inputLabel2:TextField;
		private var m_autoBox1:CheckBox;
		private var m_autoBox2:CheckBox;
		private var m_outlineBox2:CheckBox;
		
		private var m_thrustLabel:TextField;
		private var m_thrustSlider:Slider;
		private var m_thrustArea:TextInput;
		private var m_thrustKeyLabel:TextField;
		private var m_thrustKeyArea:TextInput;
		private var m_autoBox3:CheckBox;
		
		private var m_collisionBox7:CheckBox;
		private var m_densityArea7:TextInput;
		private var m_densitySlider7:Slider;
		private var m_fixateBox7:CheckBox;
		private var m_outlineBox7:CheckBox;
		private var m_terrainBox7:CheckBox;
		private var m_undragableBox7:CheckBox;
		private var m_strengthLabel7:TextField;
		private var m_strengthSlider7:Slider;
		private var m_strengthArea7:TextInput;
		private var m_fireKeyLabel:TextField;
		private var m_fireKeyArea:TextInput;
		
		public function PartEditWindow(contr:ControllerGame)
		{
			cont = contr;
			visible = false;
			super(0, 90, 120, 500);
			
			m_colourWindow = new ColourChangeWindow(cont, this);
			addChild(m_colourWindow);
			m_colourWindow.visible = false;
			
			m_objectEditPanel = new Sprite();
			addChild(m_objectEditPanel);
			m_textEditPanel = new Sprite();
			addChild(m_textEditPanel);
			m_fixedJointPanel = new Sprite();
			addChild(m_fixedJointPanel);
			m_jointEditPanel = new Sprite();
			addChild(m_jointEditPanel);
			m_thrustersEditPanel = new Sprite();
			addChild(m_thrustersEditPanel);
			m_multiEditPanel = new Sprite();
			addChild(m_multiEditPanel);
			m_buildBoxPanel = new Sprite();
			addChild(m_buildBoxPanel);
			m_cannonPanel = new Sprite();
			addChild(m_cannonPanel);
			
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.align = TextFormatAlign.CENTER;
			format.size = 14;
			var disabledFormat:TextFormat = new TextFormat();
			disabledFormat.font = Main.GLOBAL_FONT;
			disabledFormat.size = 9;
			disabledFormat.color = 0x666570;
			m_shapeHeader = new TextField();
			m_shapeHeader.text = "Circle";
			m_shapeHeader.width = 110;
			m_shapeHeader.height = 20;
			m_shapeHeader.textColor = 0x242930;
			m_shapeHeader.selectable = false;
			m_shapeHeader.x = 5;
			m_shapeHeader.y = 15;
			m_shapeHeader.setTextFormat(format);
			m_objectEditPanel.addChild(m_shapeHeader);
			m_backButton = new GuiButton("X", 90, -5, 35, 35, backButton, GuiButton.X);
			m_objectEditPanel.addChild(m_backButton);
			m_deleteButton = new GuiButton("Delete", 10, 30, 100, 35, cont.deleteButton, GuiButton.ORANGE);
			m_objectEditPanel.addChild(m_deleteButton);
			m_cutButton = new GuiButton("Cut", 10, 60, 100, 35, cont.cutButton, GuiButton.ORANGE);
			m_objectEditPanel.addChild(m_cutButton);
			m_copyButton = new GuiButton("Copy", 10, 90, 100, 35, cont.copyButton, GuiButton.ORANGE);
			m_objectEditPanel.addChild(m_copyButton);
			m_pasteButton = new GuiButton("Paste", 10, 120, 100, 35, cont.pasteButton, GuiButton.ORANGE);
			m_objectEditPanel.addChild(m_pasteButton);
			m_rotateButton = new GuiButton("Rotate", 10, 150, 100, 35, cont.rotateButton, GuiButton.BLUE);
			m_objectEditPanel.addChild(m_rotateButton);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			m_densityLabel = new TextField();
			m_densityLabel.text = "Density";
			m_densityLabel.width = 80;
			m_densityLabel.height = 20;
			m_densityLabel.textColor = 0x242930;
			m_densityLabel.selectable = false;
			m_densityLabel.x = 39;
			m_densityLabel.y = 186;
			m_densityLabel.setTextFormat(format);
			m_objectEditPanel.addChild(m_densityLabel);
			m_densitySlider = new Slider();
			m_densitySlider.setStyle("sliderTrackSkin", MainEditPanel.sliderGroove());
			m_densitySlider.setStyle("sliderTrackDisabledSkin", MainEditPanel.sliderGrooveDisabled());
			m_densitySlider.x = 20;
			m_densitySlider.y = 205;
			m_densitySlider.minimum = 1.0;
			m_densitySlider.maximum = 30.0;
			m_densitySlider.value = 15.0;
			m_densitySlider.addEventListener(SliderEvent.CHANGE, cont.densitySlider, false, 0, true);
			m_densitySlider.addEventListener(SliderEvent.THUMB_PRESS, sliderClicked, false, 0, true);
			m_densitySlider.addEventListener(SliderEvent.THUMB_RELEASE, sliderReleased, false, 0, true);
			m_objectEditPanel.addChild(m_densitySlider);
			format = new TextFormat();
			format.size = 9;
			m_densityArea = new GuiTextInput(35, 220, 50, format);
			m_densityArea.text = "10";
			m_densityArea.maxChars = 5;
			m_densityArea.height = 15;
			m_densityArea.addEventListener(MouseEvent.CLICK, densityFocus, false, 0, true);
			m_densityArea.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_densityArea.addEventListener(TextEvent.TEXT_INPUT, cont.textEntered, false, 0, true);
			m_densityArea.addEventListener(FocusEvent.FOCUS_OUT, cont.densityText, false, 0, true);
			m_densityArea.addEventListener(ComponentEvent.HIDE, cont.densityText, false, 0, true);
			m_objectEditPanel.addChild(m_densityArea);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 9;
			format.color = 0x242930;
			m_collisionBox = new GuiCheckBox();
			m_collisionBox.setStyle("textFormat", format);
			m_collisionBox.label = "Collides";
			m_collisionBox.x = 5;
			m_collisionBox.y = 240;
			m_collisionBox.width = 120;
			m_collisionBox.selected = true;
			m_collisionBox.addEventListener(MouseEvent.CLICK, cont.collisionBox, false, 0, true);
			m_objectEditPanel.addChild(m_collisionBox);
			m_cameraBox = new GuiCheckBox();
			m_cameraBox.setStyle("textFormat", format);
			m_cameraBox.setStyle("disabledTextFormat", disabledFormat);
			m_cameraBox.label = "Camera Focus";
			m_cameraBox.x = 5;
			m_cameraBox.y = 260;
			m_cameraBox.width = 120;
			m_cameraBox.selected = false;
			m_cameraBox.addEventListener(MouseEvent.CLICK, cont.cameraBox, false, 0, true);
			m_objectEditPanel.addChild(m_cameraBox);
			m_fixateBox = new GuiCheckBox();
			m_fixateBox.setStyle("textFormat", format);
			m_fixateBox.setStyle("disabledTextFormat", disabledFormat);
			m_fixateBox.label = "Fixate";
			m_fixateBox.x = 5;
			m_fixateBox.y = 300;
			m_fixateBox.width = 120;
			m_fixateBox.selected = false;
			m_fixateBox.addEventListener(MouseEvent.CLICK, cont.fixateBox, false, 0, true);
			m_objectEditPanel.addChild(m_fixateBox);
			m_colourButton = new GuiButton("Change Color", 5, 320, 110, 35, colourButton, GuiButton.BLUE);
			m_objectEditPanel.addChild(m_colourButton);
			m_frontButton = new GuiButton("Move to Front", 5, 350, 110, 35, cont.frontButton, GuiButton.PINK);
			m_objectEditPanel.addChild(m_frontButton);
			m_backButton = new GuiButton("Move to Back", 5, 380, 110, 35, cont.backButton, GuiButton.PINK);
			m_objectEditPanel.addChild(m_backButton);
			m_outlineBox = new GuiCheckBox();
			m_outlineBox.setStyle("textFormat", format);
			m_outlineBox.setStyle("disabledTextFormat", disabledFormat);
			m_outlineBox.label = "Show Outlines";
			m_outlineBox.x = 5;
			m_outlineBox.y = 415;
			m_outlineBox.width = 120;
			m_outlineBox.selected = false;
			m_outlineBox.addEventListener(MouseEvent.CLICK, cont.outlineBox, false, 0, true);
			m_objectEditPanel.addChild(m_outlineBox);
			m_terrainBox = new GuiCheckBox();
			m_terrainBox.setStyle("textFormat", format);
			m_terrainBox.label = "Outlines Behind";
			m_terrainBox.x = 5;
			m_terrainBox.y = 435;
			m_terrainBox.width = 120;
			m_terrainBox.selected = false;
			m_terrainBox.addEventListener(MouseEvent.CLICK, cont.terrainBox, false, 0, true);
			m_objectEditPanel.addChild(m_terrainBox);
			m_undragableBox = new GuiCheckBox();
			m_undragableBox.setStyle("textFormat", format);
			m_undragableBox.setStyle("disabledTextFormat", disabledFormat);
			m_undragableBox.label = "Undraggable";
			m_undragableBox.x = 5;
			m_undragableBox.y = 280;
			m_undragableBox.width = 120;
			m_undragableBox.selected = false;
			m_undragableBox.addEventListener(MouseEvent.CLICK, cont.undragableBox, false, 0, true);
			m_objectEditPanel.addChild(m_undragableBox);
			
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.align = TextFormatAlign.CENTER;
			format.size = 14;
			m_cannonHeader = new TextField();
			m_cannonHeader.text = "Cannon";
			m_cannonHeader.width = 110;
			m_cannonHeader.height = 20;
			m_cannonHeader.textColor = 0x242930;
			m_cannonHeader.selectable = false;
			m_cannonHeader.x = 5;
			m_cannonHeader.y = 15;
			m_cannonHeader.setTextFormat(format);
			m_cannonPanel.addChild(m_cannonHeader);
			m_backButton = new GuiButton("X", 90, -5, 35, 35, backButton, GuiButton.X);
			m_cannonPanel.addChild(m_backButton);
			m_deleteButton = new GuiButton("Delete", 10, 30, 100, 35, cont.deleteButton, GuiButton.ORANGE);
			m_cannonPanel.addChild(m_deleteButton);
			m_cutButton = new GuiButton("Cut", 10, 60, 100, 35, cont.cutButton, GuiButton.ORANGE);
			m_cannonPanel.addChild(m_cutButton);
			m_copyButton = new GuiButton("Copy", 10, 90, 100, 35, cont.copyButton, GuiButton.ORANGE);
			m_cannonPanel.addChild(m_copyButton);
			m_rotateButton = new GuiButton("Rotate", 10, 120, 100, 35, cont.rotateButton, GuiButton.BLUE);
			m_cannonPanel.addChild(m_rotateButton);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			m_densityLabel = new TextField();
			m_densityLabel.text = "Density";
			m_densityLabel.width = 80;
			m_densityLabel.height = 20;
			m_densityLabel.textColor = 0x242930;
			m_densityLabel.selectable = false;
			m_densityLabel.x = 39;
			m_densityLabel.y = 156;
			m_densityLabel.setTextFormat(format);
			m_cannonPanel.addChild(m_densityLabel);
			m_densitySlider7 = new Slider();
			m_densitySlider7.setStyle("sliderTrackSkin", MainEditPanel.sliderGroove());
			m_densitySlider7.setStyle("sliderTrackDisabledSkin", MainEditPanel.sliderGrooveDisabled());
			m_densitySlider7.x = 20;
			m_densitySlider7.y = 175;
			m_densitySlider7.minimum = 1.0;
			m_densitySlider7.maximum = 30.0;
			m_densitySlider7.value = 15.0;
			m_densitySlider7.addEventListener(SliderEvent.CHANGE, cont.densitySlider, false, 0, true);
			m_densitySlider7.addEventListener(SliderEvent.THUMB_PRESS, sliderClicked, false, 0, true);
			m_densitySlider7.addEventListener(SliderEvent.THUMB_RELEASE, sliderReleased, false, 0, true);
			m_cannonPanel.addChild(m_densitySlider7);
			format = new TextFormat();
			format.size = 9;
			m_densityArea7 = new GuiTextInput(35, 190, 50, format);
			m_densityArea7.text = "10";
			m_densityArea7.maxChars = 5;
			m_densityArea7.height = 15;
			m_densityArea7.addEventListener(MouseEvent.CLICK, densityFocus, false, 0, true);
			m_densityArea7.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_densityArea7.addEventListener(TextEvent.TEXT_INPUT, cont.textEntered, false, 0, true);
			m_densityArea7.addEventListener(FocusEvent.FOCUS_OUT, cont.densityText, false, 0, true);
			m_densityArea7.addEventListener(ComponentEvent.HIDE, cont.densityText, false, 0, true);
			m_cannonPanel.addChild(m_densityArea7);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 9;
			format.color = 0x242930;
			m_collisionBox7 = new GuiCheckBox();
			m_collisionBox7.setStyle("textFormat", format);
			m_collisionBox7.label = "Collides";
			m_collisionBox7.x = 5;
			m_collisionBox7.y = 210;
			m_collisionBox7.width = 120;
			m_collisionBox7.selected = true;
			m_collisionBox7.addEventListener(MouseEvent.CLICK, cont.collisionBox, false, 0, true);
			m_cannonPanel.addChild(m_collisionBox7);
			m_fixateBox7 = new GuiCheckBox();
			m_fixateBox7.setStyle("textFormat", format);
			m_fixateBox7.setStyle("disabledTextFormat", disabledFormat);
			m_fixateBox7.label = "Fixate";
			m_fixateBox7.x = 5;
			m_fixateBox7.y = 250;
			m_fixateBox7.width = 120;
			m_fixateBox7.selected = false;
			m_fixateBox7.addEventListener(MouseEvent.CLICK, cont.fixateBox, false, 0, true);
			m_cannonPanel.addChild(m_fixateBox7);
			m_colourButton = new GuiButton("Change Color", 5, 270, 110, 35, colourButton, GuiButton.BLUE);
			m_cannonPanel.addChild(m_colourButton);
			m_frontButton = new GuiButton("Move to Front", 5, 300, 110, 35, cont.frontButton, GuiButton.PINK);
			m_cannonPanel.addChild(m_frontButton);
			m_backButton = new GuiButton("Move to Back", 5, 330, 110, 35, cont.backButton, GuiButton.PINK);
			m_cannonPanel.addChild(m_backButton);
			m_outlineBox7 = new GuiCheckBox();
			m_outlineBox7.setStyle("textFormat", format);
			m_outlineBox7.setStyle("disabledTextFormat", disabledFormat);
			m_outlineBox7.label = "Show Outlines";
			m_outlineBox7.x = 5;
			m_outlineBox7.y = 365;
			m_outlineBox7.width = 120;
			m_outlineBox7.selected = false;
			m_outlineBox7.addEventListener(MouseEvent.CLICK, cont.outlineBox, false, 0, true);
			m_cannonPanel.addChild(m_outlineBox7);
			m_terrainBox7 = new GuiCheckBox();
			m_terrainBox7.setStyle("textFormat", format);
			m_terrainBox7.label = "Outlines Behind";
			m_terrainBox7.x = 5;
			m_terrainBox7.y = 385;
			m_terrainBox7.width = 120;
			m_terrainBox7.selected = false;
			m_terrainBox7.addEventListener(MouseEvent.CLICK, cont.terrainBox, false, 0, true);
			m_cannonPanel.addChild(m_terrainBox7);
			m_undragableBox7 = new GuiCheckBox();
			m_undragableBox7.setStyle("textFormat", format);
			m_undragableBox7.setStyle("disabledTextFormat", disabledFormat);
			m_undragableBox7.label = "Undraggable";
			m_undragableBox7.x = 5;
			m_undragableBox7.y = 230;
			m_undragableBox7.width = 120;
			m_undragableBox7.selected = false;
			m_undragableBox7.addEventListener(MouseEvent.CLICK, cont.undragableBox, false, 0, true);
			m_cannonPanel.addChild(m_undragableBox7);
			format = new TextFormat();
			format.size = 10;
			format.font = Main.GLOBAL_FONT;
			m_strengthLabel7 = new TextField();
			m_strengthLabel7.text = "Cannon Strength";
			m_strengthLabel7.setTextFormat(format);
			m_strengthLabel7.width = 120;
			m_strengthLabel7.height = 20;
			m_strengthLabel7.textColor = 0x242930;
			m_strengthLabel7.selectable = false;
			m_strengthLabel7.x = 21;
			m_strengthLabel7.y = 434;
			m_strengthLabel7.setTextFormat(format);
			m_cannonPanel.addChild(m_strengthLabel7);
			m_strengthSlider7 = new Slider();
			m_strengthSlider7.x = 20;
			m_strengthSlider7.y = 451;
			m_strengthSlider7.minimum = 1.0;
			m_strengthSlider7.maximum = 30.0;
			m_strengthSlider7.value = 15.0;
			m_strengthSlider7.addEventListener(SliderEvent.CHANGE, cont.cannonSlider, false, 0, true);
			m_strengthSlider7.addEventListener(SliderEvent.THUMB_PRESS, sliderClicked, false, 0, true);
			m_strengthSlider7.addEventListener(SliderEvent.THUMB_RELEASE, sliderReleased, false, 0, true);
			m_strengthSlider7.setStyle("sliderTrackSkin", MainEditPanel.sliderGroove());
			m_strengthSlider7.setStyle("sliderTrackDisabledSkin", MainEditPanel.sliderGrooveDisabled());
			m_cannonPanel.addChild(m_strengthSlider7);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 10;
			m_strengthArea7 = new GuiTextInput(35, 468, 50, format);
			m_strengthArea7.text = "15";
			m_strengthArea7.maxChars = 5;
			m_strengthArea7.height = 15;
			m_strengthArea7.addEventListener(MouseEvent.CLICK, cannonFocus, false, 0, true);
			m_strengthArea7.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_strengthArea7.addEventListener(TextEvent.TEXT_INPUT, cont.textEntered, false, 0, true);
			m_strengthArea7.addEventListener(FocusEvent.FOCUS_OUT, cont.cannonText, false, 0, true);
			m_strengthArea7.addEventListener(ComponentEvent.HIDE, cont.cannonText, false, 0, true);
			m_cannonPanel.addChild(m_strengthArea7);
			m_fireKeyArea = new GuiTextInput(60, 412, 37, format);
			m_fireKeyArea.height = 15;
			m_fireKeyArea.editable = false;
			m_fireKeyArea.addEventListener(MouseEvent.CLICK, cannonKeyFocus, false, 0, true);
			m_fireKeyArea.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_fireKeyArea.addEventListener(KeyboardEvent.KEY_DOWN, cont.fireKeyText, false, 0, true);
			m_fireKeyArea.addEventListener(FocusEvent.FOCUS_OUT, TextAreaLostFocus, false, 0, true);
			m_fireKeyArea.addEventListener(ComponentEvent.HIDE, TextAreaLostFocus, false, 0, true);
			m_cannonPanel.addChild(m_fireKeyArea);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			format.align = TextFormatAlign.RIGHT;
			m_fireKeyLabel = new TextField();
			m_fireKeyLabel.text = "Fire:";
			m_fireKeyLabel.width = 50;
			m_fireKeyLabel.height = 20;
			m_fireKeyLabel.textColor = 0x242930;
			m_fireKeyLabel.selectable = false;
			m_fireKeyLabel.x = 2;
			m_fireKeyLabel.y = 411;
			m_fireKeyLabel.setTextFormat(format);
			m_cannonPanel.addChild(m_fireKeyLabel);
			
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.align = TextFormatAlign.CENTER;
			format.size = 14;
			m_jointHeader = new TextField();
			m_jointHeader.text = "Multiple Objects";
			m_jointHeader.width = 110;
			m_jointHeader.height = 20;
			m_jointHeader.textColor = 0x242930;
			m_jointHeader.selectable = false;
			m_jointHeader.x = 5;
			m_jointHeader.y = 15;
			m_jointHeader.setTextFormat(format);
			m_multiEditPanel.addChild(m_jointHeader);
			m_backButton = new GuiButton("X", 90, -5, 35, 35, backButton, GuiButton.X);
			m_multiEditPanel.addChild(m_backButton);
			m_deleteButton = new GuiButton("Delete", 10, 30, 100, 35, cont.multiDeleteButton, GuiButton.ORANGE);
			m_multiEditPanel.addChild(m_deleteButton);
			m_cutButton = new GuiButton("Cut", 10, 60, 100, 35, cont.cutButton, GuiButton.ORANGE);
			m_multiEditPanel.addChild(m_cutButton);
			m_copyButton = new GuiButton("Copy", 10, 90, 100, 35, cont.copyButton, GuiButton.ORANGE);
			m_multiEditPanel.addChild(m_copyButton);
			m_pasteButton = new GuiButton("Paste", 10, 120, 100, 35, cont.pasteButton, GuiButton.ORANGE);
			m_multiEditPanel.addChild(m_pasteButton);
			m_rotateButton = new GuiButton("Rotate", 10, 150, 100, 35, cont.rotateButton, GuiButton.BLUE);
			m_multiEditPanel.addChild(m_rotateButton);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 9;
			format.color = 0x242930;
			m_outlineBox3 = new GuiCheckBox();
			m_outlineBox3.setStyle("textFormat", format);
			m_outlineBox3.label = "Show Outlines";
			m_outlineBox3.x = 5;
			m_outlineBox3.y = 300;
			m_outlineBox3.width = 120;
			m_outlineBox3.selected = true;
			m_outlineBox3.addEventListener(MouseEvent.CLICK, cont.outlineBox, false, 0, true);
			m_multiEditPanel.addChild(m_outlineBox3);
			m_terrainBox3 = new GuiCheckBox();
			m_terrainBox3.setStyle("textFormat", format);
			m_terrainBox3.label = "Outlines Behind";
			m_terrainBox3.x = 5;
			m_terrainBox3.y = 320;
			m_terrainBox3.width = 120;
			m_terrainBox3.selected = false;
			m_terrainBox3.addEventListener(MouseEvent.CLICK, cont.terrainBox, false, 0, true);
			m_multiEditPanel.addChild(m_terrainBox3);
			m_colourButton = new GuiButton("Change Color", 5, 260, 110, 35, colourButton, GuiButton.BLUE);
			m_multiEditPanel.addChild(m_colourButton);
			m_collisionBox2 = new GuiCheckBox();
			m_collisionBox2.setStyle("textFormat", format);
			m_collisionBox2.setStyle("disabledTextFormat", disabledFormat);
			m_collisionBox2.label = "Collides";
			m_collisionBox2.x = 5;
			m_collisionBox2.y = 190;
			m_collisionBox2.width = 120;
			m_collisionBox2.selected = false;
			m_collisionBox2.addEventListener(MouseEvent.CLICK, cont.collisionBox, false, 0, true);
			m_multiEditPanel.addChild(m_collisionBox2);
			m_fixateBox2 = new GuiCheckBox();
			m_fixateBox2.setStyle("textFormat", format);
			m_fixateBox2.setStyle("disabledTextFormat", disabledFormat);
			m_fixateBox2.label = "Fixate";
			m_fixateBox2.x = 5;
			m_fixateBox2.y = 230;
			m_fixateBox2.width = 120;
			m_fixateBox2.selected = false;
			m_fixateBox2.addEventListener(MouseEvent.CLICK, cont.fixateBox, false, 0, true);
			m_multiEditPanel.addChild(m_fixateBox2);
			m_undragableBox2 = new GuiCheckBox();
			m_undragableBox2.setStyle("textFormat", format);
			m_undragableBox2.setStyle("disabledTextFormat", disabledFormat);
			m_undragableBox2.label = "Undraggable";
			m_undragableBox2.x = 5;
			m_undragableBox2.y = 210;
			m_undragableBox2.width = 120;
			m_undragableBox2.selected = false;
			m_undragableBox2.addEventListener(MouseEvent.CLICK, cont.undragableBox, false, 0, true);
			m_multiEditPanel.addChild(m_undragableBox2);
			
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.align = TextFormatAlign.CENTER;
			format.size = 14;
			m_jointHeader = new TextField();
			m_jointHeader.text = "Text";
			m_jointHeader.width = 110;
			m_jointHeader.height = 20;
			m_jointHeader.textColor = 0x242930;
			m_jointHeader.selectable = false;
			m_jointHeader.x = 5;
			m_jointHeader.y = 15;
			m_jointHeader.setTextFormat(format);
			m_textEditPanel.addChild(m_jointHeader);
			m_backButton = new GuiButton("X", 90, -5, 35, 35, backButton, GuiButton.X);
			m_textEditPanel.addChild(m_backButton);
			m_deleteButton = new GuiButton("Delete", 10, 30, 100, 35, cont.deleteButton, GuiButton.ORANGE);
			m_textEditPanel.addChild(m_deleteButton);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			m_textLabel = new TextField();
			m_textLabel.text = "Text:";
			m_textLabel.width = 55;
			m_textLabel.height = 20;
			m_textLabel.textColor = 0x242930;
			m_textLabel.selectable = false;
			m_textLabel.x = 45;
			m_textLabel.y = 68;
			m_textLabel.setTextFormat(format);
			m_textEditPanel.addChild(m_textLabel);
			m_textArea = new GuiTextArea(15, 85, 90, 70);
			m_textArea.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_textArea.addEventListener(FocusEvent.FOCUS_IN, cont.textTextStart, false, 0, true);
			m_textArea.addEventListener(Event.CHANGE, cont.textText, false, 0, true);
			m_textArea.addEventListener(FocusEvent.FOCUS_OUT, cont.textTextFinish, false, 0, true);
			m_textArea.addEventListener(FocusEvent.FOCUS_OUT, TextAreaLostFocus, false, 0, true);
			m_textArea.addEventListener(ComponentEvent.HIDE, TextAreaLostFocus, false, 0, true);
			m_textEditPanel.addChild(m_textArea);
			m_sizeLabel = new TextField();
			m_sizeLabel.text = "Text Size:";
			m_sizeLabel.width = 55;
			m_sizeLabel.height = 20;
			m_sizeLabel.textColor = 0x242930;
			m_sizeLabel.selectable = false;
			m_sizeLabel.x = 15;
			m_sizeLabel.y = 170;
			m_sizeLabel.setTextFormat(format);
			m_textEditPanel.addChild(m_sizeLabel);
			format = new TextFormat();
			format.size = 9;
			m_sizeArea = new GuiTextInput(72, 170, 30, format);
			m_sizeArea.text = "12";
			m_sizeArea.maxChars = 4;
			m_sizeArea.height = 15;
			m_sizeArea.addEventListener(MouseEvent.CLICK, sizeFocus, false, 0, true);
			m_sizeArea.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_sizeArea.addEventListener(TextEvent.TEXT_INPUT, cont.textEntered, false, 0, true);
			m_sizeArea.addEventListener(FocusEvent.FOCUS_OUT, cont.sizeText, false, 0, true);
			m_sizeArea.addEventListener(ComponentEvent.HIDE, cont.sizeText, false, 0, true);
			m_textEditPanel.addChild(m_sizeArea);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 9;
			format.color = 0x242930;
			m_scaleWithZoomBox = new GuiCheckBox();
			m_scaleWithZoomBox.setStyle("textFormat", format);
			m_scaleWithZoomBox.label = "Scale with Zoom";
			m_scaleWithZoomBox.x = 2;
			m_scaleWithZoomBox.y = 195;
			m_scaleWithZoomBox.width = 120;
			m_scaleWithZoomBox.selected = true;
			m_scaleWithZoomBox.addEventListener(MouseEvent.CLICK, cont.scaleWithZoomBox, false, 0, true);
			m_textEditPanel.addChild(m_scaleWithZoomBox);
			m_alwaysVisibleBox = new GuiCheckBox();
			m_alwaysVisibleBox.setStyle("textFormat", format);
			m_alwaysVisibleBox.label = "Always Display";
			m_alwaysVisibleBox.x = 2;
			m_alwaysVisibleBox.y = 215;
			m_alwaysVisibleBox.width = 120;
			m_alwaysVisibleBox.selected = false;
			m_alwaysVisibleBox.addEventListener(MouseEvent.CLICK, cont.alwaysVisibleBox, false, 0, true);
			m_textEditPanel.addChild(m_alwaysVisibleBox);
			m_colourButton = new GuiButton("Change Color", 5, 290, 110, 35, colourButton, GuiButton.BLUE);
			m_textEditPanel.addChild(m_colourButton);
			m_frontButton = new GuiButton("Move to Front", 5, 320, 110, 35, cont.frontButton, GuiButton.PINK);
			m_textEditPanel.addChild(m_frontButton);
			m_backButton = new GuiButton("Move to Back", 5, 350, 110, 35, cont.backButton, GuiButton.PINK);
			m_textEditPanel.addChild(m_backButton);
			format = new TextFormat();
			format.size = 9;
			m_textKeyArea = new GuiTextInput(45, 268, 30, format);
			m_textKeyArea.height = 15;
			m_textKeyArea.editable = false;
			m_textKeyArea.addEventListener(MouseEvent.CLICK, controlKey1Focus, false, 0, true);
			m_textKeyArea.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_textKeyArea.addEventListener(KeyboardEvent.KEY_DOWN, cont.textKeyBox, false, 0, true);
			m_textKeyArea.addEventListener(FocusEvent.FOCUS_OUT, TextAreaLostFocus, false, 0, true);
			m_textKeyArea.addEventListener(ComponentEvent.HIDE, TextAreaLostFocus, false, 0, true);
			m_textEditPanel.addChild(m_textKeyArea);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 10;
			m_textKeyLabel = new TextField();
			m_textKeyLabel.text = "Display Text Key:";
			m_textKeyLabel.width = 90;
			m_textKeyLabel.height = 20;
			m_textKeyLabel.textColor = 0x242930;
			m_textKeyLabel.selectable = false;
			m_textKeyLabel.x = 18;
			m_textKeyLabel.y = 250;
			m_textKeyLabel.setTextFormat(format);
			m_textEditPanel.addChild(m_textKeyLabel);
			
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.align = TextFormatAlign.CENTER;
			format.size = 14;
			m_jointHeader = new TextField();
			m_jointHeader.text = "Fixed Joint";
			m_jointHeader.width = 110;
			m_jointHeader.height = 20;
			m_jointHeader.textColor = 0x242930;
			m_jointHeader.selectable = false;
			m_jointHeader.x = 5;
			m_jointHeader.y = 15;
			m_jointHeader.setTextFormat(format);
			m_fixedJointPanel.addChild(m_jointHeader);
			m_backButton = new GuiButton("X", 90, -5, 35, 35, backButton, GuiButton.X);
			m_fixedJointPanel.addChild(m_backButton);
			m_deleteButton = new GuiButton("Delete", 10, 30, 100, 35, cont.deleteButton, GuiButton.ORANGE);
			m_fixedJointPanel.addChild(m_deleteButton);
			
			m_jointHeader = new TextField();
			m_jointHeader.text = "Build Box";
			m_jointHeader.width = 110;
			m_jointHeader.height = 20;
			m_jointHeader.textColor = 0x242930;
			m_jointHeader.selectable = false;
			m_jointHeader.x = 5;
			m_jointHeader.y = 15;
			m_jointHeader.setTextFormat(format);
			m_buildBoxPanel.addChild(m_jointHeader);
			m_backButton = new GuiButton("X", 90, -5, 35, 35, backButton, GuiButton.X);
			m_buildBoxPanel.addChild(m_backButton);
			m_deleteButton = new GuiButton("Delete", 10, 30, 100, 35, cont.deleteBuildBoxButton, GuiButton.ORANGE);
			m_buildBoxPanel.addChild(m_deleteButton);
			
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.align = TextFormatAlign.CENTER;
			format.size = 14;
			m_thrustersHeader = new TextField();
			m_thrustersHeader.text = "Thrusters";
			m_thrustersHeader.width = 110;
			m_thrustersHeader.height = 20;
			m_thrustersHeader.textColor = 0x242930;
			m_thrustersHeader.selectable = false;
			m_thrustersHeader.x = 5;
			m_thrustersHeader.y = 15;
			m_thrustersHeader.setTextFormat(format);
			m_thrustersEditPanel.addChild(m_thrustersHeader);
			m_backButton = new GuiButton("X", 90, -5, 35, 35, backButton, GuiButton.X);
			m_thrustersEditPanel.addChild(m_backButton);
			m_deleteButton = new GuiButton("Delete", 10, 30, 100, 35, cont.deleteButton, GuiButton.ORANGE);
			m_thrustersEditPanel.addChild(m_deleteButton);
			m_cutButton = new GuiButton("Cut", 10, 60, 100, 35, cont.cutButton, GuiButton.ORANGE);
			m_thrustersEditPanel.addChild(m_cutButton);
			m_copyButton = new GuiButton("Copy", 10, 90, 100, 35, cont.copyButton, GuiButton.ORANGE);
			m_thrustersEditPanel.addChild(m_copyButton);
			m_pasteButton = new GuiButton("Paste", 10, 120, 100, 35, cont.pasteButton, GuiButton.ORANGE);
			m_thrustersEditPanel.addChild(m_pasteButton);
			m_rotateButton = new GuiButton("Rotate", 10, 150, 100, 35, cont.rotateButton, GuiButton.BLUE);
			m_thrustersEditPanel.addChild(m_rotateButton);
			format = new TextFormat();
			format.size = 10;
			format.font = Main.GLOBAL_FONT;
			m_thrustLabel = new TextField();
			m_thrustLabel.text = "Thruster Strength";
			m_thrustLabel.setTextFormat(format);
			m_thrustLabel.width = 120;
			m_thrustLabel.height = 20;
			m_thrustLabel.textColor = 0x242930;
			m_thrustLabel.selectable = false;
			m_thrustLabel.x = 21;
			m_thrustLabel.y = 190;
			m_thrustLabel.setTextFormat(format);
			m_thrustersEditPanel.addChild(m_thrustLabel);
			m_thrustSlider = new Slider();
			m_thrustSlider.x = 20;
			m_thrustSlider.y = 207;
			m_thrustSlider.minimum = 1.0;
			m_thrustSlider.maximum = 30.0;
			m_thrustSlider.value = 15.0;
			m_thrustSlider.addEventListener(SliderEvent.CHANGE, cont.thrustSlider, false, 0, true);
			m_thrustSlider.addEventListener(SliderEvent.THUMB_PRESS, sliderClicked, false, 0, true);
			m_thrustSlider.addEventListener(SliderEvent.THUMB_RELEASE, sliderReleased, false, 0, true);
			m_thrustSlider.setStyle("sliderTrackSkin", MainEditPanel.sliderGroove());
			m_thrustSlider.setStyle("sliderTrackDisabledSkin", MainEditPanel.sliderGrooveDisabled());
			m_thrustersEditPanel.addChild(m_thrustSlider);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 10;
			m_thrustArea = new GuiTextInput(35, 224, 50, format);
			m_thrustArea.text = "10";
			m_thrustArea.maxChars = 5;
			m_thrustArea.height = 15;
			m_thrustArea.addEventListener(MouseEvent.CLICK, thrustFocus, false, 0, true);
			m_thrustArea.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_thrustArea.addEventListener(TextEvent.TEXT_INPUT, cont.textEntered, false, 0, true);
			m_thrustArea.addEventListener(FocusEvent.FOCUS_OUT, cont.thrustText, false, 0, true);
			m_thrustArea.addEventListener(ComponentEvent.HIDE, cont.thrustText, false, 0, true);
			m_thrustersEditPanel.addChild(m_thrustArea);
			m_thrustKeyArea = new GuiTextInput(65, 259, 37, format);
			m_thrustKeyArea.height = 15;
			m_thrustKeyArea.editable = false;
			m_thrustKeyArea.addEventListener(MouseEvent.CLICK, thrustKeyFocus, false, 0, true);
			m_thrustKeyArea.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_thrustKeyArea.addEventListener(KeyboardEvent.KEY_DOWN, cont.thrustKeyText, false, 0, true);
			m_thrustKeyArea.addEventListener(FocusEvent.FOCUS_OUT, TextAreaLostFocus, false, 0, true);
			m_thrustKeyArea.addEventListener(ComponentEvent.HIDE, TextAreaLostFocus, false, 0, true);
			m_thrustersEditPanel.addChild(m_thrustKeyArea);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			format.align = TextFormatAlign.RIGHT;
			m_thrustKeyLabel = new TextField();
			m_thrustKeyLabel.text = "Activate:";
			m_thrustKeyLabel.width = 55;
			m_thrustKeyLabel.height = 20;
			m_thrustKeyLabel.textColor = 0x242930;
			m_thrustKeyLabel.selectable = false;
			m_thrustKeyLabel.x = 7;
			m_thrustKeyLabel.y = 258;
			m_thrustKeyLabel.setTextFormat(format);
			m_thrustersEditPanel.addChild(m_thrustKeyLabel);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 10;
			format.color = 0x242930;
			m_autoBox3 = new GuiCheckBox();
			m_autoBox3.setStyle("textFormat", format);
			m_autoBox3.setStyle("disabledTextFormat", format);
			m_autoBox3.label = "Auto-On";
			m_autoBox3.x = 5;
			m_autoBox3.y = 290;
			m_autoBox3.width = 120;
			m_autoBox3.selected = false;
			m_autoBox3.addEventListener(MouseEvent.CLICK, cont.autoBox1, false, 0, true);
			m_thrustersEditPanel.addChild(m_autoBox3);
			
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.align = TextFormatAlign.CENTER;
			format.size = 14;
			m_jointHeader = new TextField();
			m_jointHeader.text = "Rotating Joint";
			m_jointHeader.width = 110;
			m_jointHeader.height = 20;
			m_jointHeader.textColor = 0x242930;
			m_jointHeader.selectable = false;
			m_jointHeader.x = 5;
			m_jointHeader.y = 15;
			m_jointHeader.setTextFormat(format);
			m_jointEditPanel.addChild(m_jointHeader);
			m_backButton = new GuiButton("X", 90, -5, 35, 35, backButton, GuiButton.X);
			m_jointEditPanel.addChild(m_backButton);
			m_deleteButton = new GuiButton("Delete", 10, 30, 100, 35, cont.deleteButton, GuiButton.ORANGE);
			m_jointEditPanel.addChild(m_deleteButton);
			m_cutButton = new GuiButton("Cut", 10, 60, 100, 35, cont.cutButton, GuiButton.ORANGE);
			m_jointEditPanel.addChild(m_cutButton);
			m_copyButton = new GuiButton("Copy", 10, 90, 100, 35, cont.copyButton, GuiButton.ORANGE);
			m_jointEditPanel.addChild(m_copyButton);
			m_pasteButton = new GuiButton("Paste", 10, 120, 100, 35, cont.pasteButton, GuiButton.ORANGE);
			m_jointEditPanel.addChild(m_pasteButton);
			format = new TextFormat();
			format.size = 9;
			m_minDispArea = new GuiTextInput(42, 409, 30, format);
			m_minDispArea.text = "None";
			m_minDispArea.maxChars = 4;
			m_minDispArea.height = 15;
			m_minDispArea.addEventListener(MouseEvent.CLICK, minDispFocus, false, 0, true);
			m_minDispArea.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_minDispArea.addEventListener(TextEvent.TEXT_INPUT, cont.textEntered, false, 0, true);
			m_minDispArea.addEventListener(FocusEvent.FOCUS_OUT, cont.minLimitText, false, 0, true);
			m_minDispArea.addEventListener(ComponentEvent.HIDE, cont.minLimitText, false, 0, true);
			m_jointEditPanel.addChild(m_minDispArea);
			m_maxDispArea = new GuiTextInput(42, 444, 30, format);
			m_maxDispArea.text = "None";
			m_maxDispArea.maxChars = 4;
			m_maxDispArea.height = 15;
			m_maxDispArea.addEventListener(MouseEvent.CLICK, maxDispFocus, false, 0, true);
			m_maxDispArea.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_maxDispArea.addEventListener(TextEvent.TEXT_INPUT, cont.textEntered, false, 0, true);
			m_maxDispArea.addEventListener(FocusEvent.FOCUS_OUT, cont.maxLimitText, false, 0, true);
			m_maxDispArea.addEventListener(ComponentEvent.HIDE, cont.maxLimitText, false, 0, true);
			m_jointEditPanel.addChild(m_maxDispArea);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 9;
			format.color = 0x242930;
			m_enableMotorBox = new GuiCheckBox();
			m_enableMotorBox.setStyle("textFormat", format);
			m_enableMotorBox.label = "Enable Motor";
			m_enableMotorBox.x = 5;
			m_enableMotorBox.y = 152;
			m_enableMotorBox.width = 120;
			m_enableMotorBox.selected = false;
			m_enableMotorBox.addEventListener(MouseEvent.CLICK, cont.motorBox, false, 0, true);
			m_jointEditPanel.addChild(m_enableMotorBox);
			m_rigidJointBox = new GuiCheckBox();
			m_rigidJointBox.setStyle("textFormat", format);
			m_rigidJointBox.setStyle("disabledTextFormat", disabledFormat);
			m_rigidJointBox.label = "Floppy Joint";
			m_rigidJointBox.x = 5;
			m_rigidJointBox.y = 284;
			m_rigidJointBox.width = 120;
			m_rigidJointBox.selected = true;
			m_rigidJointBox.addEventListener(MouseEvent.CLICK, cont.rigidBox, false, 0, true);
			m_jointEditPanel.addChild(m_rigidJointBox);
			m_autoBox1 = new GuiCheckBox();
			m_autoBox1.setStyle("textFormat", format);
			m_autoBox1.setStyle("disabledTextFormat", disabledFormat);
			m_autoBox1.label = "Auto-On CW";
			m_autoBox1.x = 5;
			m_autoBox1.y = 347;
			m_autoBox1.width = 120;
			m_autoBox1.selected = false;
			m_autoBox1.addEventListener(MouseEvent.CLICK, cont.autoBox1, false, 0, true);
			m_jointEditPanel.addChild(m_autoBox1);
			m_autoBox2 = new GuiCheckBox();
			m_autoBox2.setStyle("textFormat", format);
			m_autoBox2.setStyle("disabledTextFormat", disabledFormat);
			m_autoBox2.label = "Auto-On CCW";
			m_autoBox2.x = 5;
			m_autoBox2.y = 367;
			m_autoBox2.width = 120;
			m_autoBox2.selected = false;
			m_autoBox2.addEventListener(MouseEvent.CLICK, cont.autoBox2, false, 0, true);
			m_jointEditPanel.addChild(m_autoBox2);
			m_outlineBox2 = new GuiCheckBox();
			m_outlineBox2.setStyle("textFormat", format);
			m_outlineBox2.label = "Show Outlines";
			m_outlineBox2.x = 5;
			m_outlineBox2.y = 472;
			m_outlineBox2.width = 120;
			m_outlineBox2.selected = false;
			m_outlineBox2.addEventListener(MouseEvent.CLICK, cont.outlineBox, false, 0, true);
			m_jointEditPanel.addChild(m_outlineBox2);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			m_strengthLabel = new TextField();
			m_strengthLabel.text = "Motor Strength";
			m_strengthLabel.setTextFormat(format);
			m_strengthLabel.width = 120;
			m_strengthLabel.height = 20;
			m_strengthLabel.textColor = 0x242930;
			m_strengthLabel.selectable = false;
			m_strengthLabel.x = 28;
			m_strengthLabel.y = 177;
			m_strengthLabel.setTextFormat(format);
			m_jointEditPanel.addChild(m_strengthLabel);
			m_speedLabel = new TextField();
			m_speedLabel.text = "Motor Speed";
			m_speedLabel.setTextFormat(format);
			m_speedLabel.width = 120;
			m_speedLabel.height = 20;
			m_speedLabel.textColor = 0x242930;
			m_speedLabel.selectable = false;
			m_speedLabel.x = 32;
			m_speedLabel.y = 232;
			m_speedLabel.setTextFormat(format);
			m_jointEditPanel.addChild(m_speedLabel);
			m_strengthSlider = new Slider();
			m_strengthSlider.x = 20;
			m_strengthSlider.y = 192;
			m_strengthSlider.minimum = 1.0;
			m_strengthSlider.maximum = 30.0;
			m_strengthSlider.value = 15.0;
			m_strengthSlider.addEventListener(SliderEvent.CHANGE, cont.strengthSlider, false, 0, true);
			m_strengthSlider.addEventListener(SliderEvent.THUMB_PRESS, sliderClicked, false, 0, true);
			m_strengthSlider.addEventListener(SliderEvent.THUMB_RELEASE, sliderReleased, false, 0, true);
			m_strengthSlider.setStyle("sliderTrackSkin", MainEditPanel.sliderGroove());
			m_strengthSlider.setStyle("sliderTrackDisabledSkin", MainEditPanel.sliderGrooveDisabled());
			m_jointEditPanel.addChild(m_strengthSlider);
			m_speedSlider = new Slider();
			m_speedSlider.x = 20;
			m_speedSlider.y = 247;
			m_speedSlider.minimum = 1.0;
			m_speedSlider.maximum = 30.0;
			m_speedSlider.value = 15.0;
			m_speedSlider.addEventListener(SliderEvent.CHANGE, cont.speedSlider, false, 0, true);
			m_speedSlider.addEventListener(SliderEvent.THUMB_PRESS, sliderClicked, false, 0, true);
			m_speedSlider.addEventListener(SliderEvent.THUMB_RELEASE, sliderReleased, false, 0, true);
			m_speedSlider.setStyle("sliderTrackSkin", MainEditPanel.sliderGroove());
			m_speedSlider.setStyle("sliderTrackDisabledSkin", MainEditPanel.sliderGrooveDisabled());
			m_jointEditPanel.addChild(m_speedSlider);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 9;
			m_strengthArea = new GuiTextInput(35, 209, 50, format);
			m_strengthArea.text = "10";
			m_strengthArea.maxChars = 5;
			m_strengthArea.height = 15;
			m_strengthArea.addEventListener(MouseEvent.CLICK, strengthFocus, false, 0, true);
			m_strengthArea.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_strengthArea.addEventListener(TextEvent.TEXT_INPUT, cont.textEntered, false, 0, true);
			m_strengthArea.addEventListener(FocusEvent.FOCUS_OUT, cont.strengthText, false, 0, true);
			m_strengthArea.addEventListener(ComponentEvent.HIDE, cont.strengthText, false, 0, true);
			m_jointEditPanel.addChild(m_strengthArea);
			m_speedArea = new GuiTextInput(35, 264, 50, format);
			m_speedArea.text = "10";
			m_speedArea.maxChars = 5;
			m_speedArea.height = 15;
			m_speedArea.addEventListener(MouseEvent.CLICK, speedFocus, false, 0, true);
			m_speedArea.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_speedArea.addEventListener(TextEvent.TEXT_INPUT, cont.textEntered, false, 0, true);
			m_speedArea.addEventListener(FocusEvent.FOCUS_OUT, cont.speedText, false, 0, true);
			m_speedArea.addEventListener(ComponentEvent.HIDE, cont.speedText, false, 0, true);
			m_jointEditPanel.addChild(m_speedArea);
			m_controlKeyArea1 = new GuiTextInput(70, 306, 30, format);
			m_controlKeyArea1.height = 15;
			m_controlKeyArea1.editable = false;
			m_controlKeyArea1.addEventListener(MouseEvent.CLICK, controlKey1Focus, false, 0, true);
			m_controlKeyArea1.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_controlKeyArea1.addEventListener(KeyboardEvent.KEY_DOWN, cont.controlKeyText1, false, 0, true);
			m_controlKeyArea1.addEventListener(FocusEvent.FOCUS_OUT, TextAreaLostFocus, false, 0, true);
			m_controlKeyArea1.addEventListener(ComponentEvent.HIDE, TextAreaLostFocus, false, 0, true);
			m_jointEditPanel.addChild(m_controlKeyArea1);
			m_controlKeyArea2 = new GuiTextInput(70, 326, 30, format);
			m_controlKeyArea2.height = 15;
			m_controlKeyArea2.editable = false;
			m_controlKeyArea2.addEventListener(MouseEvent.CLICK, controlKey2Focus, false, 0, true);
			m_controlKeyArea2.addEventListener(FocusEvent.FOCUS_IN, TextAreaGotFocus, false, 0, true);
			m_controlKeyArea2.addEventListener(KeyboardEvent.KEY_DOWN, cont.controlKeyText2, false, 0, true);
			m_controlKeyArea2.addEventListener(FocusEvent.FOCUS_OUT, TextAreaLostFocus, false, 0, true);
			m_controlKeyArea2.addEventListener(ComponentEvent.HIDE, TextAreaLostFocus, false, 0, true);
			m_jointEditPanel.addChild(m_controlKeyArea2);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			m_limitLabel1 = new TextField();
			m_limitLabel1.text = "Lower Limit (degrees)";
			m_limitLabel1.width = 95;
			m_limitLabel1.height = 15;
			m_limitLabel1.textColor = 0x242930;
			m_limitLabel1.selectable = false;
			m_limitLabel1.x = 15;
			m_limitLabel1.y = 395;
			m_limitLabel1.setTextFormat(format);
			m_jointEditPanel.addChild(m_limitLabel1);
			m_limitLabel2 = new TextField();
			m_limitLabel2.text = "Upper Limit (degrees)";
			m_limitLabel2.width = 95;
			m_limitLabel2.height = 15;
			m_limitLabel2.textColor = 0x242930;
			m_limitLabel2.selectable = false;
			m_limitLabel2.x = 15;
			m_limitLabel2.y = 430;
			m_limitLabel2.setTextFormat(format);
			m_jointEditPanel.addChild(m_limitLabel2);
			m_inputLabel1 = new TextField();
			m_inputLabel1.text = "Rotate CW:";
			m_inputLabel1.width = 62;
			m_inputLabel1.height = 20;
			m_inputLabel1.textColor = 0x242930;
			m_inputLabel1.selectable = false;
			m_inputLabel1.x = 10;
			m_inputLabel1.y = 307;
			m_inputLabel1.setTextFormat(format);
			m_jointEditPanel.addChild(m_inputLabel1);
			m_inputLabel2 = new TextField();
			m_inputLabel2.text = "Rotate CCW:";
			m_inputLabel2.width = 62;
			m_inputLabel2.height = 20;
			m_inputLabel2.textColor = 0x242930;
			m_inputLabel2.selectable = false;
			m_inputLabel2.x = 10;
			m_inputLabel2.y = 327;
			m_inputLabel2.setTextFormat(format);
			m_jointEditPanel.addChild(m_inputLabel2);
			m_colourButton = new GuiButton("Change Color", 5, 382, 110, 35, colourButton, GuiButton.BLUE);
			m_jointEditPanel.addChild(m_colourButton);
			m_frontButton = new GuiButton("Move to Front", 5, 412, 110, 35, cont.frontButton, GuiButton.PINK);
			m_jointEditPanel.addChild(m_frontButton);
			m_backButton = new GuiButton("Move to Back", 5, 442, 110, 35, cont.backButton, GuiButton.PINK);
			m_jointEditPanel.addChild(m_backButton);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 9;
			format.color = 0x242930;
			m_collisionBox3 = new GuiCheckBox();
			m_collisionBox3.setStyle("textFormat", format);
			m_collisionBox3.setStyle("disabledTextFormat", disabledFormat);
			m_collisionBox3.label = "Collides";
			m_collisionBox3.x = 5;
			m_collisionBox3.y = 367;
			m_collisionBox3.width = 120;
			m_collisionBox3.selected = true;
			m_collisionBox3.addEventListener(MouseEvent.CLICK, cont.collisionBox, false, 0, true);
			m_jointEditPanel.addChild(m_collisionBox3);
		}
		
		public function backButton(e:MouseEvent):void {
			visible = false;
		}
		
		private function colourButton(e:MouseEvent):void {
			m_colourWindow.visible = true;
			m_colourWindow.SetVals();
		}
		
		public function DisableStuffForShapesLevel():void {
			m_densitySlider.enabled = false;
			m_densityArea.enabled = false;
			m_densityArea.focusEnabled = false;
			m_densityArea.editable = false;
			m_collisionBox.enabled = false;
			m_cameraBox.enabled = false;
			m_undragableBox.enabled = false;
			m_collisionBox2.enabled = false;
			m_collisionBox3.enabled = false;
			m_undragableBox2.enabled = false;
		}
		
		public function DisableStuffForCarLevel():void {
			m_densitySlider.enabled = false;
			m_densityArea.enabled = false;
			m_densityArea.focusEnabled = false;
			m_densityArea.editable = false;
			m_collisionBox.enabled = false;
			m_cameraBox.enabled = false;
			m_undragableBox.enabled = false;
			m_collisionBox2.enabled = false;
			m_collisionBox3.enabled = false;
			m_undragableBox2.enabled = false;
			
			m_minDispArea.enabled = false;
			m_minDispArea.focusEnabled = false;
			m_minDispArea.editable = false;
			m_maxDispArea.enabled = false;
			m_maxDispArea.focusEnabled = false;
			m_maxDispArea.editable = false;
			m_rigidJointBox.enabled = false;
			m_autoBox1.enabled = false;
			m_autoBox2.enabled = false;
			m_controlKeyArea1.enabled = false;
			m_controlKeyArea1.focusEnabled = false;
			m_controlKeyArea1.editable = false;
			m_controlKeyArea2.enabled = false;
			m_controlKeyArea2.focusEnabled = false;
			m_controlKeyArea2.editable = false;
			m_speedSlider.enabled = false;
			m_strengthSlider.enabled = false;
			m_speedArea.enabled = false;
			m_speedArea.focusEnabled = false;
			m_speedArea.editable = false;
			m_strengthArea.enabled = false;
			m_strengthArea.focusEnabled = false;
			m_strengthArea.editable = false;
		}
		
		public function DisableStuffForJumpbotLevel():void {
			m_collisionBox.enabled = false;
			m_cameraBox.enabled = false;
			m_undragableBox.enabled = false;
			m_collisionBox2.enabled = false;
			m_collisionBox3.enabled = false;
			m_undragableBox2.enabled = false;
			
			m_minDispArea.enabled = false;
			m_minDispArea.focusEnabled = false;
			m_minDispArea.editable = false;
			m_maxDispArea.enabled = false;
			m_maxDispArea.focusEnabled = false;
			m_maxDispArea.editable = false;
			m_rigidJointBox.enabled = false;
			m_autoBox1.enabled = false;
			m_autoBox2.enabled = false;
			m_controlKeyArea1.enabled = false;
			m_controlKeyArea1.focusEnabled = false;
			m_controlKeyArea1.editable = false;
			m_controlKeyArea2.enabled = false;
			m_controlKeyArea2.focusEnabled = false;
			m_controlKeyArea2.editable = false;
		}
		
		public function DisableStuffForDumpbotLevel():void {
			m_collisionBox.enabled = false;
			m_cameraBox.enabled = false;
			m_undragableBox.enabled = false;
			m_collisionBox2.enabled = false;
			m_collisionBox3.enabled = false;
			m_undragableBox2.enabled = false;
			
			m_minDispArea.enabled = false;
			m_minDispArea.focusEnabled = false;
			m_minDispArea.editable = false;
			m_maxDispArea.enabled = false;
			m_maxDispArea.focusEnabled = false;
			m_maxDispArea.editable = false;
			m_autoBox1.enabled = false;
			m_autoBox2.enabled = false;
		}
		
		public function DisableStuffForCatapultLevel():void {
			m_collisionBox.enabled = false;
			m_undragableBox.enabled = false;
			m_collisionBox2.enabled = false;
			m_collisionBox3.enabled = false;
			m_undragableBox2.enabled = false;

			m_autoBox1.enabled = false;
			m_autoBox2.enabled = false;
			m_controlKeyArea1.enabled = false;
			m_controlKeyArea1.focusEnabled = false;
			m_controlKeyArea1.editable = false;
			m_controlKeyArea2.enabled = false;
			m_controlKeyArea2.focusEnabled = false;
			m_controlKeyArea2.editable = false;
		}
		
		public function DisableStuffForHomeMoviesLevel():void {
			m_collisionBox.enabled = false;
			m_undragableBox.enabled = false;
			m_collisionBox2.enabled = false;
			m_collisionBox3.enabled = false;
			m_undragableBox2.enabled = false;

			m_autoBox1.enabled = false;
			m_autoBox2.enabled = false;
		}
		
		public function ShowObjectPanel(shape:ShapePart):void {
			visible = true;
			m_colourWindow.visible = false;
			m_fixedJointPanel.visible = false;
			m_jointEditPanel.visible = false;
			m_objectEditPanel.visible = true;
			m_textEditPanel.visible = false;
			m_thrustersEditPanel.visible = false;
			m_multiEditPanel.visible = false;
			m_buildBoxPanel.visible = false;
			m_cannonPanel.visible = false;
			m_densitySlider.value = shape.density;
			m_densitySlider.minimum = ControllerGame.minDensity;
			m_densitySlider.maximum = ControllerGame.maxDensity;
			m_densityArea.text = shape.density.toString();
			m_collisionBox.selected = shape.collide;
			m_collisionBox.visible = ((cont is ControllerSandbox) && !(cont is ControllerChallenge)) || ((cont is ControllerChallenge) && (ControllerChallenge.challenge.nonCollidingAllowed || !ControllerChallenge.playChallengeMode));
			m_fixateBox.selected = shape.isStatic;
			m_fixateBox.visible = ((cont is ControllerSandbox) && !(cont is ControllerChallenge)) || ((cont is ControllerChallenge) && (ControllerChallenge.challenge.fixateAllowed || !ControllerChallenge.playChallengeMode));
			m_cameraBox.selected = shape.isCameraFocus;
			m_outlineBox.selected = shape.outline;
			m_terrainBox.selected = shape.terrain;
			m_undragableBox.selected = shape.undragable;
			if (shape is Circle) m_shapeHeader.text = "Circle";
			if (shape is Rectangle) m_shapeHeader.text = "Rectangle";
			if (shape is Triangle) m_shapeHeader.text = "Triangle";
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 14;
			format.align = TextFormatAlign.CENTER;
			m_shapeHeader.setTextFormat(format);
		}
		
		public function ShowCannonPanel(cannon:Cannon):void {
			visible = true;
			m_colourWindow.visible = false;
			m_fixedJointPanel.visible = false;
			m_jointEditPanel.visible = false;
			m_objectEditPanel.visible = false;
			m_textEditPanel.visible = false;
			m_thrustersEditPanel.visible = false;
			m_multiEditPanel.visible = false;
			m_buildBoxPanel.visible = false;
			m_cannonPanel.visible = true;
			m_densitySlider7.value = cannon.density;
			m_densityArea7.text = cannon.density.toString();
			m_collisionBox7.selected = cannon.collide;
			m_collisionBox7.visible = ((cont is ControllerSandbox) && !(cont is ControllerChallenge)) || ((cont is ControllerChallenge) && (ControllerChallenge.challenge.nonCollidingAllowed || !ControllerChallenge.playChallengeMode));
			m_fixateBox7.selected = cannon.isStatic;
			m_fixateBox7.visible = ((cont is ControllerSandbox) && !(cont is ControllerChallenge)) || ((cont is ControllerChallenge) && (ControllerChallenge.challenge.fixateAllowed || !ControllerChallenge.playChallengeMode));
			m_outlineBox7.selected = cannon.outline;
			m_terrainBox7.selected = cannon.terrain;
			m_undragableBox7.selected = cannon.undragable;
			m_cannonHeader.text = "Cannon";
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 14;
			format.align = TextFormatAlign.CENTER;
			m_cannonHeader.setTextFormat(format);
			m_strengthSlider7.value = cannon.strength;
			m_strengthArea7.text = cannon.strength + "";
			var str:String = Input.getKeyString(cannon.fireKey);
			if (str == null) str = "Unk: " + cannon.fireKey;
			m_fireKeyArea.text = str;
		}
		
		public function ShowTextPanel(text:TextPart):void {
			visible = true;
			m_colourWindow.visible = false;
			m_fixedJointPanel.visible = false;
			m_jointEditPanel.visible = false;
			m_objectEditPanel.visible = false;
			m_thrustersEditPanel.visible = false;
			m_multiEditPanel.visible = false;
			m_textEditPanel.visible = true;
			m_buildBoxPanel.visible = false;
			m_cannonPanel.visible = false;
			m_alwaysVisibleBox.selected = text.alwaysVisible;
			m_scaleWithZoomBox.selected = text.scaleWithZoom;
			m_textKeyArea.enabled = !text.alwaysVisible;
			var str:String = Input.getKeyString(text.displayKey);
			if (str == null) str = "Unk: " + text.displayKey;
			m_textKeyArea.text = str;
			m_textArea.text = text.m_textField.text;
			m_sizeArea.text = text.size + "";
		}
		
		public function ShowMultiSelectPanel(parts:Array):void {
			visible = true;
			m_colourWindow.visible = false;
			m_fixedJointPanel.visible = false;
			m_jointEditPanel.visible = false;
			m_objectEditPanel.visible = false;
			m_thrustersEditPanel.visible = false;
			m_multiEditPanel.visible = true;
			m_textEditPanel.visible = false;
			m_cannonPanel.visible = false;
			m_outlineBox3.selected = true;
			m_terrainBox3.selected = false;
			m_fixateBox2.selected = false;
			m_undragableBox2.selected = false;
			m_collisionBox2.selected = true;
			m_collisionBox2.visible = ((cont is ControllerSandbox) && !(cont is ControllerChallenge)) || ((cont is ControllerChallenge) && (ControllerChallenge.challenge.nonCollidingAllowed || !ControllerChallenge.playChallengeMode));
			m_fixateBox2.visible = ((cont is ControllerSandbox) && !(cont is ControllerChallenge)) || ((cont is ControllerChallenge) && (ControllerChallenge.challenge.fixateAllowed || !ControllerChallenge.playChallengeMode));
			m_buildBoxPanel.visible = false;
			for (var i:int = 0; i < parts.length; i++) {
				if ((parts[i] is ShapePart && !parts[i].outline) || (parts[i] is PrismaticJoint && !parts[i].outline)) m_outlineBox3.selected = false;
				if (parts[i] is ShapePart && parts[i].terrain) m_terrainBox3.selected = true;
				if (parts[i] is ShapePart && parts[i].isStatic) m_fixateBox2.selected = true;
				if (parts[i] is ShapePart && parts[i].undragable) m_undragableBox2.selected = true;
				if (parts[i] is ShapePart && !parts[i].collide) m_collisionBox2.selected = false;
			}
		}
		
		public function ShowJointPanel(joint:JointPart):void {
			visible = true;
			m_colourWindow.visible = false;
			m_objectEditPanel.visible = false;
			m_fixedJointPanel.visible = false;
			m_jointEditPanel.visible = true;
			m_thrustersEditPanel.visible = false;
			m_multiEditPanel.visible = false;
			m_textEditPanel.visible = false;
			m_buildBoxPanel.visible = false;
			m_cannonPanel.visible = false;
			
			var isRevolute:Boolean = (joint is RevoluteJoint);
			var str:String;
			var format:TextFormat;
			if (isRevolute) {
				var rjoint:RevoluteJoint = (joint as RevoluteJoint);
				m_enableMotorBox.selected = rjoint.enableMotor;
				m_rigidJointBox.selected = !rjoint.isStiff;
				m_strengthLabel.text = "Motor Strength";
				m_strengthSlider.value = rjoint.motorStrength;
				m_strengthSlider.enabled = rjoint.enableMotor;
				m_strengthSlider.maximum = ControllerGame.maxRJStrength;
				m_strengthArea.text = rjoint.motorStrength + "";
				m_speedLabel.text = "Motor Speed";
				m_speedSlider.value = rjoint.motorSpeed;
				m_speedSlider.enabled = rjoint.enableMotor;
				m_speedSlider.maximum = ControllerGame.maxRJSpeed;
				m_speedArea.text = rjoint.motorSpeed + "";
				m_autoBox1.selected = rjoint.autoCW;
				m_autoBox2.selected = rjoint.autoCCW;
				m_limitLabel1.visible = true;
				m_minDispArea.visible = true;
				m_limitLabel2.visible = true;
				m_maxDispArea.visible = true;
				if (rjoint.motorLowerLimit == -Number.MAX_VALUE) m_minDispArea.text = "None";
				else m_minDispArea.text = String(rjoint.motorLowerLimit);
				if (rjoint.motorUpperLimit == Number.MAX_VALUE) m_maxDispArea.text = "None";
				else m_maxDispArea.text = String(rjoint.motorUpperLimit);
				m_inputLabel1.text = "Rotate CW:";
				str = Input.getKeyString(rjoint.motorCWKey);
				if (str == null) str = "Unk: " + rjoint.motorCWKey;
				m_controlKeyArea1.text = str;
				m_controlKeyArea1.enabled = rjoint.enableMotor;
				m_controlKeyArea1.focusEnabled = rjoint.enableMotor;				
				m_inputLabel2.text = "Rotate CCW:";
				str = Input.getKeyString(rjoint.motorCCWKey);
				if (str == null) str = "Unk: " + rjoint.motorCCWKey;
				m_controlKeyArea2.text = str;
				m_controlKeyArea2.enabled = rjoint.enableMotor;
				m_controlKeyArea2.focusEnabled = rjoint.enableMotor;
				m_rigidJointBox.enabled = rjoint.enableMotor;
				m_rigidJointBox.focusEnabled = rjoint.enableMotor;
				m_strengthArea.enabled = rjoint.enableMotor;
				m_strengthArea.editable = rjoint.enableMotor;
				m_strengthArea.focusEnabled = rjoint.enableMotor;
				m_speedArea.enabled = rjoint.enableMotor;
				m_speedArea.focusEnabled = rjoint.enableMotor;
				m_speedArea.editable = rjoint.enableMotor;
				m_autoBox1.enabled = rjoint.enableMotor;
				m_autoBox2.enabled = rjoint.enableMotor;
				m_inputLabel1.x = 10;
				m_inputLabel2.x = 10;
				m_controlKeyArea1.x = 70;
				m_controlKeyArea2.x = 70;
				m_autoBox1.label = "Auto-On CW";
				m_autoBox2.visible = true;
				m_colourButton.visible = false;
				m_frontButton.visible = false;
				m_backButton.visible = false;
				m_outlineBox2.visible = false;
				m_collisionBox3.visible = false;
				m_jointHeader.text = "Rotating Joint";
				format = new TextFormat();
				format.font = Main.GLOBAL_FONT;
				format.size = 14;
				format.align = TextFormatAlign.CENTER;
				m_jointHeader.setTextFormat(format);
			} else if (joint is PrismaticJoint) {
				var pjoint:PrismaticJoint = (joint as PrismaticJoint);
				m_enableMotorBox.selected = pjoint.enablePiston;
				m_rigidJointBox.selected = !pjoint.isStiff;
				m_strengthLabel.text = "Piston Strength";
				m_strengthSlider.value = pjoint.pistonStrength;
				m_strengthSlider.enabled = pjoint.enablePiston;
				m_strengthSlider.maximum = ControllerGame.maxSJStrength;
				m_strengthArea.text = pjoint.pistonStrength + "";
				m_speedLabel.text = "Piston Speed";
				m_speedSlider.value = pjoint.pistonSpeed;
				m_speedSlider.enabled = pjoint.enablePiston;
				m_speedSlider.maximum = ControllerGame.maxSJSpeed;
				m_speedArea.text = pjoint.pistonSpeed + "";
				m_autoBox1.selected = pjoint.autoOscillate;
				m_outlineBox2.selected = pjoint.outline;
				m_limitLabel1.visible = false;
				m_minDispArea.visible = false;
				m_limitLabel2.visible = false;
				m_maxDispArea.visible = false;
				m_inputLabel1.text = "Expand:";
				str = Input.getKeyString(pjoint.pistonUpKey);
				if (str == null) str = "Unk: " + pjoint.pistonUpKey;
				m_controlKeyArea1.text = str;
				m_controlKeyArea1.enabled = pjoint.enablePiston;
				m_controlKeyArea1.focusEnabled = pjoint.enablePiston;
				m_inputLabel2.text = "Contract:";
				str = Input.getKeyString(pjoint.pistonDownKey);
				if (str == null) str = "Unk: " + pjoint.pistonDownKey;
				m_controlKeyArea2.text = str;
				m_controlKeyArea2.enabled = pjoint.enablePiston;
				m_controlKeyArea2.focusEnabled = pjoint.enablePiston;
				m_rigidJointBox.enabled = pjoint.enablePiston;
				m_rigidJointBox.focusEnabled = pjoint.enablePiston;
				m_strengthArea.enabled = pjoint.enablePiston;
				m_strengthArea.editable = pjoint.enablePiston;
				m_strengthArea.focusEnabled = pjoint.enablePiston;
				m_speedArea.enabled = pjoint.enablePiston;
				m_speedArea.focusEnabled = pjoint.enablePiston;
				m_speedArea.editable = pjoint.enablePiston;
				m_autoBox1.enabled = pjoint.enablePiston;
				m_inputLabel1.x = -3;
				m_inputLabel2.x = -3;
				m_controlKeyArea1.x = 60;
				m_controlKeyArea2.x = 60;
				m_autoBox1.label = "Auto Oscillate";
				m_autoBox2.visible = false;
				m_colourButton.visible = true;
				m_frontButton.visible = true;
				m_backButton.visible = true;
				m_outlineBox2.visible = true;
				m_collisionBox3.visible = ((cont is ControllerSandbox) && !(cont is ControllerChallenge)) || ((cont is ControllerChallenge) && (ControllerChallenge.challenge.nonCollidingAllowed || !ControllerChallenge.playChallengeMode));
				m_collisionBox3.selected = pjoint.collide;
				m_jointHeader.text = "Sliding Joint";
				format = new TextFormat();
				format.font = Main.GLOBAL_FONT;
				format.size = 14;
				format.align = TextFormatAlign.CENTER;
				m_jointHeader.setTextFormat(format);
			} else {
				m_fixedJointPanel.visible = true;
				m_jointEditPanel.visible = false;
			}
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 9;
			format.color = 0x242930;
			m_limitLabel1.setTextFormat(format);
			m_limitLabel2.setTextFormat(format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 9;
			format.color = 0x242930;
			format.align = TextFormatAlign.RIGHT;
			m_inputLabel1.setTextFormat(format);
			m_inputLabel2.setTextFormat(format);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 9;
			format.color = 0x242930;
			m_speedLabel.setTextFormat(format);
			m_strengthLabel.setTextFormat(format);
			
			m_inputLabel1.visible = !(cont is ControllerChallenge) || !ControllerChallenge.playChallengeMode || ((cont is ControllerChallenge) && ControllerChallenge.challenge.botControlAllowed);
			m_inputLabel2.visible = !(cont is ControllerChallenge) || !ControllerChallenge.playChallengeMode || ((cont is ControllerChallenge) && ControllerChallenge.challenge.botControlAllowed);
			m_controlKeyArea1.visible = !(cont is ControllerChallenge) || !ControllerChallenge.playChallengeMode || ((cont is ControllerChallenge) && ControllerChallenge.challenge.botControlAllowed);
			m_controlKeyArea2.visible = !(cont is ControllerChallenge) || !ControllerChallenge.playChallengeMode || ((cont is ControllerChallenge) && ControllerChallenge.challenge.botControlAllowed);
		}
		
		public function ShowThrustersPanel(t:Thrusters):void {
			visible = true;
			m_colourWindow.visible = false;
			m_objectEditPanel.visible = false;
			m_fixedJointPanel.visible = false;
			m_jointEditPanel.visible = false;
			m_thrustersEditPanel.visible = true;
			m_multiEditPanel.visible = false;
			m_textEditPanel.visible = false;
			m_buildBoxPanel.visible = false;
			m_cannonPanel.visible = false;
			
			m_autoBox3.selected = t.autoOn;
			m_thrustSlider.value = t.strength;
			m_thrustSlider.maximum = ControllerGame.maxThrusterStrength;
			m_thrustArea.text = t.strength + "";
			var str:String = Input.getKeyString(t.thrustKey);
			if (str == null) str = "Unk: " + t.thrustKey;
			m_thrustKeyArea.text = str;
			
			m_thrustKeyLabel.visible = !(cont is ControllerChallenge) || !ControllerChallenge.playChallengeMode || ((cont is ControllerChallenge) && ControllerChallenge.challenge.botControlAllowed);
			m_thrustKeyArea.visible = !(cont is ControllerChallenge) || !ControllerChallenge.playChallengeMode || ((cont is ControllerChallenge) && ControllerChallenge.challenge.botControlAllowed);
		}

		public function ShowBuildBoxPanel():void {
			visible = true;
			m_colourWindow.visible = false;
			m_objectEditPanel.visible = false;
			m_fixedJointPanel.visible = false;
			m_jointEditPanel.visible = false;
			m_thrustersEditPanel.visible = false;
			m_multiEditPanel.visible = false;
			m_textEditPanel.visible = false;
			m_buildBoxPanel.visible = true;
			m_cannonPanel.visible = false;
		}
		
		public function TextAreaGotFocus(e:Event = null):void {
			enteringInput = true;
		}
		
		public function TextAreaLostFocus(e:Event = null):void {
			enteringInput = false;
		}
		
		public function sliderClicked(e:Event):void {
			sliderDown = true;
		}
		
		public function sliderReleased(e:Event):void {
			sliderDown = false;
		}
		
		public function EnteringInput():Boolean {
			if (!visible) enteringInput = false;
			return enteringInput;
		}
		
		public function SetDensity(density:Number):void {
			m_densityArea.text = density.toString();
			m_densitySlider.value = density;
			m_densityArea7.text = density.toString();
			m_densitySlider7.value = density;
		}
		
		public function SetStrength(strength:Number):void {
			m_strengthArea.text = strength.toString();
			m_strengthSlider.value = strength;
		}
		
		public function SetSpeed(speed:Number):void {
			m_speedArea.text = speed.toString();
			m_speedSlider.value = speed;
		}

		public function SetThrust(thrust:Number):void {
			m_thrustArea.text = thrust.toString();
			m_thrustSlider.value = thrust;
		}

		public function SetCannon(strength:Number):void {
			m_strengthArea7.text = strength.toString();
			m_strengthSlider7.value = strength;
		}

		public function EnableMotorStuff(enable:Boolean):void {
			m_strengthSlider.enabled = enable;
			m_speedSlider.enabled = enable;
			m_controlKeyArea1.enabled = enable;
			m_controlKeyArea2.enabled = enable;
			m_rigidJointBox.enabled = enable;
			m_strengthArea.enabled = enable;
			m_strengthArea.editable = enable;
			m_speedArea.enabled = enable;
			m_speedArea.editable = enable;
			m_autoBox1.enabled = enable;
			m_autoBox2.enabled = enable;
		}
		
		public function EnableTextStuff(enable:Boolean):void {
			m_textKeyArea.enabled = enable;
		}
		
		public function deselectBox2():void {
			m_autoBox2.selected = false;
		}
		
		public function deselectBox1():void {
			m_autoBox1.selected = false;
		}
		
		public function sizeFocus(e:MouseEvent):void {
			m_sizeArea.setSelection(0, 4);
		}
		
		public function minDispFocus(e:MouseEvent):void {
			if (m_minDispArea.enabled) m_minDispArea.setSelection(0, 10);
		}
		
		public function maxDispFocus(e:MouseEvent):void {
			if (m_maxDispArea.enabled) m_maxDispArea.setSelection(0, 10);
		}
		
		public function densityFocus(e:MouseEvent):void {
			if (m_densityArea.enabled) m_densityArea.setSelection(0, 10);
		}
		
		public function strengthFocus(e:MouseEvent):void {
			if (m_strengthArea.enabled) m_strengthArea.setSelection(0, 10);
		}
		
		public function speedFocus(e:MouseEvent):void {
			if (m_speedArea.enabled) m_speedArea.setSelection(0, 10);
		}
		
		public function thrustFocus(e:MouseEvent):void {
			if (m_thrustArea.enabled) m_thrustArea.setSelection(0, 10);
		}
		
		public function cannonFocus(e:MouseEvent):void {
			if (m_strengthArea7.enabled) m_strengthArea7.setSelection(0, 10);
		}
		
		public function controlKey1Focus(e:MouseEvent):void {
			if (m_controlKeyArea1.enabled) {
				m_controlKeyArea1.setSelection(0, 10);
			}
		}
		
		public function controlKey2Focus(e:MouseEvent):void {
			if (m_controlKeyArea2.enabled) {
				m_controlKeyArea2.setSelection(0, 10);
			}
		}
		
		public function thrustKeyFocus(e:MouseEvent):void {
			if (m_thrustKeyArea.enabled) {
				m_thrustKeyArea.setSelection(0, 10);
			}		
		}
		
		public function cannonKeyFocus(e:MouseEvent):void {
			if (m_fireKeyArea.enabled) {
				m_fireKeyArea.setSelection(0, 10);
			}		
		}
		
		public function ColourWindowShowing():Boolean {
			return (visible && m_colourWindow.visible);
		}
		
		public function BuildWindowShowing():Boolean {
			return (visible && m_buildBoxPanel.visible);
		}
	}
}