# PORT SPEC — Sandbox Environment

Faithful-port spec for the sandbox environment (terrain, sky/background, and the
`SandboxSettings` model). Written against the **original** legacy source so the
GameCore/Vue port replicates behavior exactly. All line refs are to the files as
they exist on `modernization` at time of writing.

Primary sources:
- `src/Game/SandboxSettings.ts` — the settings value object.
- `src/Game/ControllerSandbox.ts` — terrain build + world bounds + gravity.
- `src/Game/Graphics/Sky.ts` — background gradient + clouds/stars.
- `src/Gui/AdvancedSandboxWindow.ts` — the settings dialog + Apply flow.
- `src/Game/createController.ts:33-77` — default settings + controller wiring.

---

## 1. `SandboxSettings` (the environment config)

`src/Game/SandboxSettings.ts:1-54`. Plain value object, 8 fields:

| field | type | meaning |
|---|---|---|
| `gravity` | number | downward gravity magnitude (m/s²-ish); used as `b2Vec2(0, gravity)` |
| `size` | number | world size enum: `SIZE_SMALL=0`, `SIZE_MEDIUM=1`, `SIZE_LARGE=2` |
| `terrainType` | number | `TERRAIN_LAND=0`, `TERRAIN_BOX=1`, `TERRAIN_EMPTY=2` |
| `terrainTheme` | number | `GRASS=0, DIRT=1, SAND=2, ROCK=3, SNOW=4, MOON=5, MARS=6` |
| `background` | number | `SKY=0, SPACE=1, NIGHT=2, DUSK=3, MARS=4, SUNSET=5, SOLID_COLOUR=6` |
| `backgroundR/G/B` | number | 0-255, only used when `background == SOLID_COLOUR (6)`; default 0 |

Constants at `SandboxSettings.ts:11-33`. Constructor signature
`(grav, s, type, theme, bg, r=0, g=0, b=0)` (`:35-44`).

> NOTE: the field is `terrainType`, **not** `terrainShape` (the COMMANDS-TODO
> doc calls it `terrainShape`; the source field is `terrainType`). Keep the
> source name in the read-model to avoid drift, or alias explicitly.

**Default settings.** There is no default baked into the class — callers
construct it. The canonical sandbox default is
`new SandboxSettings(15.0, 0, 0, 0, 0)` (`createController.ts:37`): gravity 15,
size SMALL, LAND, GRASS, SKY. Note **most other entry points use size MEDIUM
(1)**: main menu (`ControllerMainMenu.ts:1316`), robot deserialization default
(`robotSerialization.ts:255,291`), tutorials (`TutorialSelectWindow.ts:110`).
Replicate per-entry-point; do not assume one global default.

There is a naming collision in the constants: `TERRAIN_GRASS..MARS` (theme, 0-6)
and `TERRAIN_LAND/BOX/EMPTY` (type, 0-2) both use the `TERRAIN_` prefix. They are
distinct axes — `terrainType` selects geometry, `terrainTheme` selects colors.

---

## 2. Terrain / ground — the STATIC physics bodies

Built in `ControllerSandbox.BuildGround()` (`ControllerSandbox.ts:37-568`). Two
distinct things happen here that the port must SEPARATE:

1. **Static Box2D collision bodies** — `Circle`/`Rectangle` parts pushed to
   `allParts` AND to `groundParts`. **The CORE must build these on init/reset.**
2. **Purely-visual terrain fill** — `this.sGround` (a Pixi `Graphics`), rocks,
   outline circles, gradients. **Renderer-only; core does not need these.**

Every ground part is flagged: `isStatic=true`, `isEditable=false`,
`drawAnyway=false`, `isSandbox=true` (`:48-52` etc). `isSandbox=true` is the
marker distinguishing sandbox terrain from robot parts.

### 2.1 `TERRAIN_LAND (0)` collision bodies (`:46-113`)

A flat ground: one `Rectangle` (top surface) + two end-cap `Circle`s. Exact
values per size:

| size | Rectangle(x,y,w,h) | Circle L (x,y,r) | Circle R (x,y,r) |
|---|---|---|---|
| LARGE (2) | `(-247.7, 12, 495.4, 12.5)` | `(-247.4, 18.25, 6.25)` | `(247.4, 18.25, 6.25)` |
| MEDIUM (1) | `(-119.5, 12, 239, 9)` | `(-119, 16.5, 4.5)` | `(119, 16.5, 4.5)` |
| SMALL (0) | `(-39.7, 12, 79.4, 6)` | `(-39.4, 15, 3)` | `(39.4, 15, 3)` |

The `Rectangle` ctor is `new Rectangle(nx, ny, nw, nh, checkLimits=false)`
(`Rectangle.ts:20`); **(nx,ny) is the TOP-LEFT corner**, center is computed as
`(nx+nw/2, ny+nh/2)` (`Rectangle.ts:43-44`). `Circle` is
`new Circle(cx, cy, r, checkLimits?)` — **(cx,cy) is the CENTER** (`Circle.ts:14`).
LARGE circles pass `checkLimits=false` (their r=6.25 exceeds the [0.1,5] clamp);
MEDIUM/SMALL omit it. All box/land rectangles pass `checkLimits=false`.

**Static-body fixture definition** (identical across all ground bodies —
`Rectangle.ts:112-173`, `Circle.ts:50-102`):
- friction **0.4**, restitution **0.3**.
- density `(this.density + 5)/10` (default density 15 ⇒ 2.0), but statics get
  `SetMass(new b2MassData())` so mass is zeroed — density is irrelevant here.
- Body: `b2BodyDef` at `(centerX, centerY)`, not a bullet; Rectangle→`b2PolygonDef`
  (4 verts), Circle→`b2CircleDef`.
- **Collision:** default `b2FilterData` is `category=0x0001, mask=0xFFFF,
  group=0`. `groupIndex` is set only when `m_collisionGroup != Number.MIN_VALUE`
  (`Rectangle.ts:127`, `Circle.ts:65`) but the default `m_collisionGroup` is
  `Number.MIN_SAFE_INTEGER` (`ShapePart.ts:16`) — a mismatch, so the branch fires
  and ground gets `groupIndex = MIN_SAFE_INTEGER`. Harmless because
  `ContactFilter.ShouldCollide` short-circuits to `true` when either fixture's
  userData `.isSandbox` is set (`ContactFilter.ts:9`), and ground fixtures set
  `userData.isSandbox = true` (`Rectangle.ts:170`, `Circle.ts:99`). **Replicate
  the isSandbox override — it is what makes terrain collide with everything.**

**World creation** (base class, `ControllerGame.ts:6624-6640`): the b2World AABB
is FIXED regardless of size — lower `(-300,-200)`, upper `(300,200)` — and
`new b2World(worldAABB, GetGravity(), true)`. A `ContactFilter` + `ContactListener`
are attached (`:6632-6635`). Ground bodies are `.Init(world)`-ed via the normal
part-init loop when the sim starts, NOT inside `BuildGround`.

### 2.2 `TERRAIN_BOX (1)` collision bodies (`:114-203`)

A closed box (floor + ceiling + two walls) — 4 `Rectangle`s:

| size | floor-top rect | left wall | right wall | bottom rect |
|---|---|---|---|---|
| LARGE (2) | `(-300,-180,600,40)` | `(-300,-180,40,230)` | `(260,-180,40,230)` | `(-300,10,600,40)` |
| MEDIUM (1) | `(-170,-120,340,40)` | `(-170,-120,40,170)` | `(130,-120,40,170)` | `(-170,10,340,40)` |
| SMALL (0) | `(-60,-45,120,20)` | `(-60,-40,20,80)` | `(40,-40,20,80)` | `(-60,10,120,20)` |

### 2.3 `TERRAIN_EMPTY (2)`

No branch in `BuildGround` for `TERRAIN_EMPTY` — **no ground bodies are created**
(the `if` at `:46`/`:114` only handles LAND and BOX). Empty = void with just a
sky. Core builds zero static bodies.

### 2.4 World bounds (camera clamp) — CORE needs these

`GetMinX/MaxX/MinY/MaxY` (`:680-714`) drive camera clamping and cloud spawn
extent. They depend on `size` and (for MaxY) `terrainType`:

| | LARGE | MEDIUM | SMALL |
|---|---|---|---|
| MinX | -280 | -150 | -50 |
| MaxX | 280 | 150 | 50 |
| MinY | -160 | -100 | -30 |
| MaxY (LAND/EMPTY) | 160 | 100 | 40 |
| MaxY (BOX) | 30 | 30 | 15 |

(`GetMaxY`: BOX ⇒ SMALL=15 else 30; otherwise LARGE=160/MEDIUM=100/SMALL=40.)

### 2.5 Gravity — CORE needs this

`ControllerSandbox.GetGravity()` (`:716-718`): `new b2Vec2(0.0, settings.gravity)`.
This is the world gravity vector the core sets when creating the b2World.
`AdvancedSandboxWindow` clamps gravity to `[0, 30]`, NaN→15 (`:317-324`).

### 2.6 Visual-only terrain (renderer, NOT core)

`sGround` fills: `DrawGroundOutlineCircle` (`:720-731`), `DrawGroundCircle`
(`:733-744`), `DrawRock` (`:746-771`), `DrawRocksForBox` (`:773-815`). The rock
layouts for LAND are a long hardcoded list of `DrawRock(type, x, y, r)` calls
(`:228-360`) differing per size; BOX uses randomized `DrawRocksForBox` with a
rejection sampler (numRocks = 60/200/500 keyed on width 1000/2000/4000,
`:780`; min spacing 32, `:799`). The terrain color arrays are 7-entry (one per
theme) at `ControllerSandbox.ts:15-25` (`terrainTopColours`,
`terrainBottomColours`, `terrainTopOutlines`, `terrainBottomOutlines`,
`rock1/2/3TopColours`, `rock1/2/3BottomColours`, `rockOutlines`). These are
**purely cosmetic**; port them into the renderer, not the core. Grass theme (0)
top/bottom = `#65CD4E`/`#5AC043`.

`Update()` (`:817-888`) repositions/rescales `sGround` on zoom/pan — again
renderer-only. Note the guard at `:880-887`: `hasPanned/hasZoomed` are cleared
here EXCEPT for the 4 challenge subclasses (they clear it themselves).

---

## 3. Sky / background (`src/Game/Graphics/Sky.ts`)

Constructed in `BuildGround` (`ControllerSandbox.ts:38-44`) with
`new Sky(this, settings.background, settings.backgroundR, G, B)`. This is
**renderer-owned** — the core does not simulate the sky. But the port's renderer
must replicate it faithfully. Key facts:

### 3.1 Gradient (`Sky.ts:10-25, 44-54`)

`topColours`/`bottomColours` are 6-entry arrays indexed by `type` (= background,
0-5). A linear vertical gradient from top→bottom color fills an 800×600 sprite.

- topColours: `#43B0F7, #171717, #292935, #22243C, #BE4A3C, #4790EC`
- bottomColours: `#8ACEF7, #353738, #48475F, #40457E, #EB7A76, #EC8D66`

For `type == BACKGROUND_SOLID_COLOUR (6)` the gradient is `[rgb, rgb]` from
`Util.HexColourString(r,g,b)` (a flat fill) (`:46-49`).

### 3.2 Clouds — background type 0 (SKY) only (`:60-82`)

- `numClouds = min((MaxX-MinX)/10, 15)` (`:61`).
- Each cloud picks one of 10 textures (`cCloud0..9`) via `floor(random*10)`
  (`:64-74`).
- Spawn position: `x ∈ RangedRandom(MinX-5, MaxX+5)`, `y ∈ RangedRandom(-15, 6)`
  (`:78-80`).
- Velocity: `(3*random)/120 + 1/120` per frame, leftward (`:81`).
- Respawn: when `x < MinX-5`, wrap to `MaxX+5` (`:128`). Only moves when
  `!IsPaused()` (`:126-129`).
- Cloud sprite size scales with `PhysScale/90` (`:115-116`).

### 3.3 Stars — background type 1 (SPACE) only (`:83-107`)

- `worldSize = MaxX - MinX + 10` (×1.5 on main menu) (`:84-85`).
- `numClouds = (MaxX-MinX) * 10` — reused var name; here it's the star count
  (`:86`).
- Stars are drawn as tiny filled circles into a single `Graphics` (`:87-104`),
  color `0xaec9da`, at random positions in `[0, worldSize*90]²`, radii
  `RangedRandom(2,6)` (or 3-8 on main menu) (`:98-102`). Velocity 0 (static).

### 3.4 Background types 2-5

No cloud/star spawning — only the gradient (the `if type==0 … else if type==1`
covers only 0 and 1; `:60-107`). So NIGHT/DUSK/MARS/SUNSET are gradient-only.

### 3.5 `terrainTheme` vs `background`

Independent axes: `terrainTheme` colors the GROUND fill/rocks
(`ControllerSandbox.ts:15-25`), `background` selects the SKY gradient +
cloud/star behavior (`Sky.ts`). They can be mixed freely.

---

## 4. The Apply flow (`AdvancedSandboxWindow.okButtonPressed`, `:264-282`)

On OK/Apply:
1. Build a fresh `SandboxSettings` from the widgets: `gravitySlider.value`,
   `sizeBox.selectedIndex`, `shapeBox.selectedIndex` (→ terrainType),
   `themeBox.selectedIndex`, `bgBox.selectedIndex`, and
   `parseInt(redArea/greenArea/blueArea.text)` (`:265-274`).
2. Assign `ControllerGameGlobals.settings = settings` (`:275`).
3. If invoked from the main menu: set `Main.changeControllers = true` (full
   controller rebuild) (`:276`).
4. Otherwise: if challenge, also set `challenge.settings = settings` (`:278`);
   then call `(cont).RefreshSandboxSettings()` and hide the fader (`:279-280`).

### `RefreshSandboxSettings()` (`ControllerSandbox.ts:570-678`) — the rebuild

This is the heavy path. In order:
1. Remove all `groundParts` from `allParts` (`:571-573`), reset `groundParts=[]`.
2. `sSky.Delete()` (`:579`) and tear down the Pixi display list (canvas, all the
   help-text sprites, panels, every open dialog window — `:580-656`).
3. Reset `m_buildAreas`/`m_badBuildAreas`/`m_selectedBuildAreas` to `[]`
   (`:657-659`).
4. `BuildGround()` (`:660`) — rebuilds sky + terrain bodies from the NEW settings.
5. Re-add canvas/text/panels (`:661-672`), `BuildBuildArea()` (`:675`),
   `redrawRobot = true`, `hasZoomed = true` (`:676-677`).

**Crucial:** Apply does **not** reset or destroy the b2World, and does **not**
touch the user's robot parts — only the sandbox terrain/sky are rebuilt. The
robot parts (`isSandbox` false) stay in `allParts`. Gravity change takes effect
only on the next `playButton()` (since gravity is read at world-creation time via
`GetGravity()`), NOT retroactively mid-sim. Apply is an edit-time operation.

### 4.1 AdvancedSandboxWindow widgets (window `GuiWindow(276,90,248,430)`, `:31`)

- `gravitySlider` / `gravityArea`: range `[0, 30]`, NaN→15 (`:317-324`); slider
  and text box mirror each other (`:322-323, 326-328`).
- `sizeBox`: dropdown, index = size (0/1/2).
- `shapeBox`: dropdown, index = terrainType (0/1/2).
- `themeBox`: dropdown, index = terrainTheme (0-6).
- `bgBox`: dropdown, index = background (0-6). When index==6 (SOLID_COLOUR) the
  R/G/B text fields become enabled+editable, otherwise disabled (`:284-291`).
- `redArea/greenArea/blueArea`: int text, maxLength 3, clamped `[0,255]`, NaN→0
  (`:293-315`); UI defaults "125"/"125"/"255" (`:195,203,211`). Only enabled when
  `bgBox.selectedIndex == 6`.

Widget positions (for a faithful Vue layout): SizeBox `(110,70,130,32)`,
ShapeBox `(110,105,130,32)`, ThemeBox `(110,140,130,32)`, BgBox `(110,175,130,32)`,
Red `(170,210,30,20)`, Green `(170,230,30,20)`, Blue `(170,250,30,20)`, Gravity
slider `x=78,y=302`, Gravity text `(114,320,30,20)`, Okay button `(49,340,150,50)`,
Cancel `(74,385,100,35)`. Combobox item order matches the enum values exactly.

---

## 5. What the CORE must build vs what the RENDERER already handles

| concern | owner | notes |
|---|---|---|
| Static terrain bodies (LAND/BOX) | **CORE** | `Circle`/`Rectangle` static parts, `isSandbox`, from §2.1/2.2 |
| Gravity vector | **CORE** | `b2Vec2(0, gravity)` at world creation (§2.5) |
| World bounds (camera clamp) | **CORE** (data) / renderer (use) | §2.4 |
| Sky gradient | RENDERER | `Sky.ts` §3.1 |
| Clouds / stars | RENDERER | §3.2/3.3 (animation state can be renderer-local) |
| Ground fill / rocks / outlines | RENDERER | §2.6 |

---

## 6. Proposed GameCore command + GameState additions

### Command
```ts
| { type: "setSandboxSettings"; gravity: number; size: number;
    terrainType: number; terrainTheme: number; background: number;
    backgroundR: number; backgroundG: number; backgroundB: number }
```
Handler behavior (mirrors Apply + RefreshSandboxSettings):
- Store the new settings on `GameState.sandbox` (below).
- While `phase === "editing"`: remove all `isSandbox` terrain parts from
  `state.parts`, rebuild them from §2.1/2.2 for the new `terrainType`/`size`,
  recompute world bounds. Do NOT touch robot parts. Do NOT reset the sim.
- Gravity is applied at `play`/world-creation time (read `sandbox.gravity`), not
  retroactively — matching the legacy (§4).
- If the port wants finer granularity, also expose `setGravity`,
  `setTerrain{Type,Theme}`, `setBackground` as thin wrappers; but the single
  command matches the legacy Apply exactly.

### GameState
```ts
export interface SandboxState {
  gravity: number;          // default 15
  size: number;             // 0/1/2
  terrainType: number;      // 0 land / 1 box / 2 empty
  terrainTheme: number;     // 0-6
  background: number;       // 0-6
  backgroundR: number; backgroundG: number; backgroundB: number;  // 0-255
  // derived, for the camera clamp + renderer:
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}
```
Add `sandbox: SandboxState` to `GameState`. `createInitialState()` seeds it with
the entry-point default (SMALL/LAND/GRASS/SKY, gravity 15 for the sandbox deep
link — but MEDIUM for menu/robot-load; see §1). The renderer reads `sandbox` to
pick sky gradient + terrain colors; the core reads it to build bodies + gravity.

---

## 7. Ambiguities / legacy couplings to flag

1. **`ControllerGameGlobals.settings` is a global singleton.** Terrain build,
   gravity, world bounds, and the Sky ctor all read
   `ControllerGameGlobals.settings.*` directly (e.g. `ControllerSandbox.ts:46,
   716; Sky.ts:38-44`). The port must thread these through `GameState.sandbox`
   instead. Challenge mode ALSO keeps a copy on `challenge.settings`
   (`AdvancedSandboxWindow.ts:278`) — two sources of truth to reconcile.
2. **Circle ctor's optional flag is inconsistent** — LARGE LAND passes `false`
   to `new Circle(...)` (`:55,62`) but MEDIUM/SMALL omit it (`:77,84,99,106`).
   Confirm `Circle`'s default before assuming they're equivalent; the difference
   is likely irrelevant because `drawAnyway=false`, but the physics body must be
   identical either way.
3. **`TERRAIN_EMPTY` produces no bodies AND no ground fill** — the robot would
   fall forever. Confirm this is intended (it appears to be; MaxY still clamps
   the camera). No special-casing needed, just don't build ground.
4. **Gravity is not live** — changing gravity via Apply only takes effect at the
   next `play` because `GetGravity()` is read at world creation. If the Vue UI
   implies live gravity, that would be a behavior change; keep it deferred to
   match legacy.
5. **Clouds/stars use `Math.random()` at build time** (`Sky.ts:62-102`) — not
   seeded, so purely cosmetic and safe to keep renderer-local. Do NOT let cloud
   state leak into the deterministic sim / replay (it doesn't today).
6. **`numClouds` variable is reused for star count** in the SPACE branch
   (`Sky.ts:86`) with a wildly different formula — a readability trap when
   porting; keep them as separate concepts.
