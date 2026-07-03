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

export class b2Settings
{
	public static VERSION:string = "2.1alpha";

	public static USHRT_MAX:number = 65535;

	public static b2_pi:number = Math.PI;

	public static useRestitution:number = 0;

	public static RES_HIGHEST:number = 0;

	public static RES_AVERAGE:number = 1;

	public static RES_PRODUCT:number = 2;

	public static RES_SQRT:number = 3;

	public static RES_SIN:number = 4;

	public static RES_SQRTAVG:number = 5;

	public static b2_maxManifoldPoints:number = 2;

	public static b2_aabbExtension:number = 0.1;

	public static b2_aabbMultiplier:number = 2;

	public static b2_linearSlop:number = 0.005;

	public static b2_polygonRadius:number = 2 * b2Settings.b2_linearSlop;

	public static b2_angularSlop:number = 2 / 180 * b2Settings.b2_pi;

	public static b2_toiSlop:number = 8 * b2Settings.b2_linearSlop;

	public static b2_maxTOIContactsPerIsland:number = 32;

	public static b2_maxTOIJointsPerIsland:number = 32;

	public static b2_velocityThreshold:number = 1;

	public static b2_maxLinearCorrection:number = 0.2;

	public static b2_maxAngularCorrection:number = 8 / 180 * b2Settings.b2_pi;

	public static b2_maxTranslation:number = 200;

	public static b2_maxTranslationSquared:number = b2Settings.b2_maxTranslation * b2Settings.b2_maxTranslation;

	public static b2_maxRotation:number = 250;

	public static b2_maxRotationSquared:number = b2Settings.b2_maxRotation * b2Settings.b2_maxRotation;

	public static b2_contactBaumgarte:number = 0.2;

	public static b2_timeToSleep:number = 0.5;

	public static b2_linearSleepTolerance:number = 0.01;

	public static b2_angularSleepTolerance:number = 2 / 180 * b2Settings.b2_pi;

	public static b2MixFriction(friction1:number, friction2:number) : number
	{
		return Math.sqrt(friction1 * friction2);
	}

	public static b2MixRestitution(restitution1:number, restitution2:number) : number
	{
		var min:number = NaN;
		if(b2Settings.useRestitution == b2Settings.RES_AVERAGE)
		{
			return (restitution1 + restitution2) / 2;
		}
		if(b2Settings.useRestitution == b2Settings.RES_PRODUCT)
		{
			return restitution1 * restitution2 / (40 / 54);
		}
		if(b2Settings.useRestitution == b2Settings.RES_SQRT)
		{
			return Math.sqrt(restitution1 * restitution2);
		}
		if(b2Settings.useRestitution == b2Settings.RES_SIN)
		{
			min = restitution1 < restitution2 ? restitution1 : restitution2;
			return Math.sin(min * b2Settings.b2_pi) * Math.abs(restitution1 - restitution2) + min;
		}
		if(b2Settings.useRestitution == b2Settings.RES_SQRTAVG)
		{
			return Math.sqrt((restitution1 + restitution2) / 2 * Math.sqrt(restitution1 * restitution2));
		}
		return restitution1 > restitution2 ? restitution1 : restitution2;
	}

	public static b2Assert(a:boolean) : void
	{
		if(!a)
		{
			throw "Assertion Failed";
		}
	}
}
