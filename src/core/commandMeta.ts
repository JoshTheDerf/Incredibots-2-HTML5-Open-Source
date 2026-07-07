// Command classification table — one row per Command type.
//
// Replaces two parallel hand-enumerated switches in GameCore that had to be
// updated in lockstep with every new command: `isMutating` (undo-snapshot
// gating) and the "no-op during simulation" blocklist at the top of
// applyCommand. Because COMMAND_META is a Record over Command["type"], the
// compiler enforces exhaustiveness: a newly added command type fails typecheck
// here until it is classified (pick its flags — or `{}` — deliberately).

import type { Command } from "./Command";

/** Per-command classification flags. */
export interface CommandMeta {
	/**
	 * The command mutates the parts graph and should therefore push an undo
	 * snapshot before it applies. Excludes selection (select/clearSelection),
	 * tool changes (setTool), sim controls (play/pause/reset/step), undo/redo
	 * itself, and persistence (handled separately). Covers the create /
	 * delete / move / rotate / resize / setColour / setXxx family.
	 */
	mutating?: true;
	/**
	 * ControllerGame disallows editing during simulation (the side panel is
	 * hidden and curAction cleared on play, :2728-2730). Commands with this
	 * flag are ignored while running/paused; sim controls (play/pause/reset/
	 * step), selection changes and camera moves still pass through.
	 */
	blockedDuringSim?: true;
}

// Every undoable parts-graph edit is also blocked during simulation.
const EDIT: CommandMeta = { mutating: true, blockedDuringSim: true };
// Editing-adjacent commands (gesture state, tool/undo/persistence, challenge
// editing) that must no-op during simulation but do not push undo history.
const SIM_BLOCKED: CommandMeta = { blockedDuringSim: true };
// Commands that pass through in every phase (sim controls, selection, camera,
// replay/tutorial glue, live-play input).
const FREE: CommandMeta = {};

export const COMMAND_META: Record<Command["type"], CommandMeta> = {
	// Sim controls.
	play: FREE,
	pause: FREE,
	reset: FREE,
	step: FREE,
	setTool: SIM_BLOCKED,
	// Part creation.
	createShape: EDIT,
	createPolygon: EDIT,
	editPolygonPoint: EDIT,
	addPolygonPoint: EDIT,
	removePolygonPoint: EDIT,
	subtractShapes: EDIT,
	createText: EDIT,
	createThrusters: EDIT,
	createCannon: EDIT,
	createJoint: EDIT,
	// finishPrismaticJoint / finalizeJoint create the actual joint part (the
	// two-click + disambiguation commit sites). startPrismaticJoint,
	// cycleJointCandidate and cancelJointGesture only touch transient gesture
	// state / highlightForJoint, so they are NOT mutating.
	startPrismaticJoint: SIM_BLOCKED,
	finishPrismaticJoint: EDIT,
	cycleJointCandidate: SIM_BLOCKED,
	finalizeJoint: EDIT,
	cancelJointGesture: SIM_BLOCKED,
	// Part editing.
	deleteParts: EDIT,
	moveParts: EDIT,
	rotateParts: EDIT,
	// resizeStart snapshots history for the whole resize gesture; the
	// per-move resizeParts + resizeEnd deliberately do NOT (they'd stack a
	// history entry per pointer-move). mirrorParts is a one-shot mutation.
	resizeStart: EDIT,
	resizeParts: SIM_BLOCKED,
	resizeEnd: SIM_BLOCKED,
	mirrorParts: EDIT,
	// cutParts + pasteParts edit the parts graph (undoable). copyParts only
	// snapshots the clipboard — no state change, so it is NOT mutating.
	copyParts: SIM_BLOCKED,
	cutParts: EDIT,
	pasteParts: EDIT,
	movePartsToFront: EDIT,
	movePartsToBack: EDIT,
	// Part properties.
	setColour: EDIT,
	setDensity: EDIT,
	setFragility: EDIT,
	setFriction: EDIT,
	setRestitution: EDIT,
	setCollide: EDIT,
	setCollisionGroups: EDIT,
	setShapeTrigger: EDIT,
	setTriggerList: EDIT,
	setCameraFocus: EDIT,
	setFixate: EDIT,
	setLocked: EDIT,
	setBorderOpacity: EDIT,
	setVisualInSim: EDIT,
	setScaleToZoom: EDIT,
	setFixedRotation: EDIT,
	setOutline: EDIT,
	setOutlineBehind: EDIT,
	setUndragable: EDIT,
	// Joint properties.
	setJointMotor: EDIT,
	setJointStrength: EDIT,
	setJointSpeed: EDIT,
	setJointLimits: EDIT,
	setJointControlKey: EDIT,
	setJointAutoOn: EDIT,
	setJointEnableKey: EDIT,
	setJointBeginExpanded: EDIT,
	setJointStiff: EDIT,
	setJointInitialLength: EDIT,
	// Thruster / cannon properties.
	setThrusterStrength: EDIT,
	setThrusterKey: EDIT,
	setThrusterAutoOn: EDIT,
	setThrusterEnableKey: EDIT,
	setCannonStrength: EDIT,
	setCannonFireKey: EDIT,
	setBombProps: EDIT,
	// Text properties.
	setTextContent: EDIT,
	setTextSize: EDIT,
	setTextDisplayKey: EDIT,
	setTextAlwaysVisible: EDIT,
	setTextScaleWithZoom: EDIT,
	setTextAngle: EDIT,
	setTextVisibleOnStart: EDIT,
	// Sandbox / view settings.
	setSandboxSettings: SIM_BLOCKED,
	toggleShowJoints: FREE,
	toggleShowColours: FREE,
	toggleShowOutlines: FREE,
	toggleSnapToCenter: FREE,
	// Camera.
	zoomIn: FREE,
	zoomOut: FREE,
	centerOnSelection: FREE,
	panCamera: FREE,
	zoomCamera: FREE,
	// Selection.
	select: FREE,
	clearSelection: FREE,
	// A batch is mutating iff it wraps at least one mutating sub-command
	// (see isMutatingCommand's recursive special case), so a group edit pushes
	// exactly one history snapshot (MultiActionsAction). It is blocked during
	// simulation like the edits it wraps.
	batch: SIM_BLOCKED,
	// Undo / redo / persistence.
	undo: SIM_BLOCKED,
	redo: SIM_BLOCKED,
	loadRobot: SIM_BLOCKED,
	newRobot: SIM_BLOCKED,
	clearAll: SIM_BLOCKED,
	// newSandbox passes through during a running sim (not a no-op) — it tears
	// the previous mode down itself.
	newSandbox: FREE,
	// Challenge editing.
	newChallenge: SIM_BLOCKED,
	loadBuiltInChallenge: FREE,
	exitChallenge: SIM_BLOCKED,
	addWinCondition: SIM_BLOCKED,
	addLossCondition: SIM_BLOCKED,
	removeWinCondition: SIM_BLOCKED,
	removeLossCondition: SIM_BLOCKED,
	setWinConditionsAnded: SIM_BLOCKED,
	startConditionPick: SIM_BLOCKED,
	conditionPickBox: SIM_BLOCKED,
	conditionPickShape: SIM_BLOCKED,
	cancelConditionPick: SIM_BLOCKED,
	setAllowedParts: SIM_BLOCKED,
	setBuildPermissions: SIM_BLOCKED,
	setPartLimits: SIM_BLOCKED,
	addBuildArea: SIM_BLOCKED,
	removeBuildArea: SIM_BLOCKED,
	enterChallengePlay: SIM_BLOCKED,
	editChallenge: SIM_BLOCKED,
	// Replay.
	playReplay: FREE,
	viewReplayAgain: FREE,
	stopReplay: FREE,
	replayKey: FREE,
	moveCameraDuringSim: FREE,
	// Live-play input.
	keyInput: FREE,
	mouseJointStart: FREE,
	mouseJointMove: FREE,
	mouseJointEnd: FREE,
	// Tutorials.
	loadTutorial: FREE,
	advanceTutorial: FREE,
	closeTutorial: FREE,
};

/**
 * Whether a command mutates the parts graph and should therefore push an undo
 * snapshot before it applies (see CommandMeta.mutating). Recursive because a
 * batch is mutating iff it wraps at least one mutating sub-command, so a group
 * edit pushes exactly one history snapshot (MultiActionsAction).
 */
export function isMutatingCommand(command: Command): boolean {
	if (command.type === "batch") return command.commands.some(isMutatingCommand);
	return COMMAND_META[command.type].mutating === true;
}
