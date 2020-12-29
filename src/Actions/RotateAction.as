package Actions
{
	import General.Util;
	
	import Parts.*;
	
	public class RotateAction extends Action
	{
		private var angle:Number;
		private var rotatedParts:Array;
	
		public function RotateAction(p:Part, attachedParts:Array, deltaAngle:Number) {
			super(p);
			angle = deltaAngle;
			rotatedParts = attachedParts;
		}
		
		public override function UndoAction():void {
			for (var i:int = 0; i < rotatedParts.length; i++) {
				if (rotatedParts[i] is ShapePart || rotatedParts[i] is Thrusters) {
					rotatedParts[i].rotateAngle = Math.atan2(rotatedParts[i].centerY - (partAffected as Object).centerY, rotatedParts[i].centerX - (partAffected as Object).centerX);
					rotatedParts[i].rotateOrientation = rotatedParts[i].angle;
				} else {
					rotatedParts[i].rotateAngle = Math.atan2(rotatedParts[i].anchorY - (partAffected as Object).centerY, rotatedParts[i].anchorX - (partAffected as Object).centerX);
					if (rotatedParts[i] is PrismaticJoint) {
						rotatedParts[i].rotateOrientation = Util.GetAngle(rotatedParts[i].axis);
					}
				}
				rotatedParts[i].RotateAround((partAffected as Object).centerX, (partAffected as Object).centerY, -angle);
			}
		}
		
		public override function RedoAction():void {
			for (var i:int = 0; i < rotatedParts.length; i++) {
				if (rotatedParts[i] is ShapePart || rotatedParts[i] is Thrusters) {
					rotatedParts[i].rotateAngle = Math.atan2(rotatedParts[i].centerY - (partAffected as Object).centerY, rotatedParts[i].centerX - (partAffected as Object).centerX);
					rotatedParts[i].rotateOrientation = rotatedParts[i].angle;
				} else {
					rotatedParts[i].rotateAngle = Math.atan2(rotatedParts[i].anchorY - (partAffected as Object).centerY, rotatedParts[i].anchorX - (partAffected as Object).centerX);
					if (rotatedParts[i] is PrismaticJoint) {
						rotatedParts[i].rotateOrientation = Util.GetAngle(rotatedParts[i].axis);
					}
				}
				rotatedParts[i].RotateAround((partAffected as Object).centerX, (partAffected as Object).centerY, angle);
			}
		}
	}
}