import { b2Vec2, b2AABB } from "@box2d/core";
import { Sprite, settings, Matrix } from "pixi.js";
import { Util } from "../General/Util";
import { Circle } from "../Parts/Circle";
import { Part } from "../Parts/Part";
import { Rectangle } from "../Parts/Rectangle";
import { TextPart } from "../Parts/TextPart";
import { ControllerGame } from "./ControllerGame";
import { Sky } from "./Graphics/Sky";
import { SandboxSettings } from "./SandboxSettings";

export class ControllerSandbox extends ControllerGame
{
	private static const terrainTopColours:Array<any>     = [0x65CD4E, Util.HexColour(191, 131, 83), Util.HexColour(214, 189, 100), Util.HexColour(181, 197, 201), Util.HexColour(224, 238, 253), Util.HexColour(198, 196, 205), Util.HexColour(249, 172, 101)];
	private static const terrainBottomColours:Array<any>  = [0x5AC043, Util.HexColour(155, 89, 38), Util.HexColour(187, 163, 78), Util.HexColour(156, 171, 175), Util.HexColour(159, 196, 239), Util.HexColour(160, 158, 171), Util.HexColour(240, 70, 45)];
	private static const terrainTopOutlines:Array<any>    = [0x2DA12E, Util.HexColour(144, 99, 62), Util.HexColour(185, 163, 86), Util.HexColour(153, 166, 169), Util.HexColour(247, 251, 255), Util.HexColour(139, 138, 144), Util.HexColour(177, 102, 46)];
	private static const terrainBottomOutlines:Array<any> = [0x2DA12E, Util.HexColour(117, 67, 29), Util.HexColour(161, 141, 67), Util.HexColour(132, 144, 148), Util.HexColour(247, 251, 255), Util.HexColour(115, 114, 122), Util.HexColour(171, 59, 34)];
	private static const rockOutlines:Array<any>          = [0x6BB05A, 0xA66B52, 0xB1A058, 0x98A4A8, 0xBDCBD7, 0x94939D, 0xBA643D];
	private static const rock1TopColours:Array<any>       = [0x8EDB82, Util.HexColour(210, 157, 111), Util.HexColour(219, 206, 135), Util.HexColour(178, 187, 191), Util.HexColour(217, 230, 245), Util.HexColour(180, 180, 189), Util.HexColour(194, 130, 87)];
	private static const rock1BottomColours:Array<any>    = [0x7FBF72, Util.HexColour(183, 133, 96), Util.HexColour(190, 176, 119), Util.HexColour(164, 173, 174), Util.HexColour(201, 210, 225), Util.HexColour(158, 158, 167), Util.HexColour(172,	114,	77)];
	private static const rock2TopColours:Array<any>       = [0x80D970, Util.HexColour(206, 148, 90), Util.HexColour(215, 202, 116), Util.HexColour(169, 177, 182), Util.HexColour(204, 217, 236), Util.HexColour(170, 165, 179), Util.HexColour(197,	115,	66)];
	private static const rock2BottomColours:Array<any>    = [0x6DBE5D, Util.HexColour(183, 122, 72), Util.HexColour(188, 175, 97), Util.HexColour(153, 162, 166), Util.HexColour(183, 196, 217), Util.HexColour(149, 145, 154), Util.HexColour(175,	103,	58)];
	private static const rock3TopColours:Array<any>       = [0x70C160, Util.HexColour(207, 150, 92), Util.HexColour(216, 203, 117), Util.HexColour(173, 182, 186), Util.HexColour(205, 217, 237), Util.HexColour(172, 168, 181), Util.HexColour(198,	121,	69)];
	private static const rock3BottomColours:Array<any>    = [0x63AB52, Util.HexColour(184, 123, 76), Util.HexColour(189, 176, 98), Util.HexColour(157, 166, 170), Util.HexColour(186, 198, 218), Util.HexColour(148, 148, 157), Util.HexColour(179,	105,	57)];

	protected sGround:Sprite|null = null;
	public static settings:SandboxSettings;
	private groundParts:Array<any> = new Array();

	public constructor()
	{
		super()
		this.BuildGround(true);
	}

	private BuildGround(fromConstructor:boolean = false):void {
		this.sSky = new Sky(this, settings.background, settings.backgroundR, settings.backgroundG, settings.backgroundB);
		var p:Part;
		if (settings.terrainType == SandboxSettings.TERRAIN_LAND) {
			if (settings.size == SandboxSettings.SIZE_LARGE) {
				p = new Rectangle(-247.7, 12, 495.4, 12.5, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Circle(-247.4, 18.25, 6.25, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Circle(247.4, 18.25, 6.25, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
			} else if (settings.size == SandboxSettings.SIZE_MEDIUM) {
				p = new Rectangle(-119.5, 12, 239, 9, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Circle(-119, 16.5, 4.5);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Circle(119, 16.5, 4.5);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
			} else {
				p = new Rectangle(-39.7, 12, 79.4, 6, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Circle(-39.4, 15, 3);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Circle(39.4, 15, 3);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
			}
		} else if (settings.terrainType == SandboxSettings.TERRAIN_BOX) {
			if (settings.size == SandboxSettings.SIZE_LARGE) {
				p = new Rectangle(-300, -180, 600, 40, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Rectangle(-300, -180, 40, 230, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Rectangle(260, -180, 40, 230, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Rectangle(-300, 10, 600, 40, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
			} else if (settings.size == SandboxSettings.SIZE_MEDIUM) {
				p = new Rectangle(-170, -120, 340, 40, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Rectangle(-170, -120, 40, 170, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Rectangle(130, -120, 40, 170, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Rectangle(-170, 10, 340, 40, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
			} else {
				p = new Rectangle(-60, -45, 120, 20, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Rectangle(-60, -40, 20, 80, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Rectangle(40, -40, 20, 80, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
				p = new Rectangle(-60, 10, 120, 20, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				p.isSandbox = true;
				this.allParts.push(p);
				this.groundParts.push(p);
			}
		}

		if (!this.sGround || !fromConstructor) this.sGround = new Sprite();

		if (settings.terrainType == SandboxSettings.TERRAIN_LAND) {
			if (settings.size == SandboxSettings.SIZE_LARGE) {
				this.DrawGroundOutlineCircle(0, 0, 150);
				this.DrawGroundOutlineCircle(12000, 0, 150);
				var m:Matrix = new Matrix();
				m.createGradientBox(1, 300, Math.PI / 2, 0, 0);
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(144, -6, 12012, 312);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(150, 0, 12000, 300);
				this.sGround.graphics.endFill();
				this.DrawGroundCircle(0, 0, 150);
				this.DrawGroundCircle(12000, 0, 150);
				this.DrawRock(0, 169, 200, 40);
				this.DrawRock(0, 318, 44, 48);
				this.DrawRock(2, 795, 195, 28);
				this.DrawRock(0, 1110, 120, 40);
				this.DrawRock(2, 1440, 121, 69);
				this.DrawRock(0, 1762, 68, 57);
				this.DrawRock(1, 2082, 11, 68);
				this.DrawRock(0, 2395, 192, 51);
				this.DrawRock(0, 2727, 152, 39);
				this.DrawRock(0, 3032, 74, 61);
				this.DrawRock(1, 3196, 18, 46);
				this.DrawRock(0, 3527, 197, 28);
				this.DrawRock(0, 3842, 168, 18);
				this.DrawRock(1, 4003, 108, 23);
				this.DrawRock(2, 4325, 47, 68);
				this.DrawRock(0, 4641, 109, 50);
				this.DrawRock(1, 4806, 164, 27);
				this.DrawRock(2, 5110, 138, 16);
				this.DrawRock(2, 5287, 199, 45);
				this.DrawRock(2, 5447, 40, 68);
				this.DrawRock(1, 5605, 142, 22);
				this.DrawRock(2, 5769, 173, 54);
				this.DrawRock(0, 6075, 169, 15);
				this.DrawRock(1, 6401, 24, 41);
				this.DrawRock(0, 6569, 86, 59);
				this.DrawRock(0, 6885, 74, 29);
				this.DrawRock(2, 7200, 153, 15);
				this.DrawRock(0, 7354, 121, 32);
				this.DrawRock(2, 7722, 89, 61);
				this.DrawRock(1, 7946, 66, 19);
				this.DrawRock(2, 8325, 47, 68);
				this.DrawRock(0, 8641, 109, 50);
				this.DrawRock(1, 8806, 164, 27);
				this.DrawRock(2, 9110, 138, 16);
				this.DrawRock(2, 9287, 199, 45);
				this.DrawRock(2, 9447, 40, 68);
				this.DrawRock(1, 9605, 142, 22);
				this.DrawRock(2, 9769, 173, 54);
				this.DrawRock(0, 10075, 169, 15);
				this.DrawRock(1, 10401, 24, 41);
				this.DrawRock(0, 10569, 86, 59);
				this.DrawRock(0, 10885, 74, 29);
				this.DrawRock(2, 11200, 153, 15);
				this.DrawRock(0, 11354, 121, 32);
				this.DrawRock(2, 11722, 89, 61);
				this.DrawRock(1, 11946, 66, 19);
			} else if (settings.size == SandboxSettings.SIZE_MEDIUM) {
				this.DrawGroundOutlineCircle(0, 0, 150);
				this.DrawGroundOutlineCircle(8000, 0, 150);
				m = new Matrix();
				m.createGradientBox(1, 300, Math.PI / 2, 0, 0);
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(144, -6, 8012, 312);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(150, 0, 8000, 300);
				this.sGround.graphics.endFill();
				this.DrawGroundCircle(0, 0, 150);
				this.DrawGroundCircle(8000, 0, 150);
				this.DrawRock(0, 169, 200, 40);
				this.DrawRock(0, 318, 44, 48);
				this.DrawRock(2, 795, 195, 28);
				this.DrawRock(0, 1110, 120, 40);
				this.DrawRock(2, 1440, 121, 69);
				this.DrawRock(0, 1762, 68, 57);
				this.DrawRock(1, 2082, 11, 68);
				this.DrawRock(0, 2395, 192, 51);
				this.DrawRock(0, 2727, 152, 39);
				this.DrawRock(0, 3032, 74, 61);
				this.DrawRock(1, 3196, 18, 46);
				this.DrawRock(0, 3527, 197, 28);
				this.DrawRock(0, 3842, 168, 18);
				this.DrawRock(1, 4003, 108, 23);
				this.DrawRock(2, 4325, 47, 68);
				this.DrawRock(0, 4641, 109, 50);
				this.DrawRock(1, 4806, 164, 27);
				this.DrawRock(2, 5110, 138, 16);
				this.DrawRock(2, 5287, 199, 45);
				this.DrawRock(2, 5447, 40, 68);
				this.DrawRock(1, 5605, 142, 22);
				this.DrawRock(2, 5769, 173, 54);
				this.DrawRock(0, 6075, 169, 15);
				this.DrawRock(1, 6401, 24, 41);
				this.DrawRock(0, 6569, 86, 59);
				this.DrawRock(0, 6885, 74, 29);
				this.DrawRock(2, 7200, 153, 15);
				this.DrawRock(0, 7354, 121, 32);
				this.DrawRock(2, 7722, 89, 61);
				this.DrawRock(1, 7946, 66, 19);
			} else {
				this.DrawGroundOutlineCircle(0, 0, 150);
				this.DrawGroundOutlineCircle(4000, 0, 150);
				m = new Matrix();
				m.createGradientBox(1, 300, Math.PI / 2, 0, 0);
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(144, -6, 4012, 312);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(150, 0, 4000, 300);
				this.sGround.graphics.endFill();
				this.DrawGroundCircle(0, 0, 150);
				this.DrawGroundCircle(4000, 0, 150);
				this.DrawRock(0, 169, 200, 40);
				this.DrawRock(0, 318, 44, 48);
				this.DrawRock(2, 795, 195, 28);
				this.DrawRock(0, 1110, 120, 40);
				this.DrawRock(2, 1440, 121, 69);
				this.DrawRock(0, 1762, 68, 57);
				this.DrawRock(1, 2082, 11, 68);
				this.DrawRock(0, 2395, 192, 51);
				this.DrawRock(0, 2727, 152, 39);
				this.DrawRock(0, 3032, 74, 61);
				this.DrawRock(1, 3196, 18, 46);
				this.DrawRock(0, 3527, 197, 28);
				this.DrawRock(0, 3842, 168, 18);
			}
		} else if (settings.terrainType == SandboxSettings.TERRAIN_BOX) {
			if (settings.size == SandboxSettings.SIZE_LARGE) {
				m = new Matrix();
				m.createGradientBox(1, 1264, Math.PI / 2, 0, 0);
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 0, 500, 1264);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(3500, 0, 500, 1264);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 0, 4000, 200);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 1064, 4000, 200);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 0, 498.5, 1264);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(3501.5, 0, 498.5, 1264);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 0, 4000, 198.5);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 1065.5, 4000, 198.5);
				this.sGround.graphics.endFill();
				this.DrawRocksForBox(4000, 1264, 500, 200, 1.5);
			} else if (settings.size == SandboxSettings.SIZE_MEDIUM) {
				m = new Matrix();
				m.createGradientBox(1, 615, Math.PI / 2, 0, 0);
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 0, 400, 615);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(1600, 0, 400, 615);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 0, 2000, 100);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 515, 2000, 100);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 0, 399, 615);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(1601, 0, 399, 615);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 0, 2000, 99);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 516, 2000, 99);
				this.sGround.graphics.endFill();
				this.DrawRocksForBox(2000, 615, 400, 100, 1);
			} else {
				m = new Matrix();
				m.createGradientBox(1, 339, Math.PI / 2, 0, 0);
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 0, 200, 339);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(800, 0, 200, 339);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 0, 1000, 39);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 300, 1000, 39);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 0, 198, 339);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(802, 0, 198, 339);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 0, 1000, 37);
				this.sGround.graphics.endFill();
				this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
				this.sGround.graphics.drawRect(0, 302, 1000, 37);
				this.sGround.graphics.endFill();
				this.DrawRocksForBox(1000, 339, 200, 39, 2);
			}
		}

		this.addChild(this.sGround);
	}

	public RefreshSandboxSettings():void {
		for (var i:number = 0; i < this.groundParts.length; i++) {
			this.allParts = Util.RemoveFromArray(this.groundParts[i], this.allParts);
		}
		for (i = 0; i < this.allParts.length; i++) {
			if (this.allParts[i] is TextPart) {
				try {
					this.removeChild(this.allParts[i].m_textField);
				} catch (arg:Error) {

				}
			}
		}
		this.groundParts = new Array();
		this.removeChild(this.sGround);
		this.sSky.Delete();
		this.removeChild(this.m_canvas);
		this.removeChild(this.uneditableText);
		this.removeChild(this.rotatingText);
		this.removeChild(this.scalingText);
		this.removeChild(this.boxText);
		this.removeChild(this.horizLineText);
		this.removeChild(this.vertLineText);
		this.removeChild(this.shapeText);
		this.removeChild(this.m_guiPanel);
		this.removeChild(this.m_sidePanel);
		this.removeChild(this.m_guiMenu);
		this.removeChild(this.m_fader);
		for (i = 0; i < this.m_buildAreas.length; i++) {
			this.removeChild(this.m_buildAreas[i]);
			this.removeChild(this.m_badBuildAreas[i]);
			this.removeChild(this.m_selectedBuildAreas[i]);
		}
		if (this.m_chooserWindow) {
			this.removeChild(this.m_chooserWindow);
			this.m_chooserWindow = null;
		}
		if (this.m_loginWindow) {
			this.removeChild(this.m_loginWindow);
			this.m_loginWindow = null;
		}
		if (this.m_newUserWindow) {
			this.removeChild(this.m_newUserWindow);
			this.m_newUserWindow = null;
		}
		if (this.m_scoreWindow) {
			this.removeChild(this.m_scoreWindow);
			this.m_scoreWindow = null;
		}
		if (this.m_progressDialog) {
			this.removeChild(this.m_progressDialog);
			this.m_progressDialog = null;
		}
		if (this.m_linkDialog) {
			this.removeChild(this.m_linkDialog);
			this.m_linkDialog = null;
		}
		if (this.m_tutorialDialog) {
			this.removeChild(this.m_tutorialDialog);
			this.m_tutorialDialog = null;
		}
		if (this.m_postReplayWindow) {
			this.removeChild(this.m_postReplayWindow);
			this.m_postReplayWindow = null;
		}
		if (this.m_rateDialog) {
			this.removeChild(this.m_rateDialog);
			this.m_rateDialog = null;
		}
		if (this.m_restrictionsDialog) {
			this.removeChild(this.m_restrictionsDialog);
			this.m_restrictionsDialog = null;
		}
		if (this.m_conditionsDialog) {
			this.removeChild(this.m_conditionsDialog);
			this.m_conditionsDialog = null;
		}
		if (this.m_sandboxWindow) {
			this.removeChild(this.m_sandboxWindow);
			this.m_sandboxWindow = null;
		}
		if (this.m_challengeWindow) {
			this.removeChild(this.m_challengeWindow);
			this.m_challengeWindow = null;
		}
		if (this.m_reportWindow) {
			this.removeChild(this.m_reportWindow);
			this.m_reportWindow = null;
		}
		if (this.m_loadWindow) {
			this.removeChild(this.m_loadWindow);
			this.m_loadWindow = null;
		}
		this.m_buildAreas = new Array();
		this.m_badBuildAreas = new Array();
		this.m_selectedBuildAreas = new Array();
		this.BuildGround();
		this.addChild(this.m_canvas);
		this.addChild(this.uneditableText);
		this.addChild(this.rotatingText);
		this.addChild(this.scalingText);
		this.addChild(this.boxText);
		this.addChild(this.horizLineText);
		this.addChild(this.vertLineText);
		this.addChild(this.shapeText);
		this.addChild(this.m_guiPanel);
		this.addChild(this.m_sidePanel);
		this.addChild(this.m_guiMenu);
		this.addChild(this.m_fader);
		for (i = 0; i < this.allParts.length; i++) {
			if (this.allParts[i] is TextPart) {
				if (this.allParts[i].inFront) {
					this.addChildAt(this.allParts[i].m_textField, this.getChildIndex(this.m_canvas) + 1);
				} else {
					this.addChildAt(this.allParts[i].m_textField, this.getChildIndex(this.m_canvas));
				}
			}
		}
		this.BuildBuildArea();
		this.redrawRobot = true;
		this.hasZoomed = true;
	}

	public GetMinX():number {
		return (settings.size == SandboxSettings.SIZE_LARGE ? -280 : (settings.size == SandboxSettings.SIZE_MEDIUM ? -150 : -50));
	}

	public GetMaxX():number {
		return (settings.size == SandboxSettings.SIZE_LARGE ? 280 : (settings.size == SandboxSettings.SIZE_MEDIUM ? 150 : 50));
	}

	public GetMinY():number {
		return (settings.size == SandboxSettings.SIZE_LARGE ? -160 : (settings.size == SandboxSettings.SIZE_MEDIUM ? -100 : -30));
	}

	public GetMaxY():number {
		if (settings.terrainType == SandboxSettings.TERRAIN_BOX) {
			return (settings.size == SandboxSettings.SIZE_SMALL ? 15 : 30);
		} else {
			return (settings.size == SandboxSettings.SIZE_LARGE ? 160 : (settings.size == SandboxSettings.SIZE_MEDIUM ? 100 : 40));
		}
	}

	protected GetGravity():b2Vec2 {
		return new b2Vec2(0.0, settings.gravity);
	}

	private DrawGroundOutlineCircle(xPos:number, yPos:number, radius:number):void {
		var m:Matrix = new Matrix();
		m.createGradientBox(1, radius * 2, Math.PI / 2, 0, 0);
		this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopOutlines[settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
		this.sGround.graphics.drawCircle(xPos + radius, yPos + radius, radius + 6);
		this.sGround.graphics.endFill();
	}

	private DrawGroundCircle(xPos:number, yPos:number, radius:number):void {
		var m:Matrix = new Matrix();
		m.createGradientBox(1, radius * 2, Math.PI / 2, 0, 0);
		this.sGround.graphics.beginGradientFill(GradientType.LINEAR, [ControllerSandbox.terrainTopColours[settings.terrainTheme], ControllerSandbox.terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
		this.sGround.graphics.drawCircle(xPos + radius, yPos + radius, radius);
		this.sGround.graphics.endFill();
	}

	private DrawRock(type:number, xPos:number, yPos:number, radius:number, outlineThickness:number = 6):void {
		this.sGround.graphics.lineStyle(outlineThickness, ControllerSandbox.rockOutlines[settings.terrainTheme]);
		var m:Matrix = new Matrix();
		m.createGradientBox(radius * 2, radius * 2, Math.PI / 2, xPos, yPos);
		this.sGround.graphics.beginGradientFill(GradientType.LINEAR, (type == 0 ? [ControllerSandbox.rock1TopColours[settings.terrainTheme], ControllerSandbox.rock1BottomColours[settings.terrainTheme]] : (type == 1 ? [ControllerSandbox.rock2TopColours[settings.terrainTheme], ControllerSandbox.rock2BottomColours[settings.terrainTheme]] : [ControllerSandbox.rock3TopColours[settings.terrainTheme], ControllerSandbox.rock3BottomColours[settings.terrainTheme]])), [1, 1], [0, 255], m);
		this.sGround.graphics.drawCircle(xPos + radius, yPos + radius, radius);
		this.sGround.graphics.endFill();
	}

	private DrawRocksForBox(width:number, height:number, thicknessX:number, thicknessY:number, outlineThickness:number):void {
		var numRocks:number = (width == 1000 ? 60 : (width == 2000 ? 200 : 500));
		var rockPositions:Array<any> = new Array();
		for (var i:number = 0; i < numRocks; i++) {
			var rockPosition:b2Vec2;
			var badPosition:boolean;
			do {
				badPosition = false;
				rockPosition = Util.Vector(Util.RangedRandom(0, width), Util.RangedRandom(0, height));
				if ((rockPosition.x > thicknessX - 32 && rockPosition.x < width - thicknessX + 2 && rockPosition.y > thicknessY - 32 && rockPosition.y < height - thicknessY + 2) || rockPosition.x > width - 32 || rockPosition.y > height - 32) {
					badPosition = true;
				} else {
					for (var j:number = 0; j < rockPositions.length; j++) {
						if (Util.GetDist(rockPosition.x, rockPosition.y, rockPositions[j].x, rockPositions[j].y) < 32) {
							badPosition = true;
							break;
						}
					}
				}
			} while (badPosition);
			rockPositions.push(rockPosition);
			this.DrawRock(Util.RangedRandom(0, 3), rockPosition.x, rockPosition.y, Util.RangedRandom(5, 15), outlineThickness);
		}
	}

	public Update():void {
		super.Update();
		this.sSky.Update(this.hasZoomed, this.hasPanned);

		if (settings.terrainType == SandboxSettings.TERRAIN_LAND) {
			if (settings.size == SandboxSettings.SIZE_LARGE) {
				if (this.hasZoomed) {
					this.sGround.width = this.World2ScreenX(507.7) - this.World2ScreenX(0);
					this.sGround.scaleY = this.sGround.scaleX;
				}
				if (this.hasZoomed || this.hasPanned) {
					this.sGround.x = this.World2ScreenX(-253.55);
					this.sGround.y = this.World2ScreenY(12.06);
				}
			} else if (settings.size == SandboxSettings.SIZE_MEDIUM) {
				if (this.hasZoomed) {
					this.sGround.width = this.World2ScreenX(247.2) - this.World2ScreenX(0);
					this.sGround.scaleY = this.sGround.scaleX;
				}
				if (this.hasZoomed || this.hasPanned) {
					this.sGround.x = this.World2ScreenX(-123.45);
					this.sGround.y = this.World2ScreenY(12.06);
				}
			} else {
				if (this.hasZoomed) {
					this.sGround.width = this.World2ScreenX(85) - this.World2ScreenX(0);
					this.sGround.scaleY = this.sGround.scaleX;
				}
				if (this.hasZoomed || this.hasPanned) {
					this.sGround.x = this.World2ScreenX(-42.36);
					this.sGround.y = this.World2ScreenY(12.06);
				}
			}
		} else if (settings.terrainType == SandboxSettings.TERRAIN_BOX) {
			if (settings.size == SandboxSettings.SIZE_LARGE) {
				if (this.hasZoomed) {
					this.sGround.width = this.World2ScreenX(693) - this.World2ScreenX(0);
					this.sGround.scaleY = this.sGround.scaleX;
				}
				if (this.hasZoomed || this.hasPanned) {
					this.sGround.x = this.World2ScreenX(-346.5);
					this.sGround.y = this.World2ScreenY(-174.5);
				}
			} else if (settings.size == SandboxSettings.SIZE_MEDIUM) {
				if (this.hasZoomed) {
					this.sGround.width = this.World2ScreenX(432.5) - this.World2ScreenX(0);
					this.sGround.scaleY = this.sGround.scaleX;
				}
				if (this.hasZoomed || this.hasPanned) {
					this.sGround.x = this.World2ScreenX(-216.25);
					this.sGround.y = this.World2ScreenY(-101.45);
				}
			} else {
				if (this.hasZoomed) {
					this.sGround.width = this.World2ScreenX(132.85) - this.World2ScreenX(0);
					this.sGround.scaleY = this.sGround.scaleX;
				}
				if (this.hasZoomed || this.hasPanned) {
					this.sGround.x = this.World2ScreenX(-66.42);
					this.sGround.y = this.World2ScreenY(-30);
				}
			}
		}
		if (!(this is ControllerMonkeyBars || this is ControllerClimb || this is ControllerRace || this is ControllerSpaceship)) {
			this.hasPanned = false;
			this.hasZoomed = false;
		}
	}

	protected GetBuildingArea():b2AABB {
		var area:b2AABB = new b2AABB();
		area.lowerBound.Set(-300, -200);
		area.upperBound.Set(300, 200);
		return area;
	}

	protected NumBuildingAreas():number {
		return 0;
	}

	protected ChallengeOver():boolean {
		return false;
	}

	public GetScore():number {
		return 10000;
	}

	public submitButton(e:MouseEvent):void {
		if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
		this.ShowDisabledDialog();
	}
}
