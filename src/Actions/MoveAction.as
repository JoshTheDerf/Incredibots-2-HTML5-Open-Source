package Actions
{
	import Parts.*;
	
	public class MoveAction extends Action
	{
		private var movedParts:Array;
		private var xMove:Number;
		private var yMove:Number;
	
		public function MoveAction(p:Part, attachedParts:Array, deltaX:Number, deltaY:Number) {
			super(p);
			xMove = deltaX;
			yMove = deltaY;
			movedParts = attachedParts;
		}
		
		public override function UndoAction():void {
			for (var i:int = 0; i < movedParts.length; i++) {
				if (movedParts[i] is ShapePart || movedParts[i] is Thrusters) {
					movedParts[i].Move(movedParts[i].centerX - xMove, movedParts[i].centerY - yMove);
				} else if (movedParts[i] is TextPart) {
					movedParts[i].Move(movedParts[i].x - xMove, movedParts[i].y - yMove);
				} else {
					movedParts[i].Move(movedParts[i].anchorX - xMove, movedParts[i].anchorY - yMove);
				}
			}
		}
		
		public override function RedoAction():void {
			for (var i:int = 0; i < movedParts.length; i++) {
				if (movedParts[i] is ShapePart || movedParts[i] is Thrusters) {
					movedParts[i].Move(movedParts[i].centerX + xMove, movedParts[i].centerY + yMove);
				} else if (movedParts[i] is TextPart) {
					movedParts[i].Move(movedParts[i].x + xMove, movedParts[i].y + yMove);
				} else {
					movedParts[i].Move(movedParts[i].anchorX + xMove, movedParts[i].anchorY + yMove);
				}
			}
		}
	}
}