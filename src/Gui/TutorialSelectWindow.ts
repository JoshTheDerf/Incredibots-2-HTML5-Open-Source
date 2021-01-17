import { TextStyle, Text } from "pixi.js";
import { GuiWindow, ControllerMainMenu, GuiButton, LSOManager, SandboxSettings, ControllerSandbox, ControllerChallenge } from "../imports";
import { Main } from "../Main";

export class TutorialSelectWindow extends GuiWindow
{
	private cont:ControllerMainMenu;

	constructor(contr:ControllerMainMenu)
	{
		super(249, 83, 312, 434);
		this.cont = contr;

		var format:TextStyle = new TextStyle();
		format.fontSize = 20;
		format.fontFamily = Main.GLOBAL_FONT;
		format.align = 'center';
		var header:Text = new Text('');
		header.text = "Choose a Level:";
		header.style = format;
		header.anchor.set(0.5, 0)
		header.x = 0 + (312 / 2);
		header.y = 12;
		this.addChild(header);

		format = new TextStyle();
		format.fontSize = 12;
		var button:GuiButton = new GuiButton("1. Drive a Tank!       ", 1, 38, 155, 50, () => this.tankButton(), GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(0));
		this.addChild(button);
		button = new GuiButton("2. Shape Up            ", 1, 83, 155, 50, () => this.shapeButton(), GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(1));
		this.addChild(button);
		button = new GuiButton("3. Car Creation       ", 1, 128, 155, 50, () => this.carButton(), GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(2));
		this.addChild(button);
		button = new GuiButton("4. JumpBot              ", 1, 173, 155, 50, () => this.jumpBotButton(), GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(3));
		this.addChild(button);
		button = new GuiButton("5. DumpBot             ", 1, 218, 155, 50, () => this.dumpBotButton(), GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(4));
		this.addChild(button);
		button = new GuiButton("6. Catapult               ", 145, 38, 155, 50, () => this.catapultButton(), GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(5));
		this.addChild(button);
		button = new GuiButton("7. Home Movies      ", 145, 83, 155, 50, () => this.homeMovieButton(), GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(6));
		this.addChild(button);
		button = new GuiButton("9. New in IB2           ", 145, 173, 155, 50, () => this.newFeaturesButton(), GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(8));
		this.addChild(button);
		button = new GuiButton("10. Challenges         ", 145, 218, 155, 50, () => this.challengeEditorButton(), GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(9));
		this.addChild(button);

		button = new GuiButton("11. Monkey Bars       ", 1, 280, 155, 50, () => this.monkeyBarsButton(), GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(10));
		this.addChild(button);
		button = new GuiButton("12. Climb                   ", 1, 325, 155, 50, () => this.climbButton(), GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(11));
		this.addChild(button);
		button = new GuiButton("13. Bike Race            ", 145, 280, 155, 50, () => this.lunarButton(), GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(12));
		this.addChild(button);
		button = new GuiButton("14. Spaceships         ", 145, 325, 155, 50, () => this.cannonButton(), GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(13));
		this.addChild(button);

		format = new TextStyle();
		format.fontSize = 11;
		button = new GuiButton("8. Rube Goldberg       ", 145, 128, 155, 50, () => this.rubeGoldbergButton(), GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(7));
		this.addChild(button);

		format = new TextStyle();
		format.fontSize = 12;
		button = new GuiButton("Back", 106, 376, 100, 40, () => this.backButton(), GuiButton.PURPLE, format);
		this.addChild(button);
	}

	private backButton():void {
		this.visible = false;
		this.cont.fader2.visible = false;
	}

	private tankButton():void {
		Main.changeControllers = true;
		Main.nextControllerType = 10;
	}

	private shapeButton():void {
		Main.changeControllers = true;
		Main.nextControllerType = 11;
	}

	private carButton():void {
		Main.changeControllers = true;
		Main.nextControllerType = 12;
	}

	private jumpBotButton():void {
		Main.changeControllers = true;
		Main.nextControllerType = 13;
	}

	private dumpBotButton():void {
		Main.changeControllers = true;
		Main.nextControllerType = 14;
	}

	private catapultButton():void {
		Main.changeControllers = true;
		Main.nextControllerType = 15;
	}

	private homeMovieButton():void {
		var settings:SandboxSettings = new SandboxSettings(15.0, 1, 0, 0, 0);
		ControllerSandbox.settings = settings;
		Main.changeControllers = true;
		Main.nextControllerType = 16;
	}

	private rubeGoldbergButton():void {
		var settings:SandboxSettings = new SandboxSettings(15.0, 1, 0, 0, 0);
		ControllerSandbox.settings = settings;
		Main.changeControllers = true;
		Main.nextControllerType = 17;
	}

	private newFeaturesButton():void {
		var settings:SandboxSettings = new SandboxSettings(1.0, 0, 1, 5, 1);
		ControllerSandbox.settings = settings;
		Main.changeControllers = true;
		Main.nextControllerType = 18;
	}

	private challengeEditorButton():void {
		ControllerChallenge.challenge = null;
		var settings:SandboxSettings = new SandboxSettings(15.0, 0, 2, 0, 5);
		ControllerSandbox.settings = settings;
		Main.changeControllers = true;
		Main.nextControllerType = 19;
	}

	private monkeyBarsButton():void {
		ControllerChallenge.challenge = null;
		var settings:SandboxSettings = new SandboxSettings(15.0, 0, 2, 0, 0);
		ControllerSandbox.settings = settings;
		Main.changeControllers = true;
		Main.nextControllerType = 2;
	}

	private climbButton():void {
		ControllerChallenge.challenge = null;
		var settings:SandboxSettings = new SandboxSettings(15.0, 0, 2, 0, 3);
		ControllerSandbox.settings = settings;
		Main.changeControllers = true;
		Main.nextControllerType = 3;
	}

	private lunarButton():void {
		ControllerChallenge.challenge = null;
		var settings:SandboxSettings = new SandboxSettings(15.0, 0, 2, 0, 5);
		ControllerSandbox.settings = settings;
		Main.changeControllers = true;
		Main.nextControllerType = 4;
	}

	private cannonButton():void {
		ControllerChallenge.challenge = null;
		var settings:SandboxSettings = new SandboxSettings(15.0, 0, 2, 0, 1);
		ControllerSandbox.settings = settings;
		Main.changeControllers = true;
		Main.nextControllerType = 5;
	}
}
