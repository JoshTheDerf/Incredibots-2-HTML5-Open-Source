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

import { b2Contact, b2ContactImpulse, b2Manifold } from "..";

export class b2ContactListener
{

	public static b2_defaultListener:b2ContactListener = new b2ContactListener();

	constructor(){
	}

	public BeginContact(contact:b2Contact) : void{
	}

	public EndContact(contact:b2Contact) : void{
	}

	public PreSolve(contact:b2Contact, oldManifold:b2Manifold) : void{
	}

	public PostSolve(contact:b2Contact, impulse:b2ContactImpulse) : void{
	}
}
