import { useEffect, useState } from 'react';

export const defaultFeatureFlags = {
  guided_mode: true,
  camera_scan: true,
  cube_history: true,
  wca_training: true,
  fullscreen_controls: true,
  cube_assistant: false,
} as const;

export type FeatureFlagValues = {
  [Key in keyof typeof defaultFeatureFlags]: boolean;
};

export async function getFeatureFlags(): Promise<FeatureFlagValues> {
  try {
    const response = await fetch('/api/flags', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return { ...defaultFeatureFlags };
    const payload: { flags?: Record<string, unknown> } = await response.json();
    const values = { ...defaultFeatureFlags };
    for (const key of Object.keys(values) as Array<keyof FeatureFlagValues>) {
      if (typeof payload.flags?.[key] === 'boolean') values[key] = payload.flags[key] as boolean;
    }
    return values;
  } catch { return { ...defaultFeatureFlags }; }
}

export function useFeatureFlags(): FeatureFlagValues {
  const [flags, setFlags] = useState<FeatureFlagValues>({ ...defaultFeatureFlags });
  useEffect(() => {
    let active = true;
    void getFeatureFlags().then(values => { if (active) setFlags(values); });
    return () => { active = false; };
  }, []);
  return flags;
}
