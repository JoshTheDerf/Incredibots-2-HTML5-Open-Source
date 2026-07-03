// Port of IB3's b2TideController
// (ib3-decompiled/scripts/Box2D/Dynamics/Controllers/b2TideController.as):
// a buoyancy controller whose surface offset and normal.x are driven by
// caller-supplied functions of accumulated sim time, producing the "tide"
// height oscillation + surface tilt (see Control/WaterControl.as tideFunc /
// normalXFunc, ported in src/core/waterSystem.ts).

import type { b2TimeStep } from "../b2TimeStep";
import { b2BuoyancyController } from "./b2BuoyancyController";

export class b2TideController extends b2BuoyancyController {
	/** offset delta as a function of accumulated step time (seconds). */
	public tideFunc: ((t: number) => number) | null = null;
	/** normal.x delta as a function of accumulated step time (seconds). */
	public normalXFunc: ((t: number) => number) | null = null;

	public origOffset: number = 0;
	public origNormalX: number = 0;
	/** Accumulated step dt (seconds); -Infinity until the first Step. */
	public stepTracker: number = -Infinity;

	public Step(step: b2TimeStep): void {
		if (this.stepTracker == Number.NEGATIVE_INFINITY) {
			this.origOffset = this.offset;
			this.origNormalX = this.normal.x;
			this.stepTracker = 0;
		}
		if (this.tideFunc != null) {
			this.offset = this.tideFunc(this.stepTracker) + this.origOffset;
		}
		if (this.normalXFunc != null) {
			this.normal.x = this.normalXFunc(this.stepTracker) + this.origNormalX;
		}
		this.stepTracker += step.dt;
		super.Step(step);
	}
}
