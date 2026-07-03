// Pixi/DOM-free default constants used by Parts (ShapePart, Thrusters, joints, etc).
//
// These values MUST stay in sync with ControllerGameGlobals's defaultR/G/B/O and
// min/maxDensity (and the related max*Strength/Speed fields). They are broken out
// into this standalone module so that headless/core Part code does not need to
// import ControllerGameGlobals, which transitively pulls in Resource -> pixi-sound
// (and therefore the DOM) at module-init time.
//
// ControllerGameGlobals re-exports/reads these same constants so legacy game code
// is unaffected.

export const DEFAULT_R = 253;
export const DEFAULT_G = 66;
export const DEFAULT_B = 42;
export const DEFAULT_O = 255;

export const MIN_DENSITY = 1;
export const MAX_DENSITY = 30;

// Friction / restitution sliders (Jaybit): the same 1..30 UI scale as density.
// Defaults 11 / 7 are chosen so the Box2D conversion reproduces CE's hardcoded
// friction=0.4 / restitution=0.3 exactly (Jaybit Parts/ShapePart.as ctor;
// Util.ConvertFrictionToBox2D / ConvertRestitutionToBox2D).
export const MIN_FRICTION = 1;
export const MAX_FRICTION = 30;
export const DEFAULT_FRICTION = 11;
export const MIN_RESTITUTION = 1;
export const MAX_RESTITUTION = 30;
export const DEFAULT_RESTITUTION = 7;

// Runtime-only "collision group not yet assigned" sentinel for
// ShapePart/PrismaticJoint.m_collisionGroup (Jaybit int.MIN_VALUE; never
// persisted). Shared so the parts' Init guards test the SAME value the field
// defaults to — the old code compared against Number.MIN_VALUE (5e-324) while
// the field defaulted to Number.MIN_SAFE_INTEGER, so the guard was always true
// and an unassigned part got groupIndex = -9007199254740991.
export const COLLISION_GROUP_UNSET = Number.MIN_SAFE_INTEGER;

// Trigger action enum (Jaybit ControllerGame.as:282-294). DATA-ONLY until the
// trigger runtime wave lands; TRIGGER_NONE is the persisted default for
// ShapePart.triggerAction / triggerAction_2.
export const TRIGGER_DESTROY = 0;
export const TRIGGER_ROTATECW = 1;
export const TRIGGER_ROTATECCW = 2;
export const TRIGGER_EXPAND = 3;
export const TRIGGER_CONTRACT = 4;
export const TRIGGER_FIRE = 5;
export const TRIGGER_NONE = 6;

export const MAX_RJ_STRENGTH = 30;
export const MAX_RJ_SPEED = 30;
export const MAX_SJ_STRENGTH = 30;
export const MAX_SJ_SPEED = 30;
export const MAX_THRUSTER_STRENGTH = 30;
