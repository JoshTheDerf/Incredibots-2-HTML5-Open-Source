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

import { b2Body, b2CircleShape, b2Collision, b2Contact, b2Fixture, b2PolygonShape, b2Settings, b2Shape } from "../..";

export class b2PolyAndCircleContact extends b2Contact
{
	constructor()
	{
		super();
	}

	public static Create(allocator:any) : b2Contact
	{
		return new b2PolyAndCircleContact();
	}

	public static Destroy(contact:b2Contact, allocator:any) : void
	{
	}

	public Reset(fixtureA:b2Fixture | null = null, fixtureB:b2Fixture | null = null) : void
	{
		super.Reset(fixtureA,fixtureB);
		// b2ContactFactory.Destroy calls Reset() with NO fixtures to clear a pooled
		// contact (base b2Contact.Reset early-returns on null). Guard the type
		// asserts to match — else `fixtureA.GetType()` (the assert ARGUMENT, always
		// evaluated) throws on the null pool path, crashing every engine-1 sim that
		// destroys a poly/circle contact.
		if(!fixtureA || !fixtureB)
		{
			return;
		}
		b2Settings.b2Assert(fixtureA.GetType() == b2Shape.e_polygonShape);
		b2Settings.b2Assert(fixtureB.GetType() == b2Shape.e_circleShape);
	}

	public Evaluate() : void
	{
		var bodyA:b2Body = this.m_fixtureA!.m_body;
		var bodyB:b2Body = this.m_fixtureB!.m_body;
		b2Collision.CollidePolygonAndCircle(this.m_manifold,this.m_fixtureA!.GetShape() as b2PolygonShape,bodyA.m_xf,this.m_fixtureB!.GetShape() as b2CircleShape,bodyB.m_xf);
	}
}
