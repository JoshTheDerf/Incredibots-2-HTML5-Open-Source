// Core⇄view contract — the GameCore store
//
// Headless, Pixi-free, DOM-free. Owns the authoritative GameState, applies
// Commands, and notifies subscribers on change. This is the seam the renderer
// and the Vue + Nuxt UI both bind to. See docs/CONTRACT.md.
//
// STATUS: skeleton. The state shape (GameState) and the command surface
// (Command) are the stable contract. The per-command handlers are being
// migrated out of the monolithic ControllerGame incrementally; until a handler
// is migrated it throws so nothing silently no-ops.

import { b2AABB, b2MouseJointDef, b2Vec2, b2World } from "../Box2D";
import type { b2Joint } from "../Box2D";
import { getPhysicsBackend, setCannonballs } from "../Parts/partGlobals";
import { Util } from "../General/Util";
import { Bomb, markBombImpact } from "../Parts/Bomb";
import { Cannon } from "../Parts/Cannon";
import { Circle } from "../Parts/Circle";
import { FixedJoint } from "../Parts/FixedJoint";
import { JointPart } from "../Parts/JointPart";
import type { Part } from "../Parts/Part";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import {
	DEFAULT_B,
	DEFAULT_G,
	DEFAULT_O,
	DEFAULT_R,
	MAX_DENSITY,
	MAX_FRICTION,
	MAX_RESTITUTION,
	MIN_DENSITY,
	MIN_FRICTION,
	MIN_RESTITUTION,
	TRIGGER_NONE,
} from "../Parts/partDefaults";
import { Polygon } from "../Parts/Polygon";
import { Rectangle } from "../Parts/Rectangle";
import { RevoluteJoint } from "../Parts/RevoluteJoint";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import { Triangle } from "../Parts/Triangle";
import type { Command, ShapeKind } from "./Command";
import { GameState, PartSnapshot, createInitialState } from "./GameState";
import type { CameraState } from "./GameState";
import { decodeRobot, decodeRobotFile, encodeRobot } from "./robotSerialization";
import type { DecodedRobot } from "./robotSerialization";
import { processTriggers, triggerDirectionSwitch, wireTriggers } from "./triggers";
import type { TriggerUserData } from "./triggers";
import {
	decodeChallengeBlob,
	decodeChallengeWithMeta,
	decodeChallengeFile,
	encodeChallenge,
} from "./challengeSerialization";
import { encodeReplay, decodeReplay, decodeReplayFile, decodeDemoReplay } from "./replaySerialization";
import type { DecodedReplay, ReplayMeta, ReplayRobot } from "./replaySerialization";
import { EXPO_PUBLIC_EDITABLE } from "./exposure";
import { buildTerrainParts, computeBounds } from "./sandboxEnvironment";
import {
	ChallengeSession,
	CreatePartKind,
	NO_LIMIT_MAX,
	NO_LIMIT_MIN,
	buildBuiltInChallenge,
	challengeSessionFromChallenge,
	challengeOver,
	checkIfPartsFit,
	clampDensity,
	clampFriction,
	clampRestitution,
	clampRJ,
	clampSJ,
	clampThruster,
	conditionsContactAdded,
	createChallengeSession,
	getScore,
	partTypeAllowed,
	resetConditions,
	toChallengeState,
	updateConditions,
	wonChallenge,
} from "./challenge";
import { WinCondition } from "../Game/WinCondition";
import { LossCondition } from "../Game/LossCondition";
import type { Challenge } from "../Game/Challenge";
import { SandboxSettings } from "../Game/SandboxSettings";
import { WaterSystem, applyWaterState, waterStateFromSettings } from "./waterSystem";
import {
	REPLAY_SYNC_FRAMES,
	REPLAY_MAX_FRAMES,
	REPLAY_MAX_CANNONBALLS,
	type RecordingBuffers,
	type ReplaySession,
	type ReplayData,
	type BodyLike,
	createRecording,
	createReplaySession,
	addSyncPoint,
	recordKeyPress,
	recordCameraMovement,
	finalizeReplay,
	replayUpdate,
	syncReplay,
	syncReplay2,
	moveCameraForReplay,
} from "./replay";
import {
	type TutorialMachine,
	type TutorialEvent,
	type DialogAction,
	createTutorialMachine,
	resolveMessage,
	tutorialLevel,
	getTutorialSetup,
	TUTORIAL_LEVELS,
} from "./tutorials";
import type { TutorialState } from "./GameState";
import { b2Vec2 as B2Vec2 } from "../Box2D";

// --- Physics simulation constants, mirrored from the legacy ControllerGame ---
//
// CreateWorld (ControllerGame.ts:6628) builds a b2World spanning
// (-300,-200)..(300,200) with gravity from GetGravity() (ControllerGame.ts:6643,
// returns b2Vec2(0, 15) — i.e. downward, +Y is down in world space) and
// doSleep=true. The Update() step loop (ControllerGame.ts:584-585) advances the
// world twice per frame: Step(1/60, 5) then Step(1/60, m_iterations) where
// m_iterations=10 (ControllerGame.ts:88).
const WORLD_AABB_LOWER = { x: -300.0, y: -200.0 };
const WORLD_AABB_UPPER = { x: 300.0, y: 200.0 };
const GRAVITY = { x: 0.0, y: 15.0 };
const STEP_DT = 1 / 60;
const STEP_ITERATIONS_WARMUP = 5;
const STEP_ITERATIONS = 10;

// --- Live play-mode interaction constants (ControllerGame) ---
//
// Mouse joint: the drag constraint's max force is 300 * body mass, with the
// simulation time step 1/30 (ControllerGame.m_timeStep :89; MouseDrag :1790-1791).
const MOUSE_JOINT_MAX_FORCE_FACTOR = 300.0;
const MOUSE_JOINT_TIME_STEP = 1.0 / 30.0;
// The GetBodyAtMouse pick box is a ±0.001 world-unit AABB around the cursor
// (ControllerGame.GetBodyAtMouse :6968-6969).
const MOUSE_PICK_HALF = 0.001;
const MOUSE_PICK_MAX_COUNT = 10;

// The fixed Flash stage the legacy per-tutorial camera offsets were authored for
// (Draw.m_screenWidth/Height :44-45). Used to convert a tutorial's legacy
// m_drawXOff/m_drawYOff into the responsive-canvas camera.offset convention.
const LEGACY_STAGE_WIDTH = 800;
const LEGACY_STAGE_HEIGHT = 600;

/** Snapshot of a Part's pre-play edit transform, restored on reset. */
interface EditTransform {
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
interface HistorySnapshot {
	parts: Part[];
	selection: number[];
	tool: string;
	/** Robot-exposure lock (curRobotEditable) so undoing an uneditable import unlocks. */
	editable: boolean;
}

/** Max number of undo steps retained (older snapshots are dropped). */
const HISTORY_CAP = 100;

// Default sizes for shapes the headless create commands still place from a
// single point (text, cannon, prismatic-joint span). Circle/Rectangle/Triangle
// now derive their dimensions from the click-drag gesture (see
// buildDraggedShape), matching ControllerGame's NEW_CIRCLE/NEW_RECT/NEW_TRIANGLE
// flows; these defaults remain for the point-placed parts only.
const DEFAULT_RECT_SIZE = 2.0;
const DEFAULT_TEXT_W = 4.0;
const DEFAULT_TEXT_H = 2.0;

// Strength/speed sliders (joints, thrusters, cannon) share a 1..30 range, driven
// by MAX_RJ_STRENGTH / MAX_SJ_STRENGTH / MAX_THRUSTER_STRENGTH — all 30 (see
// partDefaults). Kept as a single constant since they're identical.
const MAX_JOINT_VALUE = 30;

// Fixed world-unit offset applied to pasted clones when the caller supplies no
// explicit dx/dy. The legacy pasteButton (:5085) places the clones under the
// mouse cursor and begins a PASTE mouse-drag; the headless core has no cursor, so
// it nudges the copy by this delta (like the mirror port's place-and-select
// DEVIATION) so the paste is visibly offset from the original.
const PASTE_OFFSET = 1.0;

// Zoom factor + clamps, ported from ControllerGame.Zoom (:6705) and
// ControllerGameGlobals MIN/MAX_ZOOM_VAL (:33-34). Zoom in multiplies the scale
// by 4/3, out by 3/4, clamped to [12, 75]; the view centre is held fixed.
const ZOOM_IN_FACTOR = 4.0 / 3.0;
const ZOOM_OUT_FACTOR = 3.0 / 4.0;
const MIN_ZOOM_VAL = 12;
const MAX_ZOOM_VAL = 75;

export type Unsubscribe = () => void;
export type StateListener = (state: Readonly<GameState>) => void;

/**
 * Game sound events the core emits for the UI sound service to play. A plain
 * string union — the core carries NO asset paths / no pixi (src/ui/sound.ts owns
 * the actual playback + the random-of-5 clip selection). Mirrors the legacy sound
 * trigger sites in the Controller layer: PlayShapeSound / PlayJointSound and the
 * win/lose plays (ControllerGame.ts:469/:486/:751/:770).
 */
export type SoundEvent = "shapeCreated" | "jointCreated" | "won" | "lost";
export type SoundListener = (event: SoundEvent) => void;

/**
 * A user-facing message the core surfaces for the UI to show in a dialog/notice
 * (parallel to the sound channel; a plain string, no pixi). Mirrors the legacy
 * ShowDialog3 refuse dialogs in playButton (ControllerGame.ts:2781-2782). The UI
 * (gameStore.notice) binds onMessage and renders it.
 */
export type MessageListener = (message: string) => void;

export class GameCore {
	private state: GameState;
	private listeners = new Set<StateListener>();
	/** Sound-event subscribers (parallel to `listeners`; see onSound/emitSound). */
	private soundListeners = new Set<SoundListener>();
	/** User-message subscribers (parallel to `soundListeners`; see onMessage/emitMessage). */
	private messageListeners = new Set<MessageListener>();
	/**
	 * Default colour for newly-created shapes (ControllerGameGlobals.defaultR/G/B/O,
	 * set by colourButton(..., makeDefault) — ControllerGame.ts:4454-4461). New
	 * ShapeParts adopt this in the create handlers. Seeded from the legacy shape
	 * colour defaults (partDefaults DEFAULT_R/G/B/O).
	 */
	private defaultRed = DEFAULT_R;
	private defaultGreen = DEFAULT_G;
	private defaultBlue = DEFAULT_B;
	private defaultOpacity = DEFAULT_O;
	/** batching depth so a compound command notifies subscribers once. */
	private notifyDepth = 0;
	private dirty = false;
	/** monotonic source of stable Part ids. */
	private nextId = 0;
	/** Per-part pre-play edit transforms, captured on play, restored on reset. */
	private editSnapshots: EditTransform[] = [];
	/**
	 * Pre-play camera snapshot (offsetX/offsetY/scale), captured on play and
	 * restored on reset so a run that auto-panned/followed the robot returns the
	 * view to where the user left it (ControllerGame.playButton snapshots
	 * savedDrawXOff/YOff :2776-2777; resetButton restores them :2813-2814). null
	 * until the first play. Port note: the legacy stores the pre-transform focus in
	 * its own draw-offset units; we snapshot the whole camera and restore it verbatim.
	 */
	private cameraSnapshot: CameraState | null = null;
	/** Undo / redo stacks of editable-state snapshots (see HistorySnapshot). */
	private undoStack: HistorySnapshot[] = [];
	private redoStack: HistorySnapshot[] = [];
	/**
	 * ControllerGame.curRobotEditable: false after loading a robot saved with an
	 * "uneditable" exposure (SaveWindow enum, Wave 3a). Gates every mutating
	 * command at the dispatch funnel — honor-system, exactly like Jaybit's ~20
	 * `!curRobotEditable` editor-entry guards. Reset to true by newRobot /
	 * clearAll / loading an editable robot.
	 */
	private curRobotEditable = true;
	/**
	 * The live challenge session (ControllerChallenge's role): the domain
	 * Challenge object + play/edit orchestration. null for a plain sandbox
	 * session. The plain-data projection is mirrored into state.challenge.
	 */
	private challenge: ChallengeSession | null = null;
	/**
	 * Live cannonball bodies the running world spawns. Cannon.CreateCannonball
	 * pushes each spawned b2Body into the partGlobals cannonball sink
	 * (Cannon.ts:252-253); we point that sink at THIS array on play (setCannonballs
	 * below), so fired cannonballs land here and feed condition evaluation
	 * (subject 4 / obj 5-6, Condition.ts:110-129/227-251/274-281) exactly as the
	 * legacy ControllerGameGlobals.cannonballs did (ControllerChallenge.Update :25/28,
	 * ContactAdded :209/212). Reset to a fresh array each play
	 * (ControllerGame.ts:2736).
	 */
	private cannonballs: unknown[] = [];

	/**
	 * Live water system for the current run (IB3 WaterControl port,
	 * src/core/waterSystem.ts). Built at play when sandbox.water.enabled,
	 * dropped with the world on reset/stop. Owns the buoyancy(+tide/wave)
	 * controller registered on the b2World; newly-created bodies join via
	 * waterSystem.addBody and destroyed bodies are unlinked by
	 * b2World.DestroyBody's controller-edge cleanup (bombs!).
	 */
	private waterSystem: WaterSystem | null = null;
	/**
	 * Live replay recording buffers while a normal (non-replay) sim runs; null
	 * otherwise. Reset on `play` (ControllerGame.ts:2730-2735). See src/core/replay.ts.
	 */
	private recording: RecordingBuffers | null = null;
	/**
	 * Active replay playback session (decoded replay + splines + cursors); null
	 * unless playing a replay. When set, the sim runs FROZEN — the world is not
	 * stepped; bodies are driven from sync points. See src/core/replay.ts.
	 */
	private replaySession: ReplaySession | null = null;
	/** The active tutorial's hand-coded machine; null for non-tutorial sessions. */
	private tutorialMachine: TutorialMachine | null = null;
	/** Persistent level-done grid (mirrors LSOManager.IsLevelDone(0..13)). */
	private levelsDone: boolean[] = new Array(TUTORIAL_LEVELS.length).fill(false);
	/** Latches the one-shot tutorial "won" trigger so it fires once per run. */
	private tutorialWonFired = false;
	/**
	 * The live b2MouseJoint dragging a body during the running sim, or null.
	 * Owned here on the world (ControllerGame.m_mouseJoint :87); GameCanvas drives
	 * it via the mouseJointStart/Move/End commands from pointer events.
	 */
	private mouseJoint: b2Joint | null = null;

	/**
	 * The copy/paste clipboard (ControllerGameGlobals.clipboardParts). Holds cloned
	 * Part instances — the selected shapes/text plus the joints/thrusters BETWEEN
	 * them — captured by copyParts/cutParts. NOT render state (never crosses a
	 * worker boundary), so it lives on the core, not GameState. Cleared to [] on
	 * each copy/cut. Paste clones from here so the clipboard survives repeated pastes.
	 */
	private clipboard: Part[] = [];

	/**
	 * Active resize-gesture baseline (ControllerGame.scaleButton :3975), or null.
	 * Captured on `resizeStart`: the pivot (selectedParts[0]'s anchor), the whole
	 * attached cluster (GetAttachedParts union), each part's dragOff from the pivot,
	 * and each part's PrepareForResizing() snapshot. `resizeParts` applies the TOTAL
	 * from-baseline factor against this; `resizeEnd` clears it. Holds live Part
	 * references (persist across pushHistory, which only clones into the undo stack).
	 */
	private resizeGesture: {
		pivotX: number;
		pivotY: number;
		parts: Part[];
		dragXOff: number[];
		dragYOff: number[];
	} | null = null;

	/**
	 * First-click state of the two-click PRISMATIC-joint gesture (ControllerGame
	 * MaybeStartCreatingPrismaticJoint :6844 sets jointPart + firstClickX/Y, then
	 * actionStep 1 waits for the second click). null when no prismatic is
	 * mid-construction. Holds a live ShapePart ref for part1 and the axis-start
	 * world point. `finishPrismaticJoint` consumes it. Cleared on tool change /
	 * cancel via `cancelJointGesture`.
	 */
	private pendingPrismatic: { part1: ShapePart; x1: number; y1: number } | null = null;

	/**
	 * >2-overlap joint / thruster disambiguation state (ControllerGame
	 * FINALIZING_JOINT, :6776-6785 / :6830-6837 / :6873-6881). When more shapes
	 * overlap the click than a joint (2) / thruster (1) needs, the legacy enters a
	 * cycle: each subsequent CLICK advances which candidate pair (or single, for
	 * thrusters/prismatic-step-1) is highlighted (:2435-2473); a finalize commits
	 * the current pick. Holds the candidate list + the current index pair + what is
	 * being built. Highlighted parts carry highlightForJoint (drawn by Draw).
	 */
	private pendingJoint: {
		kind: "fixed" | "revolute" | "thrusters" | "prismatic1" | "prismatic2";
		candidates: ShapePart[];
		i1: number;
		i2: number;
		x: number;
		y: number;
	} | null = null;

	constructor(initial: GameState = createInitialState()) {
		this.state = initial;
		// Any parts seeded into the initial state (e.g. the sandbox terrain bodies
		// built by createInitialState) need stable ids from our monotonic source so
		// later create commands don't collide with them.
		for (const p of this.state.parts) {
			if (p.id == null || p.id === 0) p.id = ++this.nextId;
		}
	}

	/** Read-only snapshot for the renderer / views. */
	getState(): Readonly<GameState> {
		return this.state;
	}

	/**
	 * The live legacy `Challenge` domain object (with its WinCondition/
	 * LossCondition instances and b2AABB build areas), or null for a plain
	 * sandbox session. The renderer feeds this straight into Draw.DrawWorld's
	 * `challenge` param to paint condition zones (Draw.ts:129-164). NOT plain
	 * data — do not send across a worker boundary; use state.challenge for that.
	 */
	getLiveChallenge(): import("../Game/Challenge").Challenge | null {
		return this.challenge ? this.challenge.challenge : null;
	}

	/** Subscribe to state changes. Returns an unsubscribe function. */
	subscribe(listener: StateListener): Unsubscribe {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/**
	 * Subscribe to game sound events (shapeCreated / jointCreated / won / lost).
	 * Parallel to `subscribe`; returns an unsubscribe function. The UI sound
	 * service binds this and plays the corresponding clip.
	 */
	onSound(listener: SoundListener): Unsubscribe {
		this.soundListeners.add(listener);
		return () => this.soundListeners.delete(listener);
	}

	/** Notify sound subscribers of a game sound event (fired after the mutation). */
	private emitSound(event: SoundEvent): void {
		for (const l of this.soundListeners) l(event);
	}

	/**
	 * Subscribe to user-facing messages (e.g. the play-refuse dialogs). Parallel to
	 * `onSound`; returns an unsubscribe function. The UI binds this and shows the
	 * message (gameStore.notice).
	 */
	onMessage(listener: MessageListener): Unsubscribe {
		this.messageListeners.add(listener);
		return () => this.messageListeners.delete(listener);
	}

	/** Notify message subscribers of a user-facing message. */
	private emitMessage(message: string): void {
		for (const l of this.messageListeners) l(message);
	}

	/**
	 * Single writer for the robot-EXPOSURE lock: keeps the private
	 * curRobotEditable gate (enforced at apply()) and the state.edit.editable
	 * read-model (the App.vue banner) in lockstep so they can never desync.
	 * This flag means "the loaded robot was saved with an uneditable exposure" —
	 * NOT the challenge play-mode lock, which is expressed via
	 * state.challenge.playMode + the parts' own isEditable flags.
	 */
	private setRobotEditable(v: boolean): void {
		this.curRobotEditable = v;
		if (this.state.edit.editable !== v) {
			this.state = { ...this.state, edit: { ...this.state.edit, editable: v } };
			this.markChanged();
		}
	}

	/** The single entry point for all mutations. */
	dispatch(command: Command): void {
		this.notifyDepth++;
		try {
			this.apply(command);
		} finally {
			this.notifyDepth--;
			if (this.notifyDepth === 0 && this.dirty) {
				this.dirty = false;
				const snapshot = this.state;
				for (const l of this.listeners) l(snapshot);
			}
		}
	}

	/** Handlers call this after mutating `this.state` to schedule a notify. */
	private markChanged(): void {
		this.dirty = true;
	}

	// --- Robot import / export ---------------------------------------------
	//
	// The copy/paste "encoded robot string" feature. Export is a pure read
	// (returns the string; not a mutation, so it's a method, not a Command),
	// while import replaces the parts graph and is undoable. Both use the
	// node-clean robotSerialization module (byte-compatible with the legacy
	// game's Database.ExportRobot / ImportRobot).

	/**
	 * Encode the current parts to a Jaybit-compatible robot export string.
	 * async because ByteArray.compress() is async. Ignores selection/sim state.
	 * `expo` is the SaveWindow exposure enum (src/core/exposure.ts); uneditable
	 * exposures make the code load locked in Jaybit and in this port.
	 */
	async exportRobot(name = "", desc = "", expo: number = EXPO_PUBLIC_EDITABLE): Promise<string> {
		// NOTE: no tutorial milestone here — encoding is a pure read the ExportPanel
		// re-runs on every keystroke. The "copied" milestone fires when the user
		// actually copies the code (notifyCodeCopied) or the selection (copyParts).
		return encodeRobot(this.state.parts, undefined, name, desc, expo);
	}

	/**
	 * Tutorial milestone hook for the Export panel's "Copy to Clipboard" button
	 * (ControllerHomeMovies.copyButton -> 45 "copied"). A read-side notification,
	 * not a Command — the UI calls it when the user copies the exported code.
	 */
	notifyCodeCopied(): void {
		if (this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "copied" });
	}

	/**
	 * Decode a robot export string and REPLACE the current parts with it: assign
	 * fresh ids, clear selection, and push an undo snapshot so the import is
	 * undoable. No-op during simulation (editing-phase only, like other
	 * mutations). Throws if the string can't be decoded — callers should catch.
	 * Accepts both legacy CE and Jaybit-prefixed codes; a Jaybit "uneditable"
	 * exposure locks the editor (curRobotEditable) until another robot loads.
	 */
	async importRobot(robotStr: string): Promise<void> {
		if (this.state.sim.phase !== "editing") return;
		const decoded = await decodeRobot(robotStr);
		this.applyImportedRobot(decoded);
	}

	/**
	 * Load a robot from user .ibro FILE bytes (or a text code pasted into a
	 * file — the "eN" sniffer routes both). Otherwise identical to importRobot.
	 */
	async importRobotFile(bytes: ArrayBuffer | Uint8Array): Promise<void> {
		if (this.state.sim.phase !== "editing") return;
		const decoded = await decodeRobotFile(bytes);
		this.applyImportedRobot(decoded);
	}

	/**
	 * Import And Insert — ControllerGame.importAndInsertButton (:1798) +
	 * processLoadedRobot's `loadAndInsert` branch (:8548-8611). Decode a robot code
	 * and APPEND its (non-terrain) parts to the current robot — concat with fresh
	 * ids, NO position offset, preserving relative z-order (the legacy
	 * `allParts.concat`) — rather than replacing the graph like importRobot. Fresh
	 * parts are clamped to the active challenge's material limits. Undoable.
	 * Editing-phase only; blocked when the loaded robot is uneditable
	 * (curRobotEditable, matching the button's own gate).
	 */
	async importRobotInsert(robotStr: string): Promise<void> {
		if (this.state.sim.phase !== "editing") return;
		const decoded = await decodeRobot(robotStr);
		this.applyInsertedRobot(decoded);
	}

	/**
	 * Import And Insert from user .ibro FILE bytes (or a pasted text code — the
	 * "eN" sniffer routes both). Otherwise identical to importRobotInsert.
	 */
	async importRobotFileInsert(bytes: ArrayBuffer | Uint8Array): Promise<void> {
		if (this.state.sim.phase !== "editing") return;
		const decoded = await decodeRobotFile(bytes);
		this.applyInsertedRobot(decoded);
	}

	/** Shared tail of importRobotInsert / importRobotFileInsert (append, not replace). */
	private applyInsertedRobot(decoded: DecodedRobot): void {
		// The button is only reachable on an editable robot (importAndInsertButton
		// gate `curRobotEditable`); enforce it here too so the store passthrough is safe.
		if (!this.curRobotEditable) return;
		// Robot files carry no terrain, but guard against isSandbox parts anyway so
		// an insert can never duplicate the ground.
		const incoming = decoded.parts.filter((p) => !(p as { isSandbox?: boolean }).isSandbox);
		if (incoming.length === 0) return;

		// Challenge restriction gate (processLoadedRobot :8611): refuse if the robot
		// carries a part type the active challenge disallows. Mirrors the paste gate.
		if (this.challenge) {
			for (const p of incoming) {
				const kind = this.clipboardPartKind(p);
				if (kind && !partTypeAllowed(this.challenge, kind)) {
					this.emitMessage("Sorry, that robot contains parts that are not allowed in this challenge!");
					return;
				}
			}
		}
		// Trigger gate (matching the paste gate): in a challenge play session with
		// !triggersAllowed, refuse a robot carrying any trigger config.
		if (this.challenge && this.challenge.playMode && !this.challenge.challenge.triggersAllowed) {
			if (incoming.some((p) => this.partCarriesTriggers(p))) {
				this.emitMessage("Sorry, triggers are not allowed in this challenge!");
				return;
			}
		}

		// Insert KEEPS the existing parts, so the fresh ids must clear the current
		// max id (unlike a replacing import, where old ids vanish).
		for (const p of this.state.parts) this.nextId = Math.max(this.nextId, p.id ?? 0);
		for (const p of incoming) p.id = ++this.nextId;
		for (const p of incoming) this.clampPartToChallengeLimits(p);

		this.notifyDepth++;
		try {
			this.pushHistory();
			this.state = {
				...this.state,
				parts: [...this.state.parts, ...incoming],
				edit: { ...this.state.edit, ...this.undoRedoFlags() },
			};
			this.markChanged();
			if (this.challenge) this.syncChallenge();
			if (this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "pasted" });
		} finally {
			this.notifyDepth--;
			if (this.notifyDepth === 0 && this.dirty) {
				this.dirty = false;
				const snapshot = this.state;
				for (const l of this.listeners) l(snapshot);
			}
		}
		this.surfaceIb3Notice(decoded);
	}

	/**
	 * Surface IB3-import provenance + lossy-conversion notes through the same
	 * message plumbing as the challenge/trigger refusals (P5 wiring). No-op for
	 * native/Jaybit/CE codes (decoded.ib3 undefined).
	 */
	private surfaceIb3Notice(decoded: DecodedRobot): void {
		if (!decoded.ib3) return;
		const p = decoded.ib3;
		const kind = p.type === 1 ? "replay" : p.type === 2 ? "challenge" : "robot";
		const named = p.name ? ` "${p.name}"` : "";
		const by = p.creatorName ? ` by ${p.creatorName}` : "";
		this.emitMessage(`Imported IB3 ${kind}${named}${by} (v${p.version}).`);
		if (decoded.warnings && decoded.warnings.length > 0) {
			this.emitMessage("IB3 import notes: " + decoded.warnings.join(" "));
		}
	}

	/** Shared tail of importRobot / importRobotFile (post-decode application). */
	private applyImportedRobot(decoded: DecodedRobot): void {
		// Challenge restriction gates, matching the insert/paste siblings
		// (applyInsertedRobot / pasteParts — processLoadedRobot :8611): a WHOLE-LOAD
		// refusal when the robot carries a disallowed part type, or any trigger
		// config in a play session with !triggersAllowed. Same dialog strings.
		if (this.challenge) {
			for (const p of decoded.parts) {
				const kind = this.clipboardPartKind(p);
				if (kind && !partTypeAllowed(this.challenge, kind)) {
					this.emitMessage("Sorry, that robot contains parts that are not allowed in this challenge!");
					return;
				}
			}
			if (this.challenge.playMode && !this.challenge.challenge.triggersAllowed) {
				if (decoded.parts.some((p) => this.partCarriesTriggers(p))) {
					this.emitMessage("Sorry, triggers are not allowed in this challenge!");
					return;
				}
			}
		}

		for (const p of decoded.parts) p.id = ++this.nextId;
		// Robot-load enforcement of the challenge material limits
		// (ControllerGame.CheckForChallengeLimits per loaded part, Jaybit :4212+).
		for (const p of decoded.parts) this.clampPartToChallengeLimits(p);

		this.notifyDepth++;
		try {
			this.pushHistory();
			// Keep the sandbox terrain bodies (isSandbox) so the imported robot lands
			// on the existing ground; only the robot parts are replaced.
			const terrain = this.state.parts.filter((p) => (p as { isSandbox?: boolean }).isSandbox);
			this.state = {
				...this.state,
				parts: [...terrain, ...decoded.parts],
				edit: {
					...this.state.edit,
					selection: [],
					selectedPart: null,
					...this.undoRedoFlags(),
				},
			};
			// DetermineExposure equivalent: copy the decoded editable flag to the
			// exposure lock (ControllerGame :8640-8652) — the funnel gate in apply()
			// enforces it. AFTER pushHistory so undoing the import restores the
			// pre-import (unlocked) flag.
			this.setRobotEditable(decoded.exposure.isEditable);
			this.markChanged();
			// Tutorial milestone (ControllerHomeMovies.Update paste -> 46 "pasted").
			if (this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "pasted" });
		} finally {
			this.notifyDepth--;
			if (this.notifyDepth === 0 && this.dirty) {
				this.dirty = false;
				const snapshot = this.state;
				for (const l of this.listeners) l(snapshot);
			}
		}
		this.surfaceIb3Notice(decoded);
	}

	/**
	 * Load a blob-backed built-in challenge (Race / Spaceship) from its compressed
	 * asset bytes. Faithful port of the ControllerRace / ControllerSpaceship ctor
	 * path (ControllerRace.ts:18-24): uncompress the blob, decode the Challenge
	 * (parts + conditions + restrictions + build areas + camera/zoom), make it the
	 * live challenge (playChallengeMode = playOnlyMode = true), and seed its
	 * `allParts` (terrain + the author's robot) into the parts graph so they
	 * simulate + draw. `blob` is the raw race.dat / spaceship.dat bytes the UI
	 * fetches — the core never imports the pixi-bound Resource, staying node-clean.
	 * async because ByteArray.uncompress() is async.
	 */
	async loadBuiltInChallengeBlob(name: "race" | "spaceship", blob: ArrayBuffer | Uint8Array): Promise<void> {
		const challenge = await decodeChallengeBlob(blob);
		// Fresh-controller reset (see resetSessionForLoad): drop the previous mode's
		// parts / challenge / tutorial / history before this challenge becomes live.
		this.resetSessionForLoad();
		this.challenge = challengeSessionFromChallenge(challenge, name);

		// The decoded parts (terrain + author robot) become the live parts graph,
		// with fresh ids from our monotonic source (ControllerRace assigns them via
		// loadedParts -> the base loader). Keep the parts' own isEditable/isStatic
		// flags from the blob so play-only conditions evaluate against them exactly.
		const parts = challenge.allParts as Part[];
		for (const p of parts) p.id = ++this.nextId;

		// Seed state.sandbox from the challenge's SandboxSettings so the sandbox
		// GroundRenderer + Sky draw the challenge's terrain/theme/background — the
		// legacy ControllerRace/Spaceship do this via ControllerGameGlobals.settings
		// = challenge.settings, and ControllerSandbox.BuildGround(true) then builds
		// the ground from those settings (ControllerRace.ts:23; ControllerSandbox
		// ctor). The terrain COLLISION bodies still ride in `parts` from the blob.
		const s = challenge.settings;
		const sandbox = {
			gravity: s.gravity,
			size: s.size,
			terrainType: s.terrainType,
			terrainTheme: s.terrainTheme,
			background: s.background,
			backgroundR: s.backgroundR,
			backgroundG: s.backgroundG,
			backgroundB: s.backgroundB,
			bounds: computeBounds({ size: s.size, terrainType: s.terrainType }),
			// IB3 water settings ride on the SandboxSettings (optional-guarded on
			// decode); project them into the sandbox slice (waterSystem.ts).
			water: waterStateFromSettings(s),
		};

		this.notifyDepth++;
		try {
			this.state = {
				...this.state,
				parts,
				sandbox,
				sim: { phase: "editing", frame: 0 },
				edit: { ...this.state.edit, selection: [], selectedPart: null },
			};
			// Camera zoom comes from the challenge (ControllerRace.ts:28-29 sets
			// initZoom = challenge.zoomLevel; Spaceship pins physScale=24). Apply the
			// decoded zoom when present (MAX_VALUE == unset) so the scene frames.
			if (challenge.zoomLevel !== Number.MAX_VALUE) {
				this.state = { ...this.state, camera: { ...this.state.camera, scale: challenge.zoomLevel } };
			}
			// Loading a challenge REPLACES the robot, so any exposure lock from a
			// previously loaded uneditable robot is lifted (Jaybit recomputes
			// curRobotEditable on every load).
			this.setRobotEditable(true);
			this.markChanged();
			this.syncChallenge();
		} finally {
			this.notifyDepth--;
			if (this.notifyDepth === 0 && this.dirty) {
				this.dirty = false;
				const snapshot = this.state;
				for (const l of this.listeners) l(snapshot);
			}
		}
	}

	/**
	 * Decode a challenge EXPORT STRING (Database.ExportChallenge output) and make it
	 * the live challenge session — the string-import counterpart of the blob loader
	 * loadBuiltInChallengeBlob. Faithful to Database.ImportChallenge followed by the
	 * ControllerRace/Spaceship "become the live challenge" path: decode (parts +
	 * conditions + restrictions + build areas + camera/zoom), build a play-only
	 * challenge session (builtIn = null — it's a user challenge), seed its allParts
	 * (terrain + author robot) into the parts graph, and seed the sandbox from its
	 * SandboxSettings. Editing-phase only (like other imports). async because
	 * ByteArray.uncompress() is async. Throws if the string can't be decoded.
	 */
	async importChallenge(challengeStr: string): Promise<void> {
		// No editing-phase guard: applyImportedChallenge resets the session (which
		// forces the editing phase), so a challenge can be loaded even while a
		// previous challenge/tutorial run is still paused or running.
		const decoded = await decodeChallengeWithMeta(challengeStr);
		this.applyImportedChallenge(decoded.challenge, decoded.exposure.isEditable);
	}

	/**
	 * Load a challenge from user .ibch FILE bytes (or a text code pasted into a
	 * file — the "eN" sniffer routes both). Otherwise identical to importChallenge.
	 */
	async importChallengeFile(bytes: ArrayBuffer | Uint8Array): Promise<void> {
		// No editing-phase guard (see importChallenge): the session reset forces
		// editing, so a mid-run switch loads cleanly.
		const decoded = await decodeChallengeFile(bytes);
		this.applyImportedChallenge(decoded.challenge, decoded.exposure.isEditable);
	}

	/**
	 * Shared tail of importChallenge / importChallengeFile (post-decode
	 * application). `editable` comes from the decoded header exposure (Jaybit's
	 * DetermineExposure → ControllerGame.processLoadedChallenge :8883-8884): an
	 * editable-exposure challenge opens in the challenge EDITOR (playMode=false),
	 * an uneditable one opens locked play-only. Legacy prefix-less codes decode
	 * to editable (decodeExposureInt: header ≤1 ⇒ public/editable — Jaybit's
	 * ImportChallenge :291-303 sets potentialChallengeEditable=true for them).
	 */
	private applyImportedChallenge(challenge: Challenge, editable: boolean): void {
		// Fresh-controller reset (see resetSessionForLoad) so no prior parts /
		// challenge / tutorial / history bleed into the imported challenge.
		this.resetSessionForLoad();
		this.challenge = challengeSessionFromChallenge(challenge, null, editable);

		const parts = challenge.allParts as Part[];
		for (const p of parts) p.id = ++this.nextId;

		const s = challenge.settings;
		const sandbox = {
			gravity: s.gravity,
			size: s.size,
			terrainType: s.terrainType,
			terrainTheme: s.terrainTheme,
			background: s.background,
			backgroundR: s.backgroundR,
			backgroundG: s.backgroundG,
			backgroundB: s.backgroundB,
			bounds: computeBounds({ size: s.size, terrainType: s.terrainType }),
			// IB3 water settings ride on the SandboxSettings (optional-guarded on
			// decode); project them into the sandbox slice (waterSystem.ts).
			water: waterStateFromSettings(s),
		};

		this.notifyDepth++;
		try {
			this.state = {
				...this.state,
				parts,
				sandbox,
				sim: { phase: "editing", frame: 0 },
				edit: { ...this.state.edit, selection: [], selectedPart: null },
			};
			if (challenge.zoomLevel !== Number.MAX_VALUE) {
				this.state = { ...this.state, camera: { ...this.state.camera, scale: challenge.zoomLevel } };
			}
			// Loading a challenge replaces the robot — lift any exposure lock
			// (Jaybit recomputes curRobotEditable on every load).
			this.setRobotEditable(true);
			this.markChanged();
			this.syncChallenge();
		} finally {
			this.notifyDepth--;
			if (this.notifyDepth === 0 && this.dirty) {
				this.dirty = false;
				const snapshot = this.state;
				for (const l of this.listeners) l(snapshot);
			}
		}
	}

	/**
	 * Encode the live challenge session to the legacy export string (base64 of a
	 * zlib-compressed ByteArray), byte-compatible with Database.ExportChallenge.
	 * Returns null when no challenge session is active. async (compression).
	 */
	async exportChallengeString(name = "", desc = "", expo: number = EXPO_PUBLIC_EDITABLE): Promise<string | null> {
		const challenge = this.prepareChallengeForExport();
		if (!challenge) return null;
		return encodeChallenge(challenge, name, desc, expo);
	}

	/**
	 * Snapshot the live parts/settings into the challenge object before an
	 * export (shared by the string + file exporters). Returns null when no
	 * challenge session is active.
	 */
	private prepareChallengeForExport(): Challenge | null {
		if (!this.challenge) return null;
		// Legacy ExportChallenge encodes ControllerGameGlobals.challenge, whose
		// allParts is the authored terrain + robot. In authoring (not-yet-played)
		// mode allParts may lag the live edits, so snapshot the current parts graph
		// into it first — mirroring enterChallengePlay's bake — so the export always
		// captures what's on screen. (putChallengeIntoByteArray filters to drawAnyway
		// parts, matching the legacy PutPartsIntoByteArray.)
		this.challenge.challenge.allParts = [...this.state.parts];
		// An authored challenge session carries `settings = null` (createChallengeSession
		// keeps the sandbox config on GameState.sandbox, not on the Challenge); the
		// encoder writes challenge.settings as an AMF object, so materialize a
		// SandboxSettings from the live sandbox when absent. Blob-loaded / imported
		// challenges already carry their own settings, so this only fires for authored ones.
		if (!this.challenge.challenge.settings) {
			const sb = this.state.sandbox;
			this.challenge.challenge.settings = applyWaterState(
				new SandboxSettings(
					sb.gravity,
					sb.size,
					sb.terrainType,
					sb.terrainTheme,
					sb.background,
					sb.backgroundR,
					sb.backgroundG,
					sb.backgroundB,
				),
				sb.water,
			);
		}
		return this.challenge.challenge;
	}

	/** Look up a live Part by its stable id. */
	private findPart(id: number): Part | undefined {
		return this.state.parts.find((p) => p.id === id);
	}

	// --- Challenge orchestration -------------------------------------------

	/**
	 * Recompute the CheckIfPartsFit gate (challenge play mode only) and re-project
	 * the live challenge session into state.challenge. Called after any command
	 * that touches conditions/restrictions/build areas/parts while a challenge is
	 * active. No-op (leaves state.challenge null) when there is no session.
	 */
	private syncChallenge(): void {
		if (!this.challenge) {
			if (this.state.challenge !== null) {
				this.state = { ...this.state, challenge: null };
				this.markChanged();
			}
			return;
		}
		this.challenge.partsFit = checkIfPartsFit(this.challenge, this.state.parts);
		this.state = { ...this.state, challenge: toChallengeState(this.challenge) };
		this.markChanged();
	}

	// --- Replay recording / playback --------------------------------------
	//
	// See docs/PORT-SPEC-tutorials-replays.md §B and src/core/replay.ts. The
	// body order below is the SINGLE source of truth used for both recording
	// (AddSyncPoint) and playback (SyncReplay/SyncReplay2) — it must match the
	// legacy dedup-by-body iteration over non-static ShapeParts (:797-808).

	/**
	 * The deduped, ordered list of live bodies replay syncs against: every
	 * non-static ShapePart body, in parts order, deduped by body identity
	 * (ControllerGame.AddSyncPoint :797-808 / SyncReplay :968-977).
	 */
	private replayBodies(): BodyLike[] {
		const bodies: BodyLike[] = [];
		const seen = new Set<unknown>();
		for (const p of this.state.parts) {
			if (p instanceof ShapePart && !p.isStatic) {
				const body = p.GetBody();
				if (body && !seen.has(body)) {
					seen.add(body);
					bodies.push(body as unknown as BodyLike);
				}
			}
		}
		return bodies;
	}

	/** Live cannonball bodies (empty in the headless core — no cannon firing). */
	private replayCannonballs(): BodyLike[] {
		return this.cannonballs as BodyLike[];
	}

	/** A b2Vec2 factory the sync helpers use (keeps replay.ts Box2D-free). */
	private vec(x: number, y: number): B2Vec2 {
		return new B2Vec2(x, y);
	}

	/** Project the replay read-model into state.replay. */
	private replayStateSnapshot(): GameState["replay"] {
		return {
			recording: this.recording !== null && !this.replaySession,
			playing: this.replaySession !== null,
			frame: this.state.sim.frame,
			numFrames: this.replaySession ? this.replaySession.data.numFrames : null,
			canSave: this.recording ? this.recording.canSave : true,
			finished: this.state.replay.finished,
		};
	}

	private syncReplayState(): void {
		this.state = { ...this.state, replay: this.replayStateSnapshot() };
		this.markChanged();
	}

	/**
	 * Finalize the current recording into a serializable ReplayData
	 * (ControllerGame.ts:5354-5360). Returns null if there is no active recording.
	 * A pure read — not a Command.
	 */
	exportReplay(): ReplayData | null {
		if (!this.recording) return null;
		return finalizeReplay(this.recording, this.state.sim.frame);
	}

	/**
	 * Encode the current replay recording to the legacy-compatible replay export
	 * string (base64 of the zlib-compressed Database.ExportReplay byte format),
	 * bundling the current robot parts + sandbox settings. Returns null when there
	 * is no active recording. async because ByteArray.compress() is async. The
	 * result interops with the legacy game (Database.ExportReplay / ImportReplay).
	 */
	async exportReplayString(meta: ReplayMeta = {}): Promise<string | null> {
		const bundle = this.prepareReplayForExport();
		if (!bundle) return null;
		return encodeReplay(bundle.data, bundle.robot, meta);
	}

	/** Shared head of the replay string exporter: replay + bundled robot. */
	private prepareReplayForExport(): { data: ReplayData; robot: ReplayRobot } | null {
		const data = this.exportReplay();
		if (!data) return null;
		// Bundle the current robot (non-sandbox parts) + sandbox settings, matching
		// Database.ExportReplay which packs the replay AND the robot it was run with.
		const robotParts = this.state.parts.filter((p) => !(p as { isSandbox?: boolean }).isSandbox);
		const s = this.state.sandbox;
		const settings = applyWaterState(
			new SandboxSettings(
				s.gravity,
				s.size,
				s.terrainType,
				s.terrainTheme,
				s.background,
				s.backgroundR,
				s.backgroundG,
				s.backgroundB,
			),
			s.water,
		);
		return { data, robot: { parts: robotParts, settings } };
	}

	/**
	 * Decode a legacy replay export string and begin playing it back. Mirrors
	 * Database.ImportReplay (split replay/robot, uncompress, extract) followed by
	 * the play-a-replay flow: the decoded ReplayData drives sim-FREE playback.
	 * Editing-phase only (like the legacy import-then-play path). Throws if the
	 * string can't be decoded — callers should catch.
	 */
	async importReplay(replayStr: string): Promise<void> {
		if (this.state.sim.phase !== "editing") return;
		const decoded = await decodeReplay(replayStr);
		this.applyImportedReplay(decoded);
	}

	/**
	 * Load + play a replay from user .ibre FILE bytes (or a text code pasted
	 * into a file — the "eN" sniffer routes both). Otherwise identical to
	 * importReplay.
	 */
	async importReplayFile(bytes: ArrayBuffer | Uint8Array): Promise<void> {
		if (this.state.sim.phase !== "editing") return;
		const decoded = await decodeReplayFile(bytes);
		this.applyImportedReplay(decoded);
	}

	/** Shared tail of importReplay / importReplayFile (post-decode application). */
	private applyImportedReplay(decoded: DecodedReplay): void {
		// A replay export bundles the recorded motion, the robot it animates AND the
		// SandboxSettings it ran under (Database.ExportReplay). Playback replays body
		// sync points indexed by the order of the dynamic ShapeParts (replayBodies),
		// and TriggerPress key records index into state.parts DIRECTLY — so the
		// terrain must be rebuilt from the BUNDLED settings (exactly like Jaybit's
		// `ControllerSandbox.settings = robot.settings` on replay load), not left as
		// whatever this session's sandbox happens to be. Otherwise a differing
		// terrain part count shifts every TriggerPress partIndex off its part.
		const { replay, robot } = decoded;
		const s = robot.settings;
		const sandbox = {
			gravity: s.gravity,
			size: s.size,
			terrainType: s.terrainType,
			terrainTheme: s.terrainTheme,
			background: s.background,
			backgroundR: s.backgroundR,
			backgroundG: s.backgroundG,
			backgroundB: s.backgroundB,
			bounds: computeBounds({ size: s.size, terrainType: s.terrainType }),
			// IB3 water settings ride on the SandboxSettings (optional-guarded on
			// decode); project them into the sandbox slice (waterSystem.ts).
			water: waterStateFromSettings(s),
		};
		const terrain = buildTerrainParts(sandbox);
		for (const p of terrain) p.id = ++this.nextId;
		for (const p of robot.parts) p.id = ++this.nextId;
		this.state = {
			...this.state,
			sandbox,
			parts: [...terrain, ...robot.parts],
			edit: { ...this.state.edit, selection: [], selectedPart: null },
		};
		// Loading a replay replaces the robot — lift any exposure lock (Jaybit
		// recomputes curRobotEditable on every load).
		this.setRobotEditable(true);
		this.markChanged();
		this.dispatch({ type: "playReplay", data: replay });
	}

	/**
	 * Decode the built-in main-menu DEMO replay from its two RAW asset blobs
	 * (resource/replay.dat + resource/robot.dat) and begin sim-FREE playback.
	 * This is the RAW replay+robot format ControllerMainMenu.LoadReplay reads
	 * (ControllerMainMenu.ts:443-457) — NOT the base64 export string importReplay
	 * takes. Otherwise identical to importReplay: seed the parts graph with the
	 * bundled robot (fresh ids) then playReplay drives the bodies from the recorded
	 * sync points. Editing-phase only. Callers loop by dispatching `viewReplayAgain`
	 * once state.replay.finished. Throws if either blob can't be decoded.
	 */
	async loadDemoReplay(
		replayBlob: ArrayBuffer | Uint8Array,
		robotBlob: ArrayBuffer | Uint8Array,
	): Promise<void> {
		if (this.state.sim.phase !== "editing") return;
		const { replay, robot } = await decodeDemoReplay(replayBlob, robotBlob);
		for (const p of robot.parts) p.id = ++this.nextId;
		const terrain = this.state.parts.filter((p) => (p as { isSandbox?: boolean }).isSandbox);
		this.state = {
			...this.state,
			parts: [...terrain, ...robot.parts],
			edit: { ...this.state.edit, selection: [], selectedPart: null },
		};
		this.markChanged();
		this.dispatch({ type: "playReplay", data: replay });
	}

	/**
	 * Apply one playback frame's replay instructions (Replay.Update -> the
	 * ControllerGame apply methods). Camera movements set the camera state; the
	 * body sync hard-sets (SyncReplay) or spline-interpolates (SyncReplay2); key
	 * presses would fire text/cannon parts (KeyInput) — in the headless core we
	 * forward them to each part's KeyInput so text/cannon parts react.
	 */
	private applyReplayFrame(frame: number): void {
		if (!this.replaySession) return;
		const tick = replayUpdate(this.replaySession, frame);

		// Camera (MoveCameraForReplay :777-790).
		let cam = { drawXOff: this.state.camera.offsetX, drawYOff: this.state.camera.offsetY, scale: this.state.camera.scale };
		for (const mv of tick.cameraMovements) {
			cam = moveCameraForReplay(mv, cam);
		}
		if (
			cam.drawXOff !== this.state.camera.offsetX ||
			cam.drawYOff !== this.state.camera.offsetY ||
			cam.scale !== this.state.camera.scale
		) {
			this.state = {
				...this.state,
				camera: { offsetX: cam.drawXOff, offsetY: cam.drawYOff, scale: cam.scale },
			};
			this.markChanged();
		}

		// Body sync (SyncReplay / SyncReplay2). The world is frozen — we hard-set
		// or interpolate bodies straight from the recorded sync points.
		const bodies = this.replayBodies();
		const cannonballs = this.replayCannonballs();
		if (tick.sync) {
			if (tick.sync.kind === "hard") {
				syncReplay(tick.sync.syncPoint, bodies, cannonballs, (x, y) => this.vec(x, y));
			} else if (this.replaySession.splines) {
				syncReplay2(
					tick.sync.segmentIndex,
					tick.sync.syncPoint1,
					tick.sync.syncPoint2,
					frame,
					this.replaySession.splines,
					bodies,
					cannonballs,
					(x, y) => this.vec(x, y),
				);
			}
		}

		// Key presses (KeyInput :1868-1883): a plain KeyPress fans out to every
		// part so text/cannon parts react at the recorded frame; a TriggerPress
		// (partIndex present) routes to EXACTLY the recorded part — legacy
		// playback keyInput's `param4 == -1 || param4 == i` gate (:2238-2241),
		// so a triggered cannon fires only the one cannon the trigger fired.
		for (const kp of tick.keyPresses) {
			if (kp.partIndex != null) {
				const p = this.state.parts[kp.partIndex] as
					| { KeyInput?: (k: number, up: boolean, replay: boolean) => void }
					| undefined;
				p?.KeyInput?.(kp.key, true, true);
				continue;
			}
			for (const p of this.state.parts) {
				(p as unknown as { KeyInput?: (k: number, up: boolean, replay: boolean) => void }).KeyInput?.(kp.key, true, true);
			}
		}
	}

	// --- Tutorials ----------------------------------------------------------
	//
	// See docs/PORT-SPEC-tutorials-replays.md §A and src/core/tutorials.ts. The
	// active tutorial's hand-coded machine (tutorialMachine) drives which dialog
	// shows; game events (part created / won) advance it.

	/** Project the active tutorial machine + current dialog into state.tutorial. */
	private tutorialStateSnapshot(current: { id: number; hasMore: boolean } | null): TutorialState {
		const machine = this.tutorialMachine;
		if (!machine) {
			return {
				active: false,
				levelIndex: -1,
				currentMessageId: null,
				currentMessage: null,
				levelsDone: [...this.levelsDone],
				won: false,
			};
		}
		let message = null as TutorialState["currentMessage"];
		if (current) {
			const anchor = machine.worldAnchorFor(current.id);
			// Project a world anchor through the CURRENT camera (World2ScreenX/Y),
			// else use the screen anchor directly.
			let sx: number;
			let sy: number;
			if (anchor) {
				sx = anchor.x * this.state.camera.scale - this.state.camera.offsetX;
				sy = anchor.y * this.state.camera.scale - this.state.camera.offsetY;
			} else {
				const s = machine.screenAnchorFor(current.id);
				sx = s.x;
				sy = s.y;
			}
			message = resolveMessage(current.id, sx, sy, current.hasMore);
		}
		return {
			active: true,
			levelIndex: machine.levelIndex,
			currentMessageId: current ? current.id : null,
			currentMessage: message,
			levelsDone: [...this.levelsDone],
			// Latches on the tutorial "won" event; drives the App congrats popup.
			won: this.tutorialWonFired,
		};
	}

	/** Apply a DialogAction from the tutorial machine to state.tutorial. */
	private applyTutorialDialog(action: DialogAction | null): void {
		if (!this.tutorialMachine || !action) return;
		if (action.kind === "dismiss") {
			this.state = { ...this.state, tutorial: this.tutorialStateSnapshot(null) };
		} else if (action.kind === "show" && action.id != null) {
			this.state = {
				...this.state,
				tutorial: this.tutorialStateSnapshot({ id: action.id, hasMore: action.hasMore ?? false }),
			};
		}
		this.markChanged();
	}

	/**
	 * Notify the active tutorial machine of a game event (part created / won),
	 * replacing the subclass method overrides. Advances the dialog if the event
	 * triggers a transition.
	 */
	private notifyTutorial(event: TutorialEvent): void {
		if (!this.tutorialMachine) return;
		if (event.type === "won") {
			if (this.tutorialWonFired) return;
			this.tutorialWonFired = true;
			// Level-done write on win (ControllerGame.ts:754-762): tutorial idx ==
			// type-10; via the level record this is just levelIndex.
			const idx = this.tutorialMachine.levelIndex;
			if (idx >= 0 && idx < this.levelsDone.length) this.levelsDone[idx] = true;
		}
		const action = this.tutorialMachine.onEvent(event);
		if (action) this.applyTutorialDialog(action);
		else {
			// Still refresh levelsDone projection even without a dialog change.
			this.state = {
				...this.state,
				tutorial: this.tutorialStateSnapshot(
					this.state.tutorial && this.state.tutorial.currentMessageId != null
						? { id: this.state.tutorial.currentMessageId, hasMore: this.state.tutorial.currentMessage?.hasMore ?? false }
						: null,
				),
			};
			this.markChanged();
		}
	}

	/**
	 * Per-frame tutorial win predicate (H2) — a faithful port of each base
	 * tutorial's ControllerXxx.ChallengeOver() body-position check, evaluated on
	 * the live b2Body world centres during the running sim. All are gated on the
	 * sim having started (the caller only invokes this while running). Returns true
	 * on the first frame the level's win condition is met.
	 *
	 *   0 Tank      (ControllerTank.ts:320-326): `this.object` (the blue win-target
	 *               rect) at -15 < x < -3 && y > 12.
	 *   1 Shapes    (ControllerShapes.ts:48-59): ANY editable Circle at
	 *               -15 < x < -3 && y > 10.
	 *   2 Car       (ControllerCar.ts:138-149): ANY editable ShapePart at
	 *               x < -7 && y > 12.
	 *   3 Jumpbot   (ControllerJumpbot.ts:131-142): ANY editable ShapePart at
	 *               -15 < x < -3 && 11 < y < 18.
	 *   4 Dumpbot   (ControllerDumpbot.ts:239-247): ALL three win-target objects
	 *               each at -15 < x < -3 && y > 12.
	 *   5 Catapult  (ControllerCatapult.ts:138-144): `this.ball` (the green
	 *               win-target circle) at -15 < x < -3 && y > 12.5.
	 */
	private tutorialChallengeOver(levelIndex: number): boolean {
		const centre = (p: Part): { x: number; y: number } | null => {
			const body = (p as unknown as { GetBody?: () => BodyLike | null }).GetBody?.();
			if (!body) return null;
			const c = (body as unknown as { GetWorldCenter: () => { x: number; y: number } }).GetWorldCenter();
			return c;
		};
		const winTargets = (): Part[] =>
			this.state.parts.filter((p) => (p as { tutorialWinTarget?: boolean }).tutorialWinTarget);
		switch (levelIndex) {
			case 0: {
				const t = winTargets()[0];
				if (!t) return false;
				const c = centre(t);
				return !!c && c.x > -15 && c.y > 12 && c.x < -3;
			}
			case 1: {
				for (const p of this.state.parts) {
					if (p instanceof Circle && p.isEditable) {
						const c = centre(p);
						if (c && c.x > -15 && c.x < -3 && c.y > 10) return true;
					}
				}
				return false;
			}
			case 2: {
				for (const p of this.state.parts) {
					if (p instanceof ShapePart && p.isEditable) {
						const c = centre(p);
						if (c && c.x < -7 && c.y > 12) return true;
					}
				}
				return false;
			}
			case 3: {
				for (const p of this.state.parts) {
					if (p instanceof ShapePart && p.isEditable) {
						const c = centre(p);
						if (c && c.x > -15 && c.x < -3 && c.y > 11 && c.y < 18) return true;
					}
				}
				return false;
			}
			case 4: {
				const targets = winTargets();
				if (targets.length < 3) return false;
				for (const t of targets) {
					const c = centre(t);
					if (!c || !(c.x > -15 && c.y > 12 && c.x < -3)) return false;
				}
				return true;
			}
			case 5: {
				const t = winTargets()[0];
				if (!t) return false;
				const c = centre(t);
				return !!c && c.x > -15 && c.x < -3 && c.y > 12.5;
			}
			default:
				return false;
		}
	}

	/**
	 * Per-frame tutorial dialog milestones driven by a body-position check
	 * (ControllerRubeGoldberg.Update dialog 81 / ControllerNewFeatures.Update
	 * dialog 89). Evaluated each running-sim frame while a tutorial is active. The
	 * machine's cursor gating means firing the key only advances if it is the next
	 * expected step, so evaluating every frame is safe.
	 *   7 RubeGoldberg: `this.ball` progress target at x > 25 && y > 9 -> "reachedEnd".
	 *   8 NewFeatures:  `this.middle` progress target at x < -25 && y > -8 -> "botInBox".
	 */
	private tutorialFrameProgress(): void {
		const machine = this.tutorialMachine;
		if (!machine) return;
		const target = this.state.parts.find(
			(p) => (p as { tutorialProgressTarget?: boolean }).tutorialProgressTarget,
		);
		if (!target) return;
		const body = (target as unknown as { GetBody?: () => BodyLike | null }).GetBody?.();
		if (!body) return;
		const c = (body as unknown as { GetWorldCenter: () => { x: number; y: number } }).GetWorldCenter();
		if (!c) return;
		if (machine.levelIndex === 7 && c.x > 25 && c.y > 9) {
			this.notifyTutorial({ type: "progress", key: "reachedEnd" });
		} else if (machine.levelIndex === 8 && c.x < -25 && c.y > -8) {
			this.notifyTutorial({ type: "progress", key: "botInBox" });
		}
	}

	/**
	 * Emit the strength/speed-slider tutorial milestones shared by setJointStrength
	 * and setJointSpeed. Faithful to the legacy Update() checks:
	 *   Jumpbot (ControllerJumpbot.Update :106): the piston's strength AND speed both
	 *     raised above 15 -> dialog 19 "powerIncreased".
	 *   Dumpbot (ControllerDumpbot.Update :228): the loading-arm motor's speed < 15,
	 *     strength > 15, and stiff -> dialog 31 "motorAdjusted".
	 * Both are cursor-gated, so evaluating the whole graph each slider change is safe.
	 */
	private emitJointPowerMilestones(partIds: number[]): void {
		const ids = new Set(partIds);
		for (const p of this.state.parts) {
			if (!ids.has(p.id)) continue;
			if (p instanceof PrismaticJoint && p.pistonStrength > 15 && p.pistonSpeed > 15) {
				this.notifyTutorial({ type: "progress", key: "powerIncreased" });
			}
			if (p instanceof RevoluteJoint && p.motorSpeed < 15 && p.motorStrength > 15 && p.isStiff) {
				this.notifyTutorial({ type: "progress", key: "motorAdjusted" });
			}
		}
	}

	/** Resolve a condition's picked ShapeParts by id (for subject-0 / obj-5/6). */
	private applyConditionShapes(
		cond: WinCondition | LossCondition,
		shape1Id: number | null | undefined,
		shape2Id: number | null | undefined,
	): void {
		if (shape1Id != null) {
			const p = this.findPart(shape1Id);
			if (p instanceof ShapePart) cond.shape1 = p;
		}
		if (shape2Id != null) {
			const p = this.findPart(shape2Id);
			if (p instanceof ShapePart) cond.shape2 = p;
		}
	}

	/**
	 * Construct a WinCondition and push it onto the live challenge. Shared by the
	 * addWinCondition command and the interactive-pick finalize path so the
	 * condition-construction lives in ONE place (ConditionsWindow pushed a fresh
	 * WinCondition in both FinishDrawingCondition :272-290 and
	 * FinishSelectingForCondition :323-327). Fires the tutorial milestone.
	 */
	private pushWinCondition(
		name: string,
		subject: number,
		object: number,
		region: { minX: number; maxX: number; minY: number; maxY: number } | null,
		shape1Id: number | null | undefined,
		shape2Id: number | null | undefined,
	): void {
		if (!this.challenge) return;
		const cond = new WinCondition(name, subject, object);
		if (region) {
			cond.minX = region.minX;
			cond.maxX = region.maxX;
			cond.minY = region.minY;
			cond.maxY = region.maxY;
		}
		this.applyConditionShapes(cond, shape1Id, shape2Id);
		this.challenge.challenge.winConditions.push(cond);
		// ChallengeEditor milestones (ControllerChallengeEditor.Update :364-372). The
		// legacy fires 95 "clickedConditions" when the Conditions dialog opens and 96
		// "addingCondition" while a shape is being picked; those UI-dialog steps have
		// no dedicated command, so we walk the machine's cursor through them here (each
		// notifyTutorial advances at most one step) up to 97 "addedWinCondition".
		if (this.tutorialMachine) {
			this.notifyTutorial({ type: "progress", key: "clickedConditions" });
			this.notifyTutorial({ type: "progress", key: "addingCondition" });
			this.notifyTutorial({ type: "progress", key: "addedWinCondition" });
		}
	}

	/** Construct + push a LossCondition; shared by the command and pick paths. */
	private pushLossCondition(
		name: string,
		subject: number,
		object: number,
		immediate: boolean,
		region: { minX: number; maxX: number; minY: number; maxY: number } | null,
		shape1Id: number | null | undefined,
		shape2Id: number | null | undefined,
	): void {
		if (!this.challenge) return;
		const cond = new LossCondition(name, subject, object, immediate);
		if (region) {
			cond.minX = region.minX;
			cond.maxX = region.maxX;
			cond.minY = region.minY;
			cond.maxY = region.maxY;
		}
		this.applyConditionShapes(cond, shape1Id, shape2Id);
		this.challenge.challenge.lossConditions.push(cond);
		// Tutorial milestones (ControllerChallengeEditor): first loss condition
		// -> 100 "addedLoss1"; second -> 102 "addedLoss2".
		if (this.tutorialMachine) {
			const n = this.challenge.challenge.lossConditions.length;
			// The "drawing loss line" (99) / "selecting shape 2" (101) UI steps have no
			// dedicated command; walk the cursor through them before the count milestone.
			if (n === 1) {
				this.notifyTutorial({ type: "progress", key: "addingLoss1" });
				this.notifyTutorial({ type: "progress", key: "addedLoss1" });
			} else if (n === 2) {
				this.notifyTutorial({ type: "progress", key: "addingLoss2" });
				this.notifyTutorial({ type: "progress", key: "addedLoss2" });
			}
		}
	}

	// --- Interactive condition stage-picking -------------------------------
	//
	// Faithful port of ConditionsWindow.addWin/LossButtonPressed (:226-268) +
	// GetBox/HLine/VLine/ShapeForConditions (ControllerGame :1088-1114) +
	// FinishDrawingCondition / FinishSelectingForCondition (:270-336).

	/** Compute what pick a draft's OBJECT needs (after any shape1 pick is done). */
	private awaitForObject(object: number): "box" | "hline" | "vline" | "shape2" {
		// ConditionsWindow: obj 0 -> box; obj <3 (1,2) -> horizontal line; obj <5
		// (3,4) -> vertical line; else (5,6) -> a second shape (:234-243).
		if (object === 0) return "box";
		if (object < 3) return "hline";
		if (object < 5) return "vline";
		return "shape2";
	}

	/** Push the currently-drafted condition (region already applied) + clear the draft. */
	private finalizeConditionDraft(
		region: { minX: number; maxX: number; minY: number; maxY: number } | null,
	): void {
		const draft = this.state.conditionDraft;
		if (!draft || !this.challenge) return;
		if (draft.kind === "win") {
			this.pushWinCondition(draft.name, draft.subject, draft.object, region, draft.shape1Id, draft.shape2Id);
		} else {
			this.pushLossCondition(
				draft.name,
				draft.subject,
				draft.object,
				draft.immediate,
				region,
				draft.shape1Id,
				draft.shape2Id,
			);
		}
		this.setConditionDraft(null);
		this.syncChallenge();
	}

	/** Set (or clear) the picking draft on state + notify. */
	private setConditionDraft(draft: import("./GameState").ConditionDraft | null): void {
		this.state = { ...this.state, conditionDraft: draft };
		this.markChanged();
	}

	// --- Undo / redo history -----------------------------------------------
	//
	// Snapshot-based history: before any mutating command we deep-clone the
	// editable state (parts graph + selection/tool) onto the undo stack and clear
	// the redo stack. undo/redo swap the current state with the top of the
	// respective stack. This is simpler and more robust than per-command inverse
	// Actions (the legacy src/Actions/* approach), which depend on a static
	// ControllerGame the headless core doesn't have.

	/**
	 * Deep-clone a parts array into independent instances, preserving each
	 * Part's `id` (MakeCopy() mints fresh objects and does NOT copy id, so we
	 * reassign it) and re-linking joints/thrusters to the CLONED parent shapes.
	 * Parent shapes are resolved by id, so shape order is irrelevant.
	 */
	private cloneParts(parts: Part[]): Part[] {
		// Clone shapes/text first and index the clones by original id so joints
		// and thrusters can re-attach to the cloned shapes (they hold parent
		// references by object identity, not id).
		const cloneById = new Map<number, Part>();
		const shapeCloneById = new Map<number, ShapePart>();
		const result: Part[] = [];

		for (const p of parts) {
			if (p instanceof ShapePart) {
				const copy = p.MakeCopy();
				copy.id = p.id;
				cloneById.set(p.id, copy);
				shapeCloneById.set(p.id, copy);
				result.push(copy);
			} else if (p instanceof TextPart) {
				const copy = p.MakeCopy();
				copy.id = p.id;
				cloneById.set(p.id, copy);
				result.push(copy);
			}
		}

		// Now clone joints and thrusters, wiring them to the cloned shapes.
		for (const p of parts) {
			if (p instanceof JointPart) {
				const c1 = shapeCloneById.get(p.part1.id);
				const c2 = shapeCloneById.get(p.part2.id);
				if (!c1 || !c2) continue; // dangling joint — drop it defensively
				const copy = p.MakeCopy(c1, c2);
				copy.id = p.id;
				cloneById.set(p.id, copy);
				result.push(copy);
			} else if (p instanceof Thrusters) {
				const parent = shapeCloneById.get(p.shape.id);
				if (!parent) continue;
				const copy = p.MakeCopy(parent);
				copy.id = p.id;
				cloneById.set(p.id, copy);
				result.push(copy);
			}
		}

		// Preserve the original ordering (renderer / hit-testing depend on it).
		return parts.map((p) => cloneById.get(p.id)).filter((p): p is Part => p !== undefined);
	}

	/** Capture the current editable state as a history snapshot. */
	private captureSnapshot(): HistorySnapshot {
		return {
			parts: this.cloneParts(this.state.parts),
			selection: [...this.state.edit.selection],
			tool: this.state.edit.tool,
			editable: this.curRobotEditable,
		};
	}

	/**
	 * Push the current editable state onto the undo stack and clear the redo
	 * stack. Called before applying any mutating command. Also refreshes the
	 * canUndo/canRedo flags (done via the state rebuild in the calling handler).
	 */
	private pushHistory(): void {
		this.undoStack.push(this.captureSnapshot());
		if (this.undoStack.length > HISTORY_CAP) this.undoStack.shift();
		this.redoStack = [];
	}

	/**
	 * Restore a history snapshot's parts/selection into a fresh state object,
	 * dropping any selection ids that no longer exist and recomputing
	 * selectedPart + canUndo/canRedo. Immutable per the existing handlers.
	 */
	private restoreSnapshot(snap: HistorySnapshot): void {
		const live = new Set(snap.parts.map((p) => p.id));
		const selection = snap.selection.filter((id) => live.has(id));
		// Restore the robot-exposure lock so undoing an uneditable import unlocks
		// the editor again (and redo re-locks it). Keep curRobotEditable +
		// edit.editable in lockstep via the single setter.
		this.setRobotEditable(snap.editable);
		this.state = {
			...this.state,
			parts: snap.parts,
			edit: {
				...this.state.edit,
				tool: snap.tool,
				selection,
				selectedPart: null,
				canUndo: this.undoStack.length > 0,
				canRedo: this.redoStack.length > 0,
			},
		};
		// deriveSelectedPart reads this.state.parts, so compute after the swap.
		this.state = {
			...this.state,
			edit: { ...this.state.edit, selectedPart: this.deriveSelectedPart(selection) },
		};
		this.markChanged();
	}

	private handleUndo(): void {
		const snap = this.undoStack.pop();
		if (!snap) return;
		this.redoStack.push(this.captureSnapshot());
		this.restoreSnapshot(snap);
	}

	private handleRedo(): void {
		const snap = this.redoStack.pop();
		if (!snap) return;
		this.undoStack.push(this.captureSnapshot());
		this.restoreSnapshot(snap);
	}

	/**
	 * Build a plain-data PartSnapshot from a live Part, branching on `type`.
	 * Colour channels stay 0-255 (as stored on the Part); opacity is converted
	 * from the Part's 0-255 storage to the 0-1 scale the view/commands use.
	 */
	private snapshotOf(part: Part): PartSnapshot {
		const kind = part.type;

		// --- ShapePart family (Circle/Rectangle/Triangle/Cannon) ---
		// The common physical properties come from ShapePart; geometry and the
		// cannon-only strength/fireKey are layered on per concrete type. Fields
		// mirror the src/Actions/* handlers (ShapeCheckboxAction, CameraAction,
		// ChangeSliderAction density, ColourChangeAction).
		if (part instanceof ShapePart) {
			const snap: PartSnapshot = {
				id: part.id,
				kind,
				x: part.centerX,
				y: part.centerY,
				red: part.red,
				green: part.green,
				blue: part.blue,
				opacity: part.opacity / 255,
				angle: part.angle,
				density: part.density,
				friction: part.friction,
				restitution: part.restitution,
				collide: part.collide,
				collA: part.collA,
				collB: part.collB,
				collC: part.collC,
				collD: part.collD,
				subColl: part.subColl,
				cameraFocus: part.isCameraFocus,
				fixate: part.isStatic, // "Fixate" == Part.isStatic
				fixedRotation: part.fixedRotation, // IB3 ShapePart.fixedRotation
				outline: part.outline,
				outlineBehind: part.terrain, // "Outlines Behind" == terrain
				undragable: part.undragable,
				// Trigger SOURCE fields (two symmetric slots) — read uniformly so the
				// group-edit UI can compute [varies] without touching live parts.
				triggerName: part.triggerName,
				triggerName_2: part.triggerName_2,
				triggerAction: part.triggerAction,
				triggerAction_2: part.triggerAction_2,
				onSameName: part.onSameName,
				onSameName_2: part.onSameName_2,
				onGroundHit: part.onGroundHit,
				onGroundHit_2: part.onGroundHit_2,
			};
			if (part instanceof Circle) snap.radius = part.radius;
			if (part instanceof Rectangle) {
				snap.w = part.w;
				snap.h = part.h;
			}
			if (part instanceof Polygon) {
				snap.verts = (part.GetVertices() as { x: number; y: number }[]).map((v) => ({ x: v.x, y: v.y }));
			}
			if (part instanceof Cannon) {
				snap.w = part.w;
				snap.strength = part.strength;
				snap.fireKey = part.fireKey;
				// Cannon is also a trigger TARGET (fires on a named trigger).
				snap.triggerList = part.triggerList;
			}
			if (part instanceof Bomb) {
				// Bomb fields (IB3 Bomb.as:32-54); radius came from the Circle branch.
				snap.strength = part.strength;
				snap.blastRadius = part.blastRadius;
				snap.bombDelay = part.delay;
				snap.delayAfterTrigger = part.delayAfterTrigger;
				snap.explodeOnImpact = part.explodeOnImpact;
				snap.delayAfterImpact = part.delayAfterImpact;
				snap.repeatable = part.repeatable;
				snap.repeat = part.repeat;
				snap.sensitive = part.sensitive;
				snap.sensitivity = part.sensitivity;
				snap.deflect = part.deflect;
				// Bomb is also a trigger TARGET (detonates on a named trigger).
				snap.triggerList = part.triggerList;
			}
			return snap;
		}

		// --- RevoluteJoint ("Rotating Joint") ---
		if (part instanceof RevoluteJoint) {
			return {
				id: part.id,
				kind,
				x: part.anchorX,
				y: part.anchorY,
				red: 0,
				green: 0,
				blue: 0,
				opacity: 1,
				motorOn: part.enableMotor,
				strength: part.motorStrength,
				speed: part.motorSpeed,
				// Limits stored in degrees; the ∓MAX_VALUE sentinel means "None".
				lowerLimit: part.motorLowerLimit === -Number.MAX_VALUE ? null : part.motorLowerLimit,
				upperLimit: part.motorUpperLimit === Number.MAX_VALUE ? null : part.motorUpperLimit,
				keyCW: part.motorCWKey,
				keyCCW: part.motorCCWKey,
				autoCW: part.autoCW,
				autoCCW: part.autoCCW,
				enableKeyCW: part.enableKeyCW,
				enableKeyCCW: part.enableKeyCCW,
				stiff: part.isStiff,
				// Rotating joint is a trigger TARGET (a triggerList drives/destroys it).
				triggerList: part.triggerList,
			};
		}

		// --- FixedJoint ("Fixed Joint") — minimal props; a trigger TARGET only ---
		// A fixed joint carries no motor/material; its only editable property is the
		// triggerList (a non-empty list makes it a breakable "triggered" joint —
		// FixedJoint.IsTriggered). Snapshotted so the FixedJoint inspector + group
		// edit read it uniformly (previously FixedJoint fell through to the empty
		// default, and the inspector mis-routed it to the shape panel).
		if (part instanceof FixedJoint) {
			return {
				id: part.id,
				kind,
				x: part.anchorX,
				y: part.anchorY,
				red: 0,
				green: 0,
				blue: 0,
				opacity: 1,
				triggerList: part.triggerList,
			};
		}

		// --- PrismaticJoint ("Sliding Joint") — carries its own colour/collide/outline ---
		if (part instanceof PrismaticJoint) {
			return {
				id: part.id,
				kind,
				x: part.anchorX,
				y: part.anchorY,
				red: part.red,
				green: part.green,
				blue: part.blue,
				opacity: part.opacity / 255,
				motorOn: part.enablePiston,
				strength: part.pistonStrength,
				speed: part.pistonSpeed,
				keyUp: part.pistonUpKey,
				keyDown: part.pistonDownKey,
				autoOscillate: part.autoOscillate,
				autoExpand: part.autoExpand,
				autoRetract: part.autoRetract,
				beginExpanded: part.beginExpanded,
				enableKeyExpand: part.enableKeyExpand,
				enableKeyRetract: part.enableKeyRetract,
				stiff: part.isStiff,
				initialLength: part.initLength,
				collide: part.collide,
				collA: part.collA,
				collB: part.collB,
				collC: part.collC,
				collD: part.collD,
				subColl: part.subColl,
				outline: part.outline,
				// Sliding joint is a trigger TARGET too.
				triggerList: part.triggerList,
			};
		}

		// --- Thrusters ---
		if (part instanceof Thrusters) {
			return {
				id: part.id,
				kind,
				x: part.centerX,
				y: part.centerY,
				red: 0,
				green: 0,
				blue: 0,
				opacity: 1,
				strength: part.strength,
				thrustKey: part.thrustKey,
				autoOn: part.autoOn,
				enableKey: part.enableKey, // IB3 Thrusters.enableKey
				// Thrusters are a trigger TARGET (thrust while a named trigger touches).
				triggerList: part.triggerList,
			};
		}

		// --- TextPart (no opacity field on the part) ---
		if (part instanceof TextPart) {
			return {
				id: part.id,
				kind,
				x: part.x,
				y: part.y,
				red: part.red,
				green: part.green,
				blue: part.blue,
				opacity: 1,
				w: part.w,
				h: part.h,
				text: part.text,
				size: part.size,
				displayKey: part.displayKey,
				alwaysVisible: part.alwaysVisible,
				scaleWithZoom: part.scaleWithZoom,
				angle: part.angle, // IB3 TextPart.angle (radians)
				visibleOnStart: part.visibleOnStart, // IB3 TextPart.visibleOnStart
				// Text parts are a trigger TARGET (display while a named trigger touches).
				triggerList: part.triggerList,
			};
		}

		return { id: part.id, kind, x: 0, y: 0, red: 0, green: 0, blue: 0, opacity: 1 };
	}

	/** Current move anchor of a Part in world units, matching what each type's Move() sets. */
	private currentXY(part: Part): { x: number; y: number } {
		// Return the value each part type's Move() sets, so the play->reset restore
		// (handleReset: snap.part.Move(snap.x, snap.y)) is a no-op relative to the
		// pre-play position. JointPart.Move sets anchorX/anchorY; Thrusters.Move sets
		// centerX/centerY (Thrusters extends Part, NOT ShapePart, so check it before
		// ShapePart); ShapePart.Move sets centerX/centerY; TextPart.Move sets x/y.
		// Previously non-shape/text parts returned {0,0}, so reset dragged every
		// joint and thruster to the origin.
		if (part instanceof JointPart) return { x: part.anchorX, y: part.anchorY };
		if (part instanceof Thrusters) return { x: part.centerX, y: part.centerY };
		if (part instanceof ShapePart) return { x: part.centerX, y: part.centerY };
		if (part instanceof TextPart) return { x: part.x, y: part.y };
		return { x: 0, y: 0 };
	}

	/** Derive the selectedPart snapshot from the FIRST selected id (null if none). */
	private deriveSelectedPart(selection: number[]): PartSnapshot | null {
		if (selection.length === 0) return null;
		const first = this.findPart(selection[0]);
		return first ? this.snapshotOf(first) : null;
	}

	/**
	 * Apply `mutate` to every part in `partIds` (a part may skip itself if the
	 * mutation doesn't apply to its type), then publish a new state with a fresh
	 * parts array and a recomputed selectedPart snapshot. Mirrors the legacy
	 * per-property handlers in ControllerGame (each sets the field on the live
	 * Part; see densitySlider/strengthSlider/*Checkbox), minus the undo-stack
	 * bookkeeping that lands with the undo/redo migration.
	 */
	private editParts(partIds: number[], mutate: (p: Part) => void): void {
		const target = new Set(partIds);
		for (const p of this.state.parts) {
			if (target.has(p.id)) mutate(p);
		}
		this.state = {
			...this.state,
			parts: [...this.state.parts],
			edit: { ...this.state.edit, selectedPart: this.deriveSelectedPart(this.state.edit.selection) },
		};
		this.markChanged();
	}

	// --- Rotate / resize geometry ------------------------------------------

	/**
	 * Selection centroid used as the pivot for both rotate and resize. The legacy
	 * ControllerGame rotates about the highest-mass ShapePart's centre
	 * (rotatingPart, :3449-3458) and resizes about selectedParts[0]'s centre
	 * (initDragX/Y, :3985-3996). We use the mean of the parts' anchors, a stable
	 * pivot independent of selection order that coincides with the single part's
	 * own centre in the common one-part case.
	 */
	private selectionCentroid(parts: Part[]): { x: number; y: number } {
		let sx = 0;
		let sy = 0;
		for (const p of parts) {
			const xy = this.currentXY(p);
			sx += xy.x;
			sy += xy.y;
		}
		const n = parts.length || 1;
		return { x: sx / n, y: sy / n };
	}

	/**
	 * Rotate a part about (cx,cy) by `delta` radians, moving its anchor and (for
	 * shapes/thrusters) advancing its own orientation. Incremental form of
	 * ControllerGame's RotateAround path (MouseDrag :1533) — rotation composes
	 * additively, so feeding the per-move delta equals the original's
	 * `newAngle - initAngle`.
	 */
	private rotatePartAbout(p: Part, cx: number, cy: number, delta: number): void {
		const anchor = this.currentXY(p);
		const dx = anchor.x - cx;
		const dy = anchor.y - cy;
		const cos = Math.cos(delta);
		const sin = Math.sin(delta);
		const nx = cx + dx * cos - dy * sin;
		const ny = cy + dx * sin + dy * cos;
		if (p instanceof ShapePart) {
			p.Move(nx, ny);
			p.angle += delta;
		} else if (p instanceof Thrusters) {
			p.centerX = nx;
			p.centerY = ny;
			p.angle += delta;
		} else if (p instanceof JointPart) {
			p.Move(nx, ny);
			if (p instanceof PrismaticJoint) {
				const ax = p.axis.x;
				const ay = p.axis.y;
				p.axis.x = ax * cos - ay * sin;
				p.axis.y = ax * sin + ay * cos;
			}
		}
	}

	/**
	 * The resize/mirror pivot anchor of a Part (ControllerGame.scaleButton :3980
	 * & mirror* :3495): JointPart → (anchorX,anchorY); TextPart → centre
	 * (x+w/2, y+h/2); Thrusters → (centerX,centerY); ShapePart → (centerX,centerY).
	 */
	private resizeAnchor(part: Part): { x: number; y: number } {
		if (part instanceof JointPart) return { x: part.anchorX, y: part.anchorY };
		if (part instanceof TextPart) return { x: part.x + part.w / 2, y: part.y + part.h / 2 };
		if (part instanceof Thrusters) return { x: part.centerX, y: part.centerY };
		if (part instanceof ShapePart) return { x: part.centerX, y: part.centerY };
		return { x: 0, y: 0 };
	}

	/**
	 * resizeStart — ControllerGame.scaleButton() (:3975-4021). Pivot = the FIRST
	 * selected part's anchor (:3980-3991), captured ONCE. The dragging set is the
	 * union of every selected part's GetAttachedParts() — the whole connected
	 * cluster (:3994-3997). Per part we record dragOff = anchor − pivot (:3998-4010)
	 * and snapshot its immutable baseline via PrepareForResizing() (:4011).
	 */
	private handleResizeStart(partIds: number[]): void {
		const selected = partIds.map((id) => this.findPart(id)).filter((p): p is Part => p !== undefined);
		if (selected.length === 0) {
			this.resizeGesture = null;
			return;
		}
		const pivot = this.resizeAnchor(selected[0]);

		// Union of every selected part's attached cluster (Util.RemoveDuplicates
		// over concatenated GetAttachedParts, :3994-3997).
		const cluster: Part[] = [];
		const seen = new Set<Part>();
		for (const sel of selected) {
			for (const p of sel.GetAttachedParts() as Part[]) {
				if (!seen.has(p)) {
					seen.add(p);
					cluster.push(p);
				}
			}
		}

		const dragXOff: number[] = [];
		const dragYOff: number[] = [];
		for (const p of cluster) {
			const a = this.resizeAnchor(p);
			p.dragXOff = a.x - pivot.x;
			p.dragYOff = a.y - pivot.y;
			dragXOff.push(p.dragXOff);
			dragYOff.push(p.dragYOff);
			p.PrepareForResizing();
		}

		this.resizeGesture = { pivotX: pivot.x, pivotY: pivot.y, parts: cluster, dragXOff, dragYOff };
		this.markChanged();
	}

	/**
	 * resizeApply — the RESIZING_SHAPES branch of MouseDrag (:1553-1665). `sf` is
	 * the TOTAL from-baseline scale factor (already mapped from the mouse delta by
	 * the caller, :1555-1562). We clamp it against every part's init* baseline so
	 * no shape leaves its legal size range (:1564-1620), then set geometry =
	 * baseline × sf and reposition each part so anchor = pivot + dragOff × sf
	 * (:1621-1663). Geometry is derived from the init* snapshot, NOT live geometry.
	 */
	private handleResizeApply(scaleFactor: number): void {
		const g = this.resizeGesture;
		if (!g) return;

		let sf = scaleFactor;
		// Clamp pass (:1564-1620) — verbatim per part type against the init* baseline.
		for (const p of g.parts) {
			if (p instanceof Circle) {
				if (p.initRadius * sf > Circle.MAX_RADIUS) sf = Circle.MAX_RADIUS / p.initRadius;
				if (p.initRadius * sf < Circle.MIN_RADIUS) sf = Circle.MIN_RADIUS / p.initRadius;
			} else if (p instanceof Rectangle) {
				if (p.initW * sf > Rectangle.MAX_WIDTH) sf = Rectangle.MAX_WIDTH / p.initW;
				if (p.initW * sf < Rectangle.MIN_WIDTH) sf = Rectangle.MIN_WIDTH / p.initW;
				if (p.initH * sf > Rectangle.MAX_WIDTH) sf = Rectangle.MAX_WIDTH / p.initH;
				if (p.initH * sf < Rectangle.MIN_WIDTH) sf = Rectangle.MIN_WIDTH / p.initH;
			} else if (p instanceof Triangle) {
				const length1 = Util.GetDist(p.initX1, p.initY1, p.initX2, p.initY2);
				if (length1 * sf > Triangle.MAX_SIDE_LENGTH) sf = Triangle.MAX_SIDE_LENGTH / length1;
				if (length1 * sf < Triangle.MIN_SIDE_LENGTH) sf = Triangle.MIN_SIDE_LENGTH / length1;
				const length2 = Util.GetDist(p.initX1, p.initY1, p.initX3, p.initY3);
				if (length2 * sf > Triangle.MAX_SIDE_LENGTH) sf = Triangle.MAX_SIDE_LENGTH / length2;
				if (length2 * sf < Triangle.MIN_SIDE_LENGTH) sf = Triangle.MIN_SIDE_LENGTH / length2;
				const length3 = Util.GetDist(p.initX2, p.initY2, p.initX3, p.initY3);
				if (length3 * sf > Triangle.MAX_SIDE_LENGTH) sf = Triangle.MAX_SIDE_LENGTH / length3;
				if (length3 * sf < Triangle.MIN_SIDE_LENGTH) sf = Triangle.MIN_SIDE_LENGTH / length3;
			} else if (p instanceof Polygon) {
				// Clamp every edge to Polygon's legal side range (PolygonPart.as:219-247).
				const iv = p.initVertices;
				for (let k = 0; k < iv.length; k++) {
					const a = iv[k];
					const b = iv[(k + 1) % iv.length];
					const len = Util.GetDist(a.x, a.y, b.x, b.y);
					if (len * sf > Polygon.MAX_SIDE_LENGTH) sf = Polygon.MAX_SIDE_LENGTH / len;
					if (len * sf < Polygon.MIN_SIDE_LENGTH) sf = Polygon.MIN_SIDE_LENGTH / len;
				}
			} else if (p instanceof Cannon) {
				if (p.initW * sf > Cannon.MAX_WIDTH) sf = Cannon.MAX_WIDTH / p.initW;
				if (p.initW * sf < Cannon.MIN_WIDTH) sf = Cannon.MIN_WIDTH / p.initW;
			}
		}

		// Apply pass (:1621-1663) — verbatim.
		for (const p of g.parts) {
			const nx = g.pivotX + p.dragXOff * sf;
			const ny = g.pivotY + p.dragYOff * sf;
			if (p instanceof Circle) {
				p.radius = p.initRadius * sf;
				p.Move(nx, ny);
			} else if (p instanceof Rectangle) {
				p.w = p.initW * sf;
				p.h = p.initH * sf;
				p.Move(nx, ny);
			} else if (p instanceof Triangle) {
				p.centerX = nx;
				p.centerY = ny;
				p.x1 = p.centerX + p.initX1 * sf;
				p.y1 = p.centerY + p.initY1 * sf;
				p.x2 = p.centerX + p.initX2 * sf;
				p.y2 = p.centerY + p.initY2 * sf;
				p.x3 = p.centerX + p.initX3 * sf;
				p.y3 = p.centerY + p.initY3 * sf;
			} else if (p instanceof Polygon) {
				p.centerX = nx;
				p.centerY = ny;
				for (let k = 0; k < p.vertices.length; k++) {
					p.vertices[k].x = p.centerX + p.initVertices[k].x * sf;
					p.vertices[k].y = p.centerY + p.initVertices[k].y * sf;
				}
			} else if (p instanceof Cannon) {
				p.w = p.initW * sf;
				p.Move(nx, ny);
			} else if (p instanceof JointPart) {
				p.Move(nx, ny);
				if (p instanceof PrismaticJoint) {
					p.initLength = p.initInitLength * sf;
				}
			} else if (p instanceof TextPart) {
				p.w = p.initW * sf;
				p.h = p.initH * sf;
				p.x = nx - p.w / 2;
				p.y = ny - p.h / 2;
			} else if (p instanceof Thrusters) {
				p.centerX = nx;
				p.centerY = ny;
			}
		}

		this.state = {
			...this.state,
			parts: [...this.state.parts],
			edit: { ...this.state.edit, selectedPart: this.deriveSelectedPart(this.state.edit.selection) },
		};
		this.markChanged();
		if (this.challenge) this.syncChallenge();
	}

	/**
	 * resizeEnd — commit-on-up (:2070-2078). The legacy pushed a ResizeShapesAction
	 * for undo and re-ran CheckIfPartsFit. The port's undo is snapshot-based
	 * (resizeStart already pushed history capturing the pre-resize state), so we
	 * only run the fit-check equivalent (syncChallenge → checkIfPartsFit) and clear
	 * the gesture. DEVIATION: no ResizeShapesAction — snapshot undo supersedes it.
	 */
	private handleResizeEnd(): void {
		if (!this.resizeGesture) return;
		this.resizeGesture = null;
		if (this.challenge) this.syncChallenge();
		this.markChanged();
	}

	/**
	 * mirrorParts — faithful port of ControllerGame.mirrorHorizontal (:3489-3730)
	 * and mirrorVertical (:3732-3973), which are structurally identical and differ
	 * only in the reflected axis. `h` = true for horizontal (reflect X about pivotX,
	 * angle → π − a), false for vertical (reflect Y about pivotY, angle → 2π − a).
	 *
	 * Pass 1 clones each SELECTED shape and records a partMapping parallel to the
	 * ORIGINAL selection (the clone for shapes, -1 for joints/thrusters/text).
	 * Pass 2 rebinds each selected joint/thruster via the mapping; a joint/thruster
	 * whose target is not in the selection is dropped (:3625-3641).
	 *
	 * DEVIATION: the legacy finishes by starting a PASTE mouse-drag of the clones
	 * (:3692-3722). The port has no paste-drag; we place the clones at their
	 * mirrored positions, append them with fresh ids, and select them.
	 */
	/**
	 * HORIZONTAL mirror swaps a shape's rotation-direction trigger actions
	 * (CW<->CCW via TriggerDirectionSwitch, jaybit mirrorHorizontal :3798-3865);
	 * vertical mirror copies the actions unchanged (:1443-1508). Applied to the
	 * Circle/Rectangle/Triangle clones only — Cannon is not a trigger source.
	 */
	private mirrorTriggerActions(clone: ShapePart, horizontal: boolean): void {
		if (!horizontal) return;
		clone.triggerAction = triggerDirectionSwitch(clone.triggerAction);
		clone.triggerAction_2 = triggerDirectionSwitch(clone.triggerAction_2);
	}

	private handleMirror(partIds: number[], axis: "horizontal" | "vertical"): void {
		const h = axis === "horizontal";
		const selectedParts = partIds
			.map((id) => this.findPart(id))
			.filter((p): p is Part => p !== undefined);
		if (selectedParts.length === 0) return;

		const first = selectedParts[0];
		const pivot = this.resizeAnchor(first);
		const centerX = pivot.x;
		const centerY = pivot.y;

		const newParts: Part[] = [];
		// Parallel to selectedParts: the clone for a shape/text, or -1 for the
		// entries Pass 2 rebinds against (joints, thrusters). Note the legacy pushes
		// the TextPart CLONE into newParts but records -1 in the mapping (:3591-3608).
		const partMapping: (ShapePart | -1)[] = [];

		// --- Pass 1: shapes + text ---
		for (const sp of selectedParts) {
			if (sp instanceof Bomb) {
				// Bomb BEFORE the Circle branch (Bomb extends Circle) — the clone must
				// stay a Bomb. MakeCopy carries every bomb + Jaybit field; only the
				// mirrored position/angle differ (same maths as the Circle branch).
				const b = sp.MakeCopy() as Bomb;
				b.Move(h ? centerX - (sp.centerX - centerX) : sp.centerX, h ? sp.centerY : centerY - (sp.centerY - centerY));
				b.angle = h ? Math.PI - sp.angle : 2 * Math.PI - sp.angle;
				this.mirrorTriggerActions(b, h);
				newParts.push(b);
				partMapping.push(b);
			} else if (sp instanceof Circle) {
				const c = h
					? new Circle(centerX - (sp.centerX - centerX), sp.centerY, sp.radius)
					: new Circle(sp.centerX, centerY - (sp.centerY - centerY), sp.radius);
				c.angle = h ? Math.PI - sp.angle : 2 * Math.PI - sp.angle;
				c.isStatic = sp.isStatic;
				c.density = sp.density;
				c.collide = sp.collide;
				c.red = sp.red;
				c.green = sp.green;
				c.blue = sp.blue;
				c.opacity = sp.opacity;
				c.outline = sp.outline;
				c.terrain = sp.terrain;
				c.undragable = sp.undragable;
				// Jaybit mirror fix: material/collision-layer/trigger fields propagate
				// to the mirrored clone (centralized in ShapePart.CopyJaybitFieldsTo —
				// CE-mirrored parts silently reset any field not copied explicitly).
				sp.CopyJaybitFieldsTo(c);
				this.mirrorTriggerActions(c, h);
				newParts.push(c);
				partMapping.push(c);
			} else if (sp instanceof Rectangle) {
				const r = h
					? new Rectangle(centerX - (sp.x - centerX), sp.y, -sp.w, sp.h)
					: new Rectangle(sp.x, centerY - (sp.y - centerY), sp.w, -sp.h);
				r.angle = h ? Math.PI - sp.angle : 2 * Math.PI - sp.angle;
				r.isStatic = sp.isStatic;
				r.density = sp.density;
				r.collide = sp.collide;
				r.red = sp.red;
				r.green = sp.green;
				r.blue = sp.blue;
				r.opacity = sp.opacity;
				r.outline = sp.outline;
				r.terrain = sp.terrain;
				r.undragable = sp.undragable;
				sp.CopyJaybitFieldsTo(r); // Jaybit mirror fix (see Circle above)
				this.mirrorTriggerActions(r, h);
				newParts.push(r);
				partMapping.push(r);
			} else if (sp instanceof Triangle) {
				const verts = sp.GetVertices();
				const t = h
					? new Triangle(
							centerX - (verts[0].x - centerX),
							verts[0].y,
							centerX - (verts[1].x - centerX),
							verts[1].y,
							centerX - (verts[2].x - centerX),
							verts[2].y,
					  )
					: new Triangle(
							verts[0].x,
							centerY - (verts[0].y - centerY),
							verts[1].x,
							centerY - (verts[1].y - centerY),
							verts[2].x,
							centerY - (verts[2].y - centerY),
					  );
				t.isStatic = sp.isStatic;
				t.density = sp.density;
				t.collide = sp.collide;
				t.red = sp.red;
				t.green = sp.green;
				t.blue = sp.blue;
				t.opacity = sp.opacity;
				t.outline = sp.outline;
				t.terrain = sp.terrain;
				t.undragable = sp.undragable;
				sp.CopyJaybitFieldsTo(t); // Jaybit mirror fix (see Circle above)
				this.mirrorTriggerActions(t, h);
				newParts.push(t);
				partMapping.push(t);
			} else if (sp instanceof Polygon) {
				// Mirror every ROTATED vertex about the pivot axis (same maths as the
				// Triangle branch, N verts). The Polygon ctor re-normalizes winding
				// (mirroring flips it) so the b2PolygonShape still builds outward normals.
				const verts = (sp.GetVertices() as { x: number; y: number }[]).map((v) =>
					h ? new b2Vec2(centerX - (v.x - centerX), v.y) : new b2Vec2(v.x, centerY - (v.y - centerY)),
				);
				const pg = new Polygon(verts);
				pg.isStatic = sp.isStatic;
				pg.density = sp.density;
				pg.collide = sp.collide;
				pg.red = sp.red;
				pg.green = sp.green;
				pg.blue = sp.blue;
				pg.opacity = sp.opacity;
				pg.outline = sp.outline;
				pg.terrain = sp.terrain;
				pg.undragable = sp.undragable;
				sp.CopyJaybitFieldsTo(pg); // Jaybit mirror fix (see Circle above)
				this.mirrorTriggerActions(pg, h);
				newParts.push(pg);
				partMapping.push(pg);
			} else if (sp instanceof Cannon) {
				const ca = h
					? new Cannon(centerX - (sp.x - centerX) - sp.w, sp.y, sp.w)
					: new Cannon(sp.x, centerY - (sp.y - centerY) - sp.w / 2, sp.w);
				ca.angle = h ? Math.PI - sp.angle : 2 * Math.PI - sp.angle;
				ca.isStatic = sp.isStatic;
				ca.density = sp.density;
				ca.collide = sp.collide;
				ca.red = sp.red;
				ca.green = sp.green;
				ca.blue = sp.blue;
				ca.opacity = sp.opacity;
				ca.outline = sp.outline;
				ca.terrain = sp.terrain;
				ca.undragable = sp.undragable;
				ca.fireKey = sp.fireKey;
				ca.strength = sp.strength;
				ca.triggerList = sp.triggerList;
				sp.CopyJaybitFieldsTo(ca); // Jaybit mirror fix (see Circle above)
				newParts.push(ca);
				partMapping.push(ca);
			} else if (sp instanceof TextPart) {
				const te = h
					? new TextPart(null, centerX - (sp.x + sp.w / 2 - centerX), sp.y, sp.w, sp.h, sp.text, sp.inFront)
					: new TextPart(null, sp.x, centerY - (sp.y + sp.h / 2 - centerY), sp.w, sp.h, sp.text, sp.inFront);
				te.red = sp.red;
				te.green = sp.green;
				te.blue = sp.blue;
				te.size = sp.size;
				te.alwaysVisible = sp.alwaysVisible;
				te.inFront = sp.inFront;
				te.scaleWithZoom = sp.scaleWithZoom;
				te.displayKey = sp.displayKey;
				// Jaybit mirror fix: the data-only trigger listen list propagates.
				te.triggerList = sp.triggerList;
				newParts.push(te);
				partMapping.push(-1);
			} else if (sp instanceof JointPart || sp instanceof Thrusters) {
				partMapping.push(-1);
			}
		}

		// --- Pass 2: joints + thrusters ---
		for (const sp of selectedParts) {
			let index1 = -1;
			let index2 = -1;
			if (sp instanceof JointPart) {
				for (let j = 0; j < selectedParts.length; j++) {
					if (selectedParts[j] === sp.part1) index1 = j;
					if (selectedParts[j] === sp.part2) index2 = j;
				}
				if (index1 === -1 || index2 === -1) continue;
			} else if (sp instanceof Thrusters) {
				for (let j = 0; j < selectedParts.length; j++) {
					if (selectedParts[j] === sp.shape) index1 = j;
				}
				if (index1 === -1) continue;
			}

			if (sp instanceof FixedJoint) {
				const p1 = partMapping[index1];
				const p2 = partMapping[index2];
				if (p1 === -1 || p2 === -1) continue;
				const fj = h
					? new FixedJoint(p1, p2, centerX - (sp.anchorX - centerX), sp.anchorY)
					: new FixedJoint(p1, p2, sp.anchorX, centerY - (sp.anchorY - centerY));
				// Jaybit mirror fix: the data-only trigger listen list propagates.
				fj.triggerList = sp.triggerList;
				newParts.push(fj);
			} else if (sp instanceof RevoluteJoint) {
				const p1 = partMapping[index1];
				const p2 = partMapping[index2];
				if (p1 === -1 || p2 === -1) continue;
				const rj = h
					? new RevoluteJoint(p1, p2, centerX - (sp.anchorX - centerX), sp.anchorY)
					: new RevoluteJoint(p1, p2, sp.anchorX, centerY - (sp.anchorY - centerY));
				rj.enableMotor = sp.enableMotor;
				rj.motorCWKey = sp.motorCCWKey;
				rj.motorCCWKey = sp.motorCWKey;
				rj.motorStrength = sp.motorStrength;
				rj.motorSpeed = sp.motorSpeed;
				rj.motorLowerLimit = -sp.motorUpperLimit;
				rj.motorUpperLimit = -sp.motorLowerLimit;
				rj.isStiff = sp.isStiff;
				rj.autoCW = sp.autoCCW;
				rj.autoCCW = sp.autoCW;
				// Jaybit mirror fix: the data-only trigger listen list propagates.
				rj.triggerList = sp.triggerList;
				newParts.push(rj);
			} else if (sp instanceof PrismaticJoint) {
				const p1 = partMapping[index1];
				const p2 = partMapping[index2];
				if (p1 === -1 || p2 === -1) continue;
				const pj = new PrismaticJoint(p1, p2, 0, 0, 1, 1);
				pj.anchorX = h ? centerX - (sp.anchorX - centerX) : sp.anchorX;
				pj.anchorY = h ? sp.anchorY : centerY - (sp.anchorY - centerY);
				let axisAngle = Math.atan2(sp.axis.y, sp.axis.x);
				axisAngle = Util.NormalizeAngle(h ? Math.PI - axisAngle : 2 * Math.PI - axisAngle);
				pj.axis = new b2Vec2(Math.cos(axisAngle), Math.sin(axisAngle));
				pj.axis.Normalize();
				pj.initLength = sp.initLength;
				pj.enablePiston = sp.enablePiston;
				pj.pistonUpKey = sp.pistonUpKey;
				pj.pistonDownKey = sp.pistonDownKey;
				pj.pistonStrength = sp.pistonStrength;
				pj.pistonSpeed = sp.pistonSpeed;
				pj.isStiff = sp.isStiff;
				pj.autoOscillate = sp.autoOscillate;
				pj.red = sp.red;
				pj.green = sp.green;
				pj.blue = sp.blue;
				pj.opacity = sp.opacity;
				pj.outline = sp.outline;
				pj.collide = sp.collide;
				// Jaybit mirror fix: the piston's collision layers + subColl (+ the
				// data-only trigger list) propagate to the mirrored clone.
				pj.collA = sp.collA;
				pj.collB = sp.collB;
				pj.collC = sp.collC;
				pj.collD = sp.collD;
				pj.subColl = sp.subColl;
				pj.triggerList = sp.triggerList;
				newParts.push(pj);
			} else if (sp instanceof Thrusters) {
				const parent = partMapping[index1];
				if (parent === -1) continue;
				const th = h
					? new Thrusters(parent, centerX - (sp.centerX - centerX), sp.centerY)
					: new Thrusters(parent, sp.centerX, centerY - (sp.centerY - centerY));
				th.angle = h ? Math.PI - sp.angle : 2 * Math.PI - sp.angle;
				th.strength = sp.strength;
				th.thrustKey = sp.thrustKey;
				th.autoOn = sp.autoOn;
				// Jaybit mirror fix: the data-only trigger listen list propagates.
				th.triggerList = sp.triggerList;
				newParts.push(th);
			}
		}

		if (newParts.length === 0) return;

		// Finalize: assign fresh ids, append the clones, select them (DEVIATION —
		// no PASTE drag; place at mirrored positions, :3693-3721 collapsed).
		for (const p of newParts) p.id = ++this.nextId;
		const selection = newParts.map((p) => p.id);
		this.state = {
			...this.state,
			parts: [...this.state.parts, ...newParts],
			edit: {
				...this.state.edit,
				selection,
				selectedPart: this.snapshotOf(newParts[0]),
			},
		};
		this.markChanged();
		if (this.challenge) this.syncChallenge();
	}

	// --- Clipboard (copy / cut / paste) ------------------------------------
	//
	// Faithful port of ControllerGame.copyButton (:4966), cutButton (:4892) and
	// pasteButton (:5023). copyButton snapshots the selected shapes/text plus any
	// joint/thruster whose endpoints are ALL in the selection (the same
	// partMapping idea as mirror), cloning each via MakeCopy so the clipboard is
	// independent of the live graph. cut = copy + delete. paste clones the
	// clipboard again (so the clipboard survives repeated pastes), offsets the
	// clones, assigns fresh ids, appends them and selects them.

	/**
	 * Clone the given selection into an independent clipboard array: every selected
	 * ShapePart/TextPart is MakeCopy'd, and every selected joint/thruster whose
	 * endpoint shapes are BOTH in the selection is re-bound onto the clones (a
	 * joint/thruster with an endpoint outside the selection is dropped). Mirrors
	 * copyButton's partMapping pass (:4982-5018). The result holds fresh Part
	 * instances with NO ids (paste mints them).
	 */
	private cloneSelectionForClipboard(partIds: number[]): Part[] {
		const selectedParts = partIds
			.map((id) => this.findPart(id))
			.filter((p): p is Part => p !== undefined);

		const result: Part[] = [];
		// Parallel to selectedParts: the ShapePart clone, or -1 for text/joints/thrusters.
		const partMapping: (ShapePart | -1)[] = [];

		// Pass 1 — shapes + text (:4984-4995).
		for (const sp of selectedParts) {
			if (sp instanceof ShapePart) {
				const copy = sp.MakeCopy();
				result.push(copy);
				partMapping.push(copy);
			} else if (sp instanceof TextPart) {
				result.push(sp.MakeCopy());
				partMapping.push(-1);
			} else {
				partMapping.push(-1);
			}
		}

		// Pass 2 — joints + thrusters whose endpoints are all in the selection
		// (:4996-5017). Rebind onto the Pass-1 clones via the index mapping.
		for (let i = 0; i < selectedParts.length; i++) {
			const sp = selectedParts[i];
			if (sp instanceof JointPart) {
				let index1 = -1;
				let index2 = -1;
				for (let j = 0; j < selectedParts.length; j++) {
					if (selectedParts[j] === sp.part1) index1 = j;
					if (selectedParts[j] === sp.part2) index2 = j;
				}
				if (index1 === -1 || index2 === -1) continue;
				const p1 = partMapping[index1];
				const p2 = partMapping[index2];
				if (p1 === -1 || p2 === -1) continue;
				result.push(sp.MakeCopy(p1, p2));
			} else if (sp instanceof Thrusters) {
				let index1 = -1;
				for (let j = 0; j < selectedParts.length; j++) {
					if (selectedParts[j] === sp.shape) index1 = j;
				}
				if (index1 === -1) continue;
				const parent = partMapping[index1];
				if (parent === -1) continue;
				result.push(sp.MakeCopy(parent));
			}
		}

		return result;
	}

	/**
	 * copyParts — ControllerGame.copyButton (:4966). Snapshot the selection into the
	 * clipboard (no state mutation, no undo). Editing-phase only.
	 */
	private handleCopy(partIds: number[]): void {
		this.clipboard = this.cloneSelectionForClipboard(partIds);
		// HomeMovies milestone (ControllerHomeMovies.copyButton :433-439): the ragdoll
		// was copied -> dialog 45 "copied". Cursor-gated. (exportRobot also emits this
		// for the encoded-robot copy path; the copy button is the faithful trigger.)
		if (this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "copied" });
	}

	/**
	 * cutParts — ControllerGame.cutButton (:4892). copy + delete the selection. The
	 * delete reuses the deleteParts filtering (same graph edit). Undoable via the
	 * apply() history snapshot (registered mutating).
	 */
	private handleCut(partIds: number[]): void {
		this.handleCopy(partIds);
		const remove = new Set(partIds);
		const parts = this.state.parts.filter((p) => !remove.has(p.id));
		const selection = this.state.edit.selection.filter((id) => !remove.has(id));
		this.state = {
			...this.state,
			parts,
			edit: { ...this.state.edit, selection, selectedPart: this.deriveSelectedPart(selection) },
		};
		this.markChanged();
	}

	/**
	 * pasteParts — ControllerGame.pasteButton (:5023). Clone the clipboard AGAIN (so
	 * repeated pastes stay independent), offset the clones, assign fresh ids, append
	 * them and select them. Joints/thrusters are re-bound onto the freshly-cloned
	 * shapes (same partMapping idea). Undoable (registered mutating).
	 *
	 * OFFSET: the legacy paste places the clones under the mouse cursor and begins a
	 * PASTE mouse-drag (:5085-5252). The headless core has no cursor/drag, so — like
	 * the mirror port's DEVIATION — it applies a small fixed world-unit delta
	 * (PASTE_OFFSET) so the pasted copy is visibly offset from the original and
	 * immediately selected, or honours an explicit dx/dy when the caller supplies one.
	 */
	private handlePaste(dx: number | undefined, dy: number | undefined): void {
		if (this.clipboard.length === 0) return;

		// Restriction gate (pasteButton :5047-5058): reject a paste whose parts are
		// disallowed by the active challenge. partTypeAllowed handles each type.
		if (this.challenge) {
			for (const p of this.clipboard) {
				const kind = this.clipboardPartKind(p);
				if (kind && !partTypeAllowed(this.challenge, kind)) return;
			}
		}

		// Trigger restriction gate (jaybit pasteButton :9183-9256): in challenge
		// play mode with !triggersAllowed, pasting parts carrying ANY trigger
		// config (a shape with a trigger name/action, or a joint/thruster/cannon
		// with a triggerList) is rejected with the legacy dialog.
		if (this.challenge && this.challenge.playMode && !this.challenge.challenge.triggersAllowed) {
			if (this.clipboard.some((p) => this.partCarriesTriggers(p))) {
				this.emitMessage("Sorry, triggers are not allowed in this challenge!");
				return;
			}
		}

		const offX = dx ?? PASTE_OFFSET;
		const offY = dy ?? PASTE_OFFSET;

		// Clone the clipboard into the live graph, re-binding joints/thrusters onto
		// the new shapes. Reuse the clipboard-clone helper by first minting ids on
		// the clipboard parts (so cloneParts can index by id), then clearing them.
		// Simpler: clone directly here mirroring cloneSelectionForClipboard.
		const clip = this.clipboard;
		const newParts: Part[] = [];
		const cloneByIndex: (ShapePart | -1)[] = [];

		for (const sp of clip) {
			if (sp instanceof ShapePart) {
				const copy = sp.MakeCopy();
				// Offset the clone (:5085-5088 places at the cursor; port offsets).
				copy.Move(copy.centerX + offX, copy.centerY + offY);
				newParts.push(copy);
				cloneByIndex.push(copy);
			} else if (sp instanceof TextPart) {
				const copy = sp.MakeCopy();
				copy.Move(copy.x + offX, copy.y + offY);
				newParts.push(copy);
				cloneByIndex.push(-1);
			} else {
				cloneByIndex.push(-1);
			}
		}

		for (let i = 0; i < clip.length; i++) {
			const sp = clip[i];
			if (sp instanceof JointPart) {
				let index1 = -1;
				let index2 = -1;
				for (let j = 0; j < clip.length; j++) {
					if (clip[j] === sp.part1) index1 = j;
					if (clip[j] === sp.part2) index2 = j;
				}
				if (index1 === -1 || index2 === -1) continue;
				const p1 = cloneByIndex[index1];
				const p2 = cloneByIndex[index2];
				if (p1 === -1 || p2 === -1) continue;
				const copy = sp.MakeCopy(p1, p2) as JointPart;
				copy.Move(copy.anchorX + offX, copy.anchorY + offY);
				newParts.push(copy);
			} else if (sp instanceof Thrusters) {
				let index1 = -1;
				for (let j = 0; j < clip.length; j++) {
					if (clip[j] === sp.shape) index1 = j;
				}
				if (index1 === -1) continue;
				const parent = cloneByIndex[index1];
				if (parent === -1) continue;
				const copy = sp.MakeCopy(parent) as Thrusters;
				copy.centerX += offX;
				copy.centerY += offY;
				newParts.push(copy);
			}
		}

		if (newParts.length === 0) return;

		for (const p of newParts) p.id = ++this.nextId;
		const selection = newParts.map((p) => p.id);
		this.state = {
			...this.state,
			parts: [...this.state.parts, ...newParts],
			edit: {
				...this.state.edit,
				selection,
				selectedPart: this.snapshotOf(newParts[0]),
			},
		};
		this.markChanged();
		if (this.challenge) this.syncChallenge();
		// HomeMovies milestone (ControllerHomeMovies.Update :412): the copied ragdoll
		// was pasted -> dialog 46 "pasted". Cursor-gated.
		if (this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "pasted" });
	}

	/** Map a clipboard Part to its CreatePartKind for the paste restriction gate. */
	private clipboardPartKind(p: Part): CreatePartKind | null {
		if (p instanceof Circle) return "circle";
		if (p instanceof Cannon) return "cannon";
		if (p instanceof Rectangle) return "rect";
		if (p instanceof Triangle) return "triangle";
		if (p instanceof FixedJoint) return "fixed";
		if (p instanceof RevoluteJoint) return "revolute";
		if (p instanceof PrismaticJoint) return "prismatic";
		if (p instanceof Thrusters) return "thrusters";
		return null;
	}

	/**
	 * Whether a part carries ANY trigger configuration — a source shape with a
	 * trigger name/action (or a Cannon with a listen list), or a joint/thruster
	 * with a triggerList. Used by the paste + import-and-insert trigger gates
	 * (jaybit pasteButton :9183-9256 / processLoadedRobot :8611).
	 */
	private partCarriesTriggers(p: Part): boolean {
		if (p instanceof ShapePart) {
			if (
				p.triggerName !== "" ||
				p.triggerName_2 !== "" ||
				p.triggerAction !== TRIGGER_NONE ||
				p.triggerAction_2 !== TRIGGER_NONE
			) {
				return true;
			}
			if (p instanceof Cannon && p.triggerList !== "") return true;
			if (p instanceof Bomb && p.triggerList !== "") return true;
			return false;
		}
		if (p instanceof JointPart) return p.triggerList !== "";
		if (p instanceof Thrusters) return p.triggerList !== "";
		return false;
	}

	// --- Z-order (move to front / back) ------------------------------------
	//
	// Faithful port of ControllerGame.frontButton (:4351) and backButton (:4375).
	// Front = drawn LAST (on top); back = drawn FIRST (behind). The legacy operates
	// on a single selected ShapePart/PrismaticJoint (:4353-4356/:4377-4380); we
	// reorder the whole selected set, preserving their relative order.

	/**
	 * movePartsToFront — ControllerGame.frontButton (:4351-4373). Remove the selected
	 * parts from the parts array and re-append them at the END (drawn last / on top),
	 * preserving their relative order. Attached joints/thrusters are NOT moved with
	 * them — frontButton only moves the selected part itself (the joint has its own
	 * z-slot); we mirror that by moving exactly the selected ids.
	 */
	private handleMoveToFront(partIds: number[]): void {
		const move = new Set(partIds);
		const moved = this.state.parts.filter((p) => move.has(p.id));
		if (moved.length === 0) return;
		const rest = this.state.parts.filter((p) => !move.has(p.id));
		this.state = { ...this.state, parts: [...rest, ...moved] };
		this.markChanged();
	}

	/**
	 * movePartsToBack — ControllerGame.backButton (:4375-4397). Move the selected
	 * parts to the FRONT of the array (drawn first / behind), preserving relative
	 * order. The legacy backButton stops moving a part behind a non-editable part
	 * (the sandbox terrain, :4389-4391) so a robot part never sinks below the ground;
	 * we mirror that by inserting the moved parts AFTER the leading run of
	 * non-editable (isSandbox terrain) parts rather than at absolute index 0.
	 */
	private handleMoveToBack(partIds: number[]): void {
		const move = new Set(partIds);
		const moved = this.state.parts.filter((p) => move.has(p.id));
		if (moved.length === 0) return;
		const rest = this.state.parts.filter((p) => !move.has(p.id));
		// Find the insertion point: after the leading run of non-editable parts
		// (terrain), so moved robot parts stay above the ground (backButton :4389).
		let insertAt = 0;
		while (insertAt < rest.length && !rest[insertAt].isEditable) insertAt++;
		const parts = [...rest.slice(0, insertAt), ...moved, ...rest.slice(insertAt)];
		this.state = { ...this.state, parts };
		this.markChanged();
		// HomeMovies milestone (ControllerHomeMovies.Update :368-389): a leg piece
		// moved to back (z-order) -> dialog 56 "movedLegsBack". Cursor-gated.
		if (this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "movedLegsBack" });
	}

	/**
	 * Every ShapePart whose geometry contains (x,y), topmost first. Used by the
	 * joint / thruster creation flows (ControllerGame iterates allParts back to
	 * front collecting InsideShape hits — MaybeCreateJoint :6747).
	 */
	private shapesAt(x: number, y: number): ShapePart[] {
		const hits: ShapePart[] = [];
		const scale = this.state.camera.scale;
		for (let i = this.state.parts.length - 1; i >= 0; i--) {
			const p = this.state.parts[i];
			// Legacy candidate filter: only EDITABLE + ENABLED shapes are joint /
			// thruster attachment candidates (ControllerGame MaybeCreateJoint :6743 /
			// MaybeCreateThrusters :6804 / MaybeStartCreatingPrismaticJoint :6856).
			// This excludes non-editable terrain and disabled shapes.
			if (p instanceof ShapePart && p.isEditable && p.isEnabled && p.InsideShape(x, y, scale)) hits.push(p);
		}
		return hits;
	}

	/**
	 * The nearest EDITABLE shape's centre to (x,y), if within 12/scale world units;
	 * else null. Faithful port of ControllerGame.FindPartToSnapTo (:6939-6962):
	 * scans every ShapePart (excluding an optional part), keeps the closest by
	 * centre distance, returns it only when inside DIST_THRESHHOLD = 12/physScale.
	 */
	private findPartToSnapTo(x: number, y: number, exclude: ShapePart | null = null): ShapePart | null {
		let closest: ShapePart | null = null;
		let closestDist = Number.MAX_VALUE;
		for (const p of this.state.parts) {
			if (p instanceof ShapePart && p !== exclude && p.isEditable) {
				const dist = Util.GetDist(x, y, p.centerX, p.centerY);
				if (dist < closestDist) {
					closestDist = dist;
					closest = p;
				}
			}
		}
		const DIST_THRESHHOLD = 12.0 / this.state.camera.scale;
		return closestDist < DIST_THRESHHOLD ? closest : null;
	}

	/**
	 * Apply snap-to-center to a joint/thruster click point when the snapToCenter
	 * view flag is on (ControllerGame MaybeCreateJoint :6737-6740 /
	 * MaybeCreateThrusters :6798-6801 / MaybeStart/FinishCreatingPrismaticJoint
	 * :6850/:6890): if the nearest editable shape's centre is within 12/scale, the
	 * point snaps to that centre. Returns the (possibly snapped) point.
	 */
	private snapJointPoint(x: number, y: number, exclude: ShapePart | null = null): { x: number; y: number } {
		if (!this.state.edit.snapToCenter) return { x, y };
		const snap = this.findPartToSnapTo(x, y, exclude);
		return snap ? { x: snap.centerX, y: snap.centerY } : { x, y };
	}

	/**
	 * Construct a ShapePart from a click-drag gesture, mirroring
	 * ControllerGame.mouseClick's NEW_CIRCLE/NEW_RECT/NEW_TRIANGLE branches.
	 * (x1,y1) is the press point, (x2,y2) the release point. Returns null for a
	 * degenerate (zero-length) drag so the caller can skip creation. The Part
	 * constructors clamp each dimension to the type's legal MIN/MAX range, so we
	 * only guard the "no drag at all" case here.
	 */
	private buildDraggedShape(
		kind: ShapeKind,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		x3?: number,
		y3?: number,
	): Part | null {
		switch (kind) {
			case "circle": {
				// Press sets the CENTRE, drag sets the radius (ControllerGame :2196).
				const radius = Util.GetDist(x1, y1, x2, y2);
				if (radius <= 0) return null;
				// Circle(x, y, rad) clamps rad to [MIN_RADIUS, MAX_RADIUS] (:2204).
				return new Circle(x1, y1, radius);
			}
			case "rect": {
				// Press/release are opposite corners (ControllerGame :2228). The
				// Rectangle ctor clamps |w|,|h| to [MIN_WIDTH, MAX_WIDTH] and keeps the
				// sign so it can be dragged in any direction.
				if (x2 === x1 && y2 === y1) return null;
				return new Rectangle(x1, y1, x2 - x1, y2 - y1);
			}
			case "triangle": {
				// Faithful port of the original 3-click gesture (ControllerGame :2282).
				// (x1,y1)-(x2,y2) is the BASE edge (already length-clamped by the caller
				// exactly as the original clamps `secondClick` along the drag angle,
				// :2295-2316); (x3,y3) is the APEX from the second click. Validate the
				// same side-length + minimum-angle constraints the original enforces
				// before building (:2329-2360); reject the gesture otherwise.
				if (x3 === undefined || y3 === undefined) return null;
				if ((x3 === x1 && y3 === y1) || (x3 === x2 && y3 === y2)) return null;
				const sideLen1 = Util.GetDist(x1, y1, x3, y3);
				const sideLen2 = Util.GetDist(x2, y2, x3, y3);
				const sideLen0 = Util.GetDist(x1, y1, x2, y2);
				if (sideLen0 <= 0) return null;
				const angle1 = Util.NormalizeAngle(
					Math.acos((sideLen0 * sideLen0 + sideLen1 * sideLen1 - sideLen2 * sideLen2) / (2 * sideLen0 * sideLen1)),
				);
				const angle2 = Util.NormalizeAngle(
					Math.acos((sideLen0 * sideLen0 + sideLen2 * sideLen2 - sideLen1 * sideLen1) / (2 * sideLen0 * sideLen2)),
				);
				const angle3 = Util.NormalizeAngle(
					Math.acos((sideLen1 * sideLen1 + sideLen2 * sideLen2 - sideLen0 * sideLen0) / (2 * sideLen1 * sideLen2)),
				);
				if (
					sideLen1 <= Triangle.MAX_SIDE_LENGTH &&
					sideLen1 >= Triangle.MIN_SIDE_LENGTH &&
					sideLen2 <= Triangle.MAX_SIDE_LENGTH &&
					sideLen2 >= Triangle.MIN_SIDE_LENGTH &&
					angle1 >= Triangle.MIN_TRIANGLE_ANGLE &&
					angle2 >= Triangle.MIN_TRIANGLE_ANGLE &&
					angle3 >= Triangle.MIN_TRIANGLE_ANGLE
				) {
					return new Triangle(x1, y1, x2, y2, x3, y3);
				}
				return null;
			}
			case "bomb": {
				// IB3 GameControl.CreateBomb (:5546-5558): press sets the CENTRE, drag
				// sets the radius (like a circle), and the default blast radius derives
				// from the drawn radius — round(radius * 10, 2dp). The Bomb ctor clamps
				// radius (Circle range) and blastRadius (0..50).
				const radius = Util.GetDist(x1, y1, x2, y2);
				if (radius <= 0) return null;
				return new Bomb(x1, y1, radius, Math.round(radius * 10 * 100) / 100);
			}
			case "polygon":
				// Polygon carries an N-vertex list, not press/drag/apex points, so it
				// is created via the createPolygon command, not createShape.
				throw new Error(`GameCore: createShape "polygon" not supported — use createPolygon`);
			case "cannon":
				// Cannon is created via the createCannon command, not createShape.
				throw new Error(`GameCore: createShape "cannon" not supported — use createCannon`);
			default: {
				const _never: never = kind;
				throw new Error(`GameCore: unknown shape kind ${JSON.stringify(_never)}`);
			}
		}
	}

	// --- Physics simulation -------------------------------------------------

	/**
	 * Build a fresh b2World, mirroring ControllerGame.CreateWorld()
	 * (ControllerGame.ts:6628). Attaches the vendored ContactFilter (which honours
	 * each shape's `collide` / group flags) and a b2ContactListener whose
	 * Add/Remove drive (a) challenge "touching/touched" conditions and (b) the
	 * Jaybit trigger dispatcher (ProcessTriggers) — both run synchronously inside
	 * world.Step. Condition callbacks run FIRST, matching the legacy
	 * ControllerChallenge.ContactAdded which evaluates conditions then calls
	 * super.ContactAdded -> ProcessTriggers (jaybit ControllerChallenge.as:305-319).
	 */
	private createWorld(): b2World {
		// Gravity is read from the sandbox settings at world-creation time — the
		// downward vector b2Vec2(0, sandbox.gravity), matching
		// ControllerSandbox.GetGravity() (:716). Changing gravity via
		// setSandboxSettings therefore takes effect only on the NEXT play (spec §4).
		// The world (bounds + gravity + doSleep) is built through the physics
		// backend seam (P1.5b); the 2.0-specific ContactFilter and the trigger/
		// condition ContactListener are wired here onto the returned handle — a
		// deliberate boundary, since contact-event semantics differ per engine.
		const world = getPhysicsBackend().createWorld({
			lowerX: WORLD_AABB_LOWER.x,
			lowerY: WORLD_AABB_LOWER.y,
			upperX: WORLD_AABB_UPPER.x,
			upperY: WORLD_AABB_UPPER.y,
			gravityX: GRAVITY.x,
			gravityY: this.state.sandbox.gravity,
			doSleep: true,
		});
		// Challenge "touching"/"touched" conditions (obj 5/6) and the trigger
		// runtime both need Box2D contact events. The engine installs its OWN
		// contact filter + listener (P1.5b-2a) and translates its native contact
		// event into an engine-neutral point (shape1/shape2 answering
		// GetUserData(), and identity-comparable against a part's GetShape()).
		// The hook bodies below are identical across engines: the listener is
		// ALWAYS attached (jaybit ControllerGame.CreateWorld wires it
		// unconditionally); condition matching only runs while a challenge exists.
		type ContactPoint = {
			shape1: { GetUserData(): unknown };
			shape2: { GetUserData(): unknown };
		};
		getPhysicsBackend().installContactHandlers(world, {
			onAdd: (point): void => {
				// Conditions FIRST (legacy ControllerChallenge.ContactAdded order).
				if (this.challenge) {
					conditionsContactAdded(this.challenge, point, this.state.parts, this.cannonballs);
				}
				// Trigger dispatch (jaybit ControllerGame.ContactAdded :2462 ->
				// ProcessTriggers(ud1, ud2, true)).
				const cp = point as ContactPoint;
				// Bomb impact marking (IB3 TriggerSystem.Process :37-50): record the
				// live contact on any bomb shape's userData so
				// Bomb.CheckImpactDetonation can arm on NEW impacts next Update.
				markBombImpact(cp.shape1.GetUserData(), cp.shape2.GetUserData(), true);
				processTriggers(
					this.state.parts,
					world,
					cp.shape1.GetUserData() as TriggerUserData,
					cp.shape2.GetUserData() as TriggerUserData,
					true,
					this.triggerKeyInput,
				);
			},
			onRemove: (point): void => {
				// jaybit ControllerGame.ContactRemoved :1257 -> ProcessTriggers(..., false).
				const cp = point as ContactPoint;
				// Bomb impact unmarking (IB3 TriggerSystem.Process, contact-end path).
				markBombImpact(cp.shape1.GetUserData(), cp.shape2.GetUserData(), false);
				processTriggers(
					this.state.parts,
					world,
					cp.shape1.GetUserData() as TriggerUserData,
					cp.shape2.GetUserData() as TriggerUserData,
					false,
					this.triggerKeyInput,
				);
			},
		});
		return world;
	}

	/**
	 * ProcessTriggers' cannon/text FIRE side-effect channel — the port of
	 * `ControllerGame.keyInput(key, up, fromTrigger=true, partIndex)`
	 * (:2225-2251) for the live sim. The part itself already reacted inside its
	 * DetermineTriggered, so this call ONLY records: when `up` (only up-events
	 * persist — a cannon's fire IS its up-event) and the part at partIndex is a
	 * TextPart/Cannon bound to `key`, push a TriggerPress record
	 * ({frame, key, partIndex}) into the recording stream. Never fires during
	 * replay playback (the world is not stepped there, so no contacts arrive).
	 * Bound as an arrow so it can be handed to processTriggers directly.
	 */
	private triggerKeyInput = (key: number, up: boolean, partIndex: number): void => {
		if (!up || this.replaySession || !this.recording) return;
		const part = this.state.parts[partIndex];
		if ((part instanceof TextPart && key === part.displayKey) || (part instanceof Cannon && key === part.fireKey)) {
			recordKeyPress(this.recording, this.state.sim.frame, key, partIndex);
		}
	};

	/**
	 * play: create the world, snapshot each part's edit transform (for reset),
	 * assign collision groups and Init every part into the world, then mark the
	 * sim running. Mirrors ControllerGame.playButton() (ControllerGame.ts:2715):
	 * SetCollisionGroup per part (:2758) then Init(world) (:2764). Resuming from a
	 * paused state just flips the phase back to running — the world is kept.
	 */
	private handlePlay(): void {
		if (this.state.sim.phase === "running") return;
		if (this.state.sim.phase === "paused") {
			this.state = { ...this.state, sim: { ...this.state.sim, phase: "running" } };
			this.markChanged();
			return;
		}

		// Refuse the start when the robot is invalid, mirroring playButton's guard
		// (ControllerGame.ts:2719-2721): CheckIfPartsFit(), starting only when
		// `partsFit || playingReplay`. The fit-check is a no-op outside challenge
		// play mode (checkIfPartsFit returns true unless session.playMode + build
		// areas). A replay playback bypasses the check. The refuse path shows the
		// exact legacy dialog string and does NOT transition to running.
		// DEVIATION: the legacy 750-shape limit (TooManyShapes) is intentionally
		// removed — a robot of any shape count may play.
		if (!this.replaySession) {
			// partsFit only applies in a challenge (checkIfPartsFit no-ops otherwise).
			const partsFit = this.challenge ? checkIfPartsFit(this.challenge, this.state.parts) : true;
			if (!partsFit) {
				this.emitMessage("You must fit your robot inside the starting box first!");
				return;
			}
		}

		// Fresh cannonball list for this run (ControllerGame.ts:2736), and point the
		// partGlobals cannonball sink at it so Cannon.CreateCannonball pushes the
		// spawned bodies into THIS array (Cannon.ts:252-253). Done for every play,
		// not just challenges, matching the legacy unconditional reset.
		this.cannonballs = [];
		setCannonballs(this.cannonballs as unknown[]);

		// Challenge: reset every condition's isSatisfied before a fresh run and
		// clear any prior outcome/score (ControllerChallenge.playButton :52-59).
		if (this.challenge) {
			resetConditions(this.challenge);
			this.challenge.outcome = "playing";
			this.challenge.score = null;
		}

		const world = this.createWorld();

		// Snapshot the pre-play camera so reset can restore the view after a run that
		// auto-panned/followed the robot (ControllerGame.playButton :2776-2777).
		this.cameraSnapshot = { ...this.state.camera };

		// Snapshot pre-play transforms so reset can restore them exactly.
		this.editSnapshots = this.state.parts.map((p) => {
			const xy = this.currentXY(p);
			const angle = p instanceof ShapePart ? p.angle : 0;
			return { part: p, x: xy.x, y: xy.y, angle };
		});

		// Assign a unique collision group per shape (ControllerGame.ts:2755-2760).
		for (const p of this.state.parts) p.checkedCollisionGroup = false;
		this.state.parts.forEach((p, i) => {
			if (p instanceof ShapePart) p.SetCollisionGroup(-(i + 1));
		});

		// Init shapes/text first (ControllerGame.ts:2764-2767), then joints and
		// thrusters (:2769-2773) — a JointPart's Init requires both its shapes to
		// already be initted (see FixedJoint.Init), so ordering matters.
		//
		// CRITICAL: the legacy play loop Inits ShapeParts in REVERSE allParts order
		// (`for (i = this.allParts.length; i >= 0; i--)`, ControllerGame.ts:2759-2761).
		// Order is load-bearing for fixed-joint groups: Circle/Rectangle/etc. Init
		// recursively Inits their fixed-joint-welded partners onto the SAME b2Body
		// (Circle.ts:104-109), so a group's shared body ORIGIN is whichever part is
		// Init'd first — i.e. the LAST part of the group in parts order under the
		// legacy reverse loop. Replay sync points were recorded against those
		// legacy-origin bodies (GetPosition() of the reverse-first part), and are
		// applied back by positional index via SetXForm. Iterating FORWARD here made
		// the FORWARD-first part the origin instead, shifting every part in the group
		// (visibly, the welded circles) by the delta between the two origin parts.
		// Iterate in reverse to reproduce the legacy origins exactly.
		for (let i = this.state.parts.length - 1; i >= 0; i--) {
			const p = this.state.parts[i];
			if (p instanceof ShapePart || p instanceof TextPart) p.Init(world);
		}
		for (const p of this.state.parts) {
			if (p instanceof JointPart || p instanceof Thrusters) p.Init(world);
		}

		// Trigger wiring pass (jaybit playButton :8760-8845): build each source
		// shape's dispatch table (targetPartIndex, action, slot) on its shape
		// userData from CSV token matching. The legacy interleaves this with the
		// two Init loops above; running it after ALL parts are Init'd is
		// equivalent (the pushed part indices index state.parts, our allParts).
		wireTriggers(this.state.parts);

		// Water (IB3 GameControl.playButton :4054 waterControl.Init() + :4110-4126
		// AddBody loop): build the water controller from the sandbox settings and
		// register every buoyant, non-destroyed ShapePart's body. Welded groups
		// share a b2Body — WaterSystem's added-set is the addedToWater guard, and
		// per-shape userData.isBuoyant handles mixed buoyant/non-buoyant groups.
		// DEVIATION: cannonballs spawned mid-sim are NOT added to the water (IB3
		// has no cannon; only ShapeParts ever join the controller).
		this.waterSystem = null;
		if (this.state.sandbox.water.enabled && !this.replaySession) {
			const ws = new WaterSystem(this.state.sandbox.water);
			ws.init(world);
			// (IB3's loop also skips IsDestroyed() parts; nothing is destroyed at
			// play time here — bodies destroyed later (bombs) are unlinked by
			// b2World.DestroyBody's controller cleanup.)
			for (const p of this.state.parts) {
				if (p instanceof ShapePart && p.buoyant) {
					ws.addBody(p.GetBody());
				}
			}
			this.waterSystem = ws;
		}

		// Replay recording / playback setup (ControllerGame.ts:2728-2746). During a
		// normal sim we seed fresh recording buffers (frame 0, +Infinity camera
		// sentinel). During playback (replaySession set) we reset the replay
		// cursors instead — the world is created but never stepped.
		if (this.replaySession) {
			this.replaySession.syncPointIndex = 0;
			this.replaySession.cameraMovementIndex = 0;
			this.replaySession.keyPressIndex = 0;
			this.recording = null;
		} else {
			this.recording = createRecording(this.state.camera.scale);
		}
		this.tutorialWonFired = false;

		this.state = {
			...this.state,
			world,
			sim: { phase: "running", frame: 0 },
			replay: { ...this.state.replay, finished: false },
			// Seed the water surface read-model for the renderer.
			water: this.waterSystem ? this.waterSystem.surface() : null,
		};
		this.markChanged();
		this.syncChallenge();
		this.syncReplayState();
	}

	/** pause: stop stepping but keep the world alive (ControllerGame.pauseButton, :2796). */
	private handlePause(): void {
		if (this.state.sim.phase !== "running") return;
		this.state = { ...this.state, sim: { ...this.state.sim, phase: "paused" } };
		this.markChanged();
	}

	/**
	 * reset: tear the world down, restore each part's pre-play edit transform, and
	 * return to editing. Mirrors ControllerGame.resetButton() (ControllerGame.ts:2803):
	 * UnInit every part (:2815) and go back to the pre-sim state.
	 */
	private handleReset(): void {
		if (this.state.sim.phase === "editing") return;

		// Drop any active mouse-joint grab before tearing the world down (the joint
		// lives on the world, which UnInit/rebuild discards).
		this.mouseJoint = null;

		const world = this.state.world;
		if (world) {
			for (const p of this.state.parts) p.UnInit(world);
		}
		// Water system dies with the world (WaterControl.UnInit).
		this.waterSystem = null;

		// Restore the exact edit-space transform captured at play time.
		for (const snap of this.editSnapshots) {
			snap.part.Move(snap.x, snap.y);
			if (snap.part instanceof ShapePart) snap.part.angle = snap.angle;
		}
		this.editSnapshots = [];

		// Replay: reset recording buffers; playback ends only via stopReplay (reset
		// during editing is a no-op there), so leave replaySession alone here.
		this.recording = null;
		// Restore the pre-play camera so an auto-panned/followed run returns the view
		// to where the user left it (ControllerGame.resetButton :2813-2814).
		const camera = this.cameraSnapshot ?? this.state.camera;
		this.cameraSnapshot = null;
		this.state = {
			...this.state,
			parts: [...this.state.parts],
			camera,
			world: null,
			sim: { phase: "editing", frame: 0 },
			replay: this.replayStateSnapshot(),
			water: null,
		};
		this.markChanged();

		// Challenge: clear the run outcome/score and reset condition flags so the
		// next play starts fresh (conditions are also reset on play :52-59).
		if (this.challenge) {
			this.challenge.outcome = null;
			this.challenge.score = null;
			resetConditions(this.challenge);
			this.cannonballs = [];
			this.syncChallenge();
		}

		// Tutorial milestones tied to the reset button (ControllerJumpbot.resetButton
		// -> 18 "reset"; ControllerCatapult.resetButton -> 37 "reset";
		// ControllerNewFeatures.Update sim-stopped -> 87 "simStopped").
		if (this.tutorialMachine) {
			this.notifyTutorial({ type: "progress", key: "reset" });
			this.notifyTutorial({ type: "progress", key: "simStopped" });
		}
	}

	/**
	 * The ShapePart currently flagged isCameraFocus (and enabled), or null. The
	 * live-play camera follows this part (ControllerGame play-time cameraPart pick,
	 * :2770-2774). The last-flagged focus part wins if several are set (the legacy
	 * loop keeps the last match). We do NOT fall back to FindCenterOfRobot here —
	 * with no focus flag the camera stays where the user left it (the fallback is
	 * only used by CenterOnLoadedRobot for the initial editor framing).
	 */
	/**
	 * Live physical-shape count for the UI's shape counter (Jaybit
	 * ControllerGame.as:6516 `m_guiMenu.shapeCounter.text`): non-sandbox
	 * ShapeParts + PrismaticJoints — Jaybit's PartIsPhysicalAndNotSandBox
	 * predicate (:4109-4112; NOT text, NOT other joint types, NOT thrusters;
	 * pistons count as a shape; cannonballs are not parts and never count).
	 * The legacy 750-shape play limit (TooManyShapes) is intentionally removed;
	 * the count is informational only.
	 */
	public getShapeCount(): number {
		let count = 0;
		for (const p of this.state.parts) {
			if (p.isSandbox) continue;
			if (p instanceof ShapePart || p instanceof PrismaticJoint) count++;
		}
		return count;
	}

	/**
	 * CheckForChallengeLimits equivalent for friction/restitution (Jaybit
	 * ControllerGame.as:4212+, clamp block :4233-4247): clamp a ShapePart's
	 * material to the live challenge's min/max. Applied at construction
	 * (createShape/createCannon — the Jaybit ShapePart ctor clamps its defaults
	 * against the challenge statics) and on robot load (importRobot); text/
	 * slider entry is clamped in the setFriction/setRestitution handlers.
	 * Density is deliberately NOT touched — our port keeps its existing density
	 * handling (clamped only in setDensity).
	 */
	private clampPartToChallengeLimits(part: Part): void {
		if (!this.challenge || !(part instanceof ShapePart)) return;
		part.friction = clampFriction(this.challenge, part.friction);
		part.restitution = clampRestitution(this.challenge, part.restitution);
	}

	/**
	 * Trigger-editing gate: in a challenge PLAY session whose author excluded
	 * triggers (challenge.triggersAllowed=false, Jaybit Challenge.as:66 /
	 * RestrictionsWindow "Exclude Triggers"), the trigger commands are refused
	 * with the legacy paste-dialog string (jaybit ControllerGame.as:9250-9256;
	 * the legacy UI also disables the inputs, AdvancedPropertiesWindow.as:943-976
	 * — the core never trusts the UI). Edit/authoring mode is not gated,
	 * matching the playChallengeMode check.
	 */
	private triggersBlocked(): boolean {
		if (this.challenge && this.challenge.playMode && !this.challenge.challenge.triggersAllowed) {
			this.emitMessage("Sorry, triggers are not allowed in this challenge!");
			return true;
		}
		return false;
	}

	/**
	 * Sanitize a trigger-name CSV: strip `[` and `]` (the inputs' restrict
	 * `"^[]"` — protecting the `[varies]` multi-edit sentinel) and clamp to the
	 * 255-char maxChars (Gui/AdvancedPropertiesWindow.as trigger inputs).
	 */
	private sanitizeTriggerText(value: string): string {
		return value.replace(/[\[\]]/g, "").slice(0, 255);
	}

	private cameraFocusPart(): ShapePart | null {
		let part: ShapePart | null = null;
		for (const p of this.state.parts) {
			if (p instanceof ShapePart && p.isCameraFocus && p.isEnabled) part = p;
		}
		return part;
	}

	/**
	 * HandleCamera (ControllerGame.ts:1233-1247): pan the view to keep the focused
	 * part's body world-centre at the screen focus point. The legacy screen
	 * transform is `screen = world*scale - drawXOff` with the focus pinned at
	 * ZOOM_FOCUS (400,310) in the fixed 800px stage. GameCanvas's transform is
	 * `screen = canvas/2 + world*scale - offset`, so pinning the focus to the
	 * canvas centre means offset = worldCentre*scale. NaN guard mirrors :1241-1244.
	 * No-op during replay playback (the replay owns the camera then) and when no
	 * part is focused. Mutates state.camera in place (called inside the step loop).
	 */
	private handleCamera(): void {
		if (this.replaySession) return;
		const part = this.cameraFocusPart();
		if (!part) return;
		const body = part.GetBody();
		if (!body) return;
		const center = body.GetWorldCenter();
		const scale = this.state.camera.scale;
		const nx = center.x * scale;
		const ny = center.y * scale;
		if (isNaN(nx) || isNaN(ny)) return;
		if (nx !== this.state.camera.offsetX || ny !== this.state.camera.offsetY) {
			this.state = { ...this.state, camera: { ...this.state.camera, offsetX: nx, offsetY: ny } };
			this.markChanged();
		}
	}

	/**
	 * keyInput: a live keyboard event during the running sim (ControllerGame.
	 * keyInput :1868-1883). Forwards KeyInput(key, up, playingReplay) to EVERY
	 * part — setting each part's live control flags (revolute/prismatic motor
	 * direction, thruster on/off, cannon fire, text toggle), which the per-step
	 * Update reads — and records ONLY text-display / cannon-fire keys (on key up,
	 * when not replaying) into the replay stream. `keyPress` gates this on
	 * !paused && !playingReplay (:1885-1888); we gate on the running phase.
	 */
	private handleKeyInput(key: number, up: boolean): void {
		if (this.state.sim.phase !== "running") return;
		const replaying = this.replaySession !== null;
		let recorded = false;
		for (const p of this.state.parts) {
			(p as unknown as { KeyInput?: (k: number, u: boolean, r: boolean) => void }).KeyInput?.(key, up, replaying);
			if (
				!recorded &&
				up &&
				!replaying &&
				((p instanceof TextPart && key === p.displayKey) || (p instanceof Cannon && key === p.fireKey))
			) {
				recorded = true;
				if (this.recording) recordKeyPress(this.recording, this.state.sim.frame, key);
			}
		}
		this.syncReplayState();
	}

	// --- Mouse joint (grab / drag a body during play) -----------------------
	//
	// Faithful port of ControllerGame.MouseDrag's play-mode mouse-joint block
	// (:1782-1809): pointer-down over a draggable body creates a b2MouseJoint,
	// pointer-move retargets it, pointer-up destroys it. Core owns the joint on
	// the world; GameCanvas feeds world-space pointer coords from pointer events.

	/**
	 * GetBodyAtMouse (ControllerGame.ts:6964-6991): the topmost non-static,
	 * non-undragable, non-piston body whose shape contains the cursor. Queries a
	 * ±0.001 AABB, then TestPoint-confirms each candidate shape.
	 */
	private bodyAtMouse(worldX: number, worldY: number): import("../Box2D").b2Body | null {
		const world = this.state.world;
		if (!world) return null;
		const mousePVec = new b2Vec2(worldX, worldY);
		const shapes: import("../Box2D").b2Shape[] = [];
		getPhysicsBackend().queryAABB(
			world,
			worldX - MOUSE_PICK_HALF,
			worldY - MOUSE_PICK_HALF,
			worldX + MOUSE_PICK_HALF,
			worldY + MOUSE_PICK_HALF,
			shapes,
			MOUSE_PICK_MAX_COUNT,
		);
		for (const s of shapes) {
			const ud = (s.GetUserData() ?? {}) as { undragable?: boolean; isPiston?: number };
			// Both engine handles expose GetBody() (2.0 b2Shape / 2.1a b2Fixture).
			const body = s.GetBody();
			if (!body) continue;
			const backend = getPhysicsBackend();
			if (backend.bodyIsStatic(body) === false && !ud.undragable && ud.isPiston === -1) {
				if (backend.shapeTestPoint(s, body, mousePVec)) return body;
			}
		}
		return null;
	}

	/**
	 * mouseJointStart: create a b2MouseJoint on the body under the cursor
	 * (ControllerGame.ts:1782-1794). body1 is the world ground body, body2 the
	 * picked body, target the cursor, maxForce = 300 * body mass, timeStep 1/30.
	 * No-op unless a normal (non-replay) sim is running, nothing is already grabbed,
	 * and a draggable body sits under the cursor.
	 */
	private handleMouseJointStart(worldX: number, worldY: number): void {
		if (this.state.sim.phase !== "running" || this.replaySession) return;
		// ControllerGame.ts:1776-1780 — during the running sim, mouse-dragging bodies
		// is permitted ONLY in the sandbox, or in a challenge whose author set
		// mouseDragAllowed. Tutorials (legacy controllerType "game") and drag-locked
		// challenges (e.g. Climb, which sets mouseDragAllowed=false) permit no dragging.
		// Per-part `undragable` is enforced separately below by bodyAtMouse.
		if (this.tutorialMachine) return;
		if (this.challenge && !this.challenge.challenge.mouseDragAllowed) return;
		const world = this.state.world;
		if (!world || this.mouseJoint) return;
		const body = this.bodyAtMouse(worldX, worldY);
		if (!body) return;
		const md = new b2MouseJointDef();
		md.body1 = world.m_groundBody;
		md.body2 = body;
		md.target.Set(worldX, worldY);
		md.maxForce = MOUSE_JOINT_MAX_FORCE_FACTOR * body.m_mass;
		md.timeStep = MOUSE_JOINT_TIME_STEP;
		this.mouseJoint = getPhysicsBackend().createJoint(world, md);
		getPhysicsBackend().wakeBody(body);
	}

	/**
	 * mouseJointMove: retarget the active mouse joint to the cursor
	 * (ControllerGame.ts:1798-1801). No-op if nothing is grabbed.
	 */
	private handleMouseJointMove(worldX: number, worldY: number): void {
		if (!this.mouseJoint) return;
		(this.mouseJoint as unknown as { SetTarget: (t: b2Vec2) => void }).SetTarget(new b2Vec2(worldX, worldY));
	}

	/**
	 * mouseJointEnd: destroy the active mouse joint (ControllerGame.ts:1804-1808).
	 */
	private handleMouseJointEnd(): void {
		const world = this.state.world;
		if (this.mouseJoint && world) {
			getPhysicsBackend().destroyJoint(world, this.mouseJoint);
		}
		this.mouseJoint = null;
	}

	/**
	 * step: advance the world by `frames` (default 1). Each frame does the two
	 * Box2D sub-steps the legacy Update() loop runs (ControllerGame.ts:584-585):
	 * a warm-up Step(1/60, 5) then Step(1/60, 10). After stepping, sync each
	 * ShapePart's centerX/centerY/angle from its body so the renderer (which draws
	 * from those fields via GetVertices/centerX) shows the live body pose.
	 */
	private handleStep(frames: number): void {
		const world = this.state.world;
		if (this.state.sim.phase !== "running" || !world) return;

		let frame = this.state.sim.frame;
		let ended = false;
		let replayFinished = false;
		for (let f = 0; f < frames; f++) {
			if (this.replaySession) {
				// PLAYBACK: sim-FREE. Drive bodies from sync points + splines and apply
				// recorded camera/key events for this frame (ControllerGame.HandleKey
				// :1182-1186 -> Replay.Update). The world is NOT stepped. frame still
				// advances one logical frame per tick.
				this.applyReplayFrame(frame);
				const tick = replayUpdate(this.replaySession, frame);
				frame++;
				if (tick.done) {
					replayFinished = true;
					ended = true;
					break;
				}
				continue;
			}

			// NORMAL SIM. Mirror the legacy per-frame Update() order: pan the camera
			// to the focused part (HandleCamera, called before MouseDrag/HandleKey
			// when !paused && autoPanning :549-551), then drive every part's live
			// control from the held-key flags (HandleKey's parts.Update loop
			// :1187-1189), then break over-stressed joints (CheckForBreakage
			// :556-559), and finally the two Box2D sub-steps.
			this.handleCamera();
			for (const p of this.state.parts) {
				(p as unknown as { Update?: (w: b2World) => void }).Update?.(world);
			}
			for (const p of this.state.parts) {
				if (p instanceof RevoluteJoint || p instanceof PrismaticJoint) p.CheckForBreakage(world);
			}
			// Capture a sync point every REPLAY_SYNC_FRAMES BEFORE stepping
			// (ControllerGame.ts:578), then the two Box2D sub-steps.
			if (this.recording && frame % REPLAY_SYNC_FRAMES === 0) {
				addSyncPoint(this.recording, frame, this.replayBodies(), this.replayCannonballs());
			}
			getPhysicsBackend().step(world, STEP_DT, STEP_ITERATIONS_WARMUP);
			getPhysicsBackend().step(world, STEP_DT, STEP_ITERATIONS);
			frame++;
			// Replay save cap (ControllerGame.ts:585).
			if (this.recording && (frame >= REPLAY_MAX_FRAMES || this.cannonballs.length > REPLAY_MAX_CANNONBALLS)) {
				this.recording.canSave = false;
			}

			// Tutorial per-frame milestones (H1) + physics win (H2). The base
			// tutorials (Tank/Shapes/Car/Jumpbot/Dumpbot/Catapult) win via a
			// per-frame body-position check in their ChallengeOver(); the sandbox
			// tutorials (RubeGoldberg/NewFeatures) also fire dialog milestones from
			// a per-frame position check in Update() (dialog 81 / 89). Both are
			// evaluated here each non-replay sim frame while a tutorial is active,
			// exactly where the legacy Update()/ChallengeOver() ran.
			if (this.tutorialMachine) {
				this.tutorialFrameProgress();
				if (!this.tutorialWonFired && this.tutorialChallengeOver(this.tutorialMachine.levelIndex)) {
					// Win SFX + advance to the win dialog + mark the level done
					// (ControllerGame.ts:738-772 pauses & records; notifyTutorial({won})
					// writes levelsDone[levelIndex] and shows the win dialog).
					this.emitSound("won");
					this.notifyTutorial({ type: "won" });
					ended = true;
					break;
				}
			}

			// Challenge: evaluate every win + loss condition this frame
			// (ControllerChallenge.Update :23-30), then check for win/loss. The base
			// loop pauses + records the outcome when ChallengeOver() first fires
			// (ControllerGame.ts:738-772). obj-5 "touching" was reset to false at the
			// top of each Condition.Update, then re-set by the frame's contacts;
			// obj-6 "touched" latches. Contacts arrived during world.Step via the
			// listener wired in createWorld.
			if (this.challenge) {
				updateConditions(this.challenge, this.state.parts, this.cannonballs);
				if (challengeOver(this.challenge)) {
					// ControllerGame :743 shows the score window only when actually WON;
					// otherwise (an immediate loss) it's a failure. GetScore uses the
					// frame counter at the moment of win (:749-751).
					if (wonChallenge(this.challenge)) {
						this.challenge.outcome = "won";
						this.challenge.score = getScore(frame);
						// Win SFX (ControllerGame.ts:751 winSound).
						this.emitSound("won");
					} else {
						this.challenge.outcome = "failed";
						this.challenge.score = null;
						// Loss SFX (ControllerGame.ts:770 loseSound).
						this.emitSound("lost");
					}
					ended = true;
					break;
				}
			}
		}

		// The bodies now hold the live transforms; Draw.DrawWorld reads them via
		// GetBody().GetXForm() (Draw.ts:456), so no part-field sync is needed here.
		this.state = {
			...this.state,
			// On a win/loss the base loop pauses the sim (ControllerGame.ts:740).
			// Replay playback also pauses once it reaches numFrames (Replay.Update
			// -> pauseButton, ControllerGame.ts:1183-1184).
			sim: { phase: ended ? "paused" : "running", frame },
			replay: { ...this.state.replay, frame, finished: this.state.replay.finished || replayFinished },
			// Refresh the water surface read-model (tide offset/tilt + live waves
			// animate per controller step inside world.Step).
			water: this.waterSystem ? this.waterSystem.surface() : this.state.water,
		};
		this.markChanged();
		if (this.challenge) this.syncChallenge();

		// Tutorial win trigger: the base loop sets wonChallenge when ChallengeOver()
		// first returns true (ControllerGame.ts:738-739); the tutorial's Update then
		// shows its win dialog (e.g. ControllerTank.Update :309-313). We fire it via
		// the challenge outcome when a tutorial+challenge is active.
		if (this.tutorialMachine && this.challenge && this.challenge.outcome === "won" && !this.tutorialWonFired) {
			this.notifyTutorial({ type: "won" });
		}
	}

	// --- Replay command handlers -------------------------------------------

	/**
	 * playReplay: begin sim-FREE playback of a decoded replay. Sets up the
	 * playback session (splines precomputed) then enters the running phase like
	 * playButton — but with playingReplay set, so handleStep drives bodies from
	 * sync points instead of stepping the world (ControllerGame.ts:2737-2746).
	 */
	private handlePlayReplay(data: ReplayData): void {
		// Only from editing (mirrors playButton's simStarted gate).
		if (this.state.sim.phase !== "editing") return;
		this.replaySession = createReplaySession(data);
		this.state = { ...this.state, replay: { ...this.state.replay, finished: false } };
		this.handlePlay();
	}

	/**
	 * viewReplayAgain: restart the current replay from frame 0 (PostReplayWindow
	 * "View Again!"). Resets the world + cursors and plays again.
	 */
	private handleViewReplayAgain(): void {
		if (!this.replaySession) return;
		// Tear the current world down (like reset) but keep the replay session.
		if (this.state.world) {
			for (const p of this.state.parts) p.UnInit(this.state.world);
		}
		for (const snap of this.editSnapshots) {
			snap.part.Move(snap.x, snap.y);
			if (snap.part instanceof ShapePart) snap.part.angle = snap.angle;
		}
		this.editSnapshots = [];
		this.state = {
			...this.state,
			parts: [...this.state.parts],
			world: null,
			sim: { phase: "editing", frame: 0 },
			replay: { ...this.state.replay, finished: false },
		};
		this.handlePlay();
	}

	/**
	 * stopReplay: end playback and return to editing (PostReplayWindow "Stop
	 * Replay"). Clears the replay session and tears the world down.
	 */
	private handleStopReplay(): void {
		if (!this.replaySession) return;
		this.replaySession = null;
		const world = this.state.world;
		if (world) {
			for (const p of this.state.parts) p.UnInit(world);
		}
		this.waterSystem = null;
		for (const snap of this.editSnapshots) {
			snap.part.Move(snap.x, snap.y);
			if (snap.part instanceof ShapePart) snap.part.angle = snap.angle;
		}
		this.editSnapshots = [];
		this.state = {
			...this.state,
			parts: [...this.state.parts],
			world: null,
			sim: { phase: "editing", frame: 0 },
			replay: { recording: false, playing: false, frame: 0, numFrames: null, canSave: true, finished: false },
			water: null,
		};
		this.markChanged();
	}

	/**
	 * replayKey: a text-display / cannon-fire key at the current frame. During a
	 * normal (recording) sim this both fires the key on parts AND records it into
	 * the stream (ControllerGame.keyInput :1868-1883 — but only for text/cannon
	 * keys). During playback it is applied but NOT recorded.
	 */
	private handleReplayKey(key: number): void {
		if (this.state.sim.phase !== "running") return;
		// Fire the key on every part (KeyInput).
		for (const p of this.state.parts) {
			(p as unknown as { KeyInput?: (k: number, up: boolean, replay: boolean) => void }).KeyInput?.(
				key,
				true,
				this.replaySession !== null,
			);
		}
		// Record ONLY text-display / cannon-fire keys, and only when NOT replaying
		// (matches the legacy `recorded` guard — at most one per call).
		if (this.recording && !this.replaySession) {
			let recorded = false;
			for (const p of this.state.parts) {
				if (recorded) break;
				if (p instanceof TextPart && key === p.displayKey) recorded = true;
				else if (p instanceof Cannon && key === p.fireKey) recorded = true;
			}
			if (recorded) recordKeyPress(this.recording, this.state.sim.frame, key);
		}
		this.syncReplayState();
	}

	/**
	 * moveCameraDuringSim: record a camera pan/zoom during a running sim
	 * (ControllerGame.ts:1837-1842). Also updates the live camera state so the
	 * view follows. No-op during playback (the replay owns the camera then).
	 */
	private handleMoveCameraDuringSim(drawXOff: number, drawYOff: number, scale: number): void {
		if (this.state.sim.phase !== "running" || this.replaySession) return;
		if (this.recording) {
			recordCameraMovement(this.recording, this.state.sim.frame, drawXOff, drawYOff, scale);
		}
		this.state = { ...this.state, camera: { offsetX: drawXOff, offsetY: drawYOff, scale } };
		this.markChanged();
	}

	// --- Tutorial command handlers -----------------------------------------

	/**
	 * loadTutorial: build the tutorial's session and show its first dialog. Sets
	 * the per-tutorial default sandbox settings + initial camera, creates the
	 * hand-coded machine, and runs Init() (ControllerTutorial subclass Init ->
	 * ShowTutorialDialog). Editing-phase only. If the level's machine isn't ported
	 * yet, activates the session with no dialog (framework still usable).
	 */
	private handleLoadTutorial(levelIndex: number): void {
		// Fully reset the previous session first — the legacy game `new`-ed a fresh
		// ControllerTutorial per level, so no prior parts/challenge/history survive.
		// This also drops any running sim (the user may have played the previous mode
		// then returned to the menu), replacing the old phase-guard early-return that
		// silently left the stale scene in place.
		this.resetSessionForLoad();
		const level = tutorialLevel(levelIndex);
		this.tutorialMachine = createTutorialMachine(levelIndex);
		this.tutorialWonFired = false;

		// Apply the per-tutorial default sandbox settings + initial camera.
		if (level) {
			const s = level.settings;
			const sandbox = {
				...this.state.sandbox,
				gravity: s.gravity,
				size: s.size,
				terrainType: s.terrainType,
				terrainTheme: s.terrainTheme,
				background: s.background,
			};
			sandbox.bounds = computeBounds(sandbox);
			this.state = { ...this.state, sandbox };
		}
		if (this.tutorialMachine) {
			const cam = this.tutorialMachine.initialCamera;
			// The tutorial subclasses set draw.m_drawXOff/m_drawYOff directly, in the
			// legacy `screen = world*scale - m_drawOff` convention on the fixed 800x600
			// Flash stage (Draw.m_screenWidth/Height). The responsive canvas projects
			// `screen = canvas/2 + world*scale - camera.offset`, and GameCanvas derives
			// the legacy draw offset back out as `m_drawXOff = camera.offsetX - w/2`.
			// So a legacy m_drawXOff renders identically iff camera.offsetX ==
			// m_drawXOff + (stage width)/2. Convert with the authored stage half-size
			// (400, 300) so Tank (1520,-300) and Catapult (-1880,-220) — and every
			// other tutorial's framing — land on-screen exactly as the original did.
			this.state = {
				...this.state,
				camera: {
					...this.state.camera,
					offsetX: cam.drawXOff + LEGACY_STAGE_WIDTH / 2,
					offsetY: cam.drawYOff + LEGACY_STAGE_HEIGHT / 2,
				},
			};
		}

		// Load the tutorial's prebuilt scene (baked terrain + prefab bot). Tutorials
		// 0-9 supply a scene; the rest return []. Either way the parts graph is
		// REPLACED wholesale (never appended to the previous session's scene): a
		// scene-less tutorial gets a clean sandbox terrain built from its own
		// settings, so no stale parts from the prior mode can persist.
		const setupParts = getTutorialSetup(levelIndex);
		const parts = setupParts.length > 0 ? setupParts : buildTerrainParts(this.state.sandbox);
		for (const p of parts) p.id = ++this.nextId;
		this.state = {
			...this.state,
			parts,
			edit: { ...this.state.edit, selection: [], selectedPart: null },
		};

		// Init() -> first dialog.
		const first = this.tutorialMachine ? this.tutorialMachine.init() : null;
		this.applyTutorialDialog(first ?? { kind: "dismiss" });
	}

	/**
	 * advanceTutorial(messageId): mirrors TutorialWindow.closeWindow ->
	 * cont.CloseTutorialDialog(num). Runs the machine's close(num) switch and
	 * applies the resulting dialog action.
	 */
	private handleAdvanceTutorial(messageId: number): void {
		if (!this.tutorialMachine) return;
		const action = this.tutorialMachine.close(messageId);
		this.applyTutorialDialog(action);
	}

	/** closeTutorial: end the tutorial session (dismiss dialog + clear machine). */
	private handleCloseTutorial(): void {
		this.tutorialMachine = null;
		this.state = { ...this.state, tutorial: null };
		this.markChanged();
	}

	/**
	 * setSandboxSettings: faithful port of AdvancedSandboxWindow's Apply +
	 * ControllerSandbox.RefreshSandboxSettings (ControllerSandbox.ts:570-678).
	 *
	 * Store the new settings on state.sandbox, then (editing phase only, which is
	 * the only phase this reaches — see the sim guard) REBUILD the isSandbox
	 * terrain bodies from the new terrainType/size and recompute the world bounds.
	 * Robot parts (isSandbox false) are untouched; the sim/world are NOT reset.
	 * Gravity is stored but applied only at the next play (createWorld reads
	 * state.sandbox.gravity), matching the legacy deferred behaviour (spec §4).
	 *
	 * Not registered as "mutating" for undo — the legacy Apply is a sandbox-config
	 * operation outside the robot-edit undo history, and it drops/rebuilds the
	 * terrain wholesale (RefreshSandboxSettings clears groundParts, :571-573).
	 */
	private handleSetSandboxSettings(command: Extract<Command, { type: "setSandboxSettings" }>): void {
		const next = {
			gravity: command.gravity,
			size: command.size,
			terrainType: command.terrainType,
			terrainTheme: command.terrainTheme,
			background: command.background,
			backgroundR: command.backgroundR,
			backgroundG: command.backgroundG,
			backgroundB: command.backgroundB,
			bounds: computeBounds({ size: command.size, terrainType: command.terrainType }),
			// Water settings: replaced when the command carries them (P6 water
			// panel), preserved otherwise so pre-water callers are unaffected.
			water: command.water ?? this.state.sandbox.water,
		};

		// Drop the current terrain bodies (isSandbox) and rebuild from the new
		// settings, keeping robot parts in place. Preserve robot-part ordering.
		const robotParts = this.state.parts.filter((p) => !(p as { isSandbox?: boolean }).isSandbox);
		const terrainParts = buildTerrainParts(next);
		for (const p of terrainParts) p.id = ++this.nextId;

		this.state = {
			...this.state,
			sandbox: next,
			// Terrain first so it draws behind robot parts, matching BuildGround
			// which pushes ground into allParts before the robot exists.
			parts: [...terrainParts, ...robotParts],
		};
		this.markChanged();
	}

	/**
	 * Drop all editable robot parts, keeping the sandbox terrain, and reset the
	 * editor to a clean slate. Shared by the newRobot and clearAll commands —
	 * a faithful port of ControllerGame.clearButton (:4845): delete every editable
	 * ShapePart/TextPart (and their joints/thrusters), leaving the static terrain.
	 * Selection -> [], tool -> "select", and the undo/redo history is cleared
	 * (a fresh robot has no history). The terrain is rebuilt from the current
	 * sandbox settings (as setSandboxSettings does) so the ground stays consistent.
	 */
	private clearRobot(): void {
		// Rebuild the sandbox terrain bodies fresh (same as setSandboxSettings), so
		// no stale robot parts survive and terrain ids stay from our monotonic source.
		const terrainParts = buildTerrainParts(this.state.sandbox);
		for (const p of terrainParts) p.id = ++this.nextId;

		// A new robot has no history.
		this.undoStack = [];
		this.redoStack = [];

		this.state = {
			...this.state,
			parts: terrainParts,
			edit: {
				...this.state.edit,
				selection: [],
				selectedPart: null,
				tool: "select",
				...this.undoRedoFlags(),
			},
		};
		this.markChanged();
		// A cleared robot changes whether parts fit the challenge build area.
		if (this.challenge) this.syncChallenge();
	}

	/**
	 * Bring the core to a clean editing baseline before loading a NEW session
	 * (tutorial / challenge / import). The legacy client constructed a fresh
	 * Controller for every mode switch (each ControllerTank / ControllerRace / …
	 * was `new`-ed via Main.SwitchController), so no prior parts, challenge,
	 * tutorial, replay, camera-follow, or undo history could ever bleed through.
	 * The port keeps a single long-lived GameCore across menu navigations, so each
	 * load entry point must reproduce that fresh-controller reset explicitly —
	 * otherwise whatever was loaded last lingers (the "stale content on switch"
	 * bug: opening a tutorial after the sandbox, or switching between challenges,
	 * kept the previous scene).
	 *
	 * Tears down any live world, clears the challenge/tutorial/replay sessions, the
	 * undo/redo history and clipboard-independent play buffers, and resets the sim
	 * to editing / frame 0 with selection + gesture drafts cleared. `parts`,
	 * `sandbox`, and `camera` are intentionally NOT touched here — every caller
	 * supplies its own immediately after (the tutorial's baked scene, the
	 * challenge's decoded parts, etc.).
	 */
	private resetSessionForLoad(): void {
		// Tear down a live world so no running bodies survive the switch (mirrors
		// handleReset's UnInit loop). editSnapshots would restore stale transforms,
		// so drop them too.
		const world = this.state.world;
		if (world) {
			for (const p of this.state.parts) p.UnInit(world);
		}
		this.mouseJoint = null;
		this.waterSystem = null;
		this.editSnapshots = [];
		this.cameraSnapshot = null;
		this.recording = null;
		this.replaySession = null;
		this.cannonballs = [];
		this.challenge = null;
		this.tutorialMachine = null;
		this.tutorialWonFired = false;
		this.undoStack = [];
		this.redoStack = [];
		this.curRobotEditable = true;

		this.state = {
			...this.state,
			world: null,
			sim: { phase: "editing", frame: 0 },
			replay: { recording: false, playing: false, frame: 0, numFrames: null, canSave: true, finished: false },
			water: null,
			tutorial: null,
			challenge: null,
			conditionDraft: null,
			jointGesture: null,
			edit: {
				...this.state.edit,
				selection: [],
				selectedPart: null,
				tool: "select",
				editable: true,
				canUndo: false,
				canRedo: false,
			},
		};
		this.markChanged();
	}

	/**
	 * Adjust camera.scale by `factor` (4/3 zoom-in, 3/4 zoom-out — ControllerGame
	 * .Zoom :6705), clamped to [MIN_ZOOM_VAL, MAX_ZOOM_VAL]. Keeps the view centre
	 * fixed: in the responsive-canvas convention screen = canvas/2 + world*scale -
	 * offset, so the world point at the view centre is offset/scale; holding it
	 * fixed while scaling means offset scales by the same ratio (matching Zoom's
	 * centerX/Y = (drawXOff)/scale round-trip, ControllerGame.ts:6706-6716).
	 */
	private handleZoom(factor: number): void {
		const oldScale = this.state.camera.scale;
		let newScale = oldScale * factor;
		if (newScale > MAX_ZOOM_VAL) newScale = MAX_ZOOM_VAL;
		if (newScale < MIN_ZOOM_VAL) newScale = MIN_ZOOM_VAL;
		if (newScale === oldScale) return;
		const ratio = newScale / oldScale;
		this.state = {
			...this.state,
			camera: {
				scale: newScale,
				offsetX: this.state.camera.offsetX * ratio,
				offsetY: this.state.camera.offsetY * ratio,
			},
		};
		this.markChanged();
	}

	/**
	 * zoomCamera — pinch-zoom ABOUT a focal screen point (GameCanvas two-finger
	 * gesture). Multiply camera.scale by `scaleFactor`, clamp to [MIN_ZOOM_VAL,
	 * MAX_ZOOM_VAL], and adjust camera.offset so the WORLD point under the focal
	 * screen point (focusX,focusY) stays under it after the zoom.
	 *
	 * From the transform `screen = view/2 + world*scale - offset` (so
	 * `world = (screen - view/2 + offset)/scale`, matching sceneRenderer's
	 * screenToWorld):
	 *   worldUnderFocus = (focusX - viewW/2 + offsetX) / oldScale
	 *   offsetX' = viewW/2 + worldUnderFocus*newScale - focusX      (and same for Y)
	 * i.e. solve the transform for offset holding worldUnderFocus + focus fixed.
	 * The CLAMPED newScale is used in the offset math so there's no focal drift at
	 * the zoom limits. Unlike panCamera we do NOT bounds-clamp the offset — the
	 * focal-point invariant must be exact.
	 */
	private handleZoomCamera(scaleFactor: number, focusX: number, focusY: number, viewW: number, viewH: number): void {
		const cam = this.state.camera;
		const oldScale = cam.scale;
		let newScale = oldScale * scaleFactor;
		if (newScale > MAX_ZOOM_VAL) newScale = MAX_ZOOM_VAL;
		if (newScale < MIN_ZOOM_VAL) newScale = MIN_ZOOM_VAL;
		if (newScale === oldScale) return;
		const worldUnderFocusX = (focusX - viewW / 2 + cam.offsetX) / oldScale;
		const worldUnderFocusY = (focusY - viewH / 2 + cam.offsetY) / oldScale;
		const offsetX = viewW / 2 + worldUnderFocusX * newScale - focusX;
		const offsetY = viewH / 2 + worldUnderFocusY * newScale - focusY;
		this.state = {
			...this.state,
			camera: { scale: newScale, offsetX, offsetY },
		};
		this.markChanged();
	}

	/**
	 * centerOnSelection — ControllerGame.CenterOnSelected (:2542-2564). Centre the
	 * camera on the selection's bounding-box centroid. The legacy pins the selection
	 * centre at ZOOM_FOCUS in its own draw-offset units; in the port's camera model
	 * (screen = canvas/2 + world*scale - offset) pinning the centroid to the canvas
	 * centre means offset = centroid*scale — the same convention handleCamera uses
	 * to follow the focus part. No-op when the selection is empty.
	 */
	private handleCenterOnSelection(): void {
		const selection = this.state.edit.selection;
		if (selection.length === 0) return;
		let minX = Number.MAX_VALUE;
		let minY = Number.MAX_VALUE;
		let maxX = -Number.MAX_VALUE;
		let maxY = -Number.MAX_VALUE;
		let found = false;
		for (const id of selection) {
			const p = this.findPart(id);
			if (!p) continue;
			const { x, y } = this.currentXY(p);
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x);
			maxY = Math.max(maxY, y);
			found = true;
		}
		if (!found) return;
		const centerX = (minX + maxX) / 2;
		const centerY = (minY + maxY) / 2;
		const scale = this.state.camera.scale;
		this.state = {
			...this.state,
			camera: { ...this.state.camera, offsetX: centerX * scale, offsetY: centerY * scale },
		};
		this.markChanged();
	}

	/**
	 * Push a freshly-created joint/thruster into the parts graph, select it, revert
	 * to the Select tool, play the SFX + fire the tutorial trigger. Shared tail of
	 * MaybeCreate* (:6755-6775 / :6820-6829 / :6914-6924). Also clears any pending
	 * joint gesture state.
	 */
	private commitJoint(joint: Part): void {
		this.clearJointHighlights();
		this.pendingJoint = null;
		this.pendingPrismatic = null;
		this.syncJointGesture();
		joint.id = ++this.nextId;
		const selection = [joint.id];
		const createdKind = joint.type;
		this.state = {
			...this.state,
			parts: [...this.state.parts, joint],
			// A successful create reverts to Select (ControllerGame :6760/:6770/:6825/:6919).
			edit: { ...this.state.edit, selection, selectedPart: this.snapshotOf(joint), tool: "select" },
		};
		this.markChanged();
		// PlayJointSound at every joint/thruster create site.
		this.emitSound("jointCreated");
		if (this.tutorialMachine) {
			this.notifyTutorial({ type: "partCreated", partKind: createdKind });
			// Joint-creation milestones the machines await beyond a bare partCreated
			// (all cursor-gated, so emitting generously is safe):
			//   Dumpbot (ControllerDumpbot.Update): a RevoluteJoint (the arm joint) ->
			//     26 "armJoint" (:179); each FixedJoint of the bucket -> 29/30
			//     "fixed1"/"fixed2" by count (:220/:224).
			//   HomeMovies (ControllerHomeMovies.Update :392): the support rect's
			//     FixedJoint -> 59 "createdRect".
			//   NewFeatures (ControllerNewFeatures.Update :305): the 4th connecting
			//     FixedJoint -> 85 "partsConnected".
			if (createdKind === "RevoluteJoint") {
				this.notifyTutorial({ type: "progress", key: "armJoint" });
			} else if (createdKind === "FixedJoint") {
				this.notifyTutorial({ type: "progress", key: "createdRect" });
				const fixedCount = this.state.parts.filter((p) => p instanceof FixedJoint).length;
				if (fixedCount === 1) this.notifyTutorial({ type: "progress", key: "fixed1" });
				else if (fixedCount === 2) this.notifyTutorial({ type: "progress", key: "fixed2" });
				if (fixedCount >= 4) this.notifyTutorial({ type: "progress", key: "partsConnected" });
			}
		}
	}

	private finalizeThrusters(part: ShapePart, x: number, y: number): void {
		this.commitJoint(new Thrusters(part, x, y));
	}

	private finalizeFixedOrRevolute(kind: "fixed" | "revolute", p1: ShapePart, p2: ShapePart, x: number, y: number): void {
		const joint =
			kind === "revolute" ? new RevoluteJoint(p1, p2, x, y) : new FixedJoint(p1, p2, x, y);
		this.commitJoint(joint);
	}

	private finalizePrismatic(p1: ShapePart, p2: ShapePart, x1: number, y1: number, x2: number, y2: number): void {
		// PrismaticJoint(p1, p2, axisStart, axisEnd): the ctor derives anchor,
		// normalized slide axis, and initLength = dist(start,end) (:56-80).
		this.commitJoint(new PrismaticJoint(p1, p2, x1, y1, x2, y2));
	}

	/** Clear highlightForJoint on every currently-highlighted candidate. */
	private clearJointHighlights(): void {
		if (this.pendingJoint) for (const c of this.pendingJoint.candidates) c.highlightForJoint = false;
		if (this.pendingPrismatic) this.pendingPrismatic.part1.highlightForJoint = false;
	}

	/**
	 * Enter the >2-overlap disambiguation cycle (ControllerGame FINALIZING_JOINT,
	 * :6776-6785 / :6830-6837 / :6873-6881). Highlights the initial pick (the top
	 * pair for a two-shape joint, the top single otherwise) and stores the
	 * candidate list; the UI cycles via cycleJointCandidate + commits via
	 * finalizeJoint. `x`/`y` is the (already-snapped) joint point.
	 */
	private beginJointDisambiguation(
		kind: "fixed" | "revolute" | "thrusters" | "prismatic1" | "prismatic2",
		candidates: ShapePart[],
		x: number,
		y: number,
	): void {
		const twoShape = kind === "fixed" || kind === "revolute";
		this.pendingJoint = { kind, candidates, i1: 0, i2: 1, x, y };
		candidates[0].highlightForJoint = true;
		if (twoShape) candidates[1].highlightForJoint = true;
		this.syncJointGesture();
		this.markChanged();
	}

	/**
	 * Advance the highlighted candidate pick (ControllerGame FINALIZING_JOINT click
	 * :2435-2473). For a single-shape gesture (thrusters / prismatic step) it steps
	 * i1 through the candidates cyclically (:2441-2448). For a two-shape joint it
	 * walks all ordered index pairs (i1<i2), wrapping back to (0,1) after the last
	 * (:2452-2472). Toggles highlightForJoint accordingly.
	 */
	private cycleJointCandidate(): void {
		const pj = this.pendingJoint;
		if (!pj) return;
		for (const c of pj.candidates) c.highlightForJoint = false;
		const n = pj.candidates.length;
		const twoShape = pj.kind === "fixed" || pj.kind === "revolute";
		if (!twoShape) {
			pj.i1 = (pj.i1 + 1) % n;
			pj.candidates[pj.i1].highlightForJoint = true;
		} else {
			if (pj.i1 === n - 2 && pj.i2 === n - 1) {
				pj.i1 = 0;
				pj.i2 = 1;
			} else {
				pj.i2++;
				if (pj.i2 === n) {
					pj.i1++;
					pj.i2 = pj.i1 + 1;
				}
			}
			pj.candidates[pj.i1].highlightForJoint = true;
			pj.candidates[pj.i2].highlightForJoint = true;
		}
		this.markChanged();
	}

	/**
	 * Commit the currently-highlighted disambiguation pick (ControllerGame
	 * FINALIZING_JOINT drag-to-finalize :1667-1765). `x`/`y` is the finalize point
	 * (for prismatic step 2 it is the axis-END; for prismatic step 1 it seeds the
	 * pending first-click, awaiting the second click).
	 */
	private finalizePendingJoint(x: number, y: number): void {
		const pj = this.pendingJoint;
		if (!pj) return;
		const p1 = pj.candidates[pj.i1];
		switch (pj.kind) {
			case "revolute":
			case "fixed":
				this.finalizeFixedOrRevolute(pj.kind, p1, pj.candidates[pj.i2], pj.x, pj.y);
				return;
			case "thrusters":
				this.finalizeThrusters(p1, pj.x, pj.y);
				return;
			case "prismatic1": {
				// Step-1 disambiguation resolved (:1736-1742): record shape #1 + axis
				// start, then await the second click.
				for (const c of pj.candidates) c.highlightForJoint = false;
				this.pendingJoint = null;
				this.pendingPrismatic = { part1: p1, x1: pj.x, y1: pj.y };
				this.syncJointGesture();
				this.markChanged();
				this.emitSound("jointCreated");
				return;
			}
			case "prismatic2": {
				// Step-2 disambiguation resolved (:1743-1764): bind shape #2 with the
				// pending first click as the axis start and (x,y) as the axis end.
				if (!this.pendingPrismatic) {
					this.pendingJoint = null;
					return;
				}
				this.finalizePrismatic(this.pendingPrismatic.part1, p1, this.pendingPrismatic.x1, this.pendingPrismatic.y1, x, y);
				return;
			}
		}
	}

	/**
	 * Abort the whole joint/thruster gesture (tool change, empty-space click, or an
	 * explicit cancel). Clears highlights + both pending states. Mirrors the legacy
	 * curAction = -1 resets in the MaybeCreate* else branches.
	 */
	private cancelJointGesture(): void {
		if (!this.pendingJoint && !this.pendingPrismatic) return;
		this.clearJointHighlights();
		this.pendingJoint = null;
		this.pendingPrismatic = null;
		this.syncJointGesture();
		this.markChanged();
	}

	/**
	 * Project the private pendingJoint / pendingPrismatic gesture state into the
	 * plain-data state.jointGesture read-model the UI reads. Called after any change
	 * to either field. Does NOT markChanged itself (callers do).
	 */
	private syncJointGesture(): void {
		let jg: GameState["jointGesture"] = null;
		if (this.pendingJoint) jg = { phase: "disambiguate" };
		else if (this.pendingPrismatic)
			jg = { phase: "prismaticAxis", axisStart: { x: this.pendingPrismatic.x1, y: this.pendingPrismatic.y1 } };
		if (jg === null && this.state.jointGesture === null) return;
		this.state = { ...this.state, jointGesture: jg };
	}

	/**
	 * panCamera — drag the editor view over empty world space with the Select tool
	 * (ControllerGame MouseDrag "dragging the world around" :1834-1835 + the
	 * boundary clamp :1846-1863). `dx`/`dy` are screen-pixel mouse deltas.
	 *
	 * Port camera model: screen = viewW/2 + world*scale - offset, so the world
	 * coordinate at a screen pixel `sx` is (sx - viewW/2 + offsetX)/scale. The
	 * legacy subtracts the screen-space mouse delta from the draw offset
	 * (m_drawXOff -= dScreen); here m_drawXOff = offset - viewW/2, so we subtract
	 * the delta from offset directly.
	 *
	 * Then clamp exactly as the legacy: compute the visible world edges and, if an
	 * edge crosses a sandbox bound, push the offset back so the edge sits on the
	 * bound. Faithful to GetMinX/MaxX/MinY/MaxY — the legacy's getters return
	 * ±MAX_VALUE (an effective no-op), but the port has real sandbox bounds
	 * (computeBounds ← ControllerSandbox.GetMinX/MaxX :680-714), so this clamp
	 * actually confines the view to the sandbox.
	 */
	private handlePanCamera(dx: number, dy: number, viewW: number, viewH: number): void {
		const { scale } = this.state.camera;
		let offsetX = this.state.camera.offsetX - dx;
		let offsetY = this.state.camera.offsetY - dy;
		const { minX, maxX, minY, maxY } = this.state.sandbox.bounds;
		const worldAt = (screen: number, view: number, off: number): number => (screen - view / 2 + off) / scale;

		// X clamp (:1855-1862): if the left edge is past minX, push right; else if
		// the right edge is past maxX, push left.
		const minWorldX = worldAt(0, viewW, offsetX);
		const maxWorldX = worldAt(viewW, viewW, offsetX);
		if (minWorldX < minX) {
			offsetX += (minX - minWorldX) * scale;
		} else if (maxWorldX > maxX) {
			offsetX -= (maxWorldX - maxX) * scale;
		}

		// Y clamp (:1847-1853): if the top edge is past minY, push down; else if the
		// bottom edge is past maxY, push up.
		const minWorldY = worldAt(0, viewH, offsetY);
		const maxWorldY = worldAt(viewH, viewH, offsetY);
		if (minWorldY < minY) {
			offsetY += (minY - minWorldY) * scale;
		} else if (maxWorldY > maxY) {
			offsetY -= (maxWorldY - maxY) * scale;
		}

		if (offsetX === this.state.camera.offsetX && offsetY === this.state.camera.offsetY) return;
		this.state = { ...this.state, camera: { ...this.state.camera, offsetX, offsetY } };
		this.markChanged();
	}

	/**
	 * Whether a command mutates the parts graph and should therefore push an
	 * undo snapshot before it applies. Excludes selection (select/clearSelection),
	 * tool changes (setTool), sim controls (play/pause/reset/step), undo/redo
	 * itself, and persistence (handled separately). Covers the create /
	 * delete / move / rotate / resize / setColour / setXxx family.
	 */
	private isMutating(command: Command): boolean {
		switch (command.type) {
			case "createShape":
			case "createPolygon":
			case "createText":
			case "createThrusters":
			case "createCannon":
			case "createJoint":
			// finishPrismaticJoint / finalizeJoint create the actual joint part (the
			// two-click + disambiguation commit sites). startPrismaticJoint,
			// cycleJointCandidate and cancelJointGesture only touch transient gesture
			// state / highlightForJoint, so they are NOT mutating.
			case "finishPrismaticJoint":
			case "finalizeJoint":
			case "deleteParts":
			case "moveParts":
			case "rotateParts":
			// resizeStart snapshots history for the whole resize gesture; the
			// per-move resizeParts + resizeEnd deliberately do NOT (they'd stack a
			// history entry per pointer-move). mirrorParts is a one-shot mutation.
			case "resizeStart":
			case "mirrorParts":
			// cutParts + pasteParts edit the parts graph (undoable). copyParts only
			// snapshots the clipboard — no state change, so it is NOT mutating.
			case "cutParts":
			case "pasteParts":
			case "movePartsToFront":
			case "movePartsToBack":
			case "setColour":
			case "setDensity":
			case "setFriction":
			case "setRestitution":
			case "setCollide":
			case "setCollisionGroups":
			case "setShapeTrigger":
			case "setTriggerList":
			case "setCameraFocus":
			case "setFixate":
			case "setFixedRotation":
			case "setOutline":
			case "setOutlineBehind":
			case "setUndragable":
			case "setJointMotor":
			case "setJointStrength":
			case "setJointSpeed":
			case "setJointLimits":
			case "setJointControlKey":
			case "setJointAutoOn":
			case "setJointEnableKey":
			case "setJointBeginExpanded":
			case "setJointStiff":
			case "setJointInitialLength":
			case "setThrusterStrength":
			case "setThrusterKey":
			case "setThrusterAutoOn":
			case "setThrusterEnableKey":
			case "setCannonStrength":
			case "setCannonFireKey":
			case "setBombProps":
			case "setTextContent":
			case "setTextSize":
			case "setTextDisplayKey":
			case "setTextAlwaysVisible":
			case "setTextScaleWithZoom":
			case "setTextAngle":
			case "setTextVisibleOnStart":
				return true;
			// A batch is mutating iff it wraps at least one mutating sub-command, so a
			// group edit pushes exactly one history snapshot (MultiActionsAction).
			case "batch":
				return command.commands.some((c) => this.isMutating(c));
			default:
				return false;
		}
	}

	/** Current canUndo/canRedo derived from stack depth. */
	private undoRedoFlags(): { canUndo: boolean; canRedo: boolean } {
		return { canUndo: this.undoStack.length > 0, canRedo: this.redoStack.length > 0 };
	}

	private apply(command: Command): void {
		// Uneditable-robot enforcement (Wave 3a): a robot loaded with an
		// uneditable exposure blocks every editing mutation at the funnel
		// (mirrors Jaybit's !curRobotEditable guards). Non-mutating commands
		// (sim controls, selection, camera) and robot-replacing entry points
		// (newRobot/clearAll/import*) still pass.
		if (!this.curRobotEditable && this.isMutating(command)) return;
		// Snapshot the pre-mutation editable state for undo before any mutating
		// command runs (editing phase only). The handler that follows rebuilds
		// `edit`, so we fold the refreshed canUndo/canRedo flags in afterwards.
		const mutating = this.state.sim.phase === "editing" && this.isMutating(command);
		if (mutating) this.pushHistory();

		this.applyCommand(command);

		// A mutating command's handler rebuilds `edit` without the undo/redo
		// flags; reflect the new stack depths so the UI can enable the buttons.
		// (undo/redo set their own flags via restoreSnapshot.)
		if (mutating) {
			this.state = { ...this.state, edit: { ...this.state.edit, ...this.undoRedoFlags() } };
			// A parts-graph mutation can change whether the robot fits the build
			// area, so recompute CheckIfPartsFit + re-project the challenge read-model
			// (ControllerGame recomputes partsFit on every edit-frame :592-621).
			if (this.challenge) this.syncChallenge();
		}
	}

	private applyCommand(command: Command): void {
		// ControllerGame disallows editing during simulation (the side panel is
		// hidden and curAction cleared on play, :2728-2730). Ignore editing
		// mutations while running/paused; sim controls (play/pause/reset/step) and
		// selection changes still pass through.
		if (this.state.sim.phase !== "editing") {
			switch (command.type) {
				case "createShape":
				case "createPolygon":
				case "createText":
				case "createThrusters":
				case "createCannon":
				case "createJoint":
				case "startPrismaticJoint":
				case "finishPrismaticJoint":
				case "cycleJointCandidate":
				case "finalizeJoint":
				case "cancelJointGesture":
				case "deleteParts":
				case "moveParts":
				case "rotateParts":
				case "resizeStart":
				case "resizeParts":
				case "resizeEnd":
				case "mirrorParts":
				case "copyParts":
				case "cutParts":
				case "pasteParts":
				case "movePartsToFront":
				case "movePartsToBack":
				case "setColour":
				case "setTool":
				case "setDensity":
				case "setFriction":
				case "setRestitution":
				case "setCollide":
				case "setCollisionGroups":
				case "setShapeTrigger":
				case "setTriggerList":
				case "setCameraFocus":
				case "setFixate":
				case "setFixedRotation":
				case "setOutline":
				case "setOutlineBehind":
				case "setUndragable":
				case "setJointMotor":
				case "setJointStrength":
				case "setJointSpeed":
				case "setJointLimits":
				case "setJointControlKey":
				case "setJointAutoOn":
				case "setJointEnableKey":
				case "setJointBeginExpanded":
				case "setJointStiff":
				case "setJointInitialLength":
				case "setThrusterStrength":
				case "setThrusterKey":
				case "setThrusterAutoOn":
				case "setThrusterEnableKey":
				case "setCannonStrength":
				case "setCannonFireKey":
				case "setBombProps":
				case "setTextContent":
				case "setTextSize":
				case "setTextDisplayKey":
				case "setTextAlwaysVisible":
				case "setTextScaleWithZoom":
				case "setTextAngle":
				case "setTextVisibleOnStart":
				case "batch":
				case "undo":
				case "redo":
				case "loadRobot":
				case "newRobot":
				case "clearAll":
				case "setSandboxSettings":
				case "newChallenge":
				case "exitChallenge":
				case "addWinCondition":
				case "addLossCondition":
				case "removeWinCondition":
				case "removeLossCondition":
				case "setWinConditionsAnded":
				case "startConditionPick":
				case "conditionPickBox":
				case "conditionPickShape":
				case "cancelConditionPick":
				case "setAllowedParts":
				case "setBuildPermissions":
				case "setPartLimits":
				case "addBuildArea":
				case "removeBuildArea":
				case "enterChallengePlay":
				case "editChallenge":
					return; // no-op during simulation
			}
		}

		switch (command.type) {
			// Handlers are migrated from ControllerGame one command at a time.
			// Each should mutate this.state and call this.markChanged().
			case "setTool":
				this.state = { ...this.state, edit: { ...this.state.edit, tool: command.tool } };
				this.markChanged();
				// Dumpbot milestone (ControllerDumpbot.Update :163): the Rotating Joint tool
				// selected (curAction == NEW_REVOLUTE_JOINT) -> dialog 58 "clickedJoint".
				if (command.tool === "newRevoluteJoint" && this.tutorialMachine) {
					this.notifyTutorial({ type: "progress", key: "clickedJoint" });
				}
				return;
			case "clearSelection":
				this.state = {
					...this.state,
					edit: { ...this.state.edit, selection: [], selectedPart: null },
				};
				this.markChanged();
				return;
			case "select": {
				let selection: number[];
				if (command.additive) {
					// Additive select TOGGLES membership, faithful to the legacy shift-click:
					// an already-selected part is REMOVED (Util.RemoveFromArray branch,
					// ControllerGame :1292-1293), an unselected one is added (:1291). A
					// marquee add (multiple ids) still unions — a shift-marquee never
					// removes in the legacy (BOX_SELECTING pushes, :2407).
					const merged = new Set(this.state.edit.selection);
					if (command.partIds.length === 1) {
						const id = command.partIds[0];
						if (merged.has(id)) merged.delete(id);
						else merged.add(id);
					} else {
						for (const id of command.partIds) merged.add(id);
					}
					selection = [...merged];
				} else {
					selection = [...command.partIds];
				}
				this.state = {
					...this.state,
					edit: { ...this.state.edit, selection, selectedPart: this.deriveSelectedPart(selection) },
				};
				this.markChanged();
				// RubeGoldberg selection milestones (ControllerRubeGoldberg.Update
				// :685/:697): a single part selected -> 73 "rectSelected"; two parts
				// selected -> 76 "selectedRects". Cursor-gated, so emit both generously.
				if (this.tutorialMachine) {
					if (selection.length === 1) this.notifyTutorial({ type: "progress", key: "rectSelected" });
					else if (selection.length === 2) this.notifyTutorial({ type: "progress", key: "selectedRects" });
				}
				return;
			}
			case "createShape": {
				// Restriction gate (ControllerChallenge.circle/rect/triangleButton
				// :92-123): reject a disallowed part type in challenge play mode.
				const kindMap: Record<ShapeKind, CreatePartKind> = {
					circle: "circle",
					rect: "rect",
					triangle: "triangle",
					// Polygon isn't a distinct challenge restriction; gate it with the
					// triangle restriction (its N-vertex generalization), the way bomb
					// borrows the circle restriction below. (createShape never receives
					// "polygon" — createPolygon does — but the map must be exhaustive.)
					polygon: "triangle",
					cannon: "cannon",
					// Legacy challenges predate bombs (no bombsAllowed restriction
					// exists); gate them with the circle restriction, the family the
					// Bomb part extends.
					bomb: "circle",
				};
				if (this.challenge && !partTypeAllowed(this.challenge, kindMap[command.kind])) return;
				const part = this.buildDraggedShape(
					command.kind,
					command.x1,
					command.y1,
					command.x2,
					command.y2,
					command.x3,
					command.y3,
				);
				// Ignore a zero-length (tiny-click) drag — the original required the
				// release point to differ from the press point before creating the
				// shape (circle: radius > 0 :2202; rect: end != start :2223; triangle:
				// end != start :2288). pushHistory already ran, but with no state
				// change undo just restores the identical graph, which is harmless.
				if (!part) return;
				// Challenge material limits clamp the new shape's friction/restitution
				// defaults (Jaybit ShapePart ctor vs ControllerGame.min/maxFriction).
				this.clampPartToChallengeLimits(part);
				// New shapes adopt the current default colour (ControllerGameGlobals.
				// defaultR/G/B/O, settable via colourButton makeDefault). The ShapePart
				// ctor seeds partDefaults; override with the live default here.
				if (part instanceof ShapePart) {
					part.red = this.defaultRed;
					part.green = this.defaultGreen;
					part.blue = this.defaultBlue;
					part.opacity = this.defaultOpacity;
				}
				// Tutorial part-created trigger (ControllerShapes.Update :28-40): the
				// new editable part type is Rectangle/Triangle/Circle.
				const createdKind = part.type;
				part.id = ++this.nextId;
				const selection = [part.id];
				this.state = {
					...this.state,
					parts: [...this.state.parts, part],
					// A SUCCESSFUL create reverts to the Select tool (curAction = -1 inline,
					// ControllerGame Circle :2203 / Rectangle :2227 / Triangle apex :2361).
					edit: { ...this.state.edit, selection, selectedPart: this.snapshotOf(part), tool: "select" },
				};
				this.markChanged();
				// Play the shape-create SFX (ControllerGame.PlayShapeSound call sites).
				this.emitSound("shapeCreated");
				if (this.tutorialMachine) {
					this.notifyTutorial({ type: "partCreated", partKind: createdKind });
					// Dumpbot shape-count milestones (ControllerDumpbot.Update :136/:157/
					// :214) — the whole bot is player-built. Emitting these generously is
					// safe: the machine's chain only advances on the key it expects next.
					//   two editable Circles -> 23 "wheels"           (:136)
					//   a Rectangle (the arm) -> 25 "arm"             (:157)
					//   two editable Rectangles (the bucket) -> 28 "bucket" (:214)
					const editableShapes = this.state.parts.filter((p) => p instanceof ShapePart && p.isEditable && p.isEnabled);
					const n = editableShapes.length;
					const last = editableShapes[n - 1];
					const prev = editableShapes[n - 2];
					if (last instanceof Circle && prev instanceof Circle) {
						this.notifyTutorial({ type: "progress", key: "wheels" });
					}
					if (last instanceof Rectangle) {
						this.notifyTutorial({ type: "progress", key: "arm" });
						if (prev instanceof Rectangle) this.notifyTutorial({ type: "progress", key: "bucket" });
					}
				}
				return;
			}
			case "createPolygon": {
				// Convex Polygon create from the multi-click gesture's ordered vertex
				// ring. Mirrors the createShape finalize path (challenge gate → build →
				// default colour/material → add → select → revert to Select tool) but
				// takes an N-vertex list. Restriction-gated with the triangle family
				// (its N-vertex generalization; there is no separate polygon restriction).
				if (this.challenge && !partTypeAllowed(this.challenge, "triangle")) return;
				const verts = command.verts;
				// Guard the degenerate inputs the gesture is supposed to prevent, so a
				// stray/programmatic dispatch can't build an invalid b2PolygonShape
				// (b2PolygonShape does NOT validate convexity — its asserts are compiled
				// out — so a non-convex ring would simulate wrongly): need 3..MAX_VERTICES
				// vertices and a convex ring. Undo of a no-op create is harmless.
				if (!verts || verts.length < 3 || verts.length > Polygon.MAX_VERTICES) return;
				if (!Polygon.isConvex(verts)) return;
				const part = new Polygon(verts.map((v) => new b2Vec2(v.x, v.y)));
				// Challenge material limits clamp friction/restitution defaults, exactly
				// like createShape (Jaybit ShapePart ctor vs ControllerGame.min/maxFriction).
				this.clampPartToChallengeLimits(part);
				// Adopt the current default colour (ControllerGameGlobals.defaultR/G/B/O),
				// as every new shape does.
				part.red = this.defaultRed;
				part.green = this.defaultGreen;
				part.blue = this.defaultBlue;
				part.opacity = this.defaultOpacity;
				const createdKind = part.type;
				part.id = ++this.nextId;
				const selection = [part.id];
				this.state = {
					...this.state,
					parts: [...this.state.parts, part],
					// A successful create reverts to the Select tool, like createShape.
					edit: { ...this.state.edit, selection, selectedPart: this.snapshotOf(part), tool: "select" },
				};
				this.markChanged();
				this.emitSound("shapeCreated");
				if (this.tutorialMachine) this.notifyTutorial({ type: "partCreated", partKind: createdKind });
				return;
			}
			case "createText": {
				// TextPart(cont, x, y, w, h, text). `cont` (the old Pixi container) is
				// unused in the headless core — pass null.
				const part = new TextPart(null, command.x, command.y, DEFAULT_TEXT_W, DEFAULT_TEXT_H, command.text);
				part.id = ++this.nextId;
				const selection = [part.id];
				this.state = {
					...this.state,
					parts: [...this.state.parts, part],
					// Successful create reverts to Select (ControllerGame Text :2500).
					edit: { ...this.state.edit, selection, selectedPart: this.snapshotOf(part), tool: "select" },
				};
				this.markChanged();
				// Tutorial milestone (ControllerHomeMovies.Update :414-417): a TextPart
				// was created -> dialog 47 (audit L3). TextPart.type is "text"; the
				// HomeMovies machine's chain step matches part "TextPart", so pass that.
				if (this.tutorialMachine) this.notifyTutorial({ type: "partCreated", partKind: "TextPart" });
				return;
			}
			case "deleteParts": {
				const remove = new Set(command.partIds);
				const parts = this.state.parts.filter((p) => !remove.has(p.id));
				const selection = this.state.edit.selection.filter((id) => !remove.has(id));
				this.state = {
					...this.state,
					parts,
					edit: { ...this.state.edit, selection, selectedPart: this.deriveSelectedPart(selection) },
				};
				this.markChanged();
				return;
			}
			case "moveParts": {
				// Drag moves the CONNECTED CLUSTER, not just the selection: legacy
				// MouseDrag seeds draggingParts with the union of every selected part's
				// GetAttachedParts() — RemoveDuplicates over the concatenation
				// (ControllerGame.ts:1443-1449 / CE ControllerGame.as:6121-6127) — so a
				// shape drags its joints and everything jointed through them (a joint
				// drags both its shapes' clusters; a TextPart drags only itself). The
				// legacy computed the set at drag START; the parts graph cannot change
				// mid-drag, so expanding on each relative moveParts is equivalent.
				const selected = command.partIds
					.map((id) => this.findPart(id))
					.filter((p): p is Part => p !== undefined);
				const cluster = new Set<Part>();
				for (const sel of selected) {
					for (const p of sel.GetAttachedParts() as Part[]) cluster.add(p);
				}
				for (const p of this.state.parts) {
					if (!cluster.has(p)) continue;
					// ShapePart stores centerX/centerY; JointPart anchorX/anchorY;
					// TextPart x/y. currentXY reads back what each type's Move() sets.
					const cur = this.currentXY(p);
					p.Move(cur.x + command.dx, cur.y + command.dy);
				}
				this.state = {
					...this.state,
					parts: [...this.state.parts],
					edit: { ...this.state.edit, selectedPart: this.deriveSelectedPart(this.state.edit.selection) },
				};
				this.markChanged();
				// RubeGoldberg drag milestones (ControllerRubeGoldberg.Update :693/:701):
				// dragging a single rect -> 75 "draggedRect"; dragging the two
				// multi-selected rects together -> 77 "draggedRects". Cursor-gated.
				if (this.tutorialMachine) {
					if (command.partIds.length === 1) this.notifyTutorial({ type: "progress", key: "draggedRect" });
					else if (command.partIds.length >= 2) this.notifyTutorial({ type: "progress", key: "draggedRects" });
				}
				return;
			}
			case "setColour": {
				// makeDefault: also set the default colour used by new parts
				// (ControllerGame.colourButton defaultColour → defaultR/G/B/O :4454-4461).
				// Stored in ShapePart units: r/g/b are 0-255, opacity 0-255.
				if (command.makeDefault) {
					this.defaultRed = command.r;
					this.defaultGreen = command.g;
					this.defaultBlue = command.b;
					this.defaultOpacity = command.opacity * 255;
				}
				const target = new Set(command.partIds);
				for (const p of this.state.parts) {
					if (!target.has(p.id)) continue;
					// Part colour channels are 0-255 (matches the renderer, which does
					// red/255 etc. — see Draw.ts). The command's r/g/b are already 0-255
					// (parsed from a hex swatch); opacity arrives 0-1, stored as 0-255.
					if (p instanceof ShapePart) {
						p.red = command.r;
						p.green = command.g;
						p.blue = command.b;
						p.opacity = command.opacity * 255;
					} else if (p instanceof TextPart) {
						p.red = command.r;
						p.green = command.g;
						p.blue = command.b;
					}
				}
				this.state = {
					...this.state,
					parts: [...this.state.parts],
					edit: { ...this.state.edit, selectedPart: this.deriveSelectedPart(this.state.edit.selection) },
				};
				this.markChanged();
				// HomeMovies colour milestones (ControllerHomeMovies.Update :360/:402):
				// the face coloured beige (255,216,136) -> 41 "colouredFace"; the support
				// rect made invisible (opacity 0) -> 43 "invisiblised". Cursor-gated.
				if (this.tutorialMachine) {
					if (command.r === 255 && command.g === 216 && command.b === 136) {
						this.notifyTutorial({ type: "progress", key: "colouredFace" });
					}
					if (command.opacity === 0) this.notifyTutorial({ type: "progress", key: "invisiblised" });
				}
				return;
			}
			// --- Shape properties (ShapePart family) ---
			// Density: absolute value clamped to [MIN_DENSITY, MAX_DENSITY]
			// (ControllerGame.densitySlider :4078; clamp :4095-4096).
			case "setDensity": {
				let v = Math.max(MIN_DENSITY, Math.min(MAX_DENSITY, command.value));
				// Challenge density limits (ControllerGame.densityText :4090-4091).
				if (this.challenge) v = clampDensity(this.challenge, v);
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.density = v;
				});
				// Jumpbot milestone (ControllerJumpbot.Update :110): the car body's
				// density decreased below 15 -> dialog 20 "densityDecreased". The legacy
				// checks carBody.density < 15; cursor-gated so any shape's density
				// crossing below 15 emits it faithfully.
				if (this.tutorialMachine && v < 15) this.notifyTutorial({ type: "progress", key: "densityDecreased" });
				return;
			}
			// Friction / restitution: 1..30 UI scale like density (Jaybit
			// frictionSlider/restitutionSlider; text entry clamped like
			// CheckFriction/CheckRestitution against the challenge min/max).
			case "setFriction": {
				let v = Math.max(MIN_FRICTION, Math.min(MAX_FRICTION, command.value));
				if (this.challenge) v = clampFriction(this.challenge, v);
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.friction = v;
				});
				return;
			}
			case "setRestitution": {
				let v = Math.max(MIN_RESTITUTION, Math.min(MAX_RESTITUTION, command.value));
				if (this.challenge) v = clampRestitution(this.challenge, v);
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.restitution = v;
				});
				return;
			}
			// Collision layers A-D + subColl + collide, applied together as the
			// Jaybit Advanced-properties submit does (ControllerGame triggerText
			// handler :6985-7041). Lives on ShapePart AND PrismaticJoint.
			// Challenge restriction gate (only in PLAY mode, like triggersBlocked):
			// !collisionGroupsAllowed refuses the A-D changes and
			// !subCollisionsAllowed refuses the subColl change, INDEPENDENTLY —
			// the permitted half still goes through, mirroring the legacy UI which
			// disables the two groups of checkboxes separately
			// (AdvancedPropertiesWindow.as:960-975).
			case "setCollisionGroups": {
				const inPlay = this.challenge !== null && this.challenge.playMode;
				const groupsBlocked = inPlay && !this.challenge!.challenge.collisionGroupsAllowed;
				const subCollBlocked = inPlay && !this.challenge!.challenge.subCollisionsAllowed;
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart || p instanceof PrismaticJoint) {
						if (!groupsBlocked) {
							p.collA = command.collA;
							p.collB = command.collB;
							p.collC = command.collC;
							p.collD = command.collD;
						}
						if (!subCollBlocked) p.subColl = command.subColl;
						p.collide = command.collide;
					}
				});
				return;
			}
			// --- Triggers (Jaybit AdvancedPropertiesWindow OK -> triggerText :6920-7160) ---
			// Edit one trigger slot of the selected SOURCE shapes. Omitted fields are
			// left unchanged (multi-edit "[varies]"/unresolved). Cannons are excluded
			// as sources (they only carry a triggerList). Undo comes from the
			// command journal (isMutating).
			case "setShapeTrigger": {
				if (this.triggersBlocked()) return;
				const name = command.name === undefined ? undefined : this.sanitizeTriggerText(command.name);
				// Action must be a TRIGGER_* constant (0..6); anything else is
				// ignored (leave unchanged), mirroring the combo's fixed item list.
				const action =
					command.action !== undefined && Number.isInteger(command.action) && command.action >= 0 && command.action <= 6
						? command.action
						: undefined;
				this.editParts(command.partIds, (p) => {
					if (!(p instanceof ShapePart) || p instanceof Cannon) return;
					if (command.slot === 1) {
						if (name !== undefined) p.triggerName = name;
						if (action !== undefined) p.triggerAction = action;
						if (command.onSameName !== undefined) p.onSameName = command.onSameName;
						if (command.onGroundHit !== undefined) p.onGroundHit = command.onGroundHit;
					} else {
						if (name !== undefined) p.triggerName_2 = name;
						if (action !== undefined) p.triggerAction_2 = action;
						if (command.onSameName !== undefined) p.onSameName_2 = command.onSameName;
						if (command.onGroundHit !== undefined) p.onGroundHit_2 = command.onGroundHit;
					}
				});
				return;
			}
			// Set the comma-separated listen list on trigger TARGETS (joints /
			// thrusters / cannons / text parts).
			case "setTriggerList": {
				if (this.triggersBlocked()) return;
				const value = this.sanitizeTriggerText(command.value);
				this.editParts(command.partIds, (p) => {
					if (p instanceof Cannon) p.triggerList = value;
					else if (p instanceof Bomb) p.triggerList = value;
					else if (p instanceof JointPart) p.triggerList = value;
					else if (p instanceof Thrusters) p.triggerList = value;
					else if (p instanceof TextPart) p.triggerList = value;
				});
				return;
			}
			// Collide lives on ShapePart AND PrismaticJoint (ShapeCheckboxAction COLLIDE_TYPE).
			case "setCollide":
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.collide = command.value;
					else if (p instanceof PrismaticJoint) p.collide = command.value;
				});
				// RubeGoldberg milestone (ControllerRubeGoldberg.Update :713): the "END"
				// letter chunk made non-colliding -> dialog 80 "endUncollided". Cursor-gated.
				if (command.value === false && this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "endUncollided" });
				return;
			// Camera focus (CameraAction). Setting one part's focus clears any other
			// part currently focused, matching CameraAction's oldCameraPart handling.
			case "setCameraFocus":
				this.editParts(command.partIds, (p) => {
					if (!(p instanceof ShapePart)) return;
					if (command.value) {
						for (const other of this.state.parts) {
							if (other instanceof ShapePart && other !== p) other.isCameraFocus = false;
						}
					}
					p.isCameraFocus = command.value;
				});
				return;
			// Fixate == Part.isStatic (ShapeCheckboxAction FIXATE_TYPE).
			case "setFixate":
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.isStatic = command.value;
				});
				// Tutorial milestone: fixating a shape (ControllerHomeMovies -> 60,
				// ControllerRubeGoldberg -> 78, both key "fixated").
				if (command.value && this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "fixated" });
				return;
			// IB3 fixed rotation == ShapePart.fixedRotation (locks the body angle).
			case "setFixedRotation":
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.fixedRotation = command.value;
				});
				return;
			// Outline lives on ShapePart AND PrismaticJoint (ShapeCheckboxAction OUTLINE_TYPE).
			case "setOutline":
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.outline = command.value;
					else if (p instanceof PrismaticJoint) p.outline = command.value;
				});
				// HomeMovies milestone (ControllerHomeMovies.Update :364): the hair pieces
				// had "Show Outlines" turned OFF -> dialog 42 "unoutlined" (audit L4). This
				// is distinct from "outlinesBehind" (the terrain flag, NewFeatures 86).
				if (command.value === false && this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "unoutlined" });
				return;
			// "Outlines Behind" == ShapePart.terrain (ShapeCheckboxAction TERRAIN_TYPE).
			case "setOutlineBehind":
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.terrain = command.value;
				});
				// Tutorial milestone (ControllerNewFeatures -> 86 "outlinesBehind").
				if (command.value && this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "outlinesBehind" });
				return;
			case "setUndragable":
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.undragable = command.value;
				});
				// Tutorial milestone (ControllerNewFeatures -> 88 "undraggable").
				if (command.value && this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "undraggable" });
				return;

			// --- Joint properties (RevoluteJoint / PrismaticJoint) ---
			// Motor enable: enableMotor (revolute) / enablePiston (prismatic)
			// (JointCheckboxAction ENABLE_TYPE).
			case "setJointMotor":
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint) p.enableMotor = command.value;
					else if (p instanceof PrismaticJoint) p.enablePiston = command.value;
				});
				// Tutorial milestones: a revolute motor enabled (ControllerCar -> 13
				// "motorsEnabled"; ControllerHomeMovies shoulder -> 44 "shoulderEnabled"),
				// a piston enabled (ControllerJumpbot -> 17 "pistonEnabled"). The
				// cursor-based machines only advance on the key they expect next.
				if (command.value && this.tutorialMachine) {
					const ids = new Set(command.partIds);
					const enabledRevolute = this.state.parts.some((p) => p instanceof RevoluteJoint && ids.has(p.id));
					const enabledPrismatic = this.state.parts.some((p) => p instanceof PrismaticJoint && ids.has(p.id));
					if (enabledRevolute) {
						// A single revolute motor enabled advances ControllerHomeMovies (one
						// shoulder joint -> 44 "shoulderEnabled", :406). Car (-> 13, :113) and
						// Dumpbot (-> 24, :140) require BOTH wheel joints motored; emit those
						// keys only once two motored RevoluteJoints exist (the last two parts
						// legacy check). Cursor gating keeps the extra emits harmless.
						this.notifyTutorial({ type: "progress", key: "shoulderEnabled" });
						const motoredRevolutes = this.state.parts.filter((p) => p instanceof RevoluteJoint && p.enableMotor).length;
						if (motoredRevolutes >= 2) {
							this.notifyTutorial({ type: "progress", key: "motorsEnabled" });
							this.notifyTutorial({ type: "progress", key: "wheelJoints" });
						}
					}
					if (enabledPrismatic) this.notifyTutorial({ type: "progress", key: "pistonEnabled" });
				}
				return;
			// Strength: motorStrength / pistonStrength (ChangeSliderAction STRENGTH_TYPE;
			// slider range 1..30 — MAX_RJ_STRENGTH / MAX_SJ_STRENGTH).
			case "setJointStrength": {
				const v = Math.max(1, Math.min(MAX_JOINT_VALUE, command.value));
				// Challenge joint-strength caps differ by joint type
				// (ControllerGame.strengthText :4122 RJ / :4127 SJ).
				const ch = this.challenge;
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint) p.motorStrength = ch ? clampRJ(ch, v, "strength") : v;
					else if (p instanceof PrismaticJoint) p.pistonStrength = ch ? clampSJ(ch, v, "strength") : v;
				});
				if (this.tutorialMachine) this.emitJointPowerMilestones(command.partIds);
				return;
			}
			// Speed: motorSpeed / pistonSpeed (ChangeSliderAction SPEED_TYPE).
			case "setJointSpeed": {
				const v = Math.max(1, Math.min(MAX_JOINT_VALUE, command.value));
				// Challenge joint-speed caps differ by joint type
				// (ControllerGame.speedText :4154 RJ / :4159 SJ).
				const ch = this.challenge;
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint) p.motorSpeed = ch ? clampRJ(ch, v, "speed") : v;
					else if (p instanceof PrismaticJoint) p.pistonSpeed = ch ? clampSJ(ch, v, "speed") : v;
				});
				if (this.tutorialMachine) this.emitJointPowerMilestones(command.partIds);
				return;
			}
			// Revolute limits, in degrees (LimitChangeAction; clamp rules from
			// ControllerGame.minLimitText :4589 / maxLimitText :4610): null == "None"
			// (∓MAX_VALUE); a lower limit must be ≤0, an upper limit must be ≥0.
			case "setJointLimits": {
				const lower = command.lower === null ? -Number.MAX_VALUE : Math.min(0, command.lower);
				const upper = command.upper === null ? Number.MAX_VALUE : Math.max(0, command.upper);
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint) {
						p.motorLowerLimit = lower;
						p.motorUpperLimit = upper;
					}
				});
				// Tutorial milestones (ControllerCatapult.Update): lower == -10 -> 35
				// "limitLower"; upper == 50 -> 36 "limitUpper" (the command carries the
				// UI's degree values).
				if (this.tutorialMachine) {
					if (command.lower === -10) this.notifyTutorial({ type: "progress", key: "limitLower" });
					if (command.upper === 50) this.notifyTutorial({ type: "progress", key: "limitUpper" });
				}
				return;
			}
			// Control keys (ControlKeyAction): cw/ccw -> revolute motorCW/CCWKey;
			// up/down -> prismatic pistonUp/DownKey.
			case "setJointControlKey":
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint) {
						if (command.which === "cw") p.motorCWKey = command.key;
						else if (command.which === "ccw") p.motorCCWKey = command.key;
					} else if (p instanceof PrismaticJoint) {
						if (command.which === "up") p.pistonUpKey = command.key;
						else if (command.which === "down") p.pistonDownKey = command.key;
					}
				});
				// Dumpbot milestone (ControllerDumpbot.Update :189): the loading-arm joint's
				// control keys set to up(38)/down(40) -> dialog 27 "controlKeys". The legacy
				// checks motorCWKey == 38 && motorCCWKey == 40 on the last RevoluteJoint.
				if (this.tutorialMachine) {
					const ids = new Set(command.partIds);
					const ok = this.state.parts.some(
						(p) => p instanceof RevoluteJoint && ids.has(p.id) && p.motorCWKey === 38 && p.motorCCWKey === 40,
					);
					if (ok) this.notifyTutorial({ type: "progress", key: "controlKeys" });
				}
				return;
			// Auto-on flags (JointCheckboxAction AUTO_*): cw/ccw are mutually
			// exclusive on a revolute (setting one on clears the other, matching the
			// sideEffect path); oscillate is the prismatic flag.
			case "setJointAutoOn":
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint) {
						if (command.which === "cw") {
							p.autoCW = command.value;
							if (command.value) p.autoCCW = false;
						} else if (command.which === "ccw") {
							p.autoCCW = command.value;
							if (command.value) p.autoCW = false;
						}
					} else if (p instanceof PrismaticJoint) {
						// oscillate == both directions; expand/retract are the IB3
						// independent auto flags. Keep autoOscillate == (expand && retract)
						// so the legacy flag stays coherent for readers/UI.
						if (command.which === "oscillate") {
							p.autoOscillate = command.value;
							p.autoExpand = command.value;
							p.autoRetract = command.value;
						} else if (command.which === "expand") {
							p.autoExpand = command.value;
							p.autoOscillate = p.autoExpand && p.autoRetract;
						} else if (command.which === "retract") {
							p.autoRetract = command.value;
							p.autoOscillate = p.autoExpand && p.autoRetract;
						}
					}
				});
				// RubeGoldberg milestone (ControllerRubeGoldberg.Update :709): the cart's
				// back-wheel motor set to Auto-On CCW -> dialog 79 "autoWheel".
				if (command.which === "ccw" && command.value && this.tutorialMachine) {
					this.notifyTutorial({ type: "progress", key: "autoWheel" });
				}
				return;
			// IB3 per-direction key enable (RotatingJoint enableKeyCW/CCW,
			// SlidingJoint enableKeyExpand/Retract).
			case "setJointEnableKey":
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint) {
						if (command.which === "cw") p.enableKeyCW = command.value;
						else if (command.which === "ccw") p.enableKeyCCW = command.value;
					} else if (p instanceof PrismaticJoint) {
						if (command.which === "expand") p.enableKeyExpand = command.value;
						else if (command.which === "retract") p.enableKeyRetract = command.value;
					}
				});
				return;
			// IB3 SlidingJoint.beginExpanded (piston starts fully expanded).
			case "setJointBeginExpanded":
				this.editParts(command.partIds, (p) => {
					if (p instanceof PrismaticJoint) p.beginExpanded = command.value;
				});
				return;
			// isStiff (JointCheckboxAction RIGID_TYPE) — the UI shows "Floppy Joint"
			// (= !isStiff); the command already carries the resolved isStiff value.
			case "setJointStiff":
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint || p instanceof PrismaticJoint) p.isStiff = command.value;
				});
				// Dumpbot milestone (ControllerDumpbot.Update :185): the arm joint made
				// non-floppy (isStiff) with its motor enabled -> dialog 57 "solidified".
				if (command.value && this.tutorialMachine) {
					const ids = new Set(command.partIds);
					const ok = this.state.parts.some(
						(p) => p instanceof RevoluteJoint && ids.has(p.id) && p.enableMotor && p.isStiff,
					);
					if (ok) this.notifyTutorial({ type: "progress", key: "solidified" });
				}
				return;
			case "setJointInitialLength":
				this.editParts(command.partIds, (p) => {
					if (p instanceof PrismaticJoint) p.initLength = Math.max(0, command.value);
				});
				return;

			// --- Thruster ---
			case "setThrusterStrength": {
				let v = Math.max(1, Math.min(MAX_JOINT_VALUE, command.value));
				// Challenge thruster-strength cap (ControllerGame.thrustText :4179).
				if (this.challenge) v = clampThruster(this.challenge, v);
				this.editParts(command.partIds, (p) => {
					if (p instanceof Thrusters) p.strength = v;
				});
				return;
			}
			case "setThrusterKey":
				this.editParts(command.partIds, (p) => {
					if (p instanceof Thrusters) p.thrustKey = command.key;
				});
				return;
			case "setThrusterAutoOn":
				this.editParts(command.partIds, (p) => {
					if (p instanceof Thrusters) p.autoOn = command.value;
				});
				return;
			// IB3 Thrusters.enableKey — whether the thrust key is honored.
			case "setThrusterEnableKey":
				this.editParts(command.partIds, (p) => {
					if (p instanceof Thrusters) p.enableKey = command.value;
				});
				return;

			// --- Cannon ---
			case "setCannonStrength": {
				const v = Math.max(1, Math.min(MAX_JOINT_VALUE, command.value));
				this.editParts(command.partIds, (p) => {
					if (p instanceof Cannon) p.strength = v;
				});
				return;
			}
			case "setCannonFireKey":
				this.editParts(command.partIds, (p) => {
					if (p instanceof Cannon) p.fireKey = command.key;
				});
				return;

			// --- Bomb (IB3 port; ranges from Util.as BO_* consts) ---
			case "setBombProps":
				this.editParts(command.partIds, (p) => {
					if (!(p instanceof Bomb)) return;
					if (command.blastRadius !== undefined) p.blastRadius = Bomb.ClampBlastRadius(command.blastRadius);
					if (command.strength !== undefined) {
						p.strength = Math.max(Bomb.MIN_STRENGTH, Math.min(Bomb.MAX_STRENGTH, command.strength));
					}
					if (command.delay !== undefined) p.delay = Math.max(0, Math.trunc(command.delay));
					if (command.delayAfterTrigger !== undefined) p.delayAfterTrigger = command.delayAfterTrigger;
					if (command.explodeOnImpact !== undefined) p.explodeOnImpact = command.explodeOnImpact;
					if (command.delayAfterImpact !== undefined) p.delayAfterImpact = command.delayAfterImpact;
					if (command.repeatable !== undefined) p.repeatable = command.repeatable;
					if (command.repeat !== undefined) p.repeat = Math.max(0, Math.trunc(command.repeat));
					if (command.sensitive !== undefined) p.sensitive = command.sensitive;
					if (command.sensitivity !== undefined) {
						p.sensitivity = Math.max(Bomb.MIN_SENSITIVITY, Math.min(Bomb.MAX_SENSITIVITY, command.sensitivity));
					}
					if (command.deflect !== undefined) p.deflect = command.deflect;
				});
				return;

			// --- Text (EnterTextAction / TextSizeChangeAction / TextCheckboxAction / ControlKeyAction TEXT_TYPE) ---
			case "setTextContent":
				this.editParts(command.partIds, (p) => {
					if (p instanceof TextPart) p.text = command.text;
				});
				// HomeMovies milestone (ControllerHomeMovies.Update :419): the dialogue text
				// was entered/resized -> dialog 48 "enteredText". Emit on a content change.
				if (this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "enteredText" });
				return;
			case "setTextSize":
				this.editParts(command.partIds, (p) => {
					if (p instanceof TextPart) p.size = Math.max(1, command.value);
				});
				if (this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "enteredText" });
				return;
			case "setTextDisplayKey":
				this.editParts(command.partIds, (p) => {
					if (p instanceof TextPart) p.displayKey = command.key;
				});
				return;
			case "setTextAlwaysVisible":
				this.editParts(command.partIds, (p) => {
					if (p instanceof TextPart) p.alwaysVisible = command.value;
				});
				// HomeMovies milestone (ControllerHomeMovies.Update :423): "Always Display"
				// unchecked -> dialog 52 "uncheckedAlwaysDisplay".
				if (command.value === false && this.tutorialMachine) {
					this.notifyTutorial({ type: "progress", key: "uncheckedAlwaysDisplay" });
				}
				return;
			case "setTextScaleWithZoom":
				this.editParts(command.partIds, (p) => {
					if (p instanceof TextPart) p.scaleWithZoom = command.value;
				});
				return;
			// IB3 TextPart.angle (radians) — rotates the rendered text.
			case "setTextAngle":
				this.editParts(command.partIds, (p) => {
					if (p instanceof TextPart) p.angle = command.value;
				});
				return;
			// IB3 TextPart.visibleOnStart — key-toggled text starts shown.
			case "setTextVisibleOnStart":
				this.editParts(command.partIds, (p) => {
					if (p instanceof TextPart) p.visibleOnStart = command.value;
				});
				return;

			case "setSandboxSettings":
				this.handleSetSandboxSettings(command);
				return;

			case "play":
				this.handlePlay();
				return;
			case "pause":
				this.handlePause();
				return;
			case "reset":
				this.handleReset();
				return;
			case "step":
				this.handleStep(command.frames ?? 1);
				return;

			// --- replays ---
			case "playReplay":
				this.handlePlayReplay(command.data);
				return;
			case "viewReplayAgain":
				this.handleViewReplayAgain();
				return;
			case "stopReplay":
				this.handleStopReplay();
				return;
			case "replayKey":
				this.handleReplayKey(command.key);
				return;
			case "moveCameraDuringSim":
				this.handleMoveCameraDuringSim(command.drawXOff, command.drawYOff, command.scale);
				return;

			// --- live play-mode interaction ---
			case "keyInput":
				this.handleKeyInput(command.key, command.up);
				return;
			case "mouseJointStart":
				this.handleMouseJointStart(command.worldX, command.worldY);
				return;
			case "mouseJointMove":
				this.handleMouseJointMove(command.worldX, command.worldY);
				return;
			case "mouseJointEnd":
				this.handleMouseJointEnd();
				return;

			// --- tutorials ---
			case "loadTutorial":
				this.handleLoadTutorial(command.levelIndex);
				return;
			case "advanceTutorial":
				this.handleAdvanceTutorial(command.messageId);
				return;
			case "closeTutorial":
				this.handleCloseTutorial();
				return;
			// Rotate the selection about its centroid by `angle` radians. GameCanvas
			// feeds the incremental delta since the last pointer move.
			case "rotateParts": {
				if (command.angle === 0) return;
				const target = new Set(command.partIds);
				const parts = this.state.parts.filter((p) => target.has(p.id));
				if (parts.length === 0) return;
				const c = this.selectionCentroid(parts);
				for (const p of parts) this.rotatePartAbout(p, c.x, c.y, command.angle);
				this.state = {
					...this.state,
					parts: [...this.state.parts],
					edit: { ...this.state.edit, selectedPart: this.deriveSelectedPart(this.state.edit.selection) },
				};
				this.markChanged();
				// RubeGoldberg milestone (ControllerRubeGoldberg.Update :689): rotating
				// the straight rect -> dialog 74 "rotated". Cursor-gated.
				if (this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "rotated" });
				return;
			}
			// Resize gesture lifecycle — faithful port of ControllerGame.scaleButton
			// (:3975) + RESIZING_SHAPES MouseDrag (:1553) + commit-on-up (:2070).
			case "resizeStart": {
				this.handleResizeStart(command.partIds);
				return;
			}
			case "resizeParts": {
				this.handleResizeApply(command.scaleFactor);
				return;
			}
			case "resizeEnd": {
				this.handleResizeEnd();
				return;
			}
			case "mirrorParts": {
				this.handleMirror(command.partIds, command.axis);
				return;
			}
			case "copyParts": {
				this.handleCopy(command.partIds);
				return;
			}
			case "cutParts": {
				this.handleCut(command.partIds);
				return;
			}
			case "pasteParts": {
				this.handlePaste(command.dx, command.dy);
				return;
			}
			case "movePartsToFront": {
				this.handleMoveToFront(command.partIds);
				return;
			}
			case "movePartsToBack": {
				this.handleMoveToBack(command.partIds);
				return;
			}
			case "createThrusters": {
				// Restriction gate (ControllerChallenge.thrustersButton :158-167).
				if (this.challenge && !partTypeAllowed(this.challenge, "thrusters")) return;
				// Snap the click to a shape centre when snapToCenter is on (MaybeCreate
				// Thrusters :6798-6801), then collect overlapping candidates at that point.
				const pt = this.snapJointPoint(command.x, command.y);
				const hits = this.shapesAt(pt.x, pt.y);
				if (hits.length === 0) return;
				if (hits.length > 1) {
					// >1-overlap disambiguation (MaybeCreateThrusters :6830-6837): enter the
					// cycle; the UI advances the pick + finalizes.
					this.beginJointDisambiguation("thrusters", hits, pt.x, pt.y);
					return;
				}
				this.finalizeThrusters(hits[0], pt.x, pt.y);
				return;
			}
			case "createCannon": {
				// Restriction gate (ControllerChallenge.cannonButton :169-178).
				if (this.challenge && !partTypeAllowed(this.challenge, "cannon")) return;
				// A Cannon is a free-standing ShapePart (NEW_CANNON flow :2274); the
				// legacy drag sizes its width, the click-to-create core uses a default.
				const cannon = new Cannon(command.x, command.y, DEFAULT_RECT_SIZE);
				// Challenge material limits clamp the defaults (see createShape).
				this.clampPartToChallengeLimits(cannon);
				// New parts adopt the current default colour (see createShape).
				cannon.red = this.defaultRed;
				cannon.green = this.defaultGreen;
				cannon.blue = this.defaultBlue;
				cannon.opacity = this.defaultOpacity;
				cannon.id = ++this.nextId;
				const selection = [cannon.id];
				this.state = {
					...this.state,
					parts: [...this.state.parts, cannon],
					// Successful create reverts to Select (ControllerGame Cannon :2256).
					edit: { ...this.state.edit, selection, selectedPart: this.snapshotOf(cannon), tool: "select" },
				};
				this.markChanged();
				return;
			}
			case "createJoint": {
				// A fixed/revolute joint attaches the two overlapping shapes under the
				// click (MaybeCreateJoint :6731). Restriction gate (ControllerChallenge.
				// fj/rjButton :125-156).
				if (this.challenge && !partTypeAllowed(this.challenge, command.kind)) return;
				// Snap the click to a shape centre when snapToCenter is on (:6737-6740),
				// then collect candidates at the (snapped) point.
				const pt = this.snapJointPoint(command.x, command.y);
				const hits = this.shapesAt(pt.x, pt.y);
				if (hits.length < 2) {
					// <2 candidates: nothing to join (MaybeCreateJoint else :6786-6788).
					return;
				}
				if (hits.length > 2) {
					// >2-overlap disambiguation (MaybeCreateJoint :6776-6785): enter the
					// cycle; the UI advances the pick + finalizes.
					this.beginJointDisambiguation(command.kind, hits, pt.x, pt.y);
					return;
				}
				// Exactly two: create immediately (MaybeCreateJoint :6751-6773).
				this.finalizeFixedOrRevolute(command.kind, hits[0], hits[1], pt.x, pt.y);
				return;
			}
			case "startPrismaticJoint": {
				// Two-click prismatic, click 1 (MaybeStartCreatingPrismaticJoint :6844).
				if (this.challenge && !partTypeAllowed(this.challenge, "prismatic")) return;
				// Shift held (bypassSnap): use the raw point so the UI's 15° axis snap
				// isn't overridden by snap-to-center (ui-hotkeys §4.4).
				const pt = command.bypassSnap ? { x: command.x, y: command.y } : this.snapJointPoint(command.x, command.y);
				const hits = this.shapesAt(pt.x, pt.y);
				if (hits.length === 0) {
					// No shape under click 1 — abort (:6864-6866).
					this.cancelJointGesture();
					return;
				}
				if (hits.length > 1) {
					// >1-overlap: disambiguate which shape #1 binds (:6873-6881).
					this.beginJointDisambiguation("prismatic1", hits, pt.x, pt.y);
					return;
				}
				// Record shape #1 + axis-start point; await click 2 (:6867-6872).
				this.pendingPrismatic = { part1: hits[0], x1: pt.x, y1: pt.y };
				this.syncJointGesture();
				this.markChanged();
				this.emitSound("jointCreated");
				return;
			}
			case "finishPrismaticJoint": {
				// Two-click prismatic, click 2 (MaybeFinishCreatingPrismaticJoint :6884).
				if (!this.pendingPrismatic) return;
				// Shift held (bypassSnap): use the raw point so the UI's 15° axis snap on
				// the second click isn't overridden by snap-to-center (ui-hotkeys §4.4).
				const pt = command.bypassSnap
					? { x: command.x, y: command.y }
					: this.snapJointPoint(command.x, command.y, this.pendingPrismatic.part1);
				// Candidates exclude shape #1 (:6896).
				const hits = this.shapesAt(pt.x, pt.y).filter((p) => p !== this.pendingPrismatic!.part1);
				if (hits.length === 0) {
					// No second shape — abort (:6933-6935).
					this.cancelJointGesture();
					return;
				}
				if (hits.length > 1) {
					// >1-overlap: disambiguate shape #2 (:6925-6932).
					this.beginJointDisambiguation("prismatic2", hits, pt.x, pt.y);
					return;
				}
				this.finalizePrismatic(this.pendingPrismatic.part1, hits[0], this.pendingPrismatic.x1, this.pendingPrismatic.y1, pt.x, pt.y);
				return;
			}
			case "cycleJointCandidate": {
				this.cycleJointCandidate();
				return;
			}
			case "finalizeJoint": {
				this.finalizePendingJoint(command.x, command.y);
				return;
			}
			case "cancelJointGesture": {
				this.cancelJointGesture();
				return;
			}
			// Group property edit (MultiActionsAction): run each sub-command through
			// the SAME per-command handler in order. apply() already pushed a single
			// history snapshot for the whole batch (isMutating("batch")), and dispatch()
			// coalesces the notify, so the group edit is one undo step + one emit. Each
			// sub still clamps per part; skip nested batch history by going through
			// applyCommand (not apply/dispatch).
			case "batch":
				for (const sub of command.commands) this.applyCommand(sub);
				return;
			case "undo":
				this.handleUndo();
				return;
			case "redo":
				this.handleRedo();
				return;

			// --- View menu (ControllerGame BuildViewMenu) ---
			case "toggleShowJoints":
				// jointBox (:5261): flip showJoints.
				this.state = { ...this.state, edit: { ...this.state.edit, showJoints: !this.state.edit.showJoints } };
				this.markChanged();
				return;
			case "toggleShowColours":
				// colourBox (:5271): flip showColours (the renderer maps this to Draw.drawColours).
				this.state = { ...this.state, edit: { ...this.state.edit, showColours: !this.state.edit.showColours } };
				this.markChanged();
				return;
			case "toggleShowOutlines":
				// globalOutlineBox (:5266): flip showOutlines.
				this.state = { ...this.state, edit: { ...this.state.edit, showOutlines: !this.state.edit.showOutlines } };
				this.markChanged();
				return;
			case "toggleSnapToCenter":
				// centerBox (:5257): flip snapToCenter.
				this.state = { ...this.state, edit: { ...this.state.edit, snapToCenter: !this.state.edit.snapToCenter } };
				this.markChanged();
				// Car milestone (ControllerCar.centerBox :118-124): toggling "Snap to Center"
				// after making the first joint -> dialog 11 "snapToCenter". Cursor-gated.
				if (this.tutorialMachine) this.notifyTutorial({ type: "progress", key: "snapToCenter" });
				return;
			case "zoomIn":
				this.handleZoom(ZOOM_IN_FACTOR);
				return;
			case "zoomOut":
				this.handleZoom(ZOOM_OUT_FACTOR);
				return;
			case "centerOnSelection":
				this.handleCenterOnSelection();
				return;
			case "panCamera":
				this.handlePanCamera(command.dx, command.dy, command.viewW, command.viewH);
				return;
			case "zoomCamera":
				this.handleZoomCamera(command.scaleFactor, command.focusX, command.focusY, command.viewW, command.viewH);
				return;
			// --- Challenge mode -------------------------------------------------
			case "newChallenge": {
				// Start a fresh authoring challenge (empty conditions/restrictions,
				// default Challenge flags). Editing (not playOnly), so the author can
				// build terrain + define conditions before switching to play.
				this.challenge = createChallengeSession();
				this.syncChallenge();
				return;
			}
			case "loadBuiltInChallenge": {
				// Faithful port of ControllerClimb / ControllerMonkeyBars ctors: bake
				// the terrain + conditions + restrictions, mark playOnly + playMode,
				// and seed the terrain into the parts graph. Reset the session first
				// (fresh-controller semantics) so the previous mode's robot/terrain,
				// challenge, tutorial, and history don't survive the switch — the old
				// code retained editable robot parts, which is exactly the "stale
				// content on switch" bug when moving between challenges.
				this.resetSessionForLoad();
				this.challenge = createChallengeSession();
				const terrain = buildBuiltInChallenge(command.name, this.challenge);
				for (const p of terrain) p.id = ++this.nextId;
				this.state = { ...this.state, parts: terrain };
				this.markChanged();
				this.syncChallenge();
				return;
			}
			case "exitChallenge": {
				this.challenge = null;
				this.cannonballs = [];
				this.syncChallenge();
				return;
			}
			case "addWinCondition": {
				if (!this.challenge) return;
				this.pushWinCondition(
					command.name ?? "Condition",
					command.subject,
					command.object,
					command.region ?? null,
					command.shape1Id,
					command.shape2Id,
				);
				this.syncChallenge();
				return;
			}
			case "addLossCondition": {
				if (!this.challenge) return;
				this.pushLossCondition(
					command.name ?? "Condition",
					command.subject,
					command.object,
					command.immediate,
					command.region ?? null,
					command.shape1Id,
					command.shape2Id,
				);
				this.syncChallenge();
				return;
			}
			case "removeWinCondition": {
				if (!this.challenge) return;
				this.challenge.challenge.winConditions.splice(command.index, 1);
				this.syncChallenge();
				return;
			}
			case "removeLossCondition": {
				if (!this.challenge) return;
				this.challenge.challenge.lossConditions.splice(command.index, 1);
				this.syncChallenge();
				return;
			}
			case "setWinConditionsAnded": {
				if (!this.challenge) return;
				this.challenge.challenge.winConditionsAnded = command.value;
				this.syncChallenge();
				return;
			}
			case "startConditionPick": {
				// ConditionsWindow.addWin/LossButtonPressed (:226-268): subject-0
				// picks shape1 FIRST (selectingForShape1), then the object pick;
				// otherwise go straight to the object's box/line/shape2 pick.
				if (!this.challenge) return;
				const awaiting = command.subject === 0 ? "shape1" : this.awaitForObject(command.object);
				this.setConditionDraft({
					kind: command.kind,
					name: command.name,
					subject: command.subject,
					object: command.object,
					immediate: command.immediate,
					shape1Id: null,
					shape2Id: null,
					awaiting,
					firstClick: null,
				});
				return;
			}
			case "conditionPickBox": {
				// FinishDrawingCondition index math (ConditionsWindow :270-314):
				//   obj 0 (box):   min/max of the two corners.
				//   obj <3 (hline): (x1,y1)-(x2,y1)  — horizontal span at y1.
				//   else  (vline): (x1,y1)-(x1,y2)  — vertical span at x1.
				const draft = this.state.conditionDraft;
				if (!draft || draft.awaiting === "shape1" || draft.awaiting === "shape2" || draft.awaiting === null) return;
				const { x1, y1, x2, y2 } = command;
				let region: { minX: number; maxX: number; minY: number; maxY: number };
				if (draft.object === 0) {
					region = { minX: Math.min(x1, x2), minY: Math.min(y1, y2), maxX: Math.max(x1, x2), maxY: Math.max(y1, y2) };
				} else if (draft.object < 3) {
					region = { minX: x1, minY: y1, maxX: x2, maxY: y1 };
				} else {
					region = { minX: x1, minY: y1, maxX: x1, maxY: y2 };
				}
				this.finalizeConditionDraft(region);
				return;
			}
			case "conditionPickShape": {
				// FinishSelectingForCondition (:316-334). shape1 pick (subject-0):
				// store shape1, then continue the add flow — either the object needs
				// a region/shape2 (advance awaiting) or it's obj<5 (finalize now with
				// no region, matching addWinButtonPressed(false) falling through the
				// object branches with obj not in 0..4 handled — but subject-0 always
				// has an object, so we route through awaitForObject). shape2 pick
				// (obj-5/6): store shape2 + finalize.
				const draft = this.state.conditionDraft;
				if (!draft || (draft.awaiting !== "shape1" && draft.awaiting !== "shape2")) return;
				const part = this.findPart(command.shapeId);
				if (!(part instanceof ShapePart)) return;
				if (draft.awaiting === "shape1") {
					const next = this.awaitForObject(draft.object);
					this.setConditionDraft({ ...draft, shape1Id: command.shapeId, awaiting: next, firstClick: null });
				} else {
					// shape2: FinishSelectingForCondition else-branch — set shape2 (+
					// existing shape1) and push (:322-333). No region.
					this.setConditionDraft({ ...draft, shape2Id: command.shapeId });
					this.finalizeConditionDraft(null);
				}
				return;
			}
			case "cancelConditionPick": {
				this.setConditionDraft(null);
				return;
			}
			case "setAllowedParts": {
				if (!this.challenge) return;
				const ch = this.challenge.challenge;
				// Panel already un-inverts the editor's "exclude" checkboxes
				// (RestrictionsWindow stores !box.selected :348-355).
				ch.circlesAllowed = command.circles;
				ch.rectanglesAllowed = command.rects;
				ch.trianglesAllowed = command.tris;
				ch.fixedJointsAllowed = command.fixed;
				ch.rotatingJointsAllowed = command.revolute;
				ch.slidingJointsAllowed = command.prismatic;
				ch.thrustersAllowed = command.thrusters;
				ch.cannonsAllowed = command.cannons;
				// Jaybit "Exclude Triggers" (RestrictionsWindow.as:736). Optional so
				// pre-Jaybit dispatch sites leave the flag untouched.
				if (command.triggers !== undefined) ch.triggersAllowed = command.triggers;
				this.syncChallenge();
				// ChallengeEditor milestones (ControllerChallengeEditor.Update :385-390):
				// opening the Restrictions dialog -> 103 "clickedRestrictions" (no dedicated
				// command, walk the cursor); excluding Fixed+Sliding joints AND Thrusters ->
				// 105 "excludedStuff" (fixed && sliding && thrusters now disallowed).
				if (this.tutorialMachine) {
					this.notifyTutorial({ type: "progress", key: "clickedRestrictions" });
					if (!command.fixed && !command.prismatic && !command.thrusters) {
						this.notifyTutorial({ type: "progress", key: "excludedStuff" });
					}
				}
				return;
			}
			case "setBuildPermissions": {
				if (!this.challenge) return;
				const ch = this.challenge.challenge;
				ch.mouseDragAllowed = command.mouseDrag;
				ch.botControlAllowed = command.botControl;
				ch.fixateAllowed = command.fixate;
				ch.nonCollidingAllowed = command.nonColliding;
				ch.showConditions = command.showConditions;
				this.syncChallenge();
				// ChallengeEditor milestone (ControllerChallengeEditor.Update :391-393):
				// "Allow user Control of Bot" unchecked -> 106 "disallowedControl". Walk the
				// cursor through clickedRestrictions first in case setAllowedParts wasn't the
				// dispatch that opened the dialog (cursor-gated, so it's a no-op if already
				// past it).
				if (this.tutorialMachine) {
					this.notifyTutorial({ type: "progress", key: "clickedRestrictions" });
					if (!command.botControl) this.notifyTutorial({ type: "progress", key: "disallowedControl" });
				}
				return;
			}
			case "setPartLimits": {
				if (!this.challenge) return;
				const ch = this.challenge.challenge;
				// null == the ∓Number.MAX_VALUE "no limit" sentinel (Challenge.ts:22-28).
				ch.minDensity = command.minDensity === null ? NO_LIMIT_MIN : command.minDensity;
				ch.maxDensity = command.maxDensity === null ? NO_LIMIT_MAX : command.maxDensity;
				// Jaybit friction/restitution limits (optional in the command payload;
				// omitted == no limit).
				ch.minFriction = command.minFriction == null ? NO_LIMIT_MIN : command.minFriction;
				ch.maxFriction = command.maxFriction == null ? NO_LIMIT_MAX : command.maxFriction;
				ch.minRestitution = command.minRestitution == null ? NO_LIMIT_MIN : command.minRestitution;
				ch.maxRestitution = command.maxRestitution == null ? NO_LIMIT_MAX : command.maxRestitution;
				ch.maxRJStrength = command.maxRJStrength === null ? NO_LIMIT_MAX : command.maxRJStrength;
				ch.maxRJSpeed = command.maxRJSpeed === null ? NO_LIMIT_MAX : command.maxRJSpeed;
				ch.maxSJStrength = command.maxSJStrength === null ? NO_LIMIT_MAX : command.maxSJStrength;
				ch.maxSJSpeed = command.maxSJSpeed === null ? NO_LIMIT_MAX : command.maxSJSpeed;
				ch.maxThrusterStrength =
					command.maxThrusterStrength === null ? NO_LIMIT_MAX : command.maxThrusterStrength;
				this.syncChallenge();
				return;
			}
			case "addBuildArea": {
				if (!this.challenge) return;
				const area = new b2AABB();
				area.lowerBound.Set(command.minX, command.minY);
				area.upperBound.Set(command.maxX, command.maxY);
				this.challenge.challenge.buildAreas.push(area);
				this.syncChallenge();
				// ChallengeEditor milestones (ControllerChallengeEditor.Update :358-363):
				// clicking the build-box tool -> 93 "clickedBuildBox"; drawing the box ->
				// 94 "builtBuildBox". The tool-click has no dedicated command, so walk the
				// cursor through it before the built-box milestone (cursor-gated).
				if (this.tutorialMachine) {
					this.notifyTutorial({ type: "progress", key: "clickedBuildBox" });
					if (this.challenge.challenge.buildAreas.length === 1) {
						this.notifyTutorial({ type: "progress", key: "builtBuildBox" });
					}
				}
				return;
			}
			case "removeBuildArea": {
				if (!this.challenge) return;
				this.challenge.challenge.buildAreas.splice(command.index, 1);
				this.syncChallenge();
				return;
			}
			case "enterChallengePlay": {
				// ControllerChallenge.playButton first press (:39-50): snapshot the
				// editable robot into challenge.allParts, enter play mode, mark those
				// parts uneditable, then CheckIfPartsFit + clear selection.
				if (!this.challenge || this.challenge.playMode) return;
				const robot = this.state.parts.filter((p) => p.isEditable);
				this.challenge.savedRobot = robot;
				this.challenge.challenge.allParts = robot;
				this.challenge.playMode = true;
				for (const p of robot) p.isEditable = false;
				// NOTE: edit.editable is the robot-EXPOSURE lock (setRobotEditable),
				// deliberately NOT touched here — the challenge play-mode lock is
				// expressed via state.challenge.playMode + the parts' isEditable
				// flags, so the two locks can't desync.
				this.state = {
					...this.state,
					parts: [...this.state.parts],
					edit: { ...this.state.edit, selection: [], selectedPart: null },
				};
				this.markChanged();
				this.syncChallenge();
				return;
			}
			case "editChallenge": {
				// ControllerChallenge.editButton (:64-76): guarded by playOnly; restore
				// the saved robot parts as editable again and leave play mode.
				if (!this.challenge) return;
				if (this.challenge.playOnly) return; // "This challenge is uneditable!"
				this.challenge.playMode = false;
				for (const p of this.challenge.savedRobot) p.isEditable = true;
				// edit.editable (the exposure lock) deliberately untouched — see
				// enterChallengePlay.
				this.state = {
					...this.state,
					parts: [...this.state.parts],
				};
				this.markChanged();
				this.syncChallenge();
				return;
			}

			case "newRobot":
			case "clearAll":
				// File -> New Robot / Edit -> Clear All: drop editable robot parts, keep
				// terrain (ControllerGame.clearButton :4845). Editing-phase only (gated
				// by the no-op-during-sim switch above). Starting fresh unlocks an
				// uneditable loaded robot (curRobotEditable, Wave 3a).
				this.setRobotEditable(true);
				this.clearRobot();
				return;

			case "newSandbox": {
				// Menu "Sandbox Mode" / "Advanced Sandbox": a full fresh-controller
				// reset (legacy sandboxButton -> new ControllerSandbox). Drop every
				// prior session (challenge/tutorial/replay/history/running sim), then
				// restore the DEFAULT sandbox environment, terrain, and camera so no
				// leftover parts, settings, or tutorial dialog bleed in from the
				// previous mode. Passes through during a running sim (not a no-op).
				this.resetSessionForLoad();
				const fresh = createInitialState();
				for (const p of fresh.parts) p.id = ++this.nextId;
				this.state = {
					...this.state,
					parts: fresh.parts,
					sandbox: fresh.sandbox,
					camera: fresh.camera,
				};
				this.markChanged();
				return;
			}

			case "loadRobot":
				throw new Error(`GameCore: command "${command.type}" not yet migrated from ControllerGame`);
			default: {
				// Exhaustiveness guard: adding a Command variant without a case here is a compile error.
				const _never: never = command;
				throw new Error(`GameCore: unknown command ${JSON.stringify(_never)}`);
			}
		}
	}
}
