// Wave 4c — pure filename/extension mapping for the Save-to-File / Load-from-File
// UI (src/ui/fileIo.ts). Only the pure helpers are exercised here (downloadBytes /
// readFileBytes are DOM-bound and belong to a browser run).

import { describe, expect, it } from "vitest";
import { fileExtension, fileAccept, saveFileName } from "../src/ui/fileIo";

describe("fileIo naming", () => {
	it("maps each save type to its IB2 extension", () => {
		expect(fileExtension("robot")).toBe(".ibro");
		expect(fileExtension("replay")).toBe(".ibre");
		expect(fileExtension("challenge")).toBe(".ibch");
	});

	it("accept includes the type extension and .txt (for pasted-code files)", () => {
		expect(fileAccept("robot")).toBe(".ibro,.txt");
		expect(fileAccept("challenge")).toBe(".ibch,.txt");
	});

	it("saveFileName sanitizes the name and appends the extension", () => {
		expect(saveFileName("My Robot!", "robot")).toBe("My_Robot!.ibro");
		expect(saveFileName("a/b\\c", "challenge")).toBe("a_b_c.ibch");
	});

	it("saveFileName falls back to new<type> for an empty name", () => {
		expect(saveFileName("", "robot")).toBe("newrobot.ibro");
		expect(saveFileName("", "replay")).toBe("newreplay.ibre");
		// Special chars are REPLACED (not removed), so "..." is non-empty -> "___".
		expect(saveFileName("...", "challenge")).toBe("___.ibch");
	});
});
