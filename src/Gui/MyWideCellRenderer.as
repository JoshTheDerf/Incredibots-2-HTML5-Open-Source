package Gui
{
	import Game.Graphics.Resource;
	import fl.controls.listClasses.CellRenderer;
	import mx.core.BitmapAsset;

	public class MyWideCellRenderer extends CellRenderer
	{
		public function MyWideCellRenderer()
		{
			setStyle("upSkin", listboxBase());
			setStyle("overSkin", listboxRoll());
			setStyle("selectedOverSkin", listboxRoll());
			setStyle("downSkin", listboxClick());
			setStyle("selectedUpSkin", listboxClick());
			setStyle("selectedDownSkin", listboxClick());
		}
		
		public static function listboxBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiListboxWideBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function listboxRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiListboxWideRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function listboxClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiListboxWideClick();
			bm.smoothing = true;
			return bm;
		}
	}
}