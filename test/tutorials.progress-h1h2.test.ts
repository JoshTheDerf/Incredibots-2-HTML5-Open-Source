// CHARACTERIZATION — H1 (full tutorial progress-key emission) + H2 (physics win).
//
// These drive whole tutorial dialog chains through their real GameCore command
// sequence (Dumpbot, Jumpbot) and assert they advance to completion, and assert a
// physics-based tutorial win fires when the robot satisfies the ChallengeOver
// predicate. See H1/H2 in the task spec.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Circle } from "../src/Parts/Circle";
import { PrismaticJoint } from "../src/Parts/PrismaticJoint";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { ShapePart } from "../src/Parts/ShapePart";

function core(): GameCore {
	return new GameCore(createInitialState());
}

function msg(c: GameCore): number | null {
	return c.getState().tutorial!.currentMessageId;
}

function lastOf<T>(c: GameCore, pred: (p: unknown) => p is T): T {
	const parts = c.getState().parts;
	for (let i = parts.length - 1; i >= 0; i--) if (pred(parts[i])) return parts[i] as T;
	throw new Error("part not found");
}

describe("H1 — Jumpbot full chain advances to completion (dialog 20)", () => {
	it("piston -> enable -> reset -> power -> density walks 15..20", () => {
		const c = core();
		c.dispatch({ type: "loadTutorial", levelIndex: 3 });
		expect(msg(c)).toBe(15);

		// Two overlapping rects for the piston to bind, then the two-click prismatic.
		c.dispatch({ type: "createShape", kind: "rect", x1: -50, y1: 0, x2: -46, y2: 3 });
		c.dispatch({ type: "createShape", kind: "rect", x1: -49, y1: 1, x2: -45, y2: 4 });
		c.dispatch({ type: "toggleSnapToCenter" });
		c.dispatch({ type: "startPrismaticJoint", x: -49.5, y: 0.5 });
		c.dispatch({ type: "finishPrismaticJoint", x: -45.5, y: 3.5 });
		expect(msg(c)).toBe(16);

		const piston = lastOf(c, (p): p is PrismaticJoint => p instanceof PrismaticJoint);
		c.dispatch({ type: "setJointMotor", partIds: [piston.id], value: true });
		expect(msg(c)).toBe(17);

		// Play then reset -> dialog 18.
		c.dispatch({ type: "play" });
		c.dispatch({ type: "reset" });
		expect(msg(c)).toBe(18);

		// Strength+speed both > 15 -> "powerIncreased" -> 19.
		c.dispatch({ type: "setJointStrength", partIds: [piston.id], value: 20 });
		c.dispatch({ type: "setJointSpeed", partIds: [piston.id], value: 20 });
		expect(msg(c)).toBe(19);

		// Density < 15 on the car body -> "densityDecreased" -> 20 (the last dialog).
		const shape = c.getState().parts.find((p) => p instanceof ShapePart && p.isEditable) as ShapePart;
		c.dispatch({ type: "setDensity", partIds: [shape.id], value: 1 });
		expect(msg(c)).toBe(20);
	});
});

describe("H1 — Dumpbot full chain advances to completion (dialog 31)", () => {
	it("walks 21 -> 22 -> ... -> 31 through the real command sequence", () => {
		const c = core();
		c.dispatch({ type: "loadTutorial", levelIndex: 4 });
		expect(msg(c)).toBe(21);

		// 22: body rectangle (partCreated Rectangle).
		c.dispatch({ type: "createShape", kind: "rect", x1: 26, y1: 3, x2: 29, y2: 5 });
		expect(msg(c)).toBe(22);

		// 23: two editable wheels (Circles).
		c.dispatch({ type: "createShape", kind: "circle", x1: 27, y1: 6, x2: 27.7, y2: 6 });
		c.dispatch({ type: "createShape", kind: "circle", x1: 28.5, y1: 6, x2: 29.2, y2: 6 });
		expect(msg(c)).toBe(23);

		// 24: both wheel joints motored. Build the joints on the overlaps, enable motors.
		c.dispatch({ type: "toggleSnapToCenter" }); // off, avoid centre-snap disambiguation
		// Wheel A joint: body rect overlaps the wheel near (27,5)?; make a joint where
		// body+wheelA overlap. Simplest: overlap the wheel with the body by placing the
		// click where both contain the point. Body spans x[26,29] y[3,5]; wheelA centre
		// (27,6) r0.7 -> spans y[5.3,6.7]. They don't overlap. Re-make wheels overlapping
		// the body so joints can bind. Clear and rebuild with overlap.
		// (Instead of fighting geometry, drive the motor-enable milestone directly by
		// creating two revolute joints between the body and each wheel via overlap.)
		// Move wheels up so they overlap the body.
		const wheels = c.getState().parts.filter((p) => p instanceof Circle && p.isEditable) as Circle[];
		const body = c.getState().parts.find((p) => p.constructor.name === "Rectangle" && p.isEditable)!;
		c.dispatch({ type: "moveParts", partIds: [wheels[0].id], dx: 0, dy: -1.5 });
		c.dispatch({ type: "moveParts", partIds: [wheels[1].id], dx: 0, dy: -1.5 });
		// Joint at wheelA centre (now y~4.5) where body also is.
		c.dispatch({ type: "createJoint", kind: "revolute", x: wheels[0].centerX, y: wheels[0].centerY });
		c.dispatch({ type: "createJoint", kind: "revolute", x: wheels[1].centerX, y: wheels[1].centerY });
		const rjs = c.getState().parts.filter((p) => p instanceof RevoluteJoint) as RevoluteJoint[];
		expect(rjs.length).toBeGreaterThanOrEqual(2);
		c.dispatch({ type: "setJointMotor", partIds: [rjs[0].id, rjs[1].id], value: true });
		expect(msg(c)).toBe(24);

		// 25: the arm rectangle, overlapping the body so a joint can bind them.
		c.dispatch({ type: "createShape", kind: "rect", x1: 27, y1: 3.5, x2: 30, y2: 4 });
		expect(msg(c)).toBe(25);

		// 58: clicked the Rotating Joint tool.
		c.dispatch({ type: "setTool", tool: "newRevoluteJoint" });
		expect(msg(c)).toBe(58);

		// 26: the arm joint (a RevoluteJoint) created where the arm overlaps the body.
		// (Body spans x[26,29] y[3,5]; arm centre ~ (28.5, 3.75) sits inside it.)
		const arm = lastOf(c, (p): p is ShapePart => p instanceof ShapePart && p.isEditable && p.constructor.name === "Rectangle");
		c.dispatch({ type: "createJoint", kind: "revolute", x: 28, y: 3.75 });
		expect(msg(c)).toBe(26);

		// 57: arm joint solidified (motor + stiff).
		const armJoint = lastOf(c, (p): p is RevoluteJoint => p instanceof RevoluteJoint);
		c.dispatch({ type: "setJointMotor", partIds: [armJoint.id], value: true });
		c.dispatch({ type: "setJointStiff", partIds: [armJoint.id], value: true });
		expect(msg(c)).toBe(57);

		// 27: control keys set to up(38)/down(40).
		c.dispatch({ type: "setJointControlKey", partIds: [armJoint.id], which: "cw", key: 38 });
		c.dispatch({ type: "setJointControlKey", partIds: [armJoint.id], which: "ccw", key: 40 });
		expect(msg(c)).toBe(27);

		// 28: the bucket (two rectangles), created well clear of the rest (y~7) so the
		// bucket's own fixed joint sees exactly two shapes.
		c.dispatch({ type: "createShape", kind: "rect", x1: 34, y1: 7, x2: 35, y2: 7.2 });
		c.dispatch({ type: "createShape", kind: "rect", x1: 34, y1: 7, x2: 34.2, y2: 8 });
		expect(msg(c)).toBe(28);

		// 29: fixed joint fixing the two bucket rects together (overlap at (34.1, 7.1)).
		const bucketRects = c.getState().parts.filter(
			(p) => p.constructor.name === "Rectangle" && p.isEditable,
		) as ShapePart[];
		const r1 = bucketRects[bucketRects.length - 1];
		const r2 = bucketRects[bucketRects.length - 2];
		c.dispatch({ type: "createJoint", kind: "fixed", x: 34.1, y: 7.1 });
		expect(msg(c)).toBe(29);
		// 30: second fixed joint attaching the bucket to the arm. Move r2 to an
		// arm-only region (x > 29, past the body's right edge) so exactly two shapes
		// (r2 + arm) overlap at the joint point.
		c.dispatch({ type: "moveParts", partIds: [r2.id], dx: 29.6 - r2.centerX, dy: 3.75 - r2.centerY });
		c.dispatch({ type: "createJoint", kind: "fixed", x: 29.6, y: 3.75 });
		expect(msg(c)).toBe(30);

		// 31: motor adjusted (speed<15, strength>15, stiff).
		c.dispatch({ type: "setJointStrength", partIds: [armJoint.id], value: 20 });
		c.dispatch({ type: "setJointSpeed", partIds: [armJoint.id], value: 5 });
		expect(msg(c)).toBe(31);
	});
});

describe("H1 — HomeMovies full chain advances to completion (dialog 52)", () => {
	it("walks 40 -> 41 -> ... -> 48 -> 52 through the real command sequence", () => {
		const c = core();
		c.dispatch({ type: "loadTutorial", levelIndex: 6 });
		// Intro 38 -> 39 -> 40.
		c.dispatch({ type: "advanceTutorial", messageId: 38 });
		c.dispatch({ type: "advanceTutorial", messageId: 39 });
		expect(msg(c)).toBe(40);

		const anyShape = () => c.getState().parts.find((p) => p instanceof ShapePart) as ShapePart;
		const s = anyShape();

		// 41: face coloured beige (255,216,136).
		c.dispatch({ type: "setColour", partIds: [s.id], r: 255, g: 216, b: 136, opacity: 1 });
		expect(msg(c)).toBe(41);
		// 42: hair "Show Outlines" off.
		c.dispatch({ type: "setOutline", partIds: [s.id], value: false });
		expect(msg(c)).toBe(42);
		// 56: a leg piece moved to back.
		c.dispatch({ type: "movePartsToBack", partIds: [s.id] });
		expect(msg(c)).toBe(56);
		// 59: support rect + fixed joint (createdRect). Build two overlapping rects
		// clear of the ragdoll, then fix them.
		c.dispatch({ type: "createShape", kind: "rect", x1: 40, y1: 0, x2: 42, y2: 1 });
		c.dispatch({ type: "createShape", kind: "rect", x1: 40.5, y1: 0.5, x2: 42.5, y2: 1.5 });
		c.dispatch({ type: "createJoint", kind: "fixed", x: 41, y: 0.75 });
		expect(msg(c)).toBe(59);
		// 60: the support rect fixated.
		const rect = lastOf(c, (p): p is ShapePart => p instanceof ShapePart && p.isEditable && p.constructor.name === "Rectangle");
		c.dispatch({ type: "setFixate", partIds: [rect.id], value: true });
		expect(msg(c)).toBe(60);
		// 43: the support rect made invisible (opacity 0).
		c.dispatch({ type: "setColour", partIds: [rect.id], r: 0, g: 0, b: 0, opacity: 0 });
		expect(msg(c)).toBe(43);
		// 44: a shoulder joint's motor enabled. Build a revolute joint on the two
		// support rects, then enable it (any revolute motor advances shoulderEnabled).
		const rj = lastOf(c, (p): p is RevoluteJoint | ShapePart => p instanceof ShapePart);
		void rj;
		c.dispatch({ type: "createJoint", kind: "revolute", x: 41, y: 0.75 });
		const revolute = lastOf(c, (p): p is RevoluteJoint => p instanceof RevoluteJoint);
		c.dispatch({ type: "setJointMotor", partIds: [revolute.id], value: true });
		expect(msg(c)).toBe(44);
		// 45: copied.
		c.dispatch({ type: "select", partIds: [rect.id] });
		c.dispatch({ type: "copyParts", partIds: [rect.id] });
		expect(msg(c)).toBe(45);
		// 46: pasted.
		c.dispatch({ type: "pasteParts" });
		expect(msg(c)).toBe(46);
		// 47: a TextPart created.
		c.dispatch({ type: "createText", x: 45, y: 0, text: "Hi" });
		expect(msg(c)).toBe(47);
		// 48: text entered/resized.
		const text = lastOf(c, (p): p is ShapePart => p.constructor.name === "TextPart") as unknown as { id: number };
		c.dispatch({ type: "setTextContent", partIds: [text.id], text: "Hello!" });
		expect(msg(c)).toBe(48);
		// 52: "Always Display" unchecked (the last chain dialog).
		c.dispatch({ type: "setTextAlwaysVisible", partIds: [text.id], value: false });
		expect(msg(c)).toBe(52);
	});
});

describe("H1 — ChallengeEditor full chain advances to completion (dialog 106)", () => {
	it("walks 92 -> 93..97 -> 99..102 -> 103,105,106 via conditions/restrictions", () => {
		const c = core();
		c.dispatch({ type: "loadTutorial", levelIndex: 9 });
		c.dispatch({ type: "newChallenge" });
		// Intro 90 -> 91 -> 92.
		c.dispatch({ type: "advanceTutorial", messageId: 90 });
		c.dispatch({ type: "advanceTutorial", messageId: 91 });
		expect(msg(c)).toBe(92);

		// 93 + 94: build box (clickedBuildBox then builtBuildBox).
		c.dispatch({ type: "addBuildArea", minX: -5, minY: -5, maxX: 5, maxY: 5 });
		expect(msg(c)).toBe(94);

		// 95 + 96 + 97: a win condition added (clickedConditions, addingCondition,
		// addedWinCondition walked in order), then close 97 -> 98.
		c.dispatch({ type: "addWinCondition", subject: 0, object: 0, region: { minX: 1, maxX: 2, minY: 1, maxY: 2 } });
		expect(msg(c)).toBe(97);
		c.dispatch({ type: "advanceTutorial", messageId: 97 });
		expect(msg(c)).toBe(98);

		// 99 + 100: first loss condition (addingLoss1 then addedLoss1).
		c.dispatch({ type: "addLossCondition", subject: 1, object: 3, immediate: true, region: { minX: 0, maxX: 0, minY: -10, maxY: -9 } });
		expect(msg(c)).toBe(100);
		// 101 + 102: second loss condition.
		c.dispatch({ type: "addLossCondition", subject: 0, object: 3, immediate: false, region: { minX: 0, maxX: 0, minY: 9, maxY: 10 } });
		expect(msg(c)).toBe(102);

		// 103 + 105: restrictions dialog opened, then joints/thrusters excluded; then
		// close 103 -> 104 in between (the machine's close switch).
		c.dispatch({
			type: "setAllowedParts",
			circles: true,
			rects: true,
			tris: true,
			fixed: false,
			revolute: true,
			prismatic: false,
			thrusters: false,
			cannons: true,
		});
		expect(msg(c)).toBe(105);

		// 106: control disallowed (the final chain dialog).
		c.dispatch({
			type: "setBuildPermissions",
			mouseDrag: true,
			botControl: false,
			fixate: true,
			nonColliding: true,
			showConditions: true,
		});
		expect(msg(c)).toBe(106);
	});
});

describe("H2 — physics win fires when the robot satisfies the predicate", () => {
	it("Shapes: an editable circle inside the pit zone wins on the first stepped frame", () => {
		const c = core();
		c.dispatch({ type: "loadTutorial", levelIndex: 1 });
		expect(c.getState().tutorial!.levelsDone[1]).toBe(false);

		// Shapes.ChallengeOver: any editable Circle with -15 < x < -3 && y > 10.
		// Create the circle inside the zone and fixate it so it stays put under gravity.
		c.dispatch({ type: "createShape", kind: "circle", x1: -9, y1: 11.5, x2: -8.3, y2: 11.5 });
		const circle = lastOf(c, (p): p is Circle => p instanceof Circle && p.isEditable);
		c.dispatch({ type: "setFixate", partIds: [circle.id], value: true });

		c.dispatch({ type: "play" });
		c.dispatch({ type: "step", frames: 1 });

		// The win latches the level as done (levelsDone[1] == true).
		expect(c.getState().tutorial!.levelsDone[1]).toBe(true);
	});
});
