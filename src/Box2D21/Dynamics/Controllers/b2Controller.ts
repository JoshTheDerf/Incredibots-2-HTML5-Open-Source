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

import { b2Body, b2ControllerEdge, b2DebugDraw, b2TimeStep, b2World } from "../..";

export class b2Controller
{
	public m_next:b2Controller | null = null;

	public m_prev:b2Controller | null = null;

	protected m_bodyList:b2ControllerEdge | null = null;

	protected m_bodyCount:number = 0;

	public m_world!:b2World;

	constructor()
	{
	}

	public Step(step:b2TimeStep) : void
	{
	}

	public Draw(debugDraw:b2DebugDraw) : void
	{
	}

	public AddBody(body:b2Body) : void
	{
		var edge:b2ControllerEdge = new b2ControllerEdge();
		edge.controller = this;
		edge.body = body;
		edge.nextBody = this.m_bodyList;
		edge.prevBody = null;
		this.m_bodyList = edge;
		if(edge.nextBody)
		{
			edge.nextBody.prevBody = edge;
		}
		++this.m_bodyCount;
		edge.nextController = body.m_controllerList;
		edge.prevController = null;
		body.m_controllerList = edge;
		if(edge.nextController)
		{
			edge.nextController.prevController = edge;
		}
		++body.m_controllerCount;
	}

	public RemoveBody(body:b2Body) : void
	{
		var edge:b2ControllerEdge | null = body.m_controllerList;
		while(edge && edge.controller != this)
		{
			edge = edge.nextController;
		}
		if(edge!.prevBody)
		{
			edge!.prevBody.nextBody = edge!.nextBody;
		}
		if(edge!.nextBody)
		{
			edge!.nextBody.prevBody = edge!.prevBody;
		}
		if(edge!.nextController)
		{
			edge!.nextController.prevController = edge!.prevController;
		}
		if(edge!.prevController)
		{
			edge!.prevController.nextController = edge!.nextController;
		}
		if(this.m_bodyList == edge)
		{
			this.m_bodyList = edge!.nextBody;
		}
		if(body.m_controllerList == edge)
		{
			body.m_controllerList = edge!.nextController;
		}
		--body.m_controllerCount;
		--this.m_bodyCount;
	}

	public Clear() : void
	{
		while(this.m_bodyList)
		{
			this.RemoveBody(this.m_bodyList.body);
		}
	}

	public GetNext() : b2Controller | null
	{
		return this.m_next;
	}

	public GetWorld() : b2World
	{
		return this.m_world;
	}

	public GetBodyList() : b2ControllerEdge | null
	{
		return this.m_bodyList;
	}
}
