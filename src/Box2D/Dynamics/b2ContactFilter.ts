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

import { b2FilterData, b2Shape } from "..";












/// Implement this class to provide collision filtering. In other words, you can implement
/// this class if you want finer control over contact creation.
export class b2ContactFilter
{

	/// Return true if contact calculations should be performed between these two shapes.
	/// @warning for performance reasons this is only called when the AABBs begin to overlap.
	public ShouldCollide(shape1:b2Shape, shape2:b2Shape) : boolean{
		var filter1:b2FilterData = shape1.GetFilterData();
		var filter2:b2FilterData = shape2.GetFilterData();

		if (filter1.groupIndex == filter2.groupIndex && filter1.groupIndex != 0)
		{
			return filter1.groupIndex > 0;
		}

		var collide:boolean = (filter1.maskBits & filter2.categoryBits) != 0 && (filter1.categoryBits & filter2.maskBits) != 0;
		return collide;
	}

	public static b2_defaultFilter:b2ContactFilter = new b2ContactFilter();

}
