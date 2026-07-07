// Clipboard (copy / cut / paste) + z-order (move to front / back).
//
// Extracted from GameCore's "Clipboard" and "Z-order" sections. Faithful port
// of ControllerGame.copyButton (:4966), cutButton (:4892) and pasteButton
// (:5023): copyButton snapshots the selected shapes/text plus any joint/
// thruster whose endpoints are ALL in the selection (the same partMapping idea
// as mirror), cloning each via MakeCopy so the clipboard is independent of the
// live graph; cut = copy + delete; paste clones the clipboard again (so it
// survives repeated pastes), offsets the clones, assigns fresh ids, appends
// and selects them. Z-order is the frontButton (:4351) / backButton (:4375)
// port. Free functions over the CoreInternals seam.

import { JointPart } from "../Parts/JointPart";
import type { Part } from "../Parts/Part";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import { partTypeAllowed } from "./challenge";
import type { CoreInternals } from "./coreInternals";
import { cascadeRemovalSet, clearRemovedConditionRefs } from "./historyOps";
import { clipboardPartKind, partCarriesTriggers } from "./importExport";
import { deriveSelectedPart, snapshotOf } from "./partOps";

// Fixed world-unit offset applied to pasted clones when the caller supplies no
// explicit dx/dy. The legacy pasteButton (:5085) places the clones under the
// mouse cursor and begins a PASTE mouse-drag; the headless core has no cursor, so
// it nudges the copy by this delta (like the mirror port's place-and-select
// DEVIATION) so the paste is visibly offset from the original.
const PASTE_OFFSET = 1.0;

/**
 * Clone the given selection into an independent clipboard array: every selected
 * ShapePart/TextPart is MakeCopy'd, and every selected joint/thruster whose
 * endpoint shapes are BOTH in the selection is re-bound onto the clones (a
 * joint/thruster with an endpoint outside the selection is dropped). Mirrors
 * copyButton's partMapping pass (:4982-5018). The result holds fresh Part
 * instances with NO ids (paste mints them).
 */
export function cloneSelectionForClipboard(core: CoreInternals, partIds: number[]): Part[] {
	const selectedParts = partIds
		.map((id) => core.findPart(id))
		.filter((p): p is Part => p !== undefined);

	const result: Part[] = [];
	// Parallel to selectedParts: the ShapePart clone, or -1 for text/joints/thrusters.
	const partMapping: (ShapePart | -1)[] = [];

	// Pass 1 — shapes + text (:4984-4995).
	for (const sp of selectedParts) {
		if (sp instanceof ShapePart) {
			const copy = sp.MakeCopy();
			result.push(copy);
			partMapping.push(copy);
		} else if (sp instanceof TextPart) {
			result.push(sp.MakeCopy());
			partMapping.push(-1);
		} else {
			partMapping.push(-1);
		}
	}

	// Pass 2 — joints + thrusters whose endpoints are all in the selection
	// (:4996-5017). Rebind onto the Pass-1 clones via the index mapping.
	for (let i = 0; i < selectedParts.length; i++) {
		const sp = selectedParts[i];
		if (sp instanceof JointPart) {
			let index1 = -1;
			let index2 = -1;
			for (let j = 0; j < selectedParts.length; j++) {
				if (selectedParts[j] === sp.part1) index1 = j;
				if (selectedParts[j] === sp.part2) index2 = j;
			}
			if (index1 === -1 || index2 === -1) continue;
			const p1 = partMapping[index1];
			const p2 = partMapping[index2];
			if (p1 === -1 || p2 === -1) continue;
			result.push(sp.MakeCopy(p1, p2));
		} else if (sp instanceof Thrusters) {
			let index1 = -1;
			for (let j = 0; j < selectedParts.length; j++) {
				if (selectedParts[j] === sp.shape) index1 = j;
			}
			if (index1 === -1) continue;
			const parent = partMapping[index1];
			if (parent === -1) continue;
			result.push(sp.MakeCopy(parent));
		}
	}

	return result;
}

/**
 * copyParts — ControllerGame.copyButton (:4966). Snapshot the selection into the
 * clipboard (no state mutation, no undo). Editing-phase only.
 */
export function handleCopy(core: CoreInternals, partIds: number[]): void {
	core.clipboard = cloneSelectionForClipboard(core, partIds);
	// HomeMovies milestone (ControllerHomeMovies.copyButton :433-439): the ragdoll
	// was copied -> dialog 45 "copied". Cursor-gated. (exportRobot also emits this
	// for the encoded-robot copy path; the copy button is the faithful trigger.)
	if (core.tutorialMachine) core.notifyTutorial({ type: "progress", key: "copied" });
}

/**
 * cutParts — ControllerGame.cutButton (:4892). copy + delete the selection. The
 * delete reuses the deleteParts filtering (same graph edit). Undoable via the
 * apply() history snapshot (registered mutating).
 */
export function handleCut(core: CoreInternals, partIds: number[]): void {
	handleCopy(core, partIds);
	// Same delete-cascade + condition-ref cleanup as deleteParts (the cut's
	// delete half is the same parts-graph edit).
	const remove = cascadeRemovalSet(core, partIds);
	clearRemovedConditionRefs(core, remove);
	const parts = core.state.parts.filter((p) => !remove.has(p.id));
	const selection = core.state.edit.selection.filter((id) => !remove.has(id));
	core.state = {
		...core.state,
		parts,
		edit: { ...core.state.edit, selection, selectedPart: deriveSelectedPart(core, selection) },
	};
	core.markChanged();
}

/**
 * pasteParts — ControllerGame.pasteButton (:5023). Clone the clipboard AGAIN (so
 * repeated pastes stay independent), offset the clones, assign fresh ids, append
 * them and select them. Joints/thrusters are re-bound onto the freshly-cloned
 * shapes (same partMapping idea). Undoable (registered mutating).
 *
 * OFFSET: the legacy paste places the clones under the mouse cursor and begins a
 * PASTE mouse-drag (:5085-5252). The headless core has no cursor/drag, so — like
 * the mirror port's DEVIATION — it applies a small fixed world-unit delta
 * (PASTE_OFFSET) so the pasted copy is visibly offset from the original and
 * immediately selected, or honours an explicit dx/dy when the caller supplies one.
 */
export function handlePaste(core: CoreInternals, dx: number | undefined, dy: number | undefined): void {
	if (core.clipboard.length === 0) return;

	// Restriction gate (pasteButton :5047-5058): reject a paste whose parts are
	// disallowed by the active challenge. partTypeAllowed handles each type.
	if (core.challenge) {
		for (const p of core.clipboard) {
			const kind = clipboardPartKind(core, p);
			if (kind && !partTypeAllowed(core.challenge, kind)) return;
		}
	}

	// Trigger restriction gate (jaybit pasteButton :9183-9256): in challenge
	// play mode with !triggersAllowed, pasting parts carrying ANY trigger
	// config (a shape with a trigger name/action, or a joint/thruster/cannon
	// with a triggerList) is rejected with the legacy dialog.
	if (core.challenge && core.challenge.playMode && !core.challenge.challenge.triggersAllowed) {
		if (core.clipboard.some((p) => partCarriesTriggers(core, p))) {
			core.emitMessage("Sorry, triggers are not allowed in this challenge!");
			return;
		}
	}

	const offX = dx ?? PASTE_OFFSET;
	const offY = dy ?? PASTE_OFFSET;

	// Clone the clipboard into the live graph, re-binding joints/thrusters onto
	// the new shapes. Reuse the clipboard-clone helper by first minting ids on
	// the clipboard parts (so cloneParts can index by id), then clearing them.
	// Simpler: clone directly here mirroring cloneSelectionForClipboard.
	const clip = core.clipboard;
	const newParts: Part[] = [];
	const cloneByIndex: (ShapePart | -1)[] = [];

	for (const sp of clip) {
		if (sp instanceof ShapePart) {
			const copy = sp.MakeCopy();
			// Offset the clone (:5085-5088 places at the cursor; port offsets).
			copy.Move(copy.centerX + offX, copy.centerY + offY);
			newParts.push(copy);
			cloneByIndex.push(copy);
		} else if (sp instanceof TextPart) {
			const copy = sp.MakeCopy();
			copy.Move(copy.x + offX, copy.y + offY);
			newParts.push(copy);
			cloneByIndex.push(-1);
		} else {
			cloneByIndex.push(-1);
		}
	}

	for (let i = 0; i < clip.length; i++) {
		const sp = clip[i];
		if (sp instanceof JointPart) {
			let index1 = -1;
			let index2 = -1;
			for (let j = 0; j < clip.length; j++) {
				if (clip[j] === sp.part1) index1 = j;
				if (clip[j] === sp.part2) index2 = j;
			}
			if (index1 === -1 || index2 === -1) continue;
			const p1 = cloneByIndex[index1];
			const p2 = cloneByIndex[index2];
			if (p1 === -1 || p2 === -1) continue;
			const copy = sp.MakeCopy(p1, p2) as JointPart;
			copy.Move(copy.anchorX + offX, copy.anchorY + offY);
			newParts.push(copy);
		} else if (sp instanceof Thrusters) {
			let index1 = -1;
			for (let j = 0; j < clip.length; j++) {
				if (clip[j] === sp.shape) index1 = j;
			}
			if (index1 === -1) continue;
			const parent = cloneByIndex[index1];
			if (parent === -1) continue;
			const copy = sp.MakeCopy(parent) as Thrusters;
			copy.centerX += offX;
			copy.centerY += offY;
			newParts.push(copy);
		}
	}

	if (newParts.length === 0) return;

	for (const p of newParts) p.id = ++core.nextId;
	const selection = newParts.map((p) => p.id);
	core.state = {
		...core.state,
		parts: [...core.state.parts, ...newParts],
		edit: {
			...core.state.edit,
			selection,
			selectedPart: snapshotOf(newParts[0]),
		},
	};
	core.markChanged();
	if (core.challenge) core.syncChallenge();
	// HomeMovies milestone (ControllerHomeMovies.Update :412): the copied ragdoll
	// was pasted -> dialog 46 "pasted". Cursor-gated.
	if (core.tutorialMachine) core.notifyTutorial({ type: "progress", key: "pasted" });
}

/**
 * movePartsToFront — ControllerGame.frontButton (:4351-4373). Remove the selected
 * parts from the parts array and re-append them at the END (drawn last / on top),
 * preserving their relative order. Attached joints/thrusters are NOT moved with
 * them — frontButton only moves the selected part itself (the joint has its own
 * z-slot); we mirror that by moving exactly the selected ids.
 */
export function handleMoveToFront(core: CoreInternals, partIds: number[]): void {
	const move = new Set(partIds);
	const moved = core.state.parts.filter((p) => move.has(p.id));
	if (moved.length === 0) return;
	const rest = core.state.parts.filter((p) => !move.has(p.id));
	core.state = { ...core.state, parts: [...rest, ...moved] };
	core.markChanged();
}

/**
 * movePartsToBack — ControllerGame.backButton (:4375-4397). Move the selected
 * parts to the FRONT of the array (drawn first / behind), preserving relative
 * order. The legacy backButton stops moving a part behind a non-editable part
 * (the sandbox terrain, :4389-4391) so a robot part never sinks below the ground;
 * we mirror that by inserting the moved parts AFTER the leading run of
 * non-editable (isSandbox terrain) parts rather than at absolute index 0.
 */
export function handleMoveToBack(core: CoreInternals, partIds: number[]): void {
	const move = new Set(partIds);
	const moved = core.state.parts.filter((p) => move.has(p.id));
	if (moved.length === 0) return;
	const rest = core.state.parts.filter((p) => !move.has(p.id));
	// Find the insertion point: after the leading run of non-editable parts
	// (terrain), so moved robot parts stay above the ground (backButton :4389).
	let insertAt = 0;
	while (insertAt < rest.length && !rest[insertAt].isEditable) insertAt++;
	const parts = [...rest.slice(0, insertAt), ...moved, ...rest.slice(insertAt)];
	core.state = { ...core.state, parts };
	core.markChanged();
	// HomeMovies milestone (ControllerHomeMovies.Update :368-389): a leg piece
	// moved to back (z-order) -> dialog 56 "movedLegsBack". Cursor-gated.
	if (core.tutorialMachine) core.notifyTutorial({ type: "progress", key: "movedLegsBack" });
}
