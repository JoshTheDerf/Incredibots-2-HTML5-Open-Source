package Actions
{
	import Parts.Part;

	public class MultiCollideAction extends Action
	{
		private var collide:Boolean;
		private var partsAffected:Array;
	
		public function MultiCollideAction(parts:Array, collideVal:Boolean)
		{
			partsAffected = parts;
			collide = collideVal;
			super(parts[0]);
		}
		
		public override function UndoAction():void {
			for (var i:int = 0; i < partsAffected.length; i++) {
				partsAffected[i].collide = !collide;
			}
		}
		
		public override function RedoAction():void {
			for (var i:int = 0; i < partsAffected.length; i++) {
				partsAffected[i].collide = collide;
			}
		}
	}
}