import { b2Body, b2World } from "@box2d/core";
import { JointPart, ShapePart, Util } from "../imports";

export class FixedJoint extends JointPart {
  constructor(p1: ShapePart, p2: ShapePart, x: number, y: number) {
    super(p1, p2);
    this.anchorX = x;
    this.anchorY = y;
    this.type = "FixedJoint";
  }

  public Init(world: b2World, body: b2Body = null): void {
    if (this.isInitted || !this.part1.isInitted || !this.part2.isInitted) return;
    super.Init(world);
  }

  public MakeCopy(p1: ShapePart, p2: ShapePart): JointPart {
    return new FixedJoint(p1, p2, this.anchorX, this.anchorY);
  }

  public Update(world: b2World): void {}

  public InsideShape(xVal: number, yVal: number, scale: number): boolean {
    return Util.GetDist(this.anchorX, this.anchorY, xVal, yVal) < (0.18 * 30) / scale;
  }

  public KeyInput(key: number, up: boolean, replay: boolean): void {
    // do nothing
  }

  public ToString(): string {
    return "FixedJoint: " + super.ToString();
  }
}
