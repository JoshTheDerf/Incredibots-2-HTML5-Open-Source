// Port of Box2DFlash 2.1a b2ControllerEdge
// (ib3-decompiled/scripts/Box2D/Dynamics/Controllers/b2ControllerEdge.as),
// backported into the 2.0.2 tree for the IB3 water controllers. A doubly
// linked "edge" node connecting a controller to a body, mirrored on both the
// controller's body list and the body's controller list (b2Body.m_controllerList).

import type { b2Body } from "../b2Body";
import type { b2Controller } from "./b2Controller";

export class b2ControllerEdge {
	/** provides quick access to other end of this edge */
	public controller: b2Controller | null = null;
	/** the body */
	public body: b2Body | null = null;
	/** the previous controller edge in the controller's body list */
	public prevBody: b2ControllerEdge | null = null;
	/** the next controller edge in the controller's body list */
	public nextBody: b2ControllerEdge | null = null;
	/** the previous controller edge in the body's controller list */
	public prevController: b2ControllerEdge | null = null;
	/** the next controller edge in the body's controller list */
	public nextController: b2ControllerEdge | null = null;
}
