// CHARACTERIZATION — tutorial message table, level mapping, and the per-subclass
// dialog state machine.
//
// Pins the faithful transcription of the legacy tutorial system
// (docs/PORT-SPEC-tutorials-replays.md §A, src/core/tutorials.ts):
//   - TUTORIAL_MESSAGES table (src/Gui/TutorialWindow.ts:115-224)
//   - window sizing / position clamps (:19-28)
//   - level-select mapping + level-done indices (src/Gui/TutorialSelectWindow.ts)
//   - ControllerTank + ControllerShapes dialog flows.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import {
	TUTORIAL_MESSAGES,
	TUTORIAL_LEVELS,
	tutorialLevel,
	tutorialWindowHeight,
	clampTutorialPosition,
	levelDoneIndexForControllerType,
	createTutorialMachine,
} from "../src/core/tutorials";

describe("TUTORIAL_MESSAGES table (TutorialWindow.ts:115-224)", () => {
	it("has 108 entries (ids 0-107)", () => {
		expect(TUTORIAL_MESSAGES.length).toBe(108);
	});

	it("id 0 is the Tank welcome message, verbatim", () => {
		expect(TUTORIAL_MESSAGES[0]).toBe(
			"Welcome to the world of IncrediBots 2!\n\nThis is the robot building screen,\nwhere you'll learn to construct\namazing robots like this tank... or\nanything else you can imagine!",
		);
	});

	it("id 4 is the first Shapes tutorial message (draw a rectangle)", () => {
		expect(TUTORIAL_MESSAGES[4].startsWith("Now you'll learn some of\nthe game's tools")).toBe(true);
	});

	it("id 38 is the sandbox 'no real goal' message", () => {
		expect(TUTORIAL_MESSAGES[38]).toContain("This is a SANDBOX level");
	});

	it("id 55 is the LINK/EMBED message (faithful to the original index)", () => {
		// ControllerTank shows message 55 after winning; the original table has the
		// LINK/EMBED copy at that index (TutorialWindow.ts). Ported verbatim.
		expect(TUTORIAL_MESSAGES[55]).toContain("EMBED the replay");
	});
});

describe("tutorial window sizing (TutorialWindow.ts:19-20)", () => {
	it("id 25 -> height 185", () => {
		expect(tutorialWindowHeight(25)).toBe(185);
	});
	it("big-set ids -> 180 (e.g. 1, 4, 14, 60)", () => {
		for (const id of [1, 4, 14, 21, 23, 27, 30, 44, 48, 50, 52, 53, 56, 57, 58, 60]) {
			expect(tutorialWindowHeight(id)).toBe(180);
		}
	});
	it("challenge-intro ids 71..81 -> 180", () => {
		for (let id = 71; id < 82; id++) expect(tutorialWindowHeight(id)).toBe(180);
	});
	it("other ids -> 170", () => {
		expect(tutorialWindowHeight(0)).toBe(170);
		expect(tutorialWindowHeight(5)).toBe(170);
	});
});

describe("tutorial position clamps (TutorialWindow.ts:21-28)", () => {
	it("x < 100 clamps to 100 for id < 70", () => {
		expect(clampTutorialPosition(5, 40, 200).x).toBe(100);
	});
	it("x < 50 clamps to 50 for id >= 70", () => {
		expect(clampTutorialPosition(75, 30, 200).x).toBe(50);
	});
	it("x between 50 and 100 stays for id >= 70", () => {
		expect(clampTutorialPosition(75, 70, 200).x).toBe(70);
	});
	it("x > 500 -> 520", () => {
		expect(clampTutorialPosition(5, 600, 200).x).toBe(520);
	});
	it("y clamps to [120, 380]", () => {
		expect(clampTutorialPosition(5, 200, 50).y).toBe(120);
		expect(clampTutorialPosition(5, 200, 900).y).toBe(380);
		expect(clampTutorialPosition(5, 200, 250).y).toBe(250);
	});
});

describe("level-select mapping (TutorialSelectWindow.ts:35-66)", () => {
	it("has 14 levels (10 tutorials + 4 built-in challenges)", () => {
		expect(TUTORIAL_LEVELS.length).toBe(14);
		expect(TUTORIAL_LEVELS.filter((l) => l.isChallenge).length).toBe(4);
	});

	it("tutorial 0 (Tank) -> controllerType 10", () => {
		expect(tutorialLevel(0)!.controllerType).toBe(10);
		expect(tutorialLevel(0)!.label).toBe("1. Drive a Tank!");
	});

	it("tutorial 8 (New in IB2) uses low-grav SandboxSettings(1.0, 0, 1, 5, 1)", () => {
		const s = tutorialLevel(8)!.settings;
		expect(s).toEqual({ gravity: 1.0, size: 0, terrainType: 1, terrainTheme: 5, background: 1 });
		expect(tutorialLevel(8)!.controllerType).toBe(18);
	});

	it("challenge levels map controllerType 2-5 (Monkey Bars..Spaceships)", () => {
		expect(tutorialLevel(10)!.controllerType).toBe(2); // Monkey Bars
		expect(tutorialLevel(11)!.controllerType).toBe(3); // Climb
		expect(tutorialLevel(12)!.controllerType).toBe(4); // Bike Race
		expect(tutorialLevel(13)!.controllerType).toBe(5); // Spaceships
	});

	it("level-done index: tutorial == type-10, challenge == type+8 (ControllerGame.ts:754-762)", () => {
		expect(levelDoneIndexForControllerType(10)).toBe(0); // Tank
		expect(levelDoneIndexForControllerType(19)).toBe(9); // Challenge editor
		expect(levelDoneIndexForControllerType(2)).toBe(10); // Monkey Bars
		expect(levelDoneIndexForControllerType(5)).toBe(13); // Spaceships
	});
});

describe("ControllerTank dialog flow (ControllerTank.ts:287-313)", () => {
	it("Init shows dialog 0 (More); 0->1 (More); 1->2 (OK)", () => {
		const m = createTutorialMachine(0)!;
		expect(m.init()).toEqual({ kind: "show", id: 0, hasMore: true });
		expect(m.close(0)).toEqual({ kind: "show", id: 1, hasMore: true });
		expect(m.close(1)).toEqual({ kind: "show", id: 2, hasMore: false });
	});

	it("win shows dialog 3 (More); 3->55; 55->dismiss", () => {
		const m = createTutorialMachine(0)!;
		expect(m.onEvent({ type: "won" })).toEqual({ kind: "show", id: 3, hasMore: true });
		expect(m.close(3)).toEqual({ kind: "show", id: 55, hasMore: false });
		expect(m.close(55)).toEqual({ kind: "dismiss" });
	});
});

describe("ControllerShapes part-created flow (ControllerShapes.ts:22-40)", () => {
	it("Init shows dialog 4; rect->5; then triangle->6; then circle->7 (order enforced)", () => {
		const m = createTutorialMachine(1)!;
		expect(m.init()).toEqual({ kind: "show", id: 4, hasMore: false });
		// A circle before a rectangle does nothing (order gate).
		expect(m.onEvent({ type: "partCreated", partKind: "Circle" })).toBeNull();
		// Rectangle -> 5.
		expect(m.onEvent({ type: "partCreated", partKind: "Rectangle" })).toEqual({ kind: "show", id: 5, hasMore: false });
		// A second rectangle does nothing.
		expect(m.onEvent({ type: "partCreated", partKind: "Rectangle" })).toBeNull();
		// Triangle -> 6.
		expect(m.onEvent({ type: "partCreated", partKind: "Triangle" })).toEqual({ kind: "show", id: 6, hasMore: false });
		// Circle -> 7.
		expect(m.onEvent({ type: "partCreated", partKind: "Circle" })).toEqual({ kind: "show", id: 7, hasMore: false });
	});
});

describe("GameCore tutorial integration", () => {
	function core(): GameCore {
		return new GameCore(createInitialState());
	}

	it("loadTutorial(1) activates the Shapes tutorial + shows message id 4", () => {
		const c = core();
		c.dispatch({ type: "loadTutorial", levelIndex: 1 });
		const t = c.getState().tutorial!;
		expect(t.active).toBe(true);
		expect(t.levelIndex).toBe(1);
		expect(t.currentMessageId).toBe(4);
		expect(t.currentMessage!.text).toBe(TUTORIAL_MESSAGES[4]);
		expect(t.currentMessage!.height).toBe(180); // id 4 is in the big-set
	});

	it("Shapes tutorial advances when the player creates a rectangle then a triangle", () => {
		const c = core();
		c.dispatch({ type: "loadTutorial", levelIndex: 1 });
		// Draw a rectangle (createShape rect gesture: opposite corners).
		c.dispatch({ type: "createShape", kind: "rect", x1: -25, y1: 2, x2: -22, y2: 5 });
		expect(c.getState().tutorial!.currentMessageId).toBe(5);
		// Draw a triangle (base edge + apex).
		c.dispatch({ type: "createShape", kind: "triangle", x1: -25, y1: 6, x2: -22, y2: 6, x3: -23.5, y3: 4 });
		expect(c.getState().tutorial!.currentMessageId).toBe(6);
	});

	it("loadTutorial(0) shows the Tank dialog 0 with More; advanceTutorial walks 0->1->2", () => {
		const c = core();
		c.dispatch({ type: "loadTutorial", levelIndex: 0 });
		expect(c.getState().tutorial!.currentMessageId).toBe(0);
		expect(c.getState().tutorial!.currentMessage!.hasMore).toBe(true);
		c.dispatch({ type: "advanceTutorial", messageId: 0 });
		expect(c.getState().tutorial!.currentMessageId).toBe(1);
		c.dispatch({ type: "advanceTutorial", messageId: 1 });
		expect(c.getState().tutorial!.currentMessageId).toBe(2);
		expect(c.getState().tutorial!.currentMessage!.hasMore).toBe(false);
	});

	it("closeTutorial clears the session", () => {
		const c = core();
		c.dispatch({ type: "loadTutorial", levelIndex: 0 });
		c.dispatch({ type: "closeTutorial" });
		expect(c.getState().tutorial).toBeNull();
	});
});
