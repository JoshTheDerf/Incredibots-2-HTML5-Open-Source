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

import { b2CircleContact, b2Contact, b2ContactRegister, b2EdgeAndCircleContact, b2Fixture, b2PolyAndCircleContact, b2PolyAndEdgeContact, b2PolygonContact, b2Shape } from "../..";

export class b2ContactFactory
{
	private m_registers!:b2ContactRegister[][];

	private m_allocator:any;

	constructor(allocator:any)
	{
		this.m_allocator = allocator;
		this.InitializeRegisters();
	}

	public AddType(createFcn:Function, destroyFcn:Function, type1:number, type2:number) : void
	{
		this.m_registers[type1][type2].createFcn = createFcn;
		this.m_registers[type1][type2].destroyFcn = destroyFcn;
		this.m_registers[type1][type2].primary = true;
		if(type1 != type2)
		{
			this.m_registers[type2][type1].createFcn = createFcn;
			this.m_registers[type2][type1].destroyFcn = destroyFcn;
			this.m_registers[type2][type1].primary = false;
		}
	}

	public InitializeRegisters() : void
	{
		var j:number = 0;
		this.m_registers = new Array<b2ContactRegister[]>(b2Shape.e_shapeTypeCount);
		var i:number = 0;
		while(i < b2Shape.e_shapeTypeCount)
		{
			this.m_registers[i] = new Array<b2ContactRegister>(b2Shape.e_shapeTypeCount);
			j = 0;
			while(j < b2Shape.e_shapeTypeCount)
			{
				this.m_registers[i][j] = new b2ContactRegister();
				j++;
			}
			i++;
		}
		this.AddType(b2CircleContact.Create,b2CircleContact.Destroy,b2Shape.e_circleShape,b2Shape.e_circleShape);
		this.AddType(b2PolyAndCircleContact.Create,b2PolyAndCircleContact.Destroy,b2Shape.e_polygonShape,b2Shape.e_circleShape);
		this.AddType(b2PolygonContact.Create,b2PolygonContact.Destroy,b2Shape.e_polygonShape,b2Shape.e_polygonShape);
		this.AddType(b2EdgeAndCircleContact.Create,b2EdgeAndCircleContact.Destroy,b2Shape.e_edgeShape,b2Shape.e_circleShape);
		this.AddType(b2PolyAndEdgeContact.Create,b2PolyAndEdgeContact.Destroy,b2Shape.e_polygonShape,b2Shape.e_edgeShape);
	}

	public Create(fixtureA:b2Fixture, fixtureB:b2Fixture) : b2Contact | null
	{
		var c:b2Contact;
		var type1:number = fixtureA.GetType();
		var type2:number = fixtureB.GetType();
		var reg:b2ContactRegister = this.m_registers[type1][type2];
		if(reg.pool)
		{
			c = reg.pool;
			reg.pool = c.m_next;
			--reg.poolCount;
			if(c.m_swaped)
			{
				c.Reset(fixtureB,fixtureA);
			}
			else
			{
				c.Reset(fixtureA,fixtureB);
			}
			return c;
		}
		var createFcn:Function | null = reg.createFcn;
		if(createFcn != null)
		{
			if(reg.primary)
			{
				c = createFcn(this.m_allocator);
				c.Reset(fixtureA,fixtureB);
				c.m_swaped = false;
				return c;
			}
			c = createFcn(this.m_allocator);
			c.Reset(fixtureB,fixtureA);
			c.m_swaped = true;
			return c;
		}
		return null;
	}

	public Destroy(contact:b2Contact) : void
	{
		if(contact.m_manifold.m_pointCount > 0)
		{
			contact.m_fixtureA!.m_body.SetAwake(true);
			contact.m_fixtureB!.m_body.SetAwake(true);
		}
		var type1:number = contact.m_fixtureA!.GetType();
		var type2:number = contact.m_fixtureB!.GetType();
		var reg:b2ContactRegister;
		if(contact.m_swaped)
		{
			reg = this.m_registers[type2][type1];
		}
		else
		{
			reg = this.m_registers[type1][type2];
		}
		contact.Reset();
		++reg.poolCount;
		contact.m_next = reg.pool;
		reg.pool = contact;
	}
}
