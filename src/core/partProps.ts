// Part property setters — the per-property command family.
//
// Extracted from GameCore's command switch: the ShapePart material/flag
// setters, the trigger source/target editors, and the joint / thruster /
// cannon / bomb / text property setters (each faithful to its legacy
// src/Actions handler — see the per-case notes). applyPartPropsCommand is the
// single dispatcher GameCore's switch delegates the whole family to; it
// returns false for any command outside the family. Mutations go through
// partOps.editParts so the selection read-model refreshes uniformly.

import { Bomb } from "../Parts/Bomb";
import { Cannon } from "../Parts/Cannon";
import { JointPart } from "../Parts/JointPart";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { RevoluteJoint } from "../Parts/RevoluteJoint";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import {
	MAX_DENSITY,
	MAX_FRAGILITY,
	MAX_FRICTION,
	MAX_RESTITUTION,
	MAX_RJ_SPEED,
	MAX_RJ_STRENGTH,
	MAX_SJ_SPEED,
	MAX_SJ_STRENGTH,
	MIN_DENSITY,
	MIN_FRAGILITY,
	MIN_FRICTION,
	MIN_RESTITUTION,
} from "../Parts/partDefaults";
import type { Command } from "./Command";
import {
	clampDensity,
	clampFriction,
	clampRestitution,
	clampRJ,
	clampSJ,
	clampThruster,
} from "./challenge";
import type { CoreInternals } from "./coreInternals";
import { deriveSelectedPart, editParts } from "./partOps";

// Strength/speed sliders (joints, thrusters, cannon) share a 1..30 range, driven
// by MAX_RJ_STRENGTH / MAX_SJ_STRENGTH / MAX_THRUSTER_STRENGTH — all 30 (see
// partDefaults). Kept as a single constant since they're identical.
const MAX_JOINT_VALUE = 30;

/**
 * Trigger-editing gate: in a challenge PLAY session whose author excluded
 * triggers (challenge.triggersAllowed=false, Jaybit Challenge.as:66 /
 * RestrictionsWindow "Exclude Triggers"), the trigger commands are refused
 * with the legacy paste-dialog string (jaybit ControllerGame.as:9250-9256;
 * the legacy UI also disables the inputs, AdvancedPropertiesWindow.as:943-976
 * — the core never trusts the UI). Edit/authoring mode is not gated,
 * matching the playChallengeMode check.
 */
export function triggersBlocked(core: CoreInternals): boolean {
	if (core.challenge && core.challenge.playMode && !core.challenge.challenge.triggersAllowed) {
		core.emitMessage("Sorry, triggers are not allowed in this challenge!");
		return true;
	}
	return false;
}

/**
 * Sanitize a trigger-name CSV: strip `[` and `]` (the inputs' restrict
 * `"^[]"` — protecting the `[varies]` multi-edit sentinel) and clamp to the
 * 255-char maxChars (Gui/AdvancedPropertiesWindow.as trigger inputs).
 */
export function sanitizeTriggerText(core: CoreInternals, value: string): string {
	return value.replace(/[\[\]]/g, "").slice(0, 255);
}

/**
 * Emit the strength/speed-slider tutorial milestones shared by setJointStrength
 * and setJointSpeed. Faithful to the legacy Update() checks:
 *   Jumpbot (ControllerJumpbot.Update :106): the piston's strength AND speed both
 *     raised above 15 -> dialog 19 "powerIncreased".
 *   Dumpbot (ControllerDumpbot.Update :228): the loading-arm motor's speed < 15,
 *     strength > 15, and stiff -> dialog 31 "motorAdjusted".
 * Both are cursor-gated, so evaluating the whole graph each slider change is safe.
 */
export function emitJointPowerMilestones(core: CoreInternals, partIds: number[]): void {
	const ids = new Set(partIds);
	for (const p of core.state.parts) {
		if (!ids.has(p.id)) continue;
		if (p instanceof PrismaticJoint && p.pistonStrength > 15 && p.pistonSpeed > 15) {
			core.notifyTutorial({ type: "progress", key: "powerIncreased" });
		}
		if (p instanceof RevoluteJoint && p.motorSpeed < 15 && p.motorStrength > 15 && p.isStiff) {
			core.notifyTutorial({ type: "progress", key: "motorAdjusted" });
		}
	}
}

/**
 * Apply a part-property command (the setColour / set* family). Returns true
 * when the command belonged to this family (handled — including a refusal by
 * a challenge trigger/collision gate), false for any other command so the
 * caller's switch can keep dispatching.
 */
export function applyPartPropsCommand(core: CoreInternals, command: Command): boolean {
	switch (command.type) {
		case "setColour": {
			// makeDefault: also set the default colour used by new parts
			// (ControllerGame.colourButton defaultColour → defaultR/G/B/O :4454-4461).
			// Stored in ShapePart units: r/g/b are 0-255, opacity 0-255.
			if (command.makeDefault) {
				core.defaultRed = command.r;
				core.defaultGreen = command.g;
				core.defaultBlue = command.b;
				core.defaultOpacity = command.opacity * 255;
			}
			const target = new Set(command.partIds);
			for (const p of core.state.parts) {
				if (!target.has(p.id)) continue;
				// Part colour channels are 0-255 (matches the renderer, which does
				// red/255 etc. — see Draw.ts). The command's r/g/b are already 0-255
				// (parsed from a hex swatch); opacity arrives 0-1, stored as 0-255.
				if (p instanceof ShapePart) {
					p.red = command.r;
					p.green = command.g;
					p.blue = command.b;
					p.opacity = command.opacity * 255;
				} else if (p instanceof TextPart) {
					p.red = command.r;
					p.green = command.g;
					p.blue = command.b;
				}
			}
			core.state = {
				...core.state,
				parts: [...core.state.parts],
				edit: { ...core.state.edit, selectedPart: deriveSelectedPart(core, core.state.edit.selection) },
			};
			core.markChanged();
			// HomeMovies colour milestones (ControllerHomeMovies.Update :360/:402):
			// the face coloured beige (255,216,136) -> 41 "colouredFace"; the support
			// rect made invisible (opacity 0) -> 43 "invisiblised". Cursor-gated.
			if (core.tutorialMachine) {
				if (command.r === 255 && command.g === 216 && command.b === 136) {
					core.notifyTutorial({ type: "progress", key: "colouredFace" });
				}
				if (command.opacity === 0) core.notifyTutorial({ type: "progress", key: "invisiblised" });
			}
			return true;
		}
		// --- Shape properties (ShapePart family) ---
		// Density: absolute value clamped to [MIN_DENSITY, MAX_DENSITY]
		// (ControllerGame.densitySlider :4078; clamp :4095-4096).
		case "setDensity": {
			let v = Math.max(MIN_DENSITY, Math.min(MAX_DENSITY, command.value));
			// Challenge density limits (ControllerGame.densityText :4090-4091).
			if (core.challenge) v = clampDensity(core.challenge, v);
			editParts(core, command.partIds, (p) => {
				if (p instanceof ShapePart) p.density = v;
			});
			// Jumpbot milestone (ControllerJumpbot.Update :110): the car body's
			// density decreased below 15 -> dialog 20 "densityDecreased". The legacy
			// checks carBody.density < 15; cursor-gated so any shape's density
			// crossing below 15 emits it faithfully.
			if (core.tutorialMachine && v < 15) core.notifyTutorial({ type: "progress", key: "densityDecreased" });
			return true;
		}
		// Fragility (superset/prototype): absolute value clamped to
		// [MIN_FRAGILITY, MAX_FRAGILITY]. 0 == indestructible (see fractureSystem).
		case "setFragility": {
			const v = Math.max(MIN_FRAGILITY, Math.min(MAX_FRAGILITY, command.value));
			editParts(core, command.partIds, (p) => {
				if (p instanceof ShapePart) p.fragility = v;
			});
			return true;
		}
		// Friction / restitution: 1..30 UI scale like density (Jaybit
		// frictionSlider/restitutionSlider; text entry clamped like
		// CheckFriction/CheckRestitution against the challenge min/max).
		case "setFriction": {
			let v = Math.max(MIN_FRICTION, Math.min(MAX_FRICTION, command.value));
			if (core.challenge) v = clampFriction(core.challenge, v);
			editParts(core, command.partIds, (p) => {
				if (p instanceof ShapePart) p.friction = v;
			});
			return true;
		}
		case "setRestitution": {
			let v = Math.max(MIN_RESTITUTION, Math.min(MAX_RESTITUTION, command.value));
			if (core.challenge) v = clampRestitution(core.challenge, v);
			editParts(core, command.partIds, (p) => {
				if (p instanceof ShapePart) p.restitution = v;
			});
			return true;
		}
		// Collision layers A-D + subColl + collide, applied together as the
		// Jaybit Advanced-properties submit does (ControllerGame triggerText
		// handler :6985-7041). Lives on ShapePart AND PrismaticJoint.
		// Challenge restriction gate (only in PLAY mode, like triggersBlocked):
		// !collisionGroupsAllowed refuses the A-D changes and
		// !subCollisionsAllowed refuses the subColl change, INDEPENDENTLY —
		// the permitted half still goes through, mirroring the legacy UI which
		// disables the two groups of checkboxes separately
		// (AdvancedPropertiesWindow.as:960-975).
		case "setCollisionGroups": {
			const inPlay = core.challenge !== null && core.challenge.playMode;
			const groupsBlocked = inPlay && !core.challenge!.challenge.collisionGroupsAllowed;
			const subCollBlocked = inPlay && !core.challenge!.challenge.subCollisionsAllowed;
			editParts(core, command.partIds, (p) => {
				if (p instanceof ShapePart || p instanceof PrismaticJoint) {
					if (!groupsBlocked) {
						p.collA = command.collA;
						p.collB = command.collB;
						p.collC = command.collC;
						p.collD = command.collD;
					}
					if (!subCollBlocked) p.subColl = command.subColl;
					p.collide = command.collide;
				}
			});
			return true;
		}
		// --- Triggers (Jaybit AdvancedPropertiesWindow OK -> triggerText :6920-7160) ---
		// Edit one trigger slot of the selected SOURCE shapes. Omitted fields are
		// left unchanged (multi-edit "[varies]"/unresolved). Cannons are excluded
		// as sources (they only carry a triggerList). Undo comes from the
		// command journal (isMutatingCommand).
		case "setShapeTrigger": {
			if (triggersBlocked(core)) return true;
			const name = command.name === undefined ? undefined : sanitizeTriggerText(core, command.name);
			// Action must be a TRIGGER_* constant (0..6); anything else is
			// ignored (leave unchanged), mirroring the combo's fixed item list.
			const action =
				command.action !== undefined && Number.isInteger(command.action) && command.action >= 0 && command.action <= 6
					? command.action
					: undefined;
			editParts(core, command.partIds, (p) => {
				if (!(p instanceof ShapePart) || p instanceof Cannon) return;
				if (command.slot === 1) {
					if (name !== undefined) p.triggerName = name;
					if (action !== undefined) p.triggerAction = action;
					if (command.onSameName !== undefined) p.onSameName = command.onSameName;
					if (command.onGroundHit !== undefined) p.onGroundHit = command.onGroundHit;
				} else {
					if (name !== undefined) p.triggerName_2 = name;
					if (action !== undefined) p.triggerAction_2 = action;
					if (command.onSameName !== undefined) p.onSameName_2 = command.onSameName;
					if (command.onGroundHit !== undefined) p.onGroundHit_2 = command.onGroundHit;
				}
			});
			return true;
		}
		// Set the comma-separated listen list on trigger TARGETS (joints /
		// thrusters / cannons / text parts).
		case "setTriggerList": {
			if (triggersBlocked(core)) return true;
			const value = sanitizeTriggerText(core, command.value);
			editParts(core, command.partIds, (p) => {
				if (p instanceof Cannon) p.triggerList = value;
				else if (p instanceof Bomb) p.triggerList = value;
				else if (p instanceof JointPart) p.triggerList = value;
				else if (p instanceof Thrusters) p.triggerList = value;
				else if (p instanceof TextPart) p.triggerList = value;
			});
			return true;
		}
		// Collide lives on ShapePart AND PrismaticJoint (ShapeCheckboxAction COLLIDE_TYPE).
		case "setCollide":
			editParts(core, command.partIds, (p) => {
				if (p instanceof ShapePart) p.collide = command.value;
				else if (p instanceof PrismaticJoint) p.collide = command.value;
			});
			// RubeGoldberg milestone (ControllerRubeGoldberg.Update :713): the "END"
			// letter chunk made non-colliding -> dialog 80 "endUncollided". Cursor-gated.
			if (command.value === false && core.tutorialMachine) core.notifyTutorial({ type: "progress", key: "endUncollided" });
			return true;
		// Camera focus (CameraAction). Setting one part's focus clears any other
		// part currently focused, matching CameraAction's oldCameraPart handling.
		case "setCameraFocus":
			editParts(core, command.partIds, (p) => {
				if (!(p instanceof ShapePart)) return;
				if (command.value) {
					for (const other of core.state.parts) {
						if (other instanceof ShapePart && other !== p) other.isCameraFocus = false;
					}
				}
				p.isCameraFocus = command.value;
			});
			return true;
		// Fixate == Part.isStatic (ShapeCheckboxAction FIXATE_TYPE).
		case "setFixate":
			editParts(core, command.partIds, (p) => {
				if (p instanceof ShapePart) p.isStatic = command.value;
			});
			// Tutorial milestone: fixating a shape (ControllerHomeMovies -> 60,
			// ControllerRubeGoldberg -> 78, both key "fixated").
			if (command.value && core.tutorialMachine) core.notifyTutorial({ type: "progress", key: "fixated" });
			return true;
		// IB3 fixed rotation == ShapePart.fixedRotation (locks the body angle).
		case "setFixedRotation":
			editParts(core, command.partIds, (p) => {
				if (p instanceof ShapePart) p.fixedRotation = command.value;
			});
			return true;
		// IB3 superset: lock/unlock parts. Locking also DROPS them from the current
		// selection (a locked part can't be re-selected — see the "select" handler).
		case "setLocked":
			editParts(core, command.partIds, (p) => {
				p.locked = command.value;
			});
			return true;
		// IB3 superset: outline opacity (0..255) — Draw uses it as the outline alpha.
		case "setBorderOpacity": {
			const v = Math.max(0, Math.min(255, Math.round(command.value)));
			editParts(core, command.partIds, (p) => {
				p.borderOpacity = v;
			});
			return true;
		}
		// IB3 superset: show a joint/thruster graphic during the sim (else hidden).
		case "setVisualInSim":
			editParts(core, command.partIds, (p) => {
				p.visualInSim = command.value;
			});
			return true;
		// IB3 superset: joint/thruster graphic scales with zoom vs constant screen size.
		case "setScaleToZoom":
			editParts(core, command.partIds, (p) => {
				p.scaleToZoom = command.value;
			});
			return true;
		// Outline lives on ShapePart AND PrismaticJoint (ShapeCheckboxAction OUTLINE_TYPE).
		case "setOutline":
			editParts(core, command.partIds, (p) => {
				if (p instanceof ShapePart) p.outline = command.value;
				else if (p instanceof PrismaticJoint) p.outline = command.value;
			});
			// HomeMovies milestone (ControllerHomeMovies.Update :364): the hair pieces
			// had "Show Outlines" turned OFF -> dialog 42 "unoutlined" (audit L4). This
			// is distinct from "outlinesBehind" (the terrain flag, NewFeatures 86).
			if (command.value === false && core.tutorialMachine) core.notifyTutorial({ type: "progress", key: "unoutlined" });
			return true;
		// "Outlines Behind" == ShapePart.terrain (ShapeCheckboxAction TERRAIN_TYPE).
		case "setOutlineBehind":
			editParts(core, command.partIds, (p) => {
				if (p instanceof ShapePart) p.terrain = command.value;
			});
			// Tutorial milestone (ControllerNewFeatures -> 86 "outlinesBehind").
			if (command.value && core.tutorialMachine) core.notifyTutorial({ type: "progress", key: "outlinesBehind" });
			return true;
		case "setUndragable":
			editParts(core, command.partIds, (p) => {
				if (p instanceof ShapePart) p.undragable = command.value;
			});
			// Tutorial milestone (ControllerNewFeatures -> 88 "undraggable").
			if (command.value && core.tutorialMachine) core.notifyTutorial({ type: "progress", key: "undraggable" });
			return true;

		// --- Joint properties (RevoluteJoint / PrismaticJoint) ---
		// Motor enable: enableMotor (revolute) / enablePiston (prismatic)
		// (JointCheckboxAction ENABLE_TYPE).
		case "setJointMotor":
			editParts(core, command.partIds, (p) => {
				if (p instanceof RevoluteJoint) p.enableMotor = command.value;
				else if (p instanceof PrismaticJoint) p.enablePiston = command.value;
			});
			// Tutorial milestones: a revolute motor enabled (ControllerCar -> 13
			// "motorsEnabled"; ControllerHomeMovies shoulder -> 44 "shoulderEnabled"),
			// a piston enabled (ControllerJumpbot -> 17 "pistonEnabled"). The
			// cursor-based machines only advance on the key they expect next.
			if (command.value && core.tutorialMachine) {
				const ids = new Set(command.partIds);
				const enabledRevolute = core.state.parts.some((p) => p instanceof RevoluteJoint && ids.has(p.id));
				const enabledPrismatic = core.state.parts.some((p) => p instanceof PrismaticJoint && ids.has(p.id));
				if (enabledRevolute) {
					// A single revolute motor enabled advances ControllerHomeMovies (one
					// shoulder joint -> 44 "shoulderEnabled", :406). Car (-> 13, :113) and
					// Dumpbot (-> 24, :140) require BOTH wheel joints motored; emit those
					// keys only once two motored RevoluteJoints exist (the last two parts
					// legacy check). Cursor gating keeps the extra emits harmless.
					core.notifyTutorial({ type: "progress", key: "shoulderEnabled" });
					const motoredRevolutes = core.state.parts.filter((p) => p instanceof RevoluteJoint && p.enableMotor).length;
					if (motoredRevolutes >= 2) {
						core.notifyTutorial({ type: "progress", key: "motorsEnabled" });
						core.notifyTutorial({ type: "progress", key: "wheelJoints" });
					}
				}
				if (enabledPrismatic) core.notifyTutorial({ type: "progress", key: "pistonEnabled" });
			}
			return true;
		// Strength: motorStrength / pistonStrength (ChangeSliderAction STRENGTH_TYPE;
		// slider range 1..30 — MAX_RJ_STRENGTH / MAX_SJ_STRENGTH).
		case "setJointStrength": {
			// Per-type slider max (widened to accommodate IB3): RJ 1..MAX_RJ_STRENGTH,
			// SJ 1..MAX_SJ_STRENGTH (they now differ — see partDefaults).
			// Challenge joint-strength caps differ by joint type too
			// (ControllerGame.strengthText :4122 RJ / :4127 SJ).
			const ch = core.challenge;
			editParts(core, command.partIds, (p) => {
				if (p instanceof RevoluteJoint) {
					const v = Math.max(1, Math.min(MAX_RJ_STRENGTH, command.value));
					p.motorStrength = ch ? clampRJ(ch, v, "strength") : v;
				} else if (p instanceof PrismaticJoint) {
					const v = Math.max(1, Math.min(MAX_SJ_STRENGTH, command.value));
					p.pistonStrength = ch ? clampSJ(ch, v, "strength") : v;
				}
			});
			if (core.tutorialMachine) emitJointPowerMilestones(core, command.partIds);
			return true;
		}
		// Speed: motorSpeed / pistonSpeed (ChangeSliderAction SPEED_TYPE).
		case "setJointSpeed": {
			// Per-type slider max (widened for IB3): RJ 1..MAX_RJ_SPEED,
			// SJ 1..MAX_SJ_SPEED (IB3 piston speed maps to IB2 units *2.5, so 100).
			const ch = core.challenge;
			editParts(core, command.partIds, (p) => {
				if (p instanceof RevoluteJoint) {
					const v = Math.max(1, Math.min(MAX_RJ_SPEED, command.value));
					p.motorSpeed = ch ? clampRJ(ch, v, "speed") : v;
				} else if (p instanceof PrismaticJoint) {
					const v = Math.max(1, Math.min(MAX_SJ_SPEED, command.value));
					p.pistonSpeed = ch ? clampSJ(ch, v, "speed") : v;
				}
			});
			if (core.tutorialMachine) emitJointPowerMilestones(core, command.partIds);
			return true;
		}
		// Revolute limits, in degrees (LimitChangeAction; clamp rules from
		// ControllerGame.minLimitText :4589 / maxLimitText :4610): null == "None"
		// (∓MAX_VALUE); a lower limit must be ≤0, an upper limit must be ≥0.
		case "setJointLimits": {
			const lower = command.lower === null ? -Number.MAX_VALUE : Math.min(0, command.lower);
			const upper = command.upper === null ? Number.MAX_VALUE : Math.max(0, command.upper);
			editParts(core, command.partIds, (p) => {
				if (p instanceof RevoluteJoint) {
					p.motorLowerLimit = lower;
					p.motorUpperLimit = upper;
				}
			});
			// Tutorial milestones (ControllerCatapult.Update): lower == -10 -> 35
			// "limitLower"; upper == 50 -> 36 "limitUpper" (the command carries the
			// UI's degree values).
			if (core.tutorialMachine) {
				if (command.lower === -10) core.notifyTutorial({ type: "progress", key: "limitLower" });
				if (command.upper === 50) core.notifyTutorial({ type: "progress", key: "limitUpper" });
			}
			return true;
		}
		// Control keys (ControlKeyAction): cw/ccw -> revolute motorCW/CCWKey;
		// up/down -> prismatic pistonUp/DownKey.
		case "setJointControlKey":
			editParts(core, command.partIds, (p) => {
				if (p instanceof RevoluteJoint) {
					if (command.which === "cw") p.motorCWKey = command.key;
					else if (command.which === "ccw") p.motorCCWKey = command.key;
				} else if (p instanceof PrismaticJoint) {
					if (command.which === "up") p.pistonUpKey = command.key;
					else if (command.which === "down") p.pistonDownKey = command.key;
				}
			});
			// Dumpbot milestone (ControllerDumpbot.Update :189): the loading-arm joint's
			// control keys set to up(38)/down(40) -> dialog 27 "controlKeys". The legacy
			// checks motorCWKey == 38 && motorCCWKey == 40 on the last RevoluteJoint.
			if (core.tutorialMachine) {
				const ids = new Set(command.partIds);
				const ok = core.state.parts.some(
					(p) => p instanceof RevoluteJoint && ids.has(p.id) && p.motorCWKey === 38 && p.motorCCWKey === 40,
				);
				if (ok) core.notifyTutorial({ type: "progress", key: "controlKeys" });
			}
			return true;
		// Auto-on flags (JointCheckboxAction AUTO_*): cw/ccw are mutually
		// exclusive on a revolute (setting one on clears the other, matching the
		// sideEffect path); oscillate is the prismatic flag.
		case "setJointAutoOn":
			editParts(core, command.partIds, (p) => {
				if (p instanceof RevoluteJoint) {
					if (command.which === "cw") {
						p.autoCW = command.value;
						if (command.value) p.autoCCW = false;
					} else if (command.which === "ccw") {
						p.autoCCW = command.value;
						if (command.value) p.autoCW = false;
					}
				} else if (p instanceof PrismaticJoint) {
					// oscillate == both directions; expand/retract are the IB3
					// independent auto flags. Keep autoOscillate == (expand && retract)
					// so the legacy flag stays coherent for readers/UI.
					if (command.which === "oscillate") {
						p.autoOscillate = command.value;
						p.autoExpand = command.value;
						p.autoRetract = command.value;
					} else if (command.which === "expand") {
						p.autoExpand = command.value;
						p.autoOscillate = p.autoExpand && p.autoRetract;
					} else if (command.which === "retract") {
						p.autoRetract = command.value;
						p.autoOscillate = p.autoExpand && p.autoRetract;
					}
				}
			});
			// RubeGoldberg milestone (ControllerRubeGoldberg.Update :709): the cart's
			// back-wheel motor set to Auto-On CCW -> dialog 79 "autoWheel".
			if (command.which === "ccw" && command.value && core.tutorialMachine) {
				core.notifyTutorial({ type: "progress", key: "autoWheel" });
			}
			return true;
		// IB3 per-direction key enable (RotatingJoint enableKeyCW/CCW,
		// SlidingJoint enableKeyExpand/Retract).
		case "setJointEnableKey":
			editParts(core, command.partIds, (p) => {
				if (p instanceof RevoluteJoint) {
					if (command.which === "cw") p.enableKeyCW = command.value;
					else if (command.which === "ccw") p.enableKeyCCW = command.value;
				} else if (p instanceof PrismaticJoint) {
					if (command.which === "expand") p.enableKeyExpand = command.value;
					else if (command.which === "retract") p.enableKeyRetract = command.value;
				}
			});
			return true;
		// IB3 SlidingJoint.beginExpanded (piston starts fully expanded).
		case "setJointBeginExpanded":
			editParts(core, command.partIds, (p) => {
				if (p instanceof PrismaticJoint) p.beginExpanded = command.value;
			});
			return true;
		// isStiff (JointCheckboxAction RIGID_TYPE) — the UI shows "Floppy Joint"
		// (= !isStiff); the command already carries the resolved isStiff value.
		case "setJointStiff":
			editParts(core, command.partIds, (p) => {
				if (p instanceof RevoluteJoint || p instanceof PrismaticJoint) p.isStiff = command.value;
			});
			// Dumpbot milestone (ControllerDumpbot.Update :185): the arm joint made
			// non-floppy (isStiff) with its motor enabled -> dialog 57 "solidified".
			if (command.value && core.tutorialMachine) {
				const ids = new Set(command.partIds);
				const ok = core.state.parts.some(
					(p) => p instanceof RevoluteJoint && ids.has(p.id) && p.enableMotor && p.isStiff,
				);
				if (ok) core.notifyTutorial({ type: "progress", key: "solidified" });
			}
			return true;
		case "setJointInitialLength":
			editParts(core, command.partIds, (p) => {
				if (p instanceof PrismaticJoint) p.initLength = Math.max(0, command.value);
			});
			return true;

		// --- Thruster ---
		case "setThrusterStrength": {
			let v = Math.max(1, Math.min(MAX_JOINT_VALUE, command.value));
			// Challenge thruster-strength cap (ControllerGame.thrustText :4179).
			if (core.challenge) v = clampThruster(core.challenge, v);
			editParts(core, command.partIds, (p) => {
				if (p instanceof Thrusters) p.strength = v;
			});
			return true;
		}
		case "setThrusterKey":
			editParts(core, command.partIds, (p) => {
				if (p instanceof Thrusters) p.thrustKey = command.key;
			});
			return true;
		case "setThrusterAutoOn":
			editParts(core, command.partIds, (p) => {
				if (p instanceof Thrusters) p.autoOn = command.value;
			});
			return true;
		// IB3 Thrusters.enableKey — whether the thrust key is honored.
		case "setThrusterEnableKey":
			editParts(core, command.partIds, (p) => {
				if (p instanceof Thrusters) p.enableKey = command.value;
			});
			return true;

		// --- Cannon ---
		case "setCannonStrength": {
			const v = Math.max(1, Math.min(MAX_JOINT_VALUE, command.value));
			editParts(core, command.partIds, (p) => {
				if (p instanceof Cannon) p.strength = v;
			});
			return true;
		}
		case "setCannonFireKey":
			editParts(core, command.partIds, (p) => {
				if (p instanceof Cannon) p.fireKey = command.key;
			});
			return true;

		// --- Bomb (IB3 port; ranges from Util.as BO_* consts) ---
		case "setBombProps":
			editParts(core, command.partIds, (p) => {
				if (!(p instanceof Bomb)) return;
				if (command.blastRadius !== undefined) p.blastRadius = Bomb.ClampBlastRadius(command.blastRadius);
				if (command.strength !== undefined) {
					p.strength = Math.max(Bomb.MIN_STRENGTH, Math.min(Bomb.MAX_STRENGTH, command.strength));
				}
				if (command.delay !== undefined) p.delay = Math.max(0, Math.trunc(command.delay));
				if (command.delayAfterTrigger !== undefined) p.delayAfterTrigger = command.delayAfterTrigger;
				if (command.explodeOnImpact !== undefined) p.explodeOnImpact = command.explodeOnImpact;
				if (command.delayAfterImpact !== undefined) p.delayAfterImpact = command.delayAfterImpact;
				if (command.repeatable !== undefined) p.repeatable = command.repeatable;
				if (command.repeat !== undefined) p.repeat = Math.max(0, Math.trunc(command.repeat));
				if (command.sensitive !== undefined) p.sensitive = command.sensitive;
				if (command.sensitivity !== undefined) {
					p.sensitivity = Math.max(Bomb.MIN_SENSITIVITY, Math.min(Bomb.MAX_SENSITIVITY, command.sensitivity));
				}
				if (command.deflect !== undefined) p.deflect = command.deflect;
			});
			return true;

		// --- Text (EnterTextAction / TextSizeChangeAction / TextCheckboxAction / ControlKeyAction TEXT_TYPE) ---
		case "setTextContent":
			editParts(core, command.partIds, (p) => {
				if (p instanceof TextPart) p.text = command.text;
			});
			// HomeMovies milestone (ControllerHomeMovies.Update :419): the dialogue text
			// was entered/resized -> dialog 48 "enteredText". Emit on a content change.
			if (core.tutorialMachine) core.notifyTutorial({ type: "progress", key: "enteredText" });
			return true;
		case "setTextSize":
			editParts(core, command.partIds, (p) => {
				if (p instanceof TextPart) p.size = Math.max(1, command.value);
			});
			if (core.tutorialMachine) core.notifyTutorial({ type: "progress", key: "enteredText" });
			return true;
		case "setTextDisplayKey":
			editParts(core, command.partIds, (p) => {
				if (p instanceof TextPart) p.displayKey = command.key;
			});
			return true;
		case "setTextAlwaysVisible":
			editParts(core, command.partIds, (p) => {
				if (p instanceof TextPart) p.alwaysVisible = command.value;
			});
			// HomeMovies milestone (ControllerHomeMovies.Update :423): "Always Display"
			// unchecked -> dialog 52 "uncheckedAlwaysDisplay".
			if (command.value === false && core.tutorialMachine) {
				core.notifyTutorial({ type: "progress", key: "uncheckedAlwaysDisplay" });
			}
			return true;
		case "setTextScaleWithZoom":
			editParts(core, command.partIds, (p) => {
				if (p instanceof TextPart) p.scaleWithZoom = command.value;
			});
			return true;
		// IB3 TextPart.angle (radians) — rotates the rendered text.
		case "setTextAngle":
			editParts(core, command.partIds, (p) => {
				if (p instanceof TextPart) p.angle = command.value;
			});
			return true;
		// IB3 TextPart.visibleOnStart — key-toggled text starts shown.
		case "setTextVisibleOnStart":
			editParts(core, command.partIds, (p) => {
				if (p instanceof TextPart) p.visibleOnStart = command.value;
			});
			return true;
		default:
			return false;
	}
}
