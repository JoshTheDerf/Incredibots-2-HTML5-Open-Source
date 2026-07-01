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

import type { Command } from "./Command";
import { GameState, createInitialState } from "./GameState";

export type Unsubscribe = () => void;
export type StateListener = (state: Readonly<GameState>) => void;

export class GameCore {
	private state: GameState;
	private listeners = new Set<StateListener>();
	/** batching depth so a compound command notifies subscribers once. */
	private notifyDepth = 0;
	private dirty = false;

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

	private apply(command: Command): void {
		switch (command.type) {
			// Handlers are migrated from ControllerGame one command at a time.
			// Each should mutate this.state and call this.markChanged().
			case "play":
			case "pause":
			case "reset":
			case "step":
			case "setTool":
			case "createShape":
			case "createText":
			case "deleteParts":
			case "moveParts":
			case "rotateParts":
			case "resizeParts":
			case "setColour":
			case "select":
			case "clearSelection":
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
