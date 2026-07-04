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

import { b2Body, b2Contact, b2EdgeShape, b2Fixture, b2Manifold, b2PolygonShape, b2Settings, b2Shape, b2Transform } from "../..";

export class b2PolyAndEdgeContact extends b2Contact
{
	constructor()
	{
		super();
	}

	public static Create(allocator:any) : b2Contact
	{
		return new b2PolyAndEdgeContact();
	}

	public static Destroy(contact:b2Contact, allocator:any) : void
	{
	}

	public Reset(fixtureA:b2Fixture | null = null, fixtureB:b2Fixture | null = null) : void
	{
		super.Reset(fixtureA,fixtureB);
		// See b2PolyAndCircleContact.Reset: the pooled-contact Destroy path calls
		// Reset() with no fixtures, so guard the type asserts against null.
		if(!fixtureA || !fixtureB)
		{
			return;
		}
		b2Settings.b2Assert(fixtureA.GetType() == b2Shape.e_polygonShape);
		b2Settings.b2Assert(fixtureB.GetType() == b2Shape.e_edgeShape);
	}

	public Evaluate() : void
	{
		var bodyA:b2Body = this.m_fixtureA!.GetBody();
		var bodyB:b2Body = this.m_fixtureB!.GetBody();
		this.b2CollidePolyAndEdge(this.m_manifold,this.m_fixtureA!.GetShape() as b2PolygonShape,bodyA.m_xf,this.m_fixtureB!.GetShape() as b2EdgeShape,bodyB.m_xf);
	}

	private b2CollidePolyAndEdge(manifold:b2Manifold, polygon:b2PolygonShape, xfA:b2Transform, edge:b2EdgeShape, xfB:b2Transform) : void
	{
	}
}
