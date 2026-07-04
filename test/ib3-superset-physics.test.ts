// IB3 superset physics: horizontal gravity (gravityX) and the restitution combine
// mode (restitutionType). IB2 had neither — IB3 applies b2Vec2(gravityX, gravityY)
// (Control/Physics.as:176) and b2Settings.useRestitution (SandboxControl.as:113).
// These are now first-class SandboxState fields, imported, persisted, and applied
// at world creation. Defaults (0 / 0 = RES_HIGHEST) reproduce classic IB2 behaviour.

import { describe, expect, it, afterEach } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { box2d20Backend } from "../src/core/physics";
import { setPhysicsBackend } from "../src/Parts/partGlobals";
import { b2Settings as b2Settings21 } from "../src/Box2D21";
import { ByteArray } from "../src/General/ByteArray";
import { decodeIB3FromByteArray } from "../src/core/ib3Import";
import { decodeRobot, encodeRobot } from "../src/core/robotSerialization";
import { SandboxSettings } from "../src/Game/SandboxSettings";
import { Rectangle } from "../src/Parts/Rectangle";

const GRAVITY_DIVISOR = 1.63098878695;

function ib3SettingsBytes(settings: Record<string, unknown>): ByteArray {
	const b = new ByteArray();
	b.writeUTF("0.00.33b");
	b.writeInt(0);
	b.writeObject([]);
	b.writeObject(settings);
	b.writeUTF(""); b.writeUTF(""); b.writeUTF(""); b.writeUTF(""); b.writeUTF("");
	b.writeInt(0); b.writeInt(1);
	b.position = 0;
	return b;
}

describe("IB3 superset: horizontal gravity (gravityX)", () => {
	afterEach(() => setPhysicsBackend(box2d20Backend));

	it("createWorld applies sandbox.gravityX as the world's horizontal gravity", () => {
		const state = createInitialState();
		expect(state.sandbox.gravityX).toBe(0); // classic default
		state.sandbox = { ...state.sandbox, gravityX: 5, gravity: 12 };
		const core = new GameCore(state);
		core.dispatch({ type: "play" });
		const g = core.getState().world!.m_gravity;
		expect(g.x).toBe(5);
		expect(g.y).toBe(12);
	});

	it("imports IB3 gravityX (converted to m/s^2 like gravityY)", () => {
		const { robot } = decodeIB3FromByteArray(ib3SettingsBytes({ gravityX: 8, gravityY: 16 }));
		expect(robot.settings.gravityX).toBeCloseTo(8 / GRAVITY_DIVISOR);
		expect(robot.settings.gravity).toBeCloseTo(16 / GRAVITY_DIVISOR);
	});

	it("gravityX round-trips through robot save/load", async () => {
		const settings = new SandboxSettings(15, 0, 0, 0, 0, 0, 0, 0);
		settings.gravityX = -7.5;
		const code = await encodeRobot([new Rectangle(0, 0, 2, 2)], settings);
		const decoded = await decodeRobot(code);
		expect(decoded.settings.gravityX).toBeCloseTo(-7.5);
	});
});

describe("IB3 superset: restitution combine mode (restitutionType)", () => {
	afterEach(() => {
		setPhysicsBackend(box2d20Backend);
		b2Settings21.useRestitution = 0; // don't leak the global into other suites
	});

	it("engine 1 world creation applies b2Settings.useRestitution from restitutionType", () => {
		const state = createInitialState();
		state.sandbox = { ...state.sandbox, physicsEngine: 1, restitutionType: 3 };
		const core = new GameCore(state);
		core.dispatch({ type: "play" });
		expect(b2Settings21.useRestitution).toBe(3);
	});

	it("default restitutionType (0 = highest) is applied — classic IB2 behaviour", () => {
		const state = createInitialState();
		expect(state.sandbox.restitutionType).toBe(0);
		state.sandbox = { ...state.sandbox, physicsEngine: 1 };
		const core = new GameCore(state);
		core.dispatch({ type: "play" });
		expect(b2Settings21.useRestitution).toBe(0);
	});

	it("imports + round-trips restitutionType", async () => {
		const { robot } = decodeIB3FromByteArray(ib3SettingsBytes({ restitutionType: 4, gravityY: 16 }));
		expect(robot.settings.restitutionType).toBe(4);
		const settings = new SandboxSettings(15, 0, 0, 0, 0, 0, 0, 0);
		settings.restitutionType = 2;
		const decoded = await decodeRobot(await encodeRobot([new Rectangle(0, 0, 2, 2)], settings));
		expect(decoded.settings.restitutionType).toBe(2);
	});
});

describe("setSandboxSettings carries the IB3 superset physics fields", () => {
	it("stores gravityX + restitutionType from the command", () => {
		const core = new GameCore();
		core.dispatch({
			type: "setSandboxSettings",
			gravity: 15, size: 0, terrainType: 0, terrainTheme: 0,
			background: 0, backgroundR: 0, backgroundG: 0, backgroundB: 0,
			gravityX: 6, restitutionType: 2,
		});
		expect(core.getState().sandbox.gravityX).toBe(6);
		expect(core.getState().sandbox.restitutionType).toBe(2);
	});

	it("preserves them when the command omits them", () => {
		const core = new GameCore();
		core.dispatch({
			type: "setSandboxSettings",
			gravity: 15, size: 0, terrainType: 0, terrainTheme: 0,
			background: 0, backgroundR: 0, backgroundG: 0, backgroundB: 0,
			gravityX: 9, restitutionType: 5,
		});
		core.dispatch({
			type: "setSandboxSettings",
			gravity: 20, size: 0, terrainType: 0, terrainTheme: 0,
			background: 0, backgroundR: 0, backgroundG: 0, backgroundB: 0,
		});
		expect(core.getState().sandbox.gravityX).toBe(9);
		expect(core.getState().sandbox.restitutionType).toBe(5);
	});
});
