// Core⇄view contract — STATE
//
// The single source of truth the core owns. The renderer reads a snapshot of
// this each frame to draw; the Vue + Nuxt UI mirrors the view-relevant slices
// into a Pinia store (reactively) to render chrome. Nothing outside the core
// mutates it — all changes go through Command dispatch. See docs/CONTRACT.md.

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
}

export function createInitialState(): GameState {
	return {
		parts: [],
		sim: { phase: "editing", frame: 0 },
		camera: { scale: 30, offsetX: 0, offsetY: 0 },
		edit: { selection: [], tool: "select", editable: true, canUndo: false, canRedo: false, selectedPart: null },
	};
}
