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

import { b2Body, b2Joint, b2Mat22, b2Mat33, b2Math, b2Settings, b2TimeStep, b2Vec2, b2Vec3, b2WeldJointDef } from "../..";

export class b2WeldJoint extends b2Joint
{
	constructor(def:b2WeldJointDef){
		super(def);
		this.m_localAnchorA = new b2Vec2();
		this.m_localAnchorB = new b2Vec2();
		this.m_impulse = new b2Vec3();
		this.m_mass = new b2Mat33();

		this.m_localAnchorA.SetV(def.localAnchorA);
		this.m_localAnchorB.SetV(def.localAnchorB);
		this.m_referenceAngle = def.referenceAngle;
		this.m_impulse.SetZero();
		this.m_mass = new b2Mat33();
	}

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
		return new b2Vec2(inv_dt * this.m_impulse.x, inv_dt * this.m_impulse.y);
	}

	public GetReactionTorque(inv_dt:number) : number
	{
		return inv_dt * this.m_impulse.z;
	}

	public InitVelocityConstraints(step:b2TimeStep) : void
	{
		var tMat:b2Mat22;
		var tX:number;
		var bA:b2Body;
		var bB:b2Body;
		var rAX:number;
		var rAY:number;
		var rBX:number;
		var rBY:number;
		var mA:number;
		var mB:number;
		var iA:number;
		var iB:number;
		bA = this.m_bodyA;
		bB = this.m_bodyB;
		tMat = bA.m_xf.R;
		rAX = this.m_localAnchorA.x - bA.m_sweep.localCenter.x;
		rAY = this.m_localAnchorA.y - bA.m_sweep.localCenter.y;
		tX = tMat.col1.x * rAX + tMat.col2.x * rAY;
		rAY = tMat.col1.y * rAX + tMat.col2.y * rAY;
		rAX = tX;
		tMat = bB.m_xf.R;
		rBX = this.m_localAnchorB.x - bB.m_sweep.localCenter.x;
		rBY = this.m_localAnchorB.y - bB.m_sweep.localCenter.y;
		tX = tMat.col1.x * rBX + tMat.col2.x * rBY;
		rBY = tMat.col1.y * rBX + tMat.col2.y * rBY;
		rBX = tX;
		mA = bA.m_invMass;
		mB = bB.m_invMass;
		iA = bA.m_invI;
		iB = bB.m_invI;
		this.m_mass.col1.x = mA + mB + rAY * rAY * iA + rBY * rBY * iB;
		this.m_mass.col2.x = -rAY * rAX * iA - rBY * rBX * iB;
		this.m_mass.col3.x = -rAY * iA - rBY * iB;
		this.m_mass.col1.y = this.m_mass.col2.x;
		this.m_mass.col2.y = mA + mB + rAX * rAX * iA + rBX * rBX * iB;
		this.m_mass.col3.y = rAX * iA + rBX * iB;
		this.m_mass.col1.z = this.m_mass.col3.x;
		this.m_mass.col2.z = this.m_mass.col3.y;
		this.m_mass.col3.z = iA + iB;
		if(step.warmStarting)
		{
			this.m_impulse.x *= step.dtRatio;
			this.m_impulse.y *= step.dtRatio;
			this.m_impulse.z *= step.dtRatio;
			bA.m_linearVelocity.x -= mA * this.m_impulse.x;
			bA.m_linearVelocity.y -= mA * this.m_impulse.y;
			bA.m_angularVelocity -= iA * (rAX * this.m_impulse.y - rAY * this.m_impulse.x + this.m_impulse.z);
			bB.m_linearVelocity.x += mB * this.m_impulse.x;
			bB.m_linearVelocity.y += mB * this.m_impulse.y;
			bB.m_angularVelocity += iB * (rBX * this.m_impulse.y - rBY * this.m_impulse.x + this.m_impulse.z);
		}
		else
		{
			this.m_impulse.SetZero();
		}
	}

	public SolveVelocityConstraints(step:b2TimeStep) : void
	{
		var tMat:b2Mat22;
		var tX:number;
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
		var Cdot1X:number = vB.x - wB * rBY - vA.x + wA * rAY;
		var Cdot1Y:number = vB.y + wB * rBX - vA.y - wA * rAX;
		var Cdot2:number = wB - wA;
		var impulse:b2Vec3 = new b2Vec3();
		this.m_mass.Solve33(impulse, -Cdot1X, -Cdot1Y, -Cdot2);
		this.m_impulse.Add(impulse);
		vA.x -= mA * impulse.x;
		vA.y -= mA * impulse.y;
		wA -= iA * (rAX * impulse.y - rAY * impulse.x + impulse.z);
		vB.x += mB * impulse.x;
		vB.y += mB * impulse.y;
		wB += iB * (rBX * impulse.y - rBY * impulse.x + impulse.z);
		bA.m_angularVelocity = wA;
		bB.m_angularVelocity = wB;
	}

	public SolvePositionConstraints(baumgarte:number) : boolean
	{
		var tMat:b2Mat22;
		var tX:number;
		var bA:b2Body = this.m_bodyA;
		var bB:b2Body = this.m_bodyB;
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
		var C1X:number = bB.m_sweep.c.x + rBX - bA.m_sweep.c.x - rAX;
		var C1Y:number = bB.m_sweep.c.y + rBY - bA.m_sweep.c.y - rAY;
		var C2:number = bB.m_sweep.a - bA.m_sweep.a - this.m_referenceAngle;
		var k_allowedStretch:number = 10 * b2Settings.b2_linearSlop;
		var positionError:number = Math.sqrt(C1X * C1X + C1Y * C1Y);
		var angularError:number = b2Math.Abs(C2);
		if(positionError > k_allowedStretch)
		{
			iA *= 1;
			iB *= 1;
		}
		this.m_mass.col1.x = mA + mB + rAY * rAY * iA + rBY * rBY * iB;
		this.m_mass.col2.x = -rAY * rAX * iA - rBY * rBX * iB;
		this.m_mass.col3.x = -rAY * iA - rBY * iB;
		this.m_mass.col1.y = this.m_mass.col2.x;
		this.m_mass.col2.y = mA + mB + rAX * rAX * iA + rBX * rBX * iB;
		this.m_mass.col3.y = rAX * iA + rBX * iB;
		this.m_mass.col1.z = this.m_mass.col3.x;
		this.m_mass.col2.z = this.m_mass.col3.y;
		this.m_mass.col3.z = iA + iB;
		var impulse:b2Vec3 = new b2Vec3();
		this.m_mass.Solve33(impulse, -C1X, -C1Y, -C2);
		bA.m_sweep.c.x -= mA * impulse.x;
		bA.m_sweep.c.y -= mA * impulse.y;
		bA.m_sweep.a -= iA * (rAX * impulse.y - rAY * impulse.x + impulse.z);
		bB.m_sweep.c.x += mB * impulse.x;
		bB.m_sweep.c.y += mB * impulse.y;
		bB.m_sweep.a += iB * (rBX * impulse.y - rBY * impulse.x + impulse.z);
		bA.SynchronizeTransform();
		bB.SynchronizeTransform();
		return positionError <= b2Settings.b2_linearSlop && angularError <= b2Settings.b2_angularSlop;
	}

	private m_localAnchorA:b2Vec2;
	private m_localAnchorB:b2Vec2;
	private m_referenceAngle:number = 0;
	private m_impulse:b2Vec3;
	private m_mass:b2Mat33;
}
