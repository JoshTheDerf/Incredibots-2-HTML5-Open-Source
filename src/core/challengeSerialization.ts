// Node-clean challenge (de)serialization.
//
// Faithful port of ONLY the pure Challenge <-> ByteArray decoding that lives in
// src/General/Database.ts (ExtractChallengeFromByteArray :1814-1912, which in
// turn calls ExtractPartsFromByteArray :1955-2110). Extracted here — exactly as
// robotSerialization.ts extracts the robot path — so the headless GameCore can
// decode the built-in Race / Spaceship challenge blobs WITHOUT importing the
// heavy Database.ts (which pulls in ControllerGame / Gui / pixi through its dead
// network code and would fail the check:core node-headless gate).
//
// The two built-in challenges (ControllerRace / ControllerSpaceship ctors) load
// a pre-authored challenge from a zlib-compressed ByteArray blob (Resource.cRace
// / cSpaceship, the race.dat / spaceship.dat assets):
//
//   cRace.uncompress();
//   const challenge = Database.ExtractChallengeFromByteArray(cRace);
//
// (ControllerRace.ts:18-24, ControllerSpaceship.ts:19-25). The blob is a raw
// zlib-compressed challenge ByteArray — NOT the base64 + name/desc/shared header
// wrapper that ExportChallenge/ImportChallenge use. So decodeChallengeBlob only
// uncompresses then extracts; it does not skip a header.
//
// Only ByteArray, the Part classes, Util, SandboxSettings, WinCondition,
// LossCondition, Challenge and b2AABB are referenced — all node-clean (verified
// reachable by scripts/check-core-node.mjs).

import { b2AABB } from "../Box2D";
import { ByteArray } from "../General/ByteArray";
import { Base64Decoder } from "../mx/utils/Base64Decoder";
import { Util } from "../General/Util";
import { Challenge } from "../Game/Challenge";
import { decodeExposureInt, EXPO_PUBLIC_EDITABLE, type ExposureFlags } from "./exposure";
import {
	applyWaterSettings,
	extractPartsFromByteArray,
	INIT_PHYS_SCALE,
	putPartsIntoByteArray,
	readVersionedNameHeader,
} from "./robotSerialization";
import { sniffFileBytes, TYPE_TAG_CHALLENGE, VERSION_PREFIX, VERSION_STRING } from "./serializationVersion";
import { SandboxSettings } from "../Game/SandboxSettings";
import { WinCondition } from "../Game/WinCondition";
import { LossCondition } from "../Game/LossCondition";
import type { Part } from "../Parts/Part";
import { ShapePart } from "../Parts/ShapePart";

// --- Part array <-> ByteArray (AMF3 object graph) --------------------------
//
// Challenges share the EXACT part encoding with robots (Database.ts
// ExtractPartsFromByteArray :1955-2110 / PutPartsIntoByteArray :1914-1954), so
// the codec — extractPartsFromByteArray, putPartsIntoByteArray,
// applyWaterSettings, INIT_PHYS_SCALE — is imported from robotSerialization.ts,
// the single canonical copy (byte-identical by design).
//
// The challenge blob is a sequence of independent top-level writeObject() sections
// (parts, settings, buildAreas, each condition list). ByteArray.readObject now
// resets its AMF reference tables per top-level read (matching AS3's per-message
// reset + the writer's fresh-table-per-writeObject), so each readObject() below
// starts with a clean reference context automatically — no manual reset needed.

/** Only ShapeParts count as "shapes" for condition shape1/shape2 index resolution (Database.IsShape). */
function isShape(p: Part): boolean {
	return p instanceof ShapePart;
}

// --- Challenge <- ByteArray -----------------------------------------------
//
// Jaybit version dispatch (Database.as): the challenge body is
// position-dependent (raw booleans/doubles, not AMF), so 2.33 dispatches by
// PARSE FAILURE, not by the embedded version string. Prefix-less codes/blobs
// go straight to the CE-layout reader (Legacy2_24, :989-1100); prefixed codes
// use the 2.33 reader (:3246-3378), whose exception falls back through
// Legacy2_31 (:1221-1352 — 2.31.x stored min/maxFriction + min/maxRestitution
// INLINE between maxDensity and maxRJStrength, hence incompatible) to
// Legacy2_30 (:1107-1219 — plain CE layout re-read). Each retry rewinds to the
// pre-parts position (`lastDataPos`, :3258 / :1234 / :1112).
//
// The common body reads, in order: settings (AMF3 object) -> 10 permission
// booleans -> minDensity/maxDensity [-> 4 inline friction doubles, 2.31 only]
// -> 5 limit doubles -> buildAreas -> winConditions -> lossConditions ->
// winConditionsAnded -> (optional) camera floats (clamped, §5) -> (optional)
// nonColliding/showConditions -> (optional) cannons, defaulted when absent.

function readChallengeBodyAfterParts(data: ByteArray, partData: Part[], inlineFriction: boolean): Challenge {
	const settings = data.readObject() as any;
	const c = new Challenge(
		applyWaterSettings(
			new SandboxSettings(
				settings.gravity,
				settings.size,
				settings.terrainType,
				settings.terrainTheme,
				settings.background,
				settings.backgroundR,
				settings.backgroundG,
				settings.backgroundB,
			),
			settings,
		),
	);
	c.allParts = partData;
	c.circlesAllowed = data.readBoolean();
	c.rectanglesAllowed = data.readBoolean();
	c.trianglesAllowed = data.readBoolean();
	c.fixedJointsAllowed = data.readBoolean();
	c.rotatingJointsAllowed = data.readBoolean();
	c.slidingJointsAllowed = data.readBoolean();
	c.thrustersAllowed = data.readBoolean();
	c.fixateAllowed = data.readBoolean();
	c.mouseDragAllowed = data.readBoolean();
	c.botControlAllowed = data.readBoolean();
	c.minDensity = data.readDouble();
	c.maxDensity = data.readDouble();
	if (inlineFriction) {
		// 2.31.x-only inline material limits (Database.as:1253-1256).
		c.minFriction = data.readDouble();
		c.maxFriction = data.readDouble();
		c.minRestitution = data.readDouble();
		c.maxRestitution = data.readDouble();
	}
	c.maxRJStrength = data.readDouble();
	c.maxRJSpeed = data.readDouble();
	c.maxSJStrength = data.readDouble();
	c.maxSJSpeed = data.readDouble();
	c.maxThrusterStrength = data.readDouble();

	const buildAreas = data.readObject() as any[];
	c.buildAreas = [];
	for (let i = 0; i < buildAreas.length; i++) {
		const area = new b2AABB();
		area.lowerBound = Util.Vector(buildAreas[i].lowerBound.x, buildAreas[i].lowerBound.y);
		area.upperBound = Util.Vector(buildAreas[i].upperBound.x, buildAreas[i].upperBound.y);
		c.buildAreas.push(area);
	}

	const allShapes = partData.filter(isShape);

	let conditions = data.readObject() as any[];
	for (let i = 0; i < conditions.length; i++) {
		const cond = new WinCondition(conditions[i].name, conditions[i].subject, conditions[i].object);
		cond.minX = conditions[i].minX;
		cond.maxX = conditions[i].maxX;
		cond.minY = conditions[i].minY;
		cond.maxY = conditions[i].maxY;
		if (
			conditions[i].shape1Index !== -1 &&
			conditions[i].shape1Index < allShapes.length &&
			allShapes[conditions[i].shape1Index]
		)
			cond.shape1 = allShapes[conditions[i].shape1Index] as ShapePart;
		if (
			conditions[i].shape2Index !== -1 &&
			conditions[i].shape2Index < allShapes.length &&
			allShapes[conditions[i].shape2Index]
		)
			cond.shape2 = allShapes[conditions[i].shape2Index] as ShapePart;
		c.winConditions.push(cond);
	}

	conditions = data.readObject() as any[];
	for (let i = 0; i < conditions.length; i++) {
		const con = new LossCondition(
			conditions[i].name,
			conditions[i].subject,
			conditions[i].object,
			conditions[i].immediate,
		);
		con.minX = conditions[i].minX;
		con.maxX = conditions[i].maxX;
		con.minY = conditions[i].minY;
		con.maxY = conditions[i].maxY;
		if (
			conditions[i].shape1Index !== -1 &&
			conditions[i].shape1Index < allShapes.length &&
			allShapes[conditions[i].shape1Index]
		)
			con.shape1 = allShapes[conditions[i].shape1Index] as ShapePart;
		if (
			conditions[i].shape2Index !== -1 &&
			conditions[i].shape2Index < allShapes.length &&
			allShapes[conditions[i].shape2Index]
		)
			con.shape2 = allShapes[conditions[i].shape2Index] as ShapePart;
		c.lossConditions.push(con);
	}

	c.winConditionsAnded = data.readBoolean();
	if (data.position !== data.length) {
		c.cameraX = data.readFloat();
		c.cameraY = data.readFloat();
		c.zoomLevel = data.readFloat();
		// Camera-zoom fix (§5): every Jaybit challenge reader clamps the three
		// floats on load (Database.as:1067-1085 / :1186-1204 / :1315-1332 / :3334-3352).
		if (c.cameraX === Number.POSITIVE_INFINITY || c.cameraX === Number.MAX_VALUE) c.cameraX = 0;
		if (c.cameraY === Number.POSITIVE_INFINITY || c.cameraY === Number.MAX_VALUE) c.cameraY = 0;
		if (c.zoomLevel === Number.POSITIVE_INFINITY || c.zoomLevel === Number.MAX_VALUE) c.zoomLevel = INIT_PHYS_SCALE;
	}
	if (data.position !== data.length) {
		c.nonCollidingAllowed = data.readBoolean();
		c.showConditions = data.readBoolean();
	}
	if (data.position !== data.length) {
		c.cannonsAllowed = data.readBoolean();
	} else {
		c.cannonsAllowed =
			c.rectanglesAllowed &&
			c.slidingJointsAllowed &&
			c.rotatingJointsAllowed &&
			c.slidingJointsAllowed &&
			c.thrustersAllowed;
	}
	return c;
}

/**
 * The 2.33 reader (Database.as:3246-3378): CE body + the seven appended
 * fields, each guarded by end-of-stream so pre-2.33 blobs default exactly as
 * Jaybit (:3367-3372 — note triggersAllowed defaults FALSE on old data, while
 * the in-memory Challenge constructor default is true). Parts are read outside
 * the try (as Jaybit); a body parse failure falls back to Legacy2_31.
 */
function extractChallengeFromByteArray(data: ByteArray): Challenge {
	const lastDataPos = data.position;
	const partData = extractPartsFromByteArray(data);
	try {
		const c = readChallengeBodyAfterParts(data, partData, false);
		c.triggersAllowed = data.position !== data.length ? data.readBoolean() : false;
		c.collisionGroupsAllowed = data.position !== data.length ? data.readBoolean() : false;
		c.minFriction = data.position !== data.length ? data.readDouble() : Number.MAX_VALUE;
		c.maxFriction = data.position !== data.length ? data.readDouble() : Number.MAX_VALUE;
		c.minRestitution = data.position !== data.length ? data.readDouble() : Number.MAX_VALUE;
		c.maxRestitution = data.position !== data.length ? data.readDouble() : Number.MAX_VALUE;
		c.subCollisionsAllowed = data.position !== data.length ? data.readBoolean() : true;
		return c;
	} catch {
		return extractChallengeFromByteArrayLegacy2_31(data, lastDataPos);
	}
}

/** 2.31.x layout: inline friction doubles + a single trailing triggersAllowed (:1221-1352). */
function extractChallengeFromByteArrayLegacy2_31(data: ByteArray, lastDataPos: number): Challenge {
	data.position = lastDataPos;
	const partData = extractPartsFromByteArray(data);
	try {
		const c = readChallengeBodyAfterParts(data, partData, true);
		c.triggersAllowed = data.position !== data.length ? data.readBoolean() : false;
		return c;
	} catch {
		return extractChallengeFromByteArrayLegacy2_30(data, lastDataPos);
	}
}

/** 2.30 layout: plain CE body re-read after a rewind (:1107-1219). */
function extractChallengeFromByteArrayLegacy2_30(data: ByteArray, lastDataPos: number): Challenge {
	data.position = lastDataPos;
	const partData = extractPartsFromByteArray(data);
	return readChallengeBodyAfterParts(data, partData, false);
}

/** Plain CE layout, no rewind — the reader for prefix-less codes (:989-1100). */
function extractChallengeFromByteArrayLegacy2_24(data: ByteArray): Challenge {
	const partData = extractPartsFromByteArray(data);
	return readChallengeBodyAfterParts(data, partData, false);
}

// --- Challenge -> ByteArray -----------------------------------------------
//
// Verbatim port of Database.PutChallengeIntoByteArray (Database.ts:1726-1812),
// the inverse of extractChallengeFromByteArray. Writes: parts (AMF3) -> settings
// -> 10 permission booleans -> 7 numeric limit doubles -> buildAreas -> win/loss
// conditions (with resolved shape indices) -> winConditionsAnded -> camera floats
// -> nonColliding/showConditions/cannons booleans. Conditions whose required
// shape reference could not be resolved are dropped exactly as the legacy does.

function putChallengeIntoByteArray(challenge: Challenge): ByteArray {
	const b = putPartsIntoByteArray(challenge.allParts, new ByteArray());
	// The legacy re-decodes the just-written parts to get the SAME re-ordered
	// shape array the reader will see, so condition shape indices line up.
	b.position = 0;
	const partData = extractPartsFromByteArray(b);
	b.position = b.length;

	b.writeObject(challenge.settings);
	b.writeBoolean(challenge.circlesAllowed);
	b.writeBoolean(challenge.rectanglesAllowed);
	b.writeBoolean(challenge.trianglesAllowed);
	b.writeBoolean(challenge.fixedJointsAllowed);
	b.writeBoolean(challenge.rotatingJointsAllowed);
	b.writeBoolean(challenge.slidingJointsAllowed);
	b.writeBoolean(challenge.thrustersAllowed);
	b.writeBoolean(challenge.fixateAllowed);
	b.writeBoolean(challenge.mouseDragAllowed);
	b.writeBoolean(challenge.botControlAllowed);
	b.writeDouble(challenge.minDensity);
	b.writeDouble(challenge.maxDensity);
	b.writeDouble(challenge.maxRJStrength);
	b.writeDouble(challenge.maxRJSpeed);
	b.writeDouble(challenge.maxSJStrength);
	b.writeDouble(challenge.maxSJSpeed);
	b.writeDouble(challenge.maxThrusterStrength);
	b.writeObject(challenge.buildAreas);

	const allShapes = partData.filter(isShape) as ShapePart[];
	for (let i = challenge.winConditions.length - 1; i >= 0; i--) {
		const wc = challenge.winConditions[i];
		if (wc.shape1) {
			for (let j = 0; j < allShapes.length; j++) {
				if (wc.shape1.equals(allShapes[j])) {
					wc.shape1Index = j;
					break;
				}
			}
		}
		if (wc.shape2) {
			for (let j = 0; j < allShapes.length; j++) {
				if (wc.shape2.equals(allShapes[j])) {
					wc.shape2Index = j;
					break;
				}
			}
		}
		if ((wc.subject === 0 && wc.shape1Index === -1) || (wc.object > 4 && wc.shape2Index === -1)) {
			challenge.winConditions = Util.RemoveFromArray(wc, challenge.winConditions);
		}
	}
	for (let i = challenge.lossConditions.length - 1; i >= 0; i--) {
		const lc = challenge.lossConditions[i];
		if (lc.shape1) {
			for (let j = 0; j < allShapes.length; j++) {
				if (lc.shape1.equals(allShapes[j])) {
					lc.shape1Index = j;
					break;
				}
			}
		}
		if (lc.shape2) {
			for (let j = 0; j < allShapes.length; j++) {
				if (lc.shape2.equals(allShapes[j])) {
					lc.shape2Index = j;
					break;
				}
			}
		}
		if ((lc.subject === 0 && lc.shape1Index === -1) || (lc.object > 4 && lc.shape2Index === -1)) {
			challenge.lossConditions = Util.RemoveFromArray(lc, challenge.lossConditions);
		}
	}
	b.writeObject(challenge.winConditions);
	b.writeObject(challenge.lossConditions);
	// Reset the transient indices exactly as the legacy does (they are only valid
	// for the duration of the write).
	for (let i = 0; i < challenge.winConditions.length; i++) {
		challenge.winConditions[i].shape1Index = -1;
		challenge.winConditions[i].shape2Index = -1;
	}
	for (let i = 0; i < challenge.lossConditions.length; i++) {
		challenge.lossConditions[i].shape1Index = -1;
		challenge.lossConditions[i].shape2Index = -1;
	}
	b.writeBoolean(challenge.winConditionsAnded);
	b.writeFloat(challenge.cameraX);
	b.writeFloat(challenge.cameraY);
	b.writeFloat(challenge.zoomLevel);
	b.writeBoolean(challenge.nonCollidingAllowed);
	b.writeBoolean(challenge.showConditions);
	b.writeBoolean(challenge.cannonsAllowed);
	// The seven Jaybit-appended fields, in the exact 2.33 order
	// (PutChallengeIntoByteArray, Database.as:3622-3628).
	b.writeBoolean(challenge.triggersAllowed);
	b.writeBoolean(challenge.collisionGroupsAllowed);
	b.writeDouble(challenge.minFriction);
	b.writeDouble(challenge.maxFriction);
	b.writeDouble(challenge.minRestitution);
	b.writeDouble(challenge.maxRestitution);
	b.writeBoolean(challenge.subCollisionsAllowed);
	return b;
}

/** A decoded challenge export: the Challenge plus its header metadata. */
export interface DecodedChallenge {
	challenge: Challenge;
	name: string;
	desc: string;
	/** The embedded "2.33.0.1 ibch"-style version string; null on legacy CE codes. */
	version: string | null;
	/** Decoded exposure (SaveWindow enum) — legacy codes map to public+editable. */
	exposure: ExposureFlags;
}

/**
 * Decode a challenge EXPORT STRING into a Challenge + header metadata.
 * Faithful port of Jaybit's Database.ImportChallenge (:275-308): base64-decode
 * -> uncompress -> the prefix sentinel dance -> shared/exposure ints (the
 * challenge header has NO "prop" int, unlike robots) -> then PREFIXED codes go
 * to the 2.33 reader (whose parse failure falls through the Legacy2_31 ->
 * Legacy2_30 chain) while prefix-less legacy codes go straight to the CE-layout
 * Legacy2_24 reader. Node-clean.
 */
export async function decodeChallengeWithMeta(challengeStr: string): Promise<DecodedChallenge> {
	const decoder = new Base64Decoder();
	decoder.decode(challengeStr);
	const b = decoder.toByteArray();
	await b.uncompress();
	return decodeChallengeFromHeaderedBytes(b);
}

/** Shared tail of decodeChallengeWithMeta / decodeChallengeFile. */
function decodeChallengeFromHeaderedBytes(b: ByteArray): DecodedChallenge {
	const { name, version } = readVersionedNameHeader(b);
	const desc = b.readUTF();
	b.readInt(); // shared
	const exposure = decodeExposureInt(b.readInt());
	const challenge = version !== null ? extractChallengeFromByteArray(b) : extractChallengeFromByteArrayLegacy2_24(b);
	return { challenge, name, desc, version, exposure };
}

/**
 * Decode a challenge EXPORT STRING into a live Challenge (metadata discarded —
 * see decodeChallengeWithMeta for the header-aware variant).
 */
export async function decodeChallenge(challengeStr: string): Promise<Challenge> {
	return (await decodeChallengeWithMeta(challengeStr)).challenge;
}

/**
 * Decode a user .ibch FILE (or a text code pasted into a file): bytes starting
 * with "eN" are a base64 text code; anything else is the raw compressed blob
 * WITH the name/desc/exposure header (unlike the headerless built-in .dat
 * blobs — keep decodeChallengeBlob for those). Mirrors Jaybit's
 * LoadChallengeFromFileBytes (:1575-1608).
 */
export async function decodeChallengeFile(bytes: ArrayBuffer | Uint8Array): Promise<DecodedChallenge> {
	const sniffed = sniffFileBytes(bytes);
	if (sniffed.kind === "code") return decodeChallengeWithMeta(sniffed.code);
	const b = new ByteArray(bytes as ArrayBuffer);
	await b.uncompress();
	b.position = 0;
	return decodeChallengeFromHeaderedBytes(b);
}

/**
 * Build the compressed challenge export blob (= .ibch file bytes = the base64
 * payload of the text code). Header layout is Jaybit's ExportChallenge
 * (Database.as:1948-1974): prefix UTF, version + " ibch" UTF, name, desc,
 * writeInt(1) shared, writeInt(expo + 2) — NO third int (robots have "prop",
 * challenges do not) — then the PutChallengeIntoByteArray body, compressed.
 */
async function buildChallengeExportBytes(
	challenge: Challenge,
	name: string,
	desc: string,
	expo: number,
): Promise<ByteArray> {
	const challengeData = putChallengeIntoByteArray(challenge);
	const exportData = new ByteArray();
	exportData.writeUTF(VERSION_PREFIX);
	exportData.writeUTF(VERSION_STRING + TYPE_TAG_CHALLENGE);
	exportData.writeUTF(name);
	exportData.writeUTF(desc);
	exportData.writeInt(1); // shared
	exportData.writeInt(expo + 2); // exposure (Jaybit writes expo + 2)
	challengeData.position = 0;
	exportData.writeBytes(challengeData);
	await exportData.compress();
	return exportData;
}

/**
 * Encode a Challenge to the export STRING (base64 of the zlib-compressed
 * Jaybit-format blob). Round-trips with decodeChallenge / loads in Jaybit.
 */
export async function encodeChallenge(
	challenge: Challenge,
	name = "",
	desc = "",
	expo: number = EXPO_PUBLIC_EDITABLE,
): Promise<string> {
	const exportData = await buildChallengeExportBytes(challenge, name, desc, expo);
	return exportData.buffer.toString("base64");
}

/**
 * Encode a Challenge to .ibch FILE bytes — byte-identical to the base64-decode
 * of encodeChallenge's string (files carry no extra framing, §3).
 */
export async function exportChallengeFile(
	challenge: Challenge,
	name = "",
	desc = "",
	expo: number = EXPO_PUBLIC_EDITABLE,
): Promise<Uint8Array> {
	const exportData = await buildChallengeExportBytes(challenge, name, desc, expo);
	return new Uint8Array(exportData.buffer);
}

/**
 * Decode a built-in challenge blob (race.dat / spaceship.dat bytes) into a live
 * Challenge. Mirrors the ControllerRace / ControllerSpaceship ctor path
 * (ControllerRace.ts:19-20): construct a ByteArray from the compressed bytes,
 * uncompress it, then ExtractChallengeFromByteArray — the 2.33 reader, exactly
 * as Jaybit's built-in loaders, so the CE-era blobs pick up the Jaybit
 * absent-trailer defaults (triggersAllowed=false etc.). `blob` is the raw asset
 * bytes (from `fetch(resource).arrayBuffer()` in the browser, or `readFileSync`
 * in tests). async because ByteArray.uncompress() is async.
 */
export async function decodeChallengeBlob(blob: ArrayBuffer | Uint8Array): Promise<Challenge> {
	const b = new ByteArray(blob as ArrayBuffer);
	await b.uncompress();
	b.position = 0;
	return extractChallengeFromByteArray(b);
}
