import { ByteArray, ControllerChallenge, ControllerGameGlobals, ControllerSandbox, Database, Resource } from "../../imports";

export class ControllerRace extends ControllerChallenge {
  constructor() {
    super();
    ControllerChallenge.playChallengeMode = true;
    ControllerChallenge.playOnlyMode = true;

    if (!ControllerGameGlobals.playingReplay) {
      this.loadRace()
    }

    this.draw.m_drawXOff = -10000;
    this.draw.m_drawYOff = -10000;
    ControllerGameGlobals.initZoom = ControllerRace.challenge.zoomLevel;
    this.m_physScale = ControllerRace.challenge.zoomLevel;
  }

  async loadRace() {
    var b: ByteArray = new ByteArray(await Resource.cRace.arrayBuffer());
    await b.uncompress();
    ControllerRace.challenge = Database.ExtractChallengeFromByteArray(b);
    ControllerGameGlobals.loadedParts = ControllerRace.challenge.allParts;
    // ControllerSandbox.settings = ControllerRace.challenge.settings;
  }

  public Init(e: Event): void {
    super.Init(e);
    if (!ControllerGameGlobals.viewingUnsavedReplay) this.ShowTutorialDialog(107, true);
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
