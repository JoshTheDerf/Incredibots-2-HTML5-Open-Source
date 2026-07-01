// Core⇄view contract — STATE
//
// The single source of truth the core owns. The renderer reads a snapshot of
// this each frame to draw; the Vue + Nuxt UI mirrors the view-relevant slices
// into a Pinia store (reactively) to render chrome. Nothing outside the core
// mutates it — all changes go through Command dispatch. See docs/CONTRACT.md.

import type { b2World } from "../Box2D";
import type { Part } from "../Parts/Part";
import type { ChallengeState } from "./challenge";
import { buildTerrainParts, createDefaultSandboxState } from "./sandboxEnvironment";

export type SimPhase = "editing" | "running" | "paused";

/**
 * A plain-data projection of a single Part for the view layer to read. Carries
 * no class instances or Pixi types so it can cross a worker boundary. `kind` is
 * the Part's `type` string (e.g. "Circle", "Rectangle", "Triangle", "TextPart").
 * Colour channels (red/green/blue) are 0-255; opacity is 0-1.
 */
export type PartSnapshot = {
	id: number;
	kind: string;
	x: number;
	y: number;
	red: number;
	green: number;
	blue: number;
	opacity: number;
	radius?: number;
	w?: number;
	h?: number;
	angle?: number;
	text?: string;
	size?: number;

	// --- per-property edit fields (read back from the live Part) ---
	// Shape (ShapePart: Circle/Rectangle/Triangle/Cannon)
	density?: number;
	collide?: boolean;
	cameraFocus?: boolean;
	/** "Fixate": maps to Part.isStatic. */
	fixate?: boolean;
	outline?: boolean;
	/** "Outlines Behind": maps to ShapePart.terrain. */
	outlineBehind?: boolean;
	undragable?: boolean;

	// Joint (RevoluteJoint / PrismaticJoint)
	/** enableMotor (revolute) / enablePiston (prismatic). */
	motorOn?: boolean;
	/** motorStrength / pistonStrength. */
	strength?: number;
	/** motorSpeed / pistonSpeed. */
	speed?: number;
	/** RevoluteJoint limits in DEGREES; null == "None" (∓Number.MAX_VALUE). */
	lowerLimit?: number | null;
	upperLimit?: number | null;
	/** Control key codes: cw/ccw for revolute, up/down for prismatic. */
	keyCW?: number;
	keyCCW?: number;
	keyUp?: number;
	keyDown?: number;
	/** Auto-on flags: autoCW/autoCCW (revolute), autoOscillate (prismatic). */
	autoCW?: boolean;
	autoCCW?: boolean;
	autoOscillate?: boolean;
	/** isStiff — the UI shows the inverse ("Floppy Joint" = !isStiff). */
	stiff?: boolean;
	/** PrismaticJoint.initLength. */
	initialLength?: number;

	// Thruster
	/** Thrusters.thrustKey code. */
	thrustKey?: number;
	/** Thrusters.autoOn / Cannon has none. */
	autoOn?: boolean;

	// Cannon
	/** Cannon.fireKey code. */
	fireKey?: number;

	// Text
	displayKey?: number;
	alwaysVisible?: boolean;
	scaleWithZoom?: boolean;
};

export interface CameraState {
	/** world→screen scale (physics scale). */
	scale: number;
	/** pan offset in screen pixels. */
	offsetX: number;
	offsetY: number;
}

export interface SimState {
	phase: SimPhase;
	/** simulation frames elapsed since play. */
	frame: number;
}

/**
 * Sandbox environment configuration — a faithful port of the legacy
 * `SandboxSettings` value object (src/Game/SandboxSettings.ts) plus the derived
 * world bounds that ControllerSandbox.GetMinX/MaxX/MinY/MaxY compute
 * (ControllerSandbox.ts:680-714). The core reads this to build the static
 * terrain bodies (see src/core/sandboxEnvironment.ts) and to pick the world
 * gravity vector at play time (`b2Vec2(0, gravity)`, ControllerSandbox.ts:716).
 * The renderer reads it to pick the sky gradient (background/RGB) and terrain
 * colours (terrainTheme). These are the SandboxSettings.* enum axes:
 *   size:        SIZE_SMALL=0, SIZE_MEDIUM=1, SIZE_LARGE=2
 *   terrainType: TERRAIN_LAND=0, TERRAIN_BOX=1, TERRAIN_EMPTY=2
 *   terrainTheme: GRASS=0, DIRT=1, SAND=2, ROCK=3, SNOW=4, MOON=5, MARS=6
 *   background:  SKY=0, SPACE=1, NIGHT=2, DUSK=3, MARS=4, SUNSET=5, SOLID_COLOUR=6
 */
export interface SandboxState {
	/** downward gravity magnitude; used as b2Vec2(0, gravity). Default 15. */
	gravity: number;
	/** world size enum (0 small / 1 medium / 2 large). */
	size: number;
	/** terrain geometry (0 land / 1 box / 2 empty). */
	terrainType: number;
	/** terrain colour theme (0-6). Cosmetic; consumed by the renderer only. */
	terrainTheme: number;
	/** sky background (0-6). Cosmetic; consumed by the renderer only. */
	background: number;
	/** 0-255 solid-colour channels, used only when background == SOLID_COLOUR (6). */
	backgroundR: number;
	backgroundG: number;
	backgroundB: number;
	/** Derived camera-clamp / cloud-spawn extent (ControllerSandbox.ts:680-714). */
	bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface EditState {
	/** ids of currently-selected parts (indexes into GameState.parts by Part id). */
	selection: number[];
	/** the active editing tool. */
	tool: string;
	/** whether the current robot is editable (challenges can lock it). */
	editable: boolean;
	/** depth of the undo / redo stacks, for enabling toolbar buttons. */
	canUndo: boolean;
	canRedo: boolean;
	/** plain-data projection of the FIRST selected part; null when none selected. */
	selectedPart: PartSnapshot | null;
}

/**
 * The authoritative game state.
 *
 * NOTE (migration): `parts` currently holds live domain-object instances
 * (the existing Part subclasses, which own their Box2D bodies). The target is
 * plain-serializable part data with the Box2D bodies held in a parallel
 * simulation map; that conversion happens incrementally. The contract shape
 * above (sim / camera / edit slices) is stable regardless.
 */
export interface GameState {
	parts: Part[];
	sim: SimState;
	camera: CameraState;
	edit: EditState;
	/**
	 * Sandbox environment config (gravity, size, terrain, background). The
	 * `isSandbox` terrain bodies in `parts` are derived from this; changing it via
	 * the setSandboxSettings command rebuilds them (editing phase only).
	 */
	sandbox: SandboxState;
	/**
	 * The live Box2D world while a simulation is running/paused; null while
	 * editing. Like `parts`, this is a live object (not plain-serializable) held
	 * here so the renderer can read body transforms via Draw.DrawWorld. When the
	 * core is moved behind a worker boundary this becomes a sim-side handle.
	 */
	world: b2World | null;
	/**
	 * Plain-data challenge read-model — win/loss conditions, restrictions, build
	 * areas, live outcome + score. null for a plain sandbox session (no challenge
	 * active). Derived from the core's live Challenge each notify; the renderer
	 * reads it to draw condition zones + build areas and the Vue panels read it
	 * for the editors. See src/core/challenge.ts.
	 */
	challenge: ChallengeState | null;
}

export function createInitialState(): GameState {
	// Seed the canonical sandbox default (SMALL/LAND/GRASS/SKY, gravity 15 —
	// createController.ts:37) and build its static terrain bodies up front so the
	// editor shows ground immediately. Ground parts carry no stable id here; the
	// GameCore assigns ids to the initial parts on construction.
	const sandbox = createDefaultSandboxState();
	return {
		parts: buildTerrainParts(sandbox),
		sim: { phase: "editing", frame: 0 },
		// Offset the view down a little (in world +Y is down) so the sandbox ground
		// surface (SMALL LAND top at y~12) sits in the lower portion of the canvas
		// rather than off the bottom edge — the editor opens looking at the build
		// area above the ground. offsetY is in screen px (screen = canvas/2 +
		// world*scale - offset), so a positive offset pans the view downward.
		camera: { scale: 30, offsetX: 0, offsetY: 250 },
		edit: { selection: [], tool: "select", editable: true, canUndo: false, canRedo: false, selectedPart: null },
		sandbox,
		world: null,
		challenge: null,
	};
}
