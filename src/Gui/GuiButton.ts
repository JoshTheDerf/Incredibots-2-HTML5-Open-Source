import { Container, InteractionEvent, Sprite, Text, TextStyle, Texture, filters } from 'pixi.js'
import { Resource } from '../Game/Graphics/Resource';
import { Main } from '../Main';
import PIXIsound from 'pixi-sound'

type Sound = PIXIsound.Sound

export class GuiButton extends Container
{
	public static PURPLE:number = 0;
	public static RED:number = 1;
	public static BLUE:number = 2;
	public static PINK:number = 3;
	public static ORANGE:number = 4;
	public static PLAY:number = 5;
	public static X:number = 6;

	public static rolloverSound:Sound = Resource.cRoll;
	public static clickSound:Sound = Resource.cClick;
	public static channel:SoundChannel;
	private static lastRolloverFrame:number = 0;

	private sCheckbox:BitmapAsset = null;

	private buttonOffset:boolean = false;
	public depressed:boolean = false;

	public label:Text = null;
	public background: Sprite = null;

	private upTexture: Texture;
	private overTexture: Texture;
	private downTexture: Texture;
	private _disabled: boolean = false;

	set disabled(value: boolean) {
		this._disabled = value

		if (this._disabled) {
			const colorMatrix = new filters.ColorMatrixFilter();
			colorMatrix.brightness(0.5, true);
			this.interactive = false
			this.alpha = 0.7
			this.filters = [colorMatrix];
		} else {
			this.interactive = true
			this.alpha = 1
			this.filters = []
		}
	}

	get disabled():boolean {
		return this._disabled
	}

	constructor(text:String, xPos:number, yPos:number, w:number, h:number, clickListener:Function, colour:number, style:TextStyle|null = null, addCheckbox:boolean = false, checkboxSelected:boolean = false)
	{
		super()

		if (colour == GuiButton.PURPLE) {
			this.upTexture = GuiButton.purpleButtonBase()
			this.overTexture = GuiButton.purpleButtonRoll()
			this.downTexture = GuiButton.purpleButtonClick()
		} else if (colour == GuiButton.RED) {
			this.upTexture = GuiButton.redButtonBase()
			this.overTexture = GuiButton.redButtonRoll()
			this.downTexture = GuiButton.redButtonClick()
		} else if (colour == GuiButton.BLUE) {
			this.upTexture = GuiButton.blueButtonBase()
			this.overTexture = GuiButton.blueButtonRoll()
			this.downTexture = GuiButton.blueButtonClick()
		} else if (colour == GuiButton.PINK) {
			this.upTexture = GuiButton.pinkButtonBase()
			this.overTexture = GuiButton.pinkButtonRoll()
			this.downTexture = GuiButton.pinkButtonClick()
		} else if (colour == GuiButton.ORANGE) {
			this.upTexture = GuiButton.orangeButtonBase()
			this.overTexture = GuiButton.orangeButtonRoll()
			this.downTexture = GuiButton.orangeButtonClick()
		} else if (colour == GuiButton.PLAY) {
			this.upTexture = GuiButton.playButtonBase()
			this.overTexture = GuiButton.playButtonRoll()
			this.downTexture = GuiButton.playButtonClick()
		} else if (colour == GuiButton.X) {
			this.upTexture = GuiButton.xButtonBase()
			this.overTexture = GuiButton.xButtonRoll()
			this.downTexture = GuiButton.xButtonClick()
		}

		if (!style) {
			style = new TextStyle();
			style.fontSize = 11;
		}
		style.fill = "#573D40";
		style.fontFamily = Main.GLOBAL_FONT;
		style.align = 'center';

		this.width = w;
		this.height = h;
		this.position.set(xPos, yPos);
		this.buttonMode = true;
		this.interactive = true;

		this.background = new Sprite(this.upTexture)
		this.background.width = w
		this.background.height = h
		this.addChild(this.background)

		this.label = new Text(text)
		this.label.style = style
		this.label.anchor.set(0.5)
		this.label.x = w / 2
		this.label.y = h / 2
		this.addChild(this.label)

		this
			.on('click', (event: InteractionEvent) => {
				if (this.disabled) return
				clickListener(event)
			})
			.on('tap', (event: InteractionEvent) => {
				if (this.disabled) return
				clickListener(event)
			})
			.on('mousedown', this.bDown)
			.on('mouseover', this.mouseOver)
			.on('mouseout', this.bUp)
			.on('click', this.bUp)
			.on('click', this.mouseClick)

		if (addCheckbox) {
			if (checkboxSelected) {
				this.sCheckbox = new Sprite(Resource.cLevelSelectLevelCheckBoxB);
			} else {
				this.sCheckbox = new Sprite(Resource.cLevelSelectLevelCheckBoxA);
			}
			this.sCheckbox.x = 110;
			this.sCheckbox.y = 12;
			this.sCheckbox.smoothing = true;
			this.addChild(this.sCheckbox);
		}
	}

	public SetState(down:boolean):void {
		if (down) {
			if (!this.buttonOffset) {
				this.x += 2;
				this.y += 2;
				this.buttonOffset = true;
			}
			this.depressed = true;
			this.background.texture = this.downTexture
		} else {
			if (this.buttonOffset) {
				this.x -= 2;
				this.y -= 2;
				this.buttonOffset = false;
			}
			this.depressed = false;
			this.background.texture = this.upTexture
		}
	}

	private bDown():void {
		if (this.disabled) return
		if (!this.buttonOffset) {
			this.x += 2;
			this.y += 2;
			this.buttonOffset = true;
		}
		this.background.texture = this.downTexture
	}

	private bUp():void {
		if (this.disabled) return
		if (this.buttonOffset) {
			this.x -= 2;
			this.y -= 2;
			this.buttonOffset = false;
		}
		this.background.texture = this.upTexture
	}

	private mouseOver():void {
		if (this.disabled) return
		if (Main.enableSound && GuiButton.lastRolloverFrame != Math.floor(Date.now() / 150)) {
			GuiButton.rolloverSound.stop()
			GuiButton.rolloverSound.volume = 0.2
			GuiButton.rolloverSound.play()
			GuiButton.lastRolloverFrame = Math.floor(Date.now() / 150);
		}
		this.background.texture = this.overTexture
	}

	private mouseClick():void {
		if (this.disabled) return
		if (Main.enableSound) {
			GuiButton.clickSound.volume = 0.8
			GuiButton.clickSound.play()
		}
	}

	public static redButtonBase():Texture {
		return Resource.cGuiButtonRedBase;
	}

	public static redButtonRoll():Texture {
		return Resource.cGuiButtonRedRoll;
	}

	public static redButtonClick():Texture {
		return Resource.cGuiButtonRedClick;
	}

	public static blueButtonBase():Texture {
		return Resource.cGuiButtonBlueBase;
	}

	public static blueButtonRoll():Texture {
		return Resource.cGuiButtonBlueRoll;
	}

	public static blueButtonClick():Texture {
		return Resource.cGuiButtonBlueClick;
	}

	public static purpleButtonBase():Texture {
		return Resource.cGuiButtonPurpleBase;
	}

	public static purpleButtonRoll():Texture {
		return Resource.cGuiButtonPurpleRoll;
	}

	public static purpleButtonClick():Texture {
		return Resource.cGuiButtonPurpleClick;
	}

	public static pinkButtonBase():Texture {
		return Resource.cGuiButtonPinkBase;
	}

	public static pinkButtonRoll():Texture {
		return Resource.cGuiButtonPinkRoll;
	}

	public static pinkButtonClick():Texture {
		return Resource.cGuiButtonPinkClick;
	}

	public static orangeButtonBase():Texture {
		return Resource.cGuiButtonOrangeBase;

	}

	public static orangeButtonRoll():Texture {
		return Resource.cGuiButtonOrangeRoll;

	}

	public static orangeButtonClick():Texture {
		return Resource.cGuiButtonOrangeClick;
	}

	public static playButtonBase():Texture {
		return Resource.cGuiButtonPlayBase;
	}

	public static playButtonRoll():Texture {
		return Resource.cGuiButtonPlayRoll;
	}

	public static playButtonClick():Texture {
		return Resource.cGuiButtonPlayClick;
	}

	public static xButtonBase():Texture {
		return Resource.cGuiButtonXBase;
	}

	public static xButtonRoll():Texture {
		return Resource.cGuiButtonXRoll;
	}

	public static xButtonClick():Texture {
		return Resource.cGuiButtonXClick;
	}
}
