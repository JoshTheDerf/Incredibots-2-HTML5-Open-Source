// permanent mochi ID for version 0.02: 1913f89f65e17063

import { Application, Container, Sprite } from "pixi.js";
import { Controller } from "./Game/Controller";
import { ControllerGameGlobals } from "./Game/Globals/ControllerGameGlobals";
import { ControllerMainMenu } from "./Game/ControllerMainMenu";
import { ControllerSandbox } from "./Game/ControllerSandbox";
import { SandboxSettings } from "./Game/SandboxSettings";
import { FpsCounter } from "./General/FpsCounter";
import { LSOManager } from "./General/LSOManager";
import { Input } from "./General/Input";

export class Main {

	//======================
	// Member data
	//======================
	static public m_fpsCounter:FpsCounter = new FpsCounter();
	static public m_curController:Controller = null;
	static public changeControllers:boolean = false;
	static public nextControllerType:number = -1;
	static public firstFrame:boolean = true;
	static public frameCounter:number = 0;
	static public inIFrame:boolean = false;

	static public theRoot:Container = null;

	static public mouseCursor:BitmapAsset;
	static public mouseHourglass:BitmapAsset;

	static public loadRobotMode:boolean = false;
	static public loadReplayMode:boolean = false;
	static public loadChallengeMode:boolean = false;
	static public premiumMode:boolean = false;
	static public enableSound:boolean = true;

	static public const VERSION_STRING:string = "2.23 CE";
	static public const DEBUG_VERSION:boolean = true;
	static public const ENABLE_SITE_LOCK:number = 643 - (Main.DEBUG_VERSION ? 2 : 1);
	static public _mochiads_game_id:string = "50feb50977299858";

	static public lastAdTime:number = 0;

	static public const GLOBAL_FONT:string = "Arial";

	public static BrowserRedirect(url:string|null = null, newWindow:boolean = false, parent:boolean = false):void {
		const target = url || "http://www.incredibots.com/"
		let mode = '_self'

		if (newWindow) mode = '_blank'
		if (parent) mode = '_top'

		window.open(url, mode)
	}

	constructor(renderer: Application) {
		this.renderer = renderer
		Main.theRoot = this.renderer.stage
		Main.theRoot.interactive = true

		var urlString:string = window.location.href;
		var urlStart:number = urlString.indexOf("://") + 3;
		var urlEnd:number = urlString.indexOf("/", urlStart);
		var domain:string = urlString.substring(urlStart, urlEnd);
		var lastDot:number = domain.lastIndexOf(".") - 1;
		var domEnd:number = domain.lastIndexOf(".", lastDot) + 1;
		domain = domain.substring(domEnd, domain.length);

		if (domain == "incredibotsgold.com") Main.premiumMode = true;

		renderer.ticker.maxFPS = 30 // Cap FPS to 30 as the FPS is tied directly to the game loop and the flash version was designed this way. :(
		renderer.ticker.add((delta) => this.update())

		addEventListener(Event.ADDED_TO_STAGE, this.Init, false, 0, true);

		LSOManager.Init();
		this.Init();

		// TODO: Reimplement.
		// Hide the mouse
		// Mouse.hide();
		// stage.addEventListener(Event.MOUSE_LEAVE,this.rehideMouse);

		if (Main.DEBUG_VERSION) {
			Main.m_fpsCounter.x = 7;
			Main.m_fpsCounter.y = 525;
			Main.theRoot.addChild(Main.m_fpsCounter);
		}

		// contextMenu = new ContextMenu();
		// contextMenu.hideBuiltInItems();
	}

	private Init():void {
		Input.Init();
	}

	private rehideMouse(e:Event):void {
		Mouse.hide();
	}

	public update():void {
		Main.frameCounter++;
		if (Main.firstFrame) {
			var urlParams:URLSearchParams = new URLSearchParams(window.location.search);
			if (urlParams.get("replayID")) {
				Main.loadReplayMode = true;
				var replayID:string = urlParams.get("replayID");
			}
			if (urlParams.get("robotID")) {
				Main.loadRobotMode = true;
				var robotID:string = urlParams.get("robotID");
			}
			if (urlParams.get("challengeID")) {
				Main.loadChallengeMode = true;
				var challengeID:string = urlParams.get("challengeID");
			}
			if (urlParams.get("iframe")) {
				Main.inIFrame = true;
			}

			if (Main.loadReplayMode && !Main.premiumMode) {
				ControllerSandbox.settings = new SandboxSettings(15.0, 0, 0, 0, 0);
				Main.m_curController = new ControllerSandbox();
				(Main.m_curController as ControllerGame).LoadReplayNow(replayID);
				ControllerGameGlobals.potentialReplayID = replayID;
				ControllerGameGlobals.potentialReplayPublic = true;
				ControllerGameGlobals.replayDirectlyLinked = true;
				Main.theRoot.addChild(Main.m_curController);
				Main.nextControllerType = 0;
			} else if (Main.loadRobotMode && !Main.premiumMode) {
				ControllerSandbox.settings = new SandboxSettings(15.0, 0, 0, 0, 0);
				Main.m_curController = new ControllerSandbox();
				(Main.m_curController as ControllerGame).LoadRobotNow(robotID);
				ControllerGameGlobals.potentialRobotID = robotID;
				ControllerGameGlobals.potentialRobotPublic = true;
				Main.theRoot.addChild(Main.m_curController);
				Main.nextControllerType = 0;
			} else if (Main.loadChallengeMode && !Main.premiumMode) {
				ControllerSandbox.settings = new SandboxSettings(15.0, 0, 0, 0, 0);
				Main.m_curController = new ControllerSandbox();
				(Main.m_curController as ControllerGame).LoadChallengeNow(challengeID);
				ControllerGameGlobals.potentialChallengeID = challengeID;
				ControllerGameGlobals.potentialChallengePublic = true;
				Main.theRoot.addChild(Main.m_curController);
				Main.nextControllerType = 0;
			} else {
				Main.m_curController = new ControllerMainMenu();
				Main.theRoot.addChild(Main.m_curController);
			}

			// Main.mouseCursor = new Resource.cMouseCursor();
			// Main.mouseCursor.smoothing = true;
			// Main.mouseCursor.visible = (Main.m_curController is ControllerMainMenu);
			// stage.addChild(Main.mouseCursor);
			// Main.mouseHourglass = new Resource.cMouseHourglass();
			// Main.mouseHourglass.visible = !(Main.m_curController is ControllerMainMenu);
			// Main.mouseHourglass.smoothing = true;
			// stage.addChild(Main.mouseHourglass);

			Main.firstFrame = false;
		}

		//trace(getTimer());

		// Reset
		if (Main.changeControllers) {
			Main.theRoot.removeChild(Main.m_curController);
			if (Main.nextControllerType == -1) {
				Main.m_curController = new ControllerMainMenu(true);
			} else if (Main.nextControllerType == 10) {
				Main.m_curController = new ControllerTank();
			} else if (Main.nextControllerType == 11) {
				Main.m_curController = new ControllerShapes();
			} else if (Main.nextControllerType == 12) {
				Main.m_curController = new ControllerCar();
			} else if (Main.nextControllerType == 13) {
				Main.m_curController = new ControllerJumpbot();
			} else if (Main.nextControllerType == 14) {
				Main.m_curController = new ControllerDumpbot();
			} else if (Main.nextControllerType == 15) {
				Main.m_curController = new ControllerCatapult();
			} else if (Main.nextControllerType == 16) {
				Main.m_curController = new ControllerHomeMovies();
			} else if (Main.nextControllerType == 17) {
				Main.m_curController = new ControllerRubeGoldberg();
			} else if (Main.nextControllerType == 18) {
				Main.m_curController = new ControllerNewFeatures();
			} else if (Main.nextControllerType == 19) {
				Main.m_curController = new ControllerChallengeEditor();
			} else if (Main.nextControllerType == 1) {
				Main.m_curController = new ControllerChallenge();
			} else if (Main.nextControllerType == 2) {
				Main.m_curController = new ControllerMonkeyBars();
			} else if (Main.nextControllerType == 3) {
				Main.m_curController = new ControllerClimb();
			} else if (Main.nextControllerType == 4) {
				Main.m_curController = new ControllerRace();
			} else if (Main.nextControllerType == 5) {
				Main.m_curController = new ControllerSpaceship();
			} else {
				Main.m_curController = new ControllerSandbox();
			}
			Main.theRoot.addChild(Main.m_curController);

			Main.changeControllers = false;
		}

		// update current test
		Main.m_curController.Update();

		// Update input (last)
		Input.update();

		//trace(getTimer() + "\n");

		// update counter and limit framerate
		if (Main.DEBUG_VERSION) Main.m_fpsCounter.update();
		//FRateLimiter.limitFrame(30);
	}

	public static ShowMouse():void {
		// Main.mouseHourglass.visible = false;
		// Main.mouseCursor.visible = true;
	}

	public static ShowHourglass():void {
		// Main.mouseCursor.visible = false;
		// Main.mouseHourglass.visible = true;
	}
}
