package Actions
{
	import Parts.*;

	public class MultiColourChangeAction extends Action
	{
		private var partsAffected:Array;
		private var red:int;
		private var green:int;
		private var blue:int;
		private var opacity:int;
		private var oldReds:Array;
		private var oldGreens:Array;
		private var oldBlues:Array;
		private var oldOpacitys:Array;
		
		public function MultiColourChangeAction(parts:Array, r:int, g:int, b:int, o:int, oldRs:Array, oldGs:Array, oldBs:Array, oldOs:Array)
		{
			partsAffected = parts;
			red = r;
			green = g;
			blue = b;
			opacity = o;
			oldReds = oldRs;
			oldGreens = oldGs;
			oldBlues = oldBs;
			oldOpacitys = oldOs;
			super(parts[0]);
		}
		
		public override function UndoAction():void {
			for (var i:int = 0; i < partsAffected.length; i++) {
				partsAffected[i].red = oldReds[i];
				partsAffected[i].green = oldGreens[i];
				partsAffected[i].blue = oldBlues[i];
				if (!(partsAffected[i] is TextPart)) partsAffected[i].opacity = oldOpacitys[i];
			}
		}
		
		public override function RedoAction():void {
			for (var i:int = 0; i < partsAffected.length; i++) {
				partsAffected[i].red = red;
				partsAffected[i].green = green;
				partsAffected[i].blue = blue;
				if (!(partsAffected[i] is TextPart)) partsAffected[i].opacity = opacity;
			}
		}
	}
}