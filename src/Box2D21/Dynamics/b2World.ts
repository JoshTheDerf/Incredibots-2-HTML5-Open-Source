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

import { b2AABB, b2Body, b2BodyDef, b2CircleShape, b2Color, b2Contact, b2ContactEdge, b2ContactFilter, b2ContactListener, b2ContactManager, b2ContactSolver, b2Controller, b2ControllerEdge, b2DebugDraw, b2DestructionListener, b2EdgeShape, b2Fixture, IBroadPhase, b2Island, b2Joint, b2JointDef, b2JointEdge, b2Math, b2PolygonShape, b2PulleyJoint, b2RayCastInput, b2RayCastOutput, b2Settings, b2Shape, b2Sweep, b2Transform, b2TimeStep, b2Vec2 } from "..";

export class b2World
{

	private static m_warmStarting:boolean = false;

	private static m_continuousPhysics:boolean = false;

	private static s_timestep2:b2TimeStep = new b2TimeStep();

	private static s_xf:b2Transform = new b2Transform();

	private static s_backupA:b2Sweep = new b2Sweep();

	private static s_backupB:b2Sweep = new b2Sweep();

	private static s_timestep:b2TimeStep = new b2TimeStep();

	private static s_queue:b2Body[] = new Array<b2Body>();

	private static s_jointColor:b2Color = new b2Color(0.5,0.8,0.8);

	public static e_newFixture:number = 1;

	public static e_locked:number = 2;

	private s_stack:b2Body[] = new Array<b2Body>();

	public m_flags:number = 0;

	public m_contactManager:b2ContactManager = new b2ContactManager();

	private m_contactSolver:b2ContactSolver = new b2ContactSolver();

	private m_island:b2Island = new b2Island();

	public m_bodyList:b2Body | null = null;

	private m_jointList:b2Joint | null = null;

	public m_contactList:b2Contact | null = null;

	private m_bodyCount:number;

	public m_contactCount:number;

	private m_jointCount:number;

	private m_controllerList:b2Controller | null = null;

	private m_controllerCount:number;

	private m_gravity:b2Vec2;

	private m_allowSleep:boolean;

	public m_groundBody:b2Body | null = null;

	private m_destructionListener:b2DestructionListener | null = null;

	private m_debugDraw:b2DebugDraw = null!;

	private m_inv_dt0:number;

	constructor(gravity:b2Vec2, doSleep:boolean){
		this.m_destructionListener = null;
		this.m_debugDraw = null!;
		this.m_bodyList = null;
		this.m_contactList = null;
		this.m_jointList = null;
		this.m_controllerList = null;
		this.m_bodyCount = 0;
		this.m_contactCount = 0;
		this.m_jointCount = 0;
		this.m_controllerCount = 0;
		b2World.m_warmStarting = true;
		b2World.m_continuousPhysics = true;
		this.m_allowSleep = doSleep;
		this.m_gravity = gravity;
		this.m_inv_dt0 = 0;
		this.m_contactManager.m_world = this;
		var bd:b2BodyDef = new b2BodyDef();
		this.m_groundBody = this.CreateBody(bd);
	}

	public SetDestructionListener(listener:b2DestructionListener) : void{
		this.m_destructionListener = listener;
	}

	public SetContactFilter(filter:b2ContactFilter) : void{
		this.m_contactManager.m_contactFilter = filter;
	}

	public SetContactListener(listener:b2ContactListener) : void{
		this.m_contactManager.m_contactListener = listener;
	}

	public SetDebugDraw(debugDraw:b2DebugDraw) : void{
		this.m_debugDraw = debugDraw;
	}

	public SetBroadPhase(broadPhase:IBroadPhase) : void{
		var f:b2Fixture | null = null;
		var oldBroadPhase:IBroadPhase = this.m_contactManager.m_broadPhase;
		this.m_contactManager.m_broadPhase = broadPhase;
		var b:b2Body | null = this.m_bodyList;
		while(b){
			f = b.m_fixtureList;
			while(f){
				f.m_proxy = broadPhase.CreateProxy(oldBroadPhase.GetFatAABB(f.m_proxy),f);
				f = f.m_next;
			}
			b = b.m_next;
		}
	}

	public Validate() : void{
		this.m_contactManager.m_broadPhase.Validate();
	}

	public GetProxyCount() : number{
		return this.m_contactManager.m_broadPhase.GetProxyCount();
	}

	public CreateBody(def:b2BodyDef) : b2Body | null{
		if(this.IsLocked() == true){
			return null;
		}
		var b:b2Body = new b2Body(def,this);
		b.m_prev = null;
		b.m_next = this.m_bodyList;
		if(this.m_bodyList){
			this.m_bodyList.m_prev = b;
		}
		this.m_bodyList = b;
		++this.m_bodyCount;
		return b;
	}

	public DestroyBody(b:b2Body) : void{
		var je:b2JointEdge = null!;
		var coe:b2ControllerEdge = null!;
		var ce:b2ContactEdge = null!;
		var f0:b2Fixture = null!;
		if(this.IsLocked() == true){
			return;
		}
		var jn:b2JointEdge | null = b.m_jointList;
		while(jn){
			je = jn;
			jn = jn.next;
			if(this.m_destructionListener){
				this.m_destructionListener.SayGoodbyeJoint(je.joint!);
			}
			this.DestroyJoint(je.joint!);
		}
		var coEdge:b2ControllerEdge | null = b.m_controllerList;
		while(coEdge){
			coe = coEdge;
			coEdge = coEdge.nextController;
			coe.controller.RemoveBody(b);
		}
		var cn:b2ContactEdge | null = b.m_contactList;
		while(cn){
			ce = cn;
			cn = cn.next;
			this.m_contactManager.Destroy(ce.contact!);
		}
		b.m_contactList = null;
		var f:b2Fixture | null = b.m_fixtureList;
		while(f){
			f0 = f;
			f = f.m_next;
			if(this.m_destructionListener){
				this.m_destructionListener.SayGoodbyeFixture(f0);
			}
			f0.DestroyProxy(this.m_contactManager.m_broadPhase);
			f0.Destroy();
		}
		b.m_fixtureList = null;
		b.m_fixtureCount = 0;
		if(b.m_prev){
			b.m_prev.m_next = b.m_next;
		}
		if(b.m_next){
			b.m_next.m_prev = b.m_prev;
		}
		if(b == this.m_bodyList){
			this.m_bodyList = b.m_next;
		}
		--this.m_bodyCount;
	}

	public CreateJoint(def:b2JointDef) : b2Joint{
		var ce:b2ContactEdge | null = null;
		var j:b2Joint = b2Joint.Create(def,null)!;
		j.m_prev = null;
		j.m_next = this.m_jointList;
		if(this.m_jointList){
			this.m_jointList.m_prev = j;
		}
		this.m_jointList = j;
		++this.m_jointCount;
		j.m_edgeA.joint = j;
		j.m_edgeA.other = j.m_bodyB;
		j.m_edgeA.prev = null;
		j.m_edgeA.next = j.m_bodyA.m_jointList;
		if(j.m_bodyA.m_jointList){
			j.m_bodyA.m_jointList.prev = j.m_edgeA;
		}
		j.m_bodyA.m_jointList = j.m_edgeA;
		j.m_edgeB.joint = j;
		j.m_edgeB.other = j.m_bodyA;
		j.m_edgeB.prev = null;
		j.m_edgeB.next = j.m_bodyB.m_jointList;
		if(j.m_bodyB.m_jointList){
			j.m_bodyB.m_jointList.prev = j.m_edgeB;
		}
		j.m_bodyB.m_jointList = j.m_edgeB;
		var bodyA:b2Body = def.bodyA!;
		var bodyB:b2Body = def.bodyB!;
		if(def.collideConnected == false){
			ce = bodyB.GetContactList();
			while(ce){
				if(ce.other == bodyA){
					ce.contact!.FlagForFiltering();
				}
				ce = ce.next;
			}
		}
		return j;
	}

	public DestroyJoint(j:b2Joint) : void{
		var ce:b2ContactEdge | null = null;
		var collideConnected:boolean = j.m_collideConnected;
		if(j.m_prev){
			j.m_prev.m_next = j.m_next;
		}
		if(j.m_next){
			j.m_next.m_prev = j.m_prev;
		}
		if(j == this.m_jointList){
			this.m_jointList = j.m_next;
		}
		var bodyA:b2Body = j.m_bodyA;
		var bodyB:b2Body = j.m_bodyB;
		bodyA.SetAwake(true);
		bodyB.SetAwake(true);
		if(j.m_edgeA.prev){
			j.m_edgeA.prev.next = j.m_edgeA.next;
		}
		if(j.m_edgeA.next){
			j.m_edgeA.next.prev = j.m_edgeA.prev;
		}
		if(j.m_edgeA == bodyA.m_jointList){
			bodyA.m_jointList = j.m_edgeA.next;
		}
		j.m_edgeA.prev = null;
		j.m_edgeA.next = null;
		if(j.m_edgeB.prev){
			j.m_edgeB.prev.next = j.m_edgeB.next;
		}
		if(j.m_edgeB.next){
			j.m_edgeB.next.prev = j.m_edgeB.prev;
		}
		if(j.m_edgeB == bodyB.m_jointList){
			bodyB.m_jointList = j.m_edgeB.next;
		}
		j.m_edgeB.prev = null;
		j.m_edgeB.next = null;
		b2Joint.Destroy(j,null);
		--this.m_jointCount;
		if(collideConnected == false){
			ce = bodyB.GetContactList();
			while(ce){
				if(ce.other == bodyA){
					ce.contact!.FlagForFiltering();
				}
				ce = ce.next;
			}
		}
	}

	public AddController(c:b2Controller) : b2Controller{
		c.m_next = this.m_controllerList;
		c.m_prev = null;
		this.m_controllerList = c;
		c.m_world = this;
		++this.m_controllerCount;
		return c;
	}

	public RemoveController(c:b2Controller) : void{
		if(c.m_prev){
			c.m_prev.m_next = c.m_next;
		}
		if(c.m_next){
			c.m_next.m_prev = c.m_prev;
		}
		if(this.m_controllerList == c){
			this.m_controllerList = c.m_next;
		}
		--this.m_controllerCount;
	}

	public CreateController(controller:b2Controller) : b2Controller{
		if(controller.m_world != this){
			throw new Error("Controller can only be a member of one world");
		}
		controller.m_next = this.m_controllerList;
		controller.m_prev = null;
		if(this.m_controllerList){
			this.m_controllerList.m_prev = controller;
		}
		this.m_controllerList = controller;
		++this.m_controllerCount;
		controller.m_world = this;
		return controller;
	}

	public DestroyController(controller:b2Controller) : void{
		controller.Clear();
		if(controller.m_next){
			controller.m_next.m_prev = controller.m_prev;
		}
		if(controller.m_prev){
			controller.m_prev.m_next = controller.m_next;
		}
		if(controller == this.m_controllerList){
			this.m_controllerList = controller.m_next;
		}
		--this.m_controllerCount;
	}

	public SetWarmStarting(flag:boolean) : void{
		b2World.m_warmStarting = flag;
	}

	public SetContinuousPhysics(flag:boolean) : void{
		b2World.m_continuousPhysics = flag;
	}

	public GetBodyCount() : number{
		return this.m_bodyCount;
	}

	public GetJointCount() : number{
		return this.m_jointCount;
	}

	public GetContactCount() : number{
		return this.m_contactCount;
	}

	public SetGravity(gravity:b2Vec2) : void{
		this.m_gravity = gravity;
	}

	public GetGravity() : b2Vec2{
		return this.m_gravity;
	}

	public GetGroundBody() : b2Body | null{
		return this.m_groundBody;
	}

	public Step(dt:number, velocityIterations:number, positionIterations:number) : void{
		if(this.m_flags & b2World.e_newFixture){
			this.m_contactManager.FindNewContacts();
			this.m_flags &= ~b2World.e_newFixture;
		}
		this.m_flags |= b2World.e_locked;
		var step:b2TimeStep = b2World.s_timestep2;
		step.dt = dt;
		step.velocityIterations = velocityIterations;
		step.positionIterations = positionIterations;
		if(dt > 0){
			step.inv_dt = 1 / dt;
		}
		else{
			step.inv_dt = 0;
		}
		step.dtRatio = this.m_inv_dt0 * dt;
		step.warmStarting = b2World.m_warmStarting;
		this.m_contactManager.Collide();
		if(step.dt > 0){
			this.Solve(step);
		}
		if(b2World.m_continuousPhysics && step.dt > 0){
			this.SolveTOI(step);
		}
		if(step.dt > 0){
			this.m_inv_dt0 = step.inv_dt;
		}
		this.m_flags &= ~b2World.e_locked;
	}

	public ClearForces() : void{
		var b:b2Body | null = this.m_bodyList;
		while(b){
			b.m_force.SetZero();
			b.m_torque = 0;
			b = b.m_next;
		}
	}

	public DrawDebugData() : void{
		var i:number = 0;
		var b:b2Body | null = null;
		var f:b2Fixture | null = null;
		var s:b2Shape = null!;
		var j:b2Joint | null = null;
		var bp:IBroadPhase = null!;
		var xf:b2Transform = null!;
		var controller:b2Controller | null = null;
		var contact:b2Contact | null = null;
		var fixtureA:b2Fixture = null!;
		var fixtureB:b2Fixture = null!;
		var cA:b2Vec2 = null!;
		var cB:b2Vec2 = null!;
		var aabb:b2AABB = null!;
		if(this.m_debugDraw == null){
			return;
		}
		this.m_debugDraw.m_sprite.graphics.clear();
		var flags:number = this.m_debugDraw.GetFlags();
		var v1:b2Vec2 = new b2Vec2();
		var v2:b2Vec2 = new b2Vec2();
		var v3:b2Vec2 = new b2Vec2();
		var b1:b2AABB = new b2AABB();
		var b2:b2AABB = new b2AABB();
		var vs:b2Vec2[] = [new b2Vec2(),new b2Vec2(),new b2Vec2(),new b2Vec2()];
		var color:b2Color = new b2Color(0,0,0);
		if(flags & b2DebugDraw.e_shapeBit){
			b = this.m_bodyList;
			while(b){
				xf = b.m_xf;
				f = b.GetFixtureList();
				while(f){
					s = f.GetShape();
					if(b.IsActive() == false){
						color.Set(0.5,0.5,0.3);
						this.DrawShape(s,xf,color);
					}
					else if(b.GetType() == b2Body.b2_staticBody){
						color.Set(0.5,0.9,0.5);
						this.DrawShape(s,xf,color);
					}
					else if(b.GetType() == b2Body.b2_kinematicBody){
						color.Set(0.5,0.5,0.9);
						this.DrawShape(s,xf,color);
					}
					else if(b.IsAwake() == false){
						color.Set(0.6,0.6,0.6);
						this.DrawShape(s,xf,color);
					}
					else{
						color.Set(0.9,0.7,0.7);
						this.DrawShape(s,xf,color);
					}
					f = f.m_next;
				}
				b = b.m_next;
			}
		}
		if(flags & b2DebugDraw.e_jointBit){
			j = this.m_jointList;
			while(j){
				this.DrawJoint(j);
				j = j.m_next;
			}
		}
		if(flags & b2DebugDraw.e_controllerBit){
			controller = this.m_controllerList;
			while(controller){
				controller.Draw(this.m_debugDraw);
				controller = controller.m_next;
			}
		}
		if(flags & b2DebugDraw.e_pairBit){
			color.Set(0.3,0.9,0.9);
			contact = this.m_contactManager.m_contactList;
			while(contact){
				fixtureA = contact.GetFixtureA();
				fixtureB = contact.GetFixtureB();
				cA = fixtureA.GetAABB().GetCenter();
				cB = fixtureB.GetAABB().GetCenter();
				this.m_debugDraw.DrawSegment(cA,cB,color);
				contact = contact.GetNext();
			}
		}
		if(flags & b2DebugDraw.e_aabbBit){
			bp = this.m_contactManager.m_broadPhase;
			vs = [new b2Vec2(),new b2Vec2(),new b2Vec2(),new b2Vec2()];
			b = this.m_bodyList;
			while(b){
				if(b.IsActive() != false){
					f = b.GetFixtureList();
					while(f){
						aabb = bp.GetFatAABB(f.m_proxy);
						vs[0].Set(aabb.lowerBound.x,aabb.lowerBound.y);
						vs[1].Set(aabb.upperBound.x,aabb.lowerBound.y);
						vs[2].Set(aabb.upperBound.x,aabb.upperBound.y);
						vs[3].Set(aabb.lowerBound.x,aabb.upperBound.y);
						this.m_debugDraw.DrawPolygon(vs,4,color);
						f = f.GetNext();
					}
				}
				b = b.GetNext();
			}
		}
		if(flags & b2DebugDraw.e_centerOfMassBit){
			b = this.m_bodyList;
			while(b){
				xf = b2World.s_xf;
				xf.R = b.m_xf.R;
				xf.position = b.GetWorldCenter();
				this.m_debugDraw.DrawTransform(xf);
				b = b.m_next;
			}
		}
	}

	public QueryAABB(callback:Function, aabb:b2AABB) : void{
		let broadPhase:IBroadPhase = null!;
		const WorldQueryWrapper = (proxy:any):boolean => {
			return callback(broadPhase.GetUserData(proxy));
		};
		broadPhase = this.m_contactManager.m_broadPhase;
		broadPhase.Query(WorldQueryWrapper,aabb);
	}

	public QueryShape(callback:Function, shape:b2Shape, transform:b2Transform | null = null) : void{
		let broadPhase:IBroadPhase = null!;
		const WorldQueryWrapper = (proxy:any):boolean => {
			var fixture:b2Fixture = broadPhase.GetUserData(proxy) as b2Fixture;
			if(b2Shape.TestOverlap(shape,transform!,fixture.GetShape(),fixture.GetBody().GetTransform())){
				return callback(fixture);
			}
			return true;
		};
		if(transform == null){
			transform = new b2Transform();
			transform.SetIdentity();
		}
		broadPhase = this.m_contactManager.m_broadPhase;
		var aabb:b2AABB = new b2AABB();
		shape.ComputeAABB(aabb,transform);
		broadPhase.Query(WorldQueryWrapper,aabb);
	}

	public QueryPoint(callback:Function, p:b2Vec2) : void{
		let broadPhase:IBroadPhase = null!;
		const WorldQueryWrapper = (proxy:any):boolean => {
			var fixture:b2Fixture = broadPhase.GetUserData(proxy) as b2Fixture;
			if(fixture.TestPoint(p)){
				return callback(fixture);
			}
			return true;
		};
		broadPhase = this.m_contactManager.m_broadPhase;
		var aabb:b2AABB = new b2AABB();
		aabb.lowerBound.Set(p.x - b2Settings.b2_linearSlop,p.y - b2Settings.b2_linearSlop);
		aabb.upperBound.Set(p.x + b2Settings.b2_linearSlop,p.y + b2Settings.b2_linearSlop);
		broadPhase.Query(WorldQueryWrapper,aabb);
	}

	public RayCast(callback:Function, point1:b2Vec2, point2:b2Vec2) : void{
		let broadPhase:IBroadPhase = null!;
		let output:b2RayCastOutput = null!;
		const RayCastWrapper = (input:b2RayCastInput, proxy:any):number => {
			var fraction:number = NaN;
			var point:b2Vec2 = null!;
			var userData:any = broadPhase.GetUserData(proxy);
			var fixture:b2Fixture = userData as b2Fixture;
			var hit:boolean = fixture.RayCast(output,input);
			if(hit){
				fraction = output.fraction;
				point = new b2Vec2((1 - fraction) * point1.x + fraction * point2.x,(1 - fraction) * point1.y + fraction * point2.y);
				return callback(fixture,point,output.normal,fraction);
			}
			return input.maxFraction;
		};
		broadPhase = this.m_contactManager.m_broadPhase;
		output = new b2RayCastOutput();
		var input:b2RayCastInput = new b2RayCastInput(point1,point2);
		broadPhase.RayCast(RayCastWrapper,input);
	}

	public RayCastOne(point1:b2Vec2, point2:b2Vec2) : b2Fixture | null{
		let result:b2Fixture | null = null;
		const RayCastOneWrapper = (fixture:b2Fixture, point:b2Vec2, normal:b2Vec2, fraction:number):number => {
			result = fixture;
			return fraction;
		};
		this.RayCast(RayCastOneWrapper,point1,point2);
		return result;
	}

	public RayCastAll(point1:b2Vec2, point2:b2Vec2) : b2Fixture[]{
		let result:b2Fixture[] = null!;
		const RayCastAllWrapper = (fixture:b2Fixture, point:b2Vec2, normal:b2Vec2, fraction:number):number => {
			result[result.length] = fixture;
			return 1;
		};
		result = new Array<b2Fixture>();
		this.RayCast(RayCastAllWrapper,point1,point2);
		return result;
	}

	public GetBodyList() : b2Body | null{
		return this.m_bodyList;
	}

	public GetJointList() : b2Joint | null{
		return this.m_jointList;
	}

	public GetContactList() : b2Contact | null{
		return this.m_contactList;
	}

	public IsLocked() : boolean{
		return (this.m_flags & b2World.e_locked) > 0;
	}

	public Solve(step:b2TimeStep) : void{
		var b:b2Body | null = null;
		var stackCount:number = 0;
		var i:number = 0;
		var other:b2Body = null!;
		var ce:b2ContactEdge | null = null;
		var jn:b2JointEdge | null = null;
		var controller:b2Controller | null = this.m_controllerList;
		while(controller){
			controller.Step(step);
			controller = controller.m_next;
		}
		var island:b2Island = this.m_island;
		island.Initialize(this.m_bodyCount,this.m_contactCount,this.m_jointCount,null,this.m_contactManager.m_contactListener,this.m_contactSolver);
		b = this.m_bodyList;
		while(b){
			b.m_flags &= ~b2Body.e_islandFlag;
			b = b.m_next;
		}
		var c:b2Contact | null = this.m_contactList;
		while(c){
			c.m_flags &= ~b2Contact.e_islandFlag;
			c = c.m_next;
		}
		var joint:b2Joint | null = this.m_jointList;
		while(joint){
			joint.m_islandFlag = false;
			joint = joint.m_next;
		}
		var stackSize:number = this.m_bodyCount;
		var stack:b2Body[] = this.s_stack;
		var seed:b2Body | null = this.m_bodyList;
		while(seed){
			if(!(seed.m_flags & b2Body.e_islandFlag)){
				if(!(seed.IsAwake() == false || seed.IsActive() == false)){
					if(seed.GetType() != b2Body.b2_staticBody){
						island.Clear();
						stackCount = 0;
						stack[stackCount++] = seed;
						seed.m_flags |= b2Body.e_islandFlag;
						while(stackCount > 0){
							b = stack[--stackCount];
							island.AddBody(b!);
							if(b!.IsAwake() == false){
								b!.SetAwake(true);
							}
							if(b!.GetType() != b2Body.b2_staticBody){
								ce = b!.m_contactList;
								while(ce){
									if(!(ce.contact!.m_flags & b2Contact.e_islandFlag)){
										if(!(ce.contact!.IsSensor() == true || ce.contact!.IsEnabled() == false || ce.contact!.IsTouching() == false)){
											island.AddContact(ce.contact!);
											ce.contact!.m_flags |= b2Contact.e_islandFlag;
											other = ce.other!;
											if(!(other.m_flags & b2Body.e_islandFlag)){
												stack[stackCount++] = other;
												other.m_flags |= b2Body.e_islandFlag;
											}
										}
									}
									ce = ce.next;
								}
								jn = b!.m_jointList;
								while(jn){
									if(jn.joint!.m_islandFlag != true){
										other = jn.other!;
										if(other.IsActive() != false){
											island.AddJoint(jn.joint!);
											jn.joint!.m_islandFlag = true;
											if(!(other.m_flags & b2Body.e_islandFlag)){
												stack[stackCount++] = other;
												other.m_flags |= b2Body.e_islandFlag;
											}
										}
									}
									jn = jn.next;
								}
							}
						}
						island.Solve(step,this.m_gravity,this.m_allowSleep);
						i = 0;
						while(i < island.m_bodyCount){
							b = island.m_bodies[i];
							if(b!.GetType() == b2Body.b2_staticBody){
								b!.m_flags &= ~b2Body.e_islandFlag;
							}
							i++;
						}
					}
				}
			}
			seed = seed.m_next;
		}
		i = 0;
		while(i < stack.length){
			if(!stack[i]){
				break;
			}
			stack[i] = null!;
			i++;
		}
		b = this.m_bodyList;
		while(b){
			if(!(b.IsAwake() == false || b.IsActive() == false)){
				if(b.GetType() != b2Body.b2_staticBody){
					b.SynchronizeFixtures();
				}
			}
			b = b.m_next;
		}
		this.m_contactManager.FindNewContacts();
	}

	public SolveTOI(step:b2TimeStep) : void{
		var b:b2Body | null = null;
		var fixtureA:b2Fixture = null!;
		var fixtureB:b2Fixture = null!;
		var bodyA:b2Body = null!;
		var bodyB:b2Body = null!;
		var ce:b2ContactEdge | null = null;
		var j:b2Joint | null = null;
		var c:b2Contact | null = null;
		var toiContact:b2Contact | null = null;
		var toi:number = NaN;
		var seed:b2Body = null!;
		var queueStart:number = 0;
		var queueSize:number = 0;
		var subStep:b2TimeStep = null!;
		var i:number = 0;
		var toiLocal:number = NaN;
		var t0:number = NaN;
		var jn:b2JointEdge | null = null;
		var other:b2Body = null!;
		var island:b2Island = this.m_island;
		island.Initialize(this.m_bodyCount,b2Settings.b2_maxTOIContactsPerIsland,b2Settings.b2_maxTOIJointsPerIsland,null,this.m_contactManager.m_contactListener,this.m_contactSolver);
		var queue:b2Body[] = b2World.s_queue;
		b = this.m_bodyList;
		while(b){
			b.m_flags &= ~b2Body.e_islandFlag;
			b.m_sweep.t0 = 0;
			b = b.m_next;
		}
		c = this.m_contactList;
		while(c){
			c.m_flags &= ~(b2Contact.e_toiFlag | b2Contact.e_islandFlag);
			c = c.m_next;
		}
		j = this.m_jointList;
		while(j){
			j.m_islandFlag = false;
			j = j.m_next;
		}
		while(true){
			toiContact = null;
			toi = 1;
			c = this.m_contactList;
			for(; c; c = c.m_next){
				if(!(c.IsSensor() == true || c.IsEnabled() == false || c.IsContinuous() == false)){
					toiLocal = 1;
					if(c.m_flags & b2Contact.e_toiFlag){
						toiLocal = c.m_toi;
					}
					else{
						fixtureA = c.m_fixtureA!;
						fixtureB = c.m_fixtureB!;
						bodyA = fixtureA.m_body;
						bodyB = fixtureB.m_body;
						if((bodyA.GetType() != b2Body.b2_dynamicBody || bodyA.IsAwake() == false) && (bodyB.GetType() != b2Body.b2_dynamicBody || bodyB.IsAwake() == false)){
							continue;
						}
						t0 = bodyA.m_sweep.t0;
						if(bodyA.m_sweep.t0 < bodyB.m_sweep.t0){
							t0 = bodyB.m_sweep.t0;
							bodyA.m_sweep.Advance(t0);
						}
						else if(bodyB.m_sweep.t0 < bodyA.m_sweep.t0){
							t0 = bodyA.m_sweep.t0;
							bodyB.m_sweep.Advance(t0);
						}
						toiLocal = c.ComputeTOI(bodyA.m_sweep,bodyB.m_sweep);
						b2Settings.b2Assert(0 <= toiLocal && toiLocal <= 1);
						if(toiLocal > 0 && toiLocal < 1){
							toiLocal = (1 - toiLocal) * t0 + toiLocal;
							if(toiLocal > 1){
								toiLocal = 1;
							}
						}
						c.m_toi = toiLocal;
						c.m_flags |= b2Contact.e_toiFlag;
					}
					if(Number.MIN_VALUE < toiLocal && toiLocal < toi){
						toiContact = c;
						toi = toiLocal;
					}
				}
			}
			if(toiContact == null || 1 - 100 * Number.MIN_VALUE < toi){
				break;
			}
			fixtureA = toiContact.m_fixtureA!;
			fixtureB = toiContact.m_fixtureB!;
			bodyA = fixtureA.m_body;
			bodyB = fixtureB.m_body;
			b2World.s_backupA.Set(bodyA.m_sweep);
			b2World.s_backupB.Set(bodyB.m_sweep);
			bodyA.Advance(toi);
			bodyB.Advance(toi);
			toiContact.Update(this.m_contactManager.m_contactListener);
			toiContact.m_flags &= ~b2Contact.e_toiFlag;
			if(toiContact.IsSensor() == true || toiContact.IsEnabled() == false){
				bodyA.m_sweep.Set(b2World.s_backupA);
				bodyB.m_sweep.Set(b2World.s_backupB);
				bodyA.SynchronizeTransform();
				bodyB.SynchronizeTransform();
			}
			else if(toiContact.IsTouching() != false){
				seed = bodyA;
				if(seed.GetType() != b2Body.b2_dynamicBody){
					seed = bodyB;
				}
				island.Clear();
				queueStart = 0;
				queueSize = 0;
				queue[queueStart + queueSize++] = seed;
				seed.m_flags |= b2Body.e_islandFlag;
				while(queueSize > 0){
					b = queue[queueStart++];
					queueSize--;
					island.AddBody(b!);
					if(b!.IsAwake() == false){
						b!.SetAwake(true);
					}
					if(b!.GetType() == b2Body.b2_dynamicBody){
						ce = b!.m_contactList;
						while(ce){
							if(island.m_contactCount == island.m_contactCapacity){
								break;
							}
							if(!(ce.contact!.m_flags & b2Contact.e_islandFlag)){
								if(!(ce.contact!.IsSensor() == true || ce.contact!.IsEnabled() == false || ce.contact!.IsTouching() == false)){
									island.AddContact(ce.contact!);
									ce.contact!.m_flags |= b2Contact.e_islandFlag;
									other = ce.other!;
									if(!(other.m_flags & b2Body.e_islandFlag)){
										if(other.GetType() != b2Body.b2_staticBody){
											other.Advance(toi);
											other.SetAwake(true);
										}
										queue[queueStart + queueSize] = other;
										queueSize++;
										other.m_flags |= b2Body.e_islandFlag;
									}
								}
							}
							ce = ce.next;
						}
						jn = b!.m_jointList;
						while(jn){
							if(island.m_jointCount != island.m_jointCapacity){
								if(jn.joint!.m_islandFlag != true){
									other = jn.other!;
									if(other.IsActive() != false){
										island.AddJoint(jn.joint!);
										jn.joint!.m_islandFlag = true;
										if(!(other.m_flags & b2Body.e_islandFlag)){
											if(other.GetType() != b2Body.b2_staticBody){
												other.Advance(toi);
												other.SetAwake(true);
											}
											queue[queueStart + queueSize] = other;
											queueSize++;
											other.m_flags |= b2Body.e_islandFlag;
										}
									}
								}
							}
							jn = jn.next;
						}
					}
				}
				subStep = b2World.s_timestep;
				subStep.warmStarting = false;
				subStep.dt = (1 - toi) * step.dt;
				subStep.inv_dt = 1 / subStep.dt;
				subStep.dtRatio = 0;
				subStep.velocityIterations = step.velocityIterations;
				subStep.positionIterations = step.positionIterations;
				island.SolveTOI(subStep);
				i = 0;
				while(i < island.m_bodyCount){
					b = island.m_bodies[i];
					b!.m_flags &= ~b2Body.e_islandFlag;
					if(b!.IsAwake() != false){
						if(b!.GetType() == b2Body.b2_dynamicBody){
							b!.SynchronizeFixtures();
							ce = b!.m_contactList;
							while(ce){
								ce.contact!.m_flags &= ~b2Contact.e_toiFlag;
								ce = ce.next;
							}
						}
					}
					i++;
				}
				i = 0;
				while(i < island.m_contactCount){
					c = island.m_contacts[i];
					c!.m_flags &= ~(b2Contact.e_toiFlag | b2Contact.e_islandFlag);
					i++;
				}
				i = 0;
				while(i < island.m_jointCount){
					j = island.m_joints[i];
					j!.m_islandFlag = false;
					i++;
				}
				this.m_contactManager.FindNewContacts();
			}
		}
	}

	public DrawJoint(j:b2Joint) : void{
		var pulley:b2PulleyJoint = null!;
		var s1:b2Vec2 = null!;
		var s2:b2Vec2 = null!;
		var b1:b2Body = j.GetBodyA();
		var b2:b2Body = j.GetBodyB();
		var xf1:b2Transform = b1.m_xf;
		var xf2:b2Transform = b2.m_xf;
		var x1:b2Vec2 = xf1.position;
		var x2:b2Vec2 = xf2.position;
		var p1:b2Vec2 = j.GetAnchorA();
		var p2:b2Vec2 = j.GetAnchorB();
		var color:b2Color = b2World.s_jointColor;
		switch(j.m_type){
			case b2Joint.e_distanceJoint:
				this.m_debugDraw.DrawSegment(p1,p2,color);
				break;
			case b2Joint.e_pulleyJoint:
				pulley = j as b2PulleyJoint;
				s1 = pulley.GetGroundAnchorA();
				s2 = pulley.GetGroundAnchorB();
				this.m_debugDraw.DrawSegment(s1,p1,color);
				this.m_debugDraw.DrawSegment(s2,p2,color);
				this.m_debugDraw.DrawSegment(s1,s2,color);
				break;
			case b2Joint.e_mouseJoint:
				this.m_debugDraw.DrawSegment(p1,p2,color);
				break;
			default:
				if(b1 != this.m_groundBody){
					this.m_debugDraw.DrawSegment(x1,p1,color);
				}
				this.m_debugDraw.DrawSegment(p1,p2,color);
				if(b2 != this.m_groundBody){
					this.m_debugDraw.DrawSegment(x2,p2,color);
				}
		}
	}

	public DrawShape(shape:b2Shape, xf:b2Transform, color:b2Color) : void{
		var circle:b2CircleShape = null!;
		var center:b2Vec2 = null!;
		var radius:number = NaN;
		var axis:b2Vec2 = null!;
		var i:number = 0;
		var poly:b2PolygonShape = null!;
		var vertexCount:number = 0;
		var localVertices:b2Vec2[] = null!;
		var vertices:b2Vec2[] = null!;
		var edge:b2EdgeShape = null!;
		switch(shape.m_type){
			case b2Shape.e_circleShape:
				circle = shape as b2CircleShape;
				center = b2Math.MulX(xf,circle.m_p);
				radius = circle.m_radius;
				axis = xf.R.col1;
				this.m_debugDraw.DrawSolidCircle(center,radius,axis,color);
				break;
			case b2Shape.e_polygonShape:
				poly = shape as b2PolygonShape;
				vertexCount = poly.GetVertexCount();
				localVertices = poly.GetVertices();
				vertices = new Array<b2Vec2>(vertexCount);
				i = 0;
				while(i < vertexCount){
					vertices[i] = b2Math.MulX(xf,localVertices[i]);
					i++;
				}
				this.m_debugDraw.DrawSolidPolygon(vertices,vertexCount,color);
				break;
			case b2Shape.e_edgeShape:
				edge = shape as b2EdgeShape;
				this.m_debugDraw.DrawSegment(b2Math.MulX(xf,edge.GetVertex1()),b2Math.MulX(xf,edge.GetVertex2()),color);
		}
	}
}
