import { b2Body, b2World } from "../Box2D";
import { Part } from "./Part"
import { TRIGGER_FIRE, TRIGGER_NONE } from "./partDefaults"

export class TextPart extends Part {
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  public alwaysVisible: boolean = true;
  public inFront: boolean = true;
  public scaleWithZoom: boolean = true;
  public displayKey: number = 32;
  public displayKeyPressed: boolean = false;
  // IB3 TextPart.angle (IB3 TextPart.as:30, radians): the text is rendered
  // rotated by this angle (applied in Draw.ts). Persisted optional-guarded.
  public angle: number = 0;
  // IB3 TextPart.visibleOnStart (:32): when the text is key-toggled
  // (!alwaysVisible), it starts SHOWN if this is set. IB3 Init computes
  // visible = !enableKey || visibleOnStart (TextPart.as:61-64); IB2 mirrors
  // that by seeding displayKeyPressed = visibleOnStart at Init below.
  public visibleOnStart: boolean = false;
  /**
   * Comma-separated trigger names this text LISTENS to (Jaybit
   * TextPart.as:37-53; persisted).
   */
  public triggerList: string = "";
  /** Runtime trigger-contact counter (Jaybit TextPart.as:37; NOT persisted). */
  public triggerTouches: number = 0;

  public red: number;
  public green: number;
  public blue: number;
  public size: number;

  private corner!: number;
  public initX!: number;
  public initY!: number;
  public initW!: number;
  public initH!: number;
  private is_added: boolean = false;

  // A plain own field (not a `_text`-backed accessor) so AMF serializes it as
  // `text` — Flash/Jaybit readers read `od.text` (Database.as :2190), so an
  // accessor-backed `_text` would lose the content when a Flash client loads
  // our exports. Import still accepts both spellings (Wave 3a §9).
  public text: string;

  // Note: `cont` is retained for signature compatibility with existing call
  // sites (and MakeCopy), but TextPart is part of the headless game core and
  // must stay Pixi-free. The Pixi `Text` display object that used to live here
  // is now created/owned/destroyed by the renderer (see src/Game/Draw.ts).
  constructor(
    cont: any,
    nx: number,
    ny: number,
    nw: number,
    nh: number,
    str: string,
    front: boolean = true
  ) {
    super();
    this.x = nx;
    this.y = ny;
    this.w = nw;
    this.h = nh;
    this.text = str;
    this.red = 0;
    this.green = 0;
    this.blue = 0;
    this.size = 14;

    this.type = "TextPart";
    this.inFront = front
  }

  public Move(xVal: number, yVal: number): void {
    this.x = xVal;
    this.y = yVal;
  }

  public RotateAround(xVal: number, yVal: number, angle: number): void {}

  public KeyInput(key: number, up: boolean, replay: boolean): void {
    if (key == this.displayKey && up) this.displayKeyPressed = !this.displayKeyPressed;
  }

  /**
   * Only TRIGGER_FIRE is meaningful: count touches then route through
   * KeyInput via DetermineTriggered (Jaybit TextPart.as:174-193).
   */
  public DoTriggerAction(action: number, world: b2World | null = null, isAdd: boolean = true): boolean {
    if (action == TRIGGER_NONE) return false;
    if (action == TRIGGER_FIRE) {
      if (isAdd) ++this.triggerTouches;
      else if (this.triggerTouches > 0) --this.triggerTouches;
      this.DetermineTriggered();
    }
    return false;
  }

  /**
   * Route the trigger state through KeyInput (Jaybit TextPart.as:272-281).
   * KeyInput toggles displayKeyPressed only on up==true, so the text
   * visibility toggles when the LAST trigger contact ends (like the cannon's
   * fire-on-release).
   */
  public DetermineTriggered(): void {
    if (this.triggerTouches > 0) {
      this.KeyInput(this.displayKey, false, false);
    } else {
      this.KeyInput(this.displayKey, true, false);
    }
  }

  public Update(world: b2World): void {}

  public GetAttachedParts(partList: Array<any> | null = null): Array<any> {
    if (partList == null) partList = new Array();
    partList.push(this);
    return partList;
  }

  public MakeCopy(): TextPart {
    var tPart: TextPart = new TextPart(null, this.x, this.y, this.w, this.h, this.text);
    tPart.inFront = this.inFront;
    tPart.scaleWithZoom = this.scaleWithZoom;
    tPart.alwaysVisible = this.alwaysVisible;
    tPart.displayKey = this.displayKey;
    tPart.angle = this.angle;
    tPart.visibleOnStart = this.visibleOnStart;
    tPart.red = this.red;
    tPart.green = this.green;
    tPart.blue = this.blue;
    tPart.size = this.size;
    tPart.triggerList = this.triggerList;
    return tPart;
  }

  public Resize(deltaX: number, deltaY: number): void {
    if (this.corner == 0) {
      this.x = this.initX + deltaX;
      this.w = this.initW - deltaX;
      if (this.w < 1) {
        this.x = this.initX + this.initW - 1;
        this.w = 1;
      }
      this.y = this.initY + deltaY;
      this.h = this.initH - deltaY;
      if (this.h < 1) {
        this.y = this.initY + this.initH - 1;
        this.h = 1;
      }
    } else if (this.corner == 1) {
      this.w = this.initW + deltaX;
      if (this.w < 1) this.w = 1;
      this.y = this.initY + deltaY;
      this.h = this.initH - deltaY;
      if (this.h < 1) {
        this.y = this.initY + this.initH - 1;
        this.h = 1;
      }
    } else if (this.corner == 2) {
      this.w = this.initW + deltaX;
      if (this.w < 1) this.w = 1;
      this.h = this.initH + deltaY;
      if (this.h < 1) this.h = 1;
    } else {
      this.x = this.initX + deltaX;
      this.w = this.initW - deltaX;
      if (this.w < 1) {
        this.x = this.initX + this.initW - 1;
        this.w = 1;
      }
      this.h = this.initH + deltaY;
      if (this.h < 1) this.h = 1;
    }
  }

  public InsideShape(xPos: number, yPos: number, scale: number): boolean {
    return this.x + this.w >= xPos && this.x < xPos && this.y + this.h >= yPos && this.y < yPos;
  }

  public InsideMoveBox(xPos: number, yPos: number, physScale: number, setInfo: boolean = false): boolean {
    if (Math.abs(xPos - this.x) < 6 / physScale && Math.abs(yPos - this.y) < 6 / physScale) {
      if (setInfo) {
        this.corner = 0;
        this.initX = this.x;
        this.initY = this.y;
        this.initW = this.w;
        this.initH = this.h;
      }
      return true;
    }
    if (Math.abs(xPos - this.x - this.w) < 6 / physScale && Math.abs(yPos - this.y) < 6 / physScale) {
      if (setInfo) {
        this.corner = 1;
        this.initX = this.x;
        this.initY = this.y;
        this.initW = this.w;
        this.initH = this.h;
      }
      return true;
    }
    if (Math.abs(xPos - this.x - this.w) < 6 / physScale && Math.abs(yPos - this.y - this.h) < 6 / physScale) {
      if (setInfo) {
        this.corner = 2;
        this.initX = this.x;
        this.initY = this.y;
        this.initW = this.w;
        this.initH = this.h;
      }
      return true;
    }
    if (Math.abs(xPos - this.x) < 6 / physScale && Math.abs(yPos - this.y - this.h) < 6 / physScale) {
      if (setInfo) {
        this.corner = 3;
        this.initX = this.x;
        this.initY = this.y;
        this.initW = this.w;
        this.initH = this.h;
      }
      return true;
    }
    return false;
  }

  public IntersectsBox(boxX: number, boxY: number, boxW: number, boxH: number): boolean {
    return this.x + this.w >= boxX && this.x < boxX + boxW && this.y + this.h >= boxY && this.y < boxY + boxH;
  }

  public Init(world: b2World, body: b2Body | null = null): void {
    // Per-play trigger runtime reset (Jaybit TextPart.as Init :152-156).
    this.triggerTouches = 0;
    super.Init(world);
    // IB3 TextPart.Init (:61-64): a key-toggled text starts shown iff
    // visibleOnStart. alwaysVisible (== !enableKey) text is always drawn, so its
    // start toggle is irrelevant. displayKeyPressed drives the play-time
    // visibility (Draw.ts) and is toggled by the display key.
    this.displayKeyPressed = this.visibleOnStart;
  }

  public PrepareForResizing(): void {
    this.initW = this.w;
    this.initH = this.h;
  }

  public ToString(): string {
    return "TextPart: " + super.ToString();
  }
}
