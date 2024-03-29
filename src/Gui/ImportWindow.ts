import { Text, TextStyle } from "pixi.js";
import { Controller, Database, GuiButton, GuiTextArea, GuiWindow, Main } from "../imports";

export class ImportWindow extends GuiWindow {
  public static TYPE_ROBOT: number = 0;
  public static TYPE_REPLAY: number = 1;
  public static TYPE_CHALLENGE: number = 2;

  private cont: Controller;
  private msgArea: Text;
  private linkArea: GuiTextArea;
  private importButton: GuiButton;
  private cancelButton: GuiButton;
  private type: number;

  constructor(contr: Controller, iType: number) {
    super(244, 83, 312, 434, false);
    this.cont = contr;
    this.type = iType;
    var format: TextStyle = new TextStyle();
    format.fontFamily = Main.GLOBAL_FONT;
    format.fill = "#242930";
    format.fontSize = 12;
    format.align = "center";
    this.msgArea = new Text("");
    this.msgArea.x = 300 / 2;
    this.msgArea.y = 85 / 2;
    this.msgArea.anchor.set(0.5, 0.5);
    this.msgArea.text =
      "Copy and paste the text you got from exporting\nyour " +
      (this.type == ImportWindow.TYPE_ROBOT
        ? "robot"
        : this.type == ImportWindow.TYPE_REPLAY
        ? "replay"
        : "challenge") +
      ' in the box below, then press "Import."';
    this.msgArea.style = format;
    this.addChild(this.msgArea);

    format = new TextStyle();
    format.fontSize = 10;
    this.linkArea = new GuiTextArea(15, 85, 265, 260, format);
    this.addChild(this.linkArea);

    this.importButton = new GuiButton("Import", 100, 345, 100, 35, () => this.doImport(), GuiButton.ORANGE);
    this.addChild(this.importButton);
    this.cancelButton = new GuiButton(
      "Cancel",
      100,
      375,
      100,
      35,
      () => this.cont.HideImportDialog(),
      GuiButton.PURPLE
    );
    this.addChild(this.cancelButton);
  }

  private async doImport() {
    if (this.linkArea.text.length > 0) {
      this.cont.HideImportDialog();
      if (this.type == ImportWindow.TYPE_ROBOT) {
        this.cont.processLoadedRobot(await Database.ImportRobot(this.linkArea.text));
      } else if (this.type == ImportWindow.TYPE_REPLAY) {
        this.cont.processLoadedReplay(await Database.ImportReplay(this.linkArea.text));
      } else if (this.type == ImportWindow.TYPE_CHALLENGE) {
        this.cont.processLoadedChallenge(await Database.ImportChallenge(this.linkArea.text));
      }
    }
  }
}
