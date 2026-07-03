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

import { b2Body, b2Vec2 } from "..";

export class b2BodyDef
{

	public type:number = 0;

	public position:b2Vec2 = new b2Vec2();

	public angle:number = 0;

	public linearVelocity:b2Vec2 = new b2Vec2();

	public angularVelocity:number = 0;

	public linearDamping:number = 0;

	public angularDamping:number = 0;

	public allowSleep:boolean = false;

	public awake:boolean = false;

	public fixedRotation:boolean = false;

	public bullet:boolean = false;

	public active:boolean = false;

	public userData:any = null;

	public inertiaScale:number = 0;

	constructor(){
		this.userData = null;
		this.position.Set(0,0);
		this.angle = 0;
		this.linearVelocity.Set(0,0);
		this.angularVelocity = 0;
		this.linearDamping = 0;
		this.angularDamping = 0;
		this.allowSleep = true;
		this.awake = true;
		this.fixedRotation = false;
		this.bullet = false;
		this.type = b2Body.b2_staticBody;
		this.active = true;
		this.inertiaScale = 1;
	}
}
