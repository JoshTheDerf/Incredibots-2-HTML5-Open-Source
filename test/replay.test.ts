// CHARACTERIZATION — deterministic replay record + playback.
//
// Pins the replay determinism contract (docs/PORT-SPEC-tutorials-replays.md §B,
// src/core/replay.ts): recording captures sync points every REPLAY_SYNC_FRAMES
// during a normal sim; playback is sim-FREE and reconstructs the trajectory by
// hard-setting bodies at sync frames + natural-cubic-spline interpolation
// between them. A short recorded sim, played back, must retrace the SAME motion.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Rectangle } from "../src/Parts/Rectangle";
import type { Part } from "../src/Parts/Part";
import {
	REPLAY_SYNC_FRAMES,
	VERSION_STRING_FOR_REPLAYS,
	computeReplaySplines,
	createReplaySession,
	replayUpdate,
	type ReplaySyncPoint,
} from "../src/core/replay";

function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

function fallingRect(): { core: GameCore; rect: Rectangle } {
	const rect = new Rectangle(0, 0, 2, 2);
	const core = coreWith([rect]);
	return { core, rect };
}

function bodyPos(rect: Rectangle): { x: number; y: number } {
	const b = rect.GetBody()!;
	const p = b.GetPosition();
	return { x: p.x, y: p.y };
}

describe("replay recording", () => {
	it("seeds the first camera movement with the +Infinity 'keep current pan' sentinel", () => {
		const { core } = fallingRect();
		core.dispatch({ type: "play" });
		const replay = core.exportReplay()!;
		expect(replay.cameraMovements.length).toBeGreaterThanOrEqual(1);
		expect(replay.cameraMovements[0].frame).toBe(0);
		expect(replay.cameraMovements[0].x).toBe(Number.POSITIVE_INFINITY);
		expect(replay.cameraMovements[0].y).toBe(Number.POSITIVE_INFINITY);
	});

	it("captures a sync point every REPLAY_SYNC_FRAMES frames (3), before each stepped frame", () => {
		const { core } = fallingRect();
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 9 });
		const replay = core.exportReplay()!;
		// Sync at frames 0,3,6 (captured BEFORE stepping frame 0/3/6). Frame 9's
		// sync is only captured when frame 9 is stepped.
		const frames = replay.syncPoints.map((s) => s.frame);
		expect(frames).toEqual([0, 3, 6]);
		expect(REPLAY_SYNC_FRAMES).toBe(3);
	});

	it("tags the finalized replay with the replay version string 0.03", () => {
		const { core } = fallingRect();
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 6 });
		const replay = core.exportReplay()!;
		expect(replay.version).toBe(VERSION_STRING_FOR_REPLAYS);
		expect(replay.version).toBe("0.03");
		expect(replay.numFrames).toBe(6);
	});

	it("records a text-display / cannon-fire key only for matching parts", () => {
		const { core } = fallingRect();
		core.dispatch({ type: "play" });
		// A rect has no displayKey/fireKey, so a key press is not recorded.
		core.dispatch({ type: "replayKey", key: 32 });
		const replay = core.exportReplay()!;
		expect(replay.keyPresses.length).toBe(0);
	});
});

describe("replay playback retraces the recorded motion (sim-FREE)", () => {
	it("hard-sets bodies at sync frames to the exact recorded pose", () => {
		// Record a short falling-rect sim, keeping the per-sync-frame poses.
		const rec = fallingRect();
		rec.core.dispatch({ type: "play" });
		const posByFrame = new Map<number, { x: number; y: number }>();
		for (let f = 0; f < 12; f++) {
			// Read pose at the START of frame f (before stepping) to match AddSyncPoint,
			// which captures at frame f % 3 == 0 BEFORE the step.
			if (f % REPLAY_SYNC_FRAMES === 0) posByFrame.set(f, bodyPos(rec.rect));
			rec.core.dispatch({ type: "step", frames: 1 });
		}
		const replay = rec.core.exportReplay()!;

		// Fresh core with the SAME rect setup; play back the replay.
		const play = fallingRect();
		play.core.dispatch({ type: "playReplay", data: replay });
		// Step to each sync frame and assert the body is hard-set to the recorded pose.
		for (const sp of replay.syncPoints) {
			// Advance until sim.frame == sp.frame (playback drives one frame per step).
			while (play.core.getState().sim.frame < sp.frame) {
				play.core.dispatch({ type: "step", frames: 1 });
			}
			// The applyReplayFrame for sp.frame runs at the start of the NEXT step;
			// step once so frame sp.frame's sync is applied.
			play.core.dispatch({ type: "step", frames: 1 });
			const after = bodyPos(play.rect);
			expect(after.x).toBeCloseTo(sp.positions[0].x, 6);
			expect(after.y).toBeCloseTo(sp.positions[0].y, 6);
		}
	});

	it("full playback retraces the recorded trajectory within spline tolerance every frame", () => {
		// Record a longer falling+settling sim and remember the body pose at the
		// START of every frame (the pose playback should reconstruct at that frame).
		const rec = fallingRect();
		rec.core.dispatch({ type: "play" });
		const recorded: { x: number; y: number }[] = [];
		const N = 30;
		for (let f = 0; f < N; f++) {
			recorded.push(bodyPos(rec.rect));
			rec.core.dispatch({ type: "step", frames: 1 });
		}
		const replay = rec.core.exportReplay()!;

		// Play it back and compare each frame's reconstructed pose. Between sync
		// points the cubic spline approximates the sim; at sync frames it is exact.
		// Only the range up to the LAST sync frame is meaningfully reconstructed —
		// past it there is no next sync point, so bodies hold the last synced pose
		// (faithful to Replay.Update: once syncPointIndex hits the end, SyncReplay*
		// stops being called). This mirrors the legacy behaviour exactly.
		const lastSyncFrame = replay.syncPoints[replay.syncPoints.length - 1].frame;
		const play = fallingRect();
		play.core.dispatch({ type: "playReplay", data: replay });
		for (let f = 0; f < N; f++) {
			// applyReplayFrame(f) runs at the start of the step for logical frame f.
			play.core.dispatch({ type: "step", frames: 1 });
			if (f > lastSyncFrame) continue; // past the last sync point — pose frozen
			const got = bodyPos(play.rect);
			// Spline interpolation of a smooth free-fall is very close; a small
			// tolerance for the between-sync frames, exact (0) at sync frames.
			expect(Math.abs(got.y - recorded[f].y)).toBeLessThan(0.02);
			expect(Math.abs(got.x - recorded[f].x)).toBeLessThan(0.02);
		}
	});

	it("a full playback ends (finished) at numFrames and pauses", () => {
		const rec = fallingRect();
		rec.core.dispatch({ type: "play" });
		rec.core.dispatch({ type: "step", frames: 12 });
		const replay = rec.core.exportReplay()!;

		const play = fallingRect();
		play.core.dispatch({ type: "playReplay", data: replay });
		expect(play.core.getState().replay.playing).toBe(true);
		// Drive playback well past numFrames.
		play.core.dispatch({ type: "step", frames: 20 });
		expect(play.core.getState().replay.finished).toBe(true);
		expect(play.core.getState().sim.phase).toBe("paused");
	});

	it("playback does NOT step the physics world (bodies move only via sync/spline)", () => {
		// A replay with a single sync point holds bodies at that pose forever
		// (no interpolation target), proving the world isn't being simulated.
		const rec = fallingRect();
		rec.core.dispatch({ type: "play" });
		// Only frame 0's sync point exists (we don't step).
		const replay = rec.core.exportReplay()!;
		replay.numFrames = 5;
		expect(replay.syncPoints.length).toBe(0); // no steps -> no sync captured yet

		// With zero sync points the bodies are never moved by playback; assert the
		// rect stays at its start pose across playback frames (no gravity applied).
		const play = fallingRect();
		play.core.dispatch({ type: "playReplay", data: replay });
		const start = bodyPos(play.rect); // pose after the world is created, pre-step
		play.core.dispatch({ type: "step", frames: 5 });
		const end = bodyPos(play.rect);
		expect(end.x).toBeCloseTo(start.x, 6);
		expect(end.y).toBeCloseTo(start.y, 6);
	});
});

describe("natural-cubic-spline reconstruction (ComputeReplaySplines)", () => {
	// Build a hand-made sync-point set and assert the spline passes exactly
	// through each control point at its segment start (t=0 -> the A coefficient).
	function makeSyncPoints(): ReplaySyncPoint[] {
		const ys = [0, 1, 4, 9]; // one body, y = frame^2/... arbitrary rising values
		return ys.map((y, i) => ({
			frame: i * REPLAY_SYNC_FRAMES,
			positions: [{ x: i * 2, y }],
			angles: [0.1 * i],
			cannonballPositions: [],
		}));
	}

	it("segment A coefficients equal the sync-point values (spline interpolates the knots)", () => {
		const sp = makeSyncPoints();
		const splineY = computeReplaySplines(sp, 1); // type 1 = y
		// coeff[0] is A; A[segment][body] == syncPoints[segment].positions[body].y.
		for (let seg = 0; seg < sp.length - 1; seg++) {
			expect(splineY[0][seg][0]).toBeCloseTo(sp[seg].positions[0].y, 9);
		}
	});

	it("evaluating a segment's cubic at its full width reaches the next knot", () => {
		const sp = makeSyncPoints();
		const splineY = computeReplaySplines(sp, 1);
		for (let seg = 0; seg < sp.length - 1; seg++) {
			const t = sp[seg + 1].frame - sp[seg].frame; // segment width in frames
			const A = splineY[0][seg][0];
			const B = splineY[1][seg][0];
			const C = splineY[2][seg][0];
			const D = splineY[3][seg][0];
			const value = A + t * (B + t * (C + t * D));
			expect(value).toBeCloseTo(sp[seg + 1].positions[0].y, 6);
		}
	});

	it("angle unwrapping keeps small deltas (|delta|<=20) verbatim", () => {
		const sp = makeSyncPoints();
		const splineA = computeReplaySplines(sp, 2); // type 2 = angle
		// A coefficient == the raw angle at the knot (no unwrap for small deltas).
		for (let seg = 0; seg < sp.length - 1; seg++) {
			expect(splineA[0][seg][0]).toBeCloseTo(sp[seg].angles[0], 9);
		}
	});
});

describe("Replay.Update cursor mechanics (src/Game/Replay.ts)", () => {
	it("emits hard sync at/after a sync frame, interp between, and done at numFrames", () => {
		const sp: ReplaySyncPoint[] = [
			{ frame: 0, positions: [{ x: 0, y: 0 }], angles: [0], cannonballPositions: [] },
			{ frame: 3, positions: [{ x: 3, y: 3 }], angles: [0], cannonballPositions: [] },
		];
		const session = createReplaySession({
			cameraMovements: [],
			keyPresses: [{ frame: 1, key: 32 }],
			syncPoints: sp,
			numFrames: 3,
			version: "0.03",
		});
		// frame 0: hard sync to sp[0], cursor -> 1.
		let tick = replayUpdate(session, 0);
		expect(tick.sync?.kind).toBe("hard");
		// frame 1: between sp[0] and sp[1] -> interp; also fires the key at frame 1.
		// (Since the trigger wave, ReplayTick carries the full KeyPress records —
		// a record with partIndex is a TriggerPress routed to exactly one part.)
		tick = replayUpdate(session, 1);
		expect(tick.sync?.kind).toBe("interp");
		expect(tick.keyPresses).toEqual([{ frame: 1, key: 32 }]);
		// frame 3: hard sync to sp[1] and done (frame >= numFrames).
		tick = replayUpdate(session, 3);
		expect(tick.sync?.kind).toBe("hard");
		expect(tick.done).toBe(true);
	});
});
