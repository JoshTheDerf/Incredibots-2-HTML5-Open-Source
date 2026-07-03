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

import { b2AABB, b2Mat22, b2MassData, b2Math, b2RayCastInput, b2RayCastOutput, b2Settings, b2Shape, b2Transform, b2Vec2 } from "../..";

export class b2EdgeShape extends b2Shape
{
	private s_supportVec:b2Vec2 = new b2Vec2();

	public m_v1:b2Vec2 = new b2Vec2();

	public m_v2:b2Vec2 = new b2Vec2();

	public m_coreV1:b2Vec2 = new b2Vec2();

	public m_coreV2:b2Vec2 = new b2Vec2();

	public m_length:number = 0;

	public m_normal:b2Vec2 = new b2Vec2();

	public m_direction:b2Vec2 = new b2Vec2();

	public m_cornerDir1:b2Vec2 = new b2Vec2();

	public m_cornerDir2:b2Vec2 = new b2Vec2();

	public m_cornerConvex1:boolean = false;

	public m_cornerConvex2:boolean = false;

	public m_nextEdge:b2EdgeShape | null = null;

	public m_prevEdge:b2EdgeShape | null = null;

	constructor(v1:b2Vec2, v2:b2Vec2)
	{
		super();
		this.m_type = b2Shape.e_edgeShape;
		this.m_prevEdge = null;
		this.m_nextEdge = null;
		this.m_v1 = v1;
		this.m_v2 = v2;
		this.m_direction.Set(this.m_v2.x - this.m_v1.x,this.m_v2.y - this.m_v1.y);
		this.m_length = this.m_direction.Normalize();
		this.m_normal.Set(this.m_direction.y,-this.m_direction.x);
		this.m_coreV1.Set(-b2Settings.b2_toiSlop * (this.m_normal.x - this.m_direction.x) + this.m_v1.x,-b2Settings.b2_toiSlop * (this.m_normal.y - this.m_direction.y) + this.m_v1.y);
		this.m_coreV2.Set(-b2Settings.b2_toiSlop * (this.m_normal.x + this.m_direction.x) + this.m_v2.x,-b2Settings.b2_toiSlop * (this.m_normal.y + this.m_direction.y) + this.m_v2.y);
		this.m_cornerDir1 = this.m_normal;
		this.m_cornerDir2.Set(-this.m_normal.x,-this.m_normal.y);
	}

	public TestPoint(xf:b2Transform, p:b2Vec2) : boolean
	{
		return false;
	}

	public RayCast(output:b2RayCastOutput, input:b2RayCastInput, transform:b2Transform) : boolean
	{
		var tMat:b2Mat22 = null!;
		var rX:number = NaN;
		var rY:number = NaN;
		var t:number = NaN;
		var k_cross:number = NaN;
		var denom:number = NaN;
		var dX:number = input.p2.x - input.p1.x;
		var dY:number = input.p2.y - input.p1.y;
		tMat = transform.R;
		var v1X:number = transform.position.x + (tMat.col1.x * this.m_v1.x + tMat.col2.x * this.m_v1.y);
		var v1Y:number = transform.position.y + (tMat.col1.y * this.m_v1.x + tMat.col2.y * this.m_v1.y);
		var nX:number = transform.position.y + (tMat.col1.y * this.m_v2.x + tMat.col2.y * this.m_v2.y) - v1Y;
		var nY:number = -(transform.position.x + (tMat.col1.x * this.m_v2.x + tMat.col2.x * this.m_v2.y) - v1X);
		var k_slop:number = 100 * Number.MIN_VALUE;
		denom = -(dX * nX + dY * nY);
		if(denom > k_slop)
		{
			rX = input.p1.x - v1X;
			rY = input.p1.y - v1Y;
			t = rX * nX + rY * nY;
			if(0 <= t && t <= input.maxFraction * denom)
			{
				k_cross = -dX * rY + dY * rX;
				if(-k_slop * denom <= k_cross && k_cross <= denom * (1 + k_slop))
				{
					t /= denom;
					output.fraction = t;
					var length:number = Math.sqrt(nX * nX + nY * nY);
					output.normal.x = nX / length;
					output.normal.y = nY / length;
					return true;
				}
			}
		}
		return false;
	}

	public ComputeAABB(aabb:b2AABB, transform:b2Transform) : void
	{
		var tMat:b2Mat22 = transform.R;
		var v1X:number = transform.position.x + (tMat.col1.x * this.m_v1.x + tMat.col2.x * this.m_v1.y);
		var v1Y:number = transform.position.y + (tMat.col1.y * this.m_v1.x + tMat.col2.y * this.m_v1.y);
		var v2X:number = transform.position.x + (tMat.col1.x * this.m_v2.x + tMat.col2.x * this.m_v2.y);
		var v2Y:number = transform.position.y + (tMat.col1.y * this.m_v2.x + tMat.col2.y * this.m_v2.y);
		if(v1X < v2X)
		{
			aabb.lowerBound.x = v1X;
			aabb.upperBound.x = v2X;
		}
		else
		{
			aabb.lowerBound.x = v2X;
			aabb.upperBound.x = v1X;
		}
		if(v1Y < v2Y)
		{
			aabb.lowerBound.y = v1Y;
			aabb.upperBound.y = v2Y;
		}
		else
		{
			aabb.lowerBound.y = v2Y;
			aabb.upperBound.y = v1Y;
		}
	}

	public ComputeMass(massData:b2MassData, density:number) : void
	{
		massData.mass = 0;
		massData.center.SetV(this.m_v1);
		massData.I = 0;
	}

	public ComputeSubmergedArea(normal:b2Vec2, offset:number, xf:b2Transform, c:b2Vec2) : number
	{
		var v0:b2Vec2 = new b2Vec2(normal.x * offset,normal.y * offset);
		var v1:b2Vec2 = b2Math.MulX(xf,this.m_v1);
		var v2:b2Vec2 = b2Math.MulX(xf,this.m_v2);
		var d1:number = b2Math.Dot(normal,v1) - offset;
		var d2:number = b2Math.Dot(normal,v2) - offset;
		if(d1 > 0)
		{
			if(d2 > 0)
			{
				return 0;
			}
			v1.x = -d2 / (d1 - d2) * v1.x + d1 / (d1 - d2) * v2.x;
			v1.y = -d2 / (d1 - d2) * v1.y + d1 / (d1 - d2) * v2.y;
		}
		else if(d2 > 0)
		{
			v2.x = -d2 / (d1 - d2) * v1.x + d1 / (d1 - d2) * v2.x;
			v2.y = -d2 / (d1 - d2) * v1.y + d1 / (d1 - d2) * v2.y;
		}
		c.x = (v0.x + v1.x + v2.x) / 3;
		c.y = (v0.y + v1.y + v2.y) / 3;
		return 0.5 * ((v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x));
	}

	public GetLength() : number
	{
		return this.m_length;
	}

	public GetVertex1() : b2Vec2
	{
		return this.m_v1;
	}

	public GetVertex2() : b2Vec2
	{
		return this.m_v2;
	}

	public GetCoreVertex1() : b2Vec2
	{
		return this.m_coreV1;
	}

	public GetCoreVertex2() : b2Vec2
	{
		return this.m_coreV2;
	}

	public GetNormalVector() : b2Vec2
	{
		return this.m_normal;
	}

	public GetDirectionVector() : b2Vec2
	{
		return this.m_direction;
	}

	public GetCorner1Vector() : b2Vec2
	{
		return this.m_cornerDir1;
	}

	public GetCorner2Vector() : b2Vec2
	{
		return this.m_cornerDir2;
	}

	public Corner1IsConvex() : boolean
	{
		return this.m_cornerConvex1;
	}

	public Corner2IsConvex() : boolean
	{
		return this.m_cornerConvex2;
	}

	public GetFirstVertex(xf:b2Transform) : b2Vec2
	{
		var tMat:b2Mat22 = xf.R;
		return new b2Vec2(xf.position.x + (tMat.col1.x * this.m_coreV1.x + tMat.col2.x * this.m_coreV1.y),xf.position.y + (tMat.col1.y * this.m_coreV1.x + tMat.col2.y * this.m_coreV1.y));
	}

	public GetNextEdge() : b2EdgeShape | null
	{
		return this.m_nextEdge;
	}

	public GetPrevEdge() : b2EdgeShape | null
	{
		return this.m_prevEdge;
	}

	public Support(xf:b2Transform, dX:number, dY:number) : b2Vec2
	{
		var tMat:b2Mat22 = xf.R;
		var v1X:number = xf.position.x + (tMat.col1.x * this.m_coreV1.x + tMat.col2.x * this.m_coreV1.y);
		var v1Y:number = xf.position.y + (tMat.col1.y * this.m_coreV1.x + tMat.col2.y * this.m_coreV1.y);
		var v2X:number = xf.position.x + (tMat.col1.x * this.m_coreV2.x + tMat.col2.x * this.m_coreV2.y);
		var v2Y:number = xf.position.y + (tMat.col1.y * this.m_coreV2.x + tMat.col2.y * this.m_coreV2.y);
		if(v1X * dX + v1Y * dY > v2X * dX + v2Y * dY)
		{
			this.s_supportVec.x = v1X;
			this.s_supportVec.y = v1Y;
		}
		else
		{
			this.s_supportVec.x = v2X;
			this.s_supportVec.y = v2Y;
		}
		return this.s_supportVec;
	}

	public SetPrevEdge(edge:b2EdgeShape, core:b2Vec2, cornerDir:b2Vec2, convex:boolean) : void
	{
		this.m_prevEdge = edge;
		this.m_coreV1 = core;
		this.m_cornerDir1 = cornerDir;
		this.m_cornerConvex1 = convex;
	}

	public SetNextEdge(edge:b2EdgeShape, core:b2Vec2, cornerDir:b2Vec2, convex:boolean) : void
	{
		this.m_nextEdge = edge;
		this.m_coreV2 = core;
		this.m_cornerDir2 = cornerDir;
		this.m_cornerConvex2 = convex;
	}
}
