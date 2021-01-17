import { Graphics, Sprite, Text, TextStyle } from "pixi.js";
import { DropDownMenu, Input, Main, Resource } from "../imports";

export class DropDownMenuItem extends Graphics {
  private m_Text: Text;
  private m_width: number;

  private m_checkBoxBase: Sprite = new Sprite();
  private m_checkBoxRoll: Sprite = new Sprite();
  private m_checkBoxClick: Sprite = new Sprite();

  constructor(
    m: DropDownMenu,
    str: string,
    w: number,
    callback: Function,
    checkBox: boolean = false,
    checkBoxChecked: boolean = false
  ) {
    super();
    var style: TextStyle = new TextStyle();
    style.fontFamily = Main.GLOBAL_FONT;
    style.fontSize = 12;
    style.fill = "#242930";
    this.interactive = true;
    this.m_width = w;
    this.m_Text = new Text((checkBox ? "  " : "") + str);
    this.m_Text.x = 10;
    this.m_Text.y = 3;
    this.m_Text.style = style;
    this.addChild(this.m_Text);
    this.on("mouseup", () => callback());
    this.on("mouseup", () => m.HideAll());
    this.on("mouseover", () => this.highlight());
    this.on("mouseout", () => this.deHighlight());

    if (checkBox) {
      if (checkBoxChecked) {
        this.m_checkBoxBase.texture = Resource.cGuiMenuCheckBoxBBase;
        this.addChild(this.m_checkBoxBase);
        this.m_checkBoxRoll.texture = Resource.cGuiMenuCheckBoxBRoll;
        this.m_checkBoxRoll.visible = false;
        this.addChild(this.m_checkBoxRoll);
        this.m_checkBoxClick.texture = Resource.cGuiMenuCheckBoxBClick;
        this.m_checkBoxClick.visible = false;
        this.addChild(this.m_checkBoxClick);
      } else {
        this.m_checkBoxBase.texture = Resource.cGuiMenuCheckBoxABase;
        this.addChild(this.m_checkBoxBase);
        this.m_checkBoxRoll.texture = Resource.cGuiMenuCheckBoxARoll;
        this.m_checkBoxRoll.visible = false;
        this.addChild(this.m_checkBoxRoll);
        this.m_checkBoxClick.texture = Resource.cGuiMenuCheckBoxAClick;
        this.m_checkBoxClick.visible = false;
        this.addChild(this.m_checkBoxClick);
      }
      this.m_checkBoxBase.x = 3;
      this.m_checkBoxRoll.x = 3;
      this.m_checkBoxClick.x = 3;
      this.on("mousedown", () => this.click());
    }
  }

  private highlight(): void {
    this.beginFill(0xfeb584, 1);
    this.lineStyle(0, 0xfeb584);
    this.drawRect(1, 1, this.m_width - 2, 18);
    if (this.m_checkBoxBase) {
      this.m_checkBoxBase.visible = false;
      this.m_checkBoxRoll.visible = !Input.mouseDown;
      this.m_checkBoxClick.visible = Input.mouseDown;
    }
  }

  private deHighlight(): void {
    this.beginFill(0xfdf9ea, 1);
    this.lineStyle(0, 0xfdf9ea);
    this.drawRect(1, 1, this.m_width - 2, 18);
    if (this.m_checkBoxBase) {
      this.m_checkBoxBase.visible = true;
      this.m_checkBoxRoll.visible = false;
      this.m_checkBoxClick.visible = false;
    }
  }

  private click(): void {
    this.m_checkBoxBase.visible = false;
    this.m_checkBoxRoll.visible = false;
    this.m_checkBoxClick.visible = true;
  }
}
