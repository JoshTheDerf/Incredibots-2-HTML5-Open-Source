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

import { b2ManifoldPoint, b2Settings, b2Vec2 } from "..";



export class b2Manifold
{

	public static e_circles:number = 1;

	public static e_faceA:number = 2;

	public static e_faceB:number = 4;

	public m_points:b2ManifoldPoint[];

	public m_localPlaneNormal:b2Vec2;

	public m_localPoint:b2Vec2;

	public m_type:number = 0;

	public m_pointCount:number = 0;

	constructor()
	{
		this.m_points = new Array<b2ManifoldPoint>(b2Settings.b2_maxManifoldPoints);
		var i:number = 0;
		while (i < b2Settings.b2_maxManifoldPoints)
		{
			this.m_points[i] = new b2ManifoldPoint();
			i++;
		}
		this.m_localPlaneNormal = new b2Vec2();
		this.m_localPoint = new b2Vec2();
	}

	public Reset():void
	{
		var i:number = 0;
		while (i < b2Settings.b2_maxManifoldPoints)
		{
			(this.m_points[i] as b2ManifoldPoint).Reset();
			i++;
		}
		this.m_localPlaneNormal.SetZero();
		this.m_localPoint.SetZero();
		this.m_type = 0;
		this.m_pointCount = 0;
	}

	public Set(m:b2Manifold):void
	{
		this.m_pointCount = m.m_pointCount;
		var i:number = 0;
		while (i < b2Settings.b2_maxManifoldPoints)
		{
			(this.m_points[i] as b2ManifoldPoint).Set(m.m_points[i]);
			i++;
		}
		this.m_localPlaneNormal.SetV(m.m_localPlaneNormal);
		this.m_localPoint.SetV(m.m_localPoint);
		this.m_type = m.m_type;
	}

	public Copy():b2Manifold
	{
		var copy:b2Manifold = new b2Manifold();
		copy.Set(this);
		return copy;
	}
}
