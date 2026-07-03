// Render-side interpolation between fixed 30fps physics steps.
//
// The sim advances at EXACTLY 30 steps/sec (replay determinism depends on it)
// while the pixi ticker renders at the display refresh rate (60/120/144Hz).
// Drawing bodies at their raw post-step transforms makes motion visibly "step"
// at 30fps on faster displays. This module snapshots every body's pose BEFORE
// each sim step (the "previous" state) and, at render time, produces transforms
// at `prev + alpha * (curr - prev)` where alpha is the accumulator leftover
// (0..1) after stepping — classic fixed-timestep interpolation.
//
// This lives UI-side on purpose: the headless core stays step/replay
// deterministic and never sees render state. The module itself is pixi-free
// (only Box2D math types) so it is unit-testable under node.

import { b2XForm } from "../../Box2D";
import type { b2Body, b2World } from "../../Box2D";

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/**
 * Angle interpolation along the SHORTEST arc, so a body whose angle wraps
 * (e.g. +179deg -> -179deg) rotates 2deg the short way rather than 358deg the
 * long way. Returns an angle equivalent to the interpolant (not normalized).
 */
export function lerpAngle(a: number, b: number, t: number): number {
	let d = b - a;
	while (d > Math.PI) d -= 2 * Math.PI;
	while (d < -Math.PI) d += 2 * Math.PI;
	return a + d * t;
}

/** A body's pose at snapshot time: origin transform + world (mass) centre. */
interface BodyPose {
	x: number;
	y: number;
	angle: number;
	cx: number;
	cy: number;
}

/**
 * Captures per-body pose snapshots before each sim step and serves interpolated
 * transforms to the renderer. Keyed by b2Body identity, so a body created
 * mid-step (cannonballs) simply has no snapshot and is drawn raw until the next
 * capture; a world rebuild (play/reset/load) naturally invalidates everything
 * because `snapshot` rebuilds the map from the live body list each call (and
 * callers `clear()` whenever the sim is not running).
 */
export class RenderInterpolator {
	private prev = new Map<b2Body, BodyPose>();
	// Scratch transform returned by getXForm — one per interpolator, valid until
	// the next getXForm call. Draw consumes each transform immediately (it reads
	// the xf synchronously while painting one shape), so reuse is safe and avoids
	// per-shape-per-frame allocations.
	private scratch = new b2XForm();

	/** True once at least one pre-step snapshot has been captured. */
	public hasSnapshot(): boolean {
		return this.prev.size > 0;
	}

	/**
	 * Capture every body's pose from the live world. Call IMMEDIATELY BEFORE each
	 * sim step so the map always holds the state one step behind the bodies.
	 */
	public snapshot(world: b2World): void {
		const next = new Map<b2Body, BodyPose>();
		for (let b = world.GetBodyList(); b; b = b.GetNext()) {
			const p = b.GetPosition();
			const c = b.GetWorldCenter();
			next.set(b, { x: p.x, y: p.y, angle: b.GetAngle(), cx: c.x, cy: c.y });
		}
		this.prev = next;
	}

	/** Drop all snapshots (on reset/play/load, or whenever the sim is not running). */
	public clear(): void {
		this.prev.clear();
	}

	/**
	 * The body's render transform at blend factor `alpha` (0 = previous step,
	 * 1 = current step). Bodies with no snapshot (created mid-step, e.g.
	 * cannonballs) return their RAW current transform. The returned b2XForm is a
	 * shared scratch object — consume it before the next call.
	 */
	public getXForm(body: b2Body, alpha: number): b2XForm {
		const prev = this.prev.get(body);
		if (!prev) return body.GetXForm();
		const cur = body.GetPosition();
		this.scratch.position.Set(lerp(prev.x, cur.x, alpha), lerp(prev.y, cur.y, alpha));
		this.scratch.R.Set(lerpAngle(prev.angle, body.GetAngle(), alpha));
		return this.scratch;
	}

	/**
	 * The body's interpolated WORLD (mass) centre — the point the camera-follow
	 * pins to the screen focus (GameCore.handleCamera uses GetWorldCenter). Falls
	 * back to the raw centre when no snapshot exists.
	 */
	public worldCenter(body: b2Body, alpha: number): { x: number; y: number } {
		const cur = body.GetWorldCenter();
		const prev = this.prev.get(body);
		if (!prev) return { x: cur.x, y: cur.y };
		return { x: lerp(prev.cx, cur.x, alpha), y: lerp(prev.cy, cur.y, alpha) };
	}
}
