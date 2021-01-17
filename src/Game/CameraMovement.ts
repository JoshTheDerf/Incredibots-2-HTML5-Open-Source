export class CameraMovement {
  public frame: number;
  public x: number;
  public y: number;
  public scale: number;

  constructor(f: number, xOff: number, yOff: number, drawScale: number) {
    this.frame = f;
    this.x = xOff;
    this.y = yOff;
    this.scale = drawScale;
  }
}
