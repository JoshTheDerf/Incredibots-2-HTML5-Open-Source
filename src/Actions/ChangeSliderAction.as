package Actions
{
	import Parts.*;

	public class ChangeSliderAction extends Action
	{
		public static const DENSITY_TYPE:int = 0;
		public static const STRENGTH_TYPE:int = 1;
		public static const SPEED_TYPE:int = 2;
		
		private var change:int;
		private var type:int;
		
		public function ChangeSliderAction(p:Part, sliderType:int, deltaVal:int)
		{
			super(p);
			type = sliderType;
			change = deltaVal;
		}
		
		public override function UndoAction():void {
			if (type == DENSITY_TYPE) {
				(partAffected as ShapePart).density -= change;
			} else if (type == STRENGTH_TYPE && partAffected is RevoluteJoint) {
				(partAffected as RevoluteJoint).motorStrength -= change;
			} else if (type == STRENGTH_TYPE && partAffected is PrismaticJoint) {
				(partAffected as PrismaticJoint).pistonStrength -= change;
			} else if (type == STRENGTH_TYPE && partAffected is Thrusters) {
				(partAffected as Thrusters).strength -= change;
			} else if (type == STRENGTH_TYPE && partAffected is Cannon) {
				(partAffected as Cannon).strength -= change;
			} else if (type == SPEED_TYPE && partAffected is RevoluteJoint) {
				(partAffected as RevoluteJoint).motorSpeed -= change;
			} else {
				(partAffected as PrismaticJoint).pistonSpeed -= change;
			}
		}
		
		public override function RedoAction():void {
			if (type == DENSITY_TYPE) {
				(partAffected as ShapePart).density += change;
			} else if (type == STRENGTH_TYPE && partAffected is RevoluteJoint) {
				(partAffected as RevoluteJoint).motorStrength += change;
			} else if (type == STRENGTH_TYPE && partAffected is PrismaticJoint) {
				(partAffected as PrismaticJoint).pistonStrength += change;
			} else if (type == STRENGTH_TYPE && partAffected is Thrusters) {
				(partAffected as Thrusters).strength += change;
			} else if (type == STRENGTH_TYPE && partAffected is Cannon) {
				(partAffected as Cannon).strength += change;
			} else if (type == SPEED_TYPE && partAffected is RevoluteJoint) {
				(partAffected as RevoluteJoint).motorSpeed += change;
			} else {
				(partAffected as PrismaticJoint).pistonSpeed += change;
			}
		}
	}
}