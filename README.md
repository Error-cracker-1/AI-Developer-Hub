# TwistLab — Rubik's Cube Solver

A responsive browser-based 3×3 Rubik's Cube solver inspired by the visual reference shared by the project owner.

## Features

- Editable 3×3 sticker net with six labeled faces and color-count validation.
- Random 20-move scrambles.
- Two-phase cube solver powered by `cubejs`.
- Move-by-move solution guide with progress, previous/next navigation, autoplay, speed controls, and copyable notation.
- Responsive desktop and mobile layouts.
- Solves locally in the browser; no account or API key is required.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
npm run preview
```

## Cube notation

- `R`, `U`, `F`, `D`, `L`, `B`: turn the named face clockwise.
- An apostrophe, such as `R'`, means counter-clockwise.
- `2`, such as `R2`, means a half-turn.

## Entering a cube

The six center stickers are fixed and identify the faces. Tap a non-center sticker to cycle through colors. Each color must appear exactly nine times. If a manually entered cube configuration is physically impossible, the solver will show an error instead of a solution.

## Tech stack

React, TypeScript, Vite, Tailwind CSS, and cubejs.

## Tests

The AppDeploy QA workflow definitions are in `tests/tests.json`. Verify a solved cube, generate and solve a scramble, navigate the solution, and confirm invalid sticker counts are rejected.
