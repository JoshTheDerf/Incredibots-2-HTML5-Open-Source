package Actions
{
	import Parts.*;
	
	public class ClearAction extends Action
	{
		private var parts:Array;
		
		public function ClearAction(clearedParts:Array)
		{
			super(clearedParts[0]);
			parts = clearedParts;
		}
		
		public override function UndoAction():void {
			for (var i:int = 0; i < parts.length; i++) {
				m_controller.allParts.push(parts[i]);
				parts[i].isEnabled = true;
			}
		}
		
		public override function RedoAction():void {
			for (var i:int = 0; i < parts.length; i++) {
				m_controller.DeletePart(parts[i], false);
			}
		}
	}
}