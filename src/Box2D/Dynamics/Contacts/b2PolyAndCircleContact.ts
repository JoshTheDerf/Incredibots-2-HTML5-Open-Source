﻿/*
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

import { b2Body, b2CircleShape, b2Collision, b2Contact, b2ContactListener, b2ContactPoint, b2Manifold, b2ManifoldPoint, b2PolygonShape, b2Settings, b2Shape, b2Vec2 } from "../..";











export class b2PolyAndCircleContact extends b2Contact{

	public static Create(shape1:b2Shape, shape2:b2Shape, allocator:any):b2Contact{
		return new b2PolyAndCircleContact(shape1, shape2);
	}
	public static Destroy(contact:b2Contact, allocator:any): void{
	}

	constructor(shape1:b2Shape, shape2:b2Shape){
		super(shape1, shape2);

		this.m_manifold = this.m_manifolds[0];

		//b2Settings.b2Assert(m_shape1.m_type == b2Shape.e_polygonShape);//Commented out for inheritance reasons
		b2Settings.b2Assert(this.m_shape2.m_type == b2Shape.e_circleShape);
		this.m_manifold.pointCount = 0;
		var point:b2ManifoldPoint = this.m_manifold.points[0];
		point.normalImpulse = 0.0;
		point.tangentImpulse = 0.0;
	}
	//~b2PolyAndCircleContact() {}

	//
	public static s_evalCP:b2ContactPoint = new b2ContactPoint();
	//
	public Evaluate(listener:b2ContactListener): void{
		var i:number;
		var v1:b2Vec2;
		var v2:b2Vec2;
		var mp0:b2ManifoldPoint;

		var b1:b2Body = this.m_shape1.m_body;
		var b2:b2Body = this.m_shape2.m_body;

		//b2Manifold m0;
		//memcpy(&m0, &m_manifold, sizeof(b2Manifold));
		// TODO: make sure this is completely necessary
		this.m0.Set(this.m_manifold);

		b2Collision.b2CollidePolygonAndCircle(this.m_manifold, this.m_shape1 as b2PolygonShape, b1.m_xf, this.m_shape2 as b2CircleShape, b2.m_xf);

		var persisted:Array<any> = [false, false];

		var cp:b2ContactPoint = b2PolyAndCircleContact.s_evalCP;
		cp.shape1 = this.m_shape1;
		cp.shape2 = this.m_shape2;
		cp.friction = this.m_friction;
		cp.restitution = this.m_restitution;

		// Match contact ids to facilitate warm starting.
		if (this.m_manifold.pointCount > 0)
		{
			// Match old contact ids to new contact ids and copy the
			// stored impulses to warm start the solver.
			for (i = 0; i < this.m_manifold.pointCount; ++i)
			{
				var mp:b2ManifoldPoint = this.m_manifold.points[ i ];
				mp.normalImpulse = 0.0;
				mp.tangentImpulse = 0.0;
				var found:boolean = false;
				var idKey:number = mp.id._key;

				for (var j:number = 0; j < this.m0.pointCount; ++j)
				{
					if (persisted[j] == true)
					{
						continue;
					}

					mp0 = this.m0.points[ j ];

					if (mp0.id._key == idKey)
					{
						persisted[j] = true;
						mp.normalImpulse = mp0.normalImpulse;
						mp.tangentImpulse = mp0.tangentImpulse;

						// A persistent point.
						found = true;

						// Report persistent point.
						if (listener != null)
						{
							cp.position = b1.GetWorldPoint(mp.localPoint1);
							v1 = b1.GetLinearVelocityFromLocalPoint(mp.localPoint1);
							v2 = b2.GetLinearVelocityFromLocalPoint(mp.localPoint2);
							cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
							cp.normal.SetV(this.m_manifold.normal);
							cp.separation = mp.separation;
							cp.id.key = idKey;
							listener.Persist(cp);
						}
						break;
					}
				}

				// Report added point.
				if (found == false && listener != null)
				{
					cp.position = b1.GetWorldPoint(mp.localPoint1);
					v1 = b1.GetLinearVelocityFromLocalPoint(mp.localPoint1);
					v2 = b2.GetLinearVelocityFromLocalPoint(mp.localPoint2);
					cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
					cp.normal.SetV(this.m_manifold.normal);
					cp.separation = mp.separation;
					cp.id.key = idKey;
					listener.Add(cp);
				}
			}

			this.m_manifoldCount = 1;
		}
		else
		{
			this.m_manifoldCount = 0;
		}

		if (listener == null)
		{
			return;
		}

		// Report removed points.
		for (i = 0; i < this.m0.pointCount; ++i)
		{
			if (persisted[i])
			{
				continue;
			}

			mp0 = this.m0.points[ i ];
			cp.position = b1.GetWorldPoint(mp0.localPoint1);
			v1 = b1.GetLinearVelocityFromLocalPoint(mp0.localPoint1);
			v2 = b2.GetLinearVelocityFromLocalPoint(mp0.localPoint2);
			cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
			cp.normal.SetV(this.m0.normal);
			cp.separation = mp0.separation;
			cp.id.key = mp0.id._key;
			listener.Remove(cp);
		}
	}

	public GetManifolds():Array<any>
	{
		return this.m_manifolds;
	}

	public m_manifolds:Array<any> = [new b2Manifold()];
	public m_manifold:b2Manifold;
	public m0:b2Manifold = new b2Manifold();

}
