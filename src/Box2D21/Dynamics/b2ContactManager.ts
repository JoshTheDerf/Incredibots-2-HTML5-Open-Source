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

import { b2Body, b2Contact, b2ContactEdge, b2ContactFactory, b2ContactFilter, b2ContactListener, b2ContactPoint, b2DynamicTreeBroadPhase, b2Fixture, IBroadPhase, b2World } from "..";

export class b2ContactManager
{

	private static s_evalCP:b2ContactPoint = new b2ContactPoint();

	public m_world:b2World = null!;

	public m_broadPhase:IBroadPhase;

	public m_contactList:b2Contact | null = null;

	public m_contactCount:number;

	public m_contactFilter:b2ContactFilter;

	public m_contactListener:b2ContactListener;

	public m_contactFactory:b2ContactFactory;

	public m_allocator:any;

	constructor(){
		this.m_world = null!;
		this.m_contactCount = 0;
		this.m_contactFilter = b2ContactFilter.b2_defaultFilter;
		this.m_contactListener = b2ContactListener.b2_defaultListener;
		this.m_contactFactory = new b2ContactFactory(this.m_allocator);
		this.m_broadPhase = new b2DynamicTreeBroadPhase();
	}

	public AddPair(proxyUserDataA:any, proxyUserDataB:any) : void{
		var s1:b2Fixture = null!;
		var s2:b2Fixture = null!;
		var fixtureA:b2Fixture = proxyUserDataA as b2Fixture;
		var fixtureB:b2Fixture = proxyUserDataB as b2Fixture;
		var bodyA:b2Body = fixtureA.GetBody();
		var bodyB:b2Body = fixtureB.GetBody();
		if(bodyA == bodyB){
			return;
		}
		var edge:b2ContactEdge | null = bodyB.GetContactList();
		while(edge){
			if(edge.other == bodyA){
				s1 = edge.contact!.GetFixtureA();
				s2 = edge.contact!.GetFixtureB();
				if(s1 == fixtureA && s2 == fixtureB){
					return;
				}
				if(s1 == fixtureB && s2 == fixtureA){
					return;
				}
			}
			edge = edge.next;
		}
		if(bodyB.ShouldCollide(bodyA) == false){
			return;
		}
		if(this.m_contactFilter.ShouldCollide(fixtureA,fixtureB) == false){
			return;
		}
		var c:b2Contact = this.m_contactFactory.Create(fixtureA,fixtureB)!;
		fixtureA = c.GetFixtureA();
		fixtureB = c.GetFixtureB();
		bodyA = fixtureA.m_body;
		bodyB = fixtureB.m_body;
		c.m_prev = null;
		c.m_next = this.m_world.m_contactList;
		if(this.m_world.m_contactList != null){
			this.m_world.m_contactList.m_prev = c;
		}
		this.m_world.m_contactList = c;
		c.m_nodeA.contact = c;
		c.m_nodeA.other = bodyB;
		c.m_nodeA.prev = null;
		c.m_nodeA.next = bodyA.m_contactList;
		if(bodyA.m_contactList != null){
			bodyA.m_contactList.prev = c.m_nodeA;
		}
		bodyA.m_contactList = c.m_nodeA;
		c.m_nodeB.contact = c;
		c.m_nodeB.other = bodyA;
		c.m_nodeB.prev = null;
		c.m_nodeB.next = bodyB.m_contactList;
		if(bodyB.m_contactList != null){
			bodyB.m_contactList.prev = c.m_nodeB;
		}
		bodyB.m_contactList = c.m_nodeB;
		++this.m_world.m_contactCount;
	}

	public FindNewContacts() : void{
		this.m_broadPhase.UpdatePairs((a:any, b:any):void => this.AddPair(a,b));
	}

	public Destroy(c:b2Contact) : void{
		var fixtureA:b2Fixture = c.GetFixtureA();
		var fixtureB:b2Fixture = c.GetFixtureB();
		var bodyA:b2Body = fixtureA.GetBody();
		var bodyB:b2Body = fixtureB.GetBody();
		if(c.IsTouching()){
			this.m_contactListener.EndContact(c);
		}
		if(c.m_prev){
			c.m_prev.m_next = c.m_next;
		}
		if(c.m_next){
			c.m_next.m_prev = c.m_prev;
		}
		if(c == this.m_world.m_contactList){
			this.m_world.m_contactList = c.m_next;
		}
		if(c.m_nodeA.prev){
			c.m_nodeA.prev.next = c.m_nodeA.next;
		}
		if(c.m_nodeA.next){
			c.m_nodeA.next.prev = c.m_nodeA.prev;
		}
		if(c.m_nodeA == bodyA.m_contactList){
			bodyA.m_contactList = c.m_nodeA.next;
		}
		if(c.m_nodeB.prev){
			c.m_nodeB.prev.next = c.m_nodeB.next;
		}
		if(c.m_nodeB.next){
			c.m_nodeB.next.prev = c.m_nodeB.prev;
		}
		if(c.m_nodeB == bodyB.m_contactList){
			bodyB.m_contactList = c.m_nodeB.next;
		}
		this.m_contactFactory.Destroy(c);
		--this.m_contactCount;
	}

	public Collide() : void{
		var fixtureA:b2Fixture = null!;
		var fixtureB:b2Fixture = null!;
		var bodyA:b2Body = null!;
		var bodyB:b2Body = null!;
		var proxyA:any = undefined;
		var proxyB:any = undefined;
		var overlap:boolean = false;
		var cNuke:b2Contact = null!;
		var c:b2Contact | null = this.m_world.m_contactList;
		while(c){
			fixtureA = c.GetFixtureA();
			fixtureB = c.GetFixtureB();
			bodyA = fixtureA.GetBody();
			bodyB = fixtureB.GetBody();
			if(bodyA.IsAwake() == false && bodyB.IsAwake() == false){
				c = c.GetNext();
			}
			else{
				if(c.m_flags & b2Contact.e_filterFlag){
					if(bodyB.ShouldCollide(bodyA) == false){
						cNuke = c;
						c = cNuke.GetNext();
						this.Destroy(cNuke);
						continue;
					}
					if(this.m_contactFilter.ShouldCollide(fixtureA,fixtureB) == false){
						cNuke = c;
						c = cNuke.GetNext();
						this.Destroy(cNuke);
						continue;
					}
					c.m_flags &= ~b2Contact.e_filterFlag;
				}
				proxyA = fixtureA.m_proxy;
				proxyB = fixtureB.m_proxy;
				overlap = this.m_broadPhase.TestOverlap(proxyA,proxyB);
				if(overlap == false){
					cNuke = c;
					c = cNuke.GetNext();
					this.Destroy(cNuke);
				}
				else{
					c.Update(this.m_contactListener);
					c = c.GetNext();
				}
			}
		}
	}
}
