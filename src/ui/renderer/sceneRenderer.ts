// World <-> screen transform helpers and hit-testing.
//
// Drawing itself is delegated to the original renderer (src/Game/Draw.ts); this
// module only carries the pure coordinate math the interaction layer needs
// (turning pointer positions into world coordinates and picking the topmost
// part under a point). These stay Pixi-free.

import type { CameraState } from "../../core";
import type { Part } from "../../Parts/Part";

/**
 * world -> screen, per the shared contract (canvas size in CSS px).
 *
 * This MUST match the transform Draw paints with. Draw uses
 * `screen = world * scale - drawOff`; GameCanvas sets `drawOff = offset - canvas/2`,
 * which makes it identical to the `canvas/2 + world*scale - offset` form below.
 */
export function worldToScreen(
	worldX: number,
	worldY: number,
	camera: CameraState,
	canvasWidth: number,
	canvasHeight: number
): { x: number; y: number } {
	return {
		x: worldToScreenX(worldX, camera, canvasWidth),
		y: worldToScreenY(worldY, camera, canvasHeight),
	};
}

/** Scalar form of worldToScreen (x only) — shared by the ground/sky renderers. */
export function worldToScreenX(worldX: number, camera: CameraState, canvasWidth: number): number {
	return canvasWidth / 2 + worldX * camera.scale - camera.offsetX;
}

/** Scalar form of worldToScreen (y only) — shared by the ground/sky renderers. */
export function worldToScreenY(worldY: number, camera: CameraState, canvasHeight: number): number {
	return canvasHeight / 2 + worldY * camera.scale - camera.offsetY;
}

/** screen -> world, inverse of the above. */
export function screenToWorld(
	screenX: number,
	screenY: number,
	camera: CameraState,
	canvasWidth: number,
	canvasHeight: number
): { x: number; y: number } {
	return {
		x: (screenX - canvasWidth / 2 + camera.offsetX) / camera.scale,
		y: (screenY - canvasHeight / 2 + camera.offsetY) / camera.scale,
	};
}

/**
 * Hit-test the topmost part under a world-space point. Uses each part's own
 * `InsideShape` so geometry stays owned by src/Parts/*. Iterates back-to-front
 * (last drawn = topmost) so the visual stacking order matches selection.
 *
 * Non-editable parts (sandbox terrain: isEditable=false) are skipped so they
 * can't be clicked/selected — faithful to ControllerGame's select path, which
 * only ever picks parts where `isEditable` is true (ControllerGame.ts:2406,
 * :5491, and the mouseClick selection loop).
 */
export function hitTestPart(parts: readonly Part[], worldX: number, worldY: number, scale: number): Part | null {
	for (let i = parts.length - 1; i >= 0; i--) {
		const part = parts[i];
		if (!part.isEditable) continue;
		try {
			if (part.InsideShape(worldX, worldY, scale)) return part;
		} catch {
			// Abstract/unsupported part types (e.g. joints) may throw; skip them.
		}
	}
	return null;
}

/**
 * Collect every part intersecting a world-space marquee box. Mirrors
 * ControllerGame.MouseDrag box-select (ControllerGame.ts:2407) which calls
 * `Part.IntersectsBox(minX, minY, width, height)` on each part. The box is
 * given by two opposite world-space corners (any order). Parts whose type
 * lacks a working IntersectsBox (abstract/joint) are skipped, falling back to
 * a centre-in-box test when possible.
 */
export function partsInBox(parts: readonly Part[], ax: number, ay: number, bx: number, by: number): Part[] {
	const minX = Math.min(ax, bx);
	const minY = Math.min(ay, by);
	const w = Math.abs(ax - bx);
	const h = Math.abs(ay - by);
	const hits: Part[] = [];
	for (const part of parts) {
		// Skip non-editable sandbox terrain — box-select only grabs editable parts
		// (ControllerGame.ts:2406 gates BOX_SELECTING on `allParts[i].isEditable`).
		if (!part.isEditable) continue;
		try {
			if (part.IntersectsBox(minX, minY, w, h)) hits.push(part);
		} catch {
			// Fall back to a centre-in-box test for part types without IntersectsBox.
			const cx = (part as unknown as { centerX?: number; x?: number }).centerX ??
				(part as unknown as { x?: number }).x;
			const cy = (part as unknown as { centerY?: number; y?: number }).centerY ??
				(part as unknown as { y?: number }).y;
			if (cx != null && cy != null && cx >= minX && cx <= minX + w && cy >= minY && cy <= minY + h) {
				hits.push(part);
			}
		}
	}
	return hits;
}
