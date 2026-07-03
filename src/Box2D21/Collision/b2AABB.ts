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

import { b2RayCastInput, b2RayCastOutput, b2Vec2 } from "..";



export class b2AABB
{

	public lowerBound:b2Vec2 = new b2Vec2();

	public upperBound:b2Vec2 = new b2Vec2();

	public static Combine(aabb1:b2AABB, aabb2:b2AABB):b2AABB
	{
		var aabb:b2AABB = new b2AABB();
		aabb.Combine(aabb1, aabb2);
		return aabb;
	}

	public IsValid():boolean
	{
		var dX:number = this.upperBound.x - this.lowerBound.x;
		var dY:number = this.upperBound.y - this.lowerBound.y;
		var valid:boolean = dX >= 0 && dY >= 0;
		return valid && this.lowerBound.IsValid() && this.upperBound.IsValid();
	}

	public GetCenter():b2Vec2
	{
		return new b2Vec2((this.lowerBound.x + this.upperBound.x) / 2, (this.lowerBound.y + this.upperBound.y) / 2);
	}

	public GetExtents():b2Vec2
	{
		return new b2Vec2((this.upperBound.x - this.lowerBound.x) / 2, (this.upperBound.y - this.lowerBound.y) / 2);
	}

	public Contains(aabb:b2AABB):boolean
	{
		var result:boolean = true;
		result = result && this.lowerBound.x <= aabb.lowerBound.x;
		result = result && this.lowerBound.y <= aabb.lowerBound.y;
		result = result && aabb.upperBound.x <= this.upperBound.x;
		return result && aabb.upperBound.y <= this.upperBound.y;
	}

	public RayCast(output:b2RayCastOutput, input:b2RayCastInput):boolean
	{
		var normal:b2Vec2;
		var inv_d:number;
		var t1:number;
		var t2:number;
		var t3:number;
		var s:number;
		var tmin:number = -Number.MAX_VALUE;
		var tmax:number = Number.MAX_VALUE;
		var pX:number = input.p1.x;
		var pY:number = input.p1.y;
		var dX:number = input.p2.x - input.p1.x;
		var dY:number = input.p2.y - input.p1.y;
		var absDX:number = Math.abs(dX);
		var absDY:number = Math.abs(dY);
		normal = output.normal;
		if (absDX < Number.MIN_VALUE)
		{
			if (pX < this.lowerBound.x || this.upperBound.x < pX)
			{
				return false;
			}
		}
		else
		{
			inv_d = 1 / dX;
			t1 = (this.lowerBound.x - pX) * inv_d;
			t2 = (this.upperBound.x - pX) * inv_d;
			s = -1;
			if (t1 > t2)
			{
				t3 = t1;
				t1 = t2;
				t2 = t3;
				s = 1;
			}
			if (t1 > tmin)
			{
				normal.x = s;
				normal.y = 0;
				tmin = t1;
			}
			tmax = Math.min(tmax, t2);
			if (tmin > tmax)
			{
				return false;
			}
		}
		if (absDY < Number.MIN_VALUE)
		{
			if (pY < this.lowerBound.y || this.upperBound.y < pY)
			{
				return false;
			}
		}
		else
		{
			inv_d = 1 / dY;
			t1 = (this.lowerBound.y - pY) * inv_d;
			t2 = (this.upperBound.y - pY) * inv_d;
			s = -1;
			if (t1 > t2)
			{
				t3 = t1;
				t1 = t2;
				t2 = t3;
				s = 1;
			}
			if (t1 > tmin)
			{
				normal.y = s;
				normal.x = 0;
				tmin = t1;
			}
			tmax = Math.min(tmax, t2);
			if (tmin > tmax)
			{
				return false;
			}
		}
		output.fraction = tmin;
		return true;
	}

	public TestOverlap(other:b2AABB):boolean
	{
		var d1X:number = other.lowerBound.x - this.upperBound.x;
		var d1Y:number = other.lowerBound.y - this.upperBound.y;
		var d2X:number = this.lowerBound.x - other.upperBound.x;
		var d2Y:number = this.lowerBound.y - other.upperBound.y;
		if (d1X > 0 || d1Y > 0)
		{
			return false;
		}
		if (d2X > 0 || d2Y > 0)
		{
			return false;
		}
		return true;
	}

	public Combine(aabb1:b2AABB, aabb2:b2AABB):void
	{
		this.lowerBound.x = Math.min(aabb1.lowerBound.x, aabb2.lowerBound.x);
		this.lowerBound.y = Math.min(aabb1.lowerBound.y, aabb2.lowerBound.y);
		this.upperBound.x = Math.max(aabb1.upperBound.x, aabb2.upperBound.x);
		this.upperBound.y = Math.max(aabb1.upperBound.y, aabb2.upperBound.y);
	}
}
