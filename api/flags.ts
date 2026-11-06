import { flagsClient } from '@vercel/flags-core';

const defaults = {
  guided_mode: true,
  camera_scan: true,
  cube_history: true,
  fullscreen_controls: true,
} as const;

const vercelKeys = {
  guided_mode: 'guided-mode',
  camera_scan: 'camera-scan',
  cube_history: 'cube-history',
  fullscreen_controls: 'fullscreen-controls',
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
  } catch { return {}; }
}

async function resolveFlags(): Promise<Record<FlagKey, boolean>> {
  const fallback = { ...defaults, ...parseOverrides(process.env.FEATURE_FLAGS) };
  const entries = await Promise.all((Object.keys(defaults) as FlagKey[]).map(async key => {
    try {
      const result = await flagsClient.evaluate<boolean>(vercelKeys[key], defaults[key]);
      return [key, result.value] as const;
    } catch { return [key, fallback[key]] as const; }
  }));
  return Object.fromEntries(entries) as Record<FlagKey, boolean>;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }
  return res.status(200).json({ flags: await resolveFlags() });
}
