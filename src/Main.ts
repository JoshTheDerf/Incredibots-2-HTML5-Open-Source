// permanent mochi ID for version 0.02: 1913f89f65e17063

import { Application, Container } from "pixi.js";
import type { Controller } from "./Game/Controller"
import { ControllerGameGlobals } from "./Game/Globals/ControllerGameGlobals"
import { Resource } from "./Game/Graphics/Resource"
import { ByteArray } from "./General/ByteArray"
import { FpsCounter } from "./General/FpsCounter"
import { Input } from "./General/Input"
import { LSOManager } from "./General/LSOManager"

export class Main {

	//======================
	// Member data
	//======================
	public static m_fpsCounter:FpsCounter = new FpsCounter();
	public static m_curController:Controller;
	// Controller factory hook, wired up by src/index.ts to createController().
	// Kept out of Main's import graph to avoid module-load-order (TDZ) cycles.
	public static instantiate: (type: number, main: Main) => Controller;
	public static changeControllers:boolean = false;
	public static nextControllerType:number = -1;
	public static firstFrame:boolean = true;
	public static frameCounter:number = 0;
	public static inIFrame:boolean = false;

	public static renderer: Application;
	public static theRoot:Container;

	public static mouseCursor:BitmapAsset;
	public static mouseHourglass:BitmapAsset;

	public static loadRobotMode:boolean = false;
	public static loadReplayMode:boolean = false;
	public static loadChallengeMode:boolean = false;
	public static premiumMode:boolean = false;
	public static enableSound:boolean = true;

	public static VERSION_STRING:string = "2.23 CE";
	public static DEBUG_VERSION:boolean = true;
	public static ENABLE_SITE_LOCK:number = 643 - (Main.DEBUG_VERSION ? 2 : 1);
	public static _mochiads_game_id:string = "50feb50977299858";

	public static lastAdTime:number = 0;

	public static GLOBAL_FONT:string = "Arial";

	public preloadedBots = {
		cRace: null,
		cSpaceship: null
	}

	public static BrowserRedirect(url:string|null = null, newWindow:boolean = false, parent:boolean = false):void {
		const target = url || "http://www.incredibots.com/"
		let mode = '_self'

		if (newWindow) mode = '_blank'
		if (parent) mode = '_top'

		window.open(target, mode)
	}

	constructor(renderer: Application) {
		Main.renderer = renderer
		Main.theRoot = Main.renderer.stage
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

		LSOManager.Init();
		this.Init();

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

		Resource.cSpaceship.arrayBuffer()
		.then((b: ArrayBuffer) => new ByteArray(b))
		.then((b: ByteArray) => (this.preloadedBots.cSpaceship = b))

		Resource.cRace.arrayBuffer()
		.then((b: ArrayBuffer) => new ByteArray(b))
		.then((b: ByteArray) => (this.preloadedBots.cRace = b))
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
				Main.m_curController = Main.instantiate(-5, this);
				Main.m_curController.LoadReplayNow(replayID);
				ControllerGameGlobals.potentialReplayID = replayID;
				ControllerGameGlobals.potentialReplayPublic = true;
				ControllerGameGlobals.replayDirectlyLinked = true;
				Main.theRoot.addChild(Main.m_curController);
				Main.nextControllerType = 0;
			} else if (Main.loadRobotMode && !Main.premiumMode) {
				Main.m_curController = Main.instantiate(-5, this);
				Main.m_curController.LoadRobotNow(robotID);
				ControllerGameGlobals.potentialRobotID = robotID;
				ControllerGameGlobals.potentialRobotPublic = true;
				Main.theRoot.addChild(Main.m_curController);
				Main.nextControllerType = 0;
			} else if (Main.loadChallengeMode && !Main.premiumMode) {
				Main.m_curController = Main.instantiate(-5, this);
				Main.m_curController.LoadChallengeNow(challengeID);
				ControllerGameGlobals.potentialChallengeID = challengeID;
				ControllerGameGlobals.potentialChallengePublic = true;
				Main.theRoot.addChild(Main.m_curController);
				Main.nextControllerType = 0;
			} else {
				Main.m_curController = Main.instantiate(-4, this);
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

		// Reset
		if (Main.changeControllers) {
			Main.theRoot.removeChild(Main.m_curController);
			Main.m_curController = Main.instantiate(Main.nextControllerType, this);
			Main.theRoot.addChild(Main.m_curController);

			Main.changeControllers = false;
		}

		// update current test
		Main.m_curController.Update();

		// Update input (last)
		Input.update();
	}
}
