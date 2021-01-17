import { Container } from "pixi.js";
import { Challenge, Robot } from "../imports";

class IllegalOperationError extends Error {}

export class Controller extends Container {
  public controllerType: string = "controller";

  public Update(): void {
    throw new IllegalOperationError("abstract function Controller.Update() called");
  }

  public ShowDialog(msg: string): void {}

  public ShowDialog2(msg: string): void {}

  public ShowDialog3(msg: string): void {}

  public ShowLinkDialog(
    msg1: string,
    msg2: string,
    isEmbedReplay: boolean = false,
    id: string = "",
    isEmbedChallenge: boolean = false
  ): void {}

  public HideDialog(e: Event): void {}

  public HideLinkDialog(e: Event): void {}

  public HideExportDialog(e: Event): void {}

  public HideImportDialog(e: Event): void {}

  public ShowImportWindow(type: number): void {}

  public ShowConfirmDialog(msg: string, type: number): void {}

  public HideConfirmDialog(e: Event): void {}

  public ConfirmDeleteRobot(e: MouseEvent): void {}

  public ConfirmDeleteReplay(e: MouseEvent): void {}

  public ConfirmDeleteChallenge(e: MouseEvent): void {}

  public ConfirmLogout(e: MouseEvent): void {}

  public DialogOK(e: Event): void {}

  public finishGettingLoadRobotData(e: Event): void {}

  public finishGettingLoadReplayData(e: Event): void {}

  public finishGettingLoadChallengeData(e: Event): void {}

  public finishGettingLoadChallengeForScoreData(e: Event): void {}

  public finishGettingScoreData(e: Event): void {}

  public finishLoading(e: Event): void {}

  public finishLoadingReplay(e: Event): void {}

  public finishLoadingChallenge(e: Event): void {}

  public finishDeleting(e: Event): void {}

  public finishDeletingReplay(e: Event): void {}

  public finishDeletingChallenge(e: Event): void {}

  public loginButton(
    e: MouseEvent,
    displayMessage: boolean = false,
    backToSave: boolean = false,
    saveLoadWindowOpen: boolean = false
  ): void {}

  public finishLoggingIn(e: Event): void {}

  public finishAddingUser(e: Event): void {}

  public finishExporting(exportStr: string, robotStr: string): void {}

  public commentButton(e: MouseEvent, robotID: string = "", robotPublic: boolean = false): void {}

  public linkButton(e: MouseEvent, robotID: string = "", robotPublic: boolean = false): void {}

  public embedButton(e: MouseEvent, robotID: string = "", robotPublic: boolean = false): void {}

  public commentReplayButton(e: MouseEvent, replayID: string = "", replayPublic: boolean = false): void {}

  public linkReplayButton(e: MouseEvent, replayID: string = "", replayPublic: boolean = false): void {}

  public embedReplayButton(e: MouseEvent, replayID: string = "", replayPublic: boolean = false): void {}

  public commentChallengeButton(e: MouseEvent, challengeID: string = "", challengePublic: boolean = false): void {}

  public linkChallengeButton(e: MouseEvent, challengeID: string = "", challengePublic: boolean = false): void {}

  public embedChallengeButton(e: MouseEvent, challengeID: string = "", challengePublic: boolean = false): void {}

  public processLoadedRobot(robot: Robot): void {}

  public processLoadedReplay(replayAndRobot: Array<any>): void {}

  public processLoadedChallenge(challenge: Challenge): void {}

  public GuiCallback(index: number): void {}

  public IsPaused(): boolean {
    return false;
  }

  public GetPhysScale(): number {
    return 30;
  }

  public GetMinX(): number {
    return -25;
  }

  public GetMaxX(): number {
    return 25;
  }

  public GetMinY(): number {
    return -25;
  }

  public GetMaxY(): number {
    return 25;
  }

  public World2ScreenX(x: number): number {
    return x * 40;
  }

  public World2ScreenY(y: number): number {
    return y * 40;
  }

  public keyInput(key: number, up: boolean): void {}

  public SyncReplay(syncPoint: Object): void {}

  public SyncReplay2(syncPoint1: Object, syncPoint2: Object): void {}

  public MoveCameraForReplay(cameraMovement: Object): void {}
}
