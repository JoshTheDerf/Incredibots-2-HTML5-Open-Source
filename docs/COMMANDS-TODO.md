# GameCore commands — wiring punch-list

Every `<IbTodo/>` "⚠ not wired" flag in the ported Vue panels maps to a
`GameCore` command (and often a read-model) that doesn't exist yet. This is the
roadmap for the command-migration phase — logic migrates out of the 7k-line
`ControllerGame` into `GameCore` handlers, one command at a time.

## Already implemented (contract works today)
`setTool`, `select`, `clearSelection`, `setColour`, `deleteParts`.
(Declared in `Command.ts` but still THROW pending physics: `play`, `pause`,
`reset`, `step`, `createShape`, `createText`, `moveParts`, `rotateParts`,
`resizeParts`, `undo`, `redo`, `loadRobot`, `newRobot`.)

## Biggest architectural gap: a selected-part read-model
The store exposes `edit.selection` as **numeric ids only**. Every property panel
(Shape/Joint/Thruster/Cannon/Text) needs to READ the selected part's type and
current values to display them. Add a `selectedPart` snapshot to `GameState`
(a plain-data projection of the selected Part) so `PartInspectorFull` can pick
the right sub-panel and bind real values. This unblocks most of the list below.

## Part editing (from PartEditWindow port)
- Shape: `setDensity`, `setCollide`, `setCameraFocus`, `setFixate`, `setOutline`,
  `setOutlineBehind`/`setTerrain`, `setUndragable`
- Joint: `setJointMotor`, `setJointStrength`, `setJointSpeed`, `setJointLimits`,
  `setJointControlKey`, `setJointAutoOn`, `setJointStiff` (floppy),
  `setJointInitialLength`
- Thruster: `setThrusterStrength`, `setThrusterKey`, `setThrusterAutoOn`
- Cannon: `setCannonStrength`, `setCannonFireKey`
- Text: `setTextContent`, `setTextSize`, `setTextDisplayKey`,
  `setTextAlwaysVisible`, `setTextScaleWithZoom`

## Sandbox (AdvancedSandboxWindow)
- `setSandboxSettings` (gravity, size, terrainShape, terrainTheme, background,
  bg r/g/b) — or finer-grained `setGravity` / `setTerrain` / `setBackground`.

## Challenge editing (Conditions / Restrictions)
- Conditions: `addWinCondition`, `addLossCondition`, `removeWinCondition`,
  `removeLossCondition`, `setWinConditionsAnded`, and a stage-pick flow
  (`beginPickShapeForCondition` / `beginPickRegionForCondition` /
  line variants) + read-model for `challenge.win/lossConditions`.
- Restrictions: `setAllowedParts`, `setBuildPermissions`, `setPartLimits`
  + read-model for the `challenge.*` restriction fields.

## Tutorials
- `loadTutorial(levelIndex)`, `nextTutorialStep`, `prevTutorialStep`,
  `closeTutorial`, `closeTutorialSelect`, + level-completion read-model
  (was `LSOManager.IsLevelDone`).

## Import / Export / Replay / Score
- `importRobot|Replay|Challenge` (decode a pasted string; reuses ByteArray/
  Database serialization — the LIVE import/export feature).
- `exportRobot|Replay|Challenge` (produce the encoded string).
- Replay session: `viewReplayAgain`, `stopReplay`, `rateReplay`,
  + `curReplayId` in state.
- Score: submit/replay/next-level progression + a score read-model.
- Colour "Make Default" persistence (setColour itself is already wired).

## Sequencing note
Do the selected-part read-model + sim controls (play/pause/reset) first — they
unblock the inspector and the toolbar. Then part-property setters (mostly reuse
existing `src/Actions/*`). Challenge/tutorial/import flows last.
