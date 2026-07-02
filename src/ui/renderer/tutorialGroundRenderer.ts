// Renderer-only static tutorial-terrain visual — a faithful, verbatim port of the
// three decorative Graphics (`sGround1`, `sGround2`, `sGround3`) built by
// src/Game/Tutorials/ControllerTutorial.ts (its constructor, ~lines 285-1020, plus
// the DrawGroundOutlineCircle / DrawGroundCircle / DrawCaveRock / DrawRock helpers,
// :1023-1061) and repositioned each frame in its Update (:1083-1107).
//
// The legacy builds this grass/dirt/rock landscape ONCE into three Graphics in a
// LOCAL pixel space, adds them to the display list, then every frame:
//   - sets sGround1.width = World2ScreenX(29.34) - World2ScreenX(0) (Pixi then
//     computes scale.x = targetWidthPx / localContentWidth), copies scale.y=scale.x,
//     and copies that uniform scale onto sGround2 + sGround3;
//   - sets each sGround.x/y = World2Screen(anchor) (sGround1 @ (-77,-15.3);
//     sGround2/3 @ (-75,-15.3));
//   - applies visibility culling against the stage width (800 in the legacy Flash
//     stage; the LIVE canvasW here since the port is responsive).
// The collision geometry (the triangles/circles pushed into allParts with
// drawAnyway=false) is separate and intentionally NOT drawn; this module is the
// purely-cosmetic landscape that sits over it.
//
// Follows groundRenderer.ts's conventions: a public `view` Container, an idempotent
// build() that draws the geometry once, and update(camera, canvasW, canvasH) that
// repositions/rescales each frame. Imports only pixi + the Gradient/Util helpers +
// core types, exactly like groundRenderer.

import { Container, Graphics, Matrix } from "pixi.js";
import { Gradient } from "../../Game/Graphics/Gradient";
import type { CameraState } from "../../core";

/** world -> screen, matching the shared Draw transform (sceneRenderer.worldToScreen). */
function w2sX(x: number, cam: CameraState, canvasW: number): number {
	return canvasW / 2 + x * cam.scale - cam.offsetX;
}
function w2sY(y: number, cam: CameraState, canvasH: number): number {
	return canvasH / 2 + y * cam.scale - cam.offsetY;
}

export class TutorialGroundRenderer {
	/** The container GameCanvas mounts (above the sandbox ground, below the Draw sprite). */
	public readonly view: Container = new Container();

	private sGround1: Graphics | null = null;
	private sGround2: Graphics | null = null;
	private sGround3: Graphics | null = null;
	private built = false;

	// --- helpers, ported verbatim from ControllerTutorial.ts:1023-1061. ---
	// Each routes to sGround1/2/3 by the same x thresholds the legacy uses.

	private DrawGroundOutlineCircle(xPos: number, yPos: number, radius: number): void {
		const sGround: Graphics = xPos < 2300 ? this.sGround1! : xPos < 6300 ? this.sGround2! : this.sGround3!;
		sGround.circle(xPos + radius, yPos + radius, radius + 6);
		sGround.fill({ color: 0x2da12e });
	}

	private DrawGroundCircle(xPos: number, yPos: number, radius: number): void {
		const sGround: Graphics = xPos < 2300 ? this.sGround1! : xPos < 6300 ? this.sGround2! : this.sGround3!;
		const m = new Matrix();
		m.scale(1, 1500 / 255);
		m.translate(0, 850);
		sGround.circle(xPos + radius, yPos + radius, radius);
		sGround.fill({ texture: Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"], 255), matrix: m });
	}

	private DrawCaveRock(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
		const sGround: Graphics = x1 < 2300 ? this.sGround1! : x1 < 6300 ? this.sGround2! : this.sGround3!;
		const m = new Matrix();
		sGround.moveTo(x1, y1);
		sGround.lineTo(x2, y2);
		sGround.lineTo(x3, y3);
		sGround.lineTo(x1, y1);
		sGround.fill({ texture: Gradient.getLinearGradientTexture(["#AAB9BD", "#95A1A5"], 1500), matrix: m });
	}

	private DrawRock(type: number, xPos: number, yPos: number, radius: number): void {
		const sGround: Graphics = xPos < 2300 ? this.sGround1! : xPos < 6200 ? this.sGround2! : this.sGround3!;
		const m = new Matrix();
		m.translate(0, yPos);
		sGround.circle(xPos + radius, yPos + radius, radius);
		sGround.fill({
			texture: Gradient.getLinearGradientTexture(
				type == 0 ? ["#8EDB82", "#7FBF72"] : type == 1 ? ["#80D970", "#6DBE5D"] : ["#70C160", "#63AB52"],
				radius * 2
			),
			matrix: m,
		});
		sGround.stroke({ width: 6, color: 0x6bb05a });
	}

	/**
	 * (Re)build the three sGround Graphics. Idempotent — a cheap no-op once built.
	 * Ported VERBATIM from ControllerTutorial.ts's constructor (:285-1020).
	 */
	build(): void {
		if (this.built) return;
		this.built = true;

		this.sGround1 = new Graphics();
		this.sGround2 = new Graphics();
		this.sGround3 = new Graphics();

		// bg layer 3
		// outlines
		this.sGround3.circle(8261, 2170, 258);
		this.sGround2.circle(6148, 2133, 258);
		this.sGround3.circle(9235, 2334, 337);
		this.sGround3.circle(7306, 2182, 384);
		this.sGround2.fill({ color: 0x007360 });
		this.sGround3.fill({ color: 0x007360 });

		// body
		this.sGround3.circle(8261, 2170, 252);
		this.sGround2.circle(6148, 2133, 252);
		this.sGround3.circle(9235, 2334, 331);
		this.sGround3.circle(7306, 2182, 378);
		this.sGround2.fill({ color: 0x34a97f });
		this.sGround3.fill({ color: 0x34a97f });

		// bg layer 2
		// outlines
		this.sGround3.circle(9165, 2259, 150);
		this.sGround1.circle(1200, 1707, 150);
		this.sGround3.circle(6844, 2126, 207);
		this.sGround1.fill({ color: 0x007a47 });
		this.sGround3.fill({ color: 0x007a47 });
		this.sGround3.circle(6600, 1993, 126);
		this.sGround3.circle(8931, 2180, 207);
		this.sGround3.fill({ color: 0x007a47 });

		// body
		this.sGround3.circle(9165, 2259, 144);
		this.sGround1.circle(1200, 1707, 144);
		this.sGround3.circle(6844, 2126, 201);
		this.sGround1.fill({ color: 0x36ae66 });
		this.sGround3.fill({ color: 0x36ae66 });
		this.sGround3.circle(6600, 1993, 120);
		this.sGround3.circle(8931, 2180, 201);
		this.sGround3.fill({ color: 0x36ae66 });

		// bg layer 1
		// outlines
		this.sGround1.circle(1492, 1732, 167);
		this.sGround2.circle(5923, 2146, 167);
		this.sGround3.circle(6808, 1907, 226);
		this.sGround3.circle(9580, 2158, 281);
		this.sGround1.fill({ color: 0x00862c });
		this.sGround2.fill({ color: 0x00862c });
		this.sGround3.fill({ color: 0x00862c });
		this.sGround3.circle(7217, 1978, 337);
		this.sGround2.circle(5549, 2088, 337);
		this.sGround2.fill({ color: 0x00862c });
		this.sGround3.fill({ color: 0x00862c });

		// body
		this.sGround1.circle(1492, 1732, 161);
		this.sGround2.circle(5923, 2146, 161);
		this.sGround3.circle(6808, 1907, 220);
		this.sGround3.circle(9580, 2158, 275);
		this.sGround1.fill({ color: 0x3eba50 });
		this.sGround2.fill({ color: 0x3eba50 });
		this.sGround3.fill({ color: 0x3eba50 });
		this.sGround3.circle(7217, 1978, 331);
		this.sGround2.circle(5549, 2088, 331);
		this.sGround2.fill({ color: 0x3eba50 });
		this.sGround3.fill({ color: 0x3eba50 });

		// main ground
		// outlines
		this.DrawGroundOutlineCircle(303, 1500, 26.5);
		this.DrawGroundOutlineCircle(2105, 1450, 26.5);
		this.DrawGroundOutlineCircle(2059, 1474, 38);
		this.DrawGroundOutlineCircle(253, 1464, 38);
		this.DrawGroundOutlineCircle(333, 1520, 38);
		this.DrawGroundOutlineCircle(385, 1511, 63);
		this.DrawGroundOutlineCircle(1755, 1579, 63);
		this.DrawGroundOutlineCircle(1951, 1483, 63);
		this.DrawGroundOutlineCircle(1855, 1522, 80);
		this.DrawGroundOutlineCircle(1478, 1610, 80);
		this.DrawGroundOutlineCircle(433, 1554, 80);
		this.DrawGroundOutlineCircle(549, 1531, 104);
		this.DrawGroundOutlineCircle(1313, 1561, 104);
		this.DrawGroundOutlineCircle(1599, 1557, 104);
		this.DrawGroundOutlineCircle(5649, 1932, 104);
		this.DrawGroundOutlineCircle(6330, 1780, 104);
		this.DrawGroundOutlineCircle(6152, 1764, 123);
		this.DrawGroundOutlineCircle(682, 1600, 123);
		this.DrawGroundOutlineCircle(8155, 1952, 123);
		this.DrawGroundOutlineCircle(10035, 1896, 123);
		this.DrawGroundOutlineCircle(8859, 2033, 138);
		this.DrawGroundOutlineCircle(6479, 1654, 138);
		this.DrawGroundOutlineCircle(6708, 1655, 161);
		this.DrawGroundOutlineCircle(6881, 1750, 161);
		this.DrawGroundOutlineCircle(1064, 1537, 161);
		this.DrawGroundOutlineCircle(7128, 1761, 189);
		this.DrawGroundOutlineCircle(10198, 1761, 189);
		this.DrawGroundOutlineCircle(9291, 1750, 220);
		this.DrawGroundOutlineCircle(5318, 1768, 220);
		this.DrawGroundOutlineCircle(800, 1472, 220);
		this.DrawGroundOutlineCircle(5729, 1667, 252);
		this.DrawGroundOutlineCircle(7376, 1715, 252);
		this.DrawGroundOutlineCircle(8932, 1751, 252);
		this.DrawGroundOutlineCircle(7698, 1589, 303);
		this.DrawGroundOutlineCircle(4900, 1662, 331);
		this.DrawGroundOutlineCircle(9532, 1590, 331);
		this.DrawGroundOutlineCircle(8294, 1614, 378);

		// shapes
		let m = new Matrix();
		m.translate(0, 850);
		this.sGround1.moveTo(290, 1464);
		this.sGround1.lineTo(325, 1465);
		this.sGround1.lineTo(337, 1459);
		this.sGround1.lineTo(359, 1457);
		this.sGround1.lineTo(373, 1450);
		this.sGround1.lineTo(429, 1447);
		this.sGround1.lineTo(487, 1443);
		this.sGround1.lineTo(747, 1448);
		this.sGround1.lineTo(839, 1450);
		this.sGround1.lineTo(1026, 1450);
		this.sGround1.lineTo(1026, 1453);
		this.sGround1.lineTo(1785, 1453);
		this.sGround1.lineTo(1822, 1450);
		this.sGround1.lineTo(2133, 1450);
		this.sGround1.lineTo(2133, 1482);
		this.sGround1.lineTo(2029, 1539);
		this.sGround1.lineTo(1850, 1631);
		this.sGround1.lineTo(1354, 1725);
		this.sGround1.lineTo(709, 1690);
		this.sGround1.lineTo(290, 1511);
		this.sGround1.lineTo(290, 1464);
		this.sGround1.fill({ texture: Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"], 1500), matrix: m });
		this.sGround1.stroke({ width: 6, color: 0x2da12e, alpha: 1 });
		this.sGround2.moveTo(5370, 1658);
		this.sGround2.lineTo(5605, 1651);
		this.sGround2.lineTo(5801, 1658);
		this.sGround2.lineTo(5852, 1648);
		this.sGround2.lineTo(6088, 1651);
		this.sGround2.lineTo(6135, 1648);
		this.sGround2.lineTo(6188, 1640);
		this.sGround2.lineTo(6410, 1640);
		this.sGround2.lineTo(6410, 1900);
		this.sGround2.lineTo(5370, 1900);
		this.sGround2.lineTo(5370, 1658);
		this.sGround2.fill({ texture: Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"], 1500), matrix: m });
		this.sGround2.stroke({ width: 6, color: 0x2da12e, alpha: 1 });
		this.sGround3.moveTo(6410, 1640);
		this.sGround3.lineTo(6547, 1610);
		this.sGround3.lineTo(7311, 1610);
		this.sGround3.lineTo(7327, 1599);
		this.sGround3.lineTo(7506, 1597);
		this.sGround3.lineTo(7589, 1601);
		this.sGround3.lineTo(7988, 1603);
		this.sGround3.lineTo(8665, 1606);
		this.sGround3.lineTo(9291, 1610);
		this.sGround3.lineTo(10126, 1614);
		this.sGround3.lineTo(10377, 1869);
		this.sGround3.lineTo(10278, 1989);
		this.sGround3.lineTo(10098, 2002);
		this.sGround3.lineTo(8438, 2101);
		this.sGround3.lineTo(6646, 1803);
		this.sGround3.lineTo(6394, 1850);
		this.sGround3.lineTo(6410, 1850);
		this.sGround3.lineTo(6410, 1640);
		this.sGround3.fill({ texture: Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"], 1500), matrix: m });
		this.sGround3.stroke({ width: 6, color: 0x2da12e, alpha: 1 });
		this.sGround3.rect(6250, 1643, 200, 327);
		this.sGround3.fill({ texture: Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"], 1500), matrix: m });

		// body
		this.DrawGroundCircle(303, 1500, 26.5);
		this.DrawGroundCircle(2105, 1450, 26.5);
		this.DrawGroundCircle(2059, 1474, 38);
		this.DrawGroundCircle(253, 1464, 38);
		this.DrawGroundCircle(333, 1520, 38);
		this.DrawGroundCircle(385, 1511, 63);
		this.DrawGroundCircle(1755, 1579, 63);
		this.DrawGroundCircle(1951, 1483, 63);
		this.DrawGroundCircle(1855, 1522, 80);
		this.DrawGroundCircle(1478, 1610, 80);
		this.DrawGroundCircle(433, 1554, 80);
		this.DrawGroundCircle(549, 1531, 104);
		this.DrawGroundCircle(1313, 1561, 104);
		this.DrawGroundCircle(1599, 1557, 104);
		this.DrawGroundCircle(5649, 1932, 104);
		this.DrawGroundCircle(6330, 1780, 104);
		this.DrawGroundCircle(6152, 1764, 123);
		this.DrawGroundCircle(682, 1600, 123);
		this.DrawGroundCircle(8155, 1952, 123);
		this.DrawGroundCircle(10035, 1896, 123);
		this.DrawGroundCircle(8859, 2033, 138);
		this.DrawGroundCircle(6479, 1654, 138);
		this.DrawGroundCircle(6708, 1655, 161);
		this.DrawGroundCircle(6881, 1750, 161);
		this.DrawGroundCircle(1064, 1537, 161);
		this.DrawGroundCircle(7128, 1761, 189);
		this.DrawGroundCircle(10198, 1761, 189);
		this.DrawGroundCircle(9291, 1750, 220);
		this.DrawGroundCircle(5318, 1768, 220);
		this.DrawGroundCircle(800, 1472, 220);
		this.DrawGroundCircle(5729, 1667, 252);
		this.DrawGroundCircle(7376, 1715, 252);
		this.DrawGroundCircle(8932, 1751, 252);
		this.DrawGroundCircle(7698, 1589, 303);
		this.DrawGroundCircle(4900, 1662, 331);
		this.DrawGroundCircle(9532, 1590, 331);
		this.DrawGroundCircle(8294, 1614, 378);

		// rocky terrain
		m = new Matrix();
		m.translate(0, 750);
		this.sGround1.moveTo(376, 1450);
		this.sGround1.lineTo(396, 1414);
		this.sGround1.lineTo(409, 1410);
		this.sGround1.lineTo(422, 1383);
		this.sGround1.lineTo(444, 1378);
		this.sGround1.lineTo(454, 1366);
		this.sGround1.lineTo(486, 1360);
		this.sGround1.lineTo(505, 1328);
		this.sGround1.lineTo(521, 1321);
		this.sGround1.lineTo(543, 1286);
		this.sGround1.lineTo(565, 1282);
		this.sGround1.lineTo(572, 1267);
		this.sGround1.lineTo(588, 1261);
		this.sGround1.lineTo(593, 1247);
		this.sGround1.lineTo(615, 1233);
		this.sGround1.lineTo(677, 1235);
		this.sGround1.lineTo(702, 1263);
		this.sGround1.lineTo(754, 1282);
		this.sGround1.lineTo(760, 1294);
		this.sGround1.lineTo(803, 1307);
		this.sGround1.lineTo(816, 1318);
		this.sGround1.lineTo(877, 1320);
		this.sGround1.lineTo(902, 1342);
		this.sGround1.lineTo(905, 1356);
		this.sGround1.lineTo(934, 1377);
		this.sGround1.lineTo(941, 1395);
		this.sGround1.lineTo(974, 1405);
		this.sGround1.lineTo(988, 1423);
		this.sGround1.lineTo(1013, 1435);
		this.sGround1.lineTo(1024, 1457);
		this.sGround1.lineTo(1018, 1463);
		this.sGround1.lineTo(870, 1464);
		this.sGround1.lineTo(847, 1497);
		this.sGround1.lineTo(751, 1498);
		this.sGround1.lineTo(741, 1513);
		this.sGround1.lineTo(725, 1515);
		this.sGround1.lineTo(710, 1540);
		this.sGround1.lineTo(615, 1545);
		this.sGround1.lineTo(579, 1520);
		this.sGround1.lineTo(548, 1520);
		this.sGround1.lineTo(522, 1499);
		this.sGround1.lineTo(422, 1497);
		this.sGround1.lineTo(396, 1473);
		this.sGround1.lineTo(377, 1464);
		this.sGround1.lineTo(376, 1450);
		this.sGround1.fill({ texture: Gradient.getLinearGradientTexture(["#B6C6CA", "#9AA9AD"], 2050), matrix: m });
		this.sGround1.stroke({ width: 6, color: 0x889598, alpha: 1 });
		this.sGround2.moveTo(2503, 1544);
		this.sGround2.lineTo(2675, 1498);
		this.sGround2.lineTo(3050, 1522);
		this.sGround2.lineTo(3811, 1615);
		this.sGround2.lineTo(3925, 1646);
		this.sGround2.lineTo(3925, 1692);
		this.sGround2.lineTo(3919, 1698);
		this.sGround2.lineTo(3919, 1736);
		this.sGround2.lineTo(3903, 1753);
		this.sGround2.lineTo(3905, 1808);
		this.sGround2.lineTo(3896, 1832);
		this.sGround2.lineTo(3900, 1863);
		this.sGround2.lineTo(3992, 1864);
		this.sGround2.lineTo(4023, 1847);
		this.sGround2.lineTo(4186, 1863);
		this.sGround2.lineTo(4265, 1891);
		this.sGround2.lineTo(4299, 1925);
		this.sGround2.lineTo(4381, 1952);
		this.sGround2.lineTo(4535, 1944);
		this.sGround2.lineTo(4576, 1919);
		this.sGround2.lineTo(4628, 1906);
		this.sGround2.lineTo(4656, 1877);
		this.sGround2.lineTo(4720, 1862);
		this.sGround2.lineTo(4719, 1788);
		this.sGround2.lineTo(4692, 1753);
		this.sGround2.lineTo(4691, 1691);
		this.sGround2.lineTo(4677, 1662);
		this.sGround2.lineTo(4679, 1625);
		this.sGround2.lineTo(4688, 1606);
		this.sGround2.lineTo(4694, 1603);
		this.sGround2.lineTo(4702, 1595);
		this.sGround2.lineTo(4720, 1594);
		this.sGround2.lineTo(4734, 1604);
		this.sGround2.lineTo(4737, 1627);
		this.sGround2.lineTo(4736, 1645);
		this.sGround2.lineTo(4747, 1649);
		this.sGround2.lineTo(4845, 1649);
		this.sGround2.lineTo(4858, 1655);
		this.sGround2.lineTo(5002, 1657);
		this.sGround2.lineTo(5021, 1652);
		this.sGround2.lineTo(5157, 1660);
		this.sGround2.lineTo(5268, 1651);
		this.sGround2.lineTo(5368, 1653);
		this.sGround2.lineTo(5392, 1674);
		this.sGround2.lineTo(5390, 1722);
		this.sGround2.lineTo(5364, 1745);
		this.sGround2.lineTo(5357, 1836);
		this.sGround2.lineTo(5296, 1860);
		this.sGround2.lineTo(5279, 1911);
		this.sGround2.lineTo(5251, 1924);
		this.sGround2.lineTo(5215, 1993);
		this.sGround2.lineTo(5172, 2010);
		this.sGround2.lineTo(5148, 2066);
		this.sGround2.lineTo(5106, 2084);
		this.sGround2.lineTo(5040, 2179);
		this.sGround2.lineTo(4985, 2197);
		this.sGround2.lineTo(4934, 2287);
		this.sGround2.lineTo(4857, 2342);
		this.sGround2.lineTo(4806, 2314);
		this.sGround2.lineTo(4712, 2339);
		this.sGround2.lineTo(4682, 2393);
		this.sGround2.lineTo(4659, 2400);
		this.sGround2.lineTo(4616, 2480);
		this.sGround2.lineTo(4568, 2501);
		this.sGround2.lineTo(4520, 2563);
		this.sGround2.lineTo(4449, 2587);
		this.sGround2.lineTo(4424, 2553);
		this.sGround2.lineTo(4343, 2476);
		this.sGround2.lineTo(4334, 2432);
		this.sGround2.lineTo(4281, 2394);
		this.sGround2.lineTo(4263, 2361);
		this.sGround2.lineTo(4216, 2368);
		this.sGround2.lineTo(4164, 2427);
		this.sGround2.lineTo(4168, 2448);
		this.sGround2.lineTo(4143, 2477);
		this.sGround2.lineTo(4177, 2532);
		this.sGround2.lineTo(4150, 2626);
		this.sGround2.lineTo(4094, 2669);
		this.sGround2.lineTo(4084, 2713);
		this.sGround2.lineTo(4023, 2783);
		this.sGround2.lineTo(3959, 2741);
		this.sGround2.lineTo(3908, 2581);
		this.sGround2.lineTo(3775, 2449);
		this.sGround2.lineTo(3736, 2284);
		this.sGround2.lineTo(3680, 2267);
		this.sGround2.lineTo(3645, 2157);
		this.sGround2.lineTo(3571, 2197);
		this.sGround2.lineTo(3541, 2309);
		this.sGround2.lineTo(3505, 2336);
		this.sGround2.lineTo(3456, 2317);
		this.sGround2.lineTo(3417, 2372);
		this.sGround2.lineTo(3356, 2405);
		this.sGround2.lineTo(3331, 2454);
		this.sGround2.lineTo(3270, 2439);
		this.sGround2.lineTo(3234, 2364);
		this.sGround2.lineTo(3147, 2327);
		this.sGround2.lineTo(3104, 2229);
		this.sGround2.lineTo(3111, 2208);
		this.sGround2.lineTo(3060, 2055);
		this.sGround2.lineTo(3006, 2027);
		this.sGround2.lineTo(2977, 1944);
		this.sGround2.lineTo(2767, 1880);
		this.sGround2.lineTo(2752, 1849);
		this.sGround2.lineTo(2718, 1837);
		this.sGround2.lineTo(2707, 1809);
		this.sGround2.lineTo(2668, 1794);
		this.sGround2.lineTo(2632, 1690);
		this.sGround2.lineTo(2532, 1650);
		this.sGround2.lineTo(2503, 1544);
		this.sGround2.fill({ texture: Gradient.getLinearGradientTexture(["#B6C6CA", "#9AA9AD"], 2050), matrix: m });
		this.sGround2.stroke({ width: 6, color: 0x889598, alpha: 1 });
		this.sGround3.moveTo(7569, 1596);
		this.sGround3.lineTo(7596, 1537);
		this.sGround3.lineTo(7631, 1520);
		this.sGround3.lineTo(7649, 1451);
		this.sGround3.lineTo(7690, 1425);
		this.sGround3.lineTo(7754, 1407);
		this.sGround3.lineTo(7786, 1358);
		this.sGround3.lineTo(7926, 1351);
		this.sGround3.lineTo(7936, 1338);
		this.sGround3.lineTo(7953, 1335);
		this.sGround3.lineTo(7971, 1314);
		this.sGround3.lineTo(8149, 1309);
		this.sGround3.lineTo(8169, 1319);
		this.sGround3.lineTo(8213, 1330);
		this.sGround3.lineTo(8259, 1311);
		this.sGround3.lineTo(8278, 1312);
		this.sGround3.lineTo(8294, 1283);
		this.sGround3.lineTo(8308, 1275);
		this.sGround3.lineTo(8321, 1253);
		this.sGround3.lineTo(8343, 1249);
		this.sGround3.lineTo(8357, 1233);
		this.sGround3.lineTo(8384, 1227);
		this.sGround3.lineTo(8432, 1249);
		this.sGround3.lineTo(8481, 1252);
		this.sGround3.lineTo(8492, 1260);
		this.sGround3.lineTo(8533, 1259);
		this.sGround3.lineTo(8539, 1266);
		this.sGround3.lineTo(8553, 1258);
		this.sGround3.lineTo(8582, 1255);
		this.sGround3.lineTo(8603, 1219);
		this.sGround3.lineTo(8639, 1188);
		this.sGround3.lineTo(8654, 1162);
		this.sGround3.lineTo(8698, 1157);
		this.sGround3.lineTo(8741, 1170);
		this.sGround3.lineTo(8748, 1180);
		this.sGround3.lineTo(8774, 1185);
		this.sGround3.lineTo(8792, 1193);
		this.sGround3.lineTo(8840, 1201);
		this.sGround3.lineTo(8864, 1214);
		this.sGround3.lineTo(8916, 1222);
		this.sGround3.lineTo(8955, 1237);
		this.sGround3.lineTo(9005, 1245);
		this.sGround3.lineTo(9020, 1258);
		this.sGround3.lineTo(9042, 1265);
		this.sGround3.lineTo(9076, 1266);
		this.sGround3.lineTo(9087, 1249);
		this.sGround3.lineTo(9105, 1243);
		this.sGround3.lineTo(9118, 1224);
		this.sGround3.lineTo(9133, 1222);
		this.sGround3.lineTo(9141, 1210);
		this.sGround3.lineTo(9160, 1203);
		this.sGround3.lineTo(9188, 1201);
		this.sGround3.lineTo(9208, 1209);
		this.sGround3.lineTo(9324, 1209);
		this.sGround3.lineTo(9347, 1183);
		this.sGround3.lineTo(9367, 1176);
		this.sGround3.lineTo(9380, 1154);
		this.sGround3.lineTo(9394, 1148);
		this.sGround3.lineTo(9402, 1132);
		this.sGround3.lineTo(9432, 1116);
		this.sGround3.lineTo(9471, 1116);
		this.sGround3.lineTo(9481, 1122);
		this.sGround3.lineTo(9520, 1121);
		this.sGround3.lineTo(9537, 1133);
		this.sGround3.lineTo(9552, 1125);
		this.sGround3.lineTo(9578, 1118);
		this.sGround3.lineTo(9653, 1120);
		this.sGround3.lineTo(9671, 1123);
		this.sGround3.lineTo(9684, 1097);
		this.sGround3.lineTo(9704, 1084);
		this.sGround3.lineTo(9746, 986);
		this.sGround3.lineTo(9802, 934);
		this.sGround3.lineTo(9830, 931);
		this.sGround3.lineTo(9855, 893);
		this.sGround3.lineTo(9907, 861);
		this.sGround3.lineTo(9927, 852);
		this.sGround3.lineTo(9935, 820);
		this.sGround3.lineTo(9929, 798);
		this.sGround3.lineTo(9954, 778);
		this.sGround3.lineTo(10003, 773);
		this.sGround3.lineTo(10039, 753);
		this.sGround3.lineTo(10102, 755);
		this.sGround3.lineTo(10114, 767);
		this.sGround3.lineTo(10155, 776);
		this.sGround3.lineTo(10185, 800);
		this.sGround3.lineTo(10226, 826);
		this.sGround3.lineTo(10244, 900);
		this.sGround3.lineTo(10230, 926);
		this.sGround3.lineTo(10248, 1014);
		this.sGround3.lineTo(10238, 1050);
		this.sGround3.lineTo(10254, 1109);
		this.sGround3.lineTo(10281, 1128);
		this.sGround3.lineTo(10292, 1153);
		this.sGround3.lineTo(10368, 1173);
		this.sGround3.lineTo(10409, 1205);
		this.sGround3.lineTo(10422, 1277);
		this.sGround3.lineTo(10445, 1306);
		this.sGround3.lineTo(10457, 1381);
		this.sGround3.lineTo(10543, 1419);
		this.sGround3.lineTo(10562, 1500);
		this.sGround3.lineTo(10587, 1513);
		this.sGround3.lineTo(10606, 1604);
		this.sGround3.lineTo(10678, 1641);
		this.sGround3.lineTo(10702, 1761);
		this.sGround3.lineTo(10685, 1808);
		this.sGround3.lineTo(10649, 1846);
		this.sGround3.lineTo(10643, 1897);
		this.sGround3.lineTo(10568, 1940);
		this.sGround3.lineTo(10523, 1910);
		this.sGround3.lineTo(10340, 1905);
		this.sGround3.lineTo(10309, 1878);
		this.sGround3.lineTo(10256, 1867);
		this.sGround3.lineTo(10233, 1810);
		this.sGround3.lineTo(10097, 1785);
		this.sGround3.lineTo(10057, 1728);
		this.sGround3.lineTo(10002, 1712);
		this.sGround3.lineTo(9959, 1627);
		this.sGround3.lineTo(9911, 1629);
		this.sGround3.lineTo(9890, 1643);
		this.sGround3.lineTo(9827, 1651);
		this.sGround3.lineTo(9795, 1673);
		this.sGround3.lineTo(9700, 1690);
		this.sGround3.lineTo(9682, 1722);
		this.sGround3.lineTo(9651, 1736);
		this.sGround3.lineTo(9581, 1893);
		this.sGround3.lineTo(9557, 1904);
		this.sGround3.lineTo(9529, 1959);
		this.sGround3.lineTo(9329, 1979);
		this.sGround3.lineTo(9297, 2036);
		this.sGround3.lineTo(9259, 2041);
		this.sGround3.lineTo(9217, 2099);
		this.sGround3.lineTo(9162, 2106);
		this.sGround3.lineTo(9135, 2127);
		this.sGround3.lineTo(8992, 2136);
		this.sGround3.lineTo(8960, 2104);
		this.sGround3.lineTo(8903, 2090);
		this.sGround3.lineTo(8839, 2014);
		this.sGround3.lineTo(8751, 2008);
		this.sGround3.lineTo(8634, 1825);
		this.sGround3.lineTo(8466, 1816);
		this.sGround3.lineTo(8450, 1785);
		this.sGround3.lineTo(8306, 1786);
		this.sGround3.lineTo(8242, 1714);
		this.sGround3.lineTo(7911, 1702);
		this.sGround3.lineTo(7878, 1669);
		this.sGround3.lineTo(7646, 1660);
		this.sGround3.lineTo(7606, 1614);
		this.sGround3.lineTo(7579, 1608);
		this.sGround3.lineTo(7569, 1596);
		this.sGround3.fill({ texture: Gradient.getLinearGradientTexture(["#B6C6CA", "#9AA9AD"], 2050), matrix: m });
		this.sGround3.stroke({ width: 6, color: 0x889598, alpha: 1 });

		// cave rocks
		this.DrawCaveRock(425, 1426, 447, 1454, 434, 1476);
		this.DrawCaveRock(437, 1420, 451, 1435, 484, 1400);
		this.DrawCaveRock(497, 1364, 537, 1361, 531, 1387);
		this.DrawCaveRock(543, 1450, 596, 1434, 609, 1459);
		this.DrawCaveRock(631, 1447, 651, 1471, 673, 1413);
		this.DrawCaveRock(621, 1537, 703, 1532, 718, 1507);
		this.DrawCaveRock(613, 1344, 632, 1323, 681, 1318);
		this.DrawCaveRock(598, 1319, 612, 1322, 629, 1303);
		this.DrawCaveRock(676, 1244, 699, 1271, 698, 1302);
		this.DrawCaveRock(730, 1377, 758, 1392, 756, 1381);
		this.DrawCaveRock(802, 1375, 816, 1427, 840, 1407);
		this.DrawCaveRock(804, 1490, 844, 1490, 873, 1447);
		this.DrawCaveRock(828, 1325, 875, 1326, 867, 1348);
		this.DrawCaveRock(970, 1411, 963, 1434, 981, 1427);
		this.DrawCaveRock(2677, 1782, 2795, 1771, 2726, 1803);
		this.DrawCaveRock(2946, 1728, 3056, 1744, 2975, 1813);
		this.DrawCaveRock(3017, 2021, 3091, 2056, 3157, 1982);
		this.DrawCaveRock(3252, 1762, 3308, 1726, 3306, 1778);
		this.DrawCaveRock(3395, 1904, 3327, 1967, 3400, 2016);
		this.DrawCaveRock(3333, 2324, 3446, 2313, 3411, 2359);
		this.DrawCaveRock(3570, 2182, 3639, 2147, 3599, 2130);
		this.DrawCaveRock(3598, 1802, 3670, 1780, 3675, 1851);
		this.DrawCaveRock(3821, 1837, 3895, 1752, 3896, 1810);
		this.DrawCaveRock(3743, 2282, 3823, 2208, 3787, 2314);
		this.DrawCaveRock(3942, 2059, 4014, 2103, 3984, 2150);
		this.DrawCaveRock(4058, 2233, 4018, 2296, 4081, 2287);
		this.DrawCaveRock(4067, 2596, 4139, 2619, 4168, 2535);
		this.DrawCaveRock(4161, 2123, 4167, 2034, 4259, 2061);
		this.DrawCaveRock(4211, 1946, 4258, 1899, 4287, 1931);
		this.DrawCaveRock(4340, 2423, 4390, 2407, 4374, 2361);
		this.DrawCaveRock(4416, 1979, 4532, 1968, 4498, 2016);
		this.DrawCaveRock(4452, 2566, 4517, 2549, 4579, 2460);
		this.DrawCaveRock(4533, 2190, 4565, 2239, 4605, 2148);
		this.DrawCaveRock(4647, 1924, 4726, 1952, 4673, 1968);
		this.DrawCaveRock(4793, 2292, 4856, 2328, 4927, 2276);
		this.DrawCaveRock(4731, 1788, 4763, 1778, 4709, 1754);
		this.DrawCaveRock(4698, 1687, 4720, 1682, 4686, 1666);
		this.DrawCaveRock(4720, 1635, 4733, 1626, 4729, 1662);
		this.DrawCaveRock(4830, 1765, 4870, 1703, 4893, 1757);
		this.DrawCaveRock(4920, 1945, 4919, 2012, 4988, 1984);
		this.DrawCaveRock(5052, 2030, 5159, 2011, 5138, 2060);
		this.DrawCaveRock(5104, 1838, 5152, 1808, 5147, 1838);
		this.DrawCaveRock(5054, 1696, 5033, 1663, 5154, 1674);
		this.DrawCaveRock(5209, 1801, 5279, 1858, 5346, 1829);
		this.DrawCaveRock(5380, 1716, 5383, 1680, 5339, 1688);
		this.DrawCaveRock(7654, 1520, 7669, 1469, 7744, 1518);
		this.DrawCaveRock(7833, 1602, 7918, 1688, 8192, 1695);
		this.DrawCaveRock(7982, 1331, 8001, 1372, 8136, 1329);
		this.DrawCaveRock(8140, 1519, 8099, 1611, 8219, 1613);
		this.DrawCaveRock(8246, 1503, 8277, 1501, 8282, 1462);
		this.DrawCaveRock(8427, 1617, 8298, 1721, 8542, 1669);
		this.DrawCaveRock(8595, 1761, 8478, 1804, 8630, 1811);
		this.DrawCaveRock(8600, 1259, 8645, 1205, 8681, 1295);
		this.DrawCaveRock(8866, 1342, 8902, 1355, 8899, 1387);
		this.DrawCaveRock(8847, 1512, 8788, 1633, 8913, 1663);
		this.DrawCaveRock(8801, 1906, 8923, 2055, 9069, 2072);
		this.DrawCaveRock(8973, 1408, 9015, 1345, 9037, 1400);
		this.DrawCaveRock(9091, 1421, 9090, 1489, 9160, 1462);
		this.DrawCaveRock(9077, 1588, 9043, 1631, 9116, 1608);
		this.DrawCaveRock(9021, 1636, 8986, 1677, 9016, 1674);
		this.DrawCaveRock(9137, 1838, 9032, 1899, 9081, 1911);
		this.DrawCaveRock(9220, 1222, 9324, 1225, 9302, 1268);
		this.DrawCaveRock(9323, 1410, 9422, 1437, 9341, 1531);
		this.DrawCaveRock(9339, 1699, 9485, 1658, 9447, 1771);
		this.DrawCaveRock(9308, 1969, 9519, 1946, 9548, 1888);
		this.DrawCaveRock(9600, 1675, 9658, 1638, 9657, 1693);
		this.DrawCaveRock(9697, 1674, 9721, 1632, 9792, 1656);
		this.DrawCaveRock(9724, 1097, 9761, 1010, 9866, 1079);
		this.DrawCaveRock(9870, 905, 9933, 874, 9923, 947);
		this.DrawCaveRock(10073, 878, 10141, 785, 10171, 865);
		this.DrawCaveRock(10134, 1072, 10098, 1115, 10172, 1093);
		this.DrawCaveRock(9900, 1204, 9830, 1269, 9905, 1320);
		this.DrawCaveRock(10306, 1307, 10392, 1210, 10404, 1285);
		this.DrawCaveRock(10359, 1437, 10443, 1384, 10419, 1571);
		this.DrawCaveRock(10140, 1518, 10214, 1562, 10183, 1611);
		this.DrawCaveRock(10113, 1773, 10237, 1796, 10288, 1702);
		this.DrawCaveRock(10607, 1793, 10670, 1803, 10637, 1834);

		// main ground (in front of rocky bit)
		// outlines
		this.DrawGroundOutlineCircle(3321, 1586, 26.5);
		this.DrawGroundOutlineCircle(3806, 1612, 26.5);
		this.DrawGroundOutlineCircle(3899, 1612, 26.5);
		this.DrawGroundOutlineCircle(3933, 1610, 26.5);
		this.DrawGroundOutlineCircle(3941, 1602, 26.5);
		this.DrawGroundOutlineCircle(3923, 1578, 26.5);
		this.DrawGroundOutlineCircle(3843, 1612, 38);
		this.DrawGroundOutlineCircle(3749, 1592, 38);
		this.DrawGroundOutlineCircle(3365, 1578, 38);
		this.DrawGroundOutlineCircle(3403, 1594, 38);
		this.DrawGroundOutlineCircle(3257, 1560, 38);
		this.DrawGroundOutlineCircle(3123, 1546, 38);
		this.DrawGroundOutlineCircle(2469, 1508, 38);
		this.DrawGroundOutlineCircle(2422, 1482, 38);
		this.DrawGroundOutlineCircle(2432, 1459, 38);
		this.DrawGroundOutlineCircle(2516, 1492, 63);
		this.DrawGroundOutlineCircle(2616, 1474, 63);
		this.DrawGroundOutlineCircle(3016, 1525, 63);
		this.DrawGroundOutlineCircle(3174, 1520, 63);
		this.DrawGroundOutlineCircle(3642, 1598, 63);
		this.DrawGroundOutlineCircle(3458, 1570, 63);
		this.DrawGroundOutlineCircle(3524, 1581, 80);
		this.DrawGroundOutlineCircle(2696, 1479, 80);
		this.DrawGroundOutlineCircle(2824, 1482, 104);

		// shapes
		m = new Matrix();
		this.sGround2.moveTo(2467, 1460);
		this.sGround2.lineTo(2762, 1457);
		this.sGround2.lineTo(2879, 1456);
		this.sGround2.lineTo(2889, 1456);
		this.sGround2.lineTo(2917, 1457);
		this.sGround2.lineTo(2941, 1460);
		this.sGround2.lineTo(2974, 1464);
		this.sGround2.lineTo(3005, 1468);
		this.sGround2.lineTo(3069, 1479);
		this.sGround2.lineTo(3151, 1492);
		this.sGround2.lineTo(3213, 1502);
		this.sGround2.lineTo(3269, 1512);
		this.sGround2.lineTo(3333, 1522);
		this.sGround2.lineTo(3357, 1525);
		this.sGround2.lineTo(3399, 1528);
		this.sGround2.lineTo(3430, 1532);
		this.sGround2.lineTo(3530, 1547);
		this.sGround2.lineTo(3619, 1561);
		this.sGround2.lineTo(3702, 1572);
		this.sGround2.lineTo(3793, 1583);
		this.sGround2.lineTo(3845, 1588);
		this.sGround2.lineTo(3873, 1589);
		this.sGround2.lineTo(3899, 1589);
		this.sGround2.lineTo(3913, 1587);
		this.sGround2.lineTo(3929, 1583);
		this.sGround2.lineTo(3940, 1580);
		this.sGround2.lineTo(3947, 1578);
		this.sGround2.lineTo(3955, 1587);
		this.sGround2.lineTo(3956, 1637);
		this.sGround2.lineTo(3548, 1639);
		this.sGround2.lineTo(3170, 1583);
		this.sGround2.lineTo(2870, 1576);
		this.sGround2.lineTo(2522, 1554);
		this.sGround2.lineTo(2468, 1494);
		this.sGround2.lineTo(2467, 1460);
		this.sGround2.fill({ texture: Gradient.getLinearGradientTexture(["#6BD354", "#54BA3D"]), matrix: m });
		this.sGround2.stroke({ width: 6, color: 0x2da12e, alpha: 1 });

		// main body
		this.DrawGroundCircle(3321, 1586, 26.5);
		this.DrawGroundCircle(3806, 1612, 26.5);
		this.DrawGroundCircle(3899, 1612, 26.5);
		this.DrawGroundCircle(3933, 1610, 26.5);
		this.DrawGroundCircle(3941, 1602, 26.5);
		this.DrawGroundCircle(3923, 1578, 26.5);
		this.DrawGroundCircle(3843, 1612, 38);
		this.DrawGroundCircle(3749, 1592, 38);
		this.DrawGroundCircle(3365, 1578, 38);
		this.DrawGroundCircle(3403, 1594, 38);
		this.DrawGroundCircle(3257, 1560, 38);
		this.DrawGroundCircle(3123, 1546, 38);
		this.DrawGroundCircle(2469, 1508, 38);
		this.DrawGroundCircle(2422, 1482, 38);
		this.DrawGroundCircle(2432, 1459, 38);
		this.DrawGroundCircle(2516, 1492, 63);
		this.DrawGroundCircle(2616, 1474, 63);
		this.DrawGroundCircle(3016, 1525, 63);
		this.DrawGroundCircle(3174, 1520, 63);
		this.DrawGroundCircle(3642, 1598, 63);
		this.DrawGroundCircle(3458, 1570, 63);
		this.DrawGroundCircle(3524, 1581, 80);
		this.DrawGroundCircle(2696, 1479, 80);
		this.DrawGroundCircle(2824, 1482, 104);

		this.DrawRock(0, 477, 1572, 35);
		this.DrawRock(1, 761, 1702, 35);
		this.DrawRock(1, 1301, 1541, 35);
		this.DrawRock(2, 1436, 1481, 35);
		this.DrawRock(2, 1915, 1478, 35);
		this.DrawRock(2, 2518, 1500, 35);
		this.DrawRock(0, 2710, 1468, 35);
		this.DrawRock(2, 3187, 1516, 35);
		this.DrawRock(2, 3582, 1621, 35);
		this.DrawRock(1, 5461, 1755, 35);
		this.DrawRock(1, 6109, 1701, 35);
		this.DrawRock(0, 6235, 1864, 35);
		this.DrawRock(1, 6973, 1686, 35);
		this.DrawRock(0, 7382, 1636, 35);
		this.DrawRock(2, 7855, 2034, 35);
		this.DrawRock(1, 9263, 2104, 35);
		this.DrawRock(0, 9672, 1776, 35);
		this.DrawRock(1, 10080, 1853, 52);
		this.DrawRock(2, 8386, 1861, 52);
		this.DrawRock(0, 7720, 1696, 52);
		this.DrawRock(1, 6791, 1747, 52);
		this.DrawRock(2, 6388, 1707, 52);
		this.DrawRock(2, 5608, 1677, 52);
		this.DrawRock(0, 2873, 1517, 52);
		this.DrawRock(1, 917, 1496, 52);
		this.DrawRock(1, 1593, 1556, 69);
		this.DrawRock(1, 7714, 1816, 69);
		this.DrawRock(0, 1123, 1634, 86);
		this.DrawRock(2, 5805, 1873, 86);
		this.DrawRock(0, 7928, 1816, 86);
		this.DrawRock(2, 8495, 2059, 106);
		this.DrawRock(2, 7510, 1875, 106);
		this.DrawRock(2, 5206, 1986, 106);
		this.DrawRock(0, 9708, 1895, 137.5);

		this.view.addChild(this.sGround1);
		this.view.addChild(this.sGround2);
		this.view.addChild(this.sGround3);
	}

	/**
	 * Per-frame reposition/rescale, faithful to ControllerTutorial.Update
	 * (:1083-1107). Sets the on-screen target width via the Pixi `width` setter on
	 * sGround1 — which makes Pixi compute scale.x = targetWidthPx / localContentWidth
	 * — then copies scale.y = scale.x, and copies that uniform scale onto sGround2/3
	 * (matching the legacy, which copies sGround1.scale.x onto the others). Anchors
	 * each sGround's local origin at World2Screen(anchor). Visibility culling uses
	 * the LIVE canvasW in place of the legacy hardcoded 800 stage width.
	 */
	update(cam: CameraState, canvasW: number, canvasH: number): void {
		if (!this.sGround1 || !this.sGround2 || !this.sGround3) return;

		// Scale (legacy `hasZoomed` block :1084-1090). targetWidthPx =
		// World2ScreenX(29.34) - World2ScreenX(0) = 29.34 * scale.
		this.sGround1.width = w2sX(29.34, cam, canvasW) - w2sX(0, cam, canvasW);
		this.sGround1.scale.y = this.sGround1.scale.x;
		this.sGround2.scale.x = this.sGround1.scale.x;
		this.sGround2.scale.y = this.sGround2.scale.x;
		this.sGround3.scale.x = this.sGround1.scale.x;
		this.sGround3.scale.y = this.sGround3.scale.x;

		// Visibility culling + anchoring (legacy `hasZoomed || hasPanned` block
		// :1091-1106), substituting canvasW for the legacy 800 stage width.
		this.sGround1.visible = w2sX(-41, cam, canvasW) > 0;
		this.sGround2.visible = w2sX(24, cam, canvasW) > 0 && w2sX(-39, cam, canvasW) < canvasW;
		this.sGround3.visible = w2sX(19, cam, canvasW) < canvasW;
		if (this.sGround1.visible) {
			this.sGround1.x = w2sX(-77, cam, canvasW);
			this.sGround1.y = w2sY(-15.3, cam, canvasH);
		}
		if (this.sGround2.visible) {
			this.sGround2.x = w2sX(-75, cam, canvasW);
			this.sGround2.y = w2sY(-15.3, cam, canvasH);
		}
		if (this.sGround3.visible) {
			this.sGround3.x = w2sX(-75, cam, canvasW);
			this.sGround3.y = w2sY(-15.3, cam, canvasH);
		}
	}

	destroy(): void {
		this.view.removeChildren();
		this.sGround1?.destroy();
		this.sGround2?.destroy();
		this.sGround3?.destroy();
		this.sGround1 = null;
		this.sGround2 = null;
		this.sGround3 = null;
		this.built = false;
		this.view.destroy({ children: true });
	}
}
