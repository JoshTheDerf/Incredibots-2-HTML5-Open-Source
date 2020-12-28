package Gui
{
	import Game.*;
	
	import General.LSOManager;
	
	import flash.events.MouseEvent;
	import flash.text.*;
	
	public class TutorialSelectWindow extends GuiWindow
	{
		private var cont:ControllerMainMenu;
		
		public function TutorialSelectWindow(contr:ControllerMainMenu)
		{
			cont = contr;
			
			var format:TextFormat = new TextFormat();
			format.size = 20;
			format.font = Main.GLOBAL_FONT;
			format.align = TextFormatAlign.CENTER;
			var header:TextField = new TextField();
			header.text = "Choose a Level:";
			header.setTextFormat(format);
			header.width = 312;
			header.x = 0;
			header.y = 12;
			header.selectable = false;
			addChild(header);
			
			format = new TextFormat();
			format.size = 12;
			var button:GuiButton = new GuiButton("1. Drive a Tank!       ", 1, 38, 155, 50, tankButton, GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(0));
			addChild(button);
			button = new GuiButton("2. Shape Up            ", 1, 83, 155, 50, shapeButton, GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(1));
			addChild(button);
			button = new GuiButton("3. Car Creation       ", 1, 128, 155, 50, carButton, GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(2));
			addChild(button);
			button = new GuiButton("4. JumpBot              ", 1, 173, 155, 50, jumpBotButton, GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(3));
			addChild(button);
			button = new GuiButton("5. DumpBot             ", 1, 218, 155, 50, dumpBotButton, GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(4));
			addChild(button);
			button = new GuiButton("6. Catapult               ", 145, 38, 155, 50, catapultButton, GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(5));
			addChild(button);
			button = new GuiButton("7. Home Movies      ", 145, 83, 155, 50, homeMovieButton, GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(6));
			addChild(button);
			button = new GuiButton("9. New in IB2           ", 145, 173, 155, 50, newFeaturesButton, GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(8));
			addChild(button);
			button = new GuiButton("10. Challenges         ", 145, 218, 155, 50, challengeEditorButton, GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(9));
			addChild(button);
			
			button = new GuiButton("11. Monkey Bars       ", 1, 280, 155, 50, monkeyBarsButton, GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(10));
			addChild(button);
			button = new GuiButton("12. Climb                   ", 1, 325, 155, 50, climbButton, GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(11));
			addChild(button);
			button = new GuiButton("13. Bike Race            ", 145, 280, 155, 50, lunarButton, GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(12));
			addChild(button);
			button = new GuiButton("14. Spaceships         ", 145, 325, 155, 50, cannonButton, GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(13));
			addChild(button);
			
			format = new TextFormat();
			format.size = 11;
			button = new GuiButton("8. Rube Goldberg       ", 145, 128, 155, 50, rubeGoldbergButton, GuiButton.ORANGE, format, true, LSOManager.IsLevelDone(7));
			addChild(button);
			
			format = new TextFormat();
			format.size = 12;
			button = new GuiButton("Back", 106, 376, 100, 40, backButton, GuiButton.PURPLE, format);
			addChild(button);
			
			super(249, 83, 312, 434);
		}

		private function backButton(e:MouseEvent):void {
			visible = false;
			cont.fader2.visible = false;
		}

		private function tankButton(e:MouseEvent):void {
			Main.changeControllers = true;
			Main.nextControllerType = 10;
		}
		
		private function shapeButton(e:MouseEvent):void {
			Main.changeControllers = true;
			Main.nextControllerType = 11;
		}
		
		private function carButton(e:MouseEvent):void {
			Main.changeControllers = true;
			Main.nextControllerType = 12;
		}
		
		private function jumpBotButton(e:MouseEvent):void {
			Main.changeControllers = true;
			Main.nextControllerType = 13;
		}
		
		private function dumpBotButton(e:MouseEvent):void {
			Main.changeControllers = true;
			Main.nextControllerType = 14;
		}
		
		private function catapultButton(e:MouseEvent):void {
			Main.changeControllers = true;
			Main.nextControllerType = 15;
		}
		
		private function homeMovieButton(e:MouseEvent):void {
			var settings:SandboxSettings = new SandboxSettings(15.0, 1, 0, 0, 0);
			ControllerSandbox.settings = settings;
			Main.changeControllers = true;
			Main.nextControllerType = 16;
		}
		
		private function rubeGoldbergButton(e:MouseEvent):void {
			var settings:SandboxSettings = new SandboxSettings(15.0, 1, 0, 0, 0);
			ControllerSandbox.settings = settings;
			Main.changeControllers = true;
			Main.nextControllerType = 17;
		}
		
		private function newFeaturesButton(e:MouseEvent):void {
			var settings:SandboxSettings = new SandboxSettings(1.0, 0, 1, 5, 1);
			ControllerSandbox.settings = settings;
			Main.changeControllers = true;
			Main.nextControllerType = 18;
		}
		
		private function challengeEditorButton(e:MouseEvent):void {
			ControllerChallenge.challenge = null;
			var settings:SandboxSettings = new SandboxSettings(15.0, 0, 2, 0, 5);
			ControllerSandbox.settings = settings;
			Main.changeControllers = true;
			Main.nextControllerType = 19;
		}
		
		private function monkeyBarsButton(e:MouseEvent):void {
			ControllerChallenge.challenge = null;
			var settings:SandboxSettings = new SandboxSettings(15.0, 0, 2, 0, 0);
			ControllerSandbox.settings = settings;
			Main.changeControllers = true;
			Main.nextControllerType = 2;
		}
		
		private function climbButton(e:MouseEvent):void {
			ControllerChallenge.challenge = null;
			var settings:SandboxSettings = new SandboxSettings(15.0, 0, 2, 0, 3);
			ControllerSandbox.settings = settings;
			Main.changeControllers = true;
			Main.nextControllerType = 3;
		}
		
		private function lunarButton(e:MouseEvent):void {
			ControllerChallenge.challenge = null;
			var settings:SandboxSettings = new SandboxSettings(15.0, 0, 2, 0, 5);
			ControllerSandbox.settings = settings;
			Main.changeControllers = true;
			Main.nextControllerType = 4;
		}
		
		private function cannonButton(e:MouseEvent):void {
			ControllerChallenge.challenge = null;
			var settings:SandboxSettings = new SandboxSettings(15.0, 0, 2, 0, 1);
			ControllerSandbox.settings = settings;
			Main.changeControllers = true;
			Main.nextControllerType = 5;
		}
	}
}