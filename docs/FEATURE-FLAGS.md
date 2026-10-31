# Runtime feature flags

This Vite + React app exposes a small, server-evaluated runtime flag endpoint at `GET /api/flags`. It is compatible with Vercel Functions and does not require a framework-specific Flags SDK adapter.

## Configure

In this app's Vercel project, add the environment variable `FEATURE_FLAGS` as a JSON object. Example:

```json
{"ai_code_review": false}
```

Only the boolean keys listed in `api/flags.ts` are returned. Unknown keys, invalid JSON, and non-boolean values are ignored. Unspecified flags use the code defaults. Set the variable separately for Preview and Production to roll features out independently, then redeploy.

## Read flags in React

Import `getFeatureFlags` from `src/lib/featureFlags` and call it from an effect or an async action. The helper falls back to defaults if the endpoint is unavailable. Flags are public configuration, not secrets; never put credentials or authorization decisions in them.

## Important

This is a lightweight runtime flag service, not the Vercel Flags dashboard/SDK integration. The official `flags` + `@flags-sdk/vercel` adapter is designed for supported server frameworks such as Next.js and SvelteKit; this project is Vite + React. Do not assume changing a flag protects server APIs. Enforce authorization and security checks on the server independently.
