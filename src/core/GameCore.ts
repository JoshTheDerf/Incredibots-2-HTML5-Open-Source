// Core⇄view contract — the GameCore store
//
// Headless, Pixi-free, DOM-free. Owns the authoritative GameState, applies
// Commands, and notifies subscribers on change. This is the seam the renderer
// and the Vue + Nuxt UI both bind to. See docs/CONTRACT.md.
//
// STATUS: skeleton. The state shape (GameState) and the command surface
// (Command) are the stable contract. The per-command handlers are being
// migrated out of the monolithic ControllerGame incrementally; until a handler
// is migrated it throws so nothing silently no-ops.

import { b2AABB, b2Vec2, b2World } from "../Box2D";
import { ContactFilter } from "../Game/ContactFilter";
import { Util } from "../General/Util";
import { Cannon } from "../Parts/Cannon";
import { Circle } from "../Parts/Circle";
import { FixedJoint } from "../Parts/FixedJoint";
import { JointPart } from "../Parts/JointPart";
import type { Part } from "../Parts/Part";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { MAX_DENSITY, MIN_DENSITY } from "../Parts/partDefaults";
import { Rectangle } from "../Parts/Rectangle";
import { RevoluteJoint } from "../Parts/RevoluteJoint";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import { Triangle } from "../Parts/Triangle";
import type { Command, ShapeKind } from "./Command";
import { GameState, PartSnapshot, createInitialState } from "./GameState";
import { decodeRobot, encodeRobot } from "./robotSerialization";
import { buildTerrainParts, computeBounds } from "./sandboxEnvironment";
import {
	ChallengeSession,
	CreatePartKind,
	NO_LIMIT_MAX,
	NO_LIMIT_MIN,
	buildBuiltInChallenge,
	challengeOver,
	checkIfPartsFit,
	clampDensity,
	clampRJ,
	clampSJ,
	clampThruster,
	conditionsContactAdded,
	createChallengeSession,
	getScore,
	partTypeAllowed,
	resetConditions,
	toChallengeState,
	updateConditions,
	wonChallenge,
} from "./challenge";
import { WinCondition } from "../Game/WinCondition";
import { LossCondition } from "../Game/LossCondition";
import { b2ContactListener } from "../Box2D";

// --- Physics simulation constants, mirrored from the legacy ControllerGame ---
//
// CreateWorld (ControllerGame.ts:6628) builds a b2World spanning
// (-300,-200)..(300,200) with gravity from GetGravity() (ControllerGame.ts:6643,
// returns b2Vec2(0, 15) — i.e. downward, +Y is down in world space) and
// doSleep=true. The Update() step loop (ControllerGame.ts:584-585) advances the
// world twice per frame: Step(1/60, 5) then Step(1/60, m_iterations) where
// m_iterations=10 (ControllerGame.ts:88).
const WORLD_AABB_LOWER = { x: -300.0, y: -200.0 };
const WORLD_AABB_UPPER = { x: 300.0, y: 200.0 };
const GRAVITY = { x: 0.0, y: 15.0 };
const STEP_DT = 1 / 60;
const STEP_ITERATIONS_WARMUP = 5;
const STEP_ITERATIONS = 10;

/** Snapshot of a Part's pre-play edit transform, restored on reset. */
interface EditTransform {
	part: Part;
	x: number;
	y: number;
	angle: number;
}

/**
 * A point-in-time snapshot of the editable state for the undo/redo stacks:
 * a deep-cloned `parts` graph plus the edit-selection fields. The world/sim are
 * intentionally excluded — history only spans the editing phase.
 */
interface HistorySnapshot {
	parts: Part[];
	selection: number[];
	tool: string;
}

/** Max number of undo steps retained (older snapshots are dropped). */
const HISTORY_CAP = 100;

// Default sizes for shapes the headless create commands still place from a
// single point (text, cannon, prismatic-joint span). Circle/Rectangle/Triangle
// now derive their dimensions from the click-drag gesture (see
// buildDraggedShape), matching ControllerGame's NEW_CIRCLE/NEW_RECT/NEW_TRIANGLE
// flows; these defaults remain for the point-placed parts only.
const DEFAULT_RECT_SIZE = 2.0;
const DEFAULT_TEXT_W = 4.0;
const DEFAULT_TEXT_H = 2.0;

// Strength/speed sliders (joints, thrusters, cannon) share a 1..30 range, driven
// by MAX_RJ_STRENGTH / MAX_SJ_STRENGTH / MAX_THRUSTER_STRENGTH — all 30 (see
// partDefaults). Kept as a single constant since they're identical.
const MAX_JOINT_VALUE = 30;

export type Unsubscribe = () => void;
export type StateListener = (state: Readonly<GameState>) => void;

export class GameCore {
	private state: GameState;
	private listeners = new Set<StateListener>();
	/** batching depth so a compound command notifies subscribers once. */
	private notifyDepth = 0;
	private dirty = false;
	/** monotonic source of stable Part ids. */
	private nextId = 0;
	/** Per-part pre-play edit transforms, captured on play, restored on reset. */
	private editSnapshots: EditTransform[] = [];
	/** Undo / redo stacks of editable-state snapshots (see HistorySnapshot). */
	private undoStack: HistorySnapshot[] = [];
	private redoStack: HistorySnapshot[] = [];
	/**
	 * The live challenge session (ControllerChallenge's role): the domain
	 * Challenge object + play/edit orchestration. null for a plain sandbox
	 * session. The plain-data projection is mirrored into state.challenge.
	 */
	private challenge: ChallengeSession | null = null;
	/**
	 * Live cannonballs the running world spawns — fed to condition evaluation
	 * (subject 4 / obj 5-6). Empty in the headless core (no cannon firing / key
	 * handling), so shape-based conditions are exact; cannonball conditions are
	 * a documented follow-up.
	 */
	private cannonballs: unknown[] = [];

	constructor(initial: GameState = createInitialState()) {
		this.state = initial;
		// Any parts seeded into the initial state (e.g. the sandbox terrain bodies
		// built by createInitialState) need stable ids from our monotonic source so
		// later create commands don't collide with them.
		for (const p of this.state.parts) {
			if (p.id == null || p.id === 0) p.id = ++this.nextId;
		}
	}

	/** Read-only snapshot for the renderer / views. */
	getState(): Readonly<GameState> {
		return this.state;
	}

	/**
	 * The live legacy `Challenge` domain object (with its WinCondition/
	 * LossCondition instances and b2AABB build areas), or null for a plain
	 * sandbox session. The renderer feeds this straight into Draw.DrawWorld's
	 * `challenge` param to paint condition zones (Draw.ts:129-164). NOT plain
	 * data — do not send across a worker boundary; use state.challenge for that.
	 */
	getLiveChallenge(): import("../Game/Challenge").Challenge | null {
		return this.challenge ? this.challenge.challenge : null;
	}

	/** Subscribe to state changes. Returns an unsubscribe function. */
	subscribe(listener: StateListener): Unsubscribe {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/** The single entry point for all mutations. */
	dispatch(command: Command): void {
		this.notifyDepth++;
		try {
			this.apply(command);
		} finally {
			this.notifyDepth--;
			if (this.notifyDepth === 0 && this.dirty) {
				this.dirty = false;
				const snapshot = this.state;
				for (const l of this.listeners) l(snapshot);
			}
		}
	}

	/** Handlers call this after mutating `this.state` to schedule a notify. */
	private markChanged(): void {
		this.dirty = true;
	}

	// --- Robot import / export ---------------------------------------------
	//
	// The copy/paste "encoded robot string" feature. Export is a pure read
	// (returns the string; not a mutation, so it's a method, not a Command),
	// while import replaces the parts graph and is undoable. Both use the
	// node-clean robotSerialization module (byte-compatible with the legacy
	// game's Database.ExportRobot / ImportRobot).

	/**
	 * Encode the current parts to a legacy-compatible robot export string.
	 * async because ByteArray.compress() is async. Ignores selection/sim state.
	 */
	async exportRobot(): Promise<string> {
		return encodeRobot(this.state.parts);
	}

	/**
	 * Decode a robot export string and REPLACE the current parts with it: assign
	 * fresh ids, clear selection, and push an undo snapshot so the import is
	 * undoable. No-op during simulation (editing-phase only, like other
	 * mutations). Throws if the string can't be decoded — callers should catch.
	 */
	async importRobot(robotStr: string): Promise<void> {
		if (this.state.sim.phase !== "editing") return;
		const decoded = await decodeRobot(robotStr);
		for (const p of decoded.parts) p.id = ++this.nextId;

		this.notifyDepth++;
		try {
			this.pushHistory();
			// Keep the sandbox terrain bodies (isSandbox) so the imported robot lands
			// on the existing ground; only the robot parts are replaced.
			const terrain = this.state.parts.filter((p) => (p as { isSandbox?: boolean }).isSandbox);
			this.state = {
				...this.state,
				parts: [...terrain, ...decoded.parts],
				edit: {
					...this.state.edit,
					selection: [],
					selectedPart: null,
					...this.undoRedoFlags(),
				},
			};
			this.markChanged();
		} finally {
			this.notifyDepth--;
			if (this.notifyDepth === 0 && this.dirty) {
				this.dirty = false;
				const snapshot = this.state;
				for (const l of this.listeners) l(snapshot);
			}
		}
	}

	/** Look up a live Part by its stable id. */
	private findPart(id: number): Part | undefined {
		return this.state.parts.find((p) => p.id === id);
	}

	// --- Challenge orchestration -------------------------------------------

	/**
	 * Recompute the CheckIfPartsFit gate (challenge play mode only) and re-project
	 * the live challenge session into state.challenge. Called after any command
	 * that touches conditions/restrictions/build areas/parts while a challenge is
	 * active. No-op (leaves state.challenge null) when there is no session.
	 */
	private syncChallenge(): void {
		if (!this.challenge) {
			if (this.state.challenge !== null) {
				this.state = { ...this.state, challenge: null };
				this.markChanged();
			}
			return;
		}
		this.challenge.partsFit = checkIfPartsFit(this.challenge, this.state.parts);
		this.state = { ...this.state, challenge: toChallengeState(this.challenge) };
		this.markChanged();
	}

	/** Resolve a condition's picked ShapeParts by id (for subject-0 / obj-5/6). */
	private applyConditionShapes(
		cond: WinCondition | LossCondition,
		shape1Id: number | null | undefined,
		shape2Id: number | null | undefined,
	): void {
		if (shape1Id != null) {
			const p = this.findPart(shape1Id);
			if (p instanceof ShapePart) cond.shape1 = p;
		}
		if (shape2Id != null) {
			const p = this.findPart(shape2Id);
			if (p instanceof ShapePart) cond.shape2 = p;
		}
	}

	// --- Undo / redo history -----------------------------------------------
	//
	// Snapshot-based history: before any mutating command we deep-clone the
	// editable state (parts graph + selection/tool) onto the undo stack and clear
	// the redo stack. undo/redo swap the current state with the top of the
	// respective stack. This is simpler and more robust than per-command inverse
	// Actions (the legacy src/Actions/* approach), which depend on a static
	// ControllerGame the headless core doesn't have.

	/**
	 * Deep-clone a parts array into independent instances, preserving each
	 * Part's `id` (MakeCopy() mints fresh objects and does NOT copy id, so we
	 * reassign it) and re-linking joints/thrusters to the CLONED parent shapes.
	 * Parent shapes are resolved by id, so shape order is irrelevant.
	 */
	private cloneParts(parts: Part[]): Part[] {
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
	private captureSnapshot(): HistorySnapshot {
		return {
			parts: this.cloneParts(this.state.parts),
			selection: [...this.state.edit.selection],
			tool: this.state.edit.tool,
		};
	}

	/**
	 * Push the current editable state onto the undo stack and clear the redo
	 * stack. Called before applying any mutating command. Also refreshes the
	 * canUndo/canRedo flags (done via the state rebuild in the calling handler).
	 */
	private pushHistory(): void {
		this.undoStack.push(this.captureSnapshot());
		if (this.undoStack.length > HISTORY_CAP) this.undoStack.shift();
		this.redoStack = [];
	}

	/**
	 * Restore a history snapshot's parts/selection into a fresh state object,
	 * dropping any selection ids that no longer exist and recomputing
	 * selectedPart + canUndo/canRedo. Immutable per the existing handlers.
	 */
	private restoreSnapshot(snap: HistorySnapshot): void {
		const live = new Set(snap.parts.map((p) => p.id));
		const selection = snap.selection.filter((id) => live.has(id));
		this.state = {
			...this.state,
			parts: snap.parts,
			edit: {
				...this.state.edit,
				tool: snap.tool,
				selection,
				selectedPart: null,
				canUndo: this.undoStack.length > 0,
				canRedo: this.redoStack.length > 0,
			},
		};
		// deriveSelectedPart reads this.state.parts, so compute after the swap.
		this.state = {
			...this.state,
			edit: { ...this.state.edit, selectedPart: this.deriveSelectedPart(selection) },
		};
		this.markChanged();
	}

	private handleUndo(): void {
		const snap = this.undoStack.pop();
		if (!snap) return;
		this.redoStack.push(this.captureSnapshot());
		this.restoreSnapshot(snap);
	}

	private handleRedo(): void {
		const snap = this.redoStack.pop();
		if (!snap) return;
		this.undoStack.push(this.captureSnapshot());
		this.restoreSnapshot(snap);
	}

	/**
	 * Build a plain-data PartSnapshot from a live Part, branching on `type`.
	 * Colour channels stay 0-255 (as stored on the Part); opacity is converted
	 * from the Part's 0-255 storage to the 0-1 scale the view/commands use.
	 */
	private snapshotOf(part: Part): PartSnapshot {
		const kind = part.type;

		// --- ShapePart family (Circle/Rectangle/Triangle/Cannon) ---
		// The common physical properties come from ShapePart; geometry and the
		// cannon-only strength/fireKey are layered on per concrete type. Fields
		// mirror the src/Actions/* handlers (ShapeCheckboxAction, CameraAction,
		// ChangeSliderAction density, ColourChangeAction).
		if (part instanceof ShapePart) {
			const snap: PartSnapshot = {
				id: part.id,
				kind,
				x: part.centerX,
				y: part.centerY,
				red: part.red,
				green: part.green,
				blue: part.blue,
				opacity: part.opacity / 255,
				angle: part.angle,
				density: part.density,
				collide: part.collide,
				cameraFocus: part.isCameraFocus,
				fixate: part.isStatic, // "Fixate" == Part.isStatic
				outline: part.outline,
				outlineBehind: part.terrain, // "Outlines Behind" == terrain
				undragable: part.undragable,
			};
			if (part instanceof Circle) snap.radius = part.radius;
			if (part instanceof Rectangle) {
				snap.w = part.w;
				snap.h = part.h;
			}
			if (part instanceof Cannon) {
				snap.w = part.w;
				snap.strength = part.strength;
				snap.fireKey = part.fireKey;
			}
			return snap;
		}

		// --- RevoluteJoint ("Rotating Joint") ---
		if (part instanceof RevoluteJoint) {
			return {
				id: part.id,
				kind,
				x: part.anchorX,
				y: part.anchorY,
				red: 0,
				green: 0,
				blue: 0,
				opacity: 1,
				motorOn: part.enableMotor,
				strength: part.motorStrength,
				speed: part.motorSpeed,
				// Limits stored in degrees; the ∓MAX_VALUE sentinel means "None".
				lowerLimit: part.motorLowerLimit === -Number.MAX_VALUE ? null : part.motorLowerLimit,
				upperLimit: part.motorUpperLimit === Number.MAX_VALUE ? null : part.motorUpperLimit,
				keyCW: part.motorCWKey,
				keyCCW: part.motorCCWKey,
				autoCW: part.autoCW,
				autoCCW: part.autoCCW,
				stiff: part.isStiff,
			};
		}

		// --- PrismaticJoint ("Sliding Joint") — carries its own colour/collide/outline ---
		if (part instanceof PrismaticJoint) {
			return {
				id: part.id,
				kind,
				x: part.anchorX,
				y: part.anchorY,
				red: part.red,
				green: part.green,
				blue: part.blue,
				opacity: part.opacity / 255,
				motorOn: part.enablePiston,
				strength: part.pistonStrength,
				speed: part.pistonSpeed,
				keyUp: part.pistonUpKey,
				keyDown: part.pistonDownKey,
				autoOscillate: part.autoOscillate,
				stiff: part.isStiff,
				initialLength: part.initLength,
				collide: part.collide,
				outline: part.outline,
			};
		}

		// --- Thrusters ---
		if (part instanceof Thrusters) {
			return {
				id: part.id,
				kind,
				x: part.centerX,
				y: part.centerY,
				red: 0,
				green: 0,
				blue: 0,
				opacity: 1,
				strength: part.strength,
				thrustKey: part.thrustKey,
				autoOn: part.autoOn,
			};
		}

		// --- TextPart (no opacity field on the part) ---
		if (part instanceof TextPart) {
			return {
				id: part.id,
				kind,
				x: part.x,
				y: part.y,
				red: part.red,
				green: part.green,
				blue: part.blue,
				opacity: 1,
				w: part.w,
				h: part.h,
				text: part.text,
				size: part.size,
				displayKey: part.displayKey,
				alwaysVisible: part.alwaysVisible,
				scaleWithZoom: part.scaleWithZoom,
			};
		}

		return { id: part.id, kind, x: 0, y: 0, red: 0, green: 0, blue: 0, opacity: 1 };
	}

	/** Current move anchor of a Part in world units (center for shapes, x/y for text). */
	private currentXY(part: Part): { x: number; y: number } {
		if (part instanceof ShapePart) return { x: part.centerX, y: part.centerY };
		if (part instanceof TextPart) return { x: part.x, y: part.y };
		return { x: 0, y: 0 };
	}

	/** Derive the selectedPart snapshot from the FIRST selected id (null if none). */
	private deriveSelectedPart(selection: number[]): PartSnapshot | null {
		if (selection.length === 0) return null;
		const first = this.findPart(selection[0]);
		return first ? this.snapshotOf(first) : null;
	}

	/**
	 * Apply `mutate` to every part in `partIds` (a part may skip itself if the
	 * mutation doesn't apply to its type), then publish a new state with a fresh
	 * parts array and a recomputed selectedPart snapshot. Mirrors the legacy
	 * per-property handlers in ControllerGame (each sets the field on the live
	 * Part; see densitySlider/strengthSlider/*Checkbox), minus the undo-stack
	 * bookkeeping that lands with the undo/redo migration.
	 */
	private editParts(partIds: number[], mutate: (p: Part) => void): void {
		const target = new Set(partIds);
		for (const p of this.state.parts) {
			if (target.has(p.id)) mutate(p);
		}
		this.state = {
			...this.state,
			parts: [...this.state.parts],
			edit: { ...this.state.edit, selectedPart: this.deriveSelectedPart(this.state.edit.selection) },
		};
		this.markChanged();
	}

	// --- Rotate / resize geometry ------------------------------------------

	/**
	 * Selection centroid used as the pivot for both rotate and resize. The legacy
	 * ControllerGame rotates about the highest-mass ShapePart's centre
	 * (rotatingPart, :3449-3458) and resizes about selectedParts[0]'s centre
	 * (initDragX/Y, :3985-3996). We use the mean of the parts' anchors, a stable
	 * pivot independent of selection order that coincides with the single part's
	 * own centre in the common one-part case.
	 */
	private selectionCentroid(parts: Part[]): { x: number; y: number } {
		let sx = 0;
		let sy = 0;
		for (const p of parts) {
			const xy = this.currentXY(p);
			sx += xy.x;
			sy += xy.y;
		}
		const n = parts.length || 1;
		return { x: sx / n, y: sy / n };
	}

	/**
	 * Rotate a part about (cx,cy) by `delta` radians, moving its anchor and (for
	 * shapes/thrusters) advancing its own orientation. Incremental form of
	 * ControllerGame's RotateAround path (MouseDrag :1533) — rotation composes
	 * additively, so feeding the per-move delta equals the original's
	 * `newAngle - initAngle`.
	 */
	private rotatePartAbout(p: Part, cx: number, cy: number, delta: number): void {
		const anchor = this.currentXY(p);
		const dx = anchor.x - cx;
		const dy = anchor.y - cy;
		const cos = Math.cos(delta);
		const sin = Math.sin(delta);
		const nx = cx + dx * cos - dy * sin;
		const ny = cy + dx * sin + dy * cos;
		if (p instanceof ShapePart) {
			p.Move(nx, ny);
			p.angle += delta;
		} else if (p instanceof Thrusters) {
			p.centerX = nx;
			p.centerY = ny;
			p.angle += delta;
		} else if (p instanceof JointPart) {
			p.Move(nx, ny);
			if (p instanceof PrismaticJoint) {
				const ax = p.axis.x;
				const ay = p.axis.y;
				p.axis.x = ax * cos - ay * sin;
				p.axis.y = ax * sin + ay * cos;
			}
		}
	}

	/**
	 * Scale a part's geometry and its offset from (cx,cy) by `factor`, clamped to
	 * the part type's legal size range. Incremental multiplicative form of
	 * ControllerGame's RESIZING_SHAPES branch (MouseDrag :1558-1669) — the
	 * original scales from a PrepareForResizing() baseline captured at gesture
	 * start; feeding the per-move ratio composes to the same total scale.
	 */
	private scalePartAbout(p: Part, cx: number, cy: number, factor: number): void {
		if (factor <= 0) return;

		// Clamp so no shape leaves its legal size range (ControllerGame :1570-1614).
		let f = factor;
		if (p instanceof Circle) {
			f = this.clampScale(f, p.radius, Circle.MIN_RADIUS, Circle.MAX_RADIUS);
		} else if (p instanceof Rectangle) {
			f = this.clampScale(f, p.w, Rectangle.MIN_WIDTH, Rectangle.MAX_WIDTH);
			f = this.clampScale(f, p.h, Rectangle.MIN_WIDTH, Rectangle.MAX_WIDTH);
		} else if (p instanceof Cannon) {
			f = this.clampScale(f, p.w, Cannon.MIN_WIDTH, Cannon.MAX_WIDTH);
		} else if (p instanceof Triangle) {
			const l1 = Util.GetDist(p.x1, p.y1, p.x2, p.y2);
			const l2 = Util.GetDist(p.x1, p.y1, p.x3, p.y3);
			const l3 = Util.GetDist(p.x2, p.y2, p.x3, p.y3);
			f = this.clampScale(f, l1, Triangle.MIN_SIDE_LENGTH, Triangle.MAX_SIDE_LENGTH);
			f = this.clampScale(f, l2, Triangle.MIN_SIDE_LENGTH, Triangle.MAX_SIDE_LENGTH);
			f = this.clampScale(f, l3, Triangle.MIN_SIDE_LENGTH, Triangle.MAX_SIDE_LENGTH);
		}
		if (f <= 0) return;

		const anchor = this.currentXY(p);
		const nx = cx + (anchor.x - cx) * f;
		const ny = cy + (anchor.y - cy) * f;

		if (p instanceof Circle) {
			p.radius *= f;
			p.Move(nx, ny);
		} else if (p instanceof Rectangle) {
			p.w *= f;
			p.h *= f;
			p.Move(nx, ny);
		} else if (p instanceof Cannon) {
			p.w *= f;
			p.Move(nx, ny);
		} else if (p instanceof Triangle) {
			// Triangle vertices are stored absolutely; scale each about the new centre.
			const dx1 = p.x1 - anchor.x;
			const dy1 = p.y1 - anchor.y;
			const dx2 = p.x2 - anchor.x;
			const dy2 = p.y2 - anchor.y;
			const dx3 = p.x3 - anchor.x;
			const dy3 = p.y3 - anchor.y;
			p.centerX = nx;
			p.centerY = ny;
			p.x1 = nx + dx1 * f;
			p.y1 = ny + dy1 * f;
			p.x2 = nx + dx2 * f;
			p.y2 = ny + dy2 * f;
			p.x3 = nx + dx3 * f;
			p.y3 = ny + dy3 * f;
		} else if (p instanceof PrismaticJoint) {
			p.Move(nx, ny);
			p.initLength *= f;
		} else if (p instanceof JointPart) {
			p.Move(nx, ny);
		} else if (p instanceof Thrusters) {
			p.centerX = nx;
			p.centerY = ny;
		} else if (p instanceof TextPart) {
			p.w *= f;
			p.h *= f;
			p.x = nx - p.w / 2;
			p.y = ny - p.h / 2;
		}
	}

	/** Clamp a scale factor so `value * f` stays within [min, max]. */
	private clampScale(f: number, value: number, min: number, max: number): number {
		if (value <= 0) return f;
		if (value * f > max) return max / value;
		if (value * f < min) return min / value;
		return f;
	}

	/**
	 * Every ShapePart whose geometry contains (x,y), topmost first. Used by the
	 * joint / thruster creation flows (ControllerGame iterates allParts back to
	 * front collecting InsideShape hits — MaybeCreateJoint :6747).
	 */
	private shapesAt(x: number, y: number): ShapePart[] {
		const hits: ShapePart[] = [];
		const scale = this.state.camera.scale;
		for (let i = this.state.parts.length - 1; i >= 0; i--) {
			const p = this.state.parts[i];
			if (p instanceof ShapePart && p.InsideShape(x, y, scale)) hits.push(p);
		}
		return hits;
	}

	/**
	 * Construct a ShapePart from a click-drag gesture, mirroring
	 * ControllerGame.mouseClick's NEW_CIRCLE/NEW_RECT/NEW_TRIANGLE branches.
	 * (x1,y1) is the press point, (x2,y2) the release point. Returns null for a
	 * degenerate (zero-length) drag so the caller can skip creation. The Part
	 * constructors clamp each dimension to the type's legal MIN/MAX range, so we
	 * only guard the "no drag at all" case here.
	 */
	private buildDraggedShape(
		kind: ShapeKind,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		x3?: number,
		y3?: number,
	): Part | null {
		switch (kind) {
			case "circle": {
				// Press sets the CENTRE, drag sets the radius (ControllerGame :2196).
				const radius = Util.GetDist(x1, y1, x2, y2);
				if (radius <= 0) return null;
				// Circle(x, y, rad) clamps rad to [MIN_RADIUS, MAX_RADIUS] (:2204).
				return new Circle(x1, y1, radius);
			}
			case "rect": {
				// Press/release are opposite corners (ControllerGame :2228). The
				// Rectangle ctor clamps |w|,|h| to [MIN_WIDTH, MAX_WIDTH] and keeps the
				// sign so it can be dragged in any direction.
				if (x2 === x1 && y2 === y1) return null;
				return new Rectangle(x1, y1, x2 - x1, y2 - y1);
			}
			case "triangle": {
				// Faithful port of the original 3-click gesture (ControllerGame :2282).
				// (x1,y1)-(x2,y2) is the BASE edge (already length-clamped by the caller
				// exactly as the original clamps `secondClick` along the drag angle,
				// :2295-2316); (x3,y3) is the APEX from the second click. Validate the
				// same side-length + minimum-angle constraints the original enforces
				// before building (:2329-2360); reject the gesture otherwise.
				if (x3 === undefined || y3 === undefined) return null;
				if ((x3 === x1 && y3 === y1) || (x3 === x2 && y3 === y2)) return null;
				const sideLen1 = Util.GetDist(x1, y1, x3, y3);
				const sideLen2 = Util.GetDist(x2, y2, x3, y3);
				const sideLen0 = Util.GetDist(x1, y1, x2, y2);
				if (sideLen0 <= 0) return null;
				const angle1 = Util.NormalizeAngle(
					Math.acos((sideLen0 * sideLen0 + sideLen1 * sideLen1 - sideLen2 * sideLen2) / (2 * sideLen0 * sideLen1)),
				);
				const angle2 = Util.NormalizeAngle(
					Math.acos((sideLen0 * sideLen0 + sideLen2 * sideLen2 - sideLen1 * sideLen1) / (2 * sideLen0 * sideLen2)),
				);
				const angle3 = Util.NormalizeAngle(
					Math.acos((sideLen1 * sideLen1 + sideLen2 * sideLen2 - sideLen0 * sideLen0) / (2 * sideLen1 * sideLen2)),
				);
				if (
					sideLen1 <= Triangle.MAX_SIDE_LENGTH &&
					sideLen1 >= Triangle.MIN_SIDE_LENGTH &&
					sideLen2 <= Triangle.MAX_SIDE_LENGTH &&
					sideLen2 >= Triangle.MIN_SIDE_LENGTH &&
					angle1 >= Triangle.MIN_TRIANGLE_ANGLE &&
					angle2 >= Triangle.MIN_TRIANGLE_ANGLE &&
					angle3 >= Triangle.MIN_TRIANGLE_ANGLE
				) {
					return new Triangle(x1, y1, x2, y2, x3, y3);
				}
				return null;
			}
			case "cannon":
				// Cannon is created via the createCannon command, not createShape.
				throw new Error(`GameCore: createShape "cannon" not supported — use createCannon`);
			default: {
				const _never: never = kind;
				throw new Error(`GameCore: unknown shape kind ${JSON.stringify(_never)}`);
			}
		}
	}

	// --- Physics simulation -------------------------------------------------

	/**
	 * Build a fresh b2World, mirroring ControllerGame.CreateWorld()
	 * (ControllerGame.ts:6628). We attach the vendored ContactFilter (which honours
	 * each shape's `collide` / group flags) but omit the ControllerGame-bound
	 * ContactListener — that only drives cannonball / challenge callbacks the
	 * headless editor has no use for; basic rigid-body simulation is unaffected.
	 */
	private createWorld(): b2World {
		const worldAABB = new b2AABB();
		worldAABB.lowerBound.Set(WORLD_AABB_LOWER.x, WORLD_AABB_LOWER.y);
		worldAABB.upperBound.Set(WORLD_AABB_UPPER.x, WORLD_AABB_UPPER.y);
		// Gravity is read from the sandbox settings at world-creation time — the
		// downward vector b2Vec2(0, sandbox.gravity), matching
		// ControllerSandbox.GetGravity() (:716). Changing gravity via
		// setSandboxSettings therefore takes effect only on the NEXT play (spec §4).
		const world = new b2World(worldAABB, new b2Vec2(GRAVITY.x, this.state.sandbox.gravity), true);
		world.SetContactFilter(new ContactFilter());
		// Challenge "touching"/"touched" conditions (obj 5/6) need Box2D contact
		// events. The vendored b2World invokes `listener.Add(cp)` for each new
		// contact point (b2CircleContact.ts:94 etc.), where `cp.shape1/shape2` are
		// the touching b2Shapes — exactly what Condition.ContactAdded matches
		// against. Faithful mirror of ControllerGame.CreateWorld's
		// SetContactListener (ControllerGame.ts:6634-6635) via ControllerChallenge.
		// ContactAdded (:207-214). Only attached when a challenge is active.
		if (this.challenge) {
			const session = this.challenge;
			const listener = new b2ContactListener();
			listener.Add = (point: unknown): void => {
				conditionsContactAdded(session, point, this.state.parts, this.cannonballs);
			};
			world.SetContactListener(listener);
		}
		return world;
	}

	/**
	 * play: create the world, snapshot each part's edit transform (for reset),
	 * assign collision groups and Init every part into the world, then mark the
	 * sim running. Mirrors ControllerGame.playButton() (ControllerGame.ts:2715):
	 * SetCollisionGroup per part (:2758) then Init(world) (:2764). Resuming from a
	 * paused state just flips the phase back to running — the world is kept.
	 */
	private handlePlay(): void {
		if (this.state.sim.phase === "running") return;
		if (this.state.sim.phase === "paused") {
			this.state = { ...this.state, sim: { ...this.state.sim, phase: "running" } };
			this.markChanged();
			return;
		}

		// Challenge: reset every condition's isSatisfied before a fresh run and
		// clear any prior outcome/score (ControllerChallenge.playButton :52-59).
		if (this.challenge) {
			resetConditions(this.challenge);
			this.challenge.outcome = "playing";
			this.challenge.score = null;
			this.cannonballs = [];
		}

		const world = this.createWorld();

		// Snapshot pre-play transforms so reset can restore them exactly.
		this.editSnapshots = this.state.parts.map((p) => {
			const xy = this.currentXY(p);
			const angle = p instanceof ShapePart ? p.angle : 0;
			return { part: p, x: xy.x, y: xy.y, angle };
		});

		// Assign a unique collision group per shape (ControllerGame.ts:2755-2760).
		for (const p of this.state.parts) p.checkedCollisionGroup = false;
		this.state.parts.forEach((p, i) => {
			if (p instanceof ShapePart) p.SetCollisionGroup(-(i + 1));
		});

		// Init shapes/text first (ControllerGame.ts:2764-2767), then joints and
		// thrusters (:2769-2773) — a JointPart's Init requires both its shapes to
		// already be initted (see FixedJoint.Init), so ordering matters.
		for (const p of this.state.parts) {
			if (p instanceof ShapePart || p instanceof TextPart) p.Init(world);
		}
		for (const p of this.state.parts) {
			if (p instanceof JointPart || p instanceof Thrusters) p.Init(world);
		}

		this.state = { ...this.state, world, sim: { phase: "running", frame: 0 } };
		this.markChanged();
		this.syncChallenge();
	}

	/** pause: stop stepping but keep the world alive (ControllerGame.pauseButton, :2796). */
	private handlePause(): void {
		if (this.state.sim.phase !== "running") return;
		this.state = { ...this.state, sim: { ...this.state.sim, phase: "paused" } };
		this.markChanged();
	}

	/**
	 * reset: tear the world down, restore each part's pre-play edit transform, and
	 * return to editing. Mirrors ControllerGame.resetButton() (ControllerGame.ts:2803):
	 * UnInit every part (:2815) and go back to the pre-sim state.
	 */
	private handleReset(): void {
		if (this.state.sim.phase === "editing") return;

		const world = this.state.world;
		if (world) {
			for (const p of this.state.parts) p.UnInit(world);
		}

		// Restore the exact edit-space transform captured at play time.
		for (const snap of this.editSnapshots) {
			snap.part.Move(snap.x, snap.y);
			if (snap.part instanceof ShapePart) snap.part.angle = snap.angle;
		}
		this.editSnapshots = [];

		this.state = { ...this.state, parts: [...this.state.parts], world: null, sim: { phase: "editing", frame: 0 } };
		this.markChanged();

		// Challenge: clear the run outcome/score and reset condition flags so the
		// next play starts fresh (conditions are also reset on play :52-59).
		if (this.challenge) {
			this.challenge.outcome = null;
			this.challenge.score = null;
			resetConditions(this.challenge);
			this.cannonballs = [];
			this.syncChallenge();
		}
	}

	/**
	 * step: advance the world by `frames` (default 1). Each frame does the two
	 * Box2D sub-steps the legacy Update() loop runs (ControllerGame.ts:584-585):
	 * a warm-up Step(1/60, 5) then Step(1/60, 10). After stepping, sync each
	 * ShapePart's centerX/centerY/angle from its body so the renderer (which draws
	 * from those fields via GetVertices/centerX) shows the live body pose.
	 */
	private handleStep(frames: number): void {
		const world = this.state.world;
		if (this.state.sim.phase !== "running" || !world) return;

		let frame = this.state.sim.frame;
		let ended = false;
		for (let f = 0; f < frames; f++) {
			world.Step(STEP_DT, STEP_ITERATIONS_WARMUP);
			world.Step(STEP_DT, STEP_ITERATIONS);
			frame++;

			// Challenge: evaluate every win + loss condition this frame
			// (ControllerChallenge.Update :23-30), then check for win/loss. The base
			// loop pauses + records the outcome when ChallengeOver() first fires
			// (ControllerGame.ts:738-772). obj-5 "touching" was reset to false at the
			// top of each Condition.Update, then re-set by the frame's contacts;
			// obj-6 "touched" latches. Contacts arrived during world.Step via the
			// listener wired in createWorld.
			if (this.challenge) {
				updateConditions(this.challenge, this.state.parts, this.cannonballs);
				if (challengeOver(this.challenge)) {
					// ControllerGame :743 shows the score window only when actually WON;
					// otherwise (an immediate loss) it's a failure. GetScore uses the
					// frame counter at the moment of win (:749-751).
					if (wonChallenge(this.challenge)) {
						this.challenge.outcome = "won";
						this.challenge.score = getScore(frame);
					} else {
						this.challenge.outcome = "failed";
						this.challenge.score = null;
					}
					ended = true;
					break;
				}
			}
		}

		// The bodies now hold the live transforms; Draw.DrawWorld reads them via
		// GetBody().GetXForm() (Draw.ts:456), so no part-field sync is needed here.
		this.state = {
			...this.state,
			// On a win/loss the base loop pauses the sim (ControllerGame.ts:740).
			sim: { phase: ended ? "paused" : "running", frame },
		};
		this.markChanged();
		if (this.challenge) this.syncChallenge();
	}

	/**
	 * setSandboxSettings: faithful port of AdvancedSandboxWindow's Apply +
	 * ControllerSandbox.RefreshSandboxSettings (ControllerSandbox.ts:570-678).
	 *
	 * Store the new settings on state.sandbox, then (editing phase only, which is
	 * the only phase this reaches — see the sim guard) REBUILD the isSandbox
	 * terrain bodies from the new terrainType/size and recompute the world bounds.
	 * Robot parts (isSandbox false) are untouched; the sim/world are NOT reset.
	 * Gravity is stored but applied only at the next play (createWorld reads
	 * state.sandbox.gravity), matching the legacy deferred behaviour (spec §4).
	 *
	 * Not registered as "mutating" for undo — the legacy Apply is a sandbox-config
	 * operation outside the robot-edit undo history, and it drops/rebuilds the
	 * terrain wholesale (RefreshSandboxSettings clears groundParts, :571-573).
	 */
	private handleSetSandboxSettings(command: Extract<Command, { type: "setSandboxSettings" }>): void {
		const next = {
			gravity: command.gravity,
			size: command.size,
			terrainType: command.terrainType,
			terrainTheme: command.terrainTheme,
			background: command.background,
			backgroundR: command.backgroundR,
			backgroundG: command.backgroundG,
			backgroundB: command.backgroundB,
			bounds: computeBounds({ size: command.size, terrainType: command.terrainType }),
		};

		// Drop the current terrain bodies (isSandbox) and rebuild from the new
		// settings, keeping robot parts in place. Preserve robot-part ordering.
		const robotParts = this.state.parts.filter((p) => !(p as { isSandbox?: boolean }).isSandbox);
		const terrainParts = buildTerrainParts(next);
		for (const p of terrainParts) p.id = ++this.nextId;

		this.state = {
			...this.state,
			sandbox: next,
			// Terrain first so it draws behind robot parts, matching BuildGround
			// which pushes ground into allParts before the robot exists.
			parts: [...terrainParts, ...robotParts],
		};
		this.markChanged();
	}

	/**
	 * Whether a command mutates the parts graph and should therefore push an
	 * undo snapshot before it applies. Excludes selection (select/clearSelection),
	 * tool changes (setTool), sim controls (play/pause/reset/step), undo/redo
	 * itself, and persistence (handled separately). Covers the create /
	 * delete / move / rotate / resize / setColour / setXxx family.
	 */
	private isMutating(command: Command): boolean {
		switch (command.type) {
			case "createShape":
			case "createText":
			case "createThrusters":
			case "createCannon":
			case "createJoint":
			case "deleteParts":
			case "moveParts":
			case "rotateParts":
			case "resizeParts":
			case "setColour":
			case "setDensity":
			case "setCollide":
			case "setCameraFocus":
			case "setFixate":
			case "setOutline":
			case "setOutlineBehind":
			case "setUndragable":
			case "setJointMotor":
			case "setJointStrength":
			case "setJointSpeed":
			case "setJointLimits":
			case "setJointControlKey":
			case "setJointAutoOn":
			case "setJointStiff":
			case "setJointInitialLength":
			case "setThrusterStrength":
			case "setThrusterKey":
			case "setThrusterAutoOn":
			case "setCannonStrength":
			case "setCannonFireKey":
			case "setTextContent":
			case "setTextSize":
			case "setTextDisplayKey":
			case "setTextAlwaysVisible":
			case "setTextScaleWithZoom":
				return true;
			default:
				return false;
		}
	}

	/** Current canUndo/canRedo derived from stack depth. */
	private undoRedoFlags(): { canUndo: boolean; canRedo: boolean } {
		return { canUndo: this.undoStack.length > 0, canRedo: this.redoStack.length > 0 };
	}

	private apply(command: Command): void {
		// Snapshot the pre-mutation editable state for undo before any mutating
		// command runs (editing phase only). The handler that follows rebuilds
		// `edit`, so we fold the refreshed canUndo/canRedo flags in afterwards.
		const mutating = this.state.sim.phase === "editing" && this.isMutating(command);
		if (mutating) this.pushHistory();

		this.applyCommand(command);

		// A mutating command's handler rebuilds `edit` without the undo/redo
		// flags; reflect the new stack depths so the UI can enable the buttons.
		// (undo/redo set their own flags via restoreSnapshot.)
		if (mutating) {
			this.state = { ...this.state, edit: { ...this.state.edit, ...this.undoRedoFlags() } };
			// A parts-graph mutation can change whether the robot fits the build
			// area, so recompute CheckIfPartsFit + re-project the challenge read-model
			// (ControllerGame recomputes partsFit on every edit-frame :592-621).
			if (this.challenge) this.syncChallenge();
		}
	}

	private applyCommand(command: Command): void {
		// ControllerGame disallows editing during simulation (the side panel is
		// hidden and curAction cleared on play, :2728-2730). Ignore editing
		// mutations while running/paused; sim controls (play/pause/reset/step) and
		// selection changes still pass through.
		if (this.state.sim.phase !== "editing") {
			switch (command.type) {
				case "createShape":
				case "createText":
				case "createThrusters":
				case "createCannon":
				case "createJoint":
				case "deleteParts":
				case "moveParts":
				case "rotateParts":
				case "resizeParts":
				case "setColour":
				case "setTool":
				case "setDensity":
				case "setCollide":
				case "setCameraFocus":
				case "setFixate":
				case "setOutline":
				case "setOutlineBehind":
				case "setUndragable":
				case "setJointMotor":
				case "setJointStrength":
				case "setJointSpeed":
				case "setJointLimits":
				case "setJointControlKey":
				case "setJointAutoOn":
				case "setJointStiff":
				case "setJointInitialLength":
				case "setThrusterStrength":
				case "setThrusterKey":
				case "setThrusterAutoOn":
				case "setCannonStrength":
				case "setCannonFireKey":
				case "setTextContent":
				case "setTextSize":
				case "setTextDisplayKey":
				case "setTextAlwaysVisible":
				case "setTextScaleWithZoom":
				case "undo":
				case "redo":
				case "loadRobot":
				case "newRobot":
				case "setSandboxSettings":
				case "newChallenge":
				case "loadBuiltInChallenge":
				case "exitChallenge":
				case "addWinCondition":
				case "addLossCondition":
				case "removeWinCondition":
				case "removeLossCondition":
				case "setWinConditionsAnded":
				case "setAllowedParts":
				case "setBuildPermissions":
				case "setPartLimits":
				case "addBuildArea":
				case "removeBuildArea":
				case "enterChallengePlay":
				case "editChallenge":
					return; // no-op during simulation
			}
		}

		switch (command.type) {
			// Handlers are migrated from ControllerGame one command at a time.
			// Each should mutate this.state and call this.markChanged().
			case "setTool":
				this.state = { ...this.state, edit: { ...this.state.edit, tool: command.tool } };
				this.markChanged();
				return;
			case "clearSelection":
				this.state = {
					...this.state,
					edit: { ...this.state.edit, selection: [], selectedPart: null },
				};
				this.markChanged();
				return;
			case "select": {
				let selection: number[];
				if (command.additive) {
					const merged = new Set(this.state.edit.selection);
					for (const id of command.partIds) merged.add(id);
					selection = [...merged];
				} else {
					selection = [...command.partIds];
				}
				this.state = {
					...this.state,
					edit: { ...this.state.edit, selection, selectedPart: this.deriveSelectedPart(selection) },
				};
				this.markChanged();
				return;
			}
			case "createShape": {
				// Restriction gate (ControllerChallenge.circle/rect/triangleButton
				// :92-123): reject a disallowed part type in challenge play mode.
				const kindMap: Record<ShapeKind, CreatePartKind> = {
					circle: "circle",
					rect: "rect",
					triangle: "triangle",
					cannon: "cannon",
				};
				if (this.challenge && !partTypeAllowed(this.challenge, kindMap[command.kind])) return;
				const part = this.buildDraggedShape(
					command.kind,
					command.x1,
					command.y1,
					command.x2,
					command.y2,
					command.x3,
					command.y3,
				);
				// Ignore a zero-length (tiny-click) drag — the original required the
				// release point to differ from the press point before creating the
				// shape (circle: radius > 0 :2202; rect: end != start :2223; triangle:
				// end != start :2288). pushHistory already ran, but with no state
				// change undo just restores the identical graph, which is harmless.
				if (!part) return;
				part.id = ++this.nextId;
				const selection = [part.id];
				this.state = {
					...this.state,
					parts: [...this.state.parts, part],
					edit: { ...this.state.edit, selection, selectedPart: this.snapshotOf(part) },
				};
				this.markChanged();
				return;
			}
			case "createText": {
				// TextPart(cont, x, y, w, h, text). `cont` (the old Pixi container) is
				// unused in the headless core — pass null.
				const part = new TextPart(null, command.x, command.y, DEFAULT_TEXT_W, DEFAULT_TEXT_H, command.text);
				part.id = ++this.nextId;
				const selection = [part.id];
				this.state = {
					...this.state,
					parts: [...this.state.parts, part],
					edit: { ...this.state.edit, selection, selectedPart: this.snapshotOf(part) },
				};
				this.markChanged();
				return;
			}
			case "deleteParts": {
				const remove = new Set(command.partIds);
				const parts = this.state.parts.filter((p) => !remove.has(p.id));
				const selection = this.state.edit.selection.filter((id) => !remove.has(id));
				this.state = {
					...this.state,
					parts,
					edit: { ...this.state.edit, selection, selectedPart: this.deriveSelectedPart(selection) },
				};
				this.markChanged();
				return;
			}
			case "moveParts": {
				const move = new Set(command.partIds);
				for (const p of this.state.parts) {
					if (!move.has(p.id)) continue;
					// ShapePart stores centerX/centerY; TextPart stores x/y. Both expose
					// those as the anchor the createX/x fields report, so read them back.
					const cur = this.currentXY(p);
					p.Move(cur.x + command.dx, cur.y + command.dy);
				}
				this.state = {
					...this.state,
					parts: [...this.state.parts],
					edit: { ...this.state.edit, selectedPart: this.deriveSelectedPart(this.state.edit.selection) },
				};
				this.markChanged();
				return;
			}
			case "setColour": {
				const target = new Set(command.partIds);
				for (const p of this.state.parts) {
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
				this.state = {
					...this.state,
					parts: [...this.state.parts],
					edit: { ...this.state.edit, selectedPart: this.deriveSelectedPart(this.state.edit.selection) },
				};
				this.markChanged();
				return;
			}
			// --- Shape properties (ShapePart family) ---
			// Density: absolute value clamped to [MIN_DENSITY, MAX_DENSITY]
			// (ControllerGame.densitySlider :4078; clamp :4095-4096).
			case "setDensity": {
				let v = Math.max(MIN_DENSITY, Math.min(MAX_DENSITY, command.value));
				// Challenge density limits (ControllerGame.densityText :4090-4091).
				if (this.challenge) v = clampDensity(this.challenge, v);
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.density = v;
				});
				return;
			}
			// Collide lives on ShapePart AND PrismaticJoint (ShapeCheckboxAction COLLIDE_TYPE).
			case "setCollide":
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.collide = command.value;
					else if (p instanceof PrismaticJoint) p.collide = command.value;
				});
				return;
			// Camera focus (CameraAction). Setting one part's focus clears any other
			// part currently focused, matching CameraAction's oldCameraPart handling.
			case "setCameraFocus":
				this.editParts(command.partIds, (p) => {
					if (!(p instanceof ShapePart)) return;
					if (command.value) {
						for (const other of this.state.parts) {
							if (other instanceof ShapePart && other !== p) other.isCameraFocus = false;
						}
					}
					p.isCameraFocus = command.value;
				});
				return;
			// Fixate == Part.isStatic (ShapeCheckboxAction FIXATE_TYPE).
			case "setFixate":
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.isStatic = command.value;
				});
				return;
			// Outline lives on ShapePart AND PrismaticJoint (ShapeCheckboxAction OUTLINE_TYPE).
			case "setOutline":
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.outline = command.value;
					else if (p instanceof PrismaticJoint) p.outline = command.value;
				});
				return;
			// "Outlines Behind" == ShapePart.terrain (ShapeCheckboxAction TERRAIN_TYPE).
			case "setOutlineBehind":
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.terrain = command.value;
				});
				return;
			case "setUndragable":
				this.editParts(command.partIds, (p) => {
					if (p instanceof ShapePart) p.undragable = command.value;
				});
				return;

			// --- Joint properties (RevoluteJoint / PrismaticJoint) ---
			// Motor enable: enableMotor (revolute) / enablePiston (prismatic)
			// (JointCheckboxAction ENABLE_TYPE).
			case "setJointMotor":
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint) p.enableMotor = command.value;
					else if (p instanceof PrismaticJoint) p.enablePiston = command.value;
				});
				return;
			// Strength: motorStrength / pistonStrength (ChangeSliderAction STRENGTH_TYPE;
			// slider range 1..30 — MAX_RJ_STRENGTH / MAX_SJ_STRENGTH).
			case "setJointStrength": {
				const v = Math.max(1, Math.min(MAX_JOINT_VALUE, command.value));
				// Challenge joint-strength caps differ by joint type
				// (ControllerGame.strengthText :4122 RJ / :4127 SJ).
				const ch = this.challenge;
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint) p.motorStrength = ch ? clampRJ(ch, v, "strength") : v;
					else if (p instanceof PrismaticJoint) p.pistonStrength = ch ? clampSJ(ch, v, "strength") : v;
				});
				return;
			}
			// Speed: motorSpeed / pistonSpeed (ChangeSliderAction SPEED_TYPE).
			case "setJointSpeed": {
				const v = Math.max(1, Math.min(MAX_JOINT_VALUE, command.value));
				// Challenge joint-speed caps differ by joint type
				// (ControllerGame.speedText :4154 RJ / :4159 SJ).
				const ch = this.challenge;
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint) p.motorSpeed = ch ? clampRJ(ch, v, "speed") : v;
					else if (p instanceof PrismaticJoint) p.pistonSpeed = ch ? clampSJ(ch, v, "speed") : v;
				});
				return;
			}
			// Revolute limits, in degrees (LimitChangeAction; clamp rules from
			// ControllerGame.minLimitText :4589 / maxLimitText :4610): null == "None"
			// (∓MAX_VALUE); a lower limit must be ≤0, an upper limit must be ≥0.
			case "setJointLimits": {
				const lower = command.lower === null ? -Number.MAX_VALUE : Math.min(0, command.lower);
				const upper = command.upper === null ? Number.MAX_VALUE : Math.max(0, command.upper);
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint) {
						p.motorLowerLimit = lower;
						p.motorUpperLimit = upper;
					}
				});
				return;
			}
			// Control keys (ControlKeyAction): cw/ccw -> revolute motorCW/CCWKey;
			// up/down -> prismatic pistonUp/DownKey.
			case "setJointControlKey":
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint) {
						if (command.which === "cw") p.motorCWKey = command.key;
						else if (command.which === "ccw") p.motorCCWKey = command.key;
					} else if (p instanceof PrismaticJoint) {
						if (command.which === "up") p.pistonUpKey = command.key;
						else if (command.which === "down") p.pistonDownKey = command.key;
					}
				});
				return;
			// Auto-on flags (JointCheckboxAction AUTO_*): cw/ccw are mutually
			// exclusive on a revolute (setting one on clears the other, matching the
			// sideEffect path); oscillate is the prismatic flag.
			case "setJointAutoOn":
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint) {
						if (command.which === "cw") {
							p.autoCW = command.value;
							if (command.value) p.autoCCW = false;
						} else if (command.which === "ccw") {
							p.autoCCW = command.value;
							if (command.value) p.autoCW = false;
						}
					} else if (p instanceof PrismaticJoint && command.which === "oscillate") {
						p.autoOscillate = command.value;
					}
				});
				return;
			// isStiff (JointCheckboxAction RIGID_TYPE) — the UI shows "Floppy Joint"
			// (= !isStiff); the command already carries the resolved isStiff value.
			case "setJointStiff":
				this.editParts(command.partIds, (p) => {
					if (p instanceof RevoluteJoint || p instanceof PrismaticJoint) p.isStiff = command.value;
				});
				return;
			case "setJointInitialLength":
				this.editParts(command.partIds, (p) => {
					if (p instanceof PrismaticJoint) p.initLength = Math.max(0, command.value);
				});
				return;

			// --- Thruster ---
			case "setThrusterStrength": {
				let v = Math.max(1, Math.min(MAX_JOINT_VALUE, command.value));
				// Challenge thruster-strength cap (ControllerGame.thrustText :4179).
				if (this.challenge) v = clampThruster(this.challenge, v);
				this.editParts(command.partIds, (p) => {
					if (p instanceof Thrusters) p.strength = v;
				});
				return;
			}
			case "setThrusterKey":
				this.editParts(command.partIds, (p) => {
					if (p instanceof Thrusters) p.thrustKey = command.key;
				});
				return;
			case "setThrusterAutoOn":
				this.editParts(command.partIds, (p) => {
					if (p instanceof Thrusters) p.autoOn = command.value;
				});
				return;

			// --- Cannon ---
			case "setCannonStrength": {
				const v = Math.max(1, Math.min(MAX_JOINT_VALUE, command.value));
				this.editParts(command.partIds, (p) => {
					if (p instanceof Cannon) p.strength = v;
				});
				return;
			}
			case "setCannonFireKey":
				this.editParts(command.partIds, (p) => {
					if (p instanceof Cannon) p.fireKey = command.key;
				});
				return;

			// --- Text (EnterTextAction / TextSizeChangeAction / TextCheckboxAction / ControlKeyAction TEXT_TYPE) ---
			case "setTextContent":
				this.editParts(command.partIds, (p) => {
					if (p instanceof TextPart) p.text = command.text;
				});
				return;
			case "setTextSize":
				this.editParts(command.partIds, (p) => {
					if (p instanceof TextPart) p.size = Math.max(1, command.value);
				});
				return;
			case "setTextDisplayKey":
				this.editParts(command.partIds, (p) => {
					if (p instanceof TextPart) p.displayKey = command.key;
				});
				return;
			case "setTextAlwaysVisible":
				this.editParts(command.partIds, (p) => {
					if (p instanceof TextPart) p.alwaysVisible = command.value;
				});
				return;
			case "setTextScaleWithZoom":
				this.editParts(command.partIds, (p) => {
					if (p instanceof TextPart) p.scaleWithZoom = command.value;
				});
				return;

			case "setSandboxSettings":
				this.handleSetSandboxSettings(command);
				return;

			case "play":
				this.handlePlay();
				return;
			case "pause":
				this.handlePause();
				return;
			case "reset":
				this.handleReset();
				return;
			case "step":
				this.handleStep(command.frames ?? 1);
				return;
			// Rotate the selection about its centroid by `angle` radians. GameCanvas
			// feeds the incremental delta since the last pointer move.
			case "rotateParts": {
				if (command.angle === 0) return;
				const target = new Set(command.partIds);
				const parts = this.state.parts.filter((p) => target.has(p.id));
				if (parts.length === 0) return;
				const c = this.selectionCentroid(parts);
				for (const p of parts) this.rotatePartAbout(p, c.x, c.y, command.angle);
				this.state = {
					...this.state,
					parts: [...this.state.parts],
					edit: { ...this.state.edit, selectedPart: this.deriveSelectedPart(this.state.edit.selection) },
				};
				this.markChanged();
				return;
			}
			// Scale the selection about its centroid (>1 grows, <1 shrinks).
			// GameCanvas feeds the incremental ratio since the last move.
			case "resizeParts": {
				if (command.scaleFactor === 1 || command.scaleFactor <= 0) return;
				const target = new Set(command.partIds);
				const parts = this.state.parts.filter((p) => target.has(p.id));
				if (parts.length === 0) return;
				const c = this.selectionCentroid(parts);
				for (const p of parts) this.scalePartAbout(p, c.x, c.y, command.scaleFactor);
				this.state = {
					...this.state,
					parts: [...this.state.parts],
					edit: { ...this.state.edit, selectedPart: this.deriveSelectedPart(this.state.edit.selection) },
				};
				this.markChanged();
				return;
			}
			case "createThrusters": {
				// Restriction gate (ControllerChallenge.thrustersButton :158-167).
				if (this.challenge && !partTypeAllowed(this.challenge, "thrusters")) return;
				// Attach to the single top shape under the click (MaybeCreateThrusters :6817).
				const hits = this.shapesAt(command.x, command.y);
				if (hits.length === 0) return;
				const t = new Thrusters(hits[0], command.x, command.y);
				t.id = ++this.nextId;
				const selection = [t.id];
				this.state = {
					...this.state,
					parts: [...this.state.parts, t],
					edit: { ...this.state.edit, selection, selectedPart: this.snapshotOf(t) },
				};
				this.markChanged();
				return;
			}
			case "createCannon": {
				// Restriction gate (ControllerChallenge.cannonButton :169-178).
				if (this.challenge && !partTypeAllowed(this.challenge, "cannon")) return;
				// A Cannon is a free-standing ShapePart (NEW_CANNON flow :2274); the
				// legacy drag sizes its width, the click-to-create core uses a default.
				const cannon = new Cannon(command.x, command.y, DEFAULT_RECT_SIZE);
				cannon.id = ++this.nextId;
				const selection = [cannon.id];
				this.state = {
					...this.state,
					parts: [...this.state.parts, cannon],
					edit: { ...this.state.edit, selection, selectedPart: this.snapshotOf(cannon) },
				};
				this.markChanged();
				return;
			}
			case "createJoint": {
				// A joint attaches the two overlapping shapes under the click. We take
				// the top two overlaps (MaybeCreateJoint candidateParts[0..1] :6756-6778);
				// SIMPLIFICATION: the original's >2-overlap disambiguation click-cycle is
				// collapsed. With fewer than two overlapping shapes, this is a no-op.
				// Restriction gate (ControllerChallenge.fj/rj/pjButton :125-156).
				if (this.challenge && !partTypeAllowed(this.challenge, command.kind)) return;
				const hits = this.shapesAt(command.x, command.y);
				if (hits.length < 2) return;
				const p1 = hits[0];
				const p2 = hits[1];
				let joint: Part;
				if (command.kind === "revolute") {
					joint = new RevoluteJoint(p1, p2, command.x, command.y);
				} else if (command.kind === "fixed") {
					joint = new FixedJoint(p1, p2, command.x, command.y);
				} else {
					// The original's two-click gesture picks the slide axis; here we
					// default to a short horizontal span centred on the click, giving a
					// valid axis + initLength (PrismaticJoint ctor :57-81).
					const half = DEFAULT_RECT_SIZE / 2;
					joint = new PrismaticJoint(p1, p2, command.x - half, command.y, command.x + half, command.y);
				}
				joint.id = ++this.nextId;
				const selection = [joint.id];
				this.state = {
					...this.state,
					parts: [...this.state.parts, joint],
					edit: { ...this.state.edit, selection, selectedPart: this.snapshotOf(joint) },
				};
				this.markChanged();
				return;
			}
			case "undo":
				this.handleUndo();
				return;
			case "redo":
				this.handleRedo();
				return;
			// --- Challenge mode -------------------------------------------------
			case "newChallenge": {
				// Start a fresh authoring challenge (empty conditions/restrictions,
				// default Challenge flags). Editing (not playOnly), so the author can
				// build terrain + define conditions before switching to play.
				this.challenge = createChallengeSession();
				this.syncChallenge();
				return;
			}
			case "loadBuiltInChallenge": {
				// Faithful port of ControllerClimb / ControllerMonkeyBars ctors: bake
				// the terrain + conditions + restrictions, mark playOnly + playMode,
				// and seed the terrain into the parts graph (behind any robot parts).
				this.challenge = createChallengeSession();
				const terrain = buildBuiltInChallenge(command.name, this.challenge);
				for (const p of terrain) p.id = ++this.nextId;
				// Keep any existing robot parts (unlikely on a fresh load) after terrain.
				const robotParts = this.state.parts.filter(
					(p) => !(p as { isSandbox?: boolean }).isSandbox && p.isEditable,
				);
				this.state = { ...this.state, parts: [...terrain, ...robotParts] };
				this.markChanged();
				this.syncChallenge();
				return;
			}
			case "exitChallenge": {
				this.challenge = null;
				this.cannonballs = [];
				this.syncChallenge();
				return;
			}
			case "addWinCondition": {
				if (!this.challenge) return;
				const cond = new WinCondition(command.name ?? "Condition", command.subject, command.object);
				if (command.region) {
					cond.minX = command.region.minX;
					cond.maxX = command.region.maxX;
					cond.minY = command.region.minY;
					cond.maxY = command.region.maxY;
				}
				this.applyConditionShapes(cond, command.shape1Id, command.shape2Id);
				this.challenge.challenge.winConditions.push(cond);
				this.syncChallenge();
				return;
			}
			case "addLossCondition": {
				if (!this.challenge) return;
				const cond = new LossCondition(
					command.name ?? "Condition",
					command.subject,
					command.object,
					command.immediate,
				);
				if (command.region) {
					cond.minX = command.region.minX;
					cond.maxX = command.region.maxX;
					cond.minY = command.region.minY;
					cond.maxY = command.region.maxY;
				}
				this.applyConditionShapes(cond, command.shape1Id, command.shape2Id);
				this.challenge.challenge.lossConditions.push(cond);
				this.syncChallenge();
				return;
			}
			case "removeWinCondition": {
				if (!this.challenge) return;
				this.challenge.challenge.winConditions.splice(command.index, 1);
				this.syncChallenge();
				return;
			}
			case "removeLossCondition": {
				if (!this.challenge) return;
				this.challenge.challenge.lossConditions.splice(command.index, 1);
				this.syncChallenge();
				return;
			}
			case "setWinConditionsAnded": {
				if (!this.challenge) return;
				this.challenge.challenge.winConditionsAnded = command.value;
				this.syncChallenge();
				return;
			}
			case "setAllowedParts": {
				if (!this.challenge) return;
				const ch = this.challenge.challenge;
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
				this.syncChallenge();
				return;
			}
			case "setBuildPermissions": {
				if (!this.challenge) return;
				const ch = this.challenge.challenge;
				ch.mouseDragAllowed = command.mouseDrag;
				ch.botControlAllowed = command.botControl;
				ch.fixateAllowed = command.fixate;
				ch.nonCollidingAllowed = command.nonColliding;
				ch.showConditions = command.showConditions;
				this.syncChallenge();
				return;
			}
			case "setPartLimits": {
				if (!this.challenge) return;
				const ch = this.challenge.challenge;
				// null == the ∓Number.MAX_VALUE "no limit" sentinel (Challenge.ts:22-28).
				ch.minDensity = command.minDensity === null ? NO_LIMIT_MIN : command.minDensity;
				ch.maxDensity = command.maxDensity === null ? NO_LIMIT_MAX : command.maxDensity;
				ch.maxRJStrength = command.maxRJStrength === null ? NO_LIMIT_MAX : command.maxRJStrength;
				ch.maxRJSpeed = command.maxRJSpeed === null ? NO_LIMIT_MAX : command.maxRJSpeed;
				ch.maxSJStrength = command.maxSJStrength === null ? NO_LIMIT_MAX : command.maxSJStrength;
				ch.maxSJSpeed = command.maxSJSpeed === null ? NO_LIMIT_MAX : command.maxSJSpeed;
				ch.maxThrusterStrength =
					command.maxThrusterStrength === null ? NO_LIMIT_MAX : command.maxThrusterStrength;
				this.syncChallenge();
				return;
			}
			case "addBuildArea": {
				if (!this.challenge) return;
				const area = new b2AABB();
				area.lowerBound.Set(command.minX, command.minY);
				area.upperBound.Set(command.maxX, command.maxY);
				this.challenge.challenge.buildAreas.push(area);
				this.syncChallenge();
				return;
			}
			case "removeBuildArea": {
				if (!this.challenge) return;
				this.challenge.challenge.buildAreas.splice(command.index, 1);
				this.syncChallenge();
				return;
			}
			case "enterChallengePlay": {
				// ControllerChallenge.playButton first press (:39-50): snapshot the
				// editable robot into challenge.allParts, enter play mode, mark those
				// parts uneditable, then CheckIfPartsFit + clear selection.
				if (!this.challenge || this.challenge.playMode) return;
				const robot = this.state.parts.filter((p) => p.isEditable);
				this.challenge.savedRobot = robot;
				this.challenge.challenge.allParts = robot;
				this.challenge.playMode = true;
				for (const p of robot) p.isEditable = false;
				this.state = {
					...this.state,
					parts: [...this.state.parts],
					edit: { ...this.state.edit, editable: false, selection: [], selectedPart: null },
				};
				this.markChanged();
				this.syncChallenge();
				return;
			}
			case "editChallenge": {
				// ControllerChallenge.editButton (:64-76): guarded by playOnly; restore
				// the saved robot parts as editable again and leave play mode.
				if (!this.challenge) return;
				if (this.challenge.playOnly) return; // "This challenge is uneditable!"
				this.challenge.playMode = false;
				for (const p of this.challenge.savedRobot) p.isEditable = true;
				this.state = {
					...this.state,
					parts: [...this.state.parts],
					edit: { ...this.state.edit, editable: true },
				};
				this.markChanged();
				this.syncChallenge();
				return;
			}

			case "loadRobot":
			case "newRobot":
				throw new Error(`GameCore: command "${command.type}" not yet migrated from ControllerGame`);
			default: {
				// Exhaustiveness guard: adding a Command variant without a case here is a compile error.
				const _never: never = command;
				throw new Error(`GameCore: unknown command ${JSON.stringify(_never)}`);
			}
		}
	}
}
