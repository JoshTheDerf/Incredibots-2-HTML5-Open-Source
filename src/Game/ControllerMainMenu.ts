import { Container, DisplayObject, Graphics, Matrix, Sprite, Text, TextStyle } from "pixi.js";
import { b2World, b2AABB, b2Vec2 } from "@box2d/core";
import { Database } from "../General/Database";
import { LSOManager } from "../General/LSOManager";
import { Util } from "../General/Util";
import { AdvancedSandboxWindow } from "../Gui/AdvancedSandboxWindow";
import { GuiButton } from "../Gui/GuiButton";
import { ImportWindow } from "../Gui/ImportWindow";
import { Main } from "../Main";
import { Cannon } from "../Parts/Cannon";
import { JointPart } from "../Parts/JointPart";
import { ShapePart } from "../Parts/ShapePart";
import { Thrusters } from "../Parts/Thrusters";
import { Challenge } from "./Challenge";
import { ContactFilter } from "./ContactFilter";
import { Controller } from "./Controller";
import { ControllerChallenge } from "./ControllerChallenge";
import { ControllerSandbox } from "./ControllerSandbox";
import { Draw } from "./Draw";
import { ControllerGameGlobals } from "./Globals/ControllerGameGlobals";
import { Gradient } from "./Graphics/Gradient";
import { Resource } from "./Graphics/Resource";
import { Sky } from "./Graphics/Sky";
import { Replay } from "./Replay";
import { Robot } from "./Robot";
import { SandboxSettings } from "./SandboxSettings";
import { ByteArray } from "../General/ByteArray";

export class ControllerMainMenu extends Controller
{
	private static LOGO_STRETCH_WIDTHS:Array<number> = [101.2, 101, 100.7, 100.5, 100.2, 100, 99.7, 99.4, 99.1, 98.9, 98.6, 98.4, 98.2, 98, 97.8, 97.7, 97.5, 97.5, 97.4, 97.4, 97.4, 97.5, 97.6, 97.8, 98.1, 98.3, 98.6, 99, 99.3, 99.6, 100, 100.3, 100.7, 101, 101.3, 101.6, 101.8, 102, 102.1, 102.2, 102.3, 102.2, 102.2, 102.1, 102, 101.8, 101.6, 101.4];
	private static LOGO_STRETCH_HEIGHTS:Array<number> = [97.7, 97.6, 97.7, 97.7, 97.7, 97.8, 97.9, 98, 98.2, 98.4, 98.7, 99, 99.3, 99.6, 100, 100.3, 100.6, 100.9, 101.2, 101.5, 101.7, 101.8, 101.9, 102, 102, 101.9, 101.8, 101.7, 101.5, 101.3, 101.1, 100.8, 100.6, 100.3, 100.1, 99.8, 99.5, 99.3, 99, 98.8, 98.5, 98.4, 98.2, 98, 97.9, 97.8, 97.8, 97.7];

	public static ZOOM_FOCUS_X:number = 440;
	public static ZOOM_FOCUS_Y:number = 280;

	private static firstLoad:boolean = true;

	private replay:Replay;
	private frameCounter:number = 0;
	private cameraPart:ShapePart;
	private hasPanned:boolean;
	private m_physScale:number = 30;
	private replaySplineXs:Array<any>;
	private replaySplineYs:Array<any>;
	private replaySplineAngles:Array<any>;

	private sSky:Sky;
	private sGround:Graphics;
	private sCanvas:Container;
	private sLogo:BitmapAsset;
	private playButton:GuiButton;
	private gamesButton:GuiButton = null;
	private subscribeButton:GuiButton = null;
	private logInButton:GuiButton;
	private logOutButton:GuiButton;
	private enableSoundButton:GuiButton;
	private disableSoundButton:GuiButton;
	private fader:Graphics;
	public fader2:Graphics;
	private logoFrame:number = 0;
	private versionText:Text;
	private userText:Text;

	private levelSelectGui:Sprite;
	private startHereText:BitmapAsset = null;
	private startHereArrow:BitmapAsset = null;

	private windowL:DisplayObject;
	private windowR:DisplayObject;
	private windowC:Sprite;
	private forumPostText:TextField;
	private forumPostButton:GuiButton;

	private arrowX:number;
	private arrowVel:number = 0;
	private arrowAccel:number = 0;
	private logoShrinking:boolean = false;
	private saveLoadOpen:boolean;

	private m_progressDialog:DialogWindow = null;
	private m_linkDialog:LinkWindow = null;
	private m_exportDialog:ExportWindow = null;
	private m_importDialog:ImportWindow = null;
	public m_loadWindow:SaveLoadWindow = null;
	public m_loginWindow:LoginWindow = null;
	public m_newUserWindow:NewUserWindow = null;
	private m_goldLoginWindow:GoldLoginWindow = null;
	private m_sandboxWindow:AdvancedSandboxWindow = null;
	private m_tutorialWindow:TutorialSelectWindow = null;
	private m_challengeWindow:ChooseChallengeWindow = null;

	public backToSaveWindow:boolean = false;

	public static introSong:Sound = Resource.cIntro;
	public static channel:SoundChannel;

	private draw:Draw = new Draw();
	private world:b2World;
	private allParts:Array<any> = new Array();
	public static cannonballs:Array<any> = new Array();

	constructor(straightToLevelSelect:boolean = false)
	{
		super()
		this.sSky = new Sky(this, 1);
		ControllerMainMenu.cannonballs = new Array();

		if (Main.enableSound) {
			ControllerGameGlobals.introVolume = (straightToLevelSelect ? 0.4 : 0.5);
			ControllerMainMenu.introSong.volume = ControllerGameGlobals.introVolume
			ControllerMainMenu.introSong.play();
		}

		this.LoadReplay()

		this.sGround = new Graphics();
		this.DrawGroundOutlineCircle(0, 0, 150);
		this.DrawGroundOutlineCircle(4000, 0, 150);
		const gradient1 = Gradient.getLinearGradientTexture([Util.HexColourString(177, 102, 46), Util.HexColourString(171, 59, 34)])
		const gradient2 = Gradient.getLinearGradientTexture([Util.HexColourString(249, 172, 101), Util.HexColourString(240, 70, 45)])
		this.sGround.beginTextureFill({ texture: gradient1});
		this.sGround.drawRect(144, -6, 4012, 312);
		this.sGround.endFill();
		this.sGround.beginTextureFill({ texture: gradient2});
		this.sGround.drawRect(150, 0, 4000, 300);
		this.sGround.endFill();

		this.addChild(this.sGround);
		this.DrawGroundCircle(0, 0, 150);
		this.DrawGroundCircle(4000, 0, 150);
		this.DrawRock(0, 169, 200, 40);
		this.DrawRock(0, 318, 44, 48);
		this.DrawRock(2, 795, 195, 28);
		this.DrawRock(0, 1110, 120, 40);
		this.DrawRock(2, 1440, 121, 69);
		this.DrawRock(0, 1762, 68, 57);
		this.DrawRock(1, 2082, 11, 68);
		this.DrawRock(0, 2395, 192, 51);
		this.DrawRock(0, 2727, 152, 39);
		this.DrawRock(0, 3032, 74, 61);
		this.DrawRock(1, 3196, 18, 46);
		this.DrawRock(0, 3527, 197, 28);
		this.DrawRock(0, 3842, 168, 18);
		this.addChild(this.sGround);
		this.sGround.width = this.World2ScreenX(85) - this.World2ScreenX(0);
		this.sGround.scale.y = this.sGround.scale.x;

		this.sCanvas = new Graphics();
		this.draw.m_sprite = this.sCanvas;
		this.addChild(this.sCanvas);

		var style:TextStyle = new TextStyle({
			fontFamily: Main.GLOBAL_FONT,
			fontSize: 11,
			align: 'right',
			fill: '#ffffff'
		});
		this.versionText = new Text("Version " + Main.VERSION_STRING);
		this.versionText.x = 700;
		this.versionText.y = 580;
		this.versionText.style = style;
		this.addChild(this.versionText);

		this.fader = new Graphics();
		this.fader.beginFill(0, 0.2);
		this.fader.lineStyle(0, 0, 0.2);
		this.fader.moveTo(0, 0);
		this.fader.lineTo(800, 0);
		this.fader.lineTo(800, 600);
		this.fader.lineTo(0, 600);
		this.fader.lineTo(0, 0);
		this.fader.endFill();
		this.fader.visible = (straightToLevelSelect || Main.premiumMode);
		this.addChild(this.fader);

		this.sLogo = new Sprite(Resource.cMainMenuLogo);
		this.sLogo.smoothing = true;
		if (straightToLevelSelect) {
			this.sLogo.width = this.sLogo.measuredWidth * 0.6;
			this.sLogo.height = this.sLogo.measuredHeight * 0.6;
			this.sLogo.x = 215;
			this.sLogo.y = 10;
		}
		this.addChild(this.sLogo);

		if (!straightToLevelSelect) {
			style = new TextStyle();
			style.fontSize = 24;
			this.playButton = new GuiButton("Play!", 320, 184, 160, 70, this.playButtonPressed.bind(this), GuiButton.PLAY, style);
			this.addChild(this.playButton);
		}

		if (Main.premiumMode && ControllerMainMenu.firstLoad) {
			this.m_goldLoginWindow = new GoldLoginWindow(this);
			this.addChild(this.m_goldLoginWindow);
			this.playButton.visible = false;
		}
		ControllerMainMenu.firstLoad = false;

		this.levelSelectGui = new Sprite();
		this.levelSelectGui.visible = straightToLevelSelect;
		var img:Sprite = new Sprite(Resource.cLevelSelectBox1L);
		img.x = 210;
		img.y = 105;
		this.levelSelectGui.addChild(img);
		img = new Sprite(Resource.cLevelSelectBox1R);
		img.x = 576;
		img.y = 105;
		this.levelSelectGui.addChild(img);

		var graphics = new Graphics();
		this.levelSelectGui.addChild(graphics)
		let m:Matrix = new Matrix();
		m.translate(0, 105);
		graphics.beginTextureFill({ texture: Resource.cLevelSelectBox1M, matrix: m });
		graphics.drawRect(234, 105, 342, 135);
		img = new Sprite(Resource.cLevelSelectBox2L);
		img.x = 315;
		img.y = 260;
		this.levelSelectGui.addChild(img);
		img = new Sprite(Resource.cLevelSelectBox2R);
		img.x = 472;
		img.y = 260;
		this.levelSelectGui.addChild(img);
		m = new Matrix();
		m.translate(0, 260);
		graphics.beginTextureFill({ texture: Resource.cLevelSelectBox2M, matrix: m});
		graphics.drawRect(339, 260, 133, 194);
		img = new Sprite(Resource.cLevelSelectOtherBoxL);
		img.x = 617;
		img.y = 449;
		this.levelSelectGui.addChild(img);
		img = new Sprite(Resource.cLevelSelectOtherBoxR);
		img.x = 763;
		img.y = 449;
		this.levelSelectGui.addChild(img);
		m = new Matrix();
		m.translate(0, 449);
		graphics.beginTextureFill({ texture: Resource.cLevelSelectOtherBoxM, matrix: m});
		graphics.drawRect(641, 449, 122, 144);

		style = new TextStyle();
		style.fontSize = 17;
		var button:GuiButton = new GuiButton("Tutorial Levels", 210, 109, 200, 65, this.tutorialButton.bind(this), GuiButton.PINK, style);
		button.disabled = true
		this.levelSelectGui.addChild(button);
		button = new GuiButton("Sandbox Mode", 390, 109, 200, 65, this.sandboxButton.bind(this), GuiButton.PINK, style);
		this.levelSelectGui.addChild(button);
		button = new GuiButton("Challenge Editor", 210, 158, 200, 65, this.editorButton.bind(this), GuiButton.PINK, style);
		button.disabled = true
		this.levelSelectGui.addChild(button);
		button = new GuiButton(" Advanced Sandbox ", 390, 158, 200, 65, this.advancedButton.bind(this), GuiButton.PINK, style);
		this.levelSelectGui.addChild(button);
		this.logInButton = new GuiButton("Log In", 675, -5, 120, 60, this.loginButton.bind(this), GuiButton.BLUE, style);
		this.logInButton.disabled = true
		this.logInButton.visible = (ControllerGameGlobals.userName == "_Public");
		this.levelSelectGui.addChild(this.logInButton);
		this.logOutButton = new GuiButton("Log Out", 675, -5, 120, 60, this.logout.bind(this), GuiButton.BLUE, style);
		this.logOutButton.disabled = true
		this.logOutButton.visible = (ControllerGameGlobals.userName != "_Public");
		this.levelSelectGui.addChild(this.logOutButton);
		this.enableSoundButton = new GuiButton("Enable Sound", 5, 535, 150, 60, this.enableSoundButtonPressed.bind(this), GuiButton.BLUE, style);
		this.enableSoundButton.visible = !Main.enableSound;
		this.disableSoundButton = new GuiButton("Disable Sound", 5, 535, 150, 60, this.disableSoundButtonPressed.bind(this), GuiButton.BLUE, style);
		this.disableSoundButton.visible = Main.enableSound;
		if (straightToLevelSelect) {
			this.levelSelectGui.addChild(this.enableSoundButton);
			this.levelSelectGui.addChild(this.disableSoundButton);
		} else {
			this.addChild(this.enableSoundButton);
			this.addChild(this.disableSoundButton);
		}

		button = new GuiButton("Load Challenge", 315, 263, 171, 59, this.loadChallengeButton, GuiButton.BLUE, style);
		button.disabled = true
		this.levelSelectGui.addChild(button);
		button = new GuiButton("Load Replay", 315, 303, 171, 59, this.loadReplayButton, GuiButton.BLUE, style);
		button.disabled = true
		this.levelSelectGui.addChild(button);
		button = new GuiButton("Load Bot", 315, 343, 171, 59, this.loadRobotButton, GuiButton.BLUE, style);
		button.disabled = true
		this.levelSelectGui.addChild(button);
		button = new GuiButton("High Scores", 315, 383, 171, 59, this.highScoresButton, GuiButton.RED, style);
		button.disabled = true
		this.levelSelectGui.addChild(button);

		button = new GuiButton("Import Challenge", 145, 263, 171, 59, this.importChallengeButton.bind(this), GuiButton.ORANGE, style);
		button.disabled = true
		this.levelSelectGui.addChild(button);
		button = new GuiButton("Import Replay", 145, 303, 171, 59, this.importReplayButton.bind(this), GuiButton.ORANGE, style);
		button.disabled = true
		this.levelSelectGui.addChild(button);
		button = new GuiButton("Import Bot", 145, 343, 171, 59, (event: any) => this.importRobotButton(event), GuiButton.ORANGE, style);
		this.levelSelectGui.addChild(button);

		button = new GuiButton("Instructions", 620, 454, 153, 50, this.instructionsButton, GuiButton.BLUE, style);
		button.disabled = true
		this.levelSelectGui.addChild(button);
		button = new GuiButton("Credits", 620, 489, 153, 50, this.creditsButton, GuiButton.BLUE, style);
		button.disabled = true
		this.levelSelectGui.addChild(button);
		button = new GuiButton("Suggestions?", 620, 524, 153, 50, this.suggestionsButton, GuiButton.BLUE, style);
		button.disabled = true
		this.levelSelectGui.addChild(button);

		style = new TextStyle();
		style.fontFamily = Main.GLOBAL_FONT;
		style.fontSize = 12;
		style.fill = '#FFFFFF';
		this.userText = new Text("Welcome, " + (ControllerGameGlobals.userName == "_Public" ? "Guest" : ControllerGameGlobals.userName));
		this.userText.x = 10;
		this.userText.y = 20;
		this.userText.style = style;
		this.levelSelectGui.addChild(this.userText);

		if (!LSOManager.IsAnythingDone()) {
			this.startHereArrow = new Sprite(Resource.cLevelSelectStartHereArrow);
			this.startHereArrow.smoothing = true;
			this.startHereArrow.x = 130;
			this.startHereArrow.y = 117;
			this.levelSelectGui.addChild(this.startHereArrow);
			this.arrowX = 130;
			this.startHereText = new Sprite(Resource.cLevelSelectStartHereText);
			this.startHereText.smoothing = true;
			this.startHereText.x = 75;
			this.startHereText.y = 145;
			this.levelSelectGui.addChild(this.startHereText);
		}
		this.addChild(this.levelSelectGui);

		this.fader2 = new Graphics();
		this.fader2.beginFill(0, 0.2);
		this.fader2.lineStyle(0, 0, 0.2);
		this.fader2.moveTo(0, 0);
		this.fader2.lineTo(800, 0);
		this.fader2.lineTo(800, 600);
		this.fader2.lineTo(0, 600);
		this.fader2.lineTo(0, 0);
		this.fader2.endFill();
		this.fader2.visible = false;
		this.addChild(this.fader2);

		this.draw.m_drawScale = 23.73;
		var aabb:b2AABB = new b2AABB();
		aabb.lowerBound.Set(-100.0, -100.0);
		aabb.upperBound.Set(100.0, 100.0);
		this.world = b2World.Create(new b2Vec2(0.0, 15.0));
		var filter:ContactFilter = new ContactFilter();
		this.world.SetContactFilter(filter);

		for (var i:number = 0; i < this.allParts.length; i++) {
			if (this.allParts[i] instanceof ShapePart && this.allParts[i].isCameraFocus) this.cameraPart = this.allParts[i];
		}

		for (i = 0; i < this.allParts.length; i++) {
			this.allParts[i].checkedCollisionGroup = false;
		}
		for (i = 0; i < this.allParts.length; i++) {
			if (this.allParts[i] instanceof ShapePart) this.allParts[i].SetCollisionGroup(-(i + 1));
		}

		for (i = this.allParts.length; i >= 0; i--) {
			if (this.allParts[i] instanceof ShapePart) this.allParts[i].Init(this.world);
		}
		for (i = 0; i < this.allParts.length; i++) {
			if (this.allParts[i] instanceof JointPart || this.allParts[i] instanceof Thrusters) this.allParts[i].Init(this.world);
		}

		ControllerGameGlobals.curRobotID = "";
		ControllerGameGlobals.curReplayID = "";
		ControllerGameGlobals.curChallengeID = "";

		this.Update();
	}

	private async LoadReplay() {
		const replayData = await Resource.cReplay.arrayBuffer()
		var b:ByteArray = new ByteArray(new Uint8Array(replayData));
		// this.replay = await Database.ExtractReplayFromByteArray(b);
		// this.replay.cont = this;
		const robotData = await Resource.cRobot.arrayBuffer()
		b = new ByteArray(new Uint8Array(robotData));
		var robot:Robot = Database.ExtractRobotFromByteArray(b);
		this.allParts = robot.allParts;
		this.replaySplineXs = this.ComputeReplaySplines(0);
		this.replaySplineYs = this.ComputeReplaySplines(1);
		this.replaySplineAngles = this.ComputeReplaySplines(2);
	}

	private DrawGroundOutlineCircle(xPos:number, yPos:number, radius:number):void {
		const texture = Gradient.getLinearGradientTexture([Util.HexColourString(177, 102, 46), Util.HexColourString(171, 59, 34)])
		this.sGround.beginTextureFill({ texture });
		this.sGround.drawCircle(xPos + radius, yPos + radius, radius + 6);
		this.sGround.endFill();
	}

	private DrawGroundCircle(xPos:number, yPos:number, radius:number):void {
		const texture = Gradient.getLinearGradientTexture([Util.HexColourString(249, 172, 101), Util.HexColourString(240, 70, 45)])
		this.sGround.beginTextureFill({ texture });
		this.sGround.drawCircle(xPos + radius, yPos + radius, radius);
		this.sGround.endFill();
	}

	private DrawRock(type:number, xPos:number, yPos:number, radius:number, outlineThickness:number = 6):void {
		this.sGround.lineStyle(outlineThickness, 0xBA643D);
		const texture = Gradient.getLinearGradientTexture(
			type == 0 ? [Util.HexColourString(194, 130, 87), Util.HexColourString(172,	114,	77)]
			: (type == 1 ? [Util.HexColourString(197,	115,	66), Util.HexColourString(175,	103,	58)]
			: [Util.HexColourString(198,	121,	69), Util.HexColourString(179,	105,	57)]))
		this.sGround.beginTextureFill({ texture });
		this.sGround.drawCircle(xPos + radius, yPos + radius, radius);
		this.sGround.endFill();
	}

	private loadRobotButton(e:MouseEvent):void {
		Database.GetRobotData(ControllerGameGlobals.userName, ControllerGameGlobals.password, Database.curShared, Database.curSortType, Database.curSortPeriod, (Database.curShared ? Database.curRobotPage : 1), "", this.finishGettingLoadRobotData);
		this.ShowDialog("Getting robots...");
		Main.ShowHourglass();
		this.fader2.visible = true;
	}

	private loadReplayButton(e:MouseEvent):void {
		if (Database.curSortPeriod == Database.SORT_PERIOD_PROP) Database.curSortPeriod = Database.SORT_PERIOD_ALLTIME;
		Database.GetReplayData(ControllerGameGlobals.userName, ControllerGameGlobals.password, Database.curShared, Database.curSortType, Database.curSortPeriod, (Database.curShared ? Database.curReplayPage : 1), "", this.finishGettingLoadReplayData);
		this.ShowDialog("Getting replays...");
		Main.ShowHourglass();
		this.fader2.visible = true;
	}

	private loadChallengeButton(e:MouseEvent):void {
		if (Database.curSortPeriod == Database.SORT_PERIOD_PROP) Database.curSortPeriod = Database.SORT_PERIOD_ALLTIME;
		Database.GetChallengeData(ControllerGameGlobals.userName, ControllerGameGlobals.password, Database.curShared, Database.curSortType, Database.curSortPeriod, (Database.curShared ? Database.curChallengePage : 1), "", this.finishGettingLoadChallengeData);
		this.ShowDialog("Getting challenges...");
		Main.ShowHourglass();
		this.fader2.visible = true;
	}

	private importRobotButton(e:MouseEvent):void {
		this.ShowImportWindow(ImportWindow.TYPE_ROBOT);
	}

	private importReplayButton(e:MouseEvent):void {
		this.ShowImportWindow(ImportWindow.TYPE_REPLAY);
	}

	private importChallengeButton(e:MouseEvent):void {
		this.ShowImportWindow(ImportWindow.TYPE_CHALLENGE);
	}

	private highScoresButton(e:MouseEvent):void {
		Database.GetChallengeData(ControllerGameGlobals.userName, ControllerGameGlobals.password, true, Database.curSortType, Database.curSortPeriod, Database.curChallengePage, "", this.finishGettingLoadChallengeForScoreData);
		this.ShowDialog("Getting challenges...");
		Main.ShowHourglass();
		this.fader2.visible = true;
	}

	public finishGettingLoadRobotData(e:Event):void {
		if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_GET_ROBOT_DATA) return;
		if (Database.FinishGettingRobotData(e)) {
			this.m_progressDialog.visible = false;
			if (this.m_loadWindow) this.removeChild(this.m_loadWindow);
			this.m_loadWindow = new SaveLoadWindow(this, SaveLoadWindow.LOAD_ROBOT_TYPE);
			this.addChild(this.m_loadWindow);
		}
	}

	public finishGettingLoadReplayData(e:Event):void {
		if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_GET_REPLAY_DATA) return;
		if (Database.FinishGettingReplayData(e)) {
			this.m_progressDialog.visible = false;
			if (this.m_loadWindow) this.removeChild(this.m_loadWindow);
			this.m_loadWindow = new SaveLoadWindow(this, SaveLoadWindow.LOAD_REPLAY_TYPE);
			this.addChild(this.m_loadWindow);
		}
	}

	public finishGettingLoadChallengeData(e:Event):void {
		if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_GET_CHALLENGE_DATA) return;
		if (Database.FinishGettingChallengeData(e)) {
			this.m_progressDialog.visible = false;
			if (this.m_loadWindow) this.removeChild(this.m_loadWindow);
			this.m_loadWindow = new SaveLoadWindow(this, SaveLoadWindow.LOAD_CHALLENGE_TYPE);
			this.addChild(this.m_loadWindow);
		}
	}

	public finishGettingLoadChallengeForScoreData(e:Event):void {
		if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_GET_CHALLENGE_DATA) return;
		if (Database.FinishGettingChallengeData(e)) {
			this.m_progressDialog.visible = false;
			if (this.m_challengeWindow) this.removeChild(this.m_challengeWindow);
			this.m_challengeWindow = new ChooseChallengeWindow(this);
			this.addChild(this.m_challengeWindow);
		}
	}

	public finishGettingScoreData(e:Event):void {
		if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_GET_SCORE_DATA) return;
		if (Database.FinishGettingScoreData(e)) {
			this.m_progressDialog.visible = false;
			if (this.m_loadWindow) this.removeChild(this.m_loadWindow);
			this.m_loadWindow = new SaveLoadWindow(this, SaveLoadWindow.HIGH_SCORE_TYPE);
			this.addChild(this.m_loadWindow);
		}
	}

	public processLoadedRobot(robot:Robot):void {
		var loadedParts:Array<any> = robot.allParts;
		var hasThrusters:boolean = false;
		for (var i:number = 0; i < loadedParts.length; i++) {
			if (loadedParts[i] instanceof Thrusters || loadedParts[i] instanceof Cannon) hasThrusters = true;
		}
		ControllerGameGlobals.loadedParts = loadedParts;
		ControllerGameGlobals.curRobotID = ControllerGameGlobals.potentialRobotID;
		ControllerGameGlobals.ratedCurRobot = false;
		ControllerGameGlobals.curRobotEditable = (ControllerGameGlobals.potentialRobotEditable/* && (!hasThrusters || Main.premiumMode)*/);
		ControllerGameGlobals.curRobotPublic = ControllerGameGlobals.potentialRobotPublic;
		ControllerGameGlobals.curRobotFeatured = ControllerGameGlobals.potentialRobotFeatured;
		ControllerGameGlobals.curReplayID = "";
		ControllerGameGlobals.initX = robot.cameraX;
		ControllerGameGlobals.initY = robot.cameraY;
		ControllerGameGlobals.initZoom = robot.zoomLevel;
		Main.changeControllers = true;
		if (robot.challenge) {
			Main.nextControllerType = 1;
			ControllerChallenge.challenge = robot.challenge;
			ControllerChallenge.playChallengeMode = true;
			ControllerChallenge.playOnlyMode = true;
			ControllerSandbox.settings = robot.challenge.settings;
			ControllerGameGlobals.curChallengeID = ControllerGameGlobals.potentialChallengeID;
			ControllerGameGlobals.ratedCurChallenge = false;
			ControllerGameGlobals.curChallengePublic = false;
			ControllerGameGlobals.curChallengeFeatured = false;
			ControllerGameGlobals.justLoadedRobotWithChallenge = true;
		} else {
			Main.nextControllerType = 0;
			ControllerSandbox.settings = robot.settings;
			ControllerGameGlobals.curChallengeID = "";
		}
	}

	public finishLoading(e:Event):void {
		if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_LOAD_ROBOT) return;
		var robot:Robot = Database.FinishLoadingRobot(e);
		if (robot) {
			var loadedParts:Array<any> = robot.allParts;
			var hasThrusters:boolean = false;
			for (var i:number = 0; i < loadedParts.length; i++) {
				if (loadedParts[i] instanceof Thrusters || loadedParts[i] instanceof Cannon) hasThrusters = true;
			}
			ControllerGameGlobals.loadedParts = loadedParts;
			ControllerGameGlobals.curRobotID = ControllerGameGlobals.potentialRobotID;
			ControllerGameGlobals.ratedCurRobot = false;
			ControllerGameGlobals.curRobotEditable = (ControllerGameGlobals.potentialRobotEditable/* && (!hasThrusters || Main.premiumMode)*/);
			ControllerGameGlobals.curRobotPublic = ControllerGameGlobals.potentialRobotPublic;
			ControllerGameGlobals.curRobotFeatured = ControllerGameGlobals.potentialRobotFeatured;
			ControllerGameGlobals.curReplayID = "";
			ControllerGameGlobals.initX = robot.cameraX;
			ControllerGameGlobals.initY = robot.cameraY;
			ControllerGameGlobals.initZoom = robot.zoomLevel;
			Main.changeControllers = true;
			if (robot.challenge) {
				Main.nextControllerType = 1;
				ControllerChallenge.challenge = robot.challenge;
				ControllerChallenge.playChallengeMode = true;
				ControllerChallenge.playOnlyMode = true;
				ControllerSandbox.settings = robot.challenge.settings;
				ControllerGameGlobals.curChallengeID = ControllerGameGlobals.potentialChallengeID;
				ControllerGameGlobals.ratedCurChallenge = false;
				ControllerGameGlobals.curChallengePublic = false;
				ControllerGameGlobals.curChallengeFeatured = false;
				ControllerGameGlobals.justLoadedRobotWithChallenge = true;
			} else {
				Main.nextControllerType = 0;
				ControllerSandbox.settings = robot.settings;
				ControllerGameGlobals.curChallengeID = "";
			}
		}
	}

	public finishLoadingReplay(e:Event):void {
		if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_LOAD_REPLAY) return;
		var replayAndRobot:Array<any> = Database.FinishLoadingReplay(e);
		if (replayAndRobot) {
			ControllerGameGlobals.replay = replayAndRobot[0];
			if (ControllerGameGlobals.replay.version != Database.VERSION_STRING_FOR_REPLAYS) {
				this.ShowConfirmDialog("This replay was saved using an older version of IncrediBots.  Redirect there now?", 6);
				Main.ShowMouse();
			} else {
				var robot:Robot = replayAndRobot[1];
				ControllerGameGlobals.replayParts = robot.allParts;
				ControllerSandbox.settings = robot.settings;
				ControllerGameGlobals.playingReplay = true;
				Main.changeControllers = true;
				Main.nextControllerType = 0;
				ControllerGameGlobals.curRobotID = ControllerGameGlobals.potentialRobotID;
				ControllerGameGlobals.ratedCurRobot = false;
				ControllerGameGlobals.curReplayID = ControllerGameGlobals.potentialReplayID;
				ControllerGameGlobals.ratedCurReplay = false;
				ControllerGameGlobals.curReplayPublic = ControllerGameGlobals.potentialReplayPublic;
				ControllerGameGlobals.curReplayFeatured = ControllerGameGlobals.potentialReplayFeatured;
				ControllerGameGlobals.curChallengeID = "";
				ControllerGameGlobals.curChallengePublic = false;
				ControllerGameGlobals.curChallengeFeatured = false;
			}
		}
	}

	public processLoadedReplay(replayAndRobot:Array<any>):void {
		ControllerGameGlobals.replay = replayAndRobot[0];
		if (ControllerGameGlobals.replay.version != Database.VERSION_STRING_FOR_REPLAYS) {
			this.ShowConfirmDialog("This replay was saved using an older version of IncrediBots.  Redirect there now?", 6);
			Main.ShowMouse();
		} else {
			var robot:Robot = replayAndRobot[1];
			ControllerGameGlobals.replayParts = robot.allParts;
			ControllerSandbox.settings = robot.settings;
			ControllerGameGlobals.playingReplay = true;
			Main.changeControllers = true;
			Main.nextControllerType = 0;
			ControllerGameGlobals.curRobotID = ControllerGameGlobals.potentialRobotID;
			ControllerGameGlobals.ratedCurRobot = false;
			ControllerGameGlobals.curReplayID = ControllerGameGlobals.potentialReplayID;
			ControllerGameGlobals.ratedCurReplay = false;
			ControllerGameGlobals.curReplayPublic = ControllerGameGlobals.potentialReplayPublic;
			ControllerGameGlobals.curReplayFeatured = ControllerGameGlobals.potentialReplayFeatured;
			ControllerGameGlobals.curChallengeID = "";
			ControllerGameGlobals.curChallengePublic = false;
			ControllerGameGlobals.curChallengeFeatured = false;
		}
	}

	public processLoadedChallenge(challenge:Challenge):void {
		Main.changeControllers = true;
		Main.nextControllerType = 1;

		ControllerChallenge.challenge = challenge;
		ControllerChallenge.playChallengeMode = !ControllerGameGlobals.potentialChallengeEditable;
		ControllerChallenge.playOnlyMode = !ControllerGameGlobals.potentialChallengeEditable;
		ControllerSandbox.settings = challenge.settings;
		ControllerGameGlobals.curChallengeID = ControllerGameGlobals.potentialChallengeID;
		ControllerGameGlobals.ratedCurChallenge = false;
		ControllerGameGlobals.curChallengePublic = ControllerGameGlobals.potentialChallengePublic;
		ControllerGameGlobals.curChallengeFeatured = ControllerGameGlobals.potentialChallengeFeatured;
		ControllerGameGlobals.curRobotID = "";
		ControllerGameGlobals.curReplayID = "";
		ControllerGameGlobals.loadedParts = challenge.allParts;
		ControllerGameGlobals.initX = challenge.cameraX;
		ControllerGameGlobals.initY = challenge.cameraY;
		ControllerGameGlobals.initZoom = challenge.zoomLevel;
	}

	public finishLoadingChallenge(e:Event):void {
		if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_LOAD_CHALLENGE) return;
		var challenge:Challenge = Database.FinishLoadingChallenge(e);
		if (challenge) {
			Main.changeControllers = true;
			Main.nextControllerType = 1;

			ControllerChallenge.challenge = challenge;
			ControllerChallenge.playChallengeMode = !ControllerGameGlobals.potentialChallengeEditable;
			ControllerChallenge.playOnlyMode = !ControllerGameGlobals.potentialChallengeEditable;
			ControllerSandbox.settings = challenge.settings;
			ControllerGameGlobals.curChallengeID = ControllerGameGlobals.potentialChallengeID;
			ControllerGameGlobals.ratedCurChallenge = false;
			ControllerGameGlobals.curChallengePublic = ControllerGameGlobals.potentialChallengePublic;
			ControllerGameGlobals.curChallengeFeatured = ControllerGameGlobals.potentialChallengeFeatured;
			ControllerGameGlobals.curRobotID = "";
			ControllerGameGlobals.curReplayID = "";
			ControllerGameGlobals.loadedParts = challenge.allParts;
			ControllerGameGlobals.initX = challenge.cameraX;
			ControllerGameGlobals.initY = challenge.cameraY;
			ControllerGameGlobals.initZoom = challenge.zoomLevel;
		}
	}

	public finishDeleting(e:Event):void {
		if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_DELETE_ROBOT) return;
		var id:String = Database.FinishDeletingRobot(e);
		if (id != "") {
			this.m_progressDialog.SetMessage("Delete successful!");
			this.m_progressDialog.HideInXSeconds(1);
			this.removeChild(this.m_loadWindow);
			this.m_loadWindow = new SaveLoadWindow(this, SaveLoadWindow.LOAD_ROBOT_TYPE);
			this.addChild(this.m_loadWindow);
			this.removeChild(this.m_progressDialog);
			this.addChild(this.m_progressDialog);
		}
	}

	public finishDeletingReplay(e:Event):void {
		if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_DELETE_REPLAY) return;
		if (Database.FinishDeletingReplay(e)) {
			this.m_progressDialog.SetMessage("Delete successful!");
			this.m_progressDialog.HideInXSeconds(1);
			this.removeChild(this.m_loadWindow);
			this.m_loadWindow = new SaveLoadWindow(this, SaveLoadWindow.LOAD_REPLAY_TYPE);
			this.addChild(this.m_loadWindow);
			this.removeChild(this.m_progressDialog);
			this.addChild(this.m_progressDialog);
		}
	}

	public finishDeletingChallenge(e:Event):void {
		if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_DELETE_CHALLENGE) return;
		if (Database.FinishDeletingChallenge(e)) {
			this.m_progressDialog.SetMessage("Delete successful!");
			this.m_progressDialog.HideInXSeconds(1);
			this.removeChild(this.m_loadWindow);
			this.m_loadWindow = new SaveLoadWindow(this, SaveLoadWindow.LOAD_CHALLENGE_TYPE);
			this.addChild(this.m_loadWindow);
			this.removeChild(this.m_progressDialog);
			this.addChild(this.m_progressDialog);
		}
	}

	public enableSoundButtonPressed(e:Event):void {
		Main.enableSound = true;
		this.enableSoundButton.visible = false;
		this.disableSoundButton.visible = true;
		ControllerMainMenu.introSong.resume()
	}

	public disableSoundButtonPressed(e:Event):void {
		Main.enableSound = false;
		ControllerMainMenu.introSong.pause()
		this.enableSoundButton.visible = true;
		this.disableSoundButton.visible = false;
	}

	public loginButton(e:MouseEvent, displayMessage:boolean = false, backToSave:boolean = false, saveLoadWindowOpen:boolean = false):void {
		this.saveLoadOpen = saveLoadWindowOpen;
		if (this.m_loginWindow) this.removeChild(this.m_loginWindow);
		this.m_loginWindow = new LoginWindow(this);
		if (displayMessage) this.m_loginWindow.displayMessage();
		this.addChild(this.m_loginWindow);
		this.fader2.visible = true;
		this.backToSaveWindow = backToSave;
	}

	public finishLoggingInGold(e:Event):void {
		if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_LOGIN_GOLD) return;
		var retVal:String = Database.FinishLoggingIn(e);
		if (retVal != "") {
			this.m_progressDialog.SetMessage("Success!");
			this.m_progressDialog.HideInXSeconds(1);
			this.m_goldLoginWindow.visible = false;
			ControllerGameGlobals.userName = retVal.substring(retVal.indexOf("user: ") + 6, retVal.indexOf("password: ") - 1);
			ControllerGameGlobals.password = retVal.substring(retVal.indexOf("password: ") + 10, retVal.indexOf("session: ") - 1);
			ControllerGameGlobals.sessionID = retVal.substr(retVal.indexOf("session: ") + 9);
			this.fader.visible = false;
			this.playButton.visible = true;
			this.logInButton.visible = false;
			this.logOutButton.visible = true;
		}
		Main.ShowMouse();

		var format:TextFormat = new TextFormat();
		format.font = Main.GLOBAL_FONT;
		format.color = 0xFFFFFF;
		this.userText.text = "Welcome, " + (ControllerGameGlobals.userName == "_Public" ? "Guest" : ControllerGameGlobals.userName);
		this.userText.setTextFormat(format);
	}

	public finishLoggingIn(e:Event):void {
		if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_LOGIN) return;
		var retVal:String = Database.FinishLoggingIn(e);
		if (retVal != "") {
			this.m_progressDialog.SetMessage("Success!");
			this.m_progressDialog.HideInXSeconds(1);
			if (this.m_loginWindow) this.m_loginWindow.visible = false;
			if (retVal.indexOf("premium") == 0) Main.premiumMode = true;
			else Main.premiumMode = false;
			ControllerGameGlobals.userName = retVal.substring(retVal.indexOf("user: ") + 6, retVal.indexOf("password: ") - 1);
			ControllerGameGlobals.password = retVal.substring(retVal.indexOf("password: ") + 10, retVal.indexOf("session: ") - 1);
			ControllerGameGlobals.sessionID = retVal.substr(retVal.indexOf("session: ") + 9);
			if (this.m_loadWindow && this.m_loadWindow.visible) {
				this.m_loadWindow.HideFader();
				this.m_loadWindow.reportClicked(new MouseEvent(""));
			}
			if (this.saveLoadOpen) this.ReloadLoadWindow();
			else this.fader2.visible = false;
			this.logInButton.visible = false;
			this.logOutButton.visible = true;
		}
		Main.ShowMouse();

		var format:TextFormat = new TextFormat();
		format.font = Main.GLOBAL_FONT;
		format.color = 0xFFFFFF;
		this.userText.text = "Welcome, " + (ControllerGameGlobals.userName == "_Public" ? "Guest" : ControllerGameGlobals.userName);
		this.userText.setTextFormat(format);
	}

	public finishAddingUser(e:Event):void {
		if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_ADD_USER) return;
		var retVal:String = Database.FinishAddingUser(e);
		if (retVal != "") {
			this.m_progressDialog.SetMessage("Success!");
			this.m_progressDialog.HideInXSeconds(1);
			if (this.m_loginWindow) this.m_loginWindow.visible = false;
			this.m_newUserWindow.visible = false;
			Main.premiumMode = false;
			ControllerGameGlobals.userName = retVal.substring(retVal.indexOf("user: ") + 6, retVal.indexOf("password: ") - 1);
			ControllerGameGlobals.password = retVal.substring(retVal.indexOf("password: ") + 10, retVal.indexOf("session: ") - 1);
			ControllerGameGlobals.sessionID = retVal.substr(retVal.indexOf("session: ") + 9);
			if (this.m_loadWindow && this.m_loadWindow.visible) {
				this.m_loadWindow.HideFader();
				this.m_loadWindow.reportClicked(new MouseEvent(""));
			}
			if (this.saveLoadOpen) this.ReloadLoadWindow();
			else this.fader2.visible = false;
			this.logInButton.visible = false;
			this.logOutButton.visible = true;
		}

		var format:TextFormat = new TextFormat();
		format.font = Main.GLOBAL_FONT;
		format.color = 0xFFFFFF;
		this.userText.text = "Welcome, " + (ControllerGameGlobals.userName == "_Public" ? "Guest" : ControllerGameGlobals.userName);
		this.userText.setTextFormat(format);
	}

	public ReloadLoadWindow():void {
		this.m_loadWindow.visible = true;
		if (this.m_loadWindow.dataType != SaveLoadWindow.HIGH_SCORE_TYPE && this.m_loadWindow.yourRobotsBox.selected) {
			if (this.m_loadWindow.dataType == SaveLoadWindow.LOAD_ROBOT_TYPE) {
				Database.GetRobotData(ControllerGameGlobals.userName, ControllerGameGlobals.password, false, Database.SORT_BY_EDIT_TIME, Database.SORT_PERIOD_ALLTIME, 1, "", this.finishGettingLoadRobotData);
				this.ShowDialog("Getting robots...");
			} else if (this.m_loadWindow.dataType == SaveLoadWindow.LOAD_REPLAY_TYPE) {
				Database.GetReplayData(ControllerGameGlobals.userName, ControllerGameGlobals.password, false, Database.SORT_BY_EDIT_TIME, Database.SORT_PERIOD_ALLTIME, 1, "", this.finishGettingLoadReplayData);
				this.ShowDialog("Getting replays...");
			} else {
				Database.GetChallengeData(ControllerGameGlobals.userName, ControllerGameGlobals.password, false, Database.SORT_BY_EDIT_TIME, Database.SORT_PERIOD_ALLTIME, 1, "", this.finishGettingLoadChallengeData);
				this.ShowDialog("Getting challenges...");
			}
			this.m_loadWindow.ShowFader();
			Main.ShowHourglass();
		} else if (this.m_loadWindow.dataType == SaveLoadWindow.HIGH_SCORE_TYPE) {
			Database.GetScoreData(ControllerGameGlobals.userName, ControllerGameGlobals.password, Database.highScoresChallenge, this.m_loadWindow.m_scoreTypeBox.selectedIndex == 1, this.m_loadWindow.m_scoreTypeBox.selectedIndex == 2, Database.SORT_BY_SCORE, 1, "", this.finishGettingScoreData);
			this.ShowDialog("Getting high scores...");
			this.m_loadWindow.ShowFader();
			Main.ShowHourglass();
		}
	}

	public commentButton(e:MouseEvent, robotID:String = "", robotPublic:boolean = false):void {
		if (robotPublic) {
			Database.CommentOnRobot(robotID, this.finishCommenting);
			this.ShowDialog("Connecting to forum...");
			Main.ShowHourglass();
		} else {
			this.ShowDialog3("You need to save your robot publicly first!");
			this.m_progressDialog.ShowOKButton();
			this.m_progressDialog.StopTimer();
		}
	}

	public finishCommenting(e:Event):void {
		if (!Database.waitingForResponse || (Database.curTransactionType != Database.ACTION_COMMENT_ROBOT && Database.curTransactionType != Database.ACTION_COMMENT_REPLAY && Database.curTransactionType != Database.ACTION_COMMENT_CHALLENGE)) return;
		var threadID:number = Database.FinishCommenting(e);
		if (threadID != -1) {
			this.m_loadWindow.HideFader();
			this.m_progressDialog.visible = false;
			Main.BrowserRedirect("http://incredibots.com/forums/posting.php?mode=reply&t=" + threadID + (ControllerGameGlobals.userName == "_Public" ? "" : "&sid=" + ControllerGameGlobals.sessionID), true);
			Main.ShowMouse();
		}
	}

	public finishExporting(exportStr:String, robotStr:String):void {
		this.m_loadWindow.visible = false;
		if (this.m_exportDialog) this.removeChild(this.m_exportDialog);
		this.m_exportDialog = new ExportWindow(this, exportStr, robotStr);
		this.fader2.visible = true;
		this.addChild(this.m_exportDialog);
	}

	public linkButton(e:MouseEvent, robotID:String = "", robotPublic:boolean = false):void {
		if (robotPublic) {
			this.ShowLinkDialog("     Use the link below to\n        link to this robot.", "http://incredibots2.com/?robotID=" + robotID);
		} else {
			this.ShowDialog3("You need to save your robot publicly first!");
			this.m_progressDialog.ShowOKButton();
			this.m_progressDialog.StopTimer();
		}
	}

	public embedButton(e:MouseEvent, robotID:String = "", robotPublic:boolean = false):void {
		if (robotPublic) {
			this.ShowLinkDialog("Copy the HTML below into your\n  website to embed this robot.", null, false, robotID);
		} else {
			this.ShowDialog3("You need to save your robot publicly first!");
			this.m_progressDialog.ShowOKButton();
			this.m_progressDialog.StopTimer();
		}
	}

	public commentReplayButton(e:MouseEvent, replayID:String = "", replayPublic:boolean = false):void {
		if (replayPublic) {
			Database.CommentOnReplay(replayID, this.finishCommenting);
			this.ShowDialog("Connecting to forum...");
			Main.ShowHourglass();
		} else {
			this.ShowDialog3("You need to save your replay publicly first!");
			this.m_progressDialog.ShowOKButton();
			this.m_progressDialog.StopTimer();
		}
	}

	public linkReplayButton(e:MouseEvent, replayID:String = "", replayPublic:boolean = false):void {
		if (replayPublic) {
			this.ShowLinkDialog("     Use the link below to\n       link to this replay.", "http://incredibots2.com/?replayID=" + replayID);
		} else {
			this.ShowDialog3("You need to save your replay publicly first!");
			this.m_progressDialog.ShowOKButton();
			this.m_progressDialog.StopTimer();
		}
	}

	public embedReplayButton(e:MouseEvent, replayID:String = "", replayPublic:boolean = false):void {
		if (replayPublic) {
			this.ShowLinkDialog("Copy the HTML below into your\n  website to embed this replay.", null, false, replayID, true);
		} else {
			this.ShowDialog3("You need to save your replay publicly first!");
			this.m_progressDialog.ShowOKButton();
			this.m_progressDialog.StopTimer();
		}
	}

	public commentChallengeButton(e:MouseEvent, challengeID:String = "", challengePublic:boolean = false):void {
		if (challengePublic) {
			Database.CommentOnChallenge(challengeID, this.finishCommenting);
			this.ShowDialog("Connecting to forum...");
			Main.ShowHourglass();
		} else {
			this.ShowDialog3("You need to save your challenge publicly first!");
			this.m_progressDialog.ShowOKButton();
			this.m_progressDialog.StopTimer();
		}
	}

	public linkChallengeButton(e:MouseEvent, challengeID:String = "", challengePublic:boolean = false):void {
		if (challengePublic) {
			this.ShowLinkDialog("     Use the link below to\n       link to this challenge.", "http://incredibots2.com/?challengeID=" + challengeID);
		} else {
			this.ShowDialog3("You need to save your challenge publicly first!");
			this.m_progressDialog.ShowOKButton();
			this.m_progressDialog.StopTimer();
		}
	}

	public embedChallengeButton(e:MouseEvent, challengeID:String = "", challengePublic:boolean = false):void {
		if (challengePublic) {
			this.ShowLinkDialog("Copy the HTML below into your\n  website to embed this challenge.", null, true, challengeID);
		} else {
			this.ShowDialog3("You need to save your challenge publicly first!");
			this.m_progressDialog.ShowOKButton();
			this.m_progressDialog.StopTimer();
		}
	}

	public ShowDialog(msg:String):void {
		if (this.m_progressDialog) this.removeChild(this.m_progressDialog);
		this.m_progressDialog = new DialogWindow(this, msg);
		this.addChild(this.m_progressDialog);
	}

	public ShowDialog2(msg:String):void {
		if (this.m_progressDialog) this.removeChild(this.m_progressDialog);
		this.m_progressDialog = new DialogWindow(this, msg, true, true);
		this.addChild(this.m_progressDialog);
	}

	public ShowDialog3(msg:String):void {
		if (this.m_progressDialog) this.removeChild(this.m_progressDialog);
		this.m_progressDialog = new DialogWindow(this, msg, true);
		this.addChild(this.m_progressDialog);
	}

	public ShowLinkDialog(msg1:String, msg2:String, isEmbedReplay:boolean = false, id:String = "", isEmbedChallenge:boolean = false):void {
		if (this.m_linkDialog) this.removeChild(this.m_linkDialog);
		this.m_linkDialog = new LinkWindow(this, msg1, msg2, isEmbedReplay, id, isEmbedChallenge);
		this.addChild(this.m_linkDialog);
	}

	public HideDialog(e:Event):void {
		Database.nonfatalErrorOccurred = false;
		if (this.m_loadWindow) this.m_loadWindow.HideFader();
		if (this.m_challengeWindow) this.m_challengeWindow.HideFader();
		if (this.m_newUserWindow && this.m_newUserWindow.visible) this.m_newUserWindow.HideFader();
		else if (this.m_loginWindow) this.m_loginWindow.HideFader();
		else if (this.m_goldLoginWindow) this.m_goldLoginWindow.HideFader();
		this.m_progressDialog.visible = false;
		if ((!this.m_loadWindow || !this.m_loadWindow.visible) && (!this.m_newUserWindow || !this.m_newUserWindow.visible) && (!this.m_loginWindow || !this.m_loginWindow.visible) && (!this.m_challengeWindow || !this.m_challengeWindow.visible)) {
			this.fader2.visible = false;
		}
	}

	public HideLinkDialog(e:Event):void {
		this.m_linkDialog.visible = false;
		this.m_loadWindow.HideFader();
	}

	public HideExportDialog(e:Event):void {
		this.m_exportDialog.visible = false;
		if (this.m_loadWindow && this.m_loadWindow.visible) {
			this.m_loadWindow.HideFader();
		}
		this.fader2.visible = false;
	}

	public HideImportDialog(e:Event):void {
		this.m_importDialog.visible = false;
		this.fader2.visible = false;
	}

	public ShowImportWindow(type:number):void {
		if (this.m_importDialog) this.removeChild(this.m_importDialog);
		this.m_importDialog = new ImportWindow(this, type);
		this.fader2.visible = true;
		this.addChild(this.m_importDialog);
	}

	public ShowConfirmDialog(msg:String, type:number):void {
		if (this.m_progressDialog) this.removeChild(this.m_progressDialog);
		this.m_progressDialog = new DialogWindow(this, msg, true);
		this.addChild(this.m_progressDialog);
		this.m_progressDialog.ShowOKAndCancelButton(type);
	}

	public HideConfirmDialog(e:Event):void {
		this.m_progressDialog.visible = false;
		if (this.m_loadWindow) this.m_loadWindow.HideFader();
		else this.fader2.visible = false;
	}

	public DialogOK(e:Event):void {
		this.m_progressDialog.visible = false;
		if (this.m_loadWindow && this.m_loadWindow.visible) this.m_loadWindow.HideFader();
		if (this.m_challengeWindow && this.m_challengeWindow.visible) this.m_challengeWindow.HideFader();
		if (this.m_loginWindow && this.m_loginWindow.visible) this.m_loginWindow.HideFader();
		if (this.m_goldLoginWindow && this.m_goldLoginWindow.visible) this.m_goldLoginWindow.HideFader();
		if (this.m_newUserWindow && this.m_newUserWindow.visible) this.m_newUserWindow.HideFader();
	}

	public ConfirmDeleteRobot(e:MouseEvent):void {
		this.m_loadWindow.deleteRobotButtonPressed(e, true);
	}

	public ConfirmDeleteReplay(e:MouseEvent):void {
		this.m_loadWindow.deleteReplayButtonPressed(e, true);
	}

	public ConfirmDeleteChallenge(e:MouseEvent):void {
		this.m_loadWindow.deleteChallengeButtonPressed(e, true);
	}

	private playButtonPressed(e:MouseEvent):void {
		if (!Main.premiumMode || ControllerGameGlobals.userName != "") {
			this.playButton.visible = false;
			this.fader.visible = true;
			this.levelSelectGui.visible = true;
			this.logoShrinking = true;
			if (this.subscribeButton) this.subscribeButton.visible = false;
			if (this.gamesButton) this.gamesButton.visible = false;
			/*windowL.visible = false;
			windowR.visible = false;
			windowC.visible = false;
			forumPostText.visible = false;
			forumPostButton.visible = false;*/
			this.removeChild(this.enableSoundButton);
			this.removeChild(this.disableSoundButton);
			this.levelSelectGui.addChild(this.enableSoundButton);
			this.levelSelectGui.addChild(this.disableSoundButton);
		}
	}

	private contestButtonPressed(e:MouseEvent):void {
		Main.BrowserRedirect("http://incredibots.com/forums/viewtopic.php?t=119105", true);
	}

	private forumPostButtonPressed(e:MouseEvent):void {
		Main.BrowserRedirect("http://incredibots.com/forums/viewtopic.php?p=1269792", true);
	}

	private tankButton(e:MouseEvent):void {
		Main.changeControllers = true;
		Main.nextControllerType = 10;
	}

	private shapeButton(e:MouseEvent):void {
		Main.changeControllers = true;
		Main.nextControllerType = 11;
	}

	private carButton(e:MouseEvent):void {
		Main.changeControllers = true;
		Main.nextControllerType = 12;
	}

	private jumpBotButton(e:MouseEvent):void {
		Main.changeControllers = true;
		Main.nextControllerType = 13;
	}

	private dumpBotButton(e:MouseEvent):void {
		Main.changeControllers = true;
		Main.nextControllerType = 14;
	}

	private catapultButton(e:MouseEvent):void {
		Main.changeControllers = true;
		Main.nextControllerType = 15;
	}

	private homeMovieButton(e:MouseEvent):void {
		Main.changeControllers = true;
		Main.nextControllerType = 16;
	}

	private rubeGoldbergButton(e:MouseEvent):void {
		Main.changeControllers = true;
		Main.nextControllerType = 17;
	}

	private tutorialButton(e:MouseEvent):void {
		if (this.m_tutorialWindow) this.removeChild(this.m_tutorialWindow);
		this.m_tutorialWindow = new TutorialSelectWindow(this);
		this.fader2.visible = true;
		this.addChild(this.m_tutorialWindow);
	}

	private sandboxButton(e:MouseEvent):void {
		var settings:SandboxSettings = new SandboxSettings(15.0, 1, 0, 0, 0);
		ControllerSandbox.settings = settings;
		Main.changeControllers = true;
		Main.nextControllerType = 0;
	}

	private advancedButton(e:MouseEvent):void {
		Main.nextControllerType = 0;
		this.m_sandboxWindow = new AdvancedSandboxWindow(this);
		this.fader2.visible = true;
		this.addChild(this.m_sandboxWindow);
	}

	private editorButton(e:MouseEvent):void {
		ControllerChallenge.challenge = null;
		ControllerChallenge.playChallengeMode = false;
		ControllerChallenge.playOnlyMode = false;
		Main.nextControllerType = 1;
		this.m_sandboxWindow = new AdvancedSandboxWindow(this);
		this.fader2.visible = true;
		this.addChild(this.m_sandboxWindow);
	}

	public logout(e:MouseEvent):void {
		this.fader2.visible = true;
		this.ShowConfirmDialog("Are you sure you want to log " + ControllerGameGlobals.userName +  " out?", 12);
	}

	public ConfirmLogout(e:MouseEvent):void {
		Main.premiumMode = false;
		ControllerGameGlobals.userName = "_Public";
		this.logInButton.visible = true;
		this.logOutButton.visible = false;
		this.ShowDialog3("You are now logged out.");
		this.m_progressDialog.ShowOKButton();
		this.m_progressDialog.StopTimer();
		this.fader2.visible = true;

		var format:TextFormat = new TextFormat();
		format.font = Main.GLOBAL_FONT;
		format.color = 0xFFFFFF;
		this.userText.text = "Welcome, Guest";
		this.userText.setTextFormat(format);
	}

	private instructionsButton(e:MouseEvent):void {
		Main.BrowserRedirect("http://www.incredifriends.com/", true);
	}

	private creditsButton(e:MouseEvent):void {
		Main.BrowserRedirect("http://www.incredifriends.com/", true);
	}

	private suggestionsButton(e:MouseEvent):void {
		Main.BrowserRedirect("http://www.incredifriends.com/", true);
	}

	public Update():void {
		if (ControllerMainMenu.channel && !Main.enableSound) {
			ControllerGameGlobals.introVolume -= 0.01;
			var st:SoundTransform = new SoundTransform(ControllerGameGlobals.introVolume);
			ControllerMainMenu.channel.soundTransform = st;
			if (ControllerGameGlobals.introVolume <= 0) {
				ControllerMainMenu.channel.stop();
				ControllerMainMenu.channel = null;
			}
		}

		var physStart:number = window.performance.now();

		this.HandleCamera();
		for (var i:number = 0; i < this.allParts.length; i++) {
			this.allParts[i].Update(this.world);
		}

		if (this.replay && this.replay.Update(this.frameCounter)) {
			this.frameCounter = 0;
			this.replay.syncPointIndex = 0;
			this.replay.cameraMovementIndex = 0;
			this.replay.keyPressIndex = 0;
			ControllerMainMenu.cannonballs = new Array();
			for (i = 0; i < this.allParts.length; i++) {
				this.allParts[i].UnInit(this.world);
			}
			for (i = this.allParts.length; i >= 0; i--) {
				if (this.allParts[i] instanceof ShapePart) this.allParts[i].Init(this.world);
			}
			for (i = 0; i < this.allParts.length; i++) {
				if (this.allParts[i] instanceof JointPart || this.allParts[i] instanceof Thrusters) this.allParts[i].Init(this.world);
			}
		} else {
			this.frameCounter++;
		}
		// FIXME: World drawing
		this.draw.DrawWorld(this.allParts, new Array(), false, false, false, true);
		this.sSky.Update(false, this.hasPanned);
		Main.m_fpsCounter.updatePhys(physStart);

		if (!this.levelSelectGui.visible) {
			this.sLogo.width = this.sLogo.texture.width * ControllerMainMenu.LOGO_STRETCH_WIDTHS[this.logoFrame] / 100.0;
			this.sLogo.height = this.sLogo.texture.height * ControllerMainMenu.LOGO_STRETCH_HEIGHTS[this.logoFrame] / 100.0;
			this.sLogo.x = 400 - this.sLogo.width / 2;
			this.sLogo.y = 92.5 - this.sLogo.height / 2;
			this.logoFrame = (this.logoFrame + 1) % 48;
		} else {
			if (this.logoShrinking) {
				this.logoShrinking = false;
				if (this.sLogo.scale.x != this.sLogo.scale.y) {
					this.sLogo.scale.x = Math.min(this.sLogo.scale.x, this.sLogo.scale.y);
					this.sLogo.scale.y = this.sLogo.scale.x;
					this.logoShrinking = true;
				} else if (this.sLogo.scale.x > 0.6) {
					this.sLogo.width -= 25;
					if (this.sLogo.scale.x < 0.6) this.sLogo.scale.x = 0.6;
					this.sLogo.scale.y = this.sLogo.scale.x;
					this.logoShrinking = true;
				}
				if (this.sLogo.x < 215) {
					this.sLogo.x += 11.7;
					if (this.sLogo.x > 215) this.sLogo.x = 215;
					this.logoShrinking = true;
				}
				if (this.sLogo.y > 10) {
					this.sLogo.y -= 2;
					if (this.sLogo.y < 10) this.sLogo.y = 10;
					this.logoShrinking = true;
				}
			}
			if (this.startHereArrow) {
				this.arrowAccel = (118 - this.arrowX) * 0.12;
				this.arrowVel += this.arrowAccel;
				this.arrowX += this.arrowVel;
				this.startHereArrow.x = this.arrowX;
			}
		}

		if (Database.errorOccurred) {
			this.m_progressDialog.StopTimer();
			this.m_progressDialog.SetMessage(Database.lastErrorMsg, true);
			Database.errorOccurred = false;
			if (Database.versionErrorOccurred) {
				Database.versionErrorOccurred = false;
				this.m_progressDialog.ShowOKAndCancelButton(5);
			} else {
				this.m_progressDialog.ShowOKButton();
			}
			this.removeChild(this.m_progressDialog);
			this.addChild(this.m_progressDialog);
			Main.ShowMouse();
		}
	}

	public keyInput(key:number, up:boolean):void {
		var recorded:boolean = false;
		for (var i:number = 0; i < this.allParts.length; i++) {
			this.allParts[i].KeyInput(key, up, true);
		}
	}

	public SyncReplay(syncPoint:Object):void {
		var bodiesUsed:Array<any> = new Array();
		var curIndex:number = 0;
		for (var i:number = 0; i < this.allParts.length; i++) {
			if (this.allParts[i] instanceof ShapePart && !this.allParts[i].isStatic && !Util.ObjectInArray(this.allParts[i].GetBody(), bodiesUsed)) {
				this.allParts[i].GetBody().SetXForm(Util.Vector(syncPoint.positions[curIndex].x, syncPoint.positions[curIndex].y), syncPoint.angles[curIndex]);
				curIndex++;
				bodiesUsed.push(this.allParts[i].GetBody());
			}
		}
		for (i = 0; i < ControllerMainMenu.cannonballs.length; i++) {
			ControllerMainMenu.cannonballs[i].SetXForm(syncPoint.cannonballPositions[i], 0);
		}
	}

	public SyncReplay2(syncPoint1:Object, syncPoint2:Object):void {
		var syncPointIndex:number = this.replay.syncPoints.indexOf(syncPoint1);
		var bodiesUsed:Array<any> = new Array();
		var curIndex:number = 0;
		for (var i:number = 0; i < this.allParts.length; i++) {
			if (this.allParts[i] instanceof ShapePart && !this.allParts[i].isStatic && !Util.ObjectInArray(this.allParts[i].GetBody(), bodiesUsed)) {
				this.allParts[i].GetBody().SetXForm(Util.Vector(this.replaySplineXs[0][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * (this.replaySplineXs[1][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * (this.replaySplineXs[2][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * this.replaySplineXs[3][syncPointIndex][curIndex])), this.replaySplineYs[0][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * (this.replaySplineYs[1][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * (this.replaySplineYs[2][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * this.replaySplineYs[3][syncPointIndex][curIndex]))), this.replaySplineAngles[0][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * (this.replaySplineAngles[1][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * (this.replaySplineAngles[2][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * this.replaySplineAngles[3][syncPointIndex][curIndex])));
				curIndex++;
				bodiesUsed.push(this.allParts[i].GetBody());
			}
		}
		for (i = 0; i < ControllerMainMenu.cannonballs.length; i++) {
			if (syncPoint1.cannonballPositions.length > i) {
				var frameDiff:number = syncPoint2.frame - syncPoint1.frame;
				var newX:number = (syncPoint1.cannonballPositions[i].x * (syncPoint2.frame - this.frameCounter) + syncPoint2.cannonballPositions[i].x * (this.frameCounter - syncPoint1.frame)) / frameDiff;
				var newY:number = (syncPoint1.cannonballPositions[i].y * (syncPoint2.frame - this.frameCounter) + syncPoint2.cannonballPositions[i].y * (this.frameCounter - syncPoint1.frame)) / frameDiff;
				ControllerMainMenu.cannonballs[i].SetXForm(Util.Vector(newX, newY), 0);
			} else {
				ControllerMainMenu.cannonballs[i].SetXForm(syncPoint2.cannonballPositions[i], 0);
			}
		}
	}

	public MoveCameraForReplay(cameraMovement:Object):void {

	}

	public World2ScreenX(x:number):number {
		return x * this.m_physScale - this.draw.m_drawXOff;
	}

	public World2ScreenY(y:number):number {
		return y * this.m_physScale - this.draw.m_drawYOff;
	}

	private HandleCamera():void {
		if (this.cameraPart) {
			var oldX:number = this.draw.m_drawXOff;
			var oldY:number = this.draw.m_drawYOff;
			this.draw.m_drawXOff = this.cameraPart.GetBody().GetWorldCenter().x * this.m_physScale - ControllerMainMenu.ZOOM_FOCUS_X;
			this.draw.m_drawYOff = this.cameraPart.GetBody().GetWorldCenter().y * this.m_physScale - ControllerMainMenu.ZOOM_FOCUS_Y;
			if (this.draw.m_drawYOff < -760) this.draw.m_drawYOff = -760;
			if (oldX != this.draw.m_drawXOff || oldY != this.draw.m_drawYOff) {
				this.hasPanned = true;
				this.sGround.x = this.World2ScreenX(-42.36);
				this.sGround.y = this.World2ScreenY(9.55);
			}
		}
	}

	private ComputeReplaySplines(type:number):Array<any> {
		// Compute the h and b
		var h:Array<any> = new Array();
		var b:Array<any> = new Array();
		for (var i:number = 0; i < this.replay.syncPoints.length - 1; i++) {
			h.push(this.replay.syncPoints[i + 1].frame - this.replay.syncPoints[i].frame);
			var inner:Array<any> = new Array();
			for (var j:number = 0; j < this.replay.syncPoints[0].positions.length; j++) {
				if (type == 0) inner.push((this.replay.syncPoints[i + 1].positions[j].x - this.replay.syncPoints[i].positions[j].x) / h[i]);
				else if (type == 1) inner.push((this.replay.syncPoints[i + 1].positions[j].y - this.replay.syncPoints[i].positions[j].y) / h[i]);
				else {
					var deltaAngle:number = this.replay.syncPoints[i + 1].angles[j] - this.replay.syncPoints[i].angles[j];
					if (Math.abs(deltaAngle) > 300) {
						var a1:number = Util.NormalizeAngle(this.replay.syncPoints[i].angles[j]);
						var a2:number = Util.NormalizeAngle(this.replay.syncPoints[i + 1].angles[j]);
						if (Math.abs(a1 - a2) < Math.PI) {
							deltaAngle = a2 - a1;
						} else if (a1 > a2) {
							deltaAngle = a2 + 2 * Math.PI - a1;
						} else {
							deltaAngle = a2 - (a1 + 2 * Math.PI);
						}
					}
					inner.push(deltaAngle / h[i]);
				}
			}
			b.push(inner);
		}

		// Gaussian Elimination
		var u:Array<any> = new Array();
		var v:Array<any> = new Array();
		u.push(0);
		u.push(2 * (h[0] + h[1]));
		inner = new Array();
		for (j = 0; j < this.replay.syncPoints[0].positions.length; j++) {
			inner.push(0);
		}
		v.push(inner);
		inner = new Array();
		for (j = 0; j < this.replay.syncPoints[0].positions.length; j++) {
			inner.push(6 * (b[1][j] - b[0][j]));
		}
		v.push(inner);
		for (i = 2; i < this.replay.syncPoints.length - 1; i++) {
			u.push(2 * (h[i - 1] + h[i]) - h[i - 1] * h[i - 1] / u[i - 1]);
			inner = new Array();
			for (j = 0; j < this.replay.syncPoints[0].positions.length; j++) {
				inner.push(6 * (b[i][j] - b[i - 1][j]) - h[i - 1] * v[i - 1][j] / u[i - 1]);
			}
			v.push(inner);
		}

		// Back-substitution
		var z:Array<any> = new Array();
		inner = new Array();
		for (j = 0; j < this.replay.syncPoints[0].positions.length; j++) {
			inner.push(0);
		}
		z[this.replay.syncPoints.length - 1] = inner;
		for (i = this.replay.syncPoints.length - 2; i > 0; i--) {
			inner = new Array();
			for (j = 0; j < this.replay.syncPoints[0].positions.length; j++) {
				inner.push((v[i][j] - h[i] * z[i + 1][j]) / u[i]);
			}
			z[i] = inner;
		}
		inner = new Array();
		for (j = 0; j < this.replay.syncPoints[0].positions.length; j++) {
			inner.push(0);
		}
		z[0] = inner;

		var S:Array<any> = new Array();
		var As:Array<any> = new Array();
		var Bs:Array<any> = new Array();
		var Cs:Array<any> = new Array();
		var Ds:Array<any> = new Array();
		for (i = 0; i < this.replay.syncPoints.length - 1; i++) {
			var innerA:Array<any> = new Array();
			var innerB:Array<any> = new Array();
			var innerC:Array<any> = new Array();
			var innerD:Array<any> = new Array();
			for (j = 0; j < this.replay.syncPoints[0].positions.length; j++) {
				innerA.push(type == 0 ? this.replay.syncPoints[i].positions[j].x : (type == 1 ? this.replay.syncPoints[i].positions[j].y : this.replay.syncPoints[i].angles[j]));
				deltaAngle = this.replay.syncPoints[i + 1].angles[j] - this.replay.syncPoints[i].angles[j];
				if (Math.abs(deltaAngle) > 300) {
					a1 = Util.NormalizeAngle(this.replay.syncPoints[i].angles[j]);
					a2 = Util.NormalizeAngle(this.replay.syncPoints[i + 1].angles[j]);
					if (Math.abs(a1 - a2) < Math.PI) {
						deltaAngle = a2 - a1;
					} else if (a1 > a2) {
						deltaAngle = a2 + 2 * Math.PI - a1;
					} else {
						deltaAngle = a2 - (a1 + 2 * Math.PI);
					}
				}
				innerB.push(-h[i] * z[i + 1][j] / 6 - h[i] * z[i][j] / 3 + (type == 0 ? this.replay.syncPoints[i + 1].positions[j].x - innerA[j] : (type == 1 ? this.replay.syncPoints[i + 1].positions[j].y - innerA[j] : deltaAngle)) / h[i]);
				innerC.push(z[i][j] / 2);
				innerD.push((z[i + 1][j] - z[i][j]) / (6 * h[i]));
			}
			As.push(innerA);
			Bs.push(innerB);
			Cs.push(innerC);
			Ds.push(innerD);
		}
		S.push(As);
		S.push(Bs);
		S.push(Cs);
		S.push(Ds);
		return S;
	}
}
