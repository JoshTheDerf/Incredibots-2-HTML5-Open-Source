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

export class b2Sweep
{
	public localCenter:b2Vec2 = new b2Vec2();

	public c0:b2Vec2 = new b2Vec2();

	public c:b2Vec2 = new b2Vec2();

	public a0:number = 0;

	public a:number = 0;

	public t0:number = 0;

	public Set(other:b2Sweep) : void
	{
		this.localCenter.SetV(other.localCenter);
		this.c0.SetV(other.c0);
		this.c.SetV(other.c);
		this.a0 = other.a0;
		this.a = other.a;
		this.t0 = other.t0;
	}

	public Copy() : b2Sweep
	{
		var copy:b2Sweep = new b2Sweep();
		copy.localCenter.SetV(this.localCenter);
		copy.c0.SetV(this.c0);
		copy.c.SetV(this.c);
		copy.a0 = this.a0;
		copy.a = this.a;
		copy.t0 = this.t0;
		return copy;
	}

	public GetTransform(xf:b2Transform, alpha:number) : void
	{
		xf.position.x = (1 - alpha) * this.c0.x + alpha * this.c.x;
		xf.position.y = (1 - alpha) * this.c0.y + alpha * this.c.y;
		var angle:number = (1 - alpha) * this.a0 + alpha * this.a;
		xf.R.Set(angle);
		var tMat:b2Mat22 = xf.R;
		xf.position.x -= tMat.col1.x * this.localCenter.x + tMat.col2.x * this.localCenter.y;
		xf.position.y -= tMat.col1.y * this.localCenter.x + tMat.col2.y * this.localCenter.y;
	}

	public Advance(t:number) : void
	{
		var alpha:number = NaN;
		if(this.t0 < t && 1 - this.t0 > Number.MIN_VALUE)
		{
			alpha = (t - this.t0) / (1 - this.t0);
			this.c0.x = (1 - alpha) * this.c0.x + alpha * this.c.x;
			this.c0.y = (1 - alpha) * this.c0.y + alpha * this.c.y;
			this.a0 = (1 - alpha) * this.a0 + alpha * this.a;
			this.t0 = t;
		}
	}
}
