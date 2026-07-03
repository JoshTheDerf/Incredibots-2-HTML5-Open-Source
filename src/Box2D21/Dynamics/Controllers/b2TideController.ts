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

import { b2BuoyancyController, b2TimeStep } from "../..";

export class b2TideController extends b2BuoyancyController
{
	public tideFunc:Function | null = null;

	public normalXFunc:Function | null = null;

	public origOffset:number = 0;

	public origNormalX:number = 0;

	public stepTracker:number = -Infinity;

	constructor()
	{
		super();
	}

	public Step(step:b2TimeStep) : void
	{
		if(this.stepTracker == Number.NEGATIVE_INFINITY)
		{
			this.origOffset = this.offset;
			this.origNormalX = this.normal.x;
			this.stepTracker = 0;
		}
		if(this.tideFunc != null)
		{
			this.offset = this.tideFunc(this.stepTracker) + this.origOffset;
		}
		if(this.normalXFunc != null)
		{
			this.normal.x = this.normalXFunc(this.stepTracker) + this.origNormalX;
		}
		this.stepTracker += step.dt;
		super.Step(step);
	}
}
