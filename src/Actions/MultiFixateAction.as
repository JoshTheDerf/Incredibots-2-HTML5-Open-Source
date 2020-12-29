package Actions
{
	import Parts.Part;

	public class MultiFixateAction extends Action
	{
		private var fixate:Boolean;
		private var partsAffected:Array;
	
		public function MultiFixateAction(parts:Array, fixateVal:Boolean)
		{
			partsAffected = parts;
			fixate = fixateVal;
			super(parts[0]);
		}
		
		public override function UndoAction():void {
			for (var i:int = 0; i < partsAffected.length; i++) {
				partsAffected[i].isStatic = !fixate;
			}
		}
		
		public override function RedoAction():void {
			for (var i:int = 0; i < partsAffected.length; i++) {
				partsAffected[i].isStatic = fixate;
			}
		}
	}
}