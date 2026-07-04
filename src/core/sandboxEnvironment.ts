// Sandbox terrain + world-bounds builder — headless, Pixi-free.
//
// A faithful port of ControllerSandbox.BuildGround()'s STATIC PHYSICS BODIES
// (src/Game/ControllerSandbox.ts:37-203) and its world-bounds getters
// (GetMinX/MaxX/MinY/MaxY, :680-714) and gravity (GetGravity, :716-718).
//
// SCOPE: only the collision bodies + bounds + gravity — the parts the CORE must
// own. The purely-visual terrain fill (sGround, rocks, outline circles) and the
// sky (Sky.ts) are RENDERER-only and deliberately NOT built here (see
// docs/PORT-SPEC-sandbox.md §2.6, §3, §5). This module imports only from
// src/Parts, so it stays node-clean for the check:core gate.

import { Circle } from "../Parts/Circle";
import type { Part } from "../Parts/Part";
import { Rectangle } from "../Parts/Rectangle";
import { Triangle } from "../Parts/Triangle";
import type { SandboxState } from "./GameState";
import { defaultWaterState } from "./waterSystem";

// SandboxSettings.* enum values, inlined so the core doesn't depend on the
// (Pixi-adjacent) src/Game module (SandboxSettings.ts:11-33).
export const SIZE_SMALL = 0;
export const SIZE_MEDIUM = 1;
export const SIZE_LARGE = 2;
// IB3 Ground.XLARGE (IB3 Control/Ground.as:25).
export const SIZE_XLARGE = 3;

export const TERRAIN_LAND = 0;
export const TERRAIN_BOX = 1;
export const TERRAIN_EMPTY = 2;
// IB3 Ground.ISLAND (IB3 Control/Ground.as:17) — a centered platform. IB2 LAND
// is already a symmetric rounded platform, so ISLAND reuses the LAND geometry
// (distinct enum for faithful round-trip).
export const TERRAIN_ISLAND = 3;

export const BACKGROUND_SOLID_COLOUR = 6;

// --- ground STYLE: which game's sandbox geometry to build --------------------
// IB2 (the classic Box2DFlash port) and IB3 lay their sandbox ground out
// COMPLETELY differently — different width, a different surface height (IB2's
// land surface sits at y=12, IB3's at y=-1), and IB3's LAND is an asymmetric
// beach ("SHORE") rather than IB2's symmetric platform. An imported IB3 bot is
// positioned in IB3 world coordinates, so it only lands correctly on IB3-shaped
// ground. `groundStyle` selects the geometry table; it is auto-set to IB3 by the
// IB3 importer and persisted, INDEPENDENT of the physics engine (an IB3 design
// may be simulated on engine 0/1/2 but must keep IB3 ground).
export const GROUND_STYLE_IB2 = 0;
export const GROUND_STYLE_IB3 = 1;

// IB3 ground half-width per size (Control/Ground.as TYPESIZES rect |x|), indexed
// by SIZE_SMALL..SIZE_XLARGE. SHORE spans [-W,W]; ISLAND is a 2W-wide platform.
const IB3_HALF: readonly number[] = [100, 150, 200, 250];

/** Clamp a size enum into [0,3] for the IB3 tables. */
function ib3SizeIndex(size: number): number {
	return size < 0 ? 0 : size > 3 ? 3 : Math.trunc(size);
}

/**
 * Terrain top-fill colour per theme (0-6), RGB — ported from
 * ControllerSandbox.terrainTopColours (:15). In the legacy game this coloured
 * the purely-visual `sGround` fill; the actual collision parts were invisible
 * (drawAnyway=false) and drawn by that fill. This port does NOT reproduce the
 * elaborate sGround fill/rocks (renderer-only, spec §2.6); instead it colours
 * the collision bodies themselves with the theme's top colour so the renderer
 * (Draw) shows recognisable ground (grass green by default) rather than the raw
 * default part colour (red). Grass(0)=#65CD4E; the rest are the source literals.
 */
const TERRAIN_TOP_RGB: ReadonlyArray<readonly [number, number, number]> = [
	[101, 205, 78], // 0 grass (#65CD4E)
	[191, 131, 83], // 1 dirt
	[214, 189, 100], // 2 sand
	[181, 197, 201], // 3 rock
	[224, 238, 253], // 4 snow
	[198, 196, 205], // 5 moon
	[249, 172, 101], // 6 mars
];

/** The canonical sandbox default (createController.ts:37): gravity 15, SMALL, LAND, GRASS, SKY. */
export const DEFAULT_SANDBOX_SETTINGS = {
	gravity: 15.0,
	// IB3 superset, default off/classic: no horizontal gravity, RES_HIGHEST restitution.
	gravityX: 0,
	restitutionType: 0,
	size: SIZE_SMALL,
	terrainType: TERRAIN_LAND,
	terrainTheme: 0,
	background: 0,
	backgroundR: 0,
	backgroundG: 0,
	backgroundB: 0,
	// Native sandbox is IB2-shaped ground; IB3 imports flip this to GROUND_STYLE_IB3.
	groundStyle: GROUND_STYLE_IB2,
} as const;

/**
 * Flag a freshly-built ground part exactly as BuildGround does
 * (ControllerSandbox.ts:48-52 etc): static, non-editable, not drawn on its own,
 * and — crucially — `isSandbox=true`. The isSandbox marker is what makes the
 * ContactFilter short-circuit ShouldCollide to true so terrain collides with
 * everything (ContactFilter.ts:9; fixtures set userData.isSandbox in
 * Rectangle.ts:170 / Circle.ts:99).
 */
function markGround(p: Part, theme: number): Part {
	p.isStatic = true;
	p.isEditable = false;
	p.drawAnyway = false;
	p.isSandbox = true;
	// Colour the collision body with the theme's top colour so the renderer draws
	// recognisable ground (see TERRAIN_TOP_RGB note). ShapePart carries red/green/
	// blue; ground uses no outline so it reads as a solid fill.
	const rgb = TERRAIN_TOP_RGB[theme] ?? TERRAIN_TOP_RGB[0];
	const sp = p as unknown as { red: number; green: number; blue: number; outline: boolean };
	sp.red = rgb[0];
	sp.green = rgb[1];
	sp.blue = rgb[2];
	sp.outline = false;
	return p;
}

/**
 * Build the static terrain collision bodies for the given settings, matching
 * ControllerSandbox.BuildGround (ControllerSandbox.ts:46-203). LAND = a flat
 * Rectangle + two end-cap Circles; BOX = a 4-Rectangle closed box; EMPTY builds
 * nothing. The exact coordinates/dimensions per size are the legacy literals.
 *
 * NOTE the constructor conventions: Rectangle(nx, ny, nw, nh, checkLimits=false)
 * takes (nx,ny) as the TOP-LEFT corner (Rectangle.ts:20,43-44); Circle(cx, cy,
 * r, checkLimits?) takes (cx,cy) as the CENTER (Circle.ts:14). All ground
 * rectangles pass checkLimits=false; LARGE circles pass false (r=6.25 exceeds
 * the [0.1,5] clamp), MEDIUM/SMALL circles omit it (default true) — faithful to
 * the source. The resulting bodies are identical either way (drawAnyway=false).
 */
export function buildTerrainParts(
	settings: Pick<SandboxState, "terrainType" | "size"> & { terrainTheme?: number; groundStyle?: number },
): Part[] {
	const parts: Part[] = [];
	const { terrainType, size } = settings;
	const theme = settings.terrainTheme ?? 0;
	const groundStyle = settings.groundStyle ?? GROUND_STYLE_IB2;
	const g = (p: Part) => markGround(p, theme);

	// IB3 ground (Control/Ground.as TYPESIZES): LAND -> SHORE (asymmetric beach),
	// ISLAND -> a symmetric 2W platform. Surface top is y=-1 for both, so imported
	// IB3 bots (positioned in IB3 world coords) rest correctly. BOX/EMPTY have no
	// IB3 geometry, so they fall through to the IB2 tables below (BOX) / nothing.
	// sRect(x,y,w,h) -> Rectangle top-left (x,y); sCircle(x,y,r) -> Circle centre;
	// sTria -> Triangle by 3 verts. All ground shapes bypass the size clamps.
	if (groundStyle === GROUND_STYLE_IB3 && (terrainType === TERRAIN_LAND || terrainType === TERRAIN_ISLAND)) {
		const w = IB3_HALF[ib3SizeIndex(size)];
		// The IB2 GroundRenderer (a bespoke sGround gradient/rock visual) can't draw
		// the IB3 SHORE/ISLAND shape, so instead the IB3 ground is drawn from its OWN
		// collision bodies: flag them drawAnyway so Draw.DrawWorld paints them (as
		// solid theme-coloured terrain at the exact IB3 positions), and suppress the
		// IB2 GroundRenderer for this style (see groundRenderer.ts). g3 adds that flag.
		const g3 = (p: Part) => {
			const q = markGround(p, theme);
			q.drawAnyway = true;
			return q;
		};
		if (terrainType === TERRAIN_ISLAND) {
			// TYPESIZES[ISLAND][size]: one 2W-wide slab + two r=7 end caps.
			parts.push(g3(new Rectangle(-w, -1, 2 * w, 14, false)));
			parts.push(g3(new Circle(-w, 6, 7, false)));
			parts.push(g3(new Circle(w, 6, 7, false)));
		} else {
			// TYPESIZES[SHORE][size]: left land slab (top y=-1) + lower right beach
			// slab (top y=5) + a slope triangle bridging them + rounded end caps + a
			// small filler circle at the origin joint.
			parts.push(g3(new Rectangle(-w, -1, w, 14, false)));
			parts.push(g3(new Rectangle(0, 5, w, 8, false)));
			parts.push(g3(new Circle(0, 0, 1, false)));
			parts.push(g3(new Triangle(0, -0.99, 0, 5, 30, 5)));
			parts.push(g3(new Circle(-w, 6, 7, false)));
			parts.push(g3(new Circle(w, 9, 4, false)));
		}
		return parts;
	}

	// ISLAND reuses LAND geometry (IB2 LAND is already a centered platform).
	if (terrainType === TERRAIN_LAND || terrainType === TERRAIN_ISLAND) {
		if (size === SIZE_XLARGE) {
			// IB3 XLARGE world — LARGE geometry scaled ~1.5x horizontally.
			parts.push(g(new Rectangle(-371.55, 12, 743.1, 12.5, false)));
			parts.push(g(new Circle(-371.1, 18.25, 6.25, false)));
			parts.push(g(new Circle(371.1, 18.25, 6.25, false)));
		} else if (size === SIZE_LARGE) {
			parts.push(g(new Rectangle(-247.7, 12, 495.4, 12.5, false)));
			parts.push(g(new Circle(-247.4, 18.25, 6.25, false)));
			parts.push(g(new Circle(247.4, 18.25, 6.25, false)));
		} else if (size === SIZE_MEDIUM) {
			parts.push(g(new Rectangle(-119.5, 12, 239, 9, false)));
			parts.push(g(new Circle(-119, 16.5, 4.5)));
			parts.push(g(new Circle(119, 16.5, 4.5)));
		} else {
			parts.push(g(new Rectangle(-39.7, 12, 79.4, 6, false)));
			parts.push(g(new Circle(-39.4, 15, 3)));
			parts.push(g(new Circle(39.4, 15, 3)));
		}
	} else if (terrainType === TERRAIN_BOX) {
		if (size === SIZE_XLARGE) {
			// IB3 XLARGE box — LARGE box scaled ~1.5x.
			parts.push(g(new Rectangle(-450, -270, 900, 60, false)));
			parts.push(g(new Rectangle(-450, -270, 60, 345, false)));
			parts.push(g(new Rectangle(390, -270, 60, 345, false)));
			parts.push(g(new Rectangle(-450, 15, 900, 60, false)));
		} else if (size === SIZE_LARGE) {
			parts.push(g(new Rectangle(-300, -180, 600, 40, false)));
			parts.push(g(new Rectangle(-300, -180, 40, 230, false)));
			parts.push(g(new Rectangle(260, -180, 40, 230, false)));
			parts.push(g(new Rectangle(-300, 10, 600, 40, false)));
		} else if (size === SIZE_MEDIUM) {
			parts.push(g(new Rectangle(-170, -120, 340, 40, false)));
			parts.push(g(new Rectangle(-170, -120, 40, 170, false)));
			parts.push(g(new Rectangle(130, -120, 40, 170, false)));
			parts.push(g(new Rectangle(-170, 10, 340, 40, false)));
		} else {
			parts.push(g(new Rectangle(-60, -45, 120, 20, false)));
			parts.push(g(new Rectangle(-60, -40, 20, 80, false)));
			parts.push(g(new Rectangle(40, -40, 20, 80, false)));
			parts.push(g(new Rectangle(-60, 10, 120, 20, false)));
		}
	}
	// TERRAIN_EMPTY: no branch in BuildGround — no ground bodies (spec §2.3).

	return parts;
}

/**
 * The camera-clamp / cloud-spawn world extent for a size + terrainType,
 * faithful to ControllerSandbox.GetMinX/MaxX/MinY/MaxY (:680-714). MaxY depends
 * on terrainType: BOX clamps tighter (SMALL=15 else 30); otherwise it scales
 * with size (LARGE=160 / MEDIUM=100 / SMALL=40).
 */
export function computeBounds(
	settings: Pick<SandboxState, "size" | "terrainType"> & { groundStyle?: number },
): { minX: number; maxX: number; minY: number; maxY: number } {
	const { size, terrainType } = settings;
	// IB3 has no camera clamp (free camera). Give a generous extent that contains
	// the (much larger) IB3 ground plus room to fly, scaled with the half-width.
	if ((settings.groundStyle ?? GROUND_STYLE_IB2) === GROUND_STYLE_IB3) {
		const w = IB3_HALF[ib3SizeIndex(size)];
		return { minX: -(w + 60), maxX: w + 60, minY: -(w + 60), maxY: 60 + ib3SizeIndex(size) * 20 };
	}
	// XLARGE extends the LARGE clamp ~1.5x (matches the scaled terrain above).
	const minX = size === SIZE_XLARGE ? -420 : size === SIZE_LARGE ? -280 : size === SIZE_MEDIUM ? -150 : -50;
	const maxX = size === SIZE_XLARGE ? 420 : size === SIZE_LARGE ? 280 : size === SIZE_MEDIUM ? 150 : 50;
	const minY = size === SIZE_XLARGE ? -240 : size === SIZE_LARGE ? -160 : size === SIZE_MEDIUM ? -100 : -30;
	let maxY: number;
	if (terrainType === TERRAIN_BOX) {
		maxY = size === SIZE_SMALL ? 15 : 30;
	} else {
		maxY = size === SIZE_XLARGE ? 240 : size === SIZE_LARGE ? 160 : size === SIZE_MEDIUM ? 100 : 40;
	}
	return { minX, maxX, minY, maxY };
}

/**
 * The world-Y of the ground's WALK/REST surface for a given sandbox — the level
 * a fresh water surface should default to so water never covers the ground top
 * (water fills y > height, +y down). IB3 SHORE/ISLAND top out at y=-1; IB2 LAND/
 * ISLAND at y=12; a BOX's floor top is y=10 (y=15 at XLARGE); EMPTY has no ground
 * (0, an arbitrary level). Used to seed the default water height per shape.
 */
export function groundTopY(
	settings: Pick<SandboxState, "terrainType" | "size"> & { groundStyle?: number },
): number {
	const { terrainType, size } = settings;
	if (terrainType === TERRAIN_EMPTY) return 0;
	if ((settings.groundStyle ?? GROUND_STYLE_IB2) === GROUND_STYLE_IB3 && terrainType !== TERRAIN_BOX) {
		return -1; // IB3 SHORE / ISLAND surface
	}
	if (terrainType === TERRAIN_BOX) return size === SIZE_XLARGE ? 15 : 10; // box floor top
	return 12; // IB2 LAND / ISLAND slab top
}

/**
 * The default water surface height for a sandbox: the ground's top surface, so
 * that enabling water starts it level with the ground rather than flooding above
 * it (the old flat default of 0 sat 12 units ABOVE every IB2 land surface). The
 * user still freely edits the height afterward via the water panel.
 */
export function defaultWaterHeight(
	settings: Pick<SandboxState, "terrainType" | "size"> & { groundStyle?: number },
): number {
	return groundTopY(settings);
}

/** A fresh default SandboxState (SMALL/LAND/GRASS/SKY, gravity 15) with bounds. */
export function createDefaultSandboxState(): SandboxState {
	const base = { ...DEFAULT_SANDBOX_SETTINGS };
	// physicsEngine defaults to 0 (IB2 / Box2DFlash 2.0.2) — the classic engine.
	// Seed the (disabled) water surface at the ground top so a first enable of
	// water doesn't submerge the terrain.
	return {
		...base,
		bounds: computeBounds(base),
		water: { ...defaultWaterState(), height: defaultWaterHeight(base) },
		physicsEngine: 0,
	};
}
