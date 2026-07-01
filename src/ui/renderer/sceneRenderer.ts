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
		x: canvasWidth / 2 + worldX * camera.scale - camera.offsetX,
		y: canvasHeight / 2 + worldY * camera.scale - camera.offsetY,
	};
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
 */
export function hitTestPart(parts: readonly Part[], worldX: number, worldY: number, scale: number): Part | null {
	for (let i = parts.length - 1; i >= 0; i--) {
		const part = parts[i];
		try {
			if (part.InsideShape(worldX, worldY, scale)) return part;
		} catch {
			// Abstract/unsupported part types (e.g. joints) may throw; skip them.
		}
	}
	return null;
}
