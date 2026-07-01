// Renderer-only sky / background — a faithful port of src/Game/Graphics/Sky.ts.
//
// Sky.ts is coupled to the legacy Controller (it calls cont.addChild /
// World2ScreenX / GetPhysScale / IsPaused / GetMinX etc. and pulls cloud
// textures from the Pixi-bound Resource). Rather than construct a fake
// Controller adapter, this module replicates Sky.ts's EXACT constants and
// cloud/star math against the GameCore sandbox state + camera, painting into a
// Pixi Container that GameCanvas mounts BEHIND the world (Draw) sprite.
//
// It is deliberately renderer-local: the cosmetic cloud/star randomness
// (Math.random at build time — Sky.ts:62-102) never enters the deterministic
// sim / replay (spec §7.5). The core knows nothing about this.

import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import { Gradient } from "../../Game/Graphics/Gradient";
import { Util } from "../../General/Util";
import type { CameraState, SandboxState } from "../../core";

import cCloud0 from "../../../resource/cloud_0.png";
import cCloud1 from "../../../resource/cloud_1.png";
import cCloud2 from "../../../resource/cloud_2.png";
import cCloud3 from "../../../resource/cloud_3.png";
import cCloud4 from "../../../resource/cloud_4.png";
import cCloud5 from "../../../resource/cloud_5.png";
import cCloud6 from "../../../resource/cloud_6.png";
import cCloud7 from "../../../resource/cloud_7.png";
import cCloud8 from "../../../resource/cloud_8.png";
import cCloud9 from "../../../resource/cloud_9.png";

const CLOUD_URLS = [
	cCloud0, cCloud1, cCloud2, cCloud3, cCloud4,
	cCloud5, cCloud6, cCloud7, cCloud8, cCloud9,
];

// Gradient stops indexed by background type 0-5 (Sky.ts:10-25).
const TOP_COLOURS = ["#43B0F7", "#171717", "#292935", "#22243C", "#BE4A3C", "#4790EC"];
const BOTTOM_COLOURS = ["#8ACEF7", "#353738", "#48475F", "#40457E", "#EB7A76", "#EC8D66"];

const BACKGROUND_SOLID_COLOUR = 6;

/** world -> screen, matching GameCanvas' Draw transform (screen = canvas/2 + world*scale - offset). */
function w2sX(x: number, cam: CameraState, canvasW: number): number {
	return canvasW / 2 + x * cam.scale - cam.offsetX;
}
function w2sY(y: number, cam: CameraState, canvasH: number): number {
	return canvasH / 2 + y * cam.scale - cam.offsetY;
}

export class SkyRenderer {
	/** The container GameCanvas mounts behind the Draw sprite. */
	public readonly view: Container = new Container();

	private skyType = -1;
	private numClouds = 0;
	private gradient: Sprite | null = null;
	// type 0 (SKY): per-cloud sprites + parallel position/velocity arrays (Sky.ts).
	private clouds: Sprite[] = [];
	private cloudPositions: { x: number; y: number }[] = [];
	private cloudVelocities: number[] = [];
	// type 1 (SPACE): a single Graphics of stars.
	private starsGfx: Graphics | null = null;

	private cloudTextures: Texture[] = [];
	private cloudsLoaded = false;

	// Cache the sandbox key we built for so rebuilds only happen on change.
	private builtKey = "";

	/**
	 * Preload the 10 cloud textures via Assets.load (Pixi v8 requires assets be
	 * loaded into the cache before Sprite sizing works). Once resolved, force the
	 * next build() to rebuild so the SKY clouds pick up the real textures.
	 */
	async preload(): Promise<void> {
		if (this.cloudsLoaded) return;
		const loaded = await Promise.all(CLOUD_URLS.map((u) => Assets.load(u)));
		this.cloudTextures = loaded as Texture[];
		this.cloudsLoaded = true;
		this.builtKey = ""; // invalidate so the next build() rebuilds with textures
	}

	/**
	 * (Re)build the sky for the given sandbox settings + bounds. Cheap no-op if
	 * the relevant settings are unchanged. Mirrors Sky's constructor (Sky.ts:38).
	 */
	build(sandbox: SandboxState): void {
		const key = [
			sandbox.background,
			sandbox.backgroundR,
			sandbox.backgroundG,
			sandbox.backgroundB,
			sandbox.bounds.minX,
			sandbox.bounds.maxX,
		].join(",");
		if (key === this.builtKey) return;
		this.builtKey = key;

		this.clear();

		const type = sandbox.background;
		this.skyType = type;

		// --- gradient (Sky.ts:44-54) — 800x600 sprite, top->bottom colours ---
		const stops =
			type === BACKGROUND_SOLID_COLOUR
				? [
						Util.HexColourString(sandbox.backgroundR, sandbox.backgroundG, sandbox.backgroundB),
						Util.HexColourString(sandbox.backgroundR, sandbox.backgroundG, sandbox.backgroundB),
				  ]
				: [TOP_COLOURS[type] ?? TOP_COLOURS[0], BOTTOM_COLOURS[type] ?? BOTTOM_COLOURS[0]];
		const grad = new Sprite(Gradient.getLinearGradientTexture(stops));
		grad.position.set(0, 0);
		grad.width = 800;
		grad.height = 600;
		this.gradient = grad;
		this.view.addChild(grad);

		const minX = sandbox.bounds.minX;
		const maxX = sandbox.bounds.maxX;

		this.numClouds = 0;
		if (type === 0) {
			// Clouds (Sky.ts:60-82): numClouds = min((maxX-minX)/10, 15).
			this.numClouds = Math.min((maxX - minX) / 10.0, 15);
			for (let i = 0; i < this.numClouds; i++) {
				const rand = Math.floor(Math.random() * 10);
				const tex = this.cloudTexture(rand >= 9 ? 9 : rand);
				const cloud = new Sprite(tex);
				this.view.addChild(cloud);
				this.clouds.push(cloud);
				this.cloudPositions.push({
					x: Util.RangedRandom(minX - 5, maxX + 5),
					y: Util.RangedRandom(-15, 6),
				});
				// leftward per-frame velocity (Sky.ts:81).
				this.cloudVelocities.push((3 * Math.random()) / 120.0 + 1.0 / 120.0);
			}
		} else if (type === 1) {
			// Stars (Sky.ts:83-107). numClouds is reused as the STAR COUNT here.
			const worldSize = maxX - minX + 10;
			this.numClouds = (maxX - minX) * 10;
			const stars = new Graphics();
			for (let i = 0; i < this.numClouds; i++) {
				const px = Util.RangedRandom(0, worldSize * 90);
				const py = Util.RangedRandom(0, worldSize * 90);
				const r = Util.RangedRandom(2, 6);
				this.cloudPositions.push({ x: px, y: py });
				this.cloudVelocities.push(0);
				stars.circle(px, py, r);
			}
			stars.fill(0xaec9da);
			this.starsGfx = stars;
			this.view.addChild(stars);
		}
	}

	private cloudTexture(index: number): Texture {
		return this.cloudTextures[index] ?? Texture.EMPTY;
	}

	/**
	 * Per-frame reposition/rescale + cloud drift, faithful to Sky.Update
	 * (Sky.ts:111-141). `paused` mirrors !IsPaused() gating of the drift.
	 */
	update(cam: CameraState, bounds: SandboxState["bounds"], canvasW: number, canvasH: number, paused: boolean): void {
		if (this.skyType === 0) {
			for (let i = 0; i < this.clouds.length; i++) {
				const c = this.clouds[i];
				// Rescale with zoom (Sky.ts:115-116): texture size * scale / 90.
				c.width = (c.texture.width * cam.scale) / 90;
				c.height = (c.texture.height * cam.scale) / 90;
				if (!paused) {
					this.cloudPositions[i].x -= this.cloudVelocities[i];
					if (this.cloudPositions[i].x < bounds.minX - 5) this.cloudPositions[i].x = bounds.maxX + 5;
				}
				c.x = w2sX(this.cloudPositions[i].x, cam, canvasW) - c.width / 2;
				c.y = w2sY(this.cloudPositions[i].y, cam, canvasH) - c.height / 2;
			}
		} else if (this.skyType === 1 && this.starsGfx) {
			// Stars scale + anchor to (minX-5, minY-5) (Sky.ts:118-122, 137-138).
			const w = w2sX(bounds.maxX + 5, cam, canvasW) - w2sX(bounds.minX - 5, cam, canvasW);
			this.starsGfx.width = w;
			this.starsGfx.height = w;
			this.starsGfx.x = w2sX(bounds.minX - 5, cam, canvasW);
			this.starsGfx.y = w2sY(bounds.minY - 5, cam, canvasH);
		}
	}

	private clear(): void {
		this.view.removeChildren();
		this.gradient = null;
		this.clouds = [];
		this.cloudPositions = [];
		this.cloudVelocities = [];
		this.starsGfx = null;
		this.numClouds = 0;
	}

	destroy(): void {
		this.clear();
		this.view.destroy({ children: true });
	}
}
