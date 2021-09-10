import { Graphics, Matrix } from "pixi.js";
import { Resource } from "../imports";

export class GuiWindow extends Graphics {
  public fader: Graphics;

  constructor(xPos: number, yPos: number, width: number, height: number, addLine: boolean = true) {
    super();
    this.x = xPos;
    this.y = yPos;
    this.zIndex = 100;
    // Use this to prevent clicks from going through the parent.
    this.interactive = true;
    this.sortableChildren = true;

    var m: Matrix;
    this.lineStyle(0, 0, 0);
    if (width == 800) {
      this.beginTextureFill({ texture: Resource.cGuiWindowMid800 });
      this.drawRect(17, 0, width - 34, height);
      this.endFill();
      this.beginTextureFill({ texture: Resource.cGuiWindowRight800 });
      this.drawRect(width - 17, 0, 17, height);
      this.endFill();
      m = new Matrix();
      m.translate(-1, 0);
      this.beginTextureFill({ texture: Resource.cGuiWindowLeft800, matrix: m });
      this.drawRect(-1, 0, 18, height);
      this.endFill();
    } else if (width == 720) {
      this.beginTextureFill({ texture: Resource.cGuiWindowMid700 });
      this.drawRect(24, 0, width - 48, height);
      this.endFill();
      this.beginTextureFill({ texture: Resource.cGuiWindowRight700 });
      this.drawRect(width - 24, 0, 24, height);
      this.endFill();
      this.beginTextureFill({ texture: Resource.cGuiWindowLeft700 });
      this.drawRect(0, 0, 24, height);
      this.endFill();
      m = new Matrix();
      m.translate(12, 287);
      this.beginTextureFill({ texture: Resource.cGuiWindowLine, matrix: m });
      this.drawRect(12, 287, 684, 6);
      this.endFill();
      m = new Matrix();
      m.translate(53, 20);
      this.beginTextureFill({ texture: Resource.cGuiWindowLinebox, matrix: m });
      this.drawRect(53, 20, 602, 80);
      this.endFill();
      m = new Matrix();
      m.translate(53, 315);
      this.beginTextureFill({ texture: Resource.cGuiWindowLinebox, matrix: m });
      this.drawRect(53, 313, 602, 80);
      this.endFill();
    } else if (width == 600 || width == 312) {
      this.beginTextureFill({ texture: Resource.cGuiWindowMid600 });
      this.drawRect(24, 0, width - 48, height);
      this.endFill();
      this.beginTextureFill({ texture: Resource.cGuiWindowRight600 });
      this.drawRect(width - 24, 0, 24, height);
      this.endFill();
      this.beginTextureFill({ texture: Resource.cGuiWindowLeft600 });
      this.drawRect(0, 0, 24, height);
      this.endFill();
      if (addLine && width == 312) {
        m = new Matrix();
        m.translate(12, 287);
        this.beginTextureFill({ texture: Resource.cGuiWindowLine, matrix: m });
        this.drawRect(12, 275, 274, 6);
        this.endFill();
      }
    } else {
      var topClass: Class, midClass: Class, bottomClass: Class;
      if (width == 120) {
        topClass = Resource.cGuiWindowTop120;
        midClass = Resource.cGuiWindowMid120;
        bottomClass = Resource.cGuiWindowBottom120;
      } else if (width == 154) {
        topClass = Resource.cGuiWindowTop154;
        midClass = Resource.cGuiWindowMid154;
        bottomClass = Resource.cGuiWindowBottom154;
      } else if (width == 200) {
        topClass = Resource.cGuiWindowTop200;
        midClass = Resource.cGuiWindowMid200;
        bottomClass = Resource.cGuiWindowBottom200;
      } else if (width == 248) {
        topClass = Resource.cGuiWindowTop248;
        midClass = Resource.cGuiWindowMid248;
        bottomClass = Resource.cGuiWindowBottom248;
      } else {
        topClass = Resource.cGuiWindowTop547;
        midClass = Resource.cGuiWindowMid547;
        bottomClass = Resource.cGuiWindowBottom547;
      }
      this.beginTextureFill({ texture: midClass });
      this.drawRect(-1, 15, width + 10, height - 30);
      this.endFill();
      this.beginTextureFill({ texture: topClass });
      this.drawRect(-1, 0, width + 10, 15);
      this.endFill();
      m = new Matrix();
      m.translate(0, height - 15);
      this.beginTextureFill({ texture: bottomClass, matrix: m });
      this.drawRect(-1, height - 15, width + 10, 24);
      this.endFill();
    }

    this.fader = new Graphics();
    this.fader.beginFill(0, 1);
    this.fader.lineStyle(0, 0, 1);
    this.fader.moveTo(0, 0);
    this.fader.lineTo(width - 1, 0);
    this.fader.lineTo(width - 1, height - 1);
    this.fader.lineTo(0, height - 1);
    this.fader.lineTo(0, 0);
    this.fader.endFill();
    this.fader.visible = false;
    this.fader.interactive = true;
    this.fader.buttonMode = true;
    this.addChild(this.fader);
  }

  public MouseOver(mouseX: number, mouseY: number): boolean {
    return (
      this.visible &&
      mouseX >= this.x &&
      mouseX < this.x + this.width &&
      mouseY >= this.y &&
      mouseY < this.y + this.height
    );
  }

  public ShowFader(): void {
    this.fader.visible = true;
  }

  public HideFader(): void {
    this.fader.visible = false;
  }
}
