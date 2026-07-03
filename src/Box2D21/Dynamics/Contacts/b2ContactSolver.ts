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

import { b2Body, b2Contact, b2ContactConstraint, b2ContactConstraintPoint, b2Fixture, b2Manifold, b2ManifoldPoint, b2Mat22, b2Math, b2PositionSolverManifold, b2Settings, b2Shape, b2TimeStep, b2Vec2, b2WorldManifold } from "../..";

export class b2ContactSolver
{
	private static s_worldManifold:b2WorldManifold = new b2WorldManifold();

	private static s_psm:b2PositionSolverManifold = new b2PositionSolverManifold();

	private m_step:b2TimeStep = new b2TimeStep();

	private m_allocator:any;

	public m_constraints:b2ContactConstraint[] = new Array<b2ContactConstraint>();

	private m_constraintCount:number = 0;

	constructor()
	{
	}

	public Initialize(step:b2TimeStep, contacts:b2Contact[], contactCount:number, allocator:any) : void
	{
		var contact:b2Contact;
		var i:number = 0;
		var fixtureA:b2Fixture;
		var fixtureB:b2Fixture;
		var shapeA:b2Shape;
		var shapeB:b2Shape;
		var radiusA:number = NaN;
		var radiusB:number = NaN;
		var bodyA:b2Body;
		var bodyB:b2Body;
		var manifold:b2Manifold;
		var friction:number = NaN;
		var restitution:number = NaN;
		var vAX:number = NaN;
		var vAY:number = NaN;
		var vBX:number = NaN;
		var vBY:number = NaN;
		var wA:number = NaN;
		var wB:number = NaN;
		var normalX:number = NaN;
		var normalY:number = NaN;
		var cc:b2ContactConstraint;
		var k:number = 0;
		var cp:b2ManifoldPoint;
		var ccp:b2ContactConstraintPoint;
		var rAX:number = NaN;
		var rAY:number = NaN;
		var rBX:number = NaN;
		var rBY:number = NaN;
		var rnA:number = NaN;
		var rnB:number = NaN;
		var kNormal:number = NaN;
		var kEqualized:number = NaN;
		var tangentX:number = NaN;
		var tangentY:number = NaN;
		var rtA:number = NaN;
		var rtB:number = NaN;
		var kTangent:number = NaN;
		var tmpX:number = NaN;
		var tmpY:number = NaN;
		var vRel:number = NaN;
		var ccp1:b2ContactConstraintPoint;
		var ccp2:b2ContactConstraintPoint;
		var invMassA:number = NaN;
		var invIA:number = NaN;
		var invMassB:number = NaN;
		var invIB:number = NaN;
		var rn1A:number = NaN;
		var rn1B:number = NaN;
		var rn2A:number = NaN;
		var rn2B:number = NaN;
		var k11:number = NaN;
		var k22:number = NaN;
		var k12:number = NaN;
		var k_maxConditionNumber:number = NaN;
		this.m_step.Set(step);
		this.m_allocator = allocator;
		this.m_constraintCount = contactCount;
		while(this.m_constraints.length < this.m_constraintCount)
		{
			this.m_constraints[this.m_constraints.length] = new b2ContactConstraint();
		}
		i = 0;
		while(i < contactCount)
		{
			contact = contacts[i];
			fixtureA = contact.m_fixtureA!;
			fixtureB = contact.m_fixtureB!;
			shapeA = fixtureA.m_shape;
			shapeB = fixtureB.m_shape;
			radiusA = shapeA.m_radius;
			radiusB = shapeB.m_radius;
			bodyA = fixtureA.m_body;
			bodyB = fixtureB.m_body;
			manifold = contact.GetManifold();
			friction = b2Settings.b2MixFriction(fixtureA.GetFriction(),fixtureB.GetFriction());
			restitution = b2Settings.b2MixRestitution(fixtureA.GetRestitution(),fixtureB.GetRestitution());
			vAX = bodyA.m_linearVelocity.x;
			vAY = bodyA.m_linearVelocity.y;
			vBX = bodyB.m_linearVelocity.x;
			vBY = bodyB.m_linearVelocity.y;
			wA = bodyA.m_angularVelocity;
			wB = bodyB.m_angularVelocity;
			b2Settings.b2Assert(manifold.m_pointCount > 0);
			b2ContactSolver.s_worldManifold.Initialize(manifold,bodyA.m_xf,radiusA,bodyB.m_xf,radiusB);
			normalX = b2ContactSolver.s_worldManifold.m_normal.x;
			normalY = b2ContactSolver.s_worldManifold.m_normal.y;
			cc = this.m_constraints[i];
			cc.bodyA = bodyA;
			cc.bodyB = bodyB;
			cc.manifold = manifold;
			cc.normal.x = normalX;
			cc.normal.y = normalY;
			cc.pointCount = manifold.m_pointCount;
			cc.friction = friction;
			cc.restitution = restitution;
			cc.localPlaneNormal.x = manifold.m_localPlaneNormal.x;
			cc.localPlaneNormal.y = manifold.m_localPlaneNormal.y;
			cc.localPoint.x = manifold.m_localPoint.x;
			cc.localPoint.y = manifold.m_localPoint.y;
			cc.radius = radiusA + radiusB;
			cc.type = manifold.m_type;
			k = 0;
			while(k < cc.pointCount)
			{
				cp = manifold.m_points[k];
				ccp = cc.points[k];
				ccp.normalImpulse = cp.m_normalImpulse;
				ccp.tangentImpulse = cp.m_tangentImpulse;
				ccp.localPoint.SetV(cp.m_localPoint);
				rAX = ccp.rA.x = b2ContactSolver.s_worldManifold.m_points[k].x - bodyA.m_sweep.c.x;
				rAY = ccp.rA.y = b2ContactSolver.s_worldManifold.m_points[k].y - bodyA.m_sweep.c.y;
				rBX = ccp.rB.x = b2ContactSolver.s_worldManifold.m_points[k].x - bodyB.m_sweep.c.x;
				rBY = ccp.rB.y = b2ContactSolver.s_worldManifold.m_points[k].y - bodyB.m_sweep.c.y;
				rnA = rAX * normalY - rAY * normalX;
				rnB = rBX * normalY - rBY * normalX;
				rnA *= rnA;
				rnB *= rnB;
				kNormal = bodyA.m_invMass + bodyB.m_invMass + bodyA.m_invI * rnA + bodyB.m_invI * rnB;
				ccp.normalMass = 1 / kNormal;
				kEqualized = bodyA.m_mass * bodyA.m_invMass + bodyB.m_mass * bodyB.m_invMass;
				kEqualized = kEqualized + (bodyA.m_mass * bodyA.m_invI * rnA + bodyB.m_mass * bodyB.m_invI * rnB);
				ccp.equalizedMass = 1 / kEqualized;
				tangentX = normalY;
				tangentY = -normalX;
				rtA = rAX * tangentY - rAY * tangentX;
				rtB = rBX * tangentY - rBY * tangentX;
				rtA *= rtA;
				rtB *= rtB;
				kTangent = bodyA.m_invMass + bodyB.m_invMass + bodyA.m_invI * rtA + bodyB.m_invI * rtB;
				ccp.tangentMass = 1 / kTangent;
				ccp.velocityBias = 0;
				tmpX = vBX + -wB * rBY - vAX - -wA * rAY;
				tmpY = vBY + wB * rBX - vAY - wA * rAX;
				vRel = cc.normal.x * tmpX + cc.normal.y * tmpY;
				if(vRel < -b2Settings.b2_velocityThreshold)
				{
					ccp.velocityBias += -cc.restitution * vRel;
				}
				k++;
			}
			if(cc.pointCount == 2)
			{
				ccp1 = cc.points[0];
				ccp2 = cc.points[1];
				invMassA = bodyA.m_invMass;
				invIA = bodyA.m_invI;
				invMassB = bodyB.m_invMass;
				invIB = bodyB.m_invI;
				rn1A = ccp1.rA.x * normalY - ccp1.rA.y * normalX;
				rn1B = ccp1.rB.x * normalY - ccp1.rB.y * normalX;
				rn2A = ccp2.rA.x * normalY - ccp2.rA.y * normalX;
				rn2B = ccp2.rB.x * normalY - ccp2.rB.y * normalX;
				k11 = invMassA + invMassB + invIA * rn1A * rn1A + invIB * rn1B * rn1B;
				k22 = invMassA + invMassB + invIA * rn2A * rn2A + invIB * rn2B * rn2B;
				k12 = invMassA + invMassB + invIA * rn1A * rn2A + invIB * rn1B * rn2B;
				k_maxConditionNumber = 100;
				if(k11 * k11 < k_maxConditionNumber * (k11 * k22 - k12 * k12))
				{
					cc.K.col1.Set(k11,k12);
					cc.K.col2.Set(k12,k22);
					cc.K.GetInverse(cc.normalMass);
				}
				else
				{
					cc.pointCount = 1;
				}
			}
			i++;
		}
	}

	public InitVelocityConstraints(step:b2TimeStep) : void
	{
		var tVec:b2Vec2;
		var tVec2:b2Vec2;
		var tMat:b2Mat22;
		var cc:b2ContactConstraint;
		var bodyA:b2Body;
		var bodyB:b2Body;
		var invMassA:number = NaN;
		var invIA:number = NaN;
		var invMassB:number = NaN;
		var invIB:number = NaN;
		var normalX:number = NaN;
		var normalY:number = NaN;
		var tangentX:number = NaN;
		var tangentY:number = NaN;
		var j:number = 0;
		var pointCount:number = 0;
		var ccp:b2ContactConstraintPoint;
		var PX:number = NaN;
		var PY:number = NaN;
		var ccp2:b2ContactConstraintPoint;
		var i:number = 0;
		while(i < this.m_constraintCount)
		{
			cc = this.m_constraints[i];
			bodyA = cc.bodyA;
			bodyB = cc.bodyB;
			invMassA = bodyA.m_invMass;
			invIA = bodyA.m_invI;
			invMassB = bodyB.m_invMass;
			invIB = bodyB.m_invI;
			normalX = cc.normal.x;
			tangentX = normalY = cc.normal.y;
			tangentY = -normalX;
			if(step.warmStarting)
			{
				pointCount = cc.pointCount;
				j = 0;
				while(j < pointCount)
				{
					ccp = cc.points[j];
					ccp.normalImpulse *= step.dtRatio;
					ccp.tangentImpulse *= step.dtRatio;
					PX = ccp.normalImpulse * normalX + ccp.tangentImpulse * tangentX;
					PY = ccp.normalImpulse * normalY + ccp.tangentImpulse * tangentY;
					bodyA.m_angularVelocity -= invIA * (ccp.rA.x * PY - ccp.rA.y * PX);
					bodyA.m_linearVelocity.x -= invMassA * PX;
					bodyA.m_linearVelocity.y -= invMassA * PY;
					bodyB.m_angularVelocity += invIB * (ccp.rB.x * PY - ccp.rB.y * PX);
					bodyB.m_linearVelocity.x += invMassB * PX;
					bodyB.m_linearVelocity.y += invMassB * PY;
					j++;
				}
			}
			else
			{
				pointCount = cc.pointCount;
				j = 0;
				while(j < pointCount)
				{
					ccp2 = cc.points[j];
					ccp2.normalImpulse = 0;
					ccp2.tangentImpulse = 0;
					j++;
				}
			}
			i++;
		}
	}

	public SolveVelocityConstraints() : void
	{
		var j:number = 0;
		var ccp:b2ContactConstraintPoint;
		var dvX:number = NaN;
		var dvY:number = NaN;
		var vn:number = NaN;
		var vt:number = NaN;
		var lambda:number = NaN;
		var maxFriction:number = NaN;
		var newImpulse:number = NaN;
		var PX:number = NaN;
		var PY:number = NaN;
		var d1:number = NaN;
		var d2:number = NaN;
		var P1X:number = NaN;
		var P1Y:number = NaN;
		var P2X:number = NaN;
		var P2Y:number = NaN;
		var tMat:b2Mat22;
		var cc:b2ContactConstraint;
		var bodyA:b2Body;
		var bodyB:b2Body;
		var wA:number = NaN;
		var wB:number = NaN;
		var vA:b2Vec2;
		var vB:b2Vec2;
		var invMassA:number = NaN;
		var invIA:number = NaN;
		var invMassB:number = NaN;
		var invIB:number = NaN;
		var normalX:number = NaN;
		var normalY:number = NaN;
		var tangentX:number = NaN;
		var tangentY:number = NaN;
		var friction:number = NaN;
		var pointCount:number = 0;
		var ccp1:b2ContactConstraintPoint;
		var ccp2:b2ContactConstraintPoint;
		var aOld:number = NaN;
		var bOld:number = NaN;
		var dv1X:number = NaN;
		var dv1Y:number = NaN;
		var dv2X:number = NaN;
		var dv2Y:number = NaN;
		var vn1:number = NaN;
		var vn2:number = NaN;
		var bVecX:number = NaN;
		var bVecY:number = NaN;
		var k_errorTol:number = NaN;
		var xX:number = NaN;
		var xY:number = NaN;
		var i:number = 0;
		while(i < this.m_constraintCount)
		{
			cc = this.m_constraints[i];
			bodyA = cc.bodyA;
			bodyB = cc.bodyB;
			wA = bodyA.m_angularVelocity;
			wB = bodyB.m_angularVelocity;
			vA = bodyA.m_linearVelocity;
			vB = bodyB.m_linearVelocity;
			invMassA = bodyA.m_invMass;
			invIA = bodyA.m_invI;
			invMassB = bodyB.m_invMass;
			invIB = bodyB.m_invI;
			normalX = cc.normal.x;
			tangentX = normalY = cc.normal.y;
			tangentY = -normalX;
			friction = cc.friction;
			j = 0;
			while(j < cc.pointCount)
			{
				ccp = cc.points[j];
				dvX = vB.x - wB * ccp.rB.y - vA.x + wA * ccp.rA.y;
				dvY = vB.y + wB * ccp.rB.x - vA.y - wA * ccp.rA.x;
				vt = dvX * tangentX + dvY * tangentY;
				lambda = ccp.tangentMass * -vt;
				maxFriction = friction * ccp.normalImpulse;
				newImpulse = b2Math.Clamp(ccp.tangentImpulse + lambda,-maxFriction,maxFriction);
				lambda = newImpulse - ccp.tangentImpulse;
				PX = lambda * tangentX;
				PY = lambda * tangentY;
				vA.x -= invMassA * PX;
				vA.y -= invMassA * PY;
				wA -= invIA * (ccp.rA.x * PY - ccp.rA.y * PX);
				vB.x += invMassB * PX;
				vB.y += invMassB * PY;
				wB += invIB * (ccp.rB.x * PY - ccp.rB.y * PX);
				ccp.tangentImpulse = newImpulse;
				j++;
			}
			pointCount = cc.pointCount;
			if(cc.pointCount == 1)
			{
				ccp = cc.points[0];
				dvX = vB.x + -wB * ccp.rB.y - vA.x - -wA * ccp.rA.y;
				dvY = vB.y + wB * ccp.rB.x - vA.y - wA * ccp.rA.x;
				vn = dvX * normalX + dvY * normalY;
				lambda = -ccp.normalMass * (vn - ccp.velocityBias);
				newImpulse = ccp.normalImpulse + lambda;
				newImpulse = newImpulse > 0 ? newImpulse : 0;
				lambda = newImpulse - ccp.normalImpulse;
				PX = lambda * normalX;
				PY = lambda * normalY;
				vA.x -= invMassA * PX;
				vA.y -= invMassA * PY;
				wA -= invIA * (ccp.rA.x * PY - ccp.rA.y * PX);
				vB.x += invMassB * PX;
				vB.y += invMassB * PY;
				wB += invIB * (ccp.rB.x * PY - ccp.rB.y * PX);
				ccp.normalImpulse = newImpulse;
			}
			else
			{
				ccp1 = cc.points[0];
				ccp2 = cc.points[1];
				aOld = ccp1.normalImpulse;
				bOld = ccp2.normalImpulse;
				dv1X = vB.x - wB * ccp1.rB.y - vA.x + wA * ccp1.rA.y;
				dv1Y = vB.y + wB * ccp1.rB.x - vA.y - wA * ccp1.rA.x;
				dv2X = vB.x - wB * ccp2.rB.y - vA.x + wA * ccp2.rA.y;
				dv2Y = vB.y + wB * ccp2.rB.x - vA.y - wA * ccp2.rA.x;
				vn1 = dv1X * normalX + dv1Y * normalY;
				vn2 = dv2X * normalX + dv2Y * normalY;
				bVecX = vn1 - ccp1.velocityBias;
				bVecY = vn2 - ccp2.velocityBias;
				tMat = cc.K;
				bVecX -= tMat.col1.x * aOld + tMat.col2.x * bOld;
				bVecY -= tMat.col1.y * aOld + tMat.col2.y * bOld;
				k_errorTol = 0.001;
				tMat = cc.normalMass;
				xX = -(tMat.col1.x * bVecX + tMat.col2.x * bVecY);
				xY = -(tMat.col1.y * bVecX + tMat.col2.y * bVecY);
				if(xX >= 0 && xY >= 0)
				{
					d1 = xX - aOld;
					d2 = xY - bOld;
					P1X = d1 * normalX;
					P1Y = d1 * normalY;
					P2X = d2 * normalX;
					P2Y = d2 * normalY;
					vA.x -= invMassA * (P1X + P2X);
					vA.y -= invMassA * (P1Y + P2Y);
					wA -= invIA * (ccp1.rA.x * P1Y - ccp1.rA.y * P1X + ccp2.rA.x * P2Y - ccp2.rA.y * P2X);
					vB.x += invMassB * (P1X + P2X);
					vB.y += invMassB * (P1Y + P2Y);
					wB += invIB * (ccp1.rB.x * P1Y - ccp1.rB.y * P1X + ccp2.rB.x * P2Y - ccp2.rB.y * P2X);
					ccp1.normalImpulse = xX;
					ccp2.normalImpulse = xY;
				}
				else
				{
					xX = -ccp1.normalMass * bVecX;
					xY = 0;
					vn1 = 0;
					vn2 = cc.K.col1.y * xX + bVecY;
					if(xX >= 0 && vn2 >= 0)
					{
						d1 = xX - aOld;
						d2 = xY - bOld;
						P1X = d1 * normalX;
						P1Y = d1 * normalY;
						P2X = d2 * normalX;
						P2Y = d2 * normalY;
						vA.x -= invMassA * (P1X + P2X);
						vA.y -= invMassA * (P1Y + P2Y);
						wA -= invIA * (ccp1.rA.x * P1Y - ccp1.rA.y * P1X + ccp2.rA.x * P2Y - ccp2.rA.y * P2X);
						vB.x += invMassB * (P1X + P2X);
						vB.y += invMassB * (P1Y + P2Y);
						wB += invIB * (ccp1.rB.x * P1Y - ccp1.rB.y * P1X + ccp2.rB.x * P2Y - ccp2.rB.y * P2X);
						ccp1.normalImpulse = xX;
						ccp2.normalImpulse = xY;
					}
					else
					{
						xX = 0;
						xY = -ccp2.normalMass * bVecY;
						vn1 = cc.K.col2.x * xY + bVecX;
						vn2 = 0;
						if(xY >= 0 && vn1 >= 0)
						{
							d1 = xX - aOld;
							d2 = xY - bOld;
							P1X = d1 * normalX;
							P1Y = d1 * normalY;
							P2X = d2 * normalX;
							P2Y = d2 * normalY;
							vA.x -= invMassA * (P1X + P2X);
							vA.y -= invMassA * (P1Y + P2Y);
							wA -= invIA * (ccp1.rA.x * P1Y - ccp1.rA.y * P1X + ccp2.rA.x * P2Y - ccp2.rA.y * P2X);
							vB.x += invMassB * (P1X + P2X);
							vB.y += invMassB * (P1Y + P2Y);
							wB += invIB * (ccp1.rB.x * P1Y - ccp1.rB.y * P1X + ccp2.rB.x * P2Y - ccp2.rB.y * P2X);
							ccp1.normalImpulse = xX;
							ccp2.normalImpulse = xY;
						}
						else
						{
							xX = 0;
							xY = 0;
							vn1 = bVecX;
							vn2 = bVecY;
							if(vn1 >= 0 && vn2 >= 0)
							{
								d1 = xX - aOld;
								d2 = xY - bOld;
								P1X = d1 * normalX;
								P1Y = d1 * normalY;
								P2X = d2 * normalX;
								P2Y = d2 * normalY;
								vA.x -= invMassA * (P1X + P2X);
								vA.y -= invMassA * (P1Y + P2Y);
								wA -= invIA * (ccp1.rA.x * P1Y - ccp1.rA.y * P1X + ccp2.rA.x * P2Y - ccp2.rA.y * P2X);
								vB.x += invMassB * (P1X + P2X);
								vB.y += invMassB * (P1Y + P2Y);
								wB += invIB * (ccp1.rB.x * P1Y - ccp1.rB.y * P1X + ccp2.rB.x * P2Y - ccp2.rB.y * P2X);
								ccp1.normalImpulse = xX;
								ccp2.normalImpulse = xY;
							}
						}
					}
				}
			}
			bodyA.m_angularVelocity = wA;
			bodyB.m_angularVelocity = wB;
			i++;
		}
	}

	public FinalizeVelocityConstraints() : void
	{
		var cc:b2ContactConstraint;
		var manifold:b2Manifold;
		var j:number = 0;
		var mp:b2ManifoldPoint;
		var ccp:b2ContactConstraintPoint;
		var i:number = 0;
		while(i < this.m_constraintCount)
		{
			cc = this.m_constraints[i];
			manifold = cc.manifold;
			j = 0;
			while(j < cc.pointCount)
			{
				mp = manifold.m_points[j];
				ccp = cc.points[j];
				mp.m_normalImpulse = ccp.normalImpulse;
				mp.m_tangentImpulse = ccp.tangentImpulse;
				j++;
			}
			i++;
		}
	}

	public SolvePositionConstraints(baumgarte:number) : boolean
	{
		var cc:b2ContactConstraint;
		var bodyA:b2Body;
		var bodyB:b2Body;
		var invMassA:number = NaN;
		var invIA:number = NaN;
		var invMassB:number = NaN;
		var invIB:number = NaN;
		var normal:b2Vec2;
		var j:number = 0;
		var ccp:b2ContactConstraintPoint;
		var point:b2Vec2;
		var separation:number = NaN;
		var rAX:number = NaN;
		var rAY:number = NaN;
		var rBX:number = NaN;
		var rBY:number = NaN;
		var C:number = NaN;
		var impulse:number = NaN;
		var impulseX:number = NaN;
		var impulseY:number = NaN;
		var minSeparation:number = 0;
		var i:number = 0;
		while(i < this.m_constraintCount)
		{
			cc = this.m_constraints[i];
			bodyA = cc.bodyA;
			bodyB = cc.bodyB;
			invMassA = bodyA.m_mass * bodyA.m_invMass;
			invIA = bodyA.m_mass * bodyA.m_invI;
			invMassB = bodyB.m_mass * bodyB.m_invMass;
			invIB = bodyB.m_mass * bodyB.m_invI;
			b2ContactSolver.s_psm.Initialize(cc);
			normal = b2ContactSolver.s_psm.m_normal;
			j = 0;
			while(j < cc.pointCount)
			{
				ccp = cc.points[j];
				point = b2ContactSolver.s_psm.m_points[j];
				separation = b2ContactSolver.s_psm.m_separations[j];
				rAX = point.x - bodyA.m_sweep.c.x;
				rAY = point.y - bodyA.m_sweep.c.y;
				rBX = point.x - bodyB.m_sweep.c.x;
				rBY = point.y - bodyB.m_sweep.c.y;
				minSeparation = minSeparation < separation ? minSeparation : separation;
				C = b2Math.Clamp(baumgarte * (separation + b2Settings.b2_linearSlop),-b2Settings.b2_maxLinearCorrection,0);
				impulse = -ccp.equalizedMass * C;
				impulseX = impulse * normal.x;
				impulseY = impulse * normal.y;
				bodyA.m_sweep.c.x -= invMassA * impulseX;
				bodyA.m_sweep.c.y -= invMassA * impulseY;
				bodyA.m_sweep.a -= invIA * (rAX * impulseY - rAY * impulseX);
				bodyA.SynchronizeTransform();
				bodyB.m_sweep.c.x += invMassB * impulseX;
				bodyB.m_sweep.c.y += invMassB * impulseY;
				bodyB.m_sweep.a += invIB * (rBX * impulseY - rBY * impulseX);
				bodyB.SynchronizeTransform();
				j++;
			}
			i++;
		}
		return minSeparation > -1.5 * b2Settings.b2_linearSlop;
	}
}
