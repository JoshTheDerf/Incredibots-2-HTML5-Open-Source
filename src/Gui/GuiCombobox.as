package Gui
{
	import Game.Graphics.Resource;
	
	import fl.controls.ComboBox;
	
	import flash.events.MouseEvent;
	import flash.media.*;
	
	import mx.core.BitmapAsset;

	public class GuiCombobox extends ComboBox
	{
		private var buttonOffset:Boolean = false;
		
		public static var rolloverSound:Sound = new Resource.cRoll();
		public static var clickSound:Sound = new Resource.cClick();
		public static var channel:SoundChannel;
		
		public function GuiCombobox(xPos:Number, yPos:Number, w:Number, h:Number)
		{
			width = w;
			height = h;
			x = xPos;
			y = yPos;
			addEventListener(MouseEvent.MOUSE_DOWN, bDown, false, 0, true);
			addEventListener(MouseEvent.CLICK, bUp, false, 0, true);
			addEventListener(MouseEvent.MOUSE_OUT, bUp, false, 0, true);
			addEventListener(MouseEvent.MOUSE_OVER, mouseOver, false, 0, true);
			addEventListener(MouseEvent.CLICK, mouseClick, false, 0, true);
			setStyle("upSkin", comboboxBase());
			setStyle("overSkin", comboboxRoll());
			setStyle("downSkin", comboboxClick());
			setStyle("textPadding", 6);
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
			setStyle("listSkin", GuiTextArea.textAreaBase());
			dropdown.setStyle("cellRenderer", MyCellRenderer);
			selectedIndex = 0;
		}
		
		public function bDown(e:MouseEvent):void {
			if (!e.target.buttonOffset) {
				e.target.x += 2;
				e.target.y += 2;
				e.target.buttonOffset = true;
			}
		}
		
		public function bUp(e:MouseEvent):void {
			if (e.currentTarget.buttonOffset) {
				e.currentTarget.x -= 2;
				e.currentTarget.y -= 2;
				e.currentTarget.buttonOffset = false;
			}
		}
		
		private function mouseOver(e:MouseEvent):void {
			if (Main.enableSound) {
				channel = rolloverSound.play();
				var st:SoundTransform = new SoundTransform(0.3);
				channel.soundTransform = st;
			}
		}
		
		private function mouseClick(e:MouseEvent):void {
			if (Main.enableSound) {
				channel = clickSound.play();
				var st:SoundTransform = new SoundTransform(0.8);
				channel.soundTransform = st;
			}
		}
		
		public static function comboboxBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiComboboxBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function comboboxRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiComboboxRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function comboboxClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiComboboxClick();
			bm.smoothing = true;
			return bm;
		}
	}
}