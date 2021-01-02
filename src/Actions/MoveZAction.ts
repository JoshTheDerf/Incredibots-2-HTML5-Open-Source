import { Util } from "../General/Util";
import { Part } from "../Parts/Part";
import { TextPart } from "../Parts/TextPart";
import { Action } from "./Action";

export class MoveZAction extends Action
{
	public static FRONT_TYPE:number = 0;
	public static BACK_TYPE:number = 1;

	private type:number;
	private oldIndex:number;

	constructor(p:Part, moveType:number, prevIndex:number = -1)
	{
		super(p);
		this.type = moveType;
		this.oldIndex = prevIndex;
	}

	public UndoAction():void {
		if (this.partAffected instanceof TextPart) {
			if (this.type == MoveZAction.FRONT_TYPE) {
				(this.partAffected as TextPart).inFront = false;
				MoveZAction.m_controller.removeChild((this.partAffected as TextPart).m_textField);
				MoveZAction.m_controller.addChildAt((this.partAffected as TextPart).m_textField, MoveZAction.m_controller.getChildIndex(MoveZAction.m_controller.m_canvas));
			} else {
				(this.partAffected as TextPart).inFront = true;
				MoveZAction.m_controller.removeChild((this.partAffected as TextPart).m_textField);
				MoveZAction.m_controller.addChildAt((this.partAffected as TextPart).m_textField, MoveZAction.m_controller.getChildIndex(MoveZAction.m_controller.m_canvas) + 1);
			}
		} else {
			MoveZAction.m_controller.allParts = Util.RemoveFromArray(this.partAffected, MoveZAction.m_controller.allParts);
			MoveZAction.m_controller.allParts = Util.InsertIntoArray(this.partAffected, MoveZAction.m_controller.allParts, this.oldIndex);
		}
	}

	public RedoAction():void {
		if (this.partAffected instanceof TextPart) {
			if (this.type == MoveZAction.FRONT_TYPE) {
				(this.partAffected as TextPart).inFront = true;
				MoveZAction.m_controller.removeChild((this.partAffected as TextPart).m_textField);
				MoveZAction.m_controller.addChildAt((this.partAffected as TextPart).m_textField, MoveZAction.m_controller.getChildIndex(MoveZAction.m_controller.m_canvas) + 1);
			} else {
				(this.partAffected as TextPart).inFront = false;
				MoveZAction.m_controller.removeChild((this.partAffected as TextPart).m_textField);
				MoveZAction.m_controller.addChildAt((this.partAffected as TextPart).m_textField, MoveZAction.m_controller.getChildIndex(MoveZAction.m_controller.m_canvas));
			}
		} else {
			if (this.type == MoveZAction.FRONT_TYPE) {
				MoveZAction.m_controller.allParts = Util.RemoveFromArray(this.partAffected, MoveZAction.m_controller.allParts);
				MoveZAction.m_controller.allParts.push(this.partAffected);
			} else {
				var foundIt:boolean = false;
				for (var i:number = MoveZAction.m_controller.allParts.length - 1; i > 0; i--) {
					if (MoveZAction.m_controller.allParts[i] == this.partAffected) foundIt = true;
					if (foundIt) {
						if (!MoveZAction.m_controller.allParts[i - 1].isEditable) {
							break;
						}
						MoveZAction.m_controller.allParts[i] = MoveZAction.m_controller.allParts[i - 1];
					}
				}
				MoveZAction.m_controller.allParts[i] = this.partAffected;
			}
		}
	}
}
