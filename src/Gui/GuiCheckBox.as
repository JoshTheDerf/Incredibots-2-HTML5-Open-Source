package Gui
{
	import fl.controls.CheckBox;
	import flash.events.MouseEvent;
	import flash.media.*;
	import Game.Graphics.Resource;
	
	public class GuiCheckBox extends CheckBox
	{
		public static var clickSound:Sound = new Resource.cClick();
		public static var channel:SoundChannel;
		
		public function GuiCheckBox()
		{
			addEventListener(MouseEvent.CLICK, mouseClick, false, 0, true);
			
			setStyle("upIcon", MainEditPanel.checkboxUncheckedBase());
			setStyle("overIcon", MainEditPanel.checkboxUncheckedRoll());
			setStyle("downIcon", MainEditPanel.checkboxUncheckedClick());
			setStyle("disabledIcon", MainEditPanel.checkboxUncheckedDisabled());
			setStyle("selectedUpIcon", MainEditPanel.checkboxCheckedBase());
			setStyle("selectedOverIcon", MainEditPanel.checkboxCheckedRoll());
			setStyle("selectedDownIcon", MainEditPanel.checkboxCheckedClick());
			setStyle("selectedDisabledIcon", MainEditPanel.checkboxCheckedDisabled());
		}

		private function mouseClick(e:MouseEvent):void {
			if (Main.enableSound) {
				channel = clickSound.play();
				var st:SoundTransform = new SoundTransform(0.8);
				channel.soundTransform = st;
			}
		}
	}
}