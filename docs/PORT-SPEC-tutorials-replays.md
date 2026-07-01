# PORT SPEC — Tutorials + Replays

Faithful-port spec for the tutorial system and the deterministic replay
record/playback mechanism. Written against the **original** legacy source.

Primary sources:
- `src/Game/Tutorials/ControllerTutorial.ts` + 10 subclasses.
- `src/Gui/TutorialWindow.ts` — the tutorial message dialog + the message table.
- `src/Gui/TutorialSelectWindow.ts` — the level-select → controller mapping.
- `src/Game/Replay.ts`, `src/Game/ReplaySyncPoint.ts` — replay data + playback.
- `src/Game/ControllerGame.ts` — recording hooks, sync points, spline playback.

---

## PART A — TUTORIALS

### A.1 The model: a dialog-driven state machine (NOT a linear step array)

There is no generic "step index" model. Each tutorial subclass is a small
**hand-coded state machine over message-dialog numbers**:

- `Init(e)` (called once when the controller starts) shows the FIRST dialog, e.g.
  `ControllerJumpbot.ts:86-89` → `ShowTutorialDialog(15)`.
- The base `ShowTutorialWindow(phraseNum, x, y, moreButton=false)`
  (`ControllerGame.ts:6475-6479`) constructs `new TutorialWindow(this, x, y,
  phraseNum, moreButton)` and adds it. Each subclass wraps this in a private
  `ShowTutorialDialog(num, moreButton=false)` that fixes the x/y position (often
  in world coords, e.g. `ControllerJumpbot.ts:127-128`
  `ShowTutorialWindow(num, World2ScreenX(-48), World2ScreenY(-1), moreButton)`).
- When the user clicks the dialog's button, `TutorialWindow.closeWindow()`
  (`TutorialWindow.ts:111-113`) calls back `cont.CloseTutorialDialog(this.num)`.
- Each subclass **overrides `CloseTutorialDialog(num)`** as a `switch(num)` that
  either advances to the next message or performs a game action, e.g.
  `ControllerCatapult.ts:93-99`: closing 32 → show 33; closing 33 → show 34;
  else defer to `super.CloseTutorialDialog(num)`.
- Progression is also driven by **gameplay events**, not just button clicks —
  subclasses override game hooks (part-created, joint-created, play, etc.) and
  call `ShowTutorialDialog(nextNum)` when the player does the required action.
  (See the deep per-subclass branching in `ControllerHomeMovies.ts:324-437`,
  `ControllerChallengeEditor.ts:327-372`.)

So a tutorial = `{ initialMessageId, transition(messageId, event) → nextMessageId
| action }`. Faithful porting means preserving each subclass's exact `num→num`
branches and the game-event triggers between them.

### A.2 The message table (`TutorialWindow.ts`)

- `TUTORIAL_MESSAGES: Array<string>` (`TutorialWindow.ts:115+`) is the single
  static table; index = the `id`/`phraseNum`. IDs seen span ~0–107 (tutorials 0–60ish,
  challenge intros 67/90-107). Each entry is a `\n`-delimited string.
- **Multi-page split:** a message may contain `\n\n`, splitting into up to 3
  sub-areas (`msgArea`, `msgArea2`, `msgArea3`, `:39-100`). NOTE: in the current
  port `numAreas` is hardcoded to 1 (`:35`), so the split code is effectively
  dead and the whole string renders in one area — verify whether the original
  AS3 computed `numAreas` from the `\n\n` count. **Flag: possible latent bug /
  intended single-area rendering.**
- **Window sizing/position** is keyed on specific ids (`:19-28`): height 185 for
  id 25, 180 for a specific id set (`1,4,14,21,23,27,30,44,48,50,52,53,56,57,58,
  60` and `71..81`), else 170. The button label is "More..." when `moreButton`
  else "OK", positioned by id (`:102`). x clamped to `[100,520]` (or `[50,520]`
  for id≥70), y clamped to `[120,380]`. The window is draggable
  (`ControllerGame.ts:2147-2152, 1506-1507`).
- Text style: fontSize 12, lineHeight 12, leading 2, center, wordWrap width 228,
  fill `0x242930`, `Main.GLOBAL_FONT` (`:44-52`).

### A.3 Tutorial terrain + setup

- The base `ControllerTutorial` constructor (`ControllerTutorial.ts:20-…`) builds
  a Sky of type 0 (`this.sSky = new Sky(this, 0)`, `:23`), `BuildBuildArea()`
  (`:25`), and then a LARGE hardcoded static landscape: hundreds of static
  `Circle`/`Triangle`/`Rectangle` parts (`isStatic=true, isEditable=false,
  drawAnyway=false`), e.g. `:28-130+`. These are baked geometry, not driven by
  `SandboxSettings`. **The core must replicate the exact vertex lists** (they are
  part of the collision world the tutorial robots interact with).
- Each subclass additionally loads its pre-built robot / props and defines its
  build zone(s). (E.g. the Car/Dumpbot tutorials come with wheels+body already
  placed for the player to joint together — see the message flow.)

### A.4 Level-select mapping (`TutorialSelectWindow.ts`)

Buttons map to `Main.nextControllerType` and to a **level-done index** used by
`LSOManager.IsLevelDone(i)` / `SetLevelDone(i)`:

| button | tutorial | controllerType | levelDone idx |
|---|---|---|---|
| 1. Drive a Tank | ControllerTank | 10 | 0 |
| 2. Shape Up | ControllerShapes | 11 | 1 |
| 3. Car Creation | ControllerCar | 12 | 2 |
| 4. JumpBot | ControllerJumpbot | 13 | 3 |
| 5. DumpBot | ControllerDumpbot | 14 | 4 |
| 6. Catapult | ControllerCatapult | 15 | 5 |
| 7. Home Movies | ControllerHomeMovies | 16 | 6 |
| 8. Rube Goldberg | ControllerRubeGoldberg | 17 | 7 |
| 9. New in IB2 | ControllerNewFeatures | 18 | 8 |
| 10. Challenges | ControllerChallengeEditor | 19 | 9 |

(`TutorialSelectWindow.ts:35-66`; controllerTypes at `createController.ts:45-64`.)

The 4 built-in **challenges** also occupy this level-select grid (idx 10-13):
Monkey Bars / Climb / Bike Race / Spaceships (`TutorialSelectWindow.ts:54-61`) →
controllerType 2/3/4/5.

**Level-done write** happens on win (`ControllerGame.ts:754-762`):
- tutorial win: `LSOManager.SetLevelDone(Main.nextControllerType - 10)` → 0-9.
- challenge win: `LSOManager.SetLevelDone(Main.nextControllerType + 8)` → 10-13.

Per-tutorial default sandbox settings from `TutorialSelectWindow.ts:110-164`:
most use `SandboxSettings(15, 1, 0, 0, 0)`; a few override
(e.g. `(1.0, 0, 1, 5, 1)` low-grav/box/moon/space at `:124`;
`(15, 0, 2, 0, 5)` land-empty/sunset at `:132,156`). Replicate per subclass.

### A.5 Proposed GameCore/state for tutorials

The COMMANDS-TODO already lists `loadTutorial(levelIndex)`, `nextTutorialStep`,
`prevTutorialStep`, `closeTutorial`, `closeTutorialSelect`. Given A.1, model it
as:

```ts
// Command
| { type: "loadTutorial"; levelIndex: number }     // 0-9 (or a controllerType)
| { type: "advanceTutorial"; messageId: number }   // == CloseTutorialDialog(num)
| { type: "closeTutorial" }
```
```ts
// GameState
export interface TutorialState {
  active: boolean;
  levelIndex: number;                 // 0-13
  currentMessageId: number | null;    // index into the message table
  currentMessage: { text: string; hasMore: boolean; x: number; y: number } | null;
  levelsDone: boolean[];              // mirrors LSOManager.IsLevelDone(0..13)
}
```
- The per-tutorial state machine (the `CloseTutorialDialog` switch + game-event
  triggers) lives in the core as data/handlers keyed by `levelIndex`. The
  message TABLE is shared static data.
- `advanceTutorial(messageId)` reproduces `CloseTutorialDialog(num)`: look up the
  next message (or fire the associated action) for that tutorial+num.
- Game-event-driven transitions: the core's editing/sim command handlers must
  notify the active tutorial machine (e.g. "a rotating joint was created") so it
  can advance — replaces the subclass method overrides.
- `levelsDone` replaces `LSOManager` (persist to localStorage in the adapter).

---

## PART B — REPLAYS

### B.1 What a Replay is (`Replay.ts`)

`Replay(cameraMovements, syncPoints, keyPresses, numFrames, version)`
(`Replay.ts:15-21`). Three parallel event streams + a frame count + a version
string. It carries mutable cursors `syncPointIndex/cameraMovementIndex/
keyPressIndex` (`:11-13`) advanced during playback.

The three streams are recorded LIVE during a normal (non-replay) simulation and
serialized into a Replay when the user saves.

### B.2 What is captured, and when

Recording only happens while `!ControllerGameGlobals.playingReplay`.

1. **cameraMovements** — `CameraMovement(frame, drawXOff, drawYOff, physScale)`.
   - Reset on play start (`ControllerGame.ts:2730-2733`): the first entry is
     `CameraMovement(0, +Infinity, +Infinity, m_physScale)` — the `+Infinity`
     x/y is a sentinel meaning "no pan, use current" (see `MoveCameraForReplay`
     `:778`).
   - Pushed whenever the user pans during the sim (`:1837-1842`), capturing the
     new `drawXOff/drawYOff` and current `m_physScale` at the current
     `frameCounter`.
2. **keyPresses** — `KeyPress(frame, key)` (`:1880`). Recorded in `keyInput()`
   (`:1868-1883`) on key-**up**, but ONLY for keys that are meaningful:
   a `TextPart.displayKey` or a `Cannon.fireKey` (`:1876-1877`). Motor/piston
   control keys are NOT recorded here — they are reconstructed from the sim state
   because parts poll input each frame. **Flag: only text-display and
   cannon-fire keys are in the replay stream.** Reset on play start (`:2734`).
3. **syncPoints** — `ReplaySyncPoint { frame, positions[], angles[],
   cannonballPositions[] }` (`ReplaySyncPoint.ts`). Captured every
   `REPLAY_SYNC_FRAMES` frames.

### B.3 Sync-point cadence + timestep (deterministic sim)

In the main update, while playing (not paused, not replaying)
(`ControllerGame.ts:576-582`):
```
if (frameCounter % REPLAY_SYNC_FRAMES == 0) AddSyncPoint();
m_world.Step(1/60, 5);
m_world.Step(1/60, m_iterations);   // m_iterations = 10
frameCounter++;
```
- `REPLAY_SYNC_FRAMES = 3` (`ControllerGameGlobals.ts:39`) — a sync point every
  3 frames.
- **Two Box2D steps per frame**, both `dt = 1/60`: first with 5 iterations, then
  with `m_iterations` (= 10). This double-step must be replicated EXACTLY for
  determinism.
- `AddSyncPoint()` (`:792-820`): for every non-static `ShapePart` body (dedup by
  body), record position + angle; plus every cannonball position. Only added if
  the last sync point isn't already at this frame (`:793`).
- `canSaveReplay` is disabled if `frameCounter >= 9000` or `cannonballs > 500`
  (`:585`) — replays are capped at 9000 frames (150 s).

### B.4 Playback: sim-free, sync-point-driven (NOT re-simulated)

Playback does **not** re-run physics. When `playingReplay`, the `!playingReplay`
branch at `:577-581` is skipped — the world is NOT stepped. Instead
`Replay.Update(frame)` drives everything (`Replay.ts:23-47`, called from
`ControllerGame.HandleKey` `:1182-1186`):

1. Apply all `cameraMovements` whose `.frame == frame` via `MoveCameraForReplay`
   (`Replay.ts:24-30`; `ControllerGame.ts:777-790`) — sets `draw.m_drawXOff/YOff`
   and `m_physScale` (skipping pan when x is `+Infinity`).
2. Sync bodies:
   - If `frame >= syncPoints[i].frame`: `SyncReplay(syncPoint)` — hard-set each
     body's `SetXForm(position, angle)` from the recorded sync point, and each
     cannonball position (`ControllerGame.ts:965-982`). Advance the cursor.
   - Else (between two sync points): `SyncReplay2(sp1, sp2)` — interpolate body
     positions/angles using **precomputed natural cubic splines**
     (`ControllerGame.ts:984-…`).
3. Replay `keyPresses` whose `.frame == frame` via `keyInput(key, true)`
   (`Replay.ts:42-45`) — this fires text displays / cannon shots at the right
   frame.
4. Returns `frame >= numFrames` → caller calls `pauseButton()` to end
   (`HandleKey` `:1183-1184`).

`frameCounter` still increments each frame (`:582`), so playback advances 1
logical frame per tick even though physics is frozen.

### B.5 The spline interpolation (`ComputeReplaySplines`, `:822-963`)

On play start when replaying (`:2741-2745`), three spline sets are precomputed
(x, y, angle → types 0/1/2): `replaySplineXs/Ys/Angles`. `ComputeReplaySplines`
builds **natural cubic splines** over the sync points via tridiagonal Gaussian
elimination + back-substitution, output shaped `[coeff 0..3][segment][bodyIndex]`
(`:958-962`). Angle deltas are **unwrapped** when `|deltaAngle| > 20`
(`:846-856, 929-939`) using `Util.NormalizeAngle` and a shortest-arc choice.
`SyncReplay2` evaluates these polynomials at `(frameCounter - syncPoint1.frame)`
to place bodies smoothly between sync points (`:984-…`). Faithful porting
requires replicating this cubic spline math exactly (including the >20 angle
guard) or replays will visibly drift.

### B.6 Serialization

- A `Replay` is finalized as `new Replay(cameraMovements, syncPoints,
  keyPresses, frameCounter, Database.VERSION_STRING_FOR_REPLAYS)`
  (`ControllerGame.ts:5354-5360`, `ControllerChallenge.ts:284-290`).
- `VERSION_STRING_FOR_REPLAYS` is a distinct constant from the app version
  (`Main.VERSION_STRING`); confirm its literal in `Database.ts` before writing
  (the version tag written into every exported replay — used to decode).
- Encoding uses the ByteArray/LZMA path (the live import/export feature; see
  `robotSerialization.ts` and `Database.Extract*`/`Save*`).
- `CameraMovement`/`KeyPress` are small tuple classes; `ReplaySyncPoint` holds
  parallel arrays. All plain-serializable.

### B.7 Proposed GameCore/state for replays

```ts
// Command
| { type: "playReplay"; data: Uint8Array }   // decode + begin playback
| { type: "viewReplayAgain" }
| { type: "stopReplay" }
| { type: "exportReplay" }                    // finalize current recording

// GameState additions
export interface ReplayState {
  recording: boolean;         // capturing the 3 streams this sim
  playing: boolean;           // playingReplay
  frame: number;              // == frameCounter
  numFrames: number | null;   // playback bound
  canSave: boolean;           // frame<9000 && cannonballs<=500
}
```
Recording model in the core:
- Keep three arrays on the sim slice: `cameraMovements`, `keyPresses`,
  `syncPoints`. Reset them on `play` (B.2). Push camera movements on
  `moveCamera` commands during sim; push key presses in the key handler for
  text-display/cannon-fire keys only; call `addSyncPoint()` every 3 frames.
- Playback: on `playReplay`, decode → `Replay`, precompute splines, then each
  sim tick run `Replay.Update(frame)` INSTEAD of stepping the world (drive body
  transforms via SetXForm / spline eval). This is the single most important
  determinism contract — see B.3/B.4.

---

## Top ambiguities / legacy couplings

1. **Tutorial progression is per-subclass hand-coded** (A.1) — there is no
   uniform step model to generalize. Porting is faithful transcription of each
   `CloseTutorialDialog` switch + the game-event triggers. Missing a branch =
   a stuck tutorial.
2. **`numAreas` hardcoded to 1** in `TutorialWindow` (A.2) makes the 2/3-area
   split dead code; confirm original intent before "fixing" or the message
   layout will change.
3. **Replay determinism is fragile** — it depends on the exact double
   `Step(1/60, 5)` + `Step(1/60, 10)` (B.3) AND on playback being sim-FREE with
   spline interpolation (B.4/B.5). Any change to Box2D version, iteration counts,
   or step order silently breaks every stored replay. Only text/cannon keys are
   captured (B.2); motor keys are NOT — do not "helpfully" record more or old
   replays desync.
4. **`+Infinity` camera sentinel** (B.2/B.4) — the first camera movement uses
   `+Infinity` for x/y to mean "keep current pan"; a naive numeric serializer
   may mangle this. Preserve the sentinel semantics.
5. **`LSOManager` global** backs level-done state (A.4); replace with the state's
   `levelsDone` + a persistence adapter, but keep the exact index mapping
   (tutorial idx = type-10, challenge idx = type+8).
