export type FeatureFlags = 'guided_mode' | 'camera_scan' | 'cube_history' | 'fullscreen_controls';

export const defaultFeatureFlags = {
  "guided_mode": true,
  "camera_scan": true,
  "cube_history": true,
  "fullscreen_controls": true
} as const;
export type FeatureFlagValues = typeof defaultFeatureFlags;

/** Fetch public runtime flags. Defaults remain active if the endpoint is unavailable. */
export async function getFeatureFlags(): Promise<FeatureFlagValues> {
  try {
    const response = await fetch('/api/flags', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) return { ...defaultFeatureFlags };
    const payload: { flags?: Record<string, unknown> } = await response.json();
    const values = { ...defaultFeatureFlags };
    for (const key of Object.keys(values) as Array<keyof FeatureFlagValues>) {
      if (typeof payload.flags?.[key] === 'boolean') {
        (values as Record<string, boolean>)[key] = payload.flags[key] as boolean;
      }
    }
    return values;
  } catch {
    return { ...defaultFeatureFlags };
  }
}
