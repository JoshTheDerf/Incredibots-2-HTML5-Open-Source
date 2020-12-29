import { Container, Sprite, Text, TextStyle, Texture } from 'pixi.js'
import { Resource } from '../Game/Graphics/Resource';
import { Main } from '../Main';
import PIXIsound from 'pixi-sound'

type Sound = PIXIsound.Sound

export class GuiButton extends Sprite
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

	constructor(text:string, xPos:number, yPos:number, w:number, h:number, clickListener:Function, colour:number, style:TextStyle|null = null, addCheckbox:boolean = false, checkboxSelected:boolean = false)
	{
		super()
		this.load(text, xPos, yPos, w, h, clickListener, colour, style, addCheckbox, checkboxSelected)
	}

	async load(text:string, xPos:number, yPos:number, w:number, h:number, clickListener:Function, colour:number, style:TextStyle|null = null, addCheckbox:boolean = false, checkboxSelected:boolean = false) {
		if (colour == GuiButton.PURPLE) {
			this.upTexture = await Texture.fromURL(GuiButton.purpleButtonBase())
			this.overTexture = await Texture.fromURL(GuiButton.purpleButtonRoll())
			this.downTexture = await Texture.fromURL(GuiButton.purpleButtonClick())
		} else if (colour == GuiButton.RED) {
			this.upTexture = await Texture.fromURL(GuiButton.redButtonBase())
			this.overTexture = await Texture.fromURL(GuiButton.redButtonRoll())
			this.downTexture = await Texture.fromURL(GuiButton.redButtonClick())
		} else if (colour == GuiButton.BLUE) {
			this.upTexture = await Texture.fromURL(GuiButton.blueButtonBase())
			this.overTexture = await Texture.fromURL(GuiButton.blueButtonRoll())
			this.downTexture = await Texture.fromURL(GuiButton.blueButtonClick())
		} else if (colour == GuiButton.PINK) {
			this.upTexture = await Texture.fromURL(GuiButton.pinkButtonBase())
			this.overTexture = await Texture.fromURL(GuiButton.pinkButtonRoll())
			this.downTexture = await Texture.fromURL(GuiButton.pinkButtonClick())
		} else if (colour == GuiButton.ORANGE) {
			this.upTexture = await Texture.fromURL(GuiButton.orangeButtonBase())
			this.overTexture = await Texture.fromURL(GuiButton.orangeButtonRoll())
			this.downTexture = await Texture.fromURL(GuiButton.orangeButtonClick())
		} else if (colour == GuiButton.PLAY) {
			this.upTexture = await Texture.fromURL(GuiButton.playButtonBase())
			this.overTexture = await Texture.fromURL(GuiButton.playButtonRoll())
			this.downTexture = await Texture.fromURL(GuiButton.playButtonClick())
		} else if (colour == GuiButton.X) {
			this.upTexture = await Texture.fromURL(GuiButton.xButtonBase())
			this.overTexture = await Texture.fromURL(GuiButton.xButtonRoll())
			this.downTexture = await Texture.fromURL(GuiButton.xButtonClick())
		}

		if (!style) {
			style = new TextStyle();
			style.fontSize = 11;
		}
		style.fill = "#573D40";
		style.fontFamily = Main.GLOBAL_FONT;
		style.align = 'center';

		this.texture = this.upTexture
		this.width = w;
		this.height = h;
		this.position.set(xPos, yPos);
		this.buttonMode = true;
		this.interactive = true;

		this.label = new Text(text)
		this.label.style = style
		this.label.scale.set(1 / (this.width / this.texture.width), 1 / (this.height / this.texture.height))
		this.label.anchor.set(0.5)
		this.label.x = w / 4
		this.label.y = h / 4
		this.addChild(this.label)

		this
			.on('click', clickListener)
			.on('tap', clickListener)
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
			setMouseState("down");
			if (!this.buttonOffset) {
				this.x += 2;
				this.y += 2;
				this.buttonOffset = true;
			}
			this.depressed = true;
			this.texture = this.downTexture
		} else {
			setMouseState("up");
			if (this.buttonOffset) {
				this.x -= 2;
				this.y -= 2;
				this.buttonOffset = false;
			}
			this.depressed = false;
			this.texture = this.upTexture
		}
	}

	private bDown(e:MouseEvent):void {
		if (!this.buttonOffset) {
			this.x += 2;
			this.y += 2;
			this.buttonOffset = true;
		}
		this.texture = this.downTexture
	}

	private bUp(e:MouseEvent):void {
		if (this.buttonOffset) {
			this.x -= 2;
			this.y -= 2;
			this.buttonOffset = false;
		}
		this.texture = this.upTexture
	}

	private mouseOver(e:MouseEvent):void {
		if (Main.enableSound && GuiButton.lastRolloverFrame != Math.floor(Date.now() / 150)) {
			GuiButton.rolloverSound.stop()
			GuiButton.rolloverSound.volume = 0.3
			GuiButton.rolloverSound.play()
			GuiButton.lastRolloverFrame = Math.floor(Date.now() / 150);
		}
		this.texture = this.overTexture
	}

	private mouseClick(e:MouseEvent):void {
		if (Main.enableSound) {
			// GuiButton.clickSound.volume = 0.8
			GuiButton.clickSound.play()
		}
	}

	public static redButtonBase():string {
		return Resource.cGuiButtonRedBase;
	}

	public static redButtonRoll():string {
		return Resource.cGuiButtonRedRoll;
	}

	public static redButtonClick():string {
		return Resource.cGuiButtonRedClick;
	}

	public static blueButtonBase():string {
		return Resource.cGuiButtonBlueBase;
	}

	public static blueButtonRoll():string {
		return Resource.cGuiButtonBlueRoll;
	}

	public static blueButtonClick():string {
		return Resource.cGuiButtonBlueClick;
	}

	public static purpleButtonBase():string {
		return Resource.cGuiButtonPurpleBase;
	}

	public static purpleButtonRoll():string {
		return Resource.cGuiButtonPurpleRoll;
	}

	public static purpleButtonClick():string {
		return Resource.cGuiButtonPurpleClick;
	}

	public static pinkButtonBase():string {
		return Resource.cGuiButtonPinkBase;
	}

	public static pinkButtonRoll():string {
		return Resource.cGuiButtonPinkRoll;
	}

	public static pinkButtonClick():string {
		return Resource.cGuiButtonPinkClick;
	}

	public static orangeButtonBase():string {
		return Resource.cGuiButtonOrangeBase;

	}

	public static orangeButtonRoll():string {
		return Resource.cGuiButtonOrangeRoll;

	}

	public static orangeButtonClick():string {
		return Resource.cGuiButtonOrangeClick;
	}

	public static playButtonBase():string {
		return Resource.cGuiButtonPlayBase;
	}

	public static playButtonRoll():string {
		return Resource.cGuiButtonPlayRoll;
	}

	public static playButtonClick():string {
		return Resource.cGuiButtonPlayClick;
	}

	public static xButtonBase():string {
		return Resource.cGuiButtonXBase;
	}

	public static xButtonRoll():string {
		return Resource.cGuiButtonXRoll;
	}

	public static xButtonClick():string {
		return Resource.cGuiButtonXClick;
	}
}
