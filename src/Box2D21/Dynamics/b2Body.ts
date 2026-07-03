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

import { b2BodyDef, b2Contact, b2ContactEdge, b2ControllerEdge, b2EdgeShape, b2Fixture, b2FixtureDef, IBroadPhase, b2JointEdge, b2MassData, b2Mat22, b2Math, b2Settings, b2Shape, b2Sweep, b2Transform, b2Vec2, b2World } from "..";

export class b2Body
{

	private static s_xf1:b2Transform = new b2Transform();

	public static e_islandFlag:number = 1;

	public static e_awakeFlag:number = 2;

	public static e_allowSleepFlag:number = 4;

	public static e_bulletFlag:number = 8;

	public static e_fixedRotationFlag:number = 16;

	public static e_activeFlag:number = 32;

	public static b2_staticBody:number = 0;

	public static b2_kinematicBody:number = 1;

	public static b2_dynamicBody:number = 2;

	public m_flags:number;

	public m_type:number;

	public m_islandIndex:number = 0;

	public m_xf:b2Transform = new b2Transform();

	public m_sweep:b2Sweep = new b2Sweep();

	public m_linearVelocity:b2Vec2 = new b2Vec2();

	public m_angularVelocity:number;

	public m_force:b2Vec2 = new b2Vec2();

	public m_torque:number;

	public m_world:b2World;

	public m_prev:b2Body | null = null;

	public m_next:b2Body | null = null;

	public m_fixtureList:b2Fixture | null = null;

	public m_fixtureCount:number;

	public m_controllerList:b2ControllerEdge | null = null;

	public m_controllerCount:number;

	public m_jointList:b2JointEdge | null = null;

	public m_contactList:b2ContactEdge | null = null;

	public m_mass:number;

	public m_invMass:number;

	public m_I:number;

	public m_invI:number;

	public m_inertiaScale:number;

	public m_linearDamping:number;

	public m_angularDamping:number;

	public m_sleepTime:number;

	private m_userData:any;

	constructor(bd:b2BodyDef, world:b2World){
		this.m_flags = 0;
		if(bd.bullet){
			this.m_flags |= b2Body.e_bulletFlag;
		}
		if(bd.fixedRotation){
			this.m_flags |= b2Body.e_fixedRotationFlag;
		}
		if(bd.allowSleep){
			this.m_flags |= b2Body.e_allowSleepFlag;
		}
		if(bd.awake){
			this.m_flags |= b2Body.e_awakeFlag;
		}
		if(bd.active){
			this.m_flags |= b2Body.e_activeFlag;
		}
		this.m_world = world;
		this.m_xf.position.SetV(bd.position);
		this.m_xf.R.Set(bd.angle);
		this.m_sweep.localCenter.SetZero();
		this.m_sweep.t0 = 1;
		this.m_sweep.a0 = this.m_sweep.a = bd.angle;
		var tMat:b2Mat22 = this.m_xf.R;
		var tVec:b2Vec2 = this.m_sweep.localCenter;
		this.m_sweep.c.x = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
		this.m_sweep.c.y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
		this.m_sweep.c.x += this.m_xf.position.x;
		this.m_sweep.c.y += this.m_xf.position.y;
		this.m_sweep.c0.SetV(this.m_sweep.c);
		this.m_jointList = null;
		this.m_controllerList = null;
		this.m_contactList = null;
		this.m_controllerCount = 0;
		this.m_prev = null;
		this.m_next = null;
		this.m_linearVelocity.SetV(bd.linearVelocity);
		this.m_angularVelocity = bd.angularVelocity;
		this.m_linearDamping = bd.linearDamping;
		this.m_angularDamping = bd.angularDamping;
		this.m_force.Set(0,0);
		this.m_torque = 0;
		this.m_sleepTime = 0;
		this.m_type = bd.type;
		if(this.m_type == b2Body.b2_dynamicBody){
			this.m_mass = 1;
			this.m_invMass = 1;
		}
		else{
			this.m_mass = 0;
			this.m_invMass = 0;
		}
		this.m_I = 0;
		this.m_invI = 0;
		this.m_inertiaScale = bd.inertiaScale;
		this.m_userData = bd.userData;
		this.m_fixtureList = null;
		this.m_fixtureCount = 0;
	}

	private connectEdges(e1:b2EdgeShape, e2:b2EdgeShape, angle1:number) : number{
		var angle2:number = Math.atan2(e2.GetDirectionVector().y,e2.GetDirectionVector().x);
		var coreOffset:number = Math.tan((angle2 - angle1) * 0.5);
		var core:b2Vec2 = b2Math.MulFV(coreOffset,e2.GetDirectionVector());
		core = b2Math.SubtractVV(core,e2.GetNormalVector());
		core = b2Math.MulFV(b2Settings.b2_toiSlop,core);
		core = b2Math.AddVV(core,e2.GetVertex1());
		var cornerDir:b2Vec2 = b2Math.AddVV(e1.GetDirectionVector(),e2.GetDirectionVector());
		cornerDir.Normalize();
		var convex:boolean = b2Math.Dot(e1.GetDirectionVector(),e2.GetNormalVector()) > 0;
		e1.SetNextEdge(e2,core,cornerDir,convex);
		e2.SetPrevEdge(e1,core,cornerDir,convex);
		return angle2;
	}

	public CreateFixture(def:b2FixtureDef) : b2Fixture | null{
		var broadPhase:IBroadPhase = null!;
		if(this.m_world.IsLocked() == true){
			return null;
		}
		var fixture:b2Fixture = new b2Fixture();
		fixture.Create(this,this.m_xf,def);
		if(this.m_flags & b2Body.e_activeFlag){
			broadPhase = this.m_world.m_contactManager.m_broadPhase;
			fixture.CreateProxy(broadPhase,this.m_xf);
		}
		fixture.m_next = this.m_fixtureList;
		this.m_fixtureList = fixture;
		++this.m_fixtureCount;
		fixture.m_body = this;
		if(fixture.m_density > 0){
			this.ResetMassData();
		}
		this.m_world.m_flags |= b2World.e_newFixture;
		return fixture;
	}

	public CreateFixture2(shape:b2Shape, density:number = 0) : b2Fixture | null{
		var def:b2FixtureDef = new b2FixtureDef();
		def.shape = shape;
		def.density = density;
		return this.CreateFixture(def);
	}

	public DestroyFixture(fixture:b2Fixture) : void{
		var c:b2Contact = null!;
		var fixtureA:b2Fixture = null!;
		var fixtureB:b2Fixture = null!;
		var broadPhase:IBroadPhase = null!;
		if(this.m_world.IsLocked() == true){
			return;
		}
		var node:b2Fixture | null = this.m_fixtureList;
		var ppF:b2Fixture | null = null;
		var found:boolean = false;
		while(node != null){
			if(node == fixture){
				if(ppF){
					ppF.m_next = fixture.m_next;
				}
				else{
					this.m_fixtureList = fixture.m_next;
				}
				found = true;
				break;
			}
			ppF = node;
			node = node.m_next;
		}
		var edge:b2ContactEdge | null = this.m_contactList;
		while(edge){
			c = edge.contact!;
			edge = edge.next;
			fixtureA = c.GetFixtureA();
			fixtureB = c.GetFixtureB();
			if(fixture == fixtureA || fixture == fixtureB){
				this.m_world.m_contactManager.Destroy(c);
			}
		}
		if(this.m_flags & b2Body.e_activeFlag){
			broadPhase = this.m_world.m_contactManager.m_broadPhase;
			fixture.DestroyProxy(broadPhase);
		}
		fixture.Destroy();
		fixture.m_body = null!;
		fixture.m_next = null;
		--this.m_fixtureCount;
		this.ResetMassData();
	}

	public SetPositionAndAngle(position:b2Vec2, angle:number) : void{
		var f:b2Fixture | null = null;
		if(this.m_world.IsLocked() == true){
			return;
		}
		this.m_xf.R.Set(angle);
		this.m_xf.position.SetV(position);
		var tMat:b2Mat22 = this.m_xf.R;
		var tVec:b2Vec2 = this.m_sweep.localCenter;
		this.m_sweep.c.x = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
		this.m_sweep.c.y = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
		this.m_sweep.c.x += this.m_xf.position.x;
		this.m_sweep.c.y += this.m_xf.position.y;
		this.m_sweep.c0.SetV(this.m_sweep.c);
		this.m_sweep.a0 = this.m_sweep.a = angle;
		var broadPhase:IBroadPhase = this.m_world.m_contactManager.m_broadPhase;
		f = this.m_fixtureList;
		while(f){
			f.Synchronize(broadPhase,this.m_xf,this.m_xf);
			f = f.m_next;
		}
		this.m_world.m_contactManager.FindNewContacts();
	}

	public SetTransform(xf:b2Transform) : void{
		this.SetPositionAndAngle(xf.position,xf.GetAngle());
	}

	public GetTransform() : b2Transform{
		return this.m_xf;
	}

	public GetPosition() : b2Vec2{
		return this.m_xf.position;
	}

	public SetPosition(position:b2Vec2) : void{
		this.SetPositionAndAngle(position,this.GetAngle());
	}

	public GetAngle() : number{
		return this.m_sweep.a;
	}

	public SetAngle(angle:number) : void{
		this.SetPositionAndAngle(this.GetPosition(),angle);
	}

	public GetWorldCenter() : b2Vec2{
		return this.m_sweep.c;
	}

	public GetLocalCenter() : b2Vec2{
		return this.m_sweep.localCenter;
	}

	public SetLinearVelocity(v:b2Vec2) : void{
		if(this.m_type == b2Body.b2_staticBody){
			return;
		}
		this.m_linearVelocity.SetV(v);
	}

	public GetLinearVelocity() : b2Vec2{
		return this.m_linearVelocity;
	}

	public SetAngularVelocity(omega:number) : void{
		if(this.m_type == b2Body.b2_staticBody){
			return;
		}
		this.m_angularVelocity = omega;
	}

	public GetAngularVelocity() : number{
		return this.m_angularVelocity;
	}

	public GetDefinition() : b2BodyDef{
		var bd:b2BodyDef = new b2BodyDef();
		bd.type = this.GetType();
		bd.allowSleep = (this.m_flags & b2Body.e_allowSleepFlag) == b2Body.e_allowSleepFlag;
		bd.angle = this.GetAngle();
		bd.angularDamping = this.m_angularDamping;
		bd.angularVelocity = this.m_angularVelocity;
		bd.fixedRotation = (this.m_flags & b2Body.e_fixedRotationFlag) == b2Body.e_fixedRotationFlag;
		bd.bullet = (this.m_flags & b2Body.e_bulletFlag) == b2Body.e_bulletFlag;
		bd.awake = (this.m_flags & b2Body.e_awakeFlag) == b2Body.e_awakeFlag;
		bd.linearDamping = this.m_linearDamping;
		bd.linearVelocity.SetV(this.GetLinearVelocity());
		bd.position = this.GetPosition();
		bd.userData = this.GetUserData();
		return bd;
	}

	public ApplyForce(force:b2Vec2, point:b2Vec2) : void{
		if(this.m_type != b2Body.b2_dynamicBody){
			return;
		}
		if(this.IsAwake() == false){
			this.SetAwake(true);
		}
		this.m_force.x += force.x;
		this.m_force.y += force.y;
		this.m_torque += (point.x - this.m_sweep.c.x) * force.y - (point.y - this.m_sweep.c.y) * force.x;
	}

	public ApplyTorque(torque:number) : void{
		if(this.m_type != b2Body.b2_dynamicBody){
			return;
		}
		if(this.IsAwake() == false){
			this.SetAwake(true);
		}
		this.m_torque += torque;
	}

	public ApplyImpulse(impulse:b2Vec2, point:b2Vec2) : void{
		if(this.m_type != b2Body.b2_dynamicBody){
			return;
		}
		if(this.IsAwake() == false){
			this.SetAwake(true);
		}
		this.m_linearVelocity.x += this.m_invMass * impulse.x;
		this.m_linearVelocity.y += this.m_invMass * impulse.y;
		this.m_angularVelocity += this.m_invI * ((point.x - this.m_sweep.c.x) * impulse.y - (point.y - this.m_sweep.c.y) * impulse.x);
	}

	public Split(callback:Function) : b2Body{
		var prev:b2Fixture = null!;
		var next:b2Fixture = null!;
		var linearVelocity:b2Vec2 = this.GetLinearVelocity().Copy();
		var angularVelocity:number = this.GetAngularVelocity();
		var center:b2Vec2 = this.GetWorldCenter();
		var body1:b2Body = this;
		var body2:b2Body = this.m_world.CreateBody(this.GetDefinition())!;
		var f:b2Fixture | null = body1.m_fixtureList;
		while(f){
			if(callback(f)){
				next = f.m_next!;
				if(prev){
					prev.m_next = next;
				}
				else{
					body1.m_fixtureList = next;
				}
				--body1.m_fixtureCount;
				f.m_next = body2.m_fixtureList;
				body2.m_fixtureList = f;
				++body2.m_fixtureCount;
				f.m_body = body2;
				f = next;
			}
			else{
				prev = f;
				f = f.m_next;
			}
		}
		body1.ResetMassData();
		body2.ResetMassData();
		var center1:b2Vec2 = body1.GetWorldCenter();
		var center2:b2Vec2 = body2.GetWorldCenter();
		var velocity1:b2Vec2 = b2Math.AddVV(linearVelocity,b2Math.CrossFV(angularVelocity,b2Math.SubtractVV(center1,center)));
		var velocity2:b2Vec2 = b2Math.AddVV(linearVelocity,b2Math.CrossFV(angularVelocity,b2Math.SubtractVV(center2,center)));
		body1.SetLinearVelocity(velocity1);
		body2.SetLinearVelocity(velocity2);
		body1.SetAngularVelocity(angularVelocity);
		body2.SetAngularVelocity(angularVelocity);
		body1.SynchronizeFixtures();
		body2.SynchronizeFixtures();
		return body2;
	}

	public Merge(other:b2Body) : void{
		var f:b2Fixture | null = null;
		var body1:b2Body = null!;
		var body2:b2Body = null!;
		var next:b2Fixture = null!;
		f = other.m_fixtureList;
		while(f){
			next = f.m_next!;
			--other.m_fixtureCount;
			f.m_next = this.m_fixtureList;
			this.m_fixtureList = f;
			++this.m_fixtureCount;
			f.m_body = body2;
			f = next;
		}
		body1.m_fixtureCount = 0;
		body1 = this;
		body2 = other;
		var center1:b2Vec2 = body1.GetWorldCenter();
		var center2:b2Vec2 = body2.GetWorldCenter();
		var velocity1:b2Vec2 = body1.GetLinearVelocity().Copy();
		var velocity2:b2Vec2 = body2.GetLinearVelocity().Copy();
		var angularVelocity1:number = body1.GetAngularVelocity();
		var angularVelocity2:number = body2.GetAngularVelocity();
		body1.ResetMassData();
		this.SynchronizeFixtures();
	}

	public GetMass() : number{
		return this.m_mass;
	}

	public GetInertia() : number{
		return this.m_I;
	}

	public GetMassData(data:b2MassData) : void{
		data.mass = this.m_mass;
		data.I = this.m_I;
		data.center.SetV(this.m_sweep.localCenter);
	}

	public SetMassData(massData:b2MassData) : void{
		b2Settings.b2Assert(this.m_world.IsLocked() == false);
		if(this.m_world.IsLocked() == true){
			return;
		}
		if(this.m_type != b2Body.b2_dynamicBody){
			return;
		}
		this.m_invMass = 0;
		this.m_I = 0;
		this.m_invI = 0;
		this.m_mass = massData.mass;
		if(this.m_mass <= 0){
			this.m_mass = 1;
		}
		this.m_invMass = 1 / this.m_mass;
		if(massData.I > 0 && (this.m_flags & b2Body.e_fixedRotationFlag) == 0){
			this.m_I = massData.I - this.m_mass * (massData.center.x * massData.center.x + massData.center.y * massData.center.y);
			this.m_invI = 1 / this.m_I;
		}
		var oldCenter:b2Vec2 = this.m_sweep.c.Copy();
		this.m_sweep.localCenter.SetV(massData.center);
		this.m_sweep.c0.SetV(b2Math.MulX(this.m_xf,this.m_sweep.localCenter));
		this.m_sweep.c.SetV(this.m_sweep.c0);
		this.m_linearVelocity.x += this.m_angularVelocity * -(this.m_sweep.c.y - oldCenter.y);
		this.m_linearVelocity.y += this.m_angularVelocity * (this.m_sweep.c.x - oldCenter.x);
	}

	public ResetMassData() : void{
		var massData:b2MassData = null!;
		this.m_mass = 0;
		this.m_invMass = 0;
		this.m_I = 0;
		this.m_invI = 0;
		this.m_sweep.localCenter.SetZero();
		if(this.m_type == b2Body.b2_staticBody || this.m_type == b2Body.b2_kinematicBody){
			return;
		}
		var center:b2Vec2 = b2Vec2.Make(0,0);
		var f:b2Fixture | null = this.m_fixtureList;
		while(f){
			if(f.m_density != 0){
				massData = f.GetMassData();
				this.m_mass += massData.mass;
				center.x += massData.center.x * massData.mass;
				center.y += massData.center.y * massData.mass;
				this.m_I += massData.I;
			}
			f = f.m_next;
		}
		if(this.m_mass > 0){
			this.m_invMass = 1 / this.m_mass;
			center.x *= this.m_invMass;
			center.y *= this.m_invMass;
		}
		else{
			this.m_mass = 1;
			this.m_invMass = 1;
		}
		if(this.m_I > 0 && (this.m_flags & b2Body.e_fixedRotationFlag) == 0){
			this.m_I -= this.m_mass * (center.x * center.x + center.y * center.y);
			this.m_I *= this.m_inertiaScale;
			b2Settings.b2Assert(this.m_I > 0);
			this.m_invI = 1 / this.m_I;
		}
		else{
			this.m_I = 0;
			this.m_invI = 0;
		}
		var oldCenter:b2Vec2 = this.m_sweep.c.Copy();
		this.m_sweep.localCenter.SetV(center);
		this.m_sweep.c0.SetV(b2Math.MulX(this.m_xf,this.m_sweep.localCenter));
		this.m_sweep.c.SetV(this.m_sweep.c0);
		this.m_linearVelocity.x += this.m_angularVelocity * -(this.m_sweep.c.y - oldCenter.y);
		this.m_linearVelocity.y += this.m_angularVelocity * (this.m_sweep.c.x - oldCenter.x);
	}

	// `out` added for 2.0-compat: Box2DFlash 2.0.2's GetWorldPoint fills a caller-
	// supplied vector (the shared renderer, Draw.ts DrawJoint, relies on that).
	// Omitting `out` keeps the native 2.1a behaviour (returns a fresh vector).
	public GetWorldPoint(localPoint:b2Vec2, out:b2Vec2 | null = null) : b2Vec2{
		var tMat:b2Mat22 = this.m_xf.R;
		var v:b2Vec2 = out || new b2Vec2();
		v.x = tMat.col1.x * localPoint.x + tMat.col2.x * localPoint.y + this.m_xf.position.x;
		v.y = tMat.col1.y * localPoint.x + tMat.col2.y * localPoint.y + this.m_xf.position.y;
		return v;
	}

	// 2.0-compat read aliases for the shared, engine-agnostic renderer
	// (src/Game/Draw.ts). Box2DFlash 2.0.2 named the transform getter GetXForm
	// and exposed a per-body shape list; the renderer still calls those names.
	// GetShapeList returns the body's first fixture (the "shape handle" the parts
	// store under this engine); Draw resolves a fixture to its b2Shape at the
	// read boundary.
	public GetXForm() : b2Transform { return this.m_xf; }
	public GetShapeList() : b2Fixture | null { return this.m_fixtureList; }

	public GetWorldVector(localVector:b2Vec2) : b2Vec2{
		return b2Math.MulMV(this.m_xf.R,localVector);
	}

	public GetLocalPoint(worldPoint:b2Vec2) : b2Vec2{
		return b2Math.MulXT(this.m_xf,worldPoint);
	}

	public GetLocalVector(worldVector:b2Vec2) : b2Vec2{
		return b2Math.MulTMV(this.m_xf.R,worldVector);
	}

	public GetLinearVelocityFromWorldPoint(worldPoint:b2Vec2) : b2Vec2{
		return new b2Vec2(this.m_linearVelocity.x - this.m_angularVelocity * (worldPoint.y - this.m_sweep.c.y),this.m_linearVelocity.y + this.m_angularVelocity * (worldPoint.x - this.m_sweep.c.x));
	}

	public GetLinearVelocityFromLocalPoint(localPoint:b2Vec2) : b2Vec2{
		var tMat:b2Mat22 = this.m_xf.R;
		var v:b2Vec2 = new b2Vec2(tMat.col1.x * localPoint.x + tMat.col2.x * localPoint.y,tMat.col1.y * localPoint.x + tMat.col2.y * localPoint.y);
		v.x += this.m_xf.position.x;
		v.y += this.m_xf.position.y;
		return new b2Vec2(this.m_linearVelocity.x - this.m_angularVelocity * (v.y - this.m_sweep.c.y),this.m_linearVelocity.y + this.m_angularVelocity * (v.x - this.m_sweep.c.x));
	}

	public GetLinearDamping() : number{
		return this.m_linearDamping;
	}

	public SetLinearDamping(linearDamping:number) : void{
		this.m_linearDamping = linearDamping;
	}

	public GetAngularDamping() : number{
		return this.m_angularDamping;
	}

	public SetAngularDamping(angularDamping:number) : void{
		this.m_angularDamping = angularDamping;
	}

	public SetType(type:number) : void{
		if(this.m_type == type){
			return;
		}
		this.m_type = type;
		this.ResetMassData();
		if(this.m_type == b2Body.b2_staticBody){
			this.m_linearVelocity.SetZero();
			this.m_angularVelocity = 0;
		}
		this.SetAwake(true);
		this.m_force.SetZero();
		this.m_torque = 0;
		var edge:b2ContactEdge | null = this.m_contactList;
		while(edge){
			edge.contact!.FlagForFiltering();
			edge = edge.next;
		}
	}

	public GetType() : number{
		return this.m_type;
	}

	public SetBullet(flag:boolean) : void{
		if(flag){
			this.m_flags |= b2Body.e_bulletFlag;
		}
		else{
			this.m_flags &= ~b2Body.e_bulletFlag;
		}
	}

	public IsBullet() : boolean{
		return (this.m_flags & b2Body.e_bulletFlag) == b2Body.e_bulletFlag;
	}

	public SetSleepingAllowed(flag:boolean) : void{
		if(flag){
			this.m_flags |= b2Body.e_allowSleepFlag;
		}
		else{
			this.m_flags &= ~b2Body.e_allowSleepFlag;
			this.SetAwake(true);
		}
	}

	public SetAwake(flag:boolean) : void{
		if(flag){
			this.m_flags |= b2Body.e_awakeFlag;
			this.m_sleepTime = 0;
		}
		else{
			this.m_flags &= ~b2Body.e_awakeFlag;
			this.m_sleepTime = 0;
			this.m_linearVelocity.SetZero();
			this.m_angularVelocity = 0;
			this.m_force.SetZero();
			this.m_torque = 0;
		}
	}

	public IsAwake() : boolean{
		return (this.m_flags & b2Body.e_awakeFlag) == b2Body.e_awakeFlag;
	}

	public SetFixedRotation(fixed:boolean) : void{
		if(fixed){
			this.m_flags |= b2Body.e_fixedRotationFlag;
		}
		else{
			this.m_flags &= ~b2Body.e_fixedRotationFlag;
		}
		this.ResetMassData();
	}

	public IsFixedRotation() : boolean{
		return (this.m_flags & b2Body.e_fixedRotationFlag) == b2Body.e_fixedRotationFlag;
	}

	public SetActive(flag:boolean) : void{
		var broadPhase:IBroadPhase = null!;
		var f:b2Fixture | null = null;
		var ce:b2ContactEdge | null = null;
		var ce0:b2ContactEdge = null!;
		if(flag == this.IsActive()){
			return;
		}
		if(flag){
			this.m_flags |= b2Body.e_activeFlag;
			broadPhase = this.m_world.m_contactManager.m_broadPhase;
			f = this.m_fixtureList;
			while(f){
				f.CreateProxy(broadPhase,this.m_xf);
				f = f.m_next;
			}
		}
		else{
			this.m_flags &= ~b2Body.e_activeFlag;
			broadPhase = this.m_world.m_contactManager.m_broadPhase;
			f = this.m_fixtureList;
			while(f){
				f.DestroyProxy(broadPhase);
				f = f.m_next;
			}
			ce = this.m_contactList;
			while(ce){
				ce0 = ce;
				ce = ce.next;
				this.m_world.m_contactManager.Destroy(ce0.contact!);
			}
			this.m_contactList = null;
		}
	}

	public IsActive() : boolean{
		return (this.m_flags & b2Body.e_activeFlag) == b2Body.e_activeFlag;
	}

	public IsSleepingAllowed() : boolean{
		return (this.m_flags & b2Body.e_allowSleepFlag) == b2Body.e_allowSleepFlag;
	}

	public GetFixtureList() : b2Fixture | null{
		return this.m_fixtureList;
	}

	public GetJointList() : b2JointEdge | null{
		return this.m_jointList;
	}

	public GetControllerList() : b2ControllerEdge | null{
		return this.m_controllerList;
	}

	public GetContactList() : b2ContactEdge | null{
		return this.m_contactList;
	}

	public GetNext() : b2Body | null{
		return this.m_next;
	}

	public GetUserData() : any{
		return this.m_userData;
	}

	public SetUserData(data:any) : void{
		this.m_userData = data;
	}

	public GetWorld() : b2World{
		return this.m_world;
	}

	public SynchronizeFixtures() : void{
		var f:b2Fixture | null = null;
		var xf1:b2Transform = b2Body.s_xf1;
		xf1.R.Set(this.m_sweep.a0);
		var tMat:b2Mat22 = xf1.R;
		var tVec:b2Vec2 = this.m_sweep.localCenter;
		xf1.position.x = this.m_sweep.c0.x - (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		xf1.position.y = this.m_sweep.c0.y - (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		var broadPhase:IBroadPhase = this.m_world.m_contactManager.m_broadPhase;
		f = this.m_fixtureList;
		while(f){
			f.Synchronize(broadPhase,xf1,this.m_xf);
			f = f.m_next;
		}
	}

	public SynchronizeTransform() : void{
		this.m_xf.R.Set(this.m_sweep.a);
		var tMat:b2Mat22 = this.m_xf.R;
		var tVec:b2Vec2 = this.m_sweep.localCenter;
		this.m_xf.position.x = this.m_sweep.c.x - (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		this.m_xf.position.y = this.m_sweep.c.y - (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
	}

	public ShouldCollide(other:b2Body) : boolean{
		if(this.m_type != b2Body.b2_dynamicBody && other.m_type != b2Body.b2_dynamicBody){
			return false;
		}
		var jn:b2JointEdge | null = this.m_jointList;
		while(jn){
			if(jn.other == other){
				if(jn.joint!.m_collideConnected == false){
					return false;
				}
			}
			jn = jn.next;
		}
		return true;
	}

	public Advance(t:number) : void{
		this.m_sweep.Advance(t);
		this.m_sweep.c.SetV(this.m_sweep.c0);
		this.m_sweep.a = this.m_sweep.a0;
		this.SynchronizeTransform();
	}
}
