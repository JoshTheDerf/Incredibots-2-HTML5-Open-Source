// Core⇄view contract — COMMANDS
//
// Every mutation of game state flows through a Command. This mirrors the
// existing src/Actions/* undo/redo pattern (each editing Command will produce
// an Action pushed onto the undo stack), but gives the UI a single, serializable
// entry point that does not depend on ControllerGame or Pixi.
//
// The Vue + Nuxt UI layer dispatches these; the renderer never mutates — it only
// reads state. See docs/CONTRACT.md.

export type ToolMode =
	| "select"
	| "newCircle"
	| "newRect"
	| "newTriangle"
	| "newFixedJoint"
	| "newRevoluteJoint"
	| "newPrismaticJoint"
	| "newText"
	| "newThrusters"
	| "newCannon"
	| "rotate"
	| "resize";

export type ShapeKind = "circle" | "rect" | "triangle" | "cannon";

/**
 * Discriminated union of everything the UI can ask the core to do.
 * Keep every payload plain-serializable (no class instances, no Pixi types) so
 * the contract can later be sent across a Web Worker boundary unchanged.
 */
export type Command =
	// --- simulation control ---
	| { type: "play" }
	| { type: "pause" }
	| { type: "reset" }
	| { type: "step"; frames?: number }
	// --- editing (each produces an undoable Action) ---
	| { type: "setTool"; tool: ToolMode }
	| { type: "createShape"; kind: ShapeKind; x: number; y: number }
	| { type: "createText"; x: number; y: number; text: string }
	| { type: "deleteParts"; partIds: number[] }
	| { type: "moveParts"; partIds: number[]; dx: number; dy: number }
	| { type: "rotateParts"; partIds: number[]; angle: number }
	| { type: "resizeParts"; partIds: number[]; scaleFactor: number }
	| { type: "setColour"; partIds: number[]; r: number; g: number; b: number; opacity: number }
	// --- selection (view state, but routed through the core so it stays authoritative) ---
	| { type: "select"; partIds: number[]; additive?: boolean }
	| { type: "clearSelection" }
	// --- undo/redo ---
	| { type: "undo" }
	| { type: "redo" }
	// --- persistence (ByteArray under the hood; no network) ---
	| { type: "loadRobot"; data: Uint8Array }
	| { type: "newRobot" };

export type CommandType = Command["type"];
