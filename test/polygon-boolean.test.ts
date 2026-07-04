// Unit tests for the self-contained polygon boolean-difference engine
// (src/core/polygonBoolean.ts) that backs the "Subtract Shape" editor feature.
// Pins the Greiner–Hormann difference: convex + concave results, disjoint
// multi-piece output, full-cover (empty) and no-overlap (unchanged) cases, and
// a degeneracy that the jitter retry must recover from.

import { describe, expect, it } from "vitest";
import {
	polygonDifference,
	largestPiece,
	polygonArea,
	pointInPolygon,
	isSimpleRing,
	type Vec2,
} from "../src/core/polygonBoolean";

function sq(x: number, y: number, w: number, h: number): Vec2[] {
	return [
		{ x, y },
		{ x: x + w, y },
		{ x: x + w, y: y + h },
		{ x, y: y + h },
	];
}

describe("polygonDifference — basic overlaps", () => {
	it("subtracting an overlapping corner leaves a single L / notched piece", () => {
		// 4x4 square minus a 2x2 square overlapping its top-right corner.
		const target = sq(0, 0, 4, 4); // area 16
		const cutter = sq(3, 3, 2, 2); // overlaps a 1x1 corner (area 1 removed)
		const pieces = polygonDifference(target, cutter);
		expect(pieces).not.toBeNull();
		expect(pieces!.length).toBe(1);
		const piece = pieces![0];
		expect(polygonArea(piece)).toBeCloseTo(15, 6);
		// The notch makes it concave (6 vertices, not a rectangle).
		expect(isSimpleRing(piece)).toBe(true);
	});

	it("cutting a bar straight through splits the target into TWO disjoint pieces", () => {
		// A vertical bar cut across the middle of a wide short rectangle yields
		// a left piece and a right piece.
		const target = sq(0, 0, 6, 2); // area 12
		const cutter = sq(2, -1, 2, 4); // full-height vertical bar x in [2,4]
		const pieces = polygonDifference(target, cutter);
		expect(pieces).not.toBeNull();
		expect(pieces!.length).toBe(2);
		const total = pieces!.reduce((s, r) => s + polygonArea(r), 0);
		// Removed the middle 2x2 band (area 4) → 8 remaining across two pieces.
		expect(total).toBeCloseTo(8, 6);
		const largest = largestPiece(pieces!)!;
		expect(polygonArea(largest)).toBeCloseTo(4, 6);
	});

	it("a subtrahend that fully covers the target returns an EMPTY result", () => {
		const target = sq(1, 1, 2, 2);
		const cutter = sq(-5, -5, 20, 20);
		const pieces = polygonDifference(target, cutter);
		expect(pieces).toEqual([]);
	});

	it("a disjoint (non-overlapping) subtrahend leaves the target unchanged", () => {
		const target = sq(0, 0, 2, 2);
		const cutter = sq(10, 10, 2, 2);
		const pieces = polygonDifference(target, cutter);
		expect(pieces).not.toBeNull();
		expect(pieces!.length).toBe(1);
		expect(polygonArea(pieces![0])).toBeCloseTo(4, 6);
	});

	it("a strictly-interior subtrahend (a hole) is reported as the unchanged outer boundary", () => {
		// We cannot represent a hole with a single simple polygon, so the outer
		// boundary comes back unchanged; the command layer detects the unchanged
		// area and treats it as a no-op fallback.
		const target = sq(0, 0, 10, 10);
		const cutter = sq(4, 4, 2, 2);
		const pieces = polygonDifference(target, cutter);
		expect(pieces).not.toBeNull();
		expect(pieces!.length).toBe(1);
		expect(polygonArea(pieces![0])).toBeCloseTo(100, 6);
	});
});

describe("polygonDifference — concave inputs", () => {
	it("subtracts a rectangle from a concave chevron and stays simple", () => {
		// Concave chevron (the notch at (2,1) points inward), area is the 4x4
		// square minus the notch triangle.
		const chevron: Vec2[] = [
			{ x: 0, y: 0 },
			{ x: 2, y: 1 },
			{ x: 4, y: 0 },
			{ x: 4, y: 4 },
			{ x: 0, y: 4 },
		];
		const cutter = sq(3, 2, 3, 3); // clips the top-right area
		const pieces = polygonDifference(chevron, cutter);
		expect(pieces).not.toBeNull();
		expect(pieces!.length).toBeGreaterThanOrEqual(1);
		for (const r of pieces!) expect(isSimpleRing(r)).toBe(true);
		// Some area was removed.
		const total = pieces!.reduce((s, r) => s + polygonArea(r), 0);
		expect(total).toBeLessThan(polygonArea(chevron));
	});
});

describe("polygonDifference — degeneracy handling", () => {
	it("recovers (via jitter retry) when subtrahend edges are collinear with the target's", () => {
		// The cutter shares the target's right/top edges exactly (x=4 and the
		// corner at (4,4)) — a general-position violation for Greiner–Hormann.
		const target = sq(0, 0, 4, 4);
		const cutter = sq(2, 2, 2, 2); // top-right quadrant, edges collinear with target
		const pieces = polygonDifference(target, cutter);
		expect(pieces).not.toBeNull();
		for (const r of pieces!) expect(isSimpleRing(r)).toBe(true);
		const total = pieces!.reduce((s, r) => s + polygonArea(r), 0);
		// Removed the 2x2 quadrant (area 4) → 12 remaining.
		expect(total).toBeCloseTo(12, 4);
	});
});

describe("helpers", () => {
	it("pointInPolygon classifies inside/outside", () => {
		const s = sq(0, 0, 4, 4);
		expect(pointInPolygon({ x: 2, y: 2 }, s)).toBe(true);
		expect(pointInPolygon({ x: 5, y: 2 }, s)).toBe(false);
	});

	it("polygonArea is the absolute shoelace area regardless of winding", () => {
		const ccw = sq(0, 0, 3, 2);
		const cw = [...ccw].reverse();
		expect(polygonArea(ccw)).toBeCloseTo(6, 6);
		expect(polygonArea(cw)).toBeCloseTo(6, 6);
	});
});
