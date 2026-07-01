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

export const MAX_RJ_STRENGTH = 30;
export const MAX_RJ_SPEED = 30;
export const MAX_SJ_STRENGTH = 30;
export const MAX_SJ_SPEED = 30;
export const MAX_THRUSTER_STRENGTH = 30;
