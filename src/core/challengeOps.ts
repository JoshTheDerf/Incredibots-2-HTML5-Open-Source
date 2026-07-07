// Challenge command handlers — sessions, conditions, restrictions, build areas.
//
// Extracted from GameCore: the win/loss-condition constructors (shared by the
// addWinCondition/addLossCondition commands and the interactive stage-picking
// flow), the condition-draft state machine, and applyChallengeCommand — the
// dispatcher for the whole challenge command family (returns false for any
// command outside it). Free functions over the CoreInternals seam.

import { b2AABB } from "../Box2D";
import { WinCondition } from "../Game/WinCondition";
import { LossCondition } from "../Game/LossCondition";
import { ShapePart } from "../Parts/ShapePart";
import type { Command } from "./Command";
import {
	NO_LIMIT_MAX,
	NO_LIMIT_MIN,
	buildBuiltInChallenge,
	createChallengeSession,
} from "./challenge";
import type { CoreInternals } from "./coreInternals";
import type { ConditionDraft } from "./GameState";
import { resetSessionForLoad } from "./simRuntime";

/** Resolve a condition's picked ShapeParts by id (for subject-0 / obj-5/6). */
export function applyConditionShapes(core: CoreInternals, 
	cond: WinCondition | LossCondition,
	shape1Id: number | null | undefined,
	shape2Id: number | null | undefined,
): void {
	if (shape1Id != null) {
		const p = core.findPart(shape1Id);
		if (p instanceof ShapePart) cond.shape1 = p;
	}
	if (shape2Id != null) {
		const p = core.findPart(shape2Id);
		if (p instanceof ShapePart) cond.shape2 = p;
	}
}

/**
 * Construct a WinCondition and push it onto the live challenge. Shared by the
 * addWinCondition command and the interactive-pick finalize path so the
 * condition-construction lives in ONE place (ConditionsWindow pushed a fresh
 * WinCondition in both FinishDrawingCondition :272-290 and
 * FinishSelectingForCondition :323-327). Fires the tutorial milestone.
 */
export function pushWinCondition(core: CoreInternals, 
	name: string,
	subject: number,
	object: number,
	region: { minX: number; maxX: number; minY: number; maxY: number } | null,
	shape1Id: number | null | undefined,
	shape2Id: number | null | undefined,
): void {
	if (!core.challenge) return;
	const cond = new WinCondition(name, subject, object);
	if (region) {
		cond.minX = region.minX;
		cond.maxX = region.maxX;
		cond.minY = region.minY;
		cond.maxY = region.maxY;
	}
	applyConditionShapes(core, cond, shape1Id, shape2Id);
	core.challenge.challenge.winConditions.push(cond);
	// ChallengeEditor milestones (ControllerChallengeEditor.Update :364-372). The
	// legacy fires 95 "clickedConditions" when the Conditions dialog opens and 96
	// "addingCondition" while a shape is being picked; those UI-dialog steps have
	// no dedicated command, so we walk the machine's cursor through them here (each
	// notifyTutorial advances at most one step) up to 97 "addedWinCondition".
	if (core.tutorialMachine) {
		core.notifyTutorial({ type: "progress", key: "clickedConditions" });
		core.notifyTutorial({ type: "progress", key: "addingCondition" });
		core.notifyTutorial({ type: "progress", key: "addedWinCondition" });
	}
}

/** Construct + push a LossCondition; shared by the command and pick paths. */
export function pushLossCondition(core: CoreInternals, 
	name: string,
	subject: number,
	object: number,
	immediate: boolean,
	region: { minX: number; maxX: number; minY: number; maxY: number } | null,
	shape1Id: number | null | undefined,
	shape2Id: number | null | undefined,
): void {
	if (!core.challenge) return;
	const cond = new LossCondition(name, subject, object, immediate);
	if (region) {
		cond.minX = region.minX;
		cond.maxX = region.maxX;
		cond.minY = region.minY;
		cond.maxY = region.maxY;
	}
	applyConditionShapes(core, cond, shape1Id, shape2Id);
	core.challenge.challenge.lossConditions.push(cond);
	// Tutorial milestones (ControllerChallengeEditor): first loss condition
	// -> 100 "addedLoss1"; second -> 102 "addedLoss2".
	if (core.tutorialMachine) {
		const n = core.challenge.challenge.lossConditions.length;
		// The "drawing loss line" (99) / "selecting shape 2" (101) UI steps have no
		// dedicated command; walk the cursor through them before the count milestone.
		if (n === 1) {
			core.notifyTutorial({ type: "progress", key: "addingLoss1" });
			core.notifyTutorial({ type: "progress", key: "addedLoss1" });
		} else if (n === 2) {
			core.notifyTutorial({ type: "progress", key: "addingLoss2" });
			core.notifyTutorial({ type: "progress", key: "addedLoss2" });
		}
	}
}

// --- Interactive condition stage-picking -------------------------------
//
// Faithful port of ConditionsWindow.addWin/LossButtonPressed (:226-268) +
// GetBox/HLine/VLine/ShapeForConditions (ControllerGame :1088-1114) +
// FinishDrawingCondition / FinishSelectingForCondition (:270-336).

/** Compute what pick a draft's OBJECT needs (after any shape1 pick is done). */
export function awaitForObject(core: CoreInternals, object: number): "box" | "hline" | "vline" | "shape2" {
	// ConditionsWindow: obj 0 -> box; obj <3 (1,2) -> horizontal line; obj <5
	// (3,4) -> vertical line; else (5,6) -> a second shape (:234-243).
	if (object === 0) return "box";
	if (object < 3) return "hline";
	if (object < 5) return "vline";
	return "shape2";
}

/** Push the currently-drafted condition (region already applied) + clear the draft. */
export function finalizeConditionDraft(core: CoreInternals, 
	region: { minX: number; maxX: number; minY: number; maxY: number } | null,
): void {
	const draft = core.state.conditionDraft;
	if (!draft || !core.challenge) return;
	if (draft.kind === "win") {
		pushWinCondition(core, draft.name, draft.subject, draft.object, region, draft.shape1Id, draft.shape2Id);
	} else {
		pushLossCondition(core, 
			draft.name,
			draft.subject,
			draft.object,
			draft.immediate,
			region,
			draft.shape1Id,
			draft.shape2Id,
		);
	}
	setConditionDraft(core, null);
	core.syncChallenge();
}

/** Set (or clear) the picking draft on state + notify. */
export function setConditionDraft(core: CoreInternals, draft: ConditionDraft | null): void {
	core.state = { ...core.state, conditionDraft: draft };
	core.markChanged();
}

/**
 * Apply a challenge-mode command (sessions, conditions, restrictions, build
 * areas, play/edit switching). Returns true when the command belonged to this
 * family, false otherwise so the caller's switch can keep dispatching.
 */
export function applyChallengeCommand(core: CoreInternals, command: Command): boolean {
	switch (command.type) {
		// --- Challenge mode -------------------------------------------------
		case "newChallenge": {
			// Start a fresh authoring challenge (empty conditions/restrictions,
			// default Challenge flags). Editing (not playOnly), so the author can
			// build terrain + define conditions before switching to play.
			core.challenge = createChallengeSession();
			core.syncChallenge();
			return true;
		}
		case "loadBuiltInChallenge": {
			// Faithful port of ControllerClimb / ControllerMonkeyBars ctors: bake
			// the terrain + conditions + restrictions, mark playOnly + playMode,
			// and seed the terrain into the parts graph. Reset the session first
			// (fresh-controller semantics) so the previous mode's robot/terrain,
			// challenge, tutorial, and history don't survive the switch — the old
			// code retained editable robot parts, which is exactly the "stale
			// content on switch" bug when moving between challenges.
			resetSessionForLoad(core);
			core.challenge = createChallengeSession();
			const terrain = buildBuiltInChallenge(command.name, core.challenge);
			for (const p of terrain) p.id = ++core.nextId;
			core.state = { ...core.state, parts: terrain };
			core.markChanged();
			core.syncChallenge();
			return true;
		}
		case "exitChallenge": {
			core.challenge = null;
			core.cannonballs = [];
			core.syncChallenge();
			return true;
		}
		case "addWinCondition": {
			if (!core.challenge) return true;
			pushWinCondition(core, 
				command.name ?? "Condition",
				command.subject,
				command.object,
				command.region ?? null,
				command.shape1Id,
				command.shape2Id,
			);
			core.syncChallenge();
			return true;
		}
		case "addLossCondition": {
			if (!core.challenge) return true;
			pushLossCondition(core, 
				command.name ?? "Condition",
				command.subject,
				command.object,
				command.immediate,
				command.region ?? null,
				command.shape1Id,
				command.shape2Id,
			);
			core.syncChallenge();
			return true;
		}
		case "removeWinCondition": {
			if (!core.challenge) return true;
			core.challenge.challenge.winConditions.splice(command.index, 1);
			core.syncChallenge();
			return true;
		}
		case "removeLossCondition": {
			if (!core.challenge) return true;
			core.challenge.challenge.lossConditions.splice(command.index, 1);
			core.syncChallenge();
			return true;
		}
		case "setWinConditionsAnded": {
			if (!core.challenge) return true;
			core.challenge.challenge.winConditionsAnded = command.value;
			core.syncChallenge();
			return true;
		}
		case "startConditionPick": {
			// ConditionsWindow.addWin/LossButtonPressed (:226-268): subject-0
			// picks shape1 FIRST (selectingForShape1), then the object pick;
			// otherwise go straight to the object's box/line/shape2 pick.
			if (!core.challenge) return true;
			const awaiting = command.subject === 0 ? "shape1" : awaitForObject(core, command.object);
			setConditionDraft(core, {
				kind: command.kind,
				name: command.name,
				subject: command.subject,
				object: command.object,
				immediate: command.immediate,
				shape1Id: null,
				shape2Id: null,
				awaiting,
				firstClick: null,
			});
			return true;
		}
		case "conditionPickBox": {
			// FinishDrawingCondition index math (ConditionsWindow :270-314):
			//   obj 0 (box):   min/max of the two corners.
			//   obj <3 (hline): (x1,y1)-(x2,y1)  — horizontal span at y1.
			//   else  (vline): (x1,y1)-(x1,y2)  — vertical span at x1.
			const draft = core.state.conditionDraft;
			if (!draft || draft.awaiting === "shape1" || draft.awaiting === "shape2" || draft.awaiting === null) return true;
			const { x1, y1, x2, y2 } = command;
			let region: { minX: number; maxX: number; minY: number; maxY: number };
			if (draft.object === 0) {
				region = { minX: Math.min(x1, x2), minY: Math.min(y1, y2), maxX: Math.max(x1, x2), maxY: Math.max(y1, y2) };
			} else if (draft.object < 3) {
				region = { minX: x1, minY: y1, maxX: x2, maxY: y1 };
			} else {
				region = { minX: x1, minY: y1, maxX: x1, maxY: y2 };
			}
			finalizeConditionDraft(core, region);
			return true;
		}
		case "conditionPickShape": {
			// FinishSelectingForCondition (:316-334). shape1 pick (subject-0):
			// store shape1, then continue the add flow — either the object needs
			// a region/shape2 (advance awaiting) or it's obj<5 (finalize now with
			// no region, matching addWinButtonPressed(false) falling through the
			// object branches with obj not in 0..4 handled — but subject-0 always
			// has an object, so we route through awaitForObject). shape2 pick
			// (obj-5/6): store shape2 + finalize.
			const draft = core.state.conditionDraft;
			if (!draft || (draft.awaiting !== "shape1" && draft.awaiting !== "shape2")) return true;
			const part = core.findPart(command.shapeId);
			if (!(part instanceof ShapePart)) return true;
			if (draft.awaiting === "shape1") {
				const next = awaitForObject(core, draft.object);
				setConditionDraft(core, { ...draft, shape1Id: command.shapeId, awaiting: next, firstClick: null });
			} else {
				// shape2: FinishSelectingForCondition else-branch — set shape2 (+
				// existing shape1) and push (:322-333). No region.
				setConditionDraft(core, { ...draft, shape2Id: command.shapeId });
				finalizeConditionDraft(core, null);
			}
			return true;
		}
		case "cancelConditionPick": {
			setConditionDraft(core, null);
			return true;
		}
		case "setAllowedParts": {
			if (!core.challenge) return true;
			const ch = core.challenge.challenge;
			// Panel already un-inverts the editor's "exclude" checkboxes
			// (RestrictionsWindow stores !box.selected :348-355).
			ch.circlesAllowed = command.circles;
			ch.rectanglesAllowed = command.rects;
			ch.trianglesAllowed = command.tris;
			ch.fixedJointsAllowed = command.fixed;
			ch.rotatingJointsAllowed = command.revolute;
			ch.slidingJointsAllowed = command.prismatic;
			ch.thrustersAllowed = command.thrusters;
			ch.cannonsAllowed = command.cannons;
			// Jaybit "Exclude Triggers" (RestrictionsWindow.as:736). Optional so
			// pre-Jaybit dispatch sites leave the flag untouched.
			if (command.triggers !== undefined) ch.triggersAllowed = command.triggers;
			core.syncChallenge();
			// ChallengeEditor milestones (ControllerChallengeEditor.Update :385-390):
			// opening the Restrictions dialog -> 103 "clickedRestrictions" (no dedicated
			// command, walk the cursor); excluding Fixed+Sliding joints AND Thrusters ->
			// 105 "excludedStuff" (fixed && sliding && thrusters now disallowed).
			if (core.tutorialMachine) {
				core.notifyTutorial({ type: "progress", key: "clickedRestrictions" });
				if (!command.fixed && !command.prismatic && !command.thrusters) {
					core.notifyTutorial({ type: "progress", key: "excludedStuff" });
				}
			}
			return true;
		}
		case "setBuildPermissions": {
			if (!core.challenge) return true;
			const ch = core.challenge.challenge;
			ch.mouseDragAllowed = command.mouseDrag;
			ch.botControlAllowed = command.botControl;
			ch.fixateAllowed = command.fixate;
			ch.nonCollidingAllowed = command.nonColliding;
			ch.showConditions = command.showConditions;
			core.syncChallenge();
			// ChallengeEditor milestone (ControllerChallengeEditor.Update :391-393):
			// "Allow user Control of Bot" unchecked -> 106 "disallowedControl". Walk the
			// cursor through clickedRestrictions first in case setAllowedParts wasn't the
			// dispatch that opened the dialog (cursor-gated, so it's a no-op if already
			// past it).
			if (core.tutorialMachine) {
				core.notifyTutorial({ type: "progress", key: "clickedRestrictions" });
				if (!command.botControl) core.notifyTutorial({ type: "progress", key: "disallowedControl" });
			}
			return true;
		}
		case "setPartLimits": {
			if (!core.challenge) return true;
			const ch = core.challenge.challenge;
			// null == the ∓Number.MAX_VALUE "no limit" sentinel (Challenge.ts:22-28).
			ch.minDensity = command.minDensity === null ? NO_LIMIT_MIN : command.minDensity;
			ch.maxDensity = command.maxDensity === null ? NO_LIMIT_MAX : command.maxDensity;
			// Jaybit friction/restitution limits (optional in the command payload;
			// omitted == no limit).
			ch.minFriction = command.minFriction == null ? NO_LIMIT_MIN : command.minFriction;
			ch.maxFriction = command.maxFriction == null ? NO_LIMIT_MAX : command.maxFriction;
			ch.minRestitution = command.minRestitution == null ? NO_LIMIT_MIN : command.minRestitution;
			ch.maxRestitution = command.maxRestitution == null ? NO_LIMIT_MAX : command.maxRestitution;
			ch.maxRJStrength = command.maxRJStrength === null ? NO_LIMIT_MAX : command.maxRJStrength;
			ch.maxRJSpeed = command.maxRJSpeed === null ? NO_LIMIT_MAX : command.maxRJSpeed;
			ch.maxSJStrength = command.maxSJStrength === null ? NO_LIMIT_MAX : command.maxSJStrength;
			ch.maxSJSpeed = command.maxSJSpeed === null ? NO_LIMIT_MAX : command.maxSJSpeed;
			ch.maxThrusterStrength =
				command.maxThrusterStrength === null ? NO_LIMIT_MAX : command.maxThrusterStrength;
			core.syncChallenge();
			return true;
		}
		case "addBuildArea": {
			if (!core.challenge) return true;
			const area = new b2AABB();
			area.lowerBound.Set(command.minX, command.minY);
			area.upperBound.Set(command.maxX, command.maxY);
			core.challenge.challenge.buildAreas.push(area);
			core.syncChallenge();
			// ChallengeEditor milestones (ControllerChallengeEditor.Update :358-363):
			// clicking the build-box tool -> 93 "clickedBuildBox"; drawing the box ->
			// 94 "builtBuildBox". The tool-click has no dedicated command, so walk the
			// cursor through it before the built-box milestone (cursor-gated).
			if (core.tutorialMachine) {
				core.notifyTutorial({ type: "progress", key: "clickedBuildBox" });
				if (core.challenge.challenge.buildAreas.length === 1) {
					core.notifyTutorial({ type: "progress", key: "builtBuildBox" });
				}
			}
			return true;
		}
		case "removeBuildArea": {
			if (!core.challenge) return true;
			core.challenge.challenge.buildAreas.splice(command.index, 1);
			core.syncChallenge();
			return true;
		}
		case "enterChallengePlay": {
			// ControllerChallenge.playButton first press (:39-50): snapshot the
			// editable robot into challenge.allParts, enter play mode, mark those
			// parts uneditable, then CheckIfPartsFit + clear selection.
			if (!core.challenge || core.challenge.playMode) return true;
			const robot = core.state.parts.filter((p) => p.isEditable);
			core.challenge.savedRobot = robot;
			core.challenge.challenge.allParts = robot;
			core.challenge.playMode = true;
			for (const p of robot) p.isEditable = false;
			// NOTE: edit.editable is the robot-EXPOSURE lock (setRobotEditable),
			// deliberately NOT touched here — the challenge play-mode lock is
			// expressed via state.challenge.playMode + the parts' isEditable
			// flags, so the two locks can't desync.
			core.state = {
				...core.state,
				parts: [...core.state.parts],
				edit: { ...core.state.edit, selection: [], selectedPart: null },
			};
			core.markChanged();
			core.syncChallenge();
			return true;
		}
		case "editChallenge": {
			// ControllerChallenge.editButton (:64-76): guarded by playOnly; restore
			// the saved robot parts as editable again and leave play mode.
			if (!core.challenge) return true;
			if (core.challenge.playOnly) return true; // "This challenge is uneditable!"
			core.challenge.playMode = false;
			for (const p of core.challenge.savedRobot) p.isEditable = true;
			// edit.editable (the exposure lock) deliberately untouched — see
			// enterChallengePlay.
			core.state = {
				...core.state,
				parts: [...core.state.parts],
			};
			core.markChanged();
			core.syncChallenge();
			return true;
		}
		default:
			return false;
	}
}
