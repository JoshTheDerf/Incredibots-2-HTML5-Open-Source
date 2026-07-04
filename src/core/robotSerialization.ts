// Node-clean robot (de)serialization.
//
// This is a faithful port of ONLY the pure part-array <-> ByteArray encoding
// that lives in src/General/Database.ts (PutPartsIntoByteArray /
// ExtractPartsFromByteArray + PutRobotIntoByteArray / ExtractRobotFromByteArray
// + the Export/Import wrappers). It is extracted here so the headless GameCore
// can (de)serialize robots WITHOUT importing Database.ts wholesale — Database
// pulls in ControllerGame / Gui / pixi through its dead network code, which
// would fail the check:core node-headless gate.
//
// The byte format is IDENTICAL to the legacy game's robot export, so bots
// exported from this stack load in the legacy game and vice-versa:
//
//   export string = base64( zlib-deflate(
//     UTF name, UTF desc, int shared, int allowEdits, int prop,   // header
//     writeObject(partsToStore),                                  // parts (AMF3)
//     writeObject(settings), float cameraX, float cameraY, float zoomLevel
//   ))
//
// Only ByteArray, the Part classes, Util, SandboxSettings and Base64Decoder are
// referenced — all node-clean (verified reachable by scripts/check-core-node.mjs).

import { b2Vec2 } from "../Box2D";
import { ByteArray } from "../General/ByteArray";
import { Util } from "../General/Util";
import { SandboxSettings } from "../Game/SandboxSettings";
import { Base64Decoder } from "../mx/utils/Base64Decoder";
import { DEFAULT_FRICTION, DEFAULT_RESTITUTION, TRIGGER_NONE } from "../Parts/partDefaults";
import { decodeExposureInt, EXPO_PUBLIC_EDITABLE, type ExposureFlags } from "./exposure";
import { decodeIB3FromByteArray, looksLikeIB3, type IB3Meta } from "./ib3Import";
import { sniffFileBytes, TYPE_TAG_ROBOT, VERSION_PREFIX, VERSION_STRING } from "./serializationVersion";
import { Bomb } from "../Parts/Bomb";
import { Cannon } from "../Parts/Cannon";
import { Circle } from "../Parts/Circle";
import { FixedJoint } from "../Parts/FixedJoint";
import { JointPart } from "../Parts/JointPart";
import type { Part } from "../Parts/Part";
import { Polygon } from "../Parts/Polygon";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { Rectangle } from "../Parts/Rectangle";
import { RevoluteJoint } from "../Parts/RevoluteJoint";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import { Triangle } from "../Parts/Triangle";

/** A decoded robot: its parts plus the sandbox/camera settings from the string. */
export interface DecodedRobot {
	parts: Part[];
	settings: SandboxSettings;
	cameraX: number;
	cameraY: number;
	zoomLevel: number;
	/** Header metadata (Wave 3a). Blob decodes (headerless .dat assets) carry defaults. */
	name: string;
	desc: string;
	/** The embedded "2.33.0.1 ibro"-style version string; null on legacy CE codes. */
	version: string | null;
	/** Decoded exposure (SaveWindow enum) — legacy codes map to public+editable. */
	exposure: ExposureFlags;
	/**
	 * Present ONLY when the code was an IB3 import (see ib3Import.ts): IB3
	 * provenance (name/creator/version/type) for a UI notice. Undefined for
	 * native/Jaybit/CE codes.
	 */
	ib3?: IB3Meta;
	/**
	 * Lossy-conversion notes from an IB3 import (fields IB2 can't represent,
	 * approximated geometry, clamped materials). Empty/undefined for native codes.
	 */
	warnings?: string[];
}

/** Default header metadata for headerless blob decodes / legacy fallbacks. */
function defaultHeaderMeta(): Pick<DecodedRobot, "name" | "desc" | "version" | "exposure"> {
	return { name: "", desc: "", version: null, exposure: decodeExposureInt(0) };
}

// --- Part array <-> ByteArray (AMF3 object graph) -------------------------
//
// Ported verbatim from Database.PutPartsIntoByteArray (Database.ts:1914). The
// parts are re-ordered so all shapes/text precede all joints/thrusters, and
// joints/thrusters record the ARRAY INDEX of the shape(s) they reference (AMF
// can't store live object references across the boundary reliably), then the
// whole array is written as a single AMF3 object.

/** Only parts flagged drawAnyway are stored (Database.IsPartOfRobot :1718). */
function isPartOfRobot(p: Part): boolean {
	return p.drawAnyway;
}

/** hasOwnProperty probe for optional AMF part fields (Jaybit's absent-field defaults). */
function has(od: object, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(od, key);
}

function putPartsIntoByteArray(parts: Part[], b: ByteArray): ByteArray {
	parts = parts.filter(isPartOfRobot);

	// All Shape/Text definitions must come earlier in the array than all joints.
	const partsToStore: Part[] = [];
	for (let i = 0; i < parts.length; i++) {
		if (parts[i] instanceof ShapePart || parts[i] instanceof TextPart) {
			partsToStore.push(parts[i]);
		}
	}
	let numShapes = 0;
	for (let i = 0; i < parts.length; i++) {
		if (parts[i] instanceof JointPart || parts[i] instanceof Thrusters) {
			partsToStore.push(parts[i]);
			if (parts[i] instanceof PrismaticJoint) {
				(parts[i] as PrismaticJoint).arrayIndex = numShapes;
				numShapes++;
			}
		} else {
			numShapes++;
		}
	}

	// Since we can't store references to parts, store array indices for joints'
	// references to their ShapeParts (indices into `parts`, as in the original).
	for (let i = 0; i < partsToStore.length; i++) {
		const part = partsToStore[i];
		if (part instanceof JointPart) {
			for (let j = 0; j < partsToStore.length; j++) {
				if (partsToStore[j] === part.part1) (part as JointPart & { part1Index: number }).part1Index = j;
				if (partsToStore[j] === part.part2) (part as JointPart & { part2Index: number }).part2Index = j;
			}
		} else if (part instanceof Thrusters) {
			for (let j = 0; j < partsToStore.length; j++) {
				if (partsToStore[j] === part.shape) (part as Thrusters & { shapeIndex: number }).shapeIndex = j;
			}
		}
	}

	b.writeObject(partsToStore);
	return b;
}

function extractPartsFromByteArray(b: ByteArray): Part[] {
	const objectData = b.readObject() as any[];
	const partData: Part[] = [];

	for (let i = 0; i < objectData.length; i++) {
		const od = objectData[i];
		if (
			od.type === "Circle" ||
			od.type === "Rectangle" ||
			od.type === "Triangle" ||
			od.type === "Polygon" ||
			od.type === "Cannon" ||
			od.type === "Bomb"
		) {
			let shape: ShapePart;
			if (od.type === "Circle") {
				// checkLimits=true on load, as Jaybit (Database.as:2129; CE passed false).
				shape = new Circle(od.centerX, od.centerY, od.radius, true);
			} else if (od.type === "Bomb") {
				// IB3 Bomb (P2 port). Every bomb field is optional-guarded so a code
				// missing them still loads with the Bomb.as defaults. NOTE: legacy
				// Jaybit/CE clients do not know the "Bomb" type tag and silently DROP
				// bombs from codes exported here — accepted (same one-way
				// compatibility as other Jaybit-only additions).
				const bomb = new Bomb(od.centerX, od.centerY, od.radius, has(od, "blastRadius") ? Number(od.blastRadius) : 4, true);
				if (has(od, "strength")) bomb.strength = Number(od.strength);
				if (has(od, "delay")) bomb.delay = Math.trunc(od.delay);
				if (has(od, "delayAfterTrigger")) bomb.delayAfterTrigger = Boolean(od.delayAfterTrigger);
				if (has(od, "explodeOnImpact")) bomb.explodeOnImpact = Boolean(od.explodeOnImpact);
				if (has(od, "delayAfterImpact")) bomb.delayAfterImpact = Boolean(od.delayAfterImpact);
				if (has(od, "repeat")) bomb.repeat = Math.trunc(od.repeat);
				if (has(od, "repeatable")) bomb.repeatable = Boolean(od.repeatable);
				if (has(od, "sensitive")) bomb.sensitive = Boolean(od.sensitive);
				if (has(od, "sensitivity")) bomb.sensitivity = Number(od.sensitivity);
				if (has(od, "deflect")) bomb.deflect = Boolean(od.deflect);
				bomb.triggerList = has(od, "triggerList") ? od.triggerList : "";
				shape = bomb;
			} else if (od.type === "Rectangle") {
				shape = new Rectangle(od.x, od.y, od.w, od.h, true);
			} else if (od.type === "Triangle") {
				shape = new Triangle(od.x1, od.y1, od.x2, od.y2, od.x3, od.y3);
			} else if (od.type === "Polygon") {
				// Convex polygon (IB3 PolygonPart import target). AMF serializes the
				// public `vertices` array as [{x,y}, ...] (b2Vec2 like PrismaticJoint.axis);
				// rebuild b2Vec2s. The common `shape.angle = od.angle` below restores rotation.
				const raw = (od.vertices ?? []) as ArrayLike<{ x: number; y: number }>;
				const verts: b2Vec2[] = [];
				for (let vi = 0; vi < raw.length; vi++) verts.push(new b2Vec2(Number(raw[vi].x), Number(raw[vi].y)));
				shape = new Polygon(verts);
			} else {
				shape = new Cannon(od.x, od.y, od.w);
				(shape as Cannon).fireKey = od.fireKey;
				(shape as Cannon).strength = od.strength;
				(shape as Cannon).triggerList = has(od, "triggerList") ? od.triggerList : "";
			}
			shape.angle = od.angle;
			shape.density = od.density;
			// Jaybit material / collision-layer / trigger fields, with the exact
			// absent-property defaults of Database.as ExtractPartsFromByteArray
			// (:2149-2171): friction 11 / restitution 7 (== CE's fixed 0.4/0.3 after
			// conversion), collA-D default to the legacy `collide` flag, and
			// triggerAction defaults to TRIGGER_NONE = 6 (NOT 0 — 0 is a real action).
			shape.friction = has(od, "friction") ? Number(od.friction) : DEFAULT_FRICTION;
			shape.restitution = has(od, "restitution") ? Number(od.restitution) : DEFAULT_RESTITUTION;
			shape.collide = od.collide;
			shape.collA = has(od, "collA") ? Boolean(od.collA) : Boolean(od.collide);
			shape.collB = has(od, "collB") ? Boolean(od.collB) : Boolean(od.collide);
			shape.collC = has(od, "collC") ? Boolean(od.collC) : Boolean(od.collide);
			shape.collD = has(od, "collD") ? Boolean(od.collD) : Boolean(od.collide);
			shape.subColl = has(od, "subColl") ? Boolean(od.subColl) : false;
			shape.isStatic = od.isStatic;
			shape.isCameraFocus = od.isCameraFocus;
			shape.red = od.red;
			shape.green = od.green;
			shape.blue = od.blue;
			shape.opacity = od.opacity;
			shape.outline = od.outline;
			shape.triggerName = has(od, "triggerName") ? od.triggerName : "";
			shape.triggerName_2 = has(od, "triggerName_2") ? od.triggerName_2 : "";
			shape.triggerAction = has(od, "triggerAction") ? Math.trunc(od.triggerAction) : TRIGGER_NONE;
			shape.triggerAction_2 = has(od, "triggerAction_2") ? Math.trunc(od.triggerAction_2) : TRIGGER_NONE;
			shape.onGroundHit = has(od, "onGroundHit") ? Boolean(od.onGroundHit) : false;
			shape.onGroundHit_2 = has(od, "onGroundHit_2") ? Boolean(od.onGroundHit_2) : false;
			shape.onSameName = has(od, "onSameName") ? Boolean(od.onSameName) : false;
			shape.onSameName_2 = has(od, "onSameName_2") ? Boolean(od.onSameName_2) : false;
			if (has(od, "terrain")) shape.terrain = od.terrain;
			if (has(od, "undragable")) shape.undragable = od.undragable;
			// IB3 buoyancy participation flag (IB3 ShapePart.as:25); absent on
			// pre-IB3-merge and Jaybit/CE codes -> default true (ShapePart.as:91).
			shape.buoyant = has(od, "buoyant") ? Boolean(od.buoyant) : true;
			// IB3 fixedRotation (IB3 ShapePart.as:31); absent on old codes -> false.
			shape.fixedRotation = has(od, "fixedRotation") ? Boolean(od.fixedRotation) : false;
			partData.push(shape);
		} else if (od.type === "TextPart") {
			// Legacy passes Main.m_curController; the headless core has no controller
			// (TextPart never touches `cont` outside rendering), so pass null.
			// Flash writes the content as `text`; pre-Wave-3a builds of this port
			// emitted the `_text` backing field. Accept both (spec §9).
			const textContent = od.text ?? od._text;
			const text = new TextPart(null, od.x, od.y, od.w, od.h, textContent, od.inFront);
			text.inFront = od.inFront;
			text.scaleWithZoom = od.scaleWithZoom;
			text.alwaysVisible = od.alwaysVisible;
			text.displayKey = od.displayKey;
			text.red = od.red;
			text.green = od.green;
			text.blue = od.blue;
			text.size = od.size;
			// IB3 text rotation + visible-on-start (IB3 TextPart.as:30/:32); absent -> 0 / false.
			text.angle = has(od, "angle") ? Number(od.angle) : 0;
			text.visibleOnStart = has(od, "visibleOnStart") ? Boolean(od.visibleOnStart) : false;
			text.triggerList = has(od, "triggerList") ? od.triggerList : "";
			partData.push(text);
		} else if (od.type === "Thrusters") {
			if (od.shapeIndex >= 0) {
				const t = new Thrusters(partData[od.shapeIndex] as ShapePart, od.centerX, od.centerY);
				t.strength = od.strength;
				t.angle = od.angle;
				t.thrustKey = od.thrustKey;
				t.autoOn = od.autoOn;
				// IB3 Thrusters.enableKey (IB3 Thrusters.as:24); absent -> true.
				t.enableKey = has(od, "enableKey") ? Boolean(od.enableKey) : true;
				t.triggerList = has(od, "triggerList") ? od.triggerList : "";
				partData.push(t);
			}
		} else if (od.type === "FixedJoint" || od.type === "RevoluteJoint" || od.type === "PrismaticJoint") {
			if (od.part1Index >= 0 && od.part2Index >= 0) {
				let joint: JointPart;
				if (od.type === "FixedJoint") {
					joint = new FixedJoint(
						partData[od.part1Index] as ShapePart,
						partData[od.part2Index] as ShapePart,
						od.anchorX,
						od.anchorY,
					);
				} else if (od.type === "RevoluteJoint") {
					const rj = new RevoluteJoint(
						partData[od.part1Index] as ShapePart,
						partData[od.part2Index] as ShapePart,
						od.anchorX,
						od.anchorY,
					);
					rj.enableMotor = od.enableMotor;
					rj.motorCWKey = od.motorCWKey;
					rj.motorCCWKey = od.motorCCWKey;
					rj.motorStrength = od.motorStrength;
					rj.motorSpeed = od.motorSpeed;
					rj.motorLowerLimit = od.motorLowerLimit;
					rj.motorUpperLimit = od.motorUpperLimit;
					rj.isStiff = od.isStiff;
					rj.autoCW = od.autoCW;
					rj.autoCCW = od.autoCCW;
					// IB3 per-direction key enable (RotatingJoint.as:37-39); absent -> true.
					rj.enableKeyCW = has(od, "enableKeyCW") ? Boolean(od.enableKeyCW) : true;
					rj.enableKeyCCW = has(od, "enableKeyCCW") ? Boolean(od.enableKeyCCW) : true;
					joint = rj;
				} else {
					const pj = new PrismaticJoint(
						partData[od.part1Index] as ShapePart,
						partData[od.part2Index] as ShapePart,
						0,
						0,
						1,
						1,
					);
					pj.anchorX = od.anchorX;
					pj.anchorY = od.anchorY;
					pj.axis = new b2Vec2(od.axis.x, od.axis.y);
					pj.enablePiston = od.enablePiston;
					pj.pistonUpKey = od.pistonUpKey;
					pj.pistonDownKey = od.pistonDownKey;
					pj.pistonStrength = od.pistonStrength;
					pj.pistonSpeed = od.pistonSpeed;
					pj.isStiff = od.isStiff;
					pj.autoOscillate = od.autoOscillate;
					// IB3 independent auto directions (SlidingJoint.as:53-55). Absent on
					// pre-IB3-merge codes -> derive from the legacy both-directions flag so
					// old oscillating pistons keep oscillating.
					pj.autoExpand = has(od, "autoExpand") ? Boolean(od.autoExpand) : Boolean(od.autoOscillate);
					pj.autoRetract = has(od, "autoRetract") ? Boolean(od.autoRetract) : Boolean(od.autoOscillate);
					// IB3 begin-expanded (:57); absent -> false.
					pj.beginExpanded = has(od, "beginExpanded") ? Boolean(od.beginExpanded) : false;
					// IB3 per-direction key enable (:89-91); absent -> true.
					pj.enableKeyExpand = has(od, "enableKeyExpand") ? Boolean(od.enableKeyExpand) : true;
					pj.enableKeyRetract = has(od, "enableKeyRetract") ? Boolean(od.enableKeyRetract) : true;
					pj.initLength = od.initLength;
					pj.red = od.red;
					pj.green = od.green;
					pj.blue = od.blue;
					pj.opacity = od.opacity;
					pj.outline = od.outline;
					pj.collide = od.collide;
					// Jaybit PrismaticJoint collision layers (Database.as:2274-2279),
					// same collide-derived defaults as ShapePart.
					pj.collA = has(od, "collA") ? Boolean(od.collA) : Boolean(od.collide);
					pj.collB = has(od, "collB") ? Boolean(od.collB) : Boolean(od.collide);
					pj.collC = has(od, "collC") ? Boolean(od.collC) : Boolean(od.collide);
					pj.collD = has(od, "collD") ? Boolean(od.collD) : Boolean(od.collide);
					pj.subColl = has(od, "subColl") ? Boolean(od.subColl) : false;
					// IB3 buoyancy flag (IB3 SlidingJoint.as:73, default true :151).
					pj.buoyant = has(od, "buoyant") ? Boolean(od.buoyant) : true;
					if (has(od, "arrayIndex")) pj.arrayIndex = od.arrayIndex;
					joint = pj;
				}
				// triggerList lives on JointPart for all three joint types (Jaybit
				// JointPart.as; Database.as :2229/:2248/:2287).
				joint.triggerList = has(od, "triggerList") ? od.triggerList : "";
				partData.push(joint);
			}
		}
	}

	// Re-seat any prismatic joint at its stored array index (Database.ts:2101).
	for (let i = 0; i < partData.length; i++) {
		if (partData[i] instanceof PrismaticJoint && (partData[i] as PrismaticJoint).arrayIndex !== -1) {
			const piston = partData[i] as PrismaticJoint;
			let arr: any[] = Util.RemoveFromArray(piston, partData);
			arr = Util.InsertIntoArray(piston, arr, piston.arrayIndex);
			// RemoveFromArray/InsertIntoArray return new arrays; splice-copy back so
			// the local `partData` reference stays the one we return.
			partData.length = 0;
			partData.push(...arr);
		}
	}

	return partData;
}

// --- Robot <-> ByteArray (parts + settings + camera) ----------------------
// Mirrors Database.PutRobotIntoByteArray / ExtractRobotFromByteArray.

function putRobotIntoByteArray(parts: Part[], settings: SandboxSettings): ByteArray {
	const robotData = putPartsIntoByteArray(parts, new ByteArray());
	robotData.writeObject(settings);
	robotData.writeFloat(Number.MAX_VALUE); // cameraX (headless has no camera export)
	robotData.writeFloat(Number.MAX_VALUE); // cameraY
	robotData.writeFloat(Number.MAX_VALUE); // zoomLevel
	return robotData;
}

/**
 * INIT_PHYS_SCALE (ControllerGameGlobals) — the default zoom the camera clamp
 * falls back to. Duplicated as a literal so the serializer stays free of
 * controller imports.
 */
const INIT_PHYS_SCALE = 30;

/**
 * Apply the IB3 water fields from a raw decoded AMF settings object onto a
 * fresh SandboxSettings, hasOwnProperty-guarded like the Jaybit optional part
 * fields — absent fields (all pre-IB3-merge codes) keep the constructor
 * defaults (waterEnabled false etc., see SandboxSettings.ts / IB3
 * Control/SandboxSettings.as:37-59). The WRITE side needs no counterpart:
 * writeObject(settings) serializes all public fields automatically, and stock
 * Jaybit clients ignore unknown AMF props.
 */
function applyWaterSettings(settings: SandboxSettings, s: any): SandboxSettings {
	if (has(s, "waterEnabled")) settings.waterEnabled = Boolean(s.waterEnabled);
	if (has(s, "waterType")) settings.waterType = Math.trunc(s.waterType);
	if (has(s, "waterDensity")) settings.waterDensity = Number(s.waterDensity);
	if (has(s, "waterHeight")) settings.waterHeight = Number(s.waterHeight);
	if (has(s, "waterColor")) settings.waterColor = Number(s.waterColor);
	if (has(s, "waterOpacity")) settings.waterOpacity = Math.trunc(s.waterOpacity);
	if (has(s, "waterLinearDrag")) settings.waterLinearDrag = Number(s.waterLinearDrag);
	if (has(s, "waterAngularDrag")) settings.waterAngularDrag = Number(s.waterAngularDrag);
	if (has(s, "waterHeightOsc")) settings.waterHeightOsc = Number(s.waterHeightOsc);
	if (has(s, "waterHeightOscSpeed")) settings.waterHeightOscSpeed = Math.trunc(s.waterHeightOscSpeed);
	if (has(s, "waterTiltOsc")) settings.waterTiltOsc = Number(s.waterTiltOsc);
	if (has(s, "waterTiltOscSpeed")) settings.waterTiltOscSpeed = Number(s.waterTiltOscSpeed);
	// Physics-engine selection (P1.5b-2b). Optional-guarded like the water fields:
	// absent on IB2/CE/Jaybit/pre-merge codes -> keep the default 0 (classic 2.0.2).
	if (has(s, "physicsEngine")) settings.physicsEngine = Math.trunc(s.physicsEngine);
	// Sandbox ground style (IB2 platform vs IB3 SHORE/ISLAND). Absent on codes
	// predating the field -> keep 0 (IB2), EXCEPT an old IB3-engine save (engine 1)
	// almost certainly wants IB3 ground, so auto-detect that so its bot lands right.
	if (has(s, "groundStyle")) settings.groundStyle = Math.trunc(s.groundStyle);
	else if (settings.physicsEngine === SandboxSettings.ENGINE_IB3) settings.groundStyle = SandboxSettings.GROUND_STYLE_IB3;
	// IB3 superset physics fields; absent on old codes -> keep defaults (0 / 0).
	if (has(s, "gravityX")) settings.gravityX = Number(s.gravityX);
	if (has(s, "restitutionType")) settings.restitutionType = Math.trunc(s.restitutionType);
	return settings;
}

function extractRobotFromByteArray(data: ByteArray): DecodedRobot {
	const parts = extractPartsFromByteArray(data);
	if (data.position === data.length) {
		return {
			parts,
			settings: new SandboxSettings(15.0, 1, 0, 0, 0),
			cameraX: Number.MAX_VALUE,
			cameraY: Number.MAX_VALUE,
			zoomLevel: Number.MAX_VALUE,
			...defaultHeaderMeta(),
		};
	}
	const s = data.readObject() as any;
	let cameraX = Number.MAX_VALUE;
	let cameraY = Number.MAX_VALUE;
	let zoomLevel = Number.MAX_VALUE;
	if (data.position !== data.length) {
		cameraX = data.readFloat();
		cameraY = data.readFloat();
		zoomLevel = data.readFloat();
		// Jaybit camera-zoom fix (Database.as:3138-3155): writeFloat(MAX_VALUE)
		// overflows float32 to +Infinity, so a "no camera" sentinel round-trips as
		// Infinity and CE loaded it verbatim (blank screen / insane zoom). Clamp
		// non-finite/MAX_VALUE floats to origin + default zoom on LOAD only.
		if (cameraX === Number.POSITIVE_INFINITY || cameraX === Number.MAX_VALUE) cameraX = 0;
		if (cameraY === Number.POSITIVE_INFINITY || cameraY === Number.MAX_VALUE) cameraY = 0;
		if (zoomLevel === Number.POSITIVE_INFINITY || zoomLevel === Number.MAX_VALUE) zoomLevel = INIT_PHYS_SCALE;
	}
	return {
		...defaultHeaderMeta(),
		parts,
		settings: applyWaterSettings(
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
			s,
		),
		cameraX,
		cameraY,
		zoomLevel,
	};
}

// --- Public string API (matches Database.ExportRobot / ImportRobot) --------

/** Default sandbox settings used when exporting (the headless editor has none). */
const DEFAULT_SETTINGS = () => new SandboxSettings(15.0, 1, 0, 0, 0);

/**
 * Build the compressed robot export blob — the bytes a .ibro FILE holds and
 * the base64 payload of the text code (they are the same bytes, §3). Header
 * layout is Jaybit's ExportRobot (Database.as:2081-2107):
 *
 *   writeUTF("kezcuvwistoup")            // VERSION_PREFIX sentinel
 *   writeUTF(VERSION_STRING + " ibro")   // version + type tag
 *   writeUTF(name); writeUTF(desc)
 *   writeInt(1)                          // shared (Jaybit's caller always passes 1)
 *   writeInt(expo + 2)                   // exposure enum + 2 (see exposure.ts)
 *   writeInt(0)                          // prop (always 0)
 *   <PutRobotIntoByteArray body>
 *   compress()
 */
async function buildRobotExportBytes(
	parts: Part[],
	settings: SandboxSettings,
	name: string,
	desc: string,
	expo: number,
): Promise<ByteArray> {
	const partData = putRobotIntoByteArray(parts, settings);
	const exportData = new ByteArray();
	exportData.writeUTF(VERSION_PREFIX);
	exportData.writeUTF(VERSION_STRING + TYPE_TAG_ROBOT);
	exportData.writeUTF(name);
	exportData.writeUTF(desc);
	exportData.writeInt(1); // shared
	exportData.writeInt(expo + 2); // exposure (Jaybit writes expo + 2)
	exportData.writeInt(0); // prop
	partData.position = 0;
	exportData.writeBytes(partData);
	await exportData.compress();
	return exportData;
}

/**
 * Encode a parts array to the robot export string (base64 of a zlib-compressed
 * ByteArray), in the Jaybit 2.33 format (prefix + version header). Loads in
 * Jaybit and in this port; CE clients cannot read prefixed codes (by design —
 * Jaybit's own exports have the same limitation).
 */
export async function encodeRobot(
	parts: Part[],
	settings: SandboxSettings = DEFAULT_SETTINGS(),
	name = "",
	desc = "",
	expo: number = EXPO_PUBLIC_EDITABLE,
): Promise<string> {
	const exportData = await buildRobotExportBytes(parts, settings, name, desc, expo);
	return exportData.buffer.toString("base64");
}

/**
 * Encode a parts array to .ibro FILE bytes — byte-identical to the
 * base64-decode of encodeRobot's string (files carry no extra framing, §3).
 */
export async function exportRobotFile(
	parts: Part[],
	settings: SandboxSettings = DEFAULT_SETTINGS(),
	name = "",
	desc = "",
	expo: number = EXPO_PUBLIC_EDITABLE,
): Promise<Uint8Array> {
	const exportData = await buildRobotExportBytes(parts, settings, name, desc, expo);
	return new Uint8Array(exportData.buffer);
}

/**
 * Decode a RAW robot ByteArray blob (the resource/robot.dat asset bytes) into
 * parts + settings. Mirrors the legacy ControllerMainMenu.LoadReplay path
 * (ControllerMainMenu.ts:449-453): construct a ByteArray from the compressed
 * asset bytes, uncompress, then ExtractRobotFromByteArray DIRECTLY — with NO
 * name/desc/shared/allowEdits/prop header skip (unlike ImportRobot / the export
 * string). `blob` is the raw asset bytes (fetch().arrayBuffer() in the browser,
 * readFileSync in tests). Node-clean (no pixi).
 */
export async function decodeRobotBlob(blob: ArrayBuffer | Uint8Array): Promise<DecodedRobot> {
	const b = new ByteArray(blob as ArrayBuffer);
	await b.uncompress();
	b.position = 0;
	return extractRobotFromByteArray(b);
}

/**
 * Read a robot/challenge/replay-trailer export header from an uncompressed
 * ByteArray positioned at its start: the sentinel dance of Jaybit's ImportRobot
 * (Database.as:3159-3188). The first UTF is either the VERSION_PREFIX (Jaybit
 * format — two extra UTFs precede the name) or the user-typed name (legacy CE
 * format). Leaves `b` positioned after the name.
 */
export function readVersionedNameHeader(b: ByteArray): { name: string; version: string | null } {
	const first = b.readUTF();
	if (first === VERSION_PREFIX) {
		const version = b.readUTF(); // e.g. "2.33.0.1 ibro"
		const name = b.readUTF();
		return { name, version };
	}
	return { name: first, version: null };
}

/**
 * Decode a robot export string back into parts + settings + header metadata.
 * Mirrors Jaybit's Database.ImportRobot: base64-decode, zlib-uncompress, the
 * prefix sentinel dance (tolerates BOTH legacy CE codes and Jaybit-prefixed
 * codes), the shared/exposure/prop ints, then extract the robot.
 */
export async function decodeRobot(robotStr: string): Promise<DecodedRobot> {
	const decoder = new Base64Decoder();
	decoder.decode(robotStr);
	const b = decoder.toByteArray();
	await b.uncompress();
	b.position = 0;
	// Try native/Jaybit/CE first (via the sniff); an IB3 code (version-string-first
	// + int type 0..2) falls back to the IB3 importer (PLAN.md P5).
	if (looksLikeIB3(b)) return fromIB3(b);
	return decodeRobotFromHeaderedBytes(b);
}

/** Adapt an IB3 decode into the DecodedRobot contract (attaches provenance + warnings). */
function fromIB3(b: ByteArray): DecodedRobot {
	const res = decodeIB3FromByteArray(b);
	return { ...res.robot, ib3: res.ib3, warnings: res.warnings };
}

/** Shared tail of decodeRobot / decodeRobotFile: header dance + extraction. */
async function decodeRobotFromHeaderedBytes(b: ByteArray): Promise<DecodedRobot> {
	const { name, version } = readVersionedNameHeader(b);
	const desc = b.readUTF();
	b.readInt(); // shared
	const exposure = decodeExposureInt(b.readInt());
	b.readInt(); // prop
	const robot = extractRobotFromByteArray(b);
	return { ...robot, name, desc, version, exposure };
}

/**
 * Decode a user .ibro FILE (or a text code pasted into a file). Mirrors
 * ControllerGame.loadRobotBrowseComplete (:1008-1029): bytes starting with
 * "eN" are a base64 text code (zlib output base64-encodes to "eN…"); anything
 * else is the raw compressed blob (uncompress + header dance). Unlike
 * decodeRobotBlob (headerless built-in robot.dat), a user file DOES carry the
 * name/desc/exposure header.
 */
export async function decodeRobotFile(bytes: ArrayBuffer | Uint8Array): Promise<DecodedRobot> {
	const sniffed = sniffFileBytes(bytes);
	if (sniffed.kind === "code") return decodeRobot(sniffed.code);
	const b = new ByteArray(bytes as ArrayBuffer);
	await b.uncompress();
	b.position = 0;
	if (looksLikeIB3(b)) return fromIB3(b);
	return decodeRobotFromHeaderedBytes(b);
}
