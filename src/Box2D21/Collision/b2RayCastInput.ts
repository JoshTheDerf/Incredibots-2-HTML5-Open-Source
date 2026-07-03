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

import { b2Vec2 } from "..";



export class b2RayCastInput
{
	public p1:b2Vec2 = new b2Vec2();

	public p2:b2Vec2 = new b2Vec2();

	public maxFraction:number;

	constructor(p1:b2Vec2 | null = null, p2:b2Vec2 | null = null, maxFraction:number = 1)
	{
		if (p1)
		{
			this.p1.SetV(p1);
		}
		if (p2)
		{
			this.p2.SetV(p2);
		}
		this.maxFraction = maxFraction;
	}
}
