# TypeScript Type-Check Baseline

## Status: ZERO ERRORS (2026-07-06)

The burn-down described below is **complete**. `npx vue-tsc --noEmit` (which is
what `npm run typecheck` runs, and is included in `npm run gate`) reports
**0 errors** across the entire project, with all 775 tests passing.

**Policy: keep it at zero.** Any change that introduces a type error is a
regression — fix it before merging. The gate command for CI / pre-merge is:

```sh
npm run typecheck   # vue-tsc --noEmit — must exit 0
```

(`npm run gate` runs typecheck + core-purity checks + the test suite.)

Notes on how zero was reached (2026-07-01 → 2026-07-06, 2689 → 0):

- All fixes were **type-level only** (annotations, `| null` unions, targeted
  `as` casts, non-null `!` where the invariant is clear, ambient declarations,
  `any` for genuinely dynamic AS3 patterns) — zero runtime behavior change,
  verified by the full test suite after each chunk.
- Conventions used throughout: lazily-initialized fields keep their non-null
  declared type and use `= null!` at the assignment; subclass-specific props
  read off a base variable use an inline `as` cast; AS3 `Object`/dynamic values
  are typed `any` at the declaration; incompatible subclass overrides (TS2416)
  are fixed on the subclass side by widening/optionalizing parameters.
- Two real runtime bugs were found and minimally fixed during the burn-down
  (flagged in the burn-down reports): a missing `b2AABB` import in
  `src/Game/ControllerSandbox.ts` (`GetBuildingArea()` threw `ReferenceError`),
  and eleven `ControllerGame.ts` handlers referencing an `e` event parameter
  the port had dropped (restored as optional `e?: any`).
- Known latent (dead-code) issues were deliberately preserved with `as any`
  casts and flagged in comments/reports rather than "fixed" (e.g. the
  cloud/DB `Main.ShowHourglass()` calls, AS3 `TextField` methods on pixi
  `Text` in dead login paths) — see the "IB2 cloud dead code" memory note.

The original baseline below is kept for historical context.

## Why this exists

This project is an old ActionScript 3 -> TypeScript port. The production build
uses **Vite/esbuild**, which **transpiles but does not type-check**. That means
the app builds and runs even though the TypeScript compiler reports thousands of
errors. These errors are **latent** — they do not block the build today, but they
represent real type unsafety accumulated during the AS3 port.

As part of separating the headless **game core** (`src/Box2D`, `src/Parts`,
`src/Actions`, plus the core models `Robot`/`Challenge`/`Replay`/`Condition`/`ByteArray`)
from the UI, we want to **ratchet these errors down per-directory**: the count in
each directory should only ever go down. This file records the starting point so
we can measure progress.

## How to reproduce

Run from the repo root:

```sh
npx tsc --noEmit 2>&1 | tee /tmp/tsc-baseline.txt | tail -5
```

Total error count:

```sh
grep -cE "^[^ ].*error TS" /tmp/tsc-baseline.txt
```

Per-top-level-directory breakdown:

```sh
grep -oE "^[^ ]+\.tsx?\(" /tmp/tsc-baseline.txt | sed 's/(//' \
  | awk -F/ '{ if ($1=="src") print $1"/"$2; else print $1 }' \
  | sort | uniq -c | sort -rn
```

## Snapshot — 2026-07-01

**Total errors: 2689**

| Directory          | Errors |
| ------------------ | -----: |
| `src/Game`         |   1449 |
| `src/General`      |    458 |
| `src/Parts`        |    364 |
| `src/Box2D`        |    198 |
| `src/Gui`          |    161 |
| `src/Main.ts`      |     37 |
| `src/Actions`      |     21 |
| `vite.config.ts`   |      1 |

> Note: the single `vite.config.ts` error is a `moduleResolution` artifact of
> running `tsc` over a config file that esbuild otherwise handles; it is not a
> game-source issue.

The goal is that each of these numbers only ever decreases. When touching a
directory, re-run the commands above and confirm you did not raise its count.
