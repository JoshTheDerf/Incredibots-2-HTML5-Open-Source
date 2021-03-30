import { Text, TextStyle } from 'pixi.js'
import { ControllerGame, ControllerGameGlobals, GuiButton, GuiWindow, Main } from "../imports";

export class PostReplayWindow extends GuiWindow
{
	private cont:ControllerGame;
	private m_header:Text;
	private m_viewReplayButton:GuiButton;
	private m_loadReplayButton:GuiButton;
	private m_stopButton:GuiButton;
	private m_rateButton:GuiButton;
	private m_mainMenuButton:GuiButton;
	private m_closeButton:GuiButton;

	constructor(contr:ControllerGame)
	{
		super(323, 130, 154, (ControllerGameGlobals.curReplayID == "" ? 210 : 240));
		this.cont = contr;

		this.m_header = new Text('');
		this.m_header.text = "End of Replay";
		this.m_header.height = 20;
		this.m_header.x = 27 + 50;
		this.m_header.y = 20;
		this.m_header.anchor.set(0.5, 0);
		var format = new TextStyle();
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 14;
		format.fill = 0x242930;
		this.m_header.style = format;
		this.addChild(this.m_header);

		this.m_viewReplayButton = new GuiButton("View Again!", 22, 45, 110, 35, this.viewReplayButton.bind(this), GuiButton.PURPLE);
		this.addChild(this.m_viewReplayButton);
		this.m_loadReplayButton = new GuiButton("Load Replay", 22, 75, 110, 35, this.loadReplayButton.bind(this), GuiButton.PURPLE);
		this.addChild(this.m_loadReplayButton);
		this.m_stopButton = new GuiButton("Stop Replay", 22, 105, 110, 35, this.rewindButton.bind(this), GuiButton.PURPLE);
		this.addChild(this.m_stopButton);
		if (ControllerGameGlobals.curReplayID != "") {
			this.m_rateButton = new GuiButton("Rate this Replay", 22, 135, 110, 35, this.rateButton.bind(this), GuiButton.PURPLE);
			this.addChild(this.m_rateButton);
		}
		this.m_mainMenuButton = new GuiButton("Main Menu", 22, (ControllerGameGlobals.curReplayID == "" ? 135 : 165), 110, 35, this.mainMenuButton.bind(this), GuiButton.PURPLE);
		this.addChild(this.m_mainMenuButton);
		this.m_closeButton = new GuiButton("Close", 22, (ControllerGameGlobals.curReplayID == "" ? 165 : 195), 110, 35, this.cancelButton.bind(this), GuiButton.PURPLE);
		this.addChild(this.m_closeButton);
	}

	private rateButton():void {
		this.ShowFader();
		this.cont.rateReplayButton();
	}

	private viewReplayButton():void {
		this.visible = false;
		this.cont.m_fader.visible = false;
		this.cont.resetButton();
	}

	private loadReplayButton():void {
		this.visible = false;
		this.cont.m_fader.visible = false;
		this.cont.loadReplayButton();
	}

	private rewindButton():void {
		this.visible = false;
		this.cont.m_fader.visible = false;
		this.cont.rewindButton();
	}

	private mainMenuButton():void {
		this.visible = false;
		this.cont.m_fader.visible = false;
		this.cont.newButton();
	}

	private cancelButton():void {
		this.visible = false;
		this.cont.m_fader.visible = false;
	}
}
