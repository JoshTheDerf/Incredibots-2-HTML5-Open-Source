//===========================================================
//=========================================================//
//						-=ANTHEM=-
//	file: .as
//
//	copyright: Matthew Bush 2007
//
//	notes:
//
//=========================================================//
//===========================================================


//===========================================================
// Input class
//===========================================================
package General{
	
	
	
	import Game.ControllerGame;
	import Game.ControllerMainMenu;
	
	import flash.display.*;
	import flash.events.*;
	
	
	public class Input {
		
		//======================
		// member data
		//======================
		// key text array
		static public var ascii:Array;
		static private var keyState:Array;
		static private var keyArr:Array;
		
		static private var keyBuffer:Array;
		static private var bufferSize:int;
		
		// last key pressed
		static public var lastKey:int = 0;
		static public var timeSinceLastKey:int = 0;
		
		// mouse states
		static public var mouseDown:Boolean = false;
		static public var mouseReleased:Boolean = false;
		static public var mousePressed:Boolean = false;
		static public var mouseOver:Boolean = false;
		static public var mouseWheelVal:Number = 0;
		static public var mouseX:Number = 0;
		static public var mouseY:Number = 0;
		static public var mouseOffsetX:Number = 0;
		static public var mouseOffsetY:Number = 0;
		static public var mouseDragX:Number = 0;
		static public var mouseDragY:Number = 0;
		static public var mouse:Sprite = new Sprite();
		
		// stage
		static public var m_stageMc:Sprite;
		static public var m_currController:ControllerGame;
		
		
		//======================
		// constructor
		//======================
		static public function Init():void {
			
			m_stageMc = Main.theRoot;
			
			// init ascii array
			ascii = new Array(222)
			fillAscii();
			
			// init key state array
			keyState = new Array(222);
			keyArr = new Array();
			for (var i:int = 0; i < 222; i++){
				keyState[i] = new int(0);
				if (ascii[i] != undefined){
					keyArr.push(i);
				}
			}
			
			// buffer
			bufferSize = 5;
			keyBuffer = new Array(bufferSize);
			for (var j:int = 0; j < bufferSize; j++){
				keyBuffer[j] = new Array(0,0);
			}
			
			// add key listeners
			m_stageMc.stage.addEventListener(KeyboardEvent.KEY_DOWN, keyPress, false, 0, true);
			m_stageMc.stage.addEventListener(KeyboardEvent.KEY_UP, keyRelease, false, 0, true);		
			
			// mouse listeners
			m_stageMc.stage.addEventListener(MouseEvent.MOUSE_DOWN, mousePress, false, 0, true);
			m_stageMc.stage.addEventListener(MouseEvent.MOUSE_UP, mouseRelease, false, 0, true);
			m_stageMc.stage.addEventListener(MouseEvent.MOUSE_MOVE, mouseMove, false, 0, true);
			m_stageMc.stage.addEventListener(MouseEvent.MOUSE_WHEEL, mouseWheel, false, 0, true);
			m_stageMc.stage.addEventListener(Event.MOUSE_LEAVE, mouseLeave, false, 0, true);
			
			mouse.graphics.lineStyle(0.1, 0, 100);
			mouse.graphics.moveTo(0,0);
			mouse.graphics.lineTo(0,0.1);
		}
		
	
		//======================
		// update
		//======================
		static public function update():void{
			
			// array of used keys
			/*var kArr:Array = new Array(
				Globals.keyP1Up,
				Globals.keyP1Down,
				Globals.keyP1Left,
				Globals.keyP1Right,
				Globals.keyP1Attack1,
				Globals.keyP1Attack2,
				Globals.keyP1Jump,
				Globals.keyP1Defend,
				Globals.keyResetGame,
				Globals.keyInvertBg,
				Globals.keyChangeBg,
				Globals.keyPauseGame);*/
				
			// update used keys
			for (var i:int = 0; i < keyArr.length; i++){
				if (keyState[keyArr[i]] != 0){
					keyState[keyArr[i]]++;
				}
			}
			
			// update buffer
			for (var j:int = 0; j < bufferSize; j++){
				keyBuffer[j][1]++;
			}
			
			// end mouse release
			mouseReleased = false;
			mousePressed = false;
			mouseOver = false;
		}
		
		
		
		//======================
		// mousePress listener
		//======================
		static public function mousePress(e:MouseEvent):void{
			mousePressed = true;
			mouseDown = true;
			mouseDragX = 0;
			mouseDragY = 0;
			if (m_currController) m_currController.mouseClick(false);
		}
		
		
		static public function mouseWheel(e:MouseEvent):void{
			mouseWheelVal += e.delta;
		}
		
		
		//======================
		// mousePress listener
		//======================
		static public function mouseRelease(e:MouseEvent):void{
			mouseDown = false;
			mouseReleased = true;
			if (m_currController) m_currController.mouseClick(true);
		}
		
		
		
		//======================
		// mousePress listener
		//======================
		static public function mouseLeave(e:Event):void{
			mouseReleased = mouseDown;
			mouseDown = false;
		}
		
		
		
		//======================
		// mouseMove listener
		//======================
		static public function mouseMove(e:MouseEvent):void{
			
			// Fix mouse release not being registered from mouse going off stage
			/*if (mouseDown != e.buttonDown){
				mouseDown = e.buttonDown;
				mouseReleased = !e.buttonDown;
				mousePressed = e.buttonDown;
				mouseDragX = 0;
				mouseDragY = 0;
			}*/
			
			mouseX = e.stageX - m_stageMc.x;
			mouseY = e.stageY - m_stageMc.y;
			// Store offset
			mouseOffsetX = mouseX - mouse.x;
			mouseOffsetY = mouseY - mouse.y;
			// Update drag
			if (mouseDown){
				mouseDragX += mouseOffsetX;
				mouseDragY += mouseOffsetY;
			}
			mouse.x = mouseX;
			mouse.y = mouseY;
			if (m_currController) m_currController.mouseMove(mouseX, mouseY);
			if (Main.m_curController is ControllerMainMenu) {
				Main.mouseCursor.x = mouseX;
				Main.mouseCursor.y = mouseY;
				Main.mouseHourglass.x = mouseX;
				Main.mouseHourglass.y = mouseY;
			}
		}
		
		
		
		//======================
		// getKeyHold
		//======================
		static public function getKeyHold(k:int):int{
			return Math.max(0, keyState[k]);
		}
		
		
		//======================
		// isKeyDown
		//======================
		static public function isKeyDown(k:int):Boolean{
			return (keyState[k] > 0);
		}
		
		
		
		//======================
		//  isKeyPressed
		//======================
		static public function isKeyPressed(k:int):Boolean{
			timeSinceLastKey = 0;
			return (keyState[k] == 1);
		}
		
		
		
		//======================
		//  isKeyReleased
		//======================
		static public function isKeyReleased(k:int):Boolean{
			return (keyState[k] == -1);
		}
		
		
		
		//======================
		// isKeyInBuffer
		//======================
		static public function isKeyInBuffer(k:int, i:int, t:int):Boolean{
			return (keyBuffer[i][0] == k && keyBuffer[i][1] <= t);
		}
		
		
		
		//======================
		// keyPress function
		//======================
		static public function keyPress(e:KeyboardEvent):void{
			
			//strace ( e.keyCode + " : " + ascii[e.keyCode] );
			
			// set keyState
			keyState[e.keyCode] = Math.max(keyState[e.keyCode], 1);
			
			// last key (for key config)
			lastKey = e.keyCode;
			
			if (m_currController) m_currController.keyPress(lastKey, false);
		}
		
		//======================
		// keyRelease function
		//======================
		static public function keyRelease(e:KeyboardEvent):void{
			keyState[e.keyCode] = -1;
			
			// add to key buffer
			for (var i:int = bufferSize-1; i > 0 ; i--){
				keyBuffer[i] = keyBuffer[i - 1];
			}
			keyBuffer[0] = [e.keyCode, 0];
			
			if (m_currController) m_currController.keyPress(e.keyCode, true);
		}
		
		
		
		//======================
		// get key string
		//======================
		static public function getKeyString(k:uint):String{
			return ascii[k];
		}
		
		
		//======================
		// set up ascii text
		//======================
		static private function fillAscii():void{
			ascii[65] = "A";
			ascii[66] = "B";
			ascii[67] = "C";
			ascii[68] = "D";
			ascii[69] = "E";
			ascii[70] = "F";
			ascii[71] = "G";
			ascii[72] = "H";
			ascii[73] = "I";
			ascii[74] = "J";
			ascii[75] = "K";
			ascii[76] = "L";
			ascii[77] = "M";
			ascii[78] = "N";
			ascii[79] = "O";
			ascii[80] = "P";
			ascii[81] = "Q";
			ascii[82] = "R";
			ascii[83] = "S";
			ascii[84] = "T";
			ascii[85] = "U";
			ascii[86] = "V";
			ascii[87] = "W";
			ascii[88] = "X";
			ascii[89] = "Y";
			ascii[90] = "Z";
			ascii[48] = "0";
			ascii[49] = "1";
			ascii[50] = "2";
			ascii[51] = "3";
			ascii[52] = "4";
			ascii[53] = "5";
			ascii[54] = "6";
			ascii[55] = "7";
			ascii[56] = "8";
			ascii[57] = "9";
			ascii[96] = "NP 0";
			ascii[97] = "NP 1";
			ascii[98] = "NP 2";
			ascii[99] = "NP 3";
			ascii[100] = "NP 4";
			ascii[101] = "NP 5";
			ascii[102] = "NP 6";
			ascii[103] = "NP 7";
			ascii[104] = "NP 8";
			ascii[105] = "NP 9";
			ascii[111] = "NP /";
			ascii[106] = "NP *";
			ascii[109] = "NP -";
			ascii[107] = "NP +";
			ascii[110] = "NP .";
			ascii[112] = "F1";
			ascii[113] = "F2";
			ascii[114] = "F3";
			ascii[115] = "F4";
			ascii[116] = "F5";
			ascii[117] = "F6";
			ascii[118] = "F7";
			ascii[119] = "F8";
			ascii[120] = "F9";
			ascii[122] = "F11";
			ascii[123] = "F12";
			ascii[124] = "F13";
			ascii[125] = "F14";
			ascii[126] = "F15";
			ascii[32] = "Space";
			ascii[17] = "Ctrl";
			ascii[16] = "Shift";
			ascii[20] = "Caps"
			ascii[144] = "NumLk";
			ascii[145] = "ScrLk";
			ascii[192] = "~";
			ascii[38] = "Up";
			ascii[40] = "Down";
			ascii[37] = "Left";
			ascii[39] = "Right";
			ascii[45] = "Ins";
			ascii[46] = "Del";
			ascii[33] = "PgUp";
			ascii[34] = "PgDn";
			ascii[35] = "End";
			ascii[36] = "Home";
			ascii[188] = ",";
			ascii[190] = ".";
			ascii[186] = ";";
			ascii[222] = "'";
			ascii[219] = "[";
			ascii[221] = "]";
			ascii[189] = "-";
			ascii[187] = "=";
			ascii[220] = "\\";
			ascii[191] = "/";
			ascii[9] = "Tab";
			ascii[8] = "Bksp";
			ascii[13] = "Enter";
			ascii[19] = "Break";
			ascii[27] = "ESC";
		}
	}
}



// End of file
//===========================================================
//===========================================================

