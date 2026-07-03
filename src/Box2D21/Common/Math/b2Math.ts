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

import { b2Mat22, b2Transform, b2Vec2 } from "../..";

export class b2Math
{
	public static b2Vec2_zero:b2Vec2 = new b2Vec2(0,0);

	public static b2Mat22_identity:b2Mat22 = b2Mat22.FromVV(new b2Vec2(1,0),new b2Vec2(0,1));

	public static b2Transform_identity:b2Transform = new b2Transform(b2Math.b2Vec2_zero,b2Math.b2Mat22_identity);

	public static IsValid(x:number) : boolean
	{
		return isFinite(x);
	}

	public static Dot(a:b2Vec2, b:b2Vec2) : number
	{
		return a.x * b.x + a.y * b.y;
	}

	public static CrossVV(a:b2Vec2, b:b2Vec2) : number
	{
		return a.x * b.y - a.y * b.x;
	}

	public static CrossVF(a:b2Vec2, s:number) : b2Vec2
	{
		return new b2Vec2(s * a.y,-s * a.x);
	}

	public static CrossFV(s:number, a:b2Vec2) : b2Vec2
	{
		return new b2Vec2(-s * a.y,s * a.x);
	}

	public static MulMV(A:b2Mat22, v:b2Vec2) : b2Vec2
	{
		return new b2Vec2(A.col1.x * v.x + A.col2.x * v.y,A.col1.y * v.x + A.col2.y * v.y);
	}

	public static MulTMV(A:b2Mat22, v:b2Vec2) : b2Vec2
	{
		return new b2Vec2(b2Math.Dot(v,A.col1),b2Math.Dot(v,A.col2));
	}

	public static MulX(T:b2Transform, v:b2Vec2) : b2Vec2
	{
		var a:b2Vec2 = b2Math.MulMV(T.R,v);
		a.x += T.position.x;
		a.y += T.position.y;
		return a;
	}

	public static MulXT(T:b2Transform, v:b2Vec2) : b2Vec2
	{
		var a:b2Vec2 = b2Math.SubtractVV(v,T.position);
		var tX:number = a.x * T.R.col1.x + a.y * T.R.col1.y;
		a.y = a.x * T.R.col2.x + a.y * T.R.col2.y;
		a.x = tX;
		return a;
	}

	public static AddVV(a:b2Vec2, b:b2Vec2) : b2Vec2
	{
		return new b2Vec2(a.x + b.x,a.y + b.y);
	}

	public static SubtractVV(a:b2Vec2, b:b2Vec2) : b2Vec2
	{
		return new b2Vec2(a.x - b.x,a.y - b.y);
	}

	public static Distance(a:b2Vec2, b:b2Vec2) : number
	{
		var cX:number = a.x - b.x;
		var cY:number = a.y - b.y;
		return Math.sqrt(cX * cX + cY * cY);
	}

	public static DistanceSquared(a:b2Vec2, b:b2Vec2) : number
	{
		var cX:number = a.x - b.x;
		var cY:number = a.y - b.y;
		return cX * cX + cY * cY;
	}

	public static MulFV(s:number, a:b2Vec2) : b2Vec2
	{
		return new b2Vec2(s * a.x,s * a.y);
	}

	public static AddMM(A:b2Mat22, B:b2Mat22) : b2Mat22
	{
		return b2Mat22.FromVV(b2Math.AddVV(A.col1,B.col1),b2Math.AddVV(A.col2,B.col2));
	}

	public static MulMM(A:b2Mat22, B:b2Mat22) : b2Mat22
	{
		return b2Mat22.FromVV(b2Math.MulMV(A,B.col1),b2Math.MulMV(A,B.col2));
	}

	public static MulTMM(A:b2Mat22, B:b2Mat22) : b2Mat22
	{
		var c1:b2Vec2 = new b2Vec2(b2Math.Dot(A.col1,B.col1),b2Math.Dot(A.col2,B.col1));
		var c2:b2Vec2 = new b2Vec2(b2Math.Dot(A.col1,B.col2),b2Math.Dot(A.col2,B.col2));
		return b2Mat22.FromVV(c1,c2);
	}

	public static Abs(a:number) : number
	{
		return a > 0 ? a : -a;
	}

	public static AbsV(a:b2Vec2) : b2Vec2
	{
		return new b2Vec2(b2Math.Abs(a.x),b2Math.Abs(a.y));
	}

	public static AbsM(A:b2Mat22) : b2Mat22
	{
		return b2Mat22.FromVV(b2Math.AbsV(A.col1),b2Math.AbsV(A.col2));
	}

	public static Min(a:number, b:number) : number
	{
		return a < b ? a : b;
	}

	public static MinV(a:b2Vec2, b:b2Vec2) : b2Vec2
	{
		return new b2Vec2(b2Math.Min(a.x,b.x),b2Math.Min(a.y,b.y));
	}

	public static Max(a:number, b:number) : number
	{
		return a > b ? a : b;
	}

	public static MaxV(a:b2Vec2, b:b2Vec2) : b2Vec2
	{
		return new b2Vec2(b2Math.Max(a.x,b.x),b2Math.Max(a.y,b.y));
	}

	public static Clamp(a:number, low:number, high:number) : number
	{
		return a < low ? low : (a > high ? high : a);
	}

	public static ClampV(a:b2Vec2, low:b2Vec2, high:b2Vec2) : b2Vec2
	{
		return b2Math.MaxV(low,b2Math.MinV(a,high));
	}

	public static Swap(a:any[], b:any[]) : void
	{
		var tmp:any = a[0];
		a[0] = b[0];
		b[0] = tmp;
	}

	public static Random() : number
	{
		return Math.random() * 2 - 1;
	}

	public static RandomRange(lo:number, hi:number) : number
	{
		var r:number = Math.random();
		return (hi - lo) * r + lo;
	}

	public static NextPowerOfTwo(x:number) : number
	{
		x |= x >> 1 & 0x7FFFFFFF;
		x |= x >> 2 & 0x3FFFFFFF;
		x |= x >> 4 & 0x0FFFFFFF;
		x |= x >> 8 & 0xFFFFFF;
		x |= x >> 16 & 0xFFFF;
		return x + 1;
	}

	public static IsPowerOfTwo(x:number) : boolean
	{
		return x > 0 && (x & x - 1) == 0;
	}
}
