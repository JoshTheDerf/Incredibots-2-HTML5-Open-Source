import { SandboxSettings } from "../imports";

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
