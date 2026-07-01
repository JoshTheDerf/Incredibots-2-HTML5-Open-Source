// CHARACTERIZATION — physics play/step/reset determinism.
//
// GameCore mirrors ControllerGame's sim: CreateWorld gravity (0,15) +Y down
// (GameCore.ts:42), per-frame Step(1/60,5) then Step(1/60,10) (GameCore.ts:44-45,
// 819-822), SetCollisionGroup + Init on play (GameCore.ts:757-771), UnInit +
// transform-restore on reset (GameCore.ts:789-806). Box2D is deterministic for a
// fixed seed/input, so identical setups must step to identical poses, and reset
// must restore the exact pre-play transform.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Rectangle } from "../src/Parts/Rectangle";
import type { Part } from "../src/Parts/Part";

function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

/** A single falling (non-static) rectangle at a known height. */
function fallingRect(): { core: GameCore; rect: Rectangle } {
	const rect = new Rectangle(0, 0, 2, 2); // centre (1,1)
	const core = coreWith([rect]);
	return { core, rect };
}

/** Read the live body's world position after stepping. */
function bodyPos(rect: Rectangle): { x: number; y: number } {
	const body = rect.GetBody()!;
	const p = body.GetPosition();
	return { x: p.x, y: p.y };
}

describe("play + step determinism", () => {
	it("gravity is +Y (down): a free body's Y increases after stepping", () => {
		const { core, rect } = fallingRect();
		const y0 = rect.centerY;
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 30 });
		const after = bodyPos(rect);
		// +Y is down in world space (GRAVITY.y = +15), so it should have moved down.
		expect(after.y).toBeGreaterThan(y0);
	});

	it("same setup + same frame count -> identical body position (deterministic)", () => {
		const a = fallingRect();
		const b = fallingRect();
		a.core.dispatch({ type: "play" });
		b.core.dispatch({ type: "play" });
		a.core.dispatch({ type: "step", frames: 60 });
		b.core.dispatch({ type: "step", frames: 60 });
		const pa = bodyPos(a.rect);
		const pb = bodyPos(b.rect);
		expect(pa.x).toBe(pb.x);
		expect(pa.y).toBe(pb.y);
	});

	it("stepping 30 then 30 equals stepping 60 in one call (per-frame substeps compose)", () => {
		const split = fallingRect();
		const whole = fallingRect();
		split.core.dispatch({ type: "play" });
		whole.core.dispatch({ type: "play" });
		split.core.dispatch({ type: "step", frames: 30 });
		split.core.dispatch({ type: "step", frames: 30 });
		whole.core.dispatch({ type: "step", frames: 60 });
		expect(bodyPos(split.rect)).toEqual(bodyPos(whole.rect));
	});

	it("sim.frame counter tracks total frames stepped (GameCore.ts:826-829)", () => {
		const { core } = fallingRect();
		core.dispatch({ type: "play" });
		expect(core.getState().sim.frame).toBe(0);
		core.dispatch({ type: "step", frames: 10 });
		core.dispatch({ type: "step", frames: 5 });
		expect(core.getState().sim.frame).toBe(15);
		expect(core.getState().sim.phase).toBe("running");
	});
});

describe("phase transitions & no-op guards", () => {
	it("play->pause stops stepping (step is a no-op while paused, GameCore.ts:817)", () => {
		const { core, rect } = fallingRect();
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 10 });
		const before = bodyPos(rect);
		core.dispatch({ type: "pause" });
		core.dispatch({ type: "step", frames: 10 }); // ignored while paused
		expect(core.getState().sim.phase).toBe("paused");
		expect(bodyPos(rect)).toEqual(before);
	});

	it("step while editing is a no-op (never stepped, no world)", () => {
		const { core } = fallingRect();
		core.dispatch({ type: "step", frames: 5 });
		expect(core.getState().sim.phase).toBe("editing");
		expect(core.getState().sim.frame).toBe(0);
		expect(core.getState().world).toBeNull();
	});
});

describe("reset restores pre-play transforms exactly (GameCore.ts:789-806)", () => {
	it("centre + angle return to their exact edit-space values and world is torn down", () => {
		const rect = new Rectangle(0, 0, 2, 2);
		rect.angle = 0.35;
		const core = coreWith([rect]);
		const x0 = rect.centerX;
		const y0 = rect.centerY;
		const a0 = rect.angle;

		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 45 }); // let it move + rotate
		// mid-sim it has moved
		core.dispatch({ type: "reset" });

		expect(core.getState().sim.phase).toBe("editing");
		expect(core.getState().world).toBeNull();
		const live = core.getState().parts[0] as Rectangle;
		expect(live.centerX).toBe(x0);
		expect(live.centerY).toBe(y0);
		expect(live.angle).toBe(a0);
	});

	it("play->reset->play->step is reproducible (reset yields a clean slate)", () => {
		const rect = new Rectangle(0, 0, 2, 2);
		const core = coreWith([rect]);

		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 40 });
		const run1 = bodyPos(rect);
		core.dispatch({ type: "reset" });
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 40 });
		const run2 = bodyPos(rect);
		expect(run2).toEqual(run1);
	});
});
