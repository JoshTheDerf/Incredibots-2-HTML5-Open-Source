// Core⇄view contract — STATE
//
// The single source of truth the core owns. The renderer reads a snapshot of
// this each frame to draw; the Vue + Nuxt UI mirrors the view-relevant slices
// into a Pinia store (reactively) to render chrome. Nothing outside the core
// mutates it — all changes go through Command dispatch. See docs/CONTRACT.md.

import type { b2World } from "../Box2D";
import type { Part } from "../Parts/Part";
import type { ChallengeState } from "./challenge";
import type { WaterState, WaterSurfaceState } from "./waterSystem";
import { buildTerrainParts, createDefaultSandboxState } from "./sandboxEnvironment";

export type SimPhase = "editing" | "running" | "paused";

/**
 * In-progress challenge-condition picking draft (faithful port of the legacy
 * ConditionsWindow stage-picking flow, src/Gui/ConditionsWindow.ts +
 * ControllerGame GetBox/HLine/VLine/ShapeForConditions :1088-1114). While the
 * author is drawing a condition's box/line region or clicking its subject/object
 * shape on the stage, this holds the drafted condition and what pick is awaited.
 * null when not picking. Plain-serializable (no Pixi / no class instances).
 *
 * `awaiting` is the next required pick:
 *   "box"   — DRAWING_BOX (obj-0): two clicks give opposite corners.
 *   "hline" — DRAWING_HORIZONTAL_LINE (obj-1/2): two clicks give the line span.
 *   "vline" — DRAWING_VERTICAL_LINE (obj-3/4): two clicks give the line span.
 *   "shape1"— SELECTING_SHAPE for subject-0: click the specific subject shape.
 *   "shape2"— SELECTING_SHAPE for obj-5/6: click the "other" shape.
 * `firstClick` holds the first of the two box/line clicks (physics/world units),
 * null until the first click lands; the renderer draws a live preview from it to
 * the cursor.
 */
export interface ConditionDraft {
	kind: "win" | "loss";
	name: string;
	subject: number;
	object: number;
	/** loss conditions only. */
	immediate: boolean;
	shape1Id: number | null;
	shape2Id: number | null;
	awaiting: "box" | "hline" | "vline" | "shape1" | "shape2" | null;
	/** First recorded corner for a box/line gesture (world units); null until set. */
	firstClick: { x: number; y: number } | null;
}

/**
 * A plain-data projection of a single Part for the view layer to read. Carries
 * no class instances or Pixi types so it can cross a worker boundary. `kind` is
 * the Part's `type` string (e.g. "Circle", "Rectangle", "Triangle", "TextPart").
 * Colour channels (red/green/blue) are 0-255; opacity is 0-1.
 */
export type PartSnapshot = {
	id: number;
	kind: string;
	x: number;
	y: number;
	red: number;
	green: number;
	blue: number;
	opacity: number;
	radius?: number;
	w?: number;
	h?: number;
	angle?: number;
	text?: string;
	size?: number;

	// --- per-property edit fields (read back from the live Part) ---
	// Shape (ShapePart: Circle/Rectangle/Triangle/Cannon)
	density?: number;
	/** Jaybit adjustable material, 1..30 UI scale like density. */
	friction?: number;
	restitution?: number;
	collide?: boolean;
	/** Jaybit collision layers A-D + self-collision (ShapePart AND PrismaticJoint). */
	collA?: boolean;
	collB?: boolean;
	collC?: boolean;
	collD?: boolean;
	subColl?: boolean;
	cameraFocus?: boolean;
	/** "Fixate": maps to Part.isStatic. */
	fixate?: boolean;
	outline?: boolean;
	/** "Outlines Behind": maps to ShapePart.terrain. */
	outlineBehind?: boolean;
	undragable?: boolean;

	// Joint (RevoluteJoint / PrismaticJoint)
	/** enableMotor (revolute) / enablePiston (prismatic). */
	motorOn?: boolean;
	/** motorStrength / pistonStrength. */
	strength?: number;
	/** motorSpeed / pistonSpeed. */
	speed?: number;
	/** RevoluteJoint limits in DEGREES; null == "None" (∓Number.MAX_VALUE). */
	lowerLimit?: number | null;
	upperLimit?: number | null;
	/** Control key codes: cw/ccw for revolute, up/down for prismatic. */
	keyCW?: number;
	keyCCW?: number;
	keyUp?: number;
	keyDown?: number;
	/** Auto-on flags: autoCW/autoCCW (revolute), autoOscillate (prismatic). */
	autoCW?: boolean;
	autoCCW?: boolean;
	autoOscillate?: boolean;
	/** isStiff — the UI shows the inverse ("Floppy Joint" = !isStiff). */
	stiff?: boolean;
	/** PrismaticJoint.initLength. */
	initialLength?: number;

	// Thruster
	/** Thrusters.thrustKey code. */
	thrustKey?: number;
	/** Thrusters.autoOn / Cannon has none. */
	autoOn?: boolean;

	// Cannon
	/** Cannon.fireKey code. */
	fireKey?: number;

	// Bomb (IB3 port — src/Parts/Bomb.ts; `strength` above carries bomb strength).
	/** Blast reach in world units (0..50). */
	blastRadius?: number;
	/** Arm-to-explode delay in ms (Bomb.delay; named bombDelay to avoid clashing). */
	bombDelay?: number;
	delayAfterTrigger?: boolean;
	explodeOnImpact?: boolean;
	delayAfterImpact?: boolean;
	repeatable?: boolean;
	/** Max re-explosions when repeatable (0 == unlimited). */
	repeat?: number;
	sensitive?: boolean;
	/** Jolt sensitivity 0..100. */
	sensitivity?: number;
	deflect?: boolean;

	// Text
	displayKey?: number;
	alwaysVisible?: boolean;
	scaleWithZoom?: boolean;

	// --- Triggers (Jaybit AdvancedPropertiesWindow read-model) ---
	// Trigger SOURCE fields (ShapePart: Circle/Rectangle/Triangle/Cannon) — two
	// symmetric slots, each a comma-separated name CSV + a TRIGGER_* action
	// (0-6, TRIGGER_NONE) + "same name hit" / "on ground hit" flags. Exposed so the
	// group-edit UI can read them uniformly (compute the [varies] sentinel across a
	// selection) instead of reaching into live Part instances.
	triggerName?: string;
	triggerName_2?: string;
	triggerAction?: number;
	triggerAction_2?: number;
	onSameName?: boolean;
	onSameName_2?: boolean;
	onGroundHit?: boolean;
	onGroundHit_2?: boolean;
	/** Trigger TARGET listen list (joints / thrusters / cannons / text): the
	 *  comma-separated names this part responds to. */
	triggerList?: string;
};

export interface CameraState {
	/** world→screen scale (physics scale). */
	scale: number;
	/** pan offset in screen pixels. */
	offsetX: number;
	offsetY: number;
}

export interface SimState {
	phase: SimPhase;
	/** simulation frames elapsed since play. */
	frame: number;
}

/**
 * Sandbox environment configuration — a faithful port of the legacy
 * `SandboxSettings` value object (src/Game/SandboxSettings.ts) plus the derived
 * world bounds that ControllerSandbox.GetMinX/MaxX/MinY/MaxY compute
 * (ControllerSandbox.ts:680-714). The core reads this to build the static
 * terrain bodies (see src/core/sandboxEnvironment.ts) and to pick the world
 * gravity vector at play time (`b2Vec2(0, gravity)`, ControllerSandbox.ts:716).
 * The renderer reads it to pick the sky gradient (background/RGB) and terrain
 * colours (terrainTheme). These are the SandboxSettings.* enum axes:
 *   size:        SIZE_SMALL=0, SIZE_MEDIUM=1, SIZE_LARGE=2
 *   terrainType: TERRAIN_LAND=0, TERRAIN_BOX=1, TERRAIN_EMPTY=2
 *   terrainTheme: GRASS=0, DIRT=1, SAND=2, ROCK=3, SNOW=4, MOON=5, MARS=6
 *   background:  SKY=0, SPACE=1, NIGHT=2, DUSK=3, MARS=4, SUNSET=5, SOLID_COLOUR=6
 */
export interface SandboxState {
	/** downward gravity magnitude; used as b2Vec2(0, gravity). Default 15. */
	gravity: number;
	/** world size enum (0 small / 1 medium / 2 large). */
	size: number;
	/** terrain geometry (0 land / 1 box / 2 empty). */
	terrainType: number;
	/** terrain colour theme (0-6). Cosmetic; consumed by the renderer only. */
	terrainTheme: number;
	/** sky background (0-6). Cosmetic; consumed by the renderer only. */
	background: number;
	/** 0-255 solid-colour channels, used only when background == SOLID_COLOUR (6). */
	backgroundR: number;
	backgroundG: number;
	backgroundB: number;
	/** Derived camera-clamp / cloud-spawn extent (ControllerSandbox.ts:680-714). */
	bounds: { minX: number; maxX: number; minY: number; maxY: number };
	/**
	 * IB3 water settings (Control/WaterControl.as / SandboxSettings water
	 * fields — see src/core/waterSystem.ts). enabled defaults false; when on,
	 * play builds a WaterSystem (buoyancy + tide/wave controllers) from this.
	 */
	water: WaterState;
}

/**
 * Replay read-model (docs/PORT-SPEC-tutorials-replays.md §B.7). Recording is
 * live during a normal (non-replay) sim; playback drives bodies from sync points
 * with the world FROZEN (not stepped). See src/core/replay.ts for the mechanics.
 */
export interface ReplayState {
	/** capturing the three streams this sim (true while a normal sim runs). */
	recording: boolean;
	/** playing a decoded replay back (playingReplay). */
	playing: boolean;
	/** logical frame counter (== ControllerGame.frameCounter). */
	frame: number;
	/** playback bound (numFrames of the active replay); null when not playing. */
	numFrames: number | null;
	/** recording still saveable (frame<9000 && cannonballs<=500). */
	canSave: boolean;
	/** true once a playback has reached numFrames (drives PostReplayPanel). */
	finished: boolean;
}

/**
 * Tutorial read-model (docs/PORT-SPEC-tutorials-replays.md §A.5). The active
 * message dialog + the level-done grid. The per-tutorial state machine lives in
 * src/core/tutorials.ts; this is just what the view needs to render.
 */
export interface TutorialState {
	active: boolean;
	/** 0-13 level index (see the level-select mapping); -1 when inactive. */
	levelIndex: number;
	/** index into the TUTORIAL_MESSAGES table; null when no dialog is showing. */
	currentMessageId: number | null;
	/** the resolved current message + its window layout; null when none. */
	currentMessage: {
		text: string;
		hasMore: boolean;
		x: number;
		y: number;
		height: number;
	} | null;
	/** mirrors LSOManager.IsLevelDone(0..13). */
	levelsDone: boolean[];
	/**
	 * Latches true when the active tutorial's win condition is met (the "won"
	 * event fired this session). Drives the App shell's congratulations popup +
	 * return-to-menu flow (legacy ControllerGame.Update -> ScoreWindow on
	 * ChallengeOver for ControllerTutorial, ControllerGame.as:2337-2360). Reset to
	 * false when a new tutorial is loaded.
	 */
	won: boolean;
}

export interface EditState {
	/** ids of currently-selected parts (indexes into GameState.parts by Part id). */
	selection: number[];
	/** the active editing tool. */
	tool: string;
	/** whether the current robot is editable (challenges can lock it). */
	editable: boolean;
	/** depth of the undo / redo stacks, for enabling toolbar buttons. */
	canUndo: boolean;
	canRedo: boolean;
	/** plain-data projection of the FIRST selected part; null when none selected. */
	selectedPart: PartSnapshot | null;
	// --- View-menu display flags (ControllerGameGlobals.show* / snapToCenter,
	// defaults from ControllerGameGlobals.ts:112-116, all true). The renderer reads
	// showJoints/showColours/showOutlines each frame; snapToCenter gates the
	// camera-follow snap.
	/** draw joint markers (ControllerGameGlobals.showJoints). */
	showJoints: boolean;
	/** fill shapes with colour vs. outline-only (ControllerGameGlobals.showColours). */
	showColours: boolean;
	/** draw part outlines (ControllerGameGlobals.showOutlines). */
	showOutlines: boolean;
	/** snap the camera to the focused part (ControllerGameGlobals.snapToCenter). */
	snapToCenter: boolean;
}

/**
 * The authoritative game state.
 *
 * NOTE (migration): `parts` currently holds live domain-object instances
 * (the existing Part subclasses, which own their Box2D bodies). The target is
 * plain-serializable part data with the Box2D bodies held in a parallel
 * simulation map; that conversion happens incrementally. The contract shape
 * above (sim / camera / edit slices) is stable regardless.
 */
export interface GameState {
	parts: Part[];
	sim: SimState;
	camera: CameraState;
	edit: EditState;
	/**
	 * Sandbox environment config (gravity, size, terrain, background). The
	 * `isSandbox` terrain bodies in `parts` are derived from this; changing it via
	 * the setSandboxSettings command rebuilds them (editing phase only).
	 */
	sandbox: SandboxState;
	/**
	 * The live Box2D world while a simulation is running/paused; null while
	 * editing. Like `parts`, this is a live object (not plain-serializable) held
	 * here so the renderer can read body transforms via Draw.DrawWorld. When the
	 * core is moved behind a worker boundary this becomes a sim-side handle.
	 */
	world: b2World | null;
	/**
	 * Plain-data challenge read-model — win/loss conditions, restrictions, build
	 * areas, live outcome + score. null for a plain sandbox session (no challenge
	 * active). Derived from the core's live Challenge each notify; the renderer
	 * reads it to draw condition zones + build areas and the Vue panels read it
	 * for the editors. See src/core/challenge.ts.
	 */
	challenge: ChallengeState | null;
	/**
	 * Replay recording / playback read-model. Always present; `recording` and
	 * `playing` are false in a plain editing session. See src/core/replay.ts.
	 */
	replay: ReplayState;
	/**
	 * Active tutorial read-model, or null for a non-tutorial session. See
	 * src/core/tutorials.ts.
	 */
	tutorial: TutorialState | null;
	/**
	 * In-progress challenge-condition stage-picking draft, or null when not
	 * picking. Set by startConditionPick, advanced by the pointer picks, cleared
	 * on finalize / cancel. The Vue ConditionsPanel reads it to hide itself + show
	 * the "Draw a box / Click a shape" hint; GameCanvas reads `awaiting` to gate
	 * the picking gesture. See ConditionsWindow.FinishDrawingCondition /
	 * FinishSelectingForCondition (:270-336).
	 */
	conditionDraft: ConditionDraft | null;
	/**
	 * In-progress joint/thruster creation gesture read-model, or null when idle.
	 * `phase` distinguishes the PRISMATIC two-click first-click wait (the UI draws
	 * the axis preview line + a second click finalizes) from a >2-overlap
	 * DISAMBIGUATION cycle (the UI cycles the pick on click, finalizes on drag).
	 * A faithful projection of GameCore's private pendingPrismatic / pendingJoint
	 * (ControllerGame MaybeStart/FinishCreatingPrismaticJoint + FINALIZING_JOINT).
	 * The highlighted candidates themselves carry highlightForJoint (drawn by Draw).
	 */
	jointGesture: {
		phase: "prismaticAxis" | "disambiguate";
		/** prismaticAxis only: the world-space axis-START point (for the UI preview line). */
		axisStart?: { x: number; y: number };
	} | null;
	/**
	 * Live water-surface read-model (offset/normal.x/waves), refreshed each
	 * step by the core's WaterSystem — the renderer draws the animated surface
	 * from it (waterRenderer.ts). null while editing or when water is disabled;
	 * the renderer falls back to a static surface at sandbox.water.height then
	 * (WaterControl.GetGPath's non-initted branch).
	 */
	water: WaterSurfaceState | null;
}

export function createInitialState(): GameState {
	// Seed the canonical sandbox default (SMALL/LAND/GRASS/SKY, gravity 15 —
	// createController.ts:37) and build its static terrain bodies up front so the
	// editor shows ground immediately. Ground parts carry no stable id here; the
	// GameCore assigns ids to the initial parts on construction.
	const sandbox = createDefaultSandboxState();
	return {
		parts: buildTerrainParts(sandbox),
		sim: { phase: "editing", frame: 0 },
		// Offset the view down a little (in world +Y is down) so the sandbox ground
		// surface (SMALL LAND top at y~12) sits in the lower portion of the canvas
		// rather than off the bottom edge — the editor opens looking at the build
		// area above the ground. offsetY is in screen px (screen = canvas/2 +
		// world*scale - offset), so a positive offset pans the view downward.
		camera: { scale: 30, offsetX: 0, offsetY: 250 },
		edit: {
			selection: [],
			tool: "select",
			editable: true,
			canUndo: false,
			canRedo: false,
			selectedPart: null,
			// View-menu display flags default on (ControllerGameGlobals.ts:112-116).
			showJoints: true,
			showColours: true,
			showOutlines: true,
			snapToCenter: true,
		},
		sandbox,
		world: null,
		challenge: null,
		replay: { recording: false, playing: false, frame: 0, numFrames: null, canSave: true, finished: false },
		tutorial: null,
		conditionDraft: null,
		jointGesture: null,
		water: null,
	};
}
