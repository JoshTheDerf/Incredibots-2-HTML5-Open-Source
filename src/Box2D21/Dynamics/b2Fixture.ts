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

import { b2AABB, b2Body, b2Contact, b2ContactEdge, b2FilterData, b2FixtureDef, IBroadPhase, b2MassData, b2Math, b2RayCastInput, b2RayCastOutput, b2Shape, b2Transform, b2Vec2 } from "..";

export class b2Fixture
{

	private m_massData!:b2MassData;

	public m_aabb:b2AABB;

	public m_density:number;

	public m_next:b2Fixture | null;

	public m_body:b2Body = null!;

	public m_shape:b2Shape = null!;

	public m_friction:number;

	public m_restitution:number;

	public m_proxy:any;

	public m_filter:b2FilterData = new b2FilterData();

	public m_isSensor:boolean = false;

	public m_userData:any;

	constructor(){
		this.m_aabb = new b2AABB();
		this.m_userData = null;
		this.m_body = null!;
		this.m_next = null;
		this.m_shape = null!;
		this.m_density = 0;
		this.m_friction = 0;
		this.m_restitution = 0;
	}

	public GetType() : number{
		return this.m_shape.GetType();
	}

	public GetShape() : b2Shape{
		return this.m_shape;
	}

	public SetSensor(sensor:boolean) : void{
		var contact:b2Contact = null!;
		var fixtureA:b2Fixture = null!;
		var fixtureB:b2Fixture = null!;
		if(this.m_isSensor == sensor){
			return;
		}
		this.m_isSensor = sensor;
		if(this.m_body == null){
			return;
		}
		var edge:b2ContactEdge | null = this.m_body.GetContactList();
		while(edge){
			contact = edge.contact!;
			fixtureA = contact.GetFixtureA();
			fixtureB = contact.GetFixtureB();
			if(fixtureA == this || fixtureB == this){
				contact.SetSensor(fixtureA.IsSensor() || fixtureB.IsSensor());
			}
			edge = edge.next;
		}
	}

	public IsSensor() : boolean{
		return this.m_isSensor;
	}

	public SetFilterData(filter:b2FilterData) : void{
		var contact:b2Contact = null!;
		var fixtureA:b2Fixture = null!;
		var fixtureB:b2Fixture = null!;
		this.m_filter = filter.Copy();
		// NOTE: the decompiled IB3 source has `if(m_body) return;` here, an
		// inverted-guard decompiler artifact (it would null-deref below and never
		// re-filter). Corrected to match SetSensor above and upstream Box2D.
		if(this.m_body == null){
			return;
		}
		var edge:b2ContactEdge | null = this.m_body.GetContactList();
		while(edge){
			contact = edge.contact!;
			fixtureA = contact.GetFixtureA();
			fixtureB = contact.GetFixtureB();
			if(fixtureA == this || fixtureB == this){
				contact.FlagForFiltering();
			}
			edge = edge.next;
		}
	}

	public GetFilterData() : b2FilterData{
		return this.m_filter.Copy();
	}

	public GetBody() : b2Body{
		return this.m_body;
	}

	public GetNext() : b2Fixture | null{
		return this.m_next;
	}

	public GetUserData() : any{
		return this.m_userData;
	}

	public SetUserData(data:any) : void{
		this.m_userData = data;
	}

	public TestPoint(p:b2Vec2) : boolean{
		return this.m_shape.TestPoint(this.m_body.GetTransform(),p);
	}

	public RayCast(output:b2RayCastOutput, input:b2RayCastInput) : boolean{
		return this.m_shape.RayCast(output,input,this.m_body.GetTransform());
	}

	public GetMassData(massData:b2MassData | null = null) : b2MassData{
		if(massData == null){
			massData = new b2MassData();
		}
		this.m_shape.ComputeMass(massData,this.m_density);
		return massData;
	}

	public SetDensity(density:number) : void{
		this.m_density = density;
	}

	public GetDensity() : number{
		return this.m_density;
	}

	public GetFriction() : number{
		return this.m_friction;
	}

	public SetFriction(friction:number) : void{
		this.m_friction = friction;
	}

	public GetRestitution() : number{
		return this.m_restitution;
	}

	public SetRestitution(restitution:number) : void{
		this.m_restitution = restitution;
	}

	public GetAABB() : b2AABB{
		return this.m_aabb;
	}

	public Create(body:b2Body, xf:b2Transform, def:b2FixtureDef) : void{
		this.m_userData = def.userData;
		this.m_friction = def.friction;
		this.m_restitution = def.restitution;
		this.m_body = body;
		this.m_next = null;
		this.m_filter = def.filter.Copy();
		this.m_isSensor = def.isSensor;
		this.m_shape = def.shape!.Copy();
		this.m_density = def.density;
	}

	public Destroy() : void{
		this.m_shape = null!;
	}

	public CreateProxy(broadPhase:IBroadPhase, xf:b2Transform) : void{
		this.m_shape.ComputeAABB(this.m_aabb,xf);
		this.m_proxy = broadPhase.CreateProxy(this.m_aabb,this);
	}

	public DestroyProxy(broadPhase:IBroadPhase) : void{
		if(this.m_proxy == null){
			return;
		}
		broadPhase.DestroyProxy(this.m_proxy);
		this.m_proxy = null;
	}

	public Synchronize(broadPhase:IBroadPhase, transform1:b2Transform, transform2:b2Transform) : void{
		if(!this.m_proxy){
			return;
		}
		var aabb1:b2AABB = new b2AABB();
		var aabb2:b2AABB = new b2AABB();
		this.m_shape.ComputeAABB(aabb1,transform1);
		this.m_shape.ComputeAABB(aabb2,transform2);
		this.m_aabb.Combine(aabb1,aabb2);
		var displacement:b2Vec2 = b2Math.SubtractVV(transform2.position,transform1.position);
		broadPhase.MoveProxy(this.m_proxy,this.m_aabb,displacement);
	}
}
