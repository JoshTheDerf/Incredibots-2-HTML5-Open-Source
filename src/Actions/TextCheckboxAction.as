package Actions
{
	import Parts.*;

	public class TextCheckboxAction extends Action
	{
		public static const SCALE_TYPE:int = 0;
		public static const DISPLAY_TYPE:int = 1;
		
		private var type:int;
		private var isChecked:Boolean;
		
		public function TextCheckboxAction(p:Part, checkboxType:int, checked:Boolean)
		{
			super(p);
			type = checkboxType;
			isChecked = checked;
		}
		
		public override function UndoAction():void {
			if (type == SCALE_TYPE) {
				(partAffected as TextPart).scaleWithZoom = !isChecked;
			} else {
				(partAffected as TextPart).alwaysVisible = !isChecked;
			}
		}
		
		public override function RedoAction():void {
			if (type == SCALE_TYPE) {
				(partAffected as TextPart).scaleWithZoom = isChecked;
			} else {
				(partAffected as TextPart).alwaysVisible = isChecked;
			}
		}
	}
}