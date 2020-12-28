package Gui
{
	import Game.Controller;
	
	import General.Database;
	
	import fl.controls.*;
	
	import flash.events.Event;
	import flash.events.MouseEvent;
	import flash.system.System;
	import flash.text.*;
	
	public class LinkWindow extends GuiWindow
	{
		private var cont:Controller;
		private var msgArea:TextField;
		private var linkArea:TextArea;
		private var okButton:Button;
		private var copyButton:Button;		
		private var widthArea:TextInput;
		
		private var embedReplay:Boolean;
		private var embedChallenge:Boolean;
		private var id:String;
		
		public function LinkWindow(contr:Controller, msg1:String, msg2:String, isEmbedReplay:Boolean = false, Id:String = "", isEmbedChallenge:Boolean = false)
		{
			cont = contr;
			embedReplay = isEmbedReplay;
			embedChallenge = isEmbedChallenge;
			id = Id;
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.color = 0x242930;
			msgArea = new TextField();
			msgArea.x = 20;
			msgArea.y = 25;
			msgArea.width = 160;
			msgArea.text = msg1;
			msgArea.selectable = false;
			if (msg1.substr(0, 13) == "Copy the HTML") {
				format.size = 11;
			}
			msgArea.setTextFormat(format);
			addChild(msgArea);
			
			var isEmbed:Boolean = false;
			if (!msg2) {
				msg2 = GetEmbedCode(isEmbedReplay, id, 800, isEmbedChallenge);
				isEmbed = true;
			}
			
			format = new TextFormat();
			format.align = TextFormatAlign.LEFT;
			format.size = 10;
			linkArea = new GuiTextArea(30, 60, 140, 90, format);
			linkArea.text = msg2;
			linkArea.editable = false;
			linkArea.addEventListener(MouseEvent.CLICK, linkAreaClicked, false, 0, true);
			addChild(linkArea);
			
			if (isEmbed) {
				format = new TextFormat();
				format.font = Main.GLOBAL_FONT;
				format.color = 0x242930;
				var widthText:TextField = new TextField();
				widthText.x = 40;
				widthText.y = 160;
				widthText.width = 40;
				widthText.text = "Width:";
				widthText.selectable = false;
				widthText.setTextFormat(format);
				addChild(widthText);
				
				format = new TextFormat();
				format.size = 13;
				widthArea = new GuiTextInput(80, 157, 50, format);
				widthArea.text = "800";
				widthArea.maxChars = 4;
				widthArea.addEventListener(Event.CHANGE, widthChanged, false, 0, true);
				addChild(widthArea);
			}
			
			okButton = new GuiButton("OK", 75, (isEmbed ? 215 : 185), 50, 30, cont.HideLinkDialog, GuiButton.PURPLE);
			addChild(okButton);
			copyButton = new GuiButton("Copy to Clipboard", 30, (isEmbed ? 180 : 150), 140, 35, copyButtonPressed, GuiButton.ORANGE);
			addChild(copyButton);
			
			super(300, 170, 200, (isEmbed ? 260 : 230));
		}
		
		private function copyButtonPressed(e:MouseEvent):void {
			System.setClipboard(linkArea.text);
		}
		
		private function linkAreaClicked(e:MouseEvent):void {
			linkArea.setSelection(0, 1000000);
		}
		
		private function widthChanged(e:Event):void {
			var width:Number = parseInt(widthArea.text);
			if (isNaN(width) || width == 0) width = 800;
			if (width < 100) width = 100;
			if (width > 2000) width = 2000;
			linkArea.text = GetEmbedCode(embedReplay, id, width, embedChallenge);
		}
		
		private static function GetEmbedCode(isReplay:Boolean, id:String, width:int, isChallenge:Boolean):String {
			width -= (width % 4);
			var height:int = width * 0.75;
			return "<object classid=\"clsid:d27cdb6e-ae6d-11cf-96b8-444553540000\" codebase=\"http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=9,0,0,0\" width=\"" + width + "\" height=\"" + height + "\" id=\"preloader\" align=\"middle\"><param name=\"allowScriptAccess\" value=\"always\" /><param name=\"movie\" value=\"http://incredibots.com/old/" + Database.VERSION_STRING_FOR_REPLAYS + "/incredibots2.swf\" /><param name=\"quality\" value=\"high\" /><param name=\"bgcolor\" value=\"#999999\" /><param name=\"FlashVars\" value=\"" + (isChallenge ? "challengeID=" : (isReplay ? "replayID=" : "robotID=")) + id + "\" /><embed src=\"http://incredibots.com/old/" + Database.VERSION_STRING_FOR_REPLAYS + "/incredibots2.swf\" FlashVars=\"" + (isChallenge ? "challengeID=" : (isReplay ? "replayID=" : "robotID=")) + id + "\" quality=\"high\" bgcolor=\"#999999\" width=\"" + width + "\" height=\"" + height + "\" name=\"preloader\" align=\"middle\" allowScriptAccess=\"always\" type=\"application/x-shockwave-flash\" pluginspage=\"http://www.macromedia.com/go/getflashplayer\" /></object>";
		}
	}
}