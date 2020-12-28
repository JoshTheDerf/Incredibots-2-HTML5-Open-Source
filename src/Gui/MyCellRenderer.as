package Gui
{
	import Game.Graphics.Resource;
	import fl.controls.listClasses.CellRenderer;
	import mx.core.BitmapAsset;

	public class MyCellRenderer extends CellRenderer
	{
		public function MyCellRenderer()
		{
			setStyle("upSkin", listboxBase());
			setStyle("overSkin", listboxRoll());
			setStyle("selectedOverSkin", listboxRoll());
			setStyle("downSkin", listboxClick());
			setStyle("selectedUpSkin", listboxClick());
			setStyle("selectedDownSkin", listboxClick());
		}
		
		public static function listboxBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiListboxBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function listboxRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiListboxRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function listboxClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiListboxClick();
			bm.smoothing = true;
			return bm;
		}
	}
}