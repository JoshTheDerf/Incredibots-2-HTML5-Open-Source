// IB3 sandbox ground — geometry, bounds, water default, and auto-detect on
// import/load.
//
// IB3 lays its sandbox out completely differently from IB2 (Control/Ground.as
// TYPESIZES): LAND is an asymmetric SHORE (a left land slab + a lower right
// beach + a slope + rounded caps), ISLAND is a symmetric 2W platform, both with
// their WALK SURFACE at y=-1 — vs IB2's y=12 platform. An imported IB3 bot is
// positioned in IB3 world coordinates, so it only lands correctly on IB3-shaped
// ground. `groundStyle` selects the geometry; the IB3 importer sets it and it is
// persisted (with an IB3-engine fallback for old saves), independent of engine.

import { describe, expect, it } from "vitest";
import {
	buildTerrainParts,
	computeBounds,
	defaultWaterHeight,
	groundTopY,
	GROUND_STYLE_IB2,
	GROUND_STYLE_IB3,
	SIZE_SMALL,
	SIZE_MEDIUM,
	SIZE_LARGE,
	SIZE_XLARGE,
	TERRAIN_LAND,
	TERRAIN_ISLAND,
	TERRAIN_BOX,
	TERRAIN_EMPTY,
} from "../src/core/sandboxEnvironment";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { Triangle } from "../src/Parts/Triangle";
import type { Part } from "../src/Parts/Part";
import { ByteArray } from "../src/General/ByteArray";
import { decodeIB3FromByteArray } from "../src/core/ib3Import";
import { decodeRobot, encodeRobot } from "../src/core/robotSerialization";
import { SandboxSettings } from "../src/Game/SandboxSettings";

function isSandbox(p: Part): boolean {
	return (p as { isSandbox?: boolean }).isSandbox === true;
}

describe("IB3 ground geometry (Control/Ground.as TYPESIZES)", () => {
	it("IB3 LAND is a SHORE: 2 rects + 3 circles + 1 triangle at the IB3 coords (SMALL, W=100)", () => {
		const parts = buildTerrainParts({ terrainType: TERRAIN_LAND, size: SIZE_SMALL, groundStyle: GROUND_STYLE_IB3 });
		expect(parts.length).toBe(6);
		parts.forEach((p) => {
			expect(p.isStatic).toBe(true);
			expect(p.isEditable).toBe(false);
			expect(isSandbox(p)).toBe(true);
			// IB3 ground is drawn from its own collision bodies (the IB2 GroundRenderer
			// can't draw SHORE/ISLAND), so it is flagged drawAnyway (unlike IB2 ground).
			expect(p.drawAnyway).toBe(true);
		});

		const r0 = parts[0] as Rectangle; // left land slab, top-left (-100,-1) 100x14
		expect(r0).toBeInstanceOf(Rectangle);
		expect([r0.x, r0.y, r0.w, r0.h]).toEqual([-100, -1, 100, 14]);
		const r1 = parts[1] as Rectangle; // right beach slab, top-left (0,5) 100x8
		expect([r1.x, r1.y, r1.w, r1.h]).toEqual([0, 5, 100, 8]);
		const c0 = parts[2] as Circle; // origin filler
		expect(c0).toBeInstanceOf(Circle);
		expect([c0.centerX, c0.centerY, c0.radius]).toEqual([0, 0, 1]);
		const tri = parts[3] as Triangle; // slope (ctor may re-wind the verts)
		expect(tri).toBeInstanceOf(Triangle);
		const verts = [
			[tri.x1, tri.y1],
			[tri.x2, tri.y2],
			[tri.x3, tri.y3],
		]
			.map((v) => v.join(","))
			.sort();
		expect(verts).toEqual(["0,-0.99", "0,5", "30,5"].sort());
		const cL = parts[4] as Circle; // left cap r7
		expect([cL.centerX, cL.centerY, cL.radius]).toEqual([-100, 6, 7]);
		const cR = parts[5] as Circle; // right cap r4
		expect([cR.centerX, cR.centerY, cR.radius]).toEqual([100, 9, 4]);
	});

	it("IB3 ISLAND is a symmetric 2W platform: 1 rect + 2 caps (SMALL)", () => {
		const parts = buildTerrainParts({ terrainType: TERRAIN_ISLAND, size: SIZE_SMALL, groundStyle: GROUND_STYLE_IB3 });
		expect(parts.length).toBe(3);
		const r = parts[0] as Rectangle;
		expect([r.x, r.y, r.w, r.h]).toEqual([-100, -1, 200, 14]); // 2W wide
		expect([(parts[1] as Circle).centerX, (parts[1] as Circle).radius]).toEqual([-100, 7]);
		expect([(parts[2] as Circle).centerX, (parts[2] as Circle).radius]).toEqual([100, 7]);
	});

	it("IB3 ground half-width scales with size (100/150/200/250)", () => {
		for (const [size, w] of [
			[SIZE_SMALL, 100],
			[SIZE_MEDIUM, 150],
			[SIZE_LARGE, 200],
			[SIZE_XLARGE, 250],
		] as const) {
			const p = buildTerrainParts({ terrainType: TERRAIN_ISLAND, size, groundStyle: GROUND_STYLE_IB3 });
			expect((p[0] as Rectangle).x).toBe(-w);
			expect((p[0] as Rectangle).w).toBe(2 * w);
		}
	});

	it("IB2 ground is unchanged when groundStyle is absent/IB2 (the default)", () => {
		const ib2 = buildTerrainParts({ terrainType: TERRAIN_LAND, size: SIZE_SMALL });
		expect(ib2.length).toBe(3); // rect + 2 circles, IB2 platform
		expect((ib2[0] as Rectangle).y).toBe(12); // IB2 surface at y=12, not -1
		const ib2b = buildTerrainParts({ terrainType: TERRAIN_LAND, size: SIZE_SMALL, groundStyle: GROUND_STYLE_IB2 });
		expect(ib2b.length).toBe(3);
	});

	it("IB3 BOX/EMPTY fall back to the IB2 tables (no IB3 box exists)", () => {
		const box = buildTerrainParts({ terrainType: TERRAIN_BOX, size: SIZE_SMALL, groundStyle: GROUND_STYLE_IB3 });
		expect(box.length).toBe(4); // IB2 box
		expect(buildTerrainParts({ terrainType: TERRAIN_EMPTY, size: SIZE_SMALL, groundStyle: GROUND_STYLE_IB3 })).toHaveLength(0);
	});
});

describe("IB3 bounds + ground-top / water default", () => {
	it("IB3 bounds are wider than IB2 and scale with size", () => {
		const ib3 = computeBounds({ size: SIZE_SMALL, terrainType: TERRAIN_LAND, groundStyle: GROUND_STYLE_IB3 });
		expect(ib3.maxX).toBe(160); // W(100)+60
		expect(ib3.minX).toBe(-160);
		// IB2 SMALL is far narrower.
		expect(computeBounds({ size: SIZE_SMALL, terrainType: TERRAIN_LAND }).maxX).toBe(50);
	});

	it("groundTopY: IB3 SHORE/ISLAND=-1, IB2 LAND=12, BOX floor=10 (15 at XLARGE), EMPTY=0", () => {
		expect(groundTopY({ terrainType: TERRAIN_LAND, size: SIZE_SMALL, groundStyle: GROUND_STYLE_IB3 })).toBe(-1);
		expect(groundTopY({ terrainType: TERRAIN_ISLAND, size: SIZE_LARGE, groundStyle: GROUND_STYLE_IB3 })).toBe(-1);
		expect(groundTopY({ terrainType: TERRAIN_LAND, size: SIZE_SMALL })).toBe(12);
		expect(groundTopY({ terrainType: TERRAIN_BOX, size: SIZE_SMALL })).toBe(10);
		expect(groundTopY({ terrainType: TERRAIN_BOX, size: SIZE_XLARGE })).toBe(15);
		expect(groundTopY({ terrainType: TERRAIN_EMPTY, size: SIZE_SMALL })).toBe(0);
	});

	it("default water height sits at the ground top so water never floods above it", () => {
		// IB2 default sandbox (SMALL LAND, top y=12): water default is 12, NOT the
		// old flat 0 that sat 12 units above the land.
		expect(defaultWaterHeight({ terrainType: TERRAIN_LAND, size: SIZE_SMALL })).toBe(12);
		expect(createInitialState().sandbox.water.height).toBe(12);
		// IB3 SHORE default is at its own surface (-1).
		expect(defaultWaterHeight({ terrainType: TERRAIN_LAND, size: SIZE_SMALL, groundStyle: GROUND_STYLE_IB3 })).toBe(-1);
	});

	it("changing terrain reseeds the (disabled) water height to the new ground top", () => {
		const core = new GameCore();
		expect(core.getState().sandbox.water.height).toBe(12); // SMALL LAND top
		core.dispatch({
			type: "setSandboxSettings",
			gravity: 15, size: SIZE_SMALL, terrainType: TERRAIN_BOX,
			terrainTheme: 0, background: 0, backgroundR: 0, backgroundG: 0, backgroundB: 0,
		});
		expect(core.getState().sandbox.water.height).toBe(10); // BOX floor top
	});
});

describe("groundStyle auto-detect on import + persistence on load", () => {
	/** Minimal uncompressed IB3 stream (version, type, parts vector, settings, meta). */
	function ib3Bytes(settings: Record<string, unknown>): ByteArray {
		const b = new ByteArray();
		b.writeUTF("0.00.33b");
		b.writeInt(0);
		b.writeObject([]); // no parts
		b.writeObject(settings);
		b.writeUTF(""); b.writeUTF(""); b.writeUTF(""); b.writeUTF(""); b.writeUTF("");
		b.writeInt(0); b.writeInt(1);
		b.position = 0;
		return b;
	}

	it("an IB3 import sets groundStyle=IB3 and physicsEngine=IB3", () => {
		const r = decodeIB3FromByteArray(ib3Bytes({ size: 0, groundType: 0, gravityY: 15 }));
		expect(r.robot.settings.groundStyle).toBe(SandboxSettings.GROUND_STYLE_IB3);
		expect(r.robot.settings.physicsEngine).toBe(SandboxSettings.ENGINE_IB3);
	});

	it("groundStyle round-trips through robot save/load", async () => {
		// Encode a design whose sandbox is IB3-ground but engine 0 (proving ground
		// style is persisted independently of the physics engine).
		const settings = new SandboxSettings(15, SIZE_SMALL, TERRAIN_LAND, 0, 0, 0, 0, 0);
		settings.groundStyle = SandboxSettings.GROUND_STYLE_IB3;
		settings.physicsEngine = SandboxSettings.ENGINE_IB2;
		const code = await encodeRobot([new Rectangle(0, 0, 2, 2)], settings);
		const decoded = await decodeRobot(code);
		expect(decoded.settings.groundStyle).toBe(GROUND_STYLE_IB3);
		expect(decoded.settings.physicsEngine).toBe(SandboxSettings.ENGINE_IB2);
	});

	it("an old IB3-ENGINE save with no groundStyle field is auto-detected as IB3 ground", () => {
		// Simulate a pre-field save: engine 1, groundStyle absent.
		const r = decodeIB3FromByteArray(ib3Bytes({ size: 0, groundType: 1, gravityY: 15 }));
		// (IB3 imports always set it, but the deserializers' physicsEngine===1
		// fallback is what protects legacy Jaybit codes saved as engine 1.)
		expect(r.robot.settings.groundStyle).toBe(SandboxSettings.GROUND_STYLE_IB3);
	});
});

describe("import focuses the camera on the bulk of the parts", () => {
	/** A compressed IB3 robot code with the given circle part descriptors. */
	async function ib3RobotCode(circles: { x: number; y: number; radius: number }[]): Promise<string> {
		const b = new ByteArray();
		b.writeUTF("0.00.33b");
		b.writeInt(0);
		const parts: any = circles.map((c) => ({
			name: "Circle", x: c.x, y: c.y, radius: c.radius, angle: 0, density: 16, friction: 16,
			restitution: 12, collA: true, collB: true, collC: true, collD: true, buoyant: true,
			draggable: true, fixated: false, color: 0xff0000, opacity: 200, outlines: true,
		}));
		parts.type = 16; parts.fixed = false; parts.toString = () => "[Vector.<Parts.Part>]";
		b.writeObject(parts);
		b.writeObject({ size: 0, groundType: 0, gravityY: 15 });
		b.writeUTF(""); b.writeUTF(""); b.writeUTF(""); b.writeUTF(""); b.writeUTF("");
		b.writeInt(0); b.writeInt(1);
		await b.compress();
		b.position = 0;
		return b.buffer.toString("base64");
	}

	it("pans the camera to the area-weighted centroid of the imported robot", async () => {
		// Two equal circles at x=0 and x=100 (both y=-4): area-weighted centre (50,-4).
		const code = await ib3RobotCode([
			{ x: 0, y: -4, radius: 2 },
			{ x: 100, y: -4, radius: 2 },
		]);
		const core = new GameCore();
		await core.importRobot(code);
		const cam = core.getState().camera;
		expect(cam.offsetX / cam.scale).toBeCloseTo(50, 3);
		expect(cam.offsetY / cam.scale).toBeCloseTo(-4, 3);
	});

	it("a big part dominates the focus over a small far-off one (bulk, not bbox centre)", async () => {
		// A big r=6 circle at x=0 + a tiny r=1 circle at x=200. The bbox centre is
		// x=100, but the AREA-weighted centre is heavily pulled toward the big one.
		const code = await ib3RobotCode([
			{ x: 0, y: 0, radius: 6 },
			{ x: 200, y: 0, radius: 1 },
		]);
		const core = new GameCore();
		await core.importRobot(code);
		const cam = core.getState().camera;
		const focusX = cam.offsetX / cam.scale;
		expect(focusX).toBeGreaterThan(0);
		expect(focusX).toBeLessThan(20); // nowhere near the bbox centre of 100
	});
});

describe("importing an IB3 design rebuilds the IB3 sandbox ground", () => {
	function ib3Code(settings: Record<string, unknown>): ByteArray {
		const b = new ByteArray();
		b.writeUTF("0.00.33b");
		b.writeInt(0);
		b.writeObject([]);
		b.writeObject(settings);
		b.writeUTF(""); b.writeUTF(""); b.writeUTF(""); b.writeUTF(""); b.writeUTF("");
		b.writeInt(0); b.writeInt(1);
		b.position = 0;
		return b;
	}

	it("import via the byte path yields the IB3 SHORE ground for the design's size", () => {
		const decoded = decodeIB3FromByteArray(ib3Code({ size: 1, groundType: 0, gravityY: 15 }));
		// The importer flagged IB3; buildTerrainParts must now produce IB3 SHORE geom.
		expect(decoded.robot.settings.groundStyle).toBe(SandboxSettings.GROUND_STYLE_IB3);
		const ground = buildTerrainParts({
			terrainType: decoded.robot.settings.terrainType,
			size: decoded.robot.settings.size,
			groundStyle: decoded.robot.settings.groundStyle,
		});
		expect(ground.length).toBe(6); // SHORE: 2 rects + 3 circles + 1 triangle
		expect((ground[0] as Rectangle).x).toBe(-150); // MEDIUM W=150
		expect((ground[0] as Rectangle).y).toBe(-1); // IB3 surface
	});
});
