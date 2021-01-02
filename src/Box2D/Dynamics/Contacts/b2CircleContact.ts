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

import { b2Contact, b2Shape, b2ManifoldPoint, b2ContactPoint, b2ContactListener, b2Vec2, b2Body, b2Collision, b2CircleShape, b2Manifold } from "../..";

export class b2CircleContact extends b2Contact
{
	public static  Create(shape1:b2Shape, shape2:b2Shape, allocator:any):b2Contact{
		return new b2CircleContact(shape1, shape2);
	}
	public static  Destroy(contact:b2Contact, allocator:any) : void{
		//
	}

	constructor(shape1:b2Shape, shape2:b2Shape){
		super(shape1, shape2);

		this.m_manifold = this.m_manifolds[0];

		//b2Settings.b2Assert(m_shape1.m_type == b2Shape.e_circleShape);
		//b2Settings.b2Assert(m_shape2.m_type == b2Shape.e_circleShape);
		this.m_manifold.pointCount = 0;
		var point:b2ManifoldPoint = this.m_manifold.points[0];
		point.normalImpulse = 0.0;
		point.tangentImpulse = 0.0;
	}
	//~b2CircleContact() {}

	private static s_evalCP:b2ContactPoint = new b2ContactPoint();
	public Evaluate(listener:b2ContactListener) : void{
		var v1:b2Vec2;
		var v2:b2Vec2;
		var mp0:b2ManifoldPoint;

		var b1:b2Body = this.m_shape1.m_body;
		var b2:b2Body = this.m_shape2.m_body;

		//b2Manifold m0;
		//memcpy(&m0, &m_manifold, sizeof(b2Manifold));
		// TODO: make sure this is completely necessary
		this.m0.Set(this.m_manifold);

		b2Collision.b2CollideCircles(this.m_manifold, this.m_shape1 as b2CircleShape, b1.m_xf, this.m_shape2 as b2CircleShape, b2.m_xf);

		var cp:b2ContactPoint = b2CircleContact.s_evalCP;
		cp.shape1 = this.m_shape1;
		cp.shape2 = this.m_shape2;
		cp.friction = this.m_friction;
		cp.restitution = this.m_restitution;

		if (this.m_manifold.pointCount > 0)
		{
			this.m_manifoldCount = 1;
			var mp:b2ManifoldPoint = this.m_manifold.points[ 0 ];

			if (this.m0.pointCount == 0)
			{
				mp.normalImpulse = 0.0;
				mp.tangentImpulse = 0.0;

				if (listener)
				{
					cp.position = b1.GetWorldPoint(mp.localPoint1);
					v1 = b1.GetLinearVelocityFromLocalPoint(mp.localPoint1);
					v2 = b2.GetLinearVelocityFromLocalPoint(mp.localPoint2);
					cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
					cp.normal.SetV(this.m_manifold.normal);
					cp.separation = mp.separation;
					cp.id.key = mp.id._key;
					listener.Add(cp);
				}
			} else
			{
				mp0 = this.m0.points[ 0 ];
				mp.normalImpulse = mp0.normalImpulse;
				mp.tangentImpulse = mp0.tangentImpulse;

				if (listener)
				{
					cp.position = b1.GetWorldPoint(mp.localPoint1);
					v1 = b1.GetLinearVelocityFromLocalPoint(mp.localPoint1);
					v2 = b2.GetLinearVelocityFromLocalPoint(mp.localPoint2);
					cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
					cp.normal.SetV(this.m_manifold.normal);
					cp.separation = mp.separation;
					cp.id.key = mp.id._key;
					listener.Persist(cp);
				}
			}
		}
		else
		{
			this.m_manifoldCount = 0;
			if (this.m0.pointCount > 0 && listener)
			{
				mp0 = this.m0.points[ 0 ];
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
	}

	public GetManifolds():Array<any>
	{
		return this.m_manifolds;
	}

	private m_manifolds:Array<any>= [new b2Manifold()];
	public m_manifold:b2Manifold;
	private m0:b2Manifold = new b2Manifold();
};
