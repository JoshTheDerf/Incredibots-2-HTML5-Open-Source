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

import { Circle } from "../Parts/Circle";
import type { Part } from "../Parts/Part";
import { Rectangle } from "../Parts/Rectangle";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { Triangle } from "../Parts/Triangle";
import type { Command } from "./Command";
import { GameState, PartSnapshot, createInitialState } from "./GameState";

// Default sizes for click-to-create shapes. The original ControllerGame derives
// each shape's dimensions from a click-drag gesture (ControllerGame.ts:2209 for
// the circle, :2233 for the rect, :2367 for the triangle); the headless
// create-at-point command has no drag, so we pick sensible world-unit defaults
// in the middle of each shape's legal size range.
const DEFAULT_CIRCLE_RADIUS = 1.0;
const DEFAULT_RECT_SIZE = 2.0;
const DEFAULT_TRIANGLE_SIDE = 2.0;
const DEFAULT_TEXT_W = 4.0;
const DEFAULT_TEXT_H = 2.0;

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

	constructor(initial: GameState = createInitialState()) {
		this.state = initial;
	}

	/** Read-only snapshot for the renderer / views. */
	getState(): Readonly<GameState> {
		return this.state;
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

	/** Look up a live Part by its stable id. */
	private findPart(id: number): Part | undefined {
		return this.state.parts.find((p) => p.id === id);
	}

	/**
	 * Build a plain-data PartSnapshot from a live Part, branching on `type`.
	 * Colour channels stay 0-255 (as stored on the Part); opacity is converted
	 * from the Part's 0-255 storage to the 0-1 scale the view/commands use.
	 */
	private snapshotOf(part: Part): PartSnapshot {
		const kind = part.type;
		if (part instanceof Circle) {
			return {
				id: part.id,
				kind,
				x: part.centerX,
				y: part.centerY,
				red: part.red,
				green: part.green,
				blue: part.blue,
				opacity: part.opacity / 255,
				radius: part.radius,
				angle: part.angle,
			};
		}
		if (part instanceof Rectangle) {
			return {
				id: part.id,
				kind,
				x: part.centerX,
				y: part.centerY,
				red: part.red,
				green: part.green,
				blue: part.blue,
				opacity: part.opacity / 255,
				w: part.w,
				h: part.h,
				angle: part.angle,
			};
		}
		if (part instanceof Triangle) {
			return {
				id: part.id,
				kind,
				x: part.centerX,
				y: part.centerY,
				red: part.red,
				green: part.green,
				blue: part.blue,
				opacity: part.opacity / 255,
				angle: part.angle,
			};
		}
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
			};
		}
		// Any other ShapePart (e.g. Cannon) — expose the common ShapePart fields.
		if (part instanceof ShapePart) {
			return {
				id: part.id,
				kind,
				x: part.centerX,
				y: part.centerY,
				red: part.red,
				green: part.green,
				blue: part.blue,
				opacity: part.opacity / 255,
				angle: part.angle,
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

	private apply(command: Command): void {
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
				let part: Part;
				switch (command.kind) {
					case "circle":
						// ControllerGame.ts:2209 `new Circle(x, y, radius)`.
						part = new Circle(command.x, command.y, DEFAULT_CIRCLE_RADIUS);
						break;
					case "rect": {
						// ControllerGame.ts:2233 `new Rectangle(x, y, w, h)` (x,y is a corner).
						const half = DEFAULT_RECT_SIZE / 2;
						part = new Rectangle(command.x - half, command.y - half, DEFAULT_RECT_SIZE, DEFAULT_RECT_SIZE);
						break;
					}
					case "triangle": {
						// ControllerGame.ts:2367 `new Triangle(x1,y1,x2,y2,x3,y3)`. Build an
						// equilateral-ish triangle centred on (x,y).
						const s = DEFAULT_TRIANGLE_SIDE;
						const h = (s * Math.sqrt(3)) / 2;
						part = new Triangle(
							command.x - s / 2,
							command.y + h / 3,
							command.x + s / 2,
							command.y + h / 3,
							command.x,
							command.y - (2 * h) / 3,
						);
						break;
					}
					case "cannon":
						throw new Error(`GameCore: createShape "cannon" not yet migrated from ControllerGame`);
					default: {
						const _never: never = command.kind;
						throw new Error(`GameCore: unknown shape kind ${JSON.stringify(_never)}`);
					}
				}
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
			case "play":
			case "pause":
			case "reset":
			case "step":
			case "rotateParts":
			case "resizeParts":
			case "undo":
			case "redo":
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
