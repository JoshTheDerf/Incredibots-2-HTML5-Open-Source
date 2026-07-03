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

import { b2ContactConstraint, b2Manifold, b2Mat22, b2Settings, b2Vec2 } from "../..";

export class b2PositionSolverManifold
{
	private static circlePointA:b2Vec2 = new b2Vec2();

	private static circlePointB:b2Vec2 = new b2Vec2();

	public m_normal:b2Vec2;

	public m_points:b2Vec2[];

	public m_separations:number[];

	constructor()
	{
		this.m_normal = new b2Vec2();
		this.m_separations = new Array<number>(b2Settings.b2_maxManifoldPoints).fill(0);
		this.m_points = new Array<b2Vec2>(b2Settings.b2_maxManifoldPoints);
		var i:number = 0;
		while(i < b2Settings.b2_maxManifoldPoints)
		{
			this.m_points[i] = new b2Vec2();
			i++;
		}
	}

	public Initialize(cc:b2ContactConstraint) : void
	{
		var i:number = 0;
		var clipPointX:number = NaN;
		var clipPointY:number = NaN;
		var tMat:b2Mat22;
		var tVec:b2Vec2;
		var planePointX:number = NaN;
		var planePointY:number = NaN;
		var pointAX:number = NaN;
		var pointAY:number = NaN;
		var pointBX:number = NaN;
		var pointBY:number = NaN;
		var dX:number = NaN;
		var dY:number = NaN;
		var distSqr:number = NaN;
		var dist:number = NaN;
		b2Settings.b2Assert(cc.pointCount > 0);
		switch(cc.type)
		{
			case b2Manifold.e_circles:
				tMat = cc.bodyA.m_xf.R;
				tVec = cc.localPoint;
				pointAX = cc.bodyA.m_xf.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
				pointAY = cc.bodyA.m_xf.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
				tMat = cc.bodyB.m_xf.R;
				tVec = cc.points[0].localPoint;
				pointBX = cc.bodyB.m_xf.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
				pointBY = cc.bodyB.m_xf.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
				dX = pointBX - pointAX;
				dY = pointBY - pointAY;
				distSqr = dX * dX + dY * dY;
				if(distSqr > Number.MIN_VALUE * Number.MIN_VALUE)
				{
					dist = Math.sqrt(distSqr);
					this.m_normal.x = dX / dist;
					this.m_normal.y = dY / dist;
				}
				else
				{
					this.m_normal.x = 1;
					this.m_normal.y = 0;
				}
				this.m_points[0].x = 0.5 * (pointAX + pointBX);
				this.m_points[0].y = 0.5 * (pointAY + pointBY);
				this.m_separations[0] = dX * this.m_normal.x + dY * this.m_normal.y - cc.radius;
				break;
			case b2Manifold.e_faceA:
				tMat = cc.bodyA.m_xf.R;
				tVec = cc.localPlaneNormal;
				this.m_normal.x = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
				this.m_normal.y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
				tMat = cc.bodyA.m_xf.R;
				tVec = cc.localPoint;
				planePointX = cc.bodyA.m_xf.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
				planePointY = cc.bodyA.m_xf.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
				tMat = cc.bodyB.m_xf.R;
				i = 0;
				while(i < cc.pointCount)
				{
					tVec = cc.points[i].localPoint;
					clipPointX = cc.bodyB.m_xf.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
					clipPointY = cc.bodyB.m_xf.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
					this.m_separations[i] = (clipPointX - planePointX) * this.m_normal.x + (clipPointY - planePointY) * this.m_normal.y - cc.radius;
					this.m_points[i].x = clipPointX;
					this.m_points[i].y = clipPointY;
					i++;
				}
				break;
			case b2Manifold.e_faceB:
				tMat = cc.bodyB.m_xf.R;
				tVec = cc.localPlaneNormal;
				this.m_normal.x = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
				this.m_normal.y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
				tMat = cc.bodyB.m_xf.R;
				tVec = cc.localPoint;
				planePointX = cc.bodyB.m_xf.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
				planePointY = cc.bodyB.m_xf.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
				tMat = cc.bodyA.m_xf.R;
				i = 0;
				while(i < cc.pointCount)
				{
					tVec = cc.points[i].localPoint;
					clipPointX = cc.bodyA.m_xf.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
					clipPointY = cc.bodyA.m_xf.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
					this.m_separations[i] = (clipPointX - planePointX) * this.m_normal.x + (clipPointY - planePointY) * this.m_normal.y - cc.radius;
					this.m_points[i].Set(clipPointX,clipPointY);
					i++;
				}
				this.m_normal.x *= -1;
				this.m_normal.y *= -1;
		}
	}
}
