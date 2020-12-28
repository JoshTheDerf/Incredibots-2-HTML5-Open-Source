package Gui
{
	import Game.*;
	import Game.Graphics.Resource;
	import Game.Tutorials.*;
	
	import General.Util;
	
	import Parts.*;
	
	import fl.controls.*;
	import fl.events.*;
	
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	
	import mx.core.BitmapAsset;

	public class MainEditPanel extends GuiWindow
	{
		private var cont:ControllerGame;

		private var m_editPanel:Sprite;
		private var m_gamePanel:Sprite;
		private var m_pausePanel:Sprite;
		
		private var m_playButton:Button;
		private var m_testButton:Button;
		private var m_editButton:Button;
		private var m_pauseButton:Button;
		private var m_resetButton:Button;
		private var m_resetButton2:Button;
		private var m_rewindButton:Button = null;
		private var m_rewindButton2:Button = null;
		private var m_saveReplayButton:Button;
		private var m_saveReplayButton2:Button;
		private var m_saveButton:Button;
		private var m_loadButton:Button;
		private var m_loginButton:Button;
		private var m_logoutButton:Button;
		private var m_restrictionsButton:Button;
		private var m_conditionsButton:Button;
		private var m_buildBoxButton:Button;
		private var m_newButton:Button;
		private var m_pasteButton:Button;
		
		private var m_timer1:TextField;
		private var m_timer2:TextField;
		
		private var m_circleButton:GuiButton;
		private var m_rectButton:GuiButton;
		private var m_triangleButton:GuiButton;
		private var m_fixedJointButton:GuiButton;
		private var m_revoluteJointButton:GuiButton;
		private var m_prismaticJointButton:GuiButton;
		private var m_mainPasteButton:GuiButton;
		private var m_textButton:GuiButton;
		
		private var m_header:TextField;
		private var m_rateButton:Button;
		private var m_rateButton2:Button;
		private var m_rateButton3:Button;
		private var m_rateButton4:Button;
		private var m_featureButton:Button;
		private var m_featureButton2:Button;
		private var m_commentButton:Button;
		private var m_commentButton2:Button;
		private var m_commentButton3:Button;
		private var m_commentButton4:Button;
		private var m_linkButton:Button;
		private var m_linkButton2:Button;
		private var m_linkButton3:Button;
		private var m_linkButton4:Button;
		private var m_embedButton:Button;
		private var m_embedButton2:Button;
		private var m_embedButton3:Button;
		private var m_embedButton4:Button;

		private var m_undoButton:Button;
		private var m_redoButton:Button;
		private var m_zoomInButton:Button;
		private var m_zoomOutButton:Button;
		
		private var m_tutorialButton:Button;
		
		public function MainEditPanel(contr:ControllerGame) {
			super(0, 5, 800, 95);
			cont = contr;

			m_editPanel = new Sprite();
			addChild(m_editPanel);
			m_gamePanel = new Sprite();
			m_gamePanel.visible = false;
			addChild(m_gamePanel);
			m_pausePanel = new Sprite();
			m_pausePanel.visible = false;
			addChild(m_pausePanel);
			
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			
			if (!Main.inIFrame) {
				m_circleButton = new GuiButton("Circle", 10, 15, 105, 35, cont.circleButton, GuiButton.BLUE);
				m_editPanel.addChild(m_circleButton);
				m_rectButton = new GuiButton("Rectangle", 110, 15, 105, 35, cont.rectButton, GuiButton.BLUE);
				m_editPanel.addChild(m_rectButton);
				m_triangleButton = new GuiButton("Triangle", 210, 15, 105, 35, cont.triangleButton, GuiButton.BLUE);
				m_editPanel.addChild(m_triangleButton);
				m_fixedJointButton = new GuiButton("Fixed Joint", 10, 45, 105, 35, cont.fjButton, GuiButton.BLUE);
				m_editPanel.addChild(m_fixedJointButton);
				m_revoluteJointButton = new GuiButton("Rotating Joint", 110, 45, 105, 35, cont.rjButton, GuiButton.BLUE);
				m_editPanel.addChild(m_revoluteJointButton);
				m_prismaticJointButton = new GuiButton("Sliding Joint", 210, 45, 105, 35, cont.pjButton, GuiButton.BLUE);
				m_editPanel.addChild(m_prismaticJointButton);
				m_textButton = new GuiButton("Text", 310, 45, 60, 35, cont.textButton, GuiButton.BLUE);
				m_editPanel.addChild(m_textButton);
				m_pasteButton = new GuiButton("Paste", 370, 45, 60, 35, cont.pasteButton, GuiButton.ORANGE);
				m_editPanel.addChild(m_pasteButton);
				m_undoButton = new GuiButton("Undo", 310, 15, 60, 35, cont.undoButton, GuiButton.ORANGE);
				m_editPanel.addChild(m_undoButton);
				m_redoButton = new GuiButton("Redo", 370, 15, 60, 35, cont.redoButton, GuiButton.ORANGE);
				m_editPanel.addChild(m_redoButton);
			}
			m_zoomInButton = new GuiButton("Zoom In", 430, 15, 80, 35, cont.zoomInButton, GuiButton.PINK);
			m_editPanel.addChild(m_zoomInButton);
			m_zoomInButton = new GuiButton("Zoom In", 430, 15, 80, 35, cont.zoomInButton, GuiButton.PINK);
			m_gamePanel.addChild(m_zoomInButton);
			m_zoomInButton = new GuiButton("Zoom In", 430, 15, 80, 35, cont.zoomInButton, GuiButton.PINK);
			m_pausePanel.addChild(m_zoomInButton);
			m_zoomOutButton = new GuiButton("Zoom Out", 430, 45, 80, 35, cont.zoomOutButton, GuiButton.PINK);
			m_editPanel.addChild(m_zoomOutButton);
			m_zoomOutButton = new GuiButton("Zoom Out", 430, 45, 80, 35, cont.zoomOutButton, GuiButton.PINK);
			m_gamePanel.addChild(m_zoomOutButton);
			m_zoomOutButton = new GuiButton("Zoom Out", 430, 45, 80, 35, cont.zoomOutButton, GuiButton.PINK);
			m_pausePanel.addChild(m_zoomOutButton);
			m_conditionsButton = new GuiButton("Set Conditions", 520, 45, 95, 35, cont.conditionsButton, GuiButton.BLUE);
			m_buildBoxButton = new GuiButton("Build Box", 610, 45, 85, 35, cont.buildBoxButton, GuiButton.BLUE);
			m_restrictionsButton = new GuiButton("Restrictions", 695, 15, 95, 30, cont.restrictionsButton, GuiButton.BLUE);
			m_conditionsButton.visible = false;
			m_restrictionsButton.visible = false;
			m_buildBoxButton.visible = false;
			m_loadButton = new GuiButton("Load...", 520, 45, 95, 35, cont.loadButton, GuiButton.PURPLE);
			m_loginButton = new GuiButton("Login", 610, 45, 85, 35, cont.loginButton, GuiButton.PURPLE);
			m_loginButton.visible = (ControllerGame.userName == "_Public");
			m_logoutButton = new GuiButton("Logout", 610, 45, 85, 35, cont.logoutButton, GuiButton.PURPLE);
			m_logoutButton.visible = (ControllerGame.userName != "_Public");
			m_editPanel.addChild(m_loadButton);
			m_editPanel.addChild(m_loginButton);
			m_editPanel.addChild(m_logoutButton);
			m_editPanel.addChild(m_conditionsButton);
			m_editPanel.addChild(m_buildBoxButton);
			m_editPanel.addChild(m_restrictionsButton);
			m_saveButton = new GuiButton("Save...", 520, 15, 95, 35, cont.saveButton, GuiButton.PURPLE);
			m_editPanel.addChild(m_saveButton);
			m_newButton = new GuiButton("Main Menu", 610, 15, 85, 35, cont.newButton, GuiButton.PURPLE);
			m_editPanel.addChild(m_newButton);
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 15;
			m_playButton = new GuiButton("Resume", 610, 45, 75, 35, cont.playButton, GuiButton.RED);
			m_pausePanel.addChild(m_playButton);
			m_playButton = new GuiButton("Play!", 700, 35, 85, 45, cont.playButton, GuiButton.PLAY, format);
			m_editPanel.addChild(m_playButton);
			m_testButton = new GuiButton("    Test\nChallenge", 700, 35, 85, 45, cont.playButton, GuiButton.PLAY);
			m_testButton.visible = false;
			m_editPanel.addChild(m_testButton);
			m_editButton = new GuiButton("Edit Challenge", 695, 15, 95, 30, cont.editButton, GuiButton.RED);
			m_editButton.visible = false;
			m_editPanel.addChild(m_editButton);
			m_pauseButton = new GuiButton("Pause", 610, 45, 75, 35, cont.pauseButton, GuiButton.RED);
			m_gamePanel.addChild(m_pauseButton);
			m_resetButton = new GuiButton("Stop", 700, 35, 85, 45, (ControllerGame.playingReplay ? cont.rewindButton : cont.resetButton), GuiButton.PLAY, format);
			m_gamePanel.addChild(m_resetButton);
			m_resetButton2 = new GuiButton("Stop", 700, 35, 85, 45, (ControllerGame.playingReplay ? cont.rewindButton : cont.resetButton), GuiButton.PLAY, format);
			m_pausePanel.addChild(m_resetButton2);
			m_rewindButton = new GuiButton((ControllerGame.playingReplay ? "Rewind" : "Restart"), 535, 45, 75, 35, (ControllerGame.playingReplay ? cont.resetButton : cont.rewindButton), GuiButton.RED);
			m_gamePanel.addChild(m_rewindButton);
			m_rewindButton2 = new GuiButton((ControllerGame.playingReplay ? "Rewind" : "Restart"), 535, 45, 75, 35, (ControllerGame.playingReplay ? cont.resetButton : cont.rewindButton), GuiButton.RED);
			m_pausePanel.addChild(m_rewindButton2);
			if (!ControllerGame.playingReplay) {
				m_saveReplayButton = new GuiButton("Save Replay", 550, 15, 120, 35, cont.saveReplayButton, GuiButton.PURPLE);
				m_gamePanel.addChild(m_saveReplayButton);
				m_saveReplayButton2 = new GuiButton("Save Replay", 550, 15, 120, 35, cont.saveReplayButton, GuiButton.PURPLE);
				m_pausePanel.addChild(m_saveReplayButton2);
			}
			
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			m_header = new TextField();
			if (ControllerGame.playingReplay) m_header.text = "    Replay in Progress";
			else m_header.text = "Simulation in Progress";
			m_header.selectable = false;
			m_header.x = 300;
			m_header.y = 25;
			m_header.width = 140;
			m_header.height = 20;
			m_header.textColor = 0x242930;
			m_header.setTextFormat(format);
			m_gamePanel.addChild(m_header);
			m_header = new TextField();
			if (ControllerGame.playingReplay) m_header.text = "    Replay Paused";
			else m_header.text = "Simulation Paused";
			m_header.selectable = false;
			m_header.x = 310;
			m_header.y = 25;
			m_header.width = 140;
			m_header.height = 20;
			m_header.textColor = 0x242930;
			m_header.setTextFormat(format);
			m_pausePanel.addChild(m_header);
			
			m_featureButton = new GuiButton("Feature!", 85, 15, 90, 35, cont.featureButton, GuiButton.PURPLE);
			m_featureButton.visible = false;
			m_gamePanel.addChild(m_featureButton);
			m_featureButton2 = new GuiButton("Feature!", 85, 15, 90, 35, cont.featureButton, GuiButton.PURPLE);
			m_featureButton2.visible = false;
			m_pausePanel.addChild(m_featureButton2);
			ShowFeatureButton();
			m_rateButton = new GuiButton((ControllerGame.playingReplay ? "Rate this Replay!" : "Rate this Robot!"), 165, 15, 140, 35, rateButton, GuiButton.ORANGE);
			m_gamePanel.addChild(m_rateButton);
			m_rateButton2 = new GuiButton((ControllerGame.playingReplay ? "Rate this Replay!" : "Rate this Robot!"), 165, 15, 140, 35, rateButton, GuiButton.ORANGE);
			m_pausePanel.addChild(m_rateButton2);
			m_rateButton3 = new GuiButton("Rate this Challenge!", 165, 15, 140, 35, rateButton, GuiButton.ORANGE);
			m_rateButton3.visible = false;
			m_gamePanel.addChild(m_rateButton3);
			m_rateButton4 = new GuiButton("Rate this Challenge!", 165, 15, 140, 35, rateButton, GuiButton.ORANGE);
			m_rateButton4.visible = false;
			m_pausePanel.addChild(m_rateButton4);
			m_commentButton = new GuiButton((ControllerGame.playingReplay ? "Comment on this Replay" : "Comment on this Robot"), 15, 45, 160, 35, commentButton, GuiButton.ORANGE);
			m_gamePanel.addChild(m_commentButton);
			m_commentButton2 = new GuiButton((ControllerGame.playingReplay ? "Comment on this Replay" : "Comment on this Robot"), 15, 45, 160, 35, commentButton, GuiButton.ORANGE);
			m_pausePanel.addChild(m_commentButton2);
			m_commentButton3 = new GuiButton("Comment on this Challenge", 15, 45, 160, 35, commentButton, GuiButton.ORANGE);
			m_commentButton3.visible = false;
			m_gamePanel.addChild(m_commentButton3);
			m_commentButton4 = new GuiButton("Comment on this Challenge", 15, 45, 160, 35, commentButton, GuiButton.ORANGE);
			m_commentButton4.visible = false;
			m_pausePanel.addChild(m_commentButton4);
			m_linkButton = new GuiButton((ControllerGame.playingReplay ? "Link to this Replay" : "Link to this Robot"), 165, 45, 140, 35, linkButton, GuiButton.ORANGE);
			m_gamePanel.addChild(m_linkButton);
			m_linkButton2 = new GuiButton((ControllerGame.playingReplay ? "Link to this Replay" : "Link to this Robot"), 165, 45, 140, 35, linkButton, GuiButton.ORANGE);
			m_pausePanel.addChild(m_linkButton2);
			m_linkButton3 = new GuiButton("Link to this Challenge", 165, 45, 140, 35, linkButton, GuiButton.ORANGE);
			m_linkButton3.visible = false;
			m_gamePanel.addChild(m_linkButton3);
			m_linkButton4 = new GuiButton("Link to this Challenge", 165, 45, 140, 35, linkButton, GuiButton.ORANGE);
			m_linkButton4.visible = false;
			m_pausePanel.addChild(m_linkButton4);
			m_embedButton = new GuiButton((ControllerGame.playingReplay ? "Embed this Replay" : "Embed this Robot"), 295, 45, 140, 35, embedButton, GuiButton.ORANGE);
			m_gamePanel.addChild(m_embedButton);
			m_embedButton2 = new GuiButton((ControllerGame.playingReplay ? "Embed this Replay" : "Embed this Robot"), 295, 45, 140, 35, embedButton, GuiButton.ORANGE);
			m_pausePanel.addChild(m_embedButton2);
			m_embedButton3 = new GuiButton("Embed this Challenge", 295, 45, 140, 35, embedButton, GuiButton.ORANGE);
			m_embedButton3.visible = false;
			m_gamePanel.addChild(m_embedButton3);
			m_embedButton4 = new GuiButton("Embed this Challenge", 295, 45, 140, 35, embedButton, GuiButton.ORANGE);
			m_embedButton4.visible = false;
			m_pausePanel.addChild(m_embedButton4);
			
			if (cont is ControllerTutorial || cont is ControllerHomeMovies || cont is ControllerRubeGoldberg || cont is ControllerNewFeatures || cont is ControllerChallengeEditor) {
				m_tutorialButton = new GuiButton("View Previous Tip", 660, 90, 140, 40, cont.tutorialButton, GuiButton.PURPLE);
				m_editPanel.addChild(m_tutorialButton);
			}
			
			format = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 24;
			m_timer1 = new TextField();
			m_timer1.text = "0:00";
			m_timer1.width = 80;
			m_timer1.height = 30;
			m_timer1.textColor = 0x242930;
			m_timer1.selectable = false;
			m_timer1.x = 30;
			m_timer1.y = 22;
			m_timer1.setTextFormat(format);
			m_gamePanel.addChild(m_timer1);
			m_timer2 = new TextField();
			m_timer2.text = "0:00";
			m_timer2.width = 80;
			m_timer2.height = 30;
			m_timer2.textColor = 0x242930;
			m_timer2.selectable = false;
			m_timer2.x = 30;
			m_timer2.y = 22;
			m_timer2.setTextFormat(format);
			m_pausePanel.addChild(m_timer2);
		}
		
		public function Update(curAction:int):void {
			if (!Main.inIFrame) {
				if (curAction == ControllerGame.NEW_CIRCLE) m_circleButton.SetState(true);
				else if (m_circleButton.depressed) m_circleButton.SetState(false);
				
				if (curAction == ControllerGame.NEW_RECT) m_rectButton.SetState(true);
				else if (m_rectButton.depressed) m_rectButton.SetState(false);
				
				if (curAction == ControllerGame.NEW_TRIANGLE) m_triangleButton.SetState(true);
				else if (m_triangleButton.depressed) m_triangleButton.SetState(false);
				
				if (curAction == ControllerGame.NEW_FIXED_JOINT) m_fixedJointButton.SetState(true);
				else if (m_fixedJointButton.depressed) m_fixedJointButton.SetState(false);
				
				if (curAction == ControllerGame.NEW_REVOLUTE_JOINT) m_revoluteJointButton.SetState(true);
				else if (m_revoluteJointButton.depressed) m_revoluteJointButton.SetState(false);
				
				if (curAction == ControllerGame.NEW_PRISMATIC_JOINT) m_prismaticJointButton.SetState(true);
				else if (m_prismaticJointButton.depressed) m_prismaticJointButton.SetState(false);
				
				if (curAction == ControllerGame.NEW_TEXT) m_textButton.SetState(true);
				else if (m_textButton.depressed) m_textButton.SetState(false);
			}
			if (ControllerGame.playingReplay) {
				m_featureButton.label = (ControllerGame.curReplayFeatured ? "Un-feature!" : "Feature!");
				m_featureButton2.label = (ControllerGame.curReplayFeatured ? "Un-feature!" : "Feature!");
			} else if (ControllerGame.curChallengeID != "") {
				m_featureButton.label = (ControllerGame.curChallengeFeatured ? "Un-feature!" : "Feature!");
				m_featureButton2.label = (ControllerGame.curChallengeFeatured ? "Un-feature!" : "Feature!");
			} else {
				m_featureButton.label = (ControllerGame.curRobotFeatured ? "Un-feature!" : "Feature!");
				m_featureButton2.label = (ControllerGame.curRobotFeatured ? "Un-feature!" : "Feature!");
			}
		}
		
		public function rateButton(e:MouseEvent):void {
			if (ControllerGame.playingReplay && ControllerGame.curReplayID != "" && ControllerGame.curReplayPublic) {
				cont.rateReplayButton(e);
			} else if (ControllerGame.curChallengeID != "" && ControllerGame.curChallengePublic) {
				cont.rateChallengeButton(e);
			} else {
				cont.rateButton(e);
			}
		}
		
		public function commentButton(e:MouseEvent):void {
			if (ControllerGame.playingReplay && ControllerGame.curReplayID != "" && ControllerGame.curReplayPublic) {
				cont.commentReplayButton(e);
			} else if (ControllerGame.curChallengeID != "" && ControllerGame.curChallengePublic) {
				cont.commentChallengeButton(e);
			} else {
				cont.commentButton(e);
			}
		}
		
		public function linkButton(e:MouseEvent):void {
			if (ControllerGame.playingReplay && ControllerGame.curReplayID != "" && ControllerGame.curReplayPublic) {
				cont.linkReplayButton(e);
			} else if (ControllerGame.curChallengeID != "" && ControllerGame.curChallengePublic) {
				cont.linkChallengeButton(e);
			} else {
				cont.linkButton(e);
			}
		}
		
		public function embedButton(e:MouseEvent):void {
			if (ControllerGame.playingReplay && ControllerGame.curReplayID != "" && ControllerGame.curReplayPublic) {
				cont.embedReplayButton(e);
			} else if (ControllerGame.curChallengeID != "" && ControllerGame.curChallengePublic) {
				cont.embedChallengeButton(e);
			} else {
				cont.embedButton(e);
			}
		}
		
		public function ShowLogin():void {
			m_loginButton.visible = true;
			m_logoutButton.visible = false;
		}
		
		public function ShowLogout():void {
			m_loginButton.visible = false;
			m_logoutButton.visible = true;
		}
		
		public function ShowEditButton():void {
			m_playButton.visible = true;
			m_testButton.visible = false;
			m_loadButton.visible = true;
			m_loginButton.visible = (ControllerGame.userName == "_Public");
			m_logoutButton.visible = (ControllerGame.userName != "_Public");
			m_conditionsButton.visible = false;
			m_buildBoxButton.visible = false;
			m_restrictionsButton.visible = false;
			m_editButton.visible = (!ControllerChallenge.playOnlyMode);
		}
		
		public function HideEditButton():void {
			m_playButton.visible = false;
			m_testButton.visible = true;
			m_loadButton.visible = false;
			m_loginButton.visible = false;
			m_logoutButton.visible = false;
			m_conditionsButton.visible = true;
			m_buildBoxButton.visible = true;
			m_restrictionsButton.visible = true;
			m_editButton.visible = false;
		}
		
		public function SetTimer(frameCounter:int):void {
			if (frameCounter >= 108000) {
				m_timer1.text = "59:59";
				m_timer2.text = "59:59";
			} else {
				var mins:int = frameCounter / 1800;
				frameCounter %= 1800;
				var secs:int = frameCounter / 30;
				if (secs < 10) {
					m_timer1.text = mins + ":0" + secs;
					m_timer2.text = mins + ":0" + secs;
				} else {
					m_timer1.text = mins + ":" + secs;
					m_timer2.text = mins + ":" + secs;
				}
			}
			var format:TextFormat = new TextFormat();
			format.font = Main.GLOBAL_FONT;
			format.size = 24;
			m_timer1.setTextFormat(format);
			m_timer2.setTextFormat(format);
		}
		
		public function ShowEditPanel(wasPlayingReplay:Boolean = false):void {
			m_editPanel.visible = true;
			m_gamePanel.visible = false;
			m_pausePanel.visible = false;
			
			if (wasPlayingReplay) {
				m_gamePanel.removeChild(m_resetButton);
				m_pausePanel.removeChild(m_resetButton2);
				m_gamePanel.removeChild(m_rewindButton);
				m_pausePanel.removeChild(m_rewindButton2);
				m_gamePanel.removeChild(m_commentButton);
				m_pausePanel.removeChild(m_commentButton2);
				m_gamePanel.removeChild(m_linkButton);
				m_pausePanel.removeChild(m_linkButton2);
				m_gamePanel.removeChild(m_embedButton);
				m_pausePanel.removeChild(m_embedButton2);
				
				var format:TextFormat = new TextFormat();
				format.font = Main.GLOBAL_FONT;
				format.size = 15;
				m_resetButton = new GuiButton("Stop", 700, 35, 85, 45, cont.resetButton, GuiButton.PLAY, format);
				m_gamePanel.addChild(m_resetButton);
				m_resetButton2 = new GuiButton("Stop", 700, 35, 85, 45, cont.resetButton, GuiButton.PLAY, format);
				m_pausePanel.addChild(m_resetButton2);
				m_rewindButton = new GuiButton("Restart", 535, 45, 75, 35, cont.rewindButton, GuiButton.RED);
				m_gamePanel.addChild(m_rewindButton);
				m_rewindButton2 = new GuiButton("Restart", 535, 45, 75, 35, cont.rewindButton, GuiButton.RED);
				m_pausePanel.addChild(m_rewindButton2);
				m_saveReplayButton = new GuiButton("Save Replay", 558, 15, 120, 35, cont.saveReplayButton, GuiButton.PURPLE);
				m_gamePanel.addChild(m_saveReplayButton);
				m_saveReplayButton2 = new GuiButton("Save Replay", 558, 15, 120, 35, cont.saveReplayButton, GuiButton.PURPLE);
				m_pausePanel.addChild(m_saveReplayButton2);
				
				m_commentButton = new GuiButton("Comment on this Robot", 15, 45, 160, 35, commentButton, GuiButton.ORANGE);
				m_gamePanel.addChild(m_commentButton);
				m_commentButton2 = new GuiButton("Comment on this Robot", 15, 45, 160, 35, commentButton, GuiButton.ORANGE);
				m_pausePanel.addChild(m_commentButton2);
				m_linkButton = new GuiButton("Link to this Robot", 165, 45, 140, 35, linkButton, GuiButton.ORANGE);
				m_gamePanel.addChild(m_linkButton);
				m_linkButton2 = new GuiButton("Link to this Robot", 165, 45, 140, 35, linkButton, GuiButton.ORANGE);
				m_pausePanel.addChild(m_linkButton2);
				m_embedButton = new GuiButton("Embed this Robot", 295, 45, 140, 35, embedButton, GuiButton.ORANGE);
				m_gamePanel.addChild(m_embedButton);
				m_embedButton2 = new GuiButton("Embed this Robot", 295, 45, 140, 35, embedButton, GuiButton.ORANGE);
				m_pausePanel.addChild(m_embedButton2);
			}
		}
		
		public function ShowGamePanel():void {
			m_editPanel.visible = false;
			m_gamePanel.visible = true;
			m_pausePanel.visible = false;
			ShowFeatureButton();
			if (ControllerGame.playingReplay && ControllerGame.curReplayID != "" && ControllerGame.curReplayPublic) {
				m_rateButton.visible = true;
				m_rateButton3.visible = false;
				m_commentButton.visible = true;
				m_commentButton3.visible = false;
				m_linkButton.visible = true;
				m_linkButton3.visible = false;
				m_embedButton.visible = true;
				m_embedButton3.visible = false;
			} else if (ControllerGame.curChallengeID != "" && ControllerGame.curChallengePublic) {
				m_rateButton.visible = false;
				m_rateButton3.visible = true;
				m_commentButton.visible = false;
				m_commentButton3.visible = true;
				m_linkButton.visible = false;
				m_linkButton3.visible = true;
				m_embedButton.visible = false;
				m_embedButton3.visible = true;
			} else {
				m_rateButton.visible = true;
				m_rateButton3.visible = false;
				m_commentButton.visible = true;
				m_commentButton3.visible = false;
				m_linkButton.visible = true;
				m_linkButton3.visible = false;
				m_embedButton.visible = true;
				m_embedButton3.visible = false;
			}
		}
		
		public function ShowPausePanel(showSaveReplay:Boolean):void {
			m_editPanel.visible = false;
			m_gamePanel.visible = false;
			m_pausePanel.visible = true;
			ShowFeatureButton();
			if (m_saveReplayButton) m_saveReplayButton.visible = showSaveReplay;
			if (ControllerGame.playingReplay && ControllerGame.curReplayID != "" && ControllerGame.curReplayPublic) {
				m_rateButton2.visible = true;
				m_rateButton4.visible = false;
				m_commentButton2.visible = true;
				m_commentButton4.visible = false;
				m_linkButton2.visible = true;
				m_linkButton4.visible = false;
				m_embedButton2.visible = true;
				m_embedButton4.visible = false;
			} else if (ControllerGame.curChallengeID != "" && ControllerGame.curChallengePublic) {
				m_rateButton2.visible = false;
				m_rateButton4.visible = true;
				m_commentButton2.visible = false;
				m_commentButton4.visible = true;
				m_linkButton2.visible = false;
				m_linkButton4.visible = true;
				m_embedButton2.visible = false;
				m_embedButton4.visible = true;
			} else {
				m_rateButton2.visible = true;
				m_rateButton4.visible = false;
				m_commentButton2.visible = true;
				m_commentButton4.visible = false;
				m_linkButton2.visible = true;
				m_linkButton4.visible = false;
				m_embedButton2.visible = true;
				m_embedButton4.visible = false;
			}
		}
		
		public function ShowFeatureButton():void {
			m_featureButton.visible = Util.ObjectInArray(ControllerGame.userName, ControllerGame.ADMIN_USERS);
			m_featureButton2.visible = Util.ObjectInArray(ControllerGame.userName, ControllerGame.ADMIN_USERS);
		}
		
		public static function checkboxUncheckedBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiCheckboxABase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function checkboxUncheckedRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiCheckboxARoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function checkboxUncheckedClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiCheckboxAClick();
			bm.smoothing = true;
			return bm;
		}
		
		public static function checkboxUncheckedDisabled():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiCheckboxADisabled();
			bm.smoothing = true;
			return bm;
		}
		
		public static function checkboxCheckedBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiCheckboxBBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function checkboxCheckedRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiCheckboxBRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function checkboxCheckedClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiCheckboxBClick();
			bm.smoothing = true;
			return bm;
		}
		
		public static function checkboxCheckedDisabled():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiCheckboxBDisabled();
			bm.smoothing = true;
			return bm;
		}
		
		public static function sliderGroove():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiSliderGroove();
			bm.smoothing = true;
			return bm;
		}
		
		public static function sliderGrooveDisabled():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiSliderGrooveDisabled();
			bm.smoothing = true;
			return bm;
		}
		
		public static function scrollbarField():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiScrollbarField();
			bm.smoothing = true;
			return bm;
		}
		
		public static function scrollbarBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiScrollbarBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function scrollbarRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiScrollbarRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function scrollbarClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiScrollbarClick();
			bm.smoothing = true;
			return bm;
		}
		
		public static function scrollbarTallBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiScrollbarTallBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function scrollbarTallRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiScrollbarTallRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function scrollbarTallClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiScrollbarTallClick();
			bm.smoothing = true;
			return bm;
		}
		
		public static function scrollbarButtonUpBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiScrollbarButtonUpBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function scrollbarButtonUpRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiScrollbarButtonUpRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function scrollbarButtonUpClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiScrollbarButtonUpClick();
			bm.smoothing = true;
			return bm;
		}
		
		public static function scrollbarButtonDownBase():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiScrollbarButtonDownBase();
			bm.smoothing = true;
			return bm;
		}
		
		public static function scrollbarButtonDownRoll():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiScrollbarButtonDownRoll();
			bm.smoothing = true;
			return bm;
		}
		
		public static function scrollbarButtonDownClick():BitmapAsset {
			var bm:BitmapAsset = new Resource.cGuiScrollbarButtonDownClick();
			bm.smoothing = true;
			return bm;
		}
	}
}