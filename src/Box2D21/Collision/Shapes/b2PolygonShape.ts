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

import { b2AABB, b2Mat22, b2MassData, b2Math, b2OBB, b2RayCastInput, b2RayCastOutput, b2Settings, b2Shape, b2Transform, b2Vec2 } from "../..";

export class b2PolygonShape extends b2Shape
{
	private static s_mat:b2Mat22 = new b2Mat22();

	public m_centroid:b2Vec2;

	public m_vertices:b2Vec2[];

	public m_normals:b2Vec2[];

	public m_vertexCount:number = 0;

	constructor()
	{
		super();
		this.m_type = b2Shape.e_polygonShape;
		this.m_centroid = new b2Vec2();
		this.m_vertices = [];
		this.m_normals = [];
	}

	public static AsArray(vertices:b2Vec2[], vertexCount:number) : b2PolygonShape
	{
		var poly:b2PolygonShape = new b2PolygonShape();
		poly.SetAsArray(vertices,vertexCount);
		return poly;
	}

	public static AsVector(vertices:b2Vec2[], vertexCount:number) : b2PolygonShape
	{
		var poly:b2PolygonShape = new b2PolygonShape();
		poly.SetAsVector(vertices,vertexCount);
		return poly;
	}

	public static AsBox(hx:number, hy:number) : b2PolygonShape
	{
		var poly:b2PolygonShape = new b2PolygonShape();
		poly.SetAsBox(hx,hy);
		return poly;
	}

	public static AsOrientedBox(hx:number, hy:number, center:b2Vec2 | null = null, angle:number = 0) : b2PolygonShape
	{
		var poly:b2PolygonShape = new b2PolygonShape();
		poly.SetAsOrientedBox(hx,hy,center,angle);
		return poly;
	}

	public static AsEdge(v1:b2Vec2, v2:b2Vec2) : b2PolygonShape
	{
		var poly:b2PolygonShape = new b2PolygonShape();
		poly.SetAsEdge(v1,v2);
		return poly;
	}

	public static ComputeCentroid(vs:b2Vec2[], count:number) : b2Vec2
	{
		var p1:b2Vec2 = null!;
		var triangleArea:number = NaN;
		var p2:b2Vec2 = null!;
		var p3:b2Vec2 = null!;
		var e1X:number = NaN;
		var e1Y:number = NaN;
		var e2X:number = NaN;
		var e2Y:number = NaN;
		var D:number = NaN;
		var c:b2Vec2 = new b2Vec2();
		var area:number = 0;
		var pRefX:number = 0;
		var pRefY:number = 0;
		var inv3:number = 1 / 3;
		var i:number = 0;
		while(i < count)
		{
			p2 = vs[i];
			p3 = i + 1 < count ? vs[i + 1] : vs[0];
			e1X = p2.x - pRefX;
			e1Y = p2.y - pRefY;
			e2X = p3.x - pRefX;
			e2Y = p3.y - pRefY;
			D = e1X * e2Y - e1Y * e2X;
			triangleArea = 0.5 * D;
			area += triangleArea;
			c.x += triangleArea * inv3 * (pRefX + p2.x + p3.x);
			c.y += triangleArea * inv3 * (pRefY + p2.y + p3.y);
			i++;
		}
		c.x *= 1 / area;
		c.y *= 1 / area;
		return c;
	}

	public static ComputeOBB(obb:b2OBB, vs:b2Vec2[], count:number) : void
	{
		var i:number = 0;
		var root:b2Vec2 = null!;
		var uxX:number = NaN;
		var uxY:number = NaN;
		var length:number = NaN;
		var uyX:number = NaN;
		var uyY:number = NaN;
		var lowerX:number = NaN;
		var lowerY:number = NaN;
		var upperX:number = NaN;
		var upperY:number = NaN;
		var j:number = 0;
		var area:number = NaN;
		var dX:number = NaN;
		var dY:number = NaN;
		var rX:number = NaN;
		var rY:number = NaN;
		var centerX:number = NaN;
		var centerY:number = NaN;
		var tMat:b2Mat22 = null!;
		var p:b2Vec2[] = new Array<b2Vec2>(count + 1);
		i = 0;
		while(i < count)
		{
			p[i] = vs[i];
			i++;
		}
		p[count] = p[0];
		var minArea:number = Number.MAX_VALUE;
		i = 1;
		while(i <= count)
		{
			root = p[i - 1];
			uxX = p[i].x - root.x;
			uxY = p[i].y - root.y;
			length = Math.sqrt(uxX * uxX + uxY * uxY);
			uxX /= length;
			uxY /= length;
			uyX = -uxY;
			uyY = uxX;
			lowerX = Number.MAX_VALUE;
			lowerY = Number.MAX_VALUE;
			upperX = -Number.MAX_VALUE;
			upperY = -Number.MAX_VALUE;
			j = 0;
			while(j < count)
			{
				dX = p[j].x - root.x;
				dY = p[j].y - root.y;
				rX = uxX * dX + uxY * dY;
				rY = uyX * dX + uyY * dY;
				if(rX < lowerX)
				{
					lowerX = rX;
				}
				if(rY < lowerY)
				{
					lowerY = rY;
				}
				if(rX > upperX)
				{
					upperX = rX;
				}
				if(rY > upperY)
				{
					upperY = rY;
				}
				j++;
			}
			area = (upperX - lowerX) * (upperY - lowerY);
			if(area < 0.95 * minArea)
			{
				minArea = area;
				obb.R.col1.x = uxX;
				obb.R.col1.y = uxY;
				obb.R.col2.x = uyX;
				obb.R.col2.y = uyY;
				centerX = 0.5 * (lowerX + upperX);
				centerY = 0.5 * (lowerY + upperY);
				tMat = obb.R;
				obb.center.x = root.x + (tMat.col1.x * centerX + tMat.col2.x * centerY);
				obb.center.y = root.y + (tMat.col1.y * centerX + tMat.col2.y * centerY);
				obb.extents.x = 0.5 * (upperX - lowerX);
				obb.extents.y = 0.5 * (upperY - lowerY);
			}
			i++;
		}
	}

	public Copy() : b2Shape
	{
		var poly:b2PolygonShape = new b2PolygonShape();
		poly.Set(this);
		return poly;
	}

	public Set(other:b2Shape) : void
	{
		var other2:b2PolygonShape = null!;
		var i:number = 0;
		super.Set(other);
		if(other instanceof b2PolygonShape)
		{
			other2 = other as b2PolygonShape;
			this.m_centroid.SetV(other2.m_centroid);
			this.m_vertexCount = other2.m_vertexCount;
			this.Reserve(this.m_vertexCount);
			i = 0;
			while(i < this.m_vertexCount)
			{
				this.m_vertices[i].SetV(other2.m_vertices[i]);
				this.m_normals[i].SetV(other2.m_normals[i]);
				i++;
			}
		}
	}

	public SetAsArray(vertices:b2Vec2[], vertexCount:number = 0) : void
	{
		var vec:b2Vec2[] = [];
		for(const v of vertices)
		{
			vec.push(v);
		}
		this.SetAsVector(vec,vertexCount);
	}

	public SetAsVector(vertices:b2Vec2[], vertexCount:number = 0) : void
	{
		var i:number = 0;
		var i1:number = 0;
		var i2:number = 0;
		var edge:b2Vec2 = null!;
		if(vertexCount == 0)
		{
			vertexCount = vertices.length;
		}
		b2Settings.b2Assert(2 <= vertexCount);
		this.m_vertexCount = vertexCount;
		this.Reserve(vertexCount);
		i = 0;
		while(i < this.m_vertexCount)
		{
			this.m_vertices[i].SetV(vertices[i]);
			i++;
		}
		i = 0;
		while(i < this.m_vertexCount)
		{
			i1 = i;
			i2 = i + 1 < this.m_vertexCount ? i + 1 : 0;
			edge = b2Math.SubtractVV(this.m_vertices[i2],this.m_vertices[i1]);
			b2Settings.b2Assert(edge.LengthSquared() > Number.MIN_VALUE);
			this.m_normals[i].SetV(b2Math.CrossVF(edge,1));
			this.m_normals[i].Normalize();
			i++;
		}
		this.m_centroid = b2PolygonShape.ComputeCentroid(this.m_vertices,this.m_vertexCount);
	}

	public SetAsBox(hx:number, hy:number) : void
	{
		this.m_vertexCount = 4;
		this.Reserve(4);
		this.m_vertices[0].Set(-hx,-hy);
		this.m_vertices[1].Set(hx,-hy);
		this.m_vertices[2].Set(hx,hy);
		this.m_vertices[3].Set(-hx,hy);
		this.m_normals[0].Set(0,-1);
		this.m_normals[1].Set(1,0);
		this.m_normals[2].Set(0,1);
		this.m_normals[3].Set(-1,0);
		this.m_centroid.SetZero();
	}

	public SetAsOrientedBox(hx:number, hy:number, center:b2Vec2 | null = null, angle:number = 0) : void
	{
		this.m_vertexCount = 4;
		this.Reserve(4);
		this.m_vertices[0].Set(-hx,-hy);
		this.m_vertices[1].Set(hx,-hy);
		this.m_vertices[2].Set(hx,hy);
		this.m_vertices[3].Set(-hx,hy);
		this.m_normals[0].Set(0,-1);
		this.m_normals[1].Set(1,0);
		this.m_normals[2].Set(0,1);
		this.m_normals[3].Set(-1,0);
		this.m_centroid = center as b2Vec2;
		var xf:b2Transform = new b2Transform();
		xf.position = center as b2Vec2;
		xf.R.Set(angle);
		var i:number = 0;
		while(i < this.m_vertexCount)
		{
			this.m_vertices[i] = b2Math.MulX(xf,this.m_vertices[i]);
			this.m_normals[i] = b2Math.MulMV(xf.R,this.m_normals[i]);
			i++;
		}
	}

	public SetAsEdge(v1:b2Vec2, v2:b2Vec2) : void
	{
		this.m_vertexCount = 2;
		this.Reserve(2);
		this.m_vertices[0].SetV(v1);
		this.m_vertices[1].SetV(v2);
		this.m_centroid.x = 0.5 * (v1.x + v2.x);
		this.m_centroid.y = 0.5 * (v1.y + v2.y);
		this.m_normals[0] = b2Math.CrossVF(b2Math.SubtractVV(v2,v1),1);
		this.m_normals[0].Normalize();
		this.m_normals[1].x = -this.m_normals[0].x;
		this.m_normals[1].y = -this.m_normals[0].y;
	}

	public TestPoint(xf:b2Transform, p:b2Vec2) : boolean
	{
		var tVec:b2Vec2 = null!;
		var dot:number = NaN;
		var tMat:b2Mat22 = xf.R;
		var tX:number = p.x - xf.position.x;
		var tY:number = p.y - xf.position.y;
		var pLocalX:number = tX * tMat.col1.x + tY * tMat.col1.y;
		var pLocalY:number = tX * tMat.col2.x + tY * tMat.col2.y;
		var i:number = 0;
		while(i < this.m_vertexCount)
		{
			tVec = this.m_vertices[i];
			tX = pLocalX - tVec.x;
			tY = pLocalY - tVec.y;
			tVec = this.m_normals[i];
			dot = tVec.x * tX + tVec.y * tY;
			if(dot > 0)
			{
				return false;
			}
			i++;
		}
		return true;
	}

	public RayCast(output:b2RayCastOutput, input:b2RayCastInput, transform:b2Transform) : boolean
	{
		var tX:number = NaN;
		var tY:number = NaN;
		var tMat:b2Mat22 = null!;
		var tVec:b2Vec2 = null!;
		var numerator:number = NaN;
		var denominator:number = NaN;
		var lower:number = 0;
		var upper:number = input.maxFraction;
		tX = input.p1.x - transform.position.x;
		tY = input.p1.y - transform.position.y;
		tMat = transform.R;
		var p1X:number = tX * tMat.col1.x + tY * tMat.col1.y;
		var p1Y:number = tX * tMat.col2.x + tY * tMat.col2.y;
		tX = input.p2.x - transform.position.x;
		tY = input.p2.y - transform.position.y;
		tMat = transform.R;
		var p2X:number = tX * tMat.col1.x + tY * tMat.col1.y;
		var p2Y:number = tX * tMat.col2.x + tY * tMat.col2.y;
		var dX:number = p2X - p1X;
		var dY:number = p2Y - p1Y;
		var index:number = -1;
		var i:number = 0;
		while(i < this.m_vertexCount)
		{
			tVec = this.m_vertices[i];
			tX = tVec.x - p1X;
			tY = tVec.y - p1Y;
			tVec = this.m_normals[i];
			numerator = tVec.x * tX + tVec.y * tY;
			denominator = tVec.x * dX + tVec.y * dY;
			if(denominator == 0)
			{
				if(numerator < 0)
				{
					return false;
				}
			}
			else if(denominator < 0 && numerator < lower * denominator)
			{
				lower = numerator / denominator;
				index = i;
			}
			else if(denominator > 0 && numerator < upper * denominator)
			{
				upper = numerator / denominator;
			}
			if(upper < lower - Number.MIN_VALUE)
			{
				return false;
			}
			i++;
		}
		if(index >= 0)
		{
			output.fraction = lower;
			tMat = transform.R;
			tVec = this.m_normals[index];
			output.normal.x = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
			output.normal.y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
			return true;
		}
		return false;
	}

	public ComputeAABB(aabb:b2AABB, transform:b2Transform) : void
	{
		var vX:number = NaN;
		var vY:number = NaN;
		var tMat:b2Mat22 = transform.R;
		var tVec:b2Vec2 = this.m_vertices[0];
		var lowerX:number = transform.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		var lowerY:number = transform.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		var upperX:number = lowerX;
		var upperY:number = lowerY;
		var i:number = 1;
		while(i < this.m_vertexCount)
		{
			tVec = this.m_vertices[i];
			vX = transform.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
			vY = transform.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
			lowerX = lowerX < vX ? lowerX : vX;
			lowerY = lowerY < vY ? lowerY : vY;
			upperX = upperX > vX ? upperX : vX;
			upperY = upperY > vY ? upperY : vY;
			i++;
		}
		aabb.lowerBound.x = lowerX - this.m_radius;
		aabb.lowerBound.y = lowerY - this.m_radius;
		aabb.upperBound.x = upperX + this.m_radius;
		aabb.upperBound.y = upperY + this.m_radius;
	}

	public ComputeMass(massData:b2MassData, density:number) : void
	{
		var p2:b2Vec2 = null!;
		var p3:b2Vec2 = null!;
		var e1X:number = NaN;
		var e1Y:number = NaN;
		var e2X:number = NaN;
		var e2Y:number = NaN;
		var D:number = NaN;
		var triangleArea:number = NaN;
		var px:number = NaN;
		var py:number = NaN;
		var ex1:number = NaN;
		var ey1:number = NaN;
		var ex2:number = NaN;
		var ey2:number = NaN;
		var intx2:number = NaN;
		var inty2:number = NaN;
		if(this.m_vertexCount == 2)
		{
			massData.center.x = 0.5 * (this.m_vertices[0].x + this.m_vertices[1].x);
			massData.center.y = 0.5 * (this.m_vertices[0].y + this.m_vertices[1].y);
			massData.mass = 0;
			massData.I = 0;
			return;
		}
		var centerX:number = 0;
		var centerY:number = 0;
		var area:number = 0;
		var I:number = 0;
		var p1X:number = 0;
		var p1Y:number = 0;
		var k_inv3:number = 1 / 3;
		var i:number = 0;
		while(i < this.m_vertexCount)
		{
			p2 = this.m_vertices[i];
			p3 = i + 1 < this.m_vertexCount ? this.m_vertices[i + 1] : this.m_vertices[0];
			e1X = p2.x - p1X;
			e1Y = p2.y - p1Y;
			e2X = p3.x - p1X;
			e2Y = p3.y - p1Y;
			D = e1X * e2Y - e1Y * e2X;
			triangleArea = 0.5 * D;
			area += triangleArea;
			centerX += triangleArea * k_inv3 * (p1X + p2.x + p3.x);
			centerY += triangleArea * k_inv3 * (p1Y + p2.y + p3.y);
			px = p1X;
			py = p1Y;
			ex1 = e1X;
			ey1 = e1Y;
			ex2 = e2X;
			ey2 = e2Y;
			intx2 = k_inv3 * (0.25 * (ex1 * ex1 + ex2 * ex1 + ex2 * ex2) + (px * ex1 + px * ex2)) + 0.5 * px * px;
			inty2 = k_inv3 * (0.25 * (ey1 * ey1 + ey2 * ey1 + ey2 * ey2) + (py * ey1 + py * ey2)) + 0.5 * py * py;
			I += D * (intx2 + inty2);
			i++;
		}
		massData.mass = density * area;
		centerX *= 1 / area;
		centerY *= 1 / area;
		massData.center.Set(centerX,centerY);
		massData.I = density * I;
	}

	public ComputeSubmergedArea(normal:b2Vec2, offset:number, xf:b2Transform, c:b2Vec2) : number
	{
		var i:number = 0;
		var p3:b2Vec2 = null!;
		var isSubmerged:boolean = false;
		var md:b2MassData = null!;
		var triangleArea:number = NaN;
		var normalL:b2Vec2 = b2Math.MulTMV(xf.R,normal);
		var offsetL:number = offset - b2Math.Dot(normal,xf.position);
		var depths:number[] = [];
		var diveCount:number = 0;
		var intoIndex:number = -1;
		var outoIndex:number = -1;
		var lastSubmerged:boolean = false;
		i = 0;
		while(i < this.m_vertexCount)
		{
			depths[i] = b2Math.Dot(normalL,this.m_vertices[i]) - offsetL;
			isSubmerged = depths[i] < -Number.MIN_VALUE;
			if(i > 0)
			{
				if(isSubmerged)
				{
					if(!lastSubmerged)
					{
						intoIndex = i - 1;
						diveCount++;
					}
				}
				else if(lastSubmerged)
				{
					outoIndex = i - 1;
					diveCount++;
				}
			}
			lastSubmerged = isSubmerged;
			i++;
		}
		switch(diveCount)
		{
			case 0:
				if(lastSubmerged)
				{
					md = new b2MassData();
					this.ComputeMass(md,1);
					c.SetV(b2Math.MulX(xf,md.center));
					return md.mass;
				}
				return 0;
				break;
			case 1:
				if(intoIndex == -1)
				{
					intoIndex = this.m_vertexCount - 1;
					break;
				}
				outoIndex = this.m_vertexCount - 1;
		}
		var intoIndex2:number = (intoIndex + 1) % this.m_vertexCount;
		var outoIndex2:number = (outoIndex + 1) % this.m_vertexCount;
		var intoLambda:number = (0 - depths[intoIndex]) / (depths[intoIndex2] - depths[intoIndex]);
		var outoLambda:number = (0 - depths[outoIndex]) / (depths[outoIndex2] - depths[outoIndex]);
		var intoVec:b2Vec2 = new b2Vec2(this.m_vertices[intoIndex].x * (1 - intoLambda) + this.m_vertices[intoIndex2].x * intoLambda,this.m_vertices[intoIndex].y * (1 - intoLambda) + this.m_vertices[intoIndex2].y * intoLambda);
		var outoVec:b2Vec2 = new b2Vec2(this.m_vertices[outoIndex].x * (1 - outoLambda) + this.m_vertices[outoIndex2].x * outoLambda,this.m_vertices[outoIndex].y * (1 - outoLambda) + this.m_vertices[outoIndex2].y * outoLambda);
		var area:number = 0;
		var center:b2Vec2 = new b2Vec2();
		var p2:b2Vec2 = this.m_vertices[intoIndex2];
		i = intoIndex2;
		while(i != outoIndex2)
		{
			i = (i + 1) % this.m_vertexCount;
			if(i == outoIndex2)
			{
				p3 = outoVec;
			}
			else
			{
				p3 = this.m_vertices[i];
			}
			triangleArea = 0.5 * ((p2.x - intoVec.x) * (p3.y - intoVec.y) - (p2.y - intoVec.y) * (p3.x - intoVec.x));
			area += triangleArea;
			center.x += triangleArea * (intoVec.x + p2.x + p3.x) / 3;
			center.y += triangleArea * (intoVec.y + p2.y + p3.y) / 3;
			p2 = p3;
		}
		center.Multiply(1 / area);
		c.SetV(b2Math.MulX(xf,center));
		return area;
	}

	public GetVertexCount() : number
	{
		return this.m_vertexCount;
	}

	public GetVertices() : b2Vec2[]
	{
		return this.m_vertices;
	}

	public GetNormals() : b2Vec2[]
	{
		return this.m_normals;
	}

	public GetSupport(d:b2Vec2) : number
	{
		var value:number = NaN;
		var bestIndex:number = 0;
		var bestValue:number = this.m_vertices[0].x * d.x + this.m_vertices[0].y * d.y;
		var i:number = 1;
		while(i < this.m_vertexCount)
		{
			value = this.m_vertices[i].x * d.x + this.m_vertices[i].y * d.y;
			if(value > bestValue)
			{
				bestIndex = i;
				bestValue = value;
			}
			i++;
		}
		return bestIndex;
	}

	public GetSupportVertex(d:b2Vec2) : b2Vec2
	{
		var value:number = NaN;
		var bestIndex:number = 0;
		var bestValue:number = this.m_vertices[0].x * d.x + this.m_vertices[0].y * d.y;
		var i:number = 1;
		while(i < this.m_vertexCount)
		{
			value = this.m_vertices[i].x * d.x + this.m_vertices[i].y * d.y;
			if(value > bestValue)
			{
				bestIndex = i;
				bestValue = value;
			}
			i++;
		}
		return this.m_vertices[bestIndex];
	}

	private Validate() : boolean
	{
		return false;
	}

	private Reserve(count:number) : void
	{
		var i:number = this.m_vertices.length;
		while(i < count)
		{
			this.m_vertices[i] = new b2Vec2();
			this.m_normals[i] = new b2Vec2();
			i++;
		}
	}
}
