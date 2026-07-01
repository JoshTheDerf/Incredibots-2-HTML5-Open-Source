// CHARACTERIZATION — sandbox environment (terrain bodies, bounds, gravity, settings).
//
// Pins the ported sandbox environment to the legacy values documented in
// docs/PORT-SPEC-sandbox.md and the source (ControllerSandbox.BuildGround
// :46-203, GetMinX/MaxX/MinY/MaxY :680-714, GetGravity :716; SandboxSettings.ts;
// createController.ts:37). Verifies terrain body count/geometry/fixture flags
// per SandboxSettings, the world-bounds table, gravity default + deferral, and
// the setSandboxSettings round-trip.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import {
	buildTerrainParts,
	computeBounds,
	DEFAULT_SANDBOX_SETTINGS,
	SIZE_SMALL,
	SIZE_MEDIUM,
	SIZE_LARGE,
	TERRAIN_LAND,
	TERRAIN_BOX,
	TERRAIN_EMPTY,
} from "../src/core/sandboxEnvironment";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import type { Part } from "../src/Parts/Part";

// --- terrain body geometry (ControllerSandbox.BuildGround :46-203) ------------

/** Every ground part is flagged static / non-editable / not-drawn / isSandbox. */
function expectGroundFlags(p: Part): void {
	expect(p.isStatic).toBe(true);
	expect(p.isEditable).toBe(false);
	expect(p.drawAnyway).toBe(false);
	expect((p as { isSandbox?: boolean }).isSandbox).toBe(true);
}

describe("terrain collision bodies — LAND", () => {
	it("SMALL LAND: 1 rect + 2 circles at the legacy coords", () => {
		const parts = buildTerrainParts({ terrainType: TERRAIN_LAND, size: SIZE_SMALL });
		expect(parts.length).toBe(3);
		parts.forEach(expectGroundFlags);

		const rect = parts[0] as Rectangle;
		expect(rect).toBeInstanceOf(Rectangle);
		// Rectangle(-39.7, 12, 79.4, 6): (nx,ny) top-left, centre = (nx+w/2, ny+h/2).
		expect(rect.x).toBe(-39.7);
		expect(rect.y).toBe(12);
		expect(rect.w).toBe(79.4);
		expect(rect.h).toBe(6);
		expect(rect.centerX).toBeCloseTo(0, 6);
		expect(rect.centerY).toBe(15);

		const cl = parts[1] as Circle;
		const cr = parts[2] as Circle;
		expect(cl).toBeInstanceOf(Circle);
		expect(cl.centerX).toBe(-39.4);
		expect(cl.centerY).toBe(15);
		expect(cl.radius).toBe(3);
		expect(cr.centerX).toBe(39.4);
		expect(cr.radius).toBe(3);
	});

	it("MEDIUM LAND: rect (-119.5,12,239,9) + circles r=4.5 at ±119", () => {
		const parts = buildTerrainParts({ terrainType: TERRAIN_LAND, size: SIZE_MEDIUM });
		expect(parts.length).toBe(3);
		const rect = parts[0] as Rectangle;
		expect([rect.x, rect.y, rect.w, rect.h]).toEqual([-119.5, 12, 239, 9]);
		expect((parts[1] as Circle).centerX).toBe(-119);
		expect((parts[1] as Circle).centerY).toBe(16.5);
		expect((parts[1] as Circle).radius).toBe(4.5);
		expect((parts[2] as Circle).centerX).toBe(119);
	});

	it("LARGE LAND: rect (-247.7,12,495.4,12.5) + circles r=6.25 (checkLimits=false so r survives)", () => {
		const parts = buildTerrainParts({ terrainType: TERRAIN_LAND, size: SIZE_LARGE });
		expect(parts.length).toBe(3);
		const rect = parts[0] as Rectangle;
		expect([rect.x, rect.y, rect.w, rect.h]).toEqual([-247.7, 12, 495.4, 12.5]);
		const cl = parts[1] as Circle;
		// r=6.25 exceeds Circle.MAX_RADIUS (5); checkLimits=false keeps it (spec §2.1).
		expect(cl.radius).toBe(6.25);
		expect(cl.centerX).toBe(-247.4);
		expect(cl.centerY).toBe(18.25);
		expect((parts[2] as Circle).centerX).toBe(247.4);
	});
});

describe("terrain collision bodies — BOX / EMPTY", () => {
	it("SMALL BOX: 4 rectangles at the legacy coords", () => {
		const parts = buildTerrainParts({ terrainType: TERRAIN_BOX, size: SIZE_SMALL });
		expect(parts.length).toBe(4);
		parts.forEach(expectGroundFlags);
		parts.forEach((p) => expect(p).toBeInstanceOf(Rectangle));
		const coords = (parts as Rectangle[]).map((r) => [r.x, r.y, r.w, r.h]);
		expect(coords).toEqual([
			[-60, -45, 120, 20],
			[-60, -40, 20, 80],
			[40, -40, 20, 80],
			[-60, 10, 120, 20],
		]);
	});

	it("MEDIUM BOX + LARGE BOX have 4 rects each with legacy coords", () => {
		const med = buildTerrainParts({ terrainType: TERRAIN_BOX, size: SIZE_MEDIUM }) as Rectangle[];
		expect(med.map((r) => [r.x, r.y, r.w, r.h])).toEqual([
			[-170, -120, 340, 40],
			[-170, -120, 40, 170],
			[130, -120, 40, 170],
			[-170, 10, 340, 40],
		]);
		const lrg = buildTerrainParts({ terrainType: TERRAIN_BOX, size: SIZE_LARGE }) as Rectangle[];
		expect(lrg.map((r) => [r.x, r.y, r.w, r.h])).toEqual([
			[-300, -180, 600, 40],
			[-300, -180, 40, 230],
			[260, -180, 40, 230],
			[-300, 10, 600, 40],
		]);
	});

	it("EMPTY: no ground bodies at any size (spec §2.3)", () => {
		expect(buildTerrainParts({ terrainType: TERRAIN_EMPTY, size: SIZE_SMALL })).toHaveLength(0);
		expect(buildTerrainParts({ terrainType: TERRAIN_EMPTY, size: SIZE_MEDIUM })).toHaveLength(0);
		expect(buildTerrainParts({ terrainType: TERRAIN_EMPTY, size: SIZE_LARGE })).toHaveLength(0);
	});
});

// --- world bounds table (ControllerSandbox GetMinX/MaxX/MinY/MaxY :680-714) ---

describe("world bounds", () => {
	it("MinX/MaxX/MinY per size (LAND)", () => {
		expect(computeBounds({ size: SIZE_LARGE, terrainType: TERRAIN_LAND })).toEqual({
			minX: -280, maxX: 280, minY: -160, maxY: 160,
		});
		expect(computeBounds({ size: SIZE_MEDIUM, terrainType: TERRAIN_LAND })).toEqual({
			minX: -150, maxX: 150, minY: -100, maxY: 100,
		});
		expect(computeBounds({ size: SIZE_SMALL, terrainType: TERRAIN_LAND })).toEqual({
			minX: -50, maxX: 50, minY: -30, maxY: 40,
		});
	});

	it("MaxY is tighter for BOX (SMALL=15 else 30); EMPTY matches LAND", () => {
		expect(computeBounds({ size: SIZE_SMALL, terrainType: TERRAIN_BOX }).maxY).toBe(15);
		expect(computeBounds({ size: SIZE_MEDIUM, terrainType: TERRAIN_BOX }).maxY).toBe(30);
		expect(computeBounds({ size: SIZE_LARGE, terrainType: TERRAIN_BOX }).maxY).toBe(30);
		expect(computeBounds({ size: SIZE_LARGE, terrainType: TERRAIN_EMPTY }).maxY).toBe(160);
	});
});

// --- default settings + initial state (createController.ts:37) ----------------

describe("default sandbox settings + initial state", () => {
	it("default is gravity 15, SMALL, LAND, GRASS, SKY", () => {
		expect(DEFAULT_SANDBOX_SETTINGS).toMatchObject({
			gravity: 15.0,
			size: SIZE_SMALL,
			terrainType: TERRAIN_LAND,
			terrainTheme: 0,
			background: 0,
			backgroundR: 0,
			backgroundG: 0,
			backgroundB: 0,
		});
	});

	it("createInitialState seeds the default sandbox + its SMALL-LAND terrain bodies", () => {
		const state = createInitialState();
		expect(state.sandbox.gravity).toBe(15);
		expect(state.sandbox.bounds).toEqual({ minX: -50, maxX: 50, minY: -30, maxY: 40 });
		// SMALL LAND == 1 rect + 2 circles; all are the isSandbox terrain.
		expect(state.parts).toHaveLength(3);
		expect(state.parts.every((p) => (p as { isSandbox?: boolean }).isSandbox)).toBe(true);
	});

	it("GameCore assigns ids to the seeded terrain parts", () => {
		const core = new GameCore();
		const ids = core.getState().parts.map((p) => p.id);
		expect(ids).toEqual([1, 2, 3]);
	});
});

// --- setSandboxSettings command round-trip + terrain rebuild ------------------

describe("setSandboxSettings command", () => {
	it("stores settings, recomputes bounds, and rebuilds terrain (editing phase)", () => {
		const core = new GameCore();
		core.dispatch({
			type: "setSandboxSettings",
			gravity: 8,
			size: SIZE_LARGE,
			terrainType: TERRAIN_BOX,
			terrainTheme: 3,
			background: 6,
			backgroundR: 10,
			backgroundG: 20,
			backgroundB: 30,
		});
		const s = core.getState();
		expect(s.sandbox).toMatchObject({
			gravity: 8, size: SIZE_LARGE, terrainType: TERRAIN_BOX, terrainTheme: 3,
			background: 6, backgroundR: 10, backgroundG: 20, backgroundB: 30,
		});
		// LARGE BOX bounds.
		expect(s.sandbox.bounds).toEqual({ minX: -280, maxX: 280, minY: -160, maxY: 30 });
		// LARGE BOX terrain == 4 rectangles; the old 3 SMALL-LAND parts are gone.
		expect(s.parts).toHaveLength(4);
		expect(s.parts.every((p) => p instanceof Rectangle)).toBe(true);
	});

	it("EMPTY terrain removes all ground bodies but keeps robot parts", () => {
		// Seed a core with a robot rectangle plus default terrain.
		const core = new GameCore();
		const robot = new Rectangle(0, 0, 2, 2); // not isSandbox
		robot.id = 999;
		core.getState().parts.push(robot);
		core.dispatch({
			type: "setSandboxSettings",
			gravity: 15, size: SIZE_MEDIUM, terrainType: TERRAIN_EMPTY,
			terrainTheme: 0, background: 0, backgroundR: 0, backgroundG: 0, backgroundB: 0,
		});
		const parts = core.getState().parts;
		// No terrain left; the robot part survives.
		expect(parts.filter((p) => (p as { isSandbox?: boolean }).isSandbox)).toHaveLength(0);
		expect(parts.filter((p) => p.id === 999)).toHaveLength(1);
	});

	it("is a no-op during simulation (Apply is edit-time only)", () => {
		const core = new GameCore();
		core.dispatch({ type: "play" });
		core.dispatch({
			type: "setSandboxSettings",
			gravity: 3, size: SIZE_LARGE, terrainType: TERRAIN_LAND,
			terrainTheme: 0, background: 0, backgroundR: 0, backgroundG: 0, backgroundB: 0,
		});
		// Settings unchanged while running.
		expect(core.getState().sandbox.gravity).toBe(15);
		expect(core.getState().sandbox.size).toBe(SIZE_SMALL);
	});
});

// --- gravity is deferred to next play (createWorld reads sandbox.gravity) ------

describe("gravity applies at world creation, not live", () => {
	it("changing gravity then playing uses the NEW gravity vector", () => {
		const core = new GameCore();
		core.dispatch({
			type: "setSandboxSettings",
			gravity: 30, size: SIZE_SMALL, terrainType: TERRAIN_EMPTY,
			terrainTheme: 0, background: 0, backgroundR: 0, backgroundG: 0, backgroundB: 0,
		});
		core.dispatch({ type: "play" });
		const g = core.getState().world!.m_gravity;
		expect(g.x).toBe(0);
		expect(g.y).toBe(30);
	});

	it("default gravity world vector is (0, 15)", () => {
		const core = new GameCore();
		core.dispatch({ type: "play" });
		const g = core.getState().world!.m_gravity;
		expect(g.y).toBe(15);
	});
});

// --- a placed shape rests on the ground when simulated -------------------------

describe("placed shape rests on the ground", () => {
	it("a circle dropped above SMALL-LAND ground settles above the terrain surface", () => {
		// Default core has SMALL LAND terrain (rect top surface at y=12).
		const core = new GameCore();
		const ball = new Circle(0, 0, 1); // centre (0,0), well above the ground
		ball.id = 500;
		core.getState().parts.push(ball);

		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 240 });

		const body = ball.GetBody()!;
		const y = body.GetPosition().y;
		// It fell (y increased from 0) but was stopped by the ground (didn't pass
		// through the terrain surface near y~12). Resting centre ~ 11 (surface - r).
		expect(y).toBeGreaterThan(5);
		expect(y).toBeLessThan(13);
	});
});
