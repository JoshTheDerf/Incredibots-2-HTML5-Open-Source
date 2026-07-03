// REGRESSION — "stale content on switch" (app-shell bug #1).
//
// The port keeps ONE long-lived GameCore across menu navigations, whereas the
// legacy client `new`-ed a fresh Controller for every mode switch. Each load
// entry point (loadTutorial / loadBuiltInChallenge / import / newSandbox) must
// therefore fully REPLACE the previous session's parts, challenge, tutorial,
// undo history, and running sim — otherwise "whatever was there last stays".
//
// These tests pin that fresh-controller reset at the core level:
//   - sandbox parts  -> loadTutorial      => only the tutorial's parts remain
//   - challenge A    -> challenge B        => only B's content remains
//   - tutorial       -> newSandbox         => a clean default sandbox
// plus the mid-run switch path (load while the previous mode is still playing),
// which used to silently no-op / early-return and leave the stale scene.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { getTutorialSetup } from "../src/core/tutorials";
import { Rectangle } from "../src/Parts/Rectangle";
import type { Part } from "../src/Parts/Part";

/** A GameCore whose sandbox also holds an editable robot part we can track. */
function sandboxCoreWithRobot(): { core: GameCore; robot: Part } {
	const state = createInitialState();
	const robot = new Rectangle(0, 0, 2, 2);
	robot.isEditable = true;
	robot.isSandbox = false;
	state.parts = [...state.parts, robot];
	state.parts.forEach((p, i) => (p.id = i + 1));
	return { core: new GameCore(state), robot };
}

describe("stale content on switch — full state replacement on load (bug #1)", () => {
	it("sandbox parts -> loadTutorial: only the tutorial's parts remain", () => {
		const { core, robot } = sandboxCoreWithRobot();
		core.dispatch({ type: "loadTutorial", levelIndex: 0 }); // Tank

		const parts = core.getState().parts;
		// The sandbox robot is gone; the parts are exactly the tutorial's baked scene.
		expect(parts).not.toContain(robot);
		expect(parts.length).toBe(getTutorialSetup(0).length);
		// Tutorial session is active; no leftover challenge.
		expect(core.getState().tutorial?.active).toBe(true);
		expect(core.getState().tutorial?.levelIndex).toBe(0);
		expect(core.getState().challenge).toBeNull();
	});

	it("scene-less tutorial replaces the sandbox with a fresh clean terrain", () => {
		const { core, robot } = sandboxCoreWithRobot();
		// Level 10 (Monkey Bars via the tutorial select) has no baked setup scene.
		expect(getTutorialSetup(10).length).toBe(0);
		core.dispatch({ type: "loadTutorial", levelIndex: 10 });

		const parts = core.getState().parts;
		// The stale robot is gone and only fresh terrain (all isSandbox) remains.
		expect(parts).not.toContain(robot);
		expect(parts.every((p) => (p as { isSandbox?: boolean }).isSandbox === true)).toBe(true);
	});

	it("challenge A -> challenge B: only B's content remains (no A parts bleed through)", () => {
		const core = new GameCore(createInitialState());

		core.dispatch({ type: "loadBuiltInChallenge", name: "climb" });
		const partsA = [...core.getState().parts];
		expect(partsA.length).toBeGreaterThan(0);
		expect(core.getState().challenge).not.toBeNull();

		core.dispatch({ type: "loadBuiltInChallenge", name: "monkeyBars" });
		const partsB = core.getState().parts;

		// None of challenge A's part instances survive into challenge B.
		for (const a of partsA) expect(partsB).not.toContain(a);
		// B matches a fresh, isolated monkeyBars load (no extra retained parts).
		const fresh = new GameCore(createInitialState());
		fresh.dispatch({ type: "loadBuiltInChallenge", name: "monkeyBars" });
		expect(partsB.length).toBe(fresh.getState().parts.length);
	});

	it("a leftover robot does not survive a built-in challenge load", () => {
		const { core, robot } = sandboxCoreWithRobot();
		core.dispatch({ type: "loadBuiltInChallenge", name: "climb" });
		expect(core.getState().parts).not.toContain(robot);
	});

	it("tutorial -> newSandbox: clean default sandbox (no tutorial / challenge / prefab)", () => {
		const core = new GameCore(createInitialState());
		core.dispatch({ type: "loadTutorial", levelIndex: 0 });
		expect(core.getState().tutorial?.active).toBe(true);
		const tankParts = core.getState().parts.length;

		core.dispatch({ type: "newSandbox" });
		const s = core.getState();

		expect(s.tutorial).toBeNull();
		expect(s.challenge).toBeNull();
		expect(s.sim.phase).toBe("editing");
		// Parts are just the default sandbox terrain — none of the Tank prefab.
		const fresh = createInitialState();
		expect(s.parts.length).toBe(fresh.parts.length);
		expect(s.parts.length).not.toBe(tankParts);
		// Default environment restored (grass/sky), history cleared.
		expect(s.sandbox.terrainTheme).toBe(fresh.sandbox.terrainTheme);
		expect(s.sandbox.background).toBe(fresh.sandbox.background);
		expect(s.edit.canUndo).toBe(false);
		expect(s.edit.canRedo).toBe(false);
	});

	it("loadTutorial clears an active challenge session", () => {
		const core = new GameCore(createInitialState());
		core.dispatch({ type: "loadBuiltInChallenge", name: "climb" });
		expect(core.getState().challenge).not.toBeNull();

		core.dispatch({ type: "loadTutorial", levelIndex: 0 });
		expect(core.getState().challenge).toBeNull();
		expect(core.getState().tutorial?.active).toBe(true);
	});

	it("switching challenges mid-play replaces the scene (no early-return no-op)", () => {
		const core = new GameCore(createInitialState());
		core.dispatch({ type: "loadBuiltInChallenge", name: "climb" });
		// Start the sim so we're no longer in the editing phase.
		core.dispatch({ type: "play" });
		expect(core.getState().sim.phase).not.toBe("editing");
		const partsA = [...core.getState().parts];

		// Loading a different challenge while running must still take effect.
		core.dispatch({ type: "loadBuiltInChallenge", name: "monkeyBars" });
		const s = core.getState();
		expect(s.sim.phase).toBe("editing"); // session reset dropped the running sim
		for (const a of partsA) expect(s.parts).not.toContain(a);
	});

	it("loadTutorial mid-play replaces the scene and resets the sim", () => {
		const { core, robot } = sandboxCoreWithRobot();
		core.dispatch({ type: "play" });
		expect(core.getState().sim.phase).not.toBe("editing");

		core.dispatch({ type: "loadTutorial", levelIndex: 0 });
		const s = core.getState();
		expect(s.sim.phase).toBe("editing");
		expect(s.parts).not.toContain(robot);
		expect(s.tutorial?.active).toBe(true);
	});
});
