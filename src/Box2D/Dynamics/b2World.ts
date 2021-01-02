﻿/*
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

import { b2AABB, b2Vec2, b2ContactFilter, b2BroadPhase, b2BodyDef, b2Distance, b2DestructionListener, b2BoundaryListener, b2ContactListener, b2DebugDraw, b2Body, b2JointEdge, b2Shape, b2JointDef, b2Joint, b2ShapeDef, b2StaticEdgeChain, b2TimeStep, b2Island, b2Contact, b2ContactEdge, b2Settings, b2TimeOfImpact, b2Color, b2XForm, b2PulleyJoint, b2CircleShape, b2Math, b2PolygonShape, b2ConcaveArcShape, b2StaticEdgeShape, b2Pair, b2Proxy, b2OBB, b2Mat22, b2ContactManager } from "..";


export class b2World
{

	// Construct a world object.
	/// @param worldAABB a bounding box that completely encompasses all your shapes.
	/// @param gravity the world gravity vector.
	/// @param doSleep improve performance by not simulating inactive bodies.
	constructor(worldAABB:b2AABB, gravity:b2Vec2, doSleep:boolean){

		this.m_destructionListener = null;
		this.m_boundaryListener = null;
		this.m_contactFilter = b2ContactFilter.b2_defaultFilter;
		this.m_contactListener = null;
		this.m_debugDraw = null;

		this.m_bodyList = null;
		this.m_contactList = null;
		this.m_jointList = null;

		this.m_bodyCount = 0;
		this.m_contactCount = 0;
		this.m_jointCount = 0;

		b2World.m_positionCorrection = true;
		b2World.m_warmStarting = true;
		b2World.m_continuousPhysics = true;

		this.m_allowSleep = doSleep;
		this.m_gravity = gravity;

		this.m_lock = false;

		this.m_inv_dt0 = 0.0;

		this.m_contactManager.m_world = this;
		//void* mem = b2Alloc(sizeof(b2BroadPhase));
		this.m_broadPhase = new b2BroadPhase(worldAABB, this.m_contactManager);

		var bd:b2BodyDef = new b2BodyDef();
		this.m_groundBody = this.CreateBody(bd);

		b2Distance.InitializeRegisters();
	}

	/// Destruct the world. All physics entities are destroyed and all heap memory is released.
	//~b2World();

	/// Register a destruction listener.
	public SetDestructionListener(listener:b2DestructionListener) : void{
		this.m_destructionListener = listener;
	}

	/// Register a broad-phase boundary listener.
	public SetBoundaryListener(listener:b2BoundaryListener) : void{
		this.m_boundaryListener = listener;
	}

	/// Register a contact filter to provide specific control over collision.
	/// Otherwise the default filter is used (b2_defaultFilter).
	public SetContactFilter(filter:b2ContactFilter) : void{
		this.m_contactFilter = filter;
	}

	/// Register a contact event listener
	public SetContactListener(listener:b2ContactListener) : void{
		this.m_contactListener = listener;
	}

	/// Register a routine for debug drawing. The debug draw functions are called
	/// inside the b2World::Step method, so make sure your renderer is ready to
	/// consume draw commands when you call Step().
	public SetDebugDraw(debugDraw:b2DebugDraw) : void{
		this.m_debugDraw = debugDraw;
	}

	/// Perform validation of internal data structures.
	public Validate() : void
	{
		this.m_broadPhase.Validate();
	}

	/// Get the number of broad-phase proxies.
	public GetProxyCount() :number
	{
		return this.m_broadPhase.m_proxyCount;
	}

	/// Get the number of broad-phase pairs.
	public GetPairCount() :number
	{
		return this.m_broadPhase.m_pairManager.m_pairCount;
	}

	/// Create a rigid body given a definition. No reference to the definition
	/// is retained.
	/// @warning This function is locked during callbacks.
	public CreateBody(def:b2BodyDef) : b2Body{

		//b2Settings.b2Assert(m_lock == false);
		if (this.m_lock == true)
		{
			return null;
		}

		//void* mem = m_blockAllocator.Allocate(sizeof(b2Body));
		var b:b2Body = new b2Body(def, this);

		// Add to world doubly linked list.
		b.m_prev = null;
		b.m_next = this.m_bodyList;
		if (this.m_bodyList)
		{
			this.m_bodyList.m_prev = b;
		}
		this.m_bodyList = b;
		++this.m_bodyCount;

		return b;

	}

	/// Destroy a rigid body given a definition. No reference to the definition
	/// is retained. This function is locked during callbacks.
	/// @warning This automatically deletes all associated shapes and joints.
	/// @warning This function is locked during callbacks.
	public DestroyBody(b:b2Body) : void{

		//b2Settings.b2Assert(m_bodyCount > 0);
		//b2Settings.b2Assert(m_lock == false);
		if (this.m_lock == true)
		{
			return;
		}

		// Delete the attached joints.
		var jn:b2JointEdge = b.m_jointList;
		while (jn)
		{
			var jn0:b2JointEdge = jn;
			jn = jn.next;

			if (this.m_destructionListener)
			{
				this.m_destructionListener.SayGoodbyeJoint(jn0.joint);
			}

			this.DestroyJoint(jn0.joint);
		}

		// Delete the attached shapes. This destroys broad-phase
		// proxies and pairs, leading to the destruction of contacts.
		var s:b2Shape = b.m_shapeList;
		while (s)
		{
			var s0:b2Shape = s;
			s = s.m_next;

			if (this.m_destructionListener)
			{
				this.m_destructionListener.SayGoodbyeShape(s0);
			}

			s0.DestroyProxy(this.m_broadPhase);
			b2Shape.Destroy(s0, this.m_blockAllocator);
		}

		// Remove world body list.
		if (b.m_prev)
		{
			b.m_prev.m_next = b.m_next;
		}

		if (b.m_next)
		{
			b.m_next.m_prev = b.m_prev;
		}

		if (b == this.m_bodyList)
		{
			this.m_bodyList = b.m_next;
		}

		--this.m_bodyCount;
		//b->~b2Body();
		//m_blockAllocator.Free(b, sizeof(b2Body));

	}

	/// Create a joint to constrain bodies together. No reference to the definition
	/// is retained. This may cause the connected bodies to cease colliding.
	/// @warning This function is locked during callbacks.
	public CreateJoint(def:b2JointDef) : b2Joint{

		//b2Settings.b2Assert(m_lock == false);

		var j:b2Joint = b2Joint.Create(def, this.m_blockAllocator);

		// Connect to the world list.
		j.m_prev = null;
		j.m_next = this.m_jointList;
		if (this.m_jointList)
		{
			this.m_jointList.m_prev = j;
		}
		this.m_jointList = j;
		++this.m_jointCount;

		// Connect to the bodies' doubly linked lists.
		j.m_node1.joint = j;
		j.m_node1.other = j.m_body2;
		j.m_node1.prev = null;
		j.m_node1.next = j.m_body1.m_jointList;
		if (j.m_body1.m_jointList) j.m_body1.m_jointList.prev = j.m_node1;
		j.m_body1.m_jointList = j.m_node1;

		j.m_node2.joint = j;
		j.m_node2.other = j.m_body1;
		j.m_node2.prev = null;
		j.m_node2.next = j.m_body2.m_jointList;
		if (j.m_body2.m_jointList) j.m_body2.m_jointList.prev = j.m_node2;
		j.m_body2.m_jointList = j.m_node2;

		// If the joint prevents collisions, then reset collision filtering.
		if (def.collideConnected == false)
		{
			// Reset the proxies on the body with the minimum number of shapes.
			var b:b2Body = def.body1.m_shapeCount < def.body2.m_shapeCount ? def.body1 : def.body2;
			for (var s:b2Shape = b.m_shapeList; s; s = s.m_next)
			{
				s.RefilterProxy(this.m_broadPhase, b.m_xf);
			}
		}

		return j;

	}

	/// Destroy a joint. This may cause the connected bodies to begin colliding.
	/// @warning This function is locked during callbacks.
	public DestroyJoint(j:b2Joint) : void{

		//b2Settings.b2Assert(m_lock == false);

		var collideConnected:boolean = j.m_collideConnected;

		// Remove from the doubly linked list.
		if (j.m_prev)
		{
			j.m_prev.m_next = j.m_next;
		}

		if (j.m_next)
		{
			j.m_next.m_prev = j.m_prev;
		}

		if (j == this.m_jointList)
		{
			this.m_jointList = j.m_next;
		}

		// Disconnect from island graph.
		var body1:b2Body = j.m_body1;
		var body2:b2Body = j.m_body2;

		// Wake up connected bodies.
		body1.WakeUp();
		body2.WakeUp();

		// Remove from body 1.
		if (j.m_node1.prev)
		{
			j.m_node1.prev.next = j.m_node1.next;
		}

		if (j.m_node1.next)
		{
			j.m_node1.next.prev = j.m_node1.prev;
		}

		if (j.m_node1 == body1.m_jointList)
		{
			body1.m_jointList = j.m_node1.next;
		}

		j.m_node1.prev = null;
		j.m_node1.next = null;

		// Remove from body 2
		if (j.m_node2.prev)
		{
			j.m_node2.prev.next = j.m_node2.next;
		}

		if (j.m_node2.next)
		{
			j.m_node2.next.prev = j.m_node2.prev;
		}

		if (j.m_node2 == body2.m_jointList)
		{
			body2.m_jointList = j.m_node2.next;
		}

		j.m_node2.prev = null;
		j.m_node2.next = null;

		b2Joint.Destroy(j, this.m_blockAllocator);

		//b2Settings.b2Assert(m_jointCount > 0);
		--this.m_jointCount;

		// If the joint prevents collisions, then reset collision filtering.
		if (collideConnected == false)
		{
			// Reset the proxies on the body with the minimum number of shapes.
			var b:b2Body = body1.m_shapeCount < body2.m_shapeCount ? body1 : body2;
			for (var s:b2Shape = b.m_shapeList; s; s = s.m_next)
			{
				s.RefilterProxy(this.m_broadPhase, b.m_xf);
			}
		}

	}

	public CreateGroundShape(def:b2ShapeDef) : * {
		//b2Settings.b2Assert(m_lock == false);
		if (this.m_lock == true)
		{
			return null;
		}

		switch (def.type)
		{
		case b2Shape.e_staticEdgeShape:
			return new b2StaticEdgeChain(def, this);

		default:
			return this.m_groundBody.CreateShape(def);
		}
	}

	/// Re-filter a shape. This re-runs contact filtering on a shape.
	public Refilter(shape:b2Shape) : void
	{
		shape.RefilterProxy(this.m_broadPhase, shape.m_body.m_xf);
	}

	/// Enable/disable warm starting. For testing.
	public SetWarmStarting(flag:boolean) : void { b2World.m_warmStarting = flag; }

	/// Enable/disable position correction. For testing.
	public SetPositionCorrection(flag:boolean) : void { b2World.m_positionCorrection = flag; }

	/// Enable/disable continuous physics. For testing.
	public SetContinuousPhysics(flag:boolean) : void { b2World.m_continuousPhysics = flag; }

	/// Get the number of bodies.
	public GetBodyCount() :number
	{
		return this.m_bodyCount;
	}

	/// Get the number joints.
	public GetJointCount() :number
	{
		return this.m_jointCount;
	}

	/// Get the number of contacts (each may have 0 or more contact points).
	public GetContactCount() :number
	{
		return this.m_contactCount;
	}

	/// Change the global gravity vector.
	public SetGravity(gravity: b2Vec2): void
	{
		this.m_gravity = gravity;
	}

	/// The world provides a single static ground body with no collision shapes.
	/// You can use this to simplify the creation of joints and static shapes.
	public GetGroundBody() : b2Body{
		return this.m_groundBody;
	}

	/// Take a time step. This performs collision detection, integration,
	/// and constraint solution.
	/// @param timeStep the amount of time to simulate, this should not vary.
	/// @param iterations the number of iterations to be used by the constraint solver.
	public Step(dt:number, iterations:number) : void{
		this.m_lock = true;

		var step:b2TimeStep = new b2TimeStep();
		step.dt = dt;
		step.maxIterations	= iterations;
		if (dt > 0.0)
		{
			step.inv_dt = 1.0 / dt;
		}
		else
		{
			step.inv_dt = 0.0;
		}

		step.dtRatio = this.m_inv_dt0 * dt;

		step.positionCorrection = b2World.m_positionCorrection;
		step.warmStarting = b2World.m_warmStarting;

		// Update contacts.
		this.m_contactManager.Collide();

		// Integrate velocities, solve velocity constraints, and integrate positions.
		if (step.dt > 0.0)
		{
			this.Solve(step);
		}

		// Handle TOI events.
		if (b2World.m_continuousPhysics && step.dt > 0.0)
		{
			this.SolveTOI(step);
		}

		// Draw debug information.
		this.DrawDebugData();

		this.m_inv_dt0 = step.inv_dt;
		this.m_lock = false;
	}

	/// Query the world for all shapes that potentially overlap the
	/// provided AABB. You provide a shape pointer buffer of specified
	/// size. The number of shapes found is returned.
	/// @param aabb the query box.
	/// @param shapes a user allocated shape pointer array of size maxCount (or greater).
	/// @param maxCount the capacity of the shapes array.
	/// @return the number of shapes found in aabb.
	public Query(aabb:b2AABB, shapes:Array<any>, maxCount:number) :number{

		//void** results = (void**)m_stackAllocator.Allocate(maxCount * sizeof(void*));
		var results:Array<any>= new Array(maxCount);

		var count:number = this.m_broadPhase.QueryAABB(aabb, results, maxCount);

		for (var i:number = 0; i < count; ++i)
		{
			shapes[i] = results[i];
		}

		//m_stackAllocator.Free(results);
		return count;

	}

	/// Get the world body list. With the returned body, use b2Body::GetNext to get
	/// the next body in the world list. A NULL body indicates the end of the list.
	/// @return the head of the world body list.
	public GetBodyList() : b2Body{
		return this.m_bodyList;
	}

	/// Get the world joint list. With the returned joint, use b2Joint::GetNext to get
	/// the next joint in the world list. A NULL joint indicates the end of the list.
	/// @return the head of the world joint list.
	public GetJointList() : b2Joint{
		return this.m_jointList;
	}


	//--------------- Internals Below -------------------
	// Internal yet public to make life easier.

	// Find islands, integrate and solve constraints, solve position constraints
	public Solve(step:b2TimeStep) : void{

		var b:b2Body;

		this.m_positionIterationCount = 0;

		// Size the island for the worst case.
		var island:b2Island = new b2Island(this.m_bodyCount, this.m_contactCount, this.m_jointCount, this.m_stackAllocator, this.m_contactListener);

		// Clear all the island flags.
		for (b = this.m_bodyList; b; b = b.m_next)
		{
			b.m_flags &= ~b2Body.e_islandFlag;
		}
		for (var c:b2Contact = this.m_contactList; c; c = c.m_next)
		{
			c.m_flags &= ~b2Contact.e_islandFlag;
		}
		for (var j:b2Joint = this.m_jointList; j; j = j.m_next)
		{
			j.m_islandFlag = false;
		}

		// Build and simulate all awake islands.
		var stackSize:number = this.m_bodyCount;
		//b2Body** stack = (b2Body**)m_stackAllocator.Allocate(stackSize * sizeof(b2Body*));
		var stack:Array<any>= new Array(stackSize);
		for (var seed:b2Body = this.m_bodyList; seed; seed = seed.m_next)
		{
			if (seed.m_flags & (b2Body.e_islandFlag | b2Body.e_sleepFlag | b2Body.e_frozenFlag))
			{
				continue;
			}

			if (seed.IsStatic())
			{
				continue;
			}

			// Reset island and stack.
			island.Clear();
			var stackCount:number = 0;
			stack[stackCount++] = seed;
			seed.m_flags |= b2Body.e_islandFlag;

			// Perform a depth first search (DFS) on the constraint graph.
			while (stackCount > 0)
			{
				// Grab the next body off the stack and add it to the island.
				b = stack[--stackCount];
				island.AddBody(b);

				// Make sure the body is awake.
				b.m_flags &= ~b2Body.e_sleepFlag;

				// To keep islands as small as possible, we don't
				// propagate islands across static bodies.
				if (b.IsStatic())
				{
					continue;
				}

				var other:b2Body;
				// Search all contacts connected to this body.
				for (var cn:b2ContactEdge = b.m_contactList; cn; cn = cn.next)
				{
					// Has this contact already been added to an island?
					if (cn.contact.m_flags & (b2Contact.e_islandFlag | b2Contact.e_nonSolidFlag))
					{
						continue;
					}

					// Is this contact touching?
					if (cn.contact.m_manifoldCount == 0)
					{
						continue;
					}

					island.AddContact(cn.contact);
					cn.contact.m_flags |= b2Contact.e_islandFlag;

					//var other:b2Body = cn.other;
					other = cn.other;

					// Was the other body already added to this island?
					if (other.m_flags & b2Body.e_islandFlag)
					{
						continue;
					}

					//b2Settings.b2Assert(stackCount < stackSize);
					stack[stackCount++] = other;
					other.m_flags |= b2Body.e_islandFlag;
				}

				// Search all joints connect to this body.
				for (var jn:b2JointEdge = b.m_jointList; jn; jn = jn.next)
				{
					if (jn.joint.m_islandFlag == true)
					{
						continue;
					}

					island.AddJoint(jn.joint);
					jn.joint.m_islandFlag = true;

					//var other:b2Body = jn.other;
					other = jn.other;
					if (other.m_flags & b2Body.e_islandFlag)
					{
						continue;
					}

					//b2Settings.b2Assert(stackCount < stackSize);
					stack[stackCount++] = other;
					other.m_flags |= b2Body.e_islandFlag;
				}
			}

			island.Solve(step, this.m_gravity, b2World.m_positionCorrection, this.m_allowSleep);
			//m_positionIterationCount = Math.max(m_positionIterationCount, island.m_positionIterationCount);
			if (island.m_positionIterationCount > this.m_positionIterationCount) {
				this.m_positionIterationCount = island.m_positionIterationCount;
			}

			// Post solve cleanup.
			var bodyCount:number = island.m_bodyCount;
			for (var i:number = 0; i < bodyCount; ++i)
			{
				// Allow static bodies to participate in other islands.
				b = island.m_bodies[i];
				if (b.IsStatic())
				{
					b.m_flags &= ~b2Body.e_islandFlag;
				}
			}
		}

		//m_stackAllocator.Free(stack);

		// Synchronize shapes, check for out of range bodies.
		for (b = this.m_bodyList; b; b = b.m_next)
		{
			if (b.m_flags & (b2Body.e_sleepFlag | b2Body.e_frozenFlag))
			{
				continue;
			}

			if (b.IsStatic())
			{
				continue;
			}

			// Update shapes (for broad-phase). If the shapes go out of
			// the world AABB then shapes and contacts may be destroyed,
			// including contacts that are
			var inRange:boolean = b.SynchronizeShapes();

			// Did the body's shapes leave the world?
			if (inRange == false && this.m_boundaryListener != null)
			{
				this.m_boundaryListener.Violation(b);
			}
		}

		// Commit shape proxy movements to the broad-phase so that new contacts are created.
		// Also, some contacts can be destroyed.
		this.m_broadPhase.Commit();

	}

	// Find TOI contacts and solve them.
	public SolveTOI(step:b2TimeStep) : void{

		var b:b2Body;
		var s1:b2Shape;
		var s2:b2Shape;
		var b1:b2Body;
		var b2:b2Body;
		var cn:b2ContactEdge;

		// Reserve an island and a stack for TOI island solution.
		var island:b2Island = new b2Island(this.m_bodyCount, b2Settings.b2_maxTOIContactsPerIsland, 0, this.m_stackAllocator, this.m_contactListener);
		var stackSize:number = this.m_bodyCount;

		//b2Body** stack = (b2Body**)m_stackAllocator.Allocate(stackSize * sizeof(b2Body*));
		var stack:Array<any>= new Array(stackSize);

		for (b = this.m_bodyList; b; b = b.m_next)
		{
			b.m_flags &= ~b2Body.e_islandFlag;
			b.m_sweep.t0 = 0.0;
		}

		var c:b2Contact;
		for (c = this.m_contactList; c; c = c.m_next)
		{
			// Invalidate TOI
			c.m_flags &= ~(b2Contact.e_toiFlag | b2Contact.e_islandFlag);
		}

		// Find TOI events and solve them.
		for (;;)
		{
			// Find the first TOI.
			var minContact:b2Contact = null;
			var minTOI:number = 1.0;

			for (c = this.m_contactList; c; c = c.m_next)
			{
				if (c.m_flags & (b2Contact.e_slowFlag | b2Contact.e_nonSolidFlag))
				{
					continue;
				}

				// TODO_ERIN keep a counter on the contact, only respond to M TOIs per contact.

				var toi:number = 1.0;
				if (c.m_flags & b2Contact.e_toiFlag)
				{
					// This contact has a valid cached TOI.
					toi = c.m_toi;
				}
				else
				{
					// Compute the TOI for this contact.
					s1 = c.m_shape1;
					s2 = c.m_shape2;
					b1 = s1.m_body;
					b2 = s2.m_body;

					if ((b1.IsStatic() || b1.IsSleeping()) && (b2.IsStatic() || b2.IsSleeping()))
					{
						continue;
					}

					// Put the sweeps onto the same time interval.
					var t0:number = b1.m_sweep.t0;

					if (b1.m_sweep.t0 < b2.m_sweep.t0)
					{
						t0 = b2.m_sweep.t0;
						b1.m_sweep.Advance(t0);
					}
					else if (b2.m_sweep.t0 < b1.m_sweep.t0)
					{
						t0 = b1.m_sweep.t0;
						b2.m_sweep.Advance(t0);
					}

					//b2Settings.b2Assert(t0 < 1.0f);

					// Compute the time of impact.
					toi = b2TimeOfImpact.TimeOfImpact(c.m_shape1, b1.m_sweep, c.m_shape2, b2.m_sweep);
					//b2Settings.b2Assert(0.0 <= toi && toi <= 1.0);

					if (toi > 0.0 && toi < 1.0)
					{
						//toi = Math.min((1.0 - toi) * t0 + toi, 1.0);
						toi = (1.0 - toi) * t0 + toi;
						if (toi > 1) toi = 1;
					}


					c.m_toi = toi;
					c.m_flags |= b2Contact.e_toiFlag;
				}

				if (Number.MIN_VALUE < toi && toi < minTOI)
				{
					// This is the minimum TOI found so far.
					minContact = c;
					minTOI = toi;
				}
			}

			if (minContact == null || 1.0 - 100.0 * Number.MIN_VALUE < minTOI)
			{
				// No more TOI events. Done!
				break;
			}

			// Advance the bodies to the TOI.
			s1 = minContact.m_shape1;
			s2 = minContact.m_shape2;
			b1 = s1.m_body;
			b2 = s2.m_body;
			b1.Advance(minTOI);
			b2.Advance(minTOI);

			// The TOI contact likely has some new contact points.
			minContact.Update(this.m_contactListener);
			minContact.m_flags &= ~b2Contact.e_toiFlag;

			if (minContact.m_manifoldCount == 0)
			{
				// This shouldn't happen. Numerical error?
				//b2Assert(false);
				continue;
			}

			// Build the TOI island. We need a dynamic seed.
			var seed:b2Body = b1;
			if (seed.IsStatic())
			{
				seed = b2;
			}

			// Reset island and stack.
			island.Clear();
			var stackCount:number = 0;
			stack[stackCount++] = seed;
			seed.m_flags |= b2Body.e_islandFlag;

			// Perform a depth first search (DFS) on the contact graph.
			while (stackCount > 0)
			{
				// Grab the next body off the stack and add it to the island.
				b = stack[--stackCount];
				island.AddBody(b);

				// Make sure the body is awake.
				b.m_flags &= ~b2Body.e_sleepFlag;

				// To keep islands as small as possible, we don't
				// propagate islands across static bodies.
				if (b.IsStatic())
				{
					continue;
				}

				// Search all contacts connected to this body.
				for (cn = b.m_contactList; cn; cn = cn.next)
				{
					// Does the TOI island still have space for contacts?
					if (island.m_contactCount == island.m_contactCapacity)
					{
						continue;
					}

					// Has this contact already been added to an island? Skip slow or non-solid contacts.
					if (cn.contact.m_flags & (b2Contact.e_islandFlag | b2Contact.e_slowFlag | b2Contact.e_nonSolidFlag))
					{
						continue;
					}

					// Is this contact touching? For performance we are not updating this contact.
					if (cn.contact.m_manifoldCount == 0)
					{
						continue;
					}

					island.AddContact(cn.contact);
					cn.contact.m_flags |= b2Contact.e_islandFlag;

					// Update other body.
					var other:b2Body = cn.other;

					// Was the other body already added to this island?
					if (other.m_flags & b2Body.e_islandFlag)
					{
						continue;
					}

					// March forward, this can do no harm since this is the min TOI.
					if (other.IsStatic() == false)
					{
						other.Advance(minTOI);
						other.WakeUp();
					}

					//b2Settings.b2Assert(stackCount < stackSize);
					stack[stackCount++] = other;
					other.m_flags |= b2Body.e_islandFlag;
				}
			}

			var subStep:b2TimeStep = new b2TimeStep();
			subStep.dt = (1.0 - minTOI) * step.dt;
			//b2Settings.b2Assert(subStep.dt > Number.MIN_VALUE);
			subStep.inv_dt = 1.0 / subStep.dt;
			subStep.maxIterations = step.maxIterations;

			island.SolveTOI(subStep);

			var i:number;
			// Post solve cleanup.
			var bodyCount:number = island.m_bodyCount;
			for (i = 0; i < bodyCount; ++i)
			{
				// Allow bodies to participate in future TOI islands.
				b = island.m_bodies[i];
				b.m_flags &= ~b2Body.e_islandFlag;

				if (b.m_flags & (b2Body.e_sleepFlag | b2Body.e_frozenFlag))
				{
					continue;
				}

				if (b.IsStatic())
				{
					continue;
				}

				// Update shapes (for broad-phase). If the shapes go out of
				// the world AABB then shapes and contacts may be destroyed,
				// including contacts that are
				var inRange:boolean = b.SynchronizeShapes();

				// Did the body's shapes leave the world?
				if (inRange == false && this.m_boundaryListener != null)
				{
					this.m_boundaryListener.Violation(b);
				}

				// Invalidate all contact TOIs associated with this body. Some of these
				// may not be in the island because they were not touching.
				for (cn = b.m_contactList; cn; cn = cn.next)
				{
					cn.contact.m_flags &= ~b2Contact.e_toiFlag;
				}
			}

			var contactCount:number = island.m_contactCount;
			for (i = 0; i < contactCount; ++i)
			{
				// Allow contacts to participate in future TOI islands.
				c = island.m_contacts[i];
				c.m_flags &= ~(b2Contact.e_toiFlag | b2Contact.e_islandFlag);
			}

			// Commit shape proxy movements to the broad-phase so that new contacts are created.
			// Also, some contacts can be destroyed.
			this.m_broadPhase.Commit();
		}

		//m_stackAllocator.Free(stack);

	}

	private static s_jointColor:b2Color = new b2Color(0.5, 0.8, 0.8);
	//
	public DrawJoint(joint:b2Joint) : void{

		var b1:b2Body = joint.m_body1;
		var b2:b2Body = joint.m_body2;
		var xf1:b2XForm = b1.m_xf;
		var xf2:b2XForm = b2.m_xf;
		var x1:b2Vec2 = xf1.position;
		var x2:b2Vec2 = xf2.position;
		var p1:b2Vec2 = joint.GetAnchor1();
		var p2:b2Vec2 = joint.GetAnchor2();

		//b2Color color(0.5f, 0.8f, 0.8f);
		var color:b2Color = b2World.s_jointColor;

		switch (joint.m_type)
		{
		case b2Joint.e_distanceJoint:
			this.m_debugDraw.DrawSegment(p1, p2, color);
			break;

		case b2Joint.e_pulleyJoint:
			{
				var pulley:b2PulleyJoint = (joint as b2PulleyJoint);
				var s1:b2Vec2 = pulley.GetGroundAnchor1();
				var s2:b2Vec2 = pulley.GetGroundAnchor2();
				this.m_debugDraw.DrawSegment(s1, p1, color);
				this.m_debugDraw.DrawSegment(s2, p2, color);
				this.m_debugDraw.DrawSegment(s1, s2, color);
			}
			break;

		case b2Joint.e_mouseJoint:
			this.m_debugDraw.DrawSegment(p1, p2, color);
			break;

		default:
			if (b1 != this.m_groundBody)
				this.m_debugDraw.DrawSegment(x1, p1, color);
			this.m_debugDraw.DrawSegment(p1, p2, color);
			if (b2 != this.m_groundBody)
				this.m_debugDraw.DrawSegment(x2, p2, color);
		}
	}

	private static s_coreColor:b2Color = new b2Color(0.9, 0.6, 0.6);
	public DrawShape(shape:b2Shape, xf:b2XForm, color:b2Color, core:boolean) : void{

		var coreColor:b2Color = b2World.s_coreColor;

		switch (shape.m_type)
		{
		case b2Shape.e_circleShape:
			{
				var circle:b2CircleShape = (shape as b2CircleShape);

				var center:b2Vec2 = b2Math.b2MulX(xf, circle.m_localPosition);
				var radius:number = circle.m_radius;
				var axis:b2Vec2 = xf.R.col1;

				this.m_debugDraw.DrawSolidCircle(center, radius, axis, color);

				if (core)
				{
					this.m_debugDraw.DrawCircle(center, radius - b2Settings.b2_toiSlop, coreColor);
				}
			}
			break;

		case b2Shape.e_polygonShape:
			{
				var i:number;
				var poly:b2PolygonShape = (shape as b2PolygonShape);
				var vertexCount:number = poly.GetVertexCount();
				var localVertices:Array<any>= poly.GetVertices();

				//b2Assert(vertexCount <= b2_maxPolygonVertices);
				var vertices:Array<any>= new Array(b2Settings.b2_maxPolygonVertices);

				for (i = 0; i < vertexCount; ++i)
				{
					vertices[i] = b2Math.b2MulX(xf, localVertices[i]);
				}

				this.m_debugDraw.DrawSolidPolygon(vertices, vertexCount, color);

				if (core)
				{
					var localCoreVertices:Array<any>= poly.GetCoreVertices();
					for (i = 0; i < vertexCount; ++i)
					{
						vertices[i] = b2Math.b2MulX(xf, localCoreVertices[i]);
					}
					this.m_debugDraw.DrawPolygon(vertices, vertexCount, coreColor);
				}
			}
			break;

		case b2Shape.e_concaveArcShape:
			{
				var arc:b2ConcaveArcShape = (shape as b2ConcaveArcShape);
				vertexCount = arc.GetVertexCount();
				localVertices = arc.GetVertices();

				center = b2Math.b2MulX(xf, arc.m_arcCenter);

				//b2Assert(vertexCount <= b2_maxPolygonVertices);
				vertices = new Array(b2Settings.b2_maxPolygonVertices);

				for (i = 0; i < vertexCount; ++i)
				{
					vertices[i] = b2Math.b2MulX(xf, localVertices[i]);
				}

				//m_debugDraw.DrawSolidConcaveArc(vertices, vertexCount, center, color);

				if (core)
				{
					localCoreVertices = arc.GetCoreVertices();
					for (i = 0; i < vertexCount; ++i)
					{
						vertices[i] = b2Math.b2MulX(xf, localCoreVertices[i]);
					}
					//m_debugDraw.DrawConcaveArc(vertices, vertexCount, center, coreColor);
				}
			}
			break;

		case b2Shape.e_staticEdgeShape:
			{
				var edge:b2StaticEdgeShape = (shape as b2StaticEdgeShape);

				this.m_debugDraw.DrawSegment(edge.m_v1, edge.m_v2, color);

				if (core)
				{
					this.m_debugDraw.DrawSegment(edge.m_coreV1, edge.m_coreV2, coreColor);
				}
			}
			break;

		}
	}


	private static s_xf:b2XForm = new b2XForm();
	public DrawDebugData() : void{

		if (this.m_debugDraw == null)
		{
			return;
		}

		this.m_debugDraw.m_sprite.graphics.clear();

		var flags:number = this.m_debugDraw.GetFlags();

		var i:number;
		var b:b2Body;
		var s:b2Shape;
		var j:b2Joint;
		var bp:b2BroadPhase;
		var invQ:b2Vec2 = new b2Vec2;
		var x1:b2Vec2 = new b2Vec2;
		var x2:b2Vec2 = new b2Vec2;
		var color:b2Color = new b2Color(0,0,0);
		var xf:b2XForm;
		var b1:b2AABB = new b2AABB();
		var b2:b2AABB = new b2AABB();
		var vs:Array<any>= [new b2Vec2(), new b2Vec2(), new b2Vec2(), new b2Vec2()];

		if (flags & b2DebugDraw.e_shapeBit)
		{
			var core:boolean = (flags & b2DebugDraw.e_coreShapeBit) == b2DebugDraw.e_coreShapeBit;

			for (b = this.m_bodyList; b; b = b.m_next)
			{
				xf = b.m_xf;
				for (s = b.GetShapeList(); s; s = s.m_next)
				{
					if (b.IsStatic())
					{
						this.DrawShape(s, xf, new b2Color(0.5, 0.9, 0.5), core);
					}
					else if (b.IsSleeping())
					{
						this.DrawShape(s, xf, new b2Color(0.5, 0.5, 0.9), core);
					}
					else
					{
						this.DrawShape(s, xf, new b2Color(0.9, 0.9, 0.9), core);
					}
				}
			}
		}

		if (flags & b2DebugDraw.e_jointBit)
		{
			for (j = this.m_jointList; j; j = j.m_next)
			{
				//if (j.m_type != b2Joint.e_mouseJoint)
				//{
					this.DrawJoint(j);
				//}
			}
		}

		if (flags & b2DebugDraw.e_pairBit)
		{
			bp = this.m_broadPhase;
			//b2Vec2 invQ;
			invQ.Set(1.0 / bp.m_quantizationFactor.x, 1.0 / bp.m_quantizationFactor.y);
			//b2Color color(0.9f, 0.9f, 0.3f);
			color.Set(0.9, 0.9, 0.3);

			var capacity:number = b2Pair.b2_tableCapacity;
			var nullPair:number = b2Pair.b2_nullPair;
			for (i = 0; i < capacity; ++i)
			{
				var index:number = bp.m_pairManager.m_hashTable[i];
				while (index != nullPair)
				{
					var pair:b2Pair = bp.m_pairManager.m_pairs[ index ];
					var p1:b2Proxy = bp.m_proxyPool[ pair.proxyId1 ];
					var p2:b2Proxy = bp.m_proxyPool[ pair.proxyId2 ];

					//b2AABB b1, b2;
					b1.lowerBound.x = bp.m_worldAABB.lowerBound.x + invQ.x * bp.m_bounds[0][p1.lowerBounds[0]].value;
					b1.lowerBound.y = bp.m_worldAABB.lowerBound.y + invQ.y * bp.m_bounds[1][p1.lowerBounds[1]].value;
					b1.upperBound.x = bp.m_worldAABB.lowerBound.x + invQ.x * bp.m_bounds[0][p1.upperBounds[0]].value;
					b1.upperBound.y = bp.m_worldAABB.lowerBound.y + invQ.y * bp.m_bounds[1][p1.upperBounds[1]].value;
					b2.lowerBound.x = bp.m_worldAABB.lowerBound.x + invQ.x * bp.m_bounds[0][p2.lowerBounds[0]].value;
					b2.lowerBound.y = bp.m_worldAABB.lowerBound.y + invQ.y * bp.m_bounds[1][p2.lowerBounds[1]].value;
					b2.upperBound.x = bp.m_worldAABB.lowerBound.x + invQ.x * bp.m_bounds[0][p2.upperBounds[0]].value;
					b2.upperBound.y = bp.m_worldAABB.lowerBound.y + invQ.y * bp.m_bounds[1][p2.upperBounds[1]].value;

					//b2Vec2 x1 = 0.5f * (b1.lowerBound + b1.upperBound);
					x1.x = 0.5 * (b1.lowerBound.x + b1.upperBound.x);
					x1.y = 0.5 * (b1.lowerBound.y + b1.upperBound.y);
					//b2Vec2 x2 = 0.5f * (b2.lowerBound + b2.upperBound);
					x2.x = 0.5 * (b2.lowerBound.x + b2.upperBound.x);
					x2.y = 0.5 * (b2.lowerBound.y + b2.upperBound.y);

					this.m_debugDraw.DrawSegment(x1, x2, color);

					index = pair.next;
				}
			}
		}

		if (flags & b2DebugDraw.e_aabbBit)
		{
			bp = this.m_broadPhase;
			var worldLower:b2Vec2 = bp.m_worldAABB.lowerBound;
			var worldUpper:b2Vec2 = bp.m_worldAABB.upperBound;

			//b2Vec2 invQ;
			invQ.Set(1.0 / bp.m_quantizationFactor.x, 1.0 / bp.m_quantizationFactor.y);
			//b2Color color(0.9f, 0.3f, 0.9f);
			color.Set(0.9, 0.3, 0.9);
			var maxProxies:number = b2Settings.b2_maxProxies;
			for (i = 0; i < maxProxies; ++i)
			{
				var p:b2Proxy = bp.m_proxyPool[ i];
				if (p.IsValid() == false)
				{
					continue;
				}

				//b2AABB b1;
				b1.lowerBound.x = worldLower.x + invQ.x * bp.m_bounds[0][p.lowerBounds[0]].value;
				b1.lowerBound.y = worldLower.y + invQ.y * bp.m_bounds[1][p.lowerBounds[1]].value;
				b1.upperBound.x = worldLower.x + invQ.x * bp.m_bounds[0][p.upperBounds[0]].value;
				b1.upperBound.y = worldLower.y + invQ.y * bp.m_bounds[1][p.upperBounds[1]].value;

				//b2Vec2 vs[4];
				vs[0].Set(b1.lowerBound.x, b1.lowerBound.y);
				vs[1].Set(b1.upperBound.x, b1.lowerBound.y);
				vs[2].Set(b1.upperBound.x, b1.upperBound.y);
				vs[3].Set(b1.lowerBound.x, b1.upperBound.y);

				this.m_debugDraw.DrawPolygon(vs, 4, color);
			}

			//b2Vec2 vs[4];
			vs[0].Set(worldLower.x, worldLower.y);
			vs[1].Set(worldUpper.x, worldLower.y);
			vs[2].Set(worldUpper.x, worldUpper.y);
			vs[3].Set(worldLower.x, worldUpper.y);
			this.m_debugDraw.DrawPolygon(vs, 4, new b2Color(0.3, 0.9, 0.9));
		}

		if (flags & b2DebugDraw.e_obbBit)
		{
			//b2Color color(0.5f, 0.3f, 0.5f);
			color.Set(0.5, 0.3, 0.5);

			for (b = this.m_bodyList; b; b = b.m_next)
			{
				xf = b.m_xf;
				for (s = b.GetShapeList(); s; s = s.m_next)
				{
					if (s.m_type != b2Shape.e_polygonShape)
					{
						continue;
					}

					var poly:b2PolygonShape = (s as b2PolygonShape);
					var obb:b2OBB = poly.GetOBB();
					var h:b2Vec2 = obb.extents;
					//b2Vec2 vs[4];
					vs[0].Set(-h.x, -h.y);
					vs[1].Set( h.x, -h.y);
					vs[2].Set( h.x,  h.y);
					vs[3].Set(-h.x,  h.y);

					for (i = 0; i < 4; ++i)
					{
						//vs[i] = obb.center + b2Mul(obb.R, vs[i]);
						var tMat:b2Mat22 = obb.R;
						var tVec:b2Vec2 = vs[i];
						var tX:number;
						tX      = obb.center.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
						vs[i].y = obb.center.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
						vs[i].x = tX;
						//vs[i] = b2Mul(xf, vs[i]);
						tMat = xf.R;
						tX      = xf.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
						vs[i].y = xf.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
						vs[i].x = tX;
					}

					this.m_debugDraw.DrawPolygon(vs, 4, color);
				}
			}
		}

		if (flags & b2DebugDraw.e_centerOfMassBit)
		{
			for (b = this.m_bodyList; b; b = b.m_next)
			{
				xf = b2World.s_xf;
				xf.R = b.m_xf.R;
				xf.position = b.GetWorldCenter();
				this.m_debugDraw.DrawXForm(xf);
			}
		}
	}

	public m_blockAllocator:any;
	public m_stackAllocator:any;

	public m_lock:boolean;

	public m_broadPhase:b2BroadPhase;
	public m_contactManager:b2ContactManager = new b2ContactManager();

	public m_bodyList:b2Body;
	public m_jointList:b2Joint;

	// Do not access
	public m_contactList:b2Contact;

	public m_bodyCount:number;
	public m_contactCount:number;
	public m_jointCount:number;

	public m_gravity:b2Vec2;
	public m_allowSleep:boolean;

	public m_groundBody:b2Body;

	public m_destructionListener:b2DestructionListener;
	public m_boundaryListener:b2BoundaryListener;
	public m_contactFilter:b2ContactFilter;
	public m_contactListener:b2ContactListener;
	public m_debugDraw:b2DebugDraw;

	public m_inv_dt0:number;

	public m_positionIterationCount:number;

	// This is for debugging the solver.
	public static m_positionCorrection:boolean;

	// This is for debugging the solver.
	public static m_warmStarting:boolean;

	// This is for debugging the solver.
	public static m_continuousPhysics:boolean;

};
