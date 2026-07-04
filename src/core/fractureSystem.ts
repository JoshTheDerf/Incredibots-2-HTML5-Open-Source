// fractureSystem — impact-focused runtime shatter (superset / prototype).
//
// A node-clean per-step post-processor: during simulation it watches every
// FRAGILE, dynamic shape for a hard collision and, when one lands, replaces the
// shape with a spray of convex polygon FRAGMENTS clustered around the point of
// impact. It talks to the engine ONLY through the PhysicsBackend seam and the
// Part API — no pixi/DOM — so it lives in src/core and rides all three engines.
//
// WHY A VELOCITY PROXY (not contact impulse): the neutral contact hooks
// (PhysicsBackend.ContactHooks) surface only begin/end + the two touching shapes
// — no impulse/force. Rather than thread a new impulse channel through all three
// backends for a prototype, we detect impacts from the per-frame change in a
// body's linear velocity: a hard hit reverses/kills velocity in a single step,
// so |Δv| (minus the small free-fall component) is a good, engine-agnostic proxy
// for collision severity, and its DIRECTION points from the contact into the
// body — i.e. the impact is on the −Δv side, which is exactly where we focus the
// shatter.
//
// LIFECYCLE: fragments are TRANSIENT sim-only bodies (the cannonball pattern) —
// they live in GameCore.simFragments, NOT state.parts, so a reset simply drops
// the list and rebuilds the original shape. The fractured parent stays in
// state.parts but has its body destroyed + shape nulled (the exploded-Bomb
// pattern), so it vanishes for this run and returns on reset.

import { b2Vec2 } from "../Box2D";
import { Circle } from "../Parts/Circle";
import { Polygon } from "../Parts/Polygon";
import { ShapePart } from "../Parts/ShapePart";
import type { PhysicsBackend, Vec2Like } from "./physics/PhysicsBackend";

// --- tuning ----------------------------------------------------------------
/**
 * Impact speed (world units/sec of |Δv|) a fragility-1 shape needs to shatter.
 * The live threshold is BASE / fragility, so fragility 2 halves it, 10 → 1/10th.
 * ~40 means a fragility-1 shape survives all but a violent slam, while a
 * fragility-8 shape (threshold 5) breaks on a modest drop.
 */
export const FRACTURE_BASE_SPEED = 40;
/** Never emit a fragment smaller than this (world² area) — avoids sliver bodies. */
export const FRACTURE_MIN_FRAGMENT_AREA = 0.02;
/** A shape below this area doesn't fracture at all (too small to bother). */
export const FRACTURE_MIN_PARENT_AREA = 0.15;
/** Fragment count floor / ceiling per shatter. */
export const FRACTURE_MIN_FRAGMENTS = 3;
export const FRACTURE_MAX_FRAGMENTS = 12;
/** Fragments inherit this fraction of the parent's fragility (so cascades decay). */
export const FRACTURE_FRAGILITY_FALLOFF = 0.5;
/** Below this fragility a fragment is inert (won't re-shatter) — stops runaway cascades. */
export const FRACTURE_MIN_CASCADE_FRAGILITY = 1;
/** Extra outward scatter speed applied to fragments, scaled by nearness to impact. */
export const FRACTURE_SCATTER_SPEED = 4;
/** Circle shapes are sampled as this many segments before shattering. */
export const FRACTURE_CIRCLE_SEGMENTS = 20;
/** Fragment collision groups start here (a large negative, clear of structure groups). */
const FRAGMENT_GROUP_BASE = -1000000;

/** A plain 2D point used throughout the geometry routines. */
interface Pt {
	x: number;
	y: number;
}

/** One shatter that occurred this step (returned to GameCore for id/bookkeeping). */
export interface FractureResult {
	/** The shape whose body was destroyed + shape nulled (stays in state.parts). */
	parent: ShapePart;
	/** Fresh transient fragment parts (bodies already Init'd into the world). */
	fragments: ShapePart[];
}

// --- small deterministic PRNG (mulberry32) ---------------------------------
// Seeded per-shatter from the impact point so a given fracture is reproducible
// (useful for tests) without reaching for the banned Math.random determinism.
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// --- polygon geometry (self-contained; no external deps) -------------------

/** Shoelace signed area (positive == CCW). */
function signedArea(poly: Pt[]): number {
	let a = 0;
	for (let i = 0, n = poly.length; i < n; i++) {
		const j = (i + 1) % n;
		a += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
	}
	return a / 2;
}

function polygonArea(poly: Pt[]): number {
	return Math.abs(signedArea(poly));
}

/** Area-weighted centroid of a simple polygon. */
function polygonCentroid(poly: Pt[]): Pt {
	let cx = 0;
	let cy = 0;
	let a = 0;
	for (let i = 0, n = poly.length; i < n; i++) {
		const j = (i + 1) % n;
		const cross = poly[i].x * poly[j].y - poly[j].x * poly[i].y;
		a += cross;
		cx += (poly[i].x + poly[j].x) * cross;
		cy += (poly[i].y + poly[j].y) * cross;
	}
	if (Math.abs(a) < 1e-12) {
		// Degenerate — fall back to the vertex average.
		let mx = 0;
		let my = 0;
		for (const p of poly) {
			mx += p.x;
			my += p.y;
		}
		return { x: mx / poly.length, y: my / poly.length };
	}
	a *= 3;
	return { x: cx / a, y: cy / a };
}

/** Even-odd point-in-polygon (works for concave rings). */
function pointInPolygon(px: number, py: number, poly: Pt[]): boolean {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const xi = poly[i].x;
		const yi = poly[i].y;
		const xj = poly[j].x;
		const yj = poly[j].y;
		if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

/** Andrew's monotone-chain convex hull (CCW, no collinear points). */
function convexHull(pts: Pt[]): Pt[] {
	const p = pts.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
	if (p.length < 3) return p;
	const cross = (o: Pt, a: Pt, b: Pt): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
	const lower: Pt[] = [];
	for (const pt of p) {
		while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
		lower.push(pt);
	}
	const upper: Pt[] = [];
	for (let i = p.length - 1; i >= 0; i--) {
		const pt = p[i];
		while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
		upper.push(pt);
	}
	lower.pop();
	upper.pop();
	return lower.concat(upper);
}

/**
 * Clip a convex polygon by the half-plane { p : (p - a)·n <= 0 } (Sutherland–
 * Hodgman against one edge). `n` points OUT of the kept side. Returns the
 * (possibly empty) clipped polygon.
 */
function clipHalfPlane(poly: Pt[], ax: number, ay: number, nx: number, ny: number): Pt[] {
	const out: Pt[] = [];
	const n = poly.length;
	if (n === 0) return out;
	const dist = (p: Pt): number => (p.x - ax) * nx + (p.y - ay) * ny;
	for (let i = 0; i < n; i++) {
		const cur = poly[i];
		const nxt = poly[(i + 1) % n];
		const dc = dist(cur);
		const dn = dist(nxt);
		if (dc <= 0) out.push(cur);
		if (dc <= 0 !== dn <= 0) {
			const t = dc / (dc - dn);
			out.push({ x: cur.x + t * (nxt.x - cur.x), y: cur.y + t * (nxt.y - cur.y) });
		}
	}
	return out;
}

/**
 * The Voronoi cell of `seeds[k]` = intersection of the domain with every
 * perpendicular-bisector half-plane keeping the side nearer to seeds[k].
 */
function voronoiCell(domain: Pt[], seeds: Pt[], k: number): Pt[] {
	let cell = domain;
	const s = seeds[k];
	for (let t = 0; t < seeds.length && cell.length >= 3; t++) {
		if (t === k) continue;
		const o = seeds[t];
		const mx = (s.x + o.x) / 2;
		const my = (s.y + o.y) / 2;
		// Normal points toward the OTHER seed (the clipped-away side).
		cell = clipHalfPlane(cell, mx, my, o.x - s.x, o.y - s.y);
	}
	return cell;
}

/**
 * Shatter a (convex-hull-approximated) shape ring into convex fragment rings,
 * with fragment density concentrated at `impact`. Returns each fragment as an
 * ordered vertex ring. Fragments whose centroid falls outside the TRUE ring
 * (matters only for a concave parent) or that are too small are dropped.
 */
export function shatter(ring: Pt[], impact: Pt, fragmentCount: number, rand: () => number): Pt[][] {
	const hull = convexHull(ring);
	if (hull.length < 3) return [];

	// Bounding box + a characteristic radius, for seed scatter.
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const p of hull) {
		if (p.x < minX) minX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.x > maxX) maxX = p.x;
		if (p.y > maxY) maxY = p.y;
	}
	const extent = Math.max(maxX - minX, maxY - minY);
	if (extent <= 1e-6) return [];

	// Seed placement: most seeds tightly CLUSTERED around the impact (fine shards
	// there) and a few scattered across the shape (bigger chunks away) — this is
	// what focuses the break on the point of impact.
	const seeds: Pt[] = [];
	const nClustered = Math.max(2, Math.round(fragmentCount * 0.65));
	const nBackground = Math.max(1, fragmentCount - nClustered);
	const clusterR = extent * 0.28;
	for (let i = 0; i < nClustered; i++) {
		// Radius biased toward 0 (rand²) so density peaks at the impact.
		const r = clusterR * rand() * rand();
		const a = rand() * Math.PI * 2;
		seeds.push({ x: impact.x + r * Math.cos(a), y: impact.y + r * Math.sin(a) });
	}
	let guard = nBackground * 12;
	while (seeds.length < fragmentCount && guard-- > 0) {
		const p = { x: minX + rand() * (maxX - minX), y: minY + rand() * (maxY - minY) };
		if (pointInPolygon(p.x, p.y, hull)) seeds.push(p);
	}
	if (seeds.length < 2) return [];

	const fragments: Pt[][] = [];
	for (let k = 0; k < seeds.length; k++) {
		const cell = voronoiCell(hull, seeds, k);
		if (cell.length < 3) continue;
		if (polygonArea(cell) < FRACTURE_MIN_FRAGMENT_AREA) continue;
		const c = polygonCentroid(cell);
		// For a concave parent, drop cells whose centre isn't actually inside it.
		if (!pointInPolygon(c.x, c.y, ring)) continue;
		fragments.push(cell);
	}
	return fragments;
}

/** Body-local (origin-relative, angle-0-at-init) outline for any ShapePart. */
function partLocalOutline(part: ShapePart): Pt[] | null {
	if (part instanceof Polygon) {
		const lv = part.GetLocalVertices();
		if (!lv || lv.length < 3) return null;
		return lv.map((v) => ({ x: v.x, y: v.y }));
	}
	if (part instanceof Circle) {
		const r = part.radius;
		const ring: Pt[] = [];
		for (let i = 0; i < FRACTURE_CIRCLE_SEGMENTS; i++) {
			const a = (i / FRACTURE_CIRCLE_SEGMENTS) * Math.PI * 2;
			ring.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
		}
		return ring;
	}
	// Rectangle / Triangle expose angle-applied world vertices via GetVertices();
	// the body was created at (centerX, centerY, angle 0) with those verts baked,
	// so body-local == GetVertices() − centre (stable through the run since the
	// part's edit-space fields aren't touched during sim).
	const gv = (part as unknown as { GetVertices?: () => b2Vec2[] }).GetVertices?.();
	if (gv && gv.length >= 3) return gv.map((v) => ({ x: v.x - part.centerX, y: v.y - part.centerY }));
	return null;
}

/**
 * Ray-march from the ring centroid toward `dir` to the first boundary crossing,
 * giving a boundary impact point. Falls back to the centroid if no crossing.
 */
function boundaryHit(ring: Pt[], cx: number, cy: number, dirX: number, dirY: number): Pt {
	const len = Math.hypot(dirX, dirY) || 1;
	const ux = dirX / len;
	const uy = dirY / len;
	// March out in small steps until we exit the polygon, then back off half a step.
	let extent = 0;
	for (const p of ring) extent = Math.max(extent, Math.hypot(p.x - cx, p.y - cy));
	const steps = 48;
	let lastInside = 0;
	for (let i = 1; i <= steps; i++) {
		const d = (extent * 1.1 * i) / steps;
		if (pointInPolygon(cx + ux * d, cy + uy * d, ring)) lastInside = d;
		else break;
	}
	return { x: cx + ux * lastInside, y: cy + uy * lastInside };
}

/**
 * The runtime shatter watcher. One instance per GameCore, reset each play/reset.
 * Keyed on the live body handle (stable within a run); fragments seed their own
 * velocity so they don't immediately re-fracture.
 */
export class FractureSystem {
	// Previous-frame linear velocity per live body, for the Δv impact proxy.
	private prevVel = new Map<unknown, Vec2Like>();
	private groupCounter = 0;

	/** Clear all per-run state (call on play + reset). */
	public reset(): void {
		this.prevVel.clear();
		this.groupCounter = 0;
	}

	private nextGroup(): number {
		return FRAGMENT_GROUP_BASE - this.groupCounter++;
	}

	/**
	 * Run one post-step pass. `parts` is the live shape list (state.parts); the
	 * returned fractures each carry the consumed parent + its fresh fragments.
	 * `allocId` stamps a unique id onto each fragment. Never fractures during
	 * replay playback (the caller gates on that).
	 */
	public update(
		parts: ShapePart[],
		world: unknown,
		backend: PhysicsBackend,
		gravityX: number,
		gravityY: number,
		dt: number,
		allocId: () => number,
	): FractureResult[] {
		const results: FractureResult[] = [];
		// Free-fall Δv over the two sub-steps we run per frame, subtracted so a
		// falling (not-yet-collided) body never trips the impact threshold.
		const gdvx = gravityX * dt * 2;
		const gdvy = gravityY * dt * 2;

		for (const part of parts) {
			if (!this.eligible(part)) continue;
			const body = part.GetBody();
			if (!body) continue;

			const v = backend.bodyVelocity(body);
			const prev = this.prevVel.get(body);
			this.prevVel.set(body, { x: v.x, y: v.y });
			if (!prev) continue; // need a baseline frame first

			// Collision-induced velocity change (net of gravity).
			const dvx = v.x - prev.x - gdvx;
			const dvy = v.y - prev.y - gdvy;
			const speed = Math.hypot(dvx, dvy);
			const threshold = FRACTURE_BASE_SPEED / Math.max(1e-3, part.fragility);
			if (speed <= threshold) continue;

			const result = this.fracturePart(part, body, backend, world, dvx, dvy, speed, threshold, v, allocId);
			if (result) results.push(result);
		}
		return results;
	}

	/** Only dynamic, jointless, non-sandbox fragile shapes with a live body qualify. */
	private eligible(part: ShapePart): boolean {
		if (!part.isEnabled || part.isInitted !== true) return false;
		if (part.fragility <= 0) return false;
		if (part.isStatic || part.isSandbox || part.terrain) return false;
		if (!part.GetBody() || part.GetShape() == null) return false;
		// A welded / jointed / thrustered part shares a body or drives constraints;
		// shattering it would dangle those — out of scope for the prototype.
		if (part.GetActiveJoints().length > 0 || part.GetActiveThrusters().length > 0) return false;
		// Circle / Rectangle / Triangle / Polygon only.
		return partLocalOutline(part) != null;
	}

	private fracturePart(
		part: ShapePart,
		body: unknown,
		backend: PhysicsBackend,
		world: unknown,
		dvx: number,
		dvy: number,
		speed: number,
		threshold: number,
		parentVel: Vec2Like,
		allocId: () => number,
	): FractureResult | null {
		const local = partLocalOutline(part);
		if (!local) return null;

		// Live pose → world-space outline.
		const xf = backend.bodyTransform(body);
		const cos = Math.cos(xf.angle);
		const sin = Math.sin(xf.angle);
		const worldRing: Pt[] = local.map((v) => ({
			x: xf.x + v.x * cos - v.y * sin,
			y: xf.y + v.x * sin + v.y * cos,
		}));
		if (polygonArea(worldRing) < FRACTURE_MIN_PARENT_AREA) return null;

		// Impact is on the side OPPOSITE the velocity change (the contact pushed the
		// body in +Δv, so the surface it struck lies in −Δv).
		const c = polygonCentroid(worldRing);
		const impact = boundaryHit(worldRing, c.x, c.y, -dvx, -dvy);

		// Harder hits + higher fragility → more shards.
		const over = speed / threshold; // > 1
		let count = Math.round(FRACTURE_MIN_FRAGMENTS + (over - 1) * part.fragility * 1.5);
		count = Math.max(FRACTURE_MIN_FRAGMENTS, Math.min(FRACTURE_MAX_FRAGMENTS, count));

		const seed = Math.abs(Math.round(impact.x * 73856093 + impact.y * 19349663 + count)) >>> 0;
		const cells = shatter(worldRing, impact, count, mulberry32(seed || 1));
		if (cells.length < 2) return null; // nothing useful to split into

		// Consume the parent: destroy its physics presence (exploded-Bomb pattern)
		// so it vanishes for this run but stays in state.parts for reset.
		part.ConsumeForFracture(world as never);

		const childFragility =
			part.fragility * FRACTURE_FRAGILITY_FALLOFF >= FRACTURE_MIN_CASCADE_FRAGILITY
				? part.fragility * FRACTURE_FRAGILITY_FALLOFF
				: 0;
		const group = this.nextGroup();

		const fragments: ShapePart[] = [];
		for (const cell of cells) {
			const frag = this.buildFragment(cell, part, childFragility, group, allocId);
			if (!frag) continue;
			frag.Init(world as never);
			const fbody = frag.GetBody();
			if (!fbody) continue;

			// Fragments spawn overlapping; the shared negative group stops them from
			// exploding apart via overlap resolution — they scatter via velocity
			// instead (they still collide with the world / other robots).
			const fc = polygonCentroid(cell);
			const kick = FRACTURE_SCATTER_SPEED;
			let ox = fc.x - impact.x;
			let oy = fc.y - impact.y;
			const olen = Math.hypot(ox, oy) || 1;
			ox /= olen;
			oy /= olen;
			// Nearer to the impact → bigger kick.
			const nearness = Math.max(0.2, 1 - olen / (Math.hypot(c.x - impact.x, c.y - impact.y) + 1e-6));
			const vx = parentVel.x + ox * kick * nearness;
			const vy = parentVel.y + oy * kick * nearness;
			const mass = (fbody as { GetMass?: () => number }).GetMass?.() ?? 1;
			backend.applyImpulse(fbody, { x: vx * mass, y: vy * mass }, { x: fc.x, y: fc.y });
			// Seed the fragment's baseline velocity so it doesn't re-fracture next frame.
			this.prevVel.set(fbody, { x: vx, y: vy });
			fragments.push(frag);
		}

		if (fragments.length === 0) return null;
		return { parent: part, fragments };
	}

	/** Build one fragment Polygon inheriting the parent's material + appearance. */
	private buildFragment(
		cell: Pt[],
		parent: ShapePart,
		fragility: number,
		group: number,
		allocId: () => number,
	): Polygon | null {
		const verts = cell.map((p) => new b2Vec2(p.x, p.y));
		if (!Polygon.isSimple(verts) || polygonArea(cell) < FRACTURE_MIN_FRAGMENT_AREA) return null;
		const frag = new Polygon(verts);
		// Material + appearance from the parent.
		frag.density = parent.density;
		frag.friction = parent.friction;
		frag.restitution = parent.restitution;
		frag.red = parent.red;
		frag.green = parent.green;
		frag.blue = parent.blue;
		frag.opacity = parent.opacity;
		frag.outline = parent.outline;
		frag.collide = parent.collide;
		frag.collA = parent.collA;
		frag.collB = parent.collB;
		frag.collC = parent.collC;
		frag.collD = parent.collD;
		frag.buoyant = parent.buoyant;
		// Superset Part fields.
		frag.graphicType = parent.graphicType;
		frag.borderOpacity = parent.borderOpacity;
		frag.scaleToZoom = parent.scaleToZoom;
		frag.fragility = fragility;
		// Distinct negative group so a shatter's shards don't collide with each other.
		frag.m_collisionGroup = group;
		frag.id = allocId();
		return frag;
	}
}

/** Exposed for tests. */
export const FRACTURE_TEST = { shatter, polygonArea, pointInPolygon, convexHull, mulberry32, boundaryHit };
