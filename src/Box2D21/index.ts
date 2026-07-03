// Box2DFlash 2.1alpha — mechanical TypeScript port of the IncrediBots 3
// decompiled engine (ib3-decompiled/scripts/Box2D). Self-contained module:
// MUST NOT import from src/Box2D (the 2.0.2 engine) and vice versa.
//
// Export order matters at module-eval time: base classes (b2Shape, b2Contact,
// b2Joint, b2JointDef, b2Controller) before their subclasses, and value
// dependencies of static initializers (b2Vec2 before b2Math) first.

// Common / Math
export * from './Common/Math/b2Vec2'
export * from './Common/Math/b2Vec3'
export * from './Common/Math/b2Mat22'
export * from './Common/Math/b2Mat33'
export * from './Common/Math/b2Transform'
export * from './Common/Math/b2Sweep'
export * from './Common/Math/b2Math'

// Common
export * from './Common/b2Settings'
export * from './Common/b2Color'

// Collision — support types
export * from './Collision/b2AABB'
export * from './Collision/Features'
export * from './Collision/b2ContactID'
export * from './Collision/b2ContactPoint'
export * from './Collision/b2ManifoldPoint'
export * from './Collision/b2Manifold'
export * from './Collision/b2WorldManifold'
export * from './Collision/b2OBB'
export * from './Collision/b2RayCastInput'
export * from './Collision/b2RayCastOutput'
export * from './Collision/ClipVertex'

// Collision — shapes (b2Shape base first)
export * from './Collision/Shapes/b2MassData'
export * from './Collision/Shapes/b2Shape'
export * from './Collision/Shapes/b2CircleShape'
export * from './Collision/Shapes/b2PolygonShape'
export * from './Collision/Shapes/b2EdgeShape'

// Collision — distance / TOI
export * from './Collision/b2DistanceProxy'
export * from './Collision/b2DistanceInput'
export * from './Collision/b2DistanceOutput'
export * from './Collision/b2SimplexCache'
export * from './Collision/b2SimplexVertex'
export * from './Collision/b2Simplex'
export * from './Collision/b2Distance'
export * from './Collision/b2TOIInput'
export * from './Collision/b2SeparationFunction'
export * from './Collision/b2TimeOfImpact'
export * from './Collision/b2Collision'

// Collision — broad-phase
export * from './Collision/IBroadPhase'
export * from './Collision/b2DynamicTreeNode'
export * from './Collision/b2DynamicTreePair'
export * from './Collision/b2DynamicTree'
export * from './Collision/b2DynamicTreeBroadPhase'

// Dynamics — defs / support
export * from './Dynamics/b2TimeStep'
export * from './Dynamics/b2FilterData'
export * from './Dynamics/b2FixtureDef'
export * from './Dynamics/b2Fixture'
export * from './Dynamics/b2BodyDef'
export * from './Dynamics/b2Body'
export * from './Dynamics/b2ContactFilter'
export * from './Dynamics/b2ContactImpulse'
export * from './Dynamics/b2ContactListener'
export * from './Dynamics/b2DestructionListener'
export * from './Dynamics/b2DebugDraw'

// Dynamics — contacts (b2Contact base first)
export * from './Dynamics/Contacts/b2ContactEdge'
export * from './Dynamics/Contacts/b2ContactRegister'
export * from './Dynamics/Contacts/b2ContactConstraintPoint'
export * from './Dynamics/Contacts/b2ContactConstraint'
export * from './Dynamics/Contacts/b2Contact'
export * from './Dynamics/Contacts/b2CircleContact'
export * from './Dynamics/Contacts/b2PolygonContact'
export * from './Dynamics/Contacts/b2PolyAndCircleContact'
export * from './Dynamics/Contacts/b2EdgeAndCircleContact'
export * from './Dynamics/Contacts/b2PolyAndEdgeContact'
export * from './Dynamics/Contacts/b2ContactFactory'
export * from './Dynamics/Contacts/b2PositionSolverManifold'
export * from './Dynamics/Contacts/b2ContactSolver'

// Dynamics — joints (b2Joint / b2JointDef bases first)
export * from './Dynamics/Joints/b2Jacobian'
export * from './Dynamics/Joints/b2JointEdge'
export * from './Dynamics/Joints/b2JointDef'
export * from './Dynamics/Joints/b2Joint'
export * from './Dynamics/Joints/b2DistanceJoint'
export * from './Dynamics/Joints/b2DistanceJointDef'
export * from './Dynamics/Joints/b2FrictionJoint'
export * from './Dynamics/Joints/b2FrictionJointDef'
export * from './Dynamics/Joints/b2GearJoint'
export * from './Dynamics/Joints/b2GearJointDef'
export * from './Dynamics/Joints/b2LineJoint'
export * from './Dynamics/Joints/b2LineJointDef'
export * from './Dynamics/Joints/b2MouseJoint'
export * from './Dynamics/Joints/b2MouseJointDef'
export * from './Dynamics/Joints/b2PrismaticJoint'
export * from './Dynamics/Joints/b2PrismaticJointDef'
export * from './Dynamics/Joints/b2PulleyJoint'
export * from './Dynamics/Joints/b2PulleyJointDef'
export * from './Dynamics/Joints/b2RevoluteJoint'
export * from './Dynamics/Joints/b2RevoluteJointDef'
export * from './Dynamics/Joints/b2WeldJoint'
export * from './Dynamics/Joints/b2WeldJointDef'

// Dynamics — controllers (b2Controller base first)
export * from './Dynamics/Controllers/b2ControllerEdge'
export * from './Dynamics/Controllers/b2Controller'
export * from './Dynamics/Controllers/b2BuoyancyController'
export * from './Dynamics/Controllers/b2TideController'
export * from './Dynamics/Controllers/WaveController/b2Wave'
export * from './Dynamics/Controllers/b2WaveController'

// Dynamics — core
export * from './Dynamics/b2ContactManager'
export * from './Dynamics/b2Island'
export * from './Dynamics/b2World'
