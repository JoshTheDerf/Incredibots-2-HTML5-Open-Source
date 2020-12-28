package Gui
{
	import Game.Graphics.Resource;
	
	import fl.controls.TextArea;
	
	import flash.events.*;
	import flash.text.TextFormat;
	
	import mx.core.BitmapAsset;

	public class GuiTextArea extends TextArea
	{
		private var baseSkin:BitmapAsset = textAreaBase();
		private var rollSkin:BitmapAsset = textAreaRoll();
		private var isMouseOver:Boolean = false;
		private var hasFocus:Boolean = false;
		
		public function GuiTextArea(xPos:Number, yPos:Number, w:Number, h:Number, format:TextFormat = null)
		{
			x = xPos;
			y = yPos;
			width = w;
			height = h;
			if (!format) format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x4C3D57;
			setStyle("textFormat", format);
			setStyle("disabledTextFormat", format);
			setStyle("upSkin", baseSkin);
			setStyle("disabledSkin", textAreaDisabled());
			setStyle("trackDisabledSkin", MainEditPanel.scrollbarField());
			setStyle("trackDownSkin", MainEditPanel.scrollbarField());
			setStyle("trackOverSkin", MainEditPanel.scrollbarField());
			setStyle("trackUpSkin", MainEditPanel.scrollbarField());
			setStyle("thumbDisabledSkin", MainEditPanel.scrollbarBase());
			setStyle("thumbDownSkin", MainEditPanel.scrollbarClick());
			setStyle("thumbOverSkin", MainEditPanel.scrollbarRoll());
			setStyle("thumbUpSkin", MainEditPanel.scrollbarBase());
			setStyle("downArrowUpSkin", MainEditPanel.scrollbarButtonDownBase());
			setStyle("downArrowOverSkin", MainEditPanel.scrollbarButtonDownRoll());
			setStyle("downArrowDownSkin", MainEditPanel.scrollbarButtonDownClick());
			setStyle("downArrowDisabledSkin", MainEditPanel.scrollbarButtonDownBase());
			setStyle("upArrowUpSkin", MainEditPanel.scrollbarButtonUpBase());
			setStyle("upArrowOverSkin", MainEditPanel.scrollbarButtonUpRoll());
			setStyle("upArrowDownSkin", MainEditPanel.scrollbarButtonUpClick());
			setStyle("upArrowDisabledSkin", MainEditPanel.scrollbarButtonUpBase());
			
			addEventListener(MouseEvent.MOUSE_OVER, mouseOver, false, 0, true);
			addEventListener(MouseEvent.MOUSE_OUT, mouseOut, false, 0, true);
			addEventListener(FocusEvent.FOCUS_IN, gotFocus, false, 0, true);
			addEventListener(FocusEvent.FOCUS_OUT, lostFocus, false, 0, true);
		}
		
		private function mouseOver(e:MouseEvent):void {
			if (enabled && editable) {
				e.currentTarget.setStyle("upSkin", rollSkin);
				isMouseOver = true;
			}
		}
		
		private function mouseOut(e:MouseEvent):void {
			if (!hasFocus) e.currentTarget.setStyle("upSkin", baseSkin);
			isMouseOver = false;
		}
		
		private function gotFocus(e:Event):void {
			if (enabled && editable) {
				e.currentTarget.setStyle("upSkin", rollSkin);
				hasFocus = true;
			}
		}
		
		private function lostFocus(e:Event):void {
			if (!isMouseOver) e.currentTarget.setStyle("upSkin", baseSkin);
			hasFocus = false;
		}
		
		public static function textAreaBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiTextAreaBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function textAreaRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiTextAreaRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function textAreaDisabled():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiTextAreaDisabled();
			bm.smoothing = true;
			return bm;
		}
	}
}