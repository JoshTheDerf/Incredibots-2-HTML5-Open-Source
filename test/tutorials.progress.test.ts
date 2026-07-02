// CHARACTERIZATION — tutorial `{type:"progress"}` milestone emission.
//
// The tutorial state machines (src/core/tutorials.ts) advance on generic
// progress events keyed by a milestone name. GameCore emits those keys from the
// matching command handlers / lifecycle points (setJointMotor, setJointLimits,
// setFixate, setUndragable, setOutlineBehind, reset, add condition, copy/paste).
// These tests dispatch a milestone command and assert the active machine steps
// to the next dialog id — proving the emission is wired to the right action.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { ShapePart } from "../src/Parts/ShapePart";

function core(): GameCore {
	return new GameCore(createInitialState());
}

function firstRevoluteId(c: GameCore): number {
	const j = c.getState().parts.find((p) => p instanceof RevoluteJoint) as RevoluteJoint | undefined;
	if (!j) throw new Error("no RevoluteJoint in scene");
	return j.id;
}

function firstShapeId(c: GameCore): number {
	const s = c.getState().parts.find((p) => p instanceof ShapePart) as ShapePart | undefined;
	if (!s) throw new Error("no ShapePart in scene");
	return s.id;
}

describe("tutorial progress emission advances the dialog machine", () => {
	it("Catapult: setJointLimits(-10/50) fires limitLower->35 then limitUpper->36", () => {
		const c = core();
		c.dispatch({ type: "loadTutorial", levelIndex: 5 });
		// Walk the intro dialogs 32 -> 33 -> 34 so the chain's next step is limitLower.
		c.dispatch({ type: "advanceTutorial", messageId: 32 });
		c.dispatch({ type: "advanceTutorial", messageId: 33 });
		expect(c.getState().tutorial!.currentMessageId).toBe(34);

		const jointId = firstRevoluteId(c);
		// Lower limit == -10 (degrees) -> progress "limitLower" -> dialog 35.
		c.dispatch({ type: "setJointLimits", partIds: [jointId], lower: -10, upper: null });
		expect(c.getState().tutorial!.currentMessageId).toBe(35);
		// Upper limit == 50 -> progress "limitUpper" -> dialog 36.
		c.dispatch({ type: "setJointLimits", partIds: [jointId], lower: -10, upper: 50 });
		expect(c.getState().tutorial!.currentMessageId).toBe(36);
	});

	it("Catapult: reset after both limits fires 'reset' -> dialog 37", () => {
		const c = core();
		c.dispatch({ type: "loadTutorial", levelIndex: 5 });
		c.dispatch({ type: "advanceTutorial", messageId: 32 });
		c.dispatch({ type: "advanceTutorial", messageId: 33 });
		const jointId = firstRevoluteId(c);
		c.dispatch({ type: "setJointLimits", partIds: [jointId], lower: -10, upper: null });
		c.dispatch({ type: "setJointLimits", partIds: [jointId], lower: -10, upper: 50 });
		expect(c.getState().tutorial!.currentMessageId).toBe(36);
		// Play then reset -> the reset button milestone -> dialog 37.
		c.dispatch({ type: "play" });
		c.dispatch({ type: "reset" });
		expect(c.getState().tutorial!.currentMessageId).toBe(37);
	});

	it("does not advance on an unexpected progress key (cursor gating)", () => {
		const c = core();
		c.dispatch({ type: "loadTutorial", levelIndex: 5 });
		c.dispatch({ type: "advanceTutorial", messageId: 32 });
		c.dispatch({ type: "advanceTutorial", messageId: 33 });
		expect(c.getState().tutorial!.currentMessageId).toBe(34);
		const shapeId = firstShapeId(c);
		// The catapult's next expected key is "limitLower"; a fixate ("fixated") is
		// not expected here, so the dialog must NOT move off 34.
		c.dispatch({ type: "setFixate", partIds: [shapeId], value: true });
		expect(c.getState().tutorial!.currentMessageId).toBe(34);
	});

	it("Jumpbot: creating then enabling a piston walks 15 -> 16 -> 17", () => {
		const c = core();
		c.dispatch({ type: "loadTutorial", levelIndex: 3 });
		expect(c.getState().tutorial!.currentMessageId).toBe(15);
		// Build two overlapping rectangles so a prismatic joint can bind them, then
		// create the piston at their overlap. partCreated("PrismaticJoint") -> 16.
		c.dispatch({ type: "createShape", kind: "rect", x1: -50, y1: 0, x2: -46, y2: 3 });
		c.dispatch({ type: "createShape", kind: "rect", x1: -49, y1: 1, x2: -45, y2: 4 });
		// Prismatic is a two-click gesture (H4). To avoid the >1-overlap
		// disambiguation, click 1 lands where ONLY rect A is (bottom-left corner)
		// and click 2 where ONLY rect B is (top-right corner); the slide axis runs
		// between them. snapToCenter off so the clicks aren't pulled to a centre.
		c.dispatch({ type: "toggleSnapToCenter" });
		c.dispatch({ type: "startPrismaticJoint", x: -49.5, y: 0.5 });
		c.dispatch({ type: "finishPrismaticJoint", x: -45.5, y: 3.5 });
		expect(c.getState().tutorial!.currentMessageId).toBe(16);
		const piston = c.getState().parts.find((p) => p.constructor.name === "PrismaticJoint");
		expect(piston).toBeTruthy();
		// Enabling the piston motor -> progress "pistonEnabled" -> dialog 17.
		c.dispatch({ type: "setJointMotor", partIds: [piston!.id], value: true });
		expect(c.getState().tutorial!.currentMessageId).toBe(17);
	});
});
