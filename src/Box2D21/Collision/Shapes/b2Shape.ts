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

import { b2AABB, b2Distance, b2DistanceInput, b2DistanceOutput, b2DistanceProxy, b2MassData, b2RayCastInput, b2RayCastOutput, b2Settings, b2SimplexCache, b2Transform, b2Vec2 } from "../..";

export class b2Shape
{
	public static e_unknownShape:number = -1;

	public static e_circleShape:number = 0;

	public static e_polygonShape:number = 1;

	public static e_edgeShape:number = 2;

	public static e_shapeTypeCount:number = 3;

	public static e_hitCollide:number = 1;

	public static e_missCollide:number = 0;

	public static e_startsInsideCollide:number = -1;

	public m_type:number;

	public m_radius:number;

	constructor()
	{
		this.m_type = b2Shape.e_unknownShape;
		this.m_radius = b2Settings.b2_linearSlop;
	}

	public static TestOverlap(shape1:b2Shape, transform1:b2Transform, shape2:b2Shape, transform2:b2Transform) : boolean
	{
		var input:b2DistanceInput = new b2DistanceInput();
		input.proxyA = new b2DistanceProxy();
		input.proxyA.Set(shape1);
		input.proxyB = new b2DistanceProxy();
		input.proxyB.Set(shape2);
		input.transformA = transform1;
		input.transformB = transform2;
		input.useRadii = true;
		var cache:b2SimplexCache = new b2SimplexCache();
		cache.count = 0;
		var output:b2DistanceOutput = new b2DistanceOutput();
		b2Distance.Distance(output,cache,input);
		return output.distance < 10 * Number.MIN_VALUE;
	}

	public Copy() : b2Shape
	{
		return null!;
	}

	public Set(other:b2Shape) : void
	{
		this.m_radius = other.m_radius;
	}

	public GetType() : number
	{
		return this.m_type;
	}

	public TestPoint(xf:b2Transform, p:b2Vec2) : boolean
	{
		return false;
	}

	public RayCast(output:b2RayCastOutput, input:b2RayCastInput, transform:b2Transform) : boolean
	{
		return false;
	}

	public ComputeAABB(aabb:b2AABB, xf:b2Transform) : void
	{
	}

	public ComputeMass(massData:b2MassData, density:number) : void
	{
	}

	public ComputeSubmergedArea(normal:b2Vec2, offset:number, xf:b2Transform, c:b2Vec2) : number
	{
		return 0;
	}
}
