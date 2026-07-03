// CHARACTERIZATION — Jaybit Edition (2.33.0.1) wave-1 physics features pinned
// to the decompiled sources.
//
// Covers: adjustable friction/restitution (defaults 11/7 must reproduce CE's
// hardcoded 0.4/0.3 exactly), collision layers A-D + self-collision encoding
// and ContactFilter semantics (including the sandbox-terrain short-circuit and
// the shipped always-false same-piston clause), the 500->750 shape limit with
// the sandbox exclusion, copy/mirror field propagation (the Jaybit
// mirror/copy-paste collision-group fix), challenge friction/restitution
// restriction clamps, and the two Box2D engine constants. Every expected value
// cites the decompiled Jaybit source it is derived from.

import { describe, expect, it } from "vitest";
import { b2AABB, b2FilterData, b2Settings, b2Vec2, b2World } from "../src/Box2D";
import { ContactFilter } from "../src/Game/ContactFilter";
import { Util } from "../src/General/Util";
import { Cannon } from "../src/Parts/Cannon";
import { Circle } from "../src/Parts/Circle";
import { FixedJoint } from "../src/Parts/FixedJoint";
import { PrismaticJoint } from "../src/Parts/PrismaticJoint";
import { Rectangle } from "../src/Parts/Rectangle";
import { TextPart } from "../src/Parts/TextPart";
import { Triangle } from "../src/Parts/Triangle";
import {
	COLLISION_GROUP_UNSET,
	DEFAULT_FRICTION,
	DEFAULT_RESTITUTION,
	TRIGGER_NONE,
} from "../src/Parts/partDefaults";
import { coreWithParts, getPart } from "./helpers";

/** A fresh b2World matching GameCore.createWorld's extents/gravity. */
function makeWorld(): b2World {
	const aabb = new b2AABB();
	aabb.lowerBound.Set(-300, -200);
	aabb.upperBound.Set(300, 200);
	return new b2World(aabb, new b2Vec2(0, 15), true);
}

// --- §1 Adjustable friction & restitution --------------------------------

describe("friction/restitution UI-scale conversions (Jaybit Util.as:33/:161)", () => {
	it("defaults 11/7 convert to CE's hardcoded 0.4/0.3 exactly", () => {
		expect(Util.ConvertFrictionToBox2D(11)).toBe(0.4);
		expect(Util.ConvertRestitutionToBox2D(7)).toBe(0.3);
	});
	it("friction spans 0.15..0.875 over 1..30 and clamps outside", () => {
		expect(Util.ConvertFrictionToBox2D(1)).toBe(0.15);
		expect(Util.ConvertFrictionToBox2D(30)).toBe(0.875);
		expect(Util.ConvertFrictionToBox2D(-5)).toBe(0.15);
		expect(Util.ConvertFrictionToBox2D(100)).toBe(0.875);
	});
	it("restitution spans 0.18..0.76 over 1..30 and clamps outside", () => {
		expect(Util.ConvertRestitutionToBox2D(1)).toBe(0.18);
		expect(Util.ConvertRestitutionToBox2D(30)).toBe(0.76);
		expect(Util.ConvertRestitutionToBox2D(0)).toBe(0.18);
		expect(Util.ConvertRestitutionToBox2D(31)).toBe(0.76);
	});
});

describe("ShapePart Jaybit field defaults (ShapePart.as:22-80)", () => {
	it("friction defaults to 11, restitution to 7", () => {
		const c = new Circle(0, 0, 1);
		expect(c.friction).toBe(DEFAULT_FRICTION);
		expect(c.friction).toBe(11);
		expect(c.restitution).toBe(DEFAULT_RESTITUTION);
		expect(c.restitution).toBe(7);
	});
	it("collision layers default to all-on, subColl off", () => {
		const c = new Circle(0, 0, 1);
		expect(c.collA).toBe(true);
		expect(c.collB).toBe(true);
		expect(c.collC).toBe(true);
		expect(c.collD).toBe(true);
		expect(c.subColl).toBe(false);
	});
	it("trigger fields default to NONE/empty/false (data-only this wave)", () => {
		const c = new Circle(0, 0, 1);
		expect(c.triggerAction).toBe(TRIGGER_NONE);
		expect(c.triggerAction_2).toBe(TRIGGER_NONE);
		expect(c.triggerName).toBe("");
		expect(c.triggerName_2).toBe("");
		expect(c.onGroundHit).toBe(false);
		expect(c.onGroundHit_2).toBe(false);
		expect(c.onSameName).toBe(false);
		expect(c.onSameName_2).toBe(false);
	});
	it("PrismaticJoint defaults: layers all-on, subColl off, triggerList empty", () => {
		const pj = new PrismaticJoint(new Circle(0, 0, 1), new Circle(3, 0, 1), 0, 0, 3, 0);
		expect(pj.collA).toBe(true);
		expect(pj.collB).toBe(true);
		expect(pj.collC).toBe(true);
		expect(pj.collD).toBe(true);
		expect(pj.subColl).toBe(false);
		expect(pj.triggerList).toBe("");
	});
});

describe("default-valued fixtures are physically identical to CE (Circle.as:115-117)", () => {
	it("a default Circle Inits with friction 0.4 / restitution 0.3 / density 2.0", () => {
		const world = makeWorld();
		const c = new Circle(0, 0, 1);
		c.Init(world);
		const shape = c.GetShape()! as any;
		expect(shape.m_friction).toBe(0.4);
		expect(shape.m_restitution).toBe(0.3);
		expect(shape.m_density).toBe(2.0);
	});
	it("non-default values pass through the conversions (Rectangle.as:123-124)", () => {
		const world = makeWorld();
		const r = new Rectangle(0, 0, 2, 1);
		r.friction = 30;
		r.restitution = 1;
		r.Init(world);
		const shape = r.GetShape()! as any;
		expect(shape.m_friction).toBe(0.875);
		expect(shape.m_restitution).toBe(0.18);
	});
	it("prismatic shaft segments stay hardcoded 0.4/0.3 (PrismaticJoint.as:244-246)", () => {
		const world = makeWorld();
		const c1 = new Circle(0, 0, 1);
		const c2 = new Circle(3, 0, 1);
		const pj = new PrismaticJoint(c1, c2, 0, 0, 3, 0);
		c1.Init(world);
		c2.Init(world);
		pj.Init(world);
		for (const seg of pj.GetShapes() as any[]) {
			expect(seg.m_friction).toBe(0.4);
			expect(seg.m_restitution).toBe(0.3);
		}
	});
	it("cannonballs inherit the CANNON's material (Cannon.as:242-244)", () => {
		const world = makeWorld();
		const cannon = new Cannon(0, 0, 2);
		cannon.friction = 20; // -> 0.625
		cannon.restitution = 12; // -> 0.4
		cannon.Init(world);
		cannon.KeyInput(cannon.fireKey, true, false);
		cannon.Update(world);
		expect(cannon.cannonballs.length).toBe(1);
		const ball = cannon.cannonballs[0].GetShapeList() as any;
		expect(ball.m_friction).toBe(0.625);
		expect(ball.m_restitution).toBe(0.4);
	});
});

// --- §2 Collision layers A-D + self-collision -----------------------------

describe("collision layer bit encoding (Circle.as:96-118)", () => {
	it("4 bits per layer: A=15, B=240, C=3840, D=61440; all-on=0xFFFF; all-off=0", () => {
		const bits = (a: boolean, b: boolean, c: boolean, d: boolean) =>
			Circle.CollisionBits(a, b, c, d);
		expect(bits(true, false, false, false)).toBe(15);
		expect(bits(false, true, false, false)).toBe(240);
		expect(bits(false, false, true, false)).toBe(3840);
		expect(bits(false, false, false, true)).toBe(61440);
		expect(bits(true, true, true, true)).toBe(0xffff);
		expect(bits(false, false, false, false)).toBe(0);
	});
	it("Init writes category == mask == the layer bits (Triangle/Cannon identical)", () => {
		const world = makeWorld();
		const t = new Triangle(0, 0, 2, 0, 1, 2);
		t.collA = false;
		t.collC = false;
		t.collD = false; // only layer B
		t.Init(world);
		const filter = (t.GetShape()! as any).m_filter;
		expect(filter.categoryBits).toBe(240);
		expect(filter.maskBits).toBe(240);
	});
	it("an unassigned collision group leaves groupIndex 0 (COLLISION_GROUP_UNSET sentinel fix)", () => {
		// The old guard compared against Number.MIN_VALUE (5e-324) while the field
		// defaulted to MIN_SAFE_INTEGER, so an unassigned part got
		// groupIndex = -9007199254740991. With the shared sentinel it stays 0.
		const world = makeWorld();
		const c = new Circle(0, 0, 1);
		expect(c.m_collisionGroup).toBe(COLLISION_GROUP_UNSET);
		c.Init(world);
		expect((c.GetShape()! as any).m_filter.groupIndex).toBe(0);
	});
	it("cannonball copies the cannon's bits, EXCEPT all-off => 0xFFFF (Cannon.as:214-243)", () => {
		const world = makeWorld();
		const cannon = new Cannon(0, 0, 2);
		cannon.collA = false;
		cannon.collB = false;
		cannon.collC = false;
		cannon.collD = false;
		cannon.Init(world);
		// The cannon body itself gets bits 0 (collides with nothing via filter)…
		expect((cannon.GetShape()! as any).m_filter.categoryBits).toBe(0);
		cannon.KeyInput(cannon.fireKey, true, false);
		cannon.Update(world);
		// …but its balls collide with every layer.
		const ballFilter = (cannon.cannonballs[0].GetShapeList() as any).m_filter;
		expect(ballFilter.categoryBits).toBe(0xffff);
		expect(ballFilter.maskBits).toBe(0xffff);

		// A one-layer cannon's ball copies that layer's bits verbatim.
		const cannon2 = new Cannon(10, 0, 2);
		cannon2.collB = false;
		cannon2.collC = false;
		cannon2.collD = false; // only A
		cannon2.Init(world);
		cannon2.KeyInput(cannon2.fireKey, true, false);
		cannon2.Update(world);
		expect((cannon2.cannonballs[0].GetShapeList() as any).m_filter.categoryBits).toBe(15);
	});
	it("prismatic shaft segments carry the JOINT's layer bits and part1/2's groupIndex (PrismaticJoint.as:247-254)", () => {
		const world = makeWorld();
		const c1 = new Circle(0, 0, 1);
		const c2 = new Circle(3, 0, 1);
		const pj = new PrismaticJoint(c1, c2, 0, 0, 3, 0);
		pj.collA = false;
		pj.collD = false; // layers B+C = 240 + 3840
		c1.checkedCollisionGroup = false;
		c2.checkedCollisionGroup = false;
		pj.checkedCollisionGroup = false;
		c1.SetCollisionGroup(-1);
		c1.Init(world);
		c2.Init(world);
		pj.Init(world);
		// Jaybit removed CE's part-shape categoryBits overwrite: the part shapes
		// keep their own layer bits (all-on default = 0xFFFF).
		expect((c1.GetShape()! as any).m_filter.categoryBits).toBe(0xffff);
		for (const seg of pj.GetShapes() as any[]) {
			expect(seg.m_filter.categoryBits).toBe(240 + 3840);
			expect(seg.m_filter.maskBits).toBe(240 + 3840);
			expect(seg.m_filter.groupIndex).toBe(-1);
		}
	});
});

describe("SetCollisionGroup flood-fill + subColl (ShapePart.as:430-455)", () => {
	it("a subColl shape gets groupIndex 0 but still propagates the original id", () => {
		const a = new Circle(0, 0, 1);
		const b = new Circle(1, 0, 1);
		const c = new Circle(2, 0, 1);
		new FixedJoint(a, b, 0.5, 0);
		new FixedJoint(b, c, 1.5, 0);
		b.subColl = true;
		for (const p of [a, b, c]) p.checkedCollisionGroup = false;
		a.SetCollisionGroup(-7);
		expect(a.m_collisionGroup).toBe(-7);
		expect(b.m_collisionGroup).toBe(0); // self-collision: defer to layer bits
		expect(c.m_collisionGroup).toBe(-7); // the fill passed the ORIGINAL id on
	});
	it("the flood-fill also stamps PrismaticJoints (NEW in Jaybit)", () => {
		const a = new Circle(0, 0, 1);
		const b = new Circle(3, 0, 1);
		const pj = new PrismaticJoint(a, b, 0, 0, 3, 0);
		for (const p of [a, b, pj]) p.checkedCollisionGroup = false;
		a.SetCollisionGroup(-3);
		expect(pj.m_collisionGroup).toBe(-3);

		// A subColl joint stamps itself 0 instead (dead for physics — Init
		// overwrites the segments' groupIndex — but ported faithfully).
		const a2 = new Circle(0, 5, 1);
		const b2 = new Circle(3, 5, 1);
		const pj2 = new PrismaticJoint(a2, b2, 0, 5, 3, 5);
		pj2.subColl = true;
		for (const p of [a2, b2, pj2]) p.checkedCollisionGroup = false;
		a2.SetCollisionGroup(-4);
		expect(pj2.m_collisionGroup).toBe(0);
	});
});

// --- ContactFilter.ShouldCollide (Game/ContactFilter.as:14-45) ------------

/** A minimal fake of the b2Shape surface ShouldCollide touches. */
function fakeShape(userData: any, filter: b2FilterData, body: object) {
	return {
		GetUserData: () => userData,
		GetBody: () => body,
		GetFilterData: () => filter,
		m_filter: filter,
	};
}

function filterData(category: number, group: number = 0): b2FilterData {
	const f = new b2FilterData();
	f.categoryBits = category;
	f.maskBits = 0xffff & category; // Jaybit invariant: mask == category
	f.groupIndex = group;
	return f;
}

const ROBOT_UD = { collide: true, editable: true, isPiston: -1 };

describe("ContactFilter.ShouldCollide (Jaybit ContactFilter.as:14-45)", () => {
	const cf = new ContactFilter();
	const bodyA = {};
	const bodyB = {};

	it("sandbox terrain ALWAYS collides, even with all layers off (:16-19)", () => {
		const terrain = fakeShape({ isSandbox: true }, filterData(0xffff), bodyA);
		const allOff = fakeShape(ROBOT_UD, filterData(0), bodyB);
		expect(cf.ShouldCollide(terrain, allOff)).toBe(true);
		expect(cf.ShouldCollide(allOff, terrain)).toBe(true);
	});
	it("shapes collide iff they share at least one enabled layer (mask == category)", () => {
		const layerA = fakeShape(ROBOT_UD, filterData(15), bodyA);
		const layerB = fakeShape(ROBOT_UD, filterData(240), bodyB);
		const layerAB = fakeShape(ROBOT_UD, filterData(15 + 240), bodyB);
		expect(cf.ShouldCollide(layerA, layerB)).toBe(false); // disjoint layers
		expect(cf.ShouldCollide(layerA, layerAB)).toBe(true); // share layer A
		expect(cf.ShouldCollide(layerB, layerAB)).toBe(true); // share layer B
	});
	it("an all-layers-off shape falls through everything non-sandbox", () => {
		const allOff = fakeShape(ROBOT_UD, filterData(0), bodyA);
		const allOn = fakeShape(ROBOT_UD, filterData(0xffff), bodyB);
		expect(cf.ShouldCollide(allOff, allOn)).toBe(false);
	});
	it("same negative group never collides; subColl's group 0 defers to the bits", () => {
		// Same structure: both stamped with the structure's negative group.
		const s1 = fakeShape(ROBOT_UD, filterData(0xffff, -1), bodyA);
		const s2 = fakeShape(ROBOT_UD, filterData(0xffff, -1), bodyB);
		expect(cf.ShouldCollide(s1, s2)).toBe(false);
		// A subColl member keeps groupIndex 0, so it hits its own robot per bits.
		const sub = fakeShape(ROBOT_UD, filterData(0xffff, 0), bodyB);
		expect(cf.ShouldCollide(s1, sub)).toBe(true);
	});
	it('a non-colliding editable shape passes through editable shapes (the "collide" checkbox, :20-35)', () => {
		const ghost = fakeShape({ collide: false, editable: true, isPiston: -1 }, filterData(0xffff), bodyA);
		const solid = fakeShape(ROBOT_UD, filterData(0xffff), bodyB);
		expect(cf.ShouldCollide(ghost, solid)).toBe(false);
		expect(cf.ShouldCollide(solid, ghost)).toBe(false);
	});
	it("same-piston segments on different bodies NEVER collide (shipped Jaybit :36-39)", () => {
		// The decompiled gate `Boolean(userData.isDestroyed)` coerces a bound
		// method reference — always true in shipped Jaybit — so this clause fires
		// unconditionally and CE's force-collide clause (same piston + same
		// groupIndex -> true) is dead. CE would have returned true here.
		const seg1 = fakeShape({ collide: true, editable: true, isPiston: 4 }, filterData(0xffff, -1), bodyA);
		const seg2 = fakeShape({ collide: true, editable: true, isPiston: 4 }, filterData(0xffff, -1), bodyB);
		expect(cf.ShouldCollide(seg1, seg2)).toBe(false);
		// Same piston, SAME body never reaches the clause (Box2D skips same-body
		// pairs anyway); different pistons fall through to the bits.
		const seg3 = fakeShape({ collide: true, editable: true, isPiston: 8 }, filterData(0xffff, 0), bodyB);
		const seg4 = fakeShape({ collide: true, editable: true, isPiston: 4 }, filterData(0xffff, 0), bodyA);
		expect(cf.ShouldCollide(seg4, seg3)).toBe(true);
	});
});

// --- §3 Shape counting rule (limit removed) --------------------------------
// The legacy play gate (CE 500 -> Jaybit 750, TooManyShapes) is intentionally
// REMOVED in this port: play is never refused for shape count. The counting
// predicate itself (PartIsPhysicalAndNotSandBox) survives for the UI's shape
// counter (getShapeCount) and keeps its Jaybit semantics.

describe("shape counting rule (ControllerGame.as:4109-4112) + no play limit", () => {
	it("getShapeCount counts ShapeParts + PrismaticJoints, excluding sandbox/text/other joints", () => {
		const c1 = new Circle(0, 0, 1);
		const c2 = new Circle(3, 0, 1);
		const pj = new PrismaticJoint(c1, c2, 0, 0, 3, 0);
		const fj = new FixedJoint(c1, c2, 1.5, 0);
		const text = new TextPart(null, 0, 0, 4, 2, "hi");
		const sandbox = new Circle(0, 10, 1);
		sandbox.isSandbox = true;
		const { core } = coreWithParts(c1, c2, pj, fj, text, sandbox);
		expect(core.getShapeCount()).toBe(3); // 2 circles + 1 piston
	});
	it("play is NOT refused at 751 physical shapes (legacy 750 limit removed)", () => {
		const parts = [];
		for (let i = 0; i < 751; i++) parts.push(new Circle(i * 0.1, 0, 0.2));
		const { core } = coreWithParts(...parts);
		expect(core.getShapeCount()).toBe(751);
		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));
		core.dispatch({ type: "play" });
		expect(core.getState().sim.phase).toBe("running");
		expect(messages).toEqual([]);
	});
	it("sandbox terrain does not count toward the shape counter (NEW exclusion in Jaybit)", () => {
		const parts = [];
		for (let i = 0; i < 750; i++) parts.push(new Circle(i * 0.1, 0, 0.2));
		const terrain = new Circle(0, 10, 1);
		terrain.isSandbox = true;
		parts.push(terrain);
		const { core } = coreWithParts(...parts);
		expect(core.getShapeCount()).toBe(750);
		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));
		core.dispatch({ type: "play" });
		expect(core.getState().sim.phase).toBe("running");
		expect(messages).toEqual([]);
	});
});

// --- §2.5 Copy / mirror field propagation ---------------------------------

/** Seed every Jaybit ShapePart field with a non-default value. */
function seedJaybitFields(p: Circle | Rectangle | Triangle | Cannon): void {
	p.friction = 25;
	p.restitution = 3;
	p.collA = false;
	p.collC = false;
	p.subColl = true;
	p.triggerAction = 0; // TRIGGER_DESTROY
	p.triggerAction_2 = 5; // TRIGGER_FIRE
	p.triggerName = "boom, bang";
	p.triggerName_2 = "zap";
	p.onGroundHit = true;
	p.onSameName_2 = true;
}

function expectJaybitFields(p: any): void {
	expect(p.friction).toBe(25);
	expect(p.restitution).toBe(3);
	expect(p.collA).toBe(false);
	expect(p.collB).toBe(true);
	expect(p.collC).toBe(false);
	expect(p.collD).toBe(true);
	expect(p.subColl).toBe(true);
	expect(p.triggerAction).toBe(0);
	expect(p.triggerAction_2).toBe(5);
	expect(p.triggerName).toBe("boom, bang");
	expect(p.triggerName_2).toBe("zap");
	expect(p.onGroundHit).toBe(true);
	expect(p.onGroundHit_2).toBe(false);
	expect(p.onSameName).toBe(false);
	expect(p.onSameName_2).toBe(true);
}

describe("MakeCopy propagates the Jaybit fields (the copy-paste fix, Circle.as:42-66)", () => {
	it("Circle / Rectangle / Triangle / Cannon", () => {
		for (const part of [
			new Circle(0, 0, 1),
			new Rectangle(0, 0, 2, 1),
			new Triangle(0, 0, 2, 0, 1, 2),
			new Cannon(0, 0, 2),
		]) {
			seedJaybitFields(part);
			expectJaybitFields(part.MakeCopy());
		}
	});
	it("Cannon.MakeCopy also copies triggerList", () => {
		const c = new Cannon(0, 0, 2);
		c.triggerList = "listen1,listen2";
		expect((c.MakeCopy() as Cannon).triggerList).toBe("listen1,listen2");
	});
	it("PrismaticJoint.MakeCopy copies collA-D + subColl + triggerList (PrismaticJoint.as:150-165)", () => {
		const pj = new PrismaticJoint(new Circle(0, 0, 1), new Circle(3, 0, 1), 0, 0, 3, 0);
		pj.collB = false;
		pj.collD = false;
		pj.subColl = true;
		pj.triggerList = "ears";
		const copy = pj.MakeCopy(new Circle(0, 0, 1), new Circle(3, 0, 1)) as PrismaticJoint;
		expect(copy.collA).toBe(true);
		expect(copy.collB).toBe(false);
		expect(copy.collC).toBe(true);
		expect(copy.collD).toBe(false);
		expect(copy.subColl).toBe(true);
		expect(copy.triggerList).toBe("ears");
	});
});

describe("mirrorParts propagates the Jaybit fields (the mirror fix, ControllerGame.as:1425-1447)", () => {
	it("mirrored shapes keep friction/restitution/layers/triggers", () => {
		const c = new Circle(2, 0, 1);
		seedJaybitFields(c);
		const { core, ids } = coreWithParts(c);
		core.dispatch({ type: "mirrorParts", partIds: ids, axis: "horizontal" });
		const parts = core.getState().parts;
		expect(parts.length).toBe(2);
		expectJaybitFields(parts[1]);
	});
	it("mirrored pistons keep collA-D + subColl", () => {
		const a = new Circle(0, 0, 1);
		const b = new Circle(3, 0, 1);
		const pj = new PrismaticJoint(a, b, 0, 0, 3, 0);
		pj.collC = false;
		pj.subColl = true;
		const { core, ids } = coreWithParts(a, b, pj);
		core.dispatch({ type: "mirrorParts", partIds: ids, axis: "vertical" });
		const mirroredPj = core.getState().parts.find(
			(p, i) => i >= 3 && p instanceof PrismaticJoint,
		) as PrismaticJoint;
		expect(mirroredPj).toBeDefined();
		expect(mirroredPj.collC).toBe(false);
		expect(mirroredPj.subColl).toBe(true);
	});
});

// --- New GameCore commands + challenge restriction clamps -----------------

describe("setFriction / setRestitution / setCollisionGroups commands", () => {
	it("set the fields on every selected ShapePart, clamped to 1..30", () => {
		const c1 = new Circle(0, 0, 1);
		const c2 = new Circle(3, 0, 1);
		const { core, ids } = coreWithParts(c1, c2);
		core.dispatch({ type: "setFriction", partIds: ids, value: 22 });
		core.dispatch({ type: "setRestitution", partIds: ids, value: 99 });
		expect(getPart(core, ids[0]).friction).toBe(22);
		expect(getPart(core, ids[1]).friction).toBe(22);
		expect(getPart(core, ids[0]).restitution).toBe(30); // clamped
	});
	it("setCollisionGroups applies layers+subColl+collide to shapes AND pistons", () => {
		const c1 = new Circle(0, 0, 1);
		const c2 = new Circle(3, 0, 1);
		const pj = new PrismaticJoint(c1, c2, 0, 0, 3, 0);
		const { core, ids } = coreWithParts(c1, c2, pj);
		core.dispatch({
			type: "setCollisionGroups",
			partIds: ids,
			collA: false,
			collB: true,
			collC: false,
			collD: true,
			subColl: true,
			collide: false,
		});
		for (const id of ids) {
			const p = getPart(core, id);
			expect(p.collA).toBe(false);
			expect(p.collB).toBe(true);
			expect(p.collC).toBe(false);
			expect(p.collD).toBe(true);
			expect(p.subColl).toBe(true);
			expect(p.collide).toBe(false);
		}
	});
	it("the commands are undoable like the other property edits", () => {
		const c = new Circle(0, 0, 1);
		const { core, ids } = coreWithParts(c);
		core.dispatch({ type: "setFriction", partIds: ids, value: 25 });
		expect(getPart(core, ids[0]).friction).toBe(25);
		core.dispatch({ type: "undo" });
		expect(getPart(core, ids[0]).friction).toBe(11);
	});
});

describe("challenge friction/restitution restrictions (Challenge.as:36-76, CheckForChallengeLimits :4233-4247)", () => {
	const LIMITS = {
		type: "setPartLimits" as const,
		minDensity: null,
		maxDensity: null,
		maxRJStrength: null,
		maxRJSpeed: null,
		maxSJStrength: null,
		maxSJSpeed: null,
		maxThrusterStrength: null,
		minFriction: 15,
		maxFriction: 20,
		minRestitution: null,
		maxRestitution: 5,
	};

	it("restriction state defaults to no-limit and mirrors setPartLimits", () => {
		const { core } = coreWithParts();
		core.dispatch({ type: "newChallenge" });
		let r = core.getState().challenge!.restrictions;
		expect(r.minFriction).toBe(null);
		expect(r.maxFriction).toBe(null);
		expect(r.minRestitution).toBe(null);
		expect(r.maxRestitution).toBe(null);
		core.dispatch(LIMITS);
		r = core.getState().challenge!.restrictions;
		expect(r.minFriction).toBe(15);
		expect(r.maxFriction).toBe(20);
		expect(r.minRestitution).toBe(null);
		expect(r.maxRestitution).toBe(5);
	});
	it("text/slider entry clamps against the challenge limits", () => {
		const c = new Circle(0, 0, 1);
		const { core, ids } = coreWithParts(c);
		core.dispatch({ type: "newChallenge" });
		core.dispatch(LIMITS);
		core.dispatch({ type: "setFriction", partIds: ids, value: 5 });
		expect(getPart(core, ids[0]).friction).toBe(15); // raised to min
		core.dispatch({ type: "setFriction", partIds: ids, value: 28 });
		expect(getPart(core, ids[0]).friction).toBe(20); // capped to max
		core.dispatch({ type: "setRestitution", partIds: ids, value: 12 });
		expect(getPart(core, ids[0]).restitution).toBe(5);
	});
	it("newly-constructed shapes have their defaults clamped (ShapePart.as ctor clamp)", () => {
		const { core } = coreWithParts();
		core.dispatch({ type: "newChallenge" });
		core.dispatch(LIMITS);
		core.dispatch({ type: "createShape", kind: "circle", x1: 0, y1: 0, x2: 1, y2: 0 });
		const created: any = core.getState().parts[0];
		expect(created.friction).toBe(15); // default 11 raised to minFriction
		expect(created.restitution).toBe(5); // default 7 capped to maxRestitution
	});
});

// --- §4 Box2D engine changes ----------------------------------------------

describe("Box2D engine constants (Jaybit b2Settings.as:16)", () => {
	it("b2_maxProxies is 4096 and b2_maxPairs derives to 32768", () => {
		expect(b2Settings.b2_maxProxies).toBe(4096);
		expect(b2Settings.b2_maxPairs).toBe(32768);
	});
});
