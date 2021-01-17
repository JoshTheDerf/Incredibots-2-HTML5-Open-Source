export class SandboxSettings {
  public gravity: number;
  public size: number;
  public terrainType: number;
  public terrainTheme: number;
  public background: number;
  public backgroundR: number;
  public backgroundG: number;
  public backgroundB: number;

  public static SIZE_SMALL: number = 0;
  public static SIZE_MEDIUM: number = 1;
  public static SIZE_LARGE: number = 2;

  public static TERRAIN_LAND: number = 0;
  public static TERRAIN_BOX: number = 1;
  public static TERRAIN_EMPTY: number = 2;

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
