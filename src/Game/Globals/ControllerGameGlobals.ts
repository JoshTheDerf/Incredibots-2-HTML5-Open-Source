import { Resource } from "../Graphics/Resource"
import { Replay } from "../Replay"
import PIXIsound from 'pixi-sound'

type Sound = PIXIsound.Sound

export class ControllerGameGlobals {
  public static INIT_PHYS_SCALE:number = 30;

  protected static MIN_ZOOM_VAL:number = 12;
  protected static MAX_ZOOM_VAL:number = 75;

  public static ZOOM_FOCUS_X:number = 400;
  public static ZOOM_FOCUS_Y:number = 310;

  public static REPLAY_SYNC_FRAMES:number = 3;

  public static ADMIN_USERS:Array<any> = ["Oliver", "Ryan Clark", "aaaaajon", "andreas002", "BillyJimBob", "EMDF", "fighterlegend", "Sruixan", "Illume", "Cheeseyx", "Leafsnail", "bigjohnpalmer", "jayther", "Spedione", "Thax", "b0tman", "zom", "KyuubisSlave", "Redstater", "rutgersemp", "Euphrates", "lakeeriesuperstar", "SilverGun", "mattbob", "bowman9898", "willempiee", "dark dan21", "pandm"];
  public static playingReplay:boolean = false;
  public static viewingUnsavedReplay:boolean = false;
  public static replay:Replay;
  public static replayDirectlyLinked:boolean = false;

  public static collisionGroup:number = 0x0001;

  // world mouse position
  public static wasMouseDown:boolean = false;
  public static mouseXWorldPhys:number;
  public static mouseYWorldPhys:number;
  public static mouseXWorld:number;
  public static mouseYWorld:number;
  public static prevMouseXWorld:number;
  public static prevMouseYWorld:number;

  public static minDensity:number = 1;
  public static maxDensity:number = 30;
  public static maxRJStrength:number = 30;
  public static maxRJSpeed:number = 30;
  public static maxSJStrength:number = 30;
  public static maxSJSpeed:number = 30;
  public static maxThrusterStrength:number = 30;

  public static initX:number = Number.MAX_VALUE;
  public static initY:number = Number.MAX_VALUE;
  public static initZoom:number = Number.MAX_VALUE;

  public static defaultR:number = 253;
  public static defaultG:number = 66;
  public static defaultB:number = 42;
  public static defaultO:number = 255;
  public static clickedBox:boolean = false;
  public static adStarted:boolean = false;
  public static snapToCenter:boolean = true;
  public static showJoints:boolean = true;
  public static showOutlines:boolean = true;
  public static showGraphics:boolean = true;
  public static showColours:boolean = true;
  public static centerOnSelected:boolean = false;
  public static failedChallenge:boolean = false;
  public static justLoadedRobotWithChallenge:boolean = false;

  public static cannonballs:Array<any> = [];

  public static showTutorial:boolean = true;

  public static ratedCurRobot:boolean = false;
  public static ratedCurReplay:boolean = false;
  public static ratedCurChallenge:boolean = false;

  public static loadAndInsert:boolean = false;
  public static potentialRobotID:String = "";
  public static potentialRobotEditable:boolean = false;
  public static potentialRobotPublic:boolean = false;
  public static potentialRobotFeatured:boolean = false;
  public static potentialChallengeID:String = "";
  public static potentialChallengeEditable:boolean = false;
  public static potentialChallengePublic:boolean = false;
  public static potentialChallengeFeatured:boolean = false;
  public static potentialReplayID:String = "";
  public static potentialReplayPublic:boolean = false;
  public static potentialReplayFeatured:boolean = false;
  public static curRobotID:String = "";
  public static curRobotEditable:boolean = true;
  public static curRobotPublic:boolean = false;
  public static curRobotFeatured:boolean = false;
  public static curChallengeID:String = "";
  public static curChallengePublic:boolean = false;
  public static curChallengeFeatured:boolean = false;
  public static curReplayID:String = "";
  public static curReplayPublic:boolean = false;
  public static curReplayFeatured:boolean = false;
  public static userName:String = "_Public";
  public static password:String = "";
  public static sessionID:String = "";

  public static clipboardParts:Array<any> = [];

  public static replayParts:Array<any> = [];
  public static loadedParts:Array<any> = [];

  public static shapeSound1:Sound = Resource.data.cShape1;
  public static shapeSound2:Sound = Resource.data.cShape2;
  public static shapeSound3:Sound = Resource.data.cShape3;
  public static shapeSound4:Sound = Resource.data.cShape4;
  public static shapeSound5:Sound = Resource.data.cShape5;
  public static jointSound1:Sound = Resource.data.cJoint1;
  public static jointSound2:Sound = Resource.data.cJoint2;
  public static jointSound3:Sound = Resource.data.cJoint3;
  public static jointSound4:Sound = Resource.data.cJoint4;
  public static jointSound5:Sound = Resource.data.cJoint5;
  public static winSound:Sound = Resource.data.cWin;
  public static loseSound:Sound = Resource.data.cLose;
  public static channel:SoundChannel;
  public static musicChannel:SoundChannel;
  public static introVolume:number = 0.5;

  public static NEW_CIRCLE:number = 0;
  public static NEW_RECT:number = 1;
  public static NEW_TRIANGLE:number = 2;
  public static NEW_FIXED_JOINT:number = 3;
  public static NEW_REVOLUTE_JOINT:number = 4;
  public static NEW_PRISMATIC_JOINT:number = 5;
  public static ROTATE:number = 6;
  public static PASTE:number = 7;
  public static BOX_SELECTING:number = 8;
  public static FINALIZING_JOINT:number = 9;
  public static NEW_TEXT:number = 10;
  public static RESIZING_TEXT:number = 11;
  public static RESIZING_SHAPES:number = 12;
  public static NEW_THRUSTERS:number = 13;
  public static DRAWING_BOX:number = 14;
  public static DRAWING_HORIZONTAL_LINE:number = 15;
  public static DRAWING_VERTICAL_LINE:number = 16;
  public static SELECTING_SHAPE:number = 17;
  public static DRAWING_BUILD_BOX:number = 18;
  public static NEW_CANNON:number = 19;
}
