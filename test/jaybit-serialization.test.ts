// CHARACTERIZATION — Wave 3a Jaybit serialization compatibility.
//
// Pins the Jaybit 2.33 export format + backward compat against the decompiled
// ground truth (jaybit-src General/Database.as):
//   1. Robot round-trip preserves ALL new Jaybit part fields (equals()-checked).
//   2. Legacy CE codes (no prefix, no new part props) load with the exact
//      Jaybit defaults — friction 11 / restitution 7 (== CE's 0.4/0.3 after
//      conversion), collA-D from `collide`, triggerAction = TRIGGER_NONE = 6.
//   3. The "kezcuvwistoup" prefix sentinel dance (both directions).
//   4. Challenge trailer (7 appended fields) round-trip + absent-trailer
//      defaults (triggersAllowed=false!) + the Legacy2_31 fallback chain.
//   5. Replay TriggerPress -2 sentinel + one-int lookahead carry.
//   6. Camera clamps on load (Infinity/MAX_VALUE -> 0/0/30).
//   7. TextPart serializes `text` (not `_text`) for Flash readers.
//   8. Files (.ibro/.ibre/.ibch) are byte-identical to base64-decoded codes,
//      and the "eN" sniffer routes pasted codes vs raw blobs.
//   9. Exposure: uneditable codes decode locked and GameCore blocks edits.
//  10. Cannonballs / runtime-only fields never reach the AMF payload.

import { readFileSync } from "fs";
import { join } from "path";
import { inflateSync, deflateSync } from "zlib";
import { describe, expect, it } from "vitest";

import { encodeRobot, decodeRobot, decodeRobotFile, exportRobotFile } from "../src/core/robotSerialization";
import {
	encodeChallenge,
	decodeChallenge,
	decodeChallengeWithMeta,
	decodeChallengeBlob,
	decodeChallengeFile,
	exportChallengeFile,
} from "../src/core/challengeSerialization";
import { encodeReplay, decodeReplay, decodeReplayFile, exportReplayFile } from "../src/core/replaySerialization";
import {
	VERSION_PREFIX,
	VERSION_STRING,
	checkVersionNumber,
	SAME_VERSION,
	NEWER_VERSION,
	OLDER_VERSION,
	codeToFileBytes,
	fileBytesToCode,
	isEncryptedText,
	sniffFileBytes,
	sanitizeFileName,
} from "../src/core/serializationVersion";
import {
	EXPO_PRIVATE_EDITABLE,
	EXPO_PRIVATE_NOSHARE,
	EXPO_PRIVATE_UNEDITABLE,
	EXPO_PUBLIC_EDITABLE,
	EXPO_PUBLIC_UNEDITABLE,
} from "../src/core/exposure";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { ByteArray } from "../src/General/ByteArray";
import { Challenge } from "../src/Game/Challenge";
import { SandboxSettings } from "../src/Game/SandboxSettings";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { Cannon } from "../src/Parts/Cannon";
import { TextPart } from "../src/Parts/TextPart";
import { PrismaticJoint } from "../src/Parts/PrismaticJoint";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { ShapePart } from "../src/Parts/ShapePart";
import { TRIGGER_NONE } from "../src/Parts/partDefaults";
import type { Part } from "../src/Parts/Part";
import type { ReplayData } from "../src/core/replay";

const raceBlob = () => readFileSync(join(__dirname, "../resource/race.dat"));

/** A robot exercising every new Jaybit persisted field. */
function jaybitRobot(): Part[] {
	const c = new Circle(1, 2, 1.5);
	c.friction = 25;
	c.restitution = 3;
	c.collA = false;
	c.collC = false;
	c.subColl = true;
	c.triggerName = "boom,zap";
	c.triggerName_2 = "zap2";
	c.triggerAction = 0; // a REAL action value (0 must survive; default is 6)
	c.triggerAction_2 = 3;
	c.onGroundHit = true;
	c.onSameName_2 = true;

	const r = new Rectangle(5, 5, 3, 2);
	r.friction = 1;
	r.restitution = 30;

	const cannon = new Cannon(9, 1, 2);
	cannon.triggerList = "boom";
	cannon.friction = 12;

	const rj = new RevoluteJoint(c, r, 3, 3);
	rj.triggerList = "zap";

	const pj = new PrismaticJoint(c, r, 2, 2, 4, 4);
	pj.collB = false;
	pj.subColl = true;
	pj.triggerList = "slide";

	const tp = new TextPart(null, 8, 9, 4, 2, "trigger text");
	tp.triggerList = "boom,zap";

	return [c, r, cannon, rj, pj, tp];
}

/**
 * Rewrite one of OUR (prefixed) robot codes into a legacy CE code: inflate,
 * drop the two leading prefix/version UTFs (CE codes start at the name), and
 * ALSO strip the named part properties from the AMF payload is not possible
 * textually — so callers who need "old part payload" delete the fields from
 * the part instances before encoding instead.
 */
function stripPrefix(code: string): string {
	const raw = inflateSync(Buffer.from(code, "base64"));
	let pos = 0;
	for (let i = 0; i < 2; i++) pos += 2 + raw.readUInt16BE(pos); // prefix + version UTFs
	return deflateSync(raw.subarray(pos), { level: 9 }).toString("base64");
}

/** Remove the Jaybit-era own-properties from a part so its AMF payload looks CE-authored. */
function makePartLookLegacy(p: Part): void {
	for (const key of [
		"friction",
		"restitution",
		"collA",
		"collB",
		"collC",
		"collD",
		"subColl",
		"triggerName",
		"triggerName_2",
		"triggerAction",
		"triggerAction_2",
		"onGroundHit",
		"onGroundHit_2",
		"onSameName",
		"onSameName_2",
		"triggerList",
	]) {
		delete (p as any)[key];
	}
}

// --- 1. Round-trip with all new fields ---------------------------------------

describe("robot round-trip preserves the Jaybit part fields (equals()-verified)", () => {
	it("every ShapePart survives encode->decode equals(), incl. triggerAction=0", async () => {
		const original = jaybitRobot();
		const decoded = await decodeRobot(await encodeRobot(original, undefined, "n", "d"));
		expect(decoded.parts.length).toBe(original.length);

		// Decode order: shapes/text first, then joints (legacy reorder) — except
		// the PrismaticJoint, which is re-seated at its shape-slot arrayIndex.
		const origShapes = original.filter((p) => p instanceof ShapePart) as ShapePart[];
		const decShapes = decoded.parts.filter((p) => p instanceof ShapePart) as ShapePart[];
		expect(decShapes.length).toBe(origShapes.length);
		for (let i = 0; i < origShapes.length; i++) {
			expect(decShapes[i].equals(origShapes[i])).toBe(true);
		}

		const pj = decoded.parts.find((p) => p instanceof PrismaticJoint) as PrismaticJoint;
		expect(pj.collB).toBe(false);
		expect(pj.collA).toBe(true);
		expect(pj.subColl).toBe(true);
		expect(pj.triggerList).toBe("slide");

		const rj = decoded.parts.find((p) => p instanceof RevoluteJoint) as RevoluteJoint;
		expect(rj.triggerList).toBe("zap");

		const tp = decoded.parts.find((p) => p instanceof TextPart) as TextPart;
		expect(tp.triggerList).toBe("boom,zap");
		expect(tp.text).toBe("trigger text");
	});
});

// --- 2 & 3. Legacy CE codes + prefix sentinel --------------------------------

describe("legacy CE codes load with Jaybit defaults (Database.as :2149-2171)", () => {
	it("missing part props default: friction 11, restitution 7, collA-D=collide, triggerAction=6", async () => {
		const c = new Circle(1, 2, 1.5);
		c.collide = false; // collA-D must default to THIS, not true
		const r = new Rectangle(5, 5, 3, 2);
		makePartLookLegacy(c);
		makePartLookLegacy(r);
		const legacyCode = stripPrefix(await encodeRobot([c, r], undefined, "OldBot", "old desc"));

		const decoded = await decodeRobot(legacyCode);
		expect(decoded.version).toBeNull(); // no prefix -> legacy path
		expect(decoded.name).toBe("OldBot");
		expect(decoded.desc).toBe("old desc");
		expect(decoded.exposure.isEditable).toBe(true); // legacy int <= 1

		const dc = decoded.parts[0] as Circle;
		expect(dc.friction).toBe(11); // -> ConvertFrictionToBox2D = 0.4 (CE physics)
		expect(dc.restitution).toBe(7); // -> ConvertRestitutionToBox2D = 0.3
		expect(dc.collA).toBe(false); // defaults to collide=false
		expect(dc.collB).toBe(false);
		expect(dc.subColl).toBe(false);
		expect(dc.triggerAction).toBe(TRIGGER_NONE); // 6, NOT 0
		expect(dc.triggerAction_2).toBe(TRIGGER_NONE);
		expect(dc.triggerName).toBe("");
		expect(dc.onGroundHit).toBe(false);

		const dr = decoded.parts[1] as Rectangle;
		expect(dr.collA).toBe(true); // collide defaulted true
		expect(dr.friction).toBe(11);
	});

	it("legacy physics is unchanged: defaults convert to CE's fixed 0.4/0.3", async () => {
		const { Util } = await import("../src/General/Util");
		expect(Util.ConvertFrictionToBox2D(11)).toBeCloseTo(0.4, 10);
		expect(Util.ConvertRestitutionToBox2D(7)).toBeCloseTo(0.3, 10);
	});

	it("Jaybit-prefixed export round-trips with name/desc/version/exposure", async () => {
		const code = await encodeRobot(jaybitRobot(), undefined, "MyBot", "hello", EXPO_PRIVATE_EDITABLE);
		const decoded = await decodeRobot(code);
		expect(decoded.version).toBe(VERSION_STRING + " ibro");
		expect(decoded.name).toBe("MyBot");
		expect(decoded.desc).toBe("hello");
		expect(decoded.exposure.isPublic).toBe(false);
		expect(decoded.exposure.isEditable).toBe(true);
	});
});

// --- 9. Exposure / uneditable enforcement ------------------------------------

describe("exposure enum (SaveWindow.as:19-27) + uneditable enforcement", () => {
	it("uneditable exposures decode locked; NOSHARE maps to private+uneditable", async () => {
		for (const [expo, isPublic, isEditable] of [
			[EXPO_PUBLIC_UNEDITABLE, true, false],
			[EXPO_PUBLIC_EDITABLE, true, true],
			[EXPO_PRIVATE_UNEDITABLE, false, false],
			[EXPO_PRIVATE_NOSHARE, false, false], // final-else in DetermineExposure
		] as const) {
			const decoded = await decodeRobot(await encodeRobot([new Circle(0, 0, 1)], undefined, "", "", expo));
			expect(decoded.exposure.isPublic).toBe(isPublic);
			expect(decoded.exposure.isEditable).toBe(isEditable);
		}
	});

	it("GameCore blocks mutating commands after importing an uneditable robot", async () => {
		const core = new GameCore(createInitialState());
		const code = await encodeRobot([new Circle(0, -10, 1)], undefined, "", "", EXPO_PUBLIC_UNEDITABLE);
		await core.importRobot(code);
		expect(core.getState().edit.editable).toBe(false);

		const before = core.getState().parts.length;
		core.dispatch({ type: "createShape", kind: "circle", x1: 0, y1: 0, x2: 3, y2: 0 });
		expect(core.getState().parts.length).toBe(before); // blocked

		// newRobot unlocks the editor again.
		core.dispatch({ type: "newRobot" });
		expect(core.getState().edit.editable).toBe(true);
		core.dispatch({ type: "createShape", kind: "circle", x1: 0, y1: 0, x2: 3, y2: 0 });
		expect(core.getState().parts.length).toBeGreaterThan(0);
	});
});

// --- 4. Challenge trailer + fallback chain ------------------------------------

function sampleChallenge(): Challenge {
	const c = new Challenge(new SandboxSettings(15.0, 1, 0, 0, 0));
	c.triggersAllowed = false;
	c.collisionGroupsAllowed = false;
	c.minFriction = 5;
	c.maxFriction = 22;
	c.minRestitution = 2;
	c.maxRestitution = 28;
	c.subCollisionsAllowed = false;
	c.cameraX = 1;
	c.cameraY = 2;
	c.zoomLevel = 25;
	return c;
}

describe("challenge trailer (Database.as :3622-3628 write / :3367-3372 read)", () => {
	it("the seven appended fields round-trip through encode->decode", async () => {
		const code = await encodeChallenge(sampleChallenge(), "Ch", "d", EXPO_PUBLIC_EDITABLE);
		const decoded = await decodeChallengeWithMeta(code);
		expect(decoded.name).toBe("Ch");
		expect(decoded.version).toBe(VERSION_STRING + " ibch");
		const ch = decoded.challenge;
		expect(ch.triggersAllowed).toBe(false);
		expect(ch.collisionGroupsAllowed).toBe(false);
		expect(ch.minFriction).toBe(5);
		expect(ch.maxFriction).toBe(22);
		expect(ch.minRestitution).toBe(2);
		expect(ch.maxRestitution).toBe(28);
		expect(ch.subCollisionsAllowed).toBe(false);
	});

	it("absent trailer (CE-era blob) gets Jaybit defaults: triggersAllowed=FALSE etc.", async () => {
		const ch = await decodeChallengeBlob(raceBlob());
		expect(ch.triggersAllowed).toBe(false);
		expect(ch.collisionGroupsAllowed).toBe(false);
		expect(ch.minFriction).toBe(Number.MAX_VALUE);
		expect(ch.maxFriction).toBe(Number.MAX_VALUE);
		expect(ch.minRestitution).toBe(Number.MAX_VALUE);
		expect(ch.maxRestitution).toBe(Number.MAX_VALUE);
		expect(ch.subCollisionsAllowed).toBe(true);
	});

	it("a prefixed 2.31-layout code (inline friction) parses via the Legacy2_31 fallback", async () => {
		// Hand-build a 2.31 body: parts, settings, 10 bools, minDensity/maxDensity,
		// then the four INLINE friction doubles (Database.as:1253-1256), the five
		// limit doubles, empty buildAreas/conditions, anded, camera, trailing bools
		// + the single 2.31 triggersAllowed. The 2.33 reader misparses this (its
		// buildAreas readObject lands inside a double) and must fall back.
		const b = new ByteArray();
		b.writeObject([]); // parts
		b.writeObject(new SandboxSettings(15.0, 1, 0, 0, 0));
		for (let i = 0; i < 10; i++) b.writeBoolean(true);
		b.writeDouble(1); // minDensity
		b.writeDouble(30); // maxDensity
		b.writeDouble(4); // minFriction (INLINE)
		b.writeDouble(26); // maxFriction
		b.writeDouble(3); // minRestitution
		b.writeDouble(27); // maxRestitution
		b.writeDouble(Number.MAX_VALUE); // maxRJStrength
		b.writeDouble(Number.MAX_VALUE); // maxRJSpeed
		b.writeDouble(Number.MAX_VALUE); // maxSJStrength
		b.writeDouble(Number.MAX_VALUE); // maxSJSpeed
		b.writeDouble(Number.MAX_VALUE); // maxThrusterStrength
		b.writeObject([]); // buildAreas
		b.writeObject([]); // winConditions
		b.writeObject([]); // lossConditions
		b.writeBoolean(true); // winConditionsAnded
		b.writeFloat(0);
		b.writeFloat(0);
		b.writeFloat(30);
		b.writeBoolean(true); // nonColliding
		b.writeBoolean(false); // showConditions
		b.writeBoolean(true); // cannons
		b.writeBoolean(true); // triggersAllowed (2.31 trailer)

		const wrapped = new ByteArray();
		wrapped.writeUTF(VERSION_PREFIX);
		wrapped.writeUTF("2.31.4.0 ibch");
		wrapped.writeUTF("legacy231");
		wrapped.writeUTF("");
		wrapped.writeInt(1);
		wrapped.writeInt(EXPO_PUBLIC_EDITABLE + 2);
		b.position = 0;
		wrapped.writeBytes(b);
		await wrapped.compress();

		const decoded = await decodeChallengeWithMeta(wrapped.buffer.toString("base64"));
		expect(decoded.name).toBe("legacy231");
		expect(decoded.challenge.minFriction).toBe(4);
		expect(decoded.challenge.maxFriction).toBe(26);
		expect(decoded.challenge.minRestitution).toBe(3);
		expect(decoded.challenge.maxRestitution).toBe(27);
		expect(decoded.challenge.triggersAllowed).toBe(true);
	});

	it("prefix-less legacy challenge codes route to the CE-layout reader (ctor defaults)", async () => {
		const code = await encodeChallenge(sampleChallenge(), "L", "");
		const legacy = stripPrefix(code);
		const ch = await decodeChallenge(legacy);
		// The CE reader stops before the trailer bytes would even be looked at?
		// No — CE-layout reads stop at cannonsAllowed; the trailer bytes ARE
		// present in these bytes but Legacy2_24 never reads them, so the values
		// stay at the Challenge constructor defaults (Jaybit ImportChallenge
		// :303-307 semantics).
		expect(ch.triggersAllowed).toBe(true); // ctor default, NOT the encoded false
		expect(ch.minFriction).toBe(-Number.MAX_VALUE);
	});
});

// --- 5. Replay TriggerPress ---------------------------------------------------

function emptyReplay(keyPresses: ReplayData["keyPresses"]): ReplayData {
	return { cameraMovements: [], syncPoints: [], keyPresses, numFrames: 100, version: "0.03" };
}

describe("replay TriggerPress (-2 sentinel, Database.as :3111-3114 / :1873-1905)", () => {
	it("TriggerPress followed by a normal press round-trips (lookahead carry)", async () => {
		const replay = emptyReplay([
			{ frame: 3, key: 40, partIndex: 2 }, // TriggerPress
			{ frame: 9, key: 65 }, // normal — its frame is the lookahead carry
			{ frame: 12, key: 66 },
		]);
		const decoded = await decodeReplay(await encodeReplay(replay));
		expect(decoded.replay.keyPresses).toEqual([
			{ frame: 3, key: 40, partIndex: 2 },
			{ frame: 9, key: 65 },
			{ frame: 12, key: 66 },
		]);
	});

	it("TriggerPress as the LAST record round-trips (terminator after partIndex)", async () => {
		const replay = emptyReplay([
			{ frame: 1, key: 32 },
			{ frame: 5, key: 40, partIndex: 0 },
		]);
		const decoded = await decodeReplay(await encodeReplay(replay));
		expect(decoded.replay.keyPresses).toEqual([
			{ frame: 1, key: 32 },
			{ frame: 5, key: 40, partIndex: 0 },
		]);
	});

	it("a CE-style stream (no TriggerPress) still parses; trailer meta round-trips", async () => {
		const replay = emptyReplay([
			{ frame: 0, key: 32 },
			{ frame: 6, key: 87 },
		]);
		const code = await encodeReplay(replay, undefined, { name: "R1", desc: "d", score: 42, challenge: "ch" });
		const decoded = await decodeReplay(code);
		expect(decoded.replay.keyPresses).toEqual([
			{ frame: 0, key: 32 },
			{ frame: 6, key: 87 },
		]);
		expect(decoded.name).toBe("R1");
		expect(decoded.score).toBe(42);
		expect(decoded.challenge).toBe("ch");
		expect(decoded.version).toBe(VERSION_STRING + " ibre");
	});
});

// --- 6. Camera clamps ----------------------------------------------------------

describe("camera-zoom fix (Database.as :3138-3155): load-side clamps", () => {
	it("a robot saved without a camera (MAX_VALUE sentinel) loads at 0/0/30", async () => {
		// Our headless encoder always writes MAX_VALUE camera floats, which
		// overflow float32 to +Infinity in the bytes — exactly the CE bug input.
		const decoded = await decodeRobot(await encodeRobot([new Circle(0, 0, 1)]));
		expect(decoded.cameraX).toBe(0);
		expect(decoded.cameraY).toBe(0);
		expect(decoded.zoomLevel).toBe(30); // INIT_PHYS_SCALE
	});

	it("a challenge with camera MAX_VALUE loads at 0/0/30", async () => {
		const c = sampleChallenge();
		c.cameraX = Number.MAX_VALUE;
		c.cameraY = Number.MAX_VALUE;
		c.zoomLevel = Number.MAX_VALUE;
		const ch = await decodeChallenge(await encodeChallenge(c));
		expect(ch.cameraX).toBe(0);
		expect(ch.cameraY).toBe(0);
		expect(ch.zoomLevel).toBe(30);
	});

	it("a real camera survives the clamp untouched", async () => {
		const c = sampleChallenge(); // cameraX=1, cameraY=2, zoomLevel=25
		const ch = await decodeChallenge(await encodeChallenge(c));
		expect(ch.cameraX).toBeCloseTo(1, 5);
		expect(ch.cameraY).toBeCloseTo(2, 5);
		expect(ch.zoomLevel).toBeCloseTo(25, 5);
	});
});

// --- 7. TextPart `text` field --------------------------------------------------

describe("TextPart writes `text` for Flash readers (spec §9)", () => {
	it("the AMF payload contains `text` and no `_text` key", async () => {
		const code = await encodeRobot([new TextPart(null, 0, 0, 4, 2, "FLASHVISIBLE")]);
		const raw = inflateSync(Buffer.from(code, "base64")).toString("latin1");
		expect(raw).toContain("FLASHVISIBLE");
		expect(raw).toContain("text");
		expect(raw).not.toContain("_text");
	});

	it("a payload carrying only the old `_text` spelling still decodes", async () => {
		// Simulate a pre-Wave-3a export: rename the AMF key in the raw bytes
		// (same length: `text` -> `_tex` would corrupt; instead build the od by
		// hand via a TextPart clone object carrying _text only).
		const tp = new TextPart(null, 0, 0, 4, 2, "old style");
		(tp as any)._text = tp.text;
		delete (tp as any).text;
		const decoded = await decodeRobot(await encodeRobot([tp]));
		expect((decoded.parts[0] as TextPart).text).toBe("old style");
	});
});

// --- 8 & files. Code <-> file conversion + sniffer ------------------------------

describe("files are byte-identical to base64-decoded codes (spec §3/§4)", () => {
	it("exportRobotFile bytes === base64-decode(encodeRobot string)", async () => {
		const parts = [new Circle(0, 0, 1)];
		const code = await encodeRobot(parts, undefined, "A", "B");
		const file = await exportRobotFile(parts, undefined, "A", "B");
		expect(Buffer.from(file).equals(Buffer.from(code, "base64"))).toBe(true);
		// Round trips both ways through the trivial converters.
		expect(fileBytesToCode(codeToFileBytes(code))).toBe(code);
	});

	it("decodeRobotFile reads raw blob bytes AND a pasted text code (eN sniffer)", async () => {
		const parts = [new Circle(3, 4, 1.25)];
		const code = await encodeRobot(parts, undefined, "FromFile", "");
		expect(isEncryptedText(code)).toBe(true); // zlib codes always start "eN"

		const fromBinary = await decodeRobotFile(codeToFileBytes(code));
		expect(fromBinary.name).toBe("FromFile");
		expect((fromBinary.parts[0] as Circle).radius).toBeCloseTo(1.25, 6);

		const fromPastedCode = await decodeRobotFile(Buffer.from(code, "utf8"));
		expect(fromPastedCode.name).toBe("FromFile");

		expect(sniffFileBytes(Buffer.from(code, "utf8")).kind).toBe("code");
		expect(sniffFileBytes(codeToFileBytes(code)).kind).toBe("binary");
	});

	it("challenge and replay file round-trips match their codes", async () => {
		const chCode = await encodeChallenge(sampleChallenge(), "C", "");
		const chFile = await exportChallengeFile(sampleChallenge(), "C", "");
		expect(Buffer.from(chFile).equals(Buffer.from(chCode, "base64"))).toBe(true);
		expect((await decodeChallengeFile(chFile)).name).toBe("C");

		const replay = emptyReplay([{ frame: 2, key: 40, partIndex: 1 }]);
		const reCode = await encodeReplay(replay, undefined, { name: "R" });
		const reFile = await exportReplayFile(replay, undefined, { name: "R" });
		expect(Buffer.from(reFile).equals(Buffer.from(reCode, "base64"))).toBe(true);
		const decoded = await decodeReplayFile(reFile);
		expect(decoded.name).toBe("R");
		expect(decoded.replay.keyPresses).toEqual([{ frame: 2, key: 40, partIndex: 1 }]);
	});

	it("sanitizeFileName mirrors finishExportingThenSave", () => {
		expect(sanitizeFileName("My Bot: v2.0?", "robot")).toBe("My_Bot__v2_0_");
		expect(sanitizeFileName("", "robot")).toBe("newrobot");
		expect(sanitizeFileName("x".repeat(200), "challenge").length).toBe(150);
	});
});

// --- 10. Cannonballs / runtime-only fields ------------------------------------

describe("runtime-only fields never reach the AMF payload (spec §6 / handoff)", () => {
	it("an exported robot after 'firing' contains no cannonball data", async () => {
		const cannon = new Cannon(0, 0, 2);
		// Simulate post-play leftovers: live-ish objects in the runtime arrays.
		(cannon.cannonballs as any[]).push({ huge: "b2Body-like", GetPosition: () => ({ x: 0, y: 0 }) });
		(cannon as any).cannonballCounters.push(5);
		cannon.triggerTouches = 3;
		cannon.isDestroyed = true;

		const code = await encodeRobot([cannon]);
		const raw = inflateSync(Buffer.from(code, "base64")).toString("latin1");
		expect(raw).not.toContain("cannonballs");
		expect(raw).not.toContain("cannonballCounters");
		expect(raw).not.toContain("triggerTouches");
		expect(raw).not.toContain("isDestroyed");
		expect(raw).not.toContain("b2Body-like");

		// And the round trip still yields a pristine cannon.
		const decoded = await decodeRobot(code);
		const dc = decoded.parts[0] as Cannon;
		expect(dc.cannonballs.length).toBe(0);
		expect(dc.triggerTouches).toBe(0);
		expect(dc.isDestroyed).toBe(false);
	});

	it("Cannon.UnInit clears the cannonball arrays (Jaybit Cannon.as:428-433)", () => {
		const cannon = new Cannon(0, 0, 2);
		(cannon.cannonballs as any[]).push({});
		(cannon as any).cannonballCounters.push(1);
		cannon.UnInit(null as any); // not initted: ShapePart.UnInit early-returns
		expect(cannon.cannonballs.length).toBe(0);
		expect((cannon as any).cannonballCounters.length).toBe(0);
	});
});

// --- CheckVersionNumber ---------------------------------------------------------

describe("checkVersionNumber (Database.as :865-927)", () => {
	it("compares dotted quads component-wise", () => {
		expect(checkVersionNumber(VERSION_STRING)).toBe(SAME_VERSION);
		expect(checkVersionNumber("2.33.0.1", "2.34.0.0")).toBe(OLDER_VERSION);
		expect(checkVersionNumber("2.99.0.0", "2.34.0.0")).toBe(NEWER_VERSION);
		expect(checkVersionNumber("2.34", "2.34.0.0")).toBe(SAME_VERSION); // missing => 0
		expect(checkVersionNumber("garbage", "2.34.0.0")).toBe(OLDER_VERSION); // NaN => 0
	});

	it("a prerelease build treats its own release number as newer", () => {
		expect(checkVersionNumber("2.34.0.0", "2.34.0.0b1")).toBe(NEWER_VERSION);
	});
});
