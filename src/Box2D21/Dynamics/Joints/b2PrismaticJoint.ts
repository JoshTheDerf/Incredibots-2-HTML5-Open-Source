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

import { b2Body, b2Joint, b2Mat22, b2Mat33, b2Math, b2PrismaticJointDef, b2Settings, b2TimeStep, b2Transform, b2Vec2, b2Vec3 } from "../..";

export class b2PrismaticJoint extends b2Joint
{
	constructor(def:b2PrismaticJointDef){
		super(def);

		this.m_localAnchor1 = new b2Vec2();
		this.m_localAnchor2 = new b2Vec2();
		this.m_localXAxis1 = new b2Vec2();
		this.m_localYAxis1 = new b2Vec2();
		this.m_axis = new b2Vec2();
		this.m_perp = new b2Vec2();
		this.m_K = new b2Mat33();
		this.m_impulse = new b2Vec3();

		this.m_localAnchor1.SetV(def.localAnchorA);
		this.m_localAnchor2.SetV(def.localAnchorB);
		this.m_localXAxis1.SetV(def.localAxisA);
		this.m_localYAxis1.x = -this.m_localXAxis1.y;
		this.m_localYAxis1.y = this.m_localXAxis1.x;
		this.m_refAngle = def.referenceAngle;
		this.m_impulse.SetZero();
		this.m_motorMass = 0;
		this.m_motorImpulse = 0;
		this.m_lowerTranslation = def.lowerTranslation;
		this.m_upperTranslation = def.upperTranslation;
		this.m_maxMotorForce = def.maxMotorForce;
		this.m_motorSpeed = def.motorSpeed;
		this.m_enableLimit = def.enableLimit;
		this.m_enableMotor = def.enableMotor;
		this.m_limitState = b2Joint.e_inactiveLimit;
		this.m_axis.SetZero();
		this.m_perp.SetZero();
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
		return new b2Vec2(inv_dt * (this.m_impulse.x * this.m_perp.x + (this.m_motorImpulse + this.m_impulse.z) * this.m_axis.x), inv_dt * (this.m_impulse.x * this.m_perp.y + (this.m_motorImpulse + this.m_impulse.z) * this.m_axis.y));
	}

	public GetReactionTorque(inv_dt:number) : number
	{
		return inv_dt * this.m_impulse.y;
	}

	public GetJointTranslation() : number
	{
		var tMat:b2Mat22;
		var bA:b2Body = this.m_bodyA;
		var bB:b2Body = this.m_bodyB;
		var p1:b2Vec2 = bA.GetWorldPoint(this.m_localAnchor1);
		var p2:b2Vec2 = bB.GetWorldPoint(this.m_localAnchor2);
		var dX:number = p2.x - p1.x;
		var dY:number = p2.y - p1.y;
		var axis:b2Vec2 = bA.GetWorldVector(this.m_localXAxis1);
		return axis.x * dX + axis.y * dY;
	}

	public GetJointSpeed() : number
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
		var p1X:number = bA.m_sweep.c.x + r1X;
		var p1Y:number = bA.m_sweep.c.y + r1Y;
		var p2X:number = bB.m_sweep.c.x + r2X;
		var p2Y:number = bB.m_sweep.c.y + r2Y;
		var dX:number = p2X - p1X;
		var dY:number = p2Y - p1Y;
		var axis:b2Vec2 = bA.GetWorldVector(this.m_localXAxis1);
		var v1:b2Vec2 = bA.m_linearVelocity;
		var v2:b2Vec2 = bB.m_linearVelocity;
		var w1:number = bA.m_angularVelocity;
		var w2:number = bB.m_angularVelocity;
		return dX * (-w1 * axis.y) + dY * (w1 * axis.x) + (axis.x * (v2.x + -w2 * r2Y - v1.x - -w1 * r1Y) + axis.y * (v2.y + w2 * r2X - v1.y - w1 * r1X));
	}

	public IsLimitEnabled() : boolean
	{
		return this.m_enableLimit;
	}

	public EnableLimit(flag:boolean) : void
	{
		this.m_bodyA.SetAwake(true);
		this.m_bodyB.SetAwake(true);
		this.m_enableLimit = flag;
	}

	public GetLowerLimit() : number
	{
		return this.m_lowerTranslation;
	}

	public GetUpperLimit() : number
	{
		return this.m_upperTranslation;
	}

	public SetLimits(lower:number, upper:number) : void
	{
		this.m_bodyA.SetAwake(true);
		this.m_bodyB.SetAwake(true);
		this.m_lowerTranslation = lower;
		this.m_upperTranslation = upper;
	}

	public IsMotorEnabled() : boolean
	{
		return this.m_enableMotor;
	}

	public EnableMotor(flag:boolean) : void
	{
		this.m_bodyA.SetAwake(true);
		this.m_bodyB.SetAwake(true);
		this.m_enableMotor = flag;
	}

	public SetMotorSpeed(speed:number) : void
	{
		this.m_bodyA.SetAwake(true);
		this.m_bodyB.SetAwake(true);
		this.m_motorSpeed = speed;
	}

	public GetMotorSpeed() : number
	{
		return this.m_motorSpeed;
	}

	public SetMaxMotorForce(force:number) : void
	{
		this.m_bodyA.SetAwake(true);
		this.m_bodyB.SetAwake(true);
		this.m_maxMotorForce = force;
	}

	public GetMotorForce() : number
	{
		return this.m_motorImpulse;
	}

	public InitVelocityConstraints(step:b2TimeStep) : void
	{
		var tMat:b2Mat22;
		var tX:number;
		var bA:b2Body = this.m_bodyA;
		var bB:b2Body = this.m_bodyB;
		this.m_localCenterA.SetV(bA.GetLocalCenter());
		this.m_localCenterB.SetV(bB.GetLocalCenter());
		var xf1:b2Transform = bA.GetTransform();
		var xf2:b2Transform = bB.GetTransform();
		tMat = bA.m_xf.R;
		var r1X:number = this.m_localAnchor1.x - this.m_localCenterA.x;
		var r1Y:number = this.m_localAnchor1.y - this.m_localCenterA.y;
		tX = tMat.col1.x * r1X + tMat.col2.x * r1Y;
		r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
		r1X = tX;
		tMat = bB.m_xf.R;
		var r2X:number = this.m_localAnchor2.x - this.m_localCenterB.x;
		var r2Y:number = this.m_localAnchor2.y - this.m_localCenterB.y;
		tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
		r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
		r2X = tX;
		var dX:number = bB.m_sweep.c.x + r2X - bA.m_sweep.c.x - r1X;
		var dY:number = bB.m_sweep.c.y + r2Y - bA.m_sweep.c.y - r1Y;
		this.m_invMassA = bA.m_invMass;
		this.m_invMassB = bB.m_invMass;
		this.m_invIA = bA.m_invI;
		this.m_invIB = bB.m_invI;
		this.m_axis.SetV(b2Math.MulMV(xf1.R, this.m_localXAxis1));
		this.m_a1 = (dX + r1X) * this.m_axis.y - (dY + r1Y) * this.m_axis.x;
		this.m_a2 = r2X * this.m_axis.y - r2Y * this.m_axis.x;
		this.m_motorMass = this.m_invMassA + this.m_invMassB + this.m_invIA * this.m_a1 * this.m_a1 + this.m_invIB * this.m_a2 * this.m_a2;
		if(this.m_motorMass > Number.MIN_VALUE)
		{
			this.m_motorMass = 1 / this.m_motorMass;
		}
		this.m_perp.SetV(b2Math.MulMV(xf1.R, this.m_localYAxis1));
		this.m_s1 = (dX + r1X) * this.m_perp.y - (dY + r1Y) * this.m_perp.x;
		this.m_s2 = r2X * this.m_perp.y - r2Y * this.m_perp.x;
		var m1:number = this.m_invMassA;
		var m2:number = this.m_invMassB;
		var i1:number = this.m_invIA;
		var i2:number = this.m_invIB;
		this.m_K.col1.x = m1 + m2 + i1 * this.m_s1 * this.m_s1 + i2 * this.m_s2 * this.m_s2;
		this.m_K.col1.y = i1 * this.m_s1 + i2 * this.m_s2;
		this.m_K.col1.z = i1 * this.m_s1 * this.m_a1 + i2 * this.m_s2 * this.m_a2;
		this.m_K.col2.x = this.m_K.col1.y;
		this.m_K.col2.y = i1 + i2;
		this.m_K.col2.z = i1 * this.m_a1 + i2 * this.m_a2;
		this.m_K.col3.x = this.m_K.col1.z;
		this.m_K.col3.y = this.m_K.col2.z;
		this.m_K.col3.z = m1 + m2 + i1 * this.m_a1 * this.m_a1 + i2 * this.m_a2 * this.m_a2;
		if(this.m_enableLimit)
		{
			var jointTransition:number = this.m_axis.x * dX + this.m_axis.y * dY;
			if(b2Math.Abs(this.m_upperTranslation - this.m_lowerTranslation) < 2 * b2Settings.b2_linearSlop)
			{
				this.m_limitState = b2Joint.e_equalLimits;
			}
			else if(jointTransition <= this.m_lowerTranslation)
			{
				if(this.m_limitState != b2Joint.e_atLowerLimit)
				{
					this.m_limitState = b2Joint.e_atLowerLimit;
					this.m_impulse.z = 0;
				}
			}
			else if(jointTransition >= this.m_upperTranslation)
			{
				if(this.m_limitState != b2Joint.e_atUpperLimit)
				{
					this.m_limitState = b2Joint.e_atUpperLimit;
					this.m_impulse.z = 0;
				}
			}
			else
			{
				this.m_limitState = b2Joint.e_inactiveLimit;
				this.m_impulse.z = 0;
			}
		}
		else
		{
			this.m_limitState = b2Joint.e_inactiveLimit;
		}
		if(this.m_enableMotor == false)
		{
			this.m_motorImpulse = 0;
		}
		if(step.warmStarting)
		{
			this.m_impulse.x *= step.dtRatio;
			this.m_impulse.y *= step.dtRatio;
			this.m_motorImpulse *= step.dtRatio;
			var PX:number = this.m_impulse.x * this.m_perp.x + (this.m_motorImpulse + this.m_impulse.z) * this.m_axis.x;
			var PY:number = this.m_impulse.x * this.m_perp.y + (this.m_motorImpulse + this.m_impulse.z) * this.m_axis.y;
			var L1:number = this.m_impulse.x * this.m_s1 + this.m_impulse.y + (this.m_motorImpulse + this.m_impulse.z) * this.m_a1;
			var L2:number = this.m_impulse.x * this.m_s2 + this.m_impulse.y + (this.m_motorImpulse + this.m_impulse.z) * this.m_a2;
			bA.m_linearVelocity.x -= this.m_invMassA * PX;
			bA.m_linearVelocity.y -= this.m_invMassA * PY;
			bA.m_angularVelocity -= this.m_invIA * L1;
			bB.m_linearVelocity.x += this.m_invMassB * PX;
			bB.m_linearVelocity.y += this.m_invMassB * PY;
			bB.m_angularVelocity += this.m_invIB * L2;
		}
		else
		{
			this.m_impulse.SetZero();
			this.m_motorImpulse = 0;
		}
	}

	public SolveVelocityConstraints(step:b2TimeStep) : void
	{
		var PX:number = NaN;
		var PY:number = NaN;
		var L1:number = NaN;
		var L2:number = NaN;
		var Cdot:number = NaN;
		var impulse:number = NaN;
		var oldImpulse:number = NaN;
		var maxImpulse:number = NaN;
		var Cdot2:number = NaN;
		var f1:b2Vec3;
		var df:b2Vec3;
		var b:number = NaN;
		var f2r:number = NaN;
		var df1:b2Vec2;
		var df2:b2Vec2;
		var bA:b2Body = this.m_bodyA;
		var bB:b2Body = this.m_bodyB;
		var v1:b2Vec2 = bA.m_linearVelocity;
		var w1:number = bA.m_angularVelocity;
		var v2:b2Vec2 = bB.m_linearVelocity;
		var w2:number = bB.m_angularVelocity;
		if(this.m_enableMotor && this.m_limitState != b2Joint.e_equalLimits)
		{
			Cdot = this.m_axis.x * (v2.x - v1.x) + this.m_axis.y * (v2.y - v1.y) + this.m_a2 * w2 - this.m_a1 * w1;
			impulse = this.m_motorMass * (this.m_motorSpeed - Cdot);
			oldImpulse = this.m_motorImpulse;
			maxImpulse = step.dt * this.m_maxMotorForce;
			this.m_motorImpulse = b2Math.Clamp(this.m_motorImpulse + impulse, -maxImpulse, maxImpulse);
			impulse = this.m_motorImpulse - oldImpulse;
			PX = impulse * this.m_axis.x;
			PY = impulse * this.m_axis.y;
			L1 = impulse * this.m_a1;
			L2 = impulse * this.m_a2;
			v1.x -= this.m_invMassA * PX;
			v1.y -= this.m_invMassA * PY;
			w1 -= this.m_invIA * L1;
			v2.x += this.m_invMassB * PX;
			v2.y += this.m_invMassB * PY;
			w2 += this.m_invIB * L2;
		}
		var Cdot1:number = this.m_perp.x * (v2.x - v1.x) + this.m_perp.y * (v2.y - v1.y) + this.m_s2 * w2 - this.m_s1 * w1;
		var Cdot1b:number = w2 - w1;
		if(this.m_enableLimit && this.m_limitState != b2Joint.e_inactiveLimit)
		{
			Cdot2 = this.m_axis.x * (v2.x - v1.x) + this.m_axis.y * (v2.y - v1.y) + this.m_a2 * w2 - this.m_a1 * w1;
			f1 = this.m_impulse.Copy();
			df = this.m_K.Solve33(new b2Vec3(), -Cdot1, -Cdot1b, -Cdot2);
			this.m_impulse.Add(df);
			if(this.m_limitState == b2Joint.e_atLowerLimit)
			{
				this.m_impulse.z = b2Math.Max(this.m_impulse.z, 0);
			}
			else if(this.m_limitState == b2Joint.e_atUpperLimit)
			{
				this.m_impulse.z = b2Math.Min(this.m_impulse.z, 0);
			}
			b = -Cdot1 - (this.m_impulse.z - f1.z) * this.m_K.col3.x;
			f2r = -Cdot1b - (this.m_impulse.z - f1.z) * this.m_K.col3.y;
			df1 = this.m_K.Solve22(new b2Vec2(), b, f2r);
			df1.x += f1.x;
			df1.y += f1.y;
			this.m_impulse.x = df1.x;
			this.m_impulse.y = df1.y;
			df.x = this.m_impulse.x - f1.x;
			df.y = this.m_impulse.y - f1.y;
			df.z = this.m_impulse.z - f1.z;
			PX = df.x * this.m_perp.x + df.z * this.m_axis.x;
			PY = df.x * this.m_perp.y + df.z * this.m_axis.y;
			L1 = df.x * this.m_s1 + df.y + df.z * this.m_a1;
			L2 = df.x * this.m_s2 + df.y + df.z * this.m_a2;
			v1.x -= this.m_invMassA * PX;
			v1.y -= this.m_invMassA * PY;
			w1 -= this.m_invIA * L1;
			v2.x += this.m_invMassB * PX;
			v2.y += this.m_invMassB * PY;
			w2 += this.m_invIB * L2;
		}
		else
		{
			df2 = this.m_K.Solve22(new b2Vec2(), -Cdot1, -Cdot1b);
			this.m_impulse.x += df2.x;
			this.m_impulse.y += df2.y;
			PX = df2.x * this.m_perp.x;
			PY = df2.x * this.m_perp.y;
			L1 = df2.x * this.m_s1 + df2.y;
			L2 = df2.x * this.m_s2 + df2.y;
			v1.x -= this.m_invMassA * PX;
			v1.y -= this.m_invMassA * PY;
			w1 -= this.m_invIA * L1;
			v2.x += this.m_invMassB * PX;
			v2.y += this.m_invMassB * PY;
			w2 += this.m_invIB * L2;
		}
		bA.m_linearVelocity.SetV(v1);
		bA.m_angularVelocity = w1;
		bB.m_linearVelocity.SetV(v2);
		bB.m_angularVelocity = w2;
	}

	public SolvePositionConstraints(baumgarte:number) : boolean
	{
		var m1:number = NaN;
		var m2:number = NaN;
		var tMat:b2Mat22;
		var tX:number = NaN;
		var i1:number = NaN;
		var i2:number = NaN;
		var translation:number = NaN;
		var k11:number = NaN;
		var k12:number = NaN;
		var k22:number = NaN;
		var impulse1:b2Vec2;
		var bA:b2Body = this.m_bodyA;
		var bB:b2Body = this.m_bodyB;
		var cA:b2Vec2 = bA.m_sweep.c;
		var aA:number = bA.m_sweep.a;
		var cB:b2Vec2 = bB.m_sweep.c;
		var aB:number = bB.m_sweep.a;
		var linearError:number = 0;
		var angularError:number = 0;
		var active:boolean = false;
		var C2:number = 0;
		var R1:b2Mat22 = b2Mat22.FromAngle(aA);
		var R2:b2Mat22 = b2Mat22.FromAngle(aB);
		tMat = R1;
		var r1X:number = this.m_localAnchor1.x - this.m_localCenterA.x;
		var r1Y:number = this.m_localAnchor1.y - this.m_localCenterA.y;
		tX = tMat.col1.x * r1X + tMat.col2.x * r1Y;
		r1Y = tMat.col1.y * r1X + tMat.col2.y * r1Y;
		r1X = tX;
		tMat = R2;
		var r2X:number = this.m_localAnchor2.x - this.m_localCenterB.x;
		var r2Y:number = this.m_localAnchor2.y - this.m_localCenterB.y;
		tX = tMat.col1.x * r2X + tMat.col2.x * r2Y;
		r2Y = tMat.col1.y * r2X + tMat.col2.y * r2Y;
		r2X = tX;
		var dX:number = cB.x + r2X - cA.x - r1X;
		var dY:number = cB.y + r2Y - cA.y - r1Y;
		if(this.m_enableLimit)
		{
			this.m_axis = b2Math.MulMV(R1, this.m_localXAxis1);
			this.m_a1 = (dX + r1X) * this.m_axis.y - (dY + r1Y) * this.m_axis.x;
			this.m_a2 = r2X * this.m_axis.y - r2Y * this.m_axis.x;
			translation = this.m_axis.x * dX + this.m_axis.y * dY;
			if(b2Math.Abs(this.m_upperTranslation - this.m_lowerTranslation) < 2 * b2Settings.b2_linearSlop)
			{
				C2 = b2Math.Clamp(translation, -b2Settings.b2_maxLinearCorrection, b2Settings.b2_maxLinearCorrection);
				linearError = b2Math.Abs(translation);
				active = true;
			}
			else if(translation <= this.m_lowerTranslation)
			{
				C2 = b2Math.Clamp(translation - this.m_lowerTranslation + b2Settings.b2_linearSlop, -b2Settings.b2_maxLinearCorrection, 0);
				linearError = this.m_lowerTranslation - translation;
				active = true;
			}
			else if(translation >= this.m_upperTranslation)
			{
				C2 = b2Math.Clamp(translation - this.m_upperTranslation + b2Settings.b2_linearSlop, 0, b2Settings.b2_maxLinearCorrection);
				linearError = translation - this.m_upperTranslation;
				active = true;
			}
		}
		this.m_perp = b2Math.MulMV(R1, this.m_localYAxis1);
		this.m_s1 = (dX + r1X) * this.m_perp.y - (dY + r1Y) * this.m_perp.x;
		this.m_s2 = r2X * this.m_perp.y - r2Y * this.m_perp.x;
		var impulse:b2Vec3 = new b2Vec3();
		var C1:number = this.m_perp.x * dX + this.m_perp.y * dY;
		var C1b:number = aB - aA - this.m_refAngle;
		linearError = b2Math.Max(linearError, b2Math.Abs(C1));
		angularError = b2Math.Abs(C1b);
		if(active)
		{
			m1 = this.m_invMassA;
			m2 = this.m_invMassB;
			i1 = this.m_invIA;
			i2 = this.m_invIB;
			this.m_K.col1.x = m1 + m2 + i1 * this.m_s1 * this.m_s1 + i2 * this.m_s2 * this.m_s2;
			this.m_K.col1.y = i1 * this.m_s1 + i2 * this.m_s2;
			this.m_K.col1.z = i1 * this.m_s1 * this.m_a1 + i2 * this.m_s2 * this.m_a2;
			this.m_K.col2.x = this.m_K.col1.y;
			this.m_K.col2.y = i1 + i2;
			this.m_K.col2.z = i1 * this.m_a1 + i2 * this.m_a2;
			this.m_K.col3.x = this.m_K.col1.z;
			this.m_K.col3.y = this.m_K.col2.z;
			this.m_K.col3.z = m1 + m2 + i1 * this.m_a1 * this.m_a1 + i2 * this.m_a2 * this.m_a2;
			this.m_K.Solve33(impulse, -C1, -C1b, -C2);
		}
		else
		{
			m1 = this.m_invMassA;
			m2 = this.m_invMassB;
			i1 = this.m_invIA;
			i2 = this.m_invIB;
			k11 = m1 + m2 + i1 * this.m_s1 * this.m_s1 + i2 * this.m_s2 * this.m_s2;
			k12 = i1 * this.m_s1 + i2 * this.m_s2;
			k22 = i1 + i2;
			this.m_K.col1.Set(k11, k12, 0);
			this.m_K.col2.Set(k12, k22, 0);
			impulse1 = this.m_K.Solve22(new b2Vec2(), -C1, -C1b);
			impulse.x = impulse1.x;
			impulse.y = impulse1.y;
			impulse.z = 0;
		}
		var PX:number = impulse.x * this.m_perp.x + impulse.z * this.m_axis.x;
		var PY:number = impulse.x * this.m_perp.y + impulse.z * this.m_axis.y;
		var L1:number = impulse.x * this.m_s1 + impulse.y + impulse.z * this.m_a1;
		var L2:number = impulse.x * this.m_s2 + impulse.y + impulse.z * this.m_a2;
		cA.x -= this.m_invMassA * PX;
		cA.y -= this.m_invMassA * PY;
		aA -= this.m_invIA * L1;
		cB.x += this.m_invMassB * PX;
		cB.y += this.m_invMassB * PY;
		aB += this.m_invIB * L2;
		bA.m_sweep.a = aA;
		bB.m_sweep.a = aB;
		bA.SynchronizeTransform();
		bB.SynchronizeTransform();
		return linearError <= b2Settings.b2_linearSlop && angularError <= b2Settings.b2_angularSlop;
	}

	public m_localAnchor1:b2Vec2;
	public m_localAnchor2:b2Vec2;
	public m_localXAxis1:b2Vec2;
	private m_localYAxis1:b2Vec2;
	private m_refAngle:number = 0;

	private m_axis:b2Vec2;
	private m_perp:b2Vec2;
	private m_s1:number = 0;
	private m_s2:number = 0;
	private m_a1:number = 0;
	private m_a2:number = 0;

	private m_K:b2Mat33;
	private m_impulse:b2Vec3;

	private m_motorMass:number = 0;			// effective mass for motor/limit translational constraint.
	private m_motorImpulse:number = 0;

	private m_lowerTranslation:number = 0;
	private m_upperTranslation:number = 0;
	private m_maxMotorForce:number = 0;
	private m_motorSpeed:number = 0;

	private m_enableLimit:boolean = false;
	private m_enableMotor:boolean = false;
	private m_limitState:number = 0;
}
