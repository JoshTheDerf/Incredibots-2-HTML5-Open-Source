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

import { b2FilterData, b2Shape } from "..";

export class b2FixtureDef
{

	public shape:b2Shape | null = null;

	public userData:any = null;

	public friction:number = 0;

	public restitution:number = 0;

	public density:number = 0;

	public isSensor:boolean = false;

	public filter:b2FilterData = new b2FilterData();

	constructor(){
		this.shape = null;
		this.userData = null;
		this.friction = 0.2;
		this.restitution = 0;
		this.density = 0;
		this.filter.categoryBits = 1;
		this.filter.maskBits = 65535;
		this.filter.groupIndex = 0;
		this.isSensor = false;
	}
}
