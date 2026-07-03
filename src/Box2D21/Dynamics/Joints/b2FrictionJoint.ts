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

import { b2Body, b2Joint, b2FrictionJointDef, b2Mat22, b2Math, b2TimeStep, b2Vec2 } from "../..";

/// Friction joint. This is used for top-down friction.
/// It provides 2D translational friction and angular friction.
export class b2FrictionJoint extends b2Joint
{
	public GetAnchorA() : b2Vec2
	{
		return this.m_bodyA.GetWorldPoint(this.m_localAnchorA);
	}

	public GetAnchorB() : b2Vec2
	{
		return this.m_bodyB.GetWorldPoint(this.m_localAnchorB);
	}

	public GetReactionForce(inv_dt:number) : b2Vec2
	{
		return new b2Vec2(inv_dt * this.m_linearImpulse.x, inv_dt * this.m_linearImpulse.y);
	}

	public GetReactionTorque(inv_dt:number) : number
	{
		return inv_dt * this.m_angularImpulse;
	}

	public SetMaxForce(force:number) : void
	{
		this.m_maxForce = force;
	}

	public GetMaxForce() : number
	{
		return this.m_maxForce;
	}

	public SetMaxTorque(torque:number) : void
	{
		this.m_maxTorque = torque;
	}

	public GetMaxTorque() : number
	{
		return this.m_maxTorque;
	}

	//--------------- Internals Below -------------------

	constructor(def:b2FrictionJointDef){
		super(def);
		this.m_localAnchorA.SetV(def.localAnchorA);
		this.m_localAnchorB.SetV(def.localAnchorB);

		this.m_linearMass.SetZero();
		this.m_angularMass = 0.0;
		this.m_linearImpulse.SetZero();
		this.m_angularImpulse = 0.0;
		this.m_maxForce = def.maxForce;
		this.m_maxTorque = def.maxTorque;
	}

	public InitVelocityConstraints(step:b2TimeStep) : void
	{
		var tMat:b2Mat22;
		var tX:number;

		var bA:b2Body = this.m_bodyA;
		var bB:b2Body = this.m_bodyB;

		// Compute the effective mass matrix.
		tMat = bA.m_xf.R;
		var rAX:number = this.m_localAnchorA.x - bA.m_sweep.localCenter.x;
		var rAY:number = this.m_localAnchorA.y - bA.m_sweep.localCenter.y;
		tX = tMat.col1.x * rAX + tMat.col2.x * rAY;
		rAY = tMat.col1.y * rAX + tMat.col2.y * rAY;
		rAX = tX;
		tMat = bB.m_xf.R;
		var rBX:number = this.m_localAnchorB.x - bB.m_sweep.localCenter.x;
		var rBY:number = this.m_localAnchorB.y - bB.m_sweep.localCenter.y;
		tX = tMat.col1.x * rBX + tMat.col2.x * rBY;
		rBY = tMat.col1.y * rBX + tMat.col2.y * rBY;
		rBX = tX;

		var mA:number = bA.m_invMass;
		var mB:number = bB.m_invMass;
		var iA:number = bA.m_invI;
		var iB:number = bB.m_invI;

		var K:b2Mat22 = new b2Mat22();
		K.col1.x = mA + mB;	K.col2.x = 0.0;
		K.col1.y = 0.0;		K.col2.y = mA + mB;

		K.col1.x += iA * rAY * rAY;	K.col2.x += -iA * rAX * rAY;
		K.col1.y += -iA * rAX * rAY;	K.col2.y += iA * rAX * rAX;

		K.col1.x += iB * rBY * rBY;	K.col2.x += -iB * rBX * rBY;
		K.col1.y += -iB * rBX * rBY;	K.col2.y += iB * rBX * rBX;

		K.GetInverse(this.m_linearMass);

		this.m_angularMass = iA + iB;
		if(this.m_angularMass > 0.0)
		{
			this.m_angularMass = 1.0 / this.m_angularMass;
		}

		if(step.warmStarting)
		{
			// Scale impulses to support a variable time step.
			this.m_linearImpulse.x *= step.dtRatio;
			this.m_linearImpulse.y *= step.dtRatio;
			this.m_angularImpulse *= step.dtRatio;

			var P:b2Vec2 = this.m_linearImpulse;
			bA.m_linearVelocity.x -= mA * P.x;
			bA.m_linearVelocity.y -= mA * P.y;
			bA.m_angularVelocity -= iA * (rAX * P.y - rAY * P.x + this.m_angularImpulse);
			bB.m_linearVelocity.x += mB * P.x;
			bB.m_linearVelocity.y += mB * P.y;
			bB.m_angularVelocity += iB * (rBX * P.y - rBY * P.x + this.m_angularImpulse);
		}
		else
		{
			this.m_linearImpulse.SetZero();
			this.m_angularImpulse = 0.0;
		}
	}

	public SolveVelocityConstraints(step:b2TimeStep) : void
	{
		var tMat:b2Mat22;
		var tX:number;
		var maxImpulse:number;

		var bA:b2Body = this.m_bodyA;
		var bB:b2Body = this.m_bodyB;

		var vA:b2Vec2 = bA.m_linearVelocity;
		var wA:number = bA.m_angularVelocity;
		var vB:b2Vec2 = bB.m_linearVelocity;
		var wB:number = bB.m_angularVelocity;

		var mA:number = bA.m_invMass;
		var mB:number = bB.m_invMass;
		var iA:number = bA.m_invI;
		var iB:number = bB.m_invI;

		tMat = bA.m_xf.R;
		var rAX:number = this.m_localAnchorA.x - bA.m_sweep.localCenter.x;
		var rAY:number = this.m_localAnchorA.y - bA.m_sweep.localCenter.y;
		tX = tMat.col1.x * rAX + tMat.col2.x * rAY;
		rAY = tMat.col1.y * rAX + tMat.col2.y * rAY;
		rAX = tX;
		tMat = bB.m_xf.R;
		var rBX:number = this.m_localAnchorB.x - bB.m_sweep.localCenter.x;
		var rBY:number = this.m_localAnchorB.y - bB.m_sweep.localCenter.y;
		tX = tMat.col1.x * rBX + tMat.col2.x * rBY;
		rBY = tMat.col1.y * rBX + tMat.col2.y * rBY;
		rBX = tX;

		// Solve angular friction
		{
			var Cdot:number = wB - wA;
			var impulse:number = -this.m_angularMass * Cdot;

			var oldImpulse:number = this.m_angularImpulse;
			maxImpulse = step.dt * this.m_maxTorque;
			this.m_angularImpulse = b2Math.Clamp(this.m_angularImpulse + impulse, -maxImpulse, maxImpulse);
			impulse = this.m_angularImpulse - oldImpulse;

			wA -= iA * impulse;
			wB += iB * impulse;
		}

		// Solve linear friction
		{
			var CdotX:number = vB.x - wB * rBY - vA.x + wA * rAY;
			var CdotY:number = vB.y + wB * rBX - vA.y - wA * rAX;

			var impulseV:b2Vec2 = b2Math.MulMV(this.m_linearMass, new b2Vec2(-CdotX, -CdotY));
			var oldImpulseV:b2Vec2 = this.m_linearImpulse.Copy();
			this.m_linearImpulse.Add(impulseV);

			maxImpulse = step.dt * this.m_maxForce;

			if(this.m_linearImpulse.LengthSquared() > maxImpulse * maxImpulse)
			{
				this.m_linearImpulse.Normalize();
				this.m_linearImpulse.Multiply(maxImpulse);
			}

			impulseV = b2Math.SubtractVV(this.m_linearImpulse, oldImpulseV);

			vA.x -= mA * impulseV.x;
			vA.y -= mA * impulseV.y;
			wA -= iA * (rAX * impulseV.y - rAY * impulseV.x);

			vB.x += mB * impulseV.x;
			vB.y += mB * impulseV.y;
			wB += iB * (rBX * impulseV.y - rBY * impulseV.x);
		}

		bA.m_angularVelocity = wA;
		bB.m_angularVelocity = wB;
	}

	public SolvePositionConstraints(baumgarte:number) : boolean
	{
		return true;
	}

	private m_localAnchorA:b2Vec2 = new b2Vec2();
	private m_localAnchorB:b2Vec2 = new b2Vec2();
	public m_linearMass:b2Mat22 = new b2Mat22();
	public m_angularMass:number = 0;
	private m_linearImpulse:b2Vec2 = new b2Vec2();
	private m_angularImpulse:number = 0;
	private m_maxForce:number = 0;
	private m_maxTorque:number = 0;
}
