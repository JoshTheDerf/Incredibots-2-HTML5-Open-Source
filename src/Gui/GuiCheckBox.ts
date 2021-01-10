import { Container, Graphics, InteractionEvent, Sprite, Text, TextStyle, Texture } from "pixi.js";
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

export class GuiCheckBox extends Graphics
{
	public static clickSound:Sound = Resource.cClick;


	public enabled:boolean = true;
	public focusEnabled:boolean = true;

	private _selected:boolean = false;
	private _disabled:boolean = false;
	private _mouseOver:boolean = false;
	private _mouseDown:boolean = false;
	private _icon:Sprite;
	private _label:Text;
	private _style:TextStyle = new TextStyle();
	private _disabledStyle:TextStyle = new TextStyle();
	private textures:CheckboxTextures;

	set label(value: string) {
		this._label.text = value
	}

	get label(): string {
		return this._label.text
	}

	set style(value: TextStyle) {
		this._style = value
		if (!this.disabled) this._label.style = value
	}

	get style(): TextStyle {
		return this._style
	}

	set disabledStyle(value: TextStyle) {
		this._disabledStyle = value
		if (this.disabled) this._label.style = value
	}

	get disabledStyle(): TextStyle {
		return this._disabledStyle
	}

	set selected(value: boolean) {
		this._selected = value
		this.updateIcon()
	}

	get selected(): boolean {
		return this._selected
	}

	set disabled(value: boolean) {
		this._disabled = value
		this._label.style = this._disabled ? this._disabledStyle : this._style
		this.updateIcon()
	}

	get disabled(): boolean {
		return this._disabled
	}

	constructor(x:number, y:number, w:number)
	{
		super()
		const h = 22
		this.buttonMode = true;
		this.interactive = true;

		this.x = x;
		this.y = y;
		this._icon = new Sprite()
		this._icon.x = 5
		this._icon.y = 0
		this._label = new Text('')
		this._label.anchor.set(0, 0.5)
		this._label.x = 32
		this._label.y = (h / 2) + 1

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

		this._icon.texture = this.selected ? this.textures.selectedUpIcon : this.textures.upIcon;

		this.beginFill(0xffffff, 0.01)
		this.drawRect(0, 0, w, h)
		this.endFill()

		this.addChild(this._icon)
		this.addChild(this._label)

		this.on('click', (e:InteractionEvent) => this.mouseClick(e))
		this.on('mouseover', () => {
			this._mouseOver = true
			this.updateIcon()
		})
		this.on('mouseout', () => {
			this._mouseOver = false
			this.updateIcon()
		})
		this.on('mousedown', () => {
			this._mouseDown = true
			this.updateIcon()
		})
		this.on('mouseup', () => {
			this._mouseDown = false
			this.updateIcon()
		})
	}

	private async load() {
	}

	private mouseClick(e:InteractionEvent):void {
		if (this.disabled) return
		this.toggle()
		if (Main.enableSound) {
			GuiCheckBox.clickSound.play();
		}
		this.emit('change', this.selected)
	}

	public toggle() {
		this.selected = !this.selected
		this.updateIcon()
	}

	private updateIcon() {
		let type = 'Up'
		if (this._mouseOver) type = 'Over'
		if (this._mouseDown) type = 'Down'
		if (this._disabled) type = 'Disabled'
		this._icon.texture = this.selected ? this.textures[`selected${type}Icon`] : this.textures[`${type.toLowerCase()}Icon`]
	}
}
