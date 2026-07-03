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

import { b2Body, b2Color, b2Controller, b2ControllerEdge, b2DebugDraw, b2Fixture, b2TimeStep, b2Vec2 } from "../..";

// flash.display.GraphicsPath is unavailable in this self-contained port. This is
// a minimal stand-in preserving the moveTo/lineTo drawing-command API (command
// codes 1 = MOVE_TO, 2 = LINE_TO) used by GenerateGPath.
class GraphicsPath
{
	public commands:number[] = [];
	public data:number[] = [];
	public moveTo(x:number, y:number) : void
	{
		this.commands.push(1);
		this.data.push(x,y);
	}
	public lineTo(x:number, y:number) : void
	{
		this.commands.push(2);
		this.data.push(x,y);
	}
}

export class b2BuoyancyController extends b2Controller
{
	public normal:b2Vec2 = new b2Vec2(0,-1);

	public offset:number = 0;

	public density:number = 0;

	public velocity:b2Vec2 = new b2Vec2(0,0);

	public linearDrag:number = 2;

	public angularDrag:number = 1;

	public useDensity:boolean = false;

	public useWorldGravity:boolean = true;

	public gravity:b2Vec2 | null = null;

	constructor()
	{
		super();
	}

	public Step(step:b2TimeStep) : void
	{
		var body:b2Body;
		var areac:b2Vec2;
		var massc:b2Vec2;
		var area:number;
		var mass:number;
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
		var edge:b2ControllerEdge | null = this.m_bodyList;
		while(edge)
		{
			body = edge.body;
			if(body.IsAwake() == false)
			{
			}
			areac = new b2Vec2();
			massc = new b2Vec2();
			area = 0;
			mass = 0;
			fixture = body.GetFixtureList();
			while(fixture)
			{
				if(!(fixture.GetUserData() && !fixture.GetUserData().isBuoyant))
				{
					sc = new b2Vec2();
					sarea = fixture.GetShape().ComputeSubmergedArea(this.normal,this.offset,body.GetTransform(),sc);
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
				}
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
			edge = edge.nextBody;
		}
	}

	public Draw(debugDraw:b2DebugDraw) : void
	{
		var p1:b2Vec2;
		var p2:b2Vec2;
		var r:number = 1000;
		p1 = new b2Vec2();
		p2 = new b2Vec2();
		p1.x = this.normal.x * this.offset + 1 / this.normal.y * r;
		p1.y = 1 / this.normal.y * this.offset - this.normal.x * r;
		p2.x = this.normal.x * this.offset - 1 / this.normal.y * r;
		p2.y = 1 / this.normal.y * this.offset + this.normal.x * r;
		var color:b2Color = new b2Color(0,0,1);
		debugDraw.DrawSegment(p1,p2,color);
	}

	public GenerateGPath(x:number, y:number, width:number, height:number, scale:number) : GraphicsPath | null
	{
		var path:GraphicsPath = new GraphicsPath();
		var slope:number = this.normal.x == 0 ? 0 : -this.normal.x / this.normal.y;
		var intercept:number = -this.offset * scale + y;
		var x0:number = -x;
		var y0:number = slope * x0 + intercept;
		var x1:number = width - x;
		var y1:number = slope * x1 + intercept;
		if(y0 > height && y1 > height)
		{
			return null;
		}
		if(y0 < 0 && y1 < 0)
		{
			y0 = y1 = 0;
		}
		path.moveTo(0,y0);
		path.lineTo(width,y1);
		path.lineTo(width,height);
		path.lineTo(0,height);
		path.lineTo(0,y0);
		return path;
	}
}
