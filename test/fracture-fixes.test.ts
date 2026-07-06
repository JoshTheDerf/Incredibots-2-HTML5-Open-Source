// Regression tests for three fracture-subsystem bugs fixed together:
//   1. Fragments never collided with each other (shared negative groupIndex).
//   2. Fracturing a CONCAVE polygon dropped most of its area (Voronoi cells that
//      straddled a notch were rejected wholesale instead of clipped to the ring).
//   3. Sub-fracturing a fragment shattered a PHANTOM shape far from where the
//      fragment was drawn (rest outline captured against a moved body transform).

import { describe, expect, it } from "vitest";
import { b2Vec2 } from "../src/Box2D";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { FRACTURE_TEST, shatter } from "../src/core/fractureSystem";
import { Polygon } from "../src/Parts/Polygon";
import { Rectangle } from "../src/Parts/Rectangle";
import type { ShapePart } from "../src/Parts/ShapePart";

const { polygonArea } = FRACTURE_TEST;

function fragArea(f: ShapePart): number {
	return (f as unknown as { GetArea(): number }).GetArea();
}
function fragGroup(f: ShapePart): number {
	// Live collision-filter groupIndex of the fragment's first fixture (engine 0).
	const shapes = f.GetCollisionShapes();
	return (shapes[0] as unknown as { GetFilterData(): { groupIndex: number } }).GetFilterData().groupIndex;
}

// --- Bug 2: concave area conservation (pure geometry) ---------------------

describe("fracture bug 2: concave shapes conserve area", () => {
	function total(cells: { x: number; y: number }[][]): number {
		return cells.reduce((s, c) => s + polygonArea(c), 0);
	}

	it("a concave chevron shatters into fragments tiling ~all of its area", () => {
		const ring = [
			{ x: -4, y: -4 },
			{ x: 4, y: -4 },
			{ x: 4, y: 4 },
			{ x: 0, y: 0 }, // reflex notch -> concave
			{ x: -4, y: 4 },
		];
		const orig = polygonArea(ring); // 48
		// Both an impact by the notch and one out at a wing must conserve area
		// (pre-fix, the second impact returned ZERO fragments).
		for (const impact of [{ x: 0, y: -3 }, { x: 3, y: 3 }]) {
			const cells = shatter(ring, impact, 12, FRACTURE_TEST.mulberry32(7));
			expect(cells.length).toBeGreaterThanOrEqual(3);
			expect(total(cells)).toBeGreaterThan(orig * 0.95);
			expect(total(cells)).toBeLessThanOrEqual(orig + 1e-6);
		}
	});

	it("a concave L-shape conserves area too", () => {
		const ring = [
			{ x: 0, y: 0 },
			{ x: 6, y: 0 },
			{ x: 6, y: 2 },
			{ x: 2, y: 2 },
			{ x: 2, y: 6 },
			{ x: 0, y: 6 },
		];
		const orig = polygonArea(ring); // 20
		const cells = shatter(ring, { x: 1, y: 1 }, 12, FRACTURE_TEST.mulberry32(3));
		expect(total(cells)).toBeGreaterThan(orig * 0.95);
	});
});

// --- Bug 2 in the live sim + Bug 1 collision groups -----------------------

describe("fracture bug 1+2: live concave shatter conserves area, fragments collide", () => {
	it("concave polygon fragments tile ~all the original area and collide (groupIndex 0)", () => {
		const verts = [
			new b2Vec2(-4, -23),
			new b2Vec2(4, -23),
			new b2Vec2(4, -15),
			new b2Vec2(0, -19), // reflex notch
			new b2Vec2(-4, -15),
		];
		const poly = new Polygon(verts);
		const orig = poly.GetArea();
		expect(Polygon.isConvex(verts)).toBe(false);
		poly.fragility = 10;
		poly.id = 100000;
		const state = createInitialState();
		state.parts = [...state.parts, poly];
		const core = new GameCore(state);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 200 });
		const frags = core.getSimFragments();
		expect(frags.length).toBeGreaterThanOrEqual(3);
		const totalArea = frags.reduce((s, f) => s + fragArea(f), 0);
		// Pre-fix this was ~7% of the original; now it tiles the whole shape.
		expect(totalArea).toBeGreaterThan(orig * 0.75);
		// Bug 1: every fragment collides like a free body — groupIndex 0, NOT a
		// shared negative group (which made same-group fixtures never collide).
		for (const f of frags) expect(fragGroup(f)).toBe(0);
	});
});

// --- Bug 3: sub-fracture coordinate continuity ----------------------------

describe("fracture bug 3: re-fracturing a fragment stays where the fragment is", () => {
	it("no fragment ever teleports to a phantom location on re-fracture", () => {
		// A tall, tilted fragile bar drops, shatters, and its fragments tumble
		// (translating AND rotating) before being hit again and RE-fracturing. The
		// pre-fix bug captured a fragment's rest outline against its already-moved
		// body transform, so re-fracture built a world outline offset far from the
		// fragment — sub-fragments appeared at phantom coordinates. Assert every
		// fragment always stays within the physically-reachable region.
		const bar = new Rectangle(-0.5, -18, 1, 8); // tall thin bar, tilts on landing
		bar.angle = 0.4;
		bar.fragility = 10;
		bar.id = 100000;
		const state = createInitialState();
		state.parts = [...state.parts, bar];
		const core = new GameCore(state);
		core.dispatch({ type: "play" });

		let sawSubFracture = false;
		let prevCount = 0;
		for (let i = 0; i < 60; i++) {
			core.dispatch({ type: "step", frames: 10 });
			const frags = core.getSimFragments();
			if (frags.length > 0 && frags.length !== prevCount && prevCount > 0) sawSubFracture = true;
			prevCount = frags.length;
			for (const f of frags) {
				const b = f.GetBody();
				if (!b) continue;
				const p = b.GetPosition();
				// The whole play area is roughly x in [-30,30], y in [-30,20]. A phantom
				// re-fracture (the bug) placed shapes wildly outside this; a correct one
				// keeps every fragment near where the bar fell and settled.
				expect(Number.isFinite(p.x)).toBe(true);
				expect(Number.isFinite(p.y)).toBe(true);
				expect(Math.abs(p.x)).toBeLessThan(30);
				expect(p.y).toBeLessThan(20);
				expect(p.y).toBeGreaterThan(-30);
				// And its area is a sane sub-shape of the original bar (area 8), never a
				// giant phantom polygon reconstructed in the wrong frame.
				expect(fragArea(f)).toBeLessThan(8 + 1e-6);
			}
		}
		// The scenario actually exercised at least one re-fracture (fragment count
		// changed after the first shatter) — otherwise the test proves nothing.
		expect(sawSubFracture).toBe(true);
	});
});
