/**
 * Server-side Vercel Flags adapter for AI Developer Hub.
 *
 * SDK credentials remain server-side. Only the four explicitly allow-listed
 * Boolean values are returned to the browser. FEATURE_FLAGS remains a local
 * development fallback when Vercel Flags is unavailable.
 */
import { flagsClient } from '@vercel/flags-core';

const defaults = {
  ai_code_review: true,
  file_uploads: true,
  code_playground: true,
  release_notes: true,
  project_history: true,
} as const;

const vercelKeys = {
  ai_code_review: 'ai-code-review',
  file_uploads: 'file-uploads',
  code_playground: 'code-playground',
  release_notes: 'release-notes',
  project_history: 'project-history',
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

async function resolveFlags(): Promise<Record<FlagKey, boolean>> {
  const localOverrides = parseOverrides(process.env.FEATURE_FLAGS);
  const fallback = { ...defaults, ...localOverrides };

  const entries = await Promise.all(
    (Object.keys(defaults) as FlagKey[]).map(async (key) => {
      try {
        const result = await flagsClient.evaluate<boolean>(vercelKeys[key], defaults[key]);
        return [key, result.value] as const;
      } catch {
        return [key, fallback[key]] as const;
      }
    }),
  );

  return Object.fromEntries(entries) as Record<FlagKey, boolean>;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const flags = await resolveFlags();
  return res.status(200).json({ flags });
}
