// CHARACTERIZATION — snapshot-based undo/redo.
//
// GameCore pushes a deep-cloned editable-state snapshot before every mutating
// command (GameCore.ts:888-903, isMutating :840-881), and undo/redo swap the
// current state with the top of the undo/redo stack (:301-313). canUndo/canRedo
// track stack depth (:884-886). This pins that contract.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Circle } from "../src/Parts/Circle";
import type { Part } from "../src/Parts/Part";

function coreWith(parts: Part[]): { core: GameCore; ids: number[] } {
	const ids: number[] = [];
	parts.forEach((p, i) => {
		p.id = i + 1;
		ids.push(p.id);
	});
	const state = createInitialState();
	state.parts = parts;
	return { core: new GameCore(state), ids };
}

describe("mutating command then undo restores prior state; redo reapplies", () => {
	it("setDensity is undoable/redoable", () => {
		const { core, ids } = coreWith([new Circle(0, 0, 1)]);
		expect(core.getState().parts[0].density).toBe(15); // legacy default

		core.dispatch({ type: "setDensity", partIds: ids, value: 7 });
		expect(core.getState().parts[0].density).toBe(7);

		core.dispatch({ type: "undo" });
		expect(core.getState().parts[0].density).toBe(15);

		core.dispatch({ type: "redo" });
		expect(core.getState().parts[0].density).toBe(7);
	});

	it("deleteParts is undoable — the deleted part comes back", () => {
		const { core, ids } = coreWith([new Circle(0, 0, 1), new Circle(3, 0, 1)]);
		expect(core.getState().parts.length).toBe(2);
		core.dispatch({ type: "deleteParts", partIds: [ids[0]] });
		expect(core.getState().parts.length).toBe(1);
		core.dispatch({ type: "undo" });
		expect(core.getState().parts.length).toBe(2);
		expect(core.getState().parts.some((p) => p.id === ids[0])).toBe(true);
	});
});

describe("canUndo / canRedo track stack depth (GameCore.ts:884-886)", () => {
	it("starts false/false, a mutation enables undo, undo enables redo", () => {
		const { core, ids } = coreWith([new Circle(0, 0, 1)]);
		expect(core.getState().edit.canUndo).toBe(false);
		expect(core.getState().edit.canRedo).toBe(false);

		core.dispatch({ type: "setDensity", partIds: ids, value: 5 });
		expect(core.getState().edit.canUndo).toBe(true);
		expect(core.getState().edit.canRedo).toBe(false);

		core.dispatch({ type: "undo" });
		expect(core.getState().edit.canUndo).toBe(false);
		expect(core.getState().edit.canRedo).toBe(true);

		core.dispatch({ type: "redo" });
		expect(core.getState().edit.canUndo).toBe(true);
		expect(core.getState().edit.canRedo).toBe(false);
	});

	it("a fresh mutation after undo clears the redo stack (GameCore.ts:270)", () => {
		const { core, ids } = coreWith([new Circle(0, 0, 1)]);
		core.dispatch({ type: "setDensity", partIds: ids, value: 5 });
		core.dispatch({ type: "undo" });
		expect(core.getState().edit.canRedo).toBe(true);
		// A new mutating command must drop the redo history.
		core.dispatch({ type: "setDensity", partIds: ids, value: 9 });
		expect(core.getState().edit.canRedo).toBe(false);
		expect(core.getState().parts[0].density).toBe(9);
	});

	it("undo/redo with empty stacks are safe no-ops", () => {
		const { core } = coreWith([new Circle(0, 0, 1)]);
		expect(() => core.dispatch({ type: "undo" })).not.toThrow();
		expect(() => core.dispatch({ type: "redo" })).not.toThrow();
		expect(core.getState().parts[0].density).toBe(15);
	});
});

describe("selection / tool changes are NOT undoable (GameCore.ts:840-881)", () => {
	it("select does not push an undo snapshot", () => {
		const { core, ids } = coreWith([new Circle(0, 0, 1)]);
		core.dispatch({ type: "select", partIds: [ids[0]] });
		expect(core.getState().edit.canUndo).toBe(false);
		core.dispatch({ type: "setTool", tool: "newCircle" });
		expect(core.getState().edit.canUndo).toBe(false);
	});
});

describe("undo restores independent (deep-cloned) parts (GameCore.ts:206-251)", () => {
	it("the restored part is a distinct instance from the mutated one", () => {
		const { core, ids } = coreWith([new Circle(0, 0, 1)]);
		const beforeInstance = core.getState().parts[0];
		core.dispatch({ type: "setDensity", partIds: ids, value: 3 });
		core.dispatch({ type: "undo" });
		const restored = core.getState().parts[0];
		// Same id + value, but a cloned instance (snapshot deep-clones on push).
		expect(restored.id).toBe(ids[0]);
		expect((restored as Circle).density).toBe(15);
		expect(restored).not.toBe(beforeInstance);
	});
});
