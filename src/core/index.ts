// Public API of the headless game core.
//
// This is a deliberate, SMALL barrel — it defines the package boundary that the
// renderer and the Vue + Nuxt UI import from. (Unlike the old src/imports.ts
// god-barrel, this exposes only the core's contract, not its internals.)

export { GameCore } from "./GameCore";
export type { Unsubscribe, StateListener } from "./GameCore";
export { encodeRobot, decodeRobot } from "./robotSerialization";
export type { DecodedRobot } from "./robotSerialization";
export type {
	GameState,
	SimState,
	SimPhase,
	CameraState,
	EditState,
	PartSnapshot,
} from "./GameState";
export { createInitialState } from "./GameState";
export type { Command, CommandType, ToolMode, ShapeKind } from "./Command";
