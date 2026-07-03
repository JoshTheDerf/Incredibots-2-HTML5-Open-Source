// Physics engine seam (P1.5b-1/-2a). See PhysicsBackend.ts for the design contract.
export type {
	BodyTransform,
	ContactHooks,
	ContactPointLike,
	PhysicsBackend,
	SegmentHit,
	Vec2Like,
	WaterControllerDef,
	WaterSurfaceReadback,
	WaterWaveSample,
	WorldDef,
} from "./PhysicsBackend";
export { WATER_TYPE_TIDE, WATER_TYPE_WAVE } from "./PhysicsBackend";
export { Box2D20Backend, box2d20Backend } from "./Box2D20Backend";
export { Box2D21Backend, box2d21Backend } from "./Box2D21Backend";
