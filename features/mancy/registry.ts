import type { FeatureComponentDefinition } from '@/core/feature-flags/feature-types';
import { MancyMain } from '@/features/mancy/features/mancy-main';

export const MANCY_REGISTRY: readonly FeatureComponentDefinition[] = [
  {
    id: 'mancy.main',
    feature: 'mancy',
    label: 'Mancy',
    component: MancyMain,
    defaults: {
      available: true,
      defaultEnabled: true,
      userToggleable: false,
    },
  },
] as const;
