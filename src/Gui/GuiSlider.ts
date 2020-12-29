import { Texture } from 'pixi.js'
import { Slider, Sprite } from '@puxi/core'
import { Resource } from '../Game/Graphics/Resource'

type SliderTextures = {
	groove: Texture,
	grooveDisabled: Texture,
}

export class GuiSlider extends Slider {
  private textures: SliderTextures|null = null;

  constructor(options?: object) {
    super(options || {})

    this.load()
  }

	private async load() {
		this.textures = {
			groove: await Texture.fromURL(Resource.cGuiSliderGroove),
			grooveDisabled: await Texture.fromURL(Resource.cGuiSliderGrooveDisabled),
		}

		this.track = new Sprite(this.textures.groove);
	}
}
