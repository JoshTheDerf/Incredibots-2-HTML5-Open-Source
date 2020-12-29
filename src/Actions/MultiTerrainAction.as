package Actions
{
	import Parts.Part;

	public class MultiTerrainAction extends Action
	{
		private var terrain:Boolean;
		private var partsAffected:Array;
	
		public function MultiTerrainAction(parts:Array, terrainVal:Boolean)
		{
			partsAffected = parts;
			terrain = terrainVal;
			super(parts[0]);
		}
		
		public override function UndoAction():void {
			for (var i:int = 0; i < partsAffected.length; i++) {
				partsAffected[i].terrain = !terrain;
			}
		}
		
		public override function RedoAction():void {
			for (var i:int = 0; i < partsAffected.length; i++) {
				partsAffected[i].terrain = terrain;
			}
		}
	}
}