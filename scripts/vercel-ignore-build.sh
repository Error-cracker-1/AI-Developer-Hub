#!/usr/bin/env bash
# Vercel Ignored Build Step for the Rubik's Cube Solver project.
# Vercel semantics: exit 1 = build; exit 0 = skip.
#
# Branch naming / deployment isolation:
#   Production: Rubiks-cube-solver
#   Rubik previews: feature/cube-* and fix/cube-*
#   This PR branch is explicitly allowed while the rule is being reviewed.
# All other branches are skipped by this Vercel project.
#
# Conventional commit / PR title syntax (documentation only; Vercel's ignored
# build step evaluates the branch, not commit messages):
#   feat(cube):, fix(cube):, docs(cube):, style(cube):, refactor(cube):,
#   perf(cube):, test(cube):, build(cube):, ci(cube):, chore(cube):, revert(cube):
# For AI Developer Hub use the same prefixes with (ai), e.g. feat(ai):.

set -eu

CURRENT_BRANCH="${VERCEL_GIT_COMMIT_REF:-}"

case "$CURRENT_BRANCH" in
  Rubiks-cube-solver|feature/cube-*|fix/cube-*|fix/vercel-ignore-cube-solver)
    echo "Rubik's Cube Solver: allow branch '$CURRENT_BRANCH'."
    exit 1
    ;;
  *)
    echo "Rubik's Cube Solver: skip unrelated branch '${CURRENT_BRANCH:-unknown}'."
    exit 0
    ;;
esac
