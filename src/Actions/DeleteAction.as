package Actions
{
	import Parts.Part;
	import Parts.ShapePart;
	
	public class DeleteAction extends Action
	{
		private var joints:Array;
		
		public function DeleteAction(p:Part, affectedJoints:Array)
		{
			super(p);
			joints = affectedJoints;
		}
		
		public override function UndoAction():void {
			m_controller.allParts.push(partAffected);
			for (var i:int = 0; i < joints.length; i++) {
				m_controller.allParts.push(joints[i]);
				joints[i].isEnabled = true;
			}
			partAffected.isEnabled = true;
		}
		
		public override function RedoAction():void {
			m_controller.DeletePart(partAffected, false);
		}
	}
}