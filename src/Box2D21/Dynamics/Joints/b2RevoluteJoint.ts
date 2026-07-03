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

import { b2Body, b2Joint, b2Mat22, b2Mat33, b2Math, b2RevoluteJointDef, b2Settings, b2TimeStep, b2Vec2, b2Vec3 } from "../..";

export class b2RevoluteJoint extends b2Joint
{
	constructor(def:b2RevoluteJointDef){
		super(def);
		this.m_localAnchor1.SetV(def.localAnchorA);
		this.m_localAnchor2.SetV(def.localAnchorB);
		this.m_referenceAngle = def.referenceAngle;
		this.m_impulse.SetZero();
		this.m_motorImpulse = 0;
		this.m_lowerAngle = def.lowerAngle;
		this.m_upperAngle = def.upperAngle;
		this.m_maxMotorTorque = def.maxMotorTorque;
		this.m_motorSpeed = def.motorSpeed;
		this.m_enableLimit = def.enableLimit;
		this.m_enableMotor = def.enableMotor;
		this.m_limitState = b2Joint.e_inactiveLimit;
	}

	public GetAnchorA() : b2Vec2
	{
		return this.m_bodyA.GetWorldPoint(this.m_localAnchor1);
	}

	public GetAnchorB() : b2Vec2
	{
		return this.m_bodyB.GetWorldPoint(this.m_localAnchor2);
	}

	public GetReactionForce(inv_dt:number) : b2Vec2
	{
		return new b2Vec2(inv_dt * this.m_impulse.x, inv_dt * this.m_impulse.y);
	}

	public GetReactionTorque(inv_dt:number) : number
	{
		return inv_dt * this.m_impulse.z;
	}

	public GetJointAngle() : number
	{
		return this.m_bodyB.m_sweep.a - this.m_bodyA.m_sweep.a - this.m_referenceAngle;
	}

	public GetJointSpeed() : number
	{
		return this.m_bodyB.m_angularVelocity - this.m_bodyA.m_angularVelocity;
	}

	public IsLimitEnabled() : boolean
	{
		return this.m_enableLimit;
	}

	public EnableLimit(flag:boolean) : void
	{
		this.m_enableLimit = flag;
	}

	public GetLowerLimit() : number
	{
		return this.m_lowerAngle;
	}

	public GetUpperLimit() : number
	{
		return this.m_upperAngle;
	}

	public SetLimits(lower:number, upper:number) : void
	{
		this.m_lowerAngle = lower;
		this.m_upperAngle = upper;
	}

	public IsMotorEnabled() : boolean
	{
		this.m_bodyA.SetAwake(true);
		this.m_bodyB.SetAwake(true);
		return this.m_enableMotor;
	}

	public EnableMotor(flag:boolean) : void
	{
		this.m_enableMotor = flag;
	}

	public SetMotorSpeed(speed:number) : void
	{
		this.m_bodyA.SetAwake(true);
		this.m_bodyB.SetAwake(true);
		this.m_motorSpeed = speed;
	}

	public GetMotorSpeed() : number
	{
		return this.m_motorSpeed;
	}

	public SetMaxMotorTorque(torque:number) : void
	{
		this.m_maxMotorTorque = torque;
	}

	public GetMotorTorque() : number
	{
		return this.m_maxMotorTorque;
	}

	public InitVelocityConstraints(step:b2TimeStep) : void
	{
		var _loc2_:b2Body;
		var _loc3_:b2Body;
		var _loc4_:b2Mat22;
		var _loc5_:number = NaN;
		var _loc7_:number = NaN;
		var _loc14_:number = NaN;
		var _loc15_:number = NaN;
		var _loc16_:number = NaN;
		_loc2_ = this.m_bodyA;
		_loc3_ = this.m_bodyB;
		if(this.m_enableMotor || this.m_enableLimit)
		{
		}
		_loc4_ = _loc2_.m_xf.R;
		var _loc6_:number = this.m_localAnchor1.x - _loc2_.m_sweep.localCenter.x;
		_loc7_ = this.m_localAnchor1.y - _loc2_.m_sweep.localCenter.y;
		_loc5_ = _loc4_.col1.x * _loc6_ + _loc4_.col2.x * _loc7_;
		_loc7_ = _loc4_.col1.y * _loc6_ + _loc4_.col2.y * _loc7_;
		_loc6_ = _loc5_;
		_loc4_ = _loc3_.m_xf.R;
		var _loc8_:number = this.m_localAnchor2.x - _loc3_.m_sweep.localCenter.x;
		var _loc9_:number = this.m_localAnchor2.y - _loc3_.m_sweep.localCenter.y;
		_loc5_ = _loc4_.col1.x * _loc8_ + _loc4_.col2.x * _loc9_;
		_loc9_ = _loc4_.col1.y * _loc8_ + _loc4_.col2.y * _loc9_;
		_loc8_ = _loc5_;
		var _loc10_:number = _loc2_.m_invMass;
		var _loc11_:number = _loc3_.m_invMass;
		var _loc12_:number = _loc2_.m_invI;
		var _loc13_:number = _loc3_.m_invI;
		this.m_mass.col1.x = _loc10_ + _loc11_ + _loc7_ * _loc7_ * _loc12_ + _loc9_ * _loc9_ * _loc13_;
		this.m_mass.col2.x = -_loc7_ * _loc6_ * _loc12_ - _loc9_ * _loc8_ * _loc13_;
		this.m_mass.col3.x = -_loc7_ * _loc12_ - _loc9_ * _loc13_;
		this.m_mass.col1.y = this.m_mass.col2.x;
		this.m_mass.col2.y = _loc10_ + _loc11_ + _loc6_ * _loc6_ * _loc12_ + _loc8_ * _loc8_ * _loc13_;
		this.m_mass.col3.y = _loc6_ * _loc12_ + _loc8_ * _loc13_;
		this.m_mass.col1.z = this.m_mass.col3.x;
		this.m_mass.col2.z = this.m_mass.col3.y;
		this.m_mass.col3.z = _loc12_ + _loc13_;
		this.m_motorMass = 1 / (_loc12_ + _loc13_);
		if(this.m_enableMotor == false)
		{
			this.m_motorImpulse = 0;
		}
		if(this.m_enableLimit)
		{
			_loc14_ = _loc3_.m_sweep.a - _loc2_.m_sweep.a - this.m_referenceAngle;
			if(b2Math.Abs(this.m_upperAngle - this.m_lowerAngle) < 2 * b2Settings.b2_angularSlop)
			{
				this.m_limitState = b2Joint.e_equalLimits;
			}
			else if(_loc14_ <= this.m_lowerAngle)
			{
				if(this.m_limitState != b2Joint.e_atLowerLimit)
				{
					this.m_impulse.z = 0;
				}
				this.m_limitState = b2Joint.e_atLowerLimit;
			}
			else if(_loc14_ >= this.m_upperAngle)
			{
				if(this.m_limitState != b2Joint.e_atUpperLimit)
				{
					this.m_impulse.z = 0;
				}
				this.m_limitState = b2Joint.e_atUpperLimit;
			}
			else
			{
				this.m_limitState = b2Joint.e_inactiveLimit;
				this.m_impulse.z = 0;
			}
		}
		else
		{
			this.m_limitState = b2Joint.e_inactiveLimit;
		}
		if(step.warmStarting)
		{
			this.m_impulse.x *= step.dtRatio;
			this.m_impulse.y *= step.dtRatio;
			this.m_motorImpulse *= step.dtRatio;
			_loc15_ = this.m_impulse.x;
			_loc16_ = this.m_impulse.y;
			_loc2_.m_linearVelocity.x -= _loc10_ * _loc15_;
			_loc2_.m_linearVelocity.y -= _loc10_ * _loc16_;
			_loc2_.m_angularVelocity -= _loc12_ * (_loc6_ * _loc16_ - _loc7_ * _loc15_ + this.m_motorImpulse + this.m_impulse.z);
			_loc3_.m_linearVelocity.x += _loc11_ * _loc15_;
			_loc3_.m_linearVelocity.y += _loc11_ * _loc16_;
			_loc3_.m_angularVelocity += _loc13_ * (_loc8_ * _loc16_ - _loc9_ * _loc15_ + this.m_motorImpulse + this.m_impulse.z);
		}
		else
		{
			this.m_impulse.SetZero();
			this.m_motorImpulse = 0;
		}
	}

	public SolveVelocityConstraints(step:b2TimeStep) : void
	{
		var _loc4_:b2Mat22;
		var _loc5_:number = NaN;
		var _loc6_:number = NaN;
		var _loc7_:number = NaN;
		var _loc8_:number = NaN;
		var _loc9_:number = NaN;
		var _loc10_:number = NaN;
		var _loc19_:number = NaN;
		var _loc20_:number = NaN;
		var _loc21_:number = NaN;
		var _loc22_:number = NaN;
		var _loc23_:number = NaN;
		var _loc24_:number = NaN;
		var _loc25_:number = NaN;
		var _loc26_:number = NaN;
		var _loc27_:number = NaN;
		var _loc2_:b2Body = this.m_bodyA;
		var _loc3_:b2Body = this.m_bodyB;
		var _loc11_:b2Vec2 = _loc2_.m_linearVelocity;
		var _loc12_:number = _loc2_.m_angularVelocity;
		var _loc13_:b2Vec2 = _loc3_.m_linearVelocity;
		var _loc14_:number = _loc3_.m_angularVelocity;
		var _loc15_:number = _loc2_.m_invMass;
		var _loc16_:number = _loc3_.m_invMass;
		var _loc17_:number = _loc2_.m_invI;
		var _loc18_:number = _loc3_.m_invI;
		if(this.m_enableMotor && this.m_limitState != b2Joint.e_equalLimits)
		{
			_loc19_ = _loc14_ - _loc12_ - this.m_motorSpeed;
			_loc20_ = this.m_motorMass * -_loc19_;
			_loc21_ = this.m_motorImpulse;
			_loc22_ = step.dt * this.m_maxMotorTorque;
			this.m_motorImpulse = b2Math.Clamp(this.m_motorImpulse + _loc20_,-_loc22_,_loc22_);
			_loc20_ = this.m_motorImpulse - _loc21_;
			_loc12_ -= _loc17_ * _loc20_;
			_loc14_ += _loc18_ * _loc20_;
		}
		if(this.m_enableLimit && this.m_limitState != b2Joint.e_inactiveLimit)
		{
			_loc4_ = _loc2_.m_xf.R;
			_loc7_ = this.m_localAnchor1.x - _loc2_.m_sweep.localCenter.x;
			_loc8_ = this.m_localAnchor1.y - _loc2_.m_sweep.localCenter.y;
			_loc5_ = _loc4_.col1.x * _loc7_ + _loc4_.col2.x * _loc8_;
			_loc8_ = _loc4_.col1.y * _loc7_ + _loc4_.col2.y * _loc8_;
			_loc7_ = _loc5_;
			_loc4_ = _loc3_.m_xf.R;
			_loc9_ = this.m_localAnchor2.x - _loc3_.m_sweep.localCenter.x;
			_loc10_ = this.m_localAnchor2.y - _loc3_.m_sweep.localCenter.y;
			_loc5_ = _loc4_.col1.x * _loc9_ + _loc4_.col2.x * _loc10_;
			_loc10_ = _loc4_.col1.y * _loc9_ + _loc4_.col2.y * _loc10_;
			_loc9_ = _loc5_;
			_loc23_ = _loc13_.x + -_loc14_ * _loc10_ - _loc11_.x - -_loc12_ * _loc8_;
			_loc24_ = _loc13_.y + _loc14_ * _loc9_ - _loc11_.y - _loc12_ * _loc7_;
			_loc25_ = _loc14_ - _loc12_;
			this.m_mass.Solve33(this.impulse3,-_loc23_,-_loc24_,-_loc25_);
			if(this.m_limitState == b2Joint.e_equalLimits)
			{
				this.m_impulse.Add(this.impulse3);
			}
			else if(this.m_limitState == b2Joint.e_atLowerLimit)
			{
				_loc6_ = this.m_impulse.z + this.impulse3.z;
				if(_loc6_ < 0)
				{
					this.m_mass.Solve22(this.reduced,-_loc23_,-_loc24_);
					this.impulse3.x = this.reduced.x;
					this.impulse3.y = this.reduced.y;
					this.impulse3.z = -this.m_impulse.z;
					this.m_impulse.x += this.reduced.x;
					this.m_impulse.y += this.reduced.y;
					this.m_impulse.z = 0;
				}
			}
			else if(this.m_limitState == b2Joint.e_atUpperLimit)
			{
				_loc6_ = this.m_impulse.z + this.impulse3.z;
				if(_loc6_ > 0)
				{
					this.m_mass.Solve22(this.reduced,-_loc23_,-_loc24_);
					this.impulse3.x = this.reduced.x;
					this.impulse3.y = this.reduced.y;
					this.impulse3.z = -this.m_impulse.z;
					this.m_impulse.x += this.reduced.x;
					this.m_impulse.y += this.reduced.y;
					this.m_impulse.z = 0;
				}
			}
			_loc11_.x -= _loc15_ * this.impulse3.x;
			_loc11_.y -= _loc15_ * this.impulse3.y;
			_loc12_ -= _loc17_ * (_loc7_ * this.impulse3.y - _loc8_ * this.impulse3.x + this.impulse3.z);
			_loc13_.x += _loc16_ * this.impulse3.x;
			_loc13_.y += _loc16_ * this.impulse3.y;
			_loc14_ += _loc18_ * (_loc9_ * this.impulse3.y - _loc10_ * this.impulse3.x + this.impulse3.z);
		}
		else
		{
			_loc4_ = _loc2_.m_xf.R;
			_loc7_ = this.m_localAnchor1.x - _loc2_.m_sweep.localCenter.x;
			_loc8_ = this.m_localAnchor1.y - _loc2_.m_sweep.localCenter.y;
			_loc5_ = _loc4_.col1.x * _loc7_ + _loc4_.col2.x * _loc8_;
			_loc8_ = _loc4_.col1.y * _loc7_ + _loc4_.col2.y * _loc8_;
			_loc7_ = _loc5_;
			_loc4_ = _loc3_.m_xf.R;
			_loc9_ = this.m_localAnchor2.x - _loc3_.m_sweep.localCenter.x;
			_loc10_ = this.m_localAnchor2.y - _loc3_.m_sweep.localCenter.y;
			_loc5_ = _loc4_.col1.x * _loc9_ + _loc4_.col2.x * _loc10_;
			_loc10_ = _loc4_.col1.y * _loc9_ + _loc4_.col2.y * _loc10_;
			_loc9_ = _loc5_;
			_loc26_ = _loc13_.x + -_loc14_ * _loc10_ - _loc11_.x - -_loc12_ * _loc8_;
			_loc27_ = _loc13_.y + _loc14_ * _loc9_ - _loc11_.y - _loc12_ * _loc7_;
			this.m_mass.Solve22(this.impulse2,-_loc26_,-_loc27_);
			this.m_impulse.x += this.impulse2.x;
			this.m_impulse.y += this.impulse2.y;
			_loc11_.x -= _loc15_ * this.impulse2.x;
			_loc11_.y -= _loc15_ * this.impulse2.y;
			_loc12_ -= _loc17_ * (_loc7_ * this.impulse2.y - _loc8_ * this.impulse2.x);
			_loc13_.x += _loc16_ * this.impulse2.x;
			_loc13_.y += _loc16_ * this.impulse2.y;
			_loc14_ += _loc18_ * (_loc9_ * this.impulse2.y - _loc10_ * this.impulse2.x);
		}
		_loc2_.m_linearVelocity.SetV(_loc11_);
		_loc2_.m_angularVelocity = _loc12_;
		_loc3_.m_linearVelocity.SetV(_loc13_);
		_loc3_.m_angularVelocity = _loc14_;
	}

	public SolvePositionConstraints(baumgarte:number) : boolean
	{
		var _loc2_:number = NaN;
		var _loc3_:number = NaN;
		var _loc4_:b2Mat22;
		var _loc9_:number = NaN;
		var _loc10_:number = NaN;
		var _loc11_:number = NaN;
		var _loc25_:number = NaN;
		var _loc26_:number = NaN;
		var _loc27_:number = NaN;
		var _loc28_:number = NaN;
		var _loc29_:number = NaN;
		var _loc30_:number = NaN;
		var _loc31_:number = NaN;
		var _loc5_:b2Body = this.m_bodyA;
		var _loc6_:b2Body = this.m_bodyB;
		var _loc7_:number = 0;
		var _loc8_:number = 0;
		if(this.m_enableLimit && this.m_limitState != b2Joint.e_inactiveLimit)
		{
			_loc25_ = _loc6_.m_sweep.a - _loc5_.m_sweep.a - this.m_referenceAngle;
			_loc26_ = 0;
			if(this.m_limitState == b2Joint.e_equalLimits)
			{
				_loc3_ = b2Math.Clamp(_loc25_ - this.m_lowerAngle,-b2Settings.b2_maxAngularCorrection,b2Settings.b2_maxAngularCorrection);
				_loc26_ = -this.m_motorMass * _loc3_;
				_loc7_ = b2Math.Abs(_loc3_);
			}
			else if(this.m_limitState == b2Joint.e_atLowerLimit)
			{
				_loc3_ = _loc25_ - this.m_lowerAngle;
				_loc7_ = -_loc3_;
				_loc3_ = b2Math.Clamp(_loc3_ + b2Settings.b2_angularSlop,-b2Settings.b2_maxAngularCorrection,0);
				_loc26_ = -this.m_motorMass * _loc3_;
			}
			else if(this.m_limitState == b2Joint.e_atUpperLimit)
			{
				_loc3_ = _loc25_ - this.m_upperAngle;
				_loc7_ = _loc3_;
				_loc3_ = b2Math.Clamp(_loc3_ - b2Settings.b2_angularSlop,0,b2Settings.b2_maxAngularCorrection);
				_loc26_ = -this.m_motorMass * _loc3_;
			}
			_loc5_.m_sweep.a -= _loc5_.m_invI * _loc26_;
			_loc6_.m_sweep.a += _loc6_.m_invI * _loc26_;
			_loc5_.SynchronizeTransform();
			_loc6_.SynchronizeTransform();
		}
		_loc4_ = _loc5_.m_xf.R;
		var _loc12_:number = this.m_localAnchor1.x - _loc5_.m_sweep.localCenter.x;
		var _loc13_:number = this.m_localAnchor1.y - _loc5_.m_sweep.localCenter.y;
		_loc9_ = _loc4_.col1.x * _loc12_ + _loc4_.col2.x * _loc13_;
		_loc13_ = _loc4_.col1.y * _loc12_ + _loc4_.col2.y * _loc13_;
		_loc12_ = _loc9_;
		_loc4_ = _loc6_.m_xf.R;
		var _loc14_:number = this.m_localAnchor2.x - _loc6_.m_sweep.localCenter.x;
		var _loc15_:number = this.m_localAnchor2.y - _loc6_.m_sweep.localCenter.y;
		_loc9_ = _loc4_.col1.x * _loc14_ + _loc4_.col2.x * _loc15_;
		_loc15_ = _loc4_.col1.y * _loc14_ + _loc4_.col2.y * _loc15_;
		_loc14_ = _loc9_;
		var _loc16_:number = _loc6_.m_sweep.c.x + _loc14_ - _loc5_.m_sweep.c.x - _loc12_;
		var _loc17_:number = _loc6_.m_sweep.c.y + _loc15_ - _loc5_.m_sweep.c.y - _loc13_;
		var _loc18_:number = _loc16_ * _loc16_ + _loc17_ * _loc17_;
		var _loc19_:number;
		_loc8_ = _loc19_ = Math.sqrt(_loc18_);
		var _loc20_:number = _loc5_.m_invMass;
		var _loc21_:number = _loc6_.m_invMass;
		var _loc22_:number = _loc5_.m_invI;
		var _loc23_:number = _loc6_.m_invI;
		var _loc24_:number = 10 * b2Settings.b2_linearSlop;
		if(_loc18_ > _loc24_ * _loc24_)
		{
			_loc27_ = _loc16_ / _loc19_;
			_loc28_ = _loc17_ / _loc19_;
			_loc29_ = _loc20_ + _loc21_;
			_loc30_ = 1 / _loc29_;
			_loc10_ = _loc30_ * -_loc16_;
			_loc11_ = _loc30_ * -_loc17_;
			_loc31_ = 0.5;
			_loc5_.m_sweep.c.x -= _loc31_ * _loc20_ * _loc10_;
			_loc5_.m_sweep.c.y -= _loc31_ * _loc20_ * _loc11_;
			_loc6_.m_sweep.c.x += _loc31_ * _loc21_ * _loc10_;
			_loc6_.m_sweep.c.y += _loc31_ * _loc21_ * _loc11_;
			_loc16_ = _loc6_.m_sweep.c.x + _loc14_ - _loc5_.m_sweep.c.x - _loc12_;
			_loc17_ = _loc6_.m_sweep.c.y + _loc15_ - _loc5_.m_sweep.c.y - _loc13_;
		}
		this.K1.col1.x = _loc20_ + _loc21_;
		this.K1.col2.x = 0;
		this.K1.col1.y = 0;
		this.K1.col2.y = _loc20_ + _loc21_;
		this.K2.col1.x = _loc22_ * _loc13_ * _loc13_;
		this.K2.col2.x = -_loc22_ * _loc12_ * _loc13_;
		this.K2.col1.y = -_loc22_ * _loc12_ * _loc13_;
		this.K2.col2.y = _loc22_ * _loc12_ * _loc12_;
		this.K3.col1.x = _loc23_ * _loc15_ * _loc15_;
		this.K3.col2.x = -_loc23_ * _loc14_ * _loc15_;
		this.K3.col1.y = -_loc23_ * _loc14_ * _loc15_;
		this.K3.col2.y = _loc23_ * _loc14_ * _loc14_;
		this.K.SetM(this.K1);
		this.K.AddM(this.K2);
		this.K.AddM(this.K3);
		this.K.Solve(b2RevoluteJoint.tImpulse,-_loc16_,-_loc17_);
		_loc10_ = b2RevoluteJoint.tImpulse.x;
		_loc11_ = b2RevoluteJoint.tImpulse.y;
		_loc5_.m_sweep.c.x -= _loc5_.m_invMass * _loc10_;
		_loc5_.m_sweep.c.y -= _loc5_.m_invMass * _loc11_;
		_loc5_.m_sweep.a -= _loc5_.m_invI * (_loc12_ * _loc11_ - _loc13_ * _loc10_);
		_loc6_.m_sweep.c.x += _loc6_.m_invMass * _loc10_;
		_loc6_.m_sweep.c.y += _loc6_.m_invMass * _loc11_;
		_loc6_.m_sweep.a += _loc6_.m_invI * (_loc14_ * _loc11_ - _loc15_ * _loc10_);
		_loc5_.SynchronizeTransform();
		_loc6_.SynchronizeTransform();
		return _loc8_ <= b2Settings.b2_linearSlop && _loc7_ <= b2Settings.b2_angularSlop;
	}

	private static tImpulse:b2Vec2 = new b2Vec2();

	private K:b2Mat22 = new b2Mat22();
	private K1:b2Mat22 = new b2Mat22();
	private K2:b2Mat22 = new b2Mat22();
	private K3:b2Mat22 = new b2Mat22();

	private impulse3:b2Vec3 = new b2Vec3();
	private impulse2:b2Vec2 = new b2Vec2();
	private reduced:b2Vec2 = new b2Vec2();

	public m_localAnchor1:b2Vec2 = new b2Vec2();
	public m_localAnchor2:b2Vec2 = new b2Vec2();

	private m_impulse:b2Vec3 = new b2Vec3();
	private m_motorImpulse:number = 0;

	private m_mass:b2Mat33 = new b2Mat33();
	private m_motorMass:number = 0;
	private m_enableMotor:boolean = false;
	private m_maxMotorTorque:number = 0;
	private m_motorSpeed:number = 0;

	private m_enableLimit:boolean = false;
	private m_referenceAngle:number = 0;
	private m_lowerAngle:number = 0;
	private m_upperAngle:number = 0;
	private m_limitState:number = 0;
}
