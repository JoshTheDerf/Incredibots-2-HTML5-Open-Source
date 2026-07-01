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
	SandboxState,
	PartSnapshot,
} from "./GameState";
export { createInitialState } from "./GameState";
export {
	buildTerrainParts,
	computeBounds,
	createDefaultSandboxState,
	DEFAULT_SANDBOX_SETTINGS,
	SIZE_SMALL,
	SIZE_MEDIUM,
	SIZE_LARGE,
	TERRAIN_LAND,
	TERRAIN_BOX,
	TERRAIN_EMPTY,
	BACKGROUND_SOLID_COLOUR,
} from "./sandboxEnvironment";
export type { Command, CommandType, ToolMode, ShapeKind } from "./Command";
