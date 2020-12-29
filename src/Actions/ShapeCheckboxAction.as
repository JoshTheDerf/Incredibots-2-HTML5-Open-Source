package Actions
{
	import Parts.*;

	public class ShapeCheckboxAction extends Action
	{
		public static const COLLIDE_TYPE:int = 0;
		public static const FIXATE_TYPE:int = 1;
		public static const OUTLINE_TYPE:int = 2;
		public static const TERRAIN_TYPE:int = 3;
		public static const UNDRAGABLE_TYPE:int = 4;
		
		private var type:int;
		private var isChecked:Boolean;
		
		public function ShapeCheckboxAction(p:Part, checkboxType:int, checked:Boolean)
		{
			super(p);
			type = checkboxType;
			isChecked = checked;
		}
		
		public override function UndoAction():void {
			if (type == COLLIDE_TYPE) {
				if (partAffected is ShapePart) (partAffected as ShapePart).collide = !isChecked;
				else (partAffected as PrismaticJoint).collide = !isChecked;
			} else if (type == FIXATE_TYPE) {
				(partAffected as ShapePart).isStatic = !isChecked;
			} else if (type == OUTLINE_TYPE) {
				if (partAffected is ShapePart) (partAffected as ShapePart).outline = !isChecked;
				else (partAffected as PrismaticJoint).outline = !isChecked;
			} else if (type == TERRAIN_TYPE) {
				(partAffected as ShapePart).terrain = !isChecked;
			} else {
				(partAffected as ShapePart).undragable = !isChecked;
			}
		}
		
		public override function RedoAction():void {
			if (type == COLLIDE_TYPE) {
				if (partAffected is ShapePart) (partAffected as ShapePart).collide = isChecked;
				else (partAffected as PrismaticJoint).collide = isChecked;
			} else if (type == FIXATE_TYPE) {
				(partAffected as ShapePart).isStatic = isChecked;
			} else if (type == OUTLINE_TYPE) {
				if (partAffected is ShapePart) (partAffected as ShapePart).outline = isChecked;
				else (partAffected as PrismaticJoint).outline = isChecked;
			} else if (type == TERRAIN_TYPE) {
				(partAffected as ShapePart).terrain = isChecked;
			} else {
				(partAffected as ShapePart).undragable = !isChecked;
			}
		}
	}
}