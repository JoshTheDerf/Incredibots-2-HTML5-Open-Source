// CHARACTERIZATION — robot (de)serialization round-trip + legacy byte format.
//
// robotSerialization.ts is a faithful port of the pure part-array <-> ByteArray
// encoding in the legacy General/Database.ts. The exported string must be
// byte-compatible with the legacy game (base64(zlib-deflate(header + AMF3 parts
// + settings + 3 floats))) so bots interop. See robotSerialization.ts:14-21.

import { describe, expect, it } from "vitest";
import { encodeRobot, decodeRobot } from "../src/core/robotSerialization";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { Triangle } from "../src/Parts/Triangle";
import { Cannon } from "../src/Parts/Cannon";
import { Thrusters } from "../src/Parts/Thrusters";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { PrismaticJoint } from "../src/Parts/PrismaticJoint";
import { FixedJoint } from "../src/Parts/FixedJoint";
import { TextPart } from "../src/Parts/TextPart";
import type { Part } from "../src/Parts/Part";

/** Build a small, representative robot: two shapes + a joint + a thruster + text. */
function sampleRobot(): Part[] {
	const c = new Circle(1, 2, 1.5);
	c.red = 100;
	c.green = 150;
	c.blue = 200;
	c.opacity = 128;
	c.density = 22;
	c.collide = false;
	c.isStatic = true;
	c.outline = false;
	c.terrain = true;
	c.undragable = true;
	c.angle = 0.7;

	const r = new Rectangle(5, 5, 3, 2);

	const rj = new RevoluteJoint(c, r, 3, 3);
	rj.enableMotor = true;
	rj.motorStrength = 20;
	rj.motorSpeed = 25;
	rj.motorCWKey = 65;
	rj.motorCCWKey = 66;
	rj.autoCW = true;
	rj.isStiff = true;
	rj.motorLowerLimit = -1.2;
	rj.motorUpperLimit = 2.4;

	const t = new Thrusters(c, 1, 2);
	t.strength = 18;
	t.thrustKey = 87;
	t.autoOn = true;

	const tp = new TextPart(null, 8, 9, 4, 2, "hi there");
	tp.size = 20;
	tp.red = 11;
	tp.green = 22;
	tp.blue = 33;

	return [c, r, rj, t, tp];
}

describe("encodeRobot -> decodeRobot round-trip preserves geometry/props/counts", () => {
	it("preserves part count and per-type fields", async () => {
		const original = sampleRobot();
		const str = await encodeRobot(original);
		const decoded = await decodeRobot(str);

		expect(decoded.parts.length).toBe(original.length);

		// LEGACY REORDER (robotSerialization.ts:66-84, ported from Database
		// PutPartsIntoByteArray): all Shape/Text parts are written before all
		// joints/thrusters, so the decoded order is shapes+text first, then
		// joints/thrusters — NOT the input order. Input was
		// [Circle, Rect, RevoluteJoint, Thrusters, TextPart].
		const kinds = decoded.parts.map((p) => p.type);
		expect(kinds).toEqual(["Circle", "Rectangle", "TextPart", "RevoluteJoint", "Thrusters"]);

		const circ = decoded.parts[0] as Circle;
		expect(circ.centerX).toBeCloseTo(1, 6);
		expect(circ.centerY).toBeCloseTo(2, 6);
		expect(circ.radius).toBeCloseTo(1.5, 6);
		expect(circ.red).toBe(100);
		expect(circ.green).toBe(150);
		expect(circ.blue).toBe(200);
		expect(circ.opacity).toBe(128);
		expect(circ.density).toBe(22);
		expect(circ.collide).toBe(false);
		expect(circ.isStatic).toBe(true);
		expect(circ.outline).toBe(false);
		expect(circ.terrain).toBe(true);
		expect(circ.undragable).toBe(true);
		expect(circ.angle).toBeCloseTo(0.7, 6);

		const rj = decoded.parts[3] as RevoluteJoint;
		expect(rj.enableMotor).toBe(true);
		expect(rj.motorStrength).toBe(20);
		expect(rj.motorSpeed).toBe(25);
		expect(rj.motorCWKey).toBe(65);
		expect(rj.motorCCWKey).toBe(66);
		expect(rj.autoCW).toBe(true);
		expect(rj.isStiff).toBe(true);
		expect(rj.motorLowerLimit).toBeCloseTo(-1.2, 6);
		expect(rj.motorUpperLimit).toBeCloseTo(2.4, 6);
		// Joint re-attached to the CLONED shapes (by array index).
		expect(rj.part1).toBe(decoded.parts[0]);
		expect(rj.part2).toBe(decoded.parts[1]);

		const t = decoded.parts[4] as Thrusters;
		expect(t.strength).toBe(18);
		expect(t.thrustKey).toBe(87);
		expect(t.autoOn).toBe(true);
		expect(t.shape).toBe(decoded.parts[0]);

		const tp = decoded.parts[2] as TextPart;
		// Non-text TextPart fields round-trip correctly.
		expect(tp.size).toBe(20);
		expect(tp.red).toBe(11);
		expect(tp.green).toBe(22);
		expect(tp.blue).toBe(33);
	});

	// Regression guard: a TextPart's text content must survive the round-trip.
	// TextPart stores its text in a private `_text` backing field behind a
	// `text` getter/setter (TextPart.ts:28-36), so AMF serializes the enumerable
	// own-property as `_text`. This was originally dropped because the decoder
	// read `od.text`; fixed to read `od._text ?? od.text` (robotSerialization.ts).
	it("round-trips TextPart text content", async () => {
		const tp = new TextPart(null, 0, 0, 4, 2, "hello world");
		const decoded = await decodeRobot(await encodeRobot([tp]));
		expect((decoded.parts[0] as TextPart).text).toBe("hello world");
	});

	it("round-trips triangle vertices, cannon, fixed & prismatic joints", async () => {
		const tri = new Triangle(0, 0, 4, 0, 2, 3);
		const cn = new Cannon(6, 6, 3);
		cn.strength = 27;
		cn.fireKey = 32;
		const fj = new FixedJoint(tri, cn, 3, 3);
		const pj = new PrismaticJoint(tri, cn, 0, 0, 3, 0);
		pj.enablePiston = true;
		pj.pistonStrength = 12;
		pj.initLength = 3;
		pj.red = 9;

		const decoded = await decodeRobot(await encodeRobot([tri, cn, fj, pj]));
		// The PrismaticJoint records an arrayIndex during encode and is re-seated
		// to it on decode (robotSerialization.ts:76-79, 222-233 — ported verbatim
		// from Database), landing it BEFORE the FixedJoint here.
		expect(decoded.parts.map((p) => p.type)).toEqual([
			"Triangle",
			"Cannon",
			"PrismaticJoint",
			"FixedJoint",
		]);
		const dtri = decoded.parts[0] as Triangle;
		expect(dtri.x1).toBeCloseTo(tri.x1, 6);
		expect(dtri.y2).toBeCloseTo(tri.y2, 6);
		expect(dtri.x3).toBeCloseTo(tri.x3, 6);
		const dcn = decoded.parts[1] as Cannon;
		expect(dcn.w).toBeCloseTo(3, 6);
		expect(dcn.strength).toBe(27);
		expect(dcn.fireKey).toBe(32);
		const dpj = decoded.parts[2] as PrismaticJoint;
		expect(dpj.enablePiston).toBe(true);
		expect(dpj.pistonStrength).toBe(12);
		expect(dpj.initLength).toBeCloseTo(3, 6);
		expect(dpj.red).toBe(9);
	});

	it("empty robot round-trips to zero parts", async () => {
		const decoded = await decodeRobot(await encodeRobot([]));
		expect(decoded.parts.length).toBe(0);
	});

	// REGRESSION (H6): a joint/thruster whose part reference index is stored must
	// index the SAME reordered (shapes-first) array the decoder reads back, NOT the
	// original input array (Database.PutPartsIntoByteArray :1938-1949 scans
	// `partsToStore`). If a joint appears in the input array BEFORE one of the shapes
	// it connects, the two orderings disagree: the shape's index in the original
	// `parts` array (2) differs from its index in the reordered `partsToStore` (1).
	// Scanning `parts` therefore wrote an index pointing at the wrong/nonexistent
	// decoded part, so the joint attached to the wrong shape or was dropped.
	it("joint declared before one of its shapes re-attaches to the correct shapes", async () => {
		// Distinct geometry per shape so we can verify attachment identity.
		const shapeA = new Circle(1, 1, 1.5); // radius 1.5 identifies A
		const shapeB = new Rectangle(10, 10, 3, 2); // rectangle identifies B
		const rj = new RevoluteJoint(shapeA, shapeB, 5, 5);
		rj.motorStrength = 42;

		// Input order puts the joint BEFORE shapeB: [shapeA, joint, shapeB].
		const decoded = await decodeRobot(await encodeRobot([shapeA, rj, shapeB]));

		// Reordered on encode: [Circle, Rectangle, RevoluteJoint].
		expect(decoded.parts.map((p) => p.type)).toEqual(["Circle", "Rectangle", "RevoluteJoint"]);
		const dCircle = decoded.parts[0] as Circle;
		const dRect = decoded.parts[1] as Rectangle;
		const dJoint = decoded.parts[2] as RevoluteJoint;

		// Sanity: the shapes kept their identifying geometry.
		expect(dCircle.radius).toBeCloseTo(1.5, 6);
		expect(dRect.w).toBeCloseTo(3, 6);
		expect(dJoint.motorStrength).toBe(42);

		// The joint must attach part1->Circle and part2->Rectangle. Under the old
		// (scan `parts`) code part2Index pointed at index 2, which in decode order is
		// the joint itself (or out of range), so this assertion failed.
		expect(dJoint.part1).toBe(dCircle);
		expect(dJoint.part2).toBe(dRect);
	});

	// Same hazard for a Thrusters attached to a shape that appears after it in input.
	it("thruster declared before its shape re-attaches to the correct shape", async () => {
		const shapeA = new Rectangle(0, 0, 4, 1);
		const shapeB = new Circle(20, 20, 2.5); // radius 2.5 identifies B
		const thr = new Thrusters(shapeB, 3, 3);
		thr.strength = 33;

		// Input: [shapeA, thruster(->shapeB), shapeB].
		const decoded = await decodeRobot(await encodeRobot([shapeA, thr, shapeB]));

		expect(decoded.parts.map((p) => p.type)).toEqual(["Rectangle", "Circle", "Thrusters"]);
		const dCircle = decoded.parts[1] as Circle;
		const dThr = decoded.parts[2] as Thrusters;
		expect(dCircle.radius).toBeCloseTo(2.5, 6);
		expect(dThr.strength).toBe(33);
		expect(dThr.shape).toBe(dCircle);
	});
});

describe("legacy byte format (robotSerialization.ts:14-21 / Database.ExportRobot)", () => {
	it("export string is valid base64 that zlib-inflates to the documented header", async () => {
		const zlib = await import("node:zlib");
		const str = await encodeRobot(sampleRobot(), undefined, "MyBot", "desc");
		// base64 -> raw compressed bytes -> zlib inflate.
		const compressed = Buffer.from(str, "base64");
		const raw = zlib.inflateSync(compressed);

		// Header layout (robotSerialization.ts:305-312 / encodeRobot):
		//   UTF name, UTF desc, int shared=0, int allowEdits=0, int prop=0, ...
		// AMF UTF string = u16 length prefix + bytes.
		let pos = 0;
		const nameLen = raw.readUInt16BE(pos);
		pos += 2;
		const name = raw.toString("utf8", pos, pos + nameLen);
		pos += nameLen;
		expect(name).toBe("MyBot");

		const descLen = raw.readUInt16BE(pos);
		pos += 2;
		const desc = raw.toString("utf8", pos, pos + descLen);
		pos += descLen;
		expect(desc).toBe("desc");

		// Three big-endian int32 header fields, all 0.
		expect(raw.readInt32BE(pos)).toBe(0); // shared
		expect(raw.readInt32BE(pos + 4)).toBe(0); // allowEdits
		expect(raw.readInt32BE(pos + 8)).toBe(0); // prop
	});

	it("encoding is idempotent once parts are in normalized (decoded) order", async () => {
		// encodeRobot REORDERS parts (shapes/text first), so encoding raw input
		// then re-encoding its decoded result is NOT byte-identical (the order
		// changed). But once parts are already in the normalized order, a
		// decode->encode->decode->encode cycle is byte-stable. This pins the
		// deterministic byte output for a fixed part graph.
		const first = await decodeRobot(await encodeRobot(sampleRobot()));
		const s1 = await encodeRobot(first.parts);
		const second = await decodeRobot(s1);
		const s2 = await encodeRobot(second.parts);
		expect(s2).toBe(s1);
	});
});
