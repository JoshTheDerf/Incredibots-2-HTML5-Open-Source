import { ControllerGame } from "../Game/ControllerGame";
import { IllegalOperationError, Part } from "../Parts/Part";

export class Action {
	public static m_controller:ControllerGame;

	public partAffected:Part;

	constructor(p:Part) {
		this.partAffected = p;
	}

	public UndoAction():void {
		throw new IllegalOperationError("abstract function Action.UndoAction() called");
	}

	public RedoAction():void {
		throw new IllegalOperationError("abstract function Action.RedoAction() called");
	}
};
