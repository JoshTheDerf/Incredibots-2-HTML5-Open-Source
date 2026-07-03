// P5 — IB3 (IncrediBots 3) file/code import (src/core/ib3Import.ts).
//
// Builds synthetic IB3 streams with the repo's ByteArray/AMF3 writer shaped like
// Flash output (version UTF, int type, an AMF parts array/vector, a settings
// object, then the metadata UTFs/ints). The loader hasOwnProperty-probes every
// optional field, so dynamic-trait objects are fine.
//
// Covers: every part type (rotated-rect recovery ±tol, polygon triangulation
// weld integrity, bomb fields), the version-gated load fix-ups (0.00.10a bomb
// delay frames->ms + waterHeightOscSpeed default, 0.00.18a restitution,
// 0.00.22a bomb sensitivity), unit conversions, water settings, challenge- and
// replay-as-design, corrupt-data errors, and detection (native codes still
// route to the native path).

import { describe, expect, it } from "vitest";
import { b2AABB, b2Vec2, b2World } from "../src/Box2D";
import { ContactFilter } from "../src/Game/ContactFilter";
import { ByteArray } from "../src/General/ByteArray";
import { Bomb } from "../src/Parts/Bomb";
import { Circle } from "../src/Parts/Circle";
import { FixedJoint } from "../src/Parts/FixedJoint";
import type { Part } from "../src/Parts/Part";
import { Polygon } from "../src/Parts/Polygon";
import { PrismaticJoint } from "../src/Parts/PrismaticJoint";
import { Rectangle } from "../src/Parts/Rectangle";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { TextPart } from "../src/Parts/TextPart";
import { Thrusters } from "../src/Parts/Thrusters";
import { Triangle } from "../src/Parts/Triangle";
import { TRIGGER_DESTROY, TRIGGER_FIRE } from "../src/Parts/partDefaults";
import { compareVersions, decodeIB3, decodeIB3FromByteArray, looksLikeIB3 } from "../src/core/ib3Import";
import { processTriggers, type TriggerUserData, wireTriggers } from "../src/core/triggers";
import { decodeRobot, encodeRobot } from "../src/core/robotSerialization";
import { SandboxSettings } from "../src/Game/SandboxSettings";

// --- synthetic-stream builders ---------------------------------------------

interface IB3Opts {
	version?: string;
	type?: number;
	parts?: Record<string, unknown>[];
	settings?: Record<string, unknown>;
	creatorName?: string;
	creatorId?: string;
	id?: string;
	name?: string;
	description?: string;
	exposure?: number;
	editable?: number;
	asVector?: boolean;
	replayTrailer?: boolean;
}

/** Write an uncompressed IB3 stream, position reset to 0. */
function ib3Bytes(o: IB3Opts = {}): ByteArray {
	const b = new ByteArray();
	b.writeUTF(o.version ?? "0.00.33b");
	b.writeInt(o.type ?? 0);
	let parts: any = o.parts ?? [];
	if (o.asVector) {
		parts = (o.parts ?? []).slice();
		parts.type = 16; // AMF3 kVectorObject
		parts.fixed = false;
		parts.toString = () => "[Vector.<Parts.Part>]";
	}
	b.writeObject(parts);
	b.writeObject(o.settings ?? {});
	b.writeUTF(o.creatorName ?? "");
	b.writeUTF(o.creatorId ?? "");
	b.writeUTF(o.id ?? "");
	b.writeUTF(o.name ?? "");
	b.writeUTF(o.description ?? "");
	b.writeInt(o.exposure ?? 0);
	b.writeInt(o.editable ?? 1);
	if (o.replayTrailer) {
		// Recording section a real replay would carry; the importer ignores it.
		b.writeUnsignedInt(120);
		b.writeObject([{ keyFrame: 0 }]);
	}
	b.position = 0;
	return b;
}

/** Compress + base64 to an IB3 export code (mirrors Database.ExportBot). */
async function ib3Code(o: IB3Opts = {}): Promise<string> {
	const b = ib3Bytes(o);
	await b.compress();
	b.position = 0;
	return b.buffer.toString("base64");
}

function circle(over: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		name: "Circle",
		x: 0,
		y: 0,
		radius: 1,
		angle: 0,
		density: 16,
		friction: 16,
		restitution: 12,
		collA: true,
		collB: true,
		collC: true,
		collD: true,
		buoyant: true,
		draggable: true,
		fixated: false,
		color: 0xff0000,
		opacity: 200,
		outlines: true,
		...over,
	};
}

/** IB3 RectPart vertex order (RectPart.as:10-14), optionally rotated about center. */
function rectVerts(cx: number, cy: number, w: number, h: number, rot = 0): { x: number; y: number }[] {
	const corners = [
		{ x: cx + w / 2, y: cy + h / 2 },
		{ x: cx - w / 2, y: cy + h / 2 },
		{ x: cx - w / 2, y: cy - h / 2 },
		{ x: cx + w / 2, y: cy - h / 2 },
	];
	return corners.map((c) => {
		const dx = c.x - cx;
		const dy = c.y - cy;
		return { x: cx + dx * Math.cos(rot) - dy * Math.sin(rot), y: cy + dx * Math.sin(rot) + dy * Math.cos(rot) };
	});
}

const NORM = (a: number, m = Math.PI) => ((a % m) + m) % m;

// --- detection --------------------------------------------------------------

describe("IB3 detection", () => {
	it("recognises an IB3 stream (version-string-first + int type 0..2)", () => {
		expect(looksLikeIB3(ib3Bytes({ parts: [circle()] }))).toBe(true);
		expect(looksLikeIB3(ib3Bytes({ type: 2 }))).toBe(true);
	});

	it("rejects a native/Jaybit code and leaves the reader routed to the native path", async () => {
		const code = await encodeRobot([new Circle(0, 0, 1)], new SandboxSettings(15, 1, 0, 0, 0), "n", "d");
		const decoded = await decodeRobot(code);
		expect(decoded.ib3).toBeUndefined();
		expect(decoded.parts).toHaveLength(1);
		expect(decoded.parts[0].type).toBe("Circle");
	});

	it("does not misread a version-string type outside 0..2", () => {
		expect(looksLikeIB3(ib3Bytes({ type: 5 }))).toBe(false);
	});
});

// --- part mapping -----------------------------------------------------------

describe("IB3 part mapping", () => {
	it("maps a circle with material + colour conversions", () => {
		const { robot, ib3 } = decodeIB3FromByteArray(ib3Bytes({ parts: [circle({ angle: 0.5 })], name: "Bot", creatorName: "Zach" }));
		expect(ib3.name).toBe("Bot");
		expect(ib3.creatorName).toBe("Zach");
		const c = robot.parts[0] as Circle;
		expect(c.type).toBe("Circle");
		expect(c.radius).toBe(1);
		expect(c.angle).toBeCloseTo(0.5);
		expect(c.density).toBe(16); // pass-through
		expect(c.friction).toBe(11); // 16 - 5 (== IB2 default -> box2d 0.4)
		expect(c.restitution).toBe(7); // 12*1.25 - 8 (== IB2 default -> box2d 0.3)
		expect([c.red, c.green, c.blue]).toEqual([255, 0, 0]);
		expect(c.opacity).toBe(200);
	});

	it("recovers an axis-aligned rectangle from its 4 vertices", () => {
		const parts = [{ name: "Rectangle", x: 5, y: 0, angle: 0, vertices: rectVerts(5, 0, 2, 1, 0) }];
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const r = robot.parts[0] as Rectangle;
		expect(r.type).toBe("Rectangle");
		expect(r.w).toBeCloseTo(2);
		expect(r.h).toBeCloseTo(1);
		expect(r.centerX).toBeCloseTo(5);
		expect(r.centerY).toBeCloseTo(0);
	});

	it("recovers a ROTATED rectangle within tolerance", () => {
		const rot = 0.4;
		const parts = [{ name: "Rectangle", x: 0, y: 0, angle: 0, vertices: rectVerts(0, 0, 4, 2, rot) }];
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const r = robot.parts[0] as Rectangle;
		expect(r.w).toBeCloseTo(4, 4);
		expect(r.h).toBeCloseTo(2, 4);
		expect(r.centerX).toBeCloseTo(0, 4);
		expect(r.centerY).toBeCloseTo(0, 4);
		// Orientation preserved modulo PI (a rectangle is symmetric under PI).
		expect(NORM(r.angle)).toBeCloseTo(NORM(rot), 4);
	});

	it("maps a triangle from its 3 world-space vertices", () => {
		const verts = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 2 }];
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ parts: [{ name: "Triangle", x: 1, y: 0.67, vertices: verts }] }));
		const t = robot.parts[0] as Triangle;
		expect(t.type).toBe("Triangle");
		// The 3 imported corners match the source set (order may be CW-normalised).
		const got = [
			{ x: t.x1, y: t.y1 },
			{ x: t.x2, y: t.y2 },
			{ x: t.x3, y: t.y3 },
		];
		for (const v of verts) {
			expect(got.some((g) => Math.abs(g.x - v.x) < 1e-6 && Math.abs(g.y - v.y) < 1e-6)).toBe(true);
		}
	});

	/** Standard shoelace area of a vertex ring (matches IB3 PolygonPart.GetArea). */
	function shoelaceArea(v: { x: number; y: number }[]): number {
		let a = 0;
		for (let i = 0; i < v.length; i++) {
			const j = (i + 1) % v.length;
			a += v[i].x * v[j].y - v[j].x * v[i].y;
		}
		return Math.abs(a / 2);
	}

	it("imports a convex IB3 polygon as ONE Polygon part (no welded triangles, no warning)", () => {
		// Convex pentagon (5 verts, <= b2_maxPolygonVertices) — a single Polygon now.
		const verts = [
			{ x: 0, y: 2 },
			{ x: 2, y: 0.6 },
			{ x: 1.2, y: -1.6 },
			{ x: -1.2, y: -1.6 },
			{ x: -2, y: 0.6 },
		];
		const { robot, warnings } = decodeIB3FromByteArray(ib3Bytes({ parts: [{ name: "Polygon", x: 0, y: 0, vertices: verts }] }));
		const polys = robot.parts.filter((p) => p instanceof Polygon) as Polygon[];
		expect(polys).toHaveLength(1);
		expect(robot.parts.filter((p) => p instanceof Triangle)).toHaveLength(0);
		expect(robot.parts.filter((p) => p instanceof FixedJoint)).toHaveLength(0);
		const poly = polys[0];
		expect(poly.type).toBe("Polygon");
		expect(poly.numVertices()).toBe(5);
		// Area preserved within tolerance; every source vertex is present (winding
		// may be normalized so the order can differ).
		expect(poly.GetArea()).toBeCloseTo(shoelaceArea(verts), 4);
		for (const v of verts) {
			expect(poly.vertices.some((g) => Math.abs(g.x - v.x) < 1e-6 && Math.abs(g.y - v.y) < 1e-6)).toBe(true);
		}
		// The two broad v1-approximation warnings are gone.
		expect(warnings.some((m) => m.includes("fan-triangulated"))).toBe(false);
		expect(warnings.some((m) => m.includes("v1 approximation"))).toBe(false);
	});

	it("imports a non-rectangular IB3 'Rectangle' (convex quad) as a Polygon, not welded triangles", () => {
		// A trapezoid stored under the "Rectangle" name — not axis/rotation-aligned,
		// so it can't be recovered as a Rectangle, but it IS a convex quad.
		const verts = [
			{ x: -2, y: 1 },
			{ x: 2, y: 1 },
			{ x: 1, y: -1 },
			{ x: -1, y: -1 },
		];
		const { robot, warnings } = decodeIB3FromByteArray(ib3Bytes({ parts: [{ name: "Rectangle", x: 0, y: 0, vertices: verts }] }));
		const polys = robot.parts.filter((p) => p instanceof Polygon) as Polygon[];
		expect(polys).toHaveLength(1);
		expect(robot.parts.filter((p) => p instanceof Triangle)).toHaveLength(0);
		expect(polys[0].numVertices()).toBe(4);
		expect(polys[0].GetArea()).toBeCloseTo(shoelaceArea(verts), 4);
		expect(warnings.some((m) => m.includes("welded triangles"))).toBe(false);
	});

	it("falls back to welded triangles ONLY for a concave polygon (narrowed warning)", () => {
		// Concave arrowhead (the 4th vertex dents inward) — Box2D needs convex, so
		// this genuinely must fan-triangulate.
		const verts = [
			{ x: -2, y: 0 },
			{ x: 0, y: 2 },
			{ x: 2, y: 0 },
			{ x: 0, y: 0.5 }, // reflex dent
		];
		const { robot, warnings } = decodeIB3FromByteArray(ib3Bytes({ parts: [{ name: "Polygon", x: 0, y: 0, vertices: verts }] }));
		expect(robot.parts.filter((p) => p instanceof Polygon)).toHaveLength(0);
		expect((robot.parts.filter((p) => p instanceof Triangle) as Triangle[]).length).toBe(2); // n - 2
		expect(robot.parts.filter((p) => p instanceof FixedJoint)).toHaveLength(1); // n - 3
		expect(warnings.some((m) => m.includes("concave"))).toBe(true);
	});

	it("falls back to welded triangles for a convex polygon with > b2_maxPolygonVertices verts", () => {
		// A convex 10-gon exceeds the 8-vertex b2PolygonShape cap.
		const verts: { x: number; y: number }[] = [];
		for (let k = 0; k < 10; k++) {
			verts.push({ x: 3 * Math.cos((k / 10) * 2 * Math.PI), y: 3 * Math.sin((k / 10) * 2 * Math.PI) });
		}
		const { robot, warnings } = decodeIB3FromByteArray(ib3Bytes({ parts: [{ name: "Polygon", x: 0, y: 0, vertices: verts }] }));
		expect(robot.parts.filter((p) => p instanceof Polygon)).toHaveLength(0);
		expect((robot.parts.filter((p) => p instanceof Triangle) as Triangle[]).length).toBe(8); // n - 2
		expect(warnings.some((m) => m.includes("vertices"))).toBe(true);
	});
});

// --- native Polygon serialization round-trip --------------------------------

describe("Polygon native serialization", () => {
	it("round-trips a Polygon through the native robot save format", async () => {
		const src = new Polygon([
			new b2Vec2(0, 2),
			new b2Vec2(2, 0.6),
			new b2Vec2(1.2, -1.6),
			new b2Vec2(-1.2, -1.6),
			new b2Vec2(-2, 0.6),
		]);
		src.density = 20;
		src.friction = 9;
		src.restitution = 5;
		src.red = 10;
		src.green = 20;
		src.blue = 30;
		src.angle = 0.3;
		const code = await encodeRobot([src], new SandboxSettings(15, 1, 0, 0, 0), "poly", "d");
		const decoded = await decodeRobot(code);
		expect(decoded.parts).toHaveLength(1);
		const out = decoded.parts[0] as Polygon;
		expect(out.type).toBe("Polygon");
		expect(out.numVertices()).toBe(5);
		expect(out.equals(src)).toBe(true);
		expect(out.GetArea()).toBeCloseTo(src.GetArea(), 6);
		expect(out.angle).toBeCloseTo(0.3, 6);
		expect(out.density).toBe(20);
		expect([out.red, out.green, out.blue]).toEqual([10, 20, 30]);
	});
});

// --- bomb + version fix-ups -------------------------------------------------

describe("IB3 bomb + version fix-ups", () => {
	function bomb(over: Record<string, unknown> = {}): Record<string, unknown> {
		return {
			name: "Bomb",
			x: 3,
			y: 0,
			radius: 0.8,
			angle: 0,
			blastRadius: 6,
			strength: 20,
			delay: 1500,
			sensitivity: 80,
			sensitive: true,
			deflect: true,
			repeat: 2,
			repeatable: true,
			delayAfterTrigger: true,
			explodeOnImpact: false,
			delayAfterImpact: false,
			...over,
		};
	}

	it("maps every bomb field (current version — no fix-ups)", () => {
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ parts: [bomb()] }));
		const b = robot.parts[0] as Bomb;
		expect(b.type).toBe("Bomb");
		expect(b.radius).toBe(0.8);
		expect(b.blastRadius).toBe(6);
		expect(b.strength).toBe(20); // pass-through (both blast force = s*100)
		expect(b.delay).toBe(1500); // ms pass-through
		expect(b.sensitivity).toBe(80); // pass-through
		expect(b.sensitive).toBe(true);
		expect(b.deflect).toBe(true);
		expect(b.repeat).toBe(2);
		expect(b.repeatable).toBe(true);
		expect(b.delayAfterTrigger).toBe(true);
		expect(b.explodeOnImpact).toBe(false);
		expect(b.delayAfterImpact).toBe(false);
	});

	it("converts <=0.00.10a bomb delay from frames@30fps to ms", () => {
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ version: "0.00.10a", parts: [bomb({ delay: 60 })] }));
		expect((robot.parts[0] as Bomb).delay).toBe(2000); // 60/30*1000
	});

	it("remaps <=0.00.22a bomb sensitivity", () => {
		const stored = 80;
		const expected = (200 - (Math.sqrt(100 - (200 - stored * 2)) + 10) * 10) / 2;
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ version: "0.00.22a", parts: [bomb({ sensitivity: stored })] }));
		expect((robot.parts[0] as Bomb).sensitivity).toBeCloseTo(expected, 6);
	});

	it("applies the <=0.00.18a restitution fix-up before converting to IB2 units", () => {
		const stored = 20;
		const r3 = (stored / 54.8) * 40; // fix-up
		const expected = r3 * 1.25 - 8; // IB3->IB2
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ version: "0.00.18a", parts: [circle({ restitution: stored })] }));
		expect((robot.parts[0] as Circle).restitution).toBeCloseTo(expected, 6);
	});
});

// --- joints + thrusters -----------------------------------------------------

describe("IB3 joints, thrusters, text", () => {
	const shapes = [circle({ x: 0 }), circle({ x: 2 })];

	it("maps a rotating joint to a RevoluteJoint (value-preserving motor)", () => {
		const parts = [
			...shapes,
			{
				name: "Rotating joint",
				x: 1,
				y: 0,
				part1Index: 0,
				part2Index: 1,
				enableMotor: true,
				strength: 30,
				speed: 16,
				autoCW: true,
				autoCCW: false,
				floppy: false,
				keyCW: 39,
				keyCCW: 37,
				lowerLimit: 45,
				upperLimit: 90,
			},
		];
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const rj = robot.parts.find((p) => p instanceof RevoluteJoint) as RevoluteJoint;
		expect(rj).toBeTruthy();
		expect(rj.part1).toBe(robot.parts[0]);
		expect(rj.part2).toBe(robot.parts[1]);
		expect(rj.enableMotor).toBe(true);
		expect(rj.motorStrength).toBeCloseTo(10); // 30/3 (torque 30*10 == 10*30)
		expect(rj.motorSpeed).toBe(16);
		expect(rj.autoCW).toBe(true);
		expect(rj.isStiff).toBe(true); // !floppy
		expect(rj.motorUpperLimit).toBe(90);
		expect(rj.motorLowerLimit).toBe(-45); // IB3 negates lowerLimit
		expect(rj.motorCWKey).toBe(39);
	});

	it("treats IB3 rotating-joint MAX_VALUE limits as unlimited", () => {
		const parts = [
			...shapes,
			{ name: "Rotating joint", x: 1, y: 0, part1Index: 0, part2Index: 1, lowerLimit: Number.MAX_VALUE, upperLimit: Number.MAX_VALUE },
		];
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const rj = robot.parts.find((p) => p instanceof RevoluteJoint) as RevoluteJoint;
		expect(rj.motorUpperLimit).toBe(Number.MAX_VALUE);
		expect(rj.motorLowerLimit).toBe(-Number.MAX_VALUE);
	});

	it("maps a sliding joint to a PrismaticJoint (anchors + speed*2.5)", () => {
		const parts = [
			...shapes,
			{
				name: "Sliding joint",
				anchor1x: 0,
				anchor1y: 0,
				anchor2x: 2,
				anchor2y: 0,
				part1Index: 0,
				part2Index: 1,
				enableMotor: true,
				strength: 10,
				speed: 8,
				floppy: false,
				buoyant: false,
				keyExpand: 38,
				keyRetract: 40,
			},
		];
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const pj = robot.parts.find((p) => p instanceof PrismaticJoint) as PrismaticJoint;
		expect(pj).toBeTruthy();
		expect(pj.enablePiston).toBe(true);
		expect(pj.pistonStrength).toBe(10); // pass-through
		expect(pj.pistonSpeed).toBeCloseTo(20); // 8 * 2.5
		expect(pj.isStiff).toBe(true);
		expect(pj.buoyant).toBe(false);
		expect(pj.initLength).toBeCloseTo(2);
		expect(pj.pistonUpKey).toBe(38);
	});

	it("maps a fixed joint and resolves part references across a polygon expansion", () => {
		const parts = [
			circle({ x: 0 }),
			{ name: "Polygon", x: 5, y: 0, vertices: rectVerts(5, 0, 2, 2, 0) }, // index 1 -> expands
			circle({ x: 10 }), // index 2
			{ name: "Fixed joint", x: 0, y: 0, part1Index: 0, part2Index: 2 },
		];
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		// The user fixed joint connects the two circles (index 0 and 2), unaffected
		// by the polygon at index 1 fanning into extra parts (whose weld joints
		// connect triangles, not circles).
		const circles = robot.parts.filter((p) => p instanceof Circle);
		const fj = robot.parts.find(
			(p) => p instanceof FixedJoint && (p as FixedJoint).part1 instanceof Circle && (p as FixedJoint).part2 instanceof Circle,
		) as FixedJoint;
		expect(fj.part1).toBe(circles[0]);
		expect(fj.part2).toBe(circles[1]);
	});

	it("maps a thruster (force-preserving strength, angle - PI/2)", () => {
		const parts = [circle(), { name: "Thrusters", x: 0, y: 0, partIndex: 0, angle: 0, strength: 16, thrustKey: 38, autoOn: true }];
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const t = robot.parts.find((p) => p instanceof Thrusters) as Thrusters;
		expect(t.shape).toBe(robot.parts[0]);
		expect(t.angle).toBeCloseTo(-Math.PI / 2);
		expect(t.autoOn).toBe(true);
		expect(t.thrustKey).toBe(38);
		// IB3 force 16*452/3 == IB2 10 + s^2*10.
		const ib3Force = 16 * (452 / 3);
		expect(10 + t.strength * t.strength * 10).toBeCloseTo(ib3Force, 3);
	});

	it("maps a text part (key toggle -> alwaysVisible)", () => {
		const parts = [{ name: "TextPart", x: 1, y: 2, width: 6, height: 3, text: "hello", size: 18, keyShow: 32, enableKey: true, color: 0x0000ff }];
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const t = robot.parts[0] as TextPart;
		expect(t.type).toBe("TextPart");
		expect(t.text).toBe("hello");
		expect(t.w).toBe(6);
		expect(t.size).toBe(18);
		expect(t.displayKey).toBe(32);
		expect(t.alwaysVisible).toBe(false); // enableKey true
		expect([t.red, t.green, t.blue]).toEqual([0, 0, 255]);
	});

	it("skips a joint that references a missing part", () => {
		const parts = [circle(), { name: "Fixed joint", x: 0, y: 0, part1Index: 0, part2Index: 9 }];
		const { robot, warnings } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		expect(robot.parts.filter((p) => p instanceof FixedJoint)).toHaveLength(0);
		expect(warnings.some((m) => m.includes("missing"))).toBe(true);
	});
});

// --- sandbox settings -------------------------------------------------------

describe("IB3 sandbox settings", () => {
	it("converts gravity and maps water fields verbatim", () => {
		const settings = {
			gravityY: 16,
			size: 1,
			groundType: 0,
			skyType: 1,
			waterEnabled: true,
			waterType: 1,
			waterDensity: 25,
			waterHeight: 30,
			waterColor: 0x3366cc,
			waterOpacity: 180,
			waterLinearDrag: 6,
			waterAngularDrag: 3,
			waterHeightOsc: 0.2,
			waterHeightOscSpeed: 3000,
			waterTiltOsc: 0.1,
			waterTiltOscSpeed: 2,
			cameraX: 12,
			cameraY: 34,
			cameraZoom: 45,
		};
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ settings }));
		const s = robot.settings;
		expect(s.gravity).toBeCloseTo(16 / 1.63098878695); // ~9.809 m/s^2
		expect(s.size).toBe(1);
		expect(s.background).toBe(SandboxSettings.BACKGROUND_SPACE);
		expect(s.waterEnabled).toBe(true);
		expect(s.waterType).toBe(1);
		expect(s.waterDensity).toBe(25);
		expect(s.waterHeight).toBe(30);
		expect(s.waterColor).toBe(0x3366cc);
		expect(s.waterOpacity).toBe(180);
		expect(s.waterLinearDrag).toBe(6);
		expect(s.waterAngularDrag).toBe(3);
		expect(s.waterHeightOsc).toBeCloseTo(0.2);
		expect(s.waterHeightOscSpeed).toBe(3000);
		expect(s.waterTiltOsc).toBeCloseTo(0.1);
		expect(s.waterTiltOscSpeed).toBe(2);
		expect(robot.cameraX).toBe(12);
		expect(robot.cameraY).toBe(34);
		expect(robot.zoomLevel).toBe(45);
	});

	it("defaults waterHeightOscSpeed to 4000 for <=0.00.10a when absent", () => {
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ version: "0.00.10a", settings: { waterEnabled: true } }));
		expect(robot.settings.waterHeightOscSpeed).toBe(4000);
	});

	it("maps a custom sky colour to a solid-colour background", () => {
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ settings: { skyType: -1, skyColor: 0x112233 } }));
		expect(robot.settings.background).toBe(SandboxSettings.BACKGROUND_SOLID_COLOUR);
		expect([robot.settings.backgroundR, robot.settings.backgroundG, robot.settings.backgroundB]).toEqual([0x11, 0x22, 0x33]);
	});

	// P1.5b-2b: IB3 bots were tuned on Box2DFlash 2.1a, so imports default to the
	// IB3 engine (1); native/CE/Jaybit codes stay on the classic engine (0).
	it("an imported IB3 design defaults to physics engine 1 (2.1a)", async () => {
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ settings: { gravityY: 16 }, parts: [circle()] }));
		expect(robot.settings.physicsEngine).toBe(SandboxSettings.ENGINE_IB3);
		// ...also via the base64-code path.
		const { robot: r2 } = await decodeIB3(await ib3Code({ parts: [circle()] }));
		expect(r2.settings.physicsEngine).toBe(1);
	});

	it("a native (non-IB3) code stays on engine 0", async () => {
		const decoded = await decodeRobot(await encodeRobot([new Circle(0, 0, 1)], new SandboxSettings(15, 0, 0, 0, 0)));
		expect(decoded.settings.physicsEngine).toBe(0);
	});
});

// --- formerly-warned features now map DIRECTLY (warnings removed) ------------

describe("IB3 features that previously degraded now import directly", () => {
	const shapes = [circle({ x: 0 }), circle({ x: 2 })];

	it("maps ShapePart.fixedRotation directly (no 'fixed rotation' warning)", () => {
		const { robot, warnings } = decodeIB3FromByteArray(ib3Bytes({ parts: [circle({ fixedRotation: true })] }));
		expect((robot.parts[0] as Circle).fixedRotation).toBe(true);
		expect(warnings.some((m) => m.toLowerCase().includes("fixed rotation"))).toBe(false);
	});

	it("maps rotating-joint per-direction key enable directly (no warning)", () => {
		const parts = [
			...shapes,
			{ name: "Rotating joint", x: 1, y: 0, part1Index: 0, part2Index: 1, enableKeyCW: false, enableKeyCCW: true },
		];
		const { robot, warnings } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const rj = robot.parts.find((p) => p instanceof RevoluteJoint) as RevoluteJoint;
		expect(rj.enableKeyCW).toBe(false);
		expect(rj.enableKeyCCW).toBe(true);
		expect(warnings.some((m) => m.includes("per-direction key enable"))).toBe(false);
	});

	it("maps sliding-joint one-directional auto + begin-expanded + key enable directly (no warnings)", () => {
		const parts = [
			...shapes,
			{
				name: "Sliding joint",
				anchor1x: 0, anchor1y: 0, anchor2x: 2, anchor2y: 0,
				part1Index: 0, part2Index: 1,
				autoExpand: true, autoRetract: false,
				beginExpanded: true,
				enableKeyExpand: false, enableKeyRetract: true,
			},
		];
		const { robot, warnings } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const pj = robot.parts.find((p) => p instanceof PrismaticJoint) as PrismaticJoint;
		expect(pj.autoExpand).toBe(true);
		expect(pj.autoRetract).toBe(false);
		expect(pj.autoOscillate).toBe(false); // only both directions == oscillation
		expect(pj.beginExpanded).toBe(true);
		expect(pj.enableKeyExpand).toBe(false);
		expect(pj.enableKeyRetract).toBe(true);
		expect(warnings.some((m) => m.includes("one-directional"))).toBe(false);
		expect(warnings.some((m) => m.includes("begin expanded"))).toBe(false);
		expect(warnings.some((m) => m.includes("per-direction key enable"))).toBe(false);
	});

	it("maps both auto directions to autoOscillate", () => {
		const parts = [
			...shapes,
			{ name: "Sliding joint", anchor1x: 0, anchor1y: 0, anchor2x: 2, anchor2y: 0, part1Index: 0, part2Index: 1, autoExpand: true, autoRetract: true },
		];
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const pj = robot.parts.find((p) => p instanceof PrismaticJoint) as PrismaticJoint;
		expect(pj.autoOscillate).toBe(true);
	});

	it("maps Thrusters.enableKey directly (no 'enable key' warning)", () => {
		const parts = [circle(), { name: "Thrusters", x: 0, y: 0, partIndex: 0, angle: 0, strength: 16, thrustKey: 38, enableKey: false }];
		const { robot, warnings } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const t = robot.parts.find((p) => p instanceof Thrusters) as Thrusters;
		expect(t.enableKey).toBe(false);
		expect(warnings.some((m) => m.toLowerCase().includes("enable key"))).toBe(false);
	});

	it("maps TextPart.angle + visibleOnStart directly (no rotation/visible warnings)", () => {
		const parts = [{ name: "TextPart", x: 1, y: 2, width: 6, height: 3, text: "hi", enableKey: true, visibleOnStart: true, angle: 0.5 }];
		const { robot, warnings } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const t = robot.parts[0] as TextPart;
		expect(t.angle).toBeCloseTo(0.5);
		expect(t.alwaysVisible).toBe(false); // enableKey true
		expect(t.visibleOnStart).toBe(true);
		expect(warnings.some((m) => m.includes("rotation"))).toBe(false);
		expect(warnings.some((m) => m.includes("visible on start"))).toBe(false);
	});

	it("maps XLarge size + Island ground directly (no size/ground/theme warnings)", () => {
		const { robot, warnings } = decodeIB3FromByteArray(ib3Bytes({ settings: { size: 3, groundType: 1, theme: 2 } }));
		expect(robot.settings.size).toBe(3);
		expect(robot.settings.terrainType).toBe(SandboxSettings.TERRAIN_ISLAND);
		expect(warnings.some((m) => m.includes("XLarge"))).toBe(false);
		expect(warnings.some((m) => m.includes("Island"))).toBe(false);
		expect(warnings.some((m) => m.toLowerCase().includes("theme"))).toBe(false);
	});
});

// --- type variants + errors -------------------------------------------------

describe("IB3 type variants + errors", () => {
	it("imports a challenge (type 2) as a design", () => {
		const { robot, ib3 } = decodeIB3FromByteArray(ib3Bytes({ type: 2, parts: [circle()], name: "Chal" }));
		expect(ib3.type).toBe(2);
		expect(robot.parts).toHaveLength(1);
		expect(robot.name).toBe("Chal");
	});

	it("extracts the embedded bot from a replay (type 1) and discards the recording", () => {
		const { robot, warnings } = decodeIB3FromByteArray(
			ib3Bytes({ type: 1, parts: [circle(), circle({ x: 3 })], replayTrailer: true }),
		);
		expect(robot.parts).toHaveLength(2);
		expect(warnings.some((m) => m.toLowerCase().includes("replay"))).toBe(true);
	});

	it("throws a clean error on truncated/corrupt data", () => {
		const b = new ByteArray();
		b.writeUTF("0.00.33b");
		b.writeInt(0);
		b.position = 0; // no parts/settings/metadata follow
		expect(() => decodeIB3FromByteArray(b)).toThrow(/Could not read IB3 save data/);
	});

	it("decodes a full base64 IB3 code end-to-end (routes through decodeRobot)", async () => {
		const code = await ib3Code({
			parts: [circle(), { name: "Rectangle", x: 5, y: 0, angle: 0, vertices: rectVerts(5, 0, 2, 1, 0) }],
			name: "Coded",
			creatorName: "Ben",
			settings: { gravityY: 16, waterEnabled: true },
		});
		const decoded = await decodeRobot(code);
		expect(decoded.ib3).toBeTruthy();
		expect(decoded.ib3!.name).toBe("Coded");
		expect(decoded.parts).toHaveLength(2);
		expect(decoded.parts[0].type).toBe("Circle");
		expect(decoded.parts[1].type).toBe("Rectangle");
		expect(decoded.settings.waterEnabled).toBe(true);
		expect(Array.isArray(decoded.warnings)).toBe(true);
	});

	it("decodes an AMF Vector.<Object>-encoded parts stream (0x10)", async () => {
		const { robot } = await decodeIB3(await ib3Code({ asVector: true, parts: [circle(), bombOf()] }));
		expect(robot.parts[0].type).toBe("Circle");
		expect(robot.parts.some((p) => p instanceof Bomb)).toBe(true);
	});
});

function bombOf(): Record<string, unknown> {
	return { name: "Bomb", x: 3, y: 0, radius: 0.8, angle: 0, blastRadius: 6, strength: 20, delay: 1500, sensitivity: 80 };
}

// --- trigger wiring ---------------------------------------------------------

/** A fresh b2World matching GameCore.createWorld's extents/gravity. */
function triggerWorld(): b2World {
	const aabb = new b2AABB();
	aabb.lowerBound.Set(-300, -200);
	aabb.upperBound.Set(300, 200);
	const world = new b2World(aabb, new b2Vec2(0, 15), true);
	world.SetContactFilter(new ContactFilter());
	return world;
}

/** Init every part into `world` (shapes/text first, then joints/thrusters). */
function initAll(world: b2World, parts: Part[]): void {
	for (let i = parts.length - 1; i >= 0; i--) {
		const p = parts[i];
		if (!(p instanceof RevoluteJoint) && !(p instanceof PrismaticJoint) && !(p instanceof FixedJoint) && !(p instanceof Thrusters)) {
			p.Init(world);
		}
	}
	for (const p of parts) {
		if (p instanceof RevoluteJoint || p instanceof PrismaticJoint || p instanceof FixedJoint || p instanceof Thrusters) {
			p.Init(world);
		}
	}
}

function shapeUD(p: Circle): TriggerUserData {
	return (p.GetShape() as { GetUserData(): TriggerUserData }).GetUserData();
}

const noopKeyInput = (): void => {};

describe("IB3 trigger wiring maps onto working IB2 triggers", () => {
	it("maps a bomb detonate list: shape becomes a FIRE source, bomb keeps its listen list, and a contact arms the bomb", () => {
		// Source circle broadcasting "boom"; a Bomb listening for "boom".
		const parts = [
			circle({ x: 0, triggerList: "boom" }),
			{ name: "Bomb", x: 3, y: 0, radius: 0.8, angle: 0, blastRadius: 6, strength: 20, delay: 1500, triggerList: "boom" },
		];
		const { robot, warnings } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const src = robot.parts[0] as Circle;
		const bomb = robot.parts.find((p) => p instanceof Bomb) as Bomb;

		// Source-side reconstruction: name copied, action recovered (detonate), no qualifiers.
		expect(src.triggerName).toBe("boom");
		expect(src.triggerAction).toBe(TRIGGER_FIRE);
		expect(src.onGroundHit).toBe(false);
		expect(src.onSameName).toBe(false);
		// Target-side direct copy.
		expect(bomb.triggerList).toBe("boom");
		// A bomb detonate list is unambiguous -> no warning.
		expect(warnings.some((m) => m.toLowerCase().includes("trigger"))).toBe(false);

		// Headless: wire + a contact begin, and the bomb's DoTriggerAction fires.
		const world = triggerWorld();
		initAll(world, robot.parts);
		wireTriggers(robot.parts);
		const ud = shapeUD(src);
		expect(ud.jointsToTrigger).toContain(robot.parts.indexOf(bomb));
		expect(bomb.triggerTouches).toBe(0);
		processTriggers(robot.parts, world, ud, null, true, noopKeyInput);
		expect(bomb.triggerTouches).toBe(1); // triggered action fired -> bomb armed
	});

	it("maps a thruster trigger: source drives the thruster's triggerThruster on contact", () => {
		const parts = [
			circle({ x: 0, triggerList: "go" }),
			{ name: "Thrusters", x: 0, y: 0, partIndex: 0, angle: 0, strength: 16, triggerList: "go" },
		];
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const src = robot.parts[0] as Circle;
		const th = robot.parts.find((p) => p instanceof Thrusters) as Thrusters;
		expect(src.triggerName).toBe("go");
		expect(src.triggerAction).toBe(TRIGGER_FIRE);
		expect(th.triggerList).toBe("go");

		const world = triggerWorld();
		initAll(world, robot.parts);
		wireTriggers(robot.parts);
		const ud = shapeUD(src);
		processTriggers(robot.parts, world, ud, null, true, noopKeyInput);
		expect(th.triggerTouches).toBe(1);
		expect((th as unknown as { triggerThruster: boolean }).triggerThruster).toBe(true); // fired
	});

	it("a source driving ONLY fixed joints recovers the unambiguous DESTROY (break) action", () => {
		const parts = [
			circle({ x: 0, triggerList: "cut" }),
			circle({ x: 2, triggerList: "" }),
			{ name: "Fixed joint", x: 1, y: 0, part1Index: 0, part2Index: 1, triggerList: "cut" },
		];
		const { robot } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const src = robot.parts[0] as Circle;
		const fj = robot.parts.find((p) => p instanceof FixedJoint) as FixedJoint;
		expect(fj.triggerList).toBe("cut");
		expect(src.triggerAction).toBe(TRIGGER_DESTROY); // fixed joint only breaks
	});

	it("rotating/sliding joint triggers wire the CSV but warn that direction was not stored", () => {
		const parts = [
			circle({ x: 0, triggerList: "spin" }),
			circle({ x: 2, triggerList: "" }),
			{ name: "Rotating joint", x: 1, y: 0, part1Index: 0, part2Index: 1, triggerList: "spin" },
		];
		const { robot, warnings } = decodeIB3FromByteArray(ib3Bytes({ parts }));
		const rj = robot.parts.find((p) => p instanceof RevoluteJoint) as RevoluteJoint;
		expect(rj.triggerList).toBe("spin"); // CSV linkage preserved
		expect(warnings.some((m) => m.includes("rotate/expand direction"))).toBe(true);
	});

	it("shapes and targets with no triggerList stay unwired (no spurious triggers)", () => {
		const { robot, warnings } = decodeIB3FromByteArray(ib3Bytes({ parts: [circle({ x: 0 })] }));
		const c = robot.parts[0] as Circle;
		expect(c.triggerName).toBe("");
		expect(warnings.some((m) => m.toLowerCase().includes("trigger"))).toBe(false);
	});
});

// --- version comparator -----------------------------------------------------

describe("compareVersions (Database.CompareVersions)", () => {
	it("orders numeric components and alpha/beta/release suffixes", () => {
		expect(compareVersions("0.00.18a", "0.00.10a")).toBe(-1); // 10a older than 18a
		expect(compareVersions("0.00.18a", "0.00.33b")).toBe(1); // 33b newer
		expect(compareVersions("0.00.18a", "0.00.18a")).toBe(0);
		expect(compareVersions("0.00.10a", "0.00.10")).toBe(1); // release newer than alpha
	});
});
