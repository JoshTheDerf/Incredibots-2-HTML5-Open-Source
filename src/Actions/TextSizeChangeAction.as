package Actions
{
	import Parts.*;

	public class TextSizeChangeAction extends Action
	{
		private var type:int;
		private var change:int;
		
		public function TextSizeChangeAction(p:Part, delta:int)
		{
			super(p);
			change = delta;
		}
		
		public override function UndoAction():void {
			(partAffected as TextPart).size -= change;
		}
		
		public override function RedoAction():void {
			(partAffected as TextPart).size += change;
		}
	}
}