import { Stage, Button, TextInput, FastLayoutOptions, LayoutOptions, AnchorLayoutOptions, AnchorLayout } from '@puxi/core'
import { Container, Text, TextStyle, Texture, Sprite } from 'pixi.js'
import { Resource } from '../Game/Graphics/Resource'
import { Main } from '../Main'

const TextInputs: Array<GuiTextInput> = []

export class GuiTextInput extends Stage
{
	private baseSkin:Texture;
	private rollSkin:Texture;

	public textInput: TextInput;

	set maxLength (value: number) {
		this.textInput.maxLength = value || 0
	}

	get maxLength (): number {
		return this.textInput.maxLength
	}

	get enabled (): boolean {
		return this.interactive
	}

	set enabled (value: boolean) {
		this.interactive = value
	}

	get editable (): boolean {
		return this.interactive
	}

	set editable (value: boolean) {
		this.interactive = value
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

		TextInputs.push(this)

		this.baseSkin = Resource.cGuiTextAreaBase
		this.rollSkin = Resource.cGuiTextAreaRoll

		if (!format) format = new TextStyle()
		format.fontFamily = Main.GLOBAL_FONT
		format.fill = '#4C3D57'

		const backgroundContainer = new Container()
		const backgroundSprite = new Sprite(this.baseSkin)
		backgroundSprite.width = w
		backgroundSprite.height = h
		backgroundContainer.addChild(backgroundSprite)

		this.textInput = new TextInput({
			value: '',
			width: w,
			height: h,
			style: format || new TextStyle(),
			background: backgroundContainer
		})

		this.on('mouseover', () => {
			backgroundSprite.texture = this.rollSkin
		})
		this.on('mouseout', () => {
			if (this.textInput.isFocused) return
			backgroundSprite.texture = this.baseSkin
		})

		this.textInput.on('click', (event: any) => {
			this.emit('click', event)
		})

		this.textInput.on('focus', (event: any) => {
			TextInputs.forEach(input => {
				if (input !== this) input.textInput.blur()
			})
			backgroundSprite.texture = this.rollSkin
			this.emit('focus', this.textInput.text)
		})
		this.textInput.on('blur', (event: any) => {
			backgroundSprite.texture = this.baseSkin
			this.emit('blur', this.textInput.text)
		})
		this.textInput.on('change', () => {
			this.emit('change', this.textInput.text)
			this.text = this.textInput.text
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
}