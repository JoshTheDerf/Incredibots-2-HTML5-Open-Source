// keyCode -> human-readable label helper, used by MobileControlPad to label the
// on-screen buttons for the keys the current robot binds. The core stores raw
// JS keyCodes (e.g. RevoluteJoint.motorCWKey defaults to 39 = ArrowRight), so we
// translate those to short display strings. Pure + dependency-free so it can be
// unit-tested in isolation.

/** Named labels for common non-alphanumeric keyCodes. */
const NAMED: Record<number, string> = {
	8: "Bksp",
	9: "Tab",
	13: "Enter",
	16: "Shift",
	17: "Ctrl",
	18: "Alt",
	27: "Esc",
	32: "Space",
	37: "◀", // ArrowLeft
	38: "▲", // ArrowUp
	39: "▶", // ArrowRight
	40: "▼", // ArrowDown
};

/**
 * Map a raw JS keyCode to a short label suitable for a compact button.
 * - Arrows -> triangle glyphs (◀ ▲ ▶ ▼)
 * - Space/Enter/etc -> word
 * - A-Z (65-90) -> the uppercase letter
 * - 0-9 (48-57) and numpad 0-9 (96-105) -> the digit
 * - anything else -> "K<code>" so it is at least identifiable
 */
export function keyCodeToLabel(code: number): string {
	if (code in NAMED) return NAMED[code];
	if (code >= 65 && code <= 90) return String.fromCharCode(code); // A-Z
	if (code >= 48 && code <= 57) return String.fromCharCode(code); // 0-9
	if (code >= 96 && code <= 105) return String(code - 96); // numpad 0-9
	return `K${code}`;
}
