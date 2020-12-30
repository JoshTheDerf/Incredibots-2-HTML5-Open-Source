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

		this.textures = {
			upIcon: Resource.cGuiCheckboxABase,
			overIcon: Resource.cGuiCheckboxARoll,
			downIcon: Resource.cGuiCheckboxAClick,
			disabledIcon: Resource.cGuiCheckboxADisabled,
			selectedUpIcon: Resource.cGuiCheckboxBBase,
			selectedOverIcon: Resource.cGuiCheckboxBRoll,
			selectedDownIcon: Resource.cGuiCheckboxBClick,
			selectedDisabledIcon: Resource.cGuiCheckboxBDisabled,
		}

		this.icon.texture = this.textures.upIcon;
	}

	private async load() {
	}

	private mouseClick(e:InteractionEvent):void {
		if (Main.enableSound) {
			GuiCheckBox.clickSound.play();
		}
	}
}
