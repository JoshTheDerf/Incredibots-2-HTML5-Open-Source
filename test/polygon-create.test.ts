// Polygon CREATE command — the new IB2/Jaybit editor polygon-draw tool.
//
// The multi-click gesture (GameCanvas newPolygon) accumulates an ordered, convex
// vertex ring and dispatches `createPolygon`. This pins GameCore's handling of
// that command: it builds ONE convex Polygon part with the expected vertices +
// area, selects it, reverts to the Select tool, is undoable through the normal
// history path, and rejects degenerate (non-convex / too-few-vertex) rings.
//
// IB3 v0.00.33b has no interactive polygon draw tool (polygons only arrive via
// import/copy — PolygonPart.as), so there's no legacy behaviour to characterize;
// this is a faithful new gesture whose CORE contract is tested here (the pointer
// gesture itself is covered by typecheck + vite build).

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Polygon } from "../src/Parts/Polygon";
import type { Part } from "../src/Parts/Part";

function sandboxCore(): GameCore {
	return new GameCore(createInitialState());
}

function polygonsOf(core: GameCore): Polygon[] {
	return (core.getState().parts as Part[]).filter((p) => p instanceof Polygon) as Polygon[];
}

describe("createPolygon", () => {
	it("builds one convex Polygon with the expected vertices + area, and selects it", () => {
		const core = sandboxCore();
		const before = core.getState().parts.length;

		// A 4x4 axis-aligned square (area 16), wound CCW-in-math.
		const verts = [
			{ x: 0, y: 0 },
			{ x: 4, y: 0 },
			{ x: 4, y: 4 },
			{ x: 0, y: 4 },
		];
		core.dispatch({ type: "createPolygon", verts });

		const polys = polygonsOf(core);
		expect(polys.length).toBe(1);
		expect(core.getState().parts.length).toBe(before + 1);

		const poly = polys[0];
		expect(poly.numVertices()).toBe(4);
		// Shoelace area of the 4x4 square.
		expect(poly.GetArea()).toBeCloseTo(16, 6);
		// Centre is the vertex average (2,2).
		expect(poly.centerX).toBeCloseTo(2, 6);
		expect(poly.centerY).toBeCloseTo(2, 6);

		// The new part is the sole selection + selectedPart, and the tool reverted
		// to Select (matching every other shape create).
		const st = core.getState();
		expect(st.edit.selection).toEqual([poly.id]);
		expect(st.edit.selectedPart?.kind).toBe("Polygon");
		expect(st.edit.tool).toBe("select");
	});

	it("undo removes the created polygon; redo restores it", () => {
		const core = sandboxCore();
		const before = core.getState().parts.length;
		core.dispatch({
			type: "createPolygon",
			verts: [
				{ x: 0, y: 0 },
				{ x: 3, y: 0 },
				{ x: 3, y: 2 },
				{ x: 0, y: 2 },
			],
		});
		expect(polygonsOf(core).length).toBe(1);

		core.dispatch({ type: "undo" });
		expect(polygonsOf(core).length).toBe(0);
		expect(core.getState().parts.length).toBe(before);

		core.dispatch({ type: "redo" });
		expect(polygonsOf(core).length).toBe(1);
		expect(core.getState().parts.length).toBe(before + 1);
	});

	it("rejects a NON-CONVEX ring (no part created)", () => {
		const core = sandboxCore();
		const before = core.getState().parts.length;
		// Classic concave 'arrow' quad: (0,0),(4,0),(1,1),(4,4) is not convex.
		core.dispatch({
			type: "createPolygon",
			verts: [
				{ x: 0, y: 0 },
				{ x: 4, y: 0 },
				{ x: 1, y: 1 },
				{ x: 4, y: 4 },
			],
		});
		expect(polygonsOf(core).length).toBe(0);
		expect(core.getState().parts.length).toBe(before);
	});

	it("rejects a ring with fewer than 3 vertices", () => {
		const core = sandboxCore();
		core.dispatch({
			type: "createPolygon",
			verts: [
				{ x: 0, y: 0 },
				{ x: 2, y: 0 },
			],
		});
		expect(polygonsOf(core).length).toBe(0);
	});

	it("accepts the maximum vertex count and rejects more than the cap", () => {
		const core = sandboxCore();
		// A convex regular octagon (Polygon.MAX_VERTICES == b2_maxPolygonVertices == 8).
		const n = Polygon.MAX_VERTICES;
		const octagon = Array.from({ length: n }, (_, i) => {
			const a = (2 * Math.PI * i) / n;
			return { x: 5 * Math.cos(a), y: 5 * Math.sin(a) };
		});
		core.dispatch({ type: "createPolygon", verts: octagon });
		expect(polygonsOf(core).length).toBe(1);
		expect(polygonsOf(core)[0].numVertices()).toBe(n);

		// One more vertex than the cap is refused.
		const tooMany = Array.from({ length: n + 1 }, (_, i) => {
			const a = (2 * Math.PI * i) / (n + 1);
			return { x: 6 * Math.cos(a), y: 6 * Math.sin(a) };
		});
		core.dispatch({ type: "createPolygon", verts: tooMany });
		expect(polygonsOf(core).length).toBe(1); // still just the octagon
	});
});
