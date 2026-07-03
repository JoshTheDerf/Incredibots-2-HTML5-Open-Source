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

import { b2Body, b2Color, b2Controller, b2ControllerEdge, b2DebugDraw, b2Fixture, b2TimeStep, b2Vec2, b2Wave } from "../..";

export class b2WaveController extends b2Controller
{
	constructor()
	{
		super();
	}

	public Step(step:b2TimeStep) : void
	{
		var body:b2Body;
		var waveData:number[];
		var areac:b2Vec2;
		var massc:b2Vec2;
		var area:number;
		var mass:number;
		var waveNormal:b2Vec2;
		var waveOffset:number;
		var fixture:b2Fixture | null;
		var buoyancyForce:b2Vec2;
		var dragForce:b2Vec2;
		var sc:b2Vec2;
		var sarea:number;
		var shapeDensity:number;
		if(!this.m_bodyList)
		{
			return;
		}
		if(this.useWorldGravity)
		{
			this.gravity = this.GetWorld().GetGravity().Copy();
		}
		this.wavesUpdated = false;
		if(this.waveGenBase)
		{
			this.waveGenCounter += this.waveGenBase.speed;
			if(this.waveGenCounter > this.waveGenBase.width || this.waveGenCounter < -this.waveGenBase.width)
			{
				this.MakeWaveFromWave(this.waveGenBase);
				this.waveGenCounter = 0;
			}
		}
		var edge:b2ControllerEdge | null = this.m_bodyList;
		while(edge)
		{
			body = edge.body;
			waveData = this.StepAndCheckForWave(body);
			if(body.IsAwake() != false)
			{
				areac = new b2Vec2();
				massc = new b2Vec2();
				area = 0;
				mass = 0;
				waveNormal = new b2Vec2(waveData[1],this.normal.y);
				waveNormal.Normalize();
				waveOffset = waveData[0] - -waveNormal.x / waveNormal.y * waveData[1] + this.offset;
				if(edge.prevBody)
				{
				}
				fixture = body.GetFixtureList();
				while(fixture)
				{
					sc = new b2Vec2();
					sarea = fixture.GetShape().ComputeSubmergedArea(waveNormal,waveOffset,body.GetTransform(),sc);
					area += sarea;
					areac.x += sarea * sc.x;
					areac.y += sarea * sc.y;
					if(this.useDensity)
					{
						shapeDensity = 1;
					}
					else
					{
						shapeDensity = 1;
					}
					mass += sarea * shapeDensity;
					massc.x += sarea * sc.x * shapeDensity;
					massc.y += sarea * sc.y * shapeDensity;
					fixture = fixture.GetNext();
				}
				areac.x /= area;
				areac.y /= area;
				massc.x /= mass;
				massc.y /= mass;
				if(area >= Number.MIN_VALUE)
				{
					buoyancyForce = this.gravity!.GetNegative();
					buoyancyForce.Multiply(this.density * area);
					body.ApplyForce(buoyancyForce,massc);
					dragForce = body.GetLinearVelocityFromWorldPoint(areac);
					dragForce.Subtract(this.velocity);
					dragForce.Multiply(-this.linearDrag * area);
					body.ApplyForce(dragForce,areac);
					body.ApplyTorque(-body.GetInertia() / body.GetMass() * area * body.GetAngularVelocity() * this.angularDrag);
				}
			}
			edge = edge.nextBody;
		}
	}

	private StepAndCheckForWave(body:b2Body) : number[]
	{
		var dist:number;
		var val:number = 0;
		var normalX:number = 0;
		var i:number = (this.waves.length - 1) | 0;
		while(i >= 0)
		{
			if(!this.wavesUpdated)
			{
				if(this.waves[i].amplitude > this.maxAmplitude)
				{
					this.waves[i].amplitude = this.maxAmplitude;
				}
				this.waves[i].Step();
				if(this.waves[i].amplitude <= 0 || this.waves[i].position.x < this.leftLimit || this.waves[i].position.x > this.rightLimit)
				{
					this.waves.splice(i,1);
				}
			}
			if(this.waves.length > 0)
			{
				dist = body.GetPosition().x - this.waves[i].position.x;
				if(dist > this.waves[i].left && dist < this.waves[i].right)
				{
					body.SetAwake(true);
					val += this.waves[i].valueAt(dist);
					normalX += this.waves[i].normalXAt(dist);
				}
			}
			i--;
		}
		this.wavesUpdated = true;
		if(val > this.maxAmplitude)
		{
			val = this.maxAmplitude;
		}
		else if(val < -this.maxAmplitude)
		{
			val = -this.maxAmplitude;
		}
		if(normalX > 1)
		{
			normalX = 1;
		}
		else if(normalX < -1)
		{
			normalX = -1;
		}
		return [val,normalX];
	}

	public MakeWave(x:number, y:number, amplitude:number = 1, width:number = 1, speed:number = 1, decay:number = 0.01, waveFunc:string = "cos", fromGenerator:boolean = false) : void
	{
		this.waves.push(new b2Wave(new b2Vec2(x,y),amplitude > this.maxAmplitude ? this.maxAmplitude : amplitude,width > this.maxWidth ? this.maxWidth : width,speed > this.maxSpeed ? this.maxSpeed : (speed < -this.maxSpeed ? -this.maxSpeed : speed),decay,waveFunc,fromGenerator));
	}

	public ContinuousWaves(x:number, y:number, amplitude:number = 1, width:number = 1, speed:number = 1, decay:number = 0.01, waveFunc:string = "cos") : void
	{
		this.waveGenBase = new b2Wave(new b2Vec2(x,y),amplitude > this.maxAmplitude ? this.maxAmplitude : amplitude,width > this.maxWidth ? this.maxWidth : width,speed > this.maxSpeed ? this.maxSpeed : (speed < -this.maxSpeed ? -this.maxSpeed : speed),decay,waveFunc,true);
		this.waveGenCounter = this.waveGenBase.width;
	}

	private MakeWaveFromWave(wave:b2Wave) : void
	{
		this.waves.push(new b2Wave(wave.position.Copy(),wave.amplitude,wave.width,wave.speed,wave.decay,wave.waveFunc == Math.cos ? "cos" : "sin",wave.fromGenerator));
	}

	public Draw(debugDraw:b2DebugDraw) : void
	{
		var r:number = 1000;
		var p1:b2Vec2 = new b2Vec2();
		var p2:b2Vec2 = new b2Vec2();
		p1.x = this.normal.x * this.offset + this.normal.y * r;
		p1.y = this.normal.y * this.offset - this.normal.x * r;
		p2.x = this.normal.x * this.offset - this.normal.y * r;
		p2.y = this.normal.y * this.offset + this.normal.x * r;
		var color:b2Color = new b2Color(0,0,1);
		debugDraw.DrawSegment(p1,p2,color);
		var i:number = 0;
		while(i < this.waves.length)
		{
			this.waves[i].Draw(debugDraw,-this.offset);
			i++;
		}
	}

	public normal:b2Vec2 = new b2Vec2(0,-1);

	public offset:number = 0;

	public density:number = 0;

	public velocity:b2Vec2 = new b2Vec2(0,0);

	public linearDrag:number = 2;

	public angularDrag:number = 1;

	public useDensity:boolean = false;

	public useWorldGravity:boolean = true;

	public gravity:b2Vec2 | null = null;

	public leftLimit:number = -Number.MAX_VALUE;

	public rightLimit:number = 1.7976931348623157e+308;

	public maxAmplitude:number = 500;

	public maxWidth:number = 500;

	public maxSpeed:number = 500;

	public waves:b2Wave[] = [];

	private wavesUpdated:boolean = false;

	private waveGenBase:b2Wave | null = null;

	private waveGenCounter:number = 0;
}
