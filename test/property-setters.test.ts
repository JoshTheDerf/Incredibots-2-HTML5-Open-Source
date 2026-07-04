// CHARACTERIZATION — GameCore property-setter commands pin the exact legacy
// field mutations + scaling + clamps.
//
// Each command dispatched through GameCore must land the SAME value on the live
// Part that the legacy ControllerGame handlers / src/Actions/* set. Expected
// scales/clamps are cited from GameCore.ts (which itself cites ControllerGame).

import { describe, expect, it } from "vitest";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { Cannon } from "../src/Parts/Cannon";
import { Thrusters } from "../src/Parts/Thrusters";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { PrismaticJoint } from "../src/Parts/PrismaticJoint";
import { TextPart } from "../src/Parts/TextPart";
import { coreWithParts, getPart, selectOne } from "./helpers";

describe("setDensity — absolute value clamped to [MIN_DENSITY,MAX_DENSITY]=1..40 (widened for IB3)", () => {
	it("sets exact in-range value", () => {
		const { core, ids } = coreWithParts(new Circle(0, 0, 1));
		core.dispatch({ type: "setDensity", partIds: ids, value: 7 });
		expect(getPart(core, ids[0]).density).toBe(7);
	});
	it("clamps high to MAX_DENSITY (40, was 30) and low to 1", () => {
		const { core, ids } = coreWithParts(new Circle(0, 0, 1));
		core.dispatch({ type: "setDensity", partIds: ids, value: 999 });
		expect(getPart(core, ids[0]).density).toBe(40);
		core.dispatch({ type: "setDensity", partIds: ids, value: -5 });
		expect(getPart(core, ids[0]).density).toBe(1);
	});
});

describe("setColour — channels stay 0-255, opacity command 0-1 stored *255 (GameCore.ts:1055-1072)", () => {
	it("shape stores r/g/b verbatim and opacity*255", () => {
		const { core, ids } = coreWithParts(new Circle(0, 0, 1));
		core.dispatch({ type: "setColour", partIds: ids, r: 10, g: 20, b: 30, opacity: 0.5 });
		const p = getPart(core, ids[0]);
		expect(p.red).toBe(10);
		expect(p.green).toBe(20);
		expect(p.blue).toBe(30);
		expect(p.opacity).toBe(0.5 * 255); // 127.5
	});
	it("opacity 1 -> 255, opacity 0 -> 0", () => {
		const { core, ids } = coreWithParts(new Rectangle(0, 0, 2, 2));
		core.dispatch({ type: "setColour", partIds: ids, r: 1, g: 2, b: 3, opacity: 1 });
		expect(getPart(core, ids[0]).opacity).toBe(255);
		core.dispatch({ type: "setColour", partIds: ids, r: 1, g: 2, b: 3, opacity: 0 });
		expect(getPart(core, ids[0]).opacity).toBe(0);
	});
	it("TextPart takes r/g/b but has no opacity field (GameCore.ts:1067-1071)", () => {
		const { core, ids } = coreWithParts(new TextPart(null, 0, 0, 4, 2, "t"));
		core.dispatch({ type: "setColour", partIds: ids, r: 5, g: 6, b: 7, opacity: 0.3 });
		const p = getPart(core, ids[0]);
		expect(p.red).toBe(5);
		expect(p.green).toBe(6);
		expect(p.blue).toBe(7);
		expect(p.opacity).toBeUndefined();
	});
});

describe("boolean shape flags map to the right legacy field (GameCore.ts:1092-1134)", () => {
	it("setCollide -> ShapePart.collide; setFixate -> isStatic; setOutline; setOutlineBehind -> terrain; setUndragable", () => {
		const { core, ids } = coreWithParts(new Circle(0, 0, 1));
		core.dispatch({ type: "setCollide", partIds: ids, value: false });
		core.dispatch({ type: "setFixate", partIds: ids, value: true });
		core.dispatch({ type: "setOutline", partIds: ids, value: false });
		core.dispatch({ type: "setOutlineBehind", partIds: ids, value: true });
		core.dispatch({ type: "setUndragable", partIds: ids, value: true });
		const p = getPart(core, ids[0]);
		expect(p.collide).toBe(false);
		expect(p.isStatic).toBe(true); // "Fixate" == isStatic
		expect(p.outline).toBe(false);
		expect(p.terrain).toBe(true); // "Outlines Behind" == terrain
		expect(p.undragable).toBe(true);
	});

	it("setCameraFocus on one part clears focus on any other (GameCore.ts:1100-1109)", () => {
		const a = new Circle(0, 0, 1);
		const b = new Circle(3, 0, 1);
		const { core, ids } = coreWithParts(a, b);
		core.dispatch({ type: "setCameraFocus", partIds: [ids[0]], value: true });
		core.dispatch({ type: "setCameraFocus", partIds: [ids[1]], value: true });
		expect(getPart(core, ids[0]).isCameraFocus).toBe(false);
		expect(getPart(core, ids[1]).isCameraFocus).toBe(true);
	});

	it("setCollide / setOutline also apply to PrismaticJoint (GameCore.ts:1095,1121)", () => {
		const p1 = new Circle(0, 0, 1);
		const p2 = new Circle(4, 0, 1);
		const pj = new PrismaticJoint(p1, p2, 0, 0, 4, 0);
		const { core, ids } = coreWithParts(p1, p2, pj);
		const pjId = ids[2];
		core.dispatch({ type: "setCollide", partIds: [pjId], value: false });
		core.dispatch({ type: "setOutline", partIds: [pjId], value: false });
		expect(getPart(core, pjId).collide).toBe(false);
		expect(getPart(core, pjId).outline).toBe(false);
	});
});

describe("joint motor / strength / speed (GameCore.ts:1139-1162)", () => {
	function revoluteCore() {
		const p1 = new Circle(0, 0, 1);
		const p2 = new Circle(4, 0, 1);
		const rj = new RevoluteJoint(p1, p2, 2, 0);
		const { core, ids } = coreWithParts(p1, p2, rj);
		return { core, jid: ids[2] };
	}

	it("setJointMotor -> enableMotor (revolute)", () => {
		const { core, jid } = revoluteCore();
		core.dispatch({ type: "setJointMotor", partIds: [jid], value: true });
		expect(getPart(core, jid).enableMotor).toBe(true);
	});
	it("setJointStrength/Speed clamp to 1..30 (MAX_JOINT_VALUE)", () => {
		const { core, jid } = revoluteCore();
		core.dispatch({ type: "setJointStrength", partIds: [jid], value: 100 });
		core.dispatch({ type: "setJointSpeed", partIds: [jid], value: 0 });
		expect(getPart(core, jid).motorStrength).toBe(30);
		expect(getPart(core, jid).motorSpeed).toBe(1);
	});
	it("prismatic motor -> enablePiston (GameCore.ts:1142)", () => {
		const p1 = new Circle(0, 0, 1);
		const p2 = new Circle(4, 0, 1);
		const pj = new PrismaticJoint(p1, p2, 0, 0, 4, 0);
		const { core, ids } = coreWithParts(p1, p2, pj);
		core.dispatch({ type: "setJointMotor", partIds: [ids[2]], value: true });
		expect(getPart(core, ids[2]).enablePiston).toBe(true);
	});
});

describe("revolute limits — degrees; null=None(∓MAX_VALUE); lower≤0, upper≥0 (GameCore.ts:1167-1176)", () => {
	function revoluteCore() {
		const p1 = new Circle(0, 0, 1);
		const p2 = new Circle(4, 0, 1);
		const rj = new RevoluteJoint(p1, p2, 2, 0);
		const { core, ids } = coreWithParts(p1, p2, rj);
		return { core, jid: ids[2] };
	}

	it("null limits store ∓Number.MAX_VALUE", () => {
		const { core, jid } = revoluteCore();
		core.dispatch({ type: "setJointLimits", partIds: [jid], lower: null, upper: null });
		expect(getPart(core, jid).motorLowerLimit).toBe(-Number.MAX_VALUE);
		expect(getPart(core, jid).motorUpperLimit).toBe(Number.MAX_VALUE);
	});
	it("lower is clamped to ≤0, upper to ≥0", () => {
		const { core, jid } = revoluteCore();
		core.dispatch({ type: "setJointLimits", partIds: [jid], lower: 45, upper: -30 });
		// lower=min(0,45)=0 ; upper=max(0,-30)=0
		expect(getPart(core, jid).motorLowerLimit).toBe(0);
		expect(getPart(core, jid).motorUpperLimit).toBe(0);
	});
	it("keeps valid negative lower / positive upper verbatim", () => {
		const { core, jid } = revoluteCore();
		core.dispatch({ type: "setJointLimits", partIds: [jid], lower: -90, upper: 90 });
		expect(getPart(core, jid).motorLowerLimit).toBe(-90);
		expect(getPart(core, jid).motorUpperLimit).toBe(90);
	});
});

describe("joint control keys & auto flags (GameCore.ts:1180-1215)", () => {
	function revoluteCore() {
		const p1 = new Circle(0, 0, 1);
		const p2 = new Circle(4, 0, 1);
		const rj = new RevoluteJoint(p1, p2, 2, 0);
		const { core, ids } = coreWithParts(p1, p2, rj);
		return { core, jid: ids[2] };
	}

	it("cw/ccw keys route to motorCWKey/motorCCWKey", () => {
		const { core, jid } = revoluteCore();
		core.dispatch({ type: "setJointControlKey", partIds: [jid], which: "cw", key: 65 });
		core.dispatch({ type: "setJointControlKey", partIds: [jid], which: "ccw", key: 66 });
		expect(getPart(core, jid).motorCWKey).toBe(65);
		expect(getPart(core, jid).motorCCWKey).toBe(66);
	});
	it("autoCW and autoCCW are mutually exclusive (GameCore.ts:1196-1203)", () => {
		const { core, jid } = revoluteCore();
		core.dispatch({ type: "setJointAutoOn", partIds: [jid], which: "cw", value: true });
		expect(getPart(core, jid).autoCW).toBe(true);
		expect(getPart(core, jid).autoCCW).toBe(false);
		core.dispatch({ type: "setJointAutoOn", partIds: [jid], which: "ccw", value: true });
		expect(getPart(core, jid).autoCCW).toBe(true);
		expect(getPart(core, jid).autoCW).toBe(false); // cleared
	});
	it("setJointStiff -> isStiff; setJointInitialLength clamps ≥0 (prismatic)", () => {
		const p1 = new Circle(0, 0, 1);
		const p2 = new Circle(4, 0, 1);
		const pj = new PrismaticJoint(p1, p2, 0, 0, 4, 0);
		const { core, ids } = coreWithParts(p1, p2, pj);
		core.dispatch({ type: "setJointStiff", partIds: [ids[2]], value: true });
		core.dispatch({ type: "setJointInitialLength", partIds: [ids[2]], value: -3 });
		expect(getPart(core, ids[2]).isStiff).toBe(true);
		expect(getPart(core, ids[2]).initLength).toBe(0);
	});
});

describe("thruster & cannon setters (GameCore.ts:1223-1252)", () => {
	it("thruster strength clamps 1..30; key/autoOn set", () => {
		const shape = new Circle(0, 0, 1);
		const t = new Thrusters(shape, 0, 0);
		const { core, ids } = coreWithParts(shape, t);
		const tid = ids[1];
		core.dispatch({ type: "setThrusterStrength", partIds: [tid], value: 50 });
		core.dispatch({ type: "setThrusterKey", partIds: [tid], key: 87 });
		core.dispatch({ type: "setThrusterAutoOn", partIds: [tid], value: true });
		expect(getPart(core, tid).strength).toBe(30);
		expect(getPart(core, tid).thrustKey).toBe(87);
		expect(getPart(core, tid).autoOn).toBe(true);
	});
	it("cannon strength clamps 1..30; fireKey set", () => {
		const { core, ids } = coreWithParts(new Cannon(0, 0, 4));
		core.dispatch({ type: "setCannonStrength", partIds: ids, value: -10 });
		core.dispatch({ type: "setCannonFireKey", partIds: ids, key: 32 });
		expect(getPart(core, ids[0]).strength).toBe(1);
		expect(getPart(core, ids[0]).fireKey).toBe(32);
	});
});

describe("text setters (GameCore.ts:1256-1279)", () => {
	it("content/size(≥1)/displayKey/alwaysVisible/scaleWithZoom", () => {
		const { core, ids } = coreWithParts(new TextPart(null, 0, 0, 4, 2, "orig"));
		core.dispatch({ type: "setTextContent", partIds: ids, text: "new" });
		core.dispatch({ type: "setTextSize", partIds: ids, value: 0 });
		core.dispatch({ type: "setTextDisplayKey", partIds: ids, key: 70 });
		core.dispatch({ type: "setTextAlwaysVisible", partIds: ids, value: false });
		core.dispatch({ type: "setTextScaleWithZoom", partIds: ids, value: false });
		const p = getPart(core, ids[0]);
		expect(p.text).toBe("new");
		expect(p.size).toBe(1); // clamped to ≥1
		expect(p.displayKey).toBe(70);
		expect(p.alwaysVisible).toBe(false);
		expect(p.scaleWithZoom).toBe(false);
	});
});

describe("selectedPart snapshot scales opacity back to 0-1 (GameCore.ts:337)", () => {
	it("part stored opacity 255 surfaces as 1 in the snapshot", () => {
		const { core, ids } = coreWithParts(new Circle(0, 0, 1));
		selectOne(core, ids[0]);
		const snap = core.getState().edit.selectedPart!;
		expect(snap.opacity).toBe(1); // 255/255
		expect(snap.red).toBe(253); // channels remain 0-255
		expect(snap.density).toBe(15);
	});
});
