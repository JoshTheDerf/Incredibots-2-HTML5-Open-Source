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

import { b2Body, b2Jacobian, b2Joint, b2GearJointDef, b2Mat22, b2PrismaticJoint, b2RevoluteJoint, b2Settings, b2TimeStep, b2Vec2 } from "../..";

/// A gear joint is used to connect two joints together. Either joint
/// can be a revolute or prismatic joint. You specify a gear ratio
/// to bind the motions together:
/// coordinate1 + ratio * coordinate2 = constant
/// The ratio can be negative or positive. If one joint is a revolute joint
/// and the other joint is a prismatic joint, then the ratio will have units
/// of length or units of 1/length.
/// @warning The revolute and prismatic joints must be attached to
/// fixed bodies (which must be body1 on those joints).
export class b2GearJoint extends b2Joint
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
		// TODO_ERIN not tested
		return new b2Vec2(inv_dt * this.m_impulse * this.m_J.linearB.x, inv_dt * this.m_impulse * this.m_J.linearB.y);
	}

	public GetReactionTorque(inv_dt:number) : number
	{
		// TODO_ERIN not tested
		var tMat:b2Mat22 = this.m_bodyB.m_xf.R;
		var rX:number = this.m_localAnchor1.x - this.m_bodyB.m_sweep.localCenter.x;
		var rY:number = this.m_localAnchor1.y - this.m_bodyB.m_sweep.localCenter.y;
		var tX:number = tMat.col1.x * rX + tMat.col2.x * rY;
		rY = tMat.col1.y * rX + tMat.col2.y * rY;
		rX = tX;

		var PX:number = this.m_impulse * this.m_J.linearB.x;
		var PY:number = this.m_impulse * this.m_J.linearB.y;
		return inv_dt * (this.m_impulse * this.m_J.angularB - rX * PY + rY * PX);
	}

	public GetRatio() : number
	{
		return this.m_ratio;
	}

	public SetRatio(ratio:number) : void
	{
		this.m_ratio = ratio;
	}

	//--------------- Internals Below -------------------

	constructor(def:b2GearJointDef){
		super(def);

		this.m_groundAnchor1 = new b2Vec2();
		this.m_groundAnchor2 = new b2Vec2();
		this.m_localAnchor1 = new b2Vec2();
		this.m_localAnchor2 = new b2Vec2();
		this.m_J = new b2Jacobian();

		var type1:number = def.joint1!.m_type;
		var type2:number = def.joint2!.m_type;

		this.m_revolute1 = null;
		this.m_prismatic1 = null;
		this.m_revolute2 = null;
		this.m_prismatic2 = null;

		var coordinate1:number;
		var coordinate2:number;

		this.m_ground1 = def.joint1!.GetBodyA();
		this.m_bodyA = def.joint1!.GetBodyB();
		if(type1 == b2Joint.e_revoluteJoint)
		{
			this.m_revolute1 = def.joint1 as b2RevoluteJoint;
			this.m_groundAnchor1.SetV(this.m_revolute1.m_localAnchor1);
			this.m_localAnchor1.SetV(this.m_revolute1.m_localAnchor2);
			coordinate1 = this.m_revolute1.GetJointAngle();
		}
		else
		{
			this.m_prismatic1 = def.joint1 as b2PrismaticJoint;
			this.m_groundAnchor1.SetV(this.m_prismatic1.m_localAnchor1);
			this.m_localAnchor1.SetV(this.m_prismatic1.m_localAnchor2);
			coordinate1 = this.m_prismatic1.GetJointTranslation();
		}

		this.m_ground2 = def.joint2!.GetBodyA();
		this.m_bodyB = def.joint2!.GetBodyB();
		if(type2 == b2Joint.e_revoluteJoint)
		{
			this.m_revolute2 = def.joint2 as b2RevoluteJoint;
			this.m_groundAnchor2.SetV(this.m_revolute2.m_localAnchor1);
			this.m_localAnchor2.SetV(this.m_revolute2.m_localAnchor2);
			coordinate2 = this.m_revolute2.GetJointAngle();
		}
		else
		{
			this.m_prismatic2 = def.joint2 as b2PrismaticJoint;
			this.m_groundAnchor2.SetV(this.m_prismatic2.m_localAnchor1);
			this.m_localAnchor2.SetV(this.m_prismatic2.m_localAnchor2);
			coordinate2 = this.m_prismatic2.GetJointTranslation();
		}

		this.m_ratio = def.ratio;
		this.m_constant = coordinate1 + this.m_ratio * coordinate2;
		this.m_impulse = 0.0;
	}

	public InitVelocityConstraints(step:b2TimeStep) : void
	{
		var g1:b2Body = this.m_ground1;
		var g2:b2Body = this.m_ground2;
		var bA:b2Body = this.m_bodyA;
		var bB:b2Body = this.m_bodyB;

		// temp vars
		var ugX:number;
		var ugY:number;
		var rX:number;
		var rY:number;
		var tMat:b2Mat22;
		var tVec:b2Vec2;
		var crug:number;
		var tX:number;

		var K:number = 0.0;
		this.m_J.SetZero();

		if(this.m_revolute1)
		{
			this.m_J.angularA = -1.0;
			K += bA.m_invI;
		}
		else
		{
			tMat = g1.m_xf.R;
			tVec = this.m_prismatic1!.m_localXAxis1;
			ugX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
			ugY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

			tMat = bA.m_xf.R;
			rX = this.m_localAnchor1.x - bA.m_sweep.localCenter.x;
			rY = this.m_localAnchor1.y - bA.m_sweep.localCenter.y;
			tX = tMat.col1.x * rX + tMat.col2.x * rY;
			rY = tMat.col1.y * rX + tMat.col2.y * rY;
			rX = tX;

			crug = rX * ugY - rY * ugX;
			this.m_J.linearA.Set(-ugX, -ugY);
			this.m_J.angularA = -crug;
			K += bA.m_invMass + bA.m_invI * crug * crug;
		}

		if(this.m_revolute2)
		{
			this.m_J.angularB = -this.m_ratio;
			K += this.m_ratio * this.m_ratio * bB.m_invI;
		}
		else
		{
			tMat = g2.m_xf.R;
			tVec = this.m_prismatic2!.m_localXAxis1;
			ugX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
			ugY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;

			tMat = bB.m_xf.R;
			rX = this.m_localAnchor2.x - bB.m_sweep.localCenter.x;
			rY = this.m_localAnchor2.y - bB.m_sweep.localCenter.y;
			tX = tMat.col1.x * rX + tMat.col2.x * rY;
			rY = tMat.col1.y * rX + tMat.col2.y * rY;
			rX = tX;

			crug = rX * ugY - rY * ugX;
			this.m_J.linearB.Set(-this.m_ratio * ugX, -this.m_ratio * ugY);
			this.m_J.angularB = -this.m_ratio * crug;
			K += this.m_ratio * this.m_ratio * (bB.m_invMass + bB.m_invI * crug * crug);
		}

		// Compute effective mass.
		this.m_mass = K > 0.0 ? 1.0 / K : 0.0;

		if(step.warmStarting)
		{
			// Warm starting.
			bA.m_linearVelocity.x += bA.m_invMass * this.m_impulse * this.m_J.linearA.x;
			bA.m_linearVelocity.y += bA.m_invMass * this.m_impulse * this.m_J.linearA.y;
			bA.m_angularVelocity += bA.m_invI * this.m_impulse * this.m_J.angularA;
			bB.m_linearVelocity.x += bB.m_invMass * this.m_impulse * this.m_J.linearB.x;
			bB.m_linearVelocity.y += bB.m_invMass * this.m_impulse * this.m_J.linearB.y;
			bB.m_angularVelocity += bB.m_invI * this.m_impulse * this.m_J.angularB;
		}
		else
		{
			this.m_impulse = 0.0;
		}
	}

	public SolveVelocityConstraints(step:b2TimeStep) : void
	{
		var bA:b2Body = this.m_bodyA;
		var bB:b2Body = this.m_bodyB;

		var Cdot:number = this.m_J.Compute(bA.m_linearVelocity, bA.m_angularVelocity, bB.m_linearVelocity, bB.m_angularVelocity);

		var impulse:number = -this.m_mass * Cdot;
		this.m_impulse += impulse;

		bA.m_linearVelocity.x += bA.m_invMass * impulse * this.m_J.linearA.x;
		bA.m_linearVelocity.y += bA.m_invMass * impulse * this.m_J.linearA.y;
		bA.m_angularVelocity += bA.m_invI * impulse * this.m_J.angularA;
		bB.m_linearVelocity.x += bB.m_invMass * impulse * this.m_J.linearB.x;
		bB.m_linearVelocity.y += bB.m_invMass * impulse * this.m_J.linearB.y;
		bB.m_angularVelocity += bB.m_invI * impulse * this.m_J.angularB;
	}

	public SolvePositionConstraints(baumgarte:number) : boolean
	{
		var linearError:number = 0.0;

		var bA:b2Body = this.m_bodyA;
		var bB:b2Body = this.m_bodyB;

		var coordinate1:number;
		var coordinate2:number;
		if(this.m_revolute1)
		{
			coordinate1 = this.m_revolute1.GetJointAngle();
		}
		else
		{
			coordinate1 = this.m_prismatic1!.GetJointTranslation();
		}

		if(this.m_revolute2)
		{
			coordinate2 = this.m_revolute2.GetJointAngle();
		}
		else
		{
			coordinate2 = this.m_prismatic2!.GetJointTranslation();
		}

		var C:number = this.m_constant - (coordinate1 + this.m_ratio * coordinate2);

		var impulse:number = -this.m_mass * C;

		bA.m_sweep.c.x += bA.m_invMass * impulse * this.m_J.linearA.x;
		bA.m_sweep.c.y += bA.m_invMass * impulse * this.m_J.linearA.y;
		bA.m_sweep.a += bA.m_invI * impulse * this.m_J.angularA;
		bB.m_sweep.c.x += bB.m_invMass * impulse * this.m_J.linearB.x;
		bB.m_sweep.c.y += bB.m_invMass * impulse * this.m_J.linearB.y;
		bB.m_sweep.a += bB.m_invI * impulse * this.m_J.angularB;

		bA.SynchronizeTransform();
		bB.SynchronizeTransform();

		// TODO_ERIN not implemented
		return linearError < b2Settings.b2_linearSlop;
	}

	private m_ground1!:b2Body;
	private m_ground2!:b2Body;

	// One of these is NULL.
	private m_revolute1:b2RevoluteJoint | null;
	private m_prismatic1:b2PrismaticJoint | null;

	// One of these is NULL.
	private m_revolute2:b2RevoluteJoint | null;
	private m_prismatic2:b2PrismaticJoint | null;

	private m_groundAnchor1:b2Vec2;
	private m_groundAnchor2:b2Vec2;

	private m_localAnchor1:b2Vec2;
	private m_localAnchor2:b2Vec2;

	private m_J:b2Jacobian;

	private m_constant:number = 0;
	private m_ratio:number = 0;

	// Effective mass
	private m_mass:number = 0;

	// Impulse for accumulation/warm starting.
	private m_impulse:number = 0;
}
