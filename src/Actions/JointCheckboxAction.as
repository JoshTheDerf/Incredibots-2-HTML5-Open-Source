package Actions
{
	import Parts.*;

	public class JointCheckboxAction extends Action
	{
		public static const ENABLE_TYPE:int = 0;
		public static const RIGID_TYPE:int = 1;
		public static const AUTO_CW_TYPE:int = 2;
		public static const AUTO_CCW_TYPE:int = 3;
		public static const AUTO_OSCILLATE_TYPE:int = 4;
		public static const AUTO_ON_TYPE:int = 5;
		
		private var type:int;
		private var isChecked:Boolean;
		private var sideEffect:Boolean;
		
		public function JointCheckboxAction(p:Part, checkboxType:int, checked:Boolean, effect:Boolean = false)
		{
			super(p);
			type = checkboxType;
			isChecked = checked;
			sideEffect = effect;
		}
		
		public override function UndoAction():void {
			if (type == ENABLE_TYPE && partAffected is RevoluteJoint) {
				(partAffected as RevoluteJoint).enableMotor = !isChecked;
			} else if (type == ENABLE_TYPE && partAffected is PrismaticJoint) {
				(partAffected as PrismaticJoint).enablePiston = !isChecked;
			} else if (type == RIGID_TYPE && partAffected is RevoluteJoint) {
				(partAffected as RevoluteJoint).isStiff = isChecked;
			} else if (type == RIGID_TYPE && partAffected is PrismaticJoint) {
				(partAffected as PrismaticJoint).isStiff = isChecked;
			} else if (type == AUTO_CW_TYPE) {
				(partAffected as RevoluteJoint).autoCW = !isChecked;
				if (sideEffect) (partAffected as RevoluteJoint).autoCCW = isChecked;
			} else if (type == AUTO_CCW_TYPE) {
				(partAffected as RevoluteJoint).autoCCW = !isChecked;
				if (sideEffect) (partAffected as RevoluteJoint).autoCW = isChecked;
			} else if (type == AUTO_ON_TYPE) {
				(partAffected as Thrusters).autoOn = !isChecked;
			} else {
				(partAffected as PrismaticJoint).autoOscillate = !isChecked;
			}
		}
		
		public override function RedoAction():void {
			if (type == ENABLE_TYPE && partAffected is RevoluteJoint) {
				(partAffected as RevoluteJoint).enableMotor = isChecked;
			} else if (type == ENABLE_TYPE && partAffected is PrismaticJoint) {
				(partAffected as PrismaticJoint).enablePiston = isChecked;
			} else if (type == RIGID_TYPE && partAffected is RevoluteJoint) {
				(partAffected as RevoluteJoint).isStiff = !isChecked;
			} else if (type == RIGID_TYPE && partAffected is PrismaticJoint) {
				(partAffected as PrismaticJoint).isStiff = !isChecked;
			} else if (type == AUTO_CW_TYPE) {
				(partAffected as RevoluteJoint).autoCW = isChecked;
				if (sideEffect) (partAffected as RevoluteJoint).autoCCW = !isChecked;
			} else if (type == AUTO_CCW_TYPE) {
				(partAffected as RevoluteJoint).autoCCW = isChecked;
				if (sideEffect) (partAffected as RevoluteJoint).autoCW = !isChecked;
			} else if (type == AUTO_ON_TYPE) {
				(partAffected as Thrusters).autoOn = isChecked;
			} else {
				(partAffected as PrismaticJoint).autoOscillate = isChecked;
			}
		}
	}
}