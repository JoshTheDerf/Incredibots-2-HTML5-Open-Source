import { Container, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { Resource } from "../Game/Graphics/Resource"
import { Main } from "../Main"

// Minimal pixi-8-native replacement for the abandoned `pixi-text-input`
// plugin (multiline variant). Draws a skinned background + a wrapping Pixi
// Text, with a hidden DOM <textarea> overlay capturing real entry. Preserves
// the .text / .editable surface and "change"/"focus"/"blur" events, plus
// focus().
export class GuiTextArea extends Container {
  private baseSkin: Texture;
  private rollSkin: Texture;

  private background: Sprite;
  private labelText: Text;
  private domInput: HTMLTextAreaElement;
  private _disabled: boolean = false;

  public text: string = "";

  get editable() {
    return !this._disabled
  }

  set editable(value) {
    this._disabled = !value;
    this.domInput.disabled = this._disabled;
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
    format.wordWrap = true;
    format.wordWrapWidth = w - 20;

    this.background = new Sprite(this.baseSkin);
    this.background.width = w;
    this.background.height = h;
    this.addChild(this.background);

    this.labelText = new Text({ text: "", style: format });
    this.labelText.x = 10;
    this.labelText.y = 10;
    this.addChild(this.labelText);

    this.domInput = document.createElement("textarea");
    this.domInput.style.position = "absolute";
    this.domInput.style.opacity = "0";
    this.domInput.style.pointerEvents = "none";
    this.domInput.style.left = "-9999px";
    document.body.appendChild(this.domInput);

    this.domInput.addEventListener("input", () => {
      this.text = this.domInput.value;
      this.labelText.text = this.text;
      this.emit("change", this.text);
    });
    this.domInput.addEventListener("focus", () => {
      this.background.texture = this.rollSkin;
      this.emit("focus");
    });
    this.domInput.addEventListener("blur", () => {
      this.background.texture = this.baseSkin;
      this.emit("blur");
    });

    this.eventMode = "static";
    this.cursor = "text";
    this.on("pointertap", () => {
      if (this._disabled) return;
      this.domInput.focus();
    });
  }

  // Backwards-compat shim for the old `pixi-text-input` `.textInput` sub-object
  // (callers use `.textInput.text = ...` and `.textInput.select()`).
  public get textInput(): { select: () => void; text: string } {
    const self = this;
    return {
      select: () => {
        self.domInput.focus();
        self.domInput.select();
      },
      get text(): string {
        return self.text;
      },
      set text(value: string) {
        self.text = value;
        self.domInput.value = value;
        self.labelText.text = value;
      },
    };
  }

  focus() {
    this.domInput.focus()
  }

  public destroy(options?: any): void {
    if (this.domInput && this.domInput.parentNode) this.domInput.parentNode.removeChild(this.domInput);
    super.destroy(options);
  }
}
