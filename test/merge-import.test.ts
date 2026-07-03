// Wave 4c — "Import And Insert" (merge-import): GameCore.importRobotInsert decodes
// a robot code and APPENDS its parts to the current robot (concat, fresh ids, no
// offset, relative z-order preserved), rather than replacing like importRobot.
// Port of ControllerGame.importAndInsertButton (:1798) + processLoadedRobot's
// loadAndInsert branch (:8548-8611).

import { describe, expect, it } from "vitest";
import { encodeRobot } from "../src/core/robotSerialization";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { TRIGGER_FIRE } from "../src/Parts/partDefaults";
import { EXPO_PUBLIC_UNEDITABLE } from "../src/core/exposure";
import { coreWithParts } from "./helpers";

describe("importRobotInsert (Import And Insert)", () => {
	it("appends the decoded parts with fresh ids, keeps the originals + z-order, and is undoable", async () => {
		const existing = new Circle(0, 0, 1);
		const { core } = coreWithParts(existing); // existing.id === 1

		// Donor robot: a Rectangle THEN a Circle (relative z-order to preserve).
		const donorRect = new Rectangle(2, 1, 2, 2);
		const donorCircle = new Circle(8, 2, 1);
		const code = await encodeRobot([donorRect, donorCircle], undefined, "donor", "");

		await core.importRobotInsert(code);
		const s = core.getState();

		// Appended (not replaced): 1 original + 2 inserted.
		expect(s.parts.length).toBe(3);
		expect(s.parts[0]).toBe(existing);
		// Relative z-order of the inserted parts is preserved (Rectangle before Circle).
		expect(s.parts[1]).toBeInstanceOf(Rectangle);
		expect(s.parts[2]).toBeInstanceOf(Circle);
		// Inserted parts are DISTINCT instances from the donor objects.
		expect(s.parts[1]).not.toBe(donorRect);
		expect(s.parts[2]).not.toBe(donorCircle);
		// Every id is unique (fresh ids minted, none colliding with the original).
		const ids = s.parts.map((p) => p.id);
		expect(new Set(ids).size).toBe(3);
		expect(ids).toContain(1);

		// Undo restores the pre-insert graph exactly.
		core.dispatch({ type: "undo" });
		const undone = core.getState();
		// Undo restores the pre-insert graph (a history snapshot clone, so identity
		// differs but the single original circle is back).
		expect(undone.parts.length).toBe(1);
		expect(undone.parts[0]).toBeInstanceOf(Circle);
		expect((undone.parts[0] as Circle).centerX).toBeCloseTo(0, 6);
	});

	it("clamps inserted parts to the active challenge friction limits", async () => {
		const donor = new Circle(0, 0, 1);
		donor.friction = 25; // above the limit we set below
		const code = await encodeRobot([donor], undefined, "", "");

		const { core } = coreWithParts(new Circle(9, 0, 1));
		core.dispatch({ type: "newChallenge" });
		core.dispatch({
			type: "setPartLimits",
			minDensity: null,
			maxDensity: null,
			maxFriction: 5,
			maxRJStrength: null,
			maxRJSpeed: null,
			maxSJStrength: null,
			maxSJSpeed: null,
			maxThrusterStrength: null,
		});

		const before = new Set(core.getState().parts);
		await core.importRobotInsert(code);
		const added = core.getState().parts.filter((p) => !before.has(p));
		const addedCircle = added.find((p) => p instanceof Circle) as Circle;
		expect(addedCircle).toBeTruthy();
		expect(addedCircle.friction).toBe(5); // clamped to the challenge max
	});

	it("refuses a trigger-carrying robot in challenge play mode with !triggersAllowed", async () => {
		const donor = new Circle(0, 0, 1);
		donor.triggerName = "boom";
		donor.triggerAction = TRIGGER_FIRE;
		const code = await encodeRobot([donor], undefined, "", "");

		const { core } = coreWithParts(new Circle(9, 0, 1));
		core.dispatch({ type: "newChallenge" });
		core.getLiveChallenge()!.triggersAllowed = false;
		(core as unknown as { challenge: { playMode: boolean } }).challenge.playMode = true;

		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));

		const before = core.getState().parts.length;
		await core.importRobotInsert(code);
		// Refused: no parts appended, legacy dialog emitted.
		expect(core.getState().parts.length).toBe(before);
		expect(messages).toContain("Sorry, triggers are not allowed in this challenge!");
	});

	it("is a no-op when the current robot is uneditable", async () => {
		const { core } = coreWithParts(new Circle(0, 0, 1));
		// Load an uneditable robot first — this locks the editor (curRobotEditable=false).
		const lockedCode = await encodeRobot([new Circle(3, 0, 1)], undefined, "", "", EXPO_PUBLIC_UNEDITABLE);
		await core.importRobot(lockedCode);
		expect(core.getState().edit.editable).toBe(false);
		const before = core.getState().parts.length;

		const donorCode = await encodeRobot([new Circle(6, 0, 1)], undefined, "", "");
		await core.importRobotInsert(donorCode);
		// Blocked: nothing appended.
		expect(core.getState().parts.length).toBe(before);
	});
});

// --- importRobot (REPLACING import) challenge gates + exposure-lock lifecycle ---

describe("importRobot challenge restriction gates (match the insert/paste siblings)", () => {
	it("refuses a trigger-carrying robot in a no-triggers play session; sandbox loads it", async () => {
		const donor = new Circle(0, 0, 1);
		donor.triggerName = "boom";
		donor.triggerAction = TRIGGER_FIRE;
		const code = await encodeRobot([donor], undefined, "", "");

		// Challenge play session with !triggersAllowed -> whole-load refusal.
		const { core } = coreWithParts(new Circle(9, 0, 1));
		core.dispatch({ type: "newChallenge" });
		core.getLiveChallenge()!.triggersAllowed = false;
		(core as unknown as { challenge: { playMode: boolean } }).challenge.playMode = true;
		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));
		const before = core.getState().parts;
		await core.importRobot(code);
		expect(core.getState().parts).toEqual(before); // untouched
		expect(messages).toContain("Sorry, triggers are not allowed in this challenge!");

		// The SAME code loads fine in a plain sandbox session.
		const { core: sandbox } = coreWithParts(new Circle(9, 0, 1));
		await sandbox.importRobot(code);
		const loaded = sandbox.getState().parts.find((p) => p instanceof Circle && (p as Circle).triggerName === "boom");
		expect(loaded).toBeTruthy();
	});

	it("refuses a robot carrying a part type the challenge disallows", async () => {
		const code = await encodeRobot([new Circle(0, 0, 1)], undefined, "", "");
		const { core } = coreWithParts(new Circle(9, 0, 1));
		core.dispatch({ type: "newChallenge" });
		core.getLiveChallenge()!.circlesAllowed = false;
		(core as unknown as { challenge: { playMode: boolean } }).challenge.playMode = true;
		const messages: string[] = [];
		core.onMessage((m) => messages.push(m));
		const before = core.getState().parts;
		await core.importRobot(code);
		expect(core.getState().parts).toEqual(before);
		expect(messages).toContain("Sorry, that robot contains parts that are not allowed in this challenge!");
	});
});

describe("uneditable-robot exposure lock lifecycle", () => {
	it("loading a challenge after an uneditable import unlocks the editor", async () => {
		const { core } = coreWithParts(new Circle(0, 0, 1));
		const lockedCode = await encodeRobot([new Circle(3, 0, 1)], undefined, "", "", EXPO_PUBLIC_UNEDITABLE);
		await core.importRobot(lockedCode);
		expect(core.getState().edit.editable).toBe(false);
		// A mutating command is refused while locked.
		const locked = core.getState().parts.find((p) => p instanceof Circle)! as Circle;
		core.dispatch({ type: "setFriction", partIds: [locked.id], value: 20 });
		expect(locked.friction).not.toBe(20);

		// Loading a CHALLENGE replaces the robot -> the lock lifts (Jaybit
		// recomputes editability on every load). Build a challenge export from a
		// second core and import it here.
		const { core: author } = coreWithParts(new Circle(1, 1, 1));
		author.dispatch({ type: "newChallenge" });
		const challengeStr = await author.exportChallengeString("c", "");
		expect(challengeStr).toBeTruthy();
		await core.importChallenge(challengeStr!);
		expect(core.getState().edit.editable).toBe(true);
		// ... and edits pass again.
		const shape = core.getState().parts.find((p) => p instanceof Circle) as Circle;
		core.dispatch({ type: "setFriction", partIds: [shape.id], value: 20 });
		expect(shape.friction).toBe(20);
	});

	it("undoing an uneditable import unlocks; redo re-locks", async () => {
		const { core } = coreWithParts(new Circle(0, 0, 1));
		const lockedCode = await encodeRobot([new Circle(3, 0, 1)], undefined, "", "", EXPO_PUBLIC_UNEDITABLE);
		await core.importRobot(lockedCode);
		expect(core.getState().edit.editable).toBe(false);

		core.dispatch({ type: "undo" });
		expect(core.getState().edit.editable).toBe(true);
		// Edits pass on the restored (pre-import) robot.
		const shape = core.getState().parts.find((p) => p instanceof Circle) as Circle;
		core.dispatch({ type: "setFriction", partIds: [shape.id], value: 20 });
		expect((core.getState().parts.find((p) => p.id === shape.id) as Circle).friction).toBe(20);

		// Redo re-applies the import and re-locks. (The redo stack was cleared by
		// the setFriction edit above, so rebuild the scenario.)
		const { core: core2 } = coreWithParts(new Circle(0, 0, 1));
		await core2.importRobot(lockedCode);
		core2.dispatch({ type: "undo" });
		expect(core2.getState().edit.editable).toBe(true);
		core2.dispatch({ type: "redo" });
		expect(core2.getState().edit.editable).toBe(false);
	});
});
