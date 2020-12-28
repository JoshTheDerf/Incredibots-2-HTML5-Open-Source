package Gui
{
	import Game.Graphics.Resource;
	
	import fl.controls.Button;
	
	import flash.events.MouseEvent;
	import flash.media.*;
	import flash.text.TextFormat;
	
	import mx.core.BitmapAsset;

	public class GuiButton extends Button
	{
		public static var PURPLE:int = 0;
		public static var RED:int = 1;
		public static var BLUE:int = 2;
		public static var PINK:int = 3;
		public static var ORANGE:int = 4;
		public static var PLAY:int = 5;
		public static var X:int = 6;
		
		public static var rolloverSound:Sound = new Resource.cRoll();
		public static var clickSound:Sound = new Resource.cClick();
		public static var channel:SoundChannel;
		private static var lastRolloverFrame:int = 0;
		
		private var sCheckbox:BitmapAsset = null;
		
		private var buttonOffset:Boolean = false;
		public var depressed:Boolean = false;
		
		public function GuiButton(text:String, xPos:Number, yPos:Number, w:Number, h:Number, clickListener:Function, colour:int, format:TextFormat = null, addCheckbox:Boolean = false, checkboxSelected:Boolean = false)
		{
			label = text;
			width = w;
			height = h;
			x = xPos;
			y = yPos;
			addEventListener(MouseEvent.CLICK, clickListener, false, 0, true);
			addEventListener(MouseEvent.MOUSE_DOWN, bDown, false, 0, true);
			addEventListener(MouseEvent.CLICK, bUp, false, 0, true);
			addEventListener(MouseEvent.MOUSE_OUT, bUp, false, 0, true);
			addEventListener(MouseEvent.MOUSE_OVER, mouseOver, false, 0, true);
			addEventListener(MouseEvent.CLICK, mouseClick, false, 0, true);
			if (colour == PURPLE) {
				setStyle("upSkin", purpleButtonBase());
				setStyle("overSkin", purpleButtonRoll());
				setStyle("downSkin", purpleButtonClick());
			} else if (colour == RED) {
				setStyle("upSkin", redButtonBase());
				setStyle("overSkin", redButtonRoll());
				setStyle("downSkin", redButtonClick());
			} else if (colour == BLUE) {
				setStyle("upSkin", blueButtonBase());
				setStyle("overSkin", blueButtonRoll());
				setStyle("downSkin", blueButtonClick());
			} else if (colour == PINK) {
				setStyle("upSkin", pinkButtonBase());
				setStyle("overSkin", pinkButtonRoll());
				setStyle("downSkin", pinkButtonClick());
			} else if (colour == ORANGE) {
				setStyle("upSkin", orangeButtonBase());
				setStyle("overSkin", orangeButtonRoll());
				setStyle("downSkin", orangeButtonClick());
			} else if (colour == PLAY) {
				setStyle("upSkin", playButtonBase());
				setStyle("overSkin", playButtonRoll());
				setStyle("downSkin", playButtonClick());
			} else if (colour == X) {
				setStyle("upSkin", xButtonBase());
				setStyle("overSkin", xButtonRoll());
				setStyle("downSkin", xButtonClick());
			}
			if (!format) {
				format = new TextFormat();
				format.size = 11;
			}
			format.color = 0x573D40;
			format.font = Main.GLOBAL_FONT;
			setStyle("textFormat", format);
			if (addCheckbox) {
				if (checkboxSelected) {
					sCheckbox = new Resource.cLevelSelectLevelCheckBoxB();
				} else {
					sCheckbox = new Resource.cLevelSelectLevelCheckBoxA();
				}
				sCheckbox.x = 110;
				sCheckbox.y = 12;
				sCheckbox.smoothing = true;
				addChild(sCheckbox);
			}
		}
		
		public function SetState(down:Boolean):void {
			if (down) {
				setMouseState("down");
				if (!buttonOffset) {
					x += 2;
					y += 2;
					buttonOffset = true;
				}
				depressed = true;
			} else {
				setMouseState("up");
				if (buttonOffset) {
					x -= 2;
					y -= 2;
					buttonOffset = false;
				}
				depressed = false;
			}
		}
		
		private function bDown(e:MouseEvent):void {
			if (!e.target.buttonOffset) {
				e.target.x += 2;
				e.target.y += 2;
				e.target.buttonOffset = true;
			}
		}
		
		private function bUp(e:MouseEvent):void {
			if (e.target.buttonOffset) {
				e.target.x -= 2;
				e.target.y -= 2;
				e.target.buttonOffset = false;
			}
		}
		
		private function mouseOver(e:MouseEvent):void {
			if (Main.enableSound && lastRolloverFrame != Main.frameCounter) {
				channel = rolloverSound.play();
				var st:SoundTransform = new SoundTransform(0.3);
				channel.soundTransform = st;
				lastRolloverFrame = Main.frameCounter;
			}
		}
		
		private function mouseClick(e:MouseEvent):void {
			if (Main.enableSound) {
				channel = clickSound.play();
				var st:SoundTransform = new SoundTransform(0.8);
				channel.soundTransform = st;
			}
		}
		
		public static function redButtonBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonRedBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function redButtonRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonRedRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function redButtonClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonRedClick();
			bm.smoothing = true;
			return bm;
		}
		
		public static function blueButtonBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonBlueBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function blueButtonRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonBlueRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function blueButtonClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonBlueClick();
			bm.smoothing = true;
			return bm;
		}
		
		public static function purpleButtonBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonPurpleBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function purpleButtonRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonPurpleRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function purpleButtonClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonPurpleClick();
			bm.smoothing = true;
			return bm;
		}
		
		public static function pinkButtonBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonPinkBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function pinkButtonRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonPinkRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function pinkButtonClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonPinkClick();
			bm.smoothing = true;
			return bm;
		}
		
		public static function orangeButtonBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonOrangeBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function orangeButtonRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonOrangeRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function orangeButtonClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonOrangeClick();
			bm.smoothing = true;
			return bm;
		}
		
		public static function playButtonBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonPlayBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function playButtonRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonPlayRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function playButtonClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonPlayClick();
			bm.smoothing = true;
			return bm;
		}
		
		public static function xButtonBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonXBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function xButtonRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonXRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function xButtonClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiButtonXClick();
			bm.smoothing = true;
			return bm;
		}
	}
}