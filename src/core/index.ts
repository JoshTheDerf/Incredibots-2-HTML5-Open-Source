// Public API of the headless game core.
//
// This is a deliberate, SMALL barrel — it defines the package boundary that the
// renderer and the Vue + Nuxt UI import from. (Unlike the old src/imports.ts
// god-barrel, this exposes only the core's contract, not its internals.)

export { GameCore } from "./GameCore";
export type { Unsubscribe, StateListener, SoundEvent, SoundListener } from "./GameCore";
export { encodeRobot, decodeRobot } from "./robotSerialization";
export type { DecodedRobot } from "./robotSerialization";
export { decodeChallengeBlob } from "./challengeSerialization";
export type {
	GameState,
	SimState,
	SimPhase,
	CameraState,
	EditState,
	SandboxState,
	PartSnapshot,
	ReplayState,
	TutorialState,
	ConditionDraft,
} from "./GameState";
export { createInitialState } from "./GameState";
export type { ReplayData, CameraMovement, KeyPress, ReplaySyncPoint } from "./replay";
export { REPLAY_SYNC_FRAMES, VERSION_STRING_FOR_REPLAYS } from "./replay";
export { encodeReplay, decodeReplay } from "./replaySerialization";
export type { DecodedReplay, ReplayRobot } from "./replaySerialization";
export { TUTORIAL_MESSAGES, TUTORIAL_LEVELS, tutorialLevel, resolveMessage, tutorialWindowHeight, clampTutorialPosition, levelDoneIndexForControllerType } from "./tutorials";
export type { TutorialLevel } from "./tutorials";
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
