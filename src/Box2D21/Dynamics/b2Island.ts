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

import { b2Body, b2Contact, b2ContactConstraint, b2ContactImpulse, b2ContactListener, b2ContactSolver, b2Joint, b2Math, b2Settings, b2TimeStep, b2Vec2 } from "..";

export class b2Island
{

	private static s_impulse:b2ContactImpulse = new b2ContactImpulse();

	private m_allocator:any;

	private m_listener!:b2ContactListener;

	private m_contactSolver!:b2ContactSolver;

	public m_bodies:b2Body[];

	public m_contacts:b2Contact[];

	public m_joints:b2Joint[];

	public m_bodyCount:number = 0;

	public m_jointCount:number = 0;

	public m_contactCount:number = 0;

	private m_bodyCapacity:number = 0;

	public m_contactCapacity:number = 0;

	public m_jointCapacity:number = 0;

	constructor(){
		this.m_bodies = new Array<b2Body>();
		this.m_contacts = new Array<b2Contact>();
		this.m_joints = new Array<b2Joint>();
	}

	public Initialize(bodyCapacity:number, contactCapacity:number, jointCapacity:number, allocator:any, listener:b2ContactListener, contactSolver:b2ContactSolver) : void{
		var i:number = 0;
		this.m_bodyCapacity = bodyCapacity;
		this.m_contactCapacity = contactCapacity;
		this.m_jointCapacity = jointCapacity;
		this.m_bodyCount = 0;
		this.m_contactCount = 0;
		this.m_jointCount = 0;
		this.m_allocator = allocator;
		this.m_listener = listener;
		this.m_contactSolver = contactSolver;
		i = this.m_bodies.length | 0;
		while(i < bodyCapacity){
			this.m_bodies[i] = null!;
			i++;
		}
		i = this.m_contacts.length | 0;
		while(i < contactCapacity){
			this.m_contacts[i] = null!;
			i++;
		}
		i = this.m_joints.length | 0;
		while(i < jointCapacity){
			this.m_joints[i] = null!;
			i++;
		}
	}

	public Clear() : void{
		this.m_bodyCount = 0;
		this.m_contactCount = 0;
		this.m_jointCount = 0;
	}

	public Solve(step:b2TimeStep, gravity:b2Vec2, allowSleep:boolean) : void{
		var i:number = 0;
		var j:number = 0;
		var b:b2Body = null!;
		var joint:b2Joint = null!;
		var translationX:number = NaN;
		var translationY:number = NaN;
		var rotation:number = NaN;
		var contactsOkay:boolean = false;
		var jointsOkay:boolean = false;
		var jointOkay:boolean = false;
		var minSleepTime:number = NaN;
		var linTolSqr:number = NaN;
		var angTolSqr:number = NaN;
		i = 0;
		while(i < this.m_bodyCount){
			b = this.m_bodies[i];
			if(b.GetType() == b2Body.b2_dynamicBody){
				b.m_linearVelocity.x += step.dt * (gravity.x + b.m_invMass * b.m_force.x);
				b.m_linearVelocity.y += step.dt * (gravity.y + b.m_invMass * b.m_force.y);
				b.m_angularVelocity += step.dt * b.m_invI * b.m_torque;
				b.m_linearVelocity.Multiply(b2Math.Clamp(1 - step.dt * b.m_linearDamping,0,1));
				b.m_angularVelocity *= b2Math.Clamp(1 - step.dt * b.m_angularDamping,0,1);
			}
			i++;
		}
		this.m_contactSolver.Initialize(step,this.m_contacts,this.m_contactCount,this.m_allocator);
		var contactSolver:b2ContactSolver = this.m_contactSolver;
		contactSolver.InitVelocityConstraints(step);
		i = 0;
		while(i < this.m_jointCount){
			joint = this.m_joints[i];
			joint.InitVelocityConstraints(step);
			i++;
		}
		i = 0;
		while(i < step.velocityIterations){
			j = 0;
			while(j < this.m_jointCount){
				joint = this.m_joints[j];
				joint.SolveVelocityConstraints(step);
				j++;
			}
			contactSolver.SolveVelocityConstraints();
			i++;
		}
		i = 0;
		while(i < this.m_jointCount){
			joint = this.m_joints[i];
			joint.FinalizeVelocityConstraints();
			i++;
		}
		contactSolver.FinalizeVelocityConstraints();
		i = 0;
		while(i < this.m_bodyCount){
			b = this.m_bodies[i];
			if(b.GetType() != b2Body.b2_staticBody){
				translationX = step.dt * b.m_linearVelocity.x;
				translationY = step.dt * b.m_linearVelocity.y;
				if(translationX * translationX + translationY * translationY > b2Settings.b2_maxTranslationSquared){
					b.m_linearVelocity.Normalize();
					b.m_linearVelocity.x *= b2Settings.b2_maxTranslation * step.inv_dt;
					b.m_linearVelocity.y *= b2Settings.b2_maxTranslation * step.inv_dt;
				}
				rotation = step.dt * b.m_angularVelocity;
				if(rotation * rotation > b2Settings.b2_maxRotationSquared){
					if(b.m_angularVelocity < 0){
						b.m_angularVelocity = -b2Settings.b2_maxRotation * step.inv_dt;
					}
					else{
						b.m_angularVelocity = b2Settings.b2_maxRotation * step.inv_dt;
					}
				}
				b.m_sweep.c0.SetV(b.m_sweep.c);
				b.m_sweep.a0 = b.m_sweep.a;
				b.m_sweep.c.x += step.dt * b.m_linearVelocity.x;
				b.m_sweep.c.y += step.dt * b.m_linearVelocity.y;
				b.m_sweep.a += step.dt * b.m_angularVelocity;
				b.SynchronizeTransform();
			}
			i++;
		}
		i = 0;
		while(i < step.positionIterations){
			contactsOkay = contactSolver.SolvePositionConstraints(b2Settings.b2_contactBaumgarte);
			jointsOkay = true;
			j = 0;
			while(j < this.m_jointCount){
				joint = this.m_joints[j];
				jointOkay = joint.SolvePositionConstraints(b2Settings.b2_contactBaumgarte);
				jointsOkay = jointsOkay && jointOkay;
				j++;
			}
			if(contactsOkay && jointsOkay){
				break;
			}
			i++;
		}
		this.Report(contactSolver.m_constraints);
		if(allowSleep){
			minSleepTime = Number.MAX_VALUE;
			linTolSqr = b2Settings.b2_linearSleepTolerance * b2Settings.b2_linearSleepTolerance;
			angTolSqr = b2Settings.b2_angularSleepTolerance * b2Settings.b2_angularSleepTolerance;
			i = 0;
			while(i < this.m_bodyCount){
				b = this.m_bodies[i];
				if(b.GetType() != b2Body.b2_staticBody){
					if((b.m_flags & b2Body.e_allowSleepFlag) == 0){
						b.m_sleepTime = 0;
						minSleepTime = 0;
					}
					if((b.m_flags & b2Body.e_allowSleepFlag) == 0 || b.m_angularVelocity * b.m_angularVelocity > angTolSqr || b2Math.Dot(b.m_linearVelocity,b.m_linearVelocity) > linTolSqr){
						b.m_sleepTime = 0;
						minSleepTime = 0;
					}
					else{
						b.m_sleepTime += step.dt;
						minSleepTime = b2Math.Min(minSleepTime,b.m_sleepTime);
					}
				}
				i++;
			}
			if(minSleepTime >= b2Settings.b2_timeToSleep){
				i = 0;
				while(i < this.m_bodyCount){
					b = this.m_bodies[i];
					b.SetAwake(false);
					i++;
				}
			}
		}
	}

	public SolveTOI(step:b2TimeStep) : void{
		var i:number = 0;
		var j:number = 0;
		var b:b2Body = null!;
		var translationX:number = NaN;
		var translationY:number = NaN;
		var rotation:number = NaN;
		var contactsOkay:boolean = false;
		var jointsOkay:boolean = false;
		var jointOkay:boolean = false;
		this.m_contactSolver.Initialize(step,this.m_contacts,this.m_contactCount,this.m_allocator);
		var contactSolver:b2ContactSolver = this.m_contactSolver;
		i = 0;
		while(i < this.m_jointCount){
			this.m_joints[i].InitVelocityConstraints(step);
			i++;
		}
		i = 0;
		while(i < step.velocityIterations){
			contactSolver.SolveVelocityConstraints();
			j = 0;
			while(j < this.m_jointCount){
				this.m_joints[j].SolveVelocityConstraints(step);
				j++;
			}
			i++;
		}
		i = 0;
		while(i < this.m_bodyCount){
			b = this.m_bodies[i];
			if(b.GetType() != b2Body.b2_staticBody){
				translationX = step.dt * b.m_linearVelocity.x;
				translationY = step.dt * b.m_linearVelocity.y;
				if(translationX * translationX + translationY * translationY > b2Settings.b2_maxTranslationSquared){
					b.m_linearVelocity.Normalize();
					b.m_linearVelocity.x *= b2Settings.b2_maxTranslation * step.inv_dt;
					b.m_linearVelocity.y *= b2Settings.b2_maxTranslation * step.inv_dt;
				}
				rotation = step.dt * b.m_angularVelocity;
				if(rotation * rotation > b2Settings.b2_maxRotationSquared){
					if(b.m_angularVelocity < 0){
						b.m_angularVelocity = -b2Settings.b2_maxRotation * step.inv_dt;
					}
					else{
						b.m_angularVelocity = b2Settings.b2_maxRotation * step.inv_dt;
					}
				}
				b.m_sweep.c0.SetV(b.m_sweep.c);
				b.m_sweep.a0 = b.m_sweep.a;
				b.m_sweep.c.x += step.dt * b.m_linearVelocity.x;
				b.m_sweep.c.y += step.dt * b.m_linearVelocity.y;
				b.m_sweep.a += step.dt * b.m_angularVelocity;
				b.SynchronizeTransform();
			}
			i++;
		}
		var k_toiBaumgarte:number = 0.75;
		i = 0;
		while(i < step.positionIterations){
			contactsOkay = contactSolver.SolvePositionConstraints(k_toiBaumgarte);
			jointsOkay = true;
			j = 0;
			while(j < this.m_jointCount){
				jointOkay = this.m_joints[j].SolvePositionConstraints(b2Settings.b2_contactBaumgarte);
				jointsOkay = jointsOkay && jointOkay;
				j++;
			}
			if(contactsOkay && jointsOkay){
				break;
			}
			i++;
		}
		this.Report(contactSolver.m_constraints);
	}

	public Report(constraints:b2ContactConstraint[]) : void{
		var c:b2Contact = null!;
		var cc:b2ContactConstraint = null!;
		var j:number = 0;
		if(this.m_listener == null){
			return;
		}
		var i:number = 0;
		while(i < this.m_contactCount){
			c = this.m_contacts[i];
			cc = constraints[i];
			j = 0;
			while(j < cc.pointCount){
				b2Island.s_impulse.normalImpulses[j] = cc.points[j].normalImpulse;
				b2Island.s_impulse.tangentImpulses[j] = cc.points[j].tangentImpulse;
				j++;
			}
			this.m_listener.PostSolve(c,b2Island.s_impulse);
			i++;
		}
	}

	public AddBody(body:b2Body) : void{
		body.m_islandIndex = this.m_bodyCount;
		this.m_bodies[this.m_bodyCount++] = body;
	}

	public AddContact(contact:b2Contact) : void{
		this.m_contacts[this.m_contactCount++] = contact;
	}

	public AddJoint(joint:b2Joint) : void{
		this.m_joints[this.m_jointCount++] = joint;
	}
}
