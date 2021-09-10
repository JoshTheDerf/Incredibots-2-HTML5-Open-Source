import { b2ContactListener } from "../Box2D";
import { ControllerGame } from "../imports";

export class ContactListener extends b2ContactListener {
  private cont: ControllerGame;

  constructor(contr: ControllerGame) {
    super();
    this.cont = contr;
  }

  /// Called when a contact point is added. This includes the geometry
  /// and the forces.
  public BeginContact(point): void {
    this.cont.ContactAdded(point);
  }
}
