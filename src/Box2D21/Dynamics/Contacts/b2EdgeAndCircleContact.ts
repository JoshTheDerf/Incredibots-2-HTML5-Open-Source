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

import { b2Body, b2CircleShape, b2Contact, b2EdgeShape, b2Fixture, b2Manifold, b2Transform } from "../..";

export class b2EdgeAndCircleContact extends b2Contact
{
	constructor()
	{
		super();
	}

	public static Create(allocator:any) : b2Contact
	{
		return new b2EdgeAndCircleContact();
	}

	public static Destroy(contact:b2Contact, allocator:any) : void
	{
	}

	public Reset(fixtureA:b2Fixture, fixtureB:b2Fixture) : void
	{
		super.Reset(fixtureA,fixtureB);
	}

	public Evaluate() : void
	{
		var bodyA:b2Body = this.m_fixtureA!.GetBody();
		var bodyB:b2Body = this.m_fixtureB!.GetBody();
		this.b2CollideEdgeAndCircle(this.m_manifold,this.m_fixtureA!.GetShape() as b2EdgeShape,bodyA.m_xf,this.m_fixtureB!.GetShape() as b2CircleShape,bodyB.m_xf);
	}

	private b2CollideEdgeAndCircle(manifold:b2Manifold, edge:b2EdgeShape, xfA:b2Transform, circle:b2CircleShape, xfB:b2Transform) : void
	{
	}
}
