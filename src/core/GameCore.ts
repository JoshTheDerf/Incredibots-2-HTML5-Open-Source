// Core⇄view contract — the GameCore store
//
// Headless, Pixi-free, DOM-free. Owns the authoritative GameState, applies
// Commands, and notifies subscribers on change. This is the seam the renderer
// and the Vue + Nuxt UI both bind to. See docs/CONTRACT.md.
//
// GameCore is a FAÇADE: it owns the cross-cutting session fields (exposed to
// the subsystem modules through the CoreInternals seam, coreInternals.ts), the
// dispatch/apply funnel with its undo + exposure gates, the public async
// import/export entry points (the ByteArray decode work), and the notify /
// sound / message / tutorial-event glue. The per-domain command handlers live
// in the sibling modules as free functions over CoreInternals:
//
//   simRuntime.ts     world lifecycle, play/pause/reset/step, mouse joint
//   replayRuntime.ts  recording buffers + sim-free playback
//   importExport.ts   post-decode robot/challenge/replay appliers + load gates
//   historyOps.ts     undo/redo snapshots + removal-cascade maintenance
//   clipboardOps.ts   copy/cut/paste + z-order
//   partOps.ts        create/edit/delete/move + joint gestures + read-model
//   partProps.ts      the setColour / set* property-command family
//   cameraOps.ts      zoom/pan/centre + sandbox-settings apply
//   challengeOps.ts   challenge sessions, conditions, restrictions
//   tutorialOps.ts    tutorial session lifecycle commands

import type { b2Joint } from "../Box2D";
import type { Part } from "../Parts/Part";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { DEFAULT_B, DEFAULT_G, DEFAULT_O, DEFAULT_R } from "../Parts/partDefaults";
import { ShapePart } from "../Parts/ShapePart";
import type { Command } from "./Command";
import { COMMAND_META, isMutatingCommand } from "./commandMeta";
import type { ResizeGesture } from "./geometryEdit";
import { FractureSystem } from "./fractureSystem";
import { GameState, createInitialState } from "./GameState";
import type { CameraState, TutorialState } from "./GameState";
import { decodeRobot, decodeRobotFile, encodeRobot } from "./robotSerialization";
import {
	decodeChallengeBlob,
	decodeChallengeWithMeta,
	decodeChallengeFile,
	encodeChallenge,
} from "./challengeSerialization";
import { encodeReplay, decodeReplay, decodeReplayFile, decodeDemoReplay, replayCodeIsIB3, replayFileIsIB3 } from "./replaySerialization";
import type { ReplayMeta } from "./replaySerialization";
import { EXPO_PUBLIC_EDITABLE } from "./exposure";
import { ChallengeSession, checkIfPartsFit, toChallengeState } from "./challenge";
import type { WaterSystem } from "./waterSystem";
import type { RecordingBuffers, ReplaySession, ReplayData } from "./replay";
import {
	type TutorialMachine,
	type TutorialEvent,
	type DialogAction,
	resolveMessage,
	TUTORIAL_LEVELS,
} from "./tutorials";
import { decodeIB3, decodeIB3File, type IB3ReplayData } from "./ib3Import";
import {
	ZOOM_IN_FACTOR,
	ZOOM_OUT_FACTOR,
	handleCenterOnSelection,
	handlePanCamera,
	handleSetSandboxSettings,
	handleZoom,
	handleZoomCamera,
} from "./cameraOps";
import { handleAdvanceTutorial, handleCloseTutorial, handleLoadTutorial } from "./tutorialOps";
import { applyChallengeCommand } from "./challengeOps";
import { applyPartPropsCommand } from "./partProps";
import {
	cancelJointGesture,
	clearRobot,
	cycleJointCandidate,
	finalizePendingJoint,
	handleCreateCannon,
	handleCreateJoint,
	handleCreatePolygon,
	handleCreateShape,
	handleCreateText,
	handleCreateThrusters,
	handleDeleteParts,
	handleEditPolygonPoint,
	handleAddPolygonPoint,
	handleFinishPrismaticJoint,
	handleMirror,
	handleMoveParts,
	handleRemovePolygonPoint,
	handleResizeApply,
	handleResizeEnd,
	handleResizeStart,
	handleRotateParts,
	handleSelect,
	handleStartPrismaticJoint,
	handleSubtractShapes,
} from "./partOps";
import { handleCopy, handleCut, handleMoveToBack, handleMoveToFront, handlePaste } from "./clipboardOps";
import { HISTORY_CAP, captureSnapshot, cascadeRemovalSet, clearRemovedConditionRefs, handleRedo, handleUndo } from "./historyOps";
import { defaultPolyHandle, deriveSelectedPart, editParts, snapshotOf } from "./partOps";
import {
	applyBuiltInChallenge,
	applyImportedChallenge,
	applyImportedReplay,
	applyImportedRobot,
	applyInsertedRobot,
	clampPartToChallengeLimits,
	clipboardPartKind,
	partCarriesTriggers,
	playOrLoadIB3Replay,
	prepareChallengeForExport,
} from "./importExport";
import {
	handleKeyInput,
	handleMouseJointEnd,
	handleMouseJointMove,
	handleMouseJointStart,
	handlePause,
	handlePlay,
	handleReset,
	handleStep,
	resetSessionForLoad,
} from "./simRuntime";
import {
	exportReplayData,
	handleMoveCameraDuringSim,
	handlePlayReplay,
	handleReplayKey,
	handleStopReplay,
	handleViewReplayAgain,
	prepareReplayForExport,
} from "./replayRuntime";
import type {
	CoreInternals,
	EditTransform,
	HistorySnapshot,
	PendingJoint,
	PendingPrismatic,
} from "./coreInternals";

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

export class GameCore implements CoreInternals {
	state: GameState;
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
	defaultRed = DEFAULT_R;
	defaultGreen = DEFAULT_G;
	defaultBlue = DEFAULT_B;
	defaultOpacity = DEFAULT_O;
	/** batching depth so a compound command notifies subscribers once. */
	private notifyDepth = 0;
	private dirty = false;
	/** monotonic source of stable Part ids. */
	nextId = 0;
	/** Per-part pre-play edit transforms, captured on play, restored on reset. */
	editSnapshots: EditTransform[] = [];
	/**
	 * Pre-play camera snapshot (offsetX/offsetY/scale), captured on play and
	 * restored on reset so a run that auto-panned/followed the robot returns the
	 * view to where the user left it (ControllerGame.playButton snapshots
	 * savedDrawXOff/YOff :2776-2777; resetButton restores them :2813-2814). null
	 * until the first play. Port note: the legacy stores the pre-transform focus in
	 * its own draw-offset units; we snapshot the whole camera and restore it verbatim.
	 */
	cameraSnapshot: CameraState | null = null;
	/** Undo / redo stacks of editable-state snapshots (see HistorySnapshot). */
	undoStack: HistorySnapshot[] = [];
	redoStack: HistorySnapshot[] = [];
	/**
	 * ControllerGame.curRobotEditable: false after loading a robot saved with an
	 * "uneditable" exposure (SaveWindow enum, Wave 3a). Gates every mutating
	 * command at the dispatch funnel — honor-system, exactly like Jaybit's ~20
	 * `!curRobotEditable` editor-entry guards. Reset to true by newRobot /
	 * clearAll / loading an editable robot.
	 */
	curRobotEditable = true;
	/**
	 * The live challenge session (ControllerChallenge's role): the domain
	 * Challenge object + play/edit orchestration. null for a plain sandbox
	 * session. The plain-data projection is mirrored into state.challenge.
	 */
	challenge: ChallengeSession | null = null;
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
	cannonballs: unknown[] = [];

	/**
	 * Live water system for the current run (IB3 WaterControl port,
	 * src/core/waterSystem.ts). Built at play when sandbox.water.enabled,
	 * dropped with the world on reset/stop. Owns the buoyancy(+tide/wave)
	 * controller registered on the b2World; newly-created bodies join via
	 * waterSystem.addBody and destroyed bodies are unlinked by
	 * b2World.DestroyBody's controller-edge cleanup (bombs!).
	 */
	waterSystem: WaterSystem | null = null;
	/**
	 * Runtime shatter watcher + its live fragment bodies (superset/prototype, see
	 * src/core/fractureSystem.ts). Fragments are TRANSIENT sim-only shapes (the
	 * cannonball pattern) — they live here, NOT in state.parts, so a reset drops
	 * them and the fractured originals return. The renderer draws them by
	 * concatenating getSimFragments() after state.parts. Only populated during a
	 * normal (non-replay) sim; cleared on play + reset.
	 */
	fractureSystem = new FractureSystem();
	simFragments: ShapePart[] = [];
	/**
	 * Live replay recording buffers while a normal (non-replay) sim runs; null
	 * otherwise. Reset on `play` (ControllerGame.ts:2730-2735). See src/core/replay.ts.
	 */
	recording: RecordingBuffers | null = null;
	/**
	 * Active replay playback session (decoded replay + splines + cursors); null
	 * unless playing a replay. When set, the sim runs FROZEN — the world is not
	 * stepped; bodies are driven from sync points. See src/core/replay.ts.
	 */
	replaySession: ReplaySession | null = null;
	/**
	 * Pending IB3 recorded run awaiting play-time compaction. IB3 sync points are
	 * indexed by saved-parts order and keyed to ShapePart objects; they can only be
	 * compacted into this app's live body order after handlePlay builds the bodies.
	 * Set by the IB3-replay import path, consumed once in handlePlayReplay.
	 */
	ib3ReplayTracks: IB3ReplayData | null = null;
	/**
	 * IB3 replay camera: whether the recorded run has BROKEN focus (a brokeFocus
	 * camera movement was applied). While false and the replay follows focus,
	 * playback live-pans to the camera-focus part each frame; once broken, the
	 * recorded offsets own the camera. Reset at each playback start.
	 */
	replayFocusBroken = false;
	/** The active tutorial's hand-coded machine; null for non-tutorial sessions. */
	tutorialMachine: TutorialMachine | null = null;
	/** Persistent level-done grid (mirrors LSOManager.IsLevelDone(0..13)). */
	levelsDone: boolean[] = new Array(TUTORIAL_LEVELS.length).fill(false);
	/** Latches the one-shot tutorial "won" trigger so it fires once per run. */
	tutorialWonFired = false;
	/**
	 * The live b2MouseJoint dragging a body during the running sim, or null.
	 * Owned here on the world (ControllerGame.m_mouseJoint :87); GameCanvas drives
	 * it via the mouseJointStart/Move/End commands from pointer events.
	 */
	mouseJoint: b2Joint | null = null;

	/**
	 * The copy/paste clipboard (ControllerGameGlobals.clipboardParts). Holds cloned
	 * Part instances — the selected shapes/text plus the joints/thrusters BETWEEN
	 * them — captured by copyParts/cutParts. NOT render state (never crosses a
	 * worker boundary), so it lives on the core, not GameState. Cleared to [] on
	 * each copy/cut. Paste clones from here so the clipboard survives repeated pastes.
	 */
	clipboard: Part[] = [];

	/**
	 * Active resize-gesture baseline (ControllerGame.scaleButton :3975), or null.
	 * See geometryEdit.ResizeGesture for what `resizeStart` captures. `resizeParts`
	 * applies the TOTAL from-baseline factor against this; `resizeEnd` clears it.
	 * Holds live Part references (persist across pushHistory, which only clones
	 * into the undo stack).
	 */
	resizeGesture: ResizeGesture | null = null;

	/**
	 * First-click state of the two-click PRISMATIC-joint gesture (ControllerGame
	 * MaybeStartCreatingPrismaticJoint :6844 sets jointPart + firstClickX/Y, then
	 * actionStep 1 waits for the second click). null when no prismatic is
	 * mid-construction. Holds a live ShapePart ref for part1 and the axis-start
	 * world point. `finishPrismaticJoint` consumes it. Cleared on tool change /
	 * cancel via `cancelJointGesture`.
	 */
	pendingPrismatic: PendingPrismatic | null = null;

	/**
	 * >2-overlap joint / thruster disambiguation state (ControllerGame
	 * FINALIZING_JOINT, :6776-6785 / :6830-6837 / :6873-6881). When more shapes
	 * overlap the click than a joint (2) / thruster (1) needs, the legacy enters a
	 * cycle: each subsequent CLICK advances which candidate pair (or single, for
	 * thrusters/prismatic-step-1) is highlighted (:2435-2473); a finalize commits
	 * the current pick. Holds the candidate list + the current index pair + what is
	 * being built. Highlighted parts carry highlightForJoint (drawn by Draw).
	 */
	pendingJoint: PendingJoint | null = null;

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
	emitSound(event: SoundEvent): void {
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
	emitMessage(message: string): void {
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
	setRobotEditable(v: boolean): void {
		this.curRobotEditable = v;
		if (this.state.edit.editable !== v) {
			this.state = { ...this.state, edit: { ...this.state.edit, editable: v } };
			this.markChanged();
		}
	}

	/** The single entry point for all mutations. */
	dispatch(command: Command): void {
		this.withNotifyBatch(() => this.apply(command));
	}

	/**
	 * Run `fn` inside a notify batch: subscribers are notified once at the end
	 * (if anything marked the state changed), no matter how many nested batches
	 * or markChanged calls happen inside. dispatch() and the multi-step load/
	 * import paths share this so a compound mutation emits a single snapshot.
	 */
	withNotifyBatch(fn: () => void): void {
		this.notifyDepth++;
		try {
			fn();
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
	markChanged(): void {
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
		applyImportedRobot(this, decoded);
	}

	/**
	 * Load a robot from user .ibro FILE bytes (or a text code pasted into a
	 * file — the "eN" sniffer routes both). Otherwise identical to importRobot.
	 */
	async importRobotFile(bytes: ArrayBuffer | Uint8Array): Promise<void> {
		if (this.state.sim.phase !== "editing") return;
		const decoded = await decodeRobotFile(bytes);
		applyImportedRobot(this, decoded);
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
		applyInsertedRobot(this, decoded);
	}

	/**
	 * Import And Insert from user .ibro FILE bytes (or a pasted text code — the
	 * "eN" sniffer routes both). Otherwise identical to importRobotInsert.
	 */
	async importRobotFileInsert(bytes: ArrayBuffer | Uint8Array): Promise<void> {
		if (this.state.sim.phase !== "editing") return;
		const decoded = await decodeRobotFile(bytes);
		applyInsertedRobot(this, decoded);
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
		applyBuiltInChallenge(this, name, challenge);
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
		applyImportedChallenge(this, decoded.challenge, decoded.exposure.isEditable);
	}

	/**
	 * Load a challenge from user .ibch FILE bytes (or a text code pasted into a
	 * file — the "eN" sniffer routes both). Otherwise identical to importChallenge.
	 */
	async importChallengeFile(bytes: ArrayBuffer | Uint8Array): Promise<void> {
		// No editing-phase guard (see importChallenge): the session reset forces
		// editing, so a mid-run switch loads cleanly.
		const decoded = await decodeChallengeFile(bytes);
		applyImportedChallenge(this, decoded.challenge, decoded.exposure.isEditable);
	}

	/**
	 * Encode the live challenge session to the legacy export string (base64 of a
	 * zlib-compressed ByteArray), byte-compatible with Database.ExportChallenge.
	 * Returns null when no challenge session is active. async (compression).
	 */
	async exportChallengeString(name = "", desc = "", expo: number = EXPO_PUBLIC_EDITABLE): Promise<string | null> {
		const challenge = prepareChallengeForExport(this);
		if (!challenge) return null;
		return encodeChallenge(challenge, name, desc, expo);
	}

	/** Look up a live Part by its stable id. */
	findPart(id: number): Part | undefined {
		return this.state.parts.find((p) => p.id === id);
	}

	// --- Challenge orchestration -------------------------------------------

	/**
	 * Recompute the CheckIfPartsFit gate (challenge play mode only) and re-project
	 * the live challenge session into state.challenge. Called after any command
	 * that touches conditions/restrictions/build areas/parts while a challenge is
	 * active. No-op (leaves state.challenge null) when there is no session.
	 */
	syncChallenge(): void {
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

	// --- Replay export / import --------------------------------------------
	//
	// See docs/PORT-SPEC-tutorials-replays.md §B, src/core/replay.ts and
	// src/core/replayRuntime.ts (which owns the recording/playback runtime).

	/**
	 * Finalize the current recording into a serializable ReplayData
	 * (ControllerGame.ts:5354-5360). Returns null if there is no active
	 * recording (or it is marked non-saveable). A pure read — not a Command.
	 */
	exportReplay(): ReplayData | null {
		return exportReplayData(this);
	}

	/**
	 * Encode the current replay recording to the legacy-compatible replay export
	 * string (base64 of the zlib-compressed Database.ExportReplay byte format),
	 * bundling the current robot parts + sandbox settings. Returns null when there
	 * is no active recording. async because ByteArray.compress() is async. The
	 * result interops with the legacy game (Database.ExportReplay / ImportReplay).
	 */
	async exportReplayString(meta: ReplayMeta = {}): Promise<string | null> {
		const bundle = prepareReplayForExport(this);
		if (!bundle) return null;
		return encodeReplay(bundle.data, bundle.robot, meta);
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
		// An IB3 replay is an IB3 file, not the IB2 replayLength/robotLength format,
		// so it can't go through the IB2 replay decoder. Decode it as IB3 and, if its
		// recorded run read successfully, PLAY it; otherwise fall back to importing
		// the bundled design.
		if (await replayCodeIsIB3(replayStr)) {
			await playOrLoadIB3Replay(this, await decodeIB3(replayStr));
			return;
		}
		const decoded = await decodeReplay(replayStr);
		applyImportedReplay(this, decoded);
	}

	/**
	 * Load + play a replay from user .ibre FILE bytes (or a text code pasted
	 * into a file — the "eN" sniffer routes both). Otherwise identical to
	 * importReplay.
	 */
	async importReplayFile(bytes: ArrayBuffer | Uint8Array): Promise<void> {
		if (this.state.sim.phase !== "editing") return;
		// IB3 replay file → play the recorded run (or import the design; see importReplay).
		if (await replayFileIsIB3(bytes)) {
			await playOrLoadIB3Replay(this, await decodeIB3File(bytes));
			return;
		}
		const decoded = await decodeReplayFile(bytes);
		applyImportedReplay(this, decoded);
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
	applyTutorialDialog(action: DialogAction | null): void {
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
	notifyTutorial(event: TutorialEvent): void {
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

	// --- Undo / redo history -----------------------------------------------
	//
	// Snapshot-based history (see historyOps.ts): before any mutating command
	// apply() deep-clones the editable state (parts graph + selection/tool) onto
	// the undo stack and clears the redo stack; the undo/redo commands swap the
	// current state with the top of the respective stack.

	/**
	 * Push the current editable state onto the undo stack and clear the redo
	 * stack. Called before applying any mutating command. Also refreshes the
	 * canUndo/canRedo flags (done via the state rebuild in the calling handler).
	 */
	pushHistory(): void {
		this.undoStack.push(captureSnapshot(this));
		if (this.undoStack.length > HISTORY_CAP) this.undoStack.shift();
		this.redoStack = [];
	}

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
	 * Live transient fracture fragments for the renderer (superset/prototype).
	 * Empty except mid-shatter; the renderer concatenates these after
	 * state.parts so shards draw with their inherited material. Not part of the
	 * edit model — a reset drops them (see fractureSystem.ts / handleReset).
	 */
	public getSimFragments(): ShapePart[] {
		// Show shards while the sim is live OR frozen on a win/loss (phase flips to
		// "paused" on end, GameCore end-of-run). The fragment bodies still exist in
		// the paused world and their consumed parents' bodies are destroyed, so
		// gating on "running" alone would leave holes where shards should sit.
		// simFragments is emptied on reset, so it's already [] outside a play.
		const phase = this.state.sim.phase;
		return phase === "running" || phase === "paused" ? this.simFragments : [];
	}

	/** Current canUndo/canRedo derived from stack depth. */
	undoRedoFlags(): { canUndo: boolean; canRedo: boolean } {
		return { canUndo: this.undoStack.length > 0, canRedo: this.redoStack.length > 0 };
	}

	private apply(command: Command): void {
		// Uneditable-robot enforcement (Wave 3a): a robot loaded with an
		// uneditable exposure blocks every editing mutation at the funnel
		// (mirrors Jaybit's !curRobotEditable guards). Non-mutating commands
		// (sim controls, selection, camera) and robot-replacing entry points
		// (newRobot/clearAll/import*) still pass.
		if (!this.curRobotEditable && isMutatingCommand(command)) return;
		// Snapshot the pre-mutation editable state for undo before any mutating
		// command runs (editing phase only). The handler that follows rebuilds
		// `edit`, so we fold the refreshed canUndo/canRedo flags in afterwards.
		const mutating = this.state.sim.phase === "editing" && isMutatingCommand(command);
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
		// selection changes still pass through. Which commands are blocked is
		// classified per-command in COMMAND_META (commandMeta.ts).
		if (this.state.sim.phase !== "editing" && COMMAND_META[command.type].blockedDuringSim) {
			return; // no-op during simulation
		}

		switch (command.type) {
			// Every case is a thin delegation into its domain module (see the
			// file-top map); each handler mutates core.state and marks changed.
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
			case "select":
				handleSelect(this, command);
				return;
			case "createShape":
				handleCreateShape(this, command);
				return;
			case "createPolygon":
				handleCreatePolygon(this, command);
				return;
			case "editPolygonPoint":
				handleEditPolygonPoint(this, command);
				return;
			case "addPolygonPoint":
				handleAddPolygonPoint(this, command);
				return;
			case "removePolygonPoint":
				handleRemovePolygonPoint(this, command);
				return;
			case "subtractShapes": {
				handleSubtractShapes(this, command.targetId, command.subtrahendIds);
				return;
			}
			case "createText":
				handleCreateText(this, command);
				return;
			case "deleteParts":
				handleDeleteParts(this, command);
				return;
			case "moveParts":
				handleMoveParts(this, command);
				return;
			// --- Part property setters (shape material/flags, triggers, joint /
			// thruster / cannon / bomb / text props) — one delegation for the whole
			// family; the per-command handlers live in partProps.ts. ---
			case "setColour":
			case "setDensity":
			case "setFragility":
			case "setFriction":
			case "setRestitution":
			case "setCollisionGroups":
			case "setShapeTrigger":
			case "setTriggerList":
			case "setCollide":
			case "setCameraFocus":
			case "setFixate":
			case "setFixedRotation":
			case "setLocked":
			case "setBorderOpacity":
			case "setVisualInSim":
			case "setScaleToZoom":
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
				applyPartPropsCommand(this, command);
				return;

			case "setSandboxSettings":
				handleSetSandboxSettings(this, command);
				return;

			case "play":
				// A normal Play is NEVER replay playback. Clear any lingering replay
				// session (e.g. left over from a finished/!stopped replay) so handlePlay
				// runs the live sim instead of driving the current robot's bodies from a
				// stale, mismatched sync-point stream (which crashed in syncReplay).
				this.replaySession = null;
				this.replayFocusBroken = false;
				handlePlay(this);
				return;
			case "pause":
				handlePause(this);
				return;
			case "reset":
				handleReset(this);
				return;
			case "step":
				handleStep(this, command.frames ?? 1);
				return;

			// --- replays ---
			case "playReplay":
				handlePlayReplay(this, command.data);
				return;
			case "viewReplayAgain":
				handleViewReplayAgain(this);
				return;
			case "stopReplay":
				handleStopReplay(this);
				return;
			case "replayKey":
				handleReplayKey(this, command.key);
				return;
			case "moveCameraDuringSim":
				handleMoveCameraDuringSim(this, command.drawXOff, command.drawYOff, command.scale);
				return;

			// --- live play-mode interaction ---
			case "keyInput":
				handleKeyInput(this, command.key, command.up);
				return;
			case "mouseJointStart":
				handleMouseJointStart(this, command.worldX, command.worldY);
				return;
			case "mouseJointMove":
				handleMouseJointMove(this, command.worldX, command.worldY);
				return;
			case "mouseJointEnd":
				handleMouseJointEnd(this);
				return;

			// --- tutorials ---
			case "loadTutorial":
				handleLoadTutorial(this, command.levelIndex);
				return;
			case "advanceTutorial":
				handleAdvanceTutorial(this, command.messageId);
				return;
			case "closeTutorial":
				handleCloseTutorial(this);
				return;
			// Rotate the selection about its centroid by `angle` radians. GameCanvas
			// feeds the incremental delta since the last pointer move.
			case "rotateParts":
				handleRotateParts(this, command);
				return;
			// Resize gesture lifecycle — faithful port of ControllerGame.scaleButton
			// (:3975) + RESIZING_SHAPES MouseDrag (:1553) + commit-on-up (:2070).
			case "resizeStart": {
				handleResizeStart(this, command.partIds);
				return;
			}
			case "resizeParts": {
				handleResizeApply(this, command.scaleFactor);
				return;
			}
			case "resizeEnd": {
				handleResizeEnd(this);
				return;
			}
			case "mirrorParts": {
				handleMirror(this, command.partIds, command.axis);
				return;
			}
			case "copyParts": {
				handleCopy(this, command.partIds);
				return;
			}
			case "cutParts": {
				handleCut(this, command.partIds);
				return;
			}
			case "pasteParts": {
				handlePaste(this, command.dx, command.dy);
				return;
			}
			case "movePartsToFront": {
				handleMoveToFront(this, command.partIds);
				return;
			}
			case "movePartsToBack": {
				handleMoveToBack(this, command.partIds);
				return;
			}
			case "createThrusters":
				handleCreateThrusters(this, command);
				return;
			case "createCannon":
				handleCreateCannon(this, command);
				return;
			case "createJoint":
				handleCreateJoint(this, command);
				return;
			case "startPrismaticJoint":
				handleStartPrismaticJoint(this, command);
				return;
			case "finishPrismaticJoint":
				handleFinishPrismaticJoint(this, command);
				return;
			case "cycleJointCandidate": {
				cycleJointCandidate(this);
				return;
			}
			case "finalizeJoint": {
				finalizePendingJoint(this, command.x, command.y);
				return;
			}
			case "cancelJointGesture": {
				cancelJointGesture(this);
				return;
			}
			// Group property edit (MultiActionsAction): run each sub-command through
			// the SAME per-command handler in order. apply() already pushed a single
			// history snapshot for the whole batch (isMutatingCommand("batch")), and dispatch()
			// coalesces the notify, so the group edit is one undo step + one emit. Each
			// sub still clamps per part; skip nested batch history by going through
			// applyCommand (not apply/dispatch).
			case "batch":
				for (const sub of command.commands) this.applyCommand(sub);
				return;
			case "undo":
				handleUndo(this);
				return;
			case "redo":
				handleRedo(this);
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
				handleZoom(this, ZOOM_IN_FACTOR);
				return;
			case "zoomOut":
				handleZoom(this, ZOOM_OUT_FACTOR);
				return;
			case "centerOnSelection":
				handleCenterOnSelection(this);
				return;
			case "panCamera":
				handlePanCamera(this, command.dx, command.dy, command.viewW, command.viewH);
				return;
			case "zoomCamera":
				handleZoomCamera(this, command.scaleFactor, command.focusX, command.focusY, command.viewW, command.viewH);
				return;
			// --- Challenge mode (sessions, conditions, restrictions, build
			// areas, play/edit switching) — one delegation for the family; the
			// per-command handlers live in challengeOps.ts. ---
			case "newChallenge":
			case "loadBuiltInChallenge":
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
				applyChallengeCommand(this, command);
				return;

			case "newRobot":
			case "clearAll":
				// File -> New Robot / Edit -> Clear All: drop editable robot parts, keep
				// terrain (ControllerGame.clearButton :4845). Editing-phase only (gated
				// by the no-op-during-sim switch above). Starting fresh unlocks an
				// uneditable loaded robot (curRobotEditable, Wave 3a).
				this.setRobotEditable(true);
				clearRobot(this);
				return;

			case "newSandbox": {
				// Menu "Sandbox Mode" / "Advanced Sandbox": a full fresh-controller
				// reset (legacy sandboxButton -> new ControllerSandbox). Drop every
				// prior session (challenge/tutorial/replay/history/running sim), then
				// restore the DEFAULT sandbox environment, terrain, and camera so no
				// leftover parts, settings, or tutorial dialog bleed in from the
				// previous mode. Passes through during a running sim (not a no-op).
				resetSessionForLoad(this);
				const fresh = createInitialState();
				for (const p of fresh.parts) p.id = ++this.nextId;
				this.state = {
					...this.state,
					parts: fresh.parts,
					// Entering a fresh (non-imported) sandbox defaults to engine 2
					// (Box2D 3 / box2d3-wasm) — the modern engine — rather than the
					// classic IB2 (2.0.2) baseline that createInitialState() carries for
					// tests. Imports keep their own engine; the UI preloads the wasm on
					// this transition so the first play uses it (else applyPlayBackend
					// falls back to the IB3 2.1a engine).
					sandbox: { ...fresh.sandbox, physicsEngine: 2 },
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
