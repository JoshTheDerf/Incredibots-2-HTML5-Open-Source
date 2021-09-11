import { b2AABB, b2Contact } from "../Box2D";
import { Challenge, ControllerGameGlobals, ControllerSandbox, Database, Main, Replay, Robot, TextPart } from "../imports";

export class ControllerChallenge extends ControllerSandbox {
  public static challenge: Challenge;
  public static playChallengeMode: boolean = false;
  public static playOnlyMode: boolean = false;

  public controllerType: string = "challenge";

  constructor() {
    super();
    if (!ControllerChallenge.challenge) ControllerChallenge.challenge = new Challenge(ControllerChallenge.settings);
    this.BuildBuildArea();
  }

  public Update(): void {
    super.Update();

    if (this.simStarted && !this.paused) {
      for (var i: number = 0; i < ControllerChallenge.challenge.winConditions.length; i++) {
        ControllerChallenge.challenge.winConditions[i].Update(this.allParts, ControllerGameGlobals.cannonballs);
      }
      for (i = 0; i < ControllerChallenge.challenge.lossConditions.length; i++) {
        ControllerChallenge.challenge.lossConditions[i].Update(this.allParts, ControllerGameGlobals.cannonballs);
      }
    }

    if (ControllerChallenge.playChallengeMode) {
      this.m_guiPanel.ShowEditButton();
    } else {
      this.m_guiPanel.HideEditButton();
    }
  }

  public playButton (maybeShowAd: boolean = true): void {
    if (!ControllerChallenge.playChallengeMode) {
      ControllerChallenge.challenge.allParts = this.allParts.filter(this.PartIsEditable);
      ControllerChallenge.playChallengeMode = true;
      for (var i: number = 0; i < ControllerChallenge.challenge.allParts.length; i++) {
        ControllerChallenge.challenge.allParts[i].isEditable = false;
      }
      this.m_sidePanel.visible = false;
      this.CheckIfPartsFit();
      this.selectedParts = new Array();
      this.actions = new Array();
      this.lastAction = -1;
    } else {
      if (!this.simStarted) {
        for (i = 0; i < ControllerChallenge.challenge.winConditions.length; i++) {
          ControllerChallenge.challenge.winConditions[i].isSatisfied = false;
        }
        for (i = 0; i < ControllerChallenge.challenge.lossConditions.length; i++) {
          ControllerChallenge.challenge.lossConditions[i].isSatisfied = false;
        }
      }
      super.playButton(maybeShowAd);
    }
  }

  public editButton(confirmed: boolean = false): void {
    if (confirmed) {
      this.m_fader.visible = false;
      this.m_progressDialog.visible = false;
      ControllerChallenge.playChallengeMode = false;
      this.allParts = new Array();
      this.RefreshSandboxSettings();
      for (var i: number = 0; i < ControllerChallenge.challenge.allParts.length; i++) {
        this.allParts.push(ControllerChallenge.challenge.allParts[i]);
        ControllerChallenge.challenge.allParts[i].isEditable = true;
        if (ControllerChallenge.challenge.allParts[i] instanceof TextPart) {
          if (ControllerChallenge.challenge.allParts[i].inFront) {
            this.addChildAt(
              ControllerChallenge.challenge.allParts[i].m_textField,
              this.getChildIndex(this.m_canvas) + 1
            );
          } else {
            this.addChildAt(ControllerChallenge.challenge.allParts[i].m_textField, this.getChildIndex(this.m_canvas));
          }
        }
      }
    } else {
      this.m_fader.visible = true;
      if (ControllerChallenge.playOnlyMode) {
        this.ShowDialog3("This challenge is uneditable!");
        this.m_progressDialog.ShowOKButton();
        this.m_progressDialog.StopTimer();
      } else {
        this.ShowConfirmDialog(
          "Are you sure you want to edit this challenge?          (Your current robot will be lost)",
          11
        );
      }
    }
  }

  public circleButton(): void {
    if (ControllerChallenge.playChallengeMode && !ControllerChallenge.challenge.circlesAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Circles are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.circleButton();
    }
  }

  public rectButton(): void {
    if (ControllerChallenge.playChallengeMode && !ControllerChallenge.challenge.rectanglesAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Rectangles are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.rectButton();
    }
  }

  public triangleButton(): void {
    if (ControllerChallenge.playChallengeMode && !ControllerChallenge.challenge.trianglesAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Triangles are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.triangleButton();
    }
  }

  public fjButton(): void {
    if (ControllerChallenge.playChallengeMode && !ControllerChallenge.challenge.fixedJointsAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Fixed Joints are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.fjButton();
    }
  }

  public rjButton(): void {
    if (ControllerChallenge.playChallengeMode && !ControllerChallenge.challenge.rotatingJointsAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Rotating Joints are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.rjButton();
    }
  }

  public pjButton(): void {
    if (ControllerChallenge.playChallengeMode && !ControllerChallenge.challenge.slidingJointsAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Sliding Joints are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.pjButton();
    }
  }

  public thrustersButton(): void {
    if (ControllerChallenge.playChallengeMode && !ControllerChallenge.challenge.thrustersAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Thrusters are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.thrustersButton();
    }
  }

  public cannonButton(): void {
    if (ControllerChallenge.playChallengeMode && !ControllerChallenge.challenge.cannonsAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Cannons are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.cannonButton();
    }
  }

  protected GetBuildingArea(): b2AABB {
    return ControllerChallenge.challenge.buildAreas[0];
  }

  protected GetBuildingAreaNumber(i: number): b2AABB {
    return ControllerChallenge.challenge.buildAreas[i];
  }

  protected NumBuildingAreas(): number {
    return ControllerChallenge.challenge.buildAreas.length;
  }

  public DeleteBuildBoxes(e: Event): void {
    this.m_fader.visible = false;
    this.m_progressDialog.visible = false;
    for (var i: number = 0; i < this.m_buildAreas.length; i++) {
      this.removeChild(this.m_buildAreas[i]);
      this.removeChild(this.m_badBuildAreas[i]);
      this.removeChild(this.m_selectedBuildAreas[i]);
    }
    this.m_buildAreas = new Array();
    this.m_badBuildAreas = new Array();
    this.m_selectedBuildAreas = new Array();
    ControllerChallenge.challenge.buildAreas = new Array();
    this.redrawBuildArea = true;
  }

  public ContactAdded(contact: b2Contact): void {
    for (var i: number = 0; i < ControllerChallenge.challenge.winConditions.length; i++) {
      ControllerChallenge.challenge.winConditions[i].ContactAdded(contact, this.allParts, ControllerGameGlobals.cannonballs);
    }
    for (i = 0; i < ControllerChallenge.challenge.lossConditions.length; i++) {
      ControllerChallenge.challenge.lossConditions[i].ContactAdded(contact, this.allParts, ControllerGameGlobals.cannonballs);
    }
  }

  public ChallengeOver(): boolean {
    return this.WonChallenge() || this.LostChallenge();
  }

  protected WonChallenge(): boolean {
    if (ControllerChallenge.challenge.winConditions.length == 0) return false;
    for (var i: number = 0; i < ControllerChallenge.challenge.lossConditions.length; i++) {
      if (ControllerChallenge.challenge.lossConditions[i].isSatisfied) return false;
    }
    if (ControllerChallenge.challenge.winConditionsAnded) {
      for (i = 0; i < ControllerChallenge.challenge.winConditions.length; i++) {
        if (!ControllerChallenge.challenge.winConditions[i].isSatisfied) return false;
      }
      return true;
    } else {
      for (i = 0; i < ControllerChallenge.challenge.winConditions.length; i++) {
        if (ControllerChallenge.challenge.winConditions[i].isSatisfied) return true;
      }
      return false;
    }
  }

  protected LostChallenge(): boolean {
    for (var i: number = 0; i < ControllerChallenge.challenge.lossConditions.length; i++) {
      if (
        ControllerChallenge.challenge.lossConditions[i].isSatisfied &&
        ControllerChallenge.challenge.lossConditions[i].immediate
      ) {
        return true;
      }
    }
    return false;
  }

  public GetScore(): number {
    return 10000 - this.frameCounter;
  }

  public submitButton(): void {
    if (Main.inIFrame) {
      this.m_fader.visible = true;
      this.ShowConfirmDialog("Redirect to incredibots2.com?", 7);
    } else {
      if (!curRobotEditable) return;
      if (curChallengeID == "") {
        this.m_scoreWindow.ShowFader();
        this.ShowDialog2("You must save your challenge publicly first!");
      } else {
        if (userName != "_Public") {
          this.AddSyncPoint();
          if (ControllerGameGlobals.viewingUnsavedReplay)
            Database.SaveReplay(
              userName,
              password,
              replay,
              "_ScoreReplay",
              "This replay is saved for a score",
              curRobotID,
              new Robot(this.allParts, ControllerSandbox.settings),
              this.ChallengeOver() ? this.GetScore() : -1,
              curChallengeID,
              1,
              this.finishSavingReplay
            );
          else
            Database.SaveReplay(
              userName,
              password,
              new Replay(
                this.cameraMovements,
                this.syncPoints,
                this.keyPresses,
                this.frameCounter,
                Database.VERSION_STRING_FOR_REPLAYS
              ),
              "_ScoreReplay",
              "This replay is saved for a score",
              curRobotID,
              new Robot(this.allParts, ControllerSandbox.settings),
              this.ChallengeOver() ? this.GetScore() : -1,
              curChallengeID,
              1,
              this.finishSavingReplay
            );
          this.m_scoreWindow.ShowFader();
          this.ShowDialog("Submitting score...");
          this.clickedSubmitScore = true;
        } else {
          this.clickedSubmitScore = true;
          this.loginButton(true, false);
        }
      }
    }
  }
}
