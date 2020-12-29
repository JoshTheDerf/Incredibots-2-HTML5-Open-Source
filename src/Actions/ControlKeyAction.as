package Actions
{
	import Parts.*;

	public class ControlKeyAction extends Action
	{
		public static var CW_TYPE:int = 0;
		public static var CCW_TYPE:int = 1;
		public static var EXPAND_TYPE:int = 2;
		public static var CONTRACT_TYPE:int = 3;
		public static var TEXT_TYPE:int = 4;
		public static var THRUSTERS_TYPE:int = 5;
		public static var CANNON_TYPE:int = 6;
		
		private var type:int;
		private var oldKey:Number;
		private var newKey:Number;
		
		public function ControlKeyAction(p:Part, keyType:int, oldVal:int, newVal:int)
		{
			super(p);
			type = keyType;
			oldKey = oldVal;
			newKey = newVal;
		}
		
		public override function UndoAction():void {
			if (type == CW_TYPE) {
				(partAffected as RevoluteJoint).motorCWKey = oldKey;
			} else if (type == CCW_TYPE) {
				(partAffected as RevoluteJoint).motorCCWKey = oldKey;
			} else if (type == EXPAND_TYPE) {
				(partAffected as PrismaticJoint).pistonUpKey = oldKey;
			} else if (type == CONTRACT_TYPE) {
				(partAffected as PrismaticJoint).pistonDownKey = oldKey;
			} else if (type == TEXT_TYPE) {
				(partAffected as TextPart).displayKey = oldKey;
			} else if (type == THRUSTERS_TYPE) {
				(partAffected as Thrusters).thrustKey = oldKey;
			} else if (type == CANNON_TYPE) {
				(partAffected as Cannon).fireKey = oldKey;
			}
		}
		
		public override function RedoAction():void {
			if (type == CW_TYPE) {
				(partAffected as RevoluteJoint).motorCWKey = newKey;
			} else if (type == CCW_TYPE) {
				(partAffected as RevoluteJoint).motorCCWKey = newKey;
			} else if (type == EXPAND_TYPE) {
				(partAffected as PrismaticJoint).pistonUpKey = newKey;
			} else if (type == CONTRACT_TYPE) {
				(partAffected as PrismaticJoint).pistonDownKey = newKey;
			} else if (type == TEXT_TYPE) {
				(partAffected as TextPart).displayKey = newKey;
			} else if (type == THRUSTERS_TYPE) {
				(partAffected as Thrusters).thrustKey = newKey;
			} else if (type == CANNON_TYPE) {
				(partAffected as Cannon).fireKey = oldKey;
			}
		}
	}
}