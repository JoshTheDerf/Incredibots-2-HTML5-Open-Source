// CHARACTERIZATION — replay import from a string loads the bundled robot.
//
// A replay export (Database.ExportReplay) bundles BOTH the recorded motion AND
// the robot it animates. importReplay must load that robot into the parts graph
// before playback — otherwise there is nothing to animate. This pins that the
// exported string round-trips into a fresh core: the robot appears and playback
// starts. (Regression guard for the bug where the decoded robot half was dropped.)

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { decodeReplay } from "../src/core/replaySerialization";
import { SIZE_SMALL, TERRAIN_BOX, TERRAIN_LAND } from "../src/core/sandboxEnvironment";
import { Circle } from "../src/Parts/Circle";
import { Cannon } from "../src/Parts/Cannon";
import { Rectangle } from "../src/Parts/Rectangle";
import { TRIGGER_FIRE } from "../src/Parts/partDefaults";
import type { Part } from "../src/Parts/Part";

function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

describe("importReplay round-trips the bundled robot into a fresh core", () => {
	it("loads the recorded robot and starts sim-free playback", async () => {
		// Record: a falling rectangle for enough frames to capture sync points.
		const rect = new Rectangle(0, 0, 2, 2);
		const src = coreWith([rect]);
		src.dispatch({ type: "play" });
		src.dispatch({ type: "step", frames: 30 });
		const str = await src.exportReplayString();
		expect(str).toBeTruthy();

		// Import into a FRESH, EMPTY core (no robot present).
		const dest = coreWith([]);
		expect(dest.getState().parts.length).toBe(0);
		await dest.importReplay(str as string);

		// The bundled robot is now in the parts graph and playback has started.
		// (The import also rebuilds the sandbox terrain from the BUNDLED settings,
		// so count only non-terrain rectangles.)
		const st = dest.getState();
		const isRobotRect = (p: Part) => p.type === "Rectangle" && !(p as { isSandbox?: boolean }).isSandbox;
		expect(st.parts.filter(isRobotRect).length).toBe(1);
		expect(st.sim.phase).toBe("running");

		// The imported body exists and playback advances without throwing.
		const rectPart = st.parts.find(isRobotRect) as Rectangle;
		expect(rectPart.GetBody()).toBeTruthy();
		dest.dispatch({ type: "step", frames: 10 });
		expect((dest.getState().parts.find(isRobotRect) as Rectangle).GetBody()).toBeTruthy();
	});
});

describe("importReplay applies the BUNDLED sandbox settings (Jaybit ControllerSandbox.settings = robot.settings)", () => {
	it("rebuilds the terrain from the recording's settings so a TriggerPress partIndex still routes to the cannon", async () => {
		// Source core: default SMALL LAND, switched to BOX terrain (4 terrain parts
		// vs LAND's 3 — a 1-part index shift that would break TriggerPress routing
		// if the import kept the destination's own terrain).
		const state = createInitialState();
		const ball = new Circle(0, 0, 0.5);
		ball.restitution = 30; // max bounce so the floor contact ENDS
		ball.triggerName = "c";
		ball.triggerAction = TRIGGER_FIRE;
		ball.onGroundHit = true;
		const cannon = new Cannon(20, 0, 1);
		cannon.isStatic = true;
		cannon.triggerList = "c";
		state.parts = [...state.parts, ball, cannon];
		const src = new GameCore(state);
		src.dispatch({
			type: "setSandboxSettings",
			gravity: 15,
			size: SIZE_SMALL,
			terrainType: TERRAIN_BOX,
			terrainTheme: 0,
			background: 0,
			backgroundR: 191,
			backgroundG: 220,
			backgroundB: 244,
		});
		expect(src.getState().parts.filter((p) => (p as { isSandbox?: boolean }).isSandbox).length).toBe(4);

		src.dispatch({ type: "play" });
		src.dispatch({ type: "step", frames: 180 });
		const srcCannonIndex = src.getState().parts.indexOf(src.getState().parts.find((p) => p instanceof Cannon)!);
		const str = await src.exportReplayString();
		expect(str).toBeTruthy();

		// The recording carries a TriggerPress at the cannon's play-time index.
		const decoded = await decodeReplay(str as string);
		const press = decoded.replay.keyPresses.find((kp) => kp.partIndex != null);
		expect(press).toBeDefined();
		expect(press!.partIndex).toBe(srcCannonIndex);

		// Import into a core with DIFFERENT (default Land) settings.
		const dest = new GameCore();
		expect(dest.getState().sandbox.terrainType).toBe(TERRAIN_LAND);
		await dest.importReplay(str as string);
		const st = dest.getState();
		// The bundled settings replaced the destination's: BOX terrain rebuilt.
		expect(st.sandbox.terrainType).toBe(TERRAIN_BOX);
		expect(st.sandbox.size).toBe(SIZE_SMALL);
		expect(st.parts.filter((p) => (p as { isSandbox?: boolean }).isSandbox).length).toBe(4);
		// ... so the recorded TriggerPress partIndex lands on the cannon again.
		expect(st.parts[press!.partIndex!]).toBeInstanceOf(Cannon);
	});
});
