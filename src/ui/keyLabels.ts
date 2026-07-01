// keyCode <-> human label helper for the part-inspector key fields.
//
// Parts store control keys as numeric JS keyCodes (e.g. RevoluteJoint.motorCWKey
// = 39 for Right arrow, TextPart.displayKey = 32 for Space). The inspector shows
// them as short labels. This mirrors the subset of Input.ascii the editor cares
// about (Input itself pulls in Pixi + ControllerGame, so we keep a lean, DOM-free
// table here instead of importing it into the Vue panels).

const KEY_TABLE: Record<number, string> = {
	32: "Space",
	37: "Left",
	38: "Up",
	39: "Right",
	40: "Down",
};

// Letters and digits map directly to their character.
for (let c = 65; c <= 90; c++) KEY_TABLE[c] = String.fromCharCode(c); // A-Z
for (let d = 48; d <= 57; d++) KEY_TABLE[d] = String.fromCharCode(d); // 0-9

const LABEL_TABLE: Record<string, number> = {};
for (const [code, label] of Object.entries(KEY_TABLE)) {
	LABEL_TABLE[label.toLowerCase()] = Number(code);
}

/** keyCode -> display label ("A", "Space", "Left", ...). "" for unset/unknown. */
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
