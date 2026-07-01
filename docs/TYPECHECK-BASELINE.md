# TypeScript Type-Check Baseline

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
