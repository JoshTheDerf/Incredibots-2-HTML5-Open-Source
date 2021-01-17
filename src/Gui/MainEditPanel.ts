import { Container, Text, TextStyle } from "pixi.js";
import { ControllerChallenge, ControllerGame, ControllerGameGlobals, GuiButton, GuiWindow, Main, Resource, Util } from "../imports";

export class MainEditPanel extends GuiWindow {
  private cont: ControllerGame;

  private m_editPanel: Container;
  private m_gamePanel: Container;
  private m_pausePanel: Container;

  private m_playButton: GuiButton;
  private m_testButton: GuiButton;
  private m_editButton: GuiButton;
  private m_pauseButton: GuiButton;
  private m_resetButton: GuiButton;
  private m_resetButton2: GuiButton;
  private m_rewindButton: GuiButton;
  private m_rewindButton2: GuiButton;
  private m_saveReplayButton: GuiButton;
  private m_saveReplayButton2: GuiButton;
  private m_saveButton: GuiButton;
  private m_loadButton: GuiButton;
  private m_loginButton: GuiButton;
  private m_logoutButton: GuiButton;
  private m_restrictionsButton: GuiButton;
  private m_conditionsButton: GuiButton;
  private m_buildBoxButton: GuiButton;
  private m_newButton: GuiButton;
  private m_pasteButton: GuiButton;

  private m_timer1: Text;
  private m_timer2: Text;

  private m_circleButton: GuiButton;
  private m_rectButton: GuiButton;
  private m_triangleButton: GuiButton;
  private m_fixedJointButton: GuiButton;
  private m_revoluteJointButton: GuiButton;
  private m_prismaticJointButton: GuiButton;
  private m_mainPasteButton: GuiButton;
  private m_textButton: GuiButton;

  private m_header: Text;
  private m_rateButton: GuiButton;
  private m_rateButton2: GuiButton;
  private m_rateButton3: GuiButton;
  private m_rateButton4: GuiButton;
  private m_featureButton: GuiButton;
  private m_featureButton2: GuiButton;
  private m_commentButton: GuiButton;
  private m_commentButton2: GuiButton;
  private m_commentButton3: GuiButton;
  private m_commentButton4: GuiButton;
  private m_linkButton: GuiButton;
  private m_linkButton2: GuiButton;
  private m_linkButton3: GuiButton;
  private m_linkButton4: GuiButton;
  private m_embedButton: GuiButton;
  private m_embedButton2: GuiButton;
  private m_embedButton3: GuiButton;
  private m_embedButton4: GuiButton;

  private m_undoButton: GuiButton;
  private m_redoButton: GuiButton;
  private m_zoomInButton: GuiButton;
  private m_zoomOutButton: GuiButton;

  private m_tutorialButton: GuiButton;

  constructor(contr: ControllerGame) {
    super(0, 5, 800, 95);
    this.cont = contr;

    this.m_editPanel = new Container();
    this.addChild(this.m_editPanel);
    this.m_gamePanel = new Container();
    this.m_gamePanel.visible = false;
    this.addChild(this.m_gamePanel);
    this.m_pausePanel = new Container();
    this.m_pausePanel.visible = false;
    this.addChild(this.m_pausePanel);

    var format: TextStyle = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;

    if (!Main.inIFrame) {
      this.m_circleButton = new GuiButton("Circle", 10, 15, 105, 35, () => this.cont.circleButton(), GuiButton.BLUE);
      this.m_editPanel.addChild(this.m_circleButton);
      this.m_rectButton = new GuiButton("Rectangle", 110, 15, 105, 35, () => this.cont.rectButton(), GuiButton.BLUE);
      this.m_editPanel.addChild(this.m_rectButton);
      this.m_triangleButton = new GuiButton(
        "Triangle",
        210,
        15,
        105,
        35,
        () => this.cont.triangleButton(),
        GuiButton.BLUE
      );
      this.m_editPanel.addChild(this.m_triangleButton);
      this.m_fixedJointButton = new GuiButton(
        "Fixed Joint",
        10,
        45,
        105,
        35,
        () => this.cont.fjButton(),
        GuiButton.BLUE
      );
      this.m_editPanel.addChild(this.m_fixedJointButton);
      this.m_revoluteJointButton = new GuiButton(
        "Rotating Joint",
        110,
        45,
        105,
        35,
        () => this.cont.rjButton(),
        GuiButton.BLUE
      );
      this.m_editPanel.addChild(this.m_revoluteJointButton);
      this.m_prismaticJointButton = new GuiButton(
        "Sliding Joint",
        210,
        45,
        105,
        35,
        () => this.cont.pjButton(),
        GuiButton.BLUE
      );
      this.m_editPanel.addChild(this.m_prismaticJointButton);
      this.m_textButton = new GuiButton("Text", 310, 45, 60, 35, () => this.cont.textButton(), GuiButton.BLUE);
      this.m_editPanel.addChild(this.m_textButton);
      this.m_pasteButton = new GuiButton("Paste", 370, 45, 60, 35, () => this.cont.pasteButton(), GuiButton.ORANGE);
      this.m_editPanel.addChild(this.m_pasteButton);
      this.m_undoButton = new GuiButton("Undo", 310, 15, 60, 35, () => this.cont.undoButton(), GuiButton.ORANGE);
      this.m_editPanel.addChild(this.m_undoButton);
      this.m_redoButton = new GuiButton("Redo", 370, 15, 60, 35, () => this.cont.redoButton(), GuiButton.ORANGE);
      this.m_editPanel.addChild(this.m_redoButton);
    }
    this.m_zoomInButton = new GuiButton("Zoom In", 430, 15, 80, 35, () => this.cont.zoomInButton(), GuiButton.PINK);
    this.m_editPanel.addChild(this.m_zoomInButton);
    this.m_zoomInButton = new GuiButton("Zoom In", 430, 15, 80, 35, () => this.cont.zoomInButton(), GuiButton.PINK);
    this.m_gamePanel.addChild(this.m_zoomInButton);
    this.m_zoomInButton = new GuiButton("Zoom In", 430, 15, 80, 35, () => this.cont.zoomInButton(), GuiButton.PINK);
    this.m_pausePanel.addChild(this.m_zoomInButton);
    this.m_zoomOutButton = new GuiButton("Zoom Out", 430, 45, 80, 35, () => this.cont.zoomOutButton(), GuiButton.PINK);
    this.m_editPanel.addChild(this.m_zoomOutButton);
    this.m_zoomOutButton = new GuiButton("Zoom Out", 430, 45, 80, 35, () => this.cont.zoomOutButton(), GuiButton.PINK);
    this.m_gamePanel.addChild(this.m_zoomOutButton);
    this.m_zoomOutButton = new GuiButton("Zoom Out", 430, 45, 80, 35, () => this.cont.zoomOutButton(), GuiButton.PINK);
    this.m_pausePanel.addChild(this.m_zoomOutButton);
    this.m_conditionsButton = new GuiButton(
      "Set Conditions",
      520,
      45,
      95,
      35,
      () => this.cont.conditionsButton(),
      GuiButton.BLUE
    );
    this.m_buildBoxButton = new GuiButton(
      "Build Box",
      610,
      45,
      85,
      35,
      () => this.cont.buildBoxButton(),
      GuiButton.BLUE
    );
    this.m_restrictionsButton = new GuiButton(
      "Restrictions",
      695,
      15,
      95,
      30,
      () => this.cont.restrictionsButton(),
      GuiButton.BLUE
    );
    this.m_conditionsButton.visible = false;
    this.m_restrictionsButton.visible = false;
    this.m_buildBoxButton.visible = false;
    this.m_loadButton = new GuiButton("Load...", 520, 45, 95, 35, () => this.cont.loadButton(), GuiButton.PURPLE);
    this.m_loginButton = new GuiButton("Login", 610, 45, 85, 35, () => this.cont.loginButton(), GuiButton.PURPLE);
    this.m_loginButton.visible = ControllerGameGlobals.userName == "_Public";
    this.m_logoutButton = new GuiButton("Logout", 610, 45, 85, 35, () => this.cont.logoutButton(), GuiButton.PURPLE);
    this.m_logoutButton.visible = ControllerGameGlobals.userName != "_Public";
    this.m_editPanel.addChild(this.m_loadButton);
    this.m_editPanel.addChild(this.m_loginButton);
    this.m_editPanel.addChild(this.m_logoutButton);
    this.m_editPanel.addChild(this.m_conditionsButton);
    this.m_editPanel.addChild(this.m_buildBoxButton);
    this.m_editPanel.addChild(this.m_restrictionsButton);
    this.m_saveButton = new GuiButton("Save...", 520, 15, 95, 35, () => this.cont.saveButton(), GuiButton.PURPLE);
    this.m_editPanel.addChild(this.m_saveButton);
    this.m_newButton = new GuiButton("Main Menu", 610, 15, 85, 35, () => this.cont.newButton(), GuiButton.PURPLE);
    this.m_editPanel.addChild(this.m_newButton);
    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 15;
    this.m_playButton = new GuiButton("Resume", 610, 45, 75, 35, () => this.cont.playButton(), GuiButton.RED);
    this.m_pausePanel.addChild(this.m_playButton);
    this.m_playButton = new GuiButton("Play!", 700, 35, 85, 45, () => this.cont.playButton(), GuiButton.PLAY, format);
    this.m_editPanel.addChild(this.m_playButton);
    this.m_testButton = new GuiButton(
      "    Test\nChallenge",
      700,
      35,
      85,
      45,
      () => this.cont.playButton(),
      GuiButton.PLAY
    );
    this.m_testButton.visible = false;
    this.m_editPanel.addChild(this.m_testButton);
    this.m_editButton = new GuiButton("Edit Challenge", 695, 15, 95, 30, () => this.cont.editButton(), GuiButton.RED);
    this.m_editButton.visible = false;
    this.m_editPanel.addChild(this.m_editButton);
    this.m_pauseButton = new GuiButton("Pause", 610, 45, 75, 35, () => this.cont.pauseButton(), GuiButton.RED);
    this.m_gamePanel.addChild(this.m_pauseButton);
    this.m_resetButton = new GuiButton(
      "Stop",
      700,
      35,
      85,
      45,
      () => (ControllerGameGlobals.playingReplay ? this.cont.rewindButton() : this.cont.resetButton()),
      GuiButton.PLAY,
      format
    );
    this.m_gamePanel.addChild(this.m_resetButton);
    this.m_resetButton2 = new GuiButton(
      "Stop",
      700,
      35,
      85,
      45,
      () => (ControllerGameGlobals.playingReplay ? this.cont.rewindButton() : this.cont.resetButton()),
      GuiButton.PLAY,
      format
    );
    this.m_pausePanel.addChild(this.m_resetButton2);
    this.m_rewindButton = new GuiButton(
      ControllerGameGlobals.playingReplay ? "Rewind" : "Restart",
      535,
      45,
      75,
      35,
      () => (ControllerGameGlobals.playingReplay ? this.cont.resetButton() : this.cont.rewindButton()),
      GuiButton.RED
    );
    this.m_gamePanel.addChild(this.m_rewindButton);
    this.m_rewindButton2 = new GuiButton(
      ControllerGameGlobals.playingReplay ? "Rewind" : "Restart",
      535,
      45,
      75,
      35,
      () => (ControllerGameGlobals.playingReplay ? this.cont.resetButton() : this.cont.rewindButton()),
      GuiButton.RED
    );
    this.m_pausePanel.addChild(this.m_rewindButton2);
    if (!ControllerGameGlobals.playingReplay) {
      this.m_saveReplayButton = new GuiButton(
        "Save Replay",
        550,
        15,
        120,
        35,
        () => this.cont.saveReplayButton(),
        GuiButton.PURPLE
      );
      this.m_gamePanel.addChild(this.m_saveReplayButton);
      this.m_saveReplayButton2 = new GuiButton(
        "Save Replay",
        550,
        15,
        120,
        35,
        () => this.cont.saveReplayButton(),
        GuiButton.PURPLE
      );
      this.m_pausePanel.addChild(this.m_saveReplayButton2);
    }

    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 12;
    format.fill = "#242930";
    this.m_header = new Text(ControllerGameGlobals.playingReplay ? "    Replay in Progress" : "Simulation in Progress");
    this.m_header.x = 300;
    this.m_header.y = 25;
    this.m_header.style = format;
    this.m_gamePanel.addChild(this.m_header);
    this.m_header = new Text(ControllerGameGlobals.playingReplay ? "    Replay Paused" : "Simulation Paused");
    this.m_header.x = 310;
    this.m_header.y = 25;
    this.m_header.style = format;
    this.m_pausePanel.addChild(this.m_header);

    this.m_featureButton = new GuiButton("Feature!", 85, 15, 90, 35, () => this.cont.featureButton(), GuiButton.PURPLE);
    this.m_featureButton.visible = false;
    this.m_gamePanel.addChild(this.m_featureButton);
    this.m_featureButton2 = new GuiButton(
      "Feature!",
      85,
      15,
      90,
      35,
      () => this.cont.featureButton(),
      GuiButton.PURPLE
    );
    this.m_featureButton2.visible = false;
    this.m_pausePanel.addChild(this.m_featureButton2);
    this.ShowFeatureButton();
    this.m_rateButton = new GuiButton(
      ControllerGameGlobals.playingReplay ? "Rate this Replay!" : "Rate this Robot!",
      165,
      15,
      140,
      35,
      () => this.rateButton(),
      GuiButton.ORANGE
    );
    this.m_gamePanel.addChild(this.m_rateButton);
    this.m_rateButton2 = new GuiButton(
      ControllerGameGlobals.playingReplay ? "Rate this Replay!" : "Rate this Robot!",
      165,
      15,
      140,
      35,
      () => this.rateButton(),
      GuiButton.ORANGE
    );
    this.m_pausePanel.addChild(this.m_rateButton2);
    this.m_rateButton3 = new GuiButton(
      "Rate this Challenge!",
      165,
      15,
      140,
      35,
      () => this.rateButton(),
      GuiButton.ORANGE
    );
    this.m_rateButton3.visible = false;
    this.m_gamePanel.addChild(this.m_rateButton3);
    this.m_rateButton4 = new GuiButton(
      "Rate this Challenge!",
      165,
      15,
      140,
      35,
      () => this.rateButton(),
      GuiButton.ORANGE
    );
    this.m_rateButton4.visible = false;
    this.m_pausePanel.addChild(this.m_rateButton4);
    this.m_commentButton = new GuiButton(
      ControllerGameGlobals.playingReplay ? "Comment on this Replay" : "Comment on this Robot",
      15,
      45,
      160,
      35,
      () => this.commentButton(),
      GuiButton.ORANGE
    );
    this.m_gamePanel.addChild(this.m_commentButton);
    this.m_commentButton2 = new GuiButton(
      ControllerGameGlobals.playingReplay ? "Comment on this Replay" : "Comment on this Robot",
      15,
      45,
      160,
      35,
      () => this.commentButton(),
      GuiButton.ORANGE
    );
    this.m_pausePanel.addChild(this.m_commentButton2);
    this.m_commentButton3 = new GuiButton(
      "Comment on this Challenge",
      15,
      45,
      160,
      35,
      () => this.commentButton(),
      GuiButton.ORANGE
    );
    this.m_commentButton3.visible = false;
    this.m_gamePanel.addChild(this.m_commentButton3);
    this.m_commentButton4 = new GuiButton(
      "Comment on this Challenge",
      15,
      45,
      160,
      35,
      () => this.commentButton(),
      GuiButton.ORANGE
    );
    this.m_commentButton4.visible = false;
    this.m_pausePanel.addChild(this.m_commentButton4);
    this.m_linkButton = new GuiButton(
      ControllerGameGlobals.playingReplay ? "Link to this Replay" : "Link to this Robot",
      165,
      45,
      140,
      35,
      () => this.linkButton(),
      GuiButton.ORANGE
    );
    this.m_gamePanel.addChild(this.m_linkButton);
    this.m_linkButton2 = new GuiButton(
      ControllerGameGlobals.playingReplay ? "Link to this Replay" : "Link to this Robot",
      165,
      45,
      140,
      35,
      () => this.linkButton(),
      GuiButton.ORANGE
    );
    this.m_pausePanel.addChild(this.m_linkButton2);
    this.m_linkButton3 = new GuiButton(
      "Link to this Challenge",
      165,
      45,
      140,
      35,
      () => this.linkButton(),
      GuiButton.ORANGE
    );
    this.m_linkButton3.visible = false;
    this.m_gamePanel.addChild(this.m_linkButton3);
    this.m_linkButton4 = new GuiButton(
      "Link to this Challenge",
      165,
      45,
      140,
      35,
      () => this.linkButton(),
      GuiButton.ORANGE
    );
    this.m_linkButton4.visible = false;
    this.m_pausePanel.addChild(this.m_linkButton4);
    this.m_embedButton = new GuiButton(
      ControllerGameGlobals.playingReplay ? "Embed this Replay" : "Embed this Robot",
      295,
      45,
      140,
      35,
      () => this.embedButton(),
      GuiButton.ORANGE
    );
    this.m_gamePanel.addChild(this.m_embedButton);
    this.m_embedButton2 = new GuiButton(
      ControllerGameGlobals.playingReplay ? "Embed this Replay" : "Embed this Robot",
      295,
      45,
      140,
      35,
      () => this.embedButton(),
      GuiButton.ORANGE
    );
    this.m_pausePanel.addChild(this.m_embedButton2);
    this.m_embedButton3 = new GuiButton(
      "Embed this Challenge",
      295,
      45,
      140,
      35,
      () => this.embedButton(),
      GuiButton.ORANGE
    );
    this.m_embedButton3.visible = false;
    this.m_gamePanel.addChild(this.m_embedButton3);
    this.m_embedButton4 = new GuiButton(
      "Embed this Challenge",
      295,
      45,
      140,
      35,
      () => this.embedButton(),
      GuiButton.ORANGE
    );
    this.m_embedButton4.visible = false;
    this.m_pausePanel.addChild(this.m_embedButton4);

    const controllerName = this.cont.constructor.name;
    if (
      [
        "ControllerTutorial",
        "ControllerHomeMovies",
        "ControllerRubeGoldberg",
        "ControllerNewFeatures",
        "ControllerChallengeEditor",
      ].includes(controllerName)
    ) {
      this.m_tutorialButton = new GuiButton(
        "View Previous Tip",
        660,
        90,
        140,
        40,
        () => this.cont.tutorialButton(),
        GuiButton.PURPLE
      );
      this.m_editPanel.addChild(this.m_tutorialButton);
    }

    format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fontSize = 24;
    format.fill = "#242930";
    this.m_timer1 = new Text("");
    this.m_timer1.text = "0:00";
    this.m_timer1.x = 30;
    this.m_timer1.y = 22;
    this.m_timer1.style = format;
    this.m_gamePanel.addChild(this.m_timer1);
    this.m_timer2 = new Text("");
    this.m_timer2.text = "0:00";
    this.m_timer2.x = 30;
    this.m_timer2.y = 22;
    this.m_timer2.style = format;
    this.m_pausePanel.addChild(this.m_timer2);
  }

  public Update(curAction: number): void {
    if (!Main.inIFrame) {
      if (curAction == ControllerGameGlobals.NEW_CIRCLE) this.m_circleButton.SetState(true);
      else if (this.m_circleButton.depressed) this.m_circleButton.SetState(false);

      if (curAction == ControllerGameGlobals.NEW_RECT) this.m_rectButton.SetState(true);
      else if (this.m_rectButton.depressed) this.m_rectButton.SetState(false);

      if (curAction == ControllerGameGlobals.NEW_TRIANGLE) this.m_triangleButton.SetState(true);
      else if (this.m_triangleButton.depressed) this.m_triangleButton.SetState(false);

      if (curAction == ControllerGameGlobals.NEW_FIXED_JOINT) this.m_fixedJointButton.SetState(true);
      else if (this.m_fixedJointButton.depressed) this.m_fixedJointButton.SetState(false);

      if (curAction == ControllerGameGlobals.NEW_REVOLUTE_JOINT) this.m_revoluteJointButton.SetState(true);
      else if (this.m_revoluteJointButton.depressed) this.m_revoluteJointButton.SetState(false);

      if (curAction == ControllerGameGlobals.NEW_PRISMATIC_JOINT) this.m_prismaticJointButton.SetState(true);
      else if (this.m_prismaticJointButton.depressed) this.m_prismaticJointButton.SetState(false);

      if (curAction == ControllerGameGlobals.NEW_TEXT) this.m_textButton.SetState(true);
      else if (this.m_textButton.depressed) this.m_textButton.SetState(false);
    }
    if (ControllerGameGlobals.playingReplay) {
      this.m_featureButton.label = ControllerGameGlobals.curReplayFeatured ? "Un-feature!" : "Feature!";
      this.m_featureButton2.label = ControllerGameGlobals.curReplayFeatured ? "Un-feature!" : "Feature!";
    } else if (ControllerGameGlobals.curChallengeID != "") {
      this.m_featureButton.label = ControllerGameGlobals.curChallengeFeatured ? "Un-feature!" : "Feature!";
      this.m_featureButton2.label = ControllerGameGlobals.curChallengeFeatured ? "Un-feature!" : "Feature!";
    } else {
      this.m_featureButton.label = ControllerGameGlobals.curRobotFeatured ? "Un-feature!" : "Feature!";
      this.m_featureButton2.label = ControllerGameGlobals.curRobotFeatured ? "Un-feature!" : "Feature!";
    }
  }

  public rateButton(): void {
    if (
      ControllerGameGlobals.playingReplay &&
      ControllerGameGlobals.curReplayID != "" &&
      ControllerGameGlobals.curReplayPublic
    ) {
      this.cont.rateReplayButton();
    } else if (ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic) {
      this.cont.rateChallengeButton();
    } else {
      this.cont.rateButton();
    }
  }

  public commentButton(): void {
    if (
      ControllerGameGlobals.playingReplay &&
      ControllerGameGlobals.curReplayID != "" &&
      ControllerGameGlobals.curReplayPublic
    ) {
      this.cont.commentReplayButton();
    } else if (ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic) {
      this.cont.commentChallengeButton();
    } else {
      this.cont.commentButton();
    }
  }

  public linkButton(): void {
    if (
      ControllerGameGlobals.playingReplay &&
      ControllerGameGlobals.curReplayID != "" &&
      ControllerGameGlobals.curReplayPublic
    ) {
      this.cont.linkReplayButton();
    } else if (ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic) {
      this.cont.linkChallengeButton();
    } else {
      this.cont.linkButton();
    }
  }

  public embedButton(): void {
    if (
      ControllerGameGlobals.playingReplay &&
      ControllerGameGlobals.curReplayID != "" &&
      ControllerGameGlobals.curReplayPublic
    ) {
      this.cont.embedReplayButton();
    } else if (ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic) {
      this.cont.embedChallengeButton();
    } else {
      this.cont.embedButton();
    }
  }

  public ShowLogin(): void {
    this.m_loginButton.visible = true;
    this.m_logoutButton.visible = false;
  }

  public ShowLogout(): void {
    this.m_loginButton.visible = false;
    this.m_logoutButton.visible = true;
  }

  public ShowEditButton(): void {
    this.m_playButton.visible = true;
    this.m_testButton.visible = false;
    this.m_loadButton.visible = true;
    this.m_loginButton.visible = ControllerGameGlobals.userName == "_Public";
    this.m_logoutButton.visible = ControllerGameGlobals.userName != "_Public";
    this.m_conditionsButton.visible = false;
    this.m_buildBoxButton.visible = false;
    this.m_restrictionsButton.visible = false;
    this.m_editButton.visible = !ControllerChallenge.playOnlyMode;
  }

  public HideEditButton(): void {
    this.m_playButton.visible = false;
    this.m_testButton.visible = true;
    this.m_loadButton.visible = false;
    this.m_loginButton.visible = false;
    this.m_logoutButton.visible = false;
    this.m_conditionsButton.visible = true;
    this.m_buildBoxButton.visible = true;
    this.m_restrictionsButton.visible = true;
    this.m_editButton.visible = false;
  }

  public SetTimer(frameCounter: number): void {
    if (frameCounter >= 108000) {
      this.m_timer1.text = "59:59";
      this.m_timer2.text = "59:59";
    } else {
      var mins: number = Math.floor(frameCounter / 1800);
      frameCounter %= 1800;
      var secs: number = Math.floor(frameCounter / 30);
      if (secs < 10) {
        this.m_timer1.text = mins + ":0" + secs;
        this.m_timer2.text = mins + ":0" + secs;
      } else {
        this.m_timer1.text = mins + ":" + secs;
        this.m_timer2.text = mins + ":" + secs;
      }
    }
    var style: TextStyle = new TextStyle();
    style.fontFamily = Main.GLOBAL_FONT;
    style.fontSize = 24;
    this.m_timer1.style = style;
    this.m_timer2.style = style;
  }

  public ShowEditPanel(wasPlayingReplay: boolean = false): void {
    this.m_editPanel.visible = true;
    this.m_gamePanel.visible = false;
    this.m_pausePanel.visible = false;

    if (wasPlayingReplay) {
      this.m_gamePanel.removeChild(this.m_resetButton);
      this.m_pausePanel.removeChild(this.m_resetButton2);
      this.m_gamePanel.removeChild(this.m_rewindButton);
      this.m_pausePanel.removeChild(this.m_rewindButton2);
      this.m_gamePanel.removeChild(this.m_commentButton);
      this.m_pausePanel.removeChild(this.m_commentButton2);
      this.m_gamePanel.removeChild(this.m_linkButton);
      this.m_pausePanel.removeChild(this.m_linkButton2);
      this.m_gamePanel.removeChild(this.m_embedButton);
      this.m_pausePanel.removeChild(this.m_embedButton2);

      var format: TextStyle = new TextStyle();
      format.fontFamily = Main.GLOBAL_FONT;
      format.fontSize = 15;
      this.m_resetButton = new GuiButton("Stop", 700, 35, 85, 45, this.cont.resetButton, GuiButton.PLAY, format);
      this.m_gamePanel.addChild(this.m_resetButton);
      this.m_resetButton2 = new GuiButton("Stop", 700, 35, 85, 45, this.cont.resetButton, GuiButton.PLAY, format);
      this.m_pausePanel.addChild(this.m_resetButton2);
      this.m_rewindButton = new GuiButton("Restart", 535, 45, 75, 35, this.cont.rewindButton, GuiButton.RED);
      this.m_gamePanel.addChild(this.m_rewindButton);
      this.m_rewindButton2 = new GuiButton("Restart", 535, 45, 75, 35, this.cont.rewindButton, GuiButton.RED);
      this.m_pausePanel.addChild(this.m_rewindButton2);
      this.m_saveReplayButton = new GuiButton(
        "Save Replay",
        558,
        15,
        120,
        35,
        this.cont.saveReplayButton,
        GuiButton.PURPLE
      );
      this.m_gamePanel.addChild(this.m_saveReplayButton);
      this.m_saveReplayButton2 = new GuiButton(
        "Save Replay",
        558,
        15,
        120,
        35,
        this.cont.saveReplayButton,
        GuiButton.PURPLE
      );
      this.m_pausePanel.addChild(this.m_saveReplayButton2);

      this.m_commentButton = new GuiButton(
        "Comment on this Robot",
        15,
        45,
        160,
        35,
        this.commentButton,
        GuiButton.ORANGE
      );
      this.m_gamePanel.addChild(this.m_commentButton);
      this.m_commentButton2 = new GuiButton(
        "Comment on this Robot",
        15,
        45,
        160,
        35,
        this.commentButton,
        GuiButton.ORANGE
      );
      this.m_pausePanel.addChild(this.m_commentButton2);
      this.m_linkButton = new GuiButton("Link to this Robot", 165, 45, 140, 35, this.linkButton, GuiButton.ORANGE);
      this.m_gamePanel.addChild(this.m_linkButton);
      this.m_linkButton2 = new GuiButton("Link to this Robot", 165, 45, 140, 35, this.linkButton, GuiButton.ORANGE);
      this.m_pausePanel.addChild(this.m_linkButton2);
      this.m_embedButton = new GuiButton("Embed this Robot", 295, 45, 140, 35, this.embedButton, GuiButton.ORANGE);
      this.m_gamePanel.addChild(this.m_embedButton);
      this.m_embedButton2 = new GuiButton("Embed this Robot", 295, 45, 140, 35, this.embedButton, GuiButton.ORANGE);
      this.m_pausePanel.addChild(this.m_embedButton2);
    }
  }

  public ShowGamePanel(): void {
    this.m_editPanel.visible = false;
    this.m_gamePanel.visible = true;
    this.m_pausePanel.visible = false;
    this.ShowFeatureButton();
    if (
      ControllerGameGlobals.playingReplay &&
      ControllerGameGlobals.curReplayID != "" &&
      ControllerGameGlobals.curReplayPublic
    ) {
      this.m_rateButton.visible = true;
      this.m_rateButton3.visible = false;
      this.m_commentButton.visible = true;
      this.m_commentButton3.visible = false;
      this.m_linkButton.visible = true;
      this.m_linkButton3.visible = false;
      this.m_embedButton.visible = true;
      this.m_embedButton3.visible = false;
    } else if (ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic) {
      this.m_rateButton.visible = false;
      this.m_rateButton3.visible = true;
      this.m_commentButton.visible = false;
      this.m_commentButton3.visible = true;
      this.m_linkButton.visible = false;
      this.m_linkButton3.visible = true;
      this.m_embedButton.visible = false;
      this.m_embedButton3.visible = true;
    } else {
      this.m_rateButton.visible = true;
      this.m_rateButton3.visible = false;
      this.m_commentButton.visible = true;
      this.m_commentButton3.visible = false;
      this.m_linkButton.visible = true;
      this.m_linkButton3.visible = false;
      this.m_embedButton.visible = true;
      this.m_embedButton3.visible = false;
    }
  }

  public ShowPausePanel(showSaveReplay: boolean): void {
    this.m_editPanel.visible = false;
    this.m_gamePanel.visible = false;
    this.m_pausePanel.visible = true;
    this.ShowFeatureButton();
    if (this.m_saveReplayButton) this.m_saveReplayButton.visible = showSaveReplay;
    if (
      ControllerGameGlobals.playingReplay &&
      ControllerGameGlobals.curReplayID != "" &&
      ControllerGameGlobals.curReplayPublic
    ) {
      this.m_rateButton2.visible = true;
      this.m_rateButton4.visible = false;
      this.m_commentButton2.visible = true;
      this.m_commentButton4.visible = false;
      this.m_linkButton2.visible = true;
      this.m_linkButton4.visible = false;
      this.m_embedButton2.visible = true;
      this.m_embedButton4.visible = false;
    } else if (ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic) {
      this.m_rateButton2.visible = false;
      this.m_rateButton4.visible = true;
      this.m_commentButton2.visible = false;
      this.m_commentButton4.visible = true;
      this.m_linkButton2.visible = false;
      this.m_linkButton4.visible = true;
      this.m_embedButton2.visible = false;
      this.m_embedButton4.visible = true;
    } else {
      this.m_rateButton2.visible = true;
      this.m_rateButton4.visible = false;
      this.m_commentButton2.visible = true;
      this.m_commentButton4.visible = false;
      this.m_linkButton2.visible = true;
      this.m_linkButton4.visible = false;
      this.m_embedButton2.visible = true;
      this.m_embedButton4.visible = false;
    }
  }

  public ShowFeatureButton(): void {
    this.m_featureButton.visible = Util.ObjectInArray(
      ControllerGameGlobals.userName,
      ControllerGameGlobals.ADMIN_USERS
    );
    this.m_featureButton2.visible = Util.ObjectInArray(
      ControllerGameGlobals.userName,
      ControllerGameGlobals.ADMIN_USERS
    );
  }

  public static scrollbarField(): BitmapAsset {
    var bm: BitmapAsset = new Resource.cGuiScrollbarField();
    bm.smoothing = true;
    return bm;
  }

  public static scrollbarBase(): BitmapAsset {
    var bm: BitmapAsset = new Resource.cGuiScrollbarBase();
    bm.smoothing = true;
    return bm;
  }

  public static scrollbarRoll(): BitmapAsset {
    var bm: BitmapAsset = new Resource.cGuiScrollbarRoll();
    bm.smoothing = true;
    return bm;
  }

  public static scrollbarClick(): BitmapAsset {
    var bm: BitmapAsset = new Resource.cGuiScrollbarClick();
    bm.smoothing = true;
    return bm;
  }

  public static scrollbarTallBase(): BitmapAsset {
    var bm: BitmapAsset = new Resource.cGuiScrollbarTallBase();
    bm.smoothing = true;
    return bm;
  }

  public static scrollbarTallRoll(): BitmapAsset {
    var bm: BitmapAsset = new Resource.cGuiScrollbarTallRoll();
    bm.smoothing = true;
    return bm;
  }

  public static scrollbarTallClick(): BitmapAsset {
    var bm: BitmapAsset = new Resource.cGuiScrollbarTallClick();
    bm.smoothing = true;
    return bm;
  }

  public static scrollbarButtonUpBase(): BitmapAsset {
    var bm: BitmapAsset = new Resource.cGuiScrollbarButtonUpBase();
    bm.smoothing = true;
    return bm;
  }

  public static scrollbarButtonUpRoll(): BitmapAsset {
    var bm: BitmapAsset = new Resource.cGuiScrollbarButtonUpRoll();
    bm.smoothing = true;
    return bm;
  }

  public static scrollbarButtonUpClick(): BitmapAsset {
    var bm: BitmapAsset = new Resource.cGuiScrollbarButtonUpClick();
    bm.smoothing = true;
    return bm;
  }

  public static scrollbarButtonDownBase(): BitmapAsset {
    var bm: BitmapAsset = new Resource.cGuiScrollbarButtonDownBase();
    bm.smoothing = true;
    return bm;
  }

  public static scrollbarButtonDownRoll(): BitmapAsset {
    var bm: BitmapAsset = new Resource.cGuiScrollbarButtonDownRoll();
    bm.smoothing = true;
    return bm;
  }

  public static scrollbarButtonDownClick(): BitmapAsset {
    var bm: BitmapAsset = new Resource.cGuiScrollbarButtonDownClick();
    bm.smoothing = true;
    return bm;
  }
}
