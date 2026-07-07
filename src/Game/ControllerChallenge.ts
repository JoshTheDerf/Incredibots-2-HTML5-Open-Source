import { b2AABB, b2Contact } from "../Box2D";
import { Challenge } from "./Challenge"
import { ControllerSandbox } from "./ControllerSandbox"
import { ControllerGameGlobals } from "./Globals/ControllerGameGlobals"
import { Replay } from "./Replay"
import { Robot } from "./Robot"
import { Database } from "../General/Database"
import { Main } from "../Main"
import { TextPart } from "../Parts/TextPart"

export class ControllerChallenge extends ControllerSandbox {
  public controllerType: string = "challenge";

  constructor() {
    super();
    if (!ControllerGameGlobals.challenge) ControllerGameGlobals.challenge = new Challenge(ControllerGameGlobals.settings);
    this.BuildBuildArea();
  }

  public Update(): void {
    super.Update();

    if (this.simStarted && !this.paused) {
      for (var i: number = 0; i < ControllerGameGlobals.challenge.winConditions.length; i++) {
        ControllerGameGlobals.challenge.winConditions[i].Update(this.allParts, ControllerGameGlobals.cannonballs);
      }
      for (i = 0; i < ControllerGameGlobals.challenge.lossConditions.length; i++) {
        ControllerGameGlobals.challenge.lossConditions[i].Update(this.allParts, ControllerGameGlobals.cannonballs);
      }
    }

    if (ControllerGameGlobals.playChallengeMode) {
      this.m_guiPanel.ShowEditButton();
    } else {
      this.m_guiPanel.HideEditButton();
    }
  }

  public playButton (maybeShowAd: boolean = true): void {
    if (!ControllerGameGlobals.playChallengeMode) {
      ControllerGameGlobals.challenge.allParts = this.allParts.filter(this.PartIsEditable);
      ControllerGameGlobals.playChallengeMode = true;
      for (var i: number = 0; i < ControllerGameGlobals.challenge.allParts.length; i++) {
        ControllerGameGlobals.challenge.allParts[i].isEditable = false;
      }
      this.m_sidePanel.visible = false;
      this.CheckIfPartsFit();
      this.selectedParts = new Array();
      this.actions = new Array();
      this.lastAction = -1;
    } else {
      if (!this.simStarted) {
        for (i = 0; i < ControllerGameGlobals.challenge.winConditions.length; i++) {
          ControllerGameGlobals.challenge.winConditions[i].isSatisfied = false;
        }
        for (i = 0; i < ControllerGameGlobals.challenge.lossConditions.length; i++) {
          ControllerGameGlobals.challenge.lossConditions[i].isSatisfied = false;
        }
      }
      super.playButton(maybeShowAd);
    }
  }

  public editButton(confirmed: boolean = false): void {
    if (confirmed) {
      this.m_fader.visible = false;
      this.m_progressDialog.visible = false;
      ControllerGameGlobals.playChallengeMode = false;
      this.allParts = new Array();
      this.RefreshSandboxSettings();
      for (var i: number = 0; i < ControllerGameGlobals.challenge.allParts.length; i++) {
        this.allParts.push(ControllerGameGlobals.challenge.allParts[i]);
        ControllerGameGlobals.challenge.allParts[i].isEditable = true;
        // TextPart Text objects are created/attached lazily by the renderer
        // (Draw) per-frame, straddling the canvas by each part's `inFront` flag.
      }
    } else {
      this.m_fader.visible = true;
      if (ControllerGameGlobals.playOnlyMode) {
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
    if (ControllerGameGlobals.playChallengeMode && !ControllerGameGlobals.challenge.circlesAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Circles are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.circleButton();
    }
  }

  public rectButton(): void {
    if (ControllerGameGlobals.playChallengeMode && !ControllerGameGlobals.challenge.rectanglesAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Rectangles are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.rectButton();
    }
  }

  public triangleButton(): void {
    if (ControllerGameGlobals.playChallengeMode && !ControllerGameGlobals.challenge.trianglesAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Triangles are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.triangleButton();
    }
  }

  public fjButton(): void {
    if (ControllerGameGlobals.playChallengeMode && !ControllerGameGlobals.challenge.fixedJointsAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Fixed Joints are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.fjButton();
    }
  }

  public rjButton(): void {
    if (ControllerGameGlobals.playChallengeMode && !ControllerGameGlobals.challenge.rotatingJointsAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Rotating Joints are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.rjButton();
    }
  }

  public pjButton(): void {
    if (ControllerGameGlobals.playChallengeMode && !ControllerGameGlobals.challenge.slidingJointsAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Sliding Joints are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.pjButton();
    }
  }

  public thrustersButton(): void {
    if (ControllerGameGlobals.playChallengeMode && !ControllerGameGlobals.challenge.thrustersAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Thrusters are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.thrustersButton();
    }
  }

  public cannonButton(): void {
    if (ControllerGameGlobals.playChallengeMode && !ControllerGameGlobals.challenge.cannonsAllowed) {
      this.m_fader.visible = true;
      this.ShowDialog3("Cannons are not allowed in this challenge!");
      this.m_progressDialog.ShowOKButton();
      this.m_progressDialog.StopTimer();
    } else {
      super.cannonButton();
    }
  }

  protected GetBuildingArea(): b2AABB {
    return ControllerGameGlobals.challenge.buildAreas[0];
  }

  protected GetBuildingAreaNumber(i: number): b2AABB {
    return ControllerGameGlobals.challenge.buildAreas[i];
  }

  protected NumBuildingAreas(): number {
    return ControllerGameGlobals.challenge.buildAreas.length;
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
    ControllerGameGlobals.challenge.buildAreas = new Array();
    this.redrawBuildArea = true;
  }

  public ContactAdded(contact: b2Contact): void {
    for (var i: number = 0; i < ControllerGameGlobals.challenge.winConditions.length; i++) {
      ControllerGameGlobals.challenge.winConditions[i].ContactAdded(contact, this.allParts, ControllerGameGlobals.cannonballs);
    }
    for (i = 0; i < ControllerGameGlobals.challenge.lossConditions.length; i++) {
      ControllerGameGlobals.challenge.lossConditions[i].ContactAdded(contact, this.allParts, ControllerGameGlobals.cannonballs);
    }
  }

  public ChallengeOver(): boolean {
    return this.WonChallenge() || this.LostChallenge();
  }

  protected WonChallenge(): boolean {
    if (ControllerGameGlobals.challenge.winConditions.length == 0) return false;
    for (var i: number = 0; i < ControllerGameGlobals.challenge.lossConditions.length; i++) {
      if (ControllerGameGlobals.challenge.lossConditions[i].isSatisfied) return false;
    }
    if (ControllerGameGlobals.challenge.winConditionsAnded) {
      for (i = 0; i < ControllerGameGlobals.challenge.winConditions.length; i++) {
        if (!ControllerGameGlobals.challenge.winConditions[i].isSatisfied) return false;
      }
      return true;
    } else {
      for (i = 0; i < ControllerGameGlobals.challenge.winConditions.length; i++) {
        if (ControllerGameGlobals.challenge.winConditions[i].isSatisfied) return true;
      }
      return false;
    }
  }

  protected LostChallenge(): boolean {
    for (var i: number = 0; i < ControllerGameGlobals.challenge.lossConditions.length; i++) {
      if (
        ControllerGameGlobals.challenge.lossConditions[i].isSatisfied &&
        ControllerGameGlobals.challenge.lossConditions[i].immediate
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
      // BUG FIX (port): these referenced bare AS3 statics that were moved to
      // ControllerGameGlobals; the bare names would throw ReferenceError.
      if (!ControllerGameGlobals.curRobotEditable) return;
      if (ControllerGameGlobals.curChallengeID == "") {
        this.m_scoreWindow.ShowFader();
        this.ShowDialog2("You must save your challenge publicly first!");
      } else {
        if (ControllerGameGlobals.userName != "_Public") {
          this.AddSyncPoint();
          if (ControllerGameGlobals.viewingUnsavedReplay)
            Database.SaveReplay(
              ControllerGameGlobals.userName,
              ControllerGameGlobals.password,
              ControllerGameGlobals.replay,
              "_ScoreReplay",
              "This replay is saved for a score",
              ControllerGameGlobals.curRobotID,
              new Robot(this.allParts, ControllerGameGlobals.settings),
              this.ChallengeOver() ? this.GetScore() : -1,
              ControllerGameGlobals.curChallengeID,
              1,
              this.finishSavingReplay
            );
          else
            Database.SaveReplay(
              ControllerGameGlobals.userName,
              ControllerGameGlobals.password,
              new Replay(
                this.cameraMovements,
                this.syncPoints,
                this.keyPresses,
                this.frameCounter,
                Database.VERSION_STRING_FOR_REPLAYS
              ),
              "_ScoreReplay",
              "This replay is saved for a score",
              ControllerGameGlobals.curRobotID,
              new Robot(this.allParts, ControllerGameGlobals.settings),
              this.ChallengeOver() ? this.GetScore() : -1,
              ControllerGameGlobals.curChallengeID,
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
