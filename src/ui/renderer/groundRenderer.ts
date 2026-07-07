// Renderer-only static terrain visual — a faithful port of the `sGround`
// Graphics drawn by src/Game/ControllerSandbox.ts (BuildGround, :205-565, plus
// the DrawGroundCircle / DrawGroundOutlineCircle / DrawRock / DrawRocksForBox
// helpers, :720-815, and the per-frame reposition in Update, :817-888).
//
// The legacy game builds this grass/dirt gradient fill + end-cap outline circles
// + rocks ONCE into a single Graphics (sGround) in a LOCAL pixel space, adds it
// to the display list, then every frame re-anchors/re-scales it by setting
// sGround.width = World2ScreenX(W) - World2ScreenX(0) (which makes Pixi compute
// scale.x = targetWidthPx / localContentWidth), copies scale.y = scale.x, and
// sets sGround.x/y = World2Screen(leftAnchor, topAnchor). The core owns only the
// invisible collision bodies (src/core/sandboxEnvironment.ts, drawAnyway=false);
// this module is the purely-cosmetic fill that sits on top of them.
//
// It follows skyRenderer.ts's conventions: a public `view` Container, a
// build(sandbox) that rebuilds geometry only when the keyed settings change, and
// an update(camera, canvasW, canvasH) that repositions/rescales each frame.
//
// The rock randomness (BOX only, via Util.RangedRandom / Math.random) is cosmetic
// renderer-local jitter and never enters the deterministic sim — matching Sky's
// build-time Math.random. LAND uses the legacy's fixed DrawRock(...) list verbatim.

import { Container, Graphics, Matrix } from "pixi.js";
import { Gradient } from "../../Game/Graphics/Gradient";
import { Util } from "../../General/Util";
import type { CameraState, SandboxState } from "../../core";
import { worldToScreenX as w2sX, worldToScreenY as w2sY } from "./sceneRenderer";

// SandboxSettings.* enum values (mirrored from src/core/sandboxEnvironment.ts so
// this module doesn't reach into the Game controller graph).
const SIZE_SMALL = 0;
const SIZE_MEDIUM = 1;
const SIZE_LARGE = 2;
const SIZE_XLARGE = 3; // IB3 Ground.XLARGE
const TERRAIN_LAND = 0;
const TERRAIN_BOX = 1;
// TERRAIN_EMPTY = 2 draws nothing.
const TERRAIN_ISLAND = 3; // IB3 Ground.ISLAND — rendered like LAND (centered platform).

// --- Theme colour arrays, ported verbatim from ControllerSandbox.ts:15-25. ---
// Indexed by terrainTheme (0 grass, 1 dirt, 2 sand, 3 rock, 4 snow, 5 moon, 6 mars).
const terrainTopColours: string[] = [
	"#65CD4E",
	Util.HexColourString(191, 131, 83),
	Util.HexColourString(214, 189, 100),
	Util.HexColourString(181, 197, 201),
	Util.HexColourString(224, 238, 253),
	Util.HexColourString(198, 196, 205),
	Util.HexColourString(249, 172, 101),
];
const terrainBottomColours: string[] = [
	"#5AC043",
	Util.HexColourString(155, 89, 38),
	Util.HexColourString(187, 163, 78),
	Util.HexColourString(156, 171, 175),
	Util.HexColourString(159, 196, 239),
	Util.HexColourString(160, 158, 171),
	Util.HexColourString(240, 70, 45),
];
const terrainTopOutlines: string[] = [
	"#2DA12E",
	Util.HexColourString(144, 99, 62),
	Util.HexColourString(185, 163, 86),
	Util.HexColourString(153, 166, 169),
	Util.HexColourString(247, 251, 255),
	Util.HexColourString(139, 138, 144),
	Util.HexColourString(177, 102, 46),
];
const terrainBottomOutlines: string[] = [
	"#2DA12E",
	Util.HexColourString(117, 67, 29),
	Util.HexColourString(161, 141, 67),
	Util.HexColourString(132, 144, 148),
	Util.HexColourString(247, 251, 255),
	Util.HexColourString(115, 114, 122),
	Util.HexColourString(171, 59, 34),
];
const rock1TopColours: string[] = [
	"#8EDB82",
	Util.HexColourString(210, 157, 111),
	Util.HexColourString(219, 206, 135),
	Util.HexColourString(178, 187, 191),
	Util.HexColourString(217, 230, 245),
	Util.HexColourString(180, 180, 189),
	Util.HexColourString(194, 130, 87),
];
const rock1BottomColours: string[] = [
	"#7FBF72",
	Util.HexColourString(183, 133, 96),
	Util.HexColourString(190, 176, 119),
	Util.HexColourString(164, 173, 174),
	Util.HexColourString(201, 210, 225),
	Util.HexColourString(158, 158, 167),
	Util.HexColourString(172, 114, 77),
];
const rock2TopColours: string[] = [
	"#80D970",
	Util.HexColourString(206, 148, 90),
	Util.HexColourString(215, 202, 116),
	Util.HexColourString(169, 177, 182),
	Util.HexColourString(204, 217, 236),
	Util.HexColourString(170, 165, 179),
	Util.HexColourString(197, 115, 66),
];
const rock2BottomColours: string[] = [
	"#6DBE5D",
	Util.HexColourString(183, 122, 72),
	Util.HexColourString(188, 175, 97),
	Util.HexColourString(153, 162, 166),
	Util.HexColourString(183, 196, 217),
	Util.HexColourString(149, 145, 154),
	Util.HexColourString(175, 103, 58),
];
const rock3TopColours: string[] = [
	"#70C160",
	Util.HexColourString(207, 150, 92),
	Util.HexColourString(216, 203, 117),
	Util.HexColourString(173, 182, 186),
	Util.HexColourString(205, 217, 237),
	Util.HexColourString(172, 168, 181),
	Util.HexColourString(198, 121, 69),
];
const rock3BottomColours: string[] = [
	"#63AB52",
	Util.HexColourString(184, 123, 76),
	Util.HexColourString(189, 176, 98),
	Util.HexColourString(157, 166, 170),
	Util.HexColourString(186, 198, 218),
	Util.HexColourString(148, 148, 157),
	Util.HexColourString(179, 105, 57),
];
const rockOutlines: number[] = [0x6bb05a, 0xa66b52, 0xb1a058, 0x98a4a8, 0xbdcbd7, 0x94939d, 0xba643d];

/** Per-size/-type world anchor + width for the Update reposition (ControllerSandbox.ts:817-888). */
interface Anchor {
	leftX: number;
	topY: number;
	widthW: number;
}

export class GroundRenderer {
	/** The container GameCanvas mounts (above the sky, below/around the world Draw sprite). */
	public readonly view: Container = new Container();

	private gfx: Graphics | null = null;
	private anchor: Anchor | null = null;
	private theme = 0;

	// Cache the sandbox key we built for, so rebuilds only happen on change
	// (mirrors skyRenderer's builtKey).
	private builtKey = "";

	/**
	 * (Re)build the ground for the given sandbox settings. Cheap no-op if the
	 * relevant settings (terrainType/size/terrainTheme) are unchanged. Mirrors
	 * ControllerSandbox.BuildGround (:205-565).
	 */
	build(sandbox: SandboxState): void {
		const key = [sandbox.terrainType, sandbox.size, sandbox.terrainTheme, sandbox.groundStyle].join(",");
		if (key === this.builtKey) return;
		this.builtKey = key;

		this.clear();

		// IB3 ground (SHORE/ISLAND) has no sGround visual — it is drawn straight from
		// its own collision bodies (drawAnyway, see sandboxEnvironment.ts), so this
		// IB2-shaped decorative fill must NOT draw over it. Leave the view empty.
		if (sandbox.groundStyle === 1 /* GROUND_STYLE_IB3 */) {
			return;
		}

		this.theme = sandbox.terrainTheme;
		const g = new Graphics();
		this.gfx = g;

		if (sandbox.terrainType === TERRAIN_LAND || sandbox.terrainType === TERRAIN_ISLAND) {
			this.anchor = this.buildLand(g, sandbox.size);
		} else if (sandbox.terrainType === TERRAIN_BOX) {
			this.anchor = this.buildBox(g, sandbox.size);
		} else {
			// TERRAIN_EMPTY: nothing to draw.
			this.anchor = null;
		}

		if (this.anchor) this.view.addChild(g);
	}

	// --- LAND: gradient outline rect + fill rect, end-cap circles, fixed rocks. ---
	// Ported from ControllerSandbox.ts:205-361. Returns the Update anchor (:822-849).
	private buildLand(g: Graphics, size: number): Anchor {
		// Per-size geometry width (the "W_geo" used for the rects/right circle) and
		// the world anchors/width from Update().
		let wGeo: number;
		let anchor: Anchor;
		if (size === SIZE_XLARGE) {
			// LARGE geometry scaled ~1.5x horizontally (matches sandboxEnvironment).
			wGeo = 18000;
			anchor = { leftX: -377.85, topY: 12.06, widthW: 755.7 };
		} else if (size === SIZE_LARGE) {
			wGeo = 12000;
			anchor = { leftX: -253.55, topY: 12.06, widthW: 507.7 };
		} else if (size === SIZE_MEDIUM) {
			wGeo = 8000;
			anchor = { leftX: -123.45, topY: 12.06, widthW: 247.2 };
		} else {
			wGeo = 4000;
			anchor = { leftX: -42.36, topY: 12.06, widthW: 85 };
		}

		// Outline circles first (drawn before the fill rects in the source).
		this.drawGroundOutlineCircle(g, 0, 0, 150);
		this.drawGroundOutlineCircle(g, wGeo, 0, 150);

		// Outline gradient rect (144, -6, wGeo+12, 312), height 312.
		let m = new Matrix();
		g.rect(144, -6, wGeo + 12, 312);
		g.fill({
			texture: Gradient.getLinearGradientTexture(
				[terrainTopOutlines[this.theme], terrainBottomOutlines[this.theme]],
				312
			),
			matrix: m,
		});

		// Top fill gradient rect (150, 0, wGeo, 300), height 300.
		m = new Matrix();
		g.rect(150, 0, wGeo, 300);
		g.fill({
			texture: Gradient.getLinearGradientTexture(
				[terrainTopColours[this.theme], terrainBottomColours[this.theme]],
				300
			),
			matrix: m,
		});

		// Fill end-cap circles.
		this.drawGroundCircle(g, 0, 0, 150);
		this.drawGroundCircle(g, wGeo, 0, 150);

		// Fixed deterministic rock list (verbatim from source, per size).
		// SMALL(4000) uses the first 14; MEDIUM(8000) the first 30; LARGE(12000) all.
		const rocks: [number, number, number, number][] = [
			[0, 169, 200, 40],
			[0, 318, 44, 48],
			[2, 795, 195, 28],
			[0, 1110, 120, 40],
			[2, 1440, 121, 69],
			[0, 1762, 68, 57],
			[1, 2082, 11, 68],
			[0, 2395, 192, 51],
			[0, 2727, 152, 39],
			[0, 3032, 74, 61],
			[1, 3196, 18, 46],
			[0, 3527, 197, 28],
			[0, 3842, 168, 18],
			// MEDIUM continues from here (indices 13..29):
			[1, 4003, 108, 23],
			[2, 4325, 47, 68],
			[0, 4641, 109, 50],
			[1, 4806, 164, 27],
			[2, 5110, 138, 16],
			[2, 5287, 199, 45],
			[2, 5447, 40, 68],
			[1, 5605, 142, 22],
			[2, 5769, 173, 54],
			[0, 6075, 169, 15],
			[1, 6401, 24, 41],
			[0, 6569, 86, 59],
			[0, 6885, 74, 29],
			[2, 7200, 153, 15],
			[0, 7354, 121, 32],
			[2, 7722, 89, 61],
			[1, 7946, 66, 19],
			// LARGE continues from here (indices 30..):
			[2, 8325, 47, 68],
			[0, 8641, 109, 50],
			[1, 8806, 164, 27],
			[2, 9110, 138, 16],
			[2, 9287, 199, 45],
			[2, 9447, 40, 68],
			[1, 9605, 142, 22],
			[2, 9769, 173, 54],
			[0, 10075, 169, 15],
			[1, 10401, 24, 41],
			[0, 10569, 86, 59],
			[0, 10885, 74, 29],
			[2, 11200, 153, 15],
			[0, 11354, 121, 32],
			[2, 11722, 89, 61],
			[1, 11946, 66, 19],
		];
		// SMALL: source stops at [0, 3842, 168, 18] (13 rocks, indices 0..12).
		// MEDIUM: stops at [1, 7946, 66, 19] (30 rocks, indices 0..29).
		// LARGE: all 46 rocks.
		const count = size === SIZE_SMALL ? 13 : size === SIZE_MEDIUM ? 30 : rocks.length;
		for (let i = 0; i < count; i++) {
			const [type, x, y, r] = rocks[i];
			this.drawRock(g, type, x, y, r);
		}

		return anchor;
	}

	// --- BOX: 4 outline gradient rects + 4 slightly-inset fill rects + rocks. ---
	// Ported from ControllerSandbox.ts:362-564. Returns the Update anchor (:851-878).
	private buildBox(g: Graphics, size: number): Anchor {
		// Per-size rect dimensions and the world anchors/width from Update().
		// Layout: outer W x H, wall thickness thicknessX (sides) / thicknessY (top+bottom).
		let W: number;
		let H: number;
		let thicknessX: number;
		let thicknessY: number;
		let outlineThickness: number;
		let anchor: Anchor;
		if (size === SIZE_XLARGE) {
			// LARGE box scaled ~1.5x (matches sandboxEnvironment).
			W = 6000;
			H = 1896;
			thicknessX = 750;
			thicknessY = 300;
			outlineThickness = 1.5;
			anchor = { leftX: -519.75, topY: -261.75, widthW: 1039.5 };
		} else if (size === SIZE_LARGE) {
			W = 4000;
			H = 1264;
			thicknessX = 500;
			thicknessY = 200;
			outlineThickness = 1.5;
			anchor = { leftX: -346.5, topY: -174.5, widthW: 693 };
		} else if (size === SIZE_MEDIUM) {
			W = 2000;
			H = 615;
			thicknessX = 400;
			thicknessY = 100;
			outlineThickness = 1;
			anchor = { leftX: -216.25, topY: -101.45, widthW: 432.5 };
		} else {
			W = 1000;
			H = 339;
			thicknessX = 200;
			thicknessY = 39;
			outlineThickness = 2;
			anchor = { leftX: -66.42, topY: -30, widthW: 132.85 };
		}

		const gradOutline = () =>
			Gradient.getLinearGradientTexture([terrainTopOutlines[this.theme], terrainBottomOutlines[this.theme]]);
		const gradFill = () =>
			Gradient.getLinearGradientTexture([terrainTopColours[this.theme], terrainBottomColours[this.theme]]);

		// Outline (outer) rects: left wall, right wall, top bar, bottom bar.
		let m = new Matrix();
		g.rect(0, 0, thicknessX, H);
		g.fill({ texture: gradOutline(), matrix: m });
		g.rect(W - thicknessX, 0, thicknessX, H);
		g.fill({ texture: gradOutline(), matrix: m });
		g.rect(0, 0, W, thicknessY);
		g.fill({ texture: gradOutline(), matrix: m });
		g.rect(0, H - thicknessY, W, thicknessY);
		g.fill({ texture: gradOutline(), matrix: m });

		// Fill (inner) rects, inset by 1.5px on the leading edge so the outline shows.
		// (Source insets: side walls width thicknessX-1.5, right wall starts +1.5;
		//  top/bottom bars height thicknessY-1.5, bottom bar starts +1.5.)
		g.rect(0, 0, thicknessX - 1.5, H);
		g.fill({ texture: gradFill(), matrix: m });
		g.rect(W - thicknessX + 1.5, 0, thicknessX - 1.5, H);
		g.fill({ texture: gradFill(), matrix: m });
		g.rect(0, 0, W, thicknessY - 1.5);
		g.fill({ texture: gradFill(), matrix: m });
		g.rect(0, H - thicknessY + 1.5, W, thicknessY - 1.5);
		g.fill({ texture: gradFill(), matrix: m });

		this.drawRocksForBox(g, W, H, thicknessX, thicknessY, outlineThickness);

		return anchor;
	}

	// --- Helpers, ported verbatim from ControllerSandbox.ts:720-815. ---

	private drawGroundOutlineCircle(g: Graphics, xPos: number, yPos: number, radius: number): void {
		const m = new Matrix();
		m.translate(0, yPos);
		g.circle(xPos + radius, yPos + radius, radius + 6);
		g.fill({
			texture: Gradient.getLinearGradientTexture(
				[terrainTopOutlines[this.theme], terrainBottomOutlines[this.theme]],
				radius * 2
			),
			matrix: m,
		});
	}

	private drawGroundCircle(g: Graphics, xPos: number, yPos: number, radius: number): void {
		const m = new Matrix();
		m.translate(0, yPos);
		g.circle(xPos + radius, yPos + radius, radius);
		g.fill({
			texture: Gradient.getLinearGradientTexture(
				[terrainTopColours[this.theme], terrainBottomColours[this.theme]],
				radius * 2
			),
			matrix: m,
		});
	}

	private drawRock(g: Graphics, type: number, xPos: number, yPos: number, radius: number, outlineThickness = 6): void {
		const m = new Matrix();
		m.translate(0, yPos);
		g.circle(xPos + radius, yPos + radius, radius);
		const stops =
			type === 0
				? [rock1TopColours[this.theme], rock1BottomColours[this.theme]]
				: type === 1
					? [rock2TopColours[this.theme], rock2BottomColours[this.theme]]
					: [rock3TopColours[this.theme], rock3BottomColours[this.theme]];
		g.fill({
			texture: Gradient.getLinearGradientTexture(stops, radius * 2),
			matrix: m,
		});
		g.stroke({ width: outlineThickness, color: rockOutlines[this.theme] });
	}

	private drawRocksForBox(
		g: Graphics,
		width: number,
		height: number,
		thicknessX: number,
		thicknessY: number,
		outlineThickness: number
	): void {
		const numRocks = width === 1000 ? 60 : width === 2000 ? 200 : 500;
		const rockPositions: { x: number; y: number }[] = [];
		for (let i = 0; i < numRocks; i++) {
			let rockPosition: { x: number; y: number };
			let badPosition: boolean;
			do {
				badPosition = false;
				rockPosition = { x: Util.RangedRandom(0, width), y: Util.RangedRandom(0, height) };
				if (
					(rockPosition.x > thicknessX - 32 &&
						rockPosition.x < width - thicknessX + 2 &&
						rockPosition.y > thicknessY - 32 &&
						rockPosition.y < height - thicknessY + 2) ||
					rockPosition.x > width - 32 ||
					rockPosition.y > height - 32
				) {
					badPosition = true;
				} else {
					for (let j = 0; j < rockPositions.length; j++) {
						if (Util.GetDist(rockPosition.x, rockPosition.y, rockPositions[j].x, rockPositions[j].y) < 32) {
							badPosition = true;
							break;
						}
					}
				}
			} while (badPosition);
			rockPositions.push(rockPosition);
			this.drawRock(
				g,
				// EXACT port: the source passes the raw float from RangedRandom(0,3)
				// into DrawRock, whose `type == 0 : type == 1 : else` ladder almost
				// never matches a non-integer, so BOX rocks render the type-3 tint.
				// Kept bug-for-bug rather than Math.floor'd (which would even the mix).
				Util.RangedRandom(0, 3),
				rockPosition.x,
				rockPosition.y,
				Util.RangedRandom(5, 15),
				outlineThickness
			);
		}
	}

	/**
	 * Per-frame reposition/rescale, faithful to ControllerSandbox.Update
	 * (:817-879). Mirrors the legacy exactly: set the on-screen target width via
	 * the Pixi `width` setter — which makes Pixi compute scale.x =
	 * targetWidthPx / localContentWidth — then copy scale.y = scale.x, and anchor
	 * the local origin at World2Screen(leftAnchor, topAnchor). Because the legacy
	 * built the identical geometry into `sGround`, its local content width matches
	 * and the derived uniform scale reproduces the original mapping.
	 */
	update(cam: CameraState, canvasW: number, canvasH: number): void {
		if (!this.gfx || !this.anchor) return;
		const a = this.anchor;
		// targetWidthPx = World2ScreenX(W) - World2ScreenX(0) = W * scale.
		const targetWidthPx = w2sX(a.widthW, cam, canvasW) - w2sX(0, cam, canvasW);
		this.view.width = targetWidthPx; // Pixi sets scale.x = targetWidthPx / localWidth.
		this.view.scale.y = this.view.scale.x;
		this.view.x = w2sX(a.leftX, cam, canvasW);
		this.view.y = w2sY(a.topY, cam, canvasH);
	}

	private clear(): void {
		this.view.removeChildren();
		if (this.gfx) {
			this.gfx.destroy();
			this.gfx = null;
		}
		this.anchor = null;
		// Reset any accumulated transform so a rebuild starts from identity before
		// the next update() re-derives scale from the fresh geometry.
		this.view.scale.set(1);
		this.view.position.set(0, 0);
	}

	destroy(): void {
		this.clear();
		this.view.destroy({ children: true });
	}
}
