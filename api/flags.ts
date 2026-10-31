/**
 * Runtime feature flags for AI Developer Hub.
 *
 * Configure FEATURE_FLAGS in the matching Vercel project's Environment Variables
 * as a JSON object, e.g. {"ai_code_review":false}. Unspecified flags use safe
 * defaults. This endpoint intentionally exposes only the public allow-list below.
 */
const defaults = {
  "ai_code_review": true,
  "file_uploads": true,
  "code_playground": true,
  "release_notes": true
} as const;
type FlagKey = keyof typeof defaults;

function parseOverrides(value: string | undefined): Partial<Record<FlagKey, boolean>> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Partial<Record<FlagKey, boolean>> = {};
    for (const key of Object.keys(defaults) as FlagKey[]) {
      const candidate = (parsed as Record<string, unknown>)[key];
      if (typeof candidate === 'boolean') result[key] = candidate;
    }
    return result;
  } catch {
    return {};
  }
}

export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }
  const flags = { ...defaults, ...parseOverrides(process.env.FEATURE_FLAGS) };
  return res.status(200).json({ flags });
}
