import { b2AABB } from "@box2d/core";
import { Graphics, Matrix } from "pixi.js";
import { Circle, ControllerChallenge, ControllerGameGlobals, Gradient, Part, Rectangle, Triangle, WinCondition } from "../../imports";

export class ControllerMonkeyBars extends ControllerChallenge {
  private sGround1: Graphics;
  private sGround2: Graphics;

  constructor() {
    super();
    this.draw.m_drawXOff = 0;
    this.draw.m_drawYOff = -190;

    ControllerMonkeyBars.playChallengeMode = true;
    ControllerMonkeyBars.playOnlyMode = true;

    var cond: WinCondition = new WinCondition("Cond", 2, 1);
    cond.minY = 11;
    cond.maxY = 11;
    ControllerMonkeyBars.challenge.winConditions.push(cond);
    cond = new WinCondition("Cond", 2, 4);
    cond.minX = 44;
    cond.maxX = 44;
    ControllerMonkeyBars.challenge.winConditions.push(cond);
    ControllerMonkeyBars.challenge.cannonsAllowed = false;
    ControllerMonkeyBars.challenge.thrustersAllowed = false;
    ControllerMonkeyBars.challenge.mouseDragAllowed = false;
    ControllerMonkeyBars.challenge.winConditionsAnded = true;
    var buildArea: b2AABB = new b2AABB();
    buildArea.lowerBound.Set(1, 1);
    buildArea.upperBound.Set(15, 11.1);
    ControllerMonkeyBars.challenge.buildAreas.push(buildArea);
    this.BuildBuildArea();

    var p: Part;
    p = new Rectangle(1, 11, 14.02, 1, false);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Rectangle(40.65, 11, 20, 1, false);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    for (var i: number = 0; i < 9; i++) {
      p = new Circle(15.52 + i * 2.955, 5.27, 0.15, false);
      p.isStatic = true;
      p.isEditable = false;
      p.drawAnyway = false;
      this.allParts.push(p);
    }
    p = new Circle(15.65, 12.47, 1.35, false);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Circle(13.95, 13.54, 1.8, false);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Circle(11.6, 15.5, 2.85, false);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Circle(40.11, 12.27, 1.35, false);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Circle(43, 14.75, 2.85, false);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(1.51, 11.5, -0.51, 10.15, -5, 10);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(-0.51, 10.15, -1.54, 8.36, -5, 10);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(-1.54, 8.36, -1.51, 6.08, -5, 10);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(-1.51, 6.08, -3.16, 4.18, -5, 10);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(-3.16, 4.18, -2.06, 1.55, -5, -2);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(-2.06, 1.55, -0.25, 0.91, -5, -2);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(-0.25, 0.91, 1.02, -0.26, -5, -2);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(1.02, -0.26, 1.39, -2.05, -5, -2);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(1.39, -2.05, 3.63, -2.58, 5, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(3.63, -2.58, 4.56, -2.15, 5, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(4.56, -2.15, 4.87, -1.35, 5, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(4.87, -1.35, 5.3, -1.08, 5, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(5.3, -1.08, 5.69, -1.45, 5, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(5.69, -1.45, 5.88, -2.19, 5, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(5.88, -2.19, 6.41, -2.83, 5, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(6.41, -2.83, 7.62, -2.52, 10, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(7.62, -2.52, 8.32, -1.53, 10, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(8.32, -1.53, 8.76, 0, 10, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(8.76, 0, 9.19, -0.32, 10, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(9.19, -0.32, 9.56, -1.68, 10, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(9.56, -1.68, 10.54, -2.17, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(10.54, -2.17, 11.9, -1.41, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(11.9, -1.41, 12.36, -0.26, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(12.36, -0.26, 13.75, 0.57, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(13.75, 0.57, 14.78, 1.6, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(14.78, 1.6, 14.68, 2.61, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(14.68, 2.61, 15.4, 3.72, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(15.4, 3.72, 15.98, 3.78, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(15.98, 3.78, 16.37, 3.18, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(16.37, 3.18, 16.84, 2.07, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(16.84, 2.07, 17.02, -0.07, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(17.02, -0.07, 16.65, -1.88, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(16.65, -1.88, 17.13, -4.02, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(17.13, -4.02, 17.7, -5.09, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(17.7, -5.09, 17.58, -6.9, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(17.58, -6.9, 16.65, -7.9, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(16.65, -7.9, 16, -9.65, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(16, -9.65, 14.1, -10.95, 14, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);

    p = new Triangle(45.5, 1.95, 44.57, 1.43, 42, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(44.57, 1.43, 43.81, 0.2, 42, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(43.81, 0.2, 43.19, 0.57, 42, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(43.19, 0.57, 42.1, 0.18, 42, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(42.1, 0.18, 41.4, -1.53, 42, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(41.4, -1.53, 40.74, -2.21, 42, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(40.74, -2.21, 40.31, -5.11, 42, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(40.31, -5.11, 41.28, -6.61, 42, -5);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(41.28, -6.61, 40.91, -7.91, 44, -10);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(40.91, -7.91, 40.24, -8.75, 44, -10);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(40.24, -8.75, 40.94, -10.15, 44, -10);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Triangle(40.94, -10.15, 41.14, -11.15, 44, -10);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);
    p = new Rectangle(41.14, -31, 1, 20, false);
    p.isStatic = true;
    p.isEditable = false;
    p.drawAnyway = false;
    this.allParts.push(p);

    this.sGround1 = new Graphics();
    this.sGround2 = new Graphics();

    // cave walls
    this.sGround1.lineStyle(6, 0x889598, 1);
    var m: Matrix = new Matrix();
    this.sGround1.beginTextureFill({ texture: Gradient.getLinearGradientTexture(["#B6C6CA", "#9AA9AD"]), matrix: m });
    this.sGround1.moveTo(1101, 1364);
    this.sGround1.lineTo(1085, 1294);
    this.sGround1.lineTo(1035, 1207);
    this.sGround1.lineTo(1011, 1049);
    this.sGround1.lineTo(981, 971);
    this.sGround1.lineTo(1014, 845);
    this.sGround1.lineTo(1058, 770);
    this.sGround1.lineTo(1050, 663);
    this.sGround1.lineTo(1077, 614);
    this.sGround1.lineTo(1184, 544);
    this.sGround1.lineTo(1202, 506);
    this.sGround1.lineTo(1269, 500);
    this.sGround1.lineTo(1356, 398);
    this.sGround1.lineTo(1554, 347);
    this.sGround1.lineTo(1746, 372);
    this.sGround1.lineTo(1926, 353);
    this.sGround1.lineTo(2062, 296);
    this.sGround1.lineTo(2193, 305);
    this.sGround1.lineTo(2281, 365);
    this.sGround1.lineTo(2310, 449);
    this.sGround1.lineTo(2352, 495);
    this.sGround1.lineTo(2358, 583);
    this.sGround1.lineTo(2330, 635);
    this.sGround1.lineTo(2307, 739);
    this.sGround1.lineTo(2325, 827);
    this.sGround1.lineTo(2316, 931);
    this.sGround1.lineTo(2293, 985);
    this.sGround1.lineTo(2274, 1014);
    this.sGround1.lineTo(2246, 1011);
    this.sGround1.lineTo(2211, 957);
    this.sGround1.lineTo(2216, 908);
    this.sGround1.lineTo(2166, 858);
    this.sGround1.lineTo(2098, 818);
    this.sGround1.lineTo(2076, 762);
    this.sGround1.lineTo(2010, 725);
    this.sGround1.lineTo(1962, 749);
    this.sGround1.lineTo(1944, 815);
    this.sGround1.lineTo(1923, 831);
    this.sGround1.lineTo(1902, 756);
    this.sGround1.lineTo(1868, 708);
    this.sGround1.lineTo(1809, 693);
    this.sGround1.lineTo(1783, 724);
    this.sGround1.lineTo(1774, 760);
    this.sGround1.lineTo(1755, 778);
    this.sGround1.lineTo(1734, 765);
    this.sGround1.lineTo(1719, 726);
    this.sGround1.lineTo(1674, 705);
    this.sGround1.lineTo(1566, 731);
    this.sGround1.lineTo(1548, 818);
    this.sGround1.lineTo(1486, 875);
    this.sGround1.lineTo(1398, 906);
    this.sGround1.lineTo(1345, 1034);
    this.sGround1.lineTo(1425, 1126);
    this.sGround1.lineTo(1424, 1237);
    this.sGround1.lineTo(1473, 1324);
    this.sGround1.lineTo(1571, 1389);
    this.sGround1.lineTo(1300, 1500);
    this.sGround1.lineTo(1101, 1364);
    this.sGround1.endFill();

    this.sGround2.lineStyle(6, 0x889598, 1);
    this.sGround2.beginTextureFill({ texture: Gradient.getLinearGradientTexture(["#B6C6CA", "#9AA9AD"]), matrix: m });
    this.sGround2.moveTo(4167, 1380);
    this.sGround2.lineTo(4293, 1324);
    this.sGround2.lineTo(4322, 1252);
    this.sGround2.lineTo(4374, 1198);
    this.sGround2.lineTo(4421, 1184);
    this.sGround2.lineTo(4344, 1127);
    this.sGround2.lineTo(4349, 1026);
    this.sGround2.lineTo(4293, 901);
    this.sGround2.lineTo(4216, 855);
    this.sGround2.lineTo(4172, 769);
    this.sGround2.lineTo(4104, 765);
    this.sGround2.lineTo(4068, 746);
    this.sGround2.lineTo(3993, 744);
    this.sGround2.lineTo(3963, 726);
    this.sGround2.lineTo(3919, 761);
    this.sGround2.lineTo(3871, 847);
    this.sGround2.lineTo(3834, 863);
    this.sGround2.lineTo(3807, 818);
    this.sGround2.lineTo(3765, 800);
    this.sGround2.lineTo(3732, 865);
    this.sGround2.lineTo(3733, 915);
    this.sGround2.lineTo(3714, 925);
    this.sGround2.lineTo(3669, 900);
    this.sGround2.lineTo(3632, 840);
    this.sGround2.lineTo(3602, 858);
    this.sGround2.lineTo(3549, 839);
    this.sGround2.lineTo(3515, 756);
    this.sGround2.lineTo(3483, 723);
    this.sGround2.lineTo(3462, 582);
    this.sGround2.lineTo(3509, 509);
    this.sGround2.lineTo(3492, 450);
    this.sGround2.lineTo(3459, 405);
    this.sGround2.lineTo(3495, 335);
    this.sGround2.lineTo(3503, 291);
    this.sGround2.lineTo(3587, 279);
    this.sGround2.lineTo(3778, 335);
    this.sGround2.lineTo(3927, 305);
    this.sGround2.lineTo(4007, 350);
    this.sGround2.lineTo(4162, 347);
    this.sGround2.lineTo(4217, 386);
    this.sGround2.lineTo(4253, 356);
    this.sGround2.lineTo(4434, 437);
    this.sGround2.lineTo(4541, 537);
    this.sGround2.lineTo(4625, 561);
    this.sGround2.lineTo(4716, 685);
    this.sGround2.lineTo(4700, 760);
    this.sGround2.lineTo(4725, 909);
    this.sGround2.lineTo(4767, 948);
    this.sGround2.lineTo(4753, 1109);
    this.sGround2.lineTo(4710, 1195);
    this.sGround2.lineTo(4716, 1304);
    this.sGround2.lineTo(4400, 1500);
    this.sGround2.lineTo(4167, 1380);
    this.sGround2.endFill();

    // cave rocks
    this.sGround1.lineStyle(0, 0, 0);
    this.sGround2.lineStyle(0, 0, 0);
    this.DrawCaveRock(1324, 1148, 1271, 1260, 1370, 1313);
    this.DrawCaveRock(1134, 1040, 1099, 1148, 1295, 1130);
    this.DrawCaveRock(1214, 770, 1334, 759, 1315, 869);
    this.DrawCaveRock(1141, 638, 1289, 554, 1262, 667);
    this.DrawCaveRock(1350, 514, 1400, 496, 1412, 582);
    this.DrawCaveRock(1472, 650, 1554, 581, 1552, 653);
    this.DrawCaveRock(1686, 506, 1824, 441, 1787, 630);
    this.DrawCaveRock(1900, 503, 1842, 613, 1945, 667);
    this.DrawCaveRock(1997, 352, 2133, 391, 2072, 433);
    this.DrawCaveRock(2121, 633, 2279, 607, 2266, 694);
    this.DrawCaveRock(2137, 764, 2186, 746, 2198, 832);
    this.DrawCaveRock(3559, 714, 3662, 738, 3604, 780);
    this.DrawCaveRock(3589, 429, 3671, 361, 3668, 435);
    this.DrawCaveRock(3674, 605, 3811, 540, 3776, 729);
    this.DrawCaveRock(3909, 493, 3965, 380, 4010, 543);
    this.DrawCaveRock(4058, 631, 4242, 620, 4179, 688);
    this.DrawCaveRock(4163, 497, 4297, 540, 4261, 436);
    this.DrawCaveRock(4406, 649, 4440, 538, 4603, 629);
    this.DrawCaveRock(4416, 866, 4518, 890, 4459, 932);
    this.DrawCaveRock(4514, 807, 4675, 782, 4661, 870);
    this.DrawCaveRock(4432, 1054, 4579, 1024, 4502, 1199);
    this.DrawCaveRock(4639, 1063, 4688, 1045, 4701, 1130);
    this.DrawCaveRock(4362, 1318, 4443, 1249, 4440, 1321);

    // main ground
    // outlines
    this.sGround2.beginFill(0x2da12e);
    this.sGround2.drawRect(3477, 1369, 1083, 197);
    this.sGround2.endFill();
    this.DrawGroundOutlineCircle(1029, 1353, 63);
    this.DrawGroundOutlineCircle(2201, 1377, 63);
    this.DrawGroundOutlineCircle(3393, 1368, 63);
    this.DrawGroundOutlineCircle(4472, 1323, 63);
    this.DrawGroundOutlineCircle(1593, 1665, 63);
    this.DrawGroundOutlineCircle(1908, 1644, 63);
    this.DrawGroundOutlineCircle(2104, 1416, 80);
    this.DrawGroundOutlineCircle(4565, 1278, 104);
    this.DrawGroundOutlineCircle(4313, 1530, 104);
    this.DrawGroundOutlineCircle(3855, 1491, 104);
    this.DrawGroundOutlineCircle(3804, 1578, 104);
    this.DrawGroundOutlineCircle(4425, 1380, 138);
    this.DrawGroundOutlineCircle(3650, 1403, 138);
    this.DrawGroundOutlineCircle(3460, 1413, 138);
    this.DrawGroundOutlineCircle(1898, 1374, 138);
    this.DrawGroundOutlineCircle(1106, 1326, 138);
    this.DrawGroundOutlineCircle(1234, 1410, 138);
    this.DrawGroundOutlineCircle(1927, 1449, 138);
    this.DrawGroundOutlineCircle(1359, 1383, 189);
    this.DrawGroundOutlineCircle(1591, 1390, 189);
    this.DrawGroundOutlineCircle(3978, 1446, 189);

    // body
    m = new Matrix();
    this.sGround1.beginTextureFill({ texture: Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"]), matrix: m });
    this.sGround1.drawRect(1550, 1391, 600, 100);
    this.sGround1.endFill();
    this.sGround2.beginTextureFill({ texture: Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"]), matrix: m });
    this.sGround2.drawRect(3483, 1375, 1071, 185);
    this.sGround2.endFill();
    this.DrawGroundCircle(1029, 1353, 63);
    this.DrawGroundCircle(2201, 1377, 63);
    this.DrawGroundCircle(3393, 1368, 63);
    this.DrawGroundCircle(4472, 1323, 63);
    this.DrawGroundCircle(1593, 1665, 63);
    this.DrawGroundCircle(1908, 1644, 63);
    this.DrawGroundCircle(2104, 1416, 80);
    this.DrawGroundCircle(4565, 1278, 104);
    this.DrawGroundCircle(4313, 1530, 104);
    this.DrawGroundCircle(3855, 1491, 104);
    this.DrawGroundCircle(3804, 1578, 104);
    this.DrawGroundCircle(4425, 1380, 138);
    this.DrawGroundCircle(3650, 1403, 138);
    this.DrawGroundCircle(3460, 1413, 138);
    this.DrawGroundCircle(1898, 1374, 138);
    this.DrawGroundCircle(1106, 1326, 138);
    this.DrawGroundCircle(1234, 1410, 138);
    this.DrawGroundCircle(1927, 1449, 138);
    this.DrawGroundCircle(1359, 1383, 189);
    this.DrawGroundCircle(1591, 1390, 189);
    this.DrawGroundCircle(3978, 1446, 189);

    // rocks
    this.DrawRock(1, 1380, 1488, 35);
    this.DrawRock(2, 2095, 1559, 35);
    this.DrawRock(2, 3604, 1484, 35);
    this.DrawRock(1, 4206, 1698, 35);
    this.DrawRock(0, 4472, 1446, 35);
    this.DrawRock(2, 1152, 1420, 43.5);
    this.DrawRock(0, 1572, 1637, 43.5);
    this.DrawRock(2, 1954, 1471, 43.5);
    this.DrawRock(1, 3992, 1453, 43.5);
    this.DrawRock(1, 4257, 1453, 52);
    this.DrawRock(2, 3812, 1511, 69);
    this.DrawRock(1, 1739, 1454, 69);

    // monkey bars
    this.sGround1.lineStyle(6, 0x71848d, 1);
    this.sGround1.beginFill(0xc4ced4);
    for (i = 0; i < 9; i++) {
      this.sGround1.drawCircle(2257 + i * 144, 1089, 8);
    }
    this.sGround1.endFill();

    // start and end platforms
    this.sGround1.lineStyle(6, 0x9d8941);
    this.sGround1.beginFill(0xceb456);
    this.sGround1.drawRect(1550, 1368, 683, 56);
    this.sGround1.endFill();

    this.sGround2.lineStyle(6, 0x9d8941);
    this.sGround2.beginFill(0xceb456);
    this.sGround2.drawRect(3510, 1368, 930, 56);
    this.sGround2.endFill();

    this.sGround1.cacheAsBitmap = true;
    this.sGround2.cacheAsBitmap = true;
    this.addChild(this.sGround1);
    this.addChild(this.sGround2);
  }

  public Init(e: Event): void {
    super.Init(e);
    if (!ControllerGameGlobals.viewingUnsavedReplay) this.ShowTutorialDialog(107, true);
  }

  public CloseTutorialDialog(num: number): void {
    if (num == 107) {
      this.ShowTutorialDialog(64);
    } else {
      super.CloseTutorialDialog(num);
    }
  }

  private ShowTutorialDialog(num: number, moreButton: boolean = false): void {
    this.ShowTutorialWindow(num, 276, 130, moreButton);
  }

  public DrawGroundOutlineCircle(xPos: number, yPos: number, radius: number): void {
    var sGround: Graphics = xPos < 3000 ? this.sGround1 : this.sGround2;
    sGround.beginFill(0x2da12e);
    sGround.drawCircle(xPos + radius, yPos + radius, radius + 6);
    sGround.endFill();
  }

  public DrawGroundCircle(xPos: number, yPos: number, radius: number): void {
    var sGround: Graphics = xPos < 3000 ? this.sGround1 : this.sGround2;
    var m: Matrix = new Matrix();
    sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"]), matrix: m });
    sGround.drawCircle(xPos + radius, yPos + radius, radius);
    sGround.endFill();
  }

  public DrawCaveRock(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
    var sGround: Graphics = x1 < 3000 ? this.sGround1 : this.sGround2;
    var m: Matrix = new Matrix();
    sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture(["#AAB9BD", "#95A1A5"]), matrix: m });
    sGround.moveTo(x1, y1);
    sGround.lineTo(x2, y2);
    sGround.lineTo(x3, y3);
    sGround.lineTo(x1, y1);
    sGround.endFill();
  }

  public DrawRock(type: number, xPos: number, yPos: number, radius: number): void {
    var sGround: Graphics = xPos < 3000 ? this.sGround1 : this.sGround2;
    sGround.lineStyle(6, 0x6bb05a);
    var m: Matrix = new Matrix();
    sGround.beginTextureFill({
      texture: Gradient.getLinearGradientTexture(
        type == 0 ? ["#8EDB82", "#7FBF72"] : type == 1 ? ["#80D970", "#6DBE5D"] : ["#70C160", "#63AB52"]
      ),
      matrix: m,
    });
    sGround.drawCircle(xPos + radius, yPos + radius, radius);
    sGround.endFill();
  }

  public GetMinX(): number {
    return -15;
  }

  public GetMaxX(): number {
    return 72;
  }

  public GetMinY(): number {
    return -20;
  }

  public GetMaxY(): number {
    return 25;
  }

  public Update(): void {
    super.Update();
    this.sSky.Update(this.hasZoomed, this.hasPanned);

    if (this.hasZoomed) {
      this.sGround1.width = this.World2ScreenX(50.11) - this.World2ScreenX(0);
      this.sGround1.scale.y = this.sGround1.scale.x;
      this.sGround2.scale.x = this.sGround1.scale.x;
      this.sGround2.scale.y = this.sGround2.scale.x;
    }
    if (this.hasZoomed || this.hasPanned) {
      this.sGround1.visible = this.World2ScreenX(40) > 0;
      this.sGround2.visible = this.World2ScreenX(38) < 800;
      if (this.sGround1.visible) {
        this.sGround1.x = this.World2ScreenX(-30.8);
        this.sGround1.y = this.World2ScreenY(-17.08);
      }
      if (this.sGround2.visible) {
        this.sGround2.x = this.World2ScreenX(-30.8);
        this.sGround2.y = this.World2ScreenY(-17.08);
      }
    }
    this.hasPanned = false;
    this.hasZoomed = false;
  }

  public saveButton(e: MouseEvent): void {
    this.ShowDisabledDialog();
  }

  public saveReplayButton(e: MouseEvent): void {
    this.ShowDisabledDialog();
    if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
  }

  public submitButton(e: MouseEvent): void {
    this.ShowDisabledDialog();
    if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
  }

  public commentButton(e: MouseEvent, robotID: String = "", robotPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public linkButton(e: MouseEvent, robotID: String = "", robotPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public embedButton(e: MouseEvent, robotID: String = "", robotPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public commentReplayButton(e: MouseEvent, replayID: String = "", replayPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public linkReplayButton(e: MouseEvent, replayID: String = "", replayPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public embedReplayButton(e: MouseEvent, replayID: String = "", replayPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }
}
