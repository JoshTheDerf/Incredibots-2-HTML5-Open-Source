// Replay runtime — recording buffers + sim-free playback.
//
// Extracted from GameCore's "Replay recording / playback" and "Replay command
// handlers" sections. See docs/PORT-SPEC-tutorials-replays.md §B and
// src/core/replay.ts. The replayBodies order below is the SINGLE source of
// truth used for both recording (AddSyncPoint) and playback (SyncReplay/
// SyncReplay2) — it must match the legacy dedup-by-body iteration over
// non-static ShapeParts (:797-808). Free functions over the CoreInternals
// seam; GameCore's command switch delegates here.

import { getPhysicsBackend } from "../Parts/partGlobals";
import { Cannon } from "../Parts/Cannon";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { SandboxSettings } from "../Game/SandboxSettings";
import { applyWaterState } from "./waterSystem";
import type { GameState } from "./GameState";
import {
	type BodyLike,
	type ReplayData,
	type ReplaySyncPoint,
	createReplaySession,
	finalizeReplay,
	moveCameraForReplay,
	recordCameraMovement,
	recordKeyPress,
	replayUpdate,
	syncReplay,
	syncReplay2,
} from "./replay";
import type { ReplayRobot } from "./replaySerialization";
import type { IB3ReplayData } from "./ib3Import";
import type { CoreInternals } from "./coreInternals";
import { destroyLiveWorld, handlePlay, resetPhysicsBackend } from "./simRuntime";

/**
 * The deduped, ordered list of live bodies replay syncs against: every
 * non-static ShapePart body, in parts order, deduped by body identity
 * (ControllerGame.AddSyncPoint :797-808 / SyncReplay :968-977).
 */
export function replayBodies(core: CoreInternals): BodyLike[] {
	const bodies: BodyLike[] = [];
	const seen = new Set<unknown>();
	for (const p of core.state.parts) {
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
export function replayCannonballs(core: CoreInternals): BodyLike[] {
	return core.cannonballs as BodyLike[];
}

/** Project the replay read-model into state.replay. */
export function replayStateSnapshot(core: CoreInternals): GameState["replay"] {
	return {
		recording: core.recording !== null && !core.replaySession,
		playing: core.replaySession !== null,
		frame: core.state.sim.frame,
		numFrames: core.replaySession ? core.replaySession.data.numFrames : null,
		canSave: core.recording ? core.recording.canSave : true,
		finished: core.state.replay.finished,
	};
}

export function syncReplayState(core: CoreInternals): void {
	core.state = { ...core.state, replay: replayStateSnapshot(core) };
	core.markChanged();
}

/**
 * Apply one playback frame's replay instructions (Replay.Update -> the
 * ControllerGame apply methods). Camera movements set the camera state; the
 * body sync hard-sets (SyncReplay) or spline-interpolates (SyncReplay2); key
 * presses would fire text/cannon parts (KeyInput) — in the headless core we
 * forward them to each part's KeyInput so text/cannon parts react.
 */
export function applyReplayFrame(core: CoreInternals, frame: number): ReturnType<typeof replayUpdate> | null {
	if (!core.replaySession) return null;
	const tick = replayUpdate(core.replaySession, frame);

	// Camera (MoveCameraForReplay :777-790).
	let cam = { drawXOff: core.state.camera.offsetX, drawYOff: core.state.camera.offsetY, scale: core.state.camera.scale };
	for (const mv of tick.cameraMovements) {
		cam = moveCameraForReplay(mv, cam);
		// IB3: a brokeFocus movement ends live focus-following (Replay.SyncCamera).
		if (mv.brokeFocus) core.replayFocusBroken = true;
	}
	if (
		cam.drawXOff !== core.state.camera.offsetX ||
		cam.drawYOff !== core.state.camera.offsetY ||
		cam.scale !== core.state.camera.scale
	) {
		core.state = {
			...core.state,
			camera: { offsetX: cam.drawXOff, offsetY: cam.drawYOff, scale: cam.scale },
		};
		core.markChanged();
	}

	// Body sync (SyncReplay / SyncReplay2). The world is frozen — we hard-set
	// or interpolate bodies straight from the recorded sync points.
	const bodies = replayBodies(core);
	const cannonballs = replayCannonballs(core);
	// Hard-set the body transform through the engine seam: the method name
	// differs per backend (SetXForm / SetPositionAndAngle / v3 SetTransform), so
	// playback works on whichever engine the replay recorded (engines 0/1/2) —
	// not just the 2.0.2 SetXForm the old duck-typed call assumed.
	const setXf = (body: BodyLike, x: number, y: number, angle: number): void => {
		getPhysicsBackend().setBodyTransform(body as never, x, y, angle);
	};
	if (tick.sync) {
		if (tick.sync.kind === "hard") {
			syncReplay(tick.sync.syncPoint, bodies, cannonballs, setXf);
		} else if (core.replaySession.splines) {
			syncReplay2(
				tick.sync.segmentIndex,
				tick.sync.syncPoint1,
				tick.sync.syncPoint2,
				frame,
				core.replaySession.splines,
				bodies,
				cannonballs,
				setXf,
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
			const p = core.state.parts[kp.partIndex] as
				| { KeyInput?: (k: number, up: boolean, replay: boolean) => void }
				| undefined;
			p?.KeyInput?.(kp.key, true, true);
			continue;
		}
		for (const p of core.state.parts) {
			(p as unknown as { KeyInput?: (k: number, up: boolean, replay: boolean) => void }).KeyInput?.(kp.key, true, true);
		}
	}
	return tick;
}

/**
 * playReplay: begin sim-FREE playback of a decoded replay. Sets up the
 * playback session (splines precomputed) then enters the running phase like
 * playButton — but with playingReplay set, so handleStep drives bodies from
 * sync points instead of stepping the world (ControllerGame.ts:2737-2746).
 */
export function handlePlayReplay(core: CoreInternals, data: ReplayData): void {
	// Only from editing (mirrors playButton's simStarted gate).
	if (core.state.sim.phase !== "editing") return;
	// A native replay's sync points are already compacted to the live body order,
	// so its session (and splines) can be built up front. An IB3 replay's tracks
	// are per-shape and can only be compacted once the bodies exist, so its
	// session starts with empty sync points (splines null) and is rebuilt after
	// handlePlay below. createReplaySession tolerates empty sync points.
	const ib3 = core.ib3ReplayTracks;
	core.replayFocusBroken = false;
	core.replaySession = createReplaySession(data);
	core.state = { ...core.state, replay: { ...core.state.replay, finished: false } };
	handlePlay(core);
	if (ib3) {
		// Bodies now exist: compact the per-shape IB3 tracks into the live body
		// order (replayBodies) and rebuild the session with real splines.
		data.syncPoints = compactIB3SyncPoints(core, ib3);
		core.replaySession = createReplaySession(data);
		core.ib3ReplayTracks = null;
	}
}

/**
 * The representative ShapePart for each live replay body, in the SAME order as
 * replayBodies() (first non-static shape of each distinct body, parts order).
 * IB3 recorded the real body pose at that same first-shape index, so an IB3
 * track keyed to this representative carries the real (non-placeholder) pose.
 */
export function replayBodyReps(core: CoreInternals): ShapePart[] {
	const reps: ShapePart[] = [];
	const seen = new Set<unknown>();
	for (const p of core.state.parts) {
		if (p instanceof ShapePart && !p.isStatic) {
			const body = p.GetBody();
			if (body && !seen.has(body)) {
				seen.add(body);
				reps.push(p);
			}
		}
	}
	return reps;
}

/**
 * Compact IB3 per-shape recorded tracks into this app's body-indexed sync
 * points: for each live body (via its representative shape) read that shape's
 * recorded position/angle at each sync frame. Bodies without a track (none in
 * practice) get a static placeholder. Cannonballs aren't in IB3 sync points.
 */
export function compactIB3SyncPoints(core: CoreInternals, tracks: IB3ReplayData): ReplaySyncPoint[] {
	const reps = replayBodyReps(core);
	const out: ReplaySyncPoint[] = [];
	for (let k = 0; k < tracks.syncFrames.length; k++) {
		const positions: { x: number; y: number }[] = [];
		const angles: number[] = [];
		for (const sp of reps) {
			const tr = tracks.trajectories.get(sp);
			positions.push(tr ? tr.positions[k] : { x: 0, y: 0 });
			angles.push(tr ? tr.angles[k] : 0);
		}
		out.push({ frame: tracks.syncFrames[k], positions, angles, cannonballPositions: [] });
	}
	return out;
}

/**
 * viewReplayAgain: restart the current replay from frame 0 (PostReplayWindow
 * "View Again!"). Resets the world + cursors and plays again.
 */
export function handleViewReplayAgain(core: CoreInternals): void {
	if (!core.replaySession) return;
	core.replayFocusBroken = false;
	// Tear the current world down (like reset) but keep the replay session.
	if (core.state.world) {
		for (const p of core.state.parts) p.UnInit(core.state.world);
	}
	// Restore engine-0; handlePlay below re-selects from the replay's engine.
	destroyLiveWorld(core);
	resetPhysicsBackend();
	for (const snap of core.editSnapshots) {
		snap.part.Move(snap.x, snap.y);
		if (snap.part instanceof ShapePart) snap.part.angle = snap.angle;
	}
	core.editSnapshots = [];
	core.state = {
		...core.state,
		parts: [...core.state.parts],
		world: null,
		sim: { phase: "editing", frame: 0 },
		replay: { ...core.state.replay, finished: false },
	};
	handlePlay(core);
}

/**
 * stopReplay: end playback and return to editing (PostReplayWindow "Stop
 * Replay"). Clears the replay session and tears the world down.
 */
export function handleStopReplay(core: CoreInternals): void {
	if (!core.replaySession) return;
	core.replaySession = null;
	const world = core.state.world;
	if (world) {
		for (const p of core.state.parts) p.UnInit(world);
	}
	core.waterSystem = null;
	// Restore the engine-0 backend on teardown (P1.5b-2b).
	destroyLiveWorld(core);
	resetPhysicsBackend();
	for (const snap of core.editSnapshots) {
		snap.part.Move(snap.x, snap.y);
		if (snap.part instanceof ShapePart) snap.part.angle = snap.angle;
	}
	core.editSnapshots = [];
	core.state = {
		...core.state,
		parts: [...core.state.parts],
		world: null,
		sim: { phase: "editing", frame: 0 },
		replay: { recording: false, playing: false, frame: 0, numFrames: null, canSave: true, finished: false },
		water: null,
	};
	core.markChanged();
}

/**
 * replayKey: a text-display / cannon-fire key at the current frame. During a
 * normal (recording) sim this both fires the key on parts AND records it into
 * the stream (ControllerGame.keyInput :1868-1883 — but only for text/cannon
 * keys). During playback it is applied but NOT recorded.
 */
export function handleReplayKey(core: CoreInternals, key: number): void {
	if (core.state.sim.phase !== "running") return;
	// Fire the key on every part (KeyInput).
	for (const p of core.state.parts) {
		(p as unknown as { KeyInput?: (k: number, up: boolean, replay: boolean) => void }).KeyInput?.(
			key,
			true,
			core.replaySession !== null,
		);
	}
	// Record ONLY text-display / cannon-fire keys, and only when NOT replaying
	// (matches the legacy `recorded` guard — at most one per call).
	if (core.recording && !core.replaySession) {
		let recorded = false;
		for (const p of core.state.parts) {
			if (recorded) break;
			if (p instanceof TextPart && key === p.displayKey) recorded = true;
			else if (p instanceof Cannon && key === p.fireKey) recorded = true;
		}
		if (recorded) recordKeyPress(core.recording, core.state.sim.frame, key);
	}
	syncReplayState(core);
}

/**
 * moveCameraDuringSim: record a camera pan/zoom during a running sim
 * (ControllerGame.ts:1837-1842). Also updates the live camera state so the
 * view follows. No-op during playback (the replay owns the camera then).
 */
export function handleMoveCameraDuringSim(core: CoreInternals, drawXOff: number, drawYOff: number, scale: number): void {
	if (core.state.sim.phase !== "running" || core.replaySession) return;
	if (core.recording) {
		recordCameraMovement(core.recording, core.state.sim.frame, drawXOff, drawYOff, scale);
	}
	core.state = { ...core.state, camera: { offsetX: drawXOff, offsetY: drawYOff, scale } };
	core.markChanged();
}

/** Shared head of the replay string exporter: replay + bundled robot. */
export function prepareReplayForExport(core: CoreInternals): { data: ReplayData; robot: ReplayRobot } | null {
	const data = exportReplayData(core);
	if (!data) return null;
	// Bundle the current robot (non-sandbox parts) + sandbox settings, matching
	// Database.ExportReplay which packs the replay AND the robot it was run with.
	const robotParts = core.state.parts.filter((p) => !(p as { isSandbox?: boolean }).isSandbox);
	const s = core.state.sandbox;
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
	settings.physicsEngine = s.physicsEngine;
	settings.groundStyle = s.groundStyle;
	settings.gravityX = s.gravityX;
	settings.restitutionType = s.restitutionType;
	return { data, robot: { parts: robotParts, settings } };
}

/**
 * Finalize the current recording into a serializable ReplayData
 * (ControllerGame.ts:5354-5360). Returns null if there is no active recording.
 * A pure read — not a Command.
 */
export function exportReplayData(core: CoreInternals): ReplayData | null {
	if (!core.recording) return null;
	// A recording marked non-saveable (fracture, bomb detonation, or the
	// frame/cannonball caps) would desync or crash on playback — refuse the
	// export the same way the no-recording case does. state.replay.canSave
	// mirrors the flag for the UI.
	if (!core.recording.canSave) return null;
	return finalizeReplay(core.recording, core.state.sim.frame);
}
