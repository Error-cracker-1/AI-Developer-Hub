export type FeatureFlags = 'ai_code_review' | 'file_uploads' | 'code_playground' | 'release_notes';

export const defaultFeatureFlags = {
  "ai_code_review": true,
  "file_uploads": true,
  "code_playground": true,
  "release_notes": true
} as const;
export type FeatureFlagValues = { [Key in keyof typeof defaultFeatureFlags]: boolean };

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

import { useEffect, useState } from 'react';

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlagValues>({ ...defaultFeatureFlags });
  useEffect(() => {
    let active = true;
    getFeatureFlags().then((values) => { if (active) setFlags(values); });
    return () => { active = false; };
  }, []);
  return flags;
}
