package Actions
{
	import Parts.*;

	public class CameraAction extends Action
	{
		private var isChecked:Boolean;
		private var oldCameraPart:ShapePart
		
		public function CameraAction(p:Part, checked:Boolean, oldPart:ShapePart = null)
		{
			super(p);
			isChecked = checked;
			oldCameraPart = oldPart;
		}
		
		public override function UndoAction():void {
			(partAffected as ShapePart).isCameraFocus = !isChecked;
			if (oldCameraPart) oldCameraPart.isCameraFocus = true;
		}
		
		public override function RedoAction():void {
			(partAffected as ShapePart).isCameraFocus = isChecked;
			if (oldCameraPart) oldCameraPart.isCameraFocus = false;
		}
	}
}