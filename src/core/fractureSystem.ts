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
import type { ContactImpact, PhysicsBackend } from "./physics/PhysicsBackend";

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

/**
 * The angle-applied WORLD outline of a shape in its EDIT (rest) pose — used once
 * per part to capture its body-local outline (see captureRest). Polygon uses its
 * tessellated (curve-aware) ring; Circle an N-gon; Rectangle/Triangle their
 * GetVertices(). Returns null for shapes we can't fracture (no vertices).
 */
function editWorldOutline(part: ShapePart): Pt[] | null {
	if (part instanceof Polygon) {
		const v = part.GetTessellatedVertices();
		return v && v.length >= 3 ? v.map((p) => ({ x: p.x, y: p.y })) : null;
	}
	if (part instanceof Circle) {
		const r = part.radius;
		const ring: Pt[] = [];
		for (let i = 0; i < FRACTURE_CIRCLE_SEGMENTS; i++) {
			const a = (i / FRACTURE_CIRCLE_SEGMENTS) * Math.PI * 2;
			ring.push({ x: part.centerX + r * Math.cos(a), y: part.centerY + r * Math.sin(a) });
		}
		return ring;
	}
	// Rectangle / Triangle expose angle-applied WORLD vertices via GetVertices().
	const gv = (part as unknown as { GetVertices?: () => b2Vec2[] }).GetVertices?.();
	return gv && gv.length >= 3 ? gv.map((v) => ({ x: v.x, y: v.y })) : null;
}

/**
 * A recorded impact on a fragile part this step: the strongest contact speed and
 * its world point (kept for shatter focus).
 */
interface Impact {
	speed: number;
	x: number;
	y: number;
}

/**
 * The runtime shatter watcher (one per GameCore, reset each play/reset). Driven
 * by REAL contact impulses surfaced through the PhysicsBackend seam
 * (ContactHooks.onImpact) rather than a velocity proxy:
 *   - beginFrame(parts): before each step, capture rest outlines + build the
 *     fragile-shape lookup and clear the per-step impact accumulator.
 *   - recordImpact(impact): called DURING step() by the contact hook; keeps the
 *     strongest impact speed + point per fragile part (by shape identity).
 *   - applyFractures(...): after step(), shatter every part whose impact exceeds
 *     FRACTURE_BASE_SPEED / fragility, at the exact contact point.
 */
export class FractureSystem {
	// Rest body-local outline per part (origin-relative, captured at rest angle 0),
	// so a moved/rotated/welded body's live outline = xform · local.
	private bodyLocal = new Map<ShapePart, Pt[]>();
	// This frame's fragile shape handles -> part (shape identity == part.GetShape()).
	private shapeToPart = new Map<unknown, ShapePart>();
	// Strongest impact this step per fragile part.
	private impacts = new Map<ShapePart, Impact>();
	private groupCounter = 0;

	/** Clear all per-run state (call on play + reset). */
	public reset(): void {
		this.bodyLocal.clear();
		this.shapeToPart.clear();
		this.impacts.clear();
		this.groupCounter = 0;
	}

	private nextGroup(): number {
		return FRAGMENT_GROUP_BASE - this.groupCounter++;
	}

	/** Basic fracture eligibility (independent of a captured outline). */
	private fracturable(part: ShapePart): boolean {
		if (!part.isEnabled || part.isInitted !== true) return false;
		if (part.fragility <= 0) return false;
		if (part.isStatic || part.isSandbox || part.terrain) return false;
		return !!part.GetBody() && part.GetShape() != null;
	}

	/**
	 * Before each step: (re)build the fragile-shape lookup, lazily capturing each
	 * fragile part's rest body-local outline (the first beginFrame runs BEFORE the
	 * first step, and a fragment's first beginFrame runs before it has stepped, so
	 * both capture a true rest pose — angle 0, body at its Init origin), and clear
	 * the per-step impact accumulator.
	 */
	public beginFrame(parts: ShapePart[], backend: PhysicsBackend): void {
		this.shapeToPart.clear();
		this.impacts.clear();
		for (const part of parts) {
			if (!this.fracturable(part)) continue;
			this.captureRest(part, backend);
			if (!this.bodyLocal.has(part)) continue;
			// Register EVERY collision fixture (a concave Polygon has several) so a
			// contact on any of them attributes the impact to this part.
			for (const shape of part.GetCollisionShapes()) this.shapeToPart.set(shape, part);
		}
	}

	/** Capture a part's rest body-local outline (once); no-op if already captured. */
	private captureRest(part: ShapePart, backend: PhysicsBackend): void {
		if (this.bodyLocal.has(part)) return;
		const body = part.GetBody();
		if (!body) return;
		const world = editWorldOutline(part);
		if (!world) return;
		// At rest the body sits at its Init origin with angle 0, so body-local ==
		// edit-world − origin (rotation is identity). The live outline later rotates
		// these by the body's current angle around its current position.
		const xf = backend.bodyTransform(body);
		this.bodyLocal.set(
			part,
			world.map((p) => ({ x: p.x - xf.x, y: p.y - xf.y })),
		);
	}

	/**
	 * Record a solved-contact impact (called DURING step by the contact hook). We
	 * key by SHAPE identity — the same handle the part stored via GetShape() — so
	 * a hit on one welded part of a shared body is attributed to THAT part.
	 */
	public recordImpact(impact: ContactImpact): void {
		this.consider(impact.shape1, impact);
		this.consider(impact.shape2, impact);
	}

	private consider(shape: unknown, impact: ContactImpact): void {
		const part = this.shapeToPart.get(shape);
		if (!part) return;
		const prev = this.impacts.get(part);
		if (!prev || impact.speed > prev.speed) this.impacts.set(part, { speed: impact.speed, x: impact.x, y: impact.y });
	}

	/**
	 * After each step: shatter every fragile part whose strongest impact this step
	 * exceeded its threshold (FRACTURE_BASE_SPEED / fragility), at the exact
	 * contact point. Returns the consumed parents + their fresh fragments.
	 */
	public applyFractures(world: unknown, backend: PhysicsBackend, allocId: () => number): FractureResult[] {
		if (this.impacts.size === 0) return [];
		const results: FractureResult[] = [];
		for (const [part, imp] of this.impacts) {
			if (!this.fracturable(part) || !this.bodyLocal.has(part)) continue;
			const threshold = FRACTURE_BASE_SPEED / Math.max(1e-3, part.fragility);
			if (imp.speed <= threshold) continue;
			const result = this.fracturePart(part, backend, world, imp, threshold, allocId);
			if (result) results.push(result);
		}
		this.impacts.clear();
		return results;
	}

	private fracturePart(
		part: ShapePart,
		backend: PhysicsBackend,
		world: unknown,
		imp: Impact,
		threshold: number,
		allocId: () => number,
	): FractureResult | null {
		const local = this.bodyLocal.get(part);
		const body = part.GetBody();
		if (!local || !body) return null;

		// Live pose → world-space outline (works for welded bodies too: `local` is
		// relative to the SHARED body origin captured at rest).
		const xf = backend.bodyTransform(body);
		const cos = Math.cos(xf.angle);
		const sin = Math.sin(xf.angle);
		const worldRing: Pt[] = local.map((v) => ({
			x: xf.x + v.x * cos - v.y * sin,
			y: xf.y + v.x * sin + v.y * cos,
		}));
		if (polygonArea(worldRing) < FRACTURE_MIN_PARENT_AREA) return null;

		// The exact contact point (recorded during the step) is the shatter focus.
		// Clamp it into the ring so a slightly-outside contact still focuses sanely.
		let impact: Pt = { x: imp.x, y: imp.y };
		if (!pointInPolygon(impact.x, impact.y, worldRing)) {
			const c = polygonCentroid(worldRing);
			impact = { x: (impact.x + c.x) / 2, y: (impact.y + c.y) / 2 };
		}

		// Harder hits + higher fragility → more shards.
		const over = imp.speed / threshold; // > 1
		let count = Math.round(FRACTURE_MIN_FRAGMENTS + (over - 1) * part.fragility * 1.5);
		count = Math.max(FRACTURE_MIN_FRAGMENTS, Math.min(FRACTURE_MAX_FRAGMENTS, count));

		const seed = Math.abs(Math.round(impact.x * 73856093 + impact.y * 19349663 + count)) >>> 0;
		const cells = shatter(worldRing, impact, count, mulberry32(seed || 1));
		if (cells.length < 2) return null; // nothing useful to split into

		// Parent linear velocity (for fragment inheritance) BEFORE we destroy it.
		const parentVel = backend.bodyVelocity(body);

		// Consume the parent: destroy its physics presence (exploded-Bomb pattern) +
		// split off its joints/thrusters; a welded neighbour keeps the shared body.
		part.ConsumeForFracture(world as never);
		// This part's shape handle is gone — drop it from the lookup so a stale
		// entry can't re-attribute a later impact to it.
		this.bodyLocal.delete(part);

		const childFragility =
			part.fragility * FRACTURE_FRAGILITY_FALLOFF >= FRACTURE_MIN_CASCADE_FRAGILITY
				? part.fragility * FRACTURE_FRAGILITY_FALLOFF
				: 0;
		const group = this.nextGroup();
		const centre = polygonCentroid(worldRing);
		const impactRadius = Math.hypot(centre.x - impact.x, centre.y - impact.y) + 1e-6;

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
			let ox = fc.x - impact.x;
			let oy = fc.y - impact.y;
			const olen = Math.hypot(ox, oy) || 1;
			ox /= olen;
			oy /= olen;
			// Nearer to the impact → bigger outward kick.
			const nearness = Math.max(0.2, 1 - olen / impactRadius);
			const vx = parentVel.x + ox * FRACTURE_SCATTER_SPEED * nearness;
			const vy = parentVel.y + oy * FRACTURE_SCATTER_SPEED * nearness;
			const mass = (fbody as { GetMass?: () => number }).GetMass?.() ?? 1;
			backend.applyImpulse(fbody, { x: vx * mass, y: vy * mass }, { x: fc.x, y: fc.y });
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
		// A fragment is a transient sim body, never user-edited — mark non-editable
		// so Polygon.Init does NOT flag it as a bullet. A spray of overlapping BULLET
		// bodies overwhelms engine 0's (Box2D 2.0.2) TOI solver and freezes the sim
		// (engine 2 handled it fine); non-bullet fragments fixed that.
		frag.isEditable = false;
		// Distinct negative group so a shatter's shards don't collide with each other.
		frag.m_collisionGroup = group;
		frag.id = allocId();
		return frag;
	}
}

/** Exposed for tests. */
export const FRACTURE_TEST = { shatter, polygonArea, pointInPolygon, convexHull, mulberry32 };
