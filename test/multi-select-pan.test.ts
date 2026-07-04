// Multi-select marquee vs pan (mobile/touch box-select fix).
//
// The gesture itself lives in the UI (GameCanvas.onPointerDown), which is not
// unit-testable here, but the two pieces it stands on ARE:
//   1. partsInBox() — the pure box-select hit test the marquee commits through.
//   2. the "pan" ToolMode — the deselected/pan-only state a single-pointer drag
//      pans in (reached by toggling the Select button off in the ToolPalette).
//
// Rule under test (see GameCanvas.onPointerDown + ToolPalette.selectTool):
//   • Select tool ACTIVE  → empty-space drag draws the marquee (box multi-select).
//   • Select tool OFF ("pan") → empty-space drag pans; no selection/marquee.
import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Circle } from "../src/Parts/Circle";
import { partsInBox } from "../src/ui/renderer/sceneRenderer";
import type { Part } from "../src/Parts/Part";

function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

describe("marquee box-select (the multi-select path)", () => {
	it("partsInBox returns every editable part intersecting the box (corner order agnostic)", () => {
		const inside = new Circle(0, 0, 1);
		const alsoInside = new Circle(4, 4, 1);
		const outside = new Circle(50, 50, 1);
		const parts = [inside, alsoInside, outside];
		parts.forEach((p, i) => (p.id = i + 1));

		// Box (-5,-5)..(5,5) covers the first two circles only.
		const hits = partsInBox(parts, -5, -5, 5, 5).map((p) => p.id);
		expect(new Set(hits)).toEqual(new Set([1, 2]));

		// Same box, opposite corner order → identical result (min/max normalised).
		const hitsRev = partsInBox(parts, 5, 5, -5, -5).map((p) => p.id);
		expect(new Set(hitsRev)).toEqual(new Set([1, 2]));
	});

	it("box hits committed as a select command multi-select those parts", () => {
		const core = coreWith([new Circle(0, 0, 1), new Circle(4, 4, 1), new Circle(50, 50, 1)]);
		const hits = partsInBox(core.getState().parts, -5, -5, 5, 5);
		core.dispatch({ type: "select", partIds: hits.map((p) => p.id) });
		expect(new Set(core.getState().edit.selection)).toEqual(new Set([1, 2]));
	});

	it("partsInBox skips non-editable terrain (marquee only grabs editable parts)", () => {
		const editable = new Circle(0, 0, 1);
		const terrain = new Circle(2, 2, 1);
		terrain.isEditable = false;
		const parts = [editable, terrain];
		parts.forEach((p, i) => (p.id = i + 1));
		const hits = partsInBox(parts, -5, -5, 5, 5).map((p) => p.id);
		expect(hits).toEqual([1]);
	});
});

describe("Select ↔ pan toggle (deselected pan-only state)", () => {
	it("setTool accepts the deselected 'pan' state and toggles back to select", () => {
		const core = coreWith([new Circle(0, 0, 1)]);
		// Default editing tool is Select.
		expect(core.getState().edit.tool).toBe("select");
		// Toggling Select off → the pan-only state (single-pointer drag pans).
		core.dispatch({ type: "setTool", tool: "pan" });
		expect(core.getState().edit.tool).toBe("pan");
		// Re-selecting Select re-enables the marquee.
		core.dispatch({ type: "setTool", tool: "select" });
		expect(core.getState().edit.tool).toBe("select");
	});
});
