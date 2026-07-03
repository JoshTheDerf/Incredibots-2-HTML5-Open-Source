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

export class b2CircleShape extends b2Shape
{
	public m_p:b2Vec2 = new b2Vec2();

	constructor(radius:number = 0)
	{
		super();
		this.m_type = b2Shape.e_circleShape;
		this.m_radius = radius;
	}

	public Copy() : b2Shape
	{
		var s:b2Shape = new b2CircleShape();
		s.Set(this);
		return s;
	}

	public Set(other:b2Shape) : void
	{
		super.Set(other);
		if(other instanceof b2CircleShape)
		{
			var c:b2CircleShape = other as b2CircleShape;
			this.m_p.SetV(c.m_p);
		}
	}

	public TestPoint(xf:b2Transform, p:b2Vec2) : boolean
	{
		var tMat:b2Mat22 = xf.R;
		var dX:number = xf.position.x + (tMat.col1.x * this.m_p.x + tMat.col2.x * this.m_p.y);
		var dY:number = xf.position.y + (tMat.col1.y * this.m_p.x + tMat.col2.y * this.m_p.y);
		dX = p.x - dX;
		dY = p.y - dY;
		return dX * dX + dY * dY <= this.m_radius * this.m_radius;
	}

	public RayCast(output:b2RayCastOutput, input:b2RayCastInput, transform:b2Transform) : boolean
	{
		var tMat:b2Mat22 = transform.R;
		var positionX:number = transform.position.x + (tMat.col1.x * this.m_p.x + tMat.col2.x * this.m_p.y);
		var positionY:number = transform.position.y + (tMat.col1.y * this.m_p.x + tMat.col2.y * this.m_p.y);
		var sX:number = input.p1.x - positionX;
		var sY:number = input.p1.y - positionY;
		var b:number = sX * sX + sY * sY - this.m_radius * this.m_radius;
		var rX:number = input.p2.x - input.p1.x;
		var rY:number = input.p2.y - input.p1.y;
		var c:number = sX * rX + sY * rY;
		var rr:number = rX * rX + rY * rY;
		var sigma:number = c * c - rr * b;
		if(sigma < 0 || rr < Number.MIN_VALUE)
		{
			return false;
		}
		var a:number = -(c + Math.sqrt(sigma));
		if(0 <= a && a <= input.maxFraction * rr)
		{
			a /= rr;
			output.fraction = a;
			output.normal.x = sX + a * rX;
			output.normal.y = sY + a * rY;
			output.normal.Normalize();
			return true;
		}
		return false;
	}

	public ComputeAABB(aabb:b2AABB, transform:b2Transform) : void
	{
		var tMat:b2Mat22 = transform.R;
		var pX:number = transform.position.x + (tMat.col1.x * this.m_p.x + tMat.col2.x * this.m_p.y);
		var pY:number = transform.position.y + (tMat.col1.y * this.m_p.x + tMat.col2.y * this.m_p.y);
		aabb.lowerBound.Set(pX - this.m_radius,pY - this.m_radius);
		aabb.upperBound.Set(pX + this.m_radius,pY + this.m_radius);
	}

	public ComputeMass(massData:b2MassData, density:number) : void
	{
		massData.mass = density * b2Settings.b2_pi * this.m_radius * this.m_radius;
		massData.center.SetV(this.m_p);
		massData.I = massData.mass * (0.5 * this.m_radius * this.m_radius + (this.m_p.x * this.m_p.x + this.m_p.y * this.m_p.y));
	}

	public ComputeSubmergedArea(normal:b2Vec2, offset:number, xf:b2Transform, c:b2Vec2) : number
	{
		var p:b2Vec2 = b2Math.MulX(xf,this.m_p);
		var l:number = -(b2Math.Dot(normal,p) - offset);
		if(l < -this.m_radius + Number.MIN_VALUE)
		{
			return 0;
		}
		if(l > this.m_radius)
		{
			c.SetV(p);
			return Math.PI * this.m_radius * this.m_radius;
		}
		var r2:number = this.m_radius * this.m_radius;
		var l2:number = l * l;
		var area:number = r2 * (Math.asin(l / this.m_radius) + Math.PI / 2) + l * Math.sqrt(r2 - l2);
		var com:number = -2 / 3 * Math.pow(r2 - l2,1.5) / area;
		c.x = p.x + normal.x * com;
		c.y = p.y + normal.y * com;
		return area;
	}

	public GetLocalPosition() : b2Vec2
	{
		return this.m_p;
	}

	public SetLocalPosition(p:b2Vec2) : void
	{
		this.m_p.SetV(p);
	}

	public GetRadius() : number
	{
		return this.m_radius;
	}

	public SetRadius(radius:number) : void
	{
		this.m_radius = radius;
	}
}
