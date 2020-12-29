package Actions
{
	import Parts.Part;

	public class MultiOutlineAction extends Action
	{
		private var outline:Boolean;
		private var partsAffected:Array;
	
		public function MultiOutlineAction(parts:Array, outlineVal:Boolean)
		{
			partsAffected = parts;
			outline = outlineVal;
			super(parts[0]);
		}
		
		public override function UndoAction():void {
			for (var i:int = 0; i < partsAffected.length; i++) {
				partsAffected[i].outline = !outline;
			}
		}
		
		public override function RedoAction():void {
			for (var i:int = 0; i < partsAffected.length; i++) {
				partsAffected[i].outline = outline;
			}
		}
	}
}