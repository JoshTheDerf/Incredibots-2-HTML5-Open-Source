# Core⇄View Contract

The seam between the headless **game core** and everything that presents it (the
canvas **renderer** and the future **Vue + Nuxt UI 4.9** chrome). Chosen shape:
**reactive store + commands** (single source of truth, all mutations via a
command layer, observers notified on change).

```
        ┌────────────────────────── src/core (headless, no Pixi/DOM) ──────────────────────────┐
        │                                                                                        │
   dispatch(Command)                         GameCore                          getState()/subscribe()
   ───────────────────►   state: GameState  ·  dispatch()  ·  subscribe()   ◄────────────────────
        │                    (authoritative, serializable)                                       │
        └────────────────────────────────────────────────────────────────────────────────────┘
              ▲                                                                    │
              │ commands                                             state snapshot│ (read-only)
              │                                                                    ▼
   ┌──────────────────────┐                                          ┌───────────────────────────┐
   │  Vue + Nuxt UI chrome │  ── Pinia store mirrors view slices ──►  │  Renderer (Draw / Pixi)   │
   │  buttons, panels,     │                                          │  reads state, draws;      │
   │  dialogs, menus       │                                          │  NEVER mutates state      │
   └──────────────────────┘                                          └───────────────────────────┘
```

## Rules

1. **The core is the single source of truth.** `GameState` (`src/core/GameState.ts`)
   is the authoritative state. Nothing outside the core mutates it.
2. **All mutation goes through `dispatch(command)`.** `Command`
   (`src/core/Command.ts`) is a plain-serializable discriminated union — no class
   instances, no Pixi types — so the same contract can later cross a Web Worker
   boundary unchanged (the deferred Option C) with zero API change.
3. **Editing commands produce Actions.** The existing `src/Actions/*` undo/redo
   objects become the implementation detail of the editing commands; `undo`/`redo`
   are themselves commands.
4. **The renderer only reads.** `Draw` (and any future canvas2d/pixi-8 renderer)
   consumes `core.getState()` each frame. It holds no game logic and issues no
   mutations.
5. **The UI only emits intent.** A Nuxt UI button does
   `core.dispatch({ type: "createShape", kind: "circle", x, y })`. It never calls
   into game logic directly (contrast today's `cont.circleButton()`).
6. **Core purity is enforced.** `scripts/check-core-purity.sh` fails the build if
   `src/core`, `src/Box2D`, `src/Parts`, `src/Actions`, or the core model files
   import Pixi or `Gui`.

## Vue / Pinia binding (Wave 3)

A Pinia store subscribes to the core and mirrors the view-relevant slices
(`sim`, `camera`, `edit`, and a projected parts list) into reactive refs.
Components read those refs and, on interaction, call `core.dispatch(...)`. The
store is a thin adapter — it holds no authoritative state of its own.

```ts
// pseudo-code sketch (Wave 3)
const core = new GameCore()
export const useGame = defineStore("game", () => {
  const state = shallowRef(core.getState())
  core.subscribe((s) => { state.value = s })   // re-render on core change
  return {
    sim: computed(() => state.value.sim),
    edit: computed(() => state.value.edit),
    dispatch: core.dispatch.bind(core),
  }
})
```

## Migration status

- ✅ Contract types + `GameCore` store skeleton scaffolded (`src/core/`).
- ✅ Rendering leaks cut so the core is Pixi-free — **except `TextPart`**, whose
  Pixi `Text` object is woven through `Draw`, the controllers, and `MoveZAction`;
  it will be cut together with the renderer refactor (needs in-browser
  verification).
- ⏳ Migrate `ControllerGame`'s per-action logic into `GameCore` command handlers,
  one command at a time. Until migrated, a handler throws (never silently
  no-ops).
- ⏳ Point `Draw` at `core.getState()`; delete render logic from the controllers.
- ⏳ Extract `src/core` as a standalone module, then build the Vue UI against it.
