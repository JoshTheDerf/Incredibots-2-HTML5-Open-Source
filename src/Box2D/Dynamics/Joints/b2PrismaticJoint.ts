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

import { b2Joint, b2Vec2, b2Mat22, b2Body, b2PrismaticJointDef, b2TimeStep, b2Math, b2Settings, b2Jacobian } from "../..";

// Linear constraint (point-to-line)
// d = p2 - p1 = x2 + r2 - x1 - r1
// C = dot(ay1, d)
// Cdot = dot(d, cross(w1, ay1)) + dot(ay1, v2 + cross(w2, r2) - v1 - cross(w1, r1))
//      = -dot(ay1, v1) - dot(cross(d + r1, ay1), w1) + dot(ay1, v2) + dot(cross(r2, ay1), v2)
// J = [-ay1 -cross(d+r1,ay1) ay1 cross(r2,ay1)]
//
// Angular constraint
// C = a2 - a1 + a_initial
// Cdot = w2 - w1
// J = [0 0 -1 0 0 1]

// Motor/Limit linear constraint
// C = dot(ax1, d)
// Cdot = = -dot(ax1, v1) - dot(cross(d + r1, ax1), w1) + dot(ax1, v2) + dot(cross(r2, ax1), v2)
// J = [-ax1 -cross(d+r1,ax1) ax1 cross(r2,ax1)]


export class b2PrismaticJoint extends b2Joint
{
	public GetAnchor1():b2Vec2{
		return this.m_body1.GetWorldPoint(this.m_localAnchor1);
	}
	public GetAnchor2():b2Vec2{
		return this.m_body2.GetWorldPoint(this.m_localAnchor2);
	}
	public GetReactionForce() : b2Vec2
	{
		var tMat:b2Mat22 = this.m_body1.m_xf.R;
		//b2Vec2 ax1 = b2Mul(m_body1->m_xf.R, m_localXAxis1);
		var ax1X:number = this.m_limitForce* (tMat.col1.x * this.m_localXAxis1.x + tMat.col2.x * this.m_localXAxis1.y);
		var ax1Y:number = this.m_limitForce* (tMat.col1.y * this.m_localXAxis1.x + tMat.col2.y * this.m_localXAxis1.y);
		//b2Vec2 ay1 = b2Mul(m_body1->m_xf.R, m_localYAxis1);
		var ay1X:number = this.m_force* (tMat.col1.x * this.m_localYAxis1.x + tMat.col2.x * this.m_localYAxis1.y);
		var ay1Y:number = this.m_force* (tMat.col1.y * this.m_localYAxis1.x + tMat.col2.y * this.m_localYAxis1.y);

		//return m_limitForce * ax1 + m_force * ay1;
		return new b2Vec2( this.m_limitForce*ax1X + this.m_force*ay1X,  this.m_limitForce*ax1Y + this.m_force*ay1Y);
	}

	public GetReactionTorque() :number
	{
		return this.m_torque;
	}

	/// Get the current joint translation, usually in meters.
	public GetJointTranslation():number{
		var b1:b2Body = this.m_body1;
		var b2:b2Body = this.m_body2;

		var tMat:b2Mat22;

		var p1:b2Vec2 = b1.GetWorldPoint(this.m_localAnchor1);
		var p2:b2Vec2 = b2.GetWorldPoint(this.m_localAnchor2);
		//var d:b2Vec2 = b2Math.SubtractVV(p2, p1);
		var dX:number = p2.x - p1.x;
		var dY:number = p2.y - p1.y;
		//b2Vec2 axis = b1->GetWorldVector(m_localXAxis1);
		var axis:b2Vec2 = b1.GetWorldVector(this.m_localXAxis1);

		//float32 translation = b2Dot(d, axis);
		var translation:number = axis.x*dX + axis.y*dY;
		return translation;
	}

	/// Get the current joint translation speed, usually in meters per second.
	public GetJointSpeed():number{
		var b1:b2Body = this.m_body1;
		var b2:b2Body = this.m_body2;

		var tMat:b2Mat22;

		//b2Vec2 r1 = b2Mul(b1->m_xf.R, m_localAnchor1 - b1->GetLocalCenter());
		tMat = b1.m_xf.R;
		var r1X:number = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
		var r1Y:number = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
		var tX:number =  (tMat.col1.x * r1X + tMat.col2.x * r1Y);
		r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
		r1X = tX;
		//b2Vec2 r2 = b2Mul(b2->m_xf.R, m_localAnchor2 - b2->GetLocalCenter());
		tMat = b2.m_xf.R;
		var r2X:number = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
		var r2Y:number = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
		tX =  (tMat.col1.x * r2X + tMat.col2.x * r2Y);
		r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
		r2X = tX;

		//b2Vec2 p1 = b1->m_sweep.c + r1;
		var p1X:number = b1.m_sweep.c.x + r1X, p1Y:number = b1.m_sweep.c.y + r1Y,
		//b2Vec2 p2 = b2->m_sweep.c + r2;
		p2X:number = b2.m_sweep.c.x + r2X, p2Y:number = b2.m_sweep.c.y + r2Y;
		//var d:b2Vec2 = b2Math.SubtractVV(p2, p1);
		var dX:number = p2X - p1X, dY:number = p2Y - p1Y;
		//b2Vec2 axis = b1->GetWorldVector(m_localXAxis1);
		var axis:b2Vec2 = b1.GetWorldVector(this.m_localXAxis1);

		var v1:b2Vec2 = b1.m_linearVelocity, v2:b2Vec2 = b2.m_linearVelocity, w1:number = b1.m_angularVelocity, w2:number = b2.m_angularVelocity;

		//var speed:number = b2Math.b2Dot(d, b2Math.b2CrossFV(w1, ax1)) + b2Math.b2Dot(ax1, b2Math.SubtractVV( b2Math.SubtractVV( b2Math.AddVV( v2 , b2Math.b2CrossFV(w2, r2)) , v1) , b2Math.b2CrossFV(w1, r1)));
		//var b2D:number = (dX*(-w1 * ax1Y) + dY*(w1 * ax1X));
		//var b2D2:number = (ax1X * ((( v2.x + (-w2 * r2Y)) - v1.x) - (-w1 * r1Y)) + ax1Y * ((( v2.y + (w2 * r2X)) - v1.y) - (w1 * r1X)));
		var speed:number = (dX*(-w1 * axis.y) + dY*(w1 * axis.x)) + (axis.x * ((( v2.x + (-w2 * r2Y)) - v1.x) - (-w1 * r1Y)) + axis.y * ((( v2.y + (w2 * r2X)) - v1.y) - (w1 * r1X)));

		return speed;
	}

	/// Is the joint limit enabled?
	public IsLimitEnabled() :boolean
	{
		return this.m_enableLimit;
	}
	/// Enable/disable the joint limit.
	public EnableLimit(flag:boolean) : void
	{
		this.m_enableLimit = flag;
	}
	/// Get the lower joint limit, usually in meters.
	public GetLowerLimit() :number
	{
		return this.m_lowerTranslation;
	}
	/// Get the upper joint limit, usually in meters.
	public GetUpperLimit() :number
	{
		return this.m_upperTranslation;
	}
	/// Set the joint limits, usually in meters.
	public SetLimits(lower:number, upper:number) : void
	{
		//b2Settings.b2Assert(lower <= upper);
		this.m_lowerTranslation = lower;
		this.m_upperTranslation = upper;
	}
	/// Is the joint motor enabled?
	public IsMotorEnabled() :boolean
	{
		return this.m_enableMotor;
	}
	/// Enable/disable the joint motor.
	public EnableMotor(flag:boolean) : void
	{
		this.m_enableMotor = flag;
	}
	/// Set the motor speed, usually in meters per second.
	public SetMotorSpeed(speed:number) : void
	{
		this.m_motorSpeed = speed;
	}
	/// Get the motor speed, usually in meters per second.
	public GetMotorSpeed() :number
	{
		return this.m_motorSpeed;
	}

	/// Set the maximum motor force, usually in N.
	public SetMaxMotorForce(force:number) : void
	{
		this.m_maxMotorForce = force;
	}
	/// Get the current motor force, usually in N.
	public GetMotorForce() :number
	{
		return this.m_motorForce;
	}


	//--------------- Internals Below -------------------

	public constructor(def:b2PrismaticJointDef){
		super(def);

		var tMat:b2Mat22;
		var tX:number;
		var tY:number;

		this.m_localAnchor1.SetV(def.localAnchor1);
		this.m_localAnchor2.SetV(def.localAnchor2);
		this.m_localXAxis1.SetV(def.localAxis1);

		//m_localYAxis1 = b2Cross(1.0f, m_localXAxis1);
		this.m_localYAxis1.x = -this.m_localXAxis1.y;
		this.m_localYAxis1.y = this.m_localXAxis1.x;

		this.m_refAngle = def.referenceAngle;

		this.m_linearJacobian.SetZero();
		this.m_linearMass = 0.0;
		this.m_force = 0.0;

		this.m_angularMass = 0.0;
		this.m_torque = 0.0;

		this.m_motorJacobian.SetZero();
		this.m_motorMass = 0.0;
		this.m_motorForce = 0.0;
		this.m_limitForce = 0.0;
		this.m_limitPositionImpulse = 0.0;

		this.m_lowerTranslation = def.lowerTranslation;
		this.m_upperTranslation = def.upperTranslation;
		this.m_maxMotorForce = def.maxMotorForce;
		this.m_motorSpeed = def.motorSpeed;
		this.m_enableLimit = def.enableLimit;
		this.m_enableMotor = def.enableMotor;
	}

	public InitVelocityConstraints(step:b2TimeStep) : void{
		var b1:b2Body = this.m_body1;
		var b2:b2Body = this.m_body2;

		var tMat:b2Mat22;
		var tX:number;

		// Compute the effective masses.
		//b2Vec2 r1 = b2Mul(b1->m_xf.R, m_localAnchor1 - b1->GetLocalCenter());
		tMat = b1.m_xf.R;
		var r1X:number = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
		var r1Y:number = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
		tX =  (tMat.col1.x * r1X + tMat.col2.x * r1Y);
		r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
		r1X = tX;
		//b2Vec2 r2 = b2Mul(b2->m_xf.R, m_localAnchor2 - b2->GetLocalCenter());
		tMat = b2.m_xf.R;
		var r2X:number = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
		var r2Y:number = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
		tX =  (tMat.col1.x * r2X + tMat.col2.x * r2Y);
		r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
		r2X = tX;

		//float32 invMass1 = b1->m_invMass, invMass2 = b2->m_invMass;
		var invMass1:number = b1.m_invMass;
		var invMass2:number = b2.m_invMass;
		//float32 invI1 = b1->m_invI, invI2 = b2->m_invI;
		var invI1:number = b1.m_invI;
		var invI2:number = b2.m_invI;

		// Compute point to line constraint effective mass.
		// J = [-ay1 -cross(d+r1,ay1) ay1 cross(r2,ay1)]
		//b2Vec2 ay1 = b2Mul(b1->m_xf.R, m_localYAxis1);
		tMat = b1.m_xf.R;
		var ay1X:number = tMat.col1.x * this.m_localYAxis1.x + tMat.col2.x * this.m_localYAxis1.y;
		var ay1Y:number = tMat.col1.y * this.m_localYAxis1.x + tMat.col2.y * this.m_localYAxis1.y;
		//b2Vec2 e = b2->m_sweep.c + r2 - b1->m_sweep.c;	// e = d + r1
		var eX:number = b2.m_sweep.c.x + r2X - b1.m_sweep.c.x;
		var eY:number = b2.m_sweep.c.y + r2Y - b1.m_sweep.c.y;

		//m_linearJacobian.Set(-ay1, -b2Math.b2Cross(e, ay1), ay1, b2Math.b2Cross(r2, ay1));
		this.m_linearJacobian.linear1.x = -ay1X;
		this.m_linearJacobian.linear1.y = -ay1Y;
		this.m_linearJacobian.linear2.x = ay1X;
		this.m_linearJacobian.linear2.y = ay1Y;
		this.m_linearJacobian.angular1 = -(eX * ay1Y - eY * ay1X);
		this.m_linearJacobian.angular2 = r2X * ay1Y - r2Y * ay1X;

		this.m_linearMass =	invMass1 + invI1 * this.m_linearJacobian.angular1 * this.m_linearJacobian.angular1 +
						invMass2 + invI2 * this.m_linearJacobian.angular2 * this.m_linearJacobian.angular2;
		//b2Settings.b2Assert(m_linearMass > Number.MIN_VALUE);
		this.m_linearMass = 1.0 / this.m_linearMass;

		// Compute angular constraint effective mass.
		this.m_angularMass = invI1 + invI2;
		if (this.m_angularMass > Number.MIN_VALUE)
		{
			this.m_angularMass = 1.0 / this.m_angularMass;
		}

		// Compute motor and limit terms.
		if (this.m_enableLimit || this.m_enableMotor)
		{
			// The motor and limit share a Jacobian and effective mass.
			//b2Vec2 ax1 = b2Mul(b1->m_xf.R, m_localXAxis1);
			tMat = b1.m_xf.R;
			var ax1X:number = tMat.col1.x * this.m_localXAxis1.x + tMat.col2.x * this.m_localXAxis1.y;
			var ax1Y:number = tMat.col1.y * this.m_localXAxis1.x + tMat.col2.y * this.m_localXAxis1.y;
			//m_motorJacobian.Set(-ax1, -b2Cross(e, ax1), ax1, b2Cross(r2, ax1));
			this.m_motorJacobian.linear1.x = -ax1X; this.m_motorJacobian.linear1.y = -ax1Y;
			this.m_motorJacobian.linear2.x = ax1X; this.m_motorJacobian.linear2.y = ax1Y;
			this.m_motorJacobian.angular1 = -(eX * ax1Y - eY * ax1X);
			this.m_motorJacobian.angular2 = r2X * ax1Y - r2Y * ax1X;

			this.m_motorMass =	invMass1 + invI1 * this.m_motorJacobian.angular1 * this.m_motorJacobian.angular1 +
							invMass2 + invI2 * this.m_motorJacobian.angular2 * this.m_motorJacobian.angular2;
			//b2Settings.b2Assert(m_motorMass > Number.MIN_VALUE);
			this.m_motorMass = 1.0 / this.m_motorMass;

			if (this.m_enableLimit)
			{
				//b2Vec2 d = e - r1;	// p2 - p1
				var dX:number = eX - r1X;
				var dY:number = eY - r1Y;
				//float32 jointTranslation = b2Dot(ax1, d);
				var jointTranslation:number = ax1X * dX + ax1Y * dY;
				if (b2Math.b2Abs(this.m_upperTranslation - this.m_lowerTranslation) < 2.0 * b2Settings.b2_linearSlop)
				{
					this.m_limitState = b2PrismaticJoint.e_equalLimits;
				}
				else if (jointTranslation <= this.m_lowerTranslation)
				{
					if (this.m_limitState != b2PrismaticJoint.e_atLowerLimit)
					{
						this.m_limitForce = 0.0;
					}
					this.m_limitState = b2PrismaticJoint.e_atLowerLimit;
				}
				else if (jointTranslation >= this.m_upperTranslation)
				{
					if (this.m_limitState != b2PrismaticJoint.e_atUpperLimit)
					{
						this.m_limitForce = 0.0;
					}
					this.m_limitState = b2PrismaticJoint.e_atUpperLimit;
				}
				else
				{
					this.m_limitState = b2PrismaticJoint.e_inactiveLimit;
					this.m_limitForce = 0.0;
				}
			}
		}

		if (this.m_enableMotor == false)
		{
			this.m_motorForce = 0.0;
		}

		if (this.m_enableLimit == false)
		{
			this.m_limitForce = 0.0;
		}

		if (step.warmStarting)
		{
			//b2Vec2 P1 = step.dt * (m_force * m_linearJacobian.linear1 + (m_motorForce + m_limitForce) * m_motorJacobian.linear1);
			var P1X:number = step.dt * (this.m_force * this.m_linearJacobian.linear1.x + (this.m_motorForce + this.m_limitForce) * this.m_motorJacobian.linear1.x);
			var P1Y:number = step.dt * (this.m_force * this.m_linearJacobian.linear1.y + (this.m_motorForce + this.m_limitForce) * this.m_motorJacobian.linear1.y);
			//b2Vec2 P2 = step.dt * (m_force * m_linearJacobian.linear2 + (m_motorForce + m_limitForce) * m_motorJacobian.linear2);
			var P2X:number = step.dt * (this.m_force * this.m_linearJacobian.linear2.x + (this.m_motorForce + this.m_limitForce) * this.m_motorJacobian.linear2.x);
			var P2Y:number = step.dt * (this.m_force * this.m_linearJacobian.linear2.y + (this.m_motorForce + this.m_limitForce) * this.m_motorJacobian.linear2.y);
			//float32 L1 = step.dt * (m_force * m_linearJacobian.angular1 - m_torque + (m_motorForce + m_limitForce) * m_motorJacobian.angular1);
			var L1:number = step.dt * (this.m_force * this.m_linearJacobian.angular1 - this.m_torque + (this.m_motorForce + this.m_limitForce) * this.m_motorJacobian.angular1);
			//float32 L2 = step.dt * (m_force * m_linearJacobian.angular2 + m_torque + (m_motorForce + m_limitForce) * m_motorJacobian.angular2);
			var L2:number = step.dt * (this.m_force * this.m_linearJacobian.angular2 + this.m_torque + (this.m_motorForce + this.m_limitForce) * this.m_motorJacobian.angular2);

			//b1->m_linearVelocity += invMass1 * P1;
			b1.m_linearVelocity.x += invMass1 * P1X;
			b1.m_linearVelocity.y += invMass1 * P1Y;
			//b1->m_angularVelocity += invI1 * L1;
			b1.m_angularVelocity += invI1 * L1;

			//b2->m_linearVelocity += invMass2 * P2;
			b2.m_linearVelocity.x += invMass2 * P2X;
			b2.m_linearVelocity.y += invMass2 * P2Y;
			//b2->m_angularVelocity += invI2 * L2;
			b2.m_angularVelocity += invI2 * L2;
		}
		else
		{
			this.m_force = 0.0;
			this.m_torque = 0.0;
			this.m_limitForce = 0.0;
			this.m_motorForce = 0.0;
		}

		this.m_limitPositionImpulse = 0.0;

	}

	public SolveVelocityConstraints(step:b2TimeStep) : void{
		var b1:b2Body = this.m_body1, b2:b2Body = this.m_body2;
		var invMass1:number = b1.m_invMass, invMass2:number = b2.m_invMass, invI1:number = b1.m_invI, invI2:number = b2.m_invI, oldLimitForce:number;

		// Solve linear constraint.
		var linearCdot:number = this.m_linearJacobian.Compute(b1.m_linearVelocity, b1.m_angularVelocity, b2.m_linearVelocity, b2.m_angularVelocity);
		var force:number = -step.inv_dt * this.m_linearMass * linearCdot;
		this.m_force += force;

		var P:number = step.dt * force;
		//b1->m_linearVelocity += (invMass1 * P) * m_linearJacobian.linear1;
		b1.m_linearVelocity.x += (invMass1 * P) * this.m_linearJacobian.linear1.x;
		b1.m_linearVelocity.y += (invMass1 * P) * this.m_linearJacobian.linear1.y;
		//b1->m_angularVelocity += invI1 * P * m_linearJacobian.angular1;
		b1.m_angularVelocity += invI1 * P * this.m_linearJacobian.angular1;

		//b2->m_linearVelocity += (invMass2 * P) * m_linearJacobian.linear2;
		b2.m_linearVelocity.x += (invMass2 * P) * this.m_linearJacobian.linear2.x;
		b2.m_linearVelocity.y += (invMass2 * P) * this.m_linearJacobian.linear2.y;
		//b2.m_angularVelocity += invI2 * P * m_linearJacobian.angular2;
		b2.m_angularVelocity += invI2 * P * this.m_linearJacobian.angular2;

		// Solve angular constraint.
		var angularCdot:number = b2.m_angularVelocity - b1.m_angularVelocity;
		var torque:number = -step.inv_dt * this.m_angularMass * angularCdot;
		this.m_torque += torque;

		var L:number = step.dt * torque;
		b1.m_angularVelocity -= invI1 * L;
		b2.m_angularVelocity += invI2 * L;

		// Solve linear motor constraint.
		if (this.m_enableMotor && this.m_limitState != b2PrismaticJoint.e_equalLimits)
		{
			var motorCdot:number = this.m_motorJacobian.Compute(b1.m_linearVelocity, b1.m_angularVelocity, b2.m_linearVelocity, b2.m_angularVelocity) - this.m_motorSpeed;
			var motorForce:number = -step.inv_dt * this.m_motorMass * motorCdot;
			var oldMotorForce:number = this.m_motorForce;
			this.m_motorForce = b2Math.b2Clamp(this.m_motorForce + motorForce, -this.m_maxMotorForce, this.m_maxMotorForce);
			motorForce = this.m_motorForce - oldMotorForce;

			P = step.dt * motorForce;
			//b1.m_linearVelocity += (invMass1 * P) * m_motorJacobian.linear1;
			b1.m_linearVelocity.x += (invMass1 * P) * this.m_motorJacobian.linear1.x;
			b1.m_linearVelocity.y += (invMass1 * P) * this.m_motorJacobian.linear1.y;
			//b1.m_angularVelocity += invI1 * P * m_motorJacobian.angular1;
			b1.m_angularVelocity += invI1 * P * this.m_motorJacobian.angular1;

			//b2->m_linearVelocity += (invMass2 * P) * m_motorJacobian.linear2;
			b2.m_linearVelocity.x += (invMass2 * P) * this.m_motorJacobian.linear2.x;
			b2.m_linearVelocity.y += (invMass2 * P) * this.m_motorJacobian.linear2.y;
			//b2->m_angularVelocity += invI2 * P * m_motorJacobian.angular2;
			b2.m_angularVelocity += invI2 * P * this.m_motorJacobian.angular2;
		}

		// Solve linear limit constraint.
		if (this.m_enableLimit && this.m_limitState != b2PrismaticJoint.e_inactiveLimit)
		{
			var limitCdot:number = this.m_motorJacobian.Compute(b1.m_linearVelocity, b1.m_angularVelocity, b2.m_linearVelocity, b2.m_angularVelocity);
			var limitForce:number = -step.inv_dt * this.m_motorMass * limitCdot;

			if (this.m_limitState == b2PrismaticJoint.e_equalLimits)
			{
				this.m_limitForce += limitForce;
			}
			else if (this.m_limitState == b2PrismaticJoint.e_atLowerLimit)
			{
				oldLimitForce = this.m_limitForce;
				this.m_limitForce = b2Math.b2Max(this.m_limitForce + limitForce, 0.0);
				limitForce = this.m_limitForce - oldLimitForce;
			}
			else if (this.m_limitState == b2PrismaticJoint.e_atUpperLimit)
			{
				oldLimitForce = this.m_limitForce;
				this.m_limitForce = b2Math.b2Min(this.m_limitForce + limitForce, 0.0);
				limitForce = this.m_limitForce - oldLimitForce;
			}

			P = step.dt * limitForce;
			//b1->m_linearVelocity += (invMass1 * P) * m_motorJacobian.linear1;
			b1.m_linearVelocity.x += (invMass1 * P) * this.m_motorJacobian.linear1.x;
			b1.m_linearVelocity.y += (invMass1 * P) * this.m_motorJacobian.linear1.y;
			//b1->m_angularVelocity += invI1 * P * m_motorJacobian.angular1;
			b1.m_angularVelocity += invI1 * P * this.m_motorJacobian.angular1;

			//b2->m_linearVelocity += (invMass2 * P) * m_motorJacobian.linear2;
			b2.m_linearVelocity.x += (invMass2 * P) * this.m_motorJacobian.linear2.x;
			b2.m_linearVelocity.y += (invMass2 * P) * this.m_motorJacobian.linear2.y;
			//b2->m_angularVelocity += invI2 * P * m_motorJacobian.angular2;
			b2.m_angularVelocity += invI2 * P * this.m_motorJacobian.angular2;
		}
	}



	public SolvePositionConstraints():boolean{

		var limitC:number, oldLimitImpulse:number, b1:b2Body = this.m_body1, b2:b2Body = this.m_body2;
		var invMass1:number = b1.m_invMass, invMass2:number = b2.m_invMass, invI1:number = b1.m_invI, invI2:number = b2.m_invI, tMat:b2Mat22, tX:number;

		//b2Vec2 r1 = b2Mul(b1->m_xf.R, m_localAnchor1 - b1->GetLocalCenter());
		tMat = b1.m_xf.R;
		var r1X:number = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
		var r1Y:number = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
		tX =  (tMat.col1.x * r1X + tMat.col2.x * r1Y);
		r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
		r1X = tX;
		//b2Vec2 r2 = b2Mul(b2->m_xf.R, m_localAnchor2 - b2->GetLocalCenter());
		tMat = b2.m_xf.R;
		var r2X:number = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
		var r2Y:number = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
		tX =  (tMat.col1.x * r2X + tMat.col2.x * r2Y);
		r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
		r2X = tX;

		//b2Vec2 p1 = b1->m_sweep.c + r1;
		var p1X:number = b1.m_sweep.c.x + r1X, p1Y:number = b1.m_sweep.c.y + r1Y,
		//b2Vec2 p2 = b2->m_sweep.c + r2;
		p2X:number = b2.m_sweep.c.x + r2X, p2Y:number = b2.m_sweep.c.y + r2Y;
		//b2Vec2 d = p2 - p1;
		var dX:number = p2X - p1X, dY:number = p2Y - p1Y;
		//b2Vec2 ay1 = b2Mul(b1->m_xf.R, m_localYAxis1);
		tMat = b1.m_xf.R;
		var ay1X:number = tMat.col1.x * this.m_localYAxis1.x + tMat.col2.x * this.m_localYAxis1.y, ay1Y:number = tMat.col1.y * this.m_localYAxis1.x + tMat.col2.y * this.m_localYAxis1.y;

		// Solve linear (point-to-line) constraint.
		//float32 linearC = b2Dot(ay1, d);
		var linearC:number = ay1X*dX + ay1Y*dY;
		// Prevent overly large corrections.
		linearC = b2Math.b2Clamp(linearC, -b2Settings.b2_maxLinearCorrection, b2Settings.b2_maxLinearCorrection);
		var linearImpulse:number = -this.m_linearMass * linearC;

		//b1->m_sweep.c += (invMass1 * linearImpulse) * m_linearJacobian.linear1;
		b1.m_sweep.c.x += (invMass1 * linearImpulse) * this.m_linearJacobian.linear1.x;
		b1.m_sweep.c.y += (invMass1 * linearImpulse) * this.m_linearJacobian.linear1.y;
		//b1->m_sweep.a += invI1 * linearImpulse * m_linearJacobian.angular1;
		b1.m_sweep.a += invI1 * linearImpulse * this.m_linearJacobian.angular1;
		//b1->SynchronizeTransform(); // updated by angular constraint

		//b2->m_sweep.c += (invMass2 * linearImpulse) * m_linearJacobian.linear2;
		b2.m_sweep.c.x += (invMass2 * linearImpulse) * this.m_linearJacobian.linear2.x;
		b2.m_sweep.c.y += (invMass2 * linearImpulse) * this.m_linearJacobian.linear2.y;
		//b2->m_sweep.a += invI2 * linearImpulse * m_linearJacobian.angular2;
		b2.m_sweep.a += invI2 * linearImpulse * this.m_linearJacobian.angular2;
		//b2->SynchronizeTransform(); // updated by angular constraint

		var positionError:number = (linearC > 0.0 ? linearC : -linearC);

		// Solve angular constraint.
		var angularC:number = b2.m_sweep.a - b1.m_sweep.a - this.m_refAngle;
		// Prevent overly large corrections.
		angularC = b2Math.b2Clamp(angularC, -b2Settings.b2_maxAngularCorrection, b2Settings.b2_maxAngularCorrection);
		var angularImpulse:number = -this.m_angularMass * angularC;

		b1.m_sweep.a -= b1.m_invI * angularImpulse;
		b2.m_sweep.a += b2.m_invI * angularImpulse;
		b1.SynchronizeTransform();
		b2.SynchronizeTransform();

		var angularError:number = (angularC > 0.0 ? angularC : -angularC);

		// Solve linear limit constraint.
		if (this.m_enableLimit && this.m_limitState != b2PrismaticJoint.e_inactiveLimit)
		{

			//b2Vec2 r1 = b2Mul(b1->m_xf.R, m_localAnchor1 - b1->GetLocalCenter());
			tMat = b1.m_xf.R;
			r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
			r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
			tX =  (tMat.col1.x * r1X + tMat.col2.x * r1Y);
			r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
			r1X = tX;
			//b2Vec2 r2 = b2Mul(b2->m_xf.R, m_localAnchor2 - b2->GetLocalCenter());
			tMat = b2.m_xf.R;
			r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
			r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
			tX =  (tMat.col1.x * r2X + tMat.col2.x * r2Y);
			r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
			r2X = tX;

			//b2Vec2 p1 = b1->m_sweep.c + r1;
			p1X = b1.m_sweep.c.x + r1X;
			p1Y = b1.m_sweep.c.y + r1Y;
			//b2Vec2 p2 = b2->m_sweep.c + r2;
			p2X = b2.m_sweep.c.x + r2X;
			p2Y = b2.m_sweep.c.y + r2Y;
			//b2Vec2 d = p2 - p1;
			dX = p2X - p1X;
			dY = p2Y - p1Y;
			//b2Vec2 ax1 = b2Mul(b1->m_xf.R, m_localXAxis1);
			tMat = b1.m_xf.R;
			var ax1X:number = tMat.col1.x * this.m_localXAxis1.x + tMat.col2.x * this.m_localXAxis1.y, ax1Y:number = tMat.col1.y * this.m_localXAxis1.x + tMat.col2.y * this.m_localXAxis1.y;

			//float32 translation = b2Dot(ax1, d);
			var translation:number = (ax1X*dX + ax1Y*dY), limitImpulse:number = 0.0;

			if (this.m_limitState == b2PrismaticJoint.e_equalLimits)
			{
				// Prevent large angular corrections
				limitC = b2Math.b2Clamp(translation, -b2Settings.b2_maxLinearCorrection, b2Settings.b2_maxLinearCorrection);
				limitImpulse = -this.m_motorMass * limitC;
				positionError = b2Math.b2Max(positionError, b2Math.b2Abs(angularC));
			}
			else if (this.m_limitState == b2PrismaticJoint.e_atLowerLimit)
			{
				limitC = translation - this.m_lowerTranslation;
				positionError = b2Math.b2Max(positionError, -limitC);

				// Prevent large linear corrections and allow some slop.
				limitC = b2Math.b2Clamp(limitC + b2Settings.b2_linearSlop, -b2Settings.b2_maxLinearCorrection, 0.0);
				limitImpulse = -this.m_motorMass * limitC;
				oldLimitImpulse = this.m_limitPositionImpulse;
				this.m_limitPositionImpulse = b2Math.b2Max(this.m_limitPositionImpulse + limitImpulse, 0.0);
				limitImpulse = this.m_limitPositionImpulse - oldLimitImpulse;
			}
			else if (this.m_limitState == b2PrismaticJoint.e_atUpperLimit)
			{
				limitC = translation - this.m_upperTranslation;
				positionError = b2Math.b2Max(positionError, limitC);

				// Prevent large linear corrections and allow some slop.
				limitC = b2Math.b2Clamp(limitC - b2Settings.b2_linearSlop, 0.0, b2Settings.b2_maxLinearCorrection);
				limitImpulse = -this.m_motorMass * limitC;
				oldLimitImpulse = this.m_limitPositionImpulse;
				this.m_limitPositionImpulse = b2Math.b2Min(this.m_limitPositionImpulse + limitImpulse, 0.0);
				limitImpulse = this.m_limitPositionImpulse - oldLimitImpulse;
			}

			//b1->m_sweep.c += (invMass1 * limitImpulse) * m_motorJacobian.linear1;
			b1.m_sweep.c.x += (invMass1 * limitImpulse) * this.m_motorJacobian.linear1.x;
			b1.m_sweep.c.y += (invMass1 * limitImpulse) * this.m_motorJacobian.linear1.y;
			//b1->m_sweep.a += invI1 * limitImpulse * m_motorJacobian.angular1;
			b1.m_sweep.a += invI1 * limitImpulse * this.m_motorJacobian.angular1;

			//b2->m_sweep.c += (invMass2 * limitImpulse) * m_motorJacobian.linear2;
			b2.m_sweep.c.x += (invMass2 * limitImpulse) * this.m_motorJacobian.linear2.x;
			b2.m_sweep.c.y += (invMass2 * limitImpulse) * this.m_motorJacobian.linear2.y;
			//b2->m_sweep.a += invI2 * limitImpulse * m_motorJacobian.angular2;
			b2.m_sweep.a += invI2 * limitImpulse * this.m_motorJacobian.angular2;

			b1.SynchronizeTransform();
			b2.SynchronizeTransform();

		}

		return positionError <= b2Settings.b2_linearSlop && angularError <= b2Settings.b2_angularSlop;

	}

	public m_localAnchor1:b2Vec2 = new b2Vec2();
	public m_localAnchor2:b2Vec2 = new b2Vec2();
	public m_localXAxis1:b2Vec2 = new b2Vec2();
	public m_localYAxis1:b2Vec2 = new b2Vec2();
	public m_refAngle:number;

	public m_linearJacobian:b2Jacobian = new b2Jacobian();
	public m_linearMass:number;				// effective mass for point-to-line constraint.
	public m_force:number;

	public m_angularMass:number;			// effective mass for angular constraint.
	public m_torque:number;

	public m_motorJacobian:b2Jacobian = new b2Jacobian();
	public m_motorMass:number;			// effective mass for motor/limit translational constraint.
	public m_motorForce:number;
	public m_limitForce:number;
	public m_limitPositionImpulse:number;

	public m_lowerTranslation:number;
	public m_upperTranslation:number;
	public m_maxMotorForce:number;
	public m_motorSpeed:number;

	public m_enableLimit:boolean;
	public m_enableMotor:boolean;
	public m_limitState:number;
};

}
