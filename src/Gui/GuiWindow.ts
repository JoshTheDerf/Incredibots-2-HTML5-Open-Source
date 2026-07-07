import { Graphics, Matrix, Texture } from "pixi.js";
import { Resource } from "../Game/Graphics/Resource"

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
    if (width == 800) {
      this.rect(17, 0, width - 34, height);
      this.fill({ texture: Resource.cGuiWindowMid800 });
      this.rect(width - 17, 0, 17, height);
      this.fill({ texture: Resource.cGuiWindowRight800 });
      m = new Matrix();
      m.translate(-1, 0);
      this.rect(-1, 0, 18, height);
      this.fill({ texture: Resource.cGuiWindowLeft800, matrix: m });
    } else if (width == 720) {
      this.rect(24, 0, width - 48, height);
      this.fill({ texture: Resource.cGuiWindowMid700 });
      this.rect(width - 24, 0, 24, height);
      this.fill({ texture: Resource.cGuiWindowRight700 });
      this.rect(0, 0, 24, height);
      this.fill({ texture: Resource.cGuiWindowLeft700 });
      m = new Matrix();
      m.translate(12, 287);
      this.rect(12, 287, 684, 6);
      this.fill({ texture: Resource.cGuiWindowLine, matrix: m });
      m = new Matrix();
      m.translate(53, 20);
      this.rect(53, 20, 602, 80);
      this.fill({ texture: Resource.cGuiWindowLinebox, matrix: m });
      m = new Matrix();
      m.translate(53, 315);
      this.rect(53, 313, 602, 80);
      this.fill({ texture: Resource.cGuiWindowLinebox, matrix: m });
    } else if (width == 600 || width == 312) {
      this.rect(24, 0, width - 48, height);
      this.fill({ texture: Resource.cGuiWindowMid600 });
      this.rect(width - 24, 0, 24, height);
      this.fill({ texture: Resource.cGuiWindowRight600 });
      this.rect(0, 0, 24, height);
      this.fill({ texture: Resource.cGuiWindowLeft600 });
      if (addLine && width == 312) {
        m = new Matrix();
        m.translate(12, 287);
        this.rect(12, 275, 274, 6);
        this.fill({ texture: Resource.cGuiWindowLine, matrix: m });
      }
    } else {
      var topClass: Texture, midClass: Texture, bottomClass: Texture;
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
      this.rect(-1, 15, width + 10, height - 30);
      this.fill({ texture: midClass });
      this.rect(-1, 0, width + 10, 15);
      this.fill({ texture: topClass });
      m = new Matrix();
      m.translate(0, height - 15);
      this.rect(-1, height - 15, width + 10, 24);
      this.fill({ texture: bottomClass, matrix: m });
    }

    this.fader = new Graphics();
    this.fader.moveTo(0, 0);
    this.fader.lineTo(width - 1, 0);
    this.fader.lineTo(width - 1, height - 1);
    this.fader.lineTo(0, height - 1);
    this.fader.lineTo(0, 0);
    this.fader.fill({ color: 0, alpha: 1 });
    this.fader.visible = false;
    this.fader.interactive = true;
    this.fader.cursor = "pointer";
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
