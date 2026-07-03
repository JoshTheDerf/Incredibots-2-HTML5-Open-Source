// Box2D21 contact wiring — engine 1 (P1.5b-2a, step 3 scaffold).
//
// Installs a 2.1a b2ContactListener whose BeginContact/EndContact translate the
// native 2.1a contact (two b2Fixtures via GetFixtureA/GetFixtureB) into the
// engine-neutral ContactPointLike the shared GameCore hooks consume. Each
// fixture IS the shape handle a ShapePart stored (createShape returns the
// fixture), so `shape1 == part.GetShape()` identity comparisons in
// Condition.ContactAdded work unchanged across engines.
//
// The faithful port of the custom collision FILTER (collide/piston/sandbox
// short-circuits from src/Game/ContactFilter) lands in step 4; until then 2.1a's
// built-in filter (category/mask/groupIndex bits — which the parts already set)
// governs collisions.

import { b2ContactListener } from "../../Box2D21";
import type { b2Contact } from "../../Box2D21";
import type { ContactHooks, ContactPointLike } from "./PhysicsBackend";

/** A b2ContactListener that drives the engine-neutral hooks. */
class Box2D21Listener extends b2ContactListener {
	constructor(private readonly hooks: ContactHooks) {
		super();
	}

	private point(contact: b2Contact): ContactPointLike {
		// Fixtures answer GetUserData() and are the identity a part stored.
		return { shape1: contact.GetFixtureA(), shape2: contact.GetFixtureB() };
	}

	public override BeginContact(contact: b2Contact): void {
		this.hooks.onAdd(this.point(contact));
	}

	public override EndContact(contact: b2Contact): void {
		this.hooks.onRemove(this.point(contact));
	}
}

export function installBox2D21Contacts(
	world: { SetContactListener(l: b2ContactListener): void; SetContactFilter?(f: unknown): void },
	hooks: ContactHooks,
): void {
	world.SetContactListener(new Box2D21Listener(hooks));
}
