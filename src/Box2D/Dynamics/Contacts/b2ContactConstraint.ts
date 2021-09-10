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

import { b2Body, b2ContactConstraintPoint, b2Manifold, b2Settings, b2Vec2 } from "../..";










export class b2ContactConstraint
{
	constructor(){
		this.points = new Array(b2Settings.b2_maxManifoldPoints);
		for (var i:number = 0; i < b2Settings.b2_maxManifoldPoints; i++){
			this.points[i] = new b2ContactConstraintPoint();
		}
	}
	public points:Array<any>;
	public normal:b2Vec2=new b2Vec2();
	public manifold:b2Manifold;
	public body1:b2Body;
	public body2:b2Body;
	public friction:number;
	public restitution:number;
	public pointCount:number;
}
