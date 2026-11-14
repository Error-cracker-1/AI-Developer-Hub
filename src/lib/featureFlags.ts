export const defaultFeatureFlags = {
  ai_code_review: true,
  ai_security_audit: true,
  file_uploads: true,
  code_playground: true,
  release_notes: true,
  session_history: false,
  projects_tab: false,
  aihub_ai_chat: true,
} as const;

export type FeatureFlagValues = {
  [Key in keyof typeof defaultFeatureFlags]: boolean;
};

/**
 * Read only the public flag allow-list from the server endpoint.
 * The server owns SDK credentials and applies safe defaults on failure.
 */
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
      if (typeof payload.flags?.[key] === 'boolean') {
        values[key] = payload.flags[key] as boolean;
      }
    }
    return values;
  } catch {
    return { ...defaultFeatureFlags };
  }
}

import { useEffect, useState } from 'react';

export function useFeatureFlags(): FeatureFlagValues {
  const [flags, setFlags] = useState<FeatureFlagValues>({ ...defaultFeatureFlags });

  useEffect(() => {
    let active = true;
    void getFeatureFlags().then((values) => {
      if (active) setFlags(values);
    });
    return () => {
      active = false;
    };
  }, []);

  return flags;
}
