package Actions
{
	import General.Util;
	
	import Parts.*;

	public class MoveZAction extends Action
	{
		public static const FRONT_TYPE:int = 0;
		public static const BACK_TYPE:int = 1;
		
		private var type:int;
		private var oldIndex:int;
		
		public function MoveZAction(p:Part, moveType:int, prevIndex:int = -1)
		{
			super(p);
			type = moveType;
			oldIndex = prevIndex;
		}
		
		public override function UndoAction():void {
			if (partAffected is TextPart) {
				if (type == FRONT_TYPE) {
					(partAffected as TextPart).inFront = false;
					m_controller.removeChild((partAffected as TextPart).m_textField);
					m_controller.addChildAt((partAffected as TextPart).m_textField, m_controller.getChildIndex(m_controller.m_canvas));
				} else {
					(partAffected as TextPart).inFront = true;
					m_controller.removeChild((partAffected as TextPart).m_textField);
					m_controller.addChildAt((partAffected as TextPart).m_textField, m_controller.getChildIndex(m_controller.m_canvas) + 1);
				}
			} else {
				m_controller.allParts = Util.RemoveFromArray(partAffected, m_controller.allParts);
				m_controller.allParts = Util.InsertIntoArray(partAffected, m_controller.allParts, oldIndex);
			}
		}
		
		public override function RedoAction():void {
			if (partAffected is TextPart) {
				if (type == FRONT_TYPE) {
					(partAffected as TextPart).inFront = true;
					m_controller.removeChild((partAffected as TextPart).m_textField);
					m_controller.addChildAt((partAffected as TextPart).m_textField, m_controller.getChildIndex(m_controller.m_canvas) + 1);
				} else {
					(partAffected as TextPart).inFront = false;
					m_controller.removeChild((partAffected as TextPart).m_textField);
					m_controller.addChildAt((partAffected as TextPart).m_textField, m_controller.getChildIndex(m_controller.m_canvas));
				}
			} else {
				if (type == FRONT_TYPE) {
					m_controller.allParts = Util.RemoveFromArray(partAffected, m_controller.allParts);
					m_controller.allParts.push(partAffected);
				} else {
					var foundIt:Boolean = false;
					for (var i:int = m_controller.allParts.length - 1; i > 0; i--) {
						if (m_controller.allParts[i] == partAffected) foundIt = true;
						if (foundIt) {
							if (!m_controller.allParts[i - 1].isEditable) {
								break;
							}
							m_controller.allParts[i] = m_controller.allParts[i - 1];
						}
					}
					m_controller.allParts[i] = partAffected;
				}
			}
		}
	}
}