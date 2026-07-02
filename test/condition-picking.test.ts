// CHARACTERIZATION — challenge-editor condition STAGE-PICKING interaction.
//
// Pins the ported interactive picking flow against the legacy source:
//   - startConditionPick computes what to await from subject/object exactly like
//     ConditionsWindow.addWin/LossButtonPressed (:226-268): subject-0 picks
//     shape1 first; obj-0 -> box; obj-1/2 -> horizontal line; obj-3/4 -> vertical
//     line; obj-5/6 -> a second shape.
//   - conditionPickBox applies FinishDrawingCondition's index math verbatim
//     (ConditionsWindow.ts:270-314): box -> min/max of the two corners; obj<3
//     horizontal -> (x1,y1)-(x2,y1); else vertical -> (x1,y1)-(x1,y2).
//   - conditionPickShape mirrors FinishSelectingForCondition (:316-334): shape1
//     is stored then the object pick continues; obj-5/6 shape2 finalizes with the
//     bound shape1/shape2 ids.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import type { Part } from "../src/Parts/Part";

/** A GameCore over a fresh state seeded with the given parts (ids 1..n). */
function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

describe("condition picking — startConditionPick chooses the right awaited pick", () => {
	it("subject-2 obj-0 (all shapes within a box) awaits a box", () => {
		const core = coreWith([]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "startConditionPick", kind: "win", name: "C", subject: 2, object: 0, immediate: false });
		expect(core.getState().conditionDraft?.awaiting).toBe("box");
	});

	it("obj-1/2 await a horizontal line, obj-3/4 a vertical line", () => {
		const core = coreWith([]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "startConditionPick", kind: "win", name: "C", subject: 2, object: 1, immediate: false });
		expect(core.getState().conditionDraft?.awaiting).toBe("hline");
		core.dispatch({ type: "cancelConditionPick" });
		core.dispatch({ type: "startConditionPick", kind: "win", name: "C", subject: 2, object: 3, immediate: false });
		expect(core.getState().conditionDraft?.awaiting).toBe("vline");
	});

	it("subject-0 awaits shape1 first (before the object pick)", () => {
		const core = coreWith([new Circle(0, 0, 1)]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "startConditionPick", kind: "win", name: "C", subject: 0, object: 0, immediate: false });
		expect(core.getState().conditionDraft?.awaiting).toBe("shape1");
	});

	it("cancelConditionPick clears the draft", () => {
		const core = coreWith([]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "startConditionPick", kind: "win", name: "C", subject: 2, object: 0, immediate: false });
		core.dispatch({ type: "cancelConditionPick" });
		expect(core.getState().conditionDraft).toBeNull();
	});
});

describe("condition picking — box pick (FinishDrawingCondition index math)", () => {
	it("obj-0 box: region is min/max of the two corners; draft clears; condition appears", () => {
		const core = coreWith([]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "startConditionPick", kind: "win", name: "Box", subject: 2, object: 0, immediate: false });
		// Draw the box from a bottom-right corner back to a top-left corner to prove
		// the min/max normalisation.
		core.dispatch({ type: "conditionPickBox", x1: 8, y1: 6, x2: 2, y2: 1 });

		expect(core.getState().conditionDraft).toBeNull();
		const ch = core.getLiveChallenge()!;
		expect(ch.winConditions.length).toBe(1);
		const c = ch.winConditions[0];
		expect(c.name).toBe("Box");
		expect(c.subject).toBe(2);
		expect(c.object).toBe(0);
		expect(c.minX).toBe(2);
		expect(c.maxX).toBe(8);
		expect(c.minY).toBe(1);
		expect(c.maxY).toBe(6);
	});

	it("obj-1 horizontal line: (x1,y1)-(x2,y1)", () => {
		const core = coreWith([]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "startConditionPick", kind: "win", name: "H", subject: 2, object: 1, immediate: false });
		core.dispatch({ type: "conditionPickBox", x1: 3, y1: 5, x2: 10, y2: 99 });
		const c = core.getLiveChallenge()!.winConditions[0];
		expect(c.minX).toBe(3);
		expect(c.minY).toBe(5);
		expect(c.maxX).toBe(10);
		expect(c.maxY).toBe(5); // maxY == y1 (horizontal), y2 ignored
	});

	it("obj-3 vertical line: (x1,y1)-(x1,y2)", () => {
		const core = coreWith([]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "startConditionPick", kind: "loss", name: "V", subject: 2, object: 3, immediate: true });
		core.dispatch({ type: "conditionPickBox", x1: 4, y1: 2, x2: 99, y2: 9 });
		const c = core.getLiveChallenge()!.lossConditions[0];
		expect(c.minX).toBe(4);
		expect(c.minY).toBe(2);
		expect(c.maxX).toBe(4); // maxX == x1 (vertical), x2 ignored
		expect(c.maxY).toBe(9);
		expect((c as { immediate: boolean }).immediate).toBe(true);
	});
});

describe("condition picking — shape pick (FinishSelectingForCondition)", () => {
	it("subject-0 obj-1: shape1 pick then a horizontal-line box pick binds shape1 + region", () => {
		const shape = new Circle(0, 0, 1); // id 1
		const core = coreWith([shape]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "startConditionPick", kind: "win", name: "S", subject: 0, object: 1, immediate: false });
		expect(core.getState().conditionDraft?.awaiting).toBe("shape1");

		// Pick shape1 -> now awaits the horizontal line for obj-1.
		core.dispatch({ type: "conditionPickShape", shapeId: 1 });
		expect(core.getState().conditionDraft?.shape1Id).toBe(1);
		expect(core.getState().conditionDraft?.awaiting).toBe("hline");

		// Draw the line -> finalize.
		core.dispatch({ type: "conditionPickBox", x1: 0, y1: -5, x2: 4, y2: 12 });
		expect(core.getState().conditionDraft).toBeNull();
		const c = core.getLiveChallenge()!.winConditions[0];
		expect(c.subject).toBe(0);
		expect(c.object).toBe(1);
		expect(c.shape1).toBe(shape);
		expect(c.minY).toBe(-5);
		expect(c.maxY).toBe(-5); // horizontal
	});

	it("subject-1 obj-5 (touching another shape): a single shape2 pick binds shape2 + finalizes", () => {
		const target = new Rectangle(-1, -1, 2, 2); // id 1
		const core = coreWith([target]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "startConditionPick", kind: "win", name: "Touch", subject: 1, object: 5, immediate: false });
		expect(core.getState().conditionDraft?.awaiting).toBe("shape2");

		core.dispatch({ type: "conditionPickShape", shapeId: 1 });
		expect(core.getState().conditionDraft).toBeNull();
		const c = core.getLiveChallenge()!.winConditions[0];
		expect(c.subject).toBe(1);
		expect(c.object).toBe(5);
		expect(c.shape2).toBe(target);
		expect(c.shape1).toBeNull();
	});

	it("subject-0 obj-6: shape1 then shape2 binds both and finalizes", () => {
		const s1 = new Circle(0, 0, 1); // id 1
		const s2 = new Rectangle(5, 5, 2, 2); // id 2
		const core = coreWith([s1, s2]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({ type: "startConditionPick", kind: "win", name: "Both", subject: 0, object: 6, immediate: false });
		core.dispatch({ type: "conditionPickShape", shapeId: 1 }); // shape1
		expect(core.getState().conditionDraft?.awaiting).toBe("shape2");
		core.dispatch({ type: "conditionPickShape", shapeId: 2 }); // shape2 -> finalize
		expect(core.getState().conditionDraft).toBeNull();
		const c = core.getLiveChallenge()!.winConditions[0];
		expect(c.shape1).toBe(s1);
		expect(c.shape2).toBe(s2);
	});
});
