// Undo / redo history + parts-graph removal maintenance.
//
// Extracted from GameCore's "Undo / redo history" section. Snapshot-based
// history: before any mutating command GameCore.pushHistory deep-clones the
// editable state (parts graph + selection/tool) onto the undo stack and clears
// the redo stack; undo/redo swap the current state with the top of the
// respective stack. This is simpler and more robust than per-command inverse
// Actions (the legacy src/Actions/* approach), which depend on a static
// ControllerGame the headless core doesn't have. Also home to the shared
// parts-removal maintenance (delete cascade + challenge condition-ref cleanup)
// every removal path uses.

import { JointPart } from "../Parts/JointPart";
import type { Part } from "../Parts/Part";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import type { WinCondition } from "../Game/WinCondition";
import type { LossCondition } from "../Game/LossCondition";
import type { CoreInternals, HistorySnapshot } from "./coreInternals";
import { deriveSelectedPart } from "./partOps";

/** Max number of undo steps retained (older snapshots are dropped). */
export const HISTORY_CAP = 100;

/**
 * Deep-clone a parts array into independent instances, preserving each
 * Part's `id` (MakeCopy() mints fresh objects and does NOT copy id, so we
 * reassign it) and re-linking joints/thrusters to the CLONED parent shapes.
 * Parent shapes are resolved by id, so shape order is irrelevant.
 */
export function cloneParts(core: CoreInternals, parts: Part[]): Part[] {
	// Clone shapes/text first and index the clones by original id so joints
	// and thrusters can re-attach to the cloned shapes (they hold parent
	// references by object identity, not id).
	const cloneById = new Map<number, Part>();
	const shapeCloneById = new Map<number, ShapePart>();
	const result: Part[] = [];

	for (const p of parts) {
		if (p instanceof ShapePart) {
			const copy = p.MakeCopy();
			copy.id = p.id;
			cloneById.set(p.id, copy);
			shapeCloneById.set(p.id, copy);
			result.push(copy);
		} else if (p instanceof TextPart) {
			const copy = p.MakeCopy();
			copy.id = p.id;
			cloneById.set(p.id, copy);
			result.push(copy);
		}
	}

	// Now clone joints and thrusters, wiring them to the cloned shapes.
	for (const p of parts) {
		if (p instanceof JointPart) {
			const c1 = shapeCloneById.get(p.part1.id);
			const c2 = shapeCloneById.get(p.part2.id);
			if (!c1 || !c2) continue; // dangling joint — drop it defensively
			const copy = p.MakeCopy(c1, c2);
			copy.id = p.id;
			cloneById.set(p.id, copy);
			result.push(copy);
		} else if (p instanceof Thrusters) {
			const parent = shapeCloneById.get(p.shape.id);
			if (!parent) continue;
			const copy = p.MakeCopy(parent);
			copy.id = p.id;
			cloneById.set(p.id, copy);
			result.push(copy);
		}
	}

	// Preserve the original ordering (renderer / hit-testing depend on it).
	return parts.map((p) => cloneById.get(p.id)).filter((p): p is Part => p !== undefined);
}

/** Capture the current editable state as a history snapshot. */
export function captureSnapshot(core: CoreInternals): HistorySnapshot {
	return {
		parts: cloneParts(core, core.state.parts),
		selection: [...core.state.edit.selection],
		tool: core.state.edit.tool,
		editable: core.curRobotEditable,
	};
}

/**
 * Restore a history snapshot's parts/selection into a fresh state object,
 * dropping any selection ids that no longer exist and recomputing
 * selectedPart + canUndo/canRedo. Immutable per the existing handlers.
 */
export function restoreSnapshot(core: CoreInternals, snap: HistorySnapshot): void {
	const live = new Set(snap.parts.map((p) => p.id));
	const selection = snap.selection.filter((id) => live.has(id));
	// Restore the robot-exposure lock so undoing an uneditable import unlocks
	// the editor again (and redo re-locks it). Keep curRobotEditable +
	// edit.editable in lockstep via the single setter.
	core.setRobotEditable(snap.editable);
	core.state = {
		...core.state,
		parts: snap.parts,
		edit: {
			...core.state.edit,
			tool: snap.tool,
			selection,
			selectedPart: null,
			canUndo: core.undoStack.length > 0,
			canRedo: core.redoStack.length > 0,
		},
	};
	// deriveSelectedPart reads core.state.parts, so compute after the swap.
	core.state = {
		...core.state,
		edit: { ...core.state.edit, selectedPart: deriveSelectedPart(core, selection) },
	};
	// The snapshot's parts are cloneParts() clones — re-point any live
	// challenge condition shape refs at the clones (by id) so they don't keep
	// tracking the orphaned pre-undo Part objects.
	remapConditionRefs(core);
	core.markChanged();
}

export function handleUndo(core: CoreInternals): void {
	const snap = core.undoStack.pop();
	if (!snap) return;
	core.redoStack.push(captureSnapshot(core));
	restoreSnapshot(core, snap);
}

export function handleRedo(core: CoreInternals): void {
	const snap = core.redoStack.pop();
	if (!snap) return;
	core.undoStack.push(captureSnapshot(core));
	restoreSnapshot(core, snap);
}

/**
 * Re-point the live challenge's win/loss condition shape refs (shape1/shape2)
 * at the Part objects CURRENTLY in state.parts, matched by part id. undo/redo
 * swap state.parts for cloneParts() clones, so a condition holding the
 * pre-swap Part would silently never satisfy (Condition.Update reads the
 * orphan's never-Init'd body). A ref whose id no longer exists is nulled the
 * same way clearRemovedConditionRefs does.
 */
export function remapConditionRefs(core: CoreInternals): void {
	if (!core.challenge) return;
	const ch = core.challenge.challenge;
	const remap = (conds: (WinCondition | LossCondition)[]): void => {
		for (const c of conds) {
			if (c.shape1) {
				const p = core.findPart(c.shape1.id);
				if (p instanceof ShapePart) c.shape1 = p;
				else {
					c.shape1 = null;
					c.shape1Index = -1;
				}
			}
			if (c.shape2) {
				const p = core.findPart(c.shape2.id);
				if (p instanceof ShapePart) c.shape2 = p;
				else {
					c.shape2 = null;
					c.shape2Index = -1;
				}
			}
		}
	};
	remap(ch.winConditions);
	remap(ch.lossConditions);
}

/**
 * Expand a deletion id set with the delete-cascade the legacy DeletePart
 * performed (ControllerGame.ts:6582-6612): deleting a ShapePart also deletes
 * every JointPart/Thrusters attached to it. Then detach each removed
 * joint/thruster from any SURVIVING shape's m_joints/m_thrusters — the legacy
 * left the back-references in place but gated every walk on isEnabled=false;
 * the port removes parts outright, so a stale ref would let a deleted
 * FixedJoint keep welding shapes on Play (ShapePart.Init -> CheckFixedJoints
 * walks m_joints). Returns the full removal set.
 */
export function cascadeRemovalSet(core: CoreInternals, partIds: Iterable<number>): Set<number> {
	const remove = new Set(partIds);
	for (const p of core.state.parts) {
		if (p instanceof JointPart && (remove.has(p.part1.id) || remove.has(p.part2.id))) remove.add(p.id);
		else if (p instanceof Thrusters && remove.has(p.shape.id)) remove.add(p.id);
	}
	for (const p of core.state.parts) {
		if (!remove.has(p.id)) continue;
		if (p instanceof JointPart) {
			if (!remove.has(p.part1.id)) p.part1.RemoveJoint(p);
			if (!remove.has(p.part2.id)) p.part2.RemoveJoint(p);
		} else if (p instanceof Thrusters) {
			if (!remove.has(p.shape.id)) p.shape.RemoveThrusters(p);
		}
	}
	return remove;
}

/**
 * Null out any win/loss condition shape refs (shape1/shape2) that point at a
 * now-removed part. deleteParts and subtractShapes drop parts from state.parts
 * but a Condition keeps its picked ShapePart ref alive; on the next play that
 * part is never Init'd (m_body stays null) and Condition.Update dereferences it
 * via GetBody().GetXForm() -> crash. Called whenever parts leave the edit model.
 */
export function clearRemovedConditionRefs(core: CoreInternals, removedIds: Set<number>): void {
	if (!core.challenge) return;
	const ch = core.challenge.challenge;
	const clear = (conds: (WinCondition | LossCondition)[]): void => {
		for (const c of conds) {
			if (c.shape1 && removedIds.has(c.shape1.id)) {
				c.shape1 = null;
				c.shape1Index = -1;
			}
			if (c.shape2 && removedIds.has(c.shape2.id)) {
				c.shape2 = null;
				c.shape2Index = -1;
			}
		}
	};
	clear(ch.winConditions);
	clear(ch.lossConditions);
}
