// Concave Polygon support: the polygon tool accepts concave (simple) rings and
// Polygon.Init ear-clips them into convex triangle collision fixtures on a SINGLE
// body — the drawable outline stays the true concave shape (see Draw.DrawPolygonBody),
// only the COLLISION shape is triangulated. This pins the triangulation math and
// that Init actually attaches one fixture per triangle.

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { box2d20Backend, box2d21Backend } from "../src/core/physics";
import { Box2D3Backend } from "../src/enginebox2d3/Box2D3Backend";
import { loadBox2D3 } from "../src/enginebox2d3/loadBox2D3";
import { Polygon } from "../src/Parts/Polygon";
import { b2Vec2 } from "../src/Box2D";
import { getPhysicsBackend, setPhysicsBackend } from "../src/Parts/partGlobals";

// A concave arrow-head "chevron" (5 verts): the notch at (2,1) points inward.
//   (0,0) - (2,1) - (4,0) - (4,4) - (0,4)
const CHEVRON = [
	{ x: 0, y: 0 },
	{ x: 2, y: 1 },
	{ x: 4, y: 0 },
	{ x: 4, y: 4 },
	{ x: 0, y: 4 },
];

/** Absolute shoelace area of a ring. */
function ringArea(v: { x: number; y: number }[]): number {
	let a = 0;
	for (let i = 0; i < v.length; i++) {
		const j = (i + 1) % v.length;
		a += v[i].x * v[j].y - v[j].x * v[i].y;
	}
	return Math.abs(a / 2);
}

function triArea(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
	return Math.abs(((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2);
}

describe("Polygon.isSimple / isConvex classification", () => {
	it("a convex square is both simple and convex", () => {
		const sq = [
			{ x: 0, y: 0 },
			{ x: 4, y: 0 },
			{ x: 4, y: 4 },
			{ x: 0, y: 4 },
		];
		expect(Polygon.isSimple(sq)).toBe(true);
		expect(Polygon.isConvex(sq)).toBe(true);
	});

	it("a concave chevron is simple but NOT convex", () => {
		expect(Polygon.isSimple(CHEVRON)).toBe(true);
		expect(Polygon.isConvex(CHEVRON)).toBe(false);
	});

	it("a self-crossing bow-tie is NOT simple", () => {
		const bowtie = [
			{ x: 0, y: 0 },
			{ x: 4, y: 0 },
			{ x: 0, y: 4 },
			{ x: 4, y: 4 },
		];
		expect(Polygon.isSimple(bowtie)).toBe(false);
	});
});

describe("Polygon.triangulate (ear clipping)", () => {
	it("returns n-2 triangles that tile a concave polygon with no area loss", () => {
		const tris = Polygon.triangulate(CHEVRON);
		expect(tris.length).toBe(CHEVRON.length - 2); // 3 triangles for 5 verts

		let sum = 0;
		for (const [a, b, c] of tris) {
			// Every index refers to a real polygon vertex.
			expect(a).toBeGreaterThanOrEqual(0);
			expect(c).toBeLessThan(CHEVRON.length);
			const A = CHEVRON[a];
			const B = CHEVRON[b];
			const C = CHEVRON[c];
			// CCW winding (positive signed area) so b2PolygonShape normals point out.
			const signed = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
			expect(signed).toBeGreaterThan(0);
			sum += triArea(A, B, C);
		}
		// The triangles exactly cover the polygon (no gaps, no overlap).
		expect(sum).toBeCloseTo(ringArea(CHEVRON), 6);
	});

	it("triangulates a convex n-gon into n-2 area-preserving triangles", () => {
		const n = 10;
		const ngon = Array.from({ length: n }, (_, i) => {
			const a = (2 * Math.PI * i) / n;
			return { x: 5 * Math.cos(a), y: 5 * Math.sin(a) };
		});
		const tris = Polygon.triangulate(ngon);
		expect(tris.length).toBe(n - 2);
		let sum = 0;
		for (const [a, b, c] of tris) sum += triArea(ngon[a], ngon[b], ngon[c]);
		expect(sum).toBeCloseTo(ringArea(ngon), 6);
	});
});

describe("Polygon.Init attaches one collision fixture per triangle", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	function shapeCount(body: unknown): number {
		let count = 0;
		// Engine-0 body shape list walk (b2Body.GetShapeList / b2Shape.GetNext).
		for (let s = (body as { GetShapeList(): unknown }).GetShapeList(); s; s = (s as { GetNext(): unknown }).GetNext())
			count++;
		return count;
	}

	it("a convex polygon stays a SINGLE b2 shape", () => {
		setPhysicsBackend(box2d20Backend);
		const poly = new Polygon([
			new b2Vec2(0, 0),
			new b2Vec2(4, 0),
			new b2Vec2(4, 4),
			new b2Vec2(0, 4),
		]);
		poly.id = 1;
		const state = createInitialState();
		state.parts = [poly];
		const core = new GameCore(state);
		core.dispatch({ type: "play" });

		expect(poly.GetShape()).not.toBeNull();
		expect(shapeCount(poly.GetBody())).toBe(1);
		// The renderer's local outline still has all 4 verts.
		expect(poly.GetLocalVertices().length).toBe(4);
	});

	it("a concave polygon attaches n-2 triangle fixtures on one body", () => {
		setPhysicsBackend(box2d20Backend);
		const poly = new Polygon(CHEVRON.map((v) => new b2Vec2(v.x, v.y)));
		poly.id = 1;
		const state = createInitialState();
		state.parts = [poly];
		const core = new GameCore(state);
		core.dispatch({ type: "play" });

		expect(poly.GetShape()).not.toBeNull();
		// 5-vertex concave chevron -> 3 triangle fixtures, all on the SAME body.
		expect(shapeCount(poly.GetBody())).toBe(CHEVRON.length - 2);
		// The drawn outline is still the full 5-vertex concave ring.
		expect(poly.GetLocalVertices().length).toBe(CHEVRON.length);
	});

	it("point-in-polygon (InsideShape) respects concavity", () => {
		const poly = new Polygon(CHEVRON.map((v) => new b2Vec2(v.x, v.y)));
		// A point in the notch, just above the (2,1) dent, is OUTSIDE the chevron.
		expect(poly.InsideShape(2, 0.5, 1)).toBe(false);
		// A point well inside the body is INSIDE.
		expect(poly.InsideShape(2, 3, 1)).toBe(true);
	});
});

// The concave path calls createShape MULTIPLE times per body (one per triangle);
// verify that holds up under the two newly-added engines too (the WASM build runs
// engine 2). We only assert Init + a few steps stay finite/non-throwing — the
// triangulation math is engine-agnostic and pinned above.
describe("concave Polygon Init is stable under all three engines", () => {
	let box2d3Backend: Box2D3Backend;
	beforeAll(async () => {
		box2d3Backend = new Box2D3Backend(await loadBox2D3());
	});
	afterEach(() => setPhysicsBackend(box2d20Backend));

	function runConcave(): { x: number; y: number } {
		const poly = new Polygon(CHEVRON.map((v) => new b2Vec2(v.x, v.y)));
		poly.id = 1;
		const state = createInitialState();
		state.parts = [poly];
		const core = new GameCore(state);
		core.dispatch({ type: "play" });
		expect(poly.GetShape()).not.toBeNull();
		core.dispatch({ type: "step", frames: 10 });
		return getPhysicsBackend().bodyTransform(poly.GetBody() as never);
	}

	it("engine 1 (Box2D 2.1a) Inits + steps a concave polygon", () => {
		setPhysicsBackend(box2d21Backend);
		const t = runConcave();
		expect(Number.isFinite(t.x)).toBe(true);
		expect(Number.isFinite(t.y)).toBe(true);
	});

	it("engine 2 (Box2D v3 / WASM) Inits + steps a concave polygon", () => {
		setPhysicsBackend(box2d3Backend);
		const t = runConcave();
		expect(Number.isFinite(t.x)).toBe(true);
		expect(Number.isFinite(t.y)).toBe(true);
	});
});
