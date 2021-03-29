import { ByteArray } from "../../General/ByteArray";
import { ControllerChallenge, ControllerGameGlobals, ControllerSandbox, Database, Resource } from "../../imports";
import { Challenge } from "../Challenge";

export class ControllerSpaceship extends ControllerChallenge {
  constructor() {
    super();
    ControllerChallenge.playChallengeMode = true;
    ControllerChallenge.playOnlyMode = true;

    if (!ControllerGameGlobals.playingReplay) {
      Resource.cSpaceship.arrayBuffer()
        .then((b: ArrayBuffer) => new ByteArray(b))
        .then((b: ByteArray) => {
          b.uncompress()
          return b
        })
        .then((b: ByteArray) => Database.ExtractChallengeFromByteArray(b))
        .then((c:Challenge) => {
          ControllerSpaceship.challenge = c;
          ControllerGameGlobals.loadedParts = ControllerSpaceship.challenge.allParts;
          // ControllerSandbox.settings = ControllerSpaceship.challenge.settings;
        })
    }

    this.draw.m_drawXOff = -10000;
    this.draw.m_drawYOff = 50;
    this.m_physScale = 24;
  }

  public Init(e: Event): void {
    super.Init(e);
    if (!ControllerGameGlobals.viewingUnsavedReplay) this.ShowTutorialDialog(107, true);
  }

  public CloseTutorialDialog(num: number): void {
    if (num == 107) {
      this.ShowTutorialDialog(68);
    } else {
      super.CloseTutorialDialog(num);
    }
  }

  private ShowTutorialDialog(num: number, moreButton: boolean = false): void {
    this.ShowTutorialWindow(num, 276, 130, moreButton);
  }

  public saveButton(): void {
    this.ShowDisabledDialog();
  }

  public saveReplayButton(): void {
    this.ShowDisabledDialog();
    if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
  }

  public submitButton(): void {
    this.ShowDisabledDialog();
    if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
  }

  public commentButton(robotID: String = "", robotPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public linkButton(robotID: String = "", robotPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public embedButton(robotID: String = "", robotPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public commentReplayButton(replayID: String = "", replayPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public linkReplayButton(replayID: String = "", replayPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public embedReplayButton(replayID: String = "", replayPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }
}
