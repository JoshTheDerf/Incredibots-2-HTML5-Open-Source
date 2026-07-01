# IncrediBots 2 — Modernization & Architecture Review

Status as of the Vite migration. This doc captures (1) what changed to get the
project building on current tooling, (2) a code review of the inherited AS3→TS
port, and (3) the plan for separating the UI layer from the game core ahead of
the Vue + Nuxt UI rewrite.

---

## 1. Build modernization (done)

- **Parcel 2.0.0-rc → Vite 8.** The old toolchain couldn't even install on Node
  24 — Parcel's `lmdb-store` native module fails to compile against current V8.
  Vite has no native deps.
- **Removed dead native deps** `box2d` and `bytearray-node` (both vendored in-repo:
  `src/Box2D`, `src/General/ByteArray.ts`). They were the other install blockers.
- **`lzma`** vendored into `src/vendor/lzma_worker.js` with a real ESM `export`
  (the published file only did `this.LZMA = …`, which rolldown misreads as ESM).
- **Node builtins** (`zlib`, and `Buffer` via `iconv-lite`) that `ByteArray.ts`
  needs are polyfilled by `vite-plugin-node-polyfills`.
- `npm run dev` and `npm run build` are both green. Served at `thederf.com/ib2`
  by Caddy reverse-proxying the host Vite dev server (see
  `../compose/caddy/Caddyfile`, snippet `(ib2_routing)`).

**Deferred:** pixi 6 → 8. Blocked by abandoned plugins (`pixi-text-input`,
`pixi-scrollbox`) that have no pixi-8 versions — and those, plus `src/Gui/*`, are
exactly what the Vue rewrite deletes. So the pixi upgrade is folded into the UI
separation rather than done as a standalone bump.

---

## 2. Code review — inherited state

This is a functional but fragile machine-assisted AS3→TS port (~52k LOC, 200 TS
files). Findings, roughly by leverage:

### 2.1 `ControllerGame` is a 7,124-line god class
`src/Game/ControllerGame.ts` fuses six unrelated responsibilities: Box2D
simulation control, part editing, mouse/keyboard input, pixi rendering, GUI
window management, and (dead) networking. It owns the `b2World`, the pixi
`Application` surface, the `allParts` array, and ~19 GUI window references. Every
`Controller*` (sandbox, challenges, tutorials) extends it. This class is the
single biggest obstacle to any separation.

### 2.2 Everything routes through one barrel — `src/imports.ts`
94 of 200 files import from `./imports` (166 import statements). The barrel
re-exports Parts, Actions, Controllers, GUI, and globals into one namespace.
It **hides genuine circular dependencies** (Parts ↔ Actions) and means there is
effectively no module boundary anywhere. This must be dismantled before any
part of the code can be pulled into a separate package.

### 2.3 Type safety is effectively off
`tsconfig` has `strict: true`, but the build uses esbuild, which does **not**
type-check. `tsc --noEmit` reports **~2,689 errors** (uninitialized fields,
`null`-not-assignable, implicit `any`, base/override signature mismatches).
~666 explicit `: any`, and `Array<any>` for all part containers. No CI gate
catches contract breaks.

### 2.4 Scattered global mutable state
Five singletons with overlapping duties: `ControllerGameGlobals` (~60 static
mutable fields — physics constants *and* mouse state *and* sound channels *and*
session creds all mixed), `Main`, `Input`, `LSOManager`, `Resource`. Game
state, UI state, and view state are not separated.

### 2.5 Intentional cloud dead code
The online features (server save/load, login, ratings, challenge browsing,
reporting) were disabled for the community export when the cloud shut down. The
window classes survive **only as `.as` files** (`SaveLoadWindow`, `LoginWindow`,
`MD5`, etc.) and `ControllerGame`/`Database` still reference them, but those
paths are unreachable, so the build stays green. `Database.ts` (~2,456 lines of
HTTP to a dead backend) is largely dead too. **This is a clean deletion
category, not a set of bugs.**

### 2.6 AS3 heritage smells
`m_`/Hungarian prefixes, public fields used as pseudo-getters, `static number`
constants instead of enums (e.g. the tool-mode constants → should be an enum),
`= null` without `| null` unions, premature Box2D object pools.

---

## 3. Where the seam actually is

The exploration found the code is **not** a single UI/core split but three
layers, and the boundaries are already ~80% clean:

```
┌─────────────────────────────────────────────────────────────┐
│  UI CHROME  (buttons, panels, dialogs, menus)                │  → DELETE, rebuild in Vue + Nuxt UI
│  src/Gui/* — pixi-text-input, pixi-scrollbox, pixi-sound      │
│  Talks to the core only by calling ControllerGame methods    │
│  (e.g. cont.circleButton(), cont.densitySlider()).            │
├─────────────────────────────────────────────────────────────┤
│  GAME CANVAS RENDERER  (draws the physics world + robot)      │  → KEEP as a renderer; feed it state
│  src/Game/Draw.ts, Graphics/{b2DebugDraw,Sky,Gradient},       │    (may stay pixi, or move to canvas2d)
│  Resource.ts. ~70% pure drawing, ~30% reads game state.       │
├─────────────────────────────────────────────────────────────┤
│  GAME CORE  (headless — physics, parts, rules, serialization) │  → EXTRACT as standalone module
│  src/Box2D/*, src/Parts/*, src/Actions/*, Robot/Challenge/    │
│  Replay/Condition, ByteArray. Already almost UI-free.         │
└─────────────────────────────────────────────────────────────┘
```

### The core is closer to clean than expected
- **Parts:** 11 of 12 are pure data/logic. Only `TextPart` holds a pixi `Text`
  (`src/Parts/TextPart.ts:2,27,64-70`).
- **Actions:** 24 of 25 are pure command objects. Only `MoveZAction` touches the
  display list (`src/Actions/MoveZAction.ts:25-47`); `ResizeShapesAction:1`
  imports pixi's `Circle`/`Rectangle` merely as type guards (easy to swap).
- **Box2D:** self-contained; the only rendering coupling is the *optional*
  `b2DebugDraw` (opt-in via `SetDebugDraw`).
- **Serialization:** `ByteArray`/`Database` are transport-agnostic (Database's
  network layer is mostly dead code anyway).

### The specific rendering leaks to cut from the core
1. `TextPart` — strip the pixi `Text`; keep `{x,y,w,h,text,color,size}` as data,
   render it in the view layer.
2. `MoveZAction` — remove `addChildAt`/`removeChild`; keep only z-order data.
3. `ResizeShapesAction` — replace pixi `instanceof Circle/Rectangle` with the
   Part-class checks.
4. `ControllerGameGlobals` — split it: physics constants + gameplay lists stay
   in core; sound channels, `show*` flags, mouse coords, session creds move to
   the view/UI layer.
5. `Action.m_controller` is `static` — the whole command system depends on one
   controller singleton. Replace with an injected game-state reference so actions
   are testable.

### The genuinely hard parts (from `ControllerGame`)
- The `b2World` is created lazily inside `playButton()`; a headless core needs an
  explicit init path independent of GUI state.
- Input handling is a 500+-line cascade where a click is filtered through ~20 GUI
  visibility checks before reaching game logic — needs an event-based input
  abstraction, not frame-by-frame `Input.mouseDown` polling inside the god class.
- Dialog/condition state gates simulation start — challenge setup must become a
  serializable config rather than something a modal dialog mutates.

---

## 4. Proposed sequence

Small, independently-shippable steps; each keeps the build green and the game
playable at `/ib2`.

1. **Turn on the type gate.** Add a `typecheck` CI step (script already added).
   Don't fix all 2,689 at once — ratchet: fix per-directory, start with
   `src/Parts` and `src/Actions` (small, core, high-value).
2. **Delete cloud dead code.** Remove the orphaned `.as` files and the
   unreachable `new SaveLoadWindow(...)`/login/rating paths and dead `Database`
   methods. Biggest LOC win for zero behavior change.
3. **Dismantle the barrel** incrementally — replace `./imports` with direct paths,
   directory by directory, surfacing (and breaking) the real cycles. This is the
   prerequisite for extracting a `core/` package.
4. **Cut the 5 rendering leaks** from §3 so `src/Parts` + `src/Actions` + `Box2D`
   compile with zero pixi imports. Verify with a grep gate in CI.
5. **Define the core⇄view interface**: core exposes serializable game state +
   command methods + an event stream; the renderer consumes state; the UI emits
   intents. This is the contract the Vue app will bind to.
6. **Extract `core/`** into its own module/package once §3–5 hold.
7. **Rebuild UI chrome in Vue + Nuxt UI 4.9**, deleting `src/Gui/*` and the
   `pixi-text-input`/`pixi-scrollbox` deps as their replacements land.
8. **Upgrade the game canvas** (pixi 6→8, or canvas2d) — now isolated to the
   renderer layer, decoupled from the UI decision.
```
