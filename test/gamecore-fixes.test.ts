// CHARACTERIZATION — GameCore behavioural fixes (Bugs 4 & 5 + view flags + sound).
//
// Pins five behaviours ported from the legacy ControllerGame:
//   1. A SUCCESSFUL create reverts curAction to Select (Circle :2203 / Rectangle
//      :2227 / Triangle apex :2361 / Text :2500 / joints :6760 / thrusters :6825).
//      A REJECTED create (degenerate drag / no target) keeps the tool active, and
//      the two-step triangle keeps newTriangle after the base gesture.
//   2. File -> New Robot / Edit -> Clear All drop editable robot parts but keep
//      the sandbox terrain (ControllerGame.clearButton :4845).
//   3. View-menu display toggles + zoom flip the edit-view flags / camera.scale
//      (jointBox :5261 / colourBox :5271 / globalOutlineBox :5266 / centerBox
//      :5257 / Zoom :6705).
//   4. Sound events fire at the faithful sites (shapeCreated / jointCreated / won).

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Circle } from "../src/Parts/Circle";
import type { SoundEvent } from "../src/core";

/** A fresh core with the canonical sandbox terrain (createInitialState). */
function sandboxCore(): GameCore {
	return new GameCore(createInitialState());
}

/** ids of the isSandbox terrain parts (kept across a clear). */
function terrainIds(core: GameCore): number[] {
	return core
		.getState()
		.parts.filter((p) => (p as { isSandbox?: boolean }).isSandbox)
		.map((p) => p.id);
}

// --- FIX 1: create reverts to Select -----------------------------------------

describe("create-shape reverts to the Select tool on success (Bug 5)", () => {
	it("a successful circle create sets tool back to 'select'", () => {
		const core = sandboxCore();
		core.dispatch({ type: "setTool", tool: "newCircle" });
		// press (0,0) -> release (3,0): radius 3, a valid circle.
		core.dispatch({ type: "createShape", kind: "circle", x1: 0, y1: 0, x2: 3, y2: 0 });
		expect(core.getState().edit.tool).toBe("select");
	});

	it("a REJECTED (degenerate) circle create keeps the tool active", () => {
		const core = sandboxCore();
		core.dispatch({ type: "setTool", tool: "newCircle" });
		// press == release: radius 0, rejected — tool stays newCircle.
		core.dispatch({ type: "createShape", kind: "circle", x1: 0, y1: 0, x2: 0, y2: 0 });
		expect(core.getState().edit.tool).toBe("newCircle");
	});

	it("triangle: base gesture (no apex) keeps newTriangle; a valid apex reverts to select", () => {
		const core = sandboxCore();
		core.dispatch({ type: "setTool", tool: "newTriangle" });
		// Base only (no x3/y3): buildDraggedShape returns null -> rejected -> tool stays.
		core.dispatch({ type: "createShape", kind: "triangle", x1: 0, y1: 0, x2: 4, y2: 0 });
		expect(core.getState().edit.tool).toBe("newTriangle");

		// Now supply a valid apex making a well-formed triangle: reverts to select.
		core.dispatch({ type: "createShape", kind: "triangle", x1: 0, y1: 0, x2: 4, y2: 0, x3: 2, y3: 3 });
		expect(core.getState().edit.tool).toBe("select");
	});

	it("a successful text create reverts to select", () => {
		const core = sandboxCore();
		core.dispatch({ type: "setTool", tool: "newText" });
		core.dispatch({ type: "createText", x: 1, y: 1, text: "hi" });
		expect(core.getState().edit.tool).toBe("select");
	});
});

// --- FIX 2: New Robot / Clear All --------------------------------------------

describe("newRobot / clearAll drop robot parts but keep terrain (Bug 4)", () => {
	function coreWithRobot(): { core: GameCore; terrain: number[] } {
		const core = sandboxCore();
		const terrain = terrainIds(core);
		// Add a robot part via a create command.
		core.dispatch({ type: "createShape", kind: "circle", x1: 0, y1: 0, x2: 2, y2: 0 });
		expect(core.getState().parts.length).toBe(terrain.length + 1);
		return { core, terrain };
	}

	it("newRobot removes the editable robot part, keeps the terrain, resets tool + selection", () => {
		const { core, terrain } = coreWithRobot();
		core.dispatch({ type: "setTool", tool: "newCircle" });
		core.dispatch({ type: "newRobot" });
		const s = core.getState();
		// Only terrain survives (same count; all isSandbox).
		expect(s.parts.length).toBe(terrain.length);
		expect(s.parts.every((p) => (p as { isSandbox?: boolean }).isSandbox)).toBe(true);
		expect(s.edit.selection).toEqual([]);
		expect(s.edit.selectedPart).toBeNull();
		expect(s.edit.tool).toBe("select");
	});

	it("clearAll has the same effect and clears undo history", () => {
		const { core, terrain } = coreWithRobot();
		expect(core.getState().edit.canUndo).toBe(true);
		core.dispatch({ type: "clearAll" });
		const s = core.getState();
		expect(s.parts.length).toBe(terrain.length);
		expect(s.edit.canUndo).toBe(false);
		expect(s.edit.canRedo).toBe(false);
	});

	it("newRobot is a no-op during simulation (editing-phase only)", () => {
		const { core } = coreWithRobot();
		const before = core.getState().parts.length;
		core.dispatch({ type: "play" });
		core.dispatch({ type: "newRobot" });
		expect(core.getState().parts.length).toBe(before);
	});
});

// --- FIX 3: view flags + zoom -------------------------------------------------

describe("view-menu toggles + zoom (Bug 4 cont.)", () => {
	it("toggleShowJoints flips the state flag (default true -> false)", () => {
		const core = sandboxCore();
		expect(core.getState().edit.showJoints).toBe(true);
		core.dispatch({ type: "toggleShowJoints" });
		expect(core.getState().edit.showJoints).toBe(false);
		core.dispatch({ type: "toggleShowJoints" });
		expect(core.getState().edit.showJoints).toBe(true);
	});

	it("toggleShowColours / toggleShowOutlines / toggleSnapToCenter each flip their flag", () => {
		const core = sandboxCore();
		core.dispatch({ type: "toggleShowColours" });
		core.dispatch({ type: "toggleShowOutlines" });
		core.dispatch({ type: "toggleSnapToCenter" });
		const e = core.getState().edit;
		expect(e.showColours).toBe(false);
		expect(e.showOutlines).toBe(false);
		expect(e.snapToCenter).toBe(false);
	});

	it("zoomIn multiplies camera.scale by 4/3, zoomOut by 3/4 (Zoom :6705)", () => {
		const core = sandboxCore();
		const start = core.getState().camera.scale; // 30
		core.dispatch({ type: "zoomIn" });
		expect(core.getState().camera.scale).toBeCloseTo(start * (4 / 3), 6);
		core.dispatch({ type: "zoomOut" });
		expect(core.getState().camera.scale).toBeCloseTo(start, 6);
	});

	it("zoom clamps to [12, 75]", () => {
		const core = sandboxCore();
		for (let i = 0; i < 20; i++) core.dispatch({ type: "zoomIn" });
		expect(core.getState().camera.scale).toBe(75);
		for (let i = 0; i < 40; i++) core.dispatch({ type: "zoomOut" });
		expect(core.getState().camera.scale).toBe(12);
	});
});

// --- FIX 4: sound events ------------------------------------------------------

describe("core sound events (core -> UI channel)", () => {
	it("a successful shape create emits 'shapeCreated'", () => {
		const core = sandboxCore();
		const events: SoundEvent[] = [];
		core.onSound((e) => events.push(e));
		core.dispatch({ type: "createShape", kind: "circle", x1: 0, y1: 0, x2: 2, y2: 0 });
		expect(events).toContain("shapeCreated");
	});

	it("a rejected create emits nothing", () => {
		const core = sandboxCore();
		const events: SoundEvent[] = [];
		core.onSound((e) => events.push(e));
		core.dispatch({ type: "createShape", kind: "circle", x1: 0, y1: 0, x2: 0, y2: 0 });
		expect(events).toHaveLength(0);
	});

	it("onSound returns an unsubscribe that stops delivery", () => {
		const core = sandboxCore();
		const events: SoundEvent[] = [];
		const off = core.onSound((e) => events.push(e));
		off();
		core.dispatch({ type: "createShape", kind: "circle", x1: 0, y1: 0, x2: 2, y2: 0 });
		expect(events).toHaveLength(0);
	});

	it("winning a challenge emits 'won' (ControllerGame :751)", () => {
		// A single shape already inside a win box: the challenge is won on the first
		// stepped frame, so the step loop emits 'won'.
		const c = new Circle(5, 5, 1); // AABB (4,4)-(6,6)
		c.id = 100;
		const state = createInitialState();
		state.parts = [c];
		const core = new GameCore(state);

		core.dispatch({ type: "newChallenge" });
		core.dispatch({
			type: "addWinCondition",
			name: "InBox",
			subject: 0,
			object: 0,
			region: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
			shape1Id: c.id,
		});

		const events: SoundEvent[] = [];
		core.onSound((e) => events.push(e));
		core.dispatch({ type: "play" });
		// Advance frames; the win check runs inside the step loop.
		core.dispatch({ type: "step", frames: 5 });
		expect(events).toContain("won");
	});
});
