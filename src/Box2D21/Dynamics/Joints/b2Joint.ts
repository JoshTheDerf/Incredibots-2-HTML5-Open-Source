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

import { b2Body, b2DistanceJoint, b2DistanceJointDef, b2FrictionJoint, b2FrictionJointDef, b2GearJoint, b2GearJointDef, b2JointDef, b2JointEdge, b2LineJoint, b2LineJointDef, b2MouseJoint, b2MouseJointDef, b2PrismaticJoint, b2PrismaticJointDef, b2PulleyJoint, b2PulleyJointDef, b2RevoluteJoint, b2RevoluteJointDef, b2Settings, b2TimeStep, b2Vec2, b2WeldJoint, b2WeldJointDef } from "../..";

/// The base joint class. Joints are used to constraint two bodies together in
/// various fashions. Some joints also feature limits and motors.
export class b2Joint
{
	/// Get the type of the concrete joint.
	public GetType() : number
	{
		return this.m_type;
	}

	/// Get the anchor point on bodyA in world coordinates.
	public GetAnchorA() : b2Vec2
	{
		return null as any;
	}

	/// Get the anchor point on bodyB in world coordinates.
	public GetAnchorB() : b2Vec2
	{
		return null as any;
	}

	/// Get the reaction force on body2 at the joint anchor in Newtons.
	public GetReactionForce(inv_dt:number) : b2Vec2
	{
		return null as any;
	}

	/// Get the reaction torque on body2 in N*m.
	public GetReactionTorque(inv_dt:number) : number
	{
		return 0.0;
	}

	/// Get the first body attached to this joint.
	public GetBodyA() : b2Body
	{
		return this.m_bodyA;
	}

	/// Get the second body attached to this joint.
	public GetBodyB() : b2Body
	{
		return this.m_bodyB;
	}

	/// Get the next joint the world joint list.
	public GetNext() : b2Joint | null
	{
		return this.m_next;
	}

	/// Get the user data pointer.
	public GetUserData() : any
	{
		return this.m_userData;
	}

	/// Set the user data pointer.
	public SetUserData(data:any) : void
	{
		this.m_userData = data;
	}

	/// Short-cut function to determine if either body is inactive.
	public IsActive() : boolean
	{
		return this.m_bodyA.IsActive() && this.m_bodyB.IsActive();
	}

	//--------------- Internals Below -------------------

	public static Create(def:b2JointDef, allocator:any) : b2Joint | null
	{
		var joint:b2Joint | null = null;
		switch(def.type)
		{
			case b2Joint.e_distanceJoint:
				joint = new b2DistanceJoint(def as b2DistanceJointDef);
				break;
			case b2Joint.e_mouseJoint:
				joint = new b2MouseJoint(def as b2MouseJointDef);
				break;
			case b2Joint.e_prismaticJoint:
				joint = new b2PrismaticJoint(def as b2PrismaticJointDef);
				break;
			case b2Joint.e_revoluteJoint:
				joint = new b2RevoluteJoint(def as b2RevoluteJointDef);
				break;
			case b2Joint.e_pulleyJoint:
				joint = new b2PulleyJoint(def as b2PulleyJointDef);
				break;
			case b2Joint.e_gearJoint:
				joint = new b2GearJoint(def as b2GearJointDef);
				break;
			case b2Joint.e_lineJoint:
				joint = new b2LineJoint(def as b2LineJointDef);
				break;
			case b2Joint.e_weldJoint:
				joint = new b2WeldJoint(def as b2WeldJointDef);
				break;
			case b2Joint.e_frictionJoint:
				joint = new b2FrictionJoint(def as b2FrictionJointDef);
		}
		return joint;
	}

	public static Destroy(joint:b2Joint, allocator:any) : void
	{
	}

	constructor(def:b2JointDef){
		b2Settings.b2Assert(def.bodyA != def.bodyB);
		this.m_type = def.type;
		this.m_prev = null;
		this.m_next = null;
		this.m_bodyA = def.bodyA!;
		this.m_bodyB = def.bodyB!;
		this.m_collideConnected = def.collideConnected;
		this.m_islandFlag = false;
		this.m_userData = def.userData;
	}

	public InitVelocityConstraints(step:b2TimeStep) : void
	{
	}

	public SolveVelocityConstraints(step:b2TimeStep) : void
	{
	}

	public FinalizeVelocityConstraints() : void
	{
	}

	public SolvePositionConstraints(baumgarte:number) : boolean
	{
		return false;
	}

	// ENUMS

	// enum b2JointType
	public static e_unknownJoint:number = 0;
	public static e_revoluteJoint:number = 1;
	public static e_prismaticJoint:number = 2;
	public static e_distanceJoint:number = 3;
	public static e_pulleyJoint:number = 4;
	public static e_mouseJoint:number = 5;
	public static e_gearJoint:number = 6;
	public static e_lineJoint:number = 7;
	public static e_weldJoint:number = 8;
	public static e_frictionJoint:number = 9;

	// enum b2LimitState
	public static e_inactiveLimit:number = 0;
	public static e_atLowerLimit:number = 1;
	public static e_atUpperLimit:number = 2;
	public static e_equalLimits:number = 3;

	public m_type:number = 0;
	public m_prev:b2Joint | null = null;
	public m_next:b2Joint | null = null;
	public m_edgeA:b2JointEdge = new b2JointEdge();
	public m_edgeB:b2JointEdge = new b2JointEdge();
	public m_bodyA!:b2Body;
	public m_bodyB!:b2Body;

	public m_islandFlag:boolean = false;
	public m_collideConnected:boolean = false;

	private m_userData:any = null;

	// Cache here per time step to reduce cache misses.
	public m_localCenterA:b2Vec2 = new b2Vec2();
	public m_localCenterB:b2Vec2 = new b2Vec2();
	public m_invMassA:number = 0;
	public m_invMassB:number = 0;
	public m_invIA:number = 0;
	public m_invIB:number = 0;
}
