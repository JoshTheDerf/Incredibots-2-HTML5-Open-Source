import TextInput from "pixi-text-input";
import { Container, Sprite, TextStyle, Texture, TilingSprite } from "pixi.js";
import { Main, Resource } from "../imports";

export class GuiTextArea extends Container {
  private baseSkin: Texture;
  private rollSkin: Texture;

  public textInput: TextInput;

  public text: string = "";

  get editable() {
    return !this.textInput.disabled
  }

  set editable(value) {
    this.textInput.disabled = !value
  }

  constructor(xPos: number, yPos: number, w: number, h: number, format: TextStyle | null = null) {
    super();
    this.x = xPos;
    this.y = yPos;

    this.baseSkin = Resource.cGuiTextAreaBase;
    this.rollSkin = Resource.cGuiTextAreaRoll;

    if (!format) format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#4C3D57";

    const backgroundContainer = new Container();
    const backgroundSprite = new Sprite(this.baseSkin);
    backgroundSprite.width = w;
    backgroundSprite.height = h;
    backgroundContainer.addChild(backgroundSprite);

    this.textInput = new TextInput({
      input: {
        multiline: true,
        fontSize: `${format.fontSize}pt`,
        color: format.fill,
        zIndex: 1000,
        width: `${w - 20}px`,
        height: `${h - 20}px`,
        padding: `10px`,
      },
      box: (w: number, h: number, state: string) => {
        const backgroundSprite = new Sprite();
        backgroundSprite.texture = this.baseSkin;
        backgroundSprite.width = w;
        backgroundSprite.height = h;

        if (state === "DEFAULT") backgroundSprite.texture = this.baseSkin;
        if (state === "FOCUSED") backgroundSprite.texture = this.rollSkin;
        if (state === "DISABLED") backgroundSprite.texture = this.baseSkin;

        return backgroundSprite;
      },
    });

    this.textInput.on("input", (text: string) => {
      this.text = text;
      this.emit("change", text);
    });

    this.textInput.on("focus", () => {
      this.emit("focus")
    });

    this.textInput.on("blur", () => {
      this.emit("blur")
    });

    this.addChild(this.textInput);
  }

  focus() {
    this.textInput.focus()
  }
}
