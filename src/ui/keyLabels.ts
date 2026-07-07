// keyCode <-> human label helpers (single source of truth).
//
// Parts store control keys as numeric JS keyCodes (e.g. RevoluteJoint.motorCWKey
// = 39 for Right arrow, TextPart.displayKey = 32 for Space). Two consumers need
// labels for them:
//   - the part-inspector key fields (Joint/Thruster/Cannon/TextProps) use the
//     word form via keyToLabel/labelToKey ("Left", "Enter", ...), round-trippable
//     through labelToKey so the user can type a label back in;
//   - MobileControlPad uses the compact button form via keyCodeToLabel (arrow
//     glyphs, numpad digits, "K<code>" fallback so unknown keys stay identifiable).
// This mirrors the subset of Input.ascii the editor cares about (Input itself
// pulls in Pixi + ControllerGame, so we keep a lean, DOM-free table here instead
// of importing it into the Vue panels). Pure + dependency-free so it can be
// unit-tested in isolation.

/** Named word-form labels for common non-alphanumeric keyCodes. */
const NAMED: Record<number, string> = {
	8: "Bksp",
	9: "Tab",
	13: "Enter",
	16: "Shift",
	17: "Ctrl",
	18: "Alt",
	27: "Esc",
	32: "Space",
	37: "Left",
	38: "Up",
	39: "Right",
	40: "Down",
};

/** Compact arrow glyphs for the on-screen control pad buttons. */
const ARROW_GLYPHS: Record<number, string> = {
	37: "←", // ArrowLeft
	38: "↑", // ArrowUp
	39: "→", // ArrowRight
	40: "↓", // ArrowDown
};

const KEY_TABLE: Record<number, string> = { ...NAMED };

// Letters and digits map directly to their character.
for (let c = 65; c <= 90; c++) KEY_TABLE[c] = String.fromCharCode(c); // A-Z
for (let d = 48; d <= 57; d++) KEY_TABLE[d] = String.fromCharCode(d); // 0-9

const LABEL_TABLE: Record<string, number> = {};
for (const [code, label] of Object.entries(KEY_TABLE)) {
	LABEL_TABLE[label.toLowerCase()] = Number(code);
}
// Accept the glyph forms on parse too, so a pasted "←" round-trips.
for (const [code, glyph] of Object.entries(ARROW_GLYPHS)) {
	LABEL_TABLE[glyph] = Number(code);
}

/** keyCode -> display label ("A", "Space", "Left", "Enter", ...). "" for unset/unknown. */
export function keyToLabel(code: number | undefined): string {
	if (code == null) return "";
	return KEY_TABLE[code] ?? "";
}

/** display label -> keyCode. null when the label isn't recognized. */
export function labelToKey(label: string): number | null {
	const key = label.trim().toLowerCase();
	if (key.length === 0) return null;
	return LABEL_TABLE[key] ?? null;
}

/**
 * Map a raw JS keyCode to a short label suitable for a compact button.
 * - Arrows -> arrow glyphs (← ↑ → ↓)
 * - Space/Enter/etc -> word
 * - A-Z (65-90) -> the uppercase letter
 * - 0-9 (48-57) and numpad 0-9 (96-105) -> the digit
 * - anything else -> "K<code>" so it is at least identifiable
 */
export function keyCodeToLabel(code: number): string {
	if (code in ARROW_GLYPHS) return ARROW_GLYPHS[code];
	if (code in NAMED) return NAMED[code];
	if (code >= 65 && code <= 90) return String.fromCharCode(code); // A-Z
	if (code >= 48 && code <= 57) return String.fromCharCode(code); // 0-9
	if (code >= 96 && code <= 105) return String(code - 96); // numpad 0-9
	return `K${code}`;
}
