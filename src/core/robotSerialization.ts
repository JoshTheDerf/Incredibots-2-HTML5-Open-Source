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

/** A decoded robot: its parts plus the sandbox/camera settings from the string. */
export interface DecodedRobot {
	parts: Part[];
	settings: SandboxSettings;
	cameraX: number;
	cameraY: number;
	zoomLevel: number;
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
			// (TextPart never touches `cont` outside rendering), so pass null.
			// TextPart stores its content in a private `_text` backing field behind a
			// `text` getter/setter, so AMF serializes it as `_text`; older/AS3 bots use
			// `text`. Accept both so the round-trip preserves the text content.
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

function extractRobotFromByteArray(data: ByteArray): DecodedRobot {
	const parts = extractPartsFromByteArray(data);
	if (data.position === data.length) {
		return {
			parts,
			settings: new SandboxSettings(15.0, 1, 0, 0, 0),
			cameraX: Number.MAX_VALUE,
			cameraY: Number.MAX_VALUE,
			zoomLevel: Number.MAX_VALUE,
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
	}
	return {
		parts,
		settings: new SandboxSettings(
			s.gravity,
			s.size,
			s.terrainType,
			s.terrainTheme,
			s.background,
			s.backgroundR,
			s.backgroundG,
			s.backgroundB,
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
 * Encode a parts array to the legacy robot export string (base64 of a
 * zlib-compressed ByteArray). Byte-compatible with Database.ExportRobot, so
 * the result loads in the legacy game.
 */
export async function encodeRobot(
	parts: Part[],
	settings: SandboxSettings = DEFAULT_SETTINGS(),
	name = "",
	desc = "",
): Promise<string> {
	const partData = putRobotIntoByteArray(parts, settings);
	const exportData = new ByteArray();
	exportData.writeUTF(name);
	exportData.writeUTF(desc);
	exportData.writeInt(0); // shared
	exportData.writeInt(0); // allowEdits
	exportData.writeInt(0); // prop
	partData.position = 0;
	exportData.writeBytes(partData);
	await exportData.compress();
	return exportData.buffer.toString("base64");
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
 * Decode a legacy robot export string back into parts + settings. Mirrors
 * Database.ImportRobot: base64-decode, zlib-uncompress, skip the header
 * (name/desc/shared/allowEdits/prop), then extract the robot.
 */
export async function decodeRobot(robotStr: string): Promise<DecodedRobot> {
	const decoder = new Base64Decoder();
	decoder.decode(robotStr);
	const b = decoder.toByteArray();
	await b.uncompress();

	b.readUTF(); // name
	b.readUTF(); // desc
	b.readInt(); // shared
	b.readInt(); // allowEdits
	b.readInt(); // prop
	return extractRobotFromByteArray(b);
}
