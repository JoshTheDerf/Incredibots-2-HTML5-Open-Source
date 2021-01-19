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

  public HideDialog(): void {}

  public HideLinkDialog(): void {}

  public HideExportDialog(): void {}

  public HideImportDialog(): void {}

  public ShowImportWindow(type: number): void {}

  public ShowConfirmDialog(msg: string, type: number): void {}

  public HideConfirmDialog(): void {}

  public ConfirmDeleteRobot(): void {}

  public ConfirmDeleteReplay(): void {}

  public ConfirmDeleteChallenge(): void {}

  public ConfirmLogout(): void {}

  public DialogOK(): void {}

  public finishGettingLoadRobotData(): void {}

  public finishGettingLoadReplayData(): void {}

  public finishGettingLoadChallengeData(): void {}

  public finishGettingLoadChallengeForScoreData(): void {}

  public finishGettingScoreData(): void {}

  public finishLoading(): void {}

  public finishLoadingReplay(): void {}

  public finishLoadingChallenge(): void {}

  public finishDeleting(): void {}

  public finishDeletingReplay(): void {}

  public finishDeletingChallenge(): void {}

  public loginButton(
    displayMessage: boolean = false,
    backToSave: boolean = false,
    saveLoadWindowOpen: boolean = false
  ): void {}

  public finishLoggingIn(): void {}

  public finishAddingUser(): void {}

  public finishExporting(exportStr: string, robotStr: string): void {}

  public commentButton(robotID: string = "", robotPublic: boolean = false): void {}

  public linkButton(robotID: string = "", robotPublic: boolean = false): void {}

  public embedButton(robotID: string = "", robotPublic: boolean = false): void {}

  public commentReplayButton(replayID: string = "", replayPublic: boolean = false): void {}

  public linkReplayButton(replayID: string = "", replayPublic: boolean = false): void {}

  public embedReplayButton(replayID: string = "", replayPublic: boolean = false): void {}

  public commentChallengeButton(challengeID: string = "", challengePublic: boolean = false): void {}

  public linkChallengeButton(challengeID: string = "", challengePublic: boolean = false): void {}

  public embedChallengeButton(challengeID: string = "", challengePublic: boolean = false): void {}

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
