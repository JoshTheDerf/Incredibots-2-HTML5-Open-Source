import { Application, Container, Sprite } from "pixi.js";
import { ControllerGame } from "../Game/ControllerGame";
import { ControllerMainMenu } from "../Game/ControllerMainMenu";
import { Main } from "../Main";

export class Input {
	//======================
	// member data
	//======================
	// key text array
	public static ascii:Array<any>;
	private static keyState:Array<any>;
	private static keyArr:Array<any>;

	private static keyBuffer:Array<any>;
	private static bufferSize:number;

	// last key pressed
	public static lastKey:number = 0;
	public static timeSinceLastKey:number = 0;

	// mouse states
	public static mouseDown:boolean = false;
	public static mouseReleased:boolean = false;
	public static mousePressed:boolean = false;
	public static mouseOver:boolean = false;
	public static mouseWheelVal:number = 0;
	public static mouseX:number = 0;
	public static mouseY:number = 0;
	public static mouseOffsetX:number = 0;
	public static mouseOffsetY:number = 0;
	public static mouseDragX:number = 0;
	public static mouseDragY:number = 0;

	// stage
	public static renderer: Application;
	public static m_stageMc:Container;
	public static m_currController:ControllerGame;


	//======================
	// constructor
	//======================
	public static Init():void {

		Input.renderer = Main.renderer;
		Input.m_stageMc = Main.theRoot;

		// init ascii array
		Input.ascii = new Array(222)
		this.fillAscii();

		// init key state array
		Input.keyState = new Array(222);
		Input.keyArr = new Array();
		for (var i:number = 0; i < 222; i++){
			Input.keyState[i] = 0;
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
		Input.renderer.view.tabIndex = -1
		Input.renderer.view.addEventListener('keydown', (event: any) => this.keyPress(event));
		Input.renderer.view.addEventListener('keyup', (event: any) => this.keyRelease(event));

		// mouse listeners
		Input.m_stageMc.on('mousedown', (event: any) => this.mousePress(event))
		Input.m_stageMc.on('mouseup', (event: any) => this.mouseRelease(event))
		Input.m_stageMc.on('mousemove', (event: any) => this.mouseMove(event))
		Input.m_stageMc.on('mousewheel', (event: any) => this.mouseWheel(event))
		Input.m_stageMc.on('mouseout', (event: any) => this.mouseLeave(event))
	}


	//======================
	// update
	//======================
	public static update():void{

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
	public static mousePress(e:MouseEvent):void{
		Input.mousePressed = true;
		Input.mouseDown = true;
		Input.mouseDragX = 0;
		Input.mouseDragY = 0;
		if (Input.m_currController) Input.m_currController.mouseClick(false);
	}


	public static mouseWheel(e:MouseEvent):void{
		Input.mouseWheelVal += e.delta;
	}


	//======================
	// mousePress listener
	//======================
	public static mouseRelease(e:MouseEvent):void{
		Input.mouseDown = false;
		Input.mouseReleased = true;
		if (Input.m_currController) Input.m_currController.mouseClick(true);
	}



	//======================
	// mousePress listener
	//======================
	public static mouseLeave(e:Event):void{
		Input.mouseReleased = Input.mouseDown;
		Input.mouseDown = false;
	}



	//======================
	// mouseMove listener
	//======================
	public static mouseMove(e:MouseEvent):void{

		// Fix mouse release not being registered from mouse going off stage
		/*if (mouseDown != e.buttonDown){
			mouseDown = e.buttonDown;
			mouseReleased = !e.buttonDown;
			mousePressed = e.buttonDown;
			mouseDragX = 0;
			mouseDragY = 0;
		}*/

		Input.mouseX = e.data.global.x - Input.m_stageMc.x;
		Input.mouseY = e.data.global.y - Input.m_stageMc.y;
		// Store offset
		// Input.mouseOffsetX = Input.mouseX - Input.mouse.x;
		// Input.mouseOffsetY = Input.mouseY - Input.mouse.y;
		// Update drag
		if (Input.mouseDown){
			Input.mouseDragX += Input.mouseOffsetX;
			Input.mouseDragY += Input.mouseOffsetY;
		}
		if (Input.m_currController) Input.m_currController.mouseMove(Input.mouseX, Input.mouseY);
	}



	//======================
	// getKeyHold
	//======================
	public static getKeyHold(k:number):number{
		return Math.max(0, Input.keyState[k]);
	}


	//======================
	// isKeyDown
	//======================
	public static isKeyDown(k:number):boolean{
		return (Input.keyState[k] > 0);
	}



	//======================
	//  isKeyPressed
	//======================
	public static isKeyPressed(k:number):boolean{
		Input.timeSinceLastKey = 0;
		return (Input.keyState[k] == 1);
	}



	//======================
	//  isKeyReleased
	//======================
	public static isKeyReleased(k:number):boolean{
		return (Input.keyState[k] == -1);
	}



	//======================
	// isKeyInBuffer
	//======================
	public static isKeyInBuffer(k:number, i:number, t:number):boolean{
		return (Input.keyBuffer[i][0] == k && Input.keyBuffer[i][1] <= t);
	}



	//======================
	// keyPress function
	//======================
	public static keyPress(e:KeyboardEvent):void{

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
	public static keyRelease(e:KeyboardEvent):void{
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
	public static getKeyString(k:number):string{
		return Input.ascii[k];
	}


	//======================
	// set up ascii text
	//======================
	private static fillAscii():void{
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
