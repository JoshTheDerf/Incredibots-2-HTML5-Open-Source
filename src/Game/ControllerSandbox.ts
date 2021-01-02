import { b2Vec2, b2AABB } from "@box2d/core";
import { Sprite, Matrix, Graphics, Text } from "pixi.js";
import { Util } from "../General/Util";
import { Circle } from "../Parts/Circle";
import { Part } from "../Parts/Part";
import { Rectangle } from "../Parts/Rectangle";
import { TextPart } from "../Parts/TextPart";
import { ControllerGame } from "./ControllerGame";
import { Gradient } from "./Graphics/Gradient";
import { Sky } from "./Graphics/Sky";
import { SandboxSettings } from "./SandboxSettings";

export class ControllerSandbox extends ControllerGame
{
	private static terrainTopColours:Array<any>     = ['#65CD4E', Util.HexColourString(191, 131, 83), Util.HexColourString(214, 189, 100), Util.HexColourString(181, 197, 201), Util.HexColourString(224, 238, 253), Util.HexColourString(198, 196, 205), Util.HexColourString(249, 172, 101)];
	private static terrainBottomColours:Array<any>  = ['#5AC043', Util.HexColourString(155, 89, 38), Util.HexColourString(187, 163, 78), Util.HexColourString(156, 171, 175), Util.HexColourString(159, 196, 239), Util.HexColourString(160, 158, 171), Util.HexColourString(240, 70, 45)];
	private static terrainTopOutlines:Array<any>    = ['#2DA12E', Util.HexColourString(144, 99, 62), Util.HexColourString(185, 163, 86), Util.HexColourString(153, 166, 169), Util.HexColourString(247, 251, 255), Util.HexColourString(139, 138, 144), Util.HexColourString(177, 102, 46)];
	private static terrainBottomOutlines:Array<any> = ['#2DA12E', Util.HexColourString(117, 67, 29), Util.HexColourString(161, 141, 67), Util.HexColourString(132, 144, 148), Util.HexColourString(247, 251, 255), Util.HexColourString(115, 114, 122), Util.HexColourString(171, 59, 34)];
	private static rockOutlines:Array<any>          = ['#6BB05A', '#A66B52', '#B1A058', '#98A4A8', '#BDCBD7', '#94939D', '#BA643D'];
	private static rock1TopColours:Array<any>       = ['#8EDB82', Util.HexColourString(210, 157, 111), Util.HexColourString(219, 206, 135), Util.HexColourString(178, 187, 191), Util.HexColourString(217, 230, 245), Util.HexColourString(180, 180, 189), Util.HexColourString(194, 130, 87)];
	private static rock1BottomColours:Array<any>    = ['#7FBF72', Util.HexColourString(183, 133, 96), Util.HexColourString(190, 176, 119), Util.HexColourString(164, 173, 174), Util.HexColourString(201, 210, 225), Util.HexColourString(158, 158, 167), Util.HexColourString(172,	114,	77)];
	private static rock2TopColours:Array<any>       = ['#80D970', Util.HexColourString(206, 148, 90), Util.HexColourString(215, 202, 116), Util.HexColourString(169, 177, 182), Util.HexColourString(204, 217, 236), Util.HexColourString(170, 165, 179), Util.HexColourString(197,	115,	66)];
	private static rock2BottomColours:Array<any>    = ['#6DBE5D', Util.HexColourString(183, 122, 72), Util.HexColourString(188, 175, 97), Util.HexColourString(153, 162, 166), Util.HexColourString(183, 196, 217), Util.HexColourString(149, 145, 154), Util.HexColourString(175,	103,	58)];
	private static rock3TopColours:Array<any>       = ['#70C160', Util.HexColourString(207, 150, 92), Util.HexColourString(216, 203, 117), Util.HexColourString(173, 182, 186), Util.HexColourString(205, 217, 237), Util.HexColourString(172, 168, 181), Util.HexColourString(198,	121,	69)];
	private static rock3BottomColours:Array<any>    = ['#63AB52', Util.HexColourString(184, 123, 76), Util.HexColourString(189, 176, 98), Util.HexColourString(157, 166, 170), Util.HexColourString(186, 198, 218), Util.HexColourString(148, 148, 157), Util.HexColourString(179,	105,	57)];

	public controllerType: string = 'sandbox';

	protected sGround:Graphics = new Graphics();
	public static settings:SandboxSettings;
	private groundParts:Array<any> = new Array();

	public constructor()
	{
		super()
		this.BuildGround(true);
	}

	private BuildGround(fromConstructor:boolean = false):void {
		this.sSky = new Sky(this, ControllerSandbox.settings.background, ControllerSandbox.settings.backgroundR, ControllerSandbox.settings.backgroundG, ControllerSandbox.settings.backgroundB);
		var p:Part;
		if (ControllerSandbox.settings.terrainType == SandboxSettings.TERRAIN_LAND) {
			if (ControllerSandbox.settings.size == SandboxSettings.SIZE_LARGE) {
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
			} else if (ControllerSandbox.settings.size == SandboxSettings.SIZE_MEDIUM) {
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
		} else if (ControllerSandbox.settings.terrainType == SandboxSettings.TERRAIN_BOX) {
			if (ControllerSandbox.settings.size == SandboxSettings.SIZE_LARGE) {
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
			} else if (ControllerSandbox.settings.size == SandboxSettings.SIZE_MEDIUM) {
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

		if (ControllerSandbox.settings.terrainType == SandboxSettings.TERRAIN_LAND) {
			if (ControllerSandbox.settings.size == SandboxSettings.SIZE_LARGE) {
				this.DrawGroundOutlineCircle(0, 0, 150);
				this.DrawGroundOutlineCircle(12000, 0, 150);
				var m:Matrix = new Matrix();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(144, -6, 12012, 312);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(150, 0, 12000, 300);
				this.sGround.endFill();
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
			} else if (ControllerSandbox.settings.size == SandboxSettings.SIZE_MEDIUM) {
				this.DrawGroundOutlineCircle(0, 0, 150);
				this.DrawGroundOutlineCircle(8000, 0, 150);
				m = new Matrix();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(144, -6, 8012, 312);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(150, 0, 8000, 300);
				this.sGround.endFill();
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
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(144, -6, 4012, 312);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(150, 0, 4000, 300);
				this.sGround.endFill();
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
		} else if (ControllerSandbox.settings.terrainType == SandboxSettings.TERRAIN_BOX) {
			if (ControllerSandbox.settings.size == SandboxSettings.SIZE_LARGE) {
				m = new Matrix();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 0, 500, 1264);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(3500, 0, 500, 1264);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 0, 4000, 200);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 1064, 4000, 200);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 0, 498.5, 1264);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(3501.5, 0, 498.5, 1264);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 0, 4000, 198.5);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 1065.5, 4000, 198.5);
				this.sGround.endFill();
				this.DrawRocksForBox(4000, 1264, 500, 200, 1.5);
			} else if (ControllerSandbox.settings.size == SandboxSettings.SIZE_MEDIUM) {
				m = new Matrix();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 0, 400, 615);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(1600, 0, 400, 615);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 0, 2000, 100);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 515, 2000, 100);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 0, 399, 615);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(1601, 0, 399, 615);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 0, 2000, 99);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 516, 2000, 99);
				this.sGround.endFill();
				this.DrawRocksForBox(2000, 615, 400, 100, 1);
			} else {
				m = new Matrix();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 0, 200, 339);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(800, 0, 200, 339);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 0, 1000, 39);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 300, 1000, 39);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 0, 198, 339);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(802, 0, 198, 339);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 0, 1000, 37);
				this.sGround.endFill();
				this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
				this.sGround.drawRect(0, 302, 1000, 37);
				this.sGround.endFill();
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
			if (this.allParts[i] instanceof Text) {
				try {
					this.removeChild(this.allParts[i].m_textField);
				} catch (arg:any) {

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
			if (this.allParts[i] instanceof TextPart) {
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
		return (ControllerSandbox.settings.size == SandboxSettings.SIZE_LARGE ? -280 : (ControllerSandbox.settings.size == SandboxSettings.SIZE_MEDIUM ? -150 : -50));
	}

	public GetMaxX():number {
		return (ControllerSandbox.settings.size == SandboxSettings.SIZE_LARGE ? 280 : (ControllerSandbox.settings.size == SandboxSettings.SIZE_MEDIUM ? 150 : 50));
	}

	public GetMinY():number {
		return (ControllerSandbox.settings.size == SandboxSettings.SIZE_LARGE ? -160 : (ControllerSandbox.settings.size == SandboxSettings.SIZE_MEDIUM ? -100 : -30));
	}

	public GetMaxY():number {
		if (ControllerSandbox.settings.terrainType == SandboxSettings.TERRAIN_BOX) {
			return (ControllerSandbox.settings.size == SandboxSettings.SIZE_SMALL ? 15 : 30);
		} else {
			return (ControllerSandbox.settings.size == SandboxSettings.SIZE_LARGE ? 160 : (ControllerSandbox.settings.size == SandboxSettings.SIZE_MEDIUM ? 100 : 40));
		}
	}

	protected GetGravity():b2Vec2 {
		return new b2Vec2(0.0, ControllerSandbox.settings.gravity);
	}

	public DrawGroundOutlineCircle(xPos:number, yPos:number, radius:number):void {
		var m:Matrix = new Matrix();
		this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopOutlines[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomOutlines[ControllerSandbox.settings.terrainTheme]]), matrix: m });
		this.sGround.drawCircle(xPos + radius, yPos + radius, radius + 6);
		this.sGround.endFill();
	}

	public DrawGroundCircle(xPos:number, yPos:number, radius:number):void {
		var m:Matrix = new Matrix();
		this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture([ControllerSandbox.terrainTopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.terrainBottomColours[ControllerSandbox.settings.terrainTheme]]), matrix: m });
		this.sGround.drawCircle(xPos + radius, yPos + radius, radius);
		this.sGround.endFill();
	}

	public DrawRock(type:number, xPos:number, yPos:number, radius:number, outlineThickness:number = 6):void {
		this.sGround.lineStyle(outlineThickness, ControllerSandbox.rockOutlines[ControllerSandbox.settings.terrainTheme]);
		var m:Matrix = new Matrix();
		this.sGround.beginTextureFill({ texture: Gradient.getLinearGradientTexture((type == 0 ? [ControllerSandbox.rock1TopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.rock1BottomColours[ControllerSandbox.settings.terrainTheme]] : (type == 1 ? [ControllerSandbox.rock2TopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.rock2BottomColours[ControllerSandbox.settings.terrainTheme]] : [ControllerSandbox.rock3TopColours[ControllerSandbox.settings.terrainTheme], ControllerSandbox.rock3BottomColours[ControllerSandbox.settings.terrainTheme]]))), matrix: m });
		this.sGround.drawCircle(xPos + radius, yPos + radius, radius);
		this.sGround.endFill();
	}

	public DrawRocksForBox(width:number, height:number, thicknessX:number, thicknessY:number, outlineThickness:number):void {
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

		if (ControllerSandbox.settings.terrainType == SandboxSettings.TERRAIN_LAND) {
			if (ControllerSandbox.settings.size == SandboxSettings.SIZE_LARGE) {
				if (this.hasZoomed) {
					this.sGround.width = this.World2ScreenX(507.7) - this.World2ScreenX(0);
					this.sGround.scale.y = this.sGround.scale.x;
				}
				if (this.hasZoomed || this.hasPanned) {
					this.sGround.x = this.World2ScreenX(-253.55);
					this.sGround.y = this.World2ScreenY(12.06);
				}
			} else if (ControllerSandbox.settings.size == SandboxSettings.SIZE_MEDIUM) {
				if (this.hasZoomed) {
					this.sGround.width = this.World2ScreenX(247.2) - this.World2ScreenX(0);
					this.sGround.scale.y = this.sGround.scale.x;
				}
				if (this.hasZoomed || this.hasPanned) {
					this.sGround.x = this.World2ScreenX(-123.45);
					this.sGround.y = this.World2ScreenY(12.06);
				}
			} else {
				if (this.hasZoomed) {
					this.sGround.width = this.World2ScreenX(85) - this.World2ScreenX(0);
					this.sGround.scale.y = this.sGround.scale.x;
				}
				if (this.hasZoomed || this.hasPanned) {
					this.sGround.x = this.World2ScreenX(-42.36);
					this.sGround.y = this.World2ScreenY(12.06);
				}
			}
		} else if (ControllerSandbox.settings.terrainType == SandboxSettings.TERRAIN_BOX) {
			if (ControllerSandbox.settings.size == SandboxSettings.SIZE_LARGE) {
				if (this.hasZoomed) {
					this.sGround.width = this.World2ScreenX(693) - this.World2ScreenX(0);
					this.sGround.scale.y = this.sGround.scale.x;
				}
				if (this.hasZoomed || this.hasPanned) {
					this.sGround.x = this.World2ScreenX(-346.5);
					this.sGround.y = this.World2ScreenY(-174.5);
				}
			} else if (ControllerSandbox.settings.size == SandboxSettings.SIZE_MEDIUM) {
				if (this.hasZoomed) {
					this.sGround.width = this.World2ScreenX(432.5) - this.World2ScreenX(0);
					this.sGround.scale.y = this.sGround.scale.x;
				}
				if (this.hasZoomed || this.hasPanned) {
					this.sGround.x = this.World2ScreenX(-216.25);
					this.sGround.y = this.World2ScreenY(-101.45);
				}
			} else {
				if (this.hasZoomed) {
					this.sGround.width = this.World2ScreenX(132.85) - this.World2ScreenX(0);
					this.sGround.scale.y = this.sGround.scale.x;
				}
				if (this.hasZoomed || this.hasPanned) {
					this.sGround.x = this.World2ScreenX(-66.42);
					this.sGround.y = this.World2ScreenY(-30);
				}
			}
		}
		if (!(['ControllerMonkeyBars', 'ControllerClimb', 'ControllerRace', 'ControllerSpaceship'].includes(this.constructor.name))) {
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

	public submitButton(e:any):void {
		if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
		this.ShowDisabledDialog();
	}
}
