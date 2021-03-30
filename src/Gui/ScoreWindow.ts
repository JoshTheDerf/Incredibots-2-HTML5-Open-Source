import { Sprite, Text, TextStyle } from "pixi.js";
import { ControllerChallengeEditor, ControllerGame, ControllerGameGlobals, ControllerHomeMovies, ControllerNewFeatures, ControllerRubeGoldberg, ControllerSandbox, ControllerTutorial, GuiButton, GuiWindow, Main, Resource, SandboxSettings } from "../imports";

export class ScoreWindow extends GuiWindow
{
	private cont:ControllerGame;
	private m_header:Sprite;
	private m_scoreField:Text;
	private m_viewReplayButton:GuiButton;
	private m_saveReplayButton:GuiButton;
	private m_submitScoreButton:GuiButton;
	private m_mainMenuButton:GuiButton;
	private m_cancelButton:GuiButton;
	private m_nextLevelButton:GuiButton;

	constructor(contr:ControllerGame, score:number)
	{
		var y:number = 40;
		if (!(contr instanceof ControllerTutorial || contr instanceof ControllerHomeMovies || contr instanceof ControllerRubeGoldberg || contr instanceof ControllerNewFeatures || contr instanceof ControllerChallengeEditor)) {
			y = 60;
		}

		super(323, 130, 200, (contr instanceof ControllerTutorial || contr instanceof ControllerHomeMovies || contr instanceof ControllerRubeGoldberg || contr instanceof ControllerNewFeatures ? y + 200 : y + 170));
		this.cont = contr;

		this.m_header = new Sprite(Resource.cCongrats);
		this.m_header.width = 175;
		this.m_header.scale.y = this.m_header.scale.x;
		this.m_header.x = 13;
		this.m_header.y = 15;
		this.addChild(this.m_header);

		if (!(this.cont instanceof ControllerTutorial || this.cont instanceof ControllerHomeMovies || this.cont instanceof ControllerRubeGoldberg || this.cont instanceof ControllerNewFeatures || this.cont instanceof ControllerChallengeEditor)) {
			this.m_scoreField = new Text('');
			this.m_scoreField.text = "Your score is: " + score;
			this.m_scoreField.width = 120;
			this.m_scoreField.height = 20;
			this.m_scoreField.x = 40;
			this.m_scoreField.y = 44;
			var format:TextStyle = new TextStyle();
			format.align = 'center';
			format.fontFamily = Main.GLOBAL_FONT;
			format.fill = 0x242930;
			this.m_scoreField.style = format;
			this.addChild(this.m_scoreField);
		}

		this.m_viewReplayButton = new GuiButton((ControllerGameGlobals.viewingUnsavedReplay ? "View Again!" : "View Replay"), 45, y, 110, 35, this.viewReplayButton.bind(this), GuiButton.PURPLE);
		this.addChild(this.m_viewReplayButton);
		this.m_saveReplayButton = new GuiButton("Save Replay", 45, y + 30, 110, 35, this.saveReplayButton.bind(this), GuiButton.PURPLE);
		this.addChild(this.m_saveReplayButton);
		this.m_submitScoreButton = new GuiButton("Submit Score", 45, y + 60, 110, 35, this.cont.submitButton.bind(this), GuiButton.PURPLE);
		this.addChild(this.m_submitScoreButton);
		this.m_mainMenuButton = new GuiButton("Main Menu", 45, y + 90, 110, 35, this.cont.newButton.bind(this), GuiButton.PURPLE);
		this.addChild(this.m_mainMenuButton);
		this.m_cancelButton = new GuiButton((this.cont instanceof ControllerHomeMovies || this.cont instanceof ControllerChallengeEditor ? "Close" : "Retry"), 45, y + 120, 110, 35, this.cancelButton.bind(this), GuiButton.PURPLE);
		this.addChild(this.m_cancelButton);
		if (this.cont instanceof ControllerTutorial || this.cont instanceof ControllerHomeMovies || this.cont instanceof ControllerRubeGoldberg || this.cont instanceof ControllerNewFeatures) {
			this.m_nextLevelButton = new GuiButton("Next Level", 45, y + 150, 110, 35, this.nextButton.bind(this), GuiButton.BLUE);
			this.addChild(this.m_nextLevelButton);
		}
	}

	private viewReplayButton():void  {
		this.cont.viewReplayButton();
	}

	private saveReplayButton():void {
		this.cont.saveReplayButton();
	}

	private cancelButton():void {
		this.visible = false;
		this.cont.m_fader.visible = false;
		if (!(this.cont instanceof ControllerHomeMovies || this.cont instanceof ControllerChallengeEditor)) this.cont.resetButton();
	}

	private nextButton():void {
		Main.changeControllers = true;
		Main.nextControllerType++;
		if (Main.nextControllerType > 15) {
			var settings:SandboxSettings = new SandboxSettings(15.0, 1, 0, 0, 0);
			if (Main.nextControllerType == 18) settings = new SandboxSettings(1.0, 0, 1, 5, 1);
			if (Main.nextControllerType == 19) settings = new SandboxSettings(15.0, 0, 2, 0, 5);
			ControllerSandbox.settings = settings;
		}
		ControllerGameGlobals.playingReplay = false;
		ControllerGameGlobals.viewingUnsavedReplay = false;
	}
}
