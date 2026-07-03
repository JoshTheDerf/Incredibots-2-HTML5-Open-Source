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

import { b2Color, b2DebugDraw, b2Vec2 } from "../../..";

export class b2Wave
{
	constructor(position:b2Vec2, amplitude:number = 1, width:number = 1, speed:number = 1, decay:number = 0.01, waveFunc:string = "cos", fromGenerator:boolean = false)
	{
		this.position = position.Copy();
		this.amplitude = amplitude;
		this.speed = speed;
		this.decay = decay;
		this.width = width;
		this.waveFunc = waveFunc == "cos" ? Math.cos : Math.sin;
		this.fromGenerator = fromGenerator;
	}

	public valueAt(x:number) : number
	{
		if(x > this.right || x < this.left)
		{
			return 0;
		}
		return this.amplitude * this.waveFunc(Math.PI / this.halfWidth * x) + (this.waveFunc == Math.cos ? this.amplitude : 0);
	}

	public normalXAt(x:number) : number
	{
		var func:Function | null = null;
		if(this.waveFunc == Math.cos)
		{
			func = Math.sin;
		}
		else if(this.waveFunc == Math.sin)
		{
			func = Math.cos;
		}
		var val:number = this.amplitude * func!(Math.PI / this.halfWidth * x);
		if(!isFinite(val))
		{
			return val > 0 ? 0.1 : -0.2;
		}
		return val * (val > 0 ? 0.1 : 0.2);
	}

	public Step() : void
	{
		if(this.amplitude > 0)
		{
			this.amplitude -= this.decay;
		}
		if(this.amplitude < 0)
		{
			this.amplitude = 0;
		}
		this.position.x += this.speed;
	}

	public get left() : number
	{
		return -this.halfWidth;
	}

	public get right() : number
	{
		return this.halfWidth;
	}

	public get halfWidth() : number
	{
		return this.width / 2;
	}

	public Draw(debugDraw:b2DebugDraw, yOffset:number = 0) : void
	{
		var p1:b2Vec2;
		var p2:b2Vec2;
		p1 = new b2Vec2();
		p2 = new b2Vec2();
		var color:b2Color = new b2Color(0,0,1);
		p1.x = this.position.x + this.left;
		p1.y = (this.waveFunc == Math.cos ? -2 * this.amplitude : this.amplitude) + yOffset;
		p2.x = this.position.x + this.left;
		p2.y = (this.waveFunc == Math.cos ? 0 : -this.amplitude) + yOffset;
		debugDraw.DrawSegment(p1,p2,color);
		p1.x = this.position.x + this.right;
		p1.y = (this.waveFunc == Math.cos ? -2 * this.amplitude : this.amplitude) + yOffset;
		p2.x = this.position.x + this.right;
		p2.y = (this.waveFunc == Math.cos ? 0 : -this.amplitude) + yOffset;
		debugDraw.DrawSegment(p1,p2,color);
	}

	public waveFunc!:Function;

	public position!:b2Vec2;

	public amplitude!:number;

	public speed!:number;

	public decay!:number;

	public width!:number;

	public fromGenerator!:boolean;
}
