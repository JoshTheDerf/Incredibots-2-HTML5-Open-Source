// P3 — IB3 water & buoyancy (src/core/waterSystem.ts + the Box2DFlash 2.1a
// controller backport in src/Box2D/Dynamics/Controllers).
//
// Covers: a buoyant box floating up to the surface, buoyant=false opting a
// part out (it sinks to the ground), water density monotonicity (denser water
// floats the same box higher), the tide surface-height oscillation
// (WaterControl tideFunc period = heightOscSpeed ms), and linear drag slowing
// a submerged moving body relative to a zero-drag baseline.
//
// World geometry reminder (+y is DOWN): the default SMALL/LAND sandbox ground
// top is at y = 12 (sandboxEnvironment.ts:109) and the water surface sits at
// world y = waterHeight (default 0), with the water occupying y > height. A
// box centred at y = 5 therefore starts fully submerged, ~5m under the
// surface and ~6m above the ground.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import type { WaterState } from "../src/core/waterSystem";
import { Rectangle } from "../src/Parts/Rectangle";
import { ShapePart } from "../src/Parts/ShapePart";
import type { Part } from "../src/Parts/Part";
import { b2Vec2 } from "../src/Box2D";

/**
 * A GameCore on the default sandbox (terrain kept, so the ground exists) with
 * water enabled + overrides, plus the given robot parts. Oscillations default
 * OFF for determinism; tests opt back in explicitly.
 */
function coreWithWater(water: Partial<WaterState>, ...parts: Part[]): GameCore {
	const state = createInitialState();
	parts.forEach((p, i) => {
		p.id = 1000 + i;
	});
	state.parts = [...state.parts, ...parts];
	state.sandbox = {
		...state.sandbox,
		water: {
			...state.sandbox.water,
			enabled: true,
			heightOsc: 0,
			tiltOsc: 0,
			...water,
		},
	};
	return new GameCore(state);
}

/** The (single) non-sandbox robot shape after play, with its live body. */
function robotShape(core: GameCore): ShapePart {
	const p = core
		.getState()
		.parts.find((q) => q instanceof ShapePart && !(q as { isSandbox?: boolean }).isSandbox) as ShapePart;
	expect(p).toBeDefined();
	return p;
}

/** A 2x2 box centred on (0, 5): fully submerged at rest under surface y=0. */
function box(density = 15): Rectangle {
	const r = new Rectangle(-1, 4, 2, 2);
	r.density = density;
	return r;
}

describe("buoyancy", () => {
	it("a buoyant box floats up and settles near the surface", () => {
		// Box density 15 -> Box2D 2.0 (Circle.ts:66 (d+5)/10); water density 20
		// -> 2.5 (Util.DensityToBox2D) => the box floats, ~80% submerged: a 2m
		// box's equilibrium centre sits ~0.6m below the y=0 surface.
		const core = coreWithWater({}, box());
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 600 }); // 20s: settle through the drag.
		const body = robotShape(core).GetBody()!;
		const y = body.GetPosition().y;
		const v = body.GetLinearVelocity();
		// Settled straddling the surface, not at the ground (y=11) nor flung out.
		expect(y).toBeGreaterThan(-1.0);
		expect(y).toBeLessThan(2.0);
		// ...and nearly at rest (default linear drag 5 damps it hard).
		expect(Math.hypot(v.x, v.y)).toBeLessThan(0.3);
	});

	it("a buoyant=false box is excluded and sinks to the ground", () => {
		const b = box();
		b.buoyant = false;
		const core = coreWithWater({}, b);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 300 });
		const body = robotShape(core).GetBody()!;
		// Resting on the ground top (y=12) => centre ~11 for the 2m box.
		expect(body.GetPosition().y).toBeGreaterThan(9.5);
	});

	it("denser water floats the same box higher (monotonic)", () => {
		const settle = (waterDensity: number): number => {
			const core = coreWithWater({ density: waterDensity }, box());
			core.dispatch({ type: "play" });
			core.dispatch({ type: "step", frames: 600 });
			return robotShape(core).GetBody()!.GetPosition().y;
		};
		const yLight = settle(22); // box2d 2.7 vs box 2.0
		const yDense = settle(35); // box2d 4.0 vs box 2.0
		// +y is down: floating HIGHER means a SMALLER y.
		expect(yDense).toBeLessThan(yLight - 0.1);
		// Both actually float (nowhere near the ground).
		expect(yLight).toBeLessThan(2.0);
	});
});

describe("tide oscillation", () => {
	it("the surface offset oscillates with the heightOsc amplitude and heightOscSpeed period", () => {
		// heightOscSpeed is the period in ms (WaterControl tideFunc: phase =
		// 2*PI * elapsed_ms / heightOscSpeed) => 2000ms = 60 logical frames.
		const core = coreWithWater({ heightOsc: 1, heightOscSpeed: 2000 }, box());
		core.dispatch({ type: "play" });
		const offsets: number[] = [];
		for (let f = 0; f < 60; f++) {
			core.dispatch({ type: "step", frames: 1 });
			offsets.push(core.getState().water!.offset);
		}
		const min = Math.min(...offsets);
		const max = Math.max(...offsets);
		// One full period sweeps ~[-1, +1] around -height=0 (sampled at 30fps,
		// so the extremes are near but not exactly ±1).
		expect(max).toBeGreaterThan(0.8);
		expect(min).toBeLessThan(-0.8);
		expect(max).toBeLessThanOrEqual(1.0 + 1e-9);
		expect(min).toBeGreaterThanOrEqual(-1.0 - 1e-9);
		// It actually oscillates (returns towards start): last sample near 0.
		expect(Math.abs(offsets[offsets.length - 1])).toBeLessThan(0.3);
	});
});

describe("linear drag", () => {
	it("slows a moving submerged body vs a zero-drag baseline", () => {
		const runWithDrag = (linearDrag: number): number => {
			// A slightly-sinking box (density 25 -> 3.0 vs water 2.5) so it stays
			// submerged while coasting horizontally.
			const core = coreWithWater({ linearDrag, angularDrag: 0 }, box(25));
			core.dispatch({ type: "play" });
			const body = robotShape(core).GetBody()!;
			body.SetLinearVelocity(new b2Vec2(5, 0));
			core.dispatch({ type: "step", frames: 15 }); // 0.5s
			return body.GetLinearVelocity().x;
		};
		const vxNoDrag = runWithDrag(0);
		const vxDrag = runWithDrag(5);
		// Zero drag: no horizontal water force at all — vx unchanged.
		expect(vxNoDrag).toBeCloseTo(5, 3);
		// Drag 5 over a 4m² box decelerates hard within half a second.
		expect(vxDrag).toBeLessThan(vxNoDrag - 1.5);
	});
});
