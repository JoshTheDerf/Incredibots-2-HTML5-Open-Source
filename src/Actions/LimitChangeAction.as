package Actions
{
	import Parts.*;

	public class LimitChangeAction extends Action
	{
		public static var MIN_TYPE:int = 0;
		public static var MAX_TYPE:int = 1;
		
		private var type:int;
		private var oldLimit:Number;
		private var newLimit:Number;
		
		public function LimitChangeAction(p:Part, limitType:int, oldVal:Number, newVal:Number)
		{
			super(p);
			type = limitType;
			oldLimit = oldVal;
			newLimit = newVal;
		}
		
		public override function UndoAction():void {
			if (type == MIN_TYPE) {
				(partAffected as RevoluteJoint).motorLowerLimit = oldLimit;
			} else {
				(partAffected as RevoluteJoint).motorUpperLimit = oldLimit;
			}
		}
		
		public override function RedoAction():void {
			if (type == MIN_TYPE) {
				(partAffected as RevoluteJoint).motorLowerLimit = newLimit;
			} else {
				(partAffected as RevoluteJoint).motorUpperLimit = newLimit;
			}
		}
	}
}