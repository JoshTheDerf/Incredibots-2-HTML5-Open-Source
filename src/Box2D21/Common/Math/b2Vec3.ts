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

export class b2Vec3
{
	public x:number;

	public y:number;

	public z:number;

	constructor(x:number = 0, y:number = 0, z:number = 0)
	{
		this.x = x;
		this.y = y;
		this.z = z;
	}

	public SetZero() : void
	{
		this.x = this.y = this.z = 0;
	}

	public Set(x:number, y:number, z:number) : void
	{
		this.x = x;
		this.y = y;
		this.z = z;
	}

	public SetV(v:b2Vec3) : void
	{
		this.x = v.x;
		this.y = v.y;
		this.z = v.z;
	}

	public GetNegative() : b2Vec3
	{
		return new b2Vec3(-this.x,-this.y,-this.z);
	}

	public NegativeSelf() : void
	{
		this.x = -this.x;
		this.y = -this.y;
		this.z = -this.z;
	}

	public Copy() : b2Vec3
	{
		return new b2Vec3(this.x,this.y,this.z);
	}

	public Add(v:b2Vec3) : void
	{
		this.x += v.x;
		this.y += v.y;
		this.z += v.z;
	}

	public Subtract(v:b2Vec3) : void
	{
		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;
	}

	public Multiply(a:number) : void
	{
		this.x *= a;
		this.y *= a;
		this.z *= a;
	}
}
