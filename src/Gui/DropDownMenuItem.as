package Gui
{
	import Game.Graphics.Resource;
	
	import General.Input;
	
	import flash.display.Sprite;
	import flash.events.*;
	import flash.text.*;
	
	import mx.core.BitmapAsset;
	
	public class DropDownMenuItem extends Sprite
	{
		private var m_textField:TextField;
		private var m_width:int;
		
		private var m_checkBoxBase:BitmapAsset = null;
		private var m_checkBoxRoll:BitmapAsset = null;
		private var m_checkBoxClick:BitmapAsset = null;
		
		public function DropDownMenuItem(m:DropDownMenu, str:String, w:int, callback:Function, checkBox:Boolean = false, checkBoxChecked:Boolean = false)
		{
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			m_width = w;
			m_textField = new TextField();
			m_textField.x = 10;
			m_textField.y = 3;
			m_textField.text = (checkBox ? "  " : "") + str;
			m_textField.width = w - 20;
			m_textField.height = 20;
			m_textField.setTextFormat(format);
			m_textField.selectable = false;
			addChild(m_textField);
			addEventListener(MouseEvent.MOUSE_UP, callback, false, 0, true);
			addEventListener(MouseEvent.MOUSE_UP, m.HideAll, false, 0, true);
			addEventListener(MouseEvent.MOUSE_OVER, highlight, false, 0, true);
			addEventListener(MouseEvent.MOUSE_OUT, deHighlight, false, 0, true);
			
			if (checkBox) {
				if (checkBoxChecked) {
					m_checkBoxBase = new Resource.cGuiMenuCheckBoxBBase();
					m_checkBoxBase.smoothing = true;
					addChild(m_checkBoxBase);
					m_checkBoxRoll = new Resource.cGuiMenuCheckBoxBRoll();
					m_checkBoxRoll.smoothing = true;
					m_checkBoxRoll.visible = false;
					addChild(m_checkBoxRoll);
					m_checkBoxClick = new Resource.cGuiMenuCheckBoxBClick();
					m_checkBoxClick.smoothing = true;
					m_checkBoxClick.visible = false;
					addChild(m_checkBoxClick);
				} else {
					m_checkBoxBase = new Resource.cGuiMenuCheckBoxABase();
					m_checkBoxBase.smoothing = true;
					addChild(m_checkBoxBase);
					m_checkBoxRoll = new Resource.cGuiMenuCheckBoxARoll();
					m_checkBoxRoll.smoothing = true;
					m_checkBoxRoll.visible = false;
					addChild(m_checkBoxRoll);
					m_checkBoxClick = new Resource.cGuiMenuCheckBoxAClick();
					m_checkBoxClick.smoothing = true;
					m_checkBoxClick.visible = false;
					addChild(m_checkBoxClick);
				}
				m_checkBoxBase.x = 3;
				m_checkBoxRoll.x = 3;
				m_checkBoxClick.x = 3;
				addEventListener(MouseEvent.MOUSE_DOWN, click, false, 0, true);
			}
		}
		
		private function highlight(e:MouseEvent):void {
			graphics.beginFill(0xFEB584, 1);
			graphics.lineStyle(0, 0xFEB584);
			graphics.drawRect(1, 1, m_width - 2, 18);
			if (m_checkBoxBase) {
				m_checkBoxBase.visible = false;
				m_checkBoxRoll.visible = !Input.mouseDown;
				m_checkBoxClick.visible = Input.mouseDown;
			}
		}
		
		private function deHighlight(e:MouseEvent):void {
			graphics.beginFill(0xFDF9EA, 1);
			graphics.lineStyle(0, 0xFDF9EA);
			graphics.drawRect(1, 1, m_width - 2, 18);
			if (m_checkBoxBase) {
				m_checkBoxBase.visible = true;
				m_checkBoxRoll.visible = false;
				m_checkBoxClick.visible = false;
			}
		}
		
		private function click(e:MouseEvent):void {
			m_checkBoxBase.visible = false;
			m_checkBoxRoll.visible = false;
			m_checkBoxClick.visible = true;
		}
	}
}