package Actions
{
	import Parts.Part;
	import Parts.TextPart;

	public class ResizeTextAction extends Action
	{
		private var changeX:Number;
		private var changeY:Number;
		private var changeW:Number;
		private var changeH:Number;
		
		public function ResizeTextAction(p:Part, deltaX:Number, deltaY:Number, deltaW:Number, deltaH:Number)
		{
			super(p);
			changeX = deltaX;
			changeY = deltaY;
			changeW = deltaW;
			changeH = deltaH;
		}
		
		public override function UndoAction():void {
			(partAffected as TextPart).x -= changeX;
			(partAffected as TextPart).y -= changeY;
			(partAffected as TextPart).w -= changeW;
			(partAffected as TextPart).h -= changeH;
		}
		
		public override function RedoAction():void {
			(partAffected as TextPart).x += changeX;
			(partAffected as TextPart).y += changeY;
			(partAffected as TextPart).w += changeW;
			(partAffected as TextPart).h += changeH;
		}
	}
}