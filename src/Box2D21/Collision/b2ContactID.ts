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

import { Features } from "..";



export class b2ContactID
{
	constructor()
	{
		this.features._m_id = this;
	}

	public Set(id:b2ContactID):void
	{
		this.key = id._key;
	}

	public Copy():b2ContactID
	{
		var id:b2ContactID = new b2ContactID();
		id.key = this.key;
		return id;
	}

	public get key():number
	{
		return this._key;
	}

	public set key(value:number)
	{
		this._key = value;
		this.features._referenceEdge = this._key & 0xFF;
		this.features._incidentEdge = ((this._key & 0xFF00) >> 8) & 0xFF;
		this.features._incidentVertex = ((this._key & 0xFF0000) >> 16) & 0xFF;
		this.features._flip = ((this._key & 0xFF000000) >> 24) & 0xFF;
	}

	public features:Features = new Features();

	public _key:number = 0;
}
