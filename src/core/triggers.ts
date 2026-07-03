// Jaybit trigger runtime — the collision-driven automation feature.
//
// Faithful, node-clean port of the Jaybit 2.33.0.1 trigger dispatcher
// (scratchpad spec "PORT SPEC — Jaybit Trigger System"):
//   - wireTriggers        <- ControllerGame.playButton wiring pass (:8760-8845)
//   - determineTriggering <- ControllerGame.DetermineTriggering (:9710-9800)
//   - didPrevJointDoSimilar <- ControllerGame.DidPrevJointDoSimilar (:3585-3607)
//   - processTriggers     <- ControllerGame.ProcessTriggers (:3130-3255)
//   - triggerDirectionSwitch <- ControllerGame.TriggerDirectionSwitch (:6733-6744)
//
// Ordinary shapes are trigger SOURCES (one or two named slots on their shape
// userData); joints / thrusters / cannons / text parts are trigger TARGETS
// (their comma-separated `triggerList` names the sources they listen to). When
// a source shape begins/ends a Box2D contact with a qualifying other shape,
// each wired target performs the source slot's action. All evaluation happens
// synchronously inside world.Step via the b2ContactListener Add/Remove
// callbacks — there is no per-frame trigger scan.

import type { b2World } from "../Box2D";
import { Cannon } from "../Parts/Cannon";
import { JointPart } from "../Parts/JointPart";
import type { Part } from "../Parts/Part";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import { TRIGGER_CONTRACT, TRIGGER_EXPAND, TRIGGER_FIRE, TRIGGER_ROTATECCW, TRIGGER_ROTATECW } from "../Parts/partDefaults";

/**
 * The trigger view of a shape's b2Shape userData, populated by each concrete
 * shape's Init (Circle/Rectangle/Triangle) and filled in by wireTriggers.
 * Loosely typed — the userData object is a legacy dynamic bag shared with the
 * renderer / contact filter fields.
 */
export interface TriggerUserData {
	isSandbox?: boolean;
	triggerName?: string;
	triggerName_2?: string;
	/** whitespace-stripped CSV tokens of triggerName (split(",") of a "" gives [""]). */
	triggerList?: string[];
	triggerList_2?: string[];
	triggerAction?: number;
	triggerAction_2?: number;
	onGroundHit?: boolean;
	onGroundHit_2?: boolean;
	onSameName?: boolean;
	onSameName_2?: boolean;
	/** Flattened per-shape dispatch table (parallel arrays), filled by wireTriggers. */
	jointsToTrigger?: number[];
	actionsToTrigger?: number[];
	isFirstTrigger?: boolean[];
}

/**
 * Callback ProcessTriggers uses for the cannon/text FIRE replay side effects —
 * the port of `ControllerGame.keyInput(key, up, fromTrigger=true, partIndex)`
 * (:2225-2251). The live-sim part effect already happened inside the part's
 * DetermineTriggered; this callback exists ONLY to record TriggerPress events
 * (GameCore supplies the recorder).
 */
export type TriggerKeyInput = (key: number, up: boolean, partIndex: number) => void;

/**
 * Play-start wiring pass (ControllerGame.playButton :8760-8845). Builds each
 * source shape's flattened dispatch table `(targetPartIndex, action, slot)[]`
 * on its shape userData from CSV token matching. Call AFTER every part has
 * been Init'd (the userData bags must exist). `parts` is the legacy allParts
 * ordering — GameCore.state.parts — and the pushed indices index into it.
 */
export function wireTriggers(parts: Part[]): void {
	// 1. Collect trigger sources: every non-Cannon ShapePart with a non-empty
	//    slot name (:8766-8772). FAITHFUL QUIRK: the legacy condition is
	//    `Boolean(triggerName) && (strip(triggerName) != "" || strip(triggerName_2) != "")`
	//    — a shape whose slot-1 name is EMPTY is never a source, even when its
	//    slot-2 name is set. Note the "is non-empty" strip is /[, ]/g (a name of
	//    "," registers as empty) while the userData token lists strip / /g only.
	const sources: ShapePart[] = [];
	for (let i = parts.length - 1; i >= 0; i--) {
		const p = parts[i];
		if (p instanceof ShapePart && !(p instanceof Cannon)) {
			if (
				p.triggerName &&
				(p.triggerName.replace(/[, ]/g, "") !== "" || p.triggerName_2.replace(/[, ]/g, "") !== "")
			) {
				sources.push(p);
			}
		}
	}
	if (sources.length === 0) return;

	// 2+3. For every target part with a non-empty triggerList, split it and
	//       match each token against each source shape's parsed lists
	//       (:8788-8836). One (source, target) pair can appear once PER
	//       MATCHING TOKEN per slot — faithful to the legacy push-per-token.
	for (let i = 0; i < parts.length; i++) {
		const t = parts[i];
		let tokens: string[];
		if (t instanceof Cannon && t.triggerList !== "") {
			tokens = t.triggerList.replace(/ /g, "").split(",");
		} else if (t instanceof JointPart && t.triggerList !== "") {
			tokens = t.triggerList.replace(/ /g, "").split(",");
		} else if (t instanceof Thrusters && t.triggerList !== "") {
			tokens = t.triggerList.replace(/ /g, "").split(",");
		} else if (t instanceof TextPart && t.triggerList !== "") {
			tokens = t.triggerList.replace(/ /g, "").split(",");
		} else {
			continue;
		}
		for (const src of sources) {
			const shape = src.GetShape();
			if (!shape) continue;
			const ud = shape.GetUserData() as TriggerUserData;
			for (const token of tokens) {
				if (token === "") continue;
				if ((ud.triggerList && ud.triggerList.indexOf(token) > -1) || token === src.triggerName) {
					ud.jointsToTrigger!.push(i);
					ud.actionsToTrigger!.push(src.triggerAction);
					ud.isFirstTrigger!.push(true);
				}
				if ((ud.triggerList_2 && ud.triggerList_2.indexOf(token) > -1) || token === src.triggerName_2) {
					ud.jointsToTrigger!.push(i);
					ud.actionsToTrigger!.push(src.triggerAction_2);
					ud.isFirstTrigger!.push(false);
				}
			}
		}
	}
}

/**
 * Gate: does one dispatch entry of `sourceUD` fire for a contact with
 * `otherUD`? (ControllerGame.DetermineTriggering :9710-9800.) Per slot:
 *  - onGroundHit fires on sandbox terrain (`otherUD.isSandbox`) only;
 *  - onSameName fires ONLY on a trigger-name overlap with the other shape
 *    (token containment either direction's list, falling back to exact
 *    triggerName equality);
 *  - a plain slot fires on any non-terrain contact;
 *  - with no other userData: fires unless the slot's onSameName is set.
 */
export function determineTriggering(
	sourceUD: TriggerUserData,
	isFirstSlot: boolean,
	otherUD: TriggerUserData | null | undefined,
): boolean {
	if (otherUD) {
		if (isFirstSlot) {
			if (sourceUD.onGroundHit && otherUD.isSandbox) return true;
			if (sourceUD.onSameName) {
				if (
					sourceUD.triggerList &&
					sourceUD.triggerList.length > 0 &&
					((otherUD.triggerList && otherUD.triggerList.length > 0) ||
						(otherUD.triggerList_2 && otherUD.triggerList_2.length > 0))
				) {
					for (const token of sourceUD.triggerList) {
						if (otherUD.triggerList && otherUD.triggerList.indexOf(token) > -1) return true;
						if (otherUD.triggerList_2 && otherUD.triggerList_2.indexOf(token) > -1) return true;
					}
				}
				if (sourceUD.triggerName && sourceUD.triggerName !== "" && (otherUD.triggerName || otherUD.triggerName_2)) {
					return sourceUD.triggerName === otherUD.triggerName || sourceUD.triggerName === otherUD.triggerName_2;
				}
				return false;
			}
			if (!sourceUD.onGroundHit && otherUD.isSandbox) return false;
		} else {
			if (sourceUD.onGroundHit_2 && otherUD.isSandbox) return true;
			if (sourceUD.onSameName_2) {
				if (
					sourceUD.triggerList_2 &&
					sourceUD.triggerList_2.length > 0 &&
					((otherUD.triggerList && otherUD.triggerList.length > 0) ||
						(otherUD.triggerList_2 && otherUD.triggerList_2.length > 0))
				) {
					for (const token of sourceUD.triggerList_2) {
						if (otherUD.triggerList && otherUD.triggerList.indexOf(token) > -1) return true;
						if (otherUD.triggerList_2 && otherUD.triggerList_2.indexOf(token) > -1) return true;
					}
				}
				if (
					sourceUD.triggerName_2 &&
					sourceUD.triggerName_2 !== "" &&
					(otherUD.triggerName || otherUD.triggerName_2)
				) {
					return sourceUD.triggerName_2 === otherUD.triggerName || sourceUD.triggerName_2 === otherUD.triggerName_2;
				}
				return false;
			}
			if (!sourceUD.onGroundHit_2 && otherUD.isSandbox) return false;
		}
	} else if (isFirstSlot) {
		if (sourceUD.onSameName) return false;
	} else if (sourceUD.onSameName_2) {
		return false;
	}
	return true;
}

/**
 * "Don't cancel yourself": true iff the previously-fired entry targets the
 * SAME part and its action is the exact opposite pair (CW<->CCW,
 * EXPAND<->CONTRACT), so only the first (slot-1) entry wins for this contact
 * (ControllerGame.DidPrevJointDoSimilar :3585-3607). prevIdx==-1 (nothing
 * fired yet) compares joints[-1]===undefined and returns false.
 */
export function didPrevJointDoSimilar(
	prevIdx: number,
	k: number,
	jointsToTrigger: number[],
	actionsToTrigger: number[],
): boolean {
	if (jointsToTrigger[prevIdx] === jointsToTrigger[k]) {
		if (actionsToTrigger[prevIdx] === TRIGGER_ROTATECW) return actionsToTrigger[k] === TRIGGER_ROTATECCW;
		if (actionsToTrigger[prevIdx] === TRIGGER_ROTATECCW) return actionsToTrigger[k] === TRIGGER_ROTATECW;
		if (actionsToTrigger[prevIdx] === TRIGGER_EXPAND) return actionsToTrigger[k] === TRIGGER_CONTRACT;
		if (actionsToTrigger[prevIdx] === TRIGGER_CONTRACT) return actionsToTrigger[k] === TRIGGER_EXPAND;
	}
	return false;
}

/**
 * Contact-event dispatcher (ControllerGame.ProcessTriggers :3130-3255): runs
 * both orderings (ud1-as-source-vs-ud2, then ud2-vs-ud1); for each dispatch
 * entry that passes the DetermineTriggering gate and the don't-cancel-yourself
 * guard, applies the action to the target part.
 *
 *  - Add path: a successful DESTROY (DoTriggerAction true) SPLICES the entry
 *    out of the source's three arrays — a destroy fires once and unregisters
 *    (with the legacy k-- decrement compensation).
 *  - Cannon/TextPart FIRE crossings call `keyInput` (the TriggerPress
 *    recorder) exactly like legacy keyInput(key, up, fromTrigger, partIndex).
 *  - DELIBERATE DIVERGENCE (spec §2.5/§5.2): the legacy Remove path set
 *    prevIdx to the PART index (`jointsToTrigger[k]`) while comparing it as a
 *    LIST index — a decompiler-visible bug that made the guard mostly no-op on
 *    Remove. We port the Add-path semantics (prevIdx = k) for BOTH paths.
 *
 * Runs synchronously inside world.Step via the b2ContactListener callbacks.
 */
export function processTriggers(
	parts: Part[],
	world: b2World,
	ud1: TriggerUserData | null | undefined,
	ud2: TriggerUserData | null | undefined,
	isAdd: boolean,
	keyInput: TriggerKeyInput,
): void {
	let source = ud1;
	let other = ud2;
	for (let pass = 0; pass < 2; pass++) {
		if (pass === 1) {
			source = ud2;
			other = ud1;
		}
		if (!source || !source.jointsToTrigger || source.jointsToTrigger.length === 0) continue;
		const joints = source.jointsToTrigger;
		const actions = source.actionsToTrigger!;
		const firsts = source.isFirstTrigger!;
		let prevIdx = -1;
		for (let k = 0; k < joints.length; k++) {
			if (!determineTriggering(source, firsts[k], other) || didPrevJointDoSimilar(prevIdx, k, joints, actions)) {
				continue;
			}
			prevIdx = k;
			const target = parts[joints[k]];
			if (isAdd) {
				let destroyed = false;
				if (target instanceof JointPart) {
					destroyed = target.DoTriggerAction(actions[k], world, true);
				} else if (target instanceof Thrusters) {
					destroyed = target.DoTriggerAction(actions[k], world, true);
				} else if (target instanceof Cannon) {
					destroyed = target.DoTriggerAction(actions[k], world, true);
					if (!destroyed && actions[k] === TRIGGER_FIRE && target.triggerTouches > 0 && !target.isDestroyed) {
						keyInput(target.fireKey, false, joints[k]);
					}
				} else if (target instanceof TextPart) {
					destroyed = target.DoTriggerAction(actions[k], world, true);
					if (!destroyed && actions[k] === TRIGGER_FIRE && target.triggerTouches > 0) {
						keyInput(target.displayKey, false, joints[k]);
					}
				}
				if (destroyed) {
					joints.splice(k, 1);
					actions.splice(k, 1);
					firsts.splice(k, 1);
					k--;
				}
			} else {
				if (target instanceof JointPart) {
					target.DoTriggerAction(actions[k], world, false);
				} else if (target instanceof Thrusters) {
					target.DoTriggerAction(actions[k], world, false);
				} else if (target instanceof Cannon) {
					target.DoTriggerAction(actions[k], world, false);
					if (actions[k] === TRIGGER_FIRE && target.triggerTouches <= 0 && !target.isDestroyed) {
						keyInput(target.fireKey, true, joints[k]);
					}
				} else if (target instanceof TextPart) {
					target.DoTriggerAction(actions[k], world, false);
					if (actions[k] === TRIGGER_FIRE && target.triggerTouches <= 0) {
						keyInput(target.displayKey, true, joints[k]);
					}
				}
			}
		}
	}
}

/**
 * Horizontal-mirror action flip (ControllerGame.TriggerDirectionSwitch
 * :6733-6744): CW <-> CCW; every other action (incl. EXPAND/CONTRACT) is
 * unchanged. Applied to shape triggerAction/_2 by mirrorHorizontal only
 * (:3798-3865); mirrorVertical copies actions unchanged (:1443-1508).
 */
export function triggerDirectionSwitch(action: number): number {
	if (action === TRIGGER_ROTATECW) return TRIGGER_ROTATECCW;
	if (action === TRIGGER_ROTATECCW) return TRIGGER_ROTATECW;
	return action;
}
