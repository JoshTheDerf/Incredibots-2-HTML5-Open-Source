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

import { b2Body, b2CircleContact, b2ConcaveArcAndCircleContact, b2ContactEdge, b2ContactListener, b2ContactRegister, b2Manifold, b2Math, b2PolyAndCircleContact, b2PolyAndConcaveArcContact, b2PolyAndStaticEdgeContact, b2PolygonContact, b2Shape, b2StaticEdgeAndCircleContact } from "../..";












//typedef b2Contact* b2ContactCreateFcn(b2Shape* shape1, b2Shape* shape2, b2BlockAllocator* allocator);
//typedef void b2ContactDestroyFcn(b2Contact* contact, b2BlockAllocator* allocator);



export class b2Contact
{
	public GetManifolds():Array<any>{return null};

	/// Get the number of manifolds. This is 0 or 1 between convex shapes.
	/// This may be greater than 1 for convex-vs-concave shapes. Each
	/// manifold holds up to two contact points with a shared contact normal.
	public GetManifoldCount():number
	{
		return this.m_manifoldCount;
	}

	/// Is this contact solid?
	/// @return true if this contact should generate a response.
	public IsSolid():boolean{
		return (this.m_flags & b2Contact.e_nonSolidFlag) == 0;
	}

	/// Get the next contact in the world's contact list.
	public GetNext():b2Contact{
		return this.m_next;
	}

	/// Get the first shape in this contact.
	public GetShape1():b2Shape{
		return this.m_shape1;
	}

	/// Get the second shape in this contact.
	public GetShape2():b2Shape{
		return this.m_shape2;
	}

	//--------------- Internals Below -------------------

	// m_flags
	// enum
	public static e_nonSolidFlag:number	= 0x0001;
	public static e_slowFlag:number		= 0x0002;
	public static e_islandFlag:number		= 0x0004;
	public static e_toiFlag:number		= 0x0008;

	public static AddType(createFcn:Function, destroyFcn:Function, type1:number, type2:number) : void
	{
		//b2Settings.b2Assert(b2Shape.e_unknownShape < type1 && type1 < b2Shape.e_shapeTypeCount);
		//b2Settings.b2Assert(b2Shape.e_unknownShape < type2 && type2 < b2Shape.e_shapeTypeCount);

		b2Contact.s_registers[type1][type2].createFcn = createFcn;
		b2Contact.s_registers[type1][type2].destroyFcn = destroyFcn;
		b2Contact.s_registers[type1][type2].primary = true;

		if (type1 != type2)
		{
			b2Contact.s_registers[type2][type1].createFcn = createFcn;
			b2Contact.s_registers[type2][type1].destroyFcn = destroyFcn;
			b2Contact.s_registers[type2][type1].primary = false;
		}
	}
	public static InitializeRegisters() : void{
		b2Contact.s_registers = new Array(b2Shape.e_shapeTypeCount);
		for (var i:number = 0; i < b2Shape.e_shapeTypeCount; i++){
			b2Contact.s_registers[i] = new Array(b2Shape.e_shapeTypeCount);
			for (var j:number = 0; j < b2Shape.e_shapeTypeCount; j++){
				b2Contact.s_registers[i][j] = new b2ContactRegister();
			}
		}

		b2Contact.AddType(b2CircleContact.Create, b2CircleContact.Destroy, b2Shape.e_circleShape, b2Shape.e_circleShape);
		b2Contact.AddType(b2PolyAndCircleContact.Create, b2PolyAndCircleContact.Destroy, b2Shape.e_polygonShape, b2Shape.e_circleShape);
		b2Contact.AddType(b2PolygonContact.Create, b2PolygonContact.Destroy, b2Shape.e_polygonShape, b2Shape.e_polygonShape);

		b2Contact.AddType(b2ConcaveArcAndCircleContact.Create, b2ConcaveArcAndCircleContact.Destroy, b2Shape.e_concaveArcShape, b2Shape.e_circleShape);
		b2Contact.AddType(b2PolyAndConcaveArcContact.Create, b2PolyAndConcaveArcContact.Destroy, b2Shape.e_polygonShape, b2Shape.e_concaveArcShape);

		b2Contact.AddType(b2StaticEdgeAndCircleContact.Create, b2StaticEdgeAndCircleContact.Destroy, b2Shape.e_staticEdgeShape, b2Shape.e_circleShape);
		b2Contact.AddType(b2PolyAndStaticEdgeContact.Create, b2PolyAndStaticEdgeContact.Destroy, b2Shape.e_polygonShape, b2Shape.e_staticEdgeShape);

	}
	public static Create(shape1:b2Shape, shape2:b2Shape, allocator:any):b2Contact{
		if (b2Contact.s_initialized == false)
		{
			b2Contact.InitializeRegisters();
			b2Contact.s_initialized = true;
		}

		var type1:number = shape1.m_type;
		var type2:number = shape2.m_type;

		//b2Settings.b2Assert(b2Shape.e_unknownShape < type1 && type1 < b2Shape.e_shapeTypeCount);
		//b2Settings.b2Assert(b2Shape.e_unknownShape < type2 && type2 < b2Shape.e_shapeTypeCount);

		var reg:b2ContactRegister = b2Contact.s_registers[type1][type2];
		var createFcn:Function = reg.createFcn;
		if (createFcn != null)
		{
			if (reg.primary)
			{
				return createFcn(shape1, shape2, allocator);
			}
			else
			{
				var c:b2Contact = createFcn(shape2, shape1, allocator);
				for (var i:number = 0; i < c.m_manifoldCount; ++i)
				{
					var m:b2Manifold = c.GetManifolds()[ i ];
					m.normal = m.normal.Negative();
				}
				return c;
			}
		}
		else
		{
			return null;
		}
	}
	public static Destroy(contact:b2Contact, allocator:any) : void{
		//b2Settings.b2Assert(s_initialized == true);

		if (contact.m_manifoldCount > 0)
		{
			contact.m_shape1.m_body.WakeUp();
			contact.m_shape2.m_body.WakeUp();
		}

		var type1:number = contact.m_shape1.m_type;
		var type2:number = contact.m_shape2.m_type;

		//b2Settings.b2Assert(b2Shape.e_unknownShape < type1 && type1 < b2Shape.e_shapeTypeCount);
		//b2Settings.b2Assert(b2Shape.e_unknownShape < type2 && type2 < b2Shape.e_shapeTypeCount);

		var reg:b2ContactRegister = b2Contact.s_registers[type1][type2];
		var destroyFcn:Function = reg.destroyFcn;
		destroyFcn(contact, allocator);
	}

	constructor(s1:b2Shape=null, s2:b2Shape=null)
	{
		this.m_flags = 0;

		if (!s1 || !s2){
			this.m_shape1 = null;
			this.m_shape2 = null;
			return;
		}

		if (s1.IsSensor() || s2.IsSensor())
		{
			this.m_flags |= b2Contact.e_nonSolidFlag;
		}

		this.m_shape1 = s1;
		this.m_shape2 = s2;

		this.m_manifoldCount = 0;

		this.m_friction = Math.sqrt(this.m_shape1.m_friction * this.m_shape2.m_friction);
		this.m_restitution = b2Math.b2Max(this.m_shape1.m_restitution, this.m_shape2.m_restitution);

		this.m_prev = null;
		this.m_next = null;

		this.m_node1.contact = null;
		this.m_node1.prev = null;
		this.m_node1.next = null;
		this.m_node1.other = null;

		this.m_node2.contact = null;
		this.m_node2.prev = null;
		this.m_node2.next = null;
		this.m_node2.other = null;
	}

	public Update(listener:b2ContactListener) : void
	{
		var oldCount:number = this.m_manifoldCount;

		this.Evaluate(listener);

		var newCount:number = this.m_manifoldCount;

		var body1:b2Body = this.m_shape1.m_body;
		var body2:b2Body = this.m_shape2.m_body;

		if (newCount == 0 && oldCount > 0)
		{
			body1.WakeUp();
			body2.WakeUp();
		}

		// Slow contacts don't generate TOI events.
		if (body1.IsStatic() || body1.IsBullet() || body2.IsStatic() || body2.IsBullet())
		{
			this.m_flags &= ~b2Contact.e_slowFlag;
		}
		else
		{
			this.m_flags |= b2Contact.e_slowFlag;
		}
	}

	//virtual ~b2Contact() {}

	public Evaluate(listener:b2ContactListener) : void{};
	public static s_registers:Array<any>; //[][]
	public static s_initialized:boolean = false;

	public m_flags:number;

	// World pool and list pointers.
	public m_prev:b2Contact;
	public m_next:b2Contact;

	// Nodes for connecting bodies.
	public m_node1:b2ContactEdge = new b2ContactEdge();
	public m_node2:b2ContactEdge = new b2ContactEdge();

	public m_shape1:b2Shape;
	public m_shape2:b2Shape;

	public m_manifoldCount:number;

	// Combined friction
	public m_friction:number;
	public m_restitution:number;

	public m_toi:number;

}
