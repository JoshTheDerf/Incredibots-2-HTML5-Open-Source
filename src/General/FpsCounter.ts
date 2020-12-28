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

import { Container, Text } from "pixi.js";



//===========================================================
// FPS COUNTER CLASS
//===========================================================
export class FpsCounter extends Container {

	//======================
	// constructor
	//======================
	constructor (){
		super()
		// create text field
		this.textBox = new Text("...");
		this.textBox.style.fill = "#aa1144";

		this.textBox2 = new Text("...");
		this.textBox2.width = 150;
		this.textBox2.style.fill = "#aa1144";
		this.textBox2.y = 15;

		this.textBox3 = new Text("...");
		this.textBox3.style.fill = "#aa1144";
		this.textBox3.y = 30;

		// set initial lastTime
		this.oldT = window.performance.now();

		this.addChild(this.textBox);
		this.addChild(this.textBox2);
		this.addChild(this.textBox3);
	}

	//======================
	// update function
	//======================
	public update():void{
		var newT:number = window.performance.now();
		var f1:number = newT-this.oldT;
		this.mfpsCount += f1;
		if (this.avgCount < 1){
			this.textBox.text = String(Math.round(1000/(this.mfpsCount/30))+" fps average");
			this.avgCount = 30;
			this.mfpsCount = 0;
		}
		this.avgCount--;
		this.oldT = window.performance.now();

		this.textBox3.text = Math.round(window.performance.memory.usedJSHeapSize/(1024*1024)) + " MB used"
	}


	public updatePhys(oldT2:number):void{
		var newT:number = window.performance.now();;
		var f1:number = newT-oldT2;
		this.mfpsCount2 += f1;
		if (this.avgCount2 < 1){
			this.textBox2.text = String("Physics step: "+Math.round(this.mfpsCount2/30)+" ms (" +Math.round(1000/(this.mfpsCount2/30))+" fps)");
			this.avgCount2 = 30;
			this.mfpsCount2 = 0;
		}
		this.avgCount2--;
	}


	//======================
	// private variables
	//======================
	private textBox:Text;
	private textBox2:Text;
	private textBox3:Text;
	private mfpsCount:number = 0;
	private mfpsCount2:number = 0;
	private avgCount:number = 30;
	private avgCount2:number = 30;
	private oldT:number;
}
