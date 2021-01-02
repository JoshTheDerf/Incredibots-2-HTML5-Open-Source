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

import { b2Mat22, b2Vec2 } from "../../";

/// A transform contains translation and rotation. It is used to represent
/// the position and orientation of rigid frames.
export class b2XForm
{
	/// The default constructor does nothing (for performance).
	constructor(pos:b2Vec2|null=null, r:b2Mat22|null=null)
	{
		if (pos && r) {
			this.position.SetV(pos);
			this.R.SetM(r);
		}
	}

	/// Initialize using a position vector and a rotation matrix.
	public Initialize(pos:b2Vec2, r:b2Mat22) : void
	{
		this.position.SetV(pos);
		this.R.SetM(r);
	}

	/// Set this to the identity transform.
	public SetIdentity() : void
	{
		this.position.SetZero();
		this.R.SetIdentity();
	}



	public Set(x:b2XForm) : void{

		this.position.SetV(x.position);

		this.R.SetM(x.R);

	}

	public position:b2Vec2 = new b2Vec2;
	public R:b2Mat22 = new b2Mat22();
}
