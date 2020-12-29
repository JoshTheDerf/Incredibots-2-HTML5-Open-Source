import { Container, Sprite } from "pixi.js";
import { ControllerGame } from "../Game/ControllerGame";
import { Main } from "../Main";

export class Input {
	//======================
	// member data
	//======================
	// key text array
	static public ascii:Array<any>;
	static private keyState:Array<any>;
	static private keyArr:Array<any>;

	static private keyBuffer:Array<any>;
	static private bufferSize:number;

	// last key pressed
	static public lastKey:number = 0;
	static public timeSinceLastKey:number = 0;

	// mouse states
	static public mouseDown:boolean = false;
	static public mouseReleased:boolean = false;
	static public mousePressed:boolean = false;
	static public mouseOver:boolean = false;
	static public mouseWheelVal:number = 0;
	static public mouseX:number = 0;
	static public mouseY:number = 0;
	static public mouseOffsetX:number = 0;
	static public mouseOffsetY:number = 0;
	static public mouseDragX:number = 0;
	static public mouseDragY:number = 0;
	static public mouse:Sprite = new Sprite();

	// stage
	static public m_stageMc:Container;
	static public m_currController:ControllerGame;


	//======================
	// constructor
	//======================
	static public Init():void {

		Input.m_stageMc = Main.theRoot;

		// init ascii array
		Input.ascii = new Array(222)
		this.fillAscii();

		// init key state array
		Input.keyState = new Array(222);
		Input.keyArr = new Array();
		for (var i:number = 0; i < 222; i++){
			Input.keyState[i] = new int(0);
			if (Input.ascii[i] != undefined){
				Input.keyArr.push(i);
			}
		}

		// buffer
		Input.bufferSize = 5;
		Input.keyBuffer = new Array(Input.bufferSize);
		for (var j:number = 0; j < Input.bufferSize; j++){
			Input.keyBuffer[j] = new Array(0,0);
		}

		// add key listeners
		Input.m_stageMc.stage.addEventListener(KeyboardEvent.KEY_DOWN, this.keyPress, false, 0, true);
		Input.m_stageMc.stage.addEventListener(KeyboardEvent.KEY_UP, this.keyRelease, false, 0, true);

		// mouse listeners
		Input.m_stageMc.stage.addEventListener(MouseEvent.MOUSE_DOWN, this.mousePress, false, 0, true);
		Input.m_stageMc.stage.addEventListener(MouseEvent.MOUSE_UP, this.mouseRelease, false, 0, true);
		Input.m_stageMc.stage.addEventListener(MouseEvent.MOUSE_MOVE, this.mouseMove, false, 0, true);
		Input.m_stageMc.stage.addEventListener(MouseEvent.MOUSE_WHEEL, this.mouseWheel, false, 0, true);
		Input.m_stageMc.stage.addEventListener(Event.MOUSE_LEAVE, this.mouseLeave, false, 0, true);

		Input.mouse.graphics.lineStyle(0.1, 0, 100);
		Input.mouse.graphics.moveTo(0,0);
		Input.mouse.graphics.lineTo(0,0.1);
	}


	//======================
	// update
	//======================
	static public update():void{

		// array of used keys
		/*var kArr:Array<any> = new Array(
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
		for (var i:number = 0; i < Input.keyArr.length; i++){
			if (Input.keyState[Input.keyArr[i]] != 0){
				Input.keyState[Input.keyArr[i]]++;
			}
		}

		// update buffer
		for (var j:number = 0; j < Input.bufferSize; j++){
			Input.keyBuffer[j][1]++;
		}

		// end mouse release
		Input.mouseReleased = false;
		Input.mousePressed = false;
		Input.mouseOver = false;
	}



	//======================
	// mousePress listener
	//======================
	static public mousePress(e:MouseEvent):void{
		Input.mousePressed = true;
		Input.mouseDown = true;
		Input.mouseDragX = 0;
		Input.mouseDragY = 0;
		if (Input.m_currController) Input.m_currController.mouseClick(false);
	}


	static public mouseWheel(e:MouseEvent):void{
		Input.mouseWheelVal += e.delta;
	}


	//======================
	// mousePress listener
	//======================
	static public mouseRelease(e:MouseEvent):void{
		Input.mouseDown = false;
		Input.mouseReleased = true;
		if (Input.m_currController) Input.m_currController.mouseClick(true);
	}



	//======================
	// mousePress listener
	//======================
	static public mouseLeave(e:Event):void{
		Input.mouseReleased = Input.mouseDown;
		Input.mouseDown = false;
	}



	//======================
	// mouseMove listener
	//======================
	static public mouseMove(e:MouseEvent):void{

		// Fix mouse release not being registered from mouse going off stage
		/*if (mouseDown != e.buttonDown){
			mouseDown = e.buttonDown;
			mouseReleased = !e.buttonDown;
			mousePressed = e.buttonDown;
			mouseDragX = 0;
			mouseDragY = 0;
		}*/

		Input.mouseX = e.stageX - Input.m_stageMc.x;
		Input.mouseY = e.stageY - Input.m_stageMc.y;
		// Store offset
		Input.mouseOffsetX = Input.mouseX - Input.mouse.x;
		Input.mouseOffsetY = Input.mouseY - Input.mouse.y;
		// Update drag
		if (Input.mouseDown){
			Input.mouseDragX += Input.mouseOffsetX;
			Input.mouseDragY += Input.mouseOffsetY;
		}
		Input.mouse.x = Input.mouseX;
		Input.mouse.y = Input.mouseY;
		if (Input.m_currController) Input.m_currController.mouseMove(Input.mouseX, Input.mouseY);
		if (Main.m_curController is ControllerMainMenu) {
			Main.mouseCursor.x = Input.mouseX;
			Main.mouseCursor.y = Input.mouseY;
			Main.mouseHourglass.x = Input.mouseX;
			Main.mouseHourglass.y = Input.mouseY;
		}
	}



	//======================
	// getKeyHold
	//======================
	static public getKeyHold(k:number):number{
		return Math.max(0, Input.keyState[k]);
	}


	//======================
	// isKeyDown
	//======================
	static public isKeyDown(k:number):boolean{
		return (Input.keyState[k] > 0);
	}



	//======================
	//  isKeyPressed
	//======================
	static public isKeyPressed(k:number):boolean{
		Input.timeSinceLastKey = 0;
		return (Input.keyState[k] == 1);
	}



	//======================
	//  isKeyReleased
	//======================
	static public isKeyReleased(k:number):boolean{
		return (Input.keyState[k] == -1);
	}



	//======================
	// isKeyInBuffer
	//======================
	static public isKeyInBuffer(k:number, i:number, t:number):boolean{
		return (Input.keyBuffer[i][0] == k && Input.keyBuffer[i][1] <= t);
	}



	//======================
	// keyPress function
	//======================
	static public keyPress(e:KeyboardEvent):void{

		//strace ( e.keyCode + " : " + ascii[e.keyCode] );

		// set keyState
		Input.keyState[e.keyCode] = Math.max(Input.keyState[e.keyCode], 1);

		// last key (for key config)
		Input.lastKey = e.keyCode;

		if (Input.m_currController) Input.m_currController.keyPress(Input.lastKey, false);
	}

	//======================
	// keyRelease function
	//======================
	static public keyRelease(e:KeyboardEvent):void{
		Input.keyState[e.keyCode] = -1;

		// add to key buffer
		for (var i:number = Input.bufferSize-1; i > 0 ; i--){
			Input.keyBuffer[i] = Input.keyBuffer[i - 1];
		}
		Input.keyBuffer[0] = [e.keyCode, 0];

		if (Input.m_currController) Input.m_currController.keyPress(e.keyCode, true);
	}



	//======================
	// get key string
	//======================
	static public getKeyString(k:number):string{
		return Input.ascii[k];
	}


	//======================
	// set up ascii text
	//======================
	static private fillAscii():void{
		Input.ascii[65] = "A";
		Input.ascii[66] = "B";
		Input.ascii[67] = "C";
		Input.ascii[68] = "D";
		Input.ascii[69] = "E";
		Input.ascii[70] = "F";
		Input.ascii[71] = "G";
		Input.ascii[72] = "H";
		Input.ascii[73] = "I";
		Input.ascii[74] = "J";
		Input.ascii[75] = "K";
		Input.ascii[76] = "L";
		Input.ascii[77] = "M";
		Input.ascii[78] = "N";
		Input.ascii[79] = "O";
		Input.ascii[80] = "P";
		Input.ascii[81] = "Q";
		Input.ascii[82] = "R";
		Input.ascii[83] = "S";
		Input.ascii[84] = "T";
		Input.ascii[85] = "U";
		Input.ascii[86] = "V";
		Input.ascii[87] = "W";
		Input.ascii[88] = "X";
		Input.ascii[89] = "Y";
		Input.ascii[90] = "Z";
		Input.ascii[48] = "0";
		Input.ascii[49] = "1";
		Input.ascii[50] = "2";
		Input.ascii[51] = "3";
		Input.ascii[52] = "4";
		Input.ascii[53] = "5";
		Input.ascii[54] = "6";
		Input.ascii[55] = "7";
		Input.ascii[56] = "8";
		Input.ascii[57] = "9";
		Input.ascii[96] = "NP 0";
		Input.ascii[97] = "NP 1";
		Input.ascii[98] = "NP 2";
		Input.ascii[99] = "NP 3";
		Input.ascii[100] = "NP 4";
		Input.ascii[101] = "NP 5";
		Input.ascii[102] = "NP 6";
		Input.ascii[103] = "NP 7";
		Input.ascii[104] = "NP 8";
		Input.ascii[105] = "NP 9";
		Input.ascii[111] = "NP /";
		Input.ascii[106] = "NP *";
		Input.ascii[109] = "NP -";
		Input.ascii[107] = "NP +";
		Input.ascii[110] = "NP .";
		Input.ascii[112] = "F1";
		Input.ascii[113] = "F2";
		Input.ascii[114] = "F3";
		Input.ascii[115] = "F4";
		Input.ascii[116] = "F5";
		Input.ascii[117] = "F6";
		Input.ascii[118] = "F7";
		Input.ascii[119] = "F8";
		Input.ascii[120] = "F9";
		Input.ascii[122] = "F11";
		Input.ascii[123] = "F12";
		Input.ascii[124] = "F13";
		Input.ascii[125] = "F14";
		Input.ascii[126] = "F15";
		Input.ascii[32] = "Space";
		Input.ascii[17] = "Ctrl";
		Input.ascii[16] = "Shift";
		Input.ascii[20] = "Caps"
		Input.ascii[144] = "NumLk";
		Input.ascii[145] = "ScrLk";
		Input.ascii[192] = "~";
		Input.ascii[38] = "Up";
		Input.ascii[40] = "Down";
		Input.ascii[37] = "Left";
		Input.ascii[39] = "Right";
		Input.ascii[45] = "Ins";
		Input.ascii[46] = "Del";
		Input.ascii[33] = "PgUp";
		Input.ascii[34] = "PgDn";
		Input.ascii[35] = "End";
		Input.ascii[36] = "Home";
		Input.ascii[188] = ",";
		Input.ascii[190] = ".";
		Input.ascii[186] = ";";
		Input.ascii[222] = "'";
		Input.ascii[219] = "[";
		Input.ascii[221] = "]";
		Input.ascii[189] = "-";
		Input.ascii[187] = "=";
		Input.ascii[220] = "\\";
		Input.ascii[191] = "/";
		Input.ascii[9] = "Tab";
		Input.ascii[8] = "Bksp";
		Input.ascii[13] = "Enter";
		Input.ascii[19] = "Break";
		Input.ascii[27] = "ESC";
	}
}
