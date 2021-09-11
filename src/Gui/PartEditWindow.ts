import { Sprite, Text, TextStyle } from "pixi.js";
import {
  Cannon,
  Circle,
  ColourChangeWindow,
	ControllerChallenge,
  ControllerGame,
  ControllerGameGlobals,
  GuiButton,
  GuiCheckBox,
  GuiSlider,
  GuiTextArea,
  GuiTextInput,
  GuiWindow,
  Input,
  JointPart,
  Main,
  PrismaticJoint,
  Rectangle,
  RevoluteJoint,
  ShapePart,
  TextPart,
  Thrusters,
  Triangle,
} from "../imports";

export class PartEditWindow extends GuiWindow {
  private cont: ControllerGame;
  private enteringInput: boolean = false;
  public sliderDown: boolean = false;

  private m_colourWindow: ColourChangeWindow;

  private m_objectEditPanel: Sprite;
  private m_textEditPanel: Sprite;
  private m_fixedJointPanel: Sprite;
  private m_jointEditPanel: Sprite;
  private m_thrustersEditPanel: Sprite;
  private m_multiEditPanel: Sprite;
  private m_buildBoxPanel: Sprite;
  private m_cannonPanel: Sprite;

  private m_shapeHeader: Text;
  private m_jointHeader: Text;
  private m_thrustersHeader: Text;
  private m_cannonHeader: Text;
  private m_rotateButton: GuiButton;
  private m_deleteButton: GuiButton;
  private m_cutButton: GuiButton;
  private m_copyButton: GuiButton;
  private m_pasteButton: GuiButton;
  private m_collisionBox: GuiCheckBox;
  private m_cameraBox: GuiCheckBox;
  private m_fixateBox: GuiCheckBox;
  private m_densityLabel: Text;
  private m_densitySlider: GuiSlider;
  private m_densityArea: TextInput;
  private m_backButton: GuiButton;
  private m_frontButton: GuiButton;
  private m_colourButton: GuiButton;
  private m_outlineBox: GuiCheckBox;
  private m_terrainBox: GuiCheckBox;
  private m_undragableBox: GuiCheckBox;
  private m_terrainBox3: GuiCheckBox;
  private m_outlineBox3: GuiCheckBox;
  private m_collisionBox3: GuiCheckBox;
  private m_collisionBox2: GuiCheckBox;
  private m_fixateBox2: GuiCheckBox = null;
  private m_undragableBox2: GuiCheckBox;

  private m_alwaysVisibleBox: GuiCheckBox;
  private m_scaleWithZoomBox: GuiCheckBox;
  private m_textLabel: Text;
  private m_textArea: TextArea;
  private m_textKeyArea: TextInput;
  private m_textKeyLabel: Text;
  private m_sizeLabel: Text;
  private m_sizeArea: TextInput;

  private m_minDispArea: TextInput;
  private m_maxDispArea: TextInput;
  private m_enableMotorBox: GuiCheckBox;
  private m_rigidJointBox: GuiCheckBox;
  private m_strengthLabel: Text;
  private m_speedLabel: Text;
  private m_strengthSlider: GuiSlider;
  private m_strengthArea: TextInput;
  private m_speedSlider: GuiSlider;
  private m_speedArea: TextInput;
  private m_controlKeyArea1: TextInput;
  private m_controlKeyArea2: TextInput;
  private m_limitLabel1: Text;
  private m_limitLabel2: Text;
  private m_inputLabel1: Text;
  private m_inputLabel2: Text;
  private m_autoBox1: GuiCheckBox;
  private m_autoBox2: GuiCheckBox;
  private m_outlineBox2: GuiCheckBox;

  private m_thrustLabel: Text;
  private m_thrustSlider: GuiSlider;
  private m_thrustArea: TextInput;
  private m_thrustKeyLabel: Text;
  private m_thrustKeyArea: TextInput;
  private m_autoBox3: GuiCheckBox;

  private m_collisionBox7: GuiCheckBox;
  private m_densityArea7: TextInput;
  private m_densitySlider7: GuiSlider;
  private m_fixateBox7: GuiCheckBox;
  private m_outlineBox7: GuiCheckBox;
  private m_terrainBox7: GuiCheckBox;
  private m_undragableBox7: GuiCheckBox;
  private m_strengthLabel7: Text;
  private m_strengthSlider7: GuiSlider;
  private m_strengthArea7: TextInput;
  private m_fireKeyLabel: Text;
  private m_fireKeyArea: TextInput;

  constructor(contr: ControllerGame) {
    super(0, 90, 120, 500);
    this.cont = contr;
    this.visible = false;

    this.m_colourWindow = new ColourChangeWindow(this.cont, this);
    this.addChild(this.m_colourWindow);
    this.m_colourWindow.visible = false;

    this.m_objectEditPanel = new Sprite();
    this.addChild(this.m_objectEditPanel);
    this.m_textEditPanel = new Sprite();
    this.addChild(this.m_textEditPanel);
    this.m_fixedJointPanel = new Sprite();
    this.addChild(this.m_fixedJointPanel);
    this.m_jointEditPanel = new Sprite();
    this.addChild(this.m_jointEditPanel);
    this.m_thrustersEditPanel = new Sprite();
    this.addChild(this.m_thrustersEditPanel);
    this.m_multiEditPanel = new Sprite();
    this.addChild(this.m_multiEditPanel);
    this.m_buildBoxPanel = new Sprite();
    this.addChild(this.m_buildBoxPanel);
    this.m_cannonPanel = new Sprite();
    this.addChild(this.m_cannonPanel);

    var format: TextStyle = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.align = "center";
    format.fontSize = 14;
    format.fill = "#242930";
    var disabledFormat: TextStyle = new TextStyle();
    disabledFormat.fontFamily = Main.GLOBAL_FONT;
    disabledFormat.fontSize = 9;
    disabledFormat.fill = "#666570";
    this.m_shapeHeader = new Text("");
    this.m_shapeHeader.anchor.set(0.5);
    this.m_shapeHeader.text = "Circle";
    this.m_shapeHeader.x = 5 + 110 / 2;
    this.m_shapeHeader.y = 15 + 20 / 2;
    this.m_shapeHeader.style = format;
    this.m_objectEditPanel.addChild(this.m_shapeHeader);
    this.m_backButton = new GuiButton("X", 90, -5, 35, 35, () => this.backButton(), GuiButton.X);
    this.m_objectEditPanel.addChild(this.m_backButton);
    this.m_deleteButton = new GuiButton("Delete", 10, 30, 100, 35, () => this.cont.deleteButton(), GuiButton.ORANGE);
    this.m_objectEditPanel.addChild(this.m_deleteButton);
    this.m_cutButton = new GuiButton("Cut", 10, 60, 100, 35, () => this.cont.cutButton(), GuiButton.ORANGE);
    this.m_objectEditPanel.addChild(this.m_cutButton);
    this.m_copyButton = new GuiButton("Copy", 10, 90, 100, 35, () => this.cont.copyButton(), GuiButton.ORANGE);
    this.m_objectEditPanel.addChild(this.m_copyButton);
    this.m_pasteButton = new GuiButton("Paste", 10, 120, 100, 35, () => this.cont.pasteButton(), GuiButton.ORANGE);
    this.m_pasteButton.stopPropagation = true
    this.m_objectEditPanel.addChild(this.m_pasteButton);
    this.m_rotateButton = new GuiButton("Rotate", 10, 150, 100, 35, () => this.cont.rotateButton(), GuiButton.BLUE);
    this.m_rotateButton.stopPropagation = true
    this.m_objectEditPanel.addChild(this.m_rotateButton);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#242930";
    format.fontSize = 12;
    this.m_densityLabel = new Text("");
    this.m_densityLabel.text = "Density";
    this.m_densityLabel.x = 39;
    this.m_densityLabel.y = 186;
    this.m_densityLabel.style = format;
    this.m_objectEditPanel.addChild(this.m_densityLabel);
    this.m_densitySlider = new GuiSlider();
    this.m_densitySlider.x = 20;
    this.m_densitySlider.y = 205;
    this.m_densitySlider.minValue = 1.0;
    this.m_densitySlider.maxValue = 30.0;
    this.m_densitySlider.value = 15.0;
    this.m_densitySlider.on("change", (event: any) => this.cont.densitySlider(event));
    // this.m_densitySlider.addEventListener(SliderEvent.THUMB_PRESS, this.sliderClicked(event));
    // this.m_densitySlider.addEventListener(SliderEvent.THUMB_RELEASE, this.sliderReleased(event));
    this.m_objectEditPanel.addChild(this.m_densitySlider);
    format = new TextStyle();
    format.fontSize = 9;
    this.m_densityArea = new GuiTextInput(35, 220, 50, 15, format);
    this.m_densityArea.text = "10";
    this.m_densityArea.maxLength = 5;
    this.m_densityArea.on("click", (event: any) => this.densityFocus(event));
    this.m_densityArea.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_densityArea.on("change", (event: any) => this.cont.textEntered());
    this.m_densityArea.on("blur", (event: any) => this.cont.densityText(event));
    this.m_objectEditPanel.addChild(this.m_densityArea);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 9;
    format.fill = 0x242930;
    this.m_collisionBox = new GuiCheckBox(5, 240, 120);
    this.m_collisionBox.style = format;
    this.m_collisionBox.disabledStyle = disabledFormat;
    this.m_collisionBox.label = "Collides";
    this.m_collisionBox.selected = true;
    this.m_collisionBox.on("change", (event: any) => this.cont.collisionBox(event));
    this.m_objectEditPanel.addChild(this.m_collisionBox);
    this.m_cameraBox = new GuiCheckBox(5, 260, 120);
    this.m_cameraBox.style = format;
    this.m_cameraBox.disabledStyle = disabledFormat;
    this.m_cameraBox.label = "Camera Focus";
    this.m_cameraBox.selected = false;
    this.m_cameraBox.on("change", (event: any) => this.cont.cameraBox(event));
    this.m_objectEditPanel.addChild(this.m_cameraBox);
    this.m_fixateBox = new GuiCheckBox(5, 300, 120);
    this.m_fixateBox.style = format;
    this.m_fixateBox.disabledStyle = disabledFormat;
    this.m_fixateBox.label = "Fixate";
    this.m_fixateBox.selected = false;
    this.m_fixateBox.on("change", (event: any) => this.cont.fixateBox(event));
    this.m_objectEditPanel.addChild(this.m_fixateBox);
    this.m_colourButton = new GuiButton("Change Color", 5, 320, 110, 35, () => this.colourButton(), GuiButton.BLUE);
    this.m_objectEditPanel.addChild(this.m_colourButton);
    this.m_frontButton = new GuiButton("Move to Front", 5, 350, 110, 35, () => this.cont.frontButton(), GuiButton.PINK);
    this.m_objectEditPanel.addChild(this.m_frontButton);
    this.m_backButton = new GuiButton("Move to Back", 5, 380, 110, 35, () => this.cont.backButton(), GuiButton.PINK);
    this.m_objectEditPanel.addChild(this.m_backButton);
    this.m_outlineBox = new GuiCheckBox(5, 415, 120);
    this.m_outlineBox.style = format;
    this.m_outlineBox.disabledStyle = disabledFormat;
    this.m_outlineBox.label = "Show Outlines";
    this.m_outlineBox.selected = false;
    this.m_outlineBox.on("change", (event: any) => this.cont.outlineBox(event));
    this.m_objectEditPanel.addChild(this.m_outlineBox);
    this.m_terrainBox = new GuiCheckBox(5, 435, 120);
    this.m_terrainBox.style = format;
    this.m_terrainBox.disabledStyle = disabledFormat;
    this.m_terrainBox.label = "Outlines Behind";
    this.m_terrainBox.selected = false;
    this.m_terrainBox.on("change", (event: any) => this.cont.terrainBox(event));
    this.m_objectEditPanel.addChild(this.m_terrainBox);
    this.m_undragableBox = new GuiCheckBox(5, 280, 120);
    this.m_undragableBox.style = format;
    this.m_undragableBox.disabledStyle = disabledFormat;
    this.m_undragableBox.label = "Undraggable";
    this.m_undragableBox.selected = false;
    this.m_undragableBox.on("change", (event: any) => this.cont.undragableBox(event));
    this.m_objectEditPanel.addChild(this.m_undragableBox);

    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.align = "center";
    format.fill = "#242930";
    format.fontSize = 14;
    this.m_cannonHeader = new Text("");
    this.m_cannonHeader.text = "Cannon";
    this.m_cannonHeader.anchor.set(0.5);
    this.m_cannonHeader.x = 5 + 110 / 2;
    this.m_cannonHeader.y = 15 + 20 / 2;
    this.m_cannonHeader.style = format;
    this.m_cannonPanel.addChild(this.m_cannonHeader);
    this.m_backButton = new GuiButton("X", 90, -5, 35, 35, () => this.backButton(), GuiButton.X);
    this.m_cannonPanel.addChild(this.m_backButton);
    this.m_deleteButton = new GuiButton("Delete", 10, 30, 100, 35, () => this.cont.deleteButton(), GuiButton.ORANGE);
    this.m_cannonPanel.addChild(this.m_deleteButton);
    this.m_cutButton = new GuiButton("Cut", 10, 60, 100, 35, () => this.cont.cutButton(), GuiButton.ORANGE);
    this.m_cannonPanel.addChild(this.m_cutButton);
    this.m_copyButton = new GuiButton("Copy", 10, 90, 100, 35, () => this.cont.copyButton(), GuiButton.ORANGE);
    this.m_cannonPanel.addChild(this.m_copyButton);
    this.m_rotateButton = new GuiButton("Rotate", 10, 120, 100, 35, () => this.cont.rotateButton(), GuiButton.BLUE);
    this.m_rotateButton.stopPropagation = true
    this.m_cannonPanel.addChild(this.m_rotateButton);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#242930";
    format.fontSize = 12;
    this.m_densityLabel = new Text("");
    this.m_densityLabel.text = "Density";
    this.m_densityLabel.x = 39;
    this.m_densityLabel.y = 156;
    this.m_densityLabel.style = format;
    this.m_cannonPanel.addChild(this.m_densityLabel);
    this.m_densitySlider7 = new GuiSlider();
    this.m_densitySlider7.x = 20;
    this.m_densitySlider7.y = 175;
    this.m_densitySlider7.minValue = 1.0;
    this.m_densitySlider7.maxValue = 30.0;
    this.m_densitySlider7.value = 15.0;
    this.m_densitySlider7.on("change", (event: any) => this.cont.densitySlider(event));
    // this.m_densitySlider7.addEventListener(SliderEvent.THUMB_PRESS, this.sliderClicked(event));
    // this.m_densitySlider7.addEventListener(SliderEvent.THUMB_RELEASE, this.sliderReleased(event));
    this.m_cannonPanel.addChild(this.m_densitySlider7);
    format = new TextStyle();
    format.fontSize = 9;
    this.m_densityArea7 = new GuiTextInput(35, 190, 50, 15, format);
    this.m_densityArea7.text = "10";
    this.m_densityArea7.maxLength = 5;
    this.m_densityArea7.on("click", (event: any) => this.densityFocus(event));
    this.m_densityArea7.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_densityArea7.on("change", (event: any) => this.cont.textEntered());
    this.m_densityArea7.on("blur", (event: any) => this.cont.densityText(event));
    this.m_densityArea7.on("hide", (event: any) => this.cont.densityText(event));
    this.m_cannonPanel.addChild(this.m_densityArea7);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 9;
    format.fill = 0x242930;
    this.m_collisionBox7 = new GuiCheckBox(5, 210, 120);
    this.m_collisionBox7.style = format;
    this.m_collisionBox7.label = "Collides";
    this.m_collisionBox7.selected = true;
    this.m_collisionBox7.on("change", (event: any) => this.cont.collisionBox(event));
    this.m_cannonPanel.addChild(this.m_collisionBox7);
    this.m_fixateBox7 = new GuiCheckBox(5, 250, 120);
    this.m_fixateBox7.style = format;
    this.m_fixateBox7.disabledStyle = disabledFormat;
    this.m_fixateBox7.label = "Fixate";
    this.m_fixateBox7.selected = false;
    this.m_fixateBox7.on("change", (event: any) => this.cont.fixateBox(event));
    this.m_cannonPanel.addChild(this.m_fixateBox7);
    this.m_colourButton = new GuiButton("Change Color", 5, 270, 110, 35, () => this.colourButton(), GuiButton.BLUE);
    this.m_cannonPanel.addChild(this.m_colourButton);
    this.m_frontButton = new GuiButton("Move to Front", 5, 300, 110, 35, () => this.cont.frontButton(), GuiButton.PINK);
    this.m_cannonPanel.addChild(this.m_frontButton);
    this.m_backButton = new GuiButton("Move to Back", 5, 330, 110, 35, () => this.cont.backButton(), GuiButton.PINK);
    this.m_cannonPanel.addChild(this.m_backButton);
    this.m_outlineBox7 = new GuiCheckBox(5, 365, 120);
    this.m_outlineBox7.style = format;
    this.m_outlineBox7.disabledStyle = disabledFormat;
    this.m_outlineBox7.label = "Show Outlines";
    this.m_outlineBox7.selected = false;
    this.m_outlineBox7.on("change", (event: any) => this.cont.outlineBox(event));
    this.m_cannonPanel.addChild(this.m_outlineBox7);
    this.m_terrainBox7 = new GuiCheckBox(5, 385, 120);
    this.m_terrainBox7.style = format;
    this.m_terrainBox7.label = "Outlines Behind";
    this.m_terrainBox7.selected = false;
    this.m_terrainBox7.on("change", (event: any) => this.cont.terrainBox(event));
    this.m_cannonPanel.addChild(this.m_terrainBox7);
    this.m_undragableBox7 = new GuiCheckBox(5, 230, 120);
    this.m_undragableBox7.style = format;
    this.m_undragableBox7.disabledStyle = disabledFormat;
    this.m_undragableBox7.label = "Undraggable";
    this.m_undragableBox7.selected = false;
    this.m_undragableBox7.on("change", (event: any) => this.cont.undragableBox(event));
    this.m_cannonPanel.addChild(this.m_undragableBox7);
    format = new TextStyle();
    format.fontSize = 10;
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = 0x242930;
    this.m_strengthLabel7 = new Text("");
    this.m_strengthLabel7.text = "Cannon Strength";
    this.m_strengthLabel7.style = format;
    this.m_strengthLabel7.x = 21;
    this.m_strengthLabel7.y = 434;
    this.m_strengthLabel7.style = format;
    this.m_cannonPanel.addChild(this.m_strengthLabel7);
    this.m_strengthSlider7 = new GuiSlider();
    this.m_strengthSlider7.x = 20;
    this.m_strengthSlider7.y = 451;
    this.m_strengthSlider7.minValue = 1.0;
    this.m_strengthSlider7.maxValue = 30.0;
    this.m_strengthSlider7.value = 15.0;
    this.m_strengthSlider7.on("change", (event: any) => this.cont.cannonSlider(event));
    // this.m_strengthSlider7.addEventListener(SliderEvent.THUMB_PRESS, this.sliderClicked(event));
    // this.m_strengthSlider7.addEventListener(SliderEvent.THUMB_RELEASE, this.sliderReleased(event));
    this.m_cannonPanel.addChild(this.m_strengthSlider7);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 10;
    this.m_strengthArea7 = new GuiTextInput(35, 468, 50, 15, format);
    this.m_strengthArea7.text = "15";
    this.m_strengthArea7.maxLength = 5;
    this.m_strengthArea7.on("click", (event: any) => this.cannonFocus(event));
    this.m_strengthArea7.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_strengthArea7.on("change", (event: any) => this.cont.textEntered());
    this.m_strengthArea7.on("blur", (event: any) => this.cont.cannonText(event));
    this.m_strengthArea7.on("hide", (event: any) => this.cont.cannonText(event));
    this.m_cannonPanel.addChild(this.m_strengthArea7);
    this.m_fireKeyArea = new GuiTextInput(60, 412, 37, 15, format);
    this.m_fireKeyArea.editable = true;
    this.m_fireKeyArea.on("click", (event: any) => this.cannonKeyFocus(event));
    this.m_fireKeyArea.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_fireKeyArea.on("keyup", (input: GuiTextInput, code: number) => this.cont.fireKeyText(input, code));
    this.m_fireKeyArea.on("blur", (event: any) => this.TextAreaLostFocus(event));
    this.m_fireKeyArea.on("hide", (event: any) => this.TextAreaLostFocus(event));
    this.m_cannonPanel.addChild(this.m_fireKeyArea);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#242930";
    format.align = "right";
    format.fontSize = 12;
    this.m_fireKeyLabel = new Text("");
    this.m_fireKeyLabel.text = "Fire:";
    this.m_fireKeyLabel.x = 25;
    this.m_fireKeyLabel.y = 412;
    this.m_fireKeyLabel.style = format;
    this.m_cannonPanel.addChild(this.m_fireKeyLabel);

    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.align = "center";
    format.fontSize = 14;
    format.fill = "#242930";
    this.m_jointHeader = new Text("");
    this.m_jointHeader.anchor.set(0.5);
    this.m_jointHeader.text = "Multiple Objects";
    this.m_jointHeader.x = 5 + 110 / 2;
    this.m_jointHeader.y = 15 + 20 / 2;
    this.m_jointHeader.style = format;
    this.m_multiEditPanel.addChild(this.m_jointHeader);
    this.m_backButton = new GuiButton("X", 90, -5, 35, 35, () => this.backButton(), GuiButton.X);
    this.m_multiEditPanel.addChild(this.m_backButton);
    this.m_deleteButton = new GuiButton(
      "Delete",
      10,
      30,
      100,
      35,
      () => this.cont.multiDeleteButton(),
      GuiButton.ORANGE
    );
    this.m_multiEditPanel.addChild(this.m_deleteButton);
    this.m_cutButton = new GuiButton("Cut", 10, 60, 100, 35, () => this.cont.cutButton(), GuiButton.ORANGE);
    this.m_multiEditPanel.addChild(this.m_cutButton);
    this.m_copyButton = new GuiButton("Copy", 10, 90, 100, 35, () => this.cont.copyButton(), GuiButton.ORANGE);
    this.m_multiEditPanel.addChild(this.m_copyButton);
    this.m_pasteButton = new GuiButton("Paste", 10, 120, 100, 35, () => this.cont.pasteButton(), GuiButton.ORANGE);
    this.m_pasteButton.stopPropagation = true
    this.m_multiEditPanel.addChild(this.m_pasteButton);
    this.m_rotateButton = new GuiButton("Rotate", 10, 150, 100, 35, () => this.cont.rotateButton(), GuiButton.BLUE);
    this.m_rotateButton.stopPropagation = true
    this.m_multiEditPanel.addChild(this.m_rotateButton);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 9;
    format.fill = 0x242930;
    this.m_outlineBox3 = new GuiCheckBox(5, 300, 120);
    this.m_outlineBox3.style = format;
    this.m_outlineBox3.label = "Show Outlines";
    this.m_outlineBox3.selected = true;
    this.m_outlineBox3.on("change", (event: any) => this.cont.outlineBox(event));
    this.m_multiEditPanel.addChild(this.m_outlineBox3);
    this.m_terrainBox3 = new GuiCheckBox(5, 320, 120);
    this.m_terrainBox3.style = format;
    this.m_terrainBox3.label = "Outlines Behind";
    this.m_terrainBox3.selected = false;
    this.m_terrainBox3.on("change", (event: any) => this.cont.terrainBox(event));
    this.m_multiEditPanel.addChild(this.m_terrainBox3);
    this.m_colourButton = new GuiButton("Change Color", 5, 260, 110, 35, () => this.colourButton(), GuiButton.BLUE);
    this.m_multiEditPanel.addChild(this.m_colourButton);
    this.m_collisionBox2 = new GuiCheckBox(5, 190, 120);
    this.m_collisionBox2.style = format;
    this.m_collisionBox2.disabledStyle = disabledFormat;
    this.m_collisionBox2.label = "Collides";
    this.m_collisionBox2.selected = false;
    this.m_collisionBox2.on("change", (event: any) => this.cont.collisionBox(event));
    this.m_multiEditPanel.addChild(this.m_collisionBox2);
    this.m_fixateBox2 = new GuiCheckBox(5, 230, 120);
    this.m_fixateBox2.style = format;
    this.m_fixateBox2.disabledStyle = disabledFormat;
    this.m_fixateBox2.label = "Fixate";
    this.m_fixateBox2.selected = false;
    this.m_fixateBox2.on("change", (event: any) => this.cont.fixateBox(event));
    this.m_multiEditPanel.addChild(this.m_fixateBox2);
    this.m_undragableBox2 = new GuiCheckBox(5, 210, 120);
    this.m_undragableBox2.style = format;
    this.m_undragableBox2.disabledStyle = disabledFormat;
    this.m_undragableBox2.label = "Undraggable";
    this.m_undragableBox2.selected = false;
    this.m_undragableBox2.on("click", (event: any) => this.cont.undragableBox(event));
    this.m_multiEditPanel.addChild(this.m_undragableBox2);

    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.align = "center";
    format.fontSize = 14;
    format.fill = "#242930";
    this.m_jointHeader = new Text("");
    this.m_jointHeader.anchor.set(0.5);
    this.m_jointHeader.text = "Text";
    this.m_jointHeader.x = 5 + 110 / 2;
    this.m_jointHeader.y = 15 + 20 / 2;
    this.m_jointHeader.style = format;
    this.m_textEditPanel.addChild(this.m_jointHeader);
    this.m_backButton = new GuiButton("X", 90, -5, 35, 35, () => this.backButton(), GuiButton.X);
    this.m_textEditPanel.addChild(this.m_backButton);
    this.m_deleteButton = new GuiButton("Delete", 10, 30, 100, 35, () => this.cont.deleteButton(), GuiButton.ORANGE);
    this.m_textEditPanel.addChild(this.m_deleteButton);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#242930";
    format.fontSize = 12;
    this.m_textLabel = new Text("");
    this.m_textLabel.text = "Text:";
    this.m_textLabel.x = 45;
    this.m_textLabel.y = 68;
    this.m_textLabel.style = format;
    this.m_textEditPanel.addChild(this.m_textLabel);
    this.m_textArea = new GuiTextArea(15, 85, 90, 70, format);
    this.m_textArea.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_textArea.on("focus", (event: any) => this.cont.textTextStart());
    this.m_textArea.on("change", (event: any) => this.cont.textText(event));
    this.m_textArea.on("blur", (event: any) => this.cont.textTextFinish());
    this.m_textArea.on("blur", (event: any) => this.TextAreaLostFocus(event));
    this.m_textArea.on("hide", (event: any) => this.TextAreaLostFocus(event));
    this.m_textEditPanel.addChild(this.m_textArea);
    this.m_sizeLabel = new Text("");
    this.m_sizeLabel.text = "Text Size:";
    this.m_sizeLabel.x = 15;
    this.m_sizeLabel.y = 170;
    this.m_sizeLabel.style = format;
    this.m_textEditPanel.addChild(this.m_sizeLabel);
    format = new TextStyle();
    format.fontSize = 9;
    this.m_sizeArea = new GuiTextInput(72, 170, 30, 15, format);
    this.m_sizeArea.text = "12";
    this.m_sizeArea.maxLength = 4;
    this.m_sizeArea.on("click", (event: any) => this.sizeFocus(event));
    this.m_sizeArea.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_sizeArea.on("change", (event: any) => this.cont.textEntered(event));
    this.m_sizeArea.on("blur", (event: any) => this.cont.sizeText(this.m_sizeArea, event));
    this.m_sizeArea.on("hide", (event: any) => this.cont.sizeText(this.m_sizeArea, event));
    this.m_textEditPanel.addChild(this.m_sizeArea);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 9;
    format.fill = 0x242930;
    this.m_scaleWithZoomBox = new GuiCheckBox(2, 195, 120);
    this.m_scaleWithZoomBox.style = format;
    this.m_scaleWithZoomBox.label = "Scale with Zoom";
    this.m_scaleWithZoomBox.selected = true;
    this.m_scaleWithZoomBox.on("change", (event: any) => this.cont.scaleWithZoomBox(event));
    this.m_textEditPanel.addChild(this.m_scaleWithZoomBox);
    this.m_alwaysVisibleBox = new GuiCheckBox(2, 215, 120);
    this.m_alwaysVisibleBox.style = format;
    this.m_alwaysVisibleBox.label = "Always Display";
    this.m_alwaysVisibleBox.selected = false;
    this.m_alwaysVisibleBox.on("change", (event: any) => this.cont.alwaysVisibleBox(event));
    this.m_textEditPanel.addChild(this.m_alwaysVisibleBox);
    this.m_colourButton = new GuiButton("Change Color", 5, 290, 110, 35, () => this.colourButton(), GuiButton.BLUE);
    this.m_textEditPanel.addChild(this.m_colourButton);
    this.m_frontButton = new GuiButton("Move to Front", 5, 320, 110, 35, () => this.cont.frontButton(), GuiButton.PINK);
    this.m_textEditPanel.addChild(this.m_frontButton);
    this.m_backButton = new GuiButton("Move to Back", 5, 350, 110, 35, () => this.cont.backButton(), GuiButton.PINK);
    this.m_textEditPanel.addChild(this.m_backButton);
    format = new TextStyle();
    format.fontSize = 9;
    this.m_textKeyArea = new GuiTextInput(45, 268, 30, 15, format);
    this.m_textKeyArea.editable = false;
    this.m_textKeyArea.on("click", (event: any) => this.controlKey1Focus(event));
    this.m_textKeyArea.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_textKeyArea.on("keyup", (input: GuiTextInput, code: number) => this.cont.textKeyBox(input, code));
    this.m_textKeyArea.on("blur", (event: any) => this.TextAreaLostFocus(event));
    this.m_textKeyArea.on("hide", (event: any) => this.TextAreaLostFocus(event));
    this.m_textEditPanel.addChild(this.m_textKeyArea);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 10;
    format.fill = 0x242930;
    this.m_textKeyLabel = new Text("");
    this.m_textKeyLabel.text = "Display Text Key:";
    this.m_textKeyLabel.anchor.set(0.5);
    this.m_textKeyLabel.x = 18 + 90 / 2;
    this.m_textKeyLabel.y = 250 + 20 / 2;
    this.m_textKeyLabel.style = format;
    this.m_textEditPanel.addChild(this.m_textKeyLabel);

    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.align = "center";
    format.fontSize = 14;
    format.fill = "#242930";
    this.m_jointHeader = new Text("");
    this.m_jointHeader.text = "Fixed Joint";
    this.m_jointHeader.anchor.set(0.5);
    this.m_jointHeader.x = 5 + 110 / 2;
    this.m_jointHeader.y = 15 + 20 / 2;
    this.m_jointHeader.style = format;
    this.m_fixedJointPanel.addChild(this.m_jointHeader);
    this.m_backButton = new GuiButton("X", 90, -5, 35, 35, () => this.backButton(), GuiButton.X);
    this.m_fixedJointPanel.addChild(this.m_backButton);
    this.m_deleteButton = new GuiButton("Delete", 10, 30, 100, 35, () => this.cont.deleteButton(), GuiButton.ORANGE);
    this.m_fixedJointPanel.addChild(this.m_deleteButton);

    this.m_jointHeader = new Text("");
    this.m_jointHeader.text = "Build Box";
    this.m_jointHeader.anchor.set(0.5);
    this.m_jointHeader.x = 5 + 110 / 2;
    this.m_jointHeader.y = 15 + 20 / 2;
    this.m_jointHeader.style = format;
    this.m_buildBoxPanel.addChild(this.m_jointHeader);
    this.m_backButton = new GuiButton("X", 90, -5, 35, 35, () => this.backButton(), GuiButton.X);
    this.m_buildBoxPanel.addChild(this.m_backButton);
    this.m_deleteButton = new GuiButton(
      "Delete",
      10,
      30,
      100,
      35,
      () => this.cont.deleteBuildBoxButton(),
      GuiButton.ORANGE
    );
    this.m_buildBoxPanel.addChild(this.m_deleteButton);

    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.align = "center";
    format.fontSize = 14;
    format.fill = "#242930";
    this.m_thrustersHeader = new Text("");
    this.m_thrustersHeader.text = "Thrusters";
    this.m_thrustersHeader.anchor.set(0.5);
    this.m_thrustersHeader.x = 5 + 110 / 2;
    this.m_thrustersHeader.y = 15 + 20 / 2;
    this.m_thrustersHeader.style = format;
    this.m_thrustersEditPanel.addChild(this.m_thrustersHeader);
    this.m_backButton = new GuiButton("X", 90, -5, 35, 35, () => this.backButton(), GuiButton.X);
    this.m_thrustersEditPanel.addChild(this.m_backButton);
    this.m_deleteButton = new GuiButton("Delete", 10, 30, 100, 35, () => this.cont.deleteButton(), GuiButton.ORANGE);
    this.m_thrustersEditPanel.addChild(this.m_deleteButton);
    this.m_cutButton = new GuiButton("Cut", 10, 60, 100, 35, () => this.cont.cutButton(), GuiButton.ORANGE);
    this.m_thrustersEditPanel.addChild(this.m_cutButton);
    this.m_copyButton = new GuiButton("Copy", 10, 90, 100, 35, () => this.cont.copyButton(), GuiButton.ORANGE);
    this.m_thrustersEditPanel.addChild(this.m_copyButton);
    this.m_pasteButton = new GuiButton("Paste", 10, 120, 100, 35, () => this.cont.pasteButton(), GuiButton.ORANGE);
    this.m_pasteButton.stopPropagation = true
    this.m_thrustersEditPanel.addChild(this.m_pasteButton);
    this.m_rotateButton = new GuiButton("Rotate", 10, 150, 100, 35, () => this.cont.rotateButton(), GuiButton.BLUE);
    this.m_rotateButton.stopPropagation = true
    this.m_thrustersEditPanel.addChild(this.m_rotateButton);
    format = new TextStyle();
    format.fontSize = 10;
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#242930";
    this.m_thrustLabel = new Text("");
    this.m_thrustLabel.text = "Thruster Strength";
    this.m_thrustLabel.style = format;
    this.m_thrustLabel.anchor.set(0, 0.5);
    this.m_thrustLabel.x = 21;
    this.m_thrustLabel.y = 190 + 20 / 2;
    this.m_thrustLabel.style = format;
    this.m_thrustersEditPanel.addChild(this.m_thrustLabel);
    this.m_thrustSlider = new GuiSlider();
    this.m_thrustSlider.x = 20;
    this.m_thrustSlider.y = 207;
    this.m_thrustSlider.minValue = 1.0;
    this.m_thrustSlider.maxValue = 30.0;
    this.m_thrustSlider.value = 15.0;
    this.m_thrustSlider.on("change", (event: any) => this.cont.thrustSlider(event));
    // this.m_thrustSlider.addEventListener(SliderEvent.THUMB_PRESS, this.sliderClicked(event));
    // this.m_thrustSlider.addEventListener(SliderEvent.THUMB_RELEASE, this.sliderReleased(event));
    this.m_thrustersEditPanel.addChild(this.m_thrustSlider);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 10;
    this.m_thrustArea = new GuiTextInput(35, 224, 50, 15, format);
    this.m_thrustArea.text = "10";
    this.m_thrustArea.maxLength = 5;
    this.m_thrustArea.on("click", (event: any) => this.thrustFocus(event));
    this.m_thrustArea.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_thrustArea.on("change", (event: any) => this.cont.textEntered());
    this.m_thrustArea.on("blur", (event: any) => this.cont.thrustText(event));
    this.m_thrustArea.on("hide", (event: any) => this.cont.thrustText(event));
    this.m_thrustersEditPanel.addChild(this.m_thrustArea);
    this.m_thrustKeyArea = new GuiTextInput(65, 259, 37, 15, format);
    this.m_thrustKeyArea.editable = true;
    this.m_thrustKeyArea.on("click", (event: any) => this.thrustKeyFocus(event));
    this.m_thrustKeyArea.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_thrustKeyArea.on("keyup", (input: GuiTextInput, code: number) => this.cont.thrustKeyText(input, code));
    this.m_thrustKeyArea.on("blur", (event: any) => this.TextAreaLostFocus(event));
    this.m_thrustKeyArea.on("hide", (event: any) => this.TextAreaLostFocus(event));
    this.m_thrustersEditPanel.addChild(this.m_thrustKeyArea);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = 0x242930;
    format.align = "right";
    format.fontSize = 12;
    this.m_thrustKeyLabel = new Text("");
    this.m_thrustKeyLabel.text = "Activate:";
    this.m_thrustKeyLabel.anchor.set(0.5);
    this.m_thrustKeyLabel.x = 7 + 55 / 2;
    this.m_thrustKeyLabel.y = 258 + 20 / 2;
    this.m_thrustKeyLabel.style = format;
    this.m_thrustersEditPanel.addChild(this.m_thrustKeyLabel);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 10;
    format.fill = 0x242930;
    this.m_autoBox3 = new GuiCheckBox(5, 290, 120);
    this.m_autoBox3.style = format;
    this.m_autoBox3.disabledStyle = format;
    this.m_autoBox3.label = "Auto-On";
    this.m_autoBox3.selected = false;
    this.m_autoBox3.on("change", (event: any) => this.cont.autoBox1(event));
    this.m_thrustersEditPanel.addChild(this.m_autoBox3);

    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.align = "center";
    format.fontSize = 14;
    this.m_jointHeader = new Text("");
    this.m_jointHeader.text = "Rotating Joint";
    this.m_jointHeader.anchor.set(0.5);
    this.m_jointHeader.x = 5 + 110 / 2;
    this.m_jointHeader.y = 15 + 20 / 2;
    this.m_jointHeader.style = format;
    this.m_jointEditPanel.addChild(this.m_jointHeader);
    this.m_backButton = new GuiButton("X", 90, -5, 35, 35, () => this.backButton(), GuiButton.X);
    this.m_jointEditPanel.addChild(this.m_backButton);
    this.m_deleteButton = new GuiButton("Delete", 10, 30, 100, 35, () => this.cont.deleteButton(), GuiButton.ORANGE);
    this.m_jointEditPanel.addChild(this.m_deleteButton);
    this.m_cutButton = new GuiButton("Cut", 10, 60, 100, 35, () => this.cont.cutButton(), GuiButton.ORANGE);
    this.m_jointEditPanel.addChild(this.m_cutButton);
    this.m_copyButton = new GuiButton("Copy", 10, 90, 100, 35, () => this.cont.copyButton(), GuiButton.ORANGE);
    this.m_jointEditPanel.addChild(this.m_copyButton);
    this.m_pasteButton = new GuiButton("Paste", 10, 120, 100, 35, () => this.cont.pasteButton(), GuiButton.ORANGE);
    this.m_pasteButton.stopPropagation = true
    this.m_jointEditPanel.addChild(this.m_pasteButton);
    format = new TextStyle();
    format.fontSize = 9;
    this.m_minDispArea = new GuiTextInput(42, 409, 30, 15, format);
    this.m_minDispArea.text = "None";
    this.m_minDispArea.maxLength = 4;
    this.m_minDispArea.on("click", (event: any) => this.minDispFocus(event));
    this.m_minDispArea.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_minDispArea.on("change", (event: any) => this.cont.textEntered());
    this.m_minDispArea.on("blur", (event: any) => this.cont.minLimitText(event));
    this.m_minDispArea.on("hide", (event: any) => this.cont.minLimitText(event));
    this.m_jointEditPanel.addChild(this.m_minDispArea);
    this.m_maxDispArea = new GuiTextInput(42, 444, 30, 15, format);
    this.m_maxDispArea.text = "None";
    this.m_maxDispArea.maxLength = 4;
    this.m_maxDispArea.on("click", (event: any) => this.maxDispFocus(event));
    this.m_maxDispArea.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_maxDispArea.on("change", (event: any) => this.cont.textEntered());
    this.m_maxDispArea.on("blur", (event: any) => this.cont.maxLimitText(event));
    this.m_maxDispArea.on("hide", (event: any) => this.cont.maxLimitText(event));
    this.m_jointEditPanel.addChild(this.m_maxDispArea);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 9;
    format.fill = 0x242930;
    this.m_enableMotorBox = new GuiCheckBox(5, 152, 120);
    this.m_enableMotorBox.style = format;
    this.m_enableMotorBox.label = "Enable Motor";
    this.m_enableMotorBox.selected = false;
    this.m_enableMotorBox.on("change", (event: any) => this.cont.motorBox(event));
    this.m_jointEditPanel.addChild(this.m_enableMotorBox);
    this.m_rigidJointBox = new GuiCheckBox(5, 284, 120);
    this.m_rigidJointBox.style = format;
    this.m_rigidJointBox.disabledStyle = disabledFormat;
    this.m_rigidJointBox.label = "Floppy Joint";
    this.m_rigidJointBox.selected = true;
    this.m_rigidJointBox.on("change", (event: any) => this.cont.rigidBox(event));
    this.m_jointEditPanel.addChild(this.m_rigidJointBox);
    this.m_autoBox1 = new GuiCheckBox(5, 347, 120);
    this.m_autoBox1.style = format;
    this.m_autoBox1.disabledStyle = disabledFormat;
    this.m_autoBox1.label = "Auto-On CW";
    this.m_autoBox1.selected = false;
    this.m_autoBox1.on("change", (event: any) => this.cont.autoBox1(event));
    this.m_jointEditPanel.addChild(this.m_autoBox1);
    this.m_autoBox2 = new GuiCheckBox(5, 367, 120);
    this.m_autoBox2.style = format;
    this.m_autoBox2.disabledStyle = disabledFormat;
    this.m_autoBox2.label = "Auto-On CCW";
    this.m_autoBox2.selected = false;
    this.m_autoBox2.on("change", (event: any) => this.cont.autoBox2(event));
    this.m_jointEditPanel.addChild(this.m_autoBox2);
    this.m_outlineBox2 = new GuiCheckBox(5, 472, 120);
    this.m_outlineBox2.style = format;
    this.m_outlineBox2.label = "Show Outlines";
    this.m_outlineBox2.selected = false;
    this.m_outlineBox2.on("change", (event: any) => this.cont.outlineBox(event));
    this.m_jointEditPanel.addChild(this.m_outlineBox2);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = 0x242930;
    this.m_strengthLabel = new Text("");
    this.m_strengthLabel.text = "Motor Strength";
    this.m_strengthLabel.anchor.set(0.5);
    this.m_strengthLabel.style = format;
    this.m_strengthLabel.x = 120 / 2;
    this.m_strengthLabel.y = 177 + 20 / 2;
    this.m_strengthLabel.style = format;
    this.m_jointEditPanel.addChild(this.m_strengthLabel);
    this.m_speedLabel = new Text("");
    this.m_speedLabel.text = "Motor Speed";
    this.m_speedLabel.style = format;
    this.m_speedLabel.anchor.set(0.5);
    this.m_speedLabel.x = 120 / 2;
    this.m_speedLabel.y = 232 + 20 / 2;
    this.m_speedLabel.style = format;
    this.m_jointEditPanel.addChild(this.m_speedLabel);
    this.m_strengthSlider = new GuiSlider();
    this.m_strengthSlider.x = 20;
    this.m_strengthSlider.y = 192;
    this.m_strengthSlider.minValue = 1.0;
    this.m_strengthSlider.maxValue = 30.0;
    this.m_strengthSlider.value = 15.0;
    this.m_strengthSlider.on("change", (event: any) => this.cont.strengthSlider(event));
    // this.m_strengthSlider.addEventListener(SliderEvent.THUMB_PRESS, this.sliderClicked(event));
    // this.m_strengthSlider.addEventListener(SliderEvent.THUMB_RELEASE, this.sliderReleased(event));
    this.m_jointEditPanel.addChild(this.m_strengthSlider);
    this.m_speedSlider = new GuiSlider();
    this.m_speedSlider.x = 20;
    this.m_speedSlider.y = 247;
    this.m_speedSlider.minValue = 1.0;
    this.m_speedSlider.maxValue = 30.0;
    this.m_speedSlider.value = 15.0;
    this.m_speedSlider.on("change", (event: any) => this.cont.speedSlider(event));
    // this.m_speedSlider.addEventListener(SliderEvent.THUMB_PRESS, this.sliderClicked(event));
    // this.m_speedSlider.addEventListener(SliderEvent.THUMB_RELEASE, this.sliderReleased(event));
    this.m_jointEditPanel.addChild(this.m_speedSlider);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 9;
    this.m_strengthArea = new GuiTextInput(35, 209, 50, 15, format);
    this.m_strengthArea.text = "10";
    this.m_strengthArea.maxLength = 5;
    this.m_strengthArea.height = 15;
    this.m_strengthArea.on("click", (event: any) => this.strengthFocus(event));
    this.m_strengthArea.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_strengthArea.on("change", (event: any) => this.cont.textEntered(event));
    this.m_strengthArea.on("blur", (event: any) => this.cont.strengthText(event));
    this.m_strengthArea.on("hide", (event: any) => this.cont.strengthText(event));
    this.m_jointEditPanel.addChild(this.m_strengthArea);
    this.m_speedArea = new GuiTextInput(35, 264, 50, 15, format);
    this.m_speedArea.text = "10";
    this.m_speedArea.maxLength = 5;
    this.m_speedArea.on("click", (event: any) => this.speedFocus(event));
    this.m_speedArea.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_speedArea.on("change", (event: any) => this.cont.textEntered(event));
    this.m_speedArea.on("blur", (event: any) => this.cont.speedText(event));
    this.m_speedArea.on("hide", (event: any) => this.cont.speedText(event));
    this.m_jointEditPanel.addChild(this.m_speedArea);
    this.m_controlKeyArea1 = new GuiTextInput(70, 306, 30, 15, format);
    this.m_controlKeyArea1.editable = false;
    this.m_controlKeyArea1.on("click", (event: any) => this.controlKey1Focus(event));
    this.m_controlKeyArea1.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_controlKeyArea1.on("keyup", (input: GuiTextInput, code: number) => this.cont.controlKeyText1(input, code));
    this.m_controlKeyArea1.on("blur", (event: any) => this.TextAreaLostFocus(event));
    this.m_controlKeyArea1.on("hide", (event: any) => this.TextAreaLostFocus(event));
    this.m_jointEditPanel.addChild(this.m_controlKeyArea1);
    this.m_controlKeyArea2 = new GuiTextInput(70, 326, 30, 15, format);
    this.m_controlKeyArea2.editable = false;
    this.m_controlKeyArea2.on("click", (event: any) => this.controlKey2Focus(event));
    this.m_controlKeyArea2.on("focus", (event: any) => this.TextAreaGotFocus(event));
    this.m_controlKeyArea2.on("keyup", (input: GuiTextInput, code: number) => this.cont.controlKeyText2(input, code));
    this.m_controlKeyArea2.on("blur", (event: any) => this.TextAreaLostFocus(event));
    this.m_controlKeyArea2.on("hide", (event: any) => this.TextAreaLostFocus(event));
    this.m_jointEditPanel.addChild(this.m_controlKeyArea2);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 12;
    format.fill = "#242930";
    this.m_limitLabel1 = new Text("");
    this.m_limitLabel1.text = "Lower Limit (degrees)";
    this.m_limitLabel1.x = 15;
    this.m_limitLabel1.y = 395;
    this.m_limitLabel1.style = format;
    this.m_jointEditPanel.addChild(this.m_limitLabel1);
    this.m_limitLabel2 = new Text("");
    this.m_limitLabel2.text = "Upper Limit (degrees)";
    this.m_limitLabel2.x = 15;
    this.m_limitLabel2.y = 430;
    this.m_limitLabel2.style = format;
    this.m_jointEditPanel.addChild(this.m_limitLabel2);
    this.m_inputLabel1 = new Text("");
    this.m_inputLabel1.text = "Rotate CW:";
    this.m_inputLabel1.x = 10;
    this.m_inputLabel1.y = 307;
    this.m_inputLabel1.style = format;
    this.m_jointEditPanel.addChild(this.m_inputLabel1);
    this.m_inputLabel2 = new Text("");
    this.m_inputLabel2.text = "Rotate CCW:";
    this.m_inputLabel2.x = 10;
    this.m_inputLabel2.y = 327;
    this.m_inputLabel2.style = format;
    this.m_jointEditPanel.addChild(this.m_inputLabel2);
    this.m_colourButton = new GuiButton("Change Color", 5, 382, 110, 35, () => this.colourButton(), GuiButton.BLUE);
    this.m_jointEditPanel.addChild(this.m_colourButton);
    this.m_frontButton = new GuiButton("Move to Front", 5, 412, 110, 35, () => this.cont.frontButton(), GuiButton.PINK);
    this.m_jointEditPanel.addChild(this.m_frontButton);
    this.m_backButton = new GuiButton("Move to Back", 5, 442, 110, 35, () => this.cont.backButton(), GuiButton.PINK);
    this.m_jointEditPanel.addChild(this.m_backButton);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 9;
    format.fill = 0x242930;
    this.m_collisionBox3 = new GuiCheckBox(5, 367, 120);
    this.m_collisionBox3.style = format;
    this.m_collisionBox3.disabledStyle = disabledFormat;
    this.m_collisionBox3.label = "Collides";
    this.m_collisionBox3.selected = true;
    this.m_collisionBox3.on("click", (event: any) => this.cont.collisionBox(event));
    this.m_jointEditPanel.addChild(this.m_collisionBox3);
  }

  public backButton(): void {
    this.visible = false;
  }

  private colourButton(): void {
    this.m_colourWindow.visible = true;
    this.m_colourWindow.SetVals();
  }

  public DisableStuffForShapesLevel(): void {
    this.m_densitySlider.enabled = false;
    this.m_densityArea.enabled = false;
    this.m_densityArea.focusEnabled = false;
    this.m_densityArea.editable = false;
    this.m_collisionBox.enabled = false;
    this.m_cameraBox.enabled = false;
    this.m_undragableBox.enabled = false;
    this.m_collisionBox2.enabled = false;
    this.m_collisionBox3.enabled = false;
    this.m_undragableBox2.enabled = false;
  }

  public DisableStuffForCarLevel(): void {
    this.m_densitySlider.enabled = false;
    this.m_densityArea.enabled = false;
    this.m_densityArea.focusEnabled = false;
    this.m_densityArea.editable = false;
    this.m_collisionBox.enabled = false;
    this.m_cameraBox.enabled = false;
    this.m_undragableBox.enabled = false;
    this.m_collisionBox2.enabled = false;
    this.m_collisionBox3.enabled = false;
    this.m_undragableBox2.enabled = false;

    this.m_minDispArea.enabled = false;
    this.m_minDispArea.focusEnabled = false;
    this.m_minDispArea.editable = false;
    this.m_maxDispArea.enabled = false;
    this.m_maxDispArea.focusEnabled = false;
    this.m_maxDispArea.editable = false;
    this.m_rigidJointBox.enabled = false;
    this.m_autoBox1.enabled = false;
    this.m_autoBox2.enabled = false;
    this.m_controlKeyArea1.enabled = false;
    this.m_controlKeyArea1.focusEnabled = false;
    this.m_controlKeyArea1.editable = false;
    this.m_controlKeyArea2.enabled = false;
    this.m_controlKeyArea2.focusEnabled = false;
    this.m_controlKeyArea2.editable = false;
    this.m_speedSlider.enabled = false;
    this.m_strengthSlider.enabled = false;
    this.m_speedArea.enabled = false;
    this.m_speedArea.focusEnabled = false;
    this.m_speedArea.editable = false;
    this.m_strengthArea.enabled = false;
    this.m_strengthArea.focusEnabled = false;
    this.m_strengthArea.editable = false;
  }

  public DisableStuffForJumpbotLevel(): void {
    this.m_collisionBox.enabled = false;
    this.m_cameraBox.enabled = false;
    this.m_undragableBox.enabled = false;
    this.m_collisionBox2.enabled = false;
    this.m_collisionBox3.enabled = false;
    this.m_undragableBox2.enabled = false;

    this.m_minDispArea.enabled = false;
    this.m_minDispArea.focusEnabled = false;
    this.m_minDispArea.editable = false;
    this.m_maxDispArea.enabled = false;
    this.m_maxDispArea.focusEnabled = false;
    this.m_maxDispArea.editable = false;
    this.m_rigidJointBox.enabled = false;
    this.m_autoBox1.enabled = false;
    this.m_autoBox2.enabled = false;
    this.m_controlKeyArea1.enabled = false;
    this.m_controlKeyArea1.focusEnabled = false;
    this.m_controlKeyArea1.editable = false;
    this.m_controlKeyArea2.enabled = false;
    this.m_controlKeyArea2.focusEnabled = false;
    this.m_controlKeyArea2.editable = false;
  }

  public DisableStuffForDumpbotLevel(): void {
    this.m_collisionBox.enabled = false;
    this.m_cameraBox.enabled = false;
    this.m_undragableBox.enabled = false;
    this.m_collisionBox2.enabled = false;
    this.m_collisionBox3.enabled = false;
    this.m_undragableBox2.enabled = false;

    this.m_minDispArea.enabled = false;
    this.m_minDispArea.focusEnabled = false;
    this.m_minDispArea.editable = false;
    this.m_maxDispArea.enabled = false;
    this.m_maxDispArea.focusEnabled = false;
    this.m_maxDispArea.editable = false;
    this.m_autoBox1.enabled = false;
    this.m_autoBox2.enabled = false;
  }

  public DisableStuffForCatapultLevel(): void {
    this.m_collisionBox.enabled = false;
    this.m_undragableBox.enabled = false;
    this.m_collisionBox2.enabled = false;
    this.m_collisionBox3.enabled = false;
    this.m_undragableBox2.enabled = false;

    this.m_autoBox1.enabled = false;
    this.m_autoBox2.enabled = false;
    this.m_controlKeyArea1.enabled = false;
    this.m_controlKeyArea1.focusEnabled = false;
    this.m_controlKeyArea1.editable = false;
    this.m_controlKeyArea2.enabled = false;
    this.m_controlKeyArea2.focusEnabled = false;
    this.m_controlKeyArea2.editable = false;
  }

  public DisableStuffForHomeMoviesLevel(): void {
    this.m_collisionBox.enabled = false;
    this.m_undragableBox.enabled = false;
    this.m_collisionBox2.enabled = false;
    this.m_collisionBox3.enabled = false;
    this.m_undragableBox2.enabled = false;

    this.m_autoBox1.enabled = false;
    this.m_autoBox2.enabled = false;
  }

  public ShowObjectPanel(shape: ShapePart): void {
    this.visible = true;
    this.m_colourWindow.visible = false;
    this.m_fixedJointPanel.visible = false;
    this.m_jointEditPanel.visible = false;
    this.m_objectEditPanel.visible = true;
    this.m_textEditPanel.visible = false;
    this.m_thrustersEditPanel.visible = false;
    this.m_multiEditPanel.visible = false;
    this.m_buildBoxPanel.visible = false;
    this.m_cannonPanel.visible = false;
    this.m_densitySlider.value = shape.density;
    this.m_densitySlider.minValue = ControllerGameGlobals.minDensity;
    this.m_densitySlider.maxValue = ControllerGameGlobals.maxDensity;
    this.m_densityArea.text = shape.density.toString();
    this.m_collisionBox.selected = shape.collide;
    this.m_collisionBox.visible =
      this.cont.controllerType === "sandbox" ||
      (this.cont.controllerType === "challenge" &&
        (ControllerChallenge.challenge.nonCollidingAllowed || !ControllerChallenge.playChallengeMode));
    this.m_fixateBox.selected = shape.isStatic;
    this.m_fixateBox.visible =
      this.cont.controllerType === "sandbox" ||
      (this.cont.controllerType === "challenge" &&
        (ControllerChallenge.challenge.fixateAllowed || !ControllerChallenge.playChallengeMode));
    this.m_cameraBox.selected = shape.isCameraFocus;
    this.m_outlineBox.selected = shape.outline;
    this.m_terrainBox.selected = shape.terrain;
    this.m_undragableBox.selected = shape.undragable;
    if (shape instanceof Circle) this.m_shapeHeader.text = "Circle";
    if (shape instanceof Rectangle) this.m_shapeHeader.text = "Rectangle";
    if (shape instanceof Triangle) this.m_shapeHeader.text = "Triangle";
    var format: TextStyle = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 14;
    format.align = "center";
    this.m_shapeHeader.style = format;
  }

  public ShowCannonPanel(cannon: Cannon): void {
    this.visible = true;
    this.m_colourWindow.visible = false;
    this.m_fixedJointPanel.visible = false;
    this.m_jointEditPanel.visible = false;
    this.m_objectEditPanel.visible = false;
    this.m_textEditPanel.visible = false;
    this.m_thrustersEditPanel.visible = false;
    this.m_multiEditPanel.visible = false;
    this.m_buildBoxPanel.visible = false;
    this.m_cannonPanel.visible = true;
    this.m_densitySlider7.value = cannon.density;
    this.m_densityArea7.text = cannon.density.toString();
    this.m_collisionBox7.selected = cannon.collide;
    this.m_collisionBox7.visible =
      (this.cont.controllerType === "sandbox" && !(this.cont.controllerType === "challenge")) ||
      (this.cont.controllerType === "challenge" &&
        (ControllerChallenge.challenge.nonCollidingAllowed || !ControllerChallenge.playChallengeMode));
    this.m_fixateBox7.selected = cannon.isStatic;
    this.m_fixateBox7.visible =
      (this.cont.controllerType === "sandbox" && !(this.cont.controllerType === "challenge")) ||
      (this.cont.controllerType === "challenge" &&
        (ControllerChallenge.challenge.fixateAllowed || !ControllerChallenge.playChallengeMode));
    this.m_outlineBox7.selected = cannon.outline;
    this.m_terrainBox7.selected = cannon.terrain;
    this.m_undragableBox7.selected = cannon.undragable;
    this.m_cannonHeader.text = "Cannon";
    var format: TextStyle = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 14;
    format.align = "center";
    this.m_cannonHeader.style = format;
    this.m_strengthSlider7.value = cannon.strength;
    this.m_strengthArea7.text = cannon.strength + "";
    var str: string = Input.getKeyString(cannon.fireKey);
    if (str == null) str = "Unk: " + cannon.fireKey;
    this.m_fireKeyArea.text = str;
  }

  public ShowTextPanel(text: TextPart): void {
    this.visible = true;
    this.m_colourWindow.visible = false;
    this.m_fixedJointPanel.visible = false;
    this.m_jointEditPanel.visible = false;
    this.m_objectEditPanel.visible = false;
    this.m_thrustersEditPanel.visible = false;
    this.m_multiEditPanel.visible = false;
    this.m_textEditPanel.visible = true;
    this.m_buildBoxPanel.visible = false;
    this.m_cannonPanel.visible = false;
    this.m_alwaysVisibleBox.selected = text.alwaysVisible;
    this.m_scaleWithZoomBox.selected = text.scaleWithZoom;
    this.m_textKeyArea.enabled = !text.alwaysVisible;
    var str: string = Input.getKeyString(text.displayKey);
    if (str == null) str = "Unk: " + text.displayKey;
    this.m_textKeyArea.text = str;
    this.m_textArea.text = text.text;
    this.m_sizeArea.text = text.size + "";
  }

  public ShowMultiSelectPanel(parts: Array<any>): void {
    this.visible = true;
    this.m_colourWindow.visible = false;
    this.m_fixedJointPanel.visible = false;
    this.m_jointEditPanel.visible = false;
    this.m_objectEditPanel.visible = false;
    this.m_thrustersEditPanel.visible = false;
    this.m_multiEditPanel.visible = true;
    this.m_textEditPanel.visible = false;
    this.m_cannonPanel.visible = false;
    this.m_outlineBox3.selected = true;
    this.m_terrainBox3.selected = false;
    this.m_fixateBox2.selected = false;
    this.m_undragableBox2.selected = false;
    this.m_collisionBox2.selected = true;
    this.m_collisionBox2.visible =
      (this.cont.controllerType === "sandbox" && !(this.cont.controllerType === "challenge")) ||
      (this.cont.controllerType === "challenge" &&
        (ControllerChallenge.challenge.nonCollidingAllowed || !ControllerChallenge.playChallengeMode));
    this.m_fixateBox2.visible =
      (this.cont.controllerType === "sandbox" && !(this.cont.controllerType === "challenge")) ||
      (this.cont.controllerType === "challenge" &&
        (ControllerChallenge.challenge.fixateAllowed || !ControllerChallenge.playChallengeMode));
    this.m_buildBoxPanel.visible = false;
    for (var i: number = 0; i < parts.length; i++) {
      if (
        (parts[i] instanceof ShapePart && !parts[i].outline) ||
        (parts[i] instanceof PrismaticJoint && !parts[i].outline)
      )
        this.m_outlineBox3.selected = false;
      if (parts[i] instanceof ShapePart && parts[i].terrain) this.m_terrainBox3.selected = true;
      if (parts[i] instanceof ShapePart && parts[i].isStatic) this.m_fixateBox2.selected = true;
      if (parts[i] instanceof ShapePart && parts[i].undragable) this.m_undragableBox2.selected = true;
      if (parts[i] instanceof ShapePart && !parts[i].collide) this.m_collisionBox2.selected = false;
    }
  }

  public ShowJointPanel(joint: JointPart): void {
    this.visible = true;
    this.m_colourWindow.visible = false;
    this.m_objectEditPanel.visible = false;
    this.m_fixedJointPanel.visible = false;
    this.m_jointEditPanel.visible = true;
    this.m_thrustersEditPanel.visible = false;
    this.m_multiEditPanel.visible = false;
    this.m_textEditPanel.visible = false;
    this.m_buildBoxPanel.visible = false;
    this.m_cannonPanel.visible = false;

    var isRevolute: boolean = joint instanceof RevoluteJoint;
    var str: string;
    var format: TextStyle;
    if (isRevolute) {
      var rjoint: RevoluteJoint = joint as RevoluteJoint;
      this.m_enableMotorBox.selected = rjoint.enableMotor;
      this.m_rigidJointBox.selected = !rjoint.isStiff;
      this.m_strengthLabel.text = "Motor Strength";
      this.m_strengthSlider.value = rjoint.motorStrength;
      this.m_strengthSlider.enabled = rjoint.enableMotor;
      this.m_strengthSlider.maxValue = ControllerGameGlobals.maxRJStrength;
      this.m_strengthArea.text = rjoint.motorStrength + "";
      this.m_speedLabel.text = "Motor Speed";
      this.m_speedSlider.value = rjoint.motorSpeed;
      this.m_speedSlider.enabled = rjoint.enableMotor;
      this.m_speedSlider.maxValue = ControllerGameGlobals.maxRJSpeed;
      this.m_speedArea.text = rjoint.motorSpeed + "";
      this.m_autoBox1.selected = rjoint.autoCW;
      this.m_autoBox2.selected = rjoint.autoCCW;
      this.m_limitLabel1.visible = true;
      this.m_minDispArea.visible = true;
      this.m_limitLabel2.visible = true;
      this.m_maxDispArea.visible = true;
      if (rjoint.motorLowerLimit == -Number.MAX_VALUE) this.m_minDispArea.text = "None";
      else this.m_minDispArea.text = String(rjoint.motorLowerLimit);
      if (rjoint.motorUpperLimit == Number.MAX_VALUE) this.m_maxDispArea.text = "None";
      else this.m_maxDispArea.text = String(rjoint.motorUpperLimit);
      this.m_inputLabel1.text = "Rotate CW:";
      str = Input.getKeyString(rjoint.motorCWKey);
      if (str == null) str = "Unk: " + rjoint.motorCWKey;
      this.m_controlKeyArea1.text = str;
      this.m_controlKeyArea1.enabled = rjoint.enableMotor;
      this.m_controlKeyArea1.focusEnabled = rjoint.enableMotor;
      this.m_inputLabel2.text = "Rotate CCW:";
      str = Input.getKeyString(rjoint.motorCCWKey);
      if (str == null) str = "Unk: " + rjoint.motorCCWKey;
      this.m_controlKeyArea2.text = str;
      this.m_controlKeyArea2.enabled = rjoint.enableMotor;
      this.m_controlKeyArea2.focusEnabled = rjoint.enableMotor;
      this.m_rigidJointBox.enabled = rjoint.enableMotor;
      this.m_rigidJointBox.focusEnabled = rjoint.enableMotor;
      this.m_strengthArea.enabled = rjoint.enableMotor;
      this.m_strengthArea.editable = rjoint.enableMotor;
      this.m_strengthArea.focusEnabled = rjoint.enableMotor;
      this.m_speedArea.enabled = rjoint.enableMotor;
      this.m_speedArea.focusEnabled = rjoint.enableMotor;
      this.m_speedArea.editable = rjoint.enableMotor;
      this.m_autoBox1.enabled = rjoint.enableMotor;
      this.m_autoBox2.enabled = rjoint.enableMotor;
      this.m_inputLabel1.x = 10;
      this.m_inputLabel2.x = 10;
      this.m_controlKeyArea1.x = 70;
      this.m_controlKeyArea2.x = 70;
      this.m_autoBox1.label = "Auto-On CW";
      this.m_autoBox2.visible = true;
      this.m_colourButton.visible = false;
      this.m_frontButton.visible = false;
      this.m_backButton.visible = false;
      this.m_outlineBox2.visible = false;
      this.m_collisionBox3.visible = false;
      this.m_jointHeader.text = "Rotating Joint";
      format = new TextStyle();
      format.fontFamily = Main.GLOBAL_FONT;
      format.fontSize = 14;
      format.align = "center";
      this.m_jointHeader.style = format;
    } else if (joint instanceof PrismaticJoint) {
      var pjoint: PrismaticJoint = joint as PrismaticJoint;
      this.m_enableMotorBox.selected = pjoint.enablePiston;
      this.m_rigidJointBox.selected = !pjoint.isStiff;
      this.m_strengthLabel.text = "Piston Strength";
      this.m_strengthSlider.value = pjoint.pistonStrength;
      this.m_strengthSlider.enabled = pjoint.enablePiston;
      this.m_strengthSlider.maxValue = ControllerGameGlobals.maxSJStrength;
      this.m_strengthArea.text = pjoint.pistonStrength + "";
      this.m_speedLabel.text = "Piston Speed";
      this.m_speedSlider.value = pjoint.pistonSpeed;
      this.m_speedSlider.enabled = pjoint.enablePiston;
      this.m_speedSlider.maxValue = ControllerGameGlobals.maxSJSpeed;
      this.m_speedArea.text = pjoint.pistonSpeed + "";
      this.m_autoBox1.selected = pjoint.autoOscillate;
      this.m_outlineBox2.selected = pjoint.outline;
      this.m_limitLabel1.visible = false;
      this.m_minDispArea.visible = false;
      this.m_limitLabel2.visible = false;
      this.m_maxDispArea.visible = false;
      this.m_inputLabel1.text = "Expand:";
      str = Input.getKeyString(pjoint.pistonUpKey);
      if (str == null) str = "Unk: " + pjoint.pistonUpKey;
      this.m_controlKeyArea1.text = str;
      this.m_controlKeyArea1.enabled = pjoint.enablePiston;
      this.m_controlKeyArea1.focusEnabled = pjoint.enablePiston;
      this.m_inputLabel2.text = "Contract:";
      str = Input.getKeyString(pjoint.pistonDownKey);
      if (str == null) str = "Unk: " + pjoint.pistonDownKey;
      this.m_controlKeyArea2.text = str;
      this.m_controlKeyArea2.enabled = pjoint.enablePiston;
      this.m_controlKeyArea2.focusEnabled = pjoint.enablePiston;
      this.m_rigidJointBox.enabled = pjoint.enablePiston;
      this.m_rigidJointBox.focusEnabled = pjoint.enablePiston;
      this.m_strengthArea.enabled = pjoint.enablePiston;
      this.m_strengthArea.editable = pjoint.enablePiston;
      this.m_strengthArea.focusEnabled = pjoint.enablePiston;
      this.m_speedArea.enabled = pjoint.enablePiston;
      this.m_speedArea.focusEnabled = pjoint.enablePiston;
      this.m_speedArea.editable = pjoint.enablePiston;
      this.m_autoBox1.enabled = pjoint.enablePiston;
      this.m_inputLabel1.x += 5;
      this.m_inputLabel2.x += 5;
      this.m_controlKeyArea1.x = 60;
      this.m_controlKeyArea2.x = 60;
      this.m_autoBox1.label = "Auto Oscillate";
      this.m_autoBox2.visible = false;
      this.m_colourButton.visible = true;
      this.m_frontButton.visible = true;
      this.m_backButton.visible = true;
      this.m_outlineBox2.visible = true;
      this.m_collisionBox3.visible =
        (this.cont.controllerType === "sandbox" && !(this.cont.controllerType === "challenge")) ||
        (this.cont.controllerType === "challenge" &&
          (ControllerChallenge.challenge.nonCollidingAllowed || !ControllerChallenge.playChallengeMode));
      this.m_collisionBox3.selected = pjoint.collide;
      this.m_jointHeader.text = "Sliding Joint";
      format = new TextStyle();
      format.fontFamily = Main.GLOBAL_FONT;
      format.fontSize = 14;
      format.align = "center";
      this.m_jointHeader.style = format;
    } else {
      this.m_fixedJointPanel.visible = true;
      this.m_jointEditPanel.visible = false;
    }
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 9;
    format.fill = "#242930";
    this.m_limitLabel1.style = format;
    this.m_limitLabel2.style = format;
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 9;
    format.fill = "#242930";
    format.align = "right";
    this.m_inputLabel1.style = format;
    this.m_inputLabel2.style = format;
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 9;
    format.fill = "#242930";
    this.m_speedLabel.style = format;
    this.m_strengthLabel.style = format;

    this.m_inputLabel1.visible =
      !(this.cont.controllerType === "challenge") ||
      !ControllerChallenge.playChallengeMode ||
      (this.cont.controllerType === "challenge" && ControllerChallenge.challenge.botControlAllowed);
    this.m_inputLabel2.visible =
      !(this.cont.controllerType === "challenge") ||
      !ControllerChallenge.playChallengeMode ||
      (this.cont.controllerType === "challenge" && ControllerChallenge.challenge.botControlAllowed);
    this.m_controlKeyArea1.visible =
      !(this.cont.controllerType === "challenge") ||
      !ControllerChallenge.playChallengeMode ||
      (this.cont.controllerType === "challenge" && ControllerChallenge.challenge.botControlAllowed);
    this.m_controlKeyArea2.visible =
      !(this.cont.controllerType === "challenge") ||
      !ControllerChallenge.playChallengeMode ||
      (this.cont.controllerType === "challenge" && ControllerChallenge.challenge.botControlAllowed);
  }

  public ShowThrustersPanel(t: Thrusters): void {
    this.visible = true;
    this.m_colourWindow.visible = false;
    this.m_objectEditPanel.visible = false;
    this.m_fixedJointPanel.visible = false;
    this.m_jointEditPanel.visible = false;
    this.m_thrustersEditPanel.visible = true;
    this.m_multiEditPanel.visible = false;
    this.m_textEditPanel.visible = false;
    this.m_buildBoxPanel.visible = false;
    this.m_cannonPanel.visible = false;

    this.m_autoBox3.selected = t.autoOn;
    this.m_thrustSlider.value = t.strength;
    this.m_thrustSlider.maxValue = ControllerGameGlobals.maxThrusterStrength;
    this.m_thrustArea.text = t.strength + "";
    var str: string = Input.getKeyString(t.thrustKey);
    if (str == null) str = "Unk: " + t.thrustKey;
    this.m_thrustKeyArea.text = str;

    this.m_thrustKeyLabel.visible =
      !(this.cont.controllerType === "challenge") ||
      !ControllerChallenge.playChallengeMode ||
      (this.cont.controllerType === "challenge" && ControllerChallenge.challenge.botControlAllowed);
    this.m_thrustKeyArea.visible =
      !(this.cont.controllerType === "challenge") ||
      !ControllerChallenge.playChallengeMode ||
      (this.cont.controllerType === "challenge" && ControllerChallenge.challenge.botControlAllowed);
  }

  public ShowBuildBoxPanel(): void {
    this.visible = true;
    this.m_colourWindow.visible = false;
    this.m_objectEditPanel.visible = false;
    this.m_fixedJointPanel.visible = false;
    this.m_jointEditPanel.visible = false;
    this.m_thrustersEditPanel.visible = false;
    this.m_multiEditPanel.visible = false;
    this.m_textEditPanel.visible = false;
    this.m_buildBoxPanel.visible = true;
    this.m_cannonPanel.visible = false;
  }

  public TextAreaGotFocus(e: Event = null): void {
    this.enteringInput = true;
  }

  public TextAreaLostFocus(e: Event = null): void {
    this.enteringInput = false;
  }

  public sliderClicked(e: Event): void {
    this.sliderDown = true;
  }

  public sliderReleased(e: Event): void {
    this.sliderDown = false;
  }

  public EnteringInput(): boolean {
    if (!this.visible) this.enteringInput = false;
    return this.enteringInput;
  }

  public SetDensity(density: number): void {
    this.m_densityArea.text = density.toString();
    this.m_densitySlider.value = density;
    this.m_densityArea7.text = density.toString();
    this.m_densitySlider7.value = density;
  }

  public SetStrength(strength: number): void {
    this.m_strengthArea.text = strength.toString();
    this.m_strengthSlider.value = strength;
  }

  public SetSpeed(speed: number): void {
    this.m_speedArea.text = speed.toString();
    this.m_speedSlider.value = speed;
  }

  public SetThrust(thrust: number): void {
    this.m_thrustArea.text = thrust.toString();
    this.m_thrustSlider.value = thrust;
  }

  public SetCannon(strength: number): void {
    this.m_strengthArea7.text = strength.toString();
    this.m_strengthSlider7.value = strength;
  }

  public EnableMotorStuff(enable: boolean): void {
    this.m_strengthSlider.enabled = enable;
    this.m_speedSlider.enabled = enable;
    this.m_controlKeyArea1.enabled = enable;
    this.m_controlKeyArea2.enabled = enable;
    this.m_rigidJointBox.enabled = enable;
    this.m_strengthArea.enabled = enable;
    this.m_strengthArea.editable = enable;
    this.m_speedArea.enabled = enable;
    this.m_speedArea.editable = enable;
    this.m_autoBox1.enabled = enable;
    this.m_autoBox2.enabled = enable;
  }

  public EnableTextStuff(enable: boolean): void {
    this.m_textKeyArea.enabled = enable;
  }

  public deselectBox2(): void {
    this.m_autoBox2.selected = false;
  }

  public deselectBox1(): void {
    this.m_autoBox1.selected = false;
  }

  public sizeFocus(e: MouseEvent): void {
    this.m_sizeArea.setSelection(0, 4);
  }

  public minDispFocus(e: MouseEvent): void {
    if (this.m_minDispArea.enabled) this.m_minDispArea.setSelection(0, 10);
  }

  public maxDispFocus(e: MouseEvent): void {
    if (this.m_maxDispArea.enabled) this.m_maxDispArea.setSelection(0, 10);
  }

  public densityFocus(e: MouseEvent): void {
    if (this.m_densityArea.enabled) this.m_densityArea.setSelection(0, 10);
  }

  public strengthFocus(e: MouseEvent): void {
    if (this.m_strengthArea.enabled) this.m_strengthArea.setSelection(0, 10);
  }

  public speedFocus(e: MouseEvent): void {
    if (this.m_speedArea.enabled) this.m_speedArea.setSelection(0, 10);
  }

  public thrustFocus(e: MouseEvent): void {
    if (this.m_thrustArea.enabled) this.m_thrustArea.setSelection(0, 10);
  }

  public cannonFocus(e: MouseEvent): void {
    if (this.m_strengthArea7.enabled) this.m_strengthArea7.setSelection(0, 10);
  }

  public controlKey1Focus(e: MouseEvent): void {
    if (this.m_controlKeyArea1.enabled) {
      this.m_controlKeyArea1.setSelection(0, 10);
    }
  }

  public controlKey2Focus(e: MouseEvent): void {
    if (this.m_controlKeyArea2.enabled) {
      this.m_controlKeyArea2.setSelection(0, 10);
    }
  }

  public thrustKeyFocus(e: MouseEvent): void {
    if (this.m_thrustKeyArea.enabled) {
      this.m_thrustKeyArea.setSelection(0, 10);
    }
  }

  public cannonKeyFocus(e: MouseEvent): void {
    if (this.m_fireKeyArea.enabled) {
      this.m_fireKeyArea.setSelection(0, 10);
    }
  }

  public ColourWindowShowing(): boolean {
    return this.visible && this.m_colourWindow.visible;
  }

  public BuildWindowShowing(): boolean {
    return this.visible && this.m_buildBoxPanel.visible;
  }
}
