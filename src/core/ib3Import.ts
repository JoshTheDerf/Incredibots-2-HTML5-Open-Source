// IB3 (IncrediBots 3) file/code import — node-clean (no pixi; check:core gates).
//
// Decodes the IncrediBots 3 export format and maps it into this stack's
// DecodedRobot { parts, settings, camera, meta }. Ground truth is the IB3
// decompiled ActionScript under ib3-decompiled/scripts:
//   - General/Database.as  LoadFromByteArray / ImportBot / ExtractPartsFromObject /
//     ExtractSandboxSettingsFromObject / MapToParts / CompareVersions
//   - Parts/*.as           part model + field defaults/units
//   - General/Util.as      unit conversions (DensityToBox2D etc.)
//   - Control/SandboxSettings.as + Control/Ground.as + Control/Graphics/Sky.as
//
// IB3 export stream (Database.SaveIntoByteArray :219-249, zlib-compressed then
// base64 for codes; files are the raw zlib bytes):
//   writeUTF(version "0.00.33b")   writeInt(type)   // 0 robot,1 replay,2 challenge
//   writeObject(Vector.<Part>)     writeObject(sandboxSettings)   // AMF3
//   writeUTF(creatorName) writeUTF(creatorId) writeUTF(id)
//   writeUTF(name) writeUTF(description)
//   writeInt(exposure) writeInt(editable)
//   [replay: uint replayLength, obj syncPoints/keyPresses/triggerPresses/
//    cameraMovements[/mouseJointDrags][/double frameRate]]
//   [writeUTF(editPassword) — EOF-guarded]
// Robot(0) + challenge(2) import as designs; replay(1) imports the EMBEDDED bot
// (parts+settings) and DISCARDS the recording (documented deviation).
//
// ---------------------------------------------------------------------------
// UNIT CONVERSION TABLE (IB3 field -> IB2 field -> formula; verified to preserve
// the resulting Box2D value where possible, else the closest value-preserving
// clamp with a warning):
//
//   density      -> density        pass-through. Both engines use (d+5)/10;
//                                   IB2 Init is unclamped so 1..40 preserved.
//   friction     -> friction       f2 = clamp(1,30, f3 - 5).
//                                   IB3 box2d f3/40 == IB2 (f2+5)/40 => f2=f3-5.
//                                   default 16 -> 11 (== IB2 default, box2d 0.4).
//   restitution  -> restitution    r2 = clamp(1,30, r3*1.25 - 8).
//                                   IB3 box2d r3/40 == IB2 (r2+8)/50 => r2=r3*1.25-8.
//                                   default 12 -> 7 (== IB2 default, box2d 0.3).
//                                   (<=0.00.18a fix-up r3 = stored/54.8*40 first.)
//   gravityY     -> gravity        g2 = g3 / 1.63098878695 (Util.GravityToBox2D).
//                                   IB3 gravityY is a 1..40 UI value; IB2 gravity
//                                   is the raw m/s^2 world value, so we DIVIDE
//                                   (NOT a pass-through). default 16 -> 9.809.
//   RJ strength  -> motorStrength   s2 = s3 / 3 (IB3 torque s3*10 == IB2 s2*30).
//   RJ speed     -> motorSpeed      pass-through (both rad/s).
//   RJ lower/up  -> motorLower/Up   deg; IB2 lower is signed => motorLower=-lower3.
//   SJ strength  -> pistonStrength  pass-through (both maxMotorForce = s*30).
//   SJ speed     -> pistonSpeed     p2 = s3 * 2.5 (IB2 drives speed*0.4).
//   TH strength  -> strength        s2 = sqrt(max(0,(s3*452/3 - 10)/10)) — IB3
//                                   force is linear s3*452/3, IB2 is 10+s2^2*10.
//   TH angle     -> angle           a2 = a3 - PI/2 (IB3 subtracts PI/2 at apply).
//   bomb strength-> strength        pass-through (both blast force = s*100).
//   bomb delay   -> delay(ms)       pass-through (<=0.00.10a fix-up frames->ms).
//   bomb sens.   -> sensitivity     pass-through (<=0.00.22a remap fix-up).
//   key codes    -> key codes       pass-through (Flash keyCodes == JS keyCodes).
//   color(uint)  -> red/green/blue  channel split.
// ---------------------------------------------------------------------------

import { ByteArray } from "../General/ByteArray";
import { SandboxSettings } from "../Game/SandboxSettings";
import { Base64Decoder } from "../mx/utils/Base64Decoder";
import { Bomb } from "../Parts/Bomb";
import { Circle } from "../Parts/Circle";
import { FixedJoint } from "../Parts/FixedJoint";
import { JointPart } from "../Parts/JointPart";
import type { Part } from "../Parts/Part";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { Rectangle } from "../Parts/Rectangle";
import { RevoluteJoint } from "../Parts/RevoluteJoint";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import { Triangle } from "../Parts/Triangle";
import { EXPO_PUBLIC_EDITABLE, EXPO_PUBLIC_UNEDITABLE, type ExposureFlags } from "./exposure";
import type { DecodedRobot } from "./robotSerialization";
import { VERSION_PREFIX } from "./serializationVersion";

/** Database.IB_ERRORS (Database.as:48). */
export const IB_ERRORS = [
	"Could not read IB3 save data. Data may be incomplete, corrupted, or non-IB3 data.",
	"Alpha key needed.",
	"Invalid alpha key.",
	"New wrapper version required.",
	"Non-serialized code (non-IB3 data).",
];

/** Util.GravityToBox2D divisor (Util.as:307-310). */
const GRAVITY_DIVISOR = 1.63098878695;

/** IB3 BotInfo.type (BotInfo.as). */
export const IB3_TYPE_ROBOT = 0;
export const IB3_TYPE_REPLAY = 1;
export const IB3_TYPE_CHALLENGE = 2;

/** IB3 provenance carried alongside the decoded design. */
export interface IB3Meta {
	version: string;
	type: number;
	creatorName: string;
	creatorId: string;
	id: string;
	name: string;
	description: string;
	exposure: number;
	editable: number;
}

export interface IB3ImportResult {
	robot: DecodedRobot;
	ib3: IB3Meta;
	warnings: string[];
}

// --- small helpers ---------------------------------------------------------

function has(o: unknown, k: string): boolean {
	return o != null && Object.prototype.hasOwnProperty.call(o, k);
}
function num(v: unknown, d = 0): number {
	return typeof v === "number" && isFinite(v) ? v : d;
}
function trunc(v: unknown, d = 0): number {
	return Math.trunc(num(v, d));
}
function clamp(lo: number, hi: number, v: number): number {
	return v < lo ? lo : v > hi ? hi : v;
}
function red(c: number): number {
	return (c >>> 16) & 0xff;
}
function green(c: number): number {
	return (c >>> 8) & 0xff;
}
function blue(c: number): number {
	return c & 0xff;
}
function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

const SAMEVERSION = 0;
const OLDVERSION = -1;
const NEWVERSION = 1;

/**
 * Database.CompareVersions (Database.as:1099-1187): returns NEWVERSION(1) if
 * `b` is newer than `a`, OLDVERSION(-1) if older, SAMEVERSION(0) if equal.
 * Alpha/beta/release suffixes (a/b/r) are stripped and ordered so that
 * `2.0a < 2.0b < 2.0`. Used for the version-gated load fix-ups.
 */
export function compareVersions(a: string, b: string): number {
	let bHasA = false;
	let bHasB = false;
	let aHasA = false;
	let aHasB = false;
	let lb = b.toLowerCase();
	if (lb.indexOf("a") > -1) {
		bHasA = true;
		b = b.substring(0, lb.indexOf("a"));
	}
	lb = b.toLowerCase();
	if (lb.indexOf("b") > -1) {
		bHasB = true;
		b = b.substring(0, lb.indexOf("b"));
	}
	lb = b.toLowerCase();
	if (lb.indexOf("r") > -1) {
		b = b.substring(0, lb.indexOf("r"));
	}
	let la = a.toLowerCase();
	if (la.indexOf("a") > -1) {
		aHasA = true;
		a = a.substring(0, la.indexOf("a"));
	}
	la = a.toLowerCase();
	if (la.indexOf("b") > -1) {
		aHasB = true;
		a = a.substring(0, la.indexOf("b"));
	}
	la = a.toLowerCase();
	if (la.indexOf("r") > -1) {
		a = a.substring(0, la.indexOf("r"));
	}
	const aParts = a.split(".", 3);
	const bParts = b.split(".", 3);
	const aNums: number[] = [];
	const bNums: number[] = [];
	for (let i = 0; i < 3; i++) {
		aNums.push(i < aParts.length ? parseInt(aParts[i]) || 0 : 0);
		bNums.push(i < bParts.length ? parseInt(bParts[i]) || 0 : 0);
	}
	for (let i = 0; i < aNums.length; i++) {
		if (bNums[i] > aNums[i]) return NEWVERSION;
		if (bNums[i] < aNums[i]) return OLDVERSION;
	}
	if (aHasA && (bHasB || (!bHasB && !bHasA))) return NEWVERSION;
	if (aHasB && !bHasB && !bHasA) return NEWVERSION;
	return SAMEVERSION;
}

/** True when `version` is at or before `ref` (used for the load fix-ups). */
function atOrBefore(ref: string, version: string): boolean {
	return compareVersions(ref, version) <= SAMEVERSION;
}

// --- detection -------------------------------------------------------------

/** IB3 codes start with a version string like "0.00.33b". */
const IB3_VERSION_RE = /^\d+\.\d+\.\d+[abr]?/;

/**
 * Detect an IB3 stream (PLAN.md detection): a native/Jaybit code starts with
 * the UTF sentinel "kezcuvwistoup" or a user-typed name; an IB3 code starts
 * with a version-string UTF followed by an int type in 0..2. `b` must be the
 * INFLATED ByteArray; position is saved and restored.
 */
export function looksLikeIB3(b: ByteArray): boolean {
	const savedPos = b.position;
	try {
		b.position = 0;
		const first = b.readUTF();
		if (first === VERSION_PREFIX) return false; // native Jaybit
		if (!IB3_VERSION_RE.test(first)) return false; // native CE (name-first)
		const type = b.readInt();
		return type >= 0 && type <= 2;
	} catch {
		return false;
	} finally {
		b.position = savedPos;
	}
}

// --- public decode ---------------------------------------------------------

/**
 * Decode an IB3 export CODE (base64 string) or FILE bytes (raw zlib) into a
 * DecodedRobot plus IB3 provenance and lossy-conversion warnings. Throws
 * IB_ERRORS[0] on corrupt/truncated data.
 */
export async function decodeIB3(input: string | ArrayBuffer | Uint8Array): Promise<IB3ImportResult> {
	let b: ByteArray;
	if (typeof input === "string") {
		const decoder = new Base64Decoder();
		decoder.decode(input);
		b = decoder.toByteArray();
	} else {
		b = new ByteArray(input as ArrayBuffer);
	}
	await b.uncompress();
	b.position = 0;
	return decodeIB3FromByteArray(b);
}

/**
 * Decode from an already-inflated ByteArray positioned anywhere (reset to 0).
 * The robot-import wiring calls this directly after its own uncompress + sniff.
 */
export function decodeIB3FromByteArray(b: ByteArray): IB3ImportResult {
	const warnings = new Set<string>();
	let meta: IB3Meta;
	let partsObj: unknown;
	let settingsObj: unknown;
	try {
		b.position = 0;
		const version = b.readUTF();
		const type = b.readInt();
		partsObj = b.readObject();
		settingsObj = b.readObject();
		const creatorName = b.readUTF();
		const creatorId = b.readUTF();
		const id = b.readUTF();
		const name = b.readUTF();
		const description = b.readUTF();
		const exposure = b.readInt();
		const editable = b.readInt();
		meta = { version, type, creatorName, creatorId, id, name, description, exposure, editable };
	} catch {
		throw new Error(IB_ERRORS[0]);
	}
	const arr = partsObj as { length?: number } | null;
	if (!arr || typeof arr.length !== "number") throw new Error(IB_ERRORS[0]);
	const settings = settingsObj as Record<string, unknown> | null;

	const parts = mapParts(arr as unknown[], meta.version, warnings);
	const sandbox = mapSettings(settings ?? {}, meta.version, warnings);

	if (meta.type === IB3_TYPE_REPLAY) {
		warnings.add("IB3 replay imported as a design; the recorded run was discarded.");
	}

	const cameraX = settings && has(settings, "cameraX") ? num(settings.cameraX, 0) : 0;
	const cameraY = settings && has(settings, "cameraY") ? num(settings.cameraY, 0) : 0;
	const zoomLevel = settings && has(settings, "cameraZoom") ? num(settings.cameraZoom, 30) : 30;

	const robot: DecodedRobot = {
		parts,
		settings: sandbox,
		cameraX,
		cameraY,
		zoomLevel,
		name: meta.name,
		desc: meta.description,
		version: meta.version,
		exposure: mapExposure(meta),
	};
	return { robot, ib3: meta, warnings: [...warnings] };
}

/**
 * IB3's own exposure enum is not 1:1 with IB2's SaveWindow enum; only the
 * `editable` flag (which gates the editor / challenge editor) is honored.
 */
function mapExposure(meta: IB3Meta): ExposureFlags {
	const isEditable = meta.editable !== 0;
	return { expo: isEditable ? EXPO_PUBLIC_EDITABLE : EXPO_PUBLIC_UNEDITABLE, isPublic: true, isEditable };
}

// --- parts -----------------------------------------------------------------

interface BuiltShape {
	primary: ShapePart;
	extra: Part[];
}

function mapParts(arr: unknown[], version: string, warnings: Set<string>): Part[] {
	const parts: Part[] = [];
	// IB3 index -> the primary IB2 ShapePart the joints/thrusters resolve against
	// (null for joints/thrusters/text/unmapped). Joints hold direct references
	// (not indices), so a polygon's fan-triangulation shifting the array is fine.
	const shapeByIndex: (ShapePart | null)[] = new Array(arr.length).fill(null);
	const jointDefs: { od: Record<string, unknown>; index: number }[] = [];
	const thrusterDefs: { od: Record<string, unknown>; index: number }[] = [];

	// Pass 1: shapes + text (create the primary parts joints will reference).
	for (let i = 0; i < arr.length; i++) {
		const od = arr[i] as Record<string, unknown> | null;
		if (!od) continue;
		const nm = od.name;
		if (nm === "Rectangle" || nm === "Triangle" || nm === "Polygon" || nm === "Circle" || nm === "Bomb") {
			const built = buildShape(nm as string, od, version, warnings);
			if (!built) continue;
			for (const sp of [built.primary, ...built.extra]) {
				if (sp instanceof ShapePart) applyCommonShapeFields(sp, od, version, warnings);
				applyCommonPartFields(sp, od, warnings);
			}
			shapeByIndex[i] = built.primary;
			parts.push(built.primary, ...built.extra);
		} else if (nm === "TextPart") {
			const t = buildText(od, warnings);
			applyCommonPartFields(t, od, warnings);
			parts.push(t);
		} else if (nm === "Fixed joint" || nm === "Rotating joint" || nm === "Sliding joint") {
			jointDefs.push({ od, index: i });
		} else if (nm === "Thrusters") {
			thrusterDefs.push({ od, index: i });
		} else {
			warnings.add(`An unknown IB3 part type ("${String(nm)}") was skipped.`);
		}
	}

	// Pass 2: joints (Database.MapToParts :1068-1097 — attach only when both
	// referenced parts resolved to shapes).
	for (const { od } of jointDefs) {
		const joint = buildJoint(od, shapeByIndex, warnings);
		if (joint) parts.push(joint);
	}

	// Pass 3: thrusters.
	for (const { od } of thrusterDefs) {
		const idx = trunc(od.partIndex, -1);
		const shp = idx >= 0 && idx < shapeByIndex.length ? shapeByIndex[idx] : null;
		if (!shp) {
			warnings.add("A thruster referenced a missing/unmapped part and was skipped.");
			continue;
		}
		const t = new Thrusters(shp, num(od.x), num(od.y));
		// IB3 applies thrust at (angle + bodyAngle - PI/2); IB2 at (angle + bodyAngle).
		if (has(od, "angle")) t.angle = num(od.angle) - Math.PI / 2;
		if (has(od, "strength")) {
			// IB3 force = clamp(0,40)*452/3 (linear); IB2 force = 10 + s^2*10.
			const force = clamp(0, 40, num(od.strength)) * (452 / 3);
			t.strength = Math.sqrt(Math.max(0, (force - 10) / 10));
		}
		if (has(od, "thrustKey")) t.thrustKey = trunc(od.thrustKey);
		if (has(od, "autoOn")) t.autoOn = Boolean(od.autoOn);
		if (has(od, "enableKey") && !od.enableKey) {
			warnings.add("IB3 thruster 'enable key' toggle has no IB2 equivalent (thruster always keyed).");
		}
		if (has(od, "triggerList") && String(od.triggerList).replace(/[, ]/g, "") !== "") {
			warnings.add("IB3 trigger wiring is not imported.");
		}
		applyCommonPartFields(t, od, warnings);
		parts.push(t);
	}

	return parts;
}

/** Read an IB3 vertex vector ([{x,y}, ...]). */
function readVerts(od: Record<string, unknown>): { x: number; y: number }[] {
	const raw = od.vertices as ArrayLike<{ x: unknown; y: unknown }> | undefined;
	const out: { x: number; y: number }[] = [];
	if (raw && typeof raw.length === "number") {
		for (let i = 0; i < raw.length; i++) out.push({ x: num(raw[i].x), y: num(raw[i].y) });
	}
	return out;
}

function buildShape(nm: string, od: Record<string, unknown>, version: string, warnings: Set<string>): BuiltShape | null {
	const cx = num(od.x);
	const cy = num(od.y);

	if (nm === "Circle") {
		const c = new Circle(cx, cy, num(od.radius, 0.5), true);
		c.angle = num(od.angle);
		return { primary: c, extra: [] };
	}
	if (nm === "Bomb") {
		const bomb = new Bomb(cx, cy, num(od.radius, 0.5), has(od, "blastRadius") ? num(od.blastRadius, 4) : 4, true);
		bomb.angle = num(od.angle);
		// strength: legacy field was `blastStrength`, then `strength` (Database.as:646-653).
		if (has(od, "blastStrength")) bomb.strength = num(od.blastStrength, bomb.strength);
		if (has(od, "strength")) bomb.strength = num(od.strength, bomb.strength);
		if (has(od, "delay")) {
			let d = num(od.delay);
			// <=0.00.10a stored delay in frames@30fps; convert to ms (Database.as:656-664).
			if (atOrBefore("0.00.10a", version)) d = (d / 30) * 1000;
			bomb.delay = Math.trunc(d);
		}
		if (has(od, "delayAfterTrigger")) bomb.delayAfterTrigger = Boolean(od.delayAfterTrigger);
		if (has(od, "explodeOnImpact")) bomb.explodeOnImpact = Boolean(od.explodeOnImpact);
		if (has(od, "delayAfterImpact")) bomb.delayAfterImpact = Boolean(od.delayAfterImpact);
		if (has(od, "repeat")) bomb.repeat = trunc(od.repeat);
		if (has(od, "repeatable")) bomb.repeatable = Boolean(od.repeatable);
		if (has(od, "sensitive")) bomb.sensitive = Boolean(od.sensitive);
		if (has(od, "sensitivity")) {
			let s = num(od.sensitivity);
			// <=0.00.22a sensitivity remap (Database.as:696-699).
			if (atOrBefore("0.00.22a", version)) s = (200 - (Math.sqrt(100 - (200 - s * 2)) + 10) * 10) / 2;
			bomb.sensitivity = s;
		}
		if (has(od, "deflect")) bomb.deflect = Boolean(od.deflect);
		return { primary: bomb, extra: [] };
	}
	if (nm === "Triangle") {
		const v = readVerts(od);
		if (v.length < 3) {
			warnings.add("An IB3 triangle with fewer than 3 vertices was skipped.");
			return null;
		}
		// Vertices are world-space (rotation is baked in), so angle stays 0.
		const t = new Triangle(v[0].x, v[0].y, v[1].x, v[1].y, v[2].x, v[2].y);
		return { primary: t, extra: [] };
	}
	if (nm === "Rectangle") {
		const v = readVerts(od);
		if (v.length === 4 && isNearRectangular(v)) {
			const r = recoverRect(v);
			// checkLimits=false keeps the exact recovered dimensions.
			const rect = new Rectangle(r.cx - r.w / 2, r.cy - r.h / 2, r.w, r.h, false);
			rect.angle = r.angle;
			return { primary: rect, extra: [] };
		}
		warnings.add("A non-rectangular IB3 'Rectangle' was split into welded triangles.");
		return triangulate(v, cx, cy);
	}
	if (nm === "Polygon") {
		const v = readVerts(od);
		warnings.add("IB3 polygons were split into fan-triangulated triangles welded with fixed joints (v1 approximation).");
		return triangulate(v, cx, cy);
	}
	return null;
}

/** Recover center/width/height/angle from a rectangle's 4 world-space verts. */
function recoverRect(v: { x: number; y: number }[]): { cx: number; cy: number; w: number; h: number; angle: number } {
	const cx = (v[0].x + v[1].x + v[2].x + v[3].x) / 4;
	const cy = (v[0].y + v[1].y + v[2].y + v[3].y) / 4;
	const w = dist(v[0], v[1]);
	const h = dist(v[1], v[2]);
	const angle = Math.atan2(v[1].y - v[0].y, v[1].x - v[0].x);
	return { cx, cy, w, h, angle };
}

/** Tolerance check that 4 verts form a (possibly rotated) rectangle. */
function isNearRectangular(v: { x: number; y: number }[]): boolean {
	const w1 = dist(v[0], v[1]);
	const h1 = dist(v[1], v[2]);
	const w2 = dist(v[2], v[3]);
	const h2 = dist(v[3], v[0]);
	const lenTol = 1e-3 * Math.max(1, w1, h1);
	if (Math.abs(w1 - w2) > lenTol || Math.abs(h1 - h2) > lenTol) return false;
	const eAx = v[1].x - v[0].x;
	const eAy = v[1].y - v[0].y;
	const eBx = v[2].x - v[1].x;
	const eBy = v[2].y - v[1].y;
	const denom = Math.hypot(eAx, eAy) * Math.hypot(eBx, eBy) || 1;
	return Math.abs((eAx * eBx + eAy * eBy) / denom) < 1e-2;
}

/**
 * Fan-triangulate an N-gon (v0,vi,vi+1) into IB2 Triangles welded with
 * FixedJoints so they simulate as one rigid body (Database polygon load has no
 * IB2 polygon type). The first triangle is the "primary" joints resolve to.
 */
function triangulate(v: { x: number; y: number }[], cx: number, cy: number): BuiltShape | null {
	if (v.length < 3) return null;
	const tris: Triangle[] = [];
	for (let i = 1; i < v.length - 1; i++) {
		tris.push(new Triangle(v[0].x, v[0].y, v[i].x, v[i].y, v[i + 1].x, v[i + 1].y));
	}
	const extra: Part[] = [];
	for (let i = 1; i < tris.length; i++) {
		extra.push(tris[i]);
		// Weld each subsequent triangle to the first at the polygon centre.
		extra.push(new FixedJoint(tris[0], tris[i], cx, cy));
	}
	return { primary: tris[0], extra };
}

function buildText(od: Record<string, unknown>, warnings: Set<string>): TextPart {
	const text = has(od, "text") ? String(od.text) : "";
	const t = new TextPart(null, num(od.x), num(od.y), num(od.width, 5), num(od.height, 2), text, true);
	if (has(od, "size")) t.size = num(od.size, t.size);
	if (has(od, "scaleWithZoom")) t.scaleWithZoom = Boolean(od.scaleWithZoom);
	if (has(od, "keyShow")) t.displayKey = trunc(od.keyShow, t.displayKey);
	// IB3 visible = !enableKey || visibleOnStart; IB2 alwaysVisible == shown-always.
	const enableKey = has(od, "enableKey") ? Boolean(od.enableKey) : false;
	t.alwaysVisible = !enableKey;
	if (enableKey && has(od, "visibleOnStart") && od.visibleOnStart) {
		warnings.add("IB3 text 'visible on start' with a key toggle is approximated (starts hidden).");
	}
	if (has(od, "angle") && num(od.angle) !== 0) {
		warnings.add("IB3 text rotation is not supported; text imported unrotated.");
	}
	return t;
}

function buildJoint(od: Record<string, unknown>, shapeByIndex: (ShapePart | null)[], warnings: Set<string>): JointPart | null {
	const nm = od.name;
	const i1 = trunc(od.part1Index, -1);
	const i2 = trunc(od.part2Index, -1);
	const p1 = i1 >= 0 && i1 < shapeByIndex.length ? shapeByIndex[i1] : null;
	const p2 = i2 >= 0 && i2 < shapeByIndex.length ? shapeByIndex[i2] : null;
	if (!p1 || !p2) {
		warnings.add("A joint referenced a missing/unmapped part and was skipped.");
		return null;
	}

	if (has(od, "triggerList") && String(od.triggerList).replace(/[, ]/g, "") !== "") {
		warnings.add("IB3 trigger wiring is not imported.");
	}

	if (nm === "Fixed joint") {
		return new FixedJoint(p1, p2, num(od.x), num(od.y));
	}
	if (nm === "Rotating joint") {
		const rj = new RevoluteJoint(p1, p2, num(od.x), num(od.y));
		if (has(od, "enableMotor")) rj.enableMotor = Boolean(od.enableMotor);
		if (has(od, "autoCW")) rj.autoCW = Boolean(od.autoCW);
		if (has(od, "autoCCW")) rj.autoCCW = Boolean(od.autoCCW);
		if (has(od, "keyCW")) rj.motorCWKey = trunc(od.keyCW, rj.motorCWKey);
		if (has(od, "keyCCW")) rj.motorCCWKey = trunc(od.keyCCW, rj.motorCCWKey);
		if (has(od, "strength")) rj.motorStrength = num(od.strength) / 3; // torque s3*10 == s2*30
		if (has(od, "speed")) rj.motorSpeed = num(od.speed);
		if (has(od, "floppy")) rj.isStiff = !Boolean(od.floppy);
		// IB3 limits are POSITIVE degrees; lower is negated at Init. MAX_VALUE == unlimited.
		const NO_LIMIT = 1e30;
		const upper = has(od, "upperLimit") ? num(od.upperLimit, Number.MAX_VALUE) : Number.MAX_VALUE;
		const lower = has(od, "lowerLimit") ? num(od.lowerLimit, Number.MAX_VALUE) : Number.MAX_VALUE;
		rj.motorUpperLimit = upper >= NO_LIMIT ? Number.MAX_VALUE : upper;
		rj.motorLowerLimit = lower >= NO_LIMIT ? -Number.MAX_VALUE : -lower;
		if ((has(od, "enableKeyCW") && !od.enableKeyCW) || (has(od, "enableKeyCCW") && !od.enableKeyCCW)) {
			warnings.add("IB3 rotating-joint per-direction key enable has no IB2 equivalent (both keys active).");
		}
		return rj;
	}
	if (nm === "Sliding joint") {
		const pj = new PrismaticJoint(
			p1,
			p2,
			num(od.anchor1x),
			num(od.anchor1y),
			num(od.anchor2x),
			num(od.anchor2y),
		);
		if (has(od, "enableMotor")) pj.enablePiston = Boolean(od.enableMotor);
		if (has(od, "strength")) pj.pistonStrength = num(od.strength); // both maxMotorForce = s*30
		if (has(od, "speed")) pj.pistonSpeed = num(od.speed) * 2.5; // IB2 drives speed*0.4
		if (has(od, "floppy")) pj.isStiff = !Boolean(od.floppy);
		const ae = has(od, "autoExpand") ? Boolean(od.autoExpand) : false;
		const ar = has(od, "autoRetract") ? Boolean(od.autoRetract) : false;
		pj.autoOscillate = ae || ar;
		if (ae !== ar) warnings.add("IB3 one-directional auto piston approximated as oscillation.");
		if (has(od, "keyExpand")) pj.pistonUpKey = trunc(od.keyExpand, pj.pistonUpKey);
		if (has(od, "keyRetract")) pj.pistonDownKey = trunc(od.keyRetract, pj.pistonDownKey);
		if (has(od, "collA")) pj.collA = Boolean(od.collA);
		if (has(od, "collB")) pj.collB = Boolean(od.collB);
		if (has(od, "collC")) pj.collC = Boolean(od.collC);
		if (has(od, "collD")) pj.collD = Boolean(od.collD);
		if (has(od, "selfColl")) pj.subColl = Boolean(od.selfColl);
		if (has(od, "buoyant")) pj.buoyant = Boolean(od.buoyant);
		if (has(od, "beginExpanded") && od.beginExpanded) {
			warnings.add("IB3 sliding-joint 'begin expanded' has no IB2 equivalent.");
		}
		if ((has(od, "enableKeyExpand") && !od.enableKeyExpand) || (has(od, "enableKeyRetract") && !od.enableKeyRetract)) {
			warnings.add("IB3 sliding-joint per-direction key enable has no IB2 equivalent (both keys active).");
		}
		return pj;
	}
	return null;
}

/** Material + collision + flags common to every IB3 ShapePart (Database.as:716-787). */
function applyCommonShapeFields(shape: ShapePart, od: Record<string, unknown>, version: string, warnings: Set<string>): void {
	// density passes through (both engines: (d+5)/10; IB2 Init unclamped).
	if (has(od, "density")) shape.density = num(od.density, shape.density);
	if (has(od, "friction")) {
		const conv = num(od.friction) - 5;
		shape.friction = clamp(1, 30, conv);
		if (conv < 1 || conv > 30) warnings.add("Some friction values were outside IB2's range and were clamped.");
	}
	if (has(od, "restitution")) {
		let r = num(od.restitution);
		if (atOrBefore("0.00.18a", version)) r = (r / 54.8) * 40; // pre-0.00.18a fix-up
		const conv = r * 1.25 - 8;
		shape.restitution = clamp(1, 30, conv);
		if (conv < 1 || conv > 30) warnings.add("Some restitution values were outside IB2's range and were clamped.");
	}
	if (has(od, "selfColl")) shape.subColl = Boolean(od.selfColl);
	if (has(od, "buoyant")) shape.buoyant = Boolean(od.buoyant);
	if (has(od, "fixated")) shape.isStatic = Boolean(od.fixated);
	if (has(od, "cameraFocus")) shape.isCameraFocus = Boolean(od.cameraFocus);
	if (has(od, "draggable")) shape.undragable = !Boolean(od.draggable);
	if (has(od, "collA")) shape.collA = Boolean(od.collA);
	if (has(od, "collB")) shape.collB = Boolean(od.collB);
	if (has(od, "collC")) shape.collC = Boolean(od.collC);
	if (has(od, "collD")) shape.collD = Boolean(od.collD);
	shape.collide = shape.collA || shape.collB || shape.collC || shape.collD;
	if (has(od, "fixedRotation") && od.fixedRotation) {
		warnings.add("IB3 'fixed rotation' has no IB2 equivalent and was ignored.");
	}
	if (has(od, "triggerList") && String(od.triggerList).replace(/[, ]/g, "") !== "") {
		warnings.add("IB3 trigger wiring is not imported.");
	}
}

/** Colour/opacity/outline/terrain common to every IB3 Part (Database.as:1026-1059). */
function applyCommonPartFields(p: Part, od: Record<string, unknown>, warnings: Set<string>): void {
	const anyp = p as unknown as Record<string, unknown>;
	if (has(od, "terrain") && "terrain" in anyp) anyp.terrain = Boolean(od.terrain);
	if (has(od, "color") && "red" in anyp) {
		const c = num(od.color);
		anyp.red = red(c);
		anyp.green = green(c);
		anyp.blue = blue(c);
	}
	if (has(od, "opacity") && "opacity" in anyp) anyp.opacity = trunc(od.opacity);
	if (has(od, "outlines") && "outline" in anyp) anyp.outline = Boolean(od.outlines);
	if (has(od, "partOfChallenge") && od.partOfChallenge) {
		warnings.add("IB3 challenge-locked parts were imported as normal parts.");
	}
}

// --- sandbox settings ------------------------------------------------------

function mapSettings(s: Record<string, unknown>, version: string, warnings: Set<string>): SandboxSettings {
	// gravityY is an IB3 1..40 UI value; convert to the raw m/s^2 IB2 uses.
	const gravity = has(s, "gravityY") ? num(s.gravityY, 16) / GRAVITY_DIVISOR : 15.0;

	let size = 0;
	if (has(s, "size")) {
		const raw = trunc(s.size);
		size = clamp(0, 2, raw);
		if (raw > 2) warnings.add("IB3 'XLarge' world size was mapped to Large.");
	}

	// IB3 groundType SHORE(0)/ISLAND(1) -> IB2 terrainType LAND(0) (best-effort).
	let terrainType = SandboxSettings.TERRAIN_LAND;
	if (has(s, "groundType")) {
		if (trunc(s.groundType) === 1) warnings.add("IB3 'Island' ground was approximated as land terrain.");
		terrainType = SandboxSettings.TERRAIN_LAND;
	}

	const terrainTheme = 0; // IB3 `theme` has no IB2 terrainTheme mapping.
	if (has(s, "theme") && trunc(s.theme) !== 0) {
		warnings.add("IB3 ground theme has no IB2 equivalent and was ignored.");
	}

	// skyType/skyColor -> background (+RGB when custom/solid).
	let background = SandboxSettings.BACKGROUND_SKY;
	let br = 0;
	let bg = 0;
	let bb = 0;
	const st = has(s, "skyType") ? trunc(s.skyType) : 0;
	if (st === -1) {
		background = SandboxSettings.BACKGROUND_SOLID_COLOUR; // Sky.CUSTOM
	} else if (st === 0) {
		background = SandboxSettings.BACKGROUND_SKY;
	} else if (st === 1) {
		background = SandboxSettings.BACKGROUND_SPACE;
	} else if (st === 2) {
		background = SandboxSettings.BACKGROUND_NIGHT;
	} else {
		background = SandboxSettings.BACKGROUND_SKY;
		warnings.add("IB3 sky type has no IB2 equivalent; imported as blue sky.");
	}
	if (background === SandboxSettings.BACKGROUND_SOLID_COLOUR && has(s, "skyColor")) {
		const c = num(s.skyColor);
		br = red(c);
		bg = green(c);
		bb = blue(c);
	}

	const settings = new SandboxSettings(gravity, size, terrainType, terrainTheme, background, br, bg, bb);

	// Water fields — verbatim (Database.as:538-593; ExtractSandboxSettings).
	if (has(s, "waterEnabled")) settings.waterEnabled = Boolean(s.waterEnabled);
	if (has(s, "waterType")) settings.waterType = trunc(s.waterType);
	if (has(s, "waterDensity")) settings.waterDensity = num(s.waterDensity, settings.waterDensity);
	if (has(s, "waterHeight")) settings.waterHeight = num(s.waterHeight);
	if (has(s, "waterColor")) settings.waterColor = num(s.waterColor);
	if (has(s, "waterOpacity")) settings.waterOpacity = trunc(s.waterOpacity);
	if (has(s, "waterLinearDrag")) settings.waterLinearDrag = num(s.waterLinearDrag);
	if (has(s, "waterAngularDrag")) settings.waterAngularDrag = num(s.waterAngularDrag);
	if (has(s, "waterHeightOsc")) settings.waterHeightOsc = num(s.waterHeightOsc);
	if (has(s, "waterHeightOscSpeed")) settings.waterHeightOscSpeed = trunc(s.waterHeightOscSpeed);
	else if (atOrBefore("0.00.10a", version)) settings.waterHeightOscSpeed = 4000; // Database.as:574-581
	if (has(s, "waterTiltOsc")) settings.waterTiltOsc = num(s.waterTiltOsc);
	if (has(s, "waterTiltOscSpeed")) settings.waterTiltOscSpeed = num(s.waterTiltOscSpeed);

	return settings;
}
