import { Controller, ControllerChallenge, ControllerGame, ControllerGameGlobals, GuiButton, GuiWindow, Main } from "../imports";
import { Text, TextStyle } from 'pixi.js';

export class DialogWindow extends GuiWindow
{
	private cont:Controller;
	private msgArea:Text;
	private timer:any;

	constructor(contr:Controller, msg:string, center:boolean = false, okButton:boolean = false, big:boolean = false) {
		super(300, 200, 200, 100 + (big ? 20 : 0));
		this.cont = contr;

		var numChars:number = msg.length;
		var i:number = 0;
		while (numChars > 31) {
			var spaceIndex:number = msg.substring(0, i + 31).lastIndexOf(" ");
			msg = msg.substring(0, spaceIndex) + "\n" + msg.substring(spaceIndex + 1);
			if (big) {
				numChars = msg.length - spaceIndex;
				i = spaceIndex;
			} else {
				numChars -= spaceIndex;
				i += spaceIndex;
			}
		}

		this.msgArea = new Text('');
		this.msgArea.x = 13;
		this.msgArea.y = 15;
		this.msgArea.text = msg;
		var format:TextStyle = new TextStyle();
		if (center) format.align = 'center';
		format.fill = 0x242930;
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 12;
		format.wordWrap = true
		format.wordWrapWidth = 178;
		this.msgArea.style = format;
		this.addChild(this.msgArea);

		if (okButton) {
			var b = new GuiButton("OK", 75, 57, 50, 30, () => this.cont.DialogOK(), GuiButton.PURPLE);
			this.addChild(b);
		} else {
			let count = 0;
			this.timer = setInterval(() => {
				count++
				if (count === 15) {
					this.StopTimer()
					return
				}

				this.TimerDotHandler()
			}, 1000)
		}
	}

	private TimerDotHandler():void {
		this.msgArea.text += ".";
	}

	private TimerHideHandler():void {
		this.StopTimer();
		this.visible = false;
	}

	public StopTimer():void {
		if (this.timer) {
			clearInterval(this.timer)
			this.timer = null
		}
	}

	public ShowOKButton():void {
		var b = new GuiButton("OK", 75, 57, 50, 30, () => this.cont.HideDialog(), GuiButton.PURPLE);
		this.addChild(b);
	}

	public ShowOKAndCancelButton(type:number):void {
		var b = new GuiButton("OK", 40, 57 + (type == 8 ? 20 : 0), 50, 30, () => (
			type == 0 ? (this.cont as ControllerGame).ConfirmSaveRobot() : (
				type == 1 ? (this.cont as ControllerGame).ConfirmSaveReplay() : (
					type == 2 ? this.cont.ConfirmDeleteRobot() : (
						type == 3 ? this.cont.ConfirmDeleteReplay() : (
							type == 4 ? (this.cont as ControllerGame).ConfirmNewRobot() : (
								type == 5 ? this.BrowserRedirect() : (
									type == 6 ? this.BrowserRedirect2() : (
										type == 7 ? this.BrowserRedirect3() : (
											type == 8 ? this.BrowserRedirect4() : (
												type == 9 ? (this.cont as ControllerGame).ConfirmSaveChallenge() : (
													type == 10 ? this.cont.ConfirmDeleteChallenge() : (
														type == 11 ? this.editButton() : this.cont.ConfirmLogout()
													)
												)
											)
										)
									)
								)
							)
						)
					)
				)
			)
		), GuiButton.PURPLE);
		this.addChild(b);
		b = new GuiButton("Cancel", 100, 57 + (type == 8 ? 20 : 0), 60, 30, () => this.cont.HideConfirmDialog(), GuiButton.PURPLE);
		this.addChild(b);
		this.StopTimer()
	}

	public ShowBuildBoxButtons():void {
		var b = new GuiButton("Keep", 25, 80, 70, 35, () => this.cont.HideConfirmDialog(), GuiButton.PURPLE);
		this.addChild(b);
		b = new GuiButton("Delete", 95, 80, 80, 35, () => (this.cont as ControllerChallenge).DeleteBuildBoxes(), GuiButton.PURPLE);
		this.addChild(b);
		this.StopTimer()
	}

	public SetMessage(msg:string, isError:boolean = false):void {
		this.msgArea.text = msg;
		if (isError) {
			var format:TextStyle = new TextStyle();
			format.fontSize = 10;
			format.wordWrap = true;
			this.msgArea.style = format;
		}
	}

	private editButton():void {
		(this.cont as ControllerGame).editButton(true);
	}

	public GetMessage():string {
		return this.msgArea.text;
	}

	public HideInXSeconds(secs:number):void {
		setTimeout(() => {
			this.TimerHideHandler()
		}, 1000 * secs)
	}

	private BrowserRedirect():void {
		Main.BrowserRedirect();
	}

	private BrowserRedirect2():void {
		if (Main.inIFrame) Main.BrowserRedirect("http://incredibots.com/old/" + ControllerGameGlobals.replay.version + "/incredibots.php?replayID=" + ControllerGameGlobals.potentialReplayID);
		else Main.BrowserRedirect("http://incredibots.com/old/" + ControllerGameGlobals.replay.version + "/?replayID=" + ControllerGameGlobals.potentialReplayID);
	}

	private BrowserRedirect3():void {
		Main.BrowserRedirect(null, false, true);
	}

	private BrowserRedirect4():void {
		Main.BrowserRedirect("http://www.incredifriends.com/", true);
		this.cont.HideConfirmDialog();
	}
}
