import { describe, it, expect } from "vitest";
import { keyCodeToLabel } from "../src/ui/keyLabel";

describe("keyCodeToLabel", () => {
	it("maps arrow keys to glyphs", () => {
		expect(keyCodeToLabel(37)).toBe("←");
		expect(keyCodeToLabel(38)).toBe("↑");
		expect(keyCodeToLabel(39)).toBe("→");
		expect(keyCodeToLabel(40)).toBe("↓");
	});

	it("maps named keys", () => {
		expect(keyCodeToLabel(32)).toBe("Space");
		expect(keyCodeToLabel(13)).toBe("Enter");
		expect(keyCodeToLabel(27)).toBe("Esc");
	});

	it("maps A-Z to uppercase letters", () => {
		expect(keyCodeToLabel(65)).toBe("A");
		expect(keyCodeToLabel(90)).toBe("Z");
	});

	it("maps top-row and numpad digits", () => {
		expect(keyCodeToLabel(48)).toBe("0");
		expect(keyCodeToLabel(57)).toBe("9");
		expect(keyCodeToLabel(96)).toBe("0");
		expect(keyCodeToLabel(105)).toBe("9");
	});

	it("falls back to K<code> for unknown keys", () => {
		expect(keyCodeToLabel(112)).toBe("K112");
	});
});
