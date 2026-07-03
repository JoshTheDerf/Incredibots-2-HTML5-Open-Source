// Port of Box2DFlash 2.1a b2Controller
// (ib3-decompiled/scripts/Box2D/Dynamics/Controllers/b2Controller.as),
// backported into the 2.0.2 tree for the IB3 water controllers (buoyancy /
// tide / wave). Controllers are registered on the world with
// b2World.AddController and stepped at the top of b2World.Solve, exactly
// where 2.1a steps them (b2World.as Solve — controllers apply their forces
// before island solving/integration).
//
// The 2.0.2 b2Body gained an m_controllerList field so DestroyBody can unlink
// a destroyed body from every controller (2.1a b2World.DestroyBody:187-192) —
// bombs destroy bodies mid-sim.

import type { b2Body } from "../b2Body";
import type { b2TimeStep } from "../b2TimeStep";
import type { b2World } from "../b2World";
import { b2ControllerEdge } from "./b2ControllerEdge";

export class b2Controller {
	/** the next controller in the world's controller list */
	public m_next: b2Controller | null = null;
	/** the previous controller in the world's controller list */
	public m_prev: b2Controller | null = null;

	protected m_bodyList: b2ControllerEdge | null = null;
	protected m_bodyCount: number = 0;

	public m_world: b2World | null = null;

	/** Apply the controller's forces; called at the top of b2World.Solve. */
	public Step(step: b2TimeStep): void {}

	/** b2Controller.as AddBody */
	public AddBody(body: b2Body): void {
		const edge = new b2ControllerEdge();
		edge.controller = this;
		edge.body = body;
		// Add edge to controller list.
		edge.nextBody = this.m_bodyList;
		edge.prevBody = null;
		this.m_bodyList = edge;
		if (edge.nextBody) edge.nextBody.prevBody = edge;
		this.m_bodyCount++;
		// Add edge to body list.
		edge.nextController = body.m_controllerList;
		edge.prevController = null;
		body.m_controllerList = edge;
		if (edge.nextController) edge.nextController.prevController = edge;
	}

	/** b2Controller.as RemoveBody */
	public RemoveBody(body: b2Body): void {
		let edge = body.m_controllerList;
		while (edge && edge.controller != this) edge = edge.nextController;
		if (!edge) return;
		// Remove edge from controller list.
		if (edge.prevBody) edge.prevBody.nextBody = edge.nextBody;
		if (edge.nextBody) edge.nextBody.prevBody = edge.prevBody;
		// Remove edge from body list.
		if (edge.nextController) edge.nextController.prevController = edge.prevController;
		if (edge.prevController) edge.prevController.nextController = edge.nextController;
		if (this.m_bodyList == edge) this.m_bodyList = edge.nextBody;
		if (body.m_controllerList == edge) body.m_controllerList = edge.nextController;
		this.m_bodyCount--;
	}

	/** b2Controller.as Clear */
	public Clear(): void {
		while (this.m_bodyList) {
			this.RemoveBody(this.m_bodyList.body!);
		}
	}

	public GetNext(): b2Controller | null {
		return this.m_next;
	}

	public GetWorld(): b2World | null {
		return this.m_world;
	}

	public GetBodyList(): b2ControllerEdge | null {
		return this.m_bodyList;
	}
}
