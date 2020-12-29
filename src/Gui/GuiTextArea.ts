import { Stage, Button, TextInput, FastLayoutOptions, LayoutOptions, AnchorLayoutOptions, AnchorLayout } from '@puxi/core'
import { Container, Text, TextStyle, Texture, Sprite } from 'pixi.js'
import { Resource } from '../Game/Graphics/Resource'
import { Main } from '../Main'

export class GuiTextArea extends Stage
{
	private static baseSkin:Texture = Texture.from(Resource.cGuiTextAreaBase)
	private static rollSkin:Texture = Texture.from(Resource.cGuiTextAreaRoll)

	public text: String = ''

	constructor(xPos:number, yPos:number, w:number, h:number, format:TextStyle|null = null)
	{
		super(w, h)
		this.x = xPos
		this.y = yPos
		this.width = w
		this.height = h
		this.interactive = true

		if (!format) format = new TextStyle()
		format.fontFamily = Main.GLOBAL_FONT
		format.fill = '#4C3D57'

		const backgroundContainer = new Container()
		const backgroundSprite = new Sprite(GuiTextArea.baseSkin)
		backgroundSprite.width = w
		backgroundSprite.height = h
		backgroundContainer.addChild(backgroundSprite)

		const textInput = new TextInput({
			multiLine: true,
			value: 'TEST',
			width: w,
			height: h,
			style: format || new TextStyle(),
			background: backgroundContainer
		})
		textInput.setPadding(5, 5)

		this.on('mouseover', () => {
			backgroundSprite.texture = GuiTextArea.rollSkin
		})
		this.on('mouseout', () => {
			if (textInput.isFocused) return
			backgroundSprite.texture = GuiTextArea.baseSkin
		})

		textInput.on('focus', () => {
			backgroundSprite.texture = GuiTextArea.rollSkin
		})
		textInput.on('blur', () => {
			backgroundSprite.texture = GuiTextArea.baseSkin
		})
		textInput.on('change', () => {
			this.text = textInput.text
		})

		textInput.setLayoutOptions(
			new FastLayoutOptions({
				width: 0.9999,
				height: 0.9999
			})
		)

		this.addChild(textInput)
	}
}
