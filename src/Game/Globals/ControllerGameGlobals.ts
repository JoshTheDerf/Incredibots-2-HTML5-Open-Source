import PIXIsound from "pixi-sound";
import { Resource } from "../Graphics/Resource"
import { Replay } from "../Replay"
import type { Challenge } from "../Challenge"
import type { SandboxSettings } from "../SandboxSettings"
import {
  getCollisionGroup,
  setCollisionGroup,
  getCannonballs,
  setCannonballs,
  getMainMenuCannonballs,
  setMainMenuCannonballs,
} from "../../Parts/partGlobals"
import {
  DEFAULT_R,
  DEFAULT_G,
  DEFAULT_B,
  DEFAULT_O,
  MIN_DENSITY,
  MAX_DENSITY,
  MAX_RJ_STRENGTH,
  MAX_RJ_SPEED,
  MAX_SJ_STRENGTH,
  MAX_SJ_SPEED,
  MAX_THRUSTER_STRENGTH,
} from "../../Parts/partDefaults"

type Sound = PIXIsound.Sound;

export class ControllerGameGlobals {
  public static INIT_PHYS_SCALE: number = 30;

  protected static MIN_ZOOM_VAL: number = 12;
  protected static MAX_ZOOM_VAL: number = 75;

  public static ZOOM_FOCUS_X: number = 400;
  public static ZOOM_FOCUS_Y: number = 310;

  public static REPLAY_SYNC_FRAMES: number = 3;

  public static ADMIN_USERS: Array<any> = [
    "Oliver",
    "Ryan Clark",
    "aaaaajon",
    "andreas002",
    "BillyJimBob",
    "EMDF",
    "fighterlegend",
    "Sruixan",
    "Illume",
    "Cheeseyx",
    "Leafsnail",
    "bigjohnpalmer",
    "jayther",
    "Spedione",
    "Thax",
    "b0tman",
    "zom",
    "KyuubisSlave",
    "Redstater",
    "rutgersemp",
    "Euphrates",
    "lakeeriesuperstar",
    "SilverGun",
    "mattbob",
    "bowman9898",
    "willempiee",
    "dark dan21",
    "pandm",
  ];
  public static playingReplay: boolean = false;
  public static viewingUnsavedReplay: boolean = false;
  public static replay: Replay;
  public static replayDirectlyLinked: boolean = false;

  // Delegated to the pixi-free src/Parts/partGlobals so headless Part code
  // (PrismaticJoint) can read this without importing this heavy globals module.
  public static get collisionGroup(): number {
    return getCollisionGroup();
  }
  public static set collisionGroup(value: number) {
    setCollisionGroup(value);
  }

  // world mouse position
  public static wasMouseDown: boolean = false;
  public static mouseXWorldPhys: number;
  public static mouseYWorldPhys: number;
  public static mouseXWorld: number;
  public static mouseYWorld: number;
  public static prevMouseXWorld: number;
  public static prevMouseYWorld: number;

  public static minDensity: number = MIN_DENSITY;
  public static maxDensity: number = MAX_DENSITY;
  public static maxRJStrength: number = MAX_RJ_STRENGTH;
  public static maxRJSpeed: number = MAX_RJ_SPEED;
  public static maxSJStrength: number = MAX_SJ_STRENGTH;
  public static maxSJSpeed: number = MAX_SJ_SPEED;
  public static maxThrusterStrength: number = MAX_THRUSTER_STRENGTH;

  public static initX: number = Number.MAX_VALUE;
  public static initY: number = Number.MAX_VALUE;
  public static initZoom: number = Number.MAX_VALUE;

  public static defaultR: number = DEFAULT_R;
  public static defaultG: number = DEFAULT_G;
  public static defaultB: number = DEFAULT_B;
  public static defaultO: number = DEFAULT_O;
  public static clickedBox: boolean = false;
  public static adStarted: boolean = false;
  public static snapToCenter: boolean = true;
  public static showJoints: boolean = true;
  public static showOutlines: boolean = true;
  public static showGraphics: boolean = true;
  public static showColours: boolean = true;
  public static centerOnSelected: boolean = false;
  public static failedChallenge: boolean = false;
  public static justLoadedRobotWithChallenge: boolean = false;

  // Delegated to the pixi-free src/Parts/partGlobals so Cannon can push spawned
  // cannonball bodies here without importing this heavy globals module.
  public static get cannonballs(): Array<any> {
    return getCannonballs();
  }
  public static set cannonballs(value: Array<any>) {
    setCannonballs(value);
  }

  // Challenge state, relocated here from ControllerChallenge so that the
  // ControllerGame base class (and other modules) can read/write it without
  // importing ControllerChallenge, which extends ControllerGame and therefore
  // caused a module-load-order (TDZ) cycle.
  public static challenge: Challenge;
  public static playChallengeMode: boolean = false;
  public static playOnlyMode: boolean = false;

  // Relocated from ControllerSandbox for the same reason: the ControllerGame
  // base class reads/writes the active sandbox settings and must not import
  // ControllerSandbox (a subclass).
  public static settings: SandboxSettings;

  // Separate cannonball list tracked while the main menu demo is active.
  // (ControllerMainMenu is a distinct controller branch from ControllerGame and
  // maintains its own list; kept here so Parts/Cannon does not need to import
  // ControllerMainMenu, which caused a module-load-order cycle.)
  public static get mainMenuCannonballs(): Array<any> {
    return getMainMenuCannonballs();
  }
  public static set mainMenuCannonballs(value: Array<any>) {
    setMainMenuCannonballs(value);
  }

  public static showTutorial: boolean = true;

  public static ratedCurRobot: boolean = false;
  public static ratedCurReplay: boolean = false;
  public static ratedCurChallenge: boolean = false;

  public static loadAndInsert: boolean = false;
  public static potentialRobotID: string = "";
  public static potentialRobotEditable: boolean = false;
  public static potentialRobotPublic: boolean = false;
  public static potentialRobotFeatured: boolean = false;
  public static potentialChallengeID: string = "";
  public static potentialChallengeEditable: boolean = false;
  public static potentialChallengePublic: boolean = false;
  public static potentialChallengeFeatured: boolean = false;
  public static potentialReplayID: string = "";
  public static potentialReplayPublic: boolean = false;
  public static potentialReplayFeatured: boolean = false;
  public static curRobotID: string = "";
  public static curRobotEditable: boolean = true;
  public static curRobotPublic: boolean = false;
  public static curRobotFeatured: boolean = false;
  public static curChallengeID: string = "";
  public static curChallengePublic: boolean = false;
  public static curChallengeFeatured: boolean = false;
  public static curReplayID: string = "";
  public static curReplayPublic: boolean = false;
  public static curReplayFeatured: boolean = false;
  public static userName: string = "_Public";
  public static password: string = "";
  public static sessionID: string = "";

  public static clipboardParts: Array<any> = [];

  public static replayParts: Array<any> = [];
  public static loadedParts: Array<any> = [];

  public static shapeSound1: Sound = Resource.cShape1;
  public static shapeSound2: Sound = Resource.cShape2;
  public static shapeSound3: Sound = Resource.cShape3;
  public static shapeSound4: Sound = Resource.cShape4;
  public static shapeSound5: Sound = Resource.cShape5;
  public static jointSound1: Sound = Resource.cJoint1;
  public static jointSound2: Sound = Resource.cJoint2;
  public static jointSound3: Sound = Resource.cJoint3;
  public static jointSound4: Sound = Resource.cJoint4;
  public static jointSound5: Sound = Resource.cJoint5;
  public static winSound: Sound = Resource.cWin;
  public static loseSound: Sound = Resource.cLose;
  public static channel: SoundChannel;
  public static musicChannel: SoundChannel;
  public static introVolume: number = 0.5;

  public static NEW_CIRCLE: number = 0;
  public static NEW_RECT: number = 1;
  public static NEW_TRIANGLE: number = 2;
  public static NEW_FIXED_JOINT: number = 3;
  public static NEW_REVOLUTE_JOINT: number = 4;
  public static NEW_PRISMATIC_JOINT: number = 5;
  public static ROTATE: number = 6;
  public static PASTE: number = 7;
  public static BOX_SELECTING: number = 8;
  public static FINALIZING_JOINT: number = 9;
  public static NEW_TEXT: number = 10;
  public static RESIZING_TEXT: number = 11;
  public static RESIZING_SHAPES: number = 12;
  public static NEW_THRUSTERS: number = 13;
  public static DRAWING_BOX: number = 14;
  public static DRAWING_HORIZONTAL_LINE: number = 15;
  public static DRAWING_VERTICAL_LINE: number = 16;
  public static SELECTING_SHAPE: number = 17;
  public static DRAWING_BUILD_BOX: number = 18;
  public static NEW_CANNON: number = 19;
}
