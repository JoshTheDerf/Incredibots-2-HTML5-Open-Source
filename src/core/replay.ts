// Deterministic replay record + playback — a faithful, node-clean port of the
// legacy replay mechanism.
//
// Sources (see docs/PORT-SPEC-tutorials-replays.md §B):
//   - src/Game/Replay.ts, src/Game/ReplaySyncPoint.ts, src/Game/CameraMovement.ts,
//     src/Game/KeyPress.ts
//   - src/Game/ControllerGame.ts: AddSyncPoint (:792), ComputeReplaySplines (:822),
//     SyncReplay (:965), SyncReplay2 (:984), MoveCameraForReplay (:777), the
//     play-start reset (:2728) and the per-frame step loop (:576).
//
// DETERMINISM CONTRACT (do not "improve"):
//   - Recording captures THREE parallel streams while NOT playing a replay:
//     cameraMovements (pan/zoom), keyPresses (ONLY TextPart.displayKey /
//     Cannon.fireKey), and syncPoints (body XForms) every REPLAY_SYNC_FRAMES.
//   - The sim advances the world twice per frame: Step(1/60,5) then Step(1/60,10).
//     Motor/piston control keys are NOT recorded — parts poll input each frame,
//     so those are reconstructed from the deterministic sim, not from the stream.
//   - Playback is sim-FREE: the world is NOT stepped. Bodies are hard-set from
//     sync points (SetXForm) at/after a sync frame, or interpolated between two
//     sync points with a precomputed natural cubic spline. frameCounter still
//     advances one logical frame per tick.
//   - The FIRST camera movement uses +Infinity for x/y as a sentinel meaning
//     "keep the current pan" (MoveCameraForReplay skips the pan when x==+Infinity).
//
// This module is Pixi-free and DOM-free so the headless core (and tests) can
// record + replay without a renderer.

import { Util } from "../General/Util";

/** Every 3 frames a sync point is captured (ControllerGameGlobals.ts:39). */
export const REPLAY_SYNC_FRAMES = 3;

/** Two Box2D sub-steps per frame, both dt=1/60 (ControllerGame.ts:579-580). */
export const STEP_DT = 1 / 60;
export const STEP_ITERATIONS_WARMUP = 5;
export const STEP_ITERATIONS = 10;

/**
 * Replays are capped: recording is no longer saveable past 9000 frames (150s)
 * or 500 cannonballs (ControllerGame.ts:585). We keep recording state so a
 * playback can still run, but flag canSave false.
 */
export const REPLAY_MAX_FRAMES = 9000;
export const REPLAY_MAX_CANNONBALLS = 500;

/** The version tag written into every exported replay (Database.ts:121). */
export const VERSION_STRING_FOR_REPLAYS = "0.03";

/** A recorded pan/zoom at a frame (src/Game/CameraMovement.ts). */
export interface CameraMovement {
	frame: number;
	/** draw x-offset in screen px; +Infinity means "keep current pan". */
	x: number;
	/** draw y-offset in screen px; +Infinity means "keep current pan". */
	y: number;
	/** physScale (world→screen scale) at capture time. */
	scale: number;
}

/**
 * A recorded text-display / cannon-fire key at a frame (src/Game/KeyPress.ts).
 * `partIndex` present marks a TriggerPress (Jaybit Game/TriggerPress.as; the
 * port keeps these as plain records): the key was fired BY A TRIGGER on the part at that
 * index of the play-time parts array, and playback routes the KeyInput to
 * exactly that one part instead of fanning out to every part bound to the key.
 * Serialization (Wave 3a): after `frame:int, key:int`, a TriggerPress writes
 * sentinel -2 then partIndex (Database.as:3111-3114 / 1880-1902).
 */
export interface KeyPress {
	frame: number;
	key: number;
	partIndex?: number;
}

/** A 2-component position tuple (Util.Vector shape). */
export interface Vec2Like {
	x: number;
	y: number;
}

/**
 * One captured sim frame's body poses (src/Game/ReplaySyncPoint.ts): parallel
 * arrays of non-static ShapePart body positions + angles, plus every cannonball
 * position, in a stable (dedup-by-body) order.
 */
export interface ReplaySyncPoint {
	frame: number;
	positions: Vec2Like[];
	angles: number[];
	cannonballPositions: Vec2Like[];
}

/**
 * The full serialized replay: three parallel streams + a frame count + version.
 * Mirrors src/Game/Replay.ts; the mutable cursors are re-created per playback.
 */
export interface ReplayData {
	cameraMovements: CameraMovement[];
	keyPresses: KeyPress[];
	syncPoints: ReplaySyncPoint[];
	numFrames: number;
	version: string;
}

/**
 * A precomputed natural-cubic-spline coefficient set, shaped
 * [coeff 0..3][segment][bodyIndex] (ControllerGame.ts:958-962). Evaluated at
 * (frame - segmentStartFrame) to interpolate a body between two sync points.
 */
export type SplineSet = number[][][];

/** Live recording buffers held on the core while a non-replay sim runs. */
export interface RecordingBuffers {
	cameraMovements: CameraMovement[];
	keyPresses: KeyPress[];
	syncPoints: ReplaySyncPoint[];
	/** false once frame>=9000 or cannonballs>500 (ControllerGame.ts:585). */
	canSave: boolean;
}

/**
 * Fresh recording buffers seeded exactly like ControllerGame.playButton's
 * play-start reset (ControllerGame.ts:2730-2735): the first camera movement is
 * the +Infinity/+Infinity "keep current pan" sentinel at frame 0.
 */
export function createRecording(physScale: number): RecordingBuffers {
	return {
		cameraMovements: [
			{ frame: 0, x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY, scale: physScale },
		],
		keyPresses: [],
		syncPoints: [],
		canSave: true,
	};
}

/**
 * Minimal body handle the sync helpers need (a Box2D b2Body). Typed structurally
 * so this module never imports the Box2D concretes (keeps it trivially pure).
 */
export interface BodyLike {
	GetPosition(): Vec2Like;
	GetAngle(): number;
	SetXForm(position: Vec2Like, angle: number): boolean;
}

/**
 * AddSyncPoint (ControllerGame.ts:792-820): capture position+angle for each
 * distinct non-static body plus every cannonball position, but only if the last
 * sync point isn't already at this frame. `bodies` must already be deduped and
 * in the stable ShapePart iteration order the caller uses for playback.
 */
export function addSyncPoint(
	rec: RecordingBuffers,
	frame: number,
	bodies: BodyLike[],
	cannonballs: BodyLike[],
): void {
	const sp = rec.syncPoints;
	if (sp.length !== 0 && frame === sp[sp.length - 1].frame) return;
	const point: ReplaySyncPoint = {
		frame,
		positions: bodies.map((b) => {
			const p = b.GetPosition();
			return { x: p.x, y: p.y };
		}),
		angles: bodies.map((b) => b.GetAngle()),
		cannonballPositions: cannonballs.map((b) => {
			const p = b.GetPosition();
			return { x: p.x, y: p.y };
		}),
	};
	sp.push(point);
}

/**
 * Record a text-display / cannon-fire key press (ControllerGame.keyInput
 * :1868-1883). The caller has already verified the key belongs to a TextPart's
 * displayKey or a Cannon's fireKey and that we're NOT playing a replay. At most
 * one KeyPress per keyInput call (the legacy `recorded` guard). Passing
 * `partIndex` records a TriggerPress (a trigger-fired cannon/text event,
 * ControllerGame.keyInput :2246 `new TriggerPress(frameCounter, key, partIndex)`).
 */
export function recordKeyPress(rec: RecordingBuffers, frame: number, key: number, partIndex?: number): void {
	if (partIndex != null) rec.keyPresses.push({ frame, key, partIndex });
	else rec.keyPresses.push({ frame, key });
}

/**
 * Record a camera pan/zoom (ControllerGame.ts:1837-1842) — pushed only when the
 * pan actually changed.
 */
export function recordCameraMovement(
	rec: RecordingBuffers,
	frame: number,
	drawXOff: number,
	drawYOff: number,
	physScale: number,
): void {
	rec.cameraMovements.push({ frame, x: drawXOff, y: drawYOff, scale: physScale });
}

/**
 * Finalize the recording into a serializable ReplayData with the frame count
 * and the replay version tag (ControllerGame.ts:5354-5360).
 */
export function finalizeReplay(rec: RecordingBuffers, numFrames: number): ReplayData {
	return {
		cameraMovements: rec.cameraMovements,
		keyPresses: rec.keyPresses,
		syncPoints: rec.syncPoints,
		numFrames,
		version: VERSION_STRING_FOR_REPLAYS,
	};
}

/**
 * ComputeReplaySplines (ControllerGame.ts:822-963): build a natural cubic spline
 * over the sync points for one channel — type 0 = x, 1 = y, 2 = angle — via
 * tridiagonal Gaussian elimination + back-substitution. Output is shaped
 * [coeff 0..3][segment][bodyIndex]. Angle deltas whose magnitude exceeds 20 are
 * unwrapped to a shortest-arc delta (:846-856, :929-939).
 *
 * This is a LINE-FOR-LINE port of the legacy math — do not simplify, or stored
 * replays visibly drift.
 */
export function computeReplaySplines(syncPoints: ReplaySyncPoint[], type: number): SplineSet {
	const numBodies = syncPoints[0].positions.length;
	const n = syncPoints.length;

	// Compute the h (segment frame widths) and b (per-body divided differences).
	const h: number[] = [];
	const b: number[][] = [];
	for (let i = 0; i < n - 1; i++) {
		h.push(syncPoints[i + 1].frame - syncPoints[i].frame);
		const inner: number[] = [];
		for (let j = 0; j < numBodies; j++) {
			if (type === 0) {
				inner.push((syncPoints[i + 1].positions[j].x - syncPoints[i].positions[j].x) / h[i]);
			} else if (type === 1) {
				inner.push((syncPoints[i + 1].positions[j].y - syncPoints[i].positions[j].y) / h[i]);
			} else {
				let deltaAngle = syncPoints[i + 1].angles[j] - syncPoints[i].angles[j];
				if (Math.abs(deltaAngle) > 20) {
					const a1 = Util.NormalizeAngle(syncPoints[i].angles[j]);
					const a2 = Util.NormalizeAngle(syncPoints[i + 1].angles[j]);
					if (Math.abs(a1 - a2) < Math.PI) {
						deltaAngle = a2 - a1;
					} else if (a1 > a2) {
						deltaAngle = a2 + 2 * Math.PI - a1;
					} else {
						deltaAngle = a2 - (a1 + 2 * Math.PI);
					}
				}
				inner.push(deltaAngle / h[i]);
			}
		}
		b.push(inner);
	}

	// Gaussian Elimination.
	const u: number[] = [];
	const v: number[][] = [];
	u.push(0);
	u.push(2 * (h[0] + h[1]));
	let inner: number[] = [];
	for (let j = 0; j < numBodies; j++) inner.push(0);
	v.push(inner);
	inner = [];
	for (let j = 0; j < numBodies; j++) {
		if (b.length < 2) inner.push(0);
		else inner.push(6 * (b[1][j] - b[0][j]));
	}
	v.push(inner);
	for (let i = 2; i < n - 1; i++) {
		u.push(2 * (h[i - 1] + h[i]) - (h[i - 1] * h[i - 1]) / u[i - 1]);
		inner = [];
		for (let j = 0; j < numBodies; j++) {
			inner.push(6 * (b[i][j] - b[i - 1][j]) - (h[i - 1] * v[i - 1][j]) / u[i - 1]);
		}
		v.push(inner);
	}

	// Back-substitution.
	const z: number[][] = [];
	inner = [];
	for (let j = 0; j < numBodies; j++) inner.push(0);
	z[n - 1] = inner;
	for (let i = n - 2; i > 0; i--) {
		inner = [];
		for (let j = 0; j < numBodies; j++) {
			inner.push((v[i][j] - h[i] * z[i + 1][j]) / u[i]);
		}
		z[i] = inner;
	}
	inner = [];
	for (let j = 0; j < numBodies; j++) inner.push(0);
	z[0] = inner;

	const S: SplineSet = [];
	const As: number[][] = [];
	const Bs: number[][] = [];
	const Cs: number[][] = [];
	const Ds: number[][] = [];
	for (let i = 0; i < n - 1; i++) {
		const innerA: number[] = [];
		const innerB: number[] = [];
		const innerC: number[] = [];
		const innerD: number[] = [];
		for (let j = 0; j < numBodies; j++) {
			innerA.push(
				type === 0
					? syncPoints[i].positions[j].x
					: type === 1
						? syncPoints[i].positions[j].y
						: syncPoints[i].angles[j],
			);
			let deltaAngle = syncPoints[i + 1].angles[j] - syncPoints[i].angles[j];
			if (Math.abs(deltaAngle) > 20) {
				const a1 = Util.NormalizeAngle(syncPoints[i].angles[j]);
				const a2 = Util.NormalizeAngle(syncPoints[i + 1].angles[j]);
				if (Math.abs(a1 - a2) < Math.PI) {
					deltaAngle = a2 - a1;
				} else if (a1 > a2) {
					deltaAngle = a2 + 2 * Math.PI - a1;
				} else {
					deltaAngle = a2 - (a1 + 2 * Math.PI);
				}
			}
			innerB.push(
				(-h[i] * z[i + 1][j]) / 6 -
					(h[i] * z[i][j]) / 3 +
					(type === 0
						? syncPoints[i + 1].positions[j].x - innerA[j]
						: type === 1
							? syncPoints[i + 1].positions[j].y - innerA[j]
							: deltaAngle) /
						h[i],
			);
			innerC.push(z[i][j] / 2);
			innerD.push((z[i + 1][j] - z[i][j]) / (6 * h[i]));
		}
		As.push(innerA);
		Bs.push(innerB);
		Cs.push(innerC);
		Ds.push(innerD);
	}
	S.push(As);
	S.push(Bs);
	S.push(Cs);
	S.push(Ds);
	return S;
}

/** The three precomputed spline channels for a playback (x/y/angle). */
export interface ReplaySplines {
	xs: SplineSet;
	ys: SplineSet;
	angles: SplineSet;
}

/**
 * Precompute all three channels on play-start when there are sync points
 * (ControllerGame.ts:2741-2745). Returns null when the replay carries no sync
 * points (nothing to interpolate).
 */
export function computeAllReplaySplines(syncPoints: ReplaySyncPoint[]): ReplaySplines | null {
	if (syncPoints.length === 0) return null;
	return {
		xs: computeReplaySplines(syncPoints, 0),
		ys: computeReplaySplines(syncPoints, 1),
		angles: computeReplaySplines(syncPoints, 2),
	};
}

/**
 * MoveCameraForReplay (ControllerGame.ts:777-790). Applies a recorded pan/zoom
 * to a camera-like target; the +Infinity x sentinel means "keep the current
 * pan" (only the scale is applied). Returns the new draw offsets + scale so the
 * caller can write them onto its camera state.
 */
export function moveCameraForReplay(
	movement: CameraMovement,
	current: { drawXOff: number; drawYOff: number; scale: number },
): { drawXOff: number; drawYOff: number; scale: number } {
	let drawXOff = current.drawXOff;
	let drawYOff = current.drawYOff;
	if (movement.x !== Number.POSITIVE_INFINITY) {
		drawXOff = movement.x;
		drawYOff = movement.y;
	}
	return { drawXOff, drawYOff, scale: movement.scale };
}

/**
 * SyncReplay (ControllerGame.ts:965-982): hard-set each body's XForm from the
 * recorded sync point, and each cannonball position. `bodies`/`cannonballs`
 * must be in the SAME deduped order used when the sync point was captured.
 */
export function syncReplay(
	syncPoint: ReplaySyncPoint,
	bodies: BodyLike[],
	cannonballs: BodyLike[],
	vec: (x: number, y: number) => Vec2Like,
): void {
	for (let i = 0; i < bodies.length; i++) {
		bodies[i].SetXForm(syncPoint.positions[i], syncPoint.angles[i]);
	}
	for (let i = 0; i < cannonballs.length; i++) {
		cannonballs[i].SetXForm(syncPoint.cannonballPositions[i], 0);
	}
	void vec;
}

/**
 * SyncReplay2 (ControllerGame.ts:984-1036): between two sync points, evaluate
 * the precomputed cubic polynomials at (frame - syncPoint1.frame) to place each
 * body, and LINEARLY interpolate each cannonball position by frame ratio.
 * `segmentIndex` is the index of syncPoint1 in the replay's syncPoints array.
 */
export function syncReplay2(
	segmentIndex: number,
	syncPoint1: ReplaySyncPoint,
	syncPoint2: ReplaySyncPoint,
	frame: number,
	splines: ReplaySplines,
	bodies: BodyLike[],
	cannonballs: BodyLike[],
	vec: (x: number, y: number) => Vec2Like,
): void {
	const t = frame - syncPoint1.frame;
	for (let i = 0; i < bodies.length; i++) {
		const x =
			splines.xs[0][segmentIndex][i] +
			t * (splines.xs[1][segmentIndex][i] + t * (splines.xs[2][segmentIndex][i] + t * splines.xs[3][segmentIndex][i]));
		const y =
			splines.ys[0][segmentIndex][i] +
			t * (splines.ys[1][segmentIndex][i] + t * (splines.ys[2][segmentIndex][i] + t * splines.ys[3][segmentIndex][i]));
		const angle =
			splines.angles[0][segmentIndex][i] +
			t *
				(splines.angles[1][segmentIndex][i] +
					t * (splines.angles[2][segmentIndex][i] + t * splines.angles[3][segmentIndex][i]));
		bodies[i].SetXForm(vec(x, y), angle);
	}
	const frameDiff = syncPoint2.frame - syncPoint1.frame;
	for (let i = 0; i < cannonballs.length; i++) {
		if (syncPoint1.cannonballPositions.length > i) {
			const newX =
				(syncPoint1.cannonballPositions[i].x * (syncPoint2.frame - frame) +
					syncPoint2.cannonballPositions[i].x * (frame - syncPoint1.frame)) /
				frameDiff;
			const newY =
				(syncPoint1.cannonballPositions[i].y * (syncPoint2.frame - frame) +
					syncPoint2.cannonballPositions[i].y * (frame - syncPoint1.frame)) /
				frameDiff;
			cannonballs[i].SetXForm(vec(newX, newY), 0);
		} else {
			cannonballs[i].SetXForm(syncPoint2.cannonballPositions[i], 0);
		}
	}
}

/**
 * Mutable playback session: the decoded ReplayData, precomputed splines, and the
 * three advancing cursors (Replay.syncPointIndex/cameraMovementIndex/
 * keyPressIndex, src/Game/Replay.ts:11-13). Reset to zero on play-start
 * (ControllerGame.ts:2738-2740).
 */
export interface ReplaySession {
	data: ReplayData;
	splines: ReplaySplines | null;
	syncPointIndex: number;
	cameraMovementIndex: number;
	keyPressIndex: number;
}

export function createReplaySession(data: ReplayData): ReplaySession {
	return {
		data,
		splines: computeAllReplaySplines(data.syncPoints),
		syncPointIndex: 0,
		cameraMovementIndex: 0,
		keyPressIndex: 0,
	};
}

/**
 * The per-tick outcome of Replay.Update (src/Game/Replay.ts:23-47), returned as
 * plain instructions so the caller (GameCore) can apply them to its own camera
 * state / bodies without this module importing GameCore.
 */
export interface ReplayTick {
	/** Camera movements to apply this frame (in order). */
	cameraMovements: CameraMovement[];
	/**
	 * Body-sync instruction: "hard" hard-sets from `syncPoint`; "interp"
	 * interpolates between `syncPoint1`/`syncPoint2` at `segmentIndex`; null when
	 * there are no sync points left.
	 */
	sync:
		| { kind: "hard"; syncPoint: ReplaySyncPoint }
		| { kind: "interp"; segmentIndex: number; syncPoint1: ReplaySyncPoint; syncPoint2: ReplaySyncPoint }
		| null;
	/**
	 * Text-display / cannon-fire key records to fire this frame (in order). A
	 * record carrying `partIndex` is a TriggerPress — the caller routes it to
	 * exactly that one part (ControllerGame.keyInput playback :2238-2241).
	 */
	keyPresses: KeyPress[];
	/** True once frame >= numFrames — the caller should pause playback. */
	done: boolean;
}

/**
 * Replay.Update (src/Game/Replay.ts:23-47). Advances the three cursors for
 * `frame` and returns the instructions to apply. Pure w.r.t. bodies/camera — the
 * caller applies `sync` via syncReplay/syncReplay2 and the camera movements via
 * moveCameraForReplay. `done` mirrors the return `frame >= numFrames`.
 */
export function replayUpdate(session: ReplaySession, frame: number): ReplayTick {
	const { data } = session;
	const tick: ReplayTick = { cameraMovements: [], sync: null, keyPresses: [], done: false };

	while (
		session.cameraMovementIndex < data.cameraMovements.length &&
		data.cameraMovements[session.cameraMovementIndex].frame === frame
	) {
		tick.cameraMovements.push(data.cameraMovements[session.cameraMovementIndex]);
		session.cameraMovementIndex++;
	}

	if (session.syncPointIndex < data.syncPoints.length) {
		if (frame >= data.syncPoints[session.syncPointIndex].frame) {
			tick.sync = { kind: "hard", syncPoint: data.syncPoints[session.syncPointIndex] };
			session.syncPointIndex++;
		} else {
			const syncPoint1 = data.syncPoints[session.syncPointIndex - 1];
			const syncPoint2 = data.syncPoints[session.syncPointIndex];
			tick.sync = {
				kind: "interp",
				segmentIndex: session.syncPointIndex - 1,
				syncPoint1,
				syncPoint2,
			};
		}
	}

	while (
		session.keyPressIndex < data.keyPresses.length &&
		data.keyPresses[session.keyPressIndex].frame === frame
	) {
		tick.keyPresses.push(data.keyPresses[session.keyPressIndex]);
		session.keyPressIndex++;
	}

	tick.done = frame >= data.numFrames;
	return tick;
}
