# Vercel integrations

This Vite + React application uses the Vercel integrations that fit its current architecture.

## Active integrations

- `@vercel/analytics`: the existing React `<Analytics />` component records page views. Custom events are emitted for successful and failed AI generation. Event properties contain only the selected mode, language, file-attached boolean, and a coarse failure category; prompts, source code, filenames, and API keys are never sent.
- `@vercel/speed-insights`: the existing `injectSpeedInsights()` call records real-user performance metrics.

## Dashboard setup

Enable Web Analytics and Speed Insights in this Vercel project's dashboard. Deploy this branch to see production data. Custom-event reporting/analytics dashboard access depends on the Vercel plan; Vercel currently documents custom events for Pro and Enterprise.

## Deliberately not added

- Vercel Flags SDK (`flags` + `@flags-sdk/vercel`): its documented flag declaration/discovery integration targets Next.js and SvelteKit. This project is a Vite SPA, so adding the framework-specific APIs would not work. A custom API/adapter implementation would need a separately designed and tested integration.
- `@vercel/functions`: no current server route needs background work, geolocation, request IP, or other runtime helpers. Adding it without a concrete use would be dead weight.
- `@vercel/og`: the project has no server-rendered social-image route; its standard examples target server/Edge rendering rather than this client-only Vite app.
- `@vercel/blob`: the current upload flow analyzes files in-memory and does not persist them. Blob storage would introduce persistence, access-control, and token configuration that the current feature does not require.
- Vercel AI SDK (`ai`): the app already calls Gemini directly through its protected server endpoint. Migrating providers/streaming is a separate product change, not a drop-in package addition.

No new npm dependency is required for the integrations implemented in this PR; Analytics and Speed Insights were already present.
