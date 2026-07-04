// IB3 superset per-part fields (Part.ts): graphicType, borderOpacity, locked,
// visualInSim, scaleToZoom. IB2 lacked all five; they are now first-class Part
// fields so IB3 codes import + persist without loss. `locked` is additionally
// FUNCTIONAL (a locked part can't be dragged, but stays selectable so it can be
// unlocked). The others are stored/round-tripped (render/edit UI follow-ups).

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { ByteArray } from "../src/General/ByteArray";
import { decodeIB3FromByteArray } from "../src/core/ib3Import";
import { decodeRobot, encodeRobot } from "../src/core/robotSerialization";
import { SandboxSettings } from "../src/Game/SandboxSettings";
import { Circle } from "../src/Parts/Circle";

/** A synthetic IB3 stream carrying one circle with the given extra fields. */
function ib3CircleBytes(extra: Record<string, unknown>): ByteArray {
	const b = new ByteArray();
	b.writeUTF("0.00.33b");
	b.writeInt(0);
	const parts: any = [{
		name: "Circle", x: 0, y: 0, radius: 1, angle: 0, density: 16, friction: 16,
		restitution: 12, collA: true, collB: true, collC: true, collD: true, buoyant: true,
		draggable: true, fixated: false, color: 0xff0000, opacity: 200, outlines: true, ...extra,
	}];
	parts.type = 16; parts.fixed = false; parts.toString = () => "[Vector.<Parts.Part>]";
	b.writeObject(parts);
	b.writeObject({ size: 0, groundType: 0, gravityY: 15 });
	b.writeUTF(""); b.writeUTF(""); b.writeUTF(""); b.writeUTF(""); b.writeUTF("");
	b.writeInt(0); b.writeInt(1);
	b.position = 0;
	return b;
}

describe("IB3 superset per-part fields import", () => {
	it("imports graphicType / borderOpacity / locked / visualInSim / scaleToZoom", () => {
		const { robot } = decodeIB3FromByteArray(
			ib3CircleBytes({ graphicType: 3, borderOpacity: 128, locked: true, visualInSim: false, scaleToZoom: true }),
		);
		const c = robot.parts[0] as Circle;
		expect(c.graphicType).toBe(3);
		expect(c.borderOpacity).toBe(128);
		expect(c.locked).toBe(true);
		expect(c.visualInSim).toBe(false);
		expect(c.scaleToZoom).toBe(true);
	});

	it("defaults the fields to classic IB2 values when absent (0/255/false/true/false)", () => {
		const { robot } = decodeIB3FromByteArray(ib3CircleBytes({}));
		const c = robot.parts[0] as Circle;
		expect(c.graphicType).toBe(0);
		expect(c.borderOpacity).toBe(255);
		expect(c.locked).toBe(false);
		expect(c.visualInSim).toBe(true);
		expect(c.scaleToZoom).toBe(false);
	});
});

describe("IB3 superset per-part fields round-trip through save/load", () => {
	it("preserves all five through the native robot format", async () => {
		const c = new Circle(0, 0, 1, false);
		c.graphicType = 2;
		c.borderOpacity = 64;
		c.locked = true;
		c.visualInSim = false;
		c.scaleToZoom = true;
		const code = await encodeRobot([c], new SandboxSettings(15, 0, 0, 0, 0, 0, 0, 0));
		const decoded = await decodeRobot(code);
		const out = decoded.parts[0] as Circle;
		expect(out.graphicType).toBe(2);
		expect(out.borderOpacity).toBe(64);
		expect(out.locked).toBe(true);
		expect(out.visualInSim).toBe(false);
		expect(out.scaleToZoom).toBe(true);
	});

	it("clone (MakeCopy) carries the fields", () => {
		const c = new Circle(0, 0, 1, false);
		c.graphicType = 5;
		c.borderOpacity = 100;
		c.locked = true;
		const copy = c.MakeCopy() as Circle;
		expect(copy.graphicType).toBe(5);
		expect(copy.borderOpacity).toBe(100);
		expect(copy.locked).toBe(true);
	});
});

describe("locked is functional: a locked part can't be dragged", () => {
	function coreWith(parts: Circle[]): { core: GameCore; ids: number[] } {
		parts.forEach((p, i) => (p.id = i + 1));
		const state = createInitialState();
		state.parts = [...parts];
		const core = new GameCore(state);
		return { core, ids: parts.map((p) => p.id) };
	}

	it("moveParts does NOT move a locked part", () => {
		const c = new Circle(10, 10, 1, false);
		const { core, ids } = coreWith([c]);
		core.dispatch({ type: "setLocked", partIds: ids, value: true });
		core.dispatch({ type: "select", partIds: ids });
		core.dispatch({ type: "moveParts", partIds: ids, dx: 5, dy: 5 });
		const moved = core.getState().parts.find((p) => p.id === ids[0]) as Circle;
		expect(moved.centerX).toBe(10); // unmoved
		expect(moved.centerY).toBe(10);
	});

	it("moveParts moves an unlocked part normally", () => {
		const c = new Circle(10, 10, 1, false);
		const { core, ids } = coreWith([c]);
		core.dispatch({ type: "select", partIds: ids });
		core.dispatch({ type: "moveParts", partIds: ids, dx: 5, dy: -3 });
		const moved = core.getState().parts.find((p) => p.id === ids[0]) as Circle;
		expect(moved.centerX).toBe(15);
		expect(moved.centerY).toBe(7);
	});

	it("a locked part stays SELECTABLE (so it can be unlocked)", () => {
		const c = new Circle(0, 0, 1, false);
		const { core, ids } = coreWith([c]);
		core.dispatch({ type: "setLocked", partIds: ids, value: true });
		core.dispatch({ type: "select", partIds: ids });
		expect(core.getState().edit.selection).toEqual(ids);
		// ...and unlocking restores movability.
		core.dispatch({ type: "setLocked", partIds: ids, value: false });
		core.dispatch({ type: "moveParts", partIds: ids, dx: 4, dy: 0 });
		expect((core.getState().parts.find((p) => p.id === ids[0]) as Circle).centerX).toBe(4);
	});

	it("setBorderOpacity sets + clamps to 0..255; setVisualInSim toggles", () => {
		const c = new Circle(0, 0, 1, false);
		const { core, ids } = coreWith([c]);
		core.dispatch({ type: "setBorderOpacity", partIds: ids, value: 100 });
		expect((core.getState().parts.find((p) => p.id === ids[0]) as Circle).borderOpacity).toBe(100);
		core.dispatch({ type: "setBorderOpacity", partIds: ids, value: 999 });
		expect((core.getState().parts.find((p) => p.id === ids[0]) as Circle).borderOpacity).toBe(255);
		core.dispatch({ type: "setBorderOpacity", partIds: ids, value: -5 });
		expect((core.getState().parts.find((p) => p.id === ids[0]) as Circle).borderOpacity).toBe(0);
		core.dispatch({ type: "setVisualInSim", partIds: ids, value: false });
		expect((core.getState().parts.find((p) => p.id === ids[0]) as Circle).visualInSim).toBe(false);
		core.dispatch({ type: "setScaleToZoom", partIds: ids, value: true });
		expect((core.getState().parts.find((p) => p.id === ids[0]) as Circle).scaleToZoom).toBe(true);
	});
});
