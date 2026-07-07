// Renderer-only editor grid — a port of IB3's Control/Graphics/GridControl.as
// (ib3-decompiled/scripts/Control/Graphics/GridControl.as, v0.00.33b).
//
// IB3 draws a full-viewport line grid in world-unit spacing with a pool of up
// to 20 coordinate labels along the bottom (X values) and left (Y values)
// edges, thinned so at most 10 labels fit per axis. Visual constants are the
// GridControl constructor defaults (:42-50): opacity 0.7, spacing 2 world
// units per axis, colour 0x777777 (7829367), labels on. IB3 shows the grid
// only in the editor (GameControl.gridButton :4235-4241 toggles it; the sim
// screens never enable it) — the caller gates `update(..., visible)` on the
// editing phase + the gridEnabled pref accordingly.
//
// Follows skyRenderer/groundRenderer conventions: a public `view` Container
// the stage adds ONCE (under the world Draw sprite, so parts render over the
// grid), and an update(...) called each frame from drawFrame.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { CameraState } from "../../core";

// GridControl.as:14 — label pool size (half per axis).
const MAX_TEXTFIELDS = 20;
// GridControl.as:45/:48 — line alpha and colour.
const GRID_OPACITY = 0.7;
const GRID_COLOR = 0x777777;
// GridControl.as:59 — label field height (positions the X labels off the
// bottom edge; IB3 additionally subtracted its BottomBar height, :138, which
// this UI doesn't have).
const LABEL_HEIGHT = 18;

// DEVIATION (density guard, not in IB3): IB3's zoom range times its fixed
// spacing-2 grid keeps lines ≥ ~24px apart, so GridControl never thins LINES
// (only labels, :108-114). We expose smaller spacings (down to 0.5), where the
// minimum zoom (GameCore MIN_ZOOM_VAL = 12 → 6px cells) gets dense, so the
// RENDERED spacing is coarsened by powers of 2 until cells are at least this
// many pixels. Snapping (src/ui/snapping.ts SnapToGrid) always uses the raw
// pref spacing — only the drawn line density adapts.
const MIN_CELL_PX = 10;

export class GridRenderer {
	readonly view: Container;
	private readonly graphics: Graphics;
	// Fixed label pool, mirroring GridControl.as:52-65 (20 TextFields created up
	// front, toggled visible per frame).
	private readonly labels: Text[] = [];
	// DEVIATION (perf, not in IB3): update() is called every render frame but the
	// grid is a pure function of camera/viewport/spacing — key those inputs and
	// skip the full line+label re-tessellation when nothing changed.
	private lastKey = "";

	constructor() {
		this.view = new Container();
		this.graphics = new Graphics();
		this.view.addChild(this.graphics);
		// GridControl.as:51 — TextFormat(GLOBAL_FONT, 12, gridColor).
		const style = new TextStyle({ fontFamily: "Arial", fontSize: 12, fill: GRID_COLOR });
		for (let i = 0; i < MAX_TEXTFIELDS; i++) {
			const t = new Text({ text: "", style });
			t.visible = false;
			t.alpha = GRID_OPACITY;
			this.view.addChild(t);
			this.labels.push(t);
		}
	}

	/**
	 * Redraw the grid for the current camera/viewport. A direct port of
	 * GridControl.Update(scale, x_offset, y_offset) (:69-188); IB3's offsets are
	 * the screen-pixel position of world origin (GameControl.UpdateMouseWorld
	 * :681-687: world = (screen - offset)/scale), which in this UI's camera
	 * convention (sceneRenderer.worldToScreen) is canvas/2 - camera.offset.
	 */
	update(camera: CameraState, canvasW: number, canvasH: number, visible: boolean, spacing: number): void {
		this.view.visible = visible;
		if (!visible) return; // GridControl.as:83-86 — Update no-ops while hidden.

		// Cheap dirty check: rebuild only when an input changed since the last
		// draw (the Graphics/labels persist across frames, including while hidden,
		// so re-showing with the same camera reuses the previous tessellation).
		const key = `${camera.scale},${camera.offsetX},${camera.offsetY},${canvasW},${canvasH},${spacing}`;
		if (key === this.lastKey) return;
		this.lastKey = key;

		const scale = camera.scale;
		const xOff = canvasW / 2 - camera.offsetX;
		const yOff = canvasH / 2 - camera.offsetY;

		// Density guard (see MIN_CELL_PX note above) — render-only coarsening.
		let drawSpacing = spacing > 0 ? spacing : 2;
		while (drawSpacing * scale < MIN_CELL_PX) drawSpacing *= 2;

		// Label precision from the spacing's decimals (GridControl.as:216-224,
		// with the integer case fixed to 0 decimals — the AS3 string math gave 1).
		const spacingStr = drawSpacing.toString();
		const dot = spacingStr.indexOf(".");
		const precision = dot < 0 ? 0 : spacingStr.length - dot - 1;

		// GridControl.as:95-100 — pixel spacing, line counts, pixel phase.
		// The int() casts are the AS3 originals (truncation toward zero).
		const spacingPxX = drawSpacing * scale;
		const spacingPxY = drawSpacing * scale;
		const numX = Math.trunc(canvasW / spacingPxX) + 2;
		const numY = Math.trunc(canvasH / spacingPxY) + 2;
		const modX = Math.trunc(xOff % spacingPxX);
		const modY = Math.trunc(yOff % spacingPxY);

		// Label thinning: keep at most MAX_TEXTFIELDS/2 labels per axis by
		// labelling only every skip-th grid line (GridControl.as:106-115).
		let skipX = 1;
		let skipY = 1;
		while (numX / skipX > MAX_TEXTFIELDS / 2) skipX++;
		while (numY / skipY > MAX_TEXTFIELDS / 2) skipY++;
		// World value of the first (leftmost/topmost) candidate line — the
		// round-to-spacing quantization at GridControl.as:116-117.
		const worldStartX = Math.round((-xOff + modX) / scale / drawSpacing) * drawSpacing;
		const worldStartY = Math.round((-yOff + modY) / scale / drawSpacing) * drawSpacing;

		const g = this.graphics;
		g.clear();
		let labelCount = 0;

		// Vertical lines + X labels along the bottom (GridControl.as:120-144).
		for (let i = 0; i < numX; i++) {
			const px = i * spacingPxX + modX;
			if (px <= canvasW && px >= 0) {
				g.moveTo(px, 0);
				g.lineTo(px, canvasH);
				if (labelCount < MAX_TEXTFIELDS / 2) {
					const worldX = worldStartX + drawSpacing * i;
					// Label only lines on a skip-multiple (:131-133; 0.1 tolerance).
					if (Math.abs(worldX % (drawSpacing * skipX)) < 0.1) {
						const t = this.labels[labelCount];
						t.visible = true;
						t.text = worldX.toFixed(precision);
						t.x = px;
						t.y = Math.round(canvasH - LABEL_HEIGHT); // :138 (no BottomBar here)
						labelCount++;
					}
				}
			}
		}

		// Horizontal lines + Y labels along the left edge (GridControl.as:146-178).
		const xLabelCount = labelCount; // :145 — Y labels get their own half-pool.
		for (let i = 0; i < numY; i++) {
			const py = i * spacingPxY + modY;
			if (py <= canvasH && py >= 0) {
				g.moveTo(0, py);
				g.lineTo(canvasW, py);
				if (labelCount < xLabelCount + MAX_TEXTFIELDS / 2) {
					const worldY = worldStartY + drawSpacing * i;
					if (Math.abs(worldY % (drawSpacing * skipY)) < 0.1) {
						const t = this.labels[labelCount];
						t.visible = true;
						t.text = worldY.toFixed(precision);
						t.x = 0;
						t.y = py;
						labelCount++;
					}
				}
			}
		}

		// Hide the unused remainder of the pool (GridControl.as:179-184).
		for (let i = labelCount; i < MAX_TEXTFIELDS; i++) this.labels[i].visible = false;

		// Single stroke pass for the whole path (GridControl.as:185-187).
		g.stroke({ width: 1, color: GRID_COLOR, alpha: GRID_OPACITY });
	}

	destroy(): void {
		this.view.destroy({ children: true });
	}
}
