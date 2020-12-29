package Actions
{
	import Parts.*;

	public class MassCreateAction extends Action
	{
		private var parts:Array;
		
		public function MassCreateAction(createdParts:Array)
		{
			super(createdParts[0]);
			parts = createdParts;
		}
		
		public override function UndoAction():void {
			for (var i:int = 0; i < parts.length; i++) {
				if (parts[i] is ShapePart || parts[i] is TextPart) {
					m_controller.DeletePart(parts[i], false);
				}
			}
		}
		
		public override function RedoAction():void {
			for (var i:int = 0; i < parts.length; i++) {
				m_controller.allParts.push(parts[i]);
				parts[i].isEnabled = true;
			}
		}
	}
}