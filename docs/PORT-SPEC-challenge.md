# PORT SPEC — Challenge Mode

Faithful-port spec for challenge mode: the win/loss condition model, restriction
enforcement, scoring, build areas, and the play/edit flow. Written against the
**original** legacy source.

Primary sources:
- `src/Game/Challenge.ts` — the challenge data object (settings + restrictions +
  conditions + build areas).
- `src/Game/Condition.ts`, `WinCondition.ts`, `LossCondition.ts` — conditions.
- `src/Game/ControllerChallenge.ts` — play/edit flow, per-frame evaluation,
  restriction gates, scoring.
- `src/Gui/ConditionsWindow.ts`, `src/Gui/RestrictionsWindow.ts` — editors.
- `src/Game/Challenges/{ControllerMonkeyBars,ControllerClimb,ControllerRace,
  ControllerSpaceship}.ts` — the 4 built-in challenges.
- Base build-area/parts-fit code in `src/Game/ControllerGame.ts`.

> NOTE on existing work: there is already a WIP Vue port of the restrictions UI
> at `ui/components/panels/RestrictionsPanel.vue` (clamp-on-blur, default "15",
> "No Limit" checkboxes) — reconcile against it.

---

## 1. The `Challenge` data object (`Challenge.ts:1-44`)

Plain object, all fields:

| field | default | meaning |
|---|---|---|
| `settings` | ctor arg | a `SandboxSettings` (env; see sandbox spec) |
| `allParts` | `[]` | the challenge's own parts (terrain + author's editable robot) |
| `circlesAllowed`…`cannonsAllowed` | `true` | 8 part-type permission flags |
| `fixateAllowed` | **false** | may set shapes static |
| `nonCollidingAllowed` | true | may toggle collide-off |
| `mouseDragAllowed` | **false** | mouse-joint drag during play |
| `botControlAllowed` | true | may bind control keys |
| `showConditions` | false | draw condition regions to the player |
| `minDensity`/`maxDensity` | ∓MAX_VALUE | density clamp (∓MAX = "no limit") |
| `maxRJStrength`/`maxRJSpeed` | MAX_VALUE | rotating-joint limits |
| `maxSJStrength`/`maxSJSpeed` | MAX_VALUE | sliding-joint limits |
| `maxThrusterStrength` | MAX_VALUE | thruster limit |
| `cameraX`/`cameraY`/`zoomLevel` | MAX_VALUE | saved camera (MAX = unset) |
| `buildAreas` | `[]` | array of `b2AABB` build regions |
| `winConditions`/`lossConditions` | `[]` | arrays of `WinCondition`/`LossCondition` |
| `winConditionsAnded` | **true** | AND vs OR combine of win conditions |

`ControllerGameGlobals.challenge` is the live singleton; created if absent in
`ControllerChallenge` ctor (`ControllerChallenge.ts:16`).

---

## 2. The condition model (`Condition.ts`)

### 2.1 Fields (`Condition.ts:5-26`)
`{ name:String, subject:number, object:number, minX, maxX, minY, maxY,
shape1:ShapePart, shape1Index, shape2:ShapePart, shape2Index, isSatisfied:bool }`.
`WinCondition` adds nothing (`WinCondition.ts`). `LossCondition` adds
`immediate:boolean` (`LossCondition.ts:4-9`).

### 2.2 Subject enum (0-4) — `ConditionsWindow.ts:48`
0 "A specific shape" (`shape1`), 1 "Any shape", 2 "All user-created shapes",
3 "Any pre-existing shape", 4 "Any cannonball".

### 2.3 Object enum (0-6) — `ConditionsWindow.ts:49`
0 "within a box", 1 "above a line", 2 "below a line", 3 "left of a line",
4 "right of a line", 5 "touching another shape", 6 "touched another shape".

The `min/maxX/Y` fields define the box or the line:
- box (obj 0): the AABB `(minX,minY)-(maxX,maxY)`.
- "above a line" (obj 1): the line `y = minY` (satisfied when the shape's
  `maxShapeY < minY`).
- "below" (obj 2): `y = maxY`, `minShapeY > maxY`.
- "left" (obj 3): `x = minX`, `maxShapeX < minX`.
- "right" (obj 4): `x = maxX`, `minShapeX > maxX`.
- For a "line" the author sets min==max (e.g. Climb `minY=maxY=-10.5`, §5).

### 2.4 Per-frame evaluation (`Condition.Update(parts, cannonballs)`, `:28-252`)
Called each sim frame while running for every win + loss condition
(`ControllerChallenge.Update` `:23-30`). For each it computes the shape's world
AABB (circle center±radius, or polygon vertex extents via
`b2Math.b2MulX(body.GetXForm(), vertex)`), then sets `isSatisfied`:

- **subject 0 (specific shape1):** evaluate obj 0-4 against `shape1`'s AABB
  (`:33-67`). obj 5 → false here (handled in ContactAdded).
- **subject 1 (any shape):** iterate all non-static ShapeParts + all
  cannonballs; `isSatisfied = true` if ANY satisfies obj 0-4 (`:68-132`).
- **subject 2 (all user-created):** filter editable + non-static; `isSatisfied`
  starts **true** and is set false if ANY fails — i.e. ALL must satisfy
  (`:133-181`). Empty set → false (`:135-138`). (Inequalities inverted vs the
  "any" case.)
- **subject 3 (any pre-existing):** non-editable non-static; ANY satisfies →
  true (`:182-226`).
- **subject 4 (any cannonball):** iterate cannonballs; ANY → true (`:227-251`).

### 2.5 Contact conditions (obj 5 "touching" / 6 "touched") — `ContactAdded`
`Condition.ContactAdded(point, parts, cannonballs)` (`:254-284`), driven by the
Box2D contact listener via `ControllerChallenge.ContactAdded`
(`ControllerChallenge.ts:207-214`). Sets `isSatisfied=true` when the relevant
shapes touch:
- subject 0: `shape1` touches `shape2` (either order) (`:256-257`).
- subject 1/4: any shape / any cannonball touches `shape2` (`:258-259, 274-281`).
- subject 2/3: any editable / non-editable shape touches `shape2` (`:260-273`).

**Difference between obj 5 and 6:** both are handled identically in
`ContactAdded` (`:255`), but obj 5 ("touching") is also reset each frame in
`Update` to false (`:65-66, 130-131, 179-181, 224-225`) so it only stays true
*while* contact persists; obj 6 ("touched") is never reset in `Update`, so once
set it stays satisfied (a latching "has touched" event). **This
reset-vs-latch distinction is the whole semantic difference — replicate it.**

### 2.6 Win/loss resolution (`ControllerChallenge.ts:216-248`)
- `ChallengeOver() = WonChallenge() || LostChallenge()` (`:216-218`).
- `WonChallenge()` (`:220-236`): false if no win conditions; false if ANY loss
  condition satisfied; then if `winConditionsAnded` require ALL win conditions
  satisfied, else require ANY. (Loss overrides win.)
- `LostChallenge()` (`:238-248`): true iff any loss condition is satisfied AND
  its `immediate` flag is set. (Non-immediate losses only block a win, they
  don't end the run early.)
- The base game loop calls `ChallengeOver()` each frame; on true it pauses, sets
  `wonChallenge`, and — if actually won — shows the score window + sets
  level-done, else shows "failed" (`ControllerGame.ts:738-772`).

Conditions are reset (`isSatisfied=false`) on each play start
(`ControllerChallenge.ts:52-59`).

---

## 3. Restrictions — storage + enforcement

### 3.1 Editor round-trip (`RestrictionsWindow.ts`)
On open, checkboxes are seeded from `challenge.*` (`:137-274`). Note the
**inversion**: the boxes are "disallow" toggles — `circleBox.selected =
!circlesAllowed` (`:137`). Numeric limits show "15" as placeholder when the field
is at its ∓MAX_VALUE "no limit" sentinel (`:283-331`). On "Okay!"
(`okButtonPressed` `:347-411`) every flag is written back (`allowed = !box.selected`
`:348-355`; `mouseDragAllowed/botControlAllowed/fixateAllowed/nonCollidingAllowed/
showConditions = box.selected` `:356-360`; numeric limits parsed to fields
`:406-411`). Window is `GuiWindow(105,100,600,434)` (`:50`), Okay button
`(385,365,100,50)` (`:343`).

### 3.2 Where enforcement happens (during PLAY / build)
- **Part-type permissions:** `ControllerChallenge` overrides each toolbar button
  (`circleButton`…`cannonButton`, `:92-178`) — when `playChallengeMode` and the
  type is not allowed, it shows "X are not allowed in this challenge!" and
  refuses; else defers to `super`.
- **Density / joint / thruster limits:** clamped at edit time in the text/slider
  handlers — density `ControllerGame.ts:4086-4108`, RJ strength/speed
  `4112-4171`, thruster `4173-4190`; sliders bound in `PartEditWindow.ts`
  (density 1050-1051, RJ 1196/1201, SJ 1259/1264, thruster 1370) and
  `GuiSlider.ts:105-107`. Cannon density slider hardcoded 1..30.
- **mouseDragAllowed:** enforced at `ControllerGame.ts:1776-1795` — no
  `b2MouseJoint` is created during play when disallowed.
- **botControlAllowed:** enforced at edit time by HIDING the key-binding inputs
  (`PartEditWindow.ts:1338-1353, 1376-1383`); parts still poll keys, but keys
  were never bindable.
- **fixateAllowed / nonCollidingAllowed:** enforced by hiding the
  fixate/collision checkboxes (`PartEditWindow.ts:1053-1062, 1090-1099,
  1155-1159`) AND by paste/import validation (`ControllerGame.ts:5030-5065,
  5747-5765` → "Sorry, some of the copied parts are not allowed in this
  challenge!").
- Part flags themselves: `Part.ts:8-14` (`isEnabled, isStatic, isEditable,
  drawAnyway`). `ShapePart.WillBeStatic` (`ShapePart.ts:149-159`) makes
  `isStatic` transitive through fixed joints.

---

## 4. Build areas (`b2AABB` regions parts must fit inside)

- Stored as `challenge.buildAreas: b2AABB[]` (`Challenge.ts:34`). Accessors:
  `GetBuildingArea()/GetBuildingAreaNumber(i)/NumBuildingAreas()`
  (`ControllerChallenge.ts:180-190`).
- `CheckIfPartsFit()` (`ControllerGame.ts:1116-1177`): for each EDITABLE part,
  compute its AABB (circle center±r, or vertex extents for rect/tri/cannon,
  `:1135-1161`) and require it to fit **entirely inside at least one** build area
  (`minX>=lower.x && minY>=lower.y && maxX<upper.x && maxY<upper.y`,
  `:1162-1170`). If any part fits no area, `partsFit=false`. Early-returns:
  sandbox always fits (`:1122`); challenge only checks when `playChallengeMode`
  (`:1123`); zero areas ⇒ always fit (`:1124`).
- `partsFit` gates `playButton` (`ControllerGame.ts:2718-2721`) — can't play a
  robot that overflows the build zone. Build areas are drawn/repositioned in the
  edit-frame update (`ControllerGame.ts:592-621`); good areas green, bad red when
  `!partsFit` (`:615-616`).

---

## 5. The 4 built-in challenges (exact setup)

All four set `playChallengeMode=true` and `playOnlyMode=true` in their ctor
(uneditable). Two build terrain in-code; two load a packed challenge blob.

### ControllerClimb (`ControllerClimb.ts:18-…`)
- Win conditions (anded): `WinCondition("Cond", 2, 1)` with `minY=maxY=-10.5`
  (all user shapes above y=-10.5) AND `WinCondition("Cond", 2, 4)` with
  `minX=maxX=45` (all right of x=45) (`:23-30`).
- Restrictions: `cannonsAllowed=false, thrustersAllowed=false,
  mouseDragAllowed=false`, `winConditionsAnded=true` (`:31-34`).
- Build area: `b2AABB (1,1)-(15,11.1)` (`:35-38`).
- Camera: `m_drawXOff=0, m_drawYOff=-150` (`:41-42`).
- Terrain: static `Rectangle`s/`Circle`s pushed to `allParts` (`:45-157`) plus a
  large decorative `sGround` (`:51-…`).

### ControllerMonkeyBars (`ControllerMonkeyBars.ts:25-…`)
- Same two win conditions `(2,1)` and `(2,4)`, anded (`:28-39`);
  `thrustersAllowed=false`. Build area pushed (`:43`). Distinct terrain
  rectangles (`:47-56+`).

### ControllerRace (`ControllerRace.ts`) & ControllerSpaceship
- Do NOT build terrain in code. They **load a pre-authored challenge** from a
  compressed `ByteArray`: `cRace.uncompress();
  Database.ExtractChallengeFromByteArray(cRace)` → assign
  `challenge`, `loadedParts = challenge.allParts`, `settings = challenge.settings`
  (`ControllerRace.ts:18-24`). Camera zoom is taken from `challenge.zoomLevel`
  (`:28-29`). Spaceship is analogous with `cSpaceship`.
- All submit/save/link/embed buttons are disabled (`ShowDisabledDialog`,
  `:49-85`). An intro tutorial dialog is shown on `Init` (`:32-35`).

---

## 6. Play vs Edit flow (`ControllerChallenge`)

### Enter play mode (`playButton`, `:39-62`)
First `playButton` when `!playChallengeMode`: snapshot `challenge.allParts =
allParts.filter(PartIsEditable)`, set `playChallengeMode=true`, mark those parts
`isEditable=false`, hide side panel, `CheckIfPartsFit`, clear selection + undo
stack (`:40-50`). Subsequent presses (already in play mode): reset all win/loss
`isSatisfied=false` if sim not started, then `super.playButton()` (base sim
start) (`:51-61`).

### Edit mode (`editButton`, `:64-90`)
If `playOnlyMode` → "This challenge is uneditable!" (`:79-82`). Otherwise confirm
"…your current robot will be lost", and on confirm: `playChallengeMode=false`,
rebuild via `RefreshSandboxSettings()`, restore `challenge.allParts` into
`allParts` marking them editable again (`:64-76`).

### Editing conditions (`ConditionsWindow`)
- Subject/object comboboxes + name field + region-pick flow. When object needs a
  shape (subject 0 / obj 5-6), the window enters a pick state
  (`addingWinCondition/selectingForShape1/shape1`, `ConditionsWindow.ts:44-46`);
  the base `selectingCondition` flag (`ControllerGame.ts:1092-1116`) suppresses
  normal editing while the author clicks a shape/region on the canvas.
- Add/remove push/splice into `challenge.winConditions`/`lossConditions`;
  `allConditionsBox` sets `winConditionsAnded`; `immediateLossBox` sets the loss
  condition's `immediate`.

---

## 7. Scoring
- `ControllerChallenge.GetScore()` = `10000 - frameCounter` (`:250-252`) — lower
  time = higher score (frame count at win). Sandbox returns a flat `10000`
  (`ControllerSandbox.ts:905-907`).
- Score is shown in the `ScoreWindow` on win (`ControllerGame.ts:749`); submit is
  the dead cloud path.

---

## 8. Proposed GameCore commands + read-models + state

### Commands (challenge editing — extends COMMANDS-TODO)
```ts
// conditions
| { type: "addWinCondition"; subject: number; object: number; name?: string;
    region: { minX,maxX,minY,maxY } | null; shape1Id?: number; shape2Id?: number }
| { type: "addLossCondition"; subject: number; object: number; immediate: boolean;
    name?: string; region?: {...} | null; shape1Id?: number; shape2Id?: number }
| { type: "removeWinCondition"; index: number }
| { type: "removeLossCondition"; index: number }
| { type: "setWinConditionsAnded"; value: boolean }
// pick flow for shape/region-based conditions
| { type: "beginPickShapeForCondition"; slot: "shape1" | "shape2" }
| { type: "beginPickRegionForCondition" }   // + line variants
// restrictions
| { type: "setAllowedParts"; circles,rects,tris,fixed,revolute,prismatic,thrusters,cannons: boolean }
| { type: "setBuildPermissions"; mouseDrag,botControl,fixate,nonColliding,showConditions: boolean }
| { type: "setPartLimits"; minDensity,maxDensity,maxRJStrength,maxRJSpeed,
    maxSJStrength,maxSJSpeed,maxThrusterStrength: number | null }  // null == no-limit sentinel
// build areas
| { type: "addBuildArea"; minX,minY,maxX,maxY: number }
| { type: "removeBuildArea"; index: number }
// play/edit transitions
| { type: "enterChallengePlay" }   // playButton first-press semantics
| { type: "editChallenge" }        // editButton (guarded by playOnly)
```
`null` in `setPartLimits` maps to ∓`Number.MAX_VALUE` (the "no limit" sentinel).

### Read-models (add to `GameState`)
```ts
export interface ChallengeState {
  active: boolean;
  playMode: boolean;      // playChallengeMode
  playOnly: boolean;      // playOnlyMode (uneditable)
  winConditions: ConditionSnapshot[];
  lossConditions: ConditionSnapshot[];
  winConditionsAnded: boolean;
  restrictions: {         // mirror of Challenge flags/limits
    circles,rects,tris,fixed,revolute,prismatic,thrusters,cannons: boolean;
    mouseDrag,botControl,fixate,nonColliding,showConditions: boolean;
    minDensity,maxDensity,maxRJStrength,maxRJSpeed,maxSJStrength,maxSJSpeed,maxThrusterStrength: number | null;
  };
  buildAreas: { minX,minY,maxX,maxY: number }[];
  partsFit: boolean;      // CheckIfPartsFit result — gates play + drives red/green
  outcome: "playing" | "won" | "failed" | null;
  score: number | null;   // 10000 - frame at win
}
export type ConditionSnapshot = {
  name: string; subject: number; object: number;
  minX,maxX,minY,maxY: number; shape1Id: number | null; shape2Id: number | null;
  immediate?: boolean; isSatisfied: boolean;   // live during play
};
```
- The core evaluates conditions each sim frame (§2.4) and updates `isSatisfied`
  + `outcome`; the renderer draws build areas + (if `showConditions`) regions;
  the UI reads `restrictions`/conditions for the editor panels.
- Enforcement (§3) becomes rejections inside the create-part / set-property
  command handlers (return an error/no-op with a reason string), plus
  `CheckIfPartsFit` recomputed on every part move/create.

---

## 9. Top ambiguities / legacy couplings

1. **obj 5 vs 6 (touching vs touched)** — the ONLY difference is that "touching"
   is reset to false each frame in `Update` while "touched" latches once set
   (§2.5). Easy to miss; both share `ContactAdded`. Get this wrong and
   momentary-contact win conditions never fire (or never clear).
2. **Condition `subject 2` (all user shapes) uses inverted logic** — starts
   `true`, one failing shape flips it false, empty set = false (`:133-181`).
   Distinct from the "any" cases. Replicate the start-value + inversion exactly.
3. **∓`Number.MAX_VALUE` sentinels everywhere** — "no limit" for density/joint
   caps, and `MAX_VALUE` for unset `cameraX/Y/zoomLevel` (`Challenge.ts:22-32`).
   A plain-number serializer must round-trip these exactly; propose `null` in the
   read-model but keep the sentinel on the domain object for parity.
4. **Restriction checkbox inversion** — the editor stores "disallow" but the
   `Challenge` stores "allowed" (`RestrictionsWindow.ts:137` vs `:348`). Don't
   double-invert when porting the panel.
5. **`ControllerGameGlobals.challenge` + `playChallengeMode`/`playOnlyMode` are
   globals** threaded through every button override and the sim loop. These must
   move into `GameState.challenge`; the per-button "not allowed" gates
   (`ControllerChallenge.ts:92-178`) become handler rejections.
6. **Race/Spaceship load from a packed blob** via
   `Database.ExtractChallengeFromByteArray` (§5); the exact AMF/ByteArray field
   order is the serialization contract (a companion serialization spec covers
   the byte layout). The two hardcoded challenges (Climb/MonkeyBars) instead bake
   geometry — two different provenance paths for `challenge.allParts`.
7. **Scoring is time-based** (`10000 - frameCounter`) and submit is dead cloud
   code — keep local score display, drop the network submit.
