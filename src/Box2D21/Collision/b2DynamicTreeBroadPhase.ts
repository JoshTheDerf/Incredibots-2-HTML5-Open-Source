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

import { b2AABB, b2DynamicTree, b2DynamicTreeNode, b2DynamicTreePair, b2RayCastInput, b2Vec2, IBroadPhase } from "..";



export class b2DynamicTreeBroadPhase implements IBroadPhase
{

	private m_tree:b2DynamicTree = new b2DynamicTree();

	private m_proxyCount:number = 0;

	private m_moveBuffer:b2DynamicTreeNode[] = [];

	private m_pairBuffer:b2DynamicTreePair[] = [];

	private m_pairCount:number = 0;

	public CreateProxy(aabb:b2AABB, userData:any):any
	{
		var proxy:b2DynamicTreeNode = this.m_tree.CreateProxy(aabb, userData);
		++this.m_proxyCount;
		this.BufferMove(proxy);
		return proxy;
	}

	public DestroyProxy(proxy:any):void
	{
		this.UnBufferMove(proxy);
		--this.m_proxyCount;
		this.m_tree.DestroyProxy(proxy);
	}

	public MoveProxy(proxy:any, aabb:b2AABB, displacement:b2Vec2):void
	{
		var buffer:boolean = this.m_tree.MoveProxy(proxy, aabb, displacement);
		if (buffer)
		{
			this.BufferMove(proxy);
		}
	}

	public TestOverlap(proxyA:any, proxyB:any):boolean
	{
		var aabbA:b2AABB = this.m_tree.GetFatAABB(proxyA);
		var aabbB:b2AABB = this.m_tree.GetFatAABB(proxyB);
		return aabbA.TestOverlap(aabbB);
	}

	public GetUserData(proxy:any):any
	{
		return this.m_tree.GetUserData(proxy);
	}

	public GetFatAABB(proxy:any):b2AABB
	{
		return this.m_tree.GetFatAABB(proxy);
	}

	public GetProxyCount():number
	{
		return this.m_proxyCount;
	}

	public UpdatePairs(callback:Function):void
	{
		var i:number = 0;
		var fatAABB:b2AABB;
		var primaryPair:b2DynamicTreePair;
		var userDataA:any;
		var userDataB:any;
		var pair:b2DynamicTreePair;
		this.m_pairCount = 0;
		for (const queryProxy of this.m_moveBuffer)
		{
			const QueryCallback = (node:b2DynamicTreeNode):boolean =>
			{
				if (node == queryProxy)
				{
					return true;
				}
				if (this.m_pairCount == this.m_pairBuffer.length)
				{
					this.m_pairBuffer[this.m_pairCount] = new b2DynamicTreePair();
				}
				var newPair:b2DynamicTreePair = this.m_pairBuffer[this.m_pairCount];
				newPair.proxyA = (node as any) < (queryProxy as any) ? node : queryProxy;
				newPair.proxyB = (node as any) >= (queryProxy as any) ? node : queryProxy;
				++this.m_pairCount;
				return true;
			};
			fatAABB = this.m_tree.GetFatAABB(queryProxy);
			this.m_tree.Query(QueryCallback, fatAABB);
		}
		this.m_moveBuffer.length = 0;
		i = 0;
		while (i < this.m_pairCount)
		{
			primaryPair = this.m_pairBuffer[i];
			userDataA = this.m_tree.GetUserData(primaryPair.proxyA);
			userDataB = this.m_tree.GetUserData(primaryPair.proxyB);
			callback(userDataA, userDataB);
			i++;
			while (i < this.m_pairCount)
			{
				pair = this.m_pairBuffer[i];
				if (pair.proxyA != primaryPair.proxyA || pair.proxyB != primaryPair.proxyB)
				{
					break;
				}
				i++;
			}
		}
	}

	public Query(callback:Function, aabb:b2AABB):void
	{
		this.m_tree.Query(callback, aabb);
	}

	public RayCast(callback:Function, input:b2RayCastInput):void
	{
		this.m_tree.RayCast(callback, input);
	}

	public Validate():void
	{
	}

	public Rebalance(iterations:number):void
	{
		this.m_tree.Rebalance(iterations);
	}

	private BufferMove(proxy:b2DynamicTreeNode):void
	{
		this.m_moveBuffer[this.m_moveBuffer.length] = proxy;
	}

	private UnBufferMove(proxy:b2DynamicTreeNode):void
	{
		var index:number = this.m_moveBuffer.indexOf(proxy);
		this.m_moveBuffer.splice(index, 1);
	}

	private ComparePairs(pair1:b2DynamicTreePair, pair2:b2DynamicTreePair):number
	{
		return 0;
	}
}
