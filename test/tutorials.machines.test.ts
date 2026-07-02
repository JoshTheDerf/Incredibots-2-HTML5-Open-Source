// Faithful-port tests for the tutorial dialog state machines + prebuilt scenes.
// Pins each machine's init dialog, key close(num) branches, and game-event
// trigger order, and each getTutorialSetup(level) part count + key coords,
// against the legacy ControllerXxx subclass values (see
// docs/PORT-SPEC-tutorials-replays.md §A). Imports only tutorials.ts (which
// pulls tutorialTerrain.ts + the Pixi-free Parts), never GameCore.

import { describe, it, expect } from "vitest";
import { createTutorialMachine, getTutorialSetup, type TutorialEvent } from "../src/core/tutorials";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { Triangle } from "../src/Parts/Triangle";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { FixedJoint } from "../src/Parts/FixedJoint";
import { Thrusters } from "../src/Parts/Thrusters";

// Feed a machine an ordered list of events, collecting each non-null shown id.
function runEvents(levelIndex: number, events: TutorialEvent[]): number[] {
	const m = createTutorialMachine(levelIndex)!;
	const ids: number[] = [];
	for (const e of events) {
		const a = m.onEvent(e);
		if (a && a.kind === "show" && a.id != null) ids.push(a.id);
	}
	return ids;
}

const part = (partKind: string): TutorialEvent => ({ type: "partCreated", partKind });
const key = (k: string): TutorialEvent => ({ type: "progress", key: k });

describe("tutorial machine inits + camera", () => {
	const expected: Record<number, { id: number; hasMore: boolean; cam: [number, number] }> = {
		0: { id: 0, hasMore: true, cam: [1520, -300] },
		1: { id: 4, hasMore: false, cam: [-950, -180] },
		2: { id: 8, hasMore: true, cam: [360, -220] },
		3: { id: 15, hasMore: false, cam: [-1880, -220] },
		4: { id: 21, hasMore: false, cam: [360, -220] },
		5: { id: 32, hasMore: true, cam: [-1880, -220] },
		6: { id: 38, hasMore: true, cam: [100, -150] },
		7: { id: 70, hasMore: true, cam: [-100, -290] },
		8: { id: 82, hasMore: true, cam: [-100, -290] },
		9: { id: 90, hasMore: true, cam: [-480, -200] },
	};
	for (const [lvl, e] of Object.entries(expected)) {
		it(`level ${lvl} init -> ${e.id}`, () => {
			const m = createTutorialMachine(Number(lvl))!;
			const a = m.init();
			expect(a).toEqual({ kind: "show", id: e.id, hasMore: e.hasMore });
			expect([m.initialCamera.drawXOff, m.initialCamera.drawYOff]).toEqual(e.cam);
		});
	}
	it("built-in challenges (10-13) have no machine", () => {
		for (const lvl of [10, 11, 12, 13]) expect(createTutorialMachine(lvl)).toBeNull();
	});
});

describe("Tank (0) — close + win", () => {
	const m = createTutorialMachine(0)!;
	it("close 0->1(More), 1->2(OK)", () => {
		expect(m.close(0)).toEqual({ kind: "show", id: 1, hasMore: true });
		expect(m.close(1)).toEqual({ kind: "show", id: 2, hasMore: false });
	});
	it("close 3->55, 55->dismiss", () => {
		expect(m.close(3)).toEqual({ kind: "show", id: 55, hasMore: false });
		expect(m.close(55)).toEqual({ kind: "dismiss" });
	});
	it("won -> show 3 (More)", () => {
		expect(m.onEvent({ type: "won" })).toEqual({ kind: "show", id: 3, hasMore: true });
	});
});

describe("Shapes (1) — part-created chain 5,6,7 in order", () => {
	it("rect/tri/circle -> 5,6,7", () => {
		expect(runEvents(1, [part("Rectangle"), part("Triangle"), part("Circle")])).toEqual([5, 6, 7]);
	});
	it("ignores out-of-order (triangle before rectangle)", () => {
		expect(runEvents(1, [part("Triangle"), part("Rectangle")])).toEqual([5]);
	});
});

describe("Car (2)", () => {
	it("close 8 -> 9", () => {
		expect(createTutorialMachine(2)!.close(8)).toEqual({ kind: "show", id: 9, hasMore: false });
	});
	it("two RJs then motors -> 10,12,13; centerBox/didntFit out-of-band", () => {
		const m = createTutorialMachine(2)!;
		expect(m.onEvent(part("RevoluteJoint"))).toEqual({ kind: "show", id: 10, hasMore: false });
		// centerBox (snap-to-center) shows 11 without consuming the chain cursor.
		expect(m.onEvent(key("snapToCenter"))).toEqual({ kind: "show", id: 11, hasMore: false });
		expect(m.onEvent(part("RevoluteJoint"))).toEqual({ kind: "show", id: 12, hasMore: false });
		expect(m.onEvent(key("motorsEnabled"))).toEqual({ kind: "show", id: 13, hasMore: false });
		expect(m.onEvent(key("didntFit"))).toEqual({ kind: "show", id: 14, hasMore: false });
	});
});

describe("Jumpbot (3) — piston chain + reset", () => {
	it("16,17 then reset(18) then 19,20", () => {
		const m = createTutorialMachine(3)!;
		expect(m.onEvent(part("PrismaticJoint"))).toEqual({ kind: "show", id: 16, hasMore: false });
		expect(m.onEvent(key("pistonEnabled"))).toEqual({ kind: "show", id: 17, hasMore: false });
		expect(m.onEvent(key("reset"))).toEqual({ kind: "show", id: 18, hasMore: false });
		expect(m.onEvent(key("powerIncreased"))).toEqual({ kind: "show", id: 19, hasMore: false });
		expect(m.onEvent(key("densityDecreased"))).toEqual({ kind: "show", id: 20, hasMore: false });
	});
});

describe("Dumpbot (4) — full 12-step chain", () => {
	it("22,23,24,25,58,26,57,27,28,29,30,31", () => {
		const ids = runEvents(4, [
			part("Rectangle"),
			key("wheels"),
			key("wheelJoints"),
			key("arm"),
			key("clickedJoint"),
			key("armJoint"),
			key("solidified"),
			key("controlKeys"),
			key("bucket"),
			key("fixed1"),
			key("fixed2"),
			key("motorAdjusted"),
		]);
		expect(ids).toEqual([22, 23, 24, 25, 58, 26, 57, 27, 28, 29, 30, 31]);
	});
});

describe("Catapult (5)", () => {
	it("close 32->33(More), 33->34", () => {
		const m = createTutorialMachine(5)!;
		expect(m.close(32)).toEqual({ kind: "show", id: 33, hasMore: true });
		expect(m.close(33)).toEqual({ kind: "show", id: 34, hasMore: false });
	});
	it("limits 35,36 then reset 37", () => {
		const m = createTutorialMachine(5)!;
		expect(m.onEvent(key("limitLower"))).toEqual({ kind: "show", id: 35, hasMore: false });
		expect(m.onEvent(key("limitUpper"))).toEqual({ kind: "show", id: 36, hasMore: false });
		expect(m.onEvent(key("reset"))).toEqual({ kind: "show", id: 37, hasMore: false });
	});
});

describe("HomeMovies (6)", () => {
	it("close 38->39(More),39->40, 50/51 dismiss, 52->54", () => {
		const m = createTutorialMachine(6)!;
		expect(m.close(38)).toEqual({ kind: "show", id: 39, hasMore: true });
		expect(m.close(39)).toEqual({ kind: "show", id: 40, hasMore: false });
		expect(m.close(50)).toEqual({ kind: "dismiss" });
		expect(m.close(51)).toEqual({ kind: "dismiss" });
		expect(m.close(52)).toEqual({ kind: "show", id: 54, hasMore: false });
	});
	it("event chain 41,42,56,59,60,43,44 then copy(45),46,47,48,52(More)", () => {
		const m = createTutorialMachine(6)!;
		const ids: number[] = [];
		const feed = (e: TutorialEvent) => {
			const a = m.onEvent(e);
			if (a && a.kind === "show" && a.id != null) ids.push(a.id);
		};
		[key("colouredFace"), key("unoutlined"), key("movedLegsBack"), key("createdRect"), key("fixated"), key("invisiblised"), key("shoulderEnabled")].forEach(feed);
		feed(key("copied")); // out-of-band copyButton -> 45
		[key("pasted"), part("TextPart"), key("enteredText"), key("uncheckedAlwaysDisplay")].forEach(feed);
		expect(ids).toEqual([41, 42, 56, 59, 60, 43, 44, 45, 46, 47, 48, 52]);
		// 52 is a "More..." dialog.
		expect(m.onEvent(key("noop"))).toBeNull();
	});
});

describe("RubeGoldberg (7)", () => {
	it("close 70->71(More),71->72", () => {
		const m = createTutorialMachine(7)!;
		expect(m.close(70)).toEqual({ kind: "show", id: 71, hasMore: true });
		expect(m.close(71)).toEqual({ kind: "show", id: 72, hasMore: false });
	});
	it("chain 73..81 and 73/74 world anchor (2,-4)", () => {
		const m = createTutorialMachine(7)!;
		const ids = [
			key("rectSelected"), key("rotated"), key("draggedRect"), key("selectedRects"),
			key("draggedRects"), key("fixated"), key("autoWheel"), key("endUncollided"), key("reachedEnd"),
		].map((e) => (m.onEvent(e) as any).id);
		expect(ids).toEqual([73, 74, 75, 76, 77, 78, 79, 80, 81]);
		expect(m.worldAnchorFor(73)).toEqual({ x: 2, y: -4 });
		expect(m.worldAnchorFor(74)).toEqual({ x: 2, y: -4 });
		expect(m.worldAnchorFor(75)).toEqual({ x: -10, y: -10 });
	});
});

describe("NewFeatures (8)", () => {
	it("close 82->83(More),83->84", () => {
		const m = createTutorialMachine(8)!;
		expect(m.close(82)).toEqual({ kind: "show", id: 83, hasMore: true });
		expect(m.close(83)).toEqual({ kind: "show", id: 84, hasMore: false });
	});
	it("chain 85,86,87,88,89", () => {
		expect(
			runEvents(8, [key("partsConnected"), key("outlinesBehind"), key("simStopped"), key("undraggable"), key("botInBox")]),
		).toEqual([85, 86, 87, 88, 89]);
	});
});

describe("ChallengeEditor (9)", () => {
	it("close 90->91(More),91->92, 97->98, 103->104", () => {
		const m = createTutorialMachine(9)!;
		expect(m.close(90)).toEqual({ kind: "show", id: 91, hasMore: true });
		expect(m.close(91)).toEqual({ kind: "show", id: 92, hasMore: false });
		expect(m.close(97)).toEqual({ kind: "show", id: 98, hasMore: false });
		expect(m.close(103)).toEqual({ kind: "show", id: 104, hasMore: false });
	});
	it("chain 93,94,95,96,97,99,100,101,102,103,105,106", () => {
		expect(
			runEvents(9, [
				key("clickedBuildBox"), key("builtBuildBox"), key("clickedConditions"), key("addingCondition"),
				key("addedWinCondition"), key("addingLoss1"), key("addedLoss1"), key("addingLoss2"),
				key("addedLoss2"), key("clickedRestrictions"), key("excludedStuff"), key("disallowedControl"),
			]),
		).toEqual([93, 94, 95, 96, 97, 99, 100, 101, 102, 103, 105, 106]);
	});
	it("screen-anchored ids not world-anchored (95,97,103,106)", () => {
		const m = createTutorialMachine(9)!;
		expect(m.worldAnchorFor(95)).toBeNull();
		expect(m.screenAnchorFor(95)).toEqual({ x: 276, y: 130 });
		expect(m.screenAnchorFor(97)).toEqual({ x: 0, y: 160 });
		expect(m.screenAnchorFor(106)).toEqual({ x: 276, y: 180 });
		// world-anchored default for a chain id without a screen override.
		expect(m.worldAnchorFor(96)).toEqual({ x: -10, y: -10 });
	});
});

// --- getTutorialSetup: part counts + key coords per level --------------------

const BASE = 219; // ControllerTutorial constructor static-part push count.

describe("getTutorialSetup part counts", () => {
	const expectedCounts: Record<number, number> = {
		// Tank prefab has 4 loops (wheels/treads: 20 tread rects + 20 tread joints
		// via for-loops), so its runtime push count (65) exceeds its 33 push
		// statements. BASE(219) + 65 = 284.
		0: BASE + 65, // Tank prefab (loop-expanded)
		1: BASE, // Shapes: base only
		2: BASE + 4, // Car: triangle + body + 2 wheels
		3: BASE + 6, // Jumpbot
		4: BASE + 4, // Dumpbot objects + hint
		5: BASE + 8, // Catapult
		6: 53, // HomeMovies ragdoll (no base)
		7: 103, // RubeGoldberg machine (no base)
		8: 45, // NewFeatures balloon animal + box (no base)
		9: 54, // ChallengeEditor scene (no base)
	};
	for (const [lvl, n] of Object.entries(expectedCounts)) {
		it(`level ${lvl} -> ${n} parts`, () => {
			expect(getTutorialSetup(Number(lvl)).length).toBe(n);
		});
	}
	it("built-in challenges (10-13) return []", () => {
		for (const lvl of [10, 11, 12, 13]) expect(getTutorialSetup(lvl)).toEqual([]);
	});
});

describe("getTutorialSetup key parts / coords", () => {
	it("base terrain first part is the static Circle(-72.55, 7.68, 0.6)", () => {
		const first = getTutorialSetup(1)[0] as Circle;
		expect(first).toBeInstanceOf(Circle);
		expect(first.isStatic).toBe(true);
		expect(first.isEditable).toBe(false);
		expect([first.centerX, first.centerY, first.radius]).toEqual([-72.55, 7.68, 0.6]);
	});

	it("Tank prefab: blue drivable object Rectangle(0,9,1,1) + camera-focus tank base", () => {
		const parts = getTutorialSetup(0);
		const tankParts = parts.slice(BASE);
		// object (the blue square to lift): first tank part, editable=false.
		const obj = tankParts[0] as Rectangle;
		expect(obj).toBeInstanceOf(Rectangle);
		expect([obj.x, obj.y, obj.w, obj.h]).toEqual([0, 9, 1, 1]);
		expect([obj.red, obj.green, obj.blue]).toEqual([22, 73, 255]);
		expect(obj.isEditable).toBe(false);
		// The tank base rectangle is the camera focus (density 20).
		const focus = tankParts.find((p: any) => p.isCameraFocus) as Rectangle;
		expect(focus).toBeInstanceOf(Rectangle);
		expect(focus.density).toBe(20);
		// Tank has revolute joints (wheels) + tank-tread rectangles.
		expect(tankParts.some((p: any) => p instanceof RevoluteJoint)).toBe(true);
		expect(tankParts.some((p: any) => p instanceof Rectangle && p.isTank)).toBe(true);
	});

	it("Car prefab: hint triangle + body + 2 grey wheels, all editable", () => {
		const carParts = getTutorialSetup(2).slice(BASE);
		expect(carParts.length).toBe(4);
		const tri = carParts[0] as Triangle;
		expect(tri).toBeInstanceOf(Triangle);
		expect(tri.isEditable).toBe(false);
		const body = carParts[1] as Rectangle;
		expect([body.x, body.y, body.w, body.h]).toEqual([20, 8, 3, 1]);
		expect([body.red, body.green, body.blue]).toEqual([245, 50, 40]);
		expect(carParts[2]).toBeInstanceOf(Circle);
		expect(carParts[3]).toBeInstanceOf(Circle);
	});

	it("Jumpbot prefab: red car body + 2 motored wheels + green trigger triangle", () => {
		const jb = getTutorialSetup(3).slice(BASE);
		expect(jb.length).toBe(6);
		const body = jb[0] as Rectangle;
		expect([body.x, body.y, body.w, body.h]).toEqual([-58.25, 5, 3.5, 1]);
		const joints = jb.filter((p: any) => p instanceof RevoluteJoint) as RevoluteJoint[];
		expect(joints.length).toBe(2);
		expect(joints.every((j) => j.enableMotor)).toBe(true);
		expect(jb[jb.length - 1]).toBeInstanceOf(Triangle);
	});

	it("Dumpbot prefab: 3 dumpable objects + 1 invisible hint rectangle", () => {
		const db = getTutorialSetup(4).slice(BASE);
		expect(db.length).toBe(4);
		expect(db[0]).toBeInstanceOf(Rectangle); // object1
		expect(db[1]).toBeInstanceOf(Circle); // object2
		expect(db[2]).toBeInstanceOf(Triangle); // object3
		// hint tutorialPart: static, collide=false, opacity 0.
		const hint = db[3] as Rectangle;
		expect(hint.isStatic).toBe(true);
		expect(hint.collide).toBe(false);
		expect(hint.opacity).toBe(0);
		expect([hint.x, hint.y, hint.w, hint.h]).toEqual([30, 7, 3.5, 1.5]);
	});

	it("Catapult prefab: 4 arm rects + 2 fixed joints + motor RJ + green ball", () => {
		const cp = getTutorialSetup(5).slice(BASE);
		expect(cp.length).toBe(8);
		expect(cp.filter((p: any) => p instanceof FixedJoint).length).toBe(2);
		const motor = cp.find((p: any) => p instanceof RevoluteJoint) as RevoluteJoint;
		expect(motor.enableMotor).toBe(true);
		expect(motor.motorSpeed).toBe(10);
		expect(motor.motorStrength).toBe(10);
		const ball = cp[cp.length - 1] as Circle;
		expect(ball).toBeInstanceOf(Circle);
		expect([ball.centerX, ball.centerY, ball.radius]).toEqual([-59.7, 4.8, 0.1]);
	});

	it("HomeMovies prefab: ragdoll, no base terrain, contains revolute + fixed joints", () => {
		const hm = getTutorialSetup(6);
		expect(hm.length).toBe(53);
		expect(hm[0]).toBeInstanceOf(Circle); // hair1
		expect(hm.some((p: any) => p instanceof RevoluteJoint)).toBe(true);
		expect(hm.some((p: any) => p instanceof FixedJoint)).toBe(true);
		// No static baked ground in a Sandbox tutorial.
		expect(hm.some((p: any) => p.isStatic)).toBe(false);
	});

	it("RubeGoldberg prefab: camera-focus ball + wheel motor RJ", () => {
		const rg = getTutorialSetup(7);
		expect(rg.length).toBe(103);
		const ball = rg[rg.length - 1] as Circle;
		expect(ball).toBeInstanceOf(Circle);
		expect(ball.isCameraFocus).toBe(true);
		expect([ball.centerX, ball.centerY, ball.radius]).toEqual([24.4, -4.6, 0.3]);
	});

	it("NewFeatures prefab: 3 static box walls + balloon animal parts", () => {
		const nf = getTutorialSetup(8);
		expect(nf.length).toBe(45);
		// First three are the static box walls (isEditable=false).
		for (let i = 0; i < 3; i++) {
			expect(nf[i]).toBeInstanceOf(Rectangle);
			expect((nf[i] as any).isStatic).toBe(true);
			expect((nf[i] as any).isEditable).toBe(false);
		}
	});

	it("ChallengeEditor prefab: car+garage+balloons with thrusters", () => {
		const ce = getTutorialSetup(9);
		expect(ce.length).toBe(54);
		const thrusters = ce.filter((p: any) => p instanceof Thrusters) as Thrusters[];
		expect(thrusters.length).toBe(3);
		expect(thrusters.every((t) => t.autoOn && t.isBalloon && t.strength === 2)).toBe(true);
		// A camera-focus car body exists.
		expect(ce.some((p: any) => p.isCameraFocus)).toBe(true);
	});
});
