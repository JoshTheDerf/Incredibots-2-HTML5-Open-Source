export class SandboxSettings {
  public gravity: number;
  public size: number;
  public terrainType: number;
  public terrainTheme: number;
  public background: number;
  public backgroundR: number;
  public backgroundG: number;
  public backgroundB: number;

  // --- IB3 water settings (IB3 Control/SandboxSettings.as:37-59, defaults
  // :90-101 via Control/WaterControl.as consts + General/Util.as WC*Default).
  // Serialized with the settings object (AMF writes all public fields);
  // absent on old codes, so loaders hasOwnProperty-guard them to these
  // defaults. NOTE: waterEnabled defaults FALSE here (IB3's
  // WaterControl.ENABLED_DEFAULT is true) so existing IB2 sandboxes keep
  // their behavior — water only turns on when a code/UI asks for it.
  public waterEnabled: boolean = false;
  /** WaterControl.TYPE_TIDE=0 / TYPE_WAVE=1 (WaterControl.as:19-23). */
  public waterType: number = SandboxSettings.WATER_TYPE_TIDE;
  /** Util.WC_DENSITY_VAL_DEF (Util.as:98). */
  public waterDensity: number = 20;
  /** WaterControl.HEIGHT_DEFAULT (WaterControl.as:25). */
  public waterHeight: number = 0;
  /** uint 0xRRGGBB; WaterControl.COLOR_DEFAULT = 255 = 0x0000FF (WaterControl.as:27). */
  public waterColor: number = 255;
  /** 0-255; WaterControl.OPACITY_DEFAULT (WaterControl.as:33). */
  public waterOpacity: number = 127;
  /** Util.WC_LINEAR_VAL_DEF (Util.as:104). */
  public waterLinearDrag: number = 5;
  /** Util.WC_ANGULAR_VAL_DEF (Util.as:110). */
  public waterAngularDrag: number = 2;
  /** WaterControl.HEIGHTOSC_DEFAULT (WaterControl.as:29). */
  public waterHeightOsc: number = 0.167;
  /** ms per oscillation; WaterControl.HEIGHTOSCSPEED_DEFAULT (WaterControl.as:31). */
  public waterHeightOscSpeed: number = 4000;
  /** WaterControl.TILTOSC_DEFAULT (WaterControl.as:35). */
  public waterTiltOsc: number = 0;
  /** WaterControl.TILTOSCSPEED_DEFAULT (WaterControl.as:37). */
  public waterTiltOscSpeed: number = 1;

  // --- Physics engine selection (P1.5b-2b). Which Box2D backend a design
  // simulates on: 0 = IB2 (Box2DFlash 2.0.2, the default, src/Box2D) |
  // 1 = IB3 (Box2DFlash 2.1a, src/Box2D21) | 2 = Box2D 3.x (box2d3-wasm) —
  // RESERVED, not yet implemented (see .agents/ib3-merge/ENGINE-BOX2D3-PLAN.md),
  // falls back to engine 1 at play time. Serialized with the settings object
  // (AMF writes all public fields); absent on old / IB2 / CE / Jaybit codes, so
  // loaders hasOwnProperty-guard it to 0 — those codes keep the classic engine.
  // IB3 imports set it to 1 (their bots were tuned on 2.1a).
  public physicsEngine: number = SandboxSettings.ENGINE_IB2;

  public static ENGINE_IB2: number = 0;
  public static ENGINE_IB3: number = 1;
  public static ENGINE_BOX2D3: number = 2;

  // Which game's sandbox GROUND geometry to build: 0 = IB2 (classic platform,
  // surface at y=12), 1 = IB3 (SHORE/ISLAND, surface at y=-1). IB3 bots are
  // positioned in IB3 world coords so they only rest on IB3-shaped ground.
  // Serialized with the settings (AMF writes all public fields); absent on old /
  // IB2 / CE / Jaybit codes -> loaders guard it to 0. IB3 imports set it to 1.
  // Kept independent of physicsEngine so an IB3 design keeps IB3 ground on any
  // engine (the deserializers also fall back to IB3 ground for old IB3-engine
  // saves that predate this field).
  public groundStyle: number = SandboxSettings.GROUND_STYLE_IB2;

  public static GROUND_STYLE_IB2: number = 0;
  public static GROUND_STYLE_IB3: number = 1;

  public static WATER_TYPE_TIDE: number = 0;
  public static WATER_TYPE_WAVE: number = 1;

  public static SIZE_SMALL: number = 0;
  public static SIZE_MEDIUM: number = 1;
  public static SIZE_LARGE: number = 2;
  // IB3 Ground.XLARGE (IB3 Control/Ground.as:25) — a fourth, larger world size.
  public static SIZE_XLARGE: number = 3;

  public static TERRAIN_LAND: number = 0;
  public static TERRAIN_BOX: number = 1;
  public static TERRAIN_EMPTY: number = 2;
  // IB3 Ground.ISLAND (IB3 Control/Ground.as:17) — a centered platform. IB2's
  // LAND is already a symmetric rounded platform, so ISLAND reuses that geometry
  // but is a distinct enum so IB3 island imports round-trip as island, not land.
  public static TERRAIN_ISLAND: number = 3;

  public static TERRAIN_GRASS: number = 0;
  public static TERRAIN_DIRT: number = 1;
  public static TERRAIN_SAND: number = 2;
  public static TERRAIN_ROCK: number = 3;
  public static TERRAIN_SNOW: number = 4;
  public static TERRAIN_MOON: number = 5;
  public static TERRAIN_MARS: number = 6;

  public static BACKGROUND_SKY: number = 0;
  public static BACKGROUND_SPACE: number = 1;
  public static BACKGROUND_NIGHT: number = 2;
  public static BACKGROUND_DUSK: number = 3;
  public static BACKGROUND_MARS: number = 4;
  public static BACKGROUND_SUNSET: number = 5;
  public static BACKGROUND_SOLID_COLOUR: number = 6;

  constructor(
    grav: number,
    s: number,
    type: number,
    theme: number,
    bg: number,
    r: number = 0,
    g: number = 0,
    b: number = 0
  ) {
    this.gravity = grav;
    this.size = s;
    this.terrainType = type;
    this.terrainTheme = theme;
    this.background = bg;
    this.backgroundR = r;
    this.backgroundG = g;
    this.backgroundB = b;
  }
}
