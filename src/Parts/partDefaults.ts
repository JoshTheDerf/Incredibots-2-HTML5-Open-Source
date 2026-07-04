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

// Material slider ranges. IB2/Jaybit originally used a 1..30 UI scale for all
// three; the ranges are WIDENED here to accommodate IB3's material range so
// imported IB3 bots keep their materials instead of being clamped (IB3 Util.as:
// DENSITY 1..40, FRICTION/RESTITUTION 0..40). The bounds below are IB3's range
// expressed in IB2's UI scale via IB2's UNCHANGED conversion formulas (so every
// existing IB2 value — all within these wider bounds — converts byte-identically):
//   friction:     Box2D (f+5)/40, IB3 wants Box2D [0,1] -> f in [-5, 35]
//   restitution:  Box2D (r+8)/50, IB3 wants Box2D [0,1] -> r in [-8, 42]
//   density:      Box2D (d+5)/10, IB3 density 1..40      -> d in [1, 40]
// The importer maps IB3 -> these UI values (ib3Import.applyCommonShapeFields).
export const MIN_DENSITY = 1;
export const MAX_DENSITY = 40;

// Defaults 11 / 7 are chosen so the Box2D conversion reproduces CE's hardcoded
// friction=0.4 / restitution=0.3 exactly (Jaybit Parts/ShapePart.as ctor;
// Util.ConvertFrictionToBox2D / ConvertRestitutionToBox2D).
export const MIN_FRICTION = -5;
export const MAX_FRICTION = 35;
export const DEFAULT_FRICTION = 11;
export const MIN_RESTITUTION = -8;
export const MAX_RESTITUTION = 42;
export const DEFAULT_RESTITUTION = 7;

// --- Fragility (superset / prototype) ------------------------------------
// A per-shape "how easily does this shatter" scalar. 0 == indestructible (the
// default, so existing content behaves EXACTLY as before). Higher values lower
// the collision-impact speed needed to fracture the shape into fragments (see
// src/core/fractureSystem.ts). Not an IB2/IB3 field — a new superset feature.
export const MIN_FRAGILITY = 0;
export const MAX_FRAGILITY = 10;
export const DEFAULT_FRAGILITY = 0;

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

// Joint / thruster slider maxima. Widened to accommodate IB3's 0..40 ranges where
// IB3's value maps into IB2 units ABOVE the old cap of 30 (ib3Import mappings):
//   RJ strength: IB2 s2 = s3/3   -> max ~13.3, already within 30 (left as 30)
//   RJ speed:    IB2 = s3         -> IB3 max 40 needs cap 40
//   SJ strength: IB2 = s3         -> IB3 max 40 needs cap 40
//   SJ speed:    IB2 = s3 * 2.5   -> IB3 max 40 needs cap 100
//   thruster:    IB2 = sqrt((s3*452/3 - 10)/10) -> max ~24.5, within 30 (left as 30)
export const MAX_RJ_STRENGTH = 30;
export const MAX_RJ_SPEED = 40;
export const MAX_SJ_STRENGTH = 40;
export const MAX_SJ_SPEED = 100;
export const MAX_THRUSTER_STRENGTH = 30;
