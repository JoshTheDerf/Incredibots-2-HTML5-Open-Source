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

import { b2Body, b2Joint, b2JointDef, b2Vec2 } from "../..";

/// Prismatic joint definition. This requires defining a line of
/// motion using an axis and an anchor point. The definition uses local
/// anchor points and a local axis so that the initial configuration
/// can violate the constraint slightly. The joint translation is zero
/// when the local anchor points coincide in world space. Using local
/// anchors and a local axis helps when saving and loading a game.
export class b2PrismaticJointDef extends b2JointDef
{
	constructor(){
		super();
		this.type = b2Joint.e_prismaticJoint;
		this.localAxisA.Set(1.0, 0.0);
		this.referenceAngle = 0.0;
		this.enableLimit = false;
		this.lowerTranslation = 0.0;
		this.upperTranslation = 0.0;
		this.enableMotor = false;
		this.maxMotorForce = 0.0;
		this.motorSpeed = 0.0;
	}

	public Initialize(bA:b2Body, bB:b2Body, anchor:b2Vec2, axis:b2Vec2) : void
	{
		this.bodyA = bA;
		this.bodyB = bB;
		this.localAnchorA = this.bodyA.GetLocalPoint(anchor);
		this.localAnchorB = this.bodyB.GetLocalPoint(anchor);
		this.localAxisA = this.bodyA.GetLocalVector(axis);
		this.referenceAngle = this.bodyB.GetAngle() - this.bodyA.GetAngle();
	}

	/// The local anchor point relative to bodyA's origin.
	public localAnchorA:b2Vec2 = new b2Vec2();

	/// The local anchor point relative to bodyB's origin.
	public localAnchorB:b2Vec2 = new b2Vec2();

	/// The local translation axis in bodyA.
	public localAxisA:b2Vec2 = new b2Vec2();

	/// The constrained angle between the bodies: bodyB_angle - bodyA_angle.
	public referenceAngle:number;

	/// Enable/disable the joint limit.
	public enableLimit:boolean;

	/// The lower translation limit, usually in meters.
	public lowerTranslation:number;

	/// The upper translation limit, usually in meters.
	public upperTranslation:number;

	/// Enable/disable the joint motor.
	public enableMotor:boolean;

	/// The maximum motor torque, usually in N-m.
	public maxMotorForce:number;

	/// The desired motor speed in radians per second.
	public motorSpeed:number;
}
