export class SandboxSettings
{
  public gravity:Number;
  public size:Number;
  public terrainType:Number;
  public terrainTheme:Number;
  public background:Number;
  public backgroundR:Number;
  public backgroundG:Number;
  public backgroundB:Number;

  public static SIZE_SMALL:Number = 0;
  public static SIZE_MEDIUM:Number = 1;
  public static SIZE_LARGE:Number = 2;

  public static TERRAIN_LAND:Number = 0;
  public static TERRAIN_BOX:Number = 1;
  public static TERRAIN_EMPTY:Number = 2;

  public static TERRAIN_GRASS:Number = 0;
  public static TERRAIN_DIRT:Number = 1;
  public static TERRAIN_SAND:Number = 2;
  public static TERRAIN_ROCK:Number = 3;
  public static TERRAIN_SNOW:Number = 4;
  public static TERRAIN_MOON:Number = 5;
  public static TERRAIN_MARS:Number = 6;

  public static BACKGROUND_SKY:Number = 0;
  public static BACKGROUND_SPACE:Number = 1;
  public static BACKGROUND_NIGHT:Number = 2;
  public static BACKGROUND_DUSK:Number = 3;
  public static BACKGROUND_MARS:Number = 4;
  public static BACKGROUND_SUNSET:Number = 5;
  public static BACKGROUND_SOLID_COLOUR:Number = 6;

  constructor(grav:Number, s:Number, type:Number, theme:Number, bg:Number, r:Number = 0, g:Number = 0, b:Number = 0)
  {
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
