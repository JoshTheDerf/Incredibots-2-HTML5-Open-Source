package Game.Challenges
{
	import Box2D.Collision.b2AABB;
	
	import Game.*;
	import Game.Graphics.*;
	
	import General.LSOManager;
	
	import Parts.*;
	
	import flash.display.*;
	import flash.events.*;
	import flash.geom.Matrix;

	public class ControllerMonkeyBars extends ControllerChallenge
	{	
		private var sGround1:Sprite;
		private var sGround2:Sprite;
		
		public function ControllerMonkeyBars()
		{
			draw.m_drawXOff = 0;
			draw.m_drawYOff = -190;
			
			playChallengeMode = true;
			playOnlyMode = true;
			
			var cond:WinCondition = new WinCondition("Cond", 2, 1);
			cond.minY = 11;
			cond.maxY = 11;
			challenge.winConditions.push(cond);
			cond = new WinCondition("Cond", 2, 4);
			cond.minX = 44;
			cond.maxX = 44;
			challenge.winConditions.push(cond);
			challenge.cannonsAllowed = false;
			challenge.thrustersAllowed = false;
			challenge.mouseDragAllowed = false;
			challenge.winConditionsAnded = true;
			var buildArea:b2AABB = new b2AABB();
			buildArea.lowerBound.Set(1, 1);
			buildArea.upperBound.Set(15, 11.1);
			challenge.buildAreas.push(buildArea);
			BuildBuildArea();
			
			var p:Part;
			p = new Rectangle(1, 11, 14.02, 1, false);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Rectangle(40.65, 11, 20, 1, false);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			for (var i:int = 0; i < 9; i++) {
				p = new Circle(15.52 + i * 2.955, 5.27, 0.15, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				allParts.push(p);
			}
			p = new Circle(15.65, 12.47, 1.35, false);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(13.95, 13.54, 1.8, false);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(11.6, 15.5, 2.85, false);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(40.11, 12.27, 1.35, false);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(43, 14.75, 2.85, false);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(1.51, 11.5, -0.51, 10.15, -5, 10);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(-0.51, 10.15, -1.54, 8.36, -5, 10);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(-1.54, 8.36, -1.51, 6.08, -5, 10);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(-1.51, 6.08, -3.16, 4.18, -5, 10);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(-3.16, 4.18, -2.06, 1.55, -5, -2);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(-2.06, 1.55, -0.25, 0.91, -5, -2);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(-0.25, 0.91, 1.02, -0.26, -5, -2);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(1.02, -0.26, 1.39, -2.05, -5, -2);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(1.39, -2.05, 3.63, -2.58, 5, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(3.63, -2.58, 4.56, -2.15, 5, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(4.56, -2.15, 4.87, -1.35, 5, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(4.87, -1.35, 5.3, -1.08, 5, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(5.3, -1.08, 5.69, -1.45, 5, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(5.69, -1.45, 5.88, -2.19, 5, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(5.88, -2.19, 6.41, -2.83, 5, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(6.41, -2.83, 7.62, -2.52, 10, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(7.62, -2.52, 8.32, -1.53, 10, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(8.32, -1.53, 8.76, 0, 10, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(8.76, 0, 9.19, -0.32, 10, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(9.19, -0.32, 9.56, -1.68, 10, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(9.56, -1.68, 10.54, -2.17, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(10.54, -2.17, 11.9, -1.41, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(11.9, -1.41, 12.36, -0.26, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(12.36, -0.26, 13.75, 0.57, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(13.75, 0.57, 14.78, 1.6, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(14.78, 1.6, 14.68, 2.61, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(14.68, 2.61, 15.4, 3.72, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(15.4, 3.72, 15.98, 3.78, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(15.98, 3.78, 16.37, 3.18, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(16.37, 3.18, 16.84, 2.07, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(16.84, 2.07, 17.02, -0.07, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(17.02, -0.07, 16.65, -1.88, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(16.65, -1.88, 17.13, -4.02, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(17.13, -4.02, 17.7, -5.09, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(17.7, -5.09, 17.58, -6.9, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(17.58, -6.9, 16.65, -7.9, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(16.65, -7.9, 16, -9.65, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(16, -9.65, 14.1, -10.95, 14, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			
			p = new Triangle(45.5, 1.95, 44.57, 1.43, 42, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(44.57, 1.43, 43.81, 0.2, 42, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(43.81, 0.2, 43.19, 0.57, 42, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(43.19, 0.57, 42.1, 0.18, 42, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(42.1, 0.18, 41.4, -1.53, 42, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(41.4, -1.53, 40.74, -2.21, 42, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(40.74, -2.21, 40.31, -5.11, 42, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(40.31, -5.11, 41.28, -6.61, 42, -5);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(41.28, -6.61, 40.91, -7.91, 44, -10);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(40.91, -7.91, 40.24, -8.75, 44, -10);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(40.24, -8.75, 40.94, -10.15, 44, -10);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Triangle(40.94, -10.15, 41.14, -11.15, 44, -10);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Rectangle(41.14, -31, 1, 20, false);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			
			sGround1 = new Sprite();
			sGround2 = new Sprite();
			
			// cave walls
			sGround1.graphics.lineStyle(6, 0x889598, 1);
			var m:Matrix = new Matrix();
			m.createGradientBox(3786, 1110, Math.PI / 2, 981, 279);
			sGround1.graphics.beginGradientFill(GradientType.LINEAR, [0xB6C6CA, 0x9AA9AD], [1, 1], [0, 255], m);
			sGround1.graphics.moveTo(1101, 1364);
			sGround1.graphics.lineTo(1085, 1294);
			sGround1.graphics.lineTo(1035, 1207);
			sGround1.graphics.lineTo(1011, 1049);
			sGround1.graphics.lineTo(981, 971);
			sGround1.graphics.lineTo(1014, 845);
			sGround1.graphics.lineTo(1058, 770);
			sGround1.graphics.lineTo(1050, 663);
			sGround1.graphics.lineTo(1077, 614);
			sGround1.graphics.lineTo(1184, 544);
			sGround1.graphics.lineTo(1202, 506);
			sGround1.graphics.lineTo(1269, 500);
			sGround1.graphics.lineTo(1356, 398);
			sGround1.graphics.lineTo(1554, 347);
			sGround1.graphics.lineTo(1746, 372);
			sGround1.graphics.lineTo(1926, 353);
			sGround1.graphics.lineTo(2062, 296);
			sGround1.graphics.lineTo(2193, 305);
			sGround1.graphics.lineTo(2281, 365);
			sGround1.graphics.lineTo(2310, 449);
			sGround1.graphics.lineTo(2352, 495);
			sGround1.graphics.lineTo(2358, 583);
			sGround1.graphics.lineTo(2330, 635);
			sGround1.graphics.lineTo(2307, 739);
			sGround1.graphics.lineTo(2325, 827);
			sGround1.graphics.lineTo(2316, 931);
			sGround1.graphics.lineTo(2293, 985);
			sGround1.graphics.lineTo(2274, 1014);
			sGround1.graphics.lineTo(2246, 1011);
			sGround1.graphics.lineTo(2211, 957);
			sGround1.graphics.lineTo(2216, 908);
			sGround1.graphics.lineTo(2166, 858);
			sGround1.graphics.lineTo(2098, 818);
			sGround1.graphics.lineTo(2076, 762);
			sGround1.graphics.lineTo(2010, 725);
			sGround1.graphics.lineTo(1962, 749);
			sGround1.graphics.lineTo(1944, 815);
			sGround1.graphics.lineTo(1923, 831);
			sGround1.graphics.lineTo(1902, 756);
			sGround1.graphics.lineTo(1868, 708);
			sGround1.graphics.lineTo(1809, 693);
			sGround1.graphics.lineTo(1783, 724);
			sGround1.graphics.lineTo(1774, 760);
			sGround1.graphics.lineTo(1755, 778);
			sGround1.graphics.lineTo(1734, 765);
			sGround1.graphics.lineTo(1719, 726);
			sGround1.graphics.lineTo(1674, 705);
			sGround1.graphics.lineTo(1566, 731);
			sGround1.graphics.lineTo(1548, 818);
			sGround1.graphics.lineTo(1486, 875);
			sGround1.graphics.lineTo(1398, 906);
			sGround1.graphics.lineTo(1345, 1034);
			sGround1.graphics.lineTo(1425, 1126);
			sGround1.graphics.lineTo(1424, 1237);
			sGround1.graphics.lineTo(1473, 1324);
			sGround1.graphics.lineTo(1571, 1389);
			sGround1.graphics.lineTo(1300, 1500);
			sGround1.graphics.lineTo(1101, 1364);
			sGround1.graphics.endFill();
			
			sGround2.graphics.lineStyle(6, 0x889598, 1);
			sGround2.graphics.beginGradientFill(GradientType.LINEAR, [0xB6C6CA, 0x9AA9AD], [1, 1], [0, 255], m);
			sGround2.graphics.moveTo(4167, 1380);
			sGround2.graphics.lineTo(4293, 1324);
			sGround2.graphics.lineTo(4322, 1252);
			sGround2.graphics.lineTo(4374, 1198);
			sGround2.graphics.lineTo(4421, 1184);
			sGround2.graphics.lineTo(4344, 1127);
			sGround2.graphics.lineTo(4349, 1026);
			sGround2.graphics.lineTo(4293, 901);
			sGround2.graphics.lineTo(4216, 855);
			sGround2.graphics.lineTo(4172, 769);
			sGround2.graphics.lineTo(4104, 765);
			sGround2.graphics.lineTo(4068, 746);
			sGround2.graphics.lineTo(3993, 744);
			sGround2.graphics.lineTo(3963, 726);
			sGround2.graphics.lineTo(3919, 761);
			sGround2.graphics.lineTo(3871, 847);
			sGround2.graphics.lineTo(3834, 863);
			sGround2.graphics.lineTo(3807, 818);
			sGround2.graphics.lineTo(3765, 800);
			sGround2.graphics.lineTo(3732, 865);
			sGround2.graphics.lineTo(3733, 915);
			sGround2.graphics.lineTo(3714, 925);
			sGround2.graphics.lineTo(3669, 900);
			sGround2.graphics.lineTo(3632, 840);
			sGround2.graphics.lineTo(3602, 858);
			sGround2.graphics.lineTo(3549, 839);
			sGround2.graphics.lineTo(3515, 756);
			sGround2.graphics.lineTo(3483, 723);
			sGround2.graphics.lineTo(3462, 582);
			sGround2.graphics.lineTo(3509, 509);
			sGround2.graphics.lineTo(3492, 450);
			sGround2.graphics.lineTo(3459, 405);
			sGround2.graphics.lineTo(3495, 335);
			sGround2.graphics.lineTo(3503, 291);
			sGround2.graphics.lineTo(3587, 279);
			sGround2.graphics.lineTo(3778, 335);
			sGround2.graphics.lineTo(3927, 305);
			sGround2.graphics.lineTo(4007, 350);
			sGround2.graphics.lineTo(4162, 347);
			sGround2.graphics.lineTo(4217, 386);
			sGround2.graphics.lineTo(4253, 356);
			sGround2.graphics.lineTo(4434, 437);
			sGround2.graphics.lineTo(4541, 537);
			sGround2.graphics.lineTo(4625, 561);
			sGround2.graphics.lineTo(4716, 685);
			sGround2.graphics.lineTo(4700, 760);
			sGround2.graphics.lineTo(4725, 909);
			sGround2.graphics.lineTo(4767, 948);
			sGround2.graphics.lineTo(4753, 1109);
			sGround2.graphics.lineTo(4710, 1195);
			sGround2.graphics.lineTo(4716, 1304);
			sGround2.graphics.lineTo(4400, 1500);
			sGround2.graphics.lineTo(4167, 1380);
			sGround2.graphics.endFill();
			
			// cave rocks
			sGround1.graphics.lineStyle(0, 0, 0);
			sGround2.graphics.lineStyle(0, 0, 0);
			DrawCaveRock(1324, 1148, 1271, 1260, 1370, 1313);
			DrawCaveRock(1134, 1040, 1099, 1148, 1295, 1130);
			DrawCaveRock(1214, 770, 1334, 759, 1315, 869);
			DrawCaveRock(1141, 638, 1289, 554, 1262, 667);
			DrawCaveRock(1350, 514, 1400, 496, 1412, 582);
			DrawCaveRock(1472, 650, 1554, 581, 1552, 653);
			DrawCaveRock(1686, 506, 1824, 441, 1787, 630);
			DrawCaveRock(1900, 503, 1842, 613, 1945, 667);
			DrawCaveRock(1997, 352, 2133, 391, 2072, 433);
			DrawCaveRock(2121, 633, 2279, 607, 2266, 694);
			DrawCaveRock(2137, 764, 2186, 746, 2198, 832);
			DrawCaveRock(3559, 714, 3662, 738, 3604, 780);
			DrawCaveRock(3589, 429, 3671, 361, 3668, 435);
			DrawCaveRock(3674, 605, 3811, 540, 3776, 729);
			DrawCaveRock(3909, 493, 3965, 380, 4010, 543);
			DrawCaveRock(4058, 631, 4242, 620, 4179, 688);
			DrawCaveRock(4163, 497, 4297, 540, 4261, 436);
			DrawCaveRock(4406, 649, 4440, 538, 4603, 629);
			DrawCaveRock(4416, 866, 4518, 890, 4459, 932);
			DrawCaveRock(4514, 807, 4675, 782, 4661, 870);
			DrawCaveRock(4432, 1054, 4579, 1024, 4502, 1199);
			DrawCaveRock(4639, 1063, 4688, 1045, 4701, 1130);
			DrawCaveRock(4362, 1318, 4443, 1249, 4440, 1321);

			// main ground
			// outlines
			sGround2.graphics.beginFill(0x2DA12E);
			sGround2.graphics.drawRect(3477, 1369, 1083, 197);
			sGround2.graphics.endFill();
			DrawGroundOutlineCircle(1029, 1353, 63);
			DrawGroundOutlineCircle(2201, 1377, 63);
			DrawGroundOutlineCircle(3393, 1368, 63);
			DrawGroundOutlineCircle(4472, 1323, 63);
			DrawGroundOutlineCircle(1593, 1665, 63);
			DrawGroundOutlineCircle(1908, 1644, 63);
			DrawGroundOutlineCircle(2104, 1416, 80);
			DrawGroundOutlineCircle(4565, 1278, 104);
			DrawGroundOutlineCircle(4313, 1530, 104);
			DrawGroundOutlineCircle(3855, 1491, 104);
			DrawGroundOutlineCircle(3804, 1578, 104);
			DrawGroundOutlineCircle(4425, 1380, 138);
			DrawGroundOutlineCircle(3650, 1403, 138);
			DrawGroundOutlineCircle(3460, 1413, 138);
			DrawGroundOutlineCircle(1898, 1374, 138);
			DrawGroundOutlineCircle(1106, 1326, 138);
			DrawGroundOutlineCircle(1234, 1410, 138);
			DrawGroundOutlineCircle(1927, 1449, 138);
			DrawGroundOutlineCircle(1359, 1383, 189);
			DrawGroundOutlineCircle(1591, 1390, 189);
			DrawGroundOutlineCircle(3978, 1446, 189);	
			
			// body
			m = new Matrix();
			m.createGradientBox(3744, 546, Math.PI / 2, 1029, 1278);
			sGround1.graphics.beginGradientFill(GradientType.LINEAR, [0x6BD354, 0x54BA3D], [1, 1], [0, 255], m);
			sGround1.graphics.drawRect(1550, 1391, 600, 100);
			sGround1.graphics.endFill();
			sGround2.graphics.beginGradientFill(GradientType.LINEAR, [0x6BD354, 0x54BA3D], [1, 1], [0, 255], m);
			sGround2.graphics.drawRect(3483, 1375, 1071, 185);
			sGround2.graphics.endFill();
			DrawGroundCircle(1029, 1353, 63);
			DrawGroundCircle(2201, 1377, 63);
			DrawGroundCircle(3393, 1368, 63);
			DrawGroundCircle(4472, 1323, 63);
			DrawGroundCircle(1593, 1665, 63);
			DrawGroundCircle(1908, 1644, 63);
			DrawGroundCircle(2104, 1416, 80);
			DrawGroundCircle(4565, 1278, 104);
			DrawGroundCircle(4313, 1530, 104);
			DrawGroundCircle(3855, 1491, 104);
			DrawGroundCircle(3804, 1578, 104);
			DrawGroundCircle(4425, 1380, 138);
			DrawGroundCircle(3650, 1403, 138);
			DrawGroundCircle(3460, 1413, 138);
			DrawGroundCircle(1898, 1374, 138);
			DrawGroundCircle(1106, 1326, 138);
			DrawGroundCircle(1234, 1410, 138);
			DrawGroundCircle(1927, 1449, 138);
			DrawGroundCircle(1359, 1383, 189);
			DrawGroundCircle(1591, 1390, 189);
			DrawGroundCircle(3978, 1446, 189);			
			
			// rocks
			DrawRock(1, 1380, 1488, 35);
			DrawRock(2, 2095, 1559, 35);
			DrawRock(2, 3604, 1484, 35);
			DrawRock(1, 4206, 1698, 35);
			DrawRock(0, 4472, 1446, 35);
			DrawRock(2, 1152, 1420, 43.5);
			DrawRock(0, 1572, 1637, 43.5);
			DrawRock(2, 1954, 1471, 43.5);
			DrawRock(1, 3992, 1453, 43.5);
			DrawRock(1, 4257, 1453, 52);
			DrawRock(2, 3812, 1511, 69);
			DrawRock(1, 1739, 1454, 69);

			// monkey bars
			sGround1.graphics.lineStyle(6, 0x71848D, 1);
			sGround1.graphics.beginFill(0xC4CED4);
			for (i = 0; i < 9; i++) {
				sGround1.graphics.drawCircle(2257 + i * 144, 1089, 8);
			}
			sGround1.graphics.endFill();
			
			// start and end platforms
			sGround1.graphics.lineStyle(6, 0x9D8941);
			sGround1.graphics.beginFill(0xCEB456);
			sGround1.graphics.drawRect(1550, 1368, 683, 56);
			sGround1.graphics.endFill();
			
			sGround2.graphics.lineStyle(6, 0x9D8941);
			sGround2.graphics.beginFill(0xCEB456);
			sGround2.graphics.drawRect(3510, 1368, 930, 56);
			sGround2.graphics.endFill();
			
			sGround1.cacheAsBitmap = true;
			sGround2.cacheAsBitmap = true;
			addChild(sGround1);
			addChild(sGround2);
		}
		
		public override function Init(e:Event):void {
			super.Init(e);
			if (!viewingUnsavedReplay) ShowTutorialDialog(107, true);
		}
		
		public override function CloseTutorialDialog(num:int):void {
			if (num == 107) {
				ShowTutorialDialog(64);
			} else {
				super.CloseTutorialDialog(num);
			}
		}
		
		private function ShowTutorialDialog(num:int, moreButton:Boolean = false):void {
			ShowTutorialWindow(num, 276, 130, moreButton);
		}
		
		public function DrawGroundOutlineCircle(xPos:Number, yPos:Number, radius:Number):void {
			var sGround:Sprite = (xPos < 3000 ? sGround1 : sGround2);
			sGround.graphics.beginFill(0x2DA12E);
			sGround.graphics.drawCircle(xPos + radius, yPos + radius, radius + 6);
			sGround.graphics.endFill();
		}
		
		public function DrawGroundCircle(xPos:Number, yPos:Number, radius:Number):void {
			var sGround:Sprite = (xPos < 3000 ? sGround1 : sGround2);
			var m:Matrix = new Matrix();
			m.createGradientBox(3744, 546, Math.PI / 2, 1029, 1278);
			sGround.graphics.beginGradientFill(GradientType.LINEAR, [0x6BD354, 0x54BA3D], [1, 1], [0, 255], m);
			sGround.graphics.drawCircle(xPos + radius, yPos + radius, radius);
			sGround.graphics.endFill();
		}
		
		public function DrawCaveRock(x1:Number, y1:Number, x2:Number, y2:Number, x3:Number, y3:Number):void {
			var sGround:Sprite = (x1 < 3000 ? sGround1 : sGround2);
			var m:Matrix = new Matrix();
			m.createGradientBox(3602, 969, Math.PI / 2, 1099, 352);
			sGround.graphics.beginGradientFill(GradientType.LINEAR, [0xAAB9BD, 0x95A1A5], [1, 1], [0, 255], m);
			sGround.graphics.moveTo(x1, y1);
			sGround.graphics.lineTo(x2, y2);
			sGround.graphics.lineTo(x3, y3);
			sGround.graphics.lineTo(x1, y1);
			sGround.graphics.endFill();
		}
		
		public function DrawRock(type:int, xPos:Number, yPos:Number, radius:Number):void {
			var sGround:Sprite = (xPos < 3000 ? sGround1 : sGround2);
			sGround.graphics.lineStyle(6, 0x6BB05A);
			var m:Matrix = new Matrix();
			m.createGradientBox(radius * 2, radius * 2, Math.PI / 2, xPos, yPos);
			sGround.graphics.beginGradientFill(GradientType.LINEAR, (type == 0 ? [0x8EDB82, 0x7FBF72] : (type == 1 ? [0x80D970, 0x6DBE5D] : [0x70C160, 0x63AB52])), [1, 1], [0, 255], m);
			sGround.graphics.drawCircle(xPos + radius, yPos + radius, radius);
			sGround.graphics.endFill();
		}
		
		public override function GetMinX():Number {
			return -15;
		}
		
		public override function GetMaxX():Number {
			return 72;
		}
		
		public override function GetMinY():Number {
			return -20;
		}
		
		public override function GetMaxY():Number {
			return 25;
		}
		
		public override function Update():void {
			super.Update();
			sSky.Update(hasZoomed, hasPanned);
			
			if (hasZoomed) {
				sGround1.width = World2ScreenX(50.11) - World2ScreenX(0);
				sGround1.scaleY = sGround1.scaleX;
				sGround2.scaleX = sGround1.scaleX;
				sGround2.scaleY = sGround2.scaleX;
			}
			if (hasZoomed || hasPanned) {
				sGround1.visible = (World2ScreenX(40) > 0);
				sGround2.visible = (World2ScreenX(38) < 800);
				if (sGround1.visible) {
					sGround1.x = World2ScreenX(-30.8);
					sGround1.y = World2ScreenY(-17.08);
				}
				if (sGround2.visible) {
					sGround2.x = World2ScreenX(-30.8);
					sGround2.y = World2ScreenY(-17.08);
				}
			}
			hasPanned = false;
			hasZoomed = false;
		}
		
		public override function saveButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function saveReplayButton(e:MouseEvent):void {
			ShowDisabledDialog();
			if (m_scoreWindow && m_scoreWindow.visible) m_scoreWindow.ShowFader();
		}

		public override function submitButton(e:MouseEvent):void {
			ShowDisabledDialog();
			if (m_scoreWindow && m_scoreWindow.visible) m_scoreWindow.ShowFader();
		}
		
		public override function commentButton(e:MouseEvent, robotID:String = "", robotPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function linkButton(e:MouseEvent, robotID:String = "", robotPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function embedButton(e:MouseEvent, robotID:String = "", robotPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function commentReplayButton(e:MouseEvent, replayID:String = "", replayPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function linkReplayButton(e:MouseEvent, replayID:String = "", replayPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function embedReplayButton(e:MouseEvent, replayID:String = "", replayPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
	}
}