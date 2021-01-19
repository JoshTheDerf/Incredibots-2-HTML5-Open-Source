import { b2AABB } from "@box2d/core";
import { Graphics, Matrix } from "pixi.js";
import { Circle, ControllerChallenge, ControllerGameGlobals, Gradient, Rectangle, ShapePart, WinCondition } from "../../imports";

export class ControllerClimb extends ControllerChallenge {
  constructor() {
    super();
    ControllerChallenge.playChallengeMode = true;
    ControllerChallenge.playOnlyMode = true;

    var cond: WinCondition = new WinCondition("Cond", 2, 1);
    cond.minY = -10.5;
    cond.maxY = -10.5;
    ControllerClimb.challenge.winConditions.push(cond);
    cond = new WinCondition("Cond", 2, 4);
    cond.minX = 45;
    cond.maxX = 45;
    ControllerClimb.challenge.winConditions.push(cond);
    ControllerClimb.challenge.cannonsAllowed = false;
    ControllerClimb.challenge.thrustersAllowed = false;
    ControllerClimb.challenge.mouseDragAllowed = false;
    ControllerClimb.challenge.winConditionsAnded = true;
    var buildArea: b2AABB = new b2AABB();
    buildArea.lowerBound.Set(1, 1);
    buildArea.upperBound.Set(15, 11.1);
    ControllerClimb.challenge.buildAreas.push(buildArea);
    this.BuildBuildArea();

    this.draw.m_drawXOff = 0;
    this.draw.m_drawYOff = -150;

    var p: ShapePart;
    p = new Rectangle(1, 11, 49.4, 1, false);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);

    this.removeChild(this.sGround);
    this.sGround = new Graphics();

    // bg layer 3
    // outlines
    this.sGround.beginFill(0x007360);
    this.sGround.drawCircle(266, 1640, 195);
    this.sGround.drawCircle(932, 1881, 195);
    this.sGround.endFill();
    this.sGround.beginFill(0x007360);
    this.sGround.drawCircle(608, 1811, 258);
    this.sGround.endFill();

    // body
    this.sGround.beginFill(0x34a97f);
    this.sGround.drawCircle(266, 1640, 189);
    this.sGround.drawCircle(932, 1881, 189);
    this.sGround.endFill();
    this.sGround.beginFill(0x34a97f);
    this.sGround.drawCircle(608, 1811, 252);
    this.sGround.endFill();

    // bg layer 2
    // outlines
    this.sGround.beginFill(0x007a47);
    this.sGround.drawCircle(1166, 1853, 129);
    this.sGround.drawCircle(1979, 1721, 258);
    this.sGround.endFill();
    this.sGround.beginFill(0x007a47);
    this.sGround.drawCircle(1435, 1871, 195);
    this.sGround.endFill();

    // body
    this.sGround.beginFill(0x36ae66);
    this.sGround.drawCircle(1166, 1853, 123);
    this.sGround.drawCircle(1979, 1721, 252);
    this.sGround.endFill();
    this.sGround.beginFill(0x36ae66);
    this.sGround.drawCircle(1435, 1871, 189);
    this.sGround.endFill();

    // bg layer 1
    // outlines
    this.sGround.beginFill(0x00862c);
    this.sGround.drawCircle(750, 1756, 195);
    this.sGround.drawCircle(1745, 1871, 195);
    this.sGround.drawCircle(2210, 1676, 195);
    this.sGround.drawCircle(2432, 1267, 195);
    this.sGround.endFill();
    this.sGround.beginFill(0x00862c);
    this.sGround.drawCircle(1431, 1615, 337);
    this.sGround.endFill();

    // body
    this.sGround.beginFill(0x3eba50);
    this.sGround.drawCircle(750, 1756, 189);
    this.sGround.drawCircle(1745, 1871, 189);
    this.sGround.drawCircle(2210, 1676, 189);
    this.sGround.drawCircle(2432, 1267, 189);
    this.sGround.endFill();
    this.sGround.beginFill(0x3eba50);
    this.sGround.drawCircle(1431, 1615, 331);
    this.sGround.endFill();

    // main ground and stairs
    // outlines
    this.sGround.beginFill(0x2da12e);
    for (var i: number = 0; i < 29; i++) {
      this.sGround.drawRect(1989 - i * 47.45, 301 + i * 35.6, 378 + i * 47.45, 35.6);
    }
    this.sGround.endFill();
    this.sGround.beginFill(0x2da12e);
    this.sGround.drawRect(-6, 1333.4, 2405, 238.6);
    this.sGround.endFill();

    // circle ground
    this.sGround.beginFill(0x2da12e);
    this.sGround.drawCircle(237, 1560, 86);
    this.sGround.drawCircle(2430, 801, 195);
    this.sGround.endFill();
    this.sGround.beginFill(0x2da12e);
    this.sGround.drawCircle(415, 1600, 129);
    this.sGround.drawCircle(2548, 1005, 195);
    this.sGround.endFill();
    this.sGround.beginFill(0x2da12e);
    this.sGround.drawCircle(1557, 1599, 144);
    this.sGround.drawCircle(0, 1527, 195);
    this.sGround.drawCircle(2330, 1531, 195);
    this.sGround.endFill();
    this.sGround.beginFill(0x2da12e);
    this.sGround.drawCircle(630, 1647, 195);
    this.sGround.drawCircle(1292, 1587, 195);
    this.sGround.drawCircle(2336, 493, 195);
    this.sGround.drawCircle(2356, 1217, 195);
    this.sGround.endFill();
    this.sGround.beginFill(0x2da12e);
    this.sGround.drawCircle(947, 1683, 258);
    this.sGround.drawCircle(1927, 1560, 337);
    this.sGround.endFill();

    // body
    var m: Matrix = new Matrix();
    for (i = 0; i < 29; i++) {
      m.translate(0, 307 + i * 35.6)
      this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"], 35.6), matrix: m });
      p = new Rectangle(15 + (28 - i), (i + 1) * 0.75 - 11.5, i + 7.1, 0.75, false);
      p.isStatic = true;
      p.isEditable = false;
      p.drawAnyway = false;
      this.allParts.push(p);
      this.sGround.drawRect(1995 - i * 47.45, 307 + i * 35.6, 378 + i * 47.45, 35.6);
    }
    this.sGround.drawRect(0, 1339.4, 2393, 226.6);
    this.sGround.endFill();

    p = new Circle(1, 15.02, 4.02, false);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Circle(50.3, -6.8, 4, false);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);

    // circle ground
    this.DrawGroundCircle(237, 1560, 80);
    this.DrawGroundCircle(2430, 801, 189);
    this.DrawGroundCircle(415, 1600, 123);
    this.DrawGroundCircle(2548, 1005, 189);
    this.DrawGroundCircle(1557, 1599, 138);
    this.DrawGroundCircle(0, 1527, 189);
    this.DrawGroundCircle(2330, 1531, 189);
    this.DrawGroundCircle(630, 1647, 189);
    this.DrawGroundCircle(1292, 1587, 189);
    this.DrawGroundCircle(2336, 493, 189);
    this.DrawGroundCircle(2356, 1217, 189);
    this.DrawGroundCircle(947, 1683, 252);
    this.DrawGroundCircle(1927, 1560, 331);

    // rocks
    this.DrawRock(0, 166, 1420, 52);
    this.DrawRock(1, 485, 1482, 52);
    this.DrawRock(2, 748, 1624, 35);
    this.DrawRock(1, 890, 1392, 86);
    this.DrawRock(1, 1157, 1489, 52);
    this.DrawRock(2, 1195, 1287, 35);
    this.DrawRock(1, 1407, 1031, 35);
    this.DrawRock(1, 1470, 1302, 86);
    this.DrawRock(1, 1601, 1017, 52);
    this.DrawRock(1, 1785, 1457, 52);
    this.DrawRock(2, 1855, 1231, 35);
    this.DrawRock(0, 1822, 898, 86);
    this.DrawRock(1, 1985, 705, 52);
    this.DrawRock(1, 2029, 1069, 52);
    this.DrawRock(1, 2152, 1604, 52);
    this.DrawRock(2, 2244, 426, 35);
    this.DrawRock(1, 2265, 669, 52);
    this.DrawRock(0, 2288, 1034, 137.5);
    this.DrawRock(1, 2389, 526, 43.5);
    this.DrawRock(2, 2480, 681, 86);
    this.DrawRock(0, 2638, 401, 35);

    // start and end platforms
    this.sGround.lineStyle(6, 0x9d8941);
    this.sGround.beginFill(0xceb456);
    this.sGround.drawRect(25, 1336, 445, 56);
    this.sGround.drawRect(1992, 303, 309, 56);
    this.sGround.endFill();

    this.sGround.cacheAsBitmap = true;
    this.addChild(this.sGround);
  }

  public Init(e: Event): void {
    super.Init(e);
    if (!ControllerGameGlobals.viewingUnsavedReplay) this.ShowTutorialDialog(107, true);
  }

  public CloseTutorialDialog(num: number): void {
    if (num == 107) {
      this.ShowTutorialDialog(66);
    } else {
      super.CloseTutorialDialog(num);
    }
  }

  private ShowTutorialDialog(num: number, moreButton: boolean = false): void {
    this.ShowTutorialWindow(num, 276, 130, moreButton);
  }

  public DrawGroundCircle(xPos: number, yPos: number, radius: number): void {
    var m: Matrix = new Matrix();
    m.translate(0, yPos + radius)
    this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"], radius * 2), matrix: m });
    this.sGround.drawCircle(xPos, yPos, radius);
    this.sGround.endFill();
  }

  public DrawRock(type: number, xPos: number, yPos: number, radius: number): void {
    this.sGround.lineStyle(6, 0x6bb05a);
    var m: Matrix = new Matrix();
    m.translate(0, yPos)
    this.sGround.beginTextureFill({
      texture: Gradient.getLinearGradientTexture(
        type == 0 ? ["#8EDB82", "#7FBF72"] : type == 1 ? ["#80D970", "#6DBE5D"] : ["#70C160", "#63AB52"],
        radius * 2
      ),
      matrix: m,
    });
    this.sGround.drawCircle(xPos - 270 + radius, yPos + radius, radius);
    this.sGround.endFill();
  }

  public GetMinX(): number {
    return -9;
  }

  public GetMaxX(): number {
    return 62;
  }

  public GetMinY(): number {
    return -22;
  }

  public GetMaxY(): number {
    return 28;
  }

  public Update(): void {
    super.Update();
    if (this.hasZoomed) {
      this.sGround.width = this.World2ScreenX(61.9) - this.World2ScreenX(0);
      this.sGround.scale.y = this.sGround.scale.x;
    }
    if (this.hasPanned || this.hasZoomed) {
      this.sGround.x = this.World2ScreenX(1.02);
      this.sGround.y = this.World2ScreenY(-17.15);
    }
    this.hasPanned = false;
    this.hasZoomed = false;
  }

  public saveButton(): void {
    this.ShowDisabledDialog();
  }

  public saveReplayButton(): void {
    this.ShowDisabledDialog();
    if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
  }

  public submitButton(): void {
    this.ShowDisabledDialog();
    if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
  }

  public commentButton(robotID: String = "", robotPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public linkButton(robotID: String = "", robotPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public embedButton(robotID: String = "", robotPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public commentReplayButton(replayID: String = "", replayPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public linkReplayButton(replayID: String = "", replayPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public embedReplayButton(replayID: String = "", replayPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }
}
