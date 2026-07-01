import { ByteArray } from "../../General/ByteArray";
import { ControllerChallenge } from "../ControllerChallenge"
import { ControllerSandbox } from "../ControllerSandbox"
import { ControllerGameGlobals } from "../Globals/ControllerGameGlobals"
import { Resource } from "../Graphics/Resource"
import { Database } from "../../General/Database"
import { Challenge } from "../Challenge";

export class ControllerSpaceship extends ControllerChallenge {

  public IsSpaceship(): boolean {
    return true;
  }
  constructor(cSpaceship: ByteArray|null) {
    super();
    ControllerGameGlobals.playChallengeMode = true;
    ControllerGameGlobals.playOnlyMode = true;

    if (!ControllerGameGlobals.playingReplay && cSpaceship) {
      cSpaceship.uncompress()
      const challenge = Database.ExtractChallengeFromByteArray(cSpaceship)
      ControllerGameGlobals.challenge = challenge;
      ControllerGameGlobals.loadedParts = ControllerGameGlobals.challenge.allParts;
      ControllerGameGlobals.settings = ControllerGameGlobals.challenge.settings;
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
