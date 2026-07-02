// Regression for the demo/replay jointed-circle offset bug.
//
// Playback is sim-FREE: each dynamic ShapePart body is hard-set from a recorded
// sync point by POSITIONAL index (replay.ts syncReplay). Fixed-joint-welded parts
// SHARE one b2Body (Circle.Init:104-109), whose ORIGIN is whichever part is Init'd
// first. The legacy play loop Inits ShapeParts in REVERSE parts order
// (ControllerGame.ts:2759-2761); the sync points were recorded against those
// origins. The port originally Init'd FORWARD, making a different part the origin,
// so after SetXForm(recordedPos) every welded part (visibly the circles) drew
// offset by the delta between the two origin parts.
//
// This test drives one playback frame (frame 0 -> hard SetXForm from syncPoints[0])
// and asserts every dynamic circle's RENDERED world centre lands at its recorded
// edit-space centre. It fails (large offsets) if the Init order regresses to
// forward.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GameCore } from "../src/core/GameCore";
import { createInitialState } from "../src/core/GameState";
import { ShapePart } from "../src/Parts/ShapePart";
import { Circle } from "../src/Parts/Circle";

function assetBytes(name: string): Uint8Array {
	const url = new URL(`../resource/${name}`, import.meta.url);
	return new Uint8Array(readFileSync(fileURLToPath(url)));
}

const replayBytes = assetBytes("replay.dat");
const robotBytes = assetBytes("robot.dat");

/** Circle rendered world centre = xf.position + R * shape.localPosition. */
function circleWorldCentre(circle: Circle): { x: number; y: number } {
	const body = (circle as unknown as { GetBody(): any }).GetBody();
	const shape = (circle as unknown as { GetShape(): any }).GetShape();
	const xf = body.GetXForm();
	const lp = shape.m_localPosition;
	const m = xf.R;
	return {
		x: xf.position.x + (m.col1.x * lp.x + m.col2.x * lp.y),
		y: xf.position.y + (m.col1.y * lp.x + m.col2.y * lp.y),
	};
}

describe("demo replay jointed-circle placement", () => {
	it("places every dynamic circle at its recorded position after the first sync", async () => {
		const core = new GameCore(createInitialState());
		await core.loadDemoReplay(replayBytes, robotBytes);

		// Record each dynamic circle's edit-space centre (frame 0 == the pose the
		// robot was built in, which syncPoints[0] captured).
		const circles = core
			.getState()
			.parts.filter((p): p is Circle => p instanceof Circle && !(p as ShapePart).isStatic);
		expect(circles.length).toBeGreaterThan(0);
		const expected = circles.map((c) => ({ x: c.centerX, y: c.centerY }));

		// One playback step drives frame 0 -> hard SetXForm from syncPoints[0].
		core.dispatch({ type: "step" });

		let maxOffset = 0;
		circles.forEach((c, i) => {
			const w = circleWorldCentre(c);
			const d = Math.hypot(w.x - expected[i].x, w.y - expected[i].y);
			maxOffset = Math.max(maxOffset, d);
		});

		// With the correct (reverse) Init order every circle lands on its recorded
		// spot; the forward-Init bug produced offsets up to several world units.
		expect(maxOffset).toBeLessThan(0.05);
	});
});
