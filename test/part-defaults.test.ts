// CHARACTERIZATION — Part constructor defaults pinned to the legacy values.
//
// The ported Part classes must construct with the EXACT same defaults the
// ActionScript/legacy game used, so bots built on the new stack behave (and
// serialize) identically. Every expected value below cites the legacy source
// it is derived from.

import { describe, expect, it } from "vitest";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { Triangle } from "../src/Parts/Triangle";
import { Cannon } from "../src/Parts/Cannon";
import { Thrusters } from "../src/Parts/Thrusters";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { PrismaticJoint } from "../src/Parts/PrismaticJoint";
import { FixedJoint } from "../src/Parts/FixedJoint";
import { TextPart } from "../src/Parts/TextPart";
import {
	DEFAULT_R,
	DEFAULT_G,
	DEFAULT_B,
	DEFAULT_O,
	MIN_DENSITY,
	MAX_DENSITY,
} from "../src/Parts/partDefaults";

// partDefaults.ts:12-18 — these MUST stay in sync with the legacy
// ControllerGameGlobals defaultR/G/B/O + min/maxDensity.
describe("partDefaults constants (partDefaults.ts:12-24)", () => {
	it("default colour is 253/66/42/255", () => {
		expect(DEFAULT_R).toBe(253);
		expect(DEFAULT_G).toBe(66);
		expect(DEFAULT_B).toBe(42);
		expect(DEFAULT_O).toBe(255);
	});
	it("density range is 1..40 (max widened from 30 to accommodate IB3's density range)", () => {
		expect(MIN_DENSITY).toBe(1);
		expect(MAX_DENSITY).toBe(40);
	});
});

// ShapePart ctor (ShapePart.ts:32-53): density=15 (MIN<15<MAX), angle=0,
// colour = DEFAULT_R/G/B/O, outline=true, terrain=false, undragable=false,
// collide=true (field init :14), isCameraFocus=false (:15), isStatic=false
// (Part.ts:9).
function expectLegacyShapeDefaults(p: any, kind: string) {
	expect(p.type).toBe(kind);
	expect(p.density).toBe(15);
	expect(p.angle).toBe(0);
	expect(p.red).toBe(253);
	expect(p.green).toBe(66);
	expect(p.blue).toBe(42);
	expect(p.opacity).toBe(255);
	expect(p.outline).toBe(true);
	expect(p.terrain).toBe(false);
	expect(p.undragable).toBe(false);
	expect(p.collide).toBe(true);
	expect(p.isCameraFocus).toBe(false);
	expect(p.isStatic).toBe(false);
	expect(p.isEnabled).toBe(true);
	expect(p.drawAnyway).toBe(true);
}

describe("ShapePart family constructor defaults", () => {
	it("Circle: legacy shape defaults + radius stored; MIN/MAX_RADIUS 0.1/5.0 (Circle.ts:11-12)", () => {
		const c = new Circle(3, 4, 2);
		expectLegacyShapeDefaults(c, "Circle");
		expect(c.centerX).toBe(3);
		expect(c.centerY).toBe(4);
		expect(c.radius).toBe(2);
		expect(Circle.MIN_RADIUS).toBe(0.1);
		expect(Circle.MAX_RADIUS).toBe(5.0);
	});

	it("Circle clamps radius to [0.1, 5.0] (Circle.ts:17-20)", () => {
		expect(new Circle(0, 0, 100).radius).toBe(5.0);
		expect(new Circle(0, 0, 0.001).radius).toBe(0.1);
		// checkLimits=false bypasses the clamp (used by deserialization).
		expect(new Circle(0, 0, 100, false).radius).toBe(100);
	});

	it("Rectangle: legacy shape defaults; centre = corner + w/2,h/2 (Rectangle.ts:43-44); MIN/MAX 0.1/10 (:17-18)", () => {
		const r = new Rectangle(1, 2, 4, 6);
		expectLegacyShapeDefaults(r, "Rectangle");
		expect(r.x).toBe(1);
		expect(r.y).toBe(2);
		expect(r.w).toBe(4);
		expect(r.h).toBe(6);
		expect(r.centerX).toBe(1 + 4 / 2);
		expect(r.centerY).toBe(2 + 6 / 2);
		expect(Rectangle.MIN_WIDTH).toBe(0.1);
		expect(Rectangle.MAX_WIDTH).toBe(10.0);
	});

	it("Rectangle clamps |w|,|h| to [0.1,10] keeping sign-normalised corner (Rectangle.ts:23-35)", () => {
		expect(new Rectangle(0, 0, 100, 100).w).toBe(10);
		expect(new Rectangle(0, 0, 100, 100).h).toBe(10);
		expect(new Rectangle(0, 0, 0.01, 0.01).w).toBe(0.1);
	});

	it("Triangle: legacy shape defaults; centroid = mean of verts (Triangle.ts:36-39); side/angle limits (:21-23)", () => {
		const t = new Triangle(0, 0, 4, 0, 0, 3);
		expectLegacyShapeDefaults(t, "Triangle");
		expect(t.centerX).toBeCloseTo((t.x1 + t.x2 + t.x3) / 3, 10);
		expect(t.centerY).toBeCloseTo((t.y1 + t.y2 + t.y3) / 3, 10);
		expect(Triangle.MIN_SIDE_LENGTH).toBe(0.1);
		expect(Triangle.MAX_SIDE_LENGTH).toBe(10.0);
		expect(Triangle.MIN_TRIANGLE_ANGLE).toBeCloseTo((5.0 * Math.PI) / 180.0, 12);
	});

	it("Cannon: fireKey=40, strength=15 (Cannon.ts:45-46); MIN/MAX_WIDTH 0.5/10 (:21-22); centre offsets (:42-43)", () => {
		const cn = new Cannon(2, 3, 4);
		expectLegacyShapeDefaults(cn, "Cannon");
		expect(cn.fireKey).toBe(40);
		expect(cn.strength).toBe(15);
		expect(cn.x).toBe(2);
		expect(cn.y).toBe(3);
		expect(cn.w).toBe(4);
		expect(cn.centerX).toBe(2 + 4 / 2);
		expect(cn.centerY).toBe(3 + 4 / 4);
		expect(Cannon.MIN_WIDTH).toBe(0.5);
		expect(Cannon.MAX_WIDTH).toBe(10.0);
	});
});

describe("Joint & Thruster constructor defaults", () => {
	// Two shapes to hang joints on.
	const p1 = new Circle(0, 0, 1);
	const p2 = new Circle(5, 0, 1);

	it("RevoluteJoint: enableMotor=false, keys CW=39/CCW=37, strength/speed=15, limits ∓MAX_VALUE, isStiff/auto=false (RevoluteJoint.ts:31-49)", () => {
		const j = new RevoluteJoint(p1, p2, 2.5, 0);
		expect(j.type).toBe("RevoluteJoint");
		expect(j.anchorX).toBe(2.5);
		expect(j.anchorY).toBe(0);
		expect(j.enableMotor).toBe(false);
		expect(j.motorCWKey).toBe(39);
		expect(j.motorCCWKey).toBe(37);
		expect(j.motorStrength).toBe(15);
		expect(j.motorSpeed).toBe(15);
		expect(j.motorLowerLimit).toBe(-Number.MAX_VALUE);
		expect(j.motorUpperLimit).toBe(Number.MAX_VALUE);
		expect(j.isStiff).toBe(false);
		expect(j.autoCW).toBe(false);
		expect(j.autoCCW).toBe(false);
	});

	it("PrismaticJoint: enablePiston=false, keys up=38/down=40, strength/speed=15, colour defaults, outline=true, collide=true, anchor=midpoint, axis normalised, initLength=dist (PrismaticJoint.ts:56-81)", () => {
		const j = new PrismaticJoint(p1, p2, 0, 0, 4, 0);
		expect(j.type).toBe("PrismaticJoint");
		expect(j.enablePiston).toBe(false);
		expect(j.pistonUpKey).toBe(38);
		expect(j.pistonDownKey).toBe(40);
		expect(j.pistonStrength).toBe(15);
		expect(j.pistonSpeed).toBe(15);
		expect(j.isStiff).toBe(false);
		expect(j.autoOscillate).toBe(false);
		expect(j.red).toBe(253);
		expect(j.green).toBe(66);
		expect(j.blue).toBe(42);
		expect(j.opacity).toBe(255);
		expect(j.outline).toBe(true);
		expect(j.collide).toBe(true);
		expect(j.anchorX).toBe(2); // (0+4)/2
		expect(j.anchorY).toBe(0);
		expect(j.axis.x).toBeCloseTo(1, 10); // normalised (4,0)
		expect(j.axis.y).toBeCloseTo(0, 10);
		expect(j.initLength).toBeCloseTo(4, 10);
	});

	it("FixedJoint: type + anchor only (FixedJoint.ts:7-12)", () => {
		const j = new FixedJoint(p1, p2, 1.5, 2.5);
		expect(j.type).toBe("FixedJoint");
		expect(j.anchorX).toBe(1.5);
		expect(j.anchorY).toBe(2.5);
	});

	it("Thrusters: strength=15, angle=-PI/2, thrustKey=38, autoOn=false, attaches to shape (Thrusters.ts:24-35)", () => {
		const shape = new Circle(0, 0, 1);
		const t = new Thrusters(shape, 0, 0);
		expect(t.type).toBe("Thrusters");
		expect(t.strength).toBe(15);
		expect(t.angle).toBeCloseTo(-Math.PI / 2, 12);
		expect(t.thrustKey).toBe(38);
		expect(t.autoOn).toBe(false);
		expect(t.shape).toBe(shape);
	});
});

describe("TextPart constructor defaults (TextPart.ts:10-60)", () => {
	it("black colour, size=14, displayKey=32, alwaysVisible/scaleWithZoom/inFront=true", () => {
		const tp = new TextPart(null, 1, 2, 4, 2, "hello");
		expect(tp.type).toBe("TextPart"); // TextPart.ts:62
		expect(tp.x).toBe(1);
		expect(tp.y).toBe(2);
		expect(tp.w).toBe(4);
		expect(tp.h).toBe(2);
		expect(tp.text).toBe("hello");
		expect(tp.red).toBe(0);
		expect(tp.green).toBe(0);
		expect(tp.blue).toBe(0);
		expect(tp.size).toBe(14);
		expect(tp.displayKey).toBe(32);
		expect(tp.alwaysVisible).toBe(true);
		expect(tp.scaleWithZoom).toBe(true);
		expect(tp.inFront).toBe(true);
	});
});
