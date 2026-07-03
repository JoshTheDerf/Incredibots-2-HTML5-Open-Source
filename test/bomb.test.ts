// P2 — IB3 Bomb part (src/Parts/Bomb.ts).
//
// Covers: native-serialization round-trip (robot codes), the delay-fuse state
// machine exploding on the exact frame (Bomb.as Update :173-211), the radial
// blast impulse on a nearby dynamic body (Explode :349-589 against the 2.0.2
// TestSegment API), trigger-list detonation through the Jaybit dispatcher
// (wireTriggers/processTriggers), and explode-on-impact arming
// (CheckImpactDetonation :268-296 + GameCore's markBombImpact contact hook).

import { describe, expect, it } from "vitest";
import { Bomb } from "../src/Parts/Bomb";
import { Circle } from "../src/Parts/Circle";
import { Rectangle } from "../src/Parts/Rectangle";
import { TRIGGER_FIRE } from "../src/Parts/partDefaults";
import { decodeRobot, encodeRobot } from "../src/core/robotSerialization";
import { coreWithParts, getPart } from "./helpers";

/** A bomb whose fuse starts at play (no impact/trigger gate — Bomb.as:591-594). */
function preArmedBomb(x: number, y: number, rad: number, blast: number, delayMs: number): Bomb {
	const bomb = new Bomb(x, y, rad, blast);
	bomb.explodeOnImpact = false;
	bomb.delayAfterImpact = false;
	bomb.delayAfterTrigger = false;
	bomb.delay = delayMs;
	return bomb;
}

describe("Bomb defaults + copy", () => {
	it("carries the Bomb.as ctor defaults (Bomb.as:88-120 / Util.as BO_* defaults)", () => {
		const b = new Bomb(0, 0, 1);
		expect(b.type).toBe("Bomb");
		expect(b.blastRadius).toBe(4); // ctor default param (Bomb.as:88)
		expect(b.strength).toBe(10); // Util.BOStrengthDefault
		expect(b.delay).toBe(2000); // Util.BODelayDefault
		expect(b.repeat).toBe(0); // Util.BORepeatDefault
		expect(b.sensitivity).toBe(95); // Util.BOSensitivityDefault
		expect(b.delayAfterTrigger).toBe(false);
		expect(b.explodeOnImpact).toBe(true);
		expect(b.delayAfterImpact).toBe(true);
		expect(b.repeatable).toBe(false);
		expect(b.sensitive).toBe(false);
		expect(b.deflect).toBe(true);
		expect(b.triggerList).toBe("");
		// COLOR_DEFAULT 0xFAFA00 (Bomb.as:22).
		expect([b.red, b.green, b.blue]).toEqual([250, 250, 0]);
	});

	it("MakeCopy clones every bomb field (Bomb.as Copy/ApplyProperties :298-325)", () => {
		const b = new Bomb(1, 2, 0.8, 7);
		b.strength = 22;
		b.delay = 350;
		b.delayAfterTrigger = true;
		b.explodeOnImpact = false;
		b.delayAfterImpact = false;
		b.repeat = 3;
		b.repeatable = true;
		b.sensitive = true;
		b.sensitivity = 40;
		b.deflect = false;
		b.triggerList = "boom, kaboom";
		const c = b.MakeCopy() as Bomb;
		expect(c).toBeInstanceOf(Bomb);
		expect(c.equals(b)).toBe(true);
	});
});

describe("Bomb serialization round-trip", () => {
	it("robot code round-trips a bomb with non-default fields", async () => {
		const bomb = new Bomb(3, -2, 0.75, 12.5);
		bomb.strength = 33;
		bomb.delay = 1234;
		bomb.delayAfterTrigger = true;
		bomb.explodeOnImpact = false;
		bomb.delayAfterImpact = false;
		bomb.repeat = 2;
		bomb.repeatable = true;
		bomb.sensitive = true;
		bomb.sensitivity = 61;
		bomb.deflect = false;
		bomb.triggerList = "det";
		const buddy = new Circle(8, 8, 1);
		const code = await encodeRobot([bomb, buddy], undefined, "bomb bot", "");
		const decoded = await decodeRobot(code);
		expect(decoded.parts).toHaveLength(2);
		const back = decoded.parts.find((p) => p instanceof Bomb) as Bomb;
		expect(back).toBeDefined();
		expect(back.equals(bomb)).toBe(true);
		// Spot-check the individually persisted fields.
		expect(back.blastRadius).toBeCloseTo(12.5, 5);
		expect(back.strength).toBe(33);
		expect(back.delay).toBe(1234);
		expect(back.triggerList).toBe("det");
		expect(back.repeatable).toBe(true);
		expect(back.repeat).toBe(2);
	});

	it("a default bomb round-trips with defaults intact", async () => {
		const bomb = new Bomb(0, 0, 1);
		const code = await encodeRobot([bomb]);
		const back = (await decodeRobot(code)).parts[0] as Bomb;
		expect(back).toBeInstanceOf(Bomb);
		expect(back.equals(bomb)).toBe(true);
	});
});

describe("Bomb sim — delay fuse", () => {
	it("a pre-armed bomb explodes on exactly the m_delayInFrames-th frame and blasts a nearby box away", () => {
		// delay 500ms == 15 frames at the 30fps sim rate (Bomb.as:127 with
		// Main.frameRate == our two-substep 1/30s frame).
		const bomb = preArmedBomb(0, 0, 1, 6, 500);
		bomb.isStatic = true;
		// A dynamic box to the RIGHT of the bomb, inside the blast radius.
		const box = new Rectangle(1.5, -1, 2, 2); // centre (2.5, 0)
		const { core } = coreWithParts(bomb, box);
		core.dispatch({ type: "play" });

		// One frame before the fuse runs out: still alive.
		core.dispatch({ type: "step", frames: 14 });
		expect(bomb.IsDestroyed()).toBe(false);
		expect(bomb.GetShape()).not.toBeNull();
		const vxBefore = box.GetBody()!.GetLinearVelocity().x;
		expect(Math.abs(vxBefore)).toBeLessThan(0.01); // free fall only

		// The 15th frame: Update sees delayCounter reach 15 -> Explode.
		core.dispatch({ type: "step", frames: 1 });
		expect(bomb.IsDestroyed()).toBe(true);
		expect(bomb.GetShape()).toBeNull(); // body/shape destroyed (Bomb.as:426-455)
		expect(bomb.IsExploding()).toBe(true); // flash timer running

		// The box was pushed AWAY from the bomb (+x, cosine-falloff radial force).
		const vxAfter = box.GetBody()!.GetLinearVelocity().x;
		expect(vxAfter).toBeGreaterThan(0.3);

		// The world keeps stepping cleanly past the destroyed bomb.
		core.dispatch({ type: "step", frames: 30 });
		expect(core.getState().sim.phase).toBe("running");
		expect(bomb.IsExploding()).toBe(false); // 1s flash (30 frames) elapsed
	});

	it("deflect=false still applies the direct blast (single ray pass, no bounces)", () => {
		const bomb = preArmedBomb(0, 0, 1, 6, 100); // 3 frames
		bomb.deflect = false;
		bomb.isStatic = true;
		const box = new Rectangle(1.5, -1, 2, 2);
		const { core } = coreWithParts(bomb, box);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 5 });
		expect(bomb.IsDestroyed()).toBe(true);
		expect(box.GetBody()!.GetLinearVelocity().x).toBeGreaterThan(0.3);
	});
});

describe("Bomb sim — trigger detonation", () => {
	it("a wired trigger source contact detonates the bomb through the Jaybit dispatcher", () => {
		// Bomb far from the action; NOT pre-armed (delayAfterImpact left true),
		// instant fuse once triggered (delay 0, delayAfterTrigger false).
		const bomb = new Bomb(0, 0, 1, 4);
		bomb.isStatic = true;
		bomb.explodeOnImpact = false;
		bomb.delay = 0;
		bomb.triggerList = "det";
		// Trigger source: a falling circle named "det" that lands on a static
		// platform (contact Add -> processTriggers -> Bomb.DoTriggerAction).
		const src = new Circle(10, -1.2, 0.5);
		src.triggerName = "det";
		src.triggerAction = TRIGGER_FIRE;
		const platform = new Rectangle(9, 0, 2, 0.5);
		platform.isStatic = true;
		const { core } = coreWithParts(bomb, src, platform);
		core.dispatch({ type: "play" });

		// Before any contact the bomb must stay dormant.
		core.dispatch({ type: "step", frames: 1 });
		expect(bomb.IsDestroyed()).toBe(false);

		// Let the source fall onto the platform and the trigger fire.
		core.dispatch({ type: "step", frames: 60 });
		expect(bomb.IsDestroyed()).toBe(true);
	});

	it("without a matching triggerList the same scene leaves the bomb alone", () => {
		const bomb = new Bomb(0, 0, 1, 4);
		bomb.isStatic = true;
		bomb.explodeOnImpact = false;
		bomb.delay = 0;
		bomb.triggerList = ""; // not listening
		const src = new Circle(10, -1.2, 0.5);
		src.triggerName = "det";
		src.triggerAction = TRIGGER_FIRE;
		const platform = new Rectangle(9, 0, 2, 0.5);
		platform.isStatic = true;
		const { core } = coreWithParts(bomb, src, platform);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 60 });
		expect(bomb.IsDestroyed()).toBe(false);
	});
});

describe("Bomb sim — explode on impact", () => {
	it("a falling explodeOnImpact bomb detonates shortly after hitting the ground", () => {
		// Default explodeOnImpact=true; delayAfterImpact=false makes the impact
		// shortcut the (long) fuse to 2 frames out (Bomb.as:286-289).
		const bomb = new Bomb(0, -3, 0.5, 4);
		bomb.delayAfterImpact = false;
		const floor = new Rectangle(-2, 0, 4, 1);
		floor.isStatic = true;
		const { core } = coreWithParts(bomb, floor);
		core.dispatch({ type: "play" });

		// Early frames: still airborne, still alive.
		core.dispatch({ type: "step", frames: 5 });
		expect(bomb.IsDestroyed()).toBe(false);

		// Falls ~2 world units (g=15): impact well within 120 frames, then the
		// 2-frame shortcut fuse fires.
		core.dispatch({ type: "step", frames: 115 });
		expect(bomb.IsDestroyed()).toBe(true);

		// Static floor is untouched and the sim keeps running.
		core.dispatch({ type: "step", frames: 10 });
		expect(getPart(core, floor.id)).toBe(floor);
		expect(core.getState().sim.phase).toBe("running");
	});

	it("explodeOnImpact=false ignores the landing (fuse gated on trigger/impact flags)", () => {
		const bomb = new Bomb(0, -3, 0.5, 4);
		bomb.explodeOnImpact = false; // delayAfterImpact stays true -> not pre-armed
		const floor = new Rectangle(-2, 0, 4, 1);
		floor.isStatic = true;
		const { core } = coreWithParts(bomb, floor);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 120 });
		expect(bomb.IsDestroyed()).toBe(false);
		expect(bomb.GetShape()).not.toBeNull();
	});
});
