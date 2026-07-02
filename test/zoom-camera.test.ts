// zoomCamera — pinch-zoom ABOUT a focal screen point (GameCanvas two-finger
// gesture). Pins:
//   - camera.scale multiplies by scaleFactor and CLAMPS to [MIN_ZOOM_VAL=12,
//     MAX_ZOOM_VAL=75];
//   - the WORLD point under the focal SCREEN point is invariant across the zoom
//     (the focal-point invariant), for an OFF-centre focal point.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import type { CameraState } from "../src/core/GameState";

const MIN_ZOOM_VAL = 12;
const MAX_ZOOM_VAL = 75;

/** World point under a focal screen point, via screen = view/2 + world*scale - offset. */
function worldUnderFocus(cam: CameraState, focusX: number, focusY: number, viewW: number, viewH: number) {
	return {
		x: (focusX - viewW / 2 + cam.offsetX) / cam.scale,
		y: (focusY - viewH / 2 + cam.offsetY) / cam.scale,
	};
}

function coreAtScale(scale: number): GameCore {
	const state = createInitialState();
	state.camera = { scale, offsetX: 123, offsetY: -45 };
	return new GameCore(state);
}

describe("zoomCamera — pinch-zoom about a focal point", () => {
	it("multiplies scale by scaleFactor", () => {
		const core = coreAtScale(30);
		core.dispatch({ type: "zoomCamera", scaleFactor: 1.5, focusX: 100, focusY: 80, viewW: 400, viewH: 300 });
		expect(core.getState().camera.scale).toBeCloseTo(45, 6);
	});

	it("clamps the scale at MAX_ZOOM_VAL (75)", () => {
		const core = coreAtScale(60);
		// 60 * 2 = 120 → clamped to 75.
		core.dispatch({ type: "zoomCamera", scaleFactor: 2, focusX: 250, focusY: 150, viewW: 400, viewH: 300 });
		expect(core.getState().camera.scale).toBe(MAX_ZOOM_VAL);
	});

	it("clamps the scale at MIN_ZOOM_VAL (12)", () => {
		const core = coreAtScale(20);
		// 20 * 0.25 = 5 → clamped to 12.
		core.dispatch({ type: "zoomCamera", scaleFactor: 0.25, focusX: 250, focusY: 150, viewW: 400, viewH: 300 });
		expect(core.getState().camera.scale).toBe(MIN_ZOOM_VAL);
	});

	it("keeps the world point under an OFF-centre focal screen point invariant", () => {
		const core = coreAtScale(30);
		const viewW = 640;
		const viewH = 480;
		// Off-centre focal point (not at view centre 320,240).
		const focusX = 500;
		const focusY = 120;
		const before = worldUnderFocus(core.getState().camera, focusX, focusY, viewW, viewH);
		core.dispatch({ type: "zoomCamera", scaleFactor: 1.7, focusX, focusY, viewW, viewH });
		const after = worldUnderFocus(core.getState().camera, focusX, focusY, viewW, viewH);
		expect(after.x).toBeCloseTo(before.x, 6);
		expect(after.y).toBeCloseTo(before.y, 6);
	});

	it("keeps the focal invariant even when the scale is CLAMPED (no drift at the limit)", () => {
		const core = coreAtScale(60);
		const viewW = 640;
		const viewH = 480;
		const focusX = 500;
		const focusY = 120;
		const before = worldUnderFocus(core.getState().camera, focusX, focusY, viewW, viewH);
		// 60 * 2 = 120 → clamped to 75; the offset math must use the CAPPED scale.
		core.dispatch({ type: "zoomCamera", scaleFactor: 2, focusX, focusY, viewW, viewH });
		expect(core.getState().camera.scale).toBe(MAX_ZOOM_VAL);
		const after = worldUnderFocus(core.getState().camera, focusX, focusY, viewW, viewH);
		expect(after.x).toBeCloseTo(before.x, 6);
		expect(after.y).toBeCloseTo(before.y, 6);
	});
});
