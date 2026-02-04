import { withApiBase } from '@/lib/api';

export type FeatureFlagsPayload = {
  updated_at?: string;
  components?: Record<string, Record<string, unknown>>;
};

// Remote flags let you enable/disable components without a rebuild.
// Expected response: { components: { "home.debug-sqlite": { available: true, defaultEnabled: false } } }
export async function fetchRemoteFeatureFlags(signal?: AbortSignal) {
  const response = await fetch(withApiBase('/api/app/feature-flags'), { signal });
  if (!response.ok) {
    throw new Error(`Feature flags request failed: ${response.status}`);
  }

  return (await response.json()) as FeatureFlagsPayload;
}
