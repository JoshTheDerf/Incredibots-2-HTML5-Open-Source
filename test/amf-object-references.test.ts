// Regression: AMF3 object reference-table integrity in ByteArray.readObject.
//
// Two decoder bugs corrupted back-reference resolution for real Flash-written
// IB3 files (whose joints store part1/part2 as object references to shapes
// already in the parts array):
//   1. kObjectType pushed a fresh {} onto the reference table BEFORE checking
//      whether the value was itself a reference, so every reference added a
//      spurious entry and shifted all later indices.
//   2. kArrayType never added the array to the reference table at all, so an
//      object reference following an array resolved to the wrong slot.
// Either one made a referenced shape decode as a stray {x,y}/[] object, which
// dropped the part ("unknown part type undefined") and detached its joints
// ("a joint referenced a missing/unmapped part") — a robot fell apart on import.

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { ByteArray } from "../src/General/ByteArray";
import { decodeIB3 } from "../src/core/ib3Import";
import { replayCodeIsIB3 } from "../src/core/replaySerialization";
import { JointPart } from "../src/Parts/JointPart";
import { ShapePart } from "../src/Parts/ShapePart";

describe("AMF3 object reference table", () => {
	it("a repeated object resolves to the SAME instance with correct values (kObjectType)", () => {
		const shared = { name: "Rectangle", px: 5, py: 6 };
		const arr = [shared, { name: "Circle", px: 1 }, shared];
		const b = new ByteArray();
		b.writeObject(arr);
		b.position = 0;
		const out = b.readObject() as Array<{ name: string; px: number }>;
		expect(out.length).toBe(3);
		expect(out[0].name).toBe("Rectangle");
		// The back-reference must resolve to the first instance — not a stray {}.
		expect(out[2]).toBe(out[0]);
		expect(out[2].px).toBe(5);
	});

	it("a nested array occupies a reference slot, so a later object back-ref still resolves (kArrayType)", () => {
		const objA = { name: "A", v: 1 };
		const inner = [10, 20, 30];
		// objA appears twice (second is a back-ref). The inner array sits between
		// them in the reference table; if arrays aren't registered, objA's ref
		// index is off by one and resolves to the wrong value.
		const arr = [objA, inner, objA];
		const b = new ByteArray();
		b.writeObject(arr);
		b.position = 0;
		const out = b.readObject() as unknown[];
		expect(out.length).toBe(3);
		expect(out[2]).toBe(out[0]);
		expect((out[0] as { name: string }).name).toBe("A");
		expect(out[1]).toEqual([10, 20, 30]);
	});

	// The real IB3 "aircraft carrier" example, when present, must import with no
	// warnings and every joint attached (no split / un-jointed parts).
	const CARRIER = "part-examples/carrier.txt";
	it.runIf(existsSync(CARRIER))("imports the carrier example fully jointed, no warnings", async () => {
		const code = readFileSync(CARRIER, "utf8").trim();
		const res = await decodeIB3(code);
		expect(res.warnings).toEqual([]);
		const parts = res.robot.parts;
		const shapes = parts.filter((p) => p instanceof ShapePart).length;
		const joints = parts.filter((p) => p instanceof JointPart).length;
		// Every part decodes (no reference resolved to a stray object) and every
		// joint attaches to two real shapes (none skipped as missing/unmapped).
		expect(shapes).toBeGreaterThan(150);
		expect(joints).toBeGreaterThan(90);
	});

	// An IB3 replay is an IB3 file (version-string-first), NOT the IB2
	// replayLength/robotLength format. It must be detected so the replay-import
	// path routes it to the IB3/robot importer (imports the bundled design) rather
	// than feeding it to the IB2 replay decoder, which reads the version bytes as
	// garbage section lengths and throws "corrupt replay".
	const REPLAY = "part-examples/carrier-replay.txt";
	it.runIf(existsSync(REPLAY))("detects an IB3 replay code and imports it as a design", async () => {
		const code = readFileSync(REPLAY, "utf8").trim();
		expect(await replayCodeIsIB3(code)).toBe(true);
		const res = await decodeIB3(code);
		expect(res.ib3.type).toBe(1); // IB3_TYPE_REPLAY
		expect(res.robot.parts.length).toBeGreaterThan(150);
	});
});
