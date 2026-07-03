// CHARACTERIZATION — Jaybit Edition (2.33.0.1) TRIGGER RUNTIME pinned to the
// decompiled sources.
//
// Covers: the play-start dispatch-table wiring pass (CSV token matching, slot
// separation, per-token duplicate entries, the Boolean(triggerName) source
// quirk, cannon exclusion), the DetermineTriggering gating truth table
// (groundHit / sameName / plain x terrain / named / unnamed / null), the
// revolute key-vs-trigger priority merge incl. the DetermineTriggered latch
// quirk, destroy-once dispatch-table splicing, the don't-cancel-yourself
// (DidPrevJointDoSimilar) guard, triggered fixed joints becoming breakable
// limit-locked revolutes while untriggered fixed joints still body-merge
// (shared-body origin regression), cannon/text fire-on-contact-END, trigger
// counter balancing, TriggerPress recording + partIndex-routed playback, the
// setShapeTrigger / setTriggerList commands (sanitizing, undo, challenge
// gating), the paste trigger gate, and the mirror direction switch.

import { describe, expect, it } from "vitest";
import { b2AABB, b2Vec2, b2World } from "../src/Box2D";
import { ContactFilter } from "../src/Game/ContactFilter";
import { Cannon } from "../src/Parts/Cannon";
import { Circle } from "../src/Parts/Circle";
import { FixedJoint } from "../src/Parts/FixedJoint";
import type { Part } from "../src/Parts/Part";
import { Rectangle } from "../src/Parts/Rectangle";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { PrismaticJoint } from "../src/Parts/PrismaticJoint";
import { TextPart } from "../src/Parts/TextPart";
import { Thrusters } from "../src/Parts/Thrusters";
import {
	TRIGGER_CONTRACT,
	TRIGGER_DESTROY,
	TRIGGER_EXPAND,
	TRIGGER_FIRE,
	TRIGGER_NONE,
	TRIGGER_ROTATECCW,
	TRIGGER_ROTATECW,
} from "../src/Parts/partDefaults";
import {
	determineTriggering,
	didPrevJointDoSimilar,
	processTriggers,
	triggerDirectionSwitch,
	wireTriggers,
	type TriggerUserData,
} from "../src/core/triggers";
import { coreWithParts, getPart } from "./helpers";

/** A fresh b2World matching GameCore.createWorld's extents/gravity. */
function makeWorld(): b2World {
	const aabb = new b2AABB();
	aabb.lowerBound.Set(-300, -200);
	aabb.upperBound.Set(300, 200);
	const world = new b2World(aabb, new b2Vec2(0, 15), true);
	world.SetContactFilter(new ContactFilter());
	return world;
}

/** Init every part into `world` (shapes/text first, then joints/thrusters). */
function initAll(world: b2World, parts: Part[]): void {
	for (let i = parts.length - 1; i >= 0; i--) {
		const p = parts[i];
		if (!(p instanceof RevoluteJoint) && !(p instanceof PrismaticJoint) && !(p instanceof FixedJoint) && !(p instanceof Thrusters)) {
			p.Init(world);
		}
	}
	for (const p of parts) {
		if (p instanceof RevoluteJoint || p instanceof PrismaticJoint || p instanceof FixedJoint || p instanceof Thrusters) {
			p.Init(world);
		}
	}
}

function shapeUD(p: Circle | Rectangle | Cannon): TriggerUserData {
	return (p.GetShape() as { GetUserData(): TriggerUserData }).GetUserData();
}

const noopKeyInput = (): void => {};

// --- §2.2 Wiring pass (wireTriggers <- playButton :8760-8845) -------------

describe("wireTriggers dispatch-table wiring (ControllerGame.as:8760-8845)", () => {
	it("matches CSV tokens per slot and pushes (partIndex, action, slot)", () => {
		const world = makeWorld();
		const src = new Circle(0, 0, 0.5);
		src.triggerName = "a, b"; // CSV despite the singular name
		src.triggerAction = TRIGGER_ROTATECW;
		src.triggerName_2 = "c";
		src.triggerAction_2 = TRIGGER_ROTATECCW;
		const r1 = new Rectangle(5, 0, 1, 1);
		const r2 = new Rectangle(5.5, 0.5, 1, 1);
		const rj = new RevoluteJoint(r1, r2, 5.5, 0.5);
		rj.triggerList = " b "; // whitespace stripped before matching
		const th = new Thrusters(r1, 5.2, 0.2);
		th.triggerList = "c,zzz";
		const parts: Part[] = [src, r1, r2, rj, th];
		initAll(world, parts);
		wireTriggers(parts);

		const ud = shapeUD(src);
		// slot 1 "b" -> rj (index 3); slot 2 "c" -> th (index 4).
		expect(ud.jointsToTrigger).toEqual([3, 4]);
		expect(ud.actionsToTrigger).toEqual([TRIGGER_ROTATECW, TRIGGER_ROTATECCW]);
		expect(ud.isFirstTrigger).toEqual([true, false]);
	});

	it("pushes one entry PER matching token (legacy push-per-token)", () => {
		const world = makeWorld();
		const src = new Circle(0, 0, 0.5);
		src.triggerName = "a,b";
		src.triggerAction = TRIGGER_FIRE;
		const r1 = new Rectangle(5, 0, 1, 1);
		const th = new Thrusters(r1, 5.2, 0.2);
		th.triggerList = "a,b"; // both tokens match slot 1
		const parts: Part[] = [src, r1, th];
		initAll(world, parts);
		wireTriggers(parts);
		expect(shapeUD(src).jointsToTrigger).toEqual([2, 2]);
	});

	it("token matching is exact string equality (no substring matches)", () => {
		const world = makeWorld();
		const src = new Circle(0, 0, 0.5);
		src.triggerName = "a";
		src.triggerAction = TRIGGER_FIRE;
		const r1 = new Rectangle(5, 0, 1, 1);
		const th = new Thrusters(r1, 5.2, 0.2);
		th.triggerList = "ab";
		const parts: Part[] = [src, r1, th];
		initAll(world, parts);
		wireTriggers(parts);
		expect(shapeUD(src).jointsToTrigger).toEqual([]);
	});

	it("FAITHFUL QUIRK: an empty slot-1 name disqualifies the shape as a source even with a slot-2 name (:8766-8772 Boolean(triggerName) &&)", () => {
		const world = makeWorld();
		const src = new Circle(0, 0, 0.5);
		src.triggerName = ""; // Boolean("") is false in the legacy guard
		src.triggerName_2 = "x";
		src.triggerAction_2 = TRIGGER_FIRE;
		const r1 = new Rectangle(5, 0, 1, 1);
		const th = new Thrusters(r1, 5.2, 0.2);
		th.triggerList = "x";
		const parts: Part[] = [src, r1, th];
		initAll(world, parts);
		wireTriggers(parts);
		expect(shapeUD(src).jointsToTrigger).toEqual([]);
	});

	it("a name of only commas/spaces registers as empty (the /[, ]/g non-empty check)", () => {
		const world = makeWorld();
		const src = new Circle(0, 0, 0.5);
		src.triggerName = " , ";
		src.triggerAction = TRIGGER_FIRE;
		const r1 = new Rectangle(5, 0, 1, 1);
		const th = new Thrusters(r1, 5.2, 0.2);
		th.triggerList = ",";
		const parts: Part[] = [src, r1, th];
		initAll(world, parts);
		wireTriggers(parts);
		expect(shapeUD(src).jointsToTrigger).toEqual([]);
	});

	it("Cannons are EXCLUDED as trigger sources (:8765-8768)", () => {
		const world = makeWorld();
		const src = new Cannon(0, 0, 1);
		src.triggerName = "a"; // inherited field, but a cannon never emits
		src.triggerAction = TRIGGER_FIRE;
		const r1 = new Rectangle(5, 0, 1, 1);
		const th = new Thrusters(r1, 5.2, 0.2);
		th.triggerList = "a";
		const parts: Part[] = [src, r1, th];
		initAll(world, parts);
		wireTriggers(parts);
		// The cannon's userData never even carries the dispatch arrays.
		expect(shapeUD(src).jointsToTrigger).toBeUndefined();
	});
});

// --- §2.4 Gating (DetermineTriggering :9710-9800) --------------------------

describe("determineTriggering gating truth table (ControllerGame.as:9710-9800)", () => {
	const terrain: TriggerUserData = { isSandbox: true };
	const unnamed: TriggerUserData = { isSandbox: false, triggerList: [""], triggerList_2: [""] };
	const namedB: TriggerUserData = {
		isSandbox: false,
		triggerName: "b",
		triggerName_2: "",
		triggerList: ["b"],
		triggerList_2: [""],
	};

	it("plain slot: fires on any non-terrain contact, NOT on terrain, and on null userData", () => {
		const src: TriggerUserData = { onGroundHit: false, onSameName: false, triggerList: ["a"], triggerName: "a" };
		expect(determineTriggering(src, true, unnamed)).toBe(true);
		expect(determineTriggering(src, true, namedB)).toBe(true);
		expect(determineTriggering(src, true, terrain)).toBe(false);
		expect(determineTriggering(src, true, null)).toBe(true);
	});

	it("onGroundHit slot: fires on isSandbox terrain (and still on any other contact — faithful fall-through)", () => {
		const src: TriggerUserData = { onGroundHit: true, onSameName: false, triggerList: ["a"], triggerName: "a" };
		expect(determineTriggering(src, true, terrain)).toBe(true);
		expect(determineTriggering(src, true, unnamed)).toBe(true);
		expect(determineTriggering(src, true, null)).toBe(true);
	});

	it("onSameName slot is EXCLUSIVE: fires only on a trigger-name overlap", () => {
		const src: TriggerUserData = {
			onGroundHit: false,
			onSameName: true,
			triggerName: "a,b",
			triggerList: ["a", "b"],
		};
		expect(determineTriggering(src, true, namedB)).toBe(true); // token "b" overlap
		expect(determineTriggering(src, true, unnamed)).toBe(false);
		expect(determineTriggering(src, true, terrain)).toBe(false);
		expect(determineTriggering(src, true, null)).toBe(false);
	});

	it("onSameName matches the other shape's SLOT-2 list too", () => {
		const src: TriggerUserData = { onSameName: true, triggerName: "a", triggerList: ["a"] };
		const other: TriggerUserData = { triggerName_2: "a", triggerList: [""], triggerList_2: ["a"] };
		expect(determineTriggering(src, true, other)).toBe(true);
	});

	it("onSameName falls back to exact triggerName equality when the source list is empty", () => {
		const src: TriggerUserData = { onSameName: true, triggerName: "a,b", triggerList: [] };
		const otherEq: TriggerUserData = { triggerName: "a,b", triggerList: ["a", "b"] };
		const otherNe: TriggerUserData = { triggerName: "a", triggerList: ["a"] };
		expect(determineTriggering(src, true, otherEq)).toBe(true);
		expect(determineTriggering(src, true, otherNe)).toBe(false);
	});

	it("slot 2 uses the _2 fields independently", () => {
		const src: TriggerUserData = {
			onGroundHit: false,
			onSameName: false,
			onGroundHit_2: true,
			onSameName_2: true,
			triggerName_2: "z",
			triggerList_2: ["z"],
		};
		// slot 2: groundHit_2 wins on terrain even with onSameName_2 set.
		expect(determineTriggering(src, false, terrain)).toBe(true);
		// slot 2 sameName: only a "z" overlap fires.
		expect(determineTriggering(src, false, namedB)).toBe(false);
		expect(determineTriggering(src, false, { triggerName: "z", triggerList: ["z"] })).toBe(true);
		expect(determineTriggering(src, false, null)).toBe(false); // onSameName_2 gates null
		// slot 1 of the same shape is plain: terrain blocked, others pass.
		expect(determineTriggering(src, true, terrain)).toBe(false);
		expect(determineTriggering(src, true, unnamed)).toBe(true);
	});
});

// --- §2.5/§2.6 Dispatch + per-part actions ---------------------------------

describe("processTriggers dispatch (ControllerGame.as:3130-3255)", () => {
	function jointFixture() {
		const world = makeWorld();
		const src = new Circle(0, 0, 0.5);
		src.triggerName = "m";
		src.triggerAction = TRIGGER_DESTROY;
		const r1 = new Rectangle(5, 0, 1, 1);
		r1.isStatic = true;
		const r2 = new Rectangle(5.5, 0.5, 1, 1);
		const rj = new RevoluteJoint(r1, r2, 5.5, 0.5);
		rj.triggerList = "m";
		const parts: Part[] = [src, r1, r2, rj];
		initAll(world, parts);
		wireTriggers(parts);
		return { world, src, rj, parts };
	}

	it("DESTROY fires once and splices out of the dispatch table", () => {
		const { world, src, rj, parts } = jointFixture();
		const ud = shapeUD(src);
		expect(rj.GetJoint()).not.toBeNull();
		expect(ud.jointsToTrigger).toHaveLength(1);

		processTriggers(parts, world, ud, null, true, noopKeyInput);
		expect(rj.GetJoint()).toBeNull(); // b2 joint destroyed
		expect(ud.jointsToTrigger).toHaveLength(0); // entry unregistered
		expect(ud.actionsToTrigger).toHaveLength(0);
		expect(ud.isFirstTrigger).toHaveLength(0);

		// A second contact is a no-op — nothing left to fire.
		processTriggers(parts, world, ud, null, true, noopKeyInput);
		expect(ud.jointsToTrigger).toHaveLength(0);
	});

	it("don't-cancel-yourself: a shape's two slots with opposing actions on the SAME joint — slot 1 wins (DidPrevJointDoSimilar :3585-3607)", () => {
		const world = makeWorld();
		const src = new Circle(0, 0, 0.5);
		src.triggerName = "x";
		src.triggerAction = TRIGGER_ROTATECW;
		src.triggerName_2 = "x";
		src.triggerAction_2 = TRIGGER_ROTATECCW;
		const r1 = new Rectangle(5, 0, 1, 1);
		r1.isStatic = true;
		const r2 = new Rectangle(5.5, 0.5, 1, 1);
		const rj = new RevoluteJoint(r1, r2, 5.5, 0.5);
		rj.triggerList = "x";
		const parts: Part[] = [src, r1, r2, rj];
		initAll(world, parts);
		wireTriggers(parts);
		const ud = shapeUD(src);
		expect(ud.jointsToTrigger).toEqual([3, 3]); // both slots wired

		processTriggers(parts, world, ud, null, true, noopKeyInput);
		expect(rj.triggerTouches).toBe(1); // slot-1 CW fired
		expect(rj.triggerTouches_2).toBe(0); // slot-2 CCW suppressed
		expect((rj as any).triggerMotorCW).toBe(true);

		// PORT NOTE (deliberate divergence, spec §2.5): the legacy Remove path
		// set prevIdx to the PART index while comparing list indices (a
		// decompiler-visible bug that mostly no-opped the guard on Remove). We
		// port the Add-path semantics for both paths, so the counters balance.
		processTriggers(parts, world, ud, null, false, noopKeyInput);
		expect(rj.triggerTouches).toBe(0);
		expect(rj.triggerTouches_2).toBe(0);
		expect((rj as any).triggerMotorCW).toBe(false);
		expect((rj as any).triggerMotorCCW).toBe(false);
	});

	it("didPrevJointDoSimilar pairs CW<->CCW and EXPAND<->CONTRACT on the same target only", () => {
		const joints = [7, 7, 8];
		expect(didPrevJointDoSimilar(0, 1, joints, [TRIGGER_ROTATECW, TRIGGER_ROTATECCW, TRIGGER_ROTATECCW])).toBe(true);
		expect(didPrevJointDoSimilar(0, 2, joints, [TRIGGER_ROTATECW, TRIGGER_ROTATECCW, TRIGGER_ROTATECCW])).toBe(false);
		expect(didPrevJointDoSimilar(0, 1, joints, [TRIGGER_EXPAND, TRIGGER_CONTRACT, TRIGGER_NONE])).toBe(true);
		expect(didPrevJointDoSimilar(0, 1, joints, [TRIGGER_ROTATECW, TRIGGER_ROTATECW, TRIGGER_NONE])).toBe(false);
		expect(didPrevJointDoSimilar(-1, 0, joints, [TRIGGER_ROTATECW, TRIGGER_ROTATECCW, TRIGGER_NONE])).toBe(false);
	});

	it("thruster trigger counters balance across add/remove; thrust flag = touches > 0", () => {
		const world = makeWorld();
		const src = new Circle(0, 0, 0.5);
		src.triggerName = "t";
		src.triggerAction = TRIGGER_FIRE;
		const r1 = new Rectangle(5, 0, 1, 1);
		const th = new Thrusters(r1, 5.2, 0.2);
		th.triggerList = "t";
		const parts: Part[] = [src, r1, th];
		initAll(world, parts);
		wireTriggers(parts);
		const ud = shapeUD(src);

		processTriggers(parts, world, ud, null, true, noopKeyInput);
		processTriggers(parts, world, ud, null, true, noopKeyInput);
		expect(th.triggerTouches).toBe(2);
		expect((th as any).triggerThruster).toBe(true);
		processTriggers(parts, world, ud, null, false, noopKeyInput);
		expect(th.triggerTouches).toBe(1);
		expect((th as any).triggerThruster).toBe(true);
		processTriggers(parts, world, ud, null, false, noopKeyInput);
		expect(th.triggerTouches).toBe(0);
		expect((th as any).triggerThruster).toBe(false);
		// Floor at 0 — an unbalanced extra remove never goes negative.
		processTriggers(parts, world, ud, null, false, noopKeyInput);
		expect(th.triggerTouches).toBe(0);
	});

	it("cannon fires on contact END (touch-and-release), and records via the keyInput channel", () => {
		const world = makeWorld();
		const src = new Circle(0, 0, 0.5);
		src.triggerName = "c";
		src.triggerAction = TRIGGER_FIRE;
		const cannon = new Cannon(5, 0, 1);
		cannon.isStatic = true;
		cannon.triggerList = "c";
		const parts: Part[] = [src, cannon];
		initAll(world, parts);
		wireTriggers(parts);
		const ud = shapeUD(src);
		const calls: Array<{ key: number; up: boolean; partIndex: number }> = [];
		const rec = (key: number, up: boolean, partIndex: number) => calls.push({ key, up, partIndex });

		// Contact ADD: touches -> 1, DOWN event recorded, no cannonball yet.
		processTriggers(parts, world, ud, null, true, rec);
		expect(cannon.triggerTouches).toBe(1);
		expect(calls).toEqual([{ key: cannon.fireKey, up: false, partIndex: 1 }]);
		cannon.Update(world);
		expect(cannon.cannonballs).toHaveLength(0);

		// Contact REMOVE: touches -> 0, UP event recorded, next Update FIRES.
		processTriggers(parts, world, ud, null, false, rec);
		expect(cannon.triggerTouches).toBe(0);
		expect(calls[1]).toEqual({ key: cannon.fireKey, up: true, partIndex: 1 });
		cannon.Update(world);
		expect(cannon.cannonballs).toHaveLength(1);
	});

	it("cannon DESTROY marks it destroyed once and it stops firing", () => {
		const world = makeWorld();
		const cannon = new Cannon(5, 0, 1);
		cannon.Init(world);
		expect(cannon.DoTriggerAction(TRIGGER_DESTROY, world, true)).toBe(true);
		expect(cannon.isDestroyed).toBe(true);
		expect(cannon.DoTriggerAction(TRIGGER_DESTROY, world, true)).toBe(false);
		// A destroyed cannon never spawns a ball even when armed.
		cannon.KeyInput(cannon.fireKey, true, false);
		cannon.Update(world);
		expect(cannon.cannonballs).toHaveLength(0);
	});

	it("text part toggles on contact END (like the cannon's up-fire)", () => {
		const world = makeWorld();
		const src = new Circle(0, 0, 0.5);
		src.triggerName = "s";
		src.triggerAction = TRIGGER_FIRE;
		const text = new TextPart(null, 5, 0, 4, 2, "hi");
		text.triggerList = "s";
		const parts: Part[] = [src, text];
		initAll(world, parts);
		wireTriggers(parts);
		const ud = shapeUD(src);

		processTriggers(parts, world, ud, null, true, noopKeyInput);
		expect(text.displayKeyPressed).toBe(false); // down-event: no toggle yet
		processTriggers(parts, world, ud, null, false, noopKeyInput);
		expect(text.displayKeyPressed).toBe(true); // toggles when the touch ends
	});
});

// --- §2.6 Revolute priority + latch quirk ----------------------------------

describe("RevoluteJoint trigger priority (RevoluteJoint.as Update :187-228)", () => {
	function rjFixture() {
		const world = makeWorld();
		const r1 = new Rectangle(5, 0, 1, 1);
		r1.isStatic = true;
		const r2 = new Rectangle(5.5, 0.5, 1, 1);
		const rj = new RevoluteJoint(r1, r2, 5.5, 0.5);
		rj.enableMotor = true;
		const parts: Part[] = [r1, r2, rj];
		initAll(world, parts);
		return { world, rj };
	}
	const motorSpeed = (rj: RevoluteJoint): number => (rj.GetJoint() as any).m_motorSpeed;

	it("a trigger drives the motor; the player key OVERRIDES an opposing trigger", () => {
		const { world, rj } = rjFixture();
		rj.DoTriggerAction(TRIGGER_ROTATECCW, world, true);
		rj.Update(world);
		expect(motorSpeed(rj)).toBe(-rj.motorSpeed); // trigger CCW drives

		rj.KeyInput(rj.motorCWKey, false, false); // player holds CW
		rj.Update(world);
		expect(motorSpeed(rj)).toBe(rj.motorSpeed); // key beats opposing trigger

		rj.KeyInput(rj.motorCWKey, true, false); // key released
		rj.Update(world);
		expect(motorSpeed(rj)).toBe(-rj.motorSpeed); // trigger resumes
	});

	it("trigger overrides auto-spin: autoCW yields while an opposing trigger is live", () => {
		const { world, rj } = rjFixture();
		rj.autoCW = true;
		rj.Update(world);
		expect(motorSpeed(rj)).toBe(rj.motorSpeed); // auto-spin CW
		rj.DoTriggerAction(TRIGGER_ROTATECCW, world, true);
		rj.Update(world);
		expect(motorSpeed(rj)).toBe(-rj.motorSpeed); // trigger CCW wins over autoCW
	});

	it("FAITHFUL LATCH QUIRK (DetermineTriggered :155-170): flags are only cleared on counter equality — a majority flip leaves BOTH set and CW wins in Update", () => {
		// Contact events step the counters by +-1, so a DoTriggerAction sequence
		// always VISITS equality (clearing both flags) before the majority flips
		// — the latch is latent there. Characterize the ported branch semantics
		// directly on the counters, exactly as the decompile reads.
		const { world, rj } = rjFixture();
		rj.triggerTouches = 2;
		rj.triggerTouches_2 = 1;
		rj.DetermineTriggered();
		expect((rj as any).triggerMotorCW).toBe(true);
		expect((rj as any).triggerMotorCCW).toBe(false);

		rj.triggerTouches_2 = 3; // majority flips without passing equality
		rj.DetermineTriggered();
		expect((rj as any).triggerMotorCCW).toBe(true);
		expect((rj as any).triggerMotorCW).toBe(true); // NOT cleared — the latch quirk

		rj.Update(world);
		expect(motorSpeed(rj)).toBe(rj.motorSpeed); // branch order makes CW win

		rj.triggerTouches = 3; // equality clears both
		rj.DetermineTriggered();
		expect((rj as any).triggerMotorCW).toBe(false);
		expect((rj as any).triggerMotorCCW).toBe(false);

		// The reachable contact-driven path: the +-1 walk clears at equality, so
		// a live majority flip lands with only the new direction set.
		rj.DoTriggerAction(TRIGGER_ROTATECCW, world, true); // 3 vs 4
		expect((rj as any).triggerMotorCCW).toBe(true);
		expect((rj as any).triggerMotorCW).toBe(false);
	});
});

// --- §2.7 Triggered fixed joints (ShapePart.CheckFixedJoints) --------------

describe("triggered FixedJoints become breakable joints (ShapePart.CheckFixedJoints)", () => {
	it("REGRESSION: an untriggered fixed joint still body-merges, with the shared-body origin at the reverse-Init-first (LAST-in-array) part", () => {
		const r1 = new Rectangle(0, 0, 1, 1);
		const r2 = new Rectangle(1, 0, 1, 1);
		const fj = new FixedJoint(r1, r2, 1, 0.5);
		const { core } = coreWithParts(r1, r2, fj);
		core.dispatch({ type: "play" });
		expect(r1.GetBody()).not.toBeNull();
		expect(r1.GetBody()).toBe(r2.GetBody()); // classic same-body weld
		// handlePlay Inits in REVERSE parts order, so r2 (later in the array)
		// creates the body: the shared origin is r2's centre. Replay sync points
		// were recorded against these origins — this must not change.
		expect(r1.GetBody()!.GetPosition().x).toBeCloseTo(r2.centerX, 10);
		expect(r1.GetBody()!.GetPosition().y).toBeCloseTo(r2.centerY, 10);
		expect(fj.GetJoint()).toBeNull(); // no b2 joint for a weld
	});

	it("a triggered fixed joint gets its own bodies + a limit-locked revolute, and DESTROY breaks it exactly once", () => {
		const r1 = new Rectangle(0, 0, 1, 1);
		const r2 = new Rectangle(1, 0, 1, 1);
		const fj = new FixedJoint(r1, r2, 1, 0.5);
		fj.triggerList = "k";
		const { core } = coreWithParts(r1, r2, fj);
		core.dispatch({ type: "play" });
		const world = core.getState().world!;

		expect(r1.GetBody()).not.toBe(r2.GetBody()); // two bodies
		expect(r1.GetBody()!.GetPosition().x).toBeCloseTo(r1.centerX, 10);
		expect(r2.GetBody()!.GetPosition().x).toBeCloseTo(r2.centerX, 10);
		const joint = fj.GetJoint() as any;
		expect(joint).not.toBeNull(); // the locked revolute
		expect(joint.m_enableLimit).toBe(true);
		expect(joint.m_lowerAngle).toBe(0);
		expect(joint.m_upperAngle).toBe(0);
		expect(joint.m_enableMotor).toBe(false);
		expect(fj.triggerInitted).toBe(true);

		expect(fj.DoTriggerAction(TRIGGER_DESTROY, world, true)).toBe(true);
		expect(fj.GetJoint()).toBeNull();
		expect(fj.isDestroyed).toBe(true);
		expect(fj.DoTriggerAction(TRIGGER_DESTROY, world, true)).toBe(false); // once

		// Reset clears the runtime trigger state (FixedJoint.as UnInit :80-91).
		core.dispatch({ type: "reset" });
		expect(fj.triggerInitted).toBe(false);
		expect(fj.isDestroyed).toBe(false);
		expect(fj.isTriggered).toBe(false);
	});

	it("duplicate welds on the same pair exclude the triggered path (redundant weld forces the stiff body)", () => {
		const r1 = new Rectangle(0, 0, 1, 1);
		const r2 = new Rectangle(1, 0, 1, 1);
		const fjTriggered = new FixedJoint(r1, r2, 1, 0.5);
		fjTriggered.triggerList = "k";
		const fjPlain = new FixedJoint(r1, r2, 1, 0.4);
		const { core } = coreWithParts(r1, r2, fjTriggered, fjPlain);
		core.dispatch({ type: "play" });
		expect(r1.GetBody()).toBe(r2.GetBody()); // still one welded body
		expect(fjTriggered.GetJoint()).toBeNull(); // no breakable joint built
	});
});

// --- End-to-end: contacts drive triggers through the GameCore listener -----

describe("GameCore contact listener drives triggers during the sim", () => {
	it("onGroundHit ROTATECW latches the joint's trigger motor when the shape hits sandbox terrain", () => {
		const terrain = new Rectangle(-5, 2, 10, 1);
		terrain.isStatic = true;
		terrain.isSandbox = true;
		const src = new Circle(0, 0, 0.5);
		src.triggerName = "m";
		src.triggerAction = TRIGGER_ROTATECW;
		src.onGroundHit = true;
		const r1 = new Rectangle(20, 0, 1, 1);
		r1.isStatic = true;
		const r2 = new Rectangle(20.5, 0.5, 1, 1);
		const rj = new RevoluteJoint(r1, r2, 20.5, 0.5);
		rj.enableMotor = true;
		rj.triggerList = "m";
		const { core } = coreWithParts(terrain, src, r1, r2, rj);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 90 }); // circle falls ~1.5 units onto terrain
		expect(rj.triggerTouches).toBeGreaterThan(0);
		expect((rj as any).triggerMotorCW).toBe(true);
	});

	it("records a TriggerPress ({frame,key,partIndex}) when a triggered cannon's touch ends", () => {
		const terrain = new Rectangle(-5, 2, 10, 1);
		terrain.isStatic = true;
		terrain.isSandbox = true;
		const src = new Circle(0, 0, 0.5);
		src.restitution = 30; // maximum bounce so the ground contact ENDS
		src.triggerName = "c";
		src.triggerAction = TRIGGER_FIRE;
		src.onGroundHit = true;
		const cannon = new Cannon(20, 0, 1);
		cannon.isStatic = true;
		cannon.triggerList = "c";
		const { core } = coreWithParts(terrain, src, cannon);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 180 });
		const replay = core.exportReplay()!;
		const trigger = replay.keyPresses.find((kp) => kp.partIndex != null);
		expect(trigger).toBeDefined();
		expect(trigger!.key).toBe(cannon.fireKey);
		expect(trigger!.partIndex).toBe(2); // the cannon's index in state.parts
	});

	it("playback routes a TriggerPress to EXACTLY the recorded part; a plain KeyPress fans out", () => {
		const t1 = new TextPart(null, 0, 0, 4, 2, "one");
		const t2 = new TextPart(null, 0, 3, 4, 2, "two");
		t1.displayKey = 32;
		t2.displayKey = 32; // both bound to the same key
		const { core } = coreWithParts(t1, t2);
		core.dispatch({
			type: "playReplay",
			data: {
				cameraMovements: [],
				keyPresses: [
					{ frame: 0, key: 32, partIndex: 1 }, // TriggerPress -> only t2
					{ frame: 2, key: 32 }, // plain KeyPress -> both
				],
				syncPoints: [],
				numFrames: 10,
				version: "0.03",
			},
		});
		core.dispatch({ type: "step", frames: 1 });
		expect(t1.displayKeyPressed).toBe(false);
		expect(t2.displayKeyPressed).toBe(true); // routed to partIndex 1 only
		core.dispatch({ type: "step", frames: 2 });
		expect(t1.displayKeyPressed).toBe(true); // plain press fans out
		expect(t2.displayKeyPressed).toBe(false); // ... toggling t2 back off
	});
});

// --- Commands: setShapeTrigger / setTriggerList + gating -------------------

describe("setShapeTrigger / setTriggerList commands", () => {
	it("setShapeTrigger edits one slot; omitted fields stay unchanged; undo restores", () => {
		const c = new Circle(0, 0, 1);
		const { core, ids } = coreWithParts(c);
		core.dispatch({
			type: "setShapeTrigger",
			partIds: [ids[0]],
			slot: 1,
			name: "a,b",
			action: TRIGGER_ROTATECW,
			onGroundHit: true,
		});
		const live = getPart(core, ids[0]);
		expect(live.triggerName).toBe("a,b");
		expect(live.triggerAction).toBe(TRIGGER_ROTATECW);
		expect(live.onGroundHit).toBe(true);
		expect(live.onSameName).toBe(false); // omitted -> unchanged
		expect(live.triggerName_2).toBe(""); // slot 2 untouched
		expect(live.triggerAction_2).toBe(TRIGGER_NONE);

		core.dispatch({ type: "setShapeTrigger", partIds: [ids[0]], slot: 2, name: "z", onSameName: true });
		expect(getPart(core, ids[0]).triggerName_2).toBe("z");
		expect(getPart(core, ids[0]).onSameName_2).toBe(true);
		expect(getPart(core, ids[0]).triggerName).toBe("a,b"); // slot 1 untouched

		core.dispatch({ type: "undo" });
		core.dispatch({ type: "undo" });
		expect(getPart(core, ids[0]).triggerName).toBe("");
		expect(getPart(core, ids[0]).triggerAction).toBe(TRIGGER_NONE);
		expect(getPart(core, ids[0]).onGroundHit).toBe(false);
	});

	it("AdvancedWindow OK payload: batched slots persist action=0 (Destroy) and false booleans (regression: truthiness guards)", () => {
		// The refreshed Advanced modal buffers edits and dispatches ONE batch of
		// two setShapeTrigger commands (both slots, every field present) on OK.
		// This pins that the falsy-but-meaningful values survive — action 0
		// (Destroy) must NOT be treated as "absent", and onSameName/onGroundHit
		// must be settable back to false, never stuck true. (The UI reactivity
		// bug was in the old computed-getter binding, not the core; this guards
		// the core contract the modal depends on.)
		const c = new Circle(0, 0, 1);
		const { core, ids } = coreWithParts(c);
		// Seed non-default so we can prove false actually writes.
		core.dispatch({ type: "setShapeTrigger", partIds: [ids[0]], slot: 1, onSameName: true, onGroundHit: true });
		expect(getPart(core, ids[0]).onSameName).toBe(true);

		core.dispatch({
			type: "batch",
			commands: [
				{ type: "setShapeTrigger", partIds: [ids[0]], slot: 1, name: "hit", action: TRIGGER_DESTROY, onSameName: false, onGroundHit: false },
				{ type: "setShapeTrigger", partIds: [ids[0]], slot: 2, name: "", action: TRIGGER_NONE, onSameName: false, onGroundHit: false },
			],
		});
		const live = getPart(core, ids[0]);
		expect(live.triggerName).toBe("hit");
		expect(live.triggerAction).toBe(TRIGGER_DESTROY); // 0 persisted, not dropped
		expect(live.onSameName).toBe(false); // set back to false, not stuck true
		expect(live.onGroundHit).toBe(false);
		expect(live.triggerAction_2).toBe(TRIGGER_NONE);

		// One batch == one undo step, restoring the seeded slot-1 state.
		core.dispatch({ type: "undo" });
		expect(getPart(core, ids[0]).onSameName).toBe(true);
		expect(getPart(core, ids[0]).onGroundHit).toBe(true);
	});

	it("strips [ ] (the [varies] guard) and clamps names to 255 chars; ignores out-of-range actions and cannons", () => {
		const c = new Circle(0, 0, 1);
		const cannon = new Cannon(3, 0, 1);
		const { core, ids } = coreWithParts(c, cannon);
		core.dispatch({
			type: "setShapeTrigger",
			partIds: ids,
			slot: 1,
			name: "[a],[b]," + "x".repeat(300),
			action: 99,
		});
		const live = getPart(core, ids[0]);
		expect(live.triggerName.includes("[")).toBe(false);
		expect(live.triggerName.includes("]")).toBe(false);
		expect(live.triggerName.length).toBe(255);
		expect(live.triggerAction).toBe(TRIGGER_NONE); // invalid action ignored
		// A cannon is not a trigger source — its inherited fields stay default.
		expect(getPart(core, ids[1]).triggerName).toBe("");
	});

	it("setTriggerList applies to joints, thrusters, cannons and text parts; undo restores", () => {
		const r1 = new Rectangle(0, 0, 1, 1);
		const r2 = new Rectangle(1, 0, 1, 1);
		const rj = new RevoluteJoint(r1, r2, 1, 0.5);
		const th = new Thrusters(r1, 0.5, 0.5);
		const cannon = new Cannon(5, 0, 1);
		const text = new TextPart(null, 8, 0, 4, 2, "t");
		const { core, ids } = coreWithParts(r1, r2, rj, th, cannon, text);
		core.dispatch({ type: "setTriggerList", partIds: [ids[2], ids[3], ids[4], ids[5]], value: "go, stop" });
		expect(getPart(core, ids[2]).triggerList).toBe("go, stop");
		expect(getPart(core, ids[3]).triggerList).toBe("go, stop");
		expect(getPart(core, ids[4]).triggerList).toBe("go, stop");
		expect(getPart(core, ids[5]).triggerList).toBe("go, stop");
		// A plain shape has no triggerList (it is a source, not a target).
		core.dispatch({ type: "setTriggerList", partIds: [ids[0]], value: "x" });
		expect(getPart(core, ids[0]).triggerList).toBeUndefined();
		core.dispatch({ type: "undo" });
		core.dispatch({ type: "undo" });
		expect(getPart(core, ids[2]).triggerList).toBe("");
	});

	it("challenge play mode with !triggersAllowed refuses both commands with the legacy dialog", () => {
		const c = new Circle(0, 0, 1);
		const r1 = new Rectangle(2, 0, 1, 1);
		const r2 = new Rectangle(3, 0, 1, 1);
		const rj = new RevoluteJoint(r1, r2, 3, 0.5);
		const { core, ids } = coreWithParts(c, r1, r2, rj);
		core.dispatch({ type: "newChallenge" });
		core.getLiveChallenge()!.triggersAllowed = false;
		(core as any).challenge.playMode = true;
		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));

		core.dispatch({ type: "setShapeTrigger", partIds: [ids[0]], slot: 1, name: "a" });
		core.dispatch({ type: "setTriggerList", partIds: [ids[3]], value: "a" });
		expect(getPart(core, ids[0]).triggerName).toBe("");
		expect(getPart(core, ids[3]).triggerList).toBe("");
		expect(messages).toEqual([
			"Sorry, triggers are not allowed in this challenge!",
			"Sorry, triggers are not allowed in this challenge!",
		]);

		// Authoring/edit mode (playMode false) is NOT gated.
		(core as any).challenge.playMode = false;
		core.dispatch({ type: "setShapeTrigger", partIds: [ids[0]], slot: 1, name: "a" });
		expect(getPart(core, ids[0]).triggerName).toBe("a");
	});

	it("setCollisionGroups: !collisionGroupsAllowed blocks A-D but lets subColl through, and vice versa (AdvancedPropertiesWindow.as:960-975)", () => {
		const c = new Circle(0, 0, 1);
		const { core, ids } = coreWithParts(c);
		core.dispatch({ type: "newChallenge" });
		(core as any).challenge.playMode = true;

		// A-D blocked, subColl allowed: only the subColl half applies.
		core.getLiveChallenge()!.collisionGroupsAllowed = false;
		core.getLiveChallenge()!.subCollisionsAllowed = true;
		core.dispatch({
			type: "setCollisionGroups", partIds: [ids[0]],
			collA: false, collB: false, collC: false, collD: false, subColl: true, collide: true,
		});
		expect(getPart(core, ids[0]).collA).toBe(true); // unchanged (blocked)
		expect(getPart(core, ids[0]).collB).toBe(true);
		expect(getPart(core, ids[0]).subColl).toBe(true); // applied (allowed)
		// Restrictions read-model reflects the split.
		expect(core.getState().challenge!.restrictions.collisionGroups).toBe(false);
		expect(core.getState().challenge!.restrictions.subCollisions).toBe(true);

		// subColl blocked, A-D allowed: only the A-D half applies.
		core.getLiveChallenge()!.collisionGroupsAllowed = true;
		core.getLiveChallenge()!.subCollisionsAllowed = false;
		core.dispatch({
			type: "setCollisionGroups", partIds: [ids[0]],
			collA: false, collB: true, collC: true, collD: true, subColl: false, collide: true,
		});
		expect(getPart(core, ids[0]).collA).toBe(false); // applied (allowed)
		expect(getPart(core, ids[0]).subColl).toBe(true); // unchanged (blocked)

		// Edit/authoring mode (playMode false) is not gated at all.
		(core as any).challenge.playMode = false;
		core.getLiveChallenge()!.collisionGroupsAllowed = false;
		core.getLiveChallenge()!.subCollisionsAllowed = false;
		core.dispatch({
			type: "setCollisionGroups", partIds: [ids[0]],
			collA: true, collB: true, collC: true, collD: true, subColl: false, collide: true,
		});
		expect(getPart(core, ids[0]).collA).toBe(true);
		expect(getPart(core, ids[0]).subColl).toBe(false);
	});

	it("setAllowedParts.triggers writes challenge.triggersAllowed into the restrictions read-model", () => {
		const { core } = coreWithParts(new Circle(0, 0, 1));
		core.dispatch({ type: "newChallenge" });
		expect(core.getState().challenge!.restrictions.triggers).toBe(true);
		core.dispatch({
			type: "setAllowedParts",
			circles: true,
			rects: true,
			tris: true,
			fixed: true,
			revolute: true,
			prismatic: true,
			thrusters: true,
			cannons: true,
			triggers: false,
		});
		expect(core.getLiveChallenge()!.triggersAllowed).toBe(false);
		expect(core.getState().challenge!.restrictions.triggers).toBe(false);
	});

	it("pasting trigger-carrying parts is refused in challenge play mode with !triggersAllowed (:9183-9256)", () => {
		const c = new Circle(0, 0, 1);
		c.triggerName = "boom";
		c.triggerAction = TRIGGER_FIRE;
		const plain = new Circle(3, 0, 1);
		const { core, ids } = coreWithParts(c, plain);
		core.dispatch({ type: "newChallenge" });
		core.getLiveChallenge()!.triggersAllowed = false;
		(core as any).challenge.playMode = true;
		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));

		core.dispatch({ type: "copyParts", partIds: [ids[0]] });
		const before = core.getState().parts.length;
		core.dispatch({ type: "pasteParts" });
		expect(core.getState().parts.length).toBe(before); // refused
		expect(messages).toContain("Sorry, triggers are not allowed in this challenge!");

		// A non-triggered part still pastes.
		core.dispatch({ type: "copyParts", partIds: [ids[1]] });
		core.dispatch({ type: "pasteParts" });
		expect(core.getState().parts.length).toBe(before + 1);
	});
});

// --- §2.9 Mirror direction switch ------------------------------------------

describe("mirror TriggerDirectionSwitch (ControllerGame.as:6733-6744, :3798-3865)", () => {
	it("maps CW<->CCW and leaves other actions alone", () => {
		expect(triggerDirectionSwitch(TRIGGER_ROTATECW)).toBe(TRIGGER_ROTATECCW);
		expect(triggerDirectionSwitch(TRIGGER_ROTATECCW)).toBe(TRIGGER_ROTATECW);
		expect(triggerDirectionSwitch(TRIGGER_EXPAND)).toBe(TRIGGER_EXPAND);
		expect(triggerDirectionSwitch(TRIGGER_CONTRACT)).toBe(TRIGGER_CONTRACT);
		expect(triggerDirectionSwitch(TRIGGER_NONE)).toBe(TRIGGER_NONE);
	});

	it("horizontal mirror flips a shape's rotation trigger actions; vertical copies them unchanged", () => {
		const c = new Circle(0, 0, 1);
		c.triggerName = "m";
		c.triggerAction = TRIGGER_ROTATECW;
		c.triggerAction_2 = TRIGGER_EXPAND;
		const { core, ids } = coreWithParts(c);

		core.dispatch({ type: "mirrorParts", partIds: [ids[0]], axis: "horizontal" });
		let clone = core.getState().parts[core.getState().parts.length - 1] as Circle;
		expect(clone.triggerName).toBe("m");
		expect(clone.triggerAction).toBe(TRIGGER_ROTATECCW); // switched
		expect(clone.triggerAction_2).toBe(TRIGGER_EXPAND); // untouched

		core.dispatch({ type: "mirrorParts", partIds: [ids[0]], axis: "vertical" });
		clone = core.getState().parts[core.getState().parts.length - 1] as Circle;
		expect(clone.triggerAction).toBe(TRIGGER_ROTATECW); // vertical: unchanged
	});
});
