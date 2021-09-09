import { Text, TextStyle } from "pixi.js";
import { Controller, GuiButton, GuiTextArea, GuiWindow, Main } from "../imports";

export class ExportWindow extends GuiWindow
{
	private cont:Controller;
	private msgArea:Text;
	private linkArea:GuiTextArea;
	private okButton:GuiButton;
	private copyButton:GuiButton;

	constructor(contr:Controller, exportStr:string, robotStr:string)
	{
		super(244, 83, 312, 434, false);

		this.cont = contr;
		var format:TextStyle = new TextStyle();
		format.fontFamily = Main.GLOBAL_FONT;
		format.fill = 0x242930;
		this.msgArea = new Text('');
		this.msgArea.x = 15;
		this.msgArea.y = 25;
		this.msgArea.text = "The IncrediBots servers are going to be shut down\nsoon, thus saving to the servers has been disabled.\n\nInstead, you may export your " + robotStr + " to a file.\nTo do so, copy and paste the text below into a file;\nit can be restored by clicking \"Load\", then \"Import.\"\n\nNOTE: Make sure to do this with all of your\nimportant robots, replays, and challenges, as\nsoon this will be the only way to access them!";
		format.fontSize = 12;
		format.align = 'center';
		this.msgArea.style = format;
		this.addChild(this.msgArea);

		format = new TextStyle();
		format.fontSize = 10;
		this.linkArea = new GuiTextArea(15, 185, 265, 160, format);
		this.linkArea.text = exportStr;
		this.linkArea.textInput.text = exportStr;
		// this.linkArea.editable = false;
		this.linkArea.on('focus', () => this.linkAreaClicked())
		this.addChild(this.linkArea);

		this.okButton = new GuiButton("OK", 125, 385, 50, 30, () => this.cont.HideExportDialog(), GuiButton.PURPLE);
		this.addChild(this.okButton);
		this.copyButton = new GuiButton("Copy to Clipboard", 80, 350, 140, 35, () => this.copyButtonPressed(), GuiButton.ORANGE);
		this.addChild(this.copyButton);
	}

	private copyButtonPressed():void {
		this.linkArea.textInput.select();
		document.execCommand("copy");
	}

	private linkAreaClicked():void {
		this.linkArea.textInput.select();
	}
}
