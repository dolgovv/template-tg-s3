#!/usr/bin/env bash
# Generates dependency graphs into ./graphs:
#   modules.svg - every file and its imports
#   folders.svg - dependencies between folders
#   layers.svg  - architecture: layers of src/core and src/app + npm packages
set -euo pipefail
cd "$(dirname "$0")"

OUT=graphs
mkdir -p "$OUT"

# system Graphviz if installed (sudo pacman -S graphviz), otherwise the wasm build
if command -v dot >/dev/null; then
  render() { dot -T svg; }
else
  render() { node scripts/dot-to-svg.mjs; }
fi

cruise() { pnpm exec depcruise src --output-type "$@"; }

cruise dot  --include-only '^src'          | render > "$OUT/modules.svg"
cruise ddot --include-only '^src'          | render > "$OUT/folders.svg"
cruise archi --include-only '^(src|node_modules)' | render > "$OUT/layers.svg"

echo "Graphs written to $OUT/: modules.svg folders.svg layers.svg"
