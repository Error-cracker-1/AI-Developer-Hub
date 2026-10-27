#!/usr/bin/env bash
# Vercel Ignored Build Step for the Rubik's Cube Solver project.
# Vercel semantics: exit 1 = build; exit 0 = skip.
# Allow only the Cube Solver production branch and this PR's preview branch.
set -eu

CURRENT_BRANCH="${VERCEL_GIT_COMMIT_REF:-}"

case "$CURRENT_BRANCH" in
  Rubiks-cube-solver|fix/vercel-ignore-cube-solver)
    echo "Rubik's Cube Solver: allow branch '$CURRENT_BRANCH'."
    exit 1
    ;;
  *)
    echo "Rubik's Cube Solver: skip unrelated branch '${CURRENT_BRANCH:-unknown}'."
    exit 0
    ;;
esac
