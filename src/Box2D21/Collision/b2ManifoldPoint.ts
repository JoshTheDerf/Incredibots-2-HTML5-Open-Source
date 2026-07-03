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

import { b2ContactID, b2Vec2 } from "..";



export class b2ManifoldPoint
{
	public m_localPoint:b2Vec2 = new b2Vec2();

	public m_normalImpulse:number = 0;

	public m_tangentImpulse:number = 0;

	public m_id:b2ContactID = new b2ContactID();

	constructor()
	{
		this.Reset();
	}

	public Reset():void
	{
		this.m_localPoint.SetZero();
		this.m_normalImpulse = 0;
		this.m_tangentImpulse = 0;
		this.m_id.key = 0;
	}

	public Set(m:b2ManifoldPoint):void
	{
		this.m_localPoint.SetV(m.m_localPoint);
		this.m_normalImpulse = m.m_normalImpulse;
		this.m_tangentImpulse = m.m_tangentImpulse;
		this.m_id.Set(m.m_id);
	}
}
