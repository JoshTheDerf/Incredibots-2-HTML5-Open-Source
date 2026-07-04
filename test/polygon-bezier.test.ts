// Bézier-curve Polygon support: the per-vertex bézier data model + tessellation,
// the pen-tool create (via the createPolygon command carrying handles), the
// post-creation point/handle/type edit commands, curved collision (tessellate →
// existing ear-clip), and the serialization round-trip (handles + types), with
// the all-VERTEX straight polygon staying byte-identical to the classic behaviour.

import { afterEach, describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Polygon } from "../src/Parts/Polygon";
import { b2Vec2 } from "../src/Box2D";
import { box2d20Backend } from "../src/core/physics";
import { setPhysicsBackend } from "../src/Parts/partGlobals";
import { encodeRobot, decodeRobot } from "../src/core/robotSerialization";

function sandboxCore(): GameCore {
	return new GameCore(createInitialState());
}
function polygonsOf(core: GameCore): Polygon[] {
	return (core.getState().parts as { type: string }[]).filter((p) => p instanceof Polygon) as Polygon[];
}
function shapeCount(body: unknown): number {
	let count = 0;
	for (let s = (body as { GetShapeList(): unknown }).GetShapeList(); s; s = (s as { GetNext(): unknown }).GetNext()) count++;
	return count;
}
const SQUARE = [
	{ x: 0, y: 0 },
	{ x: 4, y: 0 },
	{ x: 4, y: 4 },
	{ x: 0, y: 4 },
];

// --- Data model + tessellation ---------------------------------------------
describe("Polygon bézier data model + tessellation", () => {
	it("a default (no-handle) polygon is all-VERTEX and NOT curved", () => {
		const poly = new Polygon(SQUARE.map((v) => new b2Vec2(v.x, v.y)));
		expect(poly.pointTypes).toEqual([0, 0, 0, 0]);
		expect(poly.pointTypes.every((t) => t === Polygon.POINT_VERTEX)).toBe(true);
		expect(poly.isCurved()).toBe(false);
		// Every handle offset is zero.
		for (let i = 0; i < 4; i++) {
			expect(poly.handlesIn[i].x).toBe(0);
			expect(poly.handlesIn[i].y).toBe(0);
			expect(poly.handlesOut[i].x).toBe(0);
			expect(poly.handlesOut[i].y).toBe(0);
		}
	});

	it("tessellateRing of an all-VERTEX ring is byte-identical to the control verts", () => {
		const zero = SQUARE.map(() => ({ x: 0, y: 0 }));
		const ring = Polygon.tessellateRing(SQUARE, zero, zero, Polygon.BEZIER_SAMPLES);
		expect(ring.length).toBe(SQUARE.length);
		for (let i = 0; i < SQUARE.length; i++) {
			expect(ring[i].x).toBe(SQUARE[i].x);
			expect(ring[i].y).toBe(SQUARE[i].y);
		}
	});

	it("GetTessellatedVertices == GetVertices for a straight polygon", () => {
		const poly = new Polygon(SQUARE.map((v) => new b2Vec2(v.x, v.y)));
		const g = poly.GetVertices();
		const t = poly.GetTessellatedVertices();
		expect(t.length).toBe(g.length);
		for (let i = 0; i < g.length; i++) {
			expect(t[i].x).toBeCloseTo(g[i].x, 9);
			expect(t[i].y).toBeCloseTo(g[i].y, 9);
		}
	});

	it("a curved segment tessellates into many samples through the correct cubic", () => {
		// One curved edge (vertex 0 → 1) via handles; others straight.
		const hIn = SQUARE.map(() => ({ x: 0, y: 0 }));
		const hOut = SQUARE.map(() => ({ x: 0, y: 0 }));
		hOut[0] = { x: 1, y: 2 }; // outgoing from (0,0)
		hIn[1] = { x: -1, y: 2 }; // incoming to (4,0)
		const ring = Polygon.tessellateRing(SQUARE, hIn, hOut, 8);
		// The curved edge contributes 8 points (start + 7 interior); the 3 straight
		// edges contribute 1 start point each → 8 + 3 = 11.
		expect(ring.length).toBe(11);
		// Midpoint (t=0.5) of the cubic P0=(0,0) C1=(1,2) C2=(3,2) P3=(4,0):
		// x = .125*0 + .375*1 + .375*3 + .125*4 = 2, y = .375*2 + .375*2 = 1.5
		const mid = ring[4]; // start(0) + samples 1..7 -> index 4 is t=0.5 (s=4/8)
		expect(mid.x).toBeCloseTo(2, 9);
		expect(mid.y).toBeCloseTo(1.5, 9);
	});

	it("winding flip keeps handle arrays aligned + swaps in/out roles", () => {
		// SQUARE listed CLOCKWISE (negative signed area) → the ctor reverses it. Put a
		// distinctive outgoing handle on the first listed vertex and check it survives
		// the reversal as the (swapped) incoming handle on that same geometric vertex.
		const cw = [
			{ x: 0, y: 0 },
			{ x: 0, y: 4 },
			{ x: 4, y: 4 },
			{ x: 4, y: 0 },
		];
		const hIn = cw.map(() => ({ x: 0, y: 0 }));
		const hOut = cw.map(() => ({ x: 0, y: 0 }));
		hOut[0] = { x: 3, y: 1 };
		const poly = new Polygon(
			cw.map((v) => new b2Vec2(v.x, v.y)),
			0,
			[Polygon.POINT_ASYMMETRIC, 0, 0, 0],
			hIn,
			hOut,
		);
		// The (0,0) vertex now lives somewhere in the reversed ring; its OUT handle
		// became an IN handle (offset vector unchanged).
		const idx = poly.vertices.findIndex((v) => v.x === 0 && v.y === 0);
		expect(idx).toBeGreaterThanOrEqual(0);
		expect(poly.pointTypes[idx]).toBe(Polygon.POINT_ASYMMETRIC);
		expect(poly.handlesIn[idx].x).toBeCloseTo(3, 9);
		expect(poly.handlesIn[idx].y).toBeCloseTo(1, 9);
		expect(poly.handlesOut[idx].x).toBe(0);
	});
});

// --- Pen-tool create (createPolygon carrying handles) ----------------------
describe("createPolygon with bézier handles (pen-tool click-drag)", () => {
	it("builds a curved Polygon carrying the per-vertex handles + types", () => {
		const core = sandboxCore();
		core.dispatch({
			type: "createPolygon",
			verts: SQUARE,
			pointTypes: [Polygon.POINT_SYMMETRIC, 0, 0, 0],
			handlesIn: [{ x: -1, y: 0 }, null, null, null],
			handlesOut: [{ x: 1, y: 0 }, null, null, null],
		});
		const polys = polygonsOf(core);
		expect(polys.length).toBe(1);
		const p = polys[0];
		expect(p.pointTypes[0]).toBe(Polygon.POINT_SYMMETRIC);
		expect(p.handlesOut[0].x).toBeCloseTo(1, 6);
		expect(p.isCurved()).toBe(true);
		// The tessellated outline is denser than the 4 control verts.
		expect(p.GetTessellatedVertices().length).toBeGreaterThan(4);
	});

	it("a handle-less createPolygon is byte-identical to a straight polygon", () => {
		const core = sandboxCore();
		core.dispatch({ type: "createPolygon", verts: SQUARE });
		const p = polygonsOf(core)[0];
		expect(p.isCurved()).toBe(false);
		expect(p.GetTessellatedVertices().length).toBe(4);
	});

	it("rejects a bézier ring whose tessellated curve self-crosses", () => {
		const core = sandboxCore();
		// Bottom edge 0→1 gets opposed handles (C1 far RIGHT of P3, C2 far LEFT of
		// P0) so the single cubic forms a LOOP — the tessellated ring self-crosses.
		core.dispatch({
			type: "createPolygon",
			verts: SQUARE,
			pointTypes: [Polygon.POINT_ASYMMETRIC, Polygon.POINT_ASYMMETRIC, 0, 0],
			handlesOut: [{ x: 8, y: 2 }, null, null, null],
			handlesIn: [null, { x: -8, y: 2 }, null, null],
		});
		expect(polygonsOf(core).length).toBe(0);
	});
});

// --- Point-type toggling ----------------------------------------------------
describe("editPolygonPoint point-type toggling", () => {
	function curvedSquareCore(): GameCore {
		const core = sandboxCore();
		core.dispatch({ type: "createPolygon", verts: SQUARE });
		return core;
	}

	it("toggling to SYMMETRIC seeds mirrored handles (in == -out)", () => {
		const core = curvedSquareCore();
		const id = polygonsOf(core)[0].id;
		core.dispatch({ type: "editPolygonPoint", partId: id, index: 0, pointType: Polygon.POINT_SYMMETRIC });
		const p = polygonsOf(core)[0];
		expect(p.pointTypes[0]).toBe(Polygon.POINT_SYMMETRIC);
		expect(p.handlesIn[0].x).toBeCloseTo(-p.handlesOut[0].x, 9);
		expect(p.handlesIn[0].y).toBeCloseTo(-p.handlesOut[0].y, 9);
		expect(p.isCurved()).toBe(true);
	});

	it("dragging one SYMMETRIC handle mirrors the other", () => {
		const core = curvedSquareCore();
		const id = polygonsOf(core)[0].id;
		core.dispatch({ type: "editPolygonPoint", partId: id, index: 0, pointType: Polygon.POINT_SYMMETRIC });
		core.dispatch({ type: "editPolygonPoint", partId: id, index: 0, handleOut: { x: 1.5, y: -0.5 } });
		const p = polygonsOf(core)[0];
		expect(p.handlesOut[0].x).toBeCloseTo(1.5, 9);
		expect(p.handlesOut[0].y).toBeCloseTo(-0.5, 9);
		expect(p.handlesIn[0].x).toBeCloseTo(-1.5, 9);
		expect(p.handlesIn[0].y).toBeCloseTo(0.5, 9);
	});

	it("ASYMMETRIC handles move independently (no mirroring)", () => {
		const core = curvedSquareCore();
		const id = polygonsOf(core)[0].id;
		core.dispatch({ type: "editPolygonPoint", partId: id, index: 0, pointType: Polygon.POINT_ASYMMETRIC });
		// Handles pointing into the interior (up-right from corner (0,0)) keep the
		// ring simple; the point is whether the two handles move INDEPENDENTLY.
		core.dispatch({ type: "editPolygonPoint", partId: id, index: 0, handleOut: { x: 1, y: 0.5 } });
		core.dispatch({ type: "editPolygonPoint", partId: id, index: 0, handleIn: { x: 0.5, y: 1 } });
		const p = polygonsOf(core)[0];
		expect(p.handlesOut[0].x).toBeCloseTo(1, 9);
		expect(p.handlesOut[0].y).toBeCloseTo(0.5, 9);
		// Editing handleIn on an ASYMMETRIC point does NOT mirror/overwrite handleOut.
		expect(p.handlesIn[0].x).toBeCloseTo(0.5, 9);
		expect(p.handlesIn[0].y).toBeCloseTo(1, 9);
	});

	it("toggling to VERTEX clears both handles", () => {
		const core = curvedSquareCore();
		const id = polygonsOf(core)[0].id;
		core.dispatch({ type: "editPolygonPoint", partId: id, index: 0, pointType: Polygon.POINT_SYMMETRIC });
		expect(polygonsOf(core)[0].isCurved()).toBe(true);
		core.dispatch({ type: "editPolygonPoint", partId: id, index: 0, pointType: Polygon.POINT_VERTEX });
		const p = polygonsOf(core)[0];
		expect(p.pointTypes[0]).toBe(Polygon.POINT_VERTEX);
		expect(p.handlesIn[0].x).toBe(0);
		expect(p.handlesIn[0].y).toBe(0);
		expect(p.handlesOut[0].x).toBe(0);
		expect(p.handlesOut[0].y).toBe(0);
		expect(p.isCurved()).toBe(false);
	});

	it("moving a vertex + undo/redo round-trips through history", () => {
		const core = curvedSquareCore();
		const id = polygonsOf(core)[0].id;
		core.dispatch({ type: "editPolygonPoint", partId: id, index: 2, x: 9, y: 9 });
		expect(polygonsOf(core)[0].vertices[2].x).toBeCloseTo(9, 6);
		core.dispatch({ type: "undo" });
		expect(polygonsOf(core)[0].vertices[2].x).toBeCloseTo(4, 6);
		core.dispatch({ type: "redo" });
		expect(polygonsOf(core)[0].vertices[2].x).toBeCloseTo(9, 6);
	});

	it("add / remove points (remove refused below 3 vertices)", () => {
		const core = curvedSquareCore();
		const id = polygonsOf(core)[0].id;
		core.dispatch({ type: "addPolygonPoint", partId: id, index: 0, x: 2, y: -2 });
		expect(polygonsOf(core)[0].numVertices()).toBe(5);
		core.dispatch({ type: "removePolygonPoint", partId: id, index: 0 });
		expect(polygonsOf(core)[0].numVertices()).toBe(4);
		// A triangle can't lose another point.
		core.dispatch({ type: "removePolygonPoint", partId: id, index: 0 });
		core.dispatch({ type: "removePolygonPoint", partId: id, index: 0 });
		expect(polygonsOf(core)[0].numVertices()).toBe(3);
		core.dispatch({ type: "removePolygonPoint", partId: id, index: 0 });
		expect(polygonsOf(core)[0].numVertices()).toBe(3); // refused
	});
});

// --- Curved collision via tessellation → ear-clip ---------------------------
describe("curved Polygon collision tessellates into triangle fixtures", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	it("a straight polygon stays a single convex shape (regression)", () => {
		setPhysicsBackend(box2d20Backend);
		const core = sandboxCore();
		core.dispatch({ type: "createPolygon", verts: SQUARE });
		const p = polygonsOf(core)[0];
		core.dispatch({ type: "play" });
		expect(p.GetLocalVertices().length).toBe(4);
		expect(shapeCount(p.GetBody())).toBe(1);
	});

	it("a curved polygon builds a DENSE tessellated outline + many triangle fixtures", () => {
		setPhysicsBackend(box2d20Backend);
		const core = sandboxCore();
		core.dispatch({
			type: "createPolygon",
			verts: SQUARE,
			pointTypes: [Polygon.POINT_SYMMETRIC, 0, Polygon.POINT_SYMMETRIC, 0],
			handlesIn: [{ x: -1.5, y: 0 }, null, { x: 1.5, y: 0 }, null],
			handlesOut: [{ x: 1.5, y: 0 }, null, { x: -1.5, y: 0 }, null],
		});
		const p = polygonsOf(core)[0];
		core.dispatch({ type: "play" });
		expect(p.GetShape()).not.toBeNull();
		// m_localVertices (the drawn outline) is only populated at Init/play; it is
		// the DENSE tessellated ring (> 4 control verts), ear-clipped into (n-2) fixtures.
		const outlineLen = p.GetLocalVertices().length;
		expect(outlineLen).toBeGreaterThan(4);
		expect(shapeCount(p.GetBody())).toBe(outlineLen - 2);
	});
});

// --- Serialization round-trip ----------------------------------------------
describe("bézier Polygon serialization round-trip", () => {
	it("round-trips handles + point types", async () => {
		const poly = new Polygon(
			SQUARE.map((v) => new b2Vec2(v.x, v.y)),
			0,
			[Polygon.POINT_SYMMETRIC, Polygon.POINT_ASYMMETRIC, 0, 0],
			[{ x: -1, y: 0.5 }, { x: 0.2, y: 0.3 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
			[{ x: 1, y: -0.5 }, { x: -0.4, y: 0.1 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
		);
		const decoded = await decodeRobot(await encodeRobot([poly]));
		const p = decoded.parts[0] as Polygon;
		expect(p.type).toBe("Polygon");
		expect(p.pointTypes).toEqual([Polygon.POINT_SYMMETRIC, Polygon.POINT_ASYMMETRIC, 0, 0]);
		expect(p.handlesIn[0].x).toBeCloseTo(-1, 5);
		expect(p.handlesIn[0].y).toBeCloseTo(0.5, 5);
		expect(p.handlesOut[0].x).toBeCloseTo(1, 5);
		expect(p.handlesOut[1].x).toBeCloseTo(-0.4, 5);
		expect(p.isCurved()).toBe(true);
	});

	it("BACKWARD COMPAT: a handle-less (legacy) polygon loads as all-VERTEX straight", async () => {
		const poly = new Polygon([new b2Vec2(0, 0), new b2Vec2(4, 0), new b2Vec2(2, 4)]);
		// Strip the bézier fields to mimic a pre-bézier serialization (absent on AMF).
		delete (poly as unknown as { handlesIn?: unknown }).handlesIn;
		delete (poly as unknown as { handlesOut?: unknown }).handlesOut;
		delete (poly as unknown as { pointTypes?: unknown }).pointTypes;
		const decoded = await decodeRobot(await encodeRobot([poly]));
		const p = decoded.parts[0] as Polygon;
		expect(p.pointTypes.every((t) => t === Polygon.POINT_VERTEX)).toBe(true);
		expect(p.isCurved()).toBe(false);
		expect(p.GetTessellatedVertices().length).toBe(3);
	});
});
