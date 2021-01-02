import { b2Contact, b2ContactListener } from "../Box2D";
import { ControllerGame } from "./ControllerGame";

export class ContactListener extends b2ContactListener
{
	private cont:ControllerGame;

	constructor (contr:ControllerGame) {
		super()
		this.cont = contr;
	}

	/// Called when a contact point is added. This includes the geometry
	/// and the forces.
	public BeginContact(point:b2Contact):void {
		this.cont.ContactAdded(point);
	}
}
