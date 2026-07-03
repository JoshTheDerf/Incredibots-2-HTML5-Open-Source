// IB3 merge P1 — native persistence of the new IB3 core-data-model fields:
//
//   1. SandboxSettings water fields (IB3 Control/SandboxSettings.as:37-59)
//      round-trip through the native robot AND challenge formats.
//   2. ShapePart.buoyant / PrismaticJoint.buoyant (IB3 ShapePart.as:25 /
//      SlidingJoint.as:73) round-trip, buoyant=false preserved.
//   3. Legacy codes (no IB3 props in the AMF payload) load with the exact
//      defaults: waterEnabled FALSE (IB2 override of IB3's ENABLED_DEFAULT
//      true — existing sandboxes keep their behavior) and buoyant TRUE.
//   4. Pre-existing fixture blobs (race.dat challenge, robot.dat robot)
//      decode with the same defaults — proof old data is untouched.

import { readFileSync } from "fs";
import { join } from "path";
import { inflateSync } from "zlib";
import { describe, expect, it } from "vitest";

import { encodeRobot, decodeRobot, decodeRobotBlob } from "../src/core/robotSerialization";
import { encodeChallenge, decodeChallenge, decodeChallengeBlob } from "../src/core/challengeSerialization";
import { Challenge } from "../src/Game/Challenge";
import { SandboxSettings } from "../src/Game/SandboxSettings";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { PrismaticJoint } from "../src/Parts/PrismaticJoint";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { Thrusters } from "../src/Parts/Thrusters";
import { TextPart } from "../src/Parts/TextPart";
import { ShapePart } from "../src/Parts/ShapePart";
import type { Part } from "../src/Parts/Part";

const raceBlob = () => readFileSync(join(__dirname, "../resource/race.dat"));
const robotBlob = () => readFileSync(join(__dirname, "../resource/robot.dat"));

/** Non-default values for every IB3 water field. */
function waterySettings(): SandboxSettings {
	const s = new SandboxSettings(9.8, 2, 1, 3, 0, 10, 20, 30);
	s.waterEnabled = true;
	s.waterType = SandboxSettings.WATER_TYPE_WAVE; // 1 (WaterControl.as:21)
	s.waterDensity = 35;
	s.waterHeight = 12.5;
	s.waterColor = 0x2266aa;
	s.waterOpacity = 200;
	s.waterLinearDrag = 7.25;
	s.waterAngularDrag = 3.5;
	s.waterHeightOsc = 0.5;
	s.waterHeightOscSpeed = 2500;
	s.waterTiltOsc = 0.2;
	s.waterTiltOscSpeed = 1.75;
	return s;
}

function expectWaterySettings(s: SandboxSettings): void {
	expect(s.waterEnabled).toBe(true);
	expect(s.waterType).toBe(SandboxSettings.WATER_TYPE_WAVE);
	expect(s.waterDensity).toBe(35);
	expect(s.waterHeight).toBe(12.5);
	expect(s.waterColor).toBe(0x2266aa);
	expect(s.waterOpacity).toBe(200);
	expect(s.waterLinearDrag).toBe(7.25);
	expect(s.waterAngularDrag).toBe(3.5);
	expect(s.waterHeightOsc).toBe(0.5);
	expect(s.waterHeightOscSpeed).toBe(2500);
	expect(s.waterTiltOsc).toBe(0.2);
	expect(s.waterTiltOscSpeed).toBe(1.75);
}

function expectDefaultWater(s: SandboxSettings): void {
	// IB2 override: waterEnabled FALSE (IB3 WaterControl.ENABLED_DEFAULT is true).
	expect(s.waterEnabled).toBe(false);
	// IB3 defaults (WaterControl.as consts + Util.as WC*Default).
	expect(s.waterType).toBe(SandboxSettings.WATER_TYPE_TIDE);
	expect(s.waterDensity).toBe(20);
	expect(s.waterHeight).toBe(0);
	expect(s.waterColor).toBe(255);
	expect(s.waterOpacity).toBe(127);
	expect(s.waterLinearDrag).toBe(5);
	expect(s.waterAngularDrag).toBe(2);
	expect(s.waterHeightOsc).toBe(0.167);
	expect(s.waterHeightOscSpeed).toBe(4000);
	expect(s.waterTiltOsc).toBe(0);
	expect(s.waterTiltOscSpeed).toBe(1);
}

/** A bot with buoyant turned OFF on a shape and a piston (default is true). */
function nonBuoyantRobot(): Part[] {
	const c = new Circle(1, 2, 1.5);
	c.buoyant = false;
	const r = new Rectangle(5, 5, 3, 2);
	const pj = new PrismaticJoint(c, r, 2, 2, 4, 4);
	pj.buoyant = false;
	return [c, r, pj];
}

// --- 1 & 2. Round-trip with non-default values ------------------------------

describe("IB3 fields round-trip through the native robot format", () => {
	it("preserves non-default water settings and buoyant=false parts", async () => {
		const decoded = await decodeRobot(await encodeRobot(nonBuoyantRobot(), waterySettings(), "wet", "bot"));
		expectWaterySettings(decoded.settings);

		const circle = decoded.parts.find((p) => p instanceof Circle) as Circle;
		expect(circle.buoyant).toBe(false);
		const rect = decoded.parts.find((p) => p instanceof Rectangle) as Rectangle;
		expect(rect.buoyant).toBe(true); // untouched shape keeps the default
		const pj = decoded.parts.find((p) => p instanceof PrismaticJoint) as PrismaticJoint;
		expect(pj.buoyant).toBe(false);
	});

	it("buoyant participates in ShapePart.equals()", () => {
		const a = new Circle(1, 2, 1.5);
		const b = new Circle(1, 2, 1.5);
		expect(a.equals(b)).toBe(true);
		b.buoyant = false;
		expect(a.equals(b)).toBe(false);
	});
});

// --- New IB3-direct fields (fixedRotation / joint keys+auto / thruster+text) --

/** A bot exercising every new IB3-direct field at a non-default value. */
function directFieldsRobot(): Part[] {
	const c = new Circle(1, 2, 1.5);
	c.fixedRotation = true;
	const r = new Rectangle(5, 5, 3, 2);
	const rj = new RevoluteJoint(c, r, 1, 1);
	rj.enableKeyCW = false;
	rj.enableKeyCCW = false;
	const pj = new PrismaticJoint(c, r, 2, 2, 4, 4);
	pj.autoExpand = true;
	pj.autoRetract = false;
	pj.beginExpanded = true;
	pj.enableKeyExpand = false;
	pj.enableKeyRetract = false;
	const th = new Thrusters(c, 1, 1);
	th.enableKey = false;
	const t = new TextPart(null, 3, 3, 5, 2, "hi");
	t.angle = 0.7;
	t.alwaysVisible = false;
	t.visibleOnStart = true;
	return [c, r, t, rj, pj, th];
}

describe("new IB3-direct fields round-trip through the native robot format", () => {
	it("preserves fixedRotation, joint key-enables/auto/begin-expanded, thruster+text", async () => {
		const decoded = await decodeRobot(await encodeRobot(directFieldsRobot(), waterySettings(), "d", "b"));
		const circle = decoded.parts.find((p) => p instanceof Circle) as Circle;
		expect(circle.fixedRotation).toBe(true);
		const rj = decoded.parts.find((p) => p instanceof RevoluteJoint) as RevoluteJoint;
		expect(rj.enableKeyCW).toBe(false);
		expect(rj.enableKeyCCW).toBe(false);
		const pj = decoded.parts.find((p) => p instanceof PrismaticJoint) as PrismaticJoint;
		expect(pj.autoExpand).toBe(true);
		expect(pj.autoRetract).toBe(false);
		expect(pj.beginExpanded).toBe(true);
		expect(pj.enableKeyExpand).toBe(false);
		expect(pj.enableKeyRetract).toBe(false);
		const th = decoded.parts.find((p) => p instanceof Thrusters) as Thrusters;
		expect(th.enableKey).toBe(false);
		const t = decoded.parts.find((p) => p instanceof TextPart) as TextPart;
		expect(t.angle).toBeCloseTo(0.7);
		expect(t.visibleOnStart).toBe(true);
	});

	it("XLarge size + Island terrain round-trip", async () => {
		const s = new SandboxSettings(15, SandboxSettings.SIZE_XLARGE, SandboxSettings.TERRAIN_ISLAND, 0, 0);
		const decoded = await decodeRobot(await encodeRobot([new Circle(0, 0, 1)], s, "x", "l"));
		expect(decoded.settings.size).toBe(SandboxSettings.SIZE_XLARGE);
		expect(decoded.settings.terrainType).toBe(SandboxSettings.TERRAIN_ISLAND);
	});

	it("fixedRotation participates in ShapePart.equals()", () => {
		const a = new Circle(1, 2, 1.5);
		const b = new Circle(1, 2, 1.5);
		expect(a.equals(b)).toBe(true);
		b.fixedRotation = true;
		expect(a.equals(b)).toBe(false);
	});

	it("codes missing the new props load with defaults (fixedRotation false, enable-keys true)", async () => {
		const parts = directFieldsRobot();
		// Strip the new own-properties so the AMF payload looks pre-IB3-direct.
		// `angle`/`visibleOnStart` are new only for TextPart (shapes always carry angle).
		for (const p of parts) {
			for (const k of ["fixedRotation", "enableKeyCW", "enableKeyCCW", "autoExpand", "autoRetract", "beginExpanded", "enableKeyExpand", "enableKeyRetract", "enableKey"]) {
				delete (p as any)[k];
			}
			if (p instanceof TextPart) {
				delete (p as any).angle;
				delete (p as any).visibleOnStart;
			}
		}
		const decoded = await decodeRobot(await encodeRobot(parts, waterySettings(), "old", "bot"));
		const circle = decoded.parts.find((p) => p instanceof Circle) as Circle;
		expect(circle.fixedRotation).toBe(false);
		const rj = decoded.parts.find((p) => p instanceof RevoluteJoint) as RevoluteJoint;
		expect(rj.enableKeyCW).toBe(true);
		expect(rj.enableKeyCCW).toBe(true);
		const pj = decoded.parts.find((p) => p instanceof PrismaticJoint) as PrismaticJoint;
		expect(pj.enableKeyExpand).toBe(true);
		expect(pj.enableKeyRetract).toBe(true);
		const th = decoded.parts.find((p) => p instanceof Thrusters) as Thrusters;
		expect(th.enableKey).toBe(true);
	});
});

describe("IB3 fields round-trip through the native challenge format", () => {
	it("preserves non-default water settings and buoyant=false parts", async () => {
		const c = new Challenge(waterySettings());
		c.allParts = nonBuoyantRobot();
		const decoded = await decodeChallenge(await encodeChallenge(c, "wet", "challenge"));
		expectWaterySettings(decoded.settings);

		const circle = decoded.allParts.find((p) => p instanceof Circle) as Circle;
		expect(circle.buoyant).toBe(false);
		const pj = decoded.allParts.find((p) => p instanceof PrismaticJoint) as PrismaticJoint;
		expect(pj.buoyant).toBe(false);
	});
});

// --- physicsEngine round-trip (P1.5b-2b) -------------------------------------

describe("physicsEngine round-trips through the native formats", () => {
	it("robot: non-default engine 1 is preserved; old codes default to 0", async () => {
		const s = new SandboxSettings(15, 0, 0, 0, 0);
		s.physicsEngine = 1; // IB3 (2.1a)
		const decoded = await decodeRobot(await encodeRobot([new Circle(0, 0, 1)], s, "e", "1"));
		expect(decoded.settings.physicsEngine).toBe(1);

		// A code whose AMF payload lacks the field (pre-P1.5b) loads as engine 0.
		const legacy = new SandboxSettings(15, 0, 0, 0, 0);
		delete (legacy as any).physicsEngine;
		const decodedLegacy = await decodeRobot(await encodeRobot([new Circle(0, 0, 1)], legacy, "e", "0"));
		expect(decodedLegacy.settings.physicsEngine).toBe(0);
	});

	it("challenge: non-default engine 1 is preserved", async () => {
		const s = new SandboxSettings(15, 0, 0, 0, 0);
		s.physicsEngine = 1;
		const c = new Challenge(s);
		c.allParts = [new Circle(0, 0, 1)];
		const decoded = await decodeChallenge(await encodeChallenge(c, "e", "1"));
		expect(decoded.settings.physicsEngine).toBe(1);
	});

	it("pre-existing fixtures decode with engine 0", async () => {
		expect((await decodeRobotBlob(robotBlob())).settings.physicsEngine).toBe(0);
		expect((await decodeChallengeBlob(raceBlob())).settings.physicsEngine).toBe(0);
	});
});

// --- 3. Codes WITHOUT the IB3 props load with defaults -----------------------

describe("codes missing the IB3 AMF props load with defaults", () => {
	it("robot: deleted props -> waterEnabled false, buoyant true", async () => {
		const parts = nonBuoyantRobot();
		const settings = waterySettings();
		// Strip the IB3-era own-properties so the AMF payload looks pre-merge
		// (the same technique jaybit-serialization.test.ts uses for CE payloads).
		for (const p of parts) delete (p as any).buoyant;
		for (const key of Object.keys(settings).filter((k) => k.startsWith("water"))) {
			delete (settings as any)[key];
		}
		const code = await encodeRobot(parts, settings, "old", "bot");
		const raw = inflateSync(Buffer.from(code, "base64")).toString("latin1");
		expect(raw).not.toContain("buoyant");
		expect(raw).not.toContain("waterEnabled");

		const decoded = await decodeRobot(code);
		expectDefaultWater(decoded.settings);
		for (const p of decoded.parts) {
			if (p instanceof ShapePart || p instanceof PrismaticJoint) {
				expect(p.buoyant).toBe(true);
			}
		}
	});
});

// --- 4. Pre-existing fixture blobs -------------------------------------------

describe("pre-existing (pre-IB3-merge) fixtures decode with defaults", () => {
	it("robot.dat: default water settings, all parts buoyant", async () => {
		const decoded = await decodeRobotBlob(robotBlob());
		expectDefaultWater(decoded.settings);
		expect(decoded.parts.length).toBeGreaterThan(0);
		for (const p of decoded.parts) {
			if (p instanceof ShapePart || p instanceof PrismaticJoint) {
				expect(p.buoyant).toBe(true);
			}
		}
	});

	it("race.dat challenge: default water settings, all parts buoyant", async () => {
		const challenge = await decodeChallengeBlob(raceBlob());
		expectDefaultWater(challenge.settings);
		expect(challenge.allParts.length).toBeGreaterThan(0);
		for (const p of challenge.allParts) {
			if (p instanceof ShapePart || p instanceof PrismaticJoint) {
				expect(p.buoyant).toBe(true);
			}
		}
	});
});
