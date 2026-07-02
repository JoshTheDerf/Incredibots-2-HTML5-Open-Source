// M5 — challenge string import/export + the play->reset joint/thruster origin fix.
//
// 1. encodeChallenge/decodeChallenge round-trip (faithful port of
//    Database.PutChallengeIntoByteArray/ExportChallenge <-> ImportChallenge):
//    parts, conditions, restrictions, build areas, and camera survive a full
//    base64 -> zlib -> header -> body -> header -> zlib -> base64 round-trip.
// 2. The built-in Race blob re-encoded to a string then decoded back matches the
//    original (proves the string wrapper matches the blob body extraction).
// 3. GameCore.importChallenge makes the decoded challenge the live session.
// 4. Regression: play -> reset must NOT move joints/thrusters to the origin
//    (currentXY returned {0,0} for non-shape/text parts, so reset dragged their
//    anchor/center to (0,0)).

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import {
	decodeChallenge,
	encodeChallenge,
	decodeChallengeBlob,
} from "../src/core/challengeSerialization";
import { createChallengeSession } from "../src/core/challenge";
import { Challenge } from "../src/Game/Challenge";
import { SandboxSettings } from "../src/Game/SandboxSettings";
import { WinCondition } from "../src/Game/WinCondition";
import { LossCondition } from "../src/Game/LossCondition";
import { b2AABB } from "../src/Box2D";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { Thrusters } from "../src/Parts/Thrusters";
import { ShapePart } from "../src/Parts/ShapePart";
import type { Part } from "../src/Parts/Part";

function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

/** Build a small authored challenge: two shapes + a shape-bound win condition,
 * restrictions, a build area, and a camera/zoom, exercising every field the
 * encoder writes. */
function sampleChallenge(): Challenge {
	const a = new Circle(5, 5, 1);
	const b = new Rectangle(8, 8, 2, 2, false);
	// Parts stored in a challenge must be flagged drawAnyway (Database.IsPartOfRobot).
	a.isEditable = true;
	b.isEditable = true;
	const c = new Challenge(new SandboxSettings(15.0, 2, 1, 3, 0, 10, 20, 30));
	c.allParts = [a, b];
	c.circlesAllowed = true;
	c.rectanglesAllowed = false;
	c.trianglesAllowed = true;
	c.thrustersAllowed = false;
	c.mouseDragAllowed = true;
	c.botControlAllowed = true;
	c.cannonsAllowed = false;
	c.minDensity = 5;
	c.maxDensity = 42;
	c.maxRJStrength = 100;
	c.winConditionsAnded = false;

	const win = new WinCondition("Win", 0, 0); // subject-0 within a box, bound to shape1
	win.shape1 = a;
	win.minX = 0;
	win.maxX = 50;
	win.minY = 0;
	win.maxY = 50;
	c.winConditions.push(win);

	const loss = new LossCondition("Loss", 0, 1, true); // subject-0 above a line
	loss.shape1 = b;
	loss.minY = 100;
	c.lossConditions.push(loss);

	const area = new b2AABB();
	area.lowerBound.Set(1, 1);
	area.upperBound.Set(20, 20);
	c.buildAreas.push(area);

	c.cameraX = 7;
	c.cameraY = 9;
	c.zoomLevel = 24;
	return c;
}

describe("encodeChallenge <-> decodeChallenge round-trip", () => {
	it("preserves parts, restrictions, limits, conditions, build areas and camera", async () => {
		const original = sampleChallenge();
		const str = await encodeChallenge(original, "My Challenge", "desc", 1, 1);
		expect(typeof str).toBe("string");
		expect(str.length).toBeGreaterThan(0);

		const decoded = await decodeChallenge(str);

		// Parts survive (2 shapes).
		expect(decoded.allParts.length).toBe(2);
		const types = decoded.allParts.map((p) => (p as { type: string }).type).sort();
		expect(types).toEqual(["Circle", "Rectangle"]);

		// Restrictions.
		expect(decoded.circlesAllowed).toBe(true);
		expect(decoded.rectanglesAllowed).toBe(false);
		expect(decoded.trianglesAllowed).toBe(true);
		expect(decoded.thrustersAllowed).toBe(false);
		expect(decoded.mouseDragAllowed).toBe(true);
		expect(decoded.botControlAllowed).toBe(true);
		expect(decoded.cannonsAllowed).toBe(false);

		// Numeric limits.
		expect(decoded.minDensity).toBe(5);
		expect(decoded.maxDensity).toBe(42);
		expect(decoded.maxRJStrength).toBe(100);

		// Conditions (with shape references re-resolved by index).
		expect(decoded.winConditions.length).toBe(1);
		expect(decoded.winConditions[0].subject).toBe(0);
		expect(decoded.winConditions[0].object).toBe(0);
		expect(decoded.winConditions[0].maxX).toBe(50);
		expect(decoded.winConditions[0].shape1).toBeTruthy();
		expect(decoded.lossConditions.length).toBe(1);
		expect((decoded.lossConditions[0] as LossCondition).immediate).toBe(true);
		expect(decoded.lossConditions[0].shape1).toBeTruthy();
		expect(decoded.winConditionsAnded).toBe(false);

		// Build areas + settings + camera.
		expect(decoded.buildAreas.length).toBe(1);
		expect(decoded.buildAreas[0].lowerBound.x).toBe(1);
		expect(decoded.buildAreas[0].upperBound.x).toBe(20);
		expect(decoded.settings.terrainType).toBe(1);
		expect(decoded.settings.backgroundR).toBe(10);
		expect(decoded.cameraX).toBeCloseTo(7, 4);
		expect(decoded.zoomLevel).toBeCloseTo(24, 4);
	});

	it("Race blob re-encoded to a string decodes back to the same challenge", async () => {
		const blob = await decodeChallengeBlob(readFileSync("resource/race.dat"));
		const str = await encodeChallenge(blob);
		const back = await decodeChallenge(str);
		expect(back.allParts.length).toBe(blob.allParts.length);
		expect(back.winConditions.length).toBe(blob.winConditions.length);
		expect(back.lossConditions.length).toBe(blob.lossConditions.length);
		expect(back.winConditionsAnded).toBe(blob.winConditionsAnded);
		expect(back.circlesAllowed).toBe(blob.circlesAllowed);
		expect(back.cannonsAllowed).toBe(blob.cannonsAllowed);
		expect(back.zoomLevel).toBeCloseTo(blob.zoomLevel, 3);
	});
});

describe("GameCore.importChallenge — string import makes it the live session", () => {
	it("decodes a challenge export string, seeds parts + sandbox, exposes the read-model", async () => {
		const original = sampleChallenge();
		const str = await encodeChallenge(original);

		const core = new GameCore(createInitialState());
		await core.importChallenge(str);
		const st = core.getState();

		expect(st.challenge).not.toBeNull();
		expect(st.challenge!.active).toBe(true);
		expect(st.challenge!.playMode).toBe(true);
		expect(st.challenge!.winConditions.length).toBe(1);
		expect(st.challenge!.lossConditions.length).toBe(1);
		expect(st.challenge!.restrictions.rects).toBe(false);
		expect(st.challenge!.builtIn).toBe(null); // user challenge, not built-in
		// Parts seeded into the graph.
		expect(st.parts.length).toBe(2);
		// Sandbox seeded from the challenge settings; zoom applied to the camera.
		expect(st.sandbox.terrainType).toBe(1);
		expect(st.camera.scale).toBeCloseTo(24, 3);
	});

	it("a GameCore.exportChallengeString round-trips back through importChallenge", async () => {
		const core = coreWith([new Circle(3, 3, 1)]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "addWinCondition", subject: 1, object: 0, region: { minX: 0, maxX: 40, minY: 0, maxY: 40 } });
		core.dispatch({ type: "setWinConditionsAnded", value: false });
		const str = await core.exportChallengeString();
		expect(str).toBeTruthy();

		const decoded = await decodeChallenge(str!);
		expect(decoded.winConditions.length).toBe(1);
		expect(decoded.winConditions[0].subject).toBe(1);
		expect(decoded.winConditions[0].maxX).toBe(40);
		expect(decoded.winConditionsAnded).toBe(false);
	});

	it("exportChallengeString returns null with no active challenge", async () => {
		const core = coreWith([]);
		expect(await core.exportChallengeString()).toBe(null);
	});
});

// --- Regression: play -> reset must not send joints/thrusters to the origin ---

describe("play -> reset preserves joint anchor and thruster center (currentXY fix)", () => {
	it("a revolute joint's anchor is restored to its pre-play value, not (0,0)", () => {
		// Two overlapping editable circles away from the origin + a revolute joint
		// binding them at their shared center.
		const a = new Circle(12, 7, 3);
		const b = new Circle(12, 7, 3);
		a.isEditable = true;
		b.isEditable = true;
		const core = coreWith([a, b]);
		core.dispatch({ type: "createJoint", kind: "revolute", x: 12, y: 7 });
		const joint = core.getState().parts.find((p) => p instanceof RevoluteJoint) as RevoluteJoint;
		expect(joint).toBeTruthy();
		const anchorX = joint.anchorX;
		const anchorY = joint.anchorY;
		expect(anchorX).not.toBe(0);
		expect(anchorY).not.toBe(0);

		// Play, step so bodies move, then reset.
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 10 });
		core.dispatch({ type: "reset" });

		const jointAfter = core.getState().parts.find((p) => p instanceof RevoluteJoint) as RevoluteJoint;
		expect(jointAfter.anchorX).toBeCloseTo(anchorX, 5);
		expect(jointAfter.anchorY).toBeCloseTo(anchorY, 5);
		expect(jointAfter.anchorX).not.toBe(0);
		expect(jointAfter.anchorY).not.toBe(0);
	});

	it("a thruster's center is restored to its pre-play value, not (0,0)", () => {
		const shape = new Circle(15, 9, 3);
		shape.isEditable = true;
		const core = coreWith([shape]);
		core.dispatch({ type: "createThrusters", x: 15, y: 9 });
		const thr = core.getState().parts.find((p) => p instanceof Thrusters) as Thrusters;
		expect(thr).toBeTruthy();
		const cx = thr.centerX;
		const cy = thr.centerY;
		expect(cx).not.toBe(0);
		expect(cy).not.toBe(0);

		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 10 });
		core.dispatch({ type: "reset" });

		const thrAfter = core.getState().parts.find((p) => p instanceof Thrusters) as Thrusters;
		expect(thrAfter.centerX).toBeCloseTo(cx, 5);
		expect(thrAfter.centerY).toBeCloseTo(cy, 5);
		expect(thrAfter.centerX).not.toBe(0);
		expect(thrAfter.centerY).not.toBe(0);
	});

	it("shape positions still reset correctly (no regression to the shape path)", () => {
		const shape = new Circle(20, 4, 1);
		shape.isEditable = true;
		const core = coreWith([shape]);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 20 }); // it falls under gravity
		core.dispatch({ type: "reset" });
		const s = core.getState().parts.find((p) => p instanceof ShapePart) as ShapePart;
		expect(s.centerX).toBeCloseTo(20, 3);
		expect(s.centerY).toBeCloseTo(4, 3);
	});
});
