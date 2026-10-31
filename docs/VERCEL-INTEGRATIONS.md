# Vercel integrations

This Vite + React + Three.js application uses the Vercel integrations that fit its current architecture.

## Active integrations

- `@vercel/analytics`: the existing React `<Analytics />` component records page views. Custom events record cube scrambles, resets, and successfully generated solutions (move count and selected solving mode only). No cube sticker layout, camera frames, or personal data are sent.
- `@vercel/speed-insights`: the existing React `<SpeedInsights />` component records real-user performance metrics.

## Dashboard setup

Enable Web Analytics and Speed Insights in this separate Rubik Vercel project's dashboard. Deploy this branch to see production data. Custom-event reporting/analytics dashboard access depends on the Vercel plan; Vercel currently documents custom events for Pro and Enterprise.

## Deliberately not added

- Vercel Flags SDK (`flags` + `@flags-sdk/vercel`): the documented framework integration targets Next.js and SvelteKit, not this Vite SPA. Do not import `flags/next` or `flags/sveltekit` into this app.
- `@vercel/functions`: this app currently has no server-side function or background task that needs Vercel runtime helpers.
- `@vercel/og`: no server-rendered Open Graph image endpoint exists in this client-side app.
- `@vercel/blob`: cube state and camera scanning are processed locally; no remote file persistence is needed.
- Vercel AI SDK (`ai`): the solver uses the local `cubejs` solver and does not call an AI model.

No new npm dependency is required for the integrations implemented in this PR; Analytics and Speed Insights were already present.
