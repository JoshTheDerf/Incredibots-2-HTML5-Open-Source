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

import { b2AABB, b2DynamicTreeNode, b2Math, b2RayCastInput, b2Settings, b2Vec2 } from "..";



export class b2DynamicTree
{

	private m_root:b2DynamicTreeNode | null;

	private m_freeList:b2DynamicTreeNode | null;

	private m_path:number;

	private m_insertionCount:number;

	constructor()
	{
		this.m_root = null;
		this.m_freeList = null;
		this.m_path = 0;
		this.m_insertionCount = 0;
	}

	public CreateProxy(aabb:b2AABB, userData:any):b2DynamicTreeNode
	{
		var node:b2DynamicTreeNode = this.AllocateNode();
		var extendX:number = b2Settings.b2_aabbExtension;
		var extendY:number = b2Settings.b2_aabbExtension;
		node.aabb.lowerBound.x = aabb.lowerBound.x - extendX;
		node.aabb.lowerBound.y = aabb.lowerBound.y - extendY;
		node.aabb.upperBound.x = aabb.upperBound.x + extendX;
		node.aabb.upperBound.y = aabb.upperBound.y + extendY;
		node.userData = userData;
		this.InsertLeaf(node);
		return node;
	}

	public DestroyProxy(proxy:b2DynamicTreeNode):void
	{
		this.RemoveLeaf(proxy);
		this.FreeNode(proxy);
	}

	public MoveProxy(proxy:b2DynamicTreeNode, aabb:b2AABB, displacement:b2Vec2):boolean
	{
		var extendX:number;
		var extendY:number;
		b2Settings.b2Assert(proxy.IsLeaf());
		if (proxy.aabb.Contains(aabb))
		{
			return false;
		}
		this.RemoveLeaf(proxy);
		extendX = b2Settings.b2_aabbExtension + b2Settings.b2_aabbMultiplier * (displacement.x > 0 ? displacement.x : -displacement.x);
		extendY = b2Settings.b2_aabbExtension + b2Settings.b2_aabbMultiplier * (displacement.y > 0 ? displacement.y : -displacement.y);
		proxy.aabb.lowerBound.x = aabb.lowerBound.x - extendX;
		proxy.aabb.lowerBound.y = aabb.lowerBound.y - extendY;
		proxy.aabb.upperBound.x = aabb.upperBound.x + extendX;
		proxy.aabb.upperBound.y = aabb.upperBound.y + extendY;
		this.InsertLeaf(proxy);
		return true;
	}

	public Rebalance(iterations:number):void
	{
		var node:b2DynamicTreeNode;
		var bit:number;
		if (this.m_root == null)
		{
			return;
		}
		var i:number = 0;
		while (i < iterations)
		{
			node = this.m_root;
			bit = 0;
			while (node.IsLeaf() == false)
			{
				node = (this.m_path >> bit) & 1 ? node.child2! : node.child1!;
				bit = (bit + 1) & 0x1F;
			}
			++this.m_path;
			this.RemoveLeaf(node);
			this.InsertLeaf(node);
			i++;
		}
	}

	public GetFatAABB(proxy:b2DynamicTreeNode):b2AABB
	{
		return proxy.aabb;
	}

	public GetUserData(proxy:b2DynamicTreeNode):any
	{
		return proxy.userData;
	}

	public Query(callback:Function, aabb:b2AABB):void
	{
		var node:b2DynamicTreeNode;
		var proceed:boolean;
		if (this.m_root == null)
		{
			return;
		}
		var stack:b2DynamicTreeNode[] = [];
		var count:number = 0;
		stack[count++] = this.m_root;
		while (count > 0)
		{
			node = stack[--count];
			if (node.aabb.TestOverlap(aabb))
			{
				if (node.IsLeaf())
				{
					proceed = callback(node);
					if (!proceed)
					{
						return;
					}
				}
				else
				{
					stack[count++] = node.child1!;
					stack[count++] = node.child2!;
				}
			}
		}
	}

	public RayCast(callback:Function, input:b2RayCastInput):void
	{
		var subInput:b2RayCastInput;
		var node:b2DynamicTreeNode;
		var c:b2Vec2;
		var h:b2Vec2;
		var separation:number;
		if (this.m_root == null)
		{
			return;
		}
		var p1:b2Vec2 = input.p1;
		var p2:b2Vec2 = input.p2;
		var r:b2Vec2 = b2Math.SubtractVV(p1, p2);
		r.Normalize();
		var v:b2Vec2 = b2Math.CrossFV(1, r);
		var abs_v:b2Vec2 = b2Math.AbsV(v);
		var maxFraction:number = input.maxFraction;
		var segmentAABB:b2AABB = new b2AABB();
		var tX:number = p1.x + maxFraction * (p2.x - p1.x);
		var tY:number = p1.y + maxFraction * (p2.y - p1.y);
		segmentAABB.lowerBound.x = Math.min(p1.x, tX);
		segmentAABB.lowerBound.y = Math.min(p1.y, tY);
		segmentAABB.upperBound.x = Math.max(p1.x, tX);
		segmentAABB.upperBound.y = Math.max(p1.y, tY);
		var stack:b2DynamicTreeNode[] = [];
		var count:number = 0;
		stack[count++] = this.m_root;
		while (count > 0)
		{
			node = stack[--count];
			if (node.aabb.TestOverlap(segmentAABB) != false)
			{
				c = node.aabb.GetCenter();
				h = node.aabb.GetExtents();
				separation = Math.abs(v.x * (p1.x - c.x) + v.y * (p1.y - c.y)) - abs_v.x * h.x - abs_v.y * h.y;
				if (separation <= 0)
				{
					if (node.IsLeaf())
					{
						subInput = new b2RayCastInput();
						subInput.p1 = input.p1;
						subInput.p2 = input.p2;
						subInput.maxFraction = input.maxFraction;
						maxFraction = callback(subInput, node);
						if (maxFraction == 0)
						{
							return;
						}
						tX = p1.x + maxFraction * (p2.x - p1.x);
						tY = p1.y + maxFraction * (p2.y - p1.y);
						segmentAABB.lowerBound.x = Math.min(p1.x, tX);
						segmentAABB.lowerBound.y = Math.min(p1.y, tY);
						segmentAABB.upperBound.x = Math.max(p1.x, tX);
						segmentAABB.upperBound.y = Math.max(p1.y, tY);
					}
					else
					{
						stack[count++] = node.child1!;
						stack[count++] = node.child2!;
					}
				}
			}
		}
	}

	private AllocateNode():b2DynamicTreeNode
	{
		var node:b2DynamicTreeNode;
		if (this.m_freeList)
		{
			node = this.m_freeList;
			this.m_freeList = node.parent;
			node.parent = null;
			node.child1 = null;
			node.child2 = null;
			return node;
		}
		return new b2DynamicTreeNode();
	}

	private FreeNode(node:b2DynamicTreeNode):void
	{
		node.parent = this.m_freeList;
		this.m_freeList = node;
	}

	private InsertLeaf(leaf:b2DynamicTreeNode):void
	{
		var child1:b2DynamicTreeNode;
		var child2:b2DynamicTreeNode;
		var norm1:number;
		var norm2:number;
		++this.m_insertionCount;
		if (this.m_root == null)
		{
			this.m_root = leaf;
			this.m_root.parent = null;
			return;
		}
		var center:b2Vec2 = leaf.aabb.GetCenter();
		var sibling:b2DynamicTreeNode = this.m_root;
		if (sibling.IsLeaf() == false)
		{
			do
			{
				child1 = sibling.child1!;
				child2 = sibling.child2!;
				norm1 = Math.abs((child1.aabb.lowerBound.x + child1.aabb.upperBound.x) / 2 - center.x) + Math.abs((child1.aabb.lowerBound.y + child1.aabb.upperBound.y) / 2 - center.y);
				norm2 = Math.abs((child2.aabb.lowerBound.x + child2.aabb.upperBound.x) / 2 - center.x) + Math.abs((child2.aabb.lowerBound.y + child2.aabb.upperBound.y) / 2 - center.y);
				if (norm1 < norm2)
				{
					sibling = child1;
				}
				else
				{
					sibling = child2;
				}
			}
			while (sibling.IsLeaf() == false);

		}
		var parent:b2DynamicTreeNode | null = sibling.parent;
		var node2:b2DynamicTreeNode = this.AllocateNode();
		node2.parent = parent;
		node2.userData = null;
		node2.aabb.Combine(leaf.aabb, sibling.aabb);
		if (parent)
		{
			if (sibling.parent!.child1 == sibling)
			{
				parent.child1 = node2;
			}
			else
			{
				parent.child2 = node2;
			}
			node2.child1 = sibling;
			node2.child2 = leaf;
			sibling.parent = node2;
			leaf.parent = node2;
			while (!parent!.aabb.Contains(node2.aabb))
			{
				parent!.aabb.Combine(parent!.child1!.aabb, parent!.child2!.aabb);
				node2 = parent!;
				parent = parent!.parent;
				if (!parent)
				{
					break;
				}
			}
		}
		else
		{
			node2.child1 = sibling;
			node2.child2 = leaf;
			sibling.parent = node2;
			leaf.parent = node2;
			this.m_root = node2;
		}
	}

	private RemoveLeaf(leaf:b2DynamicTreeNode):void
	{
		var sibling:b2DynamicTreeNode;
		var oldAABB:b2AABB;
		if (leaf == this.m_root)
		{
			this.m_root = null;
			return;
		}
		var parent:b2DynamicTreeNode = leaf.parent!;
		var grandParent:b2DynamicTreeNode | null = parent.parent;
		if (parent.child1 == leaf)
		{
			sibling = parent.child2!;
		}
		else
		{
			sibling = parent.child1!;
		}
		if (grandParent)
		{
			if (grandParent.child1 == parent)
			{
				grandParent.child1 = sibling;
			}
			else
			{
				grandParent.child2 = sibling;
			}
			sibling.parent = grandParent;
			this.FreeNode(parent);
			while (grandParent)
			{
				oldAABB = grandParent.aabb;
				grandParent.aabb = b2AABB.Combine(grandParent.child1!.aabb, grandParent.child2!.aabb);
				if (oldAABB.Contains(grandParent.aabb))
				{
					break;
				}
				grandParent = grandParent.parent;
			}
		}
		else
		{
			this.m_root = sibling;
			sibling.parent = null;
			this.FreeNode(parent);
		}
	}
}
