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

/// Weld joint definition. You need to specify local anchor points
/// where they are attached and the relative body angle. The position
/// of the anchor points is important for computing the reaction torque.
export class b2WeldJointDef extends b2JointDef
{
	constructor(){
		super();
		this.type = b2Joint.e_weldJoint;
		this.referenceAngle = 0.0;
	}

	public Initialize(bA:b2Body, bB:b2Body, anchor:b2Vec2) : void
	{
		this.bodyA = bA;
		this.bodyB = bB;
		this.localAnchorA.SetV(this.bodyA.GetLocalPoint(anchor));
		this.localAnchorB.SetV(this.bodyB.GetLocalPoint(anchor));
		this.referenceAngle = this.bodyB.GetAngle() - this.bodyA.GetAngle();
	}

	/// The local anchor point relative to bodyA's origin.
	public localAnchorA:b2Vec2 = new b2Vec2();

	/// The local anchor point relative to bodyB's origin.
	public localAnchorB:b2Vec2 = new b2Vec2();

	/// The bodyB angle minus bodyA angle in the reference state (radians).
	public referenceAngle:number;
}
