import type { Sound as PixiSound } from "@pixi/sound";
import { Container, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { Resource } from "../Game/Graphics/Resource"
import { Main } from "../Main"
type Sound = PixiSound;

export class GuiComboboxItem extends Container {
  public static rolloverSound: Sound = Resource.cRoll;
  public static clickSound: Sound = Resource.cClick;

  public labelText: Text = new Text("");
  public background: Sprite = new Sprite();

  private upTexture: Texture;
  private overTexture: Texture;
  private downTexture: Texture;

  private _selected: boolean = false;
  private _text: string = "";

  set selected(value: boolean) {
    this._selected = value;
    if (this._selected) this.background.texture = this.downTexture;
    else this.background.texture = this.upTexture;
  }

  get selected(): boolean {
    return this._selected;
  }

  set text(value: string) {
    this._text = value;
    this.labelText.text = this._text;
  }

  get text(): string {
    return this._text;
  }

  constructor(text: string, xPos: number, yPos: number, w: number, h: number) {
    super();
    this.width = w;
    this.height = h;
    this.x = xPos;
    this.y = yPos;
    this.cursor = "pointer";
    this.interactive = true;
    this.text = text;

    this.upTexture = Resource.cGuiListboxBase;
    this.overTexture = Resource.cGuiListboxRoll;
    this.downTexture = Resource.cGuiListboxClick;

    const style = new TextStyle();
    style.fontSize = 11;
    style.fill = "#573D40";
    style.fontFamily = Main.GLOBAL_FONT;
    style.align = "left";

    this.background.texture = this.upTexture;
    this.background.width = w;
    this.background.height = h;
    this.addChild(this.background);

    this.labelText.style = style;
    this.labelText.anchor.set(0, 0.5);
    this.labelText.x = 10;
    this.labelText.y = h / 2;
    this.addChild(this.labelText);

    this.on("click", (event: any) => {
      if (Main.enableSound) {
        GuiComboboxItem.clickSound.stop();
        GuiComboboxItem.clickSound.volume = 0.2;
        GuiComboboxItem.clickSound.play();
      }
      event.stopPropagation();

      this.emit("select", event);
    })
      .on("mousedown", (event: any) => {
        this.background.texture = this.downTexture;
      })
      .on("mouseover", (event: any) => {
        this.background.texture = this.selected ? this.downTexture : this.overTexture;
        if (Main.enableSound) {
          GuiComboboxItem.rolloverSound.stop();
          GuiComboboxItem.rolloverSound.volume = 0.2;
          GuiComboboxItem.rolloverSound.play();
        }
      })
      .on("mouseout", (event: any) => {
        this.background.texture = this.selected ? this.downTexture : this.upTexture;
      });
  }
}
