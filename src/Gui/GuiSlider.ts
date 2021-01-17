import { ISliderOptions, Slider, Sprite, Stage } from "@puxi/core";
import { Resource } from "../imports";

export class GuiSlider extends Stage {
  private slider: Slider;
  private trackSprite: Sprite;

  set minValue(value: number) {
    this.slider.minValue = value;
  }

  get minValue(): number {
    return this.slider.minValue;
  }

  set maxValue(value: number) {
    this.slider.maxValue = value;
  }

  get maxValue(): number {
    return this.slider.maxValue;
  }

  set value(value: number) {
    this.slider.value = value;
  }

  get value(): number {
    return this.slider.value;
  }

  set enabled(value: boolean) {
    this.interactive = value;
  }

  get enabled(): boolean {
    return this.interactive;
  }

  constructor(options?: ISliderOptions) {
    super(80, 20);

    this.trackSprite = new Sprite(Resource.cGuiSliderGroove);

    if (!options) {
      options = {
        track: this.trackSprite,
        handle: new Sprite(Resource.cGuiSliderThumb),
      };
    }

    this.slider = new Slider(options);
    this.addChild(this.slider);

    this.slider.on("change", (value: number) => {
      this.emit("change", value);
    });
  }
}
