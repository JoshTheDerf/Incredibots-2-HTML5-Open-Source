// Shared helpers for the GameCore characterization tests.
//
// We seed a GameCore with pre-built Part instances via createInitialState()
// rather than through create-commands, so the tests do NOT couple to the
// create-command argument shapes (createShape's drag geometry is being changed
// by a parallel agent). Part CONSTRUCTORS are stable, so we build parts with
// them directly and hand the graph to the core as its initial state.

import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import type { Part } from "../src/Parts/Part";

/**
 * Build a GameCore whose initial parts are the given pre-built Part instances,
 * with sequential ids 1..N assigned (mirroring GameCore's own ++nextId scheme).
 * Returns the core plus the id list for convenience.
 */
export function coreWithParts(...parts: Part[]): { core: GameCore; ids: number[] } {
	const ids: number[] = [];
	parts.forEach((p, i) => {
		p.id = i + 1;
		ids.push(p.id);
	});
	const state = createInitialState();
	state.parts = parts;
	const core = new GameCore(state);
	return { core, ids };
}

/** Read back a live Part from the core's state by id. */
export function getPart(core: GameCore, id: number): any {
	return core.getState().parts.find((p) => p.id === id);
}

/** Select a single part (needed so selectedPart snapshot reflects it). */
export function selectOne(core: GameCore, id: number): void {
	core.dispatch({ type: "select", partIds: [id] });
}
