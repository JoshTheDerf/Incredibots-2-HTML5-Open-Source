// The internals seam between the GameCore façade and its extracted subsystems.
//
// GameCore implements this interface; the domain modules (simRuntime,
// replayRuntime, importExport, historyOps, clipboardOps, partOps, partProps,
// cameraOps, challengeOps, tutorialOps) export free functions that take
// `core: CoreInternals` as their first argument and operate on the shared
// mutable session through it. Everything here is deliberately mutable — these
// are the cross-cutting private fields the legacy ControllerGame kept on one
// object; the seam only makes the sharing explicit (and keeps the modules
// decoupled from the GameCore class itself).

import type { b2Joint } from "../Box2D";
import type { Part } from "../Parts/Part";
import type { ShapePart } from "../Parts/ShapePart";
import type { Command } from "./Command";
import type { GameState, CameraState } from "./GameState";
import type { ChallengeSession } from "./challenge";
import type { WaterSystem } from "./waterSystem";
import type { FractureSystem } from "./fractureSystem";
import type { RecordingBuffers, ReplaySession } from "./replay";
import type { IB3ReplayData } from "./ib3Import";
import type { TutorialMachine, TutorialEvent, DialogAction } from "./tutorials";
import type { ResizeGesture } from "./geometryEdit";
import type { SoundEvent } from "./GameCore";

/** Snapshot of a Part's pre-play edit transform, restored on reset. */
export interface EditTransform {
	part: Part;
	x: number;
	y: number;
	angle: number;
}

/**
 * A point-in-time snapshot of the editable state for the undo/redo stacks:
 * a deep-cloned `parts` graph plus the edit-selection fields. The world/sim are
 * intentionally excluded — history only spans the editing phase.
 */
export interface HistorySnapshot {
	parts: Part[];
	selection: number[];
	tool: string;
	/** Robot-exposure lock (curRobotEditable) so undoing an uneditable import unlocks. */
	editable: boolean;
}

/**
 * First-click state of the two-click PRISMATIC-joint gesture (ControllerGame
 * MaybeStartCreatingPrismaticJoint :6844 sets jointPart + firstClickX/Y, then
 * actionStep 1 waits for the second click). null when no prismatic is
 * mid-construction. Holds a live ShapePart ref for part1 and the axis-start
 * world point. `finishPrismaticJoint` consumes it. Cleared on tool change /
 * cancel via `cancelJointGesture`.
 */
export interface PendingPrismatic {
	part1: ShapePart;
	x1: number;
	y1: number;
}

/**
 * >2-overlap joint / thruster disambiguation state (ControllerGame
 * FINALIZING_JOINT, :6776-6785 / :6830-6837 / :6873-6881). When more shapes
 * overlap the click than a joint (2) / thruster (1) needs, the legacy enters a
 * cycle: each subsequent CLICK advances which candidate pair (or single, for
 * thrusters/prismatic-step-1) is highlighted (:2435-2473); a finalize commits
 * the current pick. Holds the candidate list + the current index pair + what is
 * being built. Highlighted parts carry highlightForJoint (drawn by Draw).
 */
export interface PendingJoint {
	kind: "fixed" | "revolute" | "thrusters" | "prismatic1" | "prismatic2";
	candidates: ShapePart[];
	i1: number;
	i2: number;
	x: number;
	y: number;
}

/**
 * The mutable core session the subsystem modules operate on. GameCore
 * implements this; each member's doc lives on the GameCore field/method.
 */
export interface CoreInternals {
	// --- State + notification glue ---
	state: GameState;
	markChanged(): void;
	emitSound(event: SoundEvent): void;
	emitMessage(message: string): void;
	/** Run `fn` inside a notify batch (subscribers fire once at the end). */
	withNotifyBatch(fn: () => void): void;
	dispatch(command: Command): void;
	setRobotEditable(v: boolean): void;
	findPart(id: number): Part | undefined;
	syncChallenge(): void;
	undoRedoFlags(): { canUndo: boolean; canRedo: boolean };
	pushHistory(): void;
	notifyTutorial(event: TutorialEvent): void;
	applyTutorialDialog(action: DialogAction | null): void;

	// --- Cross-cutting mutable session fields ---
	nextId: number;
	defaultRed: number;
	defaultGreen: number;
	defaultBlue: number;
	defaultOpacity: number;
	editSnapshots: EditTransform[];
	cameraSnapshot: CameraState | null;
	undoStack: HistorySnapshot[];
	redoStack: HistorySnapshot[];
	curRobotEditable: boolean;
	challenge: ChallengeSession | null;
	cannonballs: unknown[];
	waterSystem: WaterSystem | null;
	fractureSystem: FractureSystem;
	simFragments: ShapePart[];
	recording: RecordingBuffers | null;
	replaySession: ReplaySession | null;
	ib3ReplayTracks: IB3ReplayData | null;
	replayFocusBroken: boolean;
	tutorialMachine: TutorialMachine | null;
	levelsDone: boolean[];
	tutorialWonFired: boolean;
	mouseJoint: b2Joint | null;
	clipboard: Part[];
	resizeGesture: ResizeGesture | null;
	pendingPrismatic: PendingPrismatic | null;
	pendingJoint: PendingJoint | null;
}
