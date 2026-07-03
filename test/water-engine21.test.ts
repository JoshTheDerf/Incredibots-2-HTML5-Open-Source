// P1.5b-3 — water & buoyancy under ENGINE 1 (Box2DFlash 2.1a, src/Box2D21).
//
// Mirrors test/water.test.ts (which pins engine 0) but drives the SAME GameCore
// play/step path with the 2.1a backend injected via setPhysicsBackend — the
// test-only engine-selection seam used by engine21-sim.test.ts (default stays
// engine 0, restored in afterEach). This proves the WaterSystem -> PhysicsBackend
// refactor runs the NATIVE src/Box2D21 buoyancy/tide/wave controllers correctly:
// the 2.1a world.Solve steps every registered controller, so buoyancy/drag/tide
// forces apply inside the normal world.Step with no extra plumbing.
//
// Numbers need NOT match engine 0 (different solver/TOI). Assertions are the
// qualitative water behaviours: a buoyant box floats & settles near the surface,
// buoyant=false sinks to the ground, denser water floats the same box higher,
// and the tide surface offset oscillates (the tide math is engine-agnostic —
// same tideFunc closure + dt-accumulated stepTracker in both controllers).

import { afterEach, describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import type { WaterState } from "../src/core/waterSystem";
import { Rectangle } from "../src/Parts/Rectangle";
import { ShapePart } from "../src/Parts/ShapePart";
import type { Part } from "../src/Parts/Part";
import { getPhysicsBackend, setPhysicsBackend } from "../src/Parts/partGlobals";
import { box2d20Backend, box2d21Backend } from "../src/core/physics";

/**
 * A GameCore on the default sandbox (terrain kept) with water enabled + overrides
 * and the given robot parts, running under the ENGINE-1 backend. Oscillations
 * default OFF for determinism; tests opt back in explicitly.
 */
function coreWithWater(water: Partial<WaterState>, ...parts: Part[]): GameCore {
	setPhysicsBackend(box2d21Backend);
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

/** The (single) non-sandbox robot shape after play. */
function robotShape(core: GameCore): ShapePart {
	const p = core
		.getState()
		.parts.find((q) => q instanceof ShapePart && !(q as { isSandbox?: boolean }).isSandbox) as ShapePart;
	expect(p).toBeDefined();
	return p;
}

/** World-space y of a shape part's live body, via the engine-agnostic seam. */
function bodyY(part: ShapePart): number {
	return getPhysicsBackend().bodyTransform(part.GetBody() as never).y;
}
function bodyVel(part: ShapePart): { x: number; y: number } {
	return getPhysicsBackend().bodyVelocity(part.GetBody() as never);
}

/** A 2x2 box centred on (0, 5): fully submerged at rest under surface y=0. */
function box(density = 15): Rectangle {
	const r = new Rectangle(-1, 4, 2, 2);
	r.density = density;
	return r;
}

describe("engine 1 (Box2D 2.1a) water & buoyancy", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	it("a buoyant box floats up and settles near the surface", () => {
		// Box density 15 -> Box2D (d+5)/10 = 2.0; water density 20 -> 2.5 => floats.
		const core = coreWithWater({}, box());
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 600 }); // 20s: settle through the drag.
		const p = robotShape(core);
		const y = bodyY(p);
		const v = bodyVel(p);
		// Settled straddling the surface (y≈0), not sunk to the ground (y≈11).
		expect(Number.isFinite(y)).toBe(true);
		expect(y).toBeGreaterThan(-2.0);
		expect(y).toBeLessThan(3.0);
		// ...and nearly at rest (linear drag 5 damps it).
		expect(Math.hypot(v.x, v.y)).toBeLessThan(0.5);
	});

	it("a buoyant=false box is excluded and sinks to the ground", () => {
		const b = box();
		b.buoyant = false;
		const core = coreWithWater({}, b);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 300 });
		// Resting on the ground top (y=12) => centre ~11 for the 2m box.
		expect(bodyY(robotShape(core))).toBeGreaterThan(9.5);
	});

	it("denser water floats the same box higher (monotonic)", () => {
		const settle = (waterDensity: number): number => {
			const core = coreWithWater({ density: waterDensity }, box());
			core.dispatch({ type: "play" });
			core.dispatch({ type: "step", frames: 600 });
			return bodyY(robotShape(core));
		};
		const yLight = settle(22);
		const yDense = settle(35);
		// +y is down: floating HIGHER means a SMALLER y.
		expect(yDense).toBeLessThan(yLight - 0.1);
		// Both actually float (nowhere near the ground).
		expect(yLight).toBeLessThan(3.0);
	});

	it("the tide surface offset oscillates with the heightOsc amplitude and heightOscSpeed period", () => {
		// Tide math is engine-agnostic (same tideFunc + stepTracker): phase =
		// 2*PI * elapsed_ms / heightOscSpeed => 2000ms = 60 logical frames.
		const core = coreWithWater({ heightOsc: 1, heightOscSpeed: 2000 }, box());
		core.dispatch({ type: "play" });
		const offsets: number[] = [];
		for (let f = 0; f < 60; f++) {
			core.dispatch({ type: "step", frames: 1 });
			offsets.push(core.getState().water!.offset);
		}
		const min = Math.min(...offsets);
		const max = Math.max(...offsets);
		expect(max).toBeGreaterThan(0.8);
		expect(min).toBeLessThan(-0.8);
		expect(max).toBeLessThanOrEqual(1.0 + 1e-9);
		expect(min).toBeGreaterThanOrEqual(-1.0 - 1e-9);
		// It actually oscillates (returns towards start): last sample near 0.
		expect(Math.abs(offsets[offsets.length - 1])).toBeLessThan(0.3);
	});
});
