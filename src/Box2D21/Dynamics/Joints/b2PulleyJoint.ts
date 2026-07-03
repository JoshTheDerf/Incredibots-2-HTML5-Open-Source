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

import { b2Body, b2Joint, b2Mat22, b2Math, b2PulleyJointDef, b2Settings, b2TimeStep, b2Vec2 } from "../..";

export class b2PulleyJoint extends b2Joint
{
	constructor(def:b2PulleyJointDef){
		super(def);
		this.m_groundAnchor1 = new b2Vec2();
		this.m_groundAnchor2 = new b2Vec2();
		this.m_localAnchor1 = new b2Vec2();
		this.m_localAnchor2 = new b2Vec2();
		this.m_u1 = new b2Vec2();
		this.m_u2 = new b2Vec2();
		this.m_ground = this.m_bodyA.m_world.m_groundBody!;
		this.m_groundAnchor1.x = def.groundAnchorA.x - this.m_ground.m_xf.position.x;
		this.m_groundAnchor1.y = def.groundAnchorA.y - this.m_ground.m_xf.position.y;
		this.m_groundAnchor2.x = def.groundAnchorB.x - this.m_ground.m_xf.position.x;
		this.m_groundAnchor2.y = def.groundAnchorB.y - this.m_ground.m_xf.position.y;
		this.m_localAnchor1.SetV(def.localAnchorA);
		this.m_localAnchor2.SetV(def.localAnchorB);
		this.m_ratio = def.ratio;
		this.m_constant = def.lengthA + this.m_ratio * def.lengthB;
		this.m_maxLength1 = b2Math.Min(def.maxLengthA, this.m_constant - this.m_ratio * b2PulleyJoint.b2_minPulleyLength);
		this.m_maxLength2 = b2Math.Min(def.maxLengthB, (this.m_constant - b2PulleyJoint.b2_minPulleyLength) / this.m_ratio);
		this.m_impulse = 0;
		this.m_limitImpulse1 = 0;
		this.m_limitImpulse2 = 0;
	}

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
		return new b2Vec2(inv_dt * this.m_impulse * this.m_u2.x, inv_dt * this.m_impulse * this.m_u2.y);
	}

	public GetReactionTorque(inv_dt:number) : number
	{
		return 0;
	}

	public GetGroundAnchorA() : b2Vec2
	{
		var a:b2Vec2 = this.m_ground.m_xf.position.Copy();
		a.Add(this.m_groundAnchor1);
		return a;
	}

	public GetGroundAnchorB() : b2Vec2
	{
		var a:b2Vec2 = this.m_ground.m_xf.position.Copy();
		a.Add(this.m_groundAnchor2);
		return a;
	}

	public GetLength1() : number
	{
		var p:b2Vec2 = this.m_bodyA.GetWorldPoint(this.m_localAnchor1);
		var sX:number = this.m_ground.m_xf.position.x + this.m_groundAnchor1.x;
		var sY:number = this.m_ground.m_xf.position.y + this.m_groundAnchor1.y;
		var dX:number = p.x - sX;
		var dY:number = p.y - sY;
		return Math.sqrt(dX * dX + dY * dY);
	}

	public GetLength2() : number
	{
		var p:b2Vec2 = this.m_bodyB.GetWorldPoint(this.m_localAnchor2);
		var sX:number = this.m_ground.m_xf.position.x + this.m_groundAnchor2.x;
		var sY:number = this.m_ground.m_xf.position.y + this.m_groundAnchor2.y;
		var dX:number = p.x - sX;
		var dY:number = p.y - sY;
		return Math.sqrt(dX * dX + dY * dY);
	}

	public GetRatio() : number
	{
		return this.m_ratio;
	}

	public InitVelocityConstraints(step:b2TimeStep) : void
	{
		var bA:b2Body;
		var bB:b2Body;
		var tMat:b2Mat22;
		var r1Y:number = NaN;
		var P1X:number = NaN;
		var P1Y:number = NaN;
		var P2X:number = NaN;
		var P2Y:number = NaN;
		bA = this.m_bodyA;
		bB = this.m_bodyB;
		tMat = bA.m_xf.R;
		var r1X:number = this.m_localAnchor1.x - bA.m_sweep.localCenter.x;
		r1Y = this.m_localAnchor1.y - bA.m_sweep.localCenter.y;
		var tX:number = tMat.col1.x * r1X + tMat.col2.x * r1Y;
		r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
		r1X = tX;
		tMat = bB.m_xf.R;
		var r2X:number = this.m_localAnchor2.x - bB.m_sweep.localCenter.x;
		var r2Y:number = this.m_localAnchor2.y - bB.m_sweep.localCenter.y;
		tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
		r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
		r2X = tX;
		var p1X:number = bA.m_sweep.c.x + r1X;
		var p1Y:number = bA.m_sweep.c.y + r1Y;
		var p2X:number = bB.m_sweep.c.x + r2X;
		var p2Y:number = bB.m_sweep.c.y + r2Y;
		var s1X:number = this.m_ground.m_xf.position.x + this.m_groundAnchor1.x;
		var s1Y:number = this.m_ground.m_xf.position.y + this.m_groundAnchor1.y;
		var s2X:number = this.m_ground.m_xf.position.x + this.m_groundAnchor2.x;
		var s2Y:number = this.m_ground.m_xf.position.y + this.m_groundAnchor2.y;
		this.m_u1.Set(p1X - s1X, p1Y - s1Y);
		this.m_u2.Set(p2X - s2X, p2Y - s2Y);
		var length1:number = this.m_u1.Length();
		var length2:number = this.m_u2.Length();
		if(length1 > b2Settings.b2_linearSlop)
		{
			this.m_u1.Multiply(1 / length1);
		}
		else
		{
			this.m_u1.SetZero();
		}
		if(length2 > b2Settings.b2_linearSlop)
		{
			this.m_u2.Multiply(1 / length2);
		}
		else
		{
			this.m_u2.SetZero();
		}
		var C:number = this.m_constant - length1 - this.m_ratio * length2;
		if(C > 0)
		{
			this.m_state = b2Joint.e_inactiveLimit;
			this.m_impulse = 0;
		}
		else
		{
			this.m_state = b2Joint.e_atUpperLimit;
		}
		if(length1 < this.m_maxLength1)
		{
			this.m_limitState1 = b2Joint.e_inactiveLimit;
			this.m_limitImpulse1 = 0;
		}
		else
		{
			this.m_limitState1 = b2Joint.e_atUpperLimit;
		}
		if(length2 < this.m_maxLength2)
		{
			this.m_limitState2 = b2Joint.e_inactiveLimit;
			this.m_limitImpulse2 = 0;
		}
		else
		{
			this.m_limitState2 = b2Joint.e_atUpperLimit;
		}
		var cr1u1:number = r1X * this.m_u1.y - r1Y * this.m_u1.x;
		var cr2u2:number = r2X * this.m_u2.y - r2Y * this.m_u2.x;
		this.m_limitMass1 = bA.m_invMass + bA.m_invI * cr1u1 * cr1u1;
		this.m_limitMass2 = bB.m_invMass + bB.m_invI * cr2u2 * cr2u2;
		this.m_pulleyMass = this.m_limitMass1 + this.m_ratio * this.m_ratio * this.m_limitMass2;
		this.m_limitMass1 = 1 / this.m_limitMass1;
		this.m_limitMass2 = 1 / this.m_limitMass2;
		this.m_pulleyMass = 1 / this.m_pulleyMass;
		if(step.warmStarting)
		{
			this.m_impulse *= step.dtRatio;
			this.m_limitImpulse1 *= step.dtRatio;
			this.m_limitImpulse2 *= step.dtRatio;
			P1X = (-this.m_impulse - this.m_limitImpulse1) * this.m_u1.x;
			P1Y = (-this.m_impulse - this.m_limitImpulse1) * this.m_u1.y;
			P2X = (-this.m_ratio * this.m_impulse - this.m_limitImpulse2) * this.m_u2.x;
			P2Y = (-this.m_ratio * this.m_impulse - this.m_limitImpulse2) * this.m_u2.y;
			bA.m_linearVelocity.x += bA.m_invMass * P1X;
			bA.m_linearVelocity.y += bA.m_invMass * P1Y;
			bA.m_angularVelocity += bA.m_invI * (r1X * P1Y - r1Y * P1X);
			bB.m_linearVelocity.x += bB.m_invMass * P2X;
			bB.m_linearVelocity.y += bB.m_invMass * P2Y;
			bB.m_angularVelocity += bB.m_invI * (r2X * P2Y - r2Y * P2X);
		}
		else
		{
			this.m_impulse = 0;
			this.m_limitImpulse1 = 0;
			this.m_limitImpulse2 = 0;
		}
	}

	public SolveVelocityConstraints(step:b2TimeStep) : void
	{
		var tMat:b2Mat22;
		var v1X:number = NaN;
		var v1Y:number = NaN;
		var v2X:number = NaN;
		var v2Y:number = NaN;
		var P1X:number = NaN;
		var P1Y:number = NaN;
		var P2X:number = NaN;
		var P2Y:number = NaN;
		var Cdot:number = NaN;
		var impulse:number = NaN;
		var oldImpulse:number = NaN;
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
		if(this.m_state == b2Joint.e_atUpperLimit)
		{
			v1X = bA.m_linearVelocity.x + -bA.m_angularVelocity * r1Y;
			v1Y = bA.m_linearVelocity.y + bA.m_angularVelocity * r1X;
			v2X = bB.m_linearVelocity.x + -bB.m_angularVelocity * r2Y;
			v2Y = bB.m_linearVelocity.y + bB.m_angularVelocity * r2X;
			Cdot = -(this.m_u1.x * v1X + this.m_u1.y * v1Y) - this.m_ratio * (this.m_u2.x * v2X + this.m_u2.y * v2Y);
			impulse = this.m_pulleyMass * -Cdot;
			oldImpulse = this.m_impulse;
			this.m_impulse = b2Math.Max(0, this.m_impulse + impulse);
			impulse = this.m_impulse - oldImpulse;
			P1X = -impulse * this.m_u1.x;
			P1Y = -impulse * this.m_u1.y;
			P2X = -this.m_ratio * impulse * this.m_u2.x;
			P2Y = -this.m_ratio * impulse * this.m_u2.y;
			bA.m_linearVelocity.x += bA.m_invMass * P1X;
			bA.m_linearVelocity.y += bA.m_invMass * P1Y;
			bA.m_angularVelocity += bA.m_invI * (r1X * P1Y - r1Y * P1X);
			bB.m_linearVelocity.x += bB.m_invMass * P2X;
			bB.m_linearVelocity.y += bB.m_invMass * P2Y;
			bB.m_angularVelocity += bB.m_invI * (r2X * P2Y - r2Y * P2X);
		}
		if(this.m_limitState1 == b2Joint.e_atUpperLimit)
		{
			v1X = bA.m_linearVelocity.x + -bA.m_angularVelocity * r1Y;
			v1Y = bA.m_linearVelocity.y + bA.m_angularVelocity * r1X;
			Cdot = -(this.m_u1.x * v1X + this.m_u1.y * v1Y);
			impulse = -this.m_limitMass1 * Cdot;
			oldImpulse = this.m_limitImpulse1;
			this.m_limitImpulse1 = b2Math.Max(0, this.m_limitImpulse1 + impulse);
			impulse = this.m_limitImpulse1 - oldImpulse;
			P1X = -impulse * this.m_u1.x;
			P1Y = -impulse * this.m_u1.y;
			bA.m_linearVelocity.x += bA.m_invMass * P1X;
			bA.m_linearVelocity.y += bA.m_invMass * P1Y;
			bA.m_angularVelocity += bA.m_invI * (r1X * P1Y - r1Y * P1X);
		}
		if(this.m_limitState2 == b2Joint.e_atUpperLimit)
		{
			v2X = bB.m_linearVelocity.x + -bB.m_angularVelocity * r2Y;
			v2Y = bB.m_linearVelocity.y + bB.m_angularVelocity * r2X;
			Cdot = -(this.m_u2.x * v2X + this.m_u2.y * v2Y);
			impulse = -this.m_limitMass2 * Cdot;
			oldImpulse = this.m_limitImpulse2;
			this.m_limitImpulse2 = b2Math.Max(0, this.m_limitImpulse2 + impulse);
			impulse = this.m_limitImpulse2 - oldImpulse;
			P2X = -impulse * this.m_u2.x;
			P2Y = -impulse * this.m_u2.y;
			bB.m_linearVelocity.x += bB.m_invMass * P2X;
			bB.m_linearVelocity.y += bB.m_invMass * P2Y;
			bB.m_angularVelocity += bB.m_invI * (r2X * P2Y - r2Y * P2X);
		}
	}

	public SolvePositionConstraints(baumgarte:number) : boolean
	{
		var tMat:b2Mat22;
		var r1X:number = NaN;
		var r1Y:number = NaN;
		var r2X:number = NaN;
		var r2Y:number = NaN;
		var p1X:number = NaN;
		var p1Y:number = NaN;
		var p2X:number = NaN;
		var p2Y:number = NaN;
		var length1:number = NaN;
		var length2:number = NaN;
		var C:number = NaN;
		var impulse:number = NaN;
		var tX:number = NaN;
		var bA:b2Body = this.m_bodyA;
		var bB:b2Body = this.m_bodyB;
		var s1X:number = this.m_ground.m_xf.position.x + this.m_groundAnchor1.x;
		var s1Y:number = this.m_ground.m_xf.position.y + this.m_groundAnchor1.y;
		var s2X:number = this.m_ground.m_xf.position.x + this.m_groundAnchor2.x;
		var s2Y:number = this.m_ground.m_xf.position.y + this.m_groundAnchor2.y;
		var linearError:number = 0;
		if(this.m_state == b2Joint.e_atUpperLimit)
		{
			tMat = bA.m_xf.R;
			r1X = this.m_localAnchor1.x - bA.m_sweep.localCenter.x;
			r1Y = this.m_localAnchor1.y - bA.m_sweep.localCenter.y;
			tX = tMat.col1.x * r1X + tMat.col2.x * r1Y;
			r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
			r1X = tX;
			tMat = bB.m_xf.R;
			r2X = this.m_localAnchor2.x - bB.m_sweep.localCenter.x;
			r2Y = this.m_localAnchor2.y - bB.m_sweep.localCenter.y;
			tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
			r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
			r2X = tX;
			p1X = bA.m_sweep.c.x + r1X;
			p1Y = bA.m_sweep.c.y + r1Y;
			p2X = bB.m_sweep.c.x + r2X;
			p2Y = bB.m_sweep.c.y + r2Y;
			this.m_u1.Set(p1X - s1X, p1Y - s1Y);
			this.m_u2.Set(p2X - s2X, p2Y - s2Y);
			length1 = this.m_u1.Length();
			length2 = this.m_u2.Length();
			if(length1 > b2Settings.b2_linearSlop)
			{
				this.m_u1.Multiply(1 / length1);
			}
			else
			{
				this.m_u1.SetZero();
			}
			if(length2 > b2Settings.b2_linearSlop)
			{
				this.m_u2.Multiply(1 / length2);
			}
			else
			{
				this.m_u2.SetZero();
			}
			C = this.m_constant - length1 - this.m_ratio * length2;
			linearError = b2Math.Max(linearError, -C);
			C = b2Math.Clamp(C + b2Settings.b2_linearSlop, -b2Settings.b2_maxLinearCorrection, 0);
			impulse = -this.m_pulleyMass * C;
			p1X = -impulse * this.m_u1.x;
			p1Y = -impulse * this.m_u1.y;
			p2X = -this.m_ratio * impulse * this.m_u2.x;
			p2Y = -this.m_ratio * impulse * this.m_u2.y;
			bA.m_sweep.c.x += bA.m_invMass * p1X;
			bA.m_sweep.c.y += bA.m_invMass * p1Y;
			bA.m_sweep.a += bA.m_invI * (r1X * p1Y - r1Y * p1X);
			bB.m_sweep.c.x += bB.m_invMass * p2X;
			bB.m_sweep.c.y += bB.m_invMass * p2Y;
			bB.m_sweep.a += bB.m_invI * (r2X * p2Y - r2Y * p2X);
			bA.SynchronizeTransform();
			bB.SynchronizeTransform();
		}
		if(this.m_limitState1 == b2Joint.e_atUpperLimit)
		{
			tMat = bA.m_xf.R;
			r1X = this.m_localAnchor1.x - bA.m_sweep.localCenter.x;
			r1Y = this.m_localAnchor1.y - bA.m_sweep.localCenter.y;
			tX = tMat.col1.x * r1X + tMat.col2.x * r1Y;
			r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
			r1X = tX;
			p1X = bA.m_sweep.c.x + r1X;
			p1Y = bA.m_sweep.c.y + r1Y;
			this.m_u1.Set(p1X - s1X, p1Y - s1Y);
			length1 = this.m_u1.Length();
			if(length1 > b2Settings.b2_linearSlop)
			{
				this.m_u1.x *= 1 / length1;
				this.m_u1.y *= 1 / length1;
			}
			else
			{
				this.m_u1.SetZero();
			}
			C = this.m_maxLength1 - length1;
			linearError = b2Math.Max(linearError, -C);
			C = b2Math.Clamp(C + b2Settings.b2_linearSlop, -b2Settings.b2_maxLinearCorrection, 0);
			impulse = -this.m_limitMass1 * C;
			p1X = -impulse * this.m_u1.x;
			p1Y = -impulse * this.m_u1.y;
			bA.m_sweep.c.x += bA.m_invMass * p1X;
			bA.m_sweep.c.y += bA.m_invMass * p1Y;
			bA.m_sweep.a += bA.m_invI * (r1X * p1Y - r1Y * p1X);
			bA.SynchronizeTransform();
		}
		if(this.m_limitState2 == b2Joint.e_atUpperLimit)
		{
			tMat = bB.m_xf.R;
			r2X = this.m_localAnchor2.x - bB.m_sweep.localCenter.x;
			r2Y = this.m_localAnchor2.y - bB.m_sweep.localCenter.y;
			tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
			r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
			r2X = tX;
			p2X = bB.m_sweep.c.x + r2X;
			p2Y = bB.m_sweep.c.y + r2Y;
			this.m_u2.Set(p2X - s2X, p2Y - s2Y);
			length2 = this.m_u2.Length();
			if(length2 > b2Settings.b2_linearSlop)
			{
				this.m_u2.x *= 1 / length2;
				this.m_u2.y *= 1 / length2;
			}
			else
			{
				this.m_u2.SetZero();
			}
			C = this.m_maxLength2 - length2;
			linearError = b2Math.Max(linearError, -C);
			C = b2Math.Clamp(C + b2Settings.b2_linearSlop, -b2Settings.b2_maxLinearCorrection, 0);
			impulse = -this.m_limitMass2 * C;
			p2X = -impulse * this.m_u2.x;
			p2Y = -impulse * this.m_u2.y;
			bB.m_sweep.c.x += bB.m_invMass * p2X;
			bB.m_sweep.c.y += bB.m_invMass * p2Y;
			bB.m_sweep.a += bB.m_invI * (r2X * p2Y - r2Y * p2X);
			bB.SynchronizeTransform();
		}
		return linearError < b2Settings.b2_linearSlop;
	}

	public static b2_minPulleyLength:number = 2.0;

	private m_ground!:b2Body;
	private m_groundAnchor1:b2Vec2;
	private m_groundAnchor2:b2Vec2;
	private m_localAnchor1:b2Vec2;
	private m_localAnchor2:b2Vec2;

	private m_u1:b2Vec2;
	private m_u2:b2Vec2;

	private m_constant:number = 0;
	private m_ratio:number = 0;

	private m_maxLength1:number = 0;
	private m_maxLength2:number = 0;

	// Effective masses
	private m_pulleyMass:number = 0;
	private m_limitMass1:number = 0;
	private m_limitMass2:number = 0;

	// Impulses for accumulation/warm starting.
	private m_impulse:number = 0;
	private m_limitImpulse1:number = 0;
	private m_limitImpulse2:number = 0;

	private m_state:number = 0;
	private m_limitState1:number = 0;
	private m_limitState2:number = 0;
}
