// Jaybit-format version header constants + helpers (node-clean, no deps).
//
// Jaybit 2.33 prepends two writeUTF fields to every export (robot / replay /
// challenge): a sentinel prefix and a "version + type tag" string
// (Database.as ExportRobot :2081-2107 / ExportChallenge :1948-1974 /
// ExportReplay :1655-1695). On import the first UTF is compared against the
// prefix — since a legacy CE code's first UTF is the user-typed name and no
// name equals the sentinel, presence of the prefix unambiguously marks a
// Jaybit-format code (ImportRobot :3159-3188 et al.). The version string
// itself is informational only: no 2.33 code path parses it back out of a
// loaded code (only the main-menu update check consumes CheckVersionNumber).

import { ByteArray } from "../General/ByteArray";
import { Base64Decoder } from "../mx/utils/Base64Decoder";
import { Base64Encoder } from "../mx/utils/Base64Encoder";

/** The sentinel written as the first UTF of every Jaybit-format export (Database.as:194). */
export const VERSION_PREFIX = "kezcuvwistoup";

/**
 * The version our exports embed after the prefix (Jaybit writes
 * Main.VERSION_STRING = "2.33.0.1"). We use our own dotted-quad so Jaybit's
 * CheckVersionNumber can still parse it (4 numeric "."-separated components):
 * 2.34.0.0 identifies this TS port as a post-2.33.0.1 lineage while remaining
 * format-identical. Nothing in Jaybit gates loading on this value.
 */
export const VERSION_STRING = "2.34.0.0";

/** Type tags appended to the version string (write-only; never parsed back). */
export const TYPE_TAG_ROBOT = " ibro";
export const TYPE_TAG_REPLAY = " ibre";
export const TYPE_TAG_CHALLENGE = " ibch";

// --- CheckVersionNumber (Database.as:865-927) ------------------------------

export const SAME_VERSION = 0;
export const NEWER_VERSION = 1;
export const OLDER_VERSION = -1;

/**
 * Compare an incoming dotted version string against OUR version string.
 * Faithful port of Database.CheckVersionNumber: exact match => SAME_VERSION;
 * our version is truncated at the first "a"/"b" (alpha/beta suffix); both are
 * split on "." into exactly 4 numeric components (missing/NaN => 0) and
 * compared lexicographically; equal numbers but we're a prerelease =>
 * NEWER_VERSION. Only used for update checks — codes are never version-gated.
 */
export function checkVersionNumber(theirs: string, ours: string = VERSION_STRING): number {
	if (ours === theirs) return SAME_VERSION;
	let ownVersion = ours;
	const theirParts = theirs.split(".", 4);
	let suffixIndex = ownVersion.search("a");
	let isPrerelease = suffixIndex > -1;
	if (!isPrerelease) {
		suffixIndex = ownVersion.search("b");
		isPrerelease = suffixIndex > -1;
	}
	if (isPrerelease) ownVersion = ownVersion.substring(0, suffixIndex);
	const ownParts = ownVersion.split(".", 4);
	const theirNums: number[] = new Array(4);
	const ownNums: number[] = new Array(4);
	for (let i = 0; i < 4; i++) {
		theirNums[i] = i < theirParts.length && !isNaN(parseInt(theirParts[i])) ? parseInt(theirParts[i]) : 0;
		ownNums[i] = i < ownParts.length && !isNaN(parseInt(ownParts[i])) ? parseInt(ownParts[i]) : 0;
	}
	for (let i = 0; i < 4; i++) {
		if (ownNums[i] > theirNums[i]) return OLDER_VERSION;
		if (theirNums[i] > ownNums[i]) return NEWER_VERSION;
	}
	if (isPrerelease) return NEWER_VERSION;
	return SAME_VERSION;
}

// --- Files vs codes (Database.as ImportDecode :259-264 / ExportEncode :2327-2333)

/**
 * A .ibro/.ibre/.ibch FILE is byte-identical to the base64-decode of the text
 * CODE — no extra framing (Jaybit ControllerGame.finishExportingThenSave saves
 * the compressed ByteArray verbatim; ConvertWindow's code->file conversion is
 * a plain base64-decode).
 */
export function codeToFileBytes(code: string): Uint8Array {
	const decoder = new Base64Decoder();
	decoder.decode(code);
	const b = decoder.toByteArray();
	return new Uint8Array(b.buffer.subarray(0, b.length));
}

/** The inverse: a file's bytes base64-encoded ARE the text code. */
export function fileBytesToCode(bytes: ArrayBuffer | Uint8Array): string {
	const encoder = new Base64Encoder();
	encoder.insertNewLines = false;
	encoder.encodeBytes(new ByteArray(bytes as ArrayBuffer));
	return encoder.toString();
}

/**
 * Database.IsEncryptedText (:3450-3453): a text export code always starts
 * with "eN" because zlib output starts 0x78 0xDA (deflate, max compression)
 * and base64("\x78\xDA…") = "eN…". Used to sniff whether loaded file bytes
 * are a pasted text code or the raw compressed blob
 * (ControllerGame.loadRobotBrowseComplete :1008-1029).
 */
export function isEncryptedText(s: string): boolean {
	return s.indexOf("eN") === 0;
}

/**
 * Sniff loaded file bytes: if they are ASCII text starting with "eN" they are
 * a base64 CODE pasted into a file (return it as a string); otherwise they are
 * the raw compressed blob. Mirrors loadRobotBrowseComplete's
 * readUTFBytes+indexOf("eN") test — only the first two bytes matter.
 */
export function sniffFileBytes(bytes: ArrayBuffer | Uint8Array): { kind: "code"; code: string } | { kind: "binary" } {
	const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	if (u8.length >= 2 && u8[0] === 0x65 /* e */ && u8[1] === 0x4e /* N */) {
		// Base64 codes are pure ASCII, so a byte-wise char decode is exact.
		let code = "";
		for (let i = 0; i < u8.length; i++) code += String.fromCharCode(u8[i]);
		return { kind: "code", code: code.trim() };
	}
	return { kind: "binary" };
}

/**
 * Sanitize a robot/replay/challenge name into a save filename, exactly as
 * ControllerGame.finishExportingThenSave (:6521-6560): the special-character
 * class is replaced with "_", the result capped at 150 chars, and an empty
 * result falls back to "new" + type ("newrobot" / "newreplay" / "newchallenge").
 * The caller appends the extension (.ibro/.ibre/.ibch).
 */
export function sanitizeFileName(name: string, type: "robot" | "replay" | "challenge"): string {
	let sanitized = name.replace(/[\/\\\:\*\?\"\<\>\|\%\.\,\[\]\'\=\;\^ ]/gi, "_");
	if (sanitized.length > 150) sanitized = sanitized.substring(0, 150);
	if (sanitized.length === 0) sanitized = "new" + type;
	return sanitized;
}
