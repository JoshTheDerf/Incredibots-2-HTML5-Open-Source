package Actions
{
	import Parts.Part;
	import Parts.TextPart;

	public class EnterTextAction extends Action
	{
		private var oldText:String;
		private var newText:String;
		
		public function EnterTextAction(p:Part, oldVal:String, newVal:String)
		{
			super(p);
			oldText = oldVal;
			newText = newVal;
		}
		
		public override function UndoAction():void {
			(partAffected as TextPart).text = oldText;
			(partAffected as TextPart).m_textField.text = oldText;
		}
		
		public override function RedoAction():void {
			(partAffected as TextPart).text = newText;
			(partAffected as TextPart).m_textField.text = newText;
		}
	}
}