// IB3 replay PLAYBACK: an IncrediBots 3 replay carries the recorded run
// (syncPoints/keyPresses/cameraMovements after the design metadata). The
// importer reads those into per-shape trajectories and plays them back sim-free
// (bodies driven from sync points). IB3 records one body pose per saved-parts
// index; playback compacts those into this app's live body order at play time.

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { GameCore } from "../src/core/GameCore";
import { ShapePart } from "../src/Parts/ShapePart";
import { decodeIB3 } from "../src/core/ib3Import";

const CODE = "part-examples/carrier-replay.txt";

describe("IB3 replay playback", () => {
	it.runIf(existsSync(CODE))("decodes the recorded run into per-shape trajectories", async () => {
		const code = readFileSync(CODE, "utf8").trim();
		const res = await decodeIB3(code);
		expect(res.replay).toBeTruthy();
		const rep = res.replay!;
		expect(rep.syncFrames.length).toBeGreaterThan(1);
		expect(rep.numFrames).toBeGreaterThan(0);
		// A track exists for the mapped shapes, and at least one shape actually moved
		// across the recording (the recorded run isn't all placeholders).
		let anyMotion = false;
		for (const tr of rep.trajectories.values()) {
			const a = tr.positions[0];
			const b = tr.positions[tr.positions.length - 1];
			if (a && b && Math.hypot(b.x - a.x, b.y - a.y) > 0.5) {
				anyMotion = true;
				break;
			}
		}
		expect(anyMotion).toBe(true);
	});

	it.runIf(existsSync(CODE))("plays back: bodies follow the recorded motion", async () => {
		const core = new GameCore();
		const code = readFileSync(CODE, "utf8").trim();
		await core.importReplay(code);

		const st = core.getState();
		expect(st.sim.phase).toBe("running");

		// Capture the start pose of every dynamic robot body.
		const bodies = st.parts.filter(
			(p): p is ShapePart => p instanceof ShapePart && !p.isStatic && !!p.GetBody(),
		);
		expect(bodies.length).toBeGreaterThan(0);
		const start = bodies.map((p) => {
			const q = p.GetBody()!.GetPosition();
			return { x: q.x, y: q.y };
		});

		// Advance well into the replay (sim-free: bodies are hard-set/interpolated
		// from the recorded sync points, so no physics divergence).
		for (let i = 0; i < 300; i++) core.dispatch({ type: "step", frames: 1 });

		let maxMoved = 0;
		bodies.forEach((p, i) => {
			const q = p.GetBody()!.GetPosition();
			maxMoved = Math.max(maxMoved, Math.hypot(q.x - start[i].x, q.y - start[i].y));
		});
		// The recorded run moved at least one body appreciably — playback reproduced it.
		expect(maxMoved).toBeGreaterThan(0.5);
	});

	it.runIf(existsSync(CODE))("a normal Play after a replay runs the live sim, not the stale replay", async () => {
		const core = new GameCore();
		const code = readFileSync(CODE, "utf8").trim();
		// Start an IB3 replay (sets an internal replay session), then reset to editing.
		await core.importReplay(code);
		expect(core.getState().replay.playing).toBe(true);
		core.dispatch({ type: "reset" });

		// A normal Play must clear the lingering replay session and run the LIVE sim —
		// not drive the robot from the stale sync-point stream (which crashed in
		// syncReplay reading positions[i].x on a mismatched body list).
		expect(() => core.dispatch({ type: "play" })).not.toThrow();
		const st = core.getState();
		expect(st.sim.phase).toBe("running");
		expect(st.replay.playing).toBe(false); // live sim, not replay playback
		// Stepping the live sim must not throw either.
		expect(() => core.dispatch({ type: "step", frames: 5 })).not.toThrow();
	});
});
