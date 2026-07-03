/*
* Copyright (c) 2006-2007 Erin Catto http://www.gphysics.com
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked as such, and must not be
* misrepresented as being the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/

import { b2Body, b2Joint, b2DistanceJointDef, b2Mat22, b2Math, b2Settings, b2TimeStep, b2Vec2 } from "../..";

/// A distance joint constrains two points on two bodies
/// to remain at a fixed distance from each other. You can view
/// this as a massless, rigid rod.
export class b2DistanceJoint extends b2Joint
{
	public GetAnchorA() : b2Vec2
	{
		return this.m_bodyA.GetWorldPoint(this.m_localAnchor1);
	}

	public GetAnchorB() : b2Vec2
	{
		return this.m_bodyB.GetWorldPoint(this.m_localAnchor2);
	}

	public GetReactionForce(inv_dt:number) : b2Vec2
	{
		return new b2Vec2(inv_dt * this.m_impulse * this.m_u.x, inv_dt * this.m_impulse * this.m_u.y);
	}

	public GetReactionTorque(inv_dt:number) : number
	{
		return 0.0;
	}

	public GetLength() : number
	{
		return this.m_length;
	}

	public SetLength(length:number) : void
	{
		this.m_length = length;
	}

	public GetFrequency() : number
	{
		return this.m_frequencyHz;
	}

	public SetFrequency(hz:number) : void
	{
		this.m_frequencyHz = hz;
	}

	public GetDampingRatio() : number
	{
		return this.m_dampingRatio;
	}

	public SetDampingRatio(ratio:number) : void
	{
		this.m_dampingRatio = ratio;
	}

	//--------------- Internals Below -------------------

	constructor(def:b2DistanceJointDef){
		super(def);
		this.m_localAnchor1.SetV(def.localAnchorA);
		this.m_localAnchor2.SetV(def.localAnchorB);
		this.m_length = def.length;
		this.m_frequencyHz = def.frequencyHz;
		this.m_dampingRatio = def.dampingRatio;
		this.m_impulse = 0.0;
		this.m_gamma = 0.0;
		this.m_bias = 0.0;
	}

	public InitVelocityConstraints(step:b2TimeStep) : void
	{
		var tMat:b2Mat22;
		var tX:number;

		var bA:b2Body = this.m_bodyA;
		var bB:b2Body = this.m_bodyB;

		// Compute the effective mass matrix.
		tMat = bA.m_xf.R;
		var r1X:number = this.m_localAnchor1.x - bA.m_sweep.localCenter.x;
		var r1Y:number = this.m_localAnchor1.y - bA.m_sweep.localCenter.y;
		tX = tMat.col1.x * r1X + tMat.col2.x * r1Y;
		r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
		r1X = tX;
		tMat = bB.m_xf.R;
		var r2X:number = this.m_localAnchor2.x - bB.m_sweep.localCenter.x;
		var r2Y:number = this.m_localAnchor2.y - bB.m_sweep.localCenter.y;
		tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
		r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
		r2X = tX;

		this.m_u.x = bB.m_sweep.c.x + r2X - bA.m_sweep.c.x - r1X;
		this.m_u.y = bB.m_sweep.c.y + r2Y - bA.m_sweep.c.y - r1Y;

		// Handle singularity.
		var length:number = Math.sqrt(this.m_u.x * this.m_u.x + this.m_u.y * this.m_u.y);
		if(length > b2Settings.b2_linearSlop)
		{
			this.m_u.Multiply(1.0 / length);
		}
		else
		{
			this.m_u.SetZero();
		}

		var cr1u:number = r1X * this.m_u.y - r1Y * this.m_u.x;
		var cr2u:number = r2X * this.m_u.y - r2Y * this.m_u.x;
		var invMass:number = bA.m_invMass + bA.m_invI * cr1u * cr1u + bB.m_invMass + bB.m_invI * cr2u * cr2u;
		this.m_mass = invMass != 0.0 ? 1.0 / invMass : 0.0;

		if(this.m_frequencyHz > 0.0)
		{
			var C:number = length - this.m_length;

			// Frequency
			var omega:number = 2.0 * Math.PI * this.m_frequencyHz;

			// Damping coefficient
			var d:number = 2.0 * this.m_mass * this.m_dampingRatio * omega;

			// Spring stiffness
			var k:number = this.m_mass * omega * omega;

			// magic formulas
			this.m_gamma = step.dt * (d + step.dt * k);
			this.m_gamma = this.m_gamma != 0.0 ? 1.0 / this.m_gamma : 0.0;
			this.m_bias = C * step.dt * k * this.m_gamma;

			this.m_mass = invMass + this.m_gamma;
			this.m_mass = this.m_mass != 0.0 ? 1.0 / this.m_mass : 0.0;
		}

		if(step.warmStarting)
		{
			// Scale the impulse to support a variable time step.
			this.m_impulse *= step.dtRatio;

			var PX:number = this.m_impulse * this.m_u.x;
			var PY:number = this.m_impulse * this.m_u.y;
			bA.m_linearVelocity.x -= bA.m_invMass * PX;
			bA.m_linearVelocity.y -= bA.m_invMass * PY;
			bA.m_angularVelocity -= bA.m_invI * (r1X * PY - r1Y * PX);
			bB.m_linearVelocity.x += bB.m_invMass * PX;
			bB.m_linearVelocity.y += bB.m_invMass * PY;
			bB.m_angularVelocity += bB.m_invI * (r2X * PY - r2Y * PX);
		}
		else
		{
			this.m_impulse = 0.0;
		}
	}

	public SolveVelocityConstraints(step:b2TimeStep) : void
	{
		var tMat:b2Mat22;

		var bA:b2Body = this.m_bodyA;
		var bB:b2Body = this.m_bodyB;

		tMat = bA.m_xf.R;
		var r1X:number = this.m_localAnchor1.x - bA.m_sweep.localCenter.x;
		var r1Y:number = this.m_localAnchor1.y - bA.m_sweep.localCenter.y;
		var tX:number = tMat.col1.x * r1X + tMat.col2.x * r1Y;
		r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
		r1X = tX;
		tMat = bB.m_xf.R;
		var r2X:number = this.m_localAnchor2.x - bB.m_sweep.localCenter.x;
		var r2Y:number = this.m_localAnchor2.y - bB.m_sweep.localCenter.y;
		tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
		r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
		r2X = tX;

		// Cdot = dot(u, v + cross(w, r))
		var v1X:number = bA.m_linearVelocity.x + (-bA.m_angularVelocity * r1Y);
		var v1Y:number = bA.m_linearVelocity.y + (bA.m_angularVelocity * r1X);
		var v2X:number = bB.m_linearVelocity.x + (-bB.m_angularVelocity * r2Y);
		var v2Y:number = bB.m_linearVelocity.y + (bB.m_angularVelocity * r2X);

		var Cdot:number = this.m_u.x * (v2X - v1X) + this.m_u.y * (v2Y - v1Y);
		var impulse:number = -this.m_mass * (Cdot + this.m_bias + this.m_gamma * this.m_impulse);
		this.m_impulse += impulse;

		var PX:number = impulse * this.m_u.x;
		var PY:number = impulse * this.m_u.y;
		bA.m_linearVelocity.x -= bA.m_invMass * PX;
		bA.m_linearVelocity.y -= bA.m_invMass * PY;
		bA.m_angularVelocity -= bA.m_invI * (r1X * PY - r1Y * PX);
		bB.m_linearVelocity.x += bB.m_invMass * PX;
		bB.m_linearVelocity.y += bB.m_invMass * PY;
		bB.m_angularVelocity += bB.m_invI * (r2X * PY - r2Y * PX);
	}

	public SolvePositionConstraints(baumgarte:number) : boolean
	{
		var tMat:b2Mat22;

		if(this.m_frequencyHz > 0.0)
		{
			// There is no position correction for soft distance constraints.
			return true;
		}

		var bA:b2Body = this.m_bodyA;
		var bB:b2Body = this.m_bodyB;

		tMat = bA.m_xf.R;
		var r1X:number = this.m_localAnchor1.x - bA.m_sweep.localCenter.x;
		var r1Y:number = this.m_localAnchor1.y - bA.m_sweep.localCenter.y;
		var tX:number = tMat.col1.x * r1X + tMat.col2.x * r1Y;
		r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
		r1X = tX;
		tMat = bB.m_xf.R;
		var r2X:number = this.m_localAnchor2.x - bB.m_sweep.localCenter.x;
		var r2Y:number = this.m_localAnchor2.y - bB.m_sweep.localCenter.y;
		tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
		r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
		r2X = tX;

		var dX:number = bB.m_sweep.c.x + r2X - bA.m_sweep.c.x - r1X;
		var dY:number = bB.m_sweep.c.y + r2Y - bA.m_sweep.c.y - r1Y;

		var length:number = Math.sqrt(dX*dX + dY*dY);
		dX /= length;
		dY /= length;
		var C:number = length - this.m_length;
		C = b2Math.Clamp(C, -b2Settings.b2_maxLinearCorrection, b2Settings.b2_maxLinearCorrection);

		var impulse:number = -this.m_mass * C;
		this.m_u.Set(dX, dY);
		var PX:number = impulse * this.m_u.x;
		var PY:number = impulse * this.m_u.y;

		bA.m_sweep.c.x -= bA.m_invMass * PX;
		bA.m_sweep.c.y -= bA.m_invMass * PY;
		bA.m_sweep.a -= bA.m_invI * (r1X * PY - r1Y * PX);
		bB.m_sweep.c.x += bB.m_invMass * PX;
		bB.m_sweep.c.y += bB.m_invMass * PY;
		bB.m_sweep.a += bB.m_invI * (r2X * PY - r2Y * PX);

		bA.SynchronizeTransform();
		bB.SynchronizeTransform();

		return b2Math.Abs(C) < b2Settings.b2_linearSlop;
	}

	private m_localAnchor1:b2Vec2 = new b2Vec2();
	private m_localAnchor2:b2Vec2 = new b2Vec2();
	private m_u:b2Vec2 = new b2Vec2();
	private m_frequencyHz:number = 0;
	private m_dampingRatio:number = 0;
	private m_gamma:number = 0;
	private m_bias:number = 0;
	private m_impulse:number = 0;
	private m_mass:number = 0;
	private m_length:number = 0;
}
