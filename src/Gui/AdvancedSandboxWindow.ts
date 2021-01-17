import { Sprite, Text, TextStyle } from "pixi.js";
import {
  Controller,
  ControllerGame,
  ControllerMainMenu,
  ControllerSandbox,
  GuiButton,
  GuiCombobox,
  GuiSlider,
  GuiTextInput,
  GuiWindow,
  Main,
  SandboxSettings,
} from "../imports";

export class AdvancedSandboxWindow extends GuiWindow {
  private cont: Controller;

  private sizeBox: GuiCombobox;
  private shapeBox: GuiCombobox;
  private themeBox: GuiCombobox;
  private bgBox: GuiCombobox;
  private redArea: GuiTextInput;
  private greenArea: GuiTextInput;
  private blueArea: GuiTextInput;
  private gravitySlider: GuiSlider;
  private gravityArea: GuiTextInput;
  private okButton: GuiButton;
  private cancelButton: GuiButton;

  constructor(contr: Controller, defaults: SandboxSettings | null = null) {
    super(276, 90, 248, 430);
    this.cont = contr;
    this.sortableChildren = true;
    var format: TextStyle = new TextStyle();

    var t: Text = new Text("");
    t.text = "Advanced Sandbox\nSetup";
    t.x = 248 / 2;
    t.y = 32;
    format.align = "center";
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 18;
    format.fill = "#242930";
    t.style = format;
    t.anchor.set(0.5);
    this.addChild(t);

    t = new Text("");
    t.text = "Sandbox Size:";
    t.x = 20;
    t.y = 77;
    format.fontSize = 12;
    format.align = "left";
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#242930";
    t.style = format;
    this.addChild(t);

    t = new Text("");
    t.text = "Terrain Shape:";
    t.x = 20;
    t.y = 112;
    format.fontSize = 12;
    format.align = "left";
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#242930";
    t.style = format;
    this.addChild(t);

    t = new Text("");
    t.text = "Terrain Theme:";
    t.x = 20;
    t.y = 147;
    format.fontSize = 12;
    format.align = "left";
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#242930";
    t.style = format;
    this.addChild(t);

    t = new Text("");
    t.text = "Background:";
    t.x = 20;
    t.y = 182;
    format.fontSize = 12;
    format.align = "left";
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#242930";
    t.style = format;
    this.addChild(t);

    t = new Text("");
    t.text = "Red:";
    t.x = 130;
    t.y = 210;
    format.fontSize = 11;
    format.align = "left";
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#242930";
    t.style = format;
    this.addChild(t);

    t = new Text("");
    t.text = "Green:";
    t.x = 130;
    t.y = 230;
    format.fontSize = 11;
    format.align = "left";
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#242930";
    t.style = format;
    this.addChild(t);

    t = new Text("");
    t.text = "Blue:";
    t.x = 130;
    t.y = 250;
    format.fontSize = 11;
    format.align = "left";
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#242930";
    t.style = format;
    this.addChild(t);

    t = new Text("");
    t.text = "Gravity:";
    t.x = 45;
    t.y = 280;
    format.fontSize = 12;
    format.align = "center";
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#242930";
    t.style = format;
    this.addChild(t);

    this.sizeBox = new GuiCombobox(110, 70, 130, 32);
    this.sizeBox.addItem({ label: "  Small" });
    this.sizeBox.addItem({ label: "  Medium" });
    this.sizeBox.addItem({ label: "  Large" });
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 12;
    format.fill = "#573D40";
    this.sizeBox.label.style = format;
    if (defaults) this.sizeBox.selectedIndex = defaults.size;
    this.addChild(this.sizeBox);

    this.shapeBox = new GuiCombobox(110, 105, 130, 32);
    this.shapeBox.addItem({ label: "  Flat Land" });
    this.shapeBox.addItem({ label: "  Box" });
    this.shapeBox.addItem({ label: "  Empty" });
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 12;
    format.fill = "#573D40";
    this.shapeBox.label.style = format;
    if (defaults) this.shapeBox.selectedIndex = defaults.terrainType;
    this.addChild(this.shapeBox);

    this.themeBox = new GuiCombobox(110, 140, 130, 32);
    this.themeBox.addItem({ label: "  Grass" });
    this.themeBox.addItem({ label: "  Dirt" });
    this.themeBox.addItem({ label: "  Sand" });
    this.themeBox.addItem({ label: "  Rock" });
    this.themeBox.addItem({ label: "  Snow" });
    this.themeBox.addItem({ label: "  Moon" });
    this.themeBox.addItem({ label: "  Mars" });
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 12;
    format.fill = "#573D40";
    this.themeBox.label.style = format;
    if (defaults) this.themeBox.selectedIndex = defaults.terrainTheme;
    this.addChild(this.themeBox);

    this.bgBox = new GuiCombobox(110, 175, 130, 32);
    this.bgBox.addItem({ label: "  Sky" });
    this.bgBox.addItem({ label: "  Space" });
    this.bgBox.addItem({ label: "  Night" });
    this.bgBox.addItem({ label: "  Dusk" });
    this.bgBox.addItem({ label: "  Mars" });
    this.bgBox.addItem({ label: "  Sunset" });
    this.bgBox.addItem({ label: "  Solid Color" });
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 12;
    format.fill = "#573D40";
    this.bgBox.label.style = format;
    if (defaults) this.bgBox.selectedIndex = defaults.background;
    this.bgBox.on("change", () => this.bgBoxChanged());
    this.addChild(this.bgBox);

    format = new TextStyle();
    format.fontSize = 10;
    this.redArea = new GuiTextInput(170, 210, 30, 20, format);
    this.redArea.text = "125";
    this.redArea.maxLength = 3;
    this.redArea.on("change", (text: string) => this.redText(text));
    this.redArea.enabled = this.bgBox.selectedIndex == 6;
    this.redArea.editable = this.bgBox.selectedIndex == 6;
    if (defaults && this.bgBox.selectedIndex == 6) this.redArea.text = defaults.backgroundR + "";
    this.addChild(this.redArea);
    this.greenArea = new GuiTextInput(170, 230, 30, 20, format);
    this.greenArea.text = "125";
    this.greenArea.maxLength = 3;
    this.greenArea.on("change", (text: string) => this.greenText(text));
    this.greenArea.enabled = this.bgBox.selectedIndex == 6;
    this.greenArea.editable = this.bgBox.selectedIndex == 6;
    if (defaults && this.bgBox.selectedIndex == 6) this.greenArea.text = defaults.backgroundG + "";
    this.addChild(this.greenArea);
    this.blueArea = new GuiTextInput(170, 250, 30, 20, format);
    this.blueArea.text = "255";
    this.blueArea.maxLength = 3;
    this.blueArea.on("change", (text: string) => this.blueText(text));
    this.blueArea.enabled = this.bgBox.selectedIndex == 6;
    this.blueArea.editable = this.bgBox.selectedIndex == 6;
    if (defaults && this.bgBox.selectedIndex == 6) this.blueArea.text = defaults.backgroundB + "";
    this.addChild(this.blueArea);

    this.gravitySlider = new GuiSlider();
    this.gravitySlider.x = 78;
    this.gravitySlider.y = 302;
    this.gravitySlider.minValue = 0.0;
    this.gravitySlider.maxValue = 30.0;
    this.gravitySlider.value = 15.0;
    this.gravitySlider.on("change", (value: number) => this.sliderChange(value));
    if (defaults) this.gravitySlider.value = defaults.gravity;
    this.addChild(this.gravitySlider);
    format = new TextStyle();
    format.fontSize = 10;
    this.gravityArea = new GuiTextInput(114, 320, 30, 20, format);
    this.gravityArea.text = "15";
    if (defaults) this.gravityArea.text = defaults.gravity + "";
    this.gravityArea.maxLength = 5;
    this.gravityArea.on("change", (text: string) => this.gravityText(text));
    this.addChild(this.gravityArea);

    format = new TextStyle();
    format.fontSize = 15;
    this.okButton = new GuiButton("Okay!", 49, 340, 150, 50, this.okButtonPressed.bind(this), GuiButton.PURPLE, format);
    this.addChild(this.okButton);
    format = new TextStyle();
    format.fontSize = 13;
    this.cancelButton = new GuiButton(
      "Cancel",
      74,
      385,
      100,
      35,
      this.cancelButtonPressed.bind(this),
      GuiButton.PURPLE,
      format
    );
    this.addChild(this.cancelButton);
  }

  private cancelButtonPressed(e: MouseEvent): void {
    if (this.cont instanceof ControllerMainMenu) (this.cont as ControllerMainMenu).fader2.visible = false;
    else (this.cont as ControllerGame).m_fader.visible = false;
    this.visible = false;
    this.cont.removeChild(this);
  }

  private okButtonPressed(e: MouseEvent): void {
    var settings: SandboxSettings = new SandboxSettings(
      this.gravitySlider.value,
      this.sizeBox.selectedIndex,
      this.shapeBox.selectedIndex,
      this.themeBox.selectedIndex,
      this.bgBox.selectedIndex,
      parseInt(this.redArea.text),
      parseInt(this.greenArea.text),
      parseInt(this.blueArea.text)
    );
    ControllerSandbox.settings = settings;
    if (this.cont instanceof ControllerMainMenu) Main.changeControllers = true;
    else {
      if (this.cont.controllerType === "challenge") ControllerChallenge.challenge.settings = settings;
      (this.cont as ControllerSandbox).RefreshSandboxSettings();
      (this.cont as ControllerSandbox).m_fader.visible = false;
    }
  }

  private bgBoxChanged(): void {
    this.redArea.enabled = this.bgBox.selectedIndex == 6;
    this.greenArea.enabled = this.bgBox.selectedIndex == 6;
    this.blueArea.enabled = this.bgBox.selectedIndex == 6;
    this.redArea.editable = this.bgBox.selectedIndex == 6;
    this.greenArea.editable = this.bgBox.selectedIndex == 6;
    this.blueArea.editable = this.bgBox.selectedIndex == 6;
  }

  private redText(text: any): void {
    var red: number = parseInt(text);
    if (red < 0) red = 0;
    if (red > 255) red = 255;
    if (isNaN(red)) red = 0;
    this.redArea.text = red + "";
  }

  private greenText(text: any): void {
    var green: number = parseInt(text);
    if (green < 0) green = 0;
    if (green > 255) green = 255;
    if (isNaN(green)) green = 0;
    this.greenArea.text = green + "";
  }

  private blueText(text: any): void {
    var blue: number = parseInt(text);
    if (blue < 0) blue = 0;
    if (blue > 255) blue = 255;
    if (isNaN(blue)) blue = 0;
    this.blueArea.text = blue + "";
  }

  private gravityText(text: any): void {
    var gravity: number = parseInt(text);
    if (gravity < 0.0) gravity = 0.0;
    if (gravity > 30.0) gravity = 30.0;
    if (isNaN(gravity)) gravity = 15.0;
    this.gravityArea.text = text;
    this.gravitySlider.value = gravity;
  }

  private sliderChange(value: number): void {
    this.gravityArea.text = value.toString();
  }

  private refreshMouse(e: Event): void {
    if (e.target == this.bgBox.dropdown || e.target == this.themeBox.dropdown) {
      e.target.height = 140;
    }
    Main.RefreshMouse(stage, e.target as Sprite);
  }
}
