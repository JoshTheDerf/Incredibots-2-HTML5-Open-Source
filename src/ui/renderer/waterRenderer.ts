// Renderer-only water layer — the draw side of IB3's Control/WaterControl.as
// (DrawWater/GetGPath :187-233 + b2BuoyancyController.GenerateGPath, ib3-
// decompiled/scripts/Box2D/Dynamics/Controllers/b2BuoyancyController.as
// :GenerateGPath). The physics lives in src/core/waterSystem.ts; this module
// only reads GameState (sandbox.water settings + the live water surface
// read-model) and paints the translucent quad.
//
// LAYERING: IB3 draws the water IN FRONT of the parts (SandboxControl.Init
// :96-103 addChild order — sky, draw(parts), ground, waterControl, grid), so
// submerged parts show through the translucent fill tinted by the water
// colour. GameCanvas adds this view directly after the world Draw sprite
// (above parts, below the marquee overlay) to match.
//
// Surface math (GenerateGPath, y-down world coords): the plane
// dot((normalX, -1), p) = offset is the line worldY(x) = normalX*x - offset,
// so with screenX = worldX*scale - drawXOff / screenY = worldY*scale - drawYOff:
//   screenY(sx) = normalX * (sx + drawXOff) - offset*scale - drawYOff
// (GenerateGPath's slope*(-x_offset) + (-offset*scale + y_offset) form, with
// our drawOff = -legacy offset convention.) The quad fills from that line down
// to the bottom of the canvas.
//
// DEVIATION (wave type): the shipped IB3 draws NO water at all when the wave
// controller is active (WaterControl.GetGPath returns null for
// b2WaveController). We instead sample the live wave profile from the
// GameState.water read-model (surface height = -offset - Σ wave.valueAt(dx))
// so wave water is visible; while editing, the static rect at `height` is
// drawn (GetGPath's non-initted fallback branch).

import { Container, Graphics } from "pixi.js";
import type { CameraState, WaterState, WaterSurfaceState } from "../../core";

/** Sample spacing (px) for the wave-profile polyline. */
const WAVE_SAMPLE_PX = 8;

export class WaterRenderer {
	readonly view: Container;
	private readonly graphics: Graphics;

	constructor() {
		this.view = new Container();
		this.graphics = new Graphics();
		this.view.addChild(this.graphics);
	}

	/**
	 * Redraw for the current frame.
	 * @param camera  the same camera drawFrame feeds Draw.
	 * @param canvasW/canvasH  CSS-pixel canvas size.
	 * @param water  the sandbox water settings (GameState.sandbox.water).
	 * @param live   the live surface read-model (GameState.water); null while
	 *               editing — a static surface at water.height is drawn then.
	 */
	update(camera: CameraState, canvasW: number, canvasH: number, water: WaterState, live: WaterSurfaceState | null): void {
		const g = this.graphics;
		g.clear();
		// WaterControl.DrawWater :192 — nothing unless enabled with opacity > 0.
		if (!water.enabled || water.opacity <= 0) return;

		const scale = camera.scale;
		const drawXOff = camera.offsetX - canvasW / 2;
		const drawYOff = camera.offsetY - canvasH / 2;
		const offset = live ? live.offset : -water.height;
		const normalX = live ? live.normalX : 0;
		const alpha = Math.min(255, water.opacity) / 255;

		if (live && live.waves.length > 0) {
			// Wave type with live waves: sample the surface profile
			// (DEVIATION — see file header).
			g.moveTo(0, this.waveSurfaceY(0, offset, live, scale, drawXOff, drawYOff));
			for (let sx = WAVE_SAMPLE_PX; sx <= canvasW + WAVE_SAMPLE_PX; sx += WAVE_SAMPLE_PX) {
				const x = Math.min(sx, canvasW);
				g.lineTo(x, this.waveSurfaceY(x, offset, live, scale, drawXOff, drawYOff));
			}
			g.lineTo(canvasW, canvasH);
			g.lineTo(0, canvasH);
			g.closePath();
			g.fill({ color: water.color, alpha });
			return;
		}

		// Tide / static surface: GenerateGPath's clipped quad.
		let y0 = normalX * (0 + drawXOff) - offset * scale - drawYOff;
		let y1 = normalX * (canvasW + drawXOff) - offset * scale - drawYOff;
		// Both ends below the canvas — no water visible (GenerateGPath :~146).
		if (y0 > canvasH && y1 > canvasH) return;
		// Both ends above the canvas — fully underwater view (:~150).
		if (y0 < 0 && y1 < 0) {
			y0 = 0;
			y1 = 0;
		}
		g.moveTo(0, y0);
		g.lineTo(canvasW, y1);
		g.lineTo(canvasW, canvasH);
		g.lineTo(0, canvasH);
		g.closePath();
		g.fill({ color: water.color, alpha });
	}

	/** Screen-y of the wave-perturbed surface at screen-x (see file header). */
	private waveSurfaceY(sx: number, offset: number, live: WaterSurfaceState, scale: number, drawXOff: number, drawYOff: number): number {
		const worldX = (sx + drawXOff) / scale;
		// b2Wave.valueAt (b2Wave.as:44-50) summed over the live waves — matches
		// b2WaveController.StepAndCheckForWave's height accumulation.
		let value = 0;
		for (const w of live.waves) {
			const dx = worldX - w.x;
			const half = w.width / 2;
			if (dx <= -half || dx >= half) continue;
			const fn = w.fn === "cos" ? Math.cos : Math.sin;
			value += w.amplitude * fn((Math.PI / half) * dx) + (w.fn === "cos" ? w.amplitude : 0);
		}
		const worldY = -(offset + value);
		return worldY * scale - drawYOff;
	}

	destroy(): void {
		this.view.destroy({ children: true });
	}
}
