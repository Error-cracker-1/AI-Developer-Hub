#!/usr/bin/env bash
# Vercel Ignored Build Step for the Rubik's Cube Solver project.
# Vercel's Ignored Build Step convention: exit 1 = continue build; exit 0 = skip build.
set -eu

EXPECTED_BRANCH="Rubiks-cube-solver"
CURRENT_BRANCH="${VERCEL_GIT_COMMIT_REF:-}"

if [ "$CURRENT_BRANCH" = "$EXPECTED_BRANCH" ]; then
  echo "Rubik's Cube Solver: allow Vercel Git build for $CURRENT_BRANCH."
  exit 1
fi

echo "Rubik's Cube Solver: skip Vercel Git build for branch '${CURRENT_BRANCH:-unknown}'; expected '$EXPECTED_BRANCH'."
exit 0
