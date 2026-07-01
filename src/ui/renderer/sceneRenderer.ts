// Minimal Pixi scene renderer — editing-only, no physics.
//
// Reads a GameState snapshot each ticker frame and draws every part with a
// single Graphics object (cleared + redrawn per frame — fine for the part
// counts this editor deals with). Pixi-free domain objects in, Pixi pixels
// out; this is the only place that knows about both.

import { Application, Graphics, Text } from "pixi.js";
import type { GameState, CameraState } from "../../core";
import type { Part } from "../../Parts/Part";
import type { Circle } from "../../Parts/Circle";
import type { Rectangle } from "../../Parts/Rectangle";
import type { Triangle } from "../../Parts/Triangle";
import type { TextPart } from "../../Parts/TextPart";

export type GetState = () => Readonly<GameState>;

/** world → screen, per the shared contract (canvas size in CSS px). */
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

/** screen → world, inverse of the above. */
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

const SELECTION_COLOR = 0xffcc00;

export class SceneRenderer {
	private app: Application;
	private getState: GetState;
	private gfx: Graphics;
	/** id -> Text, kept across frames so text isn't recreated every tick. */
	private textNodes = new Map<number, Text>();
	private tickerFn = () => this.drawFrame();

	constructor(app: Application, getState: GetState) {
		this.app = app;
		this.getState = getState;
		this.gfx = new Graphics();
		this.app.stage.addChild(this.gfx);
		this.app.ticker.add(this.tickerFn);
	}

	destroy(): void {
		this.app.ticker.remove(this.tickerFn);
		this.gfx.destroy();
		for (const t of this.textNodes.values()) t.destroy();
		this.textNodes.clear();
	}

	private drawFrame(): void {
		const state = this.getState();
		const { camera, edit, parts } = state;
		const w = this.app.renderer.width / this.app.renderer.resolution;
		const h = this.app.renderer.height / this.app.renderer.resolution;
		const selection = new Set(edit.selection);

		this.gfx.clear();

		const seenText = new Set<number>();

		for (const part of parts) {
			const selected = selection.has((part as any).id);
			this.drawPart(part, camera, w, h, selected, seenText);
		}

		// Drop text nodes for parts that no longer exist.
		for (const [id, node] of this.textNodes) {
			if (!seenText.has(id)) {
				node.destroy();
				this.textNodes.delete(id);
			}
		}
	}

	private drawPart(
		part: Part,
		camera: CameraState,
		w: number,
		h: number,
		selected: boolean,
		seenText: Set<number>
	): void {
		const color = this.colorOf(part);

		switch (part.type) {
			case "Circle": {
				const c = part as unknown as Circle;
				const p = worldToScreen(c.centerX, c.centerY, camera, w, h);
				const r = c.radius * camera.scale;
				this.gfx.lineStyle(selected ? 3 : 1, selected ? SELECTION_COLOR : 0x000000, selected ? 1 : 0.5);
				this.gfx.beginFill(color, (c.opacity ?? 255) / 255);
				this.gfx.drawCircle(p.x, p.y, r);
				this.gfx.endFill();
				return;
			}
			case "Rectangle": {
				const r = part as unknown as Rectangle;
				const verts = r.GetVertices().map((v: { x: number; y: number }) =>
					worldToScreen(v.x, v.y, camera, w, h)
				);
				this.drawPolygon(verts, color, r.opacity, selected);
				return;
			}
			case "Triangle": {
				const t = part as unknown as Triangle;
				const verts = t.GetVertices().map((v: { x: number; y: number }) =>
					worldToScreen(v.x, v.y, camera, w, h)
				);
				this.drawPolygon(verts, color, t.opacity, selected);
				return;
			}
			case "TextPart": {
				const tp = part as unknown as TextPart;
				seenText.add(tp.id);
				this.drawText(tp, camera, w, h, selected);
				return;
			}
			default:
				return;
		}
	}

	private drawPolygon(
		verts: Array<{ x: number; y: number }>,
		color: number,
		opacity: number,
		selected: boolean
	): void {
		if (verts.length < 3) return;
		this.gfx.lineStyle(selected ? 3 : 1, selected ? SELECTION_COLOR : 0x000000, selected ? 1 : 0.5);
		this.gfx.beginFill(color, (opacity ?? 255) / 255);
		this.gfx.moveTo(verts[0].x, verts[0].y);
		for (let i = 1; i < verts.length; i++) this.gfx.lineTo(verts[i].x, verts[i].y);
		this.gfx.closePath();
		this.gfx.endFill();
	}

	private drawText(tp: TextPart, camera: CameraState, w: number, h: number, selected: boolean): void {
		let node = this.textNodes.get(tp.id);
		if (!node) {
			node = new Text("", {
				fontFamily: "Arial, Helvetica, sans-serif",
				fontSize: tp.size,
				fill: 0x000000,
			});
			this.app.stage.addChild(node);
			this.textNodes.set(tp.id, node);
		}
		if (node.text !== tp.text) node.text = tp.text;
		const fill = (Math.round(tp.red) << 16) | (Math.round(tp.green) << 8) | Math.round(tp.blue);
		(node.style as any).fill = fill;
		if (node.style.fontSize !== tp.size) node.style.fontSize = tp.size;

		const topLeft = worldToScreen(tp.x, tp.y, camera, w, h);
		node.position.set(topLeft.x, topLeft.y);
		node.scale.set(camera.scale / 30);

		if (selected) {
			const bottomRight = worldToScreen(tp.x + tp.w, tp.y + tp.h, camera, w, h);
			this.gfx.lineStyle(2, SELECTION_COLOR, 1);
			this.gfx.drawRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
		}
	}

	private colorOf(part: Part): number {
		// Part colour channels are stored 0-255 (see ShapePart / Draw.ts red/255.0).
		const p = part as any;
		const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
		const r = clamp(p.red ?? 150);
		const g = clamp(p.green ?? 150);
		const b = clamp(p.blue ?? 150);
		return (r << 16) | (g << 8) | b;
	}
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
