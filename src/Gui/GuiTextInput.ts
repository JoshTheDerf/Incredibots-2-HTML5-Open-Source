import TextInput from "pixi-text-input";
import { Container, Sprite, TextStyle, Texture } from "pixi.js";
import { Main, Resource } from "../imports";

const TextInputs: Array<GuiTextInput> = [];

export class GuiTextInput extends Container {
  private baseSkin: Texture;
  private rollSkin: Texture;
  private disabledSkin: Texture;

  public textInput: TextInput;

  set maxLength(value: number) {
    this.textInput.maxLength = value || 0;
  }

  get maxLength(): number {
    return this.textInput.maxLength;
  }

  get enabled(): boolean {
    return !this.textInput.disabled;
  }

  set enabled(value: boolean) {
    this.textInput.disabled = !value;
  }

  get editable(): boolean {
    return !this.textInput.disabled;
  }

  set editable(value: boolean) {
    this.textInput.disabled = !value;
  }

  get text(): string {
    return this.textInput.text;
  }

  set text(value: string) {
    this.textInput.text = value;
  }

  constructor(xPos: number, yPos: number, w: number, h: number, format: TextStyle | null = null) {
    super();
    this.x = xPos;
    this.y = yPos;

    TextInputs.push(this);

    this.baseSkin = Resource.cGuiTextAreaBase;
    this.rollSkin = Resource.cGuiTextAreaRoll;
    this.disabledSkin = Resource.cGuiTextAreaDisabled;

    if (!format) format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#4C3D57";

    this.textInput = new TextInput({
      input: {
        fontSize: `${format.fontSize}pt`,
        color: format.fill,
        zIndex: 1000,
        width: `${w}px`,
        height: `${h}px`,
      },
      box: (w: number, h: number, state: string) => {
        const backgroundSprite = new Sprite();
        backgroundSprite.texture = this.baseSkin;
        backgroundSprite.width = w;
        backgroundSprite.height = h;

        if (state === "DEFAULT") backgroundSprite.texture = this.baseSkin;
        if (state === "FOCUSED") backgroundSprite.texture = this.rollSkin;
        if (state === "DISABLED") backgroundSprite.texture = this.disabledSkin;

        return backgroundSprite;
      },
    });

    this.textInput.on("click", (event: any) => {
      this.emit("click", event);
    });
    this.textInput.on("focus", (event: any) => {
      this.emit("focus", this.textInput.text);
    });
    this.textInput.on("blur", (event: any) => {
      this.emit("blur", this.textInput.text);
    });
    this.textInput.on("input", (text: string) => {
      this.emit("change", text);
      this.text = text;
    });
    this.textInput.on("keydown", (code: number) => {
      this.emit("keydown", this, code);
    });
    this.textInput.on("keyup", (code: number) => {
      this.emit("keyup", this, code);
    });

    this.addChild(this.textInput);
  }

  public setSelection(startIndex: number, endIndex: number) {
    this.textInput.htmlInput.setSelectionRange(startIndex, endIndex);
  }
}
