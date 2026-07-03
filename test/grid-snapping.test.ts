// IB3 feature merge P4 — grid snapping quantization (src/ui/snapping.ts
// SnapToGrid/SnapPointToGrid, ported from IB3's grid quantization math at
// ib3-decompiled/scripts/Control/Graphics/GridControl.as:116-117:
// round(v / spacing) * spacing). Pure math only — the renderer half of the
// port (src/ui/renderer/gridRenderer.ts) is covered by the typecheck.

import { describe, expect, it } from "vitest";
import { SnapToGrid, SnapPointToGrid, RestrictToSquares } from "../src/ui/snapping";

describe("SnapToGrid", () => {
	it("rounds to the nearest multiple of the IB3 default spacing (2)", () => {
		// GridControl.as:46-47 — gridSpacingX/Y default 2 world units.
		expect(SnapToGrid(0, 2)).toBe(0);
		expect(SnapToGrid(0.9, 2)).toBe(0);
		expect(SnapToGrid(1.0, 2)).toBe(2); // Math.round halfway rounds up
		expect(SnapToGrid(2.9, 2)).toBe(2);
		expect(SnapToGrid(3.1, 2)).toBe(4);
		expect(SnapToGrid(-0.9, 2)).toBe(-0);
		expect(SnapToGrid(-1.1, 2)).toBe(-2);
		expect(SnapToGrid(-2.9, 2)).toBe(-2);
	});

	it("quantizes at several spacings", () => {
		expect(SnapToGrid(0.74, 0.5)).toBeCloseTo(0.5, 10);
		expect(SnapToGrid(0.76, 0.5)).toBeCloseTo(1.0, 10);
		expect(SnapToGrid(3.49, 1)).toBe(3);
		expect(SnapToGrid(3.51, 1)).toBe(4);
		expect(SnapToGrid(9.9, 4)).toBe(8);
		expect(SnapToGrid(10.1, 4)).toBe(12);
		expect(SnapToGrid(11.9, 8)).toBe(8);
		expect(SnapToGrid(12.1, 8)).toBe(16);
	});

	it("returns points already on the grid unchanged", () => {
		for (const spacing of [0.5, 1, 2, 4]) {
			for (let k = -5; k <= 5; k++) {
				expect(SnapToGrid(k * spacing, spacing)).toBeCloseTo(k * spacing, 10);
			}
		}
	});

	it("is idempotent (snapping a snapped value is a no-op)", () => {
		for (const spacing of [0.5, 1, 2, 4, 8]) {
			for (const v of [-7.3, -0.1, 0.4, 1.9, 123.456]) {
				const once = SnapToGrid(v, spacing);
				expect(SnapToGrid(once, spacing)).toBeCloseTo(once, 10);
			}
		}
	});

	it("is a pass-through for non-positive or non-finite spacing (snap disabled)", () => {
		expect(SnapToGrid(3.7, 0)).toBe(3.7);
		expect(SnapToGrid(3.7, -2)).toBe(3.7);
		expect(SnapToGrid(3.7, NaN)).toBe(3.7);
	});

	it("world-space snapping is zoom-independent (same world result at any camera scale)", () => {
		// Snapping happens in WORLD units before dispatch; the camera scale (zoom,
		// 12..75 in GameCore) only affects rendering. Simulate the funnel: a screen
		// point converted at several zooms must snap to the same world grid node.
		const worldX = 5.3;
		for (const scale of [12, 30, 75]) {
			const screen = worldX * scale; // trivial camera at origin
			const world = screen / scale;
			expect(SnapToGrid(world, 2)).toBe(6);
		}
	});
});

describe("SnapPointToGrid", () => {
	it("snaps each axis independently", () => {
		expect(SnapPointToGrid(2.9, -1.2, 2)).toEqual([2, -2]);
		expect(SnapPointToGrid(0.3, 0.3, 0.5)).toEqual([0.5, 0.5]);
	});
});

describe("composition with existing gesture helpers", () => {
	it("RestrictToSquares on grid-snapped deltas stays on the grid", () => {
		// In resolveCreateCurrent the grid snap runs FIRST, then the Shift square
		// restriction. Both anchor and cursor being grid-quantized means the
		// (dx,dy) are grid multiples, and RestrictToSquares only ever copies one
		// extent's magnitude into the other — so the corrected corner is still a
		// grid intersection.
		const spacing = 2;
		const anchor = SnapPointToGrid(4.1, -2.2, spacing); // [4, -2]
		const cursor = SnapPointToGrid(9.8, 1.4, spacing); // [10, 2]
		const [dx, dy] = RestrictToSquares(cursor[0] - anchor[0], cursor[1] - anchor[1]);
		const corner = [anchor[0] + dx, anchor[1] + dy];
		expect(SnapToGrid(corner[0], spacing)).toBeCloseTo(corner[0], 10);
		expect(SnapToGrid(corner[1], spacing)).toBeCloseTo(corner[1], 10);
	});

	it("incremental drag deltas between snapped cursor points are whole grid steps", () => {
		// The drag gesture quantizes the cursor each move and dispatches the delta
		// from the previous quantized point — every delta is a grid multiple, so a
		// part keeps its offset relative to the grid across the whole drag.
		const spacing = 0.5;
		const path = [
			{ x: 1.13, y: 2.02 },
			{ x: 1.38, y: 2.31 },
			{ x: 2.9, y: 4.75 },
			{ x: -0.2, y: 0.1 },
		];
		let last = SnapPointToGrid(path[0].x, path[0].y, spacing);
		for (let i = 1; i < path.length; i++) {
			const cur = SnapPointToGrid(path[i].x, path[i].y, spacing);
			const dx = cur[0] - last[0];
			const dy = cur[1] - last[1];
			expect(Math.abs((dx / spacing) % 1)).toBeCloseTo(0, 10);
			expect(Math.abs((dy / spacing) % 1)).toBeCloseTo(0, 10);
			last = cur;
		}
	});
});
