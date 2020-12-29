package Actions
{
	import Parts.*;

	public class ColourChangeAction extends Action
	{
		private var red:int;
		private var green:int;
		private var blue:int;
		private var opacity:int;
		
		public function ColourChangeAction(p:Part, deltaRed:int, deltaGreen:int, deltaBlue:int, deltaOpacity:int)
		{
			super(p);
			red = deltaRed;
			green = deltaGreen;
			blue = deltaBlue;
			opacity = deltaOpacity;
		}
		
		public override function UndoAction():void {
			if (partAffected is ShapePart || partAffected is PrismaticJoint || partAffected is TextPart) {
				(partAffected as Object).red -= red;
				(partAffected as Object).green -= green;
				(partAffected as Object).blue -= blue;
				if (!(partAffected is TextPart)) (partAffected as Object).opacity -= opacity;
			}
		}
		
		public override function RedoAction():void {
			if (partAffected is ShapePart || partAffected is PrismaticJoint || partAffected is TextPart) {
				(partAffected as Object).red += red;
				(partAffected as Object).green += green;
				(partAffected as Object).blue += blue;
				if (!(partAffected is TextPart)) (partAffected as Object).opacity += opacity;
			}
		}
	}
}