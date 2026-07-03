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

import { b2ContactID } from "..";



export class Features
{
	public get referenceEdge():number {
		return this._referenceEdge;
	}
	public set referenceEdge(value:number) {
		this._referenceEdge = value;
		this._m_id._key = (this._m_id._key & 0xFFFFFF00) | (this._referenceEdge & 0xFF);
	}
	public _referenceEdge:number = 0;

	public get incidentEdge():number {
		return this._incidentEdge;
	}
	public set incidentEdge(value:number) {
		this._incidentEdge = value;
		this._m_id._key = (this._m_id._key & 0xFFFF00FF) | ((this._incidentEdge << 8) & 0xFF00);
	}
	public _incidentEdge:number = 0;

	public get incidentVertex():number {
		return this._incidentVertex;
	}
	public set incidentVertex(value:number) {
		this._incidentVertex = value;
		this._m_id._key = (this._m_id._key & 0xFF00FFFF) | ((this._incidentVertex << 16) & 0xFF0000);
	}
	public _incidentVertex:number = 0;

	public get flip():number {
		return this._flip;
	}
	public set flip(value:number) {
		this._flip = value;
		this._m_id._key = (this._m_id._key & 0xFFFFFF) | ((this._flip << 24) & 0xFF000000);
	}
	public _flip:number = 0;

	public _m_id!:b2ContactID;
}
