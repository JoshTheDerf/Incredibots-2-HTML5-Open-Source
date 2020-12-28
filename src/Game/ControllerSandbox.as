package Game
{
	import Box2D.Collision.b2AABB;
	import Box2D.Common.Math.b2Vec2;
	
	import Game.Challenges.*;
	import Game.Graphics.*;
	
	import General.Util;
	
	import Parts.*;
	
	import flash.display.*;
	import flash.events.MouseEvent;
	import flash.geom.Matrix;

	public class ControllerSandbox extends ControllerGame
	{
		private static const terrainTopColours:Array     = [0x65CD4E, Util.HexColour(191, 131, 83), Util.HexColour(214, 189, 100), Util.HexColour(181, 197, 201), Util.HexColour(224, 238, 253), Util.HexColour(198, 196, 205), Util.HexColour(249, 172, 101)];
		private static const terrainBottomColours:Array  = [0x5AC043, Util.HexColour(155, 89, 38), Util.HexColour(187, 163, 78), Util.HexColour(156, 171, 175), Util.HexColour(159, 196, 239), Util.HexColour(160, 158, 171), Util.HexColour(240, 70, 45)];
		private static const terrainTopOutlines:Array    = [0x2DA12E, Util.HexColour(144, 99, 62), Util.HexColour(185, 163, 86), Util.HexColour(153, 166, 169), Util.HexColour(247, 251, 255), Util.HexColour(139, 138, 144), Util.HexColour(177, 102, 46)];
		private static const terrainBottomOutlines:Array = [0x2DA12E, Util.HexColour(117, 67, 29), Util.HexColour(161, 141, 67), Util.HexColour(132, 144, 148), Util.HexColour(247, 251, 255), Util.HexColour(115, 114, 122), Util.HexColour(171, 59, 34)];
		private static const rockOutlines:Array          = [0x6BB05A, 0xA66B52, 0xB1A058, 0x98A4A8, 0xBDCBD7, 0x94939D, 0xBA643D];
		private static const rock1TopColours:Array       = [0x8EDB82, Util.HexColour(210, 157, 111), Util.HexColour(219, 206, 135), Util.HexColour(178, 187, 191), Util.HexColour(217, 230, 245), Util.HexColour(180, 180, 189), Util.HexColour(194, 130, 87)];
		private static const rock1BottomColours:Array    = [0x7FBF72, Util.HexColour(183, 133, 96), Util.HexColour(190, 176, 119), Util.HexColour(164, 173, 174), Util.HexColour(201, 210, 225), Util.HexColour(158, 158, 167), Util.HexColour(172,	114,	77)];
		private static const rock2TopColours:Array       = [0x80D970, Util.HexColour(206, 148, 90), Util.HexColour(215, 202, 116), Util.HexColour(169, 177, 182), Util.HexColour(204, 217, 236), Util.HexColour(170, 165, 179), Util.HexColour(197,	115,	66)];
		private static const rock2BottomColours:Array    = [0x6DBE5D, Util.HexColour(183, 122, 72), Util.HexColour(188, 175, 97), Util.HexColour(153, 162, 166), Util.HexColour(183, 196, 217), Util.HexColour(149, 145, 154), Util.HexColour(175,	103,	58)];
		private static const rock3TopColours:Array       = [0x70C160, Util.HexColour(207, 150, 92), Util.HexColour(216, 203, 117), Util.HexColour(173, 182, 186), Util.HexColour(205, 217, 237), Util.HexColour(172, 168, 181), Util.HexColour(198,	121,	69)];
		private static const rock3BottomColours:Array    = [0x63AB52, Util.HexColour(184, 123, 76), Util.HexColour(189, 176, 98), Util.HexColour(157, 166, 170), Util.HexColour(186, 198, 218), Util.HexColour(148, 148, 157), Util.HexColour(179,	105,	57)];

		protected var sGround:Sprite = null;
		public static var settings:SandboxSettings;
		private var groundParts:Array = new Array();
		
		public function ControllerSandbox()
		{
			BuildGround(true);
		}

		private function BuildGround(fromConstructor:Boolean = false):void {
			sSky = new Sky(this, settings.background, settings.backgroundR, settings.backgroundG, settings.backgroundB);
			var p:Part;
			if (settings.terrainType == SandboxSettings.TERRAIN_LAND) {
				if (settings.size == SandboxSettings.SIZE_LARGE) {
					p = new Rectangle(-247.7, 12, 495.4, 12.5, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Circle(-247.4, 18.25, 6.25, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Circle(247.4, 18.25, 6.25, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
				} else if (settings.size == SandboxSettings.SIZE_MEDIUM) {
					p = new Rectangle(-119.5, 12, 239, 9, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Circle(-119, 16.5, 4.5);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Circle(119, 16.5, 4.5);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
				} else {
					p = new Rectangle(-39.7, 12, 79.4, 6, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Circle(-39.4, 15, 3);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Circle(39.4, 15, 3);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
				}
			} else if (settings.terrainType == SandboxSettings.TERRAIN_BOX) {
				if (settings.size == SandboxSettings.SIZE_LARGE) {
					p = new Rectangle(-300, -180, 600, 40, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Rectangle(-300, -180, 40, 230, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Rectangle(260, -180, 40, 230, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Rectangle(-300, 10, 600, 40, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
				} else if (settings.size == SandboxSettings.SIZE_MEDIUM) {
					p = new Rectangle(-170, -120, 340, 40, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Rectangle(-170, -120, 40, 170, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Rectangle(130, -120, 40, 170, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Rectangle(-170, 10, 340, 40, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
				} else {
					p = new Rectangle(-60, -45, 120, 20, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Rectangle(-60, -40, 20, 80, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Rectangle(40, -40, 20, 80, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
					p = new Rectangle(-60, 10, 120, 20, false);
					p.isStatic = true;
					p.isEditable = false;
					p.drawAnyway = false;
					p.isSandbox = true;
					allParts.push(p);
					groundParts.push(p);
				}
			}
			
			if (!sGround || !fromConstructor) sGround = new Sprite();
			
			if (settings.terrainType == SandboxSettings.TERRAIN_LAND) {
				if (settings.size == SandboxSettings.SIZE_LARGE) {
					DrawGroundOutlineCircle(0, 0, 150);
					DrawGroundOutlineCircle(12000, 0, 150);
					var m:Matrix = new Matrix();
					m.createGradientBox(1, 300, Math.PI / 2, 0, 0);
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(144, -6, 12012, 312);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(150, 0, 12000, 300);
					sGround.graphics.endFill();
					DrawGroundCircle(0, 0, 150);
					DrawGroundCircle(12000, 0, 150);
					DrawRock(0, 169, 200, 40);
					DrawRock(0, 318, 44, 48);
					DrawRock(2, 795, 195, 28);
					DrawRock(0, 1110, 120, 40);
					DrawRock(2, 1440, 121, 69);
					DrawRock(0, 1762, 68, 57);
					DrawRock(1, 2082, 11, 68);
					DrawRock(0, 2395, 192, 51);
					DrawRock(0, 2727, 152, 39);
					DrawRock(0, 3032, 74, 61);
					DrawRock(1, 3196, 18, 46);
					DrawRock(0, 3527, 197, 28);
					DrawRock(0, 3842, 168, 18);
					DrawRock(1, 4003, 108, 23);
					DrawRock(2, 4325, 47, 68);
					DrawRock(0, 4641, 109, 50);
					DrawRock(1, 4806, 164, 27);
					DrawRock(2, 5110, 138, 16);
					DrawRock(2, 5287, 199, 45);
					DrawRock(2, 5447, 40, 68);
					DrawRock(1, 5605, 142, 22);
					DrawRock(2, 5769, 173, 54);
					DrawRock(0, 6075, 169, 15);
					DrawRock(1, 6401, 24, 41);
					DrawRock(0, 6569, 86, 59);
					DrawRock(0, 6885, 74, 29);
					DrawRock(2, 7200, 153, 15);
					DrawRock(0, 7354, 121, 32);
					DrawRock(2, 7722, 89, 61);
					DrawRock(1, 7946, 66, 19);
					DrawRock(2, 8325, 47, 68);
					DrawRock(0, 8641, 109, 50);
					DrawRock(1, 8806, 164, 27);
					DrawRock(2, 9110, 138, 16);
					DrawRock(2, 9287, 199, 45);
					DrawRock(2, 9447, 40, 68);
					DrawRock(1, 9605, 142, 22);
					DrawRock(2, 9769, 173, 54);
					DrawRock(0, 10075, 169, 15);
					DrawRock(1, 10401, 24, 41);
					DrawRock(0, 10569, 86, 59);
					DrawRock(0, 10885, 74, 29);
					DrawRock(2, 11200, 153, 15);
					DrawRock(0, 11354, 121, 32);
					DrawRock(2, 11722, 89, 61);
					DrawRock(1, 11946, 66, 19);
				} else if (settings.size == SandboxSettings.SIZE_MEDIUM) {
					DrawGroundOutlineCircle(0, 0, 150);
					DrawGroundOutlineCircle(8000, 0, 150);
					m = new Matrix();
					m.createGradientBox(1, 300, Math.PI / 2, 0, 0);
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(144, -6, 8012, 312);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(150, 0, 8000, 300);
					sGround.graphics.endFill();
					DrawGroundCircle(0, 0, 150);
					DrawGroundCircle(8000, 0, 150);
					DrawRock(0, 169, 200, 40);
					DrawRock(0, 318, 44, 48);
					DrawRock(2, 795, 195, 28);
					DrawRock(0, 1110, 120, 40);
					DrawRock(2, 1440, 121, 69);
					DrawRock(0, 1762, 68, 57);
					DrawRock(1, 2082, 11, 68);
					DrawRock(0, 2395, 192, 51);
					DrawRock(0, 2727, 152, 39);
					DrawRock(0, 3032, 74, 61);
					DrawRock(1, 3196, 18, 46);
					DrawRock(0, 3527, 197, 28);
					DrawRock(0, 3842, 168, 18);
					DrawRock(1, 4003, 108, 23);
					DrawRock(2, 4325, 47, 68);
					DrawRock(0, 4641, 109, 50);
					DrawRock(1, 4806, 164, 27);
					DrawRock(2, 5110, 138, 16);
					DrawRock(2, 5287, 199, 45);
					DrawRock(2, 5447, 40, 68);
					DrawRock(1, 5605, 142, 22);
					DrawRock(2, 5769, 173, 54);
					DrawRock(0, 6075, 169, 15);
					DrawRock(1, 6401, 24, 41);
					DrawRock(0, 6569, 86, 59);
					DrawRock(0, 6885, 74, 29);
					DrawRock(2, 7200, 153, 15);
					DrawRock(0, 7354, 121, 32);
					DrawRock(2, 7722, 89, 61);
					DrawRock(1, 7946, 66, 19);
				} else {
					DrawGroundOutlineCircle(0, 0, 150);
					DrawGroundOutlineCircle(4000, 0, 150);
					m = new Matrix();
					m.createGradientBox(1, 300, Math.PI / 2, 0, 0);
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(144, -6, 4012, 312);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(150, 0, 4000, 300);
					sGround.graphics.endFill();
					DrawGroundCircle(0, 0, 150);
					DrawGroundCircle(4000, 0, 150);
					DrawRock(0, 169, 200, 40);
					DrawRock(0, 318, 44, 48);
					DrawRock(2, 795, 195, 28);
					DrawRock(0, 1110, 120, 40);
					DrawRock(2, 1440, 121, 69);
					DrawRock(0, 1762, 68, 57);
					DrawRock(1, 2082, 11, 68);
					DrawRock(0, 2395, 192, 51);
					DrawRock(0, 2727, 152, 39);
					DrawRock(0, 3032, 74, 61);
					DrawRock(1, 3196, 18, 46);
					DrawRock(0, 3527, 197, 28);
					DrawRock(0, 3842, 168, 18);
				}
			} else if (settings.terrainType == SandboxSettings.TERRAIN_BOX) {
				if (settings.size == SandboxSettings.SIZE_LARGE) {
					m = new Matrix();
					m.createGradientBox(1, 1264, Math.PI / 2, 0, 0);
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 0, 500, 1264);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(3500, 0, 500, 1264);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 0, 4000, 200);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 1064, 4000, 200);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 0, 498.5, 1264);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(3501.5, 0, 498.5, 1264);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 0, 4000, 198.5);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 1065.5, 4000, 198.5);
					sGround.graphics.endFill();
					DrawRocksForBox(4000, 1264, 500, 200, 1.5);
				} else if (settings.size == SandboxSettings.SIZE_MEDIUM) {
					m = new Matrix();
					m.createGradientBox(1, 615, Math.PI / 2, 0, 0);
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 0, 400, 615);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(1600, 0, 400, 615);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 0, 2000, 100);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 515, 2000, 100);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 0, 399, 615);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(1601, 0, 399, 615);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 0, 2000, 99);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 516, 2000, 99);
					sGround.graphics.endFill();
					DrawRocksForBox(2000, 615, 400, 100, 1);
				} else {
					m = new Matrix();
					m.createGradientBox(1, 339, Math.PI / 2, 0, 0);
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 0, 200, 339);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(800, 0, 200, 339);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 0, 1000, 39);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 300, 1000, 39);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 0, 198, 339);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(802, 0, 198, 339);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 0, 1000, 37);
					sGround.graphics.endFill();
					sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
					sGround.graphics.drawRect(0, 302, 1000, 37);
					sGround.graphics.endFill();
					DrawRocksForBox(1000, 339, 200, 39, 2);
				}
			}

			addChild(sGround);
		}
		
		public function RefreshSandboxSettings():void {
			for (var i:int = 0; i < groundParts.length; i++) {
				allParts = Util.RemoveFromArray(groundParts[i], allParts);
			}
			for (i = 0; i < allParts.length; i++) {
				if (allParts[i] is TextPart) {
					try {
						removeChild(allParts[i].m_textField);
					} catch (arg:Error) {
						
					}
				}
			}
			groundParts = new Array();
			removeChild(sGround);
			sSky.Delete();
			removeChild(m_canvas);
			removeChild(uneditableText);
			removeChild(rotatingText);
			removeChild(scalingText);
			removeChild(boxText);
			removeChild(horizLineText);
			removeChild(vertLineText);
			removeChild(shapeText);
			removeChild(m_guiPanel);
			removeChild(m_sidePanel);
			removeChild(m_guiMenu);
			removeChild(m_fader);
			for (i = 0; i < m_buildAreas.length; i++) {
				removeChild(m_buildAreas[i]);
				removeChild(m_badBuildAreas[i]);
				removeChild(m_selectedBuildAreas[i]);
			}
			if (m_chooserWindow) {
				removeChild(m_chooserWindow);
				m_chooserWindow = null;
			}
			if (m_loginWindow) {
				removeChild(m_loginWindow);
				m_loginWindow = null;
			}
			if (m_newUserWindow) {
				removeChild(m_newUserWindow);
				m_newUserWindow = null;
			}
			if (m_scoreWindow) {
				removeChild(m_scoreWindow);
				m_scoreWindow = null;
			}
			if (m_progressDialog) {
				removeChild(m_progressDialog);
				m_progressDialog = null;
			}
			if (m_linkDialog) {
				removeChild(m_linkDialog);
				m_linkDialog = null;
			}
			if (m_tutorialDialog) {
				removeChild(m_tutorialDialog);
				m_tutorialDialog = null;
			}
			if (m_postReplayWindow) {
				removeChild(m_postReplayWindow);
				m_postReplayWindow = null;
			}
			if (m_rateDialog) {
				removeChild(m_rateDialog);
				m_rateDialog = null;
			}
			if (m_restrictionsDialog) {
				removeChild(m_restrictionsDialog);
				m_restrictionsDialog = null;
			}
			if (m_conditionsDialog) {
				removeChild(m_conditionsDialog);
				m_conditionsDialog = null;
			}
			if (m_sandboxWindow) {
				removeChild(m_sandboxWindow);
				m_sandboxWindow = null;
			}
			if (m_challengeWindow) {
				removeChild(m_challengeWindow);
				m_challengeWindow = null;
			}
			if (m_reportWindow) {
				removeChild(m_reportWindow);
				m_reportWindow = null;
			}
			if (m_loadWindow) {
				removeChild(m_loadWindow);
				m_loadWindow = null;
			}
			m_buildAreas = new Array();
			m_badBuildAreas = new Array();
			m_selectedBuildAreas = new Array();
			BuildGround();
			addChild(m_canvas);
			addChild(uneditableText);
			addChild(rotatingText);
			addChild(scalingText);
			addChild(boxText);
			addChild(horizLineText);
			addChild(vertLineText);
			addChild(shapeText);
			addChild(m_guiPanel);
			addChild(m_sidePanel);
			addChild(m_guiMenu);
			addChild(m_fader);
			for (i = 0; i < allParts.length; i++) {
				if (allParts[i] is TextPart) {
					if (allParts[i].inFront) {
						addChildAt(allParts[i].m_textField, getChildIndex(m_canvas) + 1);
					} else {
						addChildAt(allParts[i].m_textField, getChildIndex(m_canvas));
					}
				}
			}
			BuildBuildArea();
			redrawRobot = true;
			hasZoomed = true;
		}
		
		public override function GetMinX():Number {
			return (settings.size == SandboxSettings.SIZE_LARGE ? -280 : (settings.size == SandboxSettings.SIZE_MEDIUM ? -150 : -50));
		}
		
		public override function GetMaxX():Number {
			return (settings.size == SandboxSettings.SIZE_LARGE ? 280 : (settings.size == SandboxSettings.SIZE_MEDIUM ? 150 : 50));
		}
		
		public override function GetMinY():Number {
			return (settings.size == SandboxSettings.SIZE_LARGE ? -160 : (settings.size == SandboxSettings.SIZE_MEDIUM ? -100 : -30));
		}
		
		public override function GetMaxY():Number {
			if (settings.terrainType == SandboxSettings.TERRAIN_BOX) {
				return (settings.size == SandboxSettings.SIZE_SMALL ? 15 : 30);
			} else {
				return (settings.size == SandboxSettings.SIZE_LARGE ? 160 : (settings.size == SandboxSettings.SIZE_MEDIUM ? 100 : 40));
			}
		}
		
		protected override function GetGravity():b2Vec2 {
			return new b2Vec2(0.0, settings.gravity);
		}
		
		private function DrawGroundOutlineCircle(xPos:Number, yPos:Number, radius:Number):void {
			var m:Matrix = new Matrix();
			m.createGradientBox(1, radius * 2, Math.PI / 2, 0, 0);
			sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopOutlines[settings.terrainTheme], terrainBottomOutlines[settings.terrainTheme]], [1, 1], [0, 255], m);
			sGround.graphics.drawCircle(xPos + radius, yPos + radius, radius + 6);
			sGround.graphics.endFill();
		}
		
		private function DrawGroundCircle(xPos:Number, yPos:Number, radius:Number):void {
			var m:Matrix = new Matrix();
			m.createGradientBox(1, radius * 2, Math.PI / 2, 0, 0);
			sGround.graphics.beginGradientFill(GradientType.LINEAR, [terrainTopColours[settings.terrainTheme], terrainBottomColours[settings.terrainTheme]], [1, 1], [0, 255], m);
			sGround.graphics.drawCircle(xPos + radius, yPos + radius, radius);
			sGround.graphics.endFill();
		}
		
		private function DrawRock(type:int, xPos:Number, yPos:Number, radius:Number, outlineThickness:Number = 6):void {
			sGround.graphics.lineStyle(outlineThickness, rockOutlines[settings.terrainTheme]);
			var m:Matrix = new Matrix();
			m.createGradientBox(radius * 2, radius * 2, Math.PI / 2, xPos, yPos);
			sGround.graphics.beginGradientFill(GradientType.LINEAR, (type == 0 ? [rock1TopColours[settings.terrainTheme], rock1BottomColours[settings.terrainTheme]] : (type == 1 ? [rock2TopColours[settings.terrainTheme], rock2BottomColours[settings.terrainTheme]] : [rock3TopColours[settings.terrainTheme], rock3BottomColours[settings.terrainTheme]])), [1, 1], [0, 255], m);
			sGround.graphics.drawCircle(xPos + radius, yPos + radius, radius);
			sGround.graphics.endFill();
		}
		
		private function DrawRocksForBox(width:int, height:int, thicknessX:int, thicknessY:int, outlineThickness:Number):void {
			var numRocks:int = (width == 1000 ? 60 : (width == 2000 ? 200 : 500));
			var rockPositions:Array = new Array();
			for (var i:int = 0; i < numRocks; i++) {
				var rockPosition:b2Vec2;
				var badPosition:Boolean;
				do {
					badPosition = false;
					rockPosition = Util.Vector(Util.RangedRandom(0, width), Util.RangedRandom(0, height));
					if ((rockPosition.x > thicknessX - 32 && rockPosition.x < width - thicknessX + 2 && rockPosition.y > thicknessY - 32 && rockPosition.y < height - thicknessY + 2) || rockPosition.x > width - 32 || rockPosition.y > height - 32) {
						badPosition = true;
					} else {
						for (var j:int = 0; j < rockPositions.length; j++) {
							if (Util.GetDist(rockPosition.x, rockPosition.y, rockPositions[j].x, rockPositions[j].y) < 32) {
								badPosition = true;
								break;
							}
						}
					}
				} while (badPosition);
				rockPositions.push(rockPosition);
				DrawRock(Util.RangedRandom(0, 3), rockPosition.x, rockPosition.y, Util.RangedRandom(5, 15), outlineThickness);
			}
		}
		
		public virtual override function Update():void {
			super.Update();
			sSky.Update(hasZoomed, hasPanned);
			
			if (settings.terrainType == SandboxSettings.TERRAIN_LAND) {
				if (settings.size == SandboxSettings.SIZE_LARGE) {
					if (hasZoomed) {
						sGround.width = World2ScreenX(507.7) - World2ScreenX(0);
						sGround.scaleY = sGround.scaleX;
					}
					if (hasZoomed || hasPanned) {
						sGround.x = World2ScreenX(-253.55);
						sGround.y = World2ScreenY(12.06);
					}
				} else if (settings.size == SandboxSettings.SIZE_MEDIUM) {
					if (hasZoomed) {
						sGround.width = World2ScreenX(247.2) - World2ScreenX(0);
						sGround.scaleY = sGround.scaleX;
					}
					if (hasZoomed || hasPanned) {
						sGround.x = World2ScreenX(-123.45);
						sGround.y = World2ScreenY(12.06);
					}
				} else {
					if (hasZoomed) {
						sGround.width = World2ScreenX(85) - World2ScreenX(0);
						sGround.scaleY = sGround.scaleX;
					}
					if (hasZoomed || hasPanned) {
						sGround.x = World2ScreenX(-42.36);
						sGround.y = World2ScreenY(12.06);
					}
				}
			} else if (settings.terrainType == SandboxSettings.TERRAIN_BOX) {
				if (settings.size == SandboxSettings.SIZE_LARGE) {
					if (hasZoomed) {
						sGround.width = World2ScreenX(693) - World2ScreenX(0);
						sGround.scaleY = sGround.scaleX;
					}
					if (hasZoomed || hasPanned) {
						sGround.x = World2ScreenX(-346.5);
						sGround.y = World2ScreenY(-174.5);
					}
				} else if (settings.size == SandboxSettings.SIZE_MEDIUM) {
					if (hasZoomed) {
						sGround.width = World2ScreenX(432.5) - World2ScreenX(0);
						sGround.scaleY = sGround.scaleX;
					}
					if (hasZoomed || hasPanned) {
						sGround.x = World2ScreenX(-216.25);
						sGround.y = World2ScreenY(-101.45);
					}
				} else {
					if (hasZoomed) {
						sGround.width = World2ScreenX(132.85) - World2ScreenX(0);
						sGround.scaleY = sGround.scaleX;
					}
					if (hasZoomed || hasPanned) {
						sGround.x = World2ScreenX(-66.42);
						sGround.y = World2ScreenY(-30);
					}
				}
			}
			if (!(this is ControllerMonkeyBars || this is ControllerClimb || this is ControllerRace || this is ControllerSpaceship)) {
				hasPanned = false;
				hasZoomed = false;
			}
		}
		
		protected virtual override function GetBuildingArea():b2AABB {
			var area:b2AABB = new b2AABB();
			area.lowerBound.Set(-300, -200);
			area.upperBound.Set(300, 200);
			return area;
		}
		
		protected virtual override function NumBuildingAreas():int {
			return 0;
		}
		
		protected virtual override function ChallengeOver():Boolean {
			return false;
		}
		
		public virtual override function GetScore():int {
			return 10000;
		}
		
		public override function submitButton(e:MouseEvent):void {
			if (m_scoreWindow && m_scoreWindow.visible) m_scoreWindow.ShowFader();
			ShowDisabledDialog();
		}
	}
}