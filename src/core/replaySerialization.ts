// Node-clean replay (de)serialization.
//
// Faithful port of ONLY the pure Replay <-> ByteArray encoding that lives in
// src/General/Database.ts — extracted here exactly as robotSerialization.ts /
// challengeSerialization.ts extract the robot / challenge paths, so the headless
// GameCore can save/load replays WITHOUT importing the heavy Database.ts (which
// pulls in ControllerGame / Gui / pixi through its dead network code and would
// fail the check:core node-headless gate).
//
// Sources (Database.ts):
//   - ExportReplay (:233-271)         — the base64 + replayLen/robotLen wrapper.
//   - ImportReplay (:1244-1272)       — the inverse: uncompress, split, extract.
//   - PutReplayIntoByteArray (:2161)  — the raw replay stream (camera / sync /
//                                       version / numFrames / keyPresses).
//   - ExtractReplayFromByteArray (:2212) — the inverse stream reader.
//   - WriteFloat/WriteInt/ReadFloat/ReadInt (:2293-2344) — the compact 2-byte
//     scalar codecs the replay stream uses (NOT ByteArray.writeInt/writeFloat).
//   - Database.NormalizeAngle (:2346) — a LOCAL 10*PI normalizer, distinct from
//     Util.NormalizeAngle; used only for the angle-overflow branch.
//
// The byte format is IDENTICAL to the legacy game's replay export, so replays
// exported from this stack load in the legacy game and vice-versa. Layout of
// the export string (matching Database.ExportReplay):
//
//   base64( zlib-deflate(
//     int replayDataLength,                 // ByteArray.writeInt (4 bytes, BE)
//     int robotDataLength,                  // ByteArray.writeInt (4 bytes, BE)
//     <replayDataLength bytes> = zlib-deflate(PutReplayIntoByteArray(replay)),
//     <robotDataLength  bytes> = zlib-deflate(PutRobotIntoByteArray(robot)),
//     UTF name, UTF desc, UTF robotID, int score, UTF challenge, int shared
//   ))
//
// Only ByteArray, Util, the Base64 codecs, and the pure replay ReplayData shape
// are referenced — all node-clean (verified reachable by check-core-node.mjs).

import { ByteArray } from "../General/ByteArray";
import { Util } from "../General/Util";
import { Base64Decoder } from "../mx/utils/Base64Decoder";
import type { Part } from "../Parts/Part";
import { SandboxSettings } from "../Game/SandboxSettings";
import { decodeExposureInt, EXPO_PUBLIC_EDITABLE, type ExposureFlags } from "./exposure";
import { sniffFileBytes, TYPE_TAG_REPLAY, VERSION_PREFIX, VERSION_STRING } from "./serializationVersion";
import { decodeRobot, decodeRobotBlob, encodeRobot, readVersionedNameHeader, type DecodedRobot } from "./robotSerialization";
import type { CameraMovement, KeyPress, ReplayData, ReplaySyncPoint, Vec2Like } from "./replay";

// --- Compact 2-byte scalar codecs (Database.ts:2293-2344) -----------------
//
// The replay stream does NOT use ByteArray.writeInt/writeFloat; it uses these
// hand-rolled 2-byte codecs. writeByte on ByteArray truncates to a signed byte
// (signedOverflow), which reproduces the integer truncation the legacy `i/128`
// / `i/256` divisions relied on. Ported byte-for-byte.

/** Database.NormalizeAngle (:2346-2350) — a LOCAL normalizer (NOT Util's). */
function normalizeAngle(angle: number): number {
	while (angle >= 32.8) angle -= 10 * Math.PI;
	while (angle <= -32.7) angle += 10 * Math.PI;
	return angle;
}

function writeFloat(b: ByteArray, n: number): void {
	if (n === Number.NEGATIVE_INFINITY) {
		b.writeByte(-128);
		b.writeByte(-128);
		return;
	} else if (n === Number.POSITIVE_INFINITY) {
		b.writeByte(127);
		b.writeByte(127);
		return;
	}
	n += 327;
	n *= 100;
	const i = Util.NearestInt(n);
	const b1 = Math.trunc(i / 256);
	const b2 = i % 256;
	b.writeByte(b1 - 128);
	b.writeByte(b2 - 128);
}

function writeInt(b: ByteArray, i: number): void {
	if (i === Number.MIN_VALUE) {
		b.writeByte(-1);
		b.writeByte(-1);
	} else if (i === -1) {
		b.writeByte(0);
		b.writeByte(-1);
	} else {
		b.writeByte(Math.trunc(i / 128));
		b.writeByte(i % 128);
	}
}

function readFloat(b: ByteArray): number {
	const b1 = b.readByte() + 128;
	const b2 = b.readByte() + 128;
	if (b1 === 0 && b2 === 0) return Number.NEGATIVE_INFINITY;
	if (b1 === 255 && b2 === 255) return Number.POSITIVE_INFINITY;
	const i = b1 * 256 + b2;
	let n = Number(i);
	n /= 100;
	n -= 327;
	return n;
}

function readInt(b: ByteArray): number {
	const b1 = b.readByte();
	const b2 = b.readByte();
	if (b1 === -1 && b2 === -1) return Number.MIN_VALUE;
	if (b1 === 0 && b2 === -1) return -1;
	return b1 * 128 + b2;
}

// --- Replay <-> ByteArray stream (Database.ts:2161-2291) -------------------
//
// Verbatim port of PutReplayIntoByteArray / ExtractReplayFromByteArray. The
// +Infinity camera sentinel (CameraMovement.x/y) survives because WriteFloat
// stores +Infinity as (127,127) and ReadFloat maps (255,255) back to +Infinity.
// The MIN_VALUE stream terminators (WriteInt -> (-1,-1)) survive likewise.

function putReplayIntoByteArray(replay: ReplayData, b: ByteArray): ByteArray {
	for (let i = 0; i < replay.cameraMovements.length; i++) {
		writeInt(b, replay.cameraMovements[i].frame);
		writeFloat(b, replay.cameraMovements[i].x / 100);
		writeFloat(b, replay.cameraMovements[i].y / 100);
		writeFloat(b, replay.cameraMovements[i].scale);
	}
	writeInt(b, Number.MIN_VALUE);
	writeInt(b, Number.MIN_VALUE);
	for (let i = 0; i < replay.syncPoints.length; i++) {
		writeInt(b, replay.syncPoints[i].frame);
		for (let j = 0; j < replay.syncPoints[i].positions.length; j++) {
			if (
				i === 0 ||
				i === replay.syncPoints.length - 1 ||
				replay.syncPoints[i].positions[j].x !== replay.syncPoints[i - 1].positions[j].x ||
				replay.syncPoints[i].positions[j].y !== replay.syncPoints[i - 1].positions[j].y ||
				replay.syncPoints[i].angles[j] !== replay.syncPoints[i - 1].angles[j]
			) {
				writeFloat(b, replay.syncPoints[i].positions[j].x);
				writeFloat(b, replay.syncPoints[i].positions[j].y);
				if (replay.syncPoints[i].angles[j] <= -32.7 || replay.syncPoints[i].angles[j] >= 32.8) {
					writeFloat(b, normalizeAngle(replay.syncPoints[i].angles[j]) * 10);
				} else {
					writeFloat(b, replay.syncPoints[i].angles[j] * 10);
				}
				writeInt(b, j);
			}
		}
		writeFloat(b, Number.NEGATIVE_INFINITY);
		if (replay.syncPoints[i].cannonballPositions.length > 0) {
			writeInt(b, -1);
			for (let j = 0; j < replay.syncPoints[i].cannonballPositions.length; j++) {
				writeFloat(b, replay.syncPoints[i].cannonballPositions[j].x);
				writeFloat(b, replay.syncPoints[i].cannonballPositions[j].y);
			}
			writeFloat(b, Number.NEGATIVE_INFINITY);
		}
	}
	writeInt(b, Number.MIN_VALUE);
	b.writeObject(replay.version);
	writeInt(b, replay.numFrames);
	for (let i = 0; i < replay.keyPresses.length; i++) {
		writeInt(b, replay.keyPresses[i].frame);
		writeInt(b, replay.keyPresses[i].key);
		// TriggerPress (partIndex present): frame, key, sentinel -2, partIndex
		// (Jaybit PutReplayIntoByteArray, Database.as:3111-3114). -2 can never be
		// a frame number (frames are >= 0), so the reader's one-int lookahead
		// disambiguates it from the next entry's frame.
		if (replay.keyPresses[i].partIndex != null) {
			writeInt(b, -2);
			writeInt(b, replay.keyPresses[i].partIndex as number);
		}
	}
	writeInt(b, Number.MIN_VALUE);
	return b;
}

function extractReplayFromByteArray(data: ByteArray): ReplayData {
	const cameraMovements: CameraMovement[] = [];
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const frame = readInt(data);
		if (frame === Number.MIN_VALUE) break;
		const x = readFloat(data) * 100;
		const y = readFloat(data) * 100;
		const scale = readFloat(data);
		cameraMovements.push({ frame, x, y, scale });
	}
	const syncPoints: ReplaySyncPoint[] = [];

	let divideAngles = false;
	let firstIter = true;
	let frame = readInt(data);
	if (frame === Number.MIN_VALUE) {
		divideAngles = true;
		firstIter = false;
	}

	// eslint-disable-next-line no-constant-condition
	while (true) {
		if (!firstIter) frame = readInt(data);
		firstIter = false;
		if (frame === Number.MIN_VALUE) break;
		else if (frame === -1) {
			// eslint-disable-next-line no-constant-condition
			while (true) {
				const x = readFloat(data);
				if (x === Number.NEGATIVE_INFINITY) break;
				const y = readFloat(data);
				syncPoints[syncPoints.length - 1].cannonballPositions.push({ x, y });
			}
		} else {
			const syncPoint: ReplaySyncPoint = {
				frame,
				positions: [],
				angles: [],
				cannonballPositions: [],
			};
			let i = 0;
			// eslint-disable-next-line no-constant-condition
			while (true) {
				const x = readFloat(data);
				let angle = 0;
				let y = 0;
				if (x !== Number.NEGATIVE_INFINITY) {
					y = readFloat(data);
					angle = readFloat(data);
					if (divideAngles) angle /= 10;
				}
				let nextI: number;
				if (x === Number.NEGATIVE_INFINITY) {
					if (syncPoints.length === 0) break;
					else nextI = syncPoints[syncPoints.length - 1].positions.length;
				} else {
					nextI = readInt(data);
				}
				while (i < nextI) {
					syncPoint.positions.push(syncPoints[syncPoints.length - 1].positions[i]);
					syncPoint.angles.push(syncPoints[syncPoints.length - 1].angles[i]);
					i++;
				}
				if (x !== Number.NEGATIVE_INFINITY) {
					syncPoint.positions.push({ x, y } as Vec2Like);
					syncPoint.angles.push(angle);
				} else {
					break;
				}
				i++;
			}
			syncPoints.push(syncPoint);
		}
	}
	const version = String(data.readObject());
	const numFrames = readInt(data);
	const keyPresses: KeyPress[] = [];
	// One-int-lookahead loop (Jaybit ExtractReplayFromByteArray,
	// Database.as:1873-1905): after (frame, key) one more int is read — the -2
	// sentinel marks a TriggerPress (consume partIndex); any other value is the
	// NEXT entry's frame and is carried into the next iteration. Degrades to
	// plain (frame, key) parsing on CE streams, which never contain -2.
	let lookahead = -2;
	if (data.position !== data.length) {
		// eslint-disable-next-line no-constant-condition
		while (true) {
			if (lookahead !== -2) {
				frame = lookahead;
				lookahead = -2;
			} else {
				frame = readInt(data);
			}
			if (frame === Number.MIN_VALUE) break;
			const key = readInt(data);
			lookahead = readInt(data);
			if (lookahead !== -2) {
				keyPresses.push({ frame, key });
			} else {
				const partIndex = readInt(data);
				keyPresses.push({ frame, key, partIndex });
			}
		}
	}
	return { cameraMovements, syncPoints, keyPresses, numFrames, version };
}

// --- Public string API (matches Database.ExportReplay / ImportReplay) ------

/** A robot to bundle into the replay export (parts + sandbox settings). */
export interface ReplayRobot {
	parts: Part[];
	settings?: SandboxSettings;
}

/** The result of decoding a replay export string: the replay + its bundled robot. */
export interface DecodedReplay {
	replay: ReplayData;
	robot: DecodedRobot;
	/** Trailer metadata (Wave 3a). */
	name: string;
	desc: string;
	robotID: string;
	score: number;
	challenge: string;
	/** The embedded "2.33.0.1 ibre"-style version string; null on legacy CE codes. */
	version: string | null;
	/** Decoded exposure (SaveWindow enum) — legacy codes map to public+editable. */
	exposure: ExposureFlags;
}

/**
 * Build the raw (uncompressed) robot ByteArray a replay export bundles. This is
 * exactly what PutRobotIntoByteArray produces — we get it by encoding to the
 * robot export string then unwrapping the header, keeping robotSerialization the
 * single source of truth for the robot byte format.
 */
async function putRobotBytes(robot: ReplayRobot | undefined): Promise<ByteArray> {
	const parts = robot ? robot.parts : [];
	const settings = robot?.settings;
	const str = await encodeRobot(parts, settings ?? new SandboxSettings(15.0, 1, 0, 0, 0));
	// encodeRobot returns base64(zlib(header + robotBytes)). Unwrap to raw robot
	// bytes: the header is now the Jaybit prefix dance + name/desc + 3 ints.
	const decoder = new Base64Decoder();
	decoder.decode(str);
	const b = decoder.toByteArray();
	await b.uncompress();
	readVersionedNameHeader(b); // prefix/version/name (sentinel dance)
	b.readUTF(); // desc
	b.readInt(); // shared
	b.readInt(); // exposure
	b.readInt(); // prop
	const out = new ByteArray();
	while (b.position !== b.length) out.writeByte(b.readByte());
	out.position = 0;
	return out;
}

/** Replay export trailer metadata (Jaybit ExportReplay params). */
export interface ReplayMeta {
	name?: string;
	desc?: string;
	robotID?: string;
	/** -1 for plain (non-score) exports, as Jaybit's caller passes. */
	score?: number;
	challenge?: string;
	expo?: number;
}

/**
 * Build the compressed replay export blob (= .ibre file bytes = the base64
 * payload of the text code). Byte layout is Jaybit's ExportReplay
 * (Database.as:1655-1695) — replay codes are DOUBLY compressed:
 *
 *   writeInt(len(deflate(replayBytes))); writeInt(len(deflate(robotBytes)))
 *   <deflate(PutReplayIntoByteArray(replay))>      // inner zlib!
 *   <deflate(PutRobotIntoByteArray(robot))>        // inner zlib!
 *   writeUTF(prefix); writeUTF(VERSION + " ibre")  // NEW in Jaybit (CE starts at name)
 *   writeUTF(name); writeUTF(desc); writeUTF(robotID)
 *   writeInt(score); writeUTF(challengeID); writeInt(expo + 2)
 *   compress()                                     // outer zlib
 */
async function buildReplayExportBytes(replay: ReplayData, robot: ReplayRobot | undefined, meta: ReplayMeta): Promise<ByteArray> {
	const robotData = await putRobotBytes(robot);
	await robotData.compress();

	const replayData = putReplayIntoByteArray(replay, new ByteArray());
	await replayData.compress();

	const exportData = new ByteArray();
	exportData.writeInt(replayData.length);
	exportData.writeInt(robotData.length);
	replayData.position = 0;
	while (replayData.position !== replayData.length) {
		exportData.writeByte(replayData.readByte());
	}
	robotData.position = 0;
	while (robotData.position !== robotData.length) {
		exportData.writeByte(robotData.readByte());
	}
	exportData.writeUTF(VERSION_PREFIX);
	exportData.writeUTF(VERSION_STRING + TYPE_TAG_REPLAY);
	exportData.writeUTF(meta.name ?? "");
	exportData.writeUTF(meta.desc ?? "");
	exportData.writeUTF(meta.robotID ?? "");
	exportData.writeInt(meta.score ?? -1); // -1 == plain (non-score) export
	exportData.writeUTF(meta.challenge ?? "");
	exportData.writeInt((meta.expo ?? EXPO_PUBLIC_EDITABLE) + 2);
	await exportData.compress();
	return exportData;
}

/**
 * Encode a ReplayData to the replay export string (Jaybit 2.33 format).
 * Optionally bundles a robot (parts + settings); with no robot an empty robot
 * is written, which still round-trips through decodeReplay.
 */
export async function encodeReplay(
	replay: ReplayData,
	robot?: ReplayRobot,
	meta: ReplayMeta = {},
): Promise<string> {
	const exportData = await buildReplayExportBytes(replay, robot, meta);
	return exportData.buffer.toString("base64");
}

/**
 * Encode a ReplayData to .ibre FILE bytes — byte-identical to the
 * base64-decode of encodeReplay's string (files carry no extra framing, §3).
 */
export async function exportReplayFile(
	replay: ReplayData,
	robot?: ReplayRobot,
	meta: ReplayMeta = {},
): Promise<Uint8Array> {
	const exportData = await buildReplayExportBytes(replay, robot, meta);
	return new Uint8Array(exportData.buffer);
}

/**
 * Decode a replay export string back into its ReplayData (and the bundled
 * robot). Mirrors Jaybit's Database.ImportReplay (:938-987): base64-decode,
 * zlib-uncompress, split by the leading replayLength/robotLength ints,
 * uncompress each half, extract, then read the trailer with the prefix
 * sentinel dance (tolerates BOTH legacy CE and Jaybit-prefixed trailers).
 */
export async function decodeReplay(replayStr: string): Promise<DecodedReplay> {
	const decoder = new Base64Decoder();
	decoder.decode(replayStr);
	const b = decoder.toByteArray();
	await b.uncompress();
	return decodeReplayFromBytes(b);
}

/** Shared tail of decodeReplay / decodeReplayFile. */
async function decodeReplayFromBytes(b: ByteArray): Promise<DecodedReplay> {
	const replayLength = b.readInt();
	const robotLength = b.readInt();
	const replayData = new ByteArray();
	const robotData = new ByteArray();
	while (b.position < replayLength + 8) {
		replayData.writeByte(b.readByte());
	}
	await replayData.uncompress();
	while (b.position < replayLength + robotLength + 8) {
		robotData.writeByte(b.readByte());
	}
	await robotData.uncompress();

	const replay = extractReplayFromByteArray(replayData);

	// Extract the bundled robot the same way ImportReplay does (via the shared
	// robot decoder). robotData here is the RAW robot ByteArray (no header), so
	// re-wrap through decodeRobot's stream reader by extracting directly.
	robotData.position = 0;
	const robot = await extractBundledRobot(robotData);

	// Trailer: prefix dance + name/desc/robotID/score/challenge/exposure
	// (Database.as:964-985).
	const { name, version } = readVersionedNameHeader(b);
	const desc = b.readUTF();
	const robotID = b.readUTF();
	const score = b.readInt();
	const challenge = b.readUTF();
	const exposure = decodeExposureInt(b.readInt());

	return { replay, robot, name, desc, robotID, score, challenge, version, exposure };
}

/**
 * Decode a user .ibre FILE (or a text code pasted into a file): bytes starting
 * with "eN" are a base64 text code; anything else is the raw compressed blob
 * (Jaybit TryLoadingReplay :929-936 / LoadReplayFromFileBytes :433-485).
 */
export async function decodeReplayFile(bytes: ArrayBuffer | Uint8Array): Promise<DecodedReplay> {
	const sniffed = sniffFileBytes(bytes);
	if (sniffed.kind === "code") return decodeReplay(sniffed.code);
	const b = new ByteArray(bytes as ArrayBuffer);
	await b.uncompress();
	b.position = 0;
	return decodeReplayFromBytes(b);
}

/** The decoded demo replay: the recorded motion + the robot parts it animates. */
export interface DecodedDemoReplay {
	replay: ReplayData;
	robot: DecodedRobot;
}

/**
 * Decode the bundled main-menu DEMO replay from its two RAW asset blobs
 * (resource/replay.dat + resource/robot.dat). This is the RAW replay format the
 * legacy ControllerMainMenu.LoadReplay reads (ControllerMainMenu.ts:443-457) —
 * NOT the base64 export-string wrapper decodeReplay handles. Each .dat is a
 * standalone zlib-compressed ByteArray: uncompress replay.dat and extract the
 * replay stream directly; uncompress robot.dat and ExtractRobotFromByteArray
 * directly (no export header). Node-clean (no pixi). `replayBlob` / `robotBlob`
 * are the raw asset bytes (fetch().arrayBuffer() in the browser, readFileSync in
 * tests).
 */
export async function decodeDemoReplay(
	replayBlob: ArrayBuffer | Uint8Array,
	robotBlob: ArrayBuffer | Uint8Array,
): Promise<DecodedDemoReplay> {
	const rb = new ByteArray(replayBlob as ArrayBuffer);
	await rb.uncompress();
	rb.position = 0;
	const replay = extractReplayFromByteArray(rb);
	const robot = await decodeRobotBlob(robotBlob);
	return { replay, robot };
}

/**
 * Extract a robot from the RAW (headerless) robot ByteArray a replay bundles.
 * Rebuilds the header-wrapped export string decodeRobot expects so the robot
 * byte format stays owned solely by robotSerialization.
 */
async function extractBundledRobot(raw: ByteArray): Promise<DecodedRobot> {
	const wrapped = new ByteArray();
	wrapped.writeUTF(""); // name
	wrapped.writeUTF(""); // desc
	wrapped.writeInt(0); // shared
	wrapped.writeInt(0); // allowEdits
	wrapped.writeInt(0); // prop
	raw.position = 0;
	while (raw.position !== raw.length) wrapped.writeByte(raw.readByte());
	await wrapped.compress();
	return decodeRobot(wrapped.buffer.toString("base64"));
}
