// Wave 4c — prismatic-joint axis snap bypass (ui-hotkeys §4.4). Shift held while
// placing a sliding joint snaps the axis to 15° increments in the UI AND must
// bypass the core's snap-to-center so that UI snap isn't overridden. The
// startPrismaticJoint / finishPrismaticJoint commands carry an optional
// `bypassSnap` flag that skips snapJointPoint.

import { describe, expect, it } from "vitest";
import { Circle } from "../src/Parts/Circle";
import { coreWithParts } from "./helpers";

describe("startPrismaticJoint bypassSnap", () => {
	it("snaps the axis start to the shape centre by default (snapToCenter on)", () => {
		// Circle at origin (r=3); click just off-centre but inside the snap threshold
		// (12/scale = 12/30 = 0.4 world units).
		const { core } = coreWithParts(new Circle(0, 0, 3));
		expect(core.getState().edit.snapToCenter).toBe(true);
		core.dispatch({ type: "setTool", tool: "newPrismaticJoint" });

		core.dispatch({ type: "startPrismaticJoint", x: 0.3, y: 0 });
		const axis = core.getState().jointGesture?.axisStart;
		expect(axis).toBeTruthy();
		// Snapped to the circle centre.
		expect(axis!.x).toBeCloseTo(0, 6);
		expect(axis!.y).toBeCloseTo(0, 6);
	});

	it("uses the raw click point when bypassSnap is set (shift held)", () => {
		const { core } = coreWithParts(new Circle(0, 0, 3));
		core.dispatch({ type: "setTool", tool: "newPrismaticJoint" });

		core.dispatch({ type: "startPrismaticJoint", x: 0.3, y: 0, bypassSnap: true });
		const axis = core.getState().jointGesture?.axisStart;
		expect(axis).toBeTruthy();
		// NOT snapped — the raw point is kept so the UI's 15° axis snap wins.
		expect(axis!.x).toBeCloseTo(0.3, 6);
		expect(axis!.y).toBeCloseTo(0, 6);
	});
});
