// Pure draw-gesture snapping helpers, ported VERBATIM from Jaybit's
// General/Util.as (port-not-reimplement). These resolve the FINAL geometry for a
// draw gesture in the UI before it enters GameCore.dispatch, so the core stays
// modifier-agnostic (the funnel is preserved — only final coordinates are sent).
//
// Sources (jaybit-src/scripts/General/Util.as):
//   RestrictToSquares      :38-73
//   FifteenAngleIncrements :184-195
//   MaxTriangle            :258-362
//   SnapToCommonTriangles  :398-563
// See PORT SPEC "Editor/UI improvements and hotkeys" §4.

/**
 * Snap a world coordinate to the nearest grid line.
 *
 * Ported from IB3's grid quantization (ib3-decompiled/scripts/Control/Graphics/
 * GridControl.as:116-117: `Math.round(v / gridSpacing) * gridSpacing` — the
 * round-to-spacing math GridControl uses to land its line labels exactly on
 * grid multiples). IB3 declared the matching gesture flag
 * (GameControl.as:269 `snapToGrid = true`) but never wired it up; here it
 * drives the actual editor gestures, applied at the same FINAL-geometry funnel
 * as the other helpers in this module (before GameCore.dispatch, keeping the
 * core modifier-agnostic).
 *
 * A non-positive spacing disables snapping (returns v unchanged).
 */
export function SnapToGrid(v: number, spacing: number): number {
	if (!(spacing > 0)) return v;
	return Math.round(v / spacing) * spacing;
}

/** Snap a world point to the nearest grid intersection (SnapToGrid per axis). */
export function SnapPointToGrid(x: number, y: number, spacing: number): [number, number] {
	return [SnapToGrid(x, spacing), SnapToGrid(y, spacing)];
}

function GetDist(x1: number, y1: number, x2: number, y2: number): number {
	return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

// Util.NormalizeAngle (:231-246) — clamp into [0, 2π).
function NormalizeAngle(a: number): number {
	if (a === Number.POSITIVE_INFINITY || a === Number.NEGATIVE_INFINITY) a = 0;
	while (a >= 2 * Math.PI) a -= 2 * Math.PI;
	while (a < 0) a += 2 * Math.PI;
	return a;
}

/**
 * Util.RestrictToSquares(dx, dy) :38-73 — clamp a rectangle drag to a square by
 * shrinking the LARGER extent to the smaller magnitude, sign-preserving per
 * quadrant. Returns the corrected [dx, dy].
 */
export function RestrictToSquares(dx: number, dy: number): [number, number] {
	let a = dx;
	let b = dy;
	if (a > 0 && b < 0) {
		if (a < -b) b = -a;
		else if (-b < a) a = -b;
	} else if (a < 0 && b > 0) {
		if (-a < b) b = -a;
		else if (b < -a) a = -b;
	} else if (Math.abs(a) < Math.abs(b)) {
		b = a;
	} else if (Math.abs(b) < Math.abs(a)) {
		a = b;
	}
	return [a, b];
}

/**
 * Util.FifteenAngleIncrements(x, y, cx, cy) :184-195 — snap the direction from
 * (cx,cy) to (x,y) to the nearest 15° while keeping the distance. Returns the
 * new [x, y]. Used for the triangle BASE edge and the prismatic slide axis.
 */
export function FifteenAngleIncrements(x: number, y: number, cx: number, cy: number): [number, number] {
	const dist = GetDist(cx, cy, x, y);
	let angle = Math.atan2(y - cy, x - cx);
	angle = (Math.round((angle * 180) / Math.PI / 15) * 15 * Math.PI) / 180;
	return [cx + dist * Math.cos(angle), cy + dist * Math.sin(angle)];
}

/**
 * Util.MaxTriangle(x, y, x1, y1, x2, y2, maxSide, minSide, minAngle=-1) :258-362
 * — iteratively (≤400 steps) pull the apex toward the base midpoint until both
 * remaining sides are within [minSide, maxSide] and all angles ≥ minAngle, giving
 * the LARGEST legal triangle in the cursor direction. Returns the clamped apex
 * [x, y] (the AS3 also returns two trailing flags; unused here).
 */
export function MaxTriangle(
	x: number,
	y: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	maxSide: number,
	minSide: number,
	minAngle = -1,
): [number, number] {
	let px = x;
	let py = y;
	const mx = (x1 + x2) / 2;
	const my = (y1 + y2) / 2;
	let d1 = GetDist(x1, y1, px, py);
	let d2 = GetDist(x2, y2, px, py);
	const base = GetDist(x1, y1, x2, y2);
	let dm = GetDist(mx, my, px, py);
	let ang1 = NormalizeAngle(Math.acos((base * base + d1 * d1 - d2 * d2) / (2 * base * d1)));
	let ang2 = NormalizeAngle(Math.acos((base * base + d2 * d2 - d1 * d1) / (2 * base * d2)));
	let angApex = NormalizeAngle(Math.acos((d1 * d1 + d2 * d2 - base * base) / (2 * d1 * d2)));
	let ratio = 0;
	const maxSteps = 400;
	const shrink = 0.01;
	let step = 0;
	while (step < maxSteps && (d1 > maxSide || d2 > maxSide || angApex < minAngle)) {
		let didScale = false;
		if (d1 > d2 && d1 > maxSide) {
			ratio = maxSide / d1;
			didScale = true;
		} else if (d1 > d2 && d2 < minSide) {
			ratio = d2 / minSide;
			didScale = true;
		} else if (d1 <= d2 && d2 > maxSide) {
			ratio = maxSide / d2;
			didScale = true;
		} else if (d1 <= d2 && d1 < minSide) {
			ratio = d1 / minSide;
			didScale = true;
		} else if (minAngle !== -1 && (angApex < minAngle || ang2 < minAngle || ang1 < minAngle)) {
			let inner = 0;
			while (inner < maxSteps) {
				let didAngle = false;
				if (angApex < minAngle) {
					ratio = (dm - shrink) / dm;
					didAngle = true;
				} else if (ang2 < minAngle) {
					ratio = (d1 - shrink) / d1;
					didAngle = true;
				} else if (ang1 < minAngle) {
					ratio = (d2 - shrink) / d2;
					didAngle = true;
				}
				if (didAngle) {
					px = mx + (px - mx) * ratio;
					py = my + (py - my) * ratio;
					d1 = GetDist(x1, y1, px, py);
					d2 = GetDist(x2, y2, px, py);
					dm = GetDist(mx, my, px, py);
					ang1 = NormalizeAngle(Math.acos((base * base + d1 * d1 - d2 * d2) / (2 * base * d1)));
					ang2 = NormalizeAngle(Math.acos((base * base + d2 * d2 - d1 * d1) / (2 * base * d2)));
					angApex = NormalizeAngle(Math.acos((d1 * d1 + d2 * d2 - base * base) / (2 * d1 * d2)));
					if (angApex >= minAngle && ang2 >= minAngle && ang1 >= minAngle) break;
				}
				inner++;
			}
		}
		if (didScale) {
			px = mx + (px - mx) * ratio;
			py = my + (py - my) * ratio;
			d1 = GetDist(x1, y1, px, py);
			d2 = GetDist(x2, y2, px, py);
			dm = GetDist(mx, my, px, py);
			ang1 = NormalizeAngle(Math.acos((base * base + d1 * d1 - d2 * d2) / (2 * base * d1)));
			ang2 = NormalizeAngle(Math.acos((base * base + d2 * d2 - d1 * d1) / (2 * base * d2)));
			angApex = NormalizeAngle(Math.acos((d1 * d1 + d2 * d2 - base * base) / (2 * d1 * d2)));
		}
		step++;
	}
	return [px, py];
}

/**
 * Util.SnapToCommonTriangles(x, y, x1, y1, x2, y2, physScale, ctrlDown,
 * triangleSnapping, maxSide, minSide, minAngle) :398-563 — constrain the apex
 * onto the perpendicular of the base (erected at the nearer endpoint → right
 * triangle, or at the midpoint → isosceles, whichever is angularly closest to the
 * cursor). ctrlDown → equilateral (h = base·sin60°). When triangleSnapping is on
 * and anchored at an endpoint, snaps the height to the common triangle heights
 * (base·√3, base, base/√3) within 0.5 world units. `physScale` is unused (kept for
 * signature fidelity). Returns the resolved apex [x, y].
 */
export function SnapToCommonTriangles(
	x: number,
	y: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	_physScale: number,
	ctrlDown: boolean,
	triangleSnapping: boolean,
	maxSide = -1,
	minSide = -1,
	minAngle = -1,
): [number, number] {
	let px = x;
	let py = y;
	const mx = (x1 + x2) / 2;
	const my = (y1 + y2) / 2;
	const base = GetDist(x1, y1, x2, y2);
	let baseAngle = NormalizeAngle(Math.atan2(y1 - y2, x1 - x2));
	const cursorAngle = NormalizeAngle(Math.atan2(py - y1, px - x1));
	let perpAngle = 0;
	if (baseAngle < cursorAngle) baseAngle += 2 * Math.PI;
	if (baseAngle - cursorAngle <= Math.PI) perpAngle = NormalizeAngle(baseAngle - Math.PI / 2);
	else perpAngle = NormalizeAngle(baseAngle + Math.PI / 2);

	if (ctrlDown) {
		const h = base * Math.sin(Math.PI / 3);
		px = mx + h * Math.cos(perpAngle);
		py = my + h * Math.sin(perpAngle);
	} else {
		const snapWindow = 0.5;
		const angleToP2 = NormalizeAngle(Math.atan2(py - y2, px - x2));
		const angleToMid = NormalizeAngle(Math.atan2(py - my, px - mx));
		let dEnd1 = Math.abs(perpAngle - cursorAngle);
		let dEnd2 = Math.abs(perpAngle - angleToP2);
		let dMid = Math.abs(perpAngle - angleToMid);
		if (dEnd1 > Math.PI) dEnd1 = Math.abs(dEnd1 - 2 * Math.PI);
		if (dEnd2 > Math.PI) dEnd2 = Math.abs(dEnd2 - 2 * Math.PI);
		if (dMid > Math.PI) dMid = Math.abs(dMid - 2 * Math.PI);
		const closest = Math.min(dEnd1, dEnd2, dMid);
		let height = 0;
		if (x1 === x2) {
			height = Math.abs(x1 - px);
		} else if (y1 === y2) {
			height = Math.abs(y1 - py);
		} else {
			const m = (y1 - y2) / (x1 - x2);
			const b = y1 - m * x1;
			const mp = -1 / m;
			const bp = py - mp * px;
			const ix = (b - bp) / (mp - m);
			const iy = m * ix + b;
			height = GetDist(px, py, ix, iy);
		}
		if (closest === dEnd1 || closest === dEnd2) {
			const ex = closest === dEnd1 ? x1 : x2;
			const ey = closest === dEnd1 ? y1 : y2;
			const rx = ex + base * Math.cos(perpAngle);
			const ry = ey + base * Math.sin(perpAngle);
			const rHyp = Math.sqrt(Math.pow(GetDist(ex, ey, rx, ry), 2) + base * base);
			const rDiff = Math.abs(height - GetDist(ex, ey, rx, ry));
			const t1x = ex + base * Math.sqrt(3) * Math.cos(perpAngle);
			const t1y = ey + base * Math.sqrt(3) * Math.sin(perpAngle);
			const t1Hyp = Math.sqrt(Math.pow(GetDist(ex, ey, t1x, t1y), 2) + base * base);
			const t1Diff = Math.abs(height - GetDist(ex, ey, t1x, t1y));
			const t2x = ex + (base / Math.sqrt(3)) * Math.cos(perpAngle);
			const t2y = ey + (base / Math.sqrt(3)) * Math.sin(perpAngle);
			const t2Hyp = Math.sqrt(Math.pow(GetDist(ex, ey, t2x, t2y), 2) + base * base);
			const t2Diff = Math.abs(height - GetDist(ex, ey, t2x, t2y));
			if (t1Diff < snapWindow && triangleSnapping && t1Hyp <= maxSide && t1Hyp >= minSide) {
				px = t1x;
				py = t1y;
			} else if (rDiff < snapWindow && triangleSnapping && rHyp <= maxSide && rHyp >= minSide) {
				px = rx;
				py = ry;
			} else if (t2Diff < snapWindow && triangleSnapping && t2Hyp <= maxSide && t2Hyp >= minSide) {
				px = t2x;
				py = t2y;
			} else {
				if (Math.sqrt(height * height + base * base) > maxSide) {
					height = Math.sqrt(maxSide * maxSide - base * base);
				} else if (Math.sqrt(height * height + (base * base) / 4) < minSide) {
					height = Math.sqrt(minSide * minSide - base * base);
				}
				if (2 * Math.atan(height / base) < minAngle) {
					height = base * Math.sin(minAngle / 2);
				}
				px = ex + height * Math.cos(perpAngle);
				py = ey + height * Math.sin(perpAngle);
			}
		} else {
			if (Math.sqrt(height * height + (base * base) / 4) > maxSide) {
				height = Math.sqrt(maxSide * maxSide - (base * base) / 4);
			} else if (Math.sqrt(height * height + (base * base) / 4) < minSide) {
				height = Math.sqrt(minSide * minSide - (base * base) / 4);
			}
			if (2 * Math.atan(height / base) < minAngle) {
				height = base * Math.sin(minAngle / 2);
			}
			px = mx + height * Math.cos(perpAngle);
			py = my + height * Math.sin(perpAngle);
		}
	}
	return [px, py];
}
