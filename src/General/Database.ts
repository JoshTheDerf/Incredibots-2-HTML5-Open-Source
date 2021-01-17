import { b2AABB, b2Vec2 } from "@box2d/core";
import {
  Base64Decoder,
  Base64Encoder,
  ByteArray,
  CameraMovement,
  Cannon,
  Challenge,
  Circle,
  ControllerGame,
  ControllerGameGlobals,
  FixedJoint,
  JointPart,
  KeyPress,
  LossCondition,
  Main,
  Part,
  PrismaticJoint,
  Rectangle,
  Replay,
  ReplaySyncPoint,
  RevoluteJoint,
  Robot,
  SandboxSettings,
  ShapePart,
  TextPart,
  Thrusters,
  Triangle,
  Util,
  WinCondition,
} from "../imports";

export class Database {
  public static waitingForResponse: boolean = false;
  public static curTransactionType: number = 0;
  public static curAction: number;
  public static deleteNumber: number;
  public static errorOccurred: boolean = false;
  public static versionErrorOccurred: boolean = false;
  public static nonfatalErrorOccurred: boolean = false;
  public static lastErrorMsg: string;
  private static timeoutTimer: Timer;

  private static loader: URLLoader;
  private static latestCompletionFunction: Function;

  public static robotList: Array<any>;
  public static replayList: Array<any>;
  public static scoreList: Array<any>;
  public static challengeList: Array<any>;

  public static robotType: number;
  public static replayType: number;
  public static scoreType: number;
  public static challengeType: number;
  public static curRobotPage: number = 1;
  public static curReplayPage: number = 1;
  public static curScorePage: number = 1;
  public static curChallengePage: number = 1;
  public static numPages: number = -1;
  public static highScoresChallenge: string = "";
  public static highScoresChallengeName: string = "";
  public static highScoresSortType: number = -1;
  public static highScoresDaily: boolean = false;
  public static highScoresPersonal: boolean = false;
  public static curSortType: number = 1;
  public static curSortPeriod: number = -1;
  public static curShared: boolean = true;
  public static curSearch: string = "";

  public static NORMAL: number = 0;
  public static SHARED: number = 1;
  public static ALLTIME: number = 2;
  public static DAILY: number = 3;
  public static PERSONAL: number = 4;

  public static SORT_BY_SCORE: number = -1;
  public static SORT_BY_VIEW_COUNT: number = 0;
  public static SORT_BY_CREATION_TIME: number = 1;
  public static SORT_BY_EDIT_TIME: number = 2;
  public static SORT_ALPHABETICALLY: number = 3;
  public static SORT_BY_RATING: number = 4;

  public static SORT_PERIOD_FEATURED: number = -1;
  public static SORT_PERIOD_ALLTIME: number = 0;
  public static SORT_PERIOD_TODAY: number = 1;
  public static SORT_PERIOD_7DAYS: number = 2;
  public static SORT_PERIOD_30DAYS: number = 3;
  public static SORT_PERIOD_PROP: number = 4;

  public static NUM_ACTIONS: number = 28;
  public static ACTION_SAVE_ROBOT: number = 0;
  public static ACTION_GET_ROBOT_DATA: number = 1;
  public static ACTION_LOAD_ROBOT: number = 2;
  public static ACTION_DELETE_ROBOT: number = 3;
  public static ACTION_SAVE_REPLAY: number = 4;
  public static ACTION_GET_REPLAY_DATA: number = 5;
  public static ACTION_LOAD_REPLAY: number = 6;
  public static ACTION_DELETE_REPLAY: number = 7;
  public static ACTION_GET_SCORE_DATA: number = 8;
  public static ACTION_ADD_USER: number = 9;
  public static ACTION_LOGIN: number = 10;
  public static ACTION_COMMENT_ROBOT: number = 11;
  public static ACTION_COMMENT_REPLAY: number = 12;
  public static ACTION_REPORT_ROBOT: number = 13;
  public static ACTION_REPORT_REPLAY: number = 14;
  public static ACTION_RATE_ROBOT: number = 15;
  public static ACTION_RATE_REPLAY: number = 16;
  public static ACTION_FEATURE_ROBOT: number = 17;
  public static ACTION_FEATURE_REPLAY: number = 18;
  public static ACTION_LOGIN_GOLD: number = 19;
  public static ACTION_SAVE_CHALLENGE: number = 20;
  public static ACTION_GET_CHALLENGE_DATA: number = 21;
  public static ACTION_LOAD_CHALLENGE: number = 22;
  public static ACTION_DELETE_CHALLENGE: number = 23;
  public static ACTION_COMMENT_CHALLENGE: number = 24;
  public static ACTION_REPORT_CHALLENGE: number = 25;
  public static ACTION_RATE_CHALLENGE: number = 26;
  public static ACTION_FEATURE_CHALLENGE: number = 27;

  private static WRONG_VERSION_CODE: number = 17;

  public static VERSION_STRING_FOR_REPLAYS: string = "0.03";
  private static BASE_URL: string =
    "http://localhost:8888/incredibots2/database/ggscores.php?version=" + Database.VERSION_STRING_FOR_REPLAYS + "&";

  private static UNKNOWN_MESSAGE: string = "UNKNOWN";
  private static IO_MESSAGE: string = "An I/O error has occurred.";
  private static SECURITY_MESSAGE: string = "A security error has occurred.";
  private static NO_DATA_MESSAGE: string = "An unknown error has occurred.";
  private static EXCEPTION_MESSAGE: string = "An error has occurred.";
  private static ERROR_MESSAGES: Array<any> = [
    "Failed to connect to the server.",
    "A URL error has occurred.",
    "A URL error has occurred.",
    "A URL error has occurred.",
    "A URL error has occurred.",
    "You don't have permission to access that robot.",
    "An invalid robot ID was used.",
    "An unknown error has occurred (code 7).",
    "An incorrect password was used.",
    "The given username instanceof already in use.",
    "An invalid username was used.",
    "The given name instanceof too long.",
    "The given name contains invalid characters.",
    "The given name contains profanity.",
    "An unknown error has occurred (code 14).",
    "A URL error has occurred.",
    "A database error has occurred.",
    "You are playing an old version of IncrediBots.  Click OK to redirect to the current version.",
    "An invalid replay ID was used.",
    "Sorry, that user instanceof not an IncrediBots supporter. Click Subscribe to become one.",
    "Your IncrediBots Gold subscription has expired.  Click Subscribe to renew.",
    "An invalid challenge ID was used.",
  ];

  private static TIMEOUT_SECONDS: number = 20;

  private static Encrypt(str: string): string {
    // encryption algorithm removed
    return str;
  }

  public static AddUser(username: string, password: string, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(Database.BASE_URL + "op=addUser&user=" + escape(username) + "&password=" + MD5.encrypt(password))
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_ADD_USER;
    Database.nonfatalErrorOccurred = true;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static Login(username: string, password: string, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(Database.BASE_URL + "op=login&user=" + escape(username) + "&password=" + MD5.encrypt(password))
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_LOGIN;
    Database.nonfatalErrorOccurred = true;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
    Database.waitingForResponse = true;
    Database.curTransactionType = Database.curAction;
  }

  public static LoginGold(username: string, password: string, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL + "op=goldLogin&user=" + escape(username) + "&password=" + MD5.encrypt(password)
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_LOGIN_GOLD;
    Database.nonfatalErrorOccurred = true;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
    Database.waitingForResponse = true;
    Database.curTransactionType = Database.curAction;
  }

  public static SaveRobot(
    user: string,
    password: string,
    robot: Robot,
    name: string,
    desc: string,
    shared: number,
    allowEdits: number,
    prop: number,
    challenge: string,
    completionFunction: Function
  ): void {
    if (Database.waitingForResponse) return;
    var partData: ByteArray = Database.PutRobotIntoByteArray(robot);
    partData.compress();
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL +
          "op=uploadRobot&user=" +
          escape(user) +
          "&password=" +
          password +
          "&shared=" +
          shared +
          "&allowEdit=" +
          allowEdits +
          "&prop=" +
          prop +
          (name == null ? "" : "&name=" + escape(name)) +
          (desc == null ? "" : "&desc=" + escape(desc)) +
          (challenge == "" ? "" : "&challenge=" + challenge)
      )
    );
    request.data = partData;
    request.method = URLRequestMethod.POST;
    request.contentType = "application/octet-stream";
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_SAVE_ROBOT;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static ExportRobot(
    robot: Robot,
    name: string,
    desc: string,
    shared: number,
    allowEdits: number,
    prop: number,
    completionFunction: Function
  ): void {
    var partData: ByteArray = Database.PutRobotIntoByteArray(robot);
    var exportData: ByteArray = new ByteArray();
    exportData.writeUTF(name);
    exportData.writeUTF(desc);
    exportData.writeInt(shared);
    exportData.writeInt(allowEdits);
    exportData.writeInt(prop);
    partData.position = 0;
    exportData.writeBytes(partData);
    exportData.compress();
    exportData.position = 0;

    var encoder: Base64Encoder = new Base64Encoder();
    encoder.encodeBytes(exportData);
    completionFunction(encoder.toString(), "robot");
  }

  public static ExportReplay(
    replay: Replay,
    name: string,
    desc: string,
    robotID: string,
    robot: Robot,
    score: number,
    challenge: string,
    shared: number,
    completionFunction: Function
  ): void {
    var robotData: ByteArray = Database.PutRobotIntoByteArray(robot);
    robotData.compress();
    var replayData: ByteArray = Database.PutReplayIntoByteArray(replay);
    replayData.compress();
    var exportData: ByteArray = new ByteArray();
    exportData.writeInt(replayData.length);
    exportData.writeInt(robotData.length);
    replayData.position = 0;
    while (replayData.position != replayData.length) {
      exportData.writeByte(replayData.readByte());
    }
    robotData.position = 0;
    while (robotData.position != robotData.length) {
      exportData.writeByte(robotData.readByte());
    }
    exportData.writeUTF(name);
    exportData.writeUTF(desc);
    exportData.writeUTF(robotID);
    exportData.writeInt(score);
    exportData.writeUTF(challenge);
    exportData.writeInt(shared);
    exportData.compress();
    exportData.position = 0;

    var encoder: Base64Encoder = new Base64Encoder();
    encoder.encodeBytes(exportData);
    completionFunction(encoder.toString(), "replay");
  }

  public static ExportChallenge(
    challenge: Challenge,
    name: string,
    desc: string,
    shared: number,
    allowEdits: number,
    completionFunction: Function
  ): void {
    var challengeData: ByteArray = Database.PutChallengeIntoByteArray(challenge);
    var exportData: ByteArray = new ByteArray();
    exportData.writeUTF(name);
    exportData.writeUTF(desc);
    exportData.writeInt(shared);
    exportData.writeInt(allowEdits);
    challengeData.position = 0;
    exportData.writeBytes(challengeData);
    exportData.compress();
    exportData.position = 0;

    var encoder: Base64Encoder = new Base64Encoder();
    encoder.encodeBytes(exportData);
    completionFunction(encoder.toString(), "challenge");
  }

  public static GetRobotData(
    user: string,
    password: string,
    shared: boolean,
    sortType: number,
    sortPeriod: number,
    page: number,
    search: string,
    completionFunction: Function
  ): void {
    if (Database.waitingForResponse) return;
    Database.robotType = shared ? Database.SHARED : Database.NORMAL;
    Database.curShared = shared;
    Database.curSortType = sortType;
    Database.curSortPeriod = sortPeriod;
    Database.curRobotPage = page;
    Database.curSearch = search;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL +
          "op=getRobots&user=" +
          (shared ? "_Public" : escape(user)) +
          "&password=" +
          password +
          "&sortType=" +
          sortType +
          "&sortPeriod=" +
          sortPeriod +
          "&page=" +
          page +
          "&search=" +
          escape(search)
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_GET_ROBOT_DATA;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static LoadRobot(user: string, password: string, number: number, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL +
          "op=downloadRobot&user=" +
          escape(user) +
          "&password=" +
          password +
          "&id=" +
          Database.robotList[number].id
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.BINARY;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_LOAD_ROBOT;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static LoadRobotByID(robotID: string, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(Database.BASE_URL + "op=downloadRobot&user=_Public&password=blah&id=" + robotID)
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.BINARY;
    Database.loader.addEventListener("complete", completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_LOAD_ROBOT;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static DeleteRobot(user: string, password: string, number: number, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL +
          "op=deleteRobot&user=" +
          escape(user) +
          "&password=" +
          password +
          "&id=" +
          Database.robotList[number].id
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_DELETE_ROBOT;
    Database.deleteNumber = number;
    Database.nonfatalErrorOccurred = true;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static SaveReplay(
    user: string,
    password: string,
    replay: Replay,
    name: string,
    desc: string,
    robotID: string,
    robot: Robot,
    score: number,
    challenge: string,
    shared: number,
    completionFunction: Function
  ): void {
    if (Database.waitingForResponse) return;
    var replayAndRobot: ByteArray = new ByteArray();
    var replayData: ByteArray = Database.PutReplayIntoByteArray(replay);
    replayData.compress();
    replayData.position = 0;
    while (replayData.position != replayData.length) {
      replayAndRobot.writeByte(replayData.readByte());
    }

    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL +
          "op=uploadReplay&user=" +
          escape(user) +
          "&password=" +
          password +
          "&shared=" +
          shared +
          (name == null ? "" : "&name=" + escape(name)) +
          (desc == null ? "" : "&desc=" + escape(desc)) +
          "&robot=" +
          robotID +
          "&replayLength=" +
          replayAndRobot.length +
          "&score=" +
          score +
          "&challenge=" +
          challenge
      )
    );

    if (robotID == "") {
      var robotData: ByteArray = Database.PutRobotIntoByteArray(robot);
      robotData.compress();
      robotData.position = 0;
      while (robotData.position != robotData.length) {
        replayAndRobot.writeByte(robotData.readByte());
      }
    }

    request.data = replayAndRobot;
    request.method = URLRequestMethod.POST;
    request.contentType = "application/octet-stream";
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_SAVE_REPLAY;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static GetReplayData(
    user: string,
    password: string,
    shared: boolean,
    sortType: number,
    sortPeriod: number,
    page: number,
    search: string,
    completionFunction: Function
  ): void {
    if (Database.waitingForResponse) return;
    Database.replayType = shared ? Database.SHARED : Database.NORMAL;
    Database.curShared = shared;
    Database.curSortType = sortType;
    Database.curSortPeriod = sortPeriod;
    Database.curReplayPage = page;
    Database.curSearch = search;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL +
          "op=getReplays&user=" +
          (shared ? "_Public" : escape(user)) +
          "&password=" +
          password +
          "&sortType=" +
          sortType +
          "&sortPeriod=" +
          sortPeriod +
          "&page=" +
          page +
          "&search=" +
          escape(search)
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_GET_REPLAY_DATA;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static LoadReplay(user: string, password: string, number: number, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL +
          "op=downloadReplay&user=" +
          escape(user) +
          "&password=" +
          password +
          "&id=" +
          Database.replayList[number].id +
          "&robot=" +
          Database.replayList[number].robotID
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.BINARY;
    Database.loader.addEventListener("complete", completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_LOAD_REPLAY;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static LoadReplayByID(replayID: string, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(Database.BASE_URL + "op=downloadReplay&user=_Public&password=blah&id=" + replayID + "&robot=-1")
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.BINARY;
    Database.loader.addEventListener("complete", completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_LOAD_REPLAY;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static LoadReplayFromScore(
    user: string,
    password: string,
    number: number,
    completionFunction: Function
  ): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL +
          "op=downloadReplay&user=" +
          escape(user) +
          "&password=" +
          password +
          "&id=" +
          Database.scoreList[number].replayID +
          "&robot=" +
          Database.scoreList[number].robotID
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.BINARY;
    Database.loader.addEventListener("complete", completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_LOAD_REPLAY;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static DeleteReplay(user: string, password: string, number: number, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL +
          "op=deleteReplay&user=" +
          escape(user) +
          "&password=" +
          password +
          "&id=" +
          Database.replayList[number].id
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener("complete", completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_DELETE_REPLAY;
    Database.deleteNumber = number;
    Database.nonfatalErrorOccurred = true;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static GetScoreData(
    user: string,
    password: string,
    challenge: string,
    daily: boolean,
    personal: boolean,
    sortType: number,
    page: number,
    search: string,
    completionFunction: Function
  ): void {
    if (Database.waitingForResponse) return;
    Database.highScoresChallenge = challenge;
    Database.highScoresDaily = daily;
    Database.highScoresPersonal = personal;
    Database.scoreType = daily ? Database.DAILY : personal ? Database.PERSONAL : Database.ALLTIME;
    Database.highScoresSortType = sortType;
    Database.curScorePage = page;
    Database.curSearch = search;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL +
          "op=getScores&user=" +
          escape(user) +
          "&password=" +
          password +
          "&challenge=" +
          challenge +
          "&daily=" +
          (daily ? 1 : 0) +
          "&personal=" +
          (personal ? 1 : 0) +
          "&sortType=" +
          sortType +
          "&page=" +
          page +
          "&search=" +
          escape(search)
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_GET_SCORE_DATA;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static SaveChallenge(
    user: string,
    password: string,
    challenge: Challenge,
    name: string,
    desc: string,
    allParts: Array<any>,
    shared: number,
    allowEdits: number,
    completionFunction: Function
  ): void {
    if (Database.waitingForResponse) return;
    challenge.allParts = allParts;
    var challengeData: ByteArray = Database.PutChallengeIntoByteArray(challenge);
    challengeData.compress();

    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL +
          "op=uploadChallenge&user=" +
          escape(user) +
          "&password=" +
          password +
          "&shared=" +
          shared +
          "&allowEdit=" +
          allowEdits +
          (name == null ? "" : "&name=" + escape(name)) +
          (desc == null ? "" : "&desc=" + escape(desc))
      )
    );

    request.data = challengeData;
    request.method = URLRequestMethod.POST;
    request.contentType = "application/octet-stream";
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_SAVE_CHALLENGE;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static GetChallengeData(
    user: string,
    password: string,
    shared: boolean,
    sortType: number,
    sortPeriod: number,
    page: number,
    search: string,
    completionFunction: Function
  ): void {
    if (Database.waitingForResponse) return;
    Database.challengeType = shared ? Database.SHARED : Database.NORMAL;
    Database.curShared = shared;
    Database.curSortType = sortType;
    Database.curSortPeriod = sortPeriod;
    Database.curChallengePage = page;
    Database.curSearch = search;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL +
          "op=getChallenges&user=" +
          (shared ? "_Public" : escape(user)) +
          "&password=" +
          password +
          "&sortType=" +
          sortType +
          "&sortPeriod=" +
          sortPeriod +
          "&page=" +
          page +
          "&search=" +
          escape(search)
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_GET_CHALLENGE_DATA;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static LoadChallenge(user: string, password: string, number: number, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL +
          "op=downloadChallenge&user=" +
          escape(user) +
          "&password=" +
          password +
          "&id=" +
          Database.challengeList[number].id
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.BINARY;
    Database.loader.addEventListener("complete", completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_LOAD_CHALLENGE;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static LoadChallengeByID(challengeID: string, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(Database.BASE_URL + "op=downloadChallenge&user=_Public&password=blah&id=" + challengeID)
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.BINARY;
    Database.loader.addEventListener("complete", completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_LOAD_CHALLENGE;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static DeleteChallenge(user: string, password: string, number: number, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL +
          "op=deleteChallenge&user=" +
          escape(user) +
          "&password=" +
          password +
          "&id=" +
          Database.challengeList[number].id
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener("complete", completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_DELETE_CHALLENGE;
    Database.deleteNumber = number;
    Database.nonfatalErrorOccurred = true;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static CommentOnRobot(robotID: string, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(Database.Encrypt(Database.BASE_URL + "op=commentRobot&id=" + robotID));
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_COMMENT_ROBOT;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static CommentOnReplay(replayID: string, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(Database.Encrypt(Database.BASE_URL + "op=commentReplay&id=" + replayID));
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_COMMENT_REPLAY;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static CommentOnChallenge(challengeID: string, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(Database.BASE_URL + "op=commentChallenge&id=" + challengeID)
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_COMMENT_CHALLENGE;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static ReportRobot(robotID: string, user: string, msg: string, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL + "op=reportRobot&id=" + robotID + "&user=" + escape(user) + "&desc=" + escape(msg)
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_REPORT_ROBOT;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static ReportReplay(replayID: string, user: string, msg: string, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL + "op=reportReplay&id=" + replayID + "&user=" + escape(user) + "&desc=" + escape(msg)
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_REPORT_REPLAY;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static ReportChallenge(challengeID: string, user: string, msg: string, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(
        Database.BASE_URL + "op=reportChallenge&id=" + challengeID + "&user=" + escape(user) + "&desc=" + escape(msg)
      )
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_REPORT_CHALLENGE;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static RateRobot(robotID: string, rating: number, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(Database.BASE_URL + "op=rateRobot&id=" + robotID + "&rating=" + rating)
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_RATE_ROBOT;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static RateReplay(replayID: string, rating: number, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(Database.BASE_URL + "op=rateReplay&id=" + replayID + "&rating=" + rating)
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_RATE_REPLAY;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static RateChallenge(challengeID: string, rating: number, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(Database.BASE_URL + "op=rateChallenge&id=" + challengeID + "&rating=" + rating)
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_RATE_CHALLENGE;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static FeatureRobot(robotID: string, feature: boolean, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(Database.BASE_URL + "op=featureRobot&id=" + robotID + "&featured=" + (feature ? 1 : 0))
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_FEATURE_ROBOT;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static FeatureReplay(replayID: string, feature: boolean, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(Database.BASE_URL + "op=featureReplay&id=" + replayID + "&featured=" + (feature ? 1 : 0))
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_FEATURE_ROBOT;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static FeatureChallenge(challengeID: string, feature: boolean, completionFunction: Function): void {
    if (Database.waitingForResponse) return;
    Database.loader = new URLLoader();
    var request: URLRequest = new URLRequest(
      Database.Encrypt(Database.BASE_URL + "op=featureChallenge&id=" + challengeID + "&featured=" + (feature ? 1 : 0))
    );
    request.method = URLRequestMethod.GET;
    Database.loader.dataFormat = URLLoaderDataFormat.TEXT;
    Database.loader.addEventListener(Event.COMPLETE, completionFunction);
    Database.loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.addEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.loader.load(request);
    Database.curAction = Database.ACTION_FEATURE_CHALLENGE;
    Database.latestCompletionFunction = completionFunction;
    Database.StartTimer();
  }

  public static FinishFeaturing(e: Event): boolean {
    Database.StopTimer();
    var response: string = e.target.data.substring(4);
    if (response.search("ERROR") == 0) {
      response = response.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(response)]);
      return false;
    } else if (response.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return false;
    } else {
      try {
        Database.nonfatalErrorOccurred = false;
        return parseInt(response) == 1;
      } catch (e: Error) {
        Database.ErrorHandler(new Event(""), Database.EXCEPTION_MESSAGE);
      }
      return false;
    }
  }

  public static FinishRating(e: Event): boolean {
    Database.StopTimer();
    var response: string = e.target.data.substring(4);
    if (response.search("ERROR") == 0) {
      response = response.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(response)]);
      return false;
    } else if (response.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return false;
    } else {
      try {
        Database.nonfatalErrorOccurred = false;
        return parseInt(response) == 1;
      } catch (e: Error) {
        Database.ErrorHandler(new Event(""), Database.EXCEPTION_MESSAGE);
      }
      return false;
    }
  }

  public static FinishCommenting(e: Event): number {
    Database.StopTimer();
    var response: string = e.target.data.substring(4);
    if (response.search("ERROR") == 0) {
      response = response.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(response)]);
      return -1;
    } else if (response.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return -1;
    } else {
      try {
        Database.nonfatalErrorOccurred = false;
        return parseInt(response);
      } catch (e: Error) {
        Database.ErrorHandler(new Event(""), Database.EXCEPTION_MESSAGE);
      }
      return -1;
    }
  }

  public static FinishReporting(e: Event): number {
    Database.StopTimer();
    var response: string = e.target.data.substring(4);
    if (response.search("ERROR") == 0) {
      response = response.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(response)]);
      return -1;
    } else if (response.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return -1;
    } else {
      try {
        Database.nonfatalErrorOccurred = false;
        return parseInt(response);
      } catch (e: Error) {
        Database.ErrorHandler(new Event(""), Database.EXCEPTION_MESSAGE);
      }
      return -1;
    }
  }

  public static FinishAddingUser(e: Event): string {
    Database.StopTimer();
    var response: string = e.target.data.substring(4);
    if (response.search("ERROR") == 0) {
      response = response.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(response)]);
      return "";
    } else if (response.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return "";
    } else {
      Database.nonfatalErrorOccurred = false;
      return response;
    }
  }

  public static FinishLoggingIn(e: Event): string {
    Database.StopTimer();
    var response: string = e.target.data.substring(4);
    if (response.search("ERROR") == 0) {
      response = response.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(response)]);
      return "";
    } else if (response.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return "";
    } else {
      Database.nonfatalErrorOccurred = false;
      return response;
    }
  }

  public static FinishSavingRobot(e: Event): string {
    Database.StopTimer();
    var response: string = e.target.data.substring(4);
    if (response.search("ERROR") != -1) {
      response = response.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(response)]);
      return "";
    } else if (response.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return "";
    } else {
      return response;
    }
  }

  public static FinishGettingRobotData(e: Event): boolean {
    Database.StopTimer();
    var str: string = e.target.data.substring(4);
    if (str.search("ERROR") != -1 && str.search("ERROR") < 5) {
      str = str.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(str)]);
      return false;
    } else {
      try {
        Database.numPages = parseInt(str.substr(0, str.indexOf("\n")));
        str = str.substr(str.indexOf("\n") + 1);
        Database.robotList = new Array();
        while (str.length > 0) {
          var curRobot: any = new Object();
          curRobot.id = str.substr(0, str.indexOf("\t"));
          str = str.substr(str.indexOf("\t") + 1);
          curRobot.user = unescape(str.substr(0, str.indexOf("\t"))).replace(/\+/g, " ");
          str = str.substr(str.indexOf("\t") + 1);
          curRobot.name = unescape(str.substr(0, str.indexOf("\t"))).replace(/\+/g, " ");
          str = str.substr(str.indexOf("\t") + 1);
          curRobot.description = unescape(str.substr(0, str.indexOf("\t"))).replace(/\+/g, " ");
          str = str.substr(str.indexOf("\t") + 1);
          curRobot.editable = parseInt(str.substr(0, str.indexOf("\t"))) == 1 ? true : false;
          str = str.substr(str.indexOf("\t") + 1);
          curRobot.shared = parseInt(str.substr(0, str.indexOf("\t"))) == 1 ? true : false;
          str = str.substr(str.indexOf("\t") + 1);
          curRobot.viewCount = parseInt(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curRobot.createTime = Database.ParseTimestamp(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curRobot.editTime = Database.ParseTimestamp(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curRobot.rating = parseFloat(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curRobot.numRatings = parseInt(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curRobot.featured = parseInt(str.substr(0, str.indexOf("\t"))) == 1 ? true : false;
          str = str.substr(str.indexOf("\t") + 1);
          curRobot.prop = parseInt(str.substr(0, str.indexOf("\t"))) == 1 ? true : false;
          str = str.substr(str.indexOf("\t") + 1);
          curRobot.challenge = str.substr(0, str.indexOf("\n"));
          str = str.substr(str.indexOf("\n") + 1);
          Database.robotList.push(curRobot);
        }
        return true;
      } catch (e: Error) {
        Database.ErrorHandler(new Event(""), Database.EXCEPTION_MESSAGE);
      }
      return false;
    }
  }

  public static async ImportRobot(robotStr: string): Promise<Robot> {
    var decoder: Base64Decoder = new Base64Decoder();
    decoder.decode(robotStr);
    var b: ByteArray = decoder.toByteArray();
    await b.uncompress();

    b.readUTF();
    b.readUTF();
    b.readInt();
    b.readInt();
    ControllerGameGlobals.potentialRobotPublic = true;
    ControllerGameGlobals.potentialRobotEditable = true;
    b.readInt();
    return Database.ExtractRobotFromByteArray(b);
  }

  public static ImportReplay(replayStr: string): Array<any> {
    var decoder: Base64Decoder = new Base64Decoder();
    decoder.decode(replayStr);
    var b: ByteArray = decoder.toByteArray();
    b.uncompress();
    var replayLength: number = b.readInt();
    var robotLength: number = b.readInt();
    var replayData: ByteArray = new ByteArray();
    var robotData: ByteArray = new ByteArray();
    while (b.position < replayLength + 8) {
      replayData.writeByte(b.readByte());
    }
    replayData.uncompress();
    while (b.position < replayLength + robotLength + 8) {
      robotData.writeByte(b.readByte());
    }
    robotData.uncompress();
    var replay: Replay = Database.ExtractReplayFromByteArray(replayData);
    var robot: Robot = Database.ExtractRobotFromByteArray(robotData);

    b.readUTF();
    b.readUTF();
    b.readUTF();
    b.readInt();
    b.readUTF();
    ControllerGameGlobals.potentialReplayPublic = true;

    return [replay, robot];
  }

  public static ImportChallenge(challengeStr: string): Challenge {
    var decoder: Base64Decoder = new Base64Decoder();
    decoder.decode(challengeStr);
    var b: ByteArray = decoder.toByteArray();
    b.uncompress();

    b.readUTF();
    b.readUTF();
    b.readInt();
    b.readInt();
    ControllerGameGlobals.potentialChallengePublic = true;
    ControllerGameGlobals.potentialChallengeEditable = true;
    return Database.ExtractChallengeFromByteArray(b);
  }

  public static FinishLoadingRobot(e: Event): Robot {
    Database.StopTimer();
    var responseData: ByteArray = Database.StripNewlinesAndExtractByte(e.target.data);
    if (responseData.length == 6 || responseData.length == 7) {
      var errorStr: string = responseData.readUTFBytes(5);
      if (errorStr == "ERROR") {
        Database.ErrorHandler(
          new Event(""),
          Database.ERROR_MESSAGES[parseInt(responseData.readUTFBytes(responseData.bytesAvailable))]
        );
        return null;
      } else {
        responseData.position = 0;
      }
    } else if (responseData.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return null;
    }
    try {
      var robotLengthStr: string = "";
      while (responseData.position != responseData.length) {
        var b: number = responseData.readByte();
        if (b == 10) break;
        else robotLengthStr = robotLengthStr.concat(String.fromCharCode(b));
      }
      var robotLength: number = parseInt(robotLengthStr);
      responseData = Database.StripNewlines(responseData);

      var robotData: ByteArray = new ByteArray();
      for (var i: number = 0; i < robotLength; i++) {
        robotData.writeByte(responseData.readByte());
      }
      robotData.uncompress();
      robotData.position = 0;
      var robot: Robot = Database.ExtractRobotFromByteArray(robotData);

      var challengeData: ByteArray = new ByteArray();
      while (responseData.position != responseData.length) {
        challengeData.writeByte(responseData.readByte());
      }
      if (challengeData.length > 0) {
        challengeData.uncompress();
        challengeData.position = 0;
        robot.challenge = Database.ExtractChallengeFromByteArray(challengeData);
      }

      return robot;
    } catch (e: Error) {
      Database.ErrorHandler(new Event(""), Database.EXCEPTION_MESSAGE);
    }
    return null;
  }

  public static FinishDeletingRobot(e: Event): string {
    Database.StopTimer();
    var response: string = e.target.data.substring(4);
    if (response.search("ERROR") != -1) {
      response = response.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(response)]);
      return "";
    } else if (response.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return "";
    } else {
      try {
        var id: string = Database.robotList[Database.deleteNumber].id;
        Database.robotList = Util.RemoveFromArray(Database.robotList[Database.deleteNumber], Database.robotList);
        Database.nonfatalErrorOccurred = false;
        return id;
      } catch (e: Error) {
        Database.ErrorHandler(new Event(""), Database.EXCEPTION_MESSAGE);
      }
      return "";
    }
  }

  public static FinishSavingReplay(e: Event): string {
    Database.StopTimer();
    var response: string = e.target.data.substring(4);
    if (response.search("ERROR") != -1) {
      response = response.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(response)]);
      return "";
    } else if (response.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return "";
    } else {
      return response;
    }
  }

  public static FinishGettingReplayData(e: Event): boolean {
    Database.StopTimer();
    var str: string = e.target.data.substring(4);
    if (str.search("ERROR") != -1 && str.search("ERROR") < 5) {
      str = str.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(str)]);
      return false;
    } else {
      try {
        Database.numPages = parseInt(str.substr(0, str.indexOf("\n")));
        str = str.substr(str.indexOf("\n") + 1);
        Database.replayList = new Array();
        while (str.length > 0) {
          var curReplay: any = new Object();
          curReplay.id = str.substr(0, str.indexOf("\t"));
          str = str.substr(str.indexOf("\t") + 1);
          curReplay.user = unescape(str.substr(0, str.indexOf("\t"))).replace(/\+/g, " ");
          str = str.substr(str.indexOf("\t") + 1);
          curReplay.name = unescape(str.substr(0, str.indexOf("\t"))).replace(/\+/g, " ");
          str = str.substr(str.indexOf("\t") + 1);
          curReplay.description = unescape(str.substr(0, str.indexOf("\t"))).replace(/\+/g, " ");
          str = str.substr(str.indexOf("\t") + 1);
          curReplay.robotID = str.substr(0, str.indexOf("\t"));
          str = str.substr(str.indexOf("\t") + 1);
          curReplay.shared = parseInt(str.substr(0, str.indexOf("\t"))) == 1 ? true : false;
          str = str.substr(str.indexOf("\t") + 1);
          curReplay.viewCount = parseInt(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curReplay.createTime = Database.ParseTimestamp(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curReplay.editTime = Database.ParseTimestamp(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curReplay.rating = parseFloat(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curReplay.numRatings = parseInt(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curReplay.featured = parseInt(str.substr(0, str.indexOf("\n"))) == 1 ? true : false;
          str = str.substr(str.indexOf("\n") + 1);
          Database.replayList.push(curReplay);
        }
        return true;
      } catch (e: Error) {
        Database.ErrorHandler(new Event(""), Database.EXCEPTION_MESSAGE);
      }
      return false;
    }
  }

  public static FinishLoadingReplay(e: Event): Array<any> {
    Database.StopTimer();
    var responseData: ByteArray = Database.StripNewlines(e.target.data);
    if (responseData.length == 6 || responseData.length == 7) {
      var errorStr: string = responseData.readUTFBytes(5);
      if (errorStr == "ERROR") {
        Database.ErrorHandler(
          new Event(""),
          Database.ERROR_MESSAGES[parseInt(responseData.readUTFBytes(responseData.bytesAvailable))]
        );
        return null;
      } else {
        responseData.position = 0;
      }
    } else if (responseData.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return null;
    }
    try {
      var replayLengthStr: string = "";
      while (responseData.position != responseData.length) {
        var b: number = responseData.readByte();
        if (b == 10) break;
        else replayLengthStr = replayLengthStr.concat(String.fromCharCode(b));
      }
      var replayLength: number = parseInt(replayLengthStr);
      responseData = Database.StripNewlines(responseData);

      var replayData: ByteArray = new ByteArray();
      for (var i: number = 0; i < replayLength; i++) {
        replayData.writeByte(responseData.readByte());
      }
      replayData.uncompress();
      replayData.position = 0;

      // Uncomment the following code to print out the array of bytes
      /*var arr:Array<any> = new Array();
			while (replayData.position != replayData.length) {
				arr.push(replayData.readByte());
			}
			replayData.position = 0;
			trace(arr);*/

      var replay: Replay = Database.ExtractReplayFromByteArray(replayData);
      var robotData: ByteArray = new ByteArray();
      while (responseData.position != responseData.length) {
        robotData.writeByte(responseData.readByte());
      }
      robotData.uncompress();
      robotData.position = 0;

      // Uncomment the following code to print out the array of bytes
      /*arr = new Array();
			while (robotData.position != robotData.length) {
				arr.push(robotData.readByte());
			}
			robotData.position = 0;
			trace(arr);*/

      var robot: Robot = Database.ExtractRobotFromByteArray(robotData);
      var replayAndRobot: Array<any> = new Array();
      replayAndRobot.push(replay);
      replayAndRobot.push(robot);
      return replayAndRobot;
    } catch (e: Error) {
      Database.ErrorHandler(new Event(""), Database.EXCEPTION_MESSAGE);
    }
    return null;
  }

  public static FinishDeletingReplay(e: Event): boolean {
    Database.StopTimer();
    var response: string = e.target.data.substring(4);
    if (response.search("ERROR") != -1) {
      response = response.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(response)]);
      return false;
    } else if (response.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return false;
    } else {
      try {
        Database.replayList = Util.RemoveFromArray(Database.replayList[Database.deleteNumber], Database.replayList);
        Database.nonfatalErrorOccurred = false;
        return true;
      } catch (e: Error) {
        Database.ErrorHandler(new Event(""), Database.EXCEPTION_MESSAGE);
      }
      return false;
    }
  }

  public static FinishSavingChallenge(e: Event): string {
    Database.StopTimer();
    var response: string = e.target.data.substring(4);
    if (response.search("ERROR") != -1) {
      response = response.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(response)]);
      return "";
    } else if (response.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return "";
    } else {
      return response;
    }
  }

  public static FinishGettingChallengeData(e: Event): boolean {
    Database.StopTimer();
    var str: string = e.target.data.substring(4);
    if (str.search("ERROR") != -1 && str.search("ERROR") < 5) {
      str = str.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(str)]);
      return false;
    } else {
      try {
        Database.numPages = parseInt(str.substr(0, str.indexOf("\n")));
        str = str.substr(str.indexOf("\n") + 1);
        Database.challengeList = new Array();
        while (str.length > 0) {
          var curChallenge: any = new Object();
          curChallenge.id = str.substr(0, str.indexOf("\t"));
          str = str.substr(str.indexOf("\t") + 1);
          curChallenge.user = unescape(str.substr(0, str.indexOf("\t"))).replace(/\+/g, " ");
          str = str.substr(str.indexOf("\t") + 1);
          curChallenge.name = unescape(str.substr(0, str.indexOf("\t"))).replace(/\+/g, " ");
          str = str.substr(str.indexOf("\t") + 1);
          curChallenge.description = unescape(str.substr(0, str.indexOf("\t"))).replace(/\+/g, " ");
          str = str.substr(str.indexOf("\t") + 1);
          curChallenge.editable = parseInt(str.substr(0, str.indexOf("\t"))) == 1 ? true : false;
          str = str.substr(str.indexOf("\t") + 1);
          curChallenge.shared = parseInt(str.substr(0, str.indexOf("\t"))) == 1 ? true : false;
          str = str.substr(str.indexOf("\t") + 1);
          curChallenge.viewCount = parseInt(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curChallenge.createTime = Database.ParseTimestamp(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curChallenge.editTime = Database.ParseTimestamp(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curChallenge.rating = parseFloat(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curChallenge.numRatings = parseInt(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curChallenge.featured = parseInt(str.substr(0, str.indexOf("\n"))) == 1 ? true : false;
          str = str.substr(str.indexOf("\n") + 1);
          Database.challengeList.push(curChallenge);
        }
        return true;
      } catch (e: Error) {
        Database.ErrorHandler(new Event(""), Database.EXCEPTION_MESSAGE);
      }
      return false;
    }
  }

  public static FinishLoadingChallenge(e: Event): Challenge {
    Database.StopTimer();
    var responseData: ByteArray = Database.StripNewlinesAndExtractByte(e.target.data);
    if (responseData.length == 6 || responseData.length == 7) {
      var errorStr: string = responseData.readUTFBytes(5);
      if (errorStr == "ERROR") {
        Database.ErrorHandler(
          new Event(""),
          Database.ERROR_MESSAGES[parseInt(responseData.readUTFBytes(responseData.bytesAvailable))]
        );
        return null;
      } else {
        responseData.position = 0;
      }
    } else if (responseData.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return null;
    }
    try {
      // Uncomment the following code to print out the array of bytes
      /*var arr:Array<any> = new Array();
			while (responseData.position != responseData.length) {
				arr.push(responseData.readByte());
			}
			responseData.position = 0;
			trace(arr);*/

      responseData.uncompress();
      return Database.ExtractChallengeFromByteArray(responseData);
    } catch (e: Error) {
      Database.ErrorHandler(new Event(""), Database.EXCEPTION_MESSAGE);
    }
    return null;
  }

  public static FinishDeletingChallenge(e: Event): boolean {
    Database.StopTimer();
    var response: string = e.target.data.substring(4);
    if (response.search("ERROR") != -1) {
      response = response.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(response)]);
      return false;
    } else if (response.length == 0) {
      Database.ErrorHandler(new Event(""), Database.NO_DATA_MESSAGE);
      return false;
    } else {
      try {
        Database.challengeList = Util.RemoveFromArray(
          Database.challengeList[Database.deleteNumber],
          Database.challengeList
        );
        Database.nonfatalErrorOccurred = false;
        return true;
      } catch (e: Error) {
        Database.ErrorHandler(new Event(""), Database.EXCEPTION_MESSAGE);
      }
      return false;
    }
  }

  public static FinishGettingScoreData(e: Event): boolean {
    Database.StopTimer();
    var str: string = e.target.data.substring(4);
    if (str.search("ERROR") != -1 && str.search("ERROR") < 5) {
      str = str.substring(5);
      Database.ErrorHandler(new Event(""), Database.ERROR_MESSAGES[parseInt(str)]);
      return false;
    } else {
      try {
        Database.numPages = parseInt(str.substr(0, str.indexOf("\n")));
        str = str.substr(str.indexOf("\n") + 1);
        Database.highScoresChallengeName = str.substr(0, str.indexOf("\n"));
        str = str.substr(str.indexOf("\n") + 1);
        Database.scoreList = new Array();
        while (str.length > 0) {
          var curScore: any = new Object();
          curScore.user = unescape(str.substr(0, str.indexOf("\t"))).replace(/\+/g, " ");
          str = str.substr(str.indexOf("\t") + 1);
          curScore.score = parseInt(str.substr(0, str.indexOf("\t")));
          str = str.substr(str.indexOf("\t") + 1);
          curScore.replayID = str.substr(0, str.indexOf("\t"));
          str = str.substr(str.indexOf("\t") + 1);
          curScore.robotID = str.substr(0, str.indexOf("\n"));
          str = str.substr(str.indexOf("\n") + 1);
          Database.scoreList.push(curScore);
        }
        return true;
      } catch (e: Error) {
        Database.ErrorHandler(new Event(""), Database.EXCEPTION_MESSAGE);
      }
      return false;
    }
  }

  public static StartTimer(): void {
    Database.timeoutTimer = new Timer(Database.TIMEOUT_SECONDS * 1000);
    Database.timeoutTimer.addEventListener(TimerEvent.TIMER, Database.TimeoutHandler);
    Database.timeoutTimer.start();
    Database.waitingForResponse = true;
    Database.curTransactionType = Database.curAction;
  }

  public static StopTimer(): void {
    Database.waitingForResponse = false;
    if (Database.timeoutTimer) {
      Database.timeoutTimer.stop();
      Database.timeoutTimer.removeEventListener(TimerEvent.TIMER, Database.TimeoutHandler);
    }
  }

  private static TimeoutHandler(e: TimerEvent): void {
    Database.loader.removeEventListener(Event.COMPLETE, Database.latestCompletionFunction);
    Database.loader.removeEventListener(SecurityErrorEvent.SECURITY_ERROR, Database.ErrorHandler);
    Database.loader.removeEventListener(IOErrorEvent.IO_ERROR, Database.ErrorHandler);
    Database.ErrorHandler(e, Database.ERROR_MESSAGES[0]);
  }

  public static ErrorHandler(e: Event, msg: string = Database.UNKNOWN_MESSAGE): void {
    Database.StopTimer();
    Database.errorOccurred = true;
    if (msg == Database.UNKNOWN_MESSAGE) {
      if (e instanceof SecurityErrorEvent) {
        msg = Database.SECURITY_MESSAGE;
      } else {
        msg = Database.IO_MESSAGE;
      }
      Database.lastErrorMsg = "Error: " + msg + "  Code: " + (e as ErrorEvent).text;
    } else {
      Database.lastErrorMsg = "Error: " + msg;
    }
    if (msg == Database.ERROR_MESSAGES[Database.WRONG_VERSION_CODE]) {
      Database.versionErrorOccurred = true;
    }
  }

  private static IsPartOfRobot(p: Part, index: number, array: Array<any>): boolean {
    return p.drawAnyway;
  }

  private static IsShape(p: Part, index: number, array: Array<any>): boolean {
    return p instanceof ShapePart;
  }

  private static PutChallengeIntoByteArray(challenge: Challenge): ByteArray {
    var b: ByteArray = Database.PutPartsIntoByteArray(challenge.allParts, new ByteArray());
    b.position = 0;
    var partData: Array<any> = Database.ExtractPartsFromByteArray(b);
    b.writeObject(challenge.settings);
    b.writeBoolean(challenge.circlesAllowed);
    b.writeBoolean(challenge.rectanglesAllowed);
    b.writeBoolean(challenge.trianglesAllowed);
    b.writeBoolean(challenge.fixedJointsAllowed);
    b.writeBoolean(challenge.rotatingJointsAllowed);
    b.writeBoolean(challenge.slidingJointsAllowed);
    b.writeBoolean(challenge.thrustersAllowed);
    b.writeBoolean(challenge.fixateAllowed);
    b.writeBoolean(challenge.mouseDragAllowed);
    b.writeBoolean(challenge.botControlAllowed);
    b.writeDouble(challenge.minDensity);
    b.writeDouble(challenge.maxDensity);
    b.writeDouble(challenge.maxRJStrength);
    b.writeDouble(challenge.maxRJSpeed);
    b.writeDouble(challenge.maxSJStrength);
    b.writeDouble(challenge.maxSJSpeed);
    b.writeDouble(challenge.maxThrusterStrength);
    b.writeObject(challenge.buildAreas);
    var allShapes: Array<any> = partData.filter(Database.IsShape);
    for (var i: number = challenge.winConditions.length - 1; i >= 0; i--) {
      if (challenge.winConditions[i].shape1) {
        for (var j: number = 0; j < allShapes.length; j++) {
          if (challenge.winConditions[i].shape1.equals(allShapes[j])) {
            challenge.winConditions[i].shape1Index = j;
          }
        }
      }
      if (challenge.winConditions[i].shape2) {
        for (j = 0; j < allShapes.length; j++) {
          if (challenge.winConditions[i].shape2.equals(allShapes[j])) {
            challenge.winConditions[i].shape2Index = j;
          }
        }
      }
      if (
        (challenge.winConditions[i].subject == 0 && challenge.winConditions[i].shape1Index == -1) ||
        (challenge.winConditions[i].object > 4 && challenge.winConditions[i].shape2Index == -1)
      ) {
        challenge.winConditions = Util.RemoveFromArray(challenge.winConditions[i], challenge.winConditions);
      }
    }
    for (i = challenge.lossConditions.length - 1; i >= 0; i--) {
      if (challenge.lossConditions[i].shape1) {
        for (j = 0; j < allShapes.length; j++) {
          if (challenge.lossConditions[i].shape1.equals(allShapes[j])) {
            challenge.lossConditions[i].shape1Index = j;
          }
        }
      }
      if (challenge.lossConditions[i].shape2) {
        for (j = 0; j < allShapes.length; j++) {
          if (challenge.lossConditions[i].shape2.equals(allShapes[j])) {
            challenge.lossConditions[i].shape2Index = j;
          }
        }
      }
      if (
        (challenge.lossConditions[i].subject == 0 && challenge.lossConditions[i].shape1Index == -1) ||
        (challenge.lossConditions[i].object > 4 && challenge.lossConditions[i].shape2Index == -1)
      ) {
        challenge.lossConditions = Util.RemoveFromArray(challenge.lossConditions[i], challenge.lossConditions);
      }
    }
    b.writeObject(challenge.winConditions);
    b.writeObject(challenge.lossConditions);
    for (i = 0; i < challenge.winConditions.length; i++) {
      challenge.winConditions[i].shape1Index = -1;
      challenge.winConditions[i].shape2Index = -1;
    }
    for (i = 0; i < challenge.lossConditions.length; i++) {
      challenge.lossConditions[i].shape1Index = -1;
      challenge.lossConditions[i].shape2Index = -1;
    }
    b.writeBoolean(challenge.winConditionsAnded);
    b.writeFloat(challenge.cameraX);
    b.writeFloat(challenge.cameraY);
    b.writeFloat(challenge.zoomLevel);
    b.writeBoolean(challenge.nonCollidingAllowed);
    b.writeBoolean(challenge.showConditions);
    b.writeBoolean(challenge.cannonsAllowed);
    return b;
  }

  public static ExtractChallengeFromByteArray(data: ByteArray): Challenge {
    var partData: Array<any> = Database.ExtractPartsFromByteArray(data);
    var settings: Object = data.readObject();
    var c: Challenge = new Challenge(
      new SandboxSettings(
        settings.gravity,
        settings.size,
        settings.terrainType,
        settings.terrainTheme,
        settings.background,
        settings.backgroundR,
        settings.backgroundG,
        settings.backgroundB
      )
    );
    c.allParts = partData;
    c.circlesAllowed = data.readBoolean();
    c.rectanglesAllowed = data.readBoolean();
    c.trianglesAllowed = data.readBoolean();
    c.fixedJointsAllowed = data.readBoolean();
    c.rotatingJointsAllowed = data.readBoolean();
    c.slidingJointsAllowed = data.readBoolean();
    c.thrustersAllowed = data.readBoolean();
    c.fixateAllowed = data.readBoolean();
    c.mouseDragAllowed = data.readBoolean();
    c.botControlAllowed = data.readBoolean();
    c.minDensity = data.readDouble();
    c.maxDensity = data.readDouble();
    c.maxRJStrength = data.readDouble();
    c.maxRJSpeed = data.readDouble();
    c.maxSJStrength = data.readDouble();
    c.maxSJSpeed = data.readDouble();
    c.maxThrusterStrength = data.readDouble();
    var buildAreas: Array<any> = data.readObject();
    c.buildAreas = new Array();
    for (var i: number = 0; i < buildAreas.length; i++) {
      var area: b2AABB = new b2AABB();
      area.lowerBound = Util.Vector(buildAreas[i].lowerBound.x, buildAreas[i].lowerBound.y);
      area.upperBound = Util.Vector(buildAreas[i].upperBound.x, buildAreas[i].upperBound.y);
      c.buildAreas.push(area);
    }
    var conditions: Array<any> = data.readObject();
    var allShapes: Array<any> = partData.filter(Database.IsShape);
    for (i = 0; i < conditions.length; i++) {
      var cond: WinCondition = new WinCondition(conditions[i].name, conditions[i].subject, conditions[i].object);
      cond.minX = conditions[i].minX;
      cond.maxX = conditions[i].maxX;
      cond.minY = conditions[i].minY;
      cond.maxY = conditions[i].maxY;
      if (conditions[i].shape1Index != -1) {
        cond.shape1 = allShapes[conditions[i].shape1Index];
      }
      if (conditions[i].shape2Index != -1) {
        cond.shape2 = allShapes[conditions[i].shape2Index];
      }
      c.winConditions.push(cond);
    }
    conditions = data.readObject();
    for (i = 0; i < conditions.length; i++) {
      var con: LossCondition = new LossCondition(
        conditions[i].name,
        conditions[i].subject,
        conditions[i].object,
        conditions[i].immediate
      );
      con.minX = conditions[i].minX;
      con.maxX = conditions[i].maxX;
      con.minY = conditions[i].minY;
      con.maxY = conditions[i].maxY;
      if (conditions[i].shape1Index != -1) {
        con.shape1 = allShapes[conditions[i].shape1Index];
      }
      if (conditions[i].shape2Index != -1) {
        con.shape2 = allShapes[conditions[i].shape2Index];
      }
      c.lossConditions.push(con);
    }
    c.winConditionsAnded = data.readBoolean();
    if (data.position != data.length) {
      c.cameraX = data.readFloat();
      c.cameraY = data.readFloat();
      c.zoomLevel = data.readFloat();
    }
    if (data.position != data.length) {
      c.nonCollidingAllowed = data.readBoolean();
      c.showConditions = data.readBoolean();
    }
    if (data.position != data.length) {
      c.cannonsAllowed = data.readBoolean();
    } else {
      c.cannonsAllowed =
        c.rectanglesAllowed &&
        c.slidingJointsAllowed &&
        c.rotatingJointsAllowed &&
        c.slidingJointsAllowed &&
        c.thrustersAllowed;
    }
    return c;
  }

  private static PutPartsIntoByteArray(parts: Array<any>, b: ByteArray): ByteArray {
    parts = parts.filter(Database.IsPartOfRobot);

    // we need to make sure all Shape definitions come earlier in the array than all Joint definitions
    var partsToStore: Array<any> = new Array();
    for (var i: number = 0; i < parts.length; i++) {
      if (parts[i] instanceof ShapePart || parts[i] instanceof TextPart) {
        partsToStore.push(parts[i]);
      }
    }
    var numShapes: number = 0;
    for (i = 0; i < parts.length; i++) {
      if (parts[i] instanceof JointPart || parts[i] instanceof Thrusters) {
        partsToStore.push(parts[i]);
        if (parts[i] instanceof PrismaticJoint) {
          parts[i].arrayIndex = numShapes;
          numShapes++;
        }
      } else {
        numShapes++;
      }
    }

    // since we can't store references to parts, store array indices for joints' references to their ShapeParts
    for (i = 0; i < partsToStore.length; i++) {
      if (partsToStore[i] instanceof JointPart) {
        for (var j: number = 0; j < parts.length; j++) {
          if (partsToStore[j] == partsToStore[i].part1) partsToStore[i].part1Index = j;
          if (partsToStore[j] == partsToStore[i].part2) partsToStore[i].part2Index = j;
        }
      } else if (partsToStore[i] instanceof Thrusters) {
        for (j = 0; j < parts.length; j++) {
          if (partsToStore[j] == partsToStore[i].shape) partsToStore[i].shapeIndex = j;
        }
      }
    }

    b.writeObject(partsToStore);
    return b;
  }

  private static ExtractPartsFromByteArray(b: ByteArray): Array<any> {
    var objectData: Array<any> = b.readObject() as Array;
    var partData: Array<any> = new Array();

    // extract the data from the stored Object and recreate parts based on that
    for (var i: number = 0; i < objectData.length; i++) {
      if (
        objectData[i].type == "Circle" ||
        objectData[i].type == "Rectangle" ||
        objectData[i].type == "Triangle" ||
        objectData[i].type == "Cannon"
      ) {
        var shape: ShapePart;
        if (objectData[i].type == "Circle") {
          shape = new Circle(objectData[i].centerX, objectData[i].centerY, objectData[i].radius, false);
        } else if (objectData[i].type == "Rectangle") {
          shape = new Rectangle(objectData[i].x, objectData[i].y, objectData[i].w, objectData[i].h, false);
        } else if (objectData[i].type == "Triangle") {
          shape = new Triangle(
            objectData[i].x1,
            objectData[i].y1,
            objectData[i].x2,
            objectData[i].y2,
            objectData[i].x3,
            objectData[i].y3
          );
        } else if (objectData[i].type == "Cannon") {
          shape = new Cannon(objectData[i].x, objectData[i].y, objectData[i].w);
          (shape as Cannon).fireKey = objectData[i].fireKey;
          (shape as Cannon).strength = objectData[i].strength;
        }
        shape.angle = objectData[i].angle;
        shape.density = objectData[i].density;
        shape.collide = objectData[i].collide;
        shape.isStatic = objectData[i].isStatic;
        shape.isCameraFocus = objectData[i].isCameraFocus;
        shape.red = objectData[i].red;
        shape.green = objectData[i].green;
        shape.blue = objectData[i].blue;
        shape.opacity = objectData[i].opacity;
        shape.outline = objectData[i].outline;
        if (objectData[i].hasOwnProperty("terrain")) {
          shape.terrain = objectData[i].terrain;
        }
        if (objectData[i].hasOwnProperty("undragable")) {
          shape.undragable = objectData[i].undragable;
        }
        partData.push(shape);
      } else if (objectData[i].type == "TextPart") {
        var text: TextPart = new TextPart(
          Main.m_curController as ControllerGame,
          objectData[i].x,
          objectData[i].y,
          objectData[i].w,
          objectData[i].h,
          objectData[i].text,
          objectData[i].inFront
        );
        text.inFront = objectData[i].inFront;
        text.scaleWithZoom = objectData[i].scaleWithZoom;
        text.alwaysVisible = objectData[i].alwaysVisible;
        text.displayKey = objectData[i].displayKey;
        text.red = objectData[i].red;
        text.green = objectData[i].green;
        text.blue = objectData[i].blue;
        text.size = objectData[i].size;
        partData.push(text);
      } else if (objectData[i].type == "Thrusters") {
        if (objectData[i].shapeIndex >= 0) {
          var t: Thrusters = new Thrusters(
            partData[objectData[i].shapeIndex],
            objectData[i].centerX,
            objectData[i].centerY
          );
          t.strength = objectData[i].strength;
          t.angle = objectData[i].angle;
          t.thrustKey = objectData[i].thrustKey;
          t.autoOn = objectData[i].autoOn;
          partData.push(t);
        }
      } else if (
        objectData[i].type == "FixedJoint" ||
        objectData[i].type == "RevoluteJoint" ||
        objectData[i].type == "PrismaticJoint"
      ) {
        if (objectData[i].part1Index >= 0 && objectData[i].part2Index >= 0) {
          var joint: JointPart;
          if (objectData[i].type == "FixedJoint") {
            joint = new FixedJoint(
              partData[objectData[i].part1Index],
              partData[objectData[i].part2Index],
              objectData[i].anchorX,
              objectData[i].anchorY
            );
          } else if (objectData[i].type == "RevoluteJoint") {
            joint = new RevoluteJoint(
              partData[objectData[i].part1Index],
              partData[objectData[i].part2Index],
              objectData[i].anchorX,
              objectData[i].anchorY
            );
            (joint as RevoluteJoint).enableMotor = objectData[i].enableMotor;
            (joint as RevoluteJoint).motorCWKey = objectData[i].motorCWKey;
            (joint as RevoluteJoint).motorCCWKey = objectData[i].motorCCWKey;
            (joint as RevoluteJoint).motorStrength = objectData[i].motorStrength;
            (joint as RevoluteJoint).motorSpeed = objectData[i].motorSpeed;
            (joint as RevoluteJoint).motorLowerLimit = objectData[i].motorLowerLimit;
            (joint as RevoluteJoint).motorUpperLimit = objectData[i].motorUpperLimit;
            (joint as RevoluteJoint).isStiff = objectData[i].isStiff;
            (joint as RevoluteJoint).autoCW = objectData[i].autoCW;
            (joint as RevoluteJoint).autoCCW = objectData[i].autoCCW;
          } else if (objectData[i].type == "PrismaticJoint") {
            joint = new PrismaticJoint(
              partData[objectData[i].part1Index],
              partData[objectData[i].part2Index],
              0,
              0,
              1,
              1
            );
            joint.anchorX = objectData[i].anchorX;
            joint.anchorY = objectData[i].anchorY;
            (joint as PrismaticJoint).axis = new b2Vec2(objectData[i].axis.x, objectData[i].axis.y);
            (joint as PrismaticJoint).enablePiston = objectData[i].enablePiston;
            (joint as PrismaticJoint).pistonUpKey = objectData[i].pistonUpKey;
            (joint as PrismaticJoint).pistonDownKey = objectData[i].pistonDownKey;
            (joint as PrismaticJoint).pistonStrength = objectData[i].pistonStrength;
            (joint as PrismaticJoint).pistonSpeed = objectData[i].pistonSpeed;
            (joint as PrismaticJoint).isStiff = objectData[i].isStiff;
            (joint as PrismaticJoint).autoOscillate = objectData[i].autoOscillate;
            (joint as PrismaticJoint).initLength = objectData[i].initLength;
            (joint as PrismaticJoint).red = objectData[i].red;
            (joint as PrismaticJoint).green = objectData[i].green;
            (joint as PrismaticJoint).blue = objectData[i].blue;
            (joint as PrismaticJoint).opacity = objectData[i].opacity;
            (joint as PrismaticJoint).outline = objectData[i].outline;
            (joint as PrismaticJoint).collide = objectData[i].collide;
            if (objectData[i].hasOwnProperty("arrayIndex")) {
              (joint as PrismaticJoint).arrayIndex = objectData[i].arrayIndex;
            }
          }
          partData.push(joint);
        }
      }
    }

    for (i = 0; i < partData.length; i++) {
      if (partData[i] instanceof PrismaticJoint && partData[i].arrayIndex != -1) {
        var piston: PrismaticJoint = partData[i];
        partData = Util.RemoveFromArray(piston, partData);
        partData = Util.InsertIntoArray(piston, partData, piston.arrayIndex);
      }
    }

    return partData;
  }

  private static PutRobotIntoByteArray(robot: Robot): ByteArray {
    var robotData: ByteArray = Database.PutPartsIntoByteArray(robot.allParts, new ByteArray());
    robotData.writeObject(robot.settings);
    robotData.writeFloat(robot.cameraX);
    robotData.writeFloat(robot.cameraY);
    robotData.writeFloat(robot.zoomLevel);
    return robotData;
  }

  public static ExtractRobotFromByteArray(data: ByteArray): Robot {
    var partData: Array<any> = Database.ExtractPartsFromByteArray(data);
    if (data.position == data.length) {
      return new Robot(
        partData,
        new SandboxSettings(15.0, 1, 0, 0, 0),
        Number.MAX_VALUE,
        Number.MAX_VALUE,
        Number.MAX_VALUE
      );
    } else {
      var settings: Object = data.readObject();
      var cameraX: number = Number.MAX_VALUE;
      var cameraY: number = Number.MAX_VALUE;
      var zoomLevel: number = Number.MAX_VALUE;
      if (data.position != data.length) {
        cameraX = data.readFloat();
        cameraY = data.readFloat();
        zoomLevel = data.readFloat();
      }

      return new Robot(
        partData,
        new SandboxSettings(
          settings.gravity,
          settings.size,
          settings.terrainType,
          settings.terrainTheme,
          settings.background,
          settings.backgroundR,
          settings.backgroundG,
          settings.backgroundB
        ),
        cameraX,
        cameraY,
        zoomLevel
      );
    }
  }

  private static PutReplayIntoByteArray(replay: Replay): ByteArray {
    var b: ByteArray = new ByteArray();
    for (var i: number = 0; i < replay.cameraMovements.length; i++) {
      Database.WriteInt(b, replay.cameraMovements[i].frame);
      Database.WriteFloat(b, replay.cameraMovements[i].x / 100);
      Database.WriteFloat(b, replay.cameraMovements[i].y / 100);
      Database.WriteFloat(b, replay.cameraMovements[i].scale);
    }
    Database.WriteInt(b, Number.MIN_VALUE);
    Database.WriteInt(b, Number.MIN_VALUE);
    for (i = 0; i < replay.syncPoints.length; i++) {
      Database.WriteInt(b, replay.syncPoints[i].frame);
      for (var j: number = 0; j < replay.syncPoints[i].positions.length; j++) {
        if (
          i == 0 ||
          i == replay.syncPoints.length - 1 ||
          replay.syncPoints[i].positions[j].x != replay.syncPoints[i - 1].positions[j].x ||
          replay.syncPoints[i].positions[j].y != replay.syncPoints[i - 1].positions[j].y ||
          replay.syncPoints[i].angles[j] != replay.syncPoints[i - 1].angles[j]
        ) {
          Database.WriteFloat(b, replay.syncPoints[i].positions[j].x);
          Database.WriteFloat(b, replay.syncPoints[i].positions[j].y);
          if (replay.syncPoints[i].angles[j] <= -32.7 || replay.syncPoints[i].angles[j] >= 32.8)
            Database.WriteFloat(b, Database.NormalizeAngle(replay.syncPoints[i].angles[j]) * 10);
          else Database.WriteFloat(b, replay.syncPoints[i].angles[j] * 10);
          Database.WriteInt(b, j);
        }
      }
      Database.WriteFloat(b, Number.NEGATIVE_INFINITY);
      if (replay.syncPoints[i].cannonballPositions.length > 0) {
        Database.WriteInt(b, -1);
        for (j = 0; j < replay.syncPoints[i].cannonballPositions.length; j++) {
          Database.WriteFloat(b, replay.syncPoints[i].cannonballPositions[j].x);
          Database.WriteFloat(b, replay.syncPoints[i].cannonballPositions[j].y);
        }
        Database.WriteFloat(b, Number.NEGATIVE_INFINITY);
      }
    }
    Database.WriteInt(b, Number.MIN_VALUE);
    b.writeObject(replay.version);
    Database.WriteInt(b, replay.numFrames);
    for (i = 0; i < replay.keyPresses.length; i++) {
      Database.WriteInt(b, replay.keyPresses[i].frame);
      Database.WriteInt(b, replay.keyPresses[i].key);
    }
    Database.WriteInt(b, Number.MIN_VALUE);
    return b;
  }

  public static async ExtractReplayFromByteArray(data: ByteArray): Replay {
    var cameraMovements: Array<any> = new Array();
    while (true) {
      var frame: number = Database.ReadInt(data);
      if (frame == Number.MIN_VALUE) break;
      var x: number = Database.ReadFloat(data) * 100;
      var y: number = Database.ReadFloat(data) * 100;
      var scale: number = Database.ReadFloat(data);
      cameraMovements.push(new CameraMovement(frame, x, y, scale));
    }
    var syncPoints: Array<any> = new Array();

    var divideAngles: boolean = false;
    var firstIter: boolean = true;
    frame = Database.ReadInt(data);
    if (frame == Number.MIN_VALUE) {
      divideAngles = true;
      firstIter = false;
    }

    while (true) {
      if (!firstIter) frame = Database.ReadInt(data);
      firstIter = false;
      if (frame == Number.MIN_VALUE) break;
      else if (frame == -1) {
        while (true) {
          x = Database.ReadFloat(data);
          if (x == Number.NEGATIVE_INFINITY) break;
          y = Database.ReadFloat(data);
          syncPoints[syncPoints.length - 1].cannonballPositions.push(Util.Vector(x, y));
        }
      } else {
        var syncPoint: ReplaySyncPoint = new ReplaySyncPoint();
        syncPoint.frame = frame;
        var i: number = 0;
        while (true) {
          x = Database.ReadFloat(data);
          if (x != Number.NEGATIVE_INFINITY) {
            y = Database.ReadFloat(data);
            var angle: number = Database.ReadFloat(data);
            if (divideAngles) angle /= 10;
          }
          var nextI: number;
          if (x == Number.NEGATIVE_INFINITY) {
            if (syncPoints.length == 0) break;
            else nextI = syncPoints[syncPoints.length - 1].positions.length;
          } else {
            nextI = Database.ReadInt(data);
          }
          while (i < nextI) {
            syncPoint.positions.push(syncPoints[syncPoints.length - 1].positions[i]);
            syncPoint.angles.push(syncPoints[syncPoints.length - 1].angles[i]);
            i++;
          }
          if (x != Number.NEGATIVE_INFINITY) {
            syncPoint.positions.push(Util.Vector(x, y));
            syncPoint.angles.push(angle);
          } else {
            break;
          }
          i++;
        }
        syncPoints.push(syncPoint);
      }
    }
    var version: string = data.readObject().toString();
    var numFrames: number = Database.ReadInt(data);
    var keyPresses: Array<any> = new Array();
    if (data.position != data.length) {
      while (true) {
        frame = Database.ReadInt(data);
        if (frame == Number.MIN_VALUE) break;
        var key: number = Database.ReadInt(data);
        keyPresses.push(new KeyPress(frame, key));
      }
    }
    return new Replay(cameraMovements, syncPoints, keyPresses, numFrames, version);
  }

  private static WriteFloat(b: ByteArray, n: number): void {
    if (n == Number.NEGATIVE_INFINITY) {
      b.writeByte(-128);
      b.writeByte(-128);
      return;
    } else if (n == Number.POSITIVE_INFINITY) {
      b.writeByte(127);
      b.writeByte(127);
      return;
    }
    n += 327;
    n *= 100;
    var i: number = Util.NearestInt(n);
    var b1: number = i / 256;
    var b2: number = i % 256;
    b.writeByte(b1 - 128);
    b.writeByte(b2 - 128);
  }

  private static WriteInt(b: ByteArray, i: number): void {
    if (i == Number.MIN_VALUE) {
      b.writeByte(-1);
      b.writeByte(-1);
    } else if (i == -1) {
      b.writeByte(0);
      b.writeByte(-1);
    } else {
      b.writeByte(i / 128);
      b.writeByte(i % 128);
    }
  }

  private static ReadFloat(b: ByteArray): number {
    var b1: number = b.readByte() + 128;
    var b2: number = b.readByte() + 128;
    if (b1 == 0 && b2 == 0) return Number.NEGATIVE_INFINITY;
    if (b1 == 255 && b2 == 255) return Number.POSITIVE_INFINITY;
    var i: number = b1 * 256 + b2;
    var n: number = Number(i);
    n /= 100;
    n -= 327;
    return n;
  }

  private static ReadInt(b: ByteArray): number {
    var b1: number = b.readByte();
    var b2: number = b.readByte();
    if (b1 == -1 && b2 == -1) return Number.MIN_VALUE;
    if (b1 == 0 && b2 == -1) return -1;
    else return b1 * 128 + b2;
  }

  private static NormalizeAngle(angle: number): number {
    while (angle >= 32.8) angle -= 10 * Math.PI;
    while (angle <= -32.7) angle += 10 * Math.PI;
    return angle;
  }

  private static StripNewlines(byteArrayWithNewlines: ByteArray): ByteArray {
    // strip off 4 leading \n characters that always get returned
    var byteArray: ByteArray = new ByteArray();
    byteArrayWithNewlines.position += 4;
    while (byteArrayWithNewlines.position != byteArrayWithNewlines.length) {
      byteArray.writeByte(byteArrayWithNewlines.readByte());
    }
    byteArray.position = 0;
    return byteArray;
  }

  private static StripNewlinesAndExtractByte(byteArrayWithNewlines: ByteArray): ByteArray {
    // strip off 4 leading \n characters that always get returned
    var byteArray: ByteArray = new ByteArray();
    byteArrayWithNewlines.position += 4;
    ControllerGameGlobals.potentialRobotEditable = byteArrayWithNewlines.readByte() == 49;
    while (byteArrayWithNewlines.position != byteArrayWithNewlines.length) {
      byteArray.writeByte(byteArrayWithNewlines.readByte());
    }
    byteArray.position = 0;
    return byteArray;
  }

  private static ParseTimestamp(timestamp: string): number {
    var num: number = Date.parse(timestamp.replace("-", "/").replace("-", "/").replace("T", " "));
    if (isNaN(num) && timestamp.length == 14) {
      timestamp =
        timestamp.substr(0, 4) +
        "/" +
        timestamp.substr(4, 2) +
        "/" +
        timestamp.substr(6, 2) +
        " " +
        timestamp.substr(8, 2) +
        ":" +
        timestamp.substr(10, 2) +
        ":" +
        timestamp.substr(12, 2);
      num = Date.parse(timestamp);
    }
    return num;
  }
}
