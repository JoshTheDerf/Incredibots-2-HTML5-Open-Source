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

import { b2CircleShape, b2PolygonShape, b2Settings, b2Shape, b2Vec2 } from "..";



export class b2DistanceProxy
{

	public m_vertices!:b2Vec2[];

	public m_count:number = 0;

	public m_radius:number = 0;

	public Set(shape:b2Shape):void
	{
		var circle:b2CircleShape;
		var polygon:b2PolygonShape;
		switch (shape.GetType())
		{
			case b2Shape.e_circleShape:
				circle = shape as b2CircleShape;
				this.m_vertices = new Array<b2Vec2>(1);
				this.m_vertices[0] = circle.m_p;
				this.m_count = 1;
				this.m_radius = circle.m_radius;
				break;
			case b2Shape.e_polygonShape:
				polygon = shape as b2PolygonShape;
				this.m_vertices = polygon.m_vertices;
				this.m_count = polygon.m_vertexCount;
				this.m_radius = polygon.m_radius;
				break;
			default:
				b2Settings.b2Assert(false);
		}
	}

	public GetSupport(d:b2Vec2):number
	{
		var value:number;
		var bestIndex:number = 0;
		var bestValue:number = this.m_vertices[0].x * d.x + this.m_vertices[0].y * d.y;
		var i:number = 1;
		while (i < this.m_count)
		{
			value = this.m_vertices[i].x * d.x + this.m_vertices[i].y * d.y;
			if (value > bestValue)
			{
				bestIndex = i;
				bestValue = value;
			}
			i++;
		}
		return bestIndex;
	}

	public GetSupportVertex(d:b2Vec2):b2Vec2
	{
		var value:number;
		var bestIndex:number = 0;
		var bestValue:number = this.m_vertices[0].x * d.x + this.m_vertices[0].y * d.y;
		var i:number = 1;
		while (i < this.m_count)
		{
			value = this.m_vertices[i].x * d.x + this.m_vertices[i].y * d.y;
			if (value > bestValue)
			{
				bestIndex = i;
				bestValue = value;
			}
			i++;
		}
		return this.m_vertices[bestIndex];
	}

	public GetVertexCount():number
	{
		return this.m_count;
	}

	public GetVertex(index:number):b2Vec2
	{
		b2Settings.b2Assert(0 <= index && index < this.m_count);
		return this.m_vertices[index];
	}
}
