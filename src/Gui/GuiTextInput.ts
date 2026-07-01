import { Container, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { Resource } from "../Game/Graphics/Resource"
import { Main } from "../Main"

// Minimal pixi-8-native replacement for the abandoned `pixi-text-input`
// plugin (single-line variant). It draws a skinned background Sprite plus a
// Pixi Text showing the current value, and drives real text entry through a
// positioned DOM <input> overlay that is shown/focused when the widget is
// clicked. Preserves the events the legacy Gui code listens for:
//   "click", "focus"(text), "blur"(text), "change"(text),
//   "keydown"(this, code), "keyup"(this, code)
// and the .text / .maxLength / .enabled / .editable / setSelection() surface.
export class GuiTextInput extends Container {
  private baseSkin: Texture;
  private rollSkin: Texture;
  private disabledSkin: Texture;

  private background: Sprite;
  private labelText: Text;
  private domInput: HTMLInputElement;
  private _boxWidth: number;
  private _boxHeight: number;
  private _disabled: boolean = false;
  private _text: string = "";

  set maxLength(value: number) {
    this.domInput.maxLength = value || 0;
  }

  get maxLength(): number {
    return this.domInput.maxLength;
  }

  get enabled(): boolean {
    return !this._disabled;
  }

  set enabled(value: boolean) {
    this._disabled = !value;
    this.background.texture = this._disabled ? this.disabledSkin : this.baseSkin;
    this.domInput.disabled = this._disabled;
  }

  get editable(): boolean {
    return !this._disabled;
  }

  set editable(value: boolean) {
    this.enabled = value;
  }

  get text(): string {
    return this._text;
  }

  set text(value: string) {
    this._text = value ?? "";
    this.labelText.text = this._text;
    this.domInput.value = this._text;
  }

  constructor(xPos: number, yPos: number, w: number, h: number, format: TextStyle | null = null) {
    super();
    this.x = xPos;
    this.y = yPos;
    this._boxWidth = w;
    this._boxHeight = h;

    this.baseSkin = Resource.cGuiTextAreaBase;
    this.rollSkin = Resource.cGuiTextAreaRoll;
    this.disabledSkin = Resource.cGuiTextAreaDisabled;

    if (!format) format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#4C3D57";

    this.background = new Sprite(this.baseSkin);
    this.background.width = w;
    this.background.height = h;
    this.addChild(this.background);

    this.labelText = new Text({ text: "", style: format });
    this.labelText.x = 4;
    this.labelText.y = Math.max(0, (h - (format.fontSize as number || 12)) / 2 - 1);
    this.addChild(this.labelText);

    // Hidden DOM input overlay for real keyboard entry.
    this.domInput = document.createElement("input");
    this.domInput.type = "text";
    this.domInput.style.position = "absolute";
    this.domInput.style.opacity = "0";
    this.domInput.style.pointerEvents = "none";
    this.domInput.style.left = "-9999px";
    document.body.appendChild(this.domInput);

    this.domInput.addEventListener("input", () => {
      this._text = this.domInput.value;
      this.labelText.text = this._text;
      this.emit("change", this._text);
    });
    this.domInput.addEventListener("focus", () => {
      this.background.texture = this.rollSkin;
      this.emit("focus", this._text);
    });
    this.domInput.addEventListener("blur", () => {
      this.background.texture = this._disabled ? this.disabledSkin : this.baseSkin;
      this.emit("blur", this._text);
    });
    this.domInput.addEventListener("keydown", (e: KeyboardEvent) => {
      this.emit("keydown", this, e.keyCode);
    });
    this.domInput.addEventListener("keyup", (e: KeyboardEvent) => {
      this.emit("keyup", this, e.keyCode);
    });

    this.eventMode = "static";
    this.cursor = "text";
    this.on("pointertap", (event: any) => {
      if (this._disabled) return;
      this.domInput.focus();
      this.emit("click", event);
    });
  }

  // Backwards-compat shim: the legacy `pixi-text-input`-based widget exposed a
  // `.textInput` sub-object; callers use `.textInput.select()` and
  // `.textInput.text`. Map those onto the DOM overlay.
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
      },
    };
  }

  public setSelection(startIndex: number, endIndex: number) {
    try {
      this.domInput.setSelectionRange(startIndex, endIndex);
    } catch {
      // ignore if not focusable yet
    }
  }

  public destroy(options?: any): void {
    if (this.domInput && this.domInput.parentNode) this.domInput.parentNode.removeChild(this.domInput);
    super.destroy(options);
  }
}
