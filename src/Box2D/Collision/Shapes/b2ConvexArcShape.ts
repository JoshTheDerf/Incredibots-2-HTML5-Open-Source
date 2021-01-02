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

import { b2Shape, b2XForm, b2Vec2, b2Settings, b2Segment, b2AABB, b2MassData, b2OBB, b2ShapeDef } from "../..";

///A circle intersected with a half plane.
///The circle is as it would be for a b2CircleShape, i.e. centered at localPosition and of radius radius.
///The half plane is represented by norm, giving the outward normal, and offset, which is the offset of
///the halfplane's edge from the center of the circle. A zero offset means a semi-circle, with a positive
///offset being larger than that and a negative one smaller.
export class b2ConvexArcShape extends b2Shape
{
	/// @see b2Shape::TestPoint
	public TestPoint(xf:b2XForm, p:b2Vec2) :boolean{
		b2Settings.b2Assert(false);
		return false;
	}

	/// @see b2Shape::TestSegment
	public TestSegment( xf:b2XForm,
		lambda:Array<any>, // float ptr
		normal:b2Vec2, // ptr
		segment:b2Segment,
		maxLambda:number) :boolean
	{
		b2Settings.b2Assert(false);
		return false;
	}

	/// @see b2Shape::ComputeAABB
	public ComputeAABB(aabb:b2AABB, xf:b2XForm) : void{
		super.ComputeAABB(aabb, xf);
	}

	/// @see b2Shape::ComputeSweptAABB
	public ComputeSweptAABB(	aabb:b2AABB,
		transform1:b2XForm,
		transform2:b2XForm) : void
	{
		super.ComputeSweptAABB(aabb, transform1, transform2);
	}

	/// @see b2Shape::ComputeMass
	public ComputeMass(massData:b2MassData) : void{
	}

	/// Get the oriented bounding box relative to the parent body.
	public GetOBB() : b2OBB{
		return m_obb;
	}


	//--------------- Internals Below -------------------

	constructor(def:b2ShapeDef){
		super(def);
	}

	public UpdateSweepRadius(center:b2Vec2) : void{
	}


	public Support(xf:b2XForm, dX:number, dY:number) : b2Vec2 {
		b2Settings.b2Assert(false);
		return null;
	}

	// Local position of the circle center in parent body frame.
	public m_localPosition:b2Vec2 = new b2Vec2();

	// Local position oriented bounding box. The OBB center is relative to
	// shape position.
	public m_obb:b2OBB = new b2OBB();
	//Only has 2 vertices
	public m_vertices:Array<any>= [new b2Vec2(), new b2Vec2()];//Like b2PolyShape, these are relative to m_localPosition
	public m_radius:number;
	public m_norm:b2Vec2 = new b2Vec2();
	public m_offset:number;
	public m_d:number;//Length of straight section
	public m_dot:number;
};
