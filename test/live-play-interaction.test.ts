// CHARACTERIZATION — live play-mode interaction (keyboard control, mouse joint,
// camera follow), ported from ControllerGame.
//
// These exercise the three RUNNING-sim features the way the legacy game did:
//   - keyInput(key, up) forwards to every part's KeyInput, whose per-step Update
//     drives the physics (RevoluteJoint.Update :131-200, Thrusters.Update :63-78,
//     Cannon.Update :193-203, TextPart.KeyInput :73-75).
//   - a b2MouseJoint grabs a body under the cursor and drags it to the target
//     (ControllerGame.MouseDrag :1782-1809).
//   - the view pans to keep an isCameraFocus body centred (HandleCamera
//     :1233-1247): offset = worldCentre * scale in the responsive-canvas frame.

import { describe, expect, it } from "vitest";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { Rectangle } from "../src/Parts/Rectangle";
import { RevoluteJoint } from "../src/Parts/RevoluteJoint";
import { Thrusters } from "../src/Parts/Thrusters";
import { b2RevoluteJoint } from "../src/Box2D";
import type { Part } from "../src/Parts/Part";

function coreWith(parts: Part[]): GameCore {
	parts.forEach((p, i) => (p.id = i + 1));
	const state = createInitialState();
	state.parts = parts;
	return new GameCore(state);
}

/**
 * Two overlapping rectangles joined by a motorised revolute joint. One rectangle
 * is fixated (static) so the other spins about the shared anchor when driven.
 * motorCWKey = 39 (Right), motorCCWKey = 37 (Left) — the RevoluteJoint defaults.
 */
function motorRig(): { core: GameCore; joint: RevoluteJoint; arm: Rectangle } {
	const base = new Rectangle(-1, -1, 2, 2); // centre (0,0)
	base.isStatic = true;
	const arm = new Rectangle(0, -1, 2, 2); // centre (1,0), overlaps base at (0,0)..
	const joint = new RevoluteJoint(base, arm, 0, 0);
	joint.enableMotor = true;
	const core = coreWith([base, arm, joint]);
	return { core, joint, arm };
}

/** The live b2RevoluteJoint's current motor speed after the last Update. */
function motorSpeed(joint: RevoluteJoint): number {
	const b2 = (joint as unknown as { m_joint: b2RevoluteJoint }).m_joint;
	return b2.m_motorSpeed;
}

describe("live keyboard control — revolute motor", () => {
	it("holding the CW key drives the motor at +motorSpeed (RevoluteJoint.Update :152)", () => {
		const { core, joint } = motorRig();
		core.dispatch({ type: "play" });
		core.dispatch({ type: "keyInput", key: 39, up: false }); // Right / CW down
		core.dispatch({ type: "step" }); // one frame runs Update before Step
		expect(motorSpeed(joint)).toBe(joint.motorSpeed);
	});

	it("holding the CCW key drives the motor at -motorSpeed (RevoluteJoint.Update :170)", () => {
		const { core, joint } = motorRig();
		core.dispatch({ type: "play" });
		core.dispatch({ type: "keyInput", key: 37, up: false }); // Left / CCW down
		core.dispatch({ type: "step" });
		expect(motorSpeed(joint)).toBe(0.0 - joint.motorSpeed);
	});

	it("releasing the key stops the motor (no key held -> speed 0, Update :187)", () => {
		const { core, joint } = motorRig();
		core.dispatch({ type: "play" });
		core.dispatch({ type: "keyInput", key: 39, up: false });
		core.dispatch({ type: "step" });
		expect(motorSpeed(joint)).toBe(joint.motorSpeed);
		core.dispatch({ type: "keyInput", key: 39, up: true }); // release
		core.dispatch({ type: "step" });
		expect(motorSpeed(joint)).toBe(0);
	});

	it("a driven motor actually rotates the arm body (angle changes)", () => {
		const { core, joint, arm } = motorRig();
		core.dispatch({ type: "play" });
		const body = arm.GetBody()!;
		const a0 = body.GetAngle();
		core.dispatch({ type: "keyInput", key: 39, up: false });
		core.dispatch({ type: "step", frames: 30 });
		expect(body.GetAngle()).not.toBe(a0);
	});

	it("keyInput is ignored while editing (control is a running-sim feature)", () => {
		const { core, joint } = motorRig();
		// Not played — still editing. The joint has no live b2 joint yet.
		core.dispatch({ type: "keyInput", key: 39, up: false });
		expect((joint as unknown as { m_joint: unknown }).m_joint).toBeFalsy();
	});
});

describe("live keyboard control — thrusters (autoOn requires per-step Update)", () => {
	it("a thruster key held applies force, moving the shape (Thrusters.Update :63-78)", () => {
		const shape = new Rectangle(-1, -1, 2, 2); // centre (0,0)
		const thr = new Thrusters(shape, 0, 0);
		thr.thrustKey = 38; // Up (default)
		const core = coreWith([shape, thr]);
		core.dispatch({ type: "play" });
		// Let gravity settle one frame, record position, then thrust upward.
		core.dispatch({ type: "step", frames: 1 });
		const body = shape.GetBody()!;
		const yBefore = body.GetPosition().y;
		core.dispatch({ type: "keyInput", key: 38, up: false });
		core.dispatch({ type: "step", frames: 20 });
		// Thruster angle is -PI/2 (up), so with force applied the body should be
		// higher (smaller +Y-is-down) than a purely gravity-only fall would give.
		const shapeNoThrust = new Rectangle(-1, -1, 2, 2);
		const core2 = coreWith([shapeNoThrust]);
		core2.dispatch({ type: "play" });
		core2.dispatch({ type: "step", frames: 21 });
		const yFree = shapeNoThrust.GetBody()!.GetPosition().y;
		expect(body.GetPosition().y).toBeLessThan(yFree);
	});
});

describe("camera follow (HandleCamera :1233-1247)", () => {
	it("the view offset tracks the focused body's world centre * scale each step", () => {
		const rect = new Rectangle(-1, -1, 2, 2); // centre (0,0), free to fall
		rect.isCameraFocus = true;
		const core = coreWith([rect]);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 30 });
		const body = rect.GetBody()!;
		// HandleCamera runs at the START of each frame, before world.Step (legacy
		// order :549-580). So the camera reflects the body's centre as it was when
		// the NEXT frame begins. Capture that centre, then step once more: the
		// camera must now equal centreBefore * scale.
		const wc = body.GetWorldCenter();
		const cBefore = { x: wc.x, y: wc.y }; // copy — GetWorldCenter is a live ref
		const scale = core.getState().camera.scale;
		core.dispatch({ type: "step", frames: 1 });
		const st = core.getState();
		// offset = worldCentre * scale (canvas-centre focus), matching the legacy
		// drawXOff = centre*scale - ZOOM_FOCUS with ZOOM_FOCUS = canvas centre.
		expect(st.camera.offsetX).toBeCloseTo(cBefore.x * scale, 6);
		expect(st.camera.offsetY).toBeCloseTo(cBefore.y * scale, 6);
		// The body has fallen (+Y down), so the camera followed it downward.
		expect(st.camera.offsetY).toBeGreaterThan(0);
	});

	it("with no focused part the camera stays put during play", () => {
		const rect = new Rectangle(-1, -1, 2, 2); // NOT camera-focus
		const core = coreWith([rect]);
		const before = { ...core.getState().camera };
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 30 });
		expect(core.getState().camera).toEqual(before);
	});
});

describe("mouse joint (grab/drag a body during play, MouseDrag :1782-1809)", () => {
	it("grabbing a body and moving the target drags it toward the cursor", () => {
		const rect = new Rectangle(-1, -1, 2, 2); // centre (0,0)
		const core = coreWith([rect]);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 1 });
		const body = rect.GetBody()!;
		const x0 = body.GetPosition().x;
		// Grab at the body centre, then drag the target well to the +X side.
		const c = body.GetWorldCenter();
		core.dispatch({ type: "mouseJointStart", worldX: c.x, worldY: c.y });
		core.dispatch({ type: "mouseJointMove", worldX: c.x + 10, worldY: c.y });
		core.dispatch({ type: "step", frames: 20 });
		expect(body.GetPosition().x).toBeGreaterThan(x0);
		core.dispatch({ type: "mouseJointEnd" });
	});

	it("grab misses when the cursor is not over any body (no throw, no effect)", () => {
		const rect = new Rectangle(-1, -1, 2, 2);
		const core = coreWith([rect]);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 1 });
		const x0 = rect.GetBody()!.GetPosition().x;
		core.dispatch({ type: "mouseJointStart", worldX: 100, worldY: 100 }); // empty space
		core.dispatch({ type: "mouseJointMove", worldX: 110, worldY: 100 });
		core.dispatch({ type: "step", frames: 10 });
		// No joint created -> body only responded to gravity, X unchanged-ish.
		expect(rect.GetBody()!.GetPosition().x).toBeCloseTo(x0, 6);
		core.dispatch({ type: "mouseJointEnd" });
	});

	it("mouseJointStart is ignored while editing", () => {
		const rect = new Rectangle(-1, -1, 2, 2);
		const core = coreWith([rect]);
		// editing phase — no world; must not throw.
		expect(() => core.dispatch({ type: "mouseJointStart", worldX: 0, worldY: 0 })).not.toThrow();
	});
});

/**
 * Grab a body at its centre, drag the target +10 in X for 20 frames, and report
 * how far it actually moved. A grabbed body is dragged toward the cursor (large
 * +X); an ungrabbed body only falls (X ~ unchanged).
 */
function dragDeltaX(core: GameCore, body: import("../src/Box2D").b2Body): number {
	const c = body.GetWorldCenter();
	const x0 = body.GetPosition().x;
	core.dispatch({ type: "mouseJointStart", worldX: c.x, worldY: c.y });
	core.dispatch({ type: "mouseJointMove", worldX: c.x + 10, worldY: c.y });
	core.dispatch({ type: "step", frames: 20 });
	const d = body.GetPosition().x - x0;
	core.dispatch({ type: "mouseJointEnd" });
	return d;
}

describe("drag permission gate (MouseDrag :1776-1780 / GetBodyAtMouse :6979)", () => {
	it("a part flagged undragable cannot be grabbed, even in the sandbox", () => {
		const rect = new Rectangle(-1, -1, 2, 2);
		rect.undragable = true; // ShapePart.undragable -> fixture userData.undragable
		const core = coreWith([rect]);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 1 });
		expect(dragDeltaX(core, rect.GetBody()!)).toBeCloseTo(0, 4);
	});

	it("in a challenge, a normal part is NOT draggable while mouseDragAllowed is false", () => {
		const rect = new Rectangle(-1, -1, 2, 2);
		const core = coreWith([rect]);
		core.dispatch({ type: "newChallenge" }); // Challenge.mouseDragAllowed defaults false
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 1 });
		expect(dragDeltaX(core, rect.GetBody()!)).toBeCloseTo(0, 4);
	});

	it("in a challenge that sets mouseDragAllowed, the same part drags to the cursor", () => {
		const rect = new Rectangle(-1, -1, 2, 2);
		const core = coreWith([rect]);
		core.dispatch({ type: "newChallenge" });
		core.dispatch({
			type: "setBuildPermissions",
			mouseDrag: true,
			botControl: true,
			fixate: true,
			nonColliding: true,
			showConditions: false,
		});
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 1 });
		expect(dragDeltaX(core, rect.GetBody()!)).toBeGreaterThan(1);
	});

	it("the sandbox always permits dragging a normal part (no challenge session)", () => {
		const rect = new Rectangle(-1, -1, 2, 2);
		const core = coreWith([rect]);
		core.dispatch({ type: "play" });
		core.dispatch({ type: "step", frames: 1 });
		expect(dragDeltaX(core, rect.GetBody()!)).toBeGreaterThan(1);
	});
});
