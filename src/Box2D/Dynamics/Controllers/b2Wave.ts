// Port of IB3's b2Wave
// (ib3-decompiled/scripts/Box2D/Dynamics/Controllers/WaveController/b2Wave.as):
// a single travelling surface wave used by b2WaveController — a cos/sin bump
// of a given amplitude/width moving at `speed` (world units per controller
// step) and decaying by `decay` per step.

import { b2Vec2 } from "../../Common/Math/b2Vec2";

export class b2Wave {
	public waveFunc: (x: number) => number;
	public position: b2Vec2;
	public amplitude: number;
	public speed: number;
	public decay: number;
	public width: number;
	public fromGenerator: boolean;

	constructor(
		position: b2Vec2,
		amplitude: number = 1,
		width: number = 1,
		speed: number = 1,
		decay: number = 0.01,
		waveFunc: string = "cos",
		fromGenerator: boolean = false,
	) {
		this.position = position.Copy();
		this.amplitude = amplitude;
		this.speed = speed;
		this.decay = decay;
		this.width = width;
		this.waveFunc = waveFunc == "cos" ? Math.cos : Math.sin;
		this.fromGenerator = fromGenerator;
	}

	/** Surface height contribution at horizontal distance `dx` from the wave centre. */
	public valueAt(dx: number): number {
		if (dx > this.right || dx < this.left) {
			return 0;
		}
		return this.amplitude * this.waveFunc((Math.PI / this.halfWidth) * dx) + (this.waveFunc == Math.cos ? this.amplitude : 0);
	}

	/** Surface normal.x contribution at horizontal distance `dx` from the wave centre. */
	public normalXAt(dx: number): number {
		const deriv = this.waveFunc == Math.cos ? Math.sin : Math.cos;
		const v = this.amplitude * deriv((Math.PI / this.halfWidth) * dx);
		if (!isFinite(v)) {
			return v > 0 ? 0.1 : -0.2;
		}
		return v * (v > 0 ? 0.1 : 0.2);
	}

	/** Advance the wave one controller step: decay the amplitude, move along x. */
	public Step(): void {
		if (this.amplitude > 0) {
			this.amplitude -= this.decay;
		}
		if (this.amplitude < 0) {
			this.amplitude = 0;
		}
		this.position.x += this.speed;
	}

	public get left(): number {
		return -this.halfWidth;
	}

	public get right(): number {
		return this.halfWidth;
	}

	public get halfWidth(): number {
		return this.width / 2;
	}
}
