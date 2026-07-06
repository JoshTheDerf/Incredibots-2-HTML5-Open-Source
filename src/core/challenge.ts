// Core⇄view contract — CHALLENGE MODE
//
// Headless, Pixi-free, DOM-free faithful port of the legacy challenge system:
//   - the Challenge data object            (src/Game/Challenge.ts)
//   - Condition / WinCondition / LossCondition per-frame evaluation + contacts
//                                           (src/Game/Condition.ts, WinCondition.ts, LossCondition.ts)
//   - win/loss resolution + scoring + restriction gates + build-area fit
//                                           (src/Game/ControllerChallenge.ts, ControllerGame.CheckIfPartsFit)
//   - the two hardcoded built-in challenges (src/Game/Challenges/ControllerClimb.ts,
//                                            ControllerMonkeyBars.ts)
//
// The live domain object is the whitelisted legacy `Challenge` (which owns
// `WinCondition`/`LossCondition` instances — those carry `isSatisfied`, the
// picked `shape1`/`shape2` ShapePart refs, and the box/line extents the
// evaluator reads). This module owns the play/edit orchestration that used to
// live on ControllerChallenge, plus the plain-data read-model projection the
// Vue panels consume.
//
// NOTE: this module reuses the legacy `Condition` classes directly rather than
// re-implementing their AABB/contact math, so the win/loss semantics — including
// the subtle obj-5-resets-each-frame vs obj-6-latches distinction (Condition.ts
// :65-66/:130-131/:179-181/:224-225 vs ContactAdded :254-284) and the inverted
// subject-2 "all user shapes" start-true logic (:133-181) — are byte-identical
// to the original. Cannonballs now fire live in the headless core: Cannon.Update
// runs each frame and Cannon.CreateCannonball pushes the spawned b2Body into the
// partGlobals cannonball sink, which GameCore points at its live cannonball list
// on play — so subject-4 (any cannonball) and obj-5/6 (touching/touched a
// cannonball) conditions are exact too.

import { b2AABB } from "../Box2D";
import { Challenge } from "../Game/Challenge";
import { Condition } from "../Game/Condition";
import { LossCondition } from "../Game/LossCondition";
import { WinCondition } from "../Game/WinCondition";
import { Circle } from "../Parts/Circle";
import type { Part } from "../Parts/Part";
import { Rectangle } from "../Parts/Rectangle";
import { ShapePart } from "../Parts/ShapePart";
import { Triangle } from "../Parts/Triangle";
import { Cannon } from "../Parts/Cannon";
import { Polygon } from "../Parts/Polygon";

// --- No-limit sentinels (Challenge.ts:22-32) ---
// density min / joint & thruster caps use ∓Number.MAX_VALUE for "no limit";
// camera fields use +Number.MAX_VALUE for "unset". A read-model `number | null`
// maps null <-> these sentinels.
export const NO_LIMIT_MAX = Number.MAX_VALUE;
export const NO_LIMIT_MIN = -Number.MAX_VALUE;

// --- Plain-data read-model (crosses the core⇄view boundary) ---

export interface RegionData {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

/** Plain projection of a live Condition (win or loss). `isSatisfied` is live during play. */
export interface ConditionSnapshot {
	name: string;
	subject: number;
	object: number;
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	shape1Id: number | null;
	shape2Id: number | null;
	/** loss conditions only. */
	immediate?: boolean;
	isSatisfied: boolean;
}

export interface RestrictionState {
	// 8 part-type permission flags (Challenge.ts:8-15).
	circles: boolean;
	rects: boolean;
	tris: boolean;
	fixed: boolean;
	revolute: boolean;
	prismatic: boolean;
	thrusters: boolean;
	cannons: boolean;
	// Jaybit trigger permission (Challenge.as:66; RestrictionsWindow "Exclude Triggers").
	triggers: boolean;
	// build permissions (Challenge.ts:17-21).
	mouseDrag: boolean;
	botControl: boolean;
	fixate: boolean;
	nonColliding: boolean;
	showConditions: boolean;
	// Jaybit collision-group permissions (Challenge.as:39-40). The legacy UI
	// disables the A-D boxes on !collisionGroupsAllowed and the subColl box on
	// !subCollisionsAllowed INDEPENDENTLY (AdvancedPropertiesWindow.as:960-975).
	collisionGroups: boolean;
	subCollisions: boolean;
	// numeric limits; null == the ∓MAX_VALUE "no limit" sentinel.
	minDensity: number | null;
	maxDensity: number | null;
	// Jaybit friction/restitution restrictions (Challenge.as:36/:60/:64/:76).
	minFriction: number | null;
	maxFriction: number | null;
	minRestitution: number | null;
	maxRestitution: number | null;
	maxRJStrength: number | null;
	maxRJSpeed: number | null;
	maxSJStrength: number | null;
	maxSJSpeed: number | null;
	maxThrusterStrength: number | null;
}

export type ChallengeOutcome = "playing" | "won" | "failed" | null;

/**
 * Which hardcoded built-in challenge is loaded, if any. Drives the renderer's
 * per-challenge decorative terrain (the Climb / Monkey Bars sGround graphics,
 * which are renderer-only and NOT in the headless part list). null for an
 * authoring challenge or a plain sandbox session. Race/Spaceship are decoded
 * blobs whose terrain lives in their parts + sandbox settings, so they carry
 * their own tag purely for completeness (no bespoke sGround visual).
 */
export type BuiltInChallengeId = "climb" | "monkeyBars" | "race" | "spaceship" | null;

/**
 * Plain-data challenge read-model mirrored into GameState for the renderer +
 * Vue panels. Derived from the live `Challenge` each notify; nothing outside the
 * core mutates it.
 */
export interface ChallengeState {
	/** Whether this session is a challenge (vs plain sandbox). */
	active: boolean;
	/** playChallengeMode — the robot has been snapshotted + locked for play. */
	playMode: boolean;
	/** playOnlyMode — the challenge is uneditable (built-in challenges). */
	playOnly: boolean;
	winConditions: ConditionSnapshot[];
	lossConditions: ConditionSnapshot[];
	winConditionsAnded: boolean;
	restrictions: RestrictionState;
	buildAreas: RegionData[];
	/** CheckIfPartsFit result — gates play + drives the red/green build-area colour. */
	partsFit: boolean;
	outcome: ChallengeOutcome;
	/** 10000 - frame at win; null until a win. */
	score: number | null;
	/** Which built-in challenge is loaded (drives the renderer's terrain visual). */
	builtIn: BuiltInChallengeId;
}

// --- Challenge factory ---------------------------------------------------

/** A live challenge domain object + its play/edit orchestration state. */
export interface ChallengeSession {
	challenge: Challenge;
	playMode: boolean;
	playOnly: boolean;
	/** Snapshot of the editable robot parts captured on first play (allParts filter). */
	savedRobot: Part[];
	partsFit: boolean;
	outcome: ChallengeOutcome;
	score: number | null;
	/** Which built-in challenge is loaded (null for authoring challenges). */
	builtIn: BuiltInChallengeId;
}

/** A fresh, empty challenge session (default restrictions from Challenge.ts). */
export function createChallengeSession(): ChallengeSession {
	// The legacy Challenge ctor takes a SandboxSettings; the headless core keeps
	// sandbox config on GameState.sandbox, so we pass null (settings is unused by
	// the condition/restriction logic this module ports).
	const challenge = new Challenge(null as never);
	return {
		challenge,
		playMode: false,
		playOnly: false,
		savedRobot: [],
		partsFit: true,
		outcome: null,
		score: null,
		builtIn: null,
	};
}

/**
 * Wrap an already-decoded `Challenge` (from the Race / Spaceship blob, or a
 * user import) in a session, mirroring the ControllerRace / ControllerSpaceship
 * ctors (ControllerRace.ts:15-24) and Database.ImportChallenge +
 * ControllerGame.processLoadedChallenge (ControllerGame.as:8883-8884):
 * playChallengeMode = playOnlyMode = !editable. Built-in blobs and uneditable
 * imports open locked (editable=false → play-only); editable-exposure imports
 * open in the challenge editor (editable=true → playMode=false, playOnly=false),
 * so the author can edit conditions/restrictions/terrain. The decoded challenge
 * becomes the live challenge (its allParts are the terrain + author robot the
 * caller seeds into the parts graph). Conditions/restrictions/build areas are
 * already populated by ExtractChallengeFromByteArray.
 */
export function challengeSessionFromChallenge(
	challenge: Challenge,
	builtIn: BuiltInChallengeId = null,
	editable = false,
): ChallengeSession {
	return {
		challenge,
		playMode: !editable,
		playOnly: !editable,
		savedRobot: [],
		partsFit: true,
		outcome: null,
		score: null,
		builtIn,
	};
}

// --- Read-model projection ----------------------------------------------

function conditionSnapshot(c: Condition, isLoss: boolean): ConditionSnapshot {
	const snap: ConditionSnapshot = {
		name: String(c.name),
		subject: c.subject,
		object: c.object,
		minX: c.minX,
		maxX: c.maxX,
		minY: c.minY,
		maxY: c.maxY,
		shape1Id: c.shape1 ? c.shape1.id : null,
		shape2Id: c.shape2 ? c.shape2.id : null,
		isSatisfied: c.isSatisfied,
	};
	if (isLoss) snap.immediate = (c as LossCondition).immediate;
	return snap;
}

/**
 * True when a min/max limit field holds a "no limit" sentinel. BOTH MAX_VALUE
 * poles count: mins nominally use -MAX and maxes +MAX (Challenge.ts:22-32), but
 * old-format challenge data (e.g. the built-in race.dat) defaults the absent
 * friction/restitution trailer to +Number.MAX_VALUE for min AND max
 * (challengeSerialization trailer-absent path, Jaybit Database.as:3367-3372).
 * NOTE: this deliberately goes beyond Jaybit, which shipped the corresponding
 * bug — its CheckFriction raised every value up to the bogus +MAX "min".
 */
function isNoLimit(v: number): boolean {
	return v === NO_LIMIT_MAX || v === NO_LIMIT_MIN;
}

/** Map a limit field to the read-model: null for either "no limit" pole. */
function limitToNull(v: number): number | null {
	return isNoLimit(v) ? null : v;
}

/** Project the live session into the plain-data read-model for the view. */
export function toChallengeState(session: ChallengeSession): ChallengeState {
	const ch = session.challenge;
	return {
		active: true,
		playMode: session.playMode,
		playOnly: session.playOnly,
		winConditions: ch.winConditions.map((c: Condition) => conditionSnapshot(c, false)),
		lossConditions: ch.lossConditions.map((c: Condition) => conditionSnapshot(c, true)),
		winConditionsAnded: ch.winConditionsAnded,
		restrictions: {
			circles: ch.circlesAllowed,
			rects: ch.rectanglesAllowed,
			tris: ch.trianglesAllowed,
			fixed: ch.fixedJointsAllowed,
			revolute: ch.rotatingJointsAllowed,
			prismatic: ch.slidingJointsAllowed,
			thrusters: ch.thrustersAllowed,
			cannons: ch.cannonsAllowed,
			triggers: ch.triggersAllowed,
			mouseDrag: ch.mouseDragAllowed,
			botControl: ch.botControlAllowed,
			fixate: ch.fixateAllowed,
			nonColliding: ch.nonCollidingAllowed,
			showConditions: ch.showConditions,
			collisionGroups: ch.collisionGroupsAllowed,
			subCollisions: ch.subCollisionsAllowed,
			minDensity: limitToNull(ch.minDensity),
			maxDensity: limitToNull(ch.maxDensity),
			minFriction: limitToNull(ch.minFriction),
			maxFriction: limitToNull(ch.maxFriction),
			minRestitution: limitToNull(ch.minRestitution),
			maxRestitution: limitToNull(ch.maxRestitution),
			maxRJStrength: limitToNull(ch.maxRJStrength),
			maxRJSpeed: limitToNull(ch.maxRJSpeed),
			maxSJStrength: limitToNull(ch.maxSJStrength),
			maxSJSpeed: limitToNull(ch.maxSJSpeed),
			maxThrusterStrength: limitToNull(ch.maxThrusterStrength),
		},
		buildAreas: ch.buildAreas.map((a: b2AABB) => ({
			minX: a.lowerBound.x,
			minY: a.lowerBound.y,
			maxX: a.upperBound.x,
			maxY: a.upperBound.y,
		})),
		partsFit: session.partsFit,
		outcome: session.outcome,
		score: session.score,
		builtIn: session.builtIn,
	};
}

// --- Per-frame evaluation + resolution (ControllerChallenge.ts:20-252) ---

/**
 * Evaluate every win + loss condition against the live parts + cannonballs for
 * one frame. Faithful mirror of ControllerChallenge.Update (:23-30): each
 * condition's own `Condition.Update` recomputes `isSatisfied` from world AABBs
 * (Condition.ts:28-252). Call this each sim frame while running.
 */
export function updateConditions(session: ChallengeSession, parts: Part[], cannonballs: unknown[]): void {
	const ch = session.challenge;
	for (const c of ch.winConditions) (c as Condition).Update(parts, cannonballs as never);
	for (const c of ch.lossConditions) (c as Condition).Update(parts, cannonballs as never);
}

/**
 * Feed a Box2D contact point to every condition's ContactAdded so obj-5
 * ("touching") / obj-6 ("touched") conditions can latch. Mirrors
 * ControllerChallenge.ContactAdded (:207-214).
 */
export function conditionsContactAdded(session: ChallengeSession, point: unknown, parts: Part[], cannonballs: unknown[]): void {
	const ch = session.challenge;
	for (const c of ch.winConditions) (c as Condition).ContactAdded(point as never, parts, cannonballs as never);
	for (const c of ch.lossConditions) (c as Condition).ContactAdded(point as never, parts, cannonballs as never);
}

/**
 * WonChallenge (ControllerChallenge.ts:220-236): false if no win conditions;
 * false if ANY loss condition is satisfied (loss overrides win); then require
 * ALL win conditions (winConditionsAnded) or ANY win condition.
 */
export function wonChallenge(session: ChallengeSession): boolean {
	const ch = session.challenge;
	if (ch.winConditions.length === 0) return false;
	for (const l of ch.lossConditions) if ((l as Condition).isSatisfied) return false;
	if (ch.winConditionsAnded) {
		for (const w of ch.winConditions) if (!(w as Condition).isSatisfied) return false;
		return true;
	}
	for (const w of ch.winConditions) if ((w as Condition).isSatisfied) return true;
	return false;
}

/**
 * LostChallenge (ControllerChallenge.ts:238-248): true iff any loss condition
 * is satisfied AND its `immediate` flag is set. Non-immediate losses only block
 * a win, they don't end the run early.
 */
export function lostChallenge(session: ChallengeSession): boolean {
	const ch = session.challenge;
	for (const l of ch.lossConditions) {
		const cond = l as LossCondition;
		if (cond.isSatisfied && cond.immediate) return true;
	}
	return false;
}

/** ChallengeOver (ControllerChallenge.ts:216-218) = won || lost. */
export function challengeOver(session: ChallengeSession): boolean {
	return wonChallenge(session) || lostChallenge(session);
}

/** GetScore (ControllerChallenge.ts:250-252) = 10000 - frameCounter. */
export function getScore(frameCounter: number): number {
	return 10000 - frameCounter;
}

/** Reset every condition's isSatisfied to false (ControllerChallenge.playButton :52-59). */
export function resetConditions(session: ChallengeSession): void {
	const ch = session.challenge;
	for (const c of ch.winConditions) (c as Condition).isSatisfied = false;
	for (const c of ch.lossConditions) (c as Condition).isSatisfied = false;
}

// --- Build-area fit check (ControllerGame.CheckIfPartsFit :1116-1177) ----

/**
 * True if every EDITABLE part fits entirely inside at least one build area.
 * Faithful port of CheckIfPartsFit (:1116-1177): circle center±radius, or
 * vertex extents for rect/tri/cannon, must satisfy
 * `minX>=lower.x && minY>=lower.y && maxX<upper.x && maxY<upper.y`. Zero areas
 * ⇒ always fits (:1124).
 */
export function checkIfPartsFit(session: ChallengeSession, parts: Part[]): boolean {
	if (!session.playMode) return true; // only checked in play mode (:1123)
	const areas = session.challenge.buildAreas;
	if (areas.length === 0) return true;

	const editable = parts.filter((p) => p instanceof ShapePart && p.isEditable) as ShapePart[];
	for (const part of editable) {
		let minX: number;
		let maxX: number;
		let minY: number;
		let maxY: number;
		if (part instanceof Circle) {
			minX = part.centerX - part.radius;
			maxX = part.centerX + part.radius;
			minY = part.centerY - part.radius;
			maxY = part.centerY + part.radius;
		} else if (part instanceof Rectangle || part instanceof Triangle || part instanceof Cannon || part instanceof Polygon) {
			// Polygon (from createPolygon / subtractShapes) has the same world-space
			// GetVertices() outer ring as rect/tri/cannon; without this branch it fell
			// to the else and kept ±MAX extents, so it "fit" any build area — bypassing
			// the challenge build-area restriction entirely.
			const verts = (part as unknown as { GetVertices(): { x: number; y: number }[] }).GetVertices();
			minX = Number.MAX_VALUE;
			minY = Number.MAX_VALUE;
			maxX = -Number.MAX_VALUE;
			maxY = -Number.MAX_VALUE;
			for (const v of verts) {
				minX = Math.min(minX, v.x);
				maxX = Math.max(maxX, v.x);
				minY = Math.min(minY, v.y);
				maxY = Math.max(maxY, v.y);
			}
		} else {
			minX = Number.MAX_VALUE;
			minY = Number.MAX_VALUE;
			maxX = -Number.MAX_VALUE;
			maxY = -Number.MAX_VALUE;
		}

		let partFits = false;
		for (const area of areas) {
			if (minX >= area.lowerBound.x && minY >= area.lowerBound.y && maxX < area.upperBound.x && maxY < area.upperBound.y) {
				partFits = true;
				break;
			}
		}
		if (!partFits) return false;
	}
	return true;
}

// --- Restriction: part-type permission gate (ControllerChallenge.ts:92-178) ---

export type CreatePartKind = "circle" | "rect" | "triangle" | "fixed" | "revolute" | "prismatic" | "thrusters" | "cannon";

/**
 * Whether creating a part of `kind` is allowed under the challenge restrictions.
 * Only gated in play mode (ControllerChallenge overrides each toolbar button and
 * checks `playChallengeMode && !challenge.xAllowed` :93/:104/…). In edit mode
 * (authoring the challenge) everything is allowed.
 */
export function partTypeAllowed(session: ChallengeSession, kind: CreatePartKind): boolean {
	if (!session.playMode) return true;
	const ch = session.challenge;
	switch (kind) {
		case "circle":
			return ch.circlesAllowed;
		case "rect":
			return ch.rectanglesAllowed;
		case "triangle":
			return ch.trianglesAllowed;
		case "fixed":
			return ch.fixedJointsAllowed;
		case "revolute":
			return ch.rotatingJointsAllowed;
		case "prismatic":
			return ch.slidingJointsAllowed;
		case "thrusters":
			return ch.thrustersAllowed;
		case "cannon":
			return ch.cannonsAllowed;
	}
}

// --- Restriction: density / joint / thruster clamps ---
// The legacy handlers clamp at edit time (ControllerGame.densityText :4086-4108,
// strengthText :4112-4142, speedText :4144-4171, thrustText :4173-4190) against
// ControllerGameGlobals.min/maxDensity etc., which mirror challenge.*.

/** Clamp a density value against the challenge min/max (densityText :4090-4091). */
export function clampDensity(session: ChallengeSession, value: number): number {
	const ch = session.challenge;
	let v = value;
	if (v < ch.minDensity) v = ch.minDensity;
	if (v > ch.maxDensity) v = ch.maxDensity;
	return v;
}

/**
 * Clamp a friction value against the challenge min/max (Jaybit
 * ControllerGame.CheckFriction :626-628 / CheckForChallengeLimits :4233-4240).
 * A ∓MAX_VALUE sentinel on either bound means "no limit" (see isNoLimit): old
 * challenge data (race.dat) carries min = max = +MAX_VALUE, and clamping up to
 * that would blow every friction to 1.8e308. DELIBERATELY diverges from Jaybit,
 * which shipped that exact bug.
 */
export function clampFriction(session: ChallengeSession, value: number): number {
	const ch = session.challenge;
	let v = value;
	if (!isNoLimit(ch.minFriction) && v < ch.minFriction) v = ch.minFriction;
	if (!isNoLimit(ch.maxFriction) && v > ch.maxFriction) v = ch.maxFriction;
	return v;
}

/**
 * Clamp a restitution value against the challenge min/max (Jaybit
 * ControllerGame.CheckRestitution :6148-6150 / CheckForChallengeLimits :4241-4247).
 * Same ∓MAX_VALUE "no limit" handling as clampFriction (beyond-Jaybit fix).
 */
export function clampRestitution(session: ChallengeSession, value: number): number {
	const ch = session.challenge;
	let v = value;
	if (!isNoLimit(ch.minRestitution) && v < ch.minRestitution) v = ch.minRestitution;
	if (!isNoLimit(ch.maxRestitution) && v > ch.maxRestitution) v = ch.maxRestitution;
	return v;
}

/** Clamp a revolute-joint strength/speed against maxRJStrength/maxRJSpeed (:4122/:4154). */
export function clampRJ(session: ChallengeSession, value: number, which: "strength" | "speed"): number {
	const cap = which === "strength" ? session.challenge.maxRJStrength : session.challenge.maxRJSpeed;
	return Math.min(value, cap);
}

/** Clamp a prismatic (sliding) joint strength/speed against maxSJStrength/maxSJSpeed (:4127/:4159). */
export function clampSJ(session: ChallengeSession, value: number, which: "strength" | "speed"): number {
	const cap = which === "strength" ? session.challenge.maxSJStrength : session.challenge.maxSJSpeed;
	return Math.min(value, cap);
}

/** Clamp a thruster strength against maxThrusterStrength (:4179). */
export function clampThruster(session: ChallengeSession, value: number): number {
	return Math.min(value, session.challenge.maxThrusterStrength);
}

// --- Built-in challenges (hardcoded terrain + conditions) ----------------
//
// Faithful port of the two in-code challenges. Each returns the static terrain
// parts to seed into GameState.parts (isStatic + non-editable + drawAnyway=false,
// matching the originals) and mutates the session's challenge with the win
// conditions + restrictions + build area. Race/Spaceship load a packed blob via
// Database.ExtractChallengeFromByteArray — deferred (see the port report).

/** Push a static, non-editable terrain part exactly as the challenges do. */
function terrainPart(p: Part): Part {
	p.isStatic = true;
	p.isEditable = false;
	p.drawAnyway = false;
	return p;
}

/**
 * ControllerClimb (src/Game/Challenges/ControllerClimb.ts:18-205). Win: all user
 * shapes above y=-10.5 (2,1) AND right of x=45 (2,4), anded. Restrictions: no
 * cannons/thrusters/mouse-drag. Build area (1,1)-(15,11.1). Terrain is the start
 * platform, the stair rects, and two boundary circles (the decorative sGround
 * graphics are renderer-only and omitted from the headless part list).
 */
export function buildClimbChallenge(session: ChallengeSession): Part[] {
	session.playMode = true;
	session.playOnly = true;
	const ch = session.challenge;

	let cond = new WinCondition("Cond", 2, 1);
	cond.minY = -10.5;
	cond.maxY = -10.5;
	ch.winConditions.push(cond);
	cond = new WinCondition("Cond", 2, 4);
	cond.minX = 45;
	cond.maxX = 45;
	ch.winConditions.push(cond);
	ch.cannonsAllowed = false;
	ch.thrustersAllowed = false;
	ch.mouseDragAllowed = false;
	ch.winConditionsAnded = true;

	const buildArea = new b2AABB();
	buildArea.lowerBound.Set(1, 1);
	buildArea.upperBound.Set(15, 11.1);
	ch.buildAreas.push(buildArea);

	const parts: Part[] = [];
	// Start platform (:45-49).
	parts.push(terrainPart(new Rectangle(1, 11, 49.4, 1, false)));
	// Stairs (:135-142): 29 rects.
	for (let i = 0; i < 29; i++) {
		parts.push(terrainPart(new Rectangle(15 + (28 - i), (i + 1) * 0.75 - 11.5, i + 7.1, 0.75, false)));
	}
	// Boundary circles (:148-157).
	parts.push(terrainPart(new Circle(1, 15.02, 4.02, false)));
	parts.push(terrainPart(new Circle(50.3, -6.8, 4, false)));
	return parts;
}

/**
 * ControllerMonkeyBars (src/Game/Challenges/ControllerMonkeyBars.ts:20-582).
 * Win: all user shapes above y=11 (2,1) AND right of x=44 (2,4), anded.
 * Restrictions: no cannons/thrusters/mouse-drag. Build area (1,1)-(15,11.1).
 * Terrain: the two platforms, nine monkey-bar pegs, the shape circles, and the
 * two triangle-strip cave walls plus the right wall rect (:47-344). Decorative
 * sGround graphics are renderer-only and omitted.
 */
export function buildMonkeyBarsChallenge(session: ChallengeSession): Part[] {
	session.playMode = true;
	session.playOnly = true;
	const ch = session.challenge;

	let cond = new WinCondition("Cond", 2, 1);
	cond.minY = 11;
	cond.maxY = 11;
	ch.winConditions.push(cond);
	cond = new WinCondition("Cond", 2, 4);
	cond.minX = 44;
	cond.maxX = 44;
	ch.winConditions.push(cond);
	ch.cannonsAllowed = false;
	ch.thrustersAllowed = false;
	ch.mouseDragAllowed = false;
	ch.winConditionsAnded = true;

	const buildArea = new b2AABB();
	buildArea.lowerBound.Set(1, 1);
	buildArea.upperBound.Set(15, 11.1);
	ch.buildAreas.push(buildArea);

	const parts: Part[] = [];
	// Two platforms (:47-56).
	parts.push(terrainPart(new Rectangle(1, 11, 14.02, 1, false)));
	parts.push(terrainPart(new Rectangle(40.65, 11, 20, 1, false)));
	// Nine monkey-bar pegs (:57-63).
	for (let i = 0; i < 9; i++) {
		parts.push(terrainPart(new Circle(15.52 + i * 2.955, 5.27, 0.15, false)));
	}
	// Shape circles at the platform ends (:64-88).
	parts.push(terrainPart(new Circle(15.65, 12.47, 1.35, false)));
	parts.push(terrainPart(new Circle(13.95, 13.54, 1.8, false)));
	parts.push(terrainPart(new Circle(11.6, 15.5, 2.85, false)));
	parts.push(terrainPart(new Circle(40.11, 12.27, 1.35, false)));
	parts.push(terrainPart(new Circle(43, 14.75, 2.85, false)));
	// Left cave-wall triangle strip (:89-279).
	const leftTris: [number, number, number, number, number, number][] = [
		[1.51, 11.5, -0.51, 10.15, -5, 10],
		[-0.51, 10.15, -1.54, 8.36, -5, 10],
		[-1.54, 8.36, -1.51, 6.08, -5, 10],
		[-1.51, 6.08, -3.16, 4.18, -5, 10],
		[-3.16, 4.18, -2.06, 1.55, -5, -2],
		[-2.06, 1.55, -0.25, 0.91, -5, -2],
		[-0.25, 0.91, 1.02, -0.26, -5, -2],
		[1.02, -0.26, 1.39, -2.05, -5, -2],
		[1.39, -2.05, 3.63, -2.58, 5, -5],
		[3.63, -2.58, 4.56, -2.15, 5, -5],
		[4.56, -2.15, 4.87, -1.35, 5, -5],
		[4.87, -1.35, 5.3, -1.08, 5, -5],
		[5.3, -1.08, 5.69, -1.45, 5, -5],
		[5.69, -1.45, 5.88, -2.19, 5, -5],
		[5.88, -2.19, 6.41, -2.83, 5, -5],
		[6.41, -2.83, 7.62, -2.52, 10, -5],
		[7.62, -2.52, 8.32, -1.53, 10, -5],
		[8.32, -1.53, 8.76, 0, 10, -5],
		[8.76, 0, 9.19, -0.32, 10, -5],
		[9.19, -0.32, 9.56, -1.68, 10, -5],
		[9.56, -1.68, 10.54, -2.17, 14, -5],
		[10.54, -2.17, 11.9, -1.41, 14, -5],
		[11.9, -1.41, 12.36, -0.26, 14, -5],
		[12.36, -0.26, 13.75, 0.57, 14, -5],
		[13.75, 0.57, 14.78, 1.6, 14, -5],
		[14.78, 1.6, 14.68, 2.61, 14, -5],
		[14.68, 2.61, 15.4, 3.72, 14, -5],
		[15.4, 3.72, 15.98, 3.78, 14, -5],
		[15.98, 3.78, 16.37, 3.18, 14, -5],
		[16.37, 3.18, 16.84, 2.07, 14, -5],
		[16.84, 2.07, 17.02, -0.07, 14, -5],
		[17.02, -0.07, 16.65, -1.88, 14, -5],
		[16.65, -1.88, 17.13, -4.02, 14, -5],
		[17.13, -4.02, 17.7, -5.09, 14, -5],
		[17.7, -5.09, 17.58, -6.9, 14, -5],
		[17.58, -6.9, 16.65, -7.9, 14, -5],
		[16.65, -7.9, 16, -9.65, 14, -5],
		[16, -9.65, 14.1, -10.95, 14, -5],
	];
	// Right cave-wall triangle strip (:280-339).
	const rightTris: [number, number, number, number, number, number][] = [
		[45.5, 1.95, 44.57, 1.43, 42, -5],
		[44.57, 1.43, 43.81, 0.2, 42, -5],
		[43.81, 0.2, 43.19, 0.57, 42, -5],
		[43.19, 0.57, 42.1, 0.18, 42, -5],
		[42.1, 0.18, 41.4, -1.53, 42, -5],
		[41.4, -1.53, 40.74, -2.21, 42, -5],
		[40.74, -2.21, 40.31, -5.11, 42, -5],
		[40.31, -5.11, 41.28, -6.61, 42, -5],
		[41.28, -6.61, 40.91, -7.91, 44, -10],
		[40.91, -7.91, 40.24, -8.75, 44, -10],
		[40.24, -8.75, 40.94, -10.15, 44, -10],
		[40.94, -10.15, 41.14, -11.15, 44, -10],
	];
	for (const t of leftTris) parts.push(terrainPart(new Triangle(t[0], t[1], t[2], t[3], t[4], t[5])));
	for (const t of rightTris) parts.push(terrainPart(new Triangle(t[0], t[1], t[2], t[3], t[4], t[5])));
	// Right boundary wall (:340-344).
	parts.push(terrainPart(new Rectangle(41.14, -31, 1, 20, false)));
	return parts;
}

export type BuiltInChallenge = "climb" | "monkeyBars";

/**
 * Build a named built-in challenge: returns the terrain parts + mutates the
 * session (conditions/restrictions/build area). Camera offsets are applied by
 * the caller (Climb -150 y / MonkeyBars -190 y — omitted here since the headless
 * core does not own the camera pan the renderer uses).
 */
export function buildBuiltInChallenge(name: BuiltInChallenge, session: ChallengeSession): Part[] {
	session.builtIn = name;
	return name === "climb" ? buildClimbChallenge(session) : buildMonkeyBarsChallenge(session);
}
