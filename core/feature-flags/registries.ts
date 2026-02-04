import { CALENDAR_REGISTRY } from '@/features/calendar/registry';
import { HOME_REGISTRY } from '@/features/home/registry';
import { LUNAR_CALENDAR_REGISTRY } from '@/features/lunar-calendar/registry';
import { MANCY_REGISTRY } from '@/features/mancy/registry';
import { PROFILE_REGISTRY } from '@/features/profile/registry';
import type { FeatureComponentDefinition, FeatureDevFlagMap } from '@/core/feature-flags/feature-types';

export const ALL_COMPONENTS: readonly FeatureComponentDefinition[] = [
  ...HOME_REGISTRY,
  ...CALENDAR_REGISTRY,
  ...LUNAR_CALENDAR_REGISTRY,
  ...MANCY_REGISTRY,
  ...PROFILE_REGISTRY,
] as const;

export const DEFAULT_DEV_FLAGS: FeatureDevFlagMap = ALL_COMPONENTS.reduce((acc, def) => {
  acc[def.id] = { ...def.defaults };
  return acc;
}, {} as FeatureDevFlagMap);
