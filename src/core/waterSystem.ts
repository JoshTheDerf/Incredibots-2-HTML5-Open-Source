// Water system — the headless-core port of IB3's Control/WaterControl.as
// (ib3-decompiled/scripts/Control/WaterControl.as, v0.00.33b). Node-clean: no
// pixi — rendering lives in src/ui/renderer/waterRenderer.ts, which reads the
// surface read-model this system exposes.
//
// WaterControl drives the Box2DFlash 2.1a water controllers from the sandbox
// settings: TYPE_TIDE (0) builds a b2TideController with a sinusoidal surface
// height (heightOsc/heightOscSpeed) + tilt (tiltOsc/tiltOscSpeed) oscillation;
// TYPE_WAVE (1) builds a b2WaveController with a continuous sin-wave generator
// (WaterControl.Init :140 — ContinuousWaves(0, 0, 1, 5, 0.1, 0, "sin")).
//
// ENGINE-AGNOSTIC (P1.5b-3): this system owns the WaterState -> controller-params
// projection (the density scale + surface-offset + tide/wave surface-animation
// closures below) and the addedToWater / buoyant-flag bookkeeping, but the three
// engine-specific ops — CREATE the controller, REGISTER a body, READ the surface
// back — route through the active PhysicsBackend. So the SAME WaterState drives
// the src/Box2D controllers on engine 0 and the native src/Box2D21 controllers on
// engine 1; both worlds Step every registered controller at the top of Solve.
//
// UNIT CONVERSIONS (WaterControl.as -> here):
// - waterHeight `h` is entered/stored directly in WORLD units (metres): the
//   WaterWindow height field is unconverted (WaterWindow.SanitizeHeight) and
//   Init sets controller offset = -h. WaterControl's HEIGHTOFF=600 /
//   HEIGHTDIVISOR=30 consts are DEAD in the shipped IB3 (declared, never
//   read) — the pixel<->world conversion happens render-side via the camera
//   (h * scale + y_offset, WaterControl.GetGPath), same as our renderer.
//   With the surface normal (0,-1), water occupies world y > h (+y is down).
// - waterDensity uses the SAME density scale as parts: Util.DensityToBox2D =
//   (clamp(d, 0.1, 40) + 5) / 10 (Util.as:292) — identical to the IB2 part
//   formula (density + 5) / 10 (Circle.ts:66), so a part floats iff its
//   density slider is below the water density slider.
// - linearDrag/angularDrag (0..40) pass through unconverted (WaterControl.Init).
// - heightOscSpeed is the tide period in MILLISECONDS: WaterControl's
//   m_initHeightOscMult = 2*PI*1000 / (heightOscSpeed * frameRate) and
//   tideFunc(t) = heightOsc * sin(t * mult / timeStep), where t/timeStep is
//   the number of controller steps and steps happen once per 60fps stage
//   frame — i.e. phase = 2*PI * elapsed_ms / heightOscSpeed. Our controllers
//   step twice per 30fps logical frame (GameCore's two 1/60 sub-steps), so
//   the tide controller's dt-accumulated stepTracker t IS elapsed sim seconds
//   and the equivalent closed form is used directly:
//     tideFunc(t)    = heightOsc * sin(2*PI * 1000 * t / heightOscSpeed)
//     normalXFunc(t) = tiltOsc   * sin(2*PI * tiltOscSpeed * t)
//   (tiltOscSpeed is in oscillations per second — WaterControl.normalXFunc's
//   t/timeStep/frameRate collapses to seconds the same way.)

import type { b2Body, b2World } from "../Box2D";
import { SandboxSettings } from "../Game/SandboxSettings";
import { getPhysicsBackend } from "../Parts/partGlobals";
import type { WaterControllerDef } from "./physics";

const PI2 = Math.PI * 2;

/**
 * The 12 water settings carried on GameState.sandbox (plain-serializable
 * mirror of the SandboxSettings water fields, IB3 Control/SandboxSettings.as
 * :37-59). Field meanings/defaults documented in src/Game/SandboxSettings.ts.
 */
export interface WaterState {
	enabled: boolean;
	/** SandboxSettings.WATER_TYPE_TIDE (0) / WATER_TYPE_WAVE (1). */
	type: number;
	density: number;
	/** surface height in world units; water occupies y > height (+y down). */
	height: number;
	/** 0xRRGGBB. */
	color: number;
	/** 0-255. */
	opacity: number;
	linearDrag: number;
	angularDrag: number;
	heightOsc: number;
	/** tide period in ms. */
	heightOscSpeed: number;
	tiltOsc: number;
	/** tilt oscillations per second. */
	tiltOscSpeed: number;
}

/** Water defaults — the SandboxSettings field initializers (enabled FALSE). */
export function defaultWaterState(): WaterState {
	return waterStateFromSettings(new SandboxSettings(15, 0, 0, 0, 0));
}

/** Project a SandboxSettings' water fields into the state slice. */
export function waterStateFromSettings(s: SandboxSettings): WaterState {
	return {
		enabled: s.waterEnabled,
		type: s.waterType,
		density: s.waterDensity,
		height: s.waterHeight,
		color: s.waterColor,
		opacity: s.waterOpacity,
		linearDrag: s.waterLinearDrag,
		angularDrag: s.waterAngularDrag,
		heightOsc: s.waterHeightOsc,
		heightOscSpeed: s.waterHeightOscSpeed,
		tiltOsc: s.waterTiltOsc,
		tiltOscSpeed: s.waterTiltOscSpeed,
	};
}

/** Apply a water slice back onto a SandboxSettings (for export/serialization). */
export function applyWaterState(settings: SandboxSettings, w: WaterState): SandboxSettings {
	settings.waterEnabled = w.enabled;
	settings.waterType = w.type;
	settings.waterDensity = w.density;
	settings.waterHeight = w.height;
	settings.waterColor = w.color;
	settings.waterOpacity = w.opacity;
	settings.waterLinearDrag = w.linearDrag;
	settings.waterAngularDrag = w.angularDrag;
	settings.waterHeightOsc = w.heightOsc;
	settings.waterHeightOscSpeed = w.heightOscSpeed;
	settings.waterTiltOsc = w.tiltOsc;
	settings.waterTiltOscSpeed = w.tiltOscSpeed;
	return settings;
}

/**
 * Live water-surface read-model for the renderer, refreshed after each step
 * (GameState.water). Surface plane: dot((normalX,-1), p) = offset, i.e.
 * worldY(x) = normalX * x - offset — see waterRenderer.ts for the GetGPath /
 * GenerateGPath draw math.
 */
export interface WaterSurfaceState {
	/** current controller offset (tide-animated; -height when static). */
	offset: number;
	/** current surface normal.x (tilt); 0 = level. */
	normalX: number;
	/**
	 * live travelling waves (wave type only): centre x, amplitude, width and
	 * wave function, for drawing the surface profile. DEVIATION: the shipped
	 * IB3 draws NO water at all for the wave type (WaterControl.GetGPath
	 * returns null for b2WaveController); we expose the waves so the renderer
	 * can draw the actual profile instead of nothing.
	 */
	waves: { x: number; amplitude: number; width: number; fn: "sin" | "cos" }[];
}

/** Util.DensityToBox2D (Util.as:292): (clamp(d, 0.1, 40) + 5) / 10. */
function densityToBox2D(density: number): number {
	return (Math.max(0.1, Math.min(40, density)) + 5) / 10;
}

/**
 * Port of WaterControl: builds the tide/wave controller from the water
 * settings, registers it on the world, and tracks which bodies were added
 * (WaterControl.AddBody's per-body addedToWater guard). One instance per
 * play; dropped with the world on reset/stop.
 */
export class WaterSystem {
	private readonly settings: WaterState;
	/**
	 * The active backend's opaque water-controller handle (engine 0: an
	 * src/Box2D controller; engine 1: an src/Box2D21 controller). Never method-
	 * called here — only passed back to the backend's addWaterBody / waterSurface.
	 */
	private controller: unknown = null;
	/** WaterControl.AddBody's userData.addedToWater guard, as a Set. */
	private readonly added = new Set<b2Body>();

	constructor(settings: WaterState) {
		this.settings = settings;
	}

	/**
	 * WaterControl.Init (:99-142): project the settings into a controller def
	 * (the surface-animation math + density scale live HERE, once, for both
	 * engines) and let the active backend build + register the engine's
	 * controller on the world.
	 */
	init(world: b2World): void {
		const s = this.settings;
		if (!s.enabled) return;
		// tideFunc/normalXFunc closed forms — see the unit-conversion notes in the
		// file header (t is dt-accumulated sim seconds). Only meaningful for the
		// tide type; null for wave (the backend ignores them there).
		const isWave = s.type === SandboxSettings.WATER_TYPE_WAVE;
		const heightOscMult = s.heightOscSpeed > 0 ? (PI2 * 1000) / s.heightOscSpeed : 0;
		const def: WaterControllerDef = {
			type: s.type,
			density: densityToBox2D(s.density),
			surfaceOffset: -s.height,
			linearDrag: s.linearDrag,
			angularDrag: s.angularDrag,
			tideFunc: isWave ? null : (t: number) => s.heightOsc * Math.sin(t * heightOscMult),
			normalXFunc: isWave ? null : (t: number) => s.tiltOsc * Math.sin(PI2 * s.tiltOscSpeed * t),
		};
		this.controller = getPhysicsBackend().createWaterController(world, def);
	}

	/**
	 * WaterControl.AddBody (:160-166): register a part's body with the water
	 * controller once (welded groups share a body — the Set is the
	 * addedToWater guard). Static bodies are skipped (IB3 only adds
	 * !fixated parts; forces on a static body are no-ops anyway).
	 */
	addBody(body: b2Body | null | undefined): void {
		if (!body || this.controller == null || this.added.has(body) || getPhysicsBackend().bodyIsStatic(body)) return;
		getPhysicsBackend().addWaterBody(this.controller, body);
		this.added.add(body);
	}

	/** Current surface geometry for the renderer (GameState.water). */
	surface(): WaterSurfaceState {
		if (this.controller == null) {
			return { offset: -this.settings.height, normalX: 0, waves: [] };
		}
		return getPhysicsBackend().waterSurface(this.controller);
	}
}
