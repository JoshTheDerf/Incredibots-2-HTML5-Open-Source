package Actions
{
	import Parts.Part;
	import Parts.ShapePart;
	
	public class CreateAction extends Action
	{
		public function CreateAction(p:Part)
		{
			super(p);
		}
		
		public override function UndoAction():void {
			m_controller.DeletePart(partAffected, false);
		}
		
		public override function RedoAction():void {
			m_controller.allParts.push(partAffected);
			partAffected.isEnabled = true;
		}
	}
}