#!/usr/bin/env bash
# Vercel Ignored Build Step for the Rubik's Cube Solver project.
# Exit 1 = continue build; exit 0 = skip build.
# The AI Hub production branch must not deploy into the Cube Solver project.
# All other branches, including Cube Solver preview/PR branches, may build.
set -eu

CURRENT_BRANCH="${VERCEL_GIT_COMMIT_REF:-}"
AI_HUB_BRANCH="deploy-vercel"

if [ "$CURRENT_BRANCH" = "$AI_HUB_BRANCH" ]; then
  echo "Rubik's Cube Solver: skip AI Developer Hub branch '$CURRENT_BRANCH'."
  exit 0
fi

echo "Rubik's Cube Solver: allow preview/production branch '$CURRENT_BRANCH'."
exit 1
