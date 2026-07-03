// Pixi/DOM-free mutable state shared by headless Part code.
//
// Some Parts need to read/write a small amount of controller-owned state during
// simulation:
//   - Cannon.CreateCannonball pushes each spawned cannonball body into the
//     "cannonball sinks" so the controller (or challenge conditions / replay
//     sync) can track them.
//   - PrismaticJoint.Init reads the current `collisionGroup` bit to wire up its
//     piston shape filters.
//
// Historically this state lived on ControllerGameGlobals, which transitively
// pulls in Resource -> pixi-sound (and therefore the DOM) at module-init time,
// so importing it made the game core non-headless. This module is the pixi-free
// home for that state. ControllerGameGlobals delegates its `cannonballs`,
// `mainMenuCannonballs`, and `collisionGroup` accessors to here, so legacy game
// code is unaffected while Parts import only this light module.

import { box2d20Backend } from "../core/physics";
import type { PhysicsBackend } from "../core/physics";
import type { b2Body, b2Joint, b2Shape, b2World } from "../Box2D";

// Active physics engine backend the Part construction paths + GameCore build
// through, instead of calling world.CreateBody / body.CreateShape / etc.
// directly (the P1.5b engine seam). Defaults to the engine-0 (Box2D 2.0.2)
// singleton so any code path that Inits parts works out of the box; GameCore
// and tests can swap it via setPhysicsBackend (same pattern as the cannonball
// sinks below). The 2.0 backend delegates 1:1, so this is behaviour-preserving.
let physicsBackend: PhysicsBackend<b2World, b2Body, b2Shape, b2Joint> = box2d20Backend;

export function getPhysicsBackend(): PhysicsBackend<b2World, b2Body, b2Shape, b2Joint> {
  return physicsBackend;
}

export function setPhysicsBackend(value: PhysicsBackend<b2World, b2Body, b2Shape, b2Joint>): void {
  physicsBackend = value;
}

// Collision group bit used when initialising prismatic-joint piston shapes.
// The legacy controller resets this to 0x0001 at play time and doubles it for
// every PrismaticJoint (ControllerGame.playButton). The core owns the value;
// consumers read/write it through here.
export let collisionGroup: number = 0x0001;

export function getCollisionGroup(): number {
  return collisionGroup;
}

export function setCollisionGroup(value: number): void {
  collisionGroup = value;
}

// Cannonball sinks. Cannon pushes spawned cannonball bodies here. The core owns
// the backing arrays; the legacy controllers swap in their own arrays (so their
// existing tracking/replay-sync logic keeps working) via the setters below.
let cannonballs: Array<any> = [];
let mainMenuCannonballs: Array<any> = [];

export function getCannonballs(): Array<any> {
  return cannonballs;
}

export function setCannonballs(value: Array<any>): void {
  cannonballs = value;
}

export function getMainMenuCannonballs(): Array<any> {
  return mainMenuCannonballs;
}

export function setMainMenuCannonballs(value: Array<any>): void {
  mainMenuCannonballs = value;
}
