﻿/*
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

import { b2JointDef, b2Joint } from "../..";

/// Gear joint definition. This definition requires two existing
/// revolute or prismatic joints (any combination will work).
/// The provided joints must attach a dynamic body to a static body.

export class b2GearJointDef extends b2JointDef
{
	constructor()
	{
		super()
		this.type = b2Joint.e_gearJoint;
		this.joint1 = null;
		this.joint2 = null;
		this.ratio = 1.0;
	}

	/// The first revolute/prismatic joint attached to the gear joint.
	public joint1:b2Joint;
	/// The second revolute/prismatic joint attached to the gear joint.
	public joint2:b2Joint;
	/// The gear ratio.
	/// @see b2GearJoint for explanation.
	public ratio:number;
};

}
