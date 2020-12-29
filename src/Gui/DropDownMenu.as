package Gui
{
	import Game.*;
	import Game.Graphics.Resource;

	import fl.controls.*;

	import flash.display.*;
	import flash.events.*;
	import flash.text.*;

	public class DropDownMenu extends Sprite
	{
		private var cont:ControllerGame;
		private var mouseDown:Boolean = false;

		private var menuBitmap:BitmapData;
		private var menuBitmapRoll:BitmapData;

		private var fileText:TextField;
		private var editText:TextField;
		private var viewText:TextField;
		private var commentText:TextField;
		private var helpText:TextField;
		private var aboutText:TextField;
		private var extrasText:TextField;

		private var m_currentMenu:Sprite;

		public function DropDownMenu(contr:ControllerGame)
		{
			cont = contr;
			m_currentMenu = null;

			menuBitmap = new Resource.cGuiMenuBar().bitmapData;
			menuBitmapRoll = new Resource.cGuiMenuBarRoll().bitmapData;

			graphics.beginBitmapFill(menuBitmap);
			graphics.drawRect(0, 0, 800, 21);

			var format:TextFormat = new TextFormat();
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			format.color = 0x343550;
			fileText = new TextField();
			fileText.text = "File";
			fileText.x = 1;
			fileText.y = 4;
			fileText.width = 40;
			fileText.height = 20;
			fileText.selectable = false;
			fileText.setTextFormat(format);
			addChild(fileText);
			editText = new TextField();
			editText.text = "Edit";
			editText.x = 41;
			editText.y = 4;
			editText.width = 40;
			editText.height = 20;
			editText.selectable = false;
			editText.setTextFormat(format);
			addChild(editText);
			viewText = new TextField();
			viewText.text = "View";
			viewText.x = 81;
			viewText.y = 4;
			viewText.width = 40;
			viewText.height = 20;
			viewText.selectable = false;
			viewText.setTextFormat(format);
			addChild(viewText);
			commentText = new TextField();
			commentText.text = "Share!";
			commentText.x = 121;
			commentText.y = 4;
			commentText.width = 60;
			commentText.height = 20;
			commentText.selectable = false;
			commentText.setTextFormat(format);
			addChild(commentText);
			helpText = new TextField();
			helpText.text = "Help";
			helpText.x = 181;
			helpText.y = 4;
			helpText.width = 40;
			helpText.height = 20;
			helpText.selectable = false;
			helpText.setTextFormat(format);
			addChild(helpText);
			aboutText = new TextField();
			aboutText.text = "About";
			aboutText.x = 751;
			aboutText.y = 4;
			aboutText.width = 50;
			aboutText.height = 20;
			aboutText.selectable = false;
			aboutText.setTextFormat(format);
			addChild(aboutText);
			extrasText = new TextField();
			extrasText.text = "Extras";
			extrasText.x = 221;
			extrasText.y = 4;
			extrasText.width = 50;
			extrasText.height = 20;
			extrasText.selectable = false;
			extrasText.setTextFormat(format);
			addChild(extrasText);

			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.align = TextFormatAlign.CENTER;
			format.color = 0xE1E1EA;

			fileText = new TextField();
			fileText.text = "File";
			fileText.x = 0;
			fileText.y = 3;
			fileText.width = 40;
			fileText.height = 20;
			fileText.selectable = false;
			fileText.setTextFormat(format);
			fileText.addEventListener(MouseEvent.MOUSE_DOWN, file, false, 0, true);
			fileText.addEventListener(MouseEvent.MOUSE_OVER, maybeFile, false, 0, true);
			fileText.addEventListener(MouseEvent.MOUSE_OUT, noFile, false, 0, true);
			addChild(fileText);
			editText = new TextField();
			editText.text = "Edit";
			editText.x = 40;
			editText.y = 3;
			editText.width = 40;
			editText.height = 20;
			editText.selectable = false;
			editText.setTextFormat(format);
			editText.addEventListener(MouseEvent.MOUSE_DOWN, edit, false, 0, true);
			editText.addEventListener(MouseEvent.MOUSE_OVER, maybeEdit, false, 0, true);
			editText.addEventListener(MouseEvent.MOUSE_OUT, noEdit, false, 0, true);
			addChild(editText);
			viewText = new TextField();
			viewText.text = "View";
			viewText.x = 80;
			viewText.y = 3;
			viewText.width = 40;
			viewText.height = 20;
			viewText.selectable = false;
			viewText.setTextFormat(format);
			viewText.addEventListener(MouseEvent.MOUSE_DOWN, view, false, 0, true);
			viewText.addEventListener(MouseEvent.MOUSE_OVER, maybeView, false, 0, true);
			viewText.addEventListener(MouseEvent.MOUSE_OUT, noView, false, 0, true);
			addChild(viewText);
			commentText = new TextField();
			commentText.text = "Share!";
			commentText.x = 120;
			commentText.y = 3;
			commentText.width = 60;
			commentText.height = 20;
			commentText.selectable = false;
			commentText.setTextFormat(format);
			commentText.addEventListener(MouseEvent.MOUSE_DOWN, comment, false, 0, true);
			commentText.addEventListener(MouseEvent.MOUSE_OVER, maybeComment, false, 0, true);
			commentText.addEventListener(MouseEvent.MOUSE_OUT, noComment, false, 0, true);
			addChild(commentText);
			helpText = new TextField();
			helpText.text = "Help";
			helpText.x = 180;
			helpText.y = 3;
			helpText.width = 40;
			helpText.height = 20;
			helpText.selectable = false;
			helpText.setTextFormat(format);
			helpText.addEventListener(MouseEvent.MOUSE_DOWN, help, false, 0, true);
			helpText.addEventListener(MouseEvent.MOUSE_OVER, maybeHelp, false, 0, true);
			helpText.addEventListener(MouseEvent.MOUSE_OUT, noHelp, false, 0, true);
			addChild(helpText);
			aboutText = new TextField();
			aboutText.text = "About";
			aboutText.x = 750;
			aboutText.y = 3;
			aboutText.width = 50;
			aboutText.height = 20;
			aboutText.selectable = false;
			aboutText.setTextFormat(format);
			aboutText.addEventListener(MouseEvent.MOUSE_DOWN, about, false, 0, true);
			aboutText.addEventListener(MouseEvent.MOUSE_OVER, maybeAbout, false, 0, true);
			aboutText.addEventListener(MouseEvent.MOUSE_OUT, noAbout, false, 0, true);
			addChild(aboutText);
			extrasText = new TextField();
			extrasText.text = "Extras";
			extrasText.x = 220;
			extrasText.y = 3;
			extrasText.width = 50;
			extrasText.height = 20;
			extrasText.selectable = false;
			extrasText.setTextFormat(format);
			extrasText.addEventListener(MouseEvent.MOUSE_DOWN, extras, false, 0, true);
			extrasText.addEventListener(MouseEvent.MOUSE_OVER, maybeExtras, false, 0, true);
			extrasText.addEventListener(MouseEvent.MOUSE_OUT, noExtras, false, 0, true);
			addChild(extrasText);
		}

		public function Update():void {

		}

		public function MouseClick(up:Boolean, x:int, y:int):void {
			if (y > 20 && (!m_currentMenu || !MouseOverMenu(x, y))) {
				HideAll(new MouseEvent(""));
			}
		}

		private function BuildFileMenu():void {
			if (m_currentMenu) removeChild(m_currentMenu);
			m_currentMenu = new Sprite();
			m_currentMenu.x = 0;
			m_currentMenu.y = 21;
			m_currentMenu.graphics.beginFill(0xFDF9EA, 1);
			m_currentMenu.graphics.lineStyle(1, 0x43366F);
			m_currentMenu.graphics.moveTo(0, 0);
			m_currentMenu.graphics.drawRect(0, 0, 155, 200);
			var item:DropDownMenuItem = new DropDownMenuItem(this, "Main Menu", 155, cont.newButton);
			item.y = 0;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Save...", 155, cont.saveButton);
			item.y = 20;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Load Robot", 155, cont.loadRobotButton);
			item.y = 40;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Load And Insert", 155, cont.loadAndInsertButton);
			item.y = 60;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Load Replay", 155, cont.loadReplayButton);
			item.y = 80;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Load Challenge", 155, cont.loadChallengeButton);
			item.y = 100;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Log In", 155, cont.loginButton);
			item.y = 120;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "View High Scores", 155, cont.highScoresButton);
			item.y = 140;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Report As Inappropriate", 155, cont.reportButton);
			item.y = 160;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, (Main.enableSound ? "Disable Sound" : "Enable Sound"), 155, soundButton);
			item.y = 180;
			m_currentMenu.addChild(item);
			addChild(m_currentMenu);
		}

		private function BuildEditMenu():void {
			if (m_currentMenu) removeChild(m_currentMenu);
			m_currentMenu = new Sprite();
			m_currentMenu.x = 40;
			m_currentMenu.y = 21;
			m_currentMenu.graphics.beginFill(0xFDF9EA, 1);
			m_currentMenu.graphics.lineStyle(1, 0x43366F);
			m_currentMenu.graphics.moveTo(0, 0);
			m_currentMenu.graphics.drawRect(0, 0, 120, 200);
			var item:DropDownMenuItem = new DropDownMenuItem(this, "Change Settings", 120, cont.sandboxSettingsButton);
			item.y = 0;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Clear All", 120, cont.clearButton);
			item.y = 20;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Undo", 120, cont.undoButton);
			item.y = 40;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Redo", 120, cont.redoButton);
			item.y = 60;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Cut", 120, cont.cutButton);
			item.y = 80;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Copy", 120, cont.copyButton);
			item.y = 100;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Paste", 120, pasteButton);
			item.y = 120;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Delete", 120, cont.deleteButton);
			item.y = 140;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Move to Front", 120, cont.frontButton);
			item.y = 160;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Move to Back", 120, cont.backButton);
			item.y = 180;
			m_currentMenu.addChild(item);
			addChild(m_currentMenu);
		}

		private function BuildViewMenu():void {
			if (m_currentMenu) removeChild(m_currentMenu);
			m_currentMenu = new Sprite();
			m_currentMenu.x = 80;
			m_currentMenu.y = 21;
			m_currentMenu.graphics.beginFill(0xFDF9EA, 1);
			m_currentMenu.graphics.lineStyle(1, 0x43366F);
			m_currentMenu.graphics.moveTo(0, 0);
			m_currentMenu.graphics.drawRect(0, 0, 140, 140);
			var item:DropDownMenuItem = new DropDownMenuItem(this, "Zoom In", 140, cont.zoomInButton);
			item.y = 0;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Zoom Out", 140, cont.zoomOutButton);
			item.y = 20;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Snap to Center", 140, cont.centerBox, true, ControllerGameGlobals.snapToCenter);
			item.y = 40;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Show Joints", 140, cont.jointBox, true, ControllerGameGlobals.showJoints);
			item.y = 60;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Show Colors", 140, cont.colourBox, true, ControllerGameGlobals.showColours);
			item.y = 80;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Show Outlines", 140, cont.globalOutlineBox, true, ControllerGameGlobals.showOutlines);
			item.y = 100;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Center on Selection", 140, cont.centerOnSelectedBox, true, ControllerGameGlobals.centerOnSelected);
			item.y = 120;
			m_currentMenu.addChild(item);
			addChild(m_currentMenu);
		}

		private function BuildCommentMenu():void {
			if (m_currentMenu) removeChild(m_currentMenu);
			m_currentMenu = new Sprite();
			m_currentMenu.x = 120;
			m_currentMenu.y = 21;
			m_currentMenu.graphics.beginFill(0xFDF9EA, 1);
			m_currentMenu.graphics.lineStyle(1, 0x43366F);
			m_currentMenu.graphics.moveTo(0, 0);
			m_currentMenu.graphics.drawRect(0, 0, 180, 60);
			if (ControllerGameGlobals.playingReplay) {
				var item:DropDownMenuItem = new DropDownMenuItem(this, "Comment on this Replay", 180, cont.commentReplayButton);
				item.y = 0;
				m_currentMenu.addChild(item);
				item = new DropDownMenuItem(this, "Link to this Replay", 180, cont.linkReplayButton);
				item.y = 20;
				m_currentMenu.addChild(item);
				item = new DropDownMenuItem(this, "Embed this Replay", 180, cont.embedReplayButton);
				item.y = 40;
				m_currentMenu.addChild(item);
			} else if (cont is ControllerChallenge && ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic) {
				item = new DropDownMenuItem(this, "Comment on this Challenge", 180, cont.commentChallengeButton);
				item.y = 0;
				m_currentMenu.addChild(item);
				item = new DropDownMenuItem(this, "Link to this Challenge", 180, cont.linkChallengeButton);
				item.y = 20;
				m_currentMenu.addChild(item);
				item = new DropDownMenuItem(this, "Embed this Challenge", 180, cont.embedChallengeButton);
				item.y = 40;
				m_currentMenu.addChild(item);
			} else {
				item = new DropDownMenuItem(this, "Comment on this Robot", 180, cont.commentButton);
				item.y = 0;
				m_currentMenu.addChild(item);
				item = new DropDownMenuItem(this, "Link to this Robot", 180, cont.linkButton);
				item.y = 20;
				m_currentMenu.addChild(item);
				item = new DropDownMenuItem(this, "Embed this Robot", 180, cont.embedButton);
				item.y = 40;
				m_currentMenu.addChild(item);
			}
			addChild(m_currentMenu);
		}

		private function BuildHelpMenu():void {
			if (m_currentMenu) removeChild(m_currentMenu);
			m_currentMenu = new Sprite();
			m_currentMenu.x = 180;
			m_currentMenu.y = 21;
			m_currentMenu.graphics.beginFill(0xFDF9EA, 1);
			m_currentMenu.graphics.lineStyle(1, 0x43366F);
			m_currentMenu.graphics.moveTo(0, 0);
			m_currentMenu.graphics.drawRect(0, 0, 115, 40);
			var item:DropDownMenuItem = new DropDownMenuItem(this, "Incredibots Help", 115, helpButton);
			item.y = 0;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Forums", 115, forumsButton);
			item.y = 20;
			m_currentMenu.addChild(item);
			addChild(m_currentMenu);
		}

		private function BuildAboutMenu():void {
			if (m_currentMenu) removeChild(m_currentMenu);
			m_currentMenu = new Sprite();
			m_currentMenu.x = 670;
			m_currentMenu.y = 21;
			m_currentMenu.graphics.beginFill(0xFDF9EA, 1);
			m_currentMenu.graphics.lineStyle(1, 0x43366F);
			m_currentMenu.graphics.moveTo(0, 0);
			m_currentMenu.graphics.drawRect(0, 0, 130, 40);
			var item:DropDownMenuItem = new DropDownMenuItem(this, "Credits", 130, credits);
			item.y = 0;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "GrubbyGames.com", 130, grubby);
			item.y = 20;
			m_currentMenu.addChild(item);
			addChild(m_currentMenu);
		}

		private function BuildExtrasMenu():void {
			if (m_currentMenu) removeChild(m_currentMenu);
			m_currentMenu = new Sprite();
			m_currentMenu.x = 220;
			m_currentMenu.y = 21;
			m_currentMenu.graphics.beginFill(0xFDF9EA, 1);
			m_currentMenu.graphics.lineStyle(1, 0x43366F);
			m_currentMenu.graphics.moveTo(0, 0);
			m_currentMenu.graphics.drawRect(0, 0, 115, (cont is ControllerSandbox ? 100 : 60));
			var item:DropDownMenuItem = new DropDownMenuItem(this, "Mirror Horizontal", 115, mirrorHorizontalButton);
			item.y = 0;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Mirror Vertical", 115, mirrorVerticalButton);
			item.y = 20;
			m_currentMenu.addChild(item);
			item = new DropDownMenuItem(this, "Scale", 115, cont.scaleButton);
			item.y = 40;
			m_currentMenu.addChild(item);
			if (cont is ControllerSandbox) {
				item = new DropDownMenuItem(this, "Thrusters", 115, cont.thrustersButton);
				item.y = 60;
				m_currentMenu.addChild(item);
				item = new DropDownMenuItem(this, "Cannon", 115, cont.cannonButton);
				item.y = 80;
				m_currentMenu.addChild(item);
			}
			addChild(m_currentMenu);
		}

		public function MouseOverMenu(x:int, y:int):Boolean {
			return (m_currentMenu && x >= m_currentMenu.x && x < m_currentMenu.x + m_currentMenu.width && y >= m_currentMenu.y && y < m_currentMenu.y + m_currentMenu.height);
		}

		private function file(e:MouseEvent, callback:Boolean = true):void {
			if (mouseDown && callback) {
				noFile(e);
				mouseDown = false;
			} else {
				noEdit(e);
				MakeDummyMenu();
				noView(e);
				MakeDummyMenu();
				noComment(e);
				MakeDummyMenu();
				noHelp(e);
				MakeDummyMenu();
				noAbout(e);
				MakeDummyMenu();
				noExtras(e);
				graphics.beginBitmapFill(menuBitmapRoll);
				graphics.drawRect(0, 0, 40, 21);
				BuildFileMenu();
				mouseDown = true;
			}
		}

		private function maybeFile(e:MouseEvent):void {
			if (mouseDown) {
				file(e, false);
			}
		}

		private function noFile(e:MouseEvent):void {
			if (m_currentMenu && !MouseOverMenu(e.stageX, e.stageY)) {
				graphics.beginBitmapFill(menuBitmap);
				graphics.drawRect(0, 0, 40, 21);
				removeChild(m_currentMenu);
				m_currentMenu = null;
			}
		}

		private function edit(e:MouseEvent, callback:Boolean = true):void {
			if (mouseDown && callback) {
				noEdit(e);
				mouseDown = false;
			} else {
				noFile(e);
				MakeDummyMenu();
				noView(e);
				MakeDummyMenu();
				noComment(e);
				MakeDummyMenu();
				noHelp(e);
				MakeDummyMenu();
				noAbout(e);
				MakeDummyMenu();
				noExtras(e);
				graphics.beginBitmapFill(menuBitmapRoll);
				graphics.drawRect(40, 0, 40, 21);
				mouseDown = true;
				BuildEditMenu();
			}
		}

		private function maybeEdit(e:MouseEvent):void {
			if (mouseDown) {
				edit(e, false);
			}
		}

		private function noEdit(e:MouseEvent):void {
			if (m_currentMenu && !MouseOverMenu(e.stageX, e.stageY)) {
				graphics.beginBitmapFill(menuBitmap);
				graphics.drawRect(40, 0, 40, 21);
				removeChild(m_currentMenu);
				m_currentMenu = null;
			}
		}

		private function view(e:MouseEvent, callback:Boolean = true):void {
			if (mouseDown && callback) {
				noView(e);
				mouseDown = false;
			} else {
				noFile(e);
				MakeDummyMenu();
				noEdit(e);
				MakeDummyMenu();
				noComment(e);
				MakeDummyMenu();
				noHelp(e);
				MakeDummyMenu();
				noAbout(e);
				MakeDummyMenu();
				noExtras(e);
				graphics.beginBitmapFill(menuBitmapRoll);
				graphics.drawRect(80, 0, 40, 21);
				mouseDown = true;
				BuildViewMenu();
			}
		}

		private function maybeView(e:MouseEvent):void {
			if (mouseDown) {
				view(e, false);
			}
		}

		private function noView(e:MouseEvent):void {
			if (m_currentMenu && !MouseOverMenu(e.stageX, e.stageY)) {
				graphics.beginBitmapFill(menuBitmap);
				graphics.drawRect(80, 0, 40, 21);
				removeChild(m_currentMenu);
				m_currentMenu = null;
			}
		}

		private function comment(e:MouseEvent, callback:Boolean = true):void {
			if (mouseDown && callback) {
				noComment(e);
				mouseDown = false;
			} else {
				noFile(e);
				MakeDummyMenu();
				noEdit(e);
				MakeDummyMenu();
				noView(e);
				MakeDummyMenu();
				noHelp(e);
				MakeDummyMenu();
				noAbout(e);
				MakeDummyMenu();
				noExtras(e);
				graphics.beginBitmapFill(menuBitmapRoll);
				graphics.drawRect(120, 0, 60, 21);
				mouseDown = true;
				BuildCommentMenu();
			}
		}

		private function maybeComment(e:MouseEvent):void {
			if (mouseDown) {
				comment(e, false);
			}
		}

		private function noComment(e:MouseEvent):void {
			if (m_currentMenu && !MouseOverMenu(e.stageX, e.stageY)) {
				graphics.beginBitmapFill(menuBitmap);
				graphics.drawRect(120, 0, 60, 21);
				removeChild(m_currentMenu);
				m_currentMenu = null;
			}
		}

		private function help(e:MouseEvent, callback:Boolean = true):void {
			if (mouseDown && callback) {
				noHelp(e);
				mouseDown = false;
			} else {
				noFile(e);
				MakeDummyMenu();
				noEdit(e);
				MakeDummyMenu();
				noView(e);
				MakeDummyMenu();
				noComment(e);
				MakeDummyMenu();
				noAbout(e);
				MakeDummyMenu();
				noExtras(e);
				graphics.beginBitmapFill(menuBitmapRoll);
				graphics.drawRect(180, 0, 40, 21);
				mouseDown = true;
				BuildHelpMenu();
			}
		}

		private function maybeHelp(e:MouseEvent):void {
			if (mouseDown) {
				help(e, false);
			}
		}

		private function noHelp(e:MouseEvent):void {
			if (m_currentMenu && !MouseOverMenu(e.stageX, e.stageY)) {
				graphics.beginBitmapFill(menuBitmap);
				graphics.drawRect(180, 0, 40, 21);
				removeChild(m_currentMenu);
				m_currentMenu = null;
			}
		}

		private function about(e:MouseEvent, callback:Boolean = true):void {
			if (mouseDown && callback) {
				noAbout(e);
				mouseDown = false;
			} else {
				noFile(e);
				MakeDummyMenu();
				noEdit(e);
				MakeDummyMenu();
				noView(e);
				MakeDummyMenu();
				noComment(e);
				MakeDummyMenu();
				noHelp(e);
				MakeDummyMenu();
				noExtras(e);
				graphics.beginBitmapFill(menuBitmapRoll);
				graphics.drawRect(750, 0, 50, 21);
				mouseDown = true;
				BuildAboutMenu();
			}
		}

		private function maybeAbout(e:MouseEvent):void {
			if (mouseDown) {
				about(e, false);
			}
		}

		private function noAbout(e:MouseEvent):void {
			if (m_currentMenu && !MouseOverMenu(e.stageX, e.stageY)) {
				graphics.beginBitmapFill(menuBitmap);
				graphics.drawRect(750, 0, 50, 21);
				removeChild(m_currentMenu);
				m_currentMenu = null;
			}
		}

		private function extras(e:MouseEvent, callback:Boolean = true):void {
			if (mouseDown && callback) {
				noExtras(e);
				mouseDown = false;
			} else {
				noFile(e);
				MakeDummyMenu();
				noEdit(e);
				MakeDummyMenu();
				noView(e);
				MakeDummyMenu();
				noComment(e);
				MakeDummyMenu();
				noHelp(e);
				MakeDummyMenu();
				noAbout(e);
				graphics.beginBitmapFill(menuBitmapRoll);
				graphics.drawRect(220, 0, 50, 21);
				mouseDown = true;
				BuildExtrasMenu();
			}
		}

		private function maybeExtras(e:MouseEvent):void {
			if (mouseDown) {
				extras(e, false);
			}
		}

		private function noExtras(e:MouseEvent):void {
			if (m_currentMenu && !MouseOverMenu(e.stageX, e.stageY)) {
				graphics.beginBitmapFill(menuBitmap);
				graphics.drawRect(220, 0, 50, 21);
				removeChild(m_currentMenu);
				m_currentMenu = null;
			}
		}

		public function HideAll(e:MouseEvent):void {
			if (m_currentMenu) {
				removeChild(m_currentMenu);
				m_currentMenu = null;
				graphics.beginBitmapFill(menuBitmap);
				graphics.drawRect(0, 0, 800, 21);
			}
			mouseDown = false;
		}

		private function MakeDummyMenu():void {
			m_currentMenu = new Sprite();
			addChild(m_currentMenu);
		}

		private function pasteButton(e:MouseEvent):void {
			cont.ignoreAClick = true;
			cont.pasteButton(e);
		}

		private function mirrorHorizontalButton(e:MouseEvent):void {
			cont.ignoreAClick = true;
			cont.mirrorHorizontal(e);
		}

		private function mirrorVerticalButton(e:MouseEvent):void {
			cont.ignoreAClick = true;
			cont.mirrorVertical(e);
		}

		private function soundButton(e:MouseEvent):void {
			Main.enableSound = !Main.enableSound;
		}

		private function credits(e:Event):void {
			Main.BrowserRedirect("http://www.incredifriends.com/", true);
		}

		private function grubby(e:Event):void {
			Main.BrowserRedirect("http://www.grubbygames.com", true);
		}

		private function helpButton(e:Event):void {
			Main.BrowserRedirect("http://www.incredifriends.com/", true);
		}

		private function forumsButton(e:Event):void {
			Main.BrowserRedirect("http://www.incredifriends.com/", true);
		}
	}
}
