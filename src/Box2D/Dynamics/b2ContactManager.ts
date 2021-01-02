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

import { b2PairCallback, b2Shape, b2Body, b2Contact, b2ContactPoint, b2Manifold, b2ManifoldPoint, b2Vec2, b2World, b2NullContact } from "..";

// Delegate of b2World.
export class b2ContactManager extends b2PairCallback
{
	public b2ContactManager() {
		this.m_world = null;
		this.m_destroyImmediate = false;
	};

	// This is a callback from the broadphase when two AABB proxies begin
	// to overlap. We create a b2Contact to manage the narrow phase.
	public PairAdded(proxyUserData1:any, proxyUserData2:any):any{
		var shape1:b2Shape = proxyUserData1 as b2Shape;
		var shape2:b2Shape = proxyUserData2 as b2Shape;

		var body1:b2Body = shape1.m_body;
		var body2:b2Body = shape2.m_body;

		if (body1.IsStatic() && body2.IsStatic())
		{
			return this.m_nullContact;
		}

		if (shape1.m_body == shape2.m_body)
		{
			return this.m_nullContact;
		}

		if (body2.IsConnected(body1))
		{
			return this.m_nullContact;
		}

		if (this.m_world.m_contactFilter != null && this.m_world.m_contactFilter.ShouldCollide(shape1, shape2) == false)
		{
			return this.m_nullContact;
		}

		// Call the factory.
		var c:b2Contact = b2Contact.Create(shape1, shape2, this.m_world.m_blockAllocator);

		if (c == null)
		{
			return this.m_nullContact;
		}

		// Contact creation may swap shapes.
		shape1 = c.m_shape1;
		shape2 = c.m_shape2;
		body1 = shape1.m_body;
		body2 = shape2.m_body;

		// Insert into the world.
		c.m_prev = null;
		c.m_next = this.m_world.m_contactList;
		if (this.m_world.m_contactList != null)
		{
			this.m_world.m_contactList.m_prev = c;
		}
		this.m_world.m_contactList = c;


		// Connect to island graph.

		// Connect to body 1
		c.m_node1.contact = c;
		c.m_node1.other = body2;

		c.m_node1.prev = null;
		c.m_node1.next = body1.m_contactList;
		if (body1.m_contactList != null)
		{
			body1.m_contactList.prev = c.m_node1;
		}
		body1.m_contactList = c.m_node1;

		// Connect to body 2
		c.m_node2.contact = c;
		c.m_node2.other = body1;

		c.m_node2.prev = null;
		c.m_node2.next = body2.m_contactList;
		if (body2.m_contactList != null)
		{
			body2.m_contactList.prev = c.m_node2;
		}
		body2.m_contactList = c.m_node2;

		++this.m_world.m_contactCount;
		return c;

	}

	// This is a callback from the broadphase when two AABB proxies cease
	// to overlap. We retire the b2Contact.
	public PairRemoved(proxyUserData1:any, proxyUserData2:any, pairUserData:any): void{

		if (pairUserData == null)
		{
			return;
		}

		var c:b2Contact = pairUserData as b2Contact;
		if (c == this.m_nullContact)
		{
			return;
		}

		// An attached body is being destroyed, we must destroy this contact
		// immediately to avoid orphaned shape pointers.
		this.Destroy(c);
	}

	private static s_evalCP:b2ContactPoint = new b2ContactPoint();
	public Destroy(c:b2Contact) : void
	{

		var shape1:b2Shape = c.m_shape1;
		var shape2:b2Shape = c.m_shape2;

		// Inform the user that this contact is ending.
		var manifoldCount:number = c.m_manifoldCount;
		if (manifoldCount > 0 && this.m_world.m_contactListener)
		{
			var b1:b2Body = shape1.m_body;
			var b2:b2Body = shape2.m_body;

			var manifolds:Array<any> = c.GetManifolds();
			var cp:b2ContactPoint = b2ContactManager.s_evalCP;
			cp.shape1 = c.m_shape1;
			cp.shape2 = c.m_shape2;
			cp.friction = c.m_friction;
			cp.restitution = c.m_restitution;

			for (var i:number = 0; i < manifoldCount; ++i)
			{
				var manifold:b2Manifold = manifolds[ i ];
				cp.normal.SetV(manifold.normal);

				var pointCount:number = manifold.pointCount
				for (var j:number = 0; j < pointCount; ++j)
				{
					var mp:b2ManifoldPoint = manifold.points[j];
					cp.position = b1.GetWorldPoint(mp.localPoint1);
					var v1:b2Vec2 = b1.GetLinearVelocityFromLocalPoint(mp.localPoint1);
					var v2:b2Vec2 = b2.GetLinearVelocityFromLocalPoint(mp.localPoint2);
					cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
					cp.separation = mp.separation;
					cp.id.key = mp.id._key;
					this.m_world.m_contactListener.Remove(cp);
				}
			}
		}

		// Remove from the world.
		if (c.m_prev)
		{
			c.m_prev.m_next = c.m_next;
		}

		if (c.m_next)
		{
			c.m_next.m_prev = c.m_prev;
		}

		if (c == this.m_world.m_contactList)
		{
			this.m_world.m_contactList = c.m_next;
		}

		var body1:b2Body = shape1.m_body;
		var body2:b2Body = shape2.m_body;

		// Remove from body 1
		if (c.m_node1.prev)
		{
			c.m_node1.prev.next = c.m_node1.next;
		}

		if (c.m_node1.next)
		{
			c.m_node1.next.prev = c.m_node1.prev;
		}

		if (c.m_node1 == body1.m_contactList)
		{
			body1.m_contactList = c.m_node1.next;
		}

		// Remove from body 2
		if (c.m_node2.prev)
		{
			c.m_node2.prev.next = c.m_node2.next;
		}

		if (c.m_node2.next)
		{
			c.m_node2.next.prev = c.m_node2.prev;
		}

		if (c.m_node2 == body2.m_contactList)
		{
			body2.m_contactList = c.m_node2.next;
		}

		// Call the factory.
		b2Contact.Destroy(c, this.m_world.m_blockAllocator);
		--this.m_world.m_contactCount;
	}


	// This is the top level collision call for the time step. Here
	// all the narrow phase collision is processed for the world
	// contact list.
	public Collide() : void
	{
		// Update awake contacts.
		for (var c:b2Contact = this.m_world.m_contactList; c; c = c.m_next)
		{
			var body1:b2Body = c.m_shape1.m_body;
			var body2:b2Body = c.m_shape2.m_body;
			if (body1.IsSleeping() && body2.IsSleeping())
			{
				continue;
			}

			c.Update(this.m_world.m_contactListener);
		}
	}

	public m_world:b2World;

	// This lets us provide broadphase proxy pair user data for
	// contacts that shouldn't exist.
	public m_nullContact:b2NullContact = new b2NullContact();
	public m_destroyImmediate:boolean;

};
