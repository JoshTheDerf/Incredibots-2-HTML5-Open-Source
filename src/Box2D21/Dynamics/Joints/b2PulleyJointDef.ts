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

import { b2Body, b2Joint, b2JointDef, b2PulleyJoint, b2Vec2 } from "../..";

/// Pulley joint definition. This requires two ground anchors,
/// two dynamic body anchor points, max lengths for each side,
/// and a pulley ratio.
export class b2PulleyJointDef extends b2JointDef
{
	constructor(){
		super();
		this.type = b2Joint.e_pulleyJoint;
		this.groundAnchorA.Set(-1.0, 1.0);
		this.groundAnchorB.Set(1.0, 1.0);
		this.localAnchorA.Set(-1.0, 0.0);
		this.localAnchorB.Set(1.0, 0.0);
		this.lengthA = 0.0;
		this.maxLengthA = 0.0;
		this.lengthB = 0.0;
		this.maxLengthB = 0.0;
		this.ratio = 1.0;
		this.collideConnected = true;
	}

	public Initialize(bA:b2Body, bB:b2Body, gaA:b2Vec2, gaB:b2Vec2, anchorA:b2Vec2, anchorB:b2Vec2, r:number) : void
	{
		this.bodyA = bA;
		this.bodyB = bB;
		this.groundAnchorA.SetV(gaA);
		this.groundAnchorB.SetV(gaB);
		this.localAnchorA = this.bodyA.GetLocalPoint(anchorA);
		this.localAnchorB = this.bodyB.GetLocalPoint(anchorB);
		var d1X:number = anchorA.x - gaA.x;
		var d1Y:number = anchorA.y - gaA.y;
		this.lengthA = Math.sqrt(d1X*d1X + d1Y*d1Y);
		var d2X:number = anchorB.x - gaB.x;
		var d2Y:number = anchorB.y - gaB.y;
		this.lengthB = Math.sqrt(d2X*d2X + d2Y*d2Y);
		this.ratio = r;
		var C:number = this.lengthA + this.ratio * this.lengthB;
		this.maxLengthA = C - this.ratio * b2PulleyJoint.b2_minPulleyLength;
		this.maxLengthB = (C - b2PulleyJoint.b2_minPulleyLength) / this.ratio;
	}

	/// The first ground anchor in world coordinates. This point never moves.
	public groundAnchorA:b2Vec2 = new b2Vec2();

	/// The second ground anchor in world coordinates. This point never moves.
	public groundAnchorB:b2Vec2 = new b2Vec2();

	/// The local anchor point relative to bodyA's origin.
	public localAnchorA:b2Vec2 = new b2Vec2();

	/// The local anchor point relative to bodyB's origin.
	public localAnchorB:b2Vec2 = new b2Vec2();

	/// The a reference length for the segment attached to bodyA.
	public lengthA:number;

	/// The maximum length of the segment attached to bodyA.
	public maxLengthA:number;

	/// The a reference length for the segment attached to bodyB.
	public lengthB:number;

	/// The maximum length of the segment attached to bodyB.
	public maxLengthB:number;

	/// The ratio of the pulley.
	public ratio:number;
}
