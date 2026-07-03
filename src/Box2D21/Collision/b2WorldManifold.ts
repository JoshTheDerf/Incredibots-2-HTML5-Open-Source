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

import { b2Manifold, b2Mat22, b2Settings, b2Transform, b2Vec2 } from "..";



export class b2WorldManifold
{

	public m_normal:b2Vec2 = new b2Vec2();

	public m_points:b2Vec2[];

	constructor()
	{
		this.m_points = new Array<b2Vec2>(b2Settings.b2_maxManifoldPoints);
		var i:number = 0;
		while (i < b2Settings.b2_maxManifoldPoints)
		{
			this.m_points[i] = new b2Vec2();
			i++;
		}
	}

	public Initialize(manifold:b2Manifold, xfA:b2Transform, radiusA:number, xfB:b2Transform, radiusB:number):void
	{
		var i:number = 0;
		var tVec:b2Vec2;
		var tMat:b2Mat22;
		var normalX:number;
		var normalY:number;
		var planePointX:number;
		var planePointY:number;
		var clipPointX:number;
		var clipPointY:number;
		var pointAX:number;
		var pointAY:number;
		var pointBX:number;
		var pointBY:number;
		var cAX:number;
		var cAY:number;
		var cBX:number;
		var cBY:number;
		var dX:number;
		var dY:number;
		var d2:number;
		var d:number;
		if (manifold.m_pointCount == 0)
		{
			return;
		}
		switch (manifold.m_type)
		{
			case b2Manifold.e_circles:
				tMat = xfA.R;
				tVec = manifold.m_localPoint;
				pointAX = xfA.position.x + tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
				pointAY = xfA.position.y + tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
				tMat = xfB.R;
				tVec = manifold.m_points[0].m_localPoint;
				pointBX = xfB.position.x + tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
				pointBY = xfB.position.y + tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
				dX = pointBX - pointAX;
				dY = pointBY - pointAY;
				d2 = dX * dX + dY * dY;
				if (d2 > Number.MIN_VALUE * Number.MIN_VALUE)
				{
					d = Math.sqrt(d2);
					this.m_normal.x = dX / d;
					this.m_normal.y = dY / d;
				}
				else
				{
					this.m_normal.x = 1;
					this.m_normal.y = 0;
				}
				cAX = pointAX + radiusA * this.m_normal.x;
				cAY = pointAY + radiusA * this.m_normal.y;
				cBX = pointBX - radiusB * this.m_normal.x;
				cBY = pointBY - radiusB * this.m_normal.y;
				this.m_points[0].x = 0.5 * (cAX + cBX);
				this.m_points[0].y = 0.5 * (cAY + cBY);
				break;
			case b2Manifold.e_faceA:
				tMat = xfA.R;
				tVec = manifold.m_localPlaneNormal;
				normalX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
				normalY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
				tMat = xfA.R;
				tVec = manifold.m_localPoint;
				planePointX = xfA.position.x + tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
				planePointY = xfA.position.y + tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
				this.m_normal.x = normalX;
				this.m_normal.y = normalY;
				i = 0;
				while (i < manifold.m_pointCount)
				{
					tMat = xfB.R;
					tVec = manifold.m_points[i].m_localPoint;
					clipPointX = xfB.position.x + tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
					clipPointY = xfB.position.y + tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
					this.m_points[i].x = clipPointX + 0.5 * (radiusA - (clipPointX - planePointX) * normalX - (clipPointY - planePointY) * normalY - radiusB) * normalX;
					this.m_points[i].y = clipPointY + 0.5 * (radiusA - (clipPointX - planePointX) * normalX - (clipPointY - planePointY) * normalY - radiusB) * normalY;
					i++;
				}
				break;
			case b2Manifold.e_faceB:
				tMat = xfB.R;
				tVec = manifold.m_localPlaneNormal;
				normalX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
				normalY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
				tMat = xfB.R;
				tVec = manifold.m_localPoint;
				planePointX = xfB.position.x + tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
				planePointY = xfB.position.y + tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
				this.m_normal.x = -normalX;
				this.m_normal.y = -normalY;
				i = 0;
				while (i < manifold.m_pointCount)
				{
					tMat = xfA.R;
					tVec = manifold.m_points[i].m_localPoint;
					clipPointX = xfA.position.x + tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
					clipPointY = xfA.position.y + tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
					this.m_points[i].x = clipPointX + 0.5 * (radiusB - (clipPointX - planePointX) * normalX - (clipPointY - planePointY) * normalY - radiusA) * normalX;
					this.m_points[i].y = clipPointY + 0.5 * (radiusB - (clipPointX - planePointX) * normalX - (clipPointY - planePointY) * normalY - radiusA) * normalY;
					i++;
				}
		}
	}
}
