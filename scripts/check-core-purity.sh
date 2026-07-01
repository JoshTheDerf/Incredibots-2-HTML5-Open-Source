#!/usr/bin/env bash
#
# check-core-purity.sh
#
# Fails (exit 1) if any file in the intended headless "game core" imports a
# UI / rendering dependency. The game core must stay renderer-agnostic so it
# can run headless (simulation, replay verification, tooling) without pulling
# in Pixi or any Gui code.
#
# Scanned surface:
#   - src/core, src/Box2D, src/Parts, src/Actions  (whole directories)
#   - src/Game/Robot.ts, Challenge.ts, Replay.ts, Condition.ts   (core models)
#   - src/General/ByteArray.ts                     (core model)
#
# Forbidden imports:
#   - pixi.js, pixi-sound, pixi-scrollbox, pixi-text-input, pixi-viewport
#   - anything from a Gui path (../Gui, ./Gui, .../Gui/...)
#
# Usage:  scripts/check-core-purity.sh   (run from anywhere; resolves repo root)

set -uo pipefail

# Resolve repo root from this script's location so it works from any cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# Core surface to scan.
CORE_DIRS=(
    "src/core"
    "src/Box2D"
    "src/Parts"
    "src/Actions"
)
CORE_FILES=(
    "src/Game/Robot.ts"
    "src/Game/Challenge.ts"
    "src/Game/Replay.ts"
    "src/Game/Condition.ts"
    "src/General/ByteArray.ts"
)

# Build the list of existing targets to scan.
TARGETS=()
for d in "${CORE_DIRS[@]}"; do
    [ -d "$d" ] && TARGETS+=("$d")
done
for f in "${CORE_FILES[@]}"; do
    [ -f "$f" ] && TARGETS+=("$f")
done

# Regex matching a forbidden import statement.
#   - matches import ... from "<forbidden>"  and  import "<forbidden>"
#   - covers the pixi package family and any Gui path.
FORBIDDEN='import[^;]*(from[[:space:]]*)?["'"'"']([^"'"'"']*/)?(pixi\.js|pixi-sound|pixi-scrollbox|pixi-text-input|pixi-viewport|([./][^"'"'"']*)?Gui(/[^"'"'"']*)?)["'"'"']'

echo "== Core-purity gate =="
echo "Scanning headless game core for UI/rendering imports..."
echo

HITS="$(grep -rnE "$FORBIDDEN" "${TARGETS[@]}" 2>/dev/null || true)"

if [ -z "$HITS" ]; then
    echo "PASS: no UI/rendering imports found in the game core."
    exit 0
fi

echo "FAIL: found UI/rendering imports in the game core (known leaks to be cut):"
echo
echo "$HITS" | while IFS= read -r line; do
    echo "  known leak to be cut -> $line"
done
echo
COUNT="$(printf '%s\n' "$HITS" | grep -c .)"
echo "Total offending import(s): $COUNT"
echo "The game core must not depend on Pixi or Gui. Cut these to make the gate pass."
exit 1
