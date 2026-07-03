// P6 — water settings panel pure-logic helpers (src/ui/waterPresets.ts).
// Covers the WaterWindow.as value logic the Vue panel relies on: the colour
// combo preset table + index derivation, the HexColor pack/unpack round-trip,
// and each SanitizeXxx clamp/default path.

import { describe, expect, it } from "vitest";
import {
	WATER_COLOR_LABELS,
	WATER_PRE_COLORS,
	blueFromHex,
	clampByte,
	greenFromHex,
	hexColor,
	presetIndexForColor,
	redFromHex,
	sanitizeAngularDrag,
	sanitizeDensity,
	sanitizeHeight,
	sanitizeHeightOsc,
	sanitizeLinearDrag,
	sanitizeSpeed,
} from "../src/ui/waterPresets";

describe("water colour presets", () => {
	it("has one PRE_COLOR per combo label (WaterWindow.as:18,257-270)", () => {
		expect(WATER_COLOR_LABELS.length).toBe(14);
		expect(WATER_PRE_COLORS.length).toBe(14);
	});

	it("packs the exact IB3 preset hex values", () => {
		// WaterWindow.PRE_COLORS Util.HexColor(...) values, :18.
		expect(WATER_PRE_COLORS).toEqual([
			0x000000, 0xff0000, 0xfd740a, 0xfbf138, 0x50ff48, 0x34f5e3, 0x3659ff, 0xbd57ff, 0xff9b98, 0xffd888, 0x977a2e,
			0xfdfdfd, 0xa0a0a0, 0x181818,
		]);
	});

	it("derives the combo index from a colour, with 0/000000 -> '--' (:271,604)", () => {
		expect(presetIndexForColor(0xff0000)).toBe(1); // Red
		expect(presetIndexForColor(0x3659ff)).toBe(6); // Blue
		expect(presetIndexForColor(0x181818)).toBe(13); // Black
		// Pure black (the sentinel PRE_COLORS[0]) is NOT treated as a preset.
		expect(presetIndexForColor(0x000000)).toBe(0);
		// An arbitrary custom colour has no preset -> "--".
		expect(presetIndexForColor(0x123456)).toBe(0);
	});
});

describe("HexColor pack/unpack (Util.as:412-433)", () => {
	it("round-trips r/g/b channels", () => {
		const c = hexColor(253, 116, 10); // Orange
		expect(c).toBe(0xfd740a);
		expect(redFromHex(c)).toBe(253);
		expect(greenFromHex(c)).toBe(116);
		expect(blueFromHex(c)).toBe(10);
	});

	it("clamps out-of-range channels to a byte", () => {
		expect(hexColor(999, -5, 128)).toBe((255 << 16) + (0 << 8) + 128);
		expect(clampByte(300)).toBe(255);
		expect(clampByte(-1)).toBe(0);
		expect(clampByte(Number.NaN)).toBe(0);
		expect(clampByte(127.6)).toBe(128);
	});
});

describe("sanitizers (WaterWindow.as:385-443)", () => {
	it("density: NaN -> 20 default, else clamp [0.1,40]", () => {
		expect(sanitizeDensity("")).toBe(20);
		expect(sanitizeDensity("abc")).toBe(20);
		expect(sanitizeDensity("100")).toBe(40);
		expect(sanitizeDensity("0")).toBe(0.1);
		expect(sanitizeDensity("12.5")).toBe(12.5);
	});

	it("linear drag: NaN -> 5, clamp [0,40]", () => {
		expect(sanitizeLinearDrag("")).toBe(5);
		expect(sanitizeLinearDrag("-3")).toBe(0);
		expect(sanitizeLinearDrag("41")).toBe(40);
	});

	it("angular drag: NaN -> 2, clamp [0,40]", () => {
		expect(sanitizeAngularDrag("")).toBe(2);
		expect(sanitizeAngularDrag("50")).toBe(40);
	});

	it("height: NaN -> 0, otherwise unclamped (incl. negative)", () => {
		expect(sanitizeHeight("")).toBe(0);
		expect(sanitizeHeight("-12.5")).toBe(-12.5);
		expect(sanitizeHeight("500")).toBe(500);
	});

	it("height osc: NaN -> 0.167, clamp to >= 0", () => {
		expect(sanitizeHeightOsc("")).toBe(0.167);
		expect(sanitizeHeightOsc("-4")).toBe(0);
		expect(sanitizeHeightOsc("2.5")).toBe(2.5);
	});

	it("osc duration/speed: parseInt, NaN -> 4000", () => {
		expect(sanitizeSpeed("")).toBe(4000);
		expect(sanitizeSpeed("6000")).toBe(6000);
		expect(sanitizeSpeed("-2000")).toBe(-2000);
	});
});
