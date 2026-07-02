// REGRESSION GUARD — setSandboxSettings runtime behaviour (Bug 3).
//
// A prior diagnosis found the setSandboxSettings pipeline faithful but could not
// rule out a swallowed runtime throw. This test drives GameCore directly:
// fresh state -> setSandboxSettings changing background, size and terrainType ->
// asserts (a) it does NOT throw, (b) state.sandbox reflects the new fields,
// (c) bounds recomputed, (d) terrain parts rebuilt (count/positions change for a
// size change) and the old terrain replaced (no duplicate isSandbox parts).

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import {
	SIZE_SMALL,
	SIZE_LARGE,
	TERRAIN_LAND,
	TERRAIN_BOX,
} from "../src/core/sandboxEnvironment";
import { Rectangle } from "../src/Parts/Rectangle";

function isSandbox(p: unknown): boolean {
	return (p as { isSandbox?: boolean }).isSandbox === true;
}

describe("setSandboxSettings — Bug 3 regression guard", () => {
	it("does not throw, applies the new fields, rebuilds bounds + terrain, no dup terrain", () => {
		const core = new GameCore(); // fresh default: SMALL LAND (3 terrain parts)
		const before = core.getState();
		expect(before.sandbox.size).toBe(SIZE_SMALL);
		expect(before.sandbox.terrainType).toBe(TERRAIN_LAND);
		const beforeTerrain = before.parts.filter(isSandbox);
		expect(beforeTerrain.length).toBe(3); // SMALL LAND = 1 rect + 2 circles
		const beforeCoords = beforeTerrain.map((p) => `${(p as Rectangle).x},${(p as Rectangle).y}`);

		// (a) Must NOT throw.
		expect(() =>
			core.dispatch({
				type: "setSandboxSettings",
				gravity: 20,
				size: SIZE_LARGE,
				terrainType: TERRAIN_BOX,
				terrainTheme: 2,
				background: 4,
				backgroundR: 11,
				backgroundG: 22,
				backgroundB: 33,
			}),
		).not.toThrow();

		const after = core.getState();

		// (b) state.sandbox reflects the new fields.
		expect(after.sandbox).toMatchObject({
			gravity: 20,
			size: SIZE_LARGE,
			terrainType: TERRAIN_BOX,
			terrainTheme: 2,
			background: 4,
			backgroundR: 11,
			backgroundG: 22,
			backgroundB: 33,
		});

		// (c) bounds recomputed for LARGE BOX (maxY tighter for BOX).
		expect(after.sandbox.bounds).toEqual({ minX: -280, maxX: 280, minY: -160, maxY: 30 });

		// (d) terrain rebuilt: LARGE BOX = 4 rectangles; count + positions changed.
		const afterTerrain = after.parts.filter(isSandbox);
		expect(afterTerrain.length).toBe(4);
		expect(afterTerrain.every((p) => p instanceof Rectangle)).toBe(true);
		const afterCoords = afterTerrain.map((p) => `${(p as Rectangle).x},${(p as Rectangle).y}`);
		expect(afterCoords).not.toEqual(beforeCoords);

		// No duplicate / leftover old terrain — the whole parts graph is exactly the
		// new terrain (there were no robot parts), and ids are unique.
		expect(after.parts.length).toBe(4);
		expect(after.parts.every(isSandbox)).toBe(true);
		const ids = after.parts.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("a size change alone rebuilds terrain to the new size and keeps robot parts", () => {
		const core = new GameCore();
		const robot = new Rectangle(0, -5, 2, 2); // not isSandbox
		robot.id = 9999;
		core.getState().parts.push(robot);

		expect(() =>
			core.dispatch({
				type: "setSandboxSettings",
				gravity: 15,
				size: SIZE_LARGE,
				terrainType: TERRAIN_LAND,
				terrainTheme: 0,
				background: 0,
				backgroundR: 0,
				backgroundG: 0,
				backgroundB: 0,
			}),
		).not.toThrow();

		const parts = core.getState().parts;
		// LARGE LAND is still 1 rect + 2 circles, but at LARGE coords (positions change).
		const terrain = parts.filter(isSandbox);
		expect(terrain.length).toBe(3);
		const largeRect = terrain[0] as Rectangle;
		expect([largeRect.x, largeRect.y, largeRect.w, largeRect.h]).toEqual([-247.7, 12, 495.4, 12.5]);
		// Robot part survives, exactly once.
		expect(parts.filter((p) => p.id === 9999)).toHaveLength(1);
	});
});
