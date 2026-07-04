// P1.5b-2b — user-facing physics-engine selection wired through GameCore.
//
// Proves the ACTIVE backend is chosen from a design's sandbox.physicsEngine at
// play/world-creation time (not from the module-global default), reset on
// teardown so nothing leaks between sessions, and that a replay records the
// engine it ran under + plays back on the SAME engine.

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import type { Part } from "../src/Parts/Part";
import { Rectangle } from "../src/Parts/Rectangle";
import {
	getPhysicsBackend,
	registerEngine2Backend,
	setPhysicsBackend,
} from "../src/Parts/partGlobals";
import { Box2D20Backend, Box2D21Backend, box2d20Backend } from "../src/core/physics";
import { Box2D3Backend } from "../src/enginebox2d3/Box2D3Backend";
import { BOX2D3_WASM_VERSION, loadBox2D3 } from "../src/enginebox2d3/loadBox2D3";
import { encodeReplay, decodeReplay } from "../src/core/replaySerialization";
import type { ReplayData } from "../src/core/replay";

/** A GameCore over `parts` with the sandbox pinned to `engine`. */
function coreWith(parts: Part[], engine: number): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	state.sandbox = { ...state.sandbox, physicsEngine: engine };
	return new GameCore(state);
}

function fallingBox(): Part[] {
	const ground = new Rectangle(-4, 10, 8, 2);
	ground.isStatic = true;
	return [ground, new Rectangle(0, 0, 2, 2)];
}

describe("GameCore selects the physics backend from sandbox.physicsEngine", () => {
	// The seam is a module-global; always leave it at the engine-0 default and
	// clear any registered engine-2 backend so tests don't cross-contaminate.
	afterEach(() => {
		setPhysicsBackend(box2d20Backend);
		registerEngine2Backend(null);
	});

	it("engine 0 plays on Box2D20Backend", () => {
		const core = coreWith(fallingBox(), 0);
		core.dispatch({ type: "play" });
		expect(getPhysicsBackend()).toBeInstanceOf(Box2D20Backend);
		core.dispatch({ type: "step", frames: 5 });
		expect(getPhysicsBackend()).toBeInstanceOf(Box2D20Backend);
	});

	it("engine 1 plays on Box2D21Backend", () => {
		const core = coreWith(fallingBox(), 1);
		core.dispatch({ type: "play" });
		expect(getPhysicsBackend()).toBeInstanceOf(Box2D21Backend);
	});

	it("engine 2 falls back to Box2D21Backend with a notice when no backend is registered", () => {
		const core = coreWith(fallingBox(), 2);
		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));
		core.dispatch({ type: "play" });
		expect(getPhysicsBackend()).toBeInstanceOf(Box2D21Backend);
		expect(messages.some((m) => /Box2D 3/.test(m))).toBe(true);
	});

	it("resets to the engine-0 backend on teardown so it does not leak", () => {
		const core = coreWith(fallingBox(), 1);
		core.dispatch({ type: "play" });
		expect(getPhysicsBackend()).toBeInstanceOf(Box2D21Backend);
		core.dispatch({ type: "reset" });
		expect(getPhysicsBackend()).toBeInstanceOf(Box2D20Backend);
	});

	it("takes effect on the NEXT play after setSandboxSettings changes the engine", () => {
		const core = coreWith(fallingBox(), 0);
		core.dispatch({ type: "play" });
		expect(getPhysicsBackend()).toBeInstanceOf(Box2D20Backend);
		core.dispatch({ type: "reset" });
		core.dispatch({
			type: "setSandboxSettings",
			gravity: 15,
			size: 0,
			terrainType: 0,
			terrainTheme: 0,
			background: 0,
			backgroundR: 0,
			backgroundG: 0,
			backgroundB: 0,
			physicsEngine: 1,
		});
		expect(core.getState().sandbox.physicsEngine).toBe(1);
		core.dispatch({ type: "play" });
		expect(getPhysicsBackend()).toBeInstanceOf(Box2D21Backend);
	});
});

// E3-4: the UI-side injection seam — a preloaded engine-2 (Box2D v3) backend is
// registered via registerEngine2Backend, and applyPlayBackend selects it for
// engine 2 (instead of falling back to 1). Loads the real wasm in beforeAll,
// mirroring how the UI preloads it.
describe("GameCore uses a registered engine-2 (Box2D v3) backend", () => {
	let backend: Box2D3Backend;
	beforeAll(async () => {
		backend = new Box2D3Backend(await loadBox2D3());
	});
	afterEach(() => {
		setPhysicsBackend(box2d20Backend);
		registerEngine2Backend(null);
	});

	it("selects the registered engine-2 backend for engine 2 (no fallback notice)", () => {
		registerEngine2Backend(backend as never, BOX2D3_WASM_VERSION);
		const core = coreWith(fallingBox(), 2);
		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));
		core.dispatch({ type: "play" });
		expect(getPhysicsBackend()).toBeInstanceOf(Box2D3Backend);
		expect(messages.some((m) => /still loading/.test(m))).toBe(false);
	});

	it("records engine 2 + the box2d3-wasm version into the replay", () => {
		registerEngine2Backend(backend as never, BOX2D3_WASM_VERSION);
		const core = coreWith(fallingBox(), 2);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 4 });
		const data = core.exportReplay() as ReplayData;
		expect(data.physicsEngine).toBe(2);
		expect(data.physicsEngineVersion).toBe(BOX2D3_WASM_VERSION);
	});

	it("falls back to engine 1 when engine 2 is requested but not registered", () => {
		// (registry cleared by afterEach of the previous test)
		const core = coreWith(fallingBox(), 2);
		core.dispatch({ type: "play" });
		expect(getPhysicsBackend()).toBeInstanceOf(Box2D21Backend);
	});

	it("warns on playback when the replay's box2d3-wasm version differs", () => {
		registerEngine2Backend(backend as never, BOX2D3_WASM_VERSION);
		const core = coreWith(fallingBox(), 0);
		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));
		const replay: ReplayData = {
			cameraMovements: [{ frame: 0, x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY, scale: 30 }],
			keyPresses: [],
			syncPoints: [],
			numFrames: 4,
			version: "0.03",
			physicsEngine: 2,
			physicsEngineVersion: "0.0.0-old",
		};
		core.dispatch({ type: "playReplay", data: replay });
		expect(getPhysicsBackend()).toBeInstanceOf(Box2D3Backend);
		expect(messages.some((m) => /Playback may differ/.test(m))).toBe(true);
	});
});

describe("replays record + restore the physics engine", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	it("a recording exports the engine it ran under (1)", () => {
		const core = coreWith(fallingBox(), 1);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 6 });
		const data = core.exportReplay();
		expect(data).not.toBeNull();
		expect((data as ReplayData).physicsEngine).toBe(1);
	});

	it("physicsEngine round-trips through the export string; legacy replays default to 0", async () => {
		const base: ReplayData = {
			cameraMovements: [{ frame: 0, x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY, scale: 30 }],
			keyPresses: [{ frame: 2, key: 65 }],
			syncPoints: [],
			numFrames: 3,
			version: "0.03",
			physicsEngine: 1,
		};
		const decoded = await decodeReplay(await encodeReplay(base));
		expect(decoded.replay.physicsEngine).toBe(1);

		// A replay encoded WITHOUT the engine field reads back as 0 (CE/Jaybit legacy).
		const { physicsEngine, ...legacy } = base;
		void physicsEngine;
		const decodedLegacy = await decodeReplay(await encodeReplay(legacy as ReplayData));
		expect(decodedLegacy.replay.physicsEngine).toBe(0);
	});

	it("engine 2 pins the box2d3-wasm version; it round-trips and is absent for 0/1", async () => {
		const base: ReplayData = {
			cameraMovements: [{ frame: 0, x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY, scale: 30 }],
			keyPresses: [{ frame: 1, key: 65 }],
			syncPoints: [],
			numFrames: 2,
			version: "0.03",
			physicsEngine: 2,
			physicsEngineVersion: "5.2.0",
		};
		const decoded = await decodeReplay(await encodeReplay(base));
		expect(decoded.replay.physicsEngine).toBe(2);
		expect(decoded.replay.physicsEngineVersion).toBe("5.2.0");

		// Engines 0/1 write no version -> undefined on read-back (stream unchanged).
		const e1 = await decodeReplay(await encodeReplay({ ...base, physicsEngine: 1, physicsEngineVersion: undefined }));
		expect(e1.replay.physicsEngine).toBe(1);
		expect(e1.replay.physicsEngineVersion).toBeUndefined();
	});

	it("playback runs on the engine the replay recorded (1)", () => {
		const core = coreWith(fallingBox(), 0);
		const replay: ReplayData = {
			cameraMovements: [{ frame: 0, x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY, scale: 30 }],
			keyPresses: [],
			syncPoints: [],
			numFrames: 4,
			version: "0.03",
			physicsEngine: 1,
		};
		core.dispatch({ type: "playReplay", data: replay });
		// Even though the sandbox is engine 0, the replay pins engine 1.
		expect(getPhysicsBackend()).toBeInstanceOf(Box2D21Backend);
	});
});
