// CHARACTERIZATION — GameCore FOUNDATION sweep (M1/M2/M6/L5).
//
// Pins four behaviours ported from the legacy ControllerGame / ColourChangeWindow:
//   M2  Reset restores the pre-play camera (playButton snapshots savedDrawXOff/YOff
//       :2776-2777; resetButton restores them :2813-2814).
//   M1  playButton refuses to start + shows a dialog when the robot doesn't fit the
//       starting box (challenge only) or exceeds 500 shapes (:2719-2721,2781-2782).
//   M6  colourButton(..., makeDefault) sets the default colour used by new parts
//       (ControllerGameGlobals.defaultR/G/B/O — ControllerGame.ts:4454-4461).
//   L5  View → "Center on Selection" centres the camera on the selection centroid
//       (ControllerGame.CenterOnSelected :2542-2564).

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Circle } from "../src/Parts/Circle";
import { ShapePart } from "../src/Parts/ShapePart";
import type { Part } from "../src/Parts/Part";
import { DEFAULT_B, DEFAULT_G, DEFAULT_R } from "../src/Parts/partDefaults";

/** A fresh core with the canonical sandbox terrain (createInitialState). */
function sandboxCore(): GameCore {
	return new GameCore(createInitialState());
}

/** A core seeded with the given parts (plus no terrain), ids assigned. */
function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

// --- M2: Reset restores the camera -------------------------------------------

describe("Reset restores the pre-play camera (sweep M2)", () => {
	it("a run that moves the camera is undone by reset", () => {
		const core = coreWith([new Circle(0, 0, 1)]);
		// A non-default camera before play.
		core.dispatch({ type: "zoomIn" }); // changes scale + offsets deterministically
		const before = { ...core.getState().camera };

		core.dispatch({ type: "play" });
		expect(core.getState().sim.phase).toBe("running");
		// Simulate the camera being displaced during the run (auto-pan/follow).
		core.dispatch({ type: "moveCameraDuringSim", drawXOff: 999, drawYOff: 888, scale: before.scale });
		// The camera moved away from the pre-play snapshot.
		expect(core.getState().camera).not.toEqual(before);

		core.dispatch({ type: "reset" });
		expect(core.getState().sim.phase).toBe("editing");
		expect(core.getState().camera).toEqual(before);
	});
});

// --- M1: Play validation + refuse + message ----------------------------------

describe("Play validation refuses + emits a message (sweep M1)", () => {
	// A built-in challenge loads in play mode (playMode=true) with a build area
	// (climb: (1,1)-(15,11.1)); the player's added shapes stay editable, so the
	// fit-check (editable ShapeParts vs build areas) gates the play button — the
	// realistic player-facing flow.
	function climbChallengeCore(): GameCore {
		const core = sandboxCore();
		core.dispatch({ type: "loadBuiltInChallenge", name: "climb" });
		return core;
	}

	it("challenge: a shape OUTSIDE the build area refuses play + emits the fit string", () => {
		const core = climbChallengeCore();
		// A circle at (100,100) is well outside the (1,1)-(15,11.1) build area.
		core.dispatch({ type: "createShape", kind: "circle", x1: 100, y1: 100, x2: 101, y2: 100 });

		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));

		core.dispatch({ type: "play" });
		expect(core.getState().sim.phase).toBe("editing"); // refused, stays editing
		expect(messages).toEqual(["You must fit your robot inside the starting box first!"]);
	});

	it("challenge: a shape INSIDE the build area plays", () => {
		const core = climbChallengeCore();
		// A small circle centred at (8,6) fits inside (1,1)-(15,11.1).
		core.dispatch({ type: "createShape", kind: "circle", x1: 8, y1: 6, x2: 8.5, y2: 6 });

		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));

		core.dispatch({ type: "play" });
		expect(core.getState().sim.phase).toBe("running");
		expect(messages).toEqual([]);
	});

	it("more than 500 physical shapes refuses play + emits the limit string", () => {
		// 501 circles — count > 500 (PartIsPhysical = ShapePart || PrismaticJoint).
		const circles: Part[] = [];
		for (let i = 0; i < 501; i++) circles.push(new Circle(0, 0, 1));
		const core = coreWith(circles);

		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));

		core.dispatch({ type: "play" });
		expect(core.getState().sim.phase).toBe("editing"); // refused
		expect(messages).toEqual(["Your robot contains too many shapes!  (Limit 500)"]);
	});

	it("exactly 500 shapes is allowed (limit is > 500)", () => {
		// Spread the circles apart so the broadphase doesn't overflow its pair pool
		// when the world inits — the guard boundary (not physics capacity) is the
		// subject here.
		const circles: Part[] = [];
		for (let i = 0; i < 500; i++) circles.push(new Circle((i % 25) * 5, Math.floor(i / 25) * 5, 1));
		const core = coreWith(circles);
		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));
		core.dispatch({ type: "play" });
		expect(messages).toEqual([]); // not refused for shape count
		expect(core.getState().sim.phase).toBe("running");
	});

	it("a normal sandbox robot (no challenge) plays unconditionally", () => {
		const core = coreWith([new Circle(999, 999, 1)]); // fit check no-ops outside challenge
		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));
		core.dispatch({ type: "play" });
		expect(core.getState().sim.phase).toBe("running");
		expect(messages).toEqual([]);
	});
});

// --- M6: Default colour for new parts + "Make Default" -----------------------

describe("Default colour for new parts (sweep M6)", () => {
	it("setColour with makeDefault: a new shape adopts the default colour", () => {
		const core = sandboxCore();
		core.dispatch({ type: "createShape", kind: "circle", x1: 0, y1: 0, x2: 3, y2: 0 });
		const firstId = core.getState().edit.selection[0];
		// Recolour + make default (opacity arrives 0-1).
		core.dispatch({ type: "setColour", partIds: [firstId], r: 10, g: 20, b: 30, opacity: 0.5, makeDefault: true });

		// A NEW shape adopts the new default colour.
		core.dispatch({ type: "createShape", kind: "circle", x1: 5, y1: 5, x2: 8, y2: 5 });
		const newId = core.getState().edit.selection[0];
		const newPart = core.getState().parts.find((p) => p.id === newId) as ShapePart;
		expect(newPart.red).toBe(10);
		expect(newPart.green).toBe(20);
		expect(newPart.blue).toBe(30);
		expect(newPart.opacity).toBe(0.5 * 255);
	});

	it("setColour WITHOUT makeDefault does not change the default", () => {
		const core = sandboxCore();
		core.dispatch({ type: "createShape", kind: "circle", x1: 0, y1: 0, x2: 3, y2: 0 });
		const firstId = core.getState().edit.selection[0];
		core.dispatch({ type: "setColour", partIds: [firstId], r: 111, g: 122, b: 133, opacity: 1 });

		// A NEW shape keeps the ORIGINAL default (partDefaults), not the recolour.
		core.dispatch({ type: "createShape", kind: "circle", x1: 5, y1: 5, x2: 8, y2: 5 });
		const newId = core.getState().edit.selection[0];
		const newPart = core.getState().parts.find((p) => p.id === newId) as ShapePart;
		expect(newPart.red).toBe(DEFAULT_R);
		expect(newPart.green).toBe(DEFAULT_G);
		expect(newPart.blue).toBe(DEFAULT_B);
	});
});

// --- L5: Center on selection -------------------------------------------------

describe("Center on selection (sweep L5)", () => {
	it("centres the camera on a selected part's centroid × scale", () => {
		const core = coreWith([new Circle(7, -4, 1)]);
		const id = core.getState().parts[0].id;
		core.dispatch({ type: "select", partIds: [id] });
		const scale = core.getState().camera.scale;

		core.dispatch({ type: "centerOnSelection" });
		expect(core.getState().camera.offsetX).toBe(7 * scale);
		expect(core.getState().camera.offsetY).toBe(-4 * scale);
	});

	it("is a no-op when nothing is selected", () => {
		const core = coreWith([new Circle(7, -4, 1)]);
		const before = { ...core.getState().camera };
		core.dispatch({ type: "clearSelection" });
		core.dispatch({ type: "centerOnSelection" });
		expect(core.getState().camera).toEqual(before);
	});
});
