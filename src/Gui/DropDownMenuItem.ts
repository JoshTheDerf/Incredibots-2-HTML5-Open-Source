import { Graphics, Text, TextStyle, Texture } from "pixi.js";
import { Resource } from "../Game/Graphics/Resource";
import { Input } from "../General/Input";
import { Main } from "../Main";
import { DropDownMenu } from "./DropDownMenu";

export class DropDownMenuItem extends Graphics
{
	private m_Text:Text;
	private m_width:number;

	private m_checkBoxBase:BitmapAsset = null;
	private m_checkBoxRoll:BitmapAsset = null;
	private m_checkBoxClick:BitmapAsset = null;

	constructor(m:DropDownMenu, str:string, w:number, callback:Function, checkBox:boolean = false, checkBoxChecked:boolean = false)
	{
		super()
		var style:TextStyle = new TextStyle();
		style.fontFamily = Main.GLOBAL_FONT;
		style.fill = '#242930';
		this.m_width = w;
		this.m_Text = new Text((checkBox ? "  " : "") + str);
		this.m_Text.x = 10;
		this.m_Text.y = 3;
		this.m_Text.width = w - 20;
		this.m_Text.height = 20;
		this.m_Text.style = style;
		this.addChild(this.m_Text);
		addEventListener(MouseEvent.MOUSE_UP, callback, false, 0, true);
		addEventListener(MouseEvent.MOUSE_UP, m.HideAll, false, 0, true);
		addEventListener(MouseEvent.MOUSE_OVER, this.highlight, false, 0, true);
		addEventListener(MouseEvent.MOUSE_OUT, this.deHighlight, false, 0, true);

		if (checkBox) {
			if (checkBoxChecked) {
				this.m_checkBoxBase = Resource.cGuiMenuCheckBoxBBase;
				this.m_checkBoxBase.smoothing = true;
				this.addChild(this.m_checkBoxBase);
				this.m_checkBoxRoll = Resource.cGuiMenuCheckBoxBRoll;
				this.m_checkBoxRoll.smoothing = true;
				this.m_checkBoxRoll.visible = false;
				this.addChild(this.m_checkBoxRoll);
				this.m_checkBoxClick = Resource.cGuiMenuCheckBoxBClick;
				this.m_checkBoxClick.smoothing = true;
				this.m_checkBoxClick.visible = false;
				this.addChild(this.m_checkBoxClick);
			} else {
				this.m_checkBoxBase = Resource.cGuiMenuCheckBoxABase;
				this.m_checkBoxBase.smoothing = true;
				this.addChild(this.m_checkBoxBase);
				this.m_checkBoxRoll = Resource.cGuiMenuCheckBoxARoll;
				this.m_checkBoxRoll.smoothing = true;
				this.m_checkBoxRoll.visible = false;
				this.addChild(this.m_checkBoxRoll);
				this.m_checkBoxClick = Resource.cGuiMenuCheckBoxAClick;
				this.m_checkBoxClick.smoothing = true;
				this.m_checkBoxClick.visible = false;
				this.addChild(this.m_checkBoxClick);
			}
			this.m_checkBoxBase.x = 3;
			this.m_checkBoxRoll.x = 3;
			this.m_checkBoxClick.x = 3;
			addEventListener(MouseEvent.MOUSE_DOWN, this.click, false, 0, true);
		}
	}

	private highlight(e:MouseEvent):void {
		this.beginFill(0xFEB584, 1);
		this.lineStyle(0, 0xFEB584);
		this.drawRect(1, 1, this.m_width - 2, 18);
		if (this.m_checkBoxBase) {
			this.m_checkBoxBase.visible = false;
			this.m_checkBoxRoll.visible = !Input.mouseDown;
			this.m_checkBoxClick.visible = Input.mouseDown;
		}
	}

	private deHighlight(e:MouseEvent):void {
		this.beginFill(0xFDF9EA, 1);
		this.lineStyle(0, 0xFDF9EA);
		this.drawRect(1, 1, this.m_width - 2, 18);
		if (this.m_checkBoxBase) {
			this.m_checkBoxBase.visible = true;
			this.m_checkBoxRoll.visible = false;
			this.m_checkBoxClick.visible = false;
		}
	}

	private click(e:MouseEvent):void {
		this.m_checkBoxBase.visible = false;
		this.m_checkBoxRoll.visible = false;
		this.m_checkBoxClick.visible = true;
	}
}
