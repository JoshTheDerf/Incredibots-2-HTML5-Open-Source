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

import { b2Body, b2ContactEdge, b2ContactID, b2ContactListener, b2Fixture, b2Manifold, b2ManifoldPoint, b2Settings, b2Shape, b2Sweep, b2TimeOfImpact, b2TOIInput, b2Transform, b2WorldManifold } from "../..";

export class b2Contact
{
	public static e_sensorFlag:number = 1;

	public static e_continuousFlag:number = 2;

	public static e_islandFlag:number = 4;

	public static e_toiFlag:number = 8;

	public static e_touchingFlag:number = 16;

	public static e_enabledFlag:number = 32;

	public static e_filterFlag:number = 64;

	private static s_input:b2TOIInput = new b2TOIInput();

	public m_swaped:boolean = false;

	public m_flags:number = 0;

	public m_prev:b2Contact | null = null;

	public m_next:b2Contact | null = null;

	public m_nodeA:b2ContactEdge = new b2ContactEdge();

	public m_nodeB:b2ContactEdge = new b2ContactEdge();

	public m_fixtureA:b2Fixture | null = null;

	public m_fixtureB:b2Fixture | null = null;

	public m_manifold:b2Manifold = new b2Manifold();

	public m_oldManifold:b2Manifold = new b2Manifold();

	public m_toi:number = 0;

	constructor()
	{
	}

	public GetManifold() : b2Manifold
	{
		return this.m_manifold;
	}

	public GetWorldManifold(worldManifold:b2WorldManifold) : void
	{
		var bodyA:b2Body = this.m_fixtureA!.GetBody();
		var bodyB:b2Body = this.m_fixtureB!.GetBody();
		var shapeA:b2Shape = this.m_fixtureA!.GetShape();
		var shapeB:b2Shape = this.m_fixtureB!.GetShape();
		worldManifold.Initialize(this.m_manifold,bodyA.GetTransform(),shapeA.m_radius,bodyB.GetTransform(),shapeB.m_radius);
	}

	public IsTouching() : boolean
	{
		return (this.m_flags & b2Contact.e_touchingFlag) == b2Contact.e_touchingFlag;
	}

	public IsContinuous() : boolean
	{
		return (this.m_flags & b2Contact.e_continuousFlag) == b2Contact.e_continuousFlag;
	}

	public SetSensor(sensor:boolean) : void
	{
		if(sensor)
		{
			this.m_flags |= b2Contact.e_sensorFlag;
		}
		else
		{
			this.m_flags &= ~b2Contact.e_sensorFlag;
		}
	}

	public IsSensor() : boolean
	{
		return (this.m_flags & b2Contact.e_sensorFlag) == b2Contact.e_sensorFlag;
	}

	public SetEnabled(flag:boolean) : void
	{
		if(flag)
		{
			this.m_flags |= b2Contact.e_enabledFlag;
		}
		else
		{
			this.m_flags &= ~b2Contact.e_enabledFlag;
		}
	}

	public IsEnabled() : boolean
	{
		return (this.m_flags & b2Contact.e_enabledFlag) == b2Contact.e_enabledFlag;
	}

	public GetNext() : b2Contact | null
	{
		return this.m_next;
	}

	public GetFixtureA() : b2Fixture
	{
		return this.m_fixtureA!;
	}

	public GetFixtureB() : b2Fixture
	{
		return this.m_fixtureB!;
	}

	public FlagForFiltering() : void
	{
		this.m_flags |= b2Contact.e_filterFlag;
	}

	public Reset(fixtureA:b2Fixture | null = null, fixtureB:b2Fixture | null = null) : void
	{
		this.m_flags = b2Contact.e_enabledFlag;
		if(!fixtureA || !fixtureB)
		{
			this.m_fixtureA = null;
			this.m_fixtureB = null;
			return;
		}
		if(fixtureA.IsSensor() || fixtureB.IsSensor())
		{
			this.m_flags |= b2Contact.e_sensorFlag;
		}
		var bodyA:b2Body = fixtureA.GetBody();
		var bodyB:b2Body = fixtureB.GetBody();
		if(bodyA.GetType() != b2Body.b2_dynamicBody || bodyA.IsBullet() || bodyB.GetType() != b2Body.b2_dynamicBody || bodyB.IsBullet())
		{
			this.m_flags |= b2Contact.e_continuousFlag;
		}
		this.m_fixtureA = fixtureA;
		this.m_fixtureB = fixtureB;
		this.m_manifold.m_pointCount = 0;
		this.m_prev = null;
		this.m_next = null;
		this.m_nodeA.contact = null;
		this.m_nodeA.prev = null;
		this.m_nodeA.next = null;
		this.m_nodeA.other = null;
		this.m_nodeB.contact = null;
		this.m_nodeB.prev = null;
		this.m_nodeB.next = null;
		this.m_nodeB.other = null;
	}

	public Update(listener:b2ContactListener) : void
	{
		var shapeA:b2Shape;
		var shapeB:b2Shape;
		var xfA:b2Transform;
		var xfB:b2Transform;
		var i:number;
		var mp:b2ManifoldPoint;
		var id:b2ContactID;
		var j:number;
		var mp2:b2ManifoldPoint;
		var oldManifold:b2Manifold = this.m_oldManifold;
		this.m_oldManifold = this.m_manifold;
		this.m_manifold = oldManifold;
		this.m_flags |= b2Contact.e_enabledFlag;
		var touching:boolean = false;
		var wasTouching:boolean = (this.m_flags & b2Contact.e_touchingFlag) == b2Contact.e_touchingFlag;
		var bodyA:b2Body = this.m_fixtureA!.m_body;
		var bodyB:b2Body = this.m_fixtureB!.m_body;
		var aabbOverlap:boolean = this.m_fixtureA!.m_aabb.TestOverlap(this.m_fixtureB!.m_aabb);
		if(this.m_flags & b2Contact.e_sensorFlag)
		{
			if(aabbOverlap)
			{
				shapeA = this.m_fixtureA!.GetShape();
				shapeB = this.m_fixtureB!.GetShape();
				xfA = bodyA.GetTransform();
				xfB = bodyB.GetTransform();
				touching = b2Shape.TestOverlap(shapeA,xfA,shapeB,xfB);
			}
			this.m_manifold.m_pointCount = 0;
		}
		else
		{
			if(bodyA.GetType() != b2Body.b2_dynamicBody || bodyA.IsBullet() || bodyB.GetType() != b2Body.b2_dynamicBody || bodyB.IsBullet())
			{
				this.m_flags |= b2Contact.e_continuousFlag;
			}
			else
			{
				this.m_flags &= ~b2Contact.e_continuousFlag;
			}
			if(aabbOverlap)
			{
				this.Evaluate();
				touching = this.m_manifold.m_pointCount > 0;
				i = 0;
				while(i < this.m_manifold.m_pointCount)
				{
					mp = this.m_manifold.m_points[i];
					mp.m_normalImpulse = 0;
					mp.m_tangentImpulse = 0;
					id = mp.m_id;
					j = 0;
					while(j < this.m_oldManifold.m_pointCount)
					{
						mp2 = this.m_oldManifold.m_points[j];
						if(mp2.m_id.key == id.key)
						{
							mp.m_normalImpulse = mp2.m_normalImpulse;
							mp.m_tangentImpulse = mp2.m_tangentImpulse;
							break;
						}
						j++;
					}
					i++;
				}
			}
			else
			{
				this.m_manifold.m_pointCount = 0;
			}
			if(touching != wasTouching)
			{
				bodyA.SetAwake(true);
				bodyB.SetAwake(true);
			}
		}
		if(touching)
		{
			this.m_flags |= b2Contact.e_touchingFlag;
		}
		else
		{
			this.m_flags &= ~b2Contact.e_touchingFlag;
		}
		if(wasTouching == false && touching == true)
		{
			listener.BeginContact(this);
		}
		if(wasTouching == true && touching == false)
		{
			listener.EndContact(this);
		}
		if((this.m_flags & b2Contact.e_sensorFlag) == 0)
		{
			listener.PreSolve(this,this.m_oldManifold);
		}
	}

	public Evaluate() : void
	{
	}

	public ComputeTOI(sweepA:b2Sweep, sweepB:b2Sweep) : number
	{
		b2Contact.s_input.proxyA.Set(this.m_fixtureA!.GetShape());
		b2Contact.s_input.proxyB.Set(this.m_fixtureB!.GetShape());
		b2Contact.s_input.sweepA = sweepA;
		b2Contact.s_input.sweepB = sweepB;
		b2Contact.s_input.tolerance = b2Settings.b2_linearSlop;
		return b2TimeOfImpact.TimeOfImpact(b2Contact.s_input);
	}
}
