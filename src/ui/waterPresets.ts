// Pure water-settings helpers for WaterSettingsPanel.vue — faithful port of the
// value logic in Gui/WaterWindow.as (v0.00.33b) + the WC_* ranges/defaults in
// General/Util.as and Control/WaterControl.as. Kept UI-framework-free so it can
// be unit-tested (test/water-panel.test.ts) and reused by the panel.

// --- WC_* slider ranges (Util.as:96-112) + slider defaults (WCxxxDefault). ---
/** Util.WC_DENSITY_MIN_DEF (Util.as:96). */
export const WC_DENSITY_MIN = 0.1;
/** Util.WC_DENSITY_MAX_DEF (Util.as:100). */
export const WC_DENSITY_MAX = 40;
/** Util.WCDensityDefault() = WC_DENSITY_VAL_DEF (Util.as:98,247). */
export const WC_DENSITY_DEFAULT = 20;

/** Util.WC_LINEAR_MIN_DEF (Util.as:102). */
export const WC_LINEAR_MIN = 0;
/** Util.WC_LINEAR_MAX_DEF (Util.as:106). */
export const WC_LINEAR_MAX = 40;
/** Util.WCLinearDragDefault() = WC_LINEAR_VAL_DEF (Util.as:104,252). */
export const WC_LINEAR_DEFAULT = 5;

/** Util.WC_ANGULAR_MIN_DEF (Util.as:108). */
export const WC_ANGULAR_MIN = 0;
/** Util.WC_ANGULAR_MAX_DEF (Util.as:112). */
export const WC_ANGULAR_MAX = 40;
/** Util.WCAngularDragDefault() = WC_ANGULAR_VAL_DEF (Util.as:110,257). */
export const WC_ANGULAR_DEFAULT = 2;

/** WaterControl.HEIGHT_DEFAULT (WaterControl.as:25). */
export const WC_HEIGHT_DEFAULT = 0;
/** WaterControl.HEIGHTOSC_DEFAULT (WaterControl.as:29). */
export const WC_HEIGHTOSC_DEFAULT = 0.167;
/** WaterControl.HEIGHTOSCSPEED_DEFAULT (WaterControl.as:31). */
export const WC_HEIGHTOSCSPEED_DEFAULT = 4000;

/** Util.Clamp (Util.as:544). */
export function clamp(v: number, min: number, max: number): number {
	return v > max ? max : v < min ? min : v;
}

/** Clamp + round to a 0-255 integer (waterColorLostFocus, :579). */
export function clampByte(n: number): number {
	if (Number.isNaN(n)) return 0;
	return Math.max(0, Math.min(255, Math.round(n)));
}

/** Util.HexColor (Util.as:412): clamp each channel 0-255 then pack 0xRRGGBB. */
export function hexColor(r: number, g: number, b: number): number {
	return (clampByte(r) << 16) + (clampByte(g) << 8) + clampByte(b);
}

/** Util.GetRedFromHex (Util.as:417). */
export function redFromHex(c: number): number {
	return (c >> 16) & 0xff;
}

/** Util.GetGreenFromHex (Util.as:422). */
export function greenFromHex(c: number): number {
	return (c >> 8) & 0xff;
}

/** Util.GetBlueFromHex (Util.as:428). */
export function blueFromHex(c: number): number {
	return c & 0xff;
}

// --- Sanitizers, one per WaterWindow.as SanitizeXxx (WaterWindow.as:385-443). ---
// Each parses the raw text; on NaN falls back to the field default, else clamps
// to the WC_* range. The panel calls these on the raw input strings on Okay.

/** WaterWindow.SanitizeDensity (:385). */
export function sanitizeDensity(raw: string | number): number {
	const v = parseFloat(String(raw));
	if (Number.isNaN(v)) return WC_DENSITY_DEFAULT;
	return clamp(v, WC_DENSITY_MIN, WC_DENSITY_MAX);
}

/** WaterWindow.SanitizeLinearDrag (:425). */
export function sanitizeLinearDrag(raw: string | number): number {
	const v = parseFloat(String(raw));
	if (Number.isNaN(v)) return WC_LINEAR_DEFAULT;
	return clamp(v, WC_LINEAR_MIN, WC_LINEAR_MAX);
}

/** WaterWindow.SanitizeAngularDrag (:435). */
export function sanitizeAngularDrag(raw: string | number): number {
	const v = parseFloat(String(raw));
	if (Number.isNaN(v)) return WC_ANGULAR_DEFAULT;
	return clamp(v, WC_ANGULAR_MIN, WC_ANGULAR_MAX);
}

/** WaterWindow.SanitizeHeight (:395) — Clamp(v, -MAX, MAX) is effectively no clamp. */
export function sanitizeHeight(raw: string | number): number {
	const v = parseFloat(String(raw));
	if (Number.isNaN(v)) return WC_HEIGHT_DEFAULT;
	return v;
}

/** WaterWindow.SanitizeHeightOsc (:405) — Clamp(v, 0, MAX) = max(0, v). */
export function sanitizeHeightOsc(raw: string | number): number {
	const v = parseFloat(String(raw));
	if (Number.isNaN(v)) return WC_HEIGHTOSC_DEFAULT;
	return Math.max(0, v);
}

/** WaterWindow.SanitizeSpeed (:415) — parseInt; the int Clamp is a no-op in range. */
export function sanitizeSpeed(raw: string | number): number {
	const v = parseInt(String(raw), 10);
	if (Number.isNaN(v)) return WC_HEIGHTOSCSPEED_DEFAULT;
	return v;
}

// --- Colour combo (WaterWindow.as:257-270 labels, :18 PRE_COLORS). ---
// Index 0 ("--") is the sentinel for "no matching preset"; its PRE_COLORS entry
// HexColor(0,0,0) = 0x000000 is never selected as a preset (indexOf > 0 guard).
export const WATER_COLOR_LABELS = [
	"--",
	"Red",
	"Orange",
	"Yellow",
	"Green",
	"Turquoise",
	"Blue",
	"Purple",
	"Pink",
	"Beige",
	"Brown",
	"White",
	"Grey",
	"Black",
];

/** WaterWindow.PRE_COLORS (:18), each = Util.HexColor(r,g,b). */
export const WATER_PRE_COLORS = [
	hexColor(0, 0, 0), // -- (sentinel)
	hexColor(255, 0, 0), // Red
	hexColor(253, 116, 10), // Orange
	hexColor(251, 241, 56), // Yellow
	hexColor(80, 255, 72), // Green
	hexColor(52, 245, 227), // Turquoise
	hexColor(54, 89, 255), // Blue
	hexColor(189, 87, 255), // Purple
	hexColor(255, 155, 152), // Pink
	hexColor(255, 216, 136), // Beige
	hexColor(151, 122, 46), // Brown
	hexColor(253, 253, 253), // White
	hexColor(160, 160, 160), // Grey
	hexColor(24, 24, 24), // Black
];

/**
 * WaterWindow.SetColorBoxIndex (:604) / seed logic (:271): the combo index for a
 * colour is its PRE_COLORS position when that is > 0, otherwise 0 ("--").
 */
export function presetIndexForColor(color: number): number {
	const i = WATER_PRE_COLORS.indexOf(color >>> 0);
	return i > 0 ? i : 0;
}
