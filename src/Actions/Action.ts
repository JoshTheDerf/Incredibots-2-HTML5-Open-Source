import { ControllerGame } from "../imports";
import { IllegalOperationError, Part } from "../imports";

export class Action {
	public static m_controller:ControllerGame;

	public partAffected:Part;

	constructor(p:Part) {
		this.partAffected = p;
	}

	public UndoAction():void {
		throw new IllegalOperationError("abstract Action.UndoAction() called");
	}

	public RedoAction():void {
		throw new IllegalOperationError("abstract Action.RedoAction() called");
	}
};
