import { Container, Sprite, Text, TextStyle, Texture } from "pixi.js";
import PIXIsound from 'pixi-sound'
import { Resource } from "../Game/Graphics/Resource";
import { Main } from "../Main";
type Sound = PIXIsound.Sound

type ComboBoxItem = {
	label: string
}

export class GuiCombobox extends Container
{
	private buttonOffset:boolean = false;

	public static rolloverSound:Sound = Resource.cRoll;
	public static clickSound:Sound = Resource.cClick;

	public label:Text = new Text('');
	public background: Sprite = new Sprite();
	public menuTextStyle: TextStyle|null = null;

	private upTexture: Texture;
	private overTexture: Texture;
	private downTexture: Texture;

	private _selectedIndex:number = 0;
	private items: Array<ComboBoxItem> = [];

	set selectedIndex(value: number) {
		this._selectedIndex = value
	}

	get selectedIndex(): number {
		return this._selectedIndex
	}

	constructor(xPos:number, yPos:number, w:number, h:number)
	{
		super()
		this.width = w;
		this.height = h;
		this.x = xPos;
		this.y = yPos;

		this.upTexture = Resource.cGuiComboboxBase
		this.overTexture = Resource.cGuiComboboxRoll
		this.downTexture = Resource.cGuiComboboxClick

		const style = new TextStyle();
		style.fontSize = 11;
		style.fill = "#573D40";
		style.fontFamily = Main.GLOBAL_FONT;
		style.align = 'left';

		this.width = w;
		this.height = h;
		this.position.set(xPos, yPos);
		this.buttonMode = true;
		this.interactive = true;

		this.background.texture = this.upTexture
		this.background.width = w
		this.background.height = h
		this.addChild(this.background)

		this.label.text = 'TEST'
		this.label.style = style
		this.label.anchor.set(0, 0.5)
		this.label.x = 10
		this.label.y = h / 2
		this.addChild(this.label)

		this
			.on('click', (event: any) => this.openMenu(event))
			.on('mousedown', this.bDown)
			.on('mouseover', this.mouseOver)
			.on('mouseout', this.bUp)
	}

	async load(xPos:number, yPos:number, w:number, h:number) {
	}

	addItem(item: ComboBoxItem) {
		this.items.push(item)

		this.label.text = this.items[this.selectedIndex].label
	}

	public bDown(e:MouseEvent):void {
		if (!e.target.buttonOffset) {
			e.target.x += 2;
			e.target.y += 2;
			e.target.buttonOffset = true;
		}
	}

	public bUp(e:MouseEvent):void {
		if (this.buttonOffset) {
			this.x -= 2;
			this.y -= 2;
			this.buttonOffset = false;
		}
	}

	private mouseOver(e:MouseEvent):void {
		if (Main.enableSound) {
			GuiCombobox.rolloverSound.stop()
			GuiCombobox.rolloverSound.volume = 0.2
			GuiCombobox.rolloverSound.play()
		}
	}

	private mouseClick(e:MouseEvent):void {
		if (Main.enableSound) {
			GuiCombobox.clickSound.volume = 0.8
			GuiCombobox.clickSound.play()
		}
	}
}
