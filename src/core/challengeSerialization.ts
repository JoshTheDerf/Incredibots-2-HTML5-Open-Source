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
import { Util } from "../General/Util";
import { Challenge } from "../Game/Challenge";
import { SandboxSettings } from "../Game/SandboxSettings";
import { WinCondition } from "../Game/WinCondition";
import { LossCondition } from "../Game/LossCondition";
import { Cannon } from "../Parts/Cannon";
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

// --- Part array <- ByteArray (AMF3 object graph) --------------------------
//
// Verbatim port of Database.ExtractPartsFromByteArray (Database.ts:1955-2110).
// This is the SAME decoder robotSerialization.ts uses for robots — challenges
// share the exact part encoding, so the two are byte-identical here by design.
// (Kept as its own copy rather than imported from robotSerialization to keep the
// two serializers independently faithful to their Database source functions.)

function extractPartsFromByteArray(b: ByteArray): Part[] {
	const objectData = b.readObject() as any[];
	const partData: Part[] = [];

	for (let i = 0; i < objectData.length; i++) {
		const od = objectData[i];
		if (od.type === "Circle" || od.type === "Rectangle" || od.type === "Triangle" || od.type === "Cannon") {
			let shape: ShapePart;
			if (od.type === "Circle") {
				shape = new Circle(od.centerX, od.centerY, od.radius, false);
			} else if (od.type === "Rectangle") {
				shape = new Rectangle(od.x, od.y, od.w, od.h, false);
			} else if (od.type === "Triangle") {
				shape = new Triangle(od.x1, od.y1, od.x2, od.y2, od.x3, od.y3);
			} else {
				shape = new Cannon(od.x, od.y, od.w);
				(shape as Cannon).fireKey = od.fireKey;
				(shape as Cannon).strength = od.strength;
			}
			shape.angle = od.angle;
			shape.density = od.density;
			shape.collide = od.collide;
			shape.isStatic = od.isStatic;
			shape.isCameraFocus = od.isCameraFocus;
			shape.red = od.red;
			shape.green = od.green;
			shape.blue = od.blue;
			shape.opacity = od.opacity;
			shape.outline = od.outline;
			if (Object.prototype.hasOwnProperty.call(od, "terrain")) shape.terrain = od.terrain;
			if (Object.prototype.hasOwnProperty.call(od, "undragable")) shape.undragable = od.undragable;
			partData.push(shape);
		} else if (od.type === "TextPart") {
			// Legacy passes Main.m_curController; the headless core has no controller
			// (TextPart never touches `cont` outside rendering), so pass null. Accept
			// both the `_text` backing field and `text` (see robotSerialization).
			const textContent = od._text ?? od.text;
			const text = new TextPart(null, od.x, od.y, od.w, od.h, textContent, od.inFront);
			text.inFront = od.inFront;
			text.scaleWithZoom = od.scaleWithZoom;
			text.alwaysVisible = od.alwaysVisible;
			text.displayKey = od.displayKey;
			text.red = od.red;
			text.green = od.green;
			text.blue = od.blue;
			text.size = od.size;
			partData.push(text);
		} else if (od.type === "Thrusters") {
			if (od.shapeIndex >= 0) {
				const t = new Thrusters(partData[od.shapeIndex] as ShapePart, od.centerX, od.centerY);
				t.strength = od.strength;
				t.angle = od.angle;
				t.thrustKey = od.thrustKey;
				t.autoOn = od.autoOn;
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
					pj.initLength = od.initLength;
					pj.red = od.red;
					pj.green = od.green;
					pj.blue = od.blue;
					pj.opacity = od.opacity;
					pj.outline = od.outline;
					pj.collide = od.collide;
					if (Object.prototype.hasOwnProperty.call(od, "arrayIndex")) pj.arrayIndex = od.arrayIndex;
					joint = pj;
				}
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

/** Only ShapeParts count as "shapes" for condition shape1/shape2 index resolution (Database.IsShape). */
function isShape(p: Part): boolean {
	return p instanceof ShapePart;
}

// --- Challenge <- ByteArray -----------------------------------------------
//
// Verbatim port of Database.ExtractChallengeFromByteArray (Database.ts:1814-1912).
// Reads, in order: parts (AMF3) -> settings (AMF3 object) -> 10 permission
// booleans -> 7 numeric limit doubles -> buildAreas (AMF3 array of {lowerBound,
// upperBound}) -> winConditions (AMF3 array) -> lossConditions (AMF3 array) ->
// winConditionsAnded boolean -> (optional) cameraX/Y/zoom floats -> (optional)
// nonColliding/showConditions booleans -> (optional) cannons boolean, defaulted
// from the other flags when absent.

function extractChallengeFromByteArray(data: ByteArray): Challenge {
	const partData = extractPartsFromByteArray(data);
	const settings = data.readObject() as any;
	const c = new Challenge(
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
 * Decode a built-in challenge blob (race.dat / spaceship.dat bytes) into a live
 * Challenge. Mirrors the ControllerRace / ControllerSpaceship ctor path
 * (ControllerRace.ts:19-20): construct a ByteArray from the compressed bytes,
 * uncompress it, then ExtractChallengeFromByteArray. `blob` is the raw asset
 * bytes (from `fetch(resource).arrayBuffer()` in the browser, or `readFileSync`
 * in tests). async because ByteArray.uncompress() is async.
 */
export async function decodeChallengeBlob(blob: ArrayBuffer | Uint8Array): Promise<Challenge> {
	const b = new ByteArray(blob as ArrayBuffer);
	await b.uncompress();
	b.position = 0;
	return extractChallengeFromByteArray(b);
}
