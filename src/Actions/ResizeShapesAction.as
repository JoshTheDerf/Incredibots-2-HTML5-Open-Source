package Actions
{
	import Parts.*;

	public class ResizeShapesAction extends Action
	{
		private var partsAffected:Array;
		private var scaleFactor:Number;
		
		public function ResizeShapesAction(parts:Array, s:Number)
		{
			partsAffected = parts;
			scaleFactor = s;
			super(partsAffected[0]);
		}
		
		public override function UndoAction():void {
			var initDragX:Number = (partsAffected[0] is JointPart ? partsAffected[0].anchorX : (partsAffected[0] is TextPart ? partsAffected[0].x + partsAffected[0].w / 2 : partsAffected[0].centerX));
			var initDragY:Number = (partsAffected[0] is JointPart ? partsAffected[0].anchorY : (partsAffected[0] is TextPart ? partsAffected[0].y + partsAffected[0].h / 2 : partsAffected[0].centerY));
			for (i = 0; i < partsAffected.length; i++) {
				partsAffected[i].dragXOff = (partsAffected[i] is JointPart ? partsAffected[i].anchorX : (partsAffected[i] is TextPart ? partsAffected[i].x + partsAffected[i].w / 2 : partsAffected[i].centerX)) - initDragX;
				partsAffected[i].dragYOff = (partsAffected[i] is JointPart ? partsAffected[i].anchorY : (partsAffected[i] is TextPart ? partsAffected[i].y + partsAffected[i].h / 2 : partsAffected[i].centerY)) - initDragY;
				partsAffected[i].PrepareForResizing();
			}
			for (var i:int = 0; i < partsAffected.length; i++) {
				if (partsAffected[i] is Circle) {
					partsAffected[i].radius = partsAffected[i].radius / scaleFactor;
					partsAffected[i].Move(initDragX + partsAffected[i].dragXOff / scaleFactor, initDragY + partsAffected[i].dragYOff / scaleFactor);
				} else if (partsAffected[i] is Rectangle) {
					partsAffected[i].w = partsAffected[i].w / scaleFactor;
					partsAffected[i].h = partsAffected[i].h / scaleFactor;
					partsAffected[i].Move(initDragX + partsAffected[i].dragXOff / scaleFactor, initDragY + partsAffected[i].dragYOff / scaleFactor);
				} else if (partsAffected[i] is Triangle) {
					partsAffected[i].centerX = initDragX + partsAffected[i].dragXOff / scaleFactor;
					partsAffected[i].centerY = initDragY + partsAffected[i].dragYOff / scaleFactor;
					partsAffected[i].x1 = partsAffected[i].centerX + partsAffected[i].initX1 / scaleFactor;
					partsAffected[i].y1 = partsAffected[i].centerY + partsAffected[i].initY1 / scaleFactor;
					partsAffected[i].x2 = partsAffected[i].centerX + partsAffected[i].initX2 / scaleFactor;
					partsAffected[i].y2 = partsAffected[i].centerY + partsAffected[i].initY2 / scaleFactor;
					partsAffected[i].x3 = partsAffected[i].centerX + partsAffected[i].initX3 / scaleFactor;
					partsAffected[i].y3 = partsAffected[i].centerY + partsAffected[i].initY3 / scaleFactor;
				} else if (partsAffected[i] is Cannon) {
					partsAffected[i].w = partsAffected[i].w / scaleFactor;
					partsAffected[i].Move(initDragX + partsAffected[i].dragXOff / scaleFactor, initDragY + partsAffected[i].dragYOff / scaleFactor);
				} else if (partsAffected[i] is JointPart) {
					partsAffected[i].Move(initDragX + partsAffected[i].dragXOff / scaleFactor, initDragY + partsAffected[i].dragYOff / scaleFactor);
					if (partsAffected[i] is PrismaticJoint) {
						partsAffected[i].initLength = partsAffected[i].initInitLength / scaleFactor;
					} 
				} else if (partsAffected[i] is TextPart) {
					partsAffected[i].w = partsAffected[i].w / scaleFactor;
					partsAffected[i].h = partsAffected[i].h / scaleFactor;
					partsAffected[i].x = initDragX + partsAffected[i].dragXOff / scaleFactor - partsAffected[i].w / 2;
					partsAffected[i].y = initDragY + partsAffected[i].dragYOff / scaleFactor - partsAffected[i].h / 2;
				} else if (partsAffected[i] is Thrusters) {
					partsAffected[i].Move(initDragX + partsAffected[i].dragXOff / scaleFactor, initDragY + partsAffected[i].dragYOff / scaleFactor);
				}
			}
		}
		
		public override function RedoAction():void {
			var initDragX:Number = (partsAffected[0] is JointPart ? partsAffected[0].anchorX : (partsAffected[0] is TextPart ? partsAffected[0].x + partsAffected[0].w / 2 : partsAffected[0].centerX));
			var initDragY:Number = (partsAffected[0] is JointPart ? partsAffected[0].anchorY : (partsAffected[0] is TextPart ? partsAffected[0].y + partsAffected[0].h / 2 : partsAffected[0].centerY));
			for (i = 0; i < partsAffected.length; i++) {
				partsAffected[i].dragXOff = (partsAffected[i] is JointPart ? partsAffected[i].anchorX : (partsAffected[i] is TextPart ? partsAffected[i].x + partsAffected[i].w / 2 : partsAffected[i].centerX)) - initDragX;
				partsAffected[i].dragYOff = (partsAffected[i] is JointPart ? partsAffected[i].anchorY : (partsAffected[i] is TextPart ? partsAffected[i].y + partsAffected[i].h / 2 : partsAffected[i].centerY)) - initDragY;
				partsAffected[i].PrepareForResizing();
			}
			for (var i:int = 0; i < partsAffected.length; i++) {
				if (partsAffected[i] is Circle) {
					partsAffected[i].radius = partsAffected[i].radius * scaleFactor;
					partsAffected[i].Move(initDragX + partsAffected[i].dragXOff * scaleFactor, initDragY + partsAffected[i].dragYOff * scaleFactor);
				} else if (partsAffected[i] is Rectangle) {
					partsAffected[i].w = partsAffected[i].w * scaleFactor;
					partsAffected[i].h = partsAffected[i].h * scaleFactor;
					partsAffected[i].Move(initDragX + partsAffected[i].dragXOff * scaleFactor, initDragY + partsAffected[i].dragYOff * scaleFactor);
				} else if (partsAffected[i] is Triangle) {
					partsAffected[i].centerX = initDragX + partsAffected[i].dragXOff * scaleFactor;
					partsAffected[i].centerY = initDragY + partsAffected[i].dragYOff * scaleFactor;
					partsAffected[i].x1 = partsAffected[i].centerX + partsAffected[i].initX1 * scaleFactor;
					partsAffected[i].y1 = partsAffected[i].centerY + partsAffected[i].initY1 * scaleFactor;
					partsAffected[i].x2 = partsAffected[i].centerX + partsAffected[i].initX2 * scaleFactor;
					partsAffected[i].y2 = partsAffected[i].centerY + partsAffected[i].initY2 * scaleFactor;
					partsAffected[i].x3 = partsAffected[i].centerX + partsAffected[i].initX3 * scaleFactor;
					partsAffected[i].y3 = partsAffected[i].centerY + partsAffected[i].initY3 * scaleFactor;
				} else if (partsAffected[i] is Cannon) {
					partsAffected[i].w = partsAffected[i].w * scaleFactor;
					partsAffected[i].Move(initDragX + partsAffected[i].dragXOff * scaleFactor, initDragY + partsAffected[i].dragYOff * scaleFactor);
				} else if (partsAffected[i] is JointPart) {
					partsAffected[i].Move(initDragX + partsAffected[i].dragXOff * scaleFactor, initDragY + partsAffected[i].dragYOff * scaleFactor);
					if (partsAffected[i] is PrismaticJoint) {
						partsAffected[i].initLength = partsAffected[i].initInitLength * scaleFactor;
					} 
				} else if (partsAffected[i] is TextPart) {
					partsAffected[i].w = partsAffected[i].w * scaleFactor;
					partsAffected[i].h = partsAffected[i].h * scaleFactor;
					partsAffected[i].x = initDragX + partsAffected[i].dragXOff * scaleFactor - partsAffected[i].w / 2;
					partsAffected[i].y = initDragY + partsAffected[i].dragYOff * scaleFactor - partsAffected[i].h / 2;
				} else if (partsAffected[i] is Thrusters) {
					partsAffected[i].Move(initDragX + partsAffected[i].dragXOff / scaleFactor, initDragY + partsAffected[i].dragYOff / scaleFactor);
				}
			}
		}
	}
}