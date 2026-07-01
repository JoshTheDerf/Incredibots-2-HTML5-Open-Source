// Core⇄view contract — STATE
//
// The single source of truth the core owns. The renderer reads a snapshot of
// this each frame to draw; the Vue + Nuxt UI mirrors the view-relevant slices
// into a Pinia store (reactively) to render chrome. Nothing outside the core
// mutates it — all changes go through Command dispatch. See docs/CONTRACT.md.

import type { b2World } from "../Box2D";
import type { Part } from "../Parts/Part";

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
	 * The live Box2D world while a simulation is running/paused; null while
	 * editing. Like `parts`, this is a live object (not plain-serializable) held
	 * here so the renderer can read body transforms via Draw.DrawWorld. When the
	 * core is moved behind a worker boundary this becomes a sim-side handle.
	 */
	world: b2World | null;
}

export function createInitialState(): GameState {
	return {
		parts: [],
		sim: { phase: "editing", frame: 0 },
		camera: { scale: 30, offsetX: 0, offsetY: 0 },
		edit: { selection: [], tool: "select", editable: true, canUndo: false, canRedo: false, selectedPart: null },
		world: null,
	};
}
