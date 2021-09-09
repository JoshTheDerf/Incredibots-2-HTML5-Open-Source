// import { ISliderOptions, Slider, Sprite, Stage } from "@puxi/core";
import { Container, Graphics } from "pixi.js";
import { Resource } from "../imports";

export class GuiSlider extends Container {
  private thumb: Graphics;
  private track: Graphics;

  private _enabled: boolean = true;
  public minValue: number = 0;
  public maxValue: number = 30;
  private _value: number = 0;
  private _data: any;
  private _dragging = false;

  set value(value: number) {
    this._value = value;
    this.handleValueChange(value)
  }

  get value(): number {
    return this._value;
  }

  set enabled(value: boolean) {
    this._enabled = value
    this.handleEnabledChange(value)
  }

  get enabled(): boolean {
    return this._enabled;
  }

  constructor() {
    super();

    this.track = new Graphics()
    this.track.interactive = true
    this.track.buttonMode = true

    this.thumb = new Graphics()
    this.thumb.interactive = true
    this.thumb.buttonMode = true
    this.thumb.clear()
    this.thumb.beginTextureFill({
      texture: Resource.cGuiSliderThumb
    })
    this.thumb.drawRect(0, 0, 16, 15)
    this.thumb.endFill()

    this.track.on('pointerdown', evt => {
      this.handlePositionChange(evt.data.getLocalPosition(this.track.parent))
    })

    this.thumb.on('pointerdown', evt => {
      this._data = evt.data
      this._dragging = true
    })

    this.thumb.on('pointerup', () => {
      this._data = null
      this._dragging = true
    })

    this.thumb.on('pointerupoutside', () => {
      this._data = null
      this._dragging = true
    })

    this.thumb.on('pointermove', () => {
      if (!this._dragging || !this._data) return
      const newPosition = this._data.getLocalPosition(this.track.parent)
      this.handlePositionChange(newPosition)
    })

    this.addChild(this.track)
    this.addChild(this.thumb)

    this.enabled = true
    this.handleEnabledChange(this.enabled)
    this.handleValueChange(this._value)
  }

  handleEnabledChange(enabled: boolean) {
    this.interactive = enabled
    this.track.interactive = enabled
    this.thumb.interactive = enabled
    this.thumb.alpha = enabled ? 1 : 0.5
    this.track.clear()
    this.track.beginTextureFill({
      texture: enabled ? Resource.cGuiSliderGroove : Resource.cGuiSliderGrooveDisabled
    })
    this.track.drawRect(0, 0, 80, 16)
    this.track.endFill()
  }

  handlePositionChange(data) {
    const min = 0
    const max = this.track.width - this.thumb.width
    const x = data.x - (this.thumb.width / 2)
    const step = x / (this.track.width - this.thumb.width)

    this.thumb.x = x
    if (this.thumb.x > max) this.thumb.x = max
    if (this.thumb.x < min) this.thumb.x = min

    this._value = +(step * this.maxValue - this.minValue).toFixed(0)
    if (this._value < this.minValue) this._value = this.minValue
    if (this._value > this.maxValue) this._value = this.maxValue

    this.emit('change', this._value)
  }

  handleValueChange(value: number) {
    const physicalMaxValue = this.maxValue - this.minValue
    const physicalValue = value - this.minValue
    const step = (this.track.width - this.thumb.width) / physicalMaxValue

    const x = physicalValue * step
    this.thumb.x = x
  }
}
