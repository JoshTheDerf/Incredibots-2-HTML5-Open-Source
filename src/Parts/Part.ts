import { b2Body, b2World } from "../Box2D";

export class IllegalOperationError extends Error {}

export class Part {
  public isEnabled: boolean = true;
  public isStatic: boolean = false;
  public isEditable: boolean = true;
  public isInitted: boolean = false;
  public checkedCollisionGroup: boolean = false;
  public drawAnyway: boolean = true;
  public isSandbox: boolean = false;
  public type: string;

  public rotateAngle: number;
  public rotateOrientation: number;
  public dragXOff: number;
  public dragYOff: number;

  protected IsEnabled(p: Part, i: number, a: Array<any>): boolean {
    return this.isEnabled;
  }

  public Init(world: b2World, body: b2Body = null): void {
    this.isInitted = true;
  }

  public UnInit(world: b2World): void {
    this.isInitted = false;
  }

  public InsideShape(xVal: number, yVal: number, scale: number): boolean {
    throw new IllegalOperationError("abstract Part.InsideShape() called");
  }

  public Move(xVal: number, yVal: number): void {
    throw new IllegalOperationError("abstract Part.Move() called");
  }

  public RotateAround(xVal: number, yVal: number, angle: number): void {
    throw new IllegalOperationError("abstract Part.RotateAround() called");
  }

  public KeyInput(key: number, up: boolean, replay: boolean): void {
    throw new IllegalOperationError("abstract Part.KeyInput() called");
  }

  public Update(world: b2World): void {
    throw new IllegalOperationError("abstract Part.Update() called");
  }

  public GetAttachedParts(partList: Array<any> = null): Array<any> {
    throw new IllegalOperationError("abstract Part.GetAttachedParts() called");
  }

  public IntersectsBox(boxX: number, boxY: number, boxW: number, boxH: number): boolean {
    throw new IllegalOperationError("abstract Part.IntersectsBox() called");
  }

  public PrepareForResizing(): void {
    throw new IllegalOperationError("abstract Part.PrepareForResizing() called");
  }

  public ToString(): string {
    return (
      "isEnabled=" +
      this.isEnabled +
      ", isStatic=" +
      this.isStatic +
      ", isEditable=" +
      this.isEditable +
      ", isInitted=" +
      this.isInitted +
      ", type=" +
      this.type
    );
  }
}
