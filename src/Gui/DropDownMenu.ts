import { Graphics, Text, TextStyle, Texture } from "pixi.js";
import { ControllerGame, ControllerGameGlobals, DropDownMenuItem, Main, Resource } from "../imports";

class MenuText extends Graphics {
  private text;

  constructor(text: string, x: number, width: number) {
    super();
    const w = width;
    const h = 21;
    this.interactive = true;
    this.text = new Text(text);
    this.text.anchor.set(0.5);
    this.text.x = x + w / 2;
    this.text.y = h / 2;
    this.addChild(this.text);

    this.beginFill(0xffffff, 0.01);
    this.drawRect(x, 0, w, h);
    this.endFill();
  }

  set style(value: TextStyle) {
    this.text.style = value;
  }

  get style(): TextStyle {
    return this.text.style;
  }
}

export class DropDownMenu extends Graphics {
  private cont: ControllerGame;
  private mouseDown: boolean = false;

  private menuBitmap: Texture;
  private menuBitmapRoll: Texture;

  private fileText: MenuText;
  private editText: MenuText;
  private viewText: MenuText;
  private commentText: MenuText;
  private helpText: MenuText;
  private aboutText: MenuText;
  private extrasText: MenuText;

  private m_currentMenu: Graphics | null;

  constructor(contr: ControllerGame) {
    super();
    this.cont = contr;
    this.m_currentMenu = null;
    this.interactive = true;

    this.menuBitmap = Resource.cGuiMenuBar;
    this.menuBitmapRoll = Resource.cGuiMenuBarRoll;

    this.beginTextureFill({ texture: this.menuBitmap });
    this.drawRect(0, 0, 800, 21);

    const format = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.align = "center";
    format.fill = "#E1E1EA";
    format.fontSize = 12;
    format.dropShadow = true;
    format.dropShadowColor = "#343550";
    format.dropShadowDistance = 1;

    this.fileText = new MenuText("File", 0, 40);
    this.fileText.interactive = true;
    this.fileText.style = format;
    this.fileText.on("mousedown", (event: any) => this.file(event));
    this.fileText.on("mouseover", (event: any) => this.maybeFile(event));
    this.fileText.on("mouseout", (event: any) => this.noFile(event));
    this.addChild(this.fileText);

    this.editText = new MenuText("Edit", 40, 40);
    this.editText.interactive = true;
    this.editText.style = format;
    this.editText.on("mousedown", (event: any) => this.edit(event));
    this.editText.on("mouseover", (event: any) => this.maybeEdit(event));
    this.editText.on("mouseout", (event: any) => this.noEdit(event));
    this.addChild(this.editText);
    this.viewText = new MenuText("View", 80, 40);
    this.viewText.interactive = true;
    this.viewText.style = format;
    this.viewText.on("mousedown", (event: any) => this.view(event));
    this.viewText.on("mouseover", (event: any) => this.maybeView(event));
    this.viewText.on("mouseout", (event: any) => this.noView(event));
    this.addChild(this.viewText);
    this.commentText = new MenuText("Share!", 120, 60);
    this.commentText.interactive = true;
    this.commentText.style = format;
    this.commentText.on("mousedown", (event: any) => this.comment(event));
    this.commentText.on("mouseover", (event: any) => this.maybeComment(event));
    this.commentText.on("mouseout", (event: any) => this.noComment(event));
    this.addChild(this.commentText);
    this.helpText = new MenuText("Help", 180, 45);
    this.helpText.interactive = true;
    this.helpText.style = format;
    this.helpText.on("mousedown", (event: any) => this.help(event));
    this.helpText.on("mouseover", (event: any) => this.maybeHelp(event));
    this.helpText.on("mouseout", (event: any) => this.noHelp(event));
    this.addChild(this.helpText);
    this.aboutText = new MenuText("About", 750, 50);
    this.aboutText.interactive = true;
    this.aboutText.style = format;
    this.aboutText.on("mousedown", (event: any) => this.about(event));
    this.aboutText.on("mouseover", (event: any) => this.maybeAbout(event));
    this.aboutText.on("mouseout", (event: any) => this.noAbout(event));
    this.addChild(this.aboutText);
    this.extrasText = new MenuText("Extras", 225, 50);
    this.extrasText.interactive = true;
    this.extrasText.style = format;
    this.extrasText.on("mousedown", (event: any) => this.extras(event));
    this.extrasText.on("mouseover", (event: any) => this.maybeExtras(event));
    this.extrasText.on("mouseout", (event: any) => this.noExtras(event));
    this.addChild(this.extrasText);
  }

  public Update(): void {}

  public MouseClick(up: boolean, x: number, y: number): void {
    if (y > 20 && (!this.m_currentMenu || !this.MouseOverMenu(x, y))) {
      this.HideAll();
    }
  }

  private BuildFileMenu(): void {
    if (this.m_currentMenu) this.removeChild(this.m_currentMenu);
    this.m_currentMenu = new Graphics();
    this.m_currentMenu.interactive = true;
    this.m_currentMenu.x = 0;
    this.m_currentMenu.y = 20;
    this.m_currentMenu.beginFill(0xfdf9ea, 1);
    this.m_currentMenu.lineStyle(1, 0x43366f);
    this.m_currentMenu.moveTo(0, 0);
    this.m_currentMenu.drawRect(0, 0, 155, 200);
    var item: DropDownMenuItem = new DropDownMenuItem(this, "Main Menu", 155, () => this.cont.newButton());
    item.y = 0;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Save...", 155, () => this.cont.saveButton());
    item.y = 20;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Load Robot", 155, () => this.cont.loadRobotButton());
    item.y = 40;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Load And Insert", 155, () => this.cont.loadAndInsertButton());
    item.y = 60;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Load Replay", 155, () => this.cont.loadReplayButton());
    item.y = 80;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Load Challenge", 155, () => this.cont.loadChallengeButton());
    item.y = 100;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Log In", 155, () => this.cont.loginButton());
    item.y = 120;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "View High Scores", 155, () => this.cont.highScoresButton());
    item.y = 140;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Report As Inappropriate", 155, () => this.cont.reportButton());
    item.y = 160;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, Main.enableSound ? "Disable Sound" : "Enable Sound", 155, () =>
      this.soundButton()
    );
    item.y = 180;
    this.m_currentMenu.addChild(item);
    this.addChild(this.m_currentMenu);
  }

  private BuildEditMenu(): void {
    if (this.m_currentMenu) this.removeChild(this.m_currentMenu);
    this.m_currentMenu = new Graphics();
    this.m_currentMenu.interactive = true;
    this.m_currentMenu.x = 40;
    this.m_currentMenu.y = 20;
    this.m_currentMenu.beginFill(0xfdf9ea, 1);
    this.m_currentMenu.lineStyle(1, 0x43366f);
    this.m_currentMenu.moveTo(0, 0);
    this.m_currentMenu.drawRect(0, 0, 120, 200);
    var item: DropDownMenuItem = new DropDownMenuItem(this, "Change Settings", 120, () =>
      this.cont.sandboxSettingsButton()
    );
    item.y = 0;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Clear All", 120, () => this.cont.clearButton());
    item.y = 20;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Undo", 120, () => this.cont.undoButton());
    item.y = 40;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Redo", 120, () => this.cont.redoButton());
    item.y = 60;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Cut", 120, () => this.cont.cutButton());
    item.y = 80;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Copy", 120, () => this.cont.copyButton());
    item.y = 100;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Paste", 120, () => this.pasteButton());
    item.y = 120;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Delete", 120, () => this.cont.deleteButton());
    item.y = 140;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Move to Front", 120, () => this.cont.frontButton());
    item.y = 160;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Move to Back", 120, () => this.cont.backButton());
    item.y = 180;
    this.m_currentMenu.addChild(item);
    this.addChild(this.m_currentMenu);
  }

  private BuildViewMenu(): void {
    if (this.m_currentMenu) this.removeChild(this.m_currentMenu);
    this.m_currentMenu = new Graphics();
    this.m_currentMenu.interactive = true;
    this.m_currentMenu.x = 80;
    this.m_currentMenu.y = 21;
    this.m_currentMenu.beginFill(0xfdf9ea, 1);
    this.m_currentMenu.lineStyle(1, 0x43366f);
    this.m_currentMenu.moveTo(0, 0);
    this.m_currentMenu.drawRect(0, 0, 140, 140);
    var item: DropDownMenuItem = new DropDownMenuItem(this, "Zoom In", 140, () => this.cont.zoomInButton());
    item.y = 0;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Zoom Out", 140, () => this.cont.zoomOutButton());
    item.y = 20;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(
      this,
      "Snap to Center",
      140,
      () => this.cont.centerBox(),
      true,
      ControllerGameGlobals.snapToCenter
    );
    item.y = 40;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(
      this,
      "Show Joints",
      140,
      () => this.cont.jointBox(),
      true,
      ControllerGameGlobals.showJoints
    );
    item.y = 60;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(
      this,
      "Show Colors",
      140,
      () => this.cont.colourBox(),
      true,
      ControllerGameGlobals.showColours
    );
    item.y = 80;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(
      this,
      "Show Outlines",
      140,
      () => this.cont.globalOutlineBox(),
      true,
      ControllerGameGlobals.showOutlines
    );
    item.y = 100;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(
      this,
      "Center on Selection",
      140,
      () => this.cont.centerOnSelectedBox(),
      true,
      ControllerGameGlobals.centerOnSelected
    );
    item.y = 120;
    this.m_currentMenu.addChild(item);
    this.addChild(this.m_currentMenu);
  }

  private BuildCommentMenu(): void {
    if (this.m_currentMenu) this.removeChild(this.m_currentMenu);
    this.m_currentMenu = new Graphics();
    this.m_currentMenu.interactive = true;
    this.m_currentMenu.x = 120;
    this.m_currentMenu.y = 21;
    this.m_currentMenu.beginFill(0xfdf9ea, 1);
    this.m_currentMenu.lineStyle(1, 0x43366f);
    this.m_currentMenu.moveTo(0, 0);
    this.m_currentMenu.drawRect(0, 0, 180, 60);
    if (ControllerGameGlobals.playingReplay) {
      var item: DropDownMenuItem = new DropDownMenuItem(this, "Comment on this Replay", 180, () =>
        this.cont.commentReplayButton()
      );
      item.y = 0;
      this.m_currentMenu.addChild(item);
      item = new DropDownMenuItem(this, "Link to this Replay", 180, () => this.cont.linkReplayButton());
      item.y = 20;
      this.m_currentMenu.addChild(item);
      item = new DropDownMenuItem(this, "Embed this Replay", 180, () => this.cont.embedReplayButton());
      item.y = 40;
      this.m_currentMenu.addChild(item);
    } else if (
      this.cont.constructor.name === "ControllerChallenge" &&
      ControllerGameGlobals.curChallengeID != "" &&
      ControllerGameGlobals.curChallengePublic
    ) {
      item = new DropDownMenuItem(this, "Comment on this Challenge", 180, () => this.cont.commentChallengeButton());
      item.y = 0;
      this.m_currentMenu.addChild(item);
      item = new DropDownMenuItem(this, "Link to this Challenge", 180, () => this.cont.linkChallengeButton());
      item.y = 20;
      this.m_currentMenu.addChild(item);
      item = new DropDownMenuItem(this, "Embed this Challenge", 180, () => this.cont.embedChallengeButton());
      item.y = 40;
      this.m_currentMenu.addChild(item);
    } else {
      item = new DropDownMenuItem(this, "Comment on this Robot", 180, () => this.cont.commentButton());
      item.y = 0;
      this.m_currentMenu.addChild(item);
      item = new DropDownMenuItem(this, "Link to this Robot", 180, () => this.cont.linkButton());
      item.y = 20;
      this.m_currentMenu.addChild(item);
      item = new DropDownMenuItem(this, "Embed this Robot", 180, () => this.cont.embedButton());
      item.y = 40;
      this.m_currentMenu.addChild(item);
    }
    this.addChild(this.m_currentMenu);
  }

  private BuildHelpMenu(): void {
    if (this.m_currentMenu) this.removeChild(this.m_currentMenu);
    this.m_currentMenu = new Graphics();
    this.m_currentMenu.interactive = true;
    this.m_currentMenu.x = 180;
    this.m_currentMenu.y = 21;
    this.m_currentMenu.beginFill(0xfdf9ea, 1);
    this.m_currentMenu.lineStyle(1, 0x43366f);
    this.m_currentMenu.moveTo(0, 0);
    this.m_currentMenu.drawRect(0, 0, 115, 40);
    var item: DropDownMenuItem = new DropDownMenuItem(this, "Incredibots Help", 115, () => this.helpButton());
    item.y = 0;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Forums", 115, () => this.forumsButton());
    item.y = 20;
    this.m_currentMenu.addChild(item);
    this.addChild(this.m_currentMenu);
  }

  private BuildAboutMenu(): void {
    if (this.m_currentMenu) this.removeChild(this.m_currentMenu);
    this.m_currentMenu = new Graphics();
    this.m_currentMenu.interactive = true;
    this.m_currentMenu.x = 670;
    this.m_currentMenu.y = 21;
    this.m_currentMenu.beginFill(0xfdf9ea, 1);
    this.m_currentMenu.lineStyle(1, 0x43366f);
    this.m_currentMenu.moveTo(0, 0);
    this.m_currentMenu.drawRect(0, 0, 130, 40);
    var item: DropDownMenuItem = new DropDownMenuItem(this, "Credits", 130, () => this.credits());
    item.y = 0;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "GrubbyGames.com", 130, () => this.grubby());
    item.y = 20;
    this.m_currentMenu.addChild(item);
    this.addChild(this.m_currentMenu);
  }

  private BuildExtrasMenu(): void {
    if (this.m_currentMenu) this.removeChild(this.m_currentMenu);
    this.m_currentMenu = new Graphics();
    this.m_currentMenu.interactive = true;
    this.m_currentMenu.x = 225;
    this.m_currentMenu.y = 21;
    this.m_currentMenu.beginFill(0xfdf9ea, 1);
    this.m_currentMenu.lineStyle(1, 0x43366f);
    this.m_currentMenu.moveTo(0, 0);
    this.m_currentMenu.drawRect(0, 0, 115, this.cont.controllerType === "sandbox" ? 100 : 60);
    var item: DropDownMenuItem = new DropDownMenuItem(this, "Mirror Horizontal", 115, () =>
      this.mirrorHorizontalButton()
    );
    item.y = 0;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Mirror Vertical", 115, () => this.mirrorVerticalButton());
    item.y = 20;
    this.m_currentMenu.addChild(item);
    item = new DropDownMenuItem(this, "Scale", 115, () => this.cont.scaleButton());
    item.y = 40;
    this.m_currentMenu.addChild(item);
    if (this.cont.controllerType === "sandbox") {
      item = new DropDownMenuItem(this, "Thrusters", 115, () => this.cont.thrustersButton());
      item.y = 60;
      this.m_currentMenu.addChild(item);
      item = new DropDownMenuItem(this, "Cannon", 115, () => this.cont.cannonButton());
      item.y = 80;
      this.m_currentMenu.addChild(item);
    }
    this.addChild(this.m_currentMenu);
  }

  public MouseOverMenu(x: number, y: number): boolean {
    if (!this.m_currentMenu) return false;
    return (
      this.m_currentMenu &&
      x >= this.m_currentMenu.x &&
      x < this.m_currentMenu.x + this.m_currentMenu.width &&
      y >= this.m_currentMenu.y &&
      y < this.m_currentMenu.y + this.m_currentMenu.height
    );
  }

  private file(e: any, callback: boolean = true): void {
    if (this.mouseDown && callback) {
      this.noFile(e);
      this.mouseDown = false;
    } else {
      this.noEdit(e);
      this.MakeDummyMenu();
      this.noView(e);
      this.MakeDummyMenu();
      this.noComment(e);
      this.MakeDummyMenu();
      this.noHelp(e);
      this.MakeDummyMenu();
      this.noAbout(e);
      this.MakeDummyMenu();
      this.noExtras(e);
      this.beginTextureFill({ texture: this.menuBitmapRoll });
      this.drawRect(0, 0, 40, 21);
      this.BuildFileMenu();
      this.mouseDown = true;
    }
  }

  private maybeFile(e: any): void {
    if (this.mouseDown) {
      this.file(e, false);
    }
  }

  private noFile(e: any): void {
    if (e.target === this || e.target === this.m_currentMenu) return;
    if (this.m_currentMenu && !this.MouseOverMenu(e.data.global.x, e.data.global.y)) {
      this.beginTextureFill({ texture: this.menuBitmap });
      this.drawRect(0, 0, 40, 21);
      this.removeChild(this.m_currentMenu);
      this.m_currentMenu = null;
    }
  }

  private edit(e: any, callback: boolean = true): void {
    if (this.mouseDown && callback) {
      this.noEdit(e);
      this.mouseDown = false;
    } else {
      this.noFile(e);
      this.MakeDummyMenu();
      this.noView(e);
      this.MakeDummyMenu();
      this.noComment(e);
      this.MakeDummyMenu();
      this.noHelp(e);
      this.MakeDummyMenu();
      this.noAbout(e);
      this.MakeDummyMenu();
      this.noExtras(e);
      this.beginTextureFill({ texture: this.menuBitmapRoll });
      this.drawRect(40, 0, 40, 21);
      this.mouseDown = true;
      this.BuildEditMenu();
    }
  }

  private maybeEdit(e: any): void {
    if (this.mouseDown) {
      this.edit(e, false);
    }
  }

  private noEdit(e: any): void {
    if (e.target === this || e.target === this.m_currentMenu) return;
    if (this.m_currentMenu && !this.MouseOverMenu(e.stageX, e.stageY)) {
      this.beginTextureFill({ texture: this.menuBitmap });
      this.drawRect(40, 0, 40, 21);
      this.removeChild(this.m_currentMenu);
      this.m_currentMenu = null;
    }
  }

  private view(e: any, callback: boolean = true): void {
    if (this.mouseDown && callback) {
      this.noView(e);
      this.mouseDown = false;
    } else {
      this.noFile(e);
      this.MakeDummyMenu();
      this.noEdit(e);
      this.MakeDummyMenu();
      this.noComment(e);
      this.MakeDummyMenu();
      this.noHelp(e);
      this.MakeDummyMenu();
      this.noAbout(e);
      this.MakeDummyMenu();
      this.noExtras(e);
      this.beginTextureFill({ texture: this.menuBitmapRoll });
      this.drawRect(80, 0, 40, 21);
      this.mouseDown = true;
      this.BuildViewMenu();
    }
  }

  private maybeView(e: any): void {
    if (this.mouseDown) {
      this.view(e, false);
    }
  }

  private noView(e: any): void {
    if (e.target === this || e.target === this.m_currentMenu) return;
    if (this.m_currentMenu && !this.MouseOverMenu(e.stageX, e.stageY)) {
      this.beginTextureFill({ texture: this.menuBitmap });
      this.drawRect(80, 0, 40, 21);
      this.removeChild(this.m_currentMenu);
      this.m_currentMenu = null;
    }
  }

  private comment(e: any, callback: boolean = true): void {
    if (this.mouseDown && callback) {
      this.noComment(e);
      this.mouseDown = false;
    } else {
      this.noFile(e);
      this.MakeDummyMenu();
      this.noEdit(e);
      this.MakeDummyMenu();
      this.noView(e);
      this.MakeDummyMenu();
      this.noHelp(e);
      this.MakeDummyMenu();
      this.noAbout(e);
      this.MakeDummyMenu();
      this.noExtras(e);
      this.beginTextureFill({ texture: this.menuBitmapRoll });
      this.drawRect(120, 0, 60, 21);
      this.mouseDown = true;
      this.BuildCommentMenu();
    }
  }

  private maybeComment(e: any): void {
    if (this.mouseDown) {
      this.comment(e, false);
    }
  }

  private noComment(e: any): void {
    if (e.target === this || e.target === this.m_currentMenu) return;
    if (this.m_currentMenu && !this.MouseOverMenu(e.stageX, e.stageY)) {
      this.beginTextureFill({ texture: this.menuBitmap });
      this.drawRect(120, 0, 60, 21);
      this.removeChild(this.m_currentMenu);
      this.m_currentMenu = null;
    }
  }

  private help(e: any, callback: boolean = true): void {
    if (this.mouseDown && callback) {
      this.noHelp(e);
      this.mouseDown = false;
    } else {
      this.noFile(e);
      this.MakeDummyMenu();
      this.noEdit(e);
      this.MakeDummyMenu();
      this.noView(e);
      this.MakeDummyMenu();
      this.noComment(e);
      this.MakeDummyMenu();
      this.noAbout(e);
      this.MakeDummyMenu();
      this.noExtras(e);
      this.beginTextureFill({ texture: this.menuBitmapRoll });
      this.drawRect(180, 0, 40, 21);
      this.mouseDown = true;
      this.BuildHelpMenu();
    }
  }

  private maybeHelp(e: any): void {
    if (this.mouseDown) {
      this.help(e, false);
    }
  }

  private noHelp(e: any): void {
    if (e.target === this || e.target === this.m_currentMenu) return;
    if (this.m_currentMenu && !this.MouseOverMenu(e.stageX, e.stageY)) {
      this.beginTextureFill({ texture: this.menuBitmap });
      this.drawRect(180, 0, 40, 21);
      this.removeChild(this.m_currentMenu);
      this.m_currentMenu = null;
    }
  }

  private about(e: any, callback: boolean = true): void {
    if (this.mouseDown && callback) {
      this.noAbout(e);
      this.mouseDown = false;
    } else {
      this.noFile(e);
      this.MakeDummyMenu();
      this.noEdit(e);
      this.MakeDummyMenu();
      this.noView(e);
      this.MakeDummyMenu();
      this.noComment(e);
      this.MakeDummyMenu();
      this.noHelp(e);
      this.MakeDummyMenu();
      this.noExtras(e);
      this.beginTextureFill({ texture: this.menuBitmapRoll });
      this.drawRect(750, 0, 50, 21);
      this.mouseDown = true;
      this.BuildAboutMenu();
    }
  }

  private maybeAbout(e: any): void {
    if (this.mouseDown) {
      this.about(e, false);
    }
  }

  private noAbout(e: any): void {
    if (e.target === this || e.target === this.m_currentMenu) return;
    if (this.m_currentMenu && !this.MouseOverMenu(e.stageX, e.stageY)) {
      this.beginTextureFill({ texture: this.menuBitmap });
      this.drawRect(750, 0, 50, 21);
      this.removeChild(this.m_currentMenu);
      this.m_currentMenu = null;
    }
  }

  private extras(e: any, callback: boolean = true): void {
    if (this.mouseDown && callback) {
      this.noExtras(e);
      this.mouseDown = false;
    } else {
      this.noFile(e);
      this.MakeDummyMenu();
      this.noEdit(e);
      this.MakeDummyMenu();
      this.noView(e);
      this.MakeDummyMenu();
      this.noComment(e);
      this.MakeDummyMenu();
      this.noHelp(e);
      this.MakeDummyMenu();
      this.noAbout(e);
      this.beginTextureFill({ texture: this.menuBitmapRoll });
      this.drawRect(225, 0, 50, 21);
      this.mouseDown = true;
      this.BuildExtrasMenu();
    }
  }

  private maybeExtras(e: any): void {
    if (this.mouseDown) {
      this.extras(e, false);
    }
  }

  private noExtras(e: any): void {
    if (e.target === this || e.target === this.m_currentMenu) return;
    if (this.m_currentMenu && !this.MouseOverMenu(e.stageX, e.stageY)) {
      this.beginTextureFill({ texture: this.menuBitmap });
      this.drawRect(225, 0, 50, 21);
      this.removeChild(this.m_currentMenu);
      this.m_currentMenu = null;
    }
  }

  public HideAll(): void {
    if (this.m_currentMenu) {
      this.removeChild(this.m_currentMenu);
      this.m_currentMenu = null;
      this.beginTextureFill({ texture: this.menuBitmap });
      this.drawRect(0, 0, 800, 21);
    }
    this.mouseDown = false;
  }

  private MakeDummyMenu(): void {
    this.m_currentMenu = new Graphics();
    this.addChild(this.m_currentMenu);
  }

  private pasteButton(): void {
    this.cont.ignoreAClick = true;
    this.cont.pasteButton();
  }

  private mirrorHorizontalButton(): void {
    this.cont.ignoreAClick = true;
    this.cont.mirrorHorizontal();
  }

  private mirrorVerticalButton(): void {
    this.cont.ignoreAClick = true;
    this.cont.mirrorVertical();
  }

  private soundButton(): void {
    Main.enableSound = !Main.enableSound;
  }

  private credits(): void {
    Main.BrowserRedirect("http://www.incredifriends.com/", true);
  }

  private grubby(): void {
    Main.BrowserRedirect("http://www.grubbygames.com", true);
  }

  private helpButton(): void {
    Main.BrowserRedirect("http://www.incredifriends.com/", true);
  }

  private forumsButton(): void {
    Main.BrowserRedirect("http://www.incredifriends.com/", true);
  }
}
