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
import { Rectangle } from "../src/Parts/Rectangle";
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
		const st = dest.getState();
		expect(st.parts.filter((p) => p.type === "Rectangle").length).toBe(1);
		expect(st.sim.phase).toBe("running");

		// The imported body exists and playback advances without throwing.
		const rectPart = st.parts.find((p) => p.type === "Rectangle") as Rectangle;
		expect(rectPart.GetBody()).toBeTruthy();
		dest.dispatch({ type: "step", frames: 10 });
		expect((dest.getState().parts.find((p) => p.type === "Rectangle") as Rectangle).GetBody()).toBeTruthy();
	});
});
