import { Container, InteractionEvent, Sprite, Texture } from "pixi.js";
import { Resource } from "../Game/Graphics/Resource";
import { Main } from "../Main";
import PIXIsound from 'pixi-sound'
type Sound = PIXIsound.Sound

type CheckboxTextures = {
	upIcon: Texture,
	overIcon: Texture,
	downIcon: Texture,
	disabledIcon: Texture,
	selectedUpIcon: Texture,
	selectedOverIcon: Texture,
	selectedDownIcon: Texture,
	selectedDisabledIcon: Texture
}

export class GuiCheckBox extends Container
{
	public static clickSound:Sound = Resource.cClick;

	public selected:boolean = false;
	public enabled:boolean = true;
	public focusEnabled:boolean = true;

	private icon:Sprite;
	private textures:CheckboxTextures|null = null;

	constructor()
	{
		super()
		this.buttonMode = true;
		this.interactive = true;

		this.icon = new Sprite()

		this.on('click', (e:InteractionEvent) => this.mouseClick(e))
		this.load()
	}

	private async load() {
		this.textures = {
			upIcon: await Texture.fromURL(Resource.cGuiCheckboxABase),
			overIcon: await Texture.fromURL(Resource.cGuiCheckboxARoll),
			downIcon: await Texture.fromURL(Resource.cGuiCheckboxAClick),
			disabledIcon: await Texture.fromURL(Resource.cGuiCheckboxADisabled),
			selectedUpIcon: await Texture.fromURL(Resource.cGuiCheckboxBBase),
			selectedOverIcon: await Texture.fromURL(Resource.cGuiCheckboxBRoll),
			selectedDownIcon: await Texture.fromURL(Resource.cGuiCheckboxBClick),
			selectedDisabledIcon: await Texture.fromURL(Resource.cGuiCheckboxBDisabled),
		}

		this.icon.texture = this.textures.upIcon;
	}

	private mouseClick(e:InteractionEvent):void {
		if (Main.enableSound) {
			GuiCheckBox.clickSound.play();
		}
	}
}
