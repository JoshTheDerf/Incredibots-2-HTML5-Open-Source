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

import { b2DistanceInput, b2DistanceOutput, b2DistanceProxy, b2Math, b2Settings, b2Simplex, b2SimplexCache, b2SimplexVertex, b2Transform, b2Vec2 } from "..";



export class b2Distance
{

	private static b2_gjkCalls:number = 0;

	private static b2_gjkIters:number = 0;

	private static b2_gjkMaxIters:number = 0;

	private static s_simplex:b2Simplex = new b2Simplex();

	private static s_saveA:number[] = new Array<number>(3).fill(0);

	private static s_saveB:number[] = new Array<number>(3).fill(0);

	public static Distance(output:b2DistanceOutput, cache:b2SimplexCache, input:b2DistanceInput):void
	{
		var i:number = 0;
		var p:b2Vec2;
		var d:b2Vec2;
		var vertex:b2SimplexVertex;
		var duplicate:boolean = false;
		var rA:number;
		var rB:number;
		var normal:b2Vec2;
		++b2Distance.b2_gjkCalls;
		var proxyA:b2DistanceProxy = input.proxyA;
		var proxyB:b2DistanceProxy = input.proxyB;
		var transformA:b2Transform = input.transformA;
		var transformB:b2Transform = input.transformB;
		var simplex:b2Simplex = b2Distance.s_simplex;
		simplex.ReadCache(cache, proxyA, transformA, proxyB, transformB);
		var vertices:b2SimplexVertex[] = simplex.m_vertices;
		var k_maxIters:number = 20;
		var saveA:number[] = b2Distance.s_saveA;
		var saveB:number[] = b2Distance.s_saveB;
		var saveCount:number = 0;
		var closestPoint:b2Vec2 = simplex.GetClosestPoint();
		var distanceSqr1:number;
		var distanceSqr2:number = distanceSqr1 = closestPoint.LengthSquared();
		var iter:number = 0;
		while (iter < k_maxIters)
		{
			saveCount = simplex.m_count;
			i = 0;
			while (i < saveCount)
			{
				saveA[i] = vertices[i].indexA;
				saveB[i] = vertices[i].indexB;
				i++;
			}
			switch (simplex.m_count)
			{
				case 1:
					break;
				case 2:
					simplex.Solve2();
					break;
				case 3:
					simplex.Solve3();
					break;
				default:
					b2Settings.b2Assert(false);
			}
			if (simplex.m_count == 3)
			{
				break;
			}
			p = simplex.GetClosestPoint();
			distanceSqr2 = p.LengthSquared();
			if (distanceSqr2 > distanceSqr1)
			{
			}
			distanceSqr1 = distanceSqr2;
			d = simplex.GetSearchDirection();
			if (d.LengthSquared() < Number.MIN_VALUE * Number.MIN_VALUE)
			{
				break;
			}
			vertex = vertices[simplex.m_count];
			vertex.indexA = proxyA.GetSupport(b2Math.MulTMV(transformA.R, d.GetNegative()));
			vertex.wA = b2Math.MulX(transformA, proxyA.GetVertex(vertex.indexA));
			vertex.indexB = proxyB.GetSupport(b2Math.MulTMV(transformB.R, d));
			vertex.wB = b2Math.MulX(transformB, proxyB.GetVertex(vertex.indexB));
			vertex.w = b2Math.SubtractVV(vertex.wB, vertex.wA);
			iter++;
			++b2Distance.b2_gjkIters;
			duplicate = false;
			i = 0;
			while (i < saveCount)
			{
				if (vertex.indexA == saveA[i] && vertex.indexB == saveB[i])
				{
					duplicate = true;
					break;
				}
				i++;
			}
			if (duplicate)
			{
				break;
			}
			++simplex.m_count;
		}
		b2Distance.b2_gjkMaxIters = b2Math.Max(b2Distance.b2_gjkMaxIters, iter);
		simplex.GetWitnessPoints(output.pointA, output.pointB);
		output.distance = b2Math.SubtractVV(output.pointA, output.pointB).Length();
		output.iterations = iter;
		simplex.WriteCache(cache);
		if (input.useRadii)
		{
			rA = proxyA.m_radius;
			rB = proxyB.m_radius;
			if (output.distance > rA + rB && output.distance > Number.MIN_VALUE)
			{
				output.distance -= rA + rB;
				normal = b2Math.SubtractVV(output.pointB, output.pointA);
				normal.Normalize();
				output.pointA.x += rA * normal.x;
				output.pointA.y += rA * normal.y;
				output.pointB.x -= rB * normal.x;
				output.pointB.y -= rB * normal.y;
			}
			else
			{
				p = new b2Vec2();
				p.x = 0.5 * (output.pointA.x + output.pointB.x);
				p.y = 0.5 * (output.pointA.y + output.pointB.y);
				output.pointA.x = output.pointB.x = p.x;
				output.pointA.y = output.pointB.y = p.y;
				output.distance = 0;
			}
		}
	}
}
