// Port of IB3's b2WaveController
// (ib3-decompiled/scripts/Box2D/Dynamics/Controllers/b2WaveController.as),
// adapted from the 2.1a fixture API to the 2.0.2 shape/body API (see
// b2BuoyancyController.ts header for the mapping). A buoyancy-style
// controller whose surface is perturbed per-body by a set of travelling
// b2Waves; WaterControl runs it with a continuous sin-wave generator
// (WaterControl.as Init: ContinuousWaves(0, 0, 1, 5, 0.1, 0, "sin")).
//
// DEVIATION: the shipped IB3 wave Step does NOT check the per-fixture
// isBuoyant userData flag (only b2BuoyancyController does). We add the same
// guard here so a part's buoyant=false opts it out of water forces under
// BOTH water types consistently.

import { b2Vec2 } from "../../Common/Math/b2Vec2";
import type { b2Body } from "../b2Body";
import type { b2Shape } from "../../Collision/Shapes/b2Shape";
import type { b2TimeStep } from "../b2TimeStep";
import { b2Controller } from "./b2Controller";
import { linearVelocityFromWorldPoint } from "./b2BuoyancyController";
import { b2Wave } from "./b2Wave";

export class b2WaveController extends b2Controller {
	public normal: b2Vec2 = new b2Vec2(0, -1);
	public offset: number = 0;
	public density: number = 0;
	public velocity: b2Vec2 = new b2Vec2(0, 0);
	public linearDrag: number = 2;
	public angularDrag: number = 1;
	public useDensity: boolean = false;
	public useWorldGravity: boolean = true;
	public gravity: b2Vec2 | null = null;

	public leftLimit: number = -Number.MAX_VALUE;
	public rightLimit: number = Number.MAX_VALUE;
	public maxAmplitude: number = 500;
	public maxWidth: number = 500;
	public maxSpeed: number = 500;

	public waves: b2Wave[] = [];
	private wavesUpdated: boolean = false;
	private waveGenBase: b2Wave | null = null;
	private waveGenCounter: number = 0;

	public Step(step: b2TimeStep): void {
		if (!this.m_bodyList) return;
		if (this.useWorldGravity) {
			this.gravity = this.GetWorld()!.m_gravity.Copy();
		}
		this.wavesUpdated = false;
		// Continuous generator: spawn a new wave each time the last one has
		// travelled its own width.
		if (this.waveGenBase) {
			this.waveGenCounter += this.waveGenBase.speed;
			if (this.waveGenCounter > this.waveGenBase.width || this.waveGenCounter < -this.waveGenBase.width) {
				this.MakeWaveFromWave(this.waveGenBase);
				this.waveGenCounter = 0;
			}
		}
		for (let edge = this.m_bodyList; edge; edge = edge.nextBody!) {
			const body: b2Body = edge.body!;
			// Waves are stepped once (on the first body) and the summed
			// height/normal contribution at THIS body's x is returned.
			const waveVals = this.StepAndCheckForWave(body);
			if (body.IsSleeping()) continue;
			const areac = new b2Vec2();
			const massc = new b2Vec2();
			let area = 0.0;
			let mass = 0.0;
			// Per-body effective surface: tilt the normal by the local wave
			// slope and shift the offset by the local wave height.
			const bodyNormal = new b2Vec2(waveVals[1], this.normal.y);
			bodyNormal.Normalize();
			const bodyOffset = waveVals[0] - ((-bodyNormal.x / bodyNormal.y) * waveVals[1]) + this.offset;
			for (let shape: b2Shape | null = body.GetShapeList(); shape; shape = shape.GetNext()) {
				// DEVIATION: isBuoyant guard added (see file header).
				const ud = shape.GetUserData();
				if (ud && !ud.isBuoyant) continue;
				const sc = new b2Vec2();
				const sarea = shape.ComputeSubmergedArea(bodyNormal, bodyOffset, body.GetXForm(), sc);
				area += sarea;
				areac.x += sarea * sc.x;
				areac.y += sarea * sc.y;
				const shapeDensity = 1; // useDensity compiled out in IB3 (as in b2BuoyancyController).
				mass += sarea * shapeDensity;
				massc.x += sarea * sc.x * shapeDensity;
				massc.y += sarea * sc.y * shapeDensity;
			}
			areac.x /= area;
			areac.y /= area;
			massc.x /= mass;
			massc.y /= mass;
			if (area < Number.MIN_VALUE) continue;
			// Buoyancy force.
			const buoyancyForce = this.gravity!.Negative();
			buoyancyForce.Multiply(this.density * area);
			body.ApplyForce(buoyancyForce, massc);
			// Linear drag (correct point velocity — see linearVelocityFromWorldPoint
			// in b2BuoyancyController.ts for why not body.GetLinearVelocityFromWorldPoint).
			const dragForce = linearVelocityFromWorldPoint(body, areac);
			dragForce.Subtract(this.velocity);
			dragForce.Multiply(-this.linearDrag * area);
			body.ApplyForce(dragForce, areac);
			// Angular drag.
			body.ApplyTorque((-body.GetInertia() / body.GetMass()) * area * body.GetAngularVelocity() * this.angularDrag);
		}
	}

	/**
	 * Step every wave (once per controller Step — the wavesUpdated latch) and
	 * return [summed wave height, summed wave normal.x] at the body's x.
	 * Bodies under a passing wave are woken (b2WaveController.as
	 * StepAndCheckForWave).
	 */
	private StepAndCheckForWave(body: b2Body): [number, number] {
		let value = 0;
		let normalX = 0;
		for (let i = this.waves.length - 1; i >= 0; i--) {
			if (!this.wavesUpdated) {
				if (this.waves[i].amplitude > this.maxAmplitude) {
					this.waves[i].amplitude = this.maxAmplitude;
				}
				this.waves[i].Step();
				if (this.waves[i].amplitude <= 0 || this.waves[i].position.x < this.leftLimit || this.waves[i].position.x > this.rightLimit) {
					this.waves.splice(i, 1);
				}
			}
			if (this.waves.length > 0 && i < this.waves.length) {
				const dx = body.GetPosition().x - this.waves[i].position.x;
				if (dx > this.waves[i].left && dx < this.waves[i].right) {
					body.WakeUp(); // 2.1a SetAwake(true)
					value += this.waves[i].valueAt(dx);
					normalX += this.waves[i].normalXAt(dx);
				}
			}
		}
		this.wavesUpdated = true;
		if (value > this.maxAmplitude) value = this.maxAmplitude;
		else if (value < -this.maxAmplitude) value = -this.maxAmplitude;
		if (normalX > 1) normalX = 1;
		else if (normalX < -1) normalX = -1;
		return [value, normalX];
	}

	/** Spawn a single wave (clamped to the max amplitude/width/speed). */
	public MakeWave(x: number, y: number, amplitude: number = 1, width: number = 1, speed: number = 1, decay: number = 0.01, waveFunc: string = "cos", fromGenerator: boolean = false): void {
		this.waves.push(
			new b2Wave(
				new b2Vec2(x, y),
				amplitude > this.maxAmplitude ? this.maxAmplitude : amplitude,
				width > this.maxWidth ? this.maxWidth : width,
				speed > this.maxSpeed ? this.maxSpeed : speed < -this.maxSpeed ? -this.maxSpeed : speed,
				decay,
				waveFunc,
				fromGenerator,
			),
		);
	}

	/** Install a continuous wave generator (a new wave every `width` of travel). */
	public ContinuousWaves(x: number, y: number, amplitude: number = 1, width: number = 1, speed: number = 1, decay: number = 0.01, waveFunc: string = "cos"): void {
		this.waveGenBase = new b2Wave(
			new b2Vec2(x, y),
			amplitude > this.maxAmplitude ? this.maxAmplitude : amplitude,
			width > this.maxWidth ? this.maxWidth : width,
			speed > this.maxSpeed ? this.maxSpeed : speed < -this.maxSpeed ? -this.maxSpeed : speed,
			decay,
			waveFunc,
			true,
		);
		this.waveGenCounter = this.waveGenBase.width;
	}

	private MakeWaveFromWave(wave: b2Wave): void {
		this.waves.push(new b2Wave(wave.position.Copy(), wave.amplitude, wave.width, wave.speed, wave.decay, wave.waveFunc == Math.cos ? "cos" : "sin", wave.fromGenerator));
	}
}
