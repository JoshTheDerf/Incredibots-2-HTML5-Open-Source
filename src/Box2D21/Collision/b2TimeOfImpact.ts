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

import { b2Distance, b2DistanceInput, b2DistanceOutput, b2DistanceProxy, b2Math, b2SeparationFunction, b2Settings, b2SimplexCache, b2Sweep, b2TOIInput, b2Transform } from "..";



export class b2TimeOfImpact
{

	private static b2_toiCalls:number = 0;

	private static b2_toiIters:number = 0;

	private static b2_toiMaxIters:number = 0;

	private static b2_toiRootIters:number = 0;

	private static b2_toiMaxRootIters:number = 0;

	private static s_cache:b2SimplexCache = new b2SimplexCache();

	private static s_distanceInput:b2DistanceInput = new b2DistanceInput();

	private static s_xfA:b2Transform = new b2Transform();

	private static s_xfB:b2Transform = new b2Transform();

	private static s_fcn:b2SeparationFunction = new b2SeparationFunction();

	private static s_distanceOutput:b2DistanceOutput = new b2DistanceOutput();

	public static TimeOfImpact(input:b2TOIInput):number
	{
		var separation:number;
		var t1:number;
		var a1:number;
		var a2:number;
		var target:number = 0;
		var s2:number;
		var rootIterCount:number;
		var s1:number;
		var a:number;
		var s:number;
		++b2TimeOfImpact.b2_toiCalls;
		var proxyA:b2DistanceProxy = input.proxyA;
		var proxyB:b2DistanceProxy = input.proxyB;
		var sweepA:b2Sweep = input.sweepA;
		var sweepB:b2Sweep = input.sweepB;
		b2Settings.b2Assert(sweepA.t0 == sweepB.t0);
		b2Settings.b2Assert(1 - sweepA.t0 > Number.MIN_VALUE);
		var totalRadius:number = proxyA.m_radius + proxyB.m_radius;
		var tolerance:number = input.tolerance;
		var alpha:number = 0;
		var k_maxIterations:number = 1000;
		var iter:number = 0;
		var distance:number = 0;
		b2TimeOfImpact.s_cache.count = 0;
		b2TimeOfImpact.s_distanceInput.useRadii = false;
		do
		{
			sweepA.GetTransform(b2TimeOfImpact.s_xfA, alpha);
			sweepB.GetTransform(b2TimeOfImpact.s_xfB, alpha);
			b2TimeOfImpact.s_distanceInput.proxyA = proxyA;
			b2TimeOfImpact.s_distanceInput.proxyB = proxyB;
			b2TimeOfImpact.s_distanceInput.transformA = b2TimeOfImpact.s_xfA;
			b2TimeOfImpact.s_distanceInput.transformB = b2TimeOfImpact.s_xfB;
			b2Distance.Distance(b2TimeOfImpact.s_distanceOutput, b2TimeOfImpact.s_cache, b2TimeOfImpact.s_distanceInput);
			if (b2TimeOfImpact.s_distanceOutput.distance <= 0)
			{
				alpha = 1;
				break;
			}
			b2TimeOfImpact.s_fcn.Initialize(b2TimeOfImpact.s_cache, proxyA, b2TimeOfImpact.s_xfA, proxyB, b2TimeOfImpact.s_xfB);
			separation = b2TimeOfImpact.s_fcn.Evaluate(b2TimeOfImpact.s_xfA, b2TimeOfImpact.s_xfB);
			if (separation <= 0)
			{
				alpha = 1;
				break;
			}
			if (iter == 0)
			{
				if (separation > totalRadius)
				{
					target = b2Math.Max(totalRadius - tolerance, 0.75 * totalRadius);
				}
				else
				{
					target = b2Math.Max(separation - tolerance, 0.02 * totalRadius);
				}
			}
			if (separation - target < 0.5 * tolerance)
			{
				if (iter == 0)
				{
					alpha = 1;
				}
				break;
			}
			t1 = alpha;
			a1 = alpha;
			a2 = 1;
			s1 = separation;
			sweepA.GetTransform(b2TimeOfImpact.s_xfA, a2);
			sweepB.GetTransform(b2TimeOfImpact.s_xfB, a2);
			s2 = b2TimeOfImpact.s_fcn.Evaluate(b2TimeOfImpact.s_xfA, b2TimeOfImpact.s_xfB);
			if (s2 >= target)
			{
				alpha = 1;
				break;
			}
			rootIterCount = 0;
			do
			{
				if (rootIterCount & 1)
				{
					a = a1 + (target - s1) * (a2 - a1) / (s2 - s1);
				}
				else
				{
					a = 0.5 * (a1 + a2);
				}
				sweepA.GetTransform(b2TimeOfImpact.s_xfA, a);
				sweepB.GetTransform(b2TimeOfImpact.s_xfB, a);
				s = b2TimeOfImpact.s_fcn.Evaluate(b2TimeOfImpact.s_xfA, b2TimeOfImpact.s_xfB);
				if (b2Math.Abs(s - target) < 0.025 * tolerance)
				{
					t1 = a;
					break;
				}
				if (s > target)
				{
					a1 = a;
					s1 = s;
				}
				else
				{
					a2 = a;
					s2 = s;
				}
				rootIterCount++;
				++b2TimeOfImpact.b2_toiRootIters;
			}
			while (rootIterCount != 50);

			b2TimeOfImpact.b2_toiMaxRootIters = b2Math.Max(b2TimeOfImpact.b2_toiMaxRootIters, rootIterCount);
			if (t1 < (1 + 100 * Number.MIN_VALUE) * alpha)
			{
				break;
			}
			alpha = t1;
			iter++;
			++b2TimeOfImpact.b2_toiIters;
		}
		while (iter != k_maxIterations);

		b2TimeOfImpact.b2_toiMaxIters = b2Math.Max(b2TimeOfImpact.b2_toiMaxIters, iter);
		return alpha;
	}
}
