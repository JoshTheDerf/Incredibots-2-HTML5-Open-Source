import { Text, TextStyle } from "pixi.js";
import { ControllerGame, GuiButton, GuiWindow, ImportWindow, Main } from "../imports";

export class LoadWindow extends GuiWindow
{
	private cont:ControllerGame;

	constructor(contr:ControllerGame)
	{
		super(323, 150, 154, 290);
		this.cont = contr;
		var header:Text = new Text("");
		header.text = "Load What?";
		header.anchor.set(0.5, 0.5)
		header.x = 7 + 140/2;
		header.y = 10 + 30 / 2;
		var format:TextStyle = new TextStyle();
		format.fill = 0x242930;
		format.fontSize = 14;
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		header.style = format;
		this.addChild(header);
		format = new TextStyle();
		format.fontSize = 14;
		var button:GuiButton = new GuiButton("Load Robot", 7, 30, 140, 45, () => this.loadRobot(), GuiButton.BLUE, format);
		button.disabled = true
		this.addChild(button);
		button = new GuiButton("Load Replay", 7, 65, 140, 45, () => this.loadReplay(), GuiButton.BLUE, format);
		button.disabled = true
		this.addChild(button);
		button = new GuiButton("Load Challenge", 7, 100, 140, 45, () => this.loadChallenge(), GuiButton.BLUE, format);
		button.disabled = true
		this.addChild(button);
		button = new GuiButton("Import Robot", 7, 135, 140, 45, () => this.importRobot(), GuiButton.ORANGE, format);
		this.addChild(button);
		button = new GuiButton("Import Replay", 7, 170, 140, 45, () => this.importReplay(), GuiButton.ORANGE, format);
		this.addChild(button);
		button = new GuiButton("Import Challenge", 7, 205, 140, 45, () => this.importChallenge(), GuiButton.ORANGE, format);
		this.addChild(button);
		format = new TextStyle();
		format.fontSize = 12;
		button = new GuiButton("Cancel", 32, 245, 90, 35, () => this.cancel(), GuiButton.PURPLE, format);
		this.addChild(button);
	}

	private loadRobot():void {
		this.cancel();
		this.cont.loadRobotButton(false);
	}

	private loadReplay():void {
		this.cancel();
		this.cont.loadReplayButton(false);
	}

	private loadChallenge():void {
		this.cancel();
		this.cont.loadChallengeButton(false);
	}

	private importRobot():void {
		this.cancel();
		this.cont.ShowImportWindow(ImportWindow.TYPE_ROBOT);
	}

	private importReplay():void {
		this.cancel();
		this.cont.ShowImportWindow(ImportWindow.TYPE_REPLAY);
	}

	private importChallenge():void {
		this.cancel();
		this.cont.ShowImportWindow(ImportWindow.TYPE_CHALLENGE);
	}

	private cancel():void {
		this.visible = false;
		this.cont.m_fader.visible = false;
	}
}
