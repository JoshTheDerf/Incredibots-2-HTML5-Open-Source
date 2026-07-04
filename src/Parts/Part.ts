import { b2Body, b2World } from "../Box2D";

export class IllegalOperationError extends Error {}

export class Part {
  /** Stable unique id assigned by GameCore on creation. */
  public id!: number;
  public isEnabled: boolean = true;
  public isStatic: boolean = false;
  public isEditable: boolean = true;
  public isInitted: boolean = false;
  public checkedCollisionGroup: boolean = false;
  public drawAnyway: boolean = true;
  public isSandbox: boolean = false;
  public type!: string;

  // --- IB3 SUPERSET fields (IB2 lacked these; imported/persisted so IB3 codes
  // are lossless, and functional where noted). See ib3Import + serialization.
  /**
   * IB3 graphic/skin selector (IB3 Database.as:1044, Part.graphicType, default 0).
   * Stored + round-tripped; skin RENDERING is a follow-up, so parts currently draw
   * with the default skin regardless. Kept on Part so every part type carries it.
   */
  public graphicType: number = 0;
  /**
   * IB3 outline opacity 0..255 (IB3 Database.as:1048, borderOpacity, default 255).
   * FUNCTIONAL: Draw uses it as the outline stroke alpha (0 = invisible border).
   */
  public borderOpacity: number = 255;
  /**
   * IB3 editor lock (IB3 Database.as:1056, locked). FUNCTIONAL: a locked part
   * can't be selected/dragged/edited in the editor. Not persisted-blocking — it's
   * an editor convenience that round-trips.
   */
  public locked: boolean = false;
  /**
   * IB3 joint/thruster "show graphic during simulation" (IB3 Database.as:934/987,
   * visualInSim, default true). FUNCTIONAL for joints/thrusters: when false their
   * graphic is hidden once the sim runs.
   */
  public visualInSim: boolean = true;
  /**
   * IB3 joint/thruster "scale graphic with zoom" (IB3 Database.as:938/991,
   * scaleToZoom, default false). Stored + round-tripped (render use is a follow-up).
   */
  public scaleToZoom: boolean = false;

  public rotateAngle!: number;
  public rotateOrientation!: number;
  public dragXOff!: number;
  public dragYOff!: number;

  protected IsEnabled(p?: Part, i?: number, a?: Array<any>): boolean {
    return this.isEnabled;
  }

  public Init(world: b2World, body: b2Body | null = null): void {
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

  public GetAttachedParts(partList: Array<any> | null = null): Array<any> {
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
