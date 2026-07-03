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

import { b2Body, b2Joint, b2Mat22, b2MouseJointDef, b2TimeStep, b2Vec2 } from "../..";

/// A mouse joint is used to make a point on a body track a
/// specified world point. This a soft constraint with a maximum
/// force. This allows the constraint to stretch and without
/// applying huge forces.
export class b2MouseJoint extends b2Joint
{
	public GetAnchorA() : b2Vec2
	{
		return this.m_target;
	}

	public GetAnchorB() : b2Vec2
	{
		return this.m_bodyB.GetWorldPoint(this.m_localAnchor);
	}

	public GetReactionForce(inv_dt:number) : b2Vec2
	{
		return new b2Vec2(inv_dt * this.m_impulse.x, inv_dt * this.m_impulse.y);
	}

	public GetReactionTorque(inv_dt:number) : number
	{
		return 0.0;
	}

	public GetTarget() : b2Vec2
	{
		return this.m_target;
	}

	/// Use this to update the target point.
	public SetTarget(target:b2Vec2) : void
	{
		if(this.m_bodyB.IsAwake() == false)
		{
			this.m_bodyB.SetAwake(true);
		}
		this.m_target = target;
	}

	public GetMaxForce() : number
	{
		return this.m_maxForce;
	}

	public SetMaxForce(maxForce:number) : void
	{
		this.m_maxForce = maxForce;
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

	constructor(def:b2MouseJointDef){
		super(def);

		this.K = new b2Mat22();
		this.K1 = new b2Mat22();
		this.K2 = new b2Mat22();
		this.m_localAnchor = new b2Vec2();
		this.m_target = new b2Vec2();
		this.m_impulse = new b2Vec2();
		this.m_mass = new b2Mat22();
		this.m_C = new b2Vec2();

		this.m_target.SetV(def.target);
		var dX:number = this.m_target.x - this.m_bodyB.m_xf.position.x;
		var dY:number = this.m_target.y - this.m_bodyB.m_xf.position.y;
		var tMat:b2Mat22 = this.m_bodyB.m_xf.R;
		this.m_localAnchor.x = dX * tMat.col1.x + dY * tMat.col1.y;
		this.m_localAnchor.y = dX * tMat.col2.x + dY * tMat.col2.y;

		this.m_maxForce = def.maxForce;
		this.m_impulse.SetZero();

		this.m_frequencyHz = def.frequencyHz;
		this.m_dampingRatio = def.dampingRatio;

		this.m_beta = 0.0;
		this.m_gamma = 0.0;
	}

	// Presolve vars
	private K!:b2Mat22;
	private K1!:b2Mat22;
	private K2!:b2Mat22;
	public InitVelocityConstraints(step:b2TimeStep) : void
	{
		var b:b2Body = this.m_bodyB;

		var mass:number = b.GetMass();

		// Frequency
		var omega:number = 2.0 * Math.PI * this.m_frequencyHz;

		// Damping coefficient
		var d:number = 2.0 * mass * this.m_dampingRatio * omega;

		// Spring stiffness
		var k:number = mass * omega * omega;

		// magic formulas
		this.m_gamma = step.dt * (d + step.dt * k);
		this.m_gamma = this.m_gamma != 0.0 ? 1.0 / this.m_gamma : 0.0;
		this.m_beta = step.dt * k * this.m_gamma;

		var tMat:b2Mat22;

		// Compute the effective mass matrix.
		tMat = b.m_xf.R;
		var rX:number = this.m_localAnchor.x - b.m_sweep.localCenter.x;
		var rY:number = this.m_localAnchor.y - b.m_sweep.localCenter.y;
		var tX:number = tMat.col1.x * rX + tMat.col2.x * rY;
		rY = tMat.col1.y * rX + tMat.col2.y * rY;
		rX = tX;

		var invMass:number = b.m_invMass;
		var invI:number = b.m_invI;

		this.K1.col1.x = invMass;	this.K1.col2.x = 0.0;
		this.K1.col1.y = 0.0;		this.K1.col2.y = invMass;

		this.K2.col1.x = invI * rY * rY;	this.K2.col2.x = -invI * rX * rY;
		this.K2.col1.y = -invI * rX * rY;	this.K2.col2.y = invI * rX * rX;

		this.K.SetM(this.K1);
		this.K.AddM(this.K2);
		this.K.col1.x += this.m_gamma;
		this.K.col2.y += this.m_gamma;

		this.K.GetInverse(this.m_mass);

		this.m_C.x = b.m_sweep.c.x + rX - this.m_target.x;
		this.m_C.y = b.m_sweep.c.y + rY - this.m_target.y;

		// Cheat with some damping
		b.m_angularVelocity *= 0.98;

		// Warm starting.
		this.m_impulse.x *= step.dtRatio;
		this.m_impulse.y *= step.dtRatio;
		b.m_linearVelocity.x += invMass * this.m_impulse.x;
		b.m_linearVelocity.y += invMass * this.m_impulse.y;
		b.m_angularVelocity += invI * (rX * this.m_impulse.y - rY * this.m_impulse.x);
	}

	public SolveVelocityConstraints(step:b2TimeStep) : void
	{
		var b:b2Body = this.m_bodyB;

		var tMat:b2Mat22;
		var tX:number;
		var tY:number;

		// Compute the effective mass matrix.
		tMat = b.m_xf.R;
		var rX:number = this.m_localAnchor.x - b.m_sweep.localCenter.x;
		var rY:number = this.m_localAnchor.y - b.m_sweep.localCenter.y;
		tX = tMat.col1.x * rX + tMat.col2.x * rY;
		rY = tMat.col1.y * rX + tMat.col2.y * rY;
		rX = tX;

		// Cdot = v + cross(w, r)
		var CdotX:number = b.m_linearVelocity.x + (-b.m_angularVelocity * rY);
		var CdotY:number = b.m_linearVelocity.y + (b.m_angularVelocity * rX);

		tMat = this.m_mass;
		tX = CdotX + this.m_beta * this.m_C.x + this.m_gamma * this.m_impulse.x;
		tY = CdotY + this.m_beta * this.m_C.y + this.m_gamma * this.m_impulse.y;
		var impulseX:number = -(tMat.col1.x * tX + tMat.col2.x * tY);
		var impulseY:number = -(tMat.col1.y * tX + tMat.col2.y * tY);

		var oldImpulseX:number = this.m_impulse.x;
		var oldImpulseY:number = this.m_impulse.y;
		this.m_impulse.x += impulseX;
		this.m_impulse.y += impulseY;

		var maxImpulse:number = step.dt * this.m_maxForce;
		if(this.m_impulse.LengthSquared() > maxImpulse * maxImpulse)
		{
			this.m_impulse.Multiply(maxImpulse / this.m_impulse.Length());
		}

		impulseX = this.m_impulse.x - oldImpulseX;
		impulseY = this.m_impulse.y - oldImpulseY;

		b.m_linearVelocity.x += b.m_invMass * impulseX;
		b.m_linearVelocity.y += b.m_invMass * impulseY;
		b.m_angularVelocity += b.m_invI * (rX * impulseY - rY * impulseX);
	}

	public SolvePositionConstraints(baumgarte:number) : boolean
	{
		return true;
	}

	private m_localAnchor!:b2Vec2;
	private m_target!:b2Vec2;
	private m_impulse!:b2Vec2;

	private m_mass!:b2Mat22;	// effective mass for point-to-point constraint.
	private m_C!:b2Vec2;			// position error
	private m_maxForce:number = 0;
	private m_frequencyHz:number = 0;
	private m_dampingRatio:number = 0;
	private m_beta:number = 0;			// bias factor
	private m_gamma:number = 0;			// softness
}
