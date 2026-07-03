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

import { b2DistanceProxy, b2Math, b2Settings, b2SimplexCache, b2SimplexVertex, b2Transform, b2Vec2 } from "..";



export class b2Simplex
{

	public m_v1:b2SimplexVertex = new b2SimplexVertex();

	public m_v2:b2SimplexVertex = new b2SimplexVertex();

	public m_v3:b2SimplexVertex = new b2SimplexVertex();

	public m_vertices:b2SimplexVertex[] = new Array<b2SimplexVertex>(3);

	public m_count:number = 0;

	constructor()
	{
		this.m_vertices[0] = this.m_v1;
		this.m_vertices[1] = this.m_v2;
		this.m_vertices[2] = this.m_v3;
	}

	public ReadCache(cache:b2SimplexCache, proxyA:b2DistanceProxy, transformA:b2Transform, proxyB:b2DistanceProxy, transformB:b2Transform):void
	{
		var wALocal:b2Vec2;
		var wBLocal:b2Vec2;
		var v:b2SimplexVertex;
		var metric1:number;
		var metric2:number;
		b2Settings.b2Assert(0 <= cache.count && cache.count <= 3);
		this.m_count = cache.count;
		var vertices:b2SimplexVertex[] = this.m_vertices;
		var i:number = 0;
		while (i < this.m_count)
		{
			v = vertices[i];
			v.indexA = cache.indexA[i];
			v.indexB = cache.indexB[i];
			wALocal = proxyA.GetVertex(v.indexA);
			wBLocal = proxyB.GetVertex(v.indexB);
			v.wA = b2Math.MulX(transformA, wALocal);
			v.wB = b2Math.MulX(transformB, wBLocal);
			v.w = b2Math.SubtractVV(v.wB, v.wA);
			v.a = 0;
			i++;
		}
		if (this.m_count > 1)
		{
			metric1 = cache.metric;
			metric2 = this.GetMetric();
			if (metric2 < 0.5 * metric1 || 2 * metric1 < metric2 || metric2 < Number.MIN_VALUE)
			{
				this.m_count = 0;
			}
		}
		if (this.m_count == 0)
		{
			v = vertices[0];
			v.indexA = 0;
			v.indexB = 0;
			wALocal = proxyA.GetVertex(0);
			wBLocal = proxyB.GetVertex(0);
			v.wA = b2Math.MulX(transformA, wALocal);
			v.wB = b2Math.MulX(transformB, wBLocal);
			v.w = b2Math.SubtractVV(v.wB, v.wA);
			this.m_count = 1;
		}
	}

	public WriteCache(cache:b2SimplexCache):void
	{
		cache.metric = this.GetMetric();
		cache.count = this.m_count;
		var vertices:b2SimplexVertex[] = this.m_vertices;
		var i:number = 0;
		while (i < this.m_count)
		{
			cache.indexA[i] = vertices[i].indexA;
			cache.indexB[i] = vertices[i].indexB;
			i++;
		}
	}

	public GetSearchDirection():b2Vec2
	{
		var e12:b2Vec2;
		var sgn:number;
		switch (this.m_count)
		{
			case 1:
				return this.m_v1.w.GetNegative();
			case 2:
				e12 = b2Math.SubtractVV(this.m_v2.w, this.m_v1.w);
				sgn = b2Math.CrossVV(e12, this.m_v1.w.GetNegative());
				if (sgn > 0)
				{
					return b2Math.CrossFV(1, e12);
				}
				return b2Math.CrossVF(e12, 1);
			default:
				b2Settings.b2Assert(false);
				return new b2Vec2();
		}
	}

	public GetClosestPoint():b2Vec2
	{
		switch (this.m_count)
		{
			case 0:
				b2Settings.b2Assert(false);
				return new b2Vec2();
			case 1:
				return this.m_v1.w;
			case 2:
				return new b2Vec2(this.m_v1.a * this.m_v1.w.x + this.m_v2.a * this.m_v2.w.x, this.m_v1.a * this.m_v1.w.y + this.m_v2.a * this.m_v2.w.y);
			default:
				b2Settings.b2Assert(false);
				return new b2Vec2();
		}
	}

	public GetWitnessPoints(pA:b2Vec2, pB:b2Vec2):void
	{
		switch (this.m_count)
		{
			case 0:
				b2Settings.b2Assert(false);
				break;
			case 1:
				pA.SetV(this.m_v1.wA);
				pB.SetV(this.m_v1.wB);
				break;
			case 2:
				pA.x = this.m_v1.a * this.m_v1.wA.x + this.m_v2.a * this.m_v2.wA.x;
				pA.y = this.m_v1.a * this.m_v1.wA.y + this.m_v2.a * this.m_v2.wA.y;
				pB.x = this.m_v1.a * this.m_v1.wB.x + this.m_v2.a * this.m_v2.wB.x;
				pB.y = this.m_v1.a * this.m_v1.wB.y + this.m_v2.a * this.m_v2.wB.y;
				break;
			case 3:
				pB.x = pA.x = this.m_v1.a * this.m_v1.wA.x + this.m_v2.a * this.m_v2.wA.x + this.m_v3.a * this.m_v3.wA.x;
				pB.y = pA.y = this.m_v1.a * this.m_v1.wA.y + this.m_v2.a * this.m_v2.wA.y + this.m_v3.a * this.m_v3.wA.y;
				break;
			default:
				b2Settings.b2Assert(false);
		}
	}

	public GetMetric():number
	{
		switch (this.m_count)
		{
			case 0:
				b2Settings.b2Assert(false);
				return 0;
			case 1:
				return 0;
			case 2:
				return b2Math.SubtractVV(this.m_v1.w, this.m_v2.w).Length();
			case 3:
				return b2Math.CrossVV(b2Math.SubtractVV(this.m_v2.w, this.m_v1.w), b2Math.SubtractVV(this.m_v3.w, this.m_v1.w));
			default:
				b2Settings.b2Assert(false);
				return 0;
		}
	}

	public Solve2():void
	{
		var w1:b2Vec2 = this.m_v1.w;
		var w2:b2Vec2 = this.m_v2.w;
		var e12:b2Vec2 = b2Math.SubtractVV(w2, w1);
		var d12_2:number = -(w1.x * e12.x + w1.y * e12.y);
		if (d12_2 <= 0)
		{
			this.m_v1.a = 1;
			this.m_count = 1;
			return;
		}
		var d12_1:number = w2.x * e12.x + w2.y * e12.y;
		if (d12_1 <= 0)
		{
			this.m_v2.a = 1;
			this.m_count = 1;
			this.m_v1.Set(this.m_v2);
			return;
		}
		var inv_d12:number = 1 / (d12_1 + d12_2);
		this.m_v1.a = d12_1 * inv_d12;
		this.m_v2.a = d12_2 * inv_d12;
		this.m_count = 2;
	}

	public Solve3():void
	{
		var inv_d12:number;
		var inv_d13:number;
		var inv_d23:number;
		var w1:b2Vec2 = this.m_v1.w;
		var w2:b2Vec2 = this.m_v2.w;
		var w3:b2Vec2 = this.m_v3.w;
		var e12:b2Vec2 = b2Math.SubtractVV(w2, w1);
		var w1e12:number = b2Math.Dot(w1, e12);
		var d12_1:number;
		var d12_2:number = d12_1 = b2Math.Dot(w2, e12);
		d12_1 = -w1e12;
		var e13:b2Vec2 = b2Math.SubtractVV(w3, w1);
		var w1e13:number = b2Math.Dot(w1, e13);
		var d13_1:number;
		var d13_2:number = d13_1 = b2Math.Dot(w3, e13);
		d13_1 = -w1e13;
		var e23:b2Vec2 = b2Math.SubtractVV(w3, w2);
		var w2e23:number = b2Math.Dot(w2, e23);
		var d23_1:number;
		var d23_2:number = d23_1 = b2Math.Dot(w3, e23);
		d23_1 = -w2e23;
		var n123:number = b2Math.CrossVV(e12, e13);
		var d123_1:number = n123 * b2Math.CrossVV(w2, w3);
		var d123_2:number = n123 * b2Math.CrossVV(w3, w1);
		var d123_3:number = n123 * b2Math.CrossVV(w1, w2);
		if (d12_1 <= 0 && d13_1 <= 0)
		{
			this.m_v1.a = 1;
			this.m_count = 1;
			return;
		}
		if (d12_2 > 0 && d12_1 > 0 && d123_3 <= 0)
		{
			inv_d12 = 1 / (d12_2 + d12_1);
			this.m_v1.a = d12_2 * inv_d12;
			this.m_v2.a = d12_1 * inv_d12;
			this.m_count = 2;
			return;
		}
		if (d13_2 > 0 && d13_1 > 0 && d123_2 <= 0)
		{
			inv_d13 = 1 / (d13_2 + d13_1);
			this.m_v1.a = d13_2 * inv_d13;
			this.m_v3.a = d13_1 * inv_d13;
			this.m_count = 2;
			this.m_v2.Set(this.m_v3);
			return;
		}
		if (d12_2 <= 0 && d23_1 <= 0)
		{
			this.m_v2.a = 1;
			this.m_count = 1;
			this.m_v1.Set(this.m_v2);
			return;
		}
		if (d13_2 <= 0 && d23_2 <= 0)
		{
			this.m_v3.a = 1;
			this.m_count = 1;
			this.m_v1.Set(this.m_v3);
			return;
		}
		if (d23_2 > 0 && d23_1 > 0 && d123_1 <= 0)
		{
			inv_d23 = 1 / (d23_2 + d23_1);
			this.m_v2.a = d23_2 * inv_d23;
			this.m_v3.a = d23_1 * inv_d23;
			this.m_count = 2;
			this.m_v1.Set(this.m_v3);
			return;
		}
		var inv_d123:number = 1 / (d123_1 + d123_2 + d123_3);
		this.m_v1.a = d123_1 * inv_d123;
		this.m_v2.a = d123_2 * inv_d123;
		this.m_v3.a = d123_3 * inv_d123;
		this.m_count = 3;
	}
}
