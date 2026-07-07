// Renderer-only static challenge-terrain visual — a faithful, verbatim port of
// the decorative `sGround` Graphics built by the two hardcoded built-in
// challenge controllers:
//   - Climb:       src/Game/Challenges/ControllerClimb.ts (constructor :53-204,
//                  DrawGroundCircle/DrawRock helpers :224-243, Update :261-273)
//   - Monkey Bars: src/Game/Challenges/ControllerMonkeyBars.ts (constructor
//                  :346-581, DrawGroundOutlineCircle/DrawGroundCircle/DrawCaveRock/
//                  DrawRock helpers :601-639, Update :657-681)
//
// Each legacy controller builds its grass/dirt/rock landscape ONCE into one (Climb)
// or two (Monkey Bars) Graphics in a LOCAL pixel space, adds them to the display
// list, then every frame:
//   - sets sGround.width = World2ScreenX(W) - World2ScreenX(0) (Pixi then computes
//     scale.x = targetWidthPx / localContentWidth), copies scale.y = scale.x (and
//     for Monkey Bars copies that uniform scale onto sGround2);
//   - sets each sGround.x/y = World2Screen(anchor);
//   - applies visibility culling against the stage width (800 in the legacy Flash
//     stage; the LIVE canvasW here since the port is responsive).
// The collision geometry (the rects/circles/triangles pushed into the parts graph
// with drawAnyway=false) is separate and intentionally NOT drawn here; this module
// is the purely-cosmetic landscape that sits over it.
//
// Follows tutorialGroundRenderer.ts's conventions: a public `view` Container, a
// build(builtIn) that draws the geometry for the active challenge (rebuilding when
// it changes, keyed on the built-in name), update(camera, canvasW, canvasH) that
// repositions/rescales each frame, and destroy(). Imports only pixi + the Gradient
// helper + core types, exactly like tutorialGroundRenderer. `cacheAsBitmap` (a
// perf-only Flash hint) is omitted — not available in Pixi 8.

import { Container, Graphics, Matrix, Texture } from "pixi.js";
import { Gradient } from "../../Game/Graphics/Gradient";
import type { CameraState, BuiltInChallengeId } from "../../core";
import { worldToScreenX as w2sX, worldToScreenY as w2sY } from "./sceneRenderer";

export class ChallengeGroundRenderer {
	/** The container GameCanvas mounts (above the sandbox ground, below the Draw sprite). */
	public readonly view: Container = new Container();

	/** Which built-in's geometry is currently built (keys the rebuild, like groundRenderer keys on settings). */
	private builtKey: BuiltInChallengeId = null;

	// Climb uses a single sGround; Monkey Bars uses sGround1 + sGround2.
	private sGround: Graphics | null = null;
	private sGround1: Graphics | null = null;
	private sGround2: Graphics | null = null;

	// Climb reuses one gradient texture for the whole main ground fill.
	private climbGroundTex: Texture | null = null;

	/**
	 * (Re)build the decorative Graphics for the active built-in. Cheap no-op when
	 * the requested built-in matches what's already built; rebuilds (tearing down
	 * the old Graphics) on change; clears everything for null / a non-terrain
	 * built-in (race/spaceship draw via the sandbox GroundRenderer).
	 */
	build(builtIn: BuiltInChallengeId): void {
		if (builtIn === this.builtKey) return;
		this.clearGraphics();
		this.builtKey = builtIn;
		if (builtIn === "climb") this.buildClimb();
		else if (builtIn === "monkeyBars") this.buildMonkeyBars();
	}

	private clearGraphics(): void {
		this.view.removeChildren();
		this.sGround?.destroy();
		this.sGround1?.destroy();
		this.sGround2?.destroy();
		this.sGround = null;
		this.sGround1 = null;
		this.sGround2 = null;
		this.climbGroundTex = null;
	}

	// =====================================================================
	// CLIMB — verbatim port of ControllerClimb.ts constructor (:53-204).
	// =====================================================================

	/** ControllerClimb.DrawGroundCircle (:224-229). */
	private climbDrawGroundCircle(xPos: number, yPos: number, radius: number): void {
		const m = new Matrix();
		m.scale(1, 2000 / 255);
		this.sGround!.circle(xPos, yPos, radius);
		this.sGround!.fill({ texture: this.climbGroundTex!, matrix: m });
	}

	/** ControllerClimb.DrawRock (:231-243). */
	private climbDrawRock(type: number, xPos: number, yPos: number, radius: number): void {
		const m = new Matrix();
		m.translate(0, yPos);
		this.sGround!.circle(xPos - 270 + radius, yPos + radius, radius);
		this.sGround!.fill({
			texture: Gradient.getLinearGradientTexture(
				type == 0 ? ["#8EDB82", "#7FBF72"] : type == 1 ? ["#80D970", "#6DBE5D"] : ["#70C160", "#63AB52"],
				radius * 2,
			),
			matrix: m,
		});
		this.sGround!.stroke({ width: 6, color: 0x6bb05a });
	}

	private buildClimb(): void {
		this.climbGroundTex = Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"], 255);
		this.sGround = new Graphics();

		// bg layer 3
		// outlines
		this.sGround.circle(266, 1640, 195);
		this.sGround.circle(932, 1881, 195);
		this.sGround.fill(0x007360);
		this.sGround.circle(608, 1811, 258);
		this.sGround.fill(0x007360);

		// body
		this.sGround.circle(266, 1640, 189);
		this.sGround.circle(932, 1881, 189);
		this.sGround.fill(0x34a97f);
		this.sGround.circle(608, 1811, 252);
		this.sGround.fill(0x34a97f);

		// bg layer 2
		// outlines
		this.sGround.circle(1166, 1853, 129);
		this.sGround.circle(1979, 1721, 258);
		this.sGround.fill(0x007a47);
		this.sGround.circle(1435, 1871, 195);
		this.sGround.fill(0x007a47);

		// body
		this.sGround.circle(1166, 1853, 123);
		this.sGround.circle(1979, 1721, 252);
		this.sGround.fill(0x36ae66);
		this.sGround.circle(1435, 1871, 189);
		this.sGround.fill(0x36ae66);

		// bg layer 1
		// outlines
		this.sGround.circle(750, 1756, 195);
		this.sGround.circle(1745, 1871, 195);
		this.sGround.circle(2210, 1676, 195);
		this.sGround.circle(2432, 1267, 195);
		this.sGround.fill(0x00862c);
		this.sGround.circle(1431, 1615, 337);
		this.sGround.fill(0x00862c);

		// body
		this.sGround.circle(750, 1756, 189);
		this.sGround.circle(1745, 1871, 189);
		this.sGround.circle(2210, 1676, 189);
		this.sGround.circle(2432, 1267, 189);
		this.sGround.fill(0x3eba50);
		this.sGround.circle(1431, 1615, 331);
		this.sGround.fill(0x3eba50);

		// main ground and stairs
		// outlines
		for (let i = 0; i < 29; i++) {
			this.sGround.rect(1989 - i * 47.45, 301 + i * 35.6, 378 + i * 47.45, 35.6);
		}
		this.sGround.fill(0x2da12e);
		this.sGround.rect(-6, 1333.4, 2405, 238.6);
		this.sGround.fill(0x2da12e);

		// circle ground
		this.sGround.circle(237, 1560, 86);
		this.sGround.circle(2430, 801, 195);
		this.sGround.fill(0x2da12e);
		this.sGround.circle(415, 1600, 129);
		this.sGround.circle(2548, 1005, 195);
		this.sGround.fill(0x2da12e);
		this.sGround.circle(1557, 1599, 144);
		this.sGround.circle(0, 1527, 195);
		this.sGround.circle(2330, 1531, 195);
		this.sGround.fill(0x2da12e);
		this.sGround.circle(630, 1647, 195);
		this.sGround.circle(1292, 1587, 195);
		this.sGround.circle(2336, 493, 195);
		this.sGround.circle(2356, 1217, 195);
		this.sGround.fill(0x2da12e);
		this.sGround.circle(947, 1683, 258);
		this.sGround.circle(1927, 1560, 337);
		this.sGround.fill(0x2da12e);

		// body
		for (let i = 0; i < 29; i++) {
			this.sGround.rect(1995 - i * 47.45, 307 + i * 35.6, 378 + i * 47.45, 35.6);
		}
		this.sGround.rect(0, 1339.4, 2393, 226.6);
		const mBody = new Matrix();
		mBody.scale(1, 2000 / 255);
		this.sGround.fill({ texture: this.climbGroundTex, matrix: mBody });

		// circle ground (body)
		this.climbDrawGroundCircle(237, 1560, 80);
		this.climbDrawGroundCircle(2430, 801, 189);
		this.climbDrawGroundCircle(415, 1600, 123);
		this.climbDrawGroundCircle(2548, 1005, 189);
		this.climbDrawGroundCircle(1557, 1599, 138);
		this.climbDrawGroundCircle(0, 1527, 189);
		this.climbDrawGroundCircle(2330, 1531, 189);
		this.climbDrawGroundCircle(630, 1647, 189);
		this.climbDrawGroundCircle(1292, 1587, 189);
		this.climbDrawGroundCircle(2336, 493, 189);
		this.climbDrawGroundCircle(2356, 1217, 189);
		this.climbDrawGroundCircle(947, 1683, 252);
		this.climbDrawGroundCircle(1927, 1560, 331);

		// rocks
		this.climbDrawRock(0, 166, 1420, 52);
		this.climbDrawRock(1, 485, 1482, 52);
		this.climbDrawRock(2, 748, 1624, 35);
		this.climbDrawRock(1, 890, 1392, 86);
		this.climbDrawRock(1, 1157, 1489, 52);
		this.climbDrawRock(2, 1195, 1287, 35);
		this.climbDrawRock(1, 1407, 1031, 35);
		this.climbDrawRock(1, 1470, 1302, 86);
		this.climbDrawRock(1, 1601, 1017, 52);
		this.climbDrawRock(1, 1785, 1457, 52);
		this.climbDrawRock(2, 1855, 1231, 35);
		this.climbDrawRock(0, 1822, 898, 86);
		this.climbDrawRock(1, 1985, 705, 52);
		this.climbDrawRock(1, 2029, 1069, 52);
		this.climbDrawRock(1, 2152, 1604, 52);
		this.climbDrawRock(2, 2244, 426, 35);
		this.climbDrawRock(1, 2265, 669, 52);
		this.climbDrawRock(0, 2288, 1034, 137.5);
		this.climbDrawRock(1, 2389, 526, 43.5);
		this.climbDrawRock(2, 2480, 681, 86);
		this.climbDrawRock(0, 2638, 401, 35);

		// start and end platforms
		this.sGround.rect(25, 1336, 445, 56);
		this.sGround.rect(1992, 303, 309, 56);
		this.sGround.fill(0xceb456);
		this.sGround.stroke({ width: 6, color: 0x9d8941 });

		this.view.addChild(this.sGround);
	}

	// =====================================================================
	// MONKEY BARS — verbatim port of ControllerMonkeyBars.ts ctor (:346-581).
	// =====================================================================

	/** ControllerMonkeyBars.DrawGroundOutlineCircle (:601-605). */
	private mbDrawGroundOutlineCircle(xPos: number, yPos: number, radius: number): void {
		const sGround = xPos < 3000 ? this.sGround1! : this.sGround2!;
		sGround.circle(xPos + radius, yPos + radius, radius + 6);
		sGround.fill(0x2da12e);
	}

	/** ControllerMonkeyBars.DrawGroundCircle (:607-614). */
	private mbDrawGroundCircle(xPos: number, yPos: number, radius: number): void {
		const sGround = xPos < 3000 ? this.sGround1! : this.sGround2!;
		const m = new Matrix();
		m.scale(1, 700 / 255);
		m.translate(0, 550);
		sGround.circle(xPos + radius, yPos + radius, radius);
		sGround.fill({ texture: Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"], 255), matrix: m });
	}

	/** ControllerMonkeyBars.DrawCaveRock (:616-624). */
	private mbDrawCaveRock(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
		const sGround = x1 < 3000 ? this.sGround1! : this.sGround2!;
		const m = new Matrix();
		sGround.moveTo(x1, y1);
		sGround.lineTo(x2, y2);
		sGround.lineTo(x3, y3);
		sGround.lineTo(x1, y1);
		sGround.fill({ texture: Gradient.getLinearGradientTexture(["#AAB9BD", "#95A1A5"], 1500), matrix: m });
	}

	/** ControllerMonkeyBars.DrawRock (:626-639). */
	private mbDrawRock(type: number, xPos: number, yPos: number, radius: number): void {
		const sGround = xPos < 3000 ? this.sGround1! : this.sGround2!;
		const m = new Matrix();
		m.translate(0, yPos);
		sGround.circle(xPos + radius, yPos + radius, radius);
		sGround.fill({
			texture: Gradient.getLinearGradientTexture(
				type == 0 ? ["#8EDB82", "#7FBF72"] : type == 1 ? ["#80D970", "#6DBE5D"] : ["#70C160", "#63AB52"],
				radius * 2,
			),
			matrix: m,
		});
		sGround.stroke({ width: 6, color: 0x6bb05a });
	}

	private buildMonkeyBars(): void {
		this.sGround1 = new Graphics();
		this.sGround2 = new Graphics();

		// cave walls
		let m = new Matrix();
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
		this.sGround1.fill({ texture: Gradient.getLinearGradientTexture(["#B6C6CA", "#9AA9AD"], 1500), matrix: m });
		this.sGround1.stroke({ width: 6, color: 0x889598, alpha: 1 });

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
		this.sGround2.fill({ texture: Gradient.getLinearGradientTexture(["#B6C6CA", "#9AA9AD"], 1500), matrix: m });
		this.sGround2.stroke({ width: 6, color: 0x889598, alpha: 1 });

		// cave rocks
		this.mbDrawCaveRock(1324, 1148, 1271, 1260, 1370, 1313);
		this.mbDrawCaveRock(1134, 1040, 1099, 1148, 1295, 1130);
		this.mbDrawCaveRock(1214, 770, 1334, 759, 1315, 869);
		this.mbDrawCaveRock(1141, 638, 1289, 554, 1262, 667);
		this.mbDrawCaveRock(1350, 514, 1400, 496, 1412, 582);
		this.mbDrawCaveRock(1472, 650, 1554, 581, 1552, 653);
		this.mbDrawCaveRock(1686, 506, 1824, 441, 1787, 630);
		this.mbDrawCaveRock(1900, 503, 1842, 613, 1945, 667);
		this.mbDrawCaveRock(1997, 352, 2133, 391, 2072, 433);
		this.mbDrawCaveRock(2121, 633, 2279, 607, 2266, 694);
		this.mbDrawCaveRock(2137, 764, 2186, 746, 2198, 832);
		this.mbDrawCaveRock(3559, 714, 3662, 738, 3604, 780);
		this.mbDrawCaveRock(3589, 429, 3671, 361, 3668, 435);
		this.mbDrawCaveRock(3674, 605, 3811, 540, 3776, 729);
		this.mbDrawCaveRock(3909, 493, 3965, 380, 4010, 543);
		this.mbDrawCaveRock(4058, 631, 4242, 620, 4179, 688);
		this.mbDrawCaveRock(4163, 497, 4297, 540, 4261, 436);
		this.mbDrawCaveRock(4406, 649, 4440, 538, 4603, 629);
		this.mbDrawCaveRock(4416, 866, 4518, 890, 4459, 932);
		this.mbDrawCaveRock(4514, 807, 4675, 782, 4661, 870);
		this.mbDrawCaveRock(4432, 1054, 4579, 1024, 4502, 1199);
		this.mbDrawCaveRock(4639, 1063, 4688, 1045, 4701, 1130);
		this.mbDrawCaveRock(4362, 1318, 4443, 1249, 4440, 1321);

		// main ground
		// outlines
		this.sGround2.rect(3477, 1369, 1083, 197);
		this.sGround2.fill(0x2da12e);
		this.mbDrawGroundOutlineCircle(1029, 1353, 63);
		this.mbDrawGroundOutlineCircle(2201, 1377, 63);
		this.mbDrawGroundOutlineCircle(3393, 1368, 63);
		this.mbDrawGroundOutlineCircle(4472, 1323, 63);
		this.mbDrawGroundOutlineCircle(1593, 1665, 63);
		this.mbDrawGroundOutlineCircle(1908, 1644, 63);
		this.mbDrawGroundOutlineCircle(2104, 1416, 80);
		this.mbDrawGroundOutlineCircle(4565, 1278, 104);
		this.mbDrawGroundOutlineCircle(4313, 1530, 104);
		this.mbDrawGroundOutlineCircle(3855, 1491, 104);
		this.mbDrawGroundOutlineCircle(3804, 1578, 104);
		this.mbDrawGroundOutlineCircle(4425, 1380, 138);
		this.mbDrawGroundOutlineCircle(3650, 1403, 138);
		this.mbDrawGroundOutlineCircle(3460, 1413, 138);
		this.mbDrawGroundOutlineCircle(1898, 1374, 138);
		this.mbDrawGroundOutlineCircle(1106, 1326, 138);
		this.mbDrawGroundOutlineCircle(1234, 1410, 138);
		this.mbDrawGroundOutlineCircle(1927, 1449, 138);
		this.mbDrawGroundOutlineCircle(1359, 1383, 189);
		this.mbDrawGroundOutlineCircle(1591, 1390, 189);
		this.mbDrawGroundOutlineCircle(3978, 1446, 189);

		// body
		m = new Matrix();
		m.translate(0, 550);
		this.sGround1.rect(1550, 1391, 600, 100);
		this.sGround1.fill({ texture: Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"], 700), matrix: m });
		this.sGround2.rect(3483, 1375, 1071, 185);
		this.sGround2.fill({ texture: Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"], 700), matrix: m });
		this.mbDrawGroundCircle(1029, 1353, 63);
		this.mbDrawGroundCircle(2201, 1377, 63);
		this.mbDrawGroundCircle(3393, 1368, 63);
		this.mbDrawGroundCircle(4472, 1323, 63);
		this.mbDrawGroundCircle(1593, 1665, 63);
		this.mbDrawGroundCircle(1908, 1644, 63);
		this.mbDrawGroundCircle(2104, 1416, 80);
		this.mbDrawGroundCircle(4565, 1278, 104);
		this.mbDrawGroundCircle(4313, 1530, 104);
		this.mbDrawGroundCircle(3855, 1491, 104);
		this.mbDrawGroundCircle(3804, 1578, 104);
		this.mbDrawGroundCircle(4425, 1380, 138);
		this.mbDrawGroundCircle(3650, 1403, 138);
		this.mbDrawGroundCircle(3460, 1413, 138);
		this.mbDrawGroundCircle(1898, 1374, 138);
		this.mbDrawGroundCircle(1106, 1326, 138);
		this.mbDrawGroundCircle(1234, 1410, 138);
		this.mbDrawGroundCircle(1927, 1449, 138);
		this.mbDrawGroundCircle(1359, 1383, 189);
		this.mbDrawGroundCircle(1591, 1390, 189);
		this.mbDrawGroundCircle(3978, 1446, 189);

		// rocks
		this.mbDrawRock(1, 1380, 1488, 35);
		this.mbDrawRock(2, 2095, 1559, 35);
		this.mbDrawRock(2, 3604, 1484, 35);
		this.mbDrawRock(1, 4206, 1698, 35);
		this.mbDrawRock(0, 4472, 1446, 35);
		this.mbDrawRock(2, 1152, 1420, 43.5);
		this.mbDrawRock(0, 1572, 1637, 43.5);
		this.mbDrawRock(2, 1954, 1471, 43.5);
		this.mbDrawRock(1, 3992, 1453, 43.5);
		this.mbDrawRock(1, 4257, 1453, 52);
		this.mbDrawRock(2, 3812, 1511, 69);
		this.mbDrawRock(1, 1739, 1454, 69);

		// monkey bars
		for (let i = 0; i < 9; i++) {
			this.sGround1.circle(2257 + i * 144, 1089, 8);
		}
		this.sGround1.fill(0xc4ced4);
		this.sGround1.stroke({ width: 6, color: 0x71848d, alpha: 1 });

		// start and end platforms
		this.sGround1.rect(1550, 1368, 683, 56);
		this.sGround1.fill(0xceb456);
		this.sGround1.stroke({ width: 6, color: 0x9d8941 });

		this.sGround2.rect(3510, 1368, 930, 56);
		this.sGround2.fill(0xceb456);
		this.sGround2.stroke({ width: 6, color: 0x9d8941 });

		this.view.addChild(this.sGround1);
		this.view.addChild(this.sGround2);
	}

	// =====================================================================
	// Per-frame reposition/rescale + visibility culling.
	// =====================================================================

	update(cam: CameraState, canvasW: number, canvasH: number): void {
		if (this.builtKey === "climb") this.updateClimb(cam, canvasW, canvasH);
		else if (this.builtKey === "monkeyBars") this.updateMonkeyBars(cam, canvasW, canvasH);
	}

	/**
	 * ControllerClimb.Update (:261-273). sGround.width =
	 * World2ScreenX(61.9) - World2ScreenX(0) = 61.9 * scale; scale.y = scale.x;
	 * anchor at (1.02, -17.15). No visibility condition (one Graphics, always on).
	 */
	private updateClimb(cam: CameraState, canvasW: number, canvasH: number): void {
		if (!this.sGround) return;
		this.sGround.width = w2sX(61.9, cam, canvasW) - w2sX(0, cam, canvasW);
		this.sGround.scale.y = this.sGround.scale.x;
		this.sGround.x = w2sX(1.02, cam, canvasW);
		this.sGround.y = w2sY(-17.15, cam, canvasH);
	}

	/**
	 * ControllerMonkeyBars.Update (:657-681). sGround1.width =
	 * World2ScreenX(50.11) - World2ScreenX(0); uniform scale copied to sGround2;
	 * both anchored at (-30.8, -17.08); cull sGround1 by World2ScreenX(40) > 0 and
	 * sGround2 by World2ScreenX(38) < canvasW (legacy 800 -> live canvasW).
	 */
	private updateMonkeyBars(cam: CameraState, canvasW: number, canvasH: number): void {
		if (!this.sGround1 || !this.sGround2) return;
		this.sGround1.width = w2sX(50.11, cam, canvasW) - w2sX(0, cam, canvasW);
		this.sGround1.scale.y = this.sGround1.scale.x;
		this.sGround2.scale.x = this.sGround1.scale.x;
		this.sGround2.scale.y = this.sGround2.scale.x;

		this.sGround1.visible = w2sX(40, cam, canvasW) > 0;
		this.sGround2.visible = w2sX(38, cam, canvasW) < canvasW;
		if (this.sGround1.visible) {
			this.sGround1.x = w2sX(-30.8, cam, canvasW);
			this.sGround1.y = w2sY(-17.08, cam, canvasH);
		}
		if (this.sGround2.visible) {
			this.sGround2.x = w2sX(-30.8, cam, canvasW);
			this.sGround2.y = w2sY(-17.08, cam, canvasH);
		}
	}

	destroy(): void {
		this.clearGraphics();
		this.builtKey = null;
		this.view.destroy({ children: true });
	}
}
