import { b2Body, b2World } from "@box2d/core";
import { Text, TextStyle } from "pixi.js";
import { ControllerGame, Part } from "../imports";

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

  public text: string;

  public red: number;
  public green: number;
  public blue: number;
  public size: number;

  private corner: number;
  public initX: number;
  public initY: number;
  public initW: number;
  public initH: number;
  public m_textField: Text;
  private m_controller: ControllerGame;

  private is_added: boolean = false;

  constructor(
    cont: ControllerGame,
    nx: number,
    ny: number,
    nw: number,
    nh: number,
    str: string,
    front: boolean = true
  ) {
    super();
    this.m_controller = cont;
    this.x = nx;
    this.y = ny;
    this.w = nw;
    this.h = nh;
    this.text = str;
    this.red = 0;
    this.green = 0;
    this.blue = 0;
    this.size = 14;

    const style = new TextStyle({
      wordWrap: true,
      wordWrapWidth: 1,
      breakWords: true
    });

    this.m_textField = new Text(str, style);
    this.m_textField.x = nx;
    this.m_textField.y = ny;
    this.m_textField.zIndex = 0;
    this.type = "TextPart";
    this.inFront = front
    this.m_controller.addChild(this.m_textField);
  }

  public Move(xVal: number, yVal: number): void {
    this.x = xVal;
    this.y = yVal;
  }

  public RotateAround(xVal: number, yVal: number, angle: number): void {}

  public KeyInput(key: number, up: boolean, replay: boolean): void {
    if (key == this.displayKey && up) this.displayKeyPressed = !this.displayKeyPressed;
  }

  public Update(world: b2World): void {}

  public GetAttachedParts(partList: Array<any> = null): Array<any> {
    if (partList == null) partList = new Array();
    partList.push(this);
    return partList;
  }

  public MakeCopy(): TextPart {
    var tPart: TextPart = new TextPart(this.m_controller, this.x, this.y, this.w, this.h, this.text);
    tPart.inFront = this.inFront;
    tPart.scaleWithZoom = this.scaleWithZoom;
    tPart.alwaysVisible = this.alwaysVisible;
    tPart.displayKey = this.displayKey;
    tPart.red = this.red;
    tPart.green = this.green;
    tPart.blue = this.blue;
    tPart.size = this.size;
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

  public Init(world: b2World, body: b2Body = null): void {
    super.Init(world);
    this.displayKeyPressed = false;
  }

  public PrepareForResizing(): void {
    this.initW = this.w;
    this.initH = this.h;
  }

  public ToString(): string {
    return "TextPart: " + super.ToString();
  }
}
