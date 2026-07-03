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

import { b2AABB, b2CircleShape, b2Manifold, b2ManifoldPoint, b2Mat22, b2PolygonShape, b2Settings, b2Transform, b2Vec2, ClipVertex } from "..";



export class b2Collision
{

	public static b2_nullFeature:number = 255;

	private static s_incidentEdge:ClipVertex[] = b2Collision.MakeClipPointVector();

	private static s_clipPoints1:ClipVertex[] = b2Collision.MakeClipPointVector();

	private static s_clipPoints2:ClipVertex[] = b2Collision.MakeClipPointVector();

	private static s_edgeAO:number[] = [0];

	private static s_edgeBO:number[] = [0];

	private static s_localTangent:b2Vec2 = new b2Vec2();

	private static s_localNormal:b2Vec2 = new b2Vec2();

	private static s_planePoint:b2Vec2 = new b2Vec2();

	private static s_normal:b2Vec2 = new b2Vec2();

	private static s_tangent:b2Vec2 = new b2Vec2();

	private static s_tangent2:b2Vec2 = new b2Vec2();

	private static s_v11:b2Vec2 = new b2Vec2();

	private static s_v12:b2Vec2 = new b2Vec2();

	private static b2CollidePolyTempVec:b2Vec2 = new b2Vec2();

	public static ClipSegmentToLine(param1:ClipVertex[], param2:ClipVertex[], param3:b2Vec2, param4:number) : number
	{
		var _loc5_:ClipVertex;
		var _loc6_:number = 0;
		var _loc7_:b2Vec2;
		var _loc9_:number;
		var _loc11_:number;
		var _loc12_:b2Vec2;
		var _loc13_:ClipVertex;
		_loc6_ = 0;
		_loc5_ = param2[0];
		_loc7_ = _loc5_.v;
		_loc5_ = param2[1];
		var _loc8_:b2Vec2 = _loc5_.v;
		_loc9_ = param3.x * _loc7_.x + param3.y * _loc7_.y - param4;
		var _loc10_:number = param3.x * _loc8_.x + param3.y * _loc8_.y - param4;
		if(_loc9_ <= 0)
		{
			param1[_loc6_++].Set(param2[0]);
		}
		if(_loc10_ <= 0)
		{
			param1[_loc6_++].Set(param2[1]);
		}
		if(_loc9_ * _loc10_ < 0)
		{
			_loc11_ = _loc9_ / (_loc9_ - _loc10_);
			_loc5_ = param1[_loc6_];
			_loc12_ = _loc5_.v;
			_loc12_.x = _loc7_.x + _loc11_ * (_loc8_.x - _loc7_.x);
			_loc12_.y = _loc7_.y + _loc11_ * (_loc8_.y - _loc7_.y);
			_loc5_ = param1[_loc6_];
			if(_loc9_ > 0)
			{
				_loc13_ = param2[0];
				_loc5_.id = _loc13_.id;
			}
			else
			{
				_loc13_ = param2[1];
				_loc5_.id = _loc13_.id;
			}
			_loc6_++;
		}
		return _loc6_;
	}

	public static EdgeSeparation(param1:b2PolygonShape, param2:b2Transform, param3:number, param4:b2PolygonShape, param5:b2Transform) : number
	{
		var _loc11_:b2Mat22;
		var _loc12_:b2Vec2;
		var _loc25_:number;
		var _loc6_:number = param1.m_vertexCount;
		var _loc7_:b2Vec2[] = param1.m_vertices;
		var _loc8_:b2Vec2[] = param1.m_normals;
		var _loc9_:number = param4.m_vertexCount;
		var _loc10_:b2Vec2[] = param4.m_vertices;
		_loc11_ = param2.R;
		_loc12_ = _loc8_[param3];
		var _loc13_:number = _loc11_.col1.x * _loc12_.x + _loc11_.col2.x * _loc12_.y;
		var _loc14_:number = _loc11_.col1.y * _loc12_.x + _loc11_.col2.y * _loc12_.y;
		_loc11_ = param5.R;
		var _loc15_:number = _loc11_.col1.x * _loc13_ + _loc11_.col1.y * _loc14_;
		var _loc16_:number = _loc11_.col2.x * _loc13_ + _loc11_.col2.y * _loc14_;
		var _loc17_:number = 0;
		var _loc18_:number = Number.MAX_VALUE;
		var _loc19_:number = 0;
		while(_loc19_ < _loc9_)
		{
			_loc12_ = _loc10_[_loc19_];
			_loc25_ = _loc12_.x * _loc15_ + _loc12_.y * _loc16_;
			if(_loc25_ < _loc18_)
			{
				_loc18_ = _loc25_;
				_loc17_ = _loc19_;
			}
			_loc19_++;
		}
		_loc12_ = _loc7_[param3];
		_loc11_ = param2.R;
		var _loc20_:number = param2.position.x + (_loc11_.col1.x * _loc12_.x + _loc11_.col2.x * _loc12_.y);
		var _loc21_:number = param2.position.y + (_loc11_.col1.y * _loc12_.x + _loc11_.col2.y * _loc12_.y);
		_loc12_ = _loc10_[_loc17_];
		_loc11_ = param5.R;
		var _loc22_:number = param5.position.x + (_loc11_.col1.x * _loc12_.x + _loc11_.col2.x * _loc12_.y);
		var _loc23_:number = param5.position.y + (_loc11_.col1.y * _loc12_.x + _loc11_.col2.y * _loc12_.y);
		_loc22_ -= _loc20_;
		_loc23_ -= _loc21_;
		return _loc22_ * _loc13_ + _loc23_ * _loc14_;
	}

	public static FindMaxSeparation(param1:number[], param2:b2PolygonShape, param3:b2Transform, param4:b2PolygonShape, param5:b2Transform) : number
	{
		var _loc8_:b2Vec2;
		var _loc9_:b2Mat22;
		var _loc22_:number = 0;
		var _loc23_:number;
		var _loc24_:number = 0;
		var _loc25_:number;
		var _loc6_:number = param2.m_vertexCount;
		var _loc7_:b2Vec2[] = param2.m_normals;
		_loc9_ = param5.R;
		_loc8_ = param4.m_centroid;
		var _loc10_:number = param5.position.x + (_loc9_.col1.x * _loc8_.x + _loc9_.col2.x * _loc8_.y);
		var _loc11_:number = param5.position.y + (_loc9_.col1.y * _loc8_.x + _loc9_.col2.y * _loc8_.y);
		_loc9_ = param3.R;
		_loc8_ = param2.m_centroid;
		_loc10_ -= param3.position.x + (_loc9_.col1.x * _loc8_.x + _loc9_.col2.x * _loc8_.y);
		_loc11_ -= param3.position.y + (_loc9_.col1.y * _loc8_.x + _loc9_.col2.y * _loc8_.y);
		var _loc12_:number = _loc10_ * param3.R.col1.x + _loc11_ * param3.R.col1.y;
		var _loc13_:number = _loc10_ * param3.R.col2.x + _loc11_ * param3.R.col2.y;
		var _loc14_:number = 0;
		var _loc15_:number = -Number.MAX_VALUE;
		var _loc16_:number = 0;
		while(_loc16_ < _loc6_)
		{
			_loc8_ = _loc7_[_loc16_];
			_loc25_ = _loc8_.x * _loc12_ + _loc8_.y * _loc13_;
			if(_loc25_ > _loc15_)
			{
				_loc15_ = _loc25_;
				_loc14_ = _loc16_;
			}
			_loc16_++;
		}
		var _loc17_:number = b2Collision.EdgeSeparation(param2,param3,_loc14_,param4,param5);
		var _loc18_:number = _loc14_ - 1 >= 0 ? (_loc14_ - 1) : (_loc6_ - 1);
		var _loc19_:number = b2Collision.EdgeSeparation(param2,param3,_loc18_,param4,param5);
		var _loc20_:number = _loc14_ + 1 < _loc6_ ? (_loc14_ + 1) : 0;
		var _loc21_:number = b2Collision.EdgeSeparation(param2,param3,_loc20_,param4,param5);
		if(_loc19_ > _loc17_ && _loc19_ > _loc21_)
		{
			_loc24_ = -1;
			_loc22_ = _loc18_;
			_loc23_ = _loc19_;
		}
		else
		{
			if(_loc21_ <= _loc17_)
			{
				param1[0] = _loc14_;
				return _loc17_;
			}
			_loc24_ = 1;
			_loc22_ = _loc20_;
			_loc23_ = _loc21_;
		}
		while(true)
		{
			if(_loc24_ == -1)
			{
				_loc14_ = _loc22_ - 1 >= 0 ? (_loc22_ - 1) : (_loc6_ - 1);
			}
			else
			{
				_loc14_ = _loc22_ + 1 < _loc6_ ? (_loc22_ + 1) : 0;
			}
			_loc17_ = b2Collision.EdgeSeparation(param2,param3,_loc14_,param4,param5);
			if(_loc17_ <= _loc23_)
			{
				break;
			}
			_loc22_ = _loc14_;
			_loc23_ = _loc17_;
		}
		param1[0] = _loc22_;
		return _loc23_;
	}

	public static FindIncidentEdge(param1:ClipVertex[], param2:b2PolygonShape, param3:b2Transform, param4:number, param5:b2PolygonShape, param6:b2Transform) : void
	{
		var _loc12_:b2Mat22;
		var _loc13_:b2Vec2;
		var _loc20_:ClipVertex;
		var _loc23_:number;
		var _loc7_:number = param2.m_vertexCount;
		var _loc8_:b2Vec2[] = param2.m_normals;
		var _loc9_:number = param5.m_vertexCount;
		var _loc10_:b2Vec2[] = param5.m_vertices;
		var _loc11_:b2Vec2[] = param5.m_normals;
		_loc12_ = param3.R;
		_loc13_ = _loc8_[param4];
		var _loc14_:number = _loc12_.col1.x * _loc13_.x + _loc12_.col2.x * _loc13_.y;
		var _loc15_:number = _loc12_.col1.y * _loc13_.x + _loc12_.col2.y * _loc13_.y;
		_loc12_ = param6.R;
		var _loc16_:number = _loc12_.col1.x * _loc14_ + _loc12_.col1.y * _loc15_;
		_loc15_ = _loc12_.col2.x * _loc14_ + _loc12_.col2.y * _loc15_;
		_loc14_ = _loc16_;
		var _loc17_:number = 0;
		var _loc18_:number = Number.MAX_VALUE;
		var _loc19_:number = 0;
		while(_loc19_ < _loc9_)
		{
			_loc13_ = _loc11_[_loc19_];
			_loc23_ = _loc14_ * _loc13_.x + _loc15_ * _loc13_.y;
			if(_loc23_ < _loc18_)
			{
				_loc18_ = _loc23_;
				_loc17_ = _loc19_;
			}
			_loc19_++;
		}
		var _loc21_:number = _loc17_;
		var _loc22_:number = _loc21_ + 1 < _loc9_ ? (_loc21_ + 1) : 0;
		_loc20_ = param1[0];
		_loc13_ = _loc10_[_loc21_];
		_loc12_ = param6.R;
		_loc20_.v.x = param6.position.x + (_loc12_.col1.x * _loc13_.x + _loc12_.col2.x * _loc13_.y);
		_loc20_.v.y = param6.position.y + (_loc12_.col1.y * _loc13_.x + _loc12_.col2.y * _loc13_.y);
		_loc20_.id.features.referenceEdge = param4;
		_loc20_.id.features.incidentEdge = _loc21_;
		_loc20_.id.features.incidentVertex = 0;
		_loc20_ = param1[1];
		_loc13_ = _loc10_[_loc22_];
		_loc12_ = param6.R;
		_loc20_.v.x = param6.position.x + (_loc12_.col1.x * _loc13_.x + _loc12_.col2.x * _loc13_.y);
		_loc20_.v.y = param6.position.y + (_loc12_.col1.y * _loc13_.x + _loc12_.col2.y * _loc13_.y);
		_loc20_.id.features.referenceEdge = param4;
		_loc20_.id.features.incidentEdge = _loc22_;
		_loc20_.id.features.incidentVertex = 1;
	}

	private static MakeClipPointVector() : ClipVertex[]
	{
		var _loc1_:ClipVertex[] = new Array<ClipVertex>(2);
		_loc1_[0] = new ClipVertex();
		_loc1_[1] = new ClipVertex();
		return _loc1_;
	}

	public static CollidePolygons(param1:b2Manifold, param2:b2PolygonShape, param3:b2Transform, param4:b2PolygonShape, param5:b2Transform) : void
	{
		var _loc6_:ClipVertex;
		var _loc12_:b2PolygonShape;
		var _loc13_:b2PolygonShape;
		var _loc14_:b2Transform;
		var _loc15_:b2Transform;
		var _loc16_:number = 0;
		var _loc17_:number = 0;
		var _loc20_:b2Mat22;
		var _loc25_:b2Vec2;
		var _loc39_:number = 0;
		var _loc42_:number;
		var _loc43_:b2ManifoldPoint;
		var _loc44_:number;
		var _loc45_:number;
		param1.m_pointCount = 0;
		var _loc7_:number = param2.m_radius + param4.m_radius;
		var _loc8_:number = 0;
		b2Collision.s_edgeAO[0] = _loc8_;
		var _loc9_:number = b2Collision.FindMaxSeparation(b2Collision.s_edgeAO,param2,param3,param4,param5);
		_loc8_ = b2Collision.s_edgeAO[0];
		if(_loc9_ > _loc7_)
		{
			return;
		}
		var _loc10_:number = 0;
		b2Collision.s_edgeBO[0] = _loc10_;
		var _loc11_:number = b2Collision.FindMaxSeparation(b2Collision.s_edgeBO,param4,param5,param2,param3);
		_loc10_ = b2Collision.s_edgeBO[0];
		if(_loc11_ > _loc7_)
		{
			return;
		}
		var _loc18_:number = 0.98;
		var _loc19_:number = 0.001;
		if(_loc11_ > _loc18_ * _loc9_ + _loc19_)
		{
			_loc12_ = param4;
			_loc13_ = param2;
			_loc14_ = param5;
			_loc15_ = param3;
			_loc16_ = _loc10_;
			param1.m_type = b2Manifold.e_faceB;
			_loc17_ = 1;
		}
		else
		{
			_loc12_ = param2;
			_loc13_ = param4;
			_loc14_ = param3;
			_loc15_ = param5;
			_loc16_ = _loc8_;
			param1.m_type = b2Manifold.e_faceA;
			_loc17_ = 0;
		}
		var _loc21_:ClipVertex[] = b2Collision.s_incidentEdge;
		b2Collision.FindIncidentEdge(_loc21_,_loc12_,_loc14_,_loc16_,_loc13_,_loc15_);
		var _loc22_:number = _loc12_.m_vertexCount;
		var _loc23_:b2Vec2[] = _loc12_.m_vertices;
		var _loc24_:b2Vec2 = _loc23_[_loc16_];
		if(_loc16_ + 1 < _loc22_)
		{
			_loc25_ = _loc23_[_loc16_ + 1];
		}
		else
		{
			_loc25_ = _loc23_[0];
		}
		var _loc26_:b2Vec2 = b2Collision.s_localTangent;
		_loc26_.Set(_loc25_.x - _loc24_.x,_loc25_.y - _loc24_.y);
		_loc26_.Normalize();
		var _loc27_:b2Vec2 = b2Collision.s_localNormal;
		_loc27_.x = _loc26_.y;
		_loc27_.y = -_loc26_.x;
		var _loc28_:b2Vec2 = b2Collision.s_planePoint;
		_loc28_.Set(0.5 * (_loc24_.x + _loc25_.x),0.5 * (_loc24_.y + _loc25_.y));
		var _loc29_:b2Vec2 = b2Collision.s_tangent;
		_loc20_ = _loc14_.R;
		_loc29_.x = _loc20_.col1.x * _loc26_.x + _loc20_.col2.x * _loc26_.y;
		_loc29_.y = _loc20_.col1.y * _loc26_.x + _loc20_.col2.y * _loc26_.y;
		var _loc30_:b2Vec2 = b2Collision.s_tangent2;
		_loc30_.x = -_loc29_.x;
		_loc30_.y = -_loc29_.y;
		var _loc31_:b2Vec2 = b2Collision.s_normal;
		_loc31_.x = _loc29_.y;
		_loc31_.y = -_loc29_.x;
		var _loc32_:b2Vec2 = b2Collision.s_v11;
		var _loc33_:b2Vec2 = b2Collision.s_v12;
		_loc32_.x = _loc14_.position.x + (_loc20_.col1.x * _loc24_.x + _loc20_.col2.x * _loc24_.y);
		_loc32_.y = _loc14_.position.y + (_loc20_.col1.y * _loc24_.x + _loc20_.col2.y * _loc24_.y);
		_loc33_.x = _loc14_.position.x + (_loc20_.col1.x * _loc25_.x + _loc20_.col2.x * _loc25_.y);
		_loc33_.y = _loc14_.position.y + (_loc20_.col1.y * _loc25_.x + _loc20_.col2.y * _loc25_.y);
		var _loc34_:number = _loc31_.x * _loc32_.x + _loc31_.y * _loc32_.y;
		var _loc35_:number = -_loc29_.x * _loc32_.x - _loc29_.y * _loc32_.y + _loc7_;
		var _loc36_:number = _loc29_.x * _loc33_.x + _loc29_.y * _loc33_.y + _loc7_;
		var _loc37_:ClipVertex[] = b2Collision.s_clipPoints1;
		var _loc38_:ClipVertex[] = b2Collision.s_clipPoints2;
		_loc39_ = b2Collision.ClipSegmentToLine(_loc37_,_loc21_,_loc30_,_loc35_);
		if(_loc39_ < 2)
		{
			return;
		}
		_loc39_ = b2Collision.ClipSegmentToLine(_loc38_,_loc37_,_loc29_,_loc36_);
		if(_loc39_ < 2)
		{
			return;
		}
		param1.m_localPlaneNormal.SetV(_loc27_);
		param1.m_localPoint.SetV(_loc28_);
		var _loc40_:number = 0;
		var _loc41_:number = 0;
		while(_loc41_ < b2Settings.b2_maxManifoldPoints)
		{
			_loc6_ = _loc38_[_loc41_];
			_loc42_ = _loc31_.x * _loc6_.v.x + _loc31_.y * _loc6_.v.y - _loc34_;
			if(_loc42_ <= _loc7_)
			{
				_loc43_ = param1.m_points[_loc40_];
				_loc20_ = _loc15_.R;
				_loc44_ = _loc6_.v.x - _loc15_.position.x;
				_loc45_ = _loc6_.v.y - _loc15_.position.y;
				_loc43_.m_localPoint.x = _loc44_ * _loc20_.col1.x + _loc45_ * _loc20_.col1.y;
				_loc43_.m_localPoint.y = _loc44_ * _loc20_.col2.x + _loc45_ * _loc20_.col2.y;
				_loc43_.m_id.Set(_loc6_.id);
				_loc43_.m_id.features.flip = _loc17_;
				_loc40_++;
			}
			_loc41_++;
		}
		param1.m_pointCount = _loc40_;
	}

	public static CollideCircles(param1:b2Manifold, param2:b2CircleShape, param3:b2Transform, param4:b2CircleShape, param5:b2Transform) : void
	{
		var _loc6_:b2Mat22;
		var _loc7_:b2Vec2;
		param1.m_pointCount = 0;
		_loc6_ = param3.R;
		_loc7_ = param2.m_p;
		var _loc8_:number = param3.position.x + (_loc6_.col1.x * _loc7_.x + _loc6_.col2.x * _loc7_.y);
		var _loc9_:number = param3.position.y + (_loc6_.col1.y * _loc7_.x + _loc6_.col2.y * _loc7_.y);
		_loc6_ = param5.R;
		_loc7_ = param4.m_p;
		var _loc10_:number = param5.position.x + (_loc6_.col1.x * _loc7_.x + _loc6_.col2.x * _loc7_.y);
		var _loc11_:number = param5.position.y + (_loc6_.col1.y * _loc7_.x + _loc6_.col2.y * _loc7_.y);
		var _loc12_:number = _loc10_ - _loc8_;
		var _loc13_:number = _loc11_ - _loc9_;
		var _loc14_:number = _loc12_ * _loc12_ + _loc13_ * _loc13_;
		var _loc15_:number = param2.m_radius + param4.m_radius;
		if(_loc14_ > _loc15_ * _loc15_)
		{
			return;
		}
		param1.m_type = b2Manifold.e_circles;
		param1.m_localPoint.SetV(param2.m_p);
		param1.m_localPlaneNormal.SetZero();
		param1.m_pointCount = 1;
		param1.m_points[0].m_localPoint.SetV(param4.m_p);
		param1.m_points[0].m_id.key = 0;
	}

	public static CollidePolygonAndCircle(param1:b2Manifold, param2:b2PolygonShape, param3:b2Transform, param4:b2CircleShape, param5:b2Transform) : void
	{
		var _loc6_:b2ManifoldPoint;
		var _loc7_:number;
		var _loc8_:number;
		var _loc9_:number;
		var _loc10_:number;
		var _loc11_:b2Vec2;
		var _loc12_:b2Mat22;
		var _loc17_:number;
		var _loc31_:number;
		var _loc32_:number;
		var _loc33_:number;
		param1.m_pointCount = 0;
		_loc12_ = param5.R;
		_loc11_ = param4.m_p;
		var _loc13_:number = param5.position.x + (_loc12_.col1.x * _loc11_.x + _loc12_.col2.x * _loc11_.y);
		var _loc14_:number = param5.position.y + (_loc12_.col1.y * _loc11_.x + _loc12_.col2.y * _loc11_.y);
		_loc7_ = _loc13_ - param3.position.x;
		_loc8_ = _loc14_ - param3.position.y;
		_loc12_ = param3.R;
		var _loc15_:number = _loc7_ * _loc12_.col1.x + _loc8_ * _loc12_.col1.y;
		var _loc16_:number = _loc7_ * _loc12_.col2.x + _loc8_ * _loc12_.col2.y;
		var _loc18_:number = 0;
		var _loc19_:number = -Number.MAX_VALUE;
		var _loc20_:number = param2.m_radius + param4.m_radius;
		var _loc21_:number = param2.m_vertexCount;
		var _loc22_:b2Vec2[] = param2.m_vertices;
		var _loc23_:b2Vec2[] = param2.m_normals;
		var _loc24_:number = 0;
		while(_loc24_ < _loc21_)
		{
			_loc11_ = _loc22_[_loc24_];
			_loc7_ = _loc15_ - _loc11_.x;
			_loc8_ = _loc16_ - _loc11_.y;
			_loc11_ = _loc23_[_loc24_];
			_loc31_ = _loc11_.x * _loc7_ + _loc11_.y * _loc8_;
			if(_loc31_ > _loc20_)
			{
				return;
			}
			if(_loc31_ > _loc19_)
			{
				_loc19_ = _loc31_;
				_loc18_ = _loc24_;
			}
			_loc24_++;
		}
		var _loc25_:number = _loc18_;
		var _loc26_:number = _loc25_ + 1 < _loc21_ ? (_loc25_ + 1) : 0;
		var _loc27_:b2Vec2 = _loc22_[_loc25_];
		var _loc28_:b2Vec2 = _loc22_[_loc26_];
		if(_loc19_ < Number.MIN_VALUE)
		{
			param1.m_pointCount = 1;
			param1.m_type = b2Manifold.e_faceA;
			param1.m_localPlaneNormal.SetV(_loc23_[_loc18_]);
			param1.m_localPoint.x = 0.5 * (_loc27_.x + _loc28_.x);
			param1.m_localPoint.y = 0.5 * (_loc27_.y + _loc28_.y);
			param1.m_points[0].m_localPoint.SetV(param4.m_p);
			param1.m_points[0].m_id.key = 0;
			return;
		}
		var _loc29_:number = (_loc15_ - _loc27_.x) * (_loc28_.x - _loc27_.x) + (_loc16_ - _loc27_.y) * (_loc28_.y - _loc27_.y);
		var _loc30_:number = (_loc15_ - _loc28_.x) * (_loc27_.x - _loc28_.x) + (_loc16_ - _loc28_.y) * (_loc27_.y - _loc28_.y);
		if(_loc29_ <= 0)
		{
			if((_loc15_ - _loc27_.x) * (_loc15_ - _loc27_.x) + (_loc16_ - _loc27_.y) * (_loc16_ - _loc27_.y) > _loc20_ * _loc20_)
			{
				return;
			}
			param1.m_pointCount = 1;
			param1.m_type = b2Manifold.e_faceA;
			param1.m_localPlaneNormal.x = _loc15_ - _loc27_.x;
			param1.m_localPlaneNormal.y = _loc16_ - _loc27_.y;
			param1.m_localPlaneNormal.Normalize();
			param1.m_localPoint.SetV(_loc27_);
			param1.m_points[0].m_localPoint.SetV(param4.m_p);
			param1.m_points[0].m_id.key = 0;
		}
		else if(_loc30_ <= 0)
		{
			if((_loc15_ - _loc28_.x) * (_loc15_ - _loc28_.x) + (_loc16_ - _loc28_.y) * (_loc16_ - _loc28_.y) > _loc20_ * _loc20_)
			{
				return;
			}
			param1.m_pointCount = 1;
			param1.m_type = b2Manifold.e_faceA;
			param1.m_localPlaneNormal.x = _loc15_ - _loc28_.x;
			param1.m_localPlaneNormal.y = _loc16_ - _loc28_.y;
			param1.m_localPlaneNormal.Normalize();
			param1.m_localPoint.SetV(_loc28_);
			param1.m_points[0].m_localPoint.SetV(param4.m_p);
			param1.m_points[0].m_id.key = 0;
		}
		else
		{
			_loc32_ = 0.5 * (_loc27_.x + _loc28_.x);
			_loc33_ = 0.5 * (_loc27_.y + _loc28_.y);
			_loc19_ = (_loc15_ - _loc32_) * _loc23_[_loc25_].x + (_loc16_ - _loc33_) * _loc23_[_loc25_].y;
			if(_loc19_ > _loc20_)
			{
				return;
			}
			param1.m_pointCount = 1;
			param1.m_type = b2Manifold.e_faceA;
			param1.m_localPlaneNormal.x = _loc23_[_loc25_].x;
			param1.m_localPlaneNormal.y = _loc23_[_loc25_].y;
			param1.m_localPlaneNormal.Normalize();
			param1.m_localPoint.Set(_loc32_,_loc33_);
			param1.m_points[0].m_localPoint.SetV(param4.m_p);
			param1.m_points[0].m_id.key = 0;
		}
	}

	public static TestOverlap(param1:b2AABB, param2:b2AABB) : boolean
	{
		var _loc3_:b2Vec2 = param2.lowerBound;
		var _loc4_:b2Vec2 = param1.upperBound;
		var _loc5_:number = _loc3_.x - _loc4_.x;
		var _loc6_:number = _loc3_.y - _loc4_.y;
		_loc3_ = param1.lowerBound;
		_loc4_ = param2.upperBound;
		var _loc7_:number = _loc3_.x - _loc4_.x;
		var _loc8_:number = _loc3_.y - _loc4_.y;
		if(_loc5_ > 0 || _loc6_ > 0)
		{
			return false;
		}
		if(_loc7_ > 0 || _loc8_ > 0)
		{
			return false;
		}
		return true;
	}
}
