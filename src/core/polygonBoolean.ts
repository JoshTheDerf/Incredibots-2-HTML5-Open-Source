// Self-contained 2D polygon boolean-difference (A minus B).
//
// This is the geometry engine behind the "Subtract Shape" editor feature
// (GameCore's `subtractShapes` command): given a TARGET ring and a SUBTRAHEND
// ring — both simple polygons in the SAME world-space coordinate frame — it
// returns the disjoint outer boundary pieces of (target − subtrahend).
//
// Algorithm: the classic Greiner–Hormann polygon-clipping algorithm (Greiner &
// Hormann 1998, "Efficient clipping of arbitrary polygons"). It builds a doubly
// linked ring for each polygon, splices the edge/edge intersection points into
// BOTH rings (cross-linked as `neighbour`s), labels every intersection as an
// entry/exit crossing of the other polygon, then walks the two rings switching
// sides at each crossing to emit the result loops. It naturally handles CONCAVE
// polygons and disjoint multi-piece results.
//
// Deliberately dependency-light and node-clean (no Box2D / Pixi / DOM), so it
// lives in src/core, is covered by test/polygon-boolean.test.ts, and can run in
// a worker. The classic algorithm assumes GENERAL POSITION (no vertex lies
// exactly on the other polygon's edge, no collinear overlapping edges); such
// degeneracies are broken by a deterministic sub-epsilon jitter retry (see
// polygonDifference). Callers must still validate the returned rings (e.g. with
// Polygon.isSimple) and fall back gracefully — a prototype-grade contract.

export interface Vec2 {
	x: number;
	y: number;
}

/** Signed shoelace area (2×); positive == CCW-in-math winding. */
export function signedArea(ring: Vec2[]): number {
	let a = 0;
	const n = ring.length;
	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n;
		a += ring[i].x * ring[j].y - ring[j].x * ring[i].y;
	}
	return a / 2;
}

/** Absolute polygon area. */
export function polygonArea(ring: Vec2[]): number {
	return Math.abs(signedArea(ring));
}

/** Even-odd ray-cast point-in-polygon (winding-agnostic; boundary is undefined). */
export function pointInPolygon(p: Vec2, ring: Vec2[]): boolean {
	let inside = false;
	const n = ring.length;
	for (let i = 0, j = n - 1; i < n; j = i++) {
		const xi = ring[i].x;
		const yi = ring[i].y;
		const xj = ring[j].x;
		const yj = ring[j].y;
		if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) {
			inside = !inside;
		}
	}
	return inside;
}

/**
 * True iff the ring is SIMPLE (no two non-adjacent edges cross). Used both to
 * decide whether a Greiner–Hormann result is usable and to gate the degeneracy
 * retry. Mirrors Polygon.isSimple but kept local so this module stays
 * self-contained (no src/Parts import).
 */
export function isSimpleRing(ring: Vec2[]): boolean {
	const n = ring.length;
	if (n < 3) return false;
	for (let i = 0; i < n; i++) {
		const a1 = ring[i];
		const a2 = ring[(i + 1) % n];
		for (let j = i + 1; j < n; j++) {
			if ((i + 1) % n === j || (j + 1) % n === i) continue;
			const b1 = ring[j];
			const b2 = ring[(j + 1) % n];
			if (segmentsProperlyIntersect(a1, a2, b1, b2)) return false;
		}
	}
	return true;
}

// --- internal Greiner–Hormann machinery ---------------------------------

class Vertex {
	x: number;
	y: number;
	next: Vertex = null as unknown as Vertex;
	prev: Vertex = null as unknown as Vertex;
	/** Partner intersection node on the other polygon's ring (crossings only). */
	neighbour: Vertex | null = null;
	isIntersection = false;
	/** True == this crossing ENTERS the other polygon; false == it EXITS. */
	isEntry = false;
	visited = false;
	/** Parametric position along the ORIGINAL edge this node was spliced into. */
	alpha = 0;
	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}
}

/** Build a circular doubly linked ring; returns its first node. */
function buildRing(poly: Vec2[]): Vertex {
	let first: Vertex | null = null;
	let prev: Vertex | null = null;
	for (const p of poly) {
		const v = new Vertex(p.x, p.y);
		if (!first) first = v;
		if (prev) {
			prev.next = v;
			v.prev = prev;
		}
		prev = v;
	}
	prev!.next = first!;
	first!.prev = prev!;
	return first!;
}

/** The original (non-intersection) nodes of a ring, in order. */
function originalNodes(first: Vertex): Vertex[] {
	const out: Vertex[] = [];
	let v = first;
	do {
		out.push(v);
		v = v.next;
	} while (v !== first);
	return out;
}

/**
 * Proper (interior/interior) segment intersection with parametric positions,
 * or null. Endpoint-touching / collinear cases are intentionally rejected (they
 * are the degeneracies the jitter retry exists to dodge).
 */
function edgeIntersection(
	p1: Vec2,
	p2: Vec2,
	q1: Vec2,
	q2: Vec2,
): { x: number; y: number; tS: number; tC: number } | null {
	const rx = p2.x - p1.x;
	const ry = p2.y - p1.y;
	const sx = q2.x - q1.x;
	const sy = q2.y - q1.y;
	const denom = rx * sy - ry * sx;
	if (Math.abs(denom) < 1e-12) return null; // parallel / collinear
	const wx = q1.x - p1.x;
	const wy = q1.y - p1.y;
	// Solve p1 + tS·r = q1 + tC·s with r=(rx,ry), s=(sx,sy), w=q1−p1:
	//   tS = (w × s) / (r × s),  tC = (w × r) / (r × s)   [a × b = ax·by − ay·bx]
	const tS = (wx * sy - wy * sx) / denom;
	const tC = (wx * ry - wy * rx) / denom;
	const eps = 1e-9;
	if (tS > eps && tS < 1 - eps && tC > eps && tC < 1 - eps) {
		return { x: p1.x + tS * rx, y: p1.y + tS * ry, tS, tC };
	}
	return null;
}

/** Boolean variant of edgeIntersection for the local self-intersection check. */
function segmentsProperlyIntersect(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): boolean {
	return edgeIntersection(a1, a2, b1, b2) !== null;
}

/** True iff p lies on (within `tol` of) segment a-b, projection inside the span. */
function pointOnSegment(p: Vec2, a: Vec2, b: Vec2, tol: number): boolean {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const len2 = dx * dx + dy * dy;
	if (len2 < tol * tol) return Math.hypot(p.x - a.x, p.y - a.y) <= tol;
	let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
	if (t < 0 || t > 1) return false;
	const px = a.x + t * dx;
	const py = a.y + t * dy;
	return Math.hypot(p.x - px, p.y - py) <= tol;
}

/**
 * True iff the two rings touch in a way that violates Greiner–Hormann's
 * general-position assumption: a vertex of one lying on an edge (or vertex) of
 * the other, or collinear-overlapping edges. Such a contact makes the crossing
 * fall on an endpoint (rejected by edgeIntersection), so the pure algorithm sees
 * no intersection and would wrongly report "unchanged" — polygonDifference uses
 * this to force the jitter retry.
 */
function hasBoundaryDegeneracy(a: Vec2[], b: Vec2[], tol: number): boolean {
	for (const v of a) {
		for (let j = 0; j < b.length; j++) {
			if (pointOnSegment(v, b[j], b[(j + 1) % b.length], tol)) return true;
		}
	}
	for (const v of b) {
		for (let i = 0; i < a.length; i++) {
			if (pointOnSegment(v, a[i], a[(i + 1) % a.length], tol)) return true;
		}
	}
	return false;
}

/** Splice an intersection node into the chain start..end, ordered by alpha. */
function spliceByAlpha(iv: Vertex, start: Vertex, end: Vertex): void {
	let cur = start;
	while (cur.next !== end && cur.next.alpha < iv.alpha) cur = cur.next;
	iv.next = cur.next;
	iv.prev = cur;
	cur.next.prev = iv;
	cur.next = iv;
}

/**
 * General Greiner–Hormann clip. `sourceForwards`/`clipForwards` select the
 * operation via the standard flag table:
 *   intersection : (true,  true)
 *   union        : (false, false)
 *   difference   : (false, true)   // source − clip
 * Returns the result loops (each a closed ring, first point == start crossing).
 */
function clip(subject: Vec2[], clipPoly: Vec2[], sourceForwards: boolean, clipForwards: boolean): Vec2[][] {
	const subjFirst = buildRing(subject);
	const clipFirst = buildRing(clipPoly);
	const subjOrig = originalNodes(subjFirst);
	const clipOrig = originalNodes(clipFirst);
	const sn = subjOrig.length;
	const cn = clipOrig.length;

	// --- phase 1: find + splice all edge/edge crossings ---
	let intersections = 0;
	for (let i = 0; i < sn; i++) {
		const s1 = subjOrig[i];
		const s2 = subjOrig[(i + 1) % sn];
		for (let j = 0; j < cn; j++) {
			const c1 = clipOrig[j];
			const c2 = clipOrig[(j + 1) % cn];
			const hit = edgeIntersection(s1, s2, c1, c2);
			if (!hit) continue;
			const a = new Vertex(hit.x, hit.y);
			const b = new Vertex(hit.x, hit.y);
			a.isIntersection = b.isIntersection = true;
			a.alpha = hit.tS;
			b.alpha = hit.tC;
			a.neighbour = b;
			b.neighbour = a;
			spliceByAlpha(a, s1, s2);
			spliceByAlpha(b, c1, c2);
			intersections++;
		}
	}

	// --- no crossings: pure containment cases ---
	if (intersections === 0) {
		const subjInClip = pointInPolygon(subject[0], clipPoly);
		const clipInSubj = pointInPolygon(clipPoly[0], subject);
		if (sourceForwards && clipForwards) {
			// intersection
			if (subjInClip) return [subject.map((p) => ({ x: p.x, y: p.y }))];
			if (clipInSubj) return [clipPoly.map((p) => ({ x: p.x, y: p.y }))];
			return [];
		}
		if (!sourceForwards && !clipForwards) {
			// union — not needed by difference, provided for completeness
			if (subjInClip) return [clipPoly.map((p) => ({ x: p.x, y: p.y }))];
			if (clipInSubj) return [subject.map((p) => ({ x: p.x, y: p.y }))];
			return [subject.map((p) => ({ x: p.x, y: p.y })), clipPoly.map((p) => ({ x: p.x, y: p.y }))];
		}
		// difference (source − clip)
		if (subjInClip) return []; // subject fully covered → nothing left
		// disjoint, OR clip strictly interior (a HOLE we can't represent): the
		// OUTER boundary is unchanged, so return subject verbatim. The caller
		// detects "area unchanged" and treats it as a no-op fallback.
		return [subject.map((p) => ({ x: p.x, y: p.y }))];
	}

	// --- phase 2: entry/exit labelling (Greiner–Hormann flag XOR trick) ---
	let sf = sourceForwards !== pointInPolygon(subject[0], clipPoly);
	for (const v of iterate(subjFirst)) {
		if (v.isIntersection) {
			v.isEntry = sf;
			sf = !sf;
		}
	}
	let cf = clipForwards !== pointInPolygon(clipPoly[0], subject);
	for (const v of iterate(clipFirst)) {
		if (v.isIntersection) {
			v.isEntry = cf;
			cf = !cf;
		}
	}

	// --- phase 3: trace the result loops ---
	const result: Vec2[][] = [];
	let start = firstUnvisitedIntersection(subjFirst);
	let outerGuard = intersections * 2 + 4;
	while (start && outerGuard-- > 0) {
		const loop: Vec2[] = [];
		let current: Vertex = start;
		let innerGuard = (sn + cn) * 2 + intersections * 2 + 8;
		do {
			current.visited = true;
			if (current.neighbour) current.neighbour.visited = true;
			if (current.isEntry) {
				do {
					current = current.next;
					loop.push({ x: current.x, y: current.y });
				} while (!current.isIntersection && innerGuard-- > 0);
			} else {
				do {
					current = current.prev;
					loop.push({ x: current.x, y: current.y });
				} while (!current.isIntersection && innerGuard-- > 0);
			}
			current = current.neighbour!;
			if (!current) break;
		} while (current !== start && !current.visited && innerGuard-- > 0);
		if (loop.length >= 3) result.push(loop);
		start = firstUnvisitedIntersection(subjFirst);
	}
	return result;
}

/** Iterate a ring's nodes once (generator over the circular list). */
function* iterate(first: Vertex): Generator<Vertex> {
	let v = first;
	do {
		yield v;
		v = v.next;
	} while (v !== first);
}

function firstUnvisitedIntersection(first: Vertex): Vertex | null {
	for (const v of iterate(first)) {
		if (v.isIntersection && !v.visited) return v;
	}
	return null;
}

/**
 * Difference of two simple polygons: TARGET minus SUBTRAHEND, returned as the
 * disjoint OUTER boundary pieces (holes are dropped — a limitation documented on
 * the subtractShapes command). Each returned ring is a plain Vec2 list; winding
 * is not normalized (callers that build a Polygon re-normalize it anyway).
 *
 * Robustness: Greiner–Hormann assumes general position. When a result loop comes
 * back self-intersecting (a symptom of a vertex/edge degeneracy) the subtrahend
 * is re-tried with a tiny deterministic jitter that breaks the degeneracy while
 * staying far below any meaningful geometric scale. After a few failed retries
 * we give up and return `null`, letting the caller leave the target unchanged.
 */
export function polygonDifference(target: Vec2[], subtrahend: Vec2[]): Vec2[][] | null {
	if (target.length < 3 || subtrahend.length < 3) return null;
	const originalArea = polygonArea(target);
	// A relative tolerance separating a REAL area change from the sub-epsilon
	// wobble a jitter introduces (or a numerically "unchanged" no-op result).
	const changeTol = 1e-6 * (originalArea + 1);
	// Directional per-vertex nudges (deterministic — no Math.random — so tests are
	// reproducible). A boundary degeneracy is only broken cleanly by a nudge that
	// pokes the cutter OUTWARD across the shared edge; since we can't know which
	// direction that is, we try several and keep the first that actually removes
	// area (a nudge that pulls a corner-cutter INWARD would masquerade as an
	// unrepresentable hole — see the fallback handling below).
	const jitters = [0, 1e-7, -1e-7, 3.7e-7, -5.3e-7, 7.1e-7, -9.3e-7];
	const degenerate = hasBoundaryDegeneracy(target, subtrahend, 1e-8);
	// Remember a VALID-but-unchanged result (genuine disjoint / interior hole) so
	// that if no jitter ever removes area we can still report the no-op honestly.
	let unchangedFallback: Vec2[][] | null = null;
	for (let attempt = 0; attempt < jitters.length; attempt++) {
		const eps = jitters[attempt];
		if (eps === 0 && degenerate) continue; // the clean pass can't resolve a degeneracy
		const cutter =
			eps === 0
				? subtrahend
				: subtrahend.map((p, i) => ({
						x: p.x + eps * (1 + (i % 3)),
						y: p.y + eps * (1 + (i % 5)),
					}));
		const pieces = clip(target, cutter, false, true);
		// An empty result (subtrahend covers target) is a VALID, definitive answer.
		if (pieces.length === 0) return [];
		if (!pieces.every((r) => isSimpleRing(r))) continue; // degenerate output — retry
		const area = pieces.reduce((s, r) => s + polygonArea(r), 0);
		// A real removal — accept immediately.
		if (Math.abs(area - originalArea) > changeTol) return pieces;
		// Valid but nothing removed — could be a true no-op, or a jitter that
		// pulled the cutter clear of the target. Remember it and keep trying.
		if (!unchangedFallback) unchangedFallback = pieces;
	}
	// No jitter removed area: honest no-op (disjoint / interior hole), or — if no
	// attempt even produced a simple result — an unusable degeneracy (null).
	return unchangedFallback;
}

/** Convenience: the largest-area ring of a difference result, or null. */
export function largestPiece(pieces: Vec2[][]): Vec2[] | null {
	let best: Vec2[] | null = null;
	let bestArea = -1;
	for (const r of pieces) {
		const a = polygonArea(r);
		if (a > bestArea) {
			bestArea = a;
			best = r;
		}
	}
	return best;
}
