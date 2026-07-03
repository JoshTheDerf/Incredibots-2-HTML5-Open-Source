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

import { b2DistanceProxy, b2Mat22, b2Math, b2Settings, b2SimplexCache, b2Transform, b2Vec2 } from "..";



export class b2SeparationFunction
{

	public static e_points:number = 1;

	public static e_faceA:number = 2;

	public static e_faceB:number = 4;

	public m_proxyA!:b2DistanceProxy;

	public m_proxyB!:b2DistanceProxy;

	public m_type:number = 0;

	public m_localPoint:b2Vec2 = new b2Vec2();

	public m_axis:b2Vec2 = new b2Vec2();

	public Initialize(cache:b2SimplexCache, proxyA:b2DistanceProxy, transformA:b2Transform, proxyB:b2DistanceProxy, transformB:b2Transform):void
	{
		var localPointA:b2Vec2;
		var localPointA1:b2Vec2;
		var localPointA2:b2Vec2;
		var localPointB:b2Vec2;
		var localPointB1:b2Vec2;
		var localPointB2:b2Vec2;
		var pointAX:number;
		var pointAY:number;
		var pointBX:number;
		var pointBY:number;
		var normalX:number;
		var normalY:number;
		var tMat:b2Mat22;
		var tVec:b2Vec2;
		var s:number;
		var sgn:number;
		var dA:b2Vec2;
		var dB:b2Vec2;
		var a:number;
		var e:number;
		var r:b2Vec2;
		var c:number;
		var f:number;
		var b:number;
		var denom:number;
		var t2:number;
		this.m_proxyA = proxyA;
		this.m_proxyB = proxyB;
		var count:number = cache.count;
		b2Settings.b2Assert(0 < count && count < 3);
		if (count == 1)
		{
			this.m_type = b2SeparationFunction.e_points;
			localPointA = this.m_proxyA.GetVertex(cache.indexA[0]);
			localPointB = this.m_proxyB.GetVertex(cache.indexB[0]);
			tVec = localPointA;
			tMat = transformA.R;
			pointAX = transformA.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
			pointAY = transformA.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
			tVec = localPointB;
			tMat = transformB.R;
			pointBX = transformB.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
			pointBY = transformB.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
			this.m_axis.x = pointBX - pointAX;
			this.m_axis.y = pointBY - pointAY;
			this.m_axis.Normalize();
		}
		else if (cache.indexB[0] == cache.indexB[1])
		{
			this.m_type = b2SeparationFunction.e_faceA;
			localPointA1 = this.m_proxyA.GetVertex(cache.indexA[0]);
			localPointA2 = this.m_proxyA.GetVertex(cache.indexA[1]);
			localPointB = this.m_proxyB.GetVertex(cache.indexB[0]);
			this.m_localPoint.x = 0.5 * (localPointA1.x + localPointA2.x);
			this.m_localPoint.y = 0.5 * (localPointA1.y + localPointA2.y);
			this.m_axis = b2Math.CrossVF(b2Math.SubtractVV(localPointA2, localPointA1), 1);
			this.m_axis.Normalize();
			tVec = this.m_axis;
			tMat = transformA.R;
			normalX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
			normalY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
			tVec = this.m_localPoint;
			tMat = transformA.R;
			pointAX = transformA.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
			pointAY = transformA.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
			tVec = localPointB;
			tMat = transformB.R;
			pointBX = transformB.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
			pointBY = transformB.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
			s = (pointBX - pointAX) * normalX + (pointBY - pointAY) * normalY;
			if (s < 0)
			{
				this.m_axis.NegativeSelf();
			}
		}
		else if (cache.indexA[0] == cache.indexA[0])
		{
			this.m_type = b2SeparationFunction.e_faceB;
			localPointB1 = this.m_proxyB.GetVertex(cache.indexB[0]);
			localPointB2 = this.m_proxyB.GetVertex(cache.indexB[1]);
			localPointA = this.m_proxyA.GetVertex(cache.indexA[0]);
			this.m_localPoint.x = 0.5 * (localPointB1.x + localPointB2.x);
			this.m_localPoint.y = 0.5 * (localPointB1.y + localPointB2.y);
			this.m_axis = b2Math.CrossVF(b2Math.SubtractVV(localPointB2, localPointB1), 1);
			this.m_axis.Normalize();
			tVec = this.m_axis;
			tMat = transformB.R;
			normalX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
			normalY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
			tVec = this.m_localPoint;
			tMat = transformB.R;
			pointBX = transformB.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
			pointBY = transformB.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
			tVec = localPointA;
			tMat = transformA.R;
			pointAX = transformA.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
			pointAY = transformA.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
			s = (pointAX - pointBX) * normalX + (pointAY - pointBY) * normalY;
			if (s < 0)
			{
				this.m_axis.NegativeSelf();
			}
		}
		else
		{
			localPointA1 = this.m_proxyA.GetVertex(cache.indexA[0]);
			localPointA2 = this.m_proxyA.GetVertex(cache.indexA[1]);
			localPointB1 = this.m_proxyB.GetVertex(cache.indexB[0]);
			localPointB2 = this.m_proxyB.GetVertex(cache.indexB[1]);
			// pA = b2Math.MulX(transformA, localPointA) — dead in decompiled source (localPointA null here, result unused)
			dA = b2Math.MulMV(transformA.R, b2Math.SubtractVV(localPointA2, localPointA1));
			// pB = b2Math.MulX(transformB, localPointB) — dead in decompiled source (localPointB null here, result unused)
			dB = b2Math.MulMV(transformB.R, b2Math.SubtractVV(localPointB2, localPointB1));
			a = dA.x * dA.x + dA.y * dA.y;
			e = dB.x * dB.x + dB.y * dB.y;
			r = b2Math.SubtractVV(dB, dA);
			c = dA.x * r.x + dA.y * r.y;
			f = dB.x * r.x + dB.y * r.y;
			b = dA.x * dB.x + dA.y * dB.y;
			denom = a * e - b * b;
			s = 0;
			if (denom != 0)
			{
				s = b2Math.Clamp((b * f - c * e) / denom, 0, 1);
			}
			t2 = (b * s + f) / e;
			if (t2 < 0)
			{
				t2 = 0;
				s = b2Math.Clamp((b - c) / a, 0, 1);
			}
			localPointA = new b2Vec2();
			localPointA.x = localPointA1.x + s * (localPointA2.x - localPointA1.x);
			localPointA.y = localPointA1.y + s * (localPointA2.y - localPointA1.y);
			localPointB = new b2Vec2();
			localPointB.x = localPointB1.x + s * (localPointB2.x - localPointB1.x);
			localPointB.y = localPointB1.y + s * (localPointB2.y - localPointB1.y);
			if (s == 0 || s == 1)
			{
				this.m_type = b2SeparationFunction.e_faceB;
				this.m_axis = b2Math.CrossVF(b2Math.SubtractVV(localPointB2, localPointB1), 1);
				this.m_axis.Normalize();
				this.m_localPoint = localPointB;
				tVec = this.m_axis;
				tMat = transformB.R;
				normalX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
				normalY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
				tVec = this.m_localPoint;
				tMat = transformB.R;
				pointBX = transformB.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
				pointBY = transformB.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
				tVec = localPointA;
				tMat = transformA.R;
				pointAX = transformA.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
				pointAY = transformA.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
				sgn = (pointAX - pointBX) * normalX + (pointAY - pointBY) * normalY;
				if (s < 0)
				{
					this.m_axis.NegativeSelf();
				}
			}
			else
			{
				this.m_type = b2SeparationFunction.e_faceA;
				this.m_axis = b2Math.CrossVF(b2Math.SubtractVV(localPointA2, localPointA1), 1);
				this.m_localPoint = localPointA;
				tVec = this.m_axis;
				tMat = transformA.R;
				normalX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
				normalY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
				tVec = this.m_localPoint;
				tMat = transformA.R;
				pointAX = transformA.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
				pointAY = transformA.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
				tVec = localPointB;
				tMat = transformB.R;
				pointBX = transformB.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
				pointBY = transformB.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
				sgn = (pointBX - pointAX) * normalX + (pointBY - pointAY) * normalY;
				if (s < 0)
				{
					this.m_axis.NegativeSelf();
				}
			}
		}
	}

	public Evaluate(transformA:b2Transform, transformB:b2Transform):number
	{
		var axisA:b2Vec2;
		var axisB:b2Vec2;
		var localPointA:b2Vec2;
		var localPointB:b2Vec2;
		var pointA:b2Vec2;
		var pointB:b2Vec2;
		var normal:b2Vec2;
		switch (this.m_type)
		{
			case b2SeparationFunction.e_points:
				axisA = b2Math.MulTMV(transformA.R, this.m_axis);
				axisB = b2Math.MulTMV(transformB.R, this.m_axis.GetNegative());
				localPointA = this.m_proxyA.GetSupportVertex(axisA);
				localPointB = this.m_proxyB.GetSupportVertex(axisB);
				pointA = b2Math.MulX(transformA, localPointA);
				pointB = b2Math.MulX(transformB, localPointB);
				return (pointB.x - pointA.x) * this.m_axis.x + (pointB.y - pointA.y) * this.m_axis.y;
			case b2SeparationFunction.e_faceA:
				normal = b2Math.MulMV(transformA.R, this.m_axis);
				pointA = b2Math.MulX(transformA, this.m_localPoint);
				axisB = b2Math.MulTMV(transformB.R, normal.GetNegative());
				localPointB = this.m_proxyB.GetSupportVertex(axisB);
				pointB = b2Math.MulX(transformB, localPointB);
				return (pointB.x - pointA.x) * normal.x + (pointB.y - pointA.y) * normal.y;
			case b2SeparationFunction.e_faceB:
				normal = b2Math.MulMV(transformB.R, this.m_axis);
				pointB = b2Math.MulX(transformB, this.m_localPoint);
				axisA = b2Math.MulTMV(transformA.R, normal.GetNegative());
				localPointA = this.m_proxyA.GetSupportVertex(axisA);
				pointA = b2Math.MulX(transformA, localPointA);
				return (pointA.x - pointB.x) * normal.x + (pointA.y - pointB.y) * normal.y;
			default:
				b2Settings.b2Assert(false);
				return 0;
		}
	}
}
