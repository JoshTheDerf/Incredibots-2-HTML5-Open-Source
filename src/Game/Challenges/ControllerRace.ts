import { ControllerChallenge, ControllerSandbox, Database, Resource } from "../../imports";

export class ControllerRace extends ControllerChallenge {
  constructor() {
    super();
    ControllerRace.playChallengeMode = true;
    ControllerRace.playOnlyMode = true;

    if (!playingReplay) {
      var b: ByteArray = new Resource.cRace();
      b.uncompress();
      ControllerRace.challenge = Database.ExtractChallengeFromByteArray(b);
      loadedParts = ControllerRace.challenge.allParts;
      ControllerSandbox.settings = ControllerRace.challenge.settings;
    }

    this.draw.m_drawXOff = -10000;
    this.draw.m_drawYOff = -10000;
    initZoom = ControllerRace.challenge.zoomLevel;
    this.m_physScale = ControllerRace.challenge.zoomLevel;
  }

  public Init(e: Event): void {
    super.Init(e);
    if (!viewingUnsavedReplay) this.ShowTutorialDialog(107, true);
  }

  public CloseTutorialDialog(num: number): void {
    if (num == 107) {
      this.ShowTutorialDialog(67);
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
