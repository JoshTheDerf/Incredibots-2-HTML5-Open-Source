// CHARACTERIZATION — challenge mode: condition evaluation, win/loss resolution,
// scoring, restriction clamps/gates, build-area fit, and the built-in challenges.
//
// Pins the ported behaviour against the legacy source values:
//   - Condition.Update AABB semantics per subject (0-4) / object (0-6)
//     (src/Game/Condition.ts:28-252), incl. subject-2 inverted "all user shapes"
//     start-true logic (:133-181) and obj-5-reset vs obj-6-latch (:65-66 vs
//     ContactAdded :254-284).
//   - WonChallenge / LostChallenge / GetScore (ControllerChallenge.ts:216-252).
//   - Restriction density/joint/thruster clamps (ControllerGame.densityText etc.
//     :4086-4190) and part-type gates (ControllerChallenge.ts:92-178).
//   - CheckIfPartsFit build-area fit (ControllerGame.ts:1116-1177).
//   - ControllerClimb / ControllerMonkeyBars ctor setup (Challenges/*.ts).

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { decodeChallengeBlob } from "../src/core/challengeSerialization";
import { Cannon } from "../src/Parts/Cannon";
import {
	ChallengeSession,
	buildClimbChallenge,
	buildMonkeyBarsChallenge,
	challengeOver,
	checkIfPartsFit,
	createChallengeSession,
	getScore,
	lostChallenge,
	resetConditions,
	updateConditions,
	wonChallenge,
} from "../src/core/challenge";
import { WinCondition } from "../src/Game/WinCondition";
import { LossCondition } from "../src/Game/LossCondition";
import { b2AABB } from "../src/Box2D";
import { Circle } from "../src/Parts/Circle";
import type { Part } from "../src/Parts/Part";

/** A GameCore over a fresh state with the given parts (no sandbox terrain). */
function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

describe("Condition.Update — subject 0 (a specific shape)", () => {
	it("obj 0 'within a box' is satisfied only when the shape's AABB is strictly inside", () => {
		const c = new Circle(5, 5, 1); // AABB (4,4)-(6,6)
		const core = coreWith([c]);
		const session = createChallengeSession();
		const cond = new WinCondition("Cond", 0, 0);
		cond.shape1 = c;
		cond.minX = 0;
		cond.maxX = 10;
		cond.minY = 0;
		cond.maxY = 10;
		session.challenge.winConditions.push(cond);
		core.dispatch({ type: "play" });
		updateConditions(session, core.getState().parts as Part[], []);
		expect(cond.isSatisfied).toBe(true);

		// Shrink the box so the circle no longer fits: not satisfied.
		cond.maxX = 5.5;
		updateConditions(session, core.getState().parts as Part[], []);
		expect(cond.isSatisfied).toBe(false);
	});

	it("obj 1 'above a line' (maxShapeY < minY), obj 4 'right of a line' (minShapeX > maxX)", () => {
		const c = new Circle(5, 5, 1); // AABB (4,4)-(6,6)
		const core = coreWith([c]);
		const session = createChallengeSession();

		const above = new WinCondition("Above", 0, 1);
		above.shape1 = c;
		above.minY = 8; // maxShapeY(=6) < 8 -> true
		session.challenge.winConditions.push(above);

		const right = new WinCondition("Right", 0, 4);
		right.shape1 = c;
		right.maxX = 3; // minShapeX(=4) > 3 -> true
		session.challenge.winConditions.push(right);

		core.dispatch({ type: "play" });
		updateConditions(session, core.getState().parts as Part[], []);
		expect(above.isSatisfied).toBe(true);
		expect(right.isSatisfied).toBe(true);

		// A line above the shape's top fails "above".
		above.minY = 5; // maxShapeY(=6) < 5 -> false
		updateConditions(session, core.getState().parts as Part[], []);
		expect(above.isSatisfied).toBe(false);
	});
});

describe("Condition.Update — subject 2 (all user-created shapes), inverted start-true logic", () => {
	it("obj 4 'right of a line': ALL editable shapes must be right; one on the wrong side flips it false; empty set = false", () => {
		const a = new Circle(10, 5, 1); // minShapeX = 9
		const b = new Circle(2, 5, 1); //  minShapeX = 1
		a.isEditable = true;
		b.isEditable = true;
		const core = coreWith([a, b]);
		const session = createChallengeSession();
		const cond = new WinCondition("Cond", 2, 4);
		cond.maxX = 5; // need minShapeX > 5 for every editable shape
		session.challenge.winConditions.push(cond);
		core.dispatch({ type: "play" });

		// b (minX=1) fails -> false.
		updateConditions(session, core.getState().parts as Part[], []);
		expect(cond.isSatisfied).toBe(false);

		// Empty user set (mark both non-editable) -> false (:135-138).
		a.isEditable = false;
		b.isEditable = false;
		updateConditions(session, core.getState().parts as Part[], []);
		expect(cond.isSatisfied).toBe(false);
	});

	it("all editable shapes on the right side -> satisfied (start-true survives)", () => {
		const a = new Circle(10, 5, 1); // minShapeX = 9
		const b = new Circle(12, 5, 1); // minShapeX = 11
		a.isEditable = true;
		b.isEditable = true;
		const core = coreWith([a, b]);
		const session = createChallengeSession();
		const cond = new WinCondition("Cond", 2, 4);
		cond.maxX = 5;
		session.challenge.winConditions.push(cond);
		core.dispatch({ type: "play" });
		updateConditions(session, core.getState().parts as Part[], []);
		expect(cond.isSatisfied).toBe(true);
	});
});

describe("Condition.Update — subject 1 (any shape), ANY satisfies", () => {
	it("obj 1 'above a line' true if ANY non-static shape is above", () => {
		const high = new Circle(5, 1, 0.5); // maxShapeY = 1.5
		const low = new Circle(5, 20, 0.5); // maxShapeY = 20.5
		const core = coreWith([high, low]);
		const session = createChallengeSession();
		const cond = new WinCondition("Cond", 1, 1);
		cond.minY = 3; // high (maxY 1.5) < 3 -> ANY true
		session.challenge.winConditions.push(cond);
		core.dispatch({ type: "play" });
		updateConditions(session, core.getState().parts as Part[], []);
		expect(cond.isSatisfied).toBe(true);
	});
});

describe("obj 5 'touching' resets each frame vs obj 6 'touched' latches", () => {
	// ContactAdded sets both true identically; the distinction is that obj 5 is
	// reset to false at the top of each Condition.Update while obj 6 is not.
	function makeTouchScenario(object: 5 | 6): {
		session: ChallengeSession;
		cond: WinCondition;
		parts: Part[];
		point: { shape1: unknown; shape2: unknown };
	} {
		const a = new Circle(5, 5, 1);
		const b = new Circle(6, 5, 1);
		const core = coreWith([a, b]);
		core.dispatch({ type: "play" });
		const parts = core.getState().parts as Part[];
		const session = createChallengeSession();
		const cond = new WinCondition("Cond", 0, object);
		cond.shape1 = a;
		cond.shape2 = b;
		session.challenge.winConditions.push(cond);
		// A synthetic contact point between a and b (Condition.ContactAdded reads
		// point.shape1/shape2 and compares to shape.GetShape()).
		const point = { shape1: a.GetShape(), shape2: b.GetShape() };
		return { session, cond, parts, point };
	}

	it("obj 5: a contact sets it true, but the next Update (no contact) resets it to false", () => {
		const { session, cond, parts, point } = makeTouchScenario(5);
		cond.ContactAdded(point as never, parts, []);
		expect(cond.isSatisfied).toBe(true);
		// Next frame's Update with no fresh contact resets obj-5 to false.
		updateConditions(session, parts, []);
		expect(cond.isSatisfied).toBe(false);
	});

	it("obj 6: once a contact latches it true, a later Update does NOT clear it", () => {
		const { session, cond, parts, point } = makeTouchScenario(6);
		cond.ContactAdded(point as never, parts, []);
		expect(cond.isSatisfied).toBe(true);
		updateConditions(session, parts, []);
		expect(cond.isSatisfied).toBe(true); // latched
	});
});

describe("Win/loss resolution (ControllerChallenge.ts:216-248)", () => {
	function session2Win(anded: boolean): { session: ChallengeSession; w1: WinCondition; w2: WinCondition } {
		const session = createChallengeSession();
		session.challenge.winConditionsAnded = anded;
		const w1 = new WinCondition("w1", 1, 0);
		const w2 = new WinCondition("w2", 1, 0);
		session.challenge.winConditions.push(w1, w2);
		return { session, w1, w2 };
	}

	it("no win conditions -> never won", () => {
		const session = createChallengeSession();
		expect(wonChallenge(session)).toBe(false);
	});

	it("anded: requires ALL win conditions satisfied", () => {
		const { session, w1, w2 } = session2Win(true);
		w1.isSatisfied = true;
		expect(wonChallenge(session)).toBe(false);
		w2.isSatisfied = true;
		expect(wonChallenge(session)).toBe(true);
	});

	it("or: requires ANY win condition satisfied", () => {
		const { session, w1 } = session2Win(false);
		expect(wonChallenge(session)).toBe(false);
		w1.isSatisfied = true;
		expect(wonChallenge(session)).toBe(true);
	});

	it("a satisfied loss condition blocks a win (loss overrides)", () => {
		const { session, w1, w2 } = session2Win(true);
		w1.isSatisfied = true;
		w2.isSatisfied = true;
		const loss = new LossCondition("l", 1, 0, false);
		loss.isSatisfied = true;
		session.challenge.lossConditions.push(loss);
		expect(wonChallenge(session)).toBe(false);
	});

	it("lostChallenge only true for an IMMEDIATE satisfied loss; non-immediate loss doesn't end the run", () => {
		const session = createChallengeSession();
		const nonImmediate = new LossCondition("l", 1, 0, false);
		nonImmediate.isSatisfied = true;
		session.challenge.lossConditions.push(nonImmediate);
		expect(lostChallenge(session)).toBe(false);
		expect(challengeOver(session)).toBe(false); // no win + non-immediate loss

		const immediate = new LossCondition("l2", 1, 0, true);
		immediate.isSatisfied = true;
		session.challenge.lossConditions.push(immediate);
		expect(lostChallenge(session)).toBe(true);
		expect(challengeOver(session)).toBe(true);
	});
});

describe("Scoring (ControllerChallenge.GetScore = 10000 - frameCounter)", () => {
	it("score decreases with frame count", () => {
		expect(getScore(0)).toBe(10000);
		expect(getScore(100)).toBe(9900);
		expect(getScore(10000)).toBe(0);
	});
});

describe("resetConditions clears every win + loss isSatisfied (playButton :52-59)", () => {
	it("resets both lists", () => {
		const session = createChallengeSession();
		const w = new WinCondition("w", 1, 0);
		const l = new LossCondition("l", 1, 0, true);
		w.isSatisfied = true;
		l.isSatisfied = true;
		session.challenge.winConditions.push(w);
		session.challenge.lossConditions.push(l);
		resetConditions(session);
		expect(w.isSatisfied).toBe(false);
		expect(l.isSatisfied).toBe(false);
	});
});

describe("CheckIfPartsFit build-area fit (ControllerGame.ts:1116-1177)", () => {
	it("zero build areas -> always fits; a part inside fits; a part overflowing does not", () => {
		const inside = new Circle(3, 3, 1); // AABB (2,2)-(4,4)
		inside.isEditable = true;
		const session = createChallengeSession();
		session.playMode = true;
		// No areas yet -> fits (:1124).
		expect(checkIfPartsFit(session, [inside])).toBe(true);

		const area = new b2AABB();
		area.lowerBound.Set(1, 1);
		area.upperBound.Set(15, 11.1);
		session.challenge.buildAreas.push(area);
		expect(checkIfPartsFit(session, [inside])).toBe(true);

		// A part poking outside the upper bound fails (maxX < upper.x is strict).
		const outside = new Circle(14.5, 3, 1); // maxX = 15.5 >= 15
		outside.isEditable = true;
		expect(checkIfPartsFit(session, [outside])).toBe(false);
	});

	it("not in play mode -> always fits (:1123)", () => {
		const outside = new Circle(100, 100, 1);
		outside.isEditable = true;
		const session = createChallengeSession();
		session.playMode = false;
		const area = new b2AABB();
		area.lowerBound.Set(1, 1);
		area.upperBound.Set(15, 11.1);
		session.challenge.buildAreas.push(area);
		expect(checkIfPartsFit(session, [outside])).toBe(true);
	});
});

describe("Restriction enforcement through GameCore commands", () => {
	function challengeCore(): GameCore {
		const core = coreWith([]);
		core.dispatch({ type: "newChallenge" });
		return core;
	}

	it("part-type gate: a disallowed shape type is not created in play mode", () => {
		const core = challengeCore();
		core.dispatch({ type: "setAllowedParts", circles: false, rects: true, tris: true, fixed: true, revolute: true, prismatic: true, thrusters: true, cannons: true });
		// Add a build area + enter play so the gate is active.
		core.dispatch({ type: "addBuildArea", minX: -100, minY: -100, maxX: 100, maxY: 100 });
		core.dispatch({ type: "enterChallengePlay" });
		const before = core.getState().parts.length;
		core.dispatch({ type: "createShape", kind: "circle", x1: 0, y1: 0, x2: 1, y2: 0 });
		expect(core.getState().parts.length).toBe(before); // rejected

		// A rectangle (allowed) is created.
		core.dispatch({ type: "createShape", kind: "rect", x1: 0, y1: 0, x2: 2, y2: 2 });
		expect(core.getState().parts.length).toBe(before + 1);
	});

	it("density clamp: setPartLimits caps setDensity", () => {
		const core = coreWith([new Circle(3, 3, 1)]);
		const id = core.getState().parts[0].id;
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "setPartLimits", minDensity: null, maxDensity: 10, maxRJStrength: null, maxRJSpeed: null, maxSJStrength: null, maxSJSpeed: null, maxThrusterStrength: null });
		core.dispatch({ type: "select", partIds: [id] });
		core.dispatch({ type: "setDensity", partIds: [id], value: 25 });
		const snap = core.getState().edit.selectedPart!;
		expect(snap.density).toBe(10); // clamped to maxDensity
	});

	it("min-density clamp raises a low value", () => {
		const core = coreWith([new Circle(3, 3, 1)]);
		const id = core.getState().parts[0].id;
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "setPartLimits", minDensity: 12, maxDensity: null, maxRJStrength: null, maxRJSpeed: null, maxSJStrength: null, maxSJSpeed: null, maxThrusterStrength: null });
		core.dispatch({ type: "select", partIds: [id] });
		core.dispatch({ type: "setDensity", partIds: [id], value: 3 });
		expect(core.getState().edit.selectedPart!.density).toBe(12);
	});

	it("no-limit (null) leaves the base clamp only", () => {
		const core = coreWith([new Circle(3, 3, 1)]);
		const id = core.getState().parts[0].id;
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "setPartLimits", minDensity: null, maxDensity: null, maxRJStrength: null, maxRJSpeed: null, maxSJStrength: null, maxSJSpeed: null, maxThrusterStrength: null });
		core.dispatch({ type: "select", partIds: [id] });
		core.dispatch({ type: "setDensity", partIds: [id], value: 22 });
		expect(core.getState().edit.selectedPart!.density).toBe(22);
	});
});

describe("Challenge read-model round-trip through GameState", () => {
	it("newChallenge exposes default restrictions; setBuildPermissions + setWinConditionsAnded reflect", () => {
		const core = coreWith([]);
		core.dispatch({ type: "newChallenge" });
		const ch = core.getState().challenge!;
		expect(ch.active).toBe(true);
		// Challenge.ts defaults: fixate false, mouseDrag false, all parts allowed.
		expect(ch.restrictions.fixate).toBe(false);
		expect(ch.restrictions.mouseDrag).toBe(false);
		expect(ch.restrictions.circles).toBe(true);
		expect(ch.winConditionsAnded).toBe(true);

		core.dispatch({ type: "addWinCondition", subject: 2, object: 4, region: { minX: 45, maxX: 45, minY: 0, maxY: 0 } });
		core.dispatch({ type: "setWinConditionsAnded", value: false });
		const ch2 = core.getState().challenge!;
		expect(ch2.winConditions.length).toBe(1);
		expect(ch2.winConditions[0].subject).toBe(2);
		expect(ch2.winConditions[0].object).toBe(4);
		expect(ch2.winConditions[0].maxX).toBe(45);
		expect(ch2.winConditionsAnded).toBe(false);
	});

	it("setPartLimits round-trips the ∓MAX_VALUE 'no limit' sentinel as null", () => {
		const core = coreWith([]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "setPartLimits", minDensity: 5, maxDensity: null, maxRJStrength: 20, maxRJSpeed: null, maxSJStrength: null, maxSJSpeed: null, maxThrusterStrength: null });
		const r = core.getState().challenge!.restrictions;
		expect(r.minDensity).toBe(5);
		expect(r.maxDensity).toBe(null);
		expect(r.maxRJStrength).toBe(20);
		expect(r.maxThrusterStrength).toBe(null);
	});
});

describe("Built-in challenges (Climb / MonkeyBars ctor setup)", () => {
	it("ControllerClimb: two anded win conditions (2,1 @ y=-10.5) + (2,4 @ x=45), no cannons/thrusters/mouseDrag, build area (1,1)-(15,11.1)", () => {
		const session = createChallengeSession();
		const terrain = buildClimbChallenge(session);
		const ch = session.challenge;
		expect(session.playMode).toBe(true);
		expect(session.playOnly).toBe(true);
		expect(ch.winConditions.length).toBe(2);
		expect(ch.winConditions[0].subject).toBe(2);
		expect(ch.winConditions[0].object).toBe(1);
		expect(ch.winConditions[0].minY).toBe(-10.5);
		expect(ch.winConditions[0].maxY).toBe(-10.5);
		expect(ch.winConditions[1].subject).toBe(2);
		expect(ch.winConditions[1].object).toBe(4);
		expect(ch.winConditions[1].minX).toBe(45);
		expect(ch.winConditions[1].maxX).toBe(45);
		expect(ch.cannonsAllowed).toBe(false);
		expect(ch.thrustersAllowed).toBe(false);
		expect(ch.mouseDragAllowed).toBe(false);
		expect(ch.winConditionsAnded).toBe(true);
		expect(ch.buildAreas.length).toBe(1);
		expect(ch.buildAreas[0].lowerBound.x).toBe(1);
		expect(ch.buildAreas[0].lowerBound.y).toBe(1);
		expect(ch.buildAreas[0].upperBound.x).toBe(15);
		expect(ch.buildAreas[0].upperBound.y).toBeCloseTo(11.1);
		// Terrain: start platform + 29 stair rects + 2 boundary circles = 32.
		expect(terrain.length).toBe(32);
		for (const p of terrain) {
			expect(p.isStatic).toBe(true);
			expect(p.isEditable).toBe(false);
		}
	});

	it("ControllerMonkeyBars: win (2,1 @ y=11) + (2,4 @ x=44); terrain includes 2 platforms + 9 pegs + 5 circles + 50 triangles + 1 wall", () => {
		const session = createChallengeSession();
		const terrain = buildMonkeyBarsChallenge(session);
		const ch = session.challenge;
		expect(ch.winConditions[0].minY).toBe(11);
		expect(ch.winConditions[1].minX).toBe(44);
		expect(ch.thrustersAllowed).toBe(false);
		expect(ch.cannonsAllowed).toBe(false);
		expect(ch.buildAreas[0].upperBound.x).toBe(15);
		// 2 platforms + 9 pegs + 5 circles + 38 left tris + 12 right tris + 1 wall = 67.
		expect(terrain.length).toBe(67);
	});

	it("loadBuiltInChallenge('climb') seeds terrain into GameState and exposes the read-model", () => {
		const core = coreWith([]);
		core.dispatch({ type: "loadBuiltInChallenge", name: "climb" });
		const state = core.getState();
		expect(state.challenge!.playOnly).toBe(true);
		expect(state.challenge!.winConditions.length).toBe(2);
		// 32 terrain parts present.
		expect(state.parts.filter((p) => !p.isEditable).length).toBeGreaterThanOrEqual(32);
	});
});

describe("End-to-end: Play -> win detected + score, and Play -> immediate loss", () => {
	it("a robot already satisfying the win condition is detected as WON on the first stepped frame, with a score", () => {
		// A single editable, static circle sitting inside a win box (subject 1
		// 'any shape' within a box). Static so it doesn't fall out of the box while
		// stepping — the point is the win-detection + scoring path, not physics.
		const c = new Circle(5, 5, 1); // AABB (4,4)-(6,6)
		c.isEditable = true;
		c.isStatic = false;
		const core = coreWith([c]);
		core.dispatch({ type: "newChallenge" });
		// Win: any shape within the box (0,0)-(50,50) — the circle qualifies.
		core.dispatch({
			type: "addWinCondition",
			subject: 1,
			object: 0,
			region: { minX: 0, maxX: 50, minY: 0, maxY: 50 },
		});
		core.dispatch({ type: "play" });
		expect(core.getState().challenge!.outcome).toBe("playing");
		core.dispatch({ type: "step", frames: 1 });

		const ch = core.getState().challenge!;
		expect(ch.outcome).toBe("won");
		expect(ch.score).toBe(getScore(1)); // 10000 - 1 frame
		// The win pauses the sim (ControllerGame.ts:740).
		expect(core.getState().sim.phase).toBe("paused");
	});

	it("an IMMEDIATE loss condition ends the run as failed with no score", () => {
		const c = new Circle(5, 5, 1);
		c.isEditable = true;
		const core = coreWith([c]);
		core.dispatch({ type: "newChallenge" });
		// A trivial win (so the run has a goal) that the shape does NOT meet...
		core.dispatch({
			type: "addWinCondition",
			subject: 1,
			object: 0,
			region: { minX: 100, maxX: 200, minY: 100, maxY: 200 },
		});
		// ...and an IMMEDIATE loss the shape DOES meet (any shape within a box it's in).
		core.dispatch({
			type: "addLossCondition",
			subject: 1,
			object: 0,
			immediate: true,
			region: { minX: 0, maxX: 50, minY: 0, maxY: 50 },
		});
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 1 });

		const ch = core.getState().challenge!;
		expect(ch.outcome).toBe("failed");
		expect(ch.score).toBe(null);
		expect(core.getState().sim.phase).toBe("paused");
	});

	it("obj-6 'touched' win latches through REAL Box2D contacts wired by createWorld's listener", () => {
		// A falling editable circle above a static circle; stepping lets them collide,
		// which fires the contact listener -> Condition.ContactAdded -> isSatisfied
		// latches -> WonChallenge. Proves the createWorld contact-listener wiring.
		const falling = new Circle(5, 2, 1);
		falling.isEditable = true;
		const ground = new Circle(5, 6, 1);
		ground.isStatic = true;
		ground.isEditable = false;
		const core = coreWith([falling, ground]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "addWinCondition", subject: 0, object: 6, shape1Id: falling.id, shape2Id: ground.id });
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 120 });
		expect(core.getState().challenge!.outcome).toBe("won");
		expect(core.getState().challenge!.score).toBeGreaterThan(0);
	});

	it("reset after a win clears the outcome + score back to a fresh run", () => {
		const c = new Circle(5, 5, 1);
		c.isEditable = true;
		const core = coreWith([c]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "addWinCondition", subject: 1, object: 0, region: { minX: 0, maxX: 50, minY: 0, maxY: 50 } });
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 1 });
		expect(core.getState().challenge!.outcome).toBe("won");
		core.dispatch({ type: "reset" });
		const ch = core.getState().challenge!;
		expect(ch.outcome).toBe(null);
		expect(ch.score).toBe(null);
		expect(core.getState().sim.phase).toBe("editing");
	});
});

// --- Built-in blob challenges: Race / Spaceship decode -------------------
//
// Pin the packed race.dat / spaceship.dat blobs against the decoder
// (challengeSerialization.decodeChallengeBlob, a faithful port of
// Database.ExtractChallengeFromByteArray :1814-1912). These counts are read back
// from the actual assets — if the byte format or a Part decode drifts, they move.

describe("decodeChallengeBlob — Race (resource/race.dat)", () => {
	it("decodes to the expected part count, conditions, restrictions, and camera", async () => {
		const c = await decodeChallengeBlob(readFileSync("resource/race.dat"));
		expect(c.allParts.length).toBe(201);
		// Part-type breakdown (proves the shape/joint/thruster decode + prismatic
		// re-seat all round-trip).
		const types: Record<string, number> = {};
		for (const p of c.allParts) types[(p as { type: string }).type] = (types[(p as { type: string }).type] ?? 0) + 1;
		expect(types).toEqual({
			Rectangle: 102,
			Triangle: 30,
			Circle: 25,
			FixedJoint: 25,
			RevoluteJoint: 12,
			Thrusters: 4,
			PrismaticJoint: 1,
			TextPart: 2,
		});
		// One win + one immediate loss, both subject-0 obj-0 (a specific shape within
		// a box) bound to shape1. anded.
		expect(c.winConditions.length).toBe(1);
		expect(c.lossConditions.length).toBe(1);
		expect(c.winConditionsAnded).toBe(true);
		expect(c.winConditions[0].subject).toBe(0);
		expect(c.winConditions[0].object).toBe(0);
		expect(c.winConditions[0].shape1).toBeTruthy();
		expect(c.lossConditions[0].subject).toBe(0);
		expect(c.lossConditions[0].object).toBe(0);
		expect((c.lossConditions[0] as LossCondition).immediate).toBe(true);
		expect(c.lossConditions[0].shape1).toBeTruthy();
		// Restrictions: everything locked down (a play-only authored challenge).
		expect(c.circlesAllowed).toBe(false);
		expect(c.cannonsAllowed).toBe(false);
		expect(c.mouseDragAllowed).toBe(false);
		// Camera/zoom carried from the blob.
		expect(c.zoomLevel).toBeCloseTo(21.3333, 3);
		expect(c.buildAreas.length).toBe(0);
	});
});

describe("decodeChallengeBlob — Spaceship (resource/spaceship.dat)", () => {
	it("decodes to the expected part count and a subject-1 obj-6 'touched' win", async () => {
		const c = await decodeChallengeBlob(readFileSync("resource/spaceship.dat"));
		expect(c.allParts.length).toBe(141);
		const types: Record<string, number> = {};
		for (const p of c.allParts) types[(p as { type: string }).type] = (types[(p as { type: string }).type] ?? 0) + 1;
		expect(types).toEqual({
			Rectangle: 54,
			FixedJoint: 39,
			Circle: 26,
			Thrusters: 9,
			TextPart: 7,
			Triangle: 4,
			Cannon: 1,
			PrismaticJoint: 1,
		});
		// One win: subject 1 (any shape) obj 6 (touched shape2), shape2 bound.
		expect(c.winConditions.length).toBe(1);
		expect(c.lossConditions.length).toBe(0);
		expect(c.winConditions[0].subject).toBe(1);
		expect(c.winConditions[0].object).toBe(6);
		expect(c.winConditions[0].shape2).toBeTruthy();
		expect(c.zoomLevel).toBeCloseTo(31.6406, 3);
	});
});

describe("GameCore.loadBuiltInChallengeBlob — Race / Spaceship setup", () => {
	it("Race: seeds the terrain+robot parts, marks play-only, exposes the conditions", async () => {
		const core = new GameCore(createInitialState());
		await core.loadBuiltInChallengeBlob("race", readFileSync("resource/race.dat"));
		const st = core.getState();
		expect(st.parts.length).toBe(201);
		expect(st.challenge).not.toBeNull();
		expect(st.challenge!.playMode).toBe(true);
		expect(st.challenge!.playOnly).toBe(true);
		expect(st.challenge!.winConditions.length).toBe(1);
		expect(st.challenge!.lossConditions.length).toBe(1);
		// zoom applied to the camera scale.
		expect(st.camera.scale).toBeCloseTo(21.3333, 3);
	});

	it("Spaceship: seeds parts and the single subject-1 obj-6 win condition", async () => {
		const core = new GameCore(createInitialState());
		await core.loadBuiltInChallengeBlob("spaceship", readFileSync("resource/spaceship.dat"));
		const st = core.getState();
		expect(st.parts.length).toBe(141);
		expect(st.challenge!.playOnly).toBe(true);
		expect(st.challenge!.winConditions.length).toBe(1);
		expect(st.challenge!.winConditions[0].subject).toBe(1);
		expect(st.challenge!.winConditions[0].object).toBe(6);
	});
});

// --- Cannonball conditions (subject 4 / obj 5-6 vs cannonballs) -----------
//
// Cannons now fire live: Cannon.Update runs each sim frame and CreateCannonball
// pushes the spawned b2Body into the partGlobals cannonball sink, which GameCore
// points at its live cannonball list on play. So subject-4 (any cannonball) and
// obj-5/6 (a cannonball touching/touched a shape) conditions evaluate against the
// real fired bodies (Condition.ts:110-129/227-251/274-281).

/** A static, non-editable cannon aimed +x (angle 0) that fires on key `fireKey`. */
function firingCannon(fireKey = 40, strength = 30): Cannon {
	const cannon = new Cannon(0, 0, 2);
	cannon.isStatic = true;
	cannon.isEditable = false;
	cannon.fireKey = fireKey;
	cannon.strength = strength;
	return cannon;
}

describe("cannonball conditions — subject 4 (any cannonball)", () => {
	it("no cannonball fired ⇒ subject-4 condition never satisfies (stays playing)", () => {
		const core = coreWith([firingCannon()]);
		core.dispatch({ type: "newChallenge" });
		// subject 4, obj 4 "right of a line" at x=10.
		core.dispatch({ type: "addWinCondition", subject: 4, object: 4, region: { minX: 10, maxX: 10, minY: -50, maxY: 50 } });
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 30 });
		expect(core.getState().challenge!.outcome).toBe("playing");
	});

	it("a fired cannonball entering the region satisfies the subject-4 condition ⇒ win", () => {
		const core = coreWith([firingCannon()]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "addWinCondition", subject: 4, object: 4, region: { minX: 4, maxX: 4, minY: -50, maxY: 50 } });
		core.dispatch({ type: "play" });
		// Fire (key-up sets createCannonball; next frame's Cannon.Update spawns it).
		core.dispatch({ type: "keyInput", key: 40, up: true });
		let won = false;
		for (let i = 0; i < 90; i++) {
			core.dispatch({ type: "step", frames: 1 });
			if (core.getState().challenge!.outcome === "won") {
				won = true;
				break;
			}
		}
		expect(won).toBe(true);
		expect(core.getState().challenge!.score).toBeGreaterThan(0);
	});
});

describe("cannonball conditions — subject 4 vs a shape (obj 5 touching / obj 6 touched)", () => {
	it("obj 6 'touched' latches when a fired cannonball hits the target shape ⇒ win", () => {
		const target = new Circle(8, 0, 1);
		target.isStatic = true;
		target.isEditable = false;
		const core = coreWith([firingCannon(), target]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "addWinCondition", subject: 4, object: 6, shape2Id: target.id });
		core.dispatch({ type: "play" });
		core.dispatch({ type: "keyInput", key: 40, up: true });
		let won = false;
		for (let i = 0; i < 120; i++) {
			core.dispatch({ type: "step", frames: 1 });
			if (core.getState().challenge!.outcome === "won") {
				won = true;
				break;
			}
		}
		expect(won).toBe(true);
	});

	it("subject-1 obj 5 'touching' resets each frame while obj 6 'touched' latches (direct Condition.Update/ContactAdded)", () => {
		// The reset-vs-latch distinction (the whole obj-5/obj-6 semantic difference,
		// spec §2.5) lives in Condition.Update: for subjects 0-3, obj-5 is reset to
		// false at the top of Update (subject-1 at Condition.ts:130-131), while obj-6
		// is never touched by Update so it stays latched once ContactAdded set it.
		// (Fire a real cannonball to have a live body in the list; then run Update
		// with NO contacts and confirm obj-5 clears, obj-6 holds.)
		const cannon = firingCannon();
		const target = new Circle(8, 0, 1); // non-static "any shape" for subject 1
		target.isEditable = true;
		const core = coreWith([cannon, target]);

		const session = createChallengeSession();
		const touching = new WinCondition("touching", 1, 5);
		touching.shape2 = target;
		const touched = new WinCondition("touched", 1, 6);
		touched.shape2 = target;
		session.challenge.winConditions.push(touching, touched);

		core.dispatch({ type: "play" });
		const parts = core.getState().parts as Part[];

		// Simulate a contact between the target shape and itself's shape (stand-in for
		// "any shape touched shape2"): both obj-5 and obj-6 latch true via ContactAdded.
		const tShape = target.GetShape();
		const point = { shape1: tShape, shape2: tShape };
		for (const c of session.challenge.winConditions) c.ContactAdded(point, parts, []);
		expect(touching.isSatisfied).toBe(true);
		expect(touched.isSatisfied).toBe(true);

		// A frame with NO contact: Update resets obj-5 'touching' to false (there is
		// no shape currently within/touching), but obj-6 'touched' stays latched.
		updateConditions(session, parts, []);
		expect(touching.isSatisfied).toBe(false);
		expect(touched.isSatisfied).toBe(true);
	});
});

describe("loadBuiltInChallenge tags state.challenge.builtIn", () => {
	function loadedCore(name: "climb" | "monkeyBars"): GameCore {
		const core = new GameCore(createInitialState());
		core.dispatch({ type: "loadBuiltInChallenge", name });
		return core;
	}

	it("climb sets state.challenge.builtIn = 'climb'", () => {
		const core = loadedCore("climb");
		expect(core.getState().challenge?.builtIn).toBe("climb");
	});

	it("monkeyBars sets state.challenge.builtIn = 'monkeyBars'", () => {
		const core = loadedCore("monkeyBars");
		expect(core.getState().challenge?.builtIn).toBe("monkeyBars");
	});

	it("a fresh authoring challenge has builtIn = null", () => {
		const core = new GameCore(createInitialState());
		core.dispatch({ type: "newChallenge" });
		expect(core.getState().challenge?.builtIn).toBe(null);
	});
});
