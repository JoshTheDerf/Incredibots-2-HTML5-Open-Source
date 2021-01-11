import { Stage, Button, TextInput, FastLayoutOptions, LayoutOptions, AnchorLayoutOptions, AnchorLayout } from '@puxi/core'
import { Container, Text, TextStyle, Texture, Sprite, filters } from 'pixi.js'
import { Resource } from '../Game/Graphics/Resource'
import { Main } from '../Main'

const TextInputs: Array<GuiTextInput> = []

export class GuiTextInput extends Stage
{
	private baseSkin:Texture;
	private rollSkin:Texture;
	private disabledSkin:Texture;

	public textInput: TextInput;
	private backgroundSprite: Sprite;

	set maxLength (value: number) {
		this.textInput.maxLength = value || 0
	}

	get maxLength (): number {
		return this.textInput.maxLength
	}

	get enabled (): boolean {
		return this.interactive && this.interactiveChildren
	}

	set enabled (value: boolean) {
		this.interactive = this.interactiveChildren = value
		this.updateEnabled()
	}

	get editable (): boolean {
		return this.interactive && this.interactiveChildren
	}

	set editable (value: boolean) {
		this.interactive = this.interactiveChildren = value
		this.updateEnabled()
	}

	get text (): string {
		return this.textInput.text
	}

	set text (value: string) {
		this.textInput.text = value
	}

	constructor(xPos:number, yPos:number, w:number, h: number, format:TextStyle|null = null)
	{
		super(w, h)
		this.x = xPos
		this.y = yPos
		this.width = w
		this.height = h
		this.interactive = true
		this.interactiveChildren = true

		TextInputs.push(this)

		this.baseSkin = Resource.cGuiTextAreaBase
		this.rollSkin = Resource.cGuiTextAreaRoll
		this.disabledSkin = Resource.cGuiTextAreaDisabled

		if (!format) format = new TextStyle()
		format.fontFamily = Main.GLOBAL_FONT
		format.fill = '#4C3D57'

		const backgroundContainer = new Container()
		this.backgroundSprite = new Sprite(this.baseSkin)
		this.backgroundSprite.width = w
		this.backgroundSprite.height = h
		backgroundContainer.addChild(this.backgroundSprite)

		this.textInput = new TextInput({
			value: '',
			width: w,
			height: h,
			style: format || new TextStyle(),
			background: backgroundContainer
		})

		this.on('mouseover', () => {
			this.backgroundSprite.texture = this.rollSkin
		})
		this.on('mouseout', () => {
			if (this.textInput.isFocused) return
			this.backgroundSprite.texture = this.baseSkin
		})

		this.textInput.on('click', (event: any) => {
			this.emit('click', event)
		})

		this.textInput.on('focus', (event: any) => {
			TextInputs.forEach(input => {
				if (input !== this) input.textInput.blur()
			})
			this.backgroundSprite.texture = this.rollSkin
			this.emit('focus', this.textInput.text)
		})
		this.textInput.on('blur', (event: any) => {
			this.backgroundSprite.texture = this.baseSkin
			this.emit('blur', this.textInput.text)
		})
		this.textInput.on('change', () => {
			this.emit('change', this.textInput.text)
			this.text = this.textInput.text
		})
		this.textInput.on('keydown', (event:any) => {
			this.emit('keydown', this)
		})

		this.textInput.on('keyup', (event:any) => {
			this.emit('keyup', this)
		})

		this.textInput.setLayoutOptions(
			new FastLayoutOptions({
				width: 0.9999,
				height: 0.9999
			})
		)

		this.addChild(this.textInput)
	}

	public setSelection(startIndex: number, endIndex: number) {
		this.textInput.selectRange(startIndex, endIndex)
	}

	public updateEnabled() {
		this.backgroundSprite.texture = this.enabled ? this.baseSkin : this.disabledSkin
	}
}
