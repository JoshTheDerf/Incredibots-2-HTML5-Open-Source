package Game
{
	public class LossCondition extends Condition
	{
		public var immediate:Boolean;
		
		public function LossCondition(n:String, s:int, o:int, i:Boolean)
		{
			super(n, s, o);
			immediate = i;
		}
	}
}