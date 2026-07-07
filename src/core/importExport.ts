// Robot / challenge / replay import-export application.
//
// Extracted from GameCore's "Robot import / export" section (plus the shared
// load-path gate helpers). The public GameCore methods keep the async decode
// (ByteArray work) and their full doc trail; the post-decode "make it the
// live session" appliers live here as free functions over the CoreInternals
// seam. Export is a pure read (methods on GameCore); import replaces/extends
// the parts graph and is undoable.

import { Bomb } from "../Parts/Bomb";
import { Cannon } from "../Parts/Cannon";
import { Circle } from "../Parts/Circle";
import { FixedJoint } from "../Parts/FixedJoint";
import { JointPart } from "../Parts/JointPart";
import type { Part } from "../Parts/Part";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { Rectangle } from "../Parts/Rectangle";
import { RevoluteJoint } from "../Parts/RevoluteJoint";
import { ShapePart } from "../Parts/ShapePart";
import { Thrusters } from "../Parts/Thrusters";
import { Triangle } from "../Parts/Triangle";
import { TRIGGER_NONE } from "../Parts/partDefaults";
import type { Challenge } from "../Game/Challenge";
import { SandboxSettings } from "../Game/SandboxSettings";
import { applyWaterState, waterStateFromSettings } from "./waterSystem";
import type { CameraState, GameState } from "./GameState";
import { buildTerrainParts, computeBounds } from "./sandboxEnvironment";
import {
	type CreatePartKind,
	challengeSessionFromChallenge,
	clampFriction,
	clampRestitution,
	partTypeAllowed,
} from "./challenge";
import { currentXY } from "./geometryEdit";
import type { DecodedRobot } from "./robotSerialization";
import type { DecodedReplay } from "./replaySerialization";
import type { IB3ImportResult } from "./ib3Import";
import type { ReplayData } from "./replay";
import type { CoreInternals } from "./coreInternals";
import { resetSessionForLoad } from "./simRuntime";

/**
 * Project a decoded SandboxSettings into the GameState.sandbox slice — the
 * shared shape every load path (IB3 robot import, challenge blob/string load,
 * replay import) seeds state.sandbox from. Carries the recomputed bounds, the
 * IB3 water settings (optional-guarded on decode; waterSystem.ts), the
 * physics-engine selection (0 for IB2/CE/Jaybit codes, 1 for IB3 imports —
 * read at play time by applyPlayBackend, P1.5b-2b), the sandbox ground style
 * (IB2 platform vs IB3 SHORE/ISLAND — drives buildTerrainParts/bounds), and
 * the IB3 superset physics (horizontal gravity + restitution combine mode).
 */
export function sandboxStateFromSettings(s: SandboxSettings): GameState["sandbox"] {
	return {
		gravity: s.gravity,
		size: s.size,
		terrainType: s.terrainType,
		terrainTheme: s.terrainTheme,
		background: s.background,
		backgroundR: s.backgroundR,
		backgroundG: s.backgroundG,
		backgroundB: s.backgroundB,
		bounds: computeBounds({ size: s.size, terrainType: s.terrainType, groundStyle: s.groundStyle }),
		water: waterStateFromSettings(s),
		physicsEngine: s.physicsEngine,
		groundStyle: s.groundStyle,
		gravityX: s.gravityX,
		restitutionType: s.restitutionType,
	};
}

/** Shared tail of importRobotInsert / importRobotFileInsert (append, not replace). */
export function applyInsertedRobot(core: CoreInternals, decoded: DecodedRobot): void {
	// The button is only reachable on an editable robot (importAndInsertButton
	// gate `curRobotEditable`); enforce it here too so the store passthrough is safe.
	if (!core.curRobotEditable) return;
	// Robot files carry no terrain, but guard against isSandbox parts anyway so
	// an insert can never duplicate the ground.
	const incoming = decoded.parts.filter((p) => !(p as { isSandbox?: boolean }).isSandbox);
	if (incoming.length === 0) return;

	// Challenge restriction gate (processLoadedRobot :8611): refuse if the robot
	// carries a part type the active challenge disallows. Mirrors the paste gate.
	if (core.challenge) {
		for (const p of incoming) {
			const kind = clipboardPartKind(core, p);
			if (kind && !partTypeAllowed(core.challenge, kind)) {
				core.emitMessage("Sorry, that robot contains parts that are not allowed in this challenge!");
				return;
			}
		}
	}
	// Trigger gate (matching the paste gate): in a challenge play session with
	// !triggersAllowed, refuse a robot carrying any trigger config.
	if (core.challenge && core.challenge.playMode && !core.challenge.challenge.triggersAllowed) {
		if (incoming.some((p) => partCarriesTriggers(core, p))) {
			core.emitMessage("Sorry, triggers are not allowed in this challenge!");
			return;
		}
	}

	// Insert KEEPS the existing parts, so the fresh ids must clear the current
	// max id (unlike a replacing import, where old ids vanish).
	for (const p of core.state.parts) core.nextId = Math.max(core.nextId, p.id ?? 0);
	for (const p of incoming) p.id = ++core.nextId;
	for (const p of incoming) clampPartToChallengeLimits(core, p);

	core.withNotifyBatch(() => {
		core.pushHistory();
		core.state = {
			...core.state,
			parts: [...core.state.parts, ...incoming],
			edit: { ...core.state.edit, ...core.undoRedoFlags() },
		};
		core.markChanged();
		if (core.challenge) core.syncChallenge();
		if (core.tutorialMachine) core.notifyTutorial({ type: "progress", key: "pasted" });
	});
	surfaceIb3Notice(core, decoded);
}

/**
 * Surface IB3-import provenance + lossy-conversion notes through the same
 * message plumbing as the challenge/trigger refusals (P5 wiring). No-op for
 * native/Jaybit/CE codes (decoded.ib3 undefined).
 */
export function surfaceIb3Notice(core: CoreInternals, decoded: DecodedRobot): void {
	if (!decoded.ib3) return;
	const p = decoded.ib3;
	const kind = p.type === 1 ? "replay" : p.type === 2 ? "challenge" : "robot";
	const named = p.name ? ` "${p.name}"` : "";
	const by = p.creatorName ? ` by ${p.creatorName}` : "";
	core.emitMessage(`Imported IB3 ${kind}${named}${by} (v${p.version}).`);
	if (decoded.warnings && decoded.warnings.length > 0) {
		core.emitMessage("IB3 import notes: " + decoded.warnings.join(" "));
	}
}

/**
 * Camera offset that centres the view on where the BULK of `parts` sits — the
 * AREA-WEIGHTED centroid of the shapes (so a large cluster dominates and a stray
 * far-off part barely tugs the focus, unlike a bounding-box centre). Falls back
 * to the plain average of part positions when nothing has an area (joints/text
 * only), and returns null for an empty list. Keeps the current zoom; only pans.
 * Convention matches handleCenterOnSelection / handleCamera: offset = centre*scale.
 */
export function focusCameraOnParts(core: CoreInternals, parts: Part[]): CameraState | null {
	if (parts.length === 0) return null;
	let wSum = 0;
	let wx = 0;
	let wy = 0;
	for (const p of parts) {
		if (!(p instanceof ShapePart)) continue;
		const area = Math.max(p.GetArea(), 1e-6);
		const { x, y } = currentXY(p);
		wx += x * area;
		wy += y * area;
		wSum += area;
	}
	let cx: number;
	let cy: number;
	if (wSum > 0) {
		cx = wx / wSum;
		cy = wy / wSum;
	} else {
		// No shapes (e.g. text-only) — use the plain average of all part positions.
		let n = 0;
		let sx = 0;
		let sy = 0;
		for (const p of parts) {
			const { x, y } = currentXY(p);
			sx += x;
			sy += y;
			n++;
		}
		if (n === 0) return null;
		cx = sx / n;
		cy = sy / n;
	}
	const scale = core.state.camera.scale;
	return { ...core.state.camera, offsetX: cx * scale, offsetY: cy * scale };
}

/** Shared tail of importRobot / importRobotFile (post-decode application). */
export function applyImportedRobot(core: CoreInternals, decoded: DecodedRobot): void {
	// Challenge restriction gates, matching the insert/paste siblings
	// (applyInsertedRobot / pasteParts — processLoadedRobot :8611): a WHOLE-LOAD
	// refusal when the robot carries a disallowed part type, or any trigger
	// config in a play session with !triggersAllowed. Same dialog strings.
	if (core.challenge) {
		for (const p of decoded.parts) {
			const kind = clipboardPartKind(core, p);
			if (kind && !partTypeAllowed(core.challenge, kind)) {
				core.emitMessage("Sorry, that robot contains parts that are not allowed in this challenge!");
				return;
			}
		}
		if (core.challenge.playMode && !core.challenge.challenge.triggersAllowed) {
			if (decoded.parts.some((p) => partCarriesTriggers(core, p))) {
				core.emitMessage("Sorry, triggers are not allowed in this challenge!");
				return;
			}
		}
	}

	for (const p of decoded.parts) p.id = ++core.nextId;
	// Robot-load enforcement of the challenge material limits
	// (ControllerGame.CheckForChallengeLimits per loaded part, Jaybit :4212+).
	for (const p of decoded.parts) clampPartToChallengeLimits(core, p);

	core.withNotifyBatch(() => {
		core.pushHistory();
		// A NATIVE/CE/Jaybit robot load keeps the current sandbox + terrain bodies
		// (isSandbox) so the imported robot lands on the existing ground; only the
		// robot parts are replaced. An IB3 import is different: its bot is positioned
		// in IB3 WORLD COORDINATES and was tuned in an IB3 sandbox (different engine,
		// AND a completely differently-shaped/sized ground — SHORE/ISLAND, surface at
		// y=-1 vs IB2's y=12). So for IB3 we ADOPT the decoded sandbox and REBUILD the
		// terrain from it, or the bot lands on the wrong ground (floating / clipping).
		let sandbox = core.state.sandbox;
		let terrain = core.state.parts.filter((p) => (p as { isSandbox?: boolean }).isSandbox);
		if (decoded.ib3) {
			const s = decoded.settings;
			sandbox = sandboxStateFromSettings(s);
			terrain = buildTerrainParts(sandbox);
			for (const p of terrain) p.id = ++core.nextId;
		}
		// Focus the camera on the bulk of the imported robot — its saved camera (or
		// the current pan) can leave the bot off-screen, especially for IB3 imports
		// whose world coords differ from the current sandbox. Pans only (keeps zoom).
		const camera = focusCameraOnParts(core, decoded.parts) ?? core.state.camera;
		core.state = {
			...core.state,
			// Terrain first so it draws behind the robot (BuildGround order).
			parts: [...terrain, ...decoded.parts],
			sandbox,
			camera,
			edit: {
				...core.state.edit,
				selection: [],
				selectedPart: null,
				...core.undoRedoFlags(),
			},
		};
		// DetermineExposure equivalent: copy the decoded editable flag to the
		// exposure lock (ControllerGame :8640-8652) — the funnel gate in apply()
		// enforces it. AFTER pushHistory so undoing the import restores the
		// pre-import (unlocked) flag.
		core.setRobotEditable(decoded.exposure.isEditable);
		core.markChanged();
		// Tutorial milestone (ControllerHomeMovies.Update paste -> 46 "pasted").
		if (core.tutorialMachine) core.notifyTutorial({ type: "progress", key: "pasted" });
	});
	surfaceIb3Notice(core, decoded);
}

/**
 * Make a decoded blob-backed built-in challenge (Race / Spaceship) the live
 * challenge session — the post-decode tail of GameCore.loadBuiltInChallengeBlob
 * (which keeps the ByteArray decode + the full port doc).
 */
export function applyBuiltInChallenge(core: CoreInternals, name: "race" | "spaceship", challenge: Challenge): void {
	// Fresh-controller reset (see resetSessionForLoad): drop the previous mode's
	// parts / challenge / tutorial / history before this challenge becomes live.
	resetSessionForLoad(core);
	core.challenge = challengeSessionFromChallenge(challenge, name);

	// The decoded parts (terrain + author robot) become the live parts graph,
	// with fresh ids from our monotonic source (ControllerRace assigns them via
	// loadedParts -> the base loader). Keep the parts' own isEditable/isStatic
	// flags from the blob so play-only conditions evaluate against them exactly.
	const parts = challenge.allParts as Part[];
	for (const p of parts) p.id = ++core.nextId;

	// Seed state.sandbox from the challenge's SandboxSettings so the sandbox
	// GroundRenderer + Sky draw the challenge's terrain/theme/background — the
	// legacy ControllerRace/Spaceship do this via ControllerGameGlobals.settings
	// = challenge.settings, and ControllerSandbox.BuildGround(true) then builds
	// the ground from those settings (ControllerRace.ts:23; ControllerSandbox
	// ctor). The terrain COLLISION bodies still ride in `parts` from the blob.
	const s = challenge.settings;
	const sandbox = sandboxStateFromSettings(s);

	core.withNotifyBatch(() => {
		core.state = {
			...core.state,
			parts,
			sandbox,
			sim: { phase: "editing", frame: 0 },
			edit: { ...core.state.edit, selection: [], selectedPart: null },
		};
		// Camera zoom comes from the challenge (ControllerRace.ts:28-29 sets
		// initZoom = challenge.zoomLevel; Spaceship pins physScale=24). Apply the
		// decoded zoom when present (MAX_VALUE == unset) so the scene frames.
		if (challenge.zoomLevel !== Number.MAX_VALUE) {
			core.state = { ...core.state, camera: { ...core.state.camera, scale: challenge.zoomLevel } };
		}
		// Loading a challenge REPLACES the robot, so any exposure lock from a
		// previously loaded uneditable robot is lifted (Jaybit recomputes
		// curRobotEditable on every load).
		core.setRobotEditable(true);
		core.markChanged();
		core.syncChallenge();
	});
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
export function applyImportedChallenge(core: CoreInternals, challenge: Challenge, editable: boolean): void {
	// Fresh-controller reset (see resetSessionForLoad) so no prior parts /
	// challenge / tutorial / history bleed into the imported challenge.
	resetSessionForLoad(core);
	core.challenge = challengeSessionFromChallenge(challenge, null, editable);

	const parts = challenge.allParts as Part[];
	for (const p of parts) p.id = ++core.nextId;

	const s = challenge.settings;
	const sandbox = sandboxStateFromSettings(s);

	core.withNotifyBatch(() => {
		core.state = {
			...core.state,
			parts,
			sandbox,
			sim: { phase: "editing", frame: 0 },
			edit: { ...core.state.edit, selection: [], selectedPart: null },
		};
		if (challenge.zoomLevel !== Number.MAX_VALUE) {
			core.state = { ...core.state, camera: { ...core.state.camera, scale: challenge.zoomLevel } };
		}
		// Loading a challenge replaces the robot — lift any exposure lock
		// (Jaybit recomputes curRobotEditable on every load).
		core.setRobotEditable(true);
		core.markChanged();
		core.syncChallenge();
	});
}

/**
 * Snapshot the live parts/settings into the challenge object before an
 * export (shared by the string + file exporters). Returns null when no
 * challenge session is active.
 */
export function prepareChallengeForExport(core: CoreInternals): Challenge | null {
	if (!core.challenge) return null;
	// Legacy ExportChallenge encodes ControllerGameGlobals.challenge, whose
	// allParts is the authored terrain + robot. In authoring (not-yet-played)
	// mode allParts may lag the live edits, so snapshot the current parts graph
	// into it first — mirroring enterChallengePlay's bake — so the export always
	// captures what's on screen. (putChallengeIntoByteArray filters to drawAnyway
	// parts, matching the legacy PutPartsIntoByteArray.)
	core.challenge.challenge.allParts = [...core.state.parts];
	// An authored challenge session carries `settings = null` (createChallengeSession
	// keeps the sandbox config on GameState.sandbox, not on the Challenge); the
	// encoder writes challenge.settings as an AMF object, so materialize a
	// SandboxSettings from the live sandbox when absent. Blob-loaded / imported
	// challenges already carry their own settings, so this only fires for authored ones.
	if (!core.challenge.challenge.settings) {
		const sb = core.state.sandbox;
		const settings = applyWaterState(
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
		settings.physicsEngine = sb.physicsEngine;
		settings.groundStyle = sb.groundStyle;
		settings.gravityX = sb.gravityX;
		settings.restitutionType = sb.restitutionType;
		core.challenge.challenge.settings = settings;
	}
	return core.challenge.challenge;
}

/**
 * Apply a decoded IB3 file that arrived through the replay-import path: if it
 * carries a recorded run, load the design then PLAY the run; otherwise import
 * it as a design (same as importRobot's IB3 path). The recorded body tracks are
 * keyed to the imported ShapePart objects and compacted into the live body
 * order at play time (see handlePlayReplay / compactIB3SyncPoints).
 */
export async function playOrLoadIB3Replay(core: CoreInternals, result: IB3ImportResult): Promise<void> {
	const design: DecodedRobot = { ...result.robot, ib3: result.ib3, warnings: result.warnings };
	if (!result.replay) {
		applyImportedRobot(core, design);
		return;
	}
	// Load the design (parts + IB3 sandbox + rebuilt IB3 terrain) — the SAME part
	// objects the tracks are keyed to — then start playback.
	applyImportedRobot(core, design);
	// If the load was refused (challenge gate) the sim is still editing and no
	// parts changed; bail rather than play a mismatched scene.
	if (core.state.sim.phase !== "editing") return;
	const rep = result.replay;
	const data: ReplayData = {
		cameraMovements: rep.cameraMovements,
		keyPresses: rep.keyPresses,
		// Compacted at play time from the live body order (tracks are per-shape).
		syncPoints: [],
		numFrames: rep.numFrames,
		version: "ib3",
		// IB3 bots were tuned on the 2.1a engine, so play the recorded run on
		// engine 1 for consistency. Playback is sim-free (bodies are hard-set from
		// sync points), and the transform write now goes through the engine seam
		// (setBodyTransform), so 2.1a's SetPositionAndAngle is used correctly.
		physicsEngine: 1,
		// IB3 records a SPARSE camera stream and relies on live focus-following
		// during playback; follow the camera-focus part here (honoring brokeFocus).
		followCameraFocus: true,
	};
	core.ib3ReplayTracks = rep;
	core.dispatch({ type: "playReplay", data });
}

/** Shared tail of importReplay / importReplayFile (post-decode application). */
export function applyImportedReplay(core: CoreInternals, decoded: DecodedReplay): void {
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
	const sandbox = sandboxStateFromSettings(s);
	const terrain = buildTerrainParts(sandbox);
	for (const p of terrain) p.id = ++core.nextId;
	for (const p of robot.parts) p.id = ++core.nextId;
	core.state = {
		...core.state,
		sandbox,
		parts: [...terrain, ...robot.parts],
		edit: { ...core.state.edit, selection: [], selectedPart: null },
	};
	// Loading a replay replaces the robot — lift any exposure lock (Jaybit
	// recomputes curRobotEditable on every load).
	core.setRobotEditable(true);
	core.markChanged();
	core.dispatch({ type: "playReplay", data: replay });
}

/** Map a clipboard Part to its CreatePartKind for the paste restriction gate. */
export function clipboardPartKind(core: CoreInternals, p: Part): CreatePartKind | null {
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
export function partCarriesTriggers(core: CoreInternals, p: Part): boolean {
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
export function clampPartToChallengeLimits(core: CoreInternals, part: Part): void {
	if (!core.challenge || !(part instanceof ShapePart)) return;
	part.friction = clampFriction(core.challenge, part.friction);
	part.restitution = clampRestitution(core.challenge, part.restitution);
}
