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

import { b2Shape, b2Vec2, b2ContactID } from "..";

/// This structure is used to report contact points.
export class b2ContactPoint
{
	public shape1:b2Shape;						///< the first shape
	public shape2:b2Shape;						///< the second shape
	public position:b2Vec2 = new b2Vec2();		///< position in world coordinates
	public velocity:b2Vec2 = new b2Vec2();		///< velocity of point on body2 relative to point on body1 (pre-solver)
	public normal:b2Vec2 = new b2Vec2();		///< points from shape1 to shape2
	public separation:number;					///< the separation is negative when shapes are touching
	public friction:number;						///< the combined friction coefficient
	public restitution:number;					///< the combined restitution coefficient
	public id:b2ContactID = new b2ContactID();	///< the contact id identifies the features in contact
};
