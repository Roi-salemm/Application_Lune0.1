import type { FeatureComponentDefinition } from '@/core/feature-flags/feature-types';
import { ProfileMain } from '@/features/profile/features/profile-main';

export const PROFILE_REGISTRY: readonly FeatureComponentDefinition[] = [
  {
    id: 'profile.main',
    feature: 'profile',
    label: 'Profile',
    component: ProfileMain,
    defaults: {
      available: true,
      defaultEnabled: true,
      userToggleable: false,
    },
  },
] as const;
