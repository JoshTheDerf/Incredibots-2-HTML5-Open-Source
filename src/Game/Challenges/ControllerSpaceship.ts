import { ControllerChallenge, ControllerGameGlobals, ControllerSandbox, Database, Resource } from "../../imports";

export class ControllerSpaceship extends ControllerChallenge {
  constructor() {
    super();
    ControllerChallenge.playChallengeMode = true;
    ControllerChallenge.playOnlyMode = true;

    if (!playingReplay) {
      var b: ByteArray = new Resource.cSpaceship();
      b.uncompress();
      ControllerSpaceship.challenge = Database.ExtractChallengeFromByteArray(b);
      loadedParts = ControllerSpaceship.challenge.allParts;
      ControllerSandbox.settings = ControllerSpaceship.challenge.settings;
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

  public saveButton(e: MouseEvent): void {
    this.ShowDisabledDialog();
  }

  public saveReplayButton(e: MouseEvent): void {
    this.ShowDisabledDialog();
    if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
  }

  public submitButton(e: MouseEvent): void {
    this.ShowDisabledDialog();
    if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
  }

  public commentButton(e: MouseEvent, robotID: String = "", robotPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public linkButton(e: MouseEvent, robotID: String = "", robotPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public embedButton(e: MouseEvent, robotID: String = "", robotPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public commentReplayButton(e: MouseEvent, replayID: String = "", replayPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public linkReplayButton(e: MouseEvent, replayID: String = "", replayPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }

  public embedReplayButton(e: MouseEvent, replayID: String = "", replayPublic: boolean = false): void {
    this.ShowDisabledDialog();
  }
}
