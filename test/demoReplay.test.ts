// CHARACTERIZATION — the built-in main-menu DEMO replay.
//
// The legacy main menu (ControllerMainMenu.LoadReplay, ControllerMainMenu.ts:
// 443-457) plays a looping demo replay of a robot driving over terrain. It loads
// two RAW zlib-compressed asset blobs — resource/replay.dat + resource/robot.dat
// — and feeds them DIRECTLY into ExtractReplayFromByteArray /
// ExtractRobotFromByteArray (no base64 export-string header, unlike ImportReplay
// /ImportRobot). This pins that the node-clean raw decoder + GameCore.loadDemoReplay
// reproduce that path: the blobs decode without throwing AND produce a non-empty
// robot the replay can animate.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { decodeDemoReplay } from "../src/core/replaySerialization";

function assetBytes(name: string): Uint8Array {
	const url = new URL(`../resource/${name}`, import.meta.url);
	return new Uint8Array(readFileSync(fileURLToPath(url)));
}

const replayBytes = assetBytes("replay.dat");
const robotBytes = assetBytes("robot.dat");

describe("demo replay decode (raw .dat path)", () => {
	it("decodes replay.dat + robot.dat without throwing", async () => {
		await expect(decodeDemoReplay(replayBytes, robotBytes)).resolves.toBeDefined();
	});

	it("produces a non-empty robot with recorded motion", async () => {
		const { replay, robot } = await decodeDemoReplay(replayBytes, robotBytes);
		expect(robot.parts.length).toBeGreaterThan(0);
		expect(replay.syncPoints.length).toBeGreaterThan(0);
		expect(replay.numFrames).toBeGreaterThan(0);
	});
});

describe("GameCore.loadDemoReplay", () => {
	it("seeds the robot parts and enters sim-free replay playback", async () => {
		const core = new GameCore(createInitialState());
		await core.loadDemoReplay(replayBytes, robotBytes);
		const state = core.getState();
		expect(state.parts.length).toBeGreaterThan(0);
		// playReplay enters the running phase (sim-free playback), not editing.
		expect(state.sim.phase).toBe("running");
		expect(state.replay.finished).toBe(false);
	});

	it("advances playback frame-by-frame and eventually finishes (loopable)", async () => {
		const core = new GameCore(createInitialState());
		await core.loadDemoReplay(replayBytes, robotBytes);
		const numFrames = core.getState().replay.numFrames ?? 0;
		expect(numFrames).toBeGreaterThan(0);
		// Step past the end; playback should mark finished so the UI can loop.
		for (let i = 0; i < numFrames + 10; i++) core.dispatch({ type: "step" });
		expect(core.getState().replay.finished).toBe(true);
		// viewReplayAgain restarts a finished replay (the menu's loop).
		core.dispatch({ type: "viewReplayAgain" });
		expect(core.getState().replay.finished).toBe(false);
	});
});
