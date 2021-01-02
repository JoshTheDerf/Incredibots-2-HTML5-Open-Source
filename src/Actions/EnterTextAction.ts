import { Part } from "../Parts/Part";
import { TextPart } from "../Parts/TextPart";
import { Action } from "./Action";

export class EnterTextAction extends Action
{
	private oldText:string;
	private newText:string;

	constructor(p:Part, oldVal:string, newVal:string)
	{
		super(p);
		this.oldText = oldVal;
		this.newText = newVal;
	}

	public UndoAction():void {
		(this.partAffected as TextPart).text = this.oldText;
		(this.partAffected as TextPart).m_textField.text = this.oldText;
	}

	public RedoAction():void {
		(this.partAffected as TextPart).text = this.newText;
		(this.partAffected as TextPart).m_textField.text = this.newText;
	}
}
