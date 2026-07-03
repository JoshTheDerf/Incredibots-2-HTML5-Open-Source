import { SandboxSettings } from "./SandboxSettings"

export class Challenge {
  public settings: SandboxSettings;

  public allParts: Array<any> = new Array();

  public circlesAllowed: boolean = true;
  public rectanglesAllowed: boolean = true;
  public trianglesAllowed: boolean = true;
  public fixedJointsAllowed: boolean = true;
  public rotatingJointsAllowed: boolean = true;
  public slidingJointsAllowed: boolean = true;
  public thrustersAllowed: boolean = true;
  public cannonsAllowed: boolean = true;

  public fixateAllowed: boolean = false;
  public nonCollidingAllowed: boolean = true;
  public mouseDragAllowed: boolean = false;
  public botControlAllowed: boolean = true;
  public showConditions: boolean = false;
  public minDensity: number = -Number.MAX_VALUE;
  public maxDensity: number = Number.MAX_VALUE;
  // Jaybit friction/restitution restrictions (Challenge.as:36/:60/:64/:76),
  // same ∓MAX_VALUE no-limit sentinels as density.
  public minFriction: number = -Number.MAX_VALUE;
  public maxFriction: number = Number.MAX_VALUE;
  public minRestitution: number = -Number.MAX_VALUE;
  public maxRestitution: number = Number.MAX_VALUE;
  // Jaybit "Exclude Triggers" restriction (Challenge.as:66). DATA ONLY this
  // wave; the in-memory default is true (NOTE for the serialization wave: the
  // LOAD default when the trailing boolean is absent is false — old
  // challenges forbid triggers).
  public triggersAllowed: boolean = true;
  // Jaybit "Exclude Collision Groups" / "Exclude Self-Collisions" restrictions
  // (Challenge.as:22/:10). In-memory defaults are true; the LOAD defaults when
  // the trailing bytes are absent are false / true respectively
  // (Database.as ExtractChallengeFromByteArray :3367-3372).
  public collisionGroupsAllowed: boolean = true;
  public subCollisionsAllowed: boolean = true;
  public maxRJStrength: number = Number.MAX_VALUE;
  public maxRJSpeed: number = Number.MAX_VALUE;
  public maxSJStrength: number = Number.MAX_VALUE;
  public maxSJSpeed: number = Number.MAX_VALUE;
  public maxThrusterStrength: number = Number.MAX_VALUE;

  public cameraX: number = Number.MAX_VALUE;
  public cameraY: number = Number.MAX_VALUE;
  public zoomLevel: number = Number.MAX_VALUE;

  public buildAreas: Array<any> = new Array();

  public winConditions: Array<any> = new Array();
  public lossConditions: Array<any> = new Array();

  public winConditionsAnded: boolean = true;

  constructor(s: SandboxSettings) {
    this.settings = s;
  }
}
