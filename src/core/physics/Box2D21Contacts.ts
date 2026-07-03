// Box2D21 contact wiring — engine 1 (P1.5b-2a, step 4).
//
// Ports the shipped IB2/Jaybit collision filter (src/Game/ContactFilter.ts) AND
// the trigger/condition contact listener onto the 2.1a world, wired to the SAME
// engine-neutral hooks GameCore drives for engine 0. Two pieces:
//
//   1. Box2D21ContactFilter — a b2ContactFilter (2.1a) subclass replicating the
//      shipped ShouldCollide short-circuits (isSandbox force-collide; per-shape
//      `collide=false` opt-outs; same-piston-different-body never-collide). The
//      2.0 filter reads b2Shape.GetUserData()/GetBody(); the 2.1a version reads
//      b2Fixture.GetUserData()/GetBody() — same userData objects (the shared part
//      code sets shapeDef.userData; Box2D21Backend copies it onto the fixture),
//      same fields, so the logic is line-for-line identical. super.ShouldCollide
//      is the 2.1a category/mask/groupIndex test, which is byte-identical to
//      2.0's (collision layers A-D + robot self-collision groups work as-is).
//
//   2. Box2D21Listener — a b2ContactListener whose BeginContact/EndContact map
//      the native 2.1a contact (two b2Fixtures) to a neutral ContactPointLike.
//      Each fixture IS the handle a ShapePart stored (createShape returns the
//      fixture), so `point.shape1 == part.GetShape()` identity comparisons in
//      Condition.ContactAdded hold across engines, and GetUserData() feeds the
//      trigger dispatcher exactly as the 2.0 contact point does.
//
// DOCUMENTED SEMANTIC DIFFERENCES vs engine 0 (contacts):
//   - EVENT GRANULARITY. Engine 0's vendored b2World invokes the listener
//     Add/Remove PER CONTACT POINT (per manifold point; a flush box-on-box seat
//     fires Add twice). Engine 1 (2.1a) fires BeginContact/EndContact PER
//     FIXTURE PAIR — once when the pair starts touching, once when it stops.
//     Consequences: trigger touch COUNTERS (RotatingJoint triggerTouches++/--)
//     accumulate different magnitudes between engines, but stay balanced
//     (every Begin has a matching End), so the sign-based CW-vs-CCW decision and
//     the boolean "touching" condition/bomb-impact latches behave equivalently.
//     Replays are per-engine anyway (task P1.5b-2b), so exact counts need not
//     match — only that a bot behaves sanely under each engine.
//   - SENSORS. 2.1a fires Begin/End for sensor fixtures too; the trigger/
//     condition code already keys off userData, so this is transparent.

import { b2ContactFilter, b2ContactListener } from "../../Box2D21";
import type { b2Contact, b2Fixture, b2World } from "../../Box2D21";
import type { ContactHooks, ContactPointLike } from "./PhysicsBackend";

/** UserData shape the collision filter reads (mirrors ContactFilter.ts). */
interface FilterUserData {
	isSandbox?: boolean;
	collide?: boolean;
	editable?: boolean;
	isPiston?: number;
}

/**
 * 2.1a port of src/Game/ContactFilter.ts (shipped Jaybit ShouldCollide). Every
 * branch is identical to the 2.0 filter with b2Shape -> b2Fixture. See that file
 * for the provenance of each clause (ContactFilter.as:9-28, incl. the Jaybit
 * §7.1 shipped-behavior decision on same-piston segments).
 */
class Box2D21ContactFilter extends b2ContactFilter {
	public override ShouldCollide(fixtureA: b2Fixture, fixtureB: b2Fixture): boolean {
		const ud1 = fixtureA.GetUserData() as FilterUserData | null;
		const ud2 = fixtureB.GetUserData() as FilterUserData | null;

		if ((ud1 && ud1.isSandbox) || (ud2 && ud2.isSandbox)) return true;

		if (ud1 && ud2 && !ud1.collide && (!ud1.editable || ud2.editable) && (ud1.isPiston === -1 || ud2.isPiston === -1))
			return false;
		if (ud1 && ud2 && !ud2.collide && (!ud2.editable || ud1.editable) && (ud1.isPiston === -1 || ud2.isPiston === -1))
			return false;

		if (
			ud1 &&
			ud2 &&
			ud1.isPiston !== -1 &&
			ud2.isPiston !== -1 &&
			!ud1.collide &&
			(!ud1.editable || ud2.editable)
		)
			return false;
		if (
			ud1 &&
			ud2 &&
			ud1.isPiston !== -1 &&
			ud2.isPiston !== -1 &&
			!ud2.collide &&
			(!ud2.editable || ud1.editable)
		)
			return false;

		// Two shaft segments of the SAME piston on different bodies never collide
		// (ContactFilter.ts:26 — the shipped unconditional form).
		if (
			ud1 &&
			ud2 &&
			ud1.isPiston !== -1 &&
			ud2.isPiston !== -1 &&
			ud1.isPiston === ud2.isPiston &&
			fixtureA.GetBody() !== fixtureB.GetBody()
		)
			return false;

		return super.ShouldCollide(fixtureA, fixtureB);
	}
}

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

/** Install engine 1's contact filter + listener onto the 2.1a world. */
export function installBox2D21Contacts(world: b2World, hooks: ContactHooks): void {
	world.SetContactFilter(new Box2D21ContactFilter());
	world.SetContactListener(new Box2D21Listener(hooks));
}
