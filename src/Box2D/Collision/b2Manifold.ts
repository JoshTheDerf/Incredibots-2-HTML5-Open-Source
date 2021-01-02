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

// A manifold for two touching convex shapes.
export class b2Manifold
{
	public constructor(){
		var maxPoints:number = b2Settings.b2_maxManifoldPoints;
		this.points = new Array(maxPoints);
		for (var i:number = 0; i < maxPoints; i++){
			this.points[i] = new b2ManifoldPoint();
		}
		this.normal = new b2Vec2();
	}
	public Reset() : void{
		var maxPoints:number = b2Settings.b2_maxManifoldPoints;
		for (var i:number = 0; i < maxPoints; i++){
			(this.points[i] as b2ManifoldPoint).Reset();
		}
		this.normal.SetZero();
		this.pointCount = 0;
	}
	public Set(m:b2Manifold) : void{
		this.pointCount = m.pointCount;
		var maxPoints:number = b2Settings.b2_maxManifoldPoints;
		for (var i:number = 0; i < maxPoints; i++){
			(this.points[i] as b2ManifoldPoint).Set(m.points[i]);
		}
		this.normal.SetV(m.normal);
	}
	public points:Array<any>;	///< the points of contact
	public normal:b2Vec2;	///< the shared unit normal vector
	public pointCount:number = 0;	///< the number of manifold points
};
