// Port of the IB3 (Box2DFlash 2.1a) b2BuoyancyController
// (ib3-decompiled/scripts/Box2D/Dynamics/Controllers/b2BuoyancyController.as),
// adapted from the 2.1a fixture API to the 2.0.2 shape/body API:
//   body.GetFixtureList()/fixture.GetShape()  ->  body.GetShapeList()/b2Shape
//   fixture.GetUserData().isBuoyant           ->  shape.GetUserData().isBuoyant
//   body.GetTransform()                       ->  body.GetXForm()
// Per-shape submerged area comes from the ComputeSubmergedArea backports on
// b2CircleShape / b2PolygonShape (see b2Shape.ComputeSubmergedArea).
//
// NOTE (ported as shipped): the decompiled IB3 Step has an EMPTY
// `if (body.IsAwake() == false) {}` block — the upstream 2.1a "skip sleeping
// bodies" continue is absent from the shipped SWF, so sleeping bodies are
// still processed (and re-woken by ApplyForce). We reproduce that by not
// skipping sleeping bodies.
// NOTE (ported as shipped): the decompiled useDensity branch assigns 1 in
// BOTH arms (`shapeDensity = useDensity ? 1 : 1`), i.e. the per-shape density
// weighting of upstream 2.1a is compiled out. Kept literal: the buoyancy
// centre equals the submerged-area centroid.

import { b2Vec2 } from "../../Common/Math/b2Vec2";
import type { b2Body } from "../b2Body";
import type { b2Shape } from "../../Collision/Shapes/b2Shape";
import type { b2TimeStep } from "../b2TimeStep";
import { b2Controller } from "./b2Controller";

export class b2BuoyancyController extends b2Controller {
	/** The outer surface normal (pointing out of the fluid). */
	public normal: b2Vec2 = new b2Vec2(0, -1);
	/** The height of the fluid surface along the normal. */
	public offset: number = 0;
	/** The fluid density. */
	public density: number = 0;
	/** Fluid velocity, for drag calculations. */
	public velocity: b2Vec2 = new b2Vec2(0, 0);
	/** Linear drag co-efficient. */
	public linearDrag: number = 2;
	/** Angular drag co-efficient. */
	public angularDrag: number = 1;
	/**
	 * If false, bodies are assumed to be uniformly dense, otherwise use the
	 * shapes' densities. (Compiled out in the shipped IB3 — see file note.)
	 */
	public useDensity: boolean = false;
	/** If true, gravity is taken from the world instead of the gravity parameter. */
	public useWorldGravity: boolean = true;
	/** Gravity vector, if the world's gravity is not used. */
	public gravity: b2Vec2 | null = null;

	public Step(step: b2TimeStep): void {
		if (!this.m_bodyList) return;
		if (this.useWorldGravity) {
			this.gravity = this.GetWorld()!.m_gravity.Copy();
		}
		for (let edge = this.m_bodyList; edge; edge = edge.nextBody!) {
			const body: b2Body = edge.body!;
			// (2.1a had a skip-sleeping-bodies continue here; absent in the
			// shipped IB3 — see file note.)
			const areac = new b2Vec2();
			const massc = new b2Vec2();
			let area = 0.0;
			let mass = 0.0;
			for (let shape: b2Shape | null = body.GetShapeList(); shape; shape = shape.GetNext()) {
				// buoyant=false parts opt their shapes out (ShapePart.buoyant /
				// PrismaticJoint.buoyant -> userData.isBuoyant, mirroring the IB3
				// fixture userData guard).
				const ud = shape.GetUserData();
				if (ud && !ud.isBuoyant) continue;
				const sc = new b2Vec2();
				const sarea = shape.ComputeSubmergedArea(this.normal, this.offset, body.GetXForm(), sc);
				area += sarea;
				areac.x += sarea * sc.x;
				areac.y += sarea * sc.y;
				const shapeDensity = 1; // useDensity compiled out in IB3, see note.
				mass += sarea * shapeDensity;
				massc.x += sarea * sc.x * shapeDensity;
				massc.y += sarea * sc.y * shapeDensity;
			}
			areac.x /= area;
			areac.y /= area;
			massc.x /= mass;
			massc.y /= mass;
			if (area < Number.MIN_VALUE) continue;
			// Buoyancy force.
			const buoyancyForce = this.gravity!.Negative();
			buoyancyForce.Multiply(this.density * area);
			body.ApplyForce(buoyancyForce, massc);
			// Linear drag.
			const dragForce = linearVelocityFromWorldPoint(body, areac);
			dragForce.Subtract(this.velocity);
			dragForce.Multiply(-this.linearDrag * area);
			body.ApplyForce(dragForce, areac);
			// Angular drag.
			body.ApplyTorque((-body.GetInertia() / body.GetMass()) * area * body.GetAngularVelocity() * this.angularDrag);
		}
	}
}

/**
 * The CORRECT world velocity of a world point on a body:
 * v + cross(w, r) = (vx - w*ry, vy + w*rx), r = point - worldCenter.
 *
 * NOT b2Body.GetLinearVelocityFromWorldPoint: the vendored 2.0.2 port carries
 * Box2DFlash 2.0.2's upstream typo there (returns (vx + w*dy, vx - w*dx) — the
 * y component reads m_linearVelocity.x and both cross signs are flipped). That
 * typo is load-bearing for the legacy contact code's replay determinism
 * (GetLinearVelocityFromLocalPoint has the same typo and feeds every contact's
 * reported velocity), so it stays; the water controllers use this correct
 * local helper instead — matching the FIXED 2.1a b2Body the IB3 controllers
 * ran against (otherwise vertical drag is zero and floating never settles).
 */
export function linearVelocityFromWorldPoint(body: b2Body, worldPoint: b2Vec2): b2Vec2 {
	const v = body.GetLinearVelocity();
	const w = body.GetAngularVelocity();
	const c = body.GetWorldCenter();
	return new b2Vec2(v.x - w * (worldPoint.y - c.y), v.y + w * (worldPoint.x - c.x));
}
