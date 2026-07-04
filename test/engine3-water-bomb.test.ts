// E3-3 — water/buoyancy + Bomb under ENGINE 2 (Box2D v3, box2d3-wasm compat).
//
// Mirrors test/water-engine21.test.ts (the buoyancy/tide behaviours) and the
// bomb-delay sim case from test/bomb.test.ts, but drives the SAME GameCore
// play/step path with the v3 backend injected via setPhysicsBackend (default
// stays engine 0, restored in afterEach). The wasm module is loaded async in
// beforeAll (E3-1/E3-2 pattern).
//
// v3 has NO controller framework, so the water forces are applied MANUALLY in
// Box2D3Backend.step (ported b2BuoyancyController/b2TideController math). Numbers
// need NOT match engines 0/1 (different solver) — assertions are the qualitative
// water behaviours + a stable, cross-engine bomb blast.

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { box2d20Backend } from "../src/core/physics";
import type { WaterState } from "../src/core/waterSystem";
import { Box2D3Backend } from "../src/enginebox2d3/Box2D3Backend";
import { loadBox2D3 } from "../src/enginebox2d3/loadBox2D3";
import type { Part } from "../src/Parts/Part";
import { Bomb } from "../src/Parts/Bomb";
import { Rectangle } from "../src/Parts/Rectangle";
import { ShapePart } from "../src/Parts/ShapePart";
import { getPhysicsBackend, setPhysicsBackend } from "../src/Parts/partGlobals";

let backend: Box2D3Backend;

beforeAll(async () => {
	backend = new Box2D3Backend(await loadBox2D3());
});

/** A GameCore on the default sandbox with water enabled + overrides, engine 2. */
function coreWithWater(water: Partial<WaterState>, ...parts: Part[]): GameCore {
	setPhysicsBackend(backend);
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

/** A bomb whose fuse starts at play (no impact/trigger gate — Bomb.as:591-594). */
function preArmedBomb(x: number, y: number, rad: number, blast: number, delayMs: number): Bomb {
	const bomb = new Bomb(x, y, rad, blast);
	bomb.explodeOnImpact = false;
	bomb.delayAfterImpact = false;
	bomb.delayAfterTrigger = false;
	bomb.delay = delayMs;
	return bomb;
}

describe("engine 2 (Box2D v3) water & buoyancy", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	it("a buoyant box floats up and settles near the surface", () => {
		// Box density 15 -> (d+5)/10 = 2.0; water density 20 -> 2.5 => floats.
		const core = coreWithWater({}, box());
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 600 }); // 20s: settle through the drag.
		const p = robotShape(core);
		const y = bodyY(p);
		const v = bodyVel(p);
		expect(Number.isFinite(y)).toBe(true);
		// Straddling the surface (y≈0), not sunk to the ground (y≈11).
		expect(y).toBeGreaterThan(-3.0);
		expect(y).toBeLessThan(4.0);
		// ...and nearly at rest (linear drag damps it).
		expect(Math.hypot(v.x, v.y)).toBeLessThan(1.0);
	});

	it("a buoyant=false box is excluded and sinks to the ground", () => {
		const b = box();
		b.buoyant = false;
		const core = coreWithWater({}, b);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 300 });
		// Resting on the ground top (y=12) => centre ~11 for the 2m box.
		expect(bodyY(robotShape(core))).toBeGreaterThan(9.0);
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
		expect(yDense).toBeLessThan(yLight - 0.05);
		// Both actually float (nowhere near the ground).
		expect(yLight).toBeLessThan(4.0);
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

describe("engine 2 (Box2D v3) bomb", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	function coreWith(parts: Part[]): GameCore {
		parts.forEach((p, i) => (p.id = i + 1));
		const state = createInitialState();
		state.parts = parts;
		return new GameCore(state);
	}

	it("a pre-armed bomb explodes on its fuse frame and blasts a nearby box away", () => {
		setPhysicsBackend(backend);
		// delay 500ms == 15 frames at the 30fps sim rate.
		const bomb = preArmedBomb(0, 0, 1, 6, 500);
		bomb.isStatic = true;
		// A dynamic box to the RIGHT of the bomb, inside the blast radius.
		const box = new Rectangle(1.5, -1, 2, 2); // centre (2.5, 0)
		const core = coreWith([bomb, box]);
		core.dispatch({ type: "play" });

		// One frame before the fuse runs out: still alive, box barely moving.
		core.dispatch({ type: "step", frames: 14 });
		expect(bomb.IsDestroyed()).toBe(false);
		expect(bomb.GetShape()).not.toBeNull();
		const vxBefore = getPhysicsBackend().bodyVelocity(box.GetBody() as never).x;
		expect(Math.abs(vxBefore)).toBeLessThan(0.1);

		// The fuse frame: Explode.
		core.dispatch({ type: "step", frames: 1 });
		expect(bomb.IsDestroyed()).toBe(true);
		expect(bomb.GetShape()).toBeNull(); // body/shape destroyed
		expect(bomb.IsExploding()).toBe(true); // flash timer running

		// The box was pushed AWAY from the bomb (+x, cosine-falloff radial force).
		const vxAfter = getPhysicsBackend().bodyVelocity(box.GetBody() as never).x;
		expect(vxAfter).toBeGreaterThan(0.3);

		// The world keeps stepping cleanly past the destroyed bomb.
		core.dispatch({ type: "step", frames: 30 });
		expect(core.getState().sim.phase).toBe("running");
		expect(bomb.IsExploding()).toBe(false); // 1s flash (30 frames) elapsed
	});

	it("stays stable under BOTH engines (blast pushes the box in +x on each)", () => {
		function run(be: typeof backend | typeof box2d20Backend): number {
			setPhysicsBackend(be);
			const bomb = preArmedBomb(0, 0, 1, 6, 100); // 3 frames
			bomb.isStatic = true;
			const box = new Rectangle(1.5, -1, 2, 2);
			const core = coreWith([bomb, box]);
			core.dispatch({ type: "play" });
			core.dispatch({ type: "step", frames: 5 });
			expect(bomb.IsDestroyed()).toBe(true);
			return getPhysicsBackend().bodyVelocity(box.GetBody() as never).x;
		}
		const e0 = run(box2d20Backend);
		const e2 = run(backend);
		expect(e0).toBeGreaterThan(0.3);
		expect(e2).toBeGreaterThan(0.3);
	});
});
