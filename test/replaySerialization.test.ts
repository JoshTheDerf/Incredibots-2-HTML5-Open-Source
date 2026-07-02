// CHARACTERIZATION — replay byte-format export/import (Database.ExportReplay /
// ImportReplay + PutReplayIntoByteArray / ExtractReplayFromByteArray). Pins the
// legacy-interop byte format ported in src/core/replaySerialization.ts:
//   - encode(ReplayData) -> base64(zlib(replayLen/robotLen wrapper))
//   - decode(string) -> { replay, robot } round-trips the three streams
//   - the +Infinity camera sentinel survives (WriteFloat 127,127 <-> +Infinity)
//   - the compressed export string carries the replayLen/robotLen header ints.

import { describe, expect, it } from "vitest";
import { deflateSync, inflateSync } from "zlib";
import { encodeReplay, decodeReplay } from "../src/core/replaySerialization";
import { VERSION_STRING_FOR_REPLAYS, type ReplayData } from "../src/core/replay";
import { Rectangle } from "../src/Parts/Rectangle";

function sampleReplay(): ReplayData {
	return {
		cameraMovements: [
			// The first movement is the +Infinity "keep current pan" sentinel.
			{ frame: 0, x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY, scale: 30 },
			{ frame: 3, x: 120, y: -40, scale: 30 },
		],
		syncPoints: [
			{ frame: 0, positions: [{ x: 1.5, y: 2.25 }], angles: [0.5], cannonballPositions: [] },
			{ frame: 3, positions: [{ x: 1.75, y: 3.0 }], angles: [0.6], cannonballPositions: [{ x: 5, y: 6 }] },
		],
		keyPresses: [{ frame: 2, key: 32 }],
		numFrames: 6,
		version: VERSION_STRING_FOR_REPLAYS,
	};
}

describe("replay byte-format encode/decode round-trip", () => {
	it("round-trips the three streams + version + numFrames", async () => {
		const original = sampleReplay();
		const str = await encodeReplay(original);
		const { replay } = await decodeReplay(str);

		expect(replay.version).toBe(VERSION_STRING_FOR_REPLAYS);
		expect(replay.numFrames).toBe(6);
		expect(replay.keyPresses).toEqual([{ frame: 2, key: 32 }]);
		// Camera movements: frames + scale preserved.
		expect(replay.cameraMovements.map((m) => m.frame)).toEqual([0, 3]);
		expect(replay.cameraMovements[1].scale).toBeCloseTo(30, 5);
	});

	it("preserves the +Infinity camera sentinel through the byte format", async () => {
		const original = sampleReplay();
		const { replay } = await decodeReplay(await encodeReplay(original));
		expect(replay.cameraMovements[0].x).toBe(Number.POSITIVE_INFINITY);
		expect(replay.cameraMovements[0].y).toBe(Number.POSITIVE_INFINITY);
		// The second (real) movement decodes to its stored offsets (x/100 -> *100).
		expect(replay.cameraMovements[1].x).toBeCloseTo(120, 1);
		expect(replay.cameraMovements[1].y).toBeCloseTo(-40, 1);
	});

	it("preserves sync-point positions/angles and cannonball positions", async () => {
		const original = sampleReplay();
		const { replay } = await decodeReplay(await encodeReplay(original));
		expect(replay.syncPoints.length).toBe(2);
		// Positions are quantized by WriteFloat (2 decimal places), so compare loosely.
		expect(replay.syncPoints[0].positions[0].x).toBeCloseTo(1.5, 1);
		expect(replay.syncPoints[0].positions[0].y).toBeCloseTo(2.25, 1);
		expect(replay.syncPoints[1].cannonballPositions.length).toBe(1);
		expect(replay.syncPoints[1].cannonballPositions[0].x).toBeCloseTo(5, 1);
		expect(replay.syncPoints[1].cannonballPositions[0].y).toBeCloseTo(6, 1);
	});

	it("writes the replayLen/robotLen header ints at the head of the uncompressed export", async () => {
		const str = await encodeReplay(sampleReplay());
		// The export is base64(zlib(wrapper)); the wrapper begins with two 4-byte
		// big-endian ints (replayDataLength, robotDataLength) — matching
		// Database.ExportReplay's exportData.writeInt(...).
		const buf = inflateSync(Buffer.from(str, "base64"));
		const replayLen = buf.readInt32BE(0);
		const robotLen = buf.readInt32BE(4);
		expect(replayLen).toBeGreaterThan(0);
		expect(robotLen).toBeGreaterThan(0);
		// The two compressed halves + the two length ints fit within the buffer.
		expect(8 + replayLen + robotLen).toBeLessThanOrEqual(buf.length);
		// Each half is itself a valid zlib stream (they were compressed separately).
		expect(() => inflateSync(buf.subarray(8, 8 + replayLen))).not.toThrow();
	});

	it("bundles and recovers a robot alongside the replay", async () => {
		const rect = new Rectangle(0, 0, 2, 2);
		rect.id = 1;
		const str = await encodeReplay(sampleReplay(), { parts: [rect] });
		const { robot } = await decodeReplay(str);
		// One shape part comes back (drawAnyway shapes are stored).
		expect(robot.parts.length).toBe(1);
	});

	// Guard against silent zlib-level drift: a re-encode of the decoded replay
	// must itself decode to the same logical replay (idempotent through bytes).
	it("is idempotent across a second encode/decode", async () => {
		const once = await decodeReplay(await encodeReplay(sampleReplay()));
		const twice = await decodeReplay(await encodeReplay(once.replay));
		expect(twice.replay.numFrames).toBe(once.replay.numFrames);
		expect(twice.replay.version).toBe(once.replay.version);
		expect(twice.replay.cameraMovements[0].x).toBe(Number.POSITIVE_INFINITY);
		void deflateSync; // (import kept for symmetry with inflate use above)
	});
});
