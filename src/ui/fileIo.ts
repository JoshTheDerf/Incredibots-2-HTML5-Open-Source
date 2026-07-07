// UI-side file download/upload helpers for the Jaybit Save-to-File / Load-from-File
// / Convert flows. The headless core only ever deals in bytes (stays node-clean);
// turning those bytes into a browser download or reading them back from a
// <input type="file"> is a purely presentational concern that lives here.
//
// Filename rules mirror ControllerGame.finishExportingThenSave (serialization-compat
// §3): sanitizeFileName(name, type) + the .ibro/.ibre/.ibch extension.

import { sanitizeFileName } from "../core";

export type IbFileType = "robot" | "replay" | "challenge";

const EXTENSIONS: Record<IbFileType, string> = {
	robot: ".ibro",
	replay: ".ibre",
	challenge: ".ibch",
};

/** The IB2 file extension for a save type (.ibro / .ibre / .ibch). */
export function fileExtension(type: IbFileType): string {
	return EXTENSIONS[type];
}

/**
 * The `accept` attribute for a file input loading this save type. We accept the
 * IB2 extension plus `.txt` so a user who saved an exported CODE into a plain
 * text file can still pick it — the core sniffs the "eN" prefix and routes it
 * through the text-code path (serialization-compat §3).
 */
export function fileAccept(type: IbFileType): string {
	return `${EXTENSIONS[type]},.txt`;
}

/**
 * The full download filename: sanitizeFileName(name, type) + extension. Faithful
 * port of ControllerGame.finishExportingThenSave (:6521-6560).
 */
export function saveFileName(name: string, type: IbFileType): string {
	return sanitizeFileName(name, type) + EXTENSIONS[type];
}

/** Trigger a browser download of raw bytes as `filename`. */
export function downloadBytes(bytes: Uint8Array, filename: string): void {
	const blob = new Blob([bytes as unknown as BlobPart], { type: "application/octet-stream" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

/** Read a picked File as raw bytes (for the binary import path). */
export async function readFileBytes(file: File): Promise<Uint8Array> {
	return new Uint8Array(await file.arrayBuffer());
}
