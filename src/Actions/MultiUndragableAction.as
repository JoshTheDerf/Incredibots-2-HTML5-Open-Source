package Actions
{
	import Parts.Part;

	public class MultiUndragableAction extends Action
	{
		private var undragable:Boolean;
		private var partsAffected:Array;
	
		public function MultiUndragableAction(parts:Array, undragableVal:Boolean)
		{
			partsAffected = parts;
			undragable = undragableVal;
			super(parts[0]);
		}
		
		public override function UndoAction():void {
			for (var i:int = 0; i < partsAffected.length; i++) {
				partsAffected[i].undragable = !undragable;
			}
		}
		
		public override function RedoAction():void {
			for (var i:int = 0; i < partsAffected.length; i++) {
				partsAffected[i].undragable = undragable;
			}
		}
	}
}