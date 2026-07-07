// Sim runtime — the live Box2D world lifecycle and per-frame stepping.
//
// Extracted from GameCore's "Physics simulation" and "Mouse joint" sections:
// backend selection, world creation + contact wiring, play/pause/reset/step,
// live key input, the play-mode mouse joint, runtime fracturing, and the
// fresh-session teardown (resetSessionForLoad) every load entry point shares.
// Free functions over the CoreInternals seam (coreInternals.ts); GameCore's
// command switch delegates here.

import { b2MouseJointDef, b2Vec2, b2World } from "../Box2D";
import {
	getEngine2Backend,
	getEngine2Version,
	getPhysicsBackend,
	setCannonballs,
	setPhysicsBackend,
} from "../Parts/partGlobals";
import { box2d20Backend, box2d21Backend } from "./physics";
import { Bomb, markBombImpact } from "../Parts/Bomb";
import { Cannon } from "../Parts/Cannon";
import { JointPart } from "../Parts/JointPart";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { RevoluteJoint } from "../Parts/RevoluteJoint";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import { currentXY } from "./geometryEdit";
import { processTriggers, wireTriggers } from "./triggers";
import type { TriggerUserData } from "./triggers";
import { WaterSystem } from "./waterSystem";
import {
	REPLAY_MAX_CANNONBALLS,
	REPLAY_MAX_FRAMES,
	REPLAY_SYNC_FRAMES,
	addSyncPoint,
	createRecording,
	recordKeyPress,
} from "./replay";
import {
	challengeOver,
	checkIfPartsFit,
	conditionsContactAdded,
	getScore,
	resetConditions,
	updateConditions,
	wonChallenge,
} from "./challenge";
import { tutorialChallengeOver, tutorialFrameProgressKey } from "./tutorials";
import type { CoreInternals } from "./coreInternals";
import { applyReplayFrame, replayBodies, replayCannonballs, replayStateSnapshot, syncReplayState } from "./replayRuntime";

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

/**
 * Select the physics backend for the run about to start, BEFORE the world is
 * built and any Part is Init'd (P1.5b-2b). The engine int comes from the
 * replay being played back (a replay pins the engine it recorded — legacy
 * CE/Jaybit replays lack the field and default to 0) or, for a normal sim,
 * from the design's sandbox.physicsEngine.
 *
 *   0 = IB2 (Box2DFlash 2.0.2, src/Box2D)   — the classic engine + module default
 *   1 = IB3 (Box2DFlash 2.1a, src/Box2D21)
 *   2 = Box2D 3.x (box2d3-wasm)             — a WASM backend the UI PRELOADS and
 *       registers via registerEngine2Backend (partGlobals); used when ready,
 *       else falls back to engine 1 (nearest real engine) with a surfaced notice
 *       (E3-4). The core never statically imports it (check:core).
 *
 * Engine 0 is the module default that every teardown (reset / stopReplay /
 * resetSessionForLoad / view-again) restores via resetPhysicsBackend(), so it
 * needs no explicit set here — leaving the active backend untouched for engine
 * 0 also lets tests inject a custom backend (a spy) for engine-0 runs. Engines
 * 1/2 are set explicitly and undone on the next teardown, so nothing leaks
 * between sessions.
 */
export function applyPlayBackend(core: CoreInternals): void {
	const engine = core.replaySession
		? core.replaySession.data.physicsEngine ?? 0
		: core.state.sandbox.physicsEngine;
	// Box2D21Backend implements PhysicsBackend over 2.1a's b2Fixture shape handle,
	// structurally distinct from engine-0's b2Shape; handles are opaque by
	// contract (PhysicsBackend design), so present it under the active-backend
	// setter's type. box2d20Backend already matches, so needs no cast.
	const engine1 = box2d21Backend as unknown as Parameters<typeof setPhysicsBackend>[0];
	if (engine === 1) {
		setPhysicsBackend(engine1);
	} else if (engine === 2) {
		// Engine 2 (Box2D v3) is the async-loaded WASM backend the UI preloaded and
		// registered via registerEngine2Backend. Use it when ready; otherwise (still
		// loading / load failed) fall back to the nearest real engine (IB3 2.1a) and
		// tell the user (§C2, ENGINE-BOX2D3-PLAN.md E3-4).
		const e2 = getEngine2Backend();
		if (e2) {
			setPhysicsBackend(e2);
			// Replay determinism (§C3): v3 promises identical results only for a fixed
			// build. If a replay pins a box2d3-wasm version other than the one loaded,
			// surface a warning but still attempt playback.
			if (core.replaySession) {
				const pinned = core.replaySession.data.physicsEngineVersion;
				const current = getEngine2Version();
				if (pinned && current && pinned !== current) {
					core.emitMessage(
						`This replay was recorded on Box2D 3 (beta) v${pinned}; you have v${current}. Playback may differ.`,
					);
				}
			}
		} else {
			setPhysicsBackend(engine1);
			core.emitMessage("Box2D 3 (beta) is still loading — running on the IB3 (2.1a) engine.");
		}
	}
	// engine 0 (or any unknown value): leave the active backend as-is (the
	// teardown-restored default, box2d20Backend).
}

/**
 * Restore the module-default engine-0 backend (Box2DFlash 2.0.2) on every
 * world teardown so a design's engine-1/2 selection never leaks into the next
 * play, session, or test (P1.5b-2b).
 */
export function resetPhysicsBackend(): void {
	setPhysicsBackend(box2d20Backend);
}

/**
 * Free the live world through the backend that created it. Must run BEFORE
 * resetPhysicsBackend() in every teardown: engines 0/1 no-op (GC), but
 * engine 2's wasm world leaks in linear memory unless b2DestroyWorld runs.
 */
export function destroyLiveWorld(core: CoreInternals): void {
	if (core.state.world) getPhysicsBackend().destroyWorld(core.state.world);
}

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
export function createWorld(core: CoreInternals): b2World {
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
		// IB3 superset: horizontal gravity (IB2 had none, so this is 0 unless a
		// design/IB3 import set it) + the restitution combine mode.
		gravityX: core.state.sandbox.gravityX,
		gravityY: core.state.sandbox.gravity,
		doSleep: true,
		restitutionType: core.state.sandbox.restitutionType,
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
			if (core.challenge) {
				conditionsContactAdded(core.challenge, point, core.state.parts, core.cannonballs);
			}
			// Trigger dispatch (jaybit ControllerGame.ContactAdded :2462 ->
			// ProcessTriggers(ud1, ud2, true)).
			const cp = point as ContactPoint;
			// Bomb impact marking (IB3 TriggerSystem.Process :37-50): record the
			// live contact on any bomb shape's userData so
			// Bomb.CheckImpactDetonation can arm on NEW impacts next Update.
			markBombImpact(cp.shape1.GetUserData(), cp.shape2.GetUserData(), true);
			processTriggers(
				core.state.parts,
				world,
				cp.shape1.GetUserData() as TriggerUserData,
				cp.shape2.GetUserData() as TriggerUserData,
				true,
				(key, up, partIndex) => triggerKeyInput(core, key, up, partIndex),
			);
		},
		onRemove: (point): void => {
			// jaybit ControllerGame.ContactRemoved :1257 -> ProcessTriggers(..., false).
			const cp = point as ContactPoint;
			// Bomb impact unmarking (IB3 TriggerSystem.Process, contact-end path).
			markBombImpact(cp.shape1.GetUserData(), cp.shape2.GetUserData(), false);
			processTriggers(
				core.state.parts,
				world,
				cp.shape1.GetUserData() as TriggerUserData,
				cp.shape2.GetUserData() as TriggerUserData,
				false,
				(key, up, partIndex) => triggerKeyInput(core, key, up, partIndex),
			);
		},
		// Superset/prototype fracturing: the engine surfaces each solved contact's
		// impact (world point + engine-neutral relative normal speed); the fracture
		// system keeps the strongest per fragile shape this step (see
		// beginFrame/applyFractures in handleStep).
		onImpact: (impact): void => core.fractureSystem.recordImpact(impact),
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
 * createWorld hands a core-bound arrow of this to processTriggers.
 */
function triggerKeyInput(core: CoreInternals, key: number, up: boolean, partIndex: number): void {
	if (!up || core.replaySession || !core.recording) return;
	const part = core.state.parts[partIndex];
	if ((part instanceof TextPart && key === part.displayKey) || (part instanceof Cannon && key === part.fireKey)) {
		recordKeyPress(core.recording, core.state.sim.frame, key, partIndex);
	}
}

/**
 * play: create the world, snapshot each part's edit transform (for reset),
 * assign collision groups and Init every part into the world, then mark the
 * sim running. Mirrors ControllerGame.playButton() (ControllerGame.ts:2715):
 * SetCollisionGroup per part (:2758) then Init(world) (:2764). Resuming from a
 * paused state just flips the phase back to running — the world is kept.
 */
export function handlePlay(core: CoreInternals): void {
	if (core.state.sim.phase === "running") return;
	if (core.state.sim.phase === "paused") {
		core.state = { ...core.state, sim: { ...core.state.sim, phase: "running" } };
		core.markChanged();
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
	if (!core.replaySession) {
		// partsFit only applies in a challenge (checkIfPartsFit no-ops otherwise).
		const partsFit = core.challenge ? checkIfPartsFit(core.challenge, core.state.parts) : true;
		if (!partsFit) {
			core.emitMessage("You must fit your robot inside the starting box first!");
			return;
		}
	}

	// Fresh cannonball list for this run (ControllerGame.ts:2736), and point the
	// partGlobals cannonball sink at it so Cannon.CreateCannonball pushes the
	// spawned bodies into THIS array (Cannon.ts:252-253). Done for every play,
	// not just challenges, matching the legacy unconditional reset.
	core.cannonballs = [];
	setCannonballs(core.cannonballs as unknown[]);
	// Fresh fracture state for this run (superset/prototype).
	core.simFragments = [];
	core.fractureSystem.reset();

	// Challenge: reset every condition's isSatisfied before a fresh run and
	// clear any prior outcome/score (ControllerChallenge.playButton :52-59).
	if (core.challenge) {
		resetConditions(core.challenge);
		core.challenge.outcome = "playing";
		core.challenge.score = null;
	}

	// Choose the physics backend for this run BEFORE createWorld (which builds the
	// world through the active backend) and BEFORE any Part.Init below.
	applyPlayBackend(core);

	const world = createWorld(core);

	// Snapshot the pre-play camera so reset can restore the view after a run that
	// auto-panned/followed the robot (ControllerGame.playButton :2776-2777).
	core.cameraSnapshot = { ...core.state.camera };

	// Snapshot pre-play transforms so reset can restore them exactly.
	core.editSnapshots = core.state.parts.map((p) => {
		const xy = currentXY(p);
		const angle = p instanceof ShapePart ? p.angle : 0;
		return { part: p, x: xy.x, y: xy.y, angle };
	});

	// Assign a unique collision group per shape (ControllerGame.ts:2755-2760).
	for (const p of core.state.parts) p.checkedCollisionGroup = false;
	core.state.parts.forEach((p, i) => {
		if (p instanceof ShapePart) p.SetCollisionGroup(-(i + 1));
	});

	// Init shapes/text first (ControllerGame.ts:2764-2767), then joints and
	// thrusters (:2769-2773) — a JointPart's Init requires both its shapes to
	// already be initted (see FixedJoint.Init), so ordering matters.
	//
	// CRITICAL: the legacy play loop Inits ShapeParts in REVERSE allParts order
	// (`for (i = core.allParts.length; i >= 0; i--)`, ControllerGame.ts:2759-2761).
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
	for (let i = core.state.parts.length - 1; i >= 0; i--) {
		const p = core.state.parts[i];
		if (p instanceof ShapePart || p instanceof TextPart) p.Init(world);
	}
	for (const p of core.state.parts) {
		if (p instanceof JointPart || p instanceof Thrusters) p.Init(world);
	}

	// Trigger wiring pass (jaybit playButton :8760-8845): build each source
	// shape's dispatch table (targetPartIndex, action, slot) on its shape
	// userData from CSV token matching. The legacy interleaves this with the
	// two Init loops above; running it after ALL parts are Init'd is
	// equivalent (the pushed part indices index state.parts, our allParts).
	wireTriggers(core.state.parts);

	// Water (IB3 GameControl.playButton :4054 waterControl.Init() + :4110-4126
	// AddBody loop): build the water controller from the sandbox settings and
	// register every buoyant, non-destroyed ShapePart's body. Welded groups
	// share a b2Body — WaterSystem's added-set is the addedToWater guard, and
	// per-shape userData.isBuoyant handles mixed buoyant/non-buoyant groups.
	// DEVIATION: cannonballs spawned mid-sim are NOT added to the water (IB3
	// has no cannon; only ShapeParts ever join the controller).
	core.waterSystem = null;
	if (core.state.sandbox.water.enabled && !core.replaySession) {
		const ws = new WaterSystem(core.state.sandbox.water);
		ws.init(world);
		// (IB3's loop also skips IsDestroyed() parts; nothing is destroyed at
		// play time here — bodies destroyed later (bombs) are unlinked by
		// b2World.DestroyBody's controller cleanup.)
		for (const p of core.state.parts) {
			if (p instanceof ShapePart && p.buoyant) {
				ws.addBody(p.GetBody());
			}
		}
		core.waterSystem = ws;
	}

	// Replay recording / playback setup (ControllerGame.ts:2728-2746). During a
	// normal sim we seed fresh recording buffers (frame 0, +Infinity camera
	// sentinel). During playback (replaySession set) we reset the replay
	// cursors instead — the world is created but never stepped.
	if (core.replaySession) {
		core.replaySession.syncPointIndex = 0;
		core.replaySession.cameraMovementIndex = 0;
		core.replaySession.keyPressIndex = 0;
		core.recording = null;
	} else {
		// Record which engine this run ACTUALLY used so playback reproduces it on the
		// SAME backend (P1.5b-2b). Mirror applyPlayBackend's choice: engine 2 only
		// pins 2 when its WASM backend was registered/ready (else it fell back to 1);
		// engine 2 additionally records the box2d3-wasm build version so a replay
		// claims determinism only against the same build (§C3, E3-4).
		const requested = core.state.sandbox.physicsEngine;
		const e2ready = getEngine2Backend() != null;
		const engine = requested === 2 && e2ready ? 2 : requested === 1 || requested === 2 ? 1 : 0;
		const version = engine === 2 ? getEngine2Version() ?? undefined : undefined;
		core.recording = createRecording(core.state.camera.scale, engine, version);
	}
	core.tutorialWonFired = false;

	core.state = {
		...core.state,
		world,
		sim: { phase: "running", frame: 0 },
		replay: { ...core.state.replay, finished: false },
		// Seed the water surface read-model for the renderer.
		water: core.waterSystem ? core.waterSystem.surface() : null,
	};
	core.markChanged();
	core.syncChallenge();
	syncReplayState(core);
}

/** pause: stop stepping but keep the world alive (ControllerGame.pauseButton, :2796). */
export function handlePause(core: CoreInternals): void {
	if (core.state.sim.phase !== "running") return;
	core.state = { ...core.state, sim: { ...core.state.sim, phase: "paused" } };
	core.markChanged();
}

/**
 * reset: tear the world down, restore each part's pre-play edit transform, and
 * return to editing. Mirrors ControllerGame.resetButton() (ControllerGame.ts:2803):
 * UnInit every part (:2815) and go back to the pre-sim state.
 */
export function handleReset(core: CoreInternals): void {
	if (core.state.sim.phase === "editing") return;

	// Drop any active mouse-joint grab before tearing the world down (the joint
	// lives on the world, which UnInit/rebuild discards).
	core.mouseJoint = null;

	const world = core.state.world;
	if (world) {
		for (const p of core.state.parts) p.UnInit(world);
	}
	// Drop transient fracture fragments; the fractured originals re-Init on the
	// next play (they kept their state.parts slot — see ConsumeForFracture).
	core.simFragments = [];
	core.fractureSystem.reset();
	// Water system dies with the world (WaterControl.UnInit).
	core.waterSystem = null;
	// Restore the engine-0 backend so this run's engine selection can't leak
	// into the next play/session/test (P1.5b-2b).
	destroyLiveWorld(core);
	resetPhysicsBackend();

	// Restore the exact edit-space transform captured at play time.
	for (const snap of core.editSnapshots) {
		snap.part.Move(snap.x, snap.y);
		if (snap.part instanceof ShapePart) snap.part.angle = snap.angle;
	}
	core.editSnapshots = [];

	// Replay: reset recording buffers; playback ends only via stopReplay (reset
	// during editing is a no-op there), so leave replaySession alone here.
	core.recording = null;
	// Restore the pre-play camera so an auto-panned/followed run returns the view
	// to where the user left it (ControllerGame.resetButton :2813-2814).
	const camera = core.cameraSnapshot ?? core.state.camera;
	core.cameraSnapshot = null;
	core.state = {
		...core.state,
		parts: [...core.state.parts],
		camera,
		world: null,
		sim: { phase: "editing", frame: 0 },
		replay: replayStateSnapshot(core),
		water: null,
	};
	core.markChanged();

	// Challenge: clear the run outcome/score and reset condition flags so the
	// next play starts fresh (conditions are also reset on play :52-59).
	if (core.challenge) {
		core.challenge.outcome = null;
		core.challenge.score = null;
		resetConditions(core.challenge);
		core.cannonballs = [];
		core.syncChallenge();
	}

	// Tutorial milestones tied to the reset button (ControllerJumpbot.resetButton
	// -> 18 "reset"; ControllerCatapult.resetButton -> 37 "reset";
	// ControllerNewFeatures.Update sim-stopped -> 87 "simStopped").
	if (core.tutorialMachine) {
		core.notifyTutorial({ type: "progress", key: "reset" });
		core.notifyTutorial({ type: "progress", key: "simStopped" });
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
export function cameraFocusPart(core: CoreInternals): ShapePart | null {
	let part: ShapePart | null = null;
	for (const p of core.state.parts) {
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
export function handleCamera(core: CoreInternals): void {
	// Normal sim owns the camera; a native replay drives it purely from the
	// recorded stream (so skip focus-follow). An IB3 replay follows the focus
	// part live (its camera stream is sparse) until the recorded run breaks focus.
	if (core.replaySession) {
		if (!core.replaySession.data.followCameraFocus || core.replayFocusBroken) return;
	}
	const part = cameraFocusPart(core);
	if (!part) return;
	const body = part.GetBody();
	if (!body) return;
	const center = body.GetWorldCenter();
	const scale = core.state.camera.scale;
	const nx = center.x * scale;
	const ny = center.y * scale;
	if (isNaN(nx) || isNaN(ny)) return;
	if (nx !== core.state.camera.offsetX || ny !== core.state.camera.offsetY) {
		core.state = { ...core.state, camera: { ...core.state.camera, offsetX: nx, offsetY: ny } };
		core.markChanged();
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
export function handleKeyInput(core: CoreInternals, key: number, up: boolean): void {
	if (core.state.sim.phase !== "running") {
		// A key RELEASED while paused must still clear the parts' held control
		// flags (motor/thruster isKeyDown), or the release is lost and the key
		// "sticks" — driving the motor forever on resume. Cannon fire and text
		// toggle treat key-UP as their trigger ACTION, so those parts (and the
		// replay recording, which only covers their keys) stay running-only,
		// matching the legacy keyPress gate (:1885-1888).
		if (up && core.state.sim.phase === "paused") {
			const replaying = core.replaySession !== null;
			for (const p of core.state.parts) {
				if (p instanceof TextPart || p instanceof Cannon) continue;
				(p as unknown as { KeyInput?: (k: number, u: boolean, r: boolean) => void }).KeyInput?.(key, up, replaying);
			}
		}
		return;
	}
	const replaying = core.replaySession !== null;
	let recorded = false;
	for (const p of core.state.parts) {
		(p as unknown as { KeyInput?: (k: number, u: boolean, r: boolean) => void }).KeyInput?.(key, up, replaying);
		if (
			!recorded &&
			up &&
			!replaying &&
			((p instanceof TextPart && key === p.displayKey) || (p instanceof Cannon && key === p.fireKey))
		) {
			recorded = true;
			if (core.recording) recordKeyPress(core.recording, core.state.sim.frame, key);
		}
	}
	syncReplayState(core);
}

/**
 * GetBodyAtMouse (ControllerGame.ts:6964-6991): the topmost non-static,
 * non-undragable, non-piston body whose shape contains the cursor. Queries a
 * ±0.001 AABB, then TestPoint-confirms each candidate shape.
 */
export function bodyAtMouse(core: CoreInternals, worldX: number, worldY: number): import("../Box2D").b2Body | null {
	const world = core.state.world;
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
export function handleMouseJointStart(core: CoreInternals, worldX: number, worldY: number): void {
	if (core.state.sim.phase !== "running" || core.replaySession) return;
	// ControllerGame.ts:1776-1780 — during the running sim, mouse-dragging bodies
	// is permitted ONLY in the sandbox, or in a challenge whose author set
	// mouseDragAllowed. Tutorials (legacy controllerType "game") and drag-locked
	// challenges (e.g. Climb, which sets mouseDragAllowed=false) permit no dragging.
	// Per-part `undragable` is enforced separately below by bodyAtMouse.
	if (core.tutorialMachine) return;
	if (core.challenge && !core.challenge.challenge.mouseDragAllowed) return;
	const world = core.state.world;
	if (!world || core.mouseJoint) return;
	const body = bodyAtMouse(core, worldX, worldY);
	if (!body) return;
	const md = new b2MouseJointDef();
	md.body1 = world.m_groundBody;
	md.body2 = body;
	md.target.Set(worldX, worldY);
	md.maxForce = MOUSE_JOINT_MAX_FORCE_FACTOR * body.m_mass;
	md.timeStep = MOUSE_JOINT_TIME_STEP;
	core.mouseJoint = getPhysicsBackend().createJoint(world, md);
	getPhysicsBackend().wakeBody(body);
}

/**
 * mouseJointMove: retarget the active mouse joint to the cursor
 * (ControllerGame.ts:1798-1801). No-op if nothing is grabbed.
 */
export function handleMouseJointMove(core: CoreInternals, worldX: number, worldY: number): void {
	if (!core.mouseJoint) return;
	(core.mouseJoint as unknown as { SetTarget: (t: b2Vec2) => void }).SetTarget(new b2Vec2(worldX, worldY));
}

/**
 * mouseJointEnd: destroy the active mouse joint (ControllerGame.ts:1804-1808).
 */
export function handleMouseJointEnd(core: CoreInternals): void {
	const world = core.state.world;
	if (core.mouseJoint && world) {
		getPhysicsBackend().destroyJoint(world, core.mouseJoint);
	}
	core.mouseJoint = null;
}

/**
 * The live fragile-shape candidate list: editable shapes still in state.parts
 * PLUS already-live fragments (so a shard can re-shatter on a harder hit).
 */
export function fractureCandidates(core: CoreInternals): ShapePart[] {
	const candidates: ShapePart[] = [];
	for (const p of core.state.parts) if (p instanceof ShapePart) candidates.push(p);
	for (const f of core.simFragments) candidates.push(f);
	return candidates;
}

/**
 * Post-step shatter pass: apply the impacts the contact hook recorded DURING
 * this frame's steps. Consumed parents keep their state.parts slot (body
 * destroyed, restored on reset); fresh fragments join the transient
 * simFragments list. Never runs during replay playback.
 */
export function applySimFractures(core: CoreInternals, world: b2World): void {
	if (core.replaySession) return;
	const results = core.fractureSystem.applyFractures(world, getPhysicsBackend(), () => ++core.nextId);
	if (results.length === 0) return;

	// A shatter is not reproducible by the deterministic sync-point replay:
	// fracturing is OFF during playback, and consuming a parent destroys its body,
	// which shifts the position-ordered replayBodies() list captured in later sync
	// points (fragments live in simFragments, outside state.parts, and are never
	// recorded). Recording a run that fractured would desync on playback, so mark
	// this recording non-saveable — same guard the frame/cannonball caps use.
	if (core.recording) core.recording.canSave = false;

	const consumed = new Set<ShapePart>();
	const added: ShapePart[] = [];
	for (const r of results) {
		consumed.add(r.parent);
		for (const f of r.fragments) added.push(f);
	}
	// Drop any consumed fragment from the live list; append new ones.
	core.simFragments = core.simFragments.filter((f) => !consumed.has(f)).concat(added);
	// Fragments live OUTSIDE state.parts, so the play-time water AddBody loop
	// never saw them: register buoyant fragment bodies (fragments inherit the
	// parent's buoyant flag) with the live controller here so debris from a
	// floating shape keeps floating. Consumed/culled fragment bodies are
	// unlinked by b2World.DestroyBody's controller-edge cleanup (see the
	// waterSystem field doc), so no removal pass is needed.
	if (core.waterSystem) {
		for (const f of added) {
			if (f.buoyant) core.waterSystem.addBody(f.GetBody());
		}
	}
	// Rebuild parts so the (now body-less) consumed originals re-render as gone
	// and the store re-reads. The parts themselves are unchanged objects; the
	// new array reference triggers the reactive snapshot.
	core.state = { ...core.state, parts: [...core.state.parts] };
	core.markChanged();
}

/**
 * step: advance the world by `frames` (default 1). Each frame does the two
 * Box2D sub-steps the legacy Update() loop runs (ControllerGame.ts:584-585):
 * a warm-up Step(1/60, 5) then Step(1/60, 10). After stepping, sync each
 * ShapePart's centerX/centerY/angle from its body so the renderer (which draws
 * from those fields via GetVertices/centerX) shows the live body pose.
 */
export function handleStep(core: CoreInternals, frames: number): void {
	const world = core.state.world;
	if (core.state.sim.phase !== "running" || !world) return;

	let frame = core.state.sim.frame;
	let ended = false;
	let replayFinished = false;
	for (let f = 0; f < frames; f++) {
		if (core.replaySession) {
			// PLAYBACK: sim-FREE. Drive bodies from sync points + splines and apply
			// recorded camera/key events for this frame (ControllerGame.HandleKey
			// :1182-1186 -> Replay.Update). The world is NOT stepped. frame still
			// advances one logical frame per tick.
			// applyReplayFrame already advanced the replay cursors and returns the
			// same tick — read `done` from it rather than calling replayUpdate again
			// (a second call re-consumes sync/keyPress/camera entries and desyncs).
			const tick = applyReplayFrame(core, frame);
			// IB3 replays follow the camera-focus part live (no-op for native
			// replays / after focus breaks — see handleCamera's replay guard).
			handleCamera(core);
			frame++;
			if (tick?.done) {
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
		handleCamera(core);
		for (const p of core.state.parts) {
			(p as unknown as { Update?: (w: b2World) => void }).Update?.(world);
		}
		// A bomb detonating (in the Update loop above) destroys its body — or
		// its fixture off a welded body — shifting the position-ordered
		// replayBodies() list captured in later sync points: the same
		// non-reproducibility as a fracture (see applySimFractures), so mark
		// the recording non-saveable.
		if (core.recording && core.recording.canSave) {
			for (const p of core.state.parts) {
				if (p instanceof Bomb && p.IsDestroyed()) {
					core.recording.canSave = false;
					break;
				}
			}
		}
		for (const p of core.state.parts) {
			if (p instanceof RevoluteJoint || p instanceof PrismaticJoint) p.CheckForBreakage(world);
		}
		// Capture a sync point every REPLAY_SYNC_FRAMES BEFORE stepping
		// (ControllerGame.ts:578), then the two Box2D sub-steps.
		if (core.recording && frame % REPLAY_SYNC_FRAMES === 0) {
			addSyncPoint(core.recording, frame, replayBodies(core), replayCannonballs(core));
		}
		// Superset/prototype fracturing: arm the shatter watcher BEFORE stepping so
		// the contact hook (onImpact) can attribute each solved contact's impact to
		// a fragile shape; then the two Box2D sub-steps feed those impacts; then
		// applySimFractures shatters over-threshold shapes at their contact point.
		// Skipped during replay playback (deterministic sync-point replay mustn't
		// diverge). state.parts AND live fragments are eligible (a shard re-shatters).
		if (!core.replaySession) core.fractureSystem.beginFrame(fractureCandidates(core), getPhysicsBackend());
		getPhysicsBackend().step(world, STEP_DT, STEP_ITERATIONS_WARMUP);
		getPhysicsBackend().step(world, STEP_DT, STEP_ITERATIONS);
		applySimFractures(core, world);
		frame++;
		// Replay save cap (ControllerGame.ts:585).
		if (core.recording && (frame >= REPLAY_MAX_FRAMES || core.cannonballs.length > REPLAY_MAX_CANNONBALLS)) {
			core.recording.canSave = false;
		}

		// Tutorial per-frame milestones (H1) + physics win (H2). The base
		// tutorials (Tank/Shapes/Car/Jumpbot/Dumpbot/Catapult) win via a
		// per-frame body-position check in their ChallengeOver(); the sandbox
		// tutorials (RubeGoldberg/NewFeatures) also fire dialog milestones from
		// a per-frame position check in Update() (dialog 81 / 89). Both are
		// evaluated here each non-replay sim frame while a tutorial is active,
		// exactly where the legacy Update()/ChallengeOver() ran.
		if (core.tutorialMachine) {
			tutorialFrameProgress(core);
			if (!core.tutorialWonFired && tutorialChallengeOver(core.tutorialMachine.levelIndex, core.state.parts)) {
				// Win SFX + advance to the win dialog + mark the level done
				// (ControllerGame.ts:738-772 pauses & records; notifyTutorial({won})
				// writes levelsDone[levelIndex] and shows the win dialog).
				core.emitSound("won");
				core.notifyTutorial({ type: "won" });
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
		if (core.challenge) {
			updateConditions(core.challenge, core.state.parts, core.cannonballs);
			if (challengeOver(core.challenge)) {
				// ControllerGame :743 shows the score window only when actually WON;
				// otherwise (an immediate loss) it's a failure. GetScore uses the
				// frame counter at the moment of win (:749-751).
				if (wonChallenge(core.challenge)) {
					core.challenge.outcome = "won";
					core.challenge.score = getScore(frame);
					// Win SFX (ControllerGame.ts:751 winSound).
					core.emitSound("won");
				} else {
					core.challenge.outcome = "failed";
					core.challenge.score = null;
					// Loss SFX (ControllerGame.ts:770 loseSound).
					core.emitSound("lost");
				}
				ended = true;
				break;
			}
		}
	}

	// The bodies now hold the live transforms; Draw.DrawWorld reads them via
	// GetBody().GetXForm() (Draw.ts:456), so no part-field sync is needed here.
	core.state = {
		...core.state,
		// On a win/loss the base loop pauses the sim (ControllerGame.ts:740).
		// Replay playback also pauses once it reaches numFrames (Replay.Update
		// -> pauseButton, ControllerGame.ts:1183-1184).
		sim: { phase: ended ? "paused" : "running", frame },
		replay: {
			...core.state.replay,
			frame,
			finished: core.state.replay.finished || replayFinished,
			// Propagate a mid-run canSave flip (fracture / bomb / caps) to the
			// read-model so the UI can grey out Save Replay.
			canSave: core.recording ? core.recording.canSave : core.state.replay.canSave,
		},
		// Refresh the water surface read-model (tide offset/tilt + live waves
		// animate per controller step inside world.Step).
		water: core.waterSystem ? core.waterSystem.surface() : core.state.water,
	};
	core.markChanged();
	if (core.challenge) core.syncChallenge();

	// Tutorial win trigger: the base loop sets wonChallenge when ChallengeOver()
	// first returns true (ControllerGame.ts:738-739); the tutorial's Update then
	// shows its win dialog (e.g. ControllerTank.Update :309-313). We fire it via
	// the challenge outcome when a tutorial+challenge is active.
	if (core.tutorialMachine && core.challenge && core.challenge.outcome === "won" && !core.tutorialWonFired) {
		core.notifyTutorial({ type: "won" });
	}
}

/**
 * Per-frame tutorial dialog milestones driven by a body-position check
 * (ControllerRubeGoldberg.Update dialog 81 / ControllerNewFeatures.Update
 * dialog 89). Evaluated each running-sim frame while a tutorial is active;
 * the predicate itself (tutorials.tutorialFrameProgressKey) is pure.
 */
export function tutorialFrameProgress(core: CoreInternals): void {
	const machine = core.tutorialMachine;
	if (!machine) return;
	const key = tutorialFrameProgressKey(machine.levelIndex, core.state.parts);
	if (key) core.notifyTutorial({ type: "progress", key });
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
export function resetSessionForLoad(core: CoreInternals): void {
	// Tear down a live world so no running bodies survive the switch (mirrors
	// handleReset's UnInit loop). editSnapshots would restore stale transforms,
	// so drop them too.
	const world = core.state.world;
	if (world) {
		for (const p of core.state.parts) p.UnInit(world);
	}
	core.mouseJoint = null;
	core.waterSystem = null;
	// Restore the engine-0 backend so a prior run's engine selection can't leak
	// across a session switch / import (P1.5b-2b).
	destroyLiveWorld(core);
	resetPhysicsBackend();
	core.editSnapshots = [];
	core.cameraSnapshot = null;
	core.recording = null;
	core.replaySession = null;
	core.cannonballs = [];
	core.challenge = null;
	core.tutorialMachine = null;
	core.tutorialWonFired = false;
	core.undoStack = [];
	core.redoStack = [];
	core.curRobotEditable = true;

	core.state = {
		...core.state,
		world: null,
		sim: { phase: "editing", frame: 0 },
		replay: { recording: false, playing: false, frame: 0, numFrames: null, canSave: true, finished: false },
		water: null,
		tutorial: null,
		challenge: null,
		conditionDraft: null,
		jointGesture: null,
		edit: {
			...core.state.edit,
			selection: [],
			selectedPart: null,
			tool: "select",
			editable: true,
			canUndo: false,
			canRedo: false,
		},
	};
	core.markChanged();
}
