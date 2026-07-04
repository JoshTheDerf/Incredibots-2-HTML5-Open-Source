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

import { b2AABB, b2Vec2 } from "../Box2D";
import { ByteArray } from "../General/ByteArray";
import { Base64Decoder } from "../mx/utils/Base64Decoder";
import { Util } from "../General/Util";
import { Challenge } from "../Game/Challenge";
import { DEFAULT_FRICTION, DEFAULT_RESTITUTION, TRIGGER_NONE } from "../Parts/partDefaults";
import { decodeExposureInt, EXPO_PUBLIC_EDITABLE, type ExposureFlags } from "./exposure";
import { readVersionedNameHeader } from "./robotSerialization";
import { sniffFileBytes, TYPE_TAG_CHALLENGE, VERSION_PREFIX, VERSION_STRING } from "./serializationVersion";
import { SandboxSettings } from "../Game/SandboxSettings";
import { WinCondition } from "../Game/WinCondition";
import { LossCondition } from "../Game/LossCondition";
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

// --- Part array <- ByteArray (AMF3 object graph) --------------------------
//
// Verbatim port of Database.ExtractPartsFromByteArray (Database.ts:1955-2110).
// This is the SAME decoder robotSerialization.ts uses for robots — challenges
// share the exact part encoding, so the two are byte-identical here by design.
// (Kept as its own copy rather than imported from robotSerialization to keep the
// two serializers independently faithful to their Database source functions.)

/** hasOwnProperty probe for optional AMF part fields (Jaybit's absent-field defaults). */
function has(od: object, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(od, key);
}

// The challenge blob is a sequence of independent top-level writeObject() sections
// (parts, settings, buildAreas, each condition list). ByteArray.readObject now
// resets its AMF reference tables per top-level read (matching AS3's per-message
// reset + the writer's fresh-table-per-writeObject), so each readObject() below
// starts with a clean reference context automatically — no manual reset needed.
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
				// IB3 Bomb (P2 port) — optional-guarded bomb fields, Bomb.as defaults;
				// see robotSerialization.extractPartsFromByteArray for the
				// compatibility note (old clients drop bombs).
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
				// Convex polygon (IB3 PolygonPart import target); rebuild b2Vec2s from the
				// AMF [{x,y}, ...] vertex array. shape.angle = od.angle restores rotation.
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
			// (:2149-2171) — see robotSerialization.extractPartsFromByteArray.
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
			// (TextPart never touches `cont` outside rendering), so pass null. Flash
			// writes `text`; older builds of this port wrote `_text`. Accept both.
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
					// IB3 independent auto directions (SlidingJoint.as:53-55); absent ->
					// derive from the legacy both-directions flag.
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
					// Jaybit PrismaticJoint collision layers (Database.as:2274-2279).
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
				// triggerList lives on JointPart for all three joint types.
				joint.triggerList = has(od, "triggerList") ? od.triggerList : "";
				partData.push(joint);
			}
		}
	}

	// Re-seat any prismatic joint at its stored array index (Database.ts:2101-2107).
	for (let i = 0; i < partData.length; i++) {
		if (partData[i] instanceof PrismaticJoint && (partData[i] as PrismaticJoint).arrayIndex !== -1) {
			const piston = partData[i] as PrismaticJoint;
			let arr: any[] = Util.RemoveFromArray(piston, partData);
			arr = Util.InsertIntoArray(piston, arr, piston.arrayIndex);
			partData.length = 0;
			partData.push(...arr);
		}
	}

	return partData;
}

// --- Part array -> ByteArray (AMF3 object graph) --------------------------
//
// Verbatim port of Database.PutPartsIntoByteArray (Database.ts:1914-1954), the
// inverse of extractPartsFromByteArray above. Re-orders parts so all
// shapes/text precede all joints/thrusters, records the ARRAY INDEX each
// joint/thruster references, then writes the whole array as one AMF3 object.
// (Same logic as robotSerialization.putPartsIntoByteArray — kept as its own copy
// to keep the two serializers independently faithful to their Database source.)

/** Only parts flagged drawAnyway are stored (Database.IsPartOfRobot :1718). */
function isPartOfRobot(p: Part): boolean {
	return (p as { drawAnyway?: boolean }).drawAnyway === true;
}

function putPartsIntoByteArray(parts: Part[], b: ByteArray): ByteArray {
	parts = parts.filter(isPartOfRobot);

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

/** INIT_PHYS_SCALE (ControllerGameGlobals) — camera-clamp fallback zoom. */
const INIT_PHYS_SCALE = 30;

/**
 * Apply the IB3 water fields from a raw decoded AMF settings object onto a
 * fresh SandboxSettings, hasOwnProperty-guarded like the Jaybit optional part
 * fields — absent fields (all pre-IB3-merge codes) keep the constructor
 * defaults (waterEnabled false etc., see SandboxSettings.ts / IB3
 * Control/SandboxSettings.as:37-59). The WRITE side needs no counterpart:
 * writeObject(settings) serializes all public fields automatically, and stock
 * Jaybit clients ignore unknown AMF props. (Same helper as
 * robotSerialization.ts — kept as its own copy, as the two serializers are.)
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
	// Sandbox ground style (see robotSerialization): IB2 by default, with an
	// IB3-engine fallback so old IB3-engine codes get IB3 ground.
	if (has(s, "groundStyle")) settings.groundStyle = Math.trunc(s.groundStyle);
	else if (settings.physicsEngine === SandboxSettings.ENGINE_IB3) settings.groundStyle = SandboxSettings.GROUND_STYLE_IB3;
	return settings;
}

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
		if (conditions[i].shape1Index !== -1) cond.shape1 = allShapes[conditions[i].shape1Index] as ShapePart;
		if (conditions[i].shape2Index !== -1) cond.shape2 = allShapes[conditions[i].shape2Index] as ShapePart;
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
		if (conditions[i].shape1Index !== -1) con.shape1 = allShapes[conditions[i].shape1Index] as ShapePart;
		if (conditions[i].shape2Index !== -1) con.shape2 = allShapes[conditions[i].shape2Index] as ShapePart;
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
				if (wc.shape1.equals(allShapes[j])) wc.shape1Index = j;
			}
		}
		if (wc.shape2) {
			for (let j = 0; j < allShapes.length; j++) {
				if (wc.shape2.equals(allShapes[j])) wc.shape2Index = j;
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
				if (lc.shape1.equals(allShapes[j])) lc.shape1Index = j;
			}
		}
		if (lc.shape2) {
			for (let j = 0; j < allShapes.length; j++) {
				if (lc.shape2.equals(allShapes[j])) lc.shape2Index = j;
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
